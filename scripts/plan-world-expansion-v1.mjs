#!/usr/bin/env node
/**
 * POKRIVENOST MREŽE — koliko je zemalja stvarno pokriveno i što slijedi.
 *
 * Skript ne piše marketinške brojke. Uzima channels.json (što je javno) i
 * plan valova (što je dogovoreno) i računa:
 *
 *   - koliko je izdanja javno, na koliko kontinenata, na koliko jezika;
 *   - koliko zemalja plan pokriva i koliko tek treba;
 *   - što svaki sljedeći grad mora imati prije objave (izvori, scena,
 *     sučelje, zapis u arhivi).
 *
 * Rezultat ide u apps/portal/data/world-coverage-v1.json i na javnu stranicu
 * /pokrivenost/ (i /en/coverage/).
 *
 *   node scripts/plan-world-expansion-v1.mjs            # izračunaj i upiši
 *   node scripts/plan-world-expansion-v1.mjs --check    # provjeri (gate)
 *   node scripts/plan-world-expansion-v1.mjs --next 5   # sljedećih pet
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLANNED, LIVE_IDS, WAVES, REQUIREMENTS, PLAN_VERSION, WORLD_CODES } from '../apps/world/lib/expansion-plan.mjs';
import { CONTINENTS } from '../apps/world/lib/registry.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const nextIndex = process.argv.indexOf('--next');
const NEXT = nextIndex > -1 ? Number(process.argv[nextIndex + 1] || 5) : 0;

/* Plan piše kontinente na hrvatskom (kako ih čita urednik), a pokrivenost
   se iskazuje na engleskom (kako ih čita tražilica i svjetsko izdanje). */
const CONTINENT_EN = {
  Europa: 'Europe',
  'Sjeverna Amerika': 'North America',
  'Južna Amerika': 'South America',
  Afrika: 'Africa',
  Azija: 'Asia',
  Oceanija: 'Oceania'
};

const channels = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8')).channels;
const live = channels.map((channel) => channel.id);

const fails = [];

/* 1. Plan i stvarno stanje moraju se poklapati u oba smjera. */
for (const id of live) {
  if (!LIVE_IDS.includes(id)) fails.push(`izdanje ${id} postoji, ali ga nema u planu`);
}
for (const id of LIVE_IDS) {
  if (!live.includes(id)) fails.push(`plan tvrdi da je ${id} javno, a nema ga u channels.json`);
}

/* 2. Plan ne smije imati dvostruke gradove ni dvostruke zemlje. */
const seen = new Map();
for (const entry of PLANNED) {
  if (seen.has(entry.id)) fails.push(`dvostruki grad u planu: ${entry.id}`);
  seen.set(entry.id, entry);
  for (const field of ['city', 'country', 'countryCode', 'lang', 'timezone', 'continent']) {
    if (!entry[field]) fails.push(`${entry.id}: nedostaje ${field}`);
  }
  if (!/^[A-Z]{2}$/.test(entry.countryCode)) fails.push(`${entry.id}: countryCode nije ISO 3166-1 alpha-2 (${entry.countryCode})`);
  if (!/^[A-Za-z][A-Za-z_-]*(?:\/[A-Za-z][A-Za-z_-]*){1,2}$/.test(entry.timezone)) fails.push(`${entry.id}: vremenska zona nije u obliku Kontinent/Grad (${entry.timezone})`);
}

/* 2b. Plan mora zatvoriti krug: svaka od 195 država ima točno jedno izdanje
   (javno ili planirano). Ako neka nedostaje, gate je imenuje — "sve države"
   je tvrdnja koja se provjerava, ne izgovara. */
const plannedCodes = new Set(PLANNED.map((entry) => entry.countryCode));
const liveCodes = new Set(channels.map((channel) => channel.countryCode));
const uncovered = WORLD_CODES.filter((code) => !plannedCodes.has(code) && !liveCodes.has(code));
if (uncovered.length) fails.push(`plan ne pokriva ${uncovered.length} država: ${uncovered.join(' ')}`);
const unknown = [...new Set([...plannedCodes, ...liveCodes])].filter((code) => !WORLD_CODES.includes(code));
if (unknown.length) fails.push(`plan ima oznake koje nisu države: ${unknown.join(' ')}`);
/* Neke države imaju dva grada (New York i Washington, Sydney i Canberra,
   São Paulo i Brasília). To nije greška — ali se broji, da se ne bi činilo
   da plan ima više država nego što ih stvarno ima. */
