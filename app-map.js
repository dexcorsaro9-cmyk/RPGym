function _mapBlock(label, fn) {
  try { fn(); } catch (e) {
    console.error('[Mappa] Sezione "%s" non renderizzata (Lv.%d):\n%s', label, HERO ? HERO.level : '?', e.stack || e);
  }
}

function renderMap(c) {
  if (MAP_VIEW === 'atlas')      { renderAtlasView(c);      return; }
  if (MAP_VIEW === 'pantheon')   { renderPantheonView(c);   return; }
  if (MAP_VIEW === 'avamposto')  { renderAvampostoView(c);  return; }

  /* Step 10: prima visita alla Mappa dopo la prima vittoria in Arena */
  renderOnboardingBanner(c, {
    step: 10, icon: '🗺️',
    title: 'Benvenuto nella Mappa!',
    desc: 'Ogni km registrato avanza il tuo viaggio tra biomi e tappe. Più ti alleni, più lontano arriverai e nuovi territori si apriranno!',
    actionLabel: 'Esplora',
    onAction: () => advanceOnboarding(10)
  });

  /* Step 14: scopri il Boss Settimanale */
  renderOnboardingBanner(c, {
    step: 14, icon: '👹',
    title: 'Il Boss ti sfida!',
    desc: 'Ogni settimana un nemico diverso appare sulla Mappa. Percorri i km richiesti entro domenica per sconfiggerlo e guadagnare bottino leggendario.',
    actionLabel: 'Vedi il Boss',
    onAction: () => advanceOnboarding(14)
  });

  /* Step 17: scopri l'Avamposto e le Gilde */
  renderOnboardingBanner(c, {
    step: 17, icon: '🏰',
    title: "L'Avamposto ti aspetta!",
    desc: "Oltre la mappa trovi sfide PvP, Gilde con cui condividere i progressi e l'Atlas dei viaggiatori. Unisciti a un clan o affronta altri eroi reali.",
    actionLabel: "Raggiungi l'Avamposto",
    onAction: () => { advanceOnboarding(17); MAP_VIEW = 'avamposto'; setTab('map'); }
  });

  // Tutorial collassabile — nascosto se già dismesso
  if (!HERO.mapHelpDismissed) {
    const neverTreasure = !(HERO.treasureMap && HERO.treasureMap.claimed && HERO.treasureMap.claimed.length > 0);
    const mapHelp = document.createElement('details');
    mapHelp.className = 'panel map-help-card';
    if (neverTreasure) mapHelp.open = true;
    mapHelp.innerHTML = `
      <summary class="map-help-summary">🗺️ Come funziona la Mappa
        <button class="map-help-dismiss" title="Non mostrare più">✕</button>
      </summary>
      <div class="map-help-body">
        <p>I km registrati avanzano il tuo viaggio e sbloccano nuovi biomi. Ogni settimana la Mappa offre tre sfide:</p>
        <div class="map-help-rows">
          <div><span>🗺️</span><span><b>Mappa del Tesoro</b> — 3 tappe a 8 / 22 / 45 km, con ricompense crescenti.</span></div>
          <div><span>👹</span><span><b>Boss Settimanale</b> — percorri i km richiesti entro domenica per sconfiggerlo.</span></div>
          <div><span>⚡</span><span><b>Incursione del Giorno</b> — un nemico temporaneo, si resetta ogni 24 h.</span></div>
        </div>
      </div>
    `;
    mapHelp.querySelector('.map-help-dismiss').addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      HERO.mapHelpDismissed = true;
      persist();
      mapHelp.remove();
    });
    c.appendChild(mapHelp);
  }

  const biome = RPG.currentBiome(HERO.level);

  // ── Il bioma attuale, con progresso verso il prossimo ──
  const span = biome.max - biome.min + 1;
  const pctBiome = Math.min(100, Math.round((HERO.level - biome.min + 1) / span * 100));
  const hdr = el('div', 'biome-hero');
  hdr.innerHTML = `
    <div class="biome-hero-name">${biome.name}</div>
    <div class="biome-hero-lv small">Livelli ${biome.min}–${biome.max}</div>
    <div class="membar slim"><div class="membar-fill gold" style="width:${pctBiome}%"></div><span>Liv. ${HERO.level}</span></div>`;
  const slug = RPG.biomeSlug(biome);
  if (slug) {
    const bg = new Image();
    bg.onload = () => { hdr.style.backgroundImage = `linear-gradient(180deg, rgba(28,18,9,.25), rgba(28,18,9,.85)), url('assets/biomi/${slug}.webp')`; hdr.classList.add('has-diorama'); };
    bg.src = `assets/biomi/${slug}.webp`;
  }
  c.appendChild(hdr);

  // ── Incursione del giorno ──
  _mapBlock('incursione', () => {
    if (HERO.incursion && !HERO.incursion.done) {
      const inc = HERO.incursion;
      const p = el('div', 'panel panel-featured incursion-panel');
      p.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/mappa/incursione.webp', 'INCURSIONE — solo oggi!', '⚡')));
      if (inc.enemy !== 'cavaliere-drago') {
        const img = el('img', 'incursion-img');
        img.src = `assets/bestiario/${inc.enemy}.webp`;
        p.appendChild(img);
      }
      p.appendChild(el('p', 'center', `<b>${esc(inc.name)}</b>`));
      const rarLabel = (RPG.RARITIES[inc.minRarity] || RPG.RARITIES.comune).label;
      p.appendChild(kmBarEl('Progresso', inc.progressKm, inc.km, { color: 'danger' }));
      p.appendChild(el('p', 'muted small center',
        `Forziere con oggetto ${rarLabel} o superiore.<br>` +
        `<b class="cd-hot"><span data-cd="midnight">…</span> alla scadenza!</b>`));
      c.appendChild(p);
    } else if (HERO.incursion && HERO.incursion.done) {
      c.appendChild(el('div', 'panel done-strip', `✅ <b>Incursione di oggi respinta!</b> <span class="small muted">Torna domani.</span>`));
    }
  });

  // ── Boss settimanale ──
  _mapBlock('boss', () => {
    const bossStatus = RPG.weeklyBossStatus(HERO);
    if (bossStatus) {
      const { boss, progressKm, done, claimed } = bossStatus;
      const pct = Math.min(100, Math.round(progressKm / boss.km * 100));
      const bp = el('div', 'panel panel-featured boss-weekly-panel');
      bp.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/mappa/boss-settimanale.webp', 'Boss Settimanale', '👑')));
      if (boss.id !== 'cavaliere-drago') {
        const img = el('img', 'incursion-img');
        img.src = `assets/bestiario/${boss.id}.webp`;
        bp.appendChild(img);
      }
      bp.appendChild(el('p', 'center', `<b>${esc(boss.name)}</b> — <span class="muted small">${boss.zone}</span>`));
      bp.appendChild(kmBarEl('Progresso', progressKm, boss.km, {
        color: done || claimed ? 'gold' : 'danger',
      }));
      if (claimed) {
        bp.appendChild(el('div', 'done-strip', `✅ <b>Boss sconfitto questa settimana!</b>`));
      } else if (done) {
        const claimBtn = el('button', 'btn btn-primary wide', `👑 Riscuoti bottino · 🪙 ${boss.gold}`);
        claimBtn.addEventListener('click', () => {
          const reward = RPG.claimWeeklyBoss(HERO);
          if (!reward) return;
          persist(); renderHUD();
          vibrate([150, 50, 200]);
          const itemEl = reward.item ? `<div class="loot-list" style="margin:.5rem 0">${itemHtml(reward.item)}</div>` : '';
          const consEl = reward.consumable ? `<p class="center small">💰 ${esc(reward.consumable.icon)} <b>${esc(reward.consumable.name)}</b> nel Box Consumabili!</p>` : '';
          modal(`<h3 class="center">👑 ${esc(boss.name)} sconfitto!</h3>
            <p class="center">🪙 +${reward.gold} oro${itemEl}</p>
            ${consEl}
            <button class="btn btn-primary wide" onclick="closeModal();setTab('camp')">Ottimo!</button>`);
        });
        bp.appendChild(claimBtn);
      } else {
        bp.appendChild(el('p', 'muted small center', `Sconfiggilo entro domenica · mancano ${(boss.km - progressKm).toFixed(1)} km`));
      }
      c.appendChild(bp);
    }
  });

  // ── Mappa del Tesoro settimanale ──
  _mapBlock('tesoro', () => { const tmStatus = RPG.treasureMapStatus(HERO);
  if (tmStatus) {
    const { progressKm, claimed } = tmStatus;
    const allClaimed = claimed.length >= RPG.TREASURE_MAP_TIERS.length;
    const TIERS = RPG.TREASURE_MAP_TIERS;
    const WP_IMGS = ['assets/map/waypoint-1.webp', 'assets/map/waypoint-2.webp', 'assets/map/waypoint-3.webp'];

    const tp = el('div', 'panel treasure-map-panel');
    tp.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/mappa/mappa-tesoro.webp', 'Mappa del Tesoro', '🗺️')));

    // ── riga track: medal – segmento – medal – segmento – medal ──
    const track = el('div', 'tm-track');

    TIERS.forEach((tier, i) => {
      const done = progressKm >= tier.km;
      const isClaimed = claimed.includes(i);

      // medaglione con wrapper (badge fuori da overflow:hidden)
      const wrap = el('div', 'tm-medal-wrap');
      const medal = el('div', 'tm-medal ' + (isClaimed ? 'claimed' : done ? 'done' : 'locked'));
      const img = document.createElement('img');
      img.src = WP_IMGS[i];
      img.alt = '';
      medal.appendChild(img);
      wrap.appendChild(medal);
      if (done || isClaimed) {
        const badge = el('div', 'tm-badge ' + (isClaimed ? 'claimed' : 'ready'));
        badge.textContent = isClaimed ? '✓' : '!';
        wrap.appendChild(badge);
      }
      track.appendChild(wrap);

      // segmento di sentiero tra questo e il prossimo waypoint
      if (i < TIERS.length - 1) {
        const fromKm = tier.km;
        const toKm = TIERS[i + 1].km;
        const seg = el('div', 'tm-segment');
        const sImg = document.createElement('img');
        sImg.src = 'assets/map/sentiero.webp';
        sImg.alt = '';
        seg.appendChild(sImg);

        // bandierina di posizione corrente nel segmento attivo
        if (progressKm >= fromKm && progressKm < toKm) {
          const flagPct = (progressKm - fromKm) / (toKm - fromKm) * 100;
          const flag = el('div', 'tm-flag', '🚩');
          flag.style.left = flagPct + '%';
          seg.appendChild(flag);
        }

        track.appendChild(seg);
      }
    });
    tp.appendChild(track);

    // ── riga etichette: allineata ai 3 medaglioni ──
    const labels = el('div', 'tm-labels');
    TIERS.forEach((tier, i) => {
      const done = progressKm >= tier.km;
      const isClaimed = claimed.includes(i);
      const rewardTxt = `🪙${tier.gold}${tier.wood ? ` 🌲${tier.wood}` : ''}${tier.item ? ' + 🎒' : ''}`;

      const lbl = el('div', 'tm-label');
      lbl.appendChild(el('div', 'tm-reward' + (done && !isClaimed ? ' ready' : ''), rewardTxt));

      const action = el('div', 'tm-action');
      if (isClaimed) {
        action.appendChild(el('span', 'tm-claimed-label', 'Riscosso'));
      } else if (done) {
        const hasReveal = HERO.consumableBuffs && HERO.consumableBuffs.chestReveal;
        const btnLabel = hasReveal ? '🕯️ Rivela & Riscuoti' : '🎁 Riscuoti';
        const btn = el('button', 'tm-claim-btn' + (hasReveal ? ' reveal-active' : ''), btnLabel);
        btn.addEventListener('click', () => {
          if (hasReveal) {
            /* mostra preview prima di sbloccare */
            const t = RPG.TREASURE_MAP_TIERS[i];
            HERO.consumableBuffs.chestReveal = false;
            persist();
            const previewHtml = `<h3 class="center">🕯️ Contenuto Forziere</h3>
              <p class="center">🪙 ${t.gold}${t.wood ? ` 🌲 ${t.wood}` : ''}${t.item ? ' + <b>Oggetto</b>' : ''}</p>
              <p class="center small muted">Riscuoti per ottenerlo!</p>
              <button class="btn btn-primary wide" onclick="closeModal()">Riscuoti ora</button>`;
            modal(previewHtml);
            btn.textContent = '🎁 Riscuoti';
            btn.classList.remove('reveal-active');
            return;
          }
          const reward = RPG.claimTreasureTier(HERO, i);
          if (!reward) return;
          persist(); renderHUD();
          vibrate([80, 40, 120]);
          const itemEl = reward.item ? `<div class="loot-list" style="margin:.5rem 0">${itemHtml(reward.item)}</div>` : '';
          const consEl = reward.consumable ? `<p class="center small">💰 ${esc(reward.consumable.icon)} <b>${esc(reward.consumable.name)}</b> aggiunto alla Sacca!</p>` : '';
          modal(`<h3 class="center">🗺️ Tappa ${i + 1} completata!</h3>
            <p class="center">🪙 +${reward.gold}${reward.wood ? ` 🌲 +${reward.wood}` : ''}${itemEl}</p>
            ${consEl}
            <button class="btn btn-primary wide" onclick="closeModal();setTab('camp')">Ottimo!</button>`);
        });
        action.appendChild(btn);
      } else {
        action.appendChild(el('span', 'tm-km-label', tier.km + ' km'));
      }
      lbl.appendChild(action);
      labels.appendChild(lbl);
    });
    tp.appendChild(labels);

    const daysLeftTxt = tmStatus.daysLeft === 1 ? '1 giorno rimasto' : `${tmStatus.daysLeft} giorni rimasti`;
    tp.appendChild(el('div', 'tm-progress-label', `${progressKm.toFixed(1)} km · ⏳ ${daysLeftTxt}`));
    if (allClaimed) tp.appendChild(el('div', 'done-strip', '✅ <b>Mappa completata!</b>'));
    c.appendChild(tp);
  }
  });

  // ── Pozione del Giorno ──
  _mapBlock('pozione', () => {
    const potion = RPG.getDailyPotion();
    const already = HERO.dailyPotion && HERO.dailyPotion.claimedDate === todayISO();
    const used = already && HERO.dailyPotion.used;
    const pp = el('div', 'potion-day-panel panel');
    pp.appendChild(el('div', 'panel-title', ptIcon('assets/ui/mappa/pozione-giorno.webp', 'Pozione del Giorno', '⚗️')));
    pp.appendChild(el('div', 'potion-name', `${potion.icon} ${potion.name}`));
    pp.appendChild(el('div', 'potion-desc', potion.desc));
    if (used) {
      pp.appendChild(el('div', 'potion-claimed-note', '✅ Pozione usata oggi'));
    } else if (already) {
      pp.appendChild(el('div', 'potion-claimed-note', `${potion.icon} Riscattata · si attiva al prossimo allenamento`));
    } else {
      const btn = el('button', 'btn btn-primary wide', `${potion.icon} Riscuoti pozione`);
      btn.addEventListener('click', () => {
        const err = RPG.claimDailyPotion(HERO);
        if (err) { toast(err); return; }
        persist(); setTab('map');
        vibrate([60, 30, 100]);
      });
      pp.appendChild(btn);
    }
    c.appendChild(pp);
  });

  // ── Il Pantheon dei Campioni (entry) ──
  _mapBlock('pantheon', () => {
    const pvpWins = HERO.pvpWins || 0;
    const pt = pvpTitle(pvpWins);
    const pvpEntry = el('div', 'panel borgo-entry-panel pantheon-entry-panel');
    const pantheonThumb = document.createElement('img');
    pantheonThumb.src = 'assets/ui/pantheon-header.webp';
    pantheonThumb.alt = '';
    pantheonThumb.className = 'borgo-entry-header';
    pantheonThumb.onerror = () => pantheonThumb.remove();
    pvpEntry.appendChild(pantheonThumb);
    pvpEntry.appendChild(el('h3', 'panel-title pantheon-entry-title', ptIcon('assets/ui/mappa/pantheon.webp', 'Il Pantheon dei Campioni', '🏛️')));
    if (pt) pvpEntry.appendChild(el('div', 'pantheon-rank-chip', `${pt.icon} ${pt.label}`));
    pvpEntry.appendChild(el('p', 'muted small borgo-entry-quote', '«Classifica globale · I tuoi Rivali · Sfide PvP»'));
    const enterPantheonBtn = el('button', 'btn btn-primary wide', '⚔️ Entra nel Pantheon');
    enterPantheonBtn.addEventListener('click', () => { MAP_VIEW = 'pantheon'; setTab('map'); });
    pvpEntry.appendChild(enterPantheonBtn);
    c.appendChild(pvpEntry);
  });

  // ── Mercante Itinerante (ven–dom) ──
  _mapBlock('mercante', () => {
    if (RPG.isMerchantWeekend()) {
      const merchant = RPG.getTravelingMerchant(HERO);
      if (merchant) {
        const mp = el('div', 'panel merchant-panel');
        mp.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/mappa/mercante.webp', 'Mercante Itinerante', '🧳')));
        mp.appendChild(el('p', 'muted small center', 'Disponibile solo venerdì–domenica! Sparisce lunedì.'));
        const grid = el('div', 'merchant-offers-grid');
        merchant.offers.forEach((o, i) => {
          const boughtKey = merchant.weekStamp + '-' + i;
          const bought = HERO.merchantBought && HERO.merchantBought[boughtKey];
          const effectivePrice = RPG.merchantEffectivePrice(HERO, o.price);
          const hasDiscount = effectivePrice < o.price;
          const card = el('div', 'merchant-offer-card' + (bought ? ' bought' : ''));
          const img = RPG.itemImg(o.item);
          const imgHtml = img
            ? `<img class="merchant-offer-img" src="${img}" onerror="this.outerHTML='<span class=merchant-offer-icon>${o.item.icon||'⚔️'}</span>'" alt="">`
            : `<span class="merchant-offer-icon">${o.item.icon || '⚔️'}</span>`;
          const rar = RPG.RARITIES[o.item.rarity];
          card.innerHTML = `${imgHtml}
            <div class="merchant-offer-name">${esc(o.item.name)}</div>
            <div class="tag" style="color:${rar.color}">${rar.label}</div>`;
          if (bought) {
            card.innerHTML += `<span class="done-strip" style="font-size:.85rem">✅ Acquistato</span>`;
          } else {
            const priceLabel = hasDiscount
              ? `🪙 <s style="opacity:.5">${o.price}</s> ${effectivePrice}`
              : `🪙 ${effectivePrice}`;
            const btn = el('button', 'btn btn-small' + (HERO.gold >= effectivePrice ? ' btn-primary' : ''));
            btn.innerHTML = priceLabel;
            btn.style.marginTop = 'auto';
            btn.addEventListener('click', () => {
              const err = RPG.buyFromMerchant(HERO, i);
              if (err) { toast(err); return; }
              persist(); renderHUD();
              vibrate([80, 40, 120]);
              setTab('camp');
            });
            card.appendChild(btn);
          }
          grid.appendChild(card);
        });
        mp.appendChild(grid);
        c.appendChild(mp);
      }
    }
  });

  // ── Avamposto delle Spedizioni (entry) ──
  _mapBlock('avamposto', () => {
    const avail = RPG.availableMissions(HERO);
    const active = HERO.activeMission ? RPG.MISSIONS.find(x => x.id === HERO.activeMission.id) : null;
    const avamposto = el('div', 'panel avamposto-entry-panel');
    const thumb = document.createElement('img');
    thumb.src = 'assets/ui/avamposto.webp';
    thumb.alt = '';
    thumb.className = 'camp-panel-thumb';
    avamposto.appendChild(thumb);
    avamposto.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/mappa/avamposto.webp', 'Avamposto delle Spedizioni', '🏕️')));
    avamposto.appendChild(el('p', 'muted small',
      active
        ? `🐎 In viaggio: ${active.name} — ${HERO.activeMission.progressKm.toFixed(1)} / ${active.km} km`
        : avail.length
          ? `${avail.length} missioni disponibili. Parti e conquista nuovi territori.`
          : 'Nessuna missione disponibile al momento.'));
    const enterBtn = el('button', active ? 'btn btn-primary wide' : 'btn wide', active ? '🐎 Controlla spedizione' : '⚔️ Scegli una missione');
    enterBtn.addEventListener('click', () => { MAP_VIEW = 'avamposto'; setTab('map'); });
    avamposto.appendChild(enterBtn);
    c.appendChild(avamposto);
  });

  // ── Taglia Unica settimanale (compatta) ──
  _mapBlock('taglia', () => {
    const ev = RPG.weeklyEvent(STATE);
    if (!ev || !ev.name || !ev.skin || !(ev.km > 0)) return;
    const evMsLeft = msToWeekEnd();
    const evUrgent = evMsLeft < 86400000;
    const evp = el('div', 'panel event-panel' + (evUrgent && !ev.claimedBy ? ' event-panel-urgent' : ''));
    if (evUrgent && !ev.claimedBy) {
      const urgLabel = el('div', 'event-urgency-banner');
      urgLabel.innerHTML = `⚠️ SCADE FRA <span data-cd="week">…</span> — MAI PIÙ OTTENIBILE!`;
      evp.appendChild(urgLabel);
    }
    evp.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/mappa/taglia.webp', `Taglia: ${esc(String(ev.name))}`, String(ev.icon))));
    if (ev.claimedBy) {
      evp.appendChild(el('p', 'muted small', ev.claimedBy === HERO.name
        ? `🏆 Reclamata da TE! Ricompensa: ${esc(String(ev.skin))}`
        : `⛔ <b>${esc(ev.claimedBy)}</b> è arrivato prima di te questa settimana.`));
    } else {
      const cdClass = evUrgent ? 'cd-critical' : 'cd-hot';
      evp.appendChild(el('p', 'muted small',
        `Primo allenamento singolo da <b>${Number(ev.km)} km</b> della settimana vince: <b>${esc(String(ev.skin))}</b>.<br>` +
        `<b class="${cdClass}">⏳ <span data-cd="week">…</span> alla fine dell'evento</b>`));
      const btn = el('button', 'btn btn-primary wide btn-small', `🏆 Reclama la Taglia`);
      btn.addEventListener('click', () => {
        const last = HERO.log[0];
        const today = todayISO();
        if (last && localDate(new Date(last.date)) === today && last.km >= ev.km) {
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
  });

  // ── Mappa Infuocata ──
  _mapBlock('infuocata', () => _renderMappaInfuocata(c));

  // ── Atlante: pulsante di accesso alla subview ──
  _mapBlock('atlante', () => {
    const atlasEntry = el('div', 'panel atlas-entry-panel');
    const unlockedCount = RPG.BIOMES.filter(b => HERO.level >= b.min).length;
    atlasEntry.innerHTML = `
      <div class="atlas-entry-row">
        <div>
          <div class="atlas-entry-title">${ptIcon('assets/ui/mappa/atlante.webp', 'Atlante del Reame', '📖')}</div>
          <div class="small muted">${unlockedCount} / ${RPG.BIOMES.length} biomi scoperti</div>
        </div>
        <button class="btn btn-small atlas-open-btn">Esplora →</button>
      </div>`;
    atlasEntry.querySelector('.atlas-open-btn').addEventListener('click', () => {
      MAP_VIEW = 'atlas'; setTab('map');
    });
    c.appendChild(atlasEntry);
  });

}

function renderTavernaView(c) {
  const backBtn = el('button', 'view-back-link', '‹ Il Borgo');
  backBtn.addEventListener('click', () => { MARKET_VIEW = 'hub'; setTab('market'); });
  c.appendChild(backBtn);

  const heroImg = document.createElement('img');
  heroImg.src = 'assets/ui/taverna-header.webp';
  heroImg.alt = '';
  heroImg.className = 'borgo-sub-header';
  heroImg.onerror = () => heroImg.remove();
  c.appendChild(heroImg);

  const grukBanner = npcBanner(
    'assets/avatars/npc/locandiere-orco.webp',
    'Gruk il Bonaccione',
    '«Il nome è Gruk. Se perdi, paghi. Se vinci, offro io un boccale. Parola di oste.»'
  );
  grukBanner.classList.add('npc-banner-lg');
  c.appendChild(grukBanner);

  renderMiniGamesHub(c);
}

function renderBiscaView(c) {
  const backBtn = el('button', 'view-back-link view-back-link-bisca', '‹ Il Borgo');
  backBtn.addEventListener('click', () => { MARKET_VIEW = 'hub'; setTab('market'); });
  c.appendChild(backBtn);

  const headerImg = document.createElement('img');
  headerImg.src = 'assets/backgrounds/bg-bisca.webp';
  headerImg.className = 'bisca-header-img';
  headerImg.alt = '';
  headerImg.onerror = () => headerImg.remove();
  c.appendChild(headerImg);

  const wrap = el('div', 'bisca-view-wrap');
  const inner = el('div', 'bisca-inner');
  wrap.appendChild(inner);
  c.appendChild(wrap);

  inner.appendChild(el('h2', 'section-title', ptIcon('assets/ui/borgo/bisca.webp', 'La Bisca Oscura', '🃏')));

  // NPC biscazziere
  const npcBanner = el('div', 'npc-banner bisca-npc-banner');
  const npcImg = document.createElement('img');
  npcImg.src = 'assets/npcs/biscazziere.webp';
  npcImg.className = 'npc-img bisca-npc-img';
  npcImg.alt = 'Il Biscazziere';
  npcImg.onerror = () => npcImg.remove();
  npcBanner.appendChild(npcImg);
  const npcQuote = el('p', 'npc-quote', '«Scegli il tuo campione. Punta l\'oro. Prega che regga.»');
  npcBanner.appendChild(npcQuote);
  inner.appendChild(npcBanner);

  RPG.biscaResetIfNeeded(HERO);
  const betsLeft = (HERO.bisca && HERO.bisca.betsLeft !== undefined) ? HERO.bisca.betsLeft : 0;

  const goldRow = el('div', 'bisca-gold-row');
  goldRow.innerHTML = `<span>🪙 Oro: <b id="bisca-gold-val">${HERO.gold || 0}</b></span><span class="bisca-bets-left" id="bisca-bets-counter">${betsLeft} / ${RPG.BISCA_DAILY_BETS} scommesse</span>`;
  inner.appendChild(goldRow);

  if (betsLeft <= 0) {
    inner.appendChild(el('div', 'panel bisca-empty', '⛔ Hai esaurito le scommesse di oggi. Torna domani.'));
    return;
  }

  const fighters = RPG.biscaPickFighters();
  if (!fighters) {
    inner.appendChild(el('div', 'panel bisca-empty', 'Nessun combattente disponibile.'));
    return;
  }
  const { a, b } = fighters;

  const arena = el('div', 'bisca-arena');

  const cardA = el('div', 'bisca-fighter bisca-fighter-a');
  const imgA = document.createElement('img');
  imgA.src = `assets/bestiario/${a.id}.webp`;
  imgA.className = 'bisca-fighter-img';
  imgA.alt = '';
  imgA.onerror = () => imgA.remove();
  imgA.loading = 'lazy';
  const wrapA = el('div', 'bisca-fighter-img-wrap');
  wrapA.appendChild(imgA);
  cardA.appendChild(wrapA);
  cardA.appendChild(el('div', 'bisca-fighter-name', a.name));
  cardA.appendChild(el('div', 'bisca-fighter-zone small muted', a.zone));
  cardA.appendChild(el('div', 'bisca-fighter-weak small', `⚡ ${a.weakness}`));
  cardA.appendChild(el('div', 'bisca-odd bisca-odd-underdog', '×2.5'));

  const vsEl = el('div', 'bisca-vs', 'VS');

  const cardB = el('div', 'bisca-fighter bisca-fighter-b');
  const imgB = document.createElement('img');
  imgB.src = `assets/bestiario/${b.id}.webp`;
  imgB.className = 'bisca-fighter-img';
  imgB.alt = '';
  imgB.onerror = () => imgB.remove();
  imgB.loading = 'lazy';
  const wrapB = el('div', 'bisca-fighter-img-wrap');
  wrapB.appendChild(imgB);
  cardB.appendChild(wrapB);
  cardB.appendChild(el('div', 'bisca-fighter-name', b.name));
  cardB.appendChild(el('div', 'bisca-fighter-zone small muted', b.zone));
  cardB.appendChild(el('div', 'bisca-fighter-weak small bisca-hidden', '⚡ ???'));
  cardB.appendChild(el('div', 'bisca-odd bisca-odd-fav', '×1.7'));

  arena.appendChild(cardA);
  arena.appendChild(vsEl);
  arena.appendChild(cardB);
  inner.appendChild(arena);

  const betPanel = el('div', 'panel bisca-bet-panel');
  betPanel.appendChild(el('div', 'bisca-bet-label', 'Puntata:'));

  const sizeRow = el('div', 'bisca-size-row');
  let selectedAmount = RPG.BISCA_BET_SIZES[0];
  RPG.BISCA_BET_SIZES.forEach(sz => {
    const btn = el('button', 'btn bisca-size-btn' + (sz === selectedAmount ? ' active' : ''), `🪙 ${sz}`);
    btn.addEventListener('click', () => {
      sizeRow.querySelectorAll('.bisca-size-btn').forEach(b2 => b2.classList.remove('active'));
      btn.classList.add('active');
      selectedAmount = sz;
    });
    sizeRow.appendChild(btn);
  });
  betPanel.appendChild(sizeRow);

  const actionRow = el('div', 'bisca-action-row');
  const betABtn = el('button', 'btn btn-secondary bisca-bet-btn', `Punta su ${a.name.split(' ').slice(0,2).join(' ')}`);
  const betBBtn = el('button', 'btn btn-primary bisca-bet-btn', `Punta su ${b.name.split(' ').slice(0,2).join(' ')}`);
  actionRow.appendChild(betABtn);
  actionRow.appendChild(betBBtn);
  betPanel.appendChild(actionRow);
  inner.appendChild(betPanel);

  const resultEl = el('div', 'bisca-result');
  resultEl.style.display = 'none';
  inner.appendChild(resultEl);

  async function placeBet(pick) {
    betABtn.disabled = true;
    betBBtn.disabled = true;
    resultEl.style.display = '';
    resultEl.innerHTML = `<div class="bisca-log-line bisca-log-intro">⚔️ I combattenti entrano nell'arena…</div>`;

    const fighterA = a.name;
    const fighterB = b.name;
    const logs = [
      `<b>${esc(fighterA)}</b> apre con un fendente!`,
      `<b>${esc(fighterB)}</b> risponde colpo su colpo!`,
      `Lo scontro si fa feroce — nessuno cede terreno…`,
    ];
    for (const log of logs) {
      await new Promise(r => setTimeout(r, 650));
      const line = el('div', 'bisca-log-line');
      line.innerHTML = log;
      resultEl.appendChild(line);
    }
    await new Promise(r => setTimeout(r, 750));

    const res = RPG.biscaBet(HERO, pick, a.id, b.id, selectedAmount);
    if (!res.error) RPG.updateWeeklyProgress(HERO, 'bisca', 1);
    persist(); renderHUD();

    if (res.error === 'no_gold') {
      const errEl = el('div', 'bisca-verdict bisca-lose', '🪙 Oro insufficiente per questa puntata!');
      resultEl.appendChild(errEl);
      betABtn.disabled = false;
      betBBtn.disabled = false;
      return;
    }
    if (res.error === 'no_bets') {
      const errEl = el('div', 'bisca-verdict bisca-lose', '⛔ Scommesse esaurite per oggi.');
      resultEl.appendChild(errEl);
      return;
    }

    const winnerName = res.winner === 'a' ? fighterA : fighterB;
    const verdict = el('div', res.won ? 'bisca-verdict bisca-win' : 'bisca-verdict bisca-lose');
    verdict.innerHTML = res.won
      ? `🏆 <b>${esc(winnerName)}</b> vince lo scontro!<br>Hai guadagnato 🪙 <b>${res.payout}</b> Oro${res.doubleActive ? ' <span style="color:#e8b64c">🍀 ×2!</span>' : ''}`
      : `💀 <b>${esc(winnerName)}</b> trionfa… Hai perso 🪙 <b>${res.amount}</b> Oro.`;
    resultEl.appendChild(verdict);

    if (res.won) { sfx('coin'); vibrate([80, 40, 160]); }

    const biscaGoldEl = document.getElementById('bisca-gold-val');
    const biscaBetsEl = document.getElementById('bisca-bets-counter');
    if (biscaGoldEl) biscaGoldEl.textContent = HERO.gold || 0;
    if (biscaBetsEl) biscaBetsEl.textContent = `${res.betsLeft} / ${RPG.BISCA_DAILY_BETS} scommesse`;

    if (res.betsLeft > 0) {
      const replayBtn = el('button', 'btn btn-primary wide bisca-replay-btn', '🎲 Nuovo scontro');
      replayBtn.addEventListener('click', () => { MARKET_VIEW = 'bisca'; setTab('market'); });
      resultEl.appendChild(replayBtn);
    }
  }

  betABtn.addEventListener('click', () => placeBet('a'));
  betBBtn.addEventListener('click', () => placeBet('b'));
}

/* ── Mappa Infuocata ─────────────────────────────────────────── */
function _renderMappaInfuocata(c) {
  const info = RPG.mappaInfuocataStatus(HERO);
  if (!info) return;

  const panel = el('div', 'panel mi-panel');

  if (info.status === 'offered') {
    panel.innerHTML = `
      <h3 class="panel-title">${ptIcon('assets/ui/mappa/mappa-infuocata.webp', 'Mappa Infuocata', '🗺️')}</h3>
      <p class="muted small">Una mappa segreta è disponibile questa settimana. Attivala e corri <b>10 km in 24 ore</b> per reclamare un bottino leggendario — ma la rarità cala con il passare del tempo!</p>
      <div class="mi-tiers-preview">
        <span class="mi-tier-dot" style="color:#d9822b">★ Leggendario</span> &lt;4h ·
        <span class="mi-tier-dot" style="color:#7b3fbf">★ Epico</span> &lt;8h ·
        <span class="mi-tier-dot" style="color:#2e6fb0">★ Raro</span> &lt;16h ·
        <span class="mi-tier-dot" style="color:#8a7a5f">★ Comune</span> &lt;24h
      </div>`;
    const btn = el('button', 'btn btn-primary wide mi-activate-btn', '🔥 Accendi la Mappa!');
    btn.addEventListener('click', () => {
      if (RPG.activateMappaInfuocata(HERO)) {
        persist();
        toast('🗺️ Mappa Infuocata attivata! Hai 24 ore per percorrere 10 km!');
        setTab('map');
      }
    });
    panel.appendChild(btn);

  } else if (info.status === 'active') {
    const pct = Math.min(100, Math.round((info.kmDone / 10) * 100));
    const hoursLeft = Math.floor(info.msLeft / 3600000);
    const tier = info.tier;
    const tierColor = tier ? tier.color : '#8a7a5f';
    const tierLabel = tier ? tier.label : 'Comune';
    panel.innerHTML = `
      <h3 class="panel-title">${ptIcon('assets/ui/mappa/mappa-infuocata.webp', 'Mappa Infuocata', '🗺️')}</h3>
      <div class="mi-status-row">
        <span class="mi-current-tier" style="color:${tierColor}">★ ${tierLabel}</span>
        <span class="mi-time-left" data-mi-cd>⏳ <span data-cd="mi">…</span></span>
      </div>
      <div class="mi-km-bar-wrap">
        <div class="mi-km-bar" style="width:${pct}%"></div>
      </div>
      <div class="mi-km-text">${info.kmDone.toFixed(1)} / 10 km — ${pct}%</div>
      <p class="muted small center">Più veloce arrivi a 10 km, più rara sarà la ricompensa!</p>`;

  } else if (info.status === 'ready') {
    const elapsed = Date.now() - info.activatedAt;
    const tier = RPG.MI_TIERS.find(t => elapsed < t.maxMs) || RPG.MI_TIERS[RPG.MI_TIERS.length - 1];
    panel.innerHTML = `
      <h3 class="panel-title">${ptIcon('assets/ui/mappa/mappa-infuocata.webp', 'Mappa Infuocata', '🗺️')}</h3>
      <p class="center" style="font-size:2rem">🎉</p>
      <p class="center"><b>10 km completati!</b></p>
      <p class="center muted small">Il tuo bottino: <b style="color:${tier.color}">★ ${tier.label}</b></p>`;
    const btn = el('button', 'btn btn-primary wide', '🎁 Reclama il Bottino!');
    btn.addEventListener('click', () => {
      const result = RPG.claimMappaInfuocata(HERO);
      if (result) {
        persist();
        modal(`
          <h3 class="panel-title">🗺️ Bottino della Mappa!</h3>
          <div class="mi-claim-reward">
            <div class="loot rar-${result.item.rarity} loot-with-img">
              ${itemIconHtml(result.item, 'item-icon-big')}
              <div class="loot-body">
                <div class="loot-head"><b>${esc(result.item.name)}</b> <span class="tag">${RPG.RARITIES[result.item.rarity].label}</span></div>
                <div class="small muted">${result.item.desc}</div>
              </div>
            </div>
          </div>
          <p class="muted center small">+ 🪙 ${result.gold} oro bonus!</p>
          <button class="btn btn-primary wide" onclick="closeModal();renderHUD();">Fantastico!</button>`);
        setTab('map');
      }
    });
    panel.appendChild(btn);

  } else if (info.status === 'burned') {
    panel.innerHTML = `
      <h3 class="panel-title">${ptIcon('assets/ui/mappa/mappa-infuocata.webp', 'Mappa Infuocata', '🗺️')}</h3>
      <p class="center muted">⏰ Il tempo è scaduto. La mappa si è consumata senza lasciare traccia…</p>
      <p class="muted small center">La prossima Mappa Infuocata apparirà la settimana prossima.</p>`;

  } else if (info.status === 'claimed') {
    panel.innerHTML = `
      <h3 class="panel-title">${ptIcon('assets/ui/mappa/mappa-infuocata.webp', 'Mappa Infuocata', '🗺️')}</h3>
      <p class="center">✅ Bottino reclamato questa settimana!</p>
      <p class="muted small center">La prossima Mappa Infuocata apparirà la settimana prossima.</p>`;
  }

  c.appendChild(panel);
}

/* ── Titoli PvP ─────────────────────────────────────────────── */
function pvpTitle(wins) {
  if (wins >= 10) return { label: 'Leggenda delle Sfide',   icon: '🏆' };
  if (wins >= 5)  return { label: 'Campione PvP',           icon: '⚔️' };
  if (wins >= 3)  return { label: 'Combattente di Sfide',   icon: '🥊' };
  if (wins >= 1)  return { label: 'Duellante',              icon: '🗡️' };
  return null;
}

/* ── Classifica Globale ─────────────────────────────────────── */
const CLASS_EMOJI = {
  eroe1:'🧑',eroe2:'👩',fabbro:'⚒️',stregone:'🧙',alchimista:'⚗️',
  furfante:'🗡️',maga:'🔮',paladino:'🛡️',ranger:'🏹',fata:'🧚',
  principe:'🦅',principessa:'🦋',regina:'👑',predone:'💀',principessa_ghiacci:'❄️',sacerdotessa_sole:'☀️',principessa_draghi:'🐉',
};

const _shownInviteIds = new Set();

function _renderLeaderboardPanel() {
  const p = el('div', 'panel pvp-panel');
  const hdr = el('div', 'pvp-panel-hdr');
  hdr.innerHTML = '<span class="pvp-panel-title">🌍 Classifica Globale</span>';
  const refreshBtn = el('button', 'btn btn-small pvp-refresh-btn', '↻');
  refreshBtn.title = 'Aggiorna';
  hdr.appendChild(refreshBtn);
  p.appendChild(hdr);

  const list = el('div', 'lb-list');
  list.innerHTML = '<div class="lb-loading">Caricamento…</div>';
  p.appendChild(list);

  const load = async () => {
    refreshBtn.disabled = true;
    list.innerHTML = '<div class="lb-loading">Caricamento…</div>';
    const rows = await FB.getLeaderboard(25);
    if (rows === null) { list.innerHTML = '<div class="lb-loading muted">⚠️ Server non raggiungibile. Controlla la connessione e riprova.</div>'; refreshBtn.disabled = false; return; }
    if (!rows.length) { list.innerHTML = '<div class="lb-loading muted">Nessun eroe ancora online.</div>'; refreshBtn.disabled = false; return; }
    list.innerHTML = '';
    rows.forEach((h, i) => {
      const isMe = h.id === HERO.id;
      const isFriend = HERO.cloud.friends.includes(h.id);
      const row = el('div', 'lb-row' + (isMe ? ' lb-me' : ''));

      const rank   = el('span', 'lb-rank',   String(i + 1));
      const avatar = el('span', 'lb-avatar', CLASS_EMOJI[h.storyId] || '🧑');
      const name   = el('span', 'lb-name');
      name.innerHTML = esc(h.name) + (isMe ? ' <span class="lb-me-tag">tu</span>' : '');
      const lv  = el('span', 'lb-lv',  `Lv ${h.level || 1}`);
      const km  = el('span', 'lb-km',  `${(h.totalKm || 0).toFixed(1)} km`);

      row.appendChild(rank);
      row.appendChild(avatar);
      row.appendChild(name);
      row.appendChild(lv);
      row.appendChild(km);

      if (!isMe) {
        const btn = el('button', 'lb-rival-btn' + (isFriend ? ' lb-rival-added' : ''), isFriend ? '★' : '➕');
        btn.title = isFriend ? 'Già nella lista rivali' : 'Aggiungi ai rivali';
        btn.addEventListener('click', () => {
          if (isFriend) return;
          if (!HERO.cloud.friends.includes(h.id)) HERO.cloud.friends.push(h.id);
          persist();
          btn.textContent = '★';
          btn.classList.add('lb-rival-added');
          btn.title = 'Già nella lista rivali';
          toast('Rivale aggiunto! Sfidalo dalla scheda Rivali.');
        });
        row.appendChild(btn);
      } else {
        row.appendChild(el('span', 'lb-rival-spacer'));
      }

      list.appendChild(row);
    });
    refreshBtn.disabled = false;
  };

  refreshBtn.addEventListener('click', load);
  load();
  return p;
}

/* ── Rivali ─────────────────────────────────────────────────── */
function _renderRivalsPanel() {
  const friends = HERO.cloud.friends || [];
  const p = el('div', 'panel pvp-panel');
  const hdr = el('div', 'pvp-panel-hdr');
  hdr.innerHTML = '<span class="pvp-panel-title">👥 I Tuoi Rivali</span>';
  p.appendChild(hdr);

  if (!friends.length) {
    p.appendChild(el('p', 'muted small', 'Nessun rivale ancora. Usa ➕ in classifica per aggiungerne uno.'));
    return p;
  }

  const ac = HERO.cloud && HERO.cloud.activeChallenge;
  const list = el('div', 'rivals-list');
  list.innerHTML = '<div class="lb-loading">Caricamento…</div>';
  p.appendChild(list);

  (async () => {
    try {
    list.innerHTML = '';
    // Carica tutti i rivali in parallelo
    const heroData = await Promise.all(friends.map(fid => FB.getHero(fid)));

    friends.forEach((fid, idx) => {
      const fh  = heroData[idx];
      const row = el('div', 'rival-row');

      if (!fh) {
        row.innerHTML = `<span class="rival-avatar">❓</span><span class="rival-info muted small">${esc(fid.slice(0,8))}…</span>`;
        const rmBtn = el('button', 'rival-rm-btn', '🗑️');
        rmBtn.title = 'Rimuovi';
        rmBtn.addEventListener('click', () => {
          HERO.cloud.friends = HERO.cloud.friends.filter(x => x !== fid);
          persist(); row.remove();
        });
        row.appendChild(rmBtn);
        list.appendChild(row);
        return;
      }

      const avatar  = el('span', 'rival-avatar', CLASS_EMOJI[fh.storyId] || '🧑');
      const info    = el('span', 'rival-info');
      info.innerHTML = `<b>${esc(fh.name)}</b> <span class="muted small">Lv ${fh.level || 1} · ${(fh.totalKm || 0).toFixed(1)} km</span>`;
      const actions = el('span', 'rival-actions');

      if (ac) {
        actions.appendChild(el('span', 'muted small', '⚔️ sfida in corso'));
      } else {
        const chalBtn = el('button', 'btn btn-small rival-chal-btn', '⚔️ Sfida');
        chalBtn.addEventListener('click', async () => {
          chalBtn.disabled = true; chalBtn.textContent = '…';
          const cid = await FB.createChallenge(HERO);
          if (!cid) { chalBtn.textContent = 'Errore'; return; }
          const sent = await FB.sendChallengeInvite(cid, HERO, fh.id);
          if (!sent) { FB.deleteChallenge(cid, HERO.id); chalBtn.textContent = 'Errore'; return; }
          HERO.cloud.activeChallenge = { id: cid, role: 'creator', creatorId: HERO.id };
          persist();
          toast('✅ Invito inviato a ' + esc(fh.name) + '!');
          setTab('map'); // re-render Pantheon so PvP panel shows active challenge
        });
        actions.appendChild(chalBtn);
      }

      const rmBtn = el('button', 'rival-rm-btn', '🗑️');
      rmBtn.title = 'Rimuovi rivale';
      rmBtn.addEventListener('click', () => {
        HERO.cloud.friends = HERO.cloud.friends.filter(x => x !== fid);
        persist(); row.remove();
      });

      row.appendChild(avatar);
      row.appendChild(info);
      row.appendChild(actions);
      row.appendChild(rmBtn);
      list.appendChild(row);
    });

    if (!list.children.length) list.innerHTML = '<div class="muted small">Lista vuota.</div>';
    } catch (e) {
      list.innerHTML = '<div class="lb-loading muted">⚠️ Errore di connessione. Riapri il Pantheon per riprovare.</div>';
    }
  })();

  return p;
}

function showChallengeInviteModal(invite) {
  modal(`
    <h3 class="panel-title">⚔️ Sfida Ricevuta!</h3>
    <p class="center" style="font-size:2rem">${CLASS_EMOJI[invite.fromStoryId] || '🧑'}</p>
    <p class="center"><b>${esc(invite.fromName)}</b> (Lv ${invite.fromLevel || 1}) ti sfida a chi percorre più km in 7 giorni!</p>
    <div class="pvp-btn-row">
      <button class="btn btn-primary" id="inv-accept">✅ Accetta</button>
      <button class="btn" id="inv-decline">❌ Rifiuta</button>
    </div>`,
  );
  document.getElementById('inv-accept').addEventListener('click', async () => {
    const result = await FB.joinChallenge(invite.challengeId, HERO);
    const joined = !!(result && result.ok);
    if (joined) {
      HERO.cloud.activeChallenge = { id: invite.challengeId, role: 'opponent', creatorId: invite.fromId };
      persist();
    }
    await FB.clearPendingInvite(HERO.id, invite.challengeId);
    nextOpening();
    if (joined) toast('Sfida accettata! Percorri più km del tuo rivale in 7 giorni.');
    else toast('Errore nell\'accettare la sfida. Riprova.');
  });
  document.getElementById('inv-decline').addEventListener('click', async () => {
    await FB.deleteChallenge(invite.challengeId, invite.fromId);
    await FB.clearPendingInvite(HERO.id, invite.challengeId);
    nextOpening();
  });
}

/* ── Sfide PvP ───────────────────────────────────────────────── */
function _renderPvpPanel() {
  const p = el('div', 'panel pvp-panel');
  p.appendChild(el('div', 'pvp-panel-title', '⚔️ Sfida un Amico'));

  const inner = el('div');
  p.appendChild(inner);

  const refresh = async () => {
    inner.innerHTML = '<div class="lb-loading">…</div>';
    try {
      const ac = HERO.cloud && HERO.cloud.activeChallenge;

      if (ac) {
        // Carica dati sfida attiva — passa creatorId per evitare query extra
        const creatorId = ac.role === 'creator' ? HERO.id : (ac.creatorId || null);
        const ch = await FB.getChallenge(ac.id, creatorId);
        if (!ch) {
          // Sfida non trovata — pulisci
          HERO.cloud.activeChallenge = null; persist();
          inner.innerHTML = ''; _buildPvpIdle(inner, refresh); return;
        }
        _buildPvpActive(inner, ch, refresh);
      } else {
        _buildPvpIdle(inner, refresh);
      }
    } catch (e) {
      inner.innerHTML = '';
      const errMsg = el('div', 'lb-loading muted', '⚠️ Errore di connessione.');
      const retryBtn = el('button', 'btn btn-small pvp-refresh-btn', 'Riprova');
      retryBtn.addEventListener('click', refresh);
      inner.appendChild(errMsg);
      inner.appendChild(retryBtn);
    }
  };

  refresh();
  return p;
}

function _buildPvpIdle(container, refresh) {
  container.innerHTML = '';
  container.appendChild(el('p', 'muted small', 'Sfida un amico a chi percorre più km in 7 giorni. Chi vince porta a casa oro e gloria.'));

  const createBtn = el('button', 'btn btn-primary wide', '⚔️ Crea una sfida');
  createBtn.addEventListener('click', async () => {
    createBtn.disabled = true;
    createBtn.textContent = 'Creazione…';
    const code = await FB.createChallenge(HERO);
    if (!code) { toast('❌ Errore di rete. Riprova.'); createBtn.disabled = false; createBtn.textContent = '⚔️ Crea una sfida'; return; }
    HERO.cloud.activeChallenge = { id: code, role: 'creator', creatorId: HERO.id };
    persist();
    modal(`
      <h3 class="panel-title">⚔️ Sfida Creata!</h3>
      <p class="muted small">Condividi questo codice con il tuo avversario:</p>
      <div class="pvp-code-box">${esc(code)}</div>
      <p class="muted small center">La sfida dura 7 giorni. Chi percorre più km vince.</p>
      <button class="btn btn-primary wide" id="btn-pvp-copy">📋 Copia codice</button>
      <button class="btn wide" style="margin-top:.4rem" onclick="closeModal()">Chiudi</button>`);
    document.getElementById('btn-pvp-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(code).then(() => toast('✅ Codice copiato!')).catch(() => {});
    });
    refresh();
  });
  container.appendChild(createBtn);

  const sep = el('div', 'pvp-sep', 'oppure unisciti a una sfida esistente');
  container.appendChild(sep);

  const row = el('div', 'pvp-join-row');
  const inp = el('input', 'input pvp-code-input');
  inp.placeholder = 'Codice (es. AB3K7X)';
  inp.maxLength = 6;
  inp.style.textTransform = 'uppercase';
  const joinBtn = el('button', 'btn', 'Unisciti');
  joinBtn.addEventListener('click', async () => {
    const code = inp.value.trim().toUpperCase();
    if (code.length !== 6) { toast('Il codice deve essere di 6 caratteri.'); return; }
    joinBtn.disabled = true;
    joinBtn.textContent = '…';
    const ch = await FB.getChallenge(code);
    if (!ch) { toast('❌ Codice non trovato.'); joinBtn.disabled = false; joinBtn.textContent = 'Unisciti'; return; }
    if (ch.status !== 'waiting') { toast('Questa sfida è già in corso o terminata.'); joinBtn.disabled = false; joinBtn.textContent = 'Unisciti'; return; }
    if (ch.creatorId === HERO.id) { toast('Non puoi sfidare te stesso!'); joinBtn.disabled = false; joinBtn.textContent = 'Unisciti'; return; }
    modal(`
      <h3 class="panel-title">⚔️ Accetta la sfida?</h3>
      <p><b>${CLASS_EMOJI[ch.creatorStoryId] || '🧑'} ${esc(ch.creatorName)}</b> (Lv ${ch.creatorLevel}) ti sfida a chi percorre più km in 7 giorni.</p>
      <div class="row gap" style="margin-top:1rem">
        <button class="btn wide" onclick="closeModal()">Rifiuta</button>
        <button class="btn btn-primary wide" id="btn-pvp-accept">⚔️ Accetta</button>
      </div>`);
    document.getElementById('btn-pvp-accept').addEventListener('click', async () => {
      const result = await FB.joinChallenge(code, HERO);
      if (!result || !result.ok) { toast('❌ Errore. Riprova.'); closeModal(); return; }
      HERO.cloud.activeChallenge = { id: code, role: 'opponent', creatorId: result.creatorId };
      persist();
      closeModal();
      toast('⚔️ Sfida accettata! Che vinca il migliore!');
      refresh();
    });
  });
  row.appendChild(inp);
  row.appendChild(joinBtn);
  container.appendChild(row);
}

function _buildPvpActive(container, ch, refresh) {
  container.innerHTML = '';
  const ac        = HERO.cloud.activeChallenge;
  const isCreator = ac.role === 'creator';
  const _creatorId = isCreator ? HERO.id : (ac.creatorId || ch.creatorId || null);
  const myKmStart = isCreator ? ch.creatorKmStart : ch.opponentKmStart;
  const myKmNow   = isCreator ? ch.creatorKmNow   : ch.opponentKmNow;
  const theirKmStart = isCreator ? ch.opponentKmStart : ch.creatorKmStart;
  const theirKmNow   = isCreator ? ch.opponentKmNow   : ch.creatorKmNow;
  const myDelta    = Math.max(0, (myKmNow    || 0) - (myKmStart    || 0));
  const theirDelta = Math.max(0, (theirKmNow || 0) - (theirKmStart || 0));
  const myName    = HERO.name;
  const theirName = isCreator ? (ch.opponentName || '—') : ch.creatorName;
  const theirStory= isCreator ? (ch.opponentStoryId || 'eroe1') : ch.creatorStoryId;
  const maxDelta  = Math.max(myDelta, theirDelta, 1);
  const expired   = new Date() > new Date(ch.endDate + 'T23:59:59');
  const waiting   = ch.status === 'waiting';

  if (ch.status === 'completed') {
    const iWon = ch.winnerId === HERO.id;
    container.appendChild(el('div', 'pvp-result ' + (iWon ? 'pvp-win' : 'pvp-loss'),
      iWon ? '🏆 Hai vinto la sfida!' : '💀 Hai perso la sfida.'));
    container.appendChild(el('div', 'pvp-stats-row',
      `Tu: <b>${myDelta.toFixed(1)} km</b> &nbsp;·&nbsp; ${esc(theirName)}: <b>${theirDelta.toFixed(1)} km</b>`));

    // Ricompensa da ritirare (solo chi ha vinto e non ha ancora riscosso)
    const claimed = (HERO.cloud.claimedChallenges || []).includes(ch.id);
    if (iWon && !claimed) {
      const reward = 150 + (HERO.level || 1) * 10;
      const claimBtn = el('button', 'btn btn-primary wide pvp-claim-btn', `🎁 Ritira ricompensa: ${reward} 🪙`);
      claimBtn.addEventListener('click', () => {
        HERO.gold = (HERO.gold || 0) + reward;
        HERO.pvpWins = (HERO.pvpWins || 0) + 1;
        HERO.cloud = HERO.cloud || { activeChallenge: null };
        HERO.cloud.claimedChallenges = [...(HERO.cloud.claimedChallenges || []), ch.id];
        persist(); renderHUD();
        const pt = pvpTitle(HERO.pvpWins);
        const titleLine = pt ? `<p class="pvp-new-title">${pt.icon} Nuovo titolo: <b>${pt.label}</b></p>` : '';
        modal(`
          <div class="pvp-claim-modal">
            <div class="pvp-claim-icon">🏆</div>
            <h3 class="panel-title">Vittoria!</h3>
            <p class="pvp-claim-gold">+${reward} <span class="pvp-gold-coin">🪙</span></p>
            ${titleLine}
            <p class="muted small">Sfide vinte totali: <b>${HERO.pvpWins}</b></p>
            <button class="btn btn-primary wide" onclick="closeModal()">Grande!</button>
          </div>`);
        claimBtn.remove();
      });
      container.appendChild(claimBtn);
    }

    const closeBtn = el('button', 'btn wide', 'Chiudi sfida');
    closeBtn.addEventListener('click', async () => {
      await FB.deleteChallenge(ch.id, _creatorId);
      HERO.cloud.activeChallenge = null; persist();
      refresh();
    });
    container.appendChild(closeBtn);
    return;
  }

  if (waiting) {
    container.appendChild(el('p', 'muted small', `In attesa che qualcuno usi il codice:`));
    const codeEl = el('div', 'pvp-code-box', esc(ch.id));
    container.appendChild(codeEl);
    const waitBtnRow = el('div', 'pvp-btn-row-small');
    const copyBtn = el('button', 'btn btn-small', '📋 Copia');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(ch.id).then(() => toast('✅ Codice copiato!')).catch(() => {});
    });
    const refreshWaitBtn = el('button', 'btn btn-small pvp-refresh-btn', '🔄 Aggiorna');
    refreshWaitBtn.addEventListener('click', refresh);
    waitBtnRow.appendChild(copyBtn);
    waitBtnRow.appendChild(refreshWaitBtn);
    container.appendChild(waitBtnRow);
  } else {
    // Barre progresso
    const endDate = ch.endDate;
    const daysLeft = Math.max(0, Math.ceil((new Date(endDate + 'T23:59:59') - new Date()) / 86400000));
    container.appendChild(el('div', 'pvp-countdown', `⏳ ${expired ? 'Terminata' : daysLeft + ' giorni rimasti'}`));

    const mkBar = (name, storyId, delta, isMe) => {
      const pct = Math.round(delta / maxDelta * 100);
      const row = el('div', 'pvp-bar-row');
      row.innerHTML =
        `<span class="pvp-bar-label">${CLASS_EMOJI[storyId] || '🧑'} ${esc(name)}${isMe ? ' <span class="lb-me-tag">tu</span>' : ''}</span>` +
        `<div class="pvp-bar-wrap"><div class="pvp-bar-fill${isMe ? ' pvp-bar-me' : ''}" style="width:${pct}%"></div></div>` +
        `<span class="pvp-bar-km">${delta.toFixed(1)} km</span>`;
      return row;
    };
    container.appendChild(mkBar(myName, HERO.storyId || 'eroe1', myDelta, true));
    container.appendChild(mkBar(theirName, theirStory, theirDelta, false));
    const refreshBtn = el('button', 'btn btn-small pvp-refresh-btn', '🔄 Aggiorna');
    refreshBtn.addEventListener('click', refresh);
    container.appendChild(refreshBtn);
  }

  const abandonBtn = el('button', 'btn btn-small pvp-abandon', '🏳️ Abbandona sfida');
  abandonBtn.addEventListener('click', () => {
    modal(`
      <h3 class="panel-title">🏳️ Abbandonare?</h3>
      <p>La sfida verrà eliminata. Stai sicuro?</p>
      <div class="row gap" style="margin-top:1rem">
        <button class="btn wide" onclick="closeModal()">Annulla</button>
        <button class="btn btn-danger wide" id="btn-pvp-abandon-confirm">Abbandona</button>
      </div>`);
    document.getElementById('btn-pvp-abandon-confirm').addEventListener('click', async () => {
      await FB.deleteChallenge(ch.id, _creatorId);
      HERO.cloud.activeChallenge = null; persist();
      closeModal(); refresh();
    });
  });
  container.appendChild(abandonBtn);
}

