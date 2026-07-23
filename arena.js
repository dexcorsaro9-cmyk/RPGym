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
    persist();
    sfx('defeat');
    if (center) center.innerHTML = `<div class="battle-result-overlay"><div class="battle-result-text lose">SCONFITTA…</div></div>`;
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


/* ═══════════════════════════════════════════════════════════════
   SPEDIZIONE A TAPPE
   ═══════════════════════════════════════════════════════════════ */

function openDungeon() {
  if (!RPG.canStartDungeon(HERO)) {
    modal(`<h3 class="panel-title center">🗡️ Spedizione</h3>
      <p class="center muted">Hai già affrontato una Spedizione oggi.<br>Torna domani per la prossima.</p>
      <button class="btn btn-primary wide" onclick="closeModal()">Ok</button>`);
    return;
  }
  modal(`<div class="dungeon-intro">
    <div class="dungeon-intro-icon">🗡️</div>
    <h3 class="panel-title center">Spedizione a Tappe</h3>
    <p class="center small">Affronta <b>3 nemici</b> + un <b>Boss</b> in sequenza.<br>
    Tra gli scontri scegli come proseguire. Il boss lascia un oggetto <b>Epico</b> garantito.</p>
    <div class="dungeon-intro-rules">
      <div>📖 Scegli come affrontare ogni scontro</div>
      <div>💀 Se cadi, ottieni ricompense parziali</div>
      <div>🔒 Una Spedizione al giorno</div>
    </div>
    <button class="btn btn-primary wide big" id="btn-dungeon-start">🗡️ PARTI!</button>
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
  html += `<button class="btn btn-primary wide" onclick="closeModal(); setTab('train')">Fantastico!</button>
  </div>`;
  modal(html);
}

function showDungeonDefeat(reward) {
  sfx('defeat');
  modal(`<div class="dungeon-defeat">
    <div style="font-size:3rem;text-align:center">💀</div>
    <h3 class="panel-title center">Spedizione Fallita</h3>
    <p class="center small">Hai combattuto bravamente ma la Spedizione è terminata.</p>
    <div class="chest-res-row">
      <div class="chest-res-chip gold">🪙 ${reward.gold}</div>
      <div class="chest-res-chip xp">⭐ ${reward.xp} XP</div>
    </div>
    <p class="muted small center">Torna domani per una nuova Spedizione.</p>
    <button class="btn btn-primary wide" onclick="closeModal(); setTab('train')">Tornerò più forte!</button>
  </div>`);
}
