// GNK ASG — World Monitor data refresh za AKTUAL MEDIA.
// Izvor: api.worldmonitor.app (open-source, javan REST API), zahtijeva
// X-WorldMonitor-Key za sve podatkovne pozive (WORLDMONITOR_API_KEY secret).
// Bez ključa: piše "needs-key" stanje po kategoriji, nikad izmišljene podatke.
//
// Kategorije/podkategorije prate stvarni katalog usluga (worldmonitor.app/docs/api-reference):
// Geopolitical(Conflicts,Military,Unrest,Intelligence,Displacement,Cyber,Sanctions)
// Natural events(Natural Disasters,Seismology,Climate,Wildfires,Radiation,Thermal)
// Economy & markets(Economic,Markets,Trade,Supply Chain,Consumer Prices,Predictions,Forecasts)
// Infrastructure & transport(Aviation,Maritime,Infrastructure,Resilience)
// Health & environment(Public Health,Imagery,Webcams)
// Other(News,Research,Positive Events)
//
// ENDPOINT_CONFIG niže povezuje svaku podkategoriju sa stvarnom rpc putanjom.
// Potvrđeni endpointi (iz službene dokumentacije): list-acled-events,
// get-country-risk, get-fear-greed-index, get-resilience-ranking.
// Ostali su označeni verified:false - staviti verified:true nakon provjere
// protiv živog /openapi.yaml kad ključ bude dostupan, prije uključivanja.
import { writeFileSync, mkdirSync } from 'node:fs';

const API_BASE = 'https://api.worldmonitor.app';
const API_KEY = String(process.env.WORLDMONITOR_API_KEY || '').trim();

const ENDPOINT_CONFIG = [
  { category: 'geopolitical', sub: 'conflicts', path: '/api/conflict/v1/list-acled-events', verified: true, params: '' },
  { category: 'geopolitical', sub: 'intelligence', path: '/api/intelligence/v1/get-country-risk', verified: true, params: '?country=HR' },
  { category: 'economy', sub: 'markets', path: '/api/market/v1/get-fear-greed-index', verified: true, params: '' },
  { category: 'infrastructure', sub: 'resilience', path: '/api/resilience/v1/get-resilience-ranking', verified: true, params: '' },
  // Dodati dodatne potvrđene endpointe ovdje kad se provjere protiv /openapi.yaml.
];

async function fetchOne(cfg) {
  const url = API_BASE + cfg.path + cfg.params;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 10000);
  try {
    const r = await fetch(url, {
      signal: ac.signal,
      headers: { 'X-WorldMonitor-Key': API_KEY, accept: 'application/json' },
    });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    return { ok: true, data };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, error: String(e?.message || e).slice(0, 200) };
  }
}

const outPath = 'apps/portal/data/world-monitor.json';
mkdirSync('apps/portal/data', { recursive: true });

const payload = {
  updated_at: new Date().toISOString(),
  source: 'api.worldmonitor.app',
  categories: {},
};

if (!API_KEY) {
  // Pošteno stanje: nema ključa, ne izmišljamo podatke.
  for (const cfg of ENDPOINT_CONFIG) {
    payload.categories[cfg.category] = payload.categories[cfg.category] || {};
    payload.categories[cfg.category][cfg.sub] = { state: 'needs-key' };
  }
  writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
  console.log(JSON.stringify({ ok: false, state: 'needs-key', message: 'WORLDMONITOR_API_KEY nije postavljen - pisem needs-key stanje za sve kategorije.' }, null, 2));
  process.exit(0);
}

let anyLive = false;
for (const cfg of ENDPOINT_CONFIG) {
  payload.categories[cfg.category] = payload.categories[cfg.category] || {};
  if (!cfg.verified) {
    payload.categories[cfg.category][cfg.sub] = { state: 'unverified-endpoint' };
    continue;
  }
  const result = await fetchOne(cfg);
  if (result.ok) {
    payload.categories[cfg.category][cfg.sub] = { state: 'live', data: result.data, fetched_at: new Date().toISOString() };
    anyLive = true;
  } else {
    payload.categories[cfg.category][cfg.sub] = { state: 'unavailable', error: result.error };
  }
  await new Promise((res) => setTimeout(res, 500)); // blagi razmak izmedu poziva
}

writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify({ ok: anyLive, categoriesWritten: Object.keys(payload.categories).length }, null, 2));
