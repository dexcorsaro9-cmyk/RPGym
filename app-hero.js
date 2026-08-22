/* ── TAB: Eroe (equipaggiamento + sottomenù) ── */
let HERO_VIEW = 'main';

function renderHero(c) {
  if (HERO_VIEW === 'cards') { renderCardsView(c); return; }
  if (HERO_VIEW === 'dragon_cards') { renderDragonCardsHeroView(c); return; }
  if (HERO_VIEW === 'bestiary') { renderBestiaryView(c); return; }
  if (HERO_VIEW === 'story') { renderStoryView(c); return; }
  if (HERO_VIEW === 'settings') { renderSettingsView(c); return; }
  if (HERO_VIEW === 'diary')    { renderDiaryView(c);    return; }
  if (HERO_VIEW === 'zaino')    { renderZainoView(c);    return; }
  if (HERO_VIEW === 'sacca')    { renderSaccaView(c);    return; }
  if (HERO_VIEW === 'guida')    { renderGuidaView(c);    return; }
  if (HERO_VIEW === 'cronache') { renderCronacheView(c); return; }
  if (HERO_VIEW === 'campione') { renderCampioneTrophyView(c); return; }

  const titleH2 = el('h2', 'section-title on-parchment-title hero-title-row');
  titleH2.innerHTML = ptIcon('assets/ui/eroe/equipaggiamento.webp', 'Equipaggiamento', '🛡️');
  const settingsBtn = el('button', 'hero-settings-btn', '⚙️');
  settingsBtn.title = 'Impostazioni';
  settingsBtn.addEventListener('click', () => { HERO_VIEW = 'settings'; setTab('hero'); });
  titleH2.appendChild(settingsBtn);
  c.appendChild(titleH2);

  // Eroe: 3 slot sx, avatar al centro, 3 slot dx + seme/consumabile sotto
  const rig = el('div', 'hero-rig');
  const leftCol = el('div', 'slot-col');
  const rightCol = el('div', 'slot-col');
  const equipSlots = ['arma', 'scudo', 'elmo', 'armatura', 'anello', 'amuleto'];
  const leftSlots  = equipSlots.slice(0, 3);
  const rightSlots = equipSlots.slice(3);

  const EMPTY_SLOT_IMG = {
    elmo: 'assets/ui/eroe/slot_elmo.webp',
    armatura: 'assets/ui/eroe/slot_armatura.webp',
    arma: 'assets/ui/eroe/slot_arma.webp',
    scudo: 'assets/ui/eroe/slot_scudo.webp',
    anello: 'assets/ui/eroe/slot_anello.webp',
    amuleto: 'assets/ui/eroe/slot_amuleto.webp',
    seme: 'assets/ui/eroe/seme.webp',
    consumabile: 'assets/ui/eroe/consumabile-slot.webp',
  };
  const makeSlot = key => {
    const s = RPG.SLOTS[key];
    const itemId = HERO.equipment[key];
    const item = HERO.items.find(i => i.id === itemId);
    const slot = el('button', 'equip-slot' + (item ? ' filled rar-border-' + item.rarity : ''));
    if (item) {
      slot.innerHTML = `${itemIconHtml(item, 'equip-img')}<span class="equip-label">+${item.xp}%</span>`;
    } else if (EMPTY_SLOT_IMG[key]) {
      slot.innerHTML = `<img class="equip-icon-img empty" src="${EMPTY_SLOT_IMG[key]}"><span class="equip-label">${s.label}</span>`;
    } else {
      slot.innerHTML = `<span class="equip-icon empty">${s.icon}</span><span class="equip-label">${s.label}</span>`;
    }
    slot.addEventListener('click', () => openSlotPicker(key));
    return slot;
  };
  const makeReliquiaSlot = () => {
    const heroLv = HERO.level || 1;
    const unlocked = heroLv >= 71;
    const equipped = (HERO.equipment || {}).reliquia;
    const relicItem = equipped ? (HERO.items || []).find(i => i.id === equipped) : null;
    const slot = el('button', 'equip-slot reliquia-slot' + (relicItem ? ' filled rar-border-leggendario' : '') + (!unlocked ? ' reliquia-locked' : ''));
    if (!unlocked) {
      slot.innerHTML = `<span class="equip-icon empty">🔒</span><span class="equip-label">Reliquia<br><span class="reliquia-lv">Lv 71</span></span>`;
      slot.disabled = true;
    } else if (relicItem) {
      slot.innerHTML = `<img class="equip-img" src="${relicItem.img || ''}" onerror="this.outerHTML='<span class=equip-icon>${relicItem.icon||'🏺'}</span>'"><span class="equip-label">${esc(relicItem.name)}</span>`;
      slot.addEventListener('click', () => openReliquiaPicker());
    } else {
      slot.innerHTML = `<span class="equip-icon empty">🏺</span><span class="equip-label">Reliquia</span>`;
      slot.addEventListener('click', () => openReliquiaPicker());
    }
    return slot;
  };
  leftSlots.forEach(k => leftCol.appendChild(makeSlot(k)));
  rightSlots.forEach(k => rightCol.appendChild(makeSlot(k)));

  const center = el('div', 'hero-center');
  const heroCls = isImageAvatar(HERO)
    ? 'hero-fullbody hero-fullbody-big hero-idle'
    : 'hero-avatar hero-idle';
  const av = avatarWithFrameEl(HERO, heroCls);
  center.appendChild(av);
  rig.appendChild(leftCol);
  rig.appendChild(center);
  rig.appendChild(rightCol);
  c.appendChild(rig);

  // Slot seme + consumabile + reliquia sotto i piedi
  const bottomSlots = el('div', 'hero-bottom-slots');
  ['seme', 'consumabile'].forEach(k => bottomSlots.appendChild(makeSlot(k)));
  bottomSlots.appendChild(makeReliquiaSlot());
  c.appendChild(bottomSlots);

  c.appendChild(el('h3', 'hero-name-plate center', esc(HERO.name)));
  const mount = HERO.mount ? RPG.mountById(HERO.mount) : null;
  const customTitleCos = HERO.customTitle ? RPG.seasonPassCosmeticById(HERO.customTitle) : null;
  if (customTitleCos) c.appendChild(el('p', 'center small sp-custom-title', `${customTitleCos.icon} ${esc(customTitleCos.name)}`));
  c.appendChild(el('p', 'hero-title-plate center',
    `Livello ${HERO.level} — ${RPG.heroTitle(HERO.level)}` +
    (mount ? ` · <img class="panel-title-icon" src="assets/ui/eroe/cavalcatura.webp" onerror="this.outerHTML='${mount.emoji}'">` : '') +
    (HERO.companion ? ` · <img class="panel-title-icon" src="assets/ui/eroe/lupo.webp" onerror="this.outerHTML='🐺'">` : '')));
  const bonus = RPG.equipmentXpBonus(HERO);
  c.appendChild(el('p', 'center small equip-total', bonus > 0
    ? ptIcon('assets/ui/eroe/bonus-equip.webp', `Bonus equipaggiamento: <b>+${bonus}% XP</b>`, '⚡')
    : 'Tocca gli slot per equipaggiare il tuo bottino'));
  const talent = RPG.talentOf(HERO);
  if (talent) c.appendChild(el('p', 'center small talent-line',
    `${talent.icon} Talento: <b>${talent.name}</b> — ${talent.desc}`));

  // Titolo PvP
  const pt = pvpTitle(HERO.pvpWins || 0);
  if (pt) {
    const ptWrap = el('div', 'center');
    const ptEl = el('span', 'pvp-badge-profile');
    ptEl.innerHTML = `${ptIcon('assets/ui/eroe/leggenda-sfide.webp', '', pt.icon)} <b>${pt.label}</b> &nbsp;·&nbsp; ${ptIcon('assets/ui/eroe/vittorie.webp', '', '⚔️')} ${HERO.pvpWins} ${HERO.pvpWins === 1 ? 'vittoria' : 'vittorie'}`;
    ptWrap.appendChild(ptEl);
    c.appendChild(ptWrap);
  }

  // Box Consumabili
  const consCount = Object.values(HERO.consumables || {}).reduce((s, q) => s + q, 0);
  const activeBuff = HERO.consumableBuffs && (
    HERO.consumableBuffs.xpMult || HERO.consumableBuffs.goldMult ||
    HERO.consumableBuffs.allBoost || HERO.consumableBuffs.streakShield > 0
  );
  const boxBtn = el('button', `btn ${activeBuff ? 'btn-primary' : ''} wide`, ptIcon('assets/ui/eroe/consumabili-box.webp', `Box Consumabili${consCount > 0 ? ` (${consCount})` : ''}`, '⚗️'));
  if (activeBuff) boxBtn.style.position = 'relative';
  boxBtn.addEventListener('click', () => { HERO_VIEW = 'zaino'; setTab('hero'); });
  c.appendChild(boxBtn);

  // Sacca del Viandante (guardaroba)
  const saccaBtn = el('button', 'btn wide', ptIcon('assets/ui/eroe/sacca.webp', 'Sacca del Viandante', '🎒'));
  saccaBtn.addEventListener('click', () => { HERO_VIEW = 'sacca'; setTab('hero'); });
  c.appendChild(saccaBtn);

  // Sottomenù
  const sub = el('div', 'hero-submenu');
  [
    ['story',    'storia',          '📜', 'La tua Storia'],
    ['cards',    'carte',           '🎴', 'Carte & Imprese'],
    ['bestiary', 'bestiario',       '🐉', 'Bestiario'],
    ['diary',    'imprese_stivale', '📊', 'Diario'],
  ].forEach(([k, file, emoji, label]) => {
    const b = el('button', 'btn submenu-btn');
    b.innerHTML = `<span class="submenu-emoji">${emoji}</span><span>${label}</span>`;
    if (file) {
      const img = new Image();
      img.onload = () => { b.innerHTML = `<img class="submenu-icon" src="assets/ui/eroe/${file}.webp"><span>${label}</span>`; };
      img.src = `assets/ui/eroe/${file}.webp`;
    }
    b.addEventListener('click', () => { HERO_VIEW = k; setTab('hero'); });
    sub.appendChild(b);
  });
  // Prove del Campione (sbloccato al Lv 60)
  if ((HERO.level || 0) >= 60) {
    const champBtn = el('button', 'btn submenu-btn submenu-btn-campione');
    const trophies = (HERO.champion && HERO.champion.trophies) || [];
    champBtn.innerHTML = `<span class="submenu-emoji">⚔️</span><span>Prove del Campione${trophies.length > 0 ? ` <span class="champ-badge">${trophies.length}/10</span>` : ''}</span>`;
    champBtn.addEventListener('click', () => { HERO_VIEW = 'campione'; setTab('hero'); });
    sub.appendChild(champBtn);
  }
  c.appendChild(sub);

  // Prestige (Rinascita)
  if (RPG.canPrestige(HERO)) {
    const pc = el('div', 'panel prestige-panel');
    pc.appendChild(el('h3', 'panel-title', '✨ Rinascita'));
    pc.appendChild(el('p', 'center', 'Hai raggiunto il livello massimo. Puoi rinascere: torni al livello 1, ma guadagni <b>+20% XP permanente</b> per sempre.'));
    const pb = el('button', 'btn btn-primary wide', `✨ Rinasci (prestige ${(HERO.prestige?.count||0)+1})`);
    pb.addEventListener('click', () => {
      modal(`<h3 class="panel-title center">✨ Sei sicuro?</h3>
        <p class="center muted">Torni al livello 1 ma ottieni <b>+20% XP permanente</b>.<br>Oggetti, km, trofei e oro rimangono.</p>
        <button class="btn btn-primary wide" id="btn-prestige-confirm">✨ Rinasci!</button>
        <button class="btn wide" onclick="closeModal()">Annulla</button>`);
      setTimeout(() => {
        const btn = $('#btn-prestige-confirm');
        if (btn) btn.addEventListener('click', () => {
          RPG.prestige(HERO); persist(); renderHUD();
          vibrate([200,100,200,100,400]);
          closeModal();
          setTimeout(() => modal(`<h3 class="center" style="font-size:1.3rem">✨ Sei rinato!<br>+20% XP per sempre</h3>
            <p class="center" style="font-size:2rem">⭐</p>
            <button class="btn btn-primary wide" onclick="nextOpening();setTab('hero')">Ricomincia l'avventura!</button>`), 300);
        });
      }, 50);
    });
    pc.appendChild(pb);
    c.appendChild(pc);
  } else if (HERO.prestige && HERO.prestige.count > 0) {
    c.appendChild(el('p', 'center small muted', `✨ Prestige ${HERO.prestige.count} · +${HERO.prestige.count*20}% XP permanente`));
  }

  // ── Virtù dell'Eroe ──
  {
    const pts = HERO.skillPoints || 0;
    const sp2 = el('div', 'panel virtu-panel');
    const hdr = el('div', 'virtu-header');
    hdr.innerHTML = `<span class="virtu-title">${ptIcon('assets/ui/eroe/virtu.webp', "Virtù dell'Eroe", '⚜️')}</span>${pts > 0 ? `<span class="skill-pts-badge">${pts} pt</span>` : ''}`;
    sp2.appendChild(hdr);

    const subRow = el('div', 'virtu-sub-row');
    const subText = el('div', 'virtu-sub-text');
    subText.innerHTML = `<span class="muted small">Punti: <b>${pts}</b> · 1 punto ogni 5 livelli</span><span class="muted small virtu-reset-note">🔄 Reset abilità: <b>${RPG.SKILL_RESET_COST}🪙</b></span>`;
    subRow.appendChild(subText);
    if ((HERO.skills || []).length > 0) {
      const resetBtn = el('button', 'btn virtu-reset-btn', `🔄 Reset`);
      resetBtn.addEventListener('click', () => {
        modal(`<h3 style="margin-bottom:.6rem">Resetta le Abilità?</h3>
          <p class="muted small" style="margin-bottom:1rem">Costo: <b>${RPG.SKILL_RESET_COST} oro</b>. Tutti i punti vengono rimborsati e puoi riassegnarli da capo.</p>
          <div style="display:flex;gap:.5rem;justify-content:center">
            <button class="btn btn-primary" id="confirm-reset">Conferma</button>
            <button class="btn" id="cancel-reset">Annulla</button>
          </div>`);
        document.getElementById('confirm-reset').onclick = () => {
          const err = RPG.resetSkills(HERO);
          closeModal();
          if (err) { toast(err); return; }
          persist(); vibrate([60, 30, 60]); toast('✅ Abilità resettate!'); setTab('hero');
        };
        document.getElementById('cancel-reset').onclick = closeModal;
      });
      subRow.appendChild(resetBtn);
    }
    sp2.appendChild(subRow);

    // Talento di Classe — bonus innato dell'eroe, unico per storyId
    const talent = RPG.talentOf(HERO);
    if (talent) {
      const tc = el('div', 'virtu-talent-card');
      tc.innerHTML = `<span class="virtu-talent-icon">${talent.icon}</span><div class="virtu-talent-body"><span class="virtu-talent-name">${esc(talent.name)}</span><span class="virtu-talent-desc">${esc(talent.desc)}</span></div>`;
      sp2.appendChild(tc);
    }

    const tiers = [
      { label: 'Principiante', range: [1, 20] },
      { label: 'Avventuriero', range: [21, 45] },
      { label: 'Veterano',     range: [46, 70] },
      { label: 'Leggendario',  range: [71, 100] },
    ];

    tiers.forEach(tier => {
      const tierSkills = RPG.SKILL_TREE.filter(sk => sk.reqLevel >= tier.range[0] && sk.reqLevel <= tier.range[1]);
      if (!tierSkills.length) return;

      const tierWrap = el('div', 'virtu-tier');
      tierWrap.appendChild(el('div', 'virtu-tier-label', tier.label));

      const grid = el('div', 'virtu-grid');
      tierSkills.forEach(sk => {
        const learned = (HERO.skills || []).includes(sk.id);
        const canLearn = !learned && HERO.level >= sk.reqLevel && pts >= sk.cost;
        const locked = HERO.level < sk.reqLevel;
        const stateClass = learned ? ' learned' : locked ? ' locked' : canLearn ? ' available' : '';
        const cell = el('div', 'virtu-cell' + stateClass);

        const iconEl = el('span', 'virtu-icon');
        if (sk.img) {
          iconEl.innerHTML = `<img src="${esc(sk.img)}" alt="${esc(sk.name)}" class="virtu-icon-img">`;
        } else {
          iconEl.textContent = sk.icon;
        }
        cell.appendChild(iconEl);
        const nameRow = el('span', 'virtu-name-row');
        nameRow.appendChild(el('span', 'virtu-name', esc(sk.name)));
        if (sk.cost >= 2) nameRow.appendChild(el('span', 'virtu-cost-badge', `${sk.cost}pt`));
        cell.appendChild(nameRow);
        cell.appendChild(el('span', 'virtu-desc muted small', esc(sk.desc)));

        if (locked) {
          cell.appendChild(el('span', 'virtu-req muted small', `Lv ${sk.reqLevel}${sk.cost > 1 ? ` · ${sk.cost} pt` : ''}`));
        } else if (learned) {
          cell.appendChild(el('span', 'virtu-state', '✅'));
        } else if (canLearn) {
          const btn = el('button', 'btn btn-primary virtu-btn', `Impara · ${sk.cost} pt`);
          btn.addEventListener('click', () => {
            const err = RPG.learnSkill(HERO, sk.id);
            if (err) { toast(err); return; }
            persist();
            vibrate([80, 40, 120]);
            setTab('hero');
          });
          cell.appendChild(btn);
        } else {
          cell.appendChild(el('span', 'virtu-req muted small', `Lv ${sk.reqLevel} · ${sk.cost} pt`));
        }
        grid.appendChild(cell);
      });
      tierWrap.appendChild(grid);
      sp2.appendChild(tierWrap);
    });
    c.appendChild(sp2);
  }

  // ── Tappe della Via — badge dei milestone completati ──
  {
    const reached = HERO.milestonesReached || [];
    const totalSessions = HERO.totalSessions || 0;
    if (totalSessions >= 1 || reached.length > 0) {
      const msp = el('div', 'panel ms-profile-panel');
      const msHead = el('h3', 'panel-title', ptIcon('assets/ui/mappa/tappe.webp', `Tappe della Via · ${reached.length}/20`, '🏅'));
      msp.appendChild(msHead);
      msp.appendChild(el('p', 'muted small ms-profile-desc',
        `Ogni sessione di allenamento conta. Al raggiungimento di certe sessioni sblocchi premi esclusivi — oro, consumabili e storie della Via. Il numero indica la sessione richiesta.`));
      const grid = el('div', 'ms-profile-grid');
      RPG.MILESTONES.forEach(m => {
        const done = reached.includes(m.id);
        const near = !done && totalSessions >= m.session - 2 && totalSessions < m.session;
        const tc = MILESTONE_TIER_COLOR[m.tier] || MILESTONE_TIER_COLOR.bronzo;
        const badge = el('div', `ms-pb${done ? ' done' : near ? ' near' : ''}`);
        if (done) { badge.style.setProperty('--ms-border', tc.border); badge.style.setProperty('--ms-glow', tc.glow); }
        badge.innerHTML = `<span class="ms-pb-icon">${done ? m.icon : near ? '…' : '·'}</span><span class="ms-pb-num">${m.session}</span>`;
        badge.title = done ? m.title : near ? `Sessione ${m.session} — ci sei quasi!` : `Sessione ${m.session}`;
        if (done) badge.addEventListener('click', () => toast(`${m.icon} ${m.title}`));
        grid.appendChild(badge);
      });
      msp.appendChild(grid);
      c.appendChild(msp);
    }
  }

  // Cronache di Oakhaven — rimanda alla scheda dedicata
  {
    const unlocked2 = HERO.loreUnlocked || [];
    if (unlocked2.length > 0 || HERO.totalKm >= 40) {
      const loreBtn = el('button', 'btn wide lore-entry-btn', ptIcon('assets/ui/eroe/cronache.webp', `Cronache di Oakhaven · ${unlocked2.length}/${RPG.LORE_FRAGMENTS.length} capitoli`, '📖'));
      loreBtn.addEventListener('click', () => { HERO_VIEW = 'cronache'; setTab('hero'); });
      c.appendChild(loreBtn);
    }
  }

  const sw = el('button', 'btn wide', '↩ Cambia Eroe');
  sw.addEventListener('click', () => { STATE.current = null; persist(); renderProfiles(); });
  c.appendChild(sw);
}

