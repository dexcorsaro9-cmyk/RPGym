// app-live.js — Sistema Spedizione GPS Live
// Dipende da: game.js, app-core.js, app-train.js

/* ═══════════════════════════════════════════════════════
   STATO GLOBALE
═══════════════════════════════════════════════════════ */
let LIVE_WK = null;

/* ═══════════════════════════════════════════════════════
   CATALOGO EVENTI IN-GAME
═══════════════════════════════════════════════════════ */
const LW_EVENTS = [
  { type:'villain',   icon:'🐺', name:'Lupo della Steppa',      km:0.20, xp:15, gold:8,  text:'Corri {km} km per sconfiggerlo!' },
  { type:'villain',   icon:'🗡️', name:'Brigante della Strada',   km:0.25, xp:20, gold:12, text:'Corri {km} km per eliminarlo!' },
  { type:'villain',   icon:'🐗', name:'Cinghiale Feroce',        km:0.30, xp:25, gold:10, text:'Corri {km} km per abbatterlo!' },
  { type:'villain',   icon:'💀', name:'Non Morto Errante',       km:0.35, xp:30, gold:15, text:'Corri {km} km per fermarlo!' },
  { type:'villain',   icon:'🧌', name:"Orco della Foresta",      km:0.40, xp:40, gold:22, text:'Corri {km} km per sconfiggerlo!' },
  { type:'villain',   icon:'🐍', name:'Basilisco Antico',        km:0.30, xp:35, gold:18, text:'Corri {km} km per sfuggire al suo sguardo!' },
  { type:'villain',   icon:'🕷️', name:'Ragno Gigante',           km:0.20, xp:18, gold:10, text:'Corri {km} km per uscire dalla ragnatela!' },
  { type:'merchant',  icon:'🛒', name:'Mercante Fuggiasco',      km:0.50, xp:0,  gold:40, text:'Corri {km} km per raggiungerlo!' },
  { type:'merchant',  icon:'🧪', name:'Alchimista Errante',      km:0.40, xp:25, gold:28, text:'Corri {km} km prima che sparisca!' },
  { type:'merchant',  icon:'📦', name:'Contrabbandiere',         km:0.35, xp:10, gold:35, text:'Corri {km} km per fermarlo!' },
  { type:'escape',    icon:'🏇', name:'Cavalieri Oscuri',        km:0.30, xp:10, gold:20, text:'Corri {km} km per sfuggire!' },
  { type:'escape',    icon:'🐉', name:'Drago Incalzante',        km:0.50, xp:35, gold:0,  text:'Corri {km} km o vieni bruciato!' },
  { type:'escape',    icon:'🌪️', name:'Tempesta di Cenere',      km:0.25, xp:15, gold:15, text:'Corri {km} km per metterti al riparo!' },
  { type:'discovery', icon:'💎', name:'Gemma Nascosta',          km:0.15, xp:10, gold:15, text:'Corri {km} km per raccoglierla!' },
  { type:'discovery', icon:'📜', name:'Pergamena Antica',        km:0.20, xp:30, gold:0,  text:'Corri {km} km per afferrarla!' },
  { type:'discovery', icon:'🍄', name:'Fungo Magico',            km:0.10, xp:5,  gold:12, text:'Corri {km} km per raccoglierlo!' },
  { type:'discovery', icon:'🪙', name:'Sacchetto di Monete',     km:0.15, xp:0,  gold:25, text:'Corri {km} km per prenderlo!' },
];

const LW_EV_KM_MIN = 0.40;
const LW_EV_KM_MAX = 0.90;

/* ═══════════════════════════════════════════════════════
   HAVERSINE (km tra due coordinate GPS)
═══════════════════════════════════════════════════════ */
function lwHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ═══════════════════════════════════════════════════════
   RACCOLTA MISSIONI ATTIVE
