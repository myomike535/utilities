// Shared Myanmar Buddhist art — inline SVG ornaments, offline, theme-aware.
// Injects a header ornament + a subtle corner watermark, chosen per page.
// Include on Dhamma pages: <script defer src="_dhammaart.js"></script>
(function () {
  'use strict';
  if (window.top !== window) return;

  const PAGE = location.pathname.split('/').pop().toLowerCase();

  // ---- SVG art library (all currentColor, scalable) ----
  const ART = {
    // Dhammacakka — 8-spoke Wheel of Dhamma
    wheel: `<svg viewBox="0 0 100 100"><g fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="38"/><circle cx="50" cy="50" r="10"/>
      <g stroke-width="2.4">
      <line x1="50" y1="12" x2="50" y2="88"/><line x1="12" y1="50" x2="88" y2="50"/>
      <line x1="23" y1="23" x2="77" y2="77"/><line x1="77" y1="23" x2="23" y2="77"/>
      <line x1="50" y1="12" x2="50" y2="88" transform="rotate(22.5 50 50)"/>
      <line x1="12" y1="50" x2="88" y2="50" transform="rotate(22.5 50 50)"/>
      <line x1="23" y1="23" x2="77" y2="77" transform="rotate(22.5 50 50)"/>
      <line x1="77" y1="23" x2="23" y2="77" transform="rotate(22.5 50 50)"/></g>
      <circle cx="50" cy="50" r="4" fill="currentColor"/></g></svg>`,

    // Bodhi leaf (heart-shaped with drip-tip + veins)
    bodhi: `<svg viewBox="0 0 100 110"><g fill="currentColor">
      <path d="M50 6 C22 24 8 46 8 66 C8 88 30 100 50 104 C70 100 92 88 92 66 C92 46 78 24 50 6 Z" opacity="0.9"/>
      </g><g fill="none" stroke="var(--paper,#fbeed0)" stroke-width="1.4" opacity="0.5">
      <path d="M50 14 L50 104"/><path d="M50 40 Q34 46 22 62"/><path d="M50 40 Q66 46 78 62"/>
      <path d="M50 62 Q36 68 26 82"/><path d="M50 62 Q64 68 74 82"/></g></svg>`,

    // Lotus (multi-petal seated bloom)
    lotus: `<svg viewBox="0 0 120 70"><g fill="currentColor">
      <path d="M60 62 q-4 -30 0 -42 q4 12 0 42 z"/>
      <path d="M60 62 q-16 -24 -20 -34 q14 4 20 34 z"/><path d="M60 62 q16 -24 20 -34 q-14 4 -20 34 z"/>
      <path d="M60 62 q-30 -14 -40 -18 q18 -2 40 18 z"/><path d="M60 62 q30 -14 40 -18 q-18 -2 -40 18 z"/>
      <path d="M60 62 q-24 -6 -44 -2 q20 -8 44 2 z" opacity="0.7"/><path d="M60 62 q24 -6 44 -2 q-20 -8 -44 2 z" opacity="0.7"/>
      <ellipse cx="60" cy="63" rx="44" ry="4" opacity="0.35"/></g></svg>`,

    // Myanmar pagoda / stupa (Shwedagon-style bell + hti)
    pagoda: `<svg viewBox="0 0 100 130"><g fill="currentColor">
      <path d="M50 4 l3 10 -3 3 -3 -3 z"/><rect x="48" y="16" width="4" height="8"/>
      <path d="M42 26 h16 l-2 8 h-12 z"/><path d="M40 36 q10 -6 20 0 l-3 10 h-14 z"/>
      <path d="M36 48 q14 -8 28 0 l-4 14 h-20 z"/>
      <path d="M30 64 q20 -10 40 0 l-5 22 h-30 z"/>
      <path d="M24 88 q26 -8 52 0 l0 8 h-52 z"/>
      <rect x="20" y="98" width="60" height="6"/><rect x="16" y="106" width="68" height="8"/></g></svg>`,

    // Kanote — Myanmar foliate scroll (decorative border unit)
    kanote: `<svg viewBox="0 0 200 40"><g fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10 20 q20 -18 40 0 q20 18 40 0 q20 -18 40 0 q20 18 40 0 q10 -9 20 0"/>
      <path d="M50 20 q-6 -10 -14 -8 q6 4 6 12" stroke-width="1.5"/>
      <path d="M130 20 q6 -10 14 -8 q-6 4 -6 12" stroke-width="1.5"/></g></svg>`,

    // Seated Buddha silhouette
    buddha: `<svg viewBox="0 0 120 130"><g fill="currentColor">
      <path d="M60 6 q3 6 0 11 q-3 -5 0 -11 z"/><circle cx="60" cy="26" r="11"/>
      <path d="M52 35 q8 6 16 0 l6 6 q10 8 12 24 q1 10 -2 20 l-4 14 q-24 8 -48 0 l-4 -14 q-3 -10 -2 -20 q2 -16 12 -24 z"/>
      <path d="M28 92 q32 16 64 0 q4 8 2 16 q-34 12 -68 0 q-2 -8 2 -16 z"/>
      <ellipse cx="60" cy="96" rx="12" ry="5" opacity="0.55"/></g></svg>`,

    // Elephant (Vessantara / Jataka motif)
    elephant: `<svg viewBox="0 0 130 100"><g fill="currentColor">
      <ellipse cx="70" cy="55" rx="38" ry="26"/>
      <circle cx="34" cy="46" r="20"/>
      <path d="M20 52 q-10 14 -4 30 q6 -4 8 -14 q4 8 2 18 q8 -2 6 -16 q2 -20 -12 -18 z"/>
      <path d="M22 40 q-12 -6 -18 -2 q6 6 18 6 z" opacity="0.8"/>
      <rect x="52" y="76" width="8" height="18" rx="3"/><rect x="70" y="78" width="8" height="16" rx="3"/>
      <rect x="88" y="76" width="8" height="18" rx="3"/>
      <path d="M24 40 q-2 -8 4 -10" fill="none" stroke="var(--paper,#fbeed0)" stroke-width="1.5"/></g></svg>`,
  };

  // ---- Per-page composition ----
  // header ornament (top), left corner + right corner watermarks
  const PAGES = {
    'dhammapada.html': { header: 'wheel',  left: 'bodhi',    right: 'lotus'  },
    'jataka550.html':  { header: 'lotus',  left: 'elephant', right: 'bodhi'  },
    'tipitaka.html':   { header: 'wheel',  left: 'pagoda',   right: 'lotus'  },
  };
  const cfg = PAGES[PAGE];
  if (!cfg) return;

  // ---- Styles ----
  const style = document.createElement('style');
  style.textContent = `
    .da-watermark {
      position: fixed; pointer-events: none; z-index: 0;
      color: var(--accent-2, #8b6f47);
      opacity: 0.06;
      width: 40vmin; max-width: 340px;
    }
    html[data-theme="royal"] .da-watermark { color: var(--gold, #ffd76a); opacity: 0.08; }
    html[data-theme="dark"] .da-watermark { opacity: 0.05; }
    .da-watermark.left  { left: -6vmin; bottom: -4vmin; }
    .da-watermark.right { right: -6vmin; top: 10vmin; transform: scaleX(-1); }
    .da-watermark svg { width: 100%; height: auto; display: block; }

    /* Header ornament: fixed-size, sits inline beside the title — never stretches/pushes text */
    .da-header-ornament {
      width: 38px; height: 38px; flex: 0 0 38px;
      color: var(--accent, #c62d2d);
      opacity: 0.85;
      align-self: center;
      margin-right: 4px;
    }
    .da-header-ornament svg { width: 100%; height: 100%; display: block; }
    .da-header-ornament.spin svg { animation: daSpin 60s linear infinite; }
    @keyframes daSpin { to { transform: rotate(360deg); } }
    @media (max-width: 640px) { .da-header-ornament { width: 30px; height: 30px; flex-basis: 30px; } }

    /* Keep page content above watermarks (watermarks are z-index 0) */
    .app { position: relative; z-index: 1; }
  `;
  document.head.appendChild(style);

  function mount() {
    // Corner watermarks on body
    const mk = (motif, cls) => {
      const d = document.createElement('div');
      d.className = 'da-watermark ' + cls;
      d.setAttribute('aria-hidden', 'true');
      d.innerHTML = ART[motif] || '';
      document.body.appendChild(d);
    };
    mk(cfg.left, 'left');
    mk(cfg.right, 'right');

    // Header ornament — sits as the FIRST child of the header row (beside the title),
    // fixed size, so it never stretches or pushes the title text.
    const hdr = document.querySelector('.app header, header');
    if (hdr && getComputedStyle(hdr).display.includes('flex')) {
      const orn = document.createElement('span');
      orn.className = 'da-header-ornament' + (cfg.header === 'wheel' ? ' spin' : '');
      orn.setAttribute('aria-hidden', 'true');
      orn.innerHTML = ART[cfg.header] || '';
      hdr.insertBefore(orn, hdr.firstChild);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
