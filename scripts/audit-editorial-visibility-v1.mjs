import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const SITEMAP = path.join(PORTAL, 'sitemap.xml');
const ORIGIN = 'https://gnk-asg.hr';
const failures = [];
const warnings = [];
const stats = {
  registryItems: 0,
  checkedPages: 0,
  indexedPages: 0,
  sitemapMembers: 0,
  registryUrlMismatches: 0,
  pagesWithImages: 0,
  sameOriginImagesChecked: 0,
  missingSameOriginImages: 0,
  pagesWithArticleSchema: 0,
  advancedSocialGaps: 0,
  hreflangGaps: 0,
  imageMetadataGaps: 0
};

const fail = message => failures.push(message);
const warn = message => warnings.push(message);
const extract = (html, regex) => html.match(regex)?.[1]?.trim() || '';
const attr = (tag, name) => extract(tag, new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'));
const meta = (html, name) => extract(html, new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'))
  || extract(html, new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["'][^>]*>`, 'i'));
const property = (html, name) => extract(html, new RegExp(`<meta\\s+[^>]*property=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'))
  || extract(html, new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*property=["']${name}["'][^>]*>`, 'i'));
const canonical = html => extract(html, /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
  || extract(html, /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const absolute = (value, route) => {
  if (!value) return '';
  try { return new URL(value, `${ORIGIN}${route}`).href; }
  catch { return value; }
};
const sameOriginAssetFile = value => {
  try {
    const url = new URL(value, ORIGIN);
    if (url.origin !== ORIGIN) return null;
    return path.join(PORTAL, decodeURIComponent(url.pathname).replace(/^\/+/, ''));
  } catch {
    return null;
  }
};

if (!fs.existsSync(REGISTRY)) {
  console.error(`Missing editorial registry: ${REGISTRY}`);
  process.exit(1);
}
if (!fs.existsSync(SITEMAP)) {
  console.error(`Missing canonical sitemap: ${SITEMAP}`);
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const items = Array.isArray(registry.items) ? registry.items : [];
stats.registryItems = items.length;
const sitemapXml = fs.readFileSync(SITEMAP, 'utf8');
const sitemapUrls = new Set([...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(match => match[1].trim()));
const seenTitles = new Map();
const seenDescriptions = new Map();
const seenCanonicals = new Map();

for (const item of items) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) {
    fail(`Registry item ${item.slug || '(unknown)'} has invalid route: ${route || '(missing)'}`);
    continue;
  }
  const expectedUrl = `${ORIGIN}${route}`;
  if (item.url && item.url !== expectedUrl) {
    stats.registryUrlMismatches += 1;
    fail(`${route}: registry url ${item.url} != ${expectedUrl}`);
  }

  const file = routeFile(route);
  if (!fs.existsSync(file)) continue; // publication registry gate owns missing-route enforcement

  const html = fs.readFileSync(file, 'utf8');
  stats.checkedPages += 1;
  const title = extract(html, /<title>([\s\S]*?)<\/title>/i);
  const description = meta(html, 'description');
  const robots = meta(html, 'robots');
  const pageCanonical = canonical(html);
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];

  if (!title) fail(`${route}: missing unique title candidate`);
  if (!description) fail(`${route}: missing meta description`);
  if (pageCanonical !== expectedUrl) fail(`${route}: canonical ${pageCanonical || '(missing)'} != ${expectedUrl}`);
  if (!sitemapUrls.has(expectedUrl)) fail(`${route}: canonical URL missing from sitemap.xml`);
  else stats.sitemapMembers += 1;
  if (!/\bindex\b/i.test(robots) || !/\bfollow\b/i.test(robots)) fail(`${route}: robots must include index,follow`);
  else stats.indexedPages += 1;
  if (!/max-image-preview:large/i.test(robots)) warn(`${route}: robots lacks max-image-preview:large`);
  if (h1s.length !== 1) fail(`${route}: expected exactly one H1, found ${h1s.length}`);

  if (title) {
    const key = title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenTitles.has(key)) fail(`${route}: duplicate title with ${seenTitles.get(key)}`);
    else seenTitles.set(key, route);
  }
  if (description) {
    const key = description.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenDescriptions.has(key)) fail(`${route}: duplicate meta description with ${seenDescriptions.get(key)}`);
    else seenDescriptions.set(key, route);
  }
  if (pageCanonical) {
    if (seenCanonicals.has(pageCanonical)) fail(`${route}: duplicate canonical with ${seenCanonicals.get(pageCanonical)}`);
    else seenCanonicals.set(pageCanonical, route);
  }

  const requiredSocial = [
    ['og:title', property(html, 'og:title')],
    ['og:description', property(html, 'og:description')],
    ['og:url', property(html, 'og:url')],
    ['og:image', property(html, 'og:image')],
    ['twitter:card', meta(html, 'twitter:card')]
  ];
  for (const [name, value] of requiredSocial) if (!value) fail(`${route}: missing ${name}`);
  if (property(html, 'og:url') && property(html, 'og:url') !== pageCanonical) fail(`${route}: og:url must match canonical`);

  for (const name of ['twitter:title', 'twitter:description', 'twitter:image']) {
    if (!meta(html, name)) {
      stats.advancedSocialGaps += 1;
      warn(`${route}: missing ${name}`);
    }
  }
  for (const name of ['og:image:alt', 'og:image:width', 'og:image:height', 'og:image:type', 'twitter:image:alt']) {
    const value = name.startsWith('og:') ? property(html, name) : meta(html, name);
    if (!value) {
      stats.imageMetadataGaps += 1;
      warn(`${route}: missing ${name}`);
    }
  }

  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map(match => match[0]);
  if (images.length) stats.pagesWithImages += 1;
  for (const tag of images) {
    const src = attr(tag, 'src');
    const alt = attr(tag, 'alt');
    if (src && alt === '') fail(`${route}: crawlable content image ${src} has empty/missing alt`);
    if (src && (!attr(tag, 'width') || !attr(tag, 'height'))) {
      stats.imageMetadataGaps += 1;
      warn(`${route}: image ${src} lacks explicit width/height`);
    }
    if (src) {
      const assetFile = sameOriginAssetFile(absolute(src, route));
      if (assetFile) {
        stats.sameOriginImagesChecked += 1;
        if (!fs.existsSync(assetFile) || !fs.statSync(assetFile).isFile()) {
          stats.missingSameOriginImages += 1;
          fail(`${route}: same-origin image asset missing on disk: ${src}`);
        }
      }
    }
  }
  const ogImage = property(html, 'og:image');
  if (ogImage) {
    const assetFile = sameOriginAssetFile(absolute(ogImage, route));
    if (assetFile) {
      stats.sameOriginImagesChecked += 1;
      if (!fs.existsSync(assetFile) || !fs.statSync(assetFile).isFile()) {
        stats.missingSameOriginImages += 1;
        fail(`${route}: same-origin og:image asset missing on disk: ${ogImage}`);
      }
    }
  }
  if (ogImage && images.length && !images.some(tag => absolute(attr(tag, 'src'), route) === absolute(ogImage, route))) {
    warn(`${route}: og:image is not represented by a page content image`);
  }

  const jsonLdBlocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
  if (!jsonLdBlocks.length) fail(`${route}: missing JSON-LD`);
  let articleSchema = false;
  for (const [index, block] of jsonLdBlocks.entries()) {
    try {
      const parsed = JSON.parse(block[1]);
      const nodes = Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [parsed];
      if (nodes.some(node => ['Article', 'NewsArticle', 'BlogPosting'].includes(node?.['@type']))) articleSchema = true;
    } catch (error) {
      fail(`${route}: invalid JSON-LD block ${index + 1}: ${error.message}`);
    }
  }
  if (!articleSchema) fail(`${route}: missing Article/NewsArticle/BlogPosting schema`);
  else stats.pagesWithArticleSchema += 1;

  const published = property(html, 'article:published_time');
  if (!published) warn(`${route}: missing article:published_time`);
  if (!property(html, 'article:author') && !meta(html, 'author')) warn(`${route}: missing truthful author signal`);

  const lang = String(item.language || '').toLowerCase();
  if (lang === 'hr' || lang === 'en') {
    const hasAnyHreflang = /<link\s+[^>]*hreflang=/i.test(html);
    if (!hasAnyHreflang) {
      stats.hreflangGaps += 1;
      warn(`${route}: no hreflang links; pair only when a real reciprocal translation exists`);
    }
  }
}

const report = {
  version: 'GNK_ASG_EDITORIAL_VISIBILITY_AUDIT_V1',
  scope: 'editorial registry routes with materialized HTML',
  ok: failures.length === 0,
  stats,
  failures,
  warnings
};
const out = path.join(ROOT, 'artifacts', 'editorial-visibility');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
