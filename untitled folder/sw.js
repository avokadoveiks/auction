// Simple offline-first service worker for the auction game
// Cache static assets and serve navigations with network-first + cache fallback
const CACHE_VERSION = '2025-10-19-2';
const CACHE_NAME = `auction-cache-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './index.html',
  './menu.css',
  './menu.js',
  './v1.html',
  './v1.css',
  './v1.js',
  './assets/menu-bg.png'
];

function normalizeUrl(input) {
  try {
    const url = new URL(input, self.location.href);
    if (url.origin === self.location.origin) {
      // Strip cache-busting and params for our static assets so lookups match
      if (url.pathname.endsWith('.html') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.startsWith('/assets/')) {
        url.search = '';
      }
    }
    return url.toString();
  } catch (e) {
    return input;
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Navigation requests: network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(resp => {
        // Cache a copy for offline
        const copy = resp.clone();
        const key = normalizeUrl(request.url);
        caches.open(CACHE_NAME).then(cache => cache.put(key, copy)).catch(() => {});
        return resp;
      }).catch(async () => {
        // Fallback to cached matching page or index.html
        const key = normalizeUrl(request.url);
        const cached = await caches.match(key);
        if (cached) return cached;
        // Common fallbacks
        const path = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
        const fallbacks = [path, '/index.html', '/v1.html'].map(p => new URL(p, self.location.origin).toString());
        for (const fb of fallbacks) {
          const hit = await caches.match(fb);
          if (hit) return hit;
        }
        // As a last resort, return a basic Response
        return new Response('<h1>Offline</h1><p>Контент недоступен.</p>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      })
    );
    return;
  }

  // Static assets: cache-first, then network; normalize query params
  if (isSameOrigin) {
    const normalized = normalizeUrl(request.url);
    event.respondWith((async () => {
      const cached = await caches.match(normalized);
      if (cached) {
        // Update in background (stale-while-revalidate)
        fetch(request).then(resp => {
          if (resp && resp.ok) caches.open(CACHE_NAME).then(cache => cache.put(normalized, resp)).catch(() => {});
        }).catch(() => {});
        return cached;
      }
      try {
        const resp = await fetch(request);
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(normalized, copy)).catch(() => {});
        }
        return resp;
      } catch (e) {
        // fallback attempt to normalized path (e.g., strip query)
        const hit = await caches.match(normalized);
        if (hit) return hit;
        throw e;
      }
    })());
    return;
  }
});
