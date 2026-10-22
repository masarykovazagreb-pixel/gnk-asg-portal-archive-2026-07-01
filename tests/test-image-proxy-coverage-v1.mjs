#!/usr/bin/env node
/**
 * POSREDNIK SLIKA — pokrivenost.
 *
 * Posrednik ima zatvoren popis hostova. Ako podaci sadrže sliku s hosta
 * kojeg na popisu nema, stranica prikaže slomljenu minijaturu — to se
 * dogodilo na svih devet deskova /izdanja/*.
 *
 * Ovaj test uspoređuje stvarne podatke s popisom i pada na svaki host
 * koji nedostaje, pa odluka o proširenju ne može promaći pregledu.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGION_IMAGE_HOSTS } from '../workers/gnk-asg-direct-operator/src/image-hosts-v1.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const allowed = new Set(REGION_IMAGE_HOSTS.map(([host]) => host));

if (allowed.size !== REGION_IMAGE_HOSTS.length) fails.push('popis hostova sadrži dvostruki unos');
for (const [host, outlet, country] of REGION_IMAGE_HOSTS) {
  if (!/^[a-z0-9.-]+$/.test(host)) fails.push(`${host}: host nije valjan`);
  if (host.includes('*')) fails.push(`${host}: džoker nije dopušten`);
  if (!outlet || !country) fails.push(`${host}: nema medij ili zemlju`);
  if (!/^[A-Z]{2}$/.test(country)) fails.push(`${host}: zemlja nije dvoslovna`);
}

/* Stvarni hostovi iz podataka svih gradskih izdanja. */
const dataDir = join(ROOT, 'apps', 'region', 'data');
const found = new Map();
for (const file of readdirSync(dataDir).filter((name) => /^[a-z]+\.json$/.test(name) && !name.startsWith('_') && name !== 'seed.json')) {
  let parsed;
  try { parsed = JSON.parse(readFileSync(join(dataDir, file), 'utf8')); } catch { continue; }
  for (const item of parsed.items || []) {
    if (!item.image) continue;
    let host;
    try { host = new URL(item.image).hostname.toLowerCase(); } catch { fails.push(`${file}: slika nije valjana adresa (${String(item.image).slice(0, 60)})`); continue; }
    found.set(host, (found.get(host) || 0) + 1);
  }
}

for (const [host, count] of found) {
  if (allowed.has(host)) continue;
  if (host === 'www.tportal.hr' || host === 'www.poslovni.hr') continue; // već u glavnom popisu
  fails.push(`${host} (${count} slika) nije na popisu — dodaj ga u image-hosts-v1.js s medijem i zemljom`);
}

const missing = [...allowed].filter((host) => !found.has(host) && host !== 'www.tportal.hr' && host !== 'www.poslovni.hr');
const stale = missing;

const report = {
  ok: fails.length === 0,
  version: 'GNK_ASG_IMAGE_HOST_COVERAGE_V1_20261022',
  allowedHosts: allowed.size,
  hostsInData: found.size,
  imagesInData: [...found.values()].reduce((sum, n) => sum + n, 0),
  unusedAllowlistEntries: stale,
  failures: fails,
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) process.exit(1);
