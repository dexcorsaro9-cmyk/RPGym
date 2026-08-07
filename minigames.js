/* ═══════════════════════════════════════════════════════════
   MINIGIOCHI — Taverna delle Sfide
   ═══════════════════════════════════════════════════════════ */

function getMG(id) {
  const d = HERO.miniGames[id] || { last: null, n: 0 };
  if (d.last !== todayISO()) d.n = 0;
  HERO.miniGames[id] = d;
  return d;
}
const MG_MAX = { cards:3, archery:3, boccale:2, dadi:2, pesca:2, braccio:3, coltello:3 };
const MG_B = {
  archery: { goldPerPt: 0.5 },
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
  if (r.wood)           lines.push(`🌲 +${r.wood} Legna`);
  if (r.stone)          lines.push(`⛏️ +${r.stone} Pietra`);
  if (r.gold  < 0)      lines.push(`🪙 ${r.gold} Oro`);
  return `<div class="mg-reward"><div class="mg-reward-title">${title}</div>${sub?`<div class="mg-reward-sub">${sub}</div>`:''}<div class="mg-reward-lines">${lines.map(l=>`<span class="mg-rl">${l}</span>`).join('')}</div></div>`;
}

let _mgRAF = null;

function mgOverlay(inner, bgUrl) {
  if (_mgRAF) { cancelAnimationFrame(_mgRAF); _mgRAF = null; }
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
  setTimeout(() => { ov.className = ''; ov.innerHTML = ''; MARKET_VIEW = 'taverna'; setTab('market'); }, 280);
}

/* Hub */
const MG_CATEGORIES = [
  { id:'fortuna', icon:'✨', label:'Fortuna', games:[
    { id:'cards',   emoji:'🃏', name:'Carte',        open: openCardsGame },
  ]},
  { id:'abilita', icon:'⚔️', label:'Abilità', games:[
    { id:'archery', emoji:'🏹', name:'Balestra',     open: openArcheryGame },
    { id:'pesca',   emoji:'🎣', name:'Pesca Fossato', open: openPescaGame },
  ]},
  { id:'taverna', icon:'🍺', label:'Taverna', games:[
    { id:'boccale',  emoji:'🍺', name:'Lancio Boccale',   open: openBoccaleGame },
    { id:'dadi',     emoji:'🎲', name:'Dadi del Bluff',   open: openDadiGame },
    { id:'braccio',  emoji:'💪', name:'Braccio di Ferro', open: openBraccioGame },
    { id:'coltello', emoji:'🗡️', name:'Lancio Coltello',  open: openColtelloGame },
  ]},
];

