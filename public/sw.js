/* FINB service worker — offline-capable app shell for a static export. */
const VERSION = 'finb-v1';
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;

const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => !key.startsWith(VERSION)).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/** Static build assets are immutable — cache first, refresh in the background. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) {
    fetch(request)
      .then(response => {
        if (response && response.ok) cache.put(request, response.clone());
      })
      .catch(() => {});
    return hit;
  }
  const response = await fetch(request);
  if (response && response.ok && response.type === 'basic') cache.put(request, response.clone());
  return response;
}

/** Navigations are network first so a fresh deploy is picked up, with the shell as fallback. */
async function networkFirst(request) {
  const cache = await caches.open(SHELL);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put('/', response.clone());
    return response;
  } catch (error) {
    const hit = (await cache.match(request)) || (await cache.match('/'));
    if (hit) return hit;
    return new Response(
      `<!doctype html><html lang="en"><meta charset="utf-8"><title>FINB — offline</title>
       <body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#070a18;color:#fff6e9;font-family:system-ui;text-align:center">
       <div><h1 style="font-size:1.4rem">The vault is closed offline</h1>
       <p style="opacity:.7">Reconnect to reopen FINB. Your Credits and Liberals are stored on this device and are safe.</p></div></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 },
    );
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    // Cross-origin (Supabase, Colyseus): never cached, never intercepted.
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || /\.(?:png|svg|webp|jpg|woff2?|css|js|json|webmanifest)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, ASSETS));
  }
});
