import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const EVIDENCE = path.join(PORTAL, 'data', 'search-discovery-evidence.json');
const SITEMAP = path.join(PORTAL, 'sitemap.xml');
const ORIGIN = 'https://gnk-asg.hr';
const failures = [];
const rows = [];

const registry = fs.existsSync(REGISTRY) ? JSON.parse(fs.readFileSync(REGISTRY, 'utf8')) : {items: []};
const sitemap = fs.existsSync(SITEMAP) ? fs.readFileSync(SITEMAP, 'utf8') : '';
const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(m => m[1].trim()));
let evidence = {pages:{}};
if (fs.existsSync(EVIDENCE)) {
  try { evidence = JSON.parse(fs.readFileSync(EVIDENCE, 'utf8')); }
  catch (error) { failures.push(`invalid search-discovery evidence JSON: ${error.message}`); }
}
const pages = evidence && typeof evidence.pages === 'object' && evidence.pages ? evidence.pages : {};
const registryRoutes = new Set((Array.isArray(registry.items) ? registry.items : []).map(x => String(x.path || '')).filter(x => x.startsWith('/')));
const meta = (html, name) => html.match(new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'))?.[1] || '';
const canonical = html => html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] || '';

for (const route of registryRoutes) {
  const file = path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
  const materialized = fs.existsSync(file);
  const html = materialized ? fs.readFileSync(file, 'utf8') : '';
  const expected = `${ORIGIN}${route}`;
  const robots = meta(html, 'robots').toLowerCase();
  const selfCanonical = canonical(html).trim() === expected;
  const locallyDiscoverable = materialized && selfCanonical && !/\b(noindex|none)\b/.test(robots);
  const inSitemap = sitemapUrls.has(expected);
  const states = pages?.[route] || {};
  const submitted = states.SUBMITTED?.value === true;
  const crawlable = states.CRAWLABLE?.value === true;
  const indexed = states.INDEXED?.value === true;
  rows.push({route, locallyDiscoverable, inSitemap, submitted, crawlable, indexed});

  if (submitted && !locallyDiscoverable) failures.push(`${route}: SUBMITTED=true requires current local discoverability evidence`);
  if (submitted && !inSitemap) failures.push(`${route}: SUBMITTED=true requires canonical sitemap registration`);
  if (crawlable && !locallyDiscoverable) failures.push(`${route}: CRAWLABLE=true conflicts with current local canonical/robots state`);
  if (indexed && !crawlable) failures.push(`${route}: INDEXED=true requires separately verified CRAWLABLE=true evidence`);
}
for (const route of Object.keys(pages)) {
  if (!registryRoutes.has(route)) failures.push(`${route}: search discovery evidence references route outside editorial registry`);
}

const report = {
  version: 'GNK_ASG_INDEXATION_EVIDENCE_CHAIN_V1',
  semantics: {
    DISCOVERABLE: 'Local materialization + self canonical + no explicit noindex.',
    SUBMITTED: 'External submission evidence may only remain true while the canonical route is discoverable and registered in sitemap.',
    CRAWLABLE: 'External production crawlability evidence may only remain true while local canonical/robots state is not contradictory.',
    INDEXED: 'Requires separate CRAWLABLE=true evidence; no index state is inferred from sitemap or submission.'
  },
  ok: failures.length === 0,
  stats: {
    routes: rows.length,
    submittedTrue: rows.filter(x => x.submitted).length,
    crawlableTrue: rows.filter(x => x.crawlable).length,
    indexedTrue: rows.filter(x => x.indexed).length
  },
  failures,
  rows
};
const out = path.join(ROOT, 'artifacts', 'indexation-evidence-chain');
fs.mkdirSync(out, {recursive:true});
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
