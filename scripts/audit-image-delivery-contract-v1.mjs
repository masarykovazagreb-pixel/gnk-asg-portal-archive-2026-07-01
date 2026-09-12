import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const failures = [];
const warnings = [];
const stats = {
  checkedPages: 0,
  imagesChecked: 0,
  missingAltAttributes: 0,
  invalidResponsiveHints: 0,
  missingDimensions: 0,
  missingDimensionPairs: 0,
  invalidDimensions: 0,
  invalidLoading: 0,
  invalidFetchPriority: 0,
  invalidDecoding: 0,
  contradictoryPrioritySignals: 0,
  decorativeHighPriorityImages: 0
};

const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const attr = (tag, name) => {
  const quoted = tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'i'));
  if (quoted) return quoted[1].trim();
  const bare = tag.match(new RegExp(`\\s${name}=([^\\s>]+)`, 'i'));
  return bare?.[1]?.trim() || '';
};
const hasAttr = (tag, name) => new RegExp(`\\s${name}(?:=|\\s|>|/)`, 'i').test(tag);
const isPositiveInteger = value => /^\d+$/.test(value) && Number(value) > 0;
const srcsetFamilies = srcset => {
  const families = new Set();
  for (const rawCandidate of String(srcset || '').split(',')) {
    const candidate = rawCandidate.trim();
    if (!candidate) continue;
    const descriptor = candidate.split(/\s+/)[1] || '';
    if (/^\d+w$/.test(descriptor)) families.add('w');
    else families.add('x');
  }
  return families;
};

if (!fs.existsSync(REGISTRY)) {
  console.error(`Registry missing: ${REGISTRY}`);
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const items = Array.isArray(registry.items) ? registry.items : [];

for (const item of items) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  stats.checkedPages++;

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const src = attr(tag, 'src') || '(missing-src)';
    const srcset = attr(tag, 'srcset');
    const sizesPresent = hasAttr(tag, 'sizes');
    const sizes = attr(tag, 'sizes');
    const width = attr(tag, 'width');
    const height = attr(tag, 'height');
    const loading = attr(tag, 'loading').toLowerCase();
    const fetchPriority = attr(tag, 'fetchpriority').toLowerCase();
    const decoding = attr(tag, 'decoding').toLowerCase();
    const altPresent = hasAttr(tag, 'alt');
    const alt = attr(tag, 'alt');
    stats.imagesChecked++;

    if (!altPresent) {
      stats.missingAltAttributes++;
      failures.push(`${route}: image ${src} is missing alt; use truthful context-specific alt text or alt="" only for decorative images`);
    }

    if (srcset) {
      const families = srcsetFamilies(srcset);
      if (families.has('w') && (!sizesPresent || !sizes)) {
        stats.invalidResponsiveHints++;
        failures.push(`${route}: image ${src} uses width-descriptor srcset and must declare non-empty sizes`);
      }
      if (!families.has('w') && sizesPresent) {
        stats.invalidResponsiveHints++;
        failures.push(`${route}: image ${src} uses density/default srcset; sizes must not be declared`);
      }
    } else if (sizesPresent) {
      stats.invalidResponsiveHints++;
      failures.push(`${route}: image ${src} declares sizes without srcset`);
    }

    if (!width && !height) {
      stats.missingDimensions++;
      failures.push(`${route}: image ${src} must declare intrinsic width and height`);
    } else if (Boolean(width) !== Boolean(height)) {
      stats.missingDimensionPairs++;
      failures.push(`${route}: image ${src} must declare width and height together`);
    } else if (!isPositiveInteger(width) || !isPositiveInteger(height)) {
      stats.invalidDimensions++;
      failures.push(`${route}: image ${src} has invalid dimensions width=${width} height=${height}; expected positive integer HTML dimensions`);
    }

    if (loading && !/^(lazy|eager)$/.test(loading)) {
      stats.invalidLoading++;
      failures.push(`${route}: image ${src} has invalid loading=${loading}; expected lazy, eager, or omission`);
    }

    if (fetchPriority && !/^(high|low|auto)$/.test(fetchPriority)) {
      stats.invalidFetchPriority++;
      failures.push(`${route}: image ${src} has invalid fetchpriority=${fetchPriority}; expected high, low, auto, or omission`);
    }

    if (decoding && !/^(sync|async|auto)$/.test(decoding)) {
      stats.invalidDecoding++;
      failures.push(`${route}: image ${src} has invalid decoding=${decoding}; expected sync, async, auto, or omission`);
    }

    if (loading === 'lazy' && fetchPriority === 'high') {
      stats.contradictoryPrioritySignals++;
      failures.push(`${route}: image ${src} combines loading=lazy with fetchpriority=high; choose a coherent delivery strategy`);
    }

    if (altPresent && alt === '' && fetchPriority === 'high') {
      stats.decorativeHighPriorityImages++;
      failures.push(`${route}: decorative image ${src} uses fetchpriority=high; decorative images must not consume primary-image priority`);
    }
  }
}

const report = {
  version: 'GNK_ASG_IMAGE_DELIVERY_CONTRACT_V2',
  ok: failures.length === 0,
  stats,
  failures,
  warnings
};
const out = path.join(ROOT, 'artifacts', 'image-delivery-contract');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
