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
      : `<img class="arena-intro-img" src="assets/bestiario/${v.id}.webp" onerror="this.style.display='none'">`;
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
    const equipType = RPG.equipTypeBonusAggregate(HERO);
    const classBonus = RPG.classArenaBonus(HERO, v);
    const furnHpBonus = Math.round(100 * (furn.arenaHpMult + equipType.arenaHpMult));
    const furnDmgBonus = Math.round(34 * (furn.arenaDmgMult + equipType.arenaDmgMult + (v.boss ? furn.bossDmgMult : 0)));
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
      : `<img class="battle-villain-img" id="battle-villain-img" src="assets/bestiario/${b.v.id}.webp" onerror="this.outerHTML='<div class=&quot;battle-emoji&quot;>👹</div>'">`;
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
  wrap.className = 'battle-move-cards';
  wrap.innerHTML = '';
  Object.entries(RPG.BATTLE_MOVES).forEach(([key, m]) => {
    const beats = m.beats ? RPG.BATTLE_MOVES[m.beats] : null;
    const btn = el('button', 'move-card-btn');
    btn.dataset.move = key;
    btn.innerHTML = `<div class="mcb-icon">${m.icon}</div>
      <div class="mcb-label">${m.label}</div>
      ${beats ? `<div class="mcb-beats">batte ${beats.label}</div>` : ''}`;
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
  center.innerHTML = `<div class="reveal-cards">
    <div class="reveal-card hero">
      <div class="reveal-card-icon">${hm.icon}</div>
      <div class="reveal-card-who">Tu</div>
    </div>
    <div class="reveal-vs">VS</div>
    <div class="reveal-card villain">
      <div class="reveal-card-icon">${vm.icon}</div>
      <div class="reveal-card-who">${esc(b.v.name.split(' ')[0])}</div>
    </div>
  </div>`;
  const movesEl = document.getElementById('battle-moves');
  if (movesEl) movesEl.classList.add('locked');

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
    RPG.addPetVirtue(HERO, 'coraggio', b.v.boss ? 3 : 1);
    persist(); renderHUD();
    sfx('level');
    if (center) center.innerHTML = `<div class="battle-result-overlay"><div class="battle-result-text win">VITTORIA!</div></div>`;
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
    const shieldChest = (b.v.boss && HERO.consumableBuffs?.bossShield)
      ? RPG.battleReward(HERO, b.v) : null;
    persist(); if (shieldChest) renderHUD();
    sfx('defeat');
    if (center) center.innerHTML = `<div class="battle-result-overlay"><div class="battle-result-text lose">SCONFITTA…</div></div>`;
    const hs = document.getElementById('stage-hero');
    if (hs) hs.classList.add('defeated');
    setTimeout(() => {
      closeBattle();
      if (shieldChest) {
        PENDING_CHEST = { title: 'Sfera Ombra — Drop garantito', chest: shieldChest };
        modal(`<div class="chest-zone">
          <p class="center big-news">🌑 La Sfera Ombra ha agito!</p>
          <p class="muted small center">${esc(b.v.name)} ha vinto, ma il tuo talisman ha garantito il drop.</p>
          <button class="chest-btn" id="btn-open-chest"><img src="assets/ui/chest.svg" alt="scrigno"></button>
          <p class="small muted center">Tocca lo scrigno per aprirlo</p>
        </div>`);
        document.getElementById('btn-open-chest').addEventListener('click', openChest);
      } else {
        modal(`<h3 class="panel-title center">💀 Sconfitta</h3>
          <p class="center">${esc(b.v.name)} ha avuto la meglio, stavolta.</p>
          <p class="muted small center">Nessuna vergogna! Equipaggia oggetti migliori, sali di livello e tornerai più forte.</p>
          <button class="btn btn-primary wide" onclick="closeModal()">Tornerò più forte!</button>`);
      }
    }, 1500);
  }
}

function closeBattle() {
  const s = battleEl();
  s.classList.add('hidden');
  s.innerHTML = '';
  if (CURRENT_TAB === 'train') setTab('train'); // aggiorna il contatore sfide
}


/* ═══════════════════════════════════════════════════════════════
   SPEDIZIONE A TAPPE
   ═══════════════════════════════════════════════════════════════ */

function openDungeon() {
  if (!RPG.canStartDungeon(HERO)) {
    modal(`<h3 class="panel-title center">🗡️ Il Covo dell'Orda</h3>
      <p class="center muted">Hai già assaltato il Covo oggi.<br>Torna domani per la prossima incursione.</p>
      <button class="btn btn-primary wide" onclick="closeModal()">Ok</button>`);
    return;
  }
  modal(`<div class="dungeon-intro">
    <div class="dungeon-intro-icon">🗡️</div>
    <h3 class="panel-title center">Il Covo dell'Orda</h3>
    <p class="center small">Affronta <b>3 nemici</b> + un <b>Boss</b> in sequenza.<br>
    Tra gli scontri scegli come proseguire. Il boss lascia un oggetto <b>Epico</b> garantito.</p>
    <div class="dungeon-intro-rules">
      <div>📖 Scegli come affrontare ogni scontro</div>
      <div>💀 Se cadi, ottieni ricompense parziali</div>
      <div>🔒 Un assalto al giorno</div>
    </div>
    <button class="btn btn-primary wide big" id="btn-dungeon-start">🗡️ ASSALTA!</button>
    <button class="btn wide" onclick="closeModal()">Forse dopo…</button>
  </div>`);
  document.getElementById('btn-dungeon-start').addEventListener('click', () => {
    RPG.startDungeon(HERO);
    persist();
    closeModal();
    showDungeonEncounter();
  });
}

