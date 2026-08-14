import fs from 'node:fs';
import { execSync } from 'node:child_process';

const results = [];
const now = Date.now();
const MAX_NEWS_AGE_HOURS = 18;
const MAX_MARKET_AGE_HOURS = 18;
const MAX_NEWS_FUTURE_SKEW_MS = 5 * 60 * 1000;

function ok(label, detail = '') { results.push({ label, status: 'OK', detail }); }
function fail(label, detail = '') { results.push({ label, status: 'FAIL', detail }); }
function ageHours(value) { return (now - Date.parse(value)) / 36e5; }
function assertFresh(label, value, maxHours) {
  if (!value || Number.isNaN(Date.parse(value))) return fail(label, `missing or invalid timestamp: ${value || 'none'}`);
  const age = ageHours(value);
  if (age > maxHours) fail(label, `${age.toFixed(1)}h old; limit ${maxHours}h`);
  else ok(label, `${age.toFixed(1)}h old; limit ${maxHours}h`);
}
function assertMarketPayload(file, data) {
  if (file.endsWith('market_indices.json')) {
    if (!Array.isArray(data.indices) || data.indices.length === 0) fail('Market indices payload', 'indices dataset is empty');
    else ok('Market indices payload', `${data.indices.length} index item(s)`);
    if (data.error) fail('Market indices source', String(data.error));
  }
  if (file.endsWith('fast_market_status.json')) {
    const status = String(data.status || '').toLowerCase();
    if (!status || ['degraded', 'error', 'failed', 'unavailable'].includes(status)) fail('Fast market operational status', status || 'missing status');
    else ok('Fast market operational status', status);
    if (typeof data.indices === 'number' && data.indices <= 0) fail('Fast market indices count', String(data.indices));
    else if (typeof data.indices === 'number') ok('Fast market indices count', String(data.indices));
    if (data.error) fail('Fast market source', String(data.error));
  }
}

const sitemapFiles = [
  'apps/portal/sitemap.xml',
  'apps/portal/editorial-sitemap.xml',
  'apps/portal/visual-sitemap.xml',
  'apps/portal/image-sitemap.xml',
  'apps/portal/sitemap-index.xml',
];
for (const f of sitemapFiles) {
  try {
    const xml = fs.readFileSync(f, 'utf8');
    const openTags = (xml.match(/<url>/g) || []).length;
    const closeTags = (xml.match(/<\/url>/g) || []).length;
    if (openTags !== closeTags) throw new Error(`unbalanced <url> tags: ${openTags} vs ${closeTags}`);
    ok(`Sitemap: ${f}`, `${openTags} URLs`);
  } catch (err) { fail(`Sitemap: ${f}`, String(err.message || err)); }
}

const jsFiles = [
  'apps/portal/assets/app.js',
  'apps/portal/assets/sticker-tiles-v1.js',
  'apps/portal/assets/floating-intelligence.js',
  'apps/portal/assets/public-unified-menu-v6.js',
];
for (const f of jsFiles) {
  try { execSync(`node --check "${f}"`, { stdio: 'pipe' }); ok(`JS syntax: ${f}`); }
  catch (err) { fail(`JS syntax: ${f}`, String(err.stderr || err.message || err)); }
}

try {
  const status = JSON.parse(fs.readFileSync('apps/portal/data/news-automation-status.json', 'utf8'));
  const statusTimestamp = status?.updated_at || status?.last_successful_refresh_at;
  let feedTimestamp = null;
  try {
    const news = JSON.parse(fs.readFileSync('apps/portal/data/news.json', 'utf8'));
    if (Array.isArray(news)) {
      for (const item of news) {
        const candidate = item?.published_at || item?.publishedAt;
        const candidateMs = Date.parse(candidate);
        if (!candidate || Number.isNaN(candidateMs) || candidateMs > now + MAX_NEWS_FUTURE_SKEW_MS) continue;
        if (!feedTimestamp || candidateMs > Date.parse(feedTimestamp)) feedTimestamp = candidate;
      }
    }
  } catch {}
  const freshnessTimestamp = [statusTimestamp, feedTimestamp]
    .filter(value => value && !Number.isNaN(Date.parse(value)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
  assertFresh('Repository news freshness', freshnessTimestamp, MAX_NEWS_AGE_HOURS);
  const newsOk = status?.ok === true && ['refreshed', 'ok', 'healthy'].includes(String(status?.status || '').toLowerCase());
  if (!newsOk) fail('Repository news status', `ok=${String(status?.ok)} status=${String(status?.status || 'missing')}`);
  else ok('Repository news status', String(status.status));
} catch (err) { fail('Repository news freshness', String(err.message || err)); }

for (const [file, label] of [
  ['apps/portal/data/market.json', 'Crypto market freshness'],
  ['apps/portal/data/market_indices.json', 'Market indices freshness'],
  ['apps/portal/data/fast_market_status.json', 'Fast market status freshness'],
]) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    assertFresh(label, data.timestamp_utc || data.updated_at || data.checked_at || data.last_updated_at, MAX_MARKET_AGE_HOURS);
    assertMarketPayload(file, data);
  } catch (err) { fail(label, String(err.message || err)); }
}

const KEY_PAGES = [
  'https://gnk-asg.hr/',
  'https://gnk-asg.hr/en/',
  'https://gnk-asg.hr/objave/',
  'https://gnk-asg.hr/gnk-aktual/',
  'https://gnk-asg.hr/puls-trzista/',
  'https://gnk-asg.hr/kontakt/',
];

async function checkPages() {
  for (const url of KEY_PAGES) {
    try {
      const res = await fetch(url, { redirect: 'follow', headers: { 'cache-control': 'no-cache' } });
      const text = await res.text();
      if (!res.ok) fail(`Live page: ${url}`, `HTTP ${res.status}`);
      else if (/<title>\s*404|stranica nije pronađena|page not found/i.test(text)) fail(`Live page: ${url}`, 'soft 404 detected');
      else ok(`Live page: ${url}`, `HTTP ${res.status}`);
      if (url.includes('/gnk-aktual/') && /ažurirano prije\s+(1|2|3|4|5|6|7|8|9|\d{2,})\s+dan/i.test(text)) {
        fail('Aktual Media live freshness label', 'page reports one day or more since update');
      }
    } catch (err) { fail(`Live page: ${url}`, String(err.message || err)); }
  }
}

function checkEditorialQueue() {
  try {
    const queue = JSON.parse(fs.readFileSync('apps/portal/data/editorial-approval-queue.json', 'utf8'));
    ok('Editorial approval queue', `${(queue.items || []).length} item(s) on file`);
  } catch (err) { fail('Editorial approval queue', String(err.message || err)); }
}

async function main() {
  await checkPages();
  checkEditorialQueue();
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const okCount = results.filter(r => r.status === 'OK').length;
  const lines = [`# Production watchdog — ${new Date().toISOString()}`, '', `**Rezultat: ${okCount} OK, ${failCount} FAIL**`, ''];
  for (const r of results) lines.push(`${r.status === 'OK' ? '✅' : '❌'} **${r.label}**${r.detail ? ' — ' + r.detail : ''}`);
  lines.push('', '_Automatska end-to-end provjera pokreće se 4x dnevno i kontrolira HTTP, soft-404, sitemap, JavaScript, Aktual Media, vijesti te svježinu i sadržaj tržišnih i kripto podataka._');
  const report = lines.join('\n');
  fs.writeFileSync('/tmp/health-check-report.md', report);
  console.log(report);
  if (failCount > 0) process.exitCode = 1;
}

await main();
