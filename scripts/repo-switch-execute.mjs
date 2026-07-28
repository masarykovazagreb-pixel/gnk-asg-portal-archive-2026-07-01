#!/usr/bin/env node
/**
 * Zamjena uloga između dva repozitorija.
 *
 * Oba repozitorija drže isti kod i iste tajne, ali automatizacije smiju raditi
 * SAMO u jednom. Ako rade u oba, svaki tekst bi otišao na blog dvaput, a
 * podatkovne datoteke bi se međusobno pregazile.
 *
 * Ovaj alat gasi automatizacije u jednom i pali ih u drugom, istim redoslijedom
 * i istim popisom.
 *
 *   # samo prikaz, ništa se ne mijenja (zadano)
 *   node scripts/repo-switch-execute.mjs
 *
 *   # stvarna zamjena
 *   node scripts/repo-switch-execute.mjs --apply
 *
 * Okolina:
 *   SOURCE_REPO   vlasnik/ime   (zadano beckuphome-gnk/gnk-asg-portal)
 *   TARGET_REPO   vlasnik/ime
 *   SOURCE_TOKEN  token s ovlastima nad izvornim repozitorijem
 *   TARGET_TOKEN  token s ovlastima nad ciljnim repozitorijem
 *                 (ako je isti token za oba, dovoljan je GITHUB_TOKEN)
 */
import { readFileSync, existsSync } from 'node:fs';

const MANIFEST = 'ops/repo-switch/manifest.json';
const SOURCE = process.env.SOURCE_REPO || 'beckuphome-gnk/gnk-asg-portal';
const TARGET = process.env.TARGET_REPO;
const SRC_TOKEN = process.env.SOURCE_TOKEN || process.env.GITHUB_TOKEN;
const TGT_TOKEN = process.env.TARGET_TOKEN || process.env.GITHUB_TOKEN;
const APPLY = process.argv.includes('--apply');

const C = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', d: '\x1b[2m', x: '\x1b[0m' };

if (!TARGET || !SRC_TOKEN || !TGT_TOKEN) {
  console.error('Postavi TARGET_REPO i tokene (GITHUB_TOKEN ili SOURCE_TOKEN + TARGET_TOKEN).');
  process.exit(1);
}
if (!existsSync(MANIFEST)) {
  console.error('Nema popisa. Pokreni prvo: node scripts/repo-switch-manifest.mjs');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const wanted = manifest.workflows.active;
if (!wanted || !wanted.length) {
  console.error('Popis ne sadrzi stanja workflowa. Pokreni generator s tokenom.');
  process.exit(1);
}

const api = async (repo, token, path, method = 'GET') => {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' },
  });
  return { ok: res.ok, status: res.status, body: res.status === 204 ? null : await res.json().catch(() => null) };
};

async function workflows(repo, token) {
  const out = {};
  for (let page = 1; page <= 6; page++) {
    const r = await api(repo, token, `/actions/workflows?per_page=100&page=${page}`);
    if (!r.ok) throw new Error(`${repo}: HTTP ${r.status}`);
    for (const w of r.body.workflows || []) out[w.path.split('/').pop()] = { id: w.id, state: w.state };
    if ((r.body.workflows || []).length < 100) break;
  }
  return out;
}

console.log(`\n${APPLY ? C.r + 'STVARNA ZAMJENA' + C.x : C.y + 'SAMO PRIKAZ — nista se ne mijenja' + C.x}`);
console.log(`iz:  ${SOURCE}`);
console.log(`u:   ${TARGET}`);
console.log(`popis: ${wanted.length} automatizacija\n`);

const src = await workflows(SOURCE, SRC_TOKEN);
const tgt = await workflows(TARGET, TGT_TOKEN).catch((e) => {
  console.error(`${C.r}Ciljni repozitorij nije dostupan: ${e.message}${C.x}`);
  process.exit(1);
});

const toDisable = wanted.filter((f) => src[f]?.state === 'active');
const toEnable = wanted.filter((f) => tgt[f] && tgt[f].state !== 'active');
const missing = wanted.filter((f) => !tgt[f]);

if (missing.length) {
  console.log(`${C.r}${missing.length} automatizacija ne postoji u ciljnom repozitoriju:${C.x}`);
  missing.slice(0, 8).forEach((f) => console.log(`   ${f}`));
  console.log(`${C.d}   Pokreni mirror pa ponovi.${C.x}\n`);
}

console.log(`ugasiti u izvornom: ${toDisable.length}`);
console.log(`upaliti u ciljnom:  ${toEnable.length}\n`);

if (!APPLY) {
  console.log(`${C.d}Za stvarnu zamjenu dodaj --apply${C.x}\n`);
  process.exit(missing.length ? 1 : 0);
}
if (missing.length) {
  console.error(`${C.r}Prekidam — ciljni repozitorij nije potpun.${C.x}`);
  process.exit(1);
}

// Redoslijed je bitan: prvo gasimo, pa palimo. Obrnuto bi na trenutak
// ostavilo oba repozitorija aktivnima i objave bi otisle dvaput.
let failed = 0;
console.log('gasim u izvornom...');
for (const f of toDisable) {
  const r = await api(SOURCE, SRC_TOKEN, `/actions/workflows/${src[f].id}/disable`, 'PUT');
  console.log(`  ${r.ok ? C.g + 'ok ' : C.r + 'pad'}${C.x} ${f}`);
  if (!r.ok) failed++;
}

console.log('\npalim u ciljnom...');
for (const f of toEnable) {
  const r = await api(TARGET, TGT_TOKEN, `/actions/workflows/${tgt[f].id}/enable`, 'PUT');
  console.log(`  ${r.ok ? C.g + 'ok ' : C.r + 'pad'}${C.x} ${f}`);
  if (!r.ok) failed++;
}

console.log('\n' + '-'.repeat(60));
if (failed) {
  console.log(`${C.r}${failed} promjena nije prosla — provjeri rucno prije nego nastavis.${C.x}\n`);
  process.exit(1);
}
console.log(`${C.g}Zamjena gotova.${C.x} Automatizacije sada rade u ${TARGET}.`);
console.log(`${C.d}Provjeri prvi prolaz blog-mirror-publish prije nego se udaljis.${C.x}\n`);