function showDungeonEncounter() {
  const d = HERO.activeDungeon;
  if (!d || d.done) return;
  if (d.enemyHp <= 0) { RPG.dungeonStartEncounter(HERO); persist(); }
  const enemy = RPG.dungeonCurrentEnemy(HERO);
  if (!enemy) return;
  const isBoss = !!enemy.boss;
  const stepLabel = isBoss ? '👑 BOSS FINALE' : `Scontro ${d.step + 1} / ${d.enemies.length - 1}`;
  const eHpPct = Math.max(0, d.enemyHp / d.enemyMaxHp * 100);
  const hHpPct = Math.max(0, d.heroHp / d.heroMaxHp * 100);
  const scenario = RPG.dungeonGetScenario(HERO);
  const fig = enemy.id === 'cavaliere-drago'
    ? '<div class="denc-enemy-emoji">🐉</div>'
    : `<img class="denc-enemy-img" src="assets/bestiario/${enemy.id}.png" onerror="this.style.display='none'">`;
  const weakLine = d.buffs.revealWeak
    ? `<div class="denc-weak">🔍 Debolezza: <b>${esc(enemy.weakness)}</b></div>` : '';
  const buffs = [];
  if (d.buffs.buffDmg > 0) buffs.push(`⚡ +${d.buffs.buffDmg} danni`);
  if (d.buffs.buffDmgPct > 0) buffs.push(`💪 +${Math.round(d.buffs.buffDmgPct * 100)}% danni`);
  const buffsHtml = buffs.length
    ? `<div class="denc-buffs">${buffs.join(' · ')}</div>` : '';
  const choicesHtml = scenario.choices.map((ch, i) =>
    `<button class="denc-choice" data-idx="${i}">
       <span class="denc-ch-icon">${ch.icon}</span>
       <span class="denc-ch-label">${esc(ch.label)}</span>
     </button>`
  ).join('');
  modal(`<div class="denc-wrap">
    <div class="denc-header">
      <span class="denc-step-badge${isBoss ? ' boss' : ''}">${stepLabel}</span>
    </div>
    <div class="denc-enemy-zone">
      ${fig}
      <div class="denc-enemy-name">${esc(enemy.name)}</div>
      ${weakLine}
      <div class="denc-hpbar-wrap">
        <div class="denc-hpfill enemy-fill" style="width:${eHpPct}%"></div>
      </div>
      <div class="denc-hp-num enemy-num">${d.enemyHp} HP</div>
    </div>
    ${buffsHtml}
    <div class="denc-scenario">${esc(scenario.text)}</div>
    <div class="denc-result hidden">
      <span class="denc-hit-text"></span>
      <span class="denc-dmg-text"></span>
    </div>
    <div class="denc-hero-row">
      <span class="denc-hp-label">❤️</span>
      <div class="denc-hpbar-wrap hero-hpbar">
        <div class="denc-hpfill hero-fill" style="width:${hHpPct}%"></div>
      </div>
      <span class="denc-hp-num hero-num">${d.heroHp} / ${d.heroMaxHp}</span>
    </div>
    <div class="denc-choices">${choicesHtml}</div>
    <button class="btn denc-flee" id="btn-denc-flee">✕ Abbandona</button>
  </div>`);
  document.querySelectorAll('.denc-choice').forEach(btn => {
    btn.addEventListener('click', () => dungeonDoAction(+btn.dataset.idx));
  });
  document.getElementById('btn-denc-flee').addEventListener('click', () => {
    const r = RPG.dungeonStepResult(HERO, false);
    persist(); renderHUD();
    showDungeonDefeat(r ? r.reward : { gold:0, xp:0, complete:false, stepsOk:0 });
  });
}

function dungeonDoAction(choiceIdx) {
  document.querySelectorAll('.denc-choice').forEach(b => b.disabled = true);
  const fleeBtn = document.getElementById('btn-denc-flee');
  if (fleeBtn) fleeBtn.disabled = true;

  const result = RPG.dungeonAction(HERO, choiceIdx);
  if (!result) return;
  persist(); renderHUD();

  const d = HERO.activeDungeon;
  const resEl = document.querySelector('.denc-result');
  const hitEl = document.querySelector('.denc-hit-text');
  const dmgEl = document.querySelector('.denc-dmg-text');
  if (hitEl) hitEl.textContent = result.heroHit > 0 ? `⚔️ −${result.heroHit} HP` : '💨 MANCATO!';
  if (dmgEl) dmgEl.textContent = result.heroDmg > 0 ? `💔 −${result.heroDmg} HP` : '🛡️ SCHIVATO!';
  if (resEl) { resEl.classList.remove('hidden', 'denc-show'); void resEl.offsetHeight; resEl.classList.add('denc-show'); }

  const eFill = document.querySelector('.enemy-fill');
  const hFill = document.querySelector('.hero-fill');
  const eNum  = document.querySelector('.enemy-num');
  const hNum  = document.querySelector('.hero-num');
  if (eFill) eFill.style.width = Math.max(0, d.enemyHp / d.enemyMaxHp * 100) + '%';
  if (hFill) hFill.style.width = Math.max(0, d.heroHp / d.heroMaxHp * 100) + '%';
  if (eNum)  eNum.textContent  = d.enemyHp + ' HP';
  if (hNum)  hNum.textContent  = `${d.heroHp} / ${d.heroMaxHp}`;

  setTimeout(() => {
    if (result.enemyDefeated) {
      const sr = RPG.dungeonStepResult(HERO, true);
      persist(); renderHUD();
      if (!sr) return;
      if (sr.done) showDungeonReward(sr.reward);
      else if (sr.pendingChoice) showDungeonChoice();
      else showDungeonEncounter();
    } else if (result.heroDefeated) {
      const sr = RPG.dungeonStepResult(HERO, false);
      persist(); renderHUD();
      showDungeonDefeat(sr ? sr.reward : { gold:0, xp:0, complete:false, stepsOk:0 });
    } else {
      const scenario = RPG.dungeonGetScenario(HERO);
      const scenEl = document.querySelector('.denc-scenario');
      const choicesEl = document.querySelector('.denc-choices');
      if (scenEl) scenEl.textContent = scenario.text;
      if (choicesEl) {
        choicesEl.innerHTML = scenario.choices.map((ch, i) =>
          `<button class="denc-choice" data-idx="${i}">
             <span class="denc-ch-icon">${ch.icon}</span>
             <span class="denc-ch-label">${esc(ch.label)}</span>
           </button>`
        ).join('');
        choicesEl.querySelectorAll('.denc-choice').forEach(btn => {
          btn.addEventListener('click', () => dungeonDoAction(+btn.dataset.idx));
        });
      }
      if (resEl) resEl.classList.add('hidden');
      if (fleeBtn) fleeBtn.disabled = false;
    }
  }, 1300);
}

