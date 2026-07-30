// MyoMT Utilities Suite — Service Worker
// Strategy: stale-while-revalidate for static assets, network-first for LLM/API endpoints,
// offline fallback for navigation to any cached tool.
// Bump CACHE_VERSION to force clients to fetch fresh copies.

const CACHE_VERSION = 'utilities-v10';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// All local files that should work fully offline.
const PRECACHE_URLS = [
  './',
  './index.html',
  './ToDo.html',
  './AINoteTaker.html',
  './ai_note_taker_enterprise_suite.html',
  './RecapAudioMaker.html',
  './PasswordManager.html',
  './SqlFormatter.html',
  './SqlDeploy.html',
  './GithubTrending.html',
  './StudyRoom.html',
  './_palette.js',
  './_navrail.js',
  './_ui.js',
  './_pwa.js',
  './_settings.js',
  './_cloudsync.js',
  './_prompts.js',
  './_motion.js',
  './_motion.css',
  './manifest.json',
];

// External API hosts — always go network-first (never cache LLM responses).
const NETWORK_HOSTS = [
  'generativelanguage.googleapis.com', // Gemini
  'api.groq.com',                       // Groq
  'api.anthropic.com',                  // Anthropic
  'api.mistral.ai',                     // Mistral
  'api.cerebras.ai',                    // Cerebras
  'openrouter.ai',                      // OpenRouter
  'models.github.ai',                   // GitHub Models
  'api.github.com',                     // GitHub API (GhTrending)
  'localhost',                          // Ollama
  '127.0.0.1',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // Precache — but don't fail install if a single file is missing (e.g. removed script)
      await Promise.all(PRECACHE_URLS.map(async (url) => {
        try { await cache.add(url); }
        catch (err) { console.warn('[SW] Precache skip:', url, err.message); }
      }));
      self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache API calls
  if (NETWORK_HOSTS.some(h => url.hostname.endsWith(h) || url.hostname === h)) return;

  // Skip cross-origin requests we don't own
  if (url.origin !== self.location.origin) return;

  // Skip data: / blob: URLs
  if (url.protocol === 'data:' || url.protocol === 'blob:') return;

  event.respondWith(handleFetch(req));
});

async function handleFetch(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await caches.match(req);

  // Stale-while-revalidate: serve cached immediately if available, and update in bg
  const networkPromise = fetch(req).then(res => {
    // Only cache successful, basic (same-origin) responses
    if (res && res.status === 200 && res.type === 'basic') {
      cache.put(req, res.clone());
    }
    return res;
  }).catch(() => null);

  if (cached) {
    // Kick off network update in background
    networkPromise.catch(() => {});
    return cached;
  }

  // Not cached — try network
  const network = await networkPromise;
  if (network) return network;

  // Offline + not cached: return an index.html fallback for navigations
  if (req.mode === 'navigate') {
    const fallback = await caches.match('./index.html');
    if (fallback) return fallback;
  }
  return new Response('Offline and not cached', { status: 503, statusText: 'Offline' });
}

// Allow the page to trigger an update via postMessage
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
