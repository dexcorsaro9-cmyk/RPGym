/* ── TAB: Mercato ── */
let MARKET_VIEW = 'hub';
let NERO_FILTER = 'all';

/* ── Duello Carte — stato locale ── */
let DC_VIEW = 'collection'; // 'collection' | 'builder' | 'boss_select' | 'battle'
let DC_DECK = [];           // card IDs selezionate per il mazzo
let DC_BATTLE_STATE = null; // stato live della battaglia
let DC_SELECTED_ATTACKER = null; // iid della creatura attaccante selezionata

const ANTRO_SECTIONS = [
  { lv: 50,  key: 'antro_contratti', icon: '🐲', name: 'Carte dei Draghi',              desc: 'Colleziona e gioca con le 206 carte dei draghi leggendari.',  quote: '«Le carte non mentono. Ogni drago rivela il tuo destino.»' },
  { lv: 60,  key: 'antro_bestia',    icon: '🐉', name: 'Bestia Ancestrale',             desc: 'Un boss mensile che può essere abbattuto solo dai degni.',   quote: '«L\'Antica Belva non conosce pietà. Mostrami cosa sei fatto.»' },
  { lv: 61,  key: 'antro_prove',     icon: '⚔️', name: 'Le 10 Prove del Campione',      desc: 'Dieci sfide irripetibili (Lv 61–70). Completa tutte e 10 per ottenere trofei unici e forgiare il Gladius Aeternus, l\'arma dei Campioni.', quote: '«Non basta sopravvivere. Devi dimostrare di meritarlo.»' },
  { lv: 70,  key: 'antro_trofei',    icon: '🏆', name: 'Sala dei Trofei',               desc: 'I tuoi record e imprese incisi nella pietra eterna.',        quote: '«La pietra dimentica i nomi vili. Il tuo sarà l\'eccezione.»' },
  { lv: 80,  key: 'antro_forgia',    icon: '🔥', name: 'Forgia del Campione',           desc: 'Forgia equipaggiamento leggendario irripetibile.',           quote: '«Il ferro comune brucia. Solo l\'acciaio del sacrificio sopravvive.»' },
  { lv: 90,  key: 'antro_dungeon',   icon: '🌀', name: 'Dungeon Infinito',              desc: 'Abissi senza fondo che mettono alla prova l\'eterno.',       quote: '«Ogni gradino più in basso rivela una verità che pochissimi reggono.»' },
  { lv: 100, key: 'antro_leggenda',  icon: '👑', name: 'Sala della Leggenda',           desc: 'Il tuo nome inciso tra i Grandi del Reame per sempre.',      quote: '«Cento livelli. Centinaia di chilometri. Un solo nome: il tuo.»' },
];

function renderMarket(c) {
  try {
  if (MARKET_VIEW === 'taverna')     { renderTavernaView(c);     return; }
  if (MARKET_VIEW === 'bisca')       { renderBiscaView(c);       return; }
  if (MARKET_VIEW === 'stalla')      { renderStallaView(c);      return; }
  if (MARKET_VIEW === 'nero')        { renderNeroView(c);        return; }
  if (MARKET_VIEW === 'fucina')      { renderFucinaView(c);      return; }
  if (MARKET_VIEW === 'erborista')   { renderErboristaView(c);   return; }
  if (MARKET_VIEW === 'cartomante')  { renderCartomanteView(c);  return; }
  if (MARKET_VIEW === 'ruota')       { renderRuotaView(c);       return; }
  if (MARKET_VIEW === 'pozzo')       { renderPozzoView(c);       return; }
  if (MARKET_VIEW === 'catena')      { renderCatenaView(c);      return; }
  if (MARKET_VIEW === 'casse')       { renderCasseView(c);       return; }
  if (MARKET_VIEW === 'antro' || MARKET_VIEW.startsWith('antro_')) { renderAntroView(c); return; }

  /* Step 2: dopo il 1° workout → invita all'Arena */
  renderOnboardingBanner(c, {
    step: 2, icon: '⚔️',
    title: 'È ora di combattere!',
    desc: 'Hai completato il tuo primo allenamento. Ora sfida un villain nell\'Arena — ogni vittoria porta oro e oggetti rari.',
    actionLabel: 'Vai all\'Arena',
    onAction: () => { advanceOnboarding(2); MARKET_VIEW = 'antro'; setTab('market'); }
  });

  /* Step 16: dopo Pass Stagionale → scopri la Fucina */
  renderOnboardingBanner(c, {
    step: 16, icon: '⚒️',
    title: 'Potenzia il tuo arsenale!',
    desc: 'Nella Fucina puoi migliorare gli oggetti equipaggiati spendendo oro e risorse. Trasforma un\'arma rara in qualcosa di leggendario.',
    actionLabel: 'Vai alla Fucina',
    onAction: () => { advanceOnboarding(16); MARKET_VIEW = 'fucina'; setTab('market'); }
  });

  const marketTitle = el('h2', 'section-title', '🏘️ Il Borgo');
  c.appendChild(marketTitle);
  const marketIcon = new Image();
  marketIcon.onload = () => { marketTitle.innerHTML = `<img class="title-icon" src="assets/ui/tab-mercato.webp"> Il Borgo`; };
  marketIcon.src = 'assets/ui/tab-mercato.webp';

  // ── Biglietti Gratta & Vinci ──
  {
    const tickets = RPG.getUnscratchedTickets(HERO);
    if (tickets.length > 0) {
      const tp = el('div', 'panel panel-featured');
      tp.appendChild(el('h3', 'panel-title', '🎟️ Biglietti da Grattare'));
      tp.appendChild(el('p', 'muted small center', `Hai ${tickets.length} biglietto${tickets.length > 1 ? '/i' : ''} non raschiato${tickets.length > 1 ? '/i' : ''} — premi su uno per scoprire il premio!`));
      const tGrid = el('div', 'ticket-grid');
      tickets.forEach(ticket => {
        const cfg = RPG.TICKET_TYPES[ticket.type];
        const card = el('div', `ticket-card ticket-${ticket.type}`);
        const img = el('img', 'ticket-thumb');
        img.src = cfg.img;
        img.alt = cfg.name;
        card.appendChild(img);
        card.appendChild(el('div', 'ticket-label', cfg.name));
        const btn = el('button', 'btn btn-primary btn-small', '✨ Gratta!');
        btn.addEventListener('click', () => showScratchCard(ticket), { once: true });
        card.appendChild(btn);
        tGrid.appendChild(card);
      });
      tp.appendChild(tGrid);
      c.appendChild(tp);
    }

  }

  // ── Mercante Fuggiasco ──
  const fm = RPG.getFugitiveMerchant(HERO);
  if (fm) {
    const kmToday = RPG.todayKm(HERO);
    const kmLeft = Math.max(0, fm.kmRequired - kmToday);
    const reached = kmLeft <= 0;
    const fp = el('div', 'panel panel-featured fugitive-merchant-panel');
    fp.innerHTML = `
      <h3 class="panel-title">${ptIcon('assets/ui/borgo/mercante-fuggiasco.webp', 'Mercante Fuggiasco!', '🏃')}</h3>
      <div class="fm-subtitle">Sparisce a mezzanotte · <b class="cd-hot"><span data-cd="midnight">…</span></b></div>
      <div class="fm-item">${itemHtml(fm.item)}</div>
      <div class="fm-prices">
        <span class="fm-price-full">🪙 ${fm.fullPrice}</span>
        <span class="fm-price-sale">🪙 ${fm.price}</span>
        <span class="fm-discount">–80%</span>
      </div>`;
    if (fm.bought) {
      fp.appendChild(el('div', 'done-strip', `✅ <b>Acquistato!</b> Il mercante è stato raggiunto.`));
    } else if (reached) {
      const buyBtn = el('button', 'btn btn-primary wide', `🤝 Acquista · 🪙 ${fm.price}`);
      buyBtn.disabled = HERO.gold < fm.price;
      buyBtn.addEventListener('click', () => {
        const err = RPG.buyFromFugitiveMerchant(HERO);
        if (err) { toast(err); return; }
        persist(); renderHUD();
        vibrate([120, 40, 180]);
        sfx('coin');
        modal(`<h3 class="panel-title">🤝 Affare Concluso!</h3>
          <p class="center">Hai raggiunto il mercante fuggiasco a tempo!</p>
          <div class="loot-list" style="margin:.5rem 0">${itemHtml(fm.item)}</div>
          <button class="btn btn-primary wide" onclick="closeModal();setTab('market')">Ottimo!</button>`);
        setTab('market');
      });
      fp.appendChild(buyBtn);
    } else {
      const prog = el('div', 'membar');
      prog.innerHTML = `<div class="membar-fill gold" style="width:${Math.min(100, Math.round(kmToday / fm.kmRequired * 100))}%"></div><span>${kmToday.toFixed(1)} / ${fm.kmRequired} km</span>`;
      fp.appendChild(prog);
      fp.appendChild(el('p', 'muted small center', `Percorri ancora <b>${kmLeft.toFixed(1)} km</b> oggi per raggiungerlo!`));
    }
    c.appendChild(fp);
  }

  // ── Bisca e Taverna in cima per visibilità immediata ──

  // ── La Bisca Oscura ──
  {
    const biscaEntry = el('div', 'panel borgo-entry-panel bisca-entry-panel');
    const biscaEntryThumb = document.createElement('img');
    biscaEntryThumb.loading = 'eager';
    biscaEntryThumb.src = 'assets/backgrounds/bg-bisca.webp';
    biscaEntryThumb.alt = '';
    biscaEntryThumb.className = 'borgo-entry-header';
    biscaEntryThumb.onerror = () => biscaEntryThumb.remove();
    biscaEntry.appendChild(biscaEntryThumb);
    biscaEntry.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/borgo/bisca.webp', 'La Bisca Oscura', '🃏')));
    biscaEntry.appendChild(el('p', 'muted small borgo-entry-quote',
      '«Nessuno sa chi organizza gli scontri. Nessuno chiede. Le monete parlano per tutti.»'));
    RPG.biscaResetIfNeeded(HERO);
    const biscaBetsLeft2 = (HERO.bisca && HERO.bisca.betsLeft !== undefined) ? HERO.bisca.betsLeft : RPG.BISCA_DAILY_BETS;
    biscaEntry.appendChild(el('div', biscaBetsLeft2 > 0 ? 'bisca-avail-badge' : 'bisca-avail-badge bisca-exhausted',
      biscaBetsLeft2 > 0 ? `🎰 ${biscaBetsLeft2} scommesse disponibili` : '⛔ Scommesse esaurite per oggi'));
    const enterBiscaBtn2 = el('button', 'btn btn-primary wide', ptIcon('assets/ui/borgo/bisca.webp', 'Entra nella Bisca', '🃏'));
    enterBiscaBtn2.addEventListener('click', () => { MARKET_VIEW = 'bisca'; setTab('market'); });
    biscaEntry.appendChild(enterBiscaBtn2);
    c.appendChild(biscaEntry);
  }

  // ── La Cartomante ──
  {
    RPG.cartReset(HERO);
    const cart = HERO.cartomante || {};
    const cartEntry = el('div', 'panel borgo-entry-panel cartomante-entry-panel');
    const cartThumb = document.createElement('img');
    cartThumb.loading = 'eager';
    cartThumb.src = 'assets/cartomante/header-cartomante.jpg';
    cartThumb.alt = '';
    cartThumb.className = 'borgo-entry-header';
    cartThumb.onerror = () => cartThumb.remove();
    cartEntry.appendChild(cartThumb);
    cartEntry.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/borgo/cartomante.webp', 'La Cartomante', '🔮')));
    cartEntry.appendChild(el('p', 'muted small borgo-entry-quote',
      '«Le stelle non mentono. Entrate, se avete il coraggio di sapere cosa vi riserva il destino.»'));
    const fichesNow = HERO.fiches || 0;
    cartEntry.appendChild(el('div', 'cart-badge-row', `<span class="cart-fiches-badge">${FICHE_ICO} ${fichesNow} Fiches</span>${cart.ruotaSpins > 0 ? '' : ' <span class="cart-free-badge">✨ Giro gratis disponibile</span>'}`));
    const enterCartBtn = el('button', 'btn btn-primary wide', ptIcon('assets/ui/borgo/cartomante.webp', 'Entra nella Tenda', '🔮'));
    enterCartBtn.addEventListener('click', () => { MARKET_VIEW = 'cartomante'; setTab('market'); });
    cartEntry.appendChild(enterCartBtn);
    c.appendChild(cartEntry);
  }

  // ── La Taverna delle Sfide ──
  {
    const tavernaEntry2 = el('div', 'panel borgo-entry-panel taverna-entry-panel');
    const tavernaThumb2 = document.createElement('img');
    tavernaThumb2.loading = 'eager';
    tavernaThumb2.src = 'assets/ui/taverna-header.webp';
    tavernaThumb2.alt = '';
    tavernaThumb2.className = 'borgo-entry-header';
    tavernaThumb2.onerror = () => tavernaThumb2.remove();
    tavernaEntry2.appendChild(tavernaThumb2);
    tavernaEntry2.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/borgo/taverna.webp', 'La Taverna delle Sfide', '🍺')));
    tavernaEntry2.appendChild(el('p', 'muted small borgo-entry-quote',
      '«Tra dadi truccati e boccali volanti, qui si separa chi ha nervi saldi da chi torna a casa vuoto.»'));
    const totalRemMkt2 = MG_CATEGORIES.flatMap(cat => cat.games).reduce((s, g) => s + Math.max(0, MG_MAX[g.id] - getMG(g.id).n), 0);
    if (totalRemMkt2 > 0) tavernaEntry2.appendChild(el('div', 'taverna-avail-badge', `🎮 ${totalRemMkt2} partite disponibili`));
    const enterTavernaBtn2 = el('button', 'btn btn-primary wide', ptIcon('assets/ui/borgo/taverna.webp', 'Entra nella Taverna', '🍺'));
    enterTavernaBtn2.addEventListener('click', () => { MARKET_VIEW = 'taverna'; setTab('market'); });
    tavernaEntry2.appendChild(enterTavernaBtn2);
    c.appendChild(tavernaEntry2);
  }

  // ── Altre sezioni del Borgo ──
  const borgoSections = [
    { key: 'fucina',    emoji: '⚒️', icon: 'assets/ui/borgo/fucina.webp',       title: 'La Fucina',       btnLabel: 'Entra nella Fucina',      quote: '«Batto il ferro dall\'alba. Portami il tuo pezzo peggiore: te lo riforgio meglio di prima.»', img: 'assets/ui/header fucina.webp' },
    { key: 'erborista', emoji: '🧪', icon: 'assets/ui/borgo/bazar.webp',         title: 'Il Bazar',         btnLabel: 'Entra nel Bazar',          quote: '«Rimedi, rune e reliquie — tutto ciò che un viandante non sapeva di volere, finché non lo vede.»', img: 'assets/header bazar.webp' },
    { key: 'nero',      emoji: '🕯️', icon: 'assets/ui/borgo/mercato-nero.webp', title: 'Il Mercato Nero',  btnLabel: 'Entra nel Mercato Nero',  quote: '«Nessuna domanda, nessun registro. Solo oro che cambia mano nel buio.»',                    img: 'assets/ui/header contrabbando.webp' },
    { key: 'stalla',    emoji: '🐴', icon: 'assets/ui/borgo/stalla.webp',        title: 'La Stalla',        btnLabel: 'Entra nella Stalla',      quote: '«La tua cavalcatura ti porta lontano — trattala bene e moltiplicherà ogni tuo passo.»',    img: 'assets/ui/header stalla.webp' },
  ];
  borgoSections.forEach(({ key, emoji, icon, title, btnLabel, quote, img }) => {
    const panel = el('div', 'panel borgo-entry-panel');
    const thumb = document.createElement('img');
    thumb.loading = 'lazy';
    thumb.src = img;
    thumb.alt = '';
    thumb.className = 'borgo-entry-header';
    thumb.onerror = () => thumb.remove();
    panel.appendChild(thumb);
    panel.appendChild(el('h3', 'panel-title', ptIcon(icon, title, emoji)));
    panel.appendChild(el('p', 'muted small borgo-entry-quote', quote));
    const enterBtn = el('button', 'btn btn-primary wide', ptIcon(icon, btnLabel, emoji));
    enterBtn.addEventListener('click', () => { MARKET_VIEW = key; setTab('market'); });
    panel.appendChild(enterBtn);
    c.appendChild(panel);
  });

  // ── Antro del Campione (entry card, sempre in fondo al Borgo) ──
  {
    const heroLv = HERO.level || 1;
    const isUnlocked = heroLv >= 50;
    const unlockedCount = ANTRO_SECTIONS.filter(s => heroLv >= s.lv).length;
    const nextSection = ANTRO_SECTIONS.find(s => heroLv < s.lv);

    const antroCard = el('div', `panel borgo-entry-panel antro-card${isUnlocked ? ' antro-unlocked' : ''}`);

    // Header banner con immagine
    const banner = el('div', 'antro-header-banner');
    const bannerImg = el('img', 'antro-header-img');
    bannerImg.src = 'assets/antro del campione.webp';
    bannerImg.alt = '';
    bannerImg.loading = 'lazy';
    banner.appendChild(bannerImg);
    const bannerOverlay = el('div', 'antro-header-overlay');
    bannerOverlay.innerHTML = `
      <div class="antro-header-ornament">✦ &nbsp; ✦ &nbsp; ✦</div>
      <div class="antro-header-title">Antro del Campione</div>
      <div class="antro-header-subtitle">${isUnlocked ? `${unlockedCount} di 6 sezioni sbloccate` : 'Si svela al Livello 50'}</div>
      ${!isUnlocked ? '<div class="antro-lock-glyph">🔒</div>' : ''}
    `;
    banner.appendChild(bannerOverlay);
    antroCard.appendChild(banner);

    // Barra progresso milestone
    const milestones = [50, 60, 70, 80, 90, 100];
    const progressWrap = el('div', 'antro-progress-wrap');
    const trackEl = el('div', 'antro-track');
    const fillPct = Math.min(100, Math.max(0, ((heroLv - 1) / 99) * 100));
    const fillEl = el('div', 'antro-track-fill');
    fillEl.style.width = `${fillPct}%`;
    trackEl.appendChild(fillEl);
    progressWrap.appendChild(trackEl);
    const dotsEl = el('div', 'antro-milestone-dots');
    milestones.forEach(lv => {
      const dot = el('div', `antro-dot${heroLv >= lv ? ' antro-dot-done' : ''}`);
      dot.innerHTML = `<span class="antro-dot-lv">${lv}</span>`;
      dotsEl.appendChild(dot);
    });
    progressWrap.appendChild(dotsEl);
    antroCard.appendChild(progressWrap);

    // Lista sezioni
    const sectionList = el('div', 'antro-section-list');
    ANTRO_SECTIONS.forEach(s => {
      const done = heroLv >= s.lv;
      const isNext = nextSection && s.lv === nextSection.lv;
      const row = el('div', `antro-section-row${done ? ' antro-row-done' : isNext ? ' antro-row-next' : ' antro-row-sealed'}`);
      const rowDesc = done ? s.desc : isNext ? `Si sblocca al livello ${s.lv} · ${s.quote}` : `Segreto svelato al livello ${s.lv}…`;
      row.innerHTML = `
        <span class="antro-row-icon">${done ? s.icon : isNext ? '🔓' : '🔒'}</span>
        <div class="antro-row-body">
          <span class="antro-row-name">${done || isNext ? s.name : '???'}</span>
          <span class="antro-row-desc">${rowDesc}</span>
          ${done ? `<span class="antro-row-quote">${s.quote}</span>` : ''}
        </div>
        <span class="antro-row-badge">${done ? '✓' : `Lv ${s.lv}`}</span>
      `;
      sectionList.appendChild(row);
    });
    antroCard.appendChild(sectionList);

    // Frase leggendaria
    const quoteMap = {
      pre:  '«Dietro questa porta riposano sfide che cambieranno il tuo destino. Ogni passo che fai oggi ti avvicina a ciò che si nasconde nell\'oscurità. Livello 50. Non mollare.»',
      60:   '«Hai varcato la soglia. Ora l\'Antro ti studia, ti misura. Qualcosa di antico si agita nelle profondità — si dice che dorme solo finché non arriva un degno avversario…»',
      70:   '«La Bestia Ancestrale è caduta per mano tua. Il Reame ricorderà. Ma la Sala dei Trofei chiede ancora di più: mostra al mondo chi sei davvero.»',
      80:   '«Il tuo nome è già inciso. Non basta. Al livello 80 la Forgia arde per te — metalli che nessun mercante vende, poteri che nessun dungeon ordinario può dare.»',
      90:   '«Hai bruciato ogni ostacolo. Eppure il Dungeon Infinito ride nell\'ombra. Nessuno sa cosa si trova in fondo — perché nessuno è mai tornato a raccontarlo.»',
      100:  '«Cento livelli. Il confine dell\'impossibile è qui, adesso, nella Sala della Leggenda. Pochi nella storia del Reame hanno osato tanto. Tutti hanno guadagnato l\'eternità.»',
      max:  '«Hai percorso ogni corridoio, sconfitto ogni ombra, inciso il tuo nome nella roccia più antica del Reame. L\'Antro è tuo. Per sempre.»',
    };
    const quoteKey = !isUnlocked ? 'pre' : !nextSection ? 'max' : String(nextSection.lv);
    antroCard.appendChild(el('p', 'antro-quote', quoteMap[quoteKey] || quoteMap.pre));

    // CTA
    if (isUnlocked) {
      const enterBtn = el('button', 'btn btn-primary wide antro-enter-btn', '⚔️ Entra nell\'Antro');
      enterBtn.addEventListener('click', () => { MARKET_VIEW = 'antro'; setTab('market'); });
      antroCard.appendChild(enterBtn);
    } else {
      const lockedBtn = el('button', 'btn wide antro-locked-btn', `🔒 Disponibile al Livello 50 · ti mancano ${50 - heroLv} livelli`);
      lockedBtn.disabled = true;
      antroCard.appendChild(lockedBtn);
    }

    c.appendChild(antroCard);
  }

  } catch (err) {
    console.error('[renderMarket]', err);
    const errPanel = el('div', 'panel center');
    errPanel.innerHTML = `<p style="margin-bottom:12px">⚠️ Errore nel caricamento del Borgo.</p>
      <p class="muted small" style="margin-bottom:12px;word-break:break-word">${esc(err && err.message ? err.message : String(err))}</p>`;
    const retryBtn = el('button', 'btn btn-primary', '↺ Riprova');
    retryBtn.addEventListener('click', () => setTab('market'));
    errPanel.appendChild(retryBtn);
    c.appendChild(errPanel);
  }
}

