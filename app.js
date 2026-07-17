/* ═══════════════════════════════════════════════════════════════
   RPGym — Interfaccia utente
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

const DEFAULT_AVATARS = ['🧑‍🌾', '👸', '🧙', '🦹', '🧝', '🥷', '🧚', '🤺'];
// Avatar a figura intera generati con l'IA: basta salvarli in assets/avatars/
// con questi nomi e appariranno tra le scelte alla creazione dell'eroe.
const FILE_AVATARS = ['assets/avatars/eroe1.png', 'assets/avatars/eroe2.png'];

function persist() { RPG.save(STATE); }

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
    card.addEventListener('click', () => { STATE.current = h.id; persist(); enterGame(); });
    list.appendChild(card);
  });
  show('screen-profiles');
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

/* ── Creazione eroe ── */
let pickedAvatar = DEFAULT_AVATARS[0];
let uploadedAvatar = null;

function renderCreate() {
  const picker = $('#avatar-picker');
  picker.innerHTML = '';
  // Avatar personalizzati (file in assets/avatars/): mostrati se esistono
  FILE_AVATARS.forEach(path => {
    const img = el('img', 'avatar-choice' + (path === pickedAvatar && !uploadedAvatar ? ' selected' : ''));
    img.src = path;
    img.addEventListener('error', () => img.remove());
    img.addEventListener('click', () => { pickedAvatar = path; uploadedAvatar = null; renderCreate(); });
    picker.appendChild(img);
  });
  DEFAULT_AVATARS.forEach(a => {
    const b = el('button', 'avatar-choice' + (a === pickedAvatar && !uploadedAvatar ? ' selected' : ''), a);
    b.addEventListener('click', () => { pickedAvatar = a; uploadedAvatar = null; renderCreate(); });
    picker.appendChild(b);
  });
  if (uploadedAvatar) {
    const img = el('img', 'avatar-choice selected avatar-upload-preview');
    img.src = uploadedAvatar;
    picker.appendChild(img);
  }
  show('screen-create');
}

$('#btn-new-hero').addEventListener('click', () => { $('#create-name').value = ''; uploadedAvatar = null; renderCreate(); });
$('#btn-create-back').addEventListener('click', renderProfiles);
$('#avatar-upload').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    // ridimensiona per non gonfiare il salvataggio
    const img = new Image();
    img.onload = () => {
      // mantiene le proporzioni (per avatar a figura intera), max 512px
      const c = document.createElement('canvas');
      const scale = Math.min(1, 512 / Math.max(img.width, img.height));
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      uploadedAvatar = c.toDataURL('image/png');
      renderCreate();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(f);
});
$('#btn-create-confirm').addEventListener('click', () => {
  const name = $('#create-name').value.trim();
  if (!name) { alert('Ogni eroe ha bisogno di un nome!'); return; }
  const h = RPG.newHero(name, uploadedAvatar || pickedAvatar);
  STATE.heroes.push(h);
  STATE.current = h.id;
  persist();
  enterGame();
});

/* ══════════════ Gioco ══════════════ */

