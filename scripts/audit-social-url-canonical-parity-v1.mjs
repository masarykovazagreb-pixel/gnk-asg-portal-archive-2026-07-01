import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const SITEMAP = path.join(PORTAL, 'sitemap.xml');
const failures = [];
const stats = { checkedPages: 0, missingCanonical: 0, missingOgUrl: 0, mismatches: 0 };
const routeFile = route => route === '/' ? path.join(PORTAL, 'index.html') : path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const clean = v => String(v || '').trim().replace(/\/$/, '');

if (!fs.existsSync(SITEMAP)) {
  console.error('Missing sitemap.xml');
  process.exit(1);
}
const xml = fs.readFileSync(SITEMAP, 'utf8');
for (const match of xml.matchAll(/<loc>(https:\/\/gnk-asg\.hr\/[^<]*)<\/loc>/gi)) {
  const sitemapUrl = match[1].trim();
  const route = new URL(sitemapUrl).pathname;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  stats.checkedPages++;
  const canonical = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]
    || html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i)?.[1];
  const ogUrl = html.match(/<meta\s+[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1]
    || html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:url["'][^>]*>/i)?.[1];
  if (!canonical) { stats.missingCanonical++; failures.push(`${route}: missing canonical`); continue; }
  if (!ogUrl) { stats.missingOgUrl++; failures.push(`${route}: missing og:url`); continue; }
  if (clean(canonical) !== clean(ogUrl) || clean(canonical) !== clean(sitemapUrl)) {
    stats.mismatches++;
    failures.push(`${route}: sitemap/canonical/og:url mismatch (${sitemapUrl} | ${canonical} | ${ogUrl})`);
  }
}
const report = { version: 'GNK_ASG_SOCIAL_URL_CANONICAL_PARITY_V1', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'social-url-canonical-parity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
