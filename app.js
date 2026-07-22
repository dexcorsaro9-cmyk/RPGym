/* ═══════════════════════════════════════════════════════════════
   RPGym — Interfaccia utente (v2.0)
   ═══════════════════════════════════════════════════════════════ */

let STATE = RPG.load();
let HERO = null;
let CURRENT_TAB = 'camp';

const $ = sel => document.querySelector(sel);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── Avatar dei protagonisti (creati con l'IA) ── */
const AVATARS = [
  { path: 'assets/avatars/eroe1.png',      storyId: 'eroe1',      label: 'Il Viandante' },
  { path: 'assets/avatars/eroe2.png',      storyId: 'eroe2',      label: 'La Viandante' },
  { path: 'assets/avatars/fabbro.png',     storyId: 'fabbro',     label: 'Il Fabbro' },
  { path: 'assets/avatars/stregone.png',   storyId: 'stregone',   label: 'Lo Stregone' },
  { path: 'assets/avatars/alchimista.png', storyId: 'alchimista', label: 'L\'Alchimista' },
  { path: 'assets/avatars/furfante.png',   storyId: 'furfante',   label: 'Il Furfante' },
  { path: 'assets/avatars/maga.png',       storyId: 'maga',       label: 'La Maga' },
  { path: 'assets/avatars/paladino.png',          storyId: 'paladino',         label: 'Il Paladino' },
  { path: 'assets/avatars/ranger.png',            storyId: 'ranger',           label: 'Il Ranger' },
  { path: 'assets/avatars/fata.png',              storyId: 'fata',             label: 'La Fata Elfica' },
  { path: 'assets/avatars/principe.png',          storyId: 'principe',         label: 'Il Principe delle Aquile' },
  { path: 'assets/avatars/principessa.png',       storyId: 'principessa',      label: 'La Principessa Farfallosa' },
  { path: 'assets/avatars/regina.png',            storyId: 'regina',           label: 'La Regina Oscura' },
];

/* ── Le storie dei protagonisti ── */
const STORIES = {
  eroe1: {
    title: 'Il Figlio del Falegname',
    text: `Sei nato a Oakhaven, tra il profumo di segatura della bottega di tuo padre,
il falegname più abile del borgo. Da lui hai imparato a leggere le venature del
legno come altri leggono i libri, e a intagliare piccoli animali che regalavi ai
bambini del mercato. Il bastone che stringi in viaggio è l'ultima cosa che avete
costruito insieme: sulla cima, un uccellino intagliato — il richiamo che usavate
per ritrovarvi nel bosco quando raccoglievate il legno.
La notte dell'attacco eri fuori le mura, a controllare le trappole per le lepri.
Hai visto il cielo diventare rosso e un'ombra alata coprire la luna. Quando sei
tornato, di casa tua restava solo il camino in piedi, e del villaggio un silenzio
che ancora ti sveglia di notte. Tra la cenere hai trovato il mantello rattoppato
di tuo padre e nessuna traccia della tua famiglia: nessun corpo, nessun addio.
È per questo che cammini, pedali e corri: ogni chilometro è una domanda, e da
qualche parte, oltre i biomi che ti separano dalla Vetta Oscura, c'è la risposta.
Il Cavaliere del Drago ti ha tolto tutto — ma ti ha lasciato le gambe per raggiungerlo.`,
  },
  eroe2: {
    title: 'La Figlia dell\'Erborista',
    text: `Sei cresciuta nell'ultima casa di Oakhaven, quella con il tetto coperto di
fiori, dove tua madre — l'erborista del borgo — curava chiunque bussasse, uomo o
bestia che fosse. Conosci il nome segreto di ogni pianta della Foresta Sussurrante
e sai distinguere un fungo amico da uno che "si offende", come diceva sempre lei.
Nella tua bisaccia di cuoio porti i suoi semi più rari: li pianti dove ti fermi,
perché il mondo rifiorisca dietro i tuoi passi.
La notte dell'attacco eri sulla collina a raccogliere erba lunare, che si coglie
solo col buio. Il boato ti gettò a terra; quando alzasti lo sguardo, un drago
antico oscurava le stelle e Oakhaven bruciava come una torcia. Di tua madre hai
ritrovato solo il mortaio di pietra, ancora caldo, e un biglietto infilato nella
tua sacca chissà quando: "Se tutto brucia, cammina. Le radici profonde non temono il fuoco."
Così fai. Ogni chilometro è un seme piantato, ogni missione un fiore strappato
all'Orda. E quando arriverai alla Vetta Oscura, il Cavaliere del Drago scoprirà
che niente è più pericoloso di chi sa far rinascere le cose.`,
  },
  fabbro: {
    title: 'Il Fabbro delle Fucine Perdute',
    text: `Per duecento anni la tua famiglia ha battuto il ferro nelle Fucine di Ruggine,
e il tuo martello — intagliato in un cuore di vulcano — è passato di padre in
figlio per sette generazioni. Dicevano che tu fossi il migliore: capace di
forgiare una lama così affilata da tagliare il fumo, e così paziente da
riparare la corona del re con gli occhi bendati, per scommessa.
Poi l'Orda è arrivata anche lì. Non hanno spento le fucine: le hanno CORROTTE.
I tuoi golem da lavoro, costruiti per aiutare, si sono rivoltati con gli occhi
pieni di una luce sbagliata. Hai combattuto con il martello ancora rovente,
ma un nano solo non ferma un esercito: sei uscito dalle gallerie con la barba
bruciacchiata, l'incudine da campo sulle spalle e una rabbia che pesa più di entrambe.
Ora percorri le strade del reame, e ogni chilometro è un colpo di martello sul
ferro del destino. Perché un giorno tornerai alle tue Fucine, e quel giorno il
Cavaliere del Drago imparerà la prima regola della bottega: chi rompe, paga.`,
  },
  stregone: {
    title: 'Lo Stregone del Grimorio Scontroso',
    text: `Eri l'apprendista più giovane — e più permaloso — della Torre dell'Alchimista.
Gli altri studenti memorizzavano incantesimi; tu discutevi con loro. Perfino il
tuo grimorio ha un caratteraccio: si chiama Grymoyre, si apre solo quando ne ha
voglia e sbuffa scintille viola quando sbagli la pronuncia di una formula.
Il tuo maestro diceva che il cappello troppo grande ti sarebbe andato bene
"quando la testa avesse raggiunto l'ambizione". Non ha fatto in tempo a vederlo:
la notte in cui il cielo si è riempito d'ali, la Torre è stata assediata e il
maestro ti ha spinto nel passaggio segreto con il grimorio in braccio e un
ultimo incarico sussurrato: "Trova la Valle dei Cristalli Oscuri. E non fidarti del Cavaliere."
Da allora cammini, pedali e corri — perché la magia, come i muscoli, cresce solo
con la fatica. Il cristallo sul tuo bastone si carica a ogni chilometro, e
Grymoyre ha smesso di sbuffare: ora, quando ti guarda allenarti, applaude con le pagine.
Il Cavaliere del Drago ha rubato il cielo. Tu hai intenzione di riprendertelo… con gli interessi.`,
  },
  alchimista: {
    title: 'L\'Alchimista dalla Maschera di Corvo',
    text: `Nessuno ha mai visto il tuo volto, e va bene così: la maschera dal lungo becco
era di tua nonna, la guaritrice che fermò da sola la Febbre Grigia quando i
medici del re scapparono a gambe levate. Dentro il becco lei custodiva erbe
balsamiche; tu ci tieni anche una caramella alla menta, per le emergenze.
Sei cresciuto tra alambicchi e vapori smeraldini, imparando la regola d'oro di
famiglia: ogni veleno nasconde la propria cura, basta avere il coraggio di cercarla.
Sul tuo guanto viaggia Becco, un corvo che ruba cucchiaini d'argento e trova
ingredienti rari fiutandoli a un miglio di distanza.
Quando l'Orda ha devastato Oakhaven, hai esaminato la cenere e il tuo sangue si
è gelato: la fiamma del Drago non brucia soltanto — CORROMPE, e la corruzione
si diffonde come una malattia. È la sfida che tua nonna avrebbe accettato senza esitare.
Così cammini di bioma in bioma, fiala dopo fiala, chilometro dopo chilometro,
distillando l'impossibile: l'antidoto al fuoco del Drago. Il Cavaliere ha portato
la peste nel mondo. Tu sarai la cura.`,
  },
  furfante: {
    title: 'Il Furfante dal Cuore d\'Oro',
    text: `Sei cresciuto nei vicoli di Oakhaven senza famiglia e senza regole, ma con un
codice tutto tuo: rubare solo ai ricchi antipatici, mai più di metà, e lasciare
sempre un fiore al posto del maltolto — per lo stile, ovviamente.
Le guardie ti chiamavano "la Piuma", perché quando arrivavano trovavano solo
quella, infilata nella serratura svuotata. Il fornaio, che ti allungava una
pagnotta nei giorni peggiori, ti chiamava semplicemente "quel bravo monello".
La notte dell'attacco eri sui tetti, il posto migliore per contare le stelle e
le borse dei mercanti. Hai visto il Drago prima di tutti, e hai fatto la cosa
più folle della tua carriera: invece di scappare, hai svegliato il quartiere
casa per casa, bussando ai vetri come un temporale. Quel "bravo monello" quella
notte ha rubato all'Orda il bottino più grosso: settanta persone vive.
Ora ti alleni tra i biomi con il sacco in spalla e il sorriso sotto la maschera,
perché hai messo gli occhi sul colpo del secolo: intrufolarti nella Vetta Oscura
e rubare al Cavaliere del Drago l'unica cosa che conta — la sua vittoria.`,
  },
  maga: {
    title: 'La Maga delle Rune Sussurrate',
    text: `Sei l'ultima allieva della Torre dell'Alchimista a essere entrata nella Foresta
Sussurrante — non per studiare le piante, ma per ascoltarle. Da bambina scoprivi
rune incise nella corteccia degli alberi più antichi, simboli che nessun libro
della Torre elencava, e il tuo bastone (intagliato da tua nonna erborista, la
stessa che curava mezzo Oakhaven) porta ancora i segni delle prime rune che hai
imparato a incidere: uno per ogni pozione riuscita, uno per ogni incantesimo
capito a metà e corretto sul campo. Nella tua bisaccia tintinnano fiale di
colori diversi — verde per guarire, viola per confondere — miscelate con la
stessa pazienza di chi sa che la magia, come le piante, non si affretta.
La notte dell'attacco stavi decifrando una runa nuova alla luce di una candela,
troppo assorta per accorgerti subito del boato. Quando sei corsa fuori, Oakhaven
bruciava e il cristallo in cima al tuo bastone, per la prima volta, si è acceso
da solo — una luce fredda e azzurra che nessun manuale ti aveva insegnato a
evocare. Da allora non si è più spento: pulsa più forte a ogni chilometro,
come se il tuo stesso movimento lo alimentasse. Le rune antiche parlano di un
"Cavaliere" molto prima che tu nascessi: la tua ricerca da studiosa è diventata
una caccia, e ogni passo verso la Vetta Oscura è anche un passo verso la verità
che le rune sussurrate hanno sempre custodito.`,
  },
  paladino: {
    title: 'Il Paladino dell\'Ultima Guardia',
    text: `Eri il più giovane scudiero mai ammesso nella guarnigione di Oakhaven, e lo
stemma del grifone dorato sul tuo petto — quello della tua famiglia, protettori
del borgo da tre generazioni — pesava più della tua armatura intera. Tuo padre,
capitano delle mura, ti ripeteva sempre la stessa regola prima di ogni turno di
guardia: "Lo scudo protegge gli altri. La spada protegge lo scudo. Tu proteggi entrambi."
La notte dell'attacco eri di sentinella al portale nord. Hai visto il Cavaliere
del Drago oscurare la luna un istante prima che il fuoco cadesse dal cielo, e
hai suonato l'allarme prima ancora che le guardie più esperte si voltassero.
Hai tenuto quel portale da solo abbastanza a lungo da far fuggire dodici
famiglie — finché una trave in fiamme non ti ha sepolto sotto le macerie insieme
al tuo scudo, l'unica cosa che sei riuscito a salvare oltre alla tua vita.
Da allora ti alleni senza sosta: ogni chilometro rinforza le braccia che un
giorno reggeranno di nuovo quello scudo davanti alla Vetta Oscura. Non hai
potuto salvare Oakhaven quella notte. La prossima volta, giuri, sarai in tempo.`,
  },
  ranger: {
    title: 'Il Ranger dei Sentieri Perduti',
    text: `Nessuno conosce la Foresta Sussurrante come te: da bambino ti perdevi apposta
tra gli alberi solo per il gusto di ritrovare la strada da solo, e a dodici anni
già leggevi le tracce di un cervo meglio dei cacciatori adulti del borgo. La
bussola che porti al collo era di tuo nonno, esploratore delle terre di confine;
la faretra è cucita con le tue mani, rune-portafortuna incise su ogni freccia.
Vivevi ai margini di Oakhaven, più a tuo agio sotto le fronde che dentro le mura,
quando il cielo si è squarciato di fuoco. Sei corso verso il villaggio contro
ogni istinto di sopravvivenza che la foresta ti aveva insegnato, ma sei arrivato
quando ormai restavano solo braci e un silenzio che nessun animale del bosco
avrebbe mai osato rompere. Hai seguito le tracce dell'Orda per giorni, oltre
i confini che conoscevi, imparando che anche i mostri lasciano un sentiero.
Ora quel sentiero è la tua unica missione: ogni chilometro percorso è una traccia
letta, un indizio in più su dove si nasconde il Cavaliere del Drago. Il migliore
cacciatore del reame non perde mai la sua preda — nemmeno quando la preda è un mostro.`,
  },
  fata: {
    title: 'La Fata delle Radure Segrete',
    text: `Sei nata — se "nascere" è la parola giusta — in una radura della Foresta
Sussurrante che nessuna mappa umana ha mai segnato, dove i funghi crescono in
cerchi perfetti e le lucciole raccontano storie a chi sa ascoltare. Le tue ali,
sottili come vetro colorato, si accendono quando sei felice e sbiadiscono
quando sei triste — un problema, per una fata che non ha mai imparato a nascondere
i sentimenti. Il bastone di legno di sambuco che porti sempre con te è stato un
regalo della Regina del Sottobosco, il giorno in cui hai deciso di lasciare la
radura per curiosare tra gli umani di Oakhaven — gente strana, ma capace di gesti
di una gentilezza che il tuo popolo non conosceva.
La notte dell'attacco stavi giocando a nascondino con i bambini del villaggio,
proprio come facevi ogni sera. Quando il fuoco è caduto dal cielo, hai usato
l'ultima polvere di folletto che avevi per creare uno scudo di luce attorno a
loro — e sei svenuta per lo sforzo, la prima e unica volta in vita tua.
Ti sei risvegliata tra le ceneri, sola: i bambini erano salvi, ma il villaggio
no. Ora voli — o meglio, corri, pedali, cammini, perché la magia da sola non
basta più — in cerca del Cavaliere che ha osato portare l'oscurità nel tuo bosco.
Le fate non dimenticano. E questa fata, in particolare, non perdona.`,
  },
  principe: {
    title: 'Il Principe del Nido degli Aquilotti',
    text: `Sei l'ultimo erede del Regno delle Vette, un trono minuscolo arroccato tra le
montagne oltre Oakhaven, alleato da sempre con i grifoni imperiali che nidificano
sulle guglie di pietra. Da quando eri in fasce un'aquila ti veglia dall'alto —
prima Corvenna, la tua balia alata, poi i suoi figli — e lo scudo con l'aquila
a due teste che porti sempre con te è stato forgiato il giorno della tua nascita,
un giuramento di protezione reciproca tra il tuo popolo e il cielo.
Eri in visita a Oakhaven per un trattato di pace quando l'Orda ha oscurato il
sole. Le tue guardie ti hanno issato in sella a un'aquila per metterti in salvo,
ma hai ordinato di virare INDIETRO, verso le fiamme, per portare in salvo chi
non aveva ali. Hai volato basso tra i tetti che crollavano finché le ali della
tua aquila non hanno preso fuoco — sei precipitato con lei, sopravvivendo entrambi
per miracolo, ma il cielo di quel giorno non l'hai più dimenticato.
Ora ti alleni ogni giorno, in sella o a piedi, per essere di nuovo abbastanza
veloce e forte da meritare il cielo: perché il Cavaliere del Drago vola, e un
principe che si rispetti non lascia che un usurpatore tenga il volo tutto per sé.`,
  },
  principessa: {
    title: 'La Principessa del Giardino Sussurrante',
    text: `Nel cuore della Foresta Sussurrante, ben oltre i sentieri che i cacciatori
osano percorrere, si nasconde un giardino che nessuna mappa segna: il tuo regno,
governato non con la spada ma con un patto antico stretto tra la tua famiglia e
le migliaia di farfalle che popolano quei fiori. La tua armatura è tessuta con le
loro ali cadute, donate per amore e non per caccia, e la lancia che porti è stata
intagliata da un ramo di melo caduto durante la prima fioritura del tuo regno.
Le farfalle sono le tue spie: volano ovunque, vedono ogni cosa, e la notte in
cui Oakhaven bruciò furono loro a portarti la notizia, migliaia di ali che
oscurarono per un istante persino il fumo. Sei corsa in aiuto insieme al tuo
sciame, ma il fuoco dell'Orda non conosce pietà per le ali sottili: ne hai perse
troppe quella notte, disperse per proteggere famiglie che nemmeno conoscevano
il tuo nome.
Ogni chilometro che percorri onora quelle ali perdute, e ogni tesoro che trovi
lungo il cammino — un dono che le farfalle superstiti continuano a scovare per
te, ovunque tu vada — è un passo più vicino al giorno in cui il tuo giardino e
il Cavaliere del Drago si troveranno faccia a faccia.`,
  },
  regina: {
    title: 'La Regina del Crepuscolo Perduto',
    text: `Governavi di notte un piccolo regno ai margini della Valle dei Cristalli
Oscuri, dove il sole non arriva mai del tutto e le farfalle notturne brillano
come stelle cadute. Il tuo scettro di cristallo viola è stato intagliato dalla
tua stessa magia, e Nyx, la civetta che non lascia mai la tua spalla, vede nel
buio più lontano di quanto chiunque altro veda alla luce del giorno.
Molti ti temevano prima ancora di conoscerti — "la Regina Oscura" — ma erano i
piccoli villaggi ai confini del tuo regno, incluso un tratto di Oakhaven, a
dormire più sereni sapendo che la tua magia teneva lontani gli incubi peggiori.
Quando l'Orda calò dal cielo, fosti tu a riconoscere per prima cosa fosse
davvero: non un semplice drago, ma un frammento di oscurità corrotta, la stessa
sostanza che governavi e domavi da una vita intera — sfuggita al controllo di
chi l'aveva risvegliata. Hai combattuto un'intera notte per contenerla, e hai
perso: la corruzione si è diffusa comunque, e Oakhaven è caduta.
Da allora ti alleni senza sosta, perché conosci un segreto che nessun altro
eroe possiede: sai ESATTAMENTE cosa serve per fermare un mostro fatto della tua
stessa magia. Il Cavaliere del Drago ha rubato qualcosa che ti appartiene.
Vuoi indietro l'oscurità — e vuoi indietro Oakhaven.`,
  },
};

function persist() { RPG.save(STATE); }
function vibrate(pattern) { try { navigator.vibrate && navigator.vibrate(pattern); } catch {} }

/* ══════════════ Schermate ══════════════ */

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  $('#' + id).classList.remove('hidden');
}

function renderProfiles() {
  const list = $('#profile-list');
  list.innerHTML = '';
  if (!STATE.heroes.length) {
    list.appendChild(el('p', 'muted', 'Nessun eroe ancora. Creane uno!'));
  }
  STATE.heroes.forEach(h => {
    const card = el('div', 'profile-card');
    card.appendChild(avatarEl(h, 'profile-avatar'));
    const info = el('div', 'profile-info',
      `<b>${esc(h.name)}</b><br><span class="muted">Liv. ${h.level} · ${RPG.heroTitle(h.level)} · ${h.totalKm.toFixed(1)} km</span>`);
    card.appendChild(info);
    const del = el('button', 'btn-delete', '🗑️');
    del.addEventListener('click', e => {
      e.stopPropagation();
      confirmDeleteHero(h);
    });
    card.appendChild(del);
    card.addEventListener('click', () => { STATE.current = h.id; persist(); enterGame(); });
    list.appendChild(card);
  });
  show('screen-profiles');
}

function confirmDeleteHero(h) {
  modal(`
    <h3 class="panel-title">🗑️ Cancellare ${esc(h.name)}?</h3>
    <p>Liv. ${h.level} · ${h.totalKm.toFixed(1)} km percorsi · ${h.cards.length} carte</p>
    <p class="muted small">Tutti i progressi di questo eroe andranno perduti per sempre. Il Custode del Tempo non potrà riportarli indietro.</p>
    <div class="row gap">
      <button class="btn wide" onclick="closeModal()">Annulla</button>
      <button class="btn wide btn-danger" id="btn-confirm-delete">Cancella</button>
    </div>
  `);
  $('#btn-confirm-delete').addEventListener('click', () => {
    RPG.deleteHero(STATE, h.id);
    persist();
    closeModal();
    renderProfiles();
  });
}

function avatarEl(hero, cls) {
  if (hero.avatar && (hero.avatar.startsWith('data:') || hero.avatar.startsWith('assets/'))) {
    const img = el('img', cls);
    img.src = hero.avatar;
    img.alt = hero.name;
    return img;
  }
  return el('div', cls + ' avatar-emoji', hero.avatar || '🧑‍🌾');
}
function isImageAvatar(hero) {
  return hero.avatar && (hero.avatar.startsWith('data:') || hero.avatar.startsWith('assets/'));
}

/* ── Creazione eroe (i protagonisti creati con l'IA) ── */
let pickedAvatar = AVATARS[0];

function renderCreate() {
  const picker = $('#avatar-picker');
  picker.innerHTML = '';
  AVATARS.forEach(a => {
    const box = el('div', 'avatar-box' + (a === pickedAvatar ? ' selected' : ''));
    const img = el('img', 'avatar-choice avatar-choice-big');
    img.src = a.path;
    img.addEventListener('error', () => box.remove());
    box.appendChild(img);
    box.appendChild(el('div', 'avatar-label', a.label));
    const t = RPG.CLASS_TALENTS[a.storyId];
    if (t) box.appendChild(el('div', 'avatar-talent', `${t.icon} ${t.desc}`));
    box.addEventListener('click', () => { pickedAvatar = a; renderCreate(); });
    picker.appendChild(box);
  });
  show('screen-create');
}

$('#btn-new-hero').addEventListener('click', () => { $('#create-name').value = ''; renderCreate(); });
$('#btn-create-back').addEventListener('click', renderProfiles);
$('#btn-create-confirm').addEventListener('click', () => {
  const name = $('#create-name').value.trim();
  if (!name) { alert('Ogni eroe ha bisogno di un nome!'); return; }
  const h = RPG.newHero(name, pickedAvatar.path);
  h.storyId = pickedAvatar.storyId;
  STATE.heroes.push(h);
  STATE.current = h.id;
  persist();
  enterGame();
});

/* ══════════════ Gioco ══════════════ */

