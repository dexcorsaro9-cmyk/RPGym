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
    m.img = 'assets/cavalcature/' + m.num + '.png';
    m.price = Math.round(15 * Math.pow(m.level, 1.8) / 10) * 10;
    m.bonus = Math.round(3 + m.level * 0.45);
  });
  function mountById(id) { return MOUNTS.find(m => m.id === id); }

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
  };

  /* ── Icone del loot (generate con l'IA, in assets/loot/) ──── */
  // Quante immagini esistono per rarità/slot: <rarità>/<slot>-<n>.png
  const LOOT_IMG = {
    comune:      { arma: 8,  scudo: 5, elmo: 5, armatura: 4, anello: 3, amuleto: 4 },
    non_comune:  { arma: 7,  scudo: 5, elmo: 6, armatura: 4, anello: 5, amuleto: 7 },
    raro:        { arma: 17, scudo: 8, elmo: 8, armatura: 8, anello: 9, amuleto: 9 },
    epico:       { arma: 16, scudo: 2, elmo: 7, armatura: 8, anello: 9, amuleto: 5 },
    leggendario: { arma: 4,  scudo: 3, elmo: 3, armatura: 4, anello: 2, amuleto: 5 },
    divino:      { arma: 4,  scudo: 1, elmo: 2, armatura: 3, anello: 1, amuleto: 2 },
    oscuro:      { arma: 6,  scudo: 1, elmo: 2, armatura: 3, anello: 1, amuleto: 2 },
  };
  // Immagine stabile per un oggetto (stesso oggetto → stessa icona)
  function itemImg(item) {
    const pool = (LOOT_IMG[item.rarity] || {})[item.slot];
    if (!pool) return null;
    const h = [...String(item.id)].reduce((s, c) => (s * 33 + c.charCodeAt(0)) % 9973, 7);
    return `assets/loot/${item.rarity}/${item.slot}-${h % pool}.png`;
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

  let itemSeq = 0;
  function genItem(level, minRarity, forcedSlot, forcedRarity) {
    const rarity = forcedRarity || rollRarity(level, minRarity);
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

  // Genera loot per un eroe, applicando il talento dell'Alchimista
  function genItemFor(hero, minRarity, forcedSlot) {
    let item = genItem(hero.level, minRarity, forcedSlot);
    const alchProc = isClass(hero, 'alchimista') && Math.random() < 0.10;
    const furn = furnitureAggregate(hero);
    const furnProc = Math.random() < furn.dropRareChance;
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
    { id: 'golem',     zone: 'Le Pianure del Vento', name: 'Il Generale dei Golem',
      km: 25, minLevel: 16, requires: 'giardino1',
      desc: 'Un colosso a molla marcia tra l\'erba alta delle pianure spazzate dal vento. Sconfiggilo!',
      reward: { gold: 250, card: 'card_golem', items: 2 } },
    { id: 'amuleto',   zone: 'Le Pianure del Vento', name: 'L\'Amuleto del Viaggiatore Esperto',
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
    { id: 'golem-molla',         name: 'Golem a Molla',         zone: 'Le Pianure del Vento',
      boss: true, mission: 'golem',
      weakness: 'Fulmine', lore: 'Secondo luogotenente dell\'Orda. Marcia tra l\'erba spazzata dal vento: la chiave inglese è sua.' },
    { id: 'drago-komodo',        name: 'Drago di Komodo',       zone: 'Le Pianure del Vento',
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
      pet: null,
      stamina: 0,
      furniture: { owned: [] },
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
    h.forgeSeen = h.forgeSeen || null;      // ultima data in cui ha visto la vetrina
    h.summarySeen = h.summarySeen || null;  // ultima data del riepilogo giornaliero
    h.eventNotified = h.eventNotified || null; // settimana della Taglia già notificata
    h.battles = h.battles || { date: null, count: 0 }; // sfide dell'Arena usate oggi
    h.healthSync = h.healthSync || { date: null, applied: {} }; // sincronizzazione da Apple Salute
    h.pet = h.pet || null;
    if (h.pet && !h.pet.species) {
      h.pet.species = PET_SPECIES_KEYS[Math.floor(Math.random() * PET_SPECIES_KEYS.length)];
      if (!h.pet.name || h.pet.name === 'Ignis') h.pet.name = PET_SPECIES[h.pet.species].name;
    }
    h.stamina = h.stamina || 0;
    h.furniture = h.furniture || { owned: [] };
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
      const item = genItemFor(hero, 'raro');
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

  function logWorkout(hero, type, km, opts) {
    const err = (opts && opts.skipValidation) ? null : validateSession(type, km);
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

    let xpMult = 1 + buildingBonus(hero, 'xpMult') + equipmentXpBonus(hero) / 100;
    let goldMult = 1 + buildingBonus(hero, 'goldMult');
    let resMult = 1 + buildingBonus(hero, 'resMult');
    // Talenti di classe
    if (isClass(hero, 'stregone')) xpMult += 0.10;
    if (isClass(hero, 'eroe1') && type !== 'cyclette') xpMult += 0.10;
    if (isClass(hero, 'furfante')) goldMult += 0.20;
    if (isClass(hero, 'eroe2')) resMult += 0.25;
    if (isClass(hero, 'maga')) { resMult += 0.15; xpMult += 0.05; }

    // Cimeli del Rifugio (Espansione)
    const furn = furnitureAggregate(hero);
    xpMult += (furn.xpMult[type] || 0) + (furn.xpMult.global || 0);
    goldMult += furn.goldMult;
    let localWoodMult = resMult + furn.woodMult;
    let localStoneMult = resMult + furn.stoneMult;
    // Dualità: Cittadella dell'Eclissi, +risorse dopo le 18:00
    if (furn.flags.dualityBonus && new Date().getHours() >= 18) {
      goldMult += furn.flags.dualityBonus;
      localWoodMult += furn.flags.dualityBonus;
      localStoneMult += furn.flags.dualityBonus;
    }

    report.xp = Math.round(effKm * act.xpPerKm * mult * xpMult);
    report.gold = Math.round(effKm * GOLD_PER_KM * mult * goldMult);
    hero.xp += report.xp;
    hero.gold += report.gold;

    report.wood = Math.round((effKm * (1 + Math.random())) * localWoodMult);
    report.stone = Math.round((effKm * Math.random()) * localStoneMult);
    hero.wood += report.wood;
    hero.stone += report.stone;

    hero.totalKm += km;
    hero.kmByType[type] = (hero.kmByType[type] || 0) + km;
    if (type === 'corsa') {
      let staminaGain = km * 5 + furn.staminaMaxBonus;
      if (furn.flags.doubleStamina) staminaGain *= 2;
      hero.stamina = (hero.stamina || 0) + staminaGain;
    }
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
      const item = genItemFor(hero);
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
    const hs = healthSyncState(hero);
    const already = hs.applied[type] || 0;
    let delta = totalKmToday - already;
    if (!(delta > 0.05)) return null; // nulla di nuovo, o rumore verso il basso
    delta = Math.round(delta * 100) / 100;
    const capped = Math.min(delta, Math.max(0, HEALTH_SYNC_DAILY_CAP - already));
    if (capped <= 0) return null;
    const report = logWorkout(hero, type, capped, { skipValidation: true });
    if (report && !report.error) {
      hs.applied[type] = already + capped;
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
    const chest = {
      gold: (r.gold || 0) * (doubleChest ? 2 : 1),
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
      hero.pet = createPet();
      const sp = PET_SPECIES[hero.pet.species];
      report.unlocks.push(`🐺 EVENTO DEL RISVEGLIO! Il Lupo Astrale ti ha scelto: è la tua cavalcatura in missione (+10% km). Nello stesso istante, un misterioso uovo di ${sp.name} ${sp.icon} è apparso al Rifugio: visita il Santuario dei Famigli per prendertene cura e vederlo evolvere!`);
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
    return null;
  }

  // La Fucina propone ogni giorno 3 pezzi (armi/armature), uguali per data
  function forgeOffers(hero) {
    const today = todayStamp();
    const seed = dateSeed(today + '-forge');
    const slots = ['arma', 'scudo', 'elmo', 'armatura'];
    const offers = [];
    const furn = furnitureAggregate(hero);
    const discount = 1 - Math.min(0.6, furn.marketDiscount);
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
        price: Math.round(r.value * 2 * (isClass(hero, 'fabbro') ? 0.8 : 1) * discount),
        desc: descForItem(s, rarity),
      });
    }
    // L'OCCASIONE DEL SABATO: un pezzo della miglior rarità disponibile, -30%, solo oggi!
    if (new Date().getDay() === 6) {
      const avail = availableRarities(hero.level);
      const rarity = avail[avail.length - 1];
      const s = slots[seed % slots.length];
      const base = ITEM_BASES[s][(seed + 11) % ITEM_BASES[s].length];
      const suf = RARITY_SUFFIX[rarity][(seed + 17) % RARITY_SUFFIX[rarity].length];
      const r = RARITIES[rarity];
      const full = Math.round(r.value * 2 * (isClass(hero, 'fabbro') ? 0.8 : 1) * discount);
      offers.push({
        id: 'forge-' + today + '-occasione',
        slot: s, rarity,
        name: `${base} ${suf}`,
        icon: SLOTS[s].icon,
        xp: r.xp, value: r.value,
        price: Math.round(full * 0.7),
        fullPrice: full,
        special: true,
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
    const maxRest = isClass(hero, 'fata') ? 3 : 2;
    if (hero.restDaysThisWeek >= maxRest) return `Hai già usato i tuoi ${maxRest} Giorni di Riposo questa settimana!`;
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
    if (hero.battles.date !== todayStamp()) return BATTLE_MAX_DAY;
    return Math.max(0, BATTLE_MAX_DAY - hero.battles.count);
  }
  // Consuma una sfida (ritorna false se esaurite)
  function useBattle(hero) {
    const today = todayStamp();
    if (hero.battles.date !== today) hero.battles = { date: today, count: 0 };
    if (hero.battles.count >= BATTLE_MAX_DAY) return false;
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
    };
    hero.gold += chest.gold;
    if (Math.random() < (boss ? 0.65 : 0.4)) {
      const it = genItemFor(hero, boss ? 'raro' : null);
      hero.items.push(it);
      chest.items.push(it);
    }
    return chest;
  }

  /* ═══════════════════════════════════════════════════════════
     IL SANTUARIO DEI FAMIGLI — meccaniche stile Tamagotchi
     ═══════════════════════════════════════════════════════════ */

  const PET_SPECIES = {
    ignis:   { name: 'Ignis',   icon: '🔥', desc: 'Nato da un frammento di lava incandescente, cresce fino a diventare un drago di fuoco.' },
    aqua:    { name: 'Marea',   icon: '🌊', desc: 'Sboccia da una perla di corallo e matura in un drago dei mari.' },
    glacio:  { name: 'Glacio',  icon: '❄️', desc: 'Un cristallo di ghiaccio antico che si risveglia in un lupo glaciale.' },
    terras:  { name: 'Terras',  icon: '🏜️', desc: 'Un uovo di sabbia sigillato da geroglifici, custode dei segreti del deserto.' },
    umbra:   { name: 'Umbra',   icon: '🌑', desc: 'Un frammento d\'ombra stellata che diventa una tigre cosmica.' },
    volt:    { name: 'Volt',    icon: '⚡', desc: 'Scintille pure imprigionate in un uovo, destinate a un rapace della tempesta.' },
    silvano: { name: 'Silvano', icon: '🌿', desc: 'Un seme millenario che germoglia in un guardiano della foresta.' },
    chronos: { name: 'Chronos', icon: '⏳', desc: 'Un ingranaggio incantato che si trasforma in un gufo dei meccanismi del tempo.' },
  };
  const PET_SPECIES_KEYS = Object.keys(PET_SPECIES);
  const PET_EVOLUTION_STAGES = 5;
  const PET_LEVELS_PER_STAGE = 4;

  function petStage(level) {
    return Math.min(PET_EVOLUTION_STAGES, Math.floor((level - 1) / PET_LEVELS_PER_STAGE) + 1);
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
    cappello: { name: 'Cappellino da Pirata', icon: '🏴‍☠️', price: 80 },
    collare:  { name: 'Collare Magico', icon: '🔮', price: 60 },
    occhiali: { name: 'Occhiali Steampunk', icon: '🥽', price: 100 },
  };

  const PHOENIX_POTION_PRICE = 500;
  const EXPEDITION_HOURS = 2;
  const WISH_WINDOW_MINUTES = 60;

  function clamp01to100(n) { return Math.max(0, Math.min(100, n)); }

  function createPet() {
    const keys = Object.keys(PET_PERSONALITIES);
    const personality = keys[Math.floor(Math.random() * keys.length)];
    const species = PET_SPECIES_KEYS[Math.floor(Math.random() * PET_SPECIES_KEYS.length)];
    const now = Date.now();
    return {
      name: PET_SPECIES[species].name,
      species,
      level: 1, xp: 0,
      personality,
      hunger: 100, mood: 100, hygiene: 100, energy: 100,
      lastTick: now,
      kmAtLastClean: 0,
      sick: false, sickDays: 0, sickCheckedDate: null,
      sleptToday: false, energyDate: null, restedBonusActive: false,
      wish: null, wishCooldownUntil: now + 3 * 3600000,
      accessory: null, accessoriesOwned: [],
      expedition: null,
    };
  }

  function petXpForLevel(level) { return 40 + level * 20; }

  // Ricalcola le barre in base al tempo reale trascorso. Va chiamata
  // prima di leggere/mostrare lo stato del pet.
  function tickPet(hero) {
    if (!hero.pet) return;
    const p = hero.pet;
    const pers = PET_PERSONALITIES[p.personality] || PET_PERSONALITIES.goloso;
    const now = Date.now();
    const hoursElapsed = Math.max(0, (now - p.lastTick) / 3600000);
    if (hoursElapsed > 0) {
      const hungerRate = (20 / 6) * pers.hungerRateMult;
      const moodRate = (25 / 24) * pers.moodRateMult;
      p.hunger = clamp01to100(p.hunger - hungerRate * hoursElapsed);
      p.mood = clamp01to100(p.mood - moodRate * hoursElapsed);
      p.lastTick = now;
    }
    // Igiene: legata ai km percorsi dall'ultimo bagno, non al tempo
    const kmDirty = Math.max(0, hero.totalKm - (p.kmAtLastClean || 0));
    p.hygiene = clamp01to100(100 - Math.floor(kmDirty / 3.5) * 20);

    // Rollover giornaliero: energia (sonno) + malattia
    const today = todayStamp();
    if (p.energyDate !== today) {
      const wasGoodSleep = !!p.sleptToday;
      p.energy = wasGoodSleep ? 100 : 60;
      p.restedBonusActive = wasGoodSleep;
      p.sleptToday = false;
      p.energyDate = today;
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
    if (!p.wish && now > (p.wishCooldownUntil || 0) && Math.random() < 0.15) {
      const foodKeys = Object.keys(PET_FOODS);
      const item = foodKeys[Math.floor(Math.random() * foodKeys.length)];
      p.wish = { item, deadline: now + WISH_WINDOW_MINUTES * 60000 };
      p.wishCooldownUntil = now + 6 * 3600000;
    }
    // Risoluzione automatica della spedizione se il tempo è scaduto
    // (rimane "da riscuotere" finché non si preme il pulsante apposito)
  }

  function petArenaBonus(hero) {
    const out = { dmgBonus: 0, hpBonus: 0, dodgeChance: 0, critMult: 1 };
    if (!hero.companion || !hero.pet) return out;
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
    return out;
  }

  function classArenaBonus(hero) {
    const out = { dmgBonus: 0, hpBonus: 0 };
    if (isClass(hero, 'paladino')) { out.dmgBonus = Math.round(34 * 0.12); out.hpBonus = Math.round(100 * 0.12); }
    return out;
  }

  function feedPet(hero, foodKey) {
    if (!hero.pet) return 'Non hai ancora un famiglio.';
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
    addPetXp(hero, 5);
    return { ok: true, wishFulfilled };
  }

  function playWithPet(hero) {
    if (!hero.pet) return 'Non hai ancora un famiglio.';
    const STAMINA_COST = 5;
    if ((hero.stamina || 0) < STAMINA_COST) return `Serve più Stamina! Corri per generarne (hai ${(hero.stamina || 0).toFixed(1)}/${STAMINA_COST}).`;
    tickPet(hero);
    hero.stamina -= STAMINA_COST;
    hero.pet.mood = clamp01to100(hero.pet.mood + 25);
    addPetXp(hero, 8);
    return { ok: true };
  }

  function cleanPet(hero) {
    if (!hero.pet) return 'Non hai ancora un famiglio.';
    const WOOD_COST = 10, STONE_COST = 10;
    if (hero.wood < WOOD_COST || hero.stone < STONE_COST) return `Serve più legna/pietra (hai 🪵${hero.wood}/🪨${hero.stone}, servono ${WOOD_COST}/${STONE_COST}).`;
    tickPet(hero);
    hero.wood -= WOOD_COST; hero.stone -= STONE_COST;
    hero.pet.kmAtLastClean = hero.totalKm;
    hero.pet.hygiene = 100;
    addPetXp(hero, 4);
    return { ok: true };
  }

  function sleepPet(hero) {
    if (!hero.pet) return 'Non hai ancora un famiglio.';
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
    if (!hero.pet) return 'Non hai ancora un famiglio.';
    if (!hero.pet.sick) return 'Il tuo famiglio non è malato.';
    if (hero.gold < PHOENIX_POTION_PRICE) return `Serve la Pozione della Fenice: ${PHOENIX_POTION_PRICE} monete (hai ${hero.gold}).`;
    hero.gold -= PHOENIX_POTION_PRICE;
    hero.pet.sick = false; hero.pet.sickDays = 0;
    hero.pet.hunger = 50; hero.pet.mood = 50;
    return { ok: true };
  }

  function buyAccessory(hero, key) {
    if (!hero.pet) return 'Non hai ancora un famiglio.';
    const acc = PET_ACCESSORIES[key];
    if (!acc) return 'Accessorio sconosciuto.';
    const owned = hero.pet.accessoriesOwned.includes(key);
    if (!owned) {
      if (hero.gold < acc.price) return 'Oro insufficiente!';
      hero.gold -= acc.price;
      hero.pet.accessoriesOwned.push(key);
    }
    hero.pet.accessory = hero.pet.accessory === key ? null : key;
    return { ok: true };
  }

  function addPetXp(hero, amount) {
    if (!hero.pet || hero.pet.hunger <= 0) return; // affamato: non cresce
    hero.pet.xp += amount;
    while (hero.pet.xp >= petXpForLevel(hero.pet.level)) {
      hero.pet.xp -= petXpForLevel(hero.pet.level);
      hero.pet.level++;
    }
  }

  function startExpedition(hero) {
    if (!hero.pet) return 'Non hai ancora un famiglio.';
    if (hero.pet.expedition) return 'Il tuo famiglio è già in spedizione.';
    if (hero.pet.sick) return 'Il tuo famiglio è malato: deve prima guarire.';
    hero.pet.expedition = { startedAt: Date.now(), kmAtStart: hero.totalKm };
    return { ok: true };
  }

  function expeditionStatus(hero) {
    if (!hero.pet || !hero.pet.expedition) return null;
    const elapsedH = (Date.now() - hero.pet.expedition.startedAt) / 3600000;
    return { ready: elapsedH >= EXPEDITION_HOURS, pctDone: Math.min(100, Math.round(elapsedH / EXPEDITION_HOURS * 100)) };
  }

  function collectExpedition(hero) {
    if (!hero.pet || !hero.pet.expedition) return null;
    const status = expeditionStatus(hero);
    if (!status.ready) return null;
    const kmDuring = Math.max(0, hero.totalKm - hero.pet.expedition.kmAtStart);
    hero.pet.expedition = null;
    // Più km durante la spedizione -> più probabile un bottino epico
    const chance = Math.min(0.85, 0.10 + kmDuring * 0.12);
    const result = { wood: 0, stone: 0, gold: 0, epic: false };
    if (Math.random() < chance) {
      result.epic = true;
      result.wood = 20 + Math.round(Math.random() * 20);
      result.stone = 20 + Math.round(Math.random() * 20);
      result.gold = 30 + Math.round(Math.random() * 30);
    } else {
      result.wood = 3 + Math.round(Math.random() * 5);
      result.stone = 1 + Math.round(Math.random() * 3);
    }
    hero.wood += result.wood; hero.stone += result.stone; hero.gold += result.gold;
    addPetXp(hero, 10);
    return result;
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
        {id: "f001", name: "Tappeto Intrecciato di Oakhaven", bonusText: "+0.5% XP Camminata", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "camminata", "value": 0.005}], price: {"gold": 11, "wood": 4, "stone": 3}, img: "assets/ui/rifugio/furniture/set01/01.png"},
        {id: "f002", name: "Torcia in Legno Grezzo", bonusText: "+1% Monete trovate", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 12, "wood": 4, "stone": 3}, img: "assets/ui/rifugio/furniture/set01/02.png"},
        {id: "f003", name: "Tavolo della Taverna", bonusText: "+1% Legna trovata", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.01}], price: {"gold": 14, "wood": 4, "stone": 4}, img: "assets/ui/rifugio/furniture/set01/03.png"},
        {id: "f004", name: "Sgabello a Tre Gambe", bonusText: "+0.5% XP Camminata", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "camminata", "value": 0.005}], price: {"gold": 15, "wood": 5, "stone": 4}, img: "assets/ui/rifugio/furniture/set01/04.png"},
        {id: "f005", name: "Scudo di Legno Scheggiato", bonusText: "+1% Danni in Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 17, "wood": 8, "stone": 10}, img: "assets/ui/rifugio/furniture/set01/05.png"},
        {id: "f006", name: "Mappa della Foresta", bonusText: "+1% Probabilità di trovare Progetti", epic: false, wall: true, effects: [{"type": "dropProjectChance", "value": 0.01}], price: {"gold": 18, "wood": 8, "stone": 11}, img: "assets/ui/rifugio/furniture/set01/06.png"},
        {id: "f007", name: "Statuina del Gufo", bonusText: "+0.5% XP Camminata", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "camminata", "value": 0.005}], price: {"gold": 20, "wood": 6, "stone": 5}, img: "assets/ui/rifugio/furniture/set01/07.png"},
        {id: "f008", name: "Mola per Affilare", bonusText: "+1% Danni in Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 21, "wood": 7, "stone": 6}, img: "assets/ui/rifugio/furniture/set01/08.png"},
        {id: "f009", name: "Cesta di Mele", bonusText: "+1 Stamina massima", epic: false, wall: false, effects: [{"type": "staminaMax", "value": 1.0}], price: {"gold": 22, "wood": 7, "stone": 6}, img: "assets/ui/rifugio/furniture/set01/09.png"},
        {id: "f010", name: "Lo Stendardo del Viandante", bonusText: "+2% XP Camminata", epic: true, wall: false, effects: [{"type": "xpMult", "activity": "camminata", "value": 0.02}], price: {"gold": 72, "wood": 23, "stone": 20}, img: "assets/ui/rifugio/furniture/set01/10.png"},
      ],
    },
    {
      id: "set02", num: 2, name: "L'Arsenale del Fabbro",
      biomeIdx: 5, fallbackIcon: "⚙️",
      setBonusDesc: "Sconto del 15% su tutti gli acquisti nel Mercato",
      setBonusEffects: [{"type": "marketDiscount", "value": 0.15}],
      items: [
        {id: "f011", name: "Pavimentazione in Pietra Lavica", bonusText: "+0.5% Pietra trovata", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.005}], price: {"gold": 17, "wood": 5, "stone": 5}, img: "assets/ui/rifugio/furniture/set02/01.png"},
        {id: "f012", name: "Braciere a Carbone", bonusText: "+1% Pietra trovata", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 19, "wood": 6, "stone": 5}, img: "assets/ui/rifugio/furniture/set02/02.png"},
        {id: "f013", name: "Banco da Lavoro in Ferro", bonusText: "Sconto 1% al Mercato", epic: false, wall: false, effects: [{"type": "marketDiscount", "value": 0.01}], price: {"gold": 21, "wood": 7, "stone": 6}, img: "assets/ui/rifugio/furniture/set02/03.png"},
        {id: "f014", name: "Sedia del Mastro Fabbro", bonusText: "Sconto 1% al Mercato", epic: false, wall: false, effects: [{"type": "marketDiscount", "value": 0.01}], price: {"gold": 24, "wood": 8, "stone": 6}, img: "assets/ui/rifugio/furniture/set02/04.png"},
        {id: "f015", name: "Rastrelliera per Spade", bonusText: "+2% Danni in Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.02}], price: {"gold": 26, "wood": 12, "stone": 15}, img: "assets/ui/rifugio/furniture/set02/05.png"},
        {id: "f016", name: "Ruota Dentata Gigante", bonusText: "+1% Probabilità doppio drop risorse", epic: false, wall: true, effects: [{"type": "doubleDropChance", "value": 0.01}], price: {"gold": 28, "wood": 13, "stone": 17}, img: "assets/ui/rifugio/furniture/set02/06.png"},
        {id: "f017", name: "Scultura di Ruggine", bonusText: "Sconto 1% al Mercato", epic: false, wall: false, effects: [{"type": "marketDiscount", "value": 0.01}], price: {"gold": 30, "wood": 10, "stone": 8}, img: "assets/ui/rifugio/furniture/set02/07.png"},
        {id: "f018", name: "Incudine Fumante", bonusText: "Sconto 2% al Mercato", epic: false, wall: false, effects: [{"type": "marketDiscount", "value": 0.02}], price: {"gold": 33, "wood": 10, "stone": 9}, img: "assets/ui/rifugio/furniture/set02/08.png"},
        {id: "f019", name: "Cassa in Ferro Battuto", bonusText: "+1% Pietra trovata", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 35, "wood": 11, "stone": 9}, img: "assets/ui/rifugio/furniture/set02/09.png"},
        {id: "f020", name: "Il Martello del Titano", bonusText: "+3% Danni in Arena e Sconto 2% Mercato", epic: true, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.03}, {"type": "marketDiscount", "value": 0.02}], price: {"gold": 111, "wood": 35, "stone": 30}, img: "assets/ui/rifugio/furniture/set02/10.png"},
      ],
    },
    {
      id: "set03", num: 3, name: "Lo Studio dell'Alchimista",
      biomeIdx: 6, fallbackIcon: "⚗️",
      setBonusDesc: "+20% Monete d'oro da ogni attività",
      setBonusEffects: [{"type": "goldMult", "value": 0.2}],
      items: [
        {id: "f021", name: "Tappeto Mandala Elementale", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 23, "wood": 7, "stone": 6}, img: "assets/ui/rifugio/furniture/set03/01.png"},
        {id: "f022", name: "Lampadario a Cristalli Fluttuanti", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 26, "wood": 8, "stone": 7}, img: "assets/ui/rifugio/furniture/set03/02.png"},
        {id: "f023", name: "Scrivania con Alambicchi", bonusText: "+2% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.02}], price: {"gold": 29, "wood": 9, "stone": 8}, img: "assets/ui/rifugio/furniture/set03/03.png"},
        {id: "f024", name: "Poltrona da Lettura in Velluto", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 32, "wood": 10, "stone": 9}, img: "assets/ui/rifugio/furniture/set03/04.png"},
        {id: "f025", name: "Arazzo delle Formule", bonusText: "+1% XP Corsa", epic: false, wall: true, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 35, "wood": 16, "stone": 21}, img: "assets/ui/rifugio/furniture/set03/05.png"},
        {id: "f026", name: "Libreria di Pergamene", bonusText: "+1% XP Corsa", epic: false, wall: true, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 38, "wood": 17, "stone": 23}, img: "assets/ui/rifugio/furniture/set03/06.png"},
        {id: "f027", name: "Sfera del Drago in Vetro", bonusText: "+2% Probabilità drop Progetti rari", epic: false, wall: false, effects: [{"type": "dropProjectChance", "value": 0.02}], price: {"gold": 41, "wood": 13, "stone": 11}, img: "assets/ui/rifugio/furniture/set03/07.png"},
        {id: "f028", name: "Calderone Ribollente", bonusText: "+2% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.02}], price: {"gold": 44, "wood": 14, "stone": 12}, img: "assets/ui/rifugio/furniture/set03/08.png"},
        {id: "f029", name: "Cassaforte Incantata", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 47, "wood": 15, "stone": 13}, img: "assets/ui/rifugio/furniture/set03/09.png"},
        {id: "f030", name: "La Pietra Filosofale", bonusText: "+4% Monete", epic: true, wall: false, effects: [{"type": "goldMult", "value": 0.04}], price: {"gold": 150, "wood": 48, "stone": 41}, img: "assets/ui/rifugio/furniture/set03/10.png"},
      ],
    },
    {
      id: "set04", num: 4, name: "Il Giardino Sussurrante",
      biomeIdx: 1, fallbackIcon: "🌲",
      setBonusDesc: "+15% XP base da tutta la Corsa",
      setBonusEffects: [{"type": "xpMult", "activity": "corsa", "value": 0.15}],
      items: [
        {id: "f031", name: "Prato in Miniatura (Pavimento)", bonusText: "+0.5% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.005}], price: {"gold": 29, "wood": 9, "stone": 8}, img: "assets/ui/rifugio/furniture/set04/01.png"},
        {id: "f032", name: "Lucciole in Barattolo (Luce)", bonusText: "+1% Legna trovata", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.01}], price: {"gold": 33, "wood": 10, "stone": 9}, img: "assets/ui/rifugio/furniture/set04/02.png"},
        {id: "f033", name: "Tronco Intagliato a Tavola", bonusText: "+0.5% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.005}], price: {"gold": 37, "wood": 12, "stone": 10}, img: "assets/ui/rifugio/furniture/set04/03.png"},
        {id: "f034", name: "Trono di Liane e Foglie", bonusText: "+1% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 41, "wood": 13, "stone": 11}, img: "assets/ui/rifugio/furniture/set04/04.png"},
        {id: "f035", name: "Rampicante Luminoso", bonusText: "+1% Legna trovata", epic: false, wall: true, effects: [{"type": "woodMult", "value": 0.01}], price: {"gold": 44, "wood": 20, "stone": 26}, img: "assets/ui/rifugio/furniture/set04/05.png"},
        {id: "f036", name: "Finestra Illusoria sulla Foresta", bonusText: "+1% XP Camminata", epic: false, wall: true, effects: [{"type": "xpMult", "activity": "camminata", "value": 0.01}], price: {"gold": 48, "wood": 22, "stone": 28}, img: "assets/ui/rifugio/furniture/set04/06.png"},
        {id: "f037", name: "Bonsai dell'Albero Madre", bonusText: "+1% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 52, "wood": 17, "stone": 14}, img: "assets/ui/rifugio/furniture/set04/07.png"},
        {id: "f038", name: "Pressa per Fiori Antichi", bonusText: "+1% Probabilità drop Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 56, "wood": 18, "stone": 15}, img: "assets/ui/rifugio/furniture/set04/08.png"},
        {id: "f039", name: "Cesto in Vimini Magico", bonusText: "+1% Legna trovata", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.01}], price: {"gold": 59, "wood": 19, "stone": 16}, img: "assets/ui/rifugio/furniture/set04/09.png"},
        {id: "f040", name: "La Gemma Seme di Yggdrasil", bonusText: "+3% XP Corsa", epic: true, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.03}], price: {"gold": 189, "wood": 60, "stone": 52}, img: "assets/ui/rifugio/furniture/set04/10.png"},
      ],
    },
    {
      id: "set05", num: 5, name: "L'Avamposto Glaciale",
      biomeIdx: 12, fallbackIcon: "🏔️",
      setBonusDesc: "+15% XP base da tutta la Cyclette/Ciclismo",
      setBonusEffects: [{"type": "xpMult", "activity": "cyclette", "value": 0.15}],
      items: [
        {id: "f041", name: "Tappeto in Pelle di Yeti", bonusText: "+0.5% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.005}], price: {"gold": 35, "wood": 11, "stone": 10}, img: "assets/ui/rifugio/furniture/set05/01.png"},
        {id: "f042", name: "Cristallo di Ghiaccio Illuminescente", bonusText: "+1% Pietra trovata", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 40, "wood": 13, "stone": 11}, img: "assets/ui/rifugio/furniture/set05/02.png"},
        {id: "f043", name: "Tavolo in Ghiaccio Perenne", bonusText: "+0.5% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.005}], price: {"gold": 44, "wood": 14, "stone": 12}, img: "assets/ui/rifugio/furniture/set05/03.png"},
        {id: "f044", name: "Seduta in Blocco di Neve", bonusText: "+1% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.01}], price: {"gold": 49, "wood": 16, "stone": 13}, img: "assets/ui/rifugio/furniture/set05/04.png"},
        {id: "f045", name: "Sciabole Incrociate", bonusText: "+1% Danni Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 54, "wood": 24, "stone": 32}, img: "assets/ui/rifugio/furniture/set05/05.png"},
        {id: "f046", name: "Trofeo Corna di Mammut", bonusText: "+2% HP in Arena", epic: false, wall: true, effects: [{"type": "arenaHpMult", "value": 0.02}], price: {"gold": 58, "wood": 26, "stone": 34}, img: "assets/ui/rifugio/furniture/set05/06.png"},
        {id: "f047", name: "Statua del Pinguino Guerriero", bonusText: "+1% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.01}], price: {"gold": 63, "wood": 20, "stone": 17}, img: "assets/ui/rifugio/furniture/set05/07.png"},
        {id: "f048", name: "Fornello da Campo Invernale", bonusText: "+1 Stamina massima", epic: false, wall: false, effects: [{"type": "staminaMax", "value": 1.0}], price: {"gold": 67, "wood": 21, "stone": 18}, img: "assets/ui/rifugio/furniture/set05/08.png"},
        {id: "f049", name: "Forziere Congelato", bonusText: "+1% Monete trovate", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 72, "wood": 23, "stone": 20}, img: "assets/ui/rifugio/furniture/set05/09.png"},
        {id: "f050", name: "Il Cuore di Ghiaccio", bonusText: "+3% XP Cyclette", epic: true, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.03}], price: {"gold": 229, "wood": 73, "stone": 62}, img: "assets/ui/rifugio/furniture/set05/10.png"},
      ],
    },
    {
      id: "set06", num: 6, name: "La Cripta dell'Orologiaio",
      biomeIdx: 7, fallbackIcon: "🕰️",
      setBonusDesc: "+10% a tutti gli XP (Bonus Globale)",
      setBonusEffects: [{"type": "xpMult", "activity": "global", "value": 0.1}],
      items: [
        {id: "f051", name: "Pavimento a Scacchiera Meccanica", bonusText: "+0.5% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.005}], price: {"gold": 41, "wood": 13, "stone": 11}, img: "assets/ui/rifugio/furniture/set06/01.png"},
        {id: "f052", name: "Lampada a Pendolo", bonusText: "+0.5% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.005}], price: {"gold": 47, "wood": 15, "stone": 13}, img: "assets/ui/rifugio/furniture/set06/02.png"},
        {id: "f053", name: "Banco dei Meccanismi Minuti", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 52, "wood": 17, "stone": 14}, img: "assets/ui/rifugio/furniture/set06/03.png"},
        {id: "f054", name: "Sgabello a Molla", bonusText: "+0.5% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.005}], price: {"gold": 57, "wood": 18, "stone": 16}, img: "assets/ui/rifugio/furniture/set06/04.png"},
        {id: "f055", name: "Orologio a Ingranaggi a Vista", bonusText: "Riduce i tempi di attesa dell'1%", epic: false, wall: true, effects: [{"type": "marketDiscount", "value": 0.01}], price: {"gold": 63, "wood": 28, "stone": 37}, img: "assets/ui/rifugio/furniture/set06/05.png"},
        {id: "f056", name: "Calendario Perpetuo", bonusText: "+1% XP Globale", epic: false, wall: true, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 68, "wood": 31, "stone": 40}, img: "assets/ui/rifugio/furniture/set06/06.png"},
        {id: "f057", name: "Automa Meccanico (Animato)", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 73, "wood": 23, "stone": 20}, img: "assets/ui/rifugio/furniture/set06/07.png"},
        {id: "f058", name: "Macchina del Moto Perpetuo", bonusText: "+2% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.02}], price: {"gold": 79, "wood": 25, "stone": 21}, img: "assets/ui/rifugio/furniture/set06/08.png"},
        {id: "f059", name: "Cassetta degli Attrezzi in Rame", bonusText: "+1% Pietra e Legna", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.01}, {"type": "woodMult", "value": 0.01}], price: {"gold": 84, "wood": 27, "stone": 23}, img: "assets/ui/rifugio/furniture/set06/09.png"},
        {id: "f060", name: "La Clessidra dell'Eternità", bonusText: "+3% XP Globale", epic: true, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.03}], price: {"gold": 268, "wood": 85, "stone": 73}, img: "assets/ui/rifugio/furniture/set06/10.png"},
      ],
    },
    {
      id: "set07", num: 7, name: "Il Covo delle Ombre",
      biomeIdx: 10, fallbackIcon: "🐀",
      setBonusDesc: "+25% Danni Critici in Arena",
      setBonusEffects: [{"type": "arenaCritDmgMult", "value": 0.25}],
      items: [
        {id: "f061", name: "Tappeto Consunto", bonusText: "+1% Probabilità Critico (Arena)", epic: false, wall: false, effects: [{"type": "arenaCritChance", "value": 0.01}], price: {"gold": 47, "wood": 15, "stone": 13}, img: "assets/ui/rifugio/furniture/set07/01.png"},
        {id: "f062", name: "Candele Gocciolanti", bonusText: "+1% Danni Critici", epic: false, wall: false, effects: [{"type": "arenaCritDmgMult", "value": 0.01}], price: {"gold": 53, "wood": 17, "stone": 15}, img: "assets/ui/rifugio/furniture/set07/02.png"},
        {id: "f063", name: "Tavolo dei Piani Segreti", bonusText: "+2% Danni Critici", epic: false, wall: false, effects: [{"type": "arenaCritDmgMult", "value": 0.02}], price: {"gold": 60, "wood": 19, "stone": 16}, img: "assets/ui/rifugio/furniture/set07/03.png"},
        {id: "f064", name: "Poltrona Nascosta nell'Ombra", bonusText: "+1% Probabilità Critico", epic: false, wall: false, effects: [{"type": "arenaCritChance", "value": 0.01}], price: {"gold": 66, "wood": 21, "stone": 18}, img: "assets/ui/rifugio/furniture/set07/04.png"},
        {id: "f065", name: "Mappa dei Sotterranei", bonusText: "+1% Probabilità doppio drop", epic: false, wall: true, effects: [{"type": "doubleDropChance", "value": 0.01}], price: {"gold": 72, "wood": 33, "stone": 42}, img: "assets/ui/rifugio/furniture/set07/05.png"},
        {id: "f066", name: "Collezione di Pugnali", bonusText: "+2% Danni Critici", epic: false, wall: true, effects: [{"type": "arenaCritDmgMult", "value": 0.02}], price: {"gold": 78, "wood": 35, "stone": 46}, img: "assets/ui/rifugio/furniture/set07/06.png"},
        {id: "f067", name: "Gargoyle da Interno", bonusText: "+1% HP Arena", epic: false, wall: false, effects: [{"type": "arenaHpMult", "value": 0.01}], price: {"gold": 84, "wood": 27, "stone": 23}, img: "assets/ui/rifugio/furniture/set07/07.png"},
        {id: "f068", name: "Kit da Scasso", bonusText: "+1% Probabilità Monete bonus", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 90, "wood": 29, "stone": 25}, img: "assets/ui/rifugio/furniture/set07/08.png"},
        {id: "f069", name: "Barile Contrabbandato (Forziere)", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 96, "wood": 31, "stone": 26}, img: "assets/ui/rifugio/furniture/set07/09.png"},
        {id: "f070", name: "Il Mantello dell'Invisibilità Esposto", bonusText: "+5% Danni Critici", epic: true, wall: false, effects: [{"type": "arenaCritDmgMult", "value": 0.05}], price: {"gold": 307, "wood": 98, "stone": 84}, img: "assets/ui/rifugio/furniture/set07/10.png"},
      ],
    },
    {
      id: "set08", num: 8, name: "La Tenda del Nomade",
      biomeIdx: 13, fallbackIcon: "🏜️",
      setBonusDesc: "Raddoppia la Stamina o gli invii di Incursioni giornaliere",
      setBonusEffects: [{"type": "flag", "key": "doubleStamina"}],
      items: [
        {id: "f071", name: "Tappeto Persiano Fluttuante", bonusText: "+1 Stamina", epic: false, wall: false, effects: [{"type": "staminaMax", "value": 1.0}], price: {"gold": 53, "wood": 17, "stone": 15}, img: null},
        {id: "f072", name: "Lanterna ad Olio del Genio", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 60, "wood": 19, "stone": 16}, img: null},
        {id: "f073", name: "Tavolino Basso in Ottone", bonusText: "+1% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 67, "wood": 21, "stone": 18}, img: null},
        {id: "f074", name: "Cuscino in Seta (Seduta)", bonusText: "+1 Stamina", epic: false, wall: false, effects: [{"type": "staminaMax", "value": 1.0}], price: {"gold": 74, "wood": 24, "stone": 20}, img: null},
        {id: "f075", name: "Scimitarre Decorate", bonusText: "+1% Danni Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 81, "wood": 37, "stone": 48}, img: null},
        {id: "f076", name: "Arazzo delle Dune", bonusText: "+1% XP Camminata", epic: false, wall: true, effects: [{"type": "xpMult", "activity": "camminata", "value": 0.01}], price: {"gold": 88, "wood": 40, "stone": 52}, img: null},
        {id: "f077", name: "Oasi in Vaso", bonusText: "+1 Stamina", epic: false, wall: false, effects: [{"type": "staminaMax", "value": 1.0}], price: {"gold": 95, "wood": 30, "stone": 26}, img: null},
        {id: "f078", name: "Telaio da Tessitore", bonusText: "+1% Probabilità drop Progetti", epic: false, wall: false, effects: [{"type": "dropProjectChance", "value": 0.01}], price: {"gold": 102, "wood": 32, "stone": 28}, img: null},
        {id: "f079", name: "Cesta di Spezie", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 109, "wood": 35, "stone": 30}, img: null},
        {id: "f080", name: "L'Occhio del Ciclone di Sabbia", bonusText: "+3 Stamina", epic: true, wall: false, effects: [{"type": "staminaMax", "value": 3.0}], price: {"gold": 347, "wood": 110, "stone": 95}, img: null},
      ],
    },
    {
      id: "set09", num: 9, name: "Il Santuario di Cristallo",
      biomeIdx: 19, fallbackIcon: "🔮",
      setBonusDesc: "+15% Probabilità di trovare Progetti e Oggetti rari",
      setBonusEffects: [{"type": "dropRareChance", "value": 0.15}, {"type": "dropProjectChance", "value": 0.15}],
      items: [
        {id: "f081", name: "Pavimento in Ossidiana Riflettente", bonusText: "+1% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 59, "wood": 19, "stone": 16}, img: "assets/ui/rifugio/furniture/set09/01.png"},
        {id: "f082", name: "Prisma Centrale Illuminescente", bonusText: "+1% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 67, "wood": 21, "stone": 18}, img: "assets/ui/rifugio/furniture/set09/02.png"},
        {id: "f083", name: "Altare di Quarzo", bonusText: "+2% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.02}], price: {"gold": 75, "wood": 24, "stone": 20}, img: "assets/ui/rifugio/furniture/set09/03.png"},
        {id: "f084", name: "Trono Levitatore di Cristallo", bonusText: "+1% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 83, "wood": 26, "stone": 23}, img: "assets/ui/rifugio/furniture/set09/04.png"},
        {id: "f085", name: "Mosaico di Vetro Magico", bonusText: "+1% Drop Rari", epic: false, wall: true, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 90, "wood": 41, "stone": 53}, img: "assets/ui/rifugio/furniture/set09/05.png"},
        {id: "f086", name: "Specchio delle Dimensioni", bonusText: "+1% Drop Rari", epic: false, wall: true, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 98, "wood": 45, "stone": 58}, img: "assets/ui/rifugio/furniture/set09/06.png"},
        {id: "f087", name: "Geode Gigante Aperto", bonusText: "+2% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.02}], price: {"gold": 106, "wood": 34, "stone": 29}, img: "assets/ui/rifugio/furniture/set09/07.png"},
        {id: "f088", name: "Taglierina per Gemme", bonusText: "+1% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 113, "wood": 36, "stone": 31}, img: "assets/ui/rifugio/furniture/set09/08.png"},
        {id: "f089", name: "Cassetta di Sicurezza in Diamante", bonusText: "+2% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.02}], price: {"gold": 121, "wood": 39, "stone": 33}, img: "assets/ui/rifugio/furniture/set09/09.png"},
        {id: "f090", name: "La Corona del Re di Cristallo", bonusText: "+4% Drop Rari", epic: true, wall: false, effects: [{"type": "dropRareChance", "value": 0.04}], price: {"gold": 386, "wood": 123, "stone": 105}, img: "assets/ui/rifugio/furniture/set09/10.png"},
      ],
    },
    {
      id: "set10", num: 10, name: "La Sala del Corruttore",
      biomeIdx: 17, fallbackIcon: "👑",
      setBonusDesc: "+20% Danni a tutti i Boss e badge visivo permanente",
      setBonusEffects: [{"type": "bossDmgMult", "value": 0.2}, {"type": "flag", "key": "corruptorBadge"}],
      items: [
        {id: "f091", name: "Tappeto di Fiamme Oscure", bonusText: "+1% Danni Boss", epic: false, wall: false, effects: [{"type": "bossDmgMult", "value": 0.01}], price: {"gold": 65, "wood": 21, "stone": 18}, img: "assets/ui/rifugio/furniture/set10/01.png"},
        {id: "f092", name: "Braciere dell'Anima", bonusText: "+1% Danni Boss", epic: false, wall: false, effects: [{"type": "bossDmgMult", "value": 0.01}], price: {"gold": 74, "wood": 24, "stone": 20}, img: "assets/ui/rifugio/furniture/set10/02.png"},
        {id: "f093", name: "Tavolo delle Tattiche Demoniache", bonusText: "+2% Danni Boss", epic: false, wall: false, effects: [{"type": "bossDmgMult", "value": 0.02}], price: {"gold": 82, "wood": 26, "stone": 22}, img: "assets/ui/rifugio/furniture/set10/03.png"},
        {id: "f094", name: "Il Trono del Corruttore Sconfitto", bonusText: "+2% Danni Boss", epic: false, wall: false, effects: [{"type": "bossDmgMult", "value": 0.02}], price: {"gold": 91, "wood": 29, "stone": 25}, img: "assets/ui/rifugio/furniture/set10/04.png"},
        {id: "f095", name: "Catene Spezzate", bonusText: "+1% Danni Boss", epic: false, wall: true, effects: [{"type": "bossDmgMult", "value": 0.01}], price: {"gold": 99, "wood": 45, "stone": 59}, img: "assets/ui/rifugio/furniture/set10/05.png"},
        {id: "f096", name: "Vessillo della Vittoria Oscura", bonusText: "+1% Danni Boss", epic: false, wall: true, effects: [{"type": "bossDmgMult", "value": 0.01}], price: {"gold": 108, "wood": 49, "stone": 64}, img: "assets/ui/rifugio/furniture/set10/06.png"},
        {id: "f097", name: "Teschio del Drago d'Ombra", bonusText: "+2% Danni Boss", epic: false, wall: false, effects: [{"type": "bossDmgMult", "value": 0.02}], price: {"gold": 117, "wood": 37, "stone": 32}, img: "assets/ui/rifugio/furniture/set10/07.png"},
        {id: "f098", name: "Fucina del Vuoto", bonusText: "+1% Danni Boss", epic: false, wall: false, effects: [{"type": "bossDmgMult", "value": 0.01}], price: {"gold": 125, "wood": 40, "stone": 34}, img: "assets/ui/rifugio/furniture/set10/08.png"},
        {id: "f099", name: "Forziere del Titano Caduto", bonusText: "+2% Danni Boss", epic: false, wall: false, effects: [{"type": "bossDmgMult", "value": 0.02}], price: {"gold": 134, "wood": 42, "stone": 36}, img: "assets/ui/rifugio/furniture/set10/09.png"},
        {id: "f100", name: "Il Cuore Pulsante dell'Oscurità Purificata", bonusText: "+5% Danni Boss e +5% XP Globale", epic: true, wall: false, effects: [{"type": "bossDmgMult", "value": 0.05}, {"type": "xpMult", "activity": "global", "value": 0.05}], price: {"gold": 425, "wood": 135, "stone": 116}, img: "assets/ui/rifugio/furniture/set10/10.png"},
      ],
    },
    {
      id: "set11", num: 11, name: "La Palude Nebbiosa",
      biomeIdx: 14, fallbackIcon: "🌫️",
      setBonusDesc: "+20% Legna raccolta durante le Camminate",
      setBonusEffects: [{"type": "woodMult", "value": 0.2}],
      items: [
        {id: "f101", name: "Stuoia di Giunchi Intrecciati", bonusText: "+0.5% Legna", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.005}], price: {"gold": 72, "wood": 23, "stone": 20}, img: "assets/ui/rifugio/furniture/set11/01.png"},
        {id: "f102", name: "Lanterna con Fuoco Fatuo", bonusText: "+1% Legna", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.01}], price: {"gold": 81, "wood": 26, "stone": 22}, img: "assets/ui/rifugio/furniture/set11/02.png"},
        {id: "f103", name: "Tavolo in Legno Marcescente", bonusText: "+0.5% Legna", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.005}], price: {"gold": 90, "wood": 29, "stone": 25}, img: "assets/ui/rifugio/furniture/set11/03.png"},
        {id: "f104", name: "Sedia di Radici Contorte", bonusText: "+0.5% Legna", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.005}], price: {"gold": 99, "wood": 32, "stone": 27}, img: "assets/ui/rifugio/furniture/set11/04.png"},
        {id: "f105", name: "Teschio di Coccodrillo", bonusText: "+1% Danni in Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 109, "wood": 49, "stone": 64}, img: "assets/ui/rifugio/furniture/set11/05.png"},
        {id: "f106", name: "Mappa delle Acque Morte", bonusText: "+1% Probabilità Progetti", epic: false, wall: true, effects: [{"type": "dropProjectChance", "value": 0.01}], price: {"gold": 118, "wood": 54, "stone": 70}, img: "assets/ui/rifugio/furniture/set11/06.png"},
        {id: "f107", name: "Statuina del Rospo Guardiano", bonusText: "+1% Legna", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.01}], price: {"gold": 127, "wood": 40, "stone": 35}, img: "assets/ui/rifugio/furniture/set11/07.png"},
        {id: "f108", name: "Pestello da Strega", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 137, "wood": 43, "stone": 37}, img: "assets/ui/rifugio/furniture/set11/08.png"},
        {id: "f109", name: "Cassa Coperta di Muschio", bonusText: "+1% Legna", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.01}], price: {"gold": 146, "wood": 46, "stone": 40}, img: "assets/ui/rifugio/furniture/set11/09.png"},
        {id: "f110", name: "Il Fiore di Loto Luminescente", bonusText: "+3% Legna e +1% XP", epic: true, wall: false, effects: [{"type": "woodMult", "value": 0.03}, {"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 465, "wood": 148, "stone": 127}, img: "assets/ui/rifugio/furniture/set11/10.png"},
      ],
    },
    {
      id: "set12", num: 12, name: "Le Pianure del Vento",
      biomeIdx: 3, fallbackIcon: "🌬️",
      setBonusDesc: "+15% XP base da tutta la Corsa",
      setBonusEffects: [{"type": "xpMult", "activity": "corsa", "value": 0.15}],
      items: [
        {id: "f111", name: "Tappeto di Erba Soffice", bonusText: "+0.5% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.005}], price: {"gold": 78, "wood": 25, "stone": 21}, img: "assets/ui/rifugio/furniture/set12/01.png"},
        {id: "f112", name: "Rintocco di Vento (Lampada)", bonusText: "+0.5% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.005}], price: {"gold": 88, "wood": 28, "stone": 24}, img: "assets/ui/rifugio/furniture/set12/02.png"},
        {id: "f113", name: "Tavolino ad Aquilone", bonusText: "+1% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 98, "wood": 31, "stone": 27}, img: "assets/ui/rifugio/furniture/set12/03.png"},
        {id: "f114", name: "Sgabello Aerodinamico", bonusText: "+0.5% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.005}], price: {"gold": 108, "wood": 34, "stone": 29}, img: "assets/ui/rifugio/furniture/set12/04.png"},
        {id: "f115", name: "Piume Giganti Intrecciate", bonusText: "+1% Velocità (Bonus XP)", epic: false, wall: true, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 118, "wood": 54, "stone": 70}, img: "assets/ui/rifugio/furniture/set12/05.png"},
        {id: "f116", name: "Mappa delle Correnti", bonusText: "+1% Probabilità Drop Rari", epic: false, wall: true, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 128, "wood": 58, "stone": 76}, img: "assets/ui/rifugio/furniture/set12/06.png"},
        {id: "f117", name: "Statua del Falco Pellegrino", bonusText: "+1% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 138, "wood": 44, "stone": 38}, img: "assets/ui/rifugio/furniture/set12/07.png"},
        {id: "f118", name: "Mulino a Vento in Miniatura", bonusText: "+2% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.02}], price: {"gold": 148, "wood": 47, "stone": 40}, img: "assets/ui/rifugio/furniture/set12/08.png"},
        {id: "f119", name: "Cassa di Legno Leggero", bonusText: "+1% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 158, "wood": 50, "stone": 43}, img: "assets/ui/rifugio/furniture/set12/09.png"},
        {id: "f120", name: "Il Tornado in Bottiglia", bonusText: "+3% XP Corsa", epic: true, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.03}], price: {"gold": 504, "wood": 160, "stone": 137}, img: "assets/ui/rifugio/furniture/set12/10.png"},
      ],
    },
    {
      id: "set13", num: 13, name: "La Costa dei Relitti",
      biomeIdx: 11, fallbackIcon: "⚓",
      setBonusDesc: "Probabilità Forzieri Monete doppi +25%",
      setBonusEffects: [{"type": "doubleDropChance", "value": 0.25}],
      items: [
        {id: "f121", name: "Rete da Pesca (Tappeto)", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 84, "wood": 27, "stone": 23}, img: "assets/ui/rifugio/furniture/set13/01.png"},
        {id: "f122", name: "Lanterna da Nave Antica", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 94, "wood": 30, "stone": 26}, img: "assets/ui/rifugio/furniture/set13/02.png"},
        {id: "f123", name: "Tavolo fatto con un Timone", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 105, "wood": 34, "stone": 29}, img: "assets/ui/rifugio/furniture/set13/03.png"},
        {id: "f124", name: "Barile di Rum (Seduta)", bonusText: "+0.5% XP Camminata", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "camminata", "value": 0.005}], price: {"gold": 116, "wood": 37, "stone": 32}, img: "assets/ui/rifugio/furniture/set13/04.png"},
        {id: "f125", name: "Ancora Arrugginita", bonusText: "+1% Danni Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 127, "wood": 58, "stone": 75}, img: "assets/ui/rifugio/furniture/set13/05.png"},
        {id: "f126", name: "Mappa del Tesoro Strappata", bonusText: "+2% Monete", epic: false, wall: true, effects: [{"type": "goldMult", "value": 0.02}], price: {"gold": 138, "wood": 63, "stone": 82}, img: "assets/ui/rifugio/furniture/set13/06.png"},
        {id: "f127", name: "Polena a Sirena (Statua)", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 149, "wood": 47, "stone": 41}, img: "assets/ui/rifugio/furniture/set13/07.png"},
        {id: "f128", name: "Bussola Impazzita", bonusText: "+1% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 160, "wood": 51, "stone": 44}, img: "assets/ui/rifugio/furniture/set13/08.png"},
        {id: "f129", name: "Baule del Pirata (Forziere)", bonusText: "+2% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.02}], price: {"gold": 171, "wood": 54, "stone": 47}, img: "assets/ui/rifugio/furniture/set13/09.png"},
        {id: "f130", name: "La Perla Nera Maledetta", bonusText: "+5% Monete", epic: true, wall: false, effects: [{"type": "goldMult", "value": 0.05}], price: {"gold": 543, "wood": 173, "stone": 148}, img: "assets/ui/rifugio/furniture/set13/10.png"},
      ],
    },
    {
      id: "set14", num: 14, name: "Le Miniere Profonde",
      biomeIdx: 16, fallbackIcon: "⛏️",
      setBonusDesc: "+20% Pietra raccolta in tutte le attività",
      setBonusEffects: [{"type": "stoneMult", "value": 0.2}],
      items: [
        {id: "f131", name: "Pavimentazione a Binari", bonusText: "+0.5% Pietra", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.005}], price: {"gold": 90, "wood": 29, "stone": 24}, img: "assets/ui/rifugio/furniture/set14/01.png"},
        {id: "f132", name: "Caschetto con Candela (Luce)", bonusText: "+1% Pietra", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 101, "wood": 32, "stone": 28}, img: "assets/ui/rifugio/furniture/set14/02.png"},
        {id: "f133", name: "Vagonetto Rovesciato (Tavolo)", bonusText: "+1% Pietra", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 113, "wood": 36, "stone": 31}, img: "assets/ui/rifugio/furniture/set14/03.png"},
        {id: "f134", name: "Blocco di Grafite (Sedia)", bonusText: "+0.5% Pietra", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.005}], price: {"gold": 125, "wood": 40, "stone": 34}, img: "assets/ui/rifugio/furniture/set14/04.png"},
        {id: "f135", name: "Picconi Incrociati", bonusText: "+1% Danni Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 136, "wood": 62, "stone": 81}, img: "assets/ui/rifugio/furniture/set14/05.png"},
        {id: "f136", name: "Mappa dei Giacimenti", bonusText: "+1% Drop Progetti", epic: false, wall: true, effects: [{"type": "dropProjectChance", "value": 0.01}], price: {"gold": 148, "wood": 67, "stone": 87}, img: "assets/ui/rifugio/furniture/set14/06.png"},
        {id: "f137", name: "Statuina della Talpa Cieca", bonusText: "+1% Pietra", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 160, "wood": 51, "stone": 44}, img: "assets/ui/rifugio/furniture/set14/07.png"},
        {id: "f138", name: "Detonatore a Stantuffo", bonusText: "+1% Danni Critici", epic: false, wall: false, effects: [{"type": "arenaCritDmgMult", "value": 0.01}], price: {"gold": 171, "wood": 54, "stone": 47}, img: "assets/ui/rifugio/furniture/set14/08.png"},
        {id: "f139", name: "Cassa Rinforzata in Acciaio", bonusText: "+1% Pietra", epic: false, wall: false, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 183, "wood": 58, "stone": 50}, img: "assets/ui/rifugio/furniture/set14/09.png"},
        {id: "f140", name: "La Pepita d'Oro Puro", bonusText: "+3% Pietra e +2% Monete", epic: true, wall: false, effects: [{"type": "stoneMult", "value": 0.03}, {"type": "goldMult", "value": 0.02}], price: {"gold": 583, "wood": 185, "stone": 159}, img: "assets/ui/rifugio/furniture/set14/10.png"},
      ],
    },
    {
      id: "set15", num: 15, name: "La Selva dei Funghi Giganti",
      biomeIdx: 2, fallbackIcon: "🍄",
      setBonusDesc: "Rigenerazione in Arena (recupera 10% HP tra i round)",
      setBonusEffects: [{"type": "flag", "key": "arenaRegen", "value": 0.1}],
      items: [
        {id: "f141", name: "Tappeto di Spore Soffici", bonusText: "+1% HP Arena", epic: false, wall: false, effects: [{"type": "arenaHpMult", "value": 0.01}], price: {"gold": 96, "wood": 30, "stone": 26}, img: null},
        {id: "f142", name: "Cappello di Fungo Luminescente", bonusText: "+1% HP Arena", epic: false, wall: false, effects: [{"type": "arenaHpMult", "value": 0.01}], price: {"gold": 108, "wood": 34, "stone": 29}, img: null},
        {id: "f143", name: "Fetta di Fungo Porcino (Tavolo)", bonusText: "+1% XP Camminata", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "camminata", "value": 0.01}], price: {"gold": 121, "wood": 38, "stone": 33}, img: null},
        {id: "f144", name: "Fungo Velenoso (Sgabello)", bonusText: "+1% Danni Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 133, "wood": 42, "stone": 36}, img: null},
        {id: "f145", name: "Giardino Verticale di Micelio", bonusText: "+1% HP Arena", epic: false, wall: true, effects: [{"type": "arenaHpMult", "value": 0.01}], price: {"gold": 145, "wood": 66, "stone": 86}, img: null},
        {id: "f146", name: "Arazzo delle Spore", bonusText: "+1% Drop Progetti", epic: false, wall: true, effects: [{"type": "dropProjectChance", "value": 0.01}], price: {"gold": 158, "wood": 72, "stone": 93}, img: null},
        {id: "f147", name: "Miconide in Vaso (Creatura viva)", bonusText: "+2% HP Arena", epic: false, wall: false, effects: [{"type": "arenaHpMult", "value": 0.02}], price: {"gold": 170, "wood": 54, "stone": 46}, img: null},
        {id: "f148", name: "Mortaio per Unguenti", bonusText: "+1% HP Arena", epic: false, wall: false, effects: [{"type": "arenaHpMult", "value": 0.01}], price: {"gold": 183, "wood": 58, "stone": 50}, img: null},
        {id: "f149", name: "Cassa di Corteccia", bonusText: "+1% Legna", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.01}], price: {"gold": 195, "wood": 62, "stone": 53}, img: null},
        {id: "f150", name: "La Madre Spora", bonusText: "+5% HP Arena", epic: true, wall: false, effects: [{"type": "arenaHpMult", "value": 0.05}], price: {"gold": 622, "wood": 198, "stone": 170}, img: null},
      ],
    },
    {
      id: "set16", num: 16, name: "L'Arcipelago Fluttuante",
      biomeIdx: 8, fallbackIcon: "🏝️",
      setBonusDesc: "+15% XP base da tutta la Cyclette/Bici",
      setBonusEffects: [{"type": "xpMult", "activity": "cyclette", "value": 0.15}],
      items: [
        {id: "f151", name: "Pavimento a Soffice Nuvola", bonusText: "+0.5% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.005}], price: {"gold": 102, "wood": 32, "stone": 28}, img: null},
        {id: "f152", name: "Lanterna Acchiappa-Stelle", bonusText: "+1% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.01}], price: {"gold": 115, "wood": 37, "stone": 31}, img: null},
        {id: "f153", name: "Tavolo Levitante", bonusText: "+1% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.01}], price: {"gold": 128, "wood": 41, "stone": 35}, img: null},
        {id: "f154", name: "Cuscino d'Aria (Seduta)", bonusText: "+0.5% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.005}], price: {"gold": 141, "wood": 45, "stone": 39}, img: null},
        {id: "f155", name: "Ali d'Angelo di Pietra", bonusText: "+1% Danni Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 155, "wood": 70, "stone": 91}, img: null},
        {id: "f156", name: "Mappa Astrale", bonusText: "+2% Drop Rari", epic: false, wall: true, effects: [{"type": "dropRareChance", "value": 0.02}], price: {"gold": 168, "wood": 76, "stone": 99}, img: null},
        {id: "f157", name: "Statua del Pegaso Rampante", bonusText: "+1% XP Cyclette", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.01}], price: {"gold": 181, "wood": 58, "stone": 49}, img: null},
        {id: "f158", name: "Cannocchiale in Ottone", bonusText: "+1% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 194, "wood": 62, "stone": 53}, img: null},
        {id: "f159", name: "Forziere dei Cieli", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 208, "wood": 66, "stone": 57}, img: null},
        {id: "f160", name: "La Stella Caduta Prigioniera", bonusText: "+3% XP Cyclette", epic: true, wall: false, effects: [{"type": "xpMult", "activity": "cyclette", "value": 0.03}], price: {"gold": 661, "wood": 210, "stone": 180}, img: null},
      ],
    },
    {
      id: "set17", num: 17, name: "Il Cimitero dei Draghi",
      biomeIdx: 15, fallbackIcon: "🐉",
      setBonusDesc: "L'Eroe ottiene una \"Vita Extra\" in Arena",
      setBonusEffects: [{"type": "flag", "key": "arenaExtraLife"}],
      items: [
        {id: "f161", name: "Tappeto di Scaglie Pietrificate", bonusText: "+1% Difesa Arena", epic: false, wall: false, effects: [{"type": "arenaDefMult", "value": 0.01}], price: {"gold": 108, "wood": 34, "stone": 29}, img: "assets/ui/rifugio/furniture/set17/01.png"},
        {id: "f162", name: "Teschio di Drago Infiammato", bonusText: "+1% Danni Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 122, "wood": 39, "stone": 33}, img: "assets/ui/rifugio/furniture/set17/02.png"},
        {id: "f163", name: "Cassa Toracica Gigante (Tavolo)", bonusText: "+1% HP Arena", epic: false, wall: false, effects: [{"type": "arenaHpMult", "value": 0.01}], price: {"gold": 136, "wood": 43, "stone": 37}, img: "assets/ui/rifugio/furniture/set17/03.png"},
        {id: "f164", name: "Vertebra Antica (Sgabello)", bonusText: "+0.5% HP Arena", epic: false, wall: false, effects: [{"type": "arenaHpMult", "value": 0.005}], price: {"gold": 150, "wood": 48, "stone": 41}, img: "assets/ui/rifugio/furniture/set17/04.png"},
        {id: "f165", name: "Artiglio di Drago", bonusText: "+2% Danni Critici", epic: false, wall: true, effects: [{"type": "arenaCritDmgMult", "value": 0.02}], price: {"gold": 164, "wood": 74, "stone": 97}, img: "assets/ui/rifugio/furniture/set17/05.png"},
        {id: "f166", name: "Fossile Incastonato", bonusText: "+1% Pietra", epic: false, wall: true, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 178, "wood": 81, "stone": 105}, img: "assets/ui/rifugio/furniture/set17/06.png"},
        {id: "f167", name: "Cucciolo di Drago d'Ossa (Statua)", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 192, "wood": 61, "stone": 52}, img: "assets/ui/rifugio/furniture/set17/07.png"},
        {id: "f168", name: "Kit di Scavo del Paleontologo", bonusText: "+2% Drop Progetti", epic: false, wall: false, effects: [{"type": "dropProjectChance", "value": 0.02}], price: {"gold": 206, "wood": 66, "stone": 56}, img: "assets/ui/rifugio/furniture/set17/08.png"},
        {id: "f169", name: "Forziere d'Avorio", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 220, "wood": 70, "stone": 60}, img: "assets/ui/rifugio/furniture/set17/09.png"},
        {id: "f170", name: "L'Anima di Drago Cristallizzata", bonusText: "+4% Danni in Arena", epic: true, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.04}], price: {"gold": 701, "wood": 223, "stone": 191}, img: "assets/ui/rifugio/furniture/set17/10.png"},
      ],
    },
    {
      id: "set18", num: 18, name: "Il Vulcano Infernale",
      biomeIdx: 9, fallbackIcon: "🌋",
      setBonusDesc: "Furia del Magma (+15% Danni fissi in Arena)",
      setBonusEffects: [{"type": "arenaDmgMult", "value": 0.15}],
      items: [
        {id: "f171", name: "Pavimento in Cenere Compattata", bonusText: "+0.5% Danni Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.005}], price: {"gold": 114, "wood": 36, "stone": 31}, img: "assets/ui/rifugio/furniture/set18/01.png"},
        {id: "f172", name: "Fessura di Magma (Lampada)", bonusText: "+1% Danni Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 129, "wood": 41, "stone": 35}, img: "assets/ui/rifugio/furniture/set18/02.png"},
        {id: "f173", name: "Blocco di Basalto (Tavolo)", bonusText: "+1% Danni Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 143, "wood": 46, "stone": 39}, img: "assets/ui/rifugio/furniture/set18/03.png"},
        {id: "f174", name: "Seduta in Pietra Pomice", bonusText: "+0.5% Danni Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.005}], price: {"gold": 158, "wood": 50, "stone": 43}, img: "assets/ui/rifugio/furniture/set18/04.png"},
        {id: "f175", name: "Spadone di Ossidiana", bonusText: "+2% Danni Arena", epic: false, wall: true, effects: [{"type": "arenaDmgMult", "value": 0.02}], price: {"gold": 173, "wood": 79, "stone": 102}, img: "assets/ui/rifugio/furniture/set18/05.png"},
        {id: "f176", name: "Mappa delle Faglie", bonusText: "+1% Pietra", epic: false, wall: true, effects: [{"type": "stoneMult", "value": 0.01}], price: {"gold": 188, "wood": 85, "stone": 111}, img: "assets/ui/rifugio/furniture/set18/06.png"},
        {id: "f177", name: "Statua della Fenice", bonusText: "+1% XP Corsa", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "corsa", "value": 0.01}], price: {"gold": 203, "wood": 64, "stone": 55}, img: "assets/ui/rifugio/furniture/set18/07.png"},
        {id: "f178", name: "Mantice Gigante", bonusText: "+1% Danni Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.01}], price: {"gold": 217, "wood": 69, "stone": 59}, img: "assets/ui/rifugio/furniture/set18/08.png"},
        {id: "f179", name: "Forziere Forgiato nel Fuoco", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 232, "wood": 74, "stone": 63}, img: "assets/ui/rifugio/furniture/set18/09.png"},
        {id: "f180", name: "La Fiamma Eterna", bonusText: "+3% Danni Arena e +1% XP Globale", epic: true, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.03}, {"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 740, "wood": 235, "stone": 202}, img: "assets/ui/rifugio/furniture/set18/10.png"},
      ],
    },
    {
      id: "set19", num: 19, name: "La Cittadella dell'Eclissi",
      biomeIdx: 4, fallbackIcon: "🌒",
      setBonusDesc: "Dualità (+20% risorse bonus se allenamento post 18:00)",
      setBonusEffects: [{"type": "flag", "key": "dualityBonus", "value": 0.2}],
      items: [
        {id: "f181", name: "Tappeto del Crepuscolo", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 120, "wood": 38, "stone": 33}, img: null},
        {id: "f182", name: "Lampada Sole/Luna", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 135, "wood": 43, "stone": 37}, img: null},
        {id: "f183", name: "Tavolo dell'Equinozio", bonusText: "+1% Legna e Pietra", epic: false, wall: false, effects: [{"type": "woodMult", "value": 0.01}, {"type": "stoneMult", "value": 0.01}], price: {"gold": 151, "wood": 48, "stone": 41}, img: null},
        {id: "f184", name: "Sedia dell'Alba", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 167, "wood": 53, "stone": 45}, img: null},
        {id: "f185", name: "Scudo dell'Ombra", bonusText: "+1% Difesa Arena", epic: false, wall: true, effects: [{"type": "arenaDefMult", "value": 0.01}], price: {"gold": 182, "wood": 83, "stone": 108}, img: null},
        {id: "f186", name: "Astrolabio Gigante", bonusText: "+2% Drop Rari", epic: false, wall: true, effects: [{"type": "dropRareChance", "value": 0.02}], price: {"gold": 198, "wood": 90, "stone": 117}, img: null},
        {id: "f187", name: "Gargoyle Guardiano", bonusText: "+1% HP Arena", epic: false, wall: false, effects: [{"type": "arenaHpMult", "value": 0.01}], price: {"gold": 213, "wood": 68, "stone": 58}, img: null},
        {id: "f188", name: "Lente del Veggente", bonusText: "+1% Drop Progetti", epic: false, wall: false, effects: [{"type": "dropProjectChance", "value": 0.01}], price: {"gold": 229, "wood": 73, "stone": 62}, img: null},
        {id: "f189", name: "Cassa della Mezzanotte", bonusText: "+1% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.01}], price: {"gold": 245, "wood": 78, "stone": 67}, img: null},
        {id: "f190", name: "Il Medaglione dell'Eclissi Perfetta", bonusText: "+3% Drop Rari e +1 Stamina", epic: true, wall: false, effects: [{"type": "dropRareChance", "value": 0.03}, {"type": "staminaMax", "value": 1}], price: {"gold": 779, "wood": 248, "stone": 213}, img: null},
      ],
    },
    {
      id: "set20", num: 20, name: "Il Cuore del Vuoto",
      biomeIdx: 18, fallbackIcon: "🌑",
      setBonusDesc: "Ascensione (+20% a tutte le statistiche del gioco)",
      setBonusEffects: [{"type": "xpMult", "activity": "global", "value": 0.2}, {"type": "goldMult", "value": 0.2}, {"type": "woodMult", "value": 0.2}, {"type": "stoneMult", "value": 0.2}, {"type": "arenaDmgMult", "value": 0.2}],
      items: [
        {id: "f191", name: "Pavimento a Materia Oscura", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 126, "wood": 40, "stone": 34}, img: "assets/ui/rifugio/furniture/set20/01.png"},
        {id: "f192", name: "Lampada a Singolarità", bonusText: "+1% Drop Rari", epic: false, wall: false, effects: [{"type": "dropRareChance", "value": 0.01}], price: {"gold": 142, "wood": 45, "stone": 39}, img: "assets/ui/rifugio/furniture/set20/02.png"},
        {id: "f193", name: "Tavolo Anti-Gravità", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 159, "wood": 50, "stone": 43}, img: "assets/ui/rifugio/furniture/set20/03.png"},
        {id: "f194", name: "Sedia di Luce Solida", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 175, "wood": 56, "stone": 48}, img: "assets/ui/rifugio/furniture/set20/04.png"},
        {id: "f195", name: "Portale Dimensionale", bonusText: "Riduce costi Mercato del 2%", epic: false, wall: true, effects: [{"type": "marketDiscount", "value": 0.02}], price: {"gold": 191, "wood": 87, "stone": 113}, img: "assets/ui/rifugio/furniture/set20/05.png"},
        {id: "f196", name: "Mappa del Cosmo", bonusText: "+2% Drop Progetti", epic: false, wall: true, effects: [{"type": "dropProjectChance", "value": 0.02}], price: {"gold": 208, "wood": 94, "stone": 123}, img: "assets/ui/rifugio/furniture/set20/06.png"},
        {id: "f197", name: "Statua del Viaggiatore del Tempo", bonusText: "+1% XP Globale", epic: false, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.01}], price: {"gold": 224, "wood": 71, "stone": 61}, img: "assets/ui/rifugio/furniture/set20/07.png"},
        {id: "f198", name: "Distorsore Spazio-Temporale", bonusText: "+2% Danni in Arena", epic: false, wall: false, effects: [{"type": "arenaDmgMult", "value": 0.02}], price: {"gold": 241, "wood": 77, "stone": 66}, img: "assets/ui/rifugio/furniture/set20/08.png"},
        {id: "f199", name: "Forziere del Buco Nero", bonusText: "+2% Monete", epic: false, wall: false, effects: [{"type": "goldMult", "value": 0.02}], price: {"gold": 257, "wood": 82, "stone": 70}, img: "assets/ui/rifugio/furniture/set20/09.png"},
        {id: "f200", name: "Il Frammento della Genesi", bonusText: "+5% XP, +5% Danni, +5% Risorse", epic: true, wall: false, effects: [{"type": "xpMult", "activity": "global", "value": 0.05}, {"type": "arenaDmgMult", "value": 0.05}, {"type": "goldMult", "value": 0.05}, {"type": "woodMult", "value": 0.05}, {"type": "stoneMult", "value": 0.05}], price: {"gold": 819, "wood": 260, "stone": 223}, img: "assets/ui/rifugio/furniture/set20/10.png"},
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
      return `Risorse insufficienti (servono 🪙${p.gold} 🪵${p.wood} 🪨${p.stone}).`;
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

  return {
    ACTIVITIES, MISSIONS, CARDS, BUILDINGS, BESTIARY,
    BIOMES, MOUNTS, RARITIES, SLOTS,
    MAX_LEVEL, LEVEL_CAP_1, GOLD_PER_KM,
    xpForLevel, dailyGoalKm, heroTitle,
    currentBiome, accessibleZones, mountById, biomeSlug,
    newHero, migrateHero, load, save, deleteHero,
    logWorkout, availableMissions, startMission,
    canBuild, build, declareRestDay,
    weeklyEvent, claimEvent, buildingBonus, equipmentXpBonus,
    genItem, genItemFor, sellItem, sellValue, buyMount, forgeOffers, buyForgeItem,
    CLASS_TALENTS, talentOf, itemImg,
    BATTLE_MOVES, BATTLE_MAX_DAY, battleBeats, randomMove,
    battlesLeft, useBattle, pickVillain, battleReward,
    logHealthSync,
    equipItem, unequipSlot,
    dailyLogin, rolloverIncursion,
    PET_PERSONALITIES, PET_FOODS, PET_ACCESSORIES, PET_SPECIES,
    PHOENIX_POTION_PRICE, EXPEDITION_HOURS, WISH_WINDOW_MINUTES,
    createPet, petXpForLevel, petStage, tickPet, petArenaBonus, classArenaBonus,
    feedPet, playWithPet, cleanPet, sleepPet, curePet,
    buyAccessory, addPetXp,
    startExpedition, expeditionStatus, collectExpedition,
    packAuraActive,
    FURNITURE_SETS, furnitureSetById, furnitureSetOwnedCount, furnitureSetComplete,
    furnitureUnlockedSets, furnitureAggregate, buyFurniture,
  };
})();
