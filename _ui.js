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

    /* ═══════════════ MOBILE FIXES (≤640px) ═══════════════ */
    @media (max-width: 640px) {
      /* Prevent iOS auto-zoom on input focus (font <16px triggers it) */
      input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
      textarea, select {
        font-size: 16px !important;
      }

      /* Common app containers — full width, smaller padding, kill margins */
      .app, .container, .wrap {
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 !important;
      }
      .app { padding: 14px 12px 20px !important; border-radius: 10px !important; }
      .container { padding: 0 !important; }
      .wrap { flex-direction: column !important; gap: 10px !important; }

      /* Dashboard tool card grid — single column on phones */
      .tools {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
      .tool-card { padding: 16px !important; }
      .tool-card .title { font-size: 1.05rem !important; }
      .tool-card .desc { font-size: 0.82rem !important; }

      /* Headers — allow wrap, keep actions accessible */
      header {
        flex-wrap: wrap !important;
        gap: 8px !important;
      }
      header h1 { font-size: 1.3rem !important; }
      header .greet-wave { width: 40px !important; height: 40px !important; font-size: 30px !important; line-height: 40px !important; }
      .header-actions {
        flex-wrap: wrap !important;
        gap: 4px !important;
      }
      .icon-btn {
        width: 32px !important;
        height: 32px !important;
        font-size: 0.85rem !important;
      }

      /* Action bars / filters / toolbars — wrap gracefully */
      .actions-bar, .filters, .toolbar, .mic-bar,
      .action-row, .source-tabs, .options-grid, .meta-row {
        flex-wrap: wrap !important;
        gap: 6px !important;
      }
      .options-grid { grid-template-columns: 1fr 1fr !important; }
      .action-btn, .btn-action, .filter-btn, .btn, .btn-primary, .btn-secondary {
        font-size: 0.8rem !important;
        padding: 7px 10px !important;
      }

      /* Kanban board — stack columns */
      #kanbanBoard {
        grid-template-columns: 1fr !important;
        max-height: none !important;
        padding: 0 12px 12px !important;
      }
      .kb-col { max-height: 260px !important; }

      /* Split panes (SQL Formatter, Meeting Mode) — stack */
      .panes, .mm-panes {
        grid-template-columns: 1fr !important;
      }
      .pane { min-height: 220px !important; }
      .mm-pane { max-height: 45vh !important; border-right: none !important; border-bottom: 1px solid var(--border-soft, #313244); }

      /* Modals — full-width with breathing room */
      .modal, .st-modal, .api-modal, .mm-shell {
        max-width: calc(100vw - 20px) !important;
        width: calc(100vw - 20px) !important;
        padding: 16px !important;
        max-height: 88vh !important;
        overflow-y: auto !important;
      }
      .mm-shell { inset: 8px !important; border-radius: 10px !important; }
      .mm-header { padding: 10px 14px !important; }
      .mm-transcript { padding: 12px 16px !important; font-size: 1rem !important; }
      .mm-insights-body { padding: 10px 14px !important; }
      .modal-backdrop { padding: 20px 8px !important; }

      /* Command palette — bigger touch targets */
      .cp-modal { max-width: calc(100vw - 20px) !important; }
      .cp-item { padding: 12px 14px !important; }

      /* Nav rail — already becomes top horizontal bar (in _navrail.js).
         Kick tool bodies down more if needed for tools with fixed headers. */
      body { padding-top: 48px !important; padding-left: 6px !important; padding-right: 6px !important; }

      /* Floating helper buttons — avoid overlap with nav rail bottom */
      .st-gear { left: 10px !important; bottom: 10px !important; width: 40px !important; height: 40px !important; }
      body.nr-expanded .st-gear { left: 10px !important; }
      .pwa-install-btn { right: 10px !important; bottom: 10px !important; }

      /* AI Note Taker classic — sidebars stack */
      .side-panel.side-left { width: 100% !important; max-height: none !important; }
      .side-panel.side-left:not(.expanded) { width: 100% !important; }
      .side-panel.side-left .sessions-list li .s-body { display: block !important; }

      /* Password Manager — cards + tabs */
      .tabs { flex-wrap: wrap !important; gap: 4px !important; }
      .tab { flex: 1 1 auto !important; min-width: 90px !important; font-size: 0.75rem !important; padding: 6px 8px !important; }
      .card { padding: 12px !important; }
      .card-head { gap: 6px !important; flex-wrap: wrap !important; }
      .card-head .title { font-size: 0.95rem !important; }
      .card-head .badge { font-size: 0.65rem !important; padding: 1px 5px !important; }

      /* Textareas / transcripts — reasonable min heights */
      .transcript, .input-area textarea, .editor, .output, .script-section textarea {
        min-height: 140px !important;
        max-height: 45vh !important;
      }

      /* Insights + attachments grid */
      .insights-inline { gap: 10px !important; }
      .insight-section { padding: 12px 14px !important; }
      .att-list { grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)) !important; }

      /* Debate grid — stack */
      .debate-grid { grid-template-columns: 1fr !important; }

      /* Hint bars — tighter */
      .hint { font-size: 0.7rem !important; }
    }

    /* Tiny phones (≤360px) — even tighter */
    @media (max-width: 360px) {
      .app { padding: 10px 8px 16px !important; }
      header h1 { font-size: 1.15rem !important; }
      .options-grid { grid-template-columns: 1fr !important; }
      .icon-btn { width: 30px !important; height: 30px !important; }
    }

    /* Landscape phone / small tablet edge case — restore some breathing room */
    @media (max-width: 900px) and (min-width: 641px) {
      .tools { grid-template-columns: 1fr 1fr !important; }
      .mm-panes { grid-template-columns: 1fr !important; }
    }
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