function enterGame() {
  HERO = STATE.heroes.find(h => h.id === STATE.current);
  if (!HERO) { renderProfiles(); return; }
  show('screen-game');
  renderHUD();
  setTab('camp');
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

function setTab(tab) {
  CURRENT_TAB = tab;
  document.querySelectorAll('#tabbar .tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab));
  const c = $('#tab-content');
  c.classList.toggle('bg-parchment', tab === 'hero' && PARCHMENT_OK);
  c.innerHTML = '';
  ({ camp: renderCamp, map: renderMap, train: renderTrain, cards: renderCards, hero: renderHero }[tab])(c);
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
  scene.appendChild(el('div', 'camp-emoji', sceneEmoji + (HERO.companion ? ' 🐺' : '')));
  scene.appendChild(el('p', 'camp-desc', sceneDesc +
    (HERO.companion ? '<br>Il Lupo Astrale sonnecchia accanto a te, la sua luce illumina la notte.' : '')));
  c.appendChild(scene);

  // Barra dell'Indagine (Frammenti di Memoria)
  const inv = el('div', 'panel');
  inv.appendChild(el('h3', 'panel-title', '🔍 Svela il Nemico'));
  const pct = HERO.fragmentsFound * 20;
  inv.appendChild(el('div', 'membar', `<div class="membar-fill" style="width:${pct}%"></div><span>${pct}%</span>`));
  inv.appendChild(el('p', 'muted small', pct >= 100
    ? 'Le memorie sono complete: il Cavaliere del Drago è stato rivelato! Trova la carta nel tuo Album.'
    : `Ogni 20 km trovi un Frammento di Memoria (${HERO.fragmentsFound}/5). Chi ha distrutto Oakhaven?`));
  c.appendChild(inv);

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
      const mid = el('div', 'build-mid',
        `<b>${b.name}</b><br><span class="small muted">${b.desc}</span><br>` +
        `<span class="small">🪵 ${b.cost.wood} · 🪨 ${b.cost.stone} · Liv. ${b.minLevel}</span>`);
      row.appendChild(mid);
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
        btn.textContent = '🔒';
        btn.disabled = true;
        btn.title = status === 'risorse' ? 'Risorse insufficienti' : 'Requisiti mancanti';
      }
      row.appendChild(btn);
      bpanel.appendChild(row);
    });
  }
  c.appendChild(bpanel);

  // Visita il rifugio dell'alleato
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

  // Giorno di riposo
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
  const built = RPG.BUILDINGS.filter(b => o.buildings.includes(b.id));
  modal(`
    <h3 class="panel-title">🪞 Il Rifugio di ${esc(o.name)}</h3>
    <div class="camp-emoji">${o.buildings.includes('fondamenta') ? '🛖' : '🔥'}${o.companion ? ' 🐺' : ''}</div>
    <p class="muted">Liv. ${o.level} — ${RPG.heroTitle(o.level)} · ${o.totalKm.toFixed(1)} km totali</p>
    <p>${built.length ? 'Strutture: ' + built.map(b => b.icon + ' ' + b.name).join(', ') : 'Dorme ancora accanto al falò.'}</p>
    <p class="muted small">${o.cards.length} carte collezionate · ${o.inventory.length} oggetti nel bottino</p>
    <button class="btn btn-primary wide" onclick="closeModal()">Torna al tuo Rifugio</button>
  `);
}

