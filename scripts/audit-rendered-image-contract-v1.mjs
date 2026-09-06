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
  renderedPrimaryImages: 0,
  missingRenderedPrimaryImage: 0,
  missingAlt: 0,
  genericAlt: 0,
  missingDimensions: 0,
  missingResponsiveHints: 0,
  partialResponsiveHints: 0,
  invalidFetchPriority: 0,
  lazyPrimaryImages: 0,
  imageObjectsChecked: 0,
  imageObjectMetadataGaps: 0
};

const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const attr = (tag, name) => {
  const quoted = tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'i'));
  if (quoted) return quoted[1].trim();
  const bare = tag.match(new RegExp(`\\s${name}=([^\\s>]+)`, 'i'));
  return bare?.[1]?.trim() || '';
};
const property = (html, name) => {
  const a = html.match(new RegExp(`<meta\\s+[^>]*property=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'));
  const b = html.match(new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*property=["']${name}["'][^>]*>`, 'i'));
  return (a?.[1] || b?.[1] || '').trim();
};
const positiveInt = value => /^\d+$/.test(value) && Number(value) > 0;
const normalize = value => String(value || '').trim().replace(/\s+/g, ' ');
const genericAlt = value => /^(image|photo|picture|slika|fotografija|logo|cover|thumbnail|hero)$/i.test(normalize(value));
const normalizeUrl = (value, base = ORIGIN) => {
  try {
    return new URL(value, base).href;
  } catch {
    return '';
  }
};
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
    } catch {
      // JSON-LD syntax is validated by the editorial visibility contract.
    }
  }
  return out;
};
const typeIncludes = (obj, type) => {
  const raw = obj?.['@type'];
  return Array.isArray(raw) ? raw.includes(type) : raw === type;
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

  const ogImage = property(html, 'og:image');
  const primaryUrl = normalizeUrl(ogImage);
  if (primaryUrl && primaryUrl.startsWith(`${ORIGIN}/`)) {
    const tags = [...html.matchAll(/<img\b[^>]*>/gi)].map(match => match[0]);
    const matches = tags.filter(tag => normalizeUrl(attr(tag, 'src')) === primaryUrl);
    if (!matches.length) {
      stats.missingRenderedPrimaryImage++;
      warnings.push(`${route}: same-origin og:image is not rendered as an <img>; acceptable for share-only art, but representative page-image linkage is not evidenced`);
    }

    for (const tag of matches) {
      stats.renderedPrimaryImages++;
      const alt = attr(tag, 'alt');
      const width = attr(tag, 'width');
      const height = attr(tag, 'height');
      const srcset = attr(tag, 'srcset');
      const sizes = attr(tag, 'sizes');
      const loading = attr(tag, 'loading').toLowerCase();
      const fetchPriority = attr(tag, 'fetchpriority').toLowerCase();

      if (!alt) {
        stats.missingAlt++;
        failures.push(`${route}: rendered primary image matching og:image is missing alt text`);
      } else if (genericAlt(alt)) {
        stats.genericAlt++;
        failures.push(`${route}: rendered primary image uses generic alt text; provide a truthful context-specific description`);
      }

      if (!positiveInt(width) || !positiveInt(height)) {
        stats.missingDimensions++;
        failures.push(`${route}: rendered primary image matching og:image must declare positive width and height`);
      }

      if (Boolean(srcset) !== Boolean(sizes)) {
        stats.partialResponsiveHints++;
        failures.push(`${route}: rendered primary image must declare srcset and sizes together; partial responsive hints are ambiguous`);
      } else if (!srcset && !sizes) {
        stats.missingResponsiveHints++;
        warnings.push(`${route}: rendered primary image lacks srcset and sizes; add responsive hints where the asset pipeline supports them`);
      }

      if (fetchPriority && !/^(high|low|auto)$/.test(fetchPriority)) {
        stats.invalidFetchPriority++;
        failures.push(`${route}: rendered primary image has invalid fetchpriority=${fetchPriority}; expected high, low, auto, or omission`);
      }

      if (loading === 'lazy') {
        stats.lazyPrimaryImages++;
        warnings.push(`${route}: primary social/page image is lazy-loaded; verify it is not an above-the-fold/LCP image before keeping loading=lazy`);
      }
      if (loading === 'lazy' && fetchPriority === 'high') {
        warnings.push(`${route}: primary image combines loading=lazy with fetchpriority=high; verify these competing fetch signals are intentional`);
      }
    }
  }

  const imageObjects = jsonLdObjects(html).filter(obj => typeIncludes(obj, 'ImageObject'));
  for (const obj of imageObjects) {
    stats.imageObjectsChecked++;
    const url = normalizeUrl(typeof obj.contentUrl === 'string' ? obj.contentUrl : typeof obj.url === 'string' ? obj.url : '');
    const caption = normalize(obj.caption || obj.name);
    if (!url || !/^https:\/\//i.test(url)) {
      stats.imageObjectMetadataGaps++;
      failures.push(`${route}: ImageObject must expose an absolute HTTPS contentUrl or url`);
    }
    if (!caption) {
      stats.imageObjectMetadataGaps++;
      warnings.push(`${route}: ImageObject has no caption/name; add one when it truthfully describes the visual`);
    }
  }
}

const report = {
  version: 'GNK_ASG_RENDERED_IMAGE_CONTRACT_V1',
  ok: failures.length === 0,
  stats,
  failures,
  warnings
};
const out = path.join(ROOT, 'artifacts', 'rendered-image-contract');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