function renderDiaryView(c) {
  backBar(c);
  c.appendChild(el('h2', 'section-title', ptIcon('assets/ui/diario/diario.webp', 'Diario del Viandante', '📜')));

  // Statistiche totali
  const sp = el('div', 'panel');
  sp.appendChild(el('h3', 'panel-title', '⚔️ Statistiche Totali'));
  const sd = el('div', 'stats-diary-grid');
  [
    ['sessioni',  HERO.log.length,                                    'Sessioni',  '🥾'],
    ['totale',    HERO.totalKm.toFixed(1) + ' km',                   'Totale',    '🗺️'],
    ['cammino',   (HERO.kmByType.camminata || 0).toFixed(1) + ' km', 'Cammino',   '🚶'],
    ['corsa',     (HERO.kmByType.corsa     || 0).toFixed(1) + ' km', 'Corsa',     '🏃'],
    ['cyclette',  (HERO.kmByType.cyclette  || 0).toFixed(1) + ' km', 'Cyclette',  '🚴'],
    ['imprese',   (HERO.achievementsClaimed || []).length,            'Imprese',   '⭐'],
    ['sacchi',    HERO.lootBagsOpened || 0,                          'Sacchi',    '📦'],
    ['frammenti', HERO.fragmentsFound || 0,                          'Frammenti', '💎'],
  ].forEach(([img, val, lbl, fallback]) => {
    const it = el('div', 'stats-diary-item');
    const src = `assets/ui/diario/${img}.webp`;
    it.innerHTML = `<div class="stats-diary-val"><img class="stats-diary-icon" src="${src}" onerror="this.outerHTML='<span>${fallback}</span>'">${val}</div><div class="stats-diary-lbl">${lbl}</div>`;
    sd.appendChild(it);
  });
  sp.appendChild(sd);
  c.appendChild(sp);

  // Riepilogo settimana
  {
    const now2 = new Date();
    const mondayStart = new Date(now2);
    mondayStart.setHours(0, 0, 0, 0);
    mondayStart.setDate(now2.getDate() - ((now2.getDay() + 6) % 7));
    const weekLogs = HERO.log.filter(l => new Date(l.date) >= mondayStart);
    const weekKm = { cyclette: 0, camminata: 0, corsa: 0 };
    weekLogs.forEach(l => { weekKm[l.type] = (weekKm[l.type] || 0) + l.km; });
    const totalWeek = Object.values(weekKm).reduce((s, v) => s + v, 0);
    const maxKm = Math.max(...Object.values(weekKm), 0.1);
    const actColors = { cyclette: '#5a9fd4', camminata: '#5abf7a', corsa: '#e07040' };
    const weekPanel = el('div', 'panel');
    weekPanel.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/diario/questa-settimana.webp', 'Questa Settimana', '📅')));
    Object.entries(RPG.ACTIVITIES).forEach(([key, a]) => {
      const km = weekKm[key] || 0;
      const pct = Math.round(km / maxKm * 100);
      const row = el('div', 'week-row');
      const actImgMap = { cyclette: 'cyclette', camminata: 'cammino', corsa: 'corsa' };
      row.innerHTML = `<span class="week-row-label"><img class="stats-diary-icon" src="assets/ui/diario/${actImgMap[key]}.webp" onerror="this.outerHTML='<span>${a.icon}</span>'">${a.label}</span>
        <div class="week-bar-wrap"><div class="week-bar-fill" style="width:${pct}%;background:${actColors[key]}"></div></div>
        <span class="week-row-val">${km.toFixed(1)}</span>`;
      weekPanel.appendChild(row);
    });
    weekPanel.appendChild(el('p', 'center small', `Totale: <b>${totalWeek.toFixed(1)} km</b> questa settimana`));
    c.appendChild(weekPanel);
  }

  // Trofei km
  {
    const trophyPanel = el('div', 'panel');
    trophyPanel.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/diario/trofei.webp', 'Trofei', '🏆')));
    const trophyGrid = el('div', 'trophy-grid');
    const earnedTrophies = HERO.trophies || [];
    RPG.TROPHIES.forEach(t => {
      const unlocked = earnedTrophies.includes(t.id);
      const cell = el('div', 'trophy-cell' + (unlocked ? ' trophy-unlocked' : ' trophy-locked'));
      cell.title = unlocked ? `${t.name} — ${t.desc}` : `Sblocca a ${t.km} km`;
      let iconHtml;
      if (unlocked && t.img) {
        iconHtml = `<img class="trophy-img" src="${esc(t.img)}" alt="${esc(t.name)}" onerror="this.outerHTML='<span class=trophy-icon>${t.icon}</span>'">`;
      } else if (unlocked) {
        iconHtml = `<span class="trophy-icon">${t.icon}</span>`;
      } else {
        iconHtml = `<span class="trophy-icon trophy-icon-locked">🔒</span>`;
      }
      cell.innerHTML = `${iconHtml}<span class="trophy-name">${esc(t.name)}</span><span class="trophy-km">${t.km} km</span>`;
      trophyGrid.appendChild(cell);
    });
    trophyPanel.appendChild(trophyGrid);
    c.appendChild(trophyPanel);
  }

  // Imprese
  {
    const stats = el('div', 'panel');
    const impreseTitle = el('h3', 'panel-title', '📊 Imprese');
    stats.appendChild(impreseTitle);
    const shieldImg = new Image();
    shieldImg.onload = () => { impreseTitle.innerHTML = `<img class="panel-title-icon" src="assets/ui/eroe/imprese_spade.webp"> Imprese`; };
    shieldImg.src = 'assets/ui/eroe/imprese_spade.webp';
    const impreseRows = [
      ['stivale', 'Km totali', `${HERO.totalKm.toFixed(1)}`],
      ['cavallo', 'In sella', `${(HERO.kmByType.cyclette || 0).toFixed(1)} km`],
      ['pellegrino', 'A piedi', `${(HERO.kmByType.camminata || 0).toFixed(1)} km`],
      ['cavaliere', 'Di corsa', `${(HERO.kmByType.corsa || 0).toFixed(1)} km`],
      ['chiave', 'Streak login', `${HERO.streak.count} giorni`],
      ['spade', 'Missioni compiute', `${HERO.missionsDone.length}`],
      ['zaino', 'Consumabili in tasca', `${Object.values(HERO.consumables||{}).reduce((s,q)=>s+q,0)}`],
    ];
    impreseRows.forEach(([file, label, val]) => {
      const row = el('div', 'stat-row');
      row.innerHTML = `<span class="stat-row-label"><img class="stat-row-icon" src="assets/ui/eroe/imprese_${file}.webp" onerror="this.style.display='none'">${label}</span><b>${val}</b>`;
      stats.appendChild(row);
    });
    c.appendChild(stats);
  }

  // Dominio dei Draghi — statistiche (solo se sbloccato)
  if ((HERO.level || 0) >= 50 || (HERO.dcDefeated || []).length > 0) {
    const dcDefeated = HERO.dcDefeated || [];
    const dcPanel = el('div', 'panel');
    dcPanel.appendChild(el('h3', 'panel-title', '🐉 Dominio dei Draghi'));

    // Tier raggiunto
    const tierUnlocked = (() => {
      const tiers = ['comune','non_comune','raro','epico','leggendario'];
      let highest = 'comune';
      tiers.forEach(t => {
        const bosses = DC_BOSSES.filter(b => b.tier === t);
        const defeated = bosses.filter(b => dcDefeated.includes(b.id)).length;
        if (defeated >= 3) highest = tiers[Math.min(tiers.indexOf(t) + 1, tiers.length - 1)];
      });
      return highest;
    })();
    const tierLabel = { comune:'Comuni', non_comune:'Non Comuni', raro:'Rari', epico:'Epici', leggendario:'Leggendari' };
    const tierIcon  = { comune:'🌿', non_comune:'🪨', raro:'❄️', epico:'🔥', leggendario:'⚡' };

    const dcRows = [
      { label:'Villain sconfitti', val: `${dcDefeated.length} / 25` },
      { label:'Tier raggiunto',    val: `${tierIcon[tierUnlocked]} ${tierLabel[tierUnlocked]}` },
      { label:'Comuni',            val: `${DC_BOSSES.filter(b=>b.tier==='comune').filter(b=>dcDefeated.includes(b.id)).length} / 5` },
      { label:'Non Comuni',        val: `${DC_BOSSES.filter(b=>b.tier==='non_comune').filter(b=>dcDefeated.includes(b.id)).length} / 5` },
      { label:'Rari',              val: `${DC_BOSSES.filter(b=>b.tier==='raro').filter(b=>dcDefeated.includes(b.id)).length} / 5` },
      { label:'Epici',             val: `${DC_BOSSES.filter(b=>b.tier==='epico').filter(b=>dcDefeated.includes(b.id)).length} / 5` },
      { label:'Leggendari',        val: `${DC_BOSSES.filter(b=>b.tier==='leggendario').filter(b=>dcDefeated.includes(b.id)).length} / 5` },
    ];
    dcRows.forEach(({ label, val }) => {
      const row = el('div', 'stat-row');
      row.innerHTML = `<span class="stat-row-label">${label}</span><b>${val}</b>`;
      dcPanel.appendChild(row);
    });

    // Barra avanzamento globale
    const pct = Math.round(dcDefeated.length / 25 * 100);
    const barWrap = el('div', 'dc-diary-bar-wrap');
    barWrap.innerHTML = `<div class="dc-diary-bar-fill" style="width:${pct}%"></div>`;
    dcPanel.appendChild(barWrap);
    const prog = el('p', 'center small muted');
    prog.textContent = dcDefeated.length === 25 ? '🏆 Tutti i villain sconfitti!' : `${pct}% del Dominio conquistato`;
    dcPanel.appendChild(prog);

    c.appendChild(dcPanel);
  }

  // Reliquie del Viandante
  {
    const relPanel = el('div', 'panel');
    relPanel.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/diario/reliquie.webp', 'Reliquie del Viandante', '🗿')));
    const discovered = HERO.biomesDiscovered || [];
    const found = discovered.length;
    const total = RPG.BIOME_ARTIFACTS.length;
    const prog = el('p', 'center small muted');
    prog.innerHTML = `${found} / ${total} reliquie scoperte`;
    relPanel.appendChild(prog);
    const grid = el('div', 'artifacts-grid');
    RPG.BIOME_ARTIFACTS.forEach((art, idx) => {
      const unlocked = discovered.includes(idx);
      const cell = el('div', 'artifact-cell' + (unlocked ? ' artifact-unlocked' : ' artifact-locked'));
      if (unlocked) {
        cell.innerHTML = `<span class="artifact-icon">${art.icon}</span><span class="artifact-name">${esc(art.name)}</span><span class="artifact-flavor">${esc(art.flavor)}</span>`;
      } else {
        cell.innerHTML = `<span class="artifact-icon artifact-unknown">?</span><span class="artifact-name muted">???</span>`;
      }
      grid.appendChild(cell);
    });
    relPanel.appendChild(grid);
    c.appendChild(relPanel);
  }

  // Epistolario
  {
    const letters = HERO.lettersReceived || [];
    if (letters.length) {
      const epPanel = el('div', 'panel');
      epPanel.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/diario/epistolario.webp', 'Epistolario', '📬')));
      letters.forEach(id => {
        const letter = RPG.WORLD_LETTERS.find(l => l.id === id);
        if (!letter) return;
        const card = el('div', 'ep-card');
        const avatarHtml = letter.img
          ? `<img class="ep-avatar" src="${esc(letter.img)}" alt="${esc(letter.sender)}" onerror="this.outerHTML='<span class=ep-icon>${letter.icon}</span>'">`
          : `<span class="ep-icon">${letter.icon}</span>`;
        card.innerHTML = `
          <div class="ep-card-header">
            ${avatarHtml}
            <div class="ep-meta">
              <span class="ep-sender">${esc(letter.sender)}</span>
              <span class="ep-role">${esc(letter.role)}</span>
            </div>
          </div>
          <div class="ep-title">${esc(letter.title)}</div>`;
        card.addEventListener('click', () => {
          const bodyHtml = esc(letter.body).replace(/\n/g, '<br>');
          const modalAvatar = letter.img
            ? `<img class="ep-modal-avatar" src="${esc(letter.img)}" alt="${esc(letter.sender)}">`
            : `<span style="font-size:2rem">${letter.icon}</span>`;
          modal(`
            <div class="ep-modal-header">
              ${modalAvatar}
              <div><b>${esc(letter.sender)}</b><br><span class="muted small">${esc(letter.role)}</span></div>
            </div>
            <h3 style="margin:12px 0 8px;text-align:center">${esc(letter.title)}</h3>
            <p class="ep-modal-body">${bodyHtml}</p>
            <button class="btn btn-primary wide" onclick="closeModal()">Chiudi</button>`);
        });
        epPanel.appendChild(card);
      });
      c.appendChild(epPanel);
    }
  }

  // Heatmap GitHub-style — ultime 12 settimane
  if (HERO.log.length) {
    const kmByDay = {};
    HERO.log.forEach(l => {
      const key = localDate(new Date(l.date));
      kmByDay[key] = (kmByDay[key] || 0) + l.km;
    });

    // Sparkline — ultime 10 sessioni (km)
    if (HERO.log.length >= 2) {
      const last10 = HERO.log.slice(-10);
      const vals = last10.map(l => l.km);
      const maxV = Math.max(...vals, 0.1);
      const W = 200, H = 44;
      const pts = vals.map((v, i) => {
        const x = (i / Math.max(vals.length - 1, 1)) * W;
        const y = H - (v / maxV) * (H - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      const dotsSvg = vals.map((v, i) => {
        const x = (i / Math.max(vals.length - 1, 1)) * W;
        const y = H - (v / maxV) * (H - 6) - 3;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="var(--gold)"/>`;
      }).join('');
      const spkPanel = el('div', 'panel');
      spkPanel.innerHTML = `
        <div class="sparkline-header">
          <span class="sparkline-title">${ptIcon('assets/ui/diario/sessioni.webp', `Ultime ${last10.length} sessioni`, '📈')}</span>
          <span class="sparkline-peak muted small">${maxV.toFixed(1)} km max</span>
        </div>
        <div class="sparkline-labels">
          ${last10.map(l => `<span class="spk-lbl">${l.km.toFixed(1)}</span>`).join('')}
        </div>
        <svg class="sparkline-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="spk-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--gold)" stop-opacity=".35"/>
            <stop offset="100%" stop-color="var(--gold)" stop-opacity="0"/>
          </linearGradient></defs>
          <polygon points="${pts} ${W},${H} 0,${H}" fill="url(#spk-grad)"/>
          <polyline points="${pts}" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          ${dotsSvg}
        </svg>`;
      c.appendChild(spkPanel);
    }

    // Calendario mese corrente
    const now = new Date();
    const yr = now.getFullYear(), mo = now.getMonth();
    const MONTH_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    const firstDay = new Date(yr, mo, 1);
    const daysInMonth = new Date(yr, mo + 1, 0).getDate();
    const startDow = (firstDay.getDay() + 6) % 7; // Monday-based (0=Mon)
    const calPanel = el('div', 'panel km-heatmap-wrap');
    calPanel.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/diario/calendario.webp', `${MONTH_IT[mo]} ${yr}`, '📅')));
    const calGrid = el('div', 'cal-grid');
    ['L','M','M','G','V','S','D'].forEach(d => calGrid.appendChild(el('div', 'cal-day-hdr', d)));
    for (let i = 0; i < startDow; i++) calGrid.appendChild(el('div', 'cal-cell cal-empty'));
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const km = kmByDay[key] || 0;
      const intensity = km === 0 ? 0 : km < 2 ? 1 : km < 5 ? 2 : km < 10 ? 3 : 4;
      const cell = el('div', 'cal-cell' + (d === now.getDate() ? ' cal-today' : ''));
      cell.dataset.i = intensity;
      cell.title = `${d} ${MONTH_IT[mo]}: ${km > 0 ? km.toFixed(1) + ' km' : 'riposo'}`;
      cell.innerHTML = `<span class="cal-day-num">${d}</span>${km > 0 ? `<span class="cal-day-km">${km.toFixed(1)}</span>` : ''}`;
      calGrid.appendChild(cell);
    }
    calPanel.appendChild(calGrid);
    c.appendChild(calPanel);

    // Grafico km ultimi 8 settimane
    const weeklyTotals = [];
    const weekLabels = [];
    for (let w = 7; w >= 0; w--) {
      const ref = new Date(); ref.setHours(0,0,0,0);
      ref.setDate(ref.getDate() - ((ref.getDay()+6)%7) - w*7);
      const end = new Date(ref); end.setDate(end.getDate()+7);
      const km = HERO.log.filter(l => { const d=new Date(l.date); return d>=ref && d<end; }).reduce((s,l)=>s+l.km,0);
      weeklyTotals.push(+km.toFixed(1));
      weekLabels.push(w===0?'Questa':`${ref.getDate()}/${ref.getMonth()+1}`);
    }
    const chartPanel = el('div', 'panel km-heatmap-wrap');
    chartPanel.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/diario/km-settimane.webp', 'Km · Ultime 8 Settimane', '📈')));
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 120;
    canvas.style.cssText = 'width:100%;height:auto;display:block';
    chartPanel.appendChild(canvas);
    c.appendChild(chartPanel);
    requestAnimationFrame(() => {
      const ctx2 = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      const pad = { t:12, b:22, l:8, r:8 };
      const maxKmW = Math.max(...weeklyTotals, 1);
      const bw = (W - pad.l - pad.r) / weeklyTotals.length;
      ctx2.clearRect(0,0,W,H);
      // Bars
      weeklyTotals.forEach((km, i) => {
        const bh = ((H - pad.t - pad.b) * km / maxKmW);
        const x = pad.l + i * bw + bw*0.15;
        const y = H - pad.b - bh;
        const isLast = i === weeklyTotals.length - 1;
        ctx2.fillStyle = isLast ? '#e8b64c' : '#5abf7a88';
        ctx2.roundRect(x, y, bw*0.7, bh, 3);
        ctx2.fill();
        // value label
        if (km > 0) {
          ctx2.fillStyle = '#fff';
          ctx2.font = 'bold 9px sans-serif';
          ctx2.textAlign = 'center';
          ctx2.fillText(km.toFixed(0), x + bw*0.35, y - 3);
        }
        // week label
        ctx2.fillStyle = '#9e8060';
        ctx2.font = '9px sans-serif';
        ctx2.textAlign = 'center';
        ctx2.fillText(weekLabels[i], x + bw*0.35, H - pad.b + 12);
      });
    });

    const today = new Date(); today.setHours(0,0,0,0);
    const MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    const hmWrap = el('div', 'panel km-heatmap-wrap');
    hmWrap.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/diario/attivita-mesi.webp', 'Attività degli Ultimi 3 Mesi', '🌙')));

    // Calculate month label per week column (12 columns of 7 days)
    const weekMonthLabel = new Array(12).fill('');
    let prevHmMonth = -1;
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const col = Math.floor((83 - i) / 7);
      if (d.getMonth() !== prevHmMonth) { weekMonthLabel[col] = MONTHS_SHORT[d.getMonth()]; prevHmMonth = d.getMonth(); }
    }

    // Outer wrapper: day-labels column + right area
    const hmOuter = el('div', 'hm-outer');

    // Day labels (L M M G V S D) — show only alternate ones to save space
    const dayCol = el('div', 'hm-daylabels');
    ['L','','M','','V','','D'].forEach(d => dayCol.appendChild(el('div', 'hm-daylabel', d)));
    hmOuter.appendChild(dayCol);

    // Right: month row + grid
    const hmRight = el('div', 'hm-right');
    const monthRow = el('div', 'hm-month-row');
    weekMonthLabel.forEach(lbl => monthRow.appendChild(el('div', 'hm-month-cell', lbl)));
    hmRight.appendChild(monthRow);

    const hm = el('div', 'km-heatmap');
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const km = kmByDay[key] || 0;
      const intensity = km === 0 ? 0 : km < 2 ? 1 : km < 5 ? 2 : km < 10 ? 3 : 4;
      const cell = el('div', 'hm-cell');
      cell.dataset.i = intensity;
      cell.title = `${d.toLocaleDateString('it-IT')}: ${km > 0 ? km.toFixed(1) + ' km' : 'riposo'}`;
      hm.appendChild(cell);
    }
    hmRight.appendChild(hm);
    hmOuter.appendChild(hmRight);
    hmWrap.appendChild(hmOuter);

    const legend = el('div', 'hm-legend');
    legend.innerHTML = `Meno <div class="hm-legend-cell" style="background:rgba(255,255,255,.08)"></div><div class="hm-legend-cell" data-i="1"></div><div class="hm-legend-cell" data-i="2"></div><div class="hm-legend-cell" data-i="3"></div><div class="hm-legend-cell" data-i="4"></div> Più &nbsp;<span class="hm-legend-scale">(&lt;2 · &lt;5 · &lt;10 · 10+ km)</span>`;
    hmWrap.appendChild(legend);
    c.appendChild(hmWrap);
  }

  // Diario attività
  const lp = el('div', 'panel');
  lp.appendChild(el('h3', 'panel-title', '📜 Diario delle Attività'));
  if (!HERO.log.length) {
    lp.appendChild(emptyState('📜', 'Nessuna attività registrata ancora.'));
  } else {
    const grouped = {};
    HERO.log.slice().reverse().forEach(l => {
      const dateKey = (typeof l.date === 'string' ? l.date : new Date(l.date).toISOString()).slice(0, 10);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(l);
    });
    const allEntries = Object.entries(grouped); // già in ordine reverse (recenti prima)
    const DAYS_DEFAULT = 7;
    const visible = allEntries.slice(0, DAYS_DEFAULT);
    const hidden  = allEntries.slice(DAYS_DEFAULT);

    const scrollBox = el('div', 'diary-log-scroll');
    const renderGroup = ([dateKey, entries]) => {
      const d = new Date(dateKey);
      scrollBox.appendChild(el('div', 'log-date-header', d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })));
      entries.forEach(l => {
        const a = RPG.ACTIVITIES[l.type];
        scrollBox.appendChild(el('div', 'log-row', `${a.icon} <b>${l.km} km</b> di ${a.label.toLowerCase()} — +${l.xp} XP`));
      });
    };
    visible.forEach(renderGroup);
    lp.appendChild(scrollBox);

    if (hidden.length) {
      const moreBtn = el('button', 'btn btn-small diary-log-more-btn', `Mostra tutti (${hidden.length + DAYS_DEFAULT} giorni)`);
      moreBtn.addEventListener('click', () => {
        hidden.forEach(renderGroup);
        moreBtn.remove();
      });
      lp.appendChild(moreBtn);
    }
  }
  c.appendChild(lp);
}

function renderSettingsView(c) {
  const back = el('button', 'hero-back-pill', '‹ Eroe');
  back.addEventListener('click', () => { HERO_VIEW = 'main'; setTab('hero'); });
  c.appendChild(back);
  c.appendChild(el('h2', 'section-title', '⚙️ Impostazioni'));
  const guidaBtn = el('button', 'btn btn-primary wide', '📖 Guida al Gioco');
  guidaBtn.addEventListener('click', () => { HERO_VIEW = 'guida'; setTab('hero'); });
  c.appendChild(guidaBtn);
  c.appendChild(renderShortcutPanel());
  c.appendChild(_settingsNotifPanel());
  c.appendChild(_settingsRefreshPanel());
  c.appendChild(_settingsBackupPanel());
  c.appendChild(_settingsFullscreenPanel());
  c.appendChild(_settingsPvpPanel());
  c.appendChild(_settingsDangerPanel());
  c.appendChild(_settingsSyncTokenPanel());
  c.appendChild(_settingsPrivacyPanel());
}

function _settingsSyncTokenPanel() {
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '🔑 Token Sincronizzazione'));
  p.appendChild(el('p', 'guide-text', 'Includi &sync_token=TOKEN nell\'URL del tuo Comando Rapido (MacroDroid / Tasker). Senza token il sync automatico viene rifiutato.'));
  const token = getSyncToken();
  const tokenRow = el('div', 'sync-token-row');
  const code = el('code', 'sync-token-code', token);
  const copyBtn = el('button', 'btn btn-small', '📋 Copia');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(token)
      .then(() => toast('Token copiato!'))
      .catch(() => { toast(token); });
  });
  tokenRow.appendChild(code);
  tokenRow.appendChild(copyBtn);
  p.appendChild(tokenRow);

  const resetBtn = el('button', 'btn btn-small', '🔄 Rigenera token');
  resetBtn.style.marginTop = '.5rem';
  resetBtn.addEventListener('click', () => {
    modal(`<h3 class="panel-title" style="margin-bottom:.6rem">🔄 Rigenera token?</h3>
      <p class="muted small" style="margin-bottom:1rem">Il token attuale smetterà di funzionare. Dovrai aggiornare tutti i Comandi Rapidi con il nuovo token.</p>
      <div style="display:flex;gap:.5rem">
        <button class="btn btn-primary" id="regen-confirm">Rigenera</button>
        <button class="btn" onclick="closeModal()">Annulla</button>
      </div>`);
    document.getElementById('regen-confirm').addEventListener('click', () => {
      localStorage.removeItem('rpgym_sync_token');
      getSyncToken();
      closeModal();
      toast('Token rigenerato. Aggiorna i tuoi Comandi Rapidi.');
      setTab('hero');
    });
  });
  p.appendChild(resetBtn);
  return p;
}

function _settingsPrivacyPanel() {
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '🔒 Privacy'));
  p.appendChild(el('p', 'guide-text', 'I tuoi dati di gioco sono salvati solo sul tuo dispositivo. Nessun dato personale viene raccolto o venduto a terzi.'));
  const btn = el('button', 'btn wide', '📄 Leggi la Privacy Policy');
  btn.addEventListener('click', () => window.open('privacy.html', '_blank'));
  p.appendChild(btn);
  return p;
}

function _settingsPvpPanel() {
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '⚔️ Sfida un Amico'));
  p.appendChild(el('p', 'guide-text', 'Condividi la tua Hero Card con un amico. Chi percorre più km in 7 giorni vince oro e gloria. Il tuo record PvP è visibile nel profilo.'));
  const btn = el('button', 'btn btn-primary wide', '📤 Apri Sfida PvP');
  btn.addEventListener('click', showHeroShareCard);
  p.appendChild(btn);
  return p;
}

function _settingsNotifPanel() {
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '🔔 Notifiche'));
  // Render async after checking permission
  _getNotifPermission().then(perm => {
    if (perm === 'unsupported') {
      p.appendChild(el('p', 'guide-text', _isNative()
        ? 'Impossibile caricare il plugin notifiche. Reinstalla l\'app.'
        : 'Il tuo browser non supporta le notifiche.'));
      return;
    }
    const desc = perm === 'granted'
      ? 'Le notifiche sono attive. Riceverai reminder per l\'allenamento serale, streak in pericolo e aggiornamenti sulle sfide PvP.'
      : perm === 'denied'
      ? (_isNative()
          ? 'Le notifiche sono bloccate. Riabilitale in Impostazioni → Hero\'s Pace → Notifiche.'
          : 'Le notifiche sono bloccate dal browser. Riabilitale nelle impostazioni del sito.')
      : 'Abilita le notifiche per ricevere reminder sull\'allenamento, streak, famiglio e sfide PvP.';
    p.appendChild(el('p', 'guide-text', desc));
    if (perm === 'prompt') {
      const btn = el('button', 'btn btn-primary', '🔔 Abilita notifiche');
      btn.addEventListener('click', async () => {
        const r = await _requestNotifPermission();
        HERO.notifAsked = true; persist();
        if (r === 'granted') { toast('🔔 Notifiche attivate!'); if (!_isNative()) checkAndNotify(); }
        else toast('Notifiche non autorizzate.');
        setTab('hero');
      });
      p.appendChild(btn);
    } else if (perm === 'granted') {
      const btn = el('button', 'btn', '✅ Notifiche attive');
      btn.disabled = true;
      p.appendChild(btn);
    }
  });
  return p;
}

function _settingsRefreshPanel() {
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '🔄 Aggiornamenti'));
  p.appendChild(el('p', 'guide-text', 'Se il gioco non mostra le ultime novità, svuota la cache per scaricare tutto da capo.'));

  const clearBtn = el('button', 'btn btn-primary', '🗑️ Svuota cache e ricarica');
  clearBtn.addEventListener('click', async () => {
    clearBtn.disabled = true;
    clearBtn.textContent = '⏳ Pulizia in corso…';
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch {}
    location.reload(true);
  });
  p.appendChild(clearBtn);
  return p;
}

function _settingsBackupPanel() {
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '💾 Backup salvataggio'));
  p.appendChild(el('p', 'guide-text', 'Esporta i tuoi eroi su file JSON e reimportali su qualsiasi dispositivo.'));

  // ── Export ───────────────────────────────────────────────────
  // Avviso se backup mai fatto o > 30 giorni fa
  const lastBackupTs = parseInt(localStorage.getItem('rpgym_last_backup') || '0', 10);
  const daysSinceBackup = lastBackupTs ? Math.floor((Date.now() - lastBackupTs) / 86400000) : null;
  if (daysSinceBackup === null || daysSinceBackup > 30) {
    const warn = el('div', 'backup-warn-banner');
    warn.textContent = daysSinceBackup === null
      ? '⚠️ Nessun backup ancora. Se svuoti il browser perdi tutti i progressi.'
      : `⚠️ Ultimo backup: ${daysSinceBackup} giorni fa. Fallo regolarmente.`;
    p.appendChild(warn);
  }

  const exportBtn = el('button', 'btn btn-primary', '📤 Esporta salvataggio');
  exportBtn.addEventListener('click', async () => {
    const data = localStorage.getItem('rpgym_save_v1');
    if (!data) { toast('Nessun salvataggio trovato.'); return; }
    const filename = `heropace_backup_${new Date().toISOString().slice(0,10)}.json`;
    const file = new File([data], filename, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Hero\'s Pace — Backup' });
        localStorage.setItem('rpgym_last_backup', Date.now().toString());
        toast('📤 Backup condiviso!');
      } catch (err) {
        if (err.name !== 'AbortError') toast('❌ Errore durante la condivisione.');
      }
    } else {
      const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      localStorage.setItem('rpgym_last_backup', Date.now().toString());
      toast('📤 Backup esportato!');
    }
  });

  // ── Import ───────────────────────────────────────────────────
  const importBtn = el('button', 'btn', '📥 Importa salvataggio');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.style.display = 'none';

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const imported = RPG.parseBackup(e.target.result);
        if (!imported.heroes || !imported.heroes.length) throw new Error('nessun eroe trovato');

        const heroRows = imported.heroes.map(h =>
          `<div class="backup-hero-row">
             <span class="backup-hero-avatar">${avatarEmojiFor(h)}</span>
             <span class="backup-hero-name">${esc(h.name)}</span>
             <span class="backup-hero-level">Lv ${h.level}</span>
             <span class="backup-hero-km">${(h.totalKm||0).toFixed(1)} km</span>
           </div>`
        ).join('');

        const currentCount = STATE.heroes.length;
        const importCount  = imported.heroes.length;

        modal(`
          <h3 class="panel-title">📥 Importa backup</h3>
          <p class="guide-text" style="margin-bottom:.6rem">
            Il backup contiene <strong>${importCount}</strong> ${importCount === 1 ? 'eroe' : 'eroi'}:
          </p>
          <div class="backup-hero-list">${heroRows}</div>
          <p class="guide-text" style="margin-top:.8rem">Come vuoi procedere?</p>
          <div class="backup-action-grid">
            <button id="btn-import-merge" class="btn btn-primary">
              🔀 Unisci<br><small>Aggiunge gli eroi mancanti senza cancellare i tuoi attuali</small>
            </button>
            <button id="btn-import-replace" class="btn btn-danger">
              ♻️ Sostituisci<br><small>Cancella i ${currentCount} eroi attuali e usa solo quelli del backup</small>
            </button>
          </div>
          <button id="btn-import-cancel" class="btn" style="margin-top:.6rem;width:100%">Annulla</button>
        `);

        document.getElementById('btn-import-cancel').addEventListener('click', closeModal);

        document.getElementById('btn-import-merge').addEventListener('click', () => {
          const { added, skipped } = RPG.mergeImport(STATE, imported);
          RPG.save(STATE);
          closeModal();
          toast(`✅ ${added} ${added === 1 ? 'eroe aggiunto' : 'eroi aggiunti'}${skipped ? `, ${skipped} già presenti` : ''}. Riavvio…`);
          setTimeout(() => location.reload(), 1500);
        });

        document.getElementById('btn-import-replace').addEventListener('click', () => {
          localStorage.setItem('rpgym_save_v1', e.target.result);
          closeModal();
          toast('✅ Salvataggio sostituito! Riavvio…');
          setTimeout(() => location.reload(), 1200);
        });

      } catch { toast('❌ File non valido o corrotto.'); }
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  importBtn.addEventListener('click', () => fileInput.click());

  p.appendChild(exportBtn);
  p.appendChild(importBtn);
  p.appendChild(fileInput);
  return p;
}

function avatarEmojiFor(hero) {
  const map = {
    eroe1:'🧑',eroe2:'👩',fabbro:'⚒️',stregone:'🧙',alchimista:'⚗️',
    furfante:'🗡️',maga:'🔮',paladino:'🛡️',ranger:'🏹',fata:'🧚',
    principe:'🦅',principessa:'🦋',regina:'👑',predone:'💀',principessa_ghiacci:'❄️',sacerdotessa_sole:'☀️',principessa_draghi:'🐉',
  };
  return map[hero.storyId] || '🧑';
}

function _settingsFullscreenPanel() {
  if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) return el('div');
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '📱 Schermo intero'));
  p.appendChild(el('p', 'guide-text', 'Espandi il gioco a tutto schermo per un\'esperienza più immersiva.'));
  const btn = el('button', 'btn btn-primary', '⛶ Attiva schermo intero');
  btn.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        btn.textContent = '⛶ Attiva schermo intero';
      } else {
        await (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement);
        btn.textContent = '✕ Esci da schermo intero';
      }
    } catch { toast('Schermo intero non disponibile su questo dispositivo.'); }
  });
  p.appendChild(btn);
  return p;
}

function _settingsDangerPanel() {
  const p = el('div', 'panel shortcut-panel');
  p.appendChild(el('h3', 'panel-title', '⚠️ Zona pericolosa'));

  const resetBtn = el('button', 'btn btn-danger', '🗑️ Elimina eroe corrente');
  resetBtn.addEventListener('click', () => {
    if (!HERO) { toast('Nessun eroe attivo.'); return; }
    modal(`
      <h3 class="panel-title">🗑️ Elimina ${HERO.name}?</h3>
      <p>Questa azione è <strong>irreversibile</strong>. L'eroe e tutti i suoi progressi saranno persi per sempre.</p>
      <div class="row gap" style="margin-top:1rem">
        <button id="btn-del-cancel" class="btn">Annulla</button>
        <button id="btn-del-confirm" class="btn btn-danger">Elimina</button>
      </div>`);
    document.getElementById('btn-del-cancel').addEventListener('click', closeModal);
    document.getElementById('btn-del-confirm').addEventListener('click', () => {
      RPG.deleteHero(STATE, HERO.id);
      persist();
      closeModal();
      toast('Eroe eliminato.');
      setTimeout(() => { HERO = null; showScreen('screen-profiles'); renderProfiles(); }, 800);
    });
  });

  const nukeBtn = el('button', 'btn btn-danger', '💀 Cancella tutti i dati');
  nukeBtn.addEventListener('click', () => {
    modal(`
      <h3 class="panel-title">💀 Cancella tutto?</h3>
      <p>Tutti gli eroi, i progressi e le impostazioni saranno cancellati. <strong>Non si può tornare indietro.</strong></p>
      <div class="row gap" style="margin-top:1rem">
        <button id="btn-nuke-cancel" class="btn">Annulla</button>
        <button id="btn-nuke-confirm" class="btn btn-danger">Cancella tutto</button>
      </div>`);
    document.getElementById('btn-nuke-cancel').addEventListener('click', closeModal);
    document.getElementById('btn-nuke-confirm').addEventListener('click', () => {
      localStorage.removeItem('rpgym_save_v1');
      closeModal();
      toast('Dati cancellati. Riavvio…');
      setTimeout(() => location.reload(), 1200);
    });
  });

  p.appendChild(resetBtn);
  p.appendChild(nukeBtn);
  return p;
}

function openSlotPicker(slotKey) {
  const s = RPG.SLOTS[slotKey];
  const candidates = HERO.items.filter(i => i.slot === slotKey);
  const _slotImg = { seme: 'assets/ui/eroe/seme.webp', consumabile: 'assets/ui/eroe/consumabile-slot.webp' }[slotKey];
  let html = `<h3 class="panel-title">${_slotImg ? ptIcon(_slotImg, s.label, s.icon) : `${s.icon} ${s.label}`}</h3>`;
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
    const descText = it.desc || `+${it.xp}% XP · 🪙 ${it.value}`;
    row.innerHTML = `${itemIconHtml(it, 'item-icon-big')}<div class="loot-body">
      <div class="loot-head"><b>${esc(it.name)}</b> <span class="tag">${RPG.RARITIES[it.rarity].label}</span>${it.id === current ? ' ✅' : ''}</div>
      <div class="small muted">${esc(descText)}</div></div>`;
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

function openReliquiaPicker() {
  const relics = (HERO.items || []).filter(i => i.slot === 'reliquia');
  const current = (HERO.equipment || {}).reliquia;
  let html = `<h3 class="panel-title">🏺 Reliquia del Leggendario</h3>`;
  if (!relics.length) {
    html += `<p class="muted center">Non hai ancora nessuna reliquia.<br><span class="small">Completa le Prove dell'Eco dei Leggendari (Lv 71-80).</span></p>`;
  }
  html += `<div class="loot-list" id="reliquia-picker-list"></div>`;
  if (current) html += `<button class="btn wide" id="btn-unequip-reliquia">Rimuovi reliquia</button>`;
  html += `<button class="btn btn-primary wide" onclick="closeModal()">Chiudi</button>`;
  modal(html);
  const list = $('#reliquia-picker-list');
  relics.forEach(it => {
    const row = el('div', 'loot rar-leggendario pickable loot-with-img' + (it.id === current ? ' equipped' : ''));
    row.innerHTML = `<img class="item-icon-big" src="${it.img || ''}" onerror="this.outerHTML='<span class=equip-icon>${it.icon||'🏺'}</span>'">
      <div class="loot-body">
        <div class="loot-head"><b>${esc(it.name)}</b> <span class="tag">Reliquia</span>${it.id === current ? ' ✅' : ''}</div>
        <div class="small muted">${esc(it.desc || '')}</div>
      </div>`;
    row.addEventListener('click', () => {
      if (!HERO.equipment) HERO.equipment = {};
      HERO.equipment.reliquia = it.id;
      persist(); renderHUD(); closeModal(); setTab('hero');
      toast(`${it.icon || '🏺'} ${it.name} equipaggiata!`);
    });
    list.appendChild(row);
  });
  const unq = $('#btn-unequip-reliquia');
  if (unq) unq.addEventListener('click', () => {
    if (HERO.equipment) delete HERO.equipment.reliquia;
    persist(); closeModal(); setTab('hero');
  });
}

function renderStoryView(c) {
  const story = STORIES[HERO.storyId] || STORIES.eroe1;
  backBar(c);
  c.appendChild(el('h2', 'section-title on-parchment-title', '📜 ' + story.title));
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
  const b = el('button', 'hero-back-pill', '‹ Eroe');
  b.addEventListener('click', () => { HERO_VIEW = 'main'; setTab('hero'); });
  c.appendChild(b);
}

function renderCronacheView(c) {
  backBar(c);
  c.appendChild(el('h2', 'section-title', ptIcon('assets/ui/eroe/cronache.webp', 'Cronache di Oakhaven', '📖')));

  const unlocked = HERO.loreUnlocked || [];
  const total = RPG.LORE_FRAGMENTS.length;

  const progress = el('div', 'lore-progress-bar-wrap');
  const pct = Math.round(unlocked.length / total * 100);
  progress.innerHTML = `
    <div class="lore-progress-label">${unlocked.length} di ${total} capitoli sbloccati</div>
    <div class="lore-progress-track"><div class="lore-progress-fill" style="width:${pct}%"></div></div>`;
  c.appendChild(progress);

  if (unlocked.length === 0) {
    c.appendChild(el('p', 'muted center', `Percorri ancora ${RPG.LORE_FRAGMENTS[0].km - Math.floor(HERO.totalKm)} km per sbloccare il primo capitolo.`));
  }

  RPG.LORE_FRAGMENTS.forEach((f, idx) => {
    const isUnlocked = unlocked.includes(f.id);
    const item = el('div', `panel lore-chapter${isUnlocked ? '' : ' lore-locked'}`);
    if (isUnlocked) {
      item.innerHTML = `
        <div class="lore-chapter-num">Capitolo ${idx + 1}</div>
        <div class="lore-chapter-title">${esc(f.title)}</div>
        <p class="lore-chapter-text">${esc(f.text)}</p>`;
    } else {
      item.innerHTML = `
        <div class="lore-chapter-num muted">Capitolo ${idx + 1}</div>
        <div class="lore-chapter-title muted">🔒 ${esc(f.title)}</div>
        <p class="lore-chapter-text muted small">Si sblocca a ${f.km} km totali — ne mancano ${Math.max(0, f.km - Math.floor(HERO.totalKm))} km.</p>`;
    }
    c.appendChild(item);
  });
}

function renderDragonCardsHeroView(c) {
  const backBtn = el('button', 'view-back-link', '‹ Eroe');
  backBtn.addEventListener('click', () => { HERO_VIEW = 'cards'; setTab('hero'); });
  c.appendChild(backBtn);
  renderAntroDragonCardsView(c);
}

function renderCardsView(c) {
  backBar(c);
  requestAnimationFrame(() => { const tc = document.getElementById('tab-content'); if (tc) tc.scrollTop = 0; });
  // ── Album Dominio dei Draghi (primo, in cima) ──
  _renderDragonAlbum(c);
  const cardsTitle = el('h2', 'section-title on-parchment-title', '🎴 Il Tomo delle Memorie');
  c.appendChild(cardsTitle);
  const tomeImg = new Image();
  tomeImg.onload = () => { cardsTitle.innerHTML = `<img class="title-icon" src="assets/ui/eroe/carte.webp"> Il Tomo delle Memorie`; };
  tomeImg.src = 'assets/ui/eroe/carte.webp';
  c.appendChild(el('p', 'muted small center',
    `${HERO.cards.length} / ${Object.keys(RPG.CARDS).length} carte collezionate`));
  const grid = el('div', 'card-grid');
  Object.entries(RPG.CARDS).forEach(([id, card]) => {
    const owned = HERO.cards.includes(id);
    const cc = el('div', 'tcard rar-' + card.rarity + (owned ? '' : ' locked'));
    const imgSrc = `assets/cards/${encodeURIComponent(card.name.toLowerCase())}.webp`;
    const imgFront = owned ? `<img class="tcard-img" src="${imgSrc}" onerror="this.style.display='none'">` : `<div class="card-icon">❓</div>`;
    const imgBack  = `<img class="tcard-img tcard-img-back" src="${imgSrc}" onerror="this.style.display='none'">`;
    const frontHtml = `${imgFront}<b>${owned ? esc(card.name) : '???'}</b><span class="tag">${card.rarity}</span>${owned ? '<span class="tcard-tap-hint">tocca per girare</span>' : ''}`;
    const backHtml = `<div class="tcard-back-content">${imgBack}<p class="small lore" style="text-align:center">${esc(card.lore)}</p><b class="card-back-name">${esc(card.name)}</b><span class="tag">${card.rarity}</span><span class="tcard-tap-hint">tocca per girare</span></div>`;
    cc.innerHTML = frontHtml;
    if (owned) {
      let face = 'front';
      cc.addEventListener('click', () => {
        if (cc.classList.contains('flip-out') || cc.classList.contains('flip-in')) return;
        cc.classList.add('flip-out');
        cc.addEventListener('animationend', () => {
          face = face === 'front' ? 'back' : 'front';
          cc.innerHTML = face === 'front' ? frontHtml : backHtml;
          cc.classList.remove('flip-out');
          cc.classList.add('flip-in');
          cc.addEventListener('animationend', () => cc.classList.remove('flip-in'), { once: true });
        }, { once: true });
      });
    }
    grid.appendChild(cc);
  });
  c.appendChild(grid);

  // Le Imprese — 100 traguardi raggruppati per bioma
  const claimed = HERO.achievementsClaimed || [];
  const unlockedCount = RPG.achievementsUnlocked(HERO).length;
  const pendingClaim = RPG.ACHIEVEMENTS.filter(a => HERO.level >= a.level && !claimed.includes(a.id)).length;
  c.appendChild(el('h3', 'section-title on-parchment-title small-title', '🏆 Le Imprese del Viandante'));
  c.appendChild(el('p', 'muted small center',
    `${unlockedCount} / 100 sbloccate · ${claimed.length} riscosse${pendingClaim > 0 ? ` · <b>${pendingClaim} da riscuotere!</b>` : ''}`));

  const catWrap = el('div', 'achievement-list');
  RPG.BIOMES.forEach((biome, bi) => {
    const bioAchievs = RPG.ACHIEVEMENTS.filter(a => a.level >= biome.min && a.level <= biome.max);
    if (!bioAchievs.length) return;
    const bioUnlocked = bioAchievs.filter(a => HERO.level >= a.level).length;
    const bioClaimed  = bioAchievs.filter(a => claimed.includes(a.id)).length;
    const bioPending  = bioAchievs.filter(a => HERO.level >= a.level && !claimed.includes(a.id)).length;
    const allDone = bioClaimed === bioAchievs.length;
    const isOpen = HERO.level >= biome.min;
    // Default open only for the current biome section
    const currentBiome = RPG.currentBiome(HERO.level);
    const defaultOpen = biome === currentBiome || (bioPending > 0 && bioUnlocked > 0);

    const section = el('div', 'achiev-cat-section');
    const header = el('button', 'achiev-cat-header');
    header.innerHTML = `
      <span class="achiev-cat-left">
        <span class="achiev-cat-icon">${isOpen ? biome.icon : '🔒'}</span>
        <span>
          <span class="achiev-cat-name">${isOpen ? biome.name : '???'}</span>
          <span class="achiev-cat-meta"> · Lv ${biome.min}–${biome.max} · ${bioUnlocked}/${bioAchievs.length}</span>
        </span>
      </span>
      <span>
        ${bioPending > 0 ? `<span class="achiev-cat-badge">+${bioPending} 🪙</span>` : (allDone ? `<span class="achiev-cat-badge done">✅</span>` : '')}
        <span class="achiev-cat-toggle">${defaultOpen ? '▲' : '▼'}</span>
      </span>`;

    const body = el('div', 'achiev-cat-body' + (defaultOpen ? '' : ' collapsed'));
    bioAchievs.forEach(a => {
      const unlocked = HERO.level >= a.level;
      const isClaimed = claimed.includes(a.id);
      const row = el('div', 'achievement-row' + (unlocked ? '' : ' locked') + (a.epic ? ' epic' : ''));
      const globalIdx = RPG.ACHIEVEMENTS.indexOf(a);
      const cardImg = (typeof CARD_IMGS !== 'undefined')
        ? CARD_IMGS[globalIdx % CARD_IMGS.length]
        : null;
      const iconHtml = unlocked && cardImg
        ? `<img class="achievement-card-thumb" src="${cardImg}" alt="">`
        : `<span class="achievement-icon-emoji">${unlocked ? a.icon : '🔒'}</span>`;
      row.innerHTML = `
        <div class="achievement-icon">${iconHtml}</div>
        <div class="achievement-mid">
          <b>${unlocked ? esc(a.name) : '???'}</b>
          <div class="small muted">${unlocked ? esc(a.desc) : `Sblocca al Livello ${a.level}`}</div>
        </div>
        <div class="achievement-side"></div>`;
      const side = row.querySelector('.achievement-side');
      if (isClaimed) {
        side.innerHTML = '<span class="tag">✅</span>';
      } else if (unlocked) {
        const btn = el('button', 'btn btn-small btn-primary', `🪙${a.reward.gold}`);
        btn.addEventListener('click', () => {
          const r = RPG.claimAchievement(HERO, a.id);
          persist(); renderHUD();
          if (r && r.ok) { toastAchievement(a, r.reward); sfx('coin'); }
          else toast(r);
          setTab('hero');
        });
        side.appendChild(btn);
      } else {
        side.innerHTML = `<span class="small muted">Liv. ${a.level}</span>`;
      }
      body.appendChild(row);
    });

    header.addEventListener('click', () => {
      const open = !body.classList.contains('collapsed');
      body.classList.toggle('collapsed', open);
      header.querySelector('.achiev-cat-toggle').textContent = open ? '▼' : '▲';
    });
    section.appendChild(header);
    section.appendChild(body);
    catWrap.appendChild(section);
  });
  c.appendChild(catWrap);
}

function _renderDragonAlbum(c) {
  const ownedIds = new Set((HERO.dragonCards || []).map(dc => dc.id));
  const total = RPG.DRAGON_CARDS.length;
  const owned = ownedIds.size;
  const pct = Math.round(owned / total * 100);

  // Panel stile Avamposto
  const panel = el('div', 'panel dc-entry-panel');

  // Immagine header
  const thumb = document.createElement('img');
  thumb.src = 'assets/ui/dominio-dei-draghi.webp';
  thumb.alt = '';
  thumb.className = 'camp-panel-thumb';
  thumb.onerror = () => { thumb.remove(); };
  panel.appendChild(thumb);

  // Header esterno
  panel.appendChild(el('h3', 'panel-title', ptIcon('assets/icons/icona dominio dei draghi.webp', 'Dominio dei Draghi', '🐉')));

  // Header interno (stats strip)
  const innerHdr = el('div', 'dc-entry-inner-hdr');
  innerHdr.innerHTML = `
    <span class="dc-entry-inner-label">Album delle Creature Leggendarie</span>
    <span class="dc-entry-inner-progress">
      <span class="dc-entry-inner-bar-wrap"><span class="dc-entry-inner-bar-fill" style="width:${pct}%"></span></span>
      <span class="dc-entry-inner-count">${owned} / ${total}</span>
    </span>`;
  panel.appendChild(innerHdr);

  // Descrizione epica
  const epicDesc = el('p', 'dc-entry-epic-desc', owned > 0
    ? `${owned} draghi risvegli. ${total - owned} ancora nell'ombra. Ogni chilometro percorso chiama una nuova creatura al tuo fianco.`
    : `Dal Livello 30, ogni allenamento risveglia una creatura leggendaria. Corri, cammina, combatti — e i draghi risponderanno alla tua chiamata.`);
  panel.appendChild(epicDesc);

  // Bottone collezione
  const btn = el('button', 'btn btn-primary wide', '<img src="assets/icons/icona box dominio dei draghi.webp" class="dc-btn-icon" alt=""> La Collezione dei Draghi');
  btn.addEventListener('click', () => { HERO_VIEW = 'dragon_cards'; setTab('hero'); });
  panel.appendChild(btn);

  c.appendChild(panel);
}

function showBeastDetail(b) {
  const known = (HERO.bestiary || []).includes(b.id);
  const fig = b.id === 'cavaliere-drago'
    ? `<div class="bd-emoji">${known ? '🐉' : '❓'}</div>`
    : `<img class="bd-img${known ? '' : ' bd-unknown'}" src="assets/bestiario/${b.id}.webp" alt="${b.name}">`;
  modal(`<div class="beast-detail">
    <div class="bd-fig">${fig}</div>
    ${b.boss ? `<div class="bd-boss-tag"><span class="tag tag-boss">${b.final ? 'NEMESI' : 'BOSS'}</span></div>` : ''}
    <h3 class="bd-name">${known ? esc(b.name) : '???'}</h3>
    <div class="bd-zone small muted">${zoneIcon(b.zone)} ${b.zone}</div>
    ${known ? `
      <div class="bd-weak"><span class="bd-weak-label">Debolezza</span><b>${esc(b.weakness)}</b></div>
      <p class="bd-lore small">${esc(b.lore)}</p>
    ` : `<p class="bd-locked muted small">${b.boss
        ? (b.final ? 'Completa le 5 Memorie per svelarlo.' : 'Sconfiggilo nella sua missione per scoprirlo.')
        : 'Allenati in questa zona per avvistarlo.'}</p>`}
    <button class="btn wide" onclick="closeModal()">Chiudi</button>
  </div>`);
}

function renderBestiaryView(c) {
  backBar(c);
  HERO.bestiary = HERO.bestiary || [];
  const discovered = HERO.bestiary.length;
  const total = RPG.BESTIARY.length;
  c.appendChild(el('h2', 'section-title on-parchment-title', '🐉 Il Bestiario dell\'Orda'));

  /* progress bar */
  const pct = Math.round(discovered / total * 100);
  const progWrap = el('div', 'bestiary-progress');
  progWrap.innerHTML = `<div class="bestiary-prog-bar"><div class="bestiary-prog-fill" style="width:${pct}%"></div></div>
    <div class="bestiary-prog-label">${discovered} / ${total} creature scoperte · ${pct}%</div>`;
  c.appendChild(progWrap);

  const zones = [...new Set(RPG.BESTIARY.map(b => b.zone))];
  const accessible = RPG.accessibleZones(HERO);
  zones.forEach(zone => {
    const inZone = RPG.BESTIARY.filter(b => b.zone === zone);
    const knownInZone = inZone.filter(b => HERO.bestiary.includes(b.id)).length;
    const isOpen = accessible.includes(zone) || knownInZone > 0;
    const zoneTitleEl = el('div', 'bestiary-zone-header');
    zoneTitleEl.innerHTML = isOpen
      ? `<span>${zoneIcon(zone)} ${zone}</span><span class="bestiary-zone-count small muted">${knownInZone}/${inZone.length}</span>`
      : `<span>🔒 Zona sconosciuta</span><span class="bestiary-zone-count small muted">0/${inZone.length}</span>`;
    c.appendChild(zoneTitleEl);
    const grid = el('div', 'bestiary-grid');
    inZone.forEach(b => {
      const known = HERO.bestiary.includes(b.id);
      const card = el('div', 'beast' + (known ? ' known' : ' unknown') + (b.boss ? ' boss' : ''));
      const imgWrap = el('div', 'beast-img-wrap');
      if (b.id === 'cavaliere-drago') {
        imgWrap.appendChild(el('div', 'beast-emoji', known ? '🐉' : '❓'));
      } else {
        const img = el('img', 'beast-img' + (known ? '' : ' beast-silhouette'));
        img.src = `assets/bestiario/${b.id}.webp`;
        img.loading = 'lazy';
        imgWrap.appendChild(img);
      }
      card.appendChild(imgWrap);
      card.appendChild(el('b', 'beast-name', known ? b.name : '???'));
      if (b.boss) card.appendChild(el('span', 'tag tag-boss beast-boss-tag', b.final ? 'NEMESI' : 'BOSS'));
      if (known) card.appendChild(el('div', 'beast-weak-inline small', `⚡ ${b.weakness}`));
      card.addEventListener('click', () => showBeastDetail(b));
      grid.appendChild(card);
    });
    c.appendChild(grid);
  });
}

/* ══════════════ Modal & toast ══════════════ */
function modal(html) {
  const box = $('#modal-box');
  box.classList.remove('scalata-dark-modal');
  if (typeof html === 'string') {
    box.innerHTML = html;
  } else {
    box.innerHTML = '';
    box.appendChild(html);
  }
  box.classList.remove('modal-opening');
  $('#modal').classList.remove('hidden');
  void box.offsetWidth;
  box.classList.add('modal-opening');
}
function closeModal() {
  $('#modal').classList.add('hidden');
  $('#modal-box').classList.remove('modal-opening', 'scalata-dark-modal');
}
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

let toastTimer = null;
function toast(msg) {
  let t = $('#toast');
  if (!t) { t = el('div', ''); t.id = 'toast'; document.body.appendChild(t); }
  const emojiMatch = msg.match(/^([^\x00-\x7F\s]+)\s+([\s\S]*)$/);
  if (emojiMatch) {
    t.innerHTML = `<span class="toast-icon">${emojiMatch[1]}</span><span class="toast-text">${esc(emojiMatch[2])}</span>`;
  } else {
    t.innerHTML = `<span class="toast-text" style="padding:12px 16px">${esc(msg)}</span>`;
  }
  t.classList.remove('show');
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

function toastAchievement(achievement, reward) {
  const existing = document.querySelector('.achievement-toast');
  if (existing) existing.remove();
  const card = document.createElement('div');
  card.className = 'achievement-toast';
  card.innerHTML = `
    <div class="ach-toast-icon">${esc(achievement.icon)}</div>
    <div class="ach-toast-body">
      <div class="ach-toast-label">✦ Impresa sbloccata! ✦</div>
      <div class="ach-toast-name">${esc(achievement.name)}</div>
      <div class="ach-toast-reward">+${reward.gold} 🪙 &nbsp;+${reward.xp} XP</div>
    </div>`;
  document.body.appendChild(card);
  requestAnimationFrame(() => card.classList.add('ach-toast-in'));
  const dismiss = () => {
    card.classList.add('ach-toast-out');
    setTimeout(() => card.remove(), 400);
  };
  const tid = setTimeout(dismiss, 3400);
  card.addEventListener('click', () => { clearTimeout(tid); dismiss(); });
  vibrate([80, 40, 80]);
}

/* ── Sfondo pergamena ── */
let PARCHMENT_OK = false;
(() => {
  const probe = new Image();
  probe.onload = () => {
    PARCHMENT_OK = true;
    if (CURRENT_TAB === 'hero' && HERO_VIEW === 'main') $('#tab-content').classList.add('bg-parchment');
  };
  probe.src = 'assets/backgrounds/pergamena.webp';
})();

/* ── Icone UI personalizzate ── */
const UI_ICONS = {
  camp:   'assets/ui/tab-rifugio.webp',
  map:    'assets/ui/tab-mappa.webp',
  train:  'assets/ui/tab-allenati.webp',
  market: 'assets/ui/tab-mercato.webp',
  hero:   'assets/ui/tab-eroe.webp',
};
const RES_ICONS = {
  gold:   'assets/ui/res-oro.webp',
  wood:   'assets/ui/res-legna.webp',
  stone:  'assets/ui/res-pietra.webp',
  fiches: 'assets/ui/res-fiches.webp',
};
const FICHE_ICO = '<img class="fiche-inline" src="assets/ui/res-fiches.webp" alt="🎴">';
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
      img.alt = '';
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
      const ico = span.parentElement.querySelector('.res-ico');
      if (!ico) return;
      const img = el('img', 'res-icon');
      img.src = path;
      img.alt = '';
      ico.textContent = '';
      ico.appendChild(img);
    };
    probe.src = path;
  });
})();


/* ═══════════ v2.7: UX & FOMO ═══════════ */

function gameDateApp() { return new Date(); }
function todayISO() { const d = gameDateApp(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function localDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

/* ── Sincronizzazione da Apple Salute via Comandi Rapidi ──────
   Il Comando Rapido apre: https://.../?sync_km=5.2&sync_type=camminata
   Nessun server coinvolto: il numero arriva incollato nell'URL e il gioco
   lo applica all'eroe attualmente selezionato su QUESTO telefono. */
function showClipboardSyncBanner() {
  const isAndroid = /android/i.test(navigator.userAgent);
  const banner = el('div', 'clipboard-sync-banner');
  banner.innerHTML = `
    <span class="csb-label">⚡ Passi dal Comando Rapido — tocca e incolla</span>
    <input class="csb-input" id="csb-input" type="text" inputmode="numeric" placeholder="Tocca qui → Incolla">`;
  document.body.appendChild(banner);

  const inp = document.getElementById('csb-input');
  if (isAndroid) inp.readOnly = true;
  inp.focus();

  inp.addEventListener('paste', e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    const steps = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (steps > 0) applyStepsSync(steps, banner);
  });
  if (!isAndroid) {
    inp.addEventListener('input', () => {
      const steps = parseInt(inp.value, 10);
      if (steps > 0) setTimeout(() => applyStepsSync(steps, banner), 300);
    });
  }
  setTimeout(() => { if (banner.parentNode) banner.remove(); }, 60000);
}

function applyStepsSync(steps, banner) {
  if (banner?.parentNode) banner.remove();
  if (!HERO || !(steps > 0)) return;
  const km = Math.round(steps * 0.00075 * 100) / 100;
  if (km < 0.05) { toast(`${steps} passi (${km} km) — troppo pochi.`); return; }
  const report = RPG.logHealthSync(HERO, 'camminata', km);
  if (report) { persist(); renderHUD(); FB.syncHero(HERO).catch(() => {}); if (HERO.guild && report.km > 0) FB.contributeToGuild(HERO, report.km).catch(() => {}); showHealthSyncResult(report); maybeSyncChallenge(); }
  else toast('Attività già sincronizzata per oggi.');
}

function applyHealthSyncFromURL(hero) {
  try {
    const params = new URLSearchParams(location.search);
    const hasSync = params.has('sync_km') || params.has('sync_steps');
    if (!hasSync) return null;

    // Valida il token — previene iniezioni km tramite URL artefatti
    const givenToken = params.get('sync_token');
    history.replaceState({}, '', location.pathname + location.hash);
    if (!givenToken) {
      console.warn('[sync] URL senza sync_token — sync rifiutato. Aggiorna il Comando Rapido.');
      setTimeout(() => toast('⚠️ Sync rifiutato: token mancante. Aggiorna il Comando Rapido in Impostazioni.'), 1500);
      return null;
    }
    if (givenToken !== getSyncToken()) {
      console.warn('[sync] sync_token non valido — sync rifiutato.');
      setTimeout(() => toast('⚠️ Sync rifiutato: token errato. Controlla il Comando Rapido in Impostazioni.'), 1500);
      return null;
    }

    let km;
    if (params.has('sync_steps')) {
      const steps = parseInt(params.get('sync_steps'), 10);
      km = steps * 0.00075; // ~0.75 m per passo
    } else {
      km = parseFloat((params.get('sync_km') || '').replace(',', '.'));
    }
    const type = params.get('sync_type') || 'camminata';
    if (!hero || !(km > 0) || !RPG.ACTIVITIES[type]) return null;
    return RPG.logHealthSync(hero, type, km);
  } catch (err) {
    console.error('Errore sincronizzazione Salute:', err);
    return null;
  }
}

function showHealthSyncResult(report) {
  if (!report || report.error) { nextOpening(); return; }
  const notable = report.levelsGained.length || report.missionComplete ||
    report.incursionComplete || report.fragments || report.sighting ||
    report.finalReveal || (report.loot && report.loot.length);
  if (notable) {
    showReport(report); // stesso popup completo degli allenamenti manuali
  } else {
    toast(`🏥 Sincronizzato da Salute: +${report.km} km, +${report.xp} XP`);
    nextOpening();
  }
}

/* ── Coda dei popup di apertura ── */
let OPEN_QUEUE = [];
function nextOpening() {
  closeModal();
  const fn = OPEN_QUEUE.shift();
  if (fn) fn();
}

/* ── Helpers notifiche native (Capacitor iOS) ── */
function _isNative() {
  return typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform();
}

async function _getNotifPermission() {
  if (_isNative()) {
    const PN = window.Capacitor.Plugins.PushNotifications;
    if (!PN) return 'unsupported';
    try { const { receive } = await PN.checkPermissions(); return receive; } catch { return 'unsupported'; }
  }
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission === 'default' ? 'prompt' : Notification.permission;
}

async function _requestNotifPermission() {
  if (_isNative()) {
    const PN = window.Capacitor.Plugins.PushNotifications;
    if (!PN) return 'denied';
    try {
      const { receive } = await PN.requestPermissions();
      if (receive === 'granted') { await PN.register().catch(() => {}); }
      return receive;
    } catch { return 'denied'; }
  }
  if (!('Notification' in window)) return 'denied';
  return Notification.requestPermission();
}

/* ── Notifiche locali ── */
async function setupNotifications() {
  if (!HERO) return;
  const perm = await _getNotifPermission();
  if (perm === 'unsupported') return;
  if (!_isNative()) {
    updateNotifState().catch(() => {});
    checkAndNotify();
    checkMapNotify();
    checkBoardNotify();
    checkPvpNotify();
    checkPetNotify();
    scheduleSmartNotifications();
    registerPeriodicSync();
  }
  if (perm === 'prompt' && !HERO.notifAsked && (HERO.totalKm || 0) > 0) {
    setTimeout(async () => {
      const r = await _requestNotifPermission();
      HERO.notifAsked = true; persist();
      if (r === 'granted' && !_isNative()) { checkAndNotify(); checkMapNotify(); checkBoardNotify(); checkPvpNotify(); scheduleSmartNotifications(); }
    }, 4000);
  }
}

function askNotifPermissionAfterWorkout() {
  if (HERO.notifAsked) return;
  setTimeout(async () => {
    const perm = await _getNotifPermission();
    if (perm !== 'prompt') return;
    const r = await _requestNotifPermission();
    HERO.notifAsked = true; persist();
    if (r === 'granted' && !_isNative()) { checkAndNotify(); checkMapNotify(); checkPvpNotify(); scheduleSmartNotifications(); }
  }, 3500);
}

/* ── Notifiche schedulate (Phase 1 — locali via setTimeout) ── */
function scheduleSmartNotifications() {
  if (_isNative() || !('Notification' in window) || Notification.permission !== 'granted' || !HERO) return;
  const today = todayISO();
  // Evita di riSchedulare se l'app viene riaperta più volte nella stessa giornata
  const schedKey = 'notif_sched_' + today;
  if (localStorage.getItem(schedKey)) return;
  localStorage.setItem(schedKey, '1');

  // Pulisce chiavi di schedulazione dei giorni precedenti
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith('notif_sched_') && k !== schedKey) localStorage.removeItem(k);
  }

  function scheduleAt(hour, min, fn) {
    const now = new Date();
    const fire = new Date();
    fire.setHours(hour, min, 0, 0);
    const delay = fire - now;
    if (delay > 0) setTimeout(fn, delay);
  }

  // ① Pozione del Giorno — alle 19:00 se non ancora riscattata
  scheduleAt(19, 0, () => {
    const already = HERO.dailyPotion && HERO.dailyPotion.claimedDate === todayISO();
    if (!already)
      showNotif('⚗️ Pozione non riscattata!',
        'La Pozione del Giorno ti aspetta — riscattala prima di mezzanotte!',
        'potion_unclaimed_' + todayISO());
  });

  // ② Arena — alle 22:00 se restano sfide inutilizzate
  scheduleAt(22, 0, () => {
    const left = RPG.battlesLeft(HERO);
    if (left > 0)
      showNotif("⚔️ L'Arena chiude tra 2 ore!",
        `Ti restano ancora ${left} sfide oggi — non sprecarle!`,
        'arena_closing_' + todayISO());
  });
}