function renderMiniGamesHub(c) {
  const hub = document.createElement('div');
  hub.className = 'panel mg-hub';

  const hdrRow = document.createElement('div');
  hdrRow.className = 'mg-hub-hdr';
  hdrRow.innerHTML = `<h3 class="panel-title" style="margin:0">🎮 Taverna delle Sfide <span class="mg-hub-subtitle">— Sette giochi. Un banco. Mostra cosa sei fatto.</span></h3>`;
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

/* ── 🃏 CARTE DEL MERCANTE ── */
const CARD_IMGS = [
  "assets/cards/caduta del generale goblin.webp",
  "assets/cards/ciclista del vento.webp",
  "assets/cards/cuore di pietra spento.webp",
  "assets/cards/esploratore delle terre selvagge.webp",
  "assets/cards/il cavaliere del drago.webp",
  "assets/cards/il lupo astrale.webp",
  "assets/cards/il primo passo.webp",
  "assets/cards/l'amuleto del viaggiatore esperto.webp",
  "assets/cards/lo stemma bruciato.webp",
  "assets/cards/oltre le mura.webp",
  "assets/cards/radici nuove.webp",
];

function openCardsGame() {
  if (!mgCanPlay('cards')) return;
  const POOL = [
    { title:'Premio Piccolo',  reward:{ gold:10 },          trap:false },
    { title:'Premio Grande',   reward:{ gold:30, xp:10 },   trap:false },
    { title:'Bonus Mistico',   reward:{ xp:25 },            trap:false },
    { title:'Dono del Bosco',  reward:{ wood:20, stone:20 },trap:false },
    { title:'Maledizione!',    reward:{ gold:-10 },         trap:true  },
  ];
  // pick 3 pool items + assign 3 random unique card images
  const cards    = [...POOL].sort(()=>Math.random()-.5).slice(0, 3);
  const imgPool  = [...CARD_IMGS].sort(()=>Math.random()-.5);
  cards.forEach((c, i) => { c.img = imgPool[i]; });

  const wrap = document.createElement('div');
  wrap.className = 'mg-cards-wrap';
  wrap.innerHTML = `
    <button class="mg-x-btn" id="mgc-x">✕</button>
    <div class="mg-game-title">🃏 Carte del Mercante</div>
    <p class="mg-hint" id="mgc-hint">Scegli una carta</p>
    <div class="mg-cards-row" id="mgc-row"></div>
    <div class="mg-result-area" id="mgc-res"></div>
    <button class="btn mg-close-btn hidden" id="mgc-close">Continua ›</button>`;
  mgOverlay(wrap, 'assets/backgrounds/carte del mercante.webp');
  const row = document.getElementById('mgc-row');
  const hint = document.getElementById('mgc-hint');
  const resEl = document.getElementById('mgc-res');
  const closeBtn = document.getElementById('mgc-close');
  cards.forEach((card) => {
    const cel = document.createElement('div');
    cel.className = 'mgc-card';
    cel.innerHTML = `<div class="mgc-inner">
      <div class="mgc-back"><div class="mgc-back-ornament"></div><div class="mgc-back-sym">✦</div></div>
      <div class="mgc-front">
        <img class="mgc-card-img" src="${card.img}" alt="${card.title}">
        <div class="mgc-front-label${card.trap ? ' mgc-trap-label' : ''}">${card.trap ? '☠️ Maledizione' : card.title}</div>
      </div>
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
          card.reward,
          card.trap ? '☠️ Maledizione del Mercante' : `✨ ${card.title}`,
          card.trap ? 'Hai perso 10 Oro!' : ''
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
  mgOverlay(wrap, 'assets/backgrounds/tiro alla balestra.webp');
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
        const xp = Math.round(totalScore * 0.28);
        mgGiveReward({ gold, xp });
        mgRecord('archery');
        resEl.innerHTML = mgRewardHTML({ gold, xp }, `Punteggio: ${totalScore} / 90`, totalScore >= 70 ? '🏆 Leggendario!' : totalScore >= 40 ? '⭐ Buona mira!' : 'Continua ad allenarti');
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

/* ── 🍺 LANCIO DEL BOCCALE ── */
function openBoccaleGame() {
  if (!mgCanPlay('boccale')) return;

  let state = 'IDLE'; // IDLE | CHARGING | SLIDING | END
  let power = 0, powerDir = 1, velocity = 0, currentY = 0;
  const FRICTION = 0.975, POWER_SPEED = 2.5;

  const wrap = document.createElement('div');
  wrap.className = 'mg-boccale-wrap';
  wrap.innerHTML = `
    <button class="mg-x-btn" id="mgb-x">✕</button>
    <div class="mg-game-title">🍺 La Sfida dell'Oste</div>
    <p class="mg-hint" id="mgb-hint">Tieni premuto per caricare, rilascia per lanciare!</p>
    <div class="mgb-arena" id="mgb-arena">
      <img src="assets/minigames/boccale/sottobicchiere.webp" class="mgb-target" id="mgb-target" alt="Bersaglio">
      <div class="mgb-mug" id="mgb-mug">
        <img src="assets/minigames/boccale/boccale.webp" class="mgb-mug-img" alt="Boccale">
        <img src="assets/minigames/boccale/splash birra.webp" class="mgb-splash" id="mgb-splash" alt="">
      </div>
      <div class="mgb-power-wrap">
        <div class="mgb-power-fill" id="mgb-power-fill"></div>
      </div>
    </div>
    <div class="mg-result-area" id="mgb-res"></div>
    <button class="btn mg-close-btn hidden" id="mgb-close">Continua ›</button>`;
  mgOverlay(wrap);

  const arena    = document.getElementById('mgb-arena');
  const mug      = document.getElementById('mgb-mug');
  const target   = document.getElementById('mgb-target');
  const splash   = document.getElementById('mgb-splash');
  const powerFill= document.getElementById('mgb-power-fill');
  const hintEl   = document.getElementById('mgb-hint');
  const resEl    = document.getElementById('mgb-res');
  const closeBtn = document.getElementById('mgb-close');

  function cleanup() {
    window.removeEventListener('mouseup', releaseMug);
    window.removeEventListener('touchend', releaseMug);
  }

  function startCharging(e) {
    if (e.type === 'touchstart') e.preventDefault();
    if (state !== 'IDLE') return;
    state = 'CHARGING';
    hintEl.textContent = 'Caricando la spinta…';
    power = 0;
    function chargeLoop() {
      if (state !== 'CHARGING') return;
      power += POWER_SPEED * powerDir;
      if (power >= 100) { power = 100; powerDir = -1; }
      if (power <= 0)   { power = 0;   powerDir =  1; }
      powerFill.style.height = `${power}%`;
      _mgRAF = requestAnimationFrame(chargeLoop);
    }
    chargeLoop();
  }

  function releaseMug(e) {
    if (e && e.type === 'touchend') e.preventDefault();
    if (state !== 'CHARGING') return;
    state = 'SLIDING';
    cancelAnimationFrame(_mgRAF);
    velocity = (power / 100) * 38;
    hintEl.textContent = 'Lanciato!';
    slideLoop();
  }

  function slideLoop() {
    currentY -= velocity;
    velocity *= FRICTION;
    mug.style.transform = `translateX(-50%) translateY(${currentY}px)`;
    const maxY = -(arena.clientHeight - 70);
    if (currentY <= maxY) {
      mug.style.transform = `translateX(-50%) translateY(${maxY}px)`;
      arena.classList.add('mgb-shake');
      setTimeout(() => arena.classList.remove('mgb-shake'), 400);
      endGame(false, 'Troppa forza! Il boccale è andato a pezzi!');
      return;
    }
    if (velocity < 0.1) { checkWin(); return; }
    _mgRAF = requestAnimationFrame(slideLoop);
  }

  function checkWin() {
    state = 'END';
    const mugR    = mug.getBoundingClientRect();
    const tgtR    = target.getBoundingClientRect();
    const dist    = Math.abs((mugR.top + mugR.height / 2) - (tgtR.top + tgtR.height / 2));
    const tol     = tgtR.height / 1.5;
    if (dist <= tol) {
      splash.classList.add('mgb-splash-active');
      vibrate([100, 50, 200]); sfx('coin');
      endGame(true, '🎯 Centrato! Pinta perfetta!');
    } else {
      const dir = (mugR.top + mugR.height / 2) > (tgtR.top + tgtR.height / 2) ? 'debole' : 'forte';
      endGame(false, `Mancato! Lancio troppo ${dir}.`);
    }
  }

  function endGame(won, msg) {
    state = 'END';
    cleanup();
    mgRecord('boccale');
    const gold = 30, xp = 25;
    if (won) {
      mgGiveReward({ gold, xp });
      resEl.innerHTML = mgRewardHTML({ gold, xp }, msg, '');
    } else {
      resEl.innerHTML = `<div class="mg-reward"><div class="mg-reward-title">${msg}</div></div>`;
    }
    resEl.classList.add('mg-res-in');
    closeBtn.classList.remove('hidden');
    if (!won && mgCanPlay('boccale')) {
      const rb = document.createElement('button');
      rb.className = 'btn btn-primary wide'; rb.style.marginTop = '8px';
      rb.textContent = 'Riprova';
      rb.addEventListener('click', () => { mgClose(); setTimeout(openBoccaleGame, 300); });
      resEl.appendChild(rb);
    }
  }

  arena.addEventListener('mousedown', startCharging);
  arena.addEventListener('touchstart', startCharging, { passive: false });
  window.addEventListener('mouseup', releaseMug);
  window.addEventListener('touchend', releaseMug);

  document.getElementById('mgb-x').addEventListener('click', () => { cleanup(); mgClose(); });
  closeBtn.addEventListener('click', () => { cleanup(); mgClose(); });
}

/* ── 🎲 DADI DEL BLUFF ── */
function openDadiGame() {
  if (!mgCanPlay('dadi')) return;

  const N_DICE = 5;
  let playerDice = [], osteDice = [];
  let bidQty = 1, bidFace = 1;
  let currentBid = { qty: 0, face: 1 }; // qty=0 means no bid yet
  let turn = 'player'; // 'player' | 'oste'
  let gameOver = false;

  function rollDice(n) {
    return Array.from({ length: n }, () => Math.floor(Math.random() * 6) + 1);
  }

  function startRound() {
    playerDice = rollDice(N_DICE);
    osteDice   = rollDice(N_DICE);
    currentBid = { qty: 0, face: 1 };
    turn = 'player';
    bidQty = 1; bidFace = 1;
    gameOver = false;
    renderDadi();
  }

  /* ── dot layouts for CSS dice ── */
  function makeDie(face, hidden) {
    const d = document.createElement('div');
    d.className = 'mgd-die' + (hidden ? ' mgd-hidden' : '');
    d.dataset.face = face;
    const layouts = {
      1: [[50,50]],
      2: [[25,25],[75,75]],
      3: [[25,25],[50,50],[75,75]],
      4: [[25,25],[75,25],[25,75],[75,75]],
      5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
      6: [[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]],
    };
    (layouts[face] || []).forEach(([x,y]) => {
      const dot = document.createElement('div');
      dot.className = 'mgd-dot';
      dot.style.cssText = `left:${x}%;top:${y}%;`;
      d.appendChild(dot);
    });
    return d;
  }

  function renderDiceRow(arr, hidden) {
    const row = document.createElement('div');
    row.className = 'mgd-dice-row';
    arr.forEach(f => row.appendChild(makeDie(f, hidden)));
    return row;
  }

  /* ── AI logic ── */
  function osteThink() {
    const counts = Array(7).fill(0);
    osteDice.forEach(f => counts[f]++);
    const estTotal = (f) => counts[f] + Math.round(N_DICE / 6);

    const prevQty  = currentBid.qty;
    const prevFace = currentBid.face;

    // call bluff if bid seems implausible
    const believable = estTotal(prevFace) + 1;
    if (prevQty > believable) {
      return 'bluff';
    }

    // pick best face to raise on
    let bestFace = prevFace, bestCount = counts[prevFace];
    for (let f = 1; f <= 6; f++) {
      if (counts[f] > bestCount) { bestCount = counts[f]; bestFace = f; }
    }

    // try to raise quantity on same face, or move to a better face
    if (bestFace > prevFace) {
      return { qty: prevQty, face: bestFace };
    }
    // raise qty
    const newQty = prevQty + 1;
    if (newQty > N_DICE * 2) return 'bluff'; // nothing sensible to bid
    return { qty: newQty, face: bestFace };
  }

  function resolveBluff(callerIsPlayer) {
    const declQty  = currentBid.qty;
    const declFace = currentBid.face;
    const allDice  = [...playerDice, ...osteDice];
    const actual   = allDice.filter(f => f === declFace).length;
    const bidWasTrue = actual >= declQty;
    // if bid was true → caller loses; if bid was false → bidder loses
    const playerWins = callerIsPlayer ? !bidWasTrue : bidWasTrue;
    endDadiGame(playerWins, declQty, declFace, actual, callerIsPlayer);
  }

  /* ── rendering ── */
  function renderDadi() {
    const panelEl = document.getElementById('mgd-main');
    if (!panelEl) return;
    panelEl.innerHTML = '';

    // Oste section
    const osteSection = document.createElement('div');
    osteSection.className = 'mgd-oste-section';
    osteSection.innerHTML = `<img class="mgd-oste-avatar" src="assets/minigames/dadi-del-bluff/oste.webp" alt="Oste">`;
    const osteLabel = document.createElement('div');
    osteLabel.className = 'mgd-section-label';
    osteLabel.textContent = 'Dadi dell\'Oste';
    osteSection.appendChild(osteLabel);
    osteSection.appendChild(renderDiceRow(osteDice, !gameOver));
    panelEl.appendChild(osteSection);

    // Current bid
    const bidEl = document.createElement('div');
    bidEl.className = 'mgd-bid-display';
    if (currentBid.qty > 0) {
      bidEl.innerHTML = `<span class="mgd-bid-label">Rilancio attuale:</span> <strong>${currentBid.qty}× ⚄${currentBid.face}</strong>`;
    } else {
      bidEl.innerHTML = `<span class="mgd-bid-label">Fai la prima dichiarazione!</span>`;
    }
    panelEl.appendChild(bidEl);

    // Player section
    const playerSection = document.createElement('div');
    playerSection.className = 'mgd-player-section';
    const playerLabel = document.createElement('div');
    playerLabel.className = 'mgd-section-label';
    playerLabel.textContent = 'I tuoi dadi';
    playerSection.appendChild(playerLabel);
    playerSection.appendChild(renderDiceRow(playerDice, false));
    panelEl.appendChild(playerSection);

    // Controls
    const ctrl = document.createElement('div');
    ctrl.className = 'mgd-controls';
    if (!gameOver && turn === 'player') {
      // Bid selectors
      const selRow = document.createElement('div');
      selRow.className = 'mgd-sel-row';

      const qtyWrap = document.createElement('div');
      qtyWrap.className = 'mgd-sel-wrap';
      qtyWrap.innerHTML = `<label class="mgd-sel-lbl">Quantità</label>`;
      const qtyRow = document.createElement('div');
      qtyRow.className = 'mgd-spin-row';
      const qtyDec = document.createElement('button');
      qtyDec.className = 'mgd-spin-btn'; qtyDec.textContent = '−';
      const qtyVal = document.createElement('span');
      qtyVal.className = 'mgd-spin-val'; qtyVal.id = 'mgd-qty-val'; qtyVal.textContent = bidQty;
      const qtyInc = document.createElement('button');
      qtyInc.className = 'mgd-spin-btn'; qtyInc.textContent = '+';
      qtyDec.addEventListener('click', () => { if (bidQty > 1) { bidQty--; qtyVal.textContent = bidQty; } });
      qtyInc.addEventListener('click', () => { if (bidQty < N_DICE * 2) { bidQty++; qtyVal.textContent = bidQty; } });
      qtyRow.append(qtyDec, qtyVal, qtyInc);
      qtyWrap.appendChild(qtyRow);

      const faceWrap = document.createElement('div');
      faceWrap.className = 'mgd-sel-wrap';
      faceWrap.innerHTML = `<label class="mgd-sel-lbl">Faccia</label>`;
      const faceRow = document.createElement('div');
      faceRow.className = 'mgd-spin-row';
      const faceDec = document.createElement('button');
      faceDec.className = 'mgd-spin-btn'; faceDec.textContent = '−';
      const faceVal = document.createElement('span');
      faceVal.className = 'mgd-spin-val'; faceVal.id = 'mgd-face-val'; faceVal.textContent = bidFace;
      const faceInc = document.createElement('button');
      faceInc.className = 'mgd-spin-btn'; faceInc.textContent = '+';
      faceDec.addEventListener('click', () => { if (bidFace > 1) { bidFace--; faceVal.textContent = bidFace; } });
      faceInc.addEventListener('click', () => { if (bidFace < 6) { bidFace++; faceVal.textContent = bidFace; } });
      faceRow.append(faceDec, faceVal, faceInc);
      faceWrap.appendChild(faceRow);

      selRow.append(qtyWrap, faceWrap);
      ctrl.appendChild(selRow);

      const btnRow = document.createElement('div');
      btnRow.className = 'mgd-btn-row';

      const bidBtn = document.createElement('button');
      bidBtn.className = 'btn btn-primary'; bidBtn.textContent = '📢 Dichiara';
      bidBtn.addEventListener('click', () => {
        // validate: must be strictly higher than currentBid
        const valid = currentBid.qty === 0 ||
          bidQty > currentBid.qty ||
          (bidQty === currentBid.qty && bidFace > currentBid.face);
        if (!valid) {
          const hint = document.getElementById('mgd-hint');
          if (hint) { hint.textContent = 'Devi alzare la dichiarazione!'; hint.classList.add('mgd-hint-err'); }
          return;
        }
        currentBid = { qty: bidQty, face: bidFace };
        turn = 'oste';
        renderDadi();
        setTimeout(osteMove, 900);
      });

      btnRow.appendChild(bidBtn);

      if (currentBid.qty > 0) {
        const bluffBtn = document.createElement('button');
        bluffBtn.className = 'btn btn-secondary mgd-bluff-btn'; bluffBtn.textContent = '🤥 Chiama Bluff!';
        bluffBtn.addEventListener('click', () => {
          resolveBluff(true);
        });
        btnRow.appendChild(bluffBtn);
      }
      ctrl.appendChild(btnRow);
    } else if (!gameOver && turn === 'oste') {
      const thinking = document.createElement('div');
      thinking.className = 'mgd-thinking';
      thinking.textContent = 'L\'oste sta pensando…';
      ctrl.appendChild(thinking);
    }

    panelEl.appendChild(ctrl);

    // hint line
    const hint = document.createElement('div');
    hint.className = 'mgd-hint'; hint.id = 'mgd-hint';
    panelEl.appendChild(hint);
  }

  function osteMove() {
    if (gameOver) return;
    const decision = osteThink();
    if (decision === 'bluff') {
      resolveBluff(false);
    } else {
      currentBid = decision;
      bidQty  = Math.min(N_DICE * 2, currentBid.qty + 1);
      bidFace = currentBid.face;
      turn = 'player';
      renderDadi();
    }
  }

  function endDadiGame(playerWins, declQty, declFace, actual, callerIsPlayer) {
    gameOver = true;
    // re-render to reveal oste dice
    renderDadi();

    const resEl = document.getElementById('mgd-res');
    const closeBtn = document.getElementById('mgd-close');
    if (!resEl || !closeBtn) return;

    const callerName = callerIsPlayer ? 'Tu hai' : 'L\'oste ha';
    const bidderName = callerIsPlayer ? 'L\'oste aveva dichiarato' : 'Avevi dichiarato';
    const resultLine = `${bidderName} ${declQty}× faccia ${declFace}. Trovati: ${actual}.`;
    const verdictLine = actual >= declQty
      ? `La dichiarazione era VERA — ${callerName} chiamato bluff invano!`
      : `La dichiarazione era FALSA — bluff smascherato!`;

    mgRecord('dadi');
    if (playerWins) {
      const gold = 30, xp = 25;
      mgGiveReward({ gold, xp });
      vibrate([80, 40, 160]); sfx('coin');
      resEl.innerHTML = mgRewardHTML({ gold, xp }, '🎉 Hai vinto!', `${resultLine} ${verdictLine}`);
    } else {
      resEl.innerHTML = `<div class="mg-reward"><div class="mg-reward-title">😔 Hai perso!</div><div class="mg-reward-sub">${resultLine} ${verdictLine}</div></div>`;
    }
    resEl.classList.add('mg-res-in');
    closeBtn.classList.remove('hidden');

    if (!playerWins && mgCanPlay('dadi')) {
      const rb = document.createElement('button');
      rb.className = 'btn btn-primary wide'; rb.style.marginTop = '8px';
      rb.textContent = 'Riprova';
      rb.addEventListener('click', () => { mgClose(); setTimeout(openDadiGame, 300); });
      resEl.appendChild(rb);
    }
  }

  /* ── build overlay ── */
  const wrap = document.createElement('div');
  wrap.className = 'mgd-wrap';
  wrap.innerHTML = `
    <button class="mg-x-btn" id="mgd-x">✕</button>
    <div class="mg-game-title">🎲 Dadi del Bluff</div>
    <div id="mgd-main" class="mgd-main"></div>
    <div class="mg-result-area" id="mgd-res"></div>
    <button class="btn mg-close-btn hidden" id="mgd-close">Continua ›</button>`;

  mgOverlay(wrap, 'assets/minigames/dadi-del-bluff/tavolo.webp');

  startRound();

  document.getElementById('mgd-x').addEventListener('click', mgClose);
  document.getElementById('mgd-close').addEventListener('click', mgClose);
}

/* ── 🎣 PESCA NEL FOSSATO ── */
function openPescaGame() {
  if (!mgCanPlay('pesca')) return;

  let state = 'IDLE';
  let zonePos = 0, zoneVelocity = 0, isThrusting = false;
  const ZONE_HEIGHT = 90;
  const GRAVITY = 0.4, THRUST = 0.8, FRICTION = 0.92;

  let fishPos = 0, fishTarget = 0, fishSpeed = 0, fishTimer = 0;
  const FISH_HEIGHT = 44;

  let progress = 20;
  const WIN_MAX = 100;
  let containerHeight = 0;

  const wrap = document.createElement('div');
  wrap.className = 'mgp-wrap';
  wrap.innerHTML = `
    <button class="mg-x-btn" id="mgp-x">✕</button>
    <div class="mg-game-title">🎣 Pesca nel Fossato</div>
    <p class="mg-hint" id="mgp-hint">Tieni premuto per far salire l'esca!<br>Mantieni il pesce nell'area verde.</p>
    <div class="mgp-arena" id="mgp-arena">
      <div class="mgp-bar-col" id="mgp-bar">
        <div class="mgp-zone" id="mgp-zone"></div>
        <img src="assets/minigames/pesca-del-fossato/pesce.webp" class="mgp-fish" id="mgp-fish" alt="">
      </div>
      <div class="mgp-prog-col">
        <div class="mgp-prog-fill" id="mgp-prog-fill"></div>
      </div>
    </div>
    <div class="mg-result-area" id="mgp-res"></div>
    <button class="btn mg-close-btn hidden" id="mgp-close">Continua ›</button>`;

  mgOverlay(wrap, 'assets/minigames/pesca-del-fossato/fossato.webp');

  const arenaEl  = document.getElementById('mgp-arena');
  const barEl    = document.getElementById('mgp-bar');
  const zoneEl   = document.getElementById('mgp-zone');
  const fishEl   = document.getElementById('mgp-fish');
  const progFill = document.getElementById('mgp-prog-fill');
  const hintEl   = document.getElementById('mgp-hint');
  const resEl    = document.getElementById('mgp-res');
  const closeBtn = document.getElementById('mgp-close');

  function cleanup() {
    window.removeEventListener('mouseup', thrustOff);
    window.removeEventListener('touchend', thrustOff);
  }

  function thrustOn(e) {
    if (e.type === 'touchstart') e.preventDefault();
    if (state === 'IDLE') {
      state = 'PLAYING';
      hintEl.textContent = 'Lotta in corso!';
      containerHeight = barEl.clientHeight;
      zonePos = (containerHeight / 2) - (ZONE_HEIGHT / 2);
      fishPos = zonePos + 20;
      progress = 20;
      gameLoop();
    }
    isThrusting = true;
  }

  function thrustOff() { isThrusting = false; }

  function gameLoop() {
    if (state !== 'PLAYING') return;

    // Zone physics
    zoneVelocity += isThrusting ? -THRUST : GRAVITY;
    zoneVelocity *= FRICTION;
    zonePos += zoneVelocity;
    const maxZonePos = containerHeight - ZONE_HEIGHT;
    if (zonePos < 0)          { zonePos = 0;          zoneVelocity = 0; }
    if (zonePos > maxZonePos) { zonePos = maxZonePos; zoneVelocity = 0; }

    // Fish AI
    fishTimer--;
    if (fishTimer <= 0) {
      fishTimer  = 30 + Math.random() * 60;
      fishTarget = Math.random() * (containerHeight - FISH_HEIGHT);
      fishSpeed  = 0.5 + Math.random() * 3.5;
    }
    if (fishPos < fishTarget) fishPos += fishSpeed;
    if (fishPos > fishTarget) fishPos -= fishSpeed;
    if (fishPos < 0)                          fishPos = 0;
    if (fishPos > containerHeight - FISH_HEIGHT) fishPos = containerHeight - FISH_HEIGHT;

    // Collision & progress
    const fishCenterY = fishPos + FISH_HEIGHT / 2;
    const inside = fishCenterY >= zonePos && fishCenterY <= zonePos + ZONE_HEIGHT;
    if (inside) { zoneEl.classList.add('mgp-zone-active');    progress += 0.25; }
    else        { zoneEl.classList.remove('mgp-zone-active'); progress -= 0.15; }
    progress = Math.max(0, Math.min(progress, WIN_MAX));

    // Visuals
    zoneEl.style.transform  = `translateY(${zonePos}px)`;
    fishEl.style.transform  = `translateY(${fishPos}px)`;
    progFill.style.height   = `${progress}%`;

    if (progress >= WIN_MAX) { endGame(true);  return; }
    if (progress <= 0)       { endGame(false); return; }

    _mgRAF = requestAnimationFrame(gameLoop);
  }

  function endGame(won) {
    state = 'END';
    cleanup();
    zoneEl.classList.remove('mgp-zone-active');
    mgRecord('pesca');
    if (won) {
      const gold = 40, xp = 30;
      mgGiveReward({ gold, xp });
      vibrate([80, 40, 160]); sfx('coin');
      resEl.innerHTML = mgRewardHTML({ gold, xp }, '🎣 Catturato!', 'Creatura eccezionale!');
    } else {
      arenaEl.classList.add('mgp-shake');
      setTimeout(() => arenaEl.classList.remove('mgp-shake'), 400);
      resEl.innerHTML = `<div class="mg-reward"><div class="mg-reward-title">💦 Fuggito…</div><div class="mg-reward-sub">La lenza si è spezzata.</div></div>`;
    }
    resEl.classList.add('mg-res-in');
    closeBtn.classList.remove('hidden');
    if (!won && mgCanPlay('pesca')) {
      const rb = document.createElement('button');
      rb.className = 'btn btn-primary wide'; rb.style.marginTop = '8px';
      rb.textContent = 'Riprova';
      rb.addEventListener('click', () => { mgClose(); setTimeout(openPescaGame, 300); });
      resEl.appendChild(rb);
    }
  }

  arenaEl.addEventListener('mousedown', thrustOn);
  arenaEl.addEventListener('touchstart', thrustOn, { passive: false });
  window.addEventListener('mouseup', thrustOff);
  window.addEventListener('touchend', thrustOff);

  document.getElementById('mgp-x').addEventListener('click', () => { cleanup(); mgClose(); });
  closeBtn.addEventListener('click', () => { cleanup(); mgClose(); });
}

/* ── 💪 BRACCIO DI FERRO ── */
function openBraccioGame() {
  if (!mgCanPlay('braccio')) return;

  let position = 50; // 0 = nano vince, 100 = eroe vince
  let state = 'IDLE';
  const DWARF_FORCE = 0.3;

  const wrap = document.createElement('div');
  wrap.className = 'mgbf-wrap';
  wrap.innerHTML = `
    <button class="mg-x-btn" id="mgbf-x">✕</button>
    <div class="mg-game-title">💪 Il Nano Possente</div>
    <p class="mg-hint" id="mgbf-msg">Tocca la zona per vincere il braccio di ferro!</p>
    <div class="mgbf-avatars">
      <div class="mgbf-avatar-wrap">
        <img src="assets/minigames/braccio-di-ferro/sfidante.webp" class="mgbf-avatar-img" alt="Nano">
        <span class="mgbf-avatar-lbl">Nano</span>
      </div>
      <div class="mgbf-avatar-wrap">
        <div class="mgbf-avatar-hero" id="mgbf-hero">🤺</div>
        <span class="mgbf-avatar-lbl">Tu</span>
      </div>
    </div>
    <div class="mgbf-bar-wrap">
      <div class="mgbf-bar-danger"></div>
      <div class="mgbf-bar-safe"></div>
      <div class="mgbf-indicator" id="mgbf-ind">✊</div>
    </div>
    <div class="mgbf-tap" id="mgbf-tap">PREMI!</div>
    <div class="mg-result-area" id="mgbf-res"></div>
    <button class="btn mg-close-btn hidden" id="mgbf-close">Continua ›</button>`;

  mgOverlay(wrap);

  const msgEl    = document.getElementById('mgbf-msg');
  const indEl    = document.getElementById('mgbf-ind');
  const tapEl    = document.getElementById('mgbf-tap');
  const heroEl   = document.getElementById('mgbf-hero');
  const resEl    = document.getElementById('mgbf-res');
  const closeBtn = document.getElementById('mgbf-close');

  function tap(e) {
    if (e.type === 'touchstart') e.preventDefault();
    if (state === 'IDLE') {
      state = 'PLAYING';
      msgEl.textContent = 'Premi velocemente!';
      _mgRAF = requestAnimationFrame(gameLoop);
    }
    if (state !== 'PLAYING') return;
    position += 4.5;
    // nano reagisce visivamente
    heroEl.style.transform = `scale(${1 + Math.random() * 0.15})`;
    setTimeout(() => { heroEl.style.transform = 'scale(1)'; }, 60);
  }

  function gameLoop() {
    if (state !== 'PLAYING') return;
    const extra = position > 70 ? 0.4 : 0;
    position -= DWARF_FORCE + extra;

    // shake quando vicino ai bordi
    if (position < 20 || position > 80) wrap.classList.add('mgbf-shake');
    else                                 wrap.classList.remove('mgbf-shake');

    position = Math.max(0, Math.min(position, 100));
    indEl.style.left = `${position}%`;

    if (position >= 100) { endGame(true);  return; }
    if (position <= 0)   { endGame(false); return; }
    _mgRAF = requestAnimationFrame(gameLoop);
  }

  function endGame(won) {
    state = 'END';
    wrap.classList.remove('mgbf-shake');
    mgRecord('braccio');
    if (won) {
      const gold = 30, xp = 25;
      mgGiveReward({ gold, xp });
      vibrate([100, 50, 200]); sfx('coin');
      resEl.innerHTML = mgRewardHTML({ gold, xp }, '💪 Vittoria!', 'Che muscoli da guerriero!');
    } else {
      vibrate([300]);
      resEl.innerHTML = `<div class="mg-reward"><div class="mg-reward-title">😵 Schiacciato!</div><div class="mg-reward-sub">Il nano vince questa volta.</div></div>`;
    }
    resEl.classList.add('mg-res-in');
    closeBtn.classList.remove('hidden');
    if (!won && mgCanPlay('braccio')) {
      const rb = document.createElement('button');
      rb.className = 'btn btn-primary wide'; rb.style.marginTop = '8px';
      rb.textContent = 'Riprova';
      rb.addEventListener('click', () => { mgClose(); setTimeout(openBraccioGame, 300); });
      resEl.appendChild(rb);
    }
  }

  tapEl.addEventListener('touchstart', tap, { passive: false });
  tapEl.addEventListener('mousedown', tap);

  document.getElementById('mgbf-x').addEventListener('click', mgClose);
  closeBtn.addEventListener('click', mgClose);
}

/* ── 🗡️ LANCIO DEL COLTELLO ── */
function openColtelloGame() {
  if (!mgCanPlay('coltello')) return;

  const KNIVES_TOTAL = 5;
  const COLLISION_DEG = 18;

  let logAngle = 0;
  let rotSpeed = 2.5;
  let stuckAngles = [];
  let knivesLeft = KNIVES_TOTAL;
  let state = 'PLAYING'; // PLAYING | FLYING | END

  const wrap = document.createElement('div');
  wrap.className = 'mgck-wrap';
  wrap.innerHTML = `
    <button class="mg-x-btn" id="mgck-x">✕</button>
    <div class="mg-game-title">🗡️ Bersaglio del Cacciatore</div>
    <p class="mg-hint" id="mgck-msg">Pianta tutti e 5 i coltelli!</p>
    <div class="mgck-arena" id="mgck-arena">
      <div class="mgck-log-wrap" id="mgck-log-wrap">
        <img src="assets/minigames/lancio-coltello/ceppo.webp" class="mgck-log-img" alt="Ceppo">
      </div>
      <div class="mgck-knife-active" id="mgck-knife">🗡️</div>
      <div class="mgck-ammo" id="mgck-ammo"></div>
    </div>
    <div class="mg-result-area" id="mgck-res"></div>
    <button class="btn mg-close-btn hidden" id="mgck-close">Continua ›</button>`;

  mgOverlay(wrap);

  const msgEl    = document.getElementById('mgck-msg');
  const arenaEl  = document.getElementById('mgck-arena');
  const logWrap  = document.getElementById('mgck-log-wrap');
  const knifeEl  = document.getElementById('mgck-knife');
  const ammoEl   = document.getElementById('mgck-ammo');
  const resEl    = document.getElementById('mgck-res');
  const closeBtn = document.getElementById('mgck-close');

  // build ammo icons
  function refreshAmmo() {
    ammoEl.innerHTML = '';
    for (let i = 0; i < KNIVES_TOTAL; i++) {
      const ic = document.createElement('span');
      ic.className = 'mgck-ammo-ic' + (i < knivesLeft ? ' ready' : '');
      ic.textContent = '🗡️';
      ammoEl.appendChild(ic);
    }
  }
  refreshAmmo();

  function rotateLoop() {
    if (state === 'END') return;
    logAngle = (logAngle + rotSpeed) % 360;
    logWrap.style.transform = `rotate(${logAngle}deg)`;
    // occasionale cambio velocità / inversione
    if (Math.random() < 0.01) rotSpeed = (1 + Math.random() * 3) * (Math.random() < 0.2 ? -1 : 1);
    _mgRAF = requestAnimationFrame(rotateLoop);
  }
  _mgRAF = requestAnimationFrame(rotateLoop);

  function throwKnife(e) {
    if (e.type === 'touchstart') e.preventDefault();
    if (state !== 'PLAYING') return;
    state = 'FLYING';

    // calcola distanza tra coltello e log center
    const kRect = knifeEl.getBoundingClientRect();
    const lRect = logWrap.getBoundingClientRect();
    const dist  = -(lRect.top + lRect.height / 2 - (kRect.top + kRect.height / 2));
    knifeEl.style.transition = 'transform .15s ease-in';
    knifeEl.style.transform  = `translateX(-50%) translateY(${dist}px)`;

    setTimeout(checkImpact, 155);
  }

  function checkImpact() {
    // angolo di impatto = inverso dell'angolo log corrente
    const impactAngle = (360 - logAngle % 360 + 360) % 360;

    const collision = stuckAngles.some(a => {
      let d = Math.abs(impactAngle - a);
      if (d > 180) d = 360 - d;
      return d < COLLISION_DEG;
    });

    if (collision) {
      knifeEl.style.transform += ' rotate(45deg) translate(40px, 80px)';
      wrap.classList.add('mgck-shake');
      endGame(false);
    } else {
      stuckAngles.push(impactAngle);
      // coltello piantato nel ceppo (ruota col log)
      const stuck = document.createElement('span');
      stuck.className = 'mgck-stuck';
      stuck.textContent = '🗡️';
      stuck.style.transform = `rotate(${impactAngle}deg) translateY(68px)`;
      logWrap.appendChild(stuck);

      knivesLeft--;
      refreshAmmo();

      if (knivesLeft <= 0) {
        knifeEl.style.opacity = '0';
        endGame(true);
      } else {
        // ripristina coltello attivo
        knifeEl.style.transition = 'none';
        knifeEl.style.transform  = 'translateX(-50%) translateY(30px)';
        knifeEl.style.opacity    = '0';
        setTimeout(() => {
          knifeEl.style.transition = 'transform .15s ease-in';
          knifeEl.style.transform  = 'translateX(-50%) translateY(0px)';
          knifeEl.style.opacity    = '1';
          state = 'PLAYING';
        }, 110);
      }
    }
  }

  function endGame(won) {
    state = 'END';
    mgRecord('coltello');
    if (won) {
      const gold = 50, xp = 40;
      mgGiveReward({ gold, xp });
      vibrate([80, 40, 200]); sfx('coin');
      resEl.innerHTML = mgRewardHTML({ gold, xp }, '🎯 Infallibile!', 'Tutti e 5 nel segno!');
    } else {
      resEl.innerHTML = `<div class="mg-reward"><div class="mg-reward-title">⚔️ Clang!</div><div class="mg-reward-sub">Lame scontrate!</div></div>`;
    }
    resEl.classList.add('mg-res-in');
    closeBtn.classList.remove('hidden');
    if (!won && mgCanPlay('coltello')) {
      const rb = document.createElement('button');
      rb.className = 'btn btn-primary wide'; rb.style.marginTop = '8px';
      rb.textContent = 'Riprova';
      rb.addEventListener('click', () => { mgClose(); setTimeout(openColtelloGame, 300); });
      resEl.appendChild(rb);
    }
  }

  arenaEl.addEventListener('mousedown', throwKnife);
  arenaEl.addEventListener('touchstart', throwKnife, { passive: false });

  document.getElementById('mgck-x').addEventListener('click', mgClose);
  closeBtn.addEventListener('click', mgClose);
}
