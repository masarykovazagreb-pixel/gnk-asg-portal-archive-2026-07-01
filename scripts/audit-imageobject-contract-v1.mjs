import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const ORIGIN = 'https://gnk-asg.hr';
const failures = [];
const stats = {
  checkedPages: 0,
  imageObjects: 0,
  missingImageObject: 0,
  missingRepresentativeImage: 0,
  missingUrl: 0,
  insecureUrl: 0,
  credentialedUrl: 0,
  unstableUrl: 0,
  missingLocalAsset: 0,
  invalidRepresentativeOfPage: 0,
  representativeOgMismatches: 0,
  representativeWithoutOgImage: 0,
  representativeMissingDimensions: 0,
  representativeMissingCaption: 0,
  representativeMissingEncodingFormat: 0,
  multipleRepresentativeImages: 0,
  conflictingUrls: 0,
  invalidDimensions: 0,
  incompleteDimensionPairs: 0,
  emptyCaptions: 0,
  invalidEncodingFormat: 0,
  encodingFormatMismatches: 0
};
const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const jsonLdObjects = html => {
  const out = [];
  const regex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html))) {
    try {
      const parsed = JSON.parse(match[1]);
      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length) {
        const value = queue.shift();
        if (!value || typeof value !== 'object') continue;
        out.push(value);
        if (Array.isArray(value['@graph'])) queue.push(...value['@graph']);
      }
    } catch {}
  }
  return out;
};
const typeIncludes = (obj, type) => Array.isArray(obj?.['@type']) ? obj['@type'].includes(type) : obj?.['@type'] === type;
const normalizedUrl = value => {
  if (typeof value !== 'string' || !value.trim()) return '';
  try { return new URL(value).href; } catch { return ''; }
};
const validDimension = value => {
  if (typeof value === 'number') return Number.isInteger(value) && value > 0;
  if (typeof value === 'string') return /^[1-9]\d*$/.test(value.trim());
  return false;
};
const metaProperty = (html, name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const direct = html.match(new RegExp(`<meta\\s+[^>]*property=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'))?.[1];
  const reversed = html.match(new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*property=["']${escaped}["'][^>]*>`, 'i'))?.[1];
  return normalizedUrl(direct || reversed || '');
};
const MIME_BY_EXT = new Map([
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp']
]);
const validateStableUrl = (route, imageUrl) => {
  let parsed;
  try { parsed = new URL(imageUrl); } catch {
    failures.push(`${route}: invalid ImageObject URL ${imageUrl}`);
    return null;
  }
  if (parsed.protocol !== 'https:') {
    stats.insecureUrl++;
    failures.push(`${route}: ImageObject URL must use HTTPS: ${imageUrl}`);
  }
  if (parsed.username || parsed.password) {
    stats.credentialedUrl++;
    failures.push(`${route}: ImageObject URL must not contain credentials: ${imageUrl}`);
  }
  if (parsed.search || parsed.hash) {
    stats.unstableUrl++;
    failures.push(`${route}: ImageObject URL must be stable and omit query/fragment: ${imageUrl}`);
  }
  return parsed;
};
if (!fs.existsSync(REGISTRY)) process.exit(1);
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
for (const item of Array.isArray(registry.items) ? registry.items : []) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  stats.checkedPages++;
  const pageOgImage = metaProperty(html, 'og:image');
  const imageObjects = jsonLdObjects(html).filter(obj => typeIncludes(obj, 'ImageObject'));
  const representativeObjects = imageObjects.filter(obj => obj.representativeOfPage === true);

  // Editorial registry pages that expose an og:image are declaring a primary
  // visual publicly. Make the structured-image linkage fail closed rather than
  // treating ImageObject coverage as optional evidence.
  if (pageOgImage && imageObjects.length === 0) {
    stats.missingImageObject++;
    failures.push(`${route}: og:image is present but no ImageObject JSON-LD exists; public primary-image metadata must be structurally linked`);
  }
  if (pageOgImage && representativeObjects.length === 0) {
    stats.missingRepresentativeImage++;
    failures.push(`${route}: og:image is present but no ImageObject has representativeOfPage=true; exactly one primary visual must be identified`);
  }
  if (representativeObjects.length > 1) {
    stats.multipleRepresentativeImages++;
    failures.push(`${route}: multiple ImageObject nodes claim representativeOfPage=true; exactly one representative image is permitted`);
  }
  if (representativeObjects.length && !pageOgImage) {
    stats.representativeWithoutOgImage++;
    failures.push(`${route}: representative ImageObject requires an og:image so social and structured primary-image signals can be reconciled`);
  }
  for (const obj of imageObjects) {
    stats.imageObjects++;
    const contentUrl = normalizedUrl(obj.contentUrl);
    const url = normalizedUrl(obj.url);
    const imageUrl = contentUrl || url;
    if (!imageUrl) {
      stats.missingUrl++;
      failures.push(`${route}: ImageObject missing valid contentUrl/url`);
      continue;
    }
    if (contentUrl && url && contentUrl !== url) {
      stats.conflictingUrls++;
      failures.push(`${route}: ImageObject contentUrl and url disagree (${contentUrl} != ${url})`);
    }
    const parsed = validateStableUrl(route, imageUrl);
    if (!parsed) continue;
    if (parsed.origin === ORIGIN) {
      const asset = path.join(PORTAL, decodeURIComponent(parsed.pathname).replace(/^\/+/, ''));
      if (!fs.existsSync(asset) || !fs.statSync(asset).isFile()) {
        stats.missingLocalAsset++;
        failures.push(`${route}: ImageObject same-origin asset missing: ${imageUrl}`);
      }
    }
    if ('representativeOfPage' in obj && typeof obj.representativeOfPage !== 'boolean') {
      stats.invalidRepresentativeOfPage++;
      failures.push(`${route}: ImageObject representativeOfPage must be boolean when present`);
    }
    if (obj.representativeOfPage === true && pageOgImage && pageOgImage !== imageUrl) {
      stats.representativeOgMismatches++;
      failures.push(`${route}: representative ImageObject must match og:image (${imageUrl} != ${pageOgImage})`);
    }
    const hasWidth = Object.prototype.hasOwnProperty.call(obj, 'width');
    const hasHeight = Object.prototype.hasOwnProperty.call(obj, 'height');
    if (hasWidth !== hasHeight) {
      stats.incompleteDimensionPairs++;
      failures.push(`${route}: ImageObject width and height must be supplied together when either is present`);
    }
    for (const field of ['width', 'height']) {
      if (field in obj && !validDimension(obj[field])) {
        stats.invalidDimensions++;
        failures.push(`${route}: ImageObject ${field} must be a positive integer when present`);
      }
    }
    if ('caption' in obj && (typeof obj.caption !== 'string' || !obj.caption.trim())) {
      stats.emptyCaptions++;
      failures.push(`${route}: ImageObject caption must be non-empty text when present`);
    }
    const encodingFormat = typeof obj.encodingFormat === 'string' ? obj.encodingFormat.trim().toLowerCase() : '';
    if ('encodingFormat' in obj && !/^image\/[a-z0-9.+-]+$/.test(encodingFormat)) {
      stats.invalidEncodingFormat++;
      failures.push(`${route}: ImageObject encodingFormat must be a valid image MIME type when present`);
    }
    const expectedMime = MIME_BY_EXT.get(path.extname(parsed.pathname).toLowerCase());
    if (encodingFormat && expectedMime && encodingFormat !== expectedMime) {
      stats.encodingFormatMismatches++;
      failures.push(`${route}: ImageObject encodingFormat ${encodingFormat} disagrees with URL extension MIME ${expectedMime}`);
    }
    if (obj.representativeOfPage === true) {
      if (!hasWidth || !hasHeight || !validDimension(obj.width) || !validDimension(obj.height)) {
        stats.representativeMissingDimensions++;
        failures.push(`${route}: representative ImageObject must provide valid width and height`);
      }
      if (typeof obj.caption !== 'string' || !obj.caption.trim()) {
        stats.representativeMissingCaption++;
        failures.push(`${route}: representative ImageObject must provide a non-empty context caption`);
      }
      if (!encodingFormat) {
        stats.representativeMissingEncodingFormat++;
        failures.push(`${route}: representative ImageObject must provide encodingFormat so structured image MIME is explicit`);
      }
    }
  }
}
const report = { version: 'GNK_ASG_IMAGEOBJECT_CONTRACT_V1', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'imageobject-contract');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
