import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const failures = [];
const warnings = [];

const normalize = value => {
  try {
    const u = new URL(value, 'https://gnk-asg.hr');
    if (u.origin !== 'https://gnk-asg.hr') return '';
    let p = u.pathname.replace(/\/+/g, '/');
    if (!p.endsWith('/')) p += '/';
    return p;
  } catch { return ''; }
};
const routeFile = route => route === '/' ? path.join(PORTAL, 'index.html') : path.join(PORTAL, route.replace(/^\\/+|\\/+$/g, ''), 'index.html');

if (!fs.existsSync(REGISTRY)) {
  console.error(`Registry missing: ${REGISTRY}`);
  process.exit(1);
}
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const publicRoutes = new Set(['/']);
for (const item of Array.isArray(registry.items) ? registry.items : []) {
  const route = normalize(String(item.path || ''));
  if (!route) continue;
  const excluded = item.noindex === true || item.indexable === false || item.visibility === 'private';
  if (!excluded) publicRoutes.add(route);
}

const graph = new Map();
for (const route of publicRoutes) {
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const links = new Set();
  for (const m of html.matchAll(/<a\b[^>]*\shref=["']([^"']+)["'][^>]*>/gi)) {
    const target = normalize(m[1]);
    if (target && publicRoutes.has(target)) links.add(target);
  }
  graph.set(route, links);
}

const depth = new Map([['/', 0]]);
const queue = ['/'];
while (queue.length) {
  const current = queue.shift();
  const nextDepth = depth.get(current) + 1;
  for (const next of graph.get(current) || []) {
    if (!depth.has(next)) {
      depth.set(next, nextDepth);
      queue.push(next);
    }
  }
}

for (const route of publicRoutes) {
  if (route === '/') continue;
  if (!depth.has(route)) failures.push(`${route}: public indexable route is orphaned from the homepage crawl graph`);
  else if (depth.get(route) > 4) warnings.push(`${route}: crawl depth=${depth.get(route)} exceeds preferred depth 4`);
}

const histogram = {};
for (const value of depth.values()) histogram[value] = (histogram[value] || 0) + 1;
const report = {
  version: 'GNK_ASG_CRAWL_DEPTH_CONTRACT_V1',
  ok: failures.length === 0,
  stats: {
    publicRoutes: publicRoutes.size,
    reachableRoutes: depth.size,
    orphanRoutes: publicRoutes.size - depth.size,
    maxDepth: Math.max(...depth.values())
  },
  depthHistogram: histogram,
  failures,
  warnings,
  routes: Object.fromEntries([...depth.entries()].sort((a,b) => a[1]-b[1] || a[0].localeCompare(b[0])))
};
const out = path.join(ROOT, 'artifacts', 'crawl-depth-contract');
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