function enterGame() {
  HERO = STATE.heroes.find(h => h.id === STATE.current);
  if (!HERO) { renderProfiles(); return; }
  RPG.migrateHero(HERO);
  show('screen-game');
  renderHUD();
  setTab('camp');
  // Rollover incursione + FOMO del bottino perso
  const missed = RPG.rolloverIncursion(HERO);
  // Tesoro Giornaliero
  const login = RPG.dailyLogin(HERO);
  persist();
  renderHUD();

  // Sincronizzazione automatica da Apple Salute (URL params o clipboard)
  const healthReport = applyHealthSyncFromURL(HERO);
  if (healthReport) { persist(); renderHUD(); }

  // Coda dei popup di apertura
  OPEN_QUEUE = [];
  if (healthReport) OPEN_QUEUE.push(() => showHealthSyncResult(healthReport));

  // Clipboard sync attivata da gesto utente (iOS richiede tocco esplicito)
  showClipboardSyncBanner();
  if (missed) OPEN_QUEUE.push(() => modal(`
      <h3 class="panel-title">💨 Il Forziere Svanito…</h3>
      <div class="lost-chest">🎁</div>
      <p class="center"><b>${esc(missed.name)}</b></p>
      <p class="muted center">Hai mancato il forziere per soli <b>${missed.kmMissing} km</b>! L'occasione è svanita all'alba…</p>
      <button class="btn btn-primary wide" onclick="nextOpening()">Non succederà più!</button>`));
  if (login) { window._pendingLogin = login; OPEN_QUEUE.push(showDailyLogin); }
  // La Taglia è stata reclamata dall'altro eroe?
  const ev = RPG.weeklyEvent(STATE);
  if (ev.claimedBy && ev.claimedBy !== HERO.name && HERO.eventNotified !== ev.week) {
    HERO.eventNotified = ev.week;
    persist();
    OPEN_QUEUE.push(() => modal(`
      <h3 class="panel-title">⛔ Taglia Sfumata!</h3>
      <p class="center" style="font-size:2.5rem">${ev.icon}</p>
      <p class="center"><b>${esc(ev.claimedBy)}</b> ha reclamato <b>${ev.skin}</b> prima di te.</p>
      <p class="muted small center">La prossima Taglia arriva tra <span data-cd="week">…</span>. Stavolta non farti battere!</p>
      <button class="btn btn-primary wide" onclick="nextOpening()">La prossima è mia</button>`));
  }
  // Riepilogo "cosa ti aspetta oggi" (una volta al giorno)
  if (HERO.summarySeen !== todayISO()) {
    HERO.summarySeen = todayISO();
    persist();
    OPEN_QUEUE.push(showDailySummary);
  }
  nextOpening();
}

function showDailyLogin() {
  const login = window._pendingLogin;
  if (!login) return;
  window._pendingLogin = null;
  let html = `
    <h3 class="panel-title">🗝️ Il Tesoro Giornaliero</h3>
    <div class="streak-row">`;
  for (let d = 1; d <= 7; d++) {
    const idx = ((login.day - 1) % 7) + 1;
    html += `<div class="streak-day${d <= idx ? ' filled' : ''}${d === 7 ? ' special' : ''}">${d === 7 ? '🎁' : d}</div>`;
  }
  html += `</div>
    <p class="center"><b>Giorno ${login.day} di fila!</b></p>
    <p class="center">🪙 +${login.gold} monete</p>`;
  if (login.item) {
    html += `<div class="loot rar-${login.item.rarity}">${login.item.icon} ${login.item.name} <span class="tag">${RPG.RARITIES[login.item.rarity].label}</span></div>
      <p class="small muted center">Bonus del 7° giorno!</p>`;
  }
  html += `<p class="small muted center">Torna domani: il tesoro cresce ogni giorno. Se salti un giorno, riparte da capo!</p>
    <button class="btn btn-primary wide" onclick="nextOpening()">Riscuoti</button>`;
  modal(html);
  sfx('coin');
  vibrate(80);
}

/* Popup dettaglio risorse (tocco sulle risorse in alto a destra) */
function showResources() {
  modal(`
    <h3 class="panel-title">🎒 Le tue Risorse</h3>
    <div class="res-detail"><span class="res-detail-icon">🪙</span><div><b>Moneta d'Oro</b><br><span class="small muted">La valuta del reame: compra cavalcature, armi e armature.</span></div><b class="res-detail-qty">${HERO.gold}</b></div>
    <div class="res-detail"><span class="res-detail-icon">🪵</span><div><b>Legno</b><br><span class="small muted">Materiale da costruzione per il tuo Rifugio.</span></div><b class="res-detail-qty">${HERO.wood}</b></div>
    <div class="res-detail"><span class="res-detail-icon">🪨</span><div><b>Roccia</b><br><span class="small muted">Pietra grezza per le strutture più solide.</span></div><b class="res-detail-qty">${HERO.stone}</b></div>
    <button class="btn btn-primary wide" onclick="closeModal()">Chiudi</button>
  `);
}

function renderHUD() {
  const av = $('#hud-avatar');
  av.innerHTML = '';
  av.appendChild(avatarEl(HERO, 'hud-avatar-inner'));
  $('#hud-name').textContent = HERO.name;
  $('#hud-title').textContent = `Liv. ${HERO.level} — ${RPG.heroTitle(HERO.level)}`;
  const need = RPG.xpForLevel(HERO.level);
  const pct = Math.min(100, Math.round(HERO.xp / need * 100));
  $('#hud-xpfill').style.width = pct + '%';
  $('#hud-xptext').textContent = `${HERO.xp} / ${need} XP`;
  // streak nel titolo
  const streak = HERO.streak && HERO.streak.count > 1 ? ` · 🔥${HERO.streak.count}` : '';
  $('#hud-title').textContent = `Liv. ${HERO.level} — ${RPG.heroTitle(HERO.level)}${streak}`;
  // barra che "esplode" vicino al level-up + prossimo sblocco
  const bar = document.querySelector('.xpbar');
  let next = $('#hud-next');
  if (!next) { next = el('div', 'hud-next'); next.id = 'hud-next'; $('.hud-info').appendChild(next); }
  if (need - HERO.xp > 0 && HERO.xp / need >= 0.9) {
    bar.classList.add('almost');
    const kmLeft = Math.max(0.1, (need - HERO.xp) / 15).toFixed(1);
    next.innerHTML = `⚡ Ti bastano <b>${kmLeft} km</b> per il Livello ${HERO.level + 1}!`;
    next.classList.add('hot');
  } else {
    bar.classList.remove('almost');
    next.classList.remove('hot');
    const nu = nextUnlock(HERO);
    next.innerHTML = nu ? `${nu.icon} Liv. ${nu.level}: ${nu.text} <span class="hud-next-in">(tra ${nu.inLv} liv.)</span>` : '';
  }
  $('#res-gold').textContent = HERO.gold;
  $('#res-wood').textContent = HERO.wood;
  $('#res-stone').textContent = HERO.stone;
  updateBadges();
}

let _tabClickTs = 0;
document.querySelectorAll('#tabbar .tab').forEach(t =>
  t.addEventListener('click', () => {
    const now = Date.now();
    if (now - _tabClickTs < 280) return;
    _tabClickTs = now;
    setTab(t.dataset.tab);
  }));

// Tocco sulle risorse dell'header → popup dettaglio
document.querySelector('.hud-right').addEventListener('click', () => { if (HERO) showResources(); });

