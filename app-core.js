/* ═══════════════════════════════════════════════════════════════
   Hero's Pace — Interfaccia utente (v2.0)
   ═══════════════════════════════════════════════════════════════ */

/* Capgo OTA — notifica avvio corretto (solo in app nativa) */
if (window.Capacitor && window.Capacitor.isNativePlatform()) {
  var _capUpd = window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorUpdater;
  if (_capUpd) _capUpd.notifyAppReady();
}

/* ── Sincronizzazione nativa passi/distanza (HealthKit / Health Connect) ──
   Disponibile solo nell'app nativa (Capacitor). Sulla PWA resta il flusso
   manuale (Comandi Rapidi iOS / MacroDroid Android già esistente). */
function nativeHealthPlugin() {
  return (window.Capacitor && window.Capacitor.isNativePlatform() &&
    window.Capacitor.Plugins && window.Capacitor.Plugins.Health) || null;
}

async function syncNativeHealth(silent) {
  if (!HERO || !HERO.nativeHealthSync) return null;
  const Health = nativeHealthPlugin();
  if (!Health) return null;
  try {
    const auth = await Health.checkAuthorization({ read: ['steps'] });
    if (!auth || !auth.readAuthorized || !auth.readAuthorized.includes('steps')) return null;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { samples } = await Health.queryAggregated({
      dataType: 'steps',
      startDate: start.toISOString(),
      endDate: new Date().toISOString(),
      bucket: 'day',
      aggregation: 'sum',
    });
    const steps = Math.round((samples && samples[0] && samples[0].value) || 0);
    if (!(steps > 0)) return null;
    const km = steps * 0.00075;
    const isFirst = (HERO.onboardingStep || 0) <= 1;
    const report = RPG.logHealthSync(HERO, 'camminata', km);
    if (report && !report.error) {
      if (isFirst) HERO.onboardingStep = 2;
      persist(); renderHUD(); FB.syncHero(HERO).catch(() => {});
      if (HERO.guild && report.km > 0) FB.contributeToGuild(HERO, report.km).catch(() => {});
      checkMapNotify(); checkBoardNotify(); maybeSyncChallenge(); updateTabOnboardingPulse();
      if (isFirst) OPEN_QUEUE.push(showFirstWorkoutCelebration);
      if (silent) toast(`🔄 Sincronizzati ${steps} passi da Salute`);
      else showHealthSyncResult(report);
    }
    return report;
  } catch (err) {
    console.error('Errore sincronizzazione nativa Salute:', err);
    return null;
  }
}

async function enableNativeHealthSync() {
  const Health = nativeHealthPlugin();
  if (!Health) { toast('Disponibile solo nell\'app, non nel browser.'); return false; }
  try {
    const avail = await Health.isAvailable();
    if (!avail || !avail.available) { toast('Salute/Health Connect non disponibile su questo dispositivo.'); return false; }
    const status = await Health.requestAuthorization({ read: ['steps'], write: [] });
    if (!status || !status.readAuthorized || !status.readAuthorized.includes('steps')) {
      toast('Permesso negato. Puoi attivarlo dalle impostazioni del dispositivo.');
      return false;
    }
    HERO.nativeHealthSync = true;
    persist();
    await syncNativeHealth(true);
    return true;
  } catch (err) {
    console.error('Errore attivazione sync nativa Salute:', err);
    toast('Errore durante l\'attivazione.');
    return false;
  }
}

function disableNativeHealthSync() {
  if (!HERO) return;
  HERO.nativeHealthSync = false;
  persist();
}

/* Ri-sincronizza quando l'app torna in primo piano (non solo all'apertura) */
(function watchNativeHealthResume() {
  const App = window.Capacitor && window.Capacitor.isNativePlatform() &&
    window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (App) App.addListener('resume', () => { if (HERO) syncNativeHealth(true); });
})();

let STATE = RPG.load();
let HERO = null;
let CURRENT_TAB = 'camp';

const $ = sel => document.querySelector(sel);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  if (tag === 'img') e.loading = 'lazy';
  return e;
};
/* Helper: h3 panel-title con icona Pixar + fallback emoji */
const ptIcon = (src, text, fallback = '') =>
  `<img class="panel-title-icon" src="${src}" onerror="this.outerHTML='${fallback}'">${text}`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── Barra km riutilizzabile ──────────────────────────────────────
   title   : stringa HTML (etichetta sinistra)
   progress: km percorsi (number)
   total   : km obiettivo (number)
   opts:
     color  : 'gold' | 'danger' | 'blue'   (default 'gold')
     foot   : stringa HTML sotto la barra   (default '')
     extra  : stringa HTML lato destro del titolo (es. buff attivi)
──────────────────────────────────────────────────────────────────── */
function kmBarEl(title, progress, total, { color = 'gold', foot = '', extra = '' } = {}) {
  const pct  = Math.min(100, total > 0 ? Math.round(progress / total * 100) : 0);
  const done = pct >= 100;
  const wrap = el('div', 'km-bar-block');
  wrap.setAttribute('role', 'progressbar');
  wrap.setAttribute('aria-valuenow', String(pct));
  wrap.setAttribute('aria-valuemin', '0');
  wrap.setAttribute('aria-valuemax', '100');
  const hdr  = el('div', 'km-bar-hdr');
  hdr.innerHTML =
    `<span class="km-bar-title">${title}</span>` +
    `<span class="km-bar-right">${extra}<b class="km-bar-val">${progress.toFixed(1)}</b><span class="km-bar-sep"> / ${total} km</span></span>`;
  wrap.appendChild(hdr);
  const track = el('div', 'km-bar-track');
  const canvas = document.createElement('canvas');
  canvas.className = 'km-bar-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  track.appendChild(canvas);
  wrap.appendChild(track);
  requestAnimationFrame(() => runKmBarCanvas(canvas, pct, done ? 'done' : color));
  if (foot) {
    const f = el('div', 'km-bar-foot');
    f.innerHTML = foot;
    wrap.appendChild(f);
  }
  return wrap;
}

const KM_BAR_THEMES = {
  gold:   { a: '#c9932e', b: '#f0c060', glow: 'rgba(240,192,96,.65)' },
  danger: { a: '#c0392b', b: '#e05030', glow: 'rgba(224,80,48,.6)' },
  blue:   { a: '#2e6fb0', b: '#4a9fd4', glow: 'rgba(74,159,212,.6)' },
  done:   { a: '#27ae60', b: '#2ecc71', glow: 'rgba(46,204,113,.8)' },
};

