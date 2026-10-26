#!/usr/bin/env node
/**
 * HREFLANG RECIPROCITY — ako stranica kaže „ova druga stranica je moj
 * prijevod", druga stranica to mora reći natrag.
 *
 * Jednosmjerni hreflang je česta greška: hrvatska stranica uputi na englesku,
 * a engleska se ne sjeti hrvatske (ili uputi na drugu adresu). Tražilica tada
 * dobije dvije polovične izjave i odabere ništa.
 *
 * Test pokriva mrežne površine koje same sebe predstavljaju kao dvojezične:
 *   • /glavni-gradovi/ i /en/capitals/ (popis + 34 stranice),
 *   • /mreza/ i /en/network/,
 *   • /izdanja/ i deskovi (samo stranice koje stvarno deklariraju prijevod),
 *   • 17 gradskih kanala i njihovi engleski pregledi.
 *
 * Provjerava: datoteka postoji, canonical se slaže s hreflang adresom, i
 * povratni hreflang pokazuje točno na izvornu stranicu.
 *
 * Test ne piše ništa i ne pristupa mreži.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const ORIGIN = 'https://gnk-asg.hr/';

const failures = [];
const notes = [];
const fail = (message) => failures.push(message);

/* ---------- popis površina ---------- */

const chanDir = join(ROOT, 'apps', 'region', 'channels.json');
const CHANNELS = JSON.parse(readFileSync(chanDir, 'utf8')).channels;
const CAPITALS = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'capitals.json'), 'utf8')).capitals || [];

const files = new Set([
  'glavni-gradovi/index.html',
  'en/capitals/index.html',
  'mreza/index.html',
  'en/network/index.html',
  'izdanja/index.html'
]);
for (const cap of CAPITALS) {
  if (!cap.slug) continue;
  files.add(`glavni-gradovi/${cap.slug}/index.html`);
  files.add(`en/capitals/${cap.slug}/index.html`);
}
for (const channel of CHANNELS) {
  files.add(`kanal/${channel.id}/index.html`);
  files.add(`kanal/${channel.id}/en/index.html`);
}
for (const rel of files) {
  if (!existsSync(join(PORTAL, rel))) fail(`${rel}: nedostaje — pokreni build i hub`);
}

/* ---------- čitanje ---------- */

const cache = new Map();
const read = (rel) => {
  if (!cache.has(rel)) cache.set(rel, readFileSync(join(PORTAL, rel), 'utf8'));
  return cache.get(rel);
};
const canonicalOf = (html) => (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '';
const langOf = (html) => (html.match(/<html lang="([^"]+)"/) || [])[1] || '';
const alternatesOf = (html) => [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)]
  .map((match) => [match[1], match[2]]);

/* Adresa → datoteka. Mapa bez završne kose crte čita index.html. */
const relOfUrl = (url) => {
  if (!url.startsWith(ORIGIN)) return null;
  let rel = url.slice(ORIGIN.length);
  if (rel === '') rel = 'index.html';
  else if (rel.endsWith('/')) rel += 'index.html';
  else {
    try { if (statSync(join(PORTAL, rel)).isDirectory()) rel = join(rel, 'index.html'); } catch { /* ostaje kako jest */ }
  }
  return rel;
};

/* ---------- provjera ---------- */

const seenPairs = new Set();
let pairs = 0;
let missingAlternates = 0;

for (const rel of files) {
  if (!existsSync(join(PORTAL, rel))) continue;
  const html = read(rel);
  const canonical = canonicalOf(html);
  const lang = langOf(html);
  if (!canonical) { fail(`${rel}: nema canonical`); continue; }
  const alternates = alternatesOf(html);
  if (!alternates.length) { missingAlternates += 1; continue; }
  const langs = alternates.map(([code]) => code);
  /* Vlastiti jezik i x-default su obavezni; engleski samo ako stranica nije
     engleska. Japanska stranica ne mora tvrditi da ima hrvatsku inačicu. */
  if (!langs.includes(lang)) fail(`${rel}: nema hreflang vlastitog jezika (${lang})`);
  if (!langs.includes('x-default')) fail(`${rel}: nema hreflang x-default`);
  if (lang !== 'en' && !langs.includes('en')) fail(`${rel}: nema hreflang en`);
  if (langs.length < 2) fail(`${rel}: samo jedan hreflang`);
  for (const [code, url] of alternates) {
    pairs += 1;
    const targetRel = relOfUrl(url);
    if (!targetRel) { fail(`${rel}: hreflang ${code} vodi izvan gnk-asg.hr (${url})`); continue; }
    if (!existsSync(join(PORTAL, targetRel))) { fail(`${rel}: hreflang ${code} → ${targetRel} ne postoji`); continue; }
    const pairKey = `${rel}|${targetRel}`;
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);
    const target = read(targetRel);
    const targetCanonical = canonicalOf(target);
    if (targetCanonical !== url) fail(`${rel}: hreflang ${code} kaže ${url}, a stranica ima canonical ${targetCanonical}`);
    const back = alternatesOf(target).filter(([, href]) => href === canonical);
    if (!back.length) fail(`${rel} → ${targetRel}: nema povratnog hreflanga na ${canonical}`);
    const explicit = alternatesOf(target).find(([targetCode]) => targetCode === lang);
    if (!explicit) fail(`${targetRel}: nema hreflanga ${lang} prema ${rel}`);
    else if (explicit[1] !== canonical) fail(`${targetRel}: hreflang ${lang} pokazuje ${explicit[1]}, očekivano ${canonical}`);
  }
}

/* Prijestolnice su dvojezične po ugovoru — bez prijevoda nema izgovora. */
for (const cap of CAPITALS) {
  if (!cap.slug) continue;
  for (const rel of [`glavni-gradovi/${cap.slug}/index.html`, `en/capitals/${cap.slug}/index.html`]) {
    if (!existsSync(join(PORTAL, rel))) continue;
    if (!alternatesOf(read(rel)).length) fail(`${rel}: stranica prijestolnice nema hreflang`);
  }
}

if (missingAlternates) notes.push(`${missingAlternates} stranica ne deklarira prijevod (jednojezične)`);

console.log(JSON.stringify({
  ok: failures.length === 0,
  version: 'GNK_ASG_HREFLANG_RECIPROCITY_V1_20261023',
  pages: files.size,
  pairs,
  uniquePairs: seenPairs.size,
  singleLanguage: missingAlternates,
  notes,
  failures
}, null, 2));
if (failures.length) process.exit(1);