/* ③ Mappa del Tesoro — controllo immediato: sei vicino a una tappa? */
function checkMapNotify() {
  if (_isNative() || !('Notification' in window) || Notification.permission !== 'granted' || !HERO) return;
  const tmStatus = RPG.treasureMapStatus(HERO);
  if (!tmStatus) return;
  const { progressKm, claimed } = tmStatus;
  const TIERS = RPG.TREASURE_MAP_TIERS;
  const nextTier = TIERS.find((t, i) => !claimed.includes(i) && progressKm < t.km);
  if (!nextTier) return;
  const kmLeft = +(nextTier.km - progressKm).toFixed(1);
  if (kmLeft > 5) return;
  showNotif('🗺️ Sei vicino a una tappa!',
    `Ti mancano solo ${kmLeft} km per il prossimo medaglione. Forza!`,
    'map_close_' + Math.floor(progressKm * 10));
}

/* ④ Bacheca del Viandante — missioni riscattabili in scadenza (dopo 21:00) */
function checkBoardNotify() {
  if (_isNative() || !('Notification' in window) || Notification.permission !== 'granted' || !HERO) return;
  const hour = new Date().getHours();
  if (hour < 21) return;
  const today = todayISO();
  const board = HERO.board && HERO.board.date === today ? HERO.board : null;
  if (!board) return;
  const claimable = board.quests.filter(q =>
    (board.kmLogged || 0) >= q.km && !board.claimed.includes(q.id)
  );
  if (!claimable.length) return;
  showNotif(
    '📜 Missioni Bacheca in scadenza!',
    `Hai ${claimable.length} missione${claimable.length > 1 ? '' : ''} completata${claimable.length > 1 ? 'e' : ''} da riscuotere — reset a mezzanotte!`,
    'board_claimable_' + today
  );
}