function showDungeonChoice() {
  const d = HERO.activeDungeon;
  if (!d || !d.pendingChoice) return;
  const setIdx = Math.min(d.step - 1, RPG.DUNGEON_CHOICE_SETS.length - 1);
  const [optA, optB] = RPG.DUNGEON_CHOICE_SETS[setIdx];
  const nextEnemy = RPG.BESTIARY.find(b => b.id === d.enemies[d.step]);
  const isBossNext = d.step === d.enemies.length - 1;
  modal(`<div class="dungeon-choice">
    <h3 class="panel-title center">⚡ Un Bivio</h3>
    <p class="center small muted">Prima del prossimo scontro${isBossNext ? ' (il Boss!)' : ''}:</p>
    <div class="dungeon-choice-grid">
      <button class="dungeon-choice-btn" id="dc-a">
        <div class="dc-icon">${optA.icon}</div>
        <div class="dc-label">${optA.label}</div>
        <div class="dc-desc small muted">${optA.desc}</div>
      </button>
      <button class="dungeon-choice-btn" id="dc-b">
        <div class="dc-icon">${optB.icon}</div>
        <div class="dc-label">${optB.label}</div>
        <div class="dc-desc small muted">${optB.desc}</div>
      </button>
    </div>
    ${nextEnemy ? `<p class="center small muted" style="margin-top:12px">Prossimo: <b>${esc(nextEnemy.name)}</b></p>` : ''}
  </div>`);
  const apply = idx => {
    const res = RPG.dungeonMakeChoice(HERO, idx);
    if (res && res.option.effect === 'goldNow') {
      persist(); renderHUD();
      toast(`💰 +${res.option.val} monete trovate!`);
    } else {
      persist();
    }
    closeModal();
    showDungeonEncounter();
  };
  document.getElementById('dc-a').addEventListener('click', () => apply(0));
  document.getElementById('dc-b').addEventListener('click', () => apply(1));
}

function showDungeonReward(reward) {
  sfx('level');
  vibrate([100, 50, 100, 50, 200]);
  /* Consumabile bonus dal dungeon: 50% raro, 50% epico */
  const consBonus = RPG.dropConsumable(HERO, Math.random() < 0.5 ? 'raro' : 'epico');
  persist();
  let html = `<div class="dungeon-reward">
    <div class="dungeon-reward-star">⭐</div>
    <h3 class="panel-title center">SPEDIZIONE COMPLETATA!</h3>
    <div class="chest-res-row">
      <div class="chest-res-chip gold">🪙 ${reward.gold}</div>
      <div class="chest-res-chip xp">⭐ ${reward.xp} XP</div>
    </div>`;
  if (reward.item) {
    html += `<div class="dungeon-epic-label">Oggetto Epico Garantito</div>
      ${itemHtml(reward.item)}`;
  }
  if (consBonus) {
    html += `<p class="center small" style="margin-top:8px">💰 ${consBonus.icon} <b>${esc(consBonus.name)}</b> aggiunto alla Sacca!</p>`;
  }
  html += `<button class="btn btn-primary wide" onclick="closeModal(); setTab('train')">Fantastico!</button>
  </div>`;
  modal(html);
}

function showDungeonDefeat(reward) {
  sfx('defeat');
  modal(`<div class="dungeon-defeat">
    <div style="font-size:3rem;text-align:center">💀</div>
    <h3 class="panel-title center">Assalto Fallito</h3>
    <p class="center small">Hai combattuto bravamente ma il Covo ha avuto la meglio.</p>
    <div class="chest-res-row">
      <div class="chest-res-chip gold">🪙 ${reward.gold}</div>
      <div class="chest-res-chip xp">⭐ ${reward.xp} XP</div>
    </div>
    <p class="muted small center">Torna domani per un nuovo assalto.</p>
    <button class="btn btn-primary wide" onclick="closeModal(); setTab('train')">Tornerò più forte!</button>
  </div>`);
}


/* ═══════════════════════════════════════════════════════════════
   LA SCALATA DELL'EROE
   ═══════════════════════════════════════════════════════════════ */

function _dieFaceHTML(n, type) {
  const patterns = { 0: [], 1: ['mc'], 2: ['tr', 'bl'], 3: ['tr', 'mc', 'bl'], 4: ['tl', 'tr', 'bl', 'br'] };
  const icons = { atk: '⚔️', def: '🛡️', mag: '✨' };
  const inner = n === 0
    ? `<span class="df-icon">${icons[type] || ''}</span>`
    : (patterns[n] || []).map(p => `<span class="dp ${p}"></span>`).join('');
  return `<div class="die-face df-${type}${n === 0 ? ' df-empty' : ''}">${inner}</div>`;
}

