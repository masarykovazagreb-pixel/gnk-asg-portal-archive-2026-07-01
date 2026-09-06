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
  partialResponsiveHints: 0,
  invalidLoading: 0,
  invalidFetchPriority: 0,
  contradictoryPrioritySignals: 0
};

const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const attr = (tag, name) => {
  const quoted = tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'i'));
  if (quoted) return quoted[1].trim();
  const bare = tag.match(new RegExp(`\\s${name}=([^\\s>]+)`, 'i'));
  return bare?.[1]?.trim() || '';
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
    const sizes = attr(tag, 'sizes');
    const loading = attr(tag, 'loading').toLowerCase();
    const fetchPriority = attr(tag, 'fetchpriority').toLowerCase();
    stats.imagesChecked++;

    if (Boolean(srcset) !== Boolean(sizes)) {
      stats.partialResponsiveHints++;
      failures.push(`${route}: image ${src} must declare srcset and sizes together`);
    }

    if (loading && !/^(lazy|eager)$/.test(loading)) {
      stats.invalidLoading++;
      failures.push(`${route}: image ${src} has invalid loading=${loading}; expected lazy, eager, or omission`);
    }

    if (fetchPriority && !/^(high|low|auto)$/.test(fetchPriority)) {
      stats.invalidFetchPriority++;
      failures.push(`${route}: image ${src} has invalid fetchpriority=${fetchPriority}; expected high, low, auto, or omission`);
    }

    if (loading === 'lazy' && fetchPriority === 'high') {
      stats.contradictoryPrioritySignals++;
      warnings.push(`${route}: image ${src} combines loading=lazy with fetchpriority=high; verify this is intentional`);
    }
  }
}

const report = {
  version: 'GNK_ASG_IMAGE_DELIVERY_CONTRACT_V1',
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
