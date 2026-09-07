import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const ORIGIN = 'https://gnk-asg.hr';
const failures = [];
const warnings = [];
const stats = { registryItems: 0, checkedPages: 0, missingCanonical: 0, duplicateCanonical: 0, foreignCanonical: 0, dirtyCanonical: 0, routeMismatch: 0, noindexConflicts: 0 };
const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const normalizePath = value => {
  const p = String(value || '/').replace(/\/+/g, '/');
  return p === '/' ? '/' : `${p.replace(/\/+$/g, '')}/`;
};

if (!fs.existsSync(REGISTRY)) {
  console.error('Missing editorial registry');
  process.exit(1);
}
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const items = Array.isArray(registry.items) ? registry.items : [];
stats.registryItems = items.length;

for (const item of items) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  stats.checkedPages++;

  const canonicals = [...html.matchAll(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/gi), ...html.matchAll(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/gi)].map(m => m[1].trim());
  const uniqueCanonicals = [...new Set(canonicals)];
  if (!uniqueCanonicals.length) {
    stats.missingCanonical++;
    failures.push(`${route}: missing canonical link`);
    continue;
  }
  if (uniqueCanonicals.length !== 1 || canonicals.length !== 1) {
    stats.duplicateCanonical++;
    failures.push(`${route}: expected exactly one canonical, found ${canonicals.length} tags / ${uniqueCanonicals.length} unique values`);
    continue;
  }

  let canonicalUrl;
  try { canonicalUrl = new URL(uniqueCanonicals[0], ORIGIN); }
  catch {
    failures.push(`${route}: invalid canonical URL ${uniqueCanonicals[0]}`);
    continue;
  }
  if (canonicalUrl.origin !== ORIGIN) {
    stats.foreignCanonical++;
    failures.push(`${route}: canonical must stay on ${ORIGIN}, found ${canonicalUrl.origin}`);
  }
  if (canonicalUrl.search || canonicalUrl.hash) {
    stats.dirtyCanonical++;
    failures.push(`${route}: canonical must not contain query or fragment: ${canonicalUrl.href}`);
  }
  if (normalizePath(canonicalUrl.pathname) !== normalizePath(route)) {
    stats.routeMismatch++;
    failures.push(`${route}: canonical path ${canonicalUrl.pathname} does not match materialized route`);
  }

  const robots = [...html.matchAll(/<meta\s+[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/gi), ...html.matchAll(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']robots["'][^>]*>/gi)].map(m => m[1].toLowerCase());
  if (robots.some(value => /(^|[,\s])noindex([,\s]|$)/.test(value))) {
    stats.noindexConflicts++;
    failures.push(`${route}: editorial registry route is materialized but meta robots contains noindex`);
  }
  if (!robots.length) warnings.push(`${route}: no explicit robots meta; default indexing semantics apply`);
}

const report = { version: 'GNK_ASG_CANONICAL_INDEXABILITY_CONTRACT_V1', scope: 'materialized editorial registry pages', ok: failures.length === 0, stats, failures, warnings };
const out = path.join(ROOT, 'artifacts', 'canonical-indexability-contract');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
