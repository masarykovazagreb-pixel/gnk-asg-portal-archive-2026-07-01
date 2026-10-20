#!/usr/bin/env node
/**
 * Baza znanja portala stoji na jednom mjestu: apps/portal/data/knowledge-base.json.
 * Odatle je čitaju /knowledge-center/, /en/knowledge-center/ i S+Chat agent.
 *
 * Ova skripta iz nje gradi modul koji worker uvozi izravno (bez mrežnog
 * dohvata i bez ručnog prepisivanja), pa odgovor asistenta i stranica s
 * pitanjima nikad ne mogu razići.
 *
 *   node scripts/knowledge-sync-v1.mjs            # provjeri je li u koraku
 *   node scripts/knowledge-sync-v1.mjs --apply     # upiši
 *   node scripts/knowledge-sync-v1.mjs --check      # izađi s 1 ako zaostaje
 */
import fs from 'node:fs';
import path from 'node:path';

const BAZA = 'apps/portal/data/knowledge-base.json';
const CILJ = 'workers/gnk-asg-direct-operator/src/knowledge-base.generated-v1.js';
const APPLY = process.argv.includes('--apply');
const CHECK = process.argv.includes('--check');

const baza = JSON.parse(fs.readFileSync(BAZA, 'utf8'));
if (!Array.isArray(baza.skupine)) throw new Error('knowledge-base.json nema skupine');

/* Poveznica na vlastitu stranicu, ako je odgovor navodi. */
function routeFrom(answer) {
  const matches = String(answer).match(/gnk-asg\.hr(\/[A-Za-z0-9\-_/%.]*)?/g);
  if (!matches || !matches.length) return '';
  const raw = matches[0].replace(/^gnk-asg\.hr/, '') || '/';
  const clean = raw.replace(/[.,;:]+$/, '');
  if (!clean || clean === '/') return '/';
  return clean.endsWith('/') ? clean : `${clean}/`;
}

const entries = [];
const groups = [];
for (const group of baza.skupine) {
  const naslov = String(group.naslov || '').trim();
  if (!naslov) continue;
  groups.push(naslov);
  for (const item of group.pitanja || []) {
    const p = String(item.p || '').trim();
    const o = String(item.o || '').trim();
    if (!p || !o) continue;
    entries.push([naslov, p, o, routeFrom(o)]);
  }
}

const header = `// AUTO-GENERATED — ne uređuj ručno.
// Izvor: apps/portal/data/knowledge-base.json (${baza.ukupnoPitanja} pitanja, ${groups.length} skupina).
// Generator: scripts/knowledge-sync-v1.mjs
`;
const body = [
  header,
  `export const KB_VERSION = ${JSON.stringify(String(baza.verzija || 'unknown'))};`,
  `export const KB_SOURCE_TOTAL = ${Number(baza.ukupnoPitanja) || entries.length};`,
  `export const KB_GROUPS = ${JSON.stringify(groups)};`,
  `export const KB_ENTRIES = ${JSON.stringify(entries)};`,
  '',
].join('\n');

const dir = path.dirname(CILJ);
fs.mkdirSync(dir, { recursive: true });
const exists = fs.existsSync(CILJ);
const current = exists ? fs.readFileSync(CILJ, 'utf8') : '';
const inStep = current === body;

console.log(`baza: ${entries.length} pitanja u ${groups.length} skupina, verzija ${baza.verzija}`);
console.log(`modul za asistenta: ${(body.length / 1024).toFixed(1)} KB znakova`);
console.log(inStep ? 'asistent je u koraku' : 'asistent zaostaje za bazom');

if (APPLY) {
  if (inStep) {
    console.log('nema promjene');
  } else {
    fs.writeFileSync(CILJ, body, 'utf8');
    console.log('asistent osvježen');
  }
} else if (CHECK && !inStep) {
  console.error('::error::knowledge-base.generated-v1.js nije u koraku — pokreni node scripts/knowledge-sync-v1.mjs --apply');
  process.exitCode = 1;
}
