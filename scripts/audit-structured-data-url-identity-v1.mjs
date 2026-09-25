import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const SITEMAP = path.join(PORTAL, 'sitemap.xml');
const failures = [];
const stats = { checkedPages: 0, jsonLdBlocks: 0, identitySignals: 0, mismatches: 0, invalidJson: 0 };
const routeFile = route => route === '/' ? path.join(PORTAL, 'index.html') : path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const clean = v => String(v || '').trim().replace(/#.*$/, '').replace(/\/$/, '');

function walk(node, expected, route) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const item of node) walk(item, expected, route); return; }
  const type = Array.isArray(node['@type']) ? node['@type'].join(',') : String(node['@type'] || '');
  const pageLike = /(^|,)(WebPage|Article|NewsArticle|BlogPosting|ProfilePage)(,|$)/.test(type);
  if (pageLike && typeof node.url === 'string') {
    stats.identitySignals++;
    if (clean(node.url) !== clean(expected)) { stats.mismatches++; failures.push(`${route}: ${type}.url mismatch ${node.url} != ${expected}`); }
  }
  if (pageLike && node.mainEntityOfPage && typeof node.mainEntityOfPage === 'object' && typeof node.mainEntityOfPage['@id'] === 'string') {
    stats.identitySignals++;
    if (clean(node.mainEntityOfPage['@id']) !== clean(expected)) { stats.mismatches++; failures.push(`${route}: ${type}.mainEntityOfPage.@id mismatch ${node.mainEntityOfPage['@id']} != ${expected}`); }
  }
  for (const value of Object.values(node)) walk(value, expected, route);
}

if (!fs.existsSync(SITEMAP)) {
  console.error('Missing sitemap.xml');
  process.exit(1);
}
const xml = fs.readFileSync(SITEMAP, 'utf8');
for (const match of xml.matchAll(/<loc>(https:\/\/gnk-asg\.hr\/[^<]*)<\/loc>/gi)) {
  const expected = match[1].trim();
  const route = new URL(expected).pathname;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  stats.checkedPages++;
  for (const block of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    stats.jsonLdBlocks++;
    try { walk(JSON.parse(block[1]), expected, route); }
    catch { stats.invalidJson++; failures.push(`${route}: invalid JSON-LD`); }
  }
}
const report = { version: 'GNK_ASG_STRUCTURED_DATA_URL_IDENTITY_V1', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'structured-data-url-identity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