function openScalata() {
  const active = HERO.activeScalata && !HERO.activeScalata.done;
  const can = RPG.canStartScalata(HERO);

  if (!can && !active) {
    const best = HERO.scalataRecord?.bestFloor || 0;
    const hasKey = (HERO.consumables?.chiave_scalata || 0) > 0;
    const keyBtn = hasKey
      ? `<button class="btn btn-secondary wide" style="margin-top:4px" onclick="
          const err = RPG.useConsumable(HERO, 'chiave_scalata');
          if (err) { toast(err); return; }
          persist(); closeModal(); openScalata();
        ">🗝️ Usa Chiave della Scalata</button>`
      : `<p class="center muted small" style="margin-top:4px">🗝️ Con una <b>Chiave della Scalata</b> potresti ritentare oggi.</p>`;
    modal(`<div class="sc-open">
      <div class="sc-open-banner">
        <div class="sc-open-tower">🗼</div>
        <div class="sc-open-title">LA SCALATA DELL'EROE</div>
        <div class="sc-open-sub">Hai già affrontato la Scalata oggi.<br>Torna domani per scalare di nuovo.</div>
      </div>
      ${best > 0 ? `<div class="sc-open-records">
        <div class="sc-open-rec">
          <div class="sc-open-rec-val">${best}</div>
          <div class="sc-open-rec-lbl">Record piano</div>
        </div>
        <div class="sc-open-rec">
          <div class="sc-open-rec-val">—</div>
          <div class="sc-open-rec-lbl">Torna domani</div>
        </div>
      </div>` : ''}
      ${keyBtn}
      <button class="btn btn-primary wide" onclick="closeModal()">Ok</button>
    </div>`);
    return;
  }

  if (active) {
    const s = HERO.activeScalata;
    if (s.interlude) { showScalataInterlude(); } else { showScalataFloor(); }
    return;
  }

  const best  = HERO.scalataRecord?.bestFloor || 0;
  const runs  = HERO.scalataRecord?.totalRuns || 0;
  modal(`<div class="sc-open">
    <div class="sc-open-banner">
      <div class="sc-open-tower">🗼</div>
      <div class="sc-open-title">LA SCALATA DELL'EROE</div>
      <div class="sc-open-sub">Scala piani infiniti finché cadi. Una chance al giorno.</div>
    </div>
    <div class="sc-open-records">
      <div class="sc-open-rec">
        <div class="sc-open-rec-val">${best || '—'}</div>
        <div class="sc-open-rec-lbl">Piano massimo</div>
      </div>
      <div class="sc-open-rec">
        <div class="sc-open-rec-val">${runs || '—'}</div>
        <div class="sc-open-rec-lbl">Run totali</div>
      </div>
    </div>
    <div class="sc-open-rules">
      <div class="sc-open-rule">⚔️ Alloca 4 dadi ogni round tra Attacco, Difesa e Magia</div>
      <div class="sc-open-rule">🛡️ Gli HP persistono tra un piano e l'altro</div>
      <div class="sc-open-rule">⭐ Ogni 5° piano incontra un Boss potente</div>
    </div>
    <button class="sc-enter-btn" id="btn-scalata-start">🗼 INIZIA LA SCALATA</button>
    <button class="btn wide" onclick="closeModal()">Forse dopo…</button>
  </div>`);
  document.getElementById('btn-scalata-start').addEventListener('click', () => {
    RPG.startScalata(HERO);
    persist();
    closeModal();
    showScalataFloor();
  });
}

