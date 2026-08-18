// Cross-device sync via a private GitHub Gist.
// User pastes a GitHub Personal Access Token (PAT, gist-scope) once; data
// (tasks + notes + vault + recap history) syncs both directions every 30s.
//
// Privacy model:
//   - PAT stored in browser localStorage only
//   - Data lives in a PRIVATE gist owned by the user
//   - Password vault stays AES-256-GCM encrypted (only encrypted blob leaves the device)
//   - Direct browser → api.github.com; no proxy
(function () {
  'use strict';
  if (window.top !== window) return;

  // ---- Keys that get synced (explicit whitelist) ----
  const SYNC_KEYS = [
    'tasks.v3', 'tasks.sort', 'tasks.view',
    'ainotes.v1', 'ainotes.v11.enterprise',
    'ainotes.current', 'ainotes.current.enterprise',
    'ainotes.lang', 'ainotes.translate.target',
    'pmvault.v2',
    'recap.history.v1',
    'bookmarks.v1',
    'mala.counter.v1',
    'ainotes.vue.v1',
    'medi.timer.v1',
    'merit.journal.v1',
    'poststudio.v1',
    'reviewcards.v1',
    'videodesc.v1',
    'videodesc.sets',
    'reviewscripts.v1',
    'comparisons.v1',
    'scripts.v1',
    'snippets.v1',
    'expense.v1',
    'playground.v1',
    'winnerpicker.v1',
    'vocab.v1',
    'tutor.v1',
    'reading.v1',
    'entrans.v1',
    'pronlab.v1',
    'sentpat.v1',
    'mddocs.v1',
    'minierp.v1',
  ];

  // Local sync bookkeeping (never synced themselves)
  const PAT_KEY      = 'sync.github.pat';
  const GIST_KEY     = 'sync.github.gistId';
  const DEVICE_KEY   = 'sync.device.id';
  const LAST_PUSH_H  = 'sync.lastPushHash';
  const LAST_PULL_AT = 'sync.lastPullAt';
  const ENABLED_KEY  = 'sync.enabled';
  const MERGE_INFO_KEY = 'sync.lastMergeInfo'; // local only — intentionally NOT in SYNC_KEYS
  const FILENAME     = 'myomt-utilities-sync.json';

  const POLL_MS = 30_000;   // background pull check
  const LOCAL_POLL_MS = 5_000; // local change detection

  // ---- Storage helpers ----
  const g = k => localStorage.getItem(k);
  const s = (k, v) => v == null || v === '' ? localStorage.removeItem(k) : localStorage.setItem(k, v);

  function getPAT()     { return g(PAT_KEY) || ''; }
  function setPAT(v)    { s(PAT_KEY, v); }
  function getGistId()  { return g(GIST_KEY) || ''; }
  function setGistId(v) { s(GIST_KEY, v); }
  function isEnabled()  { return g(ENABLED_KEY) !== '0' && !!getPAT(); }
  function setEnabled(on) { s(ENABLED_KEY, on ? '1' : '0'); }
  function getDeviceId() {
    let id = g(DEVICE_KEY);
    if (!id) {
      // Human-readable device tag from UA (mostly for debugging)
      const ua = navigator.userAgent || '';
      const os = /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' :
                 /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' :
                 /Linux/.test(ua) ? 'Linux' : 'Unknown';
      id = `${os}-${Math.random().toString(36).slice(2, 8)}`;
      s(DEVICE_KEY, id);
    }
    return id;
  }

  // ---- Snapshot build / apply ----
  function buildSnapshot() {
    const data = {};
    SYNC_KEYS.forEach(k => {
      const v = g(k);
      if (v != null) data[k] = v;
    });
    return {
      _meta: { version: 1, syncedAt: Date.now(), device: getDeviceId() },
      data,
    };
  }
  function applySnapshot(snap) {
    if (!snap?.data) return;
    Object.entries(snap.data).forEach(([k, v]) => {
      if (SYNC_KEYS.includes(k)) s(k, v);
    });
  }
  function hashStr(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return String(h >>> 0);
  }
  function snapshotHash(snap) {
    // Only hash the data payload — meta changes on every push and would defeat dedup
    return hashStr(JSON.stringify(snap.data));
  }

  // ---- Smart merge (id-based union instead of blind remote-wins) ----
  // Timestamp of an item, if it carries one (newer item wins on id conflict)
  function itemTime(o) {
    const fields = ['t', 'at', 'updated', 'updatedAt'];
    for (let i = 0; i < fields.length; i++) {
      const v = o && o[fields[i]];
      if (v == null) continue;
      const n = typeof v === 'number' ? v : Date.parse(v);
      if (!isNaN(n)) return n;
    }
    return null;
  }
  // Array whose every element is a plain object carrying an `id` field
  function isIdArray(a) {
    return Array.isArray(a) && a.every(x => x && typeof x === 'object' && !Array.isArray(x) && x.id != null);
  }
  // Union by id. Conflict: keep whichever has the newer t/at/updated; else remote wins.
  function mergeIdArrays(localArr, remoteArr, stats) {
    const localById = new Map();
    localArr.forEach(it => localById.set(String(it.id), it));
    const out = remoteArr.map(rit => {
      const key = String(rit.id);
      const lit = localById.get(key);
      if (lit === undefined) return rit;
      localById.delete(key);
      const lt = itemTime(lit), rt = itemTime(rit);
      if (lt != null && rt != null && lt > rt) { if (stats) stats.localNewer++; return lit; }
      return rit;
    });
    localById.forEach(lit => { out.push(lit); if (stats) stats.localOnlyItems++; });
    return out;
  }
  // Merge two raw localStorage strings for one key.
  // Returns the merged JSON string, or null when no smart merge applies (caller keeps remote).
  function mergeValues(localStr, remoteStr, stats) {
    const lp = JSON.parse(localStr);
    const rp = JSON.parse(remoteStr);
    if (isIdArray(lp) && isIdArray(rp)) return JSON.stringify(mergeIdArrays(lp, rp, stats));
    if (lp && rp && typeof lp === 'object' && typeof rp === 'object' &&
        !Array.isArray(lp) && !Array.isArray(rp)) {
      // Object stores like {entries:[...]} / {posts:[...]}: merge the inner
      // id-arrays; every other prop is remote-wins.
      let mergedAny = false;
      const out = Object.assign({}, rp);
      Object.keys(rp).forEach(prop => {
        if (isIdArray(rp[prop]) && isIdArray(lp[prop])) {
          out[prop] = mergeIdArrays(lp[prop], rp[prop], stats);
          mergedAny = true;
        }
      });
      if (mergedAny) return JSON.stringify(out);
    }
    return null;
  }
  // Merge full snapshots. Never throws — any per-key error falls back to the
  // old behavior for that key (remote wins).
  function mergeSnapshots(localSnap, remoteSnap) {
    const ldata = (localSnap && localSnap.data) || {};
    const rdata = (remoteSnap && remoteSnap.data) || {};
    const info = {
      at: Date.now(),
      device: (remoteSnap && remoteSnap._meta && remoteSnap._meta.device) || null,
      mergedKeys: 0, remoteWinKeys: 0, localOnlyKeys: 0,
      localNewer: 0, localOnlyItems: 0,
    };
    const data = {};
    new Set(Object.keys(rdata).concat(Object.keys(ldata))).forEach(k => {
      const lv = ldata[k], rv = rdata[k];
      if (rv == null) { data[k] = lv; info.localOnlyKeys++; return; } // only local has it → keep
      if (lv == null || lv === rv) { data[k] = rv; return; }          // identical or local-missing → remote
      try {
        const stats = { localNewer: 0, localOnlyItems: 0 };
        const merged = mergeValues(lv, rv, stats);
        if (merged != null) {
          data[k] = merged;
          info.mergedKeys++;
          info.localNewer += stats.localNewer;
          info.localOnlyItems += stats.localOnlyItems;
          return;
        }
      } catch (e) { /* fall through to remote-wins for this key */ }
      data[k] = rv;
      info.remoteWinKeys++;
    });
    return {
      snapshot: { _meta: { version: 1, syncedAt: Date.now(), device: getDeviceId() }, data },
      info,
    };
  }
  // Apply a remote snapshot with smart merge; falls back to blind apply on any error.
  function pullRemote(remote) {
    try {
      const res = mergeSnapshots(buildSnapshot(), remote);
      applySnapshot(res.snapshot);
      try { s(MERGE_INFO_KEY, JSON.stringify(res.info)); } catch (e) {}
      return res.snapshot;
    } catch (e) {
      applySnapshot(remote); // old behavior
      return null;
    }
  }

  // ---- GitHub API ----
  async function api(path, opts = {}) {
    if (!getPAT()) throw new Error('No GitHub PAT set');
    const url = path.startsWith('http') ? path : `https://api.github.com${path}`;
    const res = await fetch(url, {
      ...opts,
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${getPAT()}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`GitHub ${res.status}: ${body.slice(0, 200) || res.statusText}`);
    }
    return res.json();
  }

  async function findExistingGist() {
    // Paginate up to 3 pages (300 gists) looking for one with our filename
    for (let page = 1; page <= 3; page++) {
      const gists = await api(`/gists?per_page=100&page=${page}`);
      const match = gists.find(g => g.files && g.files[FILENAME]);
      if (match) return match;
      if (gists.length < 100) break;
    }
    return null;
  }
  async function createGist(snap) {
    return api('/gists', {
      method: 'POST',
      body: JSON.stringify({
        description: 'MyoMT Utilities Suite — cross-device sync (do not edit manually)',
        public: false,
        files: { [FILENAME]: { content: JSON.stringify(snap, null, 2) } },
      }),
    });
  }
  async function updateGist(gistId, snap) {
    return api(`/gists/${gistId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        files: { [FILENAME]: { content: JSON.stringify(snap, null, 2) } },
      }),
    });
  }
  async function fetchGist(gistId) {
    const gist = await api(`/gists/${gistId}`);
    const file = gist.files?.[FILENAME];
    if (!file) throw new Error(`Sync file "${FILENAME}" not found in gist`);
    let content = file.content;
    // If gist is >1MB, `content` is truncated and we must fetch raw_url
    if (file.truncated && file.raw_url) {
      const raw = await fetch(file.raw_url);
      content = await raw.text();
    }
    let snap;
    try { snap = JSON.parse(content); }
    catch (e) { throw new Error('Sync file is not valid JSON'); }
    return { snapshot: snap, updatedAt: new Date(gist.updated_at).getTime(), gist };
  }

  // ---- Sync engine ----
  let syncing = false;
  let bgTimer = null;
  let localPollTimer = null;
  let dirty = false; // local changed since last successful push
  let lastKnownLocalHash = null;
  const statusListeners = new Set();

  const state = { status: 'idle', detail: '', at: 0, device: null, lastPushAt: null, lastPullAt: null };
  function setStatus(status, detail = '') {
    state.status = status;
    state.detail = detail;
    state.at = Date.now();
    state.device = getDeviceId();
    state.lastPullAt = parseInt(g(LAST_PULL_AT) || '0', 10);
    statusListeners.forEach(cb => { try { cb(state); } catch {} });
  }

  async function sync(opts = {}) {
    if (syncing) return;
    if (!isEnabled()) { setStatus('disabled', 'Sync off'); return; }
    if (!getPAT()) { setStatus('disabled', 'No PAT'); return; }
    if (!navigator.onLine) { setStatus('offline', 'No network'); return; }

    syncing = true;
    setStatus('syncing', opts.reason || '');
    try {
      // 1. Ensure we have a gist to work with
      let gistId = getGistId();
      if (!gistId) {
        setStatus('syncing', 'Looking for existing sync gist…');
        const existing = await findExistingGist();
        if (existing) {
          gistId = existing.id;
          setGistId(gistId);
        } else {
          setStatus('syncing', 'Creating new sync gist…');
          const localSnap = buildSnapshot();
          const created = await createGist(localSnap);
          setGistId(created.id);
          s(LAST_PUSH_H, snapshotHash(localSnap));
          s(LAST_PULL_AT, String(Date.now()));
          setStatus('synced', 'Created new sync gist ✓');
          return;
        }
      }

      // 2. Fetch remote
      const { snapshot: remote } = await fetchGist(gistId);
      const remoteHash = snapshotHash(remote);
      const localSnap = buildSnapshot();
      const localHash = snapshotHash(localSnap);
      const lastPushHash = g(LAST_PUSH_H);
      const remoteDevice = remote._meta?.device;
      const ourDevice = getDeviceId();

      const remoteIsNew = remoteHash !== lastPushHash && remoteDevice !== ourDevice;
      const localIsChanged = localHash !== (lastPushHash || '');

      if (remoteIsNew && localIsChanged) {
        // Both sides changed since we last pushed. Smart merge: id-based union
        // for array-of-object stores; remote wins for everything else.
        pullRemote(remote);
        s(LAST_PUSH_H, remoteHash);
        s(LAST_PULL_AT, String(Date.now()));
        window.dispatchEvent(new CustomEvent('cloudsync-pulled', { detail: { device: remoteDevice } }));
        setStatus('synced', `Pulled (merged with ${remoteDevice})`);
        // Re-hash local after apply and if it still differs from remote, push
        const afterSnap = buildSnapshot();
        const afterHash = snapshotHash(afterSnap);
        if (afterHash !== remoteHash) {
          await updateGist(gistId, afterSnap);
          s(LAST_PUSH_H, afterHash);
          setStatus('synced', 'Pulled + pushed (merge)');
        }
      } else if (remoteIsNew) {
        // Only remote changed → pull (smart-merged so local-only items survive)
        pullRemote(remote);
        s(LAST_PUSH_H, remoteHash);
        s(LAST_PULL_AT, String(Date.now()));
        window.dispatchEvent(new CustomEvent('cloudsync-pulled', { detail: { device: remoteDevice } }));
        setStatus('synced', `Pulled from ${remoteDevice || 'remote'}`);
        // If the merge kept local items the remote lacks, push the union back
        const afterSnap = buildSnapshot();
        const afterHash = snapshotHash(afterSnap);
        if (afterHash !== remoteHash) {
          await updateGist(gistId, afterSnap);
          s(LAST_PUSH_H, afterHash);
          setStatus('synced', 'Pulled + pushed (merge)');
        }
      } else if (localIsChanged) {
        // Only local changed → push
        await updateGist(gistId, localSnap);
        s(LAST_PUSH_H, localHash);
        s(LAST_PULL_AT, String(Date.now()));
        setStatus('synced', 'Pushed local changes');
      } else {
        s(LAST_PULL_AT, String(Date.now()));
        setStatus('synced', 'Up to date');
      }
      dirty = false;
      lastKnownLocalHash = snapshotHash(buildSnapshot());
    } catch (err) {
      setStatus('error', err.message);
    } finally {
      syncing = false;
    }
  }

  function start() {
    stop();
    if (!isEnabled()) return;
    // Immediate sync on load
    sync({ reason: 'initial' });
    // Regular pull check
    bgTimer = setInterval(() => sync({ reason: 'poll' }), POLL_MS);
    // Local change detection: hash syncable keys; if changed, sync sooner
    lastKnownLocalHash = snapshotHash(buildSnapshot());
    localPollTimer = setInterval(() => {
      const h = snapshotHash(buildSnapshot());
      if (h !== lastKnownLocalHash) {
        lastKnownLocalHash = h;
        dirty = true;
        // Debounce: sync 2s after last change if no more changes come in
        clearTimeout(start._debounce);
        start._debounce = setTimeout(() => sync({ reason: 'local-change' }), 2000);
      }
    }, LOCAL_POLL_MS);
    // Sync on tab focus (catch up after being away)
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
  }
  function stop() {
    if (bgTimer) { clearInterval(bgTimer); bgTimer = null; }
    if (localPollTimer) { clearInterval(localPollTimer); localPollTimer = null; }
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('online', onOnline);
  }
  function onVisibility() { if (!document.hidden && isEnabled()) sync({ reason: 'focus' }); }
  function onOnline() { if (isEnabled()) sync({ reason: 'online' }); }

  function reset() {
    stop();
    setPAT(''); setGistId(''); setEnabled(false);
    localStorage.removeItem(LAST_PUSH_H);
    localStorage.removeItem(LAST_PULL_AT);
    setStatus('idle', 'Reset');
  }

  // ---- Status chip (fixed, bottom-right, above the PWA install button) ----
  const chip = (() => {
    let el = null, ico = null, txt = null, dimTimer = null;
    const ICONS = { synced: '✓', syncing: '⟳', error: '⚠', offline: '⚠' };
    const TEXTS = {
      synced: 'Synced',
      syncing: 'Syncing…',
      error: 'Sync error — click to retry',
      offline: 'Offline — click to retry',
    };

    function ensure() {
      if (el || !document.body) return;
      const style = document.createElement('style');
      style.textContent = `
        #cloudsync-chip {
          position: fixed; right: 20px; bottom: 68px; z-index: 950;
          display: flex; align-items: center;
          height: 26px; min-width: 26px; max-width: 26px;
          border-radius: 13px; overflow: hidden;
          background: rgba(28, 28, 38, 0.88); color: #e5e7eb;
          font: 600 11px/1 system-ui, -apple-system, sans-serif;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
          user-select: none; cursor: default;
          transition: max-width 0.25s ease, opacity 0.5s ease;
          backdrop-filter: blur(4px);
        }
        #cloudsync-chip .cs-ico {
          width: 26px; height: 26px; flex: 0 0 26px;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
        }
        #cloudsync-chip .cs-txt {
          white-space: nowrap; padding-right: 12px;
          opacity: 0; transition: opacity 0.2s ease;
        }
        #cloudsync-chip:hover { max-width: 280px; opacity: 1 !important; }
        #cloudsync-chip:hover .cs-txt { opacity: 1; }
        #cloudsync-chip.cs-dim { opacity: 0.4; }
        #cloudsync-chip[data-state="synced"]  .cs-ico { color: #34d399; }
        #cloudsync-chip[data-state="syncing"] .cs-ico { color: #a78bfa; animation: csSpin 1s linear infinite; }
        #cloudsync-chip[data-state="error"]   .cs-ico,
        #cloudsync-chip[data-state="offline"] .cs-ico { color: #f59e0b; }
        #cloudsync-chip[data-state="error"],
        #cloudsync-chip[data-state="offline"] { cursor: pointer; }
        @keyframes csSpin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          #cloudsync-chip, #cloudsync-chip .cs-txt { transition: none; }
          #cloudsync-chip[data-state="syncing"] .cs-ico { animation: none; }
        }
      `;
      document.head.appendChild(style);
      el = document.createElement('div');
      el.id = 'cloudsync-chip';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-label', 'Cloud sync status');
      el.style.display = 'none';
      el.innerHTML = '<span class="cs-ico"></span><span class="cs-txt"></span>';
      ico = el.querySelector('.cs-ico');
      txt = el.querySelector('.cs-txt');
      el.addEventListener('click', () => {
        const st = el.dataset.state;
        if (st === 'error' || st === 'offline') sync({ reason: 'retry' });
      });
      el.addEventListener('mouseenter', updateTooltip);
      document.body.appendChild(el);
    }
    function fmtAgo(ts) {
      if (!ts) return 'never';
      const m = Math.round((Date.now() - ts) / 60000);
      if (m < 1) return 'just now';
      if (m < 60) return `${m} min ago`;
      const h = Math.round(m / 60);
      return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
    }
    function updateTooltip() {
      if (!el) return;
      const lastPull = parseInt(g(LAST_PULL_AT) || '0', 10);
      let tip = `Last sync ${fmtAgo(lastPull)} · ${getDeviceId()}`;
      try {
        const mi = JSON.parse(g(MERGE_INFO_KEY) || 'null');
        if (mi && mi.mergedKeys > 0) {
          tip += `\nLast merge: ${mi.mergedKeys} key(s) merged` +
                 (mi.localOnlyItems ? `, ${mi.localOnlyItems} local item(s) kept` : '') +
                 (mi.localNewer ? `, ${mi.localNewer} newer local win(s)` : '');
        }
      } catch (e) {}
      if ((state.status === 'error' || state.status === 'offline') && state.detail) tip += `\n${state.detail}`;
      el.title = tip;
    }
    function update(st) {
      try {
        if (!document.body) return; // pre-DOM setStatus; init hook re-runs us
        ensure();
        if (!el) return;
        const visible = isEnabled() && st.status !== 'disabled' && st.status !== 'idle';
        el.style.display = visible ? 'flex' : 'none';
        if (!visible) return;
        const key = ICONS[st.status] ? st.status : 'syncing';
        el.dataset.state = key;
        ico.textContent = ICONS[key];
        txt.textContent = TEXTS[key];
        clearTimeout(dimTimer);
        el.classList.remove('cs-dim');
        if (key === 'synced') dimTimer = setTimeout(() => { if (el) el.classList.add('cs-dim'); }, 3000);
        updateTooltip();
      } catch (e) { /* chip must never break sync */ }
    }
    return { update };
  })();
  statusListeners.add(st => chip.update(st));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => chip.update(state), { once: true });
  } else {
    chip.update(state);
  }

  // Expose API
  window.CloudSync = {
    state,
    sync: (opts) => sync(opts),
    start,
    stop,
    reset,
    getPAT, setPAT,
    getGistId, setGistId,
    isEnabled, setEnabled,
    getDeviceId,
    onStatus: (cb) => { statusListeners.add(cb); cb(state); return () => statusListeners.delete(cb); },
    buildSnapshot, applySnapshot, mergeSnapshots,
  };

  // Auto-start if user has already configured sync
  if (isEnabled()) {
    // Slight delay so the page finishes rendering first
    setTimeout(start, 800);
  }

  // Toast when a remote change lands (only if the host page has showToast)
  window.addEventListener('cloudsync-pulled', (e) => {
    if (window.showToast) window.showToast(`☁ Synced from ${e.detail?.device || 'another device'}`);
    // Best-effort: nudge the current tool to re-render
    if (typeof window.render === 'function') { try { window.render(); } catch {} }
  });
})();
