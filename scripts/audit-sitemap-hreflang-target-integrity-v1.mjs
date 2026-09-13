import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const SITEMAP = path.join(PORTAL, 'sitemap.xml');
const failures = [];
const stats = { urlEntries: 0, alternates: 0, duplicateLangs: 0, missingLocalTargets: 0, invalidSchemes: 0 };
const routeFile = route => route === '/' ? path.join(PORTAL, 'index.html') : path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');

if (!fs.existsSync(SITEMAP)) {
  console.error('Missing sitemap.xml');
  process.exit(1);
}
const xml = fs.readFileSync(SITEMAP, 'utf8');
for (const blockMatch of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
  const block = blockMatch[1];
  const loc = block.match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim() || '(missing-loc)';
  stats.urlEntries++;
  const seenLangs = new Set();
  for (const alt of block.matchAll(/<xhtml:link\b[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*\/?\s*>/gi)) {
    const lang = alt[1].toLowerCase();
    const href = alt[2].trim();
    stats.alternates++;
    if (seenLangs.has(lang)) { stats.duplicateLangs++; failures.push(`${loc}: duplicate hreflang ${lang}`); }
    seenLangs.add(lang);
    if (!/^https:\/\//i.test(href)) { stats.invalidSchemes++; failures.push(`${loc}: alternate ${lang} must use https: ${href}`); continue; }
    const u = new URL(href);
    if (u.hostname === 'gnk-asg.hr' && !fs.existsSync(routeFile(u.pathname))) {
      stats.missingLocalTargets++;
      failures.push(`${loc}: alternate ${lang} target does not materialize ${u.pathname}`);
    }
  }
}
const report = { version: 'GNK_ASG_SITEMAP_HREFLANG_TARGET_INTEGRITY_V1', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'sitemap-hreflang-target-integrity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
