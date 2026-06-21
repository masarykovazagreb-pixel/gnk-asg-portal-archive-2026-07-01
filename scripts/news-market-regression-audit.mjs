import fs from 'node:fs/promises';
import path from 'node:path';

const portal = path.resolve('apps/portal');
const reportDir = path.resolve('reports/news-market-regression');
await fs.mkdir(reportDir, { recursive: true });

const [newsData, newsScript, newsCss, marketScript, marketCss, shell, hrNews, enNews, hrMarket, enMarket] = await Promise.all([
  readJson(path.join(portal, 'data/news.json')),
  fs.readFile(path.join(portal, 'assets/business-news.js'), 'utf8'),
  fs.readFile(path.join(portal, 'assets/business-news.css'), 'utf8'),
  fs.readFile(path.join(portal, 'assets/market-page.js'), 'utf8'),
  fs.readFile(path.join(portal, 'assets/market-page.css'), 'utf8'),
  fs.readFile(path.join(portal, 'assets/admin-universal-shell.js'), 'utf8'),
  fs.readFile(path.join(portal, 'vijesti/index.html'), 'utf8'),
  fs.readFile(path.join(portal, 'news/index.html'), 'utf8'),
  fs.readFile(path.join(portal, 'trzista/index.html'), 'utf8'),
  fs.readFile(path.join(portal, 'markets/index.html'), 'utf8')
]);

const errors = [];
const warnings = [];
const newsItems = Array.isArray(newsData) ? newsData : (Array.isArray(newsData.items) ? newsData.items : []);
const newestNews = Math.max(...newsItems.map(item => Date.parse(item.publishedAt || item.published_at || '')).filter(Number.isFinite), 0);
const newestAgeHours = newestNews ? Math.max(0, (Date.now() - newestNews) / 3_600_000) : null;

if (!newsItems.length) errors.push('news.json has no items');
if (newestAgeHours === null) errors.push('news.json has no valid published timestamp');
if (newestAgeHours !== null && newestAgeHours > 72) warnings.push(`static news snapshot is ${Math.round(newestAgeHours)} hours old and must display FALLBACK`);

for (const marker of ['deriveStatus', "'live'", "'snapshot'", "'delayed'", "'fallback'", 'Europe/Zagreb', 'gnk:news-ready']) {
  if (!newsScript.includes(marker)) errors.push(`business-news.js missing ${marker}`);
}

for (const marker of ['data-status="live"', 'data-status="snapshot"', 'data-status="delayed"', 'data-status="fallback"']) {
  if (!newsCss.includes(marker)) errors.push(`business-news.css missing ${marker}`);
}

for (const [label, html, language] of [
  ['HR news', hrNews, 'data-language="hr"'],
  ['EN news', enNews, 'data-language="en"']
]) {
  if (!html.includes('id="newsGrid"')) errors.push(`${label}: missing newsGrid`);
  if (!html.includes('id="newsStatus"')) errors.push(`${label}: missing newsStatus`);
  if (!html.includes(language)) errors.push(`${label}: missing language marker`);
  if (!html.includes('/assets/business-news.js')) errors.push(`${label}: business news module not loaded`);
}

for (const marker of ['classifyStatus', 'Europe/Zagreb', 'gnk:market-ready', 'MutationObserver']) {
  if (!marketScript.includes(marker)) errors.push(`market-page.js missing ${marker}`);
}
if (!marketScript.includes('/api/market')) errors.push("market-page.js missing '/api/market'");

for (const marker of ['status-badge.live', 'status-badge.snapshot', 'status-badge.delayed', 'status-badge.fallback']) {
  if (!marketCss.includes(marker)) errors.push(`market-page.css missing ${marker}`);
}

if (!shell.includes("p.startsWith('/trzista/')||p.startsWith('/markets/')")) {
  errors.push('admin shell does not load shared market module on both routes');
}
if (!shell.includes('/assets/market-page.js')) errors.push('admin shell missing market-page.js loader');
if (!shell.includes('/assets/market-page.css')) errors.push('admin shell missing market-page.css loader');

for (const [label, html] of [['HR markets', hrMarket], ['EN markets', enMarket]]) {
  if (!html.includes('id="refresh"')) errors.push(`${label}: missing refresh control`);
  if (!html.includes('id="status"')) errors.push(`${label}: missing status node`);
  if (!html.includes('id="cards"')) errors.push(`${label}: missing cards node`);
  if (!html.includes('id="chart"')) errors.push(`${label}: missing chart`);
}

const report = {
  generatedAt: new Date().toISOString(),
  ok: errors.length === 0,
  newsItems: newsItems.length,
  newestNewsAt: newestNews ? new Date(newestNews).toISOString() : null,
  newestNewsAgeHours: newestAgeHours === null ? null : Math.round(newestAgeHours * 10) / 10,
  errors,
  warnings
};

await fs.writeFile(path.join(reportDir, 'news-market-regression.json'), JSON.stringify(report, null, 2));
const markdown = [
  '# GNK ASG News and Market Regression Audit',
  '',
  `- Result: ${report.ok ? 'OK' : 'FAIL'}`,
  `- News items: ${report.newsItems}`,
  `- Newest news timestamp: ${report.newestNewsAt || 'unknown'}`,
  `- Errors: ${errors.length}`,
  `- Warnings: ${warnings.length}`,
  '',
  ...(errors.length ? ['## Errors', ...errors.map(item => `- ${item}`), ''] : []),
  ...(warnings.length ? ['## Warnings', ...warnings.map(item => `- ${item}`), ''] : [])
].join('\n');
await fs.writeFile(path.join(reportDir, 'news-market-regression.md'), markdown);
console.log(markdown);
if (errors.length) process.exitCode = 1;

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}
