function renderTrain(c) {
  let chosen = 'camminata';

  // ── Sincronizzazione automatica nativa (HealthKit / Health Connect) ──
  const nhBanner = renderNativeHealthBanner(() => setTab('train'));
  if (nhBanner) c.appendChild(nhBanner);

  // ── Strip incolla-passi: sempre visibile, nessun popup ──
  const isAndroid = /android/i.test(navigator.userAgent);
  const syncStrip = el('div', 'step-sync-strip');
  const sssPlaceholder = isAndroid ? 'Tieni premuto → Incolla i tuoi passi reali' : 'Incolla o digita i passi…';
  syncStrip.innerHTML = `<span class="sss-label">⚡ Passi da Salute</span>
    <input class="sss-input" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="${sssPlaceholder}">`;
  const sssInput = syncStrip.querySelector('.sss-input');
  // readOnly rimosso: bloccava l'incolla su Android

  const applySssSteps = steps => {
    if (!(steps > 0)) return;
    const km = Math.round(steps * 0.00075 * 100) / 100;
    if (km < 0.05) { toast(`${steps} passi (${km} km) — troppo pochi.`); sssInput.value = ''; return; }
    const isFirst = (HERO.onboardingStep || 0) <= 1;
    const report = RPG.logHealthSync(HERO, chosen, km);
    sssInput.value = '';
    if (report) {
      if (isFirst) HERO.onboardingStep = 2;
      persist(); renderHUD(); FB.syncHero(HERO);
      if (HERO.guild && report.km > 0) FB.contributeToGuild(HERO, report.km).catch(() => {});
      showHealthSyncResult(report);
      if (isFirst) OPEN_QUEUE.push(showFirstWorkoutCelebration);
      checkMapNotify(); checkBoardNotify(); maybeSyncChallenge();
      updateTabOnboardingPulse();
    }
    else toast('Attività già sincronizzata per oggi.');
  };

  sssInput.addEventListener('paste', e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    const steps = parseInt(text.replace(/[^0-9]/g, ''), 10);
    applySssSteps(steps);
  });
  sssInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') applySssSteps(parseInt(sssInput.value, 10));
  });
  sssInput.addEventListener('input', () => {
    const steps = parseInt(sssInput.value, 10);
    if (steps > 0 && sssInput.value.length >= 4) setTimeout(() => applySssSteps(steps), 500);
  });
  if (!HERO.nativeHealthSync) c.appendChild(syncStrip);

  // Banner primo accesso — spiega come inserire i dati
  if (!HERO.nativeHealthSync && !HERO.trainTipDismissed) {
    const tip = el('div', 'train-first-tip');
    tip.innerHTML = `
      <button class="train-tip-close" id="train-tip-close">✕</button>
      <div class="train-tip-title">📲 Come registrare la tua attività</div>
      <div class="train-tip-row">
        <span class="train-tip-step">🍎</span>
        <div>
          <b>iPhone — Comando Rapido</b> <span class="train-tip-badge">più veloce</span><br>
          <span class="muted small">Scorri giù fino a <b>🔄 Importa da fitness → scheda iOS</b> e segui la guida per configurare il Comando Rapido una sola volta. Da quel momento basteranno 3 secondi.</span>
        </div>
      </div>
      <div class="train-tip-row">
        <span class="train-tip-step">🤖</span>
        <div>
          <b>Android — MacroDroid o Tasker</b><br>
          <span class="muted small">Scorri giù fino a <b>🔄 Importa da fitness → scheda Android</b> e scegli il metodo che preferisci per sincronizzare i passi automaticamente.</span>
        </div>
      </div>`;
    c.appendChild(tip);
    tip.querySelector('#train-tip-close').addEventListener('click', () => {
      HERO.trainTipDismissed = true;
      persist();
      tip.classList.add('tip-out');
      setTimeout(() => tip.remove(), 250);
    });
  }

  // ── Fiamma della Streak ──
  const sc = HERO.streak && HERO.streak.count || 0;
  if (sc >= 5) {
    const streakCap = 0.30;
    const bonusPct = Math.round(Math.min(streakCap, (sc - 1) * 0.05) * 100);
    const maxBonusPct = Math.round(streakCap * 100);
    const flamePct = Math.min(100, Math.round(bonusPct / maxBonusPct * 100));
    const flameEmoji = sc >= 30 ? '🩵' : sc >= 15 ? '🔥' : '🔥';
    const flameSize = sc >= 30 ? '2.8rem' : sc >= 15 ? '2.4rem' : '2rem';
    const flameCls = sc >= 30 ? 'streak-flame-l' : sc >= 15 ? 'streak-flame-m' : 'streak-flame-s';
    const sf = el('div', `panel streak-flame-panel ${flameCls}`);
    sf.innerHTML = `
      <div class="sf-header">
        <span class="sf-emoji" style="font-size:${flameSize}">${flameEmoji}</span>
        <div class="sf-info">
          <div class="sf-title">Striscia di ${sc} giorni</div>
          <div class="sf-bonus">+${bonusPct}% XP per ogni allenamento</div>
        </div>
      </div>
      <div class="sf-bar-wrap">
        <div class="sf-bar" style="width:${flamePct}%"></div>
      </div>
      <div class="sf-labels">
        <span class="muted small">+5%</span>
        <span class="muted small">Massimo +${maxBonusPct}%</span>
      </div>`;
    c.appendChild(sf);
  }

  // ── Buff consumabili attivi ──
  {
    const bff = HERO.consumableBuffs || {};
    const now = Date.now();
    const chips = [];
    const hLeft = ms => { const h = Math.round(ms / 3600000); return h <= 1 ? '< 1h' : `${h}h`; };
    if (bff.xpMult)       chips.push(`✨ +${Math.round(bff.xpMult.value * 100)}% XP · ancora ${bff.xpMult.sessions} ${bff.xpMult.sessions === 1 ? 'sessione' : 'sessioni'}`);
    if (bff.goldMult && bff.goldMult.expiresAt > now) chips.push(`💰 +${Math.round(bff.goldMult.value * 100)}% oro · scade in ${hLeft(bff.goldMult.expiresAt - now)}`);
    if (bff.allBoost && bff.allBoost.expiresAt > now) chips.push(`⚡ Tutti i bonus ×${1+bff.allBoost.value} · scade in ${hLeft(bff.allBoost.expiresAt - now)}`);
    if (bff.streakShield) chips.push(`🛡️ Streak protetta · ${bff.streakShield}gg rimasti`);
    if (bff.arenaShield)  chips.push(`⚔️ Scudo Arena · ${bff.arenaShield}gg rimasti`);
    if (bff.dropBoost && bff.dropBoost.expiresAt > now) chips.push(`🎁 +${Math.round(bff.dropBoost.value * 100)}% drop · scade in ${hLeft(bff.dropBoost.expiresAt - now)}`);
    if (chips.length) {
      const strip = el('div', 'buff-strip');
      chips.forEach(t => strip.appendChild(el('span', 'buff-chip', t)));
      c.appendChild(strip);
    }
  }

  // ── Consumabile rapido pre-allenamento ──
  {
    const owned = HERO.consumables || {};
    const quickCons = RPG.CONSUMABLES.filter(co => (owned[co.id] || 0) > 0);
    if (quickCons.length) {
      const qp = el('div', 'quick-cons-strip panel');
      qp.appendChild(el('div', 'quick-cons-label', ptIcon('assets/ui/train/potenzia.webp', 'Potenzia prima di allenarti', '💊')));
      const row = el('div', 'quick-cons-row');
      quickCons.forEach(co => {
        const btn = el('button', `quick-cons-btn rarity-${co.rarity}`, '');
        btn.title = `${co.name} (×${owned[co.id]}) — ${co.desc}`;
        const img = el('img', 'quick-cons-img');
        img.src = `assets/consumables/${encodeURIComponent(RPG.CONSUMABLE_IMG[co.id] || co.id)}.webp`;
        img.alt = co.name;
        img.addEventListener('error', () => { img.style.display = 'none'; btn.prepend(el('span', 'quick-cons-emoji', co.icon)); });
        const badge = el('span', 'quick-cons-badge', `×${owned[co.id]}`);
        const name = el('span', 'quick-cons-name', co.name);
        btn.appendChild(img);
        btn.appendChild(badge);
        btn.appendChild(name);
        btn.addEventListener('click', () => {
          const err = RPG.useConsumable(HERO, co.id);
          if (err) { toast(err); return; }
          persist(); renderHUD();
          toast(`${co.icon} ${co.name} usato! ${co.desc}`);
          setTab('train');
        });
        row.appendChild(btn);
      });
      qp.appendChild(row);
      c.appendChild(qp);
    }
  }

  // ── Live Workout (solo app nativa iOS) ───────────────────────────────────
  const WorkoutPlugin = window.Capacitor?.isNativePlatform() &&
    window.Capacitor?.getPlatform() === 'ios' &&
    window.Capacitor?.Plugins?.WorkoutPlugin;

  if (WorkoutPlugin) renderLiveWorkoutCard(c, WorkoutPlugin, () => chosen);

  c.appendChild(el('h2', 'section-title', '⚔️ Registra l\'Impresa'));

  // Daily goal progress bar
  const goalKm  = RPG.dailyGoalKm(HERO.level);
  const todayKm = HERO.log.filter(l => {
    const d = new Date(l.date); const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  }).reduce((s, l) => s + l.km, 0);
  const restExtra = HERO.restBonus ? ' <span class="km-bar-buff">✨ ×2 Riposo</span>' : '';
  const goalBar = kmBarEl(ptIcon('assets/ui/train/obiettivo.webp', 'Obiettivo di oggi', '🎯'), todayKm, goalKm, {
    color: 'gold',
    extra: restExtra,
    foot:  todayKm >= goalKm
      ? '✅ Obiettivo raggiunto! Continua per guadagnare più bottino.'
      : `Mancano <b>${(goalKm - todayKm).toFixed(1)} km</b> all\'obiettivo`,
  });
  goalBar.classList.add('train-daily-goal');
  c.appendChild(goalBar);

  const form = el('div', 'panel');
  form.appendChild(el('label', 'field-label', 'Tipo di attività'));
  const actRow = el('div', 'act-row');
  const ACT_ICON_FILES = { cyclette: 'assets/ui/act-cyclette.webp', camminata: 'assets/ui/act-camminata.webp', corsa: 'assets/ui/act-corsa.webp' };
  const mount = HERO.mount ? RPG.mountById(HERO.mount) : null;
  Object.entries(RPG.ACTIVITIES).forEach(([key, a]) => {
    const b = el('button', `act-choice act-${key}` + (key === chosen ? ' selected' : ''));
    const iconHolder = el('div', 'act-icon-holder', a.icon);
    if (ACT_ICON_FILES[key]) {
      const img = document.createElement('img');
      img.className = 'act-icon';
      img.addEventListener('load', () => { iconHolder.textContent = ''; iconHolder.appendChild(img); });
      img.src = ACT_ICON_FILES[key];
      if (img.complete && img.naturalWidth) { iconHolder.textContent = ''; iconHolder.appendChild(img); }
    }
    b.appendChild(iconHolder);
    b.appendChild(el('span', 'act-label', a.label));
    b.appendChild(el('span', 'act-xp-badge', `${a.xpPerKm} XP/km`));
    if (mount) b.appendChild(el('span', 'act-bonus-badge', `${mount.emoji} +${mount.bonus}% km`));
    b.dataset.key = key;
    b.addEventListener('click', () => {
      chosen = key;
      actRow.querySelectorAll('.act-choice').forEach(x => x.classList.toggle('selected', x.dataset.key === key));
    });
    actRow.appendChild(b);
  });
  form.appendChild(actRow);
  c.appendChild(form);

  // ── L'Arena dei Guerrieri ──
  const left = RPG.battlesLeft(HERO);
  const ap = el('div', 'arena-v2');

  // Pips HTML inline
  const SWORD_SVG = active =>
    `<div class="${active ? 'arena-pip active' : 'arena-pip used'}">
      <svg viewBox="0 0 14 38" width="14" height="38" xmlns="http://www.w3.org/2000/svg">
        <polygon points="7,1 5,7 9,7" fill="${active ? '#e8dba0' : 'rgba(200,200,200,.25)'}"/>
        <rect x="5.5" y="6" width="3" height="17" rx="0.5" fill="${active ? '#c8a840' : 'rgba(200,200,200,.2)'}"/>
        <rect x="0" y="20" width="14" height="3.5" rx="1" fill="${active ? '#8b6420' : 'rgba(200,200,200,.15)'}"/>
        <rect x="5.5" y="23.5" width="3" height="8" rx="1" fill="${active ? '#5a3012' : 'rgba(200,200,200,.15)'}"/>
        <circle cx="7" cy="34" r="3" fill="${active ? '#8b6420' : 'rgba(200,200,200,.2)'}"/>
      </svg>
    </div>`;
  const pipsHtml = Array.from({length: RPG.BATTLE_MAX_DAY}, (_, i) => SWORD_SVG(i < left)).join('');

  const actionHtml = left > 0
    ? `<div class="arena-avail-label">${left} sfid${left === 1 ? 'a disponibile' : 'e disponibili'}</div>
       <button class="btn arena-enter-btn wide big" id="btn-arena-enter">⚔️&ensp;ENTRA NELL'ARENA</button>`
    : `<div class="arena-exhausted">⌛&ensp;Sfide esaurite — torna domani</div>`;

  // Banner (immagine + overlay titolo + pips + azione)
  const bannerEl = el('div', 'arena-banner');
  bannerEl.innerHTML = `
    <img class="arena-banner-img" src="assets/arena/arena-banner.webp"
         onerror="this.style.display='none'">
    <div class="arena-banner-overlay">
      <div class="arena-banner-title">L'Arena dei Guerrieri</div>
      <div class="arena-banner-sub">Fendente · Parata · Incantesimo</div>
      <div class="arena-pips-row">${pipsHtml}</div>
      ${actionHtml}
    </div>`;
  ap.appendChild(bannerEl);
  if (left > 0) bannerEl.querySelector('#btn-arena-enter').addEventListener('click', openArena);

  /* Il Covo dell'Orda */
  const dungeonAvail = RPG.canStartDungeon(HERO);
  const dp = el('div', 'dungeon-card' + (dungeonAvail ? ' dc-covo' : ' dc-done'));
  dp.innerHTML = `
    <div class="dc-accent"></div>
    <div class="dc-icon">
      <img class="dc-img" src="assets/dungeons/covo.webp" alt=""
           onerror="this.style.display='none';this.nextElementSibling.style.display='inline'">
      <span class="dc-img-fallback">${dungeonAvail ? '🗡️' : '💀'}</span>
    </div>
    <div class="dc-body">
      <div class="dc-title">Il Covo dell'Orda</div>
      <div class="dc-sub">${dungeonAvail ? '3 nemici + Boss · Epico garantito' : 'Assalto completato · Torna domani'}</div>
    </div>
    <button class="dc-btn${dungeonAvail ? ' dc-btn-go' : ''}" id="btn-dungeon-open"${dungeonAvail ? '' : ' disabled'}>
      ${dungeonAvail ? '▶ Parti' : '✓ Fatto'}
    </button>`;
  if (dungeonAvail) dp.querySelector('#btn-dungeon-open').addEventListener('click', openDungeon);
  ap.appendChild(dp);

  /* La Scalata dell'Eroe */
  const scalataActive = HERO.activeScalata && !HERO.activeScalata.done;
  const scalataAvail  = RPG.canStartScalata(HERO);
  const scalataBest   = HERO.scalataRecord?.bestFloor || 0;
  const sp = el('div', 'dungeon-card' + (scalataAvail ? ' dc-scalata' : ' dc-done'));
  sp.innerHTML = `
    <div class="dc-accent"></div>
    <div class="dc-icon">
      <img class="dc-img" src="assets/scalata/torre.webp" alt=""
           onerror="this.style.display='none';this.nextElementSibling.style.display='inline'">
      <span class="dc-img-fallback">${scalataActive ? '⚡' : '🏔️'}</span>
    </div>
    <div class="dc-body">
      <div class="dc-title">La Scalata dell'Eroe</div>
      <div class="dc-sub">${
        scalataActive
          ? `In corso · Piano ${HERO.activeScalata.floor} · ${HERO.activeScalata.heroHp} HP`
          : scalataAvail
            ? `Piani infiniti · Boss ogni 5°${scalataBest > 0 ? ` · Record: ${scalataBest}` : ''}`
            : `Completata oggi · Record: ${scalataBest}`
      }</div>
    </div>
    <button class="dc-btn${scalataAvail ? ' dc-btn-go' : ''}" id="btn-scalata-open"${scalataAvail ? '' : ' disabled'}>
      ${scalataActive ? '▶ Riprendi' : scalataAvail ? '▶ Scala' : '✓ Fatto'}
    </button>`;
  if (scalataAvail) sp.querySelector('#btn-scalata-open').addEventListener('click', openScalata);
  ap.appendChild(sp);

  /* Extra Boss — Contratto dei Mostri */
  if (HERO.consumableBuffs && HERO.consumableBuffs.extraBoss) {
    const xbp = el('div', 'dungeon-strip extra-boss-strip');
    xbp.innerHTML = `<div class="dungeon-strip-left">
      <span class="dungeon-strip-icon">📋</span>
      <div>
        <div class="dungeon-strip-title">Boss Straordinario <span class="tag tag-boss" style="font-size:.65rem;vertical-align:middle">CONTRATTO</span></div>
        <div class="dungeon-strip-sub small muted">Il Contratto dei Mostri è attivo — sfida un boss extra!</div>
      </div>
    </div>
    <button class="btn btn-primary dungeon-strip-btn" id="btn-extra-boss">▶ Sfida</button>`;
    ap.appendChild(xbp);
    xbp.querySelector('#btn-extra-boss').addEventListener('click', () => {
      const bosses = RPG.BESTIARY.filter(b => b.boss && !b.final);
      const v = bosses[Math.floor(Math.random() * bosses.length)];
      if (!v) { toast('Nessun boss disponibile.'); return; }
      const fig = `<img class="arena-intro-img" src="assets/bestiario/${v.id}.webp" onerror="this.style.display='none'">`;
      modal(`<div class="arena-intro">
        <p class="center big-news">📋 Boss Straordinario!</p>
        ${fig}
        <h3 class="panel-title center">${v.name} <span class="tag tag-boss">BOSS</span></h3>
        <p class="center small muted">Debolezza: <b>${v.weakness}</b></p>
        <p class="center small">Il Contratto dei Mostri ti permette di sfidare questo boss fuori calendario. Vinci <b>3 round su 5</b>!</p>
        <button class="btn btn-primary wide big" id="btn-extra-boss-fight">🔥 COMBATTI!</button>
        <button class="btn wide" onclick="closeModal()">Rinuncia al contratto</button>
      </div>`);
      const fb = document.getElementById('btn-extra-boss-fight');
      if (fb) fb.addEventListener('click', () => {
        delete HERO.consumableBuffs.extraBoss;
        persist();
        beginBattle(v.id);
      });
    });
  }

  c.appendChild(ap);

  renderDailyChallenges(c);

  // ── Bacheca del Viandante — in fondo ──
  renderBacheca(c, todayKm);
}


