#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const ORIGIN = 'https://gnk-asg.hr';
const failures = [];
const pages = new Map();
const stats = { publicPagesChecked: 0, pagesWithHreflang: 0, alternateLinksChecked: 0, reciprocalLinksVerified: 0 };

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))?.[1]?.trim() || '';
const routeFromFile = file => {
  const rel = path.relative(PORTAL, path.dirname(file)).split(path.sep).join('/');
  return rel ? `/${rel}/` : '/';
};
const isIndexable = html => {
  const robotsTag = html.match(/<meta[^>]+name=["']robots["'][^>]*>/i)?.[0] || '';
  return !/(?:^|[,\s])noindex(?:$|[,\s])/i.test(attr(robotsTag, 'content'));
};
const canonical = html => {
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    if (/\brel=["'][^"']*canonical[^"']*["']/i.test(tag)) return attr(tag, 'href');
  }
  return '';
};
const hreflangs = html => {
  const out = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    if (!/\brel=["'][^"']*alternate[^"']*["']/i.test(tag)) continue;
    const lang = attr(tag, 'hreflang');
    const href = attr(tag, 'href');
    if (lang && href) out.push({ lang, href });
  }
  return out;
};
const langOf = html => html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1]?.trim().toLowerCase() || '';
const localRoute = value => {
  try {
    const url = new URL(value, ORIGIN);
    if (url.origin !== ORIGIN) return null;
    let p = decodeURIComponent(url.pathname || '/');
    if (!p.endsWith('/')) p += '/';
    return p;
  } catch { return null; }
};
const walk = dir => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['assets', 'data'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name === 'index.html') {
      const html = fs.readFileSync(full, 'utf8');
      if (isIndexable(html)) pages.set(routeFromFile(full), { html, canonical: canonical(html), lang: langOf(html), alternates: hreflangs(html) });
    }
  }
};

if (!fs.existsSync(PORTAL)) process.exit(1);
walk(PORTAL);
stats.publicPagesChecked = pages.size;

for (const [route, page] of pages) {
  if (!page.alternates.length) continue;
  stats.pagesWithHreflang++;
  const seen = new Set();
  for (const alt of page.alternates) {
    stats.alternateLinksChecked++;
    const normalizedLang = alt.lang.toLowerCase();
    if (seen.has(normalizedLang)) failures.push(`${route}: duplicate hreflang ${alt.lang}`);
    seen.add(normalizedLang);
    if (normalizedLang !== 'x-default' && !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i.test(normalizedLang)) failures.push(`${route}: invalid hreflang ${alt.lang}`);
    const targetRoute = localRoute(alt.href);
    if (!targetRoute) continue;
    const target = pages.get(targetRoute);
    if (!target) {
      failures.push(`${route}: hreflang target is not a local indexable route: ${alt.href}`);
      continue;
    }
    if (normalizedLang === 'x-default') continue;
    const sourceHref = page.canonical || `${ORIGIN}${route}`;
    const reciprocal = target.alternates.some(candidate => candidate.lang.toLowerCase() === page.lang && new URL(candidate.href, ORIGIN).href === new URL(sourceHref, ORIGIN).href);
    if (!reciprocal) failures.push(`${route}: ${alt.lang} target ${targetRoute} lacks reciprocal ${page.lang || 'source-lang'} hreflang`);
    else stats.reciprocalLinksVerified++;
  }
  if (page.lang && !seen.has(page.lang)) failures.push(`${route}: hreflang cluster lacks self-language alternate ${page.lang}`);
}

const report = { version: 'GNK_ASG_HREFLANG_RECIPROCITY_V1', scope: 'LOCAL_PUBLIC_INDEXABLE_HREFLANG_CLUSTERS', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'hreflang-reciprocity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