═══════════════════════════════════════════════════════ */
function lwGetMissions() {
  const ms = [];

  // Boss settimanale
  try { RPG.rolloverWeeklyBoss(HERO); } catch(_) {}
  if (HERO.weeklyBoss && !HERO.weeklyBoss.claimed) {
    const wb = HERO.weeklyBoss;
    const rem = Math.max(0, wb.km - wb.progressKm);
    if (rem > 0) {
      ms.push({ id:'weekly-boss', icon:'👹', name: wb.name,
        desc: `Infliggi ${rem.toFixed(1)} km di danni al boss`,
        prog: wb.progressKm, total: wb.km,
        rewardHint: `${wb.gold} oro + Forziere Leggendario`,
        color:'#c0392b' });
    }
  }

  // Mappa del tesoro
  if (HERO.treasureMap) {
    const STAGES = [8, 22, 45];
    const prog = HERO.treasureMap.progressKm || 0;
    const nextStage = STAGES.find(s => prog < s);
    if (nextStage !== undefined) {
      ms.push({ id:'treasure-map', icon:'🗺️', name:'Mappa del Tesoro',
        desc: `Prossima tappa: ${nextStage} km totali`,
        prog, total: nextStage,
        rewardHint: 'Forziere del Tesoro',
        color:'#d4ac0d' });
    }
  }

  // Incursione del giorno
  if (HERO.incursion && !HERO.incursion.done) {
    const inc = HERO.incursion;
    const rem = Math.max(0, (inc.km || 10) - (inc.progressKm || 0));
    ms.push({ id:'incursion', icon:'⚔️', name: `Incursione: ${inc.name}`,
      desc: `${inc.enemy} — ${rem.toFixed(1)} km rimasti`,
      prog: inc.progressKm || 0, total: inc.km || 10,
      rewardHint: 'Forziere Incursione',
      color:'#8e44ad' });
  }

  // Bacheca: commissioni km del giorno
  try { RPG.generateDailyBoard(HERO); } catch(_) {}
  if (HERO.board && HERO.board.quests) {
    const claimed = HERO.board.claimed || [];
    const today = new Date().toISOString().slice(0, 10);
    const todayKm = (HERO.log || [])
      .filter(l => l.date && l.date.slice(0, 10) === today)
      .reduce((s, l) => s + l.km, 0);
    HERO.board.quests.forEach((q, i) => {
      if (!claimed.includes(i) && todayKm < q.km) {
        const tierIcon = { commissione:'📋', incarico:'📋', missione:'📜' }[q.tier] || '📋';
        ms.push({ id: `board-${i}`, icon: tierIcon,
          name: `${q.tier.charAt(0).toUpperCase() + q.tier.slice(1)} della Bacheca`,
          desc: `Percorri ${q.km} km oggi (fatti ${todayKm.toFixed(1)})`,
          prog: todayKm, total: q.km,
          rewardHint: `${q.reward.gold} oro`,
          color:'#27ae60' });
      }
    });
  }

  return ms;
}

