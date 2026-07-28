// Central Settings hub — one modal that reads/writes all scattered per-tool prefs.
// Loaded on every page. Opens via a floating gear button (bottom-left) or Ctrl+,
(function () {
  'use strict';
  if (window.top !== window) return;

  // ---- Provider config (mirrors AINoteTaker classic + Enterprise) ----
  const PROVIDERS = {
    gemini: {
      name: 'Google Gemini',
      keyStorage: 'ainotes.enterprise.gemini.key',
      modelStorage: 'ainotes.enterprise.gemini.model',
      // Also aliased for classic AINoteTaker
      keyStorageAlt: 'ainotes.apikey.gemini',
      modelStorageAlt: 'ainotes.model.gemini',
      defaultModel: 'gemini-2.5-flash',
      models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
      keyPlaceholder: 'AIza...',
      keyLink: 'https://aistudio.google.com/apikey',
      free: true,
    },
    groq: {
      name: 'Groq',
      keyStorage: 'ainotes.apikey.groq',
      modelStorage: 'ainotes.model.groq',
      defaultModel: 'llama-3.3-70b-versatile',
      models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it', 'deepseek-r1-distill-llama-70b'],
      keyPlaceholder: 'gsk_...',
      keyLink: 'https://console.groq.com/keys',
      free: true,
    },
    anthropic: {
      name: 'Anthropic Claude',
      keyStorage: 'ainotes.apikey.anthropic',
      modelStorage: 'ainotes.model.anthropic',
      defaultModel: 'claude-haiku-4-5-20251001',
      models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-7'],
      keyPlaceholder: 'sk-ant-...',
      keyLink: 'https://console.anthropic.com',
      free: false,
    },
  };

  // Theme keys per tool (they're scattered — we'll write to all so switching one propagates)
  const THEME_KEYS = [
    'utilities.theme',
    'tasks.theme',
    'ainotes.theme',
    'sqlfmt.theme',
  ];

  function getTheme() {
    for (const k of THEME_KEYS) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
    return 'dark';
  }
  function setThemeAll(t) {
    THEME_KEYS.forEach(k => localStorage.setItem(k, t));
    // Apply immediately to this page
    document.documentElement.dataset.theme = t;
  }

  function getKey(p) { return localStorage.getItem(PROVIDERS[p]?.keyStorage) || ''; }
  function setKey(p, v) {
    const s = PROVIDERS[p]?.keyStorage; if (!s) return;
    if (v) localStorage.setItem(s, v); else localStorage.removeItem(s);
    // Also write alt storage (for classic AINoteTaker with per-provider slots)
    const alt = PROVIDERS[p]?.keyStorageAlt;
    if (alt) { if (v) localStorage.setItem(alt, v); else localStorage.removeItem(alt); }
  }
  function getModel(p) { return localStorage.getItem(PROVIDERS[p]?.modelStorage) || PROVIDERS[p]?.defaultModel || ''; }
  function setModel(p, m) {
    const s = PROVIDERS[p]?.modelStorage; if (!s) return;
    localStorage.setItem(s, m);
    const alt = PROVIDERS[p]?.modelStorageAlt;
    if (alt) localStorage.setItem(alt, m);
  }
  function getProvider() { return localStorage.getItem('ainotes.provider') || ''; }
  function setProvider(p) { p ? localStorage.setItem('ainotes.provider', p) : localStorage.removeItem('ainotes.provider'); }

  // ---- Modal HTML/CSS injection ----
  const style = document.createElement('style');
  style.textContent = `
    .st-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); display: none; align-items: flex-start; justify-content: center; padding: 60px 20px 40px; z-index: 950; overflow-y: auto; }
    .st-backdrop.show { display: flex; }
    .st-modal { background: #1e1e2e; color: #cdd6f4; border-radius: 16px; padding: 24px 28px; max-width: 640px; width: 100%; box-shadow: 0 30px 60px rgba(0,0,0,0.5); border: 1px solid #3b3b54; }
    html[data-theme="light"] .st-modal { background: #ffffff; color: #1e293b; border-color: #e2e8f0; box-shadow: 0 30px 60px rgba(30,41,59,0.2); }
    .st-modal h2 { font-size: 1.2rem; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
    .st-modal .st-sub { color: #9399b2; font-size: 0.85rem; margin-bottom: 16px; }
    html[data-theme="light"] .st-modal .st-sub { color: #64748b; }
    .st-section { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #313244; }
    html[data-theme="light"] .st-section { border-color: #e2e8f0; }
    .st-section:last-of-type { border-bottom: none; margin-bottom: 12px; }
    .st-section h3 { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: #9399b2; margin-bottom: 10px; font-weight: 600; }
    html[data-theme="light"] .st-section h3 { color: #64748b; }
    .st-row { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
    .st-label { font-size: 0.85rem; min-width: 90px; }
    .st-modal input, .st-modal select { flex: 1; min-width: 180px; padding: 8px 12px; border: 1px solid #45475a; border-radius: 8px; background: #313244; color: inherit; font-size: 0.88rem; outline: none; font-family: 'Consolas', 'Monaco', monospace; }
    html[data-theme="light"] .st-modal input, html[data-theme="light"] .st-modal select { background: #f8fafc; border-color: #e2e8f0; }
    .st-modal input:focus, .st-modal select:focus { border-color: #a78bfa; }
    .st-theme-choices { display: flex; gap: 8px; }
    .st-theme-btn { flex: 1; padding: 12px; border: 2px solid #313244; border-radius: 10px; background: transparent; color: inherit; cursor: pointer; font-family: inherit; font-size: 0.88rem; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 6px; }
    .st-theme-btn.on { border-color: #a78bfa; background: rgba(167,139,250,0.15); }
    .st-theme-btn:hover { border-color: #a78bfa; }
    .st-modal .st-hint { font-size: 0.75rem; color: #6c7086; font-style: italic; margin-top: 4px; padding-left: 4px; }
    html[data-theme="light"] .st-modal .st-hint { color: #94a3b8; }
    .st-modal .st-link { color: #a78bfa; text-decoration: none; font-weight: normal; text-transform: none; letter-spacing: 0; }
    .st-modal .st-link:hover { text-decoration: underline; }
    .st-actions { display: flex; gap: 8px; justify-content: space-between; margin-top: 14px; }
    .st-actions .st-btn { padding: 9px 16px; border-radius: 8px; border: 1px solid #45475a; background: transparent; color: inherit; cursor: pointer; font-family: inherit; font-size: 0.86rem; }
    html[data-theme="light"] .st-actions .st-btn { border-color: #e2e8f0; }
    .st-actions .st-btn:hover { border-color: #a78bfa; }
    .st-actions .st-btn.danger { color: #f38ba8; }
    .st-actions .st-btn.danger:hover { border-color: #f38ba8; }
    .st-actions .st-btn.primary { background: linear-gradient(135deg, #a78bfa, #ec4899); color: #fff; border: none; font-weight: 600; }
    .st-actions .st-btn.primary:hover { filter: brightness(1.1); }
    .st-provider-badges { display: flex; gap: 4px; margin-left: auto; }
    .st-badge { font-size: 0.62rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; letter-spacing: 0.04em; }
    .st-badge.free { background: rgba(34,197,94,0.2); color: #22c55e; }
    .st-badge.paid { background: rgba(239,68,68,0.2); color: #f38ba8; }
    .st-badge.active { background: rgba(167,139,250,0.25); color: #a78bfa; }

    /* Floating gear button */
    .st-gear {
      position: fixed; left: 68px; bottom: 16px; z-index: 940;
      width: 36px; height: 36px; border-radius: 50%;
      background: #1e1e2e; border: 1px solid #3b3b54;
      color: #9399b2; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: transform 0.3s cubic-bezier(.34,1.56,.64,1), color 0.15s, border-color 0.15s;
    }
    html[data-theme="light"] .st-gear { background: #ffffff; border-color: #e2e8f0; color: #64748b; }
    .st-gear:hover { color: #a78bfa; border-color: #a78bfa; transform: rotate(60deg); }
    body.nr-expanded .st-gear { left: 236px; }
    @media (max-width: 640px) {
      .st-gear { left: 12px; bottom: 60px; }
      body.nr-expanded .st-gear { left: 12px; }
    }
  `;
  document.head.appendChild(style);

  const backdrop = document.createElement('div');
  backdrop.className = 'st-backdrop';
  backdrop.innerHTML = `
    <div class="st-modal" role="dialog" aria-labelledby="stTitle">
      <h2 id="stTitle">⚙ Settings</h2>
      <div class="st-sub">Unified controls for all Utilities tools. Changes apply everywhere.</div>

      <div class="st-section">
        <h3>Theme</h3>
        <div class="st-theme-choices" id="stThemeChoices">
          <button class="st-theme-btn" data-theme="dark">🌙 Dark</button>
          <button class="st-theme-btn" data-theme="light">☀ Light (Notebook)</button>
        </div>
        <div class="st-hint">Propagates across Task Manager, Note Taker, SQL Formatter, and Dashboard.</div>
      </div>

      <div class="st-section">
        <h3>AI Provider (for Note Taker, Recap, Chat) <span class="st-hint" style="font-style:normal">— pick one that works for your key</span></h3>
        <div class="st-row">
          <label class="st-label">Active</label>
          <select id="stProviderSelect">
            <option value="">None — local features only</option>
            <option value="gemini">🟢 Gemini (free — recommended)</option>
            <option value="groq">🚀 Groq (free — fastest)</option>
            <option value="anthropic">🟣 Anthropic Claude (paid)</option>
          </select>
        </div>
        <div id="stProviderFields"></div>
      </div>

      <div class="st-section">
        <h3>Navigation</h3>
        <div class="st-row">
          <label class="st-label">Rail</label>
          <label style="display:flex;gap:6px;align-items:center;font-size:0.88rem;cursor:pointer;">
            <input type="checkbox" id="stRailPin" style="min-width:auto;flex:none;width:16px;height:16px;">
            Pin expanded by default
          </label>
        </div>
      </div>

      <div class="st-section">
        <h3>☁ Cloud Sync (GitHub Gist)</h3>
        <div class="st-hint" style="margin-bottom:8px;padding-left:0;">
          Auto-sync tasks, notes, vault + recap history between devices via a private gist.
          Password vault stays AES-256 encrypted before leaving the device.
        </div>
        <div class="st-row">
          <label class="st-label">Enable</label>
          <label style="display:flex;gap:6px;align-items:center;font-size:0.88rem;cursor:pointer;">
            <input type="checkbox" id="stSyncEnabled" style="min-width:auto;flex:none;width:16px;height:16px;">
            <span id="stSyncStatus" style="color:#9399b2;font-family:'Consolas','Monaco',monospace;font-size:0.78rem;"></span>
          </label>
        </div>
        <div class="st-row">
          <label class="st-label">GitHub PAT</label>
          <input type="password" id="stSyncPat" placeholder="ghp_… or github_pat_…" autocomplete="off">
        </div>
        <div class="st-hint" style="padding-left:100px;">
          Needs the <b>gist</b> scope only. Create one at
          <a class="st-link" href="https://github.com/settings/tokens/new?scopes=gist&description=MyoMT+Utilities+Sync" target="_blank">github.com/settings/tokens</a>
          → check <b>gist</b> → Generate.
        </div>
        <div class="st-row" style="gap:8px;margin-top:8px;">
          <button class="st-btn" id="stSyncNowBtn">☁ Sync now</button>
          <button class="st-btn" id="stSyncOpenGist" style="display:none">🔗 Open gist</button>
          <button class="st-btn danger" id="stSyncResetBtn">🗑 Disconnect</button>
        </div>
      </div>

      <div class="st-section">
        <h3>Data</h3>
        <div class="st-row" style="gap:8px;">
          <button class="st-btn" id="stExportAll">⬇ Export All Data (JSON)</button>
          <button class="st-btn" id="stStorageInfo">📊 Storage Usage</button>
        </div>
        <div class="st-hint" id="stStorageOut" style="margin-top:6px;"></div>
      </div>

      <div class="st-actions">
        <button class="st-btn danger" id="stResetBtn">🗑 Reset Settings</button>
        <div style="display:flex;gap:8px;">
          <button class="st-btn" id="stCancelBtn">Close</button>
          <button class="st-btn primary" id="stSaveBtn">Save</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const gear = document.createElement('button');
  gear.className = 'st-gear';
  gear.title = 'Settings (Ctrl+,)';
  gear.setAttribute('aria-label', 'Open settings');
  gear.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
  document.body.appendChild(gear);

  // ---- Behavior ----
  const $$ = sel => backdrop.querySelector(sel);

  function open() {
    // Populate theme buttons
    const currentTheme = getTheme();
    backdrop.querySelectorAll('.st-theme-btn').forEach(b => {
      b.classList.toggle('on', b.dataset.theme === currentTheme);
      b.onclick = () => {
        backdrop.querySelectorAll('.st-theme-btn').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        setThemeAll(b.dataset.theme);
      };
    });
    // Provider
    $$('#stProviderSelect').value = getProvider();
    renderProviderFields();
    // Rail
    $$('#stRailPin').checked = localStorage.getItem('utilities.navrail.expanded') === '1';
    // Cloud sync
    populateSyncSection();
    // Storage info (fresh)
    updateStorageInfo();

    backdrop.classList.add('show');
  }

  // ---- Cloud Sync UI ----
  function populateSyncSection() {
    const cs = window.CloudSync;
    if (!cs) return;
    $$('#stSyncEnabled').checked = cs.isEnabled();
    $$('#stSyncPat').value = cs.getPAT();
    updateSyncStatus(cs.state);
    updateSyncGistLink();
  }
  function updateSyncStatus(state) {
    if (!state) return;
    const map = {
      idle:     '⚪ Idle',
      disabled: '⚪ Off',
      syncing:  '🔄 Syncing…',
      synced:   '✅ Synced',
      error:    '⚠ Error',
      offline:  '📴 Offline',
    };
    const label = map[state.status] || state.status;
    const detail = state.detail ? ` — ${state.detail}` : '';
    const ago = state.lastPullAt ? ` · ${fmtAgo(state.lastPullAt)}` : '';
    const el = $$('#stSyncStatus');
    if (el) el.textContent = `${label}${detail}${ago}`;
  }
  function fmtAgo(ts) {
    if (!ts) return '';
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)   return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }
  function updateSyncGistLink() {
    const cs = window.CloudSync;
    const btn = $$('#stSyncOpenGist');
    if (!cs || !btn) return;
    const id = cs.getGistId();
    if (id) {
      btn.style.display = '';
      btn.onclick = () => window.open(`https://gist.github.com/${id}`, '_blank');
    } else {
      btn.style.display = 'none';
    }
  }

  // Wire sync buttons
  const stSyncEnabled = $$('#stSyncEnabled');
  const stSyncPat = $$('#stSyncPat');
  if (stSyncEnabled && stSyncPat) {
    stSyncEnabled.addEventListener('change', () => {
      const cs = window.CloudSync; if (!cs) return;
      if (stSyncEnabled.checked && !cs.getPAT()) {
        stSyncEnabled.checked = false;
        alert('Paste a GitHub PAT first, then enable.');
        return;
      }
      cs.setEnabled(stSyncEnabled.checked);
      if (stSyncEnabled.checked) { cs.start(); cs.sync(); }
      else cs.stop();
    });
    // Save PAT on blur (avoid saving on every keystroke)
    stSyncPat.addEventListener('blur', () => {
      const cs = window.CloudSync; if (!cs) return;
      cs.setPAT(stSyncPat.value.trim());
      updateSyncGistLink();
    });
    $$('#stSyncNowBtn').onclick = () => {
      const cs = window.CloudSync; if (!cs) return;
      cs.setPAT(stSyncPat.value.trim());
      if (!cs.getPAT()) { alert('Paste a PAT first'); return; }
      cs.setEnabled(true); stSyncEnabled.checked = true;
      cs.start(); cs.sync({ reason: 'manual' });
    };
    $$('#stSyncResetBtn').onclick = () => {
      if (!confirm('Disconnect cloud sync?\nThis removes the PAT + gist link locally. The gist itself stays on GitHub — delete it there if you want to remove data.')) return;
      const cs = window.CloudSync; if (!cs) return;
      cs.reset();
      stSyncEnabled.checked = false;
      stSyncPat.value = '';
      updateSyncStatus(cs.state);
      updateSyncGistLink();
    };
    // Subscribe to status changes to update UI live while modal open
    if (window.CloudSync?.onStatus) {
      window.CloudSync.onStatus((st) => {
        if (backdrop.classList.contains('show')) {
          updateSyncStatus(st);
          updateSyncGistLink();
        }
      });
    }
  }
  function close() { backdrop.classList.remove('show'); }

  $$('#stProviderSelect').addEventListener('change', renderProviderFields);

  function renderProviderFields() {
    const p = $$('#stProviderSelect').value;
    const wrap = $$('#stProviderFields');
    wrap.innerHTML = '';
    if (!p) {
      wrap.innerHTML = '<div class="st-hint">No AI provider selected. Note Taker + Recap will use local heuristics only.</div>';
      return;
    }
    const cfg = PROVIDERS[p];
    const badge = cfg.free ? '<span class="st-badge free">FREE</span>' : '<span class="st-badge paid">PAID</span>';
    wrap.innerHTML = `
      <div class="st-row">
        <label class="st-label">API Key ${badge}</label>
        <input type="password" id="stKeyInput" placeholder="${cfg.keyPlaceholder}" autocomplete="off">
      </div>
      <div class="st-hint" style="padding-left:100px;">Get one free: <a class="st-link" href="${cfg.keyLink}" target="_blank">${cfg.keyLink}</a></div>
      <div class="st-row" style="margin-top:8px;">
        <label class="st-label">Model</label>
        <select id="stModelSelect">
          ${cfg.models.map(m => `<option value="${m}">${m}</option>`).join('')}
        </select>
      </div>
    `;
    $$('#stKeyInput').value = getKey(p);
    $$('#stModelSelect').value = getModel(p);
  }

  $$('#stSaveBtn').onclick = () => {
    // Provider
    const p = $$('#stProviderSelect').value;
    setProvider(p);
    if (p) {
      const key = $$('#stKeyInput')?.value.trim();
      if (key) setKey(p, key);
      const model = $$('#stModelSelect')?.value;
      if (model) setModel(p, model);
    }
    // Rail
    localStorage.setItem('utilities.navrail.expanded', $$('#stRailPin').checked ? '1' : '0');
    close();
    if (window.showToast) window.showToast('⚙ Settings saved — refresh to see all changes');
    else console.info('[Settings] Saved');
  };
  $$('#stCancelBtn').onclick = close;
  $$('#stResetBtn').onclick = () => {
    if (!confirm('Clear all provider keys + theme + rail preference?\n(Your notes/tasks/passwords data is untouched.)')) return;
    Object.values(PROVIDERS).forEach(cfg => {
      localStorage.removeItem(cfg.keyStorage);
      localStorage.removeItem(cfg.modelStorage);
      if (cfg.keyStorageAlt) localStorage.removeItem(cfg.keyStorageAlt);
      if (cfg.modelStorageAlt) localStorage.removeItem(cfg.modelStorageAlt);
    });
    localStorage.removeItem('ainotes.provider');
    localStorage.removeItem('utilities.navrail.expanded');
    THEME_KEYS.forEach(k => localStorage.removeItem(k));
    close();
    if (window.showToast) window.showToast('Settings reset');
  };

  // ---- Export All ----
  $$('#stExportAll').onclick = () => {
    const bundle = {};
    const exportKeys = [
      'tasks.v3', 'tasks.sort', 'tasks.view',
      'ainotes.v1', 'ainotes.v11.enterprise',
      'pm-vault-v2',
      'recap.history.v1',
    ];
    exportKeys.forEach(k => {
      const v = localStorage.getItem(k);
      if (v) bundle[k] = v;
    });
    bundle._meta = { exportedAt: new Date().toISOString(), tool: 'MyoMT Utilities Suite', version: 1 };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myomt-utilities-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    if (window.showToast) window.showToast('⬇ Backup saved');
  };

  // ---- Storage info ----
  function updateStorageInfo() {
    let total = 0, count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const v = localStorage.getItem(k) || '';
      total += (k.length + v.length) * 2; // UTF-16 approx
      count++;
    }
    const kb = (total / 1024).toFixed(1);
    $$('#stStorageOut').textContent = `${count} keys · ~${kb} KB used (limit typically 5-10 MB)`;
  }
  $$('#stStorageInfo').onclick = updateStorageInfo;

  // ---- Wire triggers ----
  gear.onclick = open;
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', e => {
    // Ctrl+, (or Cmd+, on Mac) opens Settings
    if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); open(); }
    else if (e.key === 'Escape' && backdrop.classList.contains('show')) close();
  });

  window.Settings = { open, close };
})();
