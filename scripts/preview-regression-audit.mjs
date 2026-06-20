import fs from 'node:fs/promises';
import path from 'node:path';

const base = process.env.PREVIEW_BASE_URL || 'https://gnk-asg-business-light-preview.beckuphome.workers.dev';
const routes = [
  ['HR home','/'],
  ['EN home','/en/'],
  ['HR markets','/trzista/'],
  ['EN markets','/markets/'],
  ['HR publications','/objave/'],
  ['EN publications','/publications/'],
  ['HR news','/vijesti/'],
  ['EN news','/news/'],
  ['Visual gallery','/visual-index/'],
  ['Mail Studio Pro','/mail-studio-pro/'],
  ['Legacy Mail Studio','/mail-studio/'],
  ['WhatsApp Center','/wa-center/'],
  ['PDF Publisher','/pdf-publisher/'],
  ['BPP HR','/platforme/bpp/'],
  ['BPP EN','/en/platforms/bpp/'],
  ['Mobile portal','/app/'],
  ['Social Share','/social-share/']
];

const mojibake = ['Ã','Ä‡','Ä','Å¡','Å¾','â€“','â€”','â€¦','Â·'];
const results = [];

for (const [label, route] of routes) {
  const url = new URL(route, base).href;
  let status = 0;
  let html = '';
  let error = '';
  try {
    const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'GNK-ASG-Preview-Audit/1.0' } });
    status = response.status;
    html = await response.text();
  } catch (caught) {
    error = String(caught?.message || caught);
  }

  const lower = html.toLowerCase();
  const broken = mojibake.filter(pattern => html.includes(pattern));
  const checks = {
    reachable: status >= 200 && status < 400,
    hasViewport: lower.includes('name="viewport"') || lower.includes("name='viewport'"),
    hasUtf8: lower.includes('charset="utf-8"') || lower.includes("charset='utf-8'") || lower.includes('charset=utf-8'),
    noMojibake: broken.length === 0,
    hasHomeOrGlobalLayer: lower.includes('gnk-asg-global-layer') || lower.includes('gnk-preview-home'),
    hasLanguageControl: route === '/' || route === '/en/' || lower.includes('>hr<') || lower.includes('>en<') || lower.includes('gnk-preview-language'),
    noSelfRedirect: !new RegExp(`<meta[^>]+url=${route.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`, 'i').test(html)
  };

  if (route === '/mail-studio-pro/') {
    checks.mailboxesDistinct = ['inbox','sent','outbox','held','drafts'].every(box => lower.includes(`data-box="${box}"`));
  }
  if (route === '/vijesti/' || route === '/news/') {
    checks.newsFeed = lower.includes('newsgrid') || lower.includes('business-news');
    checks.publicationsSeparated = lower.includes('/objave/') || lower.includes('/publications/');
  }
  if (route === '/platforme/bpp/' || route === '/en/platforms/bpp/') {
    checks.bppExternal = lower.includes('www.bpp.is');
  }
  if (route === '/wa-center/') {
    checks.waGroups = lower.includes('grouplist');
    checks.waSimulator = lower.includes('chatlog');
  }
  if (route === '/pdf-publisher/') {
    checks.pdfInput = lower.includes('application/pdf');
    checks.pdfMetadata = lower.includes('summary') && lower.includes('keywords');
  }

  results.push({ label, route, url, status, error, broken, checks, ok: Object.values(checks).every(Boolean) });
}

const summary = {
  generatedAt: new Date().toISOString(),
  base,
  total: results.length,
  passed: results.filter(item => item.ok).length,
  failed: results.filter(item => !item.ok).length,
  productionChanged: false
};

const out = path.resolve('reports/preview-regression-audit');
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ summary, results }, null, 2));

const lines = [
  '# GNK ASG Preview Regression Audit',
  '',
  `- Base: ${base}`,
  `- Passed: ${summary.passed}/${summary.total}`,
  `- Failed: ${summary.failed}`,
  `- Production changed: false`,
  '',
  '| Route | HTTP | Result | Problems |',
  '|---|---:|---|---|'
];
for (const item of results) {
  const problems = [
    item.error,
    ...item.broken.map(value => `mojibake:${value}`),
    ...Object.entries(item.checks).filter(([,ok]) => !ok).map(([key]) => key)
  ].filter(Boolean).join(', ');
  lines.push(`| ${item.label} (${item.route}) | ${item.status || 'ERR'} | ${item.ok ? 'OK' : 'FAIL'} | ${problems || '—'} |`);
}
await fs.writeFile(path.join(out, 'summary.md'), lines.join('\n') + '\n');

console.log(JSON.stringify(summary, null, 2));
if (summary.failed) process.exitCode = 1;