/* ── Periodic Background Sync ── */

/* Scrive uno snapshot dello stato rilevante per le notifiche nella Cache API.
   Il service worker lo legge durante periodicsync (senza accesso a localStorage). */
async function updateNotifState() {
  if (!('caches' in window) || !HERO) return;
  const today = todayISO();
  const tmStatus = RPG.treasureMapStatus(HERO);
  let mapKmLeft = null;
  if (tmStatus) {
    const next = RPG.TREASURE_MAP_TIERS.find((t, i) =>
      !tmStatus.claimed.includes(i) && tmStatus.progressKm < t.km);
    if (next) mapKmLeft = +(next.km - tmStatus.progressKm).toFixed(1);
  }
  const pet = HERO.pet && HERO.pet.hatched ? HERO.pet : null;
  const bff = HERO.consumableBuffs || {};
  const now = Date.now();
  const hasActiveBuff = !!(
    (bff.xpMult && bff.xpMult.sessions > 0) ||
    (bff.goldMult && bff.goldMult.expiresAt > now) ||
    (bff.allBoost && bff.allBoost.expiresAt > now) ||
    bff.streakShield || bff.extraBoss || bff.dropBoost
  );
  const board = HERO.board && HERO.board.date === today ? HERO.board : null;
  const boardClaimable = board
    ? board.quests.filter(q => (board.kmLogged || 0) >= q.km && !board.claimed.includes(q.id)).length
    : 0;
  const dcBattles = HERO.dcBattles;
  const dcUsedToday = dcBattles && dcBattles.date === today ? dcBattles.count : 0;
  const dcLeft = Math.max(0, (typeof DC_DAILY_BATTLES !== 'undefined' ? DC_DAILY_BATTLES : 5) - dcUsedToday);
  const state = {
    date: today,
    potionClaimed: !!(HERO.dailyPotion && HERO.dailyPotion.claimedDate === today),
    battlesLeft: RPG.battlesLeft(HERO),
    mapKmLeft,
    heroName: HERO.name || '',
    petName: pet ? (pet.name || '') : null,
    petHunger: pet ? pet.hunger : null,
    petMood: pet ? pet.mood : null,
    hasActiveBuff,
    boardClaimable,
    dcBattlesLeft: dcLeft,
    dcPlayedToday: dcUsedToday > 0,
    dcUnlocked: (HERO.level || 0) >= 50 && (HERO.dragonCards || []).length >= 5,
  };
  const cache = await caches.open('heropace-notif-v1');
  await cache.put('/_notif-state', new Response(JSON.stringify(state),
    { headers: { 'Content-Type': 'application/json' } }));
}

