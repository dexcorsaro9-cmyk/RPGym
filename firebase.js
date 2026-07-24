/* ══════════════════════════════════════════════════════════════
   RPGym — Firebase helpers
   Classifica globale + Sfide PvP (Firestore)
   ══════════════════════════════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyATkOUK69ZIBSJ7i2jfefpMJ4OLdVNYcT8',
  authDomain:        'rpgym-3c229.firebaseapp.com',
  projectId:         'rpgym-3c229',
  storageBucket:     'rpgym-3c229.firebasestorage.app',
  messagingSenderId: '326554584694',
  appId:             '1:326554584694:web:244e2f8ae4ee9b72598157',
};

const FB = (() => {
  let db = null;

  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
  } catch (e) {
    console.warn('[FB] init:', e.message);
  }

  const ok = () => !!db;

  /* ── Sync eroe pubblico ──────────────────────────────────── */
  async function syncHero(hero) {
    if (!ok() || !hero) return;
    try {
      await db.collection('heroes').doc(hero.id).set({
        name:    hero.name,
        storyId: hero.storyId || 'eroe1',
        level:   hero.level   || 1,
        totalKm: Math.round((hero.totalKm || 0) * 10) / 10,
        streak:  (hero.streak && hero.streak.count) || 0,
        prestige:(hero.prestige && hero.prestige.count) || 0,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) { console.warn('[FB] syncHero:', e.message); }
  }

  /* ── Classifica ──────────────────────────────────────────── */
  async function getLeaderboard(n = 25) {
    if (!ok()) return [];
    try {
      const snap = await db.collection('heroes')
        .orderBy('totalKm', 'desc').limit(n).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[FB] getLeaderboard:', e.message);
      return [];
    }
  }

  /* ── Sfide PvP ───────────────────────────────────────────── */
  // Genera codice 6 char senza caratteri ambigui
  function _code() {
    const C = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += C[Math.floor(Math.random() * C.length)];
    return s;
  }

  async function createChallenge(hero) {
    if (!ok()) return null;
    const id    = _code();
    const start = new Date().toISOString().slice(0, 10);
    const end   = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    try {
      await db.collection('challenges').doc(id).set({
        creatorId:       hero.id,
        creatorName:     hero.name,
        creatorStoryId:  hero.storyId || 'eroe1',
        creatorLevel:    hero.level   || 1,
        creatorKmStart:  hero.totalKm || 0,
        creatorKmNow:    hero.totalKm || 0,
        opponentId:      null,
        opponentName:    null,
        opponentStoryId: null,
        opponentLevel:   null,
        opponentKmStart: null,
        opponentKmNow:   null,
        startDate: start,
        endDate:   end,
        status:    'waiting',
        winnerId:  null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return id;
    } catch (e) {
      console.warn('[FB] createChallenge:', e.message);
      return null;
    }
  }

  async function getChallenge(code) {
    if (!ok() || !code) return null;
    try {
      const doc = await db.collection('challenges')
        .doc(code.trim().toUpperCase()).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (e) { return null; }
  }

  async function joinChallenge(code, hero) {
    if (!ok()) return false;
    try {
      await db.collection('challenges').doc(code.toUpperCase()).update({
        opponentId:      hero.id,
        opponentName:    hero.name,
        opponentStoryId: hero.storyId || 'eroe1',
        opponentLevel:   hero.level   || 1,
        opponentKmStart: hero.totalKm || 0,
        opponentKmNow:   hero.totalKm || 0,
        status: 'active',
      });
      return true;
    } catch (e) {
      console.warn('[FB] joinChallenge:', e.message);
      return false;
    }
  }

  // Aggiorna i km dell'eroe nella sfida attiva, e verifica la scadenza
  async function updateChallenge(hero) {
    if (!ok() || !hero.cloud || !hero.cloud.activeChallenge) return;
    const { id, role } = hero.cloud.activeChallenge;
    const field = role === 'creator' ? 'creatorKmNow' : 'opponentKmNow';
    try {
      const doc = await db.collection('challenges').doc(id).get();
      if (!doc.exists) return;
      const data   = doc.data();
      const updates = { [field]: hero.totalKm || 0 };
      if (data.status === 'active' && new Date() > new Date(data.endDate + 'T23:59:59')) {
        const cDelta = (data.creatorKmNow  || 0) - (data.creatorKmStart  || 0);
        const oDelta = (data.opponentKmNow || 0) - (data.opponentKmStart || 0);
        updates.status   = 'completed';
        updates.winnerId = cDelta >= oDelta ? data.creatorId : data.opponentId;
      }
      await db.collection('challenges').doc(id).update(updates);
    } catch (e) { console.warn('[FB] updateChallenge:', e.message); }
  }

  async function deleteChallenge(id) {
    if (!ok()) return;
    try { await db.collection('challenges').doc(id).delete(); } catch (e) {}
  }

  /* ── Sistema Rivali ──────────────────────────────────────── */
  async function getHero(id) {
    if (!ok() || !id) return null;
    try {
      const doc = await db.collection('heroes').doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (e) { return null; }
  }

  async function sendChallengeInvite(challengeId, fromHero, toHeroId) {
    if (!ok()) return false;
    try {
      await db.collection('heroes').doc(toHeroId).update({
        pendingInvites: firebase.firestore.FieldValue.arrayUnion({
          challengeId,
          fromId:      fromHero.id,
          fromName:    fromHero.name,
          fromStoryId: fromHero.storyId || 'eroe1',
          fromLevel:   fromHero.level   || 1,
          sentAt:      new Date().toISOString(),
        }),
      });
      return true;
    } catch (e) { console.warn('[FB] sendChallengeInvite:', e.message); return false; }
  }

  async function getPendingInvites(heroId) {
    if (!ok() || !heroId) return [];
    try {
      const doc = await db.collection('heroes').doc(heroId).get();
      return doc.exists ? (doc.data().pendingInvites || []) : [];
    } catch (e) { return []; }
  }

  async function clearPendingInvite(heroId, challengeId) {
    if (!ok() || !heroId) return;
    try {
      const doc = await db.collection('heroes').doc(heroId).get();
      if (!doc.exists) return;
      const remaining = (doc.data().pendingInvites || []).filter(i => i.challengeId !== challengeId);
      await db.collection('heroes').doc(heroId).update({ pendingInvites: remaining });
    } catch (e) {}
  }

  return {
    syncHero,
    getLeaderboard,
    createChallenge,
    getChallenge,
    joinChallenge,
    updateChallenge,
    deleteChallenge,
    getHero,
    sendChallengeInvite,
    getPendingInvites,
    clearPendingInvite,
  };
})();
