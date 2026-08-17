# RPGym — Contesto di Progetto

## Cos'è RPGym

RPG fitness PWA (Progressive Web App) che trasforma allenamenti reali in progressione da gioco di ruolo. L'utente registra km e sessioni di allenamento → ottiene XP, oro, oggetti, sblocca contenuti. Nessun backend: tutto in `localStorage`. Pubblicato su GitHub Pages.

**URL produzione:** `https://dexcorsaro9-cmyk.github.io/RPGym/`
**Repo:** `https://github.com/dexcorsaro9-cmyk/RPGym`
**Stack:** HTML + CSS + Vanilla JS (zero framework), Firebase Firestore solo per funzionalità PvP/guild, Service Worker per PWA offline.

---

## File principali

| File | Righe | Ruolo |
|------|-------|-------|
| `game.js` | 6304 | Motore RPG puro — nessun DOM. Esporta `const RPG = (...)()`. Tutto lo stato, le formule, i dati (biomi, oggetti, consumabili, missioni, ecc.) |
| `app-core.js` | ~1500 | Globals (`STATE`, `HERO`, `CURRENT_TAB`), helpers (`el`, `esc`, `ptIcon`, `persist`), navigazione (`setTab`, `renderHUD`, swipe), onboarding, tutorial, profili, `enterGame`. |
| `app-camp.js` | ~1570 | `renderCamp()` e sub-view Rifugio: stagioni, strutture, arredamento, santuario, famigli, serra, bacheca, pass stagionale. |
| `app-map.js` | ~2005 | `renderMap()` e sub-view Mappa: biomi, tesoro settimanale, boss settimanale, incursione, avamposto (PvP/guild/atlas/pantheon). |
| `app-train.js` | ~1053 | `renderTrain()`: registrazione allenamento, loot, shortcut iOS, report. |
| `app-market.js` | ~1403 | `renderMarket()` e tutte le sub-view Borgo: stalla, mercato nero, fucina, erborista, cartomante, ruota, pozzo, catena, casse, antro, taverna, bisca. |
| `app-hero.js` | ~2941 | `renderHero()` e sub-view Eroe: equipaggiamento, zaino, sacca, consumabili, sfide, diario, cronache, carte, bestiario, impostazioni. Contiene anche modal/toast, notifiche, badge e `runSplash` (startup). |
| `arena.js` | 1211 | Sistema Arena (duello a morra guerrieri). |
| `minigames.js` | 1128 | Minigiochi (Bisca, Cartomante, Ruota della Fortuna, Lancio Coltello, ecc.) |
| `style.css` | ~9200 | Tutti gli stili. Nessun preprocessore. |
| `sw.js` | ~223 | Service Worker — cache `heropace-vN` (bump versione ad ogni deploy). |
| `firebase.js` | — | Config Firebase per PvP/guild (Firestore). |
| `index.html` | — | Entry point — carica gli script nell'ordine corretto, definisce le sezioni `#screen-profiles` e `#screen-game`. |

---

## Architettura UI

### Schermo principale (`#screen-game`)
```
#screen-game  (position: fixed; inset: 0)
  #hud              ← risorse in alto (oro, legno, pietra, XP, fiches)
  #tab-content      ← area scrollabile centrale (overflow-y: auto)
    div.tab-anim-wrap  ← wrapper animazione tab (animare questo, MAI #tab-content)
      [contenuto tab corrente]
  #tabbar           ← 5 tab in basso (camp / map / train / market / hero)
```

**IMPORTANTE iOS:** Non usare `100dvh` su `#screen-game` — causa loop di reflow. Usa `position: fixed; inset: 0; height: auto`. Le animazioni tab vanno su `.tab-anim-wrap`, non su `#tab-content` (bug WebKit: transform su elemento con overflow-y resetta lo scroll).

### Tab e routing
```js
CURRENT_TAB  = 'camp' | 'map' | 'train' | 'market' | 'hero'
CAMP_VIEW    = 'main' | 'santuario' | 'strutture' | 'arredamento' | 'serra' | 'seasonpass'
MAP_VIEW     = 'main' | 'atlas' | 'pantheon' | 'avamposto'
MARKET_VIEW  = 'hub' | 'taverna' | 'bisca' | 'stalla' | 'nero' | 'fucina' | 'erborista' |
               'cartomante' | 'ruota' | 'pozzo' | 'catena' | 'casse' | 'antro' | 'antro_*'
HERO_VIEW    = 'main' | 'settings' | 'diary' | 'story' | 'sacca' | 'guida' |
               'cronache' | 'cards' | 'bestiary' | 'zaino'
```

