#!/usr/bin/env node
/**
 * JEDAN IZVOR BROJEVA ZA CIJELU MREŽU.
 *
 * Problem koji ovaj skript rješava: na istoj mreži stajala su tri različita
 * broja tekstova — 3.360 na AKTUAL MEDIA, 4.349 na središnjoj ploči i 4.877 u
 * arhivi. Svi su bili "točni" u trenutku kad su upisani, ali nijedan nije
 * bio izračunat iz podataka u trenutku gradnje. Čitatelj to vidi kao
 * neurednost, a tražilica kao nestabilan sadržaj.
 *
 * Rješenje: brojevi se ne prepisuju, nego se računaju. Ovaj skript prolazi
 * kroz stvarne izvore i zapisuje jednu datoteku iz koje svi generatori čitaju:
 *
 *   apps/portal/data/network-counts-v1.json
 *
 * Izvori, po redu:
 *   apps/region/data/<kanal>.json   — objave po kanalu (stvarni broj, ne cap)
 *   apps/region/channels.json       — popis kanala, jezika i zemalja
 *   apps/portal/data/mreza-v1.json  — samostalni webovi i svjetska izdanja
 *   apps/portal/data/izvori*.json   — registar izvora (ako postoji)
 *
 * Pokretanje:
 *   node scripts/build-network-counts-v1.mjs
 *   node scripts/build-network-counts-v1.mjs --check   # padne ako zapis zaostaje
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGION_DATA = join(ROOT, 'apps', 'region', 'data');
const OUT = join(ROOT, 'apps', 'portal', 'data', 'network-counts-v1.json');
const CHECK = process.argv.includes('--check');

const readJSON = (path, fallback = null) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
};

const channelsFile = readJSON(join(ROOT, 'apps', 'region', 'channels.json'), { channels: [] });
const CHANNELS = channelsFile.channels || [];
const mreza = readJSON(join(ROOT, 'apps', 'portal', 'data', 'mreza-v1.json'), { sites: [], editions: [], world: [] });

/* --- po kanalu: stvarni broj objava i zadnji datum --- */
const perChannel = [];
let totalTexts = 0;
let newest = '';
const dates = [];

for (const channel of CHANNELS) {
  const data = readJSON(join(REGION_DATA, `${channel.id}.json`), { items: [], updatedAt: '' });
  const items = data.items || [];
  const last = items[0]?.date || data.updatedAt || '';
  if (last) dates.push(last.slice(0, 10));
  if (last > newest) newest = last;
  totalTexts += items.length;
  perChannel.push({
    id: channel.id,
    name: channel.title,
    city: channel.city,
    country: channel.country,
    lang: channel.lang,
    count: items.length,
    lastItemAt: last
  });
}

/* Zadnji podatkovni dan: najmlađi datum među svim kanalima. Datumi iz
   budućnosti se odbacuju — stranica ne smije tvrditi da ima sadržaj koji
   još ne postoji. */
const today = new Date().toISOString().slice(0, 10);
const dataDay = dates.filter((day) => day <= today).sort().pop() || '';

/* --- mreža: webovi i izdanja --- */
const counts = {
  version: 'AKTUAL_MEDIA_NETWORK_COUNTS_V1',
  generatedAt: today,
  dataDay,
  note: 'Brojevi se računaju iz podataka pri svakoj gradnji. Nijedan generator ne smije pisati broj koji nije u ovoj datoteci.',
  texts: totalTexts,
  cities: CHANNELS.length,
  languages: new Set(CHANNELS.map((channel) => channel.lang)).size,
  countries: new Set(CHANNELS.map((channel) => channel.country)).size,
  continents: new Set(CHANNELS.map((channel) => channel.continent).filter(Boolean)).size,
  editions: Number(mreza.editionCount) || (mreza.editions || []).length,
  sites: Number(mreza.count) || (mreza.sites || []).length,
  world: Number(mreza.worldCount) || (mreza.world || []).length,
  channels: perChannel
};

/* Broj medijskih izvora: iz registra izvora ako postoji, inače iz kanala
   (broj izvora po kanalu se zbraja bez ponavljanja imena). */
const sourceNames = new Set();
for (const channel of CHANNELS) {
  for (const source of channel.sources || []) sourceNames.add(String(source.name || source.id || '').toLowerCase());
}
counts.sources = sourceNames.size;

/* Arhiva i dnevnik: broj zapisa iz njihovih vlastitih datoteka, ako postoje. */
const archiveFile = join(ROOT, 'apps', 'arhiva', 'site', 'data', 'arhiva.json');
if (existsSync(archiveFile)) {
  const archive = readJSON(archiveFile, {});
  if (Number.isFinite(archive.count)) counts.archiveCount = archive.count;
}
const productsFile = join(ROOT, 'apps', 'portal', 'data', 'aktual-products-v1.json');
if (existsSync(productsFile)) {
  const products = readJSON(productsFile, {});
  if (Array.isArray(products.products)) counts.products = products.products.length;
}

const payload = `${JSON.stringify(counts, null, 2)}\n`;

if (CHECK) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  /* Dopuštamo razliku u generiranom datumu: provjera gleda brojeve. */
  const a = current ? JSON.parse(current) : {};
  const same = ['texts', 'cities', 'languages', 'editions', 'sites', 'world'].every((key) => a[key] === counts[key]);
  console.log(JSON.stringify({ version: counts.version, check: same ? 'ok' : 'stale', texts: counts.texts, dataDay: counts.dataDay }, null, 2));
  if (!same) process.exit(1);
} else {
  writeFileSync(OUT, payload);
  console.log(JSON.stringify({
    version: counts.version,
    texts: counts.texts,
    cities: counts.cities,
    languages: counts.languages,
    editions: counts.editions,
    sites: counts.sites,
    world: counts.world,
    sources: counts.sources,
    dataDay: counts.dataDay,
    out: 'apps/portal/data/network-counts-v1.json'
  }, null, 2));
}
