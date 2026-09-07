import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const ORIGIN = 'https://gnk-asg.hr';
const failures = [];
const warnings = [];
const stats = {
  checkedPages: 0,
  pagesWithHreflang: 0,
  reciprocalLinksChecked: 0,
  reciprocalFailures: 0,
  duplicateLanguageEntries: 0,
  invalidTargets: 0,
  missingSelfLanguage: 0,
  missingXDefault: 0
};

const extract = (html, regex) => html.match(regex)?.[1]?.trim() || '';
const canonical = html => extract(html, /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i) || extract(html, /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const normalizeUrl = (value, route = '/') => {
  try {
    const url = new URL(value, `${ORIGIN}${route}`);
    url.hash = '';
    return url.href.replace(/\/$/, '');
  } catch {
    return '';
  }
};
const hreflangLinks = html => {
  const out = [];
  for (const match of html.matchAll(/<link\b[^>]*rel=["'][^"']*alternate[^"']*["'][^>]*>/gi)) {
    const tag = match[0];
    const lang = extract(tag, /\bhreflang=["']([^"']+)["']/i).toLowerCase();
    const href = extract(tag, /\bhref=["']([^"']+)["']/i);
    if (lang && href) out.push({ lang, href });
  }
  return out;
};

if (!fs.existsSync(REGISTRY)) process.exit(1);
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const items = Array.isArray(registry.items) ? registry.items : [];
const pages = new Map();

for (const item of items) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const pageCanonical = canonical(html);
  const canonicalUrl = normalizeUrl(pageCanonical || `${ORIGIN}${route}`, route);
  if (!canonicalUrl) continue;
  pages.set(canonicalUrl, {
    route,
    language: String(item.language || '').toLowerCase(),
    links: hreflangLinks(html)
  });
}

for (const [pageUrl, page] of pages) {
  stats.checkedPages++;
  const links = page.links;
  if (!links.length) {
    if (page.language === 'hr' || page.language === 'en') warnings.push(`${page.route}: no hreflang links; add them only when a real reciprocal translation exists`);
    continue;
  }
  stats.pagesWithHreflang++;

  const seen = new Set();
  for (const link of links) {
    if (seen.has(link.lang)) {
      stats.duplicateLanguageEntries++;
      failures.push(`${page.route}: duplicate hreflang entry for ${link.lang}`);
    }
    seen.add(link.lang);
  }

  if ((page.language === 'hr' || page.language === 'en') && !seen.has(page.language)) {
    stats.missingSelfLanguage++;
    failures.push(`${page.route}: hreflang set is missing self-language ${page.language}`);
  }
  if (!seen.has('x-default')) {
    stats.missingXDefault++;
    warnings.push(`${page.route}: hreflang set has no x-default target`);
  }

  for (const link of links) {
    const targetUrl = normalizeUrl(link.href, page.route);
    if (!targetUrl || !targetUrl.startsWith(ORIGIN)) {
      stats.invalidTargets++;
      failures.push(`${page.route}: hreflang ${link.lang} must resolve to an absolute same-origin canonical URL`);
      continue;
    }
    const target = pages.get(targetUrl);
    if (!target) {
      stats.invalidTargets++;
      failures.push(`${page.route}: hreflang ${link.lang} target is not a materialized canonical registry page: ${targetUrl}`);
      continue;
    }
    if (link.lang !== 'x-default' && target.language && target.language !== link.lang) {
      failures.push(`${page.route}: hreflang ${link.lang} points to registry language ${target.language}: ${target.route}`);
    }
    if (link.lang === 'x-default') continue;
    stats.reciprocalLinksChecked++;
    const reciprocalLang = page.language;
    if (!reciprocalLang) {
      warnings.push(`${page.route}: registry language missing; reciprocal hreflang cannot be fully proven`);
      continue;
    }
    const reciprocal = target.links.some(candidate => candidate.lang === reciprocalLang && normalizeUrl(candidate.href, target.route) === pageUrl);
    if (!reciprocal) {
      stats.reciprocalFailures++;
      failures.push(`${page.route}: hreflang ${link.lang} target ${target.route} does not reciprocate with ${reciprocalLang}`);
    }
  }
}

const report = {
  version: 'GNK_ASG_HREFLANG_CONTRACT_V1',
  scope: 'materialized editorial registry pages',
  semantics: 'Validates declared hreflang targets and reciprocity only; absence is not treated as a failure unless a hreflang set is already declared.',
  ok: failures.length === 0,
  stats,
  failures,
  warnings
};
const out = path.join(ROOT, 'artifacts', 'hreflang-contract');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
