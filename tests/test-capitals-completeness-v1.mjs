#!/usr/bin/env node
/**
 * GLAVNI GRADOVI — ugovor, ne popis želja.
 *
 * Ovaj test ne provjerava izgled stranice (to radi test-network-atlas-v1), nego
 * ugovor između tri popisa:
 *
 *   capitals.json  — koje zemlje pokrivamo i iz koje prijestolnice
 *   channels.json  — koja izdanja stvarno postoje, na kojem jeziku i kontinentu
 *   sitemap.xml    — koje su adrese javno objavljene
 *
 * Pravila:
 *   • svaka zemlja ima točno jedan glavni grad i jedinstven slug;
 *   • izdanje označeno kao „live" mora postojati u channels.json, na istom
 *     jeziku, kontinentu i u istoj vremenskoj zoni;
 *   • prijestolnica u pripremi ne smije imati izdanje, ali mora imati grad
 *     koji tu zemlju pokriva danas („seats") — inače čitatelj ostaje bez puta;
 *   • sve 34 adrese (17 hrvatskih + 17 engleskih) moraju biti u sitemapu.
 *
 * Test ne piše ništa i ne pristupa mreži.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const CAPITALS = readJson(join(ROOT, 'apps', 'region', 'capitals.json'));
const CHANNELS = readJson(join(ROOT, 'apps', 'region', 'channels.json')).channels;
const capList = CAPITALS.capitals || [];
const channelBy = (id) => CHANNELS.find((channel) => channel.id === id) || null;

const failures = [];
const notes = [];
const fail = (message) => failures.push(message);

/* ---------- 1. popis ---------- */

const seenSlugs = new Set();
const seenCountries = new Set();
for (const cap of capList) {
  for (const field of ['countryCode', 'country', 'capital', 'capitalEn', 'lang', 'continent', 'timezone', 'slug', 'status']) {
    if (!cap[field]) fail(`${cap.capital || cap.countryCode}: nedostaje polje ${field}`);
  }
  if (seenSlugs.has(cap.slug)) fail(`${cap.slug}: dvostruki slug`);
  seenSlugs.add(cap.slug);
  if (seenCountries.has(cap.countryCode)) fail(`${cap.countryCode}: dvije prijestolnice za istu zemlju`);
  seenCountries.add(cap.countryCode);
  if (!['live', 'preparing'].includes(cap.status)) fail(`${cap.slug}: status "${cap.status}" nije ni live ni preparing`);
}

const live = capList.filter((c) => c.status === 'live');
const preparing = capList.filter((c) => c.status !== 'live');

/* ---------- 2. živa prijestolnica = stvarno izdanje ---------- */

for (const cap of live) {
  if (!cap.edition) { fail(`${cap.slug}: status live, ali nema izdanja`); continue; }
  const channel = channelBy(cap.edition);
  if (!channel) { fail(`${cap.slug}: izdanje ${cap.edition} ne postoji u channels.json`); continue; }
  if (channel.lang !== cap.lang) fail(`${cap.slug}: izdanje je na ${channel.lang}, popis kaže ${cap.lang}`);
  if (channel.countryCode !== cap.countryCode) fail(`${cap.slug}: izdanje pokriva ${channel.countryCode}, popis kaže ${cap.countryCode}`);
  if (channel.continent !== cap.continent) fail(`${cap.slug}: kontinent izdanja ${channel.continent} ≠ ${cap.continent}`);
  if (channel.timezone !== cap.timezone) fail(`${cap.slug}: zona izdanja ${channel.timezone} ≠ ${cap.timezone}`);
  if (!Array.isArray(channel.sources) || channel.sources.length < 4) fail(`${cap.slug}: izdanje ima manje od četiri izvora`);
}

/* ---------- 3. prijestolnica u pripremi ima put do izdanja ---------- */

for (const cap of preparing) {
  if (cap.edition) fail(`${cap.slug}: status preparing, ali ima izdanje ${cap.edition}`);
  const seats = cap.seats ? channelBy(cap.seats) : null;
  if (!seats) { fail(`${cap.slug}: priprema bez polja seats — čitatelj ne zna gdje je zemlja danas`); continue; }
  if (seats.countryCode !== cap.countryCode) fail(`${cap.slug}: seats ${cap.seats} pokriva ${seats.countryCode}, ne ${cap.countryCode}`);
  if (!cap.note || cap.note.length < 40) fail(`${cap.slug}: priprema bez objašnjenja (note)`);
  if (channelBy(cap.slug)) fail(`${cap.slug}: grad već ima kanal, ali popis ga vodi kao pripremu`);
}

/* Zanimljivost koju test čuva: zemlja može biti pokrivena iz grada koji nije
   glavni — tada prijestolnica mora biti na popisu, makar u pripremi. */
for (const channel of CHANNELS) {
  const cap = capList.find((c) => c.countryCode === channel.countryCode);
  if (!cap) fail(`${channel.id}: izdanje pokriva ${channel.countryCode}, a te zemlje nema na popisu prijestolnica`);
}

/* ---------- 3b. veza mora biti obostrana ---------- */

