import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const INDEX = path.join(PORTAL, 'sitemap-index.xml');
const ROBOTS = path.join(PORTAL, 'robots.txt');
const failures = [];
const warnings = [];
const protectedPrefixes = ['/admin/', '/admin-center/', '/control/', '/webmail/', '/mail-studio/', '/api/', '/worker-ops/', '/operator-dashboard/'];

const read = p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
const xmlLocs = text => [...text.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(m => m[1].trim());
const canonicalPath = url => {
  try { return new URL(url).pathname; } catch { return ''; }
};
const sameOriginFile = url => {
  try {
    const u = new URL(url);
    if (u.origin !== 'https://gnk-asg.hr') return null;
    return path.join(PORTAL, u.pathname.replace(/^\//, ''));
  } catch { return null; }
};

if (!fs.existsSync(INDEX)) failures.push('sitemap-index.xml is missing');
if (!fs.existsSync(ROBOTS)) failures.push('robots.txt is missing');

const indexText = read(INDEX);
const robotsText = read(ROBOTS);
const sitemapUrls = xmlLocs(indexText);
const unique = new Set(sitemapUrls);
if (unique.size !== sitemapUrls.length) failures.push('sitemap-index.xml contains duplicate sitemap URLs');
if (!sitemapUrls.length) failures.push('sitemap-index.xml contains no child sitemaps');

const childEvidence = [];
for (const url of sitemapUrls) {
  if (!/^https:\/\/gnk-asg\.hr\//i.test(url)) failures.push(`non-canonical sitemap origin or scheme: ${url}`);
  const local = sameOriginFile(url);
  if (!local || !fs.existsSync(local)) {
    failures.push(`indexed child sitemap is not materialized locally: ${url}`);
    continue;
  }
  const text = read(local);
  const locs = xmlLocs(text);
  const dup = locs.length - new Set(locs).size;
  if (dup > 0) failures.push(`${url}: contains ${dup} duplicate <loc> entries`);
  for (const loc of locs) {
    const p = canonicalPath(loc);
    if (!p) failures.push(`${url}: invalid URL in <loc>: ${loc}`);
    if (protectedPrefixes.some(prefix => p.startsWith(prefix))) failures.push(`${url}: protected route leaked into sitemap: ${loc}`);
    if (!/^https:\/\/gnk-asg\.hr\//i.test(loc)) warnings.push(`${url}: non-canonical origin in child sitemap: ${loc}`);
  }
  childEvidence.push({url, localPath:path.relative(ROOT, local), urls:locs.length});
}

const robotsSitemaps = [...robotsText.matchAll(/^Sitemap:\s*(\S+)\s*$/gmi)].map(m => m[1]);
const missingFromRobots = sitemapUrls.filter(url => !robotsSitemaps.includes(url));
for (const url of missingFromRobots) failures.push(`sitemap-index child is not declared in robots.txt: ${url}`);
for (const url of robotsSitemaps) {
  const local = sameOriginFile(url);
  if (local && !fs.existsSync(local)) failures.push(`robots.txt references non-materialized sitemap: ${url}`);
}
if (!robotsSitemaps.includes('https://gnk-asg.hr/sitemap-index.xml')) failures.push('robots.txt must declare canonical sitemap-index.xml');

const report = {
  version: 'GNK_ASG_INDEXATION_SURFACE_CONTRACT_V1',
  ok: failures.length === 0,
  evidenceSemantics: {
    discoverable: 'STATIC_SITEMAP_AND_ROBOTS_CONTRACT',
    submitted: 'SEPARATE_SUBMISSION_EVIDENCE_REQUIRED',
    crawlable: 'RUNTIME_HTTP_AND_ROBOTS_EVIDENCE_REQUIRED',
    indexed: 'SEARCH_ENGINE_EVIDENCE_REQUIRED_NEVER_INFERRED'
  },
  stats: {
    sitemapIndexChildren: sitemapUrls.length,
    robotsSitemaps: robotsSitemaps.length,
    materializedChildren: childEvidence.length
  },
  childEvidence,
  failures,
  warnings
};

const out = path.join(ROOT, 'artifacts', 'indexation-surface-contract');
fs.mkdirSync(out, {recursive:true});
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
