// Layar service worker. Naikkan VERSION setiap kali index.html berubah besar.
const VERSION = 'layar-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // API (TVmaze, OMDb, TMDB), poster, dan font tidak dicegat: selalu langsung ke jaringan.
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Halaman: jaringan dulu supaya update cepat sampai, cache kalau offline.
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); return res; })
        .catch(() => caches.match('index.html'))
    );
    return;
  }
  // File statis milik sendiri (ikon, manifest): cache dulu.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
