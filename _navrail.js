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

    /* ═══════════════ MOBILE: Kimi-style bottom nav + optional drawer ═══════════════ */
    @media (max-width: 640px) {
      /* Give content bottom breathing room for the fixed bottom nav */
      body { padding-left: 0 !important; padding-top: 0 !important; padding-bottom: 64px !important; }
      body.nr-expanded { padding-left: 0 !important; padding-top: 0 !important; padding-bottom: 64px !important; }

      /* Hide the desktop hamburger button — drawer opens via bottom nav "More" */
      .nr-mobile-hamburger { display: none !important; }

      /* Bottom navigation bar — 5 quick-access tools */
      .nr-bottom-nav {
        display: flex !important;
        position: fixed;
        bottom: 0; left: 0; right: 0;
        height: 60px;
        background: rgba(30,30,46,0.92);
        border-top: 1px solid #3b3b54;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        z-index: 810;
        padding: 6px 4px;
        box-shadow: 0 -4px 16px rgba(0,0,0,0.2);
      }
      html[data-theme="light"] .nr-bottom-nav {
        background: rgba(245,226,180,0.94); border-top-color: #d3c0a3;
      }
      .nr-bn-item {
        flex: 1;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 2px;
        color: #6c7086;
        text-decoration: none;
        font-size: 0.66rem;
        font-weight: 500;
        padding: 4px 2px;
        border-radius: 10px;
        transition: color 0.15s ease, background 0.15s ease;
        cursor: pointer;
        background: transparent;
        border: none;
        font-family: inherit;
        min-height: 48px;
      }
      html[data-theme="light"] .nr-bn-item { color: #998573; }
      .nr-bn-item:active { background: rgba(139,92,246,0.12); }
      .nr-bn-item.active {
        color: var(--nr-bn-color, #a78bfa);
      }
      .nr-bn-item .nr-bn-icon {
        width: 22px; height: 22px;
        display: inline-flex; align-items: center; justify-content: center;
        transition: transform 0.2s cubic-bezier(.34,1.56,.64,1);
      }
      .nr-bn-item:active .nr-bn-icon { transform: scale(0.9); }
      .nr-bn-item.active .nr-bn-icon { transform: scale(1.1); }
      .nr-bn-icon svg {
        width: 100%; height: 100%;
        fill: none; stroke: currentColor;
        stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round;
      }
      .nr-bn-label {
        white-space: nowrap;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1;
      }
      /* Active pill accent — thin dot under active item */
      .nr-bn-item.active::before {
        content: '';
        position: absolute;
        top: 3px;
        width: 24px; height: 3px;
        background: var(--nr-bn-color, #a78bfa);
        border-radius: 0 0 3px 3px;
      }

      /* Backdrop for full drawer (opened via More) */
      .nr-mobile-backdrop {
        display: block !important;
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.5);
        z-index: 815;
        opacity: 0; pointer-events: none;
        transition: opacity 0.2s ease;
      }
      .nr-mobile-backdrop.show { opacity: 1; pointer-events: auto; }

      /* Full drawer: slides up as bottom sheet on mobile */
      .nr {
        width: 100% !important;
        height: auto !important;
        max-height: 75vh !important;
        flex-direction: column !important;
        top: auto !important; left: 0; right: 0; bottom: 0;
        padding: 20px 14px 80px !important;
        border-right: none;
        border-top: 1px solid #3b3b54;
        border-radius: 20px 20px 0 0;
        transform: translateY(100%);
        transition: transform 0.32s cubic-bezier(.4,0,.2,1);
        z-index: 816;
        box-shadow: 0 -8px 30px rgba(0,0,0,0.35);
      }
      html[data-theme="light"] .nr {
        border-top-color: #d3c0a3;
      }
      .nr.mobile-open {
        transform: translateY(0);
      }
      /* Drag-handle at top of bottom sheet */
      .nr::before {
        content: '';
        position: absolute;
        top: 6px; left: 50%; transform: translateX(-50%);
        width: 40px; height: 4px;
        background: rgba(255,255,255,0.2);
        border-radius: 2px;
      }
      html[data-theme="light"] .nr::before { background: rgba(139,100,40,0.3); }

      .nr .nr-brand-text { display: inline !important; }
      .nr .nr-label { opacity: 1 !important; display: inline !important; }
      .nr .rail-toggle .lbl, .nr .rail-newsession .lbl { display: inline !important; }
      .nr .sessions-list li .s-body { display: block !important; }
      .nr-bottom .nr-toggle { display: none; }
      .nr-brand { padding: 8px 8px 12px !important; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 8px; }
      html[data-theme="light"] .nr-brand { border-bottom-color: rgba(139,100,40,0.15); }

      .nr-items { flex-direction: column !important; overflow-y: auto !important; gap: 2px !important; }
      .nr-item { padding: 14px 12px !important; min-height: 48px !important; font-size: 0.95rem; }
      .nr-item.active::before { left: -12px; top: 8px; bottom: 8px; height: auto; width: 3px; border-radius: 0 3px 3px 0; }
      .nr:not(.expanded) .nr-item::after { display: none !important; }
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

  // ---- Mobile: bottom nav bar + full drawer (as bottom sheet) ----
  const hamburger = document.createElement('button');
  hamburger.className = 'nr-mobile-hamburger';
  hamburger.setAttribute('aria-label', 'Open navigation');
  hamburger.innerHTML = '<svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  hamburger.style.display = 'none';
  document.body.appendChild(hamburger);

  const backdrop = document.createElement('div');
  backdrop.className = 'nr-mobile-backdrop';
  backdrop.style.display = 'none';
  document.body.appendChild(backdrop);

  // Bottom nav bar — 4 top tools + More button (Kimi mobile pattern)
  const bottomNavTools = [
    { href: 'index.html',           icon: 'dashboard', label: 'Home',   color: '#a78bfa' },
    { href: 'ToDo.html',            icon: 'tasks',     label: 'Tasks',  color: '#6366f1' },
    { href: 'AINoteTaker.html',     icon: 'mic',       label: 'Notes',  color: '#a78bfa' },
    { href: 'PasswordManager.html', icon: 'shield',    label: 'Vault',  color: '#22c55e' },
  ];
  const bottomNav = document.createElement('nav');
  bottomNav.className = 'nr-bottom-nav';
  bottomNav.setAttribute('aria-label', 'Bottom navigation');
  bottomNavTools.forEach(t => {
    const a = document.createElement('a');
    a.className = 'nr-bn-item';
    a.href = t.href;
    a.style.setProperty('--nr-bn-color', t.color);
    a.style.position = 'relative';
    if (t.href.toLowerCase() === HERE) a.classList.add('active');
    const iconWrap = document.createElement('span');
    iconWrap.className = 'nr-bn-icon';
    iconWrap.innerHTML = ICONS[t.icon] || '';
    const label = document.createElement('span');
    label.className = 'nr-bn-label';
    label.textContent = t.label;
    a.append(iconWrap, label);
    bottomNav.appendChild(a);
  });
  // "More" button that opens the drawer
  const moreBtn = document.createElement('button');
  moreBtn.className = 'nr-bn-item';
  moreBtn.style.setProperty('--nr-bn-color', '#f472b6');
  moreBtn.style.position = 'relative';
  moreBtn.setAttribute('aria-label', 'More tools');
  const moreIcon = document.createElement('span');
  moreIcon.className = 'nr-bn-icon';
  moreIcon.innerHTML = '<svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  const moreLabel = document.createElement('span');
  moreLabel.className = 'nr-bn-label';
  moreLabel.textContent = 'More';
  moreBtn.append(moreIcon, moreLabel);
  bottomNav.appendChild(moreBtn);
  document.body.appendChild(bottomNav);

  // If the current page isn't in the bottom-nav quick list, mark "More" as active
  if (!bottomNavTools.some(t => t.href.toLowerCase() === HERE)) {
    moreBtn.classList.add('active');
  }

  function openMobileNav() {
    rail.classList.add('mobile-open');
    backdrop.classList.add('show');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-label', 'Close navigation');
  }
  function closeMobileNav() {
    rail.classList.remove('mobile-open');
    backdrop.classList.remove('show');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-label', 'Open navigation');
  }
  function toggleMobileNav() {
    rail.classList.contains('mobile-open') ? closeMobileNav() : openMobileNav();
  }
  moreBtn.addEventListener('click', openMobileNav);
  hamburger.addEventListener('click', toggleMobileNav);
  backdrop.addEventListener('click', closeMobileNav);
  // Close drawer when a nav item is tapped
  rail.addEventListener('click', (e) => {
    if (e.target.closest('.nr-item') && window.innerWidth <= 640) {
      closeMobileNav();
    }
  });
  // Escape key closes drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && rail.classList.contains('mobile-open')) closeMobileNav();
  });
  // Swipe-down on drawer closes it
  let touchStartY = 0;
  rail.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
  rail.addEventListener('touchmove', (e) => {
    const dy = e.touches[0].clientY - touchStartY;
    if (dy > 60 && rail.scrollTop === 0) closeMobileNav();
  }, { passive: true });

  function openMobileNav() {
    rail.classList.add('mobile-open');
    backdrop.classList.add('show');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-label', 'Close navigation');
  }
  function closeMobileNav() {
    rail.classList.remove('mobile-open');
    backdrop.classList.remove('show');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-label', 'Open navigation');
  }
  function toggleMobileNav() {
    rail.classList.contains('mobile-open') ? closeMobileNav() : openMobileNav();
  }
  hamburger.addEventListener('click', toggleMobileNav);
  backdrop.addEventListener('click', closeMobileNav);
  // Close drawer when a nav item is tapped
  rail.addEventListener('click', (e) => {
    if (e.target.closest('.nr-item') && window.innerWidth <= 640) {
      closeMobileNav();
    }
  });
  // Escape key closes drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && rail.classList.contains('mobile-open')) closeMobileNav();
  });

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