/* Registra il Periodic Background Sync (Chrome Android, PWA installata) */
async function registerPeriodicSync() {
  if (!('periodicSync' in ServiceWorkerRegistration.prototype)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const perm = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (perm.state !== 'granted') return;
    await reg.periodicSync.register('smart-notif-check', {
      minInterval: 6 * 60 * 60 * 1000 // chiede ogni 6h; il browser decide la freq reale
    });
  } catch {}
}

/* Mostra una notifica tramite service worker (funziona in background su mobile) */
async function showNotif(title, body, tag, data) {
  if (_isNative() || !('Notification' in window) || Notification.permission !== 'granted') return;
  if (localStorage.getItem('notif_shown_' + tag)) return;
  localStorage.setItem('notif_shown_' + tag, '1');
  const opts = { body, icon: 'assets/icons/icon.svg', badge: 'assets/icons/icon.svg', tag, data: data || {} };
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) { reg.showNotification(title, opts); return; }
  } catch {}
  new Notification(title, opts);
}

/* ── Hero Share Card ─────────────────────────────────────────── */
function showHeroShareCard() {
  const existing = document.getElementById('share-overlay');
  if (existing) existing.remove();

  const pt          = pvpTitle(HERO.pvpWins || 0);
  const classEmoji  = CLASS_EMOJI[HERO.storyId] || '🧑';
  const heroTitle   = RPG.heroTitle(HERO.level);
  const km          = (HERO.totalKm || 0).toFixed(1);
  const streak      = HERO.streak && HERO.streak.count > 1 ? HERO.streak.count : 0;

  const overlay = el('div', 'share-overlay');
  overlay.id = 'share-overlay';

  const card = el('div', 'share-card');

  // Chiudi
  const closeBtn = el('button', 'share-close-btn', '✕');
  closeBtn.addEventListener('click', () => overlay.remove());
  card.appendChild(closeBtn);

  // Wordmark
  card.appendChild(el('div', 'share-wordmark', "HERO'S PACE"));
  card.appendChild(el('div', 'share-ornament-line'));

  // Avatar
  const avatarWrap = el('div', 'share-avatar-wrap');
  if (isImageAvatar(HERO)) {
    const img = el('img', 'share-avatar-img');
    img.src = HERO.avatar;
    img.alt = HERO.name;
    img.onerror = () => { img.replaceWith(el('div', 'share-avatar-emoji', classEmoji)); };
    avatarWrap.appendChild(img);
  } else {
    avatarWrap.appendChild(el('div', 'share-avatar-emoji', classEmoji));
  }
  card.appendChild(avatarWrap);

  // Nome + titolo
  card.appendChild(el('div', 'share-hero-name', esc(HERO.name)));
  const titleEl = el('div', 'share-hero-subtitle');
  titleEl.innerHTML = `Livello ${HERO.level} &nbsp;·&nbsp; <i>${esc(heroTitle)}</i>`;
  card.appendChild(titleEl);

  if (pt) {
    const ptEl = el('div', 'share-pvp-title');
    ptEl.innerHTML = `${pt.icon} ${pt.label}`;
    card.appendChild(ptEl);
  }

  // Stats
  const stats = el('div', 'share-stats');
  const addStat = (val, lbl) => {
    const s = el('div', 'share-stat');
    s.innerHTML = `<span class="share-stat-val">${val}</span><span class="share-stat-lbl">${lbl}</span>`;
    stats.appendChild(s);
  };
  addStat(km, 'km totali');
  addStat(HERO.level, 'livello');
  if (HERO.pvpWins) addStat(HERO.pvpWins, 'vittorie ⚔️');
  if (streak)       addStat(`${streak}🔥`, 'streak');
  card.appendChild(stats);

  // Tagline
  card.appendChild(el('div', 'share-divider-icon', '⚔'));
  card.appendChild(el('div', 'share-tagline', 'Riesci a battermi?'));
  card.appendChild(el('div', 'share-tagline-sub', "Sfidami su Hero's Pace"));

  // Bottoni
  const btns = el('div', 'share-btns');
  const shareText = `⚔️ ${HERO.name} — Lv ${HERO.level} — ${km} km${pt ? ` · ${pt.label}` : ''}. Riesci a battermi su Hero's Pace?`;
  const shareUrl  = APP_BASE_URL;

  if (navigator.share) {
    const shareBtn = el('button', 'btn btn-primary wide', '📤 Condividi');
    shareBtn.addEventListener('click', () => {
      navigator.share({ title: "Hero's Pace ⚔️", text: shareText, url: shareUrl }).catch(() => {});
    });
    btns.appendChild(shareBtn);
  }

  const copyBtn = el('button', 'btn wide share-copy-btn', '🔗 Copia link');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(shareText + '\n' + shareUrl).then(() => {
      copyBtn.textContent = '✅ Copiato!';
      setTimeout(() => { copyBtn.textContent = '🔗 Copia link'; }, 2000);
    }).catch(() => {});
  });
  btns.appendChild(copyBtn);
  card.appendChild(btns);

  overlay.appendChild(card);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function checkAndNotify() {
  if (_isNative() || !('Notification' in window) || Notification.permission !== 'granted' || !HERO) return;
  const today = new Date(); const todayStr = todayISO();
  const hour = today.getHours();
  const trainedToday = HERO.log[0] && localDate(new Date(HERO.log[0].date)) === todayStr;
  if (!trainedToday && hour >= 17)
    showNotif("Hero's Pace ⚔️", 'Il Viandante ti aspetta! Non dimenticare l\'allenamento di oggi.', 'train_' + todayStr);
  if (!trainedToday && hour >= 20 && HERO.streak && HERO.streak.count >= 3)
    showNotif('⚠️ Streak in pericolo!', `Hai una streak di ${HERO.streak.count} giorni — allena prima di mezzanotte!`, 'streak_' + todayStr);
  if (HERO.pet && HERO.pet.hatched && HERO.pet.expedition) {
    const status = RPG.expeditionStatus(HERO);
    if (status && status.ready)
      showNotif("Hero's Pace 🎒", `${HERO.pet.name} è tornato dalla spedizione con del bottino!`, 'exp_' + HERO.pet.expedition.startedAt);
  }
}

/* Controlla le sfide PvP su Firestore e notifica cambi di stato */
async function checkPvpNotify() {
  if (_isNative() || !('Notification' in window) || Notification.permission !== 'granted' || !HERO) return;
  const ac = HERO.cloud && HERO.cloud.activeChallenge;
  if (!ac) return;
  const ch = await FB.getChallenge(ac.id);
  if (!ch) return;

  // Avversario si è unito
  if (ch.status === 'active' && ch.opponentName) {
    const key = 'pvp_joined_' + ac.id;
    const theirName = ac.role === 'creator' ? ch.opponentName : ch.creatorName;
    showNotif('⚔️ La sfida è iniziata!', `${theirName} ha accettato la tua sfida. Che vinca il migliore!`, key);
  }

  // Scade oggi
  const today = todayISO();
  if (ch.status === 'active' && ch.endDate === today) {
    showNotif('⏳ Ultimo giorno di sfida!', 'La sfida PvP scade oggi — dai tutto quello che hai!', 'pvp_lastday_' + ac.id);
  }

  // Terminata — notifica risultato
  if (ch.status === 'completed') {
    const iWon = ch.winnerId === HERO.id;
    showNotif(
      iWon ? '🏆 Hai vinto la sfida PvP!' : '💀 Sfida PvP terminata',
      iWon ? "Apri Hero's Pace per ritirare la tua ricompensa in oro!" : "Apri Hero's Pace per vedere i risultati finali.",
      'pvp_result_' + ac.id
    );
  }
}

/* ── Riepilogo "cosa ti aspetta oggi" ── */
function showMonthlyRecap(recap) {
  const stars = recap.sessions >= 20 ? '⭐⭐⭐' : recap.sessions >= 10 ? '⭐⭐' : '⭐';
  modal(`
    <h3 class="panel-title center">📜 Recap di ${esc(recap.month)}</h3>
    <div class="monthly-recap-grid">
      <div class="recap-cell"><span class="recap-val">${recap.km}</span><span class="recap-lbl">km percorsi</span></div>
      <div class="recap-cell"><span class="recap-val">${recap.sessions}</span><span class="recap-lbl">sessioni</span></div>
      <div class="recap-cell"><span class="recap-val">${recap.xp.toLocaleString('it-IT')}</span><span class="recap-lbl">XP guadagnati</span></div>
    </div>
    <p class="center" style="font-size:1.6rem;margin:.5rem 0">${stars}</p>
    <p class="muted small center">${recap.sessions >= 20 ? 'Un mese leggendario! Il Viandante è fiero di te.' : recap.sessions >= 10 ? 'Ottimo lavoro — continua così!' : 'Ogni passo conta. Il prossimo mese andrà meglio!'}</p>
    <button class="btn btn-primary wide" onclick="nextOpening()">Avanti!</button>
  `);
}

function showWeeklyRecap(recap) {
  const stars = recap.sessions >= 5 ? '⭐⭐⭐' : recap.sessions >= 3 ? '⭐⭐' : '⭐';
  const msg = recap.sessions >= 5
    ? 'Settimana leggendaria! Il Viandante è fiero di te.'
    : recap.sessions >= 3
    ? 'Buona costanza — continua su questa strada!'
    : 'Ogni passo conta. Questa settimana punta a di più!';
  modal(`
    <h3 class="panel-title center">📅 Settimana scorsa</h3>
    <div class="monthly-recap-grid">
      <div class="recap-cell"><span class="recap-val">${recap.km}</span><span class="recap-lbl">km percorsi</span></div>
      <div class="recap-cell"><span class="recap-val">${recap.sessions}</span><span class="recap-lbl">sessioni</span></div>
      <div class="recap-cell"><span class="recap-val">${recap.xp.toLocaleString('it-IT')}</span><span class="recap-lbl">XP guadagnati</span></div>
    </div>
    <p class="center" style="font-size:1.6rem;margin:.5rem 0">${stars}</p>
    <p class="muted small center">${msg}</p>
    <button class="btn btn-primary wide" onclick="nextOpening()">Avanti!</button>
  `);
}

function showDailySummary() {
  const gi = p => `<img class="today-row-icon" src="assets/ui/giornata/${p}" alt="">`;
  let rows = '';
  if (HERO.incursion && !HERO.incursion.done) {
    rows += `<div class="today-row">${gi('incursione.webp')} <div><b>Incursione:</b> ${esc(HERO.incursion.name)}<br>
      <span class="small muted">${(HERO.incursion.km - HERO.incursion.progressKm).toFixed(1)} km per il forziere · <span data-cd="midnight">…</span></span></div></div>`;
  }
  if (HERO.activeMission) {
    const m = RPG.MISSIONS.find(x => x.id === HERO.activeMission.id);
    if (m) rows += `<div class="today-row">${gi('missione.webp')} <div><b>Missione:</b> ${m.name}<br>
      <span class="small muted">mancano ${(m.km - HERO.activeMission.progressKm).toFixed(1)} km</span></div></div>`;
  }
  rows += `<div class="today-row">${gi('obiettivo.webp')} <div><b>Obiettivo del giorno:</b> ${RPG.dailyGoalKm(HERO.level)} km</div></div>`;
  if (HERO.streak.count > 1)
    rows += `<div class="today-row">${gi('streak.webp')} <div><b>Streak:</b> ${HERO.streak.count} giorni di fila — non spezzarla!</div></div>`;
  const nu = nextUnlock(HERO);
  if (nu) rows += `<div class="today-row">${gi('cavalcatura.webp')} <div><b>Prossimo sblocco</b> (liv. ${nu.level}): ${nu.text}</div></div>`;
  modal(`
    <h3 class="panel-title">${ptIcon('assets/ui/giornata/giornata.webp', 'La tua Giornata', '🌅')} La tua Giornata, ${esc(HERO.name)}</h3>
    ${rows}
    <button class="btn btn-primary wide" onclick="nextOpening(); setTab('train')">⚔️ Vado ad allenarmi!</button>
    <button class="btn wide" onclick="nextOpening()">Dopo</button>
  `);
}

/* ── Prossimo sblocco in arrivo ── */
function nextUnlock(hero) {
  const c = [];
  if (hero.level < 100) {
    const nm = Math.ceil((hero.level + 1) / 5) * 5;
    const mount = RPG.MOUNTS.find(m => m.level === nm);
    if (mount) c.push({ level: nm, icon: '🐴', text: `nuova cavalcatura` });
  }
  const nb = RPG.BIOMES.find(b => b.min > hero.level);
  if (nb) c.push({ level: nb.min, icon: nb.icon, text: `nuovo bioma da esplorare` });
  const tiers = [[16, 'Epici'], [31, 'Leggendari'], [51, 'Divini'], [76, 'Oscuri']];
  const nt = tiers.find(([lv]) => lv > hero.level);
  if (nt) c.push({ level: nt[0], icon: '💎', text: `loot di rarità ${nt[1]}!` });
  if (!c.length) return null;
  c.sort((a, b) => a.level - b.level);
  const n = c[0];
  n.inLv = n.level - hero.level;
  return n;
}

/* ── Badge rossi sulla tab bar ── */
function updateBadges() {
  if (!HERO) return;
  const set = (tab, on) => {
    const b = document.querySelector(`#tabbar .tab[data-tab="${tab}"]`);
    if (!b) return;
    let d = b.querySelector('.tab-badge');
    if (on && !d) b.appendChild(el('span', 'tab-badge'));
    if (!on && d) d.remove();
  };
  set('map', !!(HERO.incursion && !HERO.incursion.done));
  set('market', HERO.forgeSeen !== todayISO());
  set('hero', Object.entries(HERO.equipment || {}).some(([s, id]) =>
    !id && (HERO.items || []).some(i => i.slot === s)));
  const dc = RPG.getDailyChallenges(HERO);
  const wc = RPG.getWeeklyChallenges(HERO);
  const todayKmBadge = RPG.todayKm(HERO);
  const boardBadge = HERO.board && HERO.board.date === new Date().toISOString().slice(0,10)
    ? HERO.board.quests.some(q => todayKmBadge >= q.km && !HERO.board.claimed.includes(q.id))
    : false;
  set('train', boardBadge
    || dc.list.some(ch => ch.progress >= ch.target && !ch.claimed)
    || wc.list.some(ch => ch.progress >= ch.target && !ch.claimed));
  set('camp', false);
}

/* ── Countdown live (aggiornati ogni secondo) ── */
function msToMidnight() {
  // Reset alle 04:00 — conta fino alle 04:00 del giorno successivo
  const d = new Date();
  const next4 = new Date(d);
  next4.setHours(4, 0, 0, 0);
  if (next4 <= d) next4.setDate(next4.getDate() + 1);
  return next4 - d;
}
/* ── Zaino dell'Avventuriero (consumabili) ──────────────────────────────── */
const ZAINO_CATS = [
  { id: 'tutti',     label: 'Tutti' },
  { id: 'pozioni',   label: '🍯 Pozioni' },
  { id: 'rune',      label: '🔮 Rune' },
  { id: 'utility',   label: '🧭 Utility' },
  { id: 'materiali', label: '⚒️ Materiali' },
];
let ZAINO_CAT = 'tutti';

function showScratchCard(ticket) {
  const cfg = RPG.TICKET_TYPES[ticket.type];

  // Scratch subito: il risultato è già deciso (seed fisso)
  const result = RPG.scratchTicket(HERO, ticket.id);
  RPG.save({ heroes: STATE.heroes, current: STATE.current, claimedEvents: STATE.claimedEvents });
  if (result.error) { toast('Biglietto non valido.'); setTab('market'); return; }

  const CELL_CFG = {
    comune:      { fill: '#a87010', noiseA: 'rgba(255,200,60,0.15)', noiseB: 'rgba(100,60,0,0.2)',
                   area: { l:21, r:21, t:39, b:21, gap:2.8 } },
    raro:        { fill: '#0a1a28', noiseA: 'rgba(77,217,232,0.10)', noiseB: 'rgba(0,20,40,0.35)',
                   area: { l:24, r:24, t:38, b:32, gap:3 } },
    leggendario: { fill: '#180330', noiseA: 'rgba(180,80,255,0.12)', noiseB: 'rgba(50,0,90,0.3)',
                   area: { l:24, r:24, t:42, b:30, gap:3 }, outerFlex: 1.25, innerFlex: 0.75 },
  };
  const cc = CELL_CFG[ticket.type];

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <h3 class="panel-title">🎟️ ${esc(cfg.name)}</h3>
    <p class="muted small center" style="margin-bottom:10px">Gratta le celle per scoprire il premio</p>
    <div id="sc-card" style="position:relative;width:100%;border-radius:10px;overflow:hidden;cursor:crosshair;user-select:none">
      <img id="sc-bg" src="${cfg.img}" style="display:block;width:100%;height:auto;border-radius:10px;-webkit-user-drag:none" draggable="false">
      <div id="sc-cells" style="position:absolute;display:flex;"></div>
    </div>
    <div id="sc-result" style="display:none;margin-top:14px;text-align:center"></div>
    <button class="btn btn-secondary wide" style="margin-top:14px" onclick="closeModal()">Chiudi</button>
  `;

  modal(wrap);

  // Posiziona il contenitore celle dopo il render
  requestAnimationFrame(() => {
    const cardEl  = document.getElementById('sc-card');
    const cellsEl = document.getElementById('sc-cells');
    if (!cardEl || !cellsEl) return;

    const W = cardEl.offsetWidth;
    const H = cardEl.offsetHeight;
    const a = cc.area;

    cellsEl.style.left    = a.l + '%';
    cellsEl.style.right   = a.r + '%';
    cellsEl.style.top     = a.t + '%';
    cellsEl.style.bottom  = a.b + '%';
    cellsEl.style.gap     = a.gap + '%';
    cellsEl.style.alignItems = 'stretch';

    let revealedCount = 0;
    let hintGone = false;

    result.symbols.forEach((sym, idx) => {
      const cell = document.createElement('div');
      cell.style.cssText = 'position:relative;overflow:hidden;border-radius:6px;cursor:crosshair;';
      cell.style.flex = (cc.outerFlex && idx !== 1) ? String(cc.outerFlex) : (cc.innerFlex && idx === 1) ? String(cc.innerFlex) : '1';

      const symEl = document.createElement('div');
      symEl.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:clamp(1.2rem,4vw,2rem);';
      symEl.textContent = sym;
      cell.appendChild(symEl);

      const canvas = document.createElement('canvas');
      canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;background:${cc.fill};`;
      cell.appendChild(canvas);
      cellsEl.appendChild(cell);

      requestAnimationFrame(() => {
        const cW = cell.offsetWidth  || 80;
        const cH = cell.offsetHeight || 100;
        const dpr = devicePixelRatio || 1;
        canvas.width  = cW * dpr;
        canvas.height = cH * dpr;
        canvas.style.width  = cW + 'px';
        canvas.style.height = cH + 'px';

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.fillStyle = cc.fill;
        ctx.fillRect(0, 0, cW, cH);
        for (let n = 0; n < 400; n++) {
          const x = Math.random() * cW, y = Math.random() * cH, r = Math.random() * 1.4;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = Math.random() > 0.5 ? cc.noiseA : cc.noiseB;
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        for (let y = 7; y < cH; y += 9) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cW, y); ctx.stroke();
        }

        let revealed = false, isDown = false;
        function getPos(e) {
          const r = canvas.getBoundingClientRect();
          const src = e.touches ? e.touches[0] : e;
          return { x: src.clientX - r.left, y: src.clientY - r.top };
        }
        function scratch(x, y) {
          if (revealed) return;
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
        function checkReveal() {
          const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let t = 0;
          for (let p = 3; p < d.length; p += 4) if (d[p] < 128) t++;
          if (t / (canvas.width * canvas.height) >= 0.52) autoReveal();
        }
        function autoReveal() {
          if (revealed) return;
          revealed = true;
          clearInterval(timer);
          let op = 1;
          const fade = setInterval(() => {
            op -= 0.06; canvas.style.opacity = Math.max(0, op);
            if (op <= 0) {
              clearInterval(fade); canvas.style.display = 'none';
              if (++revealedCount === 3) showResult();
            }
          }, 20);
        }
        const timer = setInterval(checkReveal, 130);

        canvas.addEventListener('mousedown',  e => { isDown = true; const p = getPos(e); scratch(p.x, p.y); });
        canvas.addEventListener('mousemove',  e => { if (isDown) { const p = getPos(e); scratch(p.x, p.y); } });
        canvas.addEventListener('mouseup',    () => isDown = false);
        canvas.addEventListener('mouseleave', () => isDown = false);
        canvas.addEventListener('touchstart', e => { e.preventDefault(); isDown = true; const p = getPos(e); scratch(p.x, p.y); }, { passive: false });
        canvas.addEventListener('touchmove',  e => { e.preventDefault(); if (isDown) { const p = getPos(e); scratch(p.x, p.y); } }, { passive: false });
        canvas.addEventListener('touchend',   () => isDown = false);
      });
    });

    function showResult() {
      const resEl = document.getElementById('sc-result');
      if (!resEl) return;
      resEl.style.display = 'block';
      if (result.isWin) {
        resEl.innerHTML = `
          <div class="panel" style="background:rgba(200,160,20,0.18);border:2px solid rgba(200,160,20,0.55)">
            <div style="font-size:1.8rem;margin-bottom:6px">🎉</div>
            <b style="font-size:1.1rem;color:var(--text)">${esc(result.prize.label)}</b>
            ${result.prize.droppedItem ? `<div class="muted small" style="margin-top:6px">+ ${esc(result.prize.droppedItem.name)}</div>` : ''}
            ${result.prize.droppedConsumable ? `<div class="muted small" style="margin-top:6px">+ Consumabile</div>` : ''}
          </div>`;
        toast(`🎟️ ${result.prize.label}`);
      } else {
        resEl.innerHTML = `<p class="muted">Nessun premio questa volta — riprova con il prossimo biglietto!</p>`;
      }
      setTimeout(() => { MARKET_VIEW = 'hub'; setTab('market'); }, 3000);
    }
  });
}

