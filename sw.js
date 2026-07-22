/* RPGym service worker — cache base per uso offline */
const CACHE = 'rpgym-v62';
const ASSETS = [
  '.',
  'index.html',
  'style.css',
  'game.js',
  'app.js',
  'manifest.webmanifest',
  'apple-touch-icon.png',
  'apple-touch-icon-precomposed.png',
  'assets/rpgym-sync.shortcut',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
