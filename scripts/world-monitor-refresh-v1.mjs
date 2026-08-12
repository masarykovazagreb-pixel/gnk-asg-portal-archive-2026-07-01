// GNK ASG — World Monitor podaci za AKTUAL, izravno s besplatnih javnih izvora
// (bez WorldMonitor.app pretplate). Svaki izvor je zaseban, besplatan, bez ključa:
//
//   Seismology  -> USGS Earthquake Hazards Program (earthquake.usgs.gov)
//   Conflicts   -> GDELT Project DOC 2.0 API (api.gdeltproject.org) - "armed conflict"
//   Unrest      -> GDELT Project DOC 2.0 API - "protest unrest"
//   Economic    -> World Bank Open Data API (api.worldbank.org)
//
// Isti obrazac poštenih stanja kao Weather/Cibona: live/stale/unavailable,
// nikad izmišljeni podaci.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const outPath = 'apps/portal/data/world-monitor.json';
mkdirSync('apps/portal/data', { recursive: true });

async function fetchJson(url, opts = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 10000);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { accept: 'application/json', 'user-agent': 'gnk-asg-portal/1.0 (contact: it@gnk-asg.hr)', ...opts.headers } });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

async function fetchSeismology() {
  // USGS: significant earthquakes, last 7 days
  const data = await fetchJson('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson');
  const items = (data.features || []).slice(0, 8).map((f) => ({
    title: f.properties.title,
    magnitude: f.properties.mag,
    place: f.properties.place,
    time: new Date(f.properties.time).toISOString(),
    url: f.properties.url,
  }));
  return { state: 'live', items, source_name: 'USGS Earthquake Hazards Program', source_url: 'https://earthquake.usgs.gov/' };
}

async function fetchGdelt(query, sourceLabel) {
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=8&timespan=24H&format=json&sort=hybridrel`;
  const data = await fetchJson(url);
  const items = (data.articles || []).slice(0, 8).map((a) => ({
    title: a.title,
    domain: a.domain,
    time: a.seendate,
    url: a.url,
  }));
  return { state: 'live', items, source_name: `GDELT Project (${sourceLabel})`, source_url: 'https://www.gdeltproject.org/' };
}

async function fetchWorldBankEconomic() {
  // GDP growth (annual %), world aggregate, most recent available years
  const data = await fetchJson('https://api.worldbank.org/v2/country/WLD/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=6&mrnev=6');
  const rows = Array.isArray(data) && data[1] ? data[1] : [];
  const items = rows.filter((r) => r.value !== null).map((r) => ({
    title: `${r.country?.value || 'World'} GDP growth ${r.date}: ${Number(r.value).toFixed(2)}%`,
    year: r.date,
    value: r.value,
  }));
  return { state: 'live', items, source_name: 'World Bank Open Data', source_url: 'https://data.worldbank.org/' };
}

async function safeFetch(fn) {
  try {
    return await fn();
  } catch (e) {
    return { state: 'unavailable', error: String(e?.message || e).slice(0, 200) };
  }
}

const payload = {
  updated_at: new Date().toISOString(),
  categories: {
    natural: { seismology: await safeFetch(fetchSeismology) },
    geopolitical: {
      conflicts: await safeFetch(() => fetchGdelt('armed conflict OR clash OR strike', 'Conflicts')),
      unrest: await safeFetch(() => fetchGdelt('protest OR riot OR unrest', 'Unrest')),
    },
    economy: { economic: await safeFetch(fetchWorldBankEconomic) },
  },
};

writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
const liveCounts = Object.values(payload.categories).flatMap((c) => Object.values(c)).filter((s) => s.state === 'live').length;
console.log(JSON.stringify({ ok: true, liveSubcategories: liveCounts, updated_at: payload.updated_at }, null, 2));