function showScalataFloor() {
  const s = HERO.activeScalata;
  if (!s || s.done) return;
  s.roundNum = (s.roundNum || 0) + 1;

  const enemy  = RPG.BESTIARY.find(b => b.id === s.enemyId) || { name: 'Nemico Misterioso', id: '_', boss: false };
  const isBoss = s.isBoss;
  const eHpPct = Math.max(0, (s.enemyHp / s.enemyMaxHp) * 100);
  const hHpPct = Math.max(0, (s.heroHp / s.heroMaxHp) * 100);
  const hpCrit = s.heroHp / s.heroMaxHp < 0.3;
  const floorLbl = isBoss ? `⭐ BOSS · Piano ${s.floor}` : `Piano ${s.floor}`;
  const hasJolly = (s.jollyDice || 0) > 0;
  const poisonPending = s.heroPoison || 0;

  // Synergy availability
  const pet = HERO.pet;
  const petOk = pet && pet.hatched && !pet.sick && (pet.hunger || 0) >= 20 && (pet.mood || 0) >= 20;
  const virtue = petOk ? RPG.petDominantVirtue(HERO) : null;
  const today = new Date().toISOString().slice(0, 10);
  const synergyAvail = petOk && virtue && pet.lastSynergyDate !== today;
  const VIRTUE_ICONS = { coraggio: '⚔️', astuzia: '✨', lealta: '💚' };
  const VIRTUE_LABELS = { coraggio: 'Attacca', astuzia: 'Neutralizza', lealta: 'Cura' };
  const synergyBtnHtml = synergyAvail
    ? `<button class="sc-synergy-btn" id="sc-synergy">
        ${VIRTUE_ICONS[virtue]} ${esc(pet.name)} — ${VIRTUE_LABELS[virtue]}
        <span class="sc-synergy-badge">SINERGIA</span>
       </button>`
    : '';

  const MOVE_TELLS = {
    normal: { icon: '⚠', lbl: 'PROSSIMA MOSSA', cls: '',       text: `Attacca per <b>${s.enemyDmg}</b> danni` },
    double: { icon: '⚡', lbl: 'DOPPIO ATTACCO',  cls: 'double', text: `Attacco doppio: <b>${s.enemyDmg * 2}</b> danni totali!` },
    poison: { icon: '☠', lbl: 'ATTACCO VELENOSO', cls: 'poison', text: `<b>${s.enemyDmg}</b> danni + <b>veleno</b> al prossimo round` },
    guard:  { icon: '🛡', lbl: 'IN GUARDIA',       cls: 'guard',  text: `Blocca <b>20</b> dei tuoi danni di attacco` },
    rage:   { icon: '🔥', lbl: 'IN FURIA',         cls: 'rage',   text: `Se sopravvive guadagna <b>+15 ATK</b> permanenti!` },
  };
  const mv = MOVE_TELLS[s.enemyMoveType || 'normal'];

  const poisonBadge = poisonPending > 0
    ? ` <span class="sc-poison-badge">☠ −${poisonPending}</span>` : '';

  modal(`<div class="sc-floor">
    <div class="sc-floor-hdr">
      <div class="sc-floor-info">
        <div class="sc-floor-label${isBoss ? ' boss' : ''}">🗼 ${floorLbl}</div>
        <div class="sc-floor-round">ROUND ${s.roundNum}</div>
      </div>
      <div class="sc-hero-hp">
        <div class="sc-hero-hp-text${hpCrit ? ' crit' : ''}">❤️ ${s.heroHp}/${s.heroMaxHp}${poisonBadge}</div>
        <div class="sc-hero-hpbar"><div class="sc-hero-hpfill${hpCrit ? ' crit' : ''}" style="width:${hHpPct}%"></div></div>
      </div>
    </div>

    <div class="sc-enemy${isBoss ? ' boss' : ''}">
      <div class="sc-enemy-top">
        <div class="sc-enemy-emoji" id="sc-enem-ico">
          <img src="assets/bestiario/${esc(enemy.id)}.webp"
            style="height:50px;max-width:56px;object-fit:contain;"
            onerror="this.parentNode.textContent='${isBoss ? '👹' : '👺'}'">
        </div>
        <div class="sc-enemy-info">
          <div class="sc-enemy-name">${esc(enemy.name)}${isBoss ? `<span class="sc-boss-tag">BOSS</span>` : ''}</div>
          <div class="sc-enemy-zone">Piano ${s.floor}${isBoss ? ' · Boss' : ''}</div>
          <div class="sc-enemy-hprow">
            <div class="sc-enemy-hpbar"><div class="sc-enemy-hpfill" style="width:${eHpPct}%"></div></div>
            <div class="sc-enemy-hpnum">${s.enemyHp} / ${s.enemyMaxHp} PF</div>
          </div>
        </div>
      </div>
      <div class="sc-enemy-tells ${mv.cls}">
        <div class="sc-enemy-tells-lbl ${mv.cls}">${mv.icon} ${mv.lbl}</div>
        ${mv.text}
      </div>
    </div>

    <div class="sc-log hidden" id="sc-log"></div>
    ${synergyBtnHtml}

    <div id="sc-dice-section" class="sc-dice-section">
      <div class="sc-dice-label">ALLOCA I DADI · ROUND ${s.roundNum}</div>
      <div class="sc-dice-row">
        ${[0,1,2,3].map(i => `
          <div class="sc-die libero" data-idx="${i}" id="sc-die-${i}">
            <span class="sc-die-emoji" id="sc-die-em-${i}">?</span>
            <span class="sc-die-assign" id="sc-die-lbl-${i}">LIBERO</span>
          </div>`).join('')}
        ${hasJolly ? `
          <div class="sc-die jolly" id="sc-die-jolly">
            <span class="sc-die-emoji" id="sc-die-em-jolly">⚔️</span>
            <span class="sc-die-assign" id="sc-die-lbl-jolly">ATTACCO</span>
          </div>` : ''}
      </div>

      <div class="sc-buckets">
        <div class="sc-bucket atk">
          <div class="sc-bucket-icon">⚔️</div>
          <div class="sc-bucket-val" id="bkt-atk">—</div>
          <div class="sc-bucket-lbl">DANNO</div>
        </div>
        <div class="sc-bucket def">
          <div class="sc-bucket-icon">🛡️</div>
          <div class="sc-bucket-val" id="bkt-def">—</div>
          <div class="sc-bucket-lbl">BLOCCO</div>
        </div>
        <div class="sc-bucket mag">
          <div class="sc-bucket-icon">✨</div>
          <div class="sc-bucket-val" id="bkt-mag">—</div>
          <div class="sc-bucket-lbl">EFFETTO</div>
        </div>
      </div>

      <div class="sc-preview">
        <div class="sc-prev-item">
          <div class="sc-prev-label">Danno</div>
          <div class="sc-prev-val" id="prev-dmg">—</div>
        </div>
        <div class="sc-prev-item">
          <div class="sc-prev-label">Blocco</div>
          <div class="sc-prev-val" id="prev-blk">—</div>
        </div>
        <div class="sc-prev-item">
          <div class="sc-prev-label">Effetto</div>
          <div class="sc-prev-val" id="prev-eff">—</div>
        </div>
      </div>

      <div class="sc-net" id="sc-net">Assegna tutti i dadi per confermare</div>
      <button class="sc-confirm" id="sc-confirm" disabled>🎲 CONFERMA ALLOCAZIONE</button>
    </div>

    <button class="sc-retreat" id="sc-retreat">🏳️ Ritirati</button>
  </div>`);

  $('#modal-box').classList.add('scalata-dark-modal');

  if (synergyAvail) {
    document.getElementById('sc-synergy').addEventListener('click', () => {
      const result = RPG.usePetSynergy(HERO, 'scalata');
      persist();
      if (typeof result === 'string') { toast(result); return; }
      if (!result || !result.ok) return;

      const logEl = document.getElementById('sc-log');
      let msg = '';
      if (result.effect === 'attack') {
        msg = `${VIRTUE_ICONS.coraggio} ${esc(pet.name)} attacca per <b>−${result.dmg} HP</b>!`;
        if (result.enemyDefeated) msg += ' Nemico sconfitto!';
      } else if (result.effect === 'neutralize') {
        msg = `${VIRTUE_ICONS.astuzia} ${esc(pet.name)} studia il nemico — mossa forzata a Normale!`;
      } else if (result.effect === 'heal') {
        msg = `${VIRTUE_ICONS.lealta} ${esc(pet.name)} ti cura di <b>+${result.heal} HP</b>!`;
      }

      logEl.innerHTML = `<div class="sc-log-rows"><div class="sc-log-row" style="color:#e8c04c">${msg}</div></div>`;
      logEl.classList.remove('hidden');
      document.getElementById('sc-synergy').remove();

      sfx('coin');
      if (result.enemyDefeated) {
        setTimeout(() => { closeModal(); showScalataInterlude(); }, 1400);
      } else {
        setTimeout(() => { logEl.classList.add('hidden'); }, 2000);
      }
    });
  }

  const TYPES       = ['libero', 'atk', 'def', 'mag'];
  const TYPE_EMOJIS = { libero: '?', atk: '⚔️', def: '🛡️', mag: '✨' };
  const TYPE_LABELS = { libero: 'LIBERO', atk: 'ATTACCO', def: 'DIFESA', mag: 'MAGIA' };
  const ATK_TABLE   = RPG.SCALATA_ATK || [18, 38, 60, 85];
  const DEF_TABLE   = RPG.SCALATA_DEF || [20, 42, 65, 90];
  const diceState   = [0, 0, 0, 0];
  let jollyState    = 1; // jolly die: 1=ATK, 2=DEF, 3=MAG; no LIBERO state
  const enemyMove   = s.enemyMoveType || 'normal';

  function refreshUI() {
    const counts = { atk: 0, def: 0, mag: 0 };
    diceState.forEach(t => { if (t > 0) counts[TYPES[t]]++; });
    if (hasJolly) counts[TYPES[jollyState]]++;
    const allAssigned = diceState.every(t => t > 0); // jolly always assigned

    diceState.forEach((t, i) => {
      const die  = document.getElementById('sc-die-' + i);
      const em   = document.getElementById('sc-die-em-' + i);
      const lbl  = document.getElementById('sc-die-lbl-' + i);
      const typeName = TYPES[t];
      die.className = 'sc-die ' + typeName;
      em.textContent = TYPE_EMOJIS[typeName];
      lbl.textContent = TYPE_LABELS[typeName];
    });

    if (hasJolly) {
      const typeName = TYPES[jollyState];
      document.getElementById('sc-die-em-jolly').textContent = TYPE_EMOJIS[typeName];
      document.getElementById('sc-die-lbl-jolly').textContent = TYPE_LABELS[typeName];
    }

    const atkDmg = counts.atk > 0 ? ATK_TABLE[Math.min(counts.atk - 1, 3)] : 0;
    const defBlk = counts.def > 0 ? DEF_TABLE[Math.min(counts.def - 1, 3)] : 0;
    let magText = '—', magBlock = 0;
    if (counts.mag >= 3)       { magText = 'Stordisci!'; }
    else if (counts.mag >= 2)  { magText = '+22 veleno'; }
    else if (counts.mag === 1) { magText = '+10 blocco'; magBlock = 10; }

    document.getElementById('bkt-atk').textContent = counts.atk ? atkDmg + ' HP' : '—';
    document.getElementById('bkt-def').textContent = counts.def ? defBlk + ' HP' : '—';
    document.getElementById('bkt-mag').textContent = counts.mag ? magText : '—';
    document.getElementById('prev-dmg').textContent = counts.atk ? atkDmg : '—';
    document.getElementById('prev-blk').textContent = (counts.def || counts.mag === 1) ? (defBlk + magBlock) : '—';
    document.getElementById('prev-eff').textContent = counts.mag > 1 ? magText : '—';

    const totalBlock = defBlk + magBlock;
    const stunned    = counts.mag >= 3;
    const baseEnemyDmg = enemyMove === 'double' ? s.enemyDmg * 2 : s.enemyDmg;
    const netHit     = stunned ? 0 : Math.max(0, baseEnemyDmg - totalBlock);
    const netEl      = document.getElementById('sc-net');
    if (allAssigned) {
      if (stunned) {
        netEl.innerHTML = '✨ Nemico stordito — nessun danno subito!';
        netEl.className = 'sc-net safe';
      } else if (netHit === 0) {
        netEl.innerHTML = '🛡️ Blocco totale! Nessun danno subito.';
        netEl.className = 'sc-net safe';
      } else {
        netEl.innerHTML = `⚡ Danno previsto: <b>${netHit}</b> HP${enemyMove === 'double' ? ' <span style="opacity:.7">(doppio!)</span>' : ''}`;
        netEl.className = 'sc-net danger';
      }
    } else {
      netEl.innerHTML = 'Assegna tutti i dadi per confermare';
      netEl.className = 'sc-net';
    }
    document.getElementById('sc-confirm').disabled = !allAssigned;
  }

  document.querySelectorAll('.sc-die:not(.jolly)').forEach(die => {
    die.addEventListener('click', () => {
      const idx = parseInt(die.dataset.idx);
      diceState[idx] = (diceState[idx] + 1) % 4;
      refreshUI();
    });
  });

  if (hasJolly) {
    document.getElementById('sc-die-jolly').addEventListener('click', () => {
      jollyState = (jollyState % 3) + 1; // cycles 1→2→3→1
      refreshUI();
    });
  }

  document.getElementById('sc-confirm').addEventListener('click', () => {
    const counts = { atk: 0, def: 0, mag: 0 };
    diceState.forEach(t => { if (t > 0) counts[TYPES[t]]++; });
    if (hasJolly) counts[TYPES[jollyState]]++;

    const result = RPG.scalataResolveDice(HERO, counts);
    if (!result) return;
    persist();

    const logEl     = document.getElementById('sc-log');
    const diceEl    = document.getElementById('sc-dice-section');
    const retreatBtn = document.getElementById('sc-retreat');

    let html = '<div class="sc-log-rows">';
    if (result.poisonDmg > 0)
      html += `<div class="sc-log-row" style="color:#c060e0">☠ Veleno: <b>−${result.poisonDmg} HP</b> da avvelenamento</div>`;
    if (result.heroDmg > 0)
      html += `<div class="sc-log-row">⚔️ Attacco: <b>−${result.heroDmg} HP</b> al nemico${result.wasGuarded ? ' <span style="opacity:.6">(guardia −20)</span>' : ''}</div>`;
    if (result.magEffect === 'stun')
      html += `<div class="sc-log-row" style="color:#b09fe8">✨ Stordisci! Il nemico non attacca.</div>`;
    else if (result.magEffect === 'poison')
      html += `<div class="sc-log-row" style="color:#b09fe8">✨ Veleno: <b>−${result.magExtra} HP</b> extra al nemico</div>`;
    else if (result.magEffect === 'weaken')
      html += `<div class="sc-log-row" style="color:#b09fe8">✨ Debolezza: +10 blocco aggiunto</div>`;
    if (result.wasDouble && result.magEffect !== 'stun')
      html += `<div class="sc-log-row" style="color:#ff6b5b;font-size:.76rem">⚡ Doppio attacco nemico!</div>`;
    if (result.enemyHit > 0)
      html += `<div class="sc-log-row" style="color:#e87070">🗡️ Nemico: <b>−${result.enemyHit} HP</b> a te</div>`;
    else if (!result.heroDefeated && result.magEffect !== 'stun')
      html += `<div class="sc-log-row" style="color:#6bb8d4">🛡️ Blocco totale! Nessun danno subito.</div>`;
    if (result.enemyDefeated && !result.heroDefeated)
      html += `<div class="sc-log-row" style="color:#e8b64c;font-weight:700">✅ Piano superato! +${result.goldGained}🪙 +${result.xpGained}⭐</div>`;
    html += '</div>';

    logEl.innerHTML = html;
    logEl.classList.remove('hidden');
    diceEl.classList.add('hidden');
    if (retreatBtn) retreatBtn.classList.add('hidden');

    if (result.heroDefeated) {
      logEl.insertAdjacentHTML('beforeend', '<div class="sc-log-row" style="color:#e84545;font-weight:700;text-align:center">💀 Sei caduto!</div>');
      sfx('defeat');
      setTimeout(() => { closeModal(); showScalataEnd(); }, 2000);
    } else if (result.enemyDefeated) {
      sfx('win');
      setTimeout(() => { closeModal(); showScalataInterlude(); }, 1800);
    } else {
      setTimeout(() => { closeModal(); showScalataFloor(); }, 1500);
    }
  });

  document.getElementById('sc-retreat').addEventListener('click', () => {
    RPG.scalataGiveUp(HERO);
    persist();
    closeModal();
    showScalataEnd();
  });
}

