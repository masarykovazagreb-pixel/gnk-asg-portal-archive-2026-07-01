import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const SITEMAP = path.join(PORTAL, 'sitemap.xml');
const EVIDENCE = path.join(PORTAL, 'data', 'search-discovery-evidence.json');
const ORIGIN = 'https://gnk-asg.hr';
const outDir = path.join(ROOT, 'artifacts', 'search-discovery-state');
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_EVIDENCE_AGE_MS = {
  SUBMITTED: 30 * 24 * 60 * 60 * 1000,
  CRAWLABLE: 24 * 60 * 60 * 1000,
  INDEXED: 7 * 24 * 60 * 60 * 1000
};

const failures = [];
const pages = [];
const meta = (html, name) => html.match(new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i'))?.[1]?.trim() || html.match(new RegExp(`<meta\\s+[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["'][^>]*>`, 'i'))?.[1]?.trim() || '';
const canonical = html => html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1]?.trim() || html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i)?.[1]?.trim() || '';
const validIsoDate = value => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const allowedSourceTypes = new Set(['SEARCH_ENGINE_SUBMISSION_RECEIPT','PRODUCTION_HTTP_ROBOTS_EVIDENCE','SEARCH_ENGINE_INDEX_EVIDENCE']);

if (!fs.existsSync(REGISTRY)) failures.push('editorial registry missing');
if (!fs.existsSync(SITEMAP)) failures.push('sitemap.xml missing');

const registry = fs.existsSync(REGISTRY) ? JSON.parse(fs.readFileSync(REGISTRY, 'utf8')) : { items: [] };
const sitemapXml = fs.existsSync(SITEMAP) ? fs.readFileSync(SITEMAP, 'utf8') : '';
const sitemapUrls = new Set([...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(m => m[1].trim()));
let externalEvidence = { pages: {} };
if (fs.existsSync(EVIDENCE)) {
  try { externalEvidence = JSON.parse(fs.readFileSync(EVIDENCE, 'utf8')); }
  catch (error) { failures.push(`invalid search-discovery evidence JSON: ${error.message}`); }
}
const evidencePages = externalEvidence && typeof externalEvidence.pages === 'object' && externalEvidence.pages ? externalEvidence.pages : {};

function verifiedEvidence(route, state) {
  const entry = evidencePages?.[route]?.[state];
  if (!entry) return { value: null, evidence: `UNAVAILABLE_NO_${state}_EVIDENCE` };
  if (entry.value !== true && entry.value !== false) { failures.push(`${route}: ${state} evidence value must be boolean`); return { value: null, evidence: 'INVALID_EVIDENCE' }; }
  if (!allowedSourceTypes.has(entry.sourceType)) { failures.push(`${route}: ${state} evidence has unsupported sourceType`); return { value: null, evidence: 'INVALID_EVIDENCE' }; }
  const requiredType = state === 'SUBMITTED' ? 'SEARCH_ENGINE_SUBMISSION_RECEIPT' : state === 'CRAWLABLE' ? 'PRODUCTION_HTTP_ROBOTS_EVIDENCE' : 'SEARCH_ENGINE_INDEX_EVIDENCE';
  if (entry.sourceType !== requiredType) { failures.push(`${route}: ${state} evidence requires sourceType ${requiredType}`); return { value: null, evidence: 'INVALID_EVIDENCE' }; }
  if (typeof entry.source !== 'string' || !entry.source.trim()) { failures.push(`${route}: ${state} evidence requires non-empty source`); return { value: null, evidence: 'INVALID_EVIDENCE' }; }
  if (!validIsoDate(entry.observedAt)) { failures.push(`${route}: ${state} evidence requires valid observedAt ISO date`); return { value: null, evidence: 'INVALID_EVIDENCE' }; }
  const observedAtMs = Date.parse(entry.observedAt);
  const nowMs = Date.now();
  if (observedAtMs > nowMs + MAX_CLOCK_SKEW_MS) { failures.push(`${route}: ${state} evidence observedAt is future-dated beyond allowed clock skew`); return { value: null, evidence: 'INVALID_EVIDENCE' }; }
  const ageMs = Math.max(0, nowMs - observedAtMs);
  const ageSeconds = Math.floor(ageMs / 1000);
  const maxAgeMs = MAX_EVIDENCE_AGE_MS[state];
  if (Number.isFinite(maxAgeMs) && ageMs > maxAgeMs) {
    return {
      value: null,
      evidence: {
        status: 'STALE_EVIDENCE',
        sourceType: entry.sourceType,
        source: entry.source.trim(),
        observedAt: entry.observedAt,
        ageSeconds,
        maxAgeSeconds: Math.floor(maxAgeMs / 1000)
      }
    };
  }
  return { value: entry.value, evidence: { sourceType: entry.sourceType, source: entry.source.trim(), observedAt: entry.observedAt, ageSeconds, maxAgeSeconds: Math.floor(maxAgeMs / 1000) } };
}

for (const item of Array.isArray(registry.items) ? registry.items : []) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) { failures.push(`invalid registry route: ${route || '(missing)'}`); continue; }
  const expectedUrl = `${ORIGIN}${route}`;
  const file = path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
  const materialized = fs.existsSync(file) && fs.statSync(file).isFile();
  const html = materialized ? fs.readFileSync(file, 'utf8') : '';
  const robots = meta(html, 'robots');
  const canonicalUrl = canonical(html);
  const robotsTokens = robots.toLowerCase().split(',').map(token => token.trim()).filter(Boolean);
  const robotsBlocksIndex = robotsTokens.includes('noindex') || robotsTokens.includes('none');
  const robotsBlocksFollow = robotsTokens.includes('nofollow') || robotsTokens.includes('none');
  const indexFollow = !robotsBlocksIndex && !robotsBlocksFollow;
  const canonicalSelf = canonicalUrl === expectedUrl;
  const sitemapRegistered = sitemapUrls.has(expectedUrl);
  const discoverable = materialized && canonicalSelf && indexFollow;
  const crawlableLocalEvidence = discoverable;
  const submitted = verifiedEvidence(route, 'SUBMITTED');
  const crawlable = verifiedEvidence(route, 'CRAWLABLE');
  const indexed = verifiedEvidence(route, 'INDEXED');

  pages.push({
    route,
    url: expectedUrl,
    states: {
      DISCOVERABLE: discoverable,
      SITEMAP_REGISTERED: sitemapRegistered,
      SUBMITTED: submitted.value,
      CRAWLABLE: crawlable.value,
      CRAWLABLE_LOCAL_EVIDENCE: crawlableLocalEvidence,
      INDEXED: indexed.value
    },
    evidence: {
      materialized,
      canonicalSelf,
      robotsDirective: robots || null,
      robotsIndexFollow: indexFollow,
      robotsDefaultPermissive: robotsTokens.length === 0,
      sitemapMembership: sitemapRegistered,
      submittedEvidence: submitted.evidence,
      crawlableEvidence: crawlable.evidence,
      crawlableLocalEvidence,
      indexedEvidence: indexed.evidence
    }
  });

  if (materialized && !canonicalSelf) failures.push(`${route}: materialized page lacks self canonical`);
  if (materialized && !indexFollow) failures.push(`${route}: materialized page is blocked by robots noindex/nofollow/none directive`);
  if (discoverable && !sitemapRegistered) failures.push(`${route}: discoverable page missing from sitemap.xml`);
  if (indexed.value === true && crawlable.value !== true) failures.push(`${route}: INDEXED=true requires separately verified CRAWLABLE=true evidence`);
}

for (const route of Object.keys(evidencePages)) {
  if (!(Array.isArray(registry.items) ? registry.items : []).some(item => String(item.path || '') === route)) failures.push(`${route}: search-discovery evidence references route absent from editorial registry`);
}

const counts = {
  registry: pages.length,
  DISCOVERABLE: pages.filter(p => p.states.DISCOVERABLE).length,
  SITEMAP_REGISTERED: pages.filter(p => p.states.SITEMAP_REGISTERED).length,
  SUBMITTED_VERIFIED: pages.filter(p => p.states.SUBMITTED === true).length,
  SUBMITTED_UNKNOWN: pages.filter(p => p.states.SUBMITTED === null).length,
  CRAWLABLE_VERIFIED: pages.filter(p => p.states.CRAWLABLE === true).length,
  CRAWLABLE_UNKNOWN: pages.filter(p => p.states.CRAWLABLE === null).length,
  CRAWLABLE_LOCAL_EVIDENCE: pages.filter(p => p.states.CRAWLABLE_LOCAL_EVIDENCE).length,
  INDEXED_VERIFIED: pages.filter(p => p.states.INDEXED === true).length,
  INDEXED_UNKNOWN: pages.filter(p => p.states.INDEXED === null).length
};

const report = {
  version: 'GNK_ASG_SEARCH_DISCOVERY_STATE_V1',
  generatedAt: new Date().toISOString(),
  evidenceInput: fs.existsSync(EVIDENCE) ? 'apps/portal/data/search-discovery-evidence.json' : null,
  evidenceClockPolicy: { maxFutureSkewSeconds: MAX_CLOCK_SKEW_MS / 1000 },
  evidenceFreshnessPolicy: Object.fromEntries(Object.entries(MAX_EVIDENCE_AGE_MS).map(([state, maxAgeMs]) => [state, { maxAgeSeconds: maxAgeMs / 1000 }])),
  semantics: {
    DISCOVERABLE: 'Materialized self-canonical page whose local HTML robots directive does not explicitly block indexing or following. Missing robots meta is treated as the permissive default, not as a failure.',
    SITEMAP_REGISTERED: 'Canonical URL is present in the committed sitemap.xml. This is discovery evidence, not proof of search-engine submission.',
    SUBMITTED: 'True/false only when backed by a typed search-engine submission receipt that is no older than the configured freshness window; otherwise null.',
    CRAWLABLE: 'True/false only when backed by fresh production HTTP plus robots/X-Robots evidence in the optional evidence file; otherwise null.',
    CRAWLABLE_LOCAL_EVIDENCE: 'Local static evidence has no page-level HTML robots/canonical blocker. This is supporting evidence only and is not a CRAWLABLE claim.',
    INDEXED: 'True/false only when backed by fresh typed authoritative search-engine index evidence; INDEXED=true also requires separately verified CRAWLABLE=true.'
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
