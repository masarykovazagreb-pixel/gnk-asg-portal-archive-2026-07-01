import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const SITEMAPS = ['sitemap.xml', 'editorial-sitemap.xml', 'visual-sitemap.xml', 'news-sitemap.xml'];
const failures = [];
const warnings = [];
const pages = [];

const normalize = value => {
  try {
    const u = new URL(value, 'https://gnk-asg.hr');
    let p = u.pathname.replace(/\/+/g, '/');
    if (!p.endsWith('/')) p += '/';
    return p;
  } catch { return ''; }
};

const routeFromFile = file => {
  const rel = path.relative(PORTAL, path.dirname(file)).split(path.sep).join('/');
  return normalize(rel ? `/${rel}/` : '/');
};

const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');

const walk = dir => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['data', 'assets'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name === 'index.html') pages.push(full);
  }
};

const sitemapRoutes = new Set();
for (const name of SITEMAPS) {
  const file = path.join(PORTAL, name);
  if (!fs.existsSync(file)) continue;
  const xml = fs.readFileSync(file, 'utf8');
  for (const match of xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
    const route = normalize(match[1]);
    if (route) sitemapRoutes.add(route);
  }
}

walk(PORTAL);
const canonicalOwners = new Map();
let indexable = 0;
let noindex = 0;

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const route = routeFromFile(file);
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
  const isNoindex = /(?:^|[,\s])noindex(?:$|[,\s])/i.test(robots);
  const canonicalMatches = [...html.matchAll(/<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);

  if (isNoindex) noindex += 1; else indexable += 1;
  if (canonicalMatches.length !== 1) {
    failures.push(`${route}: expected exactly one canonical, found ${canonicalMatches.length}`);
    continue;
  }

  const rawCanonical = canonicalMatches[0];
  let canonicalUrl;
  try { canonicalUrl = new URL(rawCanonical); }
  catch {
    failures.push(`${route}: canonical must be an absolute URL (${rawCanonical})`);
    continue;
  }

  if (canonicalUrl.protocol !== 'https:' || canonicalUrl.hostname !== 'gnk-asg.hr') {
    failures.push(`${route}: canonical must use https://gnk-asg.hr (${rawCanonical})`);
  }

  const canonicalRoute = normalize(rawCanonical);
  if (!canonicalRoute) {
    failures.push(`${route}: canonical route could not be normalized (${rawCanonical})`);
    continue;
  }

  if (!isNoindex && canonicalRoute !== route) {
    failures.push(`${route}: indexable page canonical points to ${canonicalRoute}`);
  }

  if (isNoindex && sitemapRoutes.has(route)) {
    failures.push(`${route}: noindex page is present in a public sitemap`);
  }
  if (!isNoindex && !sitemapRoutes.has(route)) {
    warnings.push(`${route}: indexable page is not present in the checked public sitemaps`);
  }

  const target = routeFile(canonicalRoute);
  if (canonicalRoute !== '/' && !fs.existsSync(target)) {
    failures.push(`${route}: canonical target has no local index.html (${canonicalRoute})`);
  }

  if (!isNoindex) {
    const owners = canonicalOwners.get(canonicalRoute) || [];
    owners.push(route);
    canonicalOwners.set(canonicalRoute, owners);
  }
}

for (const [canonicalRoute, owners] of canonicalOwners) {
  const distinct = [...new Set(owners)];
  if (distinct.length > 1) failures.push(`${canonicalRoute}: duplicate canonical claimed by ${distinct.join(', ')}`);
}

const report = {
  version: 'GNK_ASG_CANONICAL_INDEXABILITY_COHERENCE_V1',
  scope: 'ALL_LOCAL_INDEX_HTML_PLUS_PUBLIC_SITEMAPS',
  ok: failures.length === 0,
  stats: {
    pagesChecked: pages.length,
    indexablePages: indexable,
    noindexPages: noindex,
    sitemapRoutes: sitemapRoutes.size,
    uniqueCanonicalTargets: canonicalOwners.size
  },
  failures,
  warnings
};

const out = path.join(ROOT, 'artifacts', 'canonical-indexability-coherence');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
