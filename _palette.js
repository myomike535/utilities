// Shared Command Palette — included by all Utilities.Tool pages.
// Usage: <script defer src="_palette.js"></script>
// Optional: window.PALETTE_ACTIONS = [{ label, hint, run, section }] to inject page-specific actions.
(function () {
  'use strict';

  const HERE = location.pathname.split('/').pop().toLowerCase();

  // ---- Styles ----
  const style = document.createElement('style');
  style.textContent = `
    .cp-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:none;align-items:flex-start;justify-content:center;padding-top:12vh;}
    .cp-backdrop.show{display:flex;}
    .cp-modal{width:100%;max-width:620px;background:#27273a;color:#e4e4e7;border:1px solid #3a3a52;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.5);overflow:hidden;display:flex;flex-direction:column;max-height:70vh;}
    html[data-theme="light"] .cp-modal{background:#ffffff;color:#1e293b;border-color:#e2e8f0;box-shadow:0 20px 60px rgba(30,41,59,0.2);}
    .cp-input{border:none;outline:none;background:transparent;color:inherit;padding:16px 18px;font-size:1rem;font-family:inherit;border-bottom:1px solid #3a3a52;}
    html[data-theme="light"] .cp-input{border-color:#e2e8f0;}
    .cp-list{overflow-y:auto;padding:4px;flex:1;min-height:0;}
    .cp-section{font-size:0.68rem;color:#9a9ab0;text-transform:uppercase;letter-spacing:0.08em;padding:8px 12px 4px;font-weight:600;}
    html[data-theme="light"] .cp-section{color:#64748b;}
    .cp-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:6px;cursor:pointer;font-size:0.9rem;color:inherit;}
    .cp-item .cp-ico{width:20px;text-align:center;flex-shrink:0;}
    .cp-item .cp-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .cp-item .cp-hint{font-size:0.72rem;color:#6b6b82;font-family:Consolas,monospace;flex-shrink:0;}
    html[data-theme="light"] .cp-item .cp-hint{color:#94a3b8;}
    .cp-item.on{background:rgba(99,102,241,0.18);}
    html[data-theme="light"] .cp-item.on{background:rgba(99,102,241,0.12);}
    .cp-empty{padding:24px 12px;text-align:center;color:#6b6b82;font-style:italic;font-size:0.9rem;}
    .cp-footer{padding:8px 14px;border-top:1px solid #3a3a52;font-size:0.7rem;color:#9a9ab0;display:flex;justify-content:space-between;}
    html[data-theme="light"] .cp-footer{border-color:#e2e8f0;color:#64748b;}
    .cp-footer kbd{background:#3a3a52;color:#e4e4e7;padding:1px 5px;border-radius:3px;font-family:Consolas,monospace;font-size:0.68rem;}
    html[data-theme="light"] .cp-footer kbd{background:#e2e8f0;color:#1e293b;}
  `;
  document.head.appendChild(style);

  // ---- Modal DOM ----
  const backdrop = document.createElement('div');
  backdrop.className = 'cp-backdrop';
  backdrop.innerHTML = `
    <div class="cp-modal" role="dialog" aria-label="Command Palette">
      <input class="cp-input" id="cpInput" placeholder="Search tasks · notes · vault entries · actions…" autocomplete="off" spellcheck="false">
      <div class="cp-list" id="cpList"></div>
      <div class="cp-footer">
        <span><kbd>↑↓</kbd> navigate · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close</span>
        <span><kbd>Ctrl+K</kbd></span>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  const inputEl = backdrop.querySelector('#cpInput');
  const listEl = backdrop.querySelector('#cpList');

  let openState = false;
  let items = []; // flat filtered items
  let selectedIdx = 0;

  function open() {
    openState = true;
    backdrop.classList.add('show');
    inputEl.value = '';
    inputEl.focus();
    refresh();
  }
  function close() {
    openState = false;
    backdrop.classList.remove('show');
  }
  function toggle() { openState ? close() : open(); }

  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });

  // ---- Data collectors ----
  function readTasks() {
    try {
      const raw = JSON.parse(localStorage.getItem('tasks.v3') || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.map(t => ({
        section: 'Tasks',
        ico: t.status === 'done' ? '✓' : t.status === 'doing' ? '▶' : t.status === 'blocked' ? '⛔' : '○',
        text: t.text,
        hint: [t.priority?.toUpperCase(), t.due, t.status].filter(Boolean).join(' · '),
        haystack: (t.text + ' ' + (t.note || '')).toLowerCase(),
        run: () => go('ToDo.html'),
      }));
    } catch { return []; }
  }
  function readNotes() {
    try {
      const raw = JSON.parse(localStorage.getItem('ainotes.v1') || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.map(n => ({
        section: 'Notes',
        ico: '🎙',
        text: n.title || '(untitled)',
        hint: (n.transcript || '').split(/\s+/).filter(Boolean).length + ' words',
        haystack: (n.title + ' ' + (n.transcript || '') + ' ' + (n.summary || '')).toLowerCase(),
        run: () => go('AINoteTaker.html'),
      }));
    } catch { return []; }
  }
  function readVault() {
    try {
      const raw = JSON.parse(localStorage.getItem('pm-vault-v2') || '{}');
      if (raw.enc) return [{
        section: 'Vault',
        ico: '🔒',
        text: 'Vault is locked — unlock in Password Manager',
        hint: 'encrypted',
        haystack: 'vault locked password',
        run: () => go('PasswordManager.html'),
      }];
      if (raw.data) {
        try {
          const arr = JSON.parse(atob(raw.data));
          if (!Array.isArray(arr)) return [];
          const CAT_ICO = { website:'🌐', database:'🗄', server:'🖥', app:'🔌', note:'📝', info:'📒', study:'📚' };
          return arr.map(e => ({
            section: 'Vault',
            ico: CAT_ICO[e.type] || '🔐',
            text: e.title || '(untitled entry)',
            hint: e.type,
            haystack: (e.title + ' ' + Object.values(e.fields || {}).join(' ')).toLowerCase(),
            run: () => go('PasswordManager.html'),
          }));
        } catch { return []; }
      }
      return [];
    } catch { return []; }
  }

  function coreActions() {
    return [
      { section:'Go to', ico:'🏠', text:'Dashboard',           hint:'index.html',           run: () => go('index.html') },
      { section:'Go to', ico:'📋', text:'Task Manager',        hint:'ToDo.html',            run: () => go('ToDo.html') },
      { section:'Go to', ico:'🎙', text:'AI Note Taker',       hint:'AINoteTaker.html',     run: () => go('AINoteTaker.html') },
      { section:'Go to', ico:'🔐', text:'Password Manager',    hint:'PasswordManager.html', run: () => go('PasswordManager.html') },
      { section:'Go to', ico:'🔧', text:'SQL Formatter',       hint:'SqlFormatter.html',    run: () => go('SqlFormatter.html') },
    ].filter(a => !a.hint || a.hint.toLowerCase() !== HERE);
  }

  function go(page) {
    if (page.toLowerCase() === HERE) { close(); return; }
    location.href = page;
  }

  // ---- Filter + render ----
  function refresh() {
    const q = inputEl.value.trim().toLowerCase();
    let all = [
      ...coreActions(),
      ...(window.PALETTE_ACTIONS || []),
      ...readTasks(),
      ...readNotes(),
      ...readVault(),
    ];
    // Ensure haystack fallback
    all.forEach(a => { if (!a.haystack) a.haystack = (a.text + ' ' + (a.hint || '')).toLowerCase(); });
    if (q) all = all.filter(a => fuzzyMatch(a.haystack, q));

    // Order: exact starts first, then substring, then fuzzy
    if (q) all.sort((a, b) => rank(a.haystack, q) - rank(b.haystack, q));

    // Limit
    items = all.slice(0, 80);
    selectedIdx = 0;
    renderList();
  }
  function fuzzyMatch(hay, q) {
    if (hay.includes(q)) return true;
    // simple char-by-char fuzzy
    let i = 0, j = 0;
    while (i < hay.length && j < q.length) {
      if (hay[i] === q[j]) j++;
      i++;
    }
    return j === q.length;
  }
  function rank(hay, q) {
    if (hay.startsWith(q)) return 0;
    const idx = hay.indexOf(q);
    if (idx !== -1) return 1 + idx / 100;
    return 100;
  }
  function renderList() {
    listEl.textContent = '';
    if (!items.length) {
      listEl.innerHTML = '<div class="cp-empty">No matches. Try different keywords.</div>';
      return;
    }
    // Group by section but keep order
    let lastSection = '';
    items.forEach((item, i) => {
      if (item.section && item.section !== lastSection) {
        const h = document.createElement('div');
        h.className = 'cp-section';
        h.textContent = item.section;
        listEl.appendChild(h);
        lastSection = item.section;
      }
      const el = document.createElement('div');
      el.className = 'cp-item' + (i === selectedIdx ? ' on' : '');
      el.dataset.i = i;
      el.innerHTML = `<span class="cp-ico">${item.ico || '•'}</span><span class="cp-text"></span><span class="cp-hint"></span>`;
      el.querySelector('.cp-text').textContent = item.text;
      el.querySelector('.cp-hint').textContent = item.hint || '';
      el.addEventListener('mouseenter', () => { selectedIdx = i; updateSelection(); });
      el.addEventListener('click', () => runItem(i));
      listEl.appendChild(el);
    });
    scrollSelectedIntoView();
  }
  function updateSelection() {
    listEl.querySelectorAll('.cp-item').forEach(el => el.classList.toggle('on', +el.dataset.i === selectedIdx));
    scrollSelectedIntoView();
  }
  function scrollSelectedIntoView() {
    const el = listEl.querySelector('.cp-item.on');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }
  function runItem(i) {
    const item = items[i];
    if (!item) return;
    close();
    try { item.run && item.run(); } catch (err) { console.error(err); }
  }

  // ---- Input events ----
  inputEl.addEventListener('input', refresh);
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(items.length - 1, selectedIdx + 1); updateSelection(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(0, selectedIdx - 1); updateSelection(); }
    else if (e.key === 'Enter') { e.preventDefault(); runItem(selectedIdx); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });

  // ---- Global hotkey ----
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      toggle();
    } else if (e.key === 'Escape' && openState) {
      close();
    }
  });

  // Expose for programmatic open
  window.CommandPalette = { open, close, toggle };
})();