/* Stranica prijestolnice vodi na izdanje; izdanje mora voditi natrag na
   stranicu prijestolnice. Jednosmjerna veza je slijepa ulica. */
for (const cap of capList) {
  const channel = cap.edition ? channelBy(cap.edition) : cap.seats ? channelBy(cap.seats) : null;
  if (!channel) continue;
  const rel = `apps/portal/kanal/${channel.id}/index.html`;
  const file = join(ROOT, rel);
  if (!existsSync(file)) { fail(`${rel}: nedostaje`); continue; }
  const html = readFileSync(file, 'utf8');
  const target = channel.lang === 'en' ? `/en/capitals/${cap.slug}/` : `/glavni-gradovi/${cap.slug}/`;
  if (!html.includes(target)) fail(`${rel}: ne vodi na stranicu prijestolnice ${target}`);
  if (!/hreflang="(en|hr)">(?:[^<]*): /.test(html)) fail(`${rel}: veza na prijestolnicu nema hreflang`);
}

/* ---------- 4. stranice i sitemap ---------- */

const dataFile = join(ROOT, 'apps', 'portal', 'data', 'glavni-gradovi-v1.json');
if (!existsSync(dataFile)) fail('data/glavni-gradovi-v1.json nedostaje — pokreni node apps/region/engine/hub.mjs');
else {
  const data = readJson(dataFile);
  if (data.pages !== capList.length * 2) fail(`data: ${data.pages} stranica, očekivano ${capList.length * 2}`);
  for (const cap of capList) {
    const entry = (data.capitals || []).find((c) => c.slug === cap.slug);
    if (!entry) { fail(`${cap.slug}: nema zapisa u glavni-gradovi-v1.json`); continue; }
    if (entry.page !== `https://gnk-asg.hr/glavni-gradovi/${cap.slug}/`) fail(`${cap.slug}: page adresa nije kanonska`);
    if (entry.pageEn !== `https://gnk-asg.hr/en/capitals/${cap.slug}/`) fail(`${cap.slug}: pageEn adresa nije kanonska`);
    if (cap.status === 'live' && entry.portal !== `https://gnk-world-${cap.edition}.pages.dev/`) fail(`${cap.slug}: portal ne odgovara izdanju`);
    if (cap.status !== 'live' && entry.portal !== null) fail(`${cap.slug}: priprema ne smije imati portal`);
  }
}

const sitemapFile = join(ROOT, 'apps', 'portal', 'glavni-gradovi', 'sitemap.xml');
if (!existsSync(sitemapFile)) fail('glavni-gradovi/sitemap.xml nedostaje — pokreni node apps/region/engine/hub.mjs');
else {
  const xml = readFileSync(sitemapFile, 'utf8');
  for (const cap of capList) {
    if (!xml.includes(`<loc>https://gnk-asg.hr/glavni-gradovi/${cap.slug}/</loc>`)) fail(`sitemap: nema /glavni-gradovi/${cap.slug}/`);
    if (!xml.includes(`<loc>https://gnk-asg.hr/en/capitals/${cap.slug}/</loc>`)) fail(`sitemap: nema /en/capitals/${cap.slug}/`);
  }
  const count = (xml.match(/<loc>/g) || []).length;
  if (count !== capList.length * 2) fail(`sitemap: ${count} adresa, očekivano ${capList.length * 2}`);
}

const llmsFile = join(ROOT, 'apps', 'portal', 'glavni-gradovi', 'llms.txt');
if (!existsSync(llmsFile)) fail('glavni-gradovi/llms.txt nedostaje — pokreni node apps/region/engine/hub.mjs');
else {
  const text = readFileSync(llmsFile, 'utf8');
  for (const cap of capList) if (!text.includes(`https://gnk-asg.hr/glavni-gradovi/${cap.slug}/`)) fail(`llms.txt: nema ${cap.slug}`);
  const listed = (text.match(/^- /gm) || []).length;
  if (listed < capList.length) fail(`llms.txt: ${listed} stavki, očekivano najmanje ${capList.length}`);
}

const indexFile = join(ROOT, 'apps', 'portal', 'sitemap-index.xml');
if (!existsSync(indexFile)) fail('sitemap-index.xml nedostaje');
else if (!readFileSync(indexFile, 'utf8').includes('https://gnk-asg.hr/glavni-gradovi/sitemap.xml')) {
  fail('sitemap-index.xml ne navodi glavni-gradovi/sitemap.xml');
}

/* ---------- 5. brojke ---------- */

const continents = [...new Set(capList.map((c) => c.continent))];
const languages = [...new Set(live.map((c) => c.lang))];
if (continents.length < 6) notes.push(`pokriveno ${continents.length} kontinenata`);
if (preparing.length !== 3) notes.push(`${preparing.length} prijestolnica u pripremi`);

const result = {
  ok: failures.length === 0,
  version: 'GNK_ASG_CAPITALS_COMPLETENESS_V1_20261023',
  capitals: capList.length,
  live: live.length,
  preparing: preparing.length,
  pages: capList.length * 2,
  continents: continents.length,
  languages: languages.length,
  notes,
  failures
};
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