let MAP_VIEW = 'main';

function renderAvampostoView(c) {
  advanceOnboarding(17);
  const banner = el('div', 'subview-hero-banner avamposto-hero-banner');
  const backBtn = el('button', 'btn btn-small subview-back-btn', '← Mappa');
  backBtn.addEventListener('click', () => { MAP_VIEW = 'main'; setTab('map'); });
  banner.appendChild(backBtn);
  banner.appendChild(el('h2', 'section-title subview-banner-title', '🏕️ Avamposto delle Spedizioni'));
  c.appendChild(banner);

  // Missione attiva
  if (HERO.activeMission) {
    const m = RPG.MISSIONS.find(x => x.id === HERO.activeMission.id);
    const p = el('div', 'panel panel-featured active-mission');
    p.appendChild(el('h3', 'panel-title', `🐎 In Viaggio: ${m.name}`));
    const done = HERO.activeMission.progressKm;
    const pct = Math.min(100, Math.round(done / m.km * 100));
    const remaining = Math.max(0, m.km - done);
    const boss = RPG.BESTIARY.find(b => b.mission === m.id);
    const prog = el('div', 'active-mission-prog');
    if (boss) {
      const bossImg = el('img', 'mission-boss-img');
      bossImg.src = `assets/bestiario/${boss.id}.webp`;
      bossImg.alt = boss.name;
      bossImg.onerror = () => bossImg.remove();
      prog.appendChild(bossImg);
    }
    const progWrap = el('div', 'mission-prog-wrap');
    progWrap.innerHTML = `<div class="mission-prog-bar">
      <div class="mission-prog-fill" style="width:${pct}%"></div>
      <div class="mission-prog-label">${done.toFixed(1)} / ${m.km} km · ${pct}%</div>
    </div>
    <div class="mission-prog-remaining">⚔️ Mancano <b>${remaining.toFixed(1)} km</b> alla destinazione${boss ? ` · ${boss.name} ti aspetta` : ''}</div>`;
    prog.appendChild(progWrap);
    p.appendChild(prog);
    const abandon = el('button', 'btn btn-small', 'Abbandona');
    abandon.addEventListener('click', () => { HERO.activeMission = null; persist(); setTab('map'); });
    p.appendChild(abandon);
    c.appendChild(p);
  }

  // Missioni disponibili
  const avail = RPG.availableMissions(HERO);
  if (avail.length) {
    const mp = el('div', 'panel');
    mp.appendChild(el('h3', 'panel-title', '⚔️ Missioni Disponibili'));
    avail.forEach(m => {
      const row = el('div', 'mission-row');
      row.appendChild(el('div', 'mission-zone-icon', zoneIcon(m.zone)));
      const diffColor = m.km <= 10 ? 'var(--rar-comune)' : m.km <= 25 ? 'var(--rar-raro)' : m.km <= 50 ? 'var(--rar-epico)' : 'var(--rar-leggendario)';
      const diffLabel = m.km <= 10 ? 'Breve' : m.km <= 25 ? 'Media' : m.km <= 50 ? 'Lunga' : 'Epica';
      const diffPct = Math.min(100, Math.round(m.km / 60 * 100));
      row.appendChild(el('div', 'mission-mid',
        `<b>${m.name}</b> <span class="tag">${m.km} km</span><br>` +
        `<span class="small muted">${zoneShort(m.zone)} — ${m.desc}</span>` +
        `<div class="mission-difficulty"><span style="font-size:.6rem;color:${diffColor}">${diffLabel}</span><div style="flex:1;height:4px;background:rgba(0,0,0,.25);border-radius:2px;overflow:hidden"><div style="width:${diffPct}%;height:100%;background:${diffColor};border-radius:2px"></div></div></div>`));
      const btn = el('button', 'btn btn-small btn-primary', 'Parti');
      const vimg = new Image();
      vimg.onload = () => {
        btn.classList.add('btn-plaque-small');
        btn.innerHTML = '';
        vimg.className = 'plaque-img-small';
        btn.appendChild(vimg);
      };
      vimg.src = 'assets/ui/btn-viaggio.webp';
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
  } else if (!HERO.activeMission) {
    c.appendChild(el('div', 'panel', '<p class="muted small center">Nessuna missione disponibile al momento. Esplora nuovi biomi per sbloccarle.</p>'));
  }
}

/* ── Gilda ───────────────────────────────────────────────────── */
function _renderGuildPanel() {
  const p = el('div', 'panel pvp-panel guild-panel');
  p.appendChild(el('div', 'pvp-panel-title', '🏰 La tua Gilda'));

  if (!HERO.guild) {
    _renderGuildJoinView(p);
  } else {
    _renderGuildInfoView(p);
  }
  return p;
}

function _renderGuildJoinView(container) {
  // Create guild button
  const createBtn = el('button', 'btn btn-primary wide', '⚔️ Fonda una Gilda');
  createBtn.addEventListener('click', _showCreateGuildModal);
  container.appendChild(createBtn);

  // Join by code
  const joinRow = el('div', 'guild-join-row');
  const codeInput = el('input', 'guild-code-input');
  codeInput.type = 'text';
  codeInput.placeholder = 'Codice invito (es. AB12CD)';
  codeInput.maxLength = 6;
  const joinBtn = el('button', 'btn btn-small', 'Unisciti');
  joinBtn.addEventListener('click', async () => {
    const code = codeInput.value.trim();
    if (code.length < 6) { toast('Inserisci il codice a 6 caratteri.'); return; }
    joinBtn.disabled = true;
    joinBtn.textContent = '…';
    const res = await FB.joinGuildByCode(HERO, code);
    joinBtn.disabled = false;
    joinBtn.textContent = 'Unisciti';
    if (res && res.ok) {
      HERO.guild = { guildId: res.guildId, name: res.name, emblem: res.emblem || '🏰', tag: res.tag, role: 'member', totalKm: 0 };
      persist();
      toast(`🏰 Benvenuto in [${res.tag}] ${res.name}!`);
      setTab('map');
    } else {
      const msgs = { not_found: 'Codice non trovato.', full: 'Gilda al completo!', already_member: 'Sei già in questa gilda.', offline: 'Sei offline.' };
      toast(msgs[res && res.error] || 'Errore. Riprova.');
    }
  });
  joinRow.appendChild(codeInput);
  joinRow.appendChild(joinBtn);
  container.appendChild(joinRow);

  // Search public guilds
  const searchWrap = el('div', 'guild-search-wrap');
  const searchTitle = el('div', 'guild-search-label', '🔍 Cerca gilde pubbliche');
  searchWrap.appendChild(searchTitle);
  const searchRow = el('div', 'guild-join-row');
  const searchInput = el('input', 'guild-code-input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Nome o tag…';
  const searchBtn = el('button', 'btn btn-small', 'Cerca');
  const resultList = el('div', 'guild-search-results');

  const doSearch = async () => {
    searchBtn.disabled = true;
    resultList.innerHTML = '<div class="lb-loading">Ricerca…</div>';
    const results = await FB.searchGuilds(searchInput.value.trim());
    searchBtn.disabled = false;
    if (!results.length) { resultList.innerHTML = '<div class="lb-loading muted">Nessuna gilda trovata.</div>'; return; }
    resultList.innerHTML = '';
    results.slice(0, 10).forEach(g => {
      const row = el('div', 'guild-result-row');
      const lvData = RPG.guildLevel(g.totalKm || 0);
      row.innerHTML = `<span class="guild-result-emblem">${esc(g.emblem || '🏰')}</span>
        <div class="guild-result-info">
          <span class="guild-result-name">${esc(g.name)} <span class="tag-pill">[${esc(g.tag)}]</span></span>
          <span class="guild-result-meta muted small">Liv. ${lvData + 1} · ${(g.totalKm || 0).toFixed(0)} km · ${g.memberCount || 0}/${g.maxMembers || 20} membri</span>
        </div>`;
      const joinBtn2 = el('button', 'btn btn-small', 'Entra');
      joinBtn2.addEventListener('click', async () => {
        joinBtn2.disabled = true;
        joinBtn2.textContent = '…';
        codeInput.value = g.inviteCode || '';
        const res = await FB.joinGuildByCode(HERO, g.inviteCode || '');
        if (res && res.ok) {
          HERO.guild = { guildId: res.guildId, name: g.name, emblem: g.emblem || '🏰', tag: g.tag, role: 'member', totalKm: g.totalKm || 0 };
          persist();
          toast(`🏰 Benvenuto in [${g.tag}] ${g.name}!`);
          setTab('map');
        } else {
          joinBtn2.disabled = false;
          joinBtn2.textContent = 'Entra';
          const msgs = { full: 'Gilda al completo!', already_member: 'Sei già in questa gilda.', offline: 'Sei offline.' };
          toast(msgs[res && res.error] || 'Errore. Riprova.');
        }
      });
      row.appendChild(joinBtn2);
      resultList.appendChild(row);
    });
  };

  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  searchRow.appendChild(searchInput);
  searchRow.appendChild(searchBtn);
  searchWrap.appendChild(searchRow);
  searchWrap.appendChild(resultList);
  container.appendChild(searchWrap);
}

function _showCreateGuildModal() {
  const emblems = ['🏰','⚔️','🛡️','🐉','🦅','🌙','☀️','🔥','🌊','⚡','🌿','💀','🦁','🐺','🦊'];
  let selectedEmblem = emblems[0];

  modal(`
    <div class="guild-create-form">
      <h3 class="panel-title center">⚔️ Fonda la tua Gilda</h3>
      <label class="field-label">Nome della Gilda</label>
      <input id="gc-name" class="create-name-input" type="text" maxlength="30" placeholder="Es. I Guardiani dell'Alba">
      <label class="field-label" style="margin-top:.8rem">Tag [3 lettere]</label>
      <input id="gc-tag" class="create-name-input" type="text" maxlength="3" placeholder="GAR" style="text-transform:uppercase">
      <label class="field-label" style="margin-top:.8rem">Emblema</label>
      <div id="gc-emblems" class="guild-emblem-grid">${emblems.map(e => `<button class="guild-emblem-btn${e === selectedEmblem ? ' selected' : ''}" data-e="${e}">${e}</button>`).join('')}</div>
      <label class="field-label" style="margin-top:.8rem">Descrizione (opzionale)</label>
      <input id="gc-desc" class="create-name-input" type="text" maxlength="80" placeholder="Cercasi eroi valorosi…">
      <label class="field-label" style="margin-top:.8rem">Visibilità</label>
      <div style="display:flex;gap:.5rem;margin-bottom:.5rem">
        <button id="gc-pub" class="btn btn-small btn-primary">🌍 Pubblica</button>
        <button id="gc-priv" class="btn btn-small">🔒 Privata</button>
      </div>
      <div id="gc-error" style="color:var(--danger,#c0392b);font-size:.85rem;min-height:1rem;margin:.3rem 0"></div>
      <button id="gc-confirm" class="btn btn-primary wide big">🔥 Fonda!</button>
    </div>
  `);

  let isPublic = true;
  document.getElementById('gc-pub').addEventListener('click', () => {
    isPublic = true;
    document.getElementById('gc-pub').classList.add('btn-primary');
    document.getElementById('gc-priv').classList.remove('btn-primary');
  });
  document.getElementById('gc-priv').addEventListener('click', () => {
    isPublic = false;
    document.getElementById('gc-priv').classList.add('btn-primary');
    document.getElementById('gc-pub').classList.remove('btn-primary');
  });
  document.getElementById('gc-emblems').addEventListener('click', e => {
    const btn = e.target.closest('.guild-emblem-btn');
    if (!btn) return;
    selectedEmblem = btn.dataset.e;
    document.querySelectorAll('.guild-emblem-btn').forEach(b => b.classList.toggle('selected', b.dataset.e === selectedEmblem));
  });
  document.getElementById('gc-confirm').addEventListener('click', async () => {
    const name = document.getElementById('gc-name').value.trim();
    const tag  = document.getElementById('gc-tag').value.trim().toUpperCase();
    const desc = document.getElementById('gc-desc').value.trim();
    const errEl = document.getElementById('gc-error');
    if (name.length < 3)  { errEl.textContent = 'Il nome deve avere almeno 3 caratteri.'; return; }
    if (tag.length !== 3) { errEl.textContent = 'Il tag deve essere di esattamente 3 lettere.'; return; }
    const btn = document.getElementById('gc-confirm');
    btn.disabled = true; btn.textContent = 'Fondazione…';
    const res = await FB.createGuild(HERO, { name, tag, emblem: selectedEmblem, description: desc, isPublic });
    if (res && res.ok) {
      HERO.guild = { guildId: res.guildId, name, emblem: selectedEmblem, tag, role: 'founder', inviteCode: res.inviteCode, totalKm: 0 };
      persist();
      closeModal();
      toast(`🏰 Gilda [${tag}] ${name} fondata!`);
      setTab('map');
    } else {
      btn.disabled = false; btn.textContent = '🔥 Fonda!';
      errEl.textContent = res && res.error === 'offline' ? 'Sei offline. Connettiti e riprova.' : 'Errore nella creazione. Riprova.';
    }
  });
}

function _renderGuildInfoView(container) {
  const g = HERO.guild;
  const lv = RPG.guildLevel(g.totalKm || 0);
  const bonus = RPG.guildBonus(g.totalKm || 0);
  const nextLv = RPG.GUILD_LEVELS[lv + 1];

  // Guild card
  const card = el('div', 'guild-info-card');
  const bonusLines = [];
  if (bonus.xpPct)    bonusLines.push(`+${bonus.xpPct}% XP`);
  if (bonus.goldPct)  bonusLines.push(`+${bonus.goldPct}% Oro`);
  if (bonus.arenaDmg) bonusLines.push(`+${bonus.arenaDmg}% Danno Arena`);
  if (bonus.arenaHp)  bonusLines.push(`+${bonus.arenaHp}% HP Arena`);
  const bonusStr = bonusLines.length ? bonusLines.join(' · ') : 'Nessun bonus (sali di livello!)';
  const nextStr = nextLv ? `Prossimo Liv. ${lv + 2}: ${nextLv.km} km totali` : 'Livello massimo raggiunto!';
  card.innerHTML = `
    <div class="guild-card-top">
      <span class="guild-card-emblem">${esc(g.emblem || '🏰')}</span>
      <div class="guild-card-meta">
        <div class="guild-card-name">${esc(g.name)} <span class="tag-pill">[${esc(g.tag || '')}]</span></div>
        <div class="guild-card-lv muted small">Liv. ${lv + 1} · ${(g.totalKm || 0).toFixed(0)} km totali</div>
        <div class="guild-card-bonus small">${bonusStr}</div>
      </div>
    </div>
    <div class="membar slim" style="margin-top:.4rem">
      <div class="membar-fill gold" style="width:${nextLv ? Math.min(100, Math.round((g.totalKm || 0) / nextLv.km * 100)) : 100}%"></div>
      <span>${nextStr}</span>
    </div>`;
  container.appendChild(card);

  // Invite code (founder/officer)
  if (g.inviteCode || g.role === 'founder') {
    const codeRow = el('div', 'guild-code-row');
    const displayCode = g.inviteCode || '??????';
    codeRow.innerHTML = `<span class="muted small">Codice invito:</span>
      <span class="guild-code-display">${esc(displayCode)}</span>`;
    const copyBtn = el('button', 'btn btn-small', '📋 Copia');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard && navigator.clipboard.writeText(displayCode).then(() => toast('Codice copiato!')).catch(() => {});
    });
    codeRow.appendChild(copyBtn);
    container.appendChild(codeRow);
  }

  // Members list (loaded async)
  const membersWrap = el('div', 'guild-members-wrap');
  const mHdr = el('div', 'pvp-panel-hdr');
  mHdr.innerHTML = '<span class="pvp-panel-title" style="font-size:.9rem">📊 Classifica settimanale</span>';
  const refreshBtn = el('button', 'btn btn-small pvp-refresh-btn', '↻');
  mHdr.appendChild(refreshBtn);
  membersWrap.appendChild(mHdr);
  const memberList = el('div', 'guild-member-list');
  memberList.innerHTML = '<div class="lb-loading">Caricamento…</div>';
  membersWrap.appendChild(memberList);

  const loadMembers = async () => {
    refreshBtn.disabled = true;
    memberList.innerHTML = '<div class="lb-loading">Caricamento…</div>';
    const members = await FB.getGuildMembers(g.guildId);
    if (!members.length) { memberList.innerHTML = '<div class="lb-loading muted">Nessun membro trovato.</div>'; refreshBtn.disabled = false; return; }
    memberList.innerHTML = '';
    members.forEach((m, i) => {
      const isMe = m.heroId === HERO.id;
      const row = el('div', 'lb-row' + (isMe ? ' lb-me' : ''));
      row.innerHTML = `
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-avatar">${CLASS_EMOJI[m.storyId] || '🧑'}</span>
        <span class="lb-name">${esc(m.heroName)}${isMe ? ' <span class="lb-me-tag">tu</span>' : ''}${m.role === 'founder' ? ' <span class="lb-me-tag" style="background:var(--gold-bright,#f5b800);color:#222">✦</span>' : ''}</span>
        <span class="lb-lv">Lv ${m.level || 1}</span>
        <span class="lb-km">${(m.weeklyKm || 0).toFixed(1)} km</span>`;
      memberList.appendChild(row);
    });
    // Also refresh guild totalKm from live data
    const freshGuild = await FB.getGuild(g.guildId);
    if (freshGuild) {
      HERO.guild = { ...HERO.guild, totalKm: freshGuild.totalKm, weeklyKm: freshGuild.weeklyKm, memberCount: freshGuild.memberCount, inviteCode: freshGuild.inviteCode };
      persist();
    }
    refreshBtn.disabled = false;
  };
  refreshBtn.addEventListener('click', loadMembers);
  loadMembers();
  container.appendChild(membersWrap);

  // Leave guild button
  const leaveBtn = el('button', 'btn btn-small guild-leave-btn', g.role === 'founder' ? '💀 Sciogliere la Gilda' : '🚪 Lascia la Gilda');
  leaveBtn.style.cssText = 'margin-top:.8rem;color:var(--danger,#c0392b)';
  leaveBtn.addEventListener('click', () => {
    const msg = g.role === 'founder'
      ? 'Sei il fondatore. Sciogliere la gilda la cancellerà per tutti i membri. Sicuro?'
      : `Vuoi davvero lasciare [${g.tag}] ${g.name}?`;
    modal(`<div class="center" style="padding:1rem">
      <p>${esc(msg)}</p>
      <div style="display:flex;gap:.5rem;justify-content:center;margin-top:1rem">
        <button class="btn btn-primary" id="guild-leave-confirm">${g.role === 'founder' ? '💀 Sciogli' : '🚪 Lascia'}</button>
        <button class="btn" onclick="closeModal()">Annulla</button>
      </div>
    </div>`);
    document.getElementById('guild-leave-confirm').addEventListener('click', async () => {
      closeModal();
      await FB.leaveGuild(HERO);
      HERO.guild = null;
      persist();
      toast(g.role === 'founder' ? '💀 Gilda sciolta.' : '🚪 Hai lasciato la gilda.');
      setTab('map');
    });
  });
  container.appendChild(leaveBtn);
}

function renderPantheonView(c) {
  // Check for pending challenge invites each time the Pantheon is opened
  (async () => {
    const invites = await FB.getPendingInvites(HERO.id);
    if (!invites.length) return;
    let queued = false;
    invites.forEach(inv => {
      if (_shownInviteIds.has(inv.challengeId)) return;
      _shownInviteIds.add(inv.challengeId);
      OPEN_QUEUE.push(() => showChallengeInviteModal(inv));
      queued = true;
    });
    if (queued && document.getElementById('modal').classList.contains('hidden')) nextOpening();
  })();

  const banner = el('div', 'subview-hero-banner pantheon-hero-banner');
  const backBtn = el('button', 'btn btn-small subview-back-btn', '← Mappa');
  backBtn.addEventListener('click', () => { MAP_VIEW = 'main'; setTab('map'); });
  banner.appendChild(backBtn);
  banner.appendChild(el('h2', 'section-title subview-banner-title pantheon-title', '🏛️ Il Pantheon dei Campioni'));
  c.appendChild(banner);

  c.appendChild(_renderLeaderboardPanel());
  c.appendChild(_renderRivalsPanel());
  c.appendChild(_renderPvpPanel());
  c.appendChild(_renderGuildPanel());
}

function renderAtlasView(c) {
  const back = el('button', 'btn btn-small', '← Mappa');
  back.addEventListener('click', () => { MAP_VIEW = 'main'; setTab('map'); });
  c.appendChild(back);
  c.appendChild(el('h2', 'section-title', ptIcon('assets/ui/mappa/atlante.webp', 'Atlante del Reame', '📖')));

  const biome = RPG.currentBiome(HERO.level);
  const grid = el('div', 'biome-atlas');
  RPG.BIOMES.forEach(b => {
    const open = HERO.level >= b.min;
    const isCurrent = b === biome;
    const slug = RPG.biomeSlug(b);
    const cls = ['biome-atlas-card', open ? '' : 'locked', isCurrent ? 'current' : ''].filter(Boolean).join(' ');
    const card = el('div', cls);
    if (open && slug) {
      const bg = el('img', 'bac-bg');
      bg.src = `assets/biomi/${slug}.webp`;
      bg.alt = '';
      bg.loading = 'lazy';
      card.appendChild(bg);
    }
    const info = el('div', 'bac-info');
    if (open) {
      info.innerHTML = `<div class="bac-icon">${b.icon}</div>
        <div class="bac-name">${zoneShort(b.name)}</div>
        <div class="bac-lv">Liv. ${b.min}–${b.max}</div>`;
    } else {
      info.innerHTML = `<div class="bac-lv">Liv. ${b.min}–${b.max}</div>`;
      const lockDiv = el('div', 'bac-lock');
      lockDiv.innerHTML = `<span class="bac-lock-icon">🔒</span><div class="bac-lock-lv">Sblocca al Liv. ${b.min}</div>`;
      card.appendChild(lockDiv);
    }
    card.appendChild(info);
    if (isCurrent) {
      const badge = el('div', 'bac-current-badge', 'QUI');
      card.appendChild(badge);
    }
    if (open) card.addEventListener('click', () => showBiomePreview(b, open));
    grid.appendChild(card);
  });
  c.appendChild(grid);
}

function zoneShort(zone) {
  return zone.replace(/^(Il |La |Le |L')/, '');
}

function zoneIcon(zone) {
  const b = RPG.BIOMES.find(x => x.name === zone);
  return b ? b.icon : '📍';
}

/* ── TAB: Allenati ── */
let CHALLENGE_TAB = 'daily';

function _timeUntilMidnight() {
  const now = new Date(), next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const d = next - now;
  const h = Math.floor(d / 3600000), m = Math.floor((d % 3600000) / 60000);
  return `${h}h ${m}m`;
}
function _timeUntilMonday() {
  const now = new Date();
  const days = (8 - now.getDay()) % 7 || 7;
  const mon = new Date(now); mon.setDate(now.getDate() + days); mon.setHours(0, 0, 0, 0);
  const d = mon - now;
  const dd = Math.floor(d / 86400000), h = Math.floor((d % 86400000) / 3600000);
  return dd > 0 ? `${dd}g ${h}h` : `${h}h`;
}

const CHALLENGE_ICONS = {
  km:       'assets/ui/sfide/km.webp',
  arena:    'assets/ui/sfide/arena.webp',
  minigame: 'assets/ui/sfide/taverna.webp',
  sell:     'assets/ui/sfide/contrabbando.webp',
  chest:    'assets/ui/sfide/scrigno.webp',
  dungeon:  'assets/ui/sfide/dungeon.webp',
  bisca:    'assets/ui/sfide/bisca.webp',
  scalata:  'assets/ui/sfide/scalata.webp',
};

function renderChallengeList(panel, list, claimFn, bonusObj, bonusClaimed, countdown) {
  list.forEach((ch, i) => {
    const done = ch.progress >= ch.target;
    const row = el('div', 'challenge-row' + (ch.claimed ? ' ch-claimed' : done ? ' ch-completable' : ''));
    const pct = Math.min(100, Math.round(ch.progress / ch.target * 100));
    const progTxt = ch.type === 'km'
      ? `${Math.min(ch.progress, ch.target).toFixed(1)} / ${ch.target} km`
      : `${Math.min(Math.round(ch.progress), ch.target)} / ${ch.target}`;
    const _ci = CHALLENGE_ICONS[ch.type];
    const iconHtml = _ci
      ? `<img class="challenge-icon" src="${_ci}" onerror="this.outerHTML='<span class=\\'challenge-icon\\'>${ch.icon}</span>'" alt="">`
      : `<span class="challenge-icon">${ch.icon}</span>`;
    row.innerHTML = `
      <div class="challenge-head">
        ${iconHtml}
        <div class="challenge-mid">
          <span class="challenge-label">${esc(ch.label)}</span>
          <span class="challenge-rew muted small">🪙 ${ch.reward.gold} &nbsp;⭐ ${ch.reward.xp} XP</span>
        </div>
        ${ch.claimed ? '<span class="challenge-check">✓</span>' : ''}
      </div>
      <div class="membar slim">
        <div class="membar-fill ${done ? 'gold' : 'blue'}" style="width:${pct}%"></div>
        <span>${progTxt}</span>
      </div>`;
    if (done && !ch.claimed) {
      const btn = el('button', 'btn btn-primary btn-small wide', '✅ Riscuoti');
      btn.addEventListener('click', () => {
        const r = claimFn(HERO, i);
        persist(); renderHUD();
        if (r && r.ok) {
          const consNote = r.consumable ? ` · 💰 ${r.consumable.icon} ${esc(r.consumable.name)}` : '';
          toast(r.bonus
            ? `🌟 BONUS! +${r.bonus.gold + r.reward.gold}🪙 +${r.bonus.xp + r.reward.xp}⭐${consNote}`
            : `🎯 +${r.reward.gold}🪙 +${r.reward.xp}⭐${consNote}`);
          sfx('coin'); vibrate(r.bonus ? [40, 20, 40] : 30);
        } else toast(r);
        updateBadges(); setTab('train');
      });
      row.appendChild(btn);
    }
    panel.appendChild(row);
  });
  const bonusRow = el('div', 'challenge-bonus-row' + (bonusClaimed ? ' ch-claimed' : ''));
  bonusRow.innerHTML = `<span>🌟 Tutte — Bonus</span>
    <span class="muted small">+${bonusObj.gold}🪙 +${bonusObj.xp}⭐
    ${bonusClaimed ? ' · ✓ riscosso' : ''}</span>`;
  panel.appendChild(bonusRow);

  if (list.every(ch => ch.claimed) && bonusClaimed && countdown) {
    const es = el('div', 'ch-empty-state');
    es.innerHTML = `<div class="ch-empty-icon">🎉</div>
      <div class="ch-empty-text">Tutte le sfide completate!</div>
      <div class="ch-empty-countdown">Prossimo reset tra <b>${countdown}</b></div>`;
    panel.appendChild(es);
  }
}

function renderDailyChallenges(c) {
  const dc = RPG.getDailyChallenges(HERO);
  const wc = RPG.getWeeklyChallenges(HERO);
  const dailyClaimable = dc.list.filter(ch => ch.progress >= ch.target && !ch.claimed).length;
  const weeklyClaimable = wc.list.filter(ch => ch.progress >= ch.target && !ch.claimed).length;
  const totalClaimable = dailyClaimable + weeklyClaimable;

  const panel = el('div', totalClaimable ? 'panel panel-featured' : 'panel');

  /* header + badge */
  const titleRow = el('div', 'challenge-title-row');
  titleRow.innerHTML = `<h3 class="panel-title" style="margin:0">${ptIcon('assets/ui/sfide/sfide.webp', 'Sfide', '🎯')}</h3>`;
  if (totalClaimable) titleRow.appendChild(el('span', 'mg-card-badge', String(totalClaimable)));
  panel.appendChild(titleRow);

  /* tab pills */
  const tabs = el('div', 'ch-tab-row');
  [['daily', `Giornaliere${dailyClaimable ? ` (${dailyClaimable})` : ''}`],
   ['weekly', `Settimanali${weeklyClaimable ? ` (${weeklyClaimable})` : ''}`]].forEach(([key, label]) => {
    const t = el('button', 'ch-tab-pill' + (CHALLENGE_TAB === key ? ' active' : ''), label);
    t.addEventListener('click', () => { CHALLENGE_TAB = key; setTab('train'); });
    tabs.appendChild(t);
  });
  panel.appendChild(tabs);

  if (CHALLENGE_TAB === 'daily') {
    renderChallengeList(panel, dc.list, RPG.claimChallenge, RPG.DAILY_CHALLENGES_BONUS, dc.bonusClaimed, _timeUntilMidnight());
  } else {
    renderChallengeList(panel, wc.list, RPG.claimWeeklyChallenge, RPG.WEEKLY_CHALLENGES_BONUS, wc.bonusClaimed, _timeUntilMonday());
  }

  c.appendChild(panel);
}

/* ── Bacheca del Viandante ── */
const _TIER_META = {
  commissione: {
    label:'Commissione', color:'#a07840', glow:'rgba(160,120,64,.45)',
    parch:'linear-gradient(162deg,#f2e096 0%,#e8c870 22%,#d4a850 58%,#d4a848 100%)',
    ink:'#6e3e0a', seal:'radial-gradient(circle at 38% 35%,#c07820,#6a3a0a)', sealIcon:'⚜',
  },
  incarico: {
    label:'Incarico', color:'#5888c8', glow:'rgba(88,136,200,.45)',
    parch:'linear-gradient(168deg,#e8c878 0%,#d8ae58 22%,#c49038 58%,#c8a040 100%)',
    ink:'#0e2250', seal:'radial-gradient(circle at 38% 35%,#3060b0,#0e1e50)', sealIcon:'⚔',
  },
  missione: {
    label:'Missione', color:'#8858c8', glow:'rgba(136,88,200,.45)',
    parch:'linear-gradient(155deg,#d4a858 0%,#c09038 22%,#a87828 58%,#aa8028 100%)',
    ink:'#2a0848', seal:'radial-gradient(circle at 38% 35%,#8830c0,#2a0848)', sealIcon:'✦',
  },
};

/* ── Wood grain canvas for board ── */
function _bachecaRng(seed) {
  let s = Math.abs(seed) || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
function _drawBachecaWood(cvs) {
  const w = cvs.width, h = cvs.height;
  const ctx = cvs.getContext('2d');
  const rng = _bachecaRng(8317);
  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0,'#2e1508'); base.addColorStop(.35,'#241005');
  base.addColorStop(.65,'#261206'); base.addColorStop(1,'#301508');
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 10; i++) {
    const y0 = rng() * h, bh = 15 + rng() * 50;
    const bg = ctx.createLinearGradient(0, y0 - bh/2, 0, y0 + bh/2);
    const lum = 0.02 + rng() * 0.05;
    bg.addColorStop(0,'rgba(0,0,0,0)');
    bg.addColorStop(.5,`rgba(${Math.round(55+rng()*40)},${Math.round(25+rng()*18)},6,${lum})`);
    bg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, y0 - bh/2, w, bh);
  }
  for (let y = 0; y < h; y += 1.2) {
    const isLight = rng() > .45, a = .012 + rng() * .048;
    ctx.strokeStyle = isLight ? `rgba(95,52,12,${a})` : `rgba(4,1,0,${a*.8})`;
    ctx.lineWidth = .5 + rng() * 1.2; ctx.beginPath();
    let x = 0, cy = y + (rng()-.5)*2; ctx.moveTo(0, cy);
    while (x < w) { const dx = 25+rng()*55, dy=(rng()-.5)*3; ctx.quadraticCurveTo(x+dx*.45,cy+dy,x+dx,cy+(rng()-.5)*2); x+=dx; }
    ctx.stroke();
  }
  for (let i = 0; i < 25; i++) {
    const y = rng() * h;
    ctx.strokeStyle = `rgba(6,2,0,${.1+rng()*.22})`; ctx.lineWidth = .8 + rng() * 3;
    ctx.beginPath(); ctx.moveTo(0, y);
    let x = 0, cy = y;
    while (x < w) { const dx=35+rng()*75,dy=(rng()-.5)*5; ctx.quadraticCurveTo(x+dx*.4,cy+dy,x+dx,cy+(rng()-.5)*3); x+=dx; }
    ctx.stroke();
  }
  for (let i = 1; i <= 3; i++) {
    const y = Math.round(h * i / 4);
    ctx.strokeStyle='rgba(0,0,0,.28)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
  }
  const _kn = (kx, ky, r, a) => {
    const g = ctx.createRadialGradient(kx-r*.25,ky-r*.2,r*.08,kx,ky,r);
    g.addColorStop(0,`rgba(6,2,0,${a})`); g.addColorStop(.55,`rgba(12,4,0,${a*.55})`); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(kx,ky,r,r*.68,.18,0,Math.PI*2); ctx.fill();
  };
  _kn(w*.77, h*.67, 20, .18); _kn(w*.09, h*.3, 11, .13);
  const vg = ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.3,w/2,h/2,Math.max(w,h)*.75);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.55)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,w,h);
  const tg = ctx.createRadialGradient(w*.5,h*(-.1),0,w*.5,h*.4,w*.65);
  tg.addColorStop(0,'rgba(200,105,20,.09)'); tg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=tg; ctx.fillRect(0,0,w,h);
}

