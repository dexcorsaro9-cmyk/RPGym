/* RPGym service worker — network-first per aggiornamenti immediati */






const CACHE = "heropace-v357";
const NOTIF_CACHE = 'heropace-notif-v1'; // stato notifiche (non cancellare mai)

/* File locali per fallback offline */
const OFFLINE_ASSETS = [
  'index.html',
  'style.css',
  'game.js',
  'app.js',
  'minigames.js',
  'arena.js',
  'firebase.js',
  'manifest.webmanifest',
];

/* Script Firebase CDN — pre-cachati per garantire disponibilità offline */
const FIREBASE_CDN = [
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all([
        c.addAll(OFFLINE_ASSETS).catch(() => {}),
        c.addAll(FIREBASE_CDN).catch(() => {}),
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  /* Elimina vecchie cache di app, ma preserva NOTIF_CACHE */
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE && k !== NOTIF_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isLocal = url.origin === self.location.origin;

  /* Richieste interne allo stato notifiche: gestite solo dalla Cache API, mai dalla rete */
  if (isLocal && url.pathname.startsWith('/_notif')) return;

  /* Strategia network-first per tutti i file locali */
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

/* ── Periodic Background Sync ── */
self.addEventListener('periodicsync', e => {
  if (e.tag === 'smart-notif-check') {
    e.waitUntil(doSmartNotifCheck());
  }
});

async function readNotifState() {
  try {
    const cache = await caches.open(NOTIF_CACHE);
    const res = await cache.match('/_notif-state');
    return res ? res.json() : null;
  } catch { return null; }
}

async function showNotifSW(title, body, tag) {
  /* Dedup: un tag per giorno, non ripetere */
  try {
    const cache = await caches.open(NOTIF_CACHE);
    if (await cache.match('/_shown/' + tag)) return;
    await cache.put('/_shown/' + tag, new Response('1'));
  } catch {}

  /* Non disturbare se l'utente ha l'app aperta in foreground */
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clientList.some(c => c.visibilityState === 'visible')) return;

  await self.registration.showNotification(title, {
    body,
    icon: 'assets/icons/icon.svg',
    badge: 'assets/icons/icon.svg',
    tag
  });
}

async function doSmartNotifCheck() {
  const state = await readNotifState();
  if (!state) return;

  const now = new Date();
  const hour = now.getHours();
  const today = now.toISOString().slice(0, 10);

  /* Stato stale: l'app non è stata aperta oggi, skip */
  if (state.date !== today) return;

  /* ① Buff attivo — mattino (9-11) ricordati di allenarti */
  if (hour >= 9 && hour < 11 && state.hasActiveBuff) {
    await showNotifSW(
      '💊 Hai un buff attivo!',
      'Un consumabile è pronto — allenati oggi per non sprecarlo!',
      'buff_active_' + today
    );
  }

  /* ② Pozione — tra le 19:00 e le 22:00 se non riscattata */
  if (hour >= 19 && hour < 22 && !state.potionClaimed) {
    await showNotifSW(
      '⚗️ Pozione non riscattata!',
      'La Pozione del Giorno ti aspetta — riscattala prima di mezzanotte!',
      'potion_unclaimed_' + today
    );
  }

  /* ② Arena — dalle 22:00 se restano sfide */
  if (hour >= 22 && state.battlesLeft > 0) {
    await showNotifSW(
      "⚔️ L'Arena chiude tra 2 ore!",
      `Ti restano ancora ${state.battlesLeft} sfide oggi — non sprecarle!`,
      'arena_closing_' + today
    );
  }

  /* ③ Mappa — subito se a ≤5 km dalla prossima tappa */
  if (state.mapKmLeft !== null && state.mapKmLeft <= 5) {
    await showNotifSW(
      '🗺️ Sei vicino a una tappa!',
      `Ti mancano solo ${state.mapKmLeft} km per il prossimo medaglione. Forza!`,
      'map_near_' + Math.round((state.mapKmLeft || 0) * 10)
    );
  }

  /* ④ Famiglio — fame o umore bassi */
  if (state.petName && state.petHunger !== null && state.petHunger < 30) {
    await showNotifSW(
      `🍖 ${state.petName} ha fame!`,
      'Il tuo famiglio è quasi affamato — entra nell\'app e nutrilo!',
      'pet_hunger_' + today
    );
  }
  if (state.petName && state.petMood !== null && state.petMood < 30) {
    await showNotifSW(
      `🎾 ${state.petName} è triste!`,
      'Il suo umore è al minimo — giocaci un po\'!',
      'pet_mood_' + today
    );
  }
}

/* Tap su notifica → apre/porta in primo piano l'app */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin) && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow('/');
    })
  );
});