/* ═══════════════════════════════════════════════════════
   ENTRY POINT — apre il flusso live workout
═══════════════════════════════════════════════════════ */
function openLiveWorkout() {
  if (!('geolocation' in navigator)) {
    toast('❌ GPS non disponibile su questo dispositivo.');
    return;
  }
  if (LIVE_WK) {
    toast('Una spedizione è già in corso!');
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'lw-overlay';
  overlay.className = 'lw-overlay';
  document.body.appendChild(overlay);
  lwShowMissionSelect(overlay);
}

/* ═══════════════════════════════════════════════════════
   FASE 1 — Selezione Missione
═══════════════════════════════════════════════════════ */
function lwShowMissionSelect(overlay) {
  const missions = lwGetMissions();

  const cardsHtml = missions.map((m, i) => {
    const pct = m.total > 0 ? Math.min(100, Math.round(m.prog / m.total * 100)) : 0;
    const remKm = Math.max(0, m.total - m.prog).toFixed(1);
    return `
    <div class="lw-ms-card" data-idx="${i}" style="--mc:${m.color}">
      <div class="lw-ms-card-left">
        <div class="lw-ms-card-icon">${m.icon}</div>
      </div>
      <div class="lw-ms-card-body">
        <div class="lw-ms-card-name">${esc(m.name)}</div>
        <div class="lw-ms-card-desc">${esc(m.desc)}</div>
        <div class="lw-ms-bar-wrap">
          <div class="lw-ms-bar-fill" style="width:${pct}%;background:var(--mc)"></div>
        </div>
        <div class="lw-ms-card-meta"><span>${pct}% completato</span><span>🎁 ${esc(m.rewardHint)}</span></div>
      </div>
      <div class="lw-ms-check" id="lw-ck-${i}"></div>
    </div>`;
  }).join('');

  overlay.innerHTML = `
    <div class="lw-ms-screen">
      <div class="lw-ms-topbar">
        <button class="lw-topbar-close" id="lw-ms-close">✕</button>
        <span class="lw-topbar-title">Scegli la Spedizione</span>
        <span></span>
      </div>
      <div class="lw-ms-subtitle">Quale missione vuoi completare oggi?</div>
      <div class="lw-ms-list">
        ${missions.length === 0 ? '<div class="lw-ms-empty">Nessuna missione attiva al momento.</div>' : cardsHtml}
        <div class="lw-ms-card lw-ms-card-free" data-idx="free">
          <div class="lw-ms-card-left">
            <div class="lw-ms-card-icon">🏃</div>
          </div>
          <div class="lw-ms-card-body">
            <div class="lw-ms-card-name">Spedizione Libera</div>
            <div class="lw-ms-card-desc">Nessun obiettivo specifico — corri e guadagna XP e oro</div>
            <div class="lw-ms-card-meta"><span>Sempre disponibile</span><span>🎁 Loot base</span></div>
          </div>
          <div class="lw-ms-check" id="lw-ck-free"></div>
        </div>
      </div>
      <div class="lw-ms-footer">
        <button class="lw-ms-start-btn" id="lw-ms-btn" disabled>
          <img src="assets/ui/train/btn-allenati.webp" class="lw-ms-btn-img" alt="Allenati">
          <span class="lw-ms-btn-label" id="lw-ms-btn-lbl">Seleziona una missione</span>
        </button>
      </div>
    </div>`;

  let selectedMission = null;

  overlay.querySelectorAll('.lw-ms-card').forEach(card => {
    card.addEventListener('click', () => {
      overlay.querySelectorAll('.lw-ms-card').forEach(c => c.classList.remove('lw-ms-selected'));
      card.classList.add('lw-ms-selected');
      const idx = card.dataset.idx;
      selectedMission = idx === 'free' ? null : missions[parseInt(idx)];
      const btn = overlay.querySelector('#lw-ms-btn');
      btn.disabled = false;
      const lbl = overlay.querySelector('#lw-ms-btn-lbl');
      lbl.textContent = selectedMission ? `Inizia: ${selectedMission.name}` : 'Inizia Spedizione Libera';
    });
  });

  overlay.querySelector('#lw-ms-close').addEventListener('click', () => overlay.remove());

  overlay.querySelector('#lw-ms-btn').addEventListener('click', () => {
    lwShowCountdown(overlay, selectedMission, missions);
  });
}

/* ═══════════════════════════════════════════════════════
   FASE 2 — Countdown 3-2-1
═══════════════════════════════════════════════════════ */
function lwShowCountdown(overlay, mission, allMissions) {
  overlay.innerHTML = `
    <div class="lw-cd-screen">
      <div class="lw-cd-mission-label">${mission ? `${mission.icon} ${esc(mission.name)}` : '🏃 Spedizione Libera'}</div>
      <div class="lw-cd-ring">
        <div class="lw-cd-num" id="lw-cd-num">3</div>
      </div>
      <div class="lw-cd-go" id="lw-cd-go"></div>
    </div>`;

  const numEl = overlay.querySelector('#lw-cd-num');
  const goEl  = overlay.querySelector('#lw-cd-go');
  let count = 3;

  function pop() {
    numEl.classList.remove('lw-cd-pop');
    void numEl.offsetWidth;
    numEl.classList.add('lw-cd-pop');
  }
  pop();

  const tick = () => {
    count--;
    if (count > 0) {
      numEl.textContent = count;
      pop();
      setTimeout(tick, 1000);
    } else {
      numEl.textContent = '💪';
      goEl.textContent = 'VAI!';
      goEl.classList.add('lw-cd-go-show');
      pop();
      setTimeout(() => lwStartTracking(overlay, mission, allMissions), 900);
    }
  };
  setTimeout(tick, 1000);
}

/* ═══════════════════════════════════════════════════════
   FASE 3 — Tracking GPS Live
═══════════════════════════════════════════════════════ */
function lwStartTracking(overlay, mission, allMissions) {
  LIVE_WK = {
    mission, allMissions,
    startTime: Date.now(),
    totalKm: 0,
    positions: [],
    nextEventAt: LW_EV_KM_MIN + Math.random() * (LW_EV_KM_MAX - LW_EV_KM_MIN),
    currentEvent: null,
    eventStartKm: 0,
    bonusXp: 0,
    bonusGold: 0,
    completedEvents: [],
    watchId: null,
    map: null,
    heroMarker: null,
    routeLine: null,
    timerIv: null,
    eventMarkers: [],
  };

  overlay.innerHTML = `
    <div class="lw-track-screen">
      <div id="lw-map" class="lw-map"></div>

      <!-- Evento attivo -->
      <div class="lw-ev-card" id="lw-ev-card" hidden>
        <div class="lw-ev-inner">
          <div class="lw-ev-top">
            <span class="lw-ev-icon" id="lw-ev-icon">⚔️</span>
            <div class="lw-ev-info">
              <div class="lw-ev-name" id="lw-ev-name"></div>
              <div class="lw-ev-action" id="lw-ev-action"></div>
            </div>
          </div>
          <div class="lw-ev-bar-wrap">
            <div class="lw-ev-bar" id="lw-ev-bar" style="width:0%"></div>
          </div>
          <div class="lw-ev-prog" id="lw-ev-prog">0.00 / 0.00 km</div>
        </div>
      </div>

      <!-- HUD inferiore -->
      <div class="lw-hud">
        <div class="lw-hud-stats">
          <div class="lw-hud-stat">
            <div class="lw-hud-val" id="lw-km">0.00</div>
            <div class="lw-hud-key">KM</div>
          </div>
          <div class="lw-hud-stat lw-hud-center">
            <div class="lw-hud-val" id="lw-time">00:00</div>
            <div class="lw-hud-key">TEMPO</div>
          </div>
          <div class="lw-hud-stat">
            <div class="lw-hud-val" id="lw-pace">--:--</div>
            <div class="lw-hud-key">MIN/KM</div>
          </div>
        </div>
        <div class="lw-hud-sub">
          <span class="lw-hud-chip">✨ <span id="lw-xp">0</span> XP</span>
          <span class="lw-hud-chip">🪙 <span id="lw-gold">0</span></span>
          ${mission ? `<span class="lw-hud-chip">${mission.icon} <span id="lw-qpct">0%</span></span>` : ''}
          <span class="lw-hud-chip" id="lw-ev-count">0 eventi</span>
        </div>
        <button class="lw-stop-btn" id="lw-stop-btn">🏁 Termina Spedizione</button>
      </div>
    </div>`;

  // Leaflet map
  const mapEl = overlay.querySelector('#lw-map');

  if (typeof L === 'undefined') {
    mapEl.innerHTML = '<div class="lw-map-fallback">📍 GPS attivo — mappa non disponibile.<br>I km vengono tracciati correttamente.</div>';
  } else {
    try {
      const map = L.map(mapEl, { zoomControl: false, attributionControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      mapEl.style.filter = 'sepia(40%) brightness(0.85) contrast(1.1)';
      const routeLine = L.polyline([], { color: '#C8943A', weight: 5, opacity: 0.9 }).addTo(map);
      LIVE_WK.map = map;
      LIVE_WK.routeLine = routeLine;
    } catch (_) {
      mapEl.innerHTML = '<div class="lw-map-fallback">📍 GPS attivo — mappa non disponibile.<br>I km vengono tracciati correttamente.</div>';
    }
  }

  // Timer ogni secondo
  LIVE_WK.timerIv = setInterval(() => lwTickTimer(overlay), 1000);

  // GPS watch
  LIVE_WK.watchId = navigator.geolocation.watchPosition(
    pos => lwOnPosition(pos, overlay),
    err => {
      if (err.code === err.PERMISSION_DENIED) toast('❌ Permesso GPS negato.');
    },
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
  );

  overlay.querySelector('#lw-stop-btn').addEventListener('click', () => lwEndWorkout(overlay));
}

/* ── Timer ─────────────────────────────────────────────── */
function lwTickTimer(overlay) {
  if (!LIVE_WK) return;
  const sec = Math.floor((Date.now() - LIVE_WK.startTime) / 1000);
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  const el = overlay.querySelector('#lw-time');
  if (el) el.textContent = `${mm}:${ss}`;
}

/* ── Nuova posizione GPS ────────────────────────────────── */
function lwOnPosition(pos, overlay) {
  if (!LIVE_WK) return;
  const { latitude: lat, longitude: lon, accuracy } = pos.coords;
  if (accuracy > 60) return; // Ignora posizioni troppo imprecise

  const positions = LIVE_WK.positions;

  if (positions.length === 0) {
    // Prima posizione
    if (LIVE_WK.map) {
      LIVE_WK.map.setView([lat, lon], 17);
      LIVE_WK.heroMarker = L.marker([lat, lon], {
        icon: L.divIcon({
          html: `<div class="lw-hero-dot">${HERO.avatar || '🧝'}</div>`,
          className: '', iconSize: [40, 40], iconAnchor: [20, 20],
        })
      }).addTo(LIVE_WK.map);
    }
  } else {
    const prev = positions[positions.length - 1];
    const delta = lwHaversine(prev[0], prev[1], lat, lon);

    // Filtra salti anomali (>100m tra update consecutivi)
    if (delta >= 0 && delta < 0.10) {
      LIVE_WK.totalKm += delta;

      // Aggiorna evento in corso
      if (LIVE_WK.currentEvent) {
        const done = LIVE_WK.totalKm - LIVE_WK.eventStartKm;
        lwUpdateEventProgress(done, overlay);
      }

      // Scatena nuovo evento se soglia raggiunta
      if (!LIVE_WK.currentEvent && LIVE_WK.totalKm >= LIVE_WK.nextEventAt) {
        lwTriggerEvent(lat, lon, overlay);
      }

      // Aggiorna HUD e marker
      lwUpdateHUD(overlay);
      if (LIVE_WK.heroMarker) LIVE_WK.heroMarker.setLatLng([lat, lon]);
      if (LIVE_WK.map) LIVE_WK.map.panTo([lat, lon], { animate: true, duration: 0.8 });
    }
  }

  positions.push([lat, lon]);
  if (LIVE_WK.routeLine) LIVE_WK.routeLine.setLatLngs(positions);
}

/* ── HUD update ─────────────────────────────────────────── */
function lwUpdateHUD(overlay) {
  const km    = LIVE_WK.totalKm;
  const elMin = (Date.now() - LIVE_WK.startTime) / 60000;

  const $ = id => overlay.querySelector('#' + id);

  const kmEl = $('lw-km');
  if (kmEl) kmEl.textContent = km.toFixed(2);

  const paceEl = $('lw-pace');
  if (paceEl && km > 0.05 && elMin > 0) {
    const p = elMin / km;
    paceEl.textContent = `${String(Math.floor(p)).padStart(2,'0')}:${String(Math.floor((p%1)*60)).padStart(2,'0')}`;
  }

  const estXp   = Math.round(km * 30) + LIVE_WK.bonusXp;
  const estGold = Math.round(km * RPG.GOLD_PER_KM) + LIVE_WK.bonusGold;
  const xpEl    = $('lw-xp');   if (xpEl) xpEl.textContent = estXp;
  const goldEl  = $('lw-gold'); if (goldEl) goldEl.textContent = estGold;

  const qEl = $('lw-qpct');
  if (qEl && LIVE_WK.mission) {
    const m = LIVE_WK.mission;
    const pct = Math.min(100, Math.round((m.prog + km) / m.total * 100));
    qEl.textContent = `${pct}%`;
  }

  const evCnt = $('lw-ev-count');
  if (evCnt) {
    const n = LIVE_WK.completedEvents.length;
    evCnt.textContent = `${n} event${n === 1 ? 'o' : 'i'}`;
  }
}

/* ── Scatena evento ─────────────────────────────────────── */
function lwTriggerEvent(lat, lon, overlay) {
  const def = LW_EVENTS[Math.floor(Math.random() * LW_EVENTS.length)];
  LIVE_WK.currentEvent = { ...def, kmDone: 0 };
  LIVE_WK.eventStartKm = LIVE_WK.totalKm;
  LIVE_WK.nextEventAt  = LIVE_WK.totalKm
    + LW_EV_KM_MIN + Math.random() * (LW_EV_KM_MAX - LW_EV_KM_MIN);

  const card    = overlay.querySelector('#lw-ev-card');
  const iconEl  = overlay.querySelector('#lw-ev-icon');
  const nameEl  = overlay.querySelector('#lw-ev-name');
  const actEl   = overlay.querySelector('#lw-ev-action');
  const barEl   = overlay.querySelector('#lw-ev-bar');
  const progEl  = overlay.querySelector('#lw-ev-prog');

  iconEl.textContent = def.icon;
  nameEl.textContent = def.name;
  actEl.textContent  = def.text.replace('{km}', def.km.toFixed(2));
  barEl.style.width  = '0%';
  progEl.textContent = `0.00 / ${def.km.toFixed(2)} km`;

  card.hidden = false;
  card.classList.remove('lw-ev-win');
  void card.offsetWidth;
  card.classList.add('lw-ev-enter');

  // Marker sulla mappa
  if (LIVE_WK.map && typeof L !== 'undefined') {
    const m = L.marker([lat, lon], {
      icon: L.divIcon({
        html: `<div class="lw-ev-map-pin">${def.icon}</div>`,
        className: '', iconSize: [36, 36], iconAnchor: [18, 18],
      })
    }).addTo(LIVE_WK.map);
    LIVE_WK.eventMarkers.push(m);
  }

  if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
}

/* ── Aggiorna progresso evento ──────────────────────────── */
function lwUpdateEventProgress(done, overlay) {
  const ev = LIVE_WK.currentEvent;
  if (!ev) return;

  const pct    = Math.min(100, done / ev.km * 100);
  const barEl  = overlay.querySelector('#lw-ev-bar');
  const progEl = overlay.querySelector('#lw-ev-prog');

  if (barEl) barEl.style.width = `${pct}%`;
  if (progEl) progEl.textContent = `${done.toFixed(2)} / ${ev.km.toFixed(2)} km`;

  if (done >= ev.km) lwCompleteEvent(overlay);
}

/* ── Completa evento ────────────────────────────────────── */
function lwCompleteEvent(overlay) {
  const ev = LIVE_WK.currentEvent;
  if (!ev) return;

  LIVE_WK.bonusXp   += ev.xp;
  LIVE_WK.bonusGold += ev.gold;
  LIVE_WK.completedEvents.push({ ...ev });
  LIVE_WK.currentEvent = null;

  const card = overlay.querySelector('#lw-ev-card');
  if (card) {
    card.classList.add('lw-ev-win');
    setTimeout(() => { card.hidden = true; card.classList.remove('lw-ev-win', 'lw-ev-enter'); }, 1800);
  }

  if (navigator.vibrate) navigator.vibrate([80, 40, 120, 40, 200]);

  const loot = [];
  if (ev.xp)   loot.push(`+${ev.xp} XP`);
  if (ev.gold)  loot.push(`+${ev.gold} 🪙`);
  toast(`${ev.icon} ${ev.name} — ${loot.join(' · ')}!`);
}

/* ═══════════════════════════════════════════════════════
   FINE WORKOUT
═══════════════════════════════════════════════════════ */
function lwEndWorkout(overlay) {
  if (!LIVE_WK) return;

  navigator.geolocation.clearWatch(LIVE_WK.watchId);
  clearInterval(LIVE_WK.timerIv);

  const km       = LIVE_WK.totalKm;
  const elapsed  = Math.round((Date.now() - LIVE_WK.startTime) / 1000); // secondi
  const mission  = LIVE_WK.mission;
  const events   = LIVE_WK.completedEvents;
  const bonusXp  = LIVE_WK.bonusXp;
  const bonusGold= LIVE_WK.bonusGold;

  if (km < 0.05) {
    LIVE_WK = null;
    overlay.remove();
    toast('Spedizione troppo breve — nessun progresso salvato.');
    return;
  }

  lwShowSummary(overlay, km, elapsed, mission, events, bonusXp, bonusGold);
}

/* ── Loot da missione in base alla % di completamento ───── */
function lwMissionLoot(mission, kmDone) {
  if (!mission) return null;
  const pct = Math.min(100, Math.round((mission.prog + kmDone) / mission.total * 100));

  if (pct < 25) {
    return { tier: 'scarso', icon: '💨', label: `${pct}% — Nessun loot missione`, gold: 0, xp: 0 };
  }
  if (pct < 50) {
    const gold = Math.round(mission.total * 5 * (pct / 100));
    return { tier: 'basso', icon: '🥉', label: `${pct}% — Loot parziale`, gold, xp: Math.round(gold * 0.8) };
  }
  if (pct < 75) {
    const gold = Math.round(mission.total * 8 * (pct / 100));
    return { tier: 'medio', icon: '🥈', label: `${pct}% — Buon loot`, gold, xp: Math.round(gold * 1.0), item: true };
  }
  if (pct < 100) {
    const gold = Math.round(mission.total * 12 * (pct / 100));
    return { tier: 'alto', icon: '🥇', label: `${pct}% — Ottimo loot`, gold, xp: Math.round(gold * 1.2), item: true, chest: false };
  }
  // 100%
  const gold = Math.round(mission.total * 15);
  return { tier: 'completo', icon: '🏆', label: '100% — MISSIONE COMPLETATA!', gold, xp: Math.round(gold * 1.5), item: true, chest: true };
}

/* ── Schermata Riepilogo ────────────────────────────────── */
function lwShowSummary(overlay, km, elapsed, mission, events, bonusXp, bonusGold) {
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const pace = km > 0 ? elapsed / 60 / km : 0;
  const pm = String(Math.floor(pace)).padStart(2, '0');
  const ps = String(Math.floor((pace % 1) * 60)).padStart(2, '0');
  const missionLoot = lwMissionLoot(mission, km);
  const pct = mission
    ? Math.min(100, Math.round((mission.prog + km) / mission.total * 100)) : null;

  const evHtml = events.map(e =>
    `<div class="lw-sum-ev"><span>${e.icon} ${esc(e.name)}</span><span class="lw-sum-ev-r">${e.xp ? `+${e.xp}XP ` : ''}${e.gold ? `+${e.gold}🪙` : ''}</span></div>`
  ).join('');

  const mLootHtml = missionLoot && missionLoot.gold > 0 ? `
    <div class="lw-sum-mloot">
      <div class="lw-sum-mloot-tier">${missionLoot.icon} ${esc(missionLoot.label)}</div>
      ${missionLoot.gold ? `<div class="lw-sum-bonus-row"><span>Oro missione</span><span>+${missionLoot.gold} 🪙</span></div>` : ''}
      ${missionLoot.xp   ? `<div class="lw-sum-bonus-row"><span>XP missione</span><span>+${missionLoot.xp} ✨</span></div>` : ''}
      ${missionLoot.chest ? '<div class="lw-sum-bonus-row"><span>Forziere missione</span><span>📦</span></div>' : ''}
    </div>` : '';

  overlay.innerHTML = `
    <div class="lw-sum-screen">
      <div class="lw-sum-header">
        <div class="lw-sum-hero">${HERO.avatar || '🧝'}</div>
        <div class="lw-sum-title">Spedizione Completata!</div>
        <div class="lw-sum-subtitle">${mission ? `${mission.icon} ${esc(mission.name)}` : '🏃 Spedizione Libera'}</div>
        ${pct !== null ? `<div class="lw-sum-pct-bar-wrap"><div class="lw-sum-pct-bar" style="width:${pct}%"></div></div><div class="lw-sum-pct-label">${pct}% missione</div>` : ''}
      </div>

      <div class="lw-sum-stats">
        <div class="lw-sum-stat"><div class="lw-sum-sv">${km.toFixed(2)}</div><div class="lw-sum-sk">KM</div></div>
        <div class="lw-sum-stat"><div class="lw-sum-sv">${mm}:${ss}</div><div class="lw-sum-sk">TEMPO</div></div>
        <div class="lw-sum-stat"><div class="lw-sum-sv">${pm}:${ps}</div><div class="lw-sum-sk">MIN/KM</div></div>
        <div class="lw-sum-stat"><div class="lw-sum-sv">${events.length}</div><div class="lw-sum-sk">EVENTI</div></div>
      </div>

      ${(bonusXp > 0 || bonusGold > 0 || evHtml) ? `
      <div class="lw-sum-section">
        <div class="lw-sum-section-title">⚔️ Bottino eventi</div>
        ${evHtml || ''}
        ${bonusXp   ? `<div class="lw-sum-bonus-row"><span>Totale XP eventi</span><span>+${bonusXp} ✨</span></div>` : ''}
        ${bonusGold ? `<div class="lw-sum-bonus-row"><span>Totale oro eventi</span><span>+${bonusGold} 🪙</span></div>` : ''}
      </div>` : ''}

      ${mLootHtml ? `<div class="lw-sum-section">${mLootHtml}</div>` : ''}

      <div class="lw-sum-note">I km vengono registrati e aggiornano automaticamente tutte le missioni attive.</div>

      <div class="lw-sum-actions">
        <button class="lw-sum-confirm" id="lw-sum-ok">📜 Registra l'Impresa</button>
        <button class="lw-sum-discard" id="lw-sum-no">Annulla</button>
      </div>
    </div>`;

  overlay.querySelector('#lw-sum-ok').addEventListener('click', () => {
    lwSaveWorkout(overlay, km, mission, missionLoot, bonusXp, bonusGold);
  });
  overlay.querySelector('#lw-sum-no').addEventListener('click', () => {
    LIVE_WK = null;
    overlay.remove();
  });
}

/* ── Salva workout ──────────────────────────────────────── */
function lwSaveWorkout(overlay, km, mission, missionLoot, bonusXp, bonusGold) {
  const activity = 'corsa';
  const report = RPG.logHealthSync(HERO, activity, km);

  if (report) {
    // Bonus XP eventi
    if (bonusXp > 0) {
      HERO.xp = (HERO.xp || 0) + bonusXp;
      while (HERO.level < RPG.MAX_LEVEL && HERO.xp >= RPG.xpForLevel(HERO.level)) {
        HERO.xp -= RPG.xpForLevel(HERO.level);
        HERO.level++;
      }
    }
    // Bonus oro eventi + missione
    const totalBonusGold = bonusGold + (missionLoot ? missionLoot.gold : 0);
    if (totalBonusGold > 0) HERO.gold = (HERO.gold || 0) + totalBonusGold;

    // Bonus XP missione
    if (missionLoot && missionLoot.xp > 0) {
      HERO.xp = (HERO.xp || 0) + missionLoot.xp;
    }

    persist();
    renderHUD();
    if (typeof FB !== 'undefined') {
      FB.syncHero(HERO);
      if (HERO.guild && km > 0) FB.contributeToGuild(HERO, km).catch(() => {});
    }
    if (typeof checkMapNotify  === 'function') checkMapNotify();
    if (typeof checkBoardNotify=== 'function') checkBoardNotify();
    if (typeof maybySyncChallenge === 'function') maybySyncChallenge();
    if (typeof updateTabOnboardingPulse === 'function') updateTabOnboardingPulse();
  }

  LIVE_WK = null;
  overlay.remove();

  if (report && typeof showHealthSyncResult === 'function') {
    showHealthSyncResult(report);
  } else {
    toast('✅ Spedizione salvata!');
    setTab('train');
  }
}
