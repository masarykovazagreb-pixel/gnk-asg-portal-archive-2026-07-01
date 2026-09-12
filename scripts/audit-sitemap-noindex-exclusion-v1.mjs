import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const SITEMAP = path.join(PORTAL, 'sitemap.xml');
const failures = [];
const stats = { sitemapUrls: 0, materialized: 0, missingRoutes: 0, metaNoindex: 0 };
const normalizePath = value => new URL(value, 'https://gnk-asg.hr').pathname;
const routeFile = route => route === '/' ? path.join(PORTAL, 'index.html') : path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');

if (!fs.existsSync(SITEMAP)) {
  console.error('Missing sitemap.xml');
  process.exit(1);
}
const xml = fs.readFileSync(SITEMAP, 'utf8');
for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
  const url = match[1].trim();
  if (!url.startsWith('https://gnk-asg.hr/')) continue;
  const route = normalizePath(url);
  const file = routeFile(route);
  stats.sitemapUrls++;
  if (!fs.existsSync(file)) { stats.missingRoutes++; failures.push(`${route}: sitemap URL does not materialize`); continue; }
  stats.materialized++;
  const html = fs.readFileSync(file, 'utf8');
  const robots = [...html.matchAll(/<meta\s+[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/gi), ...html.matchAll(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']robots["'][^>]*>/gi)].map(m => m[1].toLowerCase());
  if (robots.some(v => /(^|[,\s])noindex([,\s]|$)/.test(v))) { stats.metaNoindex++; failures.push(`${route}: sitemap URL carries meta robots noindex`); }
}
const report = { version: 'GNK_ASG_SITEMAP_NOINDEX_EXCLUSION_V1', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'sitemap-noindex-exclusion');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
