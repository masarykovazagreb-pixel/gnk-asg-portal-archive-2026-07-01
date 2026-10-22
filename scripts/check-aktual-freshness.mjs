#!/usr/bin/env node
/* GNK ASG — provjera svježine AKTUAL MEDIA podataka.
 *
 * Čita samo ono što je već u repozitoriju:
 *   - apps/portal/data/news.json          (AKTUAL MEDIA feed)
 *   - apps/region/data/<kanal>.json        (osam gradskih izdanja)
 *
 * Ne dohvaća ništa s mreže i ništa ne mijenja. Ispisuje JSON s najstarijim
 * zapisom po izvoru i procjenom je li izvor zastario.
 *
 * Pokretanje:
 *   node scripts/check-aktual-freshness.mjs                 # ispis + uvijek exit 0
 *   node scripts/check-aktual-freshness.mjs --strict        # exit 1 ako je išta zastarjelo
 *   node scripts/check-aktual-freshness.mjs --max-age 5     # prag u satima (default 6)
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGION = join(ROOT, 'apps', 'region', 'data');
const NEWS = join(ROOT, 'apps', 'portal', 'data', 'news.json');
const CHANNELS = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8')).channels.map((c) => c.id);

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1] ?? fallback;
};
const MAX_AGE_HOURS = Number(arg('--max-age', '6'));
const STRICT = process.argv.includes('--strict');
const NOW = Date.now();

const readJSON = (path, fallback) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
};

const hoursSince = (iso) => {
  const t = Date.parse(iso || '');
  if (Number.isNaN(t)) return null;
  return Math.round(((NOW - t) / 3600000) * 10) / 10;
};

const newest = (items, key) => items.reduce((best, item) => {
  const value = item?.[key] || '';
  return value > best ? value : best;
}, '');

const news = readJSON(NEWS, []);
const newsNewest = Array.isArray(news) ? newest(news, 'published_at') : '';

/* Izdanje koje još nema nijedan zapis nije „zastarjelo" nego „u pripremi":
   arhiva mu se puni backfillom. Miješati to dvoje značilo bi da svaki novi
   grad zauvijek pali alarm svježine i pokreće ciklus bez razloga. */
const channels = CHANNELS.map((id) => {
  const data = readJSON(join(REGION, `${id}.json`), null);
  const items = Array.isArray(data?.items) ? data.items : [];
  const latest = newest(items, 'date');
  const ageHours = hoursSince(latest);
  const state = items.length === 0 ? 'pending' : (ageHours === null || ageHours > MAX_AGE_HOURS ? 'stale' : 'fresh');
  return {
    id,
    items: items.length,
    newest: latest || null,
    ageHours,
    state,
    stale: state === 'stale',
  };
});

const newsAge = hoursSince(newsNewest);
const report = {
  version: 'GNK_ASG_AKTUAL_FRESHNESS_V1',
  checkedAt: new Date(NOW).toISOString(),
  maxAgeHours: MAX_AGE_HOURS,
  news: {
    items: Array.isArray(news) ? news.length : 0,
    newest: newsNewest || null,
    ageHours: newsAge,
    stale: newsAge === null ? true : newsAge > MAX_AGE_HOURS,
  },
  channels,
  staleChannels: channels.filter((c) => c.stale).map((c) => c.id),
  pendingChannels: channels.filter((c) => c.state === 'pending').map((c) => c.id),
  /* Novi kanal ne broji se kao kvar dok ne dobije prvi zapis. */
  anyStale: newsAge === null || newsAge > MAX_AGE_HOURS || channels.some((c) => c.stale),
};

console.log(JSON.stringify(report, null, 2));

if (STRICT && report.anyStale) {
  console.error(`ZASTARJELO: news=${report.news.ageHours}h, kanali=${report.staleChannels.join(',') || '—'} (prag ${MAX_AGE_HOURS}h)`);
  process.exit(1);
}
