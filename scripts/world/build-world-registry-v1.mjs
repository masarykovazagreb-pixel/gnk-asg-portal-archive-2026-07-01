// Generator registra država (config/world-countries-v1.json).
// Izvor: npm paket world-countries@5 (ISO 3166-1). Pokretanje:
//   (cd /tmp/wc && npm install world-countries@5) && WORLD_COUNTRIES_DIR=/tmp/wc/node_modules node scripts/world/build-world-registry-v1.mjs
import { createRequire } from 'module';
import fs from 'fs';
import { fileURLToPath } from 'url';
const WC = process.env.WORLD_COUNTRIES_DIR || '/tmp/wc/node_modules';
const require = createRequire(WC + '/x.js');
const wc = require(WC + '/world-countries');
const pkg = require(WC + '/world-countries/package.json');
const REPO = fileURLToPath(new URL('../..', import.meta.url)).replace(/\/$/, '');
const capitals = JSON.parse(fs.readFileSync(REPO + '/apps/region/capitals.json', 'utf8'));
const channels = JSON.parse(fs.readFileSync(REPO + '/apps/region/channels.json', 'utf8')).channels;

const ascii = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// postojeći kanali po državi (cca2)
const liveByCc = {};
for (const c of capitals.capitals) liveByCc[c.countryCode] = c;
const chByCc = {};
for (const ch of channels) chByCc[ch.countryCode] = ch;

const WAVE = { Europe: 'E1', Americas: 'A1', Africa: 'F1', Asia: 'S1', Oceania: 'O1' };
const BALKAN_NEIGHBOURS = new Set(['HR', 'RS', 'BA', 'ME', 'SI', 'MK', 'AL', 'XK', 'HU', 'RO', 'BG', 'AT', 'IT', 'GR', 'TR']);

const rows = [];
const usedIds = new Set();
for (const c of wc.filter((x) => x.independent !== false)) {
  const cap = (c.capital && c.capital[0]) || '';
  let id = ascii(cap || c.name.common).replace('washington-d-c', 'washington');
  const chPre = chByCc[c.cca2];
  if (chPre) id = chPre.id;
  if (usedIds.has(id) && !chPre) id = id + '-' + c.cca2.toLowerCase();
  usedIds.add(id);
  const hr = (c.translations && c.translations.hrv) || {};
  const live = liveByCc[c.cca2];
  const ch = chByCc[c.cca2];
  let status = 'planned';
  if (live) status = live.status === 'live' ? 'live' : 'preparing';
  let wave = null;
  if (!live) {
    if (BALKAN_NEIGHBOURS.has(c.cca2)) wave = 'W1-susjedi';
    else if (c.region === 'Europe') wave = 'W2-Europa';
    else if (c.region === 'Americas') wave = 'W3-Amerike';
    else if (c.region === 'Africa') wave = 'W4-Afrika';
    else if (c.region === 'Asia') wave = 'W5-Azija';
    else wave = 'W6-Oceanija';
  }
  rows.push({
    id,
    cca2: c.cca2,
    cca3: c.cca3,
    country: hr.common || c.name.common,
    countryEn: c.name.common,
    capital: cap,
    capitalHr: (c.translations && c.translations.hrv && c.translations.hrv.official) ? undefined : undefined,
    region: c.region,
    subregion: c.subregion || '',
    languages: Object.values(c.languages || {}),
    timezones: c.timezones || [],
    flag: c.flag || '',
    status,
    wave,
    project: 'gnk-asg-kanal-' + id,
    url: 'https://gnk-asg-kanal-' + id + '.pages.dev/',
    channelId: ch ? ch.id : null,
    liveUrl: live ? 'https://gnk-asg.hr/kanal/' + (ch ? ch.id : id) + '/' : null,
  });
}
rows.sort((a, b) => a.country.localeCompare(b.country, 'hr'));
const out = {
  version: 'WORLD_COUNTRIES_REGISTRY_V1',
  generatedFor: '2026-10-30',
  source: { package: 'world-countries', version: pkg.version, license: pkg.license || 'ODbL-1.0 (provjeriti)', note: 'ISO 3166-1 popis, hrvatski nazivi iz translations.hrv' },
  rules: {
    status: { live: 'kanal je objavljen (izvori provjereni, urednik dodijeljen)', preparing: 'u pripremi (izvori u provjeri)', planned: 'samo registar; nema izvora, nema deploya' },
    deploy: 'Samo status live ide na javnu domenu. planned se gradi lokalno kao predložak.',
    urlPattern: 'https://gnk-asg-kanal-<id>.pages.dev/ (Cloudflare Pages, besplatna domena)',
  },
  countries: rows,
};
fs.mkdirSync(REPO + '/config', { recursive: true });
fs.writeFileSync(REPO + '/config/world-countries-v1.json', JSON.stringify(out, null, 1) + '\n', 'utf8');
const by = {};
for (const r of rows) by[r.status] = (by[r.status] || 0) + 1;
const w = {};
for (const r of rows) if (r.wave) w[r.wave] = (w[r.wave] || 0) + 1;
console.log('countries', rows.length, by, w);
console.log(rows.filter((r) => r.status !== 'planned').map((r) => r.id + '/' + r.cca2 + ':' + r.status + ':' + r.channelId).join(' '));
