import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const ORIGIN = 'https://gnk-asg.hr';
const failures = [];
const warnings = [];
const stats = { checkedPages: 0, socialImagesChecked: 0, missingAssets: 0, metadataGaps: 0, invalidDimensions: 0, mimeMismatches: 0 };

const extract = (html, regex) => html.match(regex)?.[1]?.trim() || '';
const meta = (html, name) => extract(html, new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i')) || extract(html, new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["'][^>]*>`, 'i'));
const property = (html, name) => extract(html, new RegExp(`<meta\\s+[^>]*property=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i')) || extract(html, new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*property=["']${name}["'][^>]*>`, 'i'));
const routeFile = route => path.join(PORTAL, route.replace(/^\\/+|\\/+$/g, ''), 'index.html');
const localAsset = value => {
  try {
    const url = new URL(value);
    if (url.origin !== ORIGIN) return null;
    return path.join(PORTAL, decodeURIComponent(url.pathname).replace(/^\\/+/, ''));
  } catch {
    return null;
  }
};
const mimeFromPath = value => {
  try {
    const pathname = new URL(value).pathname.toLowerCase();
    if (/\\.jpe?g$/.test(pathname)) return 'image/jpeg';
    if (/\\.png$/.test(pathname)) return 'image/png';
    if (/\\.webp$/.test(pathname)) return 'image/webp';
    if (/\\.gif$/.test(pathname)) return 'image/gif';
  } catch {
    return '';
  }
  return '';
};
const requireAbsoluteHttp = (route, label, value) => {
  if (!/^https?:\\/\\//i.test(value)) failures.push(`${route}: ${label} must be an absolute HTTP(S) URL`);
};
const requireAsset = (route, label, value) => {
  const file = localAsset(value);
  if (!file) return;
  stats.socialImagesChecked++;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    stats.missingAssets++;
    failures.push(`${route}: ${label} same-origin asset missing on disk: ${value}`);
  }
};
const positiveInt = value => /^\\d+$/.test(value) && Number(value) > 0;

if (!fs.existsSync(REGISTRY)) process.exit(1);
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const items = Array.isArray(registry.items) ? registry.items : [];

for (const item of items) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  stats.checkedPages++;

  const ogImage = property(html, 'og:image');
  const twitterImage = meta(html, 'twitter:image');
  const ogAlt = property(html, 'og:image:alt');
  const twitterAlt = meta(html, 'twitter:image:alt');
  const ogWidth = property(html, 'og:image:width');
  const ogHeight = property(html, 'og:image:height');
  const ogType = property(html, 'og:image:type');

  for (const [label, value] of [['og:image', ogImage], ['twitter:image', twitterImage]]) {
    if (!value) {
      stats.metadataGaps++;
      failures.push(`${route}: missing ${label}`);
      continue;
    }
    requireAbsoluteHttp(route, label, value);
    requireAsset(route, label, value);
  }

  for (const [label, value] of [['og:image:alt', ogAlt], ['twitter:image:alt', twitterAlt], ['og:image:type', ogType]]) {
    if (!value) {
      stats.metadataGaps++;
      failures.push(`${route}: missing ${label}`);
    }
  }

  for (const [label, value] of [['og:image:width', ogWidth], ['og:image:height', ogHeight]]) {
    if (!value) {
      stats.metadataGaps++;
      failures.push(`${route}: missing ${label}`);
    } else if (!positiveInt(value)) {
      stats.invalidDimensions++;
      failures.push(`${route}: ${label} must be a positive integer`);
    }
  }

  if (ogType && !/^image\\/(jpeg|png|webp|gif)$/i.test(ogType)) warnings.push(`${route}: unusual og:image:type ${ogType}`);
  const inferredMime = ogImage ? mimeFromPath(ogImage) : '';
  if (ogImage && !inferredMime) warnings.push(`${route}: og:image extension does not map to a supported image MIME; runtime HTTP Content-Type verification required`);
  if (ogType && inferredMime && ogType.toLowerCase() !== inferredMime) {
    stats.mimeMismatches++;
    failures.push(`${route}: og:image:type ${ogType} conflicts with image URL extension MIME ${inferredMime}`);
  }
  if (ogImage && twitterImage && ogImage !== twitterImage) warnings.push(`${route}: og:image and twitter:image differ; verify this is intentional`);
}

const report = { version: 'GNK_ASG_SOCIAL_IMAGE_CONTRACT_V1', ok: failures.length === 0, stats, failures, warnings };
const out = path.join(ROOT, 'artifacts', 'social-image-contract');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
