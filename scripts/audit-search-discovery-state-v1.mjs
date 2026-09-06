import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const SITEMAP = path.join(PORTAL, 'sitemap.xml');
const ORIGIN = 'https://gnk-asg.hr';
const outDir = path.join(ROOT, 'artifacts', 'search-discovery-state');

const failures = [];
const pages = [];
const meta = (html, name) => html.match(new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i'))?.[1]?.trim() || html.match(new RegExp(`<meta\\s+[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["'][^>]*>`, 'i'))?.[1]?.trim() || '';
const canonical = html => html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]?.trim() || html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i)?.[1]?.trim() || '';

if (!fs.existsSync(REGISTRY)) failures.push('editorial registry missing');
if (!fs.existsSync(SITEMAP)) failures.push('sitemap.xml missing');

const registry = fs.existsSync(REGISTRY) ? JSON.parse(fs.readFileSync(REGISTRY, 'utf8')) : { items: [] };
const sitemapXml = fs.existsSync(SITEMAP) ? fs.readFileSync(SITEMAP, 'utf8') : '';
const submittedUrls = new Set([...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(m => m[1].trim()));

for (const item of Array.isArray(registry.items) ? registry.items : []) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) { failures.push(`invalid registry route: ${route || '(missing)'}`); continue; }
  const expectedUrl = `${ORIGIN}${route}`;
  const file = path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
  const materialized = fs.existsSync(file) && fs.statSync(file).isFile();
  const html = materialized ? fs.readFileSync(file, 'utf8') : '';
  const robots = meta(html, 'robots');
  const canonicalUrl = canonical(html);
  const indexFollow = /\bindex\b/i.test(robots) && /\bfollow\b/i.test(robots) && !/\bnoindex\b/i.test(robots);
  const canonicalSelf = canonicalUrl === expectedUrl;
  const submitted = submittedUrls.has(expectedUrl);
  const discoverable = materialized && canonicalSelf && indexFollow;
  const crawlable = discoverable; // local static evidence only; HTTP reachability is a separate production probe.

  pages.push({
    route,
    url: expectedUrl,
    states: {
      DISCOVERABLE: discoverable,
      SUBMITTED: submitted,
      CRAWLABLE_LOCAL: crawlable,
      INDEXED: null
    },
    evidence: {
      materialized,
      canonicalSelf,
      robotsIndexFollow: indexFollow,
      sitemapMembership: submitted,
      indexedEvidence: 'UNAVAILABLE_NO_SEARCH_ENGINE_INDEX_EVIDENCE'
    }
  });

  if (materialized && !canonicalSelf) failures.push(`${route}: materialized page lacks self canonical`);
  if (materialized && !indexFollow) failures.push(`${route}: materialized page is not index,follow`);
  if (discoverable && !submitted) failures.push(`${route}: discoverable page missing from sitemap.xml`);
}

const counts = {
  registry: pages.length,
  DISCOVERABLE: pages.filter(p => p.states.DISCOVERABLE).length,
  SUBMITTED: pages.filter(p => p.states.SUBMITTED).length,
  CRAWLABLE_LOCAL: pages.filter(p => p.states.CRAWLABLE_LOCAL).length,
  INDEXED_VERIFIED: pages.filter(p => p.states.INDEXED === true).length,
  INDEXED_UNKNOWN: pages.filter(p => p.states.INDEXED === null).length
};

const report = {
  version: 'GNK_ASG_SEARCH_DISCOVERY_STATE_V1',
  generatedAt: new Date().toISOString(),
  semantics: {
    DISCOVERABLE: 'Materialized self-canonical page whose local robots directive permits index,follow.',
    SUBMITTED: 'Canonical URL is present in the committed sitemap.xml. This does not prove search-engine submission receipt.',
    CRAWLABLE_LOCAL: 'Local static evidence has no page-level robots/canonical blocker. This does not prove production HTTP reachability.',
    INDEXED: 'Never inferred. Remains null unless authoritative search-engine index evidence is supplied.'
  },
  ok: failures.length === 0,
  counts,
  failures,
  pages
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
