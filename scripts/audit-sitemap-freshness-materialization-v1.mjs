import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const ORIGIN = 'https://gnk-asg.hr';
const INDEX = path.join(PORTAL, 'sitemap-index.xml');
const failures = [];
const warnings = [];
const stats = {
  childSitemaps: 0,
  childUrls: 0,
  duplicateChildLocs: 0,
  duplicatePageLocs: 0,
  invalidLastmod: 0,
  futureLastmod: 0,
  missingChildFiles: 0,
  missingMaterializedRoutes: 0,
  canonicalMismatches: 0,
  noindexConflicts: 0,
};

const today = new Date();
const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999);
const normalizePath = value => {
  const p = String(value || '/').replace(/\/+/g, '/');
  return p === '/' ? '/' : `${p.replace(/\/+$/g, '')}/`;
};
const xmlText = (file) => fs.readFileSync(file, 'utf8');
const allLocs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
const sitemapBlocks = (xml) => [...xml.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/g)].map(m => m[1]);
const urlBlocks = (xml) => [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => m[1]);
const firstTag = (block, tag) => {
  const m = block.match(new RegExp(`<${tag}>([^<]+)<\\/${tag}>`));
  return m ? m[1].trim() : '';
};
const parseLastmod = (value, label) => {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}(?:T[^\s]+)?$/.test(value)) {
    stats.invalidLastmod++;
    failures.push(`${label}: invalid lastmod format ${value}`);
    return null;
  }
  const ms = Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (!Number.isFinite(ms)) {
    stats.invalidLastmod++;
    failures.push(`${label}: unparsable lastmod ${value}`);
    return null;
  }
  if (ms > todayUtc) {
    stats.futureLastmod++;
    failures.push(`${label}: future lastmod ${value}`);
  }
  return ms;
};
const routeFile = (pathname) => {
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  return clean ? path.join(PORTAL, clean, 'index.html') : path.join(PORTAL, 'index.html');
};
const canonicalFromHtml = (html) => {
  const a = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if (a) return a[1].trim();
  const b = html.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  return b ? b[1].trim() : '';
};
const hasNoindex = (html) => {
  const robots = [...html.matchAll(/<meta\s+[^>]*(?:name=["']robots["'][^>]*content=["']([^"']*)["']|content=["']([^"']*)["'][^>]*name=["']robots["'])[^>]*>/gi)]
    .map(m => String(m[1] || m[2] || '').toLowerCase());
  return robots.some(v => /(^|[,\s])noindex([,\s]|$)/.test(v));
};

if (!fs.existsSync(INDEX)) {
  console.error('Missing sitemap-index.xml');
  process.exit(1);
}

const indexXml = xmlText(INDEX);
const childSeen = new Set();
for (const block of sitemapBlocks(indexXml)) {
  const loc = firstTag(block, 'loc');
  const lastmod = firstTag(block, 'lastmod');
  stats.childSitemaps++;
  parseLastmod(lastmod, `sitemap-index ${loc || '(missing loc)'}`);
  let u;
  try { u = new URL(loc); } catch {
    failures.push(`sitemap-index: invalid child sitemap URL ${loc}`);
    continue;
  }
  if (u.origin !== ORIGIN || u.search || u.hash) failures.push(`sitemap-index: child sitemap must be clean same-origin URL: ${loc}`);
  if (childSeen.has(u.href)) {
    stats.duplicateChildLocs++;
    failures.push(`sitemap-index: duplicate child sitemap ${u.href}`);
  }
  childSeen.add(u.href);

  const childFile = path.join(PORTAL, u.pathname.replace(/^\/+/, ''));
  if (!fs.existsSync(childFile)) {
    stats.missingChildFiles++;
    failures.push(`sitemap-index: referenced child sitemap missing from portal tree: ${u.pathname}`);
    continue;
  }

  const childXml = xmlText(childFile);
  const pageSeen = new Set();
  let newestChildLastmod = null;
  for (const urlBlock of urlBlocks(childXml)) {
    const pageLoc = firstTag(urlBlock, 'loc');
    const pageLastmod = firstTag(urlBlock, 'lastmod');
    stats.childUrls++;
    const pageMs = parseLastmod(pageLastmod, `${u.pathname} ${pageLoc || '(missing loc)'}`);
    if (pageMs !== null) newestChildLastmod = newestChildLastmod === null ? pageMs : Math.max(newestChildLastmod, pageMs);

    let pageUrl;
    try { pageUrl = new URL(pageLoc); } catch {
      failures.push(`${u.pathname}: invalid page loc ${pageLoc}`);
      continue;
    }
    if (pageUrl.origin !== ORIGIN || pageUrl.search || pageUrl.hash) failures.push(`${u.pathname}: page loc must be clean same-origin URL: ${pageLoc}`);
    if (pageSeen.has(pageUrl.href)) {
      stats.duplicatePageLocs++;
      failures.push(`${u.pathname}: duplicate page loc ${pageUrl.href}`);
    }
    pageSeen.add(pageUrl.href);

    const file = routeFile(pageUrl.pathname);
    if (!fs.existsSync(file)) {
      stats.missingMaterializedRoutes++;
      failures.push(`${u.pathname}: sitemap page is not materialized as static route: ${pageUrl.pathname}`);
      continue;
    }
    const html = xmlText(file);
    const canonical = canonicalFromHtml(html);
    if (!canonical) {
      stats.canonicalMismatches++;
      failures.push(`${pageUrl.pathname}: sitemap route missing canonical`);
    } else {
      let canonicalUrl;
      try { canonicalUrl = new URL(canonical, ORIGIN); } catch {
        canonicalUrl = null;
      }
      if (!canonicalUrl || canonicalUrl.origin !== ORIGIN || normalizePath(canonicalUrl.pathname) !== normalizePath(pageUrl.pathname)) {
        stats.canonicalMismatches++;
        failures.push(`${pageUrl.pathname}: canonical does not match sitemap route (${canonical})`);
      }
    }
    if (hasNoindex(html)) {
      stats.noindexConflicts++;
      failures.push(`${pageUrl.pathname}: sitemap-listed route contains meta robots noindex`);
    }
  }

  const indexLastmod = parseLastmod(lastmod, `sitemap-index child ${loc}`);
  if (indexLastmod !== null && newestChildLastmod !== null && indexLastmod < newestChildLastmod) {
    failures.push(`sitemap-index: ${u.pathname} lastmod ${lastmod} is older than a URL lastmod inside that child sitemap`);
  }
  if (!urlBlocks(childXml).length) warnings.push(`${u.pathname}: no <url> entries found; verify that this child sitemap type is intentional`);
}

const report = {
  version: 'GNK_ASG_SITEMAP_FRESHNESS_MATERIALIZATION_V1',
  scope: 'sitemap-index children, URL lastmod truth, static route materialization, canonical/noindex parity',
  ok: failures.length === 0,
  stats,
  failures,
  warnings,
};
const out = path.join(ROOT, 'artifacts', 'sitemap-freshness-materialization');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
