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
  missingUrl: 0,
  insecureUrl: 0,
  missingLocalAsset: 0,
  invalidRepresentativeOfPage: 0,
  conflictingUrls: 0,
  invalidDimensions: 0,
  emptyCaptions: 0
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
if (!fs.existsSync(REGISTRY)) process.exit(1);
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
for (const item of Array.isArray(registry.items) ? registry.items : []) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  stats.checkedPages++;
  const imageObjects = jsonLdObjects(html).filter(obj => typeIncludes(obj, 'ImageObject'));
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
    if (!/^https:\/\//i.test(imageUrl)) {
      stats.insecureUrl++;
      failures.push(`${route}: ImageObject URL must be absolute HTTPS: ${imageUrl}`);
      continue;
    }
    try {
      const parsed = new URL(imageUrl);
      if (parsed.origin === ORIGIN) {
        const asset = path.join(PORTAL, decodeURIComponent(parsed.pathname).replace(/^\/+/, ''));
        if (!fs.existsSync(asset) || !fs.statSync(asset).isFile()) {
          stats.missingLocalAsset++;
          failures.push(`${route}: ImageObject same-origin asset missing: ${imageUrl}`);
        }
      }
    } catch {
      failures.push(`${route}: invalid ImageObject URL ${imageUrl}`);
    }
    if ('representativeOfPage' in obj && typeof obj.representativeOfPage !== 'boolean') {
      stats.invalidRepresentativeOfPage++;
      failures.push(`${route}: ImageObject representativeOfPage must be boolean when present`);
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
  }
}
const report = { version: 'GNK_ASG_IMAGEOBJECT_CONTRACT_V1', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'imageobject-contract');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
