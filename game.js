/* ═══════════════════════════════════════════════════════════════
   RPGym — Logica di gioco
   Tutto lo stato è salvato in localStorage. Ogni eroe ha il suo
   salvataggio; le funzioni qui non toccano il DOM.
   ═══════════════════════════════════════════════════════════════ */

const RPG = (() => {

  const SAVE_KEY = 'rpgym_save_v1';

  /* ── Attività: moltiplicatori XP per km ───────────────────── */
  const ACTIVITIES = {
    cyclette:  { label: 'Cyclette',  icon: '🚴', xpPerKm: 10, maxKmSession: 60 },
    camminata: { label: 'Camminata', icon: '🚶', xpPerKm: 15, maxKmSession: 40 },
    corsa:     { label: 'Corsa',     icon: '🏃', xpPerKm: 30, maxKmSession: 30 },
  };
  const GOLD_PER_KM = 5;
  const MEMORY_FRAGMENT_KM = 20;   // ogni 20 km → un Frammento di Memoria
  const LOOT_BAG_KM = 5;           // ogni 5 km → un Sacco del Viaggiatore

  /* ── Curva di progressione (sovraccarico progressivo) ─────── */
  // XP necessari per passare dal livello L al successivo
  function xpForLevel(level) {
    return Math.round(60 * Math.pow(level, 1.4));
  }
  // Obiettivo giornaliero consigliato in km, per fascia di livello
  function dailyGoalKm(level) {
    if (level <= 5)  return 5;
    if (level <= 10) return 8;
    if (level <= 15) return 12;
    return 15;
  }
  const LEVEL_CAP_1 = 20; // primo tetto: serve l'Amuleto del Viaggiatore Esperto

  /* ── Titoli dell'eroe ─────────────────────────────────────── */
  function heroTitle(level) {
    if (level >= 20) return 'Campione di Oakhaven';
    if (level >= 15) return 'Cavaliere Errante';
    if (level >= 10) return 'Guardiano del Santuario';
    if (level >= 5)  return 'Pioniere';
    return 'Novizio Viandante';
  }

  /* ── Loot table (Sacco del Viaggiatore, ogni 5 km) ────────── */
  const LOOT_TABLE = [
    { name: 'Pugnale di Rame',            icon: '🗡️', rarity: 'comune',     weight: 20 },
    { name: 'Scudo di Quercia',           icon: '🛡️', rarity: 'comune',     weight: 20 },
    { name: 'Bacche Selvatiche',          icon: '🫐', rarity: 'comune',     weight: 18 },
    { name: 'Mantello Rattoppato',        icon: '🧥', rarity: 'comune',     weight: 14 },
    { name: 'Anello di Ferro',            icon: '💍', rarity: 'raro',       weight: 9 },
    { name: 'Arco del Cacciatore',        icon: '🏹', rarity: 'raro',       weight: 8 },
    { name: 'Pozione di Vigore',          icon: '🧪', rarity: 'raro',       weight: 6 },
    { name: 'Spadone dell\'Antico Ordine',icon: '⚔️', rarity: 'epico',      weight: 3 },
    { name: 'Amuleto della Cometa',       icon: '🌠', rarity: 'epico',      weight: 1.5 },
    { name: 'Frammento di Metallo Celeste', icon: '✨', rarity: 'leggendario', weight: 0.5 },
  ];

  /* ── Missioni della storia ────────────────────────────────── */
  const MISSIONS = [
    { id: 'macerie',   zone: 'Rovine di Oakhaven', name: 'Tra le Macerie',
      km: 5,  minLevel: 1,
      desc: 'Esplora la tua vecchia casa distrutta in cerca di equipaggiamento.',
      reward: { gold: 30, wood: 10, item: 'Spada Arrugginita del Padre' } },
    { id: 'simbolo',   zone: 'Rovine di Oakhaven', name: 'Il Simbolo Misterioso',
      km: 10, minLevel: 2, requires: 'macerie',
      desc: 'Nella piazza principale trovi uno stendardo bruciato: di chi è quello stemma?',
      reward: { gold: 50, stone: 10, card: 'card_stemma' } },
    { id: 'fuga',      zone: 'Rovine di Oakhaven', name: 'Fuga dalle Mura',
      km: 15, minLevel: 3, requires: 'simbolo',
      desc: 'I mostri rimasti ti hanno visto! Semina l\'Orda e fuggi oltre le mura.',
      reward: { gold: 80, wood: 20, unlocks: 'worldmap', card: 'card_fuga' } },
    { id: 'foresta1',  zone: 'Foresta Sussurrante', name: 'Sentieri Ombrosi',
      km: 8,  minLevel: 5, requires: 'fuga',
      desc: 'Gli alberi sussurrano segreti antichi. Raccogli legname pregiato.',
      reward: { gold: 60, wood: 40 } },
    { id: 'santuario', zone: 'Foresta Sussurrante', name: 'Il Santuario Dimenticato',
      km: 15, minLevel: 9, requires: 'foresta1',
      desc: 'L\'Orda vuole corrompere il Santuario delle creature magiche. Arriva prima tu!',
      reward: { gold: 100, unlocks: 'companion', card: 'card_lupo' } },
    { id: 'miniera',   zone: 'Foresta Sussurrante', name: 'La Miniera dei Goblin',
      km: 12, minLevel: 6, requires: 'fuga',
      desc: 'Una vecchia miniera infestata di goblin. Dentro c\'è pietra in abbondanza.',
      reward: { gold: 70, stone: 40 } },
    { id: 'goblin',    zone: 'Foresta Sussurrante', name: 'Il Generale dei Goblin',
      km: 20, minLevel: 12, requires: 'miniera',
      desc: 'Il primo luogotenente dell\'Orda ti sbarra la strada. Sconfiggilo!',
      reward: { gold: 150, card: 'card_goblin', unlocks: 'deserto' } },
    { id: 'deserto1',  zone: 'Deserto di Ruggine', name: 'Sabbie Meccaniche',
      km: 15, minLevel: 13, requires: 'goblin',
      desc: 'Antichi costrutti giacciono sepolti nella sabbia rossa.',
      reward: { gold: 120, stone: 50 } },
    { id: 'golem',     zone: 'Deserto di Ruggine', name: 'Il Generale dei Golem',
      km: 25, minLevel: 16, requires: 'deserto1',
      desc: 'Un colosso di pietra e ingranaggi custodisce il passo verso le montagne.',
      reward: { gold: 250, card: 'card_golem' } },
    { id: 'amuleto',   zone: 'Deserto di Ruggine', name: 'L\'Amuleto del Viaggiatore Esperto',
      km: 30, minLevel: 19, requires: 'golem',
      desc: 'Forgia l\'amuleto che spezza il sigillo del Livello 20. Il Drago ti attende oltre.',
      reward: { gold: 300, unlocks: 'ascension', card: 'card_amuleto' } },
  ];

  /* ── Carte collezionabili (stile Pokémon/Magic) ───────────── */
  const CARDS = {
    card_inizio:  { name: 'Il Primo Passo',        icon: '👣', rarity: 'comune',
      lore: 'Ottenuta al primo allenamento. Ogni leggenda inizia con un passo.' },
    card_stemma:  { name: 'Lo Stemma Bruciato',    icon: '🏴', rarity: 'raro',
      lore: 'Un artiglio alato su campo nero. Chi porta questo simbolo?' },
    card_fuga:    { name: 'Oltre le Mura',         icon: '🌄', rarity: 'raro',
      lore: 'L\'ombra del drago passò sopra di te, oscurando il sole.' },
    card_casa:    { name: 'Radici Nuove',          icon: '🏡', rarity: 'raro',
      lore: 'Dal falò alla capanna: hai dimostrato la tua costanza.' },
    card_lupo:    { name: 'Il Lupo Astrale',       icon: '🐺', rarity: 'epico',
      lore: 'Una creatura di pura luce ti ha scelto come compagno.' },
    card_goblin:  { name: 'Caduta del Generale Goblin', icon: '👺', rarity: 'epico',
      lore: 'Il primo luogotenente dell\'Orda è caduto sotto i tuoi colpi.' },
    card_golem:   { name: 'Cuore di Pietra Spento', icon: '🗿', rarity: 'epico',
      lore: 'Gli ingranaggi del colosso si sono fermati per sempre.' },
    card_amuleto: { name: 'L\'Amuleto del Viaggiatore Esperto', icon: '🔮', rarity: 'leggendario',
      lore: 'Il sigillo è spezzato. Il tuo destino ora è tra le nuvole, sul dorso del Drago.' },
    card_50km:    { name: 'Esploratore delle Terre Selvagge', icon: '🥾', rarity: 'raro',
      lore: '50 km percorsi. Le tue gambe raccontano storie.' },
    card_100km:   { name: 'Ciclista del Vento',    icon: '🌪️', rarity: 'epico',
      lore: '100 km totali. Nemmeno il vento riesce a starti dietro.' },
    card_memoria: { name: 'Il Cavaliere del Drago', icon: '🐉', rarity: 'leggendario',
      lore: 'Ora conosci il volto del nemico. E lui conosce il tuo.' },
  };

  /* ── Strutture della casa (sbloccate al livello 5) ────────── */
  const BUILDINGS = [
    { id: 'fondamenta', name: 'Capanna del Pioniere', icon: '🛖',
      cost: { wood: 30, stone: 10 }, minLevel: 5,
      desc: 'Le prime mura di casa tua. Addio, falò all\'aperto!' },
    { id: 'baule',      name: 'Baule del Bottino',    icon: '🧰',
      cost: { wood: 20, stone: 5 },  minLevel: 5, requires: 'fondamenta',
      desc: 'Uno spazio dove custodire il tuo loot.' },
    { id: 'letto',      name: 'Letto di Pelli',       icon: '🛏️',
      cost: { wood: 25, stone: 0 },  minLevel: 6, requires: 'fondamenta',
      desc: 'Riposo profondo: +10% oro da ogni allenamento.',
      bonus: { goldMult: 0.10 } },
    { id: 'muro',       name: 'Muro di Recinzione',   icon: '🧱',
      cost: { wood: 10, stone: 40 }, minLevel: 7, requires: 'fondamenta',
      desc: 'Protegge il rifugio dalle incursioni dell\'Orda.' },
    { id: 'fucina',     name: 'Fucina Elementale',    icon: '⚒️',
      cost: { wood: 40, stone: 60 }, minLevel: 11, requires: 'muro',
      desc: 'Le tue armi brillano di potere: +10% XP da ogni allenamento.',
      bonus: { xpMult: 0.10 } },
    { id: 'lab',        name: 'Laboratorio Alchemico', icon: '⚗️',
      cost: { wood: 50, stone: 50 }, minLevel: 13, requires: 'fucina',
      desc: 'Pozioni e distillati: +10% legna e pietra raccolte.',
      bonus: { resMult: 0.10 } },
  ];

  /* ── Stato ────────────────────────────────────────────────── */
  function newHero(name, avatar) {
    return {
      id: 'h' + Date.now(),
      name, avatar,
      level: 1, xp: 0,
      gold: 0, wood: 0, stone: 0,
      totalKm: 0,
      kmByType: { cyclette: 0, camminata: 0, corsa: 0 },
      lootBagsOpened: 0,
      fragmentsFound: 0,
      inventory: [],
      cards: [],
      buildings: [],
      missionsDone: [],
      activeMission: null,      // { id, progressKm }
      companion: false,         // Lupo Astrale (liv. 10)
      ascended: false,
      restBonus: false,         // prossimo allenamento x2
      restDaysThisWeek: 0,
      weekStamp: weekStamp(),
      lastWorkoutDay: null,
      log: [],                  // storico allenamenti
      created: Date.now(),
    };
  }

  function weekStamp() {
    const d = new Date();
    const onejan = new Date(d.getFullYear(), 0, 1);
    return d.getFullYear() + '-' + Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  }
  function todayStamp() { return new Date().toISOString().slice(0, 10); }

  function load() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || { heroes: [], current: null, claimedEvents: [] }; }
    catch { return { heroes: [], current: null, claimedEvents: [] }; }
  }
  function save(state) { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }

  /* ── Meccaniche ───────────────────────────────────────────── */

  function pickLoot() {
    const total = LOOT_TABLE.reduce((s, l) => s + l.weight, 0);
    let r = Math.random() * total;
    for (const l of LOOT_TABLE) { r -= l.weight; if (r <= 0) return l; }
    return LOOT_TABLE[0];
  }

  function buildingBonus(hero, key) {
    return BUILDINGS
      .filter(b => hero.buildings.includes(b.id) && b.bonus && b.bonus[key])
      .reduce((s, b) => s + b.bonus[key], 0);
  }

  // Valida una sessione: anti-baro "lore-based"
  function validateSession(type, km) {
    const act = ACTIVITIES[type];
    if (!act) return 'Attività sconosciuta.';
    if (!(km > 0)) return 'Inserisci una distanza valida, giovane eroe.';
    if (km > act.maxKmSession)
      return `Il Custode del Tempo aggrotta la fronte: ${km} km di ${act.label.toLowerCase()} in una sessione? ` +
             `Il tuo eroe ha preso un passaggio su un carro troppo veloce! Questo movimento non conta come addestramento.`;
    return null;
  }

  /**
   * Registra un allenamento. Ritorna un report con tutto ciò che è
   * successo (XP, oro, loot, livelli, frammenti, missione, carte…).
   */
  function logWorkout(hero, type, km) {
    const err = validateSession(type, km);
    if (err) return { error: err };

    const act = ACTIVITIES[type];
    const report = { km, type, levelsGained: [], loot: [], cards: [], fragments: 0, unlocks: [] };

    // Bonus riposo (x2) e compagno (+10% km efficaci)
    let effKm = km;
    if (hero.companion) effKm *= 1.10;
    let mult = 1;
    if (hero.restBonus) { mult = 2; hero.restBonus = false; report.restBonusUsed = true; }

    // XP e oro
    const xpMult = 1 + buildingBonus(hero, 'xpMult');
    const goldMult = 1 + buildingBonus(hero, 'goldMult');
    const resMult = 1 + buildingBonus(hero, 'resMult');
    report.xp = Math.round(effKm * act.xpPerKm * mult * xpMult);
    report.gold = Math.round(effKm * GOLD_PER_KM * mult * goldMult);
    hero.xp += report.xp;
    hero.gold += report.gold;

    // Materiali (casuali, proporzionali ai km)
    report.wood = Math.round((effKm * (1 + Math.random())) * resMult);
    report.stone = Math.round((effKm * Math.random()) * resMult);
    hero.wood += report.wood;
    hero.stone += report.stone;

    // Km totali
    hero.totalKm += km;
    hero.kmByType[type] = (hero.kmByType[type] || 0) + km;
    hero.lastWorkoutDay = todayStamp();
    hero.log.unshift({ date: Date.now(), type, km, xp: report.xp });
    if (hero.log.length > 100) hero.log.pop();

    // Livelli
    while (hero.xp >= xpForLevel(hero.level) && (hero.level < LEVEL_CAP_1 || hero.ascended)) {
      hero.xp -= xpForLevel(hero.level);
      hero.level++;
      report.levelsGained.push(hero.level);
      if (hero.level === 5 && !hero.cards.includes('card_casa')) {
        hero.cards.push('card_casa'); report.cards.push('card_casa');
        report.unlocks.push('🏡 Livello 5! Puoi costruire la tua casa nel Rifugio.');
      }
    }
    if (hero.level >= LEVEL_CAP_1 && !hero.ascended &&
        hero.xp >= xpForLevel(hero.level)) {
      report.capReached = true; // XP congelati al cap
      hero.xp = xpForLevel(hero.level); // non oltre
    }

    // Sacchi del Viaggiatore (ogni 5 km cumulativi)
    const bagsDue = Math.floor(hero.totalKm / LOOT_BAG_KM);
    while (hero.lootBagsOpened < bagsDue) {
      hero.lootBagsOpened++;
      const item = pickLoot();
      hero.inventory.push(item.name);
      report.loot.push(item);
    }

    // Frammenti di Memoria (ogni 20 km, max 5)
    const fragsDue = Math.min(5, Math.floor(hero.totalKm / MEMORY_FRAGMENT_KM));
    if (fragsDue > hero.fragmentsFound) {
      report.fragments = fragsDue - hero.fragmentsFound;
      hero.fragmentsFound = fragsDue;
      if (hero.fragmentsFound === 5 && !hero.cards.includes('card_memoria')) {
        hero.cards.push('card_memoria'); report.cards.push('card_memoria');
        report.unlocks.push('🐉 Le memorie sono complete: il volto del Cavaliere del Drago è stato rivelato!');
      }
    }

    // Carte traguardo
    if (hero.log.length === 1 && !hero.cards.includes('card_inizio')) {
      hero.cards.push('card_inizio'); report.cards.push('card_inizio');
    }
    if (hero.totalKm >= 50 && !hero.cards.includes('card_50km')) {
      hero.cards.push('card_50km'); report.cards.push('card_50km');
    }
    if (hero.totalKm >= 100 && !hero.cards.includes('card_100km')) {
      hero.cards.push('card_100km'); report.cards.push('card_100km');
    }

    // Progresso missione attiva
    if (hero.activeMission) {
      const m = MISSIONS.find(x => x.id === hero.activeMission.id);
      hero.activeMission.progressKm += km;
      if (m && hero.activeMission.progressKm >= m.km) {
        report.missionComplete = m;
        completeMission(hero, m, report);
      } else if (m) {
        report.missionProgress = { mission: m, done: hero.activeMission.progressKm };
      }
    }

    return report;
  }

  function completeMission(hero, m, report) {
    hero.missionsDone.push(m.id);
    hero.activeMission = null;
    const r = m.reward || {};
    if (r.gold)  hero.gold += r.gold;
    if (r.wood)  hero.wood += r.wood;
    if (r.stone) hero.stone += r.stone;
    if (r.item)  hero.inventory.push(r.item);
    if (r.card && !hero.cards.includes(r.card)) {
      hero.cards.push(r.card); report.cards.push(r.card);
    }
    if (r.unlocks === 'companion' && !hero.companion) {
      hero.companion = true;
      report.unlocks.push('🐺 EVENTO DEL RISVEGLIO! Il Lupo Astrale ti ha scelto: è la tua cavalcatura in missione (+10% km) e il tuo compagno al Rifugio.');
    }
    if (r.unlocks === 'ascension') {
      hero.ascended = true;
      report.unlocks.push('🔮 ASCENSIONE! Il sigillo del Livello 20 è spezzato: puoi crescere di nuovo. Il Drago ti attende.');
    }
    if (r.unlocks === 'worldmap') {
      report.unlocks.push('🗺️ La Mappa del Mondo è sbloccata! Nuove zone ti attendono.');
    }
  }

  function availableMissions(hero) {
    return MISSIONS.filter(m =>
      !hero.missionsDone.includes(m.id) &&
      hero.level >= m.minLevel &&
      (!m.requires || hero.missionsDone.includes(m.requires))
    );
  }

  function startMission(hero, id) {
    const m = MISSIONS.find(x => x.id === id);
    if (!m) return false;
    hero.activeMission = { id, progressKm: 0 };
    return true;
  }

  function canBuild(hero, b) {
    if (hero.buildings.includes(b.id)) return 'costruito';
    if (hero.level < b.minLevel) return `livello ${b.minLevel}`;
    if (b.requires && !hero.buildings.includes(b.requires)) return 'requisito';
    if (hero.wood < b.cost.wood || hero.stone < b.cost.stone) return 'risorse';
    return 'ok';
  }

  function build(hero, id) {
    const b = BUILDINGS.find(x => x.id === id);
    if (!b || canBuild(hero, b) !== 'ok') return false;
    hero.wood -= b.cost.wood;
    hero.stone -= b.cost.stone;
    hero.buildings.push(b.id);
    return true;
  }

  function declareRestDay(hero) {
    const ws = weekStamp();
    if (hero.weekStamp !== ws) { hero.weekStamp = ws; hero.restDaysThisWeek = 0; }
    if (hero.restDaysThisWeek >= 2) return 'Hai già usato i tuoi 2 Giorni di Riposo questa settimana!';
    if (hero.restBonus) return 'Hai già un Bonus Riposo attivo: usalo prima!';
    hero.restDaysThisWeek++;
    hero.restBonus = true;
    return null;
  }

  /* ── Taglie Uniche (eventi condivisi: primo che arriva vince) ── */
  // Generate in modo deterministico dalla settimana: uguali per tutti
  // gli eroi sul dispositivo. Il primo che completa la reclama.
  function weeklyEvent(state) {
    const ws = weekStamp();
    const seed = [...ws].reduce((s, c) => s + c.charCodeAt(0), 0);
    const pool = [
      { name: 'La Stella Cadente',      icon: '🌠', km: 8,  skin: 'Aura di Scintille Dorate' },
      { name: 'Il Mercante Fantasma',   icon: '👻', km: 10, skin: 'Mantello Spettrale' },
      { name: 'L\'Eclissi di Mezzanotte', icon: '🌘', km: 12, skin: 'Stendardo dell\'Eclissi' },
      { name: 'La Cometa Cremisi',      icon: '☄️', km: 9,  skin: 'Criniera di Fuoco per il Destriero' },
    ];
    const ev = pool[seed % pool.length];
    const claimed = (state.claimedEvents || []).find(c => c.week === ws);
    return { ...ev, week: ws, claimedBy: claimed ? claimed.heroName : null };
  }

  function claimEvent(state, hero, ev) {
    state.claimedEvents = state.claimedEvents || [];
    if (state.claimedEvents.find(c => c.week === ev.week)) return false;
    state.claimedEvents.push({ week: ev.week, heroName: hero.name, skin: ev.skin });
    hero.inventory.push('🏆 ' + ev.skin + ' (Esclusiva Evento)');
    return true;
  }

  return {
    ACTIVITIES, MISSIONS, CARDS, BUILDINGS, LOOT_TABLE,
    LEVEL_CAP_1, GOLD_PER_KM,
    xpForLevel, dailyGoalKm, heroTitle,
    newHero, load, save,
    logWorkout, availableMissions, startMission,
    canBuild, build, declareRestDay,
    weeklyEvent, claimEvent, buildingBonus,
  };
})();