function setTab(tab) {
  CURRENT_TAB = tab;
  document.querySelectorAll('#tabbar .tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab));
  const c = $('#tab-content');
  c.classList.toggle('bg-parchment', tab === 'hero' && PARCHMENT_OK);
  c.classList.toggle('bg-rifugio', tab === 'camp');
  c.innerHTML = '';
  ({ camp: renderCamp, map: renderMap, train: renderTrain, market: renderMarket, hero: renderHero }[tab])(c);
  c.scrollTop = 0;
  updateBadges();
}

/* ── TAB: Rifugio ── */
let CAMP_VIEW = 'main';

function renderCamp(c) {
  if (CAMP_VIEW === 'santuario') { renderSantuarioView(c); return; }
  if (CAMP_VIEW === 'arredamento') { renderArredamentoView(c); return; }

  const scene = el('div', 'camp-scene');
  const hasHouse = HERO.buildings.includes('fondamenta');
  let sceneEmoji = hasHouse ? '🛖' : '🔥';
  let sceneDesc = hasHouse
    ? 'La tua casa nella radura. Il fumo del camino sale tranquillo tra gli alberi.'
    : 'Un falò tremolante in una radura. Dormi sotto le stelle… per ora.';
  if (HERO.buildings.length >= 4) { sceneEmoji = '🏡'; sceneDesc = 'Il tuo rifugio è ormai una vera dimora fortificata!'; }
  const mount = HERO.mount ? RPG.mountById(HERO.mount) : null;
  const petSpeciesInfo = HERO.pet ? RPG.PET_SPECIES[HERO.pet.species] : null;
  scene.appendChild(el('div', 'camp-emoji', sceneEmoji));
  if (HERO.companion && HERO.pet) {
    const petThumb = el('img', 'camp-companion-img');
    petThumb.src = petImageSrc(HERO.pet);
    petThumb.onerror = () => { petThumb.outerHTML = `<span class="camp-companion-emoji">${petSpeciesInfo ? petSpeciesInfo.icon : '🐺'}</span>`; };
    scene.appendChild(petThumb);
  }
  if (mount) {
    const mountThumb = el('img', 'camp-companion-img');
    mountThumb.src = mount.img;
    mountThumb.onerror = () => { mountThumb.outerHTML = `<span class="camp-companion-emoji">${mount.emoji}</span>`; };
    scene.appendChild(mountThumb);
  }
  scene.appendChild(el('p', 'camp-desc', sceneDesc +
    (HERO.companion && petSpeciesInfo && HERO.pet.hatched ? `<br>${esc(HERO.pet.name)} ${petSpeciesInfo.icon} sonnecchia accanto a te.` : '') +
    (HERO.companion && petSpeciesInfo && !HERO.pet.hatched ? `<br>Un uovo di ${petSpeciesInfo.name} si scalda accanto al fuoco.` : '') +
    (mount ? `<br>${mount.name} riposa nella stalla.` : '')));
  c.appendChild(scene);

  // Santuario dei Famigli
  if (HERO.companion && HERO.pet && !HERO.pet.hatched) {
    const egg = RPG.eggProgress(HERO);
    const sp = el('div', 'panel santuario-teaser');
    sp.appendChild(el('h3', 'panel-title', '🥚 Uovo Misterioso'));
    const thumb = el('img', 'pet-thumb' + (egg.ready ? ' egg-shake' : ''));
    thumb.src = petImageSrc(HERO.pet);
    thumb.onerror = () => { thumb.style.display = 'none'; };
    sp.appendChild(thumb);
    sp.appendChild(el('div', 'membar slim', `<div class="membar-fill gold" style="width:${egg.pct}%"></div><span>${egg.km.toFixed(1)} / ${egg.needed} km</span>`));
    sp.appendChild(el('p', 'muted small center',
      egg.ready ? '✨ È pronto per schiudersi!' : 'Si scalda un passo alla volta...'));
    const enterBtn = el('button', 'btn btn-primary wide', egg.ready ? '🥚 Guarda l\'uovo' : 'Osserva l\'uovo');
    enterBtn.addEventListener('click', () => { CAMP_VIEW = 'santuario'; setTab('camp'); });
    sp.appendChild(enterBtn);
    c.appendChild(sp);
  } else if (HERO.companion && HERO.pet) {
    RPG.tickPet(HERO); persist();
    const p = HERO.pet;
    const sp = el('div', 'panel santuario-teaser');
    sp.appendChild(el('h3', 'panel-title', '🐾 Il Santuario dei Famigli'));
    const thumb = el('img', 'pet-thumb');
    thumb.src = petImageSrc(p);
    thumb.onerror = () => { thumb.style.display = 'none'; };
    sp.appendChild(thumb);
    let statusMsg = 'Tutto tranquillo.';
    if (p.sick) statusMsg = '🤒 È malato! Ha bisogno di cure urgenti.';
    else if (p.hunger < 30 || p.mood < 30 || p.hygiene < 30 || p.energy < 30) statusMsg = '⚠️ Ha bisogno di attenzioni!';
    else if (p.wish) statusMsg = '💭 Ha un desiderio da esaudire!';
    sp.appendChild(el('p', 'muted small center', `${esc(p.name)} — Liv. ${p.level}. ${statusMsg}`));
    const enterBtn = el('button', 'btn btn-primary wide', 'Entra nel Santuario');
    enterBtn.addEventListener('click', () => { CAMP_VIEW = 'santuario'; setTab('camp'); });
    sp.appendChild(enterBtn);
    c.appendChild(sp);
  }

  // Bottega dell'Arredamento (Espansione del Rifugio)
  {
    const totalOwned = (HERO.furniture && HERO.furniture.owned.length) || 0;
    const setsComplete = RPG.FURNITURE_SETS.filter(s => RPG.furnitureSetComplete(HERO, s.id)).length;
    const ap = el('div', 'panel');
    ap.appendChild(el('h3', 'panel-title', '🏛️ Bottega dell\'Arredamento'));
    ap.appendChild(el('p', 'muted small',
      `${totalOwned} / 200 cimeli raccolti · ${setsComplete} / 20 set completi. Arreda il Rifugio e sblocca bonus permanenti!`));
    const enterBtn2 = el('button', 'btn btn-primary wide', 'Sfoglia la Bottega');
    enterBtn2.addEventListener('click', () => { CAMP_VIEW = 'arredamento'; setTab('camp'); });
    ap.appendChild(enterBtn2);
    c.appendChild(ap);
  }

  // Costruzione
  const BUILD_ICON_FILES = {
    fondamenta: 'torre-mago', baule: 'baule', letto: null,
    muro: 'muro', fucina: 'fucina', lab: 'laboratorio',
  };
  const bpanel = el('div', 'panel');
  const bTitle = el('h3', 'panel-title', '🔨 Costruisci');
  bpanel.appendChild(bTitle);
  const hammerImg = new Image();
  hammerImg.onload = () => { bTitle.innerHTML = `<img class="panel-title-icon" src="assets/ui/rifugio/costruisci.png"> Costruisci`; };
  hammerImg.src = 'assets/ui/rifugio/costruisci.png';
  if (HERO.level < 5) {
    bpanel.appendChild(el('p', 'muted',
      `Raggiungi il <b>Livello 5</b> per piantare le radici e costruire la tua casa. (Ora sei al ${HERO.level}.)`));
  } else {
    RPG.BUILDINGS.forEach(b => {
      const status = RPG.canBuild(HERO, b);
      const row = el('div', 'build-row' + (status === 'costruito' ? ' built' : ''));
      const iconFile = BUILD_ICON_FILES[b.id];
      const iconHolder = el('div', 'build-icon', b.icon);
      if (iconFile) {
        const bimg = new Image();
        bimg.onload = () => { iconHolder.textContent = ''; bimg.className = 'build-icon-img'; iconHolder.appendChild(bimg); };
        bimg.src = `assets/ui/rifugio/${iconFile}.png`;
      }
      row.appendChild(iconHolder);
      row.appendChild(el('div', 'build-mid',
        `<b>${b.name}</b><br><span class="small muted">${b.desc}</span><br>` +
        `<span class="small">🪵 ${b.cost.wood} · 🪨 ${b.cost.stone} · Liv. ${b.minLevel}</span>`));
      const btn = el('button', 'btn btn-small');
      if (status === 'costruito') { btn.textContent = '✅'; btn.disabled = true; }
      else if (status === 'ok') {
        btn.textContent = 'Costruisci';
        btn.classList.add('btn-primary');
        btn.addEventListener('click', () => {
          RPG.build(HERO, b.id); persist(); renderHUD(); setTab('camp');
          toast(`${b.icon} ${b.name} costruito!`);
        });
      } else {
        btn.textContent = '🔒'; btn.disabled = true;
      }
      row.appendChild(btn);
      bpanel.appendChild(row);
    });
  }
  c.appendChild(bpanel);

  // Visita alleato
  const others = STATE.heroes.filter(h => h.id !== HERO.id);
  if (others.length) {
    const vp = el('div', 'panel');
    const vTitle = el('h3', 'panel-title', '🪞 Visita il Rifugio del tuo Alleato');
    vp.appendChild(vTitle);
    const trofeoImg = new Image();
    trofeoImg.onload = () => { vTitle.innerHTML = `<img class="panel-title-icon" src="assets/ui/rifugio/trofeo-alleato.png"> Visita il Rifugio del tuo Alleato`; };
    trofeoImg.src = 'assets/ui/rifugio/trofeo-alleato.png';
    others.forEach(o => {
      const btn = el('button', 'btn wide', `Guarda la base di ${esc(o.name)}`);
      btn.addEventListener('click', () => showAllyBase(o));
      vp.appendChild(btn);
    });
    c.appendChild(vp);
  }

  // Riposo
  const rp = el('div', 'panel');
  rp.appendChild(el('h3', 'panel-title', '😴 Falò Rigenerante'));
  rp.appendChild(el('p', 'muted small',
    'Dichiara un Giorno di Riposo (max 2 a settimana): il prossimo allenamento varrà il DOPPIO.' +
    (HERO.restBonus ? '<br><b>✨ Bonus Riposo attivo: il prossimo allenamento vale x2!</b>' : '')));
  const rbtn = el('button', 'btn wide', 'Riposa oggi');
  rbtn.addEventListener('click', () => {
    const err = RPG.declareRestDay(HERO);
    persist();
    toast(err || '😴 Riposo dichiarato! Domani il tuo allenamento varrà x2.');
    setTab('camp');
  });
  rp.appendChild(rbtn);
  c.appendChild(rp);
}

function showAllyBase(o) {
  RPG.migrateHero(o);
  const built = RPG.BUILDINGS.filter(b => o.buildings.includes(b.id));
  const mount = o.mount ? RPG.mountById(o.mount) : null;
  modal(`
    <h3 class="panel-title">🪞 Il Rifugio di ${esc(o.name)}</h3>
    <div class="camp-emoji">${o.buildings.includes('fondamenta') ? '🛖' : '🔥'}${o.companion ? ' 🐺' : ''}${mount ? ' ' + mount.emoji : ''}</div>
    <p class="muted">Liv. ${o.level} — ${RPG.heroTitle(o.level)} · ${o.totalKm.toFixed(1)} km totali</p>
    <p>${built.length ? 'Strutture: ' + built.map(b => b.icon + ' ' + b.name).join(', ') : 'Dorme ancora accanto al falò.'}</p>
    ${mount ? `<p>Cavalcatura: ${mount.emoji} ${mount.name}</p>` : ''}
    <p class="muted small">${o.cards.length} carte · ${(o.bestiary || []).length} creature nel Bestiario · ${(o.items || []).length} oggetti</p>
    <button class="btn btn-primary wide" onclick="closeModal()">Torna al tuo Rifugio</button>
  `);
}

function petImageSrc(pet) {
  const stage = RPG.petStage(pet.level);
  return `assets/pet/${pet.species}/${stage}.png`;
}

function renderEggView(c) {
  const pet = HERO.pet;
  const speciesInfo = RPG.PET_SPECIES[pet.species];
  const egg = RPG.eggProgress(HERO);

  const backBtn = el('button', 'btn btn-small', '↩ Torna al Rifugio');
  backBtn.addEventListener('click', () => { CAMP_VIEW = 'main'; setTab('camp'); });
  c.appendChild(backBtn);

  c.appendChild(el('h2', 'section-title', '🥚 Uovo Misterioso'));

  const head = el('div', 'panel center');
  const img = el('img', 'pet-portrait-img' + (egg.ready ? ' egg-shake' : ''));
  img.src = petImageSrc(pet);
  img.onerror = () => { img.outerHTML = `<div class="pet-portrait">🥚</div>`; };
  head.appendChild(img);
  head.appendChild(el('h3', 'hero-name-plate center', `Uovo di ${esc(speciesInfo.name)}`));
  head.appendChild(el('p', 'small muted center',
    'Finché l\'uovo non si schiude non ha bisogno di nulla: si scalda un passo alla volta con i chilometri che percorri. Il mistero si svelerà alla schiusa.'));
  c.appendChild(head);

  const progPanel = el('div', 'panel');
  progPanel.appendChild(el('h3', 'panel-title', '🔥 Incubazione'));
  progPanel.appendChild(el('div', 'membar', `<div class="membar-fill gold" style="width:${egg.pct}%"></div><span>${egg.km.toFixed(1)} / ${egg.needed} km</span>`));
  c.appendChild(progPanel);

  if (egg.ready) {
    const hatchPanel = el('div', 'panel incursion-panel center');
    hatchPanel.appendChild(el('p', 'center big-news', '✨ L\'uovo trema... è pronto!'));
    const hatchBtn = el('button', 'btn btn-primary wide big', '🥚 Tocca per rompere il guscio!');
    hatchBtn.addEventListener('click', () => playHatchSequence(pet));
    hatchPanel.appendChild(hatchBtn);
    c.appendChild(hatchPanel);
  } else {
    c.appendChild(el('p', 'muted small center', 'Continua ad allenarti: ogni chilometro scalda l\'uovo un po\' di più.'));
  }
}

function playHatchSequence(pet) {
  const videoSrc = `assets/pet/${pet.species}/hatch.mp4`;
  const overlay = el('div', 'hatch-overlay');
  overlay.innerHTML = `
    <video class="hatch-video" autoplay playsinline muted></video>
    <button class="btn wide hatch-skip">Salta ➜</button>`;
  document.body.appendChild(overlay);
  const video = overlay.querySelector('video');
  const finish = () => {
    overlay.remove();
    const r = RPG.hatchPet(HERO);
    persist(); renderHUD();
    if (r && r.ok) { toast(`🎉 ${esc(HERO.pet.name)} è nato!`); sfx('level'); vibrate([80, 40, 80, 40, 120]); }
    else toast(r);
    setTab('camp');
  };
  video.addEventListener('ended', finish);
  video.addEventListener('error', finish);
  overlay.querySelector('.hatch-skip').addEventListener('click', finish);
  video.src = videoSrc;
  video.play().catch(() => finish());
}

function renderSantuarioView(c) {
  const pet = HERO.pet;
  if (!pet.hatched) { renderEggView(c); return; }
  RPG.tickPet(HERO); persist();
  const pers = RPG.PET_PERSONALITIES[pet.personality];

  const backBtn = el('button', 'btn btn-small', '↩ Torna al Rifugio');
  backBtn.addEventListener('click', () => { CAMP_VIEW = 'main'; setTab('camp'); });
  c.appendChild(backBtn);

  c.appendChild(el('h2', 'section-title', '🐾 Il Santuario dei Famigli'));

  const speciesInfo = RPG.PET_SPECIES[pet.species];
  const stage = RPG.petStage(pet.level);
  const head = el('div', 'panel center');
  const portraitWrap = el('div', 'pet-portrait-wrap');
  const img = el('img', 'pet-portrait-img');
  img.src = petImageSrc(pet);
  img.onerror = () => { img.outerHTML = `<div class="pet-portrait">${speciesInfo.icon}</div>`; };
  portraitWrap.appendChild(img);
  if (pet.accessory) portraitWrap.appendChild(el('div', 'pet-accessory-badge', RPG.PET_ACCESSORIES[pet.accessory].icon));
  head.appendChild(portraitWrap);
  head.appendChild(el('div', 'pet-stage-tag small', `${speciesInfo.icon} ${speciesInfo.name} · Stadio ${stage}/5`));
  head.appendChild(el('h3', 'hero-name-plate center', `${esc(pet.name)} — Liv. ${pet.level}`));
  head.appendChild(el('p', 'small muted', `${pers.icon} <b>${pers.name}</b><br>${pers.desc}`));
  c.appendChild(head);

  if (RPG.packAuraActive(STATE, HERO)) {
    c.appendChild(el('div', 'panel done-strip', '🌟 <b>Aura del Branco attiva!</b> Entrambi i famigli sono felici: sconto e bonus drop condivisi!'));
  }

  if (pet.sick) {
    const sickP = el('div', 'panel incursion-panel');
    sickP.innerHTML = `<h3 class="panel-title">🤒 ${esc(pet.name)} è malato!</h3>
      <p class="small muted center">Solo la Pozione della Fenice può guarirlo.</p>`;
    const cureBtn = el('button', 'btn btn-primary wide', `🧪 Cura (${RPG.PHOENIX_POTION_PRICE} 🪙)`);
    cureBtn.addEventListener('click', () => {
      const r = RPG.curePet(HERO);
      persist();
      if (r && r.ok) { toast('✨ Guarito! Il tuo famiglio sta di nuovo bene.'); sfx('level'); }
      else toast(r);
      renderHUD(); setTab('camp');
    });
    sickP.appendChild(cureBtn);
    c.appendChild(sickP);
  }

  if (pet.wish) {
    const food = RPG.PET_FOODS[pet.wish.item];
    const minLeft = Math.max(0, Math.ceil((pet.wish.deadline - Date.now()) / 60000));
    const wp = el('div', 'panel incursion-panel');
    wp.innerHTML = `<h3 class="panel-title">💭 Desiderio improvviso!</h3>
      <p class="center">${esc(pet.name)} desidera: <b>${food.icon} ${food.name}</b></p>
      <p class="muted small center">Scade tra ${minLeft} min!</p>`;
    const giveBtn = el('button', 'btn btn-primary wide', `Dai ${food.icon} ${food.name}`);
    giveBtn.addEventListener('click', () => {
      const r = RPG.feedPet(HERO, pet.wish.item);
      persist();
      if (r && r.ok) { toast(r.wishFulfilled ? '🎉 Desiderio esaudito!' : `${food.icon} sfamato!`); sfx('coin'); }
      else toast(r);
      renderHUD(); setTab('camp');
    });
    wp.appendChild(giveBtn);
    c.appendChild(wp);
  }

  const statsPanel = el('div', 'panel');
  statsPanel.appendChild(el('h3', 'panel-title', '📊 Bisogni'));
  [
    ['🍖 Sazietà', pet.hunger],
    ['🎾 Umore', pet.mood],
    ['🛁 Igiene', pet.hygiene],
    ['🌙 Energia', pet.energy],
  ].forEach(([label, val]) => {
    const cls = val < 30 ? 'danger' : 'gold';
    statsPanel.innerHTML += `<div class="stat-row">${label} <b>${Math.round(val)}%</b></div>
      <div class="membar slim"><div class="membar-fill ${cls}" style="width:${Math.round(val)}%"></div></div>`;
  });
  c.appendChild(statsPanel);

  const actionsPanel = el('div', 'panel');
  actionsPanel.appendChild(el('h3', 'panel-title', '🤲 Prenditi cura di lui'));
  const grid = el('div', 'hero-submenu');

  const feedBtn = el('button', 'btn submenu-btn');
  feedBtn.innerHTML = `<span class="submenu-emoji">🍖</span><span>Nutri</span>`;
  feedBtn.addEventListener('click', openFeedPicker);
  grid.appendChild(feedBtn);

  const playBtn = el('button', 'btn submenu-btn');
  playBtn.innerHTML = `<span class="submenu-emoji">🎾</span><span>Gioca</span>`;
  playBtn.addEventListener('click', () => {
    const r = RPG.playWithPet(HERO);
    persist();
    if (r && r.ok) { toast('🎾 Che divertimento!'); sfx('coin'); } else toast(r);
    setTab('camp');
  });
  grid.appendChild(playBtn);

  const cleanBtn = el('button', 'btn submenu-btn');
  cleanBtn.innerHTML = `<span class="submenu-emoji">🛁</span><span>Pulisci</span>`;
  cleanBtn.addEventListener('click', () => {
    const r = RPG.cleanPet(HERO);
    persist();
    if (r && r.ok) { toast('🛁 Pulito e profumato!'); sfx('coin'); } else toast(r);
    setTab('camp');
  });
  grid.appendChild(cleanBtn);

  const sleepBtn = el('button', 'btn submenu-btn');
  sleepBtn.innerHTML = `<span class="submenu-emoji">🌙</span><span>Nanna</span>`;
  sleepBtn.addEventListener('click', () => {
    const r = RPG.sleepPet(HERO);
    persist();
    if (r && r.ok) { toast('🌙 Dorme sereno... energia piena domani!'); sfx('coin'); } else toast(r);
    setTab('camp');
  });
  grid.appendChild(sleepBtn);

  actionsPanel.appendChild(grid);
  c.appendChild(actionsPanel);

  const expStatus = RPG.expeditionStatus(HERO);
  const expPanel = el('div', 'panel');
  expPanel.appendChild(el('h3', 'panel-title', '🎒 Spedizione di Foraggiamento'));
  if (!pet.expedition) {
    expPanel.appendChild(el('p', 'muted small', `Invia ${esc(pet.name)} in esplorazione per ${RPG.EXPEDITION_HOURS} ore. Più km percorri nel frattempo, più ricco sarà il bottino al ritorno!`));
    const startBtn = el('button', 'btn btn-primary wide', '🚀 Invia in spedizione');
    startBtn.disabled = !!pet.sick;
    startBtn.addEventListener('click', () => {
      const r = RPG.startExpedition(HERO);
      persist();
      if (r && r.ok) toast('🎒 Spedizione iniziata!'); else toast(r);
      setTab('camp');
    });
    expPanel.appendChild(startBtn);
  } else if (expStatus.ready) {
    expPanel.appendChild(el('p', 'center', '📦 Il bottino è pronto!'));
    const collectBtn = el('button', 'btn btn-primary wide', 'Riscuoti');
    collectBtn.addEventListener('click', () => {
      const r = RPG.collectExpedition(HERO);
      persist();
      if (r) {
        toast(r.epic ? `🌟 Bottino epico! 🪙${r.gold} 🪵${r.wood} 🪨${r.stone}` : `🎒 Bottino: 🪵${r.wood} 🪨${r.stone}`);
        sfx('chest');
      }
      renderHUD(); setTab('camp');
    });
    expPanel.appendChild(collectBtn);
  } else {
    expPanel.appendChild(el('div', 'membar slim', `<div class="membar-fill gold" style="width:${expStatus.pctDone}%"></div><span>${expStatus.pctDone}%</span>`));
    expPanel.appendChild(el('p', 'muted small center', 'In esplorazione... torna più tardi!'));
  }
  c.appendChild(expPanel);

  const shop = el('div', 'panel');
  shop.appendChild(el('h3', 'panel-title', '🛍️ Bottega degli Accessori'));
  const shopGrid = el('div', 'loot-list');
  Object.entries(RPG.PET_ACCESSORIES).forEach(([key, acc]) => {
    const owned = pet.accessoriesOwned.includes(key);
    const equipped = pet.accessory === key;
    const row = el('div', 'loot pickable' + (equipped ? ' equipped' : ''));
    row.innerHTML = `<div class="loot-body"><div class="loot-head"><b>${acc.icon} ${acc.name}</b>${equipped ? ' ✅' : ''}</div>
      <div class="small">${owned ? (equipped ? 'Equipaggiato' : 'Posseduto — tocca per indossare') : `🪙 ${acc.price}`}</div></div>`;
    row.addEventListener('click', () => {
      const r = RPG.buyAccessory(HERO, key);
      persist();
      if (r && r.ok) { toast(equipped ? 'Rimosso' : `${acc.icon} Equipaggiato!`); renderHUD(); }
      else toast(r);
      setTab('camp');
    });
    shopGrid.appendChild(row);
  });
  shop.appendChild(shopGrid);
  c.appendChild(shop);
}

function openFeedPicker() {
  let html = `<h3 class="panel-title">🍖 Scegli il pasto</h3><div class="loot-list" id="feed-picker-list"></div>
    <button class="btn wide" onclick="closeModal()">Annulla</button>`;
  modal(html);
  const list = $('#feed-picker-list');
  Object.entries(RPG.PET_FOODS).forEach(([key, food]) => {
    const row = el('div', 'loot pickable');
    row.innerHTML = `<div class="loot-body"><div class="loot-head"><b>${food.icon} ${food.name}</b></div>
      <div class="small">Sazietà +${food.restoreHunger} · 🪙 ${food.price}</div></div>`;
    row.addEventListener('click', () => {
      const r = RPG.feedPet(HERO, key);
      persist();
      closeModal();
      if (r && r.ok) { toast(r.wishFulfilled ? '🎉 Desiderio esaudito!' : `${food.icon} Nutrito!`); sfx('coin'); renderHUD(); }
      else toast(r);
      setTab('camp');
    });
    list.appendChild(row);
  });
}

function renderArredamentoView(c) {
  const backBtn = el('button', 'btn btn-small', '↩ Torna al Rifugio');
  backBtn.addEventListener('click', () => { CAMP_VIEW = 'main'; setTab('camp'); });
  c.appendChild(backBtn);

  c.appendChild(el('h2', 'section-title', '🏛️ Bottega dell\'Arredamento'));
  const totalOwned = (HERO.furniture && HERO.furniture.owned.length) || 0;
  c.appendChild(el('p', 'muted small center', `${totalOwned} / 200 cimeli raccolti in tutto il regno`));

  RPG.FURNITURE_SETS.slice()
    .sort((a, b) => RPG.BIOMES[a.biomeIdx].min - RPG.BIOMES[b.biomeIdx].min)
    .forEach(s => {
    const biome = RPG.BIOMES[s.biomeIdx];
    const unlocked = HERO.level >= biome.min;
    const owned = RPG.furnitureSetOwnedCount(HERO, s.id);
    const complete = owned === 10;
    const row = el('div', 'panel furniture-set-row' + (complete ? ' complete' : '') + (!unlocked ? ' locked' : ''));
    const thumbSrc = s.items.find(it => it.img)?.img;
    const thumbHtml = (!unlocked)
      ? `<div class="furniture-set-icon locked-icon">🔒</div>`
      : (thumbSrc
        ? `<img class="furniture-set-icon" src="${thumbSrc}" onerror="this.outerHTML='<div class=&quot;furniture-set-icon&quot;>${s.fallbackIcon}</div>'">`
        : `<div class="furniture-set-icon">${s.fallbackIcon}</div>`);
    row.innerHTML = `
      <div class="furniture-set-head">
        ${thumbHtml}
        <div class="furniture-set-mid">
          <b>${esc(s.name)}</b>
          <div class="small muted">${esc(biome.name)} · Liv. ${biome.min}+</div>
          ${unlocked
            ? `<div class="small">${owned} / 10 pezzi${complete ? ' ✅ <b>Set completo!</b>' : ''}</div>`
            : `<div class="small muted">Sbloccato al Livello ${biome.min}</div>`}
        </div>
      </div>
      <div class="small ${complete ? 'set-bonus-active' : 'muted'}">🎁 Bonus Set: ${esc(s.setBonusDesc)}</div>`;
    if (unlocked) {
      row.classList.add('pickable');
      row.addEventListener('click', () => openFurnitureSetModal(s.id));
    }
    c.appendChild(row);
  });
}

function openFurnitureSetModal(setId) {
  const s = RPG.furnitureSetById(setId);
  const biome = RPG.BIOMES[s.biomeIdx];
  const owned = RPG.furnitureSetOwnedCount(HERO, s.id);
  const complete = owned === 10;
  let html = `<h3 class="panel-title">${s.fallbackIcon} ${esc(s.name)}</h3>
    <p class="small muted center">${esc(biome.name)} · ${owned}/10 pezzi</p>
    <p class="small center ${complete ? 'set-bonus-active' : ''}">🎁 Bonus Set: ${esc(s.setBonusDesc)}${complete ? ' — ATTIVO!' : ''}</p>
    <div class="loot-list" id="furniture-item-list"></div>
    <button class="btn wide" onclick="closeModal()">Chiudi</button>`;
  modal(html);
  const list = $('#furniture-item-list');
  const ownedIds = (HERO.furniture && HERO.furniture.owned) || [];
  s.items.forEach(it => {
    const has = ownedIds.includes(it.id);
    const row = el('div', 'loot loot-with-img furniture-item-row' + (has ? ' equipped' : '') + (it.epic ? ' rar-leggendario' : ''));
    const imgHtml = it.img
      ? `<img class="item-icon-big" src="${it.img}" onerror="this.style.visibility='hidden'">`
      : `<span class="item-icon-big furniture-fallback-icon">${s.fallbackIcon}</span>`;
    row.innerHTML = `${imgHtml}<div class="loot-body">
      <div class="loot-head"><b>${esc(it.name)}</b>${it.epic ? ' <span class="tag">EPICO</span>' : ''}${has ? ' ✅' : ''}</div>
      <div class="small muted">${esc(it.bonusText)}</div>
      <div class="small">${has ? 'Posseduto' : `🪙 ${it.price.gold} · 🪵 ${it.price.wood} · 🪨 ${it.price.stone}`}</div>
    </div>`;
    if (!has) {
      row.classList.add('pickable');
      row.addEventListener('click', () => {
        const r = RPG.buyFurniture(HERO, setId, it.id);
        persist();
        if (r && r.ok) {
          toast(r.setComplete ? `🎉 ${it.name} acquisito — SET COMPLETO! Bonus attivo!` : `${it.name} acquisito!`);
          sfx('coin');
          renderHUD();
          closeModal();
          openFurnitureSetModal(setId);
        } else {
          toast(r);
        }
      });
    }
    list.appendChild(row);
  });
}

/* ── TAB: Mappa ── */
function renderMap(c) {
  const biome = RPG.currentBiome(HERO.level);

  // ── Il bioma attuale, con progresso verso il prossimo ──
  const span = biome.max - biome.min + 1;
  const pctBiome = Math.min(100, Math.round((HERO.level - biome.min + 1) / span * 100));
  const hdr = el('div', 'biome-hero');
  hdr.innerHTML = `
    <div class="biome-hero-name">${biome.name}</div>
    <div class="biome-hero-lv small">Livelli ${biome.min}–${biome.max}</div>
    <div class="membar slim"><div class="membar-fill gold" style="width:${pctBiome}%"></div><span>Liv. ${HERO.level}</span></div>`;
  const slug = RPG.biomeSlug(biome);
  if (slug) {
    const bg = new Image();
    bg.onload = () => { hdr.style.backgroundImage = `linear-gradient(180deg, rgba(28,18,9,.25), rgba(28,18,9,.85)), url('assets/biomi/${slug}.png')`; hdr.classList.add('has-diorama'); };
    bg.src = `assets/biomi/${slug}.png`;
  }
  c.appendChild(hdr);

  // ── Incursione del giorno ──
  if (HERO.incursion && !HERO.incursion.done) {
    const inc = HERO.incursion;
    const p = el('div', 'panel incursion-panel');
    p.appendChild(el('h3', 'panel-title', `⚡ INCURSIONE — solo oggi!`));
    if (inc.enemy !== 'cavaliere-drago') {
      const img = el('img', 'incursion-img');
      img.src = `assets/bestiario/${inc.enemy}.png`;
      p.appendChild(img);
    }
    p.appendChild(el('p', 'center', `<b>${esc(inc.name)}</b>`));
    const pct = Math.min(100, Math.round(inc.progressKm / inc.km * 100));
    p.appendChild(el('div', 'membar', `<div class="membar-fill danger" style="width:${pct}%"></div><span>${inc.progressKm.toFixed(1)} / ${inc.km} km</span>`));
    p.appendChild(el('p', 'muted small center',
      `Forziere con oggetto ${RPG.RARITIES[inc.minRarity].label} o superiore.<br>` +
      `<b class="cd-hot"><span data-cd="midnight">…</span> alla scadenza!</b>`));
    c.appendChild(p);
  } else if (HERO.incursion && HERO.incursion.done) {
    c.appendChild(el('div', 'panel done-strip', `✅ <b>Incursione di oggi respinta!</b> <span class="small muted">Torna domani.</span>`));
  }

  // ── Missione attiva ──
  if (HERO.activeMission) {
    const m = RPG.MISSIONS.find(x => x.id === HERO.activeMission.id);
    const p = el('div', 'panel active-mission');
    p.appendChild(el('h3', 'panel-title', `🐎 In viaggio: ${m.name}`));
    const done = HERO.activeMission.progressKm;
    const pct = Math.min(100, Math.round(done / m.km * 100));
    p.appendChild(el('div', 'membar', `<div class="membar-fill gold" style="width:${pct}%"></div><span>${done.toFixed(1)} / ${m.km} km</span>`));
    const abandon = el('button', 'btn btn-small', 'Abbandona');
    abandon.addEventListener('click', () => { HERO.activeMission = null; persist(); setTab('map'); });
    p.appendChild(abandon);
    c.appendChild(p);
  }

  // ── Missioni disponibili (un solo pannello ordinato) ──
  const avail = RPG.availableMissions(HERO);
  if (avail.length) {
    const mp = el('div', 'panel');
    mp.appendChild(el('h3', 'panel-title', '⚔️ Missioni'));
    avail.forEach(m => {
      const row = el('div', 'mission-row');
      row.appendChild(el('div', 'mission-zone-icon', zoneIcon(m.zone)));
      row.appendChild(el('div', 'mission-mid',
        `<b>${m.name}</b> <span class="tag">${m.km} km</span><br>` +
        `<span class="small muted">${zoneShort(m.zone)} — ${m.desc}</span>`));
      const btn = el('button', 'btn btn-small btn-primary', 'Parti');
      const vimg = new Image();
      vimg.onload = () => {
        btn.classList.add('btn-plaque-small');
        btn.innerHTML = '';
        vimg.className = 'plaque-img-small';
        btn.appendChild(vimg);
      };
      vimg.src = 'assets/ui/btn-viaggio.png';
      btn.disabled = !!HERO.activeMission;
      btn.addEventListener('click', () => {
        RPG.startMission(HERO, m.id); persist();
        toast(`🐎 In sella! Destinazione: ${m.name} (${m.km} km)`);
        setTab('map');
      });
      row.appendChild(btn);
      mp.appendChild(row);
    });
    c.appendChild(mp);
  }

  // ── Taglia Unica settimanale (compatta) ──
  const ev = RPG.weeklyEvent(STATE);
  const evp = el('div', 'panel event-panel');
  evp.appendChild(el('h3', 'panel-title', `${ev.icon} Taglia: ${ev.name}`));
  if (ev.claimedBy) {
    evp.appendChild(el('p', 'muted small', ev.claimedBy === HERO.name
      ? `🏆 Reclamata da TE! Ricompensa: ${ev.skin}`
      : `⛔ <b>${esc(ev.claimedBy)}</b> è arrivato prima di te questa settimana.`));
  } else {
    evp.appendChild(el('p', 'muted small',
      `Primo allenamento singolo da <b>${ev.km} km</b> della settimana vince: <b>${ev.skin}</b>.<br>` +
      `<b class="cd-hot"><span data-cd="week">…</span> alla fine dell'evento</b>`));
    const btn = el('button', 'btn wide btn-small', `Reclama la Taglia`);
    btn.addEventListener('click', () => {
      const last = HERO.log[0];
      const today = new Date().toISOString().slice(0, 10);
      if (last && new Date(last.date).toISOString().slice(0, 10) === today && last.km >= ev.km) {
        if (RPG.claimEvent(STATE, HERO, ev)) {
          persist();
          toast(`🏆 ${ev.skin} è TUO!`);
          setTab('map');
        }
      } else {
        toast(`Serve un allenamento di almeno ${ev.km} km oggi per reclamarla!`);
      }
    });
    evp.appendChild(btn);
  }
  c.appendChild(evp);

  // ── Atlante: griglia dei 20 biomi ──
  const ap = el('div', 'panel');
  ap.appendChild(el('h3', 'panel-title', '📖 L\'Atlante del Reame'));
  const grid = el('div', 'biome-grid');
  RPG.BIOMES.forEach(b => {
    const open = HERO.level >= b.min;
    const cell = el('div', 'biome-cell' + (open ? '' : ' locked') + (b === biome ? ' current' : ''));
    const slug = RPG.biomeSlug(b);
    const iconHtml = open && slug
      ? `<img class="biome-cell-icon-img" src="assets/ui/biomi/${slug}.png" onerror="this.outerHTML='<div class=&quot;biome-cell-icon&quot;>${b.icon}</div>'">`
      : `<div class="biome-cell-icon">${open ? b.icon : '🔒'}</div>`;
    cell.innerHTML = `${iconHtml}
      <div class="biome-cell-name">${open ? zoneShort(b.name) : '???'}</div>
      <div class="biome-cell-lv">${b.min}–${b.max}</div>`;
    cell.addEventListener('click', () => showBiomePreview(b, open));
    grid.appendChild(cell);
  });
  ap.appendChild(grid);
  c.appendChild(ap);
}

function zoneShort(zone) {
  return zone.replace(/^(Il |La |Le |L')/, '');
}

function zoneIcon(zone) {
  const b = RPG.BIOMES.find(x => x.name === zone);
  return b ? b.icon : '📍';
}

/* ── TAB: Allenati ── */
function renderTrain(c) {
  c.appendChild(el('h2', 'section-title', '⚔️ Registra l\'Impresa'));
  c.appendChild(el('p', 'muted small center',
    `Obiettivo del giorno per il tuo livello: <b>${RPG.dailyGoalKm(HERO.level)} km</b>` +
    (HERO.restBonus ? ' · ✨ <b>Bonus Riposo x2 attivo!</b>' : '')));

  const form = el('div', 'panel');
  form.appendChild(el('label', 'field-label', 'Tipo di attività'));
  const actRow = el('div', 'act-row');
  let chosen = 'camminata';
  const ACT_ICON_FILES = { cyclette: 'assets/ui/act-cyclette.png', camminata: 'assets/ui/act-camminata.png', corsa: 'assets/ui/act-corsa.png' };
  Object.entries(RPG.ACTIVITIES).forEach(([key, a]) => {
    const b = el('button', 'act-choice' + (key === chosen ? ' selected' : ''));
    const iconHolder = el('div', 'act-icon-holder', a.icon);
    if (ACT_ICON_FILES[key]) {
      const img = el('img', 'act-icon');
      img.src = ACT_ICON_FILES[key];
      img.addEventListener('load', () => { iconHolder.textContent = ''; iconHolder.appendChild(img); });
    }
    b.appendChild(iconHolder);
    b.appendChild(el('div', '', `${a.label}<br><span class="small muted">${a.xpPerKm} XP/km</span>`));
    b.dataset.key = key;
    b.addEventListener('click', () => {
      chosen = key;
      actRow.querySelectorAll('.act-choice').forEach(x => x.classList.toggle('selected', x.dataset.key === key));
    });
    actRow.appendChild(b);
  });
  form.appendChild(actRow);

  form.appendChild(el('label', 'field-label', 'Chilometri percorsi (dall\'app Salute / Fitness)'));
  const kmInput = el('input', 'input');
  kmInput.type = 'number'; kmInput.step = '0.1'; kmInput.min = '0'; kmInput.placeholder = 'Es. 5.2';
  form.appendChild(kmInput);
  form.appendChild(el('p', 'muted small',
    '📱 Apri l\'app <b>Salute</b> (o Strava/Fitness), leggi i km di oggi e riportali qui.'));

  const go = el('button', 'btn btn-primary wide big', '🔥 SINCRONIZZA AVVENTURA');
  const plaque = new Image();
  plaque.onload = () => {
    go.classList.add('btn-plaque');
    go.innerHTML = '';
    plaque.className = 'plaque-img';
    go.appendChild(plaque);
    go.appendChild(el('div', 'plaque-caption', 'Sincronizza Avventura'));
  };
  plaque.src = 'assets/ui/btn-gioca.png';
  go.addEventListener('click', () => {
    const km = parseFloat(kmInput.value);
    const report = RPG.logWorkout(HERO, chosen, km);
    if (report.error) { modal(`<h3 class="panel-title">⏳ Il Custode del Tempo</h3><p>${report.error}</p>
      <button class="btn btn-primary wide" onclick="closeModal()">Va bene…</button>`); return; }
    persist();
    renderHUD();
    sfx(report.levelsGained.length ? 'level' : 'coin');
    showReport(report);
  });
  form.appendChild(go);
  c.appendChild(form);

  // ── L'Arena dei Guerrieri ──
  const left = RPG.battlesLeft(HERO);
  const ap = el('div', 'panel arena-panel');
  ap.appendChild(el('h3', 'panel-title', '⚔️ L\'Arena dei Guerrieri'));
  ap.appendChild(el('p', 'muted small',
    'Sfida un nemico a duello! Scegli tra Fendente, Parata e Incantesimo: vinci <b>3 round su 5</b> e apri un forziere. Puoi combattere <b>5 volte al giorno</b>.'));
  ap.appendChild(el('div', 'arena-tokens', `🎫 Sfide rimaste oggi: <b>${left}</b> / ${RPG.BATTLE_MAX_DAY}`));
  const abtn = el('button', 'btn btn-primary wide big', left > 0 ? '⚔️ ENTRA NELL\'ARENA' : '⏳ Torna domani per nuove sfide');
  abtn.disabled = left < 1;
  abtn.addEventListener('click', openArena);
  ap.appendChild(abtn);
  c.appendChild(ap);

  renderMiniGamesHub(c);
}

/* ═══════════════════════════════════════════════════════════
   MINIGIOCHI — Taverna delle Sfide
   ═══════════════════════════════════════════════════════════ */

function getMG(id) {
  const d = HERO.miniGames[id] || { last: null, n: 0 };
  if (d.last !== todayISO()) d.n = 0;
  HERO.miniGames[id] = d;
  return d;
}
const MG_MAX = { dice:1, cards:3, runes:3, forge:2, archery:3, wheel:1, memory:2, tap:3, wham:3 };
// ── Bilanciamento economia ───────────────────────────────────────────────────
// Allenamento base (5 km camminata): gold≈25  xp≈75  wood≈0  stone≈0
// Target mini-giochi totale/die:     gold≈80  xp≈500 wood≈15 stone≈15
//   → i giochi valgono ≈3× una sessione; chi si allena accumula molto di più
//
// Earning stimato per gioco (avg, tutte le giocate al cap):
//   dado     ×1  → gold≈16  xp≈18   wood≈2   stone≈2
//   carte    ×3  → gold≈18  xp≈42   wood≈12  stone≈12
//   rune     ×3  → gold≈0   xp≈120
//   forgia   ×2  → sink risorse, rende xp 50-100 a giocata
//   balestra ×3  → gold≈30  xp≈0    (formula: totalScore×0.5, max 90pt)
//   ruota    ×1  → gold≈16  xp≈14   wood≈2   stone≈4
//   memory   ×2  → gold≈20  xp≈120
//   fulmine  ×3  → gold≈20  xp≈168
//   caccia   ×3  → gold≈18  xp≈189
//   TOTALE       → gold≈138 xp≈671  wood≈16  stone≈18
//
// Costanti usate dai giochi (modifica qui, non nei singoli giochi):
const MG_B = {
  archery: { goldPerPt: 0.5 },          // max totalScore=90 → max 45 gold/tiro
  memory:  { xpBase: 80, xpPenalty: 10, goldBase: 18, goldPenalty: 2 },
  tap:     { xpMult: 0.80, goldMult: 0.12 }, // power 0-100 × mult
  wham:    { xpPerHit: 7,  goldPerHit: 2 },   // cap naturale ~12 anime
  wheel: [
    { reward:{ gold:25 },          label:'🪙 25',  color:'#5a3db0' },
    { reward:{ xp:40  },           label:'⭐ 40',  color:'#c0831a' },
    { reward:{ wood:20, stone:20 },label:'🪵🪨',  color:'#2d6a2d' },
    { reward:{ gold:60, xp:60 },   label:'🏆 JAK', color:'#b53020' },
    { reward:{ stone:25 },         label:'🪨 25',  color:'#1a5a8a' },
    { reward:{ xp:25  },           label:'⭐ 25',  color:'#5a3db0' },
    { reward:{ gold:35 },          label:'🪙 35',  color:'#c0831a' },
    { reward:{ gold:0  },          label:'💀',     color:'#2a2a2a' },
  ],
};
// ────────────────────────────────────────────────────────────────────────────
function mgCanPlay(id) { return getMG(id).n < MG_MAX[id]; }
function mgRecord(id) { const m = getMG(id); m.n++; m.last = todayISO(); persist(); }
function mgGiveReward(r) {
  if (r.gold)  HERO.gold  = Math.max(0, (HERO.gold  || 0) + r.gold);
  if (r.wood)  HERO.wood  = Math.max(0, (HERO.wood  || 0) + r.wood);
  if (r.stone) HERO.stone = Math.max(0, (HERO.stone || 0) + r.stone);
  if (r.xp)   HERO.xp    = (HERO.xp || 0) + r.xp;
  persist(); renderHUD();
}
function mgRewardHTML(r, title, sub) {
  const lines = [];
  if (r.xp)             lines.push(`⭐ +${r.xp} XP`);
  if (r.gold  > 0)      lines.push(`🪙 +${r.gold} Oro`);
  if (r.wood)           lines.push(`🪵 +${r.wood} Legna`);
  if (r.stone)          lines.push(`🪨 +${r.stone} Pietra`);
  if (r.gold  < 0)      lines.push(`🪙 ${r.gold} Oro`);
  return `<div class="mg-reward"><div class="mg-reward-title">${title}</div>${sub?`<div class="mg-reward-sub">${sub}</div>`:''}<div class="mg-reward-lines">${lines.map(l=>`<span class="mg-rl">${l}</span>`).join('')}</div></div>`;
}

let _mgRAF = null;

function mgOverlay(inner, bgUrl) {
  let ov = document.getElementById('mg-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'mg-ov'; document.body.appendChild(ov); }
  ov.className = 'mg-overlay' + (bgUrl ? ' mg-has-bg' : '');
  ov.style.backgroundImage = bgUrl ? `url('${bgUrl}')` : '';
  ov.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'mg-box';
  box.appendChild(inner);
  ov.appendChild(box);
}
function mgClose() {
  if (_mgRAF) { cancelAnimationFrame(_mgRAF); _mgRAF = null; }
  const ov = document.getElementById('mg-ov');
  if (!ov) return;
  ov.classList.add('mg-out');
  setTimeout(() => { ov.className = ''; ov.innerHTML = ''; setTab('train'); }, 280);
}

/* Hub */
const MG_CATEGORIES = [
  { id:'fortuna',    icon:'✨', label:'Fortuna',    games:[
    { id:'dice',    emoji:'🎲', name:'Dado',         open: openDiceGame },
    { id:'cards',   emoji:'🃏', name:'Carte',        open: openCardsGame },
    { id:'wheel',   emoji:'🎡', name:'Ruota',        open: openWheelGame },
  ]},
  { id:'abilita',    icon:'⚔️', label:'Abilità',    games:[
    { id:'archery', emoji:'🏹', name:'Balestra',     open: openArcheryGame },
    { id:'tap',     emoji:'⚡', name:'Fulmine',      open: openTapGame },
    { id:'wham',    emoji:'🌀', name:'Caccia Anime', open: openWhamGame },
  ]},
  { id:'intelletto', icon:'🧩', label:'Intelletto', games:[
    { id:'runes',   emoji:'🔮', name:'Rune Magiche', open: openRunesGame },
    { id:'memory',  emoji:'🧠', name:'Memory',       open: openMemoryGame },
    { id:'forge',   emoji:'🔥', name:'Forgia',       open: openForgeGame },
  ]},
];

function renderMiniGamesHub(c) {
  const hub = document.createElement('div');
  hub.className = 'panel mg-hub';

  const hdrRow = document.createElement('div');
  hdrRow.className = 'mg-hub-hdr';
  hdrRow.innerHTML = `<h3 class="panel-title" style="margin:0">🎮 Taverna delle Sfide</h3>`;
  // badge totale giocate disponibili
  const totalRem = MG_CATEGORIES.flatMap(cat => cat.games).reduce((s, g) => {
    const m = getMG(g.id);
    return s + Math.max(0, MG_MAX[g.id] - m.n);
  }, 0);
  const totalMax = Object.values(MG_MAX).reduce((a, b) => a + b, 0);
  if (totalRem > 0) {
    const badge = document.createElement('span');
    badge.className = 'mg-total-badge';
    badge.textContent = `${totalRem} disponibili`;
    hdrRow.appendChild(badge);
  }
  hub.appendChild(hdrRow);

  MG_CATEGORIES.forEach(cat => {
    const avail = cat.games.reduce((s, g) => s + Math.max(0, MG_MAX[g.id] - getMG(g.id).n), 0);
    const maxCat = cat.games.reduce((s, g) => s + MG_MAX[g.id], 0);
    const allDone = avail === 0;

    const section = document.createElement('div');
    section.className = 'mg-category' + (allDone ? ' mg-cat-done' : '');

    // Header categoria con barra progresso
    const catHdr = document.createElement('div');
    catHdr.className = 'mg-cat-hdr';
    const pct = Math.round((maxCat - avail) / maxCat * 100);
    catHdr.innerHTML = `
      <span class="mg-cat-icon">${cat.icon}</span>
      <span class="mg-cat-label">${cat.label}</span>
      <div class="mg-cat-bar"><div class="mg-cat-bar-fill" style="width:${pct}%"></div></div>
      <span class="mg-cat-count">${allDone ? '✓' : avail}</span>`;
    section.appendChild(catHdr);

    const grid = document.createElement('div');
    grid.className = 'mg-grid';
    cat.games.forEach(g => {
      const m = getMG(g.id), max = MG_MAX[g.id], rem = max - m.n, done = rem <= 0;
      const card = document.createElement('div');
      card.className = 'mg-card' + (done ? ' mg-done' : ' mg-avail');
      card.innerHTML = `<div class="mg-card-shine"></div>
        ${!done ? `<span class="mg-card-badge">×${rem}</span>` : ''}
        <div class="mg-emoji">${g.emoji}</div>
        <div class="mg-name">${g.name}</div>
        <div class="mg-pips">${Array.from({length:max},(_,i)=>`<span class="mg-pip${i<m.n?' used':''}"></span>`).join('')}</div>`;
      if (!done) card.addEventListener('click', g.open);
      grid.appendChild(card);
    });
    section.appendChild(grid);
    hub.appendChild(section);
  });

  c.appendChild(hub);
}

/* ── 🎲 DADO DEL DESTINO ── */
function openDiceGame() {
  if (!mgCanPlay('dice')) return;
  const OUTCOMES = [
    { dots:1, title:'Fortuna Esigua',    reward:{ gold:8 } },
    { dots:2, title:'Dono della Terra',  reward:{ stone:15 } },
    { dots:3, title:'Bosco Generoso',    reward:{ wood:15 } },
    { dots:4, title:'Grazia degli Dei',  reward:{ gold:30 } },
    { dots:5, title:'Benedizione',       reward:{ xp:50 } },
    { dots:6, title:'✨ JACKPOT! ✨',    reward:{ gold:60, xp:60 } },
  ];
  const FACE_ROT = [null,{x:0,y:0},{x:0,y:180},{x:0,y:90},{x:0,y:-90},{x:-90,y:0},{x:90,y:0}];
  const DOTS_GRID = [null,
    [0,0,0, 0,1,0, 0,0,0],
    [0,0,1, 0,0,0, 1,0,0],
    [0,0,1, 0,1,0, 1,0,0],
    [1,0,1, 0,0,0, 1,0,1],
    [1,0,1, 0,1,0, 1,0,1],
    [1,0,1, 1,0,1, 1,0,1],
  ];
  const makeFace = n => {
    const g = document.createElement('div'); g.className = 'mgd-grid';
    DOTS_GRID[n].forEach(on => {
      const cell = document.createElement('div'); cell.className = 'mgd-cell';
      if (on) { const dot = document.createElement('div'); dot.className = 'mgd-dot'; cell.appendChild(dot); }
      g.appendChild(cell);
    });
    return g.outerHTML;
  };

  const outcome = OUTCOMES[Math.floor(Math.random() * 6)];
  const wrap = document.createElement('div');
  wrap.className = 'mg-dice-wrap';
  wrap.innerHTML = `
    <button class="mg-x-btn" id="mgd-x">✕</button>
    <div class="mg-game-title">🎲 Dado del Destino</div>
    <div class="mgd-scene"><div class="mgd-cube" id="mgd-cube">
      ${[1,2,3,4,5,6].map(n=>`<div class="mgd-face mgd-f${n}">${makeFace(n)}</div>`).join('')}
    </div></div>
    <p class="mg-hint" id="mgd-hint">Tocca il dado per lanciarlo</p>
    <div class="mg-result-area" id="mgd-res"></div>
    <button class="btn mg-close-btn hidden" id="mgd-close">Continua ›</button>`;
  mgOverlay(wrap);

  const cube = document.getElementById('mgd-cube');
  const hint = document.getElementById('mgd-hint');
  const resEl = document.getElementById('mgd-res');
  const closeBtn = document.getElementById('mgd-close');
  let rolled = false;

  cube.addEventListener('click', () => {
    if (rolled) return; rolled = true;
    vibrate(30);
    const fr = FACE_ROT[outcome.dots];
    cube.style.transition = 'transform 2s cubic-bezier(.2,.8,.3,1)';
    cube.style.transform = `rotateX(${fr.x + 1080}deg) rotateY(${fr.y + 1080}deg)`;
    hint.textContent = '…';
    setTimeout(() => {
      mgGiveReward(outcome.reward);
      mgRecord('dice');
      resEl.innerHTML = mgRewardHTML(outcome.reward, outcome.title);
      resEl.classList.add('mg-res-in');
      closeBtn.classList.remove('hidden');
      hint.style.display = 'none';
      if (outcome.dots === 6) { resEl.classList.add('mg-jackpot'); vibrate([50,30,50,30,100]); }
    }, 2200);
  });
  document.getElementById('mgd-x').addEventListener('click', mgClose);
  closeBtn.addEventListener('click', mgClose);
}

/* ── 🃏 CARTE DEL MERCANTE ── */
function openCardsGame() {
  if (!mgCanPlay('cards')) return;
  const POOL = [
    { title:'Premio Piccolo',  reward:{ gold:10 },          trap:false },
    { title:'Premio Grande',   reward:{ gold:30, xp:20 },   trap:false },
    { title:'Bonus Mistico',   reward:{ xp:50 },            trap:false },
    { title:'Dono del Bosco',  reward:{ wood:20, stone:20 },trap:false },
    { title:'Maledizione!',    reward:{ gold:-10 },         trap:true  },
  ];
  const cards = [...POOL].sort(()=>Math.random()-.5).slice(0,3);
  const wrap = document.createElement('div');
  wrap.className = 'mg-cards-wrap';
  wrap.innerHTML = `
    <button class="mg-x-btn" id="mgc-x">✕</button>
    <div class="mg-game-title">🃏 Carte del Mercante</div>
    <p class="mg-hint" id="mgc-hint">Scegli una carta</p>
    <div class="mg-cards-row" id="mgc-row"></div>
    <div class="mg-result-area" id="mgc-res"></div>
    <button class="btn mg-close-btn hidden" id="mgc-close">Continua ›</button>`;
  mgOverlay(wrap, 'assets/backgrounds/carte del mercante.jpg');
  const row = document.getElementById('mgc-row');
  const hint = document.getElementById('mgc-hint');
  const resEl = document.getElementById('mgc-res');
  const closeBtn = document.getElementById('mgc-close');
  cards.forEach((card, i) => {
    const cel = document.createElement('div');
    cel.className = 'mgc-card';
    cel.innerHTML = `<div class="mgc-inner">
      <div class="mgc-back"><div class="mgc-back-ornament"></div><div class="mgc-back-sym">✦</div></div>
      <div class="mgc-front"><div class="mgc-front-icon">${card.trap?'💀':'🎁'}</div><div class="mgc-front-label">${card.title}</div></div>
    </div>`;
    cel.addEventListener('click', () => {
      row.querySelectorAll('.mgc-card').forEach(c => c.style.pointerEvents = 'none');
      cel.classList.add('mgc-flipped');
      vibrate(40);
      setTimeout(() => {
        row.querySelectorAll('.mgc-card:not(.mgc-flipped)').forEach((c,j) => {
          setTimeout(() => c.classList.add('mgc-flipped'), j * 180);
        });
        if (!card.trap) mgGiveReward(card.reward);
        else HERO.gold = Math.max(0, (HERO.gold||0) + card.reward.gold);
        mgRecord('cards');
        persist(); renderHUD();
        resEl.innerHTML = mgRewardHTML(
          card.trap ? {} : card.reward,
          card.trap ? '☠️ Maledizione del Mercante' : `✨ ${card.title}`,
          card.trap ? 'Hai perso 15 Oro!' : ''
        );
        resEl.classList.add('mg-res-in');
        closeBtn.classList.remove('hidden');
        hint.style.display = 'none';
      }, 650);
    });
    row.appendChild(cel);
  });
  document.getElementById('mgc-x').addEventListener('click', mgClose);
  closeBtn.addEventListener('click', mgClose);
}

/* ── 🔮 RUNE MAGICHE (Simon Says) ── */
function openRunesGame() {
  if (!mgCanPlay('runes')) return;
  const RUNES = [
    { sym:'🌙', color:'#7c4ddc', name:'Luna' },
    { sym:'⚡', color:'#c0942e', name:'Fulmine' },
    { sym:'🔥', color:'#b53020', name:'Fuoco' },
    { sym:'🌊', color:'#1a6fa0', name:'Onda' },
  ];
  let seq = [], playerSeq = [], round = 1, playerTurn = false, over = false;
  const wrap = document.createElement('div');
  wrap.className = 'mg-runes-wrap';
  wrap.innerHTML = `
    <button class="mg-x-btn" id="mgr-x">✕</button>
    <div class="mg-game-title">🔮 Rune Magiche</div>
    <div class="mg-rune-status">Round <span id="mgr-round">1</span></div>
    <p class="mg-hint" id="mgr-hint">Osserva la sequenza…</p>
    <div class="mg-rune-grid" id="mgr-grid"></div>
    <div class="mg-result-area" id="mgr-res"></div>
    <button class="btn mg-close-btn hidden" id="mgr-close">Continua ›</button>`;
  mgOverlay(wrap);
  const grid = document.getElementById('mgr-grid');
  const hint = document.getElementById('mgr-hint');
  const roundEl = document.getElementById('mgr-round');
  const resEl = document.getElementById('mgr-res');
  const closeBtn = document.getElementById('mgr-close');
  const btns = RUNES.map((r,i) => {
    const b = document.createElement('button');
    b.className = 'mgr-btn'; b.style.setProperty('--rc', r.color);
    b.innerHTML = `<span class="mgr-sym">${r.sym}</span><span class="mgr-lbl">${r.name}</span>`;
    b.addEventListener('click', () => onRune(i));
    grid.appendChild(b); return b;
  });
  function flashRune(i, ms=550) {
    return new Promise(res => {
      btns[i].classList.add('mgr-lit'); vibrate(30);
      setTimeout(() => { btns[i].classList.remove('mgr-lit'); res(); }, ms);
    });
  }
  async function playSeq() {
    playerTurn = false; hint.textContent = 'Osserva…';
    await new Promise(r => setTimeout(r, 700));
    for (const i of seq) { await flashRune(i,550); await new Promise(r=>setTimeout(r,220)); }
    playerTurn = true; playerSeq = [];
    hint.textContent = `Ripeti! (${seq.length} rune)`;
  }
  async function onRune(i) {
    if (!playerTurn || over) return;
    await flashRune(i, 220);
    playerSeq.push(i);
    const pos = playerSeq.length - 1;
    if (playerSeq[pos] !== seq[pos]) {
      over = true; playerTurn = false;
      hint.textContent = '❌ Errore!';
      grid.classList.add('mgr-shake');
      const xp = Math.max(0, (round-1)*15);
      mgGiveReward({ xp });
      mgRecord('runes');
      setTimeout(() => {
        resEl.innerHTML = mgRewardHTML({xp}, `${round>1?`Round ${round-1} completato!`:'Prima volta?'}`, round>1?'':'Studia meglio le rune…');
        resEl.classList.add('mg-res-in'); closeBtn.classList.remove('hidden');
      }, 700);
      return;
    }
    if (playerSeq.length === seq.length) {
      round++; roundEl.textContent = round; hint.textContent = '✅ Corretto!';
      seq.push(Math.floor(Math.random()*4));
      setTimeout(() => playSeq(), 900);
    }
  }
  seq = Array.from({length:3}, ()=>Math.floor(Math.random()*4));
  setTimeout(() => playSeq(), 600);
  document.getElementById('mgr-x').addEventListener('click', mgClose);
  closeBtn.addEventListener('click', mgClose);
}

/* ── 🔥 FORGIA EROICA ── */
function openForgeGame() {
  if (!mgCanPlay('forge')) return;
  const RECIPES = [
    { a:'wood',  b:'wood',  ca:10, cb:10, name:'Pozione Vitale',    icon:'🧪', reward:{xp:50} },
    { a:'stone', b:'stone', ca:10, cb:10, name:'Amuleto di Pietra',  icon:'🪬', reward:{xp:50} },
    { a:'wood',  b:'stone', ca:8,  cb:8,  name:'Attrezzi da Campo',  icon:'⚒️', reward:{gold:35} },
    { a:'gold',  b:'wood',  ca:15, cb:15, name:'Frecce Magiche',     icon:'✨', reward:{xp:80} },
    { a:'gold',  b:'stone', ca:15, cb:15, name:'Lingotto Epico',     icon:'🏅', reward:{xp:100, gold:20} },
  ];
  const RES = { wood:'🪵 Legna', stone:'🪨 Pietra', gold:'🪙 Oro' };
  const has = k => HERO[k] || 0;
  const wrap = document.createElement('div');
  wrap.className = 'mg-forge-wrap';
  wrap.innerHTML = `
    <button class="mg-x-btn" id="mgf-x">✕</button>
    <div class="mg-game-title">🔥 Forgia Eroica</div>
    <div class="mg-forge-res"><span>🪙 <b id="mgf-g">${has('gold')}</b></span><span>🪵 <b id="mgf-w">${has('wood')}</b></span><span>🪨 <b id="mgf-s">${has('stone')}</b></span></div>
    <div class="mg-forge-list" id="mgf-list"></div>
    <div class="mg-forge-fire-wrap hidden" id="mgf-fire">
      <div class="mgf-ember mgf-e1"></div><div class="mgf-ember mgf-e2"></div><div class="mgf-ember mgf-e3"></div>
      <div class="mgf-flame mgf-fl1"></div><div class="mgf-flame mgf-fl2"></div><div class="mgf-flame mgf-fl3"></div>
    </div>
    <div class="mg-result-area" id="mgf-res"></div>
    <button class="btn mg-close-btn hidden" id="mgf-close">Continua ›</button>`;
  mgOverlay(wrap, 'assets/backgrounds/forgia eroica.jpg');
  const list = document.getElementById('mgf-list');
  const fireEl = document.getElementById('mgf-fire');
  const resEl = document.getElementById('mgf-res');
  const closeBtn = document.getElementById('mgf-close');
  RECIPES.forEach(r => {
    const canCraft = r.a === r.b ? has(r.a) >= r.ca + r.cb : has(r.a) >= r.ca && has(r.b) >= r.cb;
    const row = document.createElement('div');
    row.className = 'mgf-recipe' + (canCraft ? '' : ' mgf-locked');
    row.innerHTML = `
      <div class="mgf-ingredients"><span>${RES[r.a].split(' ')[0]} <b>${r.ca}</b></span><span class="mgf-plus">+</span><span>${RES[r.b].split(' ')[0]} <b>${r.cb}</b></span><span class="mgf-arrow">→</span><span class="mgf-out-icon">${r.icon}</span></div>
      <div class="mgf-recipe-name">${r.name}</div>`;
    if (canCraft) row.addEventListener('click', () => {
      list.querySelectorAll('.mgf-recipe').forEach(el => el.style.pointerEvents = 'none');
      row.classList.add('mgf-selected');
      vibrate(40);
      if (r.a === r.b) HERO[r.a] = Math.max(0, has(r.a) - r.ca - r.cb);
      else { HERO[r.a] = Math.max(0, has(r.a) - r.ca); HERO[r.b] = Math.max(0, has(r.b) - r.cb); }
      persist(); renderHUD();
      fireEl.classList.remove('hidden');
      setTimeout(() => {
        mgGiveReward(r.reward);
        mgRecord('forge');
        fireEl.classList.add('hidden');
        resEl.innerHTML = `<div class="mgf-craft-icon">${r.icon}</div>` + mgRewardHTML(r.reward, r.name, 'Forgiato con successo!');
        resEl.classList.add('mg-res-in'); closeBtn.classList.remove('hidden');
      }, 2200);
    });
    list.appendChild(row);
  });
  document.getElementById('mgf-x').addEventListener('click', mgClose);
  closeBtn.addEventListener('click', mgClose);
}

/* ── 🏹 TIRO ALLA BALESTRA ── */
function openArcheryGame() {
  if (!mgCanPlay('archery')) return;
  let pos = 0, dir = 1, totalScore = 0, shots = 3, canShoot = true;
  const wrap = document.createElement('div');
  wrap.className = 'mg-archery-wrap';
  wrap.innerHTML = `
    <button class="mg-x-btn" id="mga-x">✕</button>
    <div class="mg-game-title">🏹 Tiro alla Balestra</div>
    <p class="mg-hint" id="mga-hint">Tocca il bersaglio!</p>
    <div class="mga-scene">
      <div class="mga-target" id="mga-target">
        <div class="mga-ring r4"></div><div class="mga-ring r3"></div>
        <div class="mga-ring r2"></div><div class="mga-ring r1"></div>
        <div class="mga-bull"></div>
        <div class="mga-hit-label" id="mga-hit"></div>
      </div>
      <div class="mga-bar-wrap"><div class="mga-bar" id="mga-bar"></div></div>
      <div class="mga-shots" id="mga-shots">${'<span class="mga-arrow-pip">🏹</span>'.repeat(3)}</div>
    </div>
    <div class="mga-total">Punteggio: <span id="mga-score">0</span>/90</div>
    <div class="mg-result-area" id="mga-res"></div>
    <button class="btn mg-close-btn hidden" id="mga-close">Continua ›</button>`;
  mgOverlay(wrap, 'assets/backgrounds/tiro alla balestra.jpg');
  const bar = document.getElementById('mga-bar');
  const hint = document.getElementById('mga-hint');
  const scoreEl = document.getElementById('mga-score');
  const shotsEl = document.getElementById('mga-shots');
  const resEl = document.getElementById('mga-res');
  const closeBtn = document.getElementById('mga-close');
  const hitLabel = document.getElementById('mga-hit');
  const target = document.getElementById('mga-target');

  function getZone(p) {
    const d = Math.abs(p - 50);
    if (d <= 7)  return { pts:30, label:'BULLSEYE! 🎯', cls:'mga-h-bull' };
    if (d <= 16) return { pts:20, label:'Ottimo! ⭐',   cls:'mga-h-good' };
    if (d <= 28) return { pts:12, label:'Buono',         cls:'mga-h-ok' };
    if (d <= 40) return { pts:6,  label:'Ok',            cls:'mga-h-meh' };
    return { pts:2, label:'Mancato', cls:'mga-h-miss' };
  }

  function tick() {
    pos += dir * 1.6;
    if (pos >= 100) { pos = 100; dir = -1; }
    if (pos <= 0)   { pos = 0;   dir = 1; }
    bar.style.left = pos + '%';
    _mgRAF = requestAnimationFrame(tick);
  }

  function shoot() {
    if (!canShoot || shots <= 0) return;
    canShoot = false;
    cancelAnimationFrame(_mgRAF); _mgRAF = null;
    vibrate(40);
    const zone = getZone(pos);
    totalScore += zone.pts;
    shots--;
    scoreEl.textContent = totalScore;
    hitLabel.textContent = zone.label;
    hitLabel.className = 'mga-hit-label ' + zone.cls;
    hitLabel.style.opacity = '1';
    const pips = shotsEl.querySelectorAll('.mga-arrow-pip');
    if (pips[shots]) pips[shots].classList.add('mga-pip-used');
    setTimeout(() => {
      hitLabel.style.opacity = '0';
      if (shots > 0) {
        hint.textContent = 'Tocca!';
        canShoot = true;
        _mgRAF = requestAnimationFrame(tick);
      } else {
        const gold = Math.round(totalScore * MG_B.archery.goldPerPt);
        mgGiveReward({ gold });
        mgRecord('archery');
        resEl.innerHTML = mgRewardHTML({ gold }, `Punteggio: ${totalScore} / 90`, totalScore >= 70 ? '🏆 Leggendario!' : totalScore >= 40 ? '⭐ Buona mira!' : 'Continua ad allenarti');
        resEl.classList.add('mg-res-in'); closeBtn.classList.remove('hidden');
        hint.style.display = 'none';
      }
    }, 900);
  }

  target.addEventListener('click', shoot);
  document.getElementById('mga-x').addEventListener('click', mgClose);
  closeBtn.addEventListener('click', mgClose);
  setTimeout(() => { _mgRAF = requestAnimationFrame(tick); }, 400);
}

/* ── 🎡 RUOTA DELLA FORTUNA ── */
function openWheelGame() {
  if (!mgCanPlay('wheel')) return;
  const N = 8, DEG = 360 / N;
  const SECTORS = MG_B.wheel;
  const conic = SECTORS.map((s,i) => `${s.color} ${i*DEG}deg ${(i+1)*DEG}deg`).join(',');
  const idx = Math.floor(Math.random() * N);
  const wrap = document.createElement('div');
  wrap.className = 'mg-wheel-wrap';
  wrap.innerHTML = `
    <button class="mg-x-btn" id="mgw-x">✕</button>
    <div class="mg-game-title">🎡 Ruota della Fortuna</div>
    <div class="mgw-scene">
      <div class="mgw-pointer">▼</div>
      <div class="mgw-wheel" id="mgw-wheel" style="background:conic-gradient(${conic})">
        ${SECTORS.map((s,i)=>`<span class="mgw-lbl" style="--a:${i*DEG+DEG/2}deg">${s.label}</span>`).join('')}
        <div class="mgw-hub"></div>
      </div>
    </div>
    <button class="btn btn-primary wide mgw-spin-btn" id="mgw-spin">🎡 Gira la Ruota!</button>
    <div class="mg-result-area" id="mgw-res"></div>
    <button class="btn mg-close-btn hidden" id="mgw-close">Continua ›</button>`;
  mgOverlay(wrap);
  const wheel = document.getElementById('mgw-wheel');
  const spinBtn = document.getElementById('mgw-spin');
  const resEl = document.getElementById('mgw-res');
  const closeBtn = document.getElementById('mgw-close');
  let spun = false;
  spinBtn.addEventListener('click', () => {
    if (spun) return; spun = true; spinBtn.disabled = true; vibrate(30);
    const totalRot = 5 * 360 + idx * DEG + DEG / 2;
    wheel.style.transition = 'transform 3.5s cubic-bezier(.05,.9,.1,1)';
    wheel.style.transform = `rotate(${totalRot}deg)`;
    setTimeout(() => {
      const s = SECTORS[idx];
      if (s.reward.gold > 0 || s.reward.xp || s.reward.wood || s.reward.stone) mgGiveReward(s.reward);
      mgRecord('wheel');
      resEl.innerHTML = mgRewardHTML(s.reward, idx === 3 ? '🏆 JACKPOT!' : idx === 7 ? '💀 Sfiga!' : s.label, idx === 7 ? 'Nessuna ricompensa.' : '');
      resEl.classList.add('mg-res-in'); closeBtn.classList.remove('hidden');
    }, 3700);
  });
  document.getElementById('mgw-x').addEventListener('click', mgClose);
  closeBtn.addEventListener('click', mgClose);
}

/* ── 🧠 MEMORY DELLE RUNE ── */
function openMemoryGame() {
  if (!mgCanPlay('memory')) return;
  const SYMS = ['🌙','⚡','🔥','🌊','⚔️','🛡️'];
  const pairs = [...SYMS,...SYMS].sort(()=>Math.random()-.5);
  let flipped=[], matched=0, mistakes=0, locked=false;
  const wrap = document.createElement('div');
  wrap.className = 'mg-memory-wrap';
  wrap.innerHTML = `
    <button class="mg-x-btn" id="mgm-x">✕</button>
    <div class="mg-game-title">🧠 Memory delle Rune</div>
    <div class="mgm-hud">Coppie <span id="mgm-m">0</span>/6 · Errori <span id="mgm-e">0</span></div>
    <div class="mgm-grid" id="mgm-grid"></div>
    <div class="mg-result-area" id="mgm-res"></div>
    <button class="btn mg-close-btn hidden" id="mgm-close">Continua ›</button>`;
  mgOverlay(wrap);
  const grid = document.getElementById('mgm-grid');
  const mEl = document.getElementById('mgm-m');
  const eEl = document.getElementById('mgm-e');
  const resEl = document.getElementById('mgm-res');
  const closeBtn = document.getElementById('mgm-close');
  const cardEls = pairs.map((sym, i) => {
    const c = document.createElement('div'); c.className = 'mgm-card';
    c.innerHTML = `<div class="mgm-inner"><div class="mgm-back"><span>✦</span></div><div class="mgm-front">${sym}</div></div>`;
    c.addEventListener('click', () => {
      if (locked || c.classList.contains('mgm-flipped') || c.classList.contains('mgm-ok')) return;
      c.classList.add('mgm-flipped'); vibrate(20);
      flipped.push({ c, sym });
      if (flipped.length < 2) return;
      locked = true;
      const [a, b] = flipped;
      if (a.sym === b.sym) {
        a.c.classList.add('mgm-ok'); b.c.classList.add('mgm-ok');
        matched++; mEl.textContent = matched; flipped = []; locked = false;
        if (matched === 6) {
          const xp = Math.max(10, MG_B.memory.xpBase - mistakes * MG_B.memory.xpPenalty), gold = Math.max(3, MG_B.memory.goldBase - mistakes * MG_B.memory.goldPenalty);
          mgGiveReward({ xp, gold }); mgRecord('memory');
          resEl.innerHTML = mgRewardHTML({ xp, gold }, `Completato! ${mistakes} error${mistakes===1?'e':'i'}`, mistakes === 0 ? '🏆 Senza errori!' : '');
          resEl.classList.add('mg-res-in'); closeBtn.classList.remove('hidden');
        }
      } else {
        mistakes++; eEl.textContent = mistakes;
        a.c.classList.add('mgm-wrong'); b.c.classList.add('mgm-wrong');
        setTimeout(() => { a.c.classList.remove('mgm-flipped','mgm-wrong'); b.c.classList.remove('mgm-flipped','mgm-wrong'); flipped=[]; locked=false; }, 900);
      }
    });
    grid.appendChild(c); return c;
  });
  document.getElementById('mgm-x').addEventListener('click', mgClose);
  closeBtn.addEventListener('click', mgClose);
}

/* ── ⚡ FURIA DEL FULMINE ── */
function openTapGame() {
  if (!mgCanPlay('tap')) return;
  let power=0, taps=0, running=false, cdTimer=null;
  const DURATION = 6;
  const wrap = document.createElement('div');
  wrap.className = 'mg-tap-wrap';
  wrap.innerHTML = `
    <button class="mg-x-btn" id="mgt-x">✕</button>
    <div class="mg-game-title">⚡ Furia del Fulmine</div>
    <p class="mg-hint" id="mgt-hint">Tocca il più veloce possibile per 6 secondi!</p>
    <div class="mgt-bar-wrap"><div class="mgt-bar-fill" id="mgt-fill"><div class="mgt-bar-glow"></div></div></div>
    <div class="mgt-countdown" id="mgt-cd">6</div>
    <button class="btn btn-primary mgt-btn" id="mgt-btn">⚡ TAP!</button>
    <div class="mgt-taps">Tap: <span id="mgt-taps">0</span></div>
    <div class="mg-result-area" id="mgt-res"></div>
    <button class="btn mg-close-btn hidden" id="mgt-close">Continua ›</button>`;
  mgOverlay(wrap);
  const hint = document.getElementById('mgt-hint');
  const fill = document.getElementById('mgt-fill');
  const cdEl = document.getElementById('mgt-cd');
  const tapBtn = document.getElementById('mgt-btn');
  const tapsEl = document.getElementById('mgt-taps');
  const resEl = document.getElementById('mgt-res');
  const closeBtn = document.getElementById('mgt-close');
  let endAt, finished = false;
  function endGame() {
    if (finished) return; finished = true;
    clearInterval(cdTimer); tapBtn.disabled = true;
    const xp = Math.round(power / 100 * 100 * MG_B.tap.xpMult), gold = Math.round(power / 100 * 100 * MG_B.tap.goldMult);
    mgGiveReward({ xp, gold }); mgRecord('tap');
    resEl.innerHTML = mgRewardHTML({ xp, gold }, `${taps} tap · ${Math.round(power)}% potere`, power >= 80 ? '⚡ Fulminante!' : power >= 50 ? 'Ottimo!' : 'Puoi fare meglio!');
    resEl.classList.add('mg-res-in'); closeBtn.classList.remove('hidden');
    hint.style.display = 'none'; cdEl.style.display = 'none';
  }
  tapBtn.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (finished) return;
    if (!running) {
      running = true; hint.textContent = 'FORZA!'; endAt = Date.now() + DURATION * 1000;
      cdTimer = setInterval(() => {
        const rem = Math.ceil((endAt - Date.now()) / 1000);
        cdEl.textContent = rem > 0 ? rem : 0;
        if (Date.now() >= endAt) endGame();
      }, 80);
    }
    taps++; tapsEl.textContent = taps;
    power = Math.min(100, power + 7 * (1 - power / 130));
    fill.style.height = power + '%';
    fill.style.background = `linear-gradient(to top,#ff4500,${power>60?'#ffd700':'#ff8c00'})`;
    vibrate(8);
  });
  document.getElementById('mgt-x').addEventListener('click', () => { clearInterval(cdTimer); mgClose(); });
  closeBtn.addEventListener('click', mgClose);
}

/* ── 🌀 CACCIA ALLE ANIME ── */
function openWhamGame() {
  if (!mgCanPlay('wham')) return;
  let score=0, active=new Set(), gameTimer=null, spawnTimer=null;
  const GAME_MS = 15000;
  const wrap = document.createElement('div');
  wrap.className = 'mg-wham-wrap';
  wrap.innerHTML = `
    <button class="mg-x-btn" id="mgwh-x">✕</button>
    <div class="mg-game-title">🌀 Caccia alle Anime</div>
    <div class="mgwh-hud">Anime: <b id="mgwh-s">0</b> · <span id="mgwh-cd">15s</span></div>
    <div class="mgwh-grid" id="mgwh-grid"></div>
    <button class="btn btn-primary wide" id="mgwh-start">🌀 Inizia!</button>
    <div class="mg-result-area" id="mgwh-res"></div>
    <button class="btn mg-close-btn hidden" id="mgwh-close">Continua ›</button>`;
  mgOverlay(wrap);
  const grid = document.getElementById('mgwh-grid');
  const scoreEl = document.getElementById('mgwh-s');
  const cdEl = document.getElementById('mgwh-cd');
  const startBtn = document.getElementById('mgwh-start');
  const resEl = document.getElementById('mgwh-res');
  const closeBtn = document.getElementById('mgwh-close');
  const orbs = Array.from({length:9},(_,i) => {
    const cell = document.createElement('div'); cell.className = 'mgwh-cell';
    const orb = document.createElement('div'); orb.className = 'mgwh-orb';
    orb.addEventListener('click', () => {
      if (!active.has(i)) return;
      active.delete(i); orb.classList.remove('mgwh-active'); orb.classList.add('mgwh-caught');
      vibrate(30); score++; scoreEl.textContent = score;
      setTimeout(() => orb.classList.remove('mgwh-caught'), 300);
    });
    cell.appendChild(orb); grid.appendChild(cell); return orb;
  });
  function showOrb(i) {
    if (active.has(i)) return;
    active.add(i); orbs[i].classList.add('mgwh-active');
    const ttl = 600 + Math.random() * 900;
    setTimeout(() => { if (active.has(i)) { active.delete(i); orbs[i].classList.remove('mgwh-active'); } }, ttl);
  }
  function endGame() {
    clearTimeout(gameTimer); clearInterval(spawnTimer);
    startBtn.style.display = 'none';
    const xp = score * MG_B.wham.xpPerHit, gold = score * MG_B.wham.goldPerHit;
    mgGiveReward({ xp, gold }); mgRecord('wham');
    resEl.innerHTML = mgRewardHTML({ xp, gold }, `${score} anime catturate!`, score >= 12 ? '🌟 Leggendario!' : score >= 7 ? '⭐ Ottimo!' : 'Allenati ancora!');
    resEl.classList.add('mg-res-in'); closeBtn.classList.remove('hidden'); cdEl.style.display = 'none';
  }
  startBtn.addEventListener('click', () => {
    startBtn.style.display = 'none';
    const endAt = Date.now() + GAME_MS;
    const cdInterval = setInterval(() => {
      const r = Math.ceil((endAt - Date.now()) / 1000);
      cdEl.textContent = r > 0 ? r + 's' : '0s';
    }, 100);
    spawnTimer = setInterval(() => {
      const free = Array.from({length:9},(_,k)=>k).filter(k=>!active.has(k));
      if (free.length) showOrb(free[Math.floor(Math.random()*free.length)]);
    }, 350);
    gameTimer = setTimeout(() => { clearInterval(cdInterval); clearInterval(spawnTimer); endGame(); }, GAME_MS);
  });
  document.getElementById('mgwh-x').addEventListener('click', () => { clearTimeout(gameTimer); clearInterval(spawnTimer); mgClose(); });
  closeBtn.addEventListener('click', mgClose);
}

/* ── Pannello Comandi Rapidi / Apple Salute ── */
const SHORTCUT_NAME = 'RPGym';
const APP_BASE_URL   = 'https://dexcorsaro9-cmyk.github.io/RPGym/';

function renderShortcutPanel() {
  const p = el('div', 'panel shortcut-panel');

  // Titolo
  const titleRow = el('div', 'shortcut-title-row');
  titleRow.innerHTML = `<span class="shortcut-apple-icon">🍎</span>
    <div><b>Comandi Rapidi & Salute</b>
    <div class="small muted">Sincronizza automaticamente i km dal tuo iPhone</div></div>`;
  p.appendChild(titleRow);

  // Pulsante principale: lancia il Comando Rapido (se già configurato)
  const launchBtn = el('button', 'btn shortcut-launch-btn wide');
  launchBtn.innerHTML = `<span class="shortcut-icon">⚡</span> Lancia "RPGym" (già configurato)`;
  launchBtn.addEventListener('click', () => {
    window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`;
  });
  p.appendChild(launchBtn);

  // ── Guida passo-passo per creare il Comando Rapido ──
  const guideToggle = el('button', 'shortcut-manual-toggle');
  guideToggle.innerHTML = '📋 Come configurare il Comando Rapido <span>▼</span>';
  p.appendChild(guideToggle);

  const guideBody = el('div', 'shortcut-manual-body collapsed');

  guideBody.innerHTML = `
    <div class="shortcut-steps">
      <div class="shortcut-step">
        <span class="step-num">1</span>
        <div>Apri <b>Comandi Rapidi</b> → tocca <b>+</b> per creare un nuovo comando.</div>
      </div>
      <div class="shortcut-step">
        <span class="step-num">2</span>
        <div>Aggiungi <b>"Trova campioni di salute"</b> → tipo: <b>Passi</b> → Data di inizio: <b>è oggi</b>.</div>
      </div>
      <div class="shortcut-step">
        <span class="step-num">3</span>
        <div>Aggiungi <b>"Calcola statistiche"</b> → <i>Campioni di dati sanitari</i> → funzione: <b>Somma</b>.</div>
      </div>
      <div class="shortcut-step">
        <span class="step-num">4</span>
        <div>Aggiungi <b>"Copia negli appunti"</b> → input: variabile <b>Somma</b> del passo 3.</div>
      </div>
      <div class="shortcut-step">
        <span class="step-num">5</span>
        <div>Salva con nome <b>RPGym</b>. Dopo averlo lanciato, apri RPGym: apparirà un campo verde — toccalo e incolla. Fatto.</div>
      </div>
    </div>`;

  const openShortcuts = el('button', 'btn btn-small wide shortcut-open-app');
  openShortcuts.innerHTML = '📱 Apri Comandi Rapidi';
  openShortcuts.addEventListener('click', () => { window.location.href = 'shortcuts://'; });
  guideBody.appendChild(openShortcuts);

  guideToggle.addEventListener('click', () => {
    const open = !guideBody.classList.contains('collapsed');
    guideBody.classList.toggle('collapsed', open);
    guideToggle.querySelector('span').textContent = open ? '▼' : '▲';
  });
  p.appendChild(guideBody);

  // ── Accordion: inserimento manuale ──
  const toggleBtn = el('button', 'shortcut-manual-toggle');
  toggleBtn.innerHTML = '📥 Inserisci km manualmente (senza Comandi Rapidi) <span>▼</span>';
  p.appendChild(toggleBtn);

  const manualBody = el('div', 'shortcut-manual-body collapsed');

  manualBody.appendChild(el('p', 'small muted', 'Inserisci i km TOTALI dell\'attività di oggi (il gioco calcola solo il delta rispetto all\'ultima sincronizzazione).'));
  const typeRow = el('div', 'shortcut-type-row');
  let syncType = 'camminata';
  [['camminata','🚶','Camminata'],['corsa','🏃','Corsa'],['cyclette','🚴','Cyclette']].forEach(([k, ic, lb]) => {
    const b = el('button', 'shortcut-type-btn' + (k === syncType ? ' selected' : ''));
    b.innerHTML = `${ic}<br><span class="tiny">${lb}</span>`;
    b.addEventListener('click', () => {
      syncType = k;
      typeRow.querySelectorAll('.shortcut-type-btn').forEach(x => x.classList.toggle('selected', x === b));
    });
    typeRow.appendChild(b);
  });
  manualBody.appendChild(typeRow);

  const kmInput2 = el('input', 'input');
  kmInput2.type = 'number'; kmInput2.step = '0.1'; kmInput2.min = '0'; kmInput2.placeholder = 'Es. 8.4 km totali oggi';
  manualBody.appendChild(kmInput2);

  const syncBtn = el('button', 'btn btn-primary wide', '🏥 Sincronizza');
  syncBtn.addEventListener('click', () => {
    const km = parseFloat(kmInput2.value);
    if (!(km > 0)) { toast('Inserisci i km totali di oggi.'); return; }
    const report = RPG.logHealthSync(HERO, syncType, km);
    if (!report)   { toast('Nessun km nuovo da sincronizzare (già aggiornato per oggi).'); return; }
    if (report.error) { toast(report.error); return; }
    persist(); renderHUD();
    sfx(report.levelsGained.length ? 'level' : 'coin');
    showHealthSyncResult(report);
  });
  manualBody.appendChild(syncBtn);

  toggleBtn.addEventListener('click', () => {
    const open = !manualBody.classList.contains('collapsed');
    manualBody.classList.toggle('collapsed', open);
    toggleBtn.querySelector('span').textContent = open ? '▼' : '▲';
  });

  p.appendChild(manualBody);
  return p;
}

/* ── Report post-allenamento (con scrigno per le missioni) ── */
let PENDING_CHEST = null;

function itemIconHtml(it, cls) {
  const img = RPG.itemImg(it);
  return img
    ? `<img class="${cls || 'item-icon'}" src="${img}" onerror="this.outerHTML='${it.icon}'" alt="">`
    : it.icon;
}

function itemHtml(it) {
  return `<div class="loot rar-${it.rarity} loot-with-img">
    ${itemIconHtml(it, 'item-icon-big')}
    <div class="loot-body">
      <div class="loot-head"><b>${esc(it.name)}</b> <span class="tag">${RPG.RARITIES[it.rarity].label}</span>${it.distilled ? ' <span class="tag tag-distilled">⚗️ Distillato!</span>' : ''}</div>
      <div class="small muted">${it.desc}</div>
      <div class="small">📈 +${it.xp}% XP equipaggiato · 🪙 valore ${it.value}</div>
    </div>
  </div>`;
}

function showReport(r) {
  let html = r.autoSync
    ? `<h3 class="panel-title">🏥 Sincronizzato da Salute!</h3>`
    : `<h3 class="panel-title">🎉 Impresa Registrata!</h3>`;
  const a = RPG.ACTIVITIES[r.type];
  html += `<p>${a.icon} <b>${r.km} km</b> di ${a.label.toLowerCase()}${r.restBonusUsed ? ' <b>(x2 Bonus Riposo!)</b>' : ''}</p>`;
  html += `<div class="reward-grid">
    <div class="reward">⭐<br>+${r.xp} XP</div>
    <div class="reward">🪙<br>+${r.gold}</div>
    <div class="reward">🪵<br>+${r.wood}</div>
    <div class="reward">🪨<br>+${r.stone}</div>
  </div>`;
  if (r.levelsGained.length)
    html += `<p class="big-news">🆙 SEI SALITO AL LIVELLO ${r.levelsGained[r.levelsGained.length - 1]}!<br>
      <span class="small">${RPG.heroTitle(r.levelsGained[r.levelsGained.length - 1])}</span></p>`;
  if (r.capReached)
    html += `<p class="muted">🔒 Livello 20 raggiunto: per l'Ascensione serve l'<b>Amuleto del Viaggiatore Esperto</b> (guarda la Mappa).</p>`;
  if (r.loot.length) {
    html += `<h4>🎒 Sacchi del Viaggiatore:</h4><div class="loot-list">`;
    r.loot.forEach(it => { html += itemHtml(it); });
    html += `</div>`;
  }
  if (r.fragments)
    html += `<p>🔍 Hai trovato <b>${r.fragments} Frammento/i di Memoria</b>!</p>`;
  if (r.sighting) {
    html += `<div class="sighting">
      <img class="sighting-img" src="assets/bestiario/${r.sighting.id}.png" alt="">
      <div><b>👁️ Avvistamento!</b><br>${r.sighting.name}<br>
      <span class="small muted">Aggiunto al Bestiario</span></div>
    </div>`;
  }
  if (r.finalReveal)
    html += `<p class="big-news">🐉 LE MEMORIE SONO COMPLETE!<br><span class="small">Il Cavaliere del Drago è nel Bestiario.</span></p>`;
  if (r.incursionProgress) {
    const ip = r.incursionProgress;
    html += `<p>⚡ Incursione: ${ip.done.toFixed(1)} / ${ip.km} km — resisti fino a mezzanotte!</p>`;
  }
  if (r.incursionComplete) {
    html += `<p class="big-news">⚡ INCURSIONE RESPINTA!</p>`;
    PENDING_CHEST = { title: r.incursionComplete.name, chest: r.incursionComplete.chest };
  }
  if (r.missionProgress) {
    const mp = r.missionProgress;
    html += `<p>🐎 Missione <b>${mp.mission.name}</b>: ${mp.done.toFixed(1)} / ${mp.mission.km} km.</p>`;
  }
  if (r.missionComplete) {
    html += `<p class="big-news">🏆 MISSIONE COMPLETATA: ${r.missionComplete.name}!</p>`;
    if (r.bossDefeated) {
      html += `<div class="sighting boss-defeated">
        <img class="sighting-img" src="assets/bestiario/${r.bossDefeated.id}.png" alt="">
        <div><b>⚔️ BOSS SCONFITTO!</b><br>${r.bossDefeated.name}<br>
        <span class="small muted">Aggiunto al Bestiario</span></div>
      </div>`;
    }
    PENDING_CHEST = PENDING_CHEST || { title: r.missionComplete.name, chest: r.chest, cards: r.cards };
  }
  r.unlocks.forEach(u => { html += `<p class="big-news small">${u}</p>`; });

  if (PENDING_CHEST) {
    html += `<div class="chest-zone">
      <p class="center"><b>Un forziere ti attende!</b></p>
      <button class="chest-btn" id="btn-open-chest"><img src="assets/ui/chest.svg" alt="scrigno"></button>
      <p class="small muted center">Tocca lo scrigno per aprirlo</p>
    </div>`;
  }
  html += `<button class="btn btn-primary wide" onclick="nextOpening(); setTab('camp')">Torna al Rifugio</button>`;
  modal(html);
  const chestBtn = $('#btn-open-chest');
  if (chestBtn) chestBtn.addEventListener('click', openChest);
}

function openChest() {
  if (!PENDING_CHEST) return;
  const { title, chest } = PENDING_CHEST;
  PENDING_CHEST = null;
  vibrate([80, 60, 80, 60, 200]);
  const btn = $('#btn-open-chest');
  if (btn) {
    btn.classList.add('opening');
    setTimeout(() => revealChest(title, chest), 900);
  } else {
    revealChest(title, chest);
  }
}

function revealChest(title, chest) {
  vibrate(300);
  sfx('chest');
  let html = `<div class="chest-burst">✨</div>
    <h3 class="panel-title center"><img src="assets/ui/chest.svg" style="width:1.4rem;height:1.4rem;vertical-align:middle;margin-right:4px"> Il Bottino di "${esc(title)}"</h3>`;
  const parts = [];
  if (chest.gold) parts.push(`🪙 ${chest.gold}`);
  if (chest.wood) parts.push(`🪵 ${chest.wood}`);
  if (chest.stone) parts.push(`🪨 ${chest.stone}`);
  if (parts.length) html += `<p class="center big-news small">${parts.join(' · ')}</p>`;
  (chest.items || []).forEach(it => { html += itemHtml(it); });
  (chest.cards || []).forEach(cid => {
    const card = RPG.CARDS[cid];
    html += `<div class="card-reveal rar-${card.rarity}">
      <div class="card-icon">${card.icon}</div>
      <b>${card.name}</b><br><span class="tag">${card.rarity}</span>
      <p class="small lore">${card.lore}</p>
    </div>`;
  });
  html += `<p class="small muted center">Gli oggetti sono nel tuo zaino: equipaggiali dal menu Eroe o vendili al Mercato.</p>
    <button class="btn btn-primary wide" onclick="closeModal(); setTab('hero')">Vai all'Equipaggiamento</button>
    <button class="btn wide" onclick="closeModal()">Chiudi</button>`;
  modal(html);
}

/* ── TAB: Mercato ── */
let MARKET_VIEW = 'stalla';

function renderMarket(c) {
  const marketTitle = el('h2', 'section-title', '🏪 Il Mercato');
  c.appendChild(marketTitle);
  const marketIcon = new Image();
  marketIcon.onload = () => { marketTitle.innerHTML = `<img class="title-icon" src="assets/ui/tab-mercato.png"> Il Mercato`; };
  marketIcon.src = 'assets/ui/tab-mercato.png';
  const sw = el('div', 'coll-switch');
  [['stalla', 'stalla', '🐴', 'Stalla'], ['nero', 'contrabbando', '🕯️', 'Contrabbando'], ['fucina', 'fucina', '⚒️', 'Fucina']].forEach(([k, file, emoji, label]) => {
    const b = el('button', 'coll-btn' + (MARKET_VIEW === k ? ' active' : ''));
    const img = new Image();
    img.onload = () => { b.innerHTML = `<span>${label}</span>`; img.className = 'coll-btn-icon'; b.insertBefore(img, b.firstChild); };
    img.src = `assets/ui/mercato/${file}.png`;
    b.innerHTML = `<span class="coll-btn-emoji">${emoji}</span><span>${label}</span>`;
    b.addEventListener('click', () => { MARKET_VIEW = k; setTab('market'); });
    sw.appendChild(b);
  });
  c.appendChild(sw);
  ({ stalla: renderStalla, nero: renderNero, fucina: renderFucina }[MARKET_VIEW])(c);
}

function npcBanner(imgPath, name, quote) {
  const b = el('div', 'npc-banner');
  const img = el('img', 'npc-img');
  img.src = imgPath;
  img.addEventListener('error', () => img.remove());
  b.appendChild(img);
  b.appendChild(el('div', 'npc-quote', `<b>${name}</b><br><span class="small">${quote}</span>`));
  return b;
}

function renderStalla(c) {
  c.appendChild(el('p', 'muted small center',
    'Le cavalcature aumentano i km "virtuali" di ogni allenamento. Una nuova compagna di viaggio ogni 5 livelli: tocca una miniatura per conoscere la sua storia…'));
  const grid = el('div', 'mount-grid');
  RPG.MOUNTS.forEach(m => {
    const owned = HERO.mountsOwned.includes(m.id);
    const active = HERO.mount === m.id;
    const locked = HERO.level < m.level;
    const card = el('div', 'mount-card' + (locked ? ' locked' : '') + (active ? ' active-mount' : ''));
    const img = el('img', 'mount-thumb');
    img.src = m.img;
    img.loading = 'lazy';
    img.addEventListener('error', () => { img.outerHTML = `<div class="mount-emoji-big">${m.emoji}</div>`; });
    card.appendChild(img);
    card.appendChild(el('div', 'mount-name', m.name));
    card.appendChild(el('div', 'mount-req small',
      (active ? '✅ In sella' : locked ? `🔒 Liv. ${m.level}` : owned ? 'Nella stalla' : `🪙 ${m.price}`) +
      ` · +${m.bonus}% km`));
    card.addEventListener('click', () => showMountSheet(m));
    grid.appendChild(card);
  });
  c.appendChild(grid);
}

function showMountSheet(m) {
  const owned = HERO.mountsOwned.includes(m.id);
  const active = HERO.mount === m.id;
  const locked = HERO.level < m.level;
  let action = '';
  if (active) action = `<p class="center big-news small">✅ È la tua cavalcatura attuale</p>`;
  else if (locked) action = `<p class="center muted">🔒 Si sblocca al <b>Livello ${m.level}</b> (sei al ${HERO.level}). Continua ad allenarti: ti sta aspettando…</p>`;
  else action = `<button class="btn btn-primary wide" id="btn-mount-buy">${owned ? '🐎 Sella!' : `🪙 Compra per ${m.price}`}</button>`;
  modal(`
    <div class="mount-sheet">
      <img class="mount-sheet-img${locked ? ' mount-locked-img' : ''}" src="${m.img}" onerror="this.outerHTML='<div class=&quot;mount-emoji-big&quot;>${m.emoji}</div>'">
      <h3 class="panel-title center">${m.name}</h3>
      <p class="center small"><span class="tag">Liv. ${m.level}</span> <span class="tag">+${m.bonus}% km</span> <span class="tag">🪙 ${m.price}</span></p>
      <div class="mount-bio">${esc(m.bio)}</div>
      ${action}
      <button class="btn wide" onclick="closeModal()">Torna alla Stalla</button>
    </div>
  `);
  const buy = $('#btn-mount-buy');
  if (buy) buy.addEventListener('click', () => {
    const err = RPG.buyMount(HERO, m.id);
    persist(); renderHUD();
    toast(err || `${m.emoji} ${m.name} è ora la tua cavalcatura! (+${m.bonus}% km)`);
    if (!err) vibrate(100);
    closeModal();
    setTab('market');
  });
}

function renderNero(c) {
  c.appendChild(npcBanner('assets/avatars/npc/mercante-contrabbando.png', 'Messer Bilancia',
    '«Ogni oggetto ha il suo giusto peso in monete… la mia bilancia non sbaglia mai. Vendimi pure, qui non si fanno domande.»'));
  const sellable = HERO.items.filter(i => !Object.values(HERO.equipment).includes(i.id));
  if (!sellable.length) {
    c.appendChild(el('div', 'panel', '<p class="center muted">Non hai bottini da vendere. Gli oggetti equipaggiati non si toccano!</p>'));
    return;
  }
  sellable.forEach(it => {
    const row = el('div', 'mission-row');
    row.appendChild(el('div', 'mission-mid',
      `${itemIconHtml(it, 'item-icon')} <b>${esc(it.name)}</b> <span class="tag">${RPG.RARITIES[it.rarity].label}</span><br>
       <span class="small muted">+${it.xp}% XP</span>`));
    const sv = RPG.sellValue(HERO, it);
    const btn = el('button', 'btn btn-small btn-primary', `Vendi 🪙${sv}`);
    btn.addEventListener('click', () => {
      RPG.sellItem(HERO, it.id);
      persist(); renderHUD();
      toast(`🪙 +${sv} monete!`);
      setTab('market');
    });
    row.appendChild(btn);
    c.appendChild(row);
  });
}

function renderFucina(c) {
  HERO.forgeSeen = todayISO();
  persist();
  updateBadges();
  c.appendChild(npcBanner('assets/avatars/fabbro.png', 'Mastro Brontolo',
    '«Batto il ferro dall\'alba, ragazzino. Tre pezzi al giorno, prendere o lasciare. E non toccare l\'incudine!»'));
  const offers = RPG.forgeOffers(HERO);
  const op = el('div', 'panel');
  op.appendChild(el('h3', 'panel-title', '🔥 In vetrina oggi'));
  offers.forEach(o => {
    const bought = HERO.items.some(i => i.name === o.name && i.rarity === o.rarity);
    const row = el('div', 'mission-row' + (o.special ? ' special-offer' : ''));
    row.appendChild(el('div', 'mission-mid',
      (o.special ? `<span class="tag tag-sale">🔥 -30% SOLO OGGI · <span data-cd="midnight">…</span></span><br>` : '') +
      `${itemIconHtml(o, 'item-icon')} <b>${esc(o.name)}</b> <span class="tag">${RPG.RARITIES[o.rarity].label}</span><br>
       <span class="small muted">+${o.xp}% XP · ${RPG.SLOTS[o.slot].label}${o.special ? ` · <s>🪙${o.fullPrice}</s>` : ''}</span>`));
    const btn = el('button', 'btn btn-small', `🪙${o.price}`);
    if (HERO.gold >= o.price && !bought) btn.classList.add('btn-primary');
    if (bought) { btn.textContent = '✅'; btn.disabled = true; }
    btn.addEventListener('click', () => {
      const err = RPG.buyForgeItem(HERO, o);
      persist(); renderHUD();
      toast(err || `${o.icon} ${o.name} acquistato!`);
      setTab('market');
    });
    row.appendChild(btn);
    op.appendChild(row);
  });
  c.appendChild(op);

  const wearable = HERO.items.filter(i =>
    ['arma', 'scudo', 'elmo', 'armatura'].includes(i.slot) &&
    !Object.values(HERO.equipment).includes(i.id));
  if (wearable.length) {
    const sp = el('div', 'panel');
    sp.appendChild(el('h3', 'panel-title', '♻️ Vendi al fabbro'));
    wearable.forEach(it => {
      const row = el('div', 'mission-row');
      row.appendChild(el('div', 'mission-mid',
        `${itemIconHtml(it, 'item-icon')} <b>${esc(it.name)}</b> <span class="tag">${RPG.RARITIES[it.rarity].label}</span>`));
      const sv = RPG.sellValue(HERO, it);
      const btn = el('button', 'btn btn-small', `Vendi 🪙${sv}`);
      btn.addEventListener('click', () => {
        RPG.sellItem(HERO, it.id);
        persist(); renderHUD();
        toast(`🪙 +${sv} monete!`);
        setTab('market');
      });
      row.appendChild(btn);
      sp.appendChild(row);
    });
    c.appendChild(sp);
  }
}

/* ── TAB: Eroe (equipaggiamento + sottomenù) ── */
let HERO_VIEW = 'main';

function renderHero(c) {
  if (HERO_VIEW === 'cards') { renderCardsView(c); return; }
  if (HERO_VIEW === 'bestiary') { renderBestiaryView(c); return; }
  if (HERO_VIEW === 'story') { renderStoryView(c); return; }
  if (HERO_VIEW === 'settings') { renderSettingsView(c); return; }
  if (HERO_VIEW === 'diary')    { renderDiaryView(c);    return; }

  const titleH2 = el('h2', 'section-title on-parchment-title hero-title-row');
  const titleIcon = new Image();
  titleIcon.onload = () => { titleH2.innerHTML = `<img class="title-icon" src="assets/ui/eroe/eroe.png"> Scheda dell'Eroe <button class="hero-settings-btn" title="Impostazioni">⚙️</button>`; titleH2.querySelector('.hero-settings-btn').addEventListener('click', () => { HERO_VIEW = 'settings'; setTab('hero'); }); };
  titleIcon.onerror = () => { titleH2.innerHTML = `🛡️ Scheda dell'Eroe <button class="hero-settings-btn" title="Impostazioni">⚙️</button>`; titleH2.querySelector('.hero-settings-btn').addEventListener('click', () => { HERO_VIEW = 'settings'; setTab('hero'); }); };
  titleIcon.src = 'assets/ui/eroe/eroe.png';
  c.appendChild(titleH2);

  // Eroe con i 6 slot: 3 a sinistra, 3 a destra
  const rig = el('div', 'hero-rig');
  const leftCol = el('div', 'slot-col');
  const rightCol = el('div', 'slot-col');
  const slotKeys = Object.keys(RPG.SLOTS);
  const leftSlots = slotKeys.slice(0, 3);
  const rightSlots = slotKeys.slice(3);

  const EMPTY_SLOT_IMG = {
    elmo: 'assets/ui/eroe/slot_elmo.png',
    armatura: 'assets/ui/eroe/slot_armatura.png',
    arma: 'assets/ui/eroe/slot_arma.png',
    scudo: 'assets/ui/eroe/slot_scudo.png',
    anello: 'assets/ui/eroe/slot_anello.png',
    amuleto: 'assets/ui/eroe/slot_amuleto.png',
  };
  const makeSlot = key => {
    const s = RPG.SLOTS[key];
    const itemId = HERO.equipment[key];
    const item = HERO.items.find(i => i.id === itemId);
    const slot = el('button', 'equip-slot' + (item ? ' filled rar-border-' + item.rarity : ''));
    if (item) {
      slot.innerHTML = `${itemIconHtml(item, 'equip-img')}<span class="equip-label">+${item.xp}%</span>`;
    } else if (EMPTY_SLOT_IMG[key]) {
      slot.innerHTML = `<img class="equip-icon-img empty" src="${EMPTY_SLOT_IMG[key]}"><span class="equip-label">${s.label}</span>`;
    } else {
      slot.innerHTML = `<span class="equip-icon empty">${s.icon}</span><span class="equip-label">${s.label}</span>`;
    }
    slot.addEventListener('click', () => openSlotPicker(key));
    return slot;
  };
  leftSlots.forEach(k => leftCol.appendChild(makeSlot(k)));
  rightSlots.forEach(k => rightCol.appendChild(makeSlot(k)));

  const center = el('div', 'hero-center');
  const BIG_CLASSES = { alchimista: 'hero-fullbody-big', maga: 'hero-fullbody-big', principe: 'hero-fullbody-big' };
  const heroCls = isImageAvatar(HERO)
    ? 'hero-fullbody' + (BIG_CLASSES[HERO.storyId] ? ' ' + BIG_CLASSES[HERO.storyId] : '')
    : 'hero-avatar';
  const av = avatarEl(HERO, heroCls);
  center.appendChild(av);
  rig.appendChild(leftCol);
  rig.appendChild(center);
  rig.appendChild(rightCol);
  c.appendChild(rig);

  c.appendChild(el('h3', 'hero-name-plate center', esc(HERO.name)));
  const mount = HERO.mount ? RPG.mountById(HERO.mount) : null;
  c.appendChild(el('p', 'hero-title-plate center',
    `Livello ${HERO.level} — ${RPG.heroTitle(HERO.level)}` +
    (mount ? ` · ${mount.emoji}` : '') + (HERO.companion ? ' · 🐺' : '')));
  const bonus = RPG.equipmentXpBonus(HERO);
  c.appendChild(el('p', 'center small equip-total', bonus > 0
    ? `⚡ Bonus equipaggiamento: <b>+${bonus}% XP</b>`
    : 'Tocca gli slot per equipaggiare il tuo bottino'));
  const talent = RPG.talentOf(HERO);
  if (talent) c.appendChild(el('p', 'center small talent-line',
    `${talent.icon} Talento: <b>${talent.name}</b> — ${talent.desc}`));

  // Sottomenù
  const sub = el('div', 'hero-submenu');
  [['story', 'storia', '📜', 'La tua Storia'], ['cards', 'carte', '🎴', 'Carte & Imprese'], ['bestiary', 'bestiario', '🐉', 'Bestiario'], ['diary', 'imprese_stivale', '📊', 'Diario']].forEach(([k, file, emoji, label]) => {
    const b = el('button', 'btn submenu-btn');
    b.innerHTML = `<span class="submenu-emoji">${emoji}</span><span>${label}</span>`;
    const img = new Image();
    img.onload = () => { b.innerHTML = `<img class="submenu-icon" src="assets/ui/eroe/${file}.png"><span>${label}</span>`; };
    img.src = `assets/ui/eroe/${file}.png`;
    b.addEventListener('click', () => { HERO_VIEW = k; setTab('hero'); });
    sub.appendChild(b);
  });
  c.appendChild(sub);

  // Statistiche
  const stats = el('div', 'panel on-parchment');
  const impreseTitle = el('h3', 'panel-title', '📊 Imprese');
  stats.appendChild(impreseTitle);
  const shieldImg = new Image();
  shieldImg.onload = () => { impreseTitle.innerHTML = `<img class="panel-title-icon" src="assets/ui/eroe/imprese_spade.png"> Imprese`; };
  shieldImg.src = 'assets/ui/eroe/imprese_spade.png';
  const impreseRows = [
    ['stivale', 'Km totali', `${HERO.totalKm.toFixed(1)}`],
    ['cavallo', 'In sella', `${(HERO.kmByType.cyclette || 0).toFixed(1)} km`],
    ['pellegrino', 'A piedi', `${(HERO.kmByType.camminata || 0).toFixed(1)} km`],
    ['cavaliere', 'Di corsa', `${(HERO.kmByType.corsa || 0).toFixed(1)} km`],
    ['chiave', 'Streak login', `${HERO.streak.count} giorni`],
    ['spade', 'Missioni compiute', `${HERO.missionsDone.length}`],
    ['zaino', 'Oggetti nello zaino', `${HERO.items.length}`],
  ];
  impreseRows.forEach(([file, label, val]) => {
    const row = el('div', 'stat-row');
    row.innerHTML = `<span class="stat-row-label"><img class="stat-row-icon" src="assets/ui/eroe/imprese_${file}.png" onerror="this.style.display='none'">${label}</span><b>${val}</b>`;
    stats.appendChild(row);
  });
  c.appendChild(stats);

  const sw = el('button', 'btn wide', '↩ Cambia Eroe');
  sw.addEventListener('click', () => { STATE.current = null; persist(); renderProfiles(); });
  c.appendChild(sw);
}

function renderDiaryView(c) {
  backBar(c);
  c.appendChild(el('h2', 'section-title', '📊 Diario del Viandante'));

  // Statistiche totali
  const sp = el('div', 'panel');
  sp.appendChild(el('h3', 'panel-title', '📈 Statistiche Totali'));
  const sd = el('div', 'stats-diary-grid');
  [
    ['🏃', HERO.log.length,                                    'Sessioni'],
    ['📍', HERO.totalKm.toFixed(1) + ' km',                   'Totale'],
    ['🚶', (HERO.kmByType.camminata || 0).toFixed(1) + ' km', 'Cammino'],
    ['🏅', (HERO.kmByType.corsa     || 0).toFixed(1) + ' km', 'Corsa'],
    ['🚴', (HERO.kmByType.cyclette  || 0).toFixed(1) + ' km', 'Cyclette'],
    ['🏆', (HERO.achievementsClaimed || []).length,            'Imprese'],
    ['🎒', HERO.lootBagsOpened || 0,                          'Sacchi'],
    ['🔍', HERO.fragmentsFound || 0,                          'Frammenti'],
  ].forEach(([ico, val, lbl]) => {
    const it = el('div', 'stats-diary-item');
    it.innerHTML = `<div class="stats-diary-val">${ico} ${val}</div><div class="stats-diary-lbl">${lbl}</div>`;
    sd.appendChild(it);
  });
  sp.appendChild(sd);
  c.appendChild(sp);

  // Diario attività
  const lp = el('div', 'panel');
  lp.appendChild(el('h3', 'panel-title', '📜 Diario delle Attività'));
  if (!HERO.log.length) {
    lp.appendChild(el('p', 'muted small center', 'Nessuna attività registrata ancora.'));
  } else {
    HERO.log.slice().reverse().forEach(l => {
      const a = RPG.ACTIVITIES[l.type];
      const d = new Date(l.date);
      lp.appendChild(el('div', 'log-row',
        `${a.icon} <b>${l.km} km</b> di ${a.label.toLowerCase()} — +${l.xp} XP <span class="muted small">(${d.toLocaleDateString('it-IT')})</span>`));
    });
  }
  c.appendChild(lp);
}

function renderSettingsView(c) {
  const back = el('button', 'btn btn-small', '← Eroe');
  back.addEventListener('click', () => { HERO_VIEW = 'main'; setTab('hero'); });
  c.appendChild(back);
  c.appendChild(el('h2', 'section-title', '⚙️ Impostazioni'));
  c.appendChild(renderShortcutPanel());
  c.appendChild(_settingsRefreshPanel());
  c.appendChild(_settingsBackupPanel());
  c.appendChild(_settingsFullscreenPanel());
  c.appendChild(_settingsDangerPanel());
}

function _settingsRefreshPanel() {
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '🔄 Aggiornamenti'));
  p.appendChild(el('p', 'guide-text', 'Se il gioco non mostra le ultime novità, forza il refresh per scaricare la versione più recente.'));
  const btn = el('button', 'btn btn-primary', '🔄 Forza aggiornamento');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Aggiornamento in corso…';
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      location.reload(true);
    } catch { location.reload(true); }
  });
  p.appendChild(btn);
  return p;
}

