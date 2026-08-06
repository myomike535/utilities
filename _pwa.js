// PWA registration + Install prompt handling
// Loaded on every page. Registers the SW and shows a floating "Install App" button
// when the browser fires beforeinstallprompt.
(function () {
  'use strict';
  if (window.top !== window) return;

  // ---- Service Worker registration ----
  // Only works when served over http(s). file:// origins get a friendly noop.
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { scope: './' })
        .then(reg => {
          // console.info('[PWA] Service Worker registered', reg.scope);
          // Check for updates every 30 min
          setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);

          // ---- Auto-update banner ----
          // A new SW is "waiting" once installed while an old one still controls the page.
          if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg.waiting);
          reg.addEventListener('updatefound', () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener('statechange', () => {
              // Only prompt on an UPDATE (controller exists), not the very first install
              if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner(nw);
            });
          });
        })
        .catch(err => console.warn('[PWA] SW registration failed:', err.message));
    });

    // When the new worker takes control, reload once to run the fresh code
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }

  // ---- Update banner ----
  function showUpdateBanner(worker) {
    if (document.querySelector('.pwa-update-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'pwa-update-btn';
    btn.setAttribute('aria-label', 'Update to the new version');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" style="stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0">
        <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      <span>ဗားရှင်းအသစ် ရနိုင်ပါပြီ — အသစ်ပြင်ရန် နှိပ်ပါ</span>
      <button class="pwa-update-close" aria-label="Later" title="Later">×</button>
    `;
    document.body.appendChild(btn);
    btn.addEventListener('click', (e) => {
      if (e.target.closest('.pwa-update-close')) return;
      btn.disabled = true;
      btn.querySelector('span').textContent = 'အသစ်ပြင်နေသည်...';
      worker.postMessage('SKIP_WAITING'); // SW calls skipWaiting → controllerchange → reload
    });
    btn.querySelector('.pwa-update-close').addEventListener('click', (e) => {
      e.stopPropagation();
      btn.remove();
    });
  }

  // ---- Install prompt ----
  let deferredPrompt = null;
  let installBtn = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (installBtn) { installBtn.remove(); installBtn = null; }
    // One-time toast (if the host page has one)
    if (window.showToast) window.showToast('📱 App installed');
  });

  function showInstallButton() {
    if (installBtn) return;
    // Don't nag repeatedly — respect a 24h snooze
    const snooze = parseInt(localStorage.getItem('pwa.install.snooze') || '0', 10);
    if (snooze > Date.now()) return;

    installBtn = document.createElement('button');
    installBtn.className = 'pwa-install-btn';
    installBtn.setAttribute('aria-label', 'Install this app');
    installBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" style="stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0">
        <path d="M12 3v12"/><polyline points="7 10 12 15 17 10"/><line x1="5" y1="21" x2="19" y2="21"/>
      </svg>
      <span>Install App</span>
      <button class="pwa-install-close" aria-label="Dismiss" title="Dismiss">×</button>
    `;
    document.body.appendChild(installBtn);

    // Handle install click (avoid triggering when clicking the close x)
    installBtn.addEventListener('click', async (e) => {
      if (e.target.closest('.pwa-install-close')) return;
      if (!deferredPrompt) return;
      installBtn.disabled = true;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'dismissed') {
        // Snooze 24h so we don't nag every load
        localStorage.setItem('pwa.install.snooze', String(Date.now() + 24 * 60 * 60 * 1000));
      }
      deferredPrompt = null;
      installBtn.remove(); installBtn = null;
    });
    installBtn.querySelector('.pwa-install-close').addEventListener('click', (e) => {
      e.stopPropagation();
      localStorage.setItem('pwa.install.snooze', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
      installBtn.remove(); installBtn = null;
    });
  }

  // ---- Styles for the install button ----
  const style = document.createElement('style');
  style.textContent = `
    .pwa-install-btn {
      position: fixed; right: 20px; bottom: 20px; z-index: 990;
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; padding-right: 8px;
      border: none; border-radius: 999px;
      background: linear-gradient(135deg, #a78bfa, #ec4899);
      color: #fff; font-family: inherit; font-size: 0.86rem; font-weight: 600;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(167,139,250,0.45);
      animation: pwaSlideIn 0.4s cubic-bezier(.34,1.56,.64,1);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .pwa-install-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(167,139,250,0.55); }
    .pwa-install-btn:disabled { opacity: 0.7; cursor: wait; }
    .pwa-install-close {
      background: rgba(255,255,255,0.2); border: none; color: #fff;
      width: 22px; height: 22px; border-radius: 50%; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 15px; line-height: 1; margin-left: 4px;
      transition: background 0.15s ease;
    }
    .pwa-install-close:hover { background: rgba(255,255,255,0.35); }
    @keyframes pwaSlideIn {
      from { opacity: 0; transform: translateY(20px) scale(0.9); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (max-width: 640px) {
      .pwa-install-btn { right: 12px; bottom: 12px; padding: 8px 12px; padding-right: 6px; font-size: 0.8rem; }
    }

    /* Auto-update banner — bottom-left, distinct from the install button */
    .pwa-update-btn {
      position: fixed; left: 20px; bottom: 20px; z-index: 991;
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; padding-right: 8px;
      border: none; border-radius: 999px;
      background: linear-gradient(135deg, #10b981, #0ea5e9);
      color: #fff; font-family: inherit; font-size: 0.86rem; font-weight: 600;
      cursor: pointer; max-width: min(90vw, 380px);
      box-shadow: 0 8px 24px rgba(16,185,129,0.45);
      animation: pwaSlideIn 0.4s cubic-bezier(.34,1.56,.64,1);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .pwa-update-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(16,185,129,0.55); }
    .pwa-update-btn:disabled { opacity: 0.75; cursor: wait; }
    .pwa-update-btn span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pwa-update-close {
      background: rgba(255,255,255,0.2); border: none; color: #fff;
      width: 22px; height: 22px; border-radius: 50%; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 15px; line-height: 1; margin-left: 2px; flex-shrink: 0;
      transition: background 0.15s ease;
    }
    .pwa-update-close:hover { background: rgba(255,255,255,0.35); }
    @media (max-width: 640px) {
      .pwa-update-btn { left: 12px; right: 12px; bottom: 12px; padding: 8px 12px; padding-right: 6px; font-size: 0.8rem; max-width: none; }
    }
  `;
  document.head.appendChild(style);
})();
