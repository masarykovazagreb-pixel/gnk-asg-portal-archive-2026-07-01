#!/usr/bin/env node
/**
 * UNUTRAŠNJOST IZDANJA = NASLOVNICA.
 *
 * Prigovor je bio konkretan: Beograd iznutra "izgleda jadno". Bio je u pravu —
 * naslovnica je imala jedanaest sekcija, a stranica članka tri. Čitatelj koji
 * dođe iz tražilice na tekst nije vidio ni atlas izdanja, ni mrežu gradova, ni
 * teme; izdanje je iznutra bilo puka kopija tuđe vijesti s potpisom.
 *
 * Ovaj test traži da svaka unutrašnja stranica nosi isti okvir kao naslovnica:
 * masthead s trakom izdanja, glavnu navigaciju, teme, atlas (mravinjak),
 * paukovu mrežu svih adresa, blok mreže AKTUAL MEDIA, blok razmjene i
 * podnožje s pločicama ostalih izdanja.
 *
 * Provjerava se PRISUTNOST, ne izgled: CSS je jedan (region.css), pa ista
 * oznaka znači isti izgled.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHANNELS = JSON.parse(readFileSync(join(ROOT, 'apps/region/channels.json'), 'utf8')).channels;

/* Oznake koje mora imati svaka unutrašnja stranica izdanja. */
const FRAME = [
  ['masthead', /class="masthead"/, 'zaglavlje izdanja'],
  ['editions-strip', /class="eds"/, 'traka svih izdanja'],
  ['main-nav', /class="mainnav"/, 'glavna navigacija'],
  ['themes', /tema\/[a-z-]+\//, 'veza na teme'],
  ['atlas', /class="mrv"|id="mravinjak"|href="[^"]*mravinjak\/"/, 'atlas (mravinjak)'],
  ['spider', /class="spider|spiderweb|SPIDER/, 'paukova mreža adresa'],
  ['mesh', /mesh-head|class="mesh"/, 'blok mreže AKTUAL MEDIA'],
  ['exchange', /am-exchange/, 'blok razmjene'],
  ['footer-tiles', /xf-tile/, 'pločice ostalih izdanja'],
  ['mark', /aktual-media-mark\.svg|assets\/brand\/[^"]*\.(svg|webp)/, 'znak kuće']
];

/* Stranice koje se provjeravaju: članak, tema, izvor, izvori, metodologija,
   mravinjak i mreža. Prva dostupna datoteka po vrsti je dovoljna — sve se
   pišu istim predloškom. */
const KINDS = [
  { id: 'clanak', label: 'članak', find: (dir) => firstDir(join(dir, 'clanak'), 'index.html') },
  { id: 'tema', label: 'tema', find: (dir) => firstDir(join(dir, 'tema'), 'index.html') },
  { id: 'izvor', label: 'izvor', find: (dir) => firstDir(join(dir, 'izvor'), 'index.html') },
  { id: 'izvori', label: 'popis izvora', find: (dir) => fix(join(dir, 'izvori', 'index.html')) },
  { id: 'metodologija', label: 'metodologija', find: (dir) => fix(join(dir, 'metodologija', 'index.html')) },
  { id: 'mravinjak', label: 'atlas', find: (dir) => fix(join(dir, 'mravinjak', 'index.html')) },
  { id: 'mreza', label: 'mreža', find: (dir) => fix(join(dir, 'mreza', 'index.html')) }
];

function fix(file) {
  return existsSync(file) ? file : null;
}

function firstDir(base, tail) {
  if (!existsSync(base)) return null;
  const dirs = readdirNames(base);
  for (const name of dirs) {
    const file = join(base, name, tail);
    if (existsSync(file)) return file;
  }
  return null;
}

function readdirNames(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

const fails = [];
let pages = 0;
const perKind = new Map();

for (const channel of CHANNELS) {
  const dir = join(ROOT, 'apps/portal/kanal', channel.id);
  for (const kind of KINDS) {
    const file = kind.find(dir);
    if (!file) continue;
    const html = readFileSync(file, 'utf8');
    pages += 1;
    perKind.set(kind.id, (perKind.get(kind.id) || 0) + 1);
    for (const [id, re, label] of FRAME) {
      if (!re.test(html)) fails.push(`${channel.id}/${kind.id}: nema ${label} (${id})`);
    }
    /* Unutrašnjost mora nositi isti jezik i isti kanonski okvir. */
    if (!/<html lang="(hr|en|[a-z]{2})"/.test(html)) fails.push(`${channel.id}/${kind.id}: nema lang`);
    if (!/<link rel="canonical"/.test(html)) fails.push(`${channel.id}/${kind.id}: nema canonical`);
  }
}

/* Naslovnica je mjerilo: sve što ona ima od okvira, ima i unutrašnjost. */
const home = join(ROOT, 'apps/portal/kanal', CHANNELS[0].id, 'index.html');
if (!existsSync(home)) fails.push('nema naslovnice prvog izdanja za mjerenje');
else {
  const html = readFileSync(home, 'utf8');
  for (const [id, re, label] of FRAME) {
    if (!re.test(html)) fails.push(`naslovnica ${CHANNELS[0].id}: nema ${label} (${id})`);
  }
}

const report = {
  version: 'AKTUAL_MEDIA_EDITION_INNER_PARITY_V1',
  channels: CHANNELS.length,
  pages,
  kinds: Object.fromEntries(perKind),
  checks: FRAME.length,
  failures: fails.length,
  ok: fails.length === 0
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) {
  console.error(fails.slice(0, 20).join('\n'));
  if (fails.length > 20) console.error(`… i još ${fails.length - 20}`);
  process.exit(1);
}