function showScalataInterlude() {
  const s = HERO.activeScalata;
  if (!s || s.done || !s.interlude) return;

  const nextFloor   = s.floor + 1;
  const isBossNext  = nextFloor % 5 === 0;
  const isShop      = s.floor % 3 === 0;
  const hHpPct      = Math.max(0, (s.heroHp / s.heroMaxHp) * 100);
  const hpCrit      = s.heroHp / s.heroMaxHp < 0.3;
  const goldPrize   = Math.round(20 + s.floor * 3);
  const surpriseDmg = Math.round(20 + s.floor * 2);
  const dmgDealt    = s.lastDmgDealt || 0;
  const blkDealt    = s.lastBlkDealt || 0;
  const effLabel    = s.lastEffect   || '—';

  const choicesOrShop = isShop ? `
    <div class="sc-int-choices-label">🏪 NEGOZIO DEL PIANO</div>
    <div class="sc-shop-gold">Oro: <b id="shop-gold-display">${HERO.gold}🪙</b></div>
    <div class="sc-shop-items">
      <div class="sc-shop-item" id="shop-pozione">
        <span class="sc-shop-item-icon">🧪</span>
        <div class="sc-shop-item-body">
          <div class="sc-shop-item-name">Pozione</div>
          <div class="sc-shop-item-desc">+35 HP istantanei</div>
        </div>
        <button class="sc-shop-buy" data-item="pozione" data-cost="20">20🪙</button>
      </div>
      <div class="sc-shop-item" id="shop-scudo">
        <span class="sc-shop-item-icon">🛡️</span>
        <div class="sc-shop-item-body">
          <div class="sc-shop-item-name">Scudo Rinforzato</div>
          <div class="sc-shop-item-desc">+20 blocco al prossimo round</div>
        </div>
        <button class="sc-shop-buy" data-item="scudo" data-cost="25">25🪙</button>
      </div>
      <div class="sc-shop-item" id="shop-jolly">
        <span class="sc-shop-item-icon">🎲</span>
        <div class="sc-shop-item-body">
          <div class="sc-shop-item-name">Dado Jolly</div>
          <div class="sc-shop-item-desc">5° dado jolly (ATK/DEF/MAG) per 1 round</div>
        </div>
        <button class="sc-shop-buy" data-item="jolly" data-cost="30">30🪙</button>
      </div>
      <div class="sc-shop-item" id="shop-elisir">
        <span class="sc-shop-item-icon">⚗️</span>
        <div class="sc-shop-item-body">
          <div class="sc-shop-item-name">Elisir Vitale</div>
          <div class="sc-shop-item-desc">+20 HP massimi e +20 HP subito</div>
        </div>
        <button class="sc-shop-buy" data-item="elisir" data-cost="45">45🪙</button>
      </div>
    </div>
    <button class="sc-shop-continue" id="int-continue">▶ Continua al Piano ${nextFloor}</button>
  ` : `
    <div class="sc-int-choices-label">SCEGLI UN VANTAGGIO</div>
    <div class="sc-int-choices">
      <button class="sc-int-choice heal" id="int-heal">
        <span class="sc-int-choice-icon">💚</span>
        <div class="sc-int-choice-body">
          <div class="sc-int-choice-name">Riposa</div>
          <div class="sc-int-choice-desc">Recupera fino a +30 HP</div>
        </div>
        <span class="sc-int-choice-badge">CURA</span>
      </button>
      <button class="sc-int-choice attack" id="int-surprise">
        <span class="sc-int-choice-icon">🗡️</span>
        <div class="sc-int-choice-body">
          <div class="sc-int-choice-name">Attacco a sorpresa</div>
          <div class="sc-int-choice-desc">Infliggi −${surpriseDmg} HP al prossimo nemico</div>
        </div>
        <span class="sc-int-choice-badge">ATTACCA</span>
      </button>
      <button class="sc-int-choice scout" id="int-gold">
        <span class="sc-int-choice-icon">🪙</span>
        <div class="sc-int-choice-body">
          <div class="sc-int-choice-name">Saccheggia</div>
          <div class="sc-int-choice-desc">+${goldPrize} monete d'oro</div>
        </div>
        <span class="sc-int-choice-badge">ORO</span>
      </button>
    </div>
  `;

  modal(`<div class="sc-int">
    <div class="sc-int-banner">
      <div class="sc-int-check">${isShop ? '🏪' : '✅'}</div>
      <div class="sc-int-title">${isShop ? 'Negozio Itinerante!' : `Piano ${s.floor} Superato!`}</div>
      <div class="sc-int-next${isBossNext ? ' boss' : ''}">
        ${isBossNext ? `⭐ Piano ${nextFloor} — BOSS in arrivo!` : `Piano ${nextFloor} ti aspetta.`}
      </div>
    </div>

    <div class="sc-int-stats">
      <div class="sc-int-stat">
        <div class="sc-int-stat-val">${dmgDealt || '—'}</div>
        <div class="sc-int-stat-lbl">Danno inflitto</div>
      </div>
      <div class="sc-int-stat">
        <div class="sc-int-stat-val">${blkDealt || '—'}</div>
        <div class="sc-int-stat-lbl">Blocco</div>
      </div>
      <div class="sc-int-stat">
        <div class="sc-int-stat-val">${effLabel}</div>
        <div class="sc-int-stat-lbl">Effetto</div>
      </div>
    </div>

    <div class="sc-int-hp">
      <div class="sc-int-hp-row">
        <span class="sc-int-hp-val${hpCrit ? ' crit' : ''}" id="int-hp-val">❤️ ${s.heroHp} / ${s.heroMaxHp} HP</span>
        <span class="sc-int-hp-note" id="int-hp-pct">${Math.round(hHpPct)}%</span>
      </div>
      <div class="sc-int-hpbar"><div class="sc-int-hpfill${hpCrit ? ' crit' : ''}" id="int-hp-fill" style="width:${hHpPct}%"></div></div>
    </div>

    ${choicesOrShop}
  </div>`);

  $('#modal-box').classList.add('scalata-dark-modal');

  if (isShop) {
    function updateShopUI() {
      document.getElementById('shop-gold-display').textContent = HERO.gold + '🪙';
      document.querySelectorAll('.sc-shop-buy').forEach(btn => {
        const cost = parseInt(btn.dataset.cost);
        btn.disabled = HERO.gold < cost;
        btn.style.opacity = HERO.gold < cost ? '0.4' : '';
      });
      const hpPct = Math.max(0, (s.heroHp / s.heroMaxHp) * 100);
      document.getElementById('int-hp-val').textContent = `❤️ ${s.heroHp} / ${s.heroMaxHp} HP`;
      document.getElementById('int-hp-pct').textContent = Math.round(hpPct) + '%';
      document.getElementById('int-hp-fill').style.width = hpPct + '%';
    }
    updateShopUI();

    document.querySelectorAll('.sc-shop-buy').forEach(btn => {
      btn.addEventListener('click', () => {
        const err = RPG.scalataShopBuy(HERO, btn.dataset.item);
        if (err) { toast(err); return; }
        persist();
        updateShopUI();
      });
    });

    document.getElementById('int-continue').addEventListener('click', () => {
      RPG.scalataAdvanceFloor(HERO, 'none');
      persist();
      closeModal();
      showScalataFloor();
    });
  } else {
    function pick(choice) {
      RPG.scalataAdvanceFloor(HERO, choice);
      persist();
      closeModal();
      showScalataFloor();
    }
    document.getElementById('int-heal').addEventListener('click',     () => pick('heal'));
    document.getElementById('int-surprise').addEventListener('click', () => pick('surprise'));
    document.getElementById('int-gold').addEventListener('click',     () => pick('gold'));
  }
}

