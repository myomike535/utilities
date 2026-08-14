// App Lock (v65.1) — optional PIN privacy screen for the whole suite.
// Loaded on every page. If a PIN is set ('applock.v1'), shows a full-screen lock
// until the correct PIN is entered; unlock lasts the browser session.
// HONEST SCOPE: this is a privacy screen against casual device access, NOT encryption.
// Forgot-PIN reset removes the lock only — user data is never wiped.
(function () {
  'use strict';
  if (window.top !== window) return; // never inside preview iframes

  const KEY = 'applock.v1';          // {salt, hash}
  const SESSION = 'applock.ok';

  function getCfg() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }

  async function pinHash(salt, pin) {
    const data = new TextEncoder().encode(salt + '::' + pin);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ---- styles ----
  const style = document.createElement('style');
  style.textContent = `
    .al-backdrop {
      position: fixed; inset: 0; z-index: 999999;
      background: url('login-bg.svg') center bottom / cover no-repeat, linear-gradient(135deg, #0b0d16, #141728);
      
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    @keyframes alAurora { from { background-position: 0% 0%; } to { background-position: 100% 100%; } }
    /* Starfield layer */
    .al-backdrop::before {
      content: ""; position: absolute; inset: 0; pointer-events: none;
      background-image:
        radial-gradient(1.5px 1.5px at 12% 22%, rgba(255,255,255,0.9), transparent),
        radial-gradient(1px 1px at 28% 12%, rgba(255,255,255,0.7), transparent),
        radial-gradient(2px 2px at 44% 30%, rgba(255,255,255,0.8), transparent),
        radial-gradient(1px 1px at 58% 8%, rgba(255,255,255,0.6), transparent),
        radial-gradient(1.5px 1.5px at 72% 24%, rgba(255,255,255,0.85), transparent),
        radial-gradient(1px 1px at 86% 14%, rgba(255,255,255,0.7), transparent),
        radial-gradient(1.5px 1.5px at 8% 44%, rgba(255,255,255,0.6), transparent),
        radial-gradient(1px 1px at 92% 38%, rgba(255,255,255,0.75), transparent),
        radial-gradient(1px 1px at 36% 52%, rgba(255,255,255,0.5), transparent),
        radial-gradient(1.5px 1.5px at 65% 45%, rgba(255,255,255,0.65), transparent);
      animation: alTwinkle 5s ease-in-out infinite alternate;
    }
    @keyframes alTwinkle { from { opacity: 0.5; } to { opacity: 1; } }
    /* Mountain silhouette layer */
    .al-backdrop::after {
      content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 34vh; pointer-events: none;
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 320' preserveAspectRatio='none'%3E%3Cpath d='M0 320 L0 200 L140 120 L260 190 L390 70 L520 180 L640 110 L780 210 L900 90 L1040 180 L1200 130 L1200 320 Z' fill='%23090b14' opacity='0.85'/%3E%3Cpath d='M0 320 L0 260 L180 190 L340 250 L500 160 L680 250 L840 180 L1000 250 L1200 200 L1200 320 Z' fill='%23060810'/%3E%3C/svg%3E") bottom / cover no-repeat;
    }
    .al-card { position: relative; z-index: 2; }
    @media (prefers-reduced-motion: reduce) { .al-backdrop::before { animation: none; } }
    .al-card {
      width: 100%; max-width: 330px; text-align: center;
      background: rgba(255,255,255,0.055);
      backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 22px; padding: 38px 28px 30px;
      box-shadow: 0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08);
      font-family: 'Pyidaungsu','Padauk','Myanmar Text','Segoe UI',system-ui,sans-serif;
      color: #e8ecf4;
      animation: alRise 0.45s cubic-bezier(.22,1,.36,1);
    }
    @keyframes alRise { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: none; } }
    .al-ico {
      width: 62px; height: 62px; margin: 0 auto 14px; font-size: 1.7rem;
      display: grid; place-items: center; border-radius: 20px;
      background: linear-gradient(135deg, #6366f1, #a78bfa);
      box-shadow: 0 10px 28px rgba(99,102,241,0.45);
    }
    @media (prefers-reduced-motion: reduce) { .al-backdrop, .al-card { animation: none; } }
    .al-title { font-size: 1rem; font-weight: 700; margin-bottom: 4px; }
    .al-sub { font-size: 0.76rem; color: #8a93a5; margin-bottom: 18px; line-height: 1.6; }
    .al-input {
      width: 100%; padding: 13px 14px; border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.16); background: rgba(0,0,0,0.32);
      color: #fff; font-size: 1.15rem; text-align: center; letter-spacing: 0.4em;
      outline: none; font-family: inherit; transition: border-color 0.18s, box-shadow 0.18s;
    }
    .al-input:focus { border-color: #818cf8; box-shadow: 0 0 0 4px rgba(99,102,241,0.28); background: rgba(0,0,0,0.42); }
    .al-btn {
      width: 100%; margin-top: 14px; padding: 13px; border: none; border-radius: 12px;
      background: linear-gradient(135deg, #6366f1, #a78bfa); color: #fff;
      font-size: 0.95rem; font-weight: 700; cursor: pointer; font-family: inherit;
      box-shadow: 0 8px 22px rgba(99,102,241,0.35);
      transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
    }
    .al-btn:hover { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 12px 28px rgba(99,102,241,0.45); }
    .al-btn:active { transform: scale(0.97); }
    .al-err { color: #ff7b7b; font-size: 0.78rem; min-height: 18px; margin-top: 10px; }
    .al-reset { margin-top: 14px; font-size: 0.72rem; color: #6b7280; cursor: pointer; text-decoration: underline; background: none; border: none; font-family: inherit; }
    .al-reset:hover { color: #9aa4b3; }
    .al-shake { animation: alShake 0.4s; }
    @keyframes alShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
  `;
  document.head.appendChild(style);

  // ---- lock overlay: 'enter' mode (PIN exists) or 'create' mode (first visit) ----
  function showLock(mode) {
    const bd = document.createElement('div');
    bd.className = 'al-backdrop';
    bd.innerHTML = mode === 'create' ? `
      <div class="al-card">
        <div class="al-ico">🔐</div>
        <div class="al-title">MyoMT Utilities</div>
        <div class="al-sub">ပထမဆုံးအကြိမ် — နာမည်နှင့် PIN သတ်မှတ်ပါ</div>
        <input class="al-input al-name" type="text" autocomplete="off" maxlength="24" placeholder="နာမည် · Your name" aria-label="Name" style="letter-spacing:normal;font-size:0.95rem;margin-bottom:8px">
        <input class="al-input" type="password" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="PIN အသစ် (၄ လုံး+)" aria-label="New PIN">
        <input class="al-input" type="password" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="ထပ်မံ အတည်ပြုပါ" aria-label="Confirm PIN" style="margin-top:8px">
        <button class="al-btn">🔒 သတ်မှတ်မည် · Set PIN</button>
        <div class="al-err"></div>
        <button class="al-reset">PIN မလိုပါ — ဆက်သွားမည် (skip)</button>
      </div>` : `
      <div class="al-card">
        <div class="al-ico">🔒</div>
        <div class="al-title">${(localStorage.getItem('applock.name') || 'MyoMT Utilities').replace(/[<>&]/g, '')}</div>
        <div class="al-sub">${localStorage.getItem('applock.name') ? 'မင်္ဂလာပါ — PIN ထည့်၍ ဖွင့်ပါ' : 'PIN ထည့်၍ ဖွင့်ပါ'}</div>
        <input class="al-input" type="password" inputmode="numeric" autocomplete="off" maxlength="12" aria-label="PIN">
        <button class="al-btn">ဖွင့်မည် · Unlock</button>
        <div class="al-err"></div>
        <button class="al-reset">PIN မေ့သွားလား? — Lock ဖြုတ်ရန် (data မပျက်ပါ)</button>
      </div>`;
    document.documentElement.appendChild(bd);
    const inputs = bd.querySelectorAll('.al-input');
    const input = inputs[0];
    const err = bd.querySelector('.al-err');
    const card = bd.querySelector('.al-card');
    setTimeout(() => input.focus(), 80);

    function fail(msg) {
      err.textContent = msg;
      card.classList.remove('al-shake'); void card.offsetWidth; card.classList.add('al-shake');
    }
    function done() {
      sessionStorage.setItem(SESSION, '1');
      bd.style.transition = 'opacity 0.25s'; bd.style.opacity = '0';
      setTimeout(() => bd.remove(), 260);
      // Refresh the dashboard greeting with the (possibly just-set) name
      const nm = localStorage.getItem('applock.name');
      const g = document.getElementById('greet');
      if (nm && g) setTimeout(() => { g.textContent = g.textContent.replace(/,[^,]*$/, ', ' + nm); }, 300);
    }
    async function submit() {
      if (mode === 'create') {
        const name = inputs[0].value.trim(), p1 = inputs[1].value, p2 = inputs[2].value;
        if (!name) { fail('နာမည် ထည့်ပါ'); inputs[0].focus(); return; }
        if (p1.length < 4) { fail('PIN သည် အနည်းဆုံး ၄ လုံး ရှိရပါမည်'); return; }
        if (p1 !== p2) { fail('⚠ PIN နှစ်ခု မတူပါ'); inputs[2].value = ''; return; }
        const salt = [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem(KEY, JSON.stringify({ salt, hash: await pinHash(salt, p1) }));
        localStorage.setItem('applock.name', name);
        localStorage.removeItem('applock.skip');
        done();
        return;
      }
      const cfg = getCfg();
      if (!cfg) { bd.remove(); return; }
      const h = await pinHash(cfg.salt, input.value);
      if (h === cfg.hash) done();
      else { fail('⚠ PIN မှားနေပါသည်'); input.value = ''; input.focus(); }
    }
    bd.querySelector('.al-btn').addEventListener('click', submit);
    inputs.forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); }));
    bd.querySelector('.al-reset').addEventListener('click', () => {
      if (mode === 'create') {
        // Visitor chose no PIN — remember and never ask again (re-enable via ⚙ App Lock)
        localStorage.setItem('applock.skip', '1');
        sessionStorage.setItem(SESSION, '1');
        bd.remove();
        return;
      }
      if (confirm('Lock ကို ဖြုတ်မည် — သင့် data အားလုံး ဒီအတိုင်း ကျန်ပါမည်။ (privacy screen သာ ဖြုတ်ခြင်း ဖြစ်သည်)\n\nဆက်လုပ်မလား?')) {
        localStorage.removeItem(KEY); localStorage.removeItem('applock.enabled');
        sessionStorage.removeItem(SESSION);
        bd.remove();
      }
    });
  }

  // ---- setup / change / disable (exposed) ----
  async function setup() {
    const cfg = getCfg();
    if (cfg) {
      const cur = prompt('လက်ရှိ PIN ထည့်ပါ:');
      if (cur === null) return;
      if (await pinHash(cfg.salt, cur) !== cfg.hash) { alert('⚠ PIN မှားနေပါသည်'); return; }
    }
    const p1 = prompt('PIN အသစ် (အနည်းဆုံး ၄ လုံး) — ဖျက်ရန် blank ထားပါ:');
    if (p1 === null) return;
    if (!p1) {
      if (cfg && confirm('Lock ဖြုတ်မလား? (data မပျက်ပါ)')) { localStorage.removeItem(KEY); localStorage.removeItem('applock.enabled'); alert('🔓 Lock ဖြုတ်ပြီး'); }
      return;
    }
    if (p1.length < 4) { alert('PIN သည် အနည်းဆုံး ၄ လုံး ရှိရပါမည်'); return; }
    const p2 = prompt('PIN ထပ်မံ အတည်ပြုပါ:');
    if (p2 !== p1) { alert('⚠ PIN နှစ်ခု မတူပါ'); return; }
    const salt = [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(KEY, JSON.stringify({ salt, hash: await pinHash(salt, p1) }));
    localStorage.removeItem('applock.skip');
    sessionStorage.setItem(SESSION, '1');
    alert('🔒 App Lock သတ်မှတ်ပြီး — နောက်ဖွင့်တိုင်း PIN မေးပါမည်');
  }
  window.AppLock = { setup, isSet: () => !!getCfg() };

  // Command-palette action (Ctrl+K → "lock")
  window.PALETTE_ACTIONS = (window.PALETTE_ACTIONS || []).concat([
    { label: '🔒 App Lock — PIN သတ်မှတ်/ပြောင်း', hint: 'applock', section: 'Actions', run: () => setup() },
  ]);

  // Add a section into the Settings (⚙) modal once it exists
  function hookSettings() {
    const sections = document.querySelectorAll('.st-section');
    if (!sections.length) return false;
    const parent = sections[sections.length - 1].parentElement;
    if (!parent || parent.querySelector('.al-st')) return true;
    const sec = document.createElement('div');
    sec.className = 'st-section al-st';
    sec.innerHTML = `<h3>🔒 App Lock</h3>
      <button class="al-btn" style="margin-top:0" id="alSetupBtn">PIN သတ်မှတ်/ပြောင်းရန်</button>
      <div style="font-size:0.7rem;color:#8a93a5;margin-top:8px;line-height:1.6">Privacy screen — device ကို သူများကိုင်သောအခါ ကာကွယ်ရန်။ Vault မှာ သီးသန့် master password ရှိပြီးသားပါ။</div>`;
    parent.appendChild(sec);
    sec.querySelector('#alSetupBtn').addEventListener('click', setup);
    return true;
  }
  window.addEventListener('load', () => { setTimeout(hookSettings, 600); });

  // ---- gate on load: login page by default ----
  // PIN exists → enter mode. No PIN and never skipped → create mode (first visit).
  if (sessionStorage.getItem(SESSION) !== '1') {
    if (getCfg()) showLock('enter');
    else if (localStorage.getItem('applock.skip') !== '1') showLock('create');
  }
})();
