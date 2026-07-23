/* RPGym service worker — network-first per aggiornamenti immediati */
const CACHE = 'rpgym-v87';

/* File solo per fallback offline — NON pre-cachati all'install */
const OFFLINE_ASSETS = [
  'index.html',
  'style.css',
  'game.js',
  'app.js',
  'minigames.js',
  'arena.js',
  'manifest.webmanifest',
];

self.addEventListener('install', e => {
  /* Precarica solo i file essenziali per offline */
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(OFFLINE_ASSETS).catch(() => {}))
  );
  /* Attiva subito — non aspettare che le vecchie tab si chiudano */
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  /* Elimina TUTTE le vecchie cache */
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isLocal = url.origin === self.location.origin;

  /* Strategia network-first per tutti i file locali:
     prova sempre la rete → aggiorna cache → se offline usa cache */
  if (isLocal) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  /* Font / CDN esterni: cache-first (non cambiano) */
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      });
    })
  );
});
