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
  'miniGames','dailyChallenges',
  // v5
  'tickets','ticketsEarned',
];

const bare = { id:'t1', name:'Test', avatar:'a', level:1, xp:0, gold:0, wood:0, stone:0 };
const migrated = RPG.migrateHero(Object.assign({}, bare));

REQUIRED_FIELDS.forEach(f => {
  assert(`migrated.${f} definito`, migrated[f] !== undefined);
});

assert('schemaVersion è 5', migrated.schemaVersion === 5);
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
assert('schemaVersion aggiornato', hero.schemaVersion === 5);
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

/* ══ Test: bilanciamento economia ══════════════════════════════════ */

section('bilanciamento mini-giochi — limiti earning rate');

const mgSrc = fs.readFileSync(path.join(__dirname, '../minigames.js'), 'utf8');

// Archery: unico parametro in MG_B
const goldPerPt = parseFloat((mgSrc.match(/goldPerPt:\s*([\d.]+)/) || [])[1]);
assert(`archery goldPerPt ≤ 1.0 (ora ${goldPerPt})`, goldPerPt <= 1.0, `valore: ${goldPerPt}`);

// Altri giochi usano costanti hardcoded — verifica che non superino i cap
// tap/arena: const gold = 30
const tapGold = parseFloat((mgSrc.match(/const gold = (\d+), xp = 50/) || [])[1]);
assert(`tap/arena gold per partita ≤ 40 (ora ${tapGold})`, tapGold <= 40, `valore: ${tapGold}`);

// fishing: const gold = 40
const fishGold = parseFloat((mgSrc.match(/const gold = (\d+), xp = 60/) || [])[1]);
assert(`fishing gold per cattura ≤ 50 (ora ${fishGold})`, fishGold <= 50, `valore: ${fishGold}`);

// Ceiling giornaliero worst-case (3 partite ciascuna):
// archery max = 90 * goldPerPt * 3, altri fixed * 3 sessioni
const archMax    = 90 * goldPerPt * 3;  // score 90/90 × 3 sessioni
const othersMax  = tapGold * 3 + fishGold * 3 + 30 * 3;  // tap+fish+arena
// carte: max 30 gold × 3 giri
const cardsMax   = 30 * 3;
const ceiling    = archMax + othersMax + cardsMax;
assert(
  `gold/die ceiling < 600 (regressione check)`,
  ceiling < 600,
  `ceiling: ${ceiling.toFixed(0)}`
);

/* ══ Test: migrateState ════════════════════════════════════════════ */

section('migrateState — stato corrotto');

// Testa load() con localStorage vuoto (già presente nel contesto)
const emptyState = RPG.load();
assert('load() con localStorage vuoto → heroes array', Array.isArray(emptyState.heroes));
assert('load() con localStorage vuoto → current null', emptyState.current === null);
assert('load() con localStorage vuoto → claimedEvents array', Array.isArray(emptyState.claimedEvents));

/* ══ Test: Sfide Giornaliere ════════════════════════════════════════ */

section('Sfide Giornaliere');

const dcHero = RPG.newHero('Sfidante', 'a');
const dc = RPG.getDailyChallenges(dcHero);
assert('getDailyChallenges restituisce 3 sfide', dc.list.length === 3);
assert('sfida km presente', dc.list.some(c => c.type === 'km'));
assert('sfida arena presente', dc.list.some(c => c.type === 'arena'));
assert('sfida minigame presente', dc.list.some(c => c.type === 'minigame'));
assert('progress iniziale 0', dc.list.every(c => c.progress === 0));
assert('bonusClaimed false', dc.bonusClaimed === false);

// stesso giorno → stesso oggetto
const dc2 = RPG.getDailyChallenges(dcHero);
assert('getDailyChallenges idempotente', dc2 === dc);

// progress km
RPG.updateChallengeProgress(dcHero, 'km', 1.5);
const kmCh = dc.list.find(c => c.type === 'km');
assert('progress km aggiornato', kmCh.progress === 1.5);

// claim prematura fallisce
const earlyErr = RPG.claimChallenge(dcHero, dc.list.indexOf(kmCh));
assert('claim prematura restituisce stringa', typeof earlyErr === 'string');

// completa km e riscuoti
RPG.updateChallengeProgress(dcHero, 'km', 100); // supera il target
assert('progress cap al target', kmCh.progress === kmCh.target);
const goldBefore = dcHero.gold;
const r = RPG.claimChallenge(dcHero, dc.list.indexOf(kmCh));
assert('claim ok', r && r.ok === true);
assert('gold incrementato', dcHero.gold === goldBefore + r.reward.gold);
assert('sfida marcata claimed', kmCh.claimed === true);