Navigazione: `setTab(tab, dir?)` — renderizza il tab nel wrapper animato, gestisce swipe e transizioni.

---

## Oggetto HERO (campi principali)

```js
HERO = {
  id, name, avatar,           // identità
  class,                      // 'guerriero' | 'mago' | 'ranger' | 'ladro' | 'paladino'
  level, xp,                  // progressione (max 100)
  gold, wood, stone,          // risorse
  fiches,                     // valuta Arena
  streak: { count, last },    // serie allenamenti
  totalKm, totalSessions,     // statistiche cumulative
  items: [...],               // inventario oggetti equipaggiabili
  equipped: { weapon, shield, helmet, armor, ring, amulet, seed, consumable },
  consumables: [...],         // box consumabili
  sacca: [...],               // sacca del viandante (scudi streak, ecc.)
  pet: { species, name, hunger, mood, energy, level, hatched, ... } | null,
  companion: 'tipo_famiglio' | null,
  treasureMap: { startedAt, progressKm, claimed: [] },
  weeklyBoss: { id, progressKm, claimed },
  incursion: { name, enemy, km, progressKm, done } | null,
  board: { quests: [...], date },      // Bacheca del Viandante
  onboardingStep,              // vedi sezione Onboarding
  tutorialDone,
  seenTabs: [],
  campLayout: {},              // posizioni layer drag&drop
  storyId,                    // 'eroe1' | 'eroe2'
  guild: {},
  pvp: {},
}
```

---

## Stato globale (app-core.js)

```js
let STATE = RPG.load();   // { heroes: [...], activeHeroId }
let HERO  = null;         // hero attivo (puntatore dentro STATE.heroes)
let CURRENT_TAB = 'camp';
```

Ogni file di tab dichiara il proprio view-state locale:
```js
// app-camp.js
let CAMP_VIEW = 'main';
// app-map.js
let MAP_VIEW = 'main';
// app-market.js
let MARKET_VIEW = 'hub';
// app-hero.js
let HERO_VIEW = 'main';
```

Tutti i file condividono il `window` scope — nessun modulo ES. L'ordine di caricamento degli script in `index.html` è obbligatorio: `game.js` → `app-core.js` → `app-camp.js` → `app-map.js` → `app-train.js` → `app-market.js` → `app-hero.js` → `minigames.js` → `arena.js`.

Persistenza: `persist()` → `RPG.save(STATE)` → `localStorage`.

Pattern rendering: ogni `render*` riceve un container `c` (div) e ci appende dentro. L'helper `el(tag, cls, html)` crea elementi. `esc(str)` per sanitizzare HTML.

---

## Sistemi implementati

### Allenamento (`renderTrain`)
- Registra tipo attività (corsa/camminata/cyclette), durata, km
- Genera XP, oro, loot (forzieri, consumabili, oggetti)
- iOS Comandi Rapidi per import automatico passi da Salute

### Arena (`arena.js` + `renderAntroView`)
- Duello a morra: Attacco / Difesa / Schivata con regole RPG
- `RPG.BATTLE_MAX_DAY` sfide al giorno, scala con livello
- Boss speciali con ricompense maggiori
- Valuta: fiches arena (`HERO.fiches`)

### Mappa del Mondo (`renderMap`)
- Biomi sbloccati per livello (Lv 1-100)
- Mappa del tesoro settimanale: 3 tappe (8/22/45 km), reset ogni 7 giorni
- Boss settimanale: km obiettivo, bottino garantito
- Incursione del giorno: nemico temporaneo, forziere
- Avamposto: PvP, gilde, Atlas, Pantheon

### Rifugio (`renderCamp`)
- Scena interattiva con ciclo giorno/notte, layer drag&drop
- Strutture acquistabili per bonus passivi
- Serra del Viandante: piante con timer reale, missioni settimanali
- Santuario dei Famigli: Tamagotchi con Fame/Umore/Energia, evoluzioni
- Bacheca del Viandante: commissioni giornaliere reset mezzanotte
- Pass Stagionale: 50 livelli, traccia Free/Premium, punti guadagnati con km

