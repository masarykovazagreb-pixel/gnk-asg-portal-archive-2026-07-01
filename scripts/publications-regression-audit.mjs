import fs from 'node:fs/promises';
import path from 'node:path';

const portal = path.resolve('apps/portal');
const reportDir = path.resolve('reports/publications-regression');
await fs.mkdir(reportDir, { recursive: true });

const [manifest, autoFeed, hrHtml, enHtml, renderer] = await Promise.all([
  readJson(path.join(portal, 'data/publications.json')),
  readJson(path.join(portal, 'data/publications-auto.json')),
  fs.readFile(path.join(portal, 'objave/index.html'), 'utf8'),
  fs.readFile(path.join(portal, 'publications/index.html'), 'utf8'),
  fs.readFile(path.join(portal, 'assets/js/publications-shared.js'), 'utf8')
]);

const items = Array.isArray(manifest.items) ? manifest.items : [];
const autoItems = Array.isArray(autoFeed.items) ? autoFeed.items : [];
const errors = [];
const warnings = [];
const paths = new Map();

if (!items.length) errors.push('publications.json has no items');
if (Number(manifest.staticCount) !== items.length) {
  errors.push(`staticCount ${manifest.staticCount} does not match item count ${items.length}`);
}

for (const [index, item] of items.entries()) {
  const label = item.slug || item.id || `item-${index + 1}`;
  if (!String(item.titleHr || item.title || '').trim()) errors.push(`${label}: missing title`);
  if (!String(item.summaryHr || item.summary || '').trim()) errors.push(`${label}: missing summary`);
  if (!String(item.hrUrl || item.originalUrl || '').trim()) errors.push(`${label}: missing HR URL`);
  if (!String(item.canonical || item.hrUrl || '').trim()) errors.push(`${label}: missing canonical`);
  if (!String(item.imageUrl || '').trim()) warnings.push(`${label}: missing image`);

  const key = canonicalPath(item.canonical || item.hrUrl || item.originalUrl || item.slug || item.id);
  if (paths.has(key)) errors.push(`${label}: duplicate canonical path ${key}`);
  else paths.set(key, label);
}

for (const [index, item] of autoItems.entries()) {
  const label = item.slug || item.id || `auto-${index + 1}`;
  const key = canonicalPath(item.canonical || item.hrUrl || `/objave/${item.slug || ''}/`);
  if (paths.has(key)) warnings.push(`${label}: auto feed overlaps static item ${paths.get(key)}`);
}

const pageChecks = [
  ['HR', hrHtml, 'data-publication-page="hr"', 'https://gnk-asg.hr/objave/'],
  ['EN', enHtml, 'data-publication-page="en"', 'https://gnk-asg.hr/publications/']
];

for (const [label, html, marker, canonical] of pageChecks) {
  if (!html.includes('id="publication-grid"')) errors.push(`${label}: missing publication grid`);
  if (!html.includes(marker)) errors.push(`${label}: missing page language marker`);
  if (!html.includes('/assets/js/publications-shared.js')) errors.push(`${label}: shared renderer is not loaded`);
  if (!html.includes(`rel="canonical" href="${canonical}"`)) errors.push(`${label}: incorrect canonical`);
}

for (const marker of ['bindCurrentFilters', 'dedupeKey', 'Promise.allSettled', 'gnk-publications-rendered']) {
  if (!renderer.includes(marker)) errors.push(`shared renderer missing ${marker}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  ok: errors.length === 0,
  staticCount: items.length,
  autoCount: autoItems.length,
  uniqueCanonicalCount: paths.size,
  errors,
  warnings
};

await fs.writeFile(
  path.join(reportDir, 'publications-regression.json'),
  JSON.stringify(report, null, 2)
);

const markdown = [
  '# GNK ASG Publications Regression Audit',
  '',
  `- Result: ${report.ok ? 'OK' : 'FAIL'}`,
  `- Static items: ${report.staticCount}`,
  `- Auto items: ${report.autoCount}`,
  `- Unique canonical paths: ${report.uniqueCanonicalCount}`,
  `- Errors: ${errors.length}`,
  `- Warnings: ${warnings.length}`,
  '',
  ...(errors.length ? ['## Errors', ...errors.map(item => `- ${item}`), ''] : []),
  ...(warnings.length ? ['## Warnings', ...warnings.map(item => `- ${item}`), ''] : [])
].join('\n');

await fs.writeFile(path.join(reportDir, 'publications-regression.md'), markdown);
console.log(markdown);
if (errors.length) process.exitCode = 1;

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function canonicalPath(value) {
  const text = String(value || '').trim();
  try {
    return new URL(text, 'https://gnk-asg.hr').pathname.replace(/\/+$/, '').toLowerCase() || '/';
  } catch {
    return text.toLowerCase();
  }
}