function _settingsBackupPanel() {
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '💾 Backup salvataggio'));
  p.appendChild(el('p', 'guide-text', 'Esporta tutti i tuoi eroi su file JSON. Potrai reimportarli in qualsiasi momento.'));

  const exportBtn = el('button', 'btn btn-primary', '📤 Esporta salvataggio');
  exportBtn.addEventListener('click', () => {
    const data = localStorage.getItem('rpgym_save_v1');
    if (!data) { toast('Nessun salvataggio trovato.'); return; }
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rpgym_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('📤 Backup esportato!');
  });

  const importBtn = el('button', 'btn', '📥 Importa salvataggio');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.heroes || !Array.isArray(parsed.heroes)) throw new Error('formato non valido');
        modal(`
          <h3 class="panel-title">📥 Importa backup</h3>
          <p>Vuoi sovrascrivere il salvataggio attuale con il backup? I dati correnti andranno persi.</p>
          <div class="row gap" style="margin-top:1rem">
            <button id="btn-import-cancel" class="btn">Annulla</button>
            <button id="btn-import-confirm" class="btn btn-primary">Conferma</button>
          </div>`);
        document.getElementById('btn-import-cancel').addEventListener('click', closeModal);
        document.getElementById('btn-import-confirm').addEventListener('click', () => {
          localStorage.setItem('rpgym_save_v1', e.target.result);
          closeModal();
          toast('✅ Salvataggio importato! Riavvio…');
          setTimeout(() => location.reload(), 1200);
        });
      } catch { toast('❌ File non valido o corrotto.'); }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });
  importBtn.addEventListener('click', () => fileInput.click());

  p.appendChild(exportBtn);
  p.appendChild(importBtn);
  p.appendChild(fileInput);
  return p;
}

