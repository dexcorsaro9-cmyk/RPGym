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
  if (missed) {
    modal(`
      <h3 class="panel-title">💨 Il Forziere Svanito…</h3>
      <div class="lost-chest">🎁</div>
      <p><b>${esc(missed.name)}</b></p>
      <p class="muted">Hai mancato il forziere per soli <b>${missed.kmMissing} km</b>! L'occasione è svanita all'alba…</p>
      <p class="small muted">Oggi c'è una nuova incursione: non lasciartela scappare!</p>
      <button class="btn btn-primary wide" onclick="closeModal(); ${login ? 'showDailyLogin()' : ''}">Non succederà più!</button>
    `);
    window._pendingLogin = login;
  } else if (login) {
    window._pendingLogin = login;
    showDailyLogin();
  }
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
    <button class="btn btn-primary wide" onclick="closeModal()">Riscuoti</button>`;
  modal(html);
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
  $('#res-gold').textContent = HERO.gold;
  $('#res-wood').textContent = HERO.wood;
  $('#res-stone').textContent = HERO.stone;
}

document.querySelectorAll('#tabbar .tab').forEach(t =>
  t.addEventListener('click', () => setTab(t.dataset.tab)));

// Tocco sulle risorse dell'header → popup dettaglio
document.querySelector('.hud-right').addEventListener('click', () => { if (HERO) showResources(); });

function setTab(tab) {
  CURRENT_TAB = tab;
  document.querySelectorAll('#tabbar .tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab));
  const c = $('#tab-content');
  c.classList.toggle('bg-parchment', tab === 'hero' && PARCHMENT_OK);
  c.innerHTML = '';
  ({ camp: renderCamp, map: renderMap, train: renderTrain, market: renderMarket, hero: renderHero }[tab])(c);
  c.scrollTop = 0;
}

/* ── TAB: Rifugio ── */
function renderCamp(c) {
  const scene = el('div', 'camp-scene');
  const hasHouse = HERO.buildings.includes('fondamenta');
  let sceneEmoji = hasHouse ? '🛖' : '🔥';
  let sceneDesc = hasHouse
    ? 'La tua casa nella radura. Il fumo del camino sale tranquillo tra gli alberi.'
    : 'Un falò tremolante in una radura. Dormi sotto le stelle… per ora.';
  if (HERO.buildings.length >= 4) { sceneEmoji = '🏡'; sceneDesc = 'Il tuo rifugio è ormai una vera dimora fortificata!'; }
  const mount = HERO.mount ? RPG.mountById(HERO.mount) : null;
  scene.appendChild(el('div', 'camp-emoji',
    sceneEmoji + (HERO.companion ? ' 🐺' : '') + (mount ? ' ' + mount.emoji : '')));
  scene.appendChild(el('p', 'camp-desc', sceneDesc +
    (HERO.companion ? '<br>Il Lupo Astrale sonnecchia accanto a te.' : '') +
    (mount ? `<br>${mount.name} riposa nella stalla.` : '')));
  c.appendChild(scene);

  // Costruzione
  const bpanel = el('div', 'panel');
  bpanel.appendChild(el('h3', 'panel-title', '🔨 Costruisci'));
  if (HERO.level < 5) {
    bpanel.appendChild(el('p', 'muted',
      `Raggiungi il <b>Livello 5</b> per piantare le radici e costruire la tua casa. (Ora sei al ${HERO.level}.)`));
  } else {
    RPG.BUILDINGS.forEach(b => {
      const status = RPG.canBuild(HERO, b);
      const row = el('div', 'build-row' + (status === 'costruito' ? ' built' : ''));
      row.appendChild(el('div', 'build-icon', b.icon));
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
    vp.appendChild(el('h3', 'panel-title', '🪞 Visita il Rifugio del tuo Alleato'));
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

/* ── TAB: Mappa ── */
function renderMap(c) {
  const biome = RPG.currentBiome(HERO.level);

  // ── Il bioma attuale, con progresso verso il prossimo ──
  const span = biome.max - biome.min + 1;
  const pctBiome = Math.min(100, Math.round((HERO.level - biome.min + 1) / span * 100));
  const hdr = el('div', 'biome-hero');
  hdr.innerHTML = `
    <div class="biome-hero-icon">${biome.icon}</div>
    <div class="biome-hero-name">${biome.name}</div>
    <div class="biome-hero-lv small">Livelli ${biome.min}–${biome.max}</div>
    <div class="membar slim"><div class="membar-fill gold" style="width:${pctBiome}%"></div><span>Liv. ${HERO.level}</span></div>`;
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
      `Entro mezzanotte: forziere con oggetto ${RPG.RARITIES[inc.minRarity].label} o superiore. Domani sarà troppo tardi!`));
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
      `Primo allenamento singolo da <b>${ev.km} km</b> della settimana vince: <b>${ev.skin}</b>.`));
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
    cell.innerHTML = `<div class="biome-cell-icon">${open ? b.icon : '🔒'}</div>
      <div class="biome-cell-name">${open ? zoneShort(b.name) : '???'}</div>
      <div class="biome-cell-lv">${b.min}–${b.max}</div>`;
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
  const ACT_ICON_FILES = { cyclette: 'assets/ui/act-cyclette.png', corsa: 'assets/ui/act-corsa.png' };
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
    showReport(report);
  });
  form.appendChild(go);
  c.appendChild(form);

  if (HERO.log.length) {
    const lp = el('div', 'panel');
    lp.appendChild(el('h3', 'panel-title', '📜 Diario delle Imprese'));
    HERO.log.slice(0, 7).forEach(l => {
      const a = RPG.ACTIVITIES[l.type];
      const d = new Date(l.date);
      lp.appendChild(el('div', 'log-row',
        `${a.icon} <b>${l.km} km</b> di ${a.label.toLowerCase()} — +${l.xp} XP <span class="muted small">(${d.toLocaleDateString('it-IT')})</span>`));
    });
    c.appendChild(lp);
  }
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
  let html = `<h3 class="panel-title">🎉 Impresa Registrata!</h3>`;
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
      <button class="chest-btn" id="btn-open-chest">🧰</button>
      <p class="small muted center">Tocca lo scrigno per aprirlo</p>
    </div>`;
  }
  html += `<button class="btn btn-primary wide" onclick="closeModal(); setTab('camp')">Torna al Rifugio</button>`;
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
  let html = `<div class="chest-burst">✨</div>
    <h3 class="panel-title center">🧰 Il Bottino di "${esc(title)}"</h3>`;
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
  c.appendChild(el('h2', 'section-title', '🏪 Il Mercato'));
  const sw = el('div', 'coll-switch');
  [['stalla', '🐴 Stalla'], ['nero', '🕯️ Contrabbando'], ['fucina', '⚒️ Fucina']].forEach(([k, label]) => {
    const b = el('button', 'coll-btn' + (MARKET_VIEW === k ? ' active' : ''), label);
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
  c.appendChild(npcBanner('assets/avatars/furfante.png', 'La Piuma',
    '«Bella merce… io pago in monete sonanti e non faccio domande. Tu non chiedermi dove finisce.»'));
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
  c.appendChild(npcBanner('assets/avatars/fabbro.png', 'Mastro Brontolo',
    '«Batto il ferro dall\'alba, ragazzino. Tre pezzi al giorno, prendere o lasciare. E non toccare l\'incudine!»'));
  const offers = RPG.forgeOffers(HERO);
  const op = el('div', 'panel');
  op.appendChild(el('h3', 'panel-title', '🔥 In vetrina oggi'));
  offers.forEach(o => {
    const bought = HERO.items.some(i => i.name === o.name && i.rarity === o.rarity);
    const row = el('div', 'mission-row');
    row.appendChild(el('div', 'mission-mid',
      `${itemIconHtml(o, 'item-icon')} <b>${esc(o.name)}</b> <span class="tag">${RPG.RARITIES[o.rarity].label}</span><br>
       <span class="small muted">+${o.xp}% XP · ${RPG.SLOTS[o.slot].label}</span>`));
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

  c.appendChild(el('h2', 'section-title on-parchment-title', '🛡️ Scheda dell\'Eroe'));

  // Eroe con i 6 slot: 3 a sinistra, 3 a destra
  const rig = el('div', 'hero-rig');
  const leftCol = el('div', 'slot-col');
  const rightCol = el('div', 'slot-col');
  const slotKeys = Object.keys(RPG.SLOTS);
  const leftSlots = slotKeys.slice(0, 3);
  const rightSlots = slotKeys.slice(3);

  const makeSlot = key => {
    const s = RPG.SLOTS[key];
    const itemId = HERO.equipment[key];
    const item = HERO.items.find(i => i.id === itemId);
    const slot = el('button', 'equip-slot' + (item ? ' filled rar-border-' + item.rarity : ''));
    slot.innerHTML = item
      ? `${itemIconHtml(item, 'equip-img')}<span class="equip-label">+${item.xp}%</span>`
      : `<span class="equip-icon empty">${s.icon}</span><span class="equip-label">${s.label}</span>`;
    slot.addEventListener('click', () => openSlotPicker(key));
    return slot;
  };
  leftSlots.forEach(k => leftCol.appendChild(makeSlot(k)));
  rightSlots.forEach(k => rightCol.appendChild(makeSlot(k)));

  const center = el('div', 'hero-center');
  const av = avatarEl(HERO, isImageAvatar(HERO) ? 'hero-fullbody' : 'hero-avatar');
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
  [['story', '📜 La tua Storia'], ['cards', '🎴 Carte & Imprese'], ['bestiary', '🐉 Bestiario']].forEach(([k, label]) => {
    const b = el('button', 'btn', label);
    b.addEventListener('click', () => { HERO_VIEW = k; setTab('hero'); });
    sub.appendChild(b);
  });
  c.appendChild(sub);

  // Statistiche
  const stats = el('div', 'panel on-parchment');
  stats.appendChild(el('h3', 'panel-title', '📊 Imprese'));
  stats.innerHTML += `
    <div class="stat-row">🥾 Km totali <b>${HERO.totalKm.toFixed(1)}</b></div>
    <div class="stat-row">🚴 In sella <b>${(HERO.kmByType.cyclette || 0).toFixed(1)} km</b></div>
    <div class="stat-row">🚶 A piedi <b>${(HERO.kmByType.camminata || 0).toFixed(1)} km</b></div>
    <div class="stat-row">🏃 Di corsa <b>${(HERO.kmByType.corsa || 0).toFixed(1)} km</b></div>
    <div class="stat-row">🗝️ Streak login <b>${HERO.streak.count} giorni</b></div>
    <div class="stat-row">⚔️ Missioni compiute <b>${HERO.missionsDone.length}</b></div>
    <div class="stat-row">🎒 Oggetti nello zaino <b>${HERO.items.length}</b></div>`;
  c.appendChild(stats);

  const sw = el('button', 'btn wide', '↩ Cambia Eroe');
  sw.addEventListener('click', () => { STATE.current = null; persist(); renderProfiles(); });
  c.appendChild(sw);
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
  c.appendChild(el('h2', 'section-title', '📜 ' + story.title));
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
  c.appendChild(el('h2', 'section-title', '🎴 Il Tomo delle Memorie'));
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
}

function renderBestiaryView(c) {
  backBar(c);
  HERO.bestiary = HERO.bestiary || [];
  c.appendChild(el('h2', 'section-title', '🐉 Il Bestiario dell\'Orda'));
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

/* ══════════════ Avvio ══════════════ */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

if (STATE.current && STATE.heroes.find(h => h.id === STATE.current)) enterGame();
else renderProfiles();