/* ── TAB: Mappa ── */
function renderMap(c) {
  c.appendChild(el('h2', 'section-title', '🗺️ Mappa del Mondo'));

  // Missione attiva
  if (HERO.activeMission) {
    const m = RPG.MISSIONS.find(x => x.id === HERO.activeMission.id);
    const p = el('div', 'panel active-mission');
    p.appendChild(el('h3', 'panel-title', `⚔️ In viaggio: ${m.name}`));
    const done = HERO.activeMission.progressKm;
    const pct = Math.min(100, Math.round(done / m.km * 100));
    p.appendChild(el('div', 'membar', `<div class="membar-fill gold" style="width:${pct}%"></div><span>${done.toFixed(1)} / ${m.km} km</span>`));
    p.appendChild(el('p', 'muted small', 'Allenati per far galoppare il tuo destriero verso la meta!'));
    const abandon = el('button', 'btn btn-small', 'Abbandona missione');
    abandon.addEventListener('click', () => { HERO.activeMission = null; persist(); setTab('map'); });
    p.appendChild(abandon);
    c.appendChild(p);
  }

  // Taglia Unica settimanale
  const ev = RPG.weeklyEvent(STATE);
  const evp = el('div', 'panel event-panel');
  evp.appendChild(el('h3', 'panel-title', `${ev.icon} Taglia Unica: ${ev.name}`));
  if (ev.claimedBy) {
    evp.appendChild(el('p', 'muted', ev.claimedBy === HERO.name
      ? `🏆 L'hai reclamata TU! Ricompensa: ${ev.skin}`
      : `⛔ Troppo tardi: <b>${esc(ev.claimedBy)}</b> ha già reclamato il bottino questa settimana.`));
  } else {
    evp.appendChild(el('p', 'muted small',
      `Il primo eroe che percorre <b>${ev.km} km</b> questa settimana reclama: <b>${ev.skin}</b> (oggetto estetico esclusivo!). ` +
      `Km da te percorsi da inizio evento: conta il tuo prossimo allenamento!`));
    const btn = el('button', 'btn wide', `Reclama (servono ${ev.km} km in un allenamento)`);
    btn.addEventListener('click', () => {
      const last = HERO.log[0];
      const today = new Date().toISOString().slice(0, 10);
      if (last && new Date(last.date).toISOString().slice(0, 10) === today && last.km >= ev.km) {
        if (RPG.claimEvent(STATE, HERO, ev)) {
          persist();
          toast(`🏆 ${ev.skin} è TUO! Il tuo alleato troverà solo un cartello…`);
          setTab('map');
        }
      } else {
        toast(`Devi completare un allenamento di almeno ${ev.km} km oggi per reclamare la Taglia!`);
      }
    });
    evp.appendChild(btn);
  }
  c.appendChild(evp);

  // Missioni per zona
  const avail = RPG.availableMissions(HERO);
  const zones = [...new Set(RPG.MISSIONS.map(m => m.zone))];
  zones.forEach(zone => {
    const inZone = avail.filter(m => m.zone === zone);
    const doneInZone = RPG.MISSIONS.filter(m => m.zone === zone && HERO.missionsDone.includes(m.id));
    if (!inZone.length && !doneInZone.length) return;
    const zp = el('div', 'panel');
    zp.appendChild(el('h3', 'panel-title', zoneIcon(zone) + ' ' + zone));
    inZone.forEach(m => {
      const row = el('div', 'mission-row');
      row.appendChild(el('div', 'mission-mid',
        `<b>${m.name}</b> <span class="tag">${m.km} km</span><br><span class="small muted">${m.desc}</span>`));
      const btn = el('button', 'btn btn-small btn-primary', 'Parti');
      btn.disabled = !!HERO.activeMission;
      btn.addEventListener('click', () => {
        RPG.startMission(HERO, m.id); persist();
        toast(`🐎 In sella! Destinazione: ${m.name} (${m.km} km)`);
        setTab('map');
      });
      row.appendChild(btn);
      zp.appendChild(row);
    });
    doneInZone.forEach(m => {
      zp.appendChild(el('div', 'mission-row done', `✅ <s>${m.name}</s>`));
    });
    c.appendChild(zp);
  });

  const locked = RPG.MISSIONS.filter(m => !HERO.missionsDone.includes(m.id) && !avail.includes(m));
  if (locked.length) {
    c.appendChild(el('p', 'muted small center',
      `🔒 ${locked.length} missioni ancora avvolte nella nebbia… sali di livello e completa la storia per svelarle.`));
  }
}

function zoneIcon(zone) {
  return { 'Rovine di Oakhaven': '🏚️', 'Foresta Sussurrante': '🌲', 'Deserto di Ruggine': '🏜️' }[zone] || '📍';
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
  Object.entries(RPG.ACTIVITIES).forEach(([key, a]) => {
    const b = el('button', 'act-choice' + (key === chosen ? ' selected' : ''),
      `${a.icon}<br>${a.label}<br><span class="small muted">${a.xpPerKm} XP/km</span>`);
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
    '📱 Apri l\'app <b>Salute</b> (o Strava/Fitness) sul tuo iPhone, leggi i km di oggi e riportali qui. ' +
    'Il Custode del Tempo verificherà che il movimento sia degno di un vero eroe…'));

  const go = el('button', 'btn btn-primary wide big', '🔥 SINCRONIZZA AVVENTURA');
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

  // Storico
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
    html += `<p class="muted">🔒 Livello 20 raggiunto: per crescere ancora dovrai forgiare l'<b>Amuleto del Viaggiatore Esperto</b> (guarda la Mappa).</p>`;
  if (r.loot.length) {
    html += `<h4>🎒 Sacchi del Viaggiatore aperti:</h4><div class="loot-list">`;
    r.loot.forEach(l => { html += `<div class="loot rar-${l.rarity}">${l.icon} ${l.name} <span class="tag">${l.rarity}</span></div>`; });
    html += `</div>`;
  }
  if (r.fragments)
    html += `<p>🔍 Hai trovato <b>${r.fragments} Frammento/i di Memoria</b>! La verità si avvicina…</p>`;
  if (r.missionProgress) {
    const mp = r.missionProgress;
    html += `<p>🐎 Missione <b>${mp.mission.name}</b>: ${mp.done.toFixed(1)} / ${mp.mission.km} km.</p>`;
  }
  if (r.missionComplete) {
    const m = r.missionComplete;
    html += `<p class="big-news">🏆 MISSIONE COMPLETATA: ${m.name}!</p>`;
    const rw = m.reward || {};
    const parts = [];
    if (rw.gold) parts.push(`🪙 ${rw.gold}`);
    if (rw.wood) parts.push(`🪵 ${rw.wood}`);
    if (rw.stone) parts.push(`🪨 ${rw.stone}`);
    if (rw.item) parts.push(`🗡️ ${rw.item}`);
    if (parts.length) html += `<p>Ricompense: ${parts.join(' · ')}</p>`;
  }
  r.cards.forEach(cid => {
    const card = RPG.CARDS[cid];
    html += `<div class="card-reveal rar-${card.rarity}">
      <div class="card-icon">${card.icon}</div>
      <b>${card.name}</b><br><span class="tag">${card.rarity}</span>
      <p class="small lore">${card.lore}</p>
    </div>`;
  });
  r.unlocks.forEach(u => { html += `<p class="big-news small">${u}</p>`; });
  html += `<button class="btn btn-primary wide" onclick="closeModal(); setTab('camp')">Torna al Rifugio</button>`;
  modal(html);
}