// sprite sheet: 7 cols × 4 rows (ritratti.webp), [col, row] per NPC
const NPC_SPRITE = {
  'Miro il Mercante':         [0,0],
  'Syl l\'Archivista':        [1,0],
  'Gareth la Guardia':        [2,0],
  'Netta la Droghiera':       [3,0],
  'Bram il Fabbro':           [4,0],
  'Rowan l\'Esploratore':     [6,0],
  'Lira la Guaritrice':       [0,1],
  'Odo il Taverniere':        [1,1],
  'Finn il Pescatore':        [2,1],
  'Tara la Tessitrice':       [3,1],
  'Dax il Contrabbandiere':   [4,1],
  'Orn il Botanico':          [6,1],
  'Petra la Contadina':       [0,2],
  'Sig il Giocoliere':        [1,2],
  'Vex lo Stregone':          [2,2],
  'Dane il Cacciatore':       [3,2],
  'Clem il Cursore':          [4,2],
  'Kira l\'Addestratrice':    [5,2],
  'Zia Marta':                [6,2],
  'Il Fantasma del Crocevia': [0,3],
  'Mab la Strega':            [1,3],
  'Hob il Goblin':            [2,3],
  'Baldo il Minatore':        [3,3],
  'Ylla la Cantora':          [4,3],
  'Il Biscazziere':           [5,3],
  'Ria la Cartografa':        [6,3],
};