// doppio claim fallisce
const r2 = RPG.claimChallenge(dcHero, dc.list.indexOf(kmCh));
assert('doppio claim restituisce stringa', typeof r2 === 'string');

// bonus completo
RPG.updateChallengeProgress(dcHero, 'arena',    100);
RPG.updateChallengeProgress(dcHero, 'minigame', 100);
RPG.claimChallenge(dcHero, dc.list.findIndex(c => c.type === 'arena'));
const goldBef2 = dcHero.gold;
const rBonus = RPG.claimChallenge(dcHero, dc.list.findIndex(c => c.type === 'minigame'));
assert('bonus attivato all\'ultima sfida', rBonus && rBonus.bonus !== null);
assert('gold bonus incluso', dcHero.gold === goldBef2 + rBonus.reward.gold + rBonus.bonus.gold);
assert('bonusClaimed true', dc.bonusClaimed === true);

/* ══ Test: Bacheca — ricompense XP ═════════════════════════════════ */

section('Bacheca del Viandante — ricompense XP');

const bHero = RPG.newHero('Bacheca', 'a');

// Verifica che BOARD_QUEST_POOL contenga XP
const pool = RPG.BOARD_QUEST_POOL;
assert('BOARD_QUEST_POOL definito', Array.isArray(pool) && pool.length > 0);
assert('ogni quest ha reward.xp > 0', pool.every(q => q.reward && q.reward.xp > 0),
  pool.filter(q => !q.reward || !q.reward.xp).map(q => q.tier).join(','));

// Verifica proporzionalità: xp missione > xp incarico > xp commissione
const avgXp = tier => {
  const qs = pool.filter(q => q.tier === tier);
  return qs.reduce((s, q) => s + q.reward.xp, 0) / qs.length;
};
assert('missione ha più XP di incarico', avgXp('missione') > avgXp('incarico'));
assert('incarico ha più XP di commissione', avgXp('incarico') > avgXp('commissione'));

// Genera la bacheca e riscuoti una quest
const board = RPG.generateDailyBoard(bHero);
assert('generateBoardQuests genera 3 quest', board.quests.length === 3);

// Completa virtualmente la prima quest (km soddisfatti) e riscuota
const q0 = board.quests[0];
const xpBefore = bHero.xp;
const goldBefore2 = bHero.gold;

// Simula km sufficienti nella board
bHero.board = board;
bHero.board.kmLogged = q0.km + 1; // supera il target

const claimErr = RPG.claimBoardReward(bHero, q0.id);
assert('claimBoardReward ok (no errore)', claimErr === null);
assert('gold bacheca incrementato', bHero.gold > goldBefore2);
assert('xp bacheca incrementata (via applyXp)', bHero.xp > xpBefore,
  `xp prima:${xpBefore} dopo:${bHero.xp}`);
assert('quest marcata claimed', bHero.board.claimed.includes(q0.id));

// Doppio claim fallisce
const claimErr2 = RPG.claimBoardReward(bHero, q0.id);
assert('doppio claim restituisce errore', typeof claimErr2 === 'string');

/* ══ Test: applyXp — level-up ═══════════════════════════════════════ */

section('applyXp — level-up corretto');

const lvHero = RPG.newHero('Leveller', 'a');
const xpNeeded = RPG.xpForLevel(1);
RPG.applyXp(lvHero, xpNeeded);
assert('applyXp causa level-up a lvl 2', lvHero.level === 2,
  `level attuale: ${lvHero.level}, xp: ${lvHero.xp}, needed: ${xpNeeded}`);
assert('xp residua corretta dopo level-up', lvHero.xp < RPG.xpForLevel(2));

// XP massiccia → più level-up in sequenza
const bigHero = RPG.newHero('BigXP', 'a');
RPG.applyXp(bigHero, 99999);
assert('applyXp massiccia porta a livello alto', bigHero.level > 10);

/* ══ Rapporto finale ════════════════════════════════════════════════ */

console.log('\nRPGym Test Suite\n');
results.forEach(r => console.log(r));
console.log(`\n${'─'.repeat(52)}`);
console.log(`  ${passed} passati  ·  ${failed} falliti  ·  ${passed + failed} totali`);
console.log(`${'─'.repeat(52)}\n`);

if (failed > 0) process.exit(1);