/* ── Antro del Campione — Hub ── */
function renderAntroView(c) {
  const heroLv = HERO.level || 1;
  const activeKey = MARKET_VIEW;

  // Back
  const isSubView = activeKey !== 'antro';
  const backBtn = el('button', 'view-back-link', isSubView ? '‹ Antro del Campione' : '‹ Il Borgo');
  backBtn.addEventListener('click', () => {
    MARKET_VIEW = isSubView ? 'antro' : 'hub';
    setTab('market');
  });
  c.appendChild(backBtn);

  // Se siamo in una sotto-sezione, deleghiamo
  if (activeKey === 'antro_contratti' && heroLv >= 50) { renderAntroContrattiView(c); return; }
  if (activeKey === 'antro_bestia'    && heroLv >= 60) { renderAntroBestiaView(c);    return; }
  if (activeKey === 'antro_prove'     && heroLv >= 61) { HERO_VIEW = 'campione'; setTab('hero'); return; }
  if (activeKey === 'antro_trofei'    && heroLv >= 70) { renderAntroTrofeiView(c);    return; }
  if (activeKey === 'antro_forgia'    && heroLv >= 80) { renderAntroForgiaView(c);    return; }
  if (activeKey === 'antro_dungeon'   && heroLv >= 90) { renderAntroDungeonView(c);   return; }
  if (activeKey === 'antro_leggenda'  && heroLv >= 100){ renderAntroLeggendaView(c);  return; }

  // Hub principale
  const hubHeader = el('div', 'antro-view-header');
  hubHeader.innerHTML = `
    <div class="antro-view-ornament">— ✦ —</div>
    <h2 class="antro-view-title">Antro del Campione</h2>
    <p class="antro-view-sub">Lv ${heroLv} &nbsp;·&nbsp; ${ANTRO_SECTIONS.filter(s => heroLv >= s.lv).length} / 7 sezioni sbloccate</p>
  `;
  c.appendChild(hubHeader);

  // Tutorial collassabile — aperto di default per chi non ha mai giocato in Arena
  const neverPlayed = !(HERO.pvp && (HERO.pvp.wins || HERO.pvp.losses));
  const arenaHelp = document.createElement('details');
  arenaHelp.className = 'panel antro-help-card';
  if (neverPlayed) arenaHelp.open = true;
  arenaHelp.innerHTML = `
    <summary class="antro-help-summary">⚔️ Come funziona l'Arena</summary>
    <div class="antro-help-body">
      <p>Ogni giorno hai un numero limitato di sfide. Ogni scontro è un <b>duello a morra in 5 round</b>:</p>
      <div class="antro-help-moves">
        <div>🗡️ <b>Fendente</b> batte Schivata</div>
        <div>🛡️ <b>Parata</b> batte Fendente</div>
        <div>💨 <b>Schivata</b> batte Parata</div>
      </div>
      <p class="muted small" style="margin-top:.6rem">Vinci <b>3 round su 5</b> per guadagnare oro e fiches arena. I <b>Boss</b> hanno ricompense speciali.</p>
    </div>
  `;
  c.appendChild(arenaHelp);

  ANTRO_SECTIONS.forEach(s => {
    const done = heroLv >= s.lv;
    const isProve = s.key === 'antro_prove';
    const card = el('div', `panel antro-hub-card${done ? ' antro-hub-open' : ' antro-hub-sealed'}${isProve && !done ? ' antro-hub-prove-locked' : ''}${isProve && done ? ' antro-hub-prove-open' : ''}`);
    if (isProve && !done) {
      const trophiesEarned = (HERO.champion && HERO.champion.trophies && HERO.champion.trophies.length) || 0;
      card.innerHTML = `
        <div class="ahc-icon">🔒</div>
        <div class="ahc-body">
          <div class="ahc-name ahc-name-prove">Le 10 Prove del Campione</div>
          <div class="ahc-prove-caption">Si sblocca al livello 61</div>
          <div class="ahc-prove-desc">Dieci sfide irripetibili con una finestra di 14 giorni ciascuna. Supera tutte e 10 per ottenere trofei unici e forgiare il <b>Gladius Aeternus</b> — l'arma dei Campioni, oltre il leggendario.</div>
          <div class="ahc-prove-trophies">${trophiesEarned > 0 ? `<span class="ahc-prove-badge">🏆 ${trophiesEarned}/10 trofei</span>` : '<span class="ahc-prove-badge-locked">🏅 Trofei unici · Gladius Aeternus</span>'}</div>
        </div>
        <div class="ahc-lv">Lv 61</div>
      `;
    } else if (isProve && done) {
      const trophiesEarned = (HERO.champion && HERO.champion.trophies && HERO.champion.trophies.length) || 0;
      card.innerHTML = `
        <div class="ahc-icon">⚔️</div>
        <div class="ahc-body">
          <div class="ahc-name ahc-name-prove">Le 10 Prove del Campione</div>
          <div class="ahc-prove-caption">${trophiesEarned === 10 ? '✦ Completato — Campione del Reame' : `${trophiesEarned}/10 prove superate`}</div>
          <div class="ahc-prove-desc">${s.desc}</div>
          <div class="ahc-prove-trophies"><span class="ahc-prove-badge${trophiesEarned === 10 ? ' ahc-prove-badge-done' : ''}">🏆 ${trophiesEarned}/10 trofei</span></div>
        </div>
        <div class="ahc-lv">Lv 61</div>
      `;
    } else {
      const isBestia = s.key === 'antro_bestia';
      card.innerHTML = `
        <div class="ahc-icon">${done ? s.icon : '🔒'}</div>
        <div class="ahc-body">
          <div class="ahc-name">${s.name}</div>
          <div class="ahc-desc">${done ? s.desc : `Si sblocca al livello ${s.lv}`}</div>
          ${!done && isBestia ? `<div class="ahc-prove-teaser">⚔️ Al Lv 61 si sbloccano <b>Le 10 Prove del Campione</b> — sfide irripetibili con trofei unici e il Gladius Aeternus.</div>` : ''}
        </div>
        <div class="ahc-lv">Lv ${s.lv}</div>
      `;
    }
    if (done) {
      card.addEventListener('click', () => { MARKET_VIEW = s.key; setTab('market'); });
    }
    c.appendChild(card);
  });
}

