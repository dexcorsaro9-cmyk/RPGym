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
    if (isClass(hero, 'alchimista') && Math.random() < 0.10) {
      const avail = availableRarities(hero.level);
      const idx = avail.indexOf(item.rarity);
      if (idx >= 0 && idx < avail.length - 1) {
        item = genItem(hero.level, null, item.slot, avail[idx + 1]);
        item.distilled = true; // il tocco dell'Alchimista
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
    h.forgeSeen = h.forgeSeen || null;      // ultima data in cui ha visto la vetrina
    h.summarySeen = h.summarySeen || null;  // ultima data del riepilogo giornaliero
    h.eventNotified = h.eventNotified || null; // settimana della Taglia già notificata
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

    let xpMult = 1 + buildingBonus(hero, 'xpMult') + equipmentXpBonus(hero) / 100;
    let goldMult = 1 + buildingBonus(hero, 'goldMult');
    let resMult = 1 + buildingBonus(hero, 'resMult');
    // Talenti di classe
    if (isClass(hero, 'stregone')) xpMult += 0.10;
    if (isClass(hero, 'eroe1') && type !== 'cyclette') xpMult += 0.10;
    if (isClass(hero, 'furfante')) goldMult += 0.20;
    if (isClass(hero, 'eroe2')) resMult += 0.25;
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
      const item = genItemFor(hero, r.minRarity);
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
        price: Math.round(r.value * 2 * (isClass(hero, 'fabbro') ? 0.8 : 1)),
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
      const full = Math.round(r.value * 2 * (isClass(hero, 'fabbro') ? 0.8 : 1));
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
    genItem, genItemFor, sellItem, sellValue, buyMount, forgeOffers, buyForgeItem,
    CLASS_TALENTS, talentOf, itemImg,
    equipItem, unequipSlot,
    dailyLogin, rolloverIncursion,
  };
})();