function _settingsFullscreenPanel() {
  if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) return el('div');
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '📱 Schermo intero'));
  p.appendChild(el('p', 'guide-text', 'Espandi il gioco a tutto schermo per un\'esperienza più immersiva.'));
  const btn = el('button', 'btn btn-primary', '⛶ Attiva schermo intero');
  btn.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        btn.textContent = '⛶ Attiva schermo intero';
      } else {
        await (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement);
        btn.textContent = '✕ Esci da schermo intero';
      }
    } catch { toast('Schermo intero non disponibile su questo dispositivo.'); }
  });
  p.appendChild(btn);
  return p;
}

function _settingsDangerPanel() {
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '⚠️ Zona pericolosa'));

  const resetBtn = el('button', 'btn btn-danger', '🗑️ Elimina eroe corrente');
  resetBtn.addEventListener('click', () => {
    if (!HERO) { toast('Nessun eroe attivo.'); return; }
    modal(`
      <h3 class="panel-title">🗑️ Elimina ${HERO.name}?</h3>
      <p>Questa azione è <strong>irreversibile</strong>. L'eroe e tutti i suoi progressi saranno persi per sempre.</p>
      <div class="row gap" style="margin-top:1rem">
        <button id="btn-del-cancel" class="btn">Annulla</button>
        <button id="btn-del-confirm" class="btn btn-danger">Elimina</button>
      </div>`);
    document.getElementById('btn-del-cancel').addEventListener('click', closeModal);
    document.getElementById('btn-del-confirm').addEventListener('click', () => {
      RPG.deleteHero(STATE, HERO.id);
      persist();
      closeModal();
      toast('Eroe eliminato.');
      setTimeout(() => { HERO = null; showScreen('screen-profiles'); renderProfiles(); }, 800);
    });
  });

  const nukeBtn = el('button', 'btn btn-danger', '💀 Cancella tutti i dati');
  nukeBtn.addEventListener('click', () => {
    modal(`
      <h3 class="panel-title">💀 Cancella tutto?</h3>
      <p>Tutti gli eroi, i progressi e le impostazioni saranno cancellati. <strong>Non si può tornare indietro.</strong></p>
      <div class="row gap" style="margin-top:1rem">
        <button id="btn-nuke-cancel" class="btn">Annulla</button>
        <button id="btn-nuke-confirm" class="btn btn-danger">Cancella tutto</button>
      </div>`);
    document.getElementById('btn-nuke-cancel').addEventListener('click', closeModal);
    document.getElementById('btn-nuke-confirm').addEventListener('click', () => {
      localStorage.removeItem('rpgym_save_v1');
      closeModal();
      toast('Dati cancellati. Riavvio…');
      setTimeout(() => location.reload(), 1200);
    });
  });

  p.appendChild(resetBtn);
  p.appendChild(nukeBtn);
  return p;
}

