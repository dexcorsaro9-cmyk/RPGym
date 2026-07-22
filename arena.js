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
    RPG.updateChallengeProgress(HERO, 'arena', 1);
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

