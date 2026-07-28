// Shared Kimi-style navigation rail — mounted by all Utilities.Tool pages
// Usage: <script defer src="_navrail.js"></script>
(function () {
  'use strict';

  // Skip mounting inside iframes / embedded contexts
  if (window.top !== window) return;

  const HERE = location.pathname.split('/').pop().toLowerCase();

  const ICONS = {
    dashboard:  '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
    tasks:      '<svg viewBox="0 0 24 24"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>',
    mic:        '<svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>',
    shield:     '<svg viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><circle cx="12" cy="12" r="2"/><path d="M12 14v3"/></svg>',
    braces:     '<svg viewBox="0 0 24 24"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/></svg>',
    rocket:     '<svg viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
    trending:   '<svg viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
    sparkles:   '<svg viewBox="0 0 24 24"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>',
    headphones: '<svg viewBox="0 0 24 24"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1v-6a9 9 0 0 1 18 0v6a1 1 0 0 1-1 1h-2a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>',
    palette:    '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16"/><path d="M14 8h4"/><path d="M14 12h4"/><path d="M14 16h2"/></svg>',
    chevron:    '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>',
  };

  const TOOLS = [
    { href: 'index.html',                          icon: 'dashboard',  label: 'Dashboard',      color: '#8b5cf6' },
    { href: 'ToDo.html',                           icon: 'tasks',      label: 'Task Manager',   color: '#6366f1' },
    { href: 'AINoteTaker.html',                    icon: 'mic',        label: 'AI Note Taker',  color: '#a78bfa' },
    { href: 'ai_note_taker_enterprise_suite.html', icon: 'sparkles',   label: 'Enterprise',     color: '#cba6f7' },
    { href: 'RecapAudioMaker.html',                icon: 'headphones', label: 'Recap Audio',    color: '#f472b6' },
    { href: 'PasswordManager.html',                icon: 'shield',     label: 'Passwords',      color: '#22c55e' },
    { href: 'SqlFormatter.html',                   icon: 'braces',     label: 'SQL Formatter',  color: '#ec4899' },
    { href: 'SqlDeploy.html',                      icon: 'rocket',     label: 'SQL Deploy',     color: '#38bdf8' },
    { href: 'GithubTrending.html',                 icon: 'trending',   label: 'GH Trending',    color: '#58a6ff' },
  ];

  // ---- Styles (scoped by .nr- prefix, so no collisions with host page) ----
  const style = document.createElement('style');
  style.textContent = `
    body { padding-left: 52px !important; transition: padding-left 0.25s ease; }
    body.nr-expanded { padding-left: 220px !important; }

    .nr {
      position: fixed;
      top: 0; left: 0; bottom: 0;
      width: 52px;
      background: #1e1e2e;
      border-right: 1px solid #313244;
      z-index: 800;
      display: flex;
      flex-direction: column;
      padding: 10px 6px;
      gap: 4px;
      transition: width 0.25s ease;
      overflow: hidden;
      color: #cdd6f4;
    }
    html[data-theme="light"] .nr {
      background: #f5e2b4;
      border-right-color: #d3c0a3;
      color: #2d241e;
    }
    .nr.expanded { width: 220px; }

    .nr-brand {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 8px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      margin-bottom: 6px;
      cursor: pointer;
      user-select: none;
    }
    html[data-theme="light"] .nr-brand { border-bottom-color: rgba(139,100,40,0.15); }
    .nr-brand .nr-logo {
      width: 32px; height: 32px; flex-shrink: 0;
      background: linear-gradient(135deg, #a78bfa, #ec4899);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 700; font-size: 0.95rem;
      box-shadow: 0 4px 12px rgba(167,139,250,0.35);
    }
    .nr-brand .nr-brand-text {
      opacity: 0; white-space: nowrap; overflow: hidden;
      font-weight: 600; font-size: 0.9rem;
      transition: opacity 0.15s ease;
    }
    .nr.expanded .nr-brand .nr-brand-text { opacity: 1; }

    .nr-items {
      flex: 1;
      display: flex; flex-direction: column;
      gap: 2px;
      overflow-y: auto; overflow-x: hidden;
    }
    .nr-items::-webkit-scrollbar { width: 3px; }
    .nr-items::-webkit-scrollbar-thumb { background: #45475a; border-radius: 2px; }

    .nr-item {
      display: flex; align-items: center; gap: 12px;
      padding: 9px 8px;
      border-radius: 8px;
      color: #9399b2;
      text-decoration: none;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease, transform 0.25s cubic-bezier(.34,1.56,.64,1);
      position: relative;
      min-height: 36px;
    }
    html[data-theme="light"] .nr-item { color: #6e5c4d; }
    .nr-item:hover {
      background: rgba(255,255,255,0.06);
      color: var(--nr-color, #cdd6f4);
    }
    html[data-theme="light"] .nr-item:hover {
      background: rgba(139,100,40,0.12);
      color: var(--nr-color, #2d241e);
    }
    .nr-item.active {
      background: color-mix(in oklab, var(--nr-color) 18%, transparent);
      color: var(--nr-color);
    }
    .nr-item.active::before {
      content: '';
      position: absolute;
      left: -6px; top: 6px; bottom: 6px;
      width: 3px;
      background: var(--nr-color);
      border-radius: 0 3px 3px 0;
    }
    .nr-item:hover .nr-icon { transform: scale(1.12) rotate(-4deg); }
    .nr-item:active .nr-icon { transform: scale(0.95); }

    .nr-icon {
      width: 22px; height: 22px; flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      transition: transform 0.3s cubic-bezier(.34,1.56,.64,1);
    }
    .nr-icon svg {
      width: 100%; height: 100%;
      fill: none; stroke: currentColor;
      stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round;
    }
    .nr-label {
      opacity: 0; white-space: nowrap; overflow: hidden;
      font-size: 0.86rem;
      transition: opacity 0.15s ease;
    }
    .nr.expanded .nr-label { opacity: 1; }

    /* Tooltip when collapsed */
    .nr:not(.expanded) .nr-item::after {
      content: attr(data-tip);
      position: absolute;
      left: calc(100% + 8px);
      top: 50%;
      transform: translateY(-50%) translateX(-4px);
      background: #313244;
      color: #cdd6f4;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 0.78rem;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease, transform 0.15s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 810;
    }
    .nr:not(.expanded) .nr-item:hover::after {
      opacity: 1;
      transform: translateY(-50%) translateX(0);
    }

    .nr-bottom {
      display: flex; flex-direction: column; gap: 4px;
      padding-top: 8px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    html[data-theme="light"] .nr-bottom { border-top-color: rgba(139,100,40,0.15); }

    .nr-toggle {
      background: transparent; border: none;
      color: inherit; cursor: pointer;
      padding: 8px; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s ease, transform 0.25s ease;
      font-family: inherit;
    }
    .nr-toggle:hover { background: rgba(255,255,255,0.06); }
    html[data-theme="light"] .nr-toggle:hover { background: rgba(139,100,40,0.12); }
    .nr-toggle svg { width: 16px; height: 16px; transition: transform 0.25s ease; }
    .nr.expanded .nr-toggle svg { transform: rotate(180deg); }

    /* Mobile: rail collapses to top bar */
    @media (max-width: 640px) {
      body { padding-left: 0 !important; padding-top: 44px !important; }
      body.nr-expanded { padding-left: 0 !important; }
      .nr {
        width: 100%; height: 44px;
        flex-direction: row;
        top: 0; bottom: auto;
        padding: 4px 8px;
        border-right: none;
        border-bottom: 1px solid #313244;
      }
      .nr.expanded { width: 100%; }
      .nr-brand { border: none; padding: 0 8px 0 0; margin: 0; }
      .nr-brand .nr-brand-text { display: none; }
      .nr-items { flex-direction: row; overflow-x: auto; overflow-y: hidden; gap: 4px; }
      .nr-item { padding: 6px 10px; min-height: unset; }
      .nr-label { display: none; }
      .nr-item.active::before { left: 4px; right: 4px; top: auto; bottom: -4px; height: 2px; width: auto; border-radius: 2px 2px 0 0; }
      .nr-bottom { border: none; padding: 0 4px 0 0; flex-direction: row; }
      .nr:not(.expanded) .nr-item::after { display: none; }
    }
  `;
  document.head.appendChild(style);

  // ---- Build DOM ----
  const rail = document.createElement('nav');
  rail.className = 'nr';
  rail.setAttribute('aria-label', 'Tool navigation');

  // Brand
  const brand = document.createElement('div');
  brand.className = 'nr-brand';
  brand.innerHTML = `<span class="nr-logo">M</span><span class="nr-brand-text">MyoMT Suite</span>`;
  brand.title = 'Utilities.Tool';
  brand.onclick = () => location.href = 'index.html';
  rail.appendChild(brand);

  // Items
  const items = document.createElement('div');
  items.className = 'nr-items';
  TOOLS.forEach(t => {
    const a = document.createElement('a');
    a.className = 'nr-item';
    a.href = t.href;
    a.style.setProperty('--nr-color', t.color);
    a.dataset.tip = t.label;
    if (t.href.toLowerCase() === HERE) a.classList.add('active');
    const iconWrap = document.createElement('span');
    iconWrap.className = 'nr-icon';
    iconWrap.innerHTML = ICONS[t.icon] || '';
    const label = document.createElement('span');
    label.className = 'nr-label';
    label.textContent = t.label;
    a.append(iconWrap, label);
    items.appendChild(a);
  });
  rail.appendChild(items);

  // Bottom: expand/collapse toggle
  const bottom = document.createElement('div');
  bottom.className = 'nr-bottom';
  const toggle = document.createElement('button');
  toggle.className = 'nr-toggle';
  toggle.innerHTML = ICONS.chevron;
  toggle.title = 'Expand/collapse rail';
  toggle.onclick = () => setRail(!rail.classList.contains('expanded'));
  bottom.appendChild(toggle);
  rail.appendChild(bottom);

  document.body.insertBefore(rail, document.body.firstChild);

  // ---- Behavior ----
  const RAIL_KEY = 'utilities.navrail.expanded';
  function setRail(expanded) {
    rail.classList.toggle('expanded', expanded);
    document.body.classList.toggle('nr-expanded', expanded);
    localStorage.setItem(RAIL_KEY, expanded ? '1' : '0');
  }
  setRail(localStorage.getItem(RAIL_KEY) === '1');

  // Hover-expand behavior (delayed to avoid accidental triggers)
  let hoverTimer = null;
  rail.addEventListener('mouseenter', () => {
    if (rail.classList.contains('expanded')) return;
    if (window.innerWidth < 641) return;
    hoverTimer = setTimeout(() => {
      rail.classList.add('expanded');
      document.body.classList.add('nr-expanded');
    }, 350);
  });
  rail.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
    // Only auto-collapse if user hadn't manually pinned it
    if (localStorage.getItem(RAIL_KEY) !== '1' && window.innerWidth >= 641) {
      rail.classList.remove('expanded');
      document.body.classList.remove('nr-expanded');
    }
  });

  // Expose for external control
  window.NavRail = { setExpanded: setRail };
})();
