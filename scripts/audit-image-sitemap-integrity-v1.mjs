#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const IMAGE_SITEMAP = path.join(PORTAL, 'image-sitemap.xml');
const ORIGIN = 'https://gnk-asg.hr';
const failures = [];
const warnings = [];
const stats = {
  registryPagesChecked: 0,
  registryPagesWithOgImage: 0,
  missingRouteEntries: 0,
  ogImagesMissingFromRouteEntry: 0,
  sitemapImagesChecked: 0,
  missingSameOriginAssets: 0,
  malformedImageUrls: 0,
};

const decodeXml = value => String(value || '')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .trim();

const normalizeUrl = value => {
  try {
    const url = new URL(decodeXml(value));
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
};

const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const property = (html, name) => {
  const a = html.match(new RegExp(`<meta\\s+[^>]*property=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'));
  const b = html.match(new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*property=["']${name}["'][^>]*>`, 'i'));
  return (a?.[1] || b?.[1] || '').trim();
};

if (!fs.existsSync(REGISTRY) || !fs.existsSync(IMAGE_SITEMAP)) {
  console.error('Required editorial registry or image sitemap is missing.');
  process.exit(1);
}

const xml = fs.readFileSync(IMAGE_SITEMAP, 'utf8');
const routeImages = new Map();
const allImages = new Set();
const urlBlocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)];
for (const blockMatch of urlBlocks) {
  const block = blockMatch[1];
  const loc = normalizeUrl(block.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1]);
  if (!loc) continue;
  const images = [...block.matchAll(/<image:loc>([\s\S]*?)<\/image:loc>/gi)]
    .map(match => normalizeUrl(match[1]))
    .filter(Boolean);
  routeImages.set(loc, new Set(images));
  for (const image of images) allImages.add(image);
}

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
for (const item of Array.isArray(registry.items) ? registry.items : []) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  stats.registryPagesChecked++;
  const html = fs.readFileSync(file, 'utf8');
  const ogImage = normalizeUrl(property(html, 'og:image'));
  if (!ogImage) continue;
  stats.registryPagesWithOgImage++;
  const pageUrl = new URL(route.replace(/^\//, ''), `${ORIGIN}/`).href;
  const images = routeImages.get(pageUrl);
  if (!images) {
    stats.missingRouteEntries++;
    failures.push(`${route}: no exact route entry in image-sitemap.xml; primary image discovery is not evidenced`);
    continue;
  }
  if (!images.has(ogImage)) {
    stats.ogImagesMissingFromRouteEntry++;
    failures.push(`${route}: og:image is not registered under the exact route in image-sitemap.xml: ${ogImage}`);
  }
}

for (const imageUrl of allImages) {
  stats.sitemapImagesChecked++;
  let url;
  try {
    url = new URL(imageUrl);
  } catch {
    stats.malformedImageUrls++;
    failures.push(`Malformed image sitemap URL: ${imageUrl}`);
    continue;
  }
  if (url.origin !== ORIGIN) continue;
  const local = path.join(PORTAL, decodeURIComponent(url.pathname).replace(/^\//, ''));
  if (!fs.existsSync(local) || !fs.statSync(local).isFile()) {
    stats.missingSameOriginAssets++;
    failures.push(`image-sitemap.xml references missing same-origin asset: ${imageUrl}`);
  }
}

if (!allImages.size) warnings.push('image-sitemap.xml contains no image:loc entries.');

const report = {
  version: 'GNK_ASG_IMAGE_SITEMAP_INTEGRITY_V1',
  ok: failures.length === 0,
  stats,
  failures,
  warnings,
};
const out = path.join(ROOT, 'artifacts', 'image-sitemap-integrity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
