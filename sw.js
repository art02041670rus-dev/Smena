/* Service worker: офлайн-режим и установка на телефон */
const CACHE = 'smena-shell-v10';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './config.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
];

/* SDK Firebase кэшируем, чтобы приложение открывалось без интернета
   и могло сохранять изменения в локальную очередь Firebase. */
const CDN = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js',
];

async function precacheCDN(cache) {
  for (const url of CDN) {
    try {
      const req = new Request(url, { mode: 'no-cors' });
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) {
        await cache.put(url, res.clone());
      }
    } catch (e) {
      /* нет сети при установке — не страшно */
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await cache.addAll(ASSETS).catch(() => {});
      await precacheCDN(cache);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // SDK Firebase: сначала кэш (адреса версионированные и неизменные)
  if (url.origin !== self.location.origin) {
    if (url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0) {
      event.respondWith(
        caches.match(url.href).then((cached) => {
          if (cached) return cached;
          return fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(url.href, copy)).catch(() => {});
            return res;
          });
        })
      );
    }
    return;
  }

  // Свои файлы: сначала сеть, при отсутствии — кэш
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached;
          if (req.mode === 'navigate') return caches.match('./index.html');
          return new Response('', { status: 503, statusText: 'Offline' });
        })
      )
  );
});
