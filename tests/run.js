/**
 * RPGym — Test suite (Node.js, zero dipendenze)
 * Esegui con: node tests/run.js
 */

const vm  = require('vm');
const fs  = require('fs');
const path = require('path');

/* ══ Mini-framework ══════════════════════════════════════════════════ */

let passed = 0, failed = 0;
const results = [];

function assert(label, cond, detail = '') {
  if (cond) {
    passed++;
    results.push(`  ✓  ${label}`);
  } else {
    failed++;
    results.push(`  ✗  ${label}${detail ? '  →  ' + detail : ''}`);
  }
}

function section(name) {
  results.push(`\n── ${name} ─────────────────────────────────────────`);
}

/* ══ Carica game.js in contesto isolato ════════════════════════════ */

const localStorage = (() => {
  const store = {};
  return {
    getItem:    k => (k in store ? store[k] : null),
    setItem:    (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  };
})();

const ctx = vm.createContext({ localStorage, console });
// `const RPG` non diventa proprietà del context; lo esponiamo via var
const gameCode = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');
vm.runInContext(gameCode + '\nvar __RPG = RPG;', ctx);
const RPG = ctx.__RPG;

/* ══ Test: migrateHero ══════════════════════════════════════════════ */

section('migrateHero — campi obbligatori');

const REQUIRED_FIELDS = [
  'items','equipment','mountsOwned','mount','streak','incursion','bestiary',
  'storyId','forgeSeen','summarySeen','eventNotified','battles','healthSync',
  'stamina','furniture','achievementsClaimed',
  // v3
  'log','totalKm','kmByType','missionsDone','lootBagsOpened','fragmentsFound',
  'cards','activeMission','restBonus','companion',
  // v4
  'miniGames',
];

const bare = { id:'t1', name:'Test', avatar:'a', level:1, xp:0, gold:0, wood:0, stone:0 };
const migrated = RPG.migrateHero(Object.assign({}, bare));

REQUIRED_FIELDS.forEach(f => {
  assert(`migrated.${f} definito`, migrated[f] !== undefined);
});

assert('schemaVersion è 4', migrated.schemaVersion === 4);
assert('items è array', Array.isArray(migrated.items));
assert('equipment.arma è null', migrated.equipment.arma === null);
assert('streak.count è 0', migrated.streak.count === 0);
assert('miniGames è {}', typeof migrated.miniGames === 'object' && !Array.isArray(migrated.miniGames));

/* vecchio inventario convertito in oro */
const oldHero = Object.assign({}, bare, { gold: 100, inventory: ['spada','scudo','elmo'] });
const oldMigrated = RPG.migrateHero(oldHero);
assert('vecchio inventory convertito: gold += N×10', oldMigrated.gold === 130);
assert('vecchio inventory svuotato', oldMigrated.inventory.length === 0);

/* ══ Test: newHero ══════════════════════════════════════════════════ */

section('newHero');

const hero = RPG.newHero('Aria', 'assets/avatars/eroe1.png');
assert('level 1', hero.level === 1);
assert('xp 0', hero.xp === 0);
assert('gold 0', hero.gold === 0);
assert('schemaVersion aggiornato', hero.schemaVersion === 4);
assert('nome corretto', hero.name === 'Aria');

/* ══ Test: xpForLevel ═══════════════════════════════════════════════ */

section('xpForLevel — curva di progressione');

const xp = RPG.xpForLevel;
assert('level 1 > 0',      xp(1)  >  0);
assert('level 2 > level 1', xp(2) > xp(1));
assert('level 10 > level 5', xp(10) > xp(5));
assert('level 50 > level 10', xp(50) > xp(10));
assert('level 100 > level 50', xp(100) > xp(50));

/* ══ Test: logWorkout — XP e oro ═══════════════════════════════════ */

section('logWorkout — calcolo base');

const h = RPG.newHero('Tester', 'a');

// camminata: xpPerKm=15, gold=5/km
const r1 = RPG.logWorkout(h, 'camminata', 5, { skipValidation: true });
assert('nessun errore', !r1.error);
assert('km registrati', Math.abs(h.totalKm - 5) < 0.5);  // mount/companion may modify km
assert('oro guadagnato > 0', h.gold > 0);

// corsa XP/km > camminata XP/km (confronto su 1km per evitare level-up)
const hRun  = RPG.newHero('Runner', 'a');
const hWalk = RPG.newHero('Walker', 'a');
RPG.logWorkout(hRun,  'corsa',     1, { skipValidation: true });
RPG.logWorkout(hWalk, 'camminata', 1, { skipValidation: true });
assert('corsa dà più XP per km della camminata', hRun.xp > hWalk.xp,
  `corsa:${hRun.xp} camminata:${hWalk.xp}`);

// validazione km eccessivi
const h3 = RPG.newHero('Cheater', 'a');
const rErr = RPG.logWorkout(h3, 'camminata', 999);
assert('sessione troppo lunga rifiutata', !!rErr.error);

/* ══ Test: edifici ══════════════════════════════════════════════════ */

section('build — costi e requisiti');

const bFondamenta = RPG.BUILDINGS.find(x => x.id === 'fondamenta');
const bBaule      = RPG.BUILDINGS.find(x => x.id === 'baule');
assert('fondamenta trovata nei BUILDINGS', !!bFondamenta);
assert('baule trovato nei BUILDINGS',      !!bBaule);
assert('baule richiede fondamenta',        bBaule && bBaule.requires === 'fondamenta');

// builder con risorse sufficienti e livello giusto
const builder = RPG.newHero('Fabbro', 'a');
builder.level = 5; builder.wood = 1000; builder.stone = 1000;

assert('canBuild fondamenta a lv 5 → ok',
  RPG.canBuild(builder, bFondamenta) === 'ok',
  RPG.canBuild(builder, bFondamenta));

const woodBefore = builder.wood, stoneBefore = builder.stone;
RPG.build(builder, 'fondamenta');
assert('wood scalato di cost.wood', builder.wood === woodBefore - bFondamenta.cost.wood, `wood: ${builder.wood}`);
assert('stone scalato di cost.stone', builder.stone === stoneBefore - bFondamenta.cost.stone, `stone: ${builder.stone}`);
assert('edificio registrato nella lista', builder.buildings.includes('fondamenta'));

// prerequisito mancante
const builder2 = RPG.newHero('NoPre', 'a');
builder2.level = 5; builder2.wood = 1000; builder2.stone = 1000;
assert('canBuild baule senza fondamenta → requisito',
  RPG.canBuild(builder2, bBaule) === 'requisito');

// livello insufficiente
const low = RPG.newHero('Low', 'a');
low.level = 1; low.wood = 1000; low.stone = 1000;
assert('canBuild fondamenta a lv 1 → livello',
  RPG.canBuild(low, bFondamenta).startsWith('livello'));

/* ══ Test: cavalleria — prezzi ═════════════════════════════════════ */

section('cavalcature — formula prezzo');

const mounts = RPG.MOUNTS;
assert('almeno 5 cavalcature', mounts.length >= 5);
// prezzo cresce con il livello richiesto
for (let i = 1; i < mounts.length; i++) {
  if (mounts[i].level > mounts[i-1].level) {
    assert(
      `${mounts[i].name} costa più di ${mounts[i-1].name}`,
      mounts[i].price >= mounts[i-1].price,
      `${mounts[i].price} vs ${mounts[i-1].price}`
    );
    break; // basta verificare il primo salto
  }
}

/* ══ Test: bilanciamento economia (MG_B) ════════════════════════════ */

section('bilanciamento mini-giochi — limiti earning rate');

// Legge MG_B come testo da minigames.js senza caricare tutto il file
const mgSrc = fs.readFileSync(path.join(__dirname, '../minigames.js'), 'utf8');

// Estrae i valori chiave con regex robuste
const goldPerPt    = parseFloat((mgSrc.match(/goldPerPt:\s*([\d.]+)/)   || [])[1]);
const goldMult     = parseFloat((mgSrc.match(/goldMult:\s*([\d.]+)/)    || [])[1]);
const goldPerHit   = parseFloat((mgSrc.match(/goldPerHit:\s*([\d.]+)/)  || [])[1]);
const memGoldBase  = parseFloat((mgSrc.match(/goldBase:\s*([\d.]+)/)    || [])[1]);

assert(`archery goldPerPt ≤ 1.0 (era 1.2, ora ${goldPerPt})`, goldPerPt <= 1.0, `valore: ${goldPerPt}`);
assert(`tap goldMult ≤ 0.20 (ora ${goldMult})`,                goldMult  <= 0.20, `valore: ${goldMult}`);
assert(`wham goldPerHit ≤ 3 (ora ${goldPerHit})`,              goldPerHit <= 3,   `valore: ${goldPerHit}`);
assert(`memory goldBase ≤ 25 (ora ${memGoldBase})`,            memGoldBase <= 25, `valore: ${memGoldBase}`);

// Stima worst-case gold giornaliero dai soli mini-giochi
const archMax = 90 * goldPerPt * 3;          // 3 tiri, score perfetto
const tapMax  = 100 * goldMult * 3;           // 3 partite, power 100
const whamMax = 12 * goldPerHit * 3;          // 3 partite, 12 anime
const dailyGoldCeiling = archMax + tapMax + whamMax + 100; // +100 stima altri giochi
// Stima altri giochi: dado max 60, carte 3×30=90, ruota max 60, memory 2×18=36 → 246
const othersMax = 60 + 90 + 60 + (memGoldBase * 2);
const ceiling = archMax + tapMax + whamMax + othersMax;
// Soglia = worst-case assoluto (tutti jackpot nello stesso giorno).
// Pre-fix il ceiling era >800; questa soglia cattura regressioni gravi.
assert(
  `gold/die ceiling < 550 (regressione check: vecchio bug era >800)`,
  ceiling < 550,
  `ceiling: ${ceiling.toFixed(0)}`
);

/* ══ Test: migrateState ════════════════════════════════════════════ */

section('migrateState — stato corrotto');

// Testa load() con localStorage vuoto (già presente nel contesto)
const emptyState = RPG.load();
assert('load() con localStorage vuoto → heroes array', Array.isArray(emptyState.heroes));
assert('load() con localStorage vuoto → current null', emptyState.current === null);
assert('load() con localStorage vuoto → claimedEvents array', Array.isArray(emptyState.claimedEvents));

/* ══ Rapporto finale ════════════════════════════════════════════════ */

console.log('\nRPGym Test Suite\n');
results.forEach(r => console.log(r));
console.log(`\n${'─'.repeat(52)}`);
console.log(`  ${passed} passati  ·  ${failed} falliti  ·  ${passed + failed} totali`);
console.log(`${'─'.repeat(52)}\n`);

if (failed > 0) process.exit(1);
