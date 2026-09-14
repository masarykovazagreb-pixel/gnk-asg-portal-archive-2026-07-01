import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const SITEMAP = path.join(PORTAL, 'sitemap.xml');
const EDITORIAL = path.join(PORTAL, 'editorial-sitemap.xml');
const failures = [];
const warnings = [];

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const sitemapText = fs.existsSync(SITEMAP) ? fs.readFileSync(SITEMAP, 'utf8') : '';
const editorialText = fs.existsSync(EDITORIAL) ? fs.readFileSync(EDITORIAL, 'utf8') : '';
const now = Date.now();

for (const item of registry.items || []) {
  const route = String(item.path || '').trim();
  const url = String(item.url || '').trim();
  const publishedAt = Date.parse(item.publishedAt || '');
  const shouldBePublic = Number.isFinite(publishedAt) ? publishedAt <= now : true;
  if (!route.startsWith('/')) failures.push(`${item.slug || '(unknown)'}: invalid path '${route}'`);
  if (url !== `https://gnk-asg.hr${route}`) failures.push(`${item.slug || route}: url/path canonical mismatch`);
  if (!shouldBePublic) continue;
  const disk = path.join(PORTAL, route.replace(/^\//, ''), 'index.html');
  if (!fs.existsSync(disk)) failures.push(`${route}: published registry item missing physical route`);
  if (!sitemapText.includes(`<loc>${url}</loc>`) && !editorialText.includes(`<loc>${url}</loc>`)) {
    failures.push(`${route}: published route absent from sitemap discovery surfaces`);
  }
  if (item.seoComplete !== true) warnings.push(`${route}: published registry item seoComplete is not true`);
}

const report = {
  version: 'GNK_ASG_EDITORIAL_ROUTE_DISCOVERY_PARITY_V1',
  ok: failures.length === 0,
  semantics: {published: 'publishedAt <= current runtime clock', indexed: 'NOT_INFERRED_FROM_SITEMAP'},
  stats: {registryItems: (registry.items || []).length, failures: failures.length, warnings: warnings.length},
  failures,
  warnings
};
const out = path.join(ROOT, 'artifacts', 'editorial-route-discovery-parity');
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