/* ── checkChampionProvas — chiamato dopo ogni allenamento ─────── */
function checkChampionProvas() {
  if ((HERO.level || 0) < 61) return;
  const today = new Date().toISOString().slice(0, 10);
  const result = checkProveDelCampione(HERO, today);
  if (!result) return;
  persist();
  result.completed.forEach(p => {
    if (p.gladius) {
      toast('🗡️ Hai sbloccato il Gladius Aeternus! Controllalo nello Zaino.');
    } else {
      toast(`🏆 Prova completata: ${p.name}! Trofeo: ${p.trophy}`);
    }
  });
  result.failed.forEach(p => {
    toast(`❌ Prova scaduta: ${p.name}. Non si ripete.`);
  });
}

function checkEcoLeggendariDaily() {
  if ((HERO.level || 0) < 71) return;
  const today = new Date().toISOString().slice(0, 10);
  const result = checkEcoLeggendari(HERO, today);
  if (!result) return;
  persist();
  result.completed.forEach(leg => {
    toast(`👻 Prova superata: ${leg.name}! Reliquia ottenuta.`);
  });
  result.failed.forEach(leg => {
    toast(`❌ Prova scaduta: ${leg.name}. Non si ripete.`);
  });
}

/* ── Bacheca Trofei Prove del Campione ────────────────────────── */
function renderCampioneTrophyView(c) {
  const today = new Date().toISOString().slice(0, 10);
  const back = el('button', 'btn back-btn');
  back.innerHTML = '← Eroe';
  back.addEventListener('click', () => { HERO_VIEW = 'main'; setTab('hero'); });
  c.appendChild(back);

  const champ = HERO.champion || { provas: {}, trophies: [] };
  const trophies = champ.trophies || [];
  const provas = champ.provas || {};
  const total = CHAMPION_PROVAS.length;
  const completed = trophies.length;
  const hasAll = completed === total;

  // Header
  const hdr = el('div', 'champ-hdr');
  hdr.innerHTML = `
    <div class="champ-hdr-title">⚔️ Prove del Campione</div>
    <div class="champ-hdr-sub">Dieci sfide reali. Una sola possibilità ciascuna.</div>
    <div class="champ-progress-wrap">
      <div class="champ-progress-bar">
        <div class="champ-progress-fill" style="width:${Math.round(completed/total*100)}%"></div>
      </div>
      <div class="champ-progress-label">${completed} / ${total} trofei</div>
    </div>`;
  c.appendChild(hdr);

  // Trophy grid
  const grid = el('div', 'champ-grid');
  CHAMPION_PROVAS.forEach(prova => {
    const state = provas[prova.id];
    const isTrophied = trophies.includes(prova.id);
    const isCompleted = state && state.completedAt;
    const isFailed = state && state.failedAt;
    const isActive = state && !isCompleted && !isFailed;
    const isLocked = !state;

    const card = el('div', `champ-card ${isCompleted ? 'champ-card-done' : isFailed ? 'champ-card-fail' : isActive ? 'champ-card-active' : 'champ-card-locked'}`);

    // Trophy image
    const imgWrap = el('div', 'champ-card-img-wrap');
    if (isCompleted || isActive) {
      imgWrap.innerHTML = `<img src="${prova.img}" alt="${esc(prova.trophy)}" class="champ-trophy-img ${isActive ? 'champ-trophy-dim' : ''}">`;
      if (isCompleted) {
        const check = el('div', 'champ-trophy-check'); check.textContent = '✓'; imgWrap.appendChild(check);
      }
    } else if (isFailed) {
      imgWrap.innerHTML = `<img src="${prova.img}" alt="${esc(prova.trophy)}" class="champ-trophy-img champ-trophy-fail-img"><div class="champ-trophy-fail-x">✕</div>`;
    } else {
      imgWrap.innerHTML = `<div class="champ-trophy-lock"><span class="champ-lock-icon">🔒</span><span class="champ-lock-lv">Lv ${prova.level}</span></div>`;
    }
    card.appendChild(imgWrap);

    // Info
    const info = el('div', 'champ-card-info');
    info.innerHTML = `<div class="champ-card-name">${esc(prova.name)}</div><div class="champ-card-trophy muted">${esc(prova.trophy)}</div>`;

    if (isActive) {
      const daysSince = Math.floor((new Date(today) - new Date(state.unlockedAt)) / 86400000);
      const daysLeft = Math.max(0, prova.windowDays - daysSince);
      const kmSince = Math.round((HERO.totalKm - state.startKm) * 10) / 10;
      const uniqueDays = new Set(state.activeDays).size;
      info.innerHTML += `<div class="champ-card-progress">
        <span class="champ-days-left ${daysLeft <= 3 ? 'champ-urgent' : ''}">⏳ ${daysLeft}g rimasti</span>
        <span class="champ-km-done">📍 +${kmSince} km · ${uniqueDays} sessioni</span>
      </div>`;
    } else if (isCompleted) {
      info.innerHTML += `<div class="champ-card-bonus">✨ ${esc(prova.bonusLabel)}</div>`;
      info.innerHTML += `<div class="champ-card-date muted small">Completata ${state.completedAt}</div>`;
    } else if (isFailed) {
      info.innerHTML += `<div class="champ-card-fail-label">❌ Scaduta ${state.failedAt}</div>`;
    } else {
      info.innerHTML += `<div class="champ-card-locked-label muted small">Sblocca al Lv ${prova.level}</div>`;
    }
    card.appendChild(info);
    grid.appendChild(card);
  });
  c.appendChild(grid);

  // Gladius Aeternus — se tutti i trofei completati
  if (hasAll) {
    const gladiusBox = el('div', 'champ-gladius-box');
    const hasInInventory = (HERO.items || []).some(it => it.id === 'gladius_aeternus');
    gladiusBox.innerHTML = `
      <div class="champ-gladius-title">⚔️ Gladius Aeternus</div>
      <div class="champ-gladius-sub">L'arma dei Campioni — Tier: <span class="rarity-eterno">ETERNO</span></div>
      <img src="assets/weapons/gladius_aeternus.webp" alt="Gladius Aeternus" class="champ-gladius-img">
      <div class="champ-gladius-stats">+25% XP · +25% oro · +30% danni Arena · +20% HP Arena</div>
      <div class="champ-gladius-inventory muted small">${hasInInventory ? '✓ Presente nel tuo zaino' : '⚔️ Ottieni l\'arma dal tuo zaino'}</div>`;
    c.appendChild(gladiusBox);
  } else {
    // Teaser bloccato
    const teaser = el('div', 'champ-gladius-teaser');
    teaser.innerHTML = `
      <div class="champ-gladius-lock-icon">🔒</div>
      <div class="champ-gladius-title">Gladius Aeternus</div>
      <div class="champ-gladius-sub muted">Completa tutti e 10 i trofei per sbloccare l'arma oltre il leggendario.</div>
      <div class="champ-gladius-remaining">${total - completed} trofei mancanti</div>`;
    c.appendChild(teaser);
  }
}

function renderZainoView(c) {
  const backBtn = el('button', 'btn btn-small', '↩ Torna all\'Eroe');
  backBtn.addEventListener('click', () => { HERO_VIEW = 'main'; setTab('hero'); });
  c.appendChild(backBtn);
  c.appendChild(el('h2', 'section-title', ptIcon('assets/ui/eroe/consumabili-box.webp', 'Box Consumabili', '⚗️')));

  // Buff attivi
  const bff = HERO.consumableBuffs || {};
  const now = Date.now();
  const activeBufs = [];
  if (bff.xpMult)       activeBufs.push(`+${Math.round(bff.xpMult.value * 100)}% XP (${bff.xpMult.sessions} sessioni)`);
  if (bff.goldMult && bff.goldMult.expiresAt > now)   activeBufs.push(`+${Math.round(bff.goldMult.value * 100)}% oro`);
  if (bff.allBoost && bff.allBoost.expiresAt > now)   activeBufs.push(`×${1+bff.allBoost.value} tutti i bonus`);
  if (bff.streakShield) activeBufs.push(`🛡️ Streak protetta ${bff.streakShield}gg`);
  if (bff.arenaShield)  activeBufs.push(`⚔️ Scudo Arena attivo`);
  if (bff.dropBoost && bff.dropBoost.expiresAt > now) activeBufs.push(`+${Math.round(bff.dropBoost.value * 100)}% drop`);

  if (activeBufs.length) {
    const bd = el('div', 'panel buff-panel');
    bd.appendChild(el('div', 'buff-panel-title', '✨ Buff attivi'));
    const chips = el('div', 'buff-chips');
    activeBufs.forEach(t => chips.appendChild(el('span', 'buff-chip', t)));
    bd.appendChild(chips);
    c.appendChild(bd);
  }

  // Filtri categoria
  const sw = el('div', 'coll-switch');
  ZAINO_CATS.forEach(cat => {
    const b = el('button', 'coll-btn' + (ZAINO_CAT === cat.id ? ' active' : ''), cat.label);
    b.addEventListener('click', () => { ZAINO_CAT = cat.id; setTab('hero'); });
    sw.appendChild(b);
  });
  c.appendChild(sw);

  // Griglia consumabili posseduti
  const owned = HERO.consumables || {};
  const cons  = HERO.consumables ? RPG.CONSUMABLES.filter(co => owned[co.id] > 0 && (ZAINO_CAT === 'tutti' || co.cat === ZAINO_CAT)) : [];

  if (!cons.length) {
    const empty = el('div', 'panel muted', ZAINO_CAT === 'tutti'
      ? 'Sacca vuota — combatti nell\'Arena, sconfiggi boss e visita l\'Erborista nel Mercato per ottenere consumabili.'
      : 'Nessun consumabile di questa categoria nella tua sacca.');
    c.appendChild(empty);
  } else {
    const grid = el('div', 'consumable-grid');
    cons.forEach(co => {
      const qty = owned[co.id] || 0;
      const card = el('div', `consumable-card rarity-${co.rarity}`);
      const imgWrap = el('div', 'consumable-img-wrap');
      const img = el('img', 'consumable-img');
      img.src = `assets/consumables/${encodeURIComponent(RPG.CONSUMABLE_IMG[co.id] || co.id)}.webp`;
      img.alt = co.name;
      img.addEventListener('error', () => { img.style.display = 'none'; imgWrap.appendChild(el('span', 'consumable-emoji', co.icon)); });
      imgWrap.appendChild(img);
      card.appendChild(imgWrap);
      card.appendChild(el('div', 'consumable-name', co.name));
      card.appendChild(el('div', 'consumable-desc muted small', co.desc));
      const qtyBadge = el('span', 'consumable-qty', `×${qty}`);
      card.appendChild(qtyBadge);
      const actions = el('div', 'consumable-actions');
      const useBtn = el('button', 'btn btn-primary btn-small', 'Usa');
      useBtn.addEventListener('click', () => {
        const err = RPG.useConsumable(HERO, co.id);
        if (err) { toast(err); return; }
        persist(); renderHUD();
        toast(`${co.icon} ${co.name} usato!`);
        setTab('hero');
      });
      const sellBtn = el('button', 'btn btn-small', `Vendi (${RPG.sellValueConsumable(co.id)}🪙)`);
      sellBtn.addEventListener('click', () => {
        RPG.sellConsumable(HERO, co.id);
        persist(); renderHUD();
        toast(`${co.icon} Venduto per ${RPG.sellValueConsumable(co.id)} monete.`);
        setTab('hero');
      });
      actions.appendChild(useBtn);
      actions.appendChild(sellBtn);
      card.appendChild(actions);
      grid.appendChild(card);
    });
    c.appendChild(grid);
  }

  // ── Crafting ──
  {
    const owned2 = HERO.consumables || {};
    const countByRarity = r => RPG.CONSUMABLES.filter(co => co.rarity === r).reduce((s, co) => s + (owned2[co.id] || 0), 0);
    const comuniN = countByRarity('comune');
    const rariN   = countByRarity('raro');
    const cp = el('div', 'panel crafting-panel');
    cp.appendChild(el('h3', 'panel-title', '⚗️ Alchimia'));
    cp.appendChild(el('p', 'muted small', 'Combina 3 consumabili della stessa rarità per ottenerne uno della rarità superiore.'));
    const rows = [
      { from: 'comune', to: 'raro',   count: comuniN, label: '3 Comuni → 1 Raro',   canDo: comuniN >= 3 },
      { from: 'raro',   to: 'epico',  count: rariN,   label: '3 Rari → 1 Epico',    canDo: rariN >= 3   },
    ];
    rows.forEach(row => {
      const r = el('div', 'crafting-row');
      r.innerHTML = `<span class="crafting-label">${row.label}</span><span class="crafting-have muted small">(ne hai ${row.count})</span>`;
      const btn = el('button', `btn btn-small${row.canDo ? ' btn-primary' : ''}`, '⚗️ Crea');
      btn.disabled = !row.canDo;
      btn.addEventListener('click', () => {
        const result = RPG.craftConsumable(HERO, row.from);
        if (typeof result === 'string') { toast(result); return; }
        persist(); renderHUD();
        toast(`⚗️ Creato: ${result.icon} ${result.name}!`);
        setTab('hero');
      });
      r.appendChild(btn);
      cp.appendChild(r);
    });
    c.appendChild(cp);
  }

  // ── Achievements consumabili ──
  {
    const unlocked = RPG.consumableAchievementsUnlocked(HERO);
    if (unlocked.length) {
      const ap = el('div', 'panel crafting-panel');
      ap.appendChild(el('h3', 'panel-title', '🏅 Traguardi'));
      unlocked.forEach(a => {
        const claimed = (HERO.achievementsClaimed || []).includes(a.id);
        const row = el('div', 'crafting-row');
        row.innerHTML = `<span class="crafting-label">${a.icon} ${esc(a.name)}</span><span class="muted small">${esc(a.desc)}</span>`;
        if (!claimed) {
          const btn = el('button', 'btn btn-primary btn-small', `🎁 +${a.reward.gold}🪙`);
          btn.addEventListener('click', () => {
            const r = RPG.claimAchievement(HERO, a.id);
            if (typeof r === 'string') { toast(r); return; }
            persist(); renderHUD();
            toastAchievement(a, r.reward); sfx('coin');
            setTab('hero');
          });
          row.appendChild(btn);
        } else {
          row.appendChild(el('span', 'challenge-check', '✓'));
        }
        ap.appendChild(row);
      });
      c.appendChild(ap);
    }
  }

  // Tutti i consumabili esistenti (catalogo) se zaino vuoto
  if (!Object.keys(owned).length) {
    c.appendChild(el('h3', 'section-title', '📖 Catalogo Consumabili'));
    const catGrid = el('div', 'consumable-grid');
    RPG.CONSUMABLES.filter(co => ZAINO_CAT === 'tutti' || co.cat === ZAINO_CAT).forEach(co => {
      const card = el('div', `consumable-card rarity-${co.rarity} locked`);
      const imgWrap = el('div', 'consumable-img-wrap');
      const img = el('img', 'consumable-img');
      img.src = `assets/consumables/${encodeURIComponent(RPG.CONSUMABLE_IMG[co.id] || co.id)}.webp`;
      img.alt = co.name;
      img.addEventListener('error', () => { img.style.display = 'none'; imgWrap.appendChild(el('span', 'consumable-emoji', co.icon)); });
      imgWrap.appendChild(img);
      card.appendChild(imgWrap);
      card.appendChild(el('div', 'consumable-name', co.name));
      card.appendChild(el('div', 'consumable-desc muted small', co.desc));
      card.appendChild(el('span', 'consumable-rarity-badge', co.rarity));
      catGrid.appendChild(card);
    });
    c.appendChild(catGrid);
  }
}

/* ── Sacca del Viandante (guardaroba cosmetic) ──────────────────────────── */
const SACCA_CATS = [
  { id: 'avatar',     icon: '👤', label: 'Avatar' },
  { id: 'cavalcature', icon: '🐴', label: 'Cavalcature' },
  { id: 'cornici',    icon: '🖼️', label: 'Cornici' },
  { id: 'titoli',     icon: '📛', label: 'Titoli' },
];
let SACCA_CAT = 'avatar';

function renderSaccaView(c) {
  const backBtn = el('button', 'btn btn-small', '↩ Torna all\'Eroe');
  backBtn.addEventListener('click', () => { HERO_VIEW = 'main'; setTab('hero'); });
  c.appendChild(backBtn);
  c.appendChild(el('h2', 'section-title', ptIcon('assets/ui/eroe/sacca.webp', 'Sacca del Viandante', '🎒')));
  c.appendChild(el('p', 'muted small center', 'Cosmetici sbloccati dai Pass Stagionali e dagli eventi del reame.'));

  // Filtri categoria
  const sw = el('div', 'coll-switch');
  SACCA_CATS.forEach(cat => {
    const b = el('button', 'coll-btn' + (SACCA_CAT === cat.id ? ' active' : ''), `${cat.icon} ${cat.label}`);
    b.addEventListener('click', () => { SACCA_CAT = cat.id; setTab('hero'); });
    sw.appendChild(b);
  });
  c.appendChild(sw);

  const cosmetici = HERO.cosmetici || {};

  if (SACCA_CAT === 'avatar') {
    const owned = cosmetici.avatar || [];
    if (!owned.length) {
      c.appendChild(el('div', 'panel muted', '👤 Nessun avatar stagionale ancora sbloccato — partecipa al Pass Stagionale per ottenerne di esclusivi.'));
    } else {
      const grid = el('div', 'consumable-grid');
      owned.forEach(av => {
        const card = el('div', 'consumable-card' + (HERO.avatar === av.src ? ' equipped' : ''));
        const img = el('img', 'consumable-img');
        img.src = av.src; img.alt = av.name;
        card.appendChild(img);
        card.appendChild(el('div', 'consumable-name', av.name));
        if (av.season) card.appendChild(el('div', 'muted small', av.season));
        const btn = el('button', HERO.avatar === av.src ? 'btn btn-small btn-secondary' : 'btn btn-small btn-primary',
          HERO.avatar === av.src ? '✓ Equipaggiato' : 'Equipaggia');
        btn.disabled = HERO.avatar === av.src;
        btn.addEventListener('click', () => {
          HERO.avatar = av.src; persist(); renderHUD();
          toast(`👤 ${av.name} equipaggiato!`); setTab('hero');
        });
        card.appendChild(btn);
        grid.appendChild(card);
      });
      c.appendChild(grid);
    }
  }

  if (SACCA_CAT === 'cavalcature') {
    const allMounts = (HERO.mountsOwned || []).map(id => RPG.mountById(id)).filter(Boolean);
    if (!allMounts.length) {
      c.appendChild(el('div', 'panel muted', '🐴 Nessuna cavalcatura sbloccata — acquistale nella Stalla o guadagnale dal Pass Stagionale.'));
    } else {
      const grid = el('div', 'consumable-grid');
      allMounts.forEach(m => {
        const active = HERO.mount === m.id;
        const card = el('div', 'consumable-card' + (active ? ' equipped' : ''));
        const img = el('img', 'consumable-img');
        img.src = m.img || `assets/mounts/${m.id}.webp`; img.alt = m.name;
        img.addEventListener('error', () => { img.style.display = 'none'; card.prepend(el('span', 'consumable-emoji', m.icon || '🐴')); });
        card.appendChild(img);
        card.appendChild(el('div', 'consumable-name', m.name));
        const btn = el('button', active ? 'btn btn-small btn-secondary' : 'btn btn-small btn-primary',
          active ? '✓ In sella' : 'Equipaggia');
        btn.disabled = active;
        btn.addEventListener('click', () => {
          HERO.mount = m.id; persist(); renderHUD();
          toast(`🐴 ${m.name} equipaggiata!`); setTab('hero');
        });
        card.appendChild(btn);
        grid.appendChild(card);
      });
      c.appendChild(grid);
    }
  }

  if (SACCA_CAT === 'cornici') {
    const owned = cosmetici.cornici || [];
    if (!owned.length) {
      c.appendChild(el('div', 'panel muted', '🖼️ Nessuna cornice ancora sbloccata — le cornici si ottengono dai Pass Stagionali.'));
    } else {
      const grid = el('div', 'consumable-grid');
      owned.forEach(fr => {
        const active = HERO.frameId === fr.id;
        const card = el('div', 'consumable-card' + (active ? ' equipped' : ''));
        if (fr.img) {
          const img = el('img', 'consumable-img');
          img.src = fr.img; img.alt = fr.name;
          img.addEventListener('error', () => img.remove());
          card.appendChild(img);
        }
        card.appendChild(el('div', 'consumable-name', fr.name));
        if (fr.season) card.appendChild(el('div', 'muted small', fr.season));
        const btn = el('button', active ? 'btn btn-small btn-secondary' : 'btn btn-small btn-primary',
          active ? '✕ Rimuovi' : 'Attiva');
        btn.addEventListener('click', () => {
          HERO.frameId = active ? null : fr.id; persist();
          toast(active ? '🖼️ Cornice rimossa.' : `🖼️ ${fr.name} attivata!`); setTab('hero');
        });
        card.appendChild(btn);
        grid.appendChild(card);
      });
      c.appendChild(grid);
    }
  }

  if (SACCA_CAT === 'titoli') {
    const owned = cosmetici.titoli || [];
    if (!owned.length) {
      c.appendChild(el('div', 'panel muted', '📛 Nessun titolo stagionale ancora sbloccato — i titoli esclusivi si ottengono dai Pass Stagionali e dalle classifiche.'));
    } else {
      const grid = el('div', 'consumable-grid');
      owned.forEach(t => {
        const active = HERO.customTitle === t.id;
        const card = el('div', 'consumable-card' + (active ? ' equipped' : ''));
        card.appendChild(el('div', 'consumable-name', t.name));
        if (t.season) card.appendChild(el('div', 'muted small', t.season));
        const btn = el('button', active ? 'btn btn-small btn-secondary' : 'btn btn-small btn-primary',
          active ? '✕ Rimuovi' : 'Attiva');
        btn.addEventListener('click', () => {
          HERO.customTitle = active ? null : t.id; persist(); renderHUD();
          toast(active ? '📛 Titolo rimosso.' : `📛 ${t.name} attivato!`); setTab('hero');
        });
        card.appendChild(btn);
        grid.appendChild(card);
      });
      c.appendChild(grid);
    }
  }
}

