#!/usr/bin/env node
/**
 * ŠIRENJE MREŽE — što stvarno stoji na putu do sljedeće države.
 *
 * Plan ima 195 država, ali grad ne dobiva adresu zato što je na popisu. Ovaj
 * skript za svaki planirani grad provjerava četiri stvari koje se mogu
 * izmjeriti na disku:
 *
 *   1. IZVORI   — postoji li `apps/region/data/<id>.json` s barem tri
 *                 provjerena izvora (RSS ili provjerena adresa);
 *   2. SCENA    — postoji li slika grada u `apps/portal/assets/izdanja/`
 *                 (bilo koja izvedenica, WebP ili OG kartica);
 *   3. SUČELJE  — postoji li jezik izdanja u `apps/region/src/chrome.mjs`
 *                 (nazivi navigacije, oznaka, povratni link);
 *   4. ZAPIS    — ima li kanal barem jedan stvarni zapis u arhivi
 *                 (`apps/region/data/_status.json`).
 *
 * Rezultat: `artifacts/world-expansion-readiness-v1.json` i ljudski ispis —
 * koliko je gradova spremno, koji su najbliži i što im točno nedostaje.
 * Skript ništa ne objavljuje i ništa ne mijenja; on je mjerač, ne pisac.
 *
 *   node scripts/world-expansion-audit-v1.mjs
 *   node scripts/world-expansion-audit-v1.mjs --next 5
 *   node scripts/world-expansion-audit-v1.mjs --json
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLANNED, WORLD_CODES } from '../apps/world/lib/expansion-plan.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'apps', 'region', 'data');
const ART = join(ROOT, 'apps', 'portal', 'assets', 'izdanja');
const CHROME = join(ROOT, 'apps', 'region', 'src', 'chrome.mjs');

const asJson = process.argv.includes('--json');
const nextIndex = process.argv.indexOf('--next');
const NEXT = nextIndex > -1 ? Number(process.argv[nextIndex + 1] || 5) : 0;

const channels = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8')).channels;
const status = existsSync(join(DATA, '_status.json'))
  ? JSON.parse(readFileSync(join(DATA, '_status.json'), 'utf8'))
  : {};
const statusChannels = (status.lastRun && status.lastRun.channels) || {};

const chromeSource = existsSync(CHROME) ? readFileSync(CHROME, 'utf8') : '';
const chromeLangs = new Set([...chromeSource.matchAll(/^ {2}([a-z]{2}): \{/gm)].map((m) => m[1]));

const artFiles = existsSync(ART) ? readdirSync(ART) : [];
const artFor = (id) => artFiles.some((name) => name.startsWith(`${id}-`) || name.startsWith(`${id}_`));

const liveIds = new Set(channels.map((channel) => channel.id));

function sourceCount(id) {
  const file = join(DATA, `${id}.json`);
  if (!existsSync(file)) return 0;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const sources = Array.isArray(data.sources) ? data.sources : (Array.isArray(data.feeds) ? data.feeds : []);
    return sources.length;
  } catch { return 0; }
}

function recordCount(id) {
  const row = statusChannels[id];
  if (!row) return 0;
  return Number(row.items || row.count || row.records || 0) || 0;
}

const rows = PLANNED.map((entry) => {
  const sources = sourceCount(entry.id);
  const checks = {
    sources: sources >= 3,
    art: artFor(entry.id),
    strings: chromeLangs.has(entry.lang),
    items: recordCount(entry.id) >= 1
  };
  const missing = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => key);
  return {
    id: entry.id,
    city: entry.city,
    country: entry.country,
    countryCode: entry.countryCode,
    lang: entry.lang,
    wave: entry.wave,
    live: liveIds.has(entry.id),
    sources,
    records: recordCount(entry.id),
    checks,
    missing,
    ready: missing.length === 0
  };
});

const ready = rows.filter((row) => row.ready);
const blockedOnStrings = rows.filter((row) => !row.checks.strings);
const byWave = {};
for (const row of rows) {
  byWave[row.wave] = byWave[row.wave] || { cities: 0, ready: 0 };
  byWave[row.wave].cities += 1;
  if (row.ready) byWave[row.wave].ready += 1;
}

/* Najbliži kandidati: prvo oni kojima nedostaje samo jedna stvar, pa dvije. */
const closable = [...rows]
  .filter((row) => row.missing.length > 0)
  .sort((a, b) => a.missing.length - b.missing.length || a.wave.localeCompare(b.wave))
  .slice(0, NEXT || 8);

const report = {
  version: 'WORLD_EXPANSION_READINESS_V1_20261023',
  generatedAt: new Date().toISOString(),
  liveEditions: channels.length,
  liveCountries: new Set(channels.map((channel) => channel.countryCode)).size,
  plannedCities: rows.length,
  plannedCountries: new Set(rows.map((row) => row.countryCode)).size,
  worldCodes: WORLD_CODES.length,
  ready: ready.length,
  byWave,
  languagesWithoutChrome: [...new Set(blockedOnStrings.map((row) => row.lang))].sort(),
  next: closable.map((row) => ({
    id: row.id, city: row.city, country: row.country, wave: row.wave, missing: row.missing
  })),
  cities: rows
};

if (!asJson) {
  mkdirSync(join(ROOT, 'artifacts'), { recursive: true });
  writeFileSync(join(ROOT, 'artifacts', 'world-expansion-readiness-v1.json'), `${JSON.stringify(report, null, 2)}\n`);
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log(`ŠIRENJE — ${channels.length} javnih izdanja u ${report.liveCountries} zemalja; plan: ${rows.length} gradova u ${report.plannedCountries} novih zemalja (${WORLD_CODES.length} država ukupno).`);
console.log(`Spremno za objavu: ${ready.length}/${rows.length}. Jezika bez sučelja: ${report.languagesWithoutChrome.length ? report.languagesWithoutChrome.join(', ') : 'nema'}.`);
if (NEXT) {
  console.log(`\nNajbliži sljedeći gradovi:`);
  for (const row of closable) {
    const what = row.missing.map((key) => ({
      sources: 'izvori (najmanje 3)',
      art: 'scena grada',
      strings: 'sučelje na jeziku',
      items: 'zapis u arhivi'
    }[key])).join(', ');
    console.log(`  ${row.city} (${row.country}, ${row.countryCode}) · val ${row.wave.replace('wave-', '')} · nedostaje: ${what}`);
  }
}
console.log(`\nIzvještaj: artifacts/world-expansion-readiness-v1.json`);