function _kmRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function runKmBarCanvas(canvas, pct, themeKey) {
  if (!canvas.isConnected) return;
  const ctx = canvas.getContext('2d');
  const theme = KM_BAR_THEMES[themeKey] || KM_BAR_THEMES.gold;
  const cssH = canvas.parentElement.clientHeight || 22;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const done = themeKey === 'done';

  let particles = [];
  const seedParticles = fillW => {
    if (!done || reduceMotion) return;
    particles = Array.from({ length: 12 }, () => ({
      x: Math.random() * Math.max(fillW, 1),
      y: cssH * 0.5 + (Math.random() - 0.5) * 6,
      vy: -0.35 - Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.25,
      life: Math.random(),
      size: 1 + Math.random() * 1.6,
    }));
  };
  let seeded = false;

  function frame() {
    if (!canvas.isConnected) return;
    const cssW = canvas.parentElement.clientWidth || 300;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const wantW = Math.round(cssW * dpr), wantH = Math.round(cssH * dpr);
    if (canvas.width !== wantW || canvas.height !== wantH) {
      canvas.width = wantW; canvas.height = wantH;
      canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const r = cssH / 2;
    const fillW = cssW * (pct / 100);
    if (!seeded) { seedParticles(fillW); seeded = true; }

    if (fillW > 0.5) {
      ctx.save();
      _kmRoundRect(ctx, 0, 0, cssW, cssH, r);
      ctx.clip();
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = done ? 14 : 8;
      const grad = ctx.createLinearGradient(0, 0, fillW, 0);
      grad.addColorStop(0, theme.a);
      grad.addColorStop(1, theme.b);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, fillW, cssH);
      ctx.shadowBlur = 0;

      if (!reduceMotion) {
        const t = performance.now() / 1000;
        const sweepW = cssW * 0.3;
        const sweepX = ((t * 70) % (cssW + sweepW)) - sweepW;
        const sGrad = ctx.createLinearGradient(sweepX, 0, sweepX + sweepW, 0);
        sGrad.addColorStop(0, 'rgba(255,255,255,0)');
        sGrad.addColorStop(0.5, 'rgba(255,255,255,.38)');
        sGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sGrad;
        ctx.fillRect(0, 0, fillW, cssH);
      }
      ctx.restore();
    }

    if (particles.length) {
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life -= 0.012;
        if (p.life <= 0 || p.y < -4) {
          p.x = Math.random() * Math.max(fillW, 1);
          p.y = cssH * 0.5 + (Math.random() - 0.5) * 6;
          p.life = 1;
        }
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = theme.b;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    if (!reduceMotion) requestAnimationFrame(frame);
  }
  frame();
}

/* ── Avatar dei protagonisti (creati con l'IA) ── */
const AVATARS = [
  { path: 'assets/avatars/eroe1.webp',      storyId: 'eroe1',      label: 'Il Viandante' },
  { path: 'assets/avatars/eroe2.webp',      storyId: 'eroe2',      label: 'La Viandante' },
  { path: 'assets/avatars/fabbro.webp',     storyId: 'fabbro',     label: 'Il Fabbro' },
  { path: 'assets/avatars/stregone.webp',   storyId: 'stregone',   label: 'Lo Stregone' },
  { path: 'assets/avatars/alchimista.webp', storyId: 'alchimista', label: 'L\'Alchimista' },
  { path: 'assets/avatars/furfante.webp',   storyId: 'furfante',   label: 'Il Furfante' },
  { path: 'assets/avatars/maga.webp',       storyId: 'maga',       label: 'La Maga' },
  { path: 'assets/avatars/paladino.webp',          storyId: 'paladino',         label: 'Il Paladino' },
  { path: 'assets/avatars/ranger.webp',            storyId: 'ranger',           label: 'Il Ranger' },
  { path: 'assets/avatars/fata.webp',              storyId: 'fata',             label: 'La Fata Elfica' },
  { path: 'assets/avatars/principe.webp',          storyId: 'principe',         label: 'Il Principe delle Aquile' },
  { path: 'assets/avatars/principessa.webp',       storyId: 'principessa',      label: 'La Principessa Farfallosa' },
  { path: 'assets/avatars/regina.webp',            storyId: 'regina',           label: 'La Regina Oscura' },
  { path: 'assets/avatars/predone.webp',           storyId: 'predone',          label: 'Il Re dei Predoni' },
  { path: 'assets/avatars/principessa-ghiacci.webp', storyId: 'principessa_ghiacci', label: 'La Principessa dei Ghiacci' },
  { path: 'assets/avatars/sacerdotessa-sole.webp',   storyId: 'sacerdotessa_sole',   label: 'La Sacerdotessa del Sole' },
  { path: 'assets/avatars/principessa-draghi.webp',  storyId: 'principessa_draghi',  label: 'La Principessa dei Draghi' },
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
  sacerdotessa_sole: {
    title: 'La Sacerdotessa del Sole Nascente',
    text: `Nell'Ordine della Fiamma Eterna non si nasce — si viene chiamati. Lo scettro
solare che stringi fu forgiato dai tuoi predecessori con l'oro del primo
tramonto, e si accende di luce calda soltanto nelle mani di chi è davvero
degno. I tuoi fratelli sacerdoti dicevano che tu fossi la più dotata dell'ultimo
secolo: capace di trasformare il calore in guarigione, la luce in scudo e il
sorriso in un'arma più efficace di qualsiasi spada.
Vivevi nel Tempio del Meridiano, dove i malati arrivavano da ogni bioma e
ripartivano guariti. Ogni mattina consacravi il giorno al Sole con una preghiera
e ogni sera contavi le vite salvate come fossero monete d'oro — ma più preziose.
La notte dell'attacco non dormivi: stavi vegliando un bambino febbricitante
quando il cielo ha smesso di essere cielo e il Drago Antico ha oscurato le stelle.
Il Tempio ha retto per un'ora — la tua luce contro l'oscurità corrotta — poi le
fondamenta di pietra secolare hanno ceduto, e con loro la maggior parte dell'Ordine.
Sei uscita con lo scettro ancora acceso tra le macerie, il bambino in braccio
(salvo) e una certezza ferma come il sole a mezzogiorno: la luce non può essere
spenta, può solo essere spostata. Ora sei il Tempio. E cammini verso la Vetta
Oscura per riaccendere ciò che l'Orda ha spento.`,
  },
  principessa_draghi: {
    title: 'La Principessa del Sangue dei Draghi',
    text: `Non tutti i draghi sono nemici. Lo sai meglio di chiunque altro, tu che
hai passato i primi anni della vita tra le scaglie calde di Pyrion — il drago
rosso che tua madre aveva curato da un'ala spezzata e che aveva deciso, di sua
spontanea volontà, di non andarsene più. Sei cresciuta sentendo il suo respiro
come una seconda voce e imparando a leggere i fuochi di segnale che tracciava
nel cielo al tramonto: "pericolo", "pace", "torna a casa".
La tua armatura a scaglie non è cuoio — è un dono di Pyrion, scaglie cadute
durante la muta dell'anno in cui hai compiuto sedici anni, raccolte una a una
e intrecciate da tua madre in un'armatura che nessun fabbro umano avrebbe saputo
fare. La spada con il drago sull'elsa era nel tesoro di famiglia da generazioni:
dicevano che chi la brandisse con cuore puro sentisse nel polso il battito
di un fuoco antico.
Quando il Cavaliere del Drago è arrivato, Pyrion ha combattuto. È stato il
primo a cadere — tradito dalla corruzione del Drago Antico, lo stesso sangue ma
stravolto — e tu hai visto l'amico di una vita trasformarsi in fumo nero prima
che potessi raggiungerlo. Hai combattuto fino all'alba con la spada nella mano
destra e il ricordo di Pyrion nella sinistra. Poi sei partita.
Ogni chilometro è una scaglia del suo manto che porti con te. E quando arriverai
alla Vetta Oscura, il Cavaliere del Drago scoprirà che chi ha perso un drago non
teme più nulla — nemmeno un altro drago.`,
  },
  principessa_ghiacci: {
    title: 'La Principessa dei Ghiacci Eterni',
    text: `Oltre la Vetta Innevata, dove i cartografi scrivono solo "nulla" e si fermano,
c'è un palazzo di ghiaccio antico quanto il mondo. Non hai mai vissuto altrove: sei
cresciuta tra corridoi trasparenti che riflettono la luce del sole e la moltiplicano
in mille frammenti, e hai imparato a leggere le crepe nel ghiaccio come altri leggono
i libri. Tua madre ti insegnò che il ghiaccio non mente mai: conserva tutto ciò che
tocca esattamente com'era, senza abbellirlo e senza peggiorarlo.
La tua spada è stata forgiata da tuo padre con il ghiaccio antico del cuore del
palazzo — più duro del diamante, più tagliente di qualsiasi lama — e le rune incise
sul filo cantano quando soffia il vento del nord. L'hai impugnata per la prima volta
a dodici anni per difendere il palazzo da un branco di lupi ghiacciati; non hai mai
smesso di tenerla in mano da allora.
Il Cavaliere del Drago arrivò in un'alba di fiamma. Il fuoco incontrò il ghiaccio e
perse — ma non prima di spezzare la sigillatura che teneva il palazzo in piedi da
secoli. Hai visto le mura trasparenti diventare acqua, le torri crollare lentamente
come lacrime, e tua madre sciogliersi nel caos prima che tu potessi raggiungerla.
Di lei ti è rimasta solo la corona di ghiaccio vivo che porti — che non si scioglie
mai, perché il suo amore per te è già diventato qualcosa di più permanente del freddo.
Ora scendi dalle montagne per la prima volta nella tua vita, e il mondo scoprirà cosa
succede quando il gelo incontra la determinazione: il fuoco dell'Orda spegnerà se stesso.`,
  },
  predone: {
    title: 'Il Re dei Predoni',
    text: `Non hai mai chiesto il permesso a nessuno, e non hai intenzione di cominciare
adesso. Cresciuto ai margini delle terre di confine, hai imparato presto che le
leggi sono scritte dai potenti per proteggere se stessi — e che chi non ha nulla
da proteggere è libero come il vento.
La tua banda era la tua famiglia: sei compagni fidati, ognuno con la sua storia
e il suo segreto. Razziavate i convogli dell'Impero, ridistribuivate tra i
villaggi dimenticati ciò che sottraevate ai nobili, e dormivate sotto le stelle
con la certezza che nessuna prigione avrebbe retto abbastanza a lungo.
Poi arrivò l'Orda. In una notte sola, il Cavaliere del Drago trasformò le terre
di confine in cenere. I tuoi compagni si dispersero o caddero, e tu ti ritrovasti
solo, con il tuo mantello e la tua astuzia — e niente altro.
Sei in marcia da allora. Non per vendetta, non per gloria: per trovare quello che
l'Orda ha distrutto e riprenderti ciò che ti appartiene. Un passo alla volta,
un bottino alla volta. Il Re dei Predoni non chiede — conquista.`,
  },
};

function persist() { RPG.save(STATE); updateNotifState().catch(() => {}); }
function vibrate(pattern) { try { navigator.vibrate && navigator.vibrate(pattern); } catch {} }

/* ── Token per autenticazione sync URL (MacroDroid / Tasker / Shortcuts) ── */
function getSyncToken() {
  const KEY = 'rpgym_sync_token';
  let t = localStorage.getItem(KEY);
  if (!t || t.length < 16) {
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    t = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(KEY, t);
  }
  return t;
}
function maybeSyncChallenge() {
  if (HERO && HERO.cloud && HERO.cloud.activeChallenge) FB.updateChallenge(HERO).catch(() => {});
}

/* ══════════════ Schermate ══════════════ */

function show(id) {
  document.querySelectorAll('.screen').forEach(s => { s.classList.add('hidden'); s.classList.remove('screen-enter'); });
  const s = $('#' + id);
  s.classList.remove('hidden');
  const tabbar = $('#tabbar');
  if (id === 'screen-game') {
    tabbar.classList.remove('tab-hidden');
  } else {
    tabbar.classList.add('tab-hidden');
  }
  requestAnimationFrame(() => s.classList.add('screen-enter'));
}

function emptyState(icon, text) {
  const d = el('div', 'empty-state');
  d.innerHTML = `<div class="empty-state-icon">${icon}</div><p class="empty-state-text">${esc(text)}</p>`;
  return d;
}

function renderProfiles() {
  const list = $('#profile-list');
  list.innerHTML = '';
  if (!STATE.heroes.length) {
    list.appendChild(emptyState('⚔️', 'Nessun eroe ancora. Tocca + per crearne uno!'));
  }
  STATE.heroes.forEach(h => {
    const storyId = (h.avatar || '').replace('assets/avatars/', '').replace(/\.(webp|png)$/, '');
    const col = AVATAR_COLORS[storyId] || { bg: '#0e0804', glow: '#c9932e' };
    const avatarMeta = AVATARS.find(a => a.storyId === storyId);
    const classLabel = avatarMeta ? avatarMeta.label : '';
    const card = el('div', 'profile-card');
    card.style.setProperty('--phero-glow', col.glow + '30');
    card.style.setProperty('--phero-accent', col.glow);
    card.appendChild(avatarEl(h, 'profile-avatar'));
    const info = el('div', 'profile-info');
    info.innerHTML = `<span class="profile-hero-name">${esc(h.name)}</span>
      <span class="profile-hero-class">${esc(classLabel)}</span>
      <div class="profile-chips">
        <span class="profile-chip">Liv. ${h.level}</span>
        <span class="profile-chip">🏃 ${h.totalKm.toFixed(1)} km</span>
        <span class="profile-chip">🪙 ${h.gold}</span>
      </div>`;
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
    img.loading = 'eager';
    img.src = hero.avatar;
    img.alt = hero.name;
    // Fallback: prova .webp se il file .png non esiste (migrazione asset)
    img.onerror = () => {
      if (hero.avatar.endsWith('.png')) {
        img.onerror = null;
        img.src = hero.avatar.slice(0, -4) + '.webp';
      }
    };
    return img;
  }
  return el('div', cls + ' avatar-emoji', hero.avatar || '🧑‍🌾');
}
function isImageAvatar(hero) {
  return hero.avatar && (hero.avatar.startsWith('data:') || hero.avatar.startsWith('assets/'));
}

/* Avatar con cornice cosmetica del Pass Stagionale, se equipaggiata */
function avatarWithFrameEl(hero, cls) {
  const av = avatarEl(hero, cls);
  if (!hero.frameId) return av;
  const cos = RPG.seasonPassCosmeticById(hero.frameId);
  if (!cos) return av;
  const wrap = el('div', 'sp-frame-wrap');
  wrap.appendChild(av);
  const frameImg = el('img', 'sp-frame-overlay');
  frameImg.src = `assets/seasonpass/rewards/${cos.img}`;
  frameImg.alt = '';
  frameImg.addEventListener('error', () => frameImg.remove());
  wrap.appendChild(frameImg);
  return wrap;
}

/* ── Creazione eroe — Card Cinematografica ── */
const AVATAR_LORE = {
  eroe1:       'Nato dalla cenere di Oakhaven, cammina per trovare risposte.',
  eroe2:       'Figlia dell\'erborista, conosce i segreti di ogni sentiero.',
  fabbro:      'Dal fuoco della forgia nasce l\'acciaio dei campioni.',
  stregone:    'Le stelle gli parlano. Lui risponde con fiamme.',
  alchimista:  'Trasforma sudore in oro, fatica in trionfo.',
  furfante:    'Veloce nel buio, invisibile alla luce.',
  maga:        'Tesse incantesimi con ogni passo, ogni respiro.',
  paladino:    'La fede è la sua armatura più pesante.',
  ranger:      'I boschi lo conoscono. Lui li conosce meglio.',
  fata:        'Dove cammina, fiorisce. Dove combatte, vince.',
  principe:    'Il sangue nobile non basta. Serve il coraggio.',
  principessa: 'Una corona non si eredita. Si conquista.',
  regina:      'Ha visto crollare regni. Il suo è ancora in piedi.',
  predone:     'Nessuna legge. Nessuna bandiera. Solo la strada e il bottino.',
  principessa_ghiacci: 'Il ghiaccio non mente. E lei nemmeno.',
  sacerdotessa_sole:   'La luce non si spegne. Si sposta.',
  principessa_draghi:  'Chi ha perso un drago non teme più nulla.',
};
const AVATAR_DIMS = {
  eroe1:{w:417,h:700}, eroe2:{w:535,h:535}, fabbro:{w:535,h:535},
  stregone:{w:535,h:535}, alchimista:{w:535,h:535}, furfante:{w:535,h:535},
  maga:{w:535,h:535}, paladino:{w:401,h:535}, fata:{w:601,h:700},
  principe:{w:529,h:700}, principessa:{w:542,h:700}, ranger:{w:368,h:700},
  regina:{w:558,h:700},
  principessa_ghiacci:{w:700,h:700},
  sacerdotessa_sole:  {w:700,h:700},
  principessa_draghi: {w:700,h:700},
};
const AVATAR_COLORS = {
  eroe1:       { bg: '#0d2215', glow: '#2e8b57' },
  eroe2:       { bg: '#1a0d22', glow: '#7b3fbf' },
  fabbro:      { bg: '#221508', glow: '#b07030' },
  stregone:    { bg: '#080d22', glow: '#3b5fcf' },
  alchimista:  { bg: '#062218', glow: '#2e8a6a' },
  furfante:    { bg: '#220808', glow: '#b03030' },
  maga:        { bg: '#1a082a', glow: '#af5fcf' },
  paladino:    { bg: '#1e1800', glow: '#c9b030' },
  ranger:      { bg: '#081a0a', glow: '#4aae5a' },
  fata:        { bg: '#100828', glow: '#7055cf' },
  principe:    { bg: '#1a1008', glow: '#c9882e' },
  principessa: { bg: '#22081a', glow: '#cf5aaf' },
  regina:      { bg: '#0d0218', glow: '#8a30cf' },
  predone:                { bg: '#1a0e00', glow: '#c97a2e' },
  principessa_ghiacci:   { bg: '#071a2e', glow: '#60c8f5' },
  sacerdotessa_sole:     { bg: '#1e1600', glow: '#f5c842' },
  principessa_draghi:    { bg: '#1e0800', glow: '#e05a20' },
};
let pickedAvatar = AVATARS[0];
let createIdx = 0;
let _createReady = false;
let _createTouchX = 0;

function renderCreate() {
  createIdx = Math.max(0, AVATARS.indexOf(pickedAvatar));
  if (!_createReady) {
    _createReady = true;
    $('#create-prev').addEventListener('click', () => {
      createIdx = (createIdx - 1 + AVATARS.length) % AVATARS.length;
      _updateCreate();
    });
    $('#create-next').addEventListener('click', () => {
      createIdx = (createIdx + 1) % AVATARS.length;
      _updateCreate();
    });
    const zone = $('#create-card-zone');
    zone.addEventListener('touchstart', e => { _createTouchX = e.touches[0].clientX; }, { passive: true });
    zone.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - _createTouchX;
      if (Math.abs(dx) > 40) {
        createIdx = (createIdx + (dx < 0 ? 1 : -1) + AVATARS.length) % AVATARS.length;
        _updateCreate();
      }
    }, { passive: true });
  }
  _updateCreate();
  show('screen-create');
}