/* Sezioni dell'Antro — contenuto in costruzione */
function _antroComingSoon(c, s) {
  const wrap = el('div', 'panel center antro-coming-soon');
  wrap.innerHTML = `
    <div style="font-size:3rem;margin-bottom:.5rem">${s.icon}</div>
    <h3 class="panel-title">${s.name}</h3>
    <p class="muted small" style="margin:.5rem 0 1.2rem">${s.desc}</p>
    <div class="antro-cs-badge">🔨 In costruzione</div>
    <p class="muted small" style="margin-top:.8rem">Questa sezione sarà disponibile a breve.<br>Continua il tuo cammino, Campione.</p>
  `;
  c.appendChild(wrap);
}
function renderAntroContrattiView(c) { renderAntroDragonCardsView(c); }

/* ── Collezione Carte dei Draghi ─────────────────────────────────────── */
const DC_CAT_META = {
  elementale:  { label: 'Elementali',      icon: '✨', color: '#e67e22' },
  comune:      { label: 'Comuni',          icon: '🐉', color: '#7f8c8d' },
  non_comune:  { label: 'Non Comuni',      icon: '🐉', color: '#27ae60' },
  raro:        { label: 'Rari',            icon: '🐉', color: '#2980b9' },
  epico:       { label: 'Epici',           icon: '🐉', color: '#8e44ad' },
  leggendario: { label: 'Leggendari',      icon: '🐉', color: '#f39c12' },
  introvabile: { label: 'Introvabili',     icon: '💫', color: '#e74c3c' },
  stagionale:  { label: 'Stagionali',      icon: '🌸', color: '#16a085' },
  corrotto:    { label: 'Corrotti',        icon: '🌑', color: '#6c3483' },
  guardiano:   { label: 'Guardiani',       icon: '🛡️', color: '#1a5276' },
  fossile:     { label: 'Fossili',         icon: '🦕', color: '#7d6608' },
  fusione:     { label: 'Fusioni',         icon: '⚗️', color: '#117a65' },
  re:          { label: 'Re dei Draghi',   icon: '👑', color: '#b7950b' },
  bioma:       { label: 'Draghi dei Biomi',icon: '🗺️', color: '#1e8449' },
  zodiacale:   { label: 'Zodiacali',       icon: '♈', color: '#6e2fa5' },
  cucciolo:    { label: 'Cuccioli',        icon: '🐣', color: '#e91e8c' },
  mitologico:  { label: 'Mitologici',      icon: '🏛️', color: '#c0392b' },
  festivo:     { label: 'Festivi',         icon: '🎉', color: '#e74c3c' },
  attivita:    { label: 'Attività',        icon: '🏃', color: '#2471a3' },
};
const DC_RARITY_META = {
  speciale:    { label: 'Speciale',    grad: 'linear-gradient(135deg,#b7791f,#f6d365,#b7791f)', border: '#f59e0b', textColor: '#92400e', costBg: '#f59e0b' },
  comune:      { label: 'Comune',      grad: 'linear-gradient(135deg,#8a9ba8,#c5ced6,#8a9ba8)', border: '#b0bec5', textColor: '#37474f', costBg: '#7f8c8d' },
  non_comune:  { label: 'Non Comune',  grad: 'linear-gradient(135deg,#2e7d32,#66bb6a,#2e7d32)', border: '#43a047', textColor: '#1b5e20', costBg: '#27ae60' },
  raro:        { label: 'Raro',        grad: 'linear-gradient(135deg,#1565c0,#42a5f5,#1565c0)', border: '#1e88e5', textColor: '#0d47a1', costBg: '#2980b9' },
  epico:       { label: 'Epico',       grad: 'linear-gradient(135deg,#6a1b9a,#ba68c8,#6a1b9a)', border: '#8e24aa', textColor: '#4a148c', costBg: '#8e44ad' },
  leggendario: { label: 'Leggendario', grad: 'linear-gradient(135deg,#b7791f,#f6d365,#fda085,#f6d365,#b7791f)', border: '#f59e0b', textColor: '#92400e', costBg: '#d4ac0d' },
  introvabile: { label: 'Introvabile', grad: 'linear-gradient(135deg,#e74c3c,#ff8a65,#e74c3c)', border: '#e74c3c', textColor: '#7b241c', costBg: '#c0392b' },
};
const DC_KW_LABELS = {
  provocazione: '🎯 Provocazione',
  scatto:       '⚡ Scatto',
  scudo_divino: '✨ Scudo Divino',
  drenaggio:    '💚 Drenaggio',
  veleno:       '☠️ Veleno',
};

function _buildDragonCard(card, owned) {
  const rm = DC_RARITY_META[card.rar] || DC_RARITY_META.comune;
  const cm = DC_CAT_META[card.cat] || { icon: '🐉', color: '#555' };

  const wrap = el('div', `dc-card dc-rar-${card.rar}${owned ? '' : ' dc-locked'}`);
  wrap.setAttribute('data-rar', card.rar);
  wrap.setAttribute('data-cat', card.cat);

  const imgPath = `images/dragons/${card.id.replace('dc_','')}.webp`;
  const artContent = owned
    ? `<img class="dc-art-img" src="${imgPath}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt="${esc(card.name)}"><div class="dc-art-emoji" style="display:none">${card.icon}</div>`
    : `<div class="dc-art-emoji">❓</div>`;

  const kwHtml = (owned && card.kws && card.kws.length)
    ? card.kws.map(k => `<span class="dc-kw-badge">${DC_KW_LABELS[k] || k}</span>`).join('')
    : '';

  wrap.innerHTML = `
    <div class="dc-header" style="background:${rm.grad}">
      <div class="dc-cost-gem" style="background:${rm.costBg}">${owned ? card.cost : '?'}</div>
      <span class="dc-name">${owned ? esc(card.name) : '???'}</span>
    </div>
    <div class="dc-art-area">
      ${artContent}
    </div>
    <div class="dc-body" style="border-color:${rm.border}">
      ${owned ? `<div class="dc-stats-row">
        <span class="dc-stat-atk">⚔️ ${card.atk}</span>
        <span class="dc-stat-hp">❤️ ${card.hp}</span>
      </div>` : ''}
      ${kwHtml ? `<div class="dc-kw-row">${kwHtml}</div>` : ''}
      <p class="dc-desc">${owned ? esc(card.desc) : 'Carta non ancora scoperta...'}</p>
      <div class="dc-footer">
        <span class="dc-cat-icon">${cm.icon}</span>
        <span class="dc-rarity-label" style="color:${rm.textColor}">${rm.label}</span>
      </div>
    </div>
  `;

  return wrap;
}

function renderAntroDragonCardsView(c) {
  if (DC_VIEW === 'builder')    { renderDcBuilderView(c);    return; }
  if (DC_VIEW === 'boss_select') { renderDcBossSelectView(c); return; }
  if (DC_VIEW === 'battle')     { renderDcBattleView(c);     return; }

  const ownedIds = new Set((HERO.dragonCards || []).map(dc => dc.id));
  const allCards = RPG.DRAGON_CARDS;
  const totalOwned = allCards.filter(card => ownedIds.has(card.id)).length;

  const header = el('div', 'dc-collection-header');
  header.innerHTML = `
    <h2 class="section-title">🐲 Collezione dei Draghi</h2>
    <p class="muted small center">${totalOwned} / ${allCards.length} draghi scoperti · Si sbloccano con gli allenamenti dal Lv 30</p>
    <div class="dc-progress-bar-wrap">
      <div class="dc-progress-bar-fill" style="width:${Math.round(totalOwned/allCards.length*100)}%"></div>
    </div>
  `;
  c.appendChild(header);

  const ownedCount = (HERO.dragonCards || []).length;
  const canDuel = ownedCount >= 5 && HERO.level >= 50;

  /* Onboarding DDD — mostrato una volta sola quando le condizioni sono soddisfatte */
  if (canDuel && !HERO.dddOnboardingSeen) {
    const banner = el('div', 'dc-ddd-onboarding-banner');
    banner.innerHTML = `
      <div class="dc-ddd-ob-icon">🐉</div>
      <div class="dc-ddd-ob-body">
        <b>Il Dominio dei Draghi ti chiama!</b>
        <p>Hai raggiunto il Livello 50 e raccolto abbastanza carte. Sfida i villain del Dominio — 5 duelli al giorno, 5 tier di difficoltà crescente, ricompense rare ad ogni vittoria.</p>
      </div>
      <button class="btn btn-primary dc-ddd-ob-btn">Inizia a sfidare</button>
    `;
    banner.querySelector('.dc-ddd-ob-btn').addEventListener('click', () => {
      HERO.dddOnboardingSeen = true;
      persist();
      DC_DECK = []; DC_VIEW = 'builder'; setTab('market');
    });
    const dismissBtn = el('button', 'dc-ddd-ob-dismiss', '✕');
    dismissBtn.addEventListener('click', () => {
      HERO.dddOnboardingSeen = true;
      persist();
      banner.remove();
    });
    banner.appendChild(dismissBtn);
    c.appendChild(banner);
  }

  const duelBtn = el('button', 'btn btn-primary dc-duel-btn', '⚔️ Dominio dei Draghi');
  if (!canDuel) {
    duelBtn.disabled = true;
    if (HERO.level < 50) {
      duelBtn.textContent = `⚔️ Dominio dei Draghi (Lv 50 richiesto)`;
    } else {
      duelBtn.textContent = `⚔️ Dominio dei Draghi (${ownedCount}/5 draghi)`;
    }
  }
  duelBtn.addEventListener('click', () => { DC_DECK = []; DC_VIEW = 'builder'; setTab('market'); });
  c.appendChild(duelBtn);

  // Filtro per categoria
  const catKeys = Object.keys(DC_CAT_META);
  let activeFilter = 'tutte';
  const filterBar = el('div', 'dc-filter-bar');
  const allBtn = el('button', 'dc-filter-btn active', 'Tutte');
  allBtn.addEventListener('click', () => {
    activeFilter = 'tutte';
    filterBar.querySelectorAll('.dc-filter-btn').forEach(b => b.classList.remove('active'));
    allBtn.classList.add('active');
    grid.querySelectorAll('.dc-dragon-section').forEach(s => s.style.display = '');
  });
  filterBar.appendChild(allBtn);
  catKeys.forEach(cat => {
    const cm = DC_CAT_META[cat];
    const btn = el('button', 'dc-filter-btn', cm.icon + ' ' + cm.label);
    btn.addEventListener('click', () => {
      activeFilter = cat;
      filterBar.querySelectorAll('.dc-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      grid.querySelectorAll('.dc-dragon-section').forEach(s => {
        s.style.display = s.getAttribute('data-cat') === cat ? '' : 'none';
      });
    });
    filterBar.appendChild(btn);
  });
  c.appendChild(filterBar);

  const grid = el('div', 'dc-grid');

  catKeys.forEach(cat => {
    const catCards = allCards.filter(card => card.cat === cat);
    if (!catCards.length) return;
    const cm = DC_CAT_META[cat];
    const catOwned = catCards.filter(card => ownedIds.has(card.id)).length;
    const section = el('div', 'dc-dragon-section');
    section.setAttribute('data-cat', cat);
    section.innerHTML = `<div class="dc-dragon-section-title" style="color:${cm.color}">${cm.icon} ${cm.label} <span class="muted small">${catOwned}/${catCards.length}</span></div>`;
    const row = el('div', 'dc-dragon-row');
    catCards.forEach(card => {
      const cardEl = _buildDragonCard(card, ownedIds.has(card.id));
      row.appendChild(cardEl);
    });
    section.appendChild(row);
    grid.appendChild(section);
  });
  c.appendChild(grid);
}

/* ══════════════════════════════════════════════════════════════
   DUELLO CARTE — Deck Builder
   ══════════════════════════════════════════════════════════════ */
function renderDcBuilderView(c) {
  const backBtn = el('button', 'view-back-link', '‹ Collezione');
  backBtn.addEventListener('click', () => { DC_VIEW = 'collection'; setTab('market'); });
  c.appendChild(backBtn);

  const ownedIds = (HERO.dragonCards || []).map(dc => dc.id);
  const ownedCards = RPG.DRAGON_CARDS.filter(card => ownedIds.includes(card.id));

  const hdr = el('div', 'dc-builder-header');
  const counter = el('p', 'dc-builder-counter', `${DC_DECK.length} / 20 draghi selezionati`);
  hdr.innerHTML = `<h2 class="section-title">🃏 Costruisci il Mazzo</h2>
    <p class="muted small">Seleziona 5–20 draghi per il tuo mazzo da battaglia.</p>`;
  hdr.appendChild(counter);

  const confirmBtn = el('button', 'btn btn-primary dc-builder-confirm');
  confirmBtn.textContent = DC_DECK.length >= 5 ? '⚔️ Scegli il Boss' : `Seleziona almeno 5 (${DC_DECK.length}/20)`;
  confirmBtn.disabled = DC_DECK.length < 5;
  confirmBtn.addEventListener('click', () => { DC_VIEW = 'boss_select'; setTab('market'); });
  hdr.appendChild(confirmBtn);
  c.appendChild(hdr);

  const catKeys = Object.keys(DC_CAT_META);
  const grid = el('div', 'dc-builder-grid');

  catKeys.forEach(cat => {
    const catCards = ownedCards.filter(card => card.cat === cat);
    if (!catCards.length) return;
    const cm = DC_CAT_META[cat];
    const sec = el('div', 'dc-builder-section');
    sec.innerHTML = `<div class="dc-dragon-section-title" style="color:${cm.color}">${cm.icon} ${cm.label}</div>`;
    const row = el('div', 'dc-builder-row');
    catCards.forEach(card => {
      const rm = DC_RARITY_META[card.rar] || DC_RARITY_META.comune;
      const selected = DC_DECK.includes(card.id);
      const mini = el('div', `dc-mini-card dc-rar-${card.rar}${selected ? ' selected' : ''}`);
      const imgPath = `images/dragons/${card.id.replace('dc_','')}.webp`;
      const kwHtml = (card.kws || []).slice(0,2).map(k => `<span class="dc-mini-kw">${DC_KW_LABELS[k] || k}</span>`).join('');
      mini.innerHTML = `
        <div class="dc-mini-header" style="background:${rm.grad}">
          <div class="dc-mini-cost" style="background:${rm.costBg}">${card.cost}</div>
          <span class="dc-mini-name">${esc(card.name)}</span>
        </div>
        <div class="dc-mini-art">
          <img class="dc-mini-img" src="${imgPath}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt="">
          <div class="dc-mini-emoji" style="display:none">${card.icon}</div>
        </div>
        <div class="dc-mini-stats">
          <span class="dc-mini-atk">⚔️${card.atk}</span>
          <span class="dc-mini-hp">❤️${card.hp}</span>
        </div>
        ${kwHtml ? `<div class="dc-mini-kws">${kwHtml}</div>` : ''}
        ${selected ? '<div class="dc-mini-check">✓</div>' : ''}
      `;
      mini.addEventListener('click', () => {
        const idx = DC_DECK.indexOf(card.id);
        if (idx !== -1) {
          DC_DECK.splice(idx, 1);
        } else {
          if (DC_DECK.length >= 20) { toast('Mazzo completo! Rimuovi un drago prima.'); return; }
          DC_DECK.push(card.id);
        }
        counter.textContent = `${DC_DECK.length} / 20 draghi selezionati`;
        confirmBtn.disabled = DC_DECK.length < 5;
        confirmBtn.textContent = DC_DECK.length >= 5 ? '⚔️ Scegli il Boss' : `Seleziona almeno 5 (${DC_DECK.length}/20)`;
        mini.classList.toggle('selected', DC_DECK.includes(card.id));
        const chk = mini.querySelector('.dc-mini-check');
        if (DC_DECK.includes(card.id)) {
          if (!chk) { const d = document.createElement('div'); d.className = 'dc-mini-check'; d.textContent = '✓'; mini.appendChild(d); }
        } else { if (chk) chk.remove(); }
      });
      row.appendChild(mini);
    });
    sec.appendChild(row);
    grid.appendChild(sec);
  });
  c.appendChild(grid);
}