function renderBacheca(c, todayKm) {
  RPG.generateDailyBoard(HERO);
  const board = HERO.board;
  if (!board) return;

  const TIER_ROT = {
    commissione: { rot: '-3.8deg', shift: '0px'  },
    incarico:    { rot:  '1.4deg', shift: '-12px' },
    missione:    { rot: '-2.1deg', shift:  '8px'  },
  };

  const outer = el('div', 'bv-board-outer');

  // Top beam
  const beam = el('div', 'bv-board-beam');
  beam.innerHTML = `
    <div class="bv-board-title">${ptIcon('assets/ui/rifugio/bacheca.webp', 'Bacheca del Viandante', '📋')}</div>
    <span class="bv-board-title-deco">✦ &ensp; Oakhaven &ensp; ✦</span>`;
  outer.appendChild(beam);

  // Wood surface
  const surface = el('div', 'bv-board-surface');
  const cvs = document.createElement('canvas');
  cvs.className = 'bv-wood-canvas';
  surface.appendChild(cvs);

  // Parchments
  const parchEl = el('div', 'bv-parchments');

  board.quests.forEach(q => {
    const claimed = board.claimed.includes(q.id);
    const done = todayKm >= q.km;
    const tm = _TIER_META[q.tier];
    const tr = TIER_ROT[q.tier] || TIER_ROT.commissione;

    const scroll = el('div', `bv-parchment ${q.tier}${claimed ? ' bv-claimed' : done ? ' bv-done' : ''}`);
    scroll.style.setProperty('--rot', tr.rot);
    scroll.style.setProperty('--shift', tr.shift);
    scroll.style.setProperty('--bq-glow', tm.glow);

    scroll.appendChild(el('div', 'bv-nail'));

    const body = el('div', 'bv-parchment-body');
    body.style.setProperty('--bq-ink', tm.ink);

    body.appendChild(el('span', 'bv-tier-badge', q.tier.toUpperCase()));

    const npcRow = el('div', 'bv-npc-row');
    const sp = NPC_SPRITE[q.npc.name];
    const avatar = el('div', 'bv-npc-avatar', sp ? '' : q.npc.icon);
    if (sp) {
      avatar.style.setProperty('--sc', sp[0]);
      avatar.style.setProperty('--sr', sp[1]);
    }
    npcRow.appendChild(avatar);
    npcRow.appendChild(el('span', 'bv-npc-name', esc(q.npc.name)));
    body.appendChild(npcRow);

    // Quest description text
    body.appendChild(el('div', 'bv-quest-preview', esc(q.text)));

    // Mini km bar
    const barWrap = el('div', 'bv-km-bar-wrap');
    const barFill = el('div', 'bv-km-bar-fill');
    barFill.style.width = claimed ? '100%' : `${Math.min(100, (todayKm / q.km) * 100).toFixed(1)}%`;
    barWrap.appendChild(barFill);
    body.appendChild(barWrap);

    scroll.appendChild(body);

    // Click → detail sheet
    scroll.addEventListener('click', () => _openBachecaDetail(q, todayKm, claimed, done, tm));

    const seal = el('div', 'bv-wax-seal', tm.sealIcon);
    seal.style.background = tm.seal;
    scroll.appendChild(seal);

    parchEl.appendChild(scroll);
  });

  surface.appendChild(parchEl);
  outer.appendChild(surface);

  const plank = el('div', 'bv-board-plank');
  plank.innerHTML = '<span class="bv-footer-text">✦ &ensp; Le missioni si rinnovano ogni notte &ensp; ✦</span>';
  outer.appendChild(plank);

  c.appendChild(outer);

  requestAnimationFrame(() => {
    cvs.width = surface.offsetWidth;
    cvs.height = surface.offsetHeight;
    if (cvs.width > 0 && cvs.height > 0) _drawBachecaWood(cvs);
  });
}