/* ── La Serra del Viandante ─────────────────────────────────────────────── */
function renderSerraView(c) {
  c.classList.add('in-serra');
  advanceOnboarding(11);

  const backBtn = el('button', 'view-back-link', '‹ Rifugio');
  backBtn.addEventListener('click', () => { c.classList.remove('in-serra'); CAMP_VIEW = 'main'; setTab('camp'); });
  c.appendChild(backBtn);
  const serraHdrImg = document.createElement('img');
  serraHdrImg.src = 'assets/minigames/serra/SERRA.webp';
  serraHdrImg.alt = ''; serraHdrImg.className = 'borgo-sub-header';
  serraHdrImg.onerror = () => serraHdrImg.remove();
  c.appendChild(serraHdrImg);

  const serraTitle = el('h2', 'section-title', '🌿 La Serra del Viandante');
  c.appendChild(serraTitle);

  // NPC Messer Ortica — prima visita
  if (!HERO.greenhouse.metNpc) {
    HERO.greenhouse.metNpc = true;
    persist();
    modal(`<div class="npc-dialogue-modal">
      <img src="assets/minigames/serra/messer-ortica.webp" class="npc-portrait-fullbody" alt="Messer Ortica">
      <h3 class="panel-title" style="margin-top:8px">Messer Ortica</h3>
      <p class="muted small center" style="margin-bottom:12px"><i>Gnomo giardiniere della Serra</i></p>
      <p>"Benvenuto, Viandante! Questa è la tua Serra personale. Ogni km che corri diventa Sudore Vitale — la nostra acqua magica."</p>
      <p>"Ricorda le tre leggi del giardiniere:"</p>
      <ul style="text-align:left;padding-left:1.2rem;line-height:1.8">
        <li>💧 <b>Annaffia ogni giorno</b> — le piante assetate perdono Salute.</li>
        <li>❤️ <b>Tieni d'occhio la Salute</b> — a 0% la pianta marcisce.</li>
        <li>🎁 <b>Raccogli subito</b> quando è pronta — non aspettare troppo!</li>
      </ul>
      <button class="btn btn-primary wide" onclick="nextOpening()">Ho capito, Messer Ortica!</button>
    </div>`);
  }

  // Banner permanente Messer Ortica
  c.appendChild(npcBanner('assets/minigames/serra/messer-ortica.webp', 'Messer Ortica',
    '"Corri, annaffia, raccogli. La Serra non dimentica chi la cura."'));

  const kmToday = RPG.todayKm(HERO);
  const waterAvail = Math.max(0, kmToday - (HERO.greenhouse.waterUsedToday || 0));
  const tank = el('div', 'water-tank-panel');
  tank.innerHTML = `<span class="water-drop-icon">💧</span>
    <div>
      <div class="water-tank-title">Riserva di Sudore (oggi)</div>
      <div class="water-tank-val"><b>${waterAvail.toFixed(1)} km</b> disponibili per l'irrigazione</div>
    </div>`;
  c.appendChild(tank);

  const PLANT_IMGS = {
    muschio:  "assets/minigames/serra/muschio soffice di oakhaven.webp",
    mentuccia:"assets/minigames/serra/mentuccia di oakhaven.webp",
    bosso:    "assets/minigames/serra/bosso scudo delle pianure.webp",
    cactus:   "assets/minigames/serra/cactus di cenere.webp",
    giglio:   "assets/minigames/serra/giglio della pioggia.webp",
    orchidea: "assets/minigames/serra/orchidea del vento.webp",
    edera:    "assets/minigames/serra/edera vampira.webp",
    girasole: "assets/minigames/serra/girasole radiante.webp",
    bonsai:   "assets/minigames/serra/Bonsai di Yggdrasil.webp",
    loto:     "assets/minigames/serra/loto dell'abisso.webp",
  };
  const plantIcon = (seedId, fallback) => {
    const src = PLANT_IMGS[seedId];
    return src ? `<img src="${src}" class="pot-img" alt="">` : fallback;
  };

  const grid = el('div', 'greenhouse-grid');
  HERO.greenhouse.pots.forEach((pot, i) => {
    const pEl = el('div', 'pot-card' + (pot.status === 'locked' ? ' locked' : ''));

    if (pot.status === 'locked') {
      const unlockLvl = [0, 10, 30, 50, 70][i] || 10;
      pEl.innerHTML = `<div class="pot-emoji">🔒</div>
        <div class="pot-name">Sblocca al Liv. ${unlockLvl}</div>`;

    } else if (pot.status === 'empty') {
      pEl.innerHTML = `<div class="pot-emoji"><img src="assets/minigames/serra/vaso vuoto.webp" class="pot-img" alt=""></div>
        <div class="pot-name">Vaso Vuoto</div>
        <div class="muted small">Tocca per piantare</div>`;
      pEl.classList.add('pickable');
      pEl.addEventListener('click', () => showSeedPicker(i));

    } else if (pot.status === 'dead') {
      pEl.innerHTML = `<div class="pot-emoji">🥀</div>
        <div class="pot-name danger">Pianta morta</div>`;
      const cleanBtn = el('button', 'btn btn-small wide', 'Pulisci vaso');
      cleanBtn.addEventListener('click', () => {
        Object.assign(pot, { status:'empty', seedId:null, daysGrown:0, health:100, water:0, readyDays:0 });
        persist(); setTab('camp');
      });
      pEl.appendChild(cleanBtn);

    } else if (pot.status === 'ready') {
      const pData = RPG.PLANTS[pot.seedId];
      const rdDays = pot.readyDays || 0;
      const baseVal = (RPG.RARITIES[pData.rarity] || {}).value || 50;
      const maturPreview = rdDays > 0 ? Math.round(baseVal * 0.2 * Math.min(3, rdDays)) : 0;
      let maturLine = '';
      if (rdDays === 0) maturLine = `<div class="matur-hint">🌿 Aspetta 1-3 giorni per bonus stagionatura!</div>`;
      else if (rdDays < 4) maturLine = `<div class="matur-hint matur-ripe">⭐ Stagionata ${rdDays} giorno${rdDays > 1 ? 'i' : ''} — bonus +${maturPreview} oro!</div>`;
      pEl.innerHTML = `<div class="pot-emoji glow">${plantIcon(pot.seedId, pData.icon)}</div>
        <div class="pot-name" style="color:var(--gold-bright)">Fioritura Perfetta!</div>
        ${maturLine}`;
      const harBtn = el('button', 'btn btn-primary wide btn-small', '🎁 Raccogli');
      harBtn.addEventListener('click', () => {
        const rew = RPG.harvestPlant(HERO, i);
        if (!rew) return;
        persist(); renderHUD();
        const itemLine = rew.items.length ? `<br>🎒 ${rew.items.map(it => `${it.icon} ${esc(it.name)}`).join(', ')}` : '';
        const goldLine = rew.gold ? `<br>🪙 +${rew.gold} oro` : '';
        const maturBonusLine = rew.maturBonus > 0 ? `<br><span style="color:var(--gold-bright)">⭐ Bonus stagionatura: +${rew.maturBonus} oro!</span>` : '';
        const resLine  = rew.wood  ? `<br>🌲 +${rew.wood} legno · ⛏️ +${rew.stone} pietra` : '';
        modal(`<h3 class="panel-title">✨ Raccolto!</h3>
          <p class="center" style="font-size:2.5rem">${pData.icon}</p>
          <p class="center"><b>${esc(pData.name)}</b></p>
          <p class="center muted small">${goldLine}${maturBonusLine}${resLine}${itemLine}</p>
          <button class="btn btn-primary wide" onclick="closeModal();setTab('camp');">Fantastico!</button>`);
        sfx('coin'); vibrate([60, 30, 100]);
      });
      pEl.appendChild(harBtn);

    } else if (pot.status === 'growing') {
      const pData = RPG.PLANTS[pot.seedId];
      const growPct = Math.min(100, Math.round(pot.daysGrown / pData.days * 100));
      const hpPct   = Math.round(Math.max(0, pot.health));
      const hpColor = hpPct > 60 ? 'var(--emerald)' : hpPct > 30 ? '#ff9a3c' : '#e05050';
      pEl.innerHTML = `
        <div class="pot-emoji">${growPct < 50 ? '🌱' : plantIcon(pot.seedId, pData.icon)}</div>
        <div class="pot-name">${esc(pData.name)}</div>
        <div class="pot-stats">
          <div class="pot-stat-label muted small">❤️ Salute</div>
          <div class="pot-stat-bar"><div class="pot-fill-hp" style="width:${hpPct}%;background:${hpColor}"></div></div>
          <div class="pot-stat-label muted small">🌱 Crescita — ${growPct}%</div>
          <div class="pot-stat-bar"><div class="pot-fill-xp" style="width:${growPct}%"></div></div>
        </div>
        <div class="pot-water-info">Versati oggi: <b>${(pot.water || 0).toFixed(1)} / ${pData.water} km</b></div>
        ${pData.trait ? `<div class="pot-trait"><span class="pot-trait-tag">✦ ${pData.trait}</span> <span class="pot-trait-desc muted small">${esc(pData.desc)}</span></div>` : ''}`;
      const waterBtn = el('button', 'btn btn-primary wide btn-small', '💧 Annaffia (1 km)');
      waterBtn.disabled = waterAvail < 1;
      waterBtn.addEventListener('click', () => {
        const err = RPG.waterPlant(HERO, i, 1);
        if (err) { toast(err); return; }
        persist(); setTab('camp');
        sfx('block');
      });
      pEl.appendChild(waterBtn);
      // Fertilizzante: mostra bottone se ne possiede uno
      const fertItems = (HERO.items || []).filter(it => it.slot === 'consumabile' && it.name === 'Fertilizzante Magico');
      if (fertItems.length) {
        const fertBtn = el('button', 'btn btn-small wide', `🌿 Fertilizza (${fertItems.length})`);
        fertBtn.addEventListener('click', () => {
          const err2 = RPG.useFertilizer(HERO, fertItems[0].id, i);
          if (err2) { toast(err2); return; }
          persist(); setTab('camp');
          toast('🌿 Fertilizzante usato — la pianta è cresciuta di 1 giorno!');
        });
        pEl.appendChild(fertBtn);
      }
    }

    grid.appendChild(pEl);
  });
  c.appendChild(grid);

  // Missioni Serra settimanali
  RPG.rolloverSerraMissions(HERO);
  const wm = HERO.greenhouse.weeklyMissions;
  if (wm && wm.missions) {
    const missSection = el('div', 'serra-missions-panel');
    missSection.innerHTML = `<div class="panel-title" style="margin-bottom:8px">📋 Missioni Settimanali</div>`;
    wm.missions.forEach(m => {
      const done = m.progress >= m.target;
      const pct = m.type === 'harvest_rarity' ? (done ? 100 : 0)
        : Math.min(100, Math.round(m.progress / m.target * 100));
      const targetDisp = m.type === 'harvest_rarity' ? '1' : (typeof m.target === 'number' ? m.target.toFixed(m.type === 'water_km' ? 0 : 0) : '—');
      const progDisp = m.type === 'harvest_rarity' ? (done ? '1' : '0') : m.progress.toFixed(m.type === 'water_km' ? 1 : 0);
      const rewardLabel = `🪙 ${m.reward.gold}${m.reward.item === 'seme' ? ' + 🌰 Seme' : m.reward.item === 'fertilizzante' ? ' + 🌿 Fertilizzante' : ''}`;
      const mEl = el('div', `serra-mission-card${done ? ' done' : ''}${m.claimed ? ' claimed' : ''}`);
      mEl.innerHTML = `
        <div class="sm-label">${m.label}</div>
        <div class="sm-desc muted small">${esc(m.desc)}</div>
        <div class="sm-progress-row">
          <div class="sm-bar"><div class="sm-fill" style="width:${pct}%"></div></div>
          <span class="sm-fraction">${progDisp}/${targetDisp}</span>
        </div>
        <div class="sm-reward muted small">${rewardLabel}</div>`;
      if (done && !m.claimed) {
        const claimBtn = el('button', 'btn btn-primary btn-small', '🎁 Riscatta');
        claimBtn.addEventListener('click', () => {
          const res = RPG.claimSerraMission(HERO, m.id);
          if (typeof res === 'string') { toast(res); return; }
          persist(); renderHUD(); setTab('camp');
          const itLine = res.items.length ? res.items.map(it => `${it.icon} ${esc(it.name)}`).join(', ') : '';
          const consLine = res.consumable ? ` · 💰 ${res.consumable.icon} ${esc(res.consumable.name)}` : '';
          toast(`🎁 Missione completata! +${res.gold} oro${itLine ? ' · ' + itLine : ''}${consLine}`);
        });
        mEl.appendChild(claimBtn);
      } else if (m.claimed) {
        mEl.appendChild(el('div', 'sm-claimed-badge', '✓ Riscattata'));
      }
      missSection.appendChild(mEl);
    });
    c.appendChild(missSection);
  }

  // Glossario tratti
  const loreBtn = el('button', 'btn btn-small', '📖 Proprietà delle Piante');
  loreBtn.style.marginTop = '12px';
  loreBtn.addEventListener('click', () => {
    const rarColors = { comune:'#8a7a5f', non_comune:'#3a7a4a', raro:'#2e6fb0', epico:'#7b3fbf', leggendario:'#d9822b', divino:'#b8860b' };
    const rows = Object.values(RPG.PLANTS).map(p => {
      const col = rarColors[p.rarity] || '#8a7a5f';
      return `<div style="padding:10px 12px;border-radius:10px;border:1.5px solid rgba(90,61,36,.3);border-left:4px solid ${col};background:linear-gradient(160deg,#efe0c3,#d8bc90);margin-bottom:8px">
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-bottom:6px">
          <b style="color:#3b2a1a">${p.icon} ${esc(p.name)}</b>
          <span class="tag">${RPG.RARITIES[p.rarity].label}</span>
          <span class="tag tag-trait">${esc(p.trait)}</span>
        </div>
        <div style="font-size:.82rem;color:#3b2a1a;line-height:1.4;margin-bottom:4px">${esc(p.desc)}</div>
        <div style="font-size:.78rem;color:#6b543a">💧 ${p.water} km/giorno &nbsp;·&nbsp; 🗓️ ${p.days} giorni</div>
      </div>`;
    }).join('');
    modal(`<h3 class="panel-title">📖 Piante della Serra</h3>
      <div class="loot-list" style="max-height:55vh;overflow-y:auto">${rows}</div>
      <button class="btn wide" onclick="closeModal()">Chiudi</button>`);
  });
  c.appendChild(loreBtn);
}

function showSeasonModal() {
  const season = RPG.currentSeason();
  const allSeasons = Object.values(RPG.SEASONS);
  const d = new Date();
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - d.getDate();

  const bonusRows = season.bonuses.map(b => `<li>${esc(b)}</li>`).join('');
  const seasonCards = allSeasons.map(s => {
    const active = s.id === season.id;
    return `<div class="season-mini-card${active ? ' active' : ''}">
      <span class="smc-icon">${s.icon}</span>
      <span class="smc-name">${esc(s.name)}</span>
    </div>`;
  }).join('');

  RPG.initSeasonalChallenge(HERO);
  const sc = HERO.seasonalChallenge;
  const scPct = sc ? Math.min(100, Math.round(sc.progressKm / sc.km * 100)) : 0;

  modal(`
    <div class="season-modal">
      <div class="season-modal-header" style="--season-color:${season.color}">
        <span class="season-modal-icon">${season.icon}</span>
        <div>
          <h3 style="margin:0">${esc(season.name)}</h3>
          <div class="muted small">${daysLeft} giorni rimanenti questo mese</div>
        </div>
      </div>
      <div class="season-cards-row">${seasonCards}</div>
      <p class="muted small" style="margin:10px 0 6px">${esc(season.desc)}</p>
      <div class="sm-label" style="margin-bottom:4px">Bonus Attivi:</div>
      <ul class="season-bonus-list">${bonusRows}</ul>
      ${sc ? `
      <div class="sm-label" style="margin:10px 0 4px">🏆 ${esc(sc.label)}</div>
      <div class="sm-progress-row">
        <div class="sm-bar"><div class="sm-fill" style="width:${scPct}%;background:${season.color}"></div></div>
        <span class="sm-fraction">${sc.progressKm.toFixed(1)} / ${sc.km} km</span>
      </div>
      <div class="muted small" style="margin-top:4px">Ricompensa: oggetto ${RPG.RARITIES[season.challenge.reward].label} stagionale</div>
      ` : ''}
    </div>
    ${sc && scPct >= 100 && !sc.claimed ? `<button class="btn btn-primary wide" style="margin-top:12px" id="sc-claim-btn">🎁 Riscatta Ricompensa Stagionale</button>` : ''}
    <button class="btn wide" style="margin-top:8px" onclick="closeModal()">Chiudi</button>
  `);
  if (sc && scPct >= 100 && !sc.claimed) {
    document.getElementById('sc-claim-btn').addEventListener('click', () => {
      const res = RPG.claimSeasonalChallenge(HERO);
      if (typeof res === 'string') { toast(res); return; }
      persist(); renderHUD(); closeModal();
      modal(`<h3 class="panel-title">${season.icon} Sfida Stagionale Completata!</h3>
        <p class="center muted small">Hai conquistato:</p>
        <div class="loot rar-${res.item.rarity}" style="margin:12px 0">
          <div class="loot-head"><b>${res.item.icon} ${esc(res.item.name)}</b>
          <span class="tag">${RPG.RARITIES[res.item.rarity].label}</span></div>
        </div>
        <button class="btn btn-primary wide" onclick="closeModal()">Magnifico!</button>`);
      sfx('coin'); vibrate([80, 40, 120]);
    });
  }
}

function showSeedPicker(potIndex) {
  modal(`<h3 class="panel-title">🪴 Pianta un Seme</h3>
    <div class="loot-list" id="seed-picker-list"></div>
    <button class="btn wide" style="margin-top:8px" onclick="closeModal()">Annulla</button>`);

  const list = $('#seed-picker-list');

  // Semi in inventario (slot 'seme') — usa e consuma
  const invSeeds = (HERO.items || []).filter(it => it.slot === 'seme');
  if (invSeeds.length) {
    list.appendChild(el('div', 'small muted', '🌰 Semi nel tuo zaino — partono pre-germinati (+1 giorno bonus):'));
    invSeeds.forEach(seed => {
      const plant = RPG.PLANTS[seed.seedId];
      const row = el('div', `loot rar-${seed.rarity} pickable`);
      row.style.cursor = 'pointer';
      row.innerHTML = `
        <div class="loot-head">
          <img src="${seed.img}" style="width:28px;height:28px;object-fit:contain;vertical-align:middle;margin-right:6px" onerror="this.style.display='none'">
          <b>${plant ? plant.icon + ' ' + esc(plant.name) : esc(seed.name)}</b>
          <span class="tag">${RPG.RARITIES[seed.rarity].label}</span>
        </div>
        <div class="small muted">${plant ? esc(plant.desc) + '<br>💧 ' + plant.water + ' km/giorno · ' + plant.days + ' giorni' : esc(seed.desc)}</div>`;
      row.addEventListener('click', () => {
        const err = RPG.useSeedItem(HERO, seed.id, potIndex);
        if (err) { toast(err); return; }
        persist(); closeModal(); setTab('camp');
        toast(`🌱 Hai piantato ${plant ? plant.name : seed.name}!`);
      });
      list.appendChild(row);
    });
    list.appendChild(el('div', 'small muted', '— oppure pianta liberamente: —'));
  }

  // Tutte le piante (selezione libera)
  Object.values(RPG.PLANTS).forEach(p => {
    const row = el('div', `loot rar-${p.rarity} pickable`);
    row.style.cursor = 'pointer';
    row.innerHTML = `
      <div class="loot-head"><b>${p.icon} ${esc(p.name)}</b> <span class="tag">${RPG.RARITIES[p.rarity].label}</span></div>
      <div class="small muted">${esc(p.desc)}<br>💧 Richiede <b>${p.water} km/giorno</b> per <b>${p.days} giorni</b></div>`;
    row.addEventListener('click', () => {
      const err = RPG.plantSeeds(HERO, potIndex, p.id);
      if (err) { toast(err); return; }
      persist(); closeModal(); setTab('camp');
      toast(`🌱 Hai piantato ${p.name}!`);
    });
    list.appendChild(row);
  });
}