function _updateCreate() {
  pickedAvatar = AVATARS[createIdx];
  const a = pickedAvatar;
  const col = AVATAR_COLORS[a.storyId] || { bg: '#0e0804', glow: '#c9932e' };
  $('#create-card-zone').style.background =
    `radial-gradient(ellipse at 50% 30%, ${col.glow}44 0%, ${col.bg} 58%, #060402 100%)`;
  const portrait = $('#create-portrait');
  portrait.style.setProperty('--portrait-glow', col.glow);
  portrait.style.opacity = '0';
  clearTimeout(portrait._t);
  portrait._t = setTimeout(() => {
    portrait.innerHTML = '';
    const img = document.createElement('img');
    img.src = a.path;
    img.className = 'create-portrait-img';
    img.onerror = () => { portrait.innerHTML = '<span style="font-size:5rem">⚔️</span>'; };
    portrait.appendChild(img);
    portrait.style.opacity = '1';
  }, 150);
  $('#create-class-name').textContent = a.label;
  $('#create-lore').textContent = AVATAR_LORE[a.storyId] || '';
  $('#create-dots').textContent = `${createIdx + 1} / ${AVATARS.length}`;
  const t = RPG.CLASS_TALENTS[a.storyId];
  $('#create-talent-name').textContent = t ? `${t.icon} ${t.name}` : '';
  $('#create-talent-desc').textContent = t ? t.desc : '';
}

