/* ═══════════════════════════════════════════════════════════════
   RPGym — Logica di gioco (v2.0)
   Tutto lo stato è salvato in localStorage. Ogni eroe ha il suo
   salvataggio; le funzioni qui non toccano il DOM.
   ═══════════════════════════════════════════════════════════════ */

const RPG = (() => {

  const SAVE_KEY = 'rpgym_save_v1';
  const MAX_LEVEL = 100;
  const LEVEL_CAP_1 = 20; // sigillo: serve l'Amuleto del Viaggiatore Esperto

  /* ── Attività: moltiplicatori XP per km ───────────────────── */
  const ACTIVITIES = {
    cyclette:  { label: 'Cyclette',  icon: '🚴', xpPerKm: 10, maxKmSession: 60 },
    camminata: { label: 'Camminata', icon: '🚶', xpPerKm: 15, maxKmSession: 40 },
    corsa:     { label: 'Corsa',     icon: '🏃', xpPerKm: 30, maxKmSession: 30 },
  };
  const GOLD_PER_KM = 5;
  const MEMORY_FRAGMENT_KM = 20;   // ogni 20 km → un Frammento di Memoria
  const LOOT_BAG_KM = 5;           // ogni 5 km → un Sacco del Viaggiatore

  /* ── Curva di progressione ────────────────────────────────── */
  function xpForLevel(level) {
    return Math.round(60 * Math.pow(level, 1.25));
  }
  function dailyGoalKm(level) {
    if (level <= 5)  return 5;
    if (level <= 10) return 8;
    if (level <= 15) return 12;
    if (level <= 20) return 15;
    return Math.min(30, 15 + Math.floor((level - 20) / 10) * 2);
  }

  function heroTitle(level) {
    if (level >= 95) return 'Leggenda dei Cristalli';
    if (level >= 80) return 'Ammazzadraghi';
    if (level >= 65) return 'Signore delle Vette';
    if (level >= 50) return 'Campione del Reame';
    if (level >= 35) return 'Maestro Alchimista di Guerra';
    if (level >= 20) return 'Campione di Oakhaven';
    if (level >= 15) return 'Cavaliere Errante';
    if (level >= 10) return 'Guardiano del Santuario';
    if (level >= 5)  return 'Pioniere';
    return 'Novizio Viandante';
  }

  /* ── I 20 Biomi (livelli 1-100) ───────────────────────────── */
  const BIOMES = [
    { name: 'Rovine di Oakhaven',        min: 1,  max: 4,   icon: '🏚️' },
    { name: 'Foresta Sussurrante',       min: 5,  max: 10,  icon: '🌲' },
    { name: 'Il Giardino Lastricato',    min: 11, max: 15,  icon: '🌿' },
    { name: 'Il Ponte del Pedaggio',     min: 16, max: 20,  icon: '🌉' },
    { name: 'L\'Antico Archivio',        min: 21, max: 25,  icon: '📚' },
    { name: 'Le Fucine di Ruggine',      min: 26, max: 30,  icon: '⚙️' },
    { name: 'La Torre dell\'Alchimista', min: 31, max: 35,  icon: '⚗️' },
    { name: 'La Cripta dell\'Orologiaio', min: 36, max: 40, icon: '🕰️' },
    { name: 'La Baia del Corallo',       min: 41, max: 45,  icon: '🪸' },
    { name: 'Il Fossato Profondo',       min: 46, max: 50,  icon: '🕳️' },
    { name: 'Le Fognature del Reame',    min: 51, max: 55,  icon: '🐀' },
    { name: 'La Costa del Relitto',      min: 56, max: 60,  icon: '⚓' },
    { name: 'Il Picco Innevato',         min: 61, max: 65,  icon: '🏔️' },
    { name: 'Il Deserto di Cenere',      min: 66, max: 70,  icon: '🌋' },
    { name: 'La Palude Sabbiosa',        min: 71, max: 75,  icon: '🦎' },
    { name: 'Il Cimitero dei Draghi',    min: 76, max: 80,  icon: '🐉' },
    { name: 'Miniere del Corruttore',    min: 81, max: 85,  icon: '⛏️' },
    { name: 'Sala del Trono Corrotto',   min: 86, max: 90,  icon: '👑' },
    { name: 'L\'Abisso del Vuoto',       min: 91, max: 94,  icon: '🌑' },
    { name: 'La Valle dei Cristalli Oscuri', min: 95, max: 100, icon: '🔮' },
  ];

  function currentBiome(level) {
    return BIOMES.find(b => level >= b.min && level <= b.max) || BIOMES[BIOMES.length - 1];
  }
  function accessibleZones(hero) {
    return BIOMES.filter(b => hero.level >= b.min).map(b => b.name);
  }

  /* ── Le 20 Cavalcature (livelli 5-100) ────────────────────── */
  // bonus = % di km "virtuali" in più a ogni allenamento
  const MOUNTS = [
    { id: 'asinello',   level: 5,   name: 'L\'Asinello da Soma',            emoji: '🫏' },
    { id: 'pony',       level: 10,  name: 'Il Pony delle Brughiere',        emoji: '🐴' },
    { id: 'caprone',    level: 15,  name: 'Il Caprone di Montagna',         emoji: '🐐' },
    { id: 'cervo',      level: 20,  name: 'Il Grande Cervo delle Foreste',  emoji: '🦌' },
    { id: 'mulo',       level: 25,  name: 'Il Mulo da Carovana',            emoji: '🐴' },
    { id: 'acquatico',  level: 30,  name: 'Il Destriero Acquatico',         emoji: '🌊' },
    { id: 'caccia',     level: 35,  name: 'Il Cavallo da Caccia',           emoji: '🐎' },
    { id: 'lupo',       level: 40,  name: 'Il Grande Lupo del Nord',        emoji: '🐺' },
    { id: 'cinghiale',  level: 45,  name: 'Il Cinghiale Corazzato',         emoji: '🐗' },
    { id: 'orso',       level: 50,  name: 'L\'Orso Bruno da Montagna',      emoji: '🐻' },
    { id: 'yak',        level: 55,  name: 'Lo Yak delle Nevi',              emoji: '🐃' },
    { id: 'purosangue', level: 60,  name: 'Il Cavallo di Pura Razza Reale', emoji: '🏇' },
    { id: 'leone',      level: 65,  name: 'Il Leone della Savana Corazzato', emoji: '🦁' },
    { id: 'alce',       level: 70,  name: 'L\'Alce Gigante della Tundra',   emoji: '🫎' },
    { id: 'bisonte',    level: 75,  name: 'Il Bisonte delle Pianure',       emoji: '🦬' },
    { id: 'grifone',    level: 80,  name: 'Il Grifone Imperiale',           emoji: '🦅' },
    { id: 'spettrale',  level: 85,  name: 'Il Destriero Spettrale',         emoji: '👻' },
    { id: 'dragoterra', level: 90,  name: 'Il Drago di Terra',              emoji: '🐲' },
    { id: 'cervastro',  level: 95,  name: 'Il Cervo Astrale',               emoji: '✨' },
    { id: 'chimera',    level: 100, name: 'La Chimera di Luce',             emoji: '🌟' },
  ];
  MOUNTS.forEach(m => {
    m.price = Math.round(15 * Math.pow(m.level, 1.8) / 10) * 10;
    m.bonus = Math.round(3 + m.level * 0.45);
  });
  function mountById(id) { return MOUNTS.find(m => m.id === id); }

  /* ── Rarità e loot ────────────────────────────────────────── */
  const RARITIES = {
    comune:      { label: 'Comune',      weight: 60,  xp: 1,  value: 10,   minLevel: 1  },
    non_comune:  { label: 'Non Comune',  weight: 22,  xp: 2,  value: 25,   minLevel: 1  },
    raro:        { label: 'Raro',        weight: 10,  xp: 4,  value: 60,   minLevel: 1  },
    epico:       { label: 'Epico',       weight: 5,   xp: 7,  value: 150,  minLevel: 16 },
    leggendario: { label: 'Leggendario', weight: 2,   xp: 12, value: 400,  minLevel: 31 },
    divino:      { label: 'Divino',      weight: 0.5, xp: 20, value: 1000, minLevel: 51 },
    oscuro:      { label: 'Oscuro',      weight: 0.5, xp: 30, value: 2500, minLevel: 76 },
  };

  const SLOTS = {
    arma:     { label: 'Arma',     icon: '⚔️' },
    scudo:    { label: 'Scudo',    icon: '🛡️' },
    elmo:     { label: 'Elmo',     icon: '🪖' },
    armatura: { label: 'Armatura', icon: '🥋' },
    anello:   { label: 'Anello',   icon: '💍' },
    amuleto:  { label: 'Amuleto',  icon: '📿' },
  };

  const ITEM_BASES = {
    arma:     ['Spada', 'Ascia', 'Arco', 'Martello', 'Lancia', 'Pugnale'],
    scudo:    ['Scudo Tondo', 'Scudo a Torre', 'Buckler', 'Egida'],
    elmo:     ['Elmo', 'Cappuccio', 'Corona di Ferro', 'Barbuta'],
    armatura: ['Corazza', 'Cotta di Maglia', 'Mantello Rinforzato', 'Pettorale'],
    anello:   ['Anello', 'Sigillo', 'Fascia Incisa'],
    amuleto:  ['Amuleto', 'Talismano', 'Ciondolo', 'Reliquia'],
  };
  const RARITY_SUFFIX = {
    comune:      ['di Rame', 'di Legno', 'del Viandante', 'Consunto/a'],
    non_comune:  ['di Ferro', 'della Sentinella', 'del Cacciatore'],
    raro:        ['d\'Acciaio Runico', 'del Crepuscolo', 'della Tempesta'],
    epico:       ['dell\'Antico Ordine', 'del Drago Minore', 'delle Cento Battaglie'],
    leggendario: ['del Sole Cadente', 'dei Re Perduti', 'dell\'Eclissi'],
    divino:      ['degli Dei Dimenticati', 'della Luce Primordiale'],
    oscuro:      ['del Vuoto Sussurrante', 'dell\'Abisso Senza Nome'],
  };

  function availableRarities(level) {
    return Object.entries(RARITIES)
      .filter(([, r]) => level >= r.minLevel)
      .map(([k]) => k);
  }

  function rollRarity(level, minRarity) {
    const keys = availableRarities(level);
    const order = Object.keys(RARITIES);
    const pool = minRarity
      ? keys.filter(k => order.indexOf(k) >= order.indexOf(minRarity))
      : keys;
    const usable = pool.length ? pool : keys;
    const total = usable.reduce((s, k) => s + RARITIES[k].weight, 0);
    let r = Math.random() * total;
    for (const k of usable) { r -= RARITIES[k].weight; if (r <= 0) return k; }
    return usable[usable.length - 1];
  }

  let itemSeq = 0;
  function genItem(level, minRarity, forcedSlot) {
    const rarity = rollRarity(level, minRarity);
    const slot = forcedSlot ||
      Object.keys(SLOTS)[Math.floor(Math.random() * Object.keys(SLOTS).length)];
    const base = ITEM_BASES[slot][Math.floor(Math.random() * ITEM_BASES[slot].length)];
    const suf = RARITY_SUFFIX[rarity][Math.floor(Math.random() * RARITY_SUFFIX[rarity].length)];
    const r = RARITIES[rarity];
    return {
      id: 'i' + Date.now() + '_' + (itemSeq++),
      slot, rarity,
      name: `${base} ${suf}`,
      icon: SLOTS[slot].icon,
      xp: r.xp,                            // % bonus XP quando equipaggiato
      value: r.value,                      // valore di vendita al mercato
      desc: descForItem(slot, rarity),
    };
  }

  function descForItem(slot, rarity) {
    const r = RARITIES[rarity];
    const what = { arma: 'Un\'arma', scudo: 'Uno scudo', elmo: 'Un elmo',
      armatura: 'Un\'armatura', anello: 'Un anello', amuleto: 'Un amuleto' }[slot];
    return `${what} di rarità ${r.label}. Equipaggiato: +${r.xp}% XP da ogni allenamento. Valore di mercato: ${r.value} monete.`;
  }

  function equipmentXpBonus(hero) {
    let tot = 0;
    Object.values(hero.equipment || {}).forEach(id => {
      const it = (hero.items || []).find(i => i.id === id);
      if (it) tot += it.xp;
    });
    return tot; // in %
  }

  /* ── Missioni della storia ────────────────────────────────── */
  const MISSIONS = [
    { id: 'macerie',   zone: 'Rovine di Oakhaven', name: 'Tra le Macerie',
      km: 5,  minLevel: 1,
      desc: 'Esplora la tua vecchia casa distrutta in cerca di equipaggiamento.',
      reward: { gold: 30, wood: 10, items: 1 } },
    { id: 'simbolo',   zone: 'Rovine di Oakhaven', name: 'Il Simbolo Misterioso',
      km: 10, minLevel: 2, requires: 'macerie',
      desc: 'Nella piazza principale trovi uno stendardo bruciato: di chi è quello stemma?',
      reward: { gold: 50, stone: 10, card: 'card_stemma' } },
    { id: 'fuga',      zone: 'Rovine di Oakhaven', name: 'Fuga dalle Mura',
      km: 15, minLevel: 3, requires: 'simbolo',
      desc: 'I mostri rimasti ti hanno visto! Semina l\'Orda e fuggi oltre le mura.',
      reward: { gold: 80, wood: 20, card: 'card_fuga', items: 1 } },
    { id: 'foresta1',  zone: 'Foresta Sussurrante', name: 'Sentieri Ombrosi',
      km: 8,  minLevel: 5, requires: 'fuga',
      desc: 'Gli alberi sussurrano segreti antichi. Raccogli legname pregiato.',
      reward: { gold: 60, wood: 40, items: 1 } },
    { id: 'santuario', zone: 'Foresta Sussurrante', name: 'Il Santuario Dimenticato',
      km: 15, minLevel: 9, requires: 'foresta1',
      desc: 'L\'Orda vuole corrompere il Santuario delle creature magiche. Arriva prima tu!',
      reward: { gold: 100, unlocks: 'companion', card: 'card_lupo' } },
    { id: 'miniera',   zone: 'Foresta Sussurrante', name: 'La Miniera dei Goblin',
      km: 12, minLevel: 6, requires: 'fuga',
      desc: 'Una vecchia miniera infestata di goblin. Dentro c\'è pietra in abbondanza.',
      reward: { gold: 70, stone: 40, items: 1 } },
    { id: 'goblin',    zone: 'Foresta Sussurrante', name: 'Il Generale dei Goblin',
      km: 20, minLevel: 10, requires: 'miniera',
      desc: 'Il primo luogotenente dell\'Orda ti sbarra la strada. Sconfiggilo!',
      reward: { gold: 150, card: 'card_goblin', items: 2 } },
    { id: 'giardino1', zone: 'Il Giardino Lastricato', name: 'Vialetti Infestati',
      km: 15, minLevel: 11, requires: 'goblin',
      desc: 'Le siepi del giardino nascondono piante malvagie in agguato.',
      reward: { gold: 120, stone: 50, items: 1 } },
    { id: 'golem',     zone: 'Il Ponte del Pedaggio', name: 'Il Generale dei Golem',
      km: 25, minLevel: 16, requires: 'giardino1',
      desc: 'Un colosso a molla riscuote il pedaggio del ponte. Sconfiggilo!',
      reward: { gold: 250, card: 'card_golem', items: 2 } },
    { id: 'amuleto',   zone: 'Il Ponte del Pedaggio', name: 'L\'Amuleto del Viaggiatore Esperto',
      km: 30, minLevel: 19, requires: 'golem',
      desc: 'Forgia l\'amuleto che spezza il sigillo del Livello 20. Il Drago ti attende oltre.',
      reward: { gold: 300, unlocks: 'ascension', card: 'card_amuleto', items: 2, minRarity: 'epico' } },
  ];

  // Missioni di esplorazione: una per bioma, sbloccate col livello
  BIOMES.forEach((b, i) => {
    if (i < 2) return; // le prime due zone hanno già missioni narrative
    MISSIONS.push({
      id: 'explore-' + i,
      zone: b.name,
      name: 'Esplorazione: ' + b.name.replace(/^(Il |La |Le |L')/, ''),
      km: Math.min(30, 10 + i * 1.5) | 0,
      minLevel: b.min,
      desc: `Mappa i segreti di ${b.name} e reclama le sue ricchezze.`,
      reward: { gold: 60 + i * 25, wood: 10 + i * 5, stone: 10 + i * 5, items: 1 },
    });
  });

  /* ── Carte collezionabili ─────────────────────────────────── */
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

  /* ── Bestiario ────────────────────────────────────────────── */
  const BESTIARY = [
    { id: 'goblin',              name: 'Goblin Sciacallo',      zone: 'Rovine di Oakhaven',
      weakness: 'Fuoco', lore: 'Fruga tra le macerie in cerca di bottini. Odia chi arriva prima di lui.' },
    { id: 'slime',               name: 'Slime della Palude',    zone: 'Rovine di Oakhaven',
      weakness: 'Fulmine', lore: 'Gelatinoso e dispettoso: si infila negli stivali degli avventurieri.' },
    { id: 'pipistrello',         name: 'Pipistrello Paffuto',   zone: 'Rovine di Oakhaven',
      weakness: 'Luce', lore: 'Troppo grasso per volare in alto. Perfetto per gli agguati bassi.' },
    { id: 'scheletro-arciere',   name: 'Scheletro Arciere',     zone: 'Rovine di Oakhaven',
      weakness: 'Impatto', lore: 'Le sue frecce non mancano mai… le ossa dei bersagli, però, sì.' },
    { id: 'scheletro-guerriero', name: 'Scheletro Guerriero',   zone: 'Rovine di Oakhaven',
      weakness: 'Impatto', lore: 'La cresta rossa è finta: l\'ha rubata a uno spaventapasseri.' },
    { id: 'spettro',             name: 'Spettro Errante',       zone: 'Rovine di Oakhaven',
      weakness: 'Luce', lore: 'Vaga tra le rovine sussurrando i nomi di chi non c\'è più.' },
    { id: 'scrigno-malefico',    name: 'Scrigno Malefico',      zone: 'Rovine di Oakhaven',
      weakness: 'Astuzia', lore: 'Sembra un tesoro. È una trappola. La linguaccia lo tradisce sempre.' },
    { id: 'guerriero-fantasma',  name: 'Guerriero Fantasma',    zone: 'Rovine di Oakhaven',
      boss: true, mission: 'fuga',
      weakness: 'Luce', lore: 'L\'ultimo difensore di Oakhaven, corrotto dall\'Orda. Custodisce le mura.' },
    { id: 'pianta-killer',       name: 'Pianta Killer',         zone: 'Foresta Sussurrante',
      weakness: 'Fuoco', lore: 'Ringhia dal vaso. Nessuno sa chi continui ad annaffiarla.' },
    { id: 'pianta-carnivora',    name: 'Carnivora dell\'Imboscata', zone: 'Foresta Sussurrante',
      weakness: 'Fuoco', lore: 'I suoi tentacoli sbucano dal sottobosco quando meno te lo aspetti.' },
    { id: 'albero-assassino',    name: 'Albero Assassino',      zone: 'Foresta Sussurrante',
      weakness: 'Ascia', lore: 'Non tutti gli alberi sono saggi e gentili. Questo colleziona bastoni… da passeggio.' },
    { id: 'mandragora',          name: 'Mandragora Urlante',    zone: 'Foresta Sussurrante',
      weakness: 'Silenzio', lore: 'Il suo urlo fa cadere le foglie a un chilometro di distanza.' },
    { id: 'fungo-mago',          name: 'Fungo Mago Velenoso',   zone: 'Foresta Sussurrante',
      weakness: 'Vento', lore: 'Il cappello rosso non è un cappello. Non chiedeteglielo, si offende.' },
    { id: 'girasole',            name: 'Girasole Medievale',    zone: 'Foresta Sussurrante',
      weakness: 'Ombra', lore: 'Segue il sole di giorno e gli intrusi di notte. Scudo di corteccia, sguardo torvo.' },
    { id: 'soffioni',            name: 'Soffioni Dispettosi',   zone: 'Foresta Sussurrante',
      weakness: 'Vento', lore: 'Esprimere un desiderio soffiando su di loro è ufficialmente sconsigliato.' },
    { id: 'golem-tronchi',       name: 'Golem dei Tronchi',     zone: 'Foresta Sussurrante',
      weakness: 'Fuoco', lore: 'Un guardiano antico risvegliato dall\'Orda. Le rune brillano quando è arrabbiato.' },
    { id: 'orco',                name: 'Orco Predone',          zone: 'Foresta Sussurrante',
      weakness: 'Astuzia', lore: 'Forte come tre buoi, furbo come mezzo. Devasta i sentieri della foresta.' },
    { id: 'guerriero-anfibio',   name: 'Guerriero Anfibio',     zone: 'Foresta Sussurrante',
      weakness: 'Gelo', lore: 'Il tridente l\'ha vinto a un torneo di stagno. Gracida prima di caricare.' },
    { id: 'slime-boss',          name: 'Re Slime',              zone: 'Foresta Sussurrante',
      boss: true, mission: 'santuario',
      weakness: 'Fulmine', lore: 'Ha corrotto il Santuario con la sua melma regale. La corona? Rubata, ovvio.' },
    { id: 'orco-capo',           name: 'Generale Orco',         zone: 'Foresta Sussurrante',
      boss: true, mission: 'goblin',
      weakness: 'Fuoco', lore: 'Primo luogotenente dell\'Orda. La sua ascia ha un nome: "Colazione".' },
    { id: 'cactus-spadaccino',   name: 'Cactus Spadaccino',     zone: 'Il Giardino Lastricato',
      weakness: 'Gelo', lore: 'Duella con stile. Perdere contro di lui pizzica per una settimana.' },
    { id: 'rovo-spaccapietre',   name: 'Rovo Spaccapietre',     zone: 'Il Giardino Lastricato',
      weakness: 'Fuoco', lore: 'Cresce nella roccia e la frantuma per dispetto. Le lastre del giardino lo temono.' },
    { id: 'golem-molla',         name: 'Golem a Molla',         zone: 'Il Ponte del Pedaggio',
      boss: true, mission: 'golem',
      weakness: 'Fulmine', lore: 'Secondo luogotenente dell\'Orda. Riscuote il pedaggio: la chiave inglese è sua.' },
    { id: 'drago-komodo',        name: 'Drago di Komodo',       zone: 'Il Ponte del Pedaggio',
      boss: true, mission: 'amuleto',
      weakness: 'Metallo Celeste', lore: 'Cucciolo della stirpe del Drago Antico. Se questo è il cucciolo…' },
    { id: 'cavaliere-drago',     name: 'Il Cavaliere del Drago', zone: 'La Vetta Oscura',
      boss: true, final: true,
      weakness: 'Sconosciuta', lore: 'Colui che ha distrutto Oakhaven. Il suo volto è stato rivelato dalle Memorie… ma il suo potere resta un mistero.' },
  ];

  /* ── Strutture della casa ─────────────────────────────────── */
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
    return migrateHero({
      id: 'h' + Date.now(),
      name, avatar,
      level: 1, xp: 0,
      gold: 0, wood: 0, stone: 0,
      totalKm: 0,
      kmByType: { cyclette: 0, camminata: 0, corsa: 0 },
      lootBagsOpened: 0,
      fragmentsFound: 0,
      cards: [],
      bestiary: [],
      buildings: [],
      missionsDone: [],
      activeMission: null,
      companion: false,
      ascended: false,
      restBonus: false,
      restDaysThisWeek: 0,
      weekStamp: weekStamp(),
      log: [],
      created: Date.now(),
    });
  }

  // Migrazione: aggiunge i campi v2 ai salvataggi esistenti
  function migrateHero(h) {
    h.items = h.items || [];
    h.equipment = h.equipment || { arma: null, scudo: null, elmo: null, armatura: null, anello: null, amuleto: null };
    h.mountsOwned = h.mountsOwned || [];
    h.mount = h.mount || null;
    h.streak = h.streak || { count: 0, last: null };
    h.incursion = h.incursion || null;
    h.bestiary = h.bestiary || [];
    h.storyId = h.storyId || (h.avatar && String(h.avatar).includes('eroe2') ? 'eroe2' : 'eroe1');
    // vecchio inventario a stringhe → convertito in oro
    if (Array.isArray(h.inventory) && h.inventory.length) {
      h.gold += h.inventory.length * 10;
      h.inventory = [];
    }
    return h;
  }

  function weekStamp() {
    const d = new Date();
    const onejan = new Date(d.getFullYear(), 0, 1);
    return d.getFullYear() + '-' + Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  }
  function todayStamp() { return new Date().toISOString().slice(0, 10); }
  function yesterdayStamp() {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY)) || { heroes: [], current: null, claimedEvents: [] };
      (s.heroes || []).forEach(migrateHero);
      return s;
    }
    catch { return { heroes: [], current: null, claimedEvents: [] }; }
  }
  function save(state) { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }

  function deleteHero(state, heroId) {
    state.heroes = state.heroes.filter(h => h.id !== heroId);
    if (state.current === heroId) state.current = null;
  }

  /* ── Bonus login giornaliero (Il Tesoro Giornaliero) ──────── */
  // Ritorna il premio del giorno o null se già riscosso oggi.
  function dailyLogin(hero) {
    const today = todayStamp();
    if (hero.streak.last === today) return null;
    hero.streak.count = (hero.streak.last === yesterdayStamp()) ? hero.streak.count + 1 : 1;
    hero.streak.last = today;
    const gold = 10 * Math.min(hero.streak.count, 30);
    hero.gold += gold;
    const reward = { day: hero.streak.count, gold };
    if (hero.streak.count % 7 === 0) {
      const item = genItem(hero.level, 'raro');
      hero.items.push(item);
      reward.item = item;
    }
    return reward;
  }

  /* ── Incursioni (evento a tempo: 24 ore) ──────────────────── */
  const INCURSION_TEMPLATES = [
    { enemy: 'golem-molla',        text: 'Il Golem di Ruggine ha invaso {zone}!' },
    { enemy: 'orco-capo',          text: 'Il Generale Orco sta saccheggiando {zone}!' },
    { enemy: 'guerriero-fantasma', text: 'Il Guerriero Fantasma infesta {zone}!' },
    { enemy: 'slime-boss',         text: 'Re Slime ha ricoperto {zone} di melma!' },
    { enemy: 'drago-komodo',       text: 'Il Drago di Komodo sorvola {zone}!' },
    { enemy: 'scrigno-malefico',   text: 'Scrigni malefici pullulano in {zone}!' },
  ];

  function dateSeed(str) {
    return [...str].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 100000, 7);
  }

  // L'incursione del giorno (uguale per tutti, generata dalla data)
  function todayIncursion(hero) {
    const today = todayStamp();
    const seed = dateSeed(today);
    const t = INCURSION_TEMPLATES[seed % INCURSION_TEMPLATES.length];
    const biome = currentBiome(hero.level);
    const km = Math.round(dailyGoalKm(hero.level) * 1.4);
    const order = Object.keys(RARITIES);
    const avail = availableRarities(hero.level);
    const best = avail[avail.length - 1];
    const minRarity = order[Math.max(order.indexOf('raro'), order.indexOf(best) - 1)];
    return {
      date: today,
      name: t.text.replace('{zone}', biome.name),
      enemy: t.enemy,
      km,
      minRarity,
    };
  }

  // Da chiamare all'apertura: gestisce il cambio giorno.
  // Ritorna info sul bottino PERSO ieri (FOMO) oppure null.
  function rolloverIncursion(hero) {
    const today = todayStamp();
    let missed = null;
    if (hero.incursion && hero.incursion.date !== today) {
      if (!hero.incursion.done && hero.incursion.progressKm > 0) {
        missed = {
          name: hero.incursion.name,
          kmMissing: Math.max(0.1, hero.incursion.km - hero.incursion.progressKm).toFixed(1),
        };
      }
      hero.incursion = null;
    }
    if (!hero.incursion) {
      const inc = todayIncursion(hero);
      hero.incursion = { ...inc, progressKm: 0, done: false };
    }
    return missed;
  }

  /* ── Allenamento ──────────────────────────────────────────── */
  function buildingBonus(hero, key) {
    return BUILDINGS
      .filter(b => hero.buildings.includes(b.id) && b.bonus && b.bonus[key])
      .reduce((s, b) => s + b.bonus[key], 0);
  }

  function validateSession(type, km) {
    const act = ACTIVITIES[type];
    if (!act) return 'Attività sconosciuta.';
    if (!(km > 0)) return 'Inserisci una distanza valida, giovane eroe.';
    if (km > act.maxKmSession)
      return `Il Custode del Tempo aggrotta la fronte: ${km} km di ${act.label.toLowerCase()} in una sessione? ` +
             `Il tuo eroe ha preso un passaggio su un carro troppo veloce! Questo movimento non conta come addestramento.`;
    return null;
  }

  function logWorkout(hero, type, km) {
    const err = validateSession(type, km);
    if (err) return { error: err };

    migrateHero(hero);
    const act = ACTIVITIES[type];
    const report = { km, type, levelsGained: [], loot: [], cards: [], fragments: 0, unlocks: [] };

    // Cavalcatura (+% km) e compagno (+10% km)
    let effKm = km;
    const mount = hero.mount ? mountById(hero.mount) : null;
    if (mount) effKm *= 1 + mount.bonus / 100;
    if (hero.companion) effKm *= 1.10;
    let mult = 1;
    if (hero.restBonus) { mult = 2; hero.restBonus = false; report.restBonusUsed = true; }

    const xpMult = 1 + buildingBonus(hero, 'xpMult') + equipmentXpBonus(hero) / 100;
    const goldMult = 1 + buildingBonus(hero, 'goldMult');
    const resMult = 1 + buildingBonus(hero, 'resMult');
    report.xp = Math.round(effKm * act.xpPerKm * mult * xpMult);
    report.gold = Math.round(effKm * GOLD_PER_KM * mult * goldMult);
    hero.xp += report.xp;
    hero.gold += report.gold;

    report.wood = Math.round((effKm * (1 + Math.random())) * resMult);
    report.stone = Math.round((effKm * Math.random()) * resMult);
    hero.wood += report.wood;
    hero.stone += report.stone;

    hero.totalKm += km;
    hero.kmByType[type] = (hero.kmByType[type] || 0) + km;
    hero.log.unshift({ date: Date.now(), type, km, xp: report.xp });
    if (hero.log.length > 100) hero.log.pop();

    // Livelli (con sigillo al 20 finché non c'è l'Ascensione)
    const cap = hero.ascended ? MAX_LEVEL : LEVEL_CAP_1;
    while (hero.level < cap && hero.xp >= xpForLevel(hero.level)) {
      hero.xp -= xpForLevel(hero.level);
      hero.level++;
      report.levelsGained.push(hero.level);
      if (hero.level === 5 && !hero.cards.includes('card_casa')) {
        hero.cards.push('card_casa'); report.cards.push('card_casa');
        report.unlocks.push('🏡 Livello 5! Puoi costruire la tua casa nel Rifugio.');
      }
    }
    if (hero.level >= cap && hero.xp > xpForLevel(hero.level)) {
      hero.xp = xpForLevel(hero.level);
      if (!hero.ascended) report.capReached = true;
    }

    // Sacchi del Viaggiatore → oggetti equipaggiabili
    const bagsDue = Math.floor(hero.totalKm / LOOT_BAG_KM);
    while (hero.lootBagsOpened < bagsDue) {
      hero.lootBagsOpened++;
      const item = genItem(hero.level);
      hero.items.push(item);
      report.loot.push(item);
    }

    // Frammenti di Memoria
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

    // Avvistamento nel Bestiario
    const zones = accessibleZones(hero);
    const pool = BESTIARY.filter(b =>
      !b.boss && zones.includes(b.zone) && !hero.bestiary.includes(b.id));
    if (pool.length) {
      const found = pool[Math.floor(Math.random() * pool.length)];
      hero.bestiary.push(found.id);
      report.sighting = found;
    }
    if (hero.fragmentsFound === 5 && !hero.bestiary.includes('cavaliere-drago')) {
      hero.bestiary.push('cavaliere-drago');
      report.finalReveal = BESTIARY.find(b => b.id === 'cavaliere-drago');
    }

    // Incursione del giorno
    if (hero.incursion && hero.incursion.date === todayStamp() && !hero.incursion.done) {
      hero.incursion.progressKm += km;
      if (hero.incursion.progressKm >= hero.incursion.km) {
        hero.incursion.done = true;
        const item = genItem(hero.level, hero.incursion.minRarity);
        const chest = { gold: Math.round(hero.incursion.km * 8), items: [item] };
        hero.gold += chest.gold;
        hero.items.push(item);
        report.incursionComplete = { name: hero.incursion.name, chest };
      } else {
        report.incursionProgress = {
          name: hero.incursion.name,
          done: hero.incursion.progressKm,
          km: hero.incursion.km,
        };
      }
    }

    // Missione attiva
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
    const boss = BESTIARY.find(b => b.mission === m.id);
    if (boss && !hero.bestiary.includes(boss.id)) {
      hero.bestiary.push(boss.id);
      report.bossDefeated = boss;
    }
    const r = m.reward || {};
    // Lo scrigno: le ricompense vengono consegnate subito allo stato,
    // ma l'interfaccia le rivela con l'apertura dello scrigno.
    const chest = { gold: r.gold || 0, wood: r.wood || 0, stone: r.stone || 0, items: [], cards: [] };
    hero.gold += chest.gold;
    hero.wood += chest.wood;
    hero.stone += chest.stone;
    for (let i = 0; i < (r.items || 0); i++) {
      const item = genItem(hero.level, r.minRarity);
      hero.items.push(item);
      chest.items.push(item);
    }
    if (r.card && !hero.cards.includes(r.card)) {
      hero.cards.push(r.card);
      chest.cards.push(r.card);
      report.cards.push(r.card);
    }
    report.chest = chest;
    if (r.unlocks === 'companion' && !hero.companion) {
      hero.companion = true;
      report.unlocks.push('🐺 EVENTO DEL RISVEGLIO! Il Lupo Astrale ti ha scelto: è la tua cavalcatura in missione (+10% km) e il tuo compagno al Rifugio.');
    }
    if (r.unlocks === 'ascension') {
      hero.ascended = true;
      report.unlocks.push('🔮 ASCENSIONE! Il sigillo del Livello 20 è spezzato: puoi crescere fino al Livello 100. Il Drago ti attende.');
    }
  }

  function availableMissions(hero) {
    const zones = accessibleZones(hero);
    return MISSIONS.filter(m =>
      !hero.missionsDone.includes(m.id) &&
      hero.level >= m.minLevel &&
      zones.includes(m.zone) &&
      (!m.requires || hero.missionsDone.includes(m.requires))
    );
  }

  function startMission(hero, id) {
    const m = MISSIONS.find(x => x.id === id);
    if (!m) return false;
    hero.activeMission = { id, progressKm: 0 };
    return true;
  }

  /* ── Mercato ──────────────────────────────────────────────── */
  function buyMount(hero, id) {
    const m = mountById(id);
    if (!m) return 'Cavalcatura sconosciuta.';
    if (hero.mountsOwned.includes(id)) { hero.mount = id; return null; } // già tua: la selli
    if (hero.level < m.level) return `Serve il Livello ${m.level}.`;
    if (hero.gold < m.price) return 'Oro insufficiente!';
    hero.gold -= m.price;
    hero.mountsOwned.push(id);
    hero.mount = id;
    return null;
  }

  function sellItem(hero, itemId) {
    const idx = hero.items.findIndex(i => i.id === itemId);
    if (idx < 0) return 'Oggetto non trovato.';
    const item = hero.items[idx];
    Object.keys(hero.equipment).forEach(s => {
      if (hero.equipment[s] === itemId) hero.equipment[s] = null;
    });
    hero.gold += item.value;
    hero.items.splice(idx, 1);
    return null;
  }

  // La Fucina propone ogni giorno 3 pezzi (armi/armature), uguali per data
  function forgeOffers(hero) {
    const today = todayStamp();
    const seed = dateSeed(today + '-forge');
    const slots = ['arma', 'scudo', 'elmo', 'armatura'];
    const offers = [];
    for (let i = 0; i < 3; i++) {
      const s = slots[(seed + i * 7) % slots.length];
      // rarità pseudo-casuale ma stabile nel giorno
      const rIdx = (seed + i * 13) % 100;
      let rarity = 'comune';
      if (rIdx > 55) rarity = 'non_comune';
      if (rIdx > 80) rarity = 'raro';
      if (rIdx > 93 && hero.level >= 16) rarity = 'epico';
      if (rIdx > 98 && hero.level >= 31) rarity = 'leggendario';
      const base = ITEM_BASES[s][(seed + i * 3) % ITEM_BASES[s].length];
      const suf = RARITY_SUFFIX[rarity][(seed + i * 5) % RARITY_SUFFIX[rarity].length];
      const r = RARITIES[rarity];
      offers.push({
        id: 'forge-' + today + '-' + i,
        slot: s, rarity,
        name: `${base} ${suf}`,
        icon: SLOTS[s].icon,
        xp: r.xp, value: r.value,
        price: r.value * 2,
        desc: descForItem(s, rarity),
      });
    }
    return offers;
  }

  function buyForgeItem(hero, offer) {
    if (hero.gold < offer.price) return 'Oro insufficiente!';
    if (hero.items.some(i => i.id === offer.id)) return 'Già acquistato oggi.';
    hero.gold -= offer.price;
    const { price, ...item } = offer;
    item.id = 'i' + Date.now() + '_' + (itemSeq++);
    hero.items.push(item);
    return null;
  }

  function equipItem(hero, itemId) {
    const item = hero.items.find(i => i.id === itemId);
    if (!item) return;
    hero.equipment[item.slot] = itemId;
  }
  function unequipSlot(hero, slot) { hero.equipment[slot] = null; }

  /* ── Casa e riposo ────────────────────────────────────────── */
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

  /* ── Taglie Uniche settimanali ────────────────────────────── */
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
    hero.gold += 50;
    return true;
  }

  return {
    ACTIVITIES, MISSIONS, CARDS, BUILDINGS, BESTIARY,
    BIOMES, MOUNTS, RARITIES, SLOTS,
    MAX_LEVEL, LEVEL_CAP_1, GOLD_PER_KM,
    xpForLevel, dailyGoalKm, heroTitle,
    currentBiome, accessibleZones, mountById,
    newHero, migrateHero, load, save, deleteHero,
    logWorkout, availableMissions, startMission,
    canBuild, build, declareRestDay,
    weeklyEvent, claimEvent, buildingBonus, equipmentXpBonus,
    genItem, sellItem, buyMount, forgeOffers, buyForgeItem,
    equipItem, unequipSlot,
    dailyLogin, rolloverIncursion,
  };
})();
