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
    'pm-vault-v2',
    'recap.history.v1',
  ];

  // Local sync bookkeeping (never synced themselves)
  const PAT_KEY      = 'sync.github.pat';
  const GIST_KEY     = 'sync.github.gistId';
  const DEVICE_KEY   = 'sync.device.id';
  const LAST_PUSH_H  = 'sync.lastPushHash';
  const LAST_PULL_AT = 'sync.lastPullAt';
  const ENABLED_KEY  = 'sync.enabled';
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
        // Both sides changed since we last pushed. Simple resolution: remote wins,
        // then push a merged snapshot. For text/JSON payloads this is safest.
        // (Rare in practice — user rarely edits both devices simultaneously.)
        applySnapshot(remote);
        s(LAST_PUSH_H, remoteHash);
        s(LAST_PULL_AT, String(Date.now()));
        window.dispatchEvent(new CustomEvent('cloudsync-pulled', { detail: { device: remoteDevice } }));
        setStatus('synced', `Pulled (conflict — remote wins from ${remoteDevice})`);
        // Re-hash local after apply and if it still differs from remote, push
        const afterHash = snapshotHash(buildSnapshot());
        if (afterHash !== remoteHash) {
          await updateGist(gistId, buildSnapshot());
          s(LAST_PUSH_H, afterHash);
          setStatus('synced', 'Pulled + pushed (merge)');
        }
      } else if (remoteIsNew) {
        // Only remote changed → pull
        applySnapshot(remote);
        s(LAST_PUSH_H, remoteHash);
        s(LAST_PULL_AT, String(Date.now()));
        window.dispatchEvent(new CustomEvent('cloudsync-pulled', { detail: { device: remoteDevice } }));
        setStatus('synced', `Pulled from ${remoteDevice || 'remote'}`);
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
    buildSnapshot, applySnapshot,
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
