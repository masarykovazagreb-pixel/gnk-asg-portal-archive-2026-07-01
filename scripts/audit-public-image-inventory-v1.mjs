import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const IMAGE_SITEMAP = path.join(PORTAL, 'image-sitemap.xml');
const failures = [];
const warnings = [];
const inventory = [];

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'i'));
  return m?.[1]?.trim() || '';
};
const hasAttr = (tag, name) => new RegExp(`\\s${name}(?:=|\\s|>|/)`, 'i').test(tag);
const routeFile = route => path.join(PORTAL, route.replace(/^\\/+|\\/+$/g, ''), 'index.html');
const localAssetPath = src => {
  if (!src || /^https?:\/\//i.test(src) || /^data:/i.test(src)) return null;
  const clean = src.split(/[?#]/)[0];
  return path.join(PORTAL, clean.replace(/^\//, ''));
};

if (!fs.existsSync(REGISTRY)) {
  console.error(`Registry missing: ${REGISTRY}`);
  process.exit(1);
}
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const sitemap = fs.existsSync(IMAGE_SITEMAP) ? fs.readFileSync(IMAGE_SITEMAP, 'utf8') : '';
const items = Array.isArray(registry.items) ? registry.items : [];

for (const item of items) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
  const twitterImage = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const src = attr(tag, 'src');
    const altPresent = hasAttr(tag, 'alt');
    const alt = attr(tag, 'alt');
    const width = attr(tag, 'width');
    const height = attr(tag, 'height');
    const decorative = altPresent && alt === '';
    const asset = localAssetPath(src);
    const exists = asset ? fs.existsSync(asset) : null;
    const sitemapRegistered = src ? sitemap.includes(src.split(/[?#]/)[0]) : false;

    inventory.push({route, src, decorative, alt, width, height, localAssetExists: exists, sitemapRegistered, ogImageMatch: Boolean(src && ogImage.includes(src)), twitterImageMatch: Boolean(src && twitterImage.includes(src))});

    if (!src) failures.push(`${route}: rendered image is missing src`);
    if (!altPresent) failures.push(`${route}: image ${src || '(missing-src)'} is missing explicit alt intent`);
    if (asset && !exists) failures.push(`${route}: local image asset does not exist: ${src}`);
    if (!decorative && (!width || !height)) failures.push(`${route}: informative image ${src} is missing width/height`);
    if (!decorative && !sitemapRegistered) failures.push(`${route}: informative image ${src} is not registered in image-sitemap.xml`);
  }
}

const informative = inventory.filter(x => !x.decorative);
const report = {
  version: 'GNK_ASG_PUBLIC_IMAGE_INVENTORY_V1',
  ok: failures.length === 0,
  stats: {
    pagesChecked: new Set(inventory.map(x => x.route)).size,
    images: inventory.length,
    informative: informative.length,
    decorative: inventory.length - informative.length,
    informativeInImageSitemap: informative.filter(x => x.sitemapRegistered).length,
    localAssetsMissing: inventory.filter(x => x.localAssetExists === false).length
  },
  failures,
  warnings,
  inventory
};
const out = path.join(ROOT, 'artifacts', 'public-image-inventory');
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
