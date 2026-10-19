/* _wakelock.js — floating "keep screen awake" toggle for reading tools.
   Reading/recitation sessions have no tap activity, so the screen sleeps.
   This injects a small corner toggle that holds a Screen Wake Lock while on,
   persists the choice, and re-acquires it when the tab regains focus.
   Self-contained; include with <script defer src="_wakelock.js"></script>.
   Hides itself if the Wake Lock API is unavailable (nothing to offer). */
(function () {
  'use strict';
  if (!('wakeLock' in navigator)) return; // unsupported — don't show a dead button

  var KEY = 'readwake.on';
  var sentinel = null;
  var btn;

  function isOn() { return localStorage.getItem(KEY) === '1'; }
  function setPref(on) { try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {} }

  async function acquire() {
    try {
      if (!sentinel) {
        sentinel = await navigator.wakeLock.request('screen');
        sentinel.addEventListener('release', function () { sentinel = null; });
      }
    } catch (e) { /* denied (e.g. low battery) — leave visual state, retry on next focus */ }
  }
  async function release() {
    try { if (sentinel) { await sentinel.release(); sentinel = null; } } catch (e) {}
  }

  function render() {
    var on = isOn();
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('on', on);
    btn.innerHTML = on
      ? '<span style="font-size:1rem">☀️</span><span>Screen ဖွင့်ထား</span>'
      : '<span style="font-size:1rem;opacity:.7">🌙</span><span>ဖတ်နေစဉ် မအိပ်</span>';
  }

  async function toggle() {
    var next = !isOn();
    setPref(next);
    render();
    if (next) await acquire(); else await release();
  }

  function mount() {
    var style = document.createElement('style');
    style.textContent =
      '#wake-toggle{position:fixed;right:16px;bottom:18px;z-index:700;display:flex;align-items:center;gap:7px;' +
      'padding:8px 13px;border-radius:999px;cursor:pointer;font-size:0.76rem;font-weight:600;' +
      'font-family:var(--sans,"Pyidaungsu","Padauk",system-ui,sans-serif);' +
      'color:var(--ink-dim,#555);background:var(--paper-2,rgba(255,255,255,0.9));' +
      'border:1px solid var(--border,rgba(0,0,0,0.15));box-shadow:0 4px 14px rgba(0,0,0,0.18);' +
      'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transition:all .15s ease;user-select:none;}' +
      '#wake-toggle:hover{border-color:var(--accent,#c62d2d);}' +
      '#wake-toggle.on{color:#fff;background:var(--accent,#c62d2d);border-color:var(--accent,#c62d2d);}' +
      '@media (max-width:640px){#wake-toggle{bottom:74px;right:12px;padding:7px 11px;font-size:0.72rem;}}';
    document.head.appendChild(style);

    btn = document.createElement('button');
    btn.id = 'wake-toggle';
    btn.type = 'button';
    btn.title = 'ဖတ်နေစဉ် မျက်နှာပြင် အိပ်မသွားအောင် (Keep screen awake while reading)';
    btn.addEventListener('click', toggle);
    document.body.appendChild(btn);

    render();
    if (isOn()) acquire(); // restore last choice
  }

  // Re-acquire after the OS/tab dropped the lock (tab switch, lock screen)
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && isOn()) acquire();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
