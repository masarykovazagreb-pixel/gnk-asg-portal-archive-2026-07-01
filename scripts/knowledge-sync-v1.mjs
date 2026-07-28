#!/usr/bin/env node
/**
 * Baza znanja stoji na jednom mjestu — apps/portal/data/knowledge-base.json.
 * Odatle je citaju dvoje: stranica /knowledge-center/ i sustavna uputa
 * asistenta u workeru. Ova skripta drzi asistenta u koraku s bazom, da se
 * odgovori na stranici i u razgovoru ne razidju.
 *
 *   node scripts/knowledge-sync-v1.mjs            # prikaz
 *   node scripts/knowledge-sync-v1.mjs --apply    # upis
 */
import fs from 'node:fs';

const BAZA = 'apps/portal/data/knowledge-base.json';
const CILJ = 'workers/gnk-asg-direct-operator/src/intelligence-desk-chat-v1.js';
const APPLY = process.argv.includes('--apply');

const baza = JSON.parse(fs.readFileSync(BAZA, 'utf8'));
const sazetak = baza.skupine.map(g =>
  `[${g.naslov}]\n` + g.pitanja.slice(0, 6).map(q => `  · ${q.p} ${q.o.slice(0, 150)}`).join('\n')
).join('\n');

const izvor = fs.readFileSync(CILJ, 'utf8');
const novi = izvor.replace(
  /const BAZA_ZNANJA = "[\s\S]*?";\n/,
  'const BAZA_ZNANJA = ' + JSON.stringify(sazetak) + ';\n'
);

console.log(`baza: ${baza.ukupnoPitanja} pitanja u ${baza.skupine.length} skupina`);
console.log(`sazetak za asistenta: ${sazetak.length} znakova`);

if (!APPLY) {
  console.log(izvor === novi ? 'asistent je u koraku' : 'asistent zaostaje — pokreni s --apply');
  process.exit(0);
}
if (izvor === novi) {
  console.log('nema promjene');
} else {
  fs.writeFileSync(CILJ, novi);
  console.log('asistent osvjezen');
}