function showScalataEnd() {
  const s = HERO.activeScalata;
  if (!s) return;

  const floor     = s.floor;
  const defeated  = s.heroHp <= 0;
  const prevBest  = s.prevBest || 0;
  const newRec    = floor > prevBest;
  const lastEnemy = defeated
    ? (RPG.BESTIARY.find(b => b.id === s.enemyId)?.name || 'Nemico Misterioso')
    : null;

  modal(`<div class="sc-end">
    <div class="sc-end-banner">
      <div class="sc-end-icon">${defeated ? '💀' : '🏳️'}</div>
      <div class="sc-end-floor-num">${floor}</div>
      <div class="sc-end-floor-lbl">Piano raggiunto</div>
      <div class="sc-end-defeated-by">${lastEnemy ? `Sconfitto da <b>${esc(lastEnemy)}</b>` : 'Ritirata strategica'}</div>
    </div>

    <div class="sc-end-grid">
      <div class="sc-end-stat">
        <div class="sc-end-stat-ico">🏔️</div>
        <div class="sc-end-stat-val">${floor}</div>
        <div class="sc-end-stat-lbl">Piano raggiunto</div>
      </div>
      <div class="sc-end-stat">
        <div class="sc-end-stat-ico">🪙</div>
        <div class="sc-end-stat-val">${s.goldEarned || 0}</div>
        <div class="sc-end-stat-lbl">Oro guadagnato</div>
      </div>
      <div class="sc-end-stat">
        <div class="sc-end-stat-ico">⭐</div>
        <div class="sc-end-stat-val">${s.xpEarned || 0}</div>
        <div class="sc-end-stat-lbl">XP guadagnati</div>
      </div>
      <div class="sc-end-stat">
        <div class="sc-end-stat-ico">⚔️</div>
        <div class="sc-end-stat-val">${s.kills || 0}</div>
        <div class="sc-end-stat-lbl">Nemici sconfitti</div>
      </div>
    </div>

    ${newRec
      ? `<div class="sc-end-record">🏆 Nuovo Record! Piano ${floor}</div>`
      : `<div class="scalata-record-note">🏆 Record: Piano ${HERO.scalataRecord?.bestFloor || floor}</div>`}

    <button class="btn btn-primary wide" onclick="closeModal(); setTab('train')">Fantastico!</button>
  </div>`);
}