function _createNameError(msg) {
  const e = $('#create-name-error');
  e.textContent = msg;
  e.classList.add('visible');
  clearTimeout(e._t);
  e._t = setTimeout(() => e.classList.remove('visible'), 3000);
}
function _doCreateConfirm() {
  const name = $('#create-name').value.trim();
  if (!name) { _createNameError('Ogni eroe ha bisogno di un nome!'); return; }
  const h = RPG.newHero(name, pickedAvatar.path);
  h.storyId = pickedAvatar.storyId;
  STATE.heroes.push(h);
  STATE.current = h.id;
  persist();
  enterGame();
}
$('#btn-new-hero').addEventListener('click', () => { $('#create-name').value = ''; $('#create-name-error').classList.remove('visible'); renderCreate(); });
$('#btn-create-back').addEventListener('click', renderProfiles);
$('#btn-create-confirm').addEventListener('click', _doCreateConfirm);
$('#create-name').addEventListener('keydown', e => { if (e.key === 'Enter') _doCreateConfirm(); });
$('#create-name').addEventListener('input', () => $('#create-name-error').classList.remove('visible'));

/* ══════════════ Gioco ══════════════ */

function enterGame() {
  HERO = STATE.heroes.find(h => h.id === STATE.current);
  if (!HERO) { renderProfiles(); return; }
  RPG.migrateHero(HERO);
  show('screen-game');
  renderHUD();
  setTab('camp');
  setupNotifications();
  // Rollover incursione + boss + mappa tesoro
  const missed = RPG.rolloverIncursion(HERO);
  RPG.rolloverWeeklyBoss(HERO);
  RPG.rolloverTreasureMap(HERO);
  // Assegna retroattivamente i punti abilità per i livelli già guadagnati
  RPG.earnSkillPoints(HERO);
  // Mercante Fuggiasco (aggiorna giornalmente)
  RPG.rolloverFugitiveMerchant(HERO);
  // Mappa Infuocata (aggiorna settimanalmente)
  RPG.rolloverMappaInfuocata(HERO);
  // Serra del Viandante (aggiorna giornalmente)
  const serraLogs = RPG.rolloverGreenhouse(HERO);
  if (serraLogs && serraLogs.length) {
    serraLogs.forEach(msg => OPEN_QUEUE.push(() => modal(`
      <h3 class="panel-title">🌿 Serra del Viandante</h3>
      <p class="center" style="font-size:1.5rem">🌱</p>
      <p class="center">${msg}</p>
      <button class="btn btn-primary wide" onclick="nextOpening()">Capito!</button>`)));
  }
  // Salva streak prima del login giornaliero (per rilevare rottura)
  const preStreakCount = HERO.streak.count;
  // Tesoro Giornaliero
  const login = RPG.dailyLogin(HERO);
  const streakBroke = login && preStreakCount > 1 && HERO.streak.count === 1;
  persist();
  renderHUD();

  // Sincronizza il profilo su Firestore all'avvio (popola la classifica globale)
  FB.syncHero(HERO);

  // Sincronizzazione automatica da Apple Salute (URL params o clipboard)
  const healthReport = applyHealthSyncFromURL(HERO);
  if (healthReport) { persist(); renderHUD(); FB.syncHero(HERO).catch(() => {}); if (HERO.guild && healthReport.km > 0) FB.contributeToGuild(HERO, healthReport.km).catch(() => {}); maybeSyncChallenge(); }

  // Sincronizzazione automatica nativa (HealthKit / Health Connect), se attivata
  syncNativeHealth(true);

  // Coda dei popup di apertura
  OPEN_QUEUE = [];
  if (healthReport) OPEN_QUEUE.push(() => showHealthSyncResult(healthReport));

  // Sync passi: disponibile inline nel tab Allenati (non più popup automatico)
  if (missed) {
    const it = missed.lostItem;
    const rarInfo = it ? RPG.RARITIES[it.rarity] : (missed.minRarity ? RPG.RARITIES[missed.minRarity] : null);
    const rarKey = it ? it.rarity : missed.minRarity;
    const itemImg = it ? RPG.itemImg(it) : null;
    const itemVisual = it
      ? (itemImg
          ? `<img class="nm-item-img" src="${itemImg}" alt="" onerror="this.outerHTML='<span class=nm-item-emoji>${it.icon}</span>'">`
          : `<span class="nm-item-emoji">${it.icon}</span>`)
      : `<span class="nm-item-emoji">🎁</span>`;
    const itemName = it ? esc(it.name) : esc(missed.name);
    const rarLabel = rarInfo ? rarInfo.label : '';
    OPEN_QUEUE.push(() => modal(`
      <h3 class="panel-title">💨 Bottino Perduto…</h3>
      <div class="nm-item-wrap">
        <div class="nm-item-veil rar-${rarKey}">
          ${itemVisual}
        </div>
        ${rarInfo ? `<div class="nm-rarity-chip rar-chip-${rarKey}">${rarLabel}</div>` : ''}
      </div>
      <p class="center nm-item-name"><b>${itemName}</b></p>
      <p class="muted center nm-miss-text">Ha portato con sé questo oggetto. Ti mancavano solo <b>${missed.kmMissing} km</b> per reclamarlo!</p>
      <button class="btn btn-primary wide" onclick="nextOpening()">Domani non scapperà!</button>`));
  }
  if (streakBroke) OPEN_QUEUE.push(() => showStreakFreezeOffer(preStreakCount));
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
  // Recap mensile (primo accesso del nuovo mese)
  const curMonth = RPG.monthStamp();
  if (HERO.lastRecapMonth !== curMonth) {
    const recap = RPG.getMonthlyRecap(HERO);
    HERO.lastRecapMonth = curMonth;
    persist();
    if (recap) OPEN_QUEUE.push(() => showMonthlyRecap(recap));
  }
  // Recap settimanale — solo il lunedì (getDay()===1)
  const curWeek = RPG.weekStamp();
  if (HERO.lastRecapWeek !== curWeek) {
    HERO.lastRecapWeek = curWeek;
    persist();
    if (new Date().getDay() === 1 && (HERO.log || []).length > 0) {
      const wrecap = RPG.getWeeklyRecap(HERO);
      if (wrecap) OPEN_QUEUE.push(() => showWeeklyRecap(wrecap));
    }
  }
  // Riepilogo "cosa ti aspetta oggi" (una volta al giorno, non al primo accesso)
  if (HERO.summarySeen !== todayISO() && (HERO.totalKm || 0) > 0) {
    HERO.summarySeen = todayISO();
    persist();
    OPEN_QUEUE.push(showDailySummary);
  }
  // Tutorial per i nuovi eroi (mostrato prima di tutto il resto)
  if (!HERO.tutorialDone) OPEN_QUEUE.unshift(showTutorial);
  // Lettere dal mondo (milestone di livello, km, streak)
  RPG.checkPendingLetters(HERO).forEach(letter => OPEN_QUEUE.push(() => showWorldLetter(letter)));
  // Tappe della Via (milestone di sessioni)
  RPG.checkPendingMilestones(HERO).forEach(m => OPEN_QUEUE.push(() => showMilestone(m)));
  nextOpening();

  // Inviti PvP in arrivo da Firestore
  (async () => {
    const invites = await FB.getPendingInvites(HERO.id);
    if (!invites.length) return;
    invites.forEach(inv => OPEN_QUEUE.push(() => showChallengeInviteModal(inv)));
    if (document.getElementById('modal').classList.contains('hidden')) nextOpening();
  })();
}

