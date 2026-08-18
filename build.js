#!/usr/bin/env node
// Build script: minifica JS e CSS nella cartella dist/
// Non tocca la struttura dei file — zero rischio di rompere i globali

import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const SRC = '.';
const OUT = 'dist';

// Pulisce e ricrea dist/
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);

// ── 1. Minifica JS ──────────────────────────────────────────────
const jsFiles = [
  'firebase.js', 'game.js',
  'app-core.js', 'app-camp.js', 'app-map.js', 'app-train.js',
  'app-market.js', 'app-hero.js',
  'minigames.js', 'arena.js',
];
// target 'es2020' (non 'es2017'!): tutti i file condividono lo stesso scope
// globale window (nessun modulo ES — vedi CLAUDE.md), e ogni file viene
// minificato SEPARATAMENTE. Con target 'es2017' esbuild deve "down-levelare"
// lo spread di oggetti ({...obj}, sintassi ES2018) iniettando in ogni file
// un proprio helper interno con nome corto (es. "V"). Se due file diversi
// finiscono per usare la stessa lettera per scopi diversi, l'ultimo caricato
// sovrascrive silenziosamente window.V dell'altro — bug reale già capitato
// (app-map.js sovrascriveva la V di game.js con Object.prototype.hasOwnProperty,
// rompendo ogni spread successivo con "undefined is not an object").
// Con target 'es2020' lo spread resta sintassi nativa: nessun helper, nessuna
// collisione. ES2020 è ampiamente supportato dai dispositivi target dell'app.
await Promise.all(jsFiles.map(f =>
  esbuild.build({
    entryPoints: [path.join(SRC, f)],
    outfile: path.join(OUT, f),
    minify: true,
    target: 'es2020',
    logLevel: 'info',
  })
));

// ── 2. Minifica CSS ─────────────────────────────────────────────
await esbuild.build({
  entryPoints: [path.join(SRC, 'style.css')],
  outfile: path.join(OUT, 'style.css'),
  minify: true,
  logLevel: 'info',
});

// ── 3. Copia file statici ────────────────────────────────────────
const staticFiles = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'privacy.html',
  'terms.html',
];
for (const f of staticFiles) {
  fs.copyFileSync(f, path.join(OUT, f));
}

// Copia ricorsiva delle cartelle asset
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir('assets', path.join(OUT, 'assets'));

// ── 4. Report dimensioni ─────────────────────────────────────────
console.log('\n📦 Dimensioni file:');
const allFiles = [...jsFiles, 'style.css'];
for (const f of allFiles) {
  const src = fs.statSync(path.join(SRC, f)).size;
  const built = fs.statSync(path.join(OUT, f)).size;
  const saving = Math.round((1 - built / src) * 100);
  console.log(`  ${f}: ${(src/1024).toFixed(0)}KB → ${(built/1024).toFixed(0)}KB (-${saving}%)`);
}
