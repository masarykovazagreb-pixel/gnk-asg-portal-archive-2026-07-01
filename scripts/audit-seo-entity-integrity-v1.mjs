import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const SITE = 'https://gnk-asg.hr/';
const failures = [];
const warnings = [];

const fail = message => failures.push(message);
const warn = message => warnings.push(message);
const readPortal = relative => {
  const file = path.join(PORTAL, relative);
  if (!fs.existsSync(file)) {
    fail(`Missing file: apps/portal/${relative}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
};
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const extract = (html, regex) => html.match(regex)?.[1]?.trim() || '';
const meta = (html, name) => extract(html, new RegExp(`<meta\\s+name=["']${escapeRegex(name)}["']\\s+content=["']([^"']+)["']`, 'i'))
  || extract(html, new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+name=["']${escapeRegex(name)}["']`, 'i'));
const property = (html, name) => extract(html, new RegExp(`<meta\\s+property=["']${escapeRegex(name)}["']\\s+content=["']([^"']+)["']`, 'i'))
  || extract(html, new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+property=["']${escapeRegex(name)}["']`, 'i'));
const canonical = html => extract(html, /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
  || extract(html, /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
const hreflang = (html, language) => {
  for (const regex of [
    new RegExp(`<link\\s+[^>]*rel=["']alternate["'][^>]*hreflang=["']${escapeRegex(language)}["'][^>]*href=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<link\\s+[^>]*hreflang=["']${escapeRegex(language)}["'][^>]*href=["']([^"']+)["'][^>]*rel=["']alternate["'][^>]*>`, 'i'),
    new RegExp(`<link\\s+[^>]*href=["']([^"']+)["'][^>]*hreflang=["']${escapeRegex(language)}["'][^>]*rel=["']alternate["'][^>]*>`, 'i')
  ]) {
    const value = extract(html, regex);
    if (value) return value;
  }
  return '';
};
const urlForPath = pagePath => SITE + pagePath;

const generator = readPortal('scripts/generate_seo.py');
const pagePattern = /\{'path':'([^']*)','file':'([^']*)','lang':'([^']*)'[\s\S]*?(?:'alt':\('([^']*)','([^']*)'\))?[\s\S]*?'title':'([^']*)','description':'([^']*)'/g;
const pages = [];
for (const match of generator.matchAll(pagePattern)) {
  pages.push({
    pagePath: match[1],
    file: match[2],
    lang: match[3],
    altHr: match[4] || '',
    altEn: match[5] || '',
    configuredTitle: match[6],
    configuredDescription: match[7]
  });
}
if (!pages.length) fail('Could not parse PAGES from apps/portal/scripts/generate_seo.py');

const sitemap = readPortal('sitemap.xml');
const editorialSitemap = readPortal('editorial-sitemap.xml');
const sitemapIndex = readPortal('sitemap-index.xml');
const robots = readPortal('robots.txt');
const seenCanonicals = new Map();
const seenTitles = new Map();
const seenDescriptions = new Map();

for (const page of pages) {
  const html = readPortal(page.file);
  if (!html) continue;
  const expectedUrl = urlForPath(page.pagePath);
  const title = extract(html, /<title>([\s\S]*?)<\/title>/i);
  const description = meta(html, 'description');
  const robotsMeta = meta(html, 'robots');
  const pageCanonical = canonical(html);

  if (!title) fail(`${page.file}: missing title`);
  if (!description) fail(`${page.file}: missing meta description`);
  if (pageCanonical !== expectedUrl) fail(`${page.file}: canonical ${pageCanonical || '(missing)'} != ${expectedUrl}`);
  if (!/\bindex\b/i.test(robotsMeta) || !/\bfollow\b/i.test(robotsMeta)) fail(`${page.file}: robots must include index, follow`);
  if (!/max-image-preview:large/i.test(robotsMeta)) warn(`${page.file}: robots lacks max-image-preview:large`);

  for (const [name, value] of [
    ['og:title', property(html, 'og:title')],
    ['og:description', property(html, 'og:description')],
    ['og:url', property(html, 'og:url')],
    ['og:image', property(html, 'og:image')],
    ['twitter:card', meta(html, 'twitter:card')],
    ['twitter:title', meta(html, 'twitter:title')],
    ['twitter:description', meta(html, 'twitter:description')],
    ['twitter:image', meta(html, 'twitter:image')]
  ]) {
    if (!value) fail(`${page.file}: missing ${name}`);
  }
  if (property(html, 'og:url') && property(html, 'og:url') !== pageCanonical) fail(`${page.file}: og:url must match canonical`);

  if (page.altHr || page.altEn) {
    const expectedHr = urlForPath(page.altHr);
    const expectedEn = urlForPath(page.altEn);
    if (hreflang(html, 'hr') !== expectedHr) fail(`${page.file}: incorrect reciprocal hreflang hr`);
    if (hreflang(html, 'en') !== expectedEn) fail(`${page.file}: incorrect reciprocal hreflang en`);
    if (hreflang(html, 'x-default') !== expectedHr) fail(`${page.file}: incorrect x-default hreflang`);
  }

  const jsonLdBlocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
  if (!jsonLdBlocks.length) fail(`${page.file}: missing JSON-LD`);
  for (const [index, block] of jsonLdBlocks.entries()) {
    try { JSON.parse(block[1]); }
    catch (error) { fail(`${page.file}: invalid JSON-LD block ${index + 1}: ${error.message}`); }
  }

  for (const token of ['GNK ASG d.o.o.', 'GNK DINAMO Ltd.']) {
    if (!html.includes(token)) fail(`${page.file}: entity signal missing: ${token}`);
  }
  if (!/Nermin Sefi(?:ć|c)/i.test(html)) warn(`${page.file}: Nermin Sefić/Nermin Sefic entity signal not present`);

  if (!sitemap.includes(`<loc>${expectedUrl}</loc>`) && !editorialSitemap.includes(`<loc>${expectedUrl}</loc>`)) {
    fail(`${page.file}: ${expectedUrl} missing from sitemap files`);
  }

  if (pageCanonical) {
    if (seenCanonicals.has(pageCanonical)) fail(`${page.file}: duplicate canonical with ${seenCanonicals.get(pageCanonical)}`);
    else seenCanonicals.set(pageCanonical, page.file);
  }
  if (title) {
    const key = title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenTitles.has(key)) warn(`${page.file}: duplicate title with ${seenTitles.get(key)}`);
    else seenTitles.set(key, page.file);
  }
  if (description) {
    const key = description.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenDescriptions.has(key)) warn(`${page.file}: duplicate description with ${seenDescriptions.get(key)}`);
    else seenDescriptions.set(key, page.file);
  }
}

for (const token of [
  'Nermin Sefić', 'Nermin Sefic', 'GNK ASG d.o.o.', 'GNK DINAMO Ltd.',
  'Organization', 'WebSite', 'Person', 'ProfilePage', 'BreadcrumbList'
]) {
  if (!generator.includes(token)) fail(`generate_seo.py missing required token: ${token}`);
}

for (const item of ['sitemap.xml', 'editorial-sitemap.xml', 'visual-sitemap.xml']) {
  const absolute = `${SITE}${item}`;
  if (!sitemapIndex.includes(`<loc>${absolute}</loc>`)) fail(`sitemap-index.xml missing ${item}`);
  if (!robots.includes(`Sitemap: ${absolute}`)) fail(`robots.txt missing ${item}`);
}
if (!robots.includes(`Sitemap: ${SITE}sitemap-index.xml`)) fail('robots.txt missing sitemap-index.xml');

const result = {
  ok: failures.length === 0,
  configuredPages: pages.length,
  uniqueCanonicals: seenCanonicals.size,
  warnings,
  failures
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