/* ══════════════ Tutorial ══════════════ */
const TUTORIAL_SLIDES = [
  {
    title: 'Benvenuto ad Oakhaven',
    text: 'Hero\'s Pace trasforma ogni km che percorri nella vita reale in <b>XP, oro e avventure</b>. Più ti alleni, più il tuo eroe diventa leggendario.',
    scene: 'world',
  },
  {
    title: 'Allenati. Sali di livello.',
    text: 'Registra camminata, corsa o bici in <b>Allenati</b>. Ogni sessione porta XP, oro e oggetti rari — il tuo eroe cresce con te.',
    scene: 'train',
  },
  {
    title: 'Tre mondi da esplorare',
    text: 'Costruisci il <b>Rifugio</b>, fai shopping nel <b>Borgo</b>, combatti nell\'<b>Arena</b>. Tutto si sblocca allenandosi.',
    scene: 'hubs',
  },
  {
    title: 'Sfide giornaliere & Streak',
    text: 'Ogni giorno hai <b>3 sfide</b> da completare: km, Arena, mini-gioco. Completa tutto per il <b>bonus streak</b> e ricompense sempre più rare.',
    scene: 'streak',
  },
  {
    title: 'Inizia adesso!',
    text: 'Vai in <b>Allenati</b> e registra il tuo primo km. Il Rifugio ti aspetta — e la leggenda ha già inizio.',
    scene: 'start',
  },
];

function _buildTutScene(scene) {
  const d = document.createElement('div');
  d.className = `tut-art-scene tut-scene-${scene}`;
  if (scene === 'world') {
    d.innerHTML = `<div class="tut-scene-inner tut-world-inner">⛰️ 🗺️ 🌲</div>`;
  } else if (scene === 'train') {
    d.innerHTML = `<div class="tut-scene-inner tut-train-inner">
      <div class="tut-train-row">🏃 → ⭐ 🪙 📦</div>
      <div class="tut-xpbar"><div class="tut-xpbar-fill"></div></div>
    </div>`;
  } else if (scene === 'hubs') {
    d.innerHTML = `
      <div class="tut-hub-item">🏕️<span class="tut-hub-label">Rifugio</span></div>
      <div class="tut-hub-item">🏘️<span class="tut-hub-label">Borgo</span></div>
      <div class="tut-hub-item">⚔️<span class="tut-hub-label">Arena</span></div>`;
  } else if (scene === 'streak') {
    d.innerHTML = `<div class="tut-scene-inner tut-streak-inner">
      <div class="tut-streak-left">
        <div class="tut-streak-fire">🔥</div>
        <div class="tut-streak-num">7</div>
        <div class="tut-streak-label">giorni</div>
      </div>
      <div class="tut-streak-checks">
        <div class="tut-scheck tut-scheck-done">✅ 3 km percorsi</div>
        <div class="tut-scheck tut-scheck-done">✅ Arena</div>
        <div class="tut-scheck tut-scheck-pending" id="tut-check-mg">☐ Mini-gioco</div>
      </div>
    </div>`;
  } else if (scene === 'start') {
    d.innerHTML = `<div class="tut-scene-inner"><span class="tut-start-icon">⚔️</span></div>`;
  }
  return d;
}

