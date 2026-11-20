// Service worker SDS : l'app fonctionne entièrement hors ligne.
// Pense à incrémenter VERSION à chaque mise en ligne d'une nouvelle version.
const VERSION = 'sds-v1.0.0';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './vendor/preact-htm.module.js',
  './js/lib.js',
  './js/main.js',
  './js/ui.js',
  './js/icons.js',
  './js/utils.js',
  './js/store.js',
  './js/stats.js',
  './js/exercises.js',
  './js/body.js',
  './js/charts.js',
  './js/logo.js',
  './js/picker.js',
  './js/demo.js',
  './js/views/common.js',
  './js/views/welcome.js',
  './js/views/home.js',
  './js/views/history.js',
  './js/views/statsView.js',
  './js/views/profile.js',
  './js/views/newSession.js',
  './js/views/editor.js',
  './js/views/sessionDetail.js',
  './js/views/progress.js',
  './js/views/programs.js',
  './js/views/settings.js',
  './icons/icon.svg',
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation : coquille de l'app depuis le cache (instantané, hors ligne)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', { ignoreSearch: true }).then((cached) => cached || fetch(req))
    );
    return;
  }

  // Ressources : cache d'abord, réseau en secours (et mise en cache)
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
