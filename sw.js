/* Layar service worker.
 * - Precache: kerangka aplikasi (HTML, CSS, JS, ikon) agar bisa dibuka offline.
 * - File milik sendiri: jaringan dulu (selalu terbaru), cache sebagai cadangan offline.
 * - API (TVmaze, OMDb, TMDB), poster, dan font tidak dicegat.
 * Naikkan VERSION setiap rilis agar cache lama dibersihkan. */
const VERSION = 'layar-v4';

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'css/variables.css',
  'css/base.css',
  'css/hero.css',
  'css/lists.css',
  'css/dashboard.css',
  'css/swipe.css',
  'css/navigation.css',
  'css/components.css',
  'js/theme-init.js',
  'js/main.js',
  'js/core/config.js',
  'js/core/utils.js',
  'js/core/state.js',
  'js/core/keys.js',
  'js/core/api.js',
  'js/core/storage.js',
  'js/data/demo.js',
  'js/features/search.js',
  'js/features/add.js',
  'js/features/explore.js',
  'js/features/detail.js',
  'js/features/swipe.js',
  'js/ui/render.js',
  'js/ui/nav.js',
  'js/ui/backup.js',
  'js/ui/settings.js',
  'js/ui/undo.js',
  'js/ui/pwa.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then(cache => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(req)
          .then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined))
      )
  );
});