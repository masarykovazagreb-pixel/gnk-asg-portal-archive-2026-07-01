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
  socialImagesChecked: 0,
  missingAssets: 0,
  metadataGaps: 0,
  invalidDimensions: 0,
  mimeMismatches: 0,
  fileMimeMismatches: 0,
  unknownFileMime: 0,
  insecureImageUrls: 0,
  genericAltText: 0,
  altMismatches: 0,
  imageObjectPages: 0,
  imageObjectMissing: 0,
  imageObjectUrlMismatches: 0
};

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
const mimeFromFileSignature = file => {
  try {
    const buffer = fs.readFileSync(file);
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
    if (buffer.length >= 6) {
      const signature = buffer.subarray(0, 6).toString('ascii');
      if (signature === 'GIF87a' || signature === 'GIF89a') return 'image/gif';
    }
  } catch {
    return '';
  }
  return '';
};
const requireAbsoluteHttps = (route, label, value) => {
  if (!/^https:\\/\\//i.test(value)) {
    stats.insecureImageUrls++;
    failures.push(`${route}: ${label} must be an absolute HTTPS URL`);
  }
};
const requireAsset = (route, label, value) => {
  const file = localAsset(value);
  if (!file) return null;
  stats.socialImagesChecked++;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    stats.missingAssets++;
    failures.push(`${route}: ${label} same-origin asset missing on disk: ${value}`);
    return null;
  }
  return file;
};
const positiveInt = value => /^\\d+$/.test(value) && Number(value) > 0;
const normalizeAlt = value => String(value || '').trim().replace(/\\s+/g, ' ');
const genericAlt = value => /^(image|photo|picture|slika|fotografija|logo|cover|thumbnail)$/i.test(normalizeAlt(value));
const jsonLdObjects = html => {
  const out = [];
  const regex = /<script\\s+[^>]*type=["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script>/gi;
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
    } catch {
      // Malformed JSON-LD is handled by the editorial visibility validator.
    }
  }
  return out;
};
const typeIncludes = (obj, type) => {
  const raw = obj?.['@type'];
  return Array.isArray(raw) ? raw.includes(type) : raw === type;
};
const imageObjectUrl = obj => {
  const candidate = obj?.contentUrl || obj?.url;
  if (typeof candidate === 'string') return candidate;
  return '';
};

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
  let ogAsset = null;

  for (const [label, value] of [['og:image', ogImage], ['twitter:image', twitterImage]]) {
    if (!value) {
      stats.metadataGaps++;
      failures.push(`${route}: missing ${label}`);
      continue;
    }
    requireAbsoluteHttps(route, label, value);
    const asset = requireAsset(route, label, value);
    if (label === 'og:image') ogAsset = asset;
  }

  for (const [label, value] of [['og:image:alt', ogAlt], ['twitter:image:alt', twitterAlt], ['og:image:type', ogType]]) {
    if (!value) {
      stats.metadataGaps++;
      failures.push(`${route}: missing ${label}`);
    }
  }

  for (const [label, value] of [['og:image:alt', ogAlt], ['twitter:image:alt', twitterAlt]]) {
    if (value && genericAlt(value)) {
      stats.genericAltText++;
      failures.push(`${route}: ${label} is generic; provide context-specific image text`);
    }
  }

  if (ogAlt && twitterAlt && normalizeAlt(ogAlt) !== normalizeAlt(twitterAlt)) {
    stats.altMismatches++;
    warnings.push(`${route}: og:image:alt and twitter:image:alt differ; verify both accurately describe the same visual`);
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

  if (ogAsset) {
    const fileMime = mimeFromFileSignature(ogAsset);
    if (!fileMime) {
      stats.unknownFileMime++;
      failures.push(`${route}: og:image same-origin asset has an unrecognized file signature; cannot verify actual image MIME`);
    } else {
      if (inferredMime && inferredMime !== fileMime) {
        stats.fileMimeMismatches++;
        failures.push(`${route}: og:image URL extension MIME ${inferredMime} conflicts with actual file signature MIME ${fileMime}`);
      }
      if (ogType && ogType.toLowerCase() !== fileMime) {
        stats.fileMimeMismatches++;
        failures.push(`${route}: og:image:type ${ogType} conflicts with actual file signature MIME ${fileMime}`);
      }
    }
  }

  if (ogImage && twitterImage && ogImage !== twitterImage) warnings.push(`${route}: og:image and twitter:image differ; verify this is intentional`);

  const imageObjects = jsonLdObjects(html).filter(obj => typeIncludes(obj, 'ImageObject'));
  if (imageObjects.length) {
    stats.imageObjectPages++;
    if (ogImage) {
      const urls = imageObjects.map(imageObjectUrl).filter(Boolean);
      if (urls.length && !urls.includes(ogImage)) {
        stats.imageObjectUrlMismatches++;
        warnings.push(`${route}: ImageObject URL does not match og:image; verify primary visual/entity linkage`);
      }
    }
  } else {
    stats.imageObjectMissing++;
    warnings.push(`${route}: no ImageObject JSON-LD detected; structured image coverage is not yet evidenced`);
  }
}

const report = { version: 'GNK_ASG_SOCIAL_IMAGE_CONTRACT_V1', ok: failures.length === 0, stats, failures, warnings };
const out = path.join(ROOT, 'artifacts', 'social-image-contract');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
