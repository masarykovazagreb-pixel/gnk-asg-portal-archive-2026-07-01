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
const cleanSrc = src => String(src || '').split(/[?#]/)[0];
const imageExt = src => path.extname(cleanSrc(src)).toLowerCase();
const allowedImageExt = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const filenameLooksSemantic = src => {
  const base = path.basename(cleanSrc(src), imageExt(src));
  if (!base) return false;
  if (/^(img|image|photo|picture|asset)[-_]?\d*$/i.test(base)) return false;
  if (/^[a-f0-9]{16,}$/i.test(base)) return false;
  return /[a-zA-Z]{3,}/.test(base);
};
const srcsetHasCandidates = value => String(value || '').split(',').some(x => /\S+\s+(?:\d+w|\d+(?:\.\d+)?x)\s*$/.test(x.trim()));
const validLoading = value => !value || ['lazy', 'eager'].includes(value.toLowerCase());
const validFetchPriority = value => !value || ['high', 'low', 'auto'].includes(value.toLowerCase());

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
    const srcset = attr(tag, 'srcset');
    const sizes = attr(tag, 'sizes');
    const loading = attr(tag, 'loading');
    const fetchpriority = attr(tag, 'fetchpriority');
    const title = attr(tag, 'title');
    const decorative = altPresent && alt === '';
    const asset = localAssetPath(src);
    const exists = asset ? fs.existsSync(asset) : null;
    const ext = imageExt(src);
    const localMimeShapeOk = asset ? allowedImageExt.has(ext) : null;
    const sitemapRegistered = src ? sitemap.includes(cleanSrc(src)) : false;
    const semanticFilename = src ? filenameLooksSemantic(src) : false;
    const responsivePairComplete = Boolean(srcset) === Boolean(sizes);
    const responsiveCandidatesValid = !srcset || srcsetHasCandidates(srcset);

    inventory.push({
      route,
      src,
      decorative,
      alt,
      title,
      width,
      height,
      srcset,
      sizes,
      loading,
      fetchpriority,
      localAssetExists: exists,
      localMimeShapeOk,
      semanticFilename,
      responsivePairComplete,
      responsiveCandidatesValid,
      sitemapRegistered,
      ogImageMatch: Boolean(src && cleanSrc(ogImage) === cleanSrc(src)),
      twitterImageMatch: Boolean(src && cleanSrc(twitterImage) === cleanSrc(src))
    });

    if (!src) failures.push(`${route}: rendered image is missing src`);
    if (!altPresent) failures.push(`${route}: image ${src || '(missing-src)'} is missing explicit alt intent`);
    if (asset && !exists) failures.push(`${route}: local image asset does not exist: ${src}`);
    if (asset && exists && !localMimeShapeOk) failures.push(`${route}: local image uses unsupported/ambiguous file extension for MIME delivery: ${src}`);
    if (!decorative && (!width || !height)) failures.push(`${route}: informative image ${src} is missing width/height`);
    if (!decorative && !sitemapRegistered) failures.push(`${route}: informative image ${src} is not registered in image-sitemap.xml`);
    if (!responsivePairComplete) failures.push(`${route}: image ${src} must declare srcset and sizes together`);
    if (!responsiveCandidatesValid) failures.push(`${route}: image ${src} has srcset without valid width/density descriptors`);
    if (!validLoading(loading)) failures.push(`${route}: image ${src} has invalid loading=${loading}`);
    if (!validFetchPriority(fetchpriority)) failures.push(`${route}: image ${src} has invalid fetchpriority=${fetchpriority}`);
    if (!decorative && src && !semanticFilename) warnings.push(`${route}: informative image filename is weak/non-semantic: ${src}`);
    if (/^https?:\/\//i.test(src)) warnings.push(`${route}: remote image requires runtime HTTP status/MIME verification: ${src}`);
  }
}

const informative = inventory.filter(x => !x.decorative);
const report = {
  version: 'GNK_ASG_PUBLIC_IMAGE_INVENTORY_V2',
  evidenceSemantics: {
    localAssetExists: 'STATIC_FILE_EVIDENCE_ONLY',
    localMimeShapeOk: 'EXTENSION_SHAPE_ONLY_NOT_HTTP_MIME',
    remoteHttpAndMime: 'RUNTIME_EVIDENCE_REQUIRED',
    indexed: 'NOT_INFERRED_FROM_DISCOVERY'
  },
  ok: failures.length === 0,
  stats: {
    pagesChecked: new Set(inventory.map(x => x.route)).size,
    images: inventory.length,
    informative: informative.length,
    decorative: inventory.length - informative.length,
    informativeInImageSitemap: informative.filter(x => x.sitemapRegistered).length,
    localAssetsMissing: inventory.filter(x => x.localAssetExists === false).length,
    weakSemanticFilenames: informative.filter(x => !x.semanticFilename).length,
    incompleteResponsivePairs: inventory.filter(x => !x.responsivePairComplete).length,
    invalidResponsiveCandidates: inventory.filter(x => !x.responsiveCandidatesValid).length,
    remoteRuntimeChecksRequired: inventory.filter(x => /^https?:\/\//i.test(x.src)).length
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