function openSlotPicker(slotKey) {
  const s = RPG.SLOTS[slotKey];
  const candidates = HERO.items.filter(i => i.slot === slotKey);
  let html = `<h3 class="panel-title">${s.icon} ${s.label}</h3>`;
  const current = HERO.equipment[slotKey];
  if (!candidates.length) {
    html += `<p class="muted center">Non hai ancora nessun oggetto per questo slot.<br>
      <span class="small">Completa missioni e allenamenti per trovarne!</span></p>`;
  }
  html += `<div class="loot-list" id="slot-picker-list"></div>`;
  if (current) html += `<button class="btn wide" id="btn-unequip">Rimuovi equipaggiamento</button>`;
  html += `<button class="btn btn-primary wide" onclick="closeModal()">Chiudi</button>`;
  modal(html);
  const list = $('#slot-picker-list');
  candidates.forEach(it => {
    const row = el('div', 'loot rar-' + it.rarity + ' pickable' + (it.id === current ? ' equipped' : ''));
    row.classList.add('loot-with-img');
    row.innerHTML = `${itemIconHtml(it, 'item-icon-big')}<div class="loot-body">
      <div class="loot-head"><b>${esc(it.name)}</b> <span class="tag">${RPG.RARITIES[it.rarity].label}</span>${it.id === current ? ' ✅' : ''}</div>
      <div class="small">📈 +${it.xp}% XP · 🪙 ${it.value}</div></div>`;
    row.addEventListener('click', () => {
      RPG.equipItem(HERO, it.id);
      persist(); renderHUD();
      closeModal();
      setTab('hero');
      toast(`${it.icon} ${it.name} equipaggiato!`);
    });
    list.appendChild(row);
  });
  const unq = $('#btn-unequip');
  if (unq) unq.addEventListener('click', () => {
    RPG.unequipSlot(HERO, slotKey);
    persist(); closeModal(); setTab('hero');
  });
}

