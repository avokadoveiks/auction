// Offline-first service worker (v2) — respects query params for assets to allow cache busting
const CACHE_VERSION = '2025-11-02-restructured';
const CACHE_NAME = `auction-cache-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './index.html',
  './css/menu.css',
  './js/menu.js',
  './v1.html',
  './css/v1.css',
  './js/v1.js',
  './src/auth.js',
  './js/manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/images/menu-bg.png'
  // Avatars (humans)
  ,'./assets/bots/humans/h1.jpg','./assets/bots/humans/h2.jpg','./assets/bots/humans/h3.jpg','./assets/bots/humans/h4.jpg',
  './assets/bots/humans/h5.svg','./assets/bots/humans/h6.svg','./assets/bots/humans/h7.svg','./assets/bots/humans/h8.svg','./assets/bots/humans/h9.svg','./assets/bots/humans/h10.svg',
  // Avatars (animals)
  './assets/bots/animals/a1.jpg','./assets/bots/animals/a2.jpg','./assets/bots/animals/a3.jpg','./assets/bots/animals/a4.jpg',
  './assets/bots/animals/a5.svg','./assets/bots/animals/a6.svg','./assets/bots/animals/a7.svg','./assets/bots/animals/a8.svg','./assets/bots/animals/a9.svg','./assets/bots/animals/a10.svg',
  // Avatars (landscapes)
  './assets/bots/landscapes/l1.jpg','./assets/bots/landscapes/l2.jpg','./assets/bots/landscapes/l3.jpg','./assets/bots/landscapes/l4.jpg',
  './assets/bots/landscapes/l5.svg','./assets/bots/landscapes/l6.svg','./assets/bots/landscapes/l7.svg','./assets/bots/landscapes/l8.svg','./assets/bots/landscapes/l9.svg','./assets/bots/landscapes/l10.svg'
];

self.addEventListener('install', event => {
  console.log('[SW] Installing new version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Activating new version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()))
      ))
      .then(() => self.clients.claim())
      .then(() => {
        // Уведомить всех клиентов о новой версии
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_UPDATED',
              version: CACHE_VERSION
            });
          });
        });
      })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Navigation: network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const resp = await fetch(request);
        const copy = resp.clone();
        const key = new URL(request.url, self.location.href).toString();
        caches.open(CACHE_NAME).then(c => c.put(key, copy)).catch(()=>{});
        return resp;
      } catch (e) {
        const url = new URL(request.url);
        const path = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
        const fallbacks = [request.url, path, '/index.html', '/v1.html'];
        for (const fb of fallbacks) {
          const cached = await caches.match(fb);
          if (cached) return cached;
        }
        return new Response('<h1>Offline</h1>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  // Assets: cache-first; keep query params to allow busting
  event.respondWith((async () => {
    const key = request.url;
    const cached = await caches.match(key);
    if (cached) {
      fetch(request).then(resp => { if (resp && resp.ok) caches.open(CACHE_NAME).then(c => c.put(key, resp)).catch(()=>{}); }).catch(()=>{});
      return cached;
    }
    try {
      const resp = await fetch(request);
      if (resp && resp.ok) {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(key, copy)).catch(()=>{});
      }
      return resp;
    } catch (e) {
      const hit = await caches.match(request.url);
      if (hit) return hit;
      throw e;
    }
  })());
});
