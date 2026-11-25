/* Layar service worker.
 * - Precache: kerangka aplikasi (HTML, CSS, JS, ikon) agar bisa dibuka offline.
 * - File milik sendiri: jaringan dulu dengan validasi ulang ke server (ETag, tidak memakai
 *   cache HTTP yang basi), cache service worker hanya sebagai cadangan offline.
 * - API (TVmaze, OMDb, TMDB), poster, dan font tidak dicegat.
 * Versi diambil dari alamat pendaftaran (`sw.js?v=...`) yang diisi APP_VERSION di js/core/config.js,
 * jadi cukup menaikkan satu angka itu setiap rilis. */
const VERSION = 'layar-v' + (new URL(self.location.href).searchParams.get('v') || '0');

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
  'css/progress.css',
  'css/translate.css',
  'js/theme-init.js',
  'js/main.js',
  'js/core/config.js',
  'js/core/utils.js',
  'js/core/state.js',
  'js/core/keys.js',
  'js/core/tv.js',
  'js/core/plays.js',
  'js/core/text.js',
  'js/core/trcache.js',
  'js/core/quota.js',
  'js/core/translate.js',
  'js/core/api.js',
  'js/core/storage.js',
  'js/data/demo.js',
  'js/features/search.js',
  'js/features/add.js',
  'js/features/explore.js',
  'js/features/detail.js',
  'js/features/progress.js',
  'js/features/playcount.js',
  'js/features/tvdata.js',
  'js/features/translation.js',
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
      // cache: 'reload' melewati cache HTTP supaya yang tersimpan adalah berkas terbaru dari server.
      .then(cache =>
        cache.addAll(
          SHELL.map(u => new Request(new URL(u, self.location.href).href, { cache: 'reload' }))
        )
      )
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
    // no-cache: selalu validasi ke server (304 bila tidak berubah), bukan memakai salinan HTTP basi.
    fetch(req, { cache: 'no-cache' })
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