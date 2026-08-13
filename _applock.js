// App Lock — optional PIN privacy screen for the whole suite.
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
      background: linear-gradient(135deg, #10121a, #1a1d2e);
      display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .al-card {
      width: 100%; max-width: 320px; text-align: center;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 18px; padding: 34px 26px;
      font-family: 'Pyidaungsu','Padauk','Myanmar Text','Segoe UI',system-ui,sans-serif;
      color: #e8ecf4;
    }
    .al-ico { font-size: 2.2rem; margin-bottom: 8px; }
    .al-title { font-size: 1rem; font-weight: 700; margin-bottom: 4px; }
    .al-sub { font-size: 0.76rem; color: #8a93a5; margin-bottom: 18px; line-height: 1.6; }
    .al-input {
      width: 100%; padding: 12px 14px; border-radius: 11px;
      border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.3);
      color: #fff; font-size: 1.15rem; text-align: center; letter-spacing: 0.4em;
      outline: none; font-family: inherit;
    }
    .al-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.25); }
    .al-btn {
      width: 100%; margin-top: 12px; padding: 12px; border: none; border-radius: 11px;
      background: linear-gradient(135deg, #6366f1, #a78bfa); color: #fff;
      font-size: 0.95rem; font-weight: 700; cursor: pointer; font-family: inherit;
    }
    .al-btn:active { transform: scale(0.98); }
    .al-err { color: #ff7b7b; font-size: 0.78rem; min-height: 18px; margin-top: 10px; }
    .al-reset { margin-top: 14px; font-size: 0.72rem; color: #6b7280; cursor: pointer; text-decoration: underline; background: none; border: none; font-family: inherit; }
    .al-reset:hover { color: #9aa4b3; }
    .al-shake { animation: alShake 0.4s; }
    @keyframes alShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
  `;
  document.head.appendChild(style);

  // ---- lock overlay ----
  function showLock() {
    const bd = document.createElement('div');
    bd.className = 'al-backdrop';
    bd.innerHTML = `
      <div class="al-card">
        <div class="al-ico">🔒</div>
        <div class="al-title">MyoMT Utilities</div>
        <div class="al-sub">PIN ထည့်၍ ဖွင့်ပါ</div>
        <input class="al-input" type="password" inputmode="numeric" autocomplete="off" maxlength="12" aria-label="PIN">
        <button class="al-btn">ဖွင့်မည် · Unlock</button>
        <div class="al-err"></div>
        <button class="al-reset">PIN မေ့သွားလား? — Lock ဖြုတ်ရန် (data မပျက်ပါ)</button>
      </div>`;
    document.documentElement.appendChild(bd);
    const input = bd.querySelector('.al-input');
    const err = bd.querySelector('.al-err');
    const card = bd.querySelector('.al-card');
    setTimeout(() => input.focus(), 80);

    async function tryUnlock() {
      const cfg = getCfg();
      if (!cfg) { bd.remove(); return; }
      const h = await pinHash(cfg.salt, input.value);
      if (h === cfg.hash) {
        sessionStorage.setItem(SESSION, '1');
        bd.style.transition = 'opacity 0.25s'; bd.style.opacity = '0';
        setTimeout(() => bd.remove(), 260);
      } else {
        err.textContent = '⚠ PIN မှားနေပါသည်';
        card.classList.remove('al-shake'); void card.offsetWidth; card.classList.add('al-shake');
        input.value = ''; input.focus();
      }
    }
    bd.querySelector('.al-btn').addEventListener('click', tryUnlock);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
    bd.querySelector('.al-reset').addEventListener('click', () => {
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
    localStorage.setItem('applock.enabled', '1');
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

  // ---- gate on load ----
  if (getCfg() && localStorage.getItem('applock.enabled') === '1' && sessionStorage.getItem(SESSION) !== '1') showLock();
})();
