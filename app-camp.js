/* ── TAB: Rifugio ── */
let CAMP_VIEW = 'main';

function getCampTimePhase() {
  const now  = new Date();
  const t    = now.getHours() + now.getMinutes() / 60;
  if (t >= 5.5 && t < 8)    return 'dawn';
  if (t >= 8   && t < 18)   return 'day';
  if (t >= 18  && t < 20.5) return 'dusk';
  return 'night';
}

function drawCampStars(canvas, phase) {
  const w = canvas.offsetWidth, h = canvas.offsetHeight;
  if (!w || !h) return;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  if (phase === 'day') return;
  const alpha = phase === 'night' ? 1 : phase === 'dawn' ? 0.5 : 0.25;
  const count = phase === 'night' ? 90 : 30;
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h * 0.62;
    const r = Math.random() * 1.3 + 0.3;
    ctx.globalAlpha = (Math.random() * 0.55 + 0.45) * alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function showResizeBubble(elem, key, panorama, baseZ, baseWidth) {
  document.querySelectorAll('.camp-resize-bubble').forEach(b => b.remove());

  const bubble = document.createElement('div');
  bubble.className = 'camp-resize-bubble';

  function getW() { return parseFloat(elem.style.width) || baseWidth || 15; }
  function applyWidth(newW) {
    newW = Math.max(5, Math.min(55, newW));
    elem.style.width = newW + '%';
    lbl.textContent = Math.round(newW) + '%';
    HERO.campLayout = HERO.campLayout || {};
    HERO.campLayout[key] = {
      left:   parseFloat(elem.style.left)   || 0,
      bottom: parseFloat(elem.style.bottom) || 0,
      width:  newW
    };
    persist();
  }

  const minusBtn = document.createElement('button');
  minusBtn.className = 'crb-btn';
  minusBtn.textContent = '−';
  minusBtn.addEventListener('click', e => { e.stopPropagation(); applyWidth(getW() - 3); });

  const lbl = document.createElement('span');
  lbl.className = 'crb-label';
  lbl.textContent = Math.round(getW()) + '%';

  const plusBtn = document.createElement('button');
  plusBtn.className = 'crb-btn';
  plusBtn.textContent = '+';
  plusBtn.addEventListener('click', e => { e.stopPropagation(); applyWidth(getW() + 3); });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'crb-close';
  closeBtn.textContent = '✓';
  closeBtn.addEventListener('click', e => { e.stopPropagation(); bubble.remove(); });

  bubble.append(minusBtn, lbl, plusBtn, closeBtn);

  const eRect = elem.getBoundingClientRect();
  const pRect = panorama.getBoundingClientRect();
  const bLeft = Math.max(4, Math.min(eRect.left - pRect.left + eRect.width / 2 - 80, pRect.width - 170));
  const bTop  = Math.max(4, eRect.top - pRect.top - 50);
  bubble.style.cssText = `position:absolute;left:${bLeft}px;top:${bTop}px;z-index:50`;

  panorama.appendChild(bubble);

  const dismiss = e => {
    if (!bubble.contains(e.target) && e.target !== elem) {
      bubble.remove();
      document.removeEventListener('touchstart', dismiss);
      document.removeEventListener('mousedown', dismiss);
    }
  };
  setTimeout(() => {
    document.addEventListener('touchstart', dismiss, { passive: true });
    document.addEventListener('mousedown', dismiss);
  }, 0);
}

function makeCampLayerDraggable(elem, key, panorama, baseZ, baseWidth) {
  elem.classList.add('camp-layer-draggable');
  let dragging = false, pinching = false, hasMoved = false;
  let startCX, startCY, startL, startB, startPinchDist, startWidth;

  function getW() { return parseFloat(elem.style.width) || baseWidth || 15; }

  function beginDrag(cx, cy) {
    dragging = true; hasMoved = false;
    startCX = cx; startCY = cy;
    startL  = parseFloat(elem.style.left)   || 0;
    startB  = parseFloat(elem.style.bottom) || 0;
    elem.style.zIndex = 99;
    elem.classList.add('camp-drag-active');
  }
  function moveDrag(cx, cy) {
    if (!dragging) return;
    const dx = cx - startCX, dy = cy - startCY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved = true;
    const r = panorama.getBoundingClientRect();
    elem.style.left   = Math.max(0, Math.min(90, startL + dx / r.width  * 100)) + '%';
    elem.style.bottom = Math.max(0, Math.min(80, startB - dy / r.height * 100)) + '%';
  }

  function beginPinch(t0, t1) {
    pinching = true; dragging = false; hasMoved = true;
    startPinchDist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
    startWidth = getW();
    startCX = (t0.clientX + t1.clientX) / 2;
    startCY = (t0.clientY + t1.clientY) / 2;
    startL  = parseFloat(elem.style.left)   || 0;
    startB  = parseFloat(elem.style.bottom) || 0;
    elem.style.zIndex = 99;
    elem.classList.add('camp-drag-active');
  }
  function movePinch(t0, t1) {
    if (!pinching) return;
    const dist  = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
    const scale = dist / (startPinchDist || 1);
    const newW  = Math.max(5, Math.min(55, startWidth * scale));
    const cx    = (t0.clientX + t1.clientX) / 2;
    const cy    = (t0.clientY + t1.clientY) / 2;
    const r     = panorama.getBoundingClientRect();
    elem.style.width  = newW + '%';
    elem.style.left   = Math.max(0, Math.min(90, startL + (cx - startCX) / r.width  * 100)) + '%';
    elem.style.bottom = Math.max(0, Math.min(80, startB - (cy - startCY) / r.height * 100)) + '%';
  }

  function endAll() {
    if (!dragging && !pinching) return;
    const wasDragging = dragging, didMove = hasMoved;
    dragging = false; pinching = false; hasMoved = false;
    elem.style.zIndex = baseZ;
    elem.classList.remove('camp-drag-active');
    if (wasDragging && !didMove) {
      showResizeBubble(elem, key, panorama, baseZ, baseWidth);
      return;
    }
    HERO.campLayout = HERO.campLayout || {};
    HERO.campLayout[key] = {
      left:   parseFloat(elem.style.left),
      bottom: parseFloat(elem.style.bottom),
      width:  parseFloat(elem.style.width) || baseWidth
    };
    persist();
  }

  // Touch
  elem.addEventListener('touchstart', e => {
    e.stopPropagation();
    if (e.touches.length === 2) beginPinch(e.touches[0], e.touches[1]);
    else if (e.touches.length === 1) beginDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  elem.addEventListener('touchmove', e => {
    if (!dragging && !pinching) return;
    e.preventDefault(); e.stopPropagation();
    if (e.touches.length === 2 && pinching) movePinch(e.touches[0], e.touches[1]);
    else if (e.touches.length === 1 && dragging) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  elem.addEventListener('touchend',    () => endAll(), { passive: true });
  elem.addEventListener('touchcancel', () => endAll(), { passive: true });

  // Mouse (desktop)
  elem.addEventListener('mousedown', e => {
    e.preventDefault();
    beginDrag(e.clientX, e.clientY);
    const mm = e2 => moveDrag(e2.clientX, e2.clientY);
    const mu = () => { endAll(); document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  });
}

function renderCamp(c) {
  if (CAMP_VIEW === 'santuario')   { renderSantuarioView(c);   return; }
  if (CAMP_VIEW === 'strutture')   { renderStruttureView(c);   return; }
  if (CAMP_VIEW === 'arredamento') { renderArredamentoView(c); return; }
  if (CAMP_VIEW === 'serra')       { renderSerraView(c);       return; }
  if (CAMP_VIEW === 'seasonpass')  { renderSeasonPassView(c);  return; }

  /* ── Panorama scena campo con ciclo giorno/notte ── */
  const phase       = getCampTimePhase();
  const campLevel   = HERO.level || 1;
  const stageIdx    = RPG.campStageForLevel(campLevel);
  const stageLabel  = RPG.CAMP_STAGES[stageIdx]?.label || 'Accampamento';
  const layers      = RPG.campUnlockedLayers(HERO);
  const mount       = HERO.mount ? RPG.mountById(HERO.mount) : null;
  const petSpeciesInfo = HERO.pet ? RPG.PET_SPECIES[HERO.pet.species] : null;
  const isNightTime = phase === 'night' || phase === 'dusk';

  const panorama = el('div', 'camp-panorama');
  panorama.dataset.phase = phase;
  panorama.dataset.stage = stageIdx;

  // 1. Sky gradient — fallback visibile solo se bg non carica (z:1)
  panorama.appendChild(el('div', 'camp-sky'));

  // 2. Stelle (z:2)
  const starsCanvas = document.createElement('canvas');
  starsCanvas.className = 'camp-stars';
  panorama.appendChild(starsCanvas);

  // 3. Background stage — <img> object-fit:cover, no inset shorthand (compatibilità iOS Safari < 14.5)
  const bgImg = document.createElement('img');
  bgImg.className = 'camp-bg-stage-img';
  bgImg.src = `assets/rifugio/scene/bg_stage${stageIdx}.webp`;
  bgImg.alt = '';
  bgImg.style.cssText = 'position:absolute;top:0;right:0;bottom:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center center;display:block;z-index:3';
  panorama.appendChild(bgImg);

  // 4. Night veil overlay (z:5)
  panorama.appendChild(el('div', 'camp-night-veil'));

  // 5. Layer PNG da CAMP_LAYERS (ordinati per z)
  const sortedLayers = [...layers].sort((a, b) => a.z - b.z);
  for (const layer of sortedLayers) {
    if (layer.id === 'campfire') {
      // Campfire: prova PNG, fallback SVG animato inline
      const cfWrap = el('div', 'camp-layer camp-campfire-wrap camp-layer-appear');
      const cfSv = HERO.campLayout?.campfire;
      const cfL  = cfSv ? cfSv.left   : layer.left;
      const cfB  = cfSv ? cfSv.bottom : layer.bottom;
      const cfW  = cfSv ? cfSv.width  : layer.width;
      cfWrap.style.cssText = `left:${cfL}%;bottom:${cfB}%;width:${cfW}%;z-index:${layer.z}`;
      const cfImg = document.createElement('img');
      cfImg.className = 'camp-campfire-img';
      cfImg.src = `assets/rifugio/scene/campfire_${isNightTime ? 'night' : 'day'}.webp`;
      cfImg.alt = '';
      cfImg.onerror = () => {
        cfImg.remove();
        cfWrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" style="width:100%;height:auto;display:block;overflow:visible">
          <defs><radialGradient id="fg1" cx="50%" cy="85%" r="55%"><stop offset="0%" stop-color="#ff7700" stop-opacity=".5"/><stop offset="100%" stop-color="#ff4400" stop-opacity="0"/></radialGradient></defs>
          <ellipse cx="50" cy="105" rx="42" ry="10" fill="url(#fg1)"/>
          <rect x="16" y="90" width="68" height="11" rx="5.5" fill="#3b1e05" transform="rotate(-14 50 95)"/>
          <rect x="16" y="90" width="68" height="11" rx="5.5" fill="#4a2608" transform="rotate(14 50 95)"/>
          <ellipse cx="28" cy="97" rx="8" ry="6" fill="#2e2926"/><ellipse cx="72" cy="97" rx="8" ry="6" fill="#2e2926"/>
          <ellipse cx="50" cy="101" rx="8" ry="5" fill="#242120"/>
          <path d="M50,84 C36,76 28,56 36,40 C39,52 43,53 46,46 C48,38 44,25 50,12 C56,25 52,38 54,46 C57,53 61,52 64,40 C72,56 64,76 50,84Z" fill="#e85000" opacity=".85"><animateTransform attributeName="transform" type="scale" values="1,1;.96,1.05;1.02,.98;1,1" dur="1.3s" repeatCount="indefinite" additive="sum" transformOrigin="50 84"/><animateTransform attributeName="transform" type="translate" values="0,0;1.5,-2;-1,-1;0,0" dur=".95s" repeatCount="indefinite" additive="sum"/></path>
          <path d="M50,78 C40,70 35,54 41,42 C43,51 46,52 47.5,46 C49,40 47,30 50,20 C53,30 51,40 52.5,46 C54,52 57,51 59,42 C65,54 60,70 50,78Z" fill="#ff7700"><animateTransform attributeName="transform" type="scale" values="1,1;.93,1.07;1.03,.97;1,1" dur="1.0s" repeatCount="indefinite" additive="sum" transformOrigin="50 78"/><animateTransform attributeName="transform" type="translate" values="0,0;-1.5,-2;1,-1;0,0" dur=".8s" repeatCount="indefinite" additive="sum"/></path>
          <path d="M50,70 C43,63 40,51 44,42 C45.5,49 47,50 48,46 C49,41 47.5,34 50,26 C52.5,34 51,41 52,46 C53,50 54.5,49 56,42 C60,51 57,63 50,70Z" fill="#ffa020"><animateTransform attributeName="transform" type="scale" values="1,1;.94,1.07;1,1" dur=".85s" repeatCount="indefinite" additive="sum" transformOrigin="50 70"/></path>
          <path d="M50,62 C45,57 43,48 46,41 C47,47 48,48 49,45 C49.5,41 48.5,35 50,29 C51.5,35 50.5,41 51,45 C52,48 53,47 54,41 C57,48 55,57 50,62Z" fill="#ffcc30"><animateTransform attributeName="transform" type="scale" values="1,1;.95,1.08;1,1" dur=".7s" repeatCount="indefinite" additive="sum" transformOrigin="50 62"/></path>
          <circle cx="43" cy="50" r="1.5" fill="#ffe060" opacity="0"><animate attributeName="cy" values="88;22" dur="2.2s" repeatCount="indefinite"/><animate attributeName="cx" values="43;39;43" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.9;.9;0" dur="2.2s" repeatCount="indefinite"/></circle>
          <circle cx="57" cy="50" r="1" fill="#ffaa30" opacity="0"><animate attributeName="cy" values="85;18" dur="1.8s" begin=".6s" repeatCount="indefinite"/><animate attributeName="cx" values="57;61;57" dur="1.8s" begin=".6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.8;.8;0" dur="1.8s" begin=".6s" repeatCount="indefinite"/></circle>
        </svg>`;
      };
      cfWrap.appendChild(cfImg);
      panorama.appendChild(cfWrap);
      makeCampLayerDraggable(cfWrap, 'campfire', panorama, layer.z, layer.width);
    } else {
      const img = el('img', 'camp-layer camp-layer-appear');
      img.loading = 'eager';
      img.src = `assets/rifugio/scene/${layer.id}.webp`;
      img.alt = '';
      const sv = HERO.campLayout?.[layer.id];
      const lL = sv ? sv.left   : layer.left;
      const lB = sv ? sv.bottom : layer.bottom;
      const lW = sv ? sv.width  : layer.width;
      img.style.cssText = `left:${lL}%;bottom:${lB}%;width:${lW}%;z-index:${layer.z}`;
      img.onerror = () => img.remove();
      makeCampLayerDraggable(img, layer.id, panorama, layer.z, layer.width);
      panorama.appendChild(img);
    }
  }

  // 6. Cavalcatura — zona dedicata per stage, sempre in primo piano (z:21)
  if (mount) {
    const mountWidths = [11, 14, 16, 18, 20];
    const mountLeft   = [75, 57, 62, 62, 62];
    const mw = mountWidths[stageIdx] ?? 14;
    const ml = mountLeft[stageIdx] ?? 62;
    const mSv = HERO.campLayout?.mount;
    const mL  = mSv ? mSv.left   : ml;
    const mB  = mSv ? mSv.bottom : 5;
    const mW  = mSv ? mSv.width  : mw;
    const mountLayer = el('img', 'camp-layer camp-mount-layer camp-layer-appear');
    mountLayer.loading = 'eager';
    mountLayer.src = mount.img;
    mountLayer.alt = mount.name || '';
    mountLayer.style.cssText = `left:${mL}%;bottom:${mB}%;width:${mW}%;z-index:21`;
    mountLayer.title = mount.name || '';
    mountLayer.onerror = () => {
      mountLayer.remove();
      const mountEmoji = el('div', 'camp-layer camp-mount-emoji');
      mountEmoji.textContent = mount.emoji || '🐴';
      mountEmoji.style.cssText = `left:${mL}%;bottom:${mB}%;width:${Math.round(mW*0.6)}%;z-index:21;font-size:clamp(1.2rem,4vw,2rem);display:flex;align-items:flex-end;justify-content:center`;
      panorama.appendChild(mountEmoji);
    };
    makeCampLayerDraggable(mountLayer, 'mount', panorama, 21, mw);
    panorama.appendChild(mountLayer);
  }

  // 7. Layer notturni (luna + fire_glow) — solo dusk/night
  if (isNightTime) {
    for (const nl of RPG.CAMP_NIGHT_LAYERS) {
      const nImg = el('img', 'camp-layer camp-night-layer camp-layer-appear');
      nImg.loading = 'eager';
      nImg.src = `assets/rifugio/scene/${nl.id}.webp`;
      nImg.alt = '';
      nImg.style.cssText = `left:${nl.left}%;bottom:${nl.bottom}%;width:${nl.width}%;z-index:${nl.z}`;
      nImg.onerror = () => nImg.remove();
      panorama.appendChild(nImg);
    }
    // Lucciole CSS (solo notte piena)
    if (phase === 'night') {
      [[22,55],[45,42],[68,60],[35,70],[80,48],[12,65],[58,35]].forEach(([x,y], i) => {
        const ff = el('div', 'camp-firefly');
        ff.style.cssText = `left:${x}%;top:${y}%;--ff-delay:${(i*0.6).toFixed(1)}s;--ff-dx:${(Math.random()*12-6).toFixed(1)}%;--ff-dy:${(Math.random()*8-4).toFixed(1)}%`;
        panorama.appendChild(ff);
      });
    }
  }

  // 8. Famiglio thumbnail (trascinabile come gli altri layer)
  if (HERO.companion && HERO.pet && HERO.pet.hatched) {
    const pSv = HERO.campLayout?.pet;
    const pL  = pSv ? pSv.left   : 2;
    const pB  = pSv ? pSv.bottom : 5;
    const pW  = pSv ? pSv.width  : 16;
    const petLayer = el('img', 'camp-layer camp-pet-layer camp-layer-appear');
    petLayer.loading = 'eager';
    petLayer.src = petImageSrc(HERO.pet);
    petLayer.alt = HERO.pet.name || '';
    petLayer.style.cssText = `left:${pL}%;bottom:${pB}%;width:${pW}%;z-index:18`;
    petLayer.onerror = () => {
      petLayer.remove();
      const petEmoji = el('div', 'camp-layer camp-pet-emoji');
      petEmoji.textContent = petSpeciesInfo ? petSpeciesInfo.icon : '🐺';
      petEmoji.style.cssText = `left:${pL}%;bottom:${pB}%;width:10%;z-index:18;font-size:clamp(1rem,3.5vw,1.8rem);display:flex;align-items:flex-end;justify-content:center`;
      panorama.appendChild(petEmoji);
    };
    makeCampLayerDraggable(petLayer, 'pet', panorama, 18, 16);
    panorama.appendChild(petLayer);
  }

  // 9. Overlay badge: meteo (basso sx) + fase (basso dx)
  const wx = RPG.getDailyWeather();
  const wxBadge = el('div', 'camp-overlay-badge camp-wx-badge');
  wxBadge.innerHTML = `${wx.icon} <span>${wx.label}</span>${wx.xpBonus > 0 ? ` <b class="camp-xp-bonus">+${Math.round(wx.xpBonus*100)}%</b>` : ''}`;
  panorama.appendChild(wxBadge);

  const phaseLabels = { dawn:'🌤️ Alba', day:'☀️ Giorno', dusk:'🟠 Tramonto', night:'🌙 Notte' };
  const phaseBadge = el('div', 'camp-overlay-badge camp-phase-badge');
  phaseBadge.textContent = phaseLabels[phase] || '';
  panorama.appendChild(phaseBadge);

  // 10. Stage label (alto sx)
  const stageBadge = el('div', 'camp-stage-label');
  stageBadge.textContent = `${stageLabel} · Lv.${campLevel}`;
  panorama.appendChild(stageBadge);

  c.appendChild(panorama);

  /* ── Missione guidata "Il Primo Passo" ── */
  if (!HERO.firstQuestComplete) {
    const seenTabs = HERO.seenTabs || [];
    const hasLog = HERO.log && HERO.log.length > 0;
    const seenMap = seenTabs.includes('map');
    const seenMarket = seenTabs.includes('market');
    const steps = [
      { done: true,      icon: '🎮', label: 'Entra nel gioco' },
      { done: hasLog,    icon: '🥾', label: 'Registra il primo allenamento', action: () => setTab('train') },
      { done: seenMap,   icon: '🗺️', label: 'Esplora la Mappa',             action: () => setTab('map') },
      { done: seenMarket,icon: '🏘️', label: 'Visita il Borgo',              action: () => setTab('market') },
    ];
    const allDone = steps.every(s => s.done);
    if (allDone) {
      /* Completa la missione una sola volta */
      HERO.firstQuestComplete = true;
      HERO.gold = (HERO.gold || 0) + 150;
      RPG.applyXp(HERO, 100);
      persist();
      toast('🏅 Missione completata! +150 🪙 +100 XP');
    } else {
      const ob = el('div', 'panel first-quest-panel');
      const stepsHtml = steps.map((s, i) => `
        <div class="fq-step ${s.done ? 'fq-done' : ''}" data-step="${i}">
          <span class="fq-step-icon">${s.done ? '✅' : s.icon}</span>
          <span class="fq-step-label">${s.label}</span>
          ${!s.done && s.action ? '<span class="fq-step-arrow">›</span>' : ''}
        </div>`).join('');
      ob.innerHTML = `
        <div class="fq-header"><span class="fq-badge">Missione guidata</span><span class="fq-title">Il Primo Passo</span></div>
        <div class="fq-steps">${stepsHtml}</div>
        <div class="fq-reward">🏅 Ricompensa: 150 🪙 + 100 XP</div>`;
      steps.forEach((s, i) => {
        if (!s.done && s.action) {
          ob.querySelector(`[data-step="${i}"]`).addEventListener('click', s.action);
        }
      });
      c.appendChild(ob);
    }
  }

  // Hint drag + reset layout
  const hasCustomLayout = HERO.campLayout && Object.keys(HERO.campLayout).length > 0;
  const layoutBar = el('div', 'camp-layout-bar');
  layoutBar.innerHTML = hasCustomLayout
    ? `<span class="camp-layout-hint">✋ Trascina · 👆 Tocca per ridimensionare</span><button class="btn btn-small camp-layout-reset">↺ Reset</button>`
    : `<span class="camp-layout-hint">✋ Trascina · 👆 Tocca per ridimensionare</span>`;
  const resetBtn = layoutBar.querySelector('.camp-layout-reset');
  if (resetBtn) resetBtn.addEventListener('click', () => { delete HERO.campLayout; persist(); setTab('camp'); });
  c.appendChild(layoutBar);

  // Disegna stelle dopo che il canvas è nel DOM
  requestAnimationFrame(() => drawCampStars(starsCanvas, phase));

  // Stagione corrente — chip in alto a destra nel panorama
  const season = RPG.currentSeason();
  const seasonEl = el('div', 'camp-season-chip');
  seasonEl.innerHTML = `${season.icon} <b>${season.name}</b>`;
  seasonEl.style.setProperty('--season-color', season.color);
  seasonEl.addEventListener('click', () => showSeasonModal());
  panorama.appendChild(seasonEl);


  // ── Pass Stagionale — banner di accesso ──
  {
    const spStatus = RPG.seasonPassStatus(HERO);
    const spPct = Math.round(spStatus.pointsInLevel / (spStatus.pointsForNext || RPG.SEASON_PASS.pointsPerLevel) * 100);
    const spBanner = el('div', 'panel borgo-entry-panel season-pass-banner');
    spBanner.style.cssText = 'cursor:pointer;background:linear-gradient(135deg,#3A1208 0%,#1E0C04 50%,#2A1A08 100%);border:1px solid #6A3A18;position:relative;overflow:hidden';
    spBanner.innerHTML = `
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 20% 50%,rgba(200,148,58,.15) 0%,transparent 60%);pointer-events:none"></div>
      <div style="display:flex;align-items:center;gap:14px;padding:14px 16px">
        <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#C8943A,#8B1F1F);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 14px rgba(200,148,58,.45);overflow:hidden">
          <img src="assets/seasonpass/logo.webp" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.replaceWith(Object.assign(document.createElement('span'),{style:'font-size:1.5rem',textContent:'☀️'}))">
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:.62rem;text-transform:uppercase;letter-spacing:.12em;color:#C8943A;margin-bottom:2px">Pass Stagionale · Lv ${spStatus.level}/${spStatus.maxLevel}</div>
          <div style="font-size:.97rem;font-weight:700;color:#FDEDC0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(RPG.SEASON_PASS.name)}</div>
          <div style="height:5px;background:#2A1808;border-radius:99px;overflow:hidden;margin-top:5px">
            <div style="height:100%;width:${spPct}%;background:linear-gradient(90deg,#C8943A,#E8C050);border-radius:99px"></div>
          </div>
        </div>
        <div style="font-size:.75rem;color:#C8943A;font-weight:600;flex-shrink:0">Apri ›</div>
      </div>`;
    spBanner.addEventListener('click', () => { CAMP_VIEW = 'seasonpass'; setTab('camp'); });
    c.appendChild(spBanner);
  }

  /* Step 11: dopo Mappa → invita alla Serra */
  renderOnboardingBanner(c, {
    step: 11, icon: '🌱',
    title: 'Coltiva il tuo Rifugio!',
    desc: 'La Serra del Viandante ti permette di coltivare erbe e semi per creare pozioni rare. Aprila e pianta qualcosa!',
    actionLabel: 'Vai alla Serra',
    onAction: () => { advanceOnboarding(11); CAMP_VIEW = 'serra'; setTab('camp'); }
  });

  /* Step 12: dopo Serra → invita alla Bacheca del Viandante */
  renderOnboardingBanner(c, {
    step: 12, icon: '📜',
    title: 'Missioni giornaliere!',
    desc: 'La Bacheca del Viandante si rinnova ogni giorno — completa sfide fisiche e riscuoti ricompense in oro e oggetti rari.',
    actionLabel: 'Scorri le missioni',
    onAction: () => advanceOnboarding(12)
  });

  /* Step 13: dopo Bacheca → invita al Famiglio */
  renderOnboardingBanner(c, {
    step: 13, icon: '🐾',
    title: 'Adotta un Famiglio!',
    desc: 'Il Santuario dei Famigli ti aspetta. Schiudi il tuo uovo e prenditi cura del tuo compagno per bonus esclusivi!',
    actionLabel: 'Visita il Santuario',
    onAction: () => { advanceOnboarding(13); CAMP_VIEW = 'santuario'; setTab('camp'); }
  });

  /* Step 15: dopo Boss Settimanale → Pass Stagionale */
  renderOnboardingBanner(c, {
    step: 15, icon: '🌞',
    title: 'La Stagione del Sole Ardente!',
    desc: 'Ogni km percorso ti guadagna punti stagionali. Sali di livello nel Pass Stagionale per sbloccare ricompense, cosmetici e la cavalcatura esclusiva.',
    actionLabel: 'Apri il Pass',
    onAction: () => { advanceOnboarding(15); CAMP_VIEW = 'seasonpass'; setTab('camp'); }
  });

  // Prima missione — visibile solo finché totalKm === 0
  if ((HERO.totalKm || 0) === 0) {
    const fp = el('div', 'panel camp-first-quest');
    fp.innerHTML = `
      <div class="cfq-eyebrow">✦ Prima Missione</div>
      <div class="cfq-title">Muovi il primo passo</div>
      <p class="muted small cfq-text">Il tuo Rifugio prende vita con ogni km che percorri. Registra la tua prima attività e guarda cosa succede.</p>
      <div class="cfq-rewards">
        <span class="cfq-reward">🪙 Oro</span>
        <span class="cfq-reward">⚔️ XP</span>
        <span class="cfq-reward">🎁 Forziere</span>
      </div>`;
    const goBtn = el('button', 'btn btn-primary wide', '⚔️ Vai ad Allenarti');
    goBtn.addEventListener('click', () => setTab('train'));
    fp.appendChild(goBtn);
    c.appendChild(fp);
  }


  // Santuario dei Famigli
  if (HERO.companion && HERO.pet && !HERO.pet.hatched) {
    const egg = RPG.eggProgress(HERO);
    const sp = el('div', 'panel borgo-entry-panel santuario-teaser');
    const sanctHdr0 = document.createElement('img'); sanctHdr0.src = 'assets/ui/santuario-famigli.webp'; sanctHdr0.alt = ''; sanctHdr0.className = 'borgo-entry-header'; sanctHdr0.onerror = () => sanctHdr0.remove(); sp.appendChild(sanctHdr0);
    sp.appendChild(el('h3', 'panel-title', '🥚 Uovo Misterioso'));
    const thumb = el('img', 'pet-thumb' + (egg.ready ? ' egg-shake' : ''));
    thumb.src = petImageSrc(HERO.pet);
    thumb.onerror = () => { thumb.style.display = 'none'; };
    sp.appendChild(thumb);
    sp.appendChild(el('div', 'membar slim', `<div class="membar-fill gold" style="width:${egg.pct}%"></div><span>${egg.km.toFixed(1)} / ${egg.needed} km</span>`));
    sp.appendChild(el('p', 'muted small center',
      egg.ready ? '✨ È pronto per schiudersi!' : 'Si scalda un passo alla volta...'));
    const enterBtn = el('button', 'btn btn-primary wide', egg.ready ? '🥚 Guarda l\'uovo' : 'Osserva l\'uovo');
    enterBtn.addEventListener('click', () => { CAMP_VIEW = 'santuario'; setTab('camp'); });
    sp.appendChild(enterBtn);
    c.appendChild(sp);
  } else if (HERO.companion && HERO.pet) {
    RPG.tickPet(HERO); persist();
    const p = HERO.pet;
    const sp = el('div', 'panel borgo-entry-panel santuario-teaser');
    const sanctHdr1 = document.createElement('img'); sanctHdr1.src = 'assets/ui/santuario-famigli.webp'; sanctHdr1.alt = ''; sanctHdr1.className = 'borgo-entry-header'; sanctHdr1.onerror = () => sanctHdr1.remove(); sp.appendChild(sanctHdr1);
    sp.appendChild(el('h3', 'panel-title', '🐾 Il Santuario dei Famigli'));
    const thumb = el('img', 'pet-thumb');
    thumb.src = petImageSrc(p);
    thumb.onerror = () => { thumb.style.display = 'none'; };
    sp.appendChild(thumb);
    let statusMsg = 'Tutto tranquillo.';
    if (p.sick) statusMsg = '🤒 È malato! Ha bisogno di cure urgenti.';
    else if (p.hunger < 30 || p.mood < 30 || p.hygiene < 30 || p.energy < 30) statusMsg = '⚠️ Ha bisogno di attenzioni!';
    else if (p.wish) statusMsg = '💭 Ha un desiderio da esaudire!';
    sp.appendChild(el('p', 'muted small center', `${esc(p.name)} — Liv. ${p.level}. ${statusMsg}`));
    const enterBtn = el('button', 'btn btn-primary wide', 'Entra nel Santuario');
    enterBtn.addEventListener('click', () => { CAMP_VIEW = 'santuario'; setTab('camp'); });
    sp.appendChild(enterBtn);
    c.appendChild(sp);
  } else {
    // Teaser bloccato — visibile finché il Santuario non è sbloccato
    const sanctEntry = el('div', 'panel borgo-entry-panel santuario-entry-panel');
    const sanctThumb = document.createElement('img');
    sanctThumb.src = 'assets/ui/santuario-famigli.webp';
    sanctThumb.alt = '';
    sanctThumb.className = 'borgo-entry-header';
    sanctThumb.onerror = () => sanctThumb.remove();
    sanctEntry.appendChild(sanctThumb);
    const sanctHead = el('div', 'santuario-entry-head');
    sanctHead.appendChild(el('h3', 'panel-title santuario-entry-title', '🥚 Il Santuario dei Famigli'));
    sanctHead.appendChild(el('span', 'santuario-lock-badge', '🔒'));
    sanctEntry.appendChild(sanctHead);
    sanctEntry.appendChild(el('p', 'muted small borgo-entry-quote santuario-teaser-quote',
      '«Nelle profondità della Foresta Sussurrante, qualcosa di antico attende di schiudersi. Una missione specifica ti condurrà a lui — se sarai pronto.»'));
    const lockedBtn = el('button', 'btn btn-primary wide santuario-locked-btn', '🔒 Ancora sigillato');
    lockedBtn.disabled = true;
    sanctEntry.appendChild(lockedBtn);
    c.appendChild(sanctEntry);
  }

  // ── Il Cantiere dell'Eroe (Edifici + Arredamento) ──
  {
    const totalOwned      = (HERO.furniture && HERO.furniture.owned.length) || 0;
    const setsComplete    = RPG.FURNITURE_SETS.filter(s => RPG.furnitureSetComplete(HERO, s.id)).length;
    const layersOwned     = RPG.CAMP_LAYER_SHOP.filter(l => (HERO.furniture && HERO.furniture.owned || []).includes(l.id)).length;
    const cp = el('div', 'panel borgo-entry-panel cantiere-panel');

    // Header immagine
    const cantThumb = el('img', 'borgo-entry-header');
    cantThumb.src = 'assets/ui/rifugio/cantiere-eroe.webp';
    cantThumb.alt = '';
    cp.appendChild(cantThumb);

    cp.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/rifugio/cantiere.webp', 'Il Cantiere dell\'Eroe', '🏗️')));
    cp.appendChild(el('p', 'muted small borgo-entry-quote', 'Costruisci edifici e arreda la tua dimora per sbloccare bonus permanenti.'));

    // ── Sezione Strutture dell'Accampamento ──
    cp.appendChild(el('h4', 'cantiere-section-title', ptIcon('assets/ui/rifugio/strutture.webp', 'Strutture dell\'Accampamento', '🏗️')));
    cp.appendChild(el('p', 'muted small center',
      `${layersOwned} / 25 strutture costruite — appaiono nel tuo accampamento.`));
    const enterStruttureBtn = el('button', 'btn btn-primary wide', ptIcon('assets/ui/rifugio/strutture.webp', 'Costruisci Strutture', '🏗️'));
    enterStruttureBtn.addEventListener('click', () => { CAMP_VIEW = 'strutture'; setTab('camp'); });
    cp.appendChild(enterStruttureBtn);

    // ── Sezione Arredamento ──
    cp.appendChild(el('h4', 'cantiere-section-title', ptIcon('assets/ui/rifugio/arredamento-btn.webp', 'Arredamento', '🏛️')));
    cp.appendChild(el('p', 'muted small center',
      `${totalOwned} / 200 cimeli raccolti · ${setsComplete} / 20 set completi.`));
    const enterArredaBtn = el('button', 'btn btn-primary wide', ptIcon('assets/ui/rifugio/arredamento-btn.webp', 'Entra nella Bottega', '🏛️'));
    enterArredaBtn.addEventListener('click', () => { CAMP_VIEW = 'arredamento'; setTab('camp'); });
    cp.appendChild(enterArredaBtn);

    c.appendChild(cp);
  }

  // Serra del Viandante
  {
    const growingCount = HERO.greenhouse.pots.filter(p => p.status === 'growing' || p.status === 'ready').length;
    const readyCount   = HERO.greenhouse.pots.filter(p => p.status === 'ready').length;
    const dangerCount  = HERO.greenhouse.pots.filter(p => p.status === 'growing' && p.health < 40).length;
    const gp = el('div', readyCount ? 'panel panel-featured borgo-entry-panel' : 'panel borgo-entry-panel');
    const serraThumb = el('img', 'borgo-entry-header');
    serraThumb.src = 'assets/minigames/serra/SERRA.webp';
    serraThumb.alt = '';
    gp.appendChild(serraThumb);
    gp.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/rifugio/serra-icona.webp', 'La Serra del Viandante', '🌿')));
    if (dangerCount) gp.appendChild(el('p', 'serra-danger-warn', `⚠️ ${dangerCount} pianta${dangerCount > 1 ? 'e in pericolo' : ' in pericolo'}! Annaffia subito.`));
    gp.appendChild(el('p', 'muted small borgo-entry-quote',
      readyCount
        ? `🎁 ${readyCount} pianta${readyCount > 1 ? 'e' : ''} pronta${readyCount > 1 ? '' : 'e'} per il raccolto!`
        : growingCount
          ? `${growingCount} pianta${growingCount > 1 ? 'e' : ''} in crescita. Annaffiale con il tuo sudore.`
          : 'Coltiva piante magiche annaffiandole con i km percorsi. La costanza porta frutti leggendari.'));
    if (readyCount) gp.appendChild(el('span', 'mg-card-badge', String(readyCount)));
    const enterGreenhouseBtn = el('button', 'btn btn-primary wide', '🌿 Entra nella Serra');
    enterGreenhouseBtn.addEventListener('click', () => { CAMP_VIEW = 'serra'; setTab('camp'); });
    gp.appendChild(enterGreenhouseBtn);
    c.appendChild(gp);
  }

  // Visita alleato
  const others = STATE.heroes.filter(h => h.id !== HERO.id);
  if (others.length) {
    const vp = el('div', 'panel');
    const vTitle = el('h3', 'panel-title', ptIcon('assets/ui/rifugio/alleato.webp', 'Visita il Rifugio del tuo Alleato', '🪞'));
    vp.appendChild(vTitle);
    others.forEach(o => {
      const btn = el('button', 'btn wide', `Guarda la base di ${esc(o.name)}`);
      btn.addEventListener('click', () => showAllyBase(o));
      vp.appendChild(btn);
    });
    c.appendChild(vp);
  }

  // Riposo
  const rp = el('div', HERO.restBonus ? 'panel panel-featured' : 'panel');
  rp.appendChild(el('h3', 'panel-title', ptIcon('assets/ui/rifugio/falo.webp', 'Falò Rigenerante', '😴')));
  rp.appendChild(el('p', 'muted small',
    'Dichiara un Giorno di Riposo (max 2 a settimana): il prossimo allenamento varrà il DOPPIO.' +
    (HERO.restBonus ? '<br><b>✨ Bonus Riposo attivo: il prossimo allenamento vale x2!</b>' : '')));
  const rbtn = el('button', 'btn btn-primary wide', 'Riposa oggi');
  rbtn.addEventListener('click', () => {
    const err = RPG.declareRestDay(HERO);
    persist();
    toast(err || '😴 Riposo dichiarato! Domani il tuo allenamento varrà x2.');
    setTab('camp');
  });
  rp.appendChild(rbtn);
  c.appendChild(rp);
}

function seasonPassRewardIconHtml(reward) {
  if (reward.type === 'cosmetic') {
    return `<img class="sp-node-img" src="assets/seasonpass/rewards/${reward.cosmetic.img}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'sp-node-emoji',textContent:'${reward.icon}'}))">`;
  }
  return `<span class="sp-node-emoji">${reward.icon}</span>`;
}

function renderSeasonPassTrackRow(track, status) {
  const row = el('div', 'sp-track-row');
  row.appendChild(el('div', `sp-track-label sp-track-label-${track}`,
    track === 'premium' ? '👑<br>Premium' : 'Gratis'));
  const items = el('div', 'sp-track-items');
  for (let lv = 1; lv <= RPG.SEASON_PASS.maxLevel; lv++) {
    const reward = RPG.seasonPassRewardFor(lv, track);
    const claimedList = track === 'premium' ? status.claimedPremium : status.claimedFree;
    const claimed = claimedList.includes(lv);
    const reached = lv <= status.level;
    const claimable = reached && !claimed;
    const node = el('div', `sp-node ${claimed ? 'sp-claimed' : claimable ? 'sp-claimable' : 'sp-locked'}`);
    node.innerHTML = `
      <div class="sp-node-lv">Lv ${lv}</div>
      <div class="sp-node-circle">${claimed ? '<span class="sp-node-check">✓</span>' : seasonPassRewardIconHtml(reward)}</div>
      <div class="sp-node-name">${esc(reward.label)}</div>`;
    if (claimable) {
      node.addEventListener('click', () => {
        const result = RPG.claimSeasonPassReward(HERO, lv, track);
        if (!result) return;
        persist(); renderHUD();
        vibrate([80, 40, 120]);
        showSeasonPassRewardModal(result);
        CAMP_VIEW = 'seasonpass'; setTab('camp');
      });
    } else if (!reached) {
      node.addEventListener('click', () => toast(`🔒 Si sblocca al Livello ${lv} del Pass`));
    }
    items.appendChild(node);
    if (lv < RPG.SEASON_PASS.maxLevel) items.appendChild(el('div', `sp-connector${lv < status.level ? ' sp-connector-lit' : ''}`));
  }
  row.appendChild(items);
  return row;
}

function showSeasonPassRewardModal(result) {
  const r = result.reward;
  let bodyHtml = '';
  if (r.type === 'gold') bodyHtml = `<p class="center">🪙 <b>+${result.gold} Oro</b></p>`;
  else if (r.type === 'res') bodyHtml = `<p class="center">🌲 +${result.wood} Legna · ⛏️ +${result.stone} Pietra</p>`;
  else if (r.type === 'consumable') bodyHtml = `<p class="center">${result.consumable.icon} <b>${esc(result.consumable.name)}</b> nel Box Consumabili</p>`;
  else if (r.type === 'item') bodyHtml = `<div class="loot-list">${itemHtml(result.item)}</div>`;
  else if (r.type === 'cosmetic') {
    const cos = r.cosmetic;
    const label = cos.type === 'mount' ? '🐴 Nuova cavalcatura nella Stalla e nella Sacca!'
      : cos.type === 'avatar' ? '👤 Nuovo avatar nella Sacca del Viandante!'
      : cos.type === 'frame' ? '🖼️ Nuova cornice nella Sacca del Viandante!'
      : '📛 Nuovo titolo nella Sacca del Viandante!';
    bodyHtml = `<img class="sp-modal-cosmetic-img" src="assets/seasonpass/rewards/${cos.img}" alt="">
      <p class="center small muted">${label}</p>`;
  }
  modal(`<h3 class="panel-title center">${r.icon} ${esc(r.label)}</h3>
    ${bodyHtml}
    <button class="btn btn-primary wide" onclick="closeModal()">Fantastico!</button>`);
}

function renderSeasonPassView(c) {
  advanceOnboarding(15);
  const backBtn = el('button', 'view-back-link', '‹ Rifugio');
  backBtn.addEventListener('click', () => { CAMP_VIEW = 'main'; setTab('camp'); });
  c.appendChild(backBtn);

  const status = RPG.seasonPassStatus(HERO);
  const pct = status.level >= status.maxLevel ? 100 : Math.round(status.pointsInLevel / status.pointsForNext * 100);
  const kmToNext = status.level >= status.maxLevel ? 0 : Math.max(0, Math.round((status.pointsForNext - status.pointsInLevel) / RPG.SEASON_PASS.pointsPerKm * 10) / 10);

  const wrap = el('div', 'sp-screen');

  const header = el('div', 'sp-header');
  const logoImg = el('img', 'sp-logo');
  logoImg.src = 'assets/seasonpass/logo.webp';
  logoImg.alt = '';
  logoImg.addEventListener('error', () => logoImg.remove());
  header.appendChild(logoImg);
  header.insertAdjacentHTML('beforeend', `
    <div class="sp-header-row">
      <div class="sp-lv-badge">Lv ${status.level}/${status.maxLevel}</div>
      <div class="sp-header-bar-wrap">
        <div class="sp-header-bar"><div class="sp-header-bar-fill" style="width:${pct}%"></div></div>
        <div class="sp-header-bar-label">${status.pointsInLevel} / ${status.pointsForNext || RPG.SEASON_PASS.pointsPerLevel} punti${status.level < status.maxLevel ? ` · mancano ${kmToNext} km al prossimo livello` : ' · Livello massimo raggiunto!'}</div>
      </div>
    </div>`);
  wrap.appendChild(header);

  const legend = el('div', 'sp-legend');
  legend.innerHTML = `
    <span class="sp-legend-item"><span class="sp-dot sp-dot-claimed"></span> Riscosso</span>
    <span class="sp-legend-item"><span class="sp-dot sp-dot-claimable"></span> Da riscuotere</span>
    <span class="sp-legend-item"><span class="sp-dot sp-dot-locked"></span> Bloccato</span>`;
  wrap.appendChild(legend);

  const trackWrap = el('div', 'sp-track-wrap');
  trackWrap.appendChild(renderSeasonPassTrackRow('premium', status));
  trackWrap.appendChild(renderSeasonPassTrackRow('free', status));
  wrap.appendChild(trackWrap);

  const note = el('p', 'muted small center sp-note',
    `Ogni km registrato vale ${RPG.SEASON_PASS.pointsPerKm} punti stagione, su entrambe le track — nessun pagamento richiesto. Cornici, avatar e cavalcatura si equipaggiano dalla 🎒 Sacca del Viandante.`);
  wrap.appendChild(note);

  c.appendChild(wrap);
}

function showAllyBase(o) {
  RPG.migrateHero(o);
  const mount = o.mount ? RPG.mountById(o.mount) : null;
  modal(`
    <h3 class="panel-title">🪞 Il Rifugio di ${esc(o.name)}</h3>
    <div class="camp-emoji">🔥${o.companion ? ' 🐺' : ''}${mount ? ' ' + mount.emoji : ''}</div>
    <p class="muted">Liv. ${o.level} — ${RPG.heroTitle(o.level)} · ${o.totalKm.toFixed(1)} km totali</p>
    ${mount ? `<p>Cavalcatura: ${mount.emoji} ${mount.name}</p>` : ''}
    <p class="muted small">${o.cards.length} carte · ${(o.bestiary || []).length} creature nel Bestiario · ${(o.items || []).length} oggetti</p>
    <button class="btn btn-primary wide" onclick="closeModal()">Torna al tuo Rifugio</button>
  `);
}

function petVisualStage(pet) {
  if (!pet.hatched) return 1;
  const lv = pet.level || 1;
  if (lv <= 4)  return 2;
  if (lv <= 15) return 3;
  if (lv <= 30) return 4;
  return 5;
}

function petImageSrc(pet) {
  return `assets/pet/${pet.species}/${petVisualStage(pet)}.webp`;
}

function renderEggView(c) {
  const pet = HERO.pet;
  const speciesInfo = RPG.PET_SPECIES[pet.species];
  const egg = RPG.eggProgress(HERO);

  const backBtn = el('button', 'view-back-link', '‹ Rifugio');
  backBtn.addEventListener('click', () => { CAMP_VIEW = 'main'; setTab('camp'); });
  c.appendChild(backBtn);

  // Uovo al centro — titolo sopra come nell'immagine di riferimento
  const eggWrap = el('div', 'egg-view-wrap');
  const eggTitle = el('div', 'egg-view-title');
  eggTitle.innerHTML = `🥚 Uovo Misterioso`;
  eggWrap.appendChild(eggTitle);

  const imgWrap = el('div', 'egg-img-wrap');
  const img = el('img', 'egg-portrait' + (egg.ready ? ' egg-shake' : ''));
  img.loading = 'eager';
  img.src = petImageSrc(pet);
  img.onerror = () => { img.outerHTML = `<div class="egg-portrait-fallback">🥚</div>`; };
  imgWrap.appendChild(img);
  eggWrap.appendChild(imgWrap);

  const eggName = el('div', 'egg-name', `Uovo di ${esc(speciesInfo.name)}`);
  eggWrap.appendChild(eggName);

  const eggDesc = el('p', 'egg-desc',
    'Finché l\'uovo non si schiude non ha bisogno di nulla: si scalda un passo alla volta con i chilometri che percorri. Il mistero si svelerà alla schiusa.');
  eggWrap.appendChild(eggDesc);
  c.appendChild(eggWrap);

  const progPanel = el('div', 'panel');
  progPanel.appendChild(el('h3', 'panel-title', '🔥 Incubazione'));
  progPanel.appendChild(el('div', 'membar', `<div class="membar-fill gold" style="width:${egg.pct}%"></div><span>${egg.km.toFixed(1)} / ${egg.needed} km</span>`));
  c.appendChild(progPanel);

  if (egg.ready) {
    const hatchPanel = el('div', 'panel incursion-panel center');
    hatchPanel.appendChild(el('p', 'center big-news', '✨ L\'uovo trema... è pronto!'));
    const hatchBtn = el('button', 'btn btn-primary wide big', '🥚 Tocca per rompere il guscio!');
    hatchBtn.addEventListener('click', () => playHatchSequence(pet));
    hatchPanel.appendChild(hatchBtn);
    c.appendChild(hatchPanel);
  } else {
    c.appendChild(el('p', 'muted small center', 'Continua ad allenarti: ogni chilometro scalda l\'uovo un po\' di più.'));
  }
}

function playHatchSequence(pet) {
  const videoSrc = `assets/pet/${pet.species}/hatch.mp4`;
  const overlay = el('div', 'hatch-overlay');
  overlay.innerHTML = `
    <video class="hatch-video" autoplay playsinline muted></video>
    <button class="btn wide hatch-skip">Salta ➜</button>`;
  document.body.appendChild(overlay);
  const video = overlay.querySelector('video');
  const finish = () => {
    overlay.remove();
    const r = RPG.hatchPet(HERO);
    persist(); renderHUD();
    if (r && r.ok) { toast(`🎉 ${esc(HERO.pet.name)} è nato!`); sfx('level'); vibrate([80, 40, 80, 40, 120]); }
    else toast(r);
    setTab('camp');
  };
  video.addEventListener('ended', finish);
  video.addEventListener('error', finish);
  overlay.querySelector('.hatch-skip').addEventListener('click', finish);
  video.src = videoSrc;
  video.play().catch(() => finish());
}

function renderSantuarioView(c) {
  advanceOnboarding(13);
  const pet = HERO.pet;
  if (!pet.hatched) { renderEggView(c); return; }
  RPG.tickPet(HERO); persist();
  const pers = RPG.PET_PERSONALITIES[pet.personality];

  const backBtn = el('button', 'view-back-link', '‹ Rifugio');
  backBtn.addEventListener('click', () => { CAMP_VIEW = 'main'; setTab('camp'); });
  c.appendChild(backBtn);
  const sanctHdrImg = document.createElement('img');
  sanctHdrImg.src = 'assets/ui/santuario-famigli.webp';
  sanctHdrImg.alt = ''; sanctHdrImg.className = 'borgo-sub-header';
  sanctHdrImg.onerror = () => sanctHdrImg.remove();
  c.appendChild(sanctHdrImg);

  c.appendChild(el('h2', 'section-title', '🐾 Il Santuario dei Famigli'));

  const speciesInfo = RPG.PET_SPECIES[pet.species];
  const stage = RPG.petStage(pet.level);
  const unlocks = RPG.petStageUnlocks(stage);
  const isLegendary = stage >= 5;
  const head = el('div', 'panel center');

  // ── Slot equipaggiamento ────────────────────────────────────────
  const accKey = pet.accessory;
  const accDef = accKey ? RPG.PET_ACCESSORIES[accKey] : null;
  const accSlot = el('div', 'equip-slot' + (accDef ? ' filled' : ''));
  accSlot.innerHTML = `<div class="equip-icon${accDef ? '' : ' empty'}">${accDef ? accDef.icon : '🎀'}</div>
    <div class="equip-label">${accDef ? accDef.name.split(' ').slice(0, 2).join(' ') : 'Accessorio'}</div>`;
  if (accDef) accSlot.title = accDef.desc;

  const conKey = HERO.equipped && HERO.equipped.consumable;
  const conDef = conKey ? RPG.CONSUMABLES.find(x => x.id === conKey) : null;
  const conSlot = el('div', 'equip-slot' + (conDef ? ' filled' : ''));
  conSlot.innerHTML = `<div class="equip-icon${conDef ? '' : ' empty'}">${conDef ? conDef.icon : '🧪'}</div>
    <div class="equip-label">${conDef ? conDef.name.split(' ').slice(0, 2).join(' ') : 'Consumabile'}</div>`;

  // Portrait centrato con uno slot a sx e uno a dx
  const portraitWrap = el('div', 'pet-portrait-wrap');
  const img = el('img', 'pet-portrait-img');
  img.loading = 'eager';
  img.src = petImageSrc(pet);
  img.onerror = () => { img.outerHTML = `<div class="pet-portrait">${speciesInfo.icon}</div>`; };
  portraitWrap.appendChild(img);

  const portraitArea = el('div', 'pet-portrait-area');
  portraitArea.appendChild(accSlot);
  portraitArea.appendChild(portraitWrap);
  portraitArea.appendChild(conSlot);
  head.appendChild(portraitArea);

  // Desc effetto accessorio attivo
  if (accDef) head.appendChild(el('p', 'acc-effect-desc small center', accDef.desc));

  const stageLabel = isLegendary
    ? `${speciesInfo.icon} ${speciesInfo.name} · ⭐ Leggendario`
    : `${speciesInfo.icon} ${speciesInfo.name} · Stadio ${stage}/5`;
  head.appendChild(el('div', 'pet-stage-tag small', stageLabel));

  // Bonus passivo specie
  if (speciesInfo.bonusDesc) {
    const bonusMult = isLegendary ? ' (×2 🌟)' : '';
    head.appendChild(el('div', 'pet-species-bonus small', `✦ ${speciesInfo.bonusDesc}${bonusMult}`));
  }

  // Nome + tasto rinomina
  const nameRow = el('div', 'pet-name-row');
  nameRow.appendChild(el('h3', 'hero-name-plate center', `${esc(pet.name)} — Liv. ${pet.level}`));
  const renameBtn = el('button', 'btn btn-small pet-rename-btn', '✏️');
  renameBtn.title = 'Rinomina';
  renameBtn.addEventListener('click', () => {
    modal(`
      <h2 class="section-title">✏️ Rinomina Famiglio</h2>
      <input id="pet-rename-inp" class="create-name-input" type="text" maxlength="20"
             value="${esc(pet.name)}" placeholder="Nuovo nome…" autocomplete="off">
      <div style="display:flex;gap:.75rem;margin-top:1rem;">
        <button class="btn btn-primary wide" id="pet-rename-save">Salva</button>
        <button class="btn wide" onclick="closeModal()">Annulla</button>
      </div>
    `);
    const inp = document.getElementById('pet-rename-inp');
    const saveBtn = document.getElementById('pet-rename-save');
    if (inp) { inp.focus(); inp.select(); }
    const doSave = () => {
      const v = inp ? inp.value.trim() : '';
      if (v) { pet.name = v.slice(0, 20); persist(); closeModal(); setTab('camp'); }
    };
    if (saveBtn) saveBtn.addEventListener('click', doSave);
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') doSave(); });
  });
  nameRow.appendChild(renameBtn);
  head.appendChild(nameRow);

  // Barra XP
  const xpNeeded = RPG.petXpForLevel(pet.level);
  const xpPct = Math.round((pet.xp / xpNeeded) * 100);
  const xpWrap = el('div', 'pet-xp-wrap');
  xpWrap.innerHTML = `<div class="pet-xp-label small muted">XP ${pet.xp}/${xpNeeded}</div>
    <div class="membar slim"><div class="membar-fill gold" style="width:${xpPct}%"></div></div>`;
  head.appendChild(xpWrap);

  // Messaggio blocco leggendario: pet a lv max stadio 4 ma eroe < 60
  const heroLvForLeg = HERO.level || 1;
  const blockedBeforeLegendary = pet.level >= RPG.PET_MAX_LEVEL_BEFORE_LEGENDARY && heroLvForLeg < RPG.PET_LEGENDARY_HERO_LV;
  if (blockedBeforeLegendary) {
    xpWrap.innerHTML += `<div class="small pet-leg-locked" style="margin-top:.4rem">
      ⏳ Pronto a evolvere — raggiungi il <b>Livello ${RPG.PET_LEGENDARY_HERO_LV} da eroe</b> per sbloccare la Forma Leggendaria
      <span style="color:var(--muted)">(sei al ${heroLvForLeg})</span>
    </div>`;
  } else if (!isLegendary) {
    const nextStage = stage + 1;
    const nextUnlockLabels = { 2: '🎒 Spedizioni', 3: '💭 Desideri', 4: '⚔️ Arena max', 5: '🌟 Leggendario' };
    const nextLabel = nextUnlockLabels[nextStage];
    // Soglie visive: 1→2 a lv5, 2→3 a lv16, 3→4 a lv31, 4→5 a lv50+
    const visualNextLv = { 2: 5, 3: 16, 4: 31, 5: 50 }[nextStage] ?? ((nextStage - 1) * RPG.PET_LEVELS_PER_STAGE + 1);
    if (nextLabel) xpWrap.innerHTML += `<div class="small muted" style="margin-top:.3rem">Prossimo stadio (Liv.${visualNextLv}): ${nextLabel}</div>`;
  }

  head.appendChild(el('p', 'small muted', `${pers.icon} <b>${pers.name}</b><br>${pers.desc}`));
  if (pet.restedBonusActive) head.appendChild(el('div', 'pet-rested-badge', '😴 Riposato! XP +20% oggi'));
  c.appendChild(head);

  if (RPG.packAuraActive(STATE, HERO)) {
    c.appendChild(el('div', 'panel done-strip', '🌟 <b>Aura del Branco attiva!</b> Entrambi i famigli sono felici: sconto e bonus drop condivisi!'));
  }

  if (pet.atRisk && !pet.sick) {
    const riskP = el('div', 'panel incursion-panel');
    riskP.innerHTML = `<h3 class="panel-title">⚠️ ${esc(pet.name)} sta male!</h3>
      <p class="small muted center">Sazietà e umore critici: nutrilo e giocaci subito o si ammalerà!</p>`;
    c.appendChild(riskP);
  }

  if (pet.sick) {
    const sickP = el('div', 'panel incursion-panel');
    sickP.innerHTML = `<h3 class="panel-title">🤒 ${esc(pet.name)} è malato!</h3>
      <p class="small muted center">Solo la Pozione della Fenice può guarirlo.</p>`;
    const cureBtn = el('button', 'btn btn-primary wide', `🧪 Cura (${RPG.PHOENIX_POTION_PRICE} 🪙)`);
    cureBtn.addEventListener('click', () => {
      const r = RPG.curePet(HERO);
      persist();
      if (r && r.ok) { toast('✨ Guarito! Il tuo famiglio sta di nuovo bene.'); sfx('level'); }
      else toast(r);
      renderHUD(); setTab('camp');
    });
    sickP.appendChild(cureBtn);
    c.appendChild(sickP);
  }

  if (pet.wish && unlocks.wish) {
    const food = RPG.PET_FOODS[pet.wish.item];
    const minLeft = Math.max(0, Math.ceil((pet.wish.deadline - Date.now()) / 60000));
    const wp = el('div', 'panel incursion-panel');
    wp.innerHTML = `<h3 class="panel-title">💭 Desiderio improvviso!</h3>
      <p class="center">${esc(pet.name)} desidera: <b>${food.icon} ${food.name}</b></p>
      <p class="muted small center">Scade tra ${minLeft} min!</p>`;
    const giveBtn = el('button', 'btn btn-primary wide', `Dai ${food.icon} ${food.name}`);
    giveBtn.addEventListener('click', () => {
      const r = RPG.feedPet(HERO, pet.wish.item);
      persist();
      if (r && r.ok) { checkPetEvolution(r); toast(r.wishFulfilled ? '🎉 Desiderio esaudito!' : `${food.icon} sfamato!`); sfx('coin'); }
      else toast(r);
      renderHUD(); setTab('camp');
    });
    wp.appendChild(giveBtn);
    c.appendChild(wp);
  }

  const statsPanel = el('div', 'panel');
  statsPanel.appendChild(el('h3', 'panel-title', '📊 Bisogni'));
  [
    ['🍖 Sazietà', pet.hunger],
    ['🎾 Umore', pet.mood],
    ['🛁 Igiene', pet.hygiene],
    ['🌙 Energia', pet.energy],
  ].forEach(([label, val]) => {
    const cls = val < 30 ? 'danger' : 'gold';
    statsPanel.innerHTML += `<div class="stat-row">${label} <b>${Math.round(val)}%</b></div>
      <div class="membar slim"><div class="membar-fill ${cls}" style="width:${Math.round(val)}%"></div></div>`;
  });
  c.appendChild(statsPanel);

  const actionsPanel = el('div', 'panel');
  actionsPanel.appendChild(el('h3', 'panel-title', '🤲 Prenditi cura di lui'));
  actionsPanel.appendChild(el('p', 'muted small', '💡 La cura mantiene bisogni e virtù · l\'XP arriva dagli allenamenti!'));
  const grid = el('div', 'hero-submenu');

  const feedBtn = el('button', 'btn submenu-btn');
  feedBtn.innerHTML = `<span class="submenu-emoji">🍖</span><span>Nutri</span>`;
  feedBtn.addEventListener('click', openFeedPicker);
  grid.appendChild(feedBtn);

  const stamina = HERO.stamina || 0;
  const PLAY_COST = 5;
  const canPlay = stamina >= PLAY_COST;
  const playBtn = el('button', 'btn submenu-btn' + (canPlay ? '' : ' submenu-btn-disabled'));
  playBtn.innerHTML = `<span class="submenu-emoji">🎾</span><span>Gioca<br><small style="font-size:.68rem;opacity:.7">${canPlay ? `⚡${stamina.toFixed(0)}/${PLAY_COST}` : `⚡${stamina.toFixed(0)}/${PLAY_COST} — corri!`}</small></span>`;
  playBtn.addEventListener('click', () => {
    const r = RPG.playWithPet(HERO);
    persist();
    if (r && r.ok) { checkPetEvolution(r); toast('🎾 Che divertimento!'); sfx('coin'); } else toast(typeof r === 'string' ? r : 'Stamina insufficiente — registra una corsa per generarla!');
    setTab('camp');
  });
  grid.appendChild(playBtn);

  const cleanBtn = el('button', 'btn submenu-btn');
  cleanBtn.innerHTML = `<span class="submenu-emoji">🛁</span><span>Pulisci</span>`;
  cleanBtn.addEventListener('click', () => {
    const r = RPG.cleanPet(HERO);
    persist();
    if (r && r.ok) { checkPetEvolution(r); toast('🛁 Pulito e profumato!'); sfx('coin'); } else toast(r);
    setTab('camp');
  });
  grid.appendChild(cleanBtn);

  const sleepBtn = el('button', 'btn submenu-btn');
  sleepBtn.innerHTML = `<span class="submenu-emoji">🌙</span><span>Nanna</span>`;
  sleepBtn.addEventListener('click', () => {
    const r = RPG.sleepPet(HERO);
    persist();
    if (r && r.ok) { toast('🌙 Dorme sereno... energia piena domani!'); sfx('coin'); } else toast(r);
    setTab('camp');
  });
  grid.appendChild(sleepBtn);

  actionsPanel.appendChild(grid);
  c.appendChild(actionsPanel);

  // ── Virtù del Famiglio ───────────────────────────────────────
  const virtuePanel = el('div', 'panel');
  virtuePanel.appendChild(el('h3', 'panel-title', '🌟 Virtù del Famiglio'));
  const c_ = pet.coraggio || 0, a_ = pet.astuzia || 0, l_ = pet.lealta || 0;
  const virtTotal = c_ + a_ + l_;
  const dominantV = RPG.petDominantVirtue(HERO);
  const virtMeta = RPG.PET_VIRTUE_META;

  const virtGrid = el('div', 'pet-virtue-grid');
  [['coraggio', c_], ['astuzia', a_], ['lealta', l_]].forEach(([vk, vv]) => {
    const vm = virtMeta[vk];
    const pct = virtTotal > 0 ? Math.round(vv / virtTotal * 100) : 0;
    const isDom = vk === dominantV;
    const row = el('div', 'pet-virtue-row' + (isDom ? ' dominant' : ''));
    row.innerHTML = `
      <div class="pet-virtue-head">
        <span class="pet-virtue-icon">${vm.icon}</span>
        <span class="pet-virtue-name">${vm.name}</span>
        <span class="pet-virtue-val">${Math.round(vv)}</span>
        ${isDom ? '<span class="pet-virtue-dom">★</span>' : ''}
      </div>
      <div class="pet-virtue-bar"><div class="pet-virtue-fill" data-virtue="${vk}" style="width:${pct}%"></div></div>
      <div class="pet-virtue-desc">${vm.desc}</div>`;
    virtGrid.appendChild(row);
  });
  virtuePanel.appendChild(virtGrid);

  const todayV = new Date().toISOString().slice(0, 10);
  const synergyAvailSanct = dominantV && pet.lastSynergyDate !== todayV && !pet.sick && (pet.hunger || 0) >= 20 && (pet.mood || 0) >= 20;
  if (dominantV) {
    const vm = virtMeta[dominantV];
    const synergyInfo = el('div', 'pet-synergy-info');
    synergyInfo.innerHTML = `<b>${vm.icon} Sinergia · ${vm.name}:</b> ${vm.synergyDesc}`;
    if (!synergyAvailSanct) {
      synergyInfo.innerHTML += `<br><span class="muted small">${pet.lastSynergyDate === todayV ? '✓ Usata oggi' : pet.sick ? '🤒 Malato' : 'HP/umore bassi'}</span>`;
    }
    virtuePanel.appendChild(synergyInfo);
  } else {
    virtuePanel.appendChild(el('p', 'muted small', 'Gioca, combatti e prenditi cura del tuo famiglio per sviluppare una virtù dominante.'));
  }
  c.appendChild(virtuePanel);

  // ── Spedizioni ───────────────────────────────────────────────
  const expStatus = RPG.expeditionStatus(HERO);
  const expPanel = el('div', 'panel');
  expPanel.appendChild(el('h3', 'panel-title', '🎒 Spedizione di Esplorazione'));
  if (!unlocks.expedition) {
    expPanel.appendChild(el('p', 'muted small center', `🔒 Si sblocca al livello 5. Ancora ${5 - pet.level} livello/i mancanti — allena per far crescere il tuo famiglio!`));
  } else if (!pet.expedition) {
    const needFull = (pet.hunger || 0) < 30 || (pet.mood || 0) < 30;
    if (needFull) {
      expPanel.appendChild(el('p', 'muted small center', `⚠️ ${esc(pet.name)} ha bisogno di almeno 30% sazietà e umore per partire.`));
    }
    expPanel.appendChild(el('p', 'muted small', 'Scegli una zona. Più km percorri durante la spedizione, più ricco sarà il bottino!'));

    const zoneGrid = el('div', 'pet-zone-grid');
    Object.entries(RPG.PET_EXPEDITION_ZONES).forEach(([zoneKey, zd]) => {
      const btn = el('button', 'pet-zone-btn');
      btn.innerHTML = `<span class="pet-zone-icon">${zd.icon}</span>
        <div class="pet-zone-body">
          <div class="pet-zone-name">${zd.name}</div>
          <div class="pet-zone-desc">${zd.desc}</div>
        </div>`;
      btn.disabled = !!pet.sick || needFull;
      btn.addEventListener('click', () => {
        const r = RPG.startExpedition(HERO, zoneKey);
        persist();
        if (r && r.ok) { toast(`🎒 ${esc(pet.name)} è partito per ${zd.name}!`); sfx('coin'); }
        else toast(r);
        setTab('camp');
      });
      zoneGrid.appendChild(btn);
    });
    expPanel.appendChild(zoneGrid);
  } else if (expStatus.ready) {
    expPanel.appendChild(el('p', 'center', `📦 ${esc(pet.name)} è tornato da ${esc(expStatus.zoneName)}!`));
    const collectBtn = el('button', 'btn btn-primary wide', 'Riscuoti il bottino');
    collectBtn.addEventListener('click', () => {
      const r = RPG.collectExpedition(HERO);
      persist();
      if (r) {
        checkPetEvolution(r);
        if (r.failed) {
          toast(`😔 ${esc(pet.name)} è tornato a mani vuote...`);
        } else {
          toast(r.epic ? `🌟 Bottino eccellente! 🪙${r.gold} 🌲${r.wood} ⛏️${r.stone}` : `🎒 Bottino: 🪙${r.gold} 🌲${r.wood} ⛏️${r.stone}`);
          sfx('chest');
        }
      }
      renderHUD(); setTab('camp');
    });
    expPanel.appendChild(collectBtn);
  } else {
    const z = RPG.PET_EXPEDITION_ZONES[expStatus.zone] || {};
    expPanel.appendChild(el('p', 'muted small center', `${z.icon || '🎒'} ${esc(pet.name)} sta esplorando ${esc(expStatus.zoneName || '')}…`));
    const barWrap = el('div', 'membar slim');
    barWrap.innerHTML = `<div class="membar-fill gold" style="width:${expStatus.pctDone}%"></div>`;
    expPanel.appendChild(barWrap);
    expPanel.appendChild(el('p', 'muted small center', `${expStatus.pctDone}% — torna più tardi!`));
  }
  c.appendChild(expPanel);

  // ── Memorie ──────────────────────────────────────────────────
  if (pet.memories && pet.memories.length) {
    const memPanel = el('div', 'panel');
    memPanel.appendChild(el('h3', 'panel-title', `💭 Ricordi di ${esc(pet.name)}`));
    const memList = el('div', 'pet-memories');
    const mems = [...pet.memories].reverse(); // più recente prima
    mems.forEach(m => {
      const row = el('div', 'pet-memory-row');
      row.innerHTML = `<span class="pet-memory-date">${m.date}</span> <span class="pet-memory-text">«${esc(m.text)}»</span>`;
      memList.appendChild(row);
    });
    memPanel.appendChild(memList);
    c.appendChild(memPanel);
  }

  RPG.checkAccessoryUnlocks(HERO);

  const shop = el('div', 'panel');
  shop.appendChild(el('h3', 'panel-title', '🛍️ Bottega degli Accessori'));

  const mkAccRow = (key, acc) => {
    const owned = pet.accessoriesOwned.includes(key);
    const equipped = pet.accessory === key;
    const row = el('div', 'loot pickable' + (equipped ? ' equipped' : '') + (!owned && !acc.unlock ? '' : ''));
    let statusLine;
    if (owned) {
      statusLine = equipped ? '<span class="tag">✅ Equipaggiato</span>' : '<span class="muted small">Posseduto — tocca per indossare</span>';
    } else if (acc.price != null) {
      statusLine = `<span class="muted small">🪙 ${acc.price} — tocca per acquistare</span>`;
    } else {
      statusLine = `<span class="muted small">🔒 Sblocca con: ${acc.unlock.label}</span>`;
    }
    row.innerHTML = `<div class="loot-body">
      <div class="loot-head"><b>${acc.icon} ${acc.name}</b></div>
      <div class="small acc-effect-desc">${esc(acc.desc)}</div>
      <div style="margin-top:4px">${statusLine}</div>
    </div>`;
    if (owned || acc.price != null) {
      row.addEventListener('click', () => {
        const r = RPG.buyAccessory(HERO, key);
        persist();
        if (r && r.ok) { toast(equipped ? `${acc.icon} Rimosso` : `${acc.icon} Equipaggiato!`); renderHUD(); }
        else toast(r);
        setTab('camp');
      });
    }
    return row;
  };

  const buyables   = Object.entries(RPG.PET_ACCESSORIES).filter(([, a]) => a.price != null);
  const earnables  = Object.entries(RPG.PET_ACCESSORIES).filter(([, a]) => a.price == null);

  const buyGrid = el('div', 'loot-list');
  buyables.forEach(([key, acc]) => buyGrid.appendChild(mkAccRow(key, acc)));
  shop.appendChild(buyGrid);

  shop.appendChild(el('h4', 'section-title', '🏆 Accessori Guadagnati'));
  const earnGrid = el('div', 'loot-list');
  earnables.forEach(([key, acc]) => earnGrid.appendChild(mkAccRow(key, acc)));
  shop.appendChild(earnGrid);

  c.appendChild(shop);
}

function checkPetEvolution(r) {
  if (r && r.evolved) {
    vibrate([80, 40, 80, 40, 200, 60, 200]);
    playEvolutionSequence(r.stage, r.reward || {});
  }
}

function playEvolutionSequence(stage, reward) {
  const pet    = HERO.pet;
  const sp     = RPG.PET_SPECIES[pet.species];
  const isLeg  = stage >= 5;
  const stageNames = ['', 'Cucciolo', 'Giovanile', 'Adolescente', 'Adulto', 'Leggendario'];

  const overlay = el('div', 'evo-overlay');
  document.body.appendChild(overlay);

  // Costruiamo il layout (tutto nascosto all'inizio)
  overlay.innerHTML = `
    <div class="evo-rays"></div>
    <div class="evo-glow-ring"></div>
    <img  class="evo-portrait evo-hidden" src="${petImageSrc(pet)}"
          onerror="this.outerHTML='<div class=\\'evo-portrait-emoji\\' style=\\'display:none\\'>${sp.icon}</div>'"
    >
    <div class="evo-stage-label evo-hidden">${isLeg ? '⭐ FORMA LEGGENDARIA ⭐' : `— STADIO ${stage} / 5 —`}</div>
    <div class="evo-pet-name evo-hidden">${esc(pet.name)}<br><span class="evo-stage-name">${stageNames[stage] || ''}</span></div>
    <div class="evo-bonus evo-hidden">✦ ${sp.bonusDesc || ''}${isLeg ? ' (×2)' : ''}</div>
    <div class="evo-reward evo-hidden">${[
      reward.gold  ? `🪙 +${reward.gold}`  : '',
      reward.wood  ? `🌲 +${reward.wood}`  : '',
      reward.stone ? `⛏️ +${reward.stone}` : '',
    ].filter(Boolean).join('  ')}</div>
    <div class="evo-unlock evo-hidden">${reward.msg || ''}</div>
    <button class="evo-continue evo-hidden">✦ Continua ✦</button>
  `;

  // Prova a caricare il video specie-stadio; se non esiste procede subito con CSS
  const videoSrc = `assets/pet/${pet.species}/evolve_stage${stage}.mp4`;
  const video = document.createElement('video');
  video.className = 'evo-video evo-hidden';
  video.autoplay = true; video.muted = true; video.playsInline = true;
  overlay.insertBefore(video, overlay.firstChild);

  const startCssSequence = () => {
    // timeline ritardata — tutto lento e cinematico
    const show = (sel, delay) =>
      setTimeout(() => overlay.querySelector(sel)?.classList.remove('evo-hidden'), delay);

    sfx('level');
    setTimeout(() => overlay.classList.add('evo-active'), 50);
    show('.evo-portrait', 600);
    setTimeout(() => overlay.querySelector('.evo-portrait')?.classList.add('evo-portrait-in'), 700);
    show('.evo-stage-label', 1800);
    show('.evo-pet-name',    2600);
    show('.evo-bonus',       3400);
    show('.evo-reward',      4000);
    show('.evo-unlock',      4600);
    show('.evo-continue',    5400);

    if (isLeg) {
      setTimeout(() => overlay.classList.add('evo-legendary'), 2200);
      setTimeout(() => sfx('level'), 2400);
    }
  };

  video.addEventListener('ended', () => { video.remove(); startCssSequence(); });
  video.addEventListener('error', () => { video.remove(); startCssSequence(); });
  video.src = videoSrc;
  video.play().catch(() => { video.remove(); startCssSequence(); });

  // Chiudi su tap/click del pulsante o sull'overlay dopo 6 s
  overlay.querySelector('.evo-continue').addEventListener('click', closeEvo);
  function closeEvo() {
    overlay.classList.add('evo-exit');
    setTimeout(() => { overlay.remove(); renderHUD(); setTab('camp'); }, 600);
  }
}

function checkPetNotify() {
  if (Notification.permission !== 'granted' || !HERO || !HERO.pet || !HERO.pet.hatched) return;
  RPG.tickPet(HERO);
  const p = HERO.pet;
  const today = todayISO();
  if (p.hunger < 30) {
    showNotif(`🍖 ${esc(p.name)} ha fame!`, 'Il tuo famiglio è quasi affamato — nutrilo subito!', 'pet_hunger_' + today);
  }
  if (p.mood < 30) {
    showNotif(`🎾 ${esc(p.name)} è triste!`, 'Il suo umore è al minimo — giocaci un po\'!', 'pet_mood_' + today);
  }
}

function openFeedPicker() {
  let html = `<h3 class="panel-title">🍖 Scegli il pasto</h3><div class="loot-list" id="feed-picker-list"></div>
    <button class="btn wide" onclick="closeModal()">Annulla</button>`;
  modal(html);
  const list = $('#feed-picker-list');
  Object.entries(RPG.PET_FOODS).forEach(([key, food]) => {
    const row = el('div', 'loot pickable');
    row.innerHTML = `<div class="loot-body"><div class="loot-head"><b>${food.icon} ${food.name}</b></div>
      <div class="small">Sazietà +${food.restoreHunger} · 🪙 ${food.price}</div></div>`;
    row.addEventListener('click', () => {
      const r = RPG.feedPet(HERO, key);
      persist();
      closeModal();
      if (r && r.ok) { checkPetEvolution(r); toast(r.wishFulfilled ? '🎉 Desiderio esaudito!' : `${food.icon} Nutrito!`); sfx('coin'); renderHUD(); }
      else toast(r);
      setTab('camp');
    });
    list.appendChild(row);
  });
}

function renderStruttureView(c) {
  const backBtn = el('button', 'view-back-link', '‹ Rifugio');
  backBtn.addEventListener('click', () => { CAMP_VIEW = 'main'; setTab('camp'); });
  c.appendChild(backBtn);
  const cantHdrImg = document.createElement('img');
  cantHdrImg.src = 'assets/ui/rifugio/cantiere-eroe.webp';
  cantHdrImg.alt = ''; cantHdrImg.className = 'borgo-sub-header';
  cantHdrImg.onerror = () => cantHdrImg.remove();
  c.appendChild(cantHdrImg);
  c.appendChild(el('h2', 'section-title', '🏗️ Strutture dell\'Accampamento'));
  const ownedIds = (HERO.furniture && HERO.furniture.owned) || [];
  const layersOwned = RPG.CAMP_LAYER_SHOP.filter(l => ownedIds.includes(l.id)).length;
  const struttureSubLbl = el('p', 'sub-header-label',
    `${layersOwned} / 25 strutture costruite · appaiono nel panorama del tuo accampamento`);
  c.appendChild(struttureSubLbl);

  const STAGE_NAMES = ['Accampamento', 'Avamposto', 'Rifugio', 'Fortilizio', 'Cittadella'];
  const STAGE_MIN_LEVELS = [0, 10, 20, 30, 40];

  for (let stage = 0; stage <= 4; stage++) {
    const items = RPG.CAMP_LAYER_SHOP.filter(l => l.stage === stage);
    const stageUnlocked = HERO.level >= STAGE_MIN_LEVELS[stage];
    const stageOwned = items.filter(l => ownedIds.includes(l.id)).length;
    const stageComplete = stageOwned === items.length;

    const stagePanel = el('div', 'panel' + (!stageUnlocked ? ' locked' : '') + (stageComplete ? ' complete' : ''));
    stagePanel.innerHTML = `
      <div class="furniture-set-head">
        <div class="furniture-set-icon">${stageUnlocked ? (stageComplete ? '✅' : '🏗️') : '🔒'}</div>
        <div class="furniture-set-mid">
          <b>Stage ${stage}: ${STAGE_NAMES[stage]}</b>
          <div class="small muted">Livello ${STAGE_MIN_LEVELS[stage]}+</div>
          <div class="small">${stageUnlocked ? `${stageOwned} / ${items.length} strutture${stageComplete ? ' — Completato!' : ''}` : `Sbloccato al Livello ${STAGE_MIN_LEVELS[stage]}`}</div>
        </div>
      </div>`;
    if (stageUnlocked) {
      stagePanel.classList.add('pickable');
      stagePanel.addEventListener('click', () => openStruttureStageModal(stage));
    }
    c.appendChild(stagePanel);
  }
}

function openStruttureStageModal(stage) {
  const STAGE_NAMES = ['Accampamento', 'Avamposto', 'Rifugio', 'Fortilizio', 'Cittadella'];
  const items = RPG.CAMP_LAYER_SHOP.filter(l => l.stage === stage);
  const ownedIds = (HERO.furniture && HERO.furniture.owned) || [];
  const owned = items.filter(l => ownedIds.includes(l.id)).length;

  let html = `<h3 class="panel-title">🏗️ Stage ${stage}: ${STAGE_NAMES[stage]}</h3>
    <p class="small muted center">${owned}/${items.length} strutture costruite</p>
    <div class="loot-list" id="strutture-item-list"></div>
    <button class="btn wide" onclick="closeModal()">Chiudi</button>`;
  modal(html);

  const list = $('#strutture-item-list');
  items.forEach(it => {
    const has = ownedIds.includes(it.id);
    const locked = HERO.level < it.minLevel;
    const row = el('div', 'loot loot-with-img furniture-item-row' + (has ? ' equipped' : '') + (locked ? ' locked' : ''));
    const imgSrc = `assets/rifugio/scene/${it.id}.webp`;
    row.innerHTML = `
      <img class="item-icon-big" src="${imgSrc}" onerror="this.style.display='none'">
      <div class="loot-body">
        <div class="loot-head"><b>${esc(it.name)}</b>${has ? ' ✅' : ''}</div>
        <div class="small muted">Livello ${it.minLevel}+</div>
        <div class="small">${
          has ? 'Costruita' :
          locked ? `🔒 Richiede Livello ${it.minLevel}` :
          `🌲 ${it.price.wood} · ⛏️ ${it.price.stone}`
        }</div>
      </div>`;
    if (has) {
      const demolishBtn = el('button', 'btn btn-small strutture-demolish-btn', '🗑️ Demolisci');
      demolishBtn.addEventListener('click', e => {
        e.stopPropagation();
        HERO.furniture.owned = HERO.furniture.owned.filter(id => id !== it.id);
        persist(); renderHUD();
        toast(`${it.icon} ${it.name} rimossa dal campo.`);
        closeModal(); openStruttureStageModal(stage);
      });
      row.querySelector('.loot-body').appendChild(demolishBtn);
    } else if (!locked) {
      const hasFreeLayer = HERO.consumableBuffs && HERO.consumableBuffs.freeLayer;
      if (hasFreeLayer) {
        const freeTag = el('span', 'free-layer-tag', '🏰 GRATIS (Progetto)');
        row.querySelector('.loot-body').appendChild(freeTag);
      }
      row.classList.add('pickable');
      row.addEventListener('click', () => {
        if (hasFreeLayer) {
          HERO.consumableBuffs.freeLayer = false;
          if (!HERO.furniture) HERO.furniture = { owned: [] };
          HERO.furniture.owned.push(it.id);
          persist(); renderHUD(); sfx('coin');
          toast(`🏰 ${it.name} costruita gratis grazie al Progetto del Castello!`);
          closeModal(); openStruttureStageModal(stage);
          return;
        }
        const r = RPG.buyCampLayer(HERO, it.id);
        persist();
        if (r && r.ok) {
          toast(`${it.icon} ${it.name} costruita!`);
          sfx('coin'); renderHUD(); closeModal(); openStruttureStageModal(stage);
        } else {
          toast(r);
        }
      });
    }
    list.appendChild(row);
  });
}

function renderArredamentoView(c) {
  const backBtn = el('button', 'view-back-link', '‹ Rifugio');
  backBtn.addEventListener('click', () => { CAMP_VIEW = 'main'; setTab('camp'); });
  c.appendChild(backBtn);
  const arredHdrImg = document.createElement('img');
  arredHdrImg.src = 'assets/ui/rifugio/bottega-arredamento.webp';
  arredHdrImg.alt = ''; arredHdrImg.className = 'borgo-sub-header';
  arredHdrImg.onerror = () => arredHdrImg.remove();
  c.appendChild(arredHdrImg);
  c.appendChild(el('h2', 'section-title', ptIcon('assets/ui/rifugio/arredamento.webp', 'Bottega dell\'Arredamento', '🏛️')));
  const totalOwned = (HERO.furniture && HERO.furniture.owned.length) || 0;
  c.appendChild(el('p', 'sub-header-label center', `${totalOwned} / 200 cimeli raccolti in tutto il regno`));

  RPG.FURNITURE_SETS.slice()
    .sort((a, b) => RPG.BIOMES[a.biomeIdx].min - RPG.BIOMES[b.biomeIdx].min)
    .forEach(s => {
    const biome = RPG.BIOMES[s.biomeIdx];
    const unlocked = HERO.level >= biome.min;
    const owned = RPG.furnitureSetOwnedCount(HERO, s.id);
    const complete = owned === 10;
    const row = el('div', 'panel furniture-set-row' + (complete ? ' complete' : '') + (!unlocked ? ' locked' : ''));
    const thumbSrc = s.items.find(it => it.img)?.img;
    const thumbHtml = (!unlocked)
      ? `<div class="furniture-set-icon locked-icon">🔒</div>`
      : (thumbSrc
        ? `<img class="furniture-set-icon" src="${thumbSrc}" onerror="this.outerHTML='<div class=&quot;furniture-set-icon&quot;>${s.fallbackIcon}</div>'">`
        : `<div class="furniture-set-icon">${s.fallbackIcon}</div>`);
    row.innerHTML = `
      <div class="furniture-set-head">
        ${thumbHtml}
        <div class="furniture-set-mid">
          <b>${esc(s.name)}</b>
          <div class="small muted">${esc(biome.name)} · Liv. ${biome.min}+</div>
          ${unlocked
            ? `<div class="small">${owned} / 10 pezzi${complete ? ' ✅ <b>Set completo!</b>' : ''}</div>`
            : `<div class="small muted">Sbloccato al Livello ${biome.min}</div>`}
        </div>
      </div>
      <div class="small ${complete ? 'set-bonus-active' : 'muted'}">🎁 Bonus Set: ${esc(s.setBonusDesc)}</div>`;
    if (unlocked) {
      row.classList.add('pickable');
      row.addEventListener('click', () => openFurnitureSetModal(s.id));
    }
    c.appendChild(row);
  });
}

function openFurnitureSetModal(setId) {
  const s = RPG.furnitureSetById(setId);
  const biome = RPG.BIOMES[s.biomeIdx];
  const owned = RPG.furnitureSetOwnedCount(HERO, s.id);
  const complete = owned === 10;
  let html = `<h3 class="panel-title">${s.fallbackIcon} ${esc(s.name)}</h3>
    <p class="small muted center">${esc(biome.name)} · ${owned}/10 pezzi</p>
    <p class="small center ${complete ? 'set-bonus-active' : ''}">🎁 Bonus Set: ${esc(s.setBonusDesc)}${complete ? ' — ATTIVO!' : ''}</p>
    <div class="loot-list" id="furniture-item-list"></div>
    <button class="btn wide" onclick="closeModal()">Chiudi</button>`;
  modal(html);
  const list = $('#furniture-item-list');
  const ownedIds = (HERO.furniture && HERO.furniture.owned) || [];
  s.items.forEach(it => {
    const has = ownedIds.includes(it.id);
    const row = el('div', 'loot loot-with-img furniture-item-row' + (has ? ' equipped' : '') + (it.epic ? ' rar-leggendario' : ''));
    const imgHtml = it.img
      ? `<img class="item-icon-big" src="${it.img}" onerror="this.style.visibility='hidden'">`
      : `<span class="item-icon-big furniture-fallback-icon">${s.fallbackIcon}</span>`;
    row.innerHTML = `${imgHtml}<div class="loot-body">
      <div class="loot-head"><b>${esc(it.name)}</b>${it.epic ? ' <span class="tag">EPICO</span>' : ''}${has ? ' ✅' : ''}</div>
      <div class="small muted">${esc(it.bonusText)}</div>
      <div class="small">${has ? 'Posseduto' : `🪙 ${it.price.gold} · 🌲 ${it.price.wood} · ⛏️ ${it.price.stone}`}</div>
    </div>`;
    if (!has) {
      row.classList.add('pickable');
      row.addEventListener('click', () => {
        const r = RPG.buyFurniture(HERO, setId, it.id);
        persist();
        if (r && r.ok) {
          toast(r.setComplete ? `🎉 ${it.name} acquisito — SET COMPLETO! Bonus attivo!` : `${it.name} acquisito!`);
          sfx('coin');
          renderHUD();
          closeModal();
          openFurnitureSetModal(setId);
        } else {
          toast(r);
        }
      });
    }
    list.appendChild(row);
  });
}

/* ── TAB: Mappa ── */
/* Esegue fn() in sicurezza: se lancia un'eccezione, logga e prosegue
   così un blocco rotto non impedisce il rendering di quelli successivi. */