/* ── Pannello Sincronizzazione Salute ── */
const SHORTCUT_NAME = "Hero's Pace";
const APP_BASE_URL   = 'https://dexcorsaro9-cmyk.github.io/RPGym/';

function renderShortcutPanel() {
  const p = el('div', 'panel shortcut-panel');

  // Titolo
  const titleRow = el('div', 'shortcut-title-row');
  titleRow.innerHTML = `<span class="shortcut-apple-icon">📱</span>
    <div><b>Sincronizzazione Salute</b>
    <div class="small muted">Importa i km direttamente dalla tua app fitness</div></div>`;
  p.appendChild(titleRow);

  // ── Sincronizzazione automatica nativa, se disponibile ──
  const nhBanner = renderNativeHealthBanner(() => { HERO_VIEW = 'settings'; setTab('hero'); });
  if (nhBanner) {
    p.appendChild(nhBanner);
    p.appendChild(el('p', 'muted small', 'In alternativa, o se non hai ancora attivato la sincronizzazione automatica, puoi importare i passi manualmente qui sotto:'));
  }

  // ── Tab iOS / Android ──
  const tabBar = el('div', 'sync-tab-bar');
  const tabIos = el('button', 'sync-tab active', '🍎 iOS');
  const tabAnd = el('button', 'sync-tab', '🤖 Android');
  tabBar.appendChild(tabIos);
  tabBar.appendChild(tabAnd);
  p.appendChild(tabBar);

  // ═══ PANNELLO iOS ═══
  const iosPane = el('div', 'sync-pane');

  const launchBtn = el('button', 'btn shortcut-launch-btn wide');
  launchBtn.innerHTML = `<span class="shortcut-icon">⚡</span> Lancia "Hero's Pace" (già configurato)`;
  launchBtn.addEventListener('click', () => {
    window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`;
  });
  iosPane.appendChild(launchBtn);

  const iosGuideToggle = el('button', 'shortcut-manual-toggle');
  iosGuideToggle.innerHTML = '📋 Come configurare il Comando Rapido <span>▼</span>';
  iosPane.appendChild(iosGuideToggle);

  const iosGuideBody = el('div', 'shortcut-manual-body collapsed');
  iosGuideBody.innerHTML = `
    <div class="shortcut-steps">
      <div class="shortcut-step"><span class="step-num">1</span>
        <div>Apri <b>Comandi Rapidi</b> → tocca <b>+</b> per creare un nuovo comando.</div></div>
      <div class="shortcut-step"><span class="step-num">2</span>
        <div>Aggiungi <b>"Trova campioni di salute"</b> → tipo: <b>Passi</b> → Data di inizio: <b>è oggi</b>.</div></div>
      <div class="shortcut-step"><span class="step-num">3</span>
        <div>Aggiungi <b>"Calcola statistiche"</b> → <i>Campioni di dati sanitari</i> → funzione: <b>Somma</b>.</div></div>
      <div class="shortcut-step"><span class="step-num">4</span>
        <div>Aggiungi <b>"Copia negli appunti"</b> → input: variabile <b>Somma</b> del passo 3.</div></div>
      <div class="shortcut-step"><span class="step-num">5</span>
        <div>Salva con nome <b>Hero's Pace</b>. Dopo averlo lanciato, apri l'app: incolla nel campo verde ⚡. Fatto!</div></div>
    </div>`;
  const openShortcuts = el('button', 'btn btn-small wide shortcut-open-app');
  openShortcuts.innerHTML = '📱 Apri Comandi Rapidi';
  openShortcuts.addEventListener('click', () => { window.location.href = 'shortcuts://'; });
  iosGuideBody.appendChild(openShortcuts);

  iosGuideToggle.addEventListener('click', () => {
    const open = !iosGuideBody.classList.contains('collapsed');
    iosGuideBody.classList.toggle('collapsed', open);
    iosGuideToggle.querySelector('span').textContent = open ? '▼' : '▲';
  });
  iosPane.appendChild(iosGuideBody);
  p.appendChild(iosPane);

  // ═══ PANNELLO ANDROID ═══
  const andPane = el('div', 'sync-pane hidden');

  // Metodo manuale
  const andManualToggle = el('button', 'shortcut-manual-toggle');
  andManualToggle.innerHTML = '👆 Metodo 1 — Copia & Incolla (tutti i dispositivi) <span>▼</span>';
  andPane.appendChild(andManualToggle);

  const andManualBody = el('div', 'shortcut-manual-body collapsed');
  andManualBody.innerHTML = `
    <div class="shortcut-steps">
      <div class="shortcut-step"><span class="step-num">1</span>
        <div>Apri <b>Google Fit</b>, <b>Samsung Health</b> o qualsiasi app fitness e guarda i passi di oggi.</div></div>
      <div class="shortcut-step"><span class="step-num">2</span>
        <div>Torna su Hero's Pace → schermata <b>Allenati</b>.</div></div>
      <div class="shortcut-step"><span class="step-num">3</span>
        <div>Digita i passi nel campo verde <b>⚡ Passi da Salute</b> e premi <b>Invio</b>. Il gioco calcola i km automaticamente.</div></div>
    </div>`;
  andManualToggle.addEventListener('click', () => {
    const open = !andManualBody.classList.contains('collapsed');
    andManualBody.classList.toggle('collapsed', open);
    andManualToggle.querySelector('span').textContent = open ? '▼' : '▲';
  });
  andPane.appendChild(andManualBody);

  // Metodo MacroDroid
  const andAutoToggle = el('button', 'shortcut-manual-toggle');
  andAutoToggle.innerHTML = '🤖 Metodo 2 — MacroDroid (automatico, gratis) <span>▼</span>';
  andPane.appendChild(andAutoToggle);

  const andAutoBody = el('div', 'shortcut-manual-body collapsed');
  andAutoBody.innerHTML = `
    <div class="shortcut-steps">
      <div class="shortcut-step"><span class="step-num">1</span>
        <div>Installa <b>MacroDroid</b> dal Play Store (gratuita).</div></div>
      <div class="shortcut-step"><span class="step-num">2</span>
        <div>Crea una nuova <b>Macro</b>: Trigger → <b>Ora del giorno</b> (es. ogni sera alle 21:00).</div></div>
      <div class="shortcut-step"><span class="step-num">3</span>
        <div>Azione → <b>Variabile</b> → leggi passi da <b>Health Connect</b> di oggi → salva in variabile <code>passi</code>.</div></div>
      <div class="shortcut-step"><span class="step-num">4</span>
        <div>Azione → <b>Apri URL</b>:<br><code style="font-size:.75rem;word-break:break-all">${APP_BASE_URL}?sync_steps=[passi]&sync_token=${getSyncToken()}</code><br><span class="muted" style="font-size:.7rem">Il token si trova in Impostazioni → 🔑 Token Sincronizzazione.</span></div></div>
      <div class="shortcut-step"><span class="step-num">5</span>
        <div>Salva la macro. Ogni sera alle 21 aprirà l'app e sincronizzerà i passi automaticamente.</div></div>
    </div>`;
  andAutoToggle.addEventListener('click', () => {
    const open = !andAutoBody.classList.contains('collapsed');
    andAutoBody.classList.toggle('collapsed', open);
    andAutoToggle.querySelector('span').textContent = open ? '▼' : '▲';
  });
  andPane.appendChild(andAutoBody);

  // Metodo Tasker
  const andTaskerToggle = el('button', 'shortcut-manual-toggle');
  andTaskerToggle.innerHTML = '⚙️ Metodo 3 — Tasker (avanzato, ~3€) <span>▼</span>';
  andPane.appendChild(andTaskerToggle);

  const andTaskerBody = el('div', 'shortcut-manual-body collapsed');
  andTaskerBody.innerHTML = `
    <div class="shortcut-steps">
      <div class="shortcut-step"><span class="step-num">1</span>
        <div>Installa <b>Tasker</b> dal Play Store.</div></div>
      <div class="shortcut-step"><span class="step-num">2</span>
        <div>Crea un nuovo <b>Task</b>: Azione → <b>Health Connect</b> → Leggi <b>Passi</b> di oggi → salva in <code>%passi</code>.</div></div>
      <div class="shortcut-step"><span class="step-num">3</span>
        <div>Aggiungi azione <b>"Apri URL"</b>:<br><code style="font-size:.75rem;word-break:break-all">${APP_BASE_URL}?sync_steps=%passi&sync_token=${getSyncToken()}</code><br><span class="muted" style="font-size:.7rem">Token in Impostazioni → 🔑 Token Sincronizzazione.</span></div></div>
      <div class="shortcut-step"><span class="step-num">4</span>
        <div>Crea un <b>Profilo</b> con trigger orario (es. 21:00) e collega il task. Oppure aggiungi un <b>widget</b> sul desktop per lanciarlo manualmente.</div></div>
    </div>`;
  andTaskerToggle.addEventListener('click', () => {
    const open = !andTaskerBody.classList.contains('collapsed');
    andTaskerBody.classList.toggle('collapsed', open);
    andTaskerToggle.querySelector('span').textContent = open ? '▼' : '▲';
  });
  andPane.appendChild(andTaskerBody);
  p.appendChild(andPane);

  // ── Logica tab switch ──
  tabIos.addEventListener('click', () => {
    tabIos.classList.add('active'); tabAnd.classList.remove('active');
    iosPane.classList.remove('hidden'); andPane.classList.add('hidden');
  });
  tabAnd.addEventListener('click', () => {
    tabAnd.classList.add('active'); tabIos.classList.remove('active');
    andPane.classList.remove('hidden'); iosPane.classList.add('hidden');
  });

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

function showLevelUp(newLevel) {
  const isMilestone = newLevel % 5 === 0;
  const isBigMilestone = newLevel % 10 === 0 || newLevel === 50 || newLevel === 100;
  vibrate(isBigMilestone ? [150, 60, 150, 60, 200] : [100, 50, 100]);
  const col = AVATAR_COLORS[HERO.storyId] || { glow: '#c9932e' };
  const glowColor = col.glow;
  const talent = RPG.talentOf(HERO);

  const ov = document.createElement('div');
  ov.className = 'lup-overlay' + (isBigMilestone ? ' lup-big-milestone' : isMilestone ? ' lup-milestone' : '');
  ov.style.setProperty('--lup-glow', glowColor);

  // Rings — more for milestones
  const ringCount = isBigMilestone ? 5 : isMilestone ? 4 : 3;
  for (let i = 0; i < ringCount; i++) {
    const r = document.createElement('div');
    r.className = 'lup-ring';
    ov.appendChild(r);
  }

  // Particles — more numerous for milestones
  const pCount = isBigMilestone ? 52 : isMilestone ? 38 : 28;
  Array.from({ length: pCount }, (_, i) => i * (360 / pCount)).forEach((deg, i) => {
    const p = document.createElement('div');
    p.className = 'lup-particle';
    const rad = deg * Math.PI / 180;
    const dist = 110 + Math.random() * (isBigMilestone ? 180 : 130);
    p.style.setProperty('--tx', Math.cos(rad) * dist + 'px');
    p.style.setProperty('--ty', Math.sin(rad) * dist + 'px');
    p.style.setProperty('--dur', (.8 + Math.random() * .7) + 's');
    p.style.setProperty('--delay', (Math.random() * .3) + 's');
    p.style.setProperty('--pc', i % 3 === 0 ? '#fff' : i % 3 === 1 ? glowColor : '#f07030');
    ov.appendChild(p);
  });

  // Avatar eroe
  if (HERO.avatar && HERO.avatar.startsWith('assets/')) {
    const avWrap = document.createElement('div');
    avWrap.className = 'lup-avatar';
    const avImg = document.createElement('img');
    avImg.src = HERO.avatar;
    avImg.className = 'lup-avatar-img';
    avWrap.appendChild(avImg);
    ov.appendChild(avWrap);
  }

  const badgeText = isBigMilestone ? '⚡ PIETRA MILIARE ⚡' : isMilestone ? '✦ Traguardo ✦' : '✦ Livello raggiunto ✦';
  ov.appendChild(Object.assign(document.createElement('div'), { className: 'lup-badge', textContent: badgeText }));
  ov.appendChild(Object.assign(document.createElement('div'), { className: 'lup-level', textContent: newLevel }));
  ov.appendChild(Object.assign(document.createElement('div'), { className: 'lup-title-text', textContent: RPG.heroTitle(newLevel) }));
  if (talent) {
    const td = document.createElement('div');
    td.className = 'lup-talent';
    td.textContent = `${talent.icon} ${talent.name}`;
    ov.appendChild(td);
  }
  ov.appendChild(Object.assign(document.createElement('div'), { className: 'lup-tap', textContent: '· tocca per continuare ·' }));

  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('lup-visible'));
  const dismiss = () => { ov.classList.add('lup-exit'); setTimeout(() => ov.remove(), 500); };
  const tid = setTimeout(dismiss, 3800);
  ov.addEventListener('click', () => { clearTimeout(tid); dismiss(); });
}


function showReport(r) {
  const a = RPG.ACTIVITIES[r.type];
  const xpNeed = RPG.xpForLevel(HERO.level);
  const xpPct = Math.min(100, Math.round(HERO.xp / xpNeed * 100));
  const leveled = r.levelsGained.length > 0;
  const newLevel = leveled ? r.levelsGained[r.levelsGained.length - 1] : HERO.level;

  // Rileva cambio bioma e prepara pergamena lore
  let pendingBiomeLore = null;
  if (leveled) {
    // i min level di ogni bioma (indice 0 = lv1, ma il bioma 0 non mostra pergamena)
    const BIOME_MINS = [1,5,11,16,21,26,31,36,41,46,51,56,61,66,71,76,81,86,91,95];
    r.levelsGained.forEach(lv => {
      const biomeIdx = BIOME_MINS.indexOf(lv);
      if (biomeIdx > 0 && !(HERO.biomesDiscovered || []).includes(biomeIdx)) {
        const biome = RPG.currentBiome(lv);
        pendingBiomeLore = { biomeIdx, biome, lore: RPG.BIOME_LORE[biomeIdx] };
        HERO.biomesDiscovered = HERO.biomesDiscovered || [];
        HERO.biomesDiscovered.push(biomeIdx);
        persist();
      }
    });
  }

  let html = `<div class="report-header">
    <div class="report-act-icon">${a.icon}</div>
    <div class="report-km-big">${r.km} km</div>
    <div class="report-act-label">${a.label}${r.restBonusUsed ? ' · <b class="report-bonus">x2 Riposo!</b>' : ''}</div>
  </div>`;

  html += `<div class="report-xp-wrap">
    <div class="report-xp-label">⭐ Esperienza · Liv. ${newLevel} — ${RPG.heroTitle(newLevel)}</div>
    <div class="report-xp-track">
      <div class="report-xp-fill" id="rpt-xp-fill"></div>
      <div class="report-xp-text"><span id="rpt-xp-num">0</span> / ${xpNeed} XP</div>
    </div>
  </div>`;

  html += `<div class="report-rewards">
    <div class="rpt-reward star"><span class="rpt-rew-val">+${r.xp}</span><span class="rpt-rew-label">XP</span></div>
    <div class="rpt-reward gold"><span class="rpt-rew-val">+${r.gold}</span><span class="rpt-rew-label">🪙</span></div>
    <div class="rpt-reward wood"><span class="rpt-rew-val">+${r.wood}</span><span class="rpt-rew-label">🌲</span></div>
    <div class="rpt-reward stone"><span class="rpt-rew-val">+${r.stone}</span><span class="rpt-rew-label">⛏️</span></div>
  </div>`;

  if (r.streakBonus)
    html += `<p class="report-streak-line">🔥 Streak <b>${HERO.streak.count} giorni</b> · <b>+${Math.round(r.streakBonus * 100)}% XP</b></p>`;
  if (r.weatherBonus)
    html += `<p class="report-streak-line">${r.weatherBonus.icon} ${r.weatherBonus.label} · <b>+${Math.round(r.weatherBonus.xpBonus * 100)}% XP</b></p>`;
  if (r.treasureUnlocked && r.treasureUnlocked.length)
    html += r.treasureUnlocked.map(t => `<p class="big-news small">🗺️ Tappa ${t.idx+1} sbloccata! Riscuoti al Rifugio.</p>`).join('');
  if (r.trophies && r.trophies.length) {
    r.trophies.forEach(t => {
      html += `<div class="trophy-unlock"><span class="trophy-unlock-icon">${t.icon}</span><div><b>Trofeo sbloccato: ${t.name}</b><br><span class="small muted">${t.desc}</span></div></div>`;
    });
    vibrate([200, 100, 200]);
  }
  if (r.bossProgress) {
    const bp = r.bossProgress;
    const bpct = Math.min(100, Math.round(bp.done / bp.total * 100));
    html += `<p class="boss-progress-line">${bp.boss.icon} <b>${esc(bp.boss.name)}</b> — ${bp.done.toFixed(1)} / ${bp.total} km (${bpct}%)</p>`;
  }
  if (r.bossDefeatedWeekly) {
    html += `<div class="big-news">⚔️ BOSS SCONFITTO: ${r.bossDefeatedWeekly.icon} ${esc(r.bossDefeatedWeekly.name)}!<br><span class="small">Torna al Rifugio per riscuotere il bottino.</span></div>`;
  }
  if (r.potionUsed) {
    const pot = RPG.DAILY_POTIONS.find(p => p.id === r.potionUsed);
    if (pot) html += `<p class="report-streak-line">${pot.icon} Pozione usata: <b>${esc(pot.name)}</b></p>`;
  }
  if (r.loreUnlocked && r.loreUnlocked.length) {
    r.loreUnlocked.forEach(f => {
      html += `<div class="lore-unlock"><span class="lore-unlock-icon">📖</span><b>${esc(f.title)}</b><br><span class="small muted">Leggi nel tab Eroe → Cronache di Oakhaven</span></div>`;
    });
  }
  if (leveled) {
    const ptsNow = HERO.skillPoints || 0;
    html += `<div class="report-levelup">🆙 LIVELLO ${newLevel}!<br><span class="small">${RPG.heroTitle(newLevel)}</span>${ptsNow > 0 ? `<br><span class="small">🌟 +1 punto abilità disponibile!</span>` : ''}</div>`;
    setTimeout(() => showLevelUp(newLevel), 350);
  }
  if (r.loot.length) {
    html += `<h4>🎒 Sacchi del Viaggiatore:</h4><div class="loot-list">`;
    r.loot.forEach(it => { html += itemHtml(it); });
    html += `</div>`;
  }
  if (r.tickets && r.tickets.length)
    html += `<p>🎟️ Hai trovato <b>${r.tickets.length} Biglietto${r.tickets.length > 1 ? ' Gratta e Vinci' : ' Gratta e Vinci'}</b>! Aprilo dalla tua Sacca.</p>`;
  if (r.fragments)
    html += `<p>🔍 Hai trovato <b>${r.fragments} Frammento/i di Memoria</b>!</p>`;
  if (r.sighting) {
    html += `<div class="sighting">
      <img class="sighting-img" src="assets/bestiario/${r.sighting.id}.webp" alt="">
      <div><b>👁️ Avvistamento!</b><br>${r.sighting.name}<br>
      <span class="small muted">Aggiunto al Bestiario</span></div>
    </div>`;
  }
  if (r.baitFound) {
    html += `<div class="bait-drop-notice">${r.baitFound.icon} <b>Hai trovato: ${esc(r.baitFound.name)}!</b><br><span class="small muted">Esca aggiunta alla Taverna delle Sfide → Pesca nel Fossato</span></div>`;
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
  if (r.mappaInfuocataProgress) {
    const mi = r.mappaInfuocataProgress;
    html += `<p>🗺️ Mappa Infuocata: ${mi.kmDone.toFixed(1)} / 10 km — continua!</p>`;
  }
  if (r.mappaInfuocataReady) {
    html += `<p class="big-news">🗺️ MAPPA INFUOCATA COMPLETATA! Reclama il tuo bottino nella Mappa.</p>`;
  }
  if (r.missionProgress) {
    const mp = r.missionProgress;
    html += `<p>🐎 Missione <b>${mp.mission.name}</b>: ${mp.done.toFixed(1)} / ${mp.mission.km} km.</p>`;
  }
  if (r.missionComplete) {
    html += `<p class="big-news">🏆 MISSIONE COMPLETATA: ${r.missionComplete.name}!</p>`;
    if (r.bossDefeated) {
      html += `<div class="sighting boss-defeated">
        <img class="sighting-img" src="assets/bestiario/${r.bossDefeated.id}.webp" alt="">
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
      <button class="chest-btn" id="btn-open-chest"><img src="assets/ui/chest-epic.webp" alt="scrigno"></button>
      <p class="small muted center">Tocca lo scrigno per aprirlo</p>
    </div>`;
  }
  if (navigator.share) {
    html += `<button class="btn wide" id="btn-share-rpt">📤 Condividi risultato</button>`;
  }

  // ── Lascio o Raddoppio ─────────────────────────────────────────────────
  const showLR = r.gold > 0 && !PENDING_CHEST;
  if (showLR) {
    html += `<div id="lr-section" class="lr-section">
      <div class="lr-header">
        <img class="lr-fiche-icon" src="assets/cartomante/fiche-del-fato.webp" onerror="this.style.display='none'">
        <span class="lr-title">🎴 Lascio o Raddoppio?</span>
      </div>
      <p class="muted small center">La Cartomante ti propone una sfida: metti a rischio i tuoi <b>${r.gold} 🪙</b> per raddoppiarli, oppure tienili.</p>
      <div id="lr-btns" class="lr-btns">
        <button class="btn wide lr-btn-safe" id="btn-lr-lascio">✋ Lascio (tengo ${r.gold} 🪙)</button>
        <button class="btn btn-primary wide lr-btn-risk" id="btn-lr-raddoppio">🎴 Raddoppio! (×2 o zero)</button>
      </div>
      <div id="lr-result" class="lr-result" style="display:none"></div>
    </div>`;
  }
  // ───────────────────────────────────────────────────────────────────────

  if (pendingBiomeLore) {
    html += `<button class="btn btn-primary wide" id="btn-report-close">📜 Continua il Viaggio</button>`;
  } else {
    html += `<button class="btn btn-primary wide" id="btn-report-close">Torna al Rifugio</button>`;
  }
  modal(html);

  // Aggancia il bottone chiudi dopo il render del modal
  setTimeout(() => {
    const btn = $('#btn-report-close');
    if (!btn) return;
    btn.addEventListener('click', () => {
      closeModal();
      nextOpening(); renderHUD(); setTab('camp');
      checkAndQueueLetters();
      if (pendingBiomeLore) {
        setTimeout(() => showBiomeParchment(pendingBiomeLore), 300);
      }
    });

    // ── L/R handlers ──────────────────────────────────────────────────
    const lrLascio    = $('#btn-lr-lascio');
    const lrRaddoppio = $('#btn-lr-raddoppio');
    if (lrLascio) {
      lrLascio.addEventListener('click', () => {
        document.getElementById('lr-btns').style.display   = 'none';
        document.getElementById('lr-result').style.display = '';
        document.getElementById('lr-result').innerHTML     =
          `<div class="lr-kept">✋ Saggio. Tieni i tuoi <b>${r.gold} 🪙</b>.</div>`;
      });
    }
    if (lrRaddoppio) {
      lrRaddoppio.addEventListener('click', () => {
        const res = RPG.lascioBet(HERO, r.gold, 'raddoppio');
        persist(); renderHUD();
        document.getElementById('lr-btns').style.display = 'none';
        const resultEl = document.getElementById('lr-result');
        resultEl.style.display = '';
        if (res.won) {
          resultEl.innerHTML = `<div class="lr-win">🎉 LA SORTE È CON TE! +${res.bonus} 🪙<br><span class="small">+5 🎴 Fiches del Fato guadagnate!</span></div>`;
          sfx('coin'); vibrate([100, 50, 200, 50, 300]);
        } else {
          resultEl.innerHTML = `<div class="lr-lose">💀 Il dado era contro di te. Perdi ${res.lost} 🪙.</div>`;
          vibrate([400]);
        }
      });
    }
    // ────────────────────────────────────────────────────────────────
  }, 50);

  // Animate XP bar
  const fill = $('#rpt-xp-fill');
  const numEl = $('#rpt-xp-num');
  if (fill && numEl) {
    const targetPct = xpPct;
    const targetXp = HERO.xp;
    setTimeout(() => {
      fill.style.width = targetPct + '%';
      const dur = 900;
      const start = performance.now();
      const tick = now => {
        const t = Math.min(1, (now - start) / dur);
        const ease = 1 - Math.pow(1 - t, 3);
        numEl.textContent = Math.round(ease * targetXp);
        if (t < 1) requestAnimationFrame(tick);
        else numEl.textContent = targetXp;
      };
      requestAnimationFrame(tick);
    }, 120);
  }

  const chestBtn = $('#btn-open-chest');
  if (chestBtn) chestBtn.addEventListener('click', openChest);

  const shareBtn = $('#btn-share-rpt');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      const streakTxt = HERO.streak.count > 1 ? ` 🔥 Streak ${HERO.streak.count} giorni!` : '';
      navigator.share({
        title: "Hero's Pace ⚔️",
        text: `Ho fatto ${r.km} km di ${a.label} e guadagnato +${r.xp} XP!${streakTxt} Lv.${newLevel} — ${RPG.heroTitle(newLevel)}`,
      }).catch(() => {});
    });
  }
}

function showBiomeParchment({ biome, biomeIdx, lore }) {
  const artifact = RPG.BIOME_ARTIFACTS[biomeIdx] || null;
  const artifactHtml = artifact ? `
    <div class="biome-parchment-artifact">
      <span class="bpa-icon">${artifact.icon}</span>
      <div class="bpa-text">
        <div class="bpa-label">Reliquia trovata</div>
        <div class="bpa-name">${esc(artifact.name)}</div>
        <div class="bpa-flavor">${esc(artifact.flavor)}</div>
      </div>
    </div>` : '';
  const ov = document.createElement('div');
  ov.className = 'biome-parchment-overlay';
  ov.innerHTML = `
    <div class="biome-parchment-scroll">
      <div class="biome-parchment-top-ornament">❧</div>
      <div class="biome-parchment-biome-icon">${biome.icon}</div>
      <div class="biome-parchment-subtitle">Nuovo territorio svelato</div>
      <h2 class="biome-parchment-name">${esc(biome.name)}</h2>
      <div class="biome-parchment-divider"></div>
      <div class="biome-parchment-chapter">${esc(lore.title)}</div>
      <p class="biome-parchment-text">${esc(lore.text)}</p>
      ${artifactHtml}
      <div class="biome-parchment-divider"></div>
      <button class="btn btn-primary biome-parchment-btn">Continua il Viaggio →</button>
      <div class="biome-parchment-bottom-ornament">❧</div>
    </div>`;
  document.body.appendChild(ov);
  sfx('level');
  requestAnimationFrame(() => ov.classList.add('biome-parchment-visible'));
  const dismiss = () => {
    ov.classList.add('biome-parchment-exit');
    setTimeout(() => ov.remove(), 500);
  };
  ov.querySelector('.biome-parchment-btn').addEventListener('click', dismiss);
}

function showWorldLetter(letter) {
  if (!letter) return;
  HERO.lettersReceived = HERO.lettersReceived || [];
  if (!HERO.lettersReceived.includes(letter.id)) {
    HERO.lettersReceived.push(letter.id);
    persist();
  }
  const bodyHtml = esc(letter.body).replace(/\n/g, '<br>');
  const ov = document.createElement('div');
  ov.className = 'world-letter-overlay';
  ov.innerHTML = `
    <div class="world-letter-card">
      <div class="wl-seal">${letter.icon}</div>
      <div class="wl-from">
        <span class="wl-sender">${esc(letter.sender)}</span>
        <span class="wl-role">${esc(letter.role)}</span>
      </div>
      <div class="wl-divider"></div>
      <h3 class="wl-title">${esc(letter.title)}</h3>
      <p class="wl-body">${bodyHtml}</p>
      <div class="wl-divider"></div>
      <button class="btn btn-primary wl-btn">Chiudi la lettera</button>
    </div>`;
  document.body.appendChild(ov);
  sfx('item');
  requestAnimationFrame(() => ov.classList.add('world-letter-visible'));
  ov.querySelector('.wl-btn').addEventListener('click', () => {
    ov.classList.add('world-letter-exit');
    setTimeout(() => ov.remove(), 400);
  });
}

function checkAndQueueLetters() {
  const pending = RPG.checkPendingLetters(HERO);
  pending.forEach(letter => {
    OPEN_QUEUE.push(() => showWorldLetter(letter));
  });
  const milestones = RPG.checkPendingMilestones(HERO);
  milestones.forEach(m => {
    OPEN_QUEUE.push(() => showMilestone(m));
  });
  if ((pending.length || milestones.length) && document.getElementById('modal').classList.contains('hidden')) {
    nextOpening();
  }
}

/* ── Milestone overlay ── */
const MILESTONE_TIER_COLOR = {
  bronzo:     { border:'#cd7f32', glow:'rgba(205,127,50,.55)', label:'BRONZO' },
  argento:    { border:'#c0c0c0', glow:'rgba(192,192,192,.5)', label:'ARGENTO' },
  oro:        { border:'#ffd700', glow:'rgba(255,215,0,.65)',  label:'ORO' },
  leggendario:{ border:'#e8b64c', glow:'rgba(232,182,76,.8)', label:'LEGGENDARIO' },
};

function showMilestone(m) {
  if (!m) return;
  HERO.milestonesReached = HERO.milestonesReached || [];
  if (HERO.milestonesReached.includes(m.id)) return;

  const tc = MILESTONE_TIER_COLOR[m.tier] || MILESTONE_TIER_COLOR.bronzo;
  const cons = m.reward.consumable ? RPG.consumableById(m.reward.consumable) : null;
  const sceneHtml = esc(m.scene).replace(/\n/g, '<br>');

  const rewardHtml = `
    <div class="ms-reward-row">
      ${m.reward.gold ? `<div class="ms-reward-chip gold">🪙 +${m.reward.gold}</div>` : ''}
      ${cons ? `<div class="ms-reward-chip item">${cons.icon} ${esc(cons.name)}</div>` : ''}
    </div>`;

  const ov = document.createElement('div');
  ov.className = 'milestone-overlay';
  ov.innerHTML = `
    <div class="milestone-card" style="--ms-border:${tc.border};--ms-glow:${tc.glow}">
      <div class="ms-tier-badge">${tc.label}</div>
      <div class="ms-icon">${m.icon}</div>
      <div class="ms-session-label">Sessione ${m.session}</div>
      <h3 class="ms-title">${esc(m.title)}</h3>
      <p class="ms-scene">${sceneHtml}</p>
      <div class="ms-divider"></div>
      ${rewardHtml}
      <button class="btn btn-primary ms-btn">⚔️ Riscuoti</button>
    </div>`;

  document.body.appendChild(ov);
  sfx('item');
  requestAnimationFrame(() => ov.classList.add('milestone-visible'));

  // Particles for oro/leggendario
  if (m.tier === 'oro' || m.tier === 'leggendario') {
    const cvs = document.createElement('canvas');
    cvs.className = 'ms-particles';
    cvs.width = window.innerWidth; cvs.height = window.innerHeight;
    ov.insertBefore(cvs, ov.firstChild);
    const ctx = cvs.getContext('2d');
    const PAL = m.tier === 'leggendario'
      ? ['#e8b64c','#fff3a0','#f0c050','#ffe080','#fff']
      : ['#ffd700','#fff','#ffe66d','#e8c533'];
    const parts = Array.from({ length: m.tier === 'leggendario' ? 80 : 50 }, () => ({
      x: Math.random() * cvs.width, y: cvs.height * (.3 + Math.random() * .5),
      vx: (Math.random() - .5) * 2.2, vy: -2 - Math.random() * 3,
      r: 2 + Math.random() * 3, a: 1, col: PAL[Math.floor(Math.random() * PAL.length)],
    }));
    let raf;
    const tick = () => {
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      parts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += .04; p.a -= .012;
        ctx.globalAlpha = Math.max(0, p.a);
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      });
      if (parts.some(p => p.a > 0)) raf = requestAnimationFrame(tick);
    };
    setTimeout(() => { raf = requestAnimationFrame(tick); }, 200);
    ov.addEventListener('click', () => cancelAnimationFrame(raf), { once: true });
  }

  ov.querySelector('.ms-btn').addEventListener('click', () => {
    HERO.milestonesReached.push(m.id);
    if (m.reward.gold) { HERO.gold += m.reward.gold; }
    if (cons) { RPG.addConsumable(HERO, cons.id); }
    persist(); renderHUD();
    toast(`${m.icon} Tappa ${m.session} completata!`);
    ov.classList.add('milestone-exit');
    setTimeout(() => ov.remove(), 400);
  });
}

function openChest() {
  if (!PENDING_CHEST) return;
  const { title, chest } = PENDING_CHEST;
  PENDING_CHEST = null;
  vibrate([80, 60, 80, 60, 200]);
  const btn = $('#btn-open-chest');
  if (btn) {
    btn.classList.add('opening');
    setTimeout(() => {
      btn.classList.add('cracking');
      setTimeout(() => revealChest(title, chest), 360);
    }, 680);
  } else {
    revealChest(title, chest);
  }
}

function revealChest(title, chest) {
  vibrate(300);
  sfx('chest');
  RPG.updateWeeklyProgress(HERO, 'chest', 1);
  const parts = [];
  if (chest.gold) parts.push(`<div class="chest-res-chip gold">🪙 ${chest.gold}</div>`);
  if (chest.wood) parts.push(`<div class="chest-res-chip wood">🌲 ${chest.wood}</div>`);
  if (chest.stone) parts.push(`<div class="chest-res-chip stone">⛏️ ${chest.stone}</div>`);
  let html = `<div class="chest-reveal-header">
    <div class="chest-burst-ring"></div>
    <h3 class="chest-reveal-title">🎁 "${esc(title)}"</h3>
  </div>`;
  if (parts.length) html += `<div class="chest-res-row">${parts.join('')}</div>`;
  html += `<div class="chest-loot-list">`;
  (chest.items || []).forEach((it, i) => {
    html += `<div class="loot-stagger" style="--di:${i}">${itemHtml(it)}</div>`;
  });
  let cardIdx = (chest.items || []).length;
  (chest.cards || []).forEach(cid => {
    const card = RPG.CARDS[cid];
    html += `<div class="loot-stagger" style="--di:${cardIdx++}"><div class="card-reveal rar-${card.rarity}">
      <div class="card-icon">${card.icon}</div>
      <b>${card.name}</b><br><span class="tag">${card.rarity}</span>
      <p class="small lore">${card.lore}</p>
    </div></div>`;
  });
  html += `</div>`;
  if (chest.ticket) {
    RPG.addTicket(HERO, chest.ticket);
    const tCfg = RPG.TICKET_TYPES[chest.ticket];
    html += `<div class="panel" style="margin-top:10px;text-align:center;background:rgba(180,140,20,0.08);border:1px solid rgba(200,160,30,0.25)">
      🎟️ <b>Biglietto ${esc(tCfg.name)} trovato!</b><br>
      <span class="muted small">Aprilo nel Borgo → Biglietti da Grattare</span>
    </div>`;
  }
  html += `<p class="small muted center" style="margin-top:12px">Gli oggetti sono nel tuo zaino: equipaggiali dal menu Eroe o vendili al Mercato.</p>
    <button class="btn btn-primary wide" onclick="closeModal(); setTab('hero')">Vai all'Equipaggiamento</button>
    <button class="btn wide" onclick="closeModal()">Chiudi</button>`;
  modal(html);
}

/* ═══════════════════════════════════════════════════════════════
   Live Workout Card — solo app nativa iOS (WorkoutPlugin Swift)
   ═══════════════════════════════════════════════════════════════ */
let _liveWorkoutListener = null;   // handle per rimuovere il listener al termine

function renderLiveWorkoutCard(c, Plugin, getActivity) {
  const card = el('div', 'panel live-workout-card');
  card.innerHTML = `
    <div class="lw-header">
      <span class="lw-icon">🏃</span>
      <div>
        <div class="lw-title">Allenamento dal Vivo</div>
        <div class="lw-sub muted small">GPS + Pedometro · salva su Apple Health</div>
      </div>
    </div>
    <div class="lw-stats" id="lw-stats" style="display:none">
      <div class="lw-stat"><span class="lw-stat-val" id="lw-km">0.00</span><span class="lw-stat-lbl">km</span></div>
      <div class="lw-stat"><span class="lw-stat-val" id="lw-time">0:00</span><span class="lw-stat-lbl">tempo</span></div>
      <div class="lw-stat"><span class="lw-stat-val" id="lw-pace">—</span><span class="lw-stat-lbl">min/km</span></div>
      <div class="lw-stat"><span class="lw-stat-val" id="lw-steps">0</span><span class="lw-stat-lbl">passi</span></div>
    </div>
    <div class="lw-actions" id="lw-actions">
      <button class="btn btn-primary wide" id="lw-start-btn">▶ Avvia Allenamento</button>
    </div>
    <div class="lw-msg muted small center" id="lw-msg"></div>`;

  c.appendChild(card);

  const statsDiv  = card.querySelector('#lw-stats');
  const actionsDiv = card.querySelector('#lw-actions');
  const msgDiv    = card.querySelector('#lw-msg');
  const startBtn  = card.querySelector('#lw-start-btn');

  let timerInterval = null;
  let workoutActive = false;

  const fmtTime = secs => {
    const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };
  const fmtPace = p => p > 0 ? `${Math.floor(p)}'${String(Math.round((p % 1) * 60)).padStart(2, '0')}"` : '—';

  const updateStats = data => {
    card.querySelector('#lw-km').textContent   = (data.distanceKm || 0).toFixed(2);
    card.querySelector('#lw-steps').textContent = data.steps || 0;
    card.querySelector('#lw-pace').textContent  = fmtPace(data.paceMinPerKm || 0);
    if (!timerInterval && data.elapsedSeconds > 0) {
      card.querySelector('#lw-time').textContent = fmtTime(data.elapsedSeconds);
    }
  };

  const startWorkout = async () => {
    msgDiv.textContent = 'Richiedo permessi…';
    try {
      await Plugin.requestPermissions();
    } catch (e) {
      msgDiv.textContent = 'Permesso negato. Attiva HealthKit nelle Impostazioni.';
      return;
    }

    const actMap = { camminata: 'walking', corsa: 'running', cyclette: 'cycling' };
    const actType = actMap[typeof getActivity === 'function' ? getActivity() : getActivity] || 'running';

    msgDiv.textContent = 'Avvio sessione…';
    try {
      const res = await Plugin.startWorkout({ activityType: actType });
      if (!res.started && !res.alreadyRunning) throw new Error('Avvio fallito');
    } catch (e) {
      msgDiv.textContent = `Errore: ${e.message}`;
      return;
    }

    workoutActive = true;
    msgDiv.textContent = '';
    statsDiv.style.display = 'grid';
    actionsDiv.innerHTML = `<button class="btn btn-danger wide" id="lw-stop-btn">⏹ Termina Allenamento</button>`;
    card.querySelector('#lw-stop-btn').addEventListener('click', stopWorkout);

    // Live updates dal plugin
    _liveWorkoutListener = await Plugin.addListener('liveUpdate', updateStats);

    // Timer locale come fallback visivo (il plugin aggiorna ogni ~2s)
    let elapsed = 0;
    timerInterval = setInterval(() => {
      elapsed++;
      card.querySelector('#lw-time').textContent = fmtTime(elapsed);
    }, 1000);
  };

  const stopWorkout = async () => {
    if (!workoutActive) return;
    actionsDiv.innerHTML = '<span class="muted small">Salvataggio…</span>';
    if (_liveWorkoutListener) { _liveWorkoutListener.remove(); _liveWorkoutListener = null; }
    clearInterval(timerInterval); timerInterval = null;

    let summary;
    try {
      summary = await Plugin.stopWorkout();
    } catch (e) {
      actionsDiv.innerHTML = `<span class="muted small">${e.message}</span>`;
      return;
    }

    workoutActive = false;
    statsDiv.style.display = 'none';
    actionsDiv.innerHTML = `<button class="btn btn-primary wide" id="lw-start-btn">▶ Avvia Allenamento</button>`;
    card.querySelector('#lw-start-btn').addEventListener('click', startWorkout);

    const km = Math.round((summary.distanceKm || 0) * 100) / 100;
    if (km < 0.05) { msgDiv.textContent = 'Troppo pochi km. Prova di nuovo.'; return; }
    msgDiv.textContent = summary.savedToHealth ? '✅ Salvato su Apple Health' : '';

    // Passa i dati al motore RPG
    const actMap = { camminata: 'walking', corsa: 'running', cyclette: 'cycling' };
    const activity = typeof getActivity === 'function' ? getActivity() : getActivity;
    const isFirst = (HERO.onboardingStep || 0) <= 1;
    const report = RPG.logWorkout(HERO, activity, km);
    if (report && !report.error) {
      if (isFirst) HERO.onboardingStep = 2;
      persist(); renderHUD(); FB.syncHero(HERO).catch(() => {});
      if (HERO.guild && report.km > 0) FB.contributeToGuild(HERO, report.km).catch(() => {});
      checkMapNotify(); checkBoardNotify(); maybeSyncChallenge(); updateTabOnboardingPulse();
      if (isFirst) OPEN_QUEUE.push(showFirstWorkoutCelebration);
      showReport(report);
    } else {
      msgDiv.textContent = report?.error === 'too_soon'
        ? 'Hai già registrato un\'attività di recente.'
        : 'Errore nella registrazione.';
    }
  };

  startBtn.addEventListener('click', startWorkout);
}

