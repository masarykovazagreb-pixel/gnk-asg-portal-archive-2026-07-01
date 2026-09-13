import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REDIRECTS = path.join(PORTAL, '_redirects');
const SITEMAP = path.join(PORTAL, 'sitemap.xml');
const failures = [];
const stats = { redirects: 0, duplicateSources: 0, redirectSourcesInSitemap: 0, missingLocalTargets: 0, loops: 0 };

const normalizePath = value => {
  try { return new URL(value, 'https://gnk-asg.hr').pathname.replace(/\/+$/, '') || '/'; }
  catch { return String(value || '').split('?')[0].replace(/\/+$/, '') || '/'; }
};
const routeFile = route => route === '/' ? path.join(PORTAL, 'index.html') : path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');

if (!fs.existsSync(REDIRECTS) || !fs.existsSync(SITEMAP)) {
  console.error('Missing _redirects or sitemap.xml');
  process.exit(1);
}

const sitemap = fs.readFileSync(SITEMAP, 'utf8');
const sitemapPaths = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(m => normalizePath(m[1])));
const lines = fs.readFileSync(REDIRECTS, 'utf8').split(/\r?\n/).map(v => v.trim()).filter(v => v && !v.startsWith('#'));
const seen = new Set();
for (const line of lines) {
  const parts = line.split(/\s+/);
  if (parts.length < 2) { failures.push(`invalid redirect row: ${line}`); continue; }
  const [source, target] = parts;
  const sourcePath = normalizePath(source);
  const targetPath = normalizePath(target);
  stats.redirects++;
  if (seen.has(sourcePath)) { stats.duplicateSources++; failures.push(`duplicate redirect source ${sourcePath}`); }
  seen.add(sourcePath);
  if (sourcePath === targetPath) { stats.loops++; failures.push(`self redirect ${sourcePath}`); }
  if (sitemapPaths.has(sourcePath)) { stats.redirectSourcesInSitemap++; failures.push(`redirect source present in sitemap ${sourcePath}`); }
  if (!/^https?:\/\//i.test(target) && !fs.existsSync(routeFile(targetPath))) {
    stats.missingLocalTargets++;
    failures.push(`local redirect target does not materialize ${targetPath}`);
  }
}

const report = { version: 'GNK_ASG_REDIRECT_SITEMAP_EXCLUSION_V1', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'redirect-sitemap-exclusion');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