/* ══════════════════════════════════════════════════════════════
   DUELLO CARTE — Selezione Boss
   ══════════════════════════════════════════════════════════════ */
function renderDcBossSelectView(c) {
  const backBtn = el('button', 'view-back-link', '‹ Mazzo');
  backBtn.addEventListener('click', () => { DC_VIEW = 'builder'; setTab('market'); });
  c.appendChild(backBtn);

  const battlesLeft = dcBattlesLeft(HERO);
  const hdr = el('div', 'dc-select-header');
  hdr.innerHTML = `
    <h2 class="section-title">🐉 Scegli l'Avversario</h2>
    <div class="dc-select-meta">
      <span>🃏 Mazzo: <b>${DC_DECK.length}</b> carte</span>
      <span class="${battlesLeft === 0 ? 'dc-battles-empty' : ''}">⚔️ Sfide oggi: <b>${battlesLeft}/${DC_DAILY_BATTLES}</b></span>
    </div>`;
  c.appendChild(hdr);

  if (battlesLeft === 0) {
    const msg = el('div', 'panel center muted', '⏳ Hai esaurito le sfide per oggi. Torna domani!');
    c.appendChild(msg);
    return;
  }

  DC_TIERS.forEach(tier => {
    const unlocked = dcTierUnlocked(HERO, tier);
    const tierbosses = DC_BOSSES.filter(b => b.tier === tier);
    const defeatedInTier = tierbosses.filter(b => dcBossDefeated(HERO, b.id)).length;
    const tierLabel = DC_TIER_LABELS[tier];
    const tierIcon  = DC_TIER_ICONS[tier];

    const wrap = el('div', `dc-tier-panel dc-tier-${tier}${unlocked ? '' : ' dc-tier-locked'}`);

    const tierHdr = el('div', 'dc-tier-header');
    tierHdr.innerHTML = `
      <span class="dc-tier-icon">${tierIcon}</span>
      <span class="dc-tier-name">${tierLabel}</span>
      <span class="dc-tier-progress">${unlocked ? `${defeatedInTier}/5 sconfitti` : '🔒 ' + _dcUnlockHint(tier)}</span>`;
    wrap.appendChild(tierHdr);

    if (unlocked) {
      const grid = el('div', 'dc-boss-grid');
      tierbosses.forEach(boss => {
        const defeated = dcBossDefeated(HERO, boss.id);
        const rm = boss.reward;
        const starsInTier = boss.difficulty - (DC_TIERS.indexOf(tier) * 5);
        const stars = '★'.repeat(starsInTier) + '☆'.repeat(5 - starsInTier);
        const card = el('div', `dc-boss-card${defeated ? ' dc-boss-defeated' : ''}${boss.champion ? ' dc-boss-champion' : ''}`);
        const avatarSrc = `assets/dc-bosses/${boss.id}.webp`;
        card.innerHTML = `
          <div class="dc-boss-avatar">
            <img src="${avatarSrc}" alt="${esc(boss.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="dc-boss-icon-fb" style="display:none">${boss.icon}</div>
            ${defeated ? '<div class="dc-boss-defeated-badge">✓</div>' : ''}
            ${boss.champion ? '<div class="dc-boss-champion-badge">👑</div>' : ''}
          </div>
          <div class="dc-boss-info">
            <div class="dc-boss-name">${esc(boss.name)}</div>
            ${boss.nickname ? `<div class="dc-boss-nickname">${esc(boss.nickname)}</div>` : ''}
            <div class="dc-boss-stars">${stars}</div>
            <div class="dc-boss-rewards">
              <span>❤️ ${boss.hp}</span>
              <span>🪙 ${rm.gold}</span>
              <span>🃏 ${Math.round(rm.cardChance * 100)}%</span>
              ${boss.champion ? '<span class="dc-champ-tag">Campione</span>' : ''}
            </div>
          </div>`;
        card.addEventListener('click', () => {
          const tierLbl = DC_TIER_LABELS[boss.tier] || boss.tier;
          const starsInTierM = boss.difficulty - DC_TIERS.indexOf(boss.tier) * 5;
          const starsM = '★'.repeat(starsInTierM) + '☆'.repeat(5 - starsInTierM);
          modal(`
            <div style="text-align:center;margin-bottom:12px">
              <img src="assets/dc-bosses/${boss.id}.webp" alt="${esc(boss.name)}"
                style="width:120px;height:120px;object-fit:cover;border-radius:12px;box-shadow:0 4px 16px #0004"
                onerror="this.style.display='none'">
            </div>
            <div style="text-align:center;margin-bottom:4px">
              <b style="font-size:1.1em">${esc(boss.name)}</b><br>
              ${boss.nickname ? `<span class="muted small">${esc(boss.nickname)}</span><br>` : ''}
              <span class="muted small">${tierLbl} · ${starsM}</span>
            </div>
            <p class="muted small" style="text-align:center;font-style:italic;margin:10px 0">${esc(boss.quote)}</p>
            ${boss.bio ? `<p class="small" style="margin:0 0 14px;line-height:1.55">${esc(boss.bio)}</p>` : ''}
            <div style="display:flex;gap:8px;justify-content:center">
              <button class="btn" onclick="closeModal()">Annulla</button>
              <button class="btn btn-primary" id="_dcStartBattle">⚔️ Sfida</button>
            </div>
          `);
          document.getElementById('_dcStartBattle').addEventListener('click', () => {
            closeModal();
            DC_BATTLE_STATE = dcInitBattle(DC_DECK, boss.id);
            if (!DC_BATTLE_STATE) { toast('Errore: boss non trovato.'); return; }
            dcRecordBattle(HERO);
            persist();
            DC_VIEW = 'battle';
            setTab('market');
          });
        });
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
    }

    c.appendChild(wrap);
  });
}

function _dcUnlockHint(tier) {
  const idx = DC_TIERS.indexOf(tier);
  const prevTier = DC_TIERS[idx - 1];
  const prevLabel = DC_TIER_LABELS[prevTier] || prevTier;
  const prevBosses = DC_BOSSES.filter(b => b.tier === prevTier);
  const defeatedCount = (HERO.dcDefeated || []).filter(id => prevBosses.some(b => b.id === id)).length;
  return `Sconfiggi ${defeatedCount}/3 boss ${prevLabel}`;
}

/* ══════════════════════════════════════════════════════════════
   DUELLO CARTE — Arena di Battaglia
   ══════════════════════════════════════════════════════════════ */
function _dcHpBarColor(hp, max) {
  const pct = hp / max;
  if (pct > .6) return '#27ae60';
  if (pct > .3) return '#e67e22';
  return '#e74c3c';
}

function _dcMakeBoardCreatureEl(creature, side, canTarget) {
  const hp = creature.hp, max = creature.maxHp;
  const hpColor = _dcHpBarColor(hp, max);
  const hpPct = Math.round(hp / max * 100);
  const kwBadges = creature.kws.slice(0, 2).map(k => {
    const icons = { provocazione:'🎯', scatto:'⚡', scudo_divino:'✨', drenaggio:'💚', veleno:'☠️' };
    return `<span class="dc-bc-kw">${icons[k] || k}</span>`;
  }).join('');
  const isSelected = side === 'hero' && DC_SELECTED_ATTACKER === creature.iid;
  const canAtk = side === 'hero' && creature.canAttack && !creature.hasAttacked;

  const div = el('div', `dc-board-creature dc-bc-${side}${isSelected ? ' dc-bc-selected' : ''}${canAtk ? ' dc-bc-can-attack' : ''}${canTarget ? ' dc-bc-target' : ''}`);
  const imgPath = `images/dragons/${creature.cardId.replace('dc_','')}.webp`;
  div.innerHTML = `
    <div class="dc-bc-art">
      <img src="${imgPath}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt="">
      <div class="dc-bc-emoji" style="display:none">${creature.icon}</div>
      ${creature.divineShield ? '<div class="dc-bc-shield-glow">✨</div>' : ''}
    </div>
    <div class="dc-bc-stats">
      <span class="dc-bc-atk">⚔️${creature.atk}</span>
      <span class="dc-bc-hp" style="color:${hpColor}">❤️${creature.hp}</span>
    </div>
    <div class="dc-bc-hp-bar"><div style="width:${hpPct}%;background:${hpColor};height:100%"></div></div>
    ${kwBadges ? `<div class="dc-bc-kws">${kwBadges}</div>` : ''}
    <div class="dc-bc-name">${esc(creature.name)}</div>
  `;
  return div;
}

function renderDcBattleView(c) {
  const st = DC_BATTLE_STATE;
  if (!st) { DC_VIEW = 'collection'; setTab('market'); return; }

  c.classList.add('dc-battle-arena');

  // ── End screen ──────────────────────────────────────────────
  if (st.winner) {
    const won = st.winner === 'player';
    const endWrap = el('div', `dc-end-screen${won ? ' dc-end-win' : ' dc-end-loss'}`);
    endWrap.innerHTML = `
      <div class="dc-end-icon">${won ? '🏆' : '💀'}</div>
      <h2 class="dc-end-title">${won ? '⚔️ Vittoria!' : '💀 Sconfitta'}</h2>
      <p class="dc-end-sub">${won ? 'Hai sconfitto ' + esc(st.boss.name) + '!' : esc(st.boss.name) + ' ti ha sopraffatto.'}</p>
    `;
    if (won) {
      const earned = dcClaimVictory(st, HERO);
      persist();
      if (earned) {
        let rHtml = `<div class="dc-end-rewards"><div class="dc-end-reward">🪙 +${earned.gold} oro</div>`;
        if (earned.card) {
          const rm = DC_RARITY_META[earned.card.rar] || DC_RARITY_META.comune;
          rHtml += `<div class="dc-end-reward" style="color:${rm.textColor}">${earned.card.icon} ${esc(earned.card.name)} (${rm.label})</div>`;
        }
        rHtml += '</div>';
        endWrap.innerHTML += rHtml;
      }
    }
    const btns = el('div', 'dc-end-btns');
    const againBtn = el('button', 'btn btn-primary', '⚔️ Rivincita');
    againBtn.addEventListener('click', () => { DC_BATTLE_STATE = dcInitBattle(DC_DECK, st.boss.id); DC_SELECTED_ATTACKER = null; setTab('market'); });
    btns.appendChild(againBtn);
    const bossBtn = el('button', 'btn', '🐉 Scegli Boss');
    bossBtn.addEventListener('click', () => { DC_VIEW = 'boss_select'; setTab('market'); });
    btns.appendChild(bossBtn);
    const exitBtn = el('button', 'btn', '‹ Collezione');
    exitBtn.addEventListener('click', () => { DC_VIEW = 'collection'; setTab('market'); });
    btns.appendChild(exitBtn);
    endWrap.appendChild(btns);
    c.appendChild(endWrap);
    return;
  }

  // ── Boss area ──────────────────────────────────────────────
  const bossArea = el('div', 'dc-battle-boss-area');
  const bossHpPct = Math.round(st.boss.hp / st.boss.maxHp * 100);
  const bossHpColor = _dcHpBarColor(st.boss.hp, st.boss.maxHp);
  const bossHasProv = st.boss.board.some(cr => cr.kws.includes('provocazione'));

  bossArea.innerHTML = `
    <div class="dc-battle-combatant-header">
      <span class="dc-bc-face-icon">
        <img src="assets/dc-bosses/${st.boss.id}.webp" alt="${esc(st.boss.icon)}"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
          style="width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:top;border:2px solid var(--divider);display:block">
        <span class="dc-bc-face-fallback">${st.boss.icon}</span>
      </span>
      <div class="dc-bc-face-info">
        <b>${esc(st.boss.name)}</b>
        ${st.boss.nickname ? `<span class="dc-boss-nickname-battle muted">${esc(st.boss.nickname)}</span>` : ''}
        <div class="dc-battle-hp-bar-wrap">
          <div class="dc-battle-hp-bar" style="width:${bossHpPct}%;background:${bossHpColor}"></div>
        </div>
        <span class="small">❤️ ${st.boss.hp}/${st.boss.maxHp}${st.boss.armor ? ' 🛡️' + st.boss.armor : ''}</span>
      </div>
      <div class="dc-bc-meta muted small">✋${st.boss.hand.length} 📚${st.boss.deck.length}</div>
    </div>
  `;

  // Boss board
  const bossBoard = el('div', 'dc-battle-board dc-battle-board-boss');
  const hasAttacker = DC_SELECTED_ATTACKER !== null;
  st.boss.board.forEach(cr => {
    const isValidTarget = hasAttacker && (!bossHasProv || cr.kws.includes('provocazione'));
    const creEl = _dcMakeBoardCreatureEl(cr, 'boss', isValidTarget);
    if (isValidTarget) {
      creEl.addEventListener('click', () => {
        DC_BATTLE_STATE = dcAttack(DC_BATTLE_STATE, DC_SELECTED_ATTACKER, cr.iid);
        DC_SELECTED_ATTACKER = null;
        setTab('market');
      });
    }
    bossBoard.appendChild(creEl);
  });
  for (let i = st.boss.board.length; i < 4; i++) {
    bossBoard.appendChild(el('div', 'dc-board-slot-empty'));
  }
  bossArea.appendChild(bossBoard);
  c.appendChild(bossArea);

  // Divisore visivo tra le due zone
  c.appendChild(el('div', 'dc-battle-divider'));

  // ── Action Log ─────────────────────────────────────────────
  const recentLog = (st.log || []).slice(-5);
  if (recentLog.length) {
    const logWrap = el('div', 'dc-battle-log');
    logWrap.innerHTML = recentLog.map(m => `<div class="dc-log-line">${esc(m)}</div>`).join('');
    c.appendChild(logWrap);
  }

  // ── Hero area ──────────────────────────────────────────────
  const heroArea = el('div', 'dc-battle-hero-area');

  // Hero board
  const heroBoard = el('div', 'dc-battle-board dc-battle-board-hero');
  st.hero.board.forEach(cr => {
    const canAtk = cr.canAttack && !cr.hasAttacked;
    const isSelected = DC_SELECTED_ATTACKER === cr.iid;
    const creEl = _dcMakeBoardCreatureEl(cr, 'hero', false);
    if (canAtk || isSelected) {
      creEl.addEventListener('click', () => {
        DC_SELECTED_ATTACKER = isSelected ? null : cr.iid;
        setTab('market');
      });
    }
    heroBoard.appendChild(creEl);
  });
  for (let i = st.hero.board.length; i < 4; i++) {
    heroBoard.appendChild(el('div', 'dc-board-slot-empty'));
  }
  heroArea.appendChild(heroBoard);

  // Hero info row
  const heroHpPct = Math.round(st.hero.hp / st.hero.maxHp * 100);
  const heroHpColor = _dcHpBarColor(st.hero.hp, st.hero.maxHp);
  const mana = st.mana;
  const manaHtml = Array.from({length: mana.max}, (_, i) =>
    `<div class="dc-mana-gem${i < mana.current ? '' : ' dc-mana-empty'}"></div>`
  ).join('');

  const heroInfo = el('div', 'dc-battle-combatant-header dc-battle-hero-header');
  heroInfo.innerHTML = `
    <span class="dc-bc-face-icon">🧙</span>
    <div class="dc-bc-face-info">
      <b>Eroe — Turno ${st.turn}</b>
      <div class="dc-battle-hp-bar-wrap">
        <div class="dc-battle-hp-bar" style="width:${heroHpPct}%;background:${heroHpColor}"></div>
      </div>
      <span class="small">❤️ ${st.hero.hp}/${st.hero.maxHp}${st.hero.armor ? ' 🛡️' + st.hero.armor : ''}</span>
    </div>
    <div class="dc-mana-crystals">${manaHtml}</div>
  `;

  // Attack face button
  if (DC_SELECTED_ATTACKER !== null && !bossHasProv) {
    const faceBtn = el('button', 'btn btn-primary dc-face-attack-btn', '⚔️ Attacca ' + st.boss.name);
    faceBtn.addEventListener('click', () => {
      DC_BATTLE_STATE = dcAttack(DC_BATTLE_STATE, DC_SELECTED_ATTACKER, 'face');
      DC_SELECTED_ATTACKER = null;
      setTab('market');
    });
    heroInfo.appendChild(faceBtn);
  }
  heroArea.appendChild(heroInfo);
  c.appendChild(heroArea);

  // ── Mano ──────────────────────────────────────────────────
  const handLabel = el('div', 'dc-hand-label', `✋ Mano (${st.hero.hand.length}) — 📚 ${st.hero.deck.length} nel mazzo`);
  c.appendChild(handLabel);

  const handWrap = el('div', 'dc-battle-hand');
  if (!st.hero.hand.length) {
    handWrap.appendChild(el('p', 'muted small center', 'Nessun drago in mano.'));
  } else {
    st.hero.hand.forEach(cardId => {
      const card = RPG.DRAGON_CARDS.find(cd => cd.id === cardId);
      if (!card) return;
      const rm = DC_RARITY_META[card.rar] || DC_RARITY_META.comune;
      const canPlay = card.cost <= mana.current && (card.type !== 'creatura' || st.hero.board.length < 4);
      const imgPath = `images/dragons/${card.id.replace('dc_','')}.webp`;
      const kwHtml = (card.kws || []).map(k => `<span class="dc-mini-kw">${DC_KW_LABELS[k] || k}</span>`).join('');
      const handCard = el('div', `dc-hand-card dc-rar-${card.rar}${canPlay ? '' : ' dc-card-disabled'}`);
      handCard.innerHTML = `
        <div class="dc-hand-cost-gem" style="background:${rm.costBg}">${card.cost}</div>
        <div class="dc-hand-art">
          <img src="${imgPath}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt="">
          <div class="dc-hand-emoji" style="display:none">${card.icon}</div>
        </div>
        <div class="dc-hand-name">${esc(card.name)}</div>
        <div class="dc-hand-stats-row">
          <span class="dc-mini-atk">⚔️${card.atk}</span>
          <span class="dc-mini-hp">❤️${card.hp}</span>
        </div>
        ${kwHtml ? `<div class="dc-mini-kws">${kwHtml}</div>` : ''}
      `;
      if (canPlay) {
        handCard.addEventListener('click', () => {
          DC_BATTLE_STATE = dcPlayCard(DC_BATTLE_STATE, cardId);
          DC_SELECTED_ATTACKER = null;
          setTab('market');
        });
      } else {
        handCard.title = card.cost > mana.current
          ? `Mana insufficiente (${card.cost} richiesto)`
          : 'Campo pieno!';
      }
      handWrap.appendChild(handCard);
    });
  }
  c.appendChild(handWrap);

  // ── Azioni ────────────────────────────────────────────────
  const actBar = el('div', 'dc-action-bar');
  const endBtn = el('button', 'btn btn-primary dc-end-turn-btn', '⏭️ Fine Turno');
  endBtn.addEventListener('click', () => {
    DC_BATTLE_STATE = dcEndHeroTurn(DC_BATTLE_STATE);
    DC_SELECTED_ATTACKER = null;
    setTab('market');
  });
  const quitBtn = el('button', 'btn dc-battle-quit', '🏳️ Abbandona');
  quitBtn.addEventListener('click', () => {
    DC_BATTLE_STATE = null; DC_SELECTED_ATTACKER = null;
    DC_VIEW = 'boss_select'; setTab('market');
  });
  actBar.appendChild(endBtn);
  actBar.appendChild(quitBtn);
  c.appendChild(actBar);
}

function renderAntroBestiaView(c)    { _antroComingSoon(c, ANTRO_SECTIONS[1]); }
function renderAntroTrofeiView(c)    { _antroComingSoon(c, ANTRO_SECTIONS[2]); }
function renderAntroForgiaView(c)    { _antroComingSoon(c, ANTRO_SECTIONS[3]); }
function renderAntroDungeonView(c)   { _antroComingSoon(c, ANTRO_SECTIONS[4]); }
function renderAntroLeggendaView(c)  { _antroComingSoon(c, ANTRO_SECTIONS[5]); }

function npcBanner(imgPath, name, quote) {
  const b = el('div', 'npc-banner');
  const img = el('img', 'npc-img');
  img.loading = 'eager';
  img.src = imgPath;
  img.addEventListener('error', () => img.remove());
  b.appendChild(img);
  b.appendChild(el('div', 'npc-quote', `<b>${name}</b><br><span class="small">${quote}</span>`));
  return b;
}

function _borgoSubView(c, headerSrc, title, renderFn) {
  const backBtn = el('button', 'view-back-link', '‹ Il Borgo');
  backBtn.addEventListener('click', () => { MARKET_VIEW = 'hub'; setTab('market'); });
  c.appendChild(backBtn);
  const hImg = document.createElement('img');
  hImg.src = headerSrc;
  hImg.alt = '';
  hImg.className = 'borgo-sub-header';
  hImg.onerror = () => hImg.remove();
  c.appendChild(hImg);
  c.appendChild(el('h2', 'section-title', title));
  renderFn(c);
}

function renderStallaView(c)    { _borgoSubView(c, 'assets/ui/header stalla.webp',        ptIcon('assets/ui/borgo/stalla.webp',       'La Stalla',       '🐴'), renderStalla); }
function renderNeroView(c)      { _borgoSubView(c, 'assets/ui/header contrabbando.webp',   ptIcon('assets/ui/borgo/mercato-nero.webp', 'Il Mercato Nero', '🕯️'), renderNero); }
function renderFucinaView(c)    { _borgoSubView(c, 'assets/ui/header fucina.webp',         ptIcon('assets/ui/borgo/fucina.webp',       'La Fucina',       '⚒️'), renderFucina); }
function renderErboristaView(c) { _borgoSubView(c, 'assets/header bazar.webp',             ptIcon('assets/ui/borgo/bazar.webp',        'Il Bazar',        '🧪'), renderErborista); }

/* ══════════════════════════════════════════════════════════
   CARTOMANTE — Tenda del Fato
   ══════════════════════════════════════════════════════════ */

function _cartBack(view) {
  const btn = el('button', 'view-back-link', view === 'hub' ? '‹ Il Borgo' : '‹ La Cartomante');
  btn.addEventListener('click', () => { MARKET_VIEW = view; setTab('market'); });
  return btn;
}

function renderCartomanteView(c) {
  RPG.cartReset(HERO);
  c.appendChild(_cartBack('hub'));

  const hImg = document.createElement('img');
  hImg.src = 'assets/cartomante/header-cartomante.jpg';
  hImg.alt = ''; hImg.className = 'borgo-sub-header';
  hImg.onerror = () => hImg.remove();
  c.appendChild(hImg);

  c.appendChild(el('h2', 'section-title', ptIcon('assets/ui/borgo/cartomante.webp', 'La Tenda del Fato', '🔮')));

  // NPC banner
  c.appendChild(npcBanner('assets/cartomante/cartomante-npc.webp', 'La Cartomante',
    '«Le stelle non mentono. Entrate, se avete il coraggio di sapere cosa vi riserva il destino.»'));

  // Fiches balance
  const bal = el('div', 'cart-balance-bar');
  bal.innerHTML = `<span class="cart-bal-label">${FICHE_ICO} Le tue Fiches del Fato:</span> <b class="cart-bal-num">${HERO.fiches||0}</b>`;
  c.appendChild(bal);

  c.appendChild(el('p', 'muted small center',
    'Le Fiches si guadagnano vincendo al <b>Lascio o Raddoppio</b> dopo ogni allenamento.'));

  // 5 station cards
  const stations = [
    { key: 'ruota',  emoji: '🎡', title: 'Ruota del Fato',         img: 'assets/cartomante/ruota-header.webp',  ico: 'assets/cartomante/ico-ruota.webp',
      desc: `Girala: il primo giro ogni giorno è gratis. I successivi costano 15 ${FICHE_ICO}.`,
      badge: (() => { const s = HERO.cartomante && HERO.cartomante.ruotaSpins || 0; return s === 0 ? '✨ Giro gratis!' : `🎡 ${s} giri oggi`; })() },
    { key: 'pozzo',  emoji: '🌀', title: 'Pozzo delle Evocazioni',  img: 'assets/cartomante/pozzo-header.webp',  ico: 'assets/cartomante/ico-pozzo.webp',
      desc: `Estrai un oggetto casuale dal Pozzo. Costa ${RPG.POZZO_COST} ${FICHE_ICO} a evocazione.`,
      badge: `${FICHE_ICO} ${RPG.POZZO_COST} per pull` },
    { key: 'catena', emoji: '⛓️', title: 'Catena del Fato',         img: 'assets/cartomante/catena-header.webp', ico: 'assets/cartomante/ico-catena.webp',
      desc: 'Accumula oro e fiches ad ogni anello. Incassa quando vuoi — o rischia di perdere tutto.',
      badge: (() => { const done = HERO.cartomante && HERO.cartomante.catenaDone; const step = HERO.cartomante && HERO.cartomante.catenaStep || 0; return done ? '✅ Completata oggi' : step > 0 ? `⛓️ Anello ${step}` : '⛓️ Disponibile'; })() },
    { key: 'casse',  emoji: '📦', title: 'Casse Chiuse',            img: 'assets/cartomante/casse-header.webp',  ico: 'assets/cartomante/ico-casse.webp',
      desc: `Tre casse con ricompense crescenti. Ogni chiave costa Fiches del Fato.`,
      badge: `${FICHE_ICO} 20 / 40 / 80` },
  ];

  stations.forEach(({ key, emoji, title, img, ico, desc, badge }) => {
    const card = el('div', 'panel borgo-entry-panel cart-station-card');
    const thumb = document.createElement('img');
    thumb.loading = 'lazy'; thumb.src = img; thumb.alt = '';
    thumb.className = 'borgo-entry-header'; thumb.onerror = () => thumb.remove();
    card.appendChild(thumb);
    const icoHtml = ico
      ? `<img class="station-ico" src="${ico}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'">\
<span class="station-ico-fallback">${emoji}</span>`
      : emoji;
    card.appendChild(el('h3', 'panel-title', `${icoHtml} ${title}`));
    card.appendChild(el('p', 'muted small borgo-entry-quote', desc));
    card.appendChild(el('div', 'cart-station-badge', badge));
    const btn = el('button', 'btn btn-primary wide', `${emoji} Gioca`);
    btn.addEventListener('click', () => { MARKET_VIEW = key; setTab('market'); });
    card.appendChild(btn);
    c.appendChild(card);
  });

  // L/R teaser
  const lr = el('div', 'panel cart-lr-teaser');
  lr.innerHTML = `
    <div class="cart-lr-teaser-inner">
      <img class="cart-lr-icon" src="assets/cartomante/fiche-del-fato.webp" onerror="this.style.display='none'">
      <div>
        <b>🎴 Lascio o Raddoppio</b><br>
        <span class="small muted">Si attiva automaticamente dopo ogni allenamento. Vinci: +5 Fiches. Perdi: addio all'oro di quella sessione.</span>
      </div>
    </div>`;
  c.appendChild(lr);
}

/* ── Ruota del Fato — SVG (nessun canvas, nessun checkerboard su iOS Safari) ── */
function _makeSectorPath(cx, cy, r, startDeg, endDeg) {
  const s = startDeg * Math.PI / 180, e = endDeg * Math.PI / 180;
  const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
  return `M${cx},${cy}L${x1},${y1}A${r},${r},0,${(endDeg - startDeg) > 180 ? 1 : 0},1,${x2},${y2}Z`;
}

function _buildWheelSVG(size) {
  const NS = 'http://www.w3.org/2000/svg';
  const cx = size / 2, cy = size / 2;
  const R = cx - 5, innerR = R - 16;
  const sectors = RPG.RUOTA_SECTORS;
  const total = sectors.reduce((s, x) => s + x.weight, 0);

  function svgEl(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  }

  const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size });
  svg.classList.add('ruota-svg');

  const defs = svgEl('defs', {});
  const bgG = svgEl('radialGradient', { id: 'rwbg' });
  [['0%','#1e0845'],['75%','#0d0128'],['100%','#050010']].forEach(([o,c]) => {
    bgG.appendChild(svgEl('stop', { offset: o, 'stop-color': c }));
  });
  defs.appendChild(bgG);
  const hubG = svgEl('radialGradient', { id: 'rwhub' });
  [['0%','#3d1f08'],['100%','#150600']].forEach(([o,c]) => {
    hubG.appendChild(svgEl('stop', { offset: o, 'stop-color': c }));
  });
  defs.appendChild(hubG);
  svg.appendChild(defs);

  svg.appendChild(svgEl('circle', { cx, cy, r: R + 2, fill: 'url(#rwbg)' }));

  const g = svgEl('g', { id: 'rwg', transform: `rotate(0,${cx},${cy})` });
  svg.appendChild(g);

  let cumAngle = -90;
  sectors.forEach((sector, i) => {
    const sliceDeg = (sector.weight / total) * 360;
    const endAngle = cumAngle + sliceDeg;
    g.appendChild(svgEl('path', {
      d: _makeSectorPath(cx, cy, innerR, cumAngle, endAngle),
      fill: sector.color, 'data-idx': i
    }));
    const lrad = cumAngle * Math.PI / 180;
    g.appendChild(svgEl('line', {
      x1: cx, y1: cy,
      x2: cx + innerR * Math.cos(lrad), y2: cy + innerR * Math.sin(lrad),
      stroke: 'rgba(255,215,80,0.45)', 'stroke-width': '1.2'
    }));
    const midAngle = cumAngle + sliceDeg / 2;
    const mrad = midAngle * Math.PI / 180;
    const tg = svgEl('g', {
      transform: `translate(${cx + innerR * 0.62 * Math.cos(mrad)},${cy + innerR * 0.62 * Math.sin(mrad)}) rotate(${midAngle + 90})`
    });
    const parts = sector.label.split(' ');
    const t1 = svgEl('text', { 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': 'serif', 'font-size': '13', fill: 'rgba(235,220,190,0.92)', y: parts[1] ? '-8' : '0' });
    t1.textContent = parts[0];
    tg.appendChild(t1);
    if (parts[1]) {
      const t2 = svgEl('text', { 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': 'system-ui,sans-serif', 'font-weight': 'bold', 'font-size': '9', fill: 'rgba(235,220,190,0.92)', y: '7' });
      t2.textContent = parts.slice(1).join(' ');
      tg.appendChild(t2);
    }
    g.appendChild(tg);
    cumAngle = endAngle;
  });

  const hl = svgEl('path', { fill: 'rgba(255,255,255,0.2)', display: 'none' });
  g.appendChild(hl);

  [[R,'rgba(232,182,76,0.92)','5'],[R-9,'rgba(200,150,50,0.4)','1.5'],[innerR,'rgba(255,215,80,0.3)','1']]
    .forEach(([r,stroke,sw]) => svg.appendChild(svgEl('circle', { cx, cy, r, fill: 'none', stroke, 'stroke-width': sw })));

  svg.appendChild(svgEl('circle', { cx, cy, r: 22, fill: 'url(#rwhub)', stroke: 'rgba(232,182,76,0.95)', 'stroke-width': '2.5' }));
  const ht = svgEl('text', { x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': 'serif', 'font-size': '16', fill: '#f0b030' });
  ht.textContent = '✦';
  svg.appendChild(ht);

  svg._sg = g; svg._hl = hl;
  svg._cx = cx; svg._cy = cy; svg._innerR = innerR;
  return svg;
}

function _setWheelAngle(svg, angleDeg, landedIdx) {
  svg._sg.setAttribute('transform', `rotate(${angleDeg},${svg._cx},${svg._cy})`);
  if (landedIdx >= 0) {
    const sectors = RPG.RUOTA_SECTORS;
    const total = sectors.reduce((s, x) => s + x.weight, 0);
    let a = -90;
    for (let i = 0; i < landedIdx; i++) a += (sectors[i].weight / total) * 360;
    const slice = (sectors[landedIdx].weight / total) * 360;
    svg._hl.setAttribute('d', _makeSectorPath(svg._cx, svg._cy, svg._innerR, a, a + slice));
    svg._hl.removeAttribute('display');
  } else {
    svg._hl.setAttribute('display', 'none');
  }
}

function renderRuotaView(c) {
  RPG.cartReset(HERO);
  c.appendChild(_cartBack('cartomante'));
  c.appendChild(el('h2', 'section-title', '🎡 Ruota del Fato'));

  const spins = HERO.cartomante.ruotaSpins || 0;
  const cost  = spins === 0 ? 0 : 15;

  const fichesBar = el('div', 'cart-balance-bar');
  fichesBar.innerHTML = `${FICHE_ICO} <b id="ruota-fiches">${HERO.fiches||0}</b> Fiches &nbsp;·&nbsp; ${spins === 0 ? '<span class="cart-free-badge">1° giro gratis!</span>' : `Giri oggi: <b>${spins}</b> · Costo: 15 ${FICHE_ICO}`}`;
  c.appendChild(fichesBar);

  const outerWrap = el('div', 'ruota-outer-wrap');
  const pointer   = el('div', 'ruota-pointer');
  outerWrap.appendChild(pointer);
  const wheelWrap = el('div', 'ruota-canvas-wrap');
  const wsvg = _buildWheelSVG(300);
  wheelWrap.appendChild(wsvg);
  const frameOverlay = el('img', 'ruota-frame-overlay');
  frameOverlay.src = 'assets/cartomante/ruota-frame.webp';
  frameOverlay.alt = '';
  wheelWrap.appendChild(frameOverlay);
  outerWrap.appendChild(wheelWrap);
  c.appendChild(outerWrap);

  let currentAngle = 0, rafId = null;
  _setWheelAngle(wsvg, currentAngle, -1);

  const resultArea = el('div', 'ruota-result-area'); resultArea.id = 'ruota-result';
  c.appendChild(resultArea);

  const spinBtn = el('button', 'btn btn-primary wide ruota-spin-btn',
    cost === 0 ? '🎡 Gira la Ruota! (Gratis)' : `🎡 Gira la Ruota! (${cost} ${FICHE_ICO})`);
  spinBtn.disabled = cost > 0 && (HERO.fiches || 0) < cost;
  c.appendChild(spinBtn);

  const sectors = RPG.RUOTA_SECTORS;
  const total   = sectors.reduce((s, x) => s + x.weight, 0);

  spinBtn.addEventListener('click', () => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    const res = RPG.spinRuota(HERO);
    persist(); renderHUD();

    if (res.error === 'no_fiches') {
      resultArea.innerHTML = `<div class="ruota-result-box ruota-lose">${FICHE_ICO} Fiches insufficienti! Servono ${res.cost}.</div>`;
      return;
    }
    spinBtn.disabled = true;
    resultArea.innerHTML = `<div class="ruota-spinning">✨ La ruota del fato gira…</div>`;

    let cumW = 0;
    for (let i = 0; i < res.idx; i++) cumW += sectors[i].weight;
    const targetBase  = (360 - (cumW + sectors[res.idx].weight / 2) / total * 360 + 360) % 360;
    const currBase    = currentAngle % 360;
    const spinAmount  = 1440 + (targetBase - currBase + 360) % 360;
    const startAngle  = currentAngle;
    const duration    = 3600;
    const t0          = performance.now();

    function animate(now) {
      const t      = Math.min((now - t0) / duration, 1);
      const eased  = 1 - Math.pow(1 - t, 4);
      currentAngle = startAngle + spinAmount * eased;
      _setWheelAngle(wsvg, currentAngle, -1);
      if (t < 1) { rafId = requestAnimationFrame(animate); return; }
      rafId = null;
      _setWheelAngle(wsvg, currentAngle, res.idx);

      const rw = res.reward;
      let rewardText = '';
      if (rw.jackpot)    rewardText = `<b>⭐ JACKPOT!</b> +${rw.gold} 🪙 +${rw.fiches} ${FICHE_ICO}`;
      else if (rw.gold)  rewardText = `+${rw.gold} 🪙 Oro`;
      else if (rw.fiches)rewardText = `+${rw.fiches} ${FICHE_ICO} Fiches`;
      else if (rw.wood)  rewardText = `+${rw.wood} 🌲 Legna`;
      else if (rw.item)  rewardText = `🎁 ${esc(rw.item.name)} (${rw.item.rarity})`;
      else               rewardText = '💨 Il vento ti ha voltato le spalle.';

      const isGood = !rw.nothing;
      resultArea.innerHTML = `<div class="ruota-result-box ${isGood ? 'ruota-win' : 'ruota-nothing'}">
        <div class="ruota-sector-name">${res.sector.label}</div>
        <div class="ruota-reward-text">${rewardText}</div>
      </div>`;

      if (isGood) { sfx('coin'); vibrate([80, 40, 120]); }
      if (rw.jackpot) vibrate([200, 100, 200, 100, 300]);

      const fichesEl = document.getElementById('ruota-fiches');
      if (fichesEl) fichesEl.textContent = HERO.fiches || 0;

      const newBtn = el('button', 'btn btn-primary wide ruota-spin-btn', `🎡 Gira ancora (15 ${FICHE_ICO})`);
      newBtn.disabled = (HERO.fiches || 0) < 15;
      newBtn.addEventListener('click', () => { MARKET_VIEW = 'ruota'; setTab('market'); });
      c.appendChild(newBtn);
    }
    rafId = requestAnimationFrame(animate);
  });
}

/* ── Pozzo delle Evocazioni — Canvas ── */
function _drawPozzo(canvas, phase, rarColor) {
  const ctx = canvas.getContext('2d');
  const dpr = canvas._dpr || 1;
  const S   = canvas.width / dpr;
  const cx  = S / 2, cy = S / 2, R = S / 2 - 5;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  bg.addColorStop(0,   '#030c1c');
  bg.addColorStop(0.55,'#01060e');
  bg.addColorStop(1,   '#000407');
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = bg; ctx.fill();

  [R*0.84, R*0.67, R*0.50, R*0.34, R*0.19].forEach((r, i) => {
    const alpha = 0.38 - i * 0.05;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${20+i*12},${60+i*18},${180+i*12},${alpha})`;
    ctx.lineWidth = i === 0 ? 2 : 1.2; ctx.stroke();
  });

  // Rune markers
  const runes = ['◈','⊕','◉','⊗','◈','⊕','◉','⊗'];
  runes.forEach((r, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    ctx.font = '11px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(50,110,220,0.55)';
    ctx.fillText(r, cx + R * 0.76 * Math.cos(a), cy + R * 0.76 * Math.sin(a));
  });

  // Inner glow
  const gc = rarColor || '#1a4aff';
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.46);
  glow.addColorStop(0, phase === 'done' ? gc + 'aa' : 'rgba(25,65,210,0.55)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = glow; ctx.fill();

  // Center symbol
  ctx.font = `${Math.round(R * 0.36)}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = phase === 'done' ? gc : '#1a4aff';
  ctx.shadowBlur = phase === 'pulling' ? 30 : 16;
  ctx.fillStyle = phase === 'done' ? '#fff' : 'rgba(80,140,255,0.85)';
  ctx.fillText('🌀', cx, cy + 2);
  ctx.shadowBlur = 0;

  // Outer rings
  const og = ctx.createLinearGradient(cx-R, cy-R, cx+R, cy+R);
  og.addColorStop(0, 'rgba(35,75,200,0.88)'); og.addColorStop(0.5,'rgba(75,45,200,0.88)'); og.addColorStop(1,'rgba(35,75,200,0.88)');
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = og; ctx.lineWidth = 5; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, R - 9, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(55,95,200,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
}

function renderPozzoView(c) {
  RPG.cartReset(HERO);
  c.appendChild(_cartBack('cartomante'));
  c.appendChild(el('h2', 'section-title', '🌀 Il Pozzo delle Evocazioni'));

  const bal = el('div', 'cart-balance-bar');
  bal.innerHTML = `${FICHE_ICO} <b id="pozzo-fiches">${HERO.fiches||0}</b> Fiches &nbsp;·&nbsp; Costo: <b>${RPG.POZZO_COST}</b> ${FICHE_ICO} per evocazione`;
  c.appendChild(bal);

  const pozzoWrap = el('div', 'pozzo-wrap');
  const pozzoImg = document.createElement('img');
  pozzoImg.src = 'assets/cartomante/pozzo.webp';
  pozzoImg.className = 'pozzo-bg-img';
  pozzoImg.alt = 'Pozzo delle Evocazioni';
  pozzoWrap.appendChild(pozzoImg);
  const pozzoSymbol = el('div', 'pozzo-center-symbol', '🌀');
  pozzoWrap.appendChild(pozzoSymbol);
  c.appendChild(pozzoWrap);

  c.appendChild(el('p', 'muted small center',
    'Comune 50% · Non comune 28% · Raro 14% · Epico 6% · Leggendario 2%'));

  const resultArea = el('div', 'pozzo-result'); resultArea.id = 'pozzo-result';
  c.appendChild(resultArea);

  const rarColor = { comune: '#8a7a5f', 'non comune': '#2e6fb0', raro: '#2e6fb0', epico: '#7b3fbf', leggendario: '#d9822b' };

  const pullBtn = el('button', 'btn btn-primary wide', `🌀 Evoca! (${RPG.POZZO_COST} ${FICHE_ICO})`);
  pullBtn.disabled = (HERO.fiches || 0) < RPG.POZZO_COST;
  c.appendChild(pullBtn);

  pullBtn.addEventListener('click', () => {
    pullBtn.disabled = true;
    pozzoImg.classList.add('pozzo-bg-img--pulling');
    pozzoSymbol.style.textShadow = '0 0 24px #3a8fff, 0 0 48px #3a8fff';
    pozzoSymbol.style.transform = 'translate(-50%, -52%) scale(1.15)';
    resultArea.innerHTML = `<div class="pozzo-pulling">✨ Le energie del Pozzo si raccolgono…</div>`;

    setTimeout(() => {
      const res = RPG.pullPozzo(HERO);
      persist(); renderHUD();
      pozzoImg.classList.remove('pozzo-bg-img--pulling');

      if (res.error === 'no_fiches') {
        pozzoSymbol.style.textShadow = '0 0 18px #1a4aff, 0 0 36px #1a4aff';
        pozzoSymbol.style.transform = 'translate(-50%, -52%)';
        resultArea.innerHTML = `<div class="pozzo-empty">${FICHE_ICO} Fiches insufficienti! Servono ${res.cost}.</div>`;
        return;
      }
      const { item, rarity } = res;
      const col = rarColor[rarity] || '#8a7a5f';
      pozzoSymbol.style.textShadow = `0 0 22px ${col}, 0 0 44px ${col}`;
      pozzoSymbol.style.transform = 'translate(-50%, -52%)';
      resultArea.innerHTML = `
        <div class="pozzo-result-card" style="border-color:${col}">
          <div class="pozzo-rarity-label" style="color:${col}">${rarity.toUpperCase()}</div>
          ${itemHtml(item)}
        </div>`;
      sfx('coin');
      if (rarity === 'leggendario' || rarity === 'epico') vibrate([200, 100, 200, 100, 300]);
      else vibrate([80, 40, 120]);

      const fichesEl = document.getElementById('pozzo-fiches');
      if (fichesEl) fichesEl.textContent = HERO.fiches || 0;

      const again = el('button', 'btn btn-primary wide', `🌀 Evoca ancora (${RPG.POZZO_COST} ${FICHE_ICO})`);
      again.disabled = (HERO.fiches || 0) < RPG.POZZO_COST;
      again.addEventListener('click', () => { MARKET_VIEW = 'pozzo'; setTab('market'); });
      c.appendChild(again);
    }, 1800);
  });
}

/* ── Catena del Fato ── */
function renderCatenaView(c) {
  RPG.cartReset(HERO);
  c.appendChild(_cartBack('cartomante'));

  const hImg = document.createElement('img');
  hImg.src = 'assets/cartomante/header-cartomante.jpg';
  hImg.alt = ''; hImg.className = 'borgo-sub-header'; hImg.onerror = () => hImg.remove();
  c.appendChild(hImg);

  c.appendChild(el('h2', 'section-title', '⛓️ La Catena del Fato'));

  const catenaCardsImg = document.createElement('img');
  catenaCardsImg.src = 'assets/cartomante/carte-catena.webp';
  catenaCardsImg.className = 'catena-cards-img'; catenaCardsImg.onerror = () => catenaCardsImg.remove();
  c.appendChild(catenaCardsImg);

  const cart = HERO.cartomante;
  const step  = cart.catenaStep || 0;
  const done  = cart.catenaDone;

  const bal = el('div', 'cart-balance-bar');
  bal.innerHTML = `🪙 <b id="catena-gold">${HERO.gold}</b> &nbsp;·&nbsp; ${FICHE_ICO} <b id="catena-fiches">${HERO.fiches||0}</b>`;
  c.appendChild(bal);

  // Chain progress display
  const chainEl = el('div', 'catena-chain');
  RPG.CATENA_STEPS.forEach((s, i) => {
    const node = el('div', `catena-node${i < step ? ' catena-done' : i === step && !done ? ' catena-current' : ' catena-future'}`);
    node.innerHTML = `<span class="catena-node-num">${i + 1}</span>
      <span class="catena-node-reward">🪙${s.gold}+🎴${s.fiches}</span>
      <span class="catena-node-risk">${Math.round(s.bust * 100)}%💀</span>`;
    chainEl.appendChild(node);
  });
  c.appendChild(chainEl);

  const msgEl = el('div', 'catena-msg'); msgEl.id = 'catena-msg';
  c.appendChild(msgEl);

  if (done) {
    if (cart.catenaBusted) {
      msgEl.innerHTML = step === 0
        ? `<div class="catena-bust">💀 La catena si è spezzata. Torna domani.</div>`
        : `<div class="catena-bust">💀 La catena si è spezzata all'anello ${step + 1}. Niente oro oggi. Torna domani.</div>`;
    } else {
      msgEl.innerHTML = `<div class="catena-cashed">✅ Hai incassato all'anello ${step}. Torna domani!</div>`;
    }
    return;
  }

  const btnRow = el('div', 'catena-btn-row');

  if (step > 0) {
    // Calculate pending total
    let totalG = 0, totalF = 10;
    for (let i = 0; i < step; i++) { totalG += RPG.CATENA_STEPS[i].gold; totalF += RPG.CATENA_STEPS[i].fiches; }
    const cashBtn = el('button', 'btn wide catena-cash-btn', `✋ Incassa (${totalG} 🪙 + ${totalF} 🎴)`);
    cashBtn.addEventListener('click', () => {
      const res = RPG.catenaCashOut(HERO);
      persist(); renderHUD();
      MARKET_VIEW = 'catena'; setTab('market');
      toast(`✋ Incassato! +${res.gold} 🪙 +${res.fiches} 🎴`);
    });
    btnRow.appendChild(cashBtn);
  }

  const rollBtn = el('button', 'btn btn-primary catena-roll-btn',
    step === 0 ? '⛓️ Inizia la Catena' : `⛓️ Avanza (${Math.round(RPG.CATENA_STEPS[step].bust * 100)}% di bust)`);
  rollBtn.addEventListener('click', () => {
    rollBtn.disabled = true;
    if (step > 0 && btnRow.querySelector('.catena-cash-btn')) btnRow.querySelector('.catena-cash-btn').disabled = true;
    const res = RPG.catenaRoll(HERO);
    persist(); renderHUD();

    if (res.busted) {
      msgEl.innerHTML = `<div class="catena-bust">💀 La catena si è spezzata! Niente oro oggi. Torna domani.</div>`;
      document.querySelectorAll('.catena-node').forEach((n, i) => {
        if (i === res.step) n.classList.add('catena-busted');
      });
      vibrate([500]);
    } else {
      if (res.atMax) {
        // Auto cash-out at max step
        const cashRes = RPG.catenaCashOut(HERO);
        persist(); renderHUD();
        msgEl.innerHTML = `<div class="catena-cashed">🏆 Catena completa! +${cashRes.gold} 🪙 +${cashRes.fiches} 🎴</div>`;
        sfx('coin'); vibrate([200, 100, 200, 100, 400]);
      } else {
        msgEl.innerHTML = `<div class="catena-advance">✅ Anello ${res.step + 1} superato! +${res.goldPending} 🪙 +${res.fichesPending} 🎴 in sospeso</div>`;
        sfx('coin'); vibrate([80, 40, 120]);
        // Refresh the view for next roll
        setTimeout(() => { MARKET_VIEW = 'catena'; setTab('market'); }, 1200);
      }
    }
  });
  btnRow.appendChild(rollBtn);
  c.appendChild(btnRow);
}

/* ── Casse Chiuse ── */
function renderCasseView(c) {
  RPG.cartReset(HERO);
  c.appendChild(_cartBack('cartomante'));

  const hImg = document.createElement('img');
  hImg.src = 'assets/cartomante/header-cartomante.jpg';
  hImg.alt = ''; hImg.className = 'borgo-sub-header'; hImg.onerror = () => hImg.remove();
  c.appendChild(hImg);

  c.appendChild(el('h2', 'section-title', '📦 Le Casse Chiuse'));

  const bal = el('div', 'cart-balance-bar');
  bal.innerHTML = `${FICHE_ICO} <b id="casse-fiches">${HERO.fiches||0}</b> Fiches`;
  c.appendChild(bal);

  c.appendChild(el('p', 'muted small center',
    'Ogni cassa contiene ricompense di rarità crescente. Aprine una con le tue Fiches del Fato.'));

  const resultArea = el('div', 'casse-result'); resultArea.id = 'casse-result';
  c.appendChild(resultArea);

  // Hero image of chest+key — shown once at top
  const casseHeroImg = document.createElement('img');
  casseHeroImg.src = 'assets/cartomante/casse.webp';
  casseHeroImg.className = 'casse-hero-img';
  casseHeroImg.onerror = () => casseHeroImg.remove();
  c.appendChild(casseHeroImg);

  RPG.CASSA_TYPES.forEach(ct => {
    const card = el('div', `panel casse-card casse-${ct.id}`);
    card.appendChild(el('h4', 'panel-title', `${ct.emoji} ${ct.name}`));
    card.appendChild(el('div', 'casse-cost', `🗝️ Chiave: ${ct.keyCost} 🎴`));
    const btn = el('button', 'btn btn-primary wide', `${ct.emoji} Apri!`);
    btn.disabled = (HERO.fiches||0) < ct.keyCost;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.casse-card button').forEach(b => b.disabled = true);
      resultArea.innerHTML = `<div class="casse-opening">📦 La cassa si apre…</div>`;
      setTimeout(() => {
        const res = RPG.openCassa(HERO, ct.id);
        persist(); renderHUD();
        if (res.error === 'no_fiches') {
          resultArea.innerHTML = `<div class="casse-opening">🎴 Fiches insufficienti!</div>`;
          return;
        }
        const rw = res.reward;
        let rewardHtml = '';
        if (rw.item) {
          const rarColor = { comune: '#8a7a5f', non_comune: '#2e6fb0', raro: '#2e6fb0', epico: '#7b3fbf', leggendario: '#d9822b' };
          rewardHtml = `<div class="pozzo-result-card" style="border-color:${rarColor[rw.rarity]||'#8a7a5f'}">${itemHtml(rw.item)}</div>`;
        } else if (rw.gold) rewardHtml = `<div class="casse-reward-text">🪙 +${rw.gold} Oro</div>`;
        else if (rw.fiches) rewardHtml = `<div class="casse-reward-text">🎴 +${rw.fiches} Fiches</div>`;

        resultArea.innerHTML = `
          <div class="casse-result-wrap">
            <div class="casse-result-title">${ct.emoji} ${ct.name} — Contenuto:</div>
            ${rewardHtml}
          </div>`;
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        sfx('coin');
        if (rw.item && (rw.rarity === 'leggendario' || rw.rarity === 'epico')) vibrate([200, 100, 300]);
        else vibrate([80, 40, 120]);

        const fichesEl = document.getElementById('casse-fiches');
        if (fichesEl) fichesEl.textContent = HERO.fiches || 0;
        document.querySelectorAll('.casse-card button').forEach((b, bi) => {
          b.disabled = (HERO.fiches||0) < RPG.CASSA_TYPES[bi].keyCost;
        });
      }, 900);
    });
    card.appendChild(btn);
    c.appendChild(card);
  });

  // ── Disclosure probabilità (store compliance) ──────────────────
  const oddsPanel = el('div', 'panel casse-odds-panel');
  oddsPanel.innerHTML = `
    <div class="casse-odds-title">📊 Probabilità di drop</div>
    <div class="casse-odds-table-wrap">
      <table class="casse-odds-table">
        <thead>
          <tr>
            <th>Ricompensa</th>
            <th>🥉 Bronzo</th>
            <th>🥈 Argento</th>
            <th>🥇 Oro</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Oggetto Comune</td>    <td>55%</td> <td>—</td>   <td>—</td></tr>
          <tr><td>Oggetto Non comune</td><td>28%</td> <td>38%</td> <td>—</td></tr>
          <tr><td>Oggetto Raro</td>      <td>7%</td>  <td>32%</td> <td>38%</td></tr>
          <tr><td>Oggetto Epico</td>     <td>—</td>   <td>10%</td> <td>28%</td></tr>
          <tr><td>Oggetto Leggendario</td><td>—</td>  <td>—</td>   <td>12%</td></tr>
          <tr class="casse-odds-alt"><td>Oro / Fiches</td><td>10%</td><td>20%</td><td>22%</td></tr>
        </tbody>
      </table>
    </div>
    <p class="casse-odds-note">Le Fiches sono valuta virtuale di gioco, senza valore reale.</p>`;
  c.appendChild(oddsPanel);
}

function renderStalla(c) {
  c.appendChild(npcBanner('assets/avatars/npc/stalliere.webp', 'Ferro di Vecchio',
    '«Fieno, striglio e pazienza — le bestie lo sentono subito chi ha buon cuore. E anche chi non ce l\'ha.»'));
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

function showItemPreview(it) {
  const sv = RPG.sellValue(HERO, it);
  const warn = it.rarity === 'leggendario' || it.rarity === 'epico'
    ? `<span class="item-preview-warn">⚠️ Oggetto ${RPG.RARITIES[it.rarity].label} — sicuro di venderlo?</span>` : '';
  modal(`
    ${itemHtml(it)}
    <div class="item-preview-val">Ricavi: 🪙 ${sv} monete ${warn}</div>
    <div class="row gap">
      <button class="btn wide" onclick="closeModal()">Annulla</button>
      <button class="btn wide btn-primary" id="btn-confirm-sell">Vendi 🪙${sv}</button>
    </div>
  `);
  $('#btn-confirm-sell').addEventListener('click', () => {
    RPG.sellItem(HERO, it.id);
    persist(); renderHUD();
    vibrate(60);
    toast(`🪙 +${sv} monete!`);
    closeModal();
    setTab('market');
  });
}

function renderNero(c) {
  const nerobanner = npcBanner('assets/avatars/npc/contrabbandiere.webp', 'Ombra Senza Nome',
    '«Non chiedo da dove vengono. Non ti chiedo chi sei. Oro in mano — affare fatto. Sparisci prima dell\'alba.»');
  nerobanner.classList.add('npc-banner-nero');
  c.appendChild(nerobanner);

  // Daily stolen goods: 1 random consumable at 50% off
  {
    const today = todayISO();
    const seed = (s => { let h = 0x9e3779b9; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x9e3779b9); return h >>> 0; })(today + 'nero');
    const buyable = RPG.CONSUMABLES.filter(co => co.rarity !== 'leggendario');
    const pick = buyable[seed % buyable.length];
    const fullPrice = RPG.buyPriceConsumable(pick.id);
    const salePrice = Math.floor(fullPrice * 0.5);
    const neroKey = 'nero-' + today;
    const alreadyBought = HERO.bazarDailyPurchases && HERO.bazarDailyPurchases[neroKey];
    const offerBox = el('div', 'panel nero-offer-panel');
    offerBox.appendChild(el('h3', 'panel-title', '🕯️ Merce di Contrabbando · -50%'));
    const row = el('div', 'mission-row');
    row.appendChild(el('div', 'mission-mid',
      `<span class="res-ico">${pick.icon}</span> <b>${esc(pick.name)}</b> <span class="tag tag-sale">–50%</span><br>
       <span class="small muted">${esc(pick.desc)}</span><br>
       <s class="muted small">🪙${fullPrice}</s> → <b>🪙${salePrice}</b>`));
    const buyBtn = el('button', 'btn btn-small' + (!alreadyBought && HERO.gold >= salePrice ? ' btn-primary' : ''), alreadyBought ? '✅ Acquistato' : `Acquista 🪙${salePrice}`);
    buyBtn.disabled = alreadyBought || HERO.gold < salePrice;
    buyBtn.addEventListener('click', () => {
      if (HERO.gold < salePrice) { toast('Oro insufficiente!'); return; }
      HERO.gold -= salePrice;
      RPG.addConsumable(HERO, pick.id, 1);
      if (!HERO.bazarDailyPurchases) HERO.bazarDailyPurchases = {};
      HERO.bazarDailyPurchases[neroKey] = true;
      persist(); renderHUD();
      toast(`${pick.icon} ${pick.name} acquisito dalla Merce di Contrabbando!`);
      setTab('market');
    });
    row.appendChild(buyBtn);
    offerBox.appendChild(row);
    c.appendChild(offerBox);
  }

  const sellable = HERO.items.filter(i => !Object.values(HERO.equipment).includes(i.id));
  if (!sellable.length) {
    c.appendChild(emptyState('💼', 'Non hai bottini da vendere. Gli oggetti equipaggiati non si toccano!'));
    return;
  }
  // Filtri per rarità
  const rarityOrder = Object.keys(RPG.RARITIES);
  const presentRarities = [...new Set(sellable.map(i => i.rarity))]
    .sort((a, b) => rarityOrder.indexOf(a) - rarityOrder.indexOf(b));
  if (presentRarities.length > 1) {
    if (!presentRarities.includes(NERO_FILTER) && NERO_FILTER !== 'all') NERO_FILTER = 'all';
    const filterRow = el('div', 'nero-filters');
    [['all', `Tutti (${sellable.length})`], ...presentRarities.map(r => [r, RPG.RARITIES[r].label])].forEach(([key, label]) => {
      const chip = el('button', 'nero-chip' + (NERO_FILTER === key ? ' active' : ''), label);
      chip.addEventListener('click', () => { NERO_FILTER = key; setTab('market'); });
      filterRow.appendChild(chip);
    });
    c.appendChild(filterRow);
  }
  const shown = NERO_FILTER === 'all' ? sellable : sellable.filter(i => i.rarity === NERO_FILTER);
  shown.forEach(it => {
    const row = el('div', 'mission-row');
    row.appendChild(el('div', 'mission-mid',
      `${itemIconHtml(it, 'item-icon')} <b>${esc(it.name)}</b> <span class="tag">${RPG.RARITIES[it.rarity].label}</span><br>
       <span class="small muted">+${it.xp}% XP</span>`));
    const sv = RPG.sellValue(HERO, it);
    const btn = el('button', 'btn btn-small btn-primary', `🏷️ ${sv} 🪙`);
    btn.addEventListener('click', () => showItemPreview(it));
    row.appendChild(btn);
    c.appendChild(row);
  });
}

function renderFucina(c) {
  advanceOnboarding(16);
  HERO.forgeSeen = todayISO();
  persist();
  updateBadges();
  c.appendChild(npcBanner('assets/avatars/fabbro.webp', 'Mastro Brontolo',
    '«Batto il ferro dall\'alba, ragazzino. Tre pezzi al giorno, prendere o lasciare. E non toccare l\'incudine!»'));
  const offers = RPG.forgeOffers(HERO);
  const op = el('div', 'panel');
  op.appendChild(el('h3', 'panel-title', '🔥 In vetrina oggi'));
  offers.forEach(o => {
    const bought = () => HERO.items.some(i => i.forgeId === o.id);
    const row = el('div', 'mission-row' + (o.special ? ' special-offer' : ''));
    row.appendChild(el('div', 'mission-mid',
      (o.special ? `<span class="tag tag-sale">🔥 -30% SOLO OGGI · <span data-cd="midnight">…</span></span><br>` : '') +
      `${itemIconHtml(o, 'item-icon')} <b>${esc(o.name)}</b> <span class="tag">${RPG.RARITIES[o.rarity].label}</span><br>
       <span class="small muted">+${o.xp}% XP · ${RPG.SLOTS[o.slot].label}${o.special ? ` · <s>🪙${o.fullPrice}</s>` : ''}</span>`));
    const alreadyBought = bought();
    const btn = el('button', 'btn btn-small' + (!alreadyBought && HERO.gold >= o.price ? ' btn-primary' : ''),
      alreadyBought ? '✅' : `🪙${o.price}`);
    if (alreadyBought) btn.disabled = true;
    btn.addEventListener('click', () => {
      if (bought()) { toast('✅ Già acquistato oggi!'); return; }
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

/* ── Erborista (NPC mercante consumabili) ─────────────────────────────── */
const ERBORISTA_CATS = [
  { id: 'tutti',    label: 'Tutti' },
  { id: 'pozioni',  label: '🍯 Pozioni' },
  { id: 'rune',     label: '🔮 Rune' },
  { id: 'utility',  label: '🧭 Utility' },
  { id: 'materiali',label: '⚒️ Materiali' },
];
let ERBORISTA_CAT = 'tutti';

function _erboristaOffers() {
  /* 3 offerte giornaliere seeded per data, 30% sconto */
  const seed = (s => { let h = 0; for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0; return h >>> 0; })(todayISO());
  const forSale = RPG.CONSUMABLES.filter(c => c.rarity !== 'leggendario');
  const picks = [];
  let s = seed;
  while (picks.length < 3) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const co = forSale[s % forSale.length];
    if (!picks.find(p => p.id === co.id)) picks.push(co);
  }
  return picks.map(co => ({ co, price: Math.floor(RPG.buyPriceConsumable(co.id) * 0.7) }));
}

function renderErborista(c) {
  c.appendChild(npcBanner('assets/avatars/npc/mercante-contrabbando.webp', 'Messer Bilancia',
    '«Ogni oggetto ha il suo giusto peso in monete… la mia bilancia non sbaglia mai. Vendimi pure, qui non si fanno domande.»'));

  /* Offerta del Giorno */
  const offerPanel = el('div', 'panel erborista-offer-panel');
  offerPanel.appendChild(el('h3', 'panel-title', '🌅 Offerta del Giorno · -30%'));
  const offerRow = el('div', 'erborista-offer-row');
  const today = todayISO();
  const dailyPurchases = (HERO.bazarDailyPurchases || {})[today] || {};
  _erboristaOffers().forEach(({ co, price }) => {
    const alreadyBought = !!dailyPurchases[co.id];
    const card = el('div', `consumable-card rarity-${co.rarity} erborista-offer-card`);
    const inner = el('div', 'offer-flip-inner');

    /* Fronte: immagine + nome + prezzo + hint */
    const front = el('div', 'offer-flip-front');
    const imgWrap = el('div', 'consumable-img-wrap');
    const img = el('img', 'consumable-img');
    img.src = `assets/consumables/${encodeURIComponent(RPG.CONSUMABLE_IMG[co.id] || co.id)}.webp`;
    img.alt = co.name;
    img.addEventListener('error', () => { img.style.display = 'none'; imgWrap.appendChild(el('span', 'consumable-emoji', co.icon)); });
    imgWrap.appendChild(img);
    front.appendChild(imgWrap);
    front.appendChild(el('div', 'consumable-name', co.name));
    const priceElF = el('div', 'erborista-offer-price');
    priceElF.innerHTML = `<s>${RPG.buyPriceConsumable(co.id)}🪙</s> <b>${price}🪙</b>`;
    front.appendChild(priceElF);
    front.appendChild(el('div', 'offer-flip-hint', alreadyBought ? '✅ Acquistato' : '👆 Tocca per dettagli'));

    /* Retro: nome + descrizione + prezzo + bottone acquisto */
    const back = el('div', 'offer-flip-back');
    back.appendChild(el('div', 'offer-flip-back-title', co.name));
    if (co.desc) back.appendChild(el('div', 'offer-flip-desc', co.desc));
    const priceElB = el('div', 'erborista-offer-price');
    priceElB.innerHTML = `<s>${RPG.buyPriceConsumable(co.id)}🪙</s> <b>${price}🪙</b>`;
    back.appendChild(priceElB);
    const buyBtn = el('button', `btn btn-primary btn-small`, alreadyBought ? '✅ Acquistato' : 'Acquista');
    buyBtn.disabled = alreadyBought || HERO.gold < price;
    if (!alreadyBought && HERO.gold < price) buyBtn.classList.add('disabled');
    buyBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (alreadyBought) return;
      if (HERO.gold < price) { toast('Oro insufficiente!'); return; }
      HERO.gold -= price; RPG.addConsumable(HERO, co.id, 1);
      if (!HERO.bazarDailyPurchases) HERO.bazarDailyPurchases = {};
      if (!HERO.bazarDailyPurchases[today]) HERO.bazarDailyPurchases[today] = {};
      HERO.bazarDailyPurchases[today][co.id] = true;
      persist(); renderHUD();
      toast(`${co.icon} ${co.name} acquistato in offerta!`);
      setTab('market');
    });
    back.appendChild(buyBtn);

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);
    card.addEventListener('click', () => card.classList.toggle('flipped'));
    offerRow.appendChild(card);
  });
  offerPanel.appendChild(offerRow);
  c.appendChild(offerPanel);

  const sw = el('div', 'coll-switch');
  ERBORISTA_CATS.forEach(cat => {
    const b = el('button', 'coll-btn' + (ERBORISTA_CAT === cat.id ? ' active' : ''), cat.label);
    b.addEventListener('click', () => { ERBORISTA_CAT = cat.id; setTab('market'); });
    sw.appendChild(b);
  });
  c.appendChild(sw);

  // Solo comuni ed epici disponibili per l'acquisto (leggendari mai)
  const forSale = RPG.CONSUMABLES.filter(co =>
    co.rarity !== 'leggendario' &&
    (ERBORISTA_CAT === 'tutti' || co.cat === ERBORISTA_CAT)
  );

  const grid = el('div', 'consumable-grid');
  forSale.forEach(co => {
    const price = RPG.buyPriceConsumable(co.id);
    const qty   = (HERO.consumables || {})[co.id] || 0;
    const card  = el('div', `consumable-card rarity-${co.rarity}`);
    const imgWrap = el('div', 'consumable-img-wrap');
    const img = el('img', 'consumable-img');
    img.src = `assets/consumables/${encodeURIComponent(RPG.CONSUMABLE_IMG[co.id] || co.id)}.webp`;
    img.alt = co.name;
    img.addEventListener('error', () => { img.style.display = 'none'; imgWrap.appendChild(el('span', 'consumable-emoji', co.icon)); });
    imgWrap.appendChild(img);
    card.appendChild(imgWrap);
    card.appendChild(el('div', 'consumable-name', co.name));
    card.appendChild(el('div', 'consumable-desc muted small', co.desc));
    if (qty > 0) card.appendChild(el('span', 'consumable-qty', `×${qty} in sacca`));
    const buyBtn = el('button', `btn btn-primary btn-small${HERO.gold < price ? ' disabled' : ''}`, `${price} 🪙`);
    buyBtn.disabled = HERO.gold < price;
    buyBtn.addEventListener('click', () => {
      if (HERO.gold < price) { toast('Oro insufficiente!'); return; }
      HERO.gold -= price;
      RPG.addConsumable(HERO, co.id, 1);
      persist(); renderHUD();
      toast(`${co.icon} ${co.name} acquistato!`);
      setTab('market');
    });
    card.appendChild(buyBtn);
    grid.appendChild(card);
  });
  c.appendChild(grid);

  // Sezione Esche da Pesca
  const baitPrices = { fungo: 60, osso: 90, amo_arg: 180, cristallo: 400 };
  const baitPanel = el('div', 'panel erborista-bait-panel');
  baitPanel.appendChild(el('h3', 'panel-title', '🎣 Esche da Pesca'));
  baitPanel.appendChild(el('p', 'muted small', 'Usate nella Taverna delle Sfide · Pesca nel Fossato. Ogni esca si consuma dopo la pescata.'));
  const baitGrid = el('div', 'bait-shop-grid');
  RPG.BAITS.filter(b => b.id !== 'lombrico').forEach(b => {
    const price = baitPrices[b.id] || 100;
    const qty   = (HERO.baits || {})[b.id] || 0;
    const card  = el('div', 'bait-shop-card');
    card.innerHTML = `<div class="bait-shop-icon">${b.icon}</div>
      <div class="bait-shop-name">${esc(b.name)}</div>
      <div class="bait-shop-desc muted small">${esc(b.desc)}</div>
      ${qty > 0 ? `<div class="bait-qty">×${qty} in sacca</div>` : ''}`;
    const buyBtn = el('button', `btn btn-primary btn-small${HERO.gold < price ? ' disabled' : ''}`, `${price} 🪙`);
    buyBtn.disabled = HERO.gold < price;
    buyBtn.addEventListener('click', () => {
      if (HERO.gold < price) { toast('Oro insufficiente!'); return; }
      HERO.gold -= price;
      RPG.addBait(HERO, b.id, 1);
      persist(); renderHUD();
      toast(`${b.icon} ${b.name} acquistata!`);
      setTab('market');
    });
    card.appendChild(buyBtn);
    baitGrid.appendChild(card);
  });
  baitPanel.appendChild(baitGrid);
  c.appendChild(baitPanel);
}