function _openBachecaDetail(q, todayKm, claimed, done, tm) {
  const overlay = el('div', 'bv-detail-overlay');
  const sheet = el('div', `bv-detail-sheet ${q.tier}`);

  // Chiodo in cima
  const nail = el('div', 'bv-detail-nail');
  nail.appendChild(el('span', ''));
  sheet.appendChild(nail);

  const closeBtn = el('button', 'bv-detail-close', '✕');
  closeBtn.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  sheet.appendChild(closeBtn);

  // Badge
  sheet.appendChild(el('span', 'bv-tier-badge', q.tier.toUpperCase()));

  // NPC row — avatar grande per il detail
  const npcRow = el('div', 'bv-npc-row');
  const sp = NPC_SPRITE[q.npc.name];
  const av = el('div', 'bv-detail-avatar', sp ? '' : q.npc.icon);
  if (sp) { av.style.setProperty('--sc', sp[0]); av.style.setProperty('--sr', sp[1]); }
  npcRow.appendChild(av);
  npcRow.appendChild(el('span', 'bv-detail-npc-name', esc(q.npc.name)));
  sheet.appendChild(npcRow);

  const rule = document.createElement('hr');
  rule.className = 'bv-parch-rule';
  sheet.appendChild(rule);

  sheet.appendChild(el('p', 'bv-quest-text', q.text));

  // KM dots
  const kmTarget = el('div', 'bv-km-target');
  const dotRow = el('div', 'bv-km-dot-row');
  const filledCount = claimed ? q.km : Math.round(Math.min(1, todayKm / q.km) * q.km);
  for (let i = 0; i < q.km; i++) {
    dotRow.appendChild(el('div', `bv-km-dot${i < filledCount ? ' filled' : ''}`));
  }
  kmTarget.appendChild(dotRow);
  kmTarget.appendChild(el('span', 'bv-km-text',
    claimed ? `✓ ${q.km} km` : `${Math.min(todayKm, q.km).toFixed(1)} / ${q.km} km`));
  sheet.appendChild(kmTarget);

  // Rewards
  const { reward } = q;
  const rr = el('div', 'bv-reward-row');
  if (reward.gold)  rr.appendChild(el('span', 'bv-rchip gold',  `🪙 ${reward.gold}`));
  if (reward.xp)    rr.appendChild(el('span', 'bv-rchip xp',    `⭐ ${reward.xp} XP`));
  if (reward.wood)  rr.appendChild(el('span', 'bv-rchip wood',  `🌲 ${reward.wood}`));
  if (reward.stone) rr.appendChild(el('span', 'bv-rchip stone', `⛏️ ${reward.stone}`));
  if (reward.consumable) {
    const ci = RPG.consumableById(reward.consumable);
    if (ci) rr.appendChild(el('span', 'bv-rchip item', `${ci.icon} ${esc(ci.name)}`));
  }
  sheet.appendChild(rr);

  if (done && !claimed) {
    const btn = el('button', 'btn btn-primary bv-claim-btn', '⚔️ Riscuoti');
    btn.style.setProperty('--bq-glow', tm.glow);
    btn.addEventListener('click', () => {
      const err = RPG.claimBoardReward(HERO, q.id);
      if (err) { toast(err); overlay.remove(); return; }
      persist(); renderHUD();
      const parts = [];
      if (reward.gold)  parts.push(`🪙 +${reward.gold}`);
      if (reward.xp)    parts.push(`⭐ +${reward.xp} XP`);
      if (reward.wood)  parts.push(`🌲 +${reward.wood}`);
      if (reward.stone) parts.push(`⛏️ +${reward.stone}`);
      if (reward.consumable) { const ci = RPG.consumableById(reward.consumable); if (ci) parts.push(`${ci.icon} ${ci.name}`); }
      toast(`${q.npc.icon} Missione di ${q.npc.name} completata! ${parts.join(' · ')}`);
      vibrate([60, 40, 100]);
      overlay.remove();
      setTab('train');
    });
    sheet.appendChild(btn);
  } else if (claimed) {
    sheet.appendChild(el('p', 'bv-km-text', '✓ Missione già riscattata'));
  }

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}

