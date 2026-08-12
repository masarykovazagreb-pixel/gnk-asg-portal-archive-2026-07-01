// GNK ASG — World Monitor data refresh za AKTUAL MEDIA.
// Dva sloja izvora:
// 1) WorldMonitor API (api.worldmonitor.app) - zahtijeva WORLDMONITOR_API_KEY,
//    piše "needs-key" dok ključ ne postoji (nikad izmišljene podatke).
// 2) Izravni besplatni izvori bez ključa - GDELT (rat/sukobi) i CISA KEV
//    (aktivno eksploatirane ranjivosti - stvarni cyber napadi), koji rade
//    ODMAH bez čekanja na WorldMonitor ključ.
import { writeFileSync, mkdirSync } from 'node:fs';

const API_BASE = 'https://api.worldmonitor.app';
const API_KEY = String(process.env.WORLDMONITOR_API_KEY || '').trim();

const WM_ENDPOINT_CONFIG = [
  { category: 'geopolitical', sub: 'intelligence', path: '/api/intelligence/v1/get-country-risk', verified: true, params: '?country=HR' },
  { category: 'economy', sub: 'markets', path: '/api/market/v1/get-fear-greed-index', verified: true, params: '' },
  { category: 'infrastructure', sub: 'resilience', path: '/api/resilience/v1/get-resilience-ranking', verified: true, params: '' },
];

async function fetchJson(url, opts = {}, timeoutMs = 12000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opts, signal: ac.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

async function fetchWmOne(cfg) {
  const url = API_BASE + cfg.path + cfg.params;
  try {
    const data = await fetchJson(url, { headers: { 'X-WorldMonitor-Key': API_KEY, accept: 'application/json' } });
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String(e?.message || e).slice(0, 200) };
  }
}

// --- GDELT (rat/sukobi) - besplatan, bez kljuca ---
async function fetchConflicts() {
  const query = encodeURIComponent('war OR conflict OR "military strike" OR invasion OR offensive');
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&format=json&maxrecords=12&sort=datedesc&timespan=1d`;
  try {
    const data = await fetchJson(url, { headers: { 'User-Agent': 'GNK-ASG-WorldMonitor/1.0' } });
    const articles = (data.articles || []).slice(0, 12).map(a => ({
      title: a.title,
      url: a.url,
      domain: a.domain,
      country: a.sourcecountry,
      seenAt: a.seendate,
    }));
    return { state: 'live', items: articles, fetched_at: new Date().toISOString(), source_name: 'GDELT Project' };
  } catch (e) {
    return { state: 'unavailable', error: String(e?.message || e).slice(0, 200) };
  }
}

// --- CISA KEV (cyber napadi - aktivno eksploatirane ranjivosti) - besplatan, bez kljuca ---
async function fetchCyber() {
  const url = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
  try {
    const data = await fetchJson(url, { headers: { 'User-Agent': 'GNK-ASG-WorldMonitor/1.0', accept: 'application/json' } });
    const sorted = (data.vulnerabilities || []).slice().sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    const items = sorted.slice(0, 12).map(v => ({
      cveId: v.cveID,
      vendor: v.vendorProject,
      product: v.product,
      name: v.vulnerabilityName,
      dateAdded: v.dateAdded,
      dueDate: v.dueDate,
      ransomware: v.knownRansomwareCampaignUse === 'Known',
      description: (v.shortDescription || '').slice(0, 220),
    }));
    return { state: 'live', items, fetched_at: new Date().toISOString(), source_name: 'CISA Known Exploited Vulnerabilities Catalog', catalogVersion: data.catalogVersion };
  } catch (e) {
    return { state: 'unavailable', error: String(e?.message || e).slice(0, 200) };
  }
}

const outPath = 'apps/portal/data/world-monitor.json';
mkdirSync('apps/portal/data', { recursive: true });

const payload = {
  updated_at: new Date().toISOString(),
  source: 'api.worldmonitor.app + GDELT + CISA KEV',
  categories: {
    geopolitical: {},
    economy: {},
    infrastructure: {},
  },
};

// Besplatni izvori bez ključa - uvijek pokušaj, neovisno o WORLDMONITOR_API_KEY.
payload.categories.geopolitical.conflicts = await fetchConflicts();
await new Promise(r => setTimeout(r, 300));
payload.categories.geopolitical.cyber = await fetchCyber();

// WorldMonitor endpointi - trebaju kljuc.
if (!API_KEY) {
  for (const cfg of WM_ENDPOINT_CONFIG) {
    payload.categories[cfg.category] = payload.categories[cfg.category] || {};
    payload.categories[cfg.category][cfg.sub] = { state: 'needs-key' };
  }
} else {
  for (const cfg of WM_ENDPOINT_CONFIG) {
    payload.categories[cfg.category] = payload.categories[cfg.category] || {};
    if (!cfg.verified) {
      payload.categories[cfg.category][cfg.sub] = { state: 'unverified-endpoint' };
      continue;
    }
    const result = await fetchWmOne(cfg);
    payload.categories[cfg.category][cfg.sub] = result.ok
      ? { state: 'live', data: result.data, fetched_at: new Date().toISOString() }
      : { state: 'unavailable', error: result.error };
    await new Promise(r => setTimeout(r, 500));
  }
}

writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
console.log(JSON.stringify({
  conflicts: payload.categories.geopolitical.conflicts.state,
  cyber: payload.categories.geopolitical.cyber.state,
  wmKeyPresent: !!API_KEY,
}, null, 2));