const multiCity = WORLD_CODES.filter((code) => (
  PLANNED.filter((entry) => entry.countryCode === code).length
  + channels.filter((channel) => channel.countryCode === code).length
) > 1);

/* 3. Pokrivenost — računa se iz podataka, ne upisuje. */
const liveChannels = channels.filter((channel) => live.includes(channel.id));
const liveCountries = new Set(liveChannels.map((channel) => channel.countryCode || channel.country));
const liveLangs = new Set(liveChannels.map((channel) => channel.lang));
const liveContinents = new Set(liveChannels.map((channel) => (CONTINENTS[channel.id] || {}).en || 'Europe'));

const plannedCountries = new Set(PLANNED.map((entry) => entry.countryCode));
const allCountries = new Set([...liveCountries, ...plannedCountries]);
const plannedContinents = new Set(PLANNED.map((entry) => CONTINENT_EN[entry.continent] || entry.continent));

const byContinent = {};
for (const entry of PLANNED) {
  const name = CONTINENT_EN[entry.continent] || entry.continent;
  byContinent[name] = byContinent[name] || { planned: 0 };
  byContinent[name].planned += 1;
}
for (const channel of liveChannels) {
  const name = (CONTINENTS[channel.id] || {}).en || 'Europe';
  byContinent[name] = byContinent[name] || { planned: 0 };
  byContinent[name].live = (byContinent[name].live || 0) + 1;
}

const coverage = {
  version: PLAN_VERSION,
  generatedAt: new Date().toISOString(),
  live: {
    editions: liveChannels.length,
    countries: liveCountries.size,
    languages: liveLangs.size,
    continents: liveContinents.size,
    ids: liveChannels.map((channel) => channel.id),
    continentNames: [...liveContinents].sort()
  },
  planned: {
    cities: PLANNED.length,
    countries: plannedCountries.size,
    newCountries: [...plannedCountries].filter((code) => !liveCountries.has(code)).length,
    continents: [...new Set([...liveContinents, ...plannedContinents])].length,
    languages: [...new Set(PLANNED.map((entry) => entry.lang))].sort().length,
    waves: WAVES.map((wave) => ({ id: wave.id, name: wave.name, status: wave.status, cities: wave.cities.length }))
  },
  total: {
    countries: allCountries.size,
    editions: liveChannels.length + PLANNED.length
  },
  byContinent,
  requirements: REQUIREMENTS,
  multiCityCountries: multiCity,
  next: PLANNED.slice(0, 12).map((entry) => ({
    id: entry.id, city: entry.city, country: entry.country, lang: entry.lang, wave: entry.wave
  }))
};

if (!CHECK) {
  const out = join(ROOT, 'apps', 'portal', 'data', 'world-coverage-v1.json');
  if (existsSync(dirname(out))) writeFileSync(out, `${JSON.stringify(coverage, null, 2)}\n`);
}

if (fails.length) {
  console.error(`POKRIVENOST — ${fails.length} problema:`);
  for (const fail of fails.slice(0, 20)) console.error(`  ✗ ${fail}`);
  process.exit(1);
}

if (NEXT) {
  console.log(`Sljedećih ${NEXT} gradova i što im treba prije objave:`);
  for (const entry of PLANNED.slice(0, NEXT)) {
    console.log(`\n  ${entry.city} (${entry.country}, ${entry.countryCode}) · ${entry.lang} · ${entry.timezone}`);
    for (const requirement of REQUIREMENTS) console.log(`    [ ] ${requirement.hr}`);
  }
  process.exit(0);
}

console.log(CHECK
  ? `POKRIVENOST — plan i stanje se poklapaju: ${liveChannels.length} javnih izdanja, ${allCountries.size} od ${WORLD_CODES.length} država u planu.`
  : `POKRIVENOST — javno ${liveChannels.length} izdanja u ${liveCountries.size} zemalja na ${liveLangs.size} jezika; plan pokriva ${allCountries.size} zemalja (${PLANNED.length} gradova u ${WAVES.length} valova).`);
