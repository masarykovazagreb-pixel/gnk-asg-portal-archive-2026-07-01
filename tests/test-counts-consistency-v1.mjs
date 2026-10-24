#!/usr/bin/env node
/**
 * BROJKE SE NE SMIJU RAZILAZITI — ista mreža, isti zbroj.
 *
 * Na mreži su istodobno stajala tri različita broja tekstova: 3.360 na
 * AKTUAL MEDIA, 4.349 na središnjoj ploči i 4.877 u arhivi. Svaki je bio
 * točan u trenutku upisa; nijedan nije bio izračunat. Čitatelj to vidi kao
 * neurednost, a tražilica kao nestabilan sadržaj.
 *
 * Test radi dvije stvari:
 *   1. provjerava da `network-counts-v1.json` odgovara stvarnim podacima
 *      (zbroj objava u `apps/region/data/*.json` i broj kanala);
 *   2. traži da nijedna javna stranica ne nosi stari broj tekstova koji se
 *      razlikuje od izračunatog (dopušten je regionalni podskup, ali mora
 *      pisati da je podskup).
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };

const readJSON = (path, fallback = null) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
};

const counts = readJSON(join(ROOT, 'apps/portal/data/network-counts-v1.json'));
check(Boolean(counts), 'network-counts-v1.json nedostaje — pokreni scripts/build-network-counts-v1.mjs');
if (!counts) { console.log(JSON.stringify({ ok: false, failures: fails.length })); process.exit(1); }

/* --- 1. zapis odgovara podacima --- */
const regionDir = join(ROOT, 'apps/region/data');
let realTexts = 0;
let channels = 0;
for (const name of readdirSync(regionDir)) {
  if (!name.endsWith('.json') || name.startsWith('_')) continue;
  const data = readJSON(join(regionDir, name), { items: [] });
  realTexts += (data.items || []).length;
  channels += 1;
}
check(counts.texts === realTexts, `zapis kaže ${counts.texts} tekstova, podaci ${realTexts}`);
check(counts.cities === channels, `zapis kaže ${counts.cities} gradova, podaci ${channels}`);
check(Array.isArray(counts.channels) && counts.channels.length === channels, 'po kanalu nema svih zapisa');
check(/^\d{4}-\d{2}-\d{2}$/.test(counts.dataDay || ''), 'nema podatkovnog dana');

/* --- 2. javne stranice ne nose stari zbroj --- */
const PAGES = [
  'apps/portal/gnk-aktual/index.html',
  'apps/portal/kanal/index.html',
  'apps/portal/izdanja/index.html',
  'apps/portal/aktual-media/index.html',
  'apps/portal/sve-stranice/index.html',
  'apps/arhiva/site/index.html',
  'apps/dnevnik/site/index.html'
];

/* Poznati stari brojevi koji su stajali uz tvrdnju "tekstova". Ako se vrate,
   test pada — ne zato što je broj ružan, nego zato što nije izračunat. */
const STALE = ['3.360', '4.349', '4.877'];
const hrTexts = Number(counts.texts).toLocaleString('hr-HR');

let scanned = 0;
for (const rel of PAGES) {
  const file = join(ROOT, rel);
  if (!existsSync(file)) continue;
  scanned += 1;
  const html = readFileSync(file, 'utf8');
  for (const stale of STALE) {
    if (stale === hrTexts) continue;
    /* Dopušteno je da se stari broj pojavi u kontekstu regionalnog podskupa
       ("zapisa u regionalnoj arhivi"), pa se gleda samo izravna tvrdnja. */
    const pattern = new RegExp(`${stale.replace('.', '\\.')}\\s*(tekstova|stories)`, 'i');
    if (pattern.test(html)) fails.push(`${rel}: stari zbroj ${stale} uz riječ "tekstova"`);
  }
}

/* --- 3. inventura i izvještaj postoje i slažu se --- */
const invent = join(ROOT, 'apps/portal/sve-stranice/index.html');
check(existsSync(invent), 'nema /sve-stranice/ — pokreni scripts/build-pages-inventory-v1.mjs');
check(existsSync(join(ROOT, 'docs/izvjestaj-inventure-v1.md')), 'nema docs/izvjestaj-inventure-v1.md');

const report = {
  version: 'AKTUAL_MEDIA_COUNTS_CONSISTENCY_V1',
  texts: counts.texts,
  cities: counts.cities,
  dataDay: counts.dataDay,
  pagesScanned: scanned,
  failures: fails.length,
  ok: fails.length === 0
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) {
  console.error(fails.slice(0, 12).join('\n'));
  process.exit(1);
}