function showTutorial() {
  let idx = 0;
  let touchStartX = 0;
  const n = TUTORIAL_SLIDES.length;

  const overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';
  overlay.innerHTML = `
    <div class="tutorial-card">
      <button class="tutorial-skip" aria-label="Salta">✕</button>
      <div class="tut-viewport"></div>
      <div class="tutorial-dots"></div>
      <button class="btn btn-primary tutorial-btn"></button>
    </div>`;

  const viewport = overlay.querySelector('.tut-viewport');
  const dotsEl   = overlay.querySelector('.tutorial-dots');
  const btn       = overlay.querySelector('.tutorial-btn');

  // Build carousel track with all slides upfront
  const track = document.createElement('div');
  track.className = 'tut-track';
  track.style.width = `${n * 100}%`;
  TUTORIAL_SLIDES.forEach(s => {
    const slide = document.createElement('div');
    slide.className = 'tut-slide';
    slide.style.width = `${100 / n}%`;
    slide.appendChild(_buildTutScene(s.scene));
    const title = document.createElement('div');
    title.className = 'tutorial-title';
    title.textContent = s.title;
    const text = document.createElement('div');
    text.className = 'tutorial-text';
    text.innerHTML = s.text;
    slide.appendChild(title);
    slide.appendChild(text);
    track.appendChild(slide);
  });
  viewport.appendChild(track);

  function updateUI() {
    track.style.transform = `translateX(-${idx * (100 / n)}%)`;
    dotsEl.innerHTML = Array.from({ length: n }, (_, i) =>
      `<span class="tutorial-dot${i === idx ? ' active' : ''}"></span>`
    ).join('');
    btn.innerHTML = idx === n - 1 ? '⚔️ Inizia l\'avventura!' : 'Avanti →';
    // Animate the pending check on the streak slide
    if (TUTORIAL_SLIDES[idx] && TUTORIAL_SLIDES[idx].scene === 'streak') {
      const chk = overlay.querySelector('#tut-check-mg');
      if (chk && !chk.classList.contains('tut-scheck-done')) {
        setTimeout(() => {
          if (!chk.classList.contains('tut-scheck-done')) {
            chk.textContent = '✅ Mini-gioco';
            chk.className = 'tut-scheck tut-scheck-done';
          }
        }, 900);
      }
    }
  }

  function go(newIdx) {
    idx = Math.max(0, Math.min(n - 1, newIdx));
    updateUI();
  }

  function close() {
    keyActive = false;
    document.removeEventListener('keydown', onKey);
    overlay.classList.add('tutorial-out');
    setTimeout(() => overlay.remove(), 300);
    HERO.tutorialDone = true;
    if (HERO.onboardingStep < 1) HERO.onboardingStep = 1;
    persist();
    updateTabOnboardingPulse();
    nextOpening();
    setTab('train');
    // Brief pulse on the workout entry to guide eyes
    setTimeout(() => {
      const inp = document.querySelector('.sss-input');
      if (inp) { inp.classList.add('tut-entry-pulse'); setTimeout(() => inp.classList.remove('tut-entry-pulse'), 2200); }
    }, 400);
  }

  btn.addEventListener('click', () => { if (idx === n - 1) close(); else go(idx + 1); });
  overlay.querySelector('.tutorial-skip').addEventListener('click', close);

  // Keyboard navigation (removed in close via flag)
  let keyActive = true;
  function onKey(e) {
    if (!keyActive) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(idx + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(idx - 1);
    else if (e.key === 'Escape') close();
  }
  document.addEventListener('keydown', onKey);

  // Swipe support
  overlay.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  overlay.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) go(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });

  updateUI();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('tutorial-in'));

}

function updateTabOnboardingPulse() {
  const trainTab = document.querySelector('#tabbar .tab[data-tab="train"]');
  if (!trainTab) return;
  const showPulse = HERO && HERO.onboardingStep === 1;
  trainTab.classList.toggle('tab-onboarding-pulse', showPulse);
}

/* ── Banner contestuale di onboarding progressivo ──────────────────────────
   Mostra un suggerimento nella tab giusta al momento giusto.
   Scompare non appena l'utente completa l'azione suggerita.
   step = il valore di HERO.onboardingStep richiesto per mostrarlo.
   onAction: callback che avanza lo step e naviga.
───────────────────────────────────────────────────────────────────────── */
function renderOnboardingBanner(c, { step, icon, title, desc, actionLabel, onAction }) {
  if (!HERO || HERO.onboardingStep !== step) return;
  const banner = el('div', 'onb-banner');
  banner.innerHTML = `
    <div class="onb-icon">${icon}</div>
    <div class="onb-body">
      <div class="onb-title">${title}</div>
      <div class="onb-desc">${desc}</div>
    </div>
    <button class="onb-btn">${actionLabel} →</button>`;
  banner.querySelector('.onb-btn').addEventListener('click', () => {
    banner.classList.add('onb-out');
    setTimeout(() => banner.remove(), 250);
    onAction();
  });
  c.insertBefore(banner, c.firstChild);
}

/* Avanza onboardingStep se è esattamente al valore atteso.
   toStep opzionale: salta direttamente a quel valore (es. 2→10 per saltare il 3 legacy). */
function advanceOnboarding(fromStep, toStep) {
  if (!HERO || HERO.onboardingStep !== fromStep) return;
  HERO.onboardingStep = toStep !== undefined ? toStep : fromStep + 1;
  persist();
}

const TAB_TOOLTIP_TEXT = {
  camp:   { icon: '🏕️', title: 'Rifugio',   body: 'La tua base. Costruisci strutture per ottenere bonus permanenti al tuo eroe.' },
  map:    { icon: '🗺️', title: 'Mappa',     body: 'Ogni km che cammini o corri avanza il tuo viaggio. Esplora nuove regioni!' },
  train:  { icon: '🥾', title: 'Allenati',  body: 'Registra ogni camminata, corsa o pedalata e convertila in XP e oro per il tuo eroe.' },
  market: { icon: '🏘️', title: 'Borgo',     body: 'Commercia con gli NPC, compra consumabili e sfida i rivali dell\'Arena.' },
  hero:   { icon: '🧑‍🦯', title: 'Eroe',      body: 'Equipaggiamento, statistiche e tutto ciò che riguarda il tuo personaggio.' },
};

function showTabTooltip(tab) {
  if (!HERO) return;
  if (!HERO.seenTabs) HERO.seenTabs = [];
  if (HERO.seenTabs.includes(tab)) return;
  HERO.seenTabs.push(tab);
  persist();

  const info = TAB_TOOLTIP_TEXT[tab];
  if (!info) return;

  const old = document.querySelector('.tab-tooltip');
  if (old) old.remove();

  const tip = document.createElement('div');
  tip.className = 'tab-tooltip';
  tip.innerHTML = `<span class="tab-tooltip-icon">${info.icon}</span><div class="tab-tooltip-text"><b>${info.title}</b><br>${info.body}</div><button class="tab-tooltip-close" aria-label="Chiudi">✕</button>`;
  document.body.appendChild(tip);
  requestAnimationFrame(() => tip.classList.add('tab-tooltip-in'));

  const dismiss = () => {
    tip.classList.remove('tab-tooltip-in');
    setTimeout(() => tip.remove(), 300);
  };
  tip.querySelector('.tab-tooltip-close').addEventListener('click', dismiss);
  setTimeout(dismiss, 6000);
}

