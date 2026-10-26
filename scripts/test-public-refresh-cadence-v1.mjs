import fs from 'node:fs';

const read = p => fs.readFileSync(p, 'utf8');
const fail = msg => { console.error('FAIL:', msg); process.exitCode = 1; };

function scheduleCount(path) {
  const yaml = read(path);
  const matches = [...yaml.matchAll(/cron:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  if (matches.length !== 1) {
    fail(`${path}: expected exactly one canonical cron, found ${matches.length}`);
    return null;
  }
  const fields = matches[0].trim().split(/\s+/);
  if (fields.length < 5) {
    fail(`${path}: invalid cron ${matches[0]}`);
    return null;
  }
  const hour = fields[1];
  if (hour === '*') return 24;
  if (/^\d+$/.test(hour)) return 1;
  if (/^\d+(,\d+)+$/.test(hour)) return hour.split(',').length;
  fail(`${path}: unsupported hour field for cadence contract: ${hour}`);
  return null;
}

const aktualHr = read('apps/portal/gnk-aktual/index.html');
const aktualEn = read('apps/portal/en/gnk-aktual/index.html');
const market = read('apps/portal/puls-trzista/index.html');
const weather = read('apps/portal/assets/weather-render-v1.js');

const newsRuns = scheduleCount('.github/workflows/gnk-news-refresh-v2.yml');
const weatherRuns = scheduleCount('.github/workflows/weather-refresh.yml');
const marketRuns = scheduleCount('.github/workflows/market-pulse-refresh.yml');
const macroRuns = scheduleCount('.github/workflows/macro-market-refresh.yml');

if (newsRuns !== 6) fail(`AKTUAL producer cadence expected 6/day, got ${newsRuns}`);
// Protect public refresh-status copy from drifting away from the canonical cron.
const cronExpression = [...read('.github/workflows/gnk-news-refresh-v2.yml').matchAll(/cron:\s*['"]([^'"]+)['"]/g)][0]?.[1] || '';
const [cronMinute, cronHours] = cronExpression.split(/\s+/);
const expectedTimes = /^\d+$/.test(cronMinute) && /^\d+(,\d+)*$/.test(cronHours || '')
  ? cronHours.split(',').map(h => `${String(h).padStart(2, '0')}:${cronMinute.padStart(2, '0')}`)
  : [];
const declaredCadence = read('scripts/normalize-aktual-hourly-contract.mjs').match(/^status\.cadence\s*=\s*'([^']+)'/m)?.[1] || '';
const listedTimes = declaredCadence.match(/\b\d{2}:\d{2}\b/g) || [];
if (expectedTimes.length !== 6 || JSON.stringify(expectedTimes) !== JSON.stringify(listedTimes)) {
  fail(`AKTUAL canonical cron/status mismatch: expected [${expectedTimes}], declared [${listedTimes}]`);
}
if (!aktualHr.includes('Ažurira se šest puta dnevno') || !aktualHr.includes('osvježava šest puta dnevno')) {
  fail('HR AKTUAL public copy does not match six-refresh daily producer cadence');
}
if (!aktualEn.includes('Updates six times daily') || !aktualEn.includes('refreshes automatically six times daily')) {
  fail('EN AKTUAL public copy does not match six-refresh daily producer cadence');
}

if (marketRuns !== 2) fail(`Market Pulse cadence expected 2/day, got ${marketRuns}`);
if (macroRuns !== 2) fail(`Macro Market cadence expected 2/day, got ${macroRuns}`);
if (!market.includes('osvježava se dvaput dnevno') || !market.includes('refreshes twice daily')) {
  fail('Puls Tržišta public copy must state the canonical twice-daily cadence');
}
for (const stale of ['svaka dva sata', 'svaka 2 sata', 'every two hours', 'every 2 hours']) {
  if (market.toLowerCase().includes(stale.toLowerCase())) fail(`stale market cadence claim remains: ${stale}`);
}
for (const misleading of ['globalna tržišta i kripto uživo', 'burza uživo', 'valute i kripto uživo']) {
  if (market.toLowerCase().includes(misleading.toLowerCase())) fail(`misleading live-market claim remains: ${misleading}`);
}

if (weatherRuns !== 4) fail(`Weather producer cadence expected 4/day, got ${weatherRuns}`);
if (!weather.includes('kanonski producer radi četiri puta dnevno')) {
  fail('Weather renderer producer-cadence note is not aligned with the four-times-daily workflow');
}
if (/osvježava se svaki sat/i.test(weather)) fail('stale hourly weather cadence note remains');

if (!process.exitCode) {
  console.log('Public refresh cadence truth contract: PASS');
  console.log(JSON.stringify({aktualPerDay:newsRuns,marketPerDay:marketRuns,macroPerDay:macroRuns,weatherPerDay:weatherRuns}));
}
