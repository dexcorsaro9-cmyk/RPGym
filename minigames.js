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
function mgRecord(id) {
  const m = getMG(id); m.n++; m.last = todayISO();
  RPG.updateChallengeProgress(HERO, 'minigame', 1);
  persist();
}
function mgGiveReward(r) {
  if (r.gold)  HERO.gold  = Math.max(0, (HERO.gold  || 0) + r.gold);
  if (r.wood)  HERO.wood  = Math.max(0, (HERO.wood  || 0) + r.wood);
  if (r.stone) HERO.stone = Math.max(0, (HERO.stone || 0) + r.stone);
  if (r.xp) {
    const gained = RPG.applyXp(HERO, r.xp);
    if (gained.length) { sfx('level'); toast(`⬆️ Livello ${HERO.level}!`); }
  }
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
      setTimeout(() => resEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
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