/* ── TAB: Carte ── */
function renderCards(c) {
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

/* ── TAB: Eroe ── */
function renderHero(c) {
  c.appendChild(el('h2', 'section-title on-parchment-title', '🛡️ Scheda dell\'Eroe'));
  const p = el('div', 'hero-showcase center-col');
  // Avatar a figura intera in primo piano sulla pergamena
  const av = avatarEl(HERO, isImageAvatar(HERO) ? 'hero-fullbody' : 'hero-avatar');
  p.appendChild(av);
  p.appendChild(el('h3', 'hero-name-plate', esc(HERO.name)));
  p.appendChild(el('p', 'hero-title-plate', `Livello ${HERO.level} — ${RPG.heroTitle(HERO.level)}${HERO.companion ? ' · 🐺 Lupo Astrale' : ''}`));
  c.appendChild(p);

  const stats = el('div', 'panel on-parchment');
  stats.appendChild(el('h3', 'panel-title', '📊 Imprese'));
  stats.innerHTML += `
    <div class="stat-row">🥾 Km totali <b>${HERO.totalKm.toFixed(1)}</b></div>
    <div class="stat-row">🚴 In sella <b>${(HERO.kmByType.cyclette || 0).toFixed(1)} km</b></div>
    <div class="stat-row">🚶 A piedi <b>${(HERO.kmByType.camminata || 0).toFixed(1)} km</b></div>
    <div class="stat-row">🏃 Di corsa <b>${(HERO.kmByType.corsa || 0).toFixed(1)} km</b></div>
    <div class="stat-row">🎒 Sacchi aperti <b>${HERO.lootBagsOpened}</b></div>
    <div class="stat-row">⚔️ Missioni compiute <b>${HERO.missionsDone.length}</b></div>`;
  c.appendChild(stats);

  const inv = el('div', 'panel on-parchment');
  inv.appendChild(el('h3', 'panel-title', '🎒 Bottino'));
  if (!HERO.inventory.length) inv.appendChild(el('p', 'muted', 'Lo zaino è vuoto. Mettiti in marcia!'));
  else {
    const counts = {};
    HERO.inventory.forEach(i => counts[i] = (counts[i] || 0) + 1);
    Object.entries(counts).forEach(([name, n]) =>
      inv.appendChild(el('div', 'stat-row', `${esc(name)} ${n > 1 ? '<b>x' + n + '</b>' : ''}`)));
  }
  c.appendChild(inv);

  const sw = el('button', 'btn wide', '↩ Cambia Eroe');
  sw.addEventListener('click', () => { STATE.current = null; persist(); renderProfiles(); });
  c.appendChild(sw);
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

/* ── Sfondo pergamena: attivo solo se il file esiste ── */
let PARCHMENT_OK = false;
(() => {
  const probe = new Image();
  probe.onload = () => {
    PARCHMENT_OK = true;
    if (CURRENT_TAB === 'hero') $('#tab-content').classList.add('bg-parchment');
  };
  probe.src = 'assets/backgrounds/pergamena.jpg';
})();

/* ══════════════ Avvio ══════════════ */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

if (STATE.current && STATE.heroes.find(h => h.id === STATE.current)) enterGame();
else renderProfiles();
