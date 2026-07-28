/* ============================================================
   _motion.js — lightweight interactive motion for all
   Utilities.Tool pages. Adds mouse-follow spotlight + 3D tilt
   to any element with data-motion="tilt", scroll-reveal for
   .m-reveal elements, and typewriter for .m-type.

   Load with: <script defer src="_motion.js"></script>
   No dependencies. Respects prefers-reduced-motion.
   ============================================================ */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 1. Mouse-follow tilt + spotlight -------------------------------
  // Any element with data-motion="tilt" gets 3D tilt on pointermove.
  // Spotlight CSS variables --mx / --my are updated for consumers.
  if (!reduced) {
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest('[data-motion="tilt"]');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rotX = (0.5 - py) * 6;
      const rotY = (px - 0.5) * 6;
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
      el.style.transform = `translateY(-4px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    });
    document.addEventListener('pointerleave', (e) => {
      const el = e.target.closest && e.target.closest('[data-motion="tilt"]');
      if (el) el.style.transform = '';
    }, true);
  }

  // ---- 2. Scroll-reveal --------------------------------------------------
  // Any element with .m-reveal fades in when scrolled into view.
  if (!reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('m-revealed');
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.m-reveal').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.m-reveal').forEach(el => el.classList.add('m-revealed'));
  }

  // ---- 3. Number count-up ------------------------------------------------
  // Any element with data-motion="count" and integer text content
  // counts up from 0 on load.
  const countUp = (el) => {
    const raw = el.textContent.trim();
    const num = parseInt(raw.replace(/[^\d]/g, ''), 10);
    if (isNaN(num) || num < 0 || num > 999999) return;
    if (reduced) return;
    const suffix = raw.replace(/^\d+/, '');
    const dur = Math.min(800, 200 + num * 4);
    const start = performance.now();
    el.textContent = '0' + suffix;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(num * eased) + suffix;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = num + suffix;
    };
    requestAnimationFrame(step);
  };
  document.querySelectorAll('[data-motion="count"]').forEach(countUp);

  // ---- 4. Typewriter ------------------------------------------------------
  // Element with .m-type reveals letter by letter on load.
  if (!reduced) {
    document.querySelectorAll('.m-type').forEach(el => {
      const text = el.textContent;
      el.textContent = '';
      const caret = document.createElement('span');
      caret.className = 'm-type-caret';
      caret.style.cssText = 'display:inline-block;width:3px;height:1em;background:var(--accent,#6366f1);margin-left:2px;vertical-align:text-bottom;animation:m-caret 1s steps(2) infinite;';
      el.appendChild(caret);
      let i = 0;
      const step = () => {
        if (i < text.length) {
          caret.insertAdjacentText('beforebegin', text[i]);
          i++;
          setTimeout(step, 35 + Math.random() * 40);
        } else {
          setTimeout(() => caret.remove(), 1200);
        }
      };
      setTimeout(step, 250);
    });
    // Inject caret keyframe once
    if (!document.getElementById('m-type-style')) {
      const s = document.createElement('style');
      s.id = 'm-type-style';
      s.textContent = '@keyframes m-caret { 50% { opacity: 0; } }';
      document.head.appendChild(s);
    }
  }

  // ---- 5. Reveal-on-load helper for .m-reveal already in viewport ---------
  document.querySelectorAll('.m-reveal').forEach((el) => {
    if (el.getBoundingClientRect().top < window.innerHeight) {
      requestAnimationFrame(() => el.classList.add('m-revealed'));
    }
  });

  // ---- 6. Ripple effect on every button click -----------------------------
  document.addEventListener('pointerdown', (e) => {
    if (reduced) return;
    const btn = e.target.closest('button, .btn, [role="button"]');
    if (!btn || btn.disabled) return;
    const rect = btn.getBoundingClientRect();
    // Ensure button can host the absolutely-positioned ripple
    const cs = getComputedStyle(btn);
    if (cs.position === 'static') btn.style.position = 'relative';
    const ripple = document.createElement('span');
    ripple.className = 'm-ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left) + 'px';
    ripple.style.top = (e.clientY - rect.top) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });

  // ---- 7. Global cursor spotlight -----------------------------------------
  // A soft radial glow that lags slightly behind the cursor.
  if (!reduced && matchMedia('(pointer: fine)').matches) {
    const glow = document.createElement('div');
    glow.id = 'm-cursor-glow';
    document.body.appendChild(glow);
    let tx = -500, ty = -500, cx = -500, cy = -500;
    let running = false;
    document.addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!glow.classList.contains('on')) glow.classList.add('on');
      if (!running) { running = true; requestAnimationFrame(loop); }
    });
    document.addEventListener('pointerleave', () => glow.classList.remove('on'));
    function loop() {
      // Ease toward the actual cursor for a smooth lag
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      glow.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      if (Math.abs(tx - cx) < 0.5 && Math.abs(ty - cy) < 0.5) { running = false; return; }
      requestAnimationFrame(loop);
    }
  }

  // ---- 8. Magnetic primary buttons ----------------------------------------
  // Primary buttons subtly follow the cursor on hover — premium touch.
  if (!reduced && matchMedia('(pointer: fine)').matches) {
    const magneticSelector = 'button.primary, .btn.primary, .btn-primary, button[type="submit"]';
    document.querySelectorAll(magneticSelector).forEach(btn => {
      btn.addEventListener('pointermove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - (rect.left + rect.width / 2);
        const y = e.clientY - (rect.top + rect.height / 2);
        const strength = 0.25;  // 0 = no pull, 0.5 = strong
        btn.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.transform = '';
      });
    });
  }

  // ---- 9. Scroll progress bar --------------------------------------------
  if (!reduced) {
    const bar = document.createElement('div');
    bar.id = 'm-scroll-bar';
    document.body.appendChild(bar);
    const updateScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      bar.style.setProperty('--sp', pct + '%');
    };
    document.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', updateScroll);
    updateScroll();
  }

  // ---- 10. Confetti burst ------------------------------------------------
  // Any button with data-motion="celebrate" (or .m-celebrate) fires confetti
  // on click. Also exposed as window.mConfetti(x, y) for programmatic use.
  const COLORS = ['#6366f1', '#a78bfa', '#22c55e', '#e3b341', '#ef4444', '#3b82f6', '#ec4899'];
  const confettiBurst = (x, y, count = 24) => {
    if (reduced) return;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'm-confetti-piece';
      p.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const velocity = 8 + Math.random() * 8;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity - 6;
      const rot = Math.random() * 720 - 360;
      p.animate([
        { transform: 'translate(0, 0) rotate(0)', opacity: 1 },
        { transform: `translate(${vx * 30}px, ${vy * 30 + 400}px) rotate(${rot}deg)`, opacity: 0 },
      ], {
        duration: 900 + Math.random() * 400,
        easing: 'cubic-bezier(.2,.5,.6,1)',
        fill: 'forwards',
      });
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1500);
    }
  };
  window.mConfetti = confettiBurst;
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-motion="celebrate"], .m-celebrate');
    if (!t) return;
    const rect = t.getBoundingClientRect();
    confettiBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  // ---- 11. Text scramble on hover ---------------------------------------
  // Elements with .m-scramble get a decoding effect when hovered.
  const CHARS = '!<>-_\\/[]{}—=+*^?#________';
  const scramble = (el) => {
    if (reduced) return;
    const original = el.dataset.originalText || el.textContent;
    el.dataset.originalText = original;
    const chars = original.split('');
    const duration = Math.min(600, chars.length * 30);
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const revealed = Math.floor(chars.length * t);
      const output = chars.map((c, i) => {
        if (i < revealed) return c;
        if (c === ' ') return ' ';
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join('');
      el.textContent = output;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = original;
    };
    requestAnimationFrame(step);
  };
  document.querySelectorAll('.m-scramble').forEach(el => {
    el.addEventListener('pointerenter', () => scramble(el));
  });
  window.mScramble = scramble;

  // ---- 12a. Film-grain overlay --------------------------------------------
  if (!reduced) {
    const grain = document.createElement('div');
    grain.id = 'm-grain';
    document.body.appendChild(grain);
  }

  // ---- 12b. Wave text — wrap each character in <span> ---------------------
  document.querySelectorAll('.m-wave-text').forEach(el => {
    if (el.dataset.waved) return;
    el.dataset.waved = '1';
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'm-char';
      span.style.setProperty('--i', i);
      span.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(span);
    });
  });

  // ---- 12c. Interactive dot-grid cursor tracking --------------------------
  if (!reduced) {
    document.querySelectorAll('.m-dots').forEach(container => {
      container.addEventListener('pointermove', (e) => {
        const rect = container.getBoundingClientRect();
        container.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
        container.style.setProperty('--my', (e.clientY - rect.top) + 'px');
      });
      container.addEventListener('pointerleave', () => {
        container.style.removeProperty('--mx');
        container.style.removeProperty('--my');
      });
    });
  }

  // ---- 12d. Auto fade-in on scroll for sections/panels --------------------
  // Any section/article/.panel not already animated gets a fade-up as it
  // enters the viewport. Opt-out with .m-no-fade or an existing animation.
  if (!reduced && 'IntersectionObserver' in window) {
    const autoFadeSel = 'section, article, .panel, [class*="section-"]';
    const els = document.querySelectorAll(autoFadeSel);
    els.forEach(el => {
      if (el.classList.contains('m-no-fade')) return;
      const cs = getComputedStyle(el);
      // Skip if the element already has its own animation (avoid conflicts)
      if (cs.animationName && cs.animationName !== 'none') return;
      el.classList.add('m-fade-target');
    });
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('m-in-view');
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => {
      if (el.classList.contains('m-fade-target')) io.observe(el);
    });
    // Immediately reveal anything already in viewport on load
    els.forEach(el => {
      if (el.classList.contains('m-fade-target') &&
          el.getBoundingClientRect().top < window.innerHeight) {
        requestAnimationFrame(() => el.classList.add('m-in-view'));
      }
    });
  }

  // ---- 12e. Motion level persistence (off / light / normal / high) --------
  const MOTION_LEVEL_KEY = 'motion.level';
  const setMotionLevel = (level) => {
    document.documentElement.dataset.motionLevel = level;
    localStorage.setItem(MOTION_LEVEL_KEY, level);
    document.dispatchEvent(new CustomEvent('motion-level-change', { detail: { level } }));
  };
  const currentLevel = () => localStorage.getItem(MOTION_LEVEL_KEY) || 'normal';
  setMotionLevel(currentLevel());

  // ---- 12f. Global page micro-parallax tilt --------------------------------
  if (!reduced && matchMedia('(pointer: fine)').matches && currentLevel() === 'normal') {
    document.documentElement.classList.add('m-tilt-page');
    let tX = 0, tY = 0, cX = 0, cY = 0;
    let running = false;
    document.addEventListener('pointermove', (e) => {
      // Map cursor position (0..1) to a small tilt (~1.2 deg max)
      tX = (0.5 - e.clientY / window.innerHeight) * 1.2;
      tY = (e.clientX / window.innerWidth - 0.5) * 1.2;
      if (!running) { running = true; requestAnimationFrame(loop); }
    });
    function loop() {
      cX += (tX - cX) * 0.08;
      cY += (tY - cY) * 0.08;
      document.documentElement.style.setProperty('--tilt-x', cX.toFixed(3) + 'deg');
      document.documentElement.style.setProperty('--tilt-y', cY.toFixed(3) + 'deg');
      if (Math.abs(tX - cX) < 0.02 && Math.abs(tY - cY) < 0.02) { running = false; return; }
      requestAnimationFrame(loop);
    }
  }

  // ---- 12g. Gradient trail --------------------------------------------------
  if (!reduced && matchMedia('(pointer: fine)').matches) {
    const trail = document.createElement('div');
    trail.id = 'm-trail';
    document.body.appendChild(trail);
    let tx = -200, ty = -200, cx = -200, cy = -200;
    let trailRunning = false;
    document.addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      trail.classList.add('on');
      if (!trailRunning) { trailRunning = true; requestAnimationFrame(trailLoop); }
    });
    document.addEventListener('pointerleave', () => trail.classList.remove('on'));
    function trailLoop() {
      cx += (tx - cx) * 0.35;
      cy += (ty - cy) * 0.35;
      trail.style.setProperty('--tx', cx + 'px');
      trail.style.setProperty('--ty', cy + 'px');
      if (Math.abs(tx - cx) < 0.5 && Math.abs(ty - cy) < 0.5) { trailRunning = false; return; }
      requestAnimationFrame(trailLoop);
    }
  }

  // ---- 12h. Word-by-word reveal on scroll ---------------------------------
  // Any element with .m-words gets its text split into per-word spans and
  // animated in as it enters the viewport.
  if (!reduced && 'IntersectionObserver' in window) {
    document.querySelectorAll('.m-words').forEach(el => {
      if (el.dataset.split) return;
      el.dataset.split = '1';
      const words = el.textContent.split(/(\s+)/);
      el.textContent = '';
      words.forEach(w => {
        if (/^\s+$/.test(w)) {
          el.appendChild(document.createTextNode(w));
          return;
        }
        const span = document.createElement('span');
        span.className = 'm-word';
        span.textContent = w;
        el.appendChild(span);
      });
    });
    const wordIo = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const spans = entry.target.querySelectorAll('.m-word');
          spans.forEach((span, i) => {
            setTimeout(() => span.classList.add('on'), i * 40);
          });
          wordIo.unobserve(entry.target);
        }
      }
    }, { threshold: 0.1 });
    document.querySelectorAll('.m-words').forEach(el => wordIo.observe(el));
  }

  // ---- 12i. Motion controls panel (Ctrl+Shift+M) --------------------------
  const buildControls = () => {
    if (document.getElementById('m-controls')) return document.getElementById('m-controls');
    const panel = document.createElement('div');
    panel.id = 'm-controls';
    panel.innerHTML = `
      <button class="close" title="Close (Esc)">✕</button>
      <h4>⚡ Motion settings</h4>
      <label><input type="radio" name="mlvl" value="normal"> Normal (default)</label>
      <label><input type="radio" name="mlvl" value="light"> Light (calm)</label>
      <label><input type="radio" name="mlvl" value="off"> Off (accessibility)</label>
      <div class="hint">Ctrl+Shift+M to reopen · saved across all tools</div>
    `;
    document.body.appendChild(panel);
    const lvl = currentLevel();
    panel.querySelector(`input[value="${lvl}"]`)?.setAttribute('checked', '');
    panel.querySelectorAll('input[name="mlvl"]').forEach(input => {
      input.addEventListener('change', () => setMotionLevel(input.value));
    });
    panel.querySelector('.close').addEventListener('click', () => panel.classList.remove('on'));
    return panel;
  };
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      const p = buildControls();
      p.classList.toggle('on');
    }
    if (e.key === 'Escape') {
      document.getElementById('m-controls')?.classList.remove('on');
    }
  });

  // ---- 12k. Lottie animation support --------------------------------------
  // Lazy-loads the @dotlottie/player-component web component ONLY if the page
  // contains at least one .m-lottie element. Then all .m-lottie elements
  // with data-src get filled with a dotlottie-player automatically.
  //
  // Usage in HTML:
  //   <div class="m-lottie sm" data-src="animations/checkmark.lottie"></div>
  //   <div class="m-lottie lg" data-src="https://lottie.host/..."></div>
  //
  // Programmatic:
  //   window.mLottie(container, srcUrl, { loop: true, autoplay: true });
  const LOTTIE_CDN = 'https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs';
  let lottieLoaded = null;
  function loadLottiePlayer() {
    if (lottieLoaded) return lottieLoaded;
    lottieLoaded = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${LOTTIE_CDN}"]`);
      if (existing) { existing.addEventListener('load', resolve, { once: true }); return; }
      const s = document.createElement('script');
      s.type = 'module';
      s.src = LOTTIE_CDN;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Lottie player failed to load'));
      document.head.appendChild(s);
    });
    return lottieLoaded;
  }
  function fillLottie(container, src, options = {}) {
    if (!src) return;
    container.innerHTML = '';
    const player = document.createElement('dotlottie-player');
    player.setAttribute('src', src);
    if (options.loop !== false) player.setAttribute('loop', '');
    if (options.autoplay !== false) player.setAttribute('autoplay', '');
    if (options.speed) player.setAttribute('speed', String(options.speed));
    if (options.background) player.setAttribute('background', options.background);
    container.appendChild(player);
  }
  window.mLottie = (container, src, options) => {
    loadLottiePlayer().then(() => fillLottie(container, src, options));
  };
  function hydrateLottie(el) {
    if (!el || el.dataset.hydrated === '1') return;
    el.dataset.hydrated = '1';
    fillLottie(el, el.dataset.src, {
      loop: el.dataset.loop !== 'false',
      autoplay: el.dataset.autoplay !== 'false',
      speed: el.dataset.speed ? parseFloat(el.dataset.speed) : undefined,
      background: el.dataset.background,
    });
  }
  function scanAndHydrateLottie() {
    const els = document.querySelectorAll('.m-lottie[data-src]:not([data-hydrated])');
    if (!els.length) return;
    loadLottiePlayer().then(() => els.forEach(hydrateLottie)).catch(() => {
      console.warn('Lottie player CDN unreachable. Falling back to placeholders.');
    });
  }
  scanAndHydrateLottie();
  // Catch dynamically-inserted .m-lottie elements (empty states, dialogs, etc.)
  if ('MutationObserver' in window) {
    const mo = new MutationObserver((records) => {
      let has = false;
      for (const rec of records) {
        for (const node of rec.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.('.m-lottie[data-src]:not([data-hydrated])') ||
              node.querySelector?.('.m-lottie[data-src]:not([data-hydrated])')) {
            has = true; break;
          }
        }
        if (has) break;
      }
      if (has) scanAndHydrateLottie();
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // ---- 12j. Konami code party mode 🎉 --------------------------------------
  // ↑↑↓↓←→←→BA — 10 seconds of pure chaos, then everything returns to normal.
  // A little easter egg. Show a friend, screenshot it, then forget it exists.
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let konamiIdx = 0;
  document.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === KONAMI[konamiIdx]) {
      konamiIdx++;
      if (konamiIdx === KONAMI.length) {
        konamiIdx = 0;
        partyMode();
      }
    } else {
      konamiIdx = key === KONAMI[0] ? 1 : 0;
    }
  });
  function partyMode() {
    if (document.documentElement.classList.contains('m-party')) return;  // already partying
    document.documentElement.classList.add('m-party');
    // Toast
    const toast = document.createElement('div');
    toast.id = 'm-party-toast';
    toast.textContent = '🎉 PARTY MODE UNLOCKED — 10 seconds of chaos';
    document.body.appendChild(toast);
    // Confetti bursts every 800ms from random positions
    const burstInterval = setInterval(() => {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight * 0.6;
      if (window.mConfetti) window.mConfetti(x, y, 30);
    }, 700);
    // Big initial burst from center
    if (window.mConfetti) {
      window.mConfetti(window.innerWidth / 2, window.innerHeight / 2, 80);
    }
    // End after 10s
    setTimeout(() => {
      document.documentElement.classList.remove('m-party');
      toast.remove();
      clearInterval(burstInterval);
    }, 10000);
  }

  // ---- 13. Emoji pop on click (☆, ★, 👍, ❤, etc.) ------------------------
  // Any button whose text contains a heart/star emoji gets a floating pop
  // when clicked. Purely delightful.
  const POP_EMOJI = /[★☆♥❤👍✨🎉🚀💡]/;
  document.addEventListener('click', (e) => {
    if (reduced) return;
    const btn = e.target.closest('button, [role="button"]');
    if (!btn) return;
    const match = (btn.textContent || '').match(POP_EMOJI);
    if (!match) return;
    const rect = btn.getBoundingClientRect();
    const pop = document.createElement('span');
    pop.textContent = match[0];
    pop.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.top + rect.height / 2}px;
      transform: translate(-50%, -50%);
      font-size: 24px;
      z-index: 10002;
      pointer-events: none;
    `;
    document.body.appendChild(pop);
    pop.animate([
      { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0.9 },
      { transform: 'translate(-50%, -180%) scale(1.6)', opacity: 0 },
    ], { duration: 700, easing: 'cubic-bezier(.2,.7,.3,1)' });
    setTimeout(() => pop.remove(), 750);
  });
})();
