/* ═══════════════════════════════════════════════════════════════
   Hero's Pace — Logica di gioco (v2.0)
   Tutto lo stato è salvato in localStorage. Ogni eroe ha il suo
   salvataggio; le funzioni qui non toccano il DOM.
   ═══════════════════════════════════════════════════════════════ */

const RPG = (() => {

  const SAVE_KEY = 'rpgym_save_v1';
  const MAX_LEVEL = 100;
  let itemSeq = 0;

  /* ── Attività: moltiplicatori XP per km ───────────────────── */
  const ACTIVITIES = {
    cyclette:  { label: 'Cyclette',  icon: '🚴', xpPerKm: 10, maxKmSession: 60 },
    camminata: { label: 'Camminata', icon: '🚶', xpPerKm: 15, maxKmSession: 40 },
    corsa:     { label: 'Corsa',     icon: '🏃', xpPerKm: 30, maxKmSession: 30 },
  };
  const GOLD_PER_KM = 5;
  const MEMORY_FRAGMENT_KM = 20;   // ogni 20 km → un Frammento di Memoria
  const LOOT_BAG_KM = 5;           // ogni 5 km → un Sacco del Viaggiatore
  const TICKET_KM = 75;            // ogni 75 km → biglietto Comune

  /* ── Meteo dinamico ─────────────────────────────────────────── */
  const WEATHER_TYPES = [
    { type:'sun',   icon:'☀️', label:'Soleggiato', xpBonus: 0    },
    { type:'rain',  icon:'🌧️', label:'Piovoso',    xpBonus: 0.15 },
    { type:'storm', icon:'⛈️', label:'Tempesta',   xpBonus: 0.30 },
  ];
  function getDailyWeather() {
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate();
    const v = (((seed * 1664525 + 1013904223) & 0x7fffffff) >>> 0) % 100;
    if (v < 50) return WEATHER_TYPES[0];
    if (v < 80) return WEATHER_TYPES[1];
    return WEATHER_TYPES[2];
  }

  /* ── Mappa del tesoro settimanale ───────────────────────────── */
  const TREASURE_MAP_TIERS = [
    { km: 8,  gold: 120, wood: 0,  stone: 0  },
    { km: 22, gold: 280, wood: 80, stone: 0  },
    { km: 45, gold: 550, wood: 0,  stone: 0, item: true },
  ];
  const TREASURE_MAP_DURATION = 7 * 86400000; // 7 giorni esatti
  function rolloverTreasureMap(hero) {
    const now = Date.now();
    // Vecchio formato (weekStamp) o mappa scaduta → reset
    if (!hero.treasureMap || !hero.treasureMap.startedAt ||
        (now - hero.treasureMap.startedAt) >= TREASURE_MAP_DURATION) {
      hero.treasureMap = { startedAt: now, progressKm: 0, claimed: [] };
    }
  }
  function treasureMapStatus(hero) {
    if (!hero.treasureMap) return null;
    const msLeft = hero.treasureMap.startedAt
      ? Math.max(0, hero.treasureMap.startedAt + TREASURE_MAP_DURATION - Date.now())
      : 0;
    const daysLeft = Math.ceil(msLeft / 86400000);
    return { progressKm: hero.treasureMap.progressKm, claimed: hero.treasureMap.claimed || [], daysLeft };
  }
  function claimTreasureTier(hero, tierIdx) {
    const t = TREASURE_MAP_TIERS[tierIdx];
    if (!t || !hero.treasureMap) return null;
    if (hero.treasureMap.progressKm < t.km) return null;
    if (hero.treasureMap.claimed.includes(tierIdx)) return null;
    hero.treasureMap.claimed.push(tierIdx);
    hero.gold += t.gold; hero.wood += t.wood; hero.stone += t.stone;
    const item = t.item ? genItemFor(hero) : null;
    if (item) hero.items.push(item);
    /* Consumabile: rarità cresce con la tappa */
    const tierRarities = ['comune', 'comune', 'raro'];
    const tierChances  = [0.35, 0.35, 0.40];
    const consumable = Math.random() < (tierChances[tierIdx] || 0.35)
      ? dropConsumable(hero, tierRarities[tierIdx] || 'comune')
      : null;
    return { gold: t.gold, wood: t.wood, stone: t.stone, item, consumable };
  }

  // Pescato dai boss della Bestiary già sbloccati (zona accessibile al
  // livello dell'eroe), stessa logica dell'incursione giornaliera — così
  // la varietà cresce con la progressione invece di ripetere sempre gli
  // stessi 7 nemici fissi.
  function rolloverWeeklyBoss(hero) {
    const ws = weekStamp();
    if (!hero.weeklyBoss || hero.weeklyBoss.weekStamp !== ws) {
      const seed = dateSeed(ws);
      const accessible = accessibleZones(hero);
      const pool = BESTIARY.filter(b => b.boss && !b.final && accessible.includes(b.zone));
      const fallbackPool = BESTIARY.filter(b => b.boss && !b.final);
      const chosenPool = pool.length ? pool : fallbackPool;
      const boss = chosenPool[seed % chosenPool.length];
      const km = Math.round(dailyGoalKm(hero.level) * 2.5);
      const gold = Math.round(km * 7);
      hero.weeklyBoss = {
        id: boss.id, name: boss.name, zone: boss.zone, km, gold,
        weekStamp: ws, progressKm: 0, claimed: false,
      };
    }
  }

  function weeklyBossStatus(hero) {
    if (!hero.weeklyBoss) return null;
    const wb = hero.weeklyBoss;
    const boss = { id: wb.id, name: wb.name, zone: wb.zone, km: wb.km, gold: wb.gold };
    const prog = hero.weeklyBoss.progressKm;
    const done = prog >= boss.km;
    return { boss, progressKm: prog, done, claimed: hero.weeklyBoss.claimed };
  }

  const TROPHIES = [
    { id: 't10',   km: 10,   icon: '🥉', img: 'assets/ui/trofei/t10.webp',   name: 'Primi Passi',          desc: '10 km percorsi' },
    { id: 't25',   km: 25,   icon: '🎖️', img: 'assets/ui/trofei/t25.webp',   name: 'Viandante',            desc: '25 km percorsi' },
    { id: 't50',   km: 50,   icon: '🥈', img: 'assets/ui/trofei/t50.webp',   name: 'Camminatore',          desc: '50 km percorsi' },
    { id: 't100',  km: 100,  icon: '🏅', img: 'assets/ui/trofei/t100.webp',  name: 'Esploratore',          desc: '100 km percorsi' },
    { id: 't250',  km: 250,  icon: '🥇', img: 'assets/ui/trofei/t250.webp',  name: 'Pellegrino',           desc: '250 km percorsi' },
    { id: 't500',  km: 500,  icon: '🏆', img: 'assets/ui/trofei/t500.webp',  name: 'Veterano del Cammino', desc: '500 km percorsi' },
    { id: 't1000', km: 1000, icon: '👑', img: 'assets/ui/trofei/t1000.webp', name: 'Leggenda Vivente',     desc: '1000 km percorsi' },
  ];

  /* ── Curva di progressione ────────────────────────────────── */
  function xpForLevel(level) {
    return Math.round(60 * Math.pow(level, 1.12));
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
    { name: 'Le Pianure del Vento',     min: 16, max: 20,  icon: '🌬️' },
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
    { name: 'La Palude Nebbiosa',        min: 71, max: 75,  icon: '🌫️' },
    { name: 'Il Cimitero dei Draghi',    min: 76, max: 80,  icon: '🐉' },
    { name: 'Miniere del Corruttore',    min: 81, max: 85,  icon: '⛏️' },
    { name: 'Sala del Trono Corrotto',   min: 86, max: 90,  icon: '👑' },
    { name: 'L\'Abisso del Vuoto',       min: 91, max: 94,  icon: '🌑' },
    { name: 'La Valle dei Cristalli Oscuri', min: 95, max: 100, icon: '🔮' },
  ];

  function currentBiome(level) {
    return BIOMES.find(b => level >= b.min && level <= b.max) || BIOMES[BIOMES.length - 1];
  }
  // slug per i file immagine: assets/biomi/<slug>.png e assets/ui/biomi/<slug>.png
  const BIOME_SLUGS = [
    'rovine-oakhaven','foresta-sussurrante','giardino-lastricato','pianure-del-vento','antico-archivio',
    'fucine-ruggine','torre-alchimista','cripta-orologiaio','baia-corallo','fossato-profondo',
    'fognature-reame','costa-relitto','picco-innevato','deserto-cenere','palude-nebbiosa',
    'cimitero-draghi','miniere-corruttore','sala-trono-corrotto','abisso-vuoto','valle-cristalli-oscuri',
  ];
  function biomeSlug(biome) {
    const i = BIOMES.indexOf(biome);
    return i >= 0 ? BIOME_SLUGS[i] : null;
  }

  const BIOME_LORE = [
    { title: 'Il Risveglio',
      text: 'Le rovine di Oakhaven bruciano ancora, anche senza fiamme. Tre notti fa l\'Orda ha travolto le mura e inghiottito tutto: il mercato, la fontana, le case che conoscevi a memoria. Sei l\'unico rimasto in piedi — e questo, ti dici, deve voler dire qualcosa.' },
    { title: 'Il Bosco che Ricorda',
      text: 'La Foresta Sussurrante custodisce tutto ciò che Oakhaven ha perduto. I suoi spiriti vegliarono silenziosamente mentre l\'Orda passava sotto le chiome, annotando ogni volto, ogni stendardo, ogni cicatrice. Ora ti osservano camminare — e sembrano decidere se fidarsi di te.' },
    { title: 'Il Giardino Dimenticato',
      text: 'Fu il giardino personale del Re prima che l\'Orda corrompesse il Trono. Marmo bianco, rose selvatiche cresciute sulle fontane ornamentali, e una quiete che sa di abbandono. Qualcuno ha lasciato un coltello conficcato nel tavolo di pietra — la roccia intorno è ancora scura.' },
    { title: 'La Via Aperta',
      text: 'Le Pianure del Vento non nascondono nulla: piatte, spoglie, infinite sotto un cielo grigio che pesa come una promessa non mantenuta. Le carovane passavano di qui portando spezie e seta da est verso il Reame. Oggi portano solo polvere e la memoria di chi non è arrivato.' },
    { title: 'Le Pagine Sopravvissute',
      text: 'L\'Antico Archivio fu il cervello del Reame: centomila pergamene che documentavano ogni legge, ogni trattato, ogni segreto di Stato. L\'Orda bruciò tre quarti di tutto nella prima notte. Ma i custodi nascosero l\'ultimo quarto — e qualcuno, tra quelle pagine annerite, ha trovato qualcosa di abbastanza pericoloso da far tornare l\'Orda.' },
    { title: 'Il Cuore di Ferro',
      text: 'Qui si forgiavano le armi del Reame: spade che cantavano nel vento, armature capaci di reggere il fuoco drago. Le Fucine di Ruggine tacciono da quando i fabbri scelsero l\'esilio piuttosto che lavorare per l\'Orda. Restano solo i mantici spenti e il riflesso delle stelle sulle pozze di metallo raffreddato.' },
    { title: 'L\'Arte del Possibile',
      text: 'Nessuno sapeva davvero cosa combinasse l\'Alchimista nella sua torre di ossidiana, ma i risultati arrivavano al mercato: pozioni che guarivano le ferite in un\'ora, polveri che facevano crescere un raccolto in una notte. Poi smise di rispondere ai visitatori. Poi smise di rispondere del tutto.' },
    { title: 'Il Tempo Sospeso',
      text: 'L\'Orologiaio diceva che il tempo non è un fiume ma un labirinto — e che lui ne conosceva le uscite. La sua cripta è piena di orologi che ticchettano ancora, tutti fermi alla stessa ora: l\'ora in cui l\'Orda varcò le mura di Oakhaven. Coincidenza, o preavviso che nessuno seppe leggere?' },
    { title: 'Il Mare Non Dimentica',
      text: 'La Baia del Corallo fu il porto più grande del Reame: navi mercantili, vascelli da guerra, pescatori che tornavano all\'alba carichi di argento. L\'Orda arrivò dal mare — nessuno se lo aspettava. Le navi sono ancora lì, affondate, visibili attraverso l\'acqua verde nelle giornate limpide.' },
    { title: 'Sotto la Superficie',
      text: 'Il Fossato Profondo è ciò che rimane della Grande Trincea difensiva scavata tre generazioni fa per fermare un\'invasione che non arrivò mai — almeno, non da quella direzione. Adesso l\'Orda lo ha trasformato in un campo di addestramento per le creature della corruzione. Scendi. Guarda. Capisce chi li incontra da vicino.' },
    { title: 'Ciò che Scorre Sotto',
      text: 'Ogni grande città ha il suo segreto peggiore nelle fondamenta. Le fognature del Reame non trasportano più acqua: trasportano corruzione liquida, il sangue nero dell\'Orda che avvelena lentamente il terreno sopra. I topi qui si muovono in formazione. Qualcosa li guida dall\'oscurità più fonda.' },
    { title: 'Il Cimitero delle Navi',
      text: 'Centoquarantadue relitti, li hanno contati i marinai fuggiti. La Costa del Relitto fu teatro della Battaglia del Primo Tramonto — l\'unica volta in cui il Reame respinse un\'invasione navale dell\'Orda, ma a un prezzo che non riuscì mai a dimenticare. Tra i relitti si nascondono ancora i sopravvissuti. Di quale fazione, non è chiaro.' },
    { title: 'Al di Sopra delle Nuvole',
      text: 'Il Picco Innevato esiste al di sopra di tutto: delle guerre, delle stagioni, della memoria degli uomini. Le tribù che vi abitano non parlano la lingua del Reame e non riconoscono il nome dell\'Orda. Parlano solo del Vuoto che cresce sotto il mondo, e del giorno in cui le radici della montagna cederanno.' },
    { title: 'Dove Ardeva la Foresta',
      text: 'Il Deserto di Cenere non è sempre stato un deserto: cent\'anni fa era la Grande Foresta dell\'Est, polmone verde del continente. Poi l\'Orda usò il Fuoco Eterno — una sola notte — e non rimase nulla. La cenere non si disperde perché il vento qui non soffia: è come se anche l\'aria avesse paura di muoversi.' },
    { title: 'La Nebbia che Ascolta',
      text: 'Nella Palude Nebbiosa la nebbia non è vapore acqueo: è memoria condensata, residuo di incantesimi dimenticati. Camminando ci si ritrova a pensare ai propri morti con una chiarezza dolorosa, come se stessero camminando a fianco. Alcuni non escono più dalla palude. Non perché muoiano — ma perché scelgono di restare.' },
    { title: 'Le Ossa dei Vecchi',
      text: 'I draghi vengono qui a morire da prima che esistesse il Reame. Il Cimitero dei Draghi è una distesa di scheletri bianchi grandi come cattedrali, ordinati in cerchi concentrici che nessuno ha mai saputo spiegare. L\'Orda li ha aperti tutti cercando qualcosa. Il Vuoto che ha trovato nei loro cuori è ciò che ha reso possibile tutto il resto.' },
    { title: 'Il Sangue della Terra',
      text: 'Il Corruttore non è un essere, è un processo. Le sue miniere non estraggono minerale: estraggono volontà. Ogni piccone che cade qui indebolisce qualcosa di invisibile che tiene insieme il mondo. E più si scende, più il buio ha forma propria.' },
    { title: 'Il Cuore del Buio',
      text: 'Arrivi infine alla Sala del Trono. Non assomiglia a nulla di ciò che immaginavi: non è maestosa, non è spaventosa. È silenziosa. Il Trono è vuoto — sempre vuoto — e tuttavia si percepisce il peso di chi vi siede quando nessuno guarda. Questo è il centro. Questo è ciò contro cui sei venuto.' },
    { title: 'Oltre i Confini del Reame',
      text: 'L\'Abisso del Vuoto non ha un fondo. I cartografi smisero di provare a misurarlo e cancellarono la parola profondità dalle loro mappe. L\'Orda non viene da qui: viene da ciò che ha guardato troppo a lungo nell\'Abisso e ha smesso di essere se stessa. Tu sei l\'unico ad averlo attraversato con la mente ancora intera.' },
    { title: 'La Fine del Cammino',
      text: 'La Valle dei Cristalli Oscuri è dove si decide tutto. I cristalli registrano l\'intera storia del Reame — ogni scelta, ogni sacrificio, ogni chilometro percorso da chi ha combattuto l\'oscurità. Il tuo nome è già inciso su uno di essi, in una lingua che non conosci ma riconosci. Vai avanti. È per questo che sei venuto fin qui.' },
  ];

  /* ── Artefatti dei Biomi (uno per bioma, sbloccato alla scoperta) ── */
  const BIOME_ARTIFACTS = [
    { name: 'Pietra del Focolare',   icon: '⛏️', flavor: 'Un frammento del muro di casa tua — ancora tiepido, come se il fuoco non si fosse mai spento del tutto.' },
    { name: 'Foglia Fossile',        icon: '🍂', flavor: 'Imprigionata nell\'ambra da secoli. La foresta ha memoria lunga.' },
    { name: 'Seme Perduto',          icon: '🌱', flavor: 'Germogliato tra le pietre. La vita si apre strada ovunque, anche dove non dovrebbe.' },
    { name: 'Frammento di Vento',    icon: '💨', flavor: 'Non pesa nulla, ma stringerlo dà la sensazione di poter camminare per sempre.' },
    { name: 'Pagina Strappata',      icon: '📄', flavor: 'Scritta in una lingua sconosciuta. Alcune parole sembrano nomi tuoi.' },
    { name: 'Bullone Arrugginito',   icon: '🔩', flavor: 'Le fucine di ruggine non producono più nulla — tranne silenzio.' },
    { name: 'Ampolla Vuota',         icon: '🧪', flavor: 'Puzza ancora di zolfo e miele. Qualcuno la stava riempiendo prima di sparire.' },
    { name: 'Ingranaggio Inceppato', icon: '⚙️', flavor: 'Un orologio che segna l\'ora sbagliata. Forse è quella giusta — dipende da quando sei.' },
    { name: 'Corallo Fossile',       icon: '🪸', flavor: 'Il mare non c\'è più da vent\'anni. Ma i coralli ricordano tutto.' },
    { name: 'Terra del Fossato',     icon: '🌑', flavor: 'Nera e densa. Tieni il sacchetto chiuso — sembra che respiri.' },
    { name: 'Osso Inciso',           icon: '🦴', flavor: 'Qualcuno ha inciso una mappa sulle fognature su questo osso. Non vuoi sapere chi.' },
    { name: 'Catena Spezzata',       icon: '⛓️', flavor: 'Ancora attaccata a qualcosa — o qualcuno — che non c\'è più.' },
    { name: 'Ghiacciolo Eterno',     icon: '🧊', flavor: 'Non si scioglie. Stringerlo ricorda perché sei ancora vivo.' },
    { name: 'Cenere del Vulcano',    icon: '🌋', flavor: 'Dentro ogni granello c\'è un\'era sepolta. Il deserto ha mille anni di storia.' },
    { name: 'Nube Inscatolata',      icon: '🫙', flavor: 'Aperta, svela solo nebbia. Chiusa, pesa come un segreto.' },
    { name: 'Squama di Drago',       icon: '🐉', flavor: 'Ancora calda. I draghi non muoiono mai del tutto — bruciano più piano.' },
    { name: 'Pepita Corrotta',       icon: '💎', flavor: 'Luccica di una luce sbagliata. Non avvicinarla agli altri oggetti.' },
    { name: 'Sigillo Infranto',      icon: '👑', flavor: 'Era il simbolo del potere di Oakhaven. Ora è solo ciò che andava difeso.' },
    { name: 'Vuoto in Cristallo',    icon: '🔮', flavor: 'Non contiene nulla — eppure guardandoci dentro vedi tutto quello che hai lasciato indietro.' },
    { name: 'Scheggia della Valle',  icon: '✨', flavor: 'L\'ultimo pezzo di un mondo che stai ricostruendo. O forse il primo di quello che verrà.' },
  ];

  /* ── Lettere dal Mondo (consegnate al raggiungimento delle soglie) ── */
  const WORLD_LETTERS = [
    {
      id: 'elder_lv5',
      sender: 'Anziano Miran', role: 'Custode delle Rovine', icon: '👴', img: 'assets/ui/epistolario/miran.webp',
      title: 'Il vecchio che aspettava',
      body: 'Viandante,\n\nTi ho visto partire da Oakhaven come gli altri. Ma tu sei tornato — o stai ancora camminando verso qualcosa. Non importa.\n\nHo nascosto questo messaggio tra le pietre perché sapevo che qualcuno con le gambe giuste avrebbe fatto abbastanza strada per trovarlo.\n\nContinua. Il reame ha bisogno di qualcuno come te.\n\n— Miran',
      check: h => (h.level || 1) >= 5,
    },
    {
      id: 'blacksmith_lv10',
      sender: 'Gora la Fabbra', role: 'Fucina di Oakhaven', icon: '⚒️', img: 'assets/ui/epistolario/gora.webp',
      title: 'Ferro e sudore',
      body: 'Ehi, tu.\n\nHo visto tornare in pochi da queste parti. E quei pochi o erano fortunati o erano testardi.\n\nTu sembri più testardo.\n\nSe mai passi dalla fucina, fammelo sapere. Ho qualcosa che aspettava il proprietario giusto.\n\n— Gora',
      check: h => (h.level || 1) >= 10,
    },
    {
      id: 'streak7_innkeeper',
      sender: 'Betta dell\'Osteria del Cipresso', role: 'Locandiera', icon: '🍺', img: 'assets/ui/epistolario/betta.webp',
      title: 'La stanza è tua',
      body: 'Ehi,\n\nNon so come fai a tornare ogni giorno. Io a volte non riesco neanche ad alzarmi dal letto.\n\nHo tenuto libera la tua stanza. Quella con la finestra sul bosco. Non te la darò a nessun altro.\n\nQuando vuoi farti trovare, lo sai dove sono.\n\n— Betta',
      check: h => (h.streak?.count || 0) >= 7,
    },
    {
      id: 'merchant_100km',
      sender: 'Tomas il Corriere', role: 'Mercante Itinerante', icon: '🧳', img: 'assets/ui/epistolario/tomas.webp',
      title: 'Cento leghe percorse',
      body: 'Caro camminatore,\n\nHo calcolato la distanza. Cento chilometri. Sai quanti uomini li percorrono in una vita intera?\n\nPochi. E quasi nessuno con lo scopo che hai tu.\n\nTi mando questo messaggio per dirti che il tuo nome comincia a girare tra i mercanti delle vie secondarie.\n\nAttento alle taverne.\n\n— Tomas',
      check: h => (h.totalKm || 0) >= 100,
    },
    {
      id: 'oracle_lv20',
      sender: 'L\'Oracolo di Pietra', role: 'Santuario del Nord', icon: '🔮', img: 'assets/ui/epistolario/oracolo.webp',
      title: 'Una profezia di tre ere fa',
      body: 'Il viandante che cammina senza fermarsi\nnon cerca una meta — cerca se stesso.\n\nTroverai la tua risposta là dove la strada finisce.\nMa la strada non finisce mai per chi non smette di muoversi.\n\nUsa questo sapere con cura.\n\n— L\'Oracolo',
      check: h => (h.level || 1) >= 20,
    },
    {
      id: 'king_lv25',
      sender: 'Re Aldric di Oakhaven', role: 'Il trono vuoto del Reame', icon: '👑', img: 'assets/ui/epistolario/aldric.webp',
      title: 'Decreto reale n.1 (dopo l\'Orda)',
      body: 'A chi legge queste parole,\n\nIl mio trono è infranto. La mia corte è dispersa. Ma il mio reame non è morto — perché tu esisti.\n\nTi nomino, con questo atto scritto nel sangue e nella polvere, Cavaliere della Ricostruzione.\n\nServi bene. Non per me. Per tutti quelli che non sono tornati.\n\n— Re Aldric, ultimo del suo nome',
      check: h => (h.level || 1) >= 25,
    },
    {
      id: 'rival_lv35',
      sender: 'Kael il Grigio', role: 'Avventuriero Errante', icon: '⚔️', img: 'assets/ui/epistolario/kael.webp',
      title: 'Una sfida o un rispetto?',
      body: 'Non mi aspettavo di sentire il tuo nome così presto.\n\nSono anni che percorro queste terre e non ho mai trovato qualcuno capace di superare certi confini così velocemente.\n\nSei davvero quello che dicono, o solo fortunato?\n\nUn giorno lo scopriremo. Fino ad allora — cammina bene.\n\n— Kael',
      check: h => (h.level || 1) >= 35,
    },
    {
      id: 'monk_streak14',
      sender: 'Fratello Ivo', role: 'Monastero del Passo Alto', icon: '📿', img: 'assets/ui/epistolario/ivo.webp',
      title: 'La disciplina è la strada',
      body: 'Figlio,\n\nQuattordici giorni senza interruzione. Nel nostro monastero, lo chiamiamo Primo Voto.\n\nNon è forza dei muscoli. È qualcosa di più difficile: la volontà di ricominciare ogni giorno.\n\nRicordalo quando ti senti stancare.\n\nIn cammino, come noi.\n\n— Fratello Ivo',
      check: h => (h.streak?.count || 0) >= 14,
    },
    {
      id: 'lorekeeper_lv50',
      sender: 'Archivista Syl', role: 'Grande Archivio di Oakhaven', icon: '📚', img: 'assets/ui/epistolario/syl.webp',
      title: 'Il tuo nome è nel registro',
      body: 'Viandante,\n\nHo cercato il tuo nome in quarant\'anni di registri. Non c\'eri.\n\nQuesto vuol dire che sei qualcosa di nuovo.\n\nIl Grande Archivio non registra i personaggi famosi — registra gli unici. E tu lo sei.\n\nIl tuo capitolo è già aperto.\n\n— Syl, Archivista del Vento',
      check: h => (h.level || 1) >= 50,
    },
    {
      id: 'council_km500',
      sender: 'Consiglio degli Araldi', role: 'Alta Corte di Oakhaven', icon: '🏛️', img: 'assets/ui/epistolario/araldi.webp',
      title: 'Cinquecentoleghe — un titolo',
      body: 'Al Portatore di questa lettera,\n\nIl Consiglio degli Araldi, per decisione unanime, conferisce il titolo di\n\n★ ARALDO DELLE VIE PERDUTE ★\n\na chi ha percorso cinquecento chilometri al servizio del Reame.\n\nPochi hanno mai meritato questo nome. Ora è tuo.\n\nSigillato nel nome di Oakhaven.',
      check: h => (h.totalKm || 0) >= 500,
    },
  ];

  function checkPendingLetters(hero) {
    const received = hero.lettersReceived || [];
    return WORLD_LETTERS.filter(l => !received.includes(l.id) && l.check(hero));
  }

  /* ── Tappe della Via — Milestone ogni 3 allenamenti ── */
  const MILESTONES = [
    // ── Bronzo (sessioni 3-15) ──────────────────────────────────
    { id:'ms_3',  session:3,  tier:'bronzo',     icon:'🏅',
      title:'Primo Segno del Cammino',
      scene:'Il locandiere di Oakhaven ti ferma all\'uscita. «Ho visto molti partire da quella porta. Pochi tornano tre volte.» Ti allunga qualcosa senza aggiungere altro.',
      reward:{ gold:120, consumable:'golem_paglia' } },
    { id:'ms_6',  session:6,  tier:'bronzo',     icon:'🏅',
      title:'Le Vie Riconoscono i Tuoi Passi',
      scene:'Una guardia di frontiera ti saluta per nome, anche se non ti ha mai visto prima. «Il nome di chi cammina viaggia lontano», dice. «Ecco una piccola scorta per il prossimo tratto.»',
      reward:{ gold:150, consumable:'dado_runico' } },
    { id:'ms_9',  session:9,  tier:'bronzo',     icon:'🏅',
      title:'Il Nord Sussurra',
      scene:'Un messaggero alato — o qualcosa che ci somiglia — lascia un pacchetto alla tua porta. Non c\'è mittente. Solo un sigillo che non hai mai visto.',
      reward:{ gold:180, consumable:'biscotto_stellare' } },
    { id:'ms_12', session:12, tier:'bronzo',     icon:'🏅',
      title:'Il Borgo Ha Memoria',
      scene:'Al mercato, un commerciante anziano ti offre uno sconto senza che tu abbia chiesto nulla. «Chi torna dodici volte», mormora, «merita questo.»',
      reward:{ gold:220, consumable:'corno_celtico' } },
    { id:'ms_15', session:15, tier:'bronzo',     icon:'🏅',
      title:'Il Tuo Nome Viaggia',
      scene:'Un viandante proveniente da Est ti cerca per nome. «Il Consiglio di Ferro ha sentito delle tue imprese», dice. «Vogliono che tu sappia: stanno osservando.» Ti lascia una borsa prima di sparire.',
      reward:{ gold:280, consumable:'torcia_lunare' } },
    // ── Argento (sessioni 18-30) ────────────────────────────────
    { id:'ms_18', session:18, tier:'argento',    icon:'🥈',
      title:'L\'Arena Ti Rispetta',
      scene:'Prima di entrare nell\'arena, il guardiano ti fa passare senza pagare. «Tu non sei un turista», dice. «Prendi questo come tributo.»',
      reward:{ gold:350, consumable:'runa_fuoco' } },
    { id:'ms_21', session:21, tier:'argento',    icon:'🥈',
      title:'La Sacerdotessa del Bosco',
      scene:'Una figura in verde appare all\'alba davanti al tuo accampamento. Non parla. Lascia sul terreno un fascio di erbe intrecciato con un nastro d\'argento, poi svanisce tra gli alberi.',
      reward:{ gold:400, consumable:'artiglio_fortuna' } },
    { id:'ms_24', session:24, tier:'argento',    icon:'🥈',
      title:'Rotta nel Ferro',
      scene:'Gora la fabbra ti chiama nella sua fucina, di notte. «Ho rifatto questa cosa tre volte», dice indicando qualcosa avvolto in cuoio. «Nessuno era degno. Adesso lo sei tu.»',
      reward:{ gold:450, consumable:'disco_runico' } },
    { id:'ms_27', session:27, tier:'argento',    icon:'🥈',
      title:'La Profezia Non Completata',
      scene:'Nell\'archivio trovi una pagina che ti aspettava: «...e al ventisettesimo cammino, il viandante aprirà la porta che tutti credevano chiusa.» Non sai quale porta. Eppure senti che è vicina.',
      reward:{ gold:500, consumable:'bussola_arcana' } },
    { id:'ms_30', session:30, tier:'argento',    icon:'🥈',
      title:'La Via Diventa Leggenda',
      scene:'Un cantastorie di passaggio chiede il permesso di dedicarti un verso. Non aspetta risposta. Comincia a cantare. Quando finisce, la piazza è silenziosa. Poi tutti applaudono.',
      reward:{ gold:600, consumable:'candeliere_spia' } },
    // ── Oro (sessioni 33-45) ────────────────────────────────────
    { id:'ms_33', session:33, tier:'oro',        icon:'🥇',
      title:'La Luce di Oakhaven',
      scene:'Il sindaco del Borgo ti convoca. La sala del consiglio è vuota tranne che per voi due. «Non è mai successo prima», dice, «ma il Borgo vuole darti qualcosa.» Apre un baule.',
      reward:{ gold:750, consumable:'guanto_cristallo' } },
    { id:'ms_36', session:36, tier:'oro',        icon:'🥇',
      title:'Il Druido della Quarta Via',
      scene:'Un druido senza nome ti lascia un messaggio inciso su corteccia: «Chi percorre la quarta via non chiede dove porta. Sa già.» Incastrato nella corteccia c\'è qualcosa di prezioso.',
      reward:{ gold:800, consumable:'cristallo_fuoco' } },
    { id:'ms_39', session:39, tier:'oro',        icon:'🥇',
      title:'Il Confine del Possibile',
      scene:'Davanti a te c\'è una porta di pietra che non hai mai notato. Sopra c\'è scritto: «Solo chi è tornato trentanove volte può aprirla.» La porta è già aperta. Ti aspettava.',
      reward:{ gold:900, consumable:'magnete_ricchezze' } },
    { id:'ms_42', session:42, tier:'oro',        icon:'🥇',
      title:'Il Quarantaduesimo Cammino',
      scene:'Kael il Grigio ti raggiunge al campo. Non parla per un\'ora intera. Poi dice: «Non sono venuto a sfidarti. Sono venuto a imparare.» Rimane al fuoco tutta la notte.',
      reward:{ gold:1000, consumable:'patto_guerriero' } },
    { id:'ms_45', session:45, tier:'oro',        icon:'🥇',
      title:'Il Confine del Reame',
      scene:'Ai confini del reame conosciuto trovi un cippo di pietra con il tuo nome inciso. Qualcuno lo ha messo lì prima che tu arrivasse. La data è quella di domani.',
      reward:{ gold:1100, consumable:'medaglione_grifone' } },
    // ── Leggendario (sessioni 48-60) ────────────────────────────
    { id:'ms_48', session:48, tier:'leggendario', icon:'👑',
      title:'Il Consiglio degli Dei',
      scene:'In sogno — o forse non in sogno — una voce dice: «Non ti abbiamo mai visto fermare. Ecco perché ti abbiamo lasciato andare.» Al risveglio trovi qualcosa che non c\'era prima.',
      reward:{ gold:1400, consumable:'sfera_fortuna' } },
    { id:'ms_51', session:51, tier:'leggendario', icon:'👑',
      title:'La Cinquantunesima Alba',
      scene:'All\'alba del cinquantunesimo allenamento, il sole sorge nella direzione sbagliata. Per tre secondi, tutto è immobile. Poi il mondo riprende. Sul tuo zaino trovi un sigillo che non riconosci — ma che senti di dover tenere.',
      reward:{ gold:1500, consumable:'scudo_cronos' } },
    { id:'ms_54', session:54, tier:'leggendario', icon:'👑',
      title:'Il Nome Inciso nel Granito',
      scene:'Nel Grande Archivio, l\'Archivista Syl ti mostra una parete di granito dove sono incisi i nomi dei più grandi viandanti della storia del reame. Il tuo nome è già lì, ancora fresco.',
      reward:{ gold:1700, consumable:'leone_alato' } },
    { id:'ms_57', session:57, tier:'leggendario', icon:'👑',
      title:'L\'Eredità',
      scene:'Un bambino ti ferma per strada. «Voglio fare quello che fai tu», dice. Non aspetta risposta. Corre via. Capisci che il reame che lasci è diverso da quello in cui sei arrivato.',
      reward:{ gold:1800, consumable:'piuma_fenice' } },
    { id:'ms_60', session:60, tier:'leggendario', icon:'👑',
      title:'SESSANTA SESSIONI — La Via Immortale',
      scene:'Sessanta volte sei partito. Sessanta volte sei tornato. Il reame porta il tuo nome nei cantastorie, nei mercati, nelle fortezze. Non c\'è più confine che non riconosca il tuo passo.\n\nSei diventato parte della leggenda.',
      reward:{ gold:2500, consumable:'progetto_castello' } },
  ];

  function checkPendingMilestones(hero) {
    const reached = hero.milestonesReached || [];
    const sessions = hero.totalSessions || 0;
    return MILESTONES.filter(m => sessions >= m.session && !reached.includes(m.id));
  }

  /* ── Bacheca del Viandante ── */
  const BOARD_NPCS = [
    { name:'Miro il Mercante',        role:'Mercante',        icon:'🧑‍💼', requests:['Ha un pacco urgente che nessuno vuole toccare.','Il mulo se n\'è andato e lui non può muoversi.','Un cliente speciale aspetta da stamane.'] },
    { name:'Syl l\'Archivista',       role:'Archivista',      icon:'📚',  requests:['Cerca un tomo perduto oltre le mura.','Vuole misurare una distanza per un\'antica mappa.','Ha dimenticato qualcosa al Convento del Silenzio.'] },
    { name:'Gareth la Guardia',       role:'Guardia',         icon:'🗡️',  requests:['Chiede un giro di perlustrazione al confine nord.','Vuole che qualcuno controlli il vecchio posto di guardia.','Ha perso il casco in pattuglia e preferisce non dirlo al capitano.'] },
    { name:'Netta la Droghiera',      role:'Erborista',       icon:'🌿',  requests:['Ha bisogno di erbe del Bosco Cupo — fresche.','Cerca la radice della Vigna Bianca prima che appassisca.','Manda a prendere una scorta di funghi prima della pioggia.'] },
    { name:'Bram il Fabbro',          role:'Fabbro',          icon:'⚒️',  requests:['Ha del carbone da ritirare al magazzino nord.','Attende una spedizione di lingotti che nessuno ha portato.','Vuole che qualcuno provi le scarpe ferrate appena forgiate.'] },
    { name:'Lira la Guaritrice',      role:'Guaritrice',      icon:'⚕️',  requests:['Porta medicine a chi non può camminare.','Un paziente lontano aspetta una pozione.','Deve sapere se il passo nord è praticabile prima di uscire.'] },
    { name:'Odo il Taverniere',       role:'Taverniere',      icon:'🍺',  requests:['Ha una botte vuota da restituire al fornitore.','Un cliente speciale aspetta una consegna a domicilio.','Cerca un messaggero per recapitare l\'ordine di birra.'] },
    { name:'Finn il Pescatore',       role:'Pescatore',       icon:'🎣',  requests:['Il pesce deve arrivare al mercato mentre è ancora fresco.','Ha una rete da recuperare a riva prima che affondi.','Vuole sapere com\'è il fiume a monte — senza andarci lui.'] },
    { name:'Tara la Tessitrice',      role:'Tessitrice',      icon:'🧵',  requests:['Manda a prendere lana grezza oltre il colle.','Ha un rotolo di tessuto da consegnare alla sartoria.','Cerca un tipo speciale di canna per i telai — cresce lontano.'] },
    { name:'Rowan l\'Esploratore',    role:'Esploratore',     icon:'🗺️',  requests:['Chiede un sopralluogo al bivio meridionale.','Vuole conferma che il sentiero è ancora aperto.','Ha bisogno di un report sulla strada di pietra — a piedi, non a cavallo.'] },
    { name:'Petra la Contadina',      role:'Contadina',       icon:'🌾',  requests:['Il grano deve arrivare al mulino entro sera.','Ha bisogno che qualcuno porti le uova in città senza romperle.','Un vecchio agricoltore aspetta la sua parte di raccolto.'] },
    { name:'Sig il Giocoliere',       role:'Artista',         icon:'🎭',  requests:['Ha dimenticato i birilli a metà strada.','Cerca un assistente per portare i bagagli allo spettacolo.','Vuole qualcuno che misuri il piazzale a piedi — per ragioni artistiche.'] },
    { name:'Vex lo Stregone',         role:'Stregone',        icon:'🔮',  requests:['Ha bisogno di ingredienti freschi dalla foresta — non stantii.','Chiede di raccogliere rugiada al mattino, in un posto distante.','Vuole che qualcuno testi un amuleto camminando. Non chiede altro.'] },
    { name:'Dane il Cacciatore',      role:'Cacciatore',      icon:'🏹',  requests:['Chiede un giro di perlustrazione nella radura est.','Ha una trappola da controllare oltre il bosco — senza disturbarla.','Vuole sapere se ci sono tracce fresche a nord.'] },
    { name:'Clem il Cursore',         role:'Corriere',        icon:'📜',  requests:['Ha documenti urgenti per il Notaio — ieri.','Un sigillo deve arrivare al Consiglio prima del tramonto.','Porta questo rotolo al Convento. Non aprirlo. Per nessuna ragione.'] },
    { name:'Kira l\'Addestratrice',   role:'Addestratrice',   icon:'🐕',  requests:['Il cane deve fare la sua corsetta — lei ha i piedi a pezzi.','Ha un cucciolo da portare al suo nuovo padrone.','Chiede una scorta per il suo mastino durante la passeggiata serale.'] },
    { name:'Orn il Botanico',         role:'Botanico',        icon:'🌱',  requests:['Raccoglie campioni di lichene a nord — urgente, stagione breve.','Vuole misurare dove crescono le piante del bordo strada.','Ha bisogno di qualcuno che scandagli il prato con pazienza.'] },
    { name:'Hob il Goblin',           role:'Goblin',          icon:'👺',  requests:['Ha scommesso che qualcuno poteva fare quel percorso. Perde se non trovi nessuno.','Vuole vincere una gara: tu corri, lui prende metà scommessa.','Dice che nessuno riesce a farcela. Dimostraglielo.'] },
    { name:'Zia Marta',               role:'Anziana',         icon:'👵',  requests:['Il nipote aspetta la torta — e il villaggio è lontano.','Vuole che qualcuno visiti il cimitero per lei. «Diglielo tu.»','Ha lasciato le chiavi da qualche parte. Vai a cercarle.'] },
    { name:'Il Fantasma del Crocevia',role:'Spirito',         icon:'👻',  requests:['Non spiega perché. Vuole solo che qualcuno cammini per lui.','Indica una direzione e svanisce. Seguila.','Sussurra una distanza. Percorrila.'] },
    { name:'Mab la Strega',           role:'Strega',          icon:'🧙‍♀️', requests:['Un incantesimo richiede che qualcuno cammini in cerchio — grande.','Ha bisogno di passi, non di magia. I suoi finiscono.','Ogni km percorso alimenta un suo calderone lontano.'] },
    { name:'Baldo il Minatore',       role:'Minatore',        icon:'⛏️',  requests:['Vuole un sopralluogo alle cave del nord — il piccone non basta.','Ha un sacco di carbone da portare al fondovalle, ma la schiena non regge.','Chiede di controllare lo stato del sentiero delle cave dopo il crollo.'] },
    { name:'Ylla la Cantora',         role:'Barda',           icon:'🎵',  requests:['Porta questo messaggio cantato — non in forma scritta.','Ha perso la voce ma non il messaggio. Portalo tu.','Deve arrivare una melodia a tre destinatari sparsi per la città.'] },
    { name:'Dax il Contrabbandiere',  role:'Contrabbandiere', icon:'🥷',  requests:['Muoviti come se non stessi portando niente di importante.','Ha bisogno di qualcuno che faccia da diversivo mentre lui si sposta.','Cammina da questo lato — e fai finta di non conoscerlo.'] },
    { name:'Ria la Cartografa',       role:'Cartografa',      icon:'🗺️',  requests:['Misura questa strada a piedi — non si fida delle stime a cavallo.','Vuole la distanza esatta fino al bordo della foresta.','Ha bisogno di un secondo parere su una mappa. Cammina e conta.'] },
    { name:'Il Biscazziere',          role:'Biscazziere',     icon:'🃏',  img:'biscazziere', requests:['Ha un debito da riscuotere oltre il ponte — ma i suoi piedi non lo portano.','Vuole che qualcuno consegni una busta. "Non aprirla. Non leggerla. Vai."','Ha un\'ultima mano da giocare. Serve un messaggero veloce.'] },
  ];

  const BOARD_QUEST_POOL = [
    { tier:'commissione', km:1,   text:(n,r)=>`${n.name} ti ferma: "${r}" Non è lontano — 1 km circa.`,                              reward:{ gold:35,  xp:40  } },
    { tier:'commissione', km:1.5, text:(n,r)=>`"${r}" chiede ${n.name}. Sono poco più di un km. Vai.`,                               reward:{ gold:42,  xp:50  } },
    { tier:'commissione', km:2,   text:(n,r)=>`${n.name} (${n.role}) ti aspetta. "${r}" 2 km, andata e ritorno.`,                     reward:{ gold:55,  xp:65  } },
    { tier:'incarico',    km:3,   text:(n,r)=>`${n.name} si avvicina con aria seria. "${r}" Ci vuole mezza mattina — 3 km circa.`,    reward:{ gold:72,  xp:85,  wood:3 } },
    { tier:'incarico',    km:4,   text:(n,r)=>`"${r}" dice ${n.name}. "Porta un po' di fiato." 4 km, niente di più.`,                reward:{ gold:85,  xp:100, wood:4 } },
    { tier:'incarico',    km:5,   text:(n,r)=>`${n.name} stringe la mano. "${r}" Vale la pena. 5 km di cammino.`,                    reward:{ gold:100, xp:120, wood:5 } },
    { tier:'missione',    km:6,   text:(n,r)=>`${n.name} parla a bassa voce. "${r}" È un incarico serio. 6 km, almeno.`,             reward:{ gold:115, xp:140, wood:4, stone:3 } },
    { tier:'missione',    km:8,   text:(n,r)=>`"${r}" dice ${n.name} allungandoti qualcosa. "Fidati di me." 8 km ti aspettano.`,     reward:{ gold:132, xp:170, wood:6, stone:4 } },
    { tier:'missione',    km:10,  text:(n,r)=>`${n.name} ti guarda negli occhi. "${r}" L'incarico è grande — 10 km. Ce la fai?`,     reward:{ gold:150, xp:200, wood:8, stone:5 } },
  ];

  const _BOARD_CONS_DROP = {
    commissione: { chance:0.15, rarities:['comune'] },
    incarico:    { chance:0.20, rarities:['comune','non_comune'] },
    missione:    { chance:0.25, rarities:['comune','non_comune','raro'] },
  };

  function _boardRng(seed) {
    let s = Math.abs(seed % 2147483647) || 1;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  function generateDailyBoard(hero) {
    const today = new Date().toISOString().slice(0, 10);
    if (hero.board && hero.board.date === today) return hero.board;
    const seedNum = parseInt(today.replace(/-/g, ''), 10) + (hero.totalSessions || 1) * 7;
    const rng = _boardRng(seedNum);
    const tiers = ['commissione', 'incarico', 'missione'];
    const usedNpcs = [];
    const quests = tiers.map(tier => {
      const pool = BOARD_QUEST_POOL.filter(q => q.tier === tier);
      const tpl = pool[Math.floor(rng() * pool.length)];
      let npcIdx;
      do { npcIdx = Math.floor(rng() * BOARD_NPCS.length); } while (usedNpcs.includes(npcIdx));
      usedNpcs.push(npcIdx);
      const npc = BOARD_NPCS[npcIdx];
      const req = npc.requests[Math.floor(rng() * npc.requests.length)];
      const drop = _BOARD_CONS_DROP[tier];
      let cons = null;
      if (rng() < drop.chance) {
        const eligible = CONSUMABLES.filter(c => drop.rarities.includes(c.rarity));
        if (eligible.length) cons = eligible[Math.floor(rng() * eligible.length)].id;
      }
      return {
        id: `bq_${today}_${tier}`,
        tier, km: tpl.km,
        npc: { name: npc.name, icon: npc.icon, role: npc.role },
        text: tpl.text(npc, req),
        reward: { ...tpl.reward, consumable: cons },
      };
    });
    hero.board = { date: today, quests, claimed: [] };
    return hero.board;
  }

  function claimBoardReward(hero, questId) {
    const board = hero.board;
    if (!board) return 'Nessuna bacheca attiva.';
    const q = board.quests.find(x => x.id === questId);
    if (!q) return 'Missione non trovata.';
    if (board.claimed.includes(questId)) return 'Già riscattata.';
    board.claimed.push(questId);
    if (q.reward.gold)  hero.gold += q.reward.gold;
    if (q.reward.xp)    applyXp(hero, q.reward.xp);
    if (q.reward.wood)  hero.resources.wood  = (hero.resources.wood  || 0) + q.reward.wood;
    if (q.reward.stone) hero.resources.stone = (hero.resources.stone || 0) + q.reward.stone;
    if (q.reward.consumable) addConsumable(hero, q.reward.consumable);
    return null;
  }

  /* ── Camp Evolution ──
   * Panorama 2:1 (width:height). Coordinate: left%, bottom%, width% relativi al contenitore.
   * Background PNG: assets/rifugio/scene/bg_stage{0-4}.webp  (2000×1000px consigliato)
   * Layer PNG:      assets/rifugio/scene/{id}.webp            (PNG con trasparenza)
   */
  const CAMP_STAGES = [
    { id: 0, minLevel: 0,  label: 'Accampamento' },
    { id: 1, minLevel: 10, label: 'Avamposto'    },
    { id: 2, minLevel: 20, label: 'Rifugio'      },
    { id: 3, minLevel: 30, label: 'Fortilizio'   },
    { id: 4, minLevel: 40, label: 'Cittadella'   },
  ];

  const CAMP_LAYERS = [
    // ── Stage 0: Accampamento ──
    // Zone: [tent 1-37] gap [campfire 39-57] [bedroll 58-74] [supply 75-88] [banner 85-95]
    { id: 'campfire',      stage: 0, minLevel: 0,  left: 39, bottom: 7,  width: 18, z: 10 },
    { id: 'bedroll',       stage: 0, minLevel: 2,  left: 58, bottom: 3,  width: 16, z: 8  },
    { id: 'supply_sack',   stage: 0, minLevel: 4,  left: 75, bottom: 4,  width: 13, z: 8  },
    { id: 'tent_small',    stage: 0, minLevel: 6,  left: 1,  bottom: 8,  width: 36, z: 9  },
    { id: 'banner_worn',   stage: 0, minLevel: 8,  left: 85, bottom: 12, width: 10, z: 7  },
    // ── Stage 1: Avamposto ──
    // Zone: [tower 0-20] [cabin 19-59] [well 59-71] [blacksmith 71-95] | stockade bg [54-98]
    { id: 'log_cabin',     stage: 1, minLevel: 10, left: 19, bottom: 8,  width: 40, z: 12 },
    { id: 'stockade',      stage: 1, minLevel: 12, left: 54, bottom: 2,  width: 44, z: 9  },
    { id: 'blacksmith',    stage: 1, minLevel: 14, left: 71, bottom: 8,  width: 24, z: 11 },
    { id: 'well',          stage: 1, minLevel: 16, left: 59, bottom: 4,  width: 12, z: 10 },
    { id: 'watchtower_s',  stage: 1, minLevel: 18, left: 0,  bottom: 10, width: 20, z: 13 },
    // ── Stage 2: Rifugio ──
    // Zone: [forge 1-23] [stone_hall 21-65] [market 64-80] [stable 68-94] + banner su hall
    { id: 'stone_hall',    stage: 2, minLevel: 20, left: 21, bottom: 10, width: 44, z: 14 },
    { id: 'stable',        stage: 2, minLevel: 22, left: 68, bottom: 8,  width: 26, z: 12 },
    { id: 'forge',         stage: 2, minLevel: 24, left: 1,  bottom: 8,  width: 22, z: 11 },
    { id: 'market_stall',  stage: 2, minLevel: 26, left: 64, bottom: 4,  width: 16, z: 10 },
    { id: 'banner_guild',  stage: 2, minLevel: 28, left: 40, bottom: 22, width: 10, z: 15 },
    // ── Stage 3: Fortilizio ──
    // Zone: [armory 1-25] [keep 24-68] [library 70-96] | siege fg [70-92] | wall bg
    { id: 'fortress_wall', stage: 3, minLevel: 30, left: 0,  bottom: 0,  width: 100, z: 6  },
    { id: 'keep',          stage: 3, minLevel: 32, left: 24, bottom: 14, width: 44, z: 16 },
    { id: 'armory',        stage: 3, minLevel: 34, left: 1,  bottom: 10, width: 24, z: 14 },
    { id: 'library',       stage: 3, minLevel: 36, left: 70, bottom: 10, width: 26, z: 14 },
    { id: 'siege_engine',  stage: 3, minLevel: 38, left: 70, bottom: 4,  width: 22, z: 17 },
    // ── Stage 4: Cittadella ──
    // Zone: [barracks 1-27] [citadel 25-69] [arcane_tower 70-96] | monument fg | banner alto
    { id: 'citadel',       stage: 4, minLevel: 40, left: 25, bottom: 15, width: 44, z: 18 },
    { id: 'arcane_tower',  stage: 4, minLevel: 42, left: 70, bottom: 18, width: 26, z: 17 },
    { id: 'barracks',      stage: 4, minLevel: 44, left: 1,  bottom: 8,  width: 26, z: 15 },
    { id: 'monument',      stage: 4, minLevel: 46, left: 44, bottom: 4,  width: 15, z: 19 },
    { id: 'dragon_banner', stage: 4, minLevel: 48, left: 38, bottom: 38, width: 12, z: 22 },
  ];

  /* Layers che appaiono solo di notte/tramonto — universali per tutti gli stage */
  const CAMP_NIGHT_LAYERS = [
    { id: 'moon',      left: 44, bottom: 80, width: 12, z: 23 },
    { id: 'fire_glow', left: 38, bottom: 2,  width: 24, z: 11 },
  ];

  /* Catalogo acquisti per i layer — legno + pietra, nessun costo oro */
  const CAMP_LAYER_SHOP = [
    // ── Stage 0: Accampamento ──
    { id: 'campfire',      stage: 0, minLevel: 0,  name: 'Fuoco da Campo',          icon: '🔥', price: { wood: 8,   stone: 0   } },
    { id: 'bedroll',       stage: 0, minLevel: 2,  name: 'Giaciglio dell\'Eroe',     icon: '🛏️', price: { wood: 10,  stone: 4   } },
    { id: 'supply_sack',   stage: 0, minLevel: 4,  name: 'Sacchi dei Rifornimenti', icon: '🎒', price: { wood: 12,  stone: 6   } },
    { id: 'tent_small',    stage: 0, minLevel: 6,  name: 'Tenda da Campo',          icon: '⛺', price: { wood: 18,  stone: 8   } },
    { id: 'banner_worn',   stage: 0, minLevel: 8,  name: 'Stendardo Consumato',     icon: '🚩', price: { wood: 15,  stone: 12  } },
    // ── Stage 1: Avamposto ──
    { id: 'log_cabin',     stage: 1, minLevel: 10, name: 'Capanna di Tronchi',      icon: '🏠', price: { wood: 30,  stone: 15  } },
    { id: 'stockade',      stage: 1, minLevel: 12, name: 'Palizzata',               icon: '🌲', price: { wood: 25,  stone: 30  } },
    { id: 'blacksmith',    stage: 1, minLevel: 14, name: 'Fucina del Fabbro',       icon: '⚒️', price: { wood: 20,  stone: 40  } },
    { id: 'well',          stage: 1, minLevel: 16, name: 'Pozzo del Villaggio',     icon: '🪣', price: { wood: 15,  stone: 45  } },
    { id: 'watchtower_s',  stage: 1, minLevel: 18, name: 'Torre di Guardia',        icon: '🗼', price: { wood: 35,  stone: 35  } },
    // ── Stage 2: Rifugio ──
    { id: 'stone_hall',    stage: 2, minLevel: 20, name: 'Sala di Pietra',          icon: '🏛️', price: { wood: 40,  stone: 80  } },
    { id: 'stable',        stage: 2, minLevel: 22, name: 'Scuderia',                icon: '🐴', price: { wood: 60,  stone: 50  } },
    { id: 'forge',         stage: 2, minLevel: 24, name: 'Grande Forgia',           icon: '🔨', price: { wood: 35,  stone: 90  } },
    { id: 'market_stall',  stage: 2, minLevel: 26, name: 'Bancarella del Mercato',  icon: '🏪', price: { wood: 50,  stone: 65  } },
    { id: 'banner_guild',  stage: 2, minLevel: 28, name: 'Stendardo della Gilda',   icon: '🏴', price: { wood: 30,  stone: 60  } },
    // ── Stage 3: Fortilizio ──
    { id: 'fortress_wall', stage: 3, minLevel: 30, name: 'Mura Difensive',          icon: '🧱', price: { wood: 60,  stone: 120 } },
    { id: 'keep',          stage: 3, minLevel: 32, name: 'Mastio Centrale',         icon: '🏰', price: { wood: 80,  stone: 150 } },
    { id: 'armory',        stage: 3, minLevel: 34, name: 'Arsenale',                icon: '⚔️', price: { wood: 90,  stone: 130 } },
    { id: 'library',       stage: 3, minLevel: 36, name: 'Biblioteca Arcana',       icon: '📚', price: { wood: 100, stone: 120 } },
    { id: 'siege_engine',  stage: 3, minLevel: 38, name: 'Macchina d\'Assedio',     icon: '🪃', price: { wood: 120, stone: 140 } },
    // ── Stage 4: Cittadella ──
    { id: 'citadel',       stage: 4, minLevel: 40, name: 'Cittadella',              icon: '🏯', price: { wood: 150, stone: 200 } },
    { id: 'arcane_tower',  stage: 4, minLevel: 42, name: 'Torre Arcana',            icon: '🔮', price: { wood: 120, stone: 250 } },
    { id: 'barracks',      stage: 4, minLevel: 44, name: 'Caserma',                 icon: '🛡️', price: { wood: 180, stone: 180 } },
    { id: 'monument',      stage: 4, minLevel: 46, name: 'Monumento agli Eroi',     icon: '🗿', price: { wood: 130, stone: 220 } },
    { id: 'dragon_banner', stage: 4, minLevel: 48, name: 'Stendardo del Drago',     icon: '🐉', price: { wood: 200, stone: 180 } },
  ];

  function campLayerShopItem(id) { return CAMP_LAYER_SHOP.find(l => l.id === id); }

  function buyCampLayer(hero, layerId) {
    const item = campLayerShopItem(layerId);
    if (!item) return 'Struttura sconosciuta.';
    hero.furniture = hero.furniture || { owned: [] };
    if (hero.furniture.owned.includes(layerId)) return 'Già costruita.';
    if (hero.level < item.minLevel) return `Richiede Livello ${item.minLevel}.`;
    const p = item.price;
    if (hero.wood < p.wood || hero.stone < p.stone) {
      return `Risorse insufficienti (servono 🌲${p.wood} ⛏️${p.stone}).`;
    }
    hero.wood -= p.wood; hero.stone -= p.stone;
    hero.furniture.owned.push(layerId);
    return { ok: true };
  }

  function campStageForLevel(level) {
    let s = 0;
    for (const st of CAMP_STAGES) { if ((level || 1) >= st.minLevel) s = st.id; }
    return s;
  }

  function campUnlockedLayers(hero) {
    const lv = hero.level || 1;
    const st = campStageForLevel(lv);
    const owned = (hero.furniture && hero.furniture.owned) || [];
    return CAMP_LAYERS.filter(l => l.stage === st && owned.includes(l.id));
  }

  /* ══════════════════════════════════════════════════════════
     CONSUMABILI — 50 oggetti usabili (drop, zaino, mercante)
     ══════════════════════════════════════════════════════════ */
  const CONSUMABLES = [
    // ── Pozioni ──────────────────────────────────────────────
    { id:'barile_miele',      name:'Barile di Miele',        cat:'pozioni',   rarity:'comune',     icon:'🍯', desc:'+20% XP allenamento successivo',            baseValue:15,  effect:{ type:'xp_mult',         value:0.20, sessions:1 } },
    { id:'biscotto_stellare', name:'Biscotto Stellare',      cat:'pozioni',   rarity:'comune',     icon:'🍪', desc:'+15 monete dopo l\'allenamento',             baseValue:10,  effect:{ type:'gold_flat',        value:15 } },
    { id:'corno_celtico',     name:'Corno Celtico',          cat:'pozioni',   rarity:'comune',     icon:'🍺', desc:'+10% forza Arena per oggi',                  baseValue:12,  effect:{ type:'arena_mult',       value:0.10, expiresH:24 } },
    { id:'teiera_runica',     name:'Teiera Runica',          cat:'pozioni',   rarity:'comune',     icon:'🫖', desc:'+1 sfida Arena extra oggi',                  baseValue:12,  effect:{ type:'arena_restore',    value:1 } },
    { id:'formaggio_magico',  name:'Formaggio Magico',       cat:'pozioni',   rarity:'comune',     icon:'🧀', desc:'Famiglio: +20 umore e +20 fame',             baseValue:12,  effect:{ type:'pet_care',         hunger:20, mood:20 } },
    { id:'pane_solare',       name:'Pane Solare',            cat:'pozioni',   rarity:'comune',     icon:'🍞', desc:'+15% XP allenamenti mattutini',              baseValue:12,  effect:{ type:'xp_mult',         value:0.15, sessions:1 } },
    { id:'pozione_amore',     name:'Pozione d\'Amore',       cat:'pozioni',   rarity:'comune',     icon:'💗', desc:'+15 umore famiglio',                         baseValue:10,  effect:{ type:'pet_care',         mood:15 } },
    { id:'pozione_cuore',     name:'Pozione del Cuore',      cat:'pozioni',   rarity:'raro',       icon:'❤️', desc:'+30% XP prossimi 2 allenamenti',             baseValue:40,  effect:{ type:'xp_mult',         value:0.30, sessions:2 } },
    { id:'brocca_cosmica',    name:'Brocca Cosmica',         cat:'pozioni',   rarity:'raro',       icon:'🏺', desc:'+25 legno e +25 pietra istantanei',          baseValue:30,  effect:{ type:'instant_res',      wood:25, stone:25 } },
    { id:'pozione_colomba',   name:'Pozione della Colomba',  cat:'pozioni',   rarity:'raro',       icon:'🕊️', desc:'Famiglio: umore e fame al massimo',          baseValue:45,  effect:{ type:'pet_care',         hunger:100, mood:100 } },
    { id:'elisir_celeste',    name:'Elisir Celeste',         cat:'pozioni',   rarity:'epico',      icon:'💧', desc:'Ripristina 3 sfide Arena oggi',              baseValue:80,  effect:{ type:'arena_restore',    value:3 } },
    { id:'mela_dorata',       name:'Mela Dorata',            cat:'pozioni',   rarity:'epico',      icon:'🍏', desc:'+100 XP + famiglio curato al massimo',       baseValue:90,  effect:{ type:'multi', effects:[{ type:'xp_flat', value:100 }, { type:'pet_care', hunger:100, mood:100 }] } },
    { id:'pozione_vento',     name:'Pozione del Vento',      cat:'pozioni',   rarity:'epico',      icon:'🌬️', desc:'+1 km virtuale istantaneo sulla mappa',      baseValue:75,  effect:{ type:'map_km',           value:1 } },
    { id:'cristallo_galattico',name:'Cristallo Galattico',   cat:'pozioni',   rarity:'leggendario',icon:'🔮', desc:'Tutti i bonus attivi ×2 per 48h',            baseValue:200, effect:{ type:'all_boost',        value:1.0, expiresH:48 } },
    // ── Rune ─────────────────────────────────────────────────
    { id:'dado_runico',       name:'Dado Runico',            cat:'rune',      rarity:'comune',     icon:'🎲', desc:'Effetto casuale: XP / monete / risorse ×2',  baseValue:15,  effect:{ type:'random' } },
    { id:'artiglio_fortuna',  name:'Artiglio della Fortuna', cat:'rune',      rarity:'raro',       icon:'🦞', desc:'+30% probabilità drop raro da boss',         baseValue:35,  effect:{ type:'drop_boost',       value:0.30, expiresH:24 } },
    { id:'cristallo_fuoco',   name:'Cristallo di Fuoco',     cat:'rune',      rarity:'epico',      icon:'🔴', desc:'+50% danno Arena per 24h',                   baseValue:80,  effect:{ type:'arena_mult',       value:0.50, expiresH:24 } },
    { id:'disco_runico',      name:'Disco Runico',           cat:'rune',      rarity:'raro',       icon:'⛏️', desc:'Bonus casuale (XP/oro/risorse) per 12h',     baseValue:35,  effect:{ type:'random_timed',     expiresH:12 } },
    { id:'guanto_cristallo',  name:'Guanto di Cristallo',    cat:'rune',      rarity:'epico',      icon:'🧤', desc:'Prossima sconfitta Arena non conta',          baseValue:80,  effect:{ type:'arena_shield' } },
    { id:'medaglione_grifone',name:'Medaglione del Grifone', cat:'rune',      rarity:'epico',      icon:'🛡️', desc:'Immunità sconfitta Arena per 2 giorni',      baseValue:90,  effect:{ type:'arena_shield_long',days:2 } },
    { id:'runa_fuoco',        name:'Runa di Fuoco',          cat:'rune',      rarity:'raro',       icon:'🔥', desc:'+20% XP da battaglie Arena oggi',            baseValue:35,  effect:{ type:'arena_mult',       value:0.20, expiresH:24 } },
    { id:'sfera_ombra',       name:'Sfera d\'Ombra',         cat:'rune',      rarity:'epico',      icon:'🌑', desc:'Ottieni drop boss anche se hai perso',        baseValue:80,  effect:{ type:'boss_shield' } },
    { id:'pietra_tempo',      name:'Pietra del Tempo',       cat:'rune',      rarity:'leggendario',icon:'⌛', desc:'Azzera tutti i cooldown attivi',             baseValue:200, effect:{ type:'reset_all' } },
    // ── Utility ──────────────────────────────────────────────
    { id:'bussola_arcana',    name:'Bussola Arcana',         cat:'utility',   rarity:'raro',       icon:'🧭', desc:'Rivela prossima zona mappa 3 giorni prima',  baseValue:30,  effect:{ type:'map_reveal' } },
    { id:'golem_paglia',      name:'Golem di Paglia',        cat:'utility',   rarity:'comune',     icon:'🪆', desc:'Protegge la streak per 1 giorno',            baseValue:25,  effect:{ type:'streak_shield',    days:1 } },
    { id:'clessidra_arcana',  name:'Clessidra Arcana',       cat:'utility',   rarity:'epico',      icon:'⏳', desc:'Azzera il cooldown Pozione del Giorno',      baseValue:80,  effect:{ type:'potion_reset' } },
    { id:'candeliere_spia',   name:'Candeliere Spia',        cat:'utility',   rarity:'raro',       icon:'🕯️', desc:'Rivela il contenuto del prossimo forziere',  baseValue:30,  effect:{ type:'chest_reveal' } },
    { id:'cannocchiale_arcano',name:'Cannocchiale Arcano',   cat:'utility',   rarity:'raro',       icon:'🔭', desc:'Anteprima boss della prossima settimana',    baseValue:30,  effect:{ type:'boss_preview' } },
    { id:'chiave_scalata',    name:'Chiave della Scalata',   cat:'utility',   rarity:'epico',      icon:'🗝️', desc:'Concede un secondo accesso giornaliero alla Scalata dell\'Eroe', baseValue:90, effect:{ type:'scalata_reset' } },
    { id:'elmo_scalatore',    name:'Elmo dello Scalatore',   cat:'utility',   rarity:'raro',       icon:'⛑️', desc:'Prossima Scalata: parti con +30 HP massimi',                     baseValue:55, effect:{ type:'scalata_hp_bonus', value:30 } },
    { id:'pozione_scalata',   name:'Pozione dello Scalatore',cat:'pozioni',   rarity:'comune',     icon:'🍶', desc:'Cura 30 HP all\'eroe nella Scalata in corso',                    baseValue:20, effect:{ type:'scalata_heal',     value:30 } },
    { id:'gettone_bisca',     name:'Gettone della Bisca',    cat:'utility',   rarity:'comune',     icon:'🎟️', desc:'Aggiunge 1 scommessa extra alla Bisca Oscura oggi',              baseValue:18, effect:{ type:'bisca_extra_bet' } },
    { id:'amuleto_vincente',  name:'Amuleto Vincente',       cat:'utility',   rarity:'raro',       icon:'🍀', desc:'Prossima scommessa alla Bisca: se vinci il payout è raddoppiato', baseValue:55, effect:{ type:'bisca_double_payout' } },
    { id:'torcia_orda',       name:'Torcia dell\'Orda',      cat:'utility',   rarity:'comune',     icon:'🕯️', desc:'Rivela le debolezze di tutti i nemici nel prossimo assalto al Covo', baseValue:22, effect:{ type:'dungeon_reveal_weak' } },
    { id:'runa_assalto',      name:'Runa d\'Assalto',        cat:'rune',      rarity:'raro',       icon:'🔮', desc:'+35 danni al prossimo scontro nel Covo dell\'Orda',               baseValue:50, effect:{ type:'dungeon_buff_dmg',  value:35 } },
    { id:'chiave_zodiacale',  name:'Chiave Zodiacale',       cat:'utility',   rarity:'epico',      icon:'🔑', desc:'Apre forziere speciale con drop raro garantito', baseValue:85, effect:{ type:'open_special_chest' } },
    { id:'contratto_mostri',  name:'Contratto dei Mostri',   cat:'utility',   rarity:'raro',       icon:'📋', desc:'Sfida un boss extra fuori dal calendario',   baseValue:40,  effect:{ type:'extra_boss' } },
    { id:'incensiere_drago',  name:'Incensiere del Drago',   cat:'utility',   rarity:'raro',       icon:'🐉', desc:'+2 legno e +2 pietra per ogni allenamento oggi', baseValue:35, effect:{ type:'res_per_session', wood:2, stone:2, expiresH:24 } },
    { id:'lente_tesoro',      name:'Lente del Tesoro',       cat:'utility',   rarity:'raro',       icon:'🔍', desc:'Rivela il reward nascosto nel prossimo forziere', baseValue:30, effect:{ type:'chest_reveal' } },
    { id:'magnete_ricchezze', name:'Magnete delle Ricchezze',cat:'utility',   rarity:'epico',      icon:'🧲', desc:'+40% monete da tutte le fonti per 24h',      baseValue:85,  effect:{ type:'gold_mult',        value:0.40, expiresH:24 } },
    { id:'mappa_tesoro',      name:'Mappa del Tesoro',       cat:'utility',   rarity:'raro',       icon:'🗺️', desc:'Aggiunge un forziere bonus alla mappa',      baseValue:40,  effect:{ type:'bonus_chest' } },
    { id:'pergamena_arcana',  name:'Pergamena Arcana',       cat:'utility',   rarity:'epico',      icon:'📜', desc:'+5% XP passivo per 3 allenamenti',           baseValue:80,  effect:{ type:'xp_mult',         value:0.05, sessions:3 } },
    { id:'pergamena_occhio',  name:'Pergamena dell\'Occhio', cat:'utility',   rarity:'raro',       icon:'👁️', desc:'Rivela tutti i forzieri sulla mappa',        baseValue:35,  effect:{ type:'map_reveal_all' } },
    { id:'torcia_lunare',     name:'Torcia Lunare',          cat:'utility',   rarity:'raro',       icon:'🔆', desc:'+25% XP allenamenti serali (Tramonto/Notte)', baseValue:35, effect:{ type:'xp_mult',         value:0.25, sessions:1 } },
    { id:'spirito_foresta',   name:'Spirito della Foresta',  cat:'utility',   rarity:'epico',      icon:'🌳', desc:'+30 legno + bonus risorse per oggi',         baseValue:80,  effect:{ type:'multi', effects:[{ type:'instant_res', wood:30 }, { type:'res_per_session', wood:1, stone:1, expiresH:24 }] } },
    { id:'sfera_fortuna',     name:'Sfera della Fortuna',    cat:'utility',   rarity:'leggendario',icon:'🌐', desc:'+50% monete e drop per tutto il giorno',     baseValue:200, effect:{ type:'multi', effects:[{ type:'gold_mult', value:0.50, expiresH:24 }, { type:'drop_boost', value:0.50, expiresH:24 }] } },
    { id:'scudo_cronos',      name:'Scudo di Cronos',        cat:'utility',   rarity:'leggendario',icon:'🏅', desc:'Protegge la streak per 3 giorni',            baseValue:200, effect:{ type:'streak_shield',    days:3 } },
    { id:'leone_alato',       name:'Leone Alato',            cat:'utility',   rarity:'leggendario',icon:'🦁', desc:'+100% XP e monete sul prossimo allenamento', baseValue:200, effect:{ type:'xp_gold_mult',     value:1.00, sessions:1 } },
    { id:'piuma_fenice',      name:'Piuma di Fenice',        cat:'utility',   rarity:'leggendario',icon:'🪶', desc:'Ripristina streak rotta (1 uso ogni 30gg)',  baseValue:300, effect:{ type:'restore_streak' } },
    { id:'progetto_castello', name:'Progetto del Castello',  cat:'utility',   rarity:'leggendario',icon:'🏰', desc:'Sblocca 1 layer del campo gratis',           baseValue:200, effect:{ type:'free_layer' } },
    { id:'patto_guerriero',   name:'Patto del Guerriero',    cat:'utility',   rarity:'epico',      icon:'🤝', desc:'+50% XP prossimo allenamento',               baseValue:80,  effect:{ type:'xp_mult',         value:0.50, sessions:1 } },
    { id:'codice_reale',      name:'Codice Reale',           cat:'utility',   rarity:'leggendario',icon:'📚', desc:'+200 XP flat + rivela la mappa',            baseValue:250, effect:{ type:'multi', effects:[{ type:'xp_flat', value:200 }, { type:'map_reveal_all' }] } },
    // ── Materiali ─────────────────────────────────────────────
    { id:'rubinetto_oro',     name:'Rubinetto d\'Oro',       cat:'materiali', rarity:'raro',       icon:'🚰', desc:'+50 monete istantanee',                      baseValue:35,  effect:{ type:'instant_gold',     value:50 } },
    { id:'mannaia_d_oro',     name:'Mannaia d\'Oro',         cat:'materiali', rarity:'raro',       icon:'🪓', desc:'+30 legno istantaneo',                        baseValue:25,  effect:{ type:'instant_res',      wood:30 } },
    { id:'piccone_viola',     name:'Piccone Viola',          cat:'materiali', rarity:'epico',      icon:'⛏️', desc:'+50 pietra istantanea',                       baseValue:45,  effect:{ type:'instant_res',      stone:50 } },
    { id:'polvere_pietra',    name:'Polvere di Pietra',      cat:'materiali', rarity:'comune',     icon:'💠', desc:'+10 pietra istantanea',                       baseValue:10,  effect:{ type:'instant_res',      stone:10 } },
    { id:'sacca_cosmica',     name:'Sacca Cosmica',          cat:'materiali', rarity:'raro',       icon:'🎒', desc:'Risorse casuali: 20-50 legno o pietra',       baseValue:30,  effect:{ type:'random_res' } },
    // ── Famigli v2 ────────────────────────────────────────────
    { id:'trofeo_di_caccia',  name:'Trofeo di Caccia',       cat:'famiglio',  rarity:'raro',       icon:'🏆', desc:'Famiglio: +5 Coraggio istantaneo',            baseValue:40,  effect:{ type:'pet_virtue', virtue:'coraggio', amount:5 } },
    { id:'grimorio_antico',   name:'Grimorio Antico',        cat:'famiglio',  rarity:'raro',       icon:'📖', desc:'Famiglio: +5 Astuzia istantanea',             baseValue:40,  effect:{ type:'pet_virtue', virtue:'astuzia',  amount:5 } },
    { id:'medaglione_familiare',name:'Medaglione Familiare', cat:'famiglio',  rarity:'raro',       icon:'💚', desc:'Famiglio: +5 Lealtà istantanea',              baseValue:40,  effect:{ type:'pet_virtue', virtue:'lealta',   amount:5 } },
    { id:'fischio_del_ranger', name:'Fischio del Ranger',    cat:'famiglio',  rarity:'raro',       icon:'🎵', desc:'Richiama il famiglio: spedizione attiva -2h', baseValue:45,  effect:{ type:'expedition_time_reduce', hours:2 } },
    { id:'kit_esplorazione',  name:'Kit Esplorazione',       cat:'famiglio',  rarity:'comune',     icon:'🎒', desc:'Prossima spedizione: rischio dimezzato',      baseValue:18,  effect:{ type:'expedition_risk_reduce', mult:0.5 } },
    { id:'pergamena_incantata',name:'Pergamena Incantata',   cat:'utility',   rarity:'raro',       icon:'📜', desc:'Prossima Scalata: +1 dado MAG bonus',         baseValue:50,  effect:{ type:'scalata_mag_bonus', value:1 } },
  ];

  function consumableById(id) { return CONSUMABLES.find(c => c.id === id); }

  /* Mappa ID → nome file reale caricato su assets/consumables/ (senza estensione) */
  const CONSUMABLE_IMG = {
    golem_paglia:       "bambola del decoy",
    barile_miele:       "barilotto di miele delle fate",
    biscotto_stellare:  "biscotto zucchero stellare",
    rubinetto_oro:      "botte della condivisione",
    bussola_arcana:     "bussola della scorciatoia",
    candeliere_spia:    "candelabro portatile da tasca",
    cannocchiale_arcano:"canocchiale dell'esploratore",
    chiave_zodiacale:   "chiave dello zodiaco antico",
    artiglio_fortuna:   "ciondolo zampa di grifone",
    clessidra_arcana:   "clessidra della velocità",
    cristallo_fuoco:    "cristallo di fuoco riparatore",
    dado_runico:        "dado truccato del drago",
    contratto_mostri:   "editto del bando per i mostri",
    elisir_celeste:     "elisir del riposo attivo",
    pozione_vento:      "elisir della brezza leggera",
    pozione_cuore:      "elisir di tenacia",
    polvere_pietra:     "fischetta di olio per ingranaggi",
    corno_celtico:      "fischietto di emergenza in corno",
    formaggio_magico:   "formaggio del viandante stanco",
    cristallo_galattico:"frammento di stella cadente",
    incensiere_drago:   "incensiere antiasmatico",
    lente_tesoro:       "lente d'ingrandimento del cercatore",
    magnete_ricchezze:  "magnete di ceralacca",
    mannaia_d_oro:      "mannaia d'oro del mercante",
    patto_guerriero:    "mano del destino",
    mappa_tesoro:       "mappa strappata del tesoro nascosto",
    mela_dorata:        "mela dorata del reame",
    pane_solare:        "pane del drago speziato",
    pergamena_occhio:   "pergamena di smascheramento",
    pergamena_arcana:   "pergamena di teletrasporto al rifugio",
    piccone_viola:      "piccozza d'Athanor",
    runa_fuoco:         "pietra focale della furia",
    piuma_fenice:       "piuma di fenice della resurrezione",
    guanto_cristallo:   "pozione del cuore di roccia",
    leone_alato:        "pozione del passo gigante",
    brocca_cosmica:     "pozione della vista d'aquila",
    pozione_colomba:    "pozione di rigenerazione fatata",
    progetto_castello:  "progetto del mastro costruttore",
    spirito_foresta:    "radice di ginseng selvatico",
    disco_runico:       "runa del fulmine istantaneo",
    medaglione_grifone: "runa dello scudo protettivo",
    pietra_tempo:       "runa dello sguardo temporale",
    sacca_cosmica:      "sacchetto di polvere di fata cieca",
    scudo_cronos:       "scudo della serie",
    sfera_fortuna:      "sfera di cristallo portafortuna",
    sfera_ombra:        "sfera di fumo dell'ombra",
    teiera_runica:      "sigillo del guardiano",
    pozione_amore:      "sigillo della promessa",
    codice_reale:       "sigillo reale di indulgenza",
    torcia_lunare:      "torcia nella notte",
    trofeo_di_caccia:   "trofeo di caccia",
    grimorio_antico:    "grimorio antico",
    medaglione_familiare:"medaglione familiare",
    fischio_del_ranger: "fischio del ranger",
    kit_esplorazione:   "kit esplorazione",
    pergamena_incantata:"pergamena incantata",
  };

  function sellValueConsumable(id) {
    const c = consumableById(id);
    if (!c) return 0;
    return { comune: 12, raro: 40, epico: 100, leggendario: 250 }[c.rarity] || 10;
  }

  function buyPriceConsumable(id) {
    const c = consumableById(id);
    if (!c) return 999;
    return { comune: 45, raro: 130, epico: 380 }[c.rarity] || 999;
  }

  function addConsumable(hero, id, qty = 1) {
    hero.consumables = hero.consumables || {};
    hero.consumables[id] = (hero.consumables[id] || 0) + qty;
  }

  function sellConsumable(hero, id) {
    hero.consumables = hero.consumables || {};
    if (!(hero.consumables[id] > 0)) return 'Non hai questo consumabile.';
    const gold = sellValueConsumable(id);
    hero.consumables[id]--;
    if (hero.consumables[id] <= 0) delete hero.consumables[id];
    hero.gold += gold;
    return null;
  }

  function _applyConsumableEffect(hero, eff) {
    if (!eff) return;
    const now = Date.now();
    const h2ms = h => h * 3600000;
    const b = hero.consumableBuffs;

    switch (eff.type) {
      case 'instant_gold':   hero.gold += eff.value; break;
      case 'gold_flat':      hero.gold += eff.value; break;
      case 'instant_res':
        if (eff.wood)  hero.wood  = (hero.wood  || 0) + eff.wood;
        if (eff.stone) hero.stone = (hero.stone || 0) + eff.stone;
        break;
      case 'xp_flat':        applyXp(hero, eff.value); break;
      case 'xp_mult': {
        const extraSess = Math.round(skillBonus(hero, 'consumableExtra'));
        b.xpMult = { value: (b.xpMult ? b.xpMult.value : 0) + eff.value, sessions: (b.xpMult ? b.xpMult.sessions : 0) + (eff.sessions || 1) + extraSess };
        break;
      }
      case 'xp_gold_mult': {
        const extraSess2 = Math.round(skillBonus(hero, 'consumableExtra'));
        b.xpMult  = { value: (b.xpMult  ? b.xpMult.value  : 0) + eff.value, sessions: (b.xpMult  ? b.xpMult.sessions  : 0) + (eff.sessions || 1) + extraSess2 };
        b.goldMult = { value: (b.goldMult ? b.goldMult.value : 0) + eff.value, expiresAt: now + h2ms(24) };
        break;
      }
      case 'gold_mult':
        b.goldMult = { value: (b.goldMult ? b.goldMult.value : 0) + eff.value, expiresAt: now + h2ms(eff.expiresH || 24) };
        break;
      case 'drop_boost':
        b.dropBoost = { value: (b.dropBoost ? b.dropBoost.value : 0) + eff.value, expiresAt: now + h2ms(eff.expiresH || 24) };
        break;
      case 'arena_restore':
        if (hero.battles) hero.battles.count = Math.max(0, (hero.battles.count || 0) - eff.value);
        break;
      case 'arena_shield':
        b.arenaShield = (b.arenaShield || 0) + 1;
        break;
      case 'arena_shield_long':
        b.arenaShield = (b.arenaShield || 0) + (eff.days || 1);
        break;
      case 'arena_mult':
        b.arenaMult = { value: (b.arenaMult ? b.arenaMult.value : 0) + eff.value, expiresAt: now + h2ms(eff.expiresH || 24) };
        break;
      case 'streak_shield':
        b.streakShield = (b.streakShield || 0) + (eff.days || 1);
        break;
      case 'restore_streak': {
        const coolKey = 'phoenixUsed';
        const lastUsed = hero[coolKey] || 0;
        if (Date.now() - lastUsed < 30 * 86400000) return '⏳ Piuma già usata negli ultimi 30 giorni.';
        hero[coolKey] = Date.now();
        hero.streak.count = Math.max(1, hero.streak.count);
        hero.streak.last = yesterdayStamp();
        break;
      }
      case 'potion_reset':
        if (hero.dailyPotion) hero.dailyPotion.used = false;
        break;
      case 'scalata_reset':
        if (hero.lastScalata === todayStamp()) {
          hero.lastScalata = null;
          if (hero.activeScalata && hero.activeScalata.done) hero.activeScalata = null;
        } else {
          return 'La Scalata è già disponibile oggi.';
        }
        break;
      case 'scalata_hp_bonus':
        b.scalataHpBonus = (b.scalataHpBonus || 0) + (eff.value || 30);
        break;
      case 'scalata_heal': {
        const s = hero.activeScalata;
        if (!s || s.done) return 'Nessuna Scalata in corso.';
        const heal = Math.min(eff.value || 30, s.heroMaxHp - s.heroHp);
        if (heal <= 0) return 'HP già al massimo.';
        s.heroHp += heal;
        break;
      }
      case 'bisca_extra_bet': {
        if (!hero.bisca) hero.bisca = {};
        const tod = todayStamp();
        if (hero.bisca.lastDate !== tod) { hero.bisca.betsLeft = 5; hero.bisca.lastDate = tod; }
        if (hero.bisca.betsLeft == null) hero.bisca.betsLeft = 5;
        hero.bisca.betsLeft++;
        break;
      }
      case 'bisca_double_payout':
        b.biscaDoublePayout = true;
        break;
      case 'dungeon_reveal_weak':
        b.dungeonRevealWeak = true;
        break;
      case 'dungeon_buff_dmg':
        b.dungeonBuffDmg = (b.dungeonBuffDmg || 0) + (eff.value || 35);
        break;
      case 'chest_reveal':
        b.chestReveal = true;
        break;
      case 'boss_shield':
        b.bossShield = true;
        break;
      case 'boss_preview':
        b.bossPreview = true;
        break;
      case 'map_km':
        if (hero.treasureMap) hero.treasureMap.progressKm = Math.round(((hero.treasureMap.progressKm || 0) + eff.value) * 10) / 10;
        break;
      case 'map_reveal':
      case 'map_reveal_all':
        b.mapReveal = true;
        break;
      case 'bonus_chest': {
        const it = genItemFor(hero, 'comune');
        hero.items.push(it);
        break;
      }
      case 'open_special_chest': {
        const it = genItemFor(hero, 'raro');
        hero.items.push(it);
        break;
      }
      case 'extra_boss':
        b.extraBoss = true;
        break;
      case 'free_layer':
        b.freeLayer = true;
        break;
      case 'res_per_session':
        b.resPerSession = { wood: (b.resPerSession ? b.resPerSession.wood : 0) + (eff.wood || 0), stone: (b.resPerSession ? b.resPerSession.stone : 0) + (eff.stone || 0), expiresAt: now + h2ms(eff.expiresH || 24) };
        break;
      case 'all_boost':
        b.allBoost = { value: eff.value, expiresAt: now + h2ms(eff.expiresH || 48) };
        break;
      case 'reset_all':
        if (hero.dailyPotion) hero.dailyPotion.used = false;
        if (hero.battles) hero.battles.count = 0;
        if (hero.treasureMap) hero.treasureMap.progressKm = (hero.treasureMap.progressKm || 0);
        break;
      case 'random': {
        const opts = [
          { type:'xp_mult', value:1.0, sessions:1 },
          { type:'gold_mult', value:1.0, expiresH:24 },
          { type:'instant_res', wood:30, stone:20 },
        ];
        _applyConsumableEffect(hero, opts[Math.floor(Math.random() * opts.length)]);
        break;
      }
      case 'random_timed': {
        const opts2 = [
          { type:'xp_mult', value:0.30, sessions:2 },
          { type:'gold_mult', value:0.30, expiresH: eff.expiresH || 12 },
          { type:'res_per_session', wood:3, stone:3, expiresH: eff.expiresH || 12 },
        ];
        _applyConsumableEffect(hero, opts2[Math.floor(Math.random() * opts2.length)]);
        break;
      }
      case 'random_res': {
        const qty = 20 + Math.floor(Math.random() * 31);
        if (Math.random() < 0.5) hero.wood  = (hero.wood  || 0) + qty;
        else                     hero.stone = (hero.stone || 0) + qty;
        break;
      }
      case 'pet_care':
        if (hero.pet) {
          if (eff.hunger !== undefined) hero.pet.hunger = Math.min(100, (hero.pet.hunger || 0) + eff.hunger);
          if (eff.mood   !== undefined) hero.pet.mood   = Math.min(100, (hero.pet.mood   || 0) + eff.mood);
        }
        break;
      case 'pet_virtue':
        if (!hero.pet || !hero.pet.hatched) return 'Il tuo famiglio non è ancora schiuso.';
        addPetVirtue(hero, eff.virtue, eff.amount || 5);
        break;
      case 'expedition_time_reduce': {
        if (!hero.pet || !hero.pet.expedition) return 'Nessuna spedizione in corso.';
        hero.pet.expedition.startedAt -= (eff.hours || 2) * 3600000;
        break;
      }
      case 'expedition_risk_reduce':
        b.expeditionRiskMult = (b.expeditionRiskMult !== undefined) ? Math.min(b.expeditionRiskMult, eff.mult || 0.5) : (eff.mult || 0.5);
        break;
      case 'scalata_mag_bonus':
        b.scalataMagBonus = (b.scalataMagBonus || 0) + (eff.value || 1);
        break;
      case 'multi':
        (eff.effects || []).forEach(e => _applyConsumableEffect(hero, e));
        break;
    }
  }

  function useConsumable(hero, id) {
    hero.consumables     = hero.consumables     || {};
    hero.consumableBuffs = hero.consumableBuffs || {};
    if (!(hero.consumables[id] > 0)) return 'Non hai questo consumabile.';
    const c = consumableById(id);
    if (!c) return 'Consumabile non trovato.';
    const err = _applyConsumableEffect(hero, c.effect);
    if (err) return err;
    hero.consumables[id]--;
    if (hero.consumables[id] <= 0) delete hero.consumables[id];
    hero.consumablesUsed = (hero.consumablesUsed || 0) + 1;
    return null;
  }

  /* Crafting: 3 comuni → 1 raro, 3 rari → 1 epico */
  function craftConsumable(hero, fromRarity) {
    const order = ['comune', 'raro', 'epico', 'leggendario'];
    const toRarity = order[order.indexOf(fromRarity) + 1];
    if (!toRarity || toRarity === 'leggendario') return 'Non puoi creare leggendari.';
    const owned = hero.consumables || {};
    const pool = CONSUMABLES.filter(c => c.rarity === fromRarity && (owned[c.id] || 0) > 0);
    let cost = { ...owned };
    let needed = 3;
    const spent = [];
    for (const c of pool) {
      while (needed > 0 && (cost[c.id] || 0) > 0) {
        cost[c.id]--;
        spent.push(c.id);
        needed--;
      }
      if (!needed) break;
    }
    if (needed > 0) return `Ti servono 3 consumabili ${fromRarity}.`;
    spent.forEach(id => { hero.consumables[id] = (hero.consumables[id] || 0) - 1; if (hero.consumables[id] <= 0) delete hero.consumables[id]; });
    const exactPool = CONSUMABLES.filter(c => c.rarity === toRarity);
    if (!exactPool.length) return null;
    const picked = exactPool[Math.floor(Math.random() * exactPool.length)];
    addConsumable(hero, picked.id, 1);
    return picked;
  }

  function dropConsumable(hero, minRarity) {
    const order = ['comune', 'raro', 'epico', 'leggendario'];
    const minIdx = order.indexOf(minRarity || 'comune');
    const pool = CONSUMABLES.filter(c => order.indexOf(c.rarity) >= minIdx);
    if (!pool.length) return null;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    addConsumable(hero, picked.id, 1);
    return picked;
  }

  function accessibleZones(hero) {
    return BIOMES.filter(b => hero.level >= b.min).map(b => b.name);
  }

  /* ── Le 20 Cavalcature (una ogni 5 livelli, 5-100) ────────── */
  // bonus = % di km "virtuali" in più a ogni allenamento
  // img: assets/cavalcature/<num>.png (miniature visibili anche da bloccate!)
  const MOUNTS = [
    { id: 'asinello',   num: 1,  name: 'L\'Asinello da Soma', emoji: '🫏',
      bio: `Nessun menestrello canta ballate sugli asini, ed è un'ingiustizia storica. Questo piccolo testardo apparteneva al mugnaio di Oakhaven e la notte dell'attacco trasportò da solo, avanti e indietro per sei volte, i sacchi di farina che sfamarono i superstiti. Non è veloce, non è elegante, e quando decide di fermarsi nemmeno un incantesimo lo smuove. Ma non ha mai lasciato indietro nessuno: né un ferito, né un bagaglio, né un eroe alle prime armi. Le sue orecchie captano i pericoli a un miglio di distanza, e il suo raglio — orribile, va detto — ha già messo in fuga più di un goblin convinto di tendere un'imboscata. Chi comincia un viaggio con lui impara la prima lezione del viandante: la costanza vale più del galoppo. E lui, di costanza, è il maestro assoluto del reame.` },
    { id: 'pony',       num: 2,  name: 'Il Pony delle Brughiere', emoji: '🐴',
      bio: `Le brughiere a nord di Oakhaven sono un mare d'erba spazzato dal vento, dove le nebbie inghiottono i sentieri e i viandanti distratti. È lì che questo pony è nato selvaggio, imparando a memoria ogni guado, ogni roccia e ogni scorciatoia prima ancora di conoscere una sella. I pastori giurano che sappia fiutare la pioggia con tre giorni d'anticipo e che una volta abbia riportato a casa un bambino perduto seguendo solo il profumo del camino di sua madre. La criniera arruffata è il suo vanto: nessuna spazzola l'ha mai domata, come del resto nessun recinto l'ha mai trattenuto per più di una notte. Piccolo di statura ma dal cuore enorme, considera il suo cavaliere parte del branco. E per il branco, un pony delle brughiere affronterebbe anche un lupo tre volte più grosso di lui — è già successo, e il lupo se lo ricorda ancora.` },
    { id: 'caprone',    num: 3,  name: 'Il Caprone di Montagna', emoji: '🐐',
      bio: `Dove le strade finiscono e cominciano le pareti di roccia, il caprone sorride — se mai i caproni sorridessero. Questo veterano dei picchi è cresciuto sui sentieri più impossibili delle Montagne del Confine, dove un passo falso significa un volo di trecento metri e nemmeno le aquile osano nidificare. Le sue zampe trovano appigli dove l'occhio umano vede solo pietra liscia, e le sue corna a spirale hanno vinto duelli contro rivali, valanghe e almeno un troll particolarmente sfortunato. Ha un caratteraccio leggendario: obbedisce solo a chi rispetta, e il rispetto se lo guadagna chi non si lamenta in salita. I mercanti di montagna lo chiamano "il pedaggio vivente", perché nessuna carovana attraversa i passi alti senza uno di questi campioni in testa alla fila. Testardo, orgoglioso, praticamente indistruttibile: il compagno perfetto per chi punta in alto. Letteralmente.` },
    { id: 'cervo',      num: 4,  name: 'Il Grande Cervo delle Foreste', emoji: '🦌',
      bio: `Gli elfi della Foresta Sussurrante lo chiamavano "Colui che Cammina tra gli Alberi", e non montavano in sella senza chiedere il permesso — un inchino, sempre, prima di ogni viaggio. Il Grande Cervo è antico quanto le querce più profonde del bosco: le sue corna maestose si ramificano come alberi in inverno, e tra i palchi, in primavera, fioriscono davvero minuscole gemme verdi. Si muove nel folto senza spezzare un ramo, silenzioso come la neve che cade, e la leggenda dice che chi lo cavalca condivide per un attimo i ricordi della foresta: mille anni di stagioni, di canti e di segreti. Quando l'Orda incendiò i margini del bosco, fu lui a guidare gli animali verso le radure sicure, tornando indietro tre volte per i più lenti. Non porta chiunque: sceglie. E quando ti sceglie, capisci che la foresta intera ha deciso di fidarsi di te.` },
    { id: 'mulo',       num: 5,  name: 'Il Mulo da Carovana', emoji: '🐴',
      bio: `I mercanti della Via delle Spezie hanno un detto: "Un mulo buono vale tre guardie, due mappe e un contabile onesto". Questo esemplare li vale tutti e sei. Ha attraversato il reame da costa a costa più volte di qualunque esploratore, trasportando sete, spezie, lingotti e — in un'occasione che preferisce non commentare — un principe travestito da sacco di rape in fuga da un matrimonio combinato. Conosce ogni locanda, ogni pozzo e ogni scorciatoia tra qui e il Deserto di Cenere, e ha sviluppato un sesto senso infallibile per i banditi: quando si rifiuta di avanzare, i carovanieri esperti preparano le armi senza fare domande. Ha superato tempeste di sabbia, ponti crollanti e un assedio durato un mese, sempre con lo stesso passo tranquillo e lo stesso sguardo da filosofo. Il suo motto, se potesse parlare: il carico si porta, non ci si lamenta.` },
    { id: 'acquatico',  num: 6,  name: 'Il Destriero Acquatico', emoji: '🌊',
      bio: `Nato dove il Fiume Regale incontra il mare, questo destriero ha la criniera che ondeggia come alghe nella corrente e zoccoli che non affondano mai. I pescatori della Baia del Corallo raccontano che sia figlio di una cavalla fuggita durante una tempesta e di uno spirito delle acque che si innamorò del suo coraggio. Vero o no, nessun'altra creatura attraversa i guadi in piena, le paludi e gli estuari con la stessa naturalezza: dove gli altri cavalli si fermano nitrendo, lui entra nell'acqua come chi torna a casa. Sa trovare i banchi di sabbia nascosti sotto il pelo dell'acqua e ha salvato interi equipaggi guidando le scialuppe verso riva nelle notti di nebbia. Il suo manto sa di pioggia d'estate e, quando galoppa sul bagnasciuga, le onde sembrano rincorrerlo per gioco. I marinai lo salutano togliendosi il cappello: portare rispetto all'acqua, dicono, significa portarlo anche a lui.` },
    { id: 'caccia',     num: 7,  name: 'Il Cavallo da Caccia', emoji: '🐎',
      bio: `Addestrato nelle scuderie del Barone di Altorovo, il miglior cavallo da caccia della sua generazione si rivelò troppo intelligente per il suo mestiere: durante la grande battuta d'autunno, invece di inseguire la volpe, condusse deliberatamente tutta la nobiltà in un pantano e la volpe, si dice, lo ringraziò con un cenno del capo. Il Barone lo vendette per ripicca, e fu il suo errore più grande. Perché questo purosangue color castagna è un fulmine con la sella: salta siepi, torrenti e carri ribaltati senza rompere il ritmo, legge il terreno come un falco legge il vento e ricorda ogni percorso dopo averlo fatto una sola volta. Ha il passo lungo di chi è nato per rincorrere l'orizzonte e l'istinto di chi sa quando NON bisogna correre. Con lui in sella, le distanze si accorciano e le fughe — inseguito o inseguitore — finiscono sempre nello stesso modo: con lui davanti.` },
    { id: 'lupo',       num: 8,  name: 'Il Grande Lupo del Nord', emoji: '🐺',
      bio: `Nelle terre oltre il Picco Innevato, dove il sole d'inverno è solo una promessa, i clan del Nord non cavalcano cavalli: cavalcano lupi. Questo è un alfa dei ghiacci, grande come un destriero da guerra, con occhi d'ambra che vedono nel buio della bufera e un manto che ride del gelo. Il suo branco fu disperso dall'avanzata dell'Orda, e da allora cerca una nuova famiglia — perché un lupo senza branco è come una spada senza filo, dicono gli sciamani. Chi conquista la sua fiducia guadagna molto più di una cavalcatura: guadagna una sentinella che non dorme mai, un cacciatore che fiuta i nemici oltre le colline e un compagno che ulula alla luna le vittorie condivise. Corre in silenzio assoluto quando serve l'agguato, e a piena voce quando serve il terrore. I nemici del Nord hanno un proverbio: se senti il lupo, è tardi. Se non lo senti, è tardissimo.` },
    { id: 'cinghiale',  num: 9,  name: 'Il Cinghiale Corazzato', emoji: '🐗',
      bio: `I nani delle colline lo allevarono per un solo scopo: sfondare. Porte, palizzate, linee nemiche, muri portanti — per lui sono tutti sinonimi di "avanti". Il Cinghiale Corazzato indossa una bardatura forgiata su misura nelle officine di Kar-Morun, con placche che hanno fermato frecce, asce e almeno una palla di fuoco di cui porta ancora orgogliosamente la bruciatura. Le sue zanne sono state temprate nell'acciaio come armi vere, e il suo grugnito di carica fa tremare le fondamenta. Ma sotto la corazza batte un cuore sorprendentemente tenero: adora i grattini dietro le orecchie, va matto per le mele cotte e ha adottato — nessuno sa perché — un pulcino che gli dorme sull'elmo. In battaglia è una valanga con le setole; al campo è il cuscino più conteso del bivacco. I nani hanno una sola regola al riguardo: mai, MAI mangiare pancetta in sua presenza.` },
    { id: 'orso',       num: 10, name: 'L\'Orso Bruno di Montagna', emoji: '🐻',
      bio: `Gli eremiti delle vette raccontano di un orso che imparò a rispettare gli uomini quando un giovane pastore, invece di fuggire, condivise con lui il miele durante l'inverno più duro del secolo. Da quel patto antico discende questo colosso dal manto bruno, che accetta un cavaliere non per doma, ma per alleanza. Cavalcare un orso non è elegante: è un terremoto lento, una montagna che cammina. Ma quando la strada si fa pericolosa, non esiste groppa più sicura al mondo. Le sue zampe spalancano sentieri nella neve fresca, i suoi artigli scalano pendii che scoraggerebbero un caprone, e il suo abbraccio — riservato a pochissimi — è la cosa più simile a una fortezza che una creatura vivente possa offrire. Va in letargo con la stessa serietà con cui combatte, e guai a chi disturba: la sveglia anticipata è l'unico torto che non perdona. Il miele, invece, apre qualunque trattativa.` },
    { id: 'yak',        num: 11, name: 'Lo Yak delle Nevi', emoji: '🐃',
      bio: `I monaci del Monastero delle Vette Silenziose misurano la saggezza in inverni superati, e il loro yak più anziano ne ha superati quaranta. Questo discendente diretto di quella stirpe sacra ha il pelo così folto che i passeri ci nidificano dentro (e lui li lascia fare, da buon padrone di casa), e corna che incorniciano il muso come un'antica corona. Cammina alla stessa velocità in salita, in discesa, nella tormenta e nel sole: una velocità sola, la sua, immutabile come le montagne. I monaci giurano che il suo passo segua il ritmo segreto dell'universo e che meditare in groppa a uno yak valga come dieci anni di disciplina. Che sia vero o no, una cosa è certa: nessuna bufera lo ha mai fermato, nessun precipizio lo ha mai fatto esitare, e il suo fiato caldo ha rianimato più di un viandante assiderato. Lento? Forse. Ma arriva sempre. E in montagna, arrivare è tutto.` },
    { id: 'purosangue', num: 12, name: 'Il Cavallo di Pura Razza Reale', emoji: '🏇',
      bio: `Nelle scuderie di marmo del Palazzo d'Estate, ogni puledro riceve un nome scritto in oro su pergamena. Questo stallone dal portamento perfetto era destinato a portare il Re in persona durante la Parata del Solstizio — poi l'Orda cambiò i piani di tutti. Fuggito dalle scuderie in fiamme con ancora i finimenti da cerimonia, vagò per settimane finché non capì una verità che nessun maestro di corte gli aveva insegnato: un cavallo reale non è quello che porta un re, ma quello che si comporta da re. Il suo galoppo è un valzer, la sua criniera un vessillo, il suo salto un'opera d'arte che i pittori hanno ritratto in almeno tre affreschi celebri. Conosce i protocolli di sette corti e disdegna apertamente le pozzanghere, ma per il cavaliere giusto ha attraversato fango, fuoco e frecce senza scomporsi. La regalità, dopotutto, non è mai stata questione di corone.` },
    { id: 'leone',      num: 13, name: 'Il Leone Regale della Savana', emoji: '🦁',
      bio: `Oltre il Deserto di Cenere si stendono le savane dorate, e sulle savane regnava lui: un leone così maestoso che le tribù locali gli avevano eretto totem ancora prima che accettasse il primo cavaliere. La sua criniera è un tramonto fatto pelo, il suo ruggito un editto che si sente a tre valli di distanza. Non fu domato — i leoni non si domano — ma scelse: quando una giovane guerriera lo liberò da una trappola dell'Orda rischiando la vita, lui la seguì fino a casa e si sdraiò davanti alla sua porta, come a dire "ora comando anche qui". Cavalcarlo è un onore che va rinnovato ogni giorno con rispetto e carne di prima qualità. In cambio si ottiene la protezione di un re guerriero: artigli che aprono le corazze come frutta matura, un balzo che copre dieci metri e quella presenza, indescrivibile, che fa abbassare lo sguardo perfino agli orchi. I sudditi non mancano mai di inchinarsi. I nemici, di scappare.` },
    { id: 'alce',       num: 14, name: 'L\'Alce Gigante della Tundra', emoji: '🫎',
      bio: `Nella tundra sconfinata oltre il Picco Innevato, dove l'orizzonte è una linea bianca e il silenzio ha un peso, vive il più grande erbivoro del mondo conosciuto. Le sue corna a palmo sono così vaste che i falchi le usano come posatoio durante le migrazioni, e d'inverno il ghiaccio le decora fino a farle sembrare un lampadario di cristallo in marcia. Gli abitanti del Nord lo considerano un presagio di buona sorte: vederlo all'alba significa un anno di raccolti generosi, cavalcarlo — privilegio raro — significa non temere più nulla che cammini sulla neve. Attraversa i fiumi ghiacciati saggiando il ghiaccio con una zampa, con una precisione che gli ingegneri del regno gli invidiano, e sa trovare i muschi commestibili sotto due metri di neve. Placido come un lago d'agosto finché non minacci qualcuno sotto la sua protezione: allora la tundra intera scopre perché nemmeno i branchi di lupi lo infastidiscono. Mai.` },
    { id: 'bisonte',    num: 15, name: 'Il Bisonte delle Pianure', emoji: '🦬',
      bio: `Quando la Grande Mandria attraversa le pianure centrali, la terra trema per tre giorni e i cartografi ridisegnano i sentieri. Davanti a tutti, da vent'anni, corre lui: il capobranco, la locomotiva di pelo e muscoli che decide dove passerà il fiume di corna e zoccoli. I popoli delle pianure lo chiamano "Tuono che Cammina" e gli attribuiscono la creazione di almeno due valli, scavate — dicono — durante una carica particolarmente convinta. La sua fronte è un ariete naturale che ha ribaltato carri da guerra, e il suo mantello lanoso ospita un microclima tutto suo, prezioso nelle notti gelide di bivacco. Ma la sua vera forza è il carisma: le altre creature lo seguono d'istinto, e più di una carovana dispersa si è salvata accodandosi semplicemente alla sua rotta infallibile. Cavalcarlo significa cavalcare la pianura stessa: inarrestabile, diretto, con un vago profumo d'erba calpestata e libertà.` },
    { id: 'grifone',    num: 16, name: 'Il Grifone Imperiale', emoji: '🦅',
      bio: `Ali d'aquila, corpo di leone, orgoglio di entrambi moltiplicato per dieci. I Grifoni Imperiali nidificano solo sulle torri più alte delle rovine antiche, dove il vento canta tra le guglie e nessun ladro di uova osa arrampicarsi. Per mille anni furono i custodi del cielo dell'Impero: le cronache raccontano di grifoni che intercettavano i draghi giovani in volo e li riaccompagnavano al confine per un'ala, come maestri severi con allievi discoli. Questo esemplare porta sul petto una cicatrice a forma di stella, ricordo della notte in cui difese la sua torre dall'avanguardia dell'Orda — da solo, contro trenta. Concede la sella soltanto a chi supera la sua prova segreta, che pare consista nel sostenere il suo sguardo dorato senza vacillare. Il premio è il cielo intero: le correnti ascensionali sopra i biomi, l'ebbrezza della picchiata, il mondo ridotto a una mappa viva sotto gli artigli. Da lassù, dicono i pochi che ci sono stati, perfino la Vetta Oscura sembra piccola.` },
    { id: 'spettrale',  num: 17, name: 'Il Destriero Spettrale', emoji: '👻',
      bio: `C'era una volta un cavallo da guerra che amava il suo cavaliere più della vita stessa — e lo dimostrò. Alla Battaglia del Fossato Profondo, quando tutto era perduto, portò il suo padrone ferito fuori dalla mischia attraversando tre linee nemiche, e crollò solo dopo averlo consegnato ai guaritori. La leggenda dice che la morte, ammirata, gli offrì un patto: riposare in pace o continuare a correre per sempre. Indovinate cosa scelse. Oggi il Destriero Spettrale galoppa tra i mondi, criniera di nebbia lunare e zoccoli che non toccano terra, apparendo a chi ha una missione degna e un cuore senza paura. Attraversa i muri quando è di fretta, brilla di luce azzurrina nelle notti senza luna e nitrisce in una frequenza che solo i coraggiosi riescono a sentire. Cavalcarlo è freddo, silenzioso e assolutamente indimenticabile: è l'unico destriero al mondo che non può essere fermato da nulla. Perché come fermi qualcosa che ha già vinto la fine?` },
    { id: 'dragoterra', num: 18, name: 'Il Drago della Terra', emoji: '🐲',
      bio: `Non tutti i draghi tradirono il mondo. Quando il Drago Antico si alleò con il Cavaliere e l'Orda, la stirpe dei Draghi della Terra — cugini senz'ali, scavatori di montagne, custodi delle radici del mondo — rifiutò con un ruggito che fece crollare tre gallerie. Questo giovane colosso dalle scaglie color basalto è il figlio del loro capoclan, inviato in superficie con una missione: aiutare chi combatte il traditore alato. Cammina sulla terra perché la RISPETTA, dicono i suoi: volare è da esibizionisti. In compenso, nessun terreno gli resiste — sabbia, roccia, ghiaccio, perfino la pietra corrotta dell'Orda si spacca sotto le sue zampe come crosta di pane. Sputa non fuoco ma vapore rovente, sa fiutare i metalli preziosi a cento metri di profondità e russa producendo piccole scosse sismiche che gli accampamenti imparano presto a ignorare. Cavalcarlo è dichiarare al mondo, e soprattutto al Cavaliere del Drago, che anche i draghi hanno scelto da che parte stare.` },
    { id: 'chimera',    num: 19, name: 'La Chimera di Luce', emoji: '🌟',
      bio: `Nelle cronache più antiche si parla di una creatura nata dall'ultimo raggio del primo sole del mondo: leone nel corpo, aquila nello sguardo, drago nel cuore, luce pura in tutto il resto. La Chimera di Luce appare una volta per generazione, sempre alla vigilia delle ore più buie, come se il mondo stesso la inviasse per ricordare che l'oscurità non ha mai l'ultima parola. Il suo manto brilla di costellazioni che cambiano seguendo il cielo notturno, e dove posa le zampe l'erba bruciata rinasce verde nel giro di un'alba. Non mangia, non dorme, non invecchia: si nutre — letteralmente — della determinazione di chi la cavalca, e con un eroe instancabile in sella diventa instancabile anche lei. I saggi della Valle dei Cristalli sostengono che sia il contrario esatto della corruzione del Drago Antico: dove lui spegne, lei accende. Trovarla non è questione di fortuna, ma di merito: novantacinque livelli di sudore sono, guarda caso, esattamente il prezzo che la leggenda ha sempre indicato.` },
    { id: 'aquila',     num: 20, name: 'L\'Aquila del Destino', emoji: '🦅',
      bio: `Sopra ogni cielo c'è un cielo più alto, e in quel cielo vola lei. L'Aquila del Destino non è una creatura: è una risposta. I poemi dicono che nacque dal primo giuramento mai mantenuto, e che da allora si mostri soltanto a chi ha percorso l'intera strada — non un passo di meno. Le sue ali coprono un carro da guerra, le sue piume sono lame di luce dorata che nessuna freccia ha mai sfiorato, e i suoi occhi vedono contemporaneamente ciò che è, ciò che è stato e un frammento di ciò che sarà: per questo nessun agguato, tempesta o inganno l'ha mai colta di sorpresa. Quando plana sulla Valle dei Cristalli Oscuri, perfino i cristalli smettono di sussurrare. Chi raggiunge il centesimo livello e sente il vento cambiare, alzi lo sguardo: se l'Aquila scende, significa che il Destino in persona ha firmato la tua storia. E che il Cavaliere del Drago, da qualche parte sulla Vetta Oscura, ha appena sentito freddo per la prima volta.` },
  ];
  MOUNTS.forEach((m, i) => {
    m.level = (i + 1) * 5;
    m.img = 'assets/cavalcature/' + m.num + '.webp';
    m.price = Math.round(15 * Math.pow(m.level, 1.8) / 10) * 10;
    m.bonus = Math.round(3 + m.level * 0.45);
  });
  function mountById(id) {
    return MOUNTS.find(m => m.id === id) || (id === 'leone_sabbie' ? SEASON_PASS_MOUNT : null);
  }

  /* ── Talenti di Classe (uno per protagonista) ─────────────── */
  const CLASS_TALENTS = {
    eroe1:      { name: 'Passo Instancabile',      icon: '🥾',
      desc: '+10% XP da camminata e corsa' },
    eroe2:      { name: 'Radici Profonde',         icon: '🌿',
      desc: '+25% legna e pietra raccolte' },
    fabbro:     { name: 'Mani di Bottega',         icon: '⚒️',
      desc: '-20% prezzi alla Fucina · +10% dalle vendite' },
    stregone:   { name: 'Fame di Sapere',          icon: '🔮',
      desc: '+10% XP da ogni allenamento' },
    alchimista: { name: 'Occhio del Distillatore', icon: '⚗️',
      desc: '10% di probabilità che il loot trovato salga di rarità' },
    furfante:   { name: 'Dita Leste',              icon: '🪙',
      desc: '+20% oro da ogni fonte' },
    maga:       { name: 'Sapienza Runica',         icon: '🔷',
      desc: '+15% legna e pietra raccolte, +5% XP da ogni allenamento' },
    paladino:   { name: 'Baluardo del Regno',      icon: '🛡️',
      desc: '+12% Danni e +12% HP in Arena' },
    ranger:     { name: 'Occhio del Cacciatore',   icon: '🏹',
      desc: '+15% probabilità di un bottino extra dai forzieri delle missioni' },
    fata:       { name: 'Polvere di Fata',         icon: '🧚',
      desc: 'Un Giorno di Riposo extra a settimana (3 invece di 2)' },
    principe:   { name: 'Ali dell\'Aquila',         icon: '🦅',
      desc: '+15% XP da ogni sessione in Cyclette' },
    principessa:{ name: 'Grazia della Farfalla',    icon: '🦋',
      desc: '+15% probabilità di trovare oggetti rari' },
    regina:     { name: 'Sguardo della Regina Oscura', icon: '🦉',
      desc: '+15% Danni contro i Boss in Arena' },
    predone:    { name: 'Bottino da Razzia',          icon: '💰',
      desc: '+25% oro da missioni e forzieri' },
    principessa_ghiacci: { name: 'Lama del Gelo',      icon: '❄️',
      desc: '+20% Danni in Arena · le vittorie in Arena danno il 30% di oro in più' },
    sacerdotessa_sole:   { name: 'Benedizione Solare', icon: '☀️',
      desc: '+15% XP da ogni allenamento · la Pozione del Giorno ha un 20% in più di efficacia' },
    principessa_draghi:  { name: 'Sangue dei Draghi',  icon: '🐉',
      desc: '+25% Danni contro i Boss · +15% probabilità loot raro dai Boss' },
  };
  function talentOf(hero) { return CLASS_TALENTS[hero.storyId] || null; }
  function isClass(hero, id) { return hero.storyId === id; }

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
    seme:        { label: 'Seme',        icon: '🌰' },
    consumabile: { label: 'Consumabile', icon: '⚗️' },
  };

  /* ── Icone del loot (generate con l'IA, in assets/loot/) ──── */
  // Quante immagini esistono per rarità/slot: <rarità>/<slot>-<n>.png
  const LOOT_IMG = {
    comune:      { arma: 8,  scudo: 5, elmo: 5, armatura: 4, anello: 3, amuleto: 4 },
    non_comune:  { arma: 7,  scudo: 5, elmo: 6, armatura: 4, anello: 5, amuleto: 7 },
    raro:        { arma: 16, scudo: 8, elmo: 8, armatura: 8, anello: 9, amuleto: 9 },
    epico:       { arma: 14, scudo: 2, elmo: 7, armatura: 8, anello: 9, amuleto: 5 },
    leggendario: { arma: 4,  scudo: 3, elmo: 3, armatura: 4, anello: 2, amuleto: 5 },
    divino:      { arma: 4,  scudo: 1, elmo: 2, armatura: 3, anello: 1, amuleto: 2 },
    oscuro:      { arma: 6,  scudo: 1, elmo: 2, armatura: 3, anello: 1, amuleto: 2 },
  };
  // Immagine stabile per un oggetto (stesso oggetto → stessa icona)
  function itemImg(item) {
    if (item.img) return item.img; // item con immagine fissa
    const pool = (LOOT_IMG[item.rarity] || {})[item.slot];
    if (!pool) return null;
    const h = [...String(item.id)].reduce((s, c) => (s * 33 + c.charCodeAt(0)) % 9973, 7);
    return `assets/loot/${item.rarity}/${item.slot}-${h % pool}.webp`;
  }

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

  const EQUIP_SLOTS = ['arma', 'scudo', 'elmo', 'armatura', 'anello', 'amuleto'];


  const RARITY_TYPE_SCALE = {
    comune: 1, non_comune: 1.5, raro: 2.2, epico: 3.5, leggendario: 5, divino: 7, oscuro: 6,
  };

  const RARITY_SECONDARY_COUNT = {
    comune: 0, non_comune: 0, raro: 1, epico: 1, leggendario: 2, divino: 2, oscuro: 1,
  };

  const ITEM_TYPE_AFFIX = {
    arma: {
      'Spada':    { type: 'arenaDmgMult',                      min: 0.006, max: 0.014 },
      'Ascia':    { type: 'woodMult',                          min: 0.010, max: 0.022 },
      'Mazza':    { type: 'arenaDmgMult',                      min: 0.008, max: 0.018 },
      'Arco':     { type: 'xpMult', activity: 'corsa',         min: 0.010, max: 0.022 },
      'Martello': { type: 'stoneMult',                         min: 0.010, max: 0.022 },
      'Lancia':   { type: 'xpMult', activity: 'corsa',         min: 0.008, max: 0.018 },
      'Pugnale':  { type: 'xpMult', activity: 'camminata',     min: 0.010, max: 0.022 },
      'Coltello': { type: 'goldMult',                          min: 0.008, max: 0.020 },
      'Falce':    { type: 'goldMult',                          min: 0.010, max: 0.024 },
      'Balestra': { type: 'xpMult', activity: 'cyclette',      min: 0.010, max: 0.022 },
      'Flagello': { type: 'arenaDmgMult',                      min: 0.008, max: 0.018 },
      'Tridente': { type: 'xpMult', activity: 'camminata',     min: 0.008, max: 0.018 },
      'Bastone':  { type: 'xpGlobal',                         min: 0.006, max: 0.016 },
      'Guanto':   { type: 'arenaDmgMult',                      min: 0.006, max: 0.014 },
    },
    scudo: {
      'Scudo Tondo':   { type: 'arenaHpMult',                  min: 0.008, max: 0.018 },
      'Scudo a Torre': { type: 'arenaHpMult',                  min: 0.012, max: 0.026 },
      'Buckler':       { type: 'xpMult', activity: 'corsa',    min: 0.010, max: 0.022 },
      'Egida':         { type: 'goldMult',                     min: 0.010, max: 0.022 },
    },
    elmo: {
      'Elmo':            { type: 'arenaHpMult',                min: 0.008, max: 0.018 },
      'Cappuccio':       { type: 'goldMult',                   min: 0.010, max: 0.022 },
      'Corona di Ferro': { type: 'arenaDmgMult',               min: 0.008, max: 0.018 },
      'Barbuta':         { type: 'arenaHpMult',                min: 0.012, max: 0.026 },
    },
    armatura: {
      'Corazza':             { type: 'arenaHpMult',            min: 0.010, max: 0.022 },
      'Cotta di Maglia':     { type: 'xpMult', activity: 'camminata', min: 0.010, max: 0.022 },
      'Mantello Rinforzato': { type: 'goldMult',               min: 0.010, max: 0.022 },
      'Pettorale':           { type: 'arenaDmgMult',           min: 0.008, max: 0.018 },
    },
    anello: {
      'Anello':        { type: 'xpGlobal',                     min: 0.006, max: 0.016 },
      'Sigillo':       { type: 'goldMult',                     min: 0.014, max: 0.028 },
      'Fascia Incisa': { type: 'xpMult', activity: 'corsa',    min: 0.010, max: 0.022 },
    },
    amuleto: {
      'Amuleto':   { type: 'goldMult',                         min: 0.008, max: 0.020 },
      'Talismano': { type: 'xpGlobal',                         min: 0.008, max: 0.020 },
      'Ciondolo':  { type: 'xpMult', activity: 'camminata',    min: 0.010, max: 0.022 },
      'Reliquia':  { type: 'arenaDmgMult',                     min: 0.008, max: 0.018 },
    },
  };

  const SECONDARY_AFFIX_POOL = [
    { type: 'xpGlobal',                          min: 0.004, max: 0.010 },
    { type: 'goldMult',                          min: 0.005, max: 0.012 },
    { type: 'woodMult',                          min: 0.006, max: 0.014 },
    { type: 'stoneMult',                         min: 0.006, max: 0.014 },
    { type: 'xpMult', activity: 'corsa',         min: 0.005, max: 0.012 },
    { type: 'xpMult', activity: 'camminata',     min: 0.005, max: 0.012 },
    { type: 'xpMult', activity: 'cyclette',      min: 0.005, max: 0.012 },
    { type: 'arenaDmgMult',                      min: 0.004, max: 0.010 },
    { type: 'arenaHpMult',                       min: 0.004, max: 0.010 },
  ];


  /* Nomi per indice immagine — garantisce che nome e immagine corrispondano sempre */
  const ARMA_NAMES_BY_IMG = {
    comune:      ['Pugnale', 'Ascia', 'Mazza', 'Pugnale', 'Lancia', 'Lancia', 'Ascia', 'Coltello'],
    non_comune:  ['Spada', 'Ascia', 'Pugnale', 'Pugnale', 'Mazza', 'Arco', 'Martello'],
    raro:        ['Ascia', 'Spada', 'Spada', 'Spada', 'Spada', 'Ascia', 'Spada', 'Mazza', 'Arco', 'Pugnale', 'Pugnale', 'Balestra', 'Flagello', 'Lancia', 'Martello', 'Martello'],
    epico:       ['Spada', 'Ascia', 'Pugnale', 'Martello', 'Ascia', 'Balestra', 'Ascia', 'Mazza', 'Falce', 'Falce', 'Pugnale', 'Spada', 'Martello', 'Spada'],
    leggendario: ['Spada', 'Mazza', 'Tridente', 'Balestra'],
    divino:      ['Bastone', 'Spada', 'Martello', 'Arco'],
    oscuro:      ['Falce', 'Bastone', 'Mazza', 'Pugnale', 'Spada', 'Pugnale'],
  };

  function rollAffix(def, scale) {
    const raw = def.min + Math.random() * (def.max - def.min);
    const af = { type: def.type, value: +((raw * scale).toFixed(4)) };
    if (def.activity) af.activity = def.activity;
    return af;
  }


  function genItem(level, minRarity, forcedSlot, forcedRarity) {
    const rarity = forcedRarity || rollRarity(level, minRarity);
    const slot = forcedSlot ||
      EQUIP_SLOTS[Math.floor(Math.random() * EQUIP_SLOTS.length)];

    const id = 'i' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
    const h = [...id].reduce((s, c) => (s * 33 + c.charCodeAt(0)) % 9973, 7);

    let base;
    const armaNames = ARMA_NAMES_BY_IMG[rarity];
    if (slot === 'arma' && armaNames) {
      base = armaNames[h % armaNames.length];
    } else {
      base = ITEM_BASES[slot][Math.floor(Math.random() * ITEM_BASES[slot].length)];
    }

    const scale = RARITY_TYPE_SCALE[rarity] || 1;
    const affixes = [];

    const primaryDef = (ITEM_TYPE_AFFIX[slot] || {})[base];
    if (primaryDef) affixes.push(rollAffix(primaryDef, scale));

    const secCount = RARITY_SECONDARY_COUNT[rarity] || 0;
    const used = new Set(affixes.map(a => a.type + (a.activity || '')));
    for (let si = 0; si < secCount; si++) {
      const avail = SECONDARY_AFFIX_POOL.filter(p => !used.has(p.type + (p.activity || '')));
      if (!avail.length) break;
      const pick = avail[Math.floor(Math.random() * avail.length)];
      affixes.push(rollAffix(pick, scale));
      used.add(pick.type + (pick.activity || ''));
    }

    const suf = RARITY_SUFFIX[rarity][Math.floor(Math.random() * RARITY_SUFFIX[rarity].length)];
    const r = RARITIES[rarity];
    return {
      id, slot, rarity, base,
      name: `${base} ${suf}`,
      icon: SLOTS[slot].icon,
      xp: r.xp,
      value: r.value,
      affixes,
      desc: descForItem(slot, rarity, base, affixes),
    };
  }

  function descForItem(slot, rarity, base, affixes) {
    const r = RARITIES[rarity];
    const label = base || { arma: 'Arma', scudo: 'Scudo', elmo: 'Elmo',
      armatura: 'Armatura', anello: 'Anello', amuleto: 'Amuleto' }[slot];
    const parts = [`+${r.xp}% XP`];
    (affixes || []).forEach(a => {
      const pct = Math.round(a.value * 1000) / 10;
      if (a.type === 'arenaDmgMult')           parts.push(`+${pct}% danni Arena`);
      else if (a.type === 'arenaHpMult')       parts.push(`+${pct}% HP Arena`);
      else if (a.type === 'goldMult')          parts.push(`+${pct}% oro`);
      else if (a.type === 'woodMult')          parts.push(`+${pct}% legna`);
      else if (a.type === 'stoneMult')         parts.push(`+${pct}% pietra`);
      else if (a.type === 'xpGlobal')          parts.push(`+${pct}% XP (tutti)`);
      else if (a.type === 'xpMult' && a.activity) parts.push(`+${pct}% XP ${a.activity}`);
    });
    return `${label} ${r.label}. ${parts.join(' · ')}. Valore: ${r.value} monete.`;
  }

  // Genera loot per un eroe, applicando il talento dell'Alchimista
  function genItemFor(hero, minRarity, forcedSlot) {
    let item = genItem(hero.level, minRarity, forcedSlot);
    const alchProc = isClass(hero, 'alchimista') && Math.random() < 0.10;
    const furn = furnitureAggregate(hero);
    const classDropRareChance = isClass(hero, 'principessa') ? 0.15 : 0;
    const skillDropChance = skillBonus(hero, 'dropRareChance');
    const lootLuckActive = hero.dailyPotion && hero.dailyPotion.id === 'loot_luck' && !hero.dailyPotion.used;
    const furnProc = Math.random() < furn.dropRareChance + classDropRareChance + skillDropChance || lootLuckActive;
    if (lootLuckActive && !minRarity) minRarity = 'raro';
    if (alchProc || furnProc) {
      const avail = availableRarities(hero.level);
      const idx = avail.indexOf(item.rarity);
      if (idx >= 0 && idx < avail.length - 1) {
        item = genItem(hero.level, null, item.slot, avail[idx + 1]);
        if (alchProc) item.distilled = true; // il tocco dell'Alchimista
      }
    }
    return item;
  }

  function equipmentXpBonus(hero) {
    let tot = 0;
    Object.values(hero.equipment || {}).forEach(id => {
      const it = (hero.items || []).find(i => i.id === id);
      if (it) tot += it.xp;
    });
    return tot; // in %
  }

  /* Aggrega tutti gli affix degli item equipaggiati (stesso formato di furnitureAggregate) */
  function equipTypeBonusAggregate(hero) {
    const out = {
      xpMult: { camminata: 0, corsa: 0, cyclette: 0, global: 0 },
      goldMult: 0, woodMult: 0, stoneMult: 0,
      arenaDmgMult: 0, arenaHpMult: 0,
    };
    Object.values(hero.equipment || {}).forEach(id => {
      if (!id) return;
      const it = (hero.items || []).find(i => i.id === id);
      if (!it || !it.affixes) return;
      it.affixes.forEach(a => {
        if      (a.type === 'arenaDmgMult')               out.arenaDmgMult        += a.value;
        else if (a.type === 'arenaHpMult')                out.arenaHpMult         += a.value;
        else if (a.type === 'goldMult')                   out.goldMult            += a.value;
        else if (a.type === 'woodMult')                   out.woodMult            += a.value;
        else if (a.type === 'stoneMult')                  out.stoneMult           += a.value;
        else if (a.type === 'xpGlobal')                   out.xpMult.global       += a.value;
        else if (a.type === 'xpMult' && a.activity)       out.xpMult[a.activity]  = (out.xpMult[a.activity] || 0) + a.value;
      });
    });
    return out;
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
      km: 15, minLevel: 9,
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
    { id: 'golem',     zone: 'Le Pianure del Vento', name: 'Il Generale dei Golem',
      km: 25, minLevel: 16, requires: 'giardino1',
      desc: 'Un colosso a molla marcia tra l\'erba alta delle pianure spazzate dal vento. Sconfiggilo!',
      reward: { gold: 250, card: 'card_golem', items: 2 } },
    { id: 'amuleto',   zone: 'Le Pianure del Vento', name: 'L\'Amuleto del Viaggiatore Esperto',
      km: 30, minLevel: 19, requires: 'golem',
      desc: 'Forgia l\'amuleto leggendario del Viaggiatore: un cimelio che porta fortuna a chi non si ferma mai.',
      reward: { gold: 300, card: 'card_amuleto', items: 2, minRarity: 'epico' } },
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

  // Missioni extra per Rovine di Oakhaven (bioma 0, lv 1-4)
  MISSIONS.push(
    { id:'rovine_a', zone:'Rovine di Oakhaven', name:'L\'Ultimo Rifugio', km:6, minLevel:1,
      desc:'Trova un posto riparato dove passare la prima notte.', reward:{gold:20,wood:15} },
    { id:'rovine_b', zone:'Rovine di Oakhaven', name:'I Sopravvissuti', km:8, minLevel:2,
      desc:'Scorgi dei fuochi lontani: altri sopravvissuti ti hanno visto!', reward:{gold:30,stone:10,items:1} },
    { id:'rovine_c', zone:'Rovine di Oakhaven', name:'Il Campanile Crollato', km:10, minLevel:2,
      desc:'Il campanile era il cuore del villaggio. Nei detriti si nasconde qualcosa di prezioso.', reward:{gold:35,wood:20} },
    { id:'rovine_d', zone:'Rovine di Oakhaven', name:'Le Catacombe Dimenticate', km:12, minLevel:3,
      desc:'Sotto le pietre annerite dal fuoco scorre un labirinto sotterraneo.', reward:{gold:45,stone:20,items:1} },
    { id:'rovine_e', zone:'Rovine di Oakhaven', name:'La Borsa del Viandante', km:8, minLevel:3,
      desc:'Un vecchio mercante lasciò il suo bagaglio nella fuga. Recuperalo prima delle bestie.', reward:{gold:40,wood:10,items:1} },
    { id:'rovine_f', zone:'Rovine di Oakhaven', name:'I Mercanti Fuggiaschi', km:10, minLevel:4,
      desc:'Raggiungi la carovana di mercanti e scambia qualcosa prima che lascino la zona.', reward:{gold:55,stone:15,items:1} },
    { id:'rovine_g', zone:'Rovine di Oakhaven', name:'Il Tribunale Dimenticato', km:14, minLevel:4,
      desc:'L\'Orda non sa che il tribunale nasconde ancora i registri della città.', reward:{gold:65,wood:25,stone:10,items:1} },
    { id:'rovine_h', zone:'Rovine di Oakhaven', name:'Il Pozzo Antico', km:7, minLevel:1,
      desc:'Il pozzo al centro della piazza trabocca ancora di acqua pura. Ripulisci i dintorni.', reward:{gold:25,wood:10} },
  );

  // Missioni extra per Foresta Sussurrante (bioma 1, lv 5-10)
  MISSIONS.push(
    { id:'foresta_a', zone:'Foresta Sussurrante', name:'La Radura dei Cervi', km:8, minLevel:5,
      desc:'Una radura silenziosa ospita creature magiche. Avvicinati con cura.', reward:{gold:55,wood:30,items:1} },
    { id:'foresta_b', zone:'Foresta Sussurrante', name:'Le Bacche Magiche', km:10, minLevel:6,
      desc:'La foresta produce bacche con proprietà curative. Raccoglile prima che marciscano.', reward:{gold:60,wood:35,items:1} },
    { id:'foresta_c', zone:'Foresta Sussurrante', name:'Il Sentiero del Druido', km:12, minLevel:7,
      desc:'Un druido errante ti ha lasciato un messaggio inciso su un albero. Seguine le istruzioni.', reward:{gold:75,stone:30,items:1} },
    { id:'foresta_d', zone:'Foresta Sussurrante', name:'Il Rifugio del Cacciatore', km:14, minLevel:8,
      desc:'Una capanna abbandonata custodisce armi e provviste. Non è completamente vuota.', reward:{gold:85,wood:40,items:2} },
    { id:'foresta_e', zone:'Foresta Sussurrante', name:'Il Grande Querco', km:10, minLevel:7,
      desc:'L\'albero più antico della foresta contiene un cristallo di memoria. Recuperalo.', reward:{gold:70,stone:25,items:1} },
    { id:'foresta_f', zone:'Foresta Sussurrante', name:'Le Trappole dei Predatori', km:12, minLevel:8,
      desc:'Qualcuno ha disseminato trappole nei sentieri. Neutralizzale prima che colpiscano innocenti.', reward:{gold:80,wood:35,stone:20,items:1} },
    { id:'foresta_g', zone:'Foresta Sussurrante', name:'Il Patto con la Foresta', km:18, minLevel:9,
      desc:'Per ottenere la fiducia degli spiriti del bosco devi dimostrare il tuo valore.', reward:{gold:110,wood:50,stone:30,items:2} },
    { id:'foresta_h', zone:'Foresta Sussurrante', name:'La Runa dell\'Albero Madre', km:20, minLevel:10,
      desc:'L\'albero più grande custodisce una runa che potenzia l\'armatura. Ma è sorvegliato.', reward:{gold:130,wood:60,items:2} },
  );

  // Missioni extra per Il Giardino Lastricato (bioma 2, lv 11-15)
  MISSIONS.push(
    { id:'giardino2', zone:'Il Giardino Lastricato', name:'Le Spine Malvagie', km:10, minLevel:11,
      desc:'Rovi magici bloccano i viali del giardino. Trovane il germoglio radice.', reward:{gold:100,wood:35,items:1} },
    { id:'giardino3', zone:'Il Giardino Lastricato', name:'Il Pozzetto Antico', km:12, minLevel:12,
      desc:'Un pozzo nascosto sotto le pietre lastricate risuona di un canto antico.', reward:{gold:110,stone:40,items:1} },
    { id:'giardino4', zone:'Il Giardino Lastricato', name:'Fiori del Male', km:15, minLevel:12,
      desc:'Fiori luminescenti attirano i viaggiatori per poi prosciugarli. Strappali dalla radice.', reward:{gold:120,wood:45,items:1} },
    { id:'giardino5', zone:'Il Giardino Lastricato', name:'Lo Gnomo Giardiniere', km:12, minLevel:13,
      desc:'Uno gnomo corrotto ha preso il controllo delle serre del giardino. Liberale.', reward:{gold:115,stone:35,items:1} },
    { id:'giardino6', zone:'Il Giardino Lastricato', name:'Il Cancello Arrugginito', km:18, minLevel:14,
      desc:'Il cancello nord del giardino sblocca l\'ala proibita. Serve una chiave speciale.', reward:{gold:135,wood:50,stone:30,items:2} },
    { id:'giardino7', zone:'Il Giardino Lastricato', name:'L\'Irrigatore Magico', km:15, minLevel:14, requires:'giardino6',
      desc:'L\'irrigatore antico può curare le piante avvelenate, ma è nelle mani sbagliate.', reward:{gold:130,stone:45,items:1} },
    { id:'giardino8', zone:'Il Giardino Lastricato', name:'La Fontana Avvelenata', km:20, minLevel:15, requires:'giardino7',
      desc:'La fontana centrale del giardino è avvelenata dall\'Orda. Purificala.', reward:{gold:155,wood:55,stone:40,items:2} },
    { id:'giardino9', zone:'Il Giardino Lastricato', name:'Il Guardiano Vegetale', km:22, minLevel:15,
      desc:'Un colosso fatto di radici e pietra sorveglia l\'antico seme del giardino.', reward:{gold:175,wood:60,items:2} },
  );

  // Missioni extra per Le Pianure del Vento (bioma 3, lv 16-20)
  MISSIONS.push(
    { id:'pianure2', zone:'Le Pianure del Vento', name:'La Fattoria Abbandonata', km:12, minLevel:16,
      desc:'Una fattoria svuotata dalla fuga ospita ancora risorse preziose.', reward:{gold:145,wood:50,stone:30,items:1} },
    { id:'pianure3', zone:'Le Pianure del Vento', name:'Il Mulino a Vento', km:15, minLevel:17,
      desc:'Il mulino gira ancora, azionato da qualcosa di oscuro. Scopri cosa.', reward:{gold:160,stone:50,items:1} },
    { id:'pianure4', zone:'Le Pianure del Vento', name:'Banditi del Vento', km:15, minLevel:17,
      desc:'Una banda di predatori cavalca tra le pianure saccheggiando i villaggi rimasti.', reward:{gold:165,wood:45,stone:35,items:2} },
    { id:'pianure5', zone:'Le Pianure del Vento', name:'L\'Accampamento Nomade', km:18, minLevel:18,
      desc:'I nomadi delle pianure conoscono segreti antichi. Guadagna la loro fiducia.', reward:{gold:175,wood:55,items:2} },
    { id:'pianure6', zone:'Le Pianure del Vento', name:'Il Bestiame Smarrito', km:15, minLevel:18,
      desc:'Le mandrie si sono disperse nel panico. Radunale prima che vengano catturate dall\'Orda.', reward:{gold:165,stone:45,items:1} },
    { id:'pianure7', zone:'Le Pianure del Vento', name:'La Tempesta Imminente', km:20, minLevel:19,
      desc:'Un temporale magico si addensa sulle pianure. Solo chi è veloce riesce a mettersi al riparo.', reward:{gold:195,wood:65,stone:50,items:2} },
    { id:'pianure8', zone:'Le Pianure del Vento', name:'Lo Sperone Nero', km:22, minLevel:19,
      desc:'Una roccia oscura al centro delle pianure emette un segnale malevolo verso l\'Orda.', reward:{gold:215,stone:60,items:2} },
    { id:'pianure9', zone:'Le Pianure del Vento', name:'L\'Aquila del Vento', km:18, minLevel:16,
      desc:'Un\'aquila ferita porta un messaggio legato alla zampa. Curala e leggi cosa dice.', reward:{gold:155,wood:55,items:1} },
  );

  // Missioni extra per L'Antico Archivio (bioma 4, lv 21-25)
  MISSIONS.push(
    { id:'archivio2', zone:'L\'Antico Archivio', name:'I Guardiani di Carta', km:12, minLevel:21,
      desc:'Le pagine viventi dell\'archivio resistono agli intrusi con strane magie.', reward:{gold:175,stone:45,items:1} },
    { id:'archivio3', zone:'L\'Antico Archivio', name:'La Sezione Proibita', km:15, minLevel:22,
      desc:'Oltre la porta sigillata si celano tomi che l\'Orda vuole bruciare. Proteggili.', reward:{gold:195,wood:55,items:1} },
    { id:'archivio4', zone:'L\'Antico Archivio', name:'I Golem Scribani', km:18, minLevel:23,
      desc:'Golem creati per copiare libri ora assaltano chiunque entri nell\'archivio.', reward:{gold:215,stone:60,items:2} },
    { id:'archivio5', zone:'L\'Antico Archivio', name:'Il Codice Perduto', km:20, minLevel:24,
      desc:'Un antico codice cifrato svela la posizione del cuore dell\'Orda. Decifralo.', reward:{gold:235,wood:65,stone:50,items:2} },
    { id:'archivio6', zone:'L\'Antico Archivio', name:'L\'Archivista Corrotto', km:22, minLevel:24,
      desc:'Il custode dell\'archivio è stato corrotto dall\'Orda. Spezza il suo incantesimo.', reward:{gold:250,stone:70,items:2} },
    { id:'archivio7', zone:'L\'Antico Archivio', name:'Il Registro dei Caduti', km:15, minLevel:22,
      desc:'Un registro antico elenca tutti i caduti di Oakhaven. Trovalo e preservalo.', reward:{gold:190,wood:60,items:1} },
    { id:'archivio8', zone:'L\'Antico Archivio', name:'Il Sigillo della Conoscenza', km:25, minLevel:25,
      desc:'Un sigillo magico protegge la bibioteca segreta. Romperlo ti farà più potente.', reward:{gold:275,stone:75,items:2} },
    { id:'archivio9', zone:'L\'Antico Archivio', name:'Le Mappe Segrete', km:13, minLevel:21,
      desc:'Antiche mappe dei biomi ancora inesplorati giacciono dimenticate in fondo all\'archivio.', reward:{gold:180,wood:50,items:1} },
  );

  // Missioni extra per Le Fucine di Ruggine (bioma 5, lv 26-30)
  MISSIONS.push(
    { id:'fucine2', zone:'Le Fucine di Ruggine', name:'Il Martello Rovente', km:12, minLevel:26,
      desc:'Un martello incantato vaga tra le fucine colpendo chiunque si avvicini. Domalo.', reward:{gold:215,stone:55,items:1} },
    { id:'fucine3', zone:'Le Fucine di Ruggine', name:'L\'Operaio della Discordia', km:15, minLevel:27,
      desc:'Un operaio corrotto sabota le macchine. Scopri per chi lavora davvero.', reward:{gold:230,wood:65,items:1} },
    { id:'fucine4', zone:'Le Fucine di Ruggine', name:'I Tubi Incandescenti', km:18, minLevel:28,
      desc:'I tubi del vapore sono stati manomessi. Un\'esplosione è imminente.', reward:{gold:250,stone:65,items:2} },
    { id:'fucine5', zone:'Le Fucine di Ruggine', name:'La Locomotiva Infernale', km:20, minLevel:28,
      desc:'Una locomotiva magica sfuggita al controllo demolisce tutto sul suo percorso.', reward:{gold:265,wood:70,stone:60,items:2} },
    { id:'fucine6', zone:'Le Fucine di Ruggine', name:'Il Camino Eterno', km:15, minLevel:27,
      desc:'Il camino principale non si spegne da anni: alimentato da un incantesimo oscuro.', reward:{gold:235,stone:60,items:1} },
    { id:'fucine7', zone:'Le Fucine di Ruggine', name:'L\'Ingranaggio Mancante', km:20, minLevel:29,
      desc:'Senza l\'ingranaggio principale le fucine si fermano. Trovalo nelle profondità.', reward:{gold:280,wood:75,items:2} },
    { id:'fucine8', zone:'Le Fucine di Ruggine', name:'Il Mastro Fabbro Oscuro', km:25, minLevel:30,
      desc:'Il mastro fabbro corrotto dall\'Orda forgia armi per l\'esercito nemico. Fermalo.', reward:{gold:315,stone:80,items:2} },
    { id:'fucine9', zone:'Le Fucine di Ruggine', name:'Il Metallo Raro', km:13, minLevel:26,
      desc:'Nelle fucine abbandonate giace un metallo di rarità sconosciuta. Recuperalo.', reward:{gold:220,wood:60,items:1} },
  );

  // Missioni extra per La Torre dell'Alchimista (bioma 6, lv 31-35)
  MISSIONS.push(
    { id:'torre2', zone:'La Torre dell\'Alchimista', name:'Il Primo Livello', km:12, minLevel:31,
      desc:'Il primo piano della torre pullula di esperimenti sfuggiti al controllo.', reward:{gold:255,stone:65,items:1} },
    { id:'torre3', zone:'La Torre dell\'Alchimista', name:'L\'Esperimento Sbagliato', km:15, minLevel:32,
      desc:'Una pozione errata ha trasformato le piante in creature aggressive.', reward:{gold:275,wood:75,items:1} },
    { id:'torre4', zone:'La Torre dell\'Alchimista', name:'Il Portale Instabile', km:18, minLevel:33,
      desc:'Un portale aperto per errore inghiotte tutto ciò che si avvicina. Chiudilo.', reward:{gold:295,stone:75,items:2} },
    { id:'torre5', zone:'La Torre dell\'Alchimista', name:'Le Pozioni Esplose', km:15, minLevel:32,
      desc:'Le bottiglie nella cantina della torre esplodono casualmente. Metti in sicurezza la zona.', reward:{gold:270,wood:70,items:1} },
    { id:'torre6', zone:'La Torre dell\'Alchimista', name:'La Strega Aiutante', km:20, minLevel:34,
      desc:'Una strega alleata è rimasta intrappolata al terzo piano. Liberala.', reward:{gold:310,stone:80,items:2} },
    { id:'torre7', zone:'La Torre dell\'Alchimista', name:'Il Catalizzatore Rubato', km:22, minLevel:34,
      desc:'L\'Orda ha rubato il catalizzatore dell\'alchimista. Recuperalo prima che lo usi.', reward:{gold:330,wood:80,stone:70,items:2} },
    { id:'torre8', zone:'La Torre dell\'Alchimista', name:'L\'Alchimista Immortale', km:25, minLevel:35,
      desc:'L\'alchimista della torre è diventato immortale grazie a una pozione oscura. Spezza l\'incantesimo.', reward:{gold:360,stone:90,items:3} },
    { id:'torre9', zone:'La Torre dell\'Alchimista', name:'Gli Appunti Segreti', km:13, minLevel:31,
      desc:'In una stanza nascosta giacciono gli appunti dell\'alchimista su come sconfiggere l\'Orda.', reward:{gold:260,wood:70,items:1} },
  );

  // Missioni extra per La Cripta dell'Orologiaio (bioma 7, lv 36-40)
  MISSIONS.push(
    { id:'cripta2', zone:'La Cripta dell\'Orologiaio', name:'Il Ticchettio Infinito', km:12, minLevel:36,
      desc:'Un ticchettio assordante proviene da ogni angolo della cripta. Trova la fonte.', reward:{gold:295,stone:75,items:1} },
    { id:'cripta3', zone:'La Cripta dell\'Orologiaio', name:'L\'Orologio Rotto', km:15, minLevel:37,
      desc:'L\'orologio principale si è fermato: senza di esso il tempo nella cripta è distorto.', reward:{gold:315,wood:80,items:1} },
    { id:'cripta4', zone:'La Cripta dell\'Orologiaio', name:'I Soldatini di Corda', km:18, minLevel:38,
      desc:'Soldatini meccanici animati da magia oscura pattugliano i corridoi della cripta.', reward:{gold:340,stone:85,items:2} },
    { id:'cripta5', zone:'La Cripta dell\'Orologiaio', name:'Il Pendolo della Morte', km:20, minLevel:38,
      desc:'Un pendolo gigante oscilla sui corridoi principali. Trovare il modo di bloccarlo.', reward:{gold:355,wood:85,stone:80,items:2} },
    { id:'cripta6', zone:'La Cripta dell\'Orologiaio', name:'Il Genio Meccanico', km:15, minLevel:37,
      desc:'Un genio meccanico autoriparantesi infesta la sala delle macchine.', reward:{gold:320,stone:80,items:1} },
    { id:'cripta7', zone:'La Cripta dell\'Orologiaio', name:'Lo Scrigno del Tempo', km:22, minLevel:39,
      desc:'Uno scrigno che avanza e retrocede nel tempo. Al suo interno, una reliquia leggendaria.', reward:{gold:375,wood:90,items:2} },
    { id:'cripta8', zone:'La Cripta dell\'Orologiaio', name:'L\'Orologiaio Folle', km:25, minLevel:40,
      desc:'L\'orologiaio che costruì la cripta è ancora vivo. E vuole che tutti si fermino con lui.', reward:{gold:400,stone:95,items:3} },
    { id:'cripta9', zone:'La Cripta dell\'Orologiaio', name:'Il Congegno Segreto', km:13, minLevel:36,
      desc:'Tra gli ingranaggi un piccolo congegno nasconde un\'incisione: la mappa della prossima zona.', reward:{gold:300,wood:80,items:1} },
  );

  // Missioni extra per La Baia del Corallo (bioma 8, lv 41-45)
  MISSIONS.push(
    { id:'baia2', zone:'La Baia del Corallo', name:'I Pescatori di Perle', km:12, minLevel:41,
      desc:'I pescatori di perle della baia sono stati catturati dall\'Orda. Liberali.', reward:{gold:335,stone:80,items:1} },
    { id:'baia3', zone:'La Baia del Corallo', name:'La Sirena Ostile', km:15, minLevel:42,
      desc:'Una sirena corrotta attira le navi verso gli scogli con il suo canto maledetto.', reward:{gold:360,wood:85,items:1} },
    { id:'baia4', zone:'La Baia del Corallo', name:'Il Relitto Subacqueo', km:18, minLevel:43,
      desc:'Un antico relitto sul fondo della baia nasconde un tesoro leggendario dell\'Orda.', reward:{gold:385,stone:90,items:2} },
    { id:'baia5', zone:'La Baia del Corallo', name:'I Pirati del Corallo', km:20, minLevel:43,
      desc:'Una flotta di pirati al servizio dell\'Orda blocca i commerci nella baia.', reward:{gold:395,wood:90,stone:80,items:2} },
    { id:'baia6', zone:'La Baia del Corallo', name:'La Grotta dei Molluschi', km:15, minLevel:42,
      desc:'I molluschi giganti della grotta sono stati trasformati in guardiani dell\'Orda.', reward:{gold:355,stone:85,items:1} },
    { id:'baia7', zone:'La Baia del Corallo', name:'Il Capitano Fantasma', km:22, minLevel:44,
      desc:'Il capitano di una nave affondata vaga come spettro alla ricerca di vendetta.', reward:{gold:420,wood:95,items:2} },
    { id:'baia8', zone:'La Baia del Corallo', name:'Il Re dei Fondali', km:25, minLevel:45,
      desc:'Un mostruoso essere dei fondali sorveglia il cristallo di corallo. Sfidalo.', reward:{gold:455,stone:100,items:3} },
    { id:'baia9', zone:'La Baia del Corallo', name:'Il Faro Dimenticato', km:13, minLevel:41,
      desc:'Il faro della baia è spento da quando l\'Orda è arrivata. Riaccendilo.', reward:{gold:340,wood:85,items:1} },
  );

  // Missioni extra per Il Fossato Profondo (bioma 9, lv 46-50)
  MISSIONS.push(
    { id:'fossato2', zone:'Il Fossato Profondo', name:'Le Scale Rotte', km:12, minLevel:46,
      desc:'Le scale che scendono nel fossato sono state sabotate. Trovane una via sicura.', reward:{gold:375,stone:85,items:1} },
    { id:'fossato3', zone:'Il Fossato Profondo', name:'I Vermi Giganti', km:15, minLevel:47,
      desc:'Vermi colossali si muovono tra le pareti del fossato, aprendo gallerie verso l\'ignoto.', reward:{gold:400,wood:90,items:1} },
    { id:'fossato4', zone:'Il Fossato Profondo', name:'Il Pozzo Senza Fondo', km:18, minLevel:48,
      desc:'Un pozzo al centro del fossato non ha fondo visibile. Qualcosa proviene di là sotto.', reward:{gold:425,stone:95,items:2} },
    { id:'fossato5', zone:'Il Fossato Profondo', name:'L\'Eco Maledetto', km:20, minLevel:48,
      desc:'Il fossato amplifica un grido antico che disoriente i viandanti. Trova la fonte.', reward:{gold:440,wood:95,stone:90,items:2} },
    { id:'fossato6', zone:'Il Fossato Profondo', name:'La Radice Antica', km:15, minLevel:47,
      desc:'Una radice millenaria penetra nel fossato. In essa dorme un incantesimo di protezione.', reward:{gold:405,stone:90,items:1} },
    { id:'fossato7', zone:'Il Fossato Profondo', name:'Il Custode dell\'Abisso', km:22, minLevel:49,
      desc:'Un guardiano creato per proteggere il fossato è stato corrotto. Purificalo.', reward:{gold:465,wood:100,items:2} },
    { id:'fossato8', zone:'Il Fossato Profondo', name:'La Creatura del Fossato', km:25, minLevel:50,
      desc:'Qualcosa di enorme si è svegliato nelle profondità del fossato. L\'Orda lo usa come arma.', reward:{gold:500,stone:105,items:3} },
    { id:'fossato9', zone:'Il Fossato Profondo', name:'La Pietra Fluorescente', km:13, minLevel:46,
      desc:'Pietre luminescenti nelle pareti del fossato guidano il cammino. Raccogliene per usarle.', reward:{gold:380,wood:90,items:1} },
  );

  // Missioni extra per Le Fognature del Reame (bioma 10, lv 51-55)
  MISSIONS.push(
    { id:'fogna2', zone:'Le Fognature del Reame', name:'I Topi Soldato', km:12, minLevel:51,
      desc:'Topi addestrati dall\'Orda trasportano messaggi segreti tra le fognature.', reward:{gold:415,stone:95,items:1} },
    { id:'fogna3', zone:'Le Fognature del Reame', name:'La Rete di Canali', km:15, minLevel:52,
      desc:'Un labirinto di canali collegati avvolge l\'intero reame sottoterra. Trovane l\'uscita.', reward:{gold:440,wood:100,items:1} },
    { id:'fogna4', zone:'Le Fognature del Reame', name:'I Funghi Tossici', km:18, minLevel:53,
      desc:'I funghi delle fognature producono spore che avvelenano l\'aria del reame.', reward:{gold:465,stone:100,items:2} },
    { id:'fogna5', zone:'Le Fognature del Reame', name:'Il Ribollire delle Acque', km:20, minLevel:53,
      desc:'Le acque delle fognature ribollono di magia oscura. Qualcuno le sta contaminando.', reward:{gold:480,wood:105,stone:95,items:2} },
    { id:'fogna6', zone:'Le Fognature del Reame', name:'La Gilda dei Fognaioli', km:15, minLevel:52,
      desc:'Una gilda segreta di fognaioli ribelli resiste all\'Orda nelle profondità. Unisciti a loro.', reward:{gold:445,stone:100,items:1} },
    { id:'fogna7', zone:'Le Fognature del Reame', name:'Il Signore dei Topi', km:22, minLevel:54,
      desc:'Un enorme ratto mannaro comanda l\'esercito di roditori al servizio dell\'Orda.', reward:{gold:510,wood:110,items:2} },
    { id:'fogna8', zone:'Le Fognature del Reame', name:'Il Drago Fognario', km:25, minLevel:55,
      desc:'Una creatura draconica vive nelle fognature, nutrendosi dei rifiuti magici dell\'Orda.', reward:{gold:555,stone:115,items:3} },
    { id:'fogna9', zone:'Le Fognature del Reame', name:'Il Tesoro Nascosto', km:13, minLevel:51,
      desc:'Un vecchio tesoro di guerra è stato celato nelle fognature durante la prima invasione.', reward:{gold:420,wood:100,items:1} },
  );

  // Missioni extra per La Costa del Relitto (bioma 11, lv 56-60)
  MISSIONS.push(
    { id:'costa2', zone:'La Costa del Relitto', name:'I Naufraghi Sopravvissuti', km:12, minLevel:56,
      desc:'Alcuni superstiti di una nave dell\'Orda si sono ribellati. Aiutali a fuggire.', reward:{gold:455,stone:105,items:1} },
    { id:'costa3', zone:'La Costa del Relitto', name:'Il Faro Oscuro', km:15, minLevel:57,
      desc:'Il faro della costa emette una luce nera che guida le navi nemiche verso di te.', reward:{gold:480,wood:110,items:1} },
    { id:'costa4', zone:'La Costa del Relitto', name:'I Tesori della Tempesta', km:18, minLevel:58,
      desc:'Una tempesta ha fatto arenare navi cariche di rifornimenti. Recuperali prima dell\'Orda.', reward:{gold:510,stone:110,items:2} },
    { id:'costa5', zone:'La Costa del Relitto', name:'Il Cannone Spettrale', km:20, minLevel:58,
      desc:'Un cannone fantasma sulle scogliere spara verso i viaggiatori. Disattivalo.', reward:{gold:525,wood:115,stone:105,items:2} },
    { id:'costa6', zone:'La Costa del Relitto', name:'Le Ossa del Capitano', km:15, minLevel:57,
      desc:'Lo scheletro di un antico capitano custodisce ancora il suo ciondolo di comando.', reward:{gold:485,stone:110,items:1} },
    { id:'costa7', zone:'La Costa del Relitto', name:'La Flotta Fantasma', km:22, minLevel:59,
      desc:'Navi spettrali al servizio dell\'Orda bloccano le rotte marine del reame.', reward:{gold:555,wood:120,items:2} },
    { id:'costa8', zone:'La Costa del Relitto', name:'Il Guardiano del Relitto', km:25, minLevel:60,
      desc:'Un\'entità marina protegge il relitto più grande della costa. Sconfiggila.', reward:{gold:600,stone:125,items:3} },
    { id:'costa9', zone:'La Costa del Relitto', name:'Il Messaggio in Bottiglia', km:13, minLevel:56,
      desc:'Una bottiglia con un messaggio urgente è stata gettata in mare da qualcuno oltre il confine.', reward:{gold:460,wood:110,items:1} },
  );

  // Missioni extra per Il Picco Innevato (bioma 12, lv 61-65)
  MISSIONS.push(
    { id:'picco2', zone:'Il Picco Innevato', name:'La Valanga Minacciosa', km:12, minLevel:61,
      desc:'Una valanga artificiale creata dall\'Orda sta per coprire un villaggio di montagna.', reward:{gold:495,stone:115,items:1} },
    { id:'picco3', zone:'Il Picco Innevato', name:'Il Rifugio di Montagna', km:15, minLevel:62,
      desc:'Un rifugio abbandonato sull\'alto piano nasconde equipaggiamento da scalata raro.', reward:{gold:525,wood:120,items:1} },
    { id:'picco4', zone:'Il Picco Innevato', name:'Gli Yeti della Tempesta', km:18, minLevel:63,
      desc:'Gli yeti della montagna sono stati corrotti dalla magia dell\'Orda e ora attaccano i viandanti.', reward:{gold:555,stone:120,items:2} },
    { id:'picco5', zone:'Il Picco Innevato', name:'La Cima Perduta', km:20, minLevel:63,
      desc:'La cima del picco è avvolta da una nebbia magica che nasconde un cristallo di potere.', reward:{gold:570,wood:125,stone:115,items:2} },
    { id:'picco6', zone:'Il Picco Innevato', name:'I Ghiacci Eterni', km:15, minLevel:62,
      desc:'I ghiacci perenni del picco conservano antichi guerrieri congelati. L\'Orda li sta liberando.', reward:{gold:530,stone:120,items:1} },
    { id:'picco7', zone:'Il Picco Innevato', name:'Il Guardiano della Neve', km:22, minLevel:64,
      desc:'Un guardiano di ghiaccio antico sorveglia il sentiero verso la vetta.', reward:{gold:595,wood:130,items:2} },
    { id:'picco8', zone:'Il Picco Innevato', name:'Il Signore del Picco', km:25, minLevel:65,
      desc:'Un essere di vento e ghiaccio regna sulla cima del picco innevato. Sconfiggilo.', reward:{gold:640,stone:135,items:3} },
    { id:'picco9', zone:'Il Picco Innevato', name:'Le Impronte Giganti', km:13, minLevel:61,
      desc:'Enormi impronte nella neve portano verso una caverna nascosta tra le rocce.', reward:{gold:500,wood:120,items:1} },
  );

  // Missioni extra per Il Deserto di Cenere (bioma 13, lv 66-70)
  MISSIONS.push(
    { id:'deserto2', zone:'Il Deserto di Cenere', name:'Le Sabbie Bollenti', km:12, minLevel:66,
      desc:'Le sabbie del deserto bruciano per l\'energia dell\'Orda. Trovane la sorgente.', reward:{gold:535,stone:125,items:1} },
    { id:'deserto3', zone:'Il Deserto di Cenere', name:'I Guerrieri di Fuoco', km:15, minLevel:67,
      desc:'Guerrieri di cenere animata pattugliano il deserto bruciando ogni cosa.', reward:{gold:565,wood:130,items:1} },
    { id:'deserto4', zone:'Il Deserto di Cenere', name:'L\'Oasi Avvelenata', km:18, minLevel:68,
      desc:'L\'unica oasi del deserto è stata avvelenata dall\'Orda. Purificala.', reward:{gold:595,stone:130,items:2} },
    { id:'deserto5', zone:'Il Deserto di Cenere', name:'Il Vento di Fuoco', km:20, minLevel:68,
      desc:'Un tornado di cenere infuocata si sposta verso le ultime città rimaste.', reward:{gold:610,wood:135,stone:125,items:2} },
    { id:'deserto6', zone:'Il Deserto di Cenere', name:'La Duna Maledetta', km:15, minLevel:67,
      desc:'Una duna si muove da sola verso il confine del deserto. Al suo interno qualcosa di oscuro.', reward:{gold:570,stone:130,items:1} },
    { id:'deserto7', zone:'Il Deserto di Cenere', name:'Il Falco del Deserto', km:22, minLevel:69,
      desc:'Un enorme falco di fuoco sorveglia le rovine di un\'antica città nel cuore del deserto.', reward:{gold:635,wood:140,items:2} },
    { id:'deserto8', zone:'Il Deserto di Cenere', name:'Il Drago di Cenere', km:25, minLevel:70,
      desc:'Il drago del deserto si è svegliato dopo millenni, controllato dalla magia dell\'Orda.', reward:{gold:680,stone:145,items:3} },
    { id:'deserto9', zone:'Il Deserto di Cenere', name:'Il Tempio Sepolto', km:13, minLevel:66,
      desc:'La sabbia ha inghiottito un antico tempio. Al suo interno, risorse dimenticate.', reward:{gold:540,wood:130,items:1} },
  );

  // Missioni extra per La Palude Nebbiosa (bioma 14, lv 71-75)
  MISSIONS.push(
    { id:'palude2', zone:'La Palude Nebbiosa', name:'La Nebbia Vivente', km:12, minLevel:71,
      desc:'La nebbia della palude ha una coscienza propria: inganna e disoriente i viandanti.', reward:{gold:575,stone:135,items:1} },
    { id:'palude3', zone:'La Palude Nebbiosa', name:'I Fuochi Fatui', km:15, minLevel:72,
      desc:'I fuochi fatui della palude guidano i viandanti verso le trappole dell\'Orda.', reward:{gold:605,wood:140,items:1} },
    { id:'palude4', zone:'La Palude Nebbiosa', name:'Il Villaggio Sommerso', km:18, minLevel:73,
      desc:'Un villaggio affondato nella palude custodisce una reliquia fondamentale.', reward:{gold:635,stone:140,items:2} },
    { id:'palude5', zone:'La Palude Nebbiosa', name:'La Strega della Palude', km:20, minLevel:73,
      desc:'Una strega anziana custodisce i segreti della palude ma l\'Orda la minaccia.', reward:{gold:650,wood:145,stone:135,items:2} },
    { id:'palude6', zone:'La Palude Nebbiosa', name:'Le Lucciole Demoniache', km:15, minLevel:72,
      desc:'Lucciole malvagie hanno infestato la palude, succhiando la vita agli animali.', reward:{gold:610,stone:140,items:1} },
    { id:'palude7', zone:'La Palude Nebbiosa', name:'Il Coccodrillo Antico', km:22, minLevel:74,
      desc:'Un coccodrillo millenario si è svegliato. L\'Orda lo usa come guardia nel territorio.', reward:{gold:675,wood:150,items:2} },
    { id:'palude8', zone:'La Palude Nebbiosa', name:'Il Re della Palude', km:25, minLevel:75,
      desc:'Un\'entità maledetta regna sulla palude da secoli. Ora serve all\'Orda.', reward:{gold:720,stone:155,items:3} },
    { id:'palude9', zone:'La Palude Nebbiosa', name:'Le Radici Velenose', km:13, minLevel:71,
      desc:'Le radici sommerse della palude producono un veleno usato dall\'Orda per avvelenare i pozzi.', reward:{gold:580,wood:140,items:1} },
  );

  // Missioni extra per Il Cimitero dei Draghi (bioma 15, lv 76-80)
  MISSIONS.push(
    { id:'cimitero2', zone:'Il Cimitero dei Draghi', name:'Le Ossa Dracheniche', km:12, minLevel:76,
      desc:'Le ossa dei draghi caduti possiedono ancora energia residua. L\'Orda le raccoglie.', reward:{gold:615,stone:145,items:1} },
    { id:'cimitero3', zone:'Il Cimitero dei Draghi', name:'Il Dragone Risorgente', km:15, minLevel:77,
      desc:'Un cadavere di drago sta riprendendo vita grazie alla magia dell\'Orda.', reward:{gold:645,wood:155,items:1} },
    { id:'cimitero4', zone:'Il Cimitero dei Draghi', name:'Il Guardiano dei Caduti', km:18, minLevel:78,
      desc:'Lo spirito che protegge le tombe dei draghi è stato corrotto dall\'Orda.', reward:{gold:675,stone:150,items:2} },
    { id:'cimitero5', zone:'Il Cimitero dei Draghi', name:'La Tomba del Gran Drago', km:20, minLevel:78,
      desc:'La tomba del drago più grande mai vissuto. Al suo interno, l\'arma definitiva.', reward:{gold:690,wood:160,stone:150,items:2} },
    { id:'cimitero6', zone:'Il Cimitero dei Draghi', name:'Il Sigillo Proibito', km:15, minLevel:77,
      desc:'Un sigillo proibito blocca la porta principale del cimitero. Infrangilo.', reward:{gold:650,stone:150,items:1} },
    { id:'cimitero7', zone:'Il Cimitero dei Draghi', name:'Il Dragone Corrotto', km:22, minLevel:79,
      desc:'Un drago ancora vivo è stato corrotto dall\'Orda. Purificalo o combattilo.', reward:{gold:715,wood:165,items:2} },
    { id:'cimitero8', zone:'Il Cimitero dei Draghi', name:'Il Boss del Cimitero', km:25, minLevel:80,
      desc:'Il custode supremo del cimitero è il più potente servitore dell\'Orda incontrato finora.', reward:{gold:760,stone:165,items:3} },
    { id:'cimitero9', zone:'Il Cimitero dei Draghi', name:'Il Lamento del Drago', km:13, minLevel:76,
      desc:'Un drago ferito è rimasto intrappolato tra le tombe. Aiutalo a fuggire.', reward:{gold:620,wood:155,items:1} },
  );

  // Missioni extra per Miniere del Corruttore (bioma 16, lv 81-85)
  MISSIONS.push(
    { id:'miniere2', zone:'Miniere del Corruttore', name:'Il Tunnel Infestato', km:12, minLevel:81,
      desc:'Un tunnel bloccato da minerale corrotto nasconde una via verso il cuore dell\'Orda.', reward:{gold:655,stone:155,items:1} },
    { id:'miniere3', zone:'Miniere del Corruttore', name:'I Cristalli Corrotti', km:15, minLevel:82,
      desc:'I cristalli estratti qui alimentano i poteri oscuri dell\'Orda. Distruggili.', reward:{gold:685,wood:165,items:1} },
    { id:'miniere4', zone:'Miniere del Corruttore', name:'Il Guardiano Minerario', km:18, minLevel:83,
      desc:'Un golem di minerale corrotto sorveglia le gallerie principali.', reward:{gold:715,stone:160,items:2} },
    { id:'miniere5', zone:'Miniere del Corruttore', name:'La Trappola Meccanica', km:20, minLevel:83,
      desc:'Le trappole meccaniche delle miniere sono state riattivate dall\'Orda per bloccare il tuo avanzamento.', reward:{gold:730,wood:170,stone:160,items:2} },
    { id:'miniere6', zone:'Miniere del Corruttore', name:'L\'Esplosivo Maledetto', km:15, minLevel:82,
      desc:'L\'Orda ha piazzato esplosivi magici nelle miniere per sigillarne l\'accesso.', reward:{gold:690,stone:160,items:1} },
    { id:'miniere7', zone:'Miniere del Corruttore', name:'Il Minatore Oscuro', km:22, minLevel:84,
      desc:'Un essere di pura corruzione abita le profondità delle miniere. È pericolosissimo.', reward:{gold:755,wood:175,items:2} },
    { id:'miniere8', zone:'Miniere del Corruttore', name:'Il Corruttore delle Miniere', km:25, minLevel:85,
      desc:'Il custode supremo delle miniere oscure: un essere che ha corrotto il suolo stesso.', reward:{gold:800,stone:175,items:3} },
    { id:'miniere9', zone:'Miniere del Corruttore', name:'Il Filone d\'Oro Nero', km:13, minLevel:81,
      desc:'Un filone di minerale rarissimo e oscuro brilla nel fondo di una galleria.', reward:{gold:660,wood:165,items:1} },
  );

  // Missioni extra per Sala del Trono Corrotto (bioma 17, lv 86-90)
  MISSIONS.push(
    { id:'trono2', zone:'Sala del Trono Corrotto', name:'La Guardia Reale Caduta', km:12, minLevel:86,
      desc:'Le guardie reali corrotte difendono l\'ingresso della sala. Spezzane l\'incantesimo.', reward:{gold:695,stone:165,items:1} },
    { id:'trono3', zone:'Sala del Trono Corrotto', name:'Il Trono di Sangue', km:15, minLevel:87,
      desc:'Il trono antico è stato trasformato in uno strumento di corruzione dall\'Orda.', reward:{gold:725,wood:175,items:1} },
    { id:'trono4', zone:'Sala del Trono Corrotto', name:'Il Consiglio dei Corrotti', km:18, minLevel:88,
      desc:'I consiglieri del vecchio re sono stati corrotti uno ad uno. Sconfiggili.', reward:{gold:755,stone:170,items:2} },
    { id:'trono5', zone:'Sala del Trono Corrotto', name:'Il Palazzo Maledetto', km:20, minLevel:88,
      desc:'L\'intero palazzo è avvolto da una maledizione che indebolisce chiunque vi entri.', reward:{gold:770,wood:180,stone:170,items:2} },
    { id:'trono6', zone:'Sala del Trono Corrotto', name:'L\'Araldo del Re', km:15, minLevel:87,
      desc:'L\'araldo del vecchio re porta ancora messaggi tra le rovine del palazzo.', reward:{gold:730,stone:170,items:1} },
    { id:'trono7', zone:'Sala del Trono Corrotto', name:'Il Generale della Corona', km:22, minLevel:89,
      desc:'Il generale più potente dell\'Orda sorveglia la sala del trono.', reward:{gold:795,wood:185,items:2} },
    { id:'trono8', zone:'Sala del Trono Corrotto', name:'Il Re Corrotto', km:25, minLevel:90,
      desc:'Il re del reame, corrotto dall\'Orda, siede ancora sul trono. È quasi ora di affrontarlo.', reward:{gold:840,stone:185,items:3} },
    { id:'trono9', zone:'Sala del Trono Corrotto', name:'I Segreti del Palazzo', km:13, minLevel:86,
      desc:'Nelle stanze segrete del palazzo si nascondono documenti sull\'Orda e i suoi piani.', reward:{gold:700,wood:175,items:1} },
  );

  // Missioni extra per L'Abisso del Vuoto (bioma 18, lv 91-94)
  MISSIONS.push(
    { id:'abisso2', zone:'L\'Abisso del Vuoto', name:'Il Bordo dell\'Abisso', km:12, minLevel:91,
      desc:'Avvicinati al bordo dell\'abisso senza essere risucchiato. Qualcosa ti chiama da là dentro.', reward:{gold:735,stone:175,items:1} },
    { id:'abisso3', zone:'L\'Abisso del Vuoto', name:'Le Creature del Nulla', km:15, minLevel:92,
      desc:'Creature formate dal vuoto stesso emergono dall\'abisso. Respingile.', reward:{gold:765,wood:185,items:1} },
    { id:'abisso4', zone:'L\'Abisso del Vuoto', name:'La Voce del Vuoto', km:18, minLevel:93,
      desc:'Una voce dall\'abisso sussurra i tuoi segreti. Trova chi parla davvero.', reward:{gold:795,stone:180,items:2} },
    { id:'abisso5', zone:'L\'Abisso del Vuoto', name:'Il Portale Oscuro', km:20, minLevel:93,
      desc:'L\'Orda usa un portale nell\'abisso per portare rinforzi. Distruggilo.', reward:{gold:810,wood:190,stone:180,items:2} },
    { id:'abisso6', zone:'L\'Abisso del Vuoto', name:'L\'Eco dell\'Eternità', km:15, minLevel:92,
      desc:'L\'eco del vuoto amplifica il potere dell\'Orda. Interrupi il rituale.', reward:{gold:770,stone:180,items:1} },
    { id:'abisso7', zone:'L\'Abisso del Vuoto', name:'Il Guardiano del Vuoto', km:22, minLevel:94,
      desc:'Un essere eterno sorveglia il cuore dell\'abisso. È il penultimo ostacolo.', reward:{gold:835,wood:195,items:2} },
    { id:'abisso8', zone:'L\'Abisso del Vuoto', name:'La Frattura del Reame', km:25, minLevel:94,
      desc:'L\'abisso si sta espandendo. Sigilla la frattura prima che inghiotta tutto il reame.', reward:{gold:880,stone:195,items:3} },
  );

  // Missioni extra per La Valle dei Cristalli Oscuri (bioma 19, lv 95-100)
  MISSIONS.push(
    { id:'cristalli2', zone:'La Valle dei Cristalli Oscuri', name:'I Cristalli Rivelatori', km:12, minLevel:95,
      desc:'I cristalli della valle rivelano la posizione del Cavaliere del Drago. Leggine i riflessi.', reward:{gold:775,stone:185,items:1} },
    { id:'cristalli3', zone:'La Valle dei Cristalli Oscuri', name:'La Valle Nascosta', km:15, minLevel:96,
      desc:'Un passaggio segreto tra i cristalli porta al cuore della valle dove si prepara la battaglia finale.', reward:{gold:805,wood:195,items:1} },
    { id:'cristalli4', zone:'La Valle dei Cristalli Oscuri', name:'I Custodi Cristallini', km:18, minLevel:97,
      desc:'Guardiani formati da cristallo oscuro proteggono il cammino verso la destinazione finale.', reward:{gold:835,stone:190,items:2} },
    { id:'cristalli5', zone:'La Valle dei Cristalli Oscuri', name:'Il Cristallo Maestro', km:20, minLevel:97,
      desc:'Un cristallo di potere immenso alimenta l\'armatura del Cavaliere. Indeboliscila.', reward:{gold:855,wood:200,stone:195,items:2} },
    { id:'cristalli6', zone:'La Valle dei Cristalli Oscuri', name:'Il Riflesso del Drago', km:15, minLevel:98,
      desc:'I cristalli riflettono l\'immagine del Drago Oscuro. Studia le sue debolezze.', reward:{gold:815,stone:195,items:1} },
    { id:'cristalli7', zone:'La Valle dei Cristalli Oscuri', name:'La Profezia dei Cristalli', km:22, minLevel:98,
      desc:'Una profezia antica incisa nei cristalli rivela il modo per sconfiggere il Cavaliere del Drago.', reward:{gold:875,wood:205,items:2} },
    { id:'cristalli8', zone:'La Valle dei Cristalli Oscuri', name:'Il Sentiero del Cavaliere', km:25, minLevel:99,
      desc:'Il percorso finale verso l\'ultimo scontro. Ogni passo ti avvicina al destino del reame.', reward:{gold:920,stone:210,items:3} },
    { id:'cristalli9', zone:'La Valle dei Cristalli Oscuri', name:'L\'Ultima Porta', km:28, minLevel:100,
      desc:'La porta finale. Oltre di essa il Cavaliere del Drago ti attende. Il destino di Oakhaven è nelle tue mani.', reward:{gold:999,wood:220,stone:220,items:3} },
  );

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
    // ── Rovine di Oakhaven ───────────────────────────────────
    { id: 'goblin-del-focolare', name: 'Goblin del Focolare',   zone: 'Rovine di Oakhaven',
      weakness: 'Fuoco', lore: 'Fruga tra le macerie in cerca di bottini. Odia chi arriva prima di lui.' },
    { id: 'slime-con-il-gilet', name: 'Slime con il Gilet',    zone: 'Rovine di Oakhaven',
      weakness: 'Fulmine', lore: 'Gelatinoso e dispettoso: si infila negli stivali degli avventurieri. Il gilet è elegante, l\'igiene no.' },
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
    { id: 'borsello-ingannevole',   name: 'Borsello Ingannevole',       zone: 'Rovine di Oakhaven',
      weakness: 'Astuzia', lore: 'Sembra un sacchetto di monete. Attira i ladri e li morde. Ha i denti per davvero.' },
    { id: 'busto-brontolone',       name: 'Busto Brontolone',           zone: 'Rovine di Oakhaven',
      weakness: 'Impatto', lore: 'Una statua senza gambe che borbotta insulti dai sotterranei di Oakhaven.' },
    { id: 'gargoyle-imbruttito',    name: 'Gargoyle Imbruttito',        zone: 'Rovine di Oakhaven',
      weakness: 'Luce', lore: 'Era decorativo. Poi l\'Orda lo ha svegliato e lui non era contento di dormire.' },
    { id: 'gargoyle-sgretolato',    name: 'Gargoyle Sgretolato',        zone: 'Rovine di Oakhaven',
      weakness: 'Impatto', lore: 'Ha perso un\'ala ma vola lo stesso. L\'altra è più che sufficiente per colpirti.' },
    { id: 'guardiano-del-cortile',  name: 'Guardiano del Cortile',      zone: 'Rovine di Oakhaven',
      weakness: 'Fuoco', lore: 'Montava la guardia prima che Oakhaven cadesse. Non ha mai smesso. Non lo sa ancora.' },
    { id: 'guerriero-arrugginito',  name: 'Guerriero Arrugginito',      zone: 'Rovine di Oakhaven',
      weakness: 'Acqua', lore: 'L\'armatura cigola a ogni passo. L\'elemento sorpresa è andato, ma la spada no.' },
    { id: 'lanterna-spettrale',     name: 'Lanterna Spettrale',         zone: 'Rovine di Oakhaven',
      weakness: 'Vento', lore: 'Una lanterna senza padrone che vaga tra le macerie. Dove si ferma, il freddo arriva.' },
    { id: 'meridiana-guardiana',    name: 'Meridiana Guardiana',        zone: 'Rovine di Oakhaven',
      weakness: 'Ombra', lore: 'Contava le ore di Oakhaven. Adesso conta le vittime. È più soddisfacente.' },
    { id: 'ratto-coronato',         name: 'Ratto Coronato',             zone: 'Rovine di Oakhaven',
      weakness: 'Gelo', lore: 'Ha trovato una corona tra le macerie e ha deciso di essere re. I topi lo seguono.' },
    { id: 'urna-maledetta',         name: 'Urna Maledetta',             zone: 'Rovine di Oakhaven',
      weakness: 'Luce', lore: 'Non aprirla. Non guardarla. Non starle vicino. Se la senti respirare, corri.' },
    { id: 'scheletro-pazzerello',   name: 'Scheletro Pazzerello',       zone: 'Rovine di Oakhaven',
      weakness: 'Impatto', lore: 'Le sue ossa non stanno mai ferme. Balla, salta, rotola. Colpirlo è la sfida più difficile di Oakhaven.' },

    /* ── Le Pianure del Vento (nuovi) ─────────────────────────── */

    // ── Foresta Sussurrante ────────────────────────────────────
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
    { id: 'orco-urca',           name: 'Orco Urca',             zone: 'Foresta Sussurrante',
      weakness: 'Astuzia', lore: 'Forte come tre buoi, furbo come mezzo. Devasta i sentieri della foresta urlando "URCA" a ogni passo.' },
    { id: 'guerriero-anfibio',   name: 'Guerriero Anfibio',     zone: 'Foresta Sussurrante',
      weakness: 'Gelo', lore: 'Il tridente l\'ha vinto a un torneo di stagno. Gracida prima di caricare.' },
    { id: 'slime-boss',          name: 'Re Slime',              zone: 'Foresta Sussurrante',
      boss: true, mission: 'santuario',
      weakness: 'Fulmine', lore: 'Ha corrotto il Santuario con la sua melma regale. La corona? Rubata, ovvio.' },
    { id: 'orco-capo',           name: 'Generale Orco',         zone: 'Foresta Sussurrante',
      boss: true, mission: 'goblin',
      weakness: 'Fuoco', lore: 'Primo luogotenente dell\'Orda. La sua ascia ha un nome: "Colazione".' },
    { id: 'arciere-demoniaco',       name: 'Arciere Demoniaco',        zone: 'Foresta Sussurrante',
      weakness: 'Luce', lore: 'Scocca frecce di tenebra dalla chioma. I suoi occhi brillano dove la luna non arriva.' },
    { id: 'ser-peonia-la-scorbutica', name: 'Ser Peonia la Scorbutica', zone: 'Foresta Sussurrante',
      weakness: 'Fuoco', lore: 'Un fiore in armatura e di pessimo umore. Non le dire che ha un bel colore: è l\'insulto peggiore.' },
    { id: 'carnivora-sussurrina',    name: 'Carnivora Sussurrina',      zone: 'Foresta Sussurrante',
      weakness: 'Fuoco', lore: 'Attira le prede con un bisbiglio. Nessuno ha mai capito cosa dica… e sopravvissuto.' },
    { id: 'fungo-chierico',          name: 'Fungo Chierico',            zone: 'Foresta Sussurrante',
      weakness: 'Vento', lore: 'Guarisce i suoi alleati con spore benedette. La sua tonaca muffita puzza di sacro.' },
    { id: 'girasole-medievale',      name: 'Girasole Medievale',        zone: 'Foresta Sussurrante',
      weakness: 'Ombra', lore: 'Porta uno scudo di corteccia e non smette mai di fissarti. Nemmeno al buio.' },
    { id: 'goblin-cavalca-cinghiale', name: 'Goblin Cavalca-Cinghiale', zone: 'Foresta Sussurrante',
      weakness: 'Fuoco', lore: 'Il cinghiale è più intelligente di lui, ma lascia guidare lo stesso. Per ora.' },
    { id: 'goblin-della-foresta',    name: 'Goblin della Foresta',      zone: 'Foresta Sussurrante',
      weakness: 'Fuoco', lore: 'Si mimetizza tra i cespugli. La sua risatina lo tradisce da cinquanta passi.' },
    { id: 'il-coccio-stregato',      name: 'Il Coccio Stregato',        zone: 'Foresta Sussurrante',
      weakness: 'Impatto', lore: 'Un vaso antico posseduto da uno spirito dispettoso. Si rompe urlando bestemmie.' },
    { id: 'il-grande-ciocco-fantasma', name: 'Il Grande Ciocco Fantasma', zone: 'Foresta Sussurrante',
      weakness: 'Fuoco', lore: 'Un tronco caduto che non accetta la pensione. Di notte rotola verso il fuoco del campo.' },
    { id: 'muschiotto-appiccicoso',  name: 'Muschiotto Appiccicoso',    zone: 'Foresta Sussurrante',
      weakness: 'Vento', lore: 'Si attacca agli stivali e non vuole staccarsi. Ha colonizzato tre avventurieri.' },
    { id: 'porcino-mimetico',        name: 'Porcino Mimetico',          zone: 'Foresta Sussurrante',
      weakness: 'Astuzia', lore: 'Si finge un fungo commestibile. Chi lo raccoglie capisce l\'errore in fretta.' },
    { id: 'radicone-spaccatutto',    name: 'Radicone Spaccatutto',      zone: 'Foresta Sussurrante',
      weakness: 'Ascia', lore: 'Una radice antica che solleva ponti e fortezze. Beve acqua piovana e risentimento.' },
    { id: 'rodilegno-il-furfante',   name: 'Rodilegno il Furfante',     zone: 'Foresta Sussurrante',
      weakness: 'Fuoco', lore: 'Ha rosicchiato le difese di tre città. Il suo curriculum è impressionante, la sua igiene no.' },
    { id: 'soffietto-larciere',      name: 'Soffietto l\'Arciere',      zone: 'Foresta Sussurrante',
      weakness: 'Impatto', lore: 'Usa un mantice come arco. Le frecce sono chiodi. L\'idea è sua ed è orgoglioso.' },
    { id: 'sventolino-foglialata',   name: 'Sventolino Foglialata',     zone: 'Foresta Sussurrante',
      weakness: 'Fuoco', lore: 'Agita le foglie così forte da creare uragani locali. Il bosco lo evita.' },

    /* ── Il Giardino Lastricato (nuovi) ───────────────────────── */

    // ── Il Giardino Lastricato ──────────────────────────────────
    { id: 'cactus-spadaccino',   name: 'Cactus Spadaccino',     zone: 'Il Giardino Lastricato',
      weakness: 'Gelo', lore: 'Duella con stile. Perdere contro di lui pizzica per una settimana.' },
    { id: 'rovo-spaccapietre',   name: 'Rovo Spaccapietre',     zone: 'Il Giardino Lastricato',
      weakness: 'Fuoco', lore: 'Cresce nella roccia e la frantuma per dispetto. Le lastre del giardino lo temono.' },
    { id: 'golem-dei-tronchi',       name: 'Golem dei Tronchi',         zone: 'Il Giardino Lastricato',
      weakness: 'Fuoco', lore: 'Assemblato dalla foresta stessa come guardiano. Le rune sui tronchi pulsano di verde.' },
    { id: 'lalbero-assassino',       name: 'L\'Albero Assassino',       zone: 'Il Giardino Lastricato',
      weakness: 'Ascia', lore: 'Si è trasferito nel giardino per motivi oscuri. Le lastre del vialetto portano i suoi segni.' },
    { id: 'mandragora-urlante',      name: 'Mandragora Urlante',        zone: 'Il Giardino Lastricato',
      weakness: 'Silenzio', lore: 'Sradicata, urla. Piantata, urla. Di notte urla per allenamento. I vicini si sono trasferiti.' },
    { id: 'pianta-carnivora-imboscata', name: 'Carnivora dell\'Imboscata', zone: 'Il Giardino Lastricato',
      weakness: 'Fuoco', lore: 'Si nasconde tra le aiuole ordinarie del giardino. L\'annaffiatoio accanto è un complice.' },
    { id: 'barbecue-di-pietra', name: 'Barbecue di Pietra', zone: 'Il Giardino Lastricato',
      weakness: 'Acqua', lore: '' },
    { id: 'formica-delle-fessure', name: 'Formica delle Fessure', zone: 'Il Giardino Lastricato',
      weakness: 'Fuoco', lore: '' },
    { id: 'formica-guastatrice', name: 'Formica Guastatrice', zone: 'Il Giardino Lastricato',
      weakness: 'Fuoco', lore: '' },
    { id: 'gargoyle-della-grondaia', name: 'Gargoyle della Grondaia', zone: 'Il Giardino Lastricato',
      weakness: 'Impatto', lore: '' },
    { id: 'gobblestone-saltellante', name: 'Gobblestone Saltellante', zone: 'Il Giardino Lastricato',
      weakness: 'Impatto', lore: '' },
    { id: 'golem-di-lastre-di-pietre', name: 'Golem di Lastre di Pietre', zone: 'Il Giardino Lastricato',
      boss: true,
      weakness: 'Fulmine', lore: '' },
    { id: 'la-gramigna-tenace', name: 'La Gramigna Tenace', zone: 'Il Giardino Lastricato',
      weakness: 'Fuoco', lore: '' },
    { id: 'lucertolone-del-muro', name: 'Lucertolone del Muro', zone: 'Il Giardino Lastricato',
      weakness: 'Gelo', lore: '' },
    { id: 'mietitrice-furiosa', name: 'Mietitrice Furiosa', zone: 'Il Giardino Lastricato',
      weakness: 'Impatto', lore: '' },
    { id: 'mimic-del-baule-da-esterno', name: 'Mimic del Baule da Esterno', zone: 'Il Giardino Lastricato',
      weakness: 'Astuzia', lore: '' },
    { id: 'nano-da-giardino-ribelle', name: 'Nano da Giardino Ribelle', zone: 'Il Giardino Lastricato',
      weakness: 'Astuzia', lore: '' },
    { id: 'siepe-di-bosso-scolpita', name: 'Siepe di Bosso Scolpita', zone: 'Il Giardino Lastricato',
      weakness: 'Fuoco', lore: '' },
    { id: 'spirito-della-fontana', name: 'Spirito della Fontana', zone: 'Il Giardino Lastricato',
      weakness: 'Luce', lore: '' },
    { id: 'vaso-incrinato', name: 'Vaso Incrinato', zone: 'Il Giardino Lastricato',
      weakness: 'Impatto', lore: '' },

    /* ── Il Cimitero dei Draghi (nuovi) ───────────────────────── */

    // ── Le Pianure del Vento ───────────────────────────────────
    { id: 'golem-molla',         name: 'Golem a Molla',         zone: 'Le Pianure del Vento',
      boss: true, mission: 'golem',
      weakness: 'Fulmine', lore: 'Secondo luogotenente dell\'Orda. Marcia tra l\'erba spazzata dal vento: la chiave inglese è sua.' },
    { id: 'drago-komodo',        name: 'Drago di Komodo',       zone: 'Le Pianure del Vento',
      boss: true, mission: 'amuleto',
      weakness: 'Metallo Celeste', lore: 'Cucciolo della stirpe del Drago Antico. Se questo è il cucciolo…' },
    /* ── Foresta Sussurrante (nuovi) ──────────────────────────── */
    { id: 'aquilone-dentato',        name: 'Aquilone Dentato',           zone: 'Le Pianure del Vento',
      weakness: 'Vento', lore: 'Solcava il cielo come un giocattolo innocente. Fino a quando non ha trovato i denti.' },
    { id: 'ariete-delle-tempeste',   name: 'Ariete delle Tempeste',      zone: 'Le Pianure del Vento',
      weakness: 'Gelo', lore: 'Carica a testa bassa durante i temporali. I fulmini lo caricano e lui li ringrazia.' },
    { id: 'bisaccia-famelica',       name: 'Bisaccia Famelica',          zone: 'Le Pianure del Vento',
      weakness: 'Fuoco', lore: 'Il classico zaino dell\'avventuriero, ma con iniziativa propria e appetito infinito.' },
    { id: 'cardo-pugile',            name: 'Cardo Pugile',               zone: 'Le Pianure del Vento',
      weakness: 'Gelo', lore: 'Rotola sulle pianure e mena pugni di spine. Nessuno lo ha mai afferrato due volte.' },
    { id: 'cavaliere-del-mulino',    name: 'Cavaliere del Mulino',       zone: 'Le Pianure del Vento',
      weakness: 'Fuoco', lore: 'Protegge il suo mulino da chiunque si avvicini. I mulini del vento sono suoi per giuramento.' },
    { id: 'elicottero-di-sicomoro',  name: 'Elicottero di Sicomoro',     zone: 'Le Pianure del Vento',
      weakness: 'Fuoco', lore: 'Un seme di sicomoro gigante che rotea a velocità devastante. L\'atterraggio fa male.' },
    { id: 'falco-mascalzone',        name: 'Falco Mascalzone',           zone: 'Le Pianure del Vento',
      weakness: 'Impatto', lore: 'Ruba le provviste degli avventurieri in picchiata. Poi ride. I falchi non ridono, lui sì.' },
    { id: 'gallo-segnavento',        name: 'Gallo Segnavento',           zone: 'Le Pianure del Vento',
      weakness: 'Luce', lore: 'La banderuola si è animata e non sopporta chi non sa da dove soffia il vento.' },
    { id: 'golem-di-paglia',         name: 'Golem di Paglia',            zone: 'Le Pianure del Vento',
      weakness: 'Fuoco', lore: 'Uno spaventapasseri rianimato dall\'energia dell\'Orda. Ora è lui a spaventare.' },
    { id: 'il-mantice-sbuffante-2',  name: 'Il Mantice Sbuffante',       zone: 'Le Pianure del Vento',
      weakness: 'Gelo', lore: 'Un mantice da fabbro fuggito dall\'officina. Soffia vento incandescente e non si ferma.' },
    { id: 'lagguato-di-fieno',       name: 'L\'Agguato di Fieno',        zone: 'Le Pianure del Vento',
      weakness: 'Fuoco', lore: 'Un covone di fieno con secondi fini. Si confonde facilmente con il paesaggio. Troppo facilmente.' },
    { id: 'la-cavalletta-lanciera',  name: 'La Cavalletta Lanciera',     zone: 'Le Pianure del Vento',
      weakness: 'Vento', lore: 'Impugna una lancia di stelo e salta tre volte più in alto di quanto sembri possibile.' },
    { id: 'la-lappola-appiccicosa',  name: 'La Lappola Appiccicosa',     zone: 'Le Pianure del Vento',
      weakness: 'Gelo', lore: 'Si attacca agli stivali, all\'armatura, all\'elmo. Poi inizia a parlare e non smette.' },
    { id: 'la-lucciola-elettrizzata', name: 'La Lucciola Elettrizzata',  zone: 'Le Pianure del Vento',
      weakness: 'Impatto', lore: 'Ha assorbito troppa energia delle tempeste. Adesso illumina e scuote. Male.' },
    { id: 'la-marmotta-scassinatrice', name: 'La Marmotta Scassinatrice', zone: 'Le Pianure del Vento',
      weakness: 'Astuzia', lore: 'Scava tunnel sotto i piedi degli avventurieri. Li svaligia prima che atterrino.' },
    { id: 'lepre-elettrica',         name: 'Lepre Elettrica',            zone: 'Le Pianure del Vento',
      weakness: 'Gelo', lore: 'Corre più veloce del fulmine. Perché lei È il fulmine. Quasi.' },
    { id: 'lo-spirito-dei-rintocchi', name: 'Lo Spirito dei Rintocchi',  zone: 'Le Pianure del Vento',
      weakness: 'Luce', lore: 'Ogni campana abbandonata sulle pianure ha la sua anima. Questa suona a mezzanotte e attacca all\'una.' },
    { id: 'nuvola-brontolona',       name: 'Nuvola Brontolona',          zone: 'Le Pianure del Vento',
      weakness: 'Vento', lore: 'Una nuvola di tempesta con opinioni forti. Non le piace essere ignorata.' },
    { id: 'pipistrello-paffuto',     name: 'Pipistrello Paffuto delle Pianure', zone: 'Le Pianure del Vento',
      weakness: 'Luce', lore: 'Il cugino di campagna del Pipistrello Paffuto. Più lento, più rotondo, più permaloso.' },
    { id: 'rotolacampo-fastidioso',  name: 'Rotolacampo Fastidioso',     zone: 'Le Pianure del Vento',
      weakness: 'Fuoco', lore: 'Un cespuglio secco che rotola sulle pianure e si lancia contro le gambe. Instancabile.' },
    { id: 'soffioni-cattivi',        name: 'Soffioni Cattivi',           zone: 'Le Pianure del Vento',
      weakness: 'Vento', lore: 'I cugini malvagi dei Soffioni Dispettosi della foresta. Esprimere desideri è vietato.' },
    { id: 'spaventapasseri-brontolone', name: 'Spaventapasseri Brontolone', zone: 'Le Pianure del Vento',
      weakness: 'Fuoco', lore: 'Brontola in continuazione ma nessuno lo ascolta. L\'Orda gli ha dato le gambe per farsi sentire.' },
    { id: 'tornadino-furioso',       name: 'Tornadino Furioso',          zone: 'Le Pianure del Vento',
      weakness: 'Gelo', lore: 'Un tornado in miniatura con una personalità enorme. Aspira tutto quello che trova, compreso il tuo orgoglio.' },

    /* ── L'Antico Archivio (nuovi) ────────────────────────────── */

    // ── L'Antico Archivio ─────────────────────────────────────
    { id: 'barone-dellinchiostro',        name: 'Barone dell\'Inchiostro',       zone: 'L\'Antico Archivio',
      weakness: 'Fuoco', lore: 'Governa le sale con un pennino corrosivo. Ogni sua firma cancella un avventuriero dall\'esistenza.' },
    { id: 'cartografo-del-caos',          name: 'Cartografo del Caos',           zone: 'L\'Antico Archivio',
      weakness: 'Astuzia', lore: 'Ridisegna le mappe mentre cammini. Dove indica il nord, c\'è sempre un vicolo cieco.' },
    { id: 'cavaliere-di-ceralacca-oscuro', name: 'Cavaliere di Ceralacca Oscura', zone: 'L\'Antico Archivio',
      weakness: 'Fuoco', lore: 'Sigillato da un\'antica maledizione, custodisce i tomi proibiti con cera nera e spietata precisione.' },
    { id: 'golem-di-pergamena',           name: 'Golem di Pergamena',            zone: 'L\'Antico Archivio',
      weakness: 'Fuoco', lore: 'Costruito con centinaia di manoscritti incantati. Ogni pagina contiene un sortilegio diverso.' },
    { id: 'guerriero-fantasma-archivio',  name: 'Guerriero Fantasma dell\'Archivio', zone: 'L\'Antico Archivio',
      weakness: 'Luce', lore: 'L\'ombra di un bibliotecario caduto in battaglia. Difende i testi con la stessa ferocia di un tempo.' },
    { id: 'spettro-archivio',             name: 'Spettro Archivista',            zone: 'L\'Antico Archivio',
      weakness: 'Luce', lore: 'Vaga tra gli scaffali sussurrando titoli di libri perduti. Disturbare la sua lettura è pericoloso.' },
    { id: 'spirito-del-bibliotecario',    name: 'Spirito del Bibliotecario',     zone: 'L\'Antico Archivio',
      weakness: 'Silenzio', lore: 'Esige silenzio assoluto. Chi parla ad alta voce viene espulso con violenza soprannaturale.' },
    { id: 'tomo-morsicatore',             name: 'Tomo Morsicatore',              zone: 'L\'Antico Archivio',
      weakness: 'Impatto', lore: 'Un libro che ha imparato a mordere. Le pagine taglienti sono la sua arma preferita.' },
    { id: 'astrolabio-maledetto', name: 'Astrolabio Maledetto', zone: 'L\'Antico Archivio',
      weakness: 'Luce', lore: '' },
    { id: 'calamaio-dispettoso', name: 'Calamaio Dispettoso', zone: 'L\'Antico Archivio',
      weakness: 'Fuoco', lore: '' },
    { id: 'candela-dellarchivista', name: 'Candela dell\'Archivista', zone: 'L\'Antico Archivio',
      weakness: 'Vento', lore: '' },
    { id: 'ceralacca-vivente', name: 'Ceralacca Vivente', zone: 'L\'Antico Archivio',
      weakness: 'Fuoco', lore: '' },
    { id: 'gabbia-dei-libri-proibiti', name: 'Gabbia dei Libri Proibiti', zone: 'L\'Antico Archivio',
      weakness: 'Disincanto', lore: '' },
    { id: 'golem-dei-fogli-di-carta', name: 'Golem dei Fogli di Carta', zone: 'L\'Antico Archivio',
      weakness: 'Fuoco', lore: '' },
    { id: 'gran-grimorio-ancestrale', name: 'Gran Grimorio Ancestrale', zone: 'L\'Antico Archivio',
      boss: true,
      weakness: 'Disincanto', lore: '' },
    { id: 'il-mappamondo-incantato', name: 'Il Mappamondo Incantato', zone: 'L\'Antico Archivio',
      weakness: 'Astuzia', lore: '' },
    { id: 'larmadio-dei-manoscritti', name: 'L\'Armadio dei Manoscritti', zone: 'L\'Antico Archivio',
      weakness: 'Fuoco', lore: '' },
    { id: 'la-clessidra-del-tempo-perduto', name: 'La Clessidra del Tempo Perduto', zone: 'L\'Antico Archivio',
      weakness: 'Impatto', lore: '' },
    { id: 'leggio-traballante', name: 'Leggio Traballante', zone: 'L\'Antico Archivio',
      weakness: 'Impatto', lore: '' },
    { id: 'lente-spia', name: 'Lente Spia', zone: 'L\'Antico Archivio',
      weakness: 'Oscurità', lore: '' },
    { id: 'pergamena-volante', name: 'Pergamena Volante', zone: 'L\'Antico Archivio',
      weakness: 'Fuoco', lore: '' },
    { id: 'piuma-doca-gigante', name: 'Piuma d\'Oca Gigante', zone: 'L\'Antico Archivio',
      weakness: 'Fuoco', lore: '' },
    { id: 'ratto-delle-mappe', name: 'Ratto delle Mappe', zone: 'L\'Antico Archivio',
      weakness: 'Gelo', lore: '' },
    { id: 'scala-a-chiocciola-animata', name: 'Scala a Chiocciola Animata', zone: 'L\'Antico Archivio',
      weakness: 'Impatto', lore: '' },
    { id: 'scettro-sigillo-reale', name: 'Scettro Sigillo Reale', zone: 'L\'Antico Archivio',
      boss: true,
      weakness: 'Disincanto', lore: '' },
    { id: 'spettro-del-bibliotecaio', name: 'Spettro del Bibliotecaio', zone: 'L\'Antico Archivio',
      weakness: 'Luce', lore: '' },
    { id: 'statua-del-saggio-di-marmo', name: 'Statua del Saggio di Marmo', zone: 'L\'Antico Archivio',
      weakness: 'Impatto', lore: '' },

    /* ── Le Fognature del Reame ────────────────────────────────── */

    // ── Le Fucine di Ruggine ─────────────────────────────────
    { id: 'cavaliere-dossidiana-e-ruggine', name: 'Cavaliere d\'Ossidiana e Ruggine', zone: 'Le Fucine di Ruggine',
      weakness: 'Acqua', lore: 'Forgiato nelle fiamme più nere. L\'ossidiana lo blindava; la ruggine lo ha reso impazzito.' },
    { id: 'drago-di-ruggine',             name: 'Drago di Ruggine',              zone: 'Le Fucine di Ruggine',
      boss: true,
      weakness: 'Acqua', lore: 'Un drago meccanico corroso che respira vapore arrugginito. Ogni scaglia è una lama.' },
    { id: 'il-bullone-brontolone',        name: 'Il Bullone Brontolone',         zone: 'Le Fucine di Ruggine',
      weakness: 'Impatto', lore: 'Si è staccato da una macchina e non l\'ha presa bene. Rotola e colpisce con rancore.' },
    { id: 'il-golem-a-catena',            name: 'Il Golem a Catena',             zone: 'Le Fucine di Ruggine',
      weakness: 'Fuoco', lore: 'Avvolto da catene incandescenti che usa come fruste. Ogni anello ha un nome inciso.' },
    { id: 'il-golem-di-fusione',          name: 'Il Golem di Fusione',           zone: 'Le Fucine di Ruggine',
      weakness: 'Gelo', lore: 'Assemblato fondendo insieme scarti di dieci golem diversi. Nessuno sa cosa pensi. Nemmeno lui.' },
    { id: 'il-golem-di-scarti',           name: 'Il Golem di Scarti',            zone: 'Le Fucine di Ruggine',
      weakness: 'Fulmine', lore: 'Fatto di pezzi di ricambio che nessuno voleva. Sarà anche brutto, ma è resistente.' },
    { id: 'il-granchio-di-fucina',        name: 'Il Granchio di Fucina',         zone: 'Le Fucine di Ruggine',
      weakness: 'Acqua', lore: 'Vive nei canali di scolo della fucina. Le chele sono ugelli per vapore bollente.' },
    { id: 'il-mantice-sbuffante',         name: 'Il Mantice Sbuffante',          zone: 'Le Fucine di Ruggine',
      weakness: 'Gelo', lore: 'Il mantice originale, rimasto nelle fucine. Soffia fiamme, non vento. La differenza si sente.' },
    { id: 'il-pipistrello-affumicato-2',  name: 'Pipistrello Affumicato',        zone: 'Le Fucine di Ruggine',
      weakness: 'Vento', lore: 'Vive nei camini della fucina da generazioni. Il fumo lo ha reso aggressivo e tossico.' },
    { id: 'il-re-dei-bulloni',            name: 'Il Re dei Bulloni',             zone: 'Le Fucine di Ruggine',
      boss: true,
      weakness: 'Acqua', lore: 'Governa le fucine con pugno di ferro (letteralmente). La corona è saldata al cranio.' },
    { id: 'il-roditore-di-scarti',        name: 'Il Roditore di Scarti',         zone: 'Le Fucine di Ruggine',
      weakness: 'Fuoco', lore: 'Rosicchia metallo come se fosse formaggio. I suoi denti sono più duri dell\'acciaio.' },
    { id: 'il-signore-della-ruggine',     name: 'Il Signore della Ruggine',      zone: 'Le Fucine di Ruggine',
      boss: true,
      weakness: 'Acqua', lore: 'Corrompe ogni metallo che tocca. Le fucine sono sue da quando la ruggine ha vinto sul fuoco.' },
    { id: 'larmatura-abbandonata',        name: 'L\'Armatura Abbandonata',       zone: 'Le Fucine di Ruggine',
      weakness: 'Fulmine', lore: 'Nessuno ricorda il cavaliere che la indossava. L\'armatura sì, e non l\'ha dimenticato.' },
    { id: 'lingranaggio-torcente',        name: 'L\'Ingranaggio Torcente',       zone: 'Le Fucine di Ruggine',
      weakness: 'Impatto', lore: 'Gira sempre, anche quando non dovrebbe. Trascina tutto quello che gli si avvicina.' },
    { id: 'la-pinza-scattante',           name: 'La Pinza Scattante',            zone: 'Le Fucine di Ruggine',
      weakness: 'Gelo', lore: 'Una pinza da fucina diventata autonoma. Scatta senza preavviso e stringe senza mollare.' },
    { id: 'la-pressa-idraulica-furiosa',  name: 'La Pressa Idraulica Furiosa',   zone: 'Le Fucine di Ruggine',
      weakness: 'Fulmine', lore: 'Schiaccia tutto ciò che si trova sotto. Non fa distinzioni tra metallo e avventurieri.' },
    { id: 'la-rana-a-vapore',             name: 'La Rana a Vapore',              zone: 'Le Fucine di Ruggine',
      weakness: 'Gelo', lore: 'Salta emettendo getti di vapore bollente. Le fucine l\'hanno resa più cotta che cruda.' },
    { id: 'la-vite-impazzita',            name: 'La Vite Impazzita',             zone: 'Le Fucine di Ruggine',
      weakness: 'Impatto', lore: 'Ruota a velocità folle e si avvita in tutto. Non c\'è armatura che tenga.' },
    { id: 'lo-sciame-dei-fuligginosi',    name: 'Lo Sciame dei Fuligginosi',     zone: 'Le Fucine di Ruggine',
      weakness: 'Vento', lore: 'Minuscole creature di fuliggine che sciamano dai camini. Insieme formano una nuvola letale.' },
    { id: 'lo-spettro-del-maglio',        name: 'Lo Spettro del Maglio',         zone: 'Le Fucine di Ruggine',
      weakness: 'Luce', lore: 'Il fantasma di un fabbro caduto sul lavoro. Il maglio spettrale non ha mai smesso di battere.' },

    /* ── Il Deserto di Cenere (nuovi) ─────────────────────────── */

    // ── La Torre dell'Alchimista ──────────────────────────────
    { id: 'alambicco-impazzito',          name: 'Alambicco Impazzito',          zone: "La Torre dell'Alchimista",
      weakness: 'Gelo', lore: 'Ha smesso di distillare pozioni utili. Ora produce solo guai fumanti.' },
    { id: 'bolla-di-acido',               name: 'Bolla di Acido',               zone: "La Torre dell'Alchimista",
      weakness: 'Impatto', lore: 'Galleggia silenziosamente nei corridoi. Toccarla è il secondo errore; avvicinarsi è il primo.' },
    { id: 'calderone-ribollente',          name: 'Calderone Ribollente',          zone: "La Torre dell'Alchimista",
      weakness: 'Gelo', lore: 'Non si sa cosa bolle dentro. Chi ha provato a scoprirlo non ha fatto rapporto.' },
    { id: 'errore-di-trasmutazione',       name: 'Errore di Trasmutazione',       zone: "La Torre dell'Alchimista",
      weakness: 'Astuzia', lore: 'L\'esperimento è andato storto. Il risultato è andato peggio.' },
    { id: 'evocatore-oscuro',              name: 'Evocatore Oscuro',              zone: "La Torre dell'Alchimista",
      boss: true,
      weakness: 'Luce', lore: 'Ha studiato la magia nera per decenni. Ora la magia nera studia lui.' },
    { id: 'fiala-dellimmortalita',         name: "Fiala dell'Immortalità",        zone: "La Torre dell'Alchimista",
      weakness: 'Impatto', lore: 'La formula era quasi perfetta. Il piccolo difetto la rende mortale per chiunque la rompa.' },
    { id: 'fungo-alchemico',               name: 'Fungo Alchemico',               zone: "La Torre dell'Alchimista",
      weakness: 'Fuoco', lore: 'Cresce nei laboratori abbandonati assorbendo i residui delle pozioni. Ogni spore è un veleno diverso.' },
    { id: 'gargoyle-di-vetro',             name: 'Gargoyle di Vetro',             zone: "La Torre dell'Alchimista",
      boss: true,
      weakness: 'Impatto', lore: 'Forgiato in un forno alchemico. Trasparente, quasi invisibile, letale.' },
    { id: 'golem-a-molla',                 name: 'Golem a Molla',                 zone: "La Torre dell'Alchimista",
      weakness: 'Fulmine', lore: 'Costruito con pezzi di ricambio e molle recuperate. Non regge la tensione a lungo.' },
    { id: 'golem-di-cristallo',            name: 'Golem di Cristallo',            zone: "La Torre dell'Alchimista",
      weakness: 'Impatto', lore: 'Un golem di cristallo puro, rifrazione di luce e dolore.' },
    { id: 'guardiano-della-torre',         name: 'Guardiano della Torre',         zone: "La Torre dell'Alchimista",
      boss: true,
      weakness: 'Fuoco', lore: 'Rimasto al suo posto quando l\'alchimista è scomparso. Nessuno gli ha detto di smettere.' },
    { id: 'homunculus-fastidioso',         name: 'Homunculus Fastidioso',         zone: "La Torre dell'Alchimista",
      weakness: 'Astuzia', lore: 'Piccolo, orribile, infestante. Ruba ingredienti e sabota esperimenti per puro dispetto.' },
    { id: 'il-grande-alchimista',          name: 'Il Grande Alchimista',          zone: "La Torre dell'Alchimista",
      boss: true,
      weakness: 'Astuzia', lore: 'Non è morto. Si è trasmutato in qualcosa di peggio. La torre è la sua cripta vivente.' },
    { id: 'iride-trasmutante',             name: 'Iride Trasmutante',             zone: "La Torre dell'Alchimista",
      weakness: 'Ombra', lore: 'Cambia forma ogni volta che lo guardi. L\'unica costante è la sua ostilità.' },
    { id: 'libro-dei-segreti',             name: 'Libro dei Segreti',             zone: "La Torre dell'Alchimista",
      weakness: 'Fuoco', lore: 'Ogni pagina è un incantesimo proibito. Si difende con tutto ciò che contiene.' },
    { id: 'marmotta-iraconda',             name: 'Marmotta Iraconda',             zone: "La Torre dell'Alchimista",
      weakness: 'Gelo', lore: 'Era il familiare dell\'alchimista. La solitudine la ha resa irascibile e pericolosa.' },
    { id: 'pozione-acida',                 name: 'Pozione Acida',                 zone: "La Torre dell'Alchimista",
      weakness: 'Acqua', lore: 'Non è una pozione che qualcuno userebbe. È una pozione che userebbe qualcuno su di te.' },
    { id: 'ragno-dambra',                  name: "Ragno d'Ambra",                 zone: "La Torre dell'Alchimista",
      weakness: 'Fuoco', lore: 'Intrappolato nell\'ambra per secoli. Adesso è libero e molto arrabbiato.' },
    { id: 'scrigno-malefico-torre',        name: 'Scrigno Malefico (Torre)',      zone: "La Torre dell'Alchimista",
      weakness: 'Astuzia', lore: 'I forzieri della torre non contengono oro. Contengono problemi.' },
    { id: 'serpente-della-quintaessenza',  name: 'Serpente della Quintaessenza',  zone: "La Torre dell'Alchimista",
      weakness: 'Impatto', lore: 'Distillato di cinque veleni rari. Ogni morso è una combinazione diversa.' },
    { id: 'slime-multicolore',             name: 'Slime Multicolore',             zone: "La Torre dell'Alchimista",
      weakness: 'Gelo', lore: 'Ogni colore corrisponde a un effetto diverso. Nessuno degli effetti è piacevole.' },
    { id: 'stivale-dellapprendista',       name: "Stivale dell'Apprendista",      zone: "La Torre dell'Alchimista",
      weakness: 'Fuoco', lore: 'L\'apprendista se n\'è andato. Lo stivale è rimasto e ha sviluppato opinioni proprie.' },
    { id: 'topo-da-laboratorio',           name: 'Topo da Laboratorio',           zone: "La Torre dell'Alchimista",
      weakness: 'Astuzia', lore: 'Anni di esperimenti lo hanno reso immune a quasi tutto. Quasi.' },
    { id: 'vapore-velenoso',               name: 'Vapore Velenoso',               zone: "La Torre dell'Alchimista",
      weakness: 'Vento', lore: 'Si forma nei condotti della torre. Non lo si vede. Lo si sente solo dopo.' },

    /* ── La Baia del Corallo ─────────────────────────────────── */

    // ── La Cripta dell'Orologiaio ─────────────────────────────
    { id: 'artigliere-scheletrico-del-cannone', name: 'Artigliere Scheletrico del Cannone', zone: 'La Cripta dell\'Orologiaio',
      boss: true,
      weakness: 'Disincanto', lore: '' },
    { id: 'balestriere-meccanico', name: 'Balestriere Meccanico', zone: 'La Cripta dell\'Orologiaio',
      boss: true,
      weakness: 'Disincanto', lore: '' },
    { id: 'cavaliere-a-carica', name: 'Cavaliere a Carica', zone: 'La Cripta dell\'Orologiaio',
      boss: true,
      weakness: 'Disincanto', lore: '' },
    { id: 'drago-degli-ingranaggi-doro', name: 'Drago degli Ingranaggi d\'Oro', zone: 'La Cripta dell\'Orologiaio',
      boss: true,
      weakness: 'Disincanto', lore: '' },
    { id: 'esecutore-delle-12-ore', name: 'Esecutore delle 12 Ore', zone: 'La Cripta dell\'Orologiaio',
      boss: true,
      weakness: 'Disincanto', lore: '' },
    { id: 'fantasma-della-clessidra-spezzata', name: 'Fantasma della Clessidra Spezzata', zone: 'La Cripta dell\'Orologiaio',
      boss: true,
      weakness: 'Disincanto', lore: '' },
    { id: 'grande-orologiaio-automa', name: 'Grande Orologiaio Automa', zone: 'La Cripta dell\'Orologiaio',
      boss: true,
      weakness: 'Disincanto', lore: '' },
    { id: 'signore-delle-clessidre-abissali', name: 'Signore delle Clessidre Abissali', zone: 'La Cripta dell\'Orologiaio',
      boss: true,
      weakness: 'Disincanto', lore: '' },
    { id: 'alchimista-del-tempo', name: 'Alchimista del Tempo', zone: 'La Cripta dell\'Orologiaio',
      weakness: 'Disincanto', lore: '' },
    { id: 'bambola-a-corda-incantata', name: 'Bambola a Corda Incantata', zone: 'La Cripta dell\'Orologiaio',
      weakness: 'Disincanto', lore: '' },
    { id: 'chimera-meccanica', name: 'Chimera Meccanica', zone: 'La Cripta dell\'Orologiaio',
      weakness: 'Disincanto', lore: '' },
    { id: 'custode-delle-serrature', name: 'Custode delle Serrature', zone: 'La Cripta dell\'Orologiaio',
      weakness: 'Disincanto', lore: '' },
    { id: 'gargoyle-ingranato', name: 'Gargoyle Ingranato', zone: 'La Cripta dell\'Orologiaio',
      weakness: 'Disincanto', lore: '' },
    { id: 'goblin-tecnosarto', name: 'Goblin Tecnosarto', zone: 'La Cripta dell\'Orologiaio',
      weakness: 'Disincanto', lore: '' },
    { id: 'golem-delle-clessidre', name: 'Golem delle Clessidre', zone: 'La Cripta dell\'Orologiaio',
      weakness: 'Disincanto', lore: '' },
    { id: 'pendolo-stregato', name: 'Pendolo Stregato', zone: 'La Cripta dell\'Orologiaio',
      weakness: 'Disincanto', lore: '' },
    { id: 'pipistrello-a-molla', name: 'Pipistrello a Molla', zone: 'La Cripta dell\'Orologiaio',
      weakness: 'Disincanto', lore: '' },
    { id: 'ragno-dottone-ingranato', name: 'Ragno d\'Ottone Ingranato', zone: 'La Cripta dell\'Orologiaio',
      weakness: 'Disincanto', lore: '' },
    { id: 'scarabeo-di-bronzo-sigillato', name: 'Scarabeo di Bronzo Sigillato', zone: 'La Cripta dell\'Orologiaio',
      weakness: 'Disincanto', lore: '' },
    { id: 'sentinella-del-pendolo', name: 'Sentinella del Pendolo', zone: 'La Cripta dell\'Orologiaio',
      weakness: 'Disincanto', lore: '' },
    { id: 'topolino-meccanico', name: 'Topolino Meccanico', zone: 'La Cripta dell\'Orologiaio',
      weakness: 'Disincanto', lore: '' },

    /* ── La Valle dei Cristalli Oscuri */

    // ── La Baia del Corallo ──────────────────────────────────
    { id: 'corallo-velenoso',             name: 'Corallo Velenoso',              zone: 'La Baia del Corallo',
      weakness: 'Impatto', lore: 'Sembra bello da toccare. Non toccarlo.' },
    { id: 'delfino-pirata',               name: 'Delfino Pirata',                zone: 'La Baia del Corallo',
      weakness: 'Astuzia', lore: 'Ha perso la sua barca ma non le sue cattive intenzioni.' },
    { id: 'elementale-delle-correnti',    name: 'Elementale delle Correnti',     zone: 'La Baia del Corallo',
      weakness: 'Gelo', lore: 'Le correnti della baia si sono solidificate in una forma malvagia.' },
    { id: 'fantasma-del-marinaio',        name: 'Fantasma del Marinaio',         zone: 'La Baia del Corallo',
      weakness: 'Luce', lore: 'Affondò con la sua nave. Non ha ancora accettato la cosa.' },
    { id: 'gamberetto-armato',            name: 'Gamberetto Armato',             zone: 'La Baia del Corallo',
      weakness: 'Fuoco', lore: 'Indossa un\'armatura di conchiglie. Piccolo, inarrestabile, puntiglioso.' },
    { id: 'goblin-del-reef',              name: 'Goblin del Reef',               zone: 'La Baia del Corallo',
      weakness: 'Astuzia', lore: 'Vive tra le barriere coralline e le saccheggia sistematicamente.' },
    { id: 'granchio-eremita',             name: 'Granchio Eremita',              zone: 'La Baia del Corallo',
      weakness: 'Impatto', lore: 'Ha trovato il guscio perfetto: un\'urna funeraria di un antico re.' },
    { id: 'guerriero-anfibio-baia',       name: 'Guerriero Anfibio (Baia)',      zone: 'La Baia del Corallo',
      weakness: 'Fulmine', lore: 'Combatte altrettanto bene sulla terra che in acqua. Preferisce l\'acqua.' },
    { id: 'il-cavaliere-abissale',        name: 'Il Cavaliere Abissale',         zone: 'La Baia del Corallo',
      boss: true,
      weakness: 'Luce', lore: 'Cavalca le correnti più profonde. La sua armatura è fatta di ossa di balena.' },
    { id: 'il-kraken-giovanotto',         name: 'Il Kraken Giovanotto',          zone: 'La Baia del Corallo',
      boss: true,
      weakness: 'Fulmine', lore: 'Non è ancora adulto. Purtroppo è già grande abbastanza.' },
    { id: 'ippocampo-guerriero',          name: 'Ippocampo Guerriero',           zone: 'La Baia del Corallo',
      weakness: 'Fulmine', lore: 'Ippocampo corazzato addestrato per la guerra subacquea.' },
    { id: 'lumaca-marina',                name: 'Lumaca Marina',                 zone: 'La Baia del Corallo',
      weakness: 'Sale', lore: 'Lenta ma venefica. Il suo bava scioglie le armature.' },
    { id: 'medusa-luminosa',              name: 'Medusa Luminosa',               zone: 'La Baia del Corallo',
      weakness: 'Gelo', lore: 'Brilla nell\'oscurità dei fondali. La luce è un\'esca, i tentacoli sono la risposta.' },
    { id: 'pesce-lanterna',               name: 'Pesce Lanterna',                zone: 'La Baia del Corallo',
      weakness: 'Ombra', lore: 'La lanterna attira curiosi. I denti si occupano del resto.' },
    { id: 'pirata-scheletro',             name: 'Pirata Scheletro',              zone: 'La Baia del Corallo',
      weakness: 'Impatto', lore: 'È morto in mare. Non se n\'è ancora andato dal mare.' },
    { id: 'polpo-dellinchiostro',         name: "Polpo dell'Inchiostro",         zone: 'La Baia del Corallo',
      weakness: 'Luce', lore: 'Il suo inchiostro non offusca la vista: offusca la mente.' },
    { id: 're-del-corallo',               name: 'Re del Corallo',                zone: 'La Baia del Corallo',
      boss: true,
      weakness: 'Impatto', lore: 'Governa i fondali della baia da un trono di corallo nero. Le creature gli obbediscono per paura.' },
    { id: 'riccio-di-mare',               name: 'Riccio di Mare',                zone: 'La Baia del Corallo',
      weakness: 'Impatto', lore: 'Ogni aculeo è avvelenato. E ce ne sono molti.' },
    { id: 'stella-marina-oscura',         name: 'Stella Marina Oscura',          zone: 'La Baia del Corallo',
      weakness: 'Luce', lore: 'Non brilla come le stelle marine normali. Assorbe la luce intorno a sé.' },
    { id: 'tartaruga-corsara',            name: 'Tartaruga Corsara',             zone: 'La Baia del Corallo',
      boss: true,
      weakness: 'Fulmine', lore: 'Il carapace è rinforzato con piastre di metallo rubate dai relitti. Lenta. Inarrestabile.' },
    { id: 'teschio-di-corallo',           name: 'Teschio di Corallo',            zone: 'La Baia del Corallo',
      weakness: 'Impatto', lore: 'Un teschio che si è incrostato di corallo nel corso dei secoli. Conserva ancora i suoi rancori.' },
    { id: 'tritoncino-guastatore',        name: 'Tritoncino Guastatore',         zone: 'La Baia del Corallo',
      weakness: 'Astuzia', lore: 'Piccolo, dispettoso, capace di sabotare qualsiasi imbarcazione in dieci minuti.' },

    /* ── La Palude Nebbiosa ──────────────────────────────────── */

    // ── Il Fossato Profondo ──────────────────────────────────
    { id: 'alghetta-aggrovigliata',      name: 'Alghetta Aggrovigliata',        zone: 'Il Fossato Profondo',
      weakness: 'Fuoco', lore: 'Sembra innocua. Si avvolge attorno alle caviglie e non molla. Riesce a fischiare.' },
    { id: 'bolla-dacqua-maledetta',      name: 'Bolla d\'Acqua Maledetta',      zone: 'Il Fossato Profondo',
      weakness: 'Impatto', lore: 'Una bolla d\'acqua stregata che rimbalza sul pelo del fossato. Scoppia in modo sgradevole.' },
    { id: 'granchio-di-fango',           name: 'Granchio di Fango',             zone: 'Il Fossato Profondo',
      weakness: 'Fuoco', lore: 'Vive nel fango del fossato e lo lancia come proiettile. La mira è sorprendentemente buona.' },
    { id: 'guardiano-delle-acque',       name: 'Guardiano delle Acque',         zone: 'Il Fossato Profondo',
      weakness: 'Fulmine', lore: 'Custodisce il fossato da ere immemorabili. L\'acqua obbedisce ai suoi gesti.' },
    { id: 'guscio-di-lumaca-gigante',    name: 'Guscio di Lumaca Gigante',      zone: 'Il Fossato Profondo',
      weakness: 'Impatto', lore: 'La lumaca se n\'è andata, ma il guscio ha deciso di restare e fare cose.' },
    { id: 'il-fungo-di-palude',          name: 'Il Fungo di Palude',            zone: 'Il Fossato Profondo',
      weakness: 'Fuoco', lore: 'Spore velenose che galleggiano sull\'acqua. Respirare nei pressi del fossato è sconsigliato.' },
    { id: 'il-golem-dei-canneti',        name: 'Il Golem dei Canneti',          zone: 'Il Fossato Profondo',
      weakness: 'Fuoco', lore: 'Assemblato dai canneti del fossato. Cigola. Si piega senza rompersi. Frustra moltissimo.' },
    { id: 'larmatura-affondata',         name: 'L\'Armatura Affondata',         zone: 'Il Fossato Profondo',
      weakness: 'Fulmine', lore: 'Giaceva sul fondo del fossato da secoli. L\'acqua l\'ha animata e lei non è contenta.' },
    { id: 'la-ninfea-carnivora',         name: 'La Ninfea Carnivora',           zone: 'Il Fossato Profondo',
      weakness: 'Fuoco', lore: 'Galleggia come un fiore innocente. I petali si chiudono su chiunque si avvicini.' },
    { id: 'la-regina-delle-rane',        name: 'La Regina delle Rane',          zone: 'Il Fossato Profondo',
      boss: true,
      weakness: 'Gelo', lore: 'Regna sul fossato da un trono di ninfee. I suoi sudditi saltano ai suoi ordini.' },
    { id: 'leviatano-del-fossato',       name: 'Leviatano del Fossato',         zone: 'Il Fossato Profondo',
      boss: true,
      weakness: 'Fulmine', lore: 'Qualcosa di antico si muove nelle profondità. Il fossato non è abbastanza profondo per tenerlo nascosto.' },
    { id: 'mimic-dei-relitti',           name: 'Mimic dei Relitti',             zone: 'Il Fossato Profondo',
      weakness: 'Astuzia', lore: 'Si finge un relitto sul fondo del fossato. Aspetta. Ha tutto il tempo del mondo.' },
    { id: 'pesce-lanterna-brontolone',   name: 'Pesce Lanterna Brontolone',     zone: 'Il Fossato Profondo',
      weakness: 'Ombra', lore: 'Usa la sua lanterna per attirare le prede. Brontola perché nessuno abbocca mai subito.' },
    { id: 'piranha-corazzato',           name: 'Piranha Corazzato',             zone: 'Il Fossato Profondo',
      weakness: 'Impatto', lore: 'Squame di metallo, denti di acciaio. Nell\'acqua è inarrestabile. Fuori dall\'acqua... anche.' },
    { id: 'ranocchio-pantanoso',         name: 'Ranocchio Pantanoso',           zone: 'Il Fossato Profondo',
      weakness: 'Gelo', lore: 'Gracida in continuazione. Il gracidio rallenta chi lo ascolta. Non fermarlo è impossibile.' },
    { id: 'troll-del-ponte',             name: 'Troll del Ponte',               zone: 'Il Fossato Profondo',
      boss: true,
      weakness: 'Astuzia', lore: 'Custodisce l\'unico ponte sul fossato. Vuole un prezzo. Il prezzo non è mai oro.' },

    // ── NUOVI VILLAIN ENTRIES ─────────────────────────────────────────

    /* ── Il Picco Innevato */

    // ── Le Fognature del Reame ───────────────────────────────
    { id: 'idra-di-tubi-e-radici', name: 'Idra di Tubi e Radici', zone: 'Le Fognature del Reame',
      boss: true,
      weakness: 'Fulmine', lore: '' },
    { id: 're-dei-ratti-delle-fognature', name: 'Re dei Ratti delle Fognature', zone: 'Le Fognature del Reame',
      boss: true,
      weakness: 'Fuoco', lore: '' },
    { id: 'candelabro-delle-catacombe', name: 'Candelabro delle Catacombe', zone: 'Le Fognature del Reame',
      weakness: 'Acqua', lore: '' },
    { id: 'coccodrillo-albino', name: 'Coccodrillo Albino', zone: 'Le Fognature del Reame',
      weakness: 'Gelo', lore: '' },
    { id: 'fungo-luminescente', name: 'Fungo Luminescente', zone: 'Le Fognature del Reame',
      weakness: 'Fuoco', lore: '' },
    { id: 'golem-delle-tubature', name: 'Golem delle Tubature', zone: 'Le Fognature del Reame',
      weakness: 'Fulmine', lore: '' },
    { id: 'golem-di-melma', name: 'Golem di Melma', zone: 'Le Fognature del Reame',
      weakness: 'Fuoco', lore: '' },
    { id: 'granchio-dei-fanti', name: 'Granchio dei Fanti', zone: 'Le Fognature del Reame',
      weakness: 'Fulmine', lore: '' },
    { id: 'grata-di-ferro-ribelle', name: 'Grata di Ferro Ribelle', zone: 'Le Fognature del Reame',
      weakness: 'Fulmine', lore: '' },
    { id: 'ingranaggio-arruginito', name: 'Ingranaggio Arruginito', zone: 'Le Fognature del Reame',
      weakness: 'Acqua', lore: '' },
    { id: 'la-botte-affondata', name: 'La Botte Affondata', zone: 'Le Fognature del Reame',
      weakness: 'Fuoco', lore: '' },
    { id: 'la-lampada-delle-fosse', name: 'La Lampada delle Fosse', zone: 'Le Fognature del Reame',
      weakness: 'Acqua', lore: '' },
    { id: 'ratto-della-grata', name: 'Ratto della Grata', zone: 'Le Fognature del Reame',
      weakness: 'Gelo', lore: '' },
    { id: 'sanguisuga-dispettosa', name: 'Sanguisuga Dispettosa', zone: 'Le Fognature del Reame',
      weakness: 'Gelo', lore: '' },
    { id: 'scettro-di-melma-regale', name: 'Scettro di Melma Regale', zone: 'Le Fognature del Reame',
      weakness: 'Fuoco', lore: '' },
    { id: 'slime-di-mela-verde', name: 'Slime di Mela Verde', zone: 'Le Fognature del Reame',
      weakness: 'Fuoco', lore: '' },
    { id: 'spettro-dei-gas-miasmatici', name: 'Spettro dei Gas Miasmatici', zone: 'Le Fognature del Reame',
      weakness: 'Luce', lore: '' },
    { id: 'stivaletto-abbandonato', name: 'Stivaletto Abbandonato', zone: 'Le Fognature del Reame',
      weakness: 'Impatto', lore: '' },
    { id: 'vaso-di-scarico-corrotto', name: 'Vaso di Scarico Corrotto', zone: 'Le Fognature del Reame',
      weakness: 'Disincanto', lore: '' },
    { id: 'zanzara-delle-fosse', name: 'Zanzara delle Fosse', zone: 'Le Fognature del Reame',
      weakness: 'Fuoco', lore: '' },

    /* ── Le Fucine di Ruggine (nuovi) ─────────────────────────── */

    // ── La Costa del Relitto ─────────────────────────────────
    { id: 'cucciolo-di-kraken', name: 'Cucciolo di Kraken', zone: 'La Costa del Relitto',
      boss: true,
      weakness: 'Fulmine', lore: '' },
    { id: 'gabbiano-predatore-maledetto', name: 'Gabbiano Predatore Maledetto', zone: 'La Costa del Relitto',
      boss: true,
      weakness: 'Fulmine', lore: '' },
    { id: 'idra-delle-fosse-abissali', name: 'Idra delle Fosse Abissali', zone: 'La Costa del Relitto',
      boss: true,
      weakness: 'Fulmine', lore: '' },
    { id: 'leviatano-delle-scogliere', name: 'Leviatano delle Scogliere', zone: 'La Costa del Relitto',
      boss: true,
      weakness: 'Fulmine', lore: '' },
    { id: 'mano-tentacolare-del-prodondo', name: 'Mano Tentacolare del Profondo', zone: 'La Costa del Relitto',
      boss: true,
      weakness: 'Fulmine', lore: '' },
    { id: 're-granchio-reale', name: 'Re Granchio Reale', zone: 'La Costa del Relitto',
      boss: true,
      weakness: 'Fulmine', lore: '' },
    { id: 'capitano-del-galeone', name: 'Capitano del Galeone', zone: 'La Costa del Relitto',
      weakness: 'Fulmine', lore: '' },
    { id: 'capitano-olandese-spettrale', name: 'Capitano Olandese Spettrale', zone: 'La Costa del Relitto',
      weakness: 'Fulmine', lore: '' },
    { id: 'corsaro-fantasma-senza-testa', name: 'Corsaro Fantasma Senza Testa', zone: 'La Costa del Relitto',
      weakness: 'Fulmine', lore: '' },
    { id: 'elementale-della-vasca', name: 'Elementale della Vasca', zone: 'La Costa del Relitto',
      weakness: 'Fulmine', lore: '' },
    { id: 'goblinoide-delle-maree', name: 'Goblinoide delle Maree', zone: 'La Costa del Relitto',
      weakness: 'Fulmine', lore: '' },
    { id: 'golem-di-scogli', name: 'Golem di Scogli', zone: 'La Costa del Relitto',
      weakness: 'Fulmine', lore: '' },
    { id: 'granchio-del-pirata-corazzato', name: 'Granchio del Pirata Corazzato', zone: 'La Costa del Relitto',
      weakness: 'Fulmine', lore: '' },
    { id: 'guerriero-squalomartello', name: 'Guerriero Squalomartello', zone: 'La Costa del Relitto',
      weakness: 'Fulmine', lore: '' },
    { id: 'medusa-elettrica-del-relitto', name: 'Medusa Elettrica del Relitto', zone: 'La Costa del Relitto',
      weakness: 'Fulmine', lore: '' },
    { id: 'naga-dei-coralli', name: 'Naga dei Coralli', zone: 'La Costa del Relitto',
      weakness: 'Fulmine', lore: '' },
    { id: 'ombra-temporale', name: 'Ombra Temporale', zone: 'La Costa del Relitto',
      weakness: 'Fulmine', lore: '' },
    { id: 'piranha-volante-degli-abissali', name: 'Piranha Volante degli Abissali', zone: 'La Costa del Relitto',
      weakness: 'Fulmine', lore: '' },
    { id: 'scheletro-del-mozzo-affogato', name: 'Scheletro del Mozzo Affogato', zone: 'La Costa del Relitto',
      weakness: 'Fulmine', lore: '' },
    { id: 'sirena-maledetta-delle-tempeste', name: 'Sirena Maledetta delle Tempeste', zone: 'La Costa del Relitto',
      weakness: 'Fulmine', lore: '' },
    { id: 'sirenetto-dacqua-dolce', name: 'Sirenetto d\'Acqua Dolce', zone: 'La Costa del Relitto',
      weakness: 'Fulmine', lore: '' },
    { id: 'tritone-corazzato', name: 'Tritone Corazzato', zone: 'La Costa del Relitto',
      weakness: 'Fulmine', lore: '' },

    /* ── La Cripta dell'Orologiaio */

    // ── Il Picco Innevato ───────────────────────────────────
    { id: 'golem-di-ghiaccio-e-roccia', name: 'Golem di Ghiaccio e Roccia', zone: 'Il Picco Innevato',
      boss: true,
      weakness: 'Fuoco', lore: '' },
    { id: 'il-drago-della-bufera-glaciale', name: 'Il Drago della Bufera Glaciale', zone: 'Il Picco Innevato',
      boss: true,
      weakness: 'Fuoco', lore: '' },
    { id: 'la-corona-del-ghiaccio-ancestrale', name: 'La Corona del Ghiaccio Ancestrale', zone: 'Il Picco Innevato',
      boss: true,
      weakness: 'Fuoco', lore: '' },
    { id: 'lo-scettro-del-re-delle-nevi', name: 'Lo Scettro del Re delle Nevi', zone: 'Il Picco Innevato',
      boss: true,
      weakness: 'Fuoco', lore: '' },
    { id: 'civetta-delle-torri-innevate', name: 'Civetta delle Torri Innevate', zone: 'Il Picco Innevato',
      weakness: 'Fuoco', lore: '' },
    { id: 'cristallo-di-frostmagia', name: 'Cristallo di Frostmagia', zone: 'Il Picco Innevato',
      weakness: 'Fuoco', lore: '' },
    { id: 'forziere-congelato', name: 'Forziere Congelato', zone: 'Il Picco Innevato',
      weakness: 'Fuoco', lore: '' },
    { id: 'lancora-dei-ghiacci', name: 'L\'Ancora dei Ghiacci', zone: 'Il Picco Innevato',
      weakness: 'Fuoco', lore: '' },
    { id: 'larmatura-del-cavaliere-congelata', name: 'L\'Armatura del Cavaliere Congelata', zone: 'Il Picco Innevato',
      weakness: 'Fuoco', lore: '' },
    { id: 'lepre-messaggera-delle-nevi', name: 'Lepre Messaggera delle Nevi', zone: 'Il Picco Innevato',
      weakness: 'Fuoco', lore: '' },
    { id: 'lo-yeti-brontolone', name: 'Lo Yeti Brontolone', zone: 'Il Picco Innevato',
      weakness: 'Fuoco', lore: '' },
    { id: 'lupetto-dei-ghiacci', name: 'Lupetto dei Ghiacci', zone: 'Il Picco Innevato',
      weakness: 'Fuoco', lore: '' },
    { id: 'palla-di-neve-dispettosa', name: 'Palla di Neve Dispettosa', zone: 'Il Picco Innevato',
      weakness: 'Fuoco', lore: '' },
    { id: 'pinguino-scudiero', name: 'Pinguino Scudiero', zone: 'Il Picco Innevato',
      weakness: 'Fuoco', lore: '' },
    { id: 'pino-innevato-sentinella', name: 'Pino Innevato Sentinella', zone: 'Il Picco Innevato',
      weakness: 'Fuoco', lore: '' },
    { id: 'pupazzo-brontolone', name: 'Pupazzo Brontolone', zone: 'Il Picco Innevato',
      weakness: 'Fuoco', lore: '' },
    { id: 'slime-di-slush-glaciale', name: 'Slime di Slush Glaciale', zone: 'Il Picco Innevato',
      weakness: 'Fuoco', lore: '' },
    { id: 'spettro-della-bufera', name: 'Spettro della Bufera', zone: 'Il Picco Innevato',
      weakness: 'Fuoco', lore: '' },
    { id: 'stalattite-spada', name: 'Stalattite Spada', zone: 'Il Picco Innevato',
      weakness: 'Fuoco', lore: '' },
    { id: 'tappeto-di-pelliccia-alato', name: 'Tappeto di Pelliccia Alato', zone: 'Il Picco Innevato',
      weakness: 'Fuoco', lore: '' },

    /* ── L'Abisso del Vuoto */

    // ── Il Deserto di Cenere ─────────────────────────────────
    { id: 'cactus-di-pietra-nera',       name: 'Cactus di Pietra Nera',         zone: 'Il Deserto di Cenere',
      weakness: 'Acqua', lore: 'Le spine sono schegge di ossidiana. Nemmeno il fuoco lo scalfisce: era già nel fuoco.' },
    { id: 'golem-di-basalto',            name: 'Golem di Basalto',              zone: 'Il Deserto di Cenere',
      weakness: 'Acqua', lore: 'Solidificato dalla lava del cratere. Ogni suo passo lascia impronte bruciate nella cenere.' },
    { id: 'granchio-di-ossidiana',       name: 'Granchio di Ossidiana',         zone: 'Il Deserto di Cenere',
      weakness: 'Impatto', lore: 'Le chele sono lame di vetro vulcanico. Taglienti, fragili, e ce ne sono molte.' },
    { id: 'il-cavaliere-di-vetro',       name: 'Il Cavaliere di Vetro',         zone: 'Il Deserto di Cenere',
      weakness: 'Impatto', lore: 'Un cavaliere forgiato nel vetro vulcanico. Sembra fragile. Non lo è. Non abbastanza.' },
    { id: 'il-millepiedi-rovente',       name: 'Il Millepiedi Rovente',         zone: 'Il Deserto di Cenere',
      weakness: 'Gelo', lore: 'Striscia sotto la cenere calda e affiora sotto i piedi. I mille piedi lasciano mille ustioni.' },
    { id: 'il-pipistrello-affumicato',   name: 'Il Pipistrello Affumicato',     zone: 'Il Deserto di Cenere',
      weakness: 'Vento', lore: 'Vola tra i pennacchi di fumo del cratere. Il fumo è il suo habitat. E la sua arma.' },
    { id: 'il-signore-del-cratere',      name: 'Il Signore del Cratere',        zone: 'Il Deserto di Cenere',
      boss: true,
      weakness: 'Acqua', lore: 'Emerge dal cratere nelle notti di luna piena. Il deserto di cenere è la sua corona.' },
    { id: 'il-vortice-di-fuliggine',     name: 'Il Vortice di Fuliggine',       zone: 'Il Deserto di Cenere',
      weakness: 'Vento', lore: 'Un tornado di cenere e fuliggine che non si ferma mai. Tutto ciò che tocca diventa grigio.' },
    { id: 'lavvoltoio-delle-polveri',    name: 'L\'Avvoltoio delle Polveri',    zone: 'Il Deserto di Cenere',
      weakness: 'Vento', lore: 'Sorvola il deserto in cerca di qualcosa che si muova. La cenere non lo confonde. Te sì.' },
    { id: 'la-roccia-ingannevole',       name: 'La Roccia Ingannevole',         zone: 'Il Deserto di Cenere',
      weakness: 'Astuzia', lore: 'Sembra una roccia. Non è una roccia. Lo capisci quando si muove.' },
    { id: 'lo-scarabeo-carbonella',      name: 'Lo Scarabeo Carbonella',        zone: 'Il Deserto di Cenere',
      weakness: 'Acqua', lore: 'Rotola sfere di cenere compatta come proiettili. La traiettoria è imprevedibile.' },
    { id: 'lo-slime-di-cenere',          name: 'Lo Slime di Cenere',            zone: 'Il Deserto di Cenere',
      weakness: 'Acqua', lore: 'Gelatina grigia che assorbe tutto ciò che tocca. È più caldo di quanto sembri.' },
    { id: 'lo-slime-tizzone',            name: 'Lo Slime Tizzone',              zone: 'Il Deserto di Cenere',
      weakness: 'Acqua', lore: 'Un tizzone ardente intrappolato in una massa gelatinosa. Brucia e appiccica insieme.' },
    { id: 'lo-spirito-del-cratere',      name: 'Lo Spirito del Cratere',        zone: 'Il Deserto di Cenere',
      weakness: 'Luce', lore: 'L\'eco di un\'eruzione antica rimasta intrappolata nel vapore del cratere.' },
    { id: 'rana-magmatica',              name: 'Rana Magmatica',                zone: 'Il Deserto di Cenere',
      weakness: 'Gelo', lore: 'Salta da una pozza di lava all\'altra. La lingua è incandescente e raggiunge lontano.' },
    { id: 'rotolacenere',                name: 'Rotolacenere',                  zone: 'Il Deserto di Cenere',
      weakness: 'Vento', lore: 'Un ammasso di cenere compressa che rotola nel deserto. Più colpisce, più cresce.' },
    { id: 'salamandra-sputascintille',   name: 'Salamandra Sputascintille',     zone: 'Il Deserto di Cenere',
      weakness: 'Gelo', lore: 'Sputa scintille a raffica. Ogni scaglia è un innesco. Non le piaciono le correnti d\'aria.' },
    { id: 'scorpione-cinereo',           name: 'Scorpione Cinereo',             zone: 'Il Deserto di Cenere',
      weakness: 'Gelo', lore: 'Si mimetizza perfettamente nella cenere. Il pungiglione rilascia veleno termico.' },
    { id: 'tronco-bruciacchiato',        name: 'Tronco Bruciacchiato',          zone: 'Il Deserto di Cenere',
      weakness: 'Acqua', lore: 'Un albero carbonizzato rianimato. Porta ancora i segni dell\'incendio che lo ha creato.' },

    /* ── Il Fossato Profondo (nuovi) ──────────────────────────── */

    // ── La Palude Nebbiosa ──────────────────────────────────
    { id: 'ceppo-maledetto',              name: 'Ceppo Maledetto',               zone: 'La Palude Nebbiosa',
      weakness: 'Fuoco', lore: 'Sembra un semplice ceppo marcio. Non è un semplice ceppo marcio.' },
    { id: 'coccodrillo-nebbioso',         name: 'Coccodrillo Nebbioso',          zone: 'La Palude Nebbiosa',
      weakness: 'Fuoco', lore: 'Si mimetizza nella nebbia. Il primo segnale della sua presenza è di solito l\'ultimo.' },
    { id: 'corvo-del-pantano',            name: 'Corvo del Pantano',             zone: 'La Palude Nebbiosa',
      weakness: 'Luce', lore: 'Porta messaggi nella palude. Nessuno sa per chi.' },
    { id: 'fantasma-annegato',            name: 'Fantasma Annegato',             zone: 'La Palude Nebbiosa',
      weakness: 'Luce', lore: 'Annegò nella palude decenni fa. Ora vuole compagnia.' },
    { id: 'fungo-delle-anime',            name: 'Fungo delle Anime',             zone: 'La Palude Nebbiosa',
      weakness: 'Fuoco', lore: 'Cresce sulle tombe sommerse. Ogni spore porta un frammento di chi riposava lì sotto.' },
    { id: 'fungo-mago-velenoso-palude',   name: 'Fungo Mago Velenoso (Palude)',  zone: 'La Palude Nebbiosa',
      weakness: 'Fuoco', lore: 'L\'umidità della palude lo ha reso ancora più velenoso del solito. Non era possibile, eppure.' },
    { id: 'golem-di-fango',               name: 'Golem di Fango',                zone: 'La Palude Nebbiosa',
      weakness: 'Fuoco', lore: 'Si forma spontaneamente nelle zone più fangose. Non ha cervello ma ha abbastanza rabbia.' },
    { id: 'il-guardiano-delle-nebbie',    name: 'Il Guardiano delle Nebbie',     zone: 'La Palude Nebbiosa',
      boss: true,
      weakness: 'Luce', lore: 'È la nebbia stessa, condensata in forma. O così dicono quelli che lo hanno visto e sono sopravvissuti.' },
    { id: 'la-strega-del-pantano',        name: 'La Strega del Pantano',         zone: 'La Palude Nebbiosa',
      boss: true,
      weakness: 'Fuoco', lore: 'Vive nella palude da così tanto tempo che la palude è diventata lei.' },
    { id: 'larva-gigante',                name: 'Larva Gigante',                 zone: 'La Palude Nebbiosa',
      weakness: 'Sale', lore: 'Si nutre di materia organica in decomposizione. Nella palude, il cibo non manca.' },
    { id: 'lucciola-del-male',            name: 'Lucciola del Male',             zone: 'La Palude Nebbiosa',
      weakness: 'Ombra', lore: 'La sua luce guida i viandanti verso le zone più pericolose della palude.' },
    { id: 'nebbia-vivente',               name: 'Nebbia Vivente',                zone: 'La Palude Nebbiosa',
      boss: true,
      weakness: 'Fuoco', lore: 'Non è nebbia. Non è un mostro. È qualcosa di peggio: nebbia con intenzioni.' },
    { id: 'orchessa-della-palude',        name: 'Orchessa della Palude',         zone: 'La Palude Nebbiosa',
      weakness: 'Fuoco', lore: 'Più grande e più arrabbiata di un orco normale. L\'umidità la irrita.' },
    { id: 'pianta-carnivora-nebbiosa',    name: 'Pianta Carnivora Nebbiosa',     zone: 'La Palude Nebbiosa',
      weakness: 'Fuoco', lore: 'Si nasconde nella nebbia e aspetta. Ha tutto il tempo del mondo.' },
    { id: 'rana-velenosa-corazzata',      name: 'Rana Velenosa Corazzata',       zone: 'La Palude Nebbiosa',
      weakness: 'Impatto', lore: 'La corazza non rallenta i salti. Il veleno non rallenta niente.' },
    { id: 'sanguisuga-gigante',           name: 'Sanguisuga Gigante',            zone: 'La Palude Nebbiosa',
      weakness: 'Sale', lore: 'Lunga quanto un uomo è alto. Si attacca e non molla finché non ottiene ciò che vuole.' },
    { id: 'scheletro-del-pantano',        name: 'Scheletro del Pantano',         zone: 'La Palude Nebbiosa',
      weakness: 'Impatto', lore: 'Le ossa sono incrostate di fango. Non si vede bene nella nebbia. È intenzionale.' },
    { id: 'serpente-di-melma',            name: 'Serpente di Melma',             zone: 'La Palude Nebbiosa',
      weakness: 'Gelo', lore: 'Striscia nella melma senza fare rumore. Il veleno è meno pericoloso della melma stessa.' },
    { id: 'spirito-del-pantano',          name: 'Spirito del Pantano',           zone: 'La Palude Nebbiosa',
      weakness: 'Luce', lore: 'Un\'eco di qualcuno che cercava di uscire dalla palude. Non ci è riuscito.' },
    { id: 'teschio-del-pantano',          name: 'Teschio del Pantano',           zone: 'La Palude Nebbiosa',
      weakness: 'Luce', lore: 'Galleggia nella nebbia. Ride sempre. Nessuno sa perché.' },

    /* ── La Vetta Oscura — nemesi finale ───────────────────────── */

    // ── Il Cimitero dei Draghi ───────────────────────────────
    { id: 'artiglio-strisciante',    name: 'Artiglio Strisciante',      zone: 'Il Cimitero dei Draghi',
      weakness: 'Luce', lore: 'Una zampa draconika recisa che rifiuta di restare ferma. La direzione è sempre verso di te.' },
    { id: 'cucciolo-zombificato',    name: 'Cucciolo Zombificato',       zone: 'Il Cimitero dei Draghi',
      weakness: 'Luce', lore: 'Era adorabile. Poi l\'Orda l\'ha trovato. Adesso è ancora adorabile, ma morde diversamente.' },
    { id: 'dente-saltellante',       name: 'Dente Saltellante',          zone: 'Il Cimitero dei Draghi',
      weakness: 'Impatto', lore: 'Un dente di drago caduto che salta tra le ossa. Non si sa cosa voglia. Non si vuole sapere.' },
    { id: 'elementale-del-respiro',  name: 'Elementale del Respiro',     zone: 'Il Cimitero dei Draghi',
      weakness: 'Gelo', lore: 'L\'ultimo respiro di un drago, condensato in forma. Brucia ancora dopo mille anni.' },
    { id: 'fiore-di-cenere',         name: 'Fiore di Cenere',            zone: 'Il Cimitero dei Draghi',
      weakness: 'Vento', lore: 'Sboccia sulle pire dei draghi. I suoi petali scottano e lasciano il segno per settimane.' },
    { id: 'fuoco-fatuo-draconico',   name: 'Fuoco Fatuo Draconico',      zone: 'Il Cimitero dei Draghi',
      weakness: 'Gelo', lore: 'Una fiamma che danza tra le ossa draconiche. Chi la segue non torna.' },
    { id: 'golem-di-scaglie',        name: 'Golem di Scaglie',           zone: 'Il Cimitero dei Draghi',
      weakness: 'Impatto', lore: 'Costruito con le squame di cento draghi. Ogni pezzo porta la memoria di una battaglia.' },
    { id: 'il-cavaliere-spettrale',  name: 'Il Cavaliere Spettrale',     zone: 'Il Cimitero dei Draghi',
      weakness: 'Luce', lore: 'Un cavaliere caduto a guardia del cimitero. La lancia spettrale non ha mai perso un colpo.' },
    { id: 'il-cristallo-di-sangue',  name: 'Il Cristallo di Sangue',     zone: 'Il Cimitero dei Draghi',
      weakness: 'Impatto', lore: 'Cristallizzazione dell\'energia draconika. Pulsa come un cuore. Meglio non chiederti di chi.' },
    { id: 'il-ratto-teschio',        name: 'Il Ratto Teschio',           zone: 'Il Cimitero dei Draghi',
      weakness: 'Fuoco', lore: 'Vive tra le ossa del cimitero e le ruba per costruire il suo nido. Ha gusto pessimo.' },
    { id: 'il-sovrano-del-cimitero', name: 'Il Sovrano del Cimitero',    zone: 'Il Cimitero dei Draghi',
      boss: true,
      weakness: 'Luce', lore: 'Governa il cimitero dei draghi da ere immemorabili. La corona è un cranio. Vero.' },
    { id: 'lavvoltoio-paffuto',      name: 'L\'Avvoltoio Paffuto',       zone: 'Il Cimitero dei Draghi',
      weakness: 'Vento', lore: 'Troppo grasso per volare dritto. Si butta in picchiata e spera nel meglio.' },
    { id: 'la-costola-zoppicante',   name: 'La Costola Zoppicante',      zone: 'Il Cimitero dei Draghi',
      weakness: 'Impatto', lore: 'Una costola draconika animata che avanza di lato. Zig-zag l\'ha salvata molte volte.' },
    { id: 'lo-scavatore-squamato',   name: 'Lo Scavatore Squamato',      zone: 'Il Cimitero dei Draghi',
      weakness: 'Luce', lore: 'Scava tra le ossa in cerca di frammenti di potere. Le sue unghie non si logorano mai.' },
    { id: 'mimic',                   name: 'Mimic del Cimitero',         zone: 'Il Cimitero dei Draghi',
      weakness: 'Astuzia', lore: 'Si finge un forziere di ossa draconiche. La dentatura da quattro centimetri lo tradisce.' },
    { id: 'pipistrello-fumogeno',    name: 'Pipistrello Fumogeno',       zone: 'Il Cimitero dei Draghi',
      weakness: 'Luce', lore: 'Emette fumo nero quando è spaventato. Il cimitero è perennemente avvolto nella nebbia.' },
    { id: 'principe-dosso',          name: 'Principe Dosso',             zone: 'Il Cimitero dei Draghi',
      weakness: 'Fuoco', lore: 'Si crede il re del cimitero. Il Sovrano lo tollera perché porta i viveri.' },
    { id: 'scorpione-dosso',         name: 'Scorpione Dosso',            zone: 'Il Cimitero dei Draghi',
      weakness: 'Gelo', lore: 'Il veleno nel pungiglione è estratto da ossa draconiche. Una puntura e si vedono le stelle.' },
    { id: 'teschietto-sputafuoco',   name: 'Teschietto Sputafuoco',      zone: 'Il Cimitero dei Draghi',
      weakness: 'Gelo', lore: 'Piccolo ma determinato. Sputa fuoco ogni tre secondi anche quando non serve.' },
    { id: 'ultimo-guerriero-del-re-dragone', name: 'L\'Ultimo Guerriero del Re Dragone', zone: 'Il Cimitero dei Draghi',
      boss: true,
      weakness: 'Luce', lore: 'Il solo sopravvissuto dell\'esercito del Re Dragone. Custodisce il cimitero da secoli di solitudine.' },
    { id: 'uovo-fossile-maledetto',  name: 'Uovo Fossile Maledetto',     zone: 'Il Cimitero dei Draghi',
      weakness: 'Fuoco', lore: 'Un uovo draconico che non si è mai schiuso. L\'energia maledetta all\'interno ha preso vita.' },

    /* ── Rovine di Oakhaven (nuovi) ───────────────────────────── */

    // ── Miniere del Corruttore ───────────────────────────────
    { id: 'il-custode-dellascensore', name: 'Il Custode dell\'Ascensore', zone: 'Miniere del Corruttore',
      boss: true,
      weakness: 'Purezza', lore: '' },
    { id: 'il-drago-delle-profondit', name: 'Il Drago delle Profondità', zone: 'Miniere del Corruttore',
      boss: true,
      weakness: 'Purezza', lore: '' },
    { id: 'statua-del-minatore-caduto', name: 'Statua del Minatore Caduto', zone: 'Miniere del Corruttore',
      boss: true,
      weakness: 'Purezza', lore: '' },
    { id: 'golem-del-cancello', name: 'Golem del Cancello', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },
    { id: 'il-carrello-impazzito', name: 'Il Carrello Impazzito', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },
    { id: 'il-caschetto-spia', name: 'Il Caschetto Spia', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },
    { id: 'il-geode-corazzato', name: 'Il Geode Corazzato', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },
    { id: 'il-golem-di-cristallo-infetto', name: 'Il Golem di Cristallo Infetto', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },
    { id: 'il-piccone-corrotto', name: 'Il Piccone Corrotto', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },
    { id: 'il-pipistrello-di-cristallo', name: 'Il Pipistrello di Cristallo', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },
    { id: 'il-ratto-delle-gallerie', name: 'Il Ratto delle Gallerie', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },
    { id: 'il-setaccio-dispettoso', name: 'Il Setaccio Dispettoso', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },
    { id: 'la-dinamite-accesa', name: 'La Dinamite Accesa', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },
    { id: 'la-lanterna-cieca', name: 'La Lanterna Cieca', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },
    { id: 'la-talpa-scavatrice', name: 'La Talpa Scavatrice', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },
    { id: 'la-trivella-corrotta', name: 'La Trivella Corrotta', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },
    { id: 'larpione-da-scavo', name: 'L\'Arpione da Scavo', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },
    { id: 'lo-scettro-di-cristallo', name: 'Lo Scettro di Cristallo', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },
    { id: 'lo-slime-di-carbone', name: 'Lo Slime di Carbone', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },
    { id: 'lo-spettro-dello-scavo', name: 'Lo Spettro dello Scavo', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },
    { id: 'mimic-del-filone-doro', name: 'Mimic del Filone d\'Oro', zone: 'Miniere del Corruttore',
      weakness: 'Purezza', lore: '' },

    /* ── Sala del Trono Corrotto */

    // ── Sala del Trono Corrotto ──────────────────────────────
    { id: 'candeliere-infestato', name: 'Candeliere Infestato', zone: 'Sala del Trono Corrotto',
      boss: true,
      weakness: 'Giustizia', lore: '' },
    { id: 'cavaliere-spettrale', name: 'Cavaliere Spettrale', zone: 'Sala del Trono Corrotto',
      boss: true,
      weakness: 'Giustizia', lore: '' },
    { id: 'giullare-esplosivo', name: 'Giullare Esplosivo', zone: 'Sala del Trono Corrotto',
      boss: true,
      weakness: 'Giustizia', lore: '' },
    { id: 'il-boia-di-ferro', name: 'Il Boia di Ferro', zone: 'Sala del Trono Corrotto',
      boss: true,
      weakness: 'Giustizia', lore: '' },
    { id: 'il-consigliere-traditore', name: 'Il Consigliere Traditore', zone: 'Sala del Trono Corrotto',
      boss: true,
      weakness: 'Giustizia', lore: '' },
    { id: 'il-giullare-ombra', name: 'Il Giullare Ombra', zone: 'Sala del Trono Corrotto',
      boss: true,
      weakness: 'Giustizia', lore: '' },
    { id: 'il-re-corrotto', name: 'Il Re Corrotto', zone: 'Sala del Trono Corrotto',
      boss: true,
      weakness: 'Giustizia', lore: '' },
    { id: 'lo-scrigno-regale', name: 'Lo Scrigno Regale', zone: 'Sala del Trono Corrotto',
      boss: true,
      weakness: 'Giustizia', lore: '' },
    { id: 'il-calice-velenoso', name: 'Il Calice Velenoso', zone: 'Sala del Trono Corrotto',
      weakness: 'Giustizia', lore: '' },
    { id: 'il-lampadario-cadente', name: 'Il Lampadario Cadente', zone: 'Sala del Trono Corrotto',
      weakness: 'Giustizia', lore: '' },
    { id: 'il-piatto-volante', name: 'Il Piatto Volante', zone: 'Sala del Trono Corrotto',
      weakness: 'Giustizia', lore: '' },
    { id: 'il-tappeto-stritolatore', name: 'Il Tappeto Stritolatore', zone: 'Sala del Trono Corrotto',
      weakness: 'Giustizia', lore: '' },
    { id: 'il-tomo-delle-leggi-nere', name: 'Il Tomo delle Leggi Nere', zone: 'Sala del Trono Corrotto',
      weakness: 'Giustizia', lore: '' },
    { id: 'la-candela-cospiratrice', name: 'La Candela Cospiratrice', zone: 'Sala del Trono Corrotto',
      weakness: 'Giustizia', lore: '' },
    { id: 'la-chiave-dispettosa', name: 'La Chiave Dispettosa', zone: 'Sala del Trono Corrotto',
      weakness: 'Giustizia', lore: '' },
    { id: 'la-corona-fluttuante', name: 'La Corona Fluttuante', zone: 'Sala del Trono Corrotto',
      weakness: 'Giustizia', lore: '' },
    { id: 'la-sedia-traballante', name: 'La Sedia Traballante', zone: 'Sala del Trono Corrotto',
      weakness: 'Giustizia', lore: '' },
    { id: 'la-statua-sgretolata', name: 'La Statua Sgretolata', zone: 'Sala del Trono Corrotto',
      weakness: 'Giustizia', lore: '' },
    { id: 'larmatura-di-guardia', name: 'L\'Armatura di Guardia', zone: 'Sala del Trono Corrotto',
      weakness: 'Giustizia', lore: '' },
    { id: 'lelmo-vagante', name: 'L\'Elmo Vagante', zone: 'Sala del Trono Corrotto',
      weakness: 'Giustizia', lore: '' },
    { id: 'lo-scettro-del-comando', name: 'Lo Scettro del Comando', zone: 'Sala del Trono Corrotto',
      weakness: 'Giustizia', lore: '' },
    { id: 'lo-scudo-del-blasone', name: 'Lo Scudo del Blasone', zone: 'Sala del Trono Corrotto',
      weakness: 'Giustizia', lore: '' },
    { id: 'lo-specchio-ingannevole', name: 'Lo Specchio Ingannevole', zone: 'Sala del Trono Corrotto',
      weakness: 'Giustizia', lore: '' },
    { id: 'sir-ruggine', name: 'Sir Ruggine', zone: 'Sala del Trono Corrotto',
      weakness: 'Giustizia', lore: '' },
    { id: 'tappeto-serpeggiante', name: 'Tappeto Serpeggiante', zone: 'Sala del Trono Corrotto',
      weakness: 'Giustizia', lore: '' },

    /* ── La Torre dell'Alchimista ──────────────────────────────── */

    // ── L'Abisso del Vuoto ───────────────────────────────────
    { id: 'il-boia-del-buco-nero', name: 'Il Boia del Buco Nero', zone: 'L\'Abisso del Vuoto',
      boss: true,
      weakness: 'Luce', lore: '' },
    { id: 'il-cavaliere-della-luna-nera', name: 'Il Cavaliere della Luna Nera', zone: 'L\'Abisso del Vuoto',
      boss: true,
      weakness: 'Luce', lore: '' },
    { id: 'il-drago-del-vuoto-cosmico', name: 'Il Drago del Vuoto Cosmico', zone: 'L\'Abisso del Vuoto',
      boss: true,
      weakness: 'Luce', lore: '' },
    { id: 'cometa-gelante', name: 'Cometa Gelante', zone: 'L\'Abisso del Vuoto',
      weakness: 'Luce', lore: '' },
    { id: 'detrito-gravitazionale', name: 'Detrito Gravitazionale', zone: 'L\'Abisso del Vuoto',
      weakness: 'Luce', lore: '' },
    { id: 'fluido-del-vuoto', name: 'Fluido del Vuoto', zone: 'L\'Abisso del Vuoto',
      weakness: 'Luce', lore: '' },
    { id: 'frammento-di-stella-spenta', name: 'Frammento di Stella Spenta', zone: 'L\'Abisso del Vuoto',
      weakness: 'Luce', lore: '' },
    { id: 'il-golem-di-costellazioni', name: 'Il Golem di Costellazioni', zone: 'L\'Abisso del Vuoto',
      weakness: 'Luce', lore: '' },
    { id: 'il-parassita-di-meteore', name: 'Il Parassita di Meteore', zone: 'L\'Abisso del Vuoto',
      weakness: 'Luce', lore: '' },
    { id: 'il-pipistrello-delleclissi', name: 'Il Pipistrello dell\'Eclissi', zone: 'L\'Abisso del Vuoto',
      weakness: 'Luce', lore: '' },
    { id: 'il-ratto-del-vuoto', name: 'Il Ratto del Vuoto', zone: 'L\'Abisso del Vuoto',
      weakness: 'Luce', lore: '' },
    { id: 'il-tomo-dellastrologo', name: 'Il Tomo dell\'Astrologo', zone: 'L\'Abisso del Vuoto',
      weakness: 'Luce', lore: '' },
    { id: 'la-lanterna-delle-anime-sperdute', name: 'La Lanterna delle Anime Sperdute', zone: 'L\'Abisso del Vuoto',
      weakness: 'Luce', lore: '' },
    { id: 'la-singolarit', name: 'La Singolarità', zone: 'L\'Abisso del Vuoto',
      weakness: 'Luce', lore: '' },
    { id: 'larmatura-del-vuoto', name: 'L\'Armatura del Vuoto', zone: 'L\'Abisso del Vuoto',
      weakness: 'Luce', lore: '' },
    { id: 'lo-scettro-del-vuoto', name: 'Lo Scettro del Vuoto', zone: 'L\'Abisso del Vuoto',
      weakness: 'Luce', lore: '' },
    { id: 'lo-spettro-della-supernova', name: 'Lo Spettro della Supernova', zone: 'L\'Abisso del Vuoto',
      weakness: 'Luce', lore: '' },
    { id: 'locchio-del-vuoto', name: 'L\'Occhio del Vuoto', zone: 'L\'Abisso del Vuoto',
      weakness: 'Luce', lore: '' },
    { id: 'lurna-della-materia-oscura', name: 'L\'Urna della Materia Oscura', zone: 'L\'Abisso del Vuoto',
      weakness: 'Luce', lore: '' },
    { id: 'nebulosa-indemoniata', name: 'Nebulosa Indemoniata', zone: 'L\'Abisso del Vuoto',
      weakness: 'Luce', lore: '' },

    /* ── La Costa del Relitto */

    // ── La Valle dei Cristalli Oscuri ───────────────────────
    { id: 'aethel-il-drago-delle-stelle-cadute', name: 'Aethel il Drago delle Stelle Cadute', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'aetherius-il-drago-astrale', name: 'Aetherius il Drago Astrale', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'aurelius-il-drago-doro-corrotto', name: 'Aurelius il Drago d\'Oro Corrotto', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'avernus-il-drago-dei-pozzi-neri', name: 'Avernus il Drago dei Pozzi Neri', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'boreas-il-drago-del-ghiaccio-nero', name: 'Boreas il Drago del Ghiaccio Nero', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'chronos-il-drago-del-tempo-perduto', name: 'Chronos il Drago del Tempo Perduto', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'gorgon-il-drago-della-pietrificazione', name: 'Gorgon il Drago della Pietrificazione', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'ignis-il-drago-del-magma-cristallizzato', name: 'Ignis il Drago del Magma Cristallizzato', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'kaelos-il-drago-delle-rune-antiche', name: 'Kaelos il Drago delle Rune Antiche', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'malakor-limperatore-della-valle', name: 'Malakor l\'Imperatore della Valle', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'nox-il-drago-mangia-luce', name: 'Nox il Drago Mangia Luce', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'oblivion-il-drago-singolarit', name: 'Oblivion il Drago Singolarità', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'shatter-il-drago-geode', name: 'Shatter il Drago Geode', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'tiamat-la-progenitrice-dei-cristalli', name: 'Tiamat la Progenitrice dei Cristalli', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'typhon-il-drago-tre-teste', name: 'Typhon il Drago Tre Teste', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'umbra-il-cucciolo-declissi', name: 'Umbra il Cucciolo d\'Eclissi', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'valerius-il-drago-in-armatura-reale', name: 'Valerius il Drago in Armatura Reale', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'vespera-la-regina-delle-gemme-tossiche', name: 'Vespera la Regina delle Gemme Tossiche', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },
    { id: 'zephyrus-il-drago-delle-tempeste-oscure', name: 'Zephyrus il Drago delle Tempeste Oscure', zone: 'La Valle dei Cristalli Oscuri',
      boss: true,
      weakness: 'Calore', lore: '' },

    /* ── Miniere del Corruttore */

    // ── La Vetta Oscura — nemesi finale ─────────────────────
    { id: 'cavaliere-drago',     name: 'Il Cavaliere del Drago', zone: 'La Vetta Oscura',
      boss: true, final: true,
      weakness: 'Sconosciuta', lore: 'Colui che ha distrutto Oakhaven. Il suo volto è stato rivelato dalle Memorie… ma il suo potere resta un mistero.' },


  ];

  /* ── Strutture della casa ─────────────────────────────────── */
  /* ── Stato ────────────────────────────────────────────────── */
  function newHero(name, avatar) {
    return migrateHero({
      id: 'h' + Date.now(),
      name, avatar,
      level: 1, xp: 0,
      gold: 0, wood: 0, stone: 0, fiches: 0,
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
      pet: null,
      stamina: 0,
      furniture: { owned: [] },
      consumables: {},
      consumableBuffs: {},
      consumablesUsed: 0,
      achievementsClaimed: [],
      ascended: false,
      restBonus: false,
      restDaysThisWeek: 0,
      weekStamp: weekStamp(),
      log: [],
      created: Date.now(),
    });
  }

  const SCHEMA_VERSION = 5;

  function migrateHero(h) {
    // ── v1: campi base RPG ────────────────────────────────────
    h.items        = h.items        || [];
    h.equipment    = h.equipment    || { arma: null, scudo: null, elmo: null, armatura: null, anello: null, amuleto: null };
    h.mountsOwned  = h.mountsOwned  || [];
    h.mount        = h.mount        || null;
    h.streak       = h.streak       || { count: 0, last: null };
    h.incursion    = h.incursion    || null;
    h.bestiary     = h.bestiary     || [];
    h.storyId      = h.storyId      || (h.avatar && String(h.avatar).includes('eroe2') ? 'eroe2' : 'eroe1');
    // Normalizza percorso avatar da .png a .webp (migrazione asset)
    if (h.avatar && h.avatar.startsWith('assets/') && h.avatar.endsWith('.png')) {
      h.avatar = h.avatar.slice(0, -4) + '.webp';
    }
    h.forgeSeen    = h.forgeSeen    || null;
    h.summarySeen  = h.summarySeen  || null;
    h.eventNotified= h.eventNotified|| null;
    h.battles      = h.battles      || { date: null, count: 0 };
    h.healthSync   = h.healthSync   || { date: null, applied: {} };
    h.stamina      = h.stamina      || 0;
    h.furniture    = h.furniture    || { owned: [] };
    h.achievementsClaimed = h.achievementsClaimed || [];
    // vecchio inventario a stringhe → convertito in oro
    if (Array.isArray(h.inventory) && h.inventory.length) {
      h.gold += h.inventory.length * 10;
      h.inventory = [];
    }

    // ── v2: famiglio ─────────────────────────────────────────
    h.pet = h.pet || null;
    if (h.pet && !h.pet.species) {
      h.pet.species = PET_SPECIES_KEYS[Math.floor(Math.random() * PET_SPECIES_KEYS.length)];
      if (!h.pet.name || h.pet.name === 'Ignis') h.pet.name = PET_SPECIES[h.pet.species].name;
    }
    if (h.pet && h.pet.hatched === undefined) h.pet.hatched = true;
    if (h.pet) {
      h.pet.coraggio      = h.pet.coraggio      ?? 0;
      h.pet.astuzia       = h.pet.astuzia        ?? 0;
      h.pet.lealta        = h.pet.lealta         ?? 0;
      h.pet.lastSynergyDate = h.pet.lastSynergyDate ?? null;
      h.pet.memories      = h.pet.memories       ?? [];
    }

    // ── v3: statistiche e log allenamenti ────────────────────
    h.log            = h.log            || [];
    h.totalKm        = h.totalKm        || 0;
    h.kmByType       = h.kmByType       || { camminata: 0, corsa: 0, cyclette: 0 };
    h.missionsDone   = h.missionsDone   || [];
    h.lootBagsOpened = h.lootBagsOpened || 0;
    h.fragmentsFound = h.fragmentsFound || 0;
    h.cards          = h.cards          || [];
    h.activeMission  = h.activeMission  || null;
    h.restBonus      = h.restBonus      || null;
    h.companion      = h.companion      || null;

    // ── v4: mini-giochi e sfide giornaliere ──────────────────
    h.miniGames       = h.miniGames       || {};
    h.dailyChallenges = h.dailyChallenges || null;
    // v5
    h.tickets        = h.tickets        || [];
    h.ticketsEarned  = h.ticketsEarned  || 0;
    h.trophies        = h.trophies        || [];
    h.weeklyBoss      = h.weeklyBoss      || null;
    /* Vecchio formato (pool fissa WEEKLY_BOSSES): niente km/gold salvati sull'hero,
       forza una rigenerazione dal pool del Bestiario al prossimo rollover. */
    if (h.weeklyBoss && h.weeklyBoss.km === undefined) h.weeklyBoss = null;
    h.treasureMap     = h.treasureMap     || null;
    if (h.treasureMap && !Array.isArray(h.treasureMap.claimed)) h.treasureMap.claimed = [];
    h.prestige        = h.prestige        || { count: 0 };

    // ── v5: mercante, skill tree, lore, pozione ───────────────
    h.skills          = h.skills          || [];
    h.skillPoints     = h.skillPoints     || 0;
    h.loreUnlocked    = h.loreUnlocked    || [];
    h.dailyPotion     = h.dailyPotion     || null;

    if (h.tutorialDone === undefined) h.tutorialDone = (h.totalKm || 0) > 0;
    h.cloud = h.cloud || { activeChallenge: null };
    h.buildings = h.buildings || [];
    h.buildingsDamaged = false;
    h.fugitiveMerchant  = h.fugitiveMerchant  || null;
    h.merchantBought    = h.merchantBought    || {};
    h.merchantOffers    = h.merchantOffers    || null;
    h.cloud.claimedChallenges = h.cloud.claimedChallenges || [];
    h.cloud.friends = h.cloud.friends || [];
    h.pvpWins = h.pvpWins || 0;
    if (h.trainTipDismissed === undefined) h.trainTipDismissed = (h.totalKm || 0) > 0;
    h.biomesDiscovered = h.biomesDiscovered || [];
    h.lettersReceived   = h.lettersReceived   || [];
    h.milestonesReached = h.milestonesReached || [];
    h.totalSessions     = h.totalSessions     || 0;
    h.mappaInfuocata = h.mappaInfuocata || null;
    initGreenhouse(h);

    // ── v6: consumabili ───────────────────────────────────────
    h.consumables     = h.consumables     || {};
    h.consumableBuffs = h.consumableBuffs || {};
    h.consumablesUsed = h.consumablesUsed || 0;

    // ── v7: onboarding step ───────────────────────────────────
    // 0=tutorial da vedere, 1=tutorial visto/0 workout, 2=1°workout fatto, 3+=completato
    if (h.onboardingStep === undefined) {
      h.onboardingStep = (h.tutorialDone || (h.totalKm || 0) > 0) ? 3 : 0;
    }

    h.fiches = h.fiches || 0;
    h.cartomante = h.cartomante || null;

    h.guild = h.guild || null; // { guildId, role, joinedAt, name, emblem, tag, level, totalKm }

    /* Migrazione nomi armi: ricalcola base+nome dall'immagine per item vecchi */
    (h.items || []).forEach(it => {
      if (it.slot !== 'arma') return;
      const names = ARMA_NAMES_BY_IMG[it.rarity];
      if (!names) return;
      const hh = [...String(it.id)].reduce((s, c) => (s * 33 + c.charCodeAt(0)) % 9973, 7);
      const correctBase = names[hh % names.length];
      if (it.base === correctBase) return;
      const oldName = it.name || '';
      const spaceIdx = oldName.indexOf(' ');
      const suffix = spaceIdx >= 0 ? oldName.slice(spaceIdx + 1) : oldName;
      it.base = correctBase;
      it.name = `${correctBase} ${suffix}`;
      it.desc = descForItem(it.slot, it.rarity, it.base, it.affixes || []);
    });

    /* Aggiunge desc agli item pre-sistema affix che ne sono privi */
    (h.items || []).forEach(it => {
      if (!it.desc) it.desc = descForItem(it.slot, it.rarity, it.base || null, it.affixes || []);
    });

    // ── Pass Stagionale ────────────────────────────────────────
    h.seasonPass = h.seasonPass || { seasonId: SEASON_PASS.id, points: 0, claimedFree: [], claimedPremium: [] };
    if (h.seasonPass.seasonId !== SEASON_PASS.id) {
      h.seasonPass = { seasonId: SEASON_PASS.id, points: 0, claimedFree: [], claimedPremium: [] };
    }
    h.cosmetici = h.cosmetici || { avatar: [], cornici: [], titoli: [] };
    h.cosmetici.avatar  = h.cosmetici.avatar  || [];
    h.cosmetici.cornici = h.cosmetici.cornici || [];
    h.cosmetici.titoli  = h.cosmetici.titoli  || [];

    h.schemaVersion = SCHEMA_VERSION;
    return h;
  }

  function weekStamp() {
    // ISO Monday-based week: stamp = "YYYY-MM-DD" of the Monday of the current local week
    const d = new Date();
    const dow = (d.getDay() + 6) % 7; // 0=Mon … 6=Sun
    const monday = new Date(d);
    monday.setDate(d.getDate() - dow);
    monday.setHours(0, 0, 0, 0);
    return `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
  }
  function gameDate() {
    return new Date();
  }
  function todayStamp() {
    const d = gameDate();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function yesterdayStamp() {
    const d = gameDate(); d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function migrateState(s) {
    s.heroes        = s.heroes        || [];
    s.current       = s.current       || null;
    s.claimedEvents = s.claimedEvents || [];
    // Mantieni solo le ultime 16 voci (max 1 per settimana → ~4 mesi)
    if (s.claimedEvents.length > 16) s.claimedEvents = s.claimedEvents.slice(-16);
    return s;
  }

  function load() {
    try {
      const s = migrateState(JSON.parse(localStorage.getItem(SAVE_KEY)) || {});
      s.heroes.forEach(migrateHero);
      return s;
    }
    catch { return migrateState({}); }
  }
  function save(state) { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }

  function deleteHero(state, heroId) {
    state.heroes = state.heroes.filter(h => h.id !== heroId);
    if (state.current === heroId) state.current = null;
  }

  /* ── Backup helpers ──────────────────────────────────────────── */
  function parseBackup(jsonText) {
    const raw = JSON.parse(jsonText);
    const s = migrateState(raw);
    s.heroes.forEach(migrateHero);
    return s;
  }
  // Aggiunge al salvataggio corrente solo gli eroi non già presenti (per id).
  // Ritorna { added, skipped }.
  function mergeImport(state, importedState) {
    const existingIds = new Set(state.heroes.map(h => h.id));
    let added = 0, skipped = 0;
    importedState.heroes.forEach(h => {
      if (existingIds.has(h.id)) { skipped++; }
      else { state.heroes.push(h); added++; }
    });
    return { added, skipped };
  }

  /* ── Bonus login giornaliero (Il Tesoro Giornaliero) ──────── */
  // Ritorna il premio del giorno o null se già riscosso oggi.
  function dailyLogin(hero) {
    const today = todayStamp();
    if (hero.streak.last === today) return null;
    const isConsecutive = hero.streak.last === yesterdayStamp();
    const daysMissed = hero.streak.last
      ? Math.max(0, Math.round((new Date(today).getTime() - new Date(hero.streak.last).getTime()) / 86400000) - 1)
      : 0;
    const shieldsNeeded = Math.max(1, daysMissed);
    // Immortale: auto-shield una volta al mese se si salta 1 solo giorno
    if (!isConsecutive && daysMissed === 1 && (hero.skills || []).includes('immortale')) {
      const lastAutoShield = hero.immortaleUsed || 0;
      if (Date.now() - lastAutoShield >= 30 * 86400000) {
        hero.immortaleUsed = Date.now();
        hero.consumableBuffs = hero.consumableBuffs || {};
        hero.consumableBuffs.streakShield = (hero.consumableBuffs.streakShield || 0) + 1;
      }
    }
    if (!isConsecutive && hero.consumableBuffs && hero.consumableBuffs.streakShield >= shieldsNeeded) {
      hero.consumableBuffs.streakShield -= shieldsNeeded;
      hero.streak.last = today;
      hero.streak.count = (hero.streak.count || 1) + 1;
    } else {
      hero.streak.count = isConsecutive ? hero.streak.count + 1 : 1;
      hero.streak.last = today;
    }
    const gold = 10 * Math.min(hero.streak.count, 30);
    hero.gold += gold;
    const reward = { day: hero.streak.count, gold };
    if (hero.streak.count % 7 === 0) {
      const item = genItemFor(hero, 'raro');
      hero.items.push(item);
      reward.item = item;
      const cons = dropConsumable(hero, 'comune');
      if (cons) reward.consumable = cons;
    }
    return reward;
  }

  /* ── Incursioni (evento a tempo: 24 ore) ──────────────────── */
  // Pescate dai boss della Bestiary già sbloccati (zona accessibile al
  // livello dell'eroe), non da un pool fisso — così la varietà cresce
  // con la progressione invece di ripetere sempre gli stessi 6 nemici.
  const INCURSION_PHRASES = [
    '{name} ha invaso {zone}!',
    '{name} sta devastando {zone}!',
    '{name} semina il caos a {zone}!',
    '{name} è stato avvistato a {zone}!',
    '{name} minaccia {zone}!',
  ];

  function dateSeed(str) {
    return [...str].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 100000, 7);
  }

  // L'incursione del giorno (generata dalla data + livello dell'eroe)
  function todayIncursion(hero) {
    const today = todayStamp();
    const seed = dateSeed(today);
    const accessible = accessibleZones(hero);
    const pool = BESTIARY.filter(b => b.boss && !b.final && accessible.includes(b.zone));
    const fallbackPool = BESTIARY.filter(b => b.boss && !b.final);
    const chosenPool = pool.length ? pool : fallbackPool;
    const boss = chosenPool[seed % chosenPool.length];
    const phrase = INCURSION_PHRASES[(seed * 7 + 3) % INCURSION_PHRASES.length];
    const km = Math.round(dailyGoalKm(hero.level) * 1.4);
    const order = Object.keys(RARITIES);
    const avail = availableRarities(hero.level);
    const best = avail[avail.length - 1];
    const minRarity = order[Math.max(order.indexOf('raro'), order.indexOf(best) - 1)];
    return {
      date: today,
      name: phrase.replace('{name}', boss.name).replace('{zone}', boss.zone),
      enemy: boss.id,
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
        const lostItem = genItemFor(hero, hero.incursion.minRarity);
        missed = {
          name: hero.incursion.name,
          kmMissing: Math.max(0.1, hero.incursion.km - hero.incursion.progressKm).toFixed(1),
          minRarity: hero.incursion.minRarity,
          lostItem,
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

  /* ── Mappa Infuocata ───────────────────────────────────────── */
  // Tiers: degrada dal migliore al peggiore col passare del tempo
  const MI_TIERS = [
    { maxMs:  4 * 3600000, rarity: 'leggendario', label: 'Leggendario', color: '#d9822b' },
    { maxMs:  8 * 3600000, rarity: 'epico',       label: 'Epico',       color: '#7b3fbf' },
    { maxMs: 16 * 3600000, rarity: 'raro',        label: 'Raro',        color: '#2e6fb0' },
    { maxMs: 24 * 3600000, rarity: 'comune',      label: 'Comune',      color: '#8a7a5f' },
  ];

  function rolloverMappaInfuocata(hero) {
    const ws = weekStamp();
    if (!hero.mappaInfuocata || hero.mappaInfuocata.week !== ws) {
      hero.mappaInfuocata = { week: ws, status: 'offered', activatedAt: null, kmDone: 0 };
    } else if (hero.mappaInfuocata.status === 'active') {
      const elapsed = Date.now() - hero.mappaInfuocata.activatedAt;
      if (elapsed > 86400000) hero.mappaInfuocata.status = 'burned';
    }
  }

  function mappaInfuocataStatus(hero) {
    const mi = hero.mappaInfuocata;
    if (!mi) return null;
    if (mi.status !== 'active') return { ...mi, tier: null, msLeft: 0 };
    const elapsed = Date.now() - mi.activatedAt;
    const msLeft = Math.max(0, 86400000 - elapsed);
    const tier = MI_TIERS.find(t => elapsed < t.maxMs) || MI_TIERS[MI_TIERS.length - 1];
    return { ...mi, tier, msLeft, elapsed };
  }

  function activateMappaInfuocata(hero) {
    if (!hero.mappaInfuocata || hero.mappaInfuocata.status !== 'offered') return false;
    hero.mappaInfuocata.status = 'active';
    hero.mappaInfuocata.activatedAt = Date.now();
    hero.mappaInfuocata.kmDone = 0;
    return true;
  }

  function claimMappaInfuocata(hero) {
    const mi = hero.mappaInfuocata;
    if (!mi || mi.status !== 'ready') return null;
    const elapsed = Date.now() - mi.activatedAt;
    const tier = MI_TIERS.find(t => elapsed < t.maxMs) || MI_TIERS[MI_TIERS.length - 1];
    const item = genItemFor(hero, tier.rarity);
    hero.items.push(item);
    hero.gold += 50;
    mi.status = 'claimed';
    return { item, gold: 50, tier };
  }

  /* ── Streak freeze ─────────────────────────────────────────── */
  function restoreStreak(hero, savedCount) {
    const cost = 500;
    if (hero.gold < cost) return 'Oro insufficiente! Servono 500 🪙.';
    hero.gold -= cost;
    hero.streak.count = savedCount + 1;
    return null;
  }

  /* ── Mercante Fuggiasco (appare a caso ogni giorno, 6 km) ──── */
  function rolloverFugitiveMerchant(hero) {
    const today = todayStamp();
    if (hero.fugitiveMerchant && hero.fugitiveMerchant.date === today) return;
    const seed = dateSeed(today + (hero.id || ''));
    if (seed % 2 !== 0) { hero.fugitiveMerchant = { date: today, item: null }; return; }
    const rarityKeys = Object.keys(RARITIES);
    const slots = EQUIP_SLOTS;
    const itemSeed = dateSeed(today + 'fug');
    const slotKey = slots[itemSeed % slots.length];
    const minIdx = Math.max(1, rarityKeys.indexOf('non_comune'));
    const rarIdx = minIdx + (itemSeed % (rarityKeys.length - minIdx));
    const rar = rarityKeys[Math.min(rarIdx, rarityKeys.length - 1)];
    const avail = availableRarities(hero.level);
    const finalR = avail.includes(rar) ? rar : (avail[avail.length - 1] || 'raro');
    const item = genItem(hero.level, null, slotKey, finalR);
    const fullPrice = RARITIES[finalR].value;
    const discountedPrice = Math.max(5, Math.round(fullPrice * 0.20 / 5) * 5);
    hero.fugitiveMerchant = { date: today, item, fullPrice, price: discountedPrice, kmRequired: 6, bought: false };
  }

  function getFugitiveMerchant(hero) {
    const today = todayStamp();
    if (!hero.fugitiveMerchant || hero.fugitiveMerchant.date !== today || !hero.fugitiveMerchant.item) return null;
    return hero.fugitiveMerchant;
  }

  function todayKm(hero) {
    const today = todayStamp();
    return (hero.log || [])
      .filter(e => { const d = new Date(e.date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` === today; })
      .reduce((s, e) => s + (e.km || 0), 0);
  }

  function buyFromFugitiveMerchant(hero) {
    const fm = getFugitiveMerchant(hero);
    if (!fm) return 'Il mercante è già fuggito!';
    if (fm.bought) return 'Hai già acquistato da questo mercante.';
    const km = todayKm(hero);
    if (km < fm.kmRequired) return `Percorri ${(fm.kmRequired - km).toFixed(1)} km in più oggi per raggiungerlo!`;
    if (hero.gold < fm.price) return 'Oro insufficiente!';
    hero.gold -= fm.price;
    hero.items.push(fm.item);
    hero.fugitiveMerchant.bought = true;
    return null;
  }

  /* ── Allenamento ──────────────────────────────────────────── */
  function validateSession(type, km) {
    const act = ACTIVITIES[type];
    if (!act) return 'Attività sconosciuta.';
    if (!(km > 0)) return 'Inserisci una distanza valida, giovane eroe.';
    if (km > act.maxKmSession)
      return `Il Custode del Tempo aggrotta la fronte: ${km} km di ${act.label.toLowerCase()} in una sessione? ` +
             `Il tuo eroe ha preso un passaggio su un carro troppo veloce! Questo movimento non conta come addestramento.`;
    return null;
  }

  function logWorkout(hero, type, km, opts) {
    const err = (opts && opts.skipValidation) ? null : validateSession(type, km);
    if (err) return { error: err };

    migrateHero(hero);
    const act = ACTIVITIES[type];
    const report = { km, type, levelsGained: [], loot: [], cards: [], fragments: 0, unlocks: [], trophies: [], tickets: [] };

    // Cavalcatura (+% km) e compagno (+10% km)
    let effKm = km;
    const mount = hero.mount ? mountById(hero.mount) : null;
    if (mount) effKm *= 1 + mount.bonus / 100;
    if (hero.companion) effKm *= 1.10;
    let mult = 1;
    if (hero.restBonus) { mult = 2; hero.restBonus = false; report.restBonusUsed = true; }

    let xpMult = 1 + equipmentXpBonus(hero) / 100;
    let goldMult = 1;
    let resMult = 1;
    // Talenti di classe
    if (isClass(hero, 'stregone')) xpMult += 0.10;
    if (isClass(hero, 'eroe1') && type !== 'cyclette') xpMult += 0.10;
    if (isClass(hero, 'furfante')) goldMult += 0.20;
    if (isClass(hero, 'predone')) goldMult += 0.25;
    if (isClass(hero, 'eroe2')) resMult += 0.25;
    if (isClass(hero, 'maga')) { resMult += 0.15; xpMult += 0.05; }
    if (isClass(hero, 'principe') && type === 'cyclette') xpMult += 0.15;
    if (isClass(hero, 'sacerdotessa_sole')) xpMult += 0.15;
    // Streak bonus: +5% XP per giorno consecutivo (cap 30%+skill)
    const streakCap = 0.30 + skillBonus(hero, 'streakCap');
    const streakBonus = Math.min(streakCap, Math.max(0, (hero.streak ? hero.streak.count - 1 : 0)) * 0.05);
    if (streakBonus > 0) { xpMult += streakBonus; report.streakBonus = streakBonus; }
    // Prestige bonus: +20% XP per ascensione
    const prestigeBonus = (hero.prestige && hero.prestige.count > 0) ? Math.min(0.60, hero.prestige.count * 0.20) : 0;
    if (prestigeBonus > 0) xpMult += prestigeBonus;
    // Skill tree bonuses
    if ((hero.skills || []).includes('swift_legs') && type !== 'cyclette') xpMult += 0.08;
    if ((hero.skills || []).includes('ciclista_nato') && type === 'cyclette') xpMult += 0.10;
    xpMult += skillBonus(hero, 'xpMult_global');
    // Buff consumabili attivi
    const cBuffs = hero.consumableBuffs || {};
    const now2 = Date.now();
    if (cBuffs.xpMult && cBuffs.xpMult.sessions > 0) {
      xpMult += cBuffs.xpMult.value;
      cBuffs.xpMult.sessions--;
      if (cBuffs.xpMult.sessions <= 0) delete cBuffs.xpMult;
      report.consumableBuff = true;
    }
    if (cBuffs.goldMult && cBuffs.goldMult.expiresAt > now2) {
      goldMult += cBuffs.goldMult.value;
      report.consumableBuff = true;
    } else if (cBuffs.goldMult) delete cBuffs.goldMult;
    if (cBuffs.allBoost && cBuffs.allBoost.expiresAt > now2) {
      xpMult   += cBuffs.allBoost.value;
      goldMult += cBuffs.allBoost.value;
      resMult  += cBuffs.allBoost.value;
      report.consumableBuff = true;
    } else if (cBuffs.allBoost) delete cBuffs.allBoost;
    if (cBuffs.resPerSession && cBuffs.resPerSession.expiresAt > now2) {
      report._extraWood  = cBuffs.resPerSession.wood  || 0;
      report._extraStone = cBuffs.resPerSession.stone || 0;
    } else if (cBuffs.resPerSession) delete cBuffs.resPerSession;

    // Pozione del giorno
    if (hero.dailyPotion && !hero.dailyPotion.used) {
      const pid = hero.dailyPotion.id;
      const potionXpBoost = isClass(hero, 'sacerdotessa_sole') ? 0.70 : 0.50; // +20% efficacia
      const potionGoldBoost = isClass(hero, 'sacerdotessa_sole') ? 1.20 : 1.00;
      if (pid === 'xp_boost')   { xpMult += potionXpBoost; report.potionUsed = pid; }
      if (pid === 'gold_rush')  { goldMult += potionGoldBoost; report.potionUsed = pid; }
      if (pid === 'rest_echo' && !hero.restBonus) { mult = 2; report.potionUsed = pid; }
      hero.dailyPotion.used = true;
    }
    // Meteo dinamico
    const weather = getDailyWeather();
    if (weather.xpBonus > 0) { xpMult += weather.xpBonus; report.weatherBonus = weather; }

    // Cimeli del Rifugio (Espansione)
    const furn = furnitureAggregate(hero);
    xpMult += (furn.xpMult[type] || 0) + (furn.xpMult.global || 0);
    goldMult += furn.goldMult;
    resMult += skillBonus(hero, 'resMult');
    let localWoodMult = resMult + furn.woodMult;
    let localStoneMult = resMult + furn.stoneMult;

    // Affix equipaggiamento (tipo-specifici, unici per ogni item)
    const equipType = equipTypeBonusAggregate(hero);
    xpMult    += (equipType.xpMult[type] || 0) + equipType.xpMult.global;
    goldMult  += equipType.goldMult;
    localWoodMult  += equipType.woodMult;
    localStoneMult += equipType.stoneMult;

    // Bonus gilda (applica se hero.guild ha il livello cached)
    if (hero.guild && hero.guild.totalKm != null) {
      const gb = guildBonus(hero.guild.totalKm);
      xpMult   += (gb.xpPct || 0) / 100;
      goldMult += (gb.goldPct || 0) / 100;
    }
    // Bonus specie famiglio (Volt: +XP eroe; Silvano: +legna)
    const petSb = petSpeciesBonus(hero);
    if (petSb.heroXpMult) xpMult += petSb.heroXpMult;
    if (petSb.woodMult)   localWoodMult += petSb.woodMult;
    // Personalità Goloso: +5% XP eroe agli allenamenti
    if (hero.pet && hero.pet.hatched && !hero.pet.sick) {
      const petPers = PET_PERSONALITIES[hero.pet.personality];
      if (petPers && petPers.xpBonus) xpMult += petPers.xpBonus;
    }

    // Dualità: Cittadella dell'Eclissi, +risorse dopo le 18:00
    if (furn.flags.dualityBonus && new Date().getHours() >= 18) {
      goldMult += furn.flags.dualityBonus;
      localWoodMult += furn.flags.dualityBonus;
      localStoneMult += furn.flags.dualityBonus;
    }

    // Bonus stagionali
    const season = currentSeason();
    if (season.id === 'estate') {
      if (type === 'corsa' || type === 'cyclette') xpMult += 0.20;
    }
    if (season.id === 'autunno') {
      goldMult += 0.15;
      localWoodMult += 0.25;
      localStoneMult += 0.25;
    }
    if (season.id === 'inverno') {
      xpMult += 0.15;
      // streak raddoppiato: già computato sopra con streakBonus, aggiungiamo altra metà
      if (streakBonus > 0) xpMult += streakBonus; // era già aggiunto, aggiungiamo di nuovo = doppio
    }
    report.season = season.id;

    report.xp = Math.round(effKm * act.xpPerKm * mult * xpMult);
    report.gold = Math.round(effKm * GOLD_PER_KM * mult * goldMult);
    hero.xp += report.xp;
    hero.gold += report.gold;

    report.wood = Math.round((effKm * (1 + Math.random())) * localWoodMult);
    report.stone = Math.round(effKm * (0.3 + Math.random() * 0.7) * localStoneMult);
    hero.wood += report.wood;
    hero.stone += report.stone;
    if (report._extraWood)  { hero.wood  += report._extraWood;  report.wood  += report._extraWood; }
    if (report._extraStone) { hero.stone += report._extraStone; report.stone += report._extraStone; }

    hero.totalKm += km;
    hero.kmByType[type] = (hero.kmByType[type] || 0) + km;
    updateChallengeProgress(hero, 'km', km);

    // Pass Stagionale: ogni km registrato converte in punti
    const spBefore = seasonPassStatus(hero);
    seasonPassState(hero).points += Math.round(km * SEASON_PASS.pointsPerKm);
    const spAfter = seasonPassStatus(hero);
    if (spAfter.level > spBefore.level) report.seasonPassLevelUp = spAfter.level;

    // Sfida stagionale
    initSeasonalChallenge(hero);
    if (!hero.seasonalChallenge.claimed) {
      const prev = hero.seasonalChallenge.progressKm;
      hero.seasonalChallenge.progressKm = Math.min(hero.seasonalChallenge.km, +(prev + km).toFixed(1));
      if (!report.seasonalChallenge && hero.seasonalChallenge.progressKm >= hero.seasonalChallenge.km) {
        report.seasonalChallengeComplete = true;
      }
      report.seasonalChallenge = { ...hero.seasonalChallenge };
    }

    // Boss settimanale
    if (hero.weeklyBoss && !hero.weeklyBoss.claimed) {
      const bossData = hero.weeklyBoss;
      if (bossData && hero.weeklyBoss.progressKm < bossData.km) {
        hero.weeklyBoss.progressKm = Math.min(bossData.km, hero.weeklyBoss.progressKm + km);
        const wasDefeated = hero.weeklyBoss.progressKm >= bossData.km;
        report.bossProgress = { boss: bossData, done: hero.weeklyBoss.progressKm, total: bossData.km };
        if (wasDefeated) report.bossDefeatedWeekly = bossData;
      }
    }

    // Mappa del tesoro settimanale
    if (hero.treasureMap) {
      const prev = hero.treasureMap.progressKm;
      const treasureKm = km * (1 + skillBonus(hero, 'treasureKmBonus'));
      hero.treasureMap.progressKm = Math.round((prev + treasureKm) * 10) / 10;
      const newTiers = TREASURE_MAP_TIERS.map((t,i) => ({ ...t, idx:i }))
        .filter(t => prev < t.km && hero.treasureMap.progressKm >= t.km);
      if (newTiers.length) report.treasureUnlocked = newTiers;
    }

    // Trofei km milestone
    hero.trophies = hero.trophies || [];
    const newTrophies = TROPHIES.filter(t => hero.totalKm >= t.km && !hero.trophies.includes(t.id));
    newTrophies.forEach(t => hero.trophies.push(t.id));
    if (newTrophies.length) report.trophies = newTrophies;
    if (type === 'corsa') {
      let staminaGain = km * 5 + furn.staminaMaxBonus;
      if (furn.flags.doubleStamina) staminaGain *= 2;
      hero.stamina = (hero.stamina || 0) + staminaGain;
    }
    hero.log.unshift({ date: Date.now(), type, km, xp: report.xp });
    if (hero.log.length > 100) hero.log.pop();

    // Lore unlock check
    const newLore = checkLoreUnlock(hero);
    if (newLore.length) report.loreUnlocked = newLore;

    // Livelli — progressione libera fino al livello 100
    while (hero.level < MAX_LEVEL && hero.xp >= xpForLevel(hero.level)) {
      hero.xp -= xpForLevel(hero.level);
      hero.level++;
      earnSkillPoints(hero);
      report.levelsGained.push(hero.level);
      if (hero.level === 5 && !hero.cards.includes('card_casa')) {
        hero.cards.push('card_casa'); report.cards.push('card_casa');
        report.unlocks.push('🏡 Livello 5! Puoi costruire la tua casa nel Rifugio.');
      }
    }
    if (hero.level >= MAX_LEVEL && hero.xp > xpForLevel(hero.level)) {
      hero.xp = xpForLevel(hero.level);
    }

    // Sacchi del Viaggiatore → oggetti equipaggiabili
    const bagsDue = Math.floor(hero.totalKm / LOOT_BAG_KM);
    while (hero.lootBagsOpened < bagsDue) {
      hero.lootBagsOpened++;
      const item = genItemFor(hero);
      hero.items.push(item);
      report.loot.push(item);
    }

    // Biglietti Gratta e Vinci — ogni TICKET_KM km
    const ticketsDue = Math.floor(hero.totalKm / TICKET_KM);
    if (ticketsDue > (hero.ticketsEarned || 0)) {
      const count = ticketsDue - (hero.ticketsEarned || 0);
      hero.ticketsEarned = ticketsDue;
      for (let i = 0; i < count; i++) {
        addTicket(hero, 'comune');
        report.tickets.push('comune');
      }
    }

    // Serra: 5% possibilità di trovare Fertilizzante Magico durante l'allenamento
    if (hero.greenhouse && Math.random() < 0.05) {
      const fert = genFertilizzante();
      hero.items.push(fert);
      report.loot.push(fert);
    }

    // Esche: 15% possibilità di trovarne una durante l'allenamento
    if (Math.random() < 0.15) {
      const baitPool = [
        { id: 'fungo',     w: 50 },
        { id: 'osso',      w: 30 },
        { id: 'amo_arg',   w: 15 },
        { id: 'cristallo', w: 5  },
      ];
      let r = Math.random() * 100;
      for (const b of baitPool) {
        r -= b.w;
        if (r <= 0) { addBait(hero, b.id, 1); report.baitFound = BAITS.find(x => x.id === b.id); break; }
      }
    }

    // Frammenti di Memoria — l'ultimo (che rivela il Cavaliere del Drago)
    // resta bloccato finché l'eroe non raggiunge il Livello 100.
    const rawFragsDue = Math.min(5, Math.floor(hero.totalKm / MEMORY_FRAGMENT_KM));
    const fragsDue = (rawFragsDue >= 5 && hero.level < MAX_LEVEL) ? 4 : rawFragsDue;
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
        const item = genItemFor(hero, hero.incursion.minRarity);
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

    // Mappa Infuocata
    if (hero.mappaInfuocata && hero.mappaInfuocata.status === 'active') {
      const elapsed = Date.now() - hero.mappaInfuocata.activatedAt;
      if (elapsed > 86400000) {
        hero.mappaInfuocata.status = 'burned';
      } else {
        hero.mappaInfuocata.kmDone = Math.min(10, (hero.mappaInfuocata.kmDone || 0) + km);
        if (hero.mappaInfuocata.kmDone >= 10) {
          hero.mappaInfuocata.status = 'ready';
          report.mappaInfuocataReady = true;
        } else {
          report.mappaInfuocataProgress = { kmDone: hero.mappaInfuocata.kmDone };
        }
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

    // Contatore sessioni totali (per le Tappe della Via)
    hero.totalSessions = (hero.totalSessions || 0) + 1;

    // Famiglio: XP e Virtù da attività fisica (fonte primaria di crescita)
    if (hero.pet && hero.pet.hatched) {
      tickPet(hero);
      const petXpGained = Math.round(km * 3);
      const evoPet = addPetXp(hero, petXpGained);
      report.petXp = petXpGained;
      if (evoPet) Object.assign(report, evoPet);
      // Virtù: corsa/cyclette → Coraggio; camminata → Astuzia
      if (type === 'corsa' || type === 'cyclette') {
        addPetVirtue(hero, 'coraggio', Math.round(km * 0.5 * 10) / 10);
        if (type === 'corsa' && hero.pet.accessory === 'cappello') addPetVirtue(hero, 'coraggio', 1);
      } else if (type === 'camminata') {
        addPetVirtue(hero, 'astuzia', Math.round(km * 0.2 * 10) / 10);
        if (hero.pet.accessory === 'occhiali') addPetVirtue(hero, 'astuzia', 1);
      }
    }

    return report;
  }

  /* ── Sincronizzazione automatica da Apple Salute (via Comandi Rapidi) ──
     Il Comando Rapido apre la PWA con ?sync_km=X&sync_type=Y contenente il
     TOTALE cumulativo di oggi (non la singola sessione). Qui calcoliamo la
     differenza rispetto a quanto già applicato oggi, per non ricontare tutto
     ogni volta che l'app si riapre. Bypassa il tetto anti-baro per sessione
     (la fonte è HealthKit, non un input manuale) ma applica un tetto di
     sicurezza contro dati anomali. */
  const HEALTH_SYNC_DAILY_CAP = 60; // km massimi accreditabili per tipo al giorno
  function healthSyncState(hero) {
    hero.healthSync = hero.healthSync || { date: null, applied: {} };
    const today = todayStamp();
    if (hero.healthSync.date !== today) hero.healthSync = { date: today, applied: {} };
    return hero.healthSync;
  }
  function logHealthSync(hero, type, totalKmToday) {
    if (!ACTIVITIES[type] || !(totalKmToday >= 0)) return null;
    // Sanity check: nessuna attività reale supera 200 km/giorno
    if (totalKmToday > 200) return null;
    const hs = healthSyncState(hero);
    // Cooldown: non più di una sync per tipo ogni 15 minuti (anti-cheat)
    const now = Date.now();
    hs.lastSyncAt = hs.lastSyncAt || {};
    if (now - (hs.lastSyncAt[type] || 0) < 15 * 60 * 1000) return null;
    const already = hs.applied[type] || 0;
    let delta = totalKmToday - already;
    if (!(delta > 0.05)) return null; // nulla di nuovo, o rumore verso il basso
    delta = Math.round(delta * 100) / 100;
    const capped = Math.min(delta, Math.max(0, (ACTIVITIES[type].maxKmSession || HEALTH_SYNC_DAILY_CAP) - already));
    if (capped <= 0) return null;
    const report = logWorkout(hero, type, capped, { skipValidation: true });
    if (report && !report.error) {
      hs.applied[type] = already + capped;
      hs.lastSyncAt[type] = now;
      report.autoSync = true;
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
    const furn = furnitureAggregate(hero);
    const doubleChest = Math.random() < furn.doubleDropChance;
    // Lo scrigno: le ricompense vengono consegnate subito allo stato,
    // ma l'interfaccia le rivela con l'apertura dello scrigno.
    const predoneGold = isClass(hero, 'predone') ? 1.25 : 1;
    const chest = {
      gold: Math.round((r.gold || 0) * (doubleChest ? 2 : 1) * predoneGold),
      wood: (r.wood || 0) * (doubleChest ? 2 : 1),
      stone: (r.stone || 0) * (doubleChest ? 2 : 1),
      items: [], cards: [], doubled: doubleChest,
    };
    hero.gold += chest.gold;
    hero.wood += chest.wood;
    hero.stone += chest.stone;
    for (let i = 0; i < (r.items || 0); i++) {
      const item = genItemFor(hero, r.minRarity);
      hero.items.push(item);
      chest.items.push(item);
    }
    const rangerChance = isClass(hero, 'ranger') ? 0.15 : 0;
    if (Math.random() < furn.dropProjectChance + rangerChance) {
      const bonusItem = genItemFor(hero);
      hero.items.push(bonusItem);
      chest.items.push(bonusItem);
      chest.bonusFind = true;
    }
    if (r.card && !hero.cards.includes(r.card)) {
      hero.cards.push(r.card);
      chest.cards.push(r.card);
      report.cards.push(r.card);
    }
    report.chest = chest;
    if (r.unlocks === 'companion' && !hero.companion) {
      hero.companion = true;
      hero.pet = createPet(hero);
      const sp = PET_SPECIES[hero.pet.species];
      report.unlocks.push(`🐺 EVENTO DEL RISVEGLIO! Il Lupo Astrale ti ha scelto: è la tua cavalcatura in missione (+10% km). Nello stesso istante, un misterioso uovo di ${sp.name} ${sp.icon} è apparso al Rifugio: visita il Santuario dei Famigli per prendertene cura e vederlo evolvere!`);
    }
    if (r.unlocks === 'ascension') {
      hero.ascended = true; // retrocompatibilità con salvataggi esistenti
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

  // Valore di vendita (il Fabbro spunta prezzi migliori)
  function sellValue(hero, item) {
    return Math.round(item.value * (isClass(hero, 'fabbro') ? 1.10 : 1));
  }

  function sellItem(hero, itemId) {
    const idx = hero.items.findIndex(i => i.id === itemId);
    if (idx < 0) return 'Oggetto non trovato.';
    const item = hero.items[idx];
    Object.keys(hero.equipment).forEach(s => {
      if (hero.equipment[s] === itemId) hero.equipment[s] = null;
    });
    hero.gold += sellValue(hero, item);
    hero.items.splice(idx, 1);
    updateWeeklyProgress(hero, 'sell', 1);
    return null;
  }

  /* Genera affix deterministici per gli item della Fucina (stesso seme = stesso risultato) */
  function forgeAffixes(s, rarity, seed, idx) {
    const scale = RARITY_TYPE_SCALE[rarity] || 1;
    const affixes = [];
    /* Base del tipo: usa indice di immagine per le armi, ITEM_BASES per gli altri */
    let base;
    if (s === 'arma' && ARMA_NAMES_BY_IMG[rarity]) {
      const names = ARMA_NAMES_BY_IMG[rarity];
      const imgH = Math.abs(seed + idx * 31) % names.length;
      base = names[imgH];
    } else {
      base = ITEM_BASES[s][Math.abs(seed + idx * 3) % ITEM_BASES[s].length];
    }
    const primaryDef = (ITEM_TYPE_AFFIX[s] || {})[base];
    if (primaryDef) {
      /* Valore deterministico: interpola min-max con una frazione derivata dal seme */
      const frac = (Math.abs(seed * 1664525 + idx * 1013904223) % 10000) / 10000;
      const raw = primaryDef.min + frac * (primaryDef.max - primaryDef.min);
      const af = { type: primaryDef.type, value: +((raw * scale).toFixed(4)) };
      if (primaryDef.activity) af.activity = primaryDef.activity;
      affixes.push(af);
    }
    const secCount = RARITY_SECONDARY_COUNT[rarity] || 0;
    const used = new Set(affixes.map(a => a.type + (a.activity || '')));
    for (let si = 0; si < secCount; si++) {
      const avail = SECONDARY_AFFIX_POOL.filter(p => !used.has(p.type + (p.activity || '')));
      if (!avail.length) break;
      const pick = avail[Math.abs(seed + idx * 17 + si * 7) % avail.length];
      const frac = (Math.abs(seed * 6364136 + idx * 1442695037 + si) % 10000) / 10000;
      const raw = pick.min + frac * (pick.max - pick.min);
      const af = { type: pick.type, value: +((raw * scale).toFixed(4)) };
      if (pick.activity) af.activity = pick.activity;
      affixes.push(af);
      used.add(pick.type + (pick.activity || ''));
    }
    return { base, affixes };
  }

  // La Fucina propone ogni giorno 3 pezzi (armi/armature), uguali per data
  function forgeOffers(hero) {
    const today = todayStamp();
    const seed = dateSeed(today + '-forge');
    const slots = ['arma', 'scudo', 'elmo', 'armatura'];
    const offers = [];
    const furn = furnitureAggregate(hero);
    const discount = 1 - Math.min(0.6, furn.marketDiscount + skillBonus(hero, 'marketDiscount'));
    for (let i = 0; i < 3; i++) {
      const s = slots[(seed + i * 7) % slots.length];
      const rIdx = (seed + i * 13) % 100;
      let rarity = 'comune';
      if (rIdx > 55) rarity = 'non_comune';
      if (rIdx > 80) rarity = 'raro';
      if (rIdx > 93 && hero.level >= 16) rarity = 'epico';
      if (rIdx > 98 && hero.level >= 31) rarity = 'leggendario';
      const { base, affixes } = forgeAffixes(s, rarity, seed, i);
      const suf = RARITY_SUFFIX[rarity][(seed + i * 5) % RARITY_SUFFIX[rarity].length];
      const r = RARITIES[rarity];
      offers.push({
        id: 'forge-' + today + '-' + i,
        slot: s, rarity, base,
        name: `${base} ${suf}`,
        icon: SLOTS[s].icon,
        xp: r.xp, value: r.value,
        affixes,
        price: Math.round(r.value * 2 * (isClass(hero, 'fabbro') ? 0.8 : 1) * discount),
        desc: descForItem(s, rarity, base, affixes),
      });
    }
    // L'OCCASIONE DEL SABATO: un pezzo della miglior rarità disponibile, -30%, solo oggi!
    if (new Date().getDay() === 6) {
      const avail = availableRarities(hero.level);
      const rarity = avail[avail.length - 1];
      const s = slots[seed % slots.length];
      const { base, affixes } = forgeAffixes(s, rarity, seed, 99);
      const suf = RARITY_SUFFIX[rarity][(seed + 17) % RARITY_SUFFIX[rarity].length];
      const r = RARITIES[rarity];
      const full = Math.round(r.value * 2 * (isClass(hero, 'fabbro') ? 0.8 : 1) * discount);
      offers.push({
        id: 'forge-' + today + '-occasione',
        slot: s, rarity, base,
        name: `${base} ${suf}`,
        icon: SLOTS[s].icon,
        xp: r.xp, value: r.value,
        affixes,
        price: Math.round(full * 0.7),
        fullPrice: full,
        special: true,
        desc: descForItem(s, rarity, base, affixes),
      });
    }
    return offers;
  }

  function buyForgeItem(hero, offer) {
    if (hero.gold < offer.price) return 'Oro insufficiente!';
    if (hero.items.some(i => i.forgeId === offer.id)) return 'Già acquistato oggi.';
    hero.gold -= offer.price;
    const { price, ...item } = offer;
    item.forgeId = item.id;
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

  function declareRestDay(hero) {
    const ws = weekStamp();
    if (hero.weekStamp !== ws) { hero.weekStamp = ws; hero.restDaysThisWeek = 0; }
    const maxRest = isClass(hero, 'fata') ? 3 : 2;
    if (hero.restDaysThisWeek >= maxRest) return `Hai già usato i tuoi ${maxRest} Giorni di Riposo questa settimana!`;
    if (hero.restBonus) return 'Hai già un Bonus Riposo attivo: usalo prima!';
    hero.restDaysThisWeek++;
    hero.restBonus = true;
    return null;
  }

  /* ── Taglie Uniche settimanali ────────────────────────────── */
  function weeklyEvent(state) {
    const ws = weekStamp() || '';
    const pool = [
      { name: 'La Stella Cadente',      icon: '🌠', km: 8,  skin: 'Aura di Scintille Dorate' },
      { name: 'Il Mercante Fantasma',   icon: '👻', km: 10, skin: 'Mantello Spettrale' },
      { name: 'L\'Eclissi di Mezzanotte', icon: '🌘', km: 12, skin: 'Stendardo dell\'Eclissi' },
      { name: 'La Cometa Cremisi',      icon: '☄️', km: 9,  skin: 'Criniera di Fuoco per il Destriero' },
    ];
    const rawSeed = [...ws].reduce((s, c) => s + c.charCodeAt(0), 0);
    const seed = Number.isFinite(rawSeed) ? rawSeed : 0;
    const idx = ((seed % pool.length) + pool.length) % pool.length;
    const ev = pool[idx] || pool[0];
    const claimed = (state && state.claimedEvents || []).find(c => c && c.week === ws);
    return { ...ev, week: ws, claimedBy: claimed ? claimed.heroName : null };
  }
  function claimEvent(state, hero, ev) {
    state.claimedEvents = state.claimedEvents || [];
    if (state.claimedEvents.find(c => c.week === ev.week)) return false;
    state.claimedEvents.push({ week: ev.week, heroName: hero.name, skin: ev.skin });
    hero.gold += 50;
    return true;
  }

  /* ── Pass Stagionale ───────────────────────────────────────── */
  const SEASON_PASS = {
    id: 'sole-ardente-1',
    name: 'Stagione del Sole Ardente',
    maxLevel: 50,
    pointsPerLevel: 50,
    pointsPerKm: 10,
    durationDays: 39,
  };

  // Ricompense cosmetiche esclusive del pass (track Premium).
  // img: percorso in assets/seasonpass/rewards/.
  const SEASON_PASS_COSMETICS = [
    { level: 5,  id: 'fiala_deserto',    name: 'Alchimista delle Sabbie',       icon: '🧪', img: 'fiala-deserto.webp',        type: 'titolo' },
    { level: 9,  id: 'runa_sabbia',      name: 'Custode della Runa Infuocata',  icon: '🔥', img: 'runa-sabbia.webp',          type: 'titolo' },
    { level: 13, id: 'cornice_sabbia',   name: 'Cornice di Sabbia',             icon: '🖼️', img: 'cornice-sabbia.webp',       type: 'frame' },
    { level: 18, id: 'scimitarra',       name: 'Portatore della Scimitarra d\'Oro', icon: '⚔️', img: 'scimitarra.webp',      type: 'titolo' },
    { level: 22, id: 'amuleto_sole',     name: 'Benedetto dal Sole Ardente',    icon: '🔆', img: 'amuleto-sole.webp',         type: 'titolo' },
    { level: 27, id: 'scudo_sultano',    name: 'Scudo del Sultano',             icon: '🛡️', img: 'scudo-sultano.webp',        type: 'titolo' },
    { level: 31, id: 'cornice_calore',   name: 'Cornice del Calore',            icon: '🖼️', img: 'cornice-calore.webp',       type: 'frame' },
    { level: 35, id: 'emblema_leone',    name: 'Emblema del Leone',             icon: '🦁', img: 'emblema-leone.webp',        type: 'titolo' },
    { level: 39, id: 'pergamena',        name: 'Cronista della Conquista',      icon: '📜', img: 'pergamena.webp',            type: 'titolo' },
    { level: 43, id: 'cornice_conquista',name: 'Cornice della Conquista',       icon: '🖼️', img: 'cornice-conquista.webp',    type: 'frame' },
    { level: 46, id: 'cornice_sultano',  name: 'Cornice del Sultano',           icon: '🖼️', img: 'cornice-sultano.webp',      type: 'frame' },
    { level: 48, id: 'cavalcatura_leone',name: 'Leone delle Sabbie',            icon: '🦁', img: 'cavalcatura-leone.webp',    type: 'mount' },
    { level: 50, id: 'avatar_conquistatore', name: 'Il Conquistatore delle Lande', icon: '👑', img: 'avatar-conquistatore.webp', type: 'avatar' },
  ];

  function seasonPassState(hero) {
    hero.seasonPass = hero.seasonPass || { seasonId: SEASON_PASS.id, points: 0, claimedFree: [], claimedPremium: [] };
    return hero.seasonPass;
  }

  function seasonPassLevel(points) {
    return Math.min(SEASON_PASS.maxLevel, 1 + Math.floor(Math.max(0, points) / SEASON_PASS.pointsPerLevel));
  }

  function seasonPassStatus(hero) {
    const sp = seasonPassState(hero);
    const level = seasonPassLevel(sp.points);
    const pointsInLevel = sp.points - (level - 1) * SEASON_PASS.pointsPerLevel;
    const pointsForNext = level >= SEASON_PASS.maxLevel ? 0 : SEASON_PASS.pointsPerLevel;
    return {
      ...sp,
      level,
      pointsInLevel: level >= SEASON_PASS.maxLevel ? SEASON_PASS.pointsPerLevel : pointsInLevel,
      pointsForNext,
      maxLevel: SEASON_PASS.maxLevel,
      season: SEASON_PASS,
    };
  }

  function seasonPassCosmeticFor(level) {
    return SEASON_PASS_COSMETICS.find(c => c.level === level) || null;
  }

  // Ricompensa deterministica per livello/track. Track "free": oro/risorse/
  // consumabili comuni. Track "premium": tutto più ricco, oggetti veri agli
  // snodi da 10, cosmetici esclusivi agli snodi definiti in SEASON_PASS_COSMETICS.
  function seasonPassRewardFor(level, track) {
    const cosmetic = track === 'premium' ? seasonPassCosmeticFor(level) : null;
    if (cosmetic) return { type: 'cosmetic', cosmetic, icon: cosmetic.icon, label: cosmetic.name };

    const bracket = level <= 10 ? 'comune' : level <= 25 ? 'raro' : level <= 40 ? 'epico' : 'leggendario';
    const isMilestone10 = level % 10 === 0;
    const isMilestone5 = level % 5 === 0;

    if (track === 'free') {
      if (level === SEASON_PASS.maxLevel) return { type: 'item', minRarity: 'epico', icon: '🎁', label: 'Forziere Epico' };
      if (isMilestone10) return { type: 'consumable', rarity: bracket === 'leggendario' ? 'epico' : bracket, icon: '🧪', label: 'Consumabile' };
      if (isMilestone5) {
        const wood = 30 + level * 2, stone = 20 + level;
        return { type: 'res', wood, stone, icon: '🌲', label: `${wood} Legna + ${stone} Pietra` };
      }
      const amount = 40 + level * 8;
      return { type: 'gold', amount, icon: '🪙', label: `${amount} Oro` };
    }

    // premium (livelli senza cosmetico)
    if (level === SEASON_PASS.maxLevel) return { type: 'item', minRarity: 'leggendario', icon: '🏆', label: 'Forziere Leggendario' };
    if (isMilestone10) return { type: 'item', minRarity: bracket, icon: '⚔️', label: `Oggetto ${bracket}` };
    if (isMilestone5) return { type: 'consumable', rarity: bracket, icon: '🧪', label: 'Consumabile Premium' };
    const amount = 80 + level * 14;
    return { type: 'gold', amount, icon: '🪙', label: `${amount} Oro` };
  }

  function applySeasonPassReward(hero, reward) {
    if (reward.type === 'gold') { hero.gold += reward.amount; return { gold: reward.amount }; }
    if (reward.type === 'res') {
      hero.wood += reward.wood; hero.stone += reward.stone;
      return { wood: reward.wood, stone: reward.stone };
    }
    if (reward.type === 'consumable') {
      const pool = CONSUMABLES.filter(c => c.rarity === reward.rarity);
      const c = pool.length ? pool[Math.floor(Math.random() * pool.length)] : CONSUMABLES[0];
      hero.consumables = hero.consumables || {};
      hero.consumables[c.id] = (hero.consumables[c.id] || 0) + 1;
      return { consumable: c };
    }
    if (reward.type === 'item') {
      const item = genItemFor(hero, reward.minRarity);
      hero.items.push(item);
      return { item };
    }
    if (reward.type === 'cosmetic') {
      const cos = reward.cosmetic;
      hero.cosmetici = hero.cosmetici || { avatar: [], cornici: [], titoli: [] };
      const imgPath = 'assets/seasonpass/rewards/' + cos.img;
      if (cos.type === 'avatar') {
        if (!hero.cosmetici.avatar.some(a => a.src === imgPath)) {
          hero.cosmetici.avatar.push({ src: imgPath, name: cos.name, season: SEASON_PASS.name });
        }
      } else if (cos.type === 'frame') {
        if (!hero.cosmetici.cornici.some(f => f.id === cos.id)) {
          hero.cosmetici.cornici.push({ id: cos.id, img: imgPath, name: cos.name, season: SEASON_PASS.name });
        }
      } else if (cos.type === 'titolo') {
        if (!hero.cosmetici.titoli.some(t => t.id === cos.id)) {
          hero.cosmetici.titoli.push({ id: cos.id, name: cos.name, season: SEASON_PASS.name });
        }
      } else if (cos.type === 'mount') {
        // La cavalcatura esclusiva entra nel sistema stalla, pronta da sellare.
        hero.mountsOwned = hero.mountsOwned || [];
        if (!hero.mountsOwned.includes(SEASON_PASS_MOUNT.id)) hero.mountsOwned.push(SEASON_PASS_MOUNT.id);
      }
      return { cosmetic: cos };
    }
    return {};
  }

  function seasonPassCosmeticById(id) { return SEASON_PASS_COSMETICS.find(c => c.id === id) || null; }

  // Cavalcatura esclusiva del Pass Stagionale — fuori da MOUNTS per non
  // interferire con l'acquisto a oro/livello: si ottiene solo dal pass.
  const SEASON_PASS_MOUNT = {
    id: 'leone_sabbie', name: 'Il Leone delle Sabbie', emoji: '🦁',
    img: 'assets/seasonpass/rewards/cavalcatura-leone.webp',
    level: 0, price: 0, bonus: 40, seasonExclusive: true,
    bio: 'Nato tra le dune infuocate della Stagione del Sole Ardente, questo leone non conosce padroni: solo compagni degni. La sua criniera brucia come il tramonto sul deserto, e il suo passo copre distanze che nessun destriero comune oserebbe affrontare. Chi lo guadagna, lo guadagna per sempre — nessun oro potrebbe comprare la sua fedeltà.',
  };

  function claimSeasonPassReward(hero, level, track) {
    const sp = seasonPassState(hero);
    const status = seasonPassStatus(hero);
    if (level < 1 || level > status.level) return null;
    const key = track === 'premium' ? 'claimedPremium' : 'claimedFree';
    if (sp[key].includes(level)) return null;
    const reward = seasonPassRewardFor(level, track);
    const result = applySeasonPassReward(hero, reward);
    sp[key].push(level);
    return { ...result, reward, level, track };
  }

  /* ── L'Arena: Morra dei Guerrieri (best of 5) ─────────────── */
  const BATTLE_MAX_DAY = 5; // sfide al giorno
  const BATTLE_MOVES = {
    fendente:    { label: 'Fendente',    icon: '⚔️', beats: 'incantesimo',
      flavor: 'Colpisci prima che scagli l\'incantesimo!' },
    parata:      { label: 'Parata',      icon: '🛡️', beats: 'fendente',
      flavor: 'Pari il colpo e contrattacchi!' },
    incantesimo: { label: 'Incantesimo', icon: '✨', beats: 'parata',
      flavor: 'La magia aggira lo scudo!' },
  };
  function battleBeats(a, b) { return BATTLE_MOVES[a] && BATTLE_MOVES[a].beats === b; }
  function randomMove() {
    const k = Object.keys(BATTLE_MOVES);
    return k[Math.floor(Math.random() * k.length)];
  }

  // Quante sfide restano oggi
  function battlesLeft(hero) {
    hero.battles = hero.battles || { date: null, count: 0 };
    const cap = BATTLE_MAX_DAY + Math.round(skillBonus(hero, 'arenaExtraFight'));
    if (hero.battles.date !== todayStamp()) return cap;
    return Math.max(0, cap - hero.battles.count);
  }
  // Consuma una sfida (ritorna false se esaurite)
  function useBattle(hero) {
    const today = todayStamp();
    if (hero.battles.date !== today) hero.battles = { date: today, count: 0 };
    const cap = BATTLE_MAX_DAY + Math.round(skillBonus(hero, 'arenaExtraFight'));
    if (hero.battles.count >= cap) return false;
    hero.battles.count++;
    return true;
  }

  function pickVillain(hero) {
    // preferisce nemici delle zone raggiunte, ma con varietà
    const zones = accessibleZones(hero);
    const near = BESTIARY.filter(b => !b.final && zones.includes(b.zone));
    const pool = (Math.random() < 0.8 && near.length) ? near : BESTIARY.filter(b => !b.final);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Forziere del vincitore (randomico)
  function battleReward(hero, villain) {
    const boss = !!villain.boss;
    const chest = {
      gold: Math.round((boss ? 50 : 20) + hero.level * (boss ? 5 : 2.5) + Math.random() * 20),
      items: [],
      consumable: null,
    };
    if (isClass(hero, 'principessa_ghiacci')) chest.gold = Math.round(chest.gold * 1.30);
    hero.gold += chest.gold;
    const dropChance = boss ? 0.65 : 0.40;
    const dropBoostActive = hero.consumableBuffs && hero.consumableBuffs.dropBoost && hero.consumableBuffs.dropBoost.expiresAt > Date.now();
    const dragonBossBonus = (boss && isClass(hero, 'principessa_draghi')) ? 0.15 : 0;
    const finalChance = dropChance + (dropBoostActive ? hero.consumableBuffs.dropBoost.value : 0) + dragonBossBonus;
    if (Math.random() < finalChance) {
      const it = genItemFor(hero, boss ? 'raro' : null);
      hero.items.push(it);
      chest.items.push(it);
    }
    // consumabile drop: 25% per boss, 10% per nemico normale
    const consChance = boss ? 0.25 : 0.10;
    if (Math.random() < consChance) {
      const cons = dropConsumable(hero, boss ? 'raro' : 'comune');
      if (cons) chest.consumable = cons;
    }
    // boss shield: se attivo garantisce l'item drop anche in caso di sconfitta
    if (boss && hero.consumableBuffs?.bossShield) {
      delete hero.consumableBuffs.bossShield;
      chest.bossShieldActivated = true;
      if (!chest.items.length) {
        const it = genItemFor(hero, 'raro');
        hero.items.push(it);
        chest.items.push(it);
      }
    }
    // Biglietto Gratta e Vinci: 20% boss → Raro, 8% normale → Comune
    const ticketRoll = Math.random();
    if (boss && ticketRoll < 0.20) {
      addTicket(hero, 'raro');
      chest.ticket = 'raro';
    } else if (!boss && ticketRoll < 0.08) {
      addTicket(hero, 'comune');
      chest.ticket = 'comune';
    }
    return chest;
  }

  /* ═══════════════════════════════════════════════════════════
     IL SANTUARIO DEI FAMIGLI — meccaniche stile Tamagotchi
     ═══════════════════════════════════════════════════════════ */

  const PET_SPECIES = {
    ignis:   { name: 'Ignis',   icon: '🔥', desc: 'Nato da un frammento di lava incandescente, cresce fino a diventare un drago di fuoco.',
               bonus: { arenaDmg: 0.10 },        bonusDesc: '+10% danno in Arena' },
    aqua:    { name: 'Marea',   icon: '🌊', desc: 'Sboccia da una perla di corallo e matura in un drago dei mari.',
               bonus: { hygieneDecayMult: 0.5 }, bonusDesc: 'Igiene decade 2× più lentamente' },
    glacio:  { name: 'Glacio',  icon: '❄️', desc: 'Un cristallo di ghiaccio antico che si risveglia in un lupo glaciale.',
               bonus: { moodDecayMult: 0.8 },    bonusDesc: 'Umore decade 20% più lentamente' },
    terras:  { name: 'Terras',  icon: '🏜️', desc: 'Un uovo di sabbia sigillato da geroglifici, custode dei segreti del deserto.',
               bonus: { expeditionMult: 1.3 },   bonusDesc: '+30% risorse dalle spedizioni' },
    umbra:   { name: 'Umbra',   icon: '🌑', desc: 'Un frammento d\'ombra stellata che diventa una tigre cosmica.',
               bonus: { arenaDodge: 0.05 },      bonusDesc: '+5% schivata in Arena' },
    volt:    { name: 'Volt',    icon: '⚡', desc: 'Scintille pure imprigionate in un uovo, destinate a un rapace della tempesta.',
               bonus: { heroXpMult: 0.10 },      bonusDesc: '+10% XP eroe dagli allenamenti' },
    silvano: { name: 'Silvano', icon: '🌿', desc: 'Un seme millenario che germoglia in un guardiano della foresta.',
               bonus: { woodMult: 0.20 },        bonusDesc: '+20% legna raccolta' },
    chronos: { name: 'Chronos', icon: '⏳', desc: 'Un ingranaggio incantato che si trasforma in un gufo dei meccanismi del tempo.',
               bonus: { hungerDecayMult: 0.8 },  bonusDesc: 'Fame decade 20% più lentamente' },
  };
  const PET_SPECIES_KEYS = Object.keys(PET_SPECIES);
  const PET_EVOLUTION_STAGES = 5;
  const PET_LEVELS_PER_STAGE = 4;

  // Ricompense e sblocchi per stadio (stadio 1 = schiusa immediata)
  const PET_STAGE_REWARDS = {
    2: { gold: 30,               msg: '🎒 Spedizioni di Foraggiamento sbloccate!' },
    3: { gold: 60,  wood: 20,   msg: '💭 Desideri Improvvisi del famiglio attivati!' },
    4: { gold: 100, wood: 30, stone: 30, msg: '⚔️ Bonus Arena al massimo!' },
    5: { gold: 200, wood: 50, stone: 50, msg: '🌟 FORMA LEGGENDARIA! Bonus specie raddoppiato!' },
  };

  function petStage(level) {
    if (level <= 1) return 1;
    return Math.min(PET_EVOLUTION_STAGES, Math.floor((level - 1) / PET_LEVELS_PER_STAGE) + 1);
  }

  function petStageUnlocks(stage) {
    return {
      care:       stage >= 1, // subito dopo schiusa
      expedition: stage >= 2, // livello 5
      wish:       stage >= 3, // livello 9
      fullArena:  stage >= 4, // livello 13
      legendary:  stage >= 5, // livello 17 — bonus specie x2
    };
  }

  function petSpeciesBonus(hero) {
    if (!hero.pet || !hero.pet.hatched || hero.pet.sick) return {};
    const sp = PET_SPECIES[hero.pet.species];
    if (!sp || !sp.bonus) return {};
    const isLegendary = petStage(hero.pet.level) >= PET_EVOLUTION_STAGES;
    const mult = isLegendary ? 2 : 1;
    const b = {};
    for (const k of Object.keys(sp.bonus)) b[k] = sp.bonus[k] * mult;
    return b;
  }

  const PET_PERSONALITIES = {
    goloso: { name: 'Golosone', icon: '🍖',
      desc: 'La fame scende il 30% più in fretta, ma regala +5% XP extra all\'eroe.',
      hungerRateMult: 1.3, moodRateMult: 1, xpBonus: 0.05 },
    iperattivo: { name: 'Iperattivo', icon: '⚡',
      desc: 'L\'umore cala rapidamente se non gioca, ma se felice raddoppia i danni critici in Arena.',
      hungerRateMult: 1, moodRateMult: 1.5, critMult: 2 },
    dormiglione: { name: 'Dormiglione', icon: '💤',
      desc: 'Si ammala più difficilmente, ma va messo a nanna rigorosamente prima delle 21:30.',
      hungerRateMult: 1, moodRateMult: 0.8, sickResist: true, sleepDeadlineHour: 21.5 },
  };

  const PET_FOODS = {
    mela:    { name: 'Mela', icon: '🍎', price: 5,  restoreHunger: 20 },
    pesce:   { name: 'Pesce Fresco', icon: '🐟', price: 15, restoreHunger: 45 },
    bistecca:{ name: 'Bistecca Epica', icon: '🥩', price: 50, restoreHunger: 100 },
  };

  const PET_ACCESSORIES = {
    // ── Acquistabili ──────────────────────────────────────────────
    cappello:  { name: 'Cappellino da Pirata',    icon: '🏴‍☠️', price: 80,
                 desc: '+1 Coraggio per ogni sessione di corsa.' },
    collare:   { name: 'Collare Magico',           icon: '🔮',   price: 60,
                 desc: 'Decadimento umore ridotto del 20%.' },
    occhiali:  { name: 'Occhiali Steampunk',       icon: '🥽',   price: 100,
                 desc: '+1 Astuzia per ogni sessione di camminata.' },
    // ── Guadagnati (sbloccabili) ──────────────────────────────────
    medaglione:{ name: 'Medaglione del Corridore', icon: '🏅',   price: null,
                 desc: '+2 Coraggio per ogni vittoria in Arena.',
                 unlock: { label: '100 km percorsi totali', check: h => (h.totalKm || 0) >= 100 } },
    fiocco:    { name: 'Fiocco della Vittoria',    icon: '🎀',   price: null,
                 desc: 'Rischio spedizione ridotto del 10%.',
                 unlock: { label: '20 sessioni di allenamento', check: h => (h.totalSessions || 0) >= 20 } },
    mantello:  { name: 'Mantello del Viandante',   icon: '🧣',   price: null,
                 desc: '+2 Lealtà per ogni azione di cura.',
                 unlock: { label: 'Famiglio al Livello 10', check: h => !!(h.pet && (h.pet.level || 0) >= 10) } },
  };

  function checkAccessoryUnlocks(hero) {
    if (!hero.pet || !hero.pet.hatched) return;
    hero.pet.accessoriesOwned = hero.pet.accessoriesOwned || [];
    Object.entries(PET_ACCESSORIES).forEach(([key, acc]) => {
      if (acc.unlock && !hero.pet.accessoriesOwned.includes(key) && acc.unlock.check(hero))
        hero.pet.accessoriesOwned.push(key);
    });
  }

  const PET_VIRTUE_META = {
    coraggio: { name: 'Coraggio', icon: '⚔️', color: '#e8604c',
      desc: 'Cresce con corsa e cyclette, vittorie in Arena e Scalata, spedizioni.',
      synergyDesc: 'Attacca il nemico per danni bonus diretti (solo in Scalata).' },
    astuzia:  { name: 'Astuzia',  icon: '✨', color: '#9b59b6',
      desc: 'Cresce con le camminate e i consumabili strategici.',
      synergyDesc: 'Forza il nemico a muoversi normalmente questo round (solo in Scalata).' },
    lealta:   { name: 'Lealtà',   icon: '💚', color: '#27ae60',
      desc: 'Cresce con la cura — nutrimento, gioco, pulizia, accessi giornalieri.',
      synergyDesc: 'Ti cura per il 25% degli HP massimi.' },
  };

  const PET_EXPEDITION_ZONES = {
    vicino: {
      name: 'Foresta Vicina', icon: '🌲', hours: 1,
      risk: 0.05, xp: 6,
      loot: { wood: [3, 8], stone: [1, 4], gold: [5, 15] },
      desc: '1h · Basso rischio · Bottino modesto',
    },
    medio: {
      name: 'Le Rovine Antiche', icon: '🏛️', hours: 4,
      risk: 0.15, xp: 10,
      loot: { wood: [8, 20], stone: [5, 14], gold: [15, 40] },
      desc: '4h · Rischio medio · Buon bottino',
    },
    lontano: {
      name: 'Il Picco Oscuro', icon: '🏔️', hours: 8,
      risk: 0.25, xp: 16,
      loot: { wood: [18, 38], stone: [12, 28], gold: [35, 75] },
      desc: '8h · Alto rischio · Bottino ricco',
    },
  };

  const PHOENIX_POTION_PRICE = 500;
  const EXPEDITION_HOURS = 2; // legacy fallback

  function clamp01to100(n) { return Math.max(0, Math.min(100, n)); }

  function addPetVirtue(hero, type, amount) {
    const p = hero.pet;
    if (!p || !p.hatched || p.sick) return;
    p[type] = Math.round(((p[type] || 0) + amount) * 10) / 10;
  }

  function petDominantVirtue(hero) {
    const p = hero.pet;
    if (!p || !p.hatched) return null;
    const c = p.coraggio || 0, a = p.astuzia || 0, l = p.lealta || 0;
    if (c === 0 && a === 0 && l === 0) return null;
    if (c >= a && c >= l) return 'coraggio';
    if (a >= c && a >= l) return 'astuzia';
    return 'lealta';
  }

  function addPetMemory(hero, text) {
    const p = hero.pet;
    if (!p || !p.hatched) return;
    const today = todayStamp();
    p.memories = p.memories || [];
    const last = p.memories[p.memories.length - 1];
    if (last && last.date === today && last.text === text) return;
    p.memories.push({ text, date: today });
    if (p.memories.length > 8) p.memories.shift();
  }

  function usePetSynergy(hero, context) {
    const p = hero.pet;
    if (!p || !p.hatched || p.sick) return 'Il tuo famiglio non può aiutarti ora.';
    if ((p.hunger || 0) < 20) return `${p.name} ha troppa fame — nutrilo prima!`;
    if ((p.mood || 0) < 20)   return `${p.name} è di cattivo umore — giocaci prima!`;
    const today = todayStamp();
    if (p.lastSynergyDate === today) return `${p.name} ha già usato la sua sinergia oggi.`;
    const virtue = petDominantVirtue(hero);
    if (!virtue) return `${p.name} non ha ancora una virtù dominante — crescila giocando!`;
    p.lastSynergyDate = today;

    if (virtue === 'coraggio') {
      if (context === 'scalata') {
        const s = hero.activeScalata;
        if (!s || s.done || s.interlude) { p.lastSynergyDate = null; return 'Nessun combattimento in corso.'; }
        const dmg = 20 + Math.round(s.floor * 2.5);
        s.enemyHp = Math.max(0, s.enemyHp - dmg);
        const enemyDefeated = s.enemyHp <= 0;
        if (enemyDefeated) { s.interlude = true; }
        addPetMemory(hero, `ho attaccato il nemico al piano ${s.floor} della Scalata!`);
        return { ok: true, virtue, effect: 'attack', dmg, enemyDefeated };
      }
      p.lastSynergyDate = null;
      return `La sinergia di ${p.name} da Coraggio funziona solo durante una Scalata attiva.`;
    }

    if (virtue === 'astuzia') {
      if (context === 'scalata') {
        const s = hero.activeScalata;
        if (!s || s.done || s.interlude) { p.lastSynergyDate = null; return 'Nessun combattimento in corso.'; }
        s.enemyMoveType = 'normal'; // forza mossa normale questo round
        addPetMemory(hero, `ho studiato il nemico e l'ho reso prevedibile al piano ${s.floor}!`);
        return { ok: true, virtue, effect: 'neutralize' };
      }
      p.lastSynergyDate = null;
      return `La sinergia di ${p.name} da Astuzia funziona solo durante una Scalata attiva.`;
    }

    if (virtue === 'lealta') {
      if (context === 'scalata') {
        const s = hero.activeScalata;
        if (!s || s.done) { p.lastSynergyDate = null; return 'Nessun combattimento in corso.'; }
        const heal = Math.round((s.heroMaxHp || 100) * 0.25);
        s.heroHp = Math.min(s.heroMaxHp, (s.heroHp || 0) + heal);
        addPetMemory(hero, `ti ho curato in un momento critico al piano ${s.floor}!`);
        return { ok: true, virtue, effect: 'heal', heal };
      }
      return { ok: true, virtue, effect: 'heal', heal: 25 };
    }

    return null;
  }

  const EGG_KM_NEEDED = 30;

  function createPet(hero) {
    const keys = Object.keys(PET_PERSONALITIES);
    const personality = keys[Math.floor(Math.random() * keys.length)];
    const species = PET_SPECIES_KEYS[Math.floor(Math.random() * PET_SPECIES_KEYS.length)];
    const now = Date.now();
    return {
      name: PET_SPECIES[species].name,
      species,
      level: 0, xp: 0,
      hatched: false,
      eggKmStart: hero ? hero.totalKm : 0,
      personality,
      hunger: 100, mood: 100, hygiene: 100, energy: 100,
      lastTick: now,
      kmAtLastClean: 0,
      sick: false, sickDays: 0, sickCheckedDate: null,
      sleptToday: false, energyDate: null, restedBonusActive: false,
      wish: null, wishCooldownUntil: now + 3 * 3600000,
      accessory: null, accessoriesOwned: [],
      expedition: null,
      coraggio: 0, astuzia: 0, lealta: 0,
      lastSynergyDate: null,
      memories: [],
    };
  }

  function petXpForLevel(level) { return 40 + level * 20 + Math.floor(level * level * 1.5); }

  // L'Incubatrice: prima della schiusa il famiglio è solo un uovo che
  // si scalda con i km reali percorsi. Nessun'altra meccanica esiste
  // finché non viene rotto il guscio.
  function eggProgress(hero) {
    const p = hero.pet;
    if (!p || p.hatched) return null;
    const km = Math.max(0, hero.totalKm - (p.eggKmStart || 0));
    const pct = Math.min(100, Math.round(km / EGG_KM_NEEDED * 100));
    return { km, needed: EGG_KM_NEEDED, pct, ready: pct >= 100 };
  }

  function hatchPet(hero) {
    const p = hero.pet;
    if (!p) return 'Non hai ancora un famiglio.';
    if (p.hatched) return 'Il tuo famiglio è già nato.';
    const prog = eggProgress(hero);
    if (!prog || !prog.ready) return 'Il tuo famiglio non è ancora pronto per schiudersi.';
    p.hatched = true;
    p.level = 1;
    p.lastTick = Date.now();
    return { ok: true };
  }

  // Ricalcola le barre in base al tempo reale trascorso. Va chiamata
  // prima di leggere/mostrare lo stato del pet.
  function tickPet(hero) {
    if (!hero.pet || !hero.pet.hatched) return;
    const p = hero.pet;
    const pers = PET_PERSONALITIES[p.personality] || PET_PERSONALITIES.goloso;
    const sb = petSpeciesBonus(hero);
    const now = Date.now();
    const hoursElapsed = Math.max(0, (now - p.lastTick) / 3600000);
    if (hoursElapsed > 0) {
      const petSlowMult = 1 - skillBonus(hero, 'petHungerSlow');
      const hungerRate = (20 / 6) * pers.hungerRateMult * (sb.hungerDecayMult || 1) * petSlowMult;
      const accMoodMult = p.accessory === 'collare' ? 0.8 : 1;
      const moodRate = (25 / 24) * pers.moodRateMult * (sb.moodDecayMult || 1) * accMoodMult * petSlowMult;
      p.hunger = clamp01to100(p.hunger - hungerRate * hoursElapsed);
      p.mood = clamp01to100(p.mood - moodRate * hoursElapsed);
      p.lastTick = now;
    }
    // Igiene: legata ai km percorsi dall'ultimo bagno, non al tempo
    const kmDirty = Math.max(0, hero.totalKm - (p.kmAtLastClean || 0));
    const hygieneKmPerTick = 3.5 / (sb.hygieneDecayMult || 1);
    p.hygiene = clamp01to100(100 - Math.floor(kmDirty / hygieneKmPerTick) * 20);

    // Rollover giornaliero: energia (sonno) + malattia
    const today = todayStamp();
    if (p.energyDate !== today) {
      const wasGoodSleep = !!p.sleptToday;
      p.energy = wasGoodSleep ? 100 : 60;
      p.restedBonusActive = wasGoodSleep;
      p.sleptToday = false;
      p.energyDate = today;
      // Lealtà giornaliera per accesso (piccolo bonus — la crescita principale è dai workout)
      addPetVirtue(hero, 'lealta', 2);
    }
    if (p.sickCheckedDate !== today) {
      p.sickCheckedDate = today;
      if (p.hunger <= 0 && p.mood <= 0) {
        p.sickDays = (p.sickDays || 0) + (pers.sickResist ? 0.5 : 1);
      } else {
        p.sickDays = 0;
      }
      if (p.sickDays >= 2) p.sick = true;
    }
    // Scadenza della richiesta improvvisa
    if (p.wish && now > p.wish.deadline) p.wish = null;
    // Genera una nuova richiesta ogni tanto (se non ce n'è già una attiva)
    if (!p.wish && now > (p.wishCooldownUntil || 0) && Math.random() < 0.30 && petStageUnlocks(petStage(p.level)).wish) {
      const foodKeys = Object.keys(PET_FOODS);
      const item = foodKeys[Math.floor(Math.random() * foodKeys.length)];
      p.wish = { item, deadline: now + 90 * 60000 };
      p.wishCooldownUntil = now + 4 * 3600000;
    }
    // Segnale pre-malattia: entrambe le barre critiche
    p.atRisk = !p.sick && p.hunger < 20 && p.mood < 20;
    // Risoluzione automatica della spedizione se il tempo è scaduto
    // (rimane "da riscuotere" finché non si preme il pulsante apposito)
  }

  function petArenaBonus(hero) {
    const out = { dmgBonus: 0, hpBonus: 0, dodgeChance: 0, critMult: 1 };
    if (!hero.pet || !hero.pet.hatched) return out;
    const p = hero.pet;
    if (p.sick) return out;
    const moodFactor = p.mood >= 80 ? 1 : (p.mood >= 50 ? 0.5 : 0);
    if (p.hunger <= 0 || moodFactor === 0) return out;
    const pers = PET_PERSONALITIES[p.personality];
    if (pers && pers.critMult && p.mood >= 80) out.critMult = pers.critMult;

    // Dieta motoria: l'attività prevalente dell'eroe plasma il bonus
    const km = hero.kmByType || {};
    const best = Object.entries({ corsa: km.corsa || 0, cyclette: km.cyclette || 0, camminata: km.camminata || 0 })
      .sort((a, b) => b[1] - a[1])[0];
    if (best && best[1] > 0) {
      if (best[0] === 'corsa') out.dodgeChance = 0.10 * moodFactor;
      if (best[0] === 'cyclette') out.hpBonus = Math.round(20 * moodFactor);
      if (best[0] === 'camminata') out.dmgBonus = Math.round(6 * moodFactor);
    }
    // Bonus passivo della specie
    const sb = petSpeciesBonus(hero);
    if (sb.arenaDmg)   out.dmgBonus   += Math.round(34 * sb.arenaDmg);
    if (sb.arenaDodge) out.dodgeChance = Math.min(0.30, out.dodgeChance + sb.arenaDodge);
    return out;
  }

  function classArenaBonus(hero, villain) {
    const out = { dmgBonus: 0, hpBonus: 0 };
    if (isClass(hero, 'paladino')) { out.dmgBonus = Math.round(34 * 0.12); out.hpBonus = Math.round(100 * 0.12); }
    if (isClass(hero, 'regina') && villain && villain.boss) { out.dmgBonus += Math.round(34 * 0.15); }
    if (isClass(hero, 'principessa_ghiacci')) { out.dmgBonus += Math.round(34 * 0.20); }
    if (isClass(hero, 'principessa_draghi') && villain && villain.boss) { out.dmgBonus += Math.round(34 * 0.25); }
    return out;
  }

  function feedPet(hero, foodKey) {
    if (!hero.pet || !hero.pet.hatched) return 'Il tuo famiglio è ancora un uovo: non ha bisogno di cibo, solo di km per schiudersi.';
    const food = PET_FOODS[foodKey];
    if (!food) return 'Cibo sconosciuto.';
    if (hero.gold < food.price) return 'Oro insufficiente!';
    tickPet(hero);
    hero.gold -= food.price;
    hero.pet.hunger = clamp01to100(hero.pet.hunger + food.restoreHunger);
    let wishFulfilled = false;
    if (hero.pet.wish && hero.pet.wish.item === foodKey) {
      hero.pet.mood = 100;
      hero.pet.wish = null;
      wishFulfilled = true;
    }
    addPetVirtue(hero, 'lealta', hero.pet.accessory === 'mantello' ? 4 : 2);
    const evoFeed = addPetXp(hero, 1);
    return { ok: true, wishFulfilled, ...(evoFeed || {}) };
  }

  function playWithPet(hero) {
    if (!hero.pet || !hero.pet.hatched) return 'Il tuo famiglio è ancora un uovo: aspetta la schiusa!';
    const STAMINA_COST = 5;
    if ((hero.stamina || 0) < STAMINA_COST) return `Stamina insufficiente (hai ${(hero.stamina || 0).toFixed(1)}/${STAMINA_COST}). Registra una sessione di corsa per generarla — camminata e cyclette non contano.`;
    tickPet(hero);
    hero.stamina -= STAMINA_COST;
    hero.pet.mood = clamp01to100(hero.pet.mood + 25);
    addPetVirtue(hero, 'lealta', hero.pet.accessory === 'mantello' ? 5 : 3);
    const evoPlay = addPetXp(hero, 1);
    return { ok: true, ...(evoPlay || {}) };
  }

  function cleanPet(hero) {
    if (!hero.pet || !hero.pet.hatched) return 'Il tuo famiglio è ancora un uovo: aspetta la schiusa!';
    const WOOD_COST = 10, STONE_COST = 10;
    if (hero.wood < WOOD_COST || hero.stone < STONE_COST) return `Serve più legna/pietra (hai 🌲${hero.wood}/⛏️${hero.stone}, servono ${WOOD_COST}/${STONE_COST}).`;
    tickPet(hero);
    hero.wood -= WOOD_COST; hero.stone -= STONE_COST;
    hero.pet.kmAtLastClean = hero.totalKm;
    hero.pet.hygiene = 100;
    const evoClean = addPetXp(hero, 1);
    return { ok: true, ...(evoClean || {}) };
  }

  function sleepPet(hero) {
    if (!hero.pet || !hero.pet.hatched) return 'Il tuo famiglio è ancora un uovo: aspetta la schiusa!';
    tickPet(hero);
    const pers = PET_PERSONALITIES[hero.pet.personality];
    const deadline = (pers && pers.sleepDeadlineHour) || 22;
    const hourNow = new Date().getHours() + new Date().getMinutes() / 60;
    if (hourNow >= deadline) {
      hero.pet.sleptToday = false;
      return `Sono già le ${Math.floor(hourNow)}:${String(new Date().getMinutes()).padStart(2, '0')}... troppo tardi per un sonno perfetto (limite ore ${deadline}). Ci riproverai domani!`;
    }
    hero.pet.sleptToday = true;
    return { ok: true };
  }

  function curePet(hero) {
    if (!hero.pet || !hero.pet.hatched) return 'Il tuo famiglio è ancora un uovo: non può ammalarsi.';
    if (!hero.pet.sick) return 'Il tuo famiglio non è malato.';
    if (hero.gold < PHOENIX_POTION_PRICE) return `Serve la Pozione della Fenice: ${PHOENIX_POTION_PRICE} monete (hai ${hero.gold}).`;
    hero.gold -= PHOENIX_POTION_PRICE;
    hero.pet.sick = false; hero.pet.sickDays = 0;
    hero.pet.hunger = 50; hero.pet.mood = 50;
    return { ok: true };
  }

  function buyAccessory(hero, key) {
    if (!hero.pet || !hero.pet.hatched) return 'Il tuo famiglio è ancora un uovo: aspetta la schiusa!';
    const acc = PET_ACCESSORIES[key];
    if (!acc) return 'Accessorio sconosciuto.';
    const owned = hero.pet.accessoriesOwned.includes(key);
    if (!owned) {
      if (acc.price == null) return 'Questo accessorio non è ancora sbloccato.';
      if (hero.gold < acc.price) return 'Oro insufficiente!';
      hero.gold -= acc.price;
      hero.pet.accessoriesOwned.push(key);
    }
    hero.pet.accessory = hero.pet.accessory === key ? null : key;
    return { ok: true };
  }

  // Il famiglio si blocca allo stadio 4 finché l'eroe non raggiunge il livello 60.
  const PET_LEGENDARY_HERO_LV = 60;
  const PET_MAX_LEVEL_BEFORE_LEGENDARY = PET_LEVELS_PER_STAGE * (PET_EVOLUTION_STAGES - 1); // 16

  function addPetXp(hero, amount) {
    if (!hero.pet || hero.pet.hunger <= 0 || hero.pet.sick) return; // affamato o malato: non cresce
    const bonus = hero.pet.restedBonusActive ? 1.2 : 1;
    hero.pet.xp += Math.round(amount * bonus);
    const prevStage = petStage(hero.pet.level);
    const heroLv = hero.level || 1;
    while (hero.pet.xp >= petXpForLevel(hero.pet.level)) {
      // Blocca allo stadio 4 finché l'eroe non raggiunge lv 60
      if (hero.pet.level >= PET_MAX_LEVEL_BEFORE_LEGENDARY && heroLv < PET_LEGENDARY_HERO_LV) {
        hero.pet.xp = petXpForLevel(hero.pet.level) - 1; // barra quasi piena ma ferma
        break;
      }
      hero.pet.xp -= petXpForLevel(hero.pet.level);
      hero.pet.level++;
    }
    const newStage = petStage(hero.pet.level);
    if (newStage > prevStage) {
      const reward = PET_STAGE_REWARDS[newStage] || {};
      if (reward.gold)  hero.gold  = (hero.gold  || 0) + reward.gold;
      if (reward.wood)  hero.wood  = (hero.wood  || 0) + reward.wood;
      if (reward.stone) hero.stone = (hero.stone || 0) + reward.stone;
      return { evolved: true, stage: newStage, reward };
    }
    return null;
  }

  function startExpedition(hero, zone) {
    if (!hero.pet || !hero.pet.hatched) return 'Il tuo famiglio è ancora un uovo: aspetta la schiusa!';
    if (!petStageUnlocks(petStage(hero.pet.level)).expedition) return `Le spedizioni si sbloccano al livello 5. Il tuo famiglio è al livello ${hero.pet.level}.`;
    if (hero.pet.expedition) return 'Il tuo famiglio è già in spedizione.';
    if (hero.pet.sick) return 'Il tuo famiglio è malato: deve prima guarire.';
    if ((hero.pet.hunger || 0) < 30) return `${hero.pet.name} ha troppa fame per partire — nutrilo prima!`;
    if ((hero.pet.mood || 0) < 30)   return `${hero.pet.name} è di cattivo umore — giocaci prima!`;
    const z = PET_EXPEDITION_ZONES[zone] || PET_EXPEDITION_ZONES.vicino;
    hero.pet.expedition = { startedAt: Date.now(), kmAtStart: hero.totalKm, zone: zone || 'vicino', durationH: z.hours };
    return { ok: true, zone: zone || 'vicino' };
  }

  function expeditionStatus(hero) {
    if (!hero.pet || !hero.pet.expedition) return null;
    const exp = hero.pet.expedition;
    const durationH = exp.durationH || EXPEDITION_HOURS;
    const elapsedH = (Date.now() - exp.startedAt) / 3600000;
    const zone = PET_EXPEDITION_ZONES[exp.zone] || PET_EXPEDITION_ZONES.vicino;
    return {
      ready: elapsedH >= durationH,
      pctDone: Math.min(100, Math.round(elapsedH / durationH * 100)),
      zone: exp.zone || 'vicino',
      zoneName: zone.name,
      durationH,
    };
  }

  function collectExpedition(hero) {
    if (!hero.pet || !hero.pet.expedition) return null;
    const status = expeditionStatus(hero);
    if (!status.ready) return null;
    const exp = hero.pet.expedition;
    const zone = PET_EXPEDITION_ZONES[exp.zone] || PET_EXPEDITION_ZONES.vicino;
    const kmDuring = Math.max(0, hero.totalKm - exp.kmAtStart);
    hero.pet.expedition = null;

    // Risk modified by pet mood, consumable buff, and accessory
    const moodFactor = (hero.pet.mood || 0) < 50 ? 1.5 : 1;
    const riskMult = hero.consumableBuffs?.expeditionRiskMult ?? 1;
    if (hero.consumableBuffs?.expeditionRiskMult !== undefined) delete hero.consumableBuffs.expeditionRiskMult;
    const accRiskMult = hero.pet.accessory === 'fiocco' ? 0.9 : 1;
    if (Math.random() < zone.risk * moodFactor * riskMult * accRiskMult) {
      addPetMemory(hero, `ho esplorato ${zone.name.toLowerCase()} ma sono tornato a mani vuote...`);
      return { failed: true, zone: exp.zone };
    }

    const kmBonus = Math.min(2.5, 1 + kmDuring * 0.07);
    const sb = petSpeciesBonus(hero);
    const mult = (sb.expeditionMult || 1) * kmBonus;

    const rng = (min, max) => min + Math.round(Math.random() * (max - min));
    const result = {
      wood:  Math.round(rng(...zone.loot.wood)  * mult),
      stone: Math.round(rng(...zone.loot.stone) * mult),
      gold:  Math.round(rng(...zone.loot.gold)  * mult),
      zone: exp.zone,
      epic: kmDuring >= 5,
    };
    hero.wood += result.wood; hero.stone += result.stone; hero.gold += result.gold;
    addPetVirtue(hero, 'coraggio', 2);
    addPetMemory(hero, `ho esplorato ${zone.name.toLowerCase()} e ho portato del bottino!`);
    const evoExp = addPetXp(hero, zone.xp);
    return { ...result, ...(evoExp || {}) };
  }

  /* ═══════════════════════════════════════════════════════════
     ESPANSIONE DEL RIFUGIO — 20 set di cimeli, 200 oggetti
     ═══════════════════════════════════════════════════════════ */

  const FURNITURE_SETS = [
    {
      id: "set01", num: 1, name: "I Cimeli di Oakhaven",
      biomeIdx: 0, fallbackIcon: "🏚️",
      setBonusDesc: "+10% XP base da tutte le Camminate",
      setBonusEffects: [{"type": "xpMult", "activity": "camminata", "value": 0.1}],
      items: [
        {id: "f001", name: "Tappeto Intrecciato di Oakhaven", bonusText: "+0.5% XP Camminata", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "camminata", "value": 0.005}], price: {"gold": 11, "wood": 4, "stone": 3}, img: "assets/ui/rifugio/furniture/set01/01.webp"},
        {id: "f002", name: "Torcia in Legno Grezzo", bonusText: "+1% Monete trovate", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 12, "wood": 4, "stone": 3}, img: "assets/ui/rifugio/furniture/set01/02.webp"},
        {id: "f003", name: "Tavolo della Taverna", bonusText: "+1% Legna trovata", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.01}], price: {"gold": 14, "wood": 4, "stone": 4}, img: "assets/ui/rifugio/furniture/set01/03.webp"},
        {id: "f004", name: "Sgabello a Tre Gambe", bonusText: "+0.5% XP Camminata", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "camminata", "value": 0.005}], price: {"gold": 15, "wood": 5, "stone": 4}, img: "assets/ui/rifugio/furniture/set01/04.webp"},
        {id: "f005", name: "Scudo di Legno Scheggiato", bonusText: "+1% Danni in Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 17, "wood": 8, "stone": 10}, img: "assets/ui/rifugio/furniture/set01/05.webp"},
        {id: "f006", name: "Mappa della Foresta", bonusText: "+1% Probabilità di trovare Progetti", epic: false, wall: true, effects: [{"type": "dropProjectChance", "value": 0.01}], price: {"gold": 18, "wood": 8, "stone": 11}, img: "assets/ui/rifugio/furniture/set01/06.webp"},
        {id: "f007", name: "Statuina del Gufo", bonusText: "+0.5% XP Camminata", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "camminata", "value": 0.005}], price: {"gold": 20, "wood": 6, "stone": 5}, img: "assets/ui/rifugio/furniture/set01/07.webp"},
        {id: "f008", name: "Mola per Affilare", bonusText: "+1% Danni in Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 21, "wood": 7, "stone": 6}, img: "assets/ui/rifugio/furniture/set01/08.webp"},
        {id: "f009", name: "Cesta di Mele", bonusText: "+1 Stamina massima", epic: false, wall: false, effects: [{"type": "staminaMax", "value": 1.0}], price: {"gold": 22, "wood": 7, "stone": 6}, img: "assets/ui/rifugio/furniture/set01/09.webp"},
        {id: "f010", name: "Lo Stendardo del Viandante", bonusText: "+2% XP Camminata", epic: true, wall: false, effects: [{"type": "xpMult", "activity": "camminata", "value": 0.02}], price: {"gold": 72, "wood": 23, "stone": 20}, img: "assets/ui/rifugio/furniture/set01/10.webp"},
      ],
    },
    {
      id: "set02", num: 2, name: "L'Arsenale del Fabbro",
      biomeIdx: 5, fallbackIcon: "⚙️",
      setBonusDesc: "Sconto del 15% su tutti gli acquisti nel Mercato",
      setBonusEffects: [{"type": "marketDiscount", "value": 0.15}],
      items: [
        {id: "f011", name: "Pavimentazione in Pietra Lavica", bonusText: "+0.5% Pietra trovata", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.005}], price: {"gold": 17, "wood": 5, "stone": 5}, img: "assets/ui/rifugio/furniture/set02/01.webp"},
        {id: "f012", name: "Braciere a Carbone", bonusText: "+1% Pietra trovata", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 19, "wood": 6, "stone": 5}, img: "assets/ui/rifugio/furniture/set02/02.webp"},
        {id: "f013", name: "Banco da Lavoro in Ferro", bonusText: "Sconto 1% al Mercato", epic: false, wall: false, effects: [{"type": "marketDiscount", "value": 0.01}], price: {"gold": 21, "wood": 7, "stone": 6}, img: "assets/ui/rifugio/furniture/set02/03.webp"},
        {id: "f014", name: "Sedia del Mastro Fabbro", bonusText: "Sconto 1% al Mercato", epic: false, wall: false, effects: [{"type": "marketDiscount", "value": 0.01}], price: {"gold": 24, "wood": 8, "stone": 6}, img: "assets/ui/rifugio/furniture/set02/04.webp"},
        {id: "f015", name: "Rastrelliera per Spade", bonusText: "+2% Danni in Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.02}], price: {"gold": 26, "wood": 12, "stone": 15}, img: "assets/ui/rifugio/furniture/set02/05.webp"},
        {id: "f016", name: "Ruota Dentata Gigante", bonusText: "+1% Probabilità doppio drop risorse", epic: false, wall: true, effects: [{"type": "doubleDropChance", "value": 0.01}], price: {"gold": 28, "wood": 13, "stone": 17}, img: "assets/ui/rifugio/furniture/set02/06.webp"},
        {id: "f017", name: "Scultura di Ruggine", bonusText: "Sconto 1% al Mercato", epic: false, wall: false, effects: [{"type": "marketDiscount", "value": 0.01}], price: {"gold": 30, "wood": 10, "stone": 8}, img: "assets/ui/rifugio/furniture/set02/07.webp"},
        {id: "f018", name: "Incudine Fumante", bonusText: "Sconto 2% al Mercato", epic: false, wall: false, effects: [{"type": "marketDiscount", "value": 0.02}], price: {"gold": 33, "wood": 10, "stone": 9}, img: "assets/ui/rifugio/furniture/set02/08.webp"},
        {id: "f019", name: "Cassa in Ferro Battuto", bonusText: "+1% Pietra trovata", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 35, "wood": 11, "stone": 9}, img: "assets/ui/rifugio/furniture/set02/09.webp"},
        {id: "f020", name: "Il Martello del Titano", bonusText: "+3% Danni in Arena e Sconto 2% Mercato", epic: true, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.03}, {"type": "marketDiscount", "value": 0.02}], price: {"gold": 111, "wood": 35, "stone": 30}, img: "assets/ui/rifugio/furniture/set02/10.webp"},
      ],
    },
    {
      id: "set03", num: 3, name: "Lo Studio dell'Alchimista",
      biomeIdx: 6, fallbackIcon: "⚗️",
      setBonusDesc: "+20% Monete d'oro da ogni attività",
      setBonusEffects: [{"type": "goldMult", "value": 0.2}],
      items: [
        {id: "f021", name: "Lastra Runica Elementale", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 23, "wood": 7, "stone": 6}, img: "assets/ui/rifugio/furniture/set03/01.webp"},
        {id: "f022", name: "Lampadario a Cristalli Fluttuanti", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 26, "wood": 8, "stone": 7}, img: "assets/ui/rifugio/furniture/set03/02.webp"},
        {id: "f023", name: "Scrivania con Alambicchi", bonusText: "+2% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.02}], price: {"gold": 29, "wood": 9, "stone": 8}, img: "assets/ui/rifugio/furniture/set03/03.webp"},
        {id: "f024", name: "Poltrona da Lettura in Velluto", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 32, "wood": 10, "stone": 9}, img: "assets/ui/rifugio/furniture/set03/04.webp"},
        {id: "f025", name: "Scaffale delle Pozioni", bonusText: "+1% XP Corsa", epic: false, wall: true, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 35, "wood": 16, "stone": 21}, img: "assets/ui/rifugio/furniture/set03/05.webp"},
        {id: "f026", name: "Arazzo delle Formule Alchemiche", bonusText: "+1% XP Corsa", epic: false, wall: true, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 38, "wood": 17, "stone": 23}, img: "assets/ui/rifugio/furniture/set03/06.webp"},
        {id: "f027", name: "Calderone Ribollente", bonusText: "+2% Probabilità drop Progetti rari", epic: false, wall: false, effects: [{"type": "dropProjectChance", "value": 0.02}], price: {"gold": 41, "wood": 13, "stone": 11}, img: "assets/ui/rifugio/furniture/set03/07.webp"},
        {id: "f028", name: "Mortaio dell'Alchimista", bonusText: "+2% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.02}], price: {"gold": 44, "wood": 14, "stone": 12}, img: "assets/ui/rifugio/furniture/set03/08.webp"},
        {id: "f029", name: "Cassaforte Incantata", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 47, "wood": 15, "stone": 13}, img: "assets/ui/rifugio/furniture/set03/09.webp"},
        {id: "f030", name: "La Pietra Filosofale", bonusText: "+4% Monete", epic: true, wall: false, effects: [{"type": "goldMult", "value": 0.04}], price: {"gold": 150, "wood": 48, "stone": 41}, img: "assets/ui/rifugio/furniture/set03/10.webp"},
      ],
    },
    {
      id: "set04", num: 4, name: "Il Giardino Sussurrante",
      biomeIdx: 1, fallbackIcon: "🌲",
      setBonusDesc: "+15% XP base da tutta la Corsa",
      setBonusEffects: [{"type": "xpMult", "activity": "corsa", "value": 0.15}],
      items: [
        {id: "f031", name: "Prato in Miniatura (Pavimento)", bonusText: "+0.5% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.005}], price: {"gold": 29, "wood": 9, "stone": 8}, img: "assets/ui/rifugio/furniture/set04/01.webp"},
        {id: "f032", name: "Lucciole in Barattolo (Luce)", bonusText: "+1% Legna trovata", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.01}], price: {"gold": 33, "wood": 10, "stone": 9}, img: "assets/ui/rifugio/furniture/set04/02.webp"},
        {id: "f033", name: "Tronco Intagliato a Tavola", bonusText: "+0.5% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.005}], price: {"gold": 37, "wood": 12, "stone": 10}, img: "assets/ui/rifugio/furniture/set04/03.webp"},
        {id: "f034", name: "Trono di Liane e Foglie", bonusText: "+1% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 41, "wood": 13, "stone": 11}, img: "assets/ui/rifugio/furniture/set04/04.webp"},
        {id: "f035", name: "Rampicante Luminoso", bonusText: "+1% Legna trovata", epic: false, wall: true, effects: [{"type": "woodMult", "value": 0.01}], price: {"gold": 44, "wood": 20, "stone": 26}, img: "assets/ui/rifugio/furniture/set04/05.webp"},
        {id: "f036", name: "Finestra Illusoria sulla Foresta", bonusText: "+1% XP Camminata", epic: false, wall: true, effects: [{"type": "xpMult", "activity": "camminata", "value": 0.01}], price: {"gold": 48, "wood": 22, "stone": 28}, img: "assets/ui/rifugio/furniture/set04/06.webp"},
        {id: "f037", name: "Bonsai dell'Albero Madre", bonusText: "+1% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 52, "wood": 17, "stone": 14}, img: "assets/ui/rifugio/furniture/set04/07.webp"},
        {id: "f038", name: "Pressa per Fiori Antichi", bonusText: "+1% Probabilità drop Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 56, "wood": 18, "stone": 15}, img: "assets/ui/rifugio/furniture/set04/08.webp"},
        {id: "f039", name: "Cesto in Vimini Magico", bonusText: "+1% Legna trovata", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.01}], price: {"gold": 59, "wood": 19, "stone": 16}, img: "assets/ui/rifugio/furniture/set04/09.webp"},
        {id: "f040", name: "La Gemma Seme di Yggdrasil", bonusText: "+3% XP Corsa", epic: true, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.03}], price: {"gold": 189, "wood": 60, "stone": 52}, img: "assets/ui/rifugio/furniture/set04/10.webp"},
      ],
    },
    {
      id: "set05", num: 5, name: "L'Avamposto Glaciale",
      biomeIdx: 12, fallbackIcon: "🏔️",
      setBonusDesc: "+15% XP base da tutta la Cyclette/Ciclismo",
      setBonusEffects: [{"type": "xpMult", "activity": "cyclette", "value": 0.15}],
      items: [
        {id: "f041", name: "Piastrella Ghiacciata del Sentiero", bonusText: "+0.5% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.005}], price: {"gold": 35, "wood": 11, "stone": 10}, img: "assets/ui/rifugio/furniture/set05/01.webp"},
        {id: "f042", name: "Cristallo di Ghiaccio Illuminescente", bonusText: "+1% Pietra trovata", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 40, "wood": 13, "stone": 11}, img: "assets/ui/rifugio/furniture/set05/02.webp"},
        {id: "f043", name: "Tavolo in Ghiaccio Perenne", bonusText: "+0.5% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.005}], price: {"gold": 44, "wood": 14, "stone": 12}, img: "assets/ui/rifugio/furniture/set05/03.webp"},
        {id: "f044", name: "Sgabello con Pelliccia", bonusText: "+1% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.01}], price: {"gold": 49, "wood": 16, "stone": 13}, img: "assets/ui/rifugio/furniture/set05/04.webp"},
        {id: "f045", name: "Sciabole Incrociate", bonusText: "+1% Danni Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 54, "wood": 24, "stone": 32}, img: "assets/ui/rifugio/furniture/set05/05.webp"},
        {id: "f046", name: "Mappa Ghiacciata Incorniciata", bonusText: "+2% HP in Arena", epic: false, wall: true, effects: [{"type": "arenaHpMult", "value": 0.02}], price: {"gold": 58, "wood": 26, "stone": 34}, img: "assets/ui/rifugio/furniture/set05/06.webp"},
        {id: "f047", name: "Statua del Golem di Neve", bonusText: "+1% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.01}], price: {"gold": 63, "wood": 20, "stone": 17}, img: "assets/ui/rifugio/furniture/set05/07.webp"},
        {id: "f048", name: "Ramponi Invernali", bonusText: "+1 Stamina massima", epic: false, wall: false, effects: [{"type": "staminaMax", "value": 1.0}], price: {"gold": 67, "wood": 21, "stone": 18}, img: "assets/ui/rifugio/furniture/set05/08.webp"},
        {id: "f049", name: "Forziere Congelato", bonusText: "+1% Monete trovate", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 72, "wood": 23, "stone": 20}, img: "assets/ui/rifugio/furniture/set05/09.webp"},
        {id: "f050", name: "Il Cuore di Ghiaccio", bonusText: "+3% XP Cyclette", epic: true, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.03}], price: {"gold": 229, "wood": 73, "stone": 62}, img: "assets/ui/rifugio/furniture/set05/10.webp"},
      ],
    },
    {
      id: "set06", num: 6, name: "La Cripta dell'Orologiaio",
      biomeIdx: 7, fallbackIcon: "🕰️",
      setBonusDesc: "+10% a tutti gli XP (Bonus Globale)",
      setBonusEffects: [{"type": "xpMult", "activity": "global", "value": 0.1}],
      items: [
        {id: "f051", name: "Pavimento a Scacchiera Meccanica", bonusText: "+0.5% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.005}], price: {"gold": 41, "wood": 13, "stone": 11}, img: "assets/ui/rifugio/furniture/set06/01.webp"},
        {id: "f052", name: "Lampada a Pendolo", bonusText: "+0.5% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.005}], price: {"gold": 47, "wood": 15, "stone": 13}, img: "assets/ui/rifugio/furniture/set06/02.webp"},
        {id: "f053", name: "Banco dei Meccanismi Minuti", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 52, "wood": 17, "stone": 14}, img: "assets/ui/rifugio/furniture/set06/03.webp"},
        {id: "f054", name: "Sgabello a Molla", bonusText: "+0.5% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.005}], price: {"gold": 57, "wood": 18, "stone": 16}, img: "assets/ui/rifugio/furniture/set06/04.webp"},
        {id: "f055", name: "Orologio a Ingranaggi a Vista", bonusText: "Riduce i tempi di attesa dell'1%", epic: false, wall: true, effects: [{"type": "marketDiscount", "value": 0.01}], price: {"gold": 63, "wood": 28, "stone": 37}, img: "assets/ui/rifugio/furniture/set06/05.webp"},
        {id: "f056", name: "Calendario Perpetuo", bonusText: "+1% XP Globale", epic: false, wall: true, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 68, "wood": 31, "stone": 40}, img: "assets/ui/rifugio/furniture/set06/06.webp"},
        {id: "f057", name: "Automa Meccanico (Animato)", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 73, "wood": 23, "stone": 20}, img: "assets/ui/rifugio/furniture/set06/07.webp"},
        {id: "f058", name: "Macchina del Moto Perpetuo", bonusText: "+2% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.02}], price: {"gold": 79, "wood": 25, "stone": 21}, img: "assets/ui/rifugio/furniture/set06/08.webp"},
        {id: "f059", name: "Cassetta degli Attrezzi in Rame", bonusText: "+1% Pietra e Legna", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.01}, {"type": "woodMult", "value": 0.01}], price: {"gold": 84, "wood": 27, "stone": 23}, img: "assets/ui/rifugio/furniture/set06/09.webp"},
        {id: "f060", name: "La Clessidra dell'Eternità", bonusText: "+3% XP Globale", epic: true, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.03}], price: {"gold": 268, "wood": 85, "stone": 73}, img: "assets/ui/rifugio/furniture/set06/10.webp"},
      ],
    },
    {
      id: "set07", num: 7, name: "Il Covo delle Ombre",
      biomeIdx: 10, fallbackIcon: "🐀",
      setBonusDesc: "+25% Danni Critici in Arena",
      setBonusEffects: [{"type": "arenaCritDmgMult", "value": 0.25}],
      items: [
        {id: "f061", name: "Piastrella della Fogna", bonusText: "+1% Probabilità Critico (Arena)", epic: false, wall: false, effects: [{"type": "arenaCritChance", "value": 0.01}], price: {"gold": 47, "wood": 15, "stone": 13}, img: "assets/ui/rifugio/furniture/set07/01.webp"},
        {id: "f062", name: "Tubo della Perdita Verde", bonusText: "+1% Danni Critici", epic: false, wall: false, effects: [{"type": "arenaCritDmgMult", "value": 0.01}], price: {"gold": 53, "wood": 17, "stone": 15}, img: "assets/ui/rifugio/furniture/set07/02.webp"},
        {id: "f063", name: "Tavolo Tombino", bonusText: "+2% Danni Critici", epic: false, wall: false, effects: [{"type": "arenaCritDmgMult", "value": 0.02}], price: {"gold": 60, "wood": 19, "stone": 16}, img: "assets/ui/rifugio/furniture/set07/03.webp"},
        {id: "f064", name: "Colonna di Cemento", bonusText: "+1% Probabilità Critico", epic: false, wall: false, effects: [{"type": "arenaCritChance", "value": 0.01}], price: {"gold": 66, "wood": 21, "stone": 18}, img: "assets/ui/rifugio/furniture/set07/04.webp"},
        {id: "f065", name: "Grata con Occhi nell'Ombra", bonusText: "+1% Probabilità doppio drop", epic: false, wall: true, effects: [{"type": "doubleDropChance", "value": 0.01}], price: {"gold": 72, "wood": 33, "stone": 42}, img: "assets/ui/rifugio/furniture/set07/05.webp"},
        {id: "f066", name: "Mappa dei Sotterranei", bonusText: "+2% Danni Critici", epic: false, wall: true, effects: [{"type": "arenaCritDmgMult", "value": 0.02}], price: {"gold": 78, "wood": 35, "stone": 46}, img: "assets/ui/rifugio/furniture/set07/06.webp"},
        {id: "f067", name: "Statua del Ratto delle Fogne", bonusText: "+1% HP Arena", epic: false, wall: false, effects: [{"type": "arenaHpMult", "value": 0.01}], price: {"gold": 84, "wood": 27, "stone": 23}, img: "assets/ui/rifugio/furniture/set07/07.webp"},
        {id: "f068", name: "Chiave Inglese Arrugginita", bonusText: "+1% Probabilità Monete bonus", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 90, "wood": 29, "stone": 25}, img: "assets/ui/rifugio/furniture/set07/08.webp"},
        {id: "f069", name: "Barile Contrabbandato (Forziere)", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 96, "wood": 31, "stone": 26}, img: "assets/ui/rifugio/furniture/set07/09.webp"},
        {id: "f070", name: "Pozione Tossica in Esposizione", bonusText: "+5% Danni Critici", epic: true, wall: false, effects: [{"type": "arenaCritDmgMult", "value": 0.05}], price: {"gold": 307, "wood": 98, "stone": 84}, img: "assets/ui/rifugio/furniture/set07/10.webp"},
      ],
    },
    {
      id: "set08", num: 8, name: "La Tenda del Nomade",
      biomeIdx: 13, fallbackIcon: "🏜️",
      setBonusDesc: "Raddoppia la Stamina o gli invii di Incursioni giornaliere",
      setBonusEffects: [{"type": "flag", "key": "doubleStamina"}],
      items: [
        {id: "f071", name: "Lastra di Sabbia Cinerea", bonusText: "+1 Stamina", epic: false, wall: false, effects: [{"type": "staminaMax", "value": 1.0}], price: {"gold": 53, "wood": 17, "stone": 15}, img: "assets/ui/rifugio/furniture/set08/01.webp"},
        {id: "f072", name: "Torcia della Fiamma Spettrale", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 60, "wood": 19, "stone": 16}, img: "assets/ui/rifugio/furniture/set08/02.webp"},
        {id: "f073", name: "Piano di Ossidiana", bonusText: "+1% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 67, "wood": 21, "stone": 18}, img: "assets/ui/rifugio/furniture/set08/03.webp"},
        {id: "f074", name: "Sgabello di Pietra Pomice", bonusText: "+1 Stamina", epic: false, wall: false, effects: [{"type": "staminaMax", "value": 1.0}], price: {"gold": 74, "wood": 24, "stone": 20}, img: "assets/ui/rifugio/furniture/set08/04.webp"},
        {id: "f075", name: "Ramo Secco del Deserto", bonusText: "+1% Danni Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 81, "wood": 37, "stone": 48}, img: "assets/ui/rifugio/furniture/set08/05.webp"},
        {id: "f076", name: "Rotolo delle Dune Annerito", bonusText: "+1% XP Camminata", epic: false, wall: true, effects: [{"type": "xpMult", "activity": "camminata", "value": 0.01}], price: {"gold": 88, "wood": 40, "stone": 52}, img: "assets/ui/rifugio/furniture/set08/06.webp"},
        {id: "f077", name: "Teschio del Deserto", bonusText: "+1 Stamina", epic: false, wall: false, effects: [{"type": "staminaMax", "value": 1.0}], price: {"gold": 95, "wood": 30, "stone": 26}, img: "assets/ui/rifugio/furniture/set08/07.webp"},
        {id: "f078", name: "Pugnale Intagliato", bonusText: "+1% Probabilità drop Progetti", epic: false, wall: false, effects: [{"type": "dropProjectChance", "value": 0.01}], price: {"gold": 102, "wood": 32, "stone": 28}, img: "assets/ui/rifugio/furniture/set08/08.webp"},
        {id: "f079", name: "Forziere Rinforzato", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 109, "wood": 35, "stone": 30}, img: "assets/ui/rifugio/furniture/set08/09.webp"},
        {id: "f080", name: "Brace del Fuoco Eterno", bonusText: "+3 Stamina", epic: true, wall: false, effects: [{"type": "staminaMax", "value": 3.0}], price: {"gold": 347, "wood": 110, "stone": 95}, img: "assets/ui/rifugio/furniture/set08/10.webp"},
      ],
    },
    {
      id: "set09", num: 9, name: "Il Santuario di Cristallo",
      biomeIdx: 19, fallbackIcon: "🔮",
      setBonusDesc: "+15% Probabilità di trovare Progetti e Oggetti rari",
      setBonusEffects: [{"type": "dropRareChance", "value": 0.15}, {"type": "dropProjectChance", "value": 0.15}],
      items: [
        {id: "f081", name: "Pavimento in Ossidiana Riflettente", bonusText: "+1% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 59, "wood": 19, "stone": 16}, img: "assets/ui/rifugio/furniture/set09/01.webp"},
        {id: "f082", name: "Prisma Centrale Illuminescente", bonusText: "+1% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 67, "wood": 21, "stone": 18}, img: "assets/ui/rifugio/furniture/set09/02.webp"},
        {id: "f083", name: "Altare di Quarzo", bonusText: "+2% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.02}], price: {"gold": 75, "wood": 24, "stone": 20}, img: "assets/ui/rifugio/furniture/set09/03.webp"},
        {id: "f084", name: "Sgabello di Cristallo Oscuro", bonusText: "+1% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 83, "wood": 26, "stone": 23}, img: "assets/ui/rifugio/furniture/set09/04.webp"},
        {id: "f085", name: "Specchio Infranto Magico", bonusText: "+1% Drop Rari", epic: false, wall: true, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 90, "wood": 41, "stone": 53}, img: "assets/ui/rifugio/furniture/set09/05.webp"},
        {id: "f086", name: "Mappa su Lastra di Cristallo", bonusText: "+1% Drop Rari", epic: false, wall: true, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 98, "wood": 45, "stone": 58}, img: "assets/ui/rifugio/furniture/set09/06.webp"},
        {id: "f087", name: "Statua del Drago di Cristallo", bonusText: "+2% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.02}], price: {"gold": 106, "wood": 34, "stone": 29}, img: "assets/ui/rifugio/furniture/set09/07.webp"},
        {id: "f088", name: "Taglierina per Gemme", bonusText: "+1% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 113, "wood": 36, "stone": 31}, img: "assets/ui/rifugio/furniture/set09/08.webp"},
        {id: "f089", name: "Cassetta di Sicurezza in Diamante", bonusText: "+2% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.02}], price: {"gold": 121, "wood": 39, "stone": 33}, img: "assets/ui/rifugio/furniture/set09/09.webp"},
        {id: "f090", name: "La Reliquia di Cristallo Oscuro", bonusText: "+4% Drop Rari", epic: true, wall: false, effects: [{"type": "dropRareChance", "value": 0.04}], price: {"gold": 386, "wood": 123, "stone": 105}, img: "assets/ui/rifugio/furniture/set09/10.webp"},
      ],
    },
    {
      id: "set10", num: 10, name: "La Sala del Corruttore",
      biomeIdx: 17, fallbackIcon: "👑",
      setBonusDesc: "+20% Danni a tutti i Boss e badge visivo permanente",
      setBonusEffects: [{"type": "bossDmgMult", "value": 0.2}, {"type": "flag", "key": "corruptorBadge"}],
      items: [
        {id: "f091", name: "Tappeto di Fiamme Oscure", bonusText: "+1% Danni Boss", epic: false, wall: false, effects: [{"type": "bossDmgMult", "value": 0.01}], price: {"gold": 65, "wood": 21, "stone": 18}, img: "assets/ui/rifugio/furniture/set10/01.webp"},
        {id: "f092", name: "Braciere dell'Anima", bonusText: "+1% Danni Boss", epic: false, wall: false, effects: [{"type": "bossDmgMult", "value": 0.01}], price: {"gold": 74, "wood": 24, "stone": 20}, img: "assets/ui/rifugio/furniture/set10/02.webp"},
        {id: "f093", name: "Tavolo delle Tattiche Demoniache", bonusText: "+2% Danni Boss", epic: false, wall: false, effects: [{"type": "bossDmgMult", "value": 0.02}], price: {"gold": 82, "wood": 26, "stone": 22}, img: "assets/ui/rifugio/furniture/set10/03.webp"},
        {id: "f094", name: "Il Trono del Corruttore Sconfitto", bonusText: "+2% Danni Boss", epic: false, wall: false, effects: [{"type": "bossDmgMult", "value": 0.02}], price: {"gold": 91, "wood": 29, "stone": 25}, img: "assets/ui/rifugio/furniture/set10/04.webp"},
        {id: "f095", name: "Stendardo del Drago Cremisi", bonusText: "+1% Danni Boss", epic: false, wall: true, effects: [{"type": "bossDmgMult", "value": 0.01}], price: {"gold": 99, "wood": 45, "stone": 59}, img: "assets/ui/rifugio/furniture/set10/05.webp"},
        {id: "f096", name: "Mappa dei Piani di Battaglia", bonusText: "+1% Danni Boss", epic: false, wall: true, effects: [{"type": "bossDmgMult", "value": 0.01}], price: {"gold": 108, "wood": 49, "stone": 64}, img: "assets/ui/rifugio/furniture/set10/06.webp"},
        {id: "f097", name: "Statua del Gargoyle Demoniaco", bonusText: "+2% Danni Boss", epic: false, wall: false, effects: [{"type": "bossDmgMult", "value": 0.02}], price: {"gold": 117, "wood": 37, "stone": 32}, img: "assets/ui/rifugio/furniture/set10/07.webp"},
        {id: "f098", name: "Mazza Chiodata", bonusText: "+1% Danni Boss", epic: false, wall: false, effects: [{"type": "bossDmgMult", "value": 0.01}], price: {"gold": 125, "wood": 40, "stone": 34}, img: "assets/ui/rifugio/furniture/set10/08.webp"},
        {id: "f099", name: "Forziere Regale Tempestato di Gemme", bonusText: "+2% Danni Boss", epic: false, wall: false, effects: [{"type": "bossDmgMult", "value": 0.02}], price: {"gold": 134, "wood": 42, "stone": 36}, img: "assets/ui/rifugio/furniture/set10/09.webp"},
        {id: "f100", name: "La Corona del Re Corrotto", bonusText: "+5% Danni Boss e +5% XP Globale", epic: true, wall: false, effects: [{"type": "bossDmgMult", "value": 0.05}, {"type": "xpMult", "activity": "global", "value": 0.05}], price: {"gold": 425, "wood": 135, "stone": 116}, img: "assets/ui/rifugio/furniture/set10/10.webp"},
      ],
    },
    {
      id: "set11", num: 11, name: "La Palude Nebbiosa",
      biomeIdx: 14, fallbackIcon: "🌫️",
      setBonusDesc: "+20% Legna raccolta durante le Camminate",
      setBonusEffects: [{"type": "woodMult", "value": 0.2}],
      items: [
        {id: "f101", name: "Stuoia di Giunchi Intrecciati", bonusText: "+0.5% Legna", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.005}], price: {"gold": 72, "wood": 23, "stone": 20}, img: "assets/ui/rifugio/furniture/set11/01.webp"},
        {id: "f102", name: "Lanterna con Fuoco Fatuo", bonusText: "+1% Legna", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.01}], price: {"gold": 81, "wood": 26, "stone": 22}, img: "assets/ui/rifugio/furniture/set11/02.webp"},
        {id: "f103", name: "Tavolo in Legno Marcescente", bonusText: "+0.5% Legna", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.005}], price: {"gold": 90, "wood": 29, "stone": 25}, img: "assets/ui/rifugio/furniture/set11/03.webp"},
        {id: "f104", name: "Sedia di Radici Contorte", bonusText: "+0.5% Legna", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.005}], price: {"gold": 99, "wood": 32, "stone": 27}, img: "assets/ui/rifugio/furniture/set11/04.webp"},
        {id: "f105", name: "Teschio di Coccodrillo", bonusText: "+1% Danni in Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 109, "wood": 49, "stone": 64}, img: "assets/ui/rifugio/furniture/set11/05.webp"},
        {id: "f106", name: "Mappa delle Acque Morte", bonusText: "+1% Probabilità Progetti", epic: false, wall: true, effects: [{"type": "dropProjectChance", "value": 0.01}], price: {"gold": 118, "wood": 54, "stone": 70}, img: "assets/ui/rifugio/furniture/set11/06.webp"},
        {id: "f107", name: "Statuina del Rospo Guardiano", bonusText: "+1% Legna", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.01}], price: {"gold": 127, "wood": 40, "stone": 35}, img: "assets/ui/rifugio/furniture/set11/07.webp"},
        {id: "f108", name: "Pestello da Strega", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 137, "wood": 43, "stone": 37}, img: "assets/ui/rifugio/furniture/set11/08.webp"},
        {id: "f109", name: "Cassa Coperta di Muschio", bonusText: "+1% Legna", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.01}], price: {"gold": 146, "wood": 46, "stone": 40}, img: "assets/ui/rifugio/furniture/set11/09.webp"},
        {id: "f110", name: "Il Fiore di Loto Luminescente", bonusText: "+3% Legna e +1% XP", epic: true, wall: false, effects: [{"type": "woodMult", "value": 0.03}, {"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 465, "wood": 148, "stone": 127}, img: "assets/ui/rifugio/furniture/set11/10.webp"},
      ],
    },
    {
      id: "set12", num: 12, name: "Le Pianure del Vento",
      biomeIdx: 3, fallbackIcon: "🌬️",
      setBonusDesc: "+15% XP base da tutta la Corsa",
      setBonusEffects: [{"type": "xpMult", "activity": "corsa", "value": 0.15}],
      items: [
        {id: "f111", name: "Terreno Screpolato della Savana", bonusText: "+0.5% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.005}], price: {"gold": 78, "wood": 25, "stone": 21}, img: "assets/ui/rifugio/furniture/set12/01.webp"},
        {id: "f112", name: "Rintocco di Vento (Lampada)", bonusText: "+0.5% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.005}], price: {"gold": 88, "wood": 28, "stone": 24}, img: "assets/ui/rifugio/furniture/set12/02.webp"},
        {id: "f113", name: "Tavolino ad Aquilone", bonusText: "+1% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 98, "wood": 31, "stone": 27}, img: "assets/ui/rifugio/furniture/set12/03.webp"},
        {id: "f114", name: "Sgabello Aerodinamico", bonusText: "+0.5% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.005}], price: {"gold": 108, "wood": 34, "stone": 29}, img: "assets/ui/rifugio/furniture/set12/04.webp"},
        {id: "f115", name: "Piume Giganti Intrecciate", bonusText: "+1% Velocità (Bonus XP)", epic: false, wall: true, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 118, "wood": 54, "stone": 70}, img: "assets/ui/rifugio/furniture/set12/05.webp"},
        {id: "f116", name: "Mappa delle Correnti", bonusText: "+1% Probabilità Drop Rari", epic: false, wall: true, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 128, "wood": 58, "stone": 76}, img: "assets/ui/rifugio/furniture/set12/06.webp"},
        {id: "f117", name: "Statua del Falco Pellegrino", bonusText: "+1% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 138, "wood": 44, "stone": 38}, img: "assets/ui/rifugio/furniture/set12/07.webp"},
        {id: "f118", name: "Mulino a Vento in Miniatura", bonusText: "+2% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.02}], price: {"gold": 148, "wood": 47, "stone": 40}, img: "assets/ui/rifugio/furniture/set12/08.webp"},
        {id: "f119", name: "Cassa di Legno Leggero", bonusText: "+1% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 158, "wood": 50, "stone": 43}, img: "assets/ui/rifugio/furniture/set12/09.webp"},
        {id: "f120", name: "Il Tornado in Bottiglia", bonusText: "+3% XP Corsa", epic: true, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.03}], price: {"gold": 504, "wood": 160, "stone": 137}, img: "assets/ui/rifugio/furniture/set12/10.webp"},
      ],
    },
    {
      id: "set13", num: 13, name: "La Costa dei Relitti",
      biomeIdx: 11, fallbackIcon: "⚓",
      setBonusDesc: "Probabilità Forzieri Monete doppi +25%",
      setBonusEffects: [{"type": "doubleDropChance", "value": 0.25}],
      items: [
        {id: "f121", name: "Piastrella della Spiaggia Sabbiosa", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 84, "wood": 27, "stone": 23}, img: "assets/ui/rifugio/furniture/set13/01.webp"},
        {id: "f122", name: "Lanterna da Nave Antica", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 94, "wood": 30, "stone": 26}, img: "assets/ui/rifugio/furniture/set13/02.webp"},
        {id: "f123", name: "Tavolo di Casse e Barile", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 105, "wood": 34, "stone": 29}, img: "assets/ui/rifugio/furniture/set13/03.webp"},
        {id: "f124", name: "Seduta di Corda Arrotolata", bonusText: "+0.5% XP Camminata", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "camminata", "value": 0.005}], price: {"gold": 116, "wood": 37, "stone": 32}, img: "assets/ui/rifugio/furniture/set13/04.webp"},
        {id: "f125", name: "Bandiera del Jolly Roger", bonusText: "+1% Danni Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 127, "wood": 58, "stone": 75}, img: "assets/ui/rifugio/furniture/set13/05.webp"},
        {id: "f126", name: "Mappa del Tesoro in Bottiglia", bonusText: "+2% Monete", epic: false, wall: true, effects: [{"type": "goldMult", "value": 0.02}], price: {"gold": 138, "wood": 63, "stone": 82}, img: "assets/ui/rifugio/furniture/set13/06.webp"},
        {id: "f127", name: "Teschio di Osso Intagliato", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 149, "wood": 47, "stone": 41}, img: "assets/ui/rifugio/furniture/set13/07.webp"},
        {id: "f128", name: "Uncino del Pirata", bonusText: "+1% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 160, "wood": 51, "stone": 44}, img: "assets/ui/rifugio/furniture/set13/08.webp"},
        {id: "f129", name: "Baule del Pirata (Forziere)", bonusText: "+2% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.02}], price: {"gold": 171, "wood": 54, "stone": 47}, img: "assets/ui/rifugio/furniture/set13/09.webp"},
        {id: "f130", name: "Il Medaglione Maledetto dei Pirati", bonusText: "+5% Monete", epic: true, wall: false, effects: [{"type": "goldMult", "value": 0.05}], price: {"gold": 543, "wood": 173, "stone": 148}, img: "assets/ui/rifugio/furniture/set13/10.webp"},
      ],
    },
    {
      id: "set14", num: 14, name: "Le Miniere Profonde",
      biomeIdx: 16, fallbackIcon: "⛏️",
      setBonusDesc: "+20% Pietra raccolta in tutte le attività",
      setBonusEffects: [{"type": "stoneMult", "value": 0.2}],
      items: [
        {id: "f131", name: "Piastrella della Miniera Corrotta", bonusText: "+0.5% Pietra", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.005}], price: {"gold": 90, "wood": 29, "stone": 24}, img: "assets/ui/rifugio/furniture/set14/01.webp"},
        {id: "f132", name: "Lanterna a Gabbia Corrotta", bonusText: "+1% Pietra", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 101, "wood": 32, "stone": 28}, img: "assets/ui/rifugio/furniture/set14/02.webp"},
        {id: "f133", name: "Vagonetto Rovesciato (Tavolo)", bonusText: "+1% Pietra", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 113, "wood": 36, "stone": 31}, img: "assets/ui/rifugio/furniture/set14/03.webp"},
        {id: "f134", name: "Sgabello Industriale della Miniera", bonusText: "+0.5% Pietra", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.005}], price: {"gold": 125, "wood": 40, "stone": 34}, img: "assets/ui/rifugio/furniture/set14/04.webp"},
        {id: "f135", name: "Picconi Incrociati", bonusText: "+1% Danni Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 136, "wood": 62, "stone": 81}, img: "assets/ui/rifugio/furniture/set14/05.webp"},
        {id: "f136", name: "Mappa dei Giacimenti", bonusText: "+1% Drop Progetti", epic: false, wall: true, effects: [{"type": "dropProjectChance", "value": 0.01}], price: {"gold": 148, "wood": 67, "stone": 87}, img: "assets/ui/rifugio/furniture/set14/06.webp"},
        {id: "f137", name: "Statua del Golem di Roccia", bonusText: "+1% Pietra", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 160, "wood": 51, "stone": 44}, img: "assets/ui/rifugio/furniture/set14/07.webp"},
        {id: "f138", name: "Detonatore a Stantuffo", bonusText: "+1% Danni Critici", epic: false, wall: false, effects: [{"type": "arenaCritDmgMult", "value": 0.01}], price: {"gold": 171, "wood": 54, "stone": 47}, img: "assets/ui/rifugio/furniture/set14/08.webp"},
        {id: "f139", name: "Cassa Rinforzata in Acciaio", bonusText: "+1% Pietra", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 183, "wood": 58, "stone": 50}, img: "assets/ui/rifugio/furniture/set14/09.webp"},
        {id: "f140", name: "Il Cuore di Pietra Corrotta", bonusText: "+3% Pietra e +2% Monete", epic: true, wall: false, effects: [{"type": "stoneMult", "value": 0.03}, {"type": "goldMult", "value": 0.02}], price: {"gold": 583, "wood": 185, "stone": 159}, img: "assets/ui/rifugio/furniture/set14/10.webp"},
      ],
    },
    {
      id: "set15", num: 15, name: "La Selva dei Funghi Giganti",
      biomeIdx: 2, fallbackIcon: "🍄",
      setBonusDesc: "Rigenerazione in Arena (recupera 10% HP tra i round)",
      setBonusEffects: [{"type": "flag", "key": "arenaRegen", "value": 0.1}],
      items: [
        {id: "f141", name: "Tappeto di Spore Soffici", bonusText: "+1% HP Arena", epic: false, wall: false, effects: [{"type": "arenaHpMult", "value": 0.01}], price: {"gold": 96, "wood": 30, "stone": 26}, img: "assets/ui/rifugio/furniture/set15/01.webp"},
        {id: "f142", name: "Cappello di Fungo Luminescente", bonusText: "+1% HP Arena", epic: false, wall: false, effects: [{"type": "arenaHpMult", "value": 0.01}], price: {"gold": 108, "wood": 34, "stone": 29}, img: "assets/ui/rifugio/furniture/set15/02.webp"},
        {id: "f143", name: "Fetta di Fungo Porcino (Tavolo)", bonusText: "+1% XP Camminata", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "camminata", "value": 0.01}], price: {"gold": 121, "wood": 38, "stone": 33}, img: "assets/ui/rifugio/furniture/set15/03.webp"},
        {id: "f144", name: "Fungo Velenoso (Sgabello)", bonusText: "+1% Danni Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 133, "wood": 42, "stone": 36}, img: "assets/ui/rifugio/furniture/set15/04.webp"},
        {id: "f145", name: "Giardino Verticale di Micelio", bonusText: "+1% HP Arena", epic: false, wall: true, effects: [{"type": "arenaHpMult", "value": 0.01}], price: {"gold": 145, "wood": 66, "stone": 86}, img: "assets/ui/rifugio/furniture/set15/08.webp"},
        {id: "f146", name: "Arazzo delle Spore", bonusText: "+1% Drop Progetti", epic: false, wall: true, effects: [{"type": "dropProjectChance", "value": 0.01}], price: {"gold": 158, "wood": 72, "stone": 93}, img: "assets/ui/rifugio/furniture/set15/09.webp"},
        {id: "f147", name: "Miconide in Vaso (Creatura viva)", bonusText: "+2% HP Arena", epic: false, wall: false, effects: [{"type": "arenaHpMult", "value": 0.02}], price: {"gold": 170, "wood": 54, "stone": 46}, img: "assets/ui/rifugio/furniture/set15/07.webp"},
        {id: "f148", name: "Mortaio per Unguenti", bonusText: "+1% HP Arena", epic: false, wall: false, effects: [{"type": "arenaHpMult", "value": 0.01}], price: {"gold": 183, "wood": 58, "stone": 50}, img: "assets/ui/rifugio/furniture/set15/06.webp"},
        {id: "f149", name: "Cassa di Corteccia", bonusText: "+1% Legna", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.01}], price: {"gold": 195, "wood": 62, "stone": 53}, img: "assets/ui/rifugio/furniture/set15/05.webp"},
        {id: "f150", name: "La Madre Spora", bonusText: "+5% HP Arena", epic: true, wall: false, effects: [{"type": "arenaHpMult", "value": 0.05}], price: {"gold": 622, "wood": 198, "stone": 170}, img: "assets/ui/rifugio/furniture/set15/10.webp"},
      ],
    },
    {
      id: "set16", num: 16, name: "L'Arcipelago Fluttuante",
      biomeIdx: 8, fallbackIcon: "🏝️",
      setBonusDesc: "+15% XP base da tutta la Cyclette/Bici",
      setBonusEffects: [{"type": "xpMult", "activity": "cyclette", "value": 0.15}],
      items: [
        {id: "f151", name: "Pavimento di Sabbia e Coralli", bonusText: "+0.5% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.005}], price: {"gold": 102, "wood": 32, "stone": 28}, img: "assets/ui/rifugio/furniture/set16/01.webp"},
        {id: "f152", name: "Perla nell'Ostrica", bonusText: "+1% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.01}], price: {"gold": 115, "wood": 37, "stone": 31}, img: "assets/ui/rifugio/furniture/set16/02.webp"},
        {id: "f153", name: "Timone su Piedistallo", bonusText: "+1% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.01}], price: {"gold": 128, "wood": 41, "stone": 35}, img: "assets/ui/rifugio/furniture/set16/03.webp"},
        {id: "f154", name: "Torre di Coralli Colorati", bonusText: "+0.5% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.005}], price: {"gold": 141, "wood": 45, "stone": 39}, img: "assets/ui/rifugio/furniture/set16/04.webp"},
        {id: "f155", name: "Rete da Pesca con Stelle Marine", bonusText: "+1% Danni Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 155, "wood": 70, "stone": 91}, img: "assets/ui/rifugio/furniture/set16/05.webp"},
        {id: "f156", name: "Mappa dei Mari del Corallo", bonusText: "+2% Drop Rari", epic: false, wall: true, effects: [{"type": "dropRareChance", "value": 0.02}], price: {"gold": 168, "wood": 76, "stone": 99}, img: "assets/ui/rifugio/furniture/set16/06.webp"},
        {id: "f157", name: "Nave in Bottiglia", bonusText: "+1% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.01}], price: {"gold": 181, "wood": 58, "stone": 49}, img: "assets/ui/rifugio/furniture/set16/07.webp"},
        {id: "f158", name: "Cannocchiale in Ottone", bonusText: "+1% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 194, "wood": 62, "stone": 53}, img: "assets/ui/rifugio/furniture/set16/08.webp"},
        {id: "f159", name: "Forziere del Fondale", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 208, "wood": 66, "stone": 57}, img: "assets/ui/rifugio/furniture/set16/09.webp"},
        {id: "f160", name: "La Conchiglia dell'Aurora", bonusText: "+3% XP Cyclette", epic: true, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.03}], price: {"gold": 661, "wood": 210, "stone": 180}, img: "assets/ui/rifugio/furniture/set16/10.webp"},
      ],
    },
    {
      id: "set17", num: 17, name: "Il Cimitero dei Draghi",
      biomeIdx: 15, fallbackIcon: "🐉",
      setBonusDesc: "L'Eroe ottiene una \"Vita Extra\" in Arena",
      setBonusEffects: [{"type": "flag", "key": "arenaExtraLife"}],
      items: [
        {id: "f161", name: "Tappeto di Scaglie Pietrificate", bonusText: "+1% Difesa Arena", epic: false, wall: false, effects: [{"type": "arenaDefMult", "value": 0.01}], price: {"gold": 108, "wood": 34, "stone": 29}, img: "assets/ui/rifugio/furniture/set17/01.webp"},
        {id: "f162", name: "Teschio di Drago Infiammato", bonusText: "+1% Danni Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 122, "wood": 39, "stone": 33}, img: "assets/ui/rifugio/furniture/set17/02.webp"},
        {id: "f163", name: "Cassa Toracica Gigante (Tavolo)", bonusText: "+1% HP Arena", epic: false, wall: false, effects: [{"type": "arenaHpMult", "value": 0.01}], price: {"gold": 136, "wood": 43, "stone": 37}, img: "assets/ui/rifugio/furniture/set17/03.webp"},
        {id: "f164", name: "Vertebra Antica (Sgabello)", bonusText: "+0.5% HP Arena", epic: false, wall: false, effects: [{"type": "arenaHpMult", "value": 0.005}], price: {"gold": 150, "wood": 48, "stone": 41}, img: "assets/ui/rifugio/furniture/set17/04.webp"},
        {id: "f165", name: "Artiglio di Drago", bonusText: "+2% Danni Critici", epic: false, wall: true, effects: [{"type": "arenaCritDmgMult", "value": 0.02}], price: {"gold": 164, "wood": 74, "stone": 97}, img: "assets/ui/rifugio/furniture/set17/05.webp"},
        {id: "f166", name: "Fossile Incastonato", bonusText: "+1% Pietra", epic: false, wall: true, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 178, "wood": 81, "stone": 105}, img: "assets/ui/rifugio/furniture/set17/06.webp"},
        {id: "f167", name: "Cucciolo di Drago d'Ossa (Statua)", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 192, "wood": 61, "stone": 52}, img: "assets/ui/rifugio/furniture/set17/07.webp"},
        {id: "f168", name: "Kit di Scavo del Paleontologo", bonusText: "+2% Drop Progetti", epic: false, wall: false, effects: [{"type": "dropProjectChance", "value": 0.02}], price: {"gold": 206, "wood": 66, "stone": 56}, img: "assets/ui/rifugio/furniture/set17/08.webp"},
        {id: "f169", name: "Forziere d'Avorio", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 220, "wood": 70, "stone": 60}, img: "assets/ui/rifugio/furniture/set17/09.webp"},
        {id: "f170", name: "L'Anima di Drago Cristallizzata", bonusText: "+4% Danni in Arena", epic: true, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.04}], price: {"gold": 701, "wood": 223, "stone": 191}, img: "assets/ui/rifugio/furniture/set17/10.webp"},
      ],
    },
    {
      id: "set18", num: 18, name: "Il Vulcano Infernale",
      biomeIdx: 9, fallbackIcon: "🌋",
      setBonusDesc: "Furia del Magma (+15% Danni fissi in Arena)",
      setBonusEffects: [{"type": "arenaDmgMult", "value": 0.15}],
      items: [
        {id: "f171", name: "Pavimento in Cenere Compattata", bonusText: "+0.5% Danni Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.005}], price: {"gold": 114, "wood": 36, "stone": 31}, img: "assets/ui/rifugio/furniture/set18/01.webp"},
        {id: "f172", name: "Fessura di Magma (Lampada)", bonusText: "+1% Danni Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 129, "wood": 41, "stone": 35}, img: "assets/ui/rifugio/furniture/set18/02.webp"},
        {id: "f173", name: "Blocco di Basalto (Tavolo)", bonusText: "+1% Danni Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 143, "wood": 46, "stone": 39}, img: "assets/ui/rifugio/furniture/set18/03.webp"},
        {id: "f174", name: "Seduta in Pietra Pomice", bonusText: "+0.5% Danni Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.005}], price: {"gold": 158, "wood": 50, "stone": 43}, img: "assets/ui/rifugio/furniture/set18/04.webp"},
        {id: "f175", name: "Spadone di Ossidiana", bonusText: "+2% Danni Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.02}], price: {"gold": 173, "wood": 79, "stone": 102}, img: "assets/ui/rifugio/furniture/set18/05.webp"},
        {id: "f176", name: "Mappa delle Faglie", bonusText: "+1% Pietra", epic: false, wall: true, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 188, "wood": 85, "stone": 111}, img: "assets/ui/rifugio/furniture/set18/06.webp"},
        {id: "f177", name: "Statua della Fenice", bonusText: "+1% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 203, "wood": 64, "stone": 55}, img: "assets/ui/rifugio/furniture/set18/07.webp"},
        {id: "f178", name: "Mantice Gigante", bonusText: "+1% Danni Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 217, "wood": 69, "stone": 59}, img: "assets/ui/rifugio/furniture/set18/08.webp"},
        {id: "f179", name: "Forziere Forgiato nel Fuoco", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 232, "wood": 74, "stone": 63}, img: "assets/ui/rifugio/furniture/set18/09.webp"},
        {id: "f180", name: "La Fiamma Eterna", bonusText: "+3% Danni Arena e +1% XP Globale", epic: true, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.03}, {"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 740, "wood": 235, "stone": 202}, img: "assets/ui/rifugio/furniture/set18/10.webp"},
      ],
    },
    {
      id: "set19", num: 19, name: "La Cittadella dell'Eclissi",
      biomeIdx: 4, fallbackIcon: "🌒",
      setBonusDesc: "Dualità (+20% risorse bonus se allenamento post 18:00)",
      setBonusEffects: [{"type": "flag", "key": "dualityBonus", "value": 0.2}],
      items: [
        {id: "f181", name: "Parquet dell'Archivio", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 120, "wood": 38, "stone": 33}, img: "assets/ui/rifugio/furniture/set19/01.webp"},
        {id: "f182", name: "Tomo Ardente", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 135, "wood": 43, "stone": 37}, img: "assets/ui/rifugio/furniture/set19/02.webp"},
        {id: "f183", name: "Scrivania dell'Archivista", bonusText: "+1% Legna e Pietra", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.01}, {"type": "stoneMult", "value": 0.01}], price: {"gold": 151, "wood": 48, "stone": 41}, img: "assets/ui/rifugio/furniture/set19/03.webp"},
        {id: "f184", name: "Poltrona in Pelle Antica", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 167, "wood": 53, "stone": 45}, img: "assets/ui/rifugio/furniture/set19/04.webp"},
        {id: "f185", name: "Libreria Incassata", bonusText: "+1% Difesa Arena", epic: false, wall: true, effects: [{"type": "arenaDefMult", "value": 0.01}], price: {"gold": 182, "wood": 83, "stone": 108}, img: "assets/ui/rifugio/furniture/set19/05.webp"},
        {id: "f186", name: "Carta Stellare Incorniciata", bonusText: "+2% Drop Rari", epic: false, wall: true, effects: [{"type": "dropRareChance", "value": 0.02}], price: {"gold": 198, "wood": 90, "stone": 117}, img: "assets/ui/rifugio/furniture/set19/06.webp"},
        {id: "f187", name: "Globo d'Oro Antico", bonusText: "+1% HP Arena", epic: false, wall: false, effects: [{"type": "arenaHpMult", "value": 0.01}], price: {"gold": 213, "wood": 68, "stone": 58}, img: "assets/ui/rifugio/furniture/set19/07.webp"},
        {id: "f188", name: "Penna dell'Archivista", bonusText: "+1% Drop Progetti", epic: false, wall: false, effects: [{"type": "dropProjectChance", "value": 0.01}], price: {"gold": 229, "wood": 73, "stone": 62}, img: "assets/ui/rifugio/furniture/set19/08.webp"},
        {id: "f189", name: "Cassetta di Libri Rari", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 245, "wood": 78, "stone": 67}, img: "assets/ui/rifugio/furniture/set19/09.webp"},
        {id: "f190", name: "Il Grande Tomo dell'Eclissi", bonusText: "+3% Drop Rari e +1 Stamina", epic: true, wall: false, effects: [{"type": "dropRareChance", "value": 0.03}, {"type": "staminaMax", "value": 1}], price: {"gold": 779, "wood": 248, "stone": 213}, img: "assets/ui/rifugio/furniture/set19/10.webp"},
      ],
    },
    {
      id: "set20", num: 20, name: "Il Cuore del Vuoto",
      biomeIdx: 18, fallbackIcon: "🌑",
      setBonusDesc: "Ascensione (+20% a tutte le statistiche del gioco)",
      setBonusEffects: [{"type": "xpMult", "activity": "global", "value": 0.2}, {"type": "goldMult", "value": 0.2}, {"type": "woodMult", "value": 0.2}, {"type": "stoneMult", "value": 0.2}, {"type": "arenaDmgMult", "value": 0.2}],
      items: [
        {id: "f191", name: "Pavimento a Materia Oscura", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 126, "wood": 40, "stone": 34}, img: "assets/ui/rifugio/furniture/set20/01.webp"},
        {id: "f192", name: "Lampada a Singolarità", bonusText: "+1% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 142, "wood": 45, "stone": 39}, img: "assets/ui/rifugio/furniture/set20/02.webp"},
        {id: "f193", name: "Tavolo Anti-Gravità", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 159, "wood": 50, "stone": 43}, img: "assets/ui/rifugio/furniture/set20/03.webp"},
        {id: "f194", name: "Sedia di Luce Solida", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 175, "wood": 56, "stone": 48}, img: "assets/ui/rifugio/furniture/set20/04.webp"},
        {id: "f195", name: "Portale Dimensionale", bonusText: "Riduce costi Mercato del 2%", epic: false, wall: true, effects: [{"type": "marketDiscount", "value": 0.02}], price: {"gold": 191, "wood": 87, "stone": 113}, img: "assets/ui/rifugio/furniture/set20/05.webp"},
        {id: "f196", name: "Mappa del Cosmo", bonusText: "+2% Drop Progetti", epic: false, wall: true, effects: [{"type": "dropProjectChance", "value": 0.02}], price: {"gold": 208, "wood": 94, "stone": 123}, img: "assets/ui/rifugio/furniture/set20/06.webp"},
        {id: "f197", name: "Statua del Viaggiatore del Tempo", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 224, "wood": 71, "stone": 61}, img: "assets/ui/rifugio/furniture/set20/07.webp"},
        {id: "f198", name: "Distorsore Spazio-Temporale", bonusText: "+2% Danni in Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.02}], price: {"gold": 241, "wood": 77, "stone": 66}, img: "assets/ui/rifugio/furniture/set20/08.webp"},
        {id: "f199", name: "Forziere del Buco Nero", bonusText: "+2% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.02}], price: {"gold": 257, "wood": 82, "stone": 70}, img: "assets/ui/rifugio/furniture/set20/09.webp"},
        {id: "f200", name: "Il Frammento della Genesi", bonusText: "+5% XP, +5% Danni, +5% Risorse", epic: true, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.05}, {"type": "arenaDmgMult", "value": 0.05}, {"type": "goldMult", "value": 0.05}, {"type": "woodMult", "value": 0.05}, {"type": "stoneMult", "value": 0.05}], price: {"gold": 819, "wood": 260, "stone": 223}, img: "assets/ui/rifugio/furniture/set20/10.webp"},
      ],
    },
  ];
  function furnitureSetById(setId) { return FURNITURE_SETS.find(s => s.id === setId); }

  function furnitureSetOwnedCount(hero, setId) {
    const owned = (hero.furniture && hero.furniture.owned) || [];
    const s = furnitureSetById(setId);
    if (!s) return 0;
    return s.items.filter(it => owned.includes(it.id)).length;
  }

  function furnitureSetComplete(hero, setId) {
    return furnitureSetOwnedCount(hero, setId) === 10;
  }

  function furnitureUnlockedSets(hero) {
    return FURNITURE_SETS.filter(s => hero.level >= (BIOMES[s.biomeIdx] ? BIOMES[s.biomeIdx].min : 999));
  }

  // Somma tutti gli effetti degli oggetti posseduti + i bonus set completi.
  function furnitureAggregate(hero) {
    const totals = {
      xpMult: { camminata: 0, corsa: 0, cyclette: 0, global: 0 },
      goldMult: 0, woodMult: 0, stoneMult: 0,
      arenaDmgMult: 0, arenaHpMult: 0, arenaCritDmgMult: 0, arenaCritChance: 0, arenaDefMult: 0,
      bossDmgMult: 0, dropRareChance: 0, dropProjectChance: 0, doubleDropChance: 0,
      marketDiscount: 0, staminaMaxBonus: 0,
      flags: {},
    };
    const owned = (hero.furniture && hero.furniture.owned) || [];
    if (!owned.length) return totals;

    const applyEffect = e => {
      switch (e.type) {
        case 'xpMult': totals.xpMult[e.activity] += e.value; break;
        case 'goldMult': totals.goldMult += e.value; break;
        case 'woodMult': totals.woodMult += e.value; break;
        case 'stoneMult': totals.stoneMult += e.value; break;
        case 'arenaDmgMult': totals.arenaDmgMult += e.value; break;
        case 'arenaHpMult': totals.arenaHpMult += e.value; break;
        case 'arenaCritDmgMult': totals.arenaCritDmgMult += e.value; break;
        case 'arenaCritChance': totals.arenaCritChance += e.value; break;
        case 'arenaDefMult': totals.arenaDefMult += e.value; break;
        case 'bossDmgMult': totals.bossDmgMult += e.value; break;
        case 'dropRareChance': totals.dropRareChance += e.value; break;
        case 'dropProjectChance': totals.dropProjectChance += e.value; break;
        case 'doubleDropChance': totals.doubleDropChance += e.value; break;
        case 'marketDiscount': totals.marketDiscount += e.value; break;
        case 'staminaMax': totals.staminaMaxBonus += e.value; break;
        case 'flag': totals.flags[e.key] = e.value !== undefined ? e.value : true; break;
      }
    };

    FURNITURE_SETS.forEach(s => {
      s.items.forEach(it => { if (owned.includes(it.id)) it.effects.forEach(applyEffect); });
      if (furnitureSetComplete(hero, s.id)) s.setBonusEffects.forEach(applyEffect);
    });
    return totals;
  }

  function buyFurniture(hero, setId, itemId) {
    const s = furnitureSetById(setId);
    if (!s) return 'Set sconosciuto.';
    const it = s.items.find(i => i.id === itemId);
    if (!it) return 'Oggetto sconosciuto.';
    hero.furniture = hero.furniture || { owned: [] };
    if (hero.furniture.owned.includes(itemId)) return 'Lo possiedi già.';
    if (hero.level < (BIOMES[s.biomeIdx] ? BIOMES[s.biomeIdx].min : 999)) return 'Non hai ancora raggiunto questo bioma.';
    const p = it.price;
    if (hero.gold < p.gold || hero.wood < p.wood || hero.stone < p.stone) {
      return `Risorse insufficienti (servono 🪙${p.gold} 🌲${p.wood} ⛏️${p.stone}).`;
    }
    hero.gold -= p.gold; hero.wood -= p.wood; hero.stone -= p.stone;
    hero.furniture.owned.push(itemId);
    return { ok: true, setComplete: furnitureSetComplete(hero, setId) };
  }


  // Aura del Branco: entrambi i famigli felici contemporaneamente
  // (funziona solo tra eroi presenti sullo STESSO dispositivo, come le
  // "Visite al Rifugio" — richiederebbe un backend per il multi-device).
  function packAuraActive(state, hero) {
    const others = (state.heroes || []).filter(h => h.id !== hero.id && h.companion && h.pet);
    if (!hero.companion || !hero.pet) return false;
    const isHappy = p => p && p.hunger >= 80 && p.mood >= 80 && !p.sick;
    if (!isHappy(hero.pet)) return false;
    return others.some(o => { tickPet(o); return isHappy(o.pet); });
  }



  /* ═══════════════════════════════════════════════════════════
     LE IMPRESE DEL VIANDANTE — 100 traguardi, uno per livello
     ═══════════════════════════════════════════════════════════ */
  const ACHIEVEMENTS = [
    {id:"imp001", level:1, name:"Il Primo Passo", icon:"\ud83e\udd7e", desc:"Il viaggio di mille chilometri inizia da qui.", epic:true, reward:{gold:79, xp:53}},
    {id:"imp002", level:2, name:"Gambe d'Acciaio · Liv. 2", icon:"\ud83e\uddb5", desc:"I muscoli ricordano ogni chilometro percorso.", epic:false, reward:{gold:23, xp:16}},
    {id:"imp003", level:3, name:"Sudore Guadagnato · Liv. 3", icon:"\ud83d\udca7", desc:"Nessuna scorciatoia: solo fatica onesta.", epic:false, reward:{gold:27, xp:19}},
    {id:"imp004", level:4, name:"Occhio Allenato · Liv. 4", icon:"\ud83d\udc41\ufe0f", desc:"Riconosci un pericolo prima che si mostri.", epic:false, reward:{gold:31, xp:22}},
    {id:"imp005", level:5, name:"Guardiano di Oakhaven", icon:"\ud83c\udfda\ufe0f", desc:"Hai onorato la memoria del villaggio perduto.", epic:true, reward:{gold:95, xp:65}},
    {id:"imp006", level:6, name:"Zaino più Leggero · Liv. 6", icon:"\ud83c\udf92", desc:"Porti il peso del viaggio con più grazia.", epic:false, reward:{gold:39, xp:28}},
    {id:"imp007", level:7, name:"Sentiero Noto · Liv. 7", icon:"\ud83d\uddfa\ufe0f", desc:"Questa strada inizia a sembrarti casa.", epic:false, reward:{gold:43, xp:31}},
    {id:"imp008", level:8, name:"Alba dopo Alba · Liv. 8", icon:"\ud83c\udf05", desc:"Ti sei allenato anche quando non ne avevi voglia.", epic:false, reward:{gold:47, xp:34}},
    {id:"imp009", level:9, name:"Volontà di Ferro · Liv. 9", icon:"\ud83d\udd29", desc:"Un altro traguardo che pochi raggiungono.", epic:false, reward:{gold:51, xp:37}},
    {id:"imp010", level:10, name:"Voce della Foresta Sussurrante", icon:"\ud83c\udf32", desc:"Gli alberi ricordano il tuo passaggio.", epic:true, reward:{gold:115, xp:80}},
    {id:"imp011", level:11, name:"Fiato Robusto · Liv. 11", icon:"\ud83d\udca8", desc:"Il tuo respiro non trema più sotto sforzo.", epic:false, reward:{gold:59, xp:43}},
    {id:"imp012", level:12, name:"Gambe d'Acciaio · Liv. 12", icon:"\ud83e\uddb5", desc:"I muscoli ricordano ogni chilometro percorso.", epic:false, reward:{gold:63, xp:46}},
    {id:"imp013", level:13, name:"Sudore Guadagnato · Liv. 13", icon:"\ud83d\udca7", desc:"Nessuna scorciatoia: solo fatica onesta.", epic:false, reward:{gold:67, xp:49}},
    {id:"imp014", level:14, name:"Occhio Allenato · Liv. 14", icon:"\ud83d\udc41\ufe0f", desc:"Riconosci un pericolo prima che si mostri.", epic:false, reward:{gold:71, xp:52}},
    {id:"imp015", level:15, name:"Custode del Giardino Lastricato", icon:"\ud83c\udf3f", desc:"Le pietre lastricate conoscono il tuo passo.", epic:true, reward:{gold:135, xp:95}},
    {id:"imp016", level:16, name:"Zaino più Leggero · Liv. 16", icon:"\ud83c\udf92", desc:"Porti il peso del viaggio con più grazia.", epic:false, reward:{gold:79, xp:58}},
    {id:"imp017", level:17, name:"Sentiero Noto · Liv. 17", icon:"\ud83d\uddfa\ufe0f", desc:"Questa strada inizia a sembrarti casa.", epic:false, reward:{gold:83, xp:61}},
    {id:"imp018", level:18, name:"Alba dopo Alba · Liv. 18", icon:"\ud83c\udf05", desc:"Ti sei allenato anche quando non ne avevi voglia.", epic:false, reward:{gold:87, xp:64}},
    {id:"imp019", level:19, name:"Volontà di Ferro · Liv. 19", icon:"\ud83d\udd29", desc:"Un altro traguardo che pochi raggiungono.", epic:false, reward:{gold:91, xp:67}},
    {id:"imp020", level:20, name:"Signore delle Pianure del Vento", icon:"\ud83c\udf2c\ufe0f", desc:"Il vento non ti rallenta più.", epic:true, reward:{gold:155, xp:110}},
    {id:"imp021", level:21, name:"Fiato Robusto · Liv. 21", icon:"\ud83d\udca8", desc:"Il tuo respiro non trema più sotto sforzo.", epic:false, reward:{gold:99, xp:73}},
    {id:"imp022", level:22, name:"Gambe d'Acciaio · Liv. 22", icon:"\ud83e\uddb5", desc:"I muscoli ricordano ogni chilometro percorso.", epic:false, reward:{gold:103, xp:76}},
    {id:"imp023", level:23, name:"Sudore Guadagnato · Liv. 23", icon:"\ud83d\udca7", desc:"Nessuna scorciatoia: solo fatica onesta.", epic:false, reward:{gold:107, xp:79}},
    {id:"imp024", level:24, name:"Occhio Allenato · Liv. 24", icon:"\ud83d\udc41\ufe0f", desc:"Riconosci un pericolo prima che si mostri.", epic:false, reward:{gold:111, xp:82}},
    {id:"imp025", level:25, name:"Erudito dell'Antico Archivio", icon:"\ud83d\udcda", desc:"Hai letto ciò che pochi osano cercare.", epic:true, reward:{gold:175, xp:125}},
    {id:"imp026", level:26, name:"Zaino più Leggero · Liv. 26", icon:"\ud83c\udf92", desc:"Porti il peso del viaggio con più grazia.", epic:false, reward:{gold:119, xp:88}},
    {id:"imp027", level:27, name:"Sentiero Noto · Liv. 27", icon:"\ud83d\uddfa\ufe0f", desc:"Questa strada inizia a sembrarti casa.", epic:false, reward:{gold:123, xp:91}},
    {id:"imp028", level:28, name:"Alba dopo Alba · Liv. 28", icon:"\ud83c\udf05", desc:"Ti sei allenato anche quando non ne avevi voglia.", epic:false, reward:{gold:127, xp:94}},
    {id:"imp029", level:29, name:"Volontà di Ferro · Liv. 29", icon:"\ud83d\udd29", desc:"Un altro traguardo che pochi raggiungono.", epic:false, reward:{gold:131, xp:97}},
    {id:"imp030", level:30, name:"Martello delle Fucine di Ruggine", icon:"\u2699\ufe0f", desc:"Il metallo si piega alla tua costanza.", epic:true, reward:{gold:195, xp:140}},
    {id:"imp031", level:31, name:"Fiato Robusto · Liv. 31", icon:"\ud83d\udca8", desc:"Il tuo respiro non trema più sotto sforzo.", epic:false, reward:{gold:139, xp:103}},
    {id:"imp032", level:32, name:"Gambe d'Acciaio · Liv. 32", icon:"\ud83e\uddb5", desc:"I muscoli ricordano ogni chilometro percorso.", epic:false, reward:{gold:143, xp:106}},
    {id:"imp033", level:33, name:"Sudore Guadagnato · Liv. 33", icon:"\ud83d\udca7", desc:"Nessuna scorciatoia: solo fatica onesta.", epic:false, reward:{gold:147, xp:109}},
    {id:"imp034", level:34, name:"Occhio Allenato · Liv. 34", icon:"\ud83d\udc41\ufe0f", desc:"Riconosci un pericolo prima che si mostri.", epic:false, reward:{gold:151, xp:112}},
    {id:"imp035", level:35, name:"Adepto della Torre dell'Alchimista", icon:"\u2697\ufe0f", desc:"Hai distillato la pazienza in potere.", epic:true, reward:{gold:215, xp:155}},
    {id:"imp036", level:36, name:"Zaino più Leggero · Liv. 36", icon:"\ud83c\udf92", desc:"Porti il peso del viaggio con più grazia.", epic:false, reward:{gold:159, xp:118}},
    {id:"imp037", level:37, name:"Sentiero Noto · Liv. 37", icon:"\ud83d\uddfa\ufe0f", desc:"Questa strada inizia a sembrarti casa.", epic:false, reward:{gold:163, xp:121}},
    {id:"imp038", level:38, name:"Alba dopo Alba · Liv. 38", icon:"\ud83c\udf05", desc:"Ti sei allenato anche quando non ne avevi voglia.", epic:false, reward:{gold:167, xp:124}},
    {id:"imp039", level:39, name:"Volontà di Ferro · Liv. 39", icon:"\ud83d\udd29", desc:"Un altro traguardo che pochi raggiungono.", epic:false, reward:{gold:171, xp:127}},
    {id:"imp040", level:40, name:"Orologiaio della Cripta", icon:"\ud83d\udd70\ufe0f", desc:"Il tempo stesso rallenta per osservarti.", epic:true, reward:{gold:235, xp:170}},
    {id:"imp041", level:41, name:"Fiato Robusto · Liv. 41", icon:"\ud83d\udca8", desc:"Il tuo respiro non trema più sotto sforzo.", epic:false, reward:{gold:179, xp:133}},
    {id:"imp042", level:42, name:"Gambe d'Acciaio · Liv. 42", icon:"\ud83e\uddb5", desc:"I muscoli ricordano ogni chilometro percorso.", epic:false, reward:{gold:183, xp:136}},
    {id:"imp043", level:43, name:"Sudore Guadagnato · Liv. 43", icon:"\ud83d\udca7", desc:"Nessuna scorciatoia: solo fatica onesta.", epic:false, reward:{gold:187, xp:139}},
    {id:"imp044", level:44, name:"Occhio Allenato · Liv. 44", icon:"\ud83d\udc41\ufe0f", desc:"Riconosci un pericolo prima che si mostri.", epic:false, reward:{gold:191, xp:142}},
    {id:"imp045", level:45, name:"Perla della Baia del Corallo", icon:"\ud83e\udeb8", desc:"Le maree ti portano rispetto.", epic:true, reward:{gold:255, xp:185}},
    {id:"imp046", level:46, name:"Zaino più Leggero · Liv. 46", icon:"\ud83c\udf92", desc:"Porti il peso del viaggio con più grazia.", epic:false, reward:{gold:199, xp:148}},
    {id:"imp047", level:47, name:"Sentiero Noto · Liv. 47", icon:"\ud83d\uddfa\ufe0f", desc:"Questa strada inizia a sembrarti casa.", epic:false, reward:{gold:203, xp:151}},
    {id:"imp048", level:48, name:"Alba dopo Alba · Liv. 48", icon:"\ud83c\udf05", desc:"Ti sei allenato anche quando non ne avevi voglia.", epic:false, reward:{gold:207, xp:154}},
    {id:"imp049", level:49, name:"Volontà di Ferro · Liv. 49", icon:"\ud83d\udd29", desc:"Un altro traguardo che pochi raggiungono.", epic:false, reward:{gold:211, xp:157}},
    {id:"imp050", level:50, name:"Eroe di Mezza Via", icon:"\u2b50", desc:"Cinquanta livelli, e non hai mai smesso di correre.", epic:true, reward:{gold:275, xp:200}},
    {id:"imp051", level:51, name:"Fiato Robusto · Liv. 51", icon:"\ud83d\udca8", desc:"Il tuo respiro non trema più sotto sforzo.", epic:false, reward:{gold:219, xp:163}},
    {id:"imp052", level:52, name:"Gambe d'Acciaio · Liv. 52", icon:"\ud83e\uddb5", desc:"I muscoli ricordano ogni chilometro percorso.", epic:false, reward:{gold:223, xp:166}},
    {id:"imp053", level:53, name:"Sudore Guadagnato · Liv. 53", icon:"\ud83d\udca7", desc:"Nessuna scorciatoia: solo fatica onesta.", epic:false, reward:{gold:227, xp:169}},
    {id:"imp054", level:54, name:"Occhio Allenato · Liv. 54", icon:"\ud83d\udc41\ufe0f", desc:"Riconosci un pericolo prima che si mostri.", epic:false, reward:{gold:231, xp:172}},
    {id:"imp055", level:55, name:"Esploratore del Fossato Profondo", icon:"\ud83d\udd73\ufe0f", desc:"L'abisso ti ha guardato, e tu hai retto lo sguardo.", epic:true, reward:{gold:295, xp:215}},
    {id:"imp056", level:56, name:"Zaino più Leggero · Liv. 56", icon:"\ud83c\udf92", desc:"Porti il peso del viaggio con più grazia.", epic:false, reward:{gold:239, xp:178}},
    {id:"imp057", level:57, name:"Sentiero Noto · Liv. 57", icon:"\ud83d\uddfa\ufe0f", desc:"Questa strada inizia a sembrarti casa.", epic:false, reward:{gold:243, xp:181}},
    {id:"imp058", level:58, name:"Alba dopo Alba · Liv. 58", icon:"\ud83c\udf05", desc:"Ti sei allenato anche quando non ne avevi voglia.", epic:false, reward:{gold:247, xp:184}},
    {id:"imp059", level:59, name:"Volontà di Ferro · Liv. 59", icon:"\ud83d\udd29", desc:"Un altro traguardo che pochi raggiungono.", epic:false, reward:{gold:251, xp:187}},
    {id:"imp060", level:60, name:"Ombra delle Fognature del Reame", icon:"\ud83d\udc00", desc:"Nessun vicolo cieco ti trattiene.", epic:true, reward:{gold:315, xp:230}},
    {id:"imp061", level:61, name:"Fiato Robusto · Liv. 61", icon:"\ud83d\udca8", desc:"Il tuo respiro non trema più sotto sforzo.", epic:false, reward:{gold:259, xp:193}},
    {id:"imp062", level:62, name:"Gambe d'Acciaio · Liv. 62", icon:"\ud83e\uddb5", desc:"I muscoli ricordano ogni chilometro percorso.", epic:false, reward:{gold:263, xp:196}},
    {id:"imp063", level:63, name:"Sudore Guadagnato · Liv. 63", icon:"\ud83d\udca7", desc:"Nessuna scorciatoia: solo fatica onesta.", epic:false, reward:{gold:267, xp:199}},
    {id:"imp064", level:64, name:"Occhio Allenato · Liv. 64", icon:"\ud83d\udc41\ufe0f", desc:"Riconosci un pericolo prima che si mostri.", epic:false, reward:{gold:271, xp:202}},
    {id:"imp065", level:65, name:"Naufrago della Costa del Relitto", icon:"\u2693", desc:"Hai domato mari che spezzano le navi.", epic:true, reward:{gold:335, xp:245}},
    {id:"imp066", level:66, name:"Zaino più Leggero · Liv. 66", icon:"\ud83c\udf92", desc:"Porti il peso del viaggio con più grazia.", epic:false, reward:{gold:279, xp:208}},
    {id:"imp067", level:67, name:"Sentiero Noto · Liv. 67", icon:"\ud83d\uddfa\ufe0f", desc:"Questa strada inizia a sembrarti casa.", epic:false, reward:{gold:283, xp:211}},
    {id:"imp068", level:68, name:"Alba dopo Alba · Liv. 68", icon:"\ud83c\udf05", desc:"Ti sei allenato anche quando non ne avevi voglia.", epic:false, reward:{gold:287, xp:214}},
    {id:"imp069", level:69, name:"Volontà di Ferro · Liv. 69", icon:"\ud83d\udd29", desc:"Un altro traguardo che pochi raggiungono.", epic:false, reward:{gold:291, xp:217}},
    {id:"imp070", level:70, name:"Scalatore del Picco Innevato", icon:"\ud83c\udfd4\ufe0f", desc:"L'aria sottile non ferma il tuo cuore.", epic:true, reward:{gold:355, xp:260}},
    {id:"imp071", level:71, name:"Fiato Robusto · Liv. 71", icon:"\ud83d\udca8", desc:"Il tuo respiro non trema più sotto sforzo.", epic:false, reward:{gold:299, xp:223}},
    {id:"imp072", level:72, name:"Gambe d'Acciaio · Liv. 72", icon:"\ud83e\uddb5", desc:"I muscoli ricordano ogni chilometro percorso.", epic:false, reward:{gold:303, xp:226}},
    {id:"imp073", level:73, name:"Sudore Guadagnato · Liv. 73", icon:"\ud83d\udca7", desc:"Nessuna scorciatoia: solo fatica onesta.", epic:false, reward:{gold:307, xp:229}},
    {id:"imp074", level:74, name:"Occhio Allenato · Liv. 74", icon:"\ud83d\udc41\ufe0f", desc:"Riconosci un pericolo prima che si mostri.", epic:false, reward:{gold:311, xp:232}},
    {id:"imp075", level:75, name:"Cenere del Deserto", icon:"\ud83c\udf0b", desc:"Hai attraversato il fuoco e sei tornato.", epic:true, reward:{gold:375, xp:275}},
    {id:"imp076", level:76, name:"Zaino più Leggero · Liv. 76", icon:"\ud83c\udf92", desc:"Porti il peso del viaggio con più grazia.", epic:false, reward:{gold:319, xp:238}},
    {id:"imp077", level:77, name:"Sentiero Noto · Liv. 77", icon:"\ud83d\uddfa\ufe0f", desc:"Questa strada inizia a sembrarti casa.", epic:false, reward:{gold:323, xp:241}},
    {id:"imp078", level:78, name:"Alba dopo Alba · Liv. 78", icon:"\ud83c\udf05", desc:"Ti sei allenato anche quando non ne avevi voglia.", epic:false, reward:{gold:327, xp:244}},
    {id:"imp079", level:79, name:"Volontà di Ferro · Liv. 79", icon:"\ud83d\udd29", desc:"Un altro traguardo che pochi raggiungono.", epic:false, reward:{gold:331, xp:247}},
    {id:"imp080", level:80, name:"Spettro della Palude Nebbiosa", icon:"\ud83c\udf2b\ufe0f", desc:"La nebbia si apre al tuo passaggio.", epic:true, reward:{gold:395, xp:290}},
    {id:"imp081", level:81, name:"Fiato Robusto · Liv. 81", icon:"\ud83d\udca8", desc:"Il tuo respiro non trema più sotto sforzo.", epic:false, reward:{gold:339, xp:253}},
    {id:"imp082", level:82, name:"Gambe d'Acciaio · Liv. 82", icon:"\ud83e\uddb5", desc:"I muscoli ricordano ogni chilometro percorso.", epic:false, reward:{gold:343, xp:256}},
    {id:"imp083", level:83, name:"Sudore Guadagnato · Liv. 83", icon:"\ud83d\udca7", desc:"Nessuna scorciatoia: solo fatica onesta.", epic:false, reward:{gold:347, xp:259}},
    {id:"imp084", level:84, name:"Occhio Allenato · Liv. 84", icon:"\ud83d\udc41\ufe0f", desc:"Riconosci un pericolo prima che si mostri.", epic:false, reward:{gold:351, xp:262}},
    {id:"imp085", level:85, name:"Necromante del Cimitero dei Draghi", icon:"\ud83d\udc09", desc:"Le ossa antiche sussurrano il tuo nome.", epic:true, reward:{gold:415, xp:305}},
    {id:"imp086", level:86, name:"Zaino più Leggero · Liv. 86", icon:"\ud83c\udf92", desc:"Porti il peso del viaggio con più grazia.", epic:false, reward:{gold:359, xp:268}},
    {id:"imp087", level:87, name:"Sentiero Noto · Liv. 87", icon:"\ud83d\uddfa\ufe0f", desc:"Questa strada inizia a sembrarti casa.", epic:false, reward:{gold:363, xp:271}},
    {id:"imp088", level:88, name:"Alba dopo Alba · Liv. 88", icon:"\ud83c\udf05", desc:"Ti sei allenato anche quando non ne avevi voglia.", epic:false, reward:{gold:367, xp:274}},
    {id:"imp089", level:89, name:"Volontà di Ferro · Liv. 89", icon:"\ud83d\udd29", desc:"Un altro traguardo che pochi raggiungono.", epic:false, reward:{gold:371, xp:277}},
    {id:"imp090", level:90, name:"Minatore del Corruttore", icon:"\u26cf\ufe0f", desc:"Hai scavato nel cuore corrotto del reame.", epic:true, reward:{gold:435, xp:320}},
    {id:"imp091", level:91, name:"Fiato Robusto · Liv. 91", icon:"\ud83d\udca8", desc:"Il tuo respiro non trema più sotto sforzo.", epic:false, reward:{gold:379, xp:283}},
    {id:"imp092", level:92, name:"Gambe d'Acciaio · Liv. 92", icon:"\ud83e\uddb5", desc:"I muscoli ricordano ogni chilometro percorso.", epic:false, reward:{gold:383, xp:286}},
    {id:"imp093", level:93, name:"Sudore Guadagnato · Liv. 93", icon:"\ud83d\udca7", desc:"Nessuna scorciatoia: solo fatica onesta.", epic:false, reward:{gold:387, xp:289}},
    {id:"imp094", level:94, name:"Pretendente al Trono Corrotto", icon:"\ud83d\udc51", desc:"Il trono trema alla tua vicinanza.", epic:true, reward:{gold:451, xp:332}},
    {id:"imp095", level:95, name:"Cuore Instancabile · Liv. 95", icon:"\u2764\ufe0f", desc:"Il battito rallenta, la forza cresce.", epic:false, reward:{gold:395, xp:295}},
    {id:"imp096", level:96, name:"Zaino più Leggero · Liv. 96", icon:"\ud83c\udf92", desc:"Porti il peso del viaggio con più grazia.", epic:false, reward:{gold:399, xp:298}},
    {id:"imp097", level:97, name:"Viandante dell'Abisso del Vuoto", icon:"\ud83c\udf11", desc:"Il vuoto stesso esita davanti a te.", epic:true, reward:{gold:463, xp:341}},
    {id:"imp098", level:98, name:"Alba dopo Alba · Liv. 98", icon:"\ud83c\udf05", desc:"Ti sei allenato anche quando non ne avevi voglia.", epic:false, reward:{gold:407, xp:304}},
    {id:"imp099", level:99, name:"Volontà di Ferro · Liv. 99", icon:"\ud83d\udd29", desc:"Un altro traguardo che pochi raggiungono.", epic:false, reward:{gold:411, xp:307}},
    {id:"imp100", level:100, name:"Leggenda della Valle dei Cristalli Oscuri", icon:"\ud83d\udd2e", desc:"Cento livelli. Il Cavaliere del Drago ti attende.", epic:true, reward:{gold:475, xp:350}},
  ];

  /* ── Sfide Giornaliere ──────────────────────────────────── */
  const DAILY_CHALLENGES_POOL = [
    { type:'km',       icon:'🥾', target:2,  label:'Percorri 2 km oggi',            reward:{gold:25, xp:50}  },
    { type:'km',       icon:'🥾', target:3,  label:'Percorri 3 km oggi',            reward:{gold:35, xp:70}  },
    { type:'km',       icon:'🥾', target:5,  label:'Percorri 5 km oggi',            reward:{gold:50, xp:100} },
    { type:'km',       icon:'🥾', target:8,  label:'Percorri 8 km oggi',            reward:{gold:70, xp:140} },
    { type:'km',       icon:'🥾', target:10, label:'Percorri 10 km oggi',           reward:{gold:85, xp:170} },
    { type:'arena',    icon:'⚔️',  target:1,  label:'Vinci 1 battaglia nell\'Arena', reward:{gold:20, xp:40}  },
    { type:'arena',    icon:'⚔️',  target:2,  label:'Vinci 2 battaglie nell\'Arena', reward:{gold:35, xp:70}  },
    { type:'arena',    icon:'⚔️',  target:3,  label:'Vinci 3 battaglie nell\'Arena', reward:{gold:50, xp:100} },
    { type:'minigame', icon:'🎲', target:2,  label:'Gioca 2 partite alla Taverna',  reward:{gold:15, xp:30}  },
    { type:'minigame', icon:'🎲', target:3,  label:'Gioca 3 partite alla Taverna',  reward:{gold:25, xp:50}  },
    { type:'minigame', icon:'🎲', target:5,  label:'Gioca 5 partite alla Taverna',  reward:{gold:40, xp:80}  },
  ];
  const DAILY_CHALLENGES_BONUS = { gold: 60, xp: 120 };

  function _genDailyChallenges(hero, date) {
    const lv = hero.level;
    const tierKm    = lv <= 10 ? [0,1]  : lv <= 30 ? [1,2]  : lv <= 60 ? [2,3]  : [3,4];
    const tierArena = lv <= 10 ? [0]    : lv <= 30 ? [0,1]  : [1,2];
    const tierMg    = lv <= 10 ? [0,1]  : lv <= 30 ? [1,2]  : [2];
    let seed = 0;
    const key = date + (hero.id || '');
    for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) | 0;
    const pick = arr => { seed = (seed * 1664525 + 1013904223) | 0; return arr[Math.abs(seed) % arr.length]; };
    const kmPool    = DAILY_CHALLENGES_POOL.filter(c => c.type === 'km');
    const arenaPool = DAILY_CHALLENGES_POOL.filter(c => c.type === 'arena');
    const mgPool    = DAILY_CHALLENGES_POOL.filter(c => c.type === 'minigame');
    const mk = t => ({ type:t.type, icon:t.icon, target:t.target, label:t.label, reward:{...t.reward}, progress:0, claimed:false });
    return {
      date,
      list: [ mk(kmPool[pick(tierKm)]), mk(arenaPool[pick(tierArena)]), mk(mgPool[pick(tierMg)]) ],
      bonusClaimed: false,
    };
  }

  function getDailyChallenges(hero) {
    const today = todayStamp();
    if (!hero.dailyChallenges || hero.dailyChallenges.date !== today) {
      hero.dailyChallenges = _genDailyChallenges(hero, today);
    }
    return hero.dailyChallenges;
  }

  function updateChallengeProgress(hero, type, amount) {
    const dc = getDailyChallenges(hero);
    dc.list.forEach(ch => {
      if (ch.type === type && !ch.claimed && ch.progress < ch.target) {
        ch.progress = Math.min(ch.target, ch.progress + amount);
      }
    });
    updateWeeklyProgress(hero, type, amount);
  }

  function claimChallenge(hero, idx) {
    const dc = getDailyChallenges(hero);
    const ch = dc.list[idx];
    if (!ch) return 'Sfida non trovata.';
    if (ch.progress < ch.target) return 'Non ancora completata!';
    if (ch.claimed) return 'Ricompensa già riscossa.';
    ch.claimed = true;
    hero.gold += ch.reward.gold;
    hero.xp   += ch.reward.xp;
    /* 25% chance consumabile comune */
    const consumable = Math.random() < 0.25 ? dropConsumable(hero, 'comune') : null;
    let bonus = null;
    if (!dc.bonusClaimed && dc.list.every(c => c.claimed)) {
      dc.bonusClaimed = true;
      hero.gold += DAILY_CHALLENGES_BONUS.gold;
      hero.xp   += DAILY_CHALLENGES_BONUS.xp;
      bonus = DAILY_CHALLENGES_BONUS;
      /* Bonus totale: 50% chance raro */
      if (Math.random() < 0.50) dropConsumable(hero, 'raro');
    }
    return { ok: true, reward: ch.reward, bonus, consumable };
  }

  /* ── Sfide Settimanali ──────────────────────────────────── */
  const WEEKLY_CHALLENGES_POOL = [
    { type:'km',       icon:'🥾', target:15, label:'Percorri 15 km questa settimana',          reward:{gold:180, xp:300} },
    { type:'km',       icon:'🥾', target:25, label:'Percorri 25 km questa settimana',          reward:{gold:280, xp:450} },
    { type:'arena',    icon:'⚔️',  target:5,  label:"Vinci 5 battaglie nell'Arena",             reward:{gold:150, xp:250} },
    { type:'arena',    icon:'⚔️',  target:10, label:"Vinci 10 battaglie nell'Arena",            reward:{gold:250, xp:400} },
    { type:'sell',     icon:'💰', target:5,  label:'Vendi 5 oggetti al Contrabbando',          reward:{gold:120, xp:150} },
    { type:'sell',     icon:'💰', target:10, label:'Vendi 10 oggetti al Contrabbando',         reward:{gold:200, xp:220} },
    { type:'chest',    icon:'📦', target:3,  label:'Apri 3 scrigni di bottino',                reward:{gold:100, xp:200} },
    { type:'chest',    icon:'📦', target:6,  label:'Apri 6 scrigni di bottino',                reward:{gold:180, xp:350} },
    { type:'minigame', icon:'🎲', target:8,  label:'Gioca 8 partite alla Taverna',             reward:{gold:110, xp:200} },
    { type:'minigame', icon:'🎲', target:15, label:'Gioca 15 partite alla Taverna',            reward:{gold:180, xp:320} },
    { type:'dungeon',  icon:'🗡️', target:1,  label:"Assalta il Covo dell'Orda",               reward:{gold:200, xp:400} },
    { type:'dungeon',  icon:'🗡️', target:3,  label:"Assalta il Covo dell'Orda 3 volte",       reward:{gold:350, xp:600} },
    { type:'bisca',    icon:'🎰', target:3,  label:'Gioca 3 partite alla Bisca Oscura',        reward:{gold:100, xp:160} },
    { type:'bisca',    icon:'🎰', target:5,  label:'Gioca 5 partite alla Bisca Oscura',        reward:{gold:160, xp:260} },
    { type:'scalata',  icon:'🏔️', target:3,  label:"Raggiungi il Piano 3 nella Scalata",      reward:{gold:150, xp:260} },
    { type:'scalata',  icon:'🏔️', target:5,  label:"Raggiungi il Piano 5 nella Scalata",      reward:{gold:240, xp:400} },
    { type:'scalata',  icon:'🏔️', target:8,  label:"Raggiungi il Piano 8 nella Scalata",      reward:{gold:350, xp:580} },
  ];
  const WEEKLY_CHALLENGES_BONUS = { gold: 300, xp: 600 };

  function _genWeeklyChallenges(hero, week) {
    const lv = hero.level;
    let seed = 0;
    const key = week + (hero.id || '');
    for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) | 0;
    const pick = arr => { seed = (seed * 1664525 + 1013904223) | 0; return arr[Math.abs(seed) % arr.length]; };
    const mk = t => ({ type:t.type, icon:t.icon, target:t.target, label:t.label, reward:{...t.reward}, progress:0, claimed:false });
    const kmPool      = WEEKLY_CHALLENGES_POOL.filter(c => c.type === 'km');
    const arenaPool   = WEEKLY_CHALLENGES_POOL.filter(c => c.type === 'arena');
    const sellPool    = WEEKLY_CHALLENGES_POOL.filter(c => c.type === 'sell');
    const chestPool   = WEEKLY_CHALLENGES_POOL.filter(c => c.type === 'chest');
    const mgPool      = WEEKLY_CHALLENGES_POOL.filter(c => c.type === 'minigame');
    const dgPool      = WEEKLY_CHALLENGES_POOL.filter(c => c.type === 'dungeon');
    const biscaPool   = WEEKLY_CHALLENGES_POOL.filter(c => c.type === 'bisca');
    const scalataPool = WEEKLY_CHALLENGES_POOL.filter(c => c.type === 'scalata');
    const tierKm    = lv <= 15 ? [0] : [1];
    const tierArena = lv <= 15 ? [0] : [1];
    const baseExtra = lv >= 10 ? [...sellPool, ...chestPool, ...biscaPool] : [...chestPool, ...biscaPool];
    const extraPool = lv >= 5  ? baseExtra : chestPool;
    const slot4Pool = lv >= 15 ? [...dgPool, ...scalataPool] : lv >= 10 ? [...dgPool, ...mgPool] : mgPool;
    return {
      week,
      list: [
        mk(kmPool[pick(tierKm)]),
        mk(arenaPool[pick(tierArena)]),
        mk(pick(extraPool)),
        mk(pick(slot4Pool)),
      ],
      bonusClaimed: false,
    };
  }

  function getWeeklyChallenges(hero) {
    const week = weekStamp();
    if (!hero.weeklyChallenges || hero.weeklyChallenges.week !== week) {
      hero.weeklyChallenges = _genWeeklyChallenges(hero, week);
    }
    return hero.weeklyChallenges;
  }

  function updateWeeklyProgress(hero, type, amount) {
    const wc = getWeeklyChallenges(hero);
    wc.list.forEach(ch => {
      if (ch.type === type && !ch.claimed && ch.progress < ch.target) {
        ch.progress = Math.min(ch.target, ch.progress + amount);
      }
    });
  }

  function claimWeeklyChallenge(hero, idx) {
    const wc = getWeeklyChallenges(hero);
    const ch = wc.list[idx];
    if (!ch) return 'Sfida non trovata.';
    if (ch.progress < ch.target) return 'Non ancora completata!';
    if (ch.claimed) return 'Ricompensa già riscossa.';
    ch.claimed = true;
    hero.gold += ch.reward.gold;
    hero.xp   += ch.reward.xp;
    /* 30% chance consumabile raro */
    const consumable = Math.random() < 0.30 ? dropConsumable(hero, 'raro') : null;
    let bonus = null;
    if (!wc.bonusClaimed && wc.list.every(c => c.claimed)) {
      wc.bonusClaimed = true;
      hero.gold += WEEKLY_CHALLENGES_BONUS.gold;
      hero.xp   += WEEKLY_CHALLENGES_BONUS.xp;
      bonus = WEEKLY_CHALLENGES_BONUS;
      /* Bonus totale: 50% chance epico */
      if (Math.random() < 0.50) dropConsumable(hero, 'epico');
    }
    return { ok: true, reward: ch.reward, bonus, consumable };
  }

  /* ── Il Covo dell'Orda (Dungeon) ────────────────────────── */
  const DUNGEON_SCENARIOS = [
    { text: 'Il nemico carica con furia cieca!',
      choices: [
        { icon:'⚔️', label:'Contrattacchi con forza',      hit:[22,38], dmg:[12,22] },
        { icon:'🛡️', label:'Vi coprite e attendete',        hit:[8,16],  dmg:[4,10]  },
        { icon:'💨', label:'Schivate di lato',              hit:[0,42],  dmg:[0,28]  },
      ]},
    { text: 'Il nemico cerca un varco nella tua guardia.',
      choices: [
        { icon:'🔒', label:'Chiudete la guardia',           hit:[10,18], dmg:[5,12]  },
        { icon:'⚡', label:'Anticipate con un affondo',     hit:[20,35], dmg:[14,24] },
        { icon:'🌀', label:'Contrastate con astuzia',       hit:[14,26], dmg:[8,16]  },
      ]},
    { text: 'Un momento di stallo — valutate la prossima mossa.',
      choices: [
        { icon:'🎯', label:'Colpo preciso al punto debole', hit:[18,30], dmg:[10,18] },
        { icon:'🛡️', label:'Posizione difensiva ferma',     hit:[8,15],  dmg:[3,8]   },
        { icon:'🌪️', label:'Attacco rotante a sorpresa',    hit:[0,45],  dmg:[0,30]  },
      ]},
    { text: 'Il nemico urla per intimidirvi.',
      choices: [
        { icon:'😤', label:'Reggete lo sguardo e colpite',  hit:[20,32], dmg:[10,20] },
        { icon:'👣', label:'Arretrate per riorganizzarvi',  hit:[5,14],  dmg:[0,8]   },
        { icon:'🗣️', label:'Lo distraete con le parole',    hit:[12,22], dmg:[5,14]  },
      ]},
    { text: 'Il terreno è scomodo — sassi e radici ovunque.',
      choices: [
        { icon:'🦵', label:'Sfruttate il terreno con una spinta', hit:[15,28], dmg:[12,20] },
        { icon:'🧠', label:'Vi muovete con cautela',               hit:[10,20], dmg:[3,9]   },
        { icon:'⛏️', label:'Lanciate un sasso come diversivo',     hit:[8,18],  dmg:[5,12]  },
      ]},
    { text: 'Il nemico tenta un colpo basso!',
      choices: [
        { icon:'⬆️', label:"Saltate e colpite dall'alto",          hit:[25,40], dmg:[16,28] },
        { icon:'🛡️', label:'Bloccate col braccio',                  hit:[6,14],  dmg:[0,8]   },
        { icon:'↩️', label:'Girate e contrattaccate alle spalle',   hit:[15,30], dmg:[8,18]  },
      ]},
    { text: "Un'apertura — il nemico abbassa la guardia.",
      choices: [
        { icon:'🗡️', label:"Colpo rapido nell'apertura",           hit:[30,45], dmg:[8,18]  },
        { icon:'🤜', label:'Pugno deciso al centro',               hit:[18,28], dmg:[12,20] },
        { icon:'⏸️', label:'Aspettate una seconda apertura',       hit:[10,22], dmg:[2,8]   },
      ]},
    { text: 'Il nemico si carica per un attacco devastante.',
      choices: [
        { icon:'💥', label:'Intercettate il colpo',                 hit:[20,35], dmg:[20,35] },
        { icon:'🏃', label:'Vi spostate rapidamente',               hit:[5,15],  dmg:[8,16]  },
        { icon:'🌟', label:"Sfruttate l'apertura del carico",       hit:[15,28], dmg:[5,15]  },
      ]},
  ];

  const DUNGEON_CHOICE_SETS = [
    [{ id:'rest',    icon:'💊', label:'Curi le ferite',        desc:'Il prossimo nemico parte con −20 HP.', effect:'debuffEnemy', val:20 },
     { id:'rush',    icon:'⚡', label:'Carichi di corsa',      desc:'+10 danni al prossimo scontro.',       effect:'buffDmg',    val:10 }],
    [{ id:'scout',   icon:'🔍', label:'Esplori i dintorni',    desc:'Conosci in anticipo la debolezza.',    effect:'revealWeak', val:1  },
     { id:'trap',    icon:'🪤', label:'Tendi una trappola',    desc:'Il nemico inizia con −30 HP.',         effect:'debuffEnemy', val:30 }],
    [{ id:'meditate',icon:'🧘', label:'Mediti prima del duello', desc:'+20% danni al prossimo scontro.',   effect:'buffDmgPct', val:0.20 },
     { id:'loot',    icon:'💰', label:'Rovisti tra le rovine', desc:'Trovi subito +40 monete.',             effect:'goldNow',    val:40 }],
  ];

  function startDungeon(hero) {
    if (!canStartDungeon(hero)) return null;
    const accessible = accessibleZones(hero);
    const pool = BESTIARY.filter(b => !b.final && accessible.includes(b.zone));
    const normals = pool.filter(b => !b.boss).sort(() => Math.random() - 0.5).slice(0, 3);
    const fallbackNormals = BESTIARY.filter(b => !b.final && !b.boss);
    while (normals.length < 3) normals.push(fallbackNormals[normals.length % fallbackNormals.length]);
    const bossPool = pool.filter(b => b.boss);
    const boss = bossPool.length ? bossPool[Math.floor(Math.random() * bossPool.length)]
      : BESTIARY.find(b => b.id === 'guerriero-fantasma');
    hero.activeDungeon = {
      step: 0,
      enemies: [...normals.map(e => e.id), boss.id],
      pendingChoice: false,
      buffs: { debuffEnemy:0, buffDmg:0, buffDmgPct:0, revealWeak:false },
      log: [],
      done: false,
      heroHp: 100, heroMaxHp: 100,
      enemyHp: 0,  enemyMaxHp: 0,
      scenarioIdx: 0,
    };
    return hero.activeDungeon;
  }

  function canStartDungeon(hero) {
    if (hero.activeDungeon && !hero.activeDungeon.done) return false;
    return hero.lastDungeon !== todayStamp();
  }

  function dungeonCurrentEnemy(hero) {
    const d = hero.activeDungeon;
    if (!d || d.done) return null;
    return BESTIARY.find(b => b.id === d.enemies[d.step]) || null;
  }

  function dungeonStartEncounter(hero) {
    const d = hero.activeDungeon;
    if (!d) return;
    const enemy = dungeonCurrentEnemy(hero);
    if (!enemy) return;
    const base = enemy.boss ? 130 : 90;
    d.enemyMaxHp = Math.max(20, base - d.buffs.debuffEnemy);
    d.enemyHp = d.enemyMaxHp;
    d.scenarioIdx = Math.floor(Math.random() * DUNGEON_SCENARIOS.length);
    const cb = hero.consumableBuffs;
    if (cb) {
      if (cb.dungeonRevealWeak) { d.buffs.revealWeak = true;           delete cb.dungeonRevealWeak; }
      if (cb.dungeonBuffDmg > 0){ d.buffs.buffDmg += cb.dungeonBuffDmg; delete cb.dungeonBuffDmg;   }
    }
  }

  function dungeonGetScenario(hero) {
    const d = hero.activeDungeon;
    if (!d) return DUNGEON_SCENARIOS[0];
    return DUNGEON_SCENARIOS[d.scenarioIdx % DUNGEON_SCENARIOS.length];
  }

  function dungeonAction(hero, choiceIdx) {
    const d = hero.activeDungeon;
    if (!d || d.done) return null;
    const scenario = dungeonGetScenario(hero);
    const choice = scenario.choices[choiceIdx];
    if (!choice) return null;
    let heroHit = choice.hit[0] + Math.round(Math.random() * (choice.hit[1] - choice.hit[0]));
    heroHit = Math.max(0, Math.round(heroHit * (1 + d.buffs.buffDmgPct) + d.buffs.buffDmg));
    const heroDmg = choice.dmg[0] + Math.round(Math.random() * (choice.dmg[1] - choice.dmg[0]));
    d.enemyHp = Math.max(0, d.enemyHp - heroHit);
    d.heroHp  = Math.max(0, d.heroHp  - heroDmg);
    d.scenarioIdx = (d.scenarioIdx + 1) % DUNGEON_SCENARIOS.length;
    return { heroHit, heroDmg, enemyDefeated: d.enemyHp <= 0, heroDefeated: d.heroHp <= 0 };
  }

  function dungeonMakeChoice(hero, choiceIdx) {
    const d = hero.activeDungeon;
    if (!d || !d.pendingChoice || d.done) return null;
    const setIdx = Math.min(d.step - 1, DUNGEON_CHOICE_SETS.length - 1);
    const option = DUNGEON_CHOICE_SETS[setIdx][choiceIdx];
    if (!option) return null;
    d.buffs = { debuffEnemy:0, buffDmg:0, buffDmgPct:0, revealWeak:false };
    if (option.effect === 'debuffEnemy')  d.buffs.debuffEnemy = option.val;
    else if (option.effect === 'buffDmg')     d.buffs.buffDmg = option.val;
    else if (option.effect === 'buffDmgPct')  d.buffs.buffDmgPct = option.val;
    else if (option.effect === 'revealWeak')  d.buffs.revealWeak = true;
    else if (option.effect === 'goldNow')     { hero.gold += option.val; }
    d.pendingChoice = false;
    d.log.push({ type:'choice', label:option.label });
    return { option };
  }

  function dungeonStepResult(hero, won) {
    const d = hero.activeDungeon;
    if (!d || d.done) return null;
    d.log.push({ type:'fight', step:d.step, won });
    d.buffs = { debuffEnemy:0, buffDmg:0, buffDmgPct:0, revealWeak:false };

    if (!won) {
      d.done = true;
      hero.lastDungeon = todayStamp();
      const gold = Math.max(10, Math.round(25 * d.step + Math.random() * 15));
      const xp   = Math.max(20, Math.round(40 * d.step));
      hero.gold += gold; hero.xp += xp;
      return { done:true, won:false, reward:{ gold, xp, complete:false, stepsOk:d.step } };
    }

    d.step++;
    updateWeeklyProgress(hero, 'arena', 1);
    updateChallengeProgress(hero, 'arena', 1);

    if (d.step >= d.enemies.length) {
      d.done = true;
      hero.lastDungeon = todayStamp();
      const gold = Math.round(150 + hero.level * 8 + Math.random() * 50);
      const xp   = Math.round(200 + hero.level * 10);
      hero.gold += gold; hero.xp += xp;
      const item = genItemFor(hero, 'epico');
      hero.items.push(item);
      updateWeeklyProgress(hero, 'dungeon', 1);
      return { done:true, won:true, reward:{ gold, xp, item, complete:true } };
    }

    const isBossNext = d.step === d.enemies.length - 1;
    if (!isBossNext) d.pendingChoice = true;
    return { done:false, won:true, nextEnemyId:d.enemies[d.step], pendingChoice:d.pendingChoice };
  }

  /* ── La Scalata dell'Eroe — motore ────────────────────────────────── */

  const SCALATA_ATK = [18, 38, 60, 85];
  const SCALATA_DEF = [20, 42, 65, 90];

  function generateEnemyMove(floor, isBoss) {
    const r = Math.random();
    if (isBoss) {
      if (r < 0.30) return 'normal';
      if (r < 0.55) return 'double';
      if (r < 0.75) return 'rage';
      if (r < 0.90) return 'guard';
      return 'poison';
    }
    if (r < 0.50) return 'normal';
    if (r < 0.70) return 'poison';
    if (r < 0.85) return 'double';
    return 'guard';
  }

  function scalataEnemyForFloor(floor) {
    const isBoss = floor % 5 === 0;
    const biomeIdx = Math.min(Math.floor((floor - 1) / 5), BIOMES.length - 1);
    const biome = BIOMES[biomeIdx];
    const inZone = BESTIARY.filter(b => b.zone === biome.name && !b.final);
    if (isBoss) {
      const pool = inZone.filter(b => b.boss).length
        ? inZone.filter(b => b.boss)
        : BESTIARY.filter(b => b.boss && !b.final);
      return pool[Math.floor(Math.random() * pool.length)] || BESTIARY[0];
    }
    const pool = inZone.filter(b => !b.boss).length
      ? inZone.filter(b => !b.boss)
      : BESTIARY.filter(b => !b.boss && !b.final);
    return pool[Math.floor(Math.random() * pool.length)] || BESTIARY[0];
  }

  function scalataEnemyStats(floor) {
    const isBoss = floor % 5 === 0;
    const scale = 1 + (floor - 1) * 0.08;
    return {
      hp:  isBoss ? Math.round(160 * scale) : Math.round(100 * scale),
      dmg: isBoss ? Math.round(42  * scale) : Math.round(28  * scale),
      isBoss,
    };
  }

  function canStartScalata(hero) {
    if (hero.activeScalata && !hero.activeScalata.done) return true;
    return hero.lastScalata !== todayStamp();
  }

  function startScalata(hero) {
    if (hero.activeScalata && !hero.activeScalata.done) return hero.activeScalata;
    if (hero.lastScalata === todayStamp()) return null;
    if (!hero.scalataRecord) hero.scalataRecord = { bestFloor: 0, totalRuns: 0 };
    hero.scalataRecord.totalRuns++;
    const floor = 1;
    const stats = scalataEnemyStats(floor);
    const enemy = scalataEnemyForFloor(floor);
    const prevBest = hero.scalataRecord.bestFloor;
    const hpBonus = (hero.consumableBuffs?.scalataHpBonus || 0);
    if (hpBonus > 0) delete hero.consumableBuffs.scalataHpBonus;
    hero.activeScalata = {
      floor,
      heroHp: 100 + hpBonus, heroMaxHp: 100 + hpBonus,
      enemyId: enemy.id,
      enemyHp: stats.hp, enemyMaxHp: stats.hp, enemyDmg: stats.dmg, isBoss: stats.isBoss,
      enemyMoveType: generateEnemyMove(floor, stats.isBoss),
      done: false, interlude: false,
      goldEarned: 0, xpEarned: 0, prevBest,
      heroPoison: 0, kills: 0, jollyDice: 0, nextRoundBlock: 0,
      lastDmgDealt: 0, lastBlkDealt: 0, lastEffect: '—',
    };
    hero.lastScalata = todayStamp();
    return hero.activeScalata;
  }

  function scalataResolveDice(hero, alloc) {
    const s = hero.activeScalata;
    if (!s || s.done || s.interlude) return null;
    const magBonus = hero.consumableBuffs?.scalataMagBonus || 0;
    const total = (alloc.atk || 0) + (alloc.def || 0) + (alloc.mag || 0);
    if (total !== 4 + (s.jollyDice || 0)) return null;
    if (magBonus > 0) {
      alloc = { ...alloc, mag: (alloc.mag || 0) + magBonus };
      delete hero.consumableBuffs.scalataMagBonus;
    }

    // Apply lingering poison before this round's actions
    const poisonDmg = s.heroPoison || 0;
    if (poisonDmg > 0) {
      s.heroHp = Math.max(0, s.heroHp - poisonDmg);
      s.heroPoison = 0;
    }
    if (s.heroHp <= 0) {
      s.done = true;
      if (s.floor > hero.scalataRecord.bestFloor) hero.scalataRecord.bestFloor = s.floor;
      const wc = getWeeklyChallenges(hero);
      wc.list.forEach(ch => {
        if (ch.type === 'scalata' && !ch.claimed)
          ch.progress = Math.min(ch.target, Math.max(ch.progress, s.floor));
      });
      return { heroDmg: 0, block: 0, magExtra: 0, magEffect: null, enemyHit: 0,
               enemyDefeated: false, heroDefeated: true, goldGained: 0, xpGained: 0, poisonDmg };
    }

    if (s.jollyDice > 0) s.jollyDice = 0;

    const currentMove = s.enemyMoveType || 'normal';
    const atkDice = alloc.atk || 0;
    const defDice = alloc.def || 0;
    const magDice = alloc.mag || 0;

    let heroDmg = atkDice > 0 ? SCALATA_ATK[Math.min(atkDice - 1, 3)] : 0;
    let block   = defDice > 0 ? SCALATA_DEF[Math.min(defDice - 1, 3)] : 0;
    let magEffect = null;
    let magExtra  = 0;

    if (magDice >= 3)      { magEffect = 'stun'; }
    else if (magDice >= 2) { magEffect = 'poison'; magExtra = 22; }
    else if (magDice === 1){ magEffect = 'weaken'; block += 10; }

    block += (s.nextRoundBlock || 0);
    s.nextRoundBlock = 0;

    // Guard: enemy blocks 20 of hero's raw attack damage
    const effectiveHeroDmg = currentMove === 'guard' ? Math.max(0, heroDmg - 20) : heroDmg;
    s.enemyHp = Math.max(0, s.enemyHp - effectiveHeroDmg - magExtra);
    const enemyDefeated = s.enemyHp <= 0;

    // Double: enemy attacks twice this round
    const rawEnemyAttack = currentMove === 'double' ? s.enemyDmg * 2 : s.enemyDmg;
    const enemyHit = magEffect === 'stun' ? 0 : Math.max(0, rawEnemyAttack - block);
    s.heroHp = Math.max(0, s.heroHp - enemyHit);
    const heroDefeated = s.heroHp <= 0;

    // Side effects when enemy survives
    if (!enemyDefeated) {
      if (currentMove === 'poison') s.heroPoison = 10;
      if (currentMove === 'rage')   s.enemyDmg += 15;
      s.enemyMoveType = generateEnemyMove(s.floor, s.isBoss);
    }

    let goldGained = 0, xpGained = 0;
    if (enemyDefeated && !heroDefeated) {
      goldGained = Math.round(6 + s.floor * 3 + Math.random() * 8);
      xpGained   = Math.round(10 + s.floor * 2);
      hero.gold  += goldGained;
      applyXp(hero, xpGained);
      s.goldEarned += goldGained;
      s.xpEarned   = (s.xpEarned || 0) + xpGained;
      s.kills = (s.kills || 0) + 1;
    }

    if ((enemyDefeated || heroDefeated) && s.floor > hero.scalataRecord.bestFloor) {
      hero.scalataRecord.bestFloor = s.floor;
    }

    if (heroDefeated) {
      s.done = true;
      const wc = getWeeklyChallenges(hero);
      wc.list.forEach(ch => {
        if (ch.type === 'scalata' && !ch.claimed)
          ch.progress = Math.min(ch.target, Math.max(ch.progress, s.floor));
      });
    } else if (enemyDefeated) {
      s.interlude = true;
    }

    s.lastDmgDealt = effectiveHeroDmg + magExtra;
    s.lastBlkDealt = block;
    s.lastEffect = magEffect === 'stun' ? 'Stordito!' : magEffect === 'poison' ? '+22 veleno' : magEffect === 'weaken' ? '+10 blocco' : '—';

    // Virtù famiglio
    if (atkDice >= 3) addPetVirtue(hero, 'coraggio', 1);
    if (magDice >= 2) addPetVirtue(hero, 'astuzia', 1);
    if (enemyDefeated) {
      addPetVirtue(hero, 'coraggio', 2);
      if (hero.pet && hero.pet.accessory === 'medaglione') addPetVirtue(hero, 'coraggio', 2);
    }

    return { heroDmg: effectiveHeroDmg, block, magExtra, magEffect, enemyHit,
             enemyDefeated, heroDefeated, goldGained, xpGained, poisonDmg,
             wasGuarded: currentMove === 'guard', wasDouble: currentMove === 'double' };
  }

  function scalataAdvanceFloor(hero, choice) {
    const s = hero.activeScalata;
    if (!s || s.done || !s.interlude) return null;

    let healed = 0, goldBonus = 0, surpriseDmg = 0;
    if (choice === 'heal') {
      healed   = Math.min(30, s.heroMaxHp - s.heroHp);
      s.heroHp = Math.min(s.heroMaxHp, s.heroHp + 30);
    } else if (choice === 'gold') {
      goldBonus    = Math.round(20 + s.floor * 3);
      hero.gold   += goldBonus;
      s.goldEarned += goldBonus;
    } else if (choice === 'surprise') {
      surpriseDmg = Math.round(20 + s.floor * 2);
    }
    // 'none' = shop floor, player spent gold on items already

    s.floor++;
    s.interlude = false;
    s.heroPoison = 0; // poison clears between floors

    if (s.floor > hero.scalataRecord.bestFloor) hero.scalataRecord.bestFloor = s.floor;

    const stats = scalataEnemyStats(s.floor);
    const enemy = scalataEnemyForFloor(s.floor);
    s.enemyId    = enemy.id;
    s.enemyHp    = Math.max(1, stats.hp - surpriseDmg);
    s.enemyMaxHp = stats.hp;
    s.enemyDmg   = stats.dmg;
    s.isBoss     = stats.isBoss;
    s.enemyMoveType = generateEnemyMove(s.floor, stats.isBoss);

    return { floor: s.floor, healed, goldBonus, surpriseDmg, enemyId: enemy.id };
  }

  function scalataGiveUp(hero) {
    const s = hero.activeScalata;
    if (!s || s.done) return null;
    s.done = true;
    if (s.floor > hero.scalataRecord.bestFloor) hero.scalataRecord.bestFloor = s.floor;
    const wc = getWeeklyChallenges(hero);
    wc.list.forEach(ch => {
      if (ch.type === 'scalata' && !ch.claimed)
        ch.progress = Math.min(ch.target, Math.max(ch.progress, s.floor));
    });
    return { floor: s.floor, goldEarned: s.goldEarned, xpEarned: s.xpEarned || 0 };
  }

  function scalataShopBuy(hero, item) {
    const s = hero.activeScalata;
    if (!s || s.done) return 'Nessuna Scalata in corso.';
    const SHOP_ITEMS = {
      pozione: { cost: 20 },
      jolly:   { cost: 30 },
      scudo:   { cost: 25 },
      elisir:  { cost: 45 },
    };
    const itm = SHOP_ITEMS[item];
    if (!itm) return 'Oggetto sconosciuto.';
    if (hero.gold < itm.cost) return 'Oro insufficiente.';
    hero.gold -= itm.cost;
    if (item === 'pozione')     s.heroHp = Math.min(s.heroMaxHp, s.heroHp + 35);
    else if (item === 'jolly')  s.jollyDice = Math.min(1, (s.jollyDice || 0) + 1);
    else if (item === 'scudo')  s.nextRoundBlock = (s.nextRoundBlock || 0) + 20;
    else if (item === 'elisir') { s.heroMaxHp += 20; s.heroHp = Math.min(s.heroMaxHp, s.heroHp + 20); }
    addPetVirtue(hero, 'astuzia', 2);
    return null;
  }

  function applyXp(hero, amount) {
    hero.xp = (hero.xp || 0) + amount;
    const levelsGained = [];
    while (hero.level < MAX_LEVEL && hero.xp >= xpForLevel(hero.level)) {
      hero.xp -= xpForLevel(hero.level);
      hero.level++;
      levelsGained.push(hero.level);
      if (hero.level === 5 && !hero.cards.includes('card_casa')) {
        hero.cards.push('card_casa');
      }
    }
    if (hero.level >= MAX_LEVEL && hero.xp > xpForLevel(hero.level)) {
      hero.xp = xpForLevel(hero.level);
    }
    return levelsGained;
  }

  const CONSUMABLE_ACHIEVEMENTS = [
    { id:'con001', name:'Primo Sorso',        icon:'⚗️', desc:'Usa il tuo primo consumabile.',         threshold:1,   reward:{gold:50,  xp:80}  },
    { id:'con002', name:'Erborista Dilettante',icon:'🌿', desc:'Usa 5 consumabili.',                   threshold:5,   reward:{gold:100, xp:150} },
    { id:'con003', name:'Alchimista Curioso',  icon:'🔮', desc:'Usa 10 consumabili.',                  threshold:10,  reward:{gold:180, xp:250} },
    { id:'con004', name:'Viandante Rifornito', icon:'🎒', desc:'Usa 25 consumabili.',                  threshold:25,  reward:{gold:300, xp:400} },
    { id:'con005', name:'Maestro delle Pozioni',icon:'💰',desc:'Usa 50 consumabili.',                  threshold:50,  reward:{gold:500, xp:700} },
    { id:'con006', name:'Sacca Leggendaria',   icon:'👑', desc:'Usa 100 consumabili. Un\'impresa epica.',threshold:100,reward:{gold:900, xp:1200}},
  ];

  function consumableAchievementsUnlocked(hero) {
    const used = hero.consumablesUsed || 0;
    return CONSUMABLE_ACHIEVEMENTS.filter(a => used >= a.threshold);
  }

  function achievementsUnlocked(hero) {
    return ACHIEVEMENTS.filter(a => hero.level >= a.level);
  }

  function claimAchievement(hero, id) {
    const a = ACHIEVEMENTS.find(x => x.id === id) || CONSUMABLE_ACHIEVEMENTS.find(x => x.id === id);
    if (!a) return 'Impresa sconosciuta.';
    hero.achievementsClaimed = hero.achievementsClaimed || [];
    if (hero.achievementsClaimed.includes(id)) return 'Ricompensa già ritirata.';
    if (a.threshold !== undefined && (hero.consumablesUsed || 0) < a.threshold)
      return `Usa ancora ${a.threshold - (hero.consumablesUsed || 0)} consumabili per sbloccarla.`;
    if (a.level !== undefined && hero.level < a.level) return `Raggiungi il Livello ${a.level} per sbloccarla.`;
    hero.achievementsClaimed.push(id);
    hero.gold += a.reward.gold;
    hero.xp += a.reward.xp;
    return { ok: true, reward: a.reward };
  }

  function canPrestige(hero) { return hero.level >= MAX_LEVEL; }
  function prestige(hero) {
    if (!canPrestige(hero)) return false;
    hero.prestige = hero.prestige || { count: 0 };
    hero.prestige.count++;
    hero.level = 1;
    hero.xp = 0;
    return true;
  }

  const MONTH_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  function getMonthlyRecap(hero) {
    const now = new Date();
    const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const ly = now.getMonth() === 0 ? now.getFullYear()-1 : now.getFullYear();
    const prefix = `${ly}-${String(lm+1).padStart(2,'0')}`;
    const logs = hero.log.filter(l => new Date(l.date).toISOString().slice(0,7) === prefix);
    if (!logs.length) return null;
    return {
      month: MONTH_IT[lm],
      km: +logs.reduce((s,l)=>s+l.km,0).toFixed(1),
      sessions: logs.length,
      xp: logs.reduce((s,l)=>s+(l.xp||0),0),
    };
  }
  function monthStamp() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }

  function getWeeklyRecap(hero) {
    const now = new Date();
    const dow = (now.getDay() + 6) % 7;
    const thisMon = new Date(now); thisMon.setHours(0,0,0,0); thisMon.setDate(now.getDate() - dow);
    const lastMon = new Date(thisMon); lastMon.setDate(thisMon.getDate() - 7);
    const logs = hero.log.filter(l => {
      const d = new Date(l.date); d.setHours(0,0,0,0);
      return d >= lastMon && d < thisMon;
    });
    if (!logs.length) return null;
    return {
      km: +logs.reduce((s, l) => s + l.km, 0).toFixed(1),
      sessions: logs.length,
      xp: logs.reduce((s, l) => s + (l.xp || 0), 0),
    };
  }

  function claimWeeklyBoss(hero) {
    const st = weeklyBossStatus(hero);
    if (!st || !st.done || st.claimed) return null;
    hero.weeklyBoss.claimed = true;
    const bossGold = Math.round(st.boss.gold * (1 + skillBonus(hero, 'bossGoldBonus')));
    hero.gold += bossGold;
    const item = genItemFor(hero);
    hero.items.push(item);
    /* Boss settimanale: raro garantito */
    const consumable = dropConsumable(hero, 'raro');
    return { gold: bossGold, item, consumable };
  }

  /* ── Mercante Itinerante (ven-dom, 3 item rari) ──────────── */
  function isMerchantWeekend() {
    const d = new Date().getDay(); // 0=dom, 1=lun, 4=gio, 5=ven, 6=sab
    return d === 0 || d === 1 || d === 4 || d === 5 || d === 6;
  }
  function getTravelingMerchant(hero) {
    if (!isMerchantWeekend()) return null;
    const ws = weekStamp();
    /* Ritorna le offerte già generate questa settimana (stabili) */
    if (hero.merchantOffers && hero.merchantOffers.weekStamp === ws) {
      return { weekStamp: ws, offers: hero.merchantOffers.offers };
    }
    const seed = dateSeed(ws + '-merchant');
    const slots = EQUIP_SLOTS;
    const rarityKeys = Object.keys(RARITIES);
    const minIdx = Math.max(2, rarityKeys.indexOf('raro'));
    const offers = [];
    for (let i = 0; i < 3; i++) {
      const slotKey = slots[(seed + i * 13) % slots.length];
      const rarIdx  = minIdx + ((seed + i * 7) % (rarityKeys.length - minIdx));
      const rar     = rarityKeys[Math.min(rarIdx, rarityKeys.length - 1)];
      const avail   = availableRarities(hero.level);
      const finalR  = avail.includes(rar) ? rar : (avail[avail.length - 1] || 'raro');
      const item    = genItem(hero.level, null, slotKey, finalR);
      const baseVal = RARITIES[finalR].value;
      offers.push({ item, price: Math.round(baseVal * 2.5 / 10) * 10 });
    }
    /* Persiste le offerte nell'eroe così rimangono stabili per tutta la settimana */
    hero.merchantOffers = { weekStamp: ws, offers };
    return { weekStamp: ws, offers };
  }
  function merchantEffectivePrice(hero, basePrice) {
    const furn = furnitureAggregate(hero);
    const discount = Math.min(0.6, furn.marketDiscount + skillBonus(hero, 'marketDiscount'));
    return Math.max(1, Math.round(basePrice * (1 - discount) / 5) * 5);
  }
  function buyFromMerchant(hero, offerIdx) {
    const m = getTravelingMerchant(hero);
    if (!m) return 'Il mercante non è disponibile questa settimana.';
    const o = m.offers[offerIdx];
    if (!o) return 'Offerta non trovata.';
    hero.merchantBought = hero.merchantBought || {};
    if (hero.merchantBought[m.weekStamp + '-' + offerIdx]) return 'Hai già acquistato questo oggetto.';
    const price = merchantEffectivePrice(hero, o.price);
    if (hero.gold < price) return 'Oro insufficiente!';
    hero.gold -= price;
    hero.items.push(o.item);
    hero.merchantBought[m.weekStamp + '-' + offerIdx] = true;
    return null;
  }

  /* ── Albero Abilità Passivo ──────────────────────────────── */
  const SKILL_TREE = [
    { id: 'swift_legs',  name: 'Gambe Veloci',     icon: '🥾', img: 'assets/skills/gambe veloci.webp', cost: 1, reqLevel: 5,
      desc: '+8% XP da camminata e corsa',
      effect: { xpMult_walk_run: 0.08 } },
    { id: 'haggler',     name: 'Mercante Nato',    icon: '🪙', img: 'assets/skills/mercante nato.webp', cost: 1, reqLevel: 5,
      desc: '-15% prezzi al Mercato',
      effect: { marketDiscount: 0.15 } },
    { id: 'iron_will',   name: 'Volontà di Ferro', icon: '🔥', img: 'assets/skills/volonta di ferro.webp', cost: 1, reqLevel: 10,
      desc: 'Streak bonus cap +5% (da 30% a 35%)',
      effect: { streakCap: 0.05 } },
    { id: 'fortunate',   name: 'Mano Fortunata',  icon: '🍀', img: 'assets/skills/mano fortunata.webp', cost: 1, reqLevel: 10,
      desc: '+12% probabilità loot di rarità superiore',
      effect: { dropRareChance: 0.12 } },
    { id: 'cartographer',name: 'Cartografo',       icon: '🗺️', img: 'assets/skills/cartografo.webp', cost: 1, reqLevel: 20,
      desc: '+20% km contano per la Mappa del Tesoro',
      effect: { treasureKmBonus: 0.20 } },
    { id: 'hoarder',     name: 'Accumulatore',     icon: '🌲', img: 'assets/skills/accumulatore.webp', cost: 1, reqLevel: 20,
      desc: '+15% legna e pietra raccolte',
      effect: { resMult: 0.15 } },
    { id: 'ciclista_nato', name: 'Ciclista Nato',  icon: '🚴', img: 'assets/skills/ciclista nato.webp', cost: 1, reqLevel: 25,
      desc: '+10% XP dalla cyclette',
      effect: { xpMult_bike: 0.10 } },
    { id: 'arenatico',    name: 'Arenatico',        icon: '⚔️', img: 'assets/skills/arenatico.webp', cost: 2, reqLevel: 30,
      desc: '+1 sfida Arena al giorno',
      effect: { arenaExtraFight: 1 } },
    { id: 'pollice_verde', name: 'Pollice Verde',   icon: '🌿', img: 'assets/skills/pollice verde.webp', cost: 2, reqLevel: 35,
      desc: 'Le piante in Serra crescono il 20% più veloce',
      effect: { serraGrowthBonus: 0.20 } },
    { id: 'cacciatore_boss', name: 'Cacciatore di Boss', icon: '🐉', img: 'assets/skills/cacciatore di boss.webp', cost: 2, reqLevel: 40,
      desc: '+25% oro dalle ricompense Boss settimanale',
      effect: { bossGoldBonus: 0.25 } },
    { id: 'alchimista',   name: 'Alchimista',       icon: '⚗️', img: 'assets/skills/alchimista.webp', cost: 2, reqLevel: 50,
      desc: 'I buff XP da consumabile durano 1 sessione in più',
      effect: { consumableExtra: 1 } },
    { id: 'domatore',     name: 'Domatore',          icon: '🐾', img: 'assets/skills/domatore.webp', cost: 2, reqLevel: 60,
      desc: 'Il famiglio perde Fame e Umore il 15% più lentamente',
      effect: { petHungerSlow: 0.15 } },
    { id: 'leggenda',     name: 'Leggenda',          icon: '🌟', img: 'assets/skills/leggenda.webp', cost: 2, reqLevel: 75,
      desc: '+5% XP globale da ogni allenamento',
      effect: { xpMult_global: 0.05 } },
    { id: 'immortale',    name: 'Immortale',         icon: '🔱', img: 'assets/skills/immortale.webp', cost: 2, reqLevel: 90,
      desc: 'Se salti un giorno, la streak si protegge automaticamente (1 volta al mese)',
      effect: { autoStreakShield: 1 } },
  ];
  function skillById(id) { return SKILL_TREE.find(s => s.id === id); }
  function learnSkill(hero, id) {
    const sk = skillById(id);
    if (!sk) return 'Abilità sconosciuta.';
    if (hero.level < sk.reqLevel) return `Serve il Livello ${sk.reqLevel}.`;
    if (hero.skills.includes(id)) return 'Abilità già appresa.';
    const pts = hero.skillPoints || 0;
    if (pts < sk.cost) return 'Punti abilità insufficienti.';
    hero.skillPoints -= sk.cost;
    hero.skills.push(id);
    return null;
  }
  const SKILL_RESET_COST = 150;
  function resetSkills(hero) {
    if ((hero.gold || 0) < SKILL_RESET_COST) return `Servono ${SKILL_RESET_COST} oro per resettare le abilità.`;
    hero.gold -= SKILL_RESET_COST;
    const spent = (hero.skills || []).reduce((s, id) => {
      const sk = skillById(id); return s + (sk ? sk.cost : 0);
    }, 0);
    hero.skillPoints = (hero.skillPoints || 0) + spent;
    hero.skills = [];
    return null;
  }
  function skillBonus(hero, key) {
    let tot = 0;
    (hero.skills || []).forEach(id => {
      const sk = skillById(id);
      if (sk && sk.effect[key]) tot += sk.effect[key];
    });
    return tot;
  }
  function earnSkillPoints(hero) {
    const expected = Math.floor(hero.level / 5);
    const owned = (hero.skills || []).reduce((s, id) => {
      const sk = skillById(id); return s + (sk ? sk.cost : 0);
    }, 0);
    hero.skillPoints = Math.max(0, expected - owned - (hero.skillPoints || 0) < 0
      ? (hero.skillPoints || 0)
      : expected - owned);
  }

  /* ── Cronache di Oakhaven (Lore) ─────────────────────────── */
  const LORE_FRAGMENTS = [
    { id: 'lore1', km: 50,  title: 'Capitolo I — La Notte del Drago',
      text: 'Qualcuno ricorda ancora come brillavano le stelle sopra Oakhaven la sera prima dell\'attacco. Poi venne l\'ombra — grande quanto una nuvola, silenziosa quanto la morte — e le stelle scomparvero una ad una. Al mattino, non rimase che fumo e silenzio.' },
    { id: 'lore2', km: 100, title: 'Capitolo II — Il Cavaliere Senza Volto',
      text: 'I sopravvissuti riferiscono la stessa cosa: una figura in armatura nera sul dorso del drago, che non ha gridato, non ha ordinato, non ha spiegato. Ha solo guardato bruciare. Chi è? Da dove viene? Il Vecchio Archivio di Oakhaven custodiva risposte. L\'Archivio non c\'è più.' },
    { id: 'lore3', km: 150, title: 'Capitolo III — L\'Orda',
      text: 'Non sono solo mostri. Hanno una struttura: esploratori in avanscoperta, guerrieri a proteggere i fianchi, saccheggiatori a raccogliere risorse. Qualcuno li addestra, qualcuno li comanda. E quel qualcuno conosce la geografia del reame meglio di chiunque.' },
    { id: 'lore4', km: 200, title: 'Capitolo IV — Il Sigillo Antico',
      text: 'La leggenda dice che il reame fu protetto per mille anni da un patto tra i Re e le creature della Foresta Sussurrante. Tre sigilli, tre guardiani, tre luoghi segreti. Uno dei sigilli era custodito a Oakhaven. Non lo è più.' },
    { id: 'lore5', km: 250, title: 'Capitolo V — La Spia',
      text: 'Qualcuno ha tradito. Le difese di Oakhaven erano solide, le sentinelle vigili, le porte chiuse. L\'Orda conosceva ogni debolezza, ogni turno di guardia, ogni tunnel nascosto. Chi aveva quella conoscenza? Chi l\'avrebbe venduta?' },
    { id: 'lore6', km: 300, title: 'Capitolo VI — Il Prezzo della Corruzione',
      text: 'L\'Orda non porta solo distruzione: porta corruzione. Le creature trasformate non muoiono — esistono in uno stato peggiore della morte, schiave di una volontà altrui. E quella volontà vuole qualcosa di preciso. Vuole il reame intero, non solo le sue macerie.' },
    { id: 'lore7', km: 350, title: 'Capitolo VII — La Vetta Oscura',
      text: 'I mappe più antiche segnano un luogo oltre le Montagne del Confine: la Vetta Oscura. Nessun esploratore che ci sia andato è mai tornato — ma nessuno ha mai avuto abbastanza tempo, abbastanza forza, abbastanza ragione per andarci davvero. Fino ad ora.' },
    { id: 'lore8', km: 400, title: 'Capitolo VIII — L\'Alleanza',
      text: 'Non sei solo. In ogni bioma che attraversi trovi tracce di resistenza: un falò ancora acceso, una trappola piazzata di fresco, un simbolo inciso nella pietra. Qualcuno combatte l\'Orda nell\'ombra, un passo alla volta. Come te.' },
    { id: 'lore9', km: 450, title: 'Capitolo IX — Il Drago',
      text: 'Il drago è antico — più del reame, forse più della memoria degli uomini. Le creature più vecchie della Foresta Sussurrante ne parlano come di una forza naturale: il fuoco che brucia per far crescere, la fine che prepara l\'inizio. Qualcuno ha corrotto anche lui. Qualcuno molto potente.' },
    { id: 'lore10', km: 500, title: 'Capitolo X — La Verità',
      text: 'Il Cavaliere del Drago ha un nome. Aveva un volto, una storia, forse anche delle ragioni. Le Memorie lo mostrano: un eroe come tanti, cresciuto a Oakhaven, partito in cerca di qualcosa che il reame non sapeva dargli. Trovò la Vetta Oscura. Trovò il potere. Perse tutto il resto. Ora tocca a te salire.' },
  ];
  function checkLoreUnlock(hero) {
    const newOnes = LORE_FRAGMENTS.filter(f =>
      hero.totalKm >= f.km && !(hero.loreUnlocked || []).includes(f.id)
    );
    newOnes.forEach(f => { hero.loreUnlocked = hero.loreUnlocked || []; hero.loreUnlocked.push(f.id); });
    return newOnes;
  }

  /* ── Pozione del Giorno ──────────────────────────────────── */
  const DAILY_POTIONS = [
    { id: 'xp_boost',      icon: '✨', name: 'Pozione di Saggezza',   desc: '+50% XP nella prossima sessione' },
    { id: 'gold_rush',     icon: '💰', name: 'Pozione dell\'Avaro',    desc: '+100% oro nella prossima sessione' },
    { id: 'streak_shield', icon: '🛡️', name: 'Scudo della Costanza',  desc: 'Protegge la streak per 1 giorno' },
    { id: 'loot_luck',     icon: '🍀', name: 'Pozione della Fortuna',  desc: 'Prossima sessione: loot minimo Raro' },
    { id: 'rest_echo',     icon: '🌙', name: 'Essenza del Riposo',     desc: 'Bonus 2x XP come dopo un giorno di riposo' },
  ];
  function getDailyPotion() {
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + 77;
    const v = (((seed * 1664525 + 1013904223) & 0x7fffffff) >>> 0) % DAILY_POTIONS.length;
    return DAILY_POTIONS[v];
  }
  function claimDailyPotion(hero) {
    const today = todayStamp();
    if (hero.dailyPotion && hero.dailyPotion.claimedDate === today) return 'Pozione già riscattata oggi.';
    const p = getDailyPotion();
    hero.dailyPotion = { id: p.id, claimedDate: today, used: false };
    return null;
  }

  /* ── Esche da Pesca ──────────────────────────────────────── */
  const BAITS = [
    { id: 'lombrico',  icon: '🪱', name: 'Lombrico',          desc: 'L\'esca di base. Sempre disponibile.',                              zoneSize: 1.0  },
    { id: 'fungo',     icon: '🍄', name: 'Fungo Magico',       desc: 'Attira consumabili insoliti dalle profondità.',                    zoneSize: 0.95 },
    { id: 'amo_arg',   icon: '🪝', name: 'Amo d\'Argento',     desc: 'Richiama pesci rari. La zona di cattura si restringe.',            zoneSize: 0.85 },
    { id: 'cristallo', icon: '💎', name: 'Cristallo Abissale', desc: 'Risuona con le creature degli abissi. Zona minima, loot massimo.', zoneSize: 0.72 },
    { id: 'osso',      icon: '🦴', name: 'Osso Antico',        desc: 'Richiama creature del Bestiario. Può svelare nuovi avvistamenti.', zoneSize: 0.90 },
  ];

  /* Pesci — rarità determina velocità e loot */
  const FISH = [
    { id: 'carpa',     icon: '🐟', name: 'Carpa del Fossato',    rarity: 'comune',      speedMult: 1.0,  gold: 30,  xp: 20 },
    { id: 'trota',     icon: '🐡', name: 'Trota Maculata',       rarity: 'comune',      speedMult: 1.05, gold: 40,  xp: 28 },
    { id: 'arcobaleno',icon: '🐠', name: 'Pesce Arcobaleno',     rarity: 'non_comune',  speedMult: 1.25, gold: 55,  xp: 38, bonus: 'consumabile' },
    { id: 'medusa',    icon: '🪼', name: 'Medusa Fosforescente', rarity: 'non_comune',  speedMult: 1.3,  gold: 50,  xp: 42 },
    { id: 'calamaro',  icon: '🦑', name: 'Calamaro Abissale',    rarity: 'raro',        speedMult: 1.55, gold: 85,  xp: 55, bonus: 'item_raro' },
    { id: 'delfino',   icon: '🐬', name: 'Delfino Arcano',       rarity: 'raro',        speedMult: 1.5,  gold: 110, xp: 50 },
    { id: 'squalo',    icon: '🦈', name: 'Squalo delle Rovine',  rarity: 'epico',       speedMult: 1.85, gold: 130, xp: 70, bonus: 'item_epico' },
    { id: 'drago',     icon: '🐉', name: 'Drago d\'Acqua',       rarity: 'leggendario', speedMult: 2.3,  gold: 160, xp: 90, bonus: 'item_leggendario' },
  ];

  /* Pool pesci per esca — { id, w: peso } */
  const FISH_POOLS = {
    lombrico:  [ {id:'carpa',w:55},    {id:'trota',w:45} ],
    fungo:     [ {id:'arcobaleno',w:50},{id:'medusa',w:30}, {id:'carpa',w:20} ],
    amo_arg:   [ {id:'calamaro',w:45}, {id:'delfino',w:35}, {id:'arcobaleno',w:20} ],
    cristallo: [ {id:'squalo',w:50},   {id:'drago',w:30},   {id:'calamaro',w:20} ],
    osso:      [ {id:'drago',w:25},    {id:'squalo',w:30},  {id:'calamaro',w:25}, {id:'medusa',w:20} ],
  };

  function rollFish(baitId) {
    const pool = FISH_POOLS[baitId] || FISH_POOLS.lombrico;
    const total = pool.reduce((s, e) => s + e.w, 0);
    let r = Math.random() * total;
    for (const entry of pool) { r -= entry.w; if (r <= 0) return FISH.find(f => f.id === entry.id); }
    return FISH[0];
  }

  function addBait(hero, id, qty = 1) {
    hero.baits = hero.baits || {};
    hero.baits[id] = (hero.baits[id] || 0) + qty;
  }

  function useBait(hero, id) {
    if (id === 'lombrico') return true;
    hero.baits = hero.baits || {};
    if (!(hero.baits[id] > 0)) return false;
    hero.baits[id]--;
    if (hero.baits[id] <= 0) delete hero.baits[id];
    return true;
  }

  function pescaLoot(hero, fish) {
    const loot = { gold: fish.gold, xp: fish.xp, fish };
    if (fish.bonus === 'consumabile') {
      const pool = CONSUMABLES.filter(c => c.rarity === 'comune' || c.rarity === 'raro');
      const co = pool[Math.floor(Math.random() * pool.length)];
      addConsumable(hero, co.id, 1);
      loot.consumable = co;
    } else if (fish.bonus === 'item_raro') {
      const item = genItemFor(hero, 'raro'); hero.items.push(item); loot.item = item;
    } else if (fish.bonus === 'item_epico') {
      const item = genItemFor(hero, 'epico'); hero.items.push(item); loot.item = item;
    } else if (fish.bonus === 'item_leggendario') {
      const item = genItemFor(hero, 'leggendario'); hero.items.push(item); loot.item = item;
    }
    if (fish.rarity === 'leggendario' || fish.id === 'drago') {
      const zones = accessibleZones(hero);
      const pool = BESTIARY.filter(b => !b.boss && zones.includes(b.zone) && !hero.bestiary.includes(b.id));
      if (pool.length) { const s = pool[Math.floor(Math.random() * pool.length)]; hero.bestiary.push(s.id); loot.sighting = s; }
    }
    return loot;
  }

  /* ═══════════════════════════════════════════════════════════
     LA SERRA DEL VIANDANTE
     ═══════════════════════════════════════════════════════════ */

  const PLANTS = {
    muschio:   { id:'muschio',   name:'Muschio Soffice',      icon:'🌱', rarity:'comune',      days:3,  water:1.5,
      desc:'Resistente e infestante. Non perde salute se salti un giorno.',          trait:'infestante' },
    mentuccia: { id:'mentuccia', name:'Mentuccia',             icon:'🌿', rarity:'comune',      days:4,  water:2.5,
      desc:'Fresca ma delicata. Marcisce se le dai più di 5 km d\'acqua.',           trait:'rinfrescante' },
    bosso:     { id:'bosso',     name:'Bosso Scudo',           icon:'🌳', rarity:'non_comune',  days:5,  water:3.0,
      desc:'Richiede potatura geometrica. Tollera pochissimi errori (max ±0.5 km).', trait:'ferrea' },
    cactus:    { id:'cactus',    name:'Cactus di Cenere',      icon:'🌵', rarity:'non_comune',  days:6,  water:4.0,
      desc:'Nato nel fuoco. Odia l\'eccesso: non bagnarlo due giorni di fila!',      trait:'fuoco' },
    giglio:    { id:'giglio',    name:'Giglio della Pioggia',  icon:'🪷', rarity:'raro',        days:6,  water:5.0,
      desc:'Se il meteo è Piovoso o Tempesta, si annaffia da solo.',                 trait:'meteoropatica' },
    orchidea:  { id:'orchidea',  name:'Orchidea del Vento',    icon:'🌾', rarity:'raro',        days:7,  water:5.0,
      desc:'Molto esigente, perde il doppio della salute se trascurata.',            trait:'esigente' },
    edera:     { id:'edera',     name:'Edera Vampira',         icon:'🥀', rarity:'raro',        days:7,  water:4.5,
      desc:'Se non la annaffi, sopravvive rubandoti 50 Monete d\'Oro.',              trait:'parassita' },
    girasole:  { id:'girasole',  name:'Girasole Radiante',     icon:'🌻', rarity:'epico',       days:8,  water:7.0,
      desc:'Se riceve 10+ km in un giorno, cresce a velocità doppia.',               trait:'fotosintesi' },
    bonsai:    { id:'bonsai',    name:'Bonsai di Yggdrasil',   icon:'🌲', rarity:'epico',       days:14, water:6.0,
      desc:'Radici millenarie. Salute crolla del 50% se salti un giorno.',           trait:'millenaria' },
    loto:      { id:'loto',      name:'Loto dell\'Abisso',     icon:'🌑', rarity:'divino',      days:10, water:8.0,
      desc:'Instabile. Se la salute scende sotto il 50%, muta e fugge.',             trait:'senziente' },
  };

  /* ── Stagioni del Mondo ─────────────────────────────────────── */
  const SEASONS = {
    primavera: {
      id: 'primavera', name: 'Primavera', icon: '🌸', color: '#7ec850',
      months: [2, 3, 4],
      desc: 'La natura si risveglia. La Serra prospera e i semi sono più preziosi.',
      bonuses: [
        '🌿 Serra: ogni pianta cresce 1 giorno extra al giorno',
        '🌰 Semi da raccolto di rarità superiore',
      ],
      challenge: { label: 'Risveglio Primaverile', km: 80,  reward: 'epico'      },
    },
    estate: {
      id: 'estate',    name: 'Estate',    icon: '☀️', color: '#f4c430',
      months: [5, 6, 7],
      desc: 'Il sole splende alto. Ogni km vale di più e il sudore abbonda.',
      bonuses: [
        '🏃 +20% XP da corsa e cyclette',
        '💧 Sudore della Serra vale 1.5× (1 km = 1.5 km di irrigazione)',
      ],
      challenge: { label: 'Maratona Estiva',        km: 120, reward: 'leggendario' },
    },
    autunno: {
      id: 'autunno',   name: 'Autunno',   icon: '🍂', color: '#d4700a',
      months: [8, 9, 10],
      desc: 'Il tempo del raccolto. Risorse e oro abbondano ovunque.',
      bonuses: [
        '🌲 +25% legno e pietra da ogni allenamento',
        '🪙 +15% oro da ogni allenamento',
      ],
      challenge: { label: 'Grande Raccolto',        km: 100, reward: 'epico'      },
    },
    inverno: {
      id: 'inverno',   name: 'Inverno',   icon: '❄️', color: '#6ab4e8',
      months: [11, 0, 1],
      desc: 'La quiete invernale ricompensa la perseveranza.',
      bonuses: [
        '🔥 Bonus streak raddoppiato (ogni giorno vale il doppio)',
        '⭐ +15% XP globale da tutti gli allenamenti',
      ],
      challenge: { label: 'Sfida del Solstizio',    km: 60,  reward: 'divino'     },
    },
  };

  function currentSeason() {
    const m = new Date().getMonth();
    return Object.values(SEASONS).find(s => s.months.includes(m)) || SEASONS.primavera;
  }

  function monthStampSeason() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function initSeasonalChallenge(hero) {
    const s = currentSeason();
    const stamp = monthStampSeason();
    if (!hero.seasonalChallenge || hero.seasonalChallenge.stamp !== stamp) {
      hero.seasonalChallenge = {
        stamp,
        seasonId: s.id,
        label: s.challenge.label,
        km: s.challenge.km,
        progressKm: 0,
        claimed: false,
      };
    }
  }

  function claimSeasonalChallenge(hero) {
    if (!hero.seasonalChallenge) return 'Nessuna sfida attiva.';
    const sc = hero.seasonalChallenge;
    if (sc.claimed) return 'Già riscattata.';
    if (sc.progressKm < sc.km) return 'Sfida non completata.';
    const s = SEASONS[sc.seasonId];
    if (!s) return 'Stagione sconosciuta.';
    sc.claimed = true;
    const item = genItemFor(hero, s.challenge.reward);
    // Nomina l'oggetto con tema stagionale
    item.name = `${s.icon} ${item.name}`;
    item.seasonal = sc.seasonId;
    hero.items.push(item);
    return { item };
  }

  function initGreenhouse(h) {
    h.greenhouse = h.greenhouse || {
      waterUsedToday: 0,
      lastTick: todayStamp(),
      metNpc: false,
      weeklyMissions: null,
      pots: [
        { status:'empty',  seedId:null, daysGrown:0, health:100, water:0, readyDays:0 },
        { status:'locked', seedId:null, daysGrown:0, health:100, water:0, readyDays:0 },
        { status:'locked', seedId:null, daysGrown:0, health:100, water:0, readyDays:0 },
        { status:'locked', seedId:null, daysGrown:0, health:100, water:0, readyDays:0 },
        { status:'locked', seedId:null, daysGrown:0, health:100, water:0, readyDays:0 },
      ],
    };
    // Migration: add missing pots
    while (h.greenhouse.pots.length < 5)
      h.greenhouse.pots.push({ status:'locked', seedId:null, daysGrown:0, health:100, water:0, readyDays:0 });
    // Migration: ensure readyDays and weeklyMissions exist
    h.greenhouse.pots.forEach(p => { if (p.readyDays === undefined) p.readyDays = 0; });
    if (h.greenhouse.weeklyMissions === undefined) h.greenhouse.weeklyMissions = null;
    // Unlock pots by level
    if (h.level >= 10 && h.greenhouse.pots[1].status === 'locked') h.greenhouse.pots[1].status = 'empty';
    if (h.level >= 30 && h.greenhouse.pots[2].status === 'locked') h.greenhouse.pots[2].status = 'empty';
    if (h.level >= 50 && h.greenhouse.pots[3].status === 'locked') h.greenhouse.pots[3].status = 'empty';
    if (h.level >= 70 && h.greenhouse.pots[4].status === 'locked') h.greenhouse.pots[4].status = 'empty';
  }

  function rolloverGreenhouse(hero) {
    const today = todayStamp();
    if (!hero.greenhouse) { initGreenhouse(hero); return []; }
    if (hero.greenhouse.lastTick === today) return [];
    const daysDelta = hero.greenhouse.lastTick
      ? Math.max(1, Math.round((new Date(today) - new Date(hero.greenhouse.lastTick)) / 86400000))
      : 1;

    rolloverSerraMissions(hero);

    const logs = [];
    let allHealthy = true;
    let allWatered = true;
    let hasActivePlants = false;

    hero.greenhouse.pots.forEach((pot, i) => {
      // Stagionatura: piante pronte che non vengono raccolte invecchiano
      if (pot.status === 'ready') {
        pot.readyDays = (pot.readyDays || 0) + 1;
        const pData = PLANTS[pot.seedId];
        if (pot.readyDays >= 4) {
          pot.status = 'dead';
          pot.readyDays = 0;
          logs.push(`🥀 Il tuo ${pData ? pData.name : 'pianta'} è marcita nel vaso ${i + 1} per troppa attesa!`);
        }
        return;
      }

      if (pot.status !== 'growing') return;
      hasActivePlants = true;
      const pData = PLANTS[pot.seedId];
      if (!pData) { pot.status = 'empty'; return; }

      if (pot.water < pData.water * 0.8) allWatered = false;

      let water = pot.water;
      const weather = getDailyWeather();
      if (pData.trait === 'meteoropatica' && (weather.type === 'rain' || weather.type === 'storm')) {
        water = pData.water;
      }

      const diff = water - pData.water;
      let healthHit = 0;
      let growthPerDay = (currentSeason().id === 'primavera' ? 2 : 1) * (1 + skillBonus(hero, 'serraGrowthBonus'));

      if (diff >= -0.5 && diff <= 1.0) {
        pot.health = Math.min(100, pot.health + 10);
      } else if (diff < -0.5) {
        // Siccità
        if      (pData.trait === 'infestante')  healthHit = 0;
        else if (pData.trait === 'esigente')    healthHit = 40;
        else if (pData.trait === 'millenaria')  healthHit = 50;
        else if (pData.trait === 'parassita') {
          if (hero.gold >= 50) { hero.gold -= 50; logs.push(`🥀 L'Edera Vampira ti ha rubato 50 oro per sopravvivere!`); }
          else healthHit = 30;
        } else { healthHit = 25; }
      } else {
        // Eccesso
        if      (pData.trait === 'rinfrescante' && water > 5) healthHit = 100;
        else if (pData.trait === 'fotosintesi'  && water >= 10) { growthPerDay = 2; healthHit = 0; }
        else { healthHit = Math.round(15 + diff * 5); }
      }

      pot.health = Math.max(0, pot.health - healthHit * daysDelta);
      if (pot.health < 90) allHealthy = false;
      pot.daysGrown += growthPerDay * daysDelta;
      pot.water = 0;

      if (pot.health <= 0) {
        pot.status = 'dead';
        logs.push(`💀 Il tuo ${pData.name} è appassito nel vaso ${i + 1}.`);
      } else if (pData.trait === 'senziente' && pot.health < 50) {
        pot.status = 'empty'; pot.seedId = null; pot.daysGrown = 0; pot.health = 100; pot.readyDays = 0;
        hero.items.push(genItemFor(hero, 'epico'));
        logs.push(`🌑 Il Loto dell'Abisso è mutato ed è fuggito dal vaso!`);
      } else if (pot.daysGrown >= pData.days) {
        pot.status = 'ready';
        pot.readyDays = 0;
        logs.push(`✨ Il tuo ${pData.name} è pronto per il raccolto!`);
      }
    });

    // Missioni giornaliere della Serra
    const wm = hero.greenhouse.weeklyMissions;
    if (wm && hasActivePlants) {
      wm.missions.forEach(m => {
        if (m.claimed || m.progress >= m.target) return;
        if (m.type === 'health_days' && allHealthy) m.progress = Math.min(m.target, m.progress + 1);
        if (m.type === 'water_days'  && allWatered) m.progress = Math.min(m.target, m.progress + 1);
      });
    }

    hero.greenhouse.waterUsedToday = 0;
    hero.greenhouse.lastTick = today;
    return logs;
  }

  function waterPlant(hero, potIndex, kmAmount) {
    const pot = hero.greenhouse.pots[potIndex];
    if (!pot || pot.status !== 'growing') return 'Vaso non valido.';
    const avail = todayKm(hero) - (hero.greenhouse.waterUsedToday || 0);
    if (kmAmount > avail) return 'Non hai abbastanza km di sudore oggi!';
    hero.greenhouse.waterUsedToday = (hero.greenhouse.waterUsedToday || 0) + kmAmount;
    const effectiveWater = currentSeason().id === 'estate' ? kmAmount * 1.5 : kmAmount;
    pot.water += effectiveWater;
    // Missione: km totali versati questa settimana
    const wm = hero.greenhouse.weeklyMissions;
    if (wm) {
      wm.missions.forEach(m => {
        if (m.claimed || m.progress >= m.target) return;
        if (m.type === 'water_km') m.progress = Math.min(m.target, +(m.progress + kmAmount).toFixed(1));
      });
    }
    return null;
  }

  function harvestPlant(hero, potIndex) {
    const pot = hero.greenhouse.pots[potIndex];
    if (!pot || pot.status !== 'ready') return null;
    const pData = PLANTS[pot.seedId];
    const reward = { gold: 0, items: [], wood: 0, stone: 0, maturBonus: 0 };

    if (pData.id === 'muschio') { hero.wood += 30; hero.stone += 30; reward.wood = 30; reward.stone = 30; }
    if (pData.id === 'giglio')  { reward.gold += 150; }
    if (pData.rarity === 'non_comune') reward.items.push(genItemFor(hero, 'comune'));
    if (pData.rarity === 'raro')       reward.items.push(genItemFor(hero, 'raro'));
    if (pData.rarity === 'epico')      reward.items.push(genItemFor(hero, 'epico'));
    if (pData.rarity === 'divino')     reward.items.push(genItemFor(hero, 'divino'));

    // Stagionatura: +20% valore base per ogni giorno di attesa dopo "pronto" (max 3)
    const readyDays = Math.min(3, pot.readyDays || 0);
    if (readyDays > 0) {
      const baseVal = (RARITIES[pData.rarity] || {}).value || 50;
      const maturBonus = Math.round(baseVal * 0.2 * readyDays);
      reward.gold += maturBonus;
      reward.maturBonus = maturBonus;
    }

    // Bonus: seme casuale da ogni raccolto
    reward.items.push(genSeed(hero));
    reward.items.forEach(it => hero.items.push(it));
    hero.gold += reward.gold;

    // Missioni raccolto
    const wm = hero.greenhouse.weeklyMissions;
    if (wm) {
      const rarOrder = ['comune','non_comune','raro','epico','leggendario','divino','oscuro'];
      wm.missions.forEach(m => {
        if (m.claimed || m.progress >= m.target) return;
        if (m.type === 'harvest') m.progress = Math.min(m.target, m.progress + 1);
        if (m.type === 'harvest_rarity') {
          const ti = rarOrder.indexOf(m.target);
          const pi = rarOrder.indexOf(pData.rarity);
          if (pi >= ti) m.progress = m.target;
        }
      });
    }

    pot.status = 'empty'; pot.seedId = null; pot.daysGrown = 0; pot.health = 100; pot.water = 0; pot.readyDays = 0;
    return reward;
  }

  function plantSeeds(hero, potIndex, seedId) {
    const pot = hero.greenhouse.pots[potIndex];
    if (!pot || pot.status !== 'empty') return 'Vaso non disponibile.';
    if (!PLANTS[seedId]) return 'Seme sconosciuto.';
    pot.status = 'growing'; pot.seedId = seedId; pot.daysGrown = 0; pot.health = 100; pot.water = 0; pot.readyDays = 0; pot.plantedAt = Date.now();
    // Missione: riempi vasi
    const wm = hero.greenhouse && hero.greenhouse.weeklyMissions;
    if (wm) {
      wm.missions.forEach(m => {
        if (m.claimed || m.progress >= m.target) return;
        if (m.type === 'pots_used') m.progress = Math.min(m.target, m.progress + 1);
      });
    }
    return null;
  }

  function genSeed(hero) {
    const plantKeys = Object.keys(PLANTS);
    let rarity = rollRarity(hero.level);
    // Primavera: semi di rarità superiore
    if (currentSeason().id === 'primavera') {
      const order = ['comune','non_comune','raro','epico','leggendario','divino'];
      const idx = order.indexOf(rarity);
      if (idx >= 0 && idx < order.length - 1) rarity = order[idx + 1];
    }
    let pool = plantKeys.filter(k => PLANTS[k].rarity === rarity);
    if (!pool.length) pool = plantKeys;
    const plant = PLANTS[pool[Math.floor(Math.random() * pool.length)]];
    const rInfo = RARITIES[plant.rarity];
    return {
      id: 'seed_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      slot: 'seme',
      rarity: plant.rarity,
      name: 'Seme di ' + plant.name,
      icon: '🌰',
      img: 'assets/loot/seme-sacchetto.webp',
      seedId: plant.id,
      xp: 0, atk: 0, def: 0, hp: 0, xpBonus: 0,
      value: Math.round(rInfo.value * 0.4),
      desc: `Seme magico per la Serra. 💧 Richiede ${plant.water} km/giorno per ${plant.days} giorni.`,
    };
  }

  const SERRA_MISSION_TEMPLATES = [
    { id:'sm_water3',    label:'Grande Irrigatore',    desc:'Annaffia le piante per 3 giorni di fila.',
      type:'water_days',    target:3,    reward:{ gold:80,  item:'seme' } },
    { id:'sm_harvest2',  label:'Raccoglitore Provetto', desc:'Raccogli 2 piante questa settimana.',
      type:'harvest',       target:2,    reward:{ gold:100, item:'fertilizzante' } },
    { id:'sm_water20km', label:'Bagno di Sudore',       desc:'Versa 20 km di sudore nelle piante.',
      type:'water_km',      target:20,   reward:{ gold:60,  item:null } },
    { id:'sm_harvest1r', label:'Raccolto Raro',         desc:'Raccogli una pianta Raro o superiore.',
      type:'harvest_rarity',target:'raro', reward:{ gold:120, item:'fertilizzante' } },
    { id:'sm_allpots',   label:'La Serra Vive',         desc:'Semina in ogni vaso sbloccato almeno una volta.',
      type:'pots_used',     target:0,    reward:{ gold:90,  item:'seme' } },
    { id:'sm_health90',  label:'Pollice Verde',         desc:'Tieni tutte le piante sopra il 90% di salute per 2 giorni.',
      type:'health_days',   target:2,    reward:{ gold:75,  item:'fertilizzante' } },
  ];

  function rolloverSerraMissions(hero) {
    const ws = weekStamp();
    if (hero.greenhouse.weeklyMissions && hero.greenhouse.weeklyMissions.weekStamp === ws) return;
    const shuffled = [...SERRA_MISSION_TEMPLATES].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 3);
    const unlockedCount = hero.greenhouse.pots.filter(p => p.status !== 'locked').length;
    hero.greenhouse.weeklyMissions = {
      weekStamp: ws,
      missions: picked.map(t => ({
        id: t.id,
        label: t.label,
        desc: t.desc,
        type: t.type,
        target: t.type === 'pots_used' ? unlockedCount : t.target,
        reward: t.reward,
        progress: 0,
        claimed: false,
      })),
    };
  }

  function claimSerraMission(hero, missionId) {
    const wm = hero.greenhouse && hero.greenhouse.weeklyMissions;
    if (!wm) return 'Nessuna missione attiva.';
    const m = wm.missions.find(x => x.id === missionId);
    if (!m) return 'Missione non trovata.';
    if (m.claimed) return 'Già riscattata.';
    const done = (m.type === 'harvest_rarity') ? m.progress >= m.target : m.progress >= m.target;
    if (!done) return 'Missione non completata.';
    m.claimed = true;
    const r = m.reward;
    hero.gold += (r.gold || 0);
    const items = [];
    if (r.item === 'seme') { const s = genSeed(hero); hero.items.push(s); items.push(s); }
    if (r.item === 'fertilizzante') { const f = genFertilizzante(); hero.items.push(f); items.push(f); }
    /* 30% chance consumabile comune */
    const consumable = Math.random() < 0.30 ? dropConsumable(hero, 'comune') : null;
    return { gold: r.gold || 0, items, consumable };
  }

  function genFertilizzante() {
    return {
      id: 'fertilizzante_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      slot: 'consumabile',
      rarity: 'comune',
      name: 'Fertilizzante Magico',
      icon: '🌿',
      img: null,
      xp: 0, atk: 0, def: 0, hp: 0, xpBonus: 0,
      value: 15,
      desc: 'Accelera la crescita di una pianta di 1 giorno.',
    };
  }

  function useFertilizer(hero, itemId, potIndex) {
    const idx = hero.items.findIndex(it => it.id === itemId);
    if (idx === -1) return 'Fertilizzante non trovato.';
    const item = hero.items[idx];
    if (item.slot !== 'consumabile') return 'Oggetto non valido.';
    const pot = hero.greenhouse && hero.greenhouse.pots[potIndex];
    if (!pot || pot.status !== 'growing') return 'Nessuna pianta in crescita in questo vaso.';
    const pData = PLANTS[pot.seedId];
    if (!pData) return 'Pianta sconosciuta.';
    pot.daysGrown = Math.min(pData.days, pot.daysGrown + 1);
    if (pot.daysGrown >= pData.days) { pot.status = 'ready'; pot.readyDays = 0; }
    hero.items.splice(idx, 1);
    return null;
  }

  /* ═══════════════════════════════════════════════════════════
     BIGLIETTI GRATTA E VINCI
     ═══════════════════════════════════════════════════════════ */

  const TICKET_TYPES = {
    comune: {
      name: 'Pergameno della Fortuna',
      img:  'assets/tickets/ticket-comune.webp',
      symbols: ['🪙','💰','⚔️','🛡️','🌿'],
      winRate: 0.28,
      prizes: [
        { weight: 60, gold: 30,  label: '🪙 +30 Oro' },
        { weight: 30, gold: 60,  label: '🪙 +60 Oro' },
        { weight: 10, gold: 100, label: '🪙 +100 Oro' },
      ],
    },
    raro: {
      name: 'Lastra delle Stelle',
      img:  'assets/tickets/ticket-raro.webp',
      symbols: ['⚗️','📜','💫','🗡️','🔮'],
      winRate: 0.15,
      prizes: [
        { weight: 50, gold: 100, label: '🪙 +100 Oro' },
        { weight: 30, gold: 200, label: '🪙 +200 Oro' },
        { weight: 20, gold: 350, consumable: true, label: '🪙 +350 Oro + Consumabile' },
      ],
    },
    leggendario: {
      name: "Cristallo dell'Eterno",
      img:  'assets/tickets/ticket-leggendario.webp',
      symbols: ['💎','✨','🐉','👑','⚡'],
      winRate: 0.06,
      prizes: [
        { weight: 40, gold: 400,  label: '🪙 +400 Oro' },
        { weight: 35, gold: 700,  label: '🪙 +700 Oro' },
        { weight: 25, gold: 1000, item: true, label: '🪙 +1000 Oro + Oggetto Raro' },
      ],
    },
  };

  function _ticketRng(seed) {
    let s = seed >>> 0;
    return () => { s = Math.imul(1664525, s) + 1013904223 >>> 0; return s / 0xffffffff; };
  }

  function _rollTicketSymbols(type, seed) {
    const { symbols, winRate } = TICKET_TYPES[type];
    const rng = _ticketRng(seed);
    const isWin = rng() < winRate;
    if (isWin) {
      const sym = symbols[Math.floor(rng() * symbols.length)];
      return [sym, sym, sym];
    }
    const pick = () => symbols[Math.floor(rng() * symbols.length)];
    let a = pick(), b = pick(), c = pick();
    if (a === b && b === c) c = symbols[(symbols.indexOf(c) + 1) % symbols.length];
    return [a, b, c];
  }

  function _rollTicketPrize(type, seed) {
    const { prizes } = TICKET_TYPES[type];
    const rng = _ticketRng(seed + 1);
    const total = prizes.reduce((s, p) => s + p.weight, 0);
    let r = rng() * total;
    for (const p of prizes) { r -= p.weight; if (r <= 0) return p; }
    return prizes[0];
  }

  function addTicket(hero, type) {
    if (!TICKET_TYPES[type]) return;
    hero.tickets = hero.tickets || [];
    hero.tickets.push({
      id:   Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type,
      seed: (Date.now() ^ (Math.random() * 0xffffffff >>> 0)) >>> 0,
      scratchedAt: null,
    });
  }

  function getUnscratchedTickets(hero) {
    return (hero.tickets || []).filter(t => !t.scratchedAt);
  }

  function scratchTicket(hero, ticketId) {
    const ticket = (hero.tickets || []).find(t => t.id === ticketId);
    if (!ticket)           return { error: 'not_found' };
    if (ticket.scratchedAt) return { error: 'already_scratched' };

    ticket.scratchedAt = Date.now();
    const symbols = _rollTicketSymbols(ticket.type, ticket.seed);
    const isWin   = symbols[0] === symbols[1] && symbols[1] === symbols[2];
    let prize = null;

    if (isWin) {
      prize = _rollTicketPrize(ticket.type, ticket.seed);
      hero.gold = (hero.gold || 0) + (prize.gold || 0);
      if (prize.item) {
        const it = genItemFor(hero, ticket.type === 'leggendario' ? 'raro' : null);
        hero.items.push(it);
        prize.droppedItem = it;
      }
      if (prize.consumable) {
        const cons = dropConsumable(hero, ticket.type === 'raro' ? 'raro' : 'comune');
        if (cons) prize.droppedConsumable = cons;
      }
    }

    // Salva il risultato nel ticket per lo storico
    ticket.result = { symbols, isWin, label: prize ? prize.label : null };

    // Mantieni solo gli ultimi 20 biglietti già grattati (pulizia storico)
    const scratched = hero.tickets.filter(t => t.scratchedAt).sort((a, b) => b.scratchedAt - a.scratchedAt);
    if (scratched.length > 20) {
      const toRemove = new Set(scratched.slice(20).map(t => t.id));
      hero.tickets = hero.tickets.filter(t => !toRemove.has(t.id));
    }

    return { ok: true, symbols, isWin, prize };
  }

  function useSeedItem(hero, itemId, potIndex) {
    const idx = hero.items.findIndex(it => it.id === itemId);
    if (idx === -1) return 'Seme non trovato.';
    const item = hero.items[idx];
    if (item.slot !== 'seme') return 'Non è un seme.';
    const err = plantSeeds(hero, potIndex, item.seedId);
    if (err) return err;
    hero.items.splice(idx, 1);
    hero.greenhouse.pots[potIndex].daysGrown = 1; // pre-germinata: +1 giorno bonus
    return null;
  }

  /* ── Gilde ──────────────────────────────────────────────── */
  const GUILD_LEVELS = [
    { km: 0,     xpPct: 0,  goldPct: 0,  arenaDmg: 0, arenaHp: 0 },
    { km: 50,    xpPct: 2,  goldPct: 0,  arenaDmg: 0, arenaHp: 0 },
    { km: 150,   xpPct: 4,  goldPct: 0,  arenaDmg: 0, arenaHp: 0 },
    { km: 400,   xpPct: 5,  goldPct: 2,  arenaDmg: 0, arenaHp: 0 },
    { km: 900,   xpPct: 8,  goldPct: 4,  arenaDmg: 0, arenaHp: 0 },
    { km: 2000,  xpPct: 10, goldPct: 5,  arenaDmg: 2, arenaHp: 0 },
    { km: 4500,  xpPct: 12, goldPct: 8,  arenaDmg: 3, arenaHp: 0 },
    { km: 10000, xpPct: 15, goldPct: 10, arenaDmg: 5, arenaHp: 0 },
    { km: 22000, xpPct: 18, goldPct: 12, arenaDmg: 7, arenaHp: 2 },
    { km: 50000, xpPct: 20, goldPct: 15, arenaDmg: 10, arenaHp: 5 },
  ];

  function guildLevel(totalKm) {
    let lv = 0;
    for (let i = 0; i < GUILD_LEVELS.length; i++) {
      if (totalKm >= GUILD_LEVELS[i].km) lv = i;
    }
    return lv;
  }

  function guildBonus(totalKm) {
    return GUILD_LEVELS[guildLevel(totalKm)];
  }

  return {
    ACTIVITIES, MISSIONS, CARDS, BESTIARY, TROPHIES,
    rolloverWeeklyBoss, weeklyBossStatus, claimWeeklyBoss,
    getDailyWeather, WEATHER_TYPES,
    TREASURE_MAP_TIERS, rolloverTreasureMap, treasureMapStatus, claimTreasureTier,
    canPrestige, prestige, getMonthlyRecap, monthStamp, getWeeklyRecap, weekStamp,
    isMerchantWeekend, getTravelingMerchant, buyFromMerchant, merchantEffectivePrice,
    SKILL_TREE, SKILL_RESET_COST, skillById, learnSkill, resetSkills, skillBonus, earnSkillPoints,
    LORE_FRAGMENTS, checkLoreUnlock,
    DAILY_POTIONS, getDailyPotion, claimDailyPotion,
    BAITS, FISH, FISH_POOLS, addBait, useBait, rollFish, pescaLoot,
    BIOMES, MOUNTS, RARITIES, SLOTS,
    MAX_LEVEL, GOLD_PER_KM,
    xpForLevel, dailyGoalKm, heroTitle,
    currentBiome, accessibleZones, mountById, biomeSlug,
    newHero, migrateHero, load, save, deleteHero,
    logWorkout, availableMissions, startMission,
    declareRestDay,
    weeklyEvent, claimEvent, equipmentXpBonus,
    SEASON_PASS, SEASON_PASS_COSMETICS, SEASON_PASS_MOUNT,
    seasonPassStatus, seasonPassRewardFor, claimSeasonPassReward, seasonPassCosmeticById,
    genItem, genItemFor, sellItem, sellValue, buyMount, forgeOffers, buyForgeItem,
    CLASS_TALENTS, talentOf, itemImg,
    BATTLE_MOVES, BATTLE_MAX_DAY, battleBeats, randomMove,
    battlesLeft, useBattle, pickVillain, battleReward,
    logHealthSync,
    equipItem, unequipSlot,
    dailyLogin, rolloverIncursion,
    restoreStreak,
    MI_TIERS, rolloverMappaInfuocata, mappaInfuocataStatus, activateMappaInfuocata, claimMappaInfuocata,
    rolloverFugitiveMerchant, getFugitiveMerchant, todayKm, buyFromFugitiveMerchant,
    PET_PERSONALITIES, PET_FOODS, PET_ACCESSORIES, PET_SPECIES, PET_STAGE_REWARDS,
    PET_LEVELS_PER_STAGE, PET_LEGENDARY_HERO_LV, PET_MAX_LEVEL_BEFORE_LEGENDARY,
    PET_VIRTUE_META, PET_EXPEDITION_ZONES,
    PHOENIX_POTION_PRICE, EXPEDITION_HOURS,
    createPet, petXpForLevel, petStage, petStageUnlocks, petSpeciesBonus, tickPet, petArenaBonus, classArenaBonus,
    EGG_KM_NEEDED, eggProgress, hatchPet,
    feedPet, playWithPet, cleanPet, sleepPet, curePet,
    buyAccessory, checkAccessoryUnlocks, addPetXp,
    addPetVirtue, petDominantVirtue, addPetMemory, usePetSynergy,
    startExpedition, expeditionStatus, collectExpedition,
    packAuraActive,
    FURNITURE_SETS, furnitureSetById, furnitureSetOwnedCount, furnitureSetComplete,
    furnitureUnlockedSets, furnitureAggregate, buyFurniture,
    equipTypeBonusAggregate,
    ACHIEVEMENTS, achievementsUnlocked, claimAchievement,
    CONSUMABLE_ACHIEVEMENTS, consumableAchievementsUnlocked, craftConsumable,
    applyXp,
    DAILY_CHALLENGES_BONUS, getDailyChallenges, updateChallengeProgress, claimChallenge,
    WEEKLY_CHALLENGES_BONUS, getWeeklyChallenges, updateWeeklyProgress, claimWeeklyChallenge,
    DUNGEON_SCENARIOS, DUNGEON_CHOICE_SETS,
    startDungeon, canStartDungeon, dungeonCurrentEnemy,
    dungeonStartEncounter, dungeonGetScenario, dungeonAction,
    dungeonMakeChoice, dungeonStepResult,
    parseBackup, mergeImport,
    PLANTS, SERRA_MISSION_TEMPLATES,
    initGreenhouse, rolloverGreenhouse, waterPlant, harvestPlant, plantSeeds,
    genSeed, useSeedItem, genFertilizzante, useFertilizer,
    rolloverSerraMissions, claimSerraMission,
    SEASONS, currentSeason, initSeasonalChallenge, claimSeasonalChallenge,
    BIOME_LORE, BIOME_ARTIFACTS, WORLD_LETTERS, checkPendingLetters,
    MILESTONES, checkPendingMilestones,
    BOARD_NPCS, BOARD_QUEST_POOL, generateDailyBoard, claimBoardReward,
    CAMP_STAGES, CAMP_LAYERS, CAMP_NIGHT_LAYERS, campStageForLevel, campUnlockedLayers,
    CAMP_LAYER_SHOP, campLayerShopItem, buyCampLayer,
    CONSUMABLES, CONSUMABLE_IMG, consumableById, sellValueConsumable, buyPriceConsumable,
    addConsumable, useConsumable, sellConsumable, dropConsumable,
    TICKET_TYPES, addTicket, getUnscratchedTickets, scratchTicket,
    GUILD_LEVELS, guildLevel, guildBonus,
    canStartScalata, startScalata, scalataResolveDice, scalataAdvanceFloor, scalataGiveUp,
    scalataShopBuy, generateEnemyMove,
    SCALATA_ATK, SCALATA_DEF,
  };
})();

/* ── La Bisca Oscura ─────────────────────────────────────────────────────── */
{
  const _B = (() => {
    const BISCA_DAILY_BETS = 5;
    const BISCA_BET_SIZES  = [10, 25, 50, 100];
    const BISCA_ZONE_TIER  = {
      'Rovine di Oakhaven':     1,
      'Foresta Sussurrante':    2,
      'Il Giardino Lastricato': 2,
      'Le Pianure del Vento':   3,
      'La Vetta Oscura':        4,
    };
    const BISCA_ATTACKS = [
      'fendente', 'affondo', 'colpo di scudo', 'zampata',
      'soffio oscuro', 'morso velenoso', 'artigliata', 'urlo di guerra',
      'carica brutale', 'magia nera', 'presa stritolante', 'lama di vento',
    ];

    function _biscaToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

    function biscaResetIfNeeded(hero) {
      const today = _biscaToday();
      if (!hero.bisca) hero.bisca = {};
      if (hero.bisca.lastDate !== today) {
        hero.bisca.betsLeft = BISCA_DAILY_BETS;
        hero.bisca.lastDate = today;
      }
      if (hero.bisca.betsLeft === undefined) hero.bisca.betsLeft = BISCA_DAILY_BETS;
    }

    function biscaPickFighters() {
      const pool = RPG.BESTIARY ? RPG.BESTIARY.filter(b => !b.boss && !b.final)
                                : [];
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      let a = shuffled[0];
      let b = shuffled.find(x => x.zone !== a.zone) || shuffled[1];
      if (!a || !b) return null;
      const tierA = BISCA_ZONE_TIER[a.zone] || 1;
      const tierB = BISCA_ZONE_TIER[b.zone] || 1;
      if (tierA > tierB) { [a, b] = [b, a]; }
      return {
        a: { id: a.id, name: a.name, zone: a.zone, weakness: a.weakness, tier: Math.min(tierA, tierB) },
        b: { id: b.id, name: b.name, zone: b.zone, weakness: b.weakness, tier: Math.max(tierA, tierB) },
      };
    }

    function _runFight(aId, bId) {
      const pool = RPG.BESTIARY || [];
      const a = pool.find(x => x.id === aId);
      const b = pool.find(x => x.id === bId);
      const tierA = a ? (BISCA_ZONE_TIER[a.zone] || 1) : 1;
      const tierB = b ? (BISCA_ZONE_TIER[b.zone] || 1) : 1;
      const powerA = tierA * 18 + Math.random() * 38;
      const powerB = tierB * 18 + Math.random() * 28;
      const atkA = BISCA_ATTACKS[Math.floor(Math.random() * BISCA_ATTACKS.length)];
      const atkB = BISCA_ATTACKS[Math.floor(Math.random() * BISCA_ATTACKS.length)];
      return { winner: powerA > powerB ? 'a' : 'b', dmgA: Math.round(powerA), dmgB: Math.round(powerB), atkA, atkB };
    }

    function biscaBet(hero, pick, aId, bId, amount) {
      biscaResetIfNeeded(hero);
      if (hero.bisca.betsLeft <= 0) return { error: 'no_bets' };
      if ((hero.gold || 0) < amount) return { error: 'no_gold' };
      const result = _runFight(aId, bId);
      hero.gold = (hero.gold || 0) - amount;
      hero.bisca.betsLeft--;
      let payout = 0;
      const doubleActive = !!(hero.consumableBuffs?.biscaDoublePayout);
      if (hero.consumableBuffs?.biscaDoublePayout) delete hero.consumableBuffs.biscaDoublePayout;
      if (result.winner === pick) {
        const mult = (pick === 'a' ? 2.5 : 1.7) * (doubleActive ? 2 : 1);
        payout = Math.round(amount * mult);
        hero.gold += payout;
      }
      return { ok: true, winner: result.winner, won: result.winner === pick, payout, amount, pick, betsLeft: hero.bisca.betsLeft, atkA: result.atkA, atkB: result.atkB, doubleActive };
    }

    return { BISCA_DAILY_BETS, BISCA_BET_SIZES, biscaResetIfNeeded, biscaPickFighters, biscaBet };
  })();

  RPG.BISCA_DAILY_BETS    = _B.BISCA_DAILY_BETS;
  RPG.BISCA_BET_SIZES     = _B.BISCA_BET_SIZES;
  RPG.biscaResetIfNeeded  = _B.biscaResetIfNeeded;
  RPG.biscaPickFighters   = _B.biscaPickFighters;
  RPG.biscaBet            = _B.biscaBet;
}

/* ── La Cartomante — Tenda del Fato ─────────────────────────────────────── */
{
  const _C = (() => {
    function _cartToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

    function cartReset(hero) {
      if (!hero.cartomante) hero.cartomante = {};
      const t = _cartToday();
      if (hero.cartomante.date !== t) {
        hero.cartomante.date             = t;
        hero.cartomante.ruotaSpins       = 0;
        hero.cartomante.catenaStep       = 0;
        hero.cartomante.catenaDone       = false;
        hero.cartomante.catenaBusted     = false;
        hero.cartomante.cassaOpenedToday = {};
      }
      if (!hero.cartomante.cassaOpenedToday) hero.cartomante.cassaOpenedToday = {};
    }

    /* ── Ruota del Fato ── */
    const RUOTA_SECTORS = [
      { id: 'gold_sm',    label: '🪙 ×30',        color: '#e8b64c', weight: 28 },
      { id: 'fiches_sm',  label: '🎴 ×5',         color: '#9c6ae1', weight: 24 },
      { id: 'wood',       label: '🌲 ×20',        color: '#a0714f', weight: 14 },
      { id: 'nothing',    label: '💨 Vento',      color: '#6b7280', weight: 12 },
      { id: 'gold_big',   label: '🪙 ×100',       color: '#f59e0b', weight: 8  },
      { id: 'item',       label: '🎁 Oggetto',    color: '#3b82f6', weight: 7  },
      { id: 'fiches_big', label: '🎴 ×20',        color: '#7c3aed', weight: 5  },
      { id: 'jackpot',    label: '⭐ JACKPOT',    color: '#f97316', weight: 2  },
    ];

    function _ruotaResolve(hero, sectorId) {
      switch (sectorId) {
        case 'gold_sm':   hero.gold  += 30;                                        return { gold: 30 };
        case 'gold_big':  hero.gold  += 100;                                       return { gold: 100 };
        case 'fiches_sm': hero.fiches = (hero.fiches||0) + 5;                     return { fiches: 5 };
        case 'fiches_big':hero.fiches = (hero.fiches||0) + 20;                    return { fiches: 20 };
        case 'wood':      hero.wood  += 20;                                        return { wood: 20 };
        case 'jackpot':   hero.gold += 300; hero.fiches = (hero.fiches||0) + 50;  return { gold: 300, fiches: 50, jackpot: true };
        case 'item': {
          const it = RPG.genItemFor(hero);
          hero.items.push(it);
          return { item: it };
        }
        default: return { nothing: true };
      }
    }

    function spinRuota(hero) {
      cartReset(hero);
      const spins = hero.cartomante.ruotaSpins || 0;
      const cost  = spins === 0 ? 0 : 15;
      if (cost > 0 && (hero.fiches||0) < cost) return { error: 'no_fiches', cost };
      if (cost > 0) hero.fiches -= cost;
      const total = RUOTA_SECTORS.reduce((s, x) => s + x.weight, 0);
      let r = Math.random() * total;
      let idx = RUOTA_SECTORS.length - 1;
      for (let i = 0; i < RUOTA_SECTORS.length; i++) { r -= RUOTA_SECTORS[i].weight; if (r <= 0) { idx = i; break; } }
      const sector = RUOTA_SECTORS[idx];
      const reward = _ruotaResolve(hero, sector.id);
      hero.cartomante.ruotaSpins = spins + 1;
      return { ok: true, idx, sector, reward, cost, spinsUsed: spins + 1 };
    }

    /* ── Pozzo delle Evocazioni ── */
    const POZZO_COST = 40;
    const POZZO_RARITIES = [
      { rarity: 'comune',      weight: 50 },
      { rarity: 'non_comune',  weight: 28 },
      { rarity: 'raro',        weight: 14 },
      { rarity: 'epico',       weight: 6  },
      { rarity: 'leggendario', weight: 2  },
    ];

    function pullPozzo(hero) {
      if ((hero.fiches||0) < POZZO_COST) return { error: 'no_fiches', cost: POZZO_COST };
      hero.fiches -= POZZO_COST;
      const total = POZZO_RARITIES.reduce((s, x) => s + x.weight, 0);
      let r = Math.random() * total;
      let entry = POZZO_RARITIES[POZZO_RARITIES.length - 1];
      for (const e of POZZO_RARITIES) { r -= e.weight; if (r <= 0) { entry = e; break; } }
      // forcedRarity garantisce che l'oggetto abbia ESATTAMENTE la rarità estratta,
      // indipendentemente dal livello dell'eroe
      const item = RPG.genItem(hero.level, null, null, entry.rarity);
      hero.items.push(item);
      return { ok: true, item, rarity: entry.rarity };
    }

    /* ── Catena del Fato ── */
    const CATENA_STEPS = [
      { gold: 20,  fiches: 2,  bust: 0.06 },
      { gold: 45,  fiches: 4,  bust: 0.12 },
      { gold: 90,  fiches: 7,  bust: 0.20 },
      { gold: 160, fiches: 12, bust: 0.30 },
      { gold: 260, fiches: 18, bust: 0.42 },
      { gold: 400, fiches: 28, bust: 0.56 },
      { gold: 600, fiches: 45, bust: 0.72 },
    ];

    function catenaRoll(hero) {
      cartReset(hero);
      if (hero.cartomante.catenaDone) return { error: 'done' };
      const step = Math.min(hero.cartomante.catenaStep || 0, CATENA_STEPS.length - 1);
      const s = CATENA_STEPS[step];
      const busted = Math.random() < s.bust;
      if (busted) {
        hero.cartomante.catenaDone   = true;
        hero.cartomante.catenaBusted = true;
        return { ok: true, busted: true, step };
      }
      hero.cartomante.catenaStep = step + 1;
      const atMax = hero.cartomante.catenaStep >= CATENA_STEPS.length;
      if (atMax) hero.cartomante.catenaDone = true;
      return { ok: true, busted: false, step, goldPending: s.gold, fichesPending: s.fiches, atMax };
    }

    function catenaCashOut(hero) {
      cartReset(hero);
      if (hero.cartomante.catenaDone) return { error: 'done' };
      const step = hero.cartomante.catenaStep || 0;
      if (step === 0) return { error: 'no_progress' };
      let totalGold = 0, totalFiches = 10; // +10 cash-out bonus
      for (let i = 0; i < step; i++) { totalGold += CATENA_STEPS[i].gold; totalFiches += CATENA_STEPS[i].fiches; }
      hero.gold  += totalGold;
      hero.fiches = (hero.fiches||0) + totalFiches;
      hero.cartomante.catenaDone = true;
      return { ok: true, gold: totalGold, fiches: totalFiches };
    }

    /* ── Casse Chiuse ── */
    const CASSA_TYPES = [
      { id: 'bronzo',  name: 'Cassa di Bronzo',   emoji: '🥉', keyCost: 20,
        pool: [
          { w: 55, resolve: h => { const i = RPG.genItemFor(h,'comune');     h.items.push(i); return { item:i, rarity:'comune' }; } },
          { w: 28, resolve: h => { const i = RPG.genItemFor(h,'non comune'); h.items.push(i); return { item:i, rarity:'non_comune' }; } },
          { w: 10, resolve: h => { h.gold += 25; return { gold:25 }; } },
          { w: 7,  resolve: h => { const i = RPG.genItemFor(h,'raro');       h.items.push(i); return { item:i, rarity:'raro' }; } },
        ]},
      { id: 'argento', name: 'Cassa d\'Argento',  emoji: '🥈', keyCost: 40,
        pool: [
          { w: 38, resolve: h => { const i = RPG.genItemFor(h,'non comune'); h.items.push(i); return { item:i, rarity:'non_comune' }; } },
          { w: 32, resolve: h => { const i = RPG.genItemFor(h,'raro');       h.items.push(i); return { item:i, rarity:'raro' }; } },
          { w: 15, resolve: h => { h.gold += 70; return { gold:70 }; } },
          { w: 10, resolve: h => { const i = RPG.genItemFor(h,'epico');      h.items.push(i); return { item:i, rarity:'epico' }; } },
          { w: 5,  resolve: h => { h.fiches = (h.fiches||0)+25; return { fiches:25 }; } },
        ]},
      { id: 'oro',    name: 'Cassa d\'Oro',       emoji: '🥇', keyCost: 80,
        pool: [
          { w: 38, resolve: h => { const i = RPG.genItemFor(h,'raro');        h.items.push(i); return { item:i, rarity:'raro' }; } },
          { w: 28, resolve: h => { const i = RPG.genItemFor(h,'epico');       h.items.push(i); return { item:i, rarity:'epico' }; } },
          { w: 15, resolve: h => { h.gold += 180; return { gold:180 }; } },
          { w: 12, resolve: h => { const i = RPG.genItemFor(h,'leggendario'); h.items.push(i); return { item:i, rarity:'leggendario' }; } },
          { w: 7,  resolve: h => { h.fiches = (h.fiches||0)+50; return { fiches:50 }; } },
        ]},
    ];

    function openCassa(hero, cassaId) {
      cartReset(hero);
      const type = CASSA_TYPES.find(c => c.id === cassaId);
      if (!type) return { error: 'invalid' };
      if ((hero.fiches||0) < type.keyCost) return { error: 'no_fiches', cost: type.keyCost };
      hero.fiches -= type.keyCost;
      const pool  = type.pool;
      const total = pool.reduce((s, x) => s + x.w, 0);
      let r = Math.random() * total;
      let entry = pool[pool.length - 1];
      for (const e of pool) { r -= e.w; if (r <= 0) { entry = e; break; } }
      const reward = entry.resolve(hero);
      return { ok: true, reward };
    }

    /* ── Lascio o Raddoppio ── */
    function lascioBet(hero, goldAmount, pick) {
      if (!goldAmount || goldAmount <= 0) return { error: 'no_gold' };
      if (pick === 'lascio') return { ok: true, kept: goldAmount };
      const won = Math.random() < 0.50;
      if (won) {
        hero.gold  += goldAmount;
        hero.fiches = (hero.fiches||0) + 5;
        return { ok: true, won: true, bonus: goldAmount, fiches: 5 };
      } else {
        hero.gold = Math.max(0, (hero.gold||0) - goldAmount);
        return { ok: true, won: false, lost: goldAmount };
      }
    }

    return { RUOTA_SECTORS, CATENA_STEPS, CASSA_TYPES, POZZO_COST,
             cartReset, spinRuota, pullPozzo, catenaRoll, catenaCashOut, openCassa, lascioBet };
  })();

  RPG.RUOTA_SECTORS   = _C.RUOTA_SECTORS;
  RPG.CATENA_STEPS    = _C.CATENA_STEPS;
  RPG.CASSA_TYPES     = _C.CASSA_TYPES;
  RPG.POZZO_COST      = _C.POZZO_COST;
  RPG.cartReset       = _C.cartReset;
  RPG.spinRuota       = _C.spinRuota;
  RPG.pullPozzo       = _C.pullPozzo;
  RPG.catenaRoll      = _C.catenaRoll;
  RPG.catenaCashOut   = _C.catenaCashOut;
  RPG.openCassa       = _C.openCassa;
  RPG.lascioBet       = _C.lascioBet;
}