function renderStoryView(c) {
  const story = STORIES[HERO.storyId] || STORIES.eroe1;
  backBar(c);
  c.appendChild(el('h2', 'section-title on-parchment-title', '📜 ' + story.title));
  const p = el('div', 'panel story-panel');
  const av = avatarEl(HERO, 'story-avatar');
  p.appendChild(av);
  p.appendChild(el('div', 'story-text', esc(story.text).replace(/\n/g, ' ')));
  const talent = RPG.talentOf(HERO);
  if (talent) p.appendChild(el('div', 'talent-box',
    `${talent.icon} <b>${talent.name}</b><br><span class="small">${talent.desc}</span>`));
  c.appendChild(p);
}

function backBar(c) {
  const b = el('button', 'btn btn-small', '↩ Torna all\'Eroe');
  b.addEventListener('click', () => { HERO_VIEW = 'main'; setTab('hero'); });
  c.appendChild(b);
}

function renderCardsView(c) {
  backBar(c);
  const cardsTitle = el('h2', 'section-title on-parchment-title', '🎴 Il Tomo delle Memorie');
  c.appendChild(cardsTitle);
  const tomeImg = new Image();
  tomeImg.onload = () => { cardsTitle.innerHTML = `<img class="title-icon" src="assets/ui/eroe/carte.png"> Il Tomo delle Memorie`; };
  tomeImg.src = 'assets/ui/eroe/carte.png';
  c.appendChild(el('p', 'muted small center',
    `${HERO.cards.length} / ${Object.keys(RPG.CARDS).length} carte collezionate`));
  const grid = el('div', 'card-grid');
  Object.entries(RPG.CARDS).forEach(([id, card]) => {
    const owned = HERO.cards.includes(id);
    const cc = el('div', 'tcard rar-' + card.rarity + (owned ? '' : ' locked'));
    if (owned) {
      cc.innerHTML = `<div class="card-icon">${card.icon}</div><b>${card.name}</b>
        <span class="tag">${card.rarity}</span><p class="small lore">${card.lore}</p>`;
    } else {
      cc.innerHTML = `<div class="card-icon">❓</div><b>???</b><span class="tag">${card.rarity}</span>`;
    }
    grid.appendChild(cc);
  });
  c.appendChild(grid);

  // Le Imprese — 100 traguardi raggruppati per bioma
  const claimed = HERO.achievementsClaimed || [];
  const unlockedCount = RPG.achievementsUnlocked(HERO).length;
  const pendingClaim = RPG.ACHIEVEMENTS.filter(a => HERO.level >= a.level && !claimed.includes(a.id)).length;
  c.appendChild(el('h3', 'section-title on-parchment-title small-title', '🏆 Le Imprese del Viandante'));
  c.appendChild(el('p', 'muted small center',
    `${unlockedCount} / 100 sbloccate · ${claimed.length} riscosse${pendingClaim > 0 ? ` · <b>${pendingClaim} da riscuotere!</b>` : ''}`));

  const catWrap = el('div', 'achievement-list');
  RPG.BIOMES.forEach((biome, bi) => {
    const bioAchievs = RPG.ACHIEVEMENTS.filter(a => a.level >= biome.min && a.level <= biome.max);
    if (!bioAchievs.length) return;
    const bioUnlocked = bioAchievs.filter(a => HERO.level >= a.level).length;
    const bioClaimed  = bioAchievs.filter(a => claimed.includes(a.id)).length;
    const bioPending  = bioAchievs.filter(a => HERO.level >= a.level && !claimed.includes(a.id)).length;
    const allDone = bioClaimed === bioAchievs.length;
    const isOpen = HERO.level >= biome.min;
    // Default open only for the current biome section
    const currentBiome = RPG.currentBiome(HERO.level);
    const defaultOpen = biome === currentBiome || (bioPending > 0 && bioUnlocked > 0);

    const section = el('div', 'achiev-cat-section');
    const header = el('button', 'achiev-cat-header');
    header.innerHTML = `
      <span class="achiev-cat-left">
        <span class="achiev-cat-icon">${isOpen ? biome.icon : '🔒'}</span>
        <span>
          <span class="achiev-cat-name">${isOpen ? biome.name : '???'}</span>
          <span class="achiev-cat-meta"> · Lv ${biome.min}–${biome.max} · ${bioUnlocked}/${bioAchievs.length}</span>
        </span>
      </span>
      <span>
        ${bioPending > 0 ? `<span class="achiev-cat-badge">+${bioPending} 🪙</span>` : (allDone ? `<span class="achiev-cat-badge done">✅</span>` : '')}
        <span class="achiev-cat-toggle">${defaultOpen ? '▲' : '▼'}</span>
      </span>`;

    const body = el('div', 'achiev-cat-body' + (defaultOpen ? '' : ' collapsed'));
    bioAchievs.forEach(a => {
      const unlocked = HERO.level >= a.level;
      const isClaimed = claimed.includes(a.id);
      const row = el('div', 'achievement-row' + (unlocked ? '' : ' locked') + (a.epic ? ' epic' : ''));
      row.innerHTML = `
        <div class="achievement-icon">${unlocked ? a.icon : '🔒'}</div>
        <div class="achievement-mid">
          <b>${unlocked ? esc(a.name) : '???'}</b>
          <div class="small muted">${unlocked ? esc(a.desc) : `Sblocca al Livello ${a.level}`}</div>
        </div>
        <div class="achievement-side"></div>`;
      const side = row.querySelector('.achievement-side');
      if (isClaimed) {
        side.innerHTML = '<span class="tag">✅</span>';
      } else if (unlocked) {
        const btn = el('button', 'btn btn-small btn-primary', `🪙${a.reward.gold}`);
        btn.addEventListener('click', () => {
          const r = RPG.claimAchievement(HERO, a.id);
          persist(); renderHUD();
          if (r && r.ok) { toast(`${a.icon} Impresa riscossa! +${r.reward.gold} 🪙 +${r.reward.xp} XP`); sfx('coin'); }
          else toast(r);
          setTab('hero');
        });
        side.appendChild(btn);
      } else {
        side.innerHTML = `<span class="small muted">Liv. ${a.level}</span>`;
      }
      body.appendChild(row);
    });

    header.addEventListener('click', () => {
      const open = !body.classList.contains('collapsed');
      body.classList.toggle('collapsed', open);
      header.querySelector('.achiev-cat-toggle').textContent = open ? '▼' : '▲';
    });
    section.appendChild(header);
    section.appendChild(body);
    catWrap.appendChild(section);
  });
  c.appendChild(catWrap);
}

function renderBestiaryView(c) {
  backBar(c);
  HERO.bestiary = HERO.bestiary || [];
  c.appendChild(el('h2', 'section-title on-parchment-title', '🐉 Il Bestiario dell\'Orda'));
  c.appendChild(el('p', 'muted small center',
    `${HERO.bestiary.length} / ${RPG.BESTIARY.length} creature scoperte`));
  const zones = [...new Set(RPG.BESTIARY.map(b => b.zone))];
  const accessible = RPG.accessibleZones(HERO);
  zones.forEach(zone => {
    const inZone = RPG.BESTIARY.filter(b => b.zone === zone);
    const isOpen = accessible.includes(zone) || inZone.some(b => HERO.bestiary.includes(b.id));
    c.appendChild(el('h3', 'bestiary-zone', (isOpen ? zoneIcon(zone) + ' ' + zone : '🔒 ???')));
    const grid = el('div', 'bestiary-grid');
    inZone.forEach(b => {
      const known = HERO.bestiary.includes(b.id);
      const card = el('div', 'beast' + (known ? '' : ' unknown') + (b.boss ? ' boss' : ''));
      const imgWrap = el('div', 'beast-img-wrap');
      if (b.id === 'cavaliere-drago') {
        imgWrap.appendChild(el('div', 'beast-emoji', known ? '🐉' : '❓'));
      } else {
        const img = el('img', 'beast-img');
        img.src = `assets/bestiario/${b.id}.png`;
        img.loading = 'lazy';
        imgWrap.appendChild(img);
      }
      card.appendChild(imgWrap);
      if (known) {
        card.appendChild(el('b', 'beast-name', b.name));
        if (b.boss) card.appendChild(el('span', 'tag tag-boss', b.final ? 'NEMESI' : 'BOSS'));
        card.appendChild(el('div', 'small beast-weak', `Debolezza: <b>${b.weakness}</b>`));
        card.appendChild(el('p', 'small lore', b.lore));
      } else {
        card.appendChild(el('b', 'beast-name', '???'));
        if (b.boss) card.appendChild(el('span', 'tag tag-boss', b.final ? 'NEMESI' : 'BOSS'));
        card.appendChild(el('p', 'small lore muted', b.boss
          ? (b.final ? 'Completa le 5 Memorie per svelarlo.' : 'Sconfiggilo nella sua missione.')
          : 'Avvistalo allenandoti in questa zona.'));
      }
      grid.appendChild(card);
    });
    c.appendChild(grid);
  });
}

/* ══════════════ Modal & toast ══════════════ */
function modal(html) {
  $('#modal-box').innerHTML = html;
  $('#modal').classList.remove('hidden');
}
function closeModal() { $('#modal').classList.add('hidden'); }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