/* Banner sincronizzazione automatica nativa (HealthKit / Health Connect).
   Riutilizzato in Allenati e in Impostazioni → Sincronizzazione Salute.
   onRefresh: callback per ridisegnare la view chiamante dopo un cambio stato. */
function renderNativeHealthBanner(onRefresh) {
  if (!nativeHealthPlugin()) return null;
  const nh = el('div', 'native-health-banner' + (HERO.nativeHealthSync ? ' active' : ''));
  if (HERO.nativeHealthSync) {
    nh.innerHTML = `<span class="nh-icon">✅</span>
      <div class="nh-body">
        <div class="nh-title">Sincronizzazione automatica attiva</div>
        <div class="nh-sub">Passi e km si aggiornano da soli ad ogni apertura dell'app</div>
      </div>
      <button class="nh-toggle">Disattiva</button>`;
    nh.querySelector('.nh-toggle').addEventListener('click', () => {
      disableNativeHealthSync();
      toast('Sincronizzazione automatica disattivata.');
      onRefresh();
    });
  } else {
    nh.innerHTML = `<span class="nh-icon">🔗</span>
      <div class="nh-body">
        <div class="nh-title">Attiva la sincronizzazione automatica</div>
        <div class="nh-sub">Niente più copia-incolla: i tuoi passi si registrano da soli</div>
      </div>
      <button class="nh-toggle nh-toggle-primary">Attiva</button>`;
    nh.querySelector('.nh-toggle').addEventListener('click', async () => {
      const btn = nh.querySelector('.nh-toggle');
      btn.disabled = true; btn.textContent = '…';
      const ok = await enableNativeHealthSync();
      if (ok) { toast('✅ Sincronizzazione automatica attivata!'); onRefresh(); }
      else { btn.disabled = false; btn.textContent = 'Attiva'; }
    });
  }
  return nh;
}

