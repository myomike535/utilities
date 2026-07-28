// Shared UI polish — Kimi-style button refinements, click ripples, focus rings
// Loaded on every page after _navrail.js
(function () {
  'use strict';
  if (window.top !== window) return;

  const style = document.createElement('style');
  style.textContent = `
    /* ── Kimi-style button base for common patterns ──
       Applies subtle, non-invasive refinement: smoother transitions,
       hover lift, active press, keyboard focus ring. Won't override
       colors — respects each tool's palette. */
    button, .btn, .icon-btn, .action-btn, .filter-btn,
    .fmt-btn, .cat-pill, .source-tab, .kb-card, .tool-card,
    input[type="button"], input[type="submit"] {
      transition:
        transform 0.18s cubic-bezier(.34,1.4,.64,1),
        box-shadow 0.22s ease,
        background-color 0.18s ease,
        border-color 0.18s ease,
        color 0.15s ease !important;
      position: relative;
    }

    /* Subtle lift on hover for clickable buttons — skip destructive ones */
    button:not(:disabled):not(.busy):hover,
    .btn:not(:disabled):hover,
    .icon-btn:not(:disabled):hover,
    .action-btn:not(:disabled):not(.busy):hover,
    .filter-btn:not(:disabled):hover,
    input[type="button"]:not(:disabled):hover,
    input[type="submit"]:not(:disabled):hover {
      transform: translateY(-1px);
    }

    /* Press feedback */
    button:not(:disabled):active,
    .btn:not(:disabled):active,
    .icon-btn:not(:disabled):active,
    .action-btn:not(:disabled):active,
    .filter-btn:not(:disabled):active,
    input[type="button"]:not(:disabled):active,
    input[type="submit"]:not(:disabled):active {
      transform: translateY(0) scale(0.96);
      transition-duration: 0.08s;
    }

    /* Focus-visible ring (keyboard nav only, not on mouse click) */
    button:focus-visible,
    .btn:focus-visible,
    .icon-btn:focus-visible,
    .action-btn:focus-visible,
    .filter-btn:focus-visible,
    a.tool-card:focus-visible,
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible {
      outline: 2px solid rgba(139,92,246,0.65);
      outline-offset: 2px;
    }

    /* Disabled state is unified */
    button:disabled, .btn:disabled, .icon-btn:disabled,
    .action-btn:disabled, .filter-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
    }

    /* Ripple effect on click — pure CSS via pseudo-element */
    button.ui-ripple, .btn.ui-ripple, .icon-btn.ui-ripple,
    .action-btn.ui-ripple, .filter-btn.ui-ripple {
      overflow: hidden;
    }
    button.ui-ripple::after, .btn.ui-ripple::after, .icon-btn.ui-ripple::after,
    .action-btn.ui-ripple::after, .filter-btn.ui-ripple::after {
      content: '';
      position: absolute;
      top: var(--ry, 50%); left: var(--rx, 50%);
      width: 8px; height: 8px;
      background: currentColor;
      opacity: 0;
      border-radius: 50%;
      transform: translate(-50%, -50%) scale(0);
      pointer-events: none;
      transition: none;
    }
    button.ui-ripple.rippling::after, .btn.ui-ripple.rippling::after,
    .icon-btn.ui-ripple.rippling::after, .action-btn.ui-ripple.rippling::after,
    .filter-btn.ui-ripple.rippling::after {
      animation: ui-ripple 0.55s ease-out;
    }
    @keyframes ui-ripple {
      from { transform: translate(-50%, -50%) scale(0); opacity: 0.35; }
      to   { transform: translate(-50%, -50%) scale(30); opacity: 0; }
    }

    /* Text selection color — matches the accent globally */
    ::selection {
      background: rgba(139,92,246,0.35);
      color: inherit;
    }

    /* Scrollbar polish (WebKit-based browsers) */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb {
      background: rgba(148,163,184,0.35);
      border-radius: 4px;
      transition: background 0.15s;
    }
    ::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.6); }
  `;
  document.head.appendChild(style);

  // Attach ripple class + click handler to eligible buttons
  const RIPPLE_SELECTOR = 'button, .btn, .icon-btn, .action-btn, .filter-btn';
  function attachRipples(root) {
    root.querySelectorAll(RIPPLE_SELECTOR).forEach(el => {
      if (el.classList.contains('ui-ripple')) return;
      // Skip nav-rail rail items — they have their own tooltip pseudo-element
      if (el.closest('.nr')) return;
      // Skip anchor-like buttons that don't want ripples (chevrons in dropdowns, etc.)
      if (el.dataset.noRipple != null) return;
      el.classList.add('ui-ripple');
      el.addEventListener('click', onRippleClick);
    });
  }
  function onRippleClick(e) {
    const el = e.currentTarget;
    if (el.disabled) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--rx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--ry', `${e.clientY - rect.top}px`);
    el.classList.remove('rippling');
    // Force reflow so the animation can retrigger
    void el.offsetWidth;
    el.classList.add('rippling');
    setTimeout(() => el.classList.remove('rippling'), 600);
  }

  // Initial attach + observer for dynamically added buttons
  attachRipples(document);
  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      m.addedNodes.forEach(n => {
        if (n.nodeType === 1) attachRipples(n);
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();