function msToWeekEnd() {
  const d = new Date(); const m = new Date(d);
  const dow = (d.getDay() + 6) % 7; // 0 = lunedì
  m.setDate(d.getDate() + (7 - dow));
  m.setHours(0, 0, 0, 0);
  return m - d;
}
function fmtMs(ms) {
  const h = Math.floor(ms / 3600000), mm = Math.floor(ms % 3600000 / 60000);
  if (h >= 48) return Math.floor(h / 24) + ' giorni';
  if (h >= 1) return h + 'h ' + mm + 'm';
  const s = Math.floor(ms % 60000 / 1000);
  return mm + 'm ' + s + 's';
}
function msToMappaInfuocata() {
  const mi = HERO && HERO.mappaInfuocata;
  if (!mi || mi.status !== 'active' || !mi.activatedAt) return 0;
  return Math.max(0, 86400000 - (Date.now() - mi.activatedAt));
}
setInterval(() => {
  document.querySelectorAll('[data-cd]').forEach(e => {
    const cd = e.dataset.cd;
    e.textContent = '⏳ ' + fmtMs(
      cd === 'week' ? msToWeekEnd() :
      cd === 'mi'   ? msToMappaInfuocata() :
      msToMidnight()
    );
  });
}, 1000);

/* Rollover automatico se l'app resta aperta a cavallo della mezzanotte */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !HERO) return;
  const serraLogs = RPG.rolloverGreenhouse(HERO);
  RPG.rolloverIncursion(HERO);
  if (serraLogs && serraLogs.length) { persist(); renderHUD(); }
  else if (HERO.greenhouse && HERO.greenhouse.lastTick === todayISO()) { /* già aggiornato */ }
  else { persist(); renderHUD(); }
});

/* ── Anteprima dei biomi (anche bloccati: hype!) ── */
function showBiomePreview(b, open) {
  const enemies = RPG.BESTIARY.filter(x => x.zone === b.name);
  let beasts = '';
  if (enemies.length) {
    beasts = `<p class="small muted center">Creature avvistate da queste parti:</p><div class="preview-beasts">` +
      enemies.map(x => {
        const known = HERO.bestiary.includes(x.id);
        return x.id === 'cavaliere-drago'
          ? `<div class="preview-beast">❓</div>`
          : `<img class="preview-beast${known && open ? '' : ' shadow'}" src="assets/bestiario/${x.id}.webp">`;
      }).join('') + `</div>`;
  } else {
    beasts = `<p class="small muted center">Nessuno è mai tornato per raccontare quali creature si aggirino qui…</p>`;
  }
  const slug = RPG.biomeSlug(b);
  const figHtml = slug
    ? `<img class="preview-diorama${open ? '' : ' locked-diorama'}" src="assets/biomi/${slug}.webp" onerror="this.outerHTML='<p class=&quot;center&quot; style=&quot;font-size:3rem&quot;>${b.icon}</p>'">`
    : `<p class="center" style="font-size:3rem">${b.icon}</p>`;
  modal(`
    ${figHtml}
    <h3 class="panel-title center">${b.name}</h3>
    <p class="center small"><span class="tag">Livelli ${b.min}–${b.max}</span></p>
    ${beasts}
    ${open
      ? `<p class="center small">✅ Bioma raggiunto: le sue missioni sono sulla Mappa.</p>`
      : `<p class="center"><b>🔒 Si apre al Livello ${b.min}</b><br><span class="small muted">Ti mancano ${b.min - HERO.level} livelli. Continua ad allenarti!</span></p>`}
    <button class="btn btn-primary wide" onclick="closeModal()">Chiudi</button>
  `);
}

/* ── Suoni (WebAudio, niente file esterni) ── */
let _AC = null;
function sfx(kind) {
  try {
    _AC = _AC || new (window.AudioContext || window.webkitAudioContext)();
    if (_AC.state === 'suspended') _AC.resume();
    const t = _AC.currentTime;
    const nota = (freq, start, dur, type = 'triangle', vol = 0.12) => {
      const o = _AC.createOscillator(), g = _AC.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t + start);
      g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
      o.connect(g).connect(_AC.destination);
      o.start(t + start); o.stop(t + start + dur);
    };
    if (kind === 'coin')  { nota(880, 0, .12); nota(1318, .07, .18); }
    if (kind === 'level') { [523, 659, 784, 1047].forEach((f, i) => nota(f, i * .1, .3)); }
    if (kind === 'chest') {
      nota(160, 0, .25, 'sawtooth', .18);
      [784, 988, 1175, 1568].forEach((f, i) => nota(f, .3 + i * .08, .35));
    }
    if (kind === 'hit')   { nota(220, 0, .1, 'sawtooth', .22); nota(110, .03, .16, 'square', .18); }
    if (kind === 'lose')  { nota(330, 0, .14, 'sawtooth', .2); nota(180, .1, .22, 'sawtooth', .18); }
    if (kind === 'block') { nota(500, 0, .06, 'square', .14); nota(400, .05, .09, 'square', .1); }
    if (kind === 'defeat'){ [440, 349, 262, 196].forEach((f, i) => nota(f, i * .16, .4, 'sawtooth', .16)); }
  } catch {}
}

/* ══════════════ Avvio ══════════════
   IMPORTANTE: questo blocco deve restare l'ULTIMA cosa nel file.
   Se venisse eseguito prima che tutte le dichiarazioni `let`/`const`
   di livello superiore (OPEN_QUEUE, BATTLE, ecc.) siano state
   valutate, chi riapre l'app con un eroe già selezionato manderebbe
   in crash l'intero script a metà (Temporal Dead Zone), lasciando
   funzionalità come l'Arena rotte per tutta la sessione. */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js?v=452').catch(() => {});
  /* Quando un nuovo SW prende il controllo (skipWaiting + clients.claim)
     ricarica la pagina per caricare il codice aggiornato. */
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
}

/* ── Le Sette Gesta — Unlock Modal ── */
function showGestaUnlock(piece) {
  const setComplete = typeof checkArmaturaPiecesSetBonus === 'function' && checkArmaturaPiecesSetBonus(HERO);
  const owned = (typeof ARMATURA_PIECES !== 'undefined' ? ARMATURA_PIECES : []).filter(p => (HERO.items || []).some(it => it.id === p.id)).length;
  const total = typeof ARMATURA_PIECES !== 'undefined' ? ARMATURA_PIECES.length : 7;

  modal(`
    <div class="gesta-unlock-modal">
      <div class="gesta-unlock-ornament">${setComplete ? '✦ ✦ ✦' : '— 🏛️ —'}</div>
      <div class="gesta-unlock-label">GESTA COMPLETATA</div>
      <img class="gesta-unlock-img" src="${esc(piece.img)}" alt="${esc(piece.name)}"
           onerror="this.outerHTML='<div class=\\'gesta-unlock-icon\\'>${piece.icon}</div>'">
      <h2 class="gesta-unlock-name">${piece.icon} ${esc(piece.name)}</h2>
      <p class="gesta-unlock-slot small muted">Slot: ${esc(piece.slot)} · Leggendario</p>
      <p class="gesta-unlock-lore">${esc(piece.lore)}</p>
      <div class="gesta-unlock-stat">✦ ${esc(piece.desc)}</div>
      <p class="gesta-unlock-progress small muted">${owned}/${total} pezzi de Le Sette Gesta</p>
      ${setComplete ? `<div class="gesta-set-complete-banner">✨ SET LEGGENDARIO COMPLETO ✨<br><span class="small">Hai forgiato Le Sette Gesta. Il Reame ti riconosce.</span></div>` : ''}
      <button class="btn btn-primary wide" style="margin-top:14px" onclick="closeModal()">
        ${setComplete ? '👑 Sono degno del Reame' : '⚔️ Continua la tua gesta'}
      </button>
    </div>
  `);
}

/* ── Il Drago Finale — Modali ── */
function showDragoWound(colpo) {
  const prove = HERO.dragoProve || {};
  const wounds = (typeof DRAGO_COLPI !== 'undefined' ? DRAGO_COLPI : []).filter(c => prove[c.id] && prove[c.id].completed).length;
  const total = typeof DRAGO_COLPI !== 'undefined' ? DRAGO_COLPI.length : 3;
  const hpSegs = (typeof DRAGO_COLPI !== 'undefined' ? DRAGO_COLPI : []).map(c => {
    const done = prove[c.id] && prove[c.id].completed;
    return `<div class="drago-hp-seg${done ? ' drago-hp-seg-hit' : ''}"></div>`;
  }).join('');
  modal(`
    <div class="drago-wound-modal">
      <div class="drago-wound-ornament">— 🐉 —</div>
      <div class="drago-wound-label">${colpo.icon} ${esc(colpo.label.toUpperCase())}</div>
      <div class="drago-hp-row">${hpSegs}</div>
      <p class="drago-wound-lore">${esc(colpo.lore)}</p>
      <p class="drago-wound-progress small muted">${wounds}/${total} ferite inflitte al drago</p>
      <button class="btn btn-primary wide" style="margin-top:14px" onclick="closeModal()">
        ${wounds >= total ? '🐉 Il drago è caduto' : '⚔️ Continua la battaglia'}
      </button>
    </div>
  `);
}

function showDragoKilled() {
  const km = (HERO.totalKm || 0).toFixed(0);
  const sess = HERO.totalSessions || 0;
  const streak = HERO.bestStreak || (HERO.streak && HERO.streak.count) || 0;
  const wins = HERO.arena_wins || 0;
  modal(`
    <div class="drago-killed-modal">
      <video class="drago-killed-video" autoplay muted playsinline loop
             src="assets/drago/drago-finale.mp4"
             onerror="this.style.display='none'"></video>
      <div class="drago-killed-title">🐉 IL DRAGO È CADUTO</div>
      <div class="drago-killed-sub">— ${esc(HERO.name || 'Eroe')} — Draghicida —</div>
      <div class="drago-killed-stats">
        <div class="drago-stat-row"><span>${km} km</span><span class="muted">percorsi nel Reame</span></div>
        <div class="drago-stat-row"><span>${sess}</span><span class="muted">sessioni di allenamento</span></div>
        <div class="drago-stat-row"><span>${streak} giorni</span><span class="muted">streak record</span></div>
        <div class="drago-stat-row"><span>${wins}</span><span class="muted">vittorie in Arena</span></div>
      </div>
      <div class="drago-killed-item">🐉 <b>Il Dente del Drago</b> aggiunto all'inventario</div>
      <div class="drago-killed-the-end">The End?</div>
      <p class="drago-killed-hint small muted">Il tuo nome è già nella pietra. Ma il Reame sussurra ancora...</p>
      <button class="btn btn-primary wide" style="margin-top:14px" onclick="closeModal()">👑 Sono il Draghicida</button>
    </div>
  `);
}

function runSplash(done) {
  const fill  = document.getElementById('splash-progress-fill');
  const text  = document.getElementById('splash-progress-text');
  const splash = document.getElementById('screen-splash');

  const MSGS = [
    'Sellando il cavallo…',
    'Affilando la lama…',
    'Accendendo il fuoco del campo…',
    'Controllando le provviste…',
    'Studiando la mappa…',
    'Lucidando l\'armatura…',
    'Consultando le stelle…',
    'Raccogliendo erbe medicinali…',
    'Preparando la forgia…',
    'Risvegliando il famiglio…',
  ];
  let msgIdx = 0;
  if (text) text.textContent = MSGS[0];
  const msgTimer = setInterval(() => {
    msgIdx = (msgIdx + 1) % MSGS.length;
    if (text) text.textContent = MSGS[msgIdx];
  }, 370);

  const DURATION = 2100, STEP = 30;
  let s = 0, total = DURATION / STEP;
  const timer = setInterval(() => {
    s++;
    // easeOutCubic — decolla veloce, rallenta verso la fine
    const pct = Math.round((1 - Math.pow(1 - s / total, 3)) * 100);
    if (fill) fill.style.width = pct + '%';
    if (s >= total) {
      clearInterval(timer);
      clearInterval(msgTimer);
      if (text) text.textContent = 'Pronti!';
      setTimeout(() => {
        splash.classList.add('splash-fadeout');
        setTimeout(() => { splash.classList.add('hidden'); done(); }, 420);
      }, 220);
    }
  }, STEP);
}

runSplash(() => {
  if (STATE.current && STATE.heroes.find(h => h.id === STATE.current)) enterGame();
  else renderProfiles();
});

/* ── Guida al Gioco ─────────────────────────────────────────────────────── */
function renderGuidaView(c) {
  const back = el('button', 'hero-back-pill', '‹ Impostazioni');
  back.addEventListener('click', () => { HERO_VIEW = 'settings'; setTab('hero'); });
  c.appendChild(back);
  c.appendChild(el('h2', 'section-title', '📖 Guida al Gioco'));

  const sections = [
    {
      icon: '🏃', title: 'Come funziona',
      body: `RPGym trasforma i tuoi allenamenti reali in progressione RPG. Ogni volta che vai in palestra o fai sport, registri l'attività nella scheda <b>Allenati</b>: inserisci tipo di esercizio, durata e km percorsi (se applicabile). Il gioco calcola XP e oro in base all'intensità e alla durata. Più ti alleni, più il tuo eroe cresce.`,
    },
    {
      icon: '⭐', title: 'Livelli e Titoli',
      body: `Ogni allenamento ti dà XP. Accumulando abbastanza XP sali di livello (da 1 a 100) e sblocchi un titolo sempre più epico — da <i>Novizio del Sudore</i> fino a <i>Leggenda Vivente</i>. Salendo di livello si sbloccano nuovi biomi sulla Mappa del Mondo e nuove cavalcature ogni 5 livelli.`,
    },
    {
      icon: '🔥', title: 'Streak',
      body: `Allenarti più giorni di fila costruisce la tua streak. Ogni giorno consecutivo aumenta il contatore. Se salti un giorno perdi tutto — a meno che tu non usi uno <b>Scudo della Serie</b> dalla Sacca del Viandante. La streak settimanale (7 giorni) ti regala un consumabile bonus.`,
    },
    {
      icon: '🛡️', title: 'Equipaggiamento',
      body: `Il tuo eroe ha 8 slot: Arma, Scudo, Elmo, Armatura, Anello, Amuleto, Seme e Consumabile. Ogni oggetto equipaggiato aggiunge un bonus percentuale all'XP guadagnato in allenamento. Gli oggetti si trovano nei forzieri, come premi delle sfide o nell'Arena. Le rarità sono: <span style="color:#b0b8c1">Comune</span>, <span style="color:#4a90d9">Raro</span>, <span style="color:#9b59b6">Epico</span>, <span style="color:#f1c40f">Leggendario</span>.`,
    },
    {
      icon: '🗺️', title: 'Mappa del Tesoro',
      body: `Ogni settimana si resetta una mappa con 3 tappe a distanza crescente (8 km, 22 km, 45 km). I km degli allenamenti si accumulano automaticamente. Raggiunta una tappa puoi riscuotere oro, risorse e — con un po' di fortuna — un consumabile. La tappa finale garantisce anche un oggetto equipaggiabile.`,
    },
    {
      icon: '⚔️', title: 'Arena',
      body: `Ogni giorno hai un certo numero di sfide disponibili nell'<b>Antro dell'Oscurità</b> (tab <b>Borgo</b>). Sfidi nemici in un duello a morra: Attacco, Difesa e Schivata si battono secondo regole RPG. Vincendo guadagni oro, fiches arena e — con probabilità variabile — un consumabile. I boss sono avversari speciali con ricompense maggiori. La difficoltà scala con il tuo livello.`,
    },
    {
      icon: '👹', title: 'Boss Settimanale',
      body: `Ogni settimana appare un boss unico sulla Mappa. Per sconfiggerlo devi percorrere un certo numero di km (es. 30 km per il Troll delle Paludi). Una volta raggiunta la soglia, riscuoti il bottino: oro, un oggetto equipaggiabile e un consumabile raro garantito.`,
    },
    {
      icon: '🎯', title: 'Sfide Giornaliere e Settimanali',
      body: `Nella scheda <b>Allenati</b> trovi ogni giorno 3 sfide (es. "Percorri 5 km", "Registra 2 allenamenti") e ogni settimana 3 sfide più impegnative. Completare tutte le sfide di una categoria sblocca un <b>bonus totale</b> con ricompense extra. Ogni sfida completata ha il 25% (giornaliere) o 30% (settimanali) di probabilità di dropparti un consumabile.`,
    },
    {
      icon: '🏕️', title: 'Rifugio',
      body: `Il tuo campo base cresce con te. Sblocca e potenzia strutture spendendo oro, legno e pietra. Ogni struttura aggiunge bonus passivi permanenti (più monete, più XP, ecc.). La scena cambia visivamente con il tuo livello e con il ciclo giorno/notte in tempo reale.`,
    },
    {
      icon: '📜', title: 'Bacheca del Viandante',
      body: `Ogni giorno la Bacheca del Viandante (tab <b>Rifugio</b>, in fondo) espone nuove commissioni fisiche: correre N km, registrare X allenamenti, raggiungere una soglia di passi. Ogni missione ha un livello di difficoltà (commissione, ricerca, impresa) e una ricompensa in oro e oggetti. Le missioni si resettano a mezzanotte — non lasciare ricompense non riscuotute!`,
    },
    {
      icon: '🌱', title: 'Serra del Viandante',
      body: `Pianta semi nel tuo orto e raccoglili dopo alcuni giorni reali. Ogni pianta ha una rarità e un tratto speciale che potenzia temporaneamente il tuo eroe quando viene raccolta. Completa le <b>Missioni Serra</b> settimanali per guadagnare oro e — 30% di probabilità — un consumabile comune.`,
    },
    {
      icon: '🐾', title: 'Santuario dei Famigli',
      body: `Adotta un famiglio nel Rifugio. Ha Fame, Umore e Energia che scendono col tempo: nutrilo e giocaci ogni giorno. I famigli con statistiche alte ti danno bonus passivi all'XP e all'oro. Se trascurato troppo a lungo si ammala e i bonus si azzerano. Puoi sbloccare famigli rari completando missioni speciali.`,
    },
    {
      icon: '⚗️', title: 'Box Consumabili',
      body: `Il Box Consumabili (menu Eroe) contiene le tue pozioni e i tuoi buff. Ogni consumabile ha un effetto istantaneo o un buff temporaneo: pozioni che raddoppiano l'XP per 3 sessioni, rune che moltiplicano l'oro, scudi che proteggono la streak, e molto altro. Usali prima di un allenamento per massimizzare le ricompense. I consumabili si ottengono da: Arena, boss, mappa, sfide, missioni Serra e acquistandoli al <b>Bazar</b>.`,
    },
    {
      icon: '🏘️', title: 'Borgo',
      body: `Il Borgo ha 4 sezioni: <b>Stalla</b> (cavalcature), <b>Mercato Nero</b> (vendi bottino e trova rari), <b>Fucina</b> (potenzia gli oggetti che hai), <b>Bazar</b> (compra consumabili per rarità: comune 45🪙, raro 130🪙, epico 380🪙). Trovi anche <b>Taverna</b>, <b>Bisca</b> e il <b>Mercante Fuggiasco</b> ogni giorno.`,
    },
    {
      icon: '🌍', title: 'Mappa del Mondo',
      body: `La Mappa si sblocca man mano che sali di livello. Ogni bioma ha una storia, mostri unici e loot specifico per zona. Percorrendo km reali esplori il mondo virtuale. Alcuni biomi nascondono <b>Lettere</b> da collezionare che raccontano la lore del mondo di RPGym.`,
    },
    {
      icon: '🎴', title: 'Carte e Imprese',
      body: `Ogni traguardo (km totali, allenamenti, vittorie Arena, livelli) sblocca una Carta illustrata nel tuo album. Le Imprese sono obiettivi a lungo termine con ricompense uniche. Le carte sbloccate compongono il tuo profilo eroe, visibile anche agli amici.`,
    },
    {
      icon: '📤', title: 'Sfida un Amico (PvP)',
      body: `Condividi la tua Hero Card con un amico. Chi percorre più km in 7 giorni vince la sfida e porta a casa oro e gloria. Il tuo record PvP è visibile nel profilo e sblocca titoli speciali come Duellante, Gladiatore e Campione.`,
    },
    {
      icon: '🏆', title: 'Prestige (Rinascita)',
      body: `Al livello 100 puoi scegliere di <b>Rinascere</b>: torni al livello 1 ma ottieni un bonus permanente di <b>+20% XP</b> su tutti gli allenamenti futuri. Oggetti, km, trofei e oro rimangono intatti. Ogni Rinascita aumenta il moltiplicatore cumulativamente.`,
    },
    {
      icon: '☀️', title: 'Pass Stagionale',
      body: `Il <b>Pass Stagionale</b> (tab <b>Rifugio</b>) introduce stagioni a tema della durata di alcuni mesi — la prima è <i>Era della Conquista</i>. Ogni km registrato converte in punti stagione (10 punti per km). I punti avanzano su un percorso di 50 livelli con premi su due tracce: <b>Free</b> (gratuita, aperta a tutti) e <b>Premium</b>. Tra i premi: consumabili rari, oggetti esclusivi, cavalcature e cosmetici. <i>In arrivo presto.</i>`,
    },
    {
      icon: '💡', title: 'Consigli pratici',
      body: `
        <ul class="guida-tips">
          <li>Usa i consumabili <b>prima</b> di registrare l'allenamento — i buff vengono applicati al momento del log.</li>
          <li>Tieni d'occhio le sfide giornaliere: completarle tutte sblocca il bonus totale.</li>
          <li>Il boss settimanale resetta ogni lunedì — non perdere la finestra.</li>
          <li>Visita il Bazar ogni giorno: a volte ha oggetti rari a prezzo di comune.</li>
          <li>Equipa sempre tutti gli slot — anche un oggetto comune dà +XP.</li>
          <li>Il famiglio va nutrito almeno una volta al giorno per mantenere i bonus.</li>
          <li>Controlla la Bacheca del Viandante ogni sera — le missioni completate scadono a mezzanotte.</li>
          <li>Backup regolare del salvataggio dalle Impostazioni — il gioco salva in locale.</li>
        </ul>`,
    },
  ];

  sections.forEach(s => {
    const panel = el('div', 'panel guida-panel');
    const head = el('div', 'guida-head');
    head.innerHTML = `<span class="guida-icon">${s.icon}</span><span class="guida-title">${s.title}</span>`;
    const body = el('div', 'guida-body');
    body.innerHTML = s.body;
    body.style.display = 'none';
    head.addEventListener('click', () => {
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
      head.classList.toggle('guida-open');
    });
    panel.appendChild(head);
    panel.appendChild(body);
    c.appendChild(panel);
  });
}