function showFirstWorkoutCelebration() {
  const ov = document.createElement('div');
  ov.className = 'first-workout-overlay';
  ov.innerHTML = `
    <div class="fwo-card">
      <div class="fwo-sparkles" aria-hidden="true">✨ ⭐ ✨</div>
      <div class="fwo-icon">🏆</div>
      <h2 class="fwo-title">Primo Allenamento!</h2>
      <p class="fwo-sub">Hai mosso il tuo eroe per la prima volta.<br>La leggenda di Oakhaven è iniziata.</p>
      <div class="fwo-hints">
        <div class="fwo-hint"><span class="fwo-hint-icon">🏕️</span><div><b>Rifugio</b><br><span class="small">Costruisci strutture per avere bonus permanenti.</span></div></div>
        <div class="fwo-hint"><span class="fwo-hint-icon">⚔️</span><div><b>Arena</b><br><span class="small">Sfida i villain ogni giorno per oro e bottino.</span></div></div>
        <div class="fwo-hint"><span class="fwo-hint-icon">🧪</span><div><b>Bazar</b><br><span class="small">Acquista consumabili per potenziare i tuoi allenamenti.</span></div></div>
      </div>
      <button class="btn btn-primary wide fwo-btn">🔥 Vai al Rifugio!</button>
    </div>`;
  document.body.appendChild(ov);
  sfx('level');
  requestAnimationFrame(() => ov.classList.add('fwo-in'));
  ov.querySelector('.fwo-btn').addEventListener('click', () => {
    ov.classList.add('fwo-out');
    setTimeout(() => ov.remove(), 300);
    setTab('camp');
  });
}

function showDailyLogin() {
  const login = window._pendingLogin;
  if (!login) return;
  window._pendingLogin = null;
  const idx = ((login.day - 1) % 7) + 1;
  let days = '';
  for (let d = 1; d <= 7; d++) {
    const filled = d < idx;
    const today = d === idx;
    const special = d === 7;
    const cls = ['login-day-cell', filled ? 'filled' : '', today ? 'today' : '', special ? 'special' : ''].filter(Boolean).join(' ');
    const icon = special ? '🎁' : today ? '✨' : filled ? '✓' : d;
    days += `<div class="${cls}">
      <div class="login-day-pip">${icon}</div>
      <div class="login-day-label">Giorno ${d}</div>
    </div>`;
  }
  let html = `<div class="login-modal-wrap">
    <div class="lup-badge" style="font-size:.8rem;letter-spacing:.14em">Il Tesoro Giornaliero</div>
    <div class="login-streak-label">Giorno <b>${login.day}</b> di fila!</div>
    <div class="login-day-wrap">${days}</div>
    <div class="login-gold-reward">🪙 +${login.gold} monete</div>`;
  if (login.item) {
    html += `<div class="login-item-reveal">${itemHtml(login.item)}</div>
      <p class="small muted center">Bonus del 7° giorno!</p>`;
  }
  html += `<p class="small muted center" style="margin-top:8px">Torna domani — il tesoro cresce ogni giorno.<br>Se salti un giorno, riparte da capo!</p>
    <button class="btn btn-primary wide" onclick="nextOpening()">✨ Riscuoti il Tesoro</button>
  </div>`;
  modal(html);
  sfx('coin');
  vibrate(80);
}

/* ── Streak freeze offer ──────────────────────────────────── */
function showStreakFreezeOffer(savedCount) {
  const canAfford = HERO.gold >= 500;
  modal(`
    <h3 class="panel-title">💔 Striscia Spezzata!</h3>
    <div class="streak-broke-wrap">
      <div class="streak-broke-flames">${'🔥'.repeat(Math.min(savedCount, 5))}</div>
      <div class="streak-broke-count">${savedCount} giorni di fila</div>
      <div class="streak-broke-sub">La tua striscia si è interrotta. Hai saltato un giorno.</div>
    </div>
    <div class="streak-freeze-offer">
      <div class="streak-freeze-title">❄️ Congela la Striscia</div>
      <div class="streak-freeze-desc">Paga 500 🪙 per restaurare la tua striscia di <b>${savedCount}</b> giorni e continuare senza perdere i bonus.</div>
      <button class="btn btn-primary wide" id="btn-streak-freeze" ${canAfford ? '' : 'disabled'} onclick="doStreakFreeze(${savedCount})">
        ${canAfford ? '❄️ Congela · 500 🪙' : '❄️ Oro insufficiente · 500 🪙'}
      </button>
    </div>
    <button class="btn wide" style="margin-top:.5rem;opacity:.7" onclick="nextOpening()">Accetta la sconfitta</button>`);
}

window.doStreakFreeze = function(savedCount) {
  const err = RPG.restoreStreak(HERO, savedCount);
  if (err) { toast(err); return; }
  persist(); renderHUD();
  vibrate([100, 50, 100, 50, 200]);
  sfx('coin');
  modal(`
    <h3 class="panel-title">❄️ Striscia Salvata!</h3>
    <div class="streak-saved-wrap">
      <div class="streak-broke-flames">${'🔥'.repeat(Math.min(savedCount + 1, 5))}</div>
      <div class="streak-broke-count">${savedCount + 1} giorni di fila</div>
    </div>
    <p class="muted center">Il gelo arcano ha preservato la tua striscia. Non deludere il Viandante!</p>
    <button class="btn btn-primary wide" onclick="nextOpening()">Avanti!</button>`);
};

/* Popup dettaglio risorse (tocco sulle risorse in alto a destra) */
function showResources() {
  modal(`
    <h3 class="panel-title">🎒 Le tue Risorse</h3>
    <div class="res-detail"><span class="res-detail-icon">🪙</span><div><b>Moneta d'Oro</b><br><span class="small muted">La valuta del reame: compra cavalcature, armi e armature.</span></div><b class="res-detail-qty">${HERO.gold}</b></div>
    <div class="res-detail"><span class="res-detail-icon">🌲</span><div><b>Legno</b><br><span class="small muted">Materiale da costruzione per il tuo Rifugio.</span></div><b class="res-detail-qty">${HERO.wood}</b></div>
    <div class="res-detail"><span class="res-detail-icon">⛏️</span><div><b>Roccia</b><br><span class="small muted">Pietra grezza per le strutture più solide.</span></div><b class="res-detail-qty">${HERO.stone}</b></div>
    <div class="res-detail res-detail-fiches"><span class="res-detail-icon">${FICHE_ICO}</span><div><b>Fiches del Fato</b><br><span class="small muted">Valuta della Cartomante: vinci al Lascio o Raddoppio, spendi alla Tenda del Fato.</span></div><b class="res-detail-qty">${HERO.fiches||0}</b></div>
    <button class="btn btn-primary wide" onclick="closeModal()">Chiudi</button>
  `);
}

