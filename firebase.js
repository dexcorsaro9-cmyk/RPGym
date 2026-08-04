/* ══════════════════════════════════════════════════════════════
   Hero's Pace — Firebase helpers
   Classifica globale + Sfide PvP (Firestore)
   Tutte le sfide PvP sono archiviate nel documento heroes/{creatorId}
   (campi challengeCode + challengeData) per evitare problemi di regole
   sulla collection separata "challenges".
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
      }, { merge: true });
    } catch (e) { console.warn('[FB] syncHero:', e.message); }
  }

  /* ── Classifica ──────────────────────────────────────────── */
  async function getLeaderboard(n = 25) {
    if (!ok()) return null;
    try {
      const snap = await db.collection('heroes')
        .orderBy('totalKm', 'desc').limit(n).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('[FB] getLeaderboard:', e.message);
      return null;
    }
  }

  /* ── Sfide PvP — archiviate in heroes/{creatorId} ────────── */
  function _code() {
    const C = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += C[Math.floor(Math.random() * C.length)];
    return s;
  }

  // Crea sfida: salva challengeCode + challengeData nel doc del creatore
  async function createChallenge(hero) {
    if (!ok()) return null;
    const id    = _code();
    const start = new Date().toISOString().slice(0, 10);
    const end   = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    try {
      await db.collection('heroes').doc(hero.id).set({
        challengeCode: id,
        challengeData: {
          id,
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
          createdAt: new Date().toISOString(),
        },
      }, { merge: true });
      return id;
    } catch (e) {
      console.warn('[FB] createChallenge:', e.message);
      return null;
    }
  }

  // Legge sfida. Se creatorId è noto lo usa direttamente, altrimenti cerca per codice.
  async function getChallenge(code, creatorId) {
    if (!ok() || !code) return null;
    const normalized = code.trim().toUpperCase();
    try {
      if (creatorId) {
        const doc = await db.collection('heroes').doc(creatorId).get();
        if (!doc.exists) return null;
        const d = doc.data().challengeData;
        return (d && d.id === normalized) ? { id: d.id, ...d } : null;
      }
      // Fallback: ricerca per codice (richiede indice su challengeCode)
      const snap = await db.collection('heroes')
        .where('challengeCode', '==', normalized).limit(1).get();
      if (snap.empty) return null;
      const d = snap.docs[0].data().challengeData;
      return d ? { id: d.id, ...d } : null;
    } catch (e) {
      console.warn('[FB] getChallenge:', e.message);
      return null;
    }
  }

  // Accetta sfida: aggiorna il doc del creatore con i dati dell'avversario.
  // Ritorna { ok: true, creatorId } oppure false.
  async function joinChallenge(code, hero) {
    if (!ok()) return false;
    try {
      const snap = await db.collection('heroes')
        .where('challengeCode', '==', code.toUpperCase()).limit(1).get();
      if (snap.empty) return false;
      const creatorRef  = snap.docs[0].ref;
      const creatorDocId = snap.docs[0].id;
      const existing    = snap.docs[0].data().challengeData;
      if (!existing || existing.status !== 'waiting') return false;

      const updated = {
        ...existing,
        opponentId:      hero.id,
        opponentName:    hero.name,
        opponentStoryId: hero.storyId || 'eroe1',
        opponentLevel:   hero.level   || 1,
        opponentKmStart: hero.totalKm || 0,
        opponentKmNow:   hero.totalKm || 0,
        status: 'active',
      };
      await creatorRef.set({ challengeData: updated }, { merge: true });
      return { ok: true, creatorId: creatorDocId };
    } catch (e) {
      console.warn('[FB] joinChallenge:', e.message);
      return false;
    }
  }

  // Aggiorna i km nel doc del creatore. hero.cloud.activeChallenge.creatorId
  // è necessario per gli avversari.
  async function updateChallenge(hero) {
    if (!ok() || !hero.cloud || !hero.cloud.activeChallenge) return;
    const { id, role, creatorId } = hero.cloud.activeChallenge;
    const docId = role === 'creator' ? hero.id : (creatorId || null);
    if (!docId) return;
    const field = role === 'creator' ? 'creatorKmNow' : 'opponentKmNow';
    try {
      const doc = await db.collection('heroes').doc(docId).get();
      if (!doc.exists) return;
      const data = doc.data().challengeData;
      if (!data) return;

      const updates = { ...data, [field]: hero.totalKm || 0 };
      if (data.status === 'active' && new Date() > new Date(data.endDate + 'T23:59:59')) {
        const cKmNow = role === 'creator'  ? (hero.totalKm || 0) : (data.creatorKmNow  || 0);
        const oKmNow = role === 'opponent' ? (hero.totalKm || 0) : (data.opponentKmNow || 0);
        const cDelta = cKmNow - (data.creatorKmStart  || 0);
        const oDelta = oKmNow - (data.opponentKmStart || 0);
        updates.status   = 'completed';
        updates.winnerId = cDelta > oDelta ? data.creatorId : cDelta < oDelta ? data.opponentId : null;
      }
      await db.collection('heroes').doc(docId).set({ challengeData: updates }, { merge: true });
    } catch (e) { console.warn('[FB] updateChallenge:', e.message); }
  }

  // Elimina sfida: rimuove challengeCode e challengeData dal doc del creatore.
  // creatorId opzionale — se noto evita la query.
  async function deleteChallenge(id, creatorId) {
    if (!ok()) return;
    try {
      let ref = null;
      if (creatorId) {
        ref = db.collection('heroes').doc(creatorId);
      } else {
        const snap = await db.collection('heroes')
          .where('challengeCode', '==', String(id).toUpperCase()).limit(1).get();
        if (!snap.empty) ref = snap.docs[0].ref;
      }
      if (ref) {
        await ref.update({
          challengeCode: firebase.firestore.FieldValue.delete(),
          challengeData: firebase.firestore.FieldValue.delete(),
        });
      }
    } catch (e) { console.warn('[FB] deleteChallenge:', e.message); }
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
      await db.collection('heroes').doc(toHeroId).set({
        pendingInvites: firebase.firestore.FieldValue.arrayUnion({
          challengeId,
          fromId:      fromHero.id,
          fromName:    fromHero.name,
          fromStoryId: fromHero.storyId || 'eroe1',
          fromLevel:   fromHero.level   || 1,
          sentAt:      new Date().toISOString(),
        }),
      }, { merge: true });
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
      const ref = db.collection('heroes').doc(heroId);
      await db.runTransaction(async tx => {
        const doc = await tx.get(ref);
        if (!doc.exists) return;
        const remaining = (doc.data().pendingInvites || []).filter(i => i.challengeId !== challengeId);
        tx.update(ref, { pendingInvites: remaining });
      });
    } catch (e) {}
  }

  /* ── Gilde ───────────────────────────────────────────────── */

  function _guildCode() {
    const C = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += C[Math.floor(Math.random() * C.length)];
    return s;
  }

  function _weekStart() {
    const d = new Date();
    const dow = (d.getDay() + 6) % 7;
    const mon = new Date(d);
    mon.setDate(d.getDate() - dow);
    return mon.toISOString().slice(0, 10);
  }

  async function createGuild(hero, { name, tag, emblem, description, isPublic }) {
    if (!ok()) return { error: 'offline' };
    const guildId = 'g' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
    const inviteCode = _guildCode();
    const batch = db.batch();
    const guildRef = db.collection('guilds').doc(guildId);
    const memberRef = guildRef.collection('members').doc(hero.id);
    batch.set(guildRef, {
      name, tag: tag.toUpperCase(), emblem, description,
      founderHeroId: hero.id, founderName: hero.name,
      level: 1, totalKm: 0, weeklyKm: 0, weekStart: _weekStart(),
      memberCount: 1, maxMembers: 20, inviteCode, isPublic: !!isPublic,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    batch.set(memberRef, {
      heroId: hero.id, heroName: hero.name,
      storyId: hero.storyId || 'eroe1', level: hero.level || 1,
      role: 'founder', weeklyKm: 0, totalKm: 0, weekStart: _weekStart(),
      lastActive: firebase.firestore.FieldValue.serverTimestamp(),
    });
    try {
      await batch.commit();
      return { ok: true, guildId, inviteCode };
    } catch (e) { return { error: e.message }; }
  }

  async function joinGuildByCode(hero, code) {
    if (!ok()) return { error: 'offline' };
    const normalized = code.trim().toUpperCase();
    try {
      const snap = await db.collection('guilds')
        .where('inviteCode', '==', normalized).limit(1).get();
      if (snap.empty) return { error: 'not_found' };
      const guildDoc = snap.docs[0];
      const guildId  = guildDoc.id;
      const data     = guildDoc.data();
      if ((data.memberCount || 0) >= (data.maxMembers || 20)) return { error: 'full' };
      const memberRef = db.collection('guilds').doc(guildId)
                          .collection('members').doc(hero.id);
      const existing  = await memberRef.get();
      if (existing.exists) return { error: 'already_member' };
      const batch = db.batch();
      batch.set(memberRef, {
        heroId: hero.id, heroName: hero.name,
        storyId: hero.storyId || 'eroe1', level: hero.level || 1,
        role: 'member', weeklyKm: 0, totalKm: 0, weekStart: _weekStart(),
        lastActive: firebase.firestore.FieldValue.serverTimestamp(),
      });
      batch.update(guildDoc.ref, {
        memberCount: firebase.firestore.FieldValue.increment(1),
      });
      await batch.commit();
      return { ok: true, guildId, name: data.name, emblem: data.emblem, tag: data.tag };
    } catch (e) { return { error: e.message }; }
  }

  async function leaveGuild(hero) {
    if (!ok() || !hero.guild) return;
    const { guildId, role } = hero.guild;
    try {
      const guildRef  = db.collection('guilds').doc(guildId);
      const memberRef = guildRef.collection('members').doc(hero.id);
      if (role === 'founder') {
        // Dissolve guild: delete all members then guild doc
        const members = await guildRef.collection('members').get();
        const batch   = db.batch();
        members.forEach(m => batch.delete(m.ref));
        batch.delete(guildRef);
        await batch.commit();
      } else {
        const batch = db.batch();
        batch.delete(memberRef);
        batch.update(guildRef, {
          memberCount: firebase.firestore.FieldValue.increment(-1),
        });
        await batch.commit();
      }
    } catch (e) { console.warn('[FB] leaveGuild:', e.message); }
  }

  async function getGuild(guildId) {
    if (!ok() || !guildId) return null;
    try {
      const doc = await db.collection('guilds').doc(guildId).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (e) { return null; }
  }

  async function getGuildMembers(guildId) {
    if (!ok() || !guildId) return [];
    try {
      const snap = await db.collection('guilds').doc(guildId)
        .collection('members').orderBy('weeklyKm', 'desc').limit(30).get();
      return snap.docs.map(d => d.data());
    } catch (e) { return []; }
  }

  async function searchGuilds(query) {
    if (!ok()) return [];
    try {
      // Cerca per nome (prefix match non supportato nativamente — usa isPublic=true + client-side filter)
      const snap = await db.collection('guilds')
        .where('isPublic', '==', true)
        .orderBy('totalKm', 'desc').limit(50).get();
      const q = (query || '').toLowerCase();
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(g => !q || g.name.toLowerCase().includes(q) || (g.tag || '').toLowerCase().includes(q));
    } catch (e) { return []; }
  }

  async function contributeToGuild(hero, kmAdded) {
    if (!ok() || !hero.guild || !(kmAdded > 0)) return;
    const { guildId } = hero.guild;
    const ws = _weekStart();
    try {
      const memberRef = db.collection('guilds').doc(guildId)
                          .collection('members').doc(hero.id);
      const guildRef  = db.collection('guilds').doc(guildId);
      await db.runTransaction(async tx => {
        const mDoc = await tx.get(memberRef);
        if (!mDoc.exists) return;
        const m = mDoc.data();
        const weeklyKm = (m.weekStart === ws ? (m.weeklyKm || 0) : 0) + kmAdded;
        tx.update(memberRef, {
          weeklyKm, weekStart: ws,
          totalKm: firebase.firestore.FieldValue.increment(kmAdded),
          heroName: hero.name, level: hero.level || 1,
          lastActive: firebase.firestore.FieldValue.serverTimestamp(),
        });
        tx.update(guildRef, {
          totalKm: firebase.firestore.FieldValue.increment(kmAdded),
          weeklyKm: firebase.firestore.FieldValue.increment(kmAdded),
        });
      });
    } catch (e) { console.warn('[FB] contributeToGuild:', e.message); }
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
    createGuild,
    joinGuildByCode,
    leaveGuild,
    getGuild,
    getGuildMembers,
    searchGuilds,
    contributeToGuild,
  };
})();