let toastTimer = null;
function toast(msg) {
  let t = $('#toast');
  if (!t) { t = el('div', ''); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

/* ── Sfondo pergamena ── */
let PARCHMENT_OK = false;
(() => {
  const probe = new Image();
  probe.onload = () => {
    PARCHMENT_OK = true;
    if (CURRENT_TAB === 'hero') $('#tab-content').classList.add('bg-parchment');
  };
  probe.src = 'assets/backgrounds/pergamena.jpg';
})();

/* ── Icone UI personalizzate ── */
const UI_ICONS = {
  camp:   'assets/ui/tab-rifugio.png',
  map:    'assets/ui/tab-mappa.png',
  train:  'assets/ui/tab-allenati.png',
  market: 'assets/ui/tab-mercato.png',
  hero:   'assets/ui/tab-eroe.png',
};
const RES_ICONS = {
  gold:  'assets/ui/res-oro.png',
  wood:  'assets/ui/res-legna.png',
  stone: 'assets/ui/res-pietra.png',
};
(() => {
  Object.entries(UI_ICONS).forEach(([tab, path]) => {
    const probe = new Image();
    probe.onload = () => {
      const btn = document.querySelector(`#tabbar .tab[data-tab="${tab}"]`);
      if (!btn) return;
      const label = btn.querySelector('span');
      btn.textContent = '';
      const img = el('img', 'tab-icon');
      img.src = path;
      btn.appendChild(img);
      if (label) btn.appendChild(label);
    };
    probe.src = path;
  });
  Object.entries(RES_ICONS).forEach(([res, path]) => {
    const probe = new Image();
    probe.onload = () => {
      const span = document.getElementById('res-' + res);
      if (!span || !span.parentElement) return;
      const box = span.parentElement;
      const img = el('img', 'res-icon');
      img.src = path;
      box.innerHTML = '';
      box.appendChild(img);
      box.appendChild(document.createTextNode(' '));
      box.appendChild(span);
    };
    probe.src = path;
  });
})();


/* ═══════════ v2.7: UX & FOMO ═══════════ */

function todayISO() { return new Date().toISOString().slice(0, 10); }

/* ── Sincronizzazione da Apple Salute via Comandi Rapidi ──────
   Il Comando Rapido apre: https://.../?sync_km=5.2&sync_type=camminata
   Nessun server coinvolto: il numero arriva incollato nell'URL e il gioco
   lo applica all'eroe attualmente selezionato su QUESTO telefono. */
function showClipboardSyncBanner() {
  const banner = el('div', 'clipboard-sync-banner');
  banner.innerHTML = `
    <span class="csb-label">⚡ Passi dal Comando Rapido — tocca e incolla</span>
    <input class="csb-input" id="csb-input" type="number" inputmode="numeric" placeholder="Tocca qui → Incolla">`;
  document.body.appendChild(banner);

  const inp = document.getElementById('csb-input');
  inp.focus();
  inp.addEventListener('input', () => {
    const steps = parseInt(inp.value, 10);
    if (steps > 0) setTimeout(() => applyStepsSync(steps, banner), 300);
  });
  inp.addEventListener('paste', () => {
    setTimeout(() => {
      const steps = parseInt(inp.value, 10);
      if (steps > 0) applyStepsSync(steps, banner);
    }, 100);
  });
  setTimeout(() => { if (banner.parentNode) banner.remove(); }, 60000);
}

function applyStepsSync(steps, banner) {
  if (banner?.parentNode) banner.remove();
  if (!HERO || !(steps > 0)) return;
  const km = Math.round(steps * 0.00075 * 100) / 100;
  if (km < 0.05) { toast(`${steps} passi (${km} km) — troppo pochi.`); return; }
  const report = RPG.logHealthSync(HERO, 'camminata', km);
  if (report) { persist(); renderHUD(); showHealthSyncResult(report); }
  else toast('Attività già sincronizzata per oggi.');
}

function applyHealthSyncFromURL(hero) {
  try {
    const params = new URLSearchParams(location.search);
    // Accetta sync_steps (passi interi da HealthKit) oppure sync_km (km con virgola o punto)
    let km;
    if (params.has('sync_steps')) {
      const steps = parseInt(params.get('sync_steps'), 10);
      km = steps * 0.00075; // ~0.75 m per passo
    } else {
      km = parseFloat((params.get('sync_km') || '').replace(',', '.'));
    }
    const type = params.get('sync_type') || 'camminata';
    if (params.has('sync_km') || params.has('sync_type') || params.has('sync_steps')) {
      history.replaceState({}, '', location.pathname + location.hash);
    }
    if (!hero || !(km > 0) || !RPG.ACTIVITIES[type]) return null;
    return RPG.logHealthSync(hero, type, km);
  } catch (err) {
    console.error('Errore sincronizzazione Salute:', err);
    return null;
  }
}

function showHealthSyncResult(report) {
  if (!report || report.error) { nextOpening(); return; }
  const notable = report.levelsGained.length || report.missionComplete ||
    report.incursionComplete || report.fragments || report.sighting ||
    report.finalReveal || (report.loot && report.loot.length);
  if (notable) {
    showReport(report); // stesso popup completo degli allenamenti manuali
  } else {
    toast(`🏥 Sincronizzato da Salute: +${report.km} km, +${report.xp} XP`);
    nextOpening();
  }
}

/* ── Coda dei popup di apertura ── */
let OPEN_QUEUE = [];
function nextOpening() {
  closeModal();
  const fn = OPEN_QUEUE.shift();
  if (fn) fn();
}

/* ── Riepilogo "cosa ti aspetta oggi" ── */
function showDailySummary() {
  let rows = '';
  if (HERO.incursion && !HERO.incursion.done) {
    rows += `<div class="today-row">⚡ <div><b>Incursione:</b> ${esc(HERO.incursion.name)}<br>
      <span class="small muted">${(HERO.incursion.km - HERO.incursion.progressKm).toFixed(1)} km per il forziere · <span data-cd="midnight">…</span></span></div></div>`;
  }
  if (HERO.activeMission) {
    const m = RPG.MISSIONS.find(x => x.id === HERO.activeMission.id);
    if (m) rows += `<div class="today-row">🐎 <div><b>Missione:</b> ${m.name}<br>
      <span class="small muted">mancano ${(m.km - HERO.activeMission.progressKm).toFixed(1)} km</span></div></div>`;
  }
  rows += `<div class="today-row">🎯 <div><b>Obiettivo del giorno:</b> ${RPG.dailyGoalKm(HERO.level)} km</div></div>`;
  if (HERO.streak.count > 1)
    rows += `<div class="today-row">🔥 <div><b>Streak:</b> ${HERO.streak.count} giorni di fila — non spezzarla!</div></div>`;
  const nu = nextUnlock(HERO);
  if (nu) rows += `<div class="today-row">${nu.icon} <div><b>Prossimo sblocco</b> (liv. ${nu.level}): ${nu.text}</div></div>`;
  modal(`
    <h3 class="panel-title">🌅 La tua Giornata, ${esc(HERO.name)}</h3>
    ${rows}
    <button class="btn btn-primary wide" onclick="nextOpening(); setTab('train')">⚔️ Vado ad allenarmi!</button>
    <button class="btn wide" onclick="nextOpening()">Dopo</button>
  `);
}

/* ── Prossimo sblocco in arrivo ── */
function nextUnlock(hero) {
  const c = [];
  if (hero.level < 100) {
    const nm = Math.ceil((hero.level + 1) / 5) * 5;
    const mount = RPG.MOUNTS.find(m => m.level === nm);
    if (mount) c.push({ level: nm, icon: '🐴', text: `nuova cavalcatura` });
  }
  const nb = RPG.BIOMES.find(b => b.min > hero.level);
  if (nb) c.push({ level: nb.min, icon: nb.icon, text: `nuovo bioma da esplorare` });
  const tiers = [[16, 'Epici'], [31, 'Leggendari'], [51, 'Divini'], [76, 'Oscuri']];
  const nt = tiers.find(([lv]) => lv > hero.level);
  if (nt) c.push({ level: nt[0], icon: '💎', text: `loot di rarità ${nt[1]}!` });
  if (!c.length) return null;
  c.sort((a, b) => a.level - b.level);
  const n = c[0];
  n.inLv = n.level - hero.level;
  return n;
}

/* ── Badge rossi sulla tab bar ── */
function updateBadges() {
  if (!HERO) return;
  const set = (tab, on) => {
    const b = document.querySelector(`#tabbar .tab[data-tab="${tab}"]`);
    if (!b) return;
    let d = b.querySelector('.tab-badge');
    if (on && !d) b.appendChild(el('span', 'tab-badge'));
    if (!on && d) d.remove();
  };
  set('map', !!(HERO.incursion && !HERO.incursion.done));
  set('market', HERO.forgeSeen !== todayISO());
  set('hero', Object.entries(HERO.equipment || {}).some(([s, id]) =>
    !id && (HERO.items || []).some(i => i.slot === s)));
}

/* ── Countdown live (aggiornati ogni secondo) ── */
function msToMidnight() {
  const d = new Date(); const m = new Date(d);
  m.setHours(24, 0, 0, 0);
  return m - d;
}
function msToWeekEnd() {
  const d = new Date(); const m = new Date(d);
  const dow = (d.getDay() + 6) % 7; // 0 = lunedì
  m.setDate(d.getDate() + (7 - dow));
  m.setHours(0, 0, 0, 0);
  return m - d;
}
function fmtMs(ms) {
  const h = Math.floor(ms / 3600000), mm = Math.floor(ms % 3600000 / 60000);
  if (h >= 48) return Math.floor(h / 24) + ' giorni';
  if (h >= 1) return h + 'h ' + mm + 'm';
  const s = Math.floor(ms % 60000 / 1000);
  return mm + 'm ' + s + 's';
}
setInterval(() => {
  document.querySelectorAll('[data-cd]').forEach(e => {
    e.textContent = '⏳ ' + fmtMs(e.dataset.cd === 'week' ? msToWeekEnd() : msToMidnight());
  });
}, 1000);

/* ── Anteprima dei biomi (anche bloccati: hype!) ── */
function showBiomePreview(b, open) {
  const enemies = RPG.BESTIARY.filter(x => x.zone === b.name);
  let beasts = '';
  if (enemies.length) {
    beasts = `<p class="small muted center">Creature avvistate da queste parti:</p><div class="preview-beasts">` +
      enemies.map(x => {
        const known = HERO.bestiary.includes(x.id);
        return x.id === 'cavaliere-drago'
          ? `<div class="preview-beast">❓</div>`
          : `<img class="preview-beast${known && open ? '' : ' shadow'}" src="assets/bestiario/${x.id}.png">`;
      }).join('') + `</div>`;
  } else {
    beasts = `<p class="small muted center">Nessuno è mai tornato per raccontare quali creature si aggirino qui…</p>`;
  }
  const slug = RPG.biomeSlug(b);
  const figHtml = slug
    ? `<img class="preview-diorama${open ? '' : ' locked-diorama'}" src="assets/biomi/${slug}.png" onerror="this.outerHTML='<p class=&quot;center&quot; style=&quot;font-size:3rem&quot;>${b.icon}</p>'">`
    : `<p class="center" style="font-size:3rem">${b.icon}</p>`;
  modal(`
    ${figHtml}
    <h3 class="panel-title center">${b.name}</h3>
    <p class="center small"><span class="tag">Livelli ${b.min}–${b.max}</span></p>
    ${beasts}
    ${open
      ? `<p class="center small">✅ Bioma raggiunto: le sue missioni sono sulla Mappa.</p>`
      : `<p class="center"><b>🔒 Si apre al Livello ${b.min}</b><br><span class="small muted">Ti mancano ${b.min - HERO.level} livelli. Continua ad allenarti!</span></p>`}
    <button class="btn btn-primary wide" onclick="closeModal()">Chiudi</button>
  `);
}

/* ── Suoni (WebAudio, niente file esterni) ── */
let _AC = null;
function sfx(kind) {
  try {
    _AC = _AC || new (window.AudioContext || window.webkitAudioContext)();
    if (_AC.state === 'suspended') _AC.resume();
    const t = _AC.currentTime;
    const nota = (freq, start, dur, type = 'triangle', vol = 0.12) => {
      const o = _AC.createOscillator(), g = _AC.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t + start);
      g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
      o.connect(g).connect(_AC.destination);
      o.start(t + start); o.stop(t + start + dur);
    };
    if (kind === 'coin')  { nota(880, 0, .12); nota(1318, .07, .18); }
    if (kind === 'level') { [523, 659, 784, 1047].forEach((f, i) => nota(f, i * .1, .3)); }
    if (kind === 'chest') {
      nota(160, 0, .25, 'sawtooth', .18);
      [784, 988, 1175, 1568].forEach((f, i) => nota(f, .3 + i * .08, .35));
    }
    if (kind === 'hit')   { nota(220, 0, .1, 'sawtooth', .22); nota(110, .03, .16, 'square', .18); }
    if (kind === 'lose')  { nota(330, 0, .14, 'sawtooth', .2); nota(180, .1, .22, 'sawtooth', .18); }
    if (kind === 'block') { nota(500, 0, .06, 'square', .14); nota(400, .05, .09, 'square', .1); }
    if (kind === 'defeat'){ [440, 349, 262, 196].forEach((f, i) => nota(f, i * .16, .4, 'sawtooth', .16)); }
  } catch {}
}

/* ═══════════════════════════════════════════════════════════════
   L'ARENA — Duello a Morra dei Guerrieri (best of 5)
   ═══════════════════════════════════════════════════════════════ */
let BATTLE = null;
const battleEl = () => document.getElementById('battle');

function openArena() {
  try {
    if (RPG.battlesLeft(HERO) < 1) { toast('Nessuna sfida rimasta oggi. Torna domani!'); return; }
    const v = RPG.pickVillain(HERO);
    if (!v) { toast('Errore: nessuno sfidante trovato. Riprova.'); return; }
    const isFinal = v.id === 'cavaliere-drago';
    const fig = isFinal ? '<div class="battle-emoji">🐉</div>'
      : `<img class="arena-intro-img" src="assets/bestiario/${v.id}.png" onerror="this.style.display='none'">`;
    modal(`
      <div class="arena-intro">
        <p class="center big-news">⚔️ Uno sfidante appare!</p>
        ${fig}
        <h3 class="panel-title center">${v.name} ${v.boss ? '<span class="tag tag-boss">BOSS</span>' : ''}</h3>
        <p class="center small muted">Debolezza: <b>${v.weakness}</b></p>
        <p class="center small">Vinci <b>3 round su 5</b> a colpi di Fendente, Parata e Incantesimo!</p>
        <button class="btn btn-primary wide big" id="btn-begin-battle">🔥 COMBATTI!</button>
        <button class="btn wide" onclick="closeModal()">Fuggi…</button>
      </div>`);
    const beginBtn = document.getElementById('btn-begin-battle');
    if (beginBtn) beginBtn.addEventListener('click', () => beginBattle(v.id));
  } catch (err) {
    console.error('Errore Arena:', err);
    toast('⚠️ Errore Arena: ' + err.message);
  }
}

function beginBattle(villainId) {
  try {
    const v = RPG.BESTIARY.find(b => b.id === villainId);
    if (!v) { toast('⚠️ Sfidante non trovato.'); return; }
    if (!RPG.useBattle(HERO)) { closeModal(); toast('Sfide esaurite per oggi!'); return; }
    HERO.bestiary = HERO.bestiary || [];
    if (!HERO.bestiary.includes(v.id)) HERO.bestiary.push(v.id);
    persist();
    const petBonus = RPG.petArenaBonus(HERO);
    const furn = RPG.furnitureAggregate(HERO);
    const classBonus = RPG.classArenaBonus(HERO, v);
    const furnHpBonus = Math.round(100 * furn.arenaHpMult);
    const furnDmgBonus = Math.round(34 * (furn.arenaDmgMult + (v.boss ? furn.bossDmgMult : 0)));
    const maxHP = 100 + petBonus.hpBonus + furnHpBonus + classBonus.hpBonus;
    BATTLE = {
      v, heroHP: maxHP, heroMaxHP: maxHP, vHP: 100, dmg: 34, hw: 0, vw: 0, round: 1, busy: false, done: false,
      petBonus, furnBonus: {
        dmgBonus: furnDmgBonus + classBonus.dmgBonus,
        critChance: furn.arenaCritChance,
        critDmgMult: 1 + furn.arenaCritDmgMult,
        defMult: 1 - Math.min(0.8, furn.arenaDefMult),
        regenPct: (furn.flags.arenaRegen) || 0,
        extraLife: !!furn.flags.arenaExtraLife,
      },
      extraLifeUsed: false,
    };
    closeModal();
    battleEl().classList.remove('hidden');
    drawBattle();
    try { if (_AC && _AC.state === 'suspended') _AC.resume(); } catch {}
  } catch (err) {
    console.error('Errore inizio battaglia:', err);
    toast('⚠️ Errore: ' + err.message);
  }
}

function drawBattle() {
  try {
    const b = BATTLE;
    const isFinal = b.v.id === 'cavaliere-drago';
    const battleBiome = RPG.BIOMES.find(bi => bi.name === b.v.zone) || RPG.currentBiome(HERO.level);
    const vFig = isFinal ? '<div class="battle-emoji big">🐉</div>'
      : `<img class="battle-villain-img" id="battle-villain-img" src="assets/bestiario/${b.v.id}.png" onerror="this.outerHTML='<div class=&quot;battle-emoji&quot;>👹</div>'">`;
    const heroFig = isImageAvatar(HERO)
      ? `<img class="battle-hero-img" id="battle-hero-fig" src="${HERO.avatar}" onerror="this.outerHTML='<div class=&quot;battle-hero-img battle-hero-emoji&quot;>🧑</div>'">`
      : `<div class="battle-hero-img battle-hero-emoji" id="battle-hero-fig">${HERO.avatar || '🧑‍🌾'}</div>`;
    battleEl().style.backgroundImage = '';
    battleEl().classList.remove('has-diorama');
    battleEl().innerHTML = `
      <div class="battle-arena">
        <button class="battle-flee" id="battle-flee-btn" title="Fuggi dalla battaglia">✕ Fuggi</button>

        <div class="battle-header-frame">
          <div class="battle-topbar">
            <div class="battle-name">${b.v.name} ${b.v.boss ? '<span class="tag tag-boss">BOSS</span>' : ''}</div>
            <div class="pips" id="pips-v"></div>
          </div>
          <div class="hpbar-lg"><div class="hpbar-fill v" id="hp-v" style="width:100%"></div><span id="hp-v-num">100</span></div>
        </div>

        <div class="battle-stage">
          <div class="stage-slot villain" id="stage-villain">${vFig}</div>
          <div class="battle-center" id="battle-center">
            <div class="battle-round">Round ${b.round}</div>
            <div class="battle-weak small">Debolezza: ${b.v.weakness}</div>
          </div>
          <div class="stage-slot hero" id="stage-hero">${heroFig}</div>
        </div>

        <div class="battle-footer-frame">
          <div class="hpbar-lg hero"><div class="hpbar-fill h" id="hp-h" style="width:100%"></div><span id="hp-h-num">100</span></div>
          <div class="battle-topbar">
            <div class="pips" id="pips-h"></div>
            <div class="battle-name right">${esc(HERO.name)}</div>
          </div>
          <div class="battle-moves" id="battle-moves"></div>
        </div>
      </div>`;
    const fleeBtn = document.getElementById('battle-flee-btn');
    if (fleeBtn) fleeBtn.addEventListener('click', () => {
      BATTLE = null;
      closeBattle();
      toast('Sei fuggito dalla battaglia.');
    });
    drawPips();
    drawMoves();
  } catch (err) {
    console.error('Errore disegno battaglia:', err);
    BATTLE = null;
    closeBattle();
    toast('⚠️ Errore nella battaglia: ' + err.message);
  }
}

function drawPips() {
  const mk = (n) => Array.from({ length: 3 }, (_, i) => `<span class="pip${i < n ? ' on' : ''}"></span>`).join('');
  const pv = document.getElementById('pips-v'); if (pv) pv.innerHTML = mk(BATTLE.vw);
  const ph = document.getElementById('pips-h'); if (ph) ph.innerHTML = mk(BATTLE.hw);
}

function drawMoves() {
  const wrap = document.getElementById('battle-moves');
  if (!wrap) return;
  wrap.innerHTML = '';
  Object.entries(RPG.BATTLE_MOVES).forEach(([key, m]) => {
    const btn = el('button', 'move-btn', `<span class="move-icon">${m.icon}</span><span class="move-label">${m.label}</span>`);
    btn.addEventListener('click', () => chooseMove(key));
    wrap.appendChild(btn);
  });
}

function chooseMove(move) {
  const b = BATTLE;
  if (!b || b.busy || b.done) return;
  b.busy = true;
  const vmove = RPG.randomMove();
  const hm = RPG.BATTLE_MOVES[move], vm = RPG.BATTLE_MOVES[vmove];

  // Fase 1: rivelazione delle mosse
  const center = document.getElementById('battle-center');
  center.innerHTML = `<div class="reveal">
    <span class="reveal-move hero-move">${hm.icon}</span>
    <span class="reveal-vs">VS</span>
    <span class="reveal-move villain-move">${vm.icon}</span>
  </div>`;
  document.getElementById('battle-moves').classList.add('locked');

  setTimeout(() => {
    let result;
    if (move === vmove) result = 'tie';
    else if (RPG.battleBeats(move, vmove)) result = 'win';
    else result = 'lose';

    const pb = b.petBonus || { dmgBonus: 0, dodgeChance: 0, critMult: 1 };
    const fb = b.furnBonus || { dmgBonus: 0, critChance: 0, critDmgMult: 1, defMult: 1, regenPct: 0, extraLife: false };
    let msg;
    if (result === 'win') {
      let dealt = b.dmg + (pb.dmgBonus || 0) + (fb.dmgBonus || 0);
      const critChance = (pb.critMult > 1 ? 0.25 : 0) + fb.critChance;
      const critMult = (pb.critMult > 1 ? pb.critMult : 1) * fb.critDmgMult;
      let isCrit = critMult > 1 && Math.random() < critChance;
      if (isCrit) dealt = Math.round(dealt * critMult);
      b.vHP = Math.max(0, b.vHP - dealt); b.hw++;
      hitEffect('villain', dealt); sfx('hit');
      msg = `<div class="res-txt win">${hm.label}! ${hm.flavor}${isCrit ? ' ✨ COLPO CRITICO!' : ''}</div>`;
    } else if (result === 'lose') {
      if (pb.dodgeChance > 0 && Math.random() < pb.dodgeChance) {
        sfx('block');
        msg = `<div class="res-txt tie">🐾 Il tuo famiglio ti aiuta a schivare il colpo!</div>`;
      } else {
        const incoming = Math.max(1, Math.round(b.dmg * fb.defMult));
        if (incoming >= b.heroHP && fb.extraLife && !b.extraLifeUsed) {
          b.extraLifeUsed = true;
          b.heroHP = 1;
          hitEffect('hero', incoming); sfx('lose');
          msg = `<div class="res-txt lose">${vm.label} nemico! 💫 Un cimelio del Cimitero dei Draghi ti dona una VITA EXTRA!</div>`;
        } else {
          b.heroHP = Math.max(0, b.heroHP - incoming); b.vw++;
          hitEffect('hero', incoming); sfx('lose');
          msg = `<div class="res-txt lose">${vm.label} nemico! Sei stato colpito!</div>`;
        }
      }
    } else {
      sfx('block');
      msg = `<div class="res-txt tie">Colpi che si annullano!</div>`;
    }
    if (fb.regenPct > 0 && b.heroHP > 0) {
      b.heroHP = Math.min(b.heroMaxHP, Math.round(b.heroHP + b.heroMaxHP * fb.regenPct));
    }
    center.innerHTML += msg;
    updateBars();
    drawPips();

    setTimeout(() => {
      if (b.hw >= 3) return endBattle(true);
      if (b.vw >= 3) return endBattle(false);
      if (result !== 'tie') b.round++;
      b.busy = false;
      const c = document.getElementById('battle-center');
      c.innerHTML = `<div class="battle-round">Round ${b.round}</div><div class="battle-weak small">Debolezza: ${b.v.weakness}</div>`;
      document.getElementById('battle-moves').classList.remove('locked');
    }, 1100);
  }, 700);
}

function hitEffect(who, dmg) {
  const slot = document.getElementById(who === 'villain' ? 'stage-villain' : 'stage-hero');
  const arena = document.querySelector('.battle-arena');
  if (slot) {
    slot.classList.remove('hit'); void slot.offsetWidth; slot.classList.add('hit');
    const dn = el('div', 'dmg-float', '-' + dmg);
    slot.appendChild(dn);
    setTimeout(() => dn.remove(), 900);
  }
  if (arena) { arena.classList.remove('shake'); void arena.offsetWidth; arena.classList.add('shake'); }
  vibrate(who === 'hero' ? [60, 40, 60] : 40);
}

function updateBars() {
  const b = BATTLE;
  const hv = document.getElementById('hp-v'), hh = document.getElementById('hp-h');
  if (hv) hv.style.width = b.vHP + '%';
  if (hh) hh.style.width = Math.round(b.heroHP / (b.heroMaxHP || 100) * 100) + '%';
  const nv = document.getElementById('hp-v-num'), nh = document.getElementById('hp-h-num');
  if (nv) nv.textContent = Math.round(b.vHP);
  if (nh) nh.textContent = Math.round(b.heroHP);
}

function endBattle(heroWon) {
  const b = BATTLE;
  b.done = true;
  const moves = document.getElementById('battle-moves');
  if (moves) moves.innerHTML = '';
  const center = document.getElementById('battle-center');

  if (heroWon) {
    const chest = RPG.battleReward(HERO, b.v);
    persist(); renderHUD();
    sfx('level');
    if (center) center.innerHTML = `<div class="battle-result win">VITTORIA!</div>`;
    const vs = document.getElementById('stage-villain');
    if (vs) vs.classList.add('defeated');
    setTimeout(() => {
      closeBattle();
      PENDING_CHEST = { title: 'Vittoria su ' + b.v.name, chest };
      modal(`<div class="chest-zone">
        <p class="center big-news">⚔️ Hai sconfitto ${esc(b.v.name)}!</p>
        <button class="chest-btn" id="btn-open-chest"><img src="assets/ui/chest.svg" alt="scrigno"></button>
        <p class="small muted center">Tocca lo scrigno per aprirlo</p>
      </div>`);
      document.getElementById('btn-open-chest').addEventListener('click', openChest);
    }, 1500);
  } else {
    persist();
    sfx('defeat');
    if (center) center.innerHTML = `<div class="battle-result lose">SCONFITTA…</div>`;
    const hs = document.getElementById('stage-hero');
    if (hs) hs.classList.add('defeated');
    setTimeout(() => {
      closeBattle();
      modal(`<h3 class="panel-title center">💀 Sconfitta</h3>
        <p class="center">${esc(b.v.name)} ha avuto la meglio, stavolta.</p>
        <p class="muted small center">Nessuna vergogna! Equipaggia oggetti migliori, sali di livello e tornerai più forte.</p>
        <button class="btn btn-primary wide" onclick="closeModal()">Tornerò più forte!</button>`);
    }, 1500);
  }
}

function closeBattle() {
  const s = battleEl();
  s.classList.add('hidden');
  s.innerHTML = '';
  if (CURRENT_TAB === 'train') setTab('train'); // aggiorna il contatore sfide
}

/* ══════════════ Avvio ══════════════
   IMPORTANTE: questo blocco deve restare l'ULTIMA cosa nel file.
   Se venisse eseguito prima che tutte le dichiarazioni `let`/`const`
   di livello superiore (OPEN_QUEUE, BATTLE, ecc.) siano state
   valutate, chi riapre l'app con un eroe già selezionato manderebbe
   in crash l'intero script a metà (Temporal Dead Zone), lasciando
   funzionalità come l'Arena rotte per tutta la sessione. */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

function runSplash(done) {
  const fill = document.getElementById('splash-progress-fill');
  const text = document.getElementById('splash-progress-text');
  const splash = document.getElementById('screen-splash');
  let pct = 0;
  const timer = setInterval(() => {
    pct += 2;
    if (pct >= 100) {
      pct = 100;
      clearInterval(timer);
      setTimeout(() => {
        splash.classList.add('hidden');
        done();
      }, 250);
    }
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = pct + '%';
  }, 30);
}

runSplash(() => {
  if (STATE.current && STATE.heroes.find(h => h.id === STATE.current)) enterGame();
  else renderProfiles();
});