### Borgo (`renderMarket`)
- Stalla (cavalcature), Mercato Nero (vendi/compra), Fucina (potenzia)
- Bazar/Erborista (compra consumabili), Cartomante, Ruota della Fortuna
- Pozzo dei Desideri, Catena del Destino, Casse e Chiave
- Taverna (storie NPC), Bisca Oscura (gioco d'azzardo)
- Mercante Fuggiasco (offerta giornaliera casuale)

### Eroe (`renderHero`)
- Equipaggiamento (8 slot: weapon/shield/helmet/armor/ring/amulet/seed/consumable)
- Zaino (inventario oggetti), Sacca del Viandante (scudi streak, ecc.)
- Box Consumabili (pozioni e buff)
- Sfide giornaliere e settimanali
- Diario, Cronache, Carte collezionabili, Bestiario
- Impostazioni + Guida al Gioco

### Onboarding progressivo
`HERO.onboardingStep` guida i nuovi utenti step by step:
- `0` = tutorial (5 slide) da vedere
- `1` = tutorial visto
- `2` = 1° workout fatto → banner Arena nel Borgo
- `3` = valore legacy migrazione (utenti esistenti, nessun banner)
- `10` = dopo 1° vittoria Arena → banner Mappa
- `11` = dopo Mappa → banner Serra nel Rifugio
- `12` = dopo Serra → banner Bacheca nel Rifugio
- `13` = dopo Bacheca → banner Famiglio nel Rifugio
- `14` = dopo Famiglio → banner Boss Settimanale nella Mappa
- `15` = dopo Boss → banner Pass Stagionale nel Rifugio
- `16` = dopo Pass → banner Fucina nel Borgo
- `17` = dopo Fucina → banner Avamposto nella Mappa
- `18` = onboarding completato

Funzioni: `renderOnboardingBanner(c, { step, icon, title, desc, actionLabel, onAction })` e `advanceOnboarding(fromStep, toStep?)`.

**ATTENZIONE:** step 3 è riservato alla migrazione — i nuovi step avanzati partono da 10 per evitare collisioni. Non aggiungere step tra 3 e 10.

---

## Rarità oggetti

```
comune < raro < epico < leggendario
colori: #b0b8c1 / #4a90d9 / #9b59b6 / #f1c40f
```

---

## Costanti chiave (game.js)

```js
RPG.MAX_LEVEL = 100
RPG.GOLD_PER_KM = 5
// Attività: corsa 30 xp/km, camminata 15, cyclette 10
// Loot: forziere ogni 5 km, biglietto gratta&vinci ogni 75 km
// Giorno di gioco: offset -4h (mezzanotte = 20:00 ora reale)
```

---

## Convenzioni CSS

- Variabili CSS: `--gold`, `--text`, `--muted`, `--divider`, `--tabbar-h`
- Tema dark/light: token su `:root` (light), ridefiniti in `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` e `:root[data-theme="dark"]`
- Classi utility: `panel`, `btn btn-primary`, `btn-small`, `section-title`, `muted`, `small`, `center`, `membar`, `membar-fill`
- Modal: `modal(html)` / `closeModal()`
- Toast: `toast(msg)` (3 secondi)

---

## Service Worker

Cache versioned: `heropace-vN` in `sw.js`. Il numero viene **incrementato automaticamente** dal git hook `.githooks/pre-commit` ad ogni commit — non serve toccarlo manualmente. Strategia: network-first per file locali, cache-first per CDN/font.

Su un clone fresco, attivare il hook una volta sola:
```bash
git config core.hooksPath .githooks
```

---

## Istruzioni operative

### Immagini / Asset
Convertire sempre in WebP prima di committare:
```bash
cwebp -q 88 input.jpg -o output.webp && rm input.jpg
```
- Qualità: 88
- Rimuovere il file originale
- Aggiornare i riferimenti nel codice

### Git / PR
- Creare PR e mergerla immediatamente dopo il push
- Branch di sviluppo: `claude/nuova-sfida-*` o simile
- Non lasciare commit pendenti