function renderHUD() {
  const av = $('#hud-avatar');
  av.innerHTML = '';
  av.appendChild(avatarEl(HERO, 'hud-avatar-inner'));
  // accent color from hero class
  const _sid = (HERO.avatar || '').replace('assets/avatars/', '').replace(/\.(webp|png)$/, '');
  const _col = AVATAR_COLORS[_sid] || { glow: 'var(--gold)' };
  av.style.boxShadow = `0 0 10px ${_col.glow}70, 0 0 0 2px ${_col.glow}`;
  av.style.borderRadius = '50%';
  $('#hud-name').textContent = HERO.name;
  $('#hud-title').textContent = `Liv. ${HERO.level} — ${RPG.heroTitle(HERO.level)}`;
  const need = RPG.xpForLevel(HERO.level);
  const pct = Math.min(100, Math.round(HERO.xp / need * 100));
  $('#hud-xpfill').style.width = pct + '%';
  $('#hud-xptext').textContent = `${HERO.xp} / ${need} XP`;
  // streak progressiva + pvp title
  const sc = HERO.streak && HERO.streak.count || 0;
  let streakHtml = '';
  if (sc >= 30)      streakHtml = ` <span class="streak-chip streak-chip-l">🩵${sc}</span>`;
  else if (sc >= 15) streakHtml = ` <span class="streak-chip streak-chip-m">🔥${sc}</span>`;
  else if (sc >= 5)  streakHtml = ` <span class="streak-chip streak-chip-s">🔥${sc}</span>`;
  else if (sc > 1)   streakHtml = ` · 🔥${sc}`;
  const ptHud = pvpTitle(HERO.pvpWins || 0);
  const pvpSuffix = ptHud ? ` · ${ptHud.icon} ${ptHud.label}` : '';
  const baseTitleText = `Liv. ${HERO.level} — ${RPG.heroTitle(HERO.level)}`;
  $('#hud-title').innerHTML = baseTitleText + streakHtml + pvpSuffix;
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
  bumpRes('res-gold', HERO.gold);
  bumpRes('res-wood', HERO.wood);
  bumpRes('res-stone', HERO.stone);
  bumpRes('res-fiches', HERO.fiches || 0);
  const _woodIco = document.querySelector('[title="Legna"] .res-ico');
  const _stoneIco = document.querySelector('[title="Pietra"] .res-ico');
  if (_woodIco) _woodIco.textContent = '🌲';
  if (_stoneIco) _stoneIco.textContent = '⛏️';
  updateBadges();
}

function bumpRes(id, newVal) {
  const span = $('#' + id);
  if (!span) return;
  const old = parseInt(span.textContent);
  span.textContent = newVal;
  if (!isNaN(old) && newVal > old) {
    span.classList.remove('res-bump');
    void span.offsetWidth;
    span.classList.add('res-bump');
    span.addEventListener('animationend', () => span.classList.remove('res-bump'), { once: true });
    const diff = newVal - old;
    const floatEl = document.createElement('span');
    floatEl.className = 'res-float';
    floatEl.textContent = `+${diff}`;
    const resDiv = span.closest('.res');
    if (resDiv) {
      resDiv.appendChild(floatEl);
      floatEl.addEventListener('animationend', () => floatEl.remove(), { once: true });
    }
  }
}

let _tabClickTs = 0;
document.querySelectorAll('#tabbar .tab').forEach(t =>
  t.addEventListener('click', () => {
    const now = Date.now();
    if (now - _tabClickTs < 280) return;
    _tabClickTs = now;
    setTab(t.dataset.tab);
  }));

// Swipe orizzontale su #tab-content → cambia tab
const _TAB_ORDER = ['camp', 'map', 'train', 'market', 'hero'];
let _swX = null, _swY = null, _swInScrollable = false;
document.addEventListener('touchstart', e => {
  if ($('#screen-game').classList.contains('hidden')) return;
  _swX = e.touches[0].clientX; _swY = e.touches[0].clientY;
  // Mark if touch starts inside a horizontally-scrollable container (e.g. quick-cons-row)
  _swInScrollable = !!(e.target && e.target.closest('.quick-cons-row, .coll-switch, .act-row'));
}, { passive: true });
document.addEventListener('touchend', e => {
  if (_swX === null) return;
  const dx = e.changedTouches[0].clientX - _swX;
  const dy = e.changedTouches[0].clientY - _swY;
  _swX = null; _swY = null;
  if (_swInScrollable) { _swInScrollable = false; return; }
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  if (document.getElementById('modal').classList.contains('hidden') === false) return;
  const mgOv = document.getElementById('mg-ov');
  if (mgOv && mgOv.children.length > 0) return; // minigioco aperto: ignora swipe
  const idx = _TAB_ORDER.indexOf(CURRENT_TAB);
  if (dx < 0 && idx > 0) setTab(_TAB_ORDER[idx - 1], 'right');
  if (dx > 0 && idx < _TAB_ORDER.length - 1) setTab(_TAB_ORDER[idx + 1], 'left');
}, { passive: true });


// Tocco sulle risorse dell'header → popup dettaglio
document.querySelector('.hud-right').addEventListener('click', () => { if (HERO) showResources(); });

/* Salva lo scroll dell'hub principale per market e map, in modo da
   ripristinarlo quando si torna dalla sotto-view all'hub. */
let _marketHubScroll = 0;
let _mapHubScroll    = 0;

function setTab(tab, dir) {
  const c = $('#tab-content');
  const prevTab        = CURRENT_TAB;
  const prevScroll     = c.scrollTop;
  const prevCampView   = CAMP_VIEW;
  const prevMapView    = MAP_VIEW;
  const prevMarketView = MARKET_VIEW;
  const prevHeroView   = HERO_VIEW;

  /* Salva lo scroll dell'hub prima di entrare in una sotto-view */
  if (tab === 'market' && prevTab === 'market' && prevMarketView === 'hub' && MARKET_VIEW !== 'hub') {
    _marketHubScroll = prevScroll;
  }
  if (tab === 'map' && prevTab === 'map' && prevMapView === 'main' && MAP_VIEW !== 'main') {
    _mapHubScroll = prevScroll;
  }

  CURRENT_TAB = tab;
  document.querySelectorAll('#tabbar .tab').forEach(t => {
    const isActive = t.dataset.tab === tab;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  c.classList.remove('bg-parchment', 'bg-rifugio', 'bg-map', 'bg-train', 'bg-market');
  if (tab === 'hero' && HERO_VIEW === 'main') c.classList.add('bg-parchment');
  if (tab === 'camp')   c.classList.add('bg-parchment');
  if (tab === 'map')    c.classList.add('bg-map');
  if (tab === 'train')  c.classList.add('bg-train');
  if (tab === 'market') c.classList.add('bg-market');
  c.innerHTML = '';
  /* Wrapper interno per l'animazione: non mettere mai transform su #tab-content
     direttamente — iOS bug: transform+overflow-y:auto resetta/glitch lo scroll */
  const animWrap = document.createElement('div');
  animWrap.className = 'tab-anim-wrap';
  c.appendChild(animWrap);
  ({ camp: renderCamp, map: renderMap, train: renderTrain, market: renderMarket, hero: renderHero }[tab])(animWrap);

  const sameSubView = tab === prevTab && !dir &&
    (tab !== 'camp'   || CAMP_VIEW   === prevCampView)   &&
    (tab !== 'map'    || MAP_VIEW    === prevMapView)     &&
    (tab !== 'market' || MARKET_VIEW === prevMarketView)  &&
    (tab !== 'hero'   || HERO_VIEW   === prevHeroView);

  /* Ripristina lo scroll corretto in base al contesto */
  if (sameSubView) {
    c.scrollTop = prevScroll;
  } else if (tab === 'market' && MARKET_VIEW === 'hub' && prevMarketView !== 'hub') {
    c.scrollTop = _marketHubScroll;
  } else if (tab === 'map' && MAP_VIEW === 'main' && prevMapView !== 'main') {
    c.scrollTop = _mapHubScroll;
  } else {
    c.scrollTop = 0;
  }

  requestAnimationFrame(() => {
    if (dir === 'left')       animWrap.classList.add('tab-slide-left');
    else if (dir === 'right') animWrap.classList.add('tab-slide-right');
    else                      animWrap.classList.add('tab-in');
  });
  updateBadges();
  if (HERO) {
    updateTabOnboardingPulse();
    showTabTooltip(tab);
  }
}

