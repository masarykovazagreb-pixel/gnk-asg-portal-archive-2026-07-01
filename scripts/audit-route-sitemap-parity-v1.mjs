import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const SITEMAPS = ['sitemap.xml', 'editorial-sitemap.xml', 'visual-sitemap.xml', 'news-sitemap.xml'].map(name => path.join(PORTAL, name));
const failures = [];
const warnings = [];
const staticPublicRoutes = [];

const normalize = value => {
  try {
    const u = new URL(value, 'https://gnk-asg.hr');
    let p = u.pathname.replace(/\/+/g, '/');
    if (!p.endsWith('/')) p += '/';
    return p;
  } catch { return ''; }
};
const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const routeFromFile = file => {
  const rel = path.relative(PORTAL, path.dirname(file)).split(path.sep).join('/');
  return normalize(rel ? `/${rel}/` : '/');
};
const isPublicIndexableHtml = html => {
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
  return !/(?:^|[,\s])noindex(?:$|[,\s])/i.test(robots);
};
const walkPublicIndexPages = dir => {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (entry.name.startsWith('.') || ['data', 'assets', '_headers'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPublicIndexPages(full);
      continue;
    }
    if (!entry.isFile() || entry.name !== 'index.html') continue;
    const html = fs.readFileSync(full, 'utf8');
    if (!isPublicIndexableHtml(html)) continue;
    staticPublicRoutes.push(routeFromFile(full));
  }
};

if (!fs.existsSync(REGISTRY)) {
  console.error(`Registry missing: ${REGISTRY}`);
  process.exit(1);
}
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const sitemapRoutes = new Map();
for (const file of SITEMAPS) {
  if (!fs.existsSync(file)) continue;
  const xml = fs.readFileSync(file, 'utf8');
  const routes = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map(m => normalize(m[1])).filter(Boolean);
  sitemapRoutes.set(path.basename(file), new Set(routes));
}
const allSitemapRoutes = new Set([...sitemapRoutes.values()].flatMap(set => [...set]));

walkPublicIndexPages(PORTAL);
const distinctStaticPublicRoutes = new Set(staticPublicRoutes.filter(Boolean));
for (const route of distinctStaticPublicRoutes) {
  if (!allSitemapRoutes.has(route)) failures.push(`${route}: public indexable static route is absent from all public sitemaps`);
}

const publicRegistryRoutes = [];
for (const item of Array.isArray(registry.items) ? registry.items : []) {
  const route = normalize(String(item.path || ''));
  if (!route) continue;
  const noindex = item.noindex === true || item.indexable === false || item.visibility === 'private';
  if (noindex) continue;
  publicRegistryRoutes.push(route);
  const file = routeFile(route);
  if (!fs.existsSync(file)) failures.push(`${route}: public registry route has no static index.html`);
  if (!allSitemapRoutes.has(route)) failures.push(`${route}: public registry route is absent from all public sitemaps`);
}

for (const [name, routes] of sitemapRoutes) {
  for (const route of routes) {
    const file = routeFile(route);
    if (!fs.existsSync(file) && route !== '/') warnings.push(`${name}: ${route} has no matching static index.html; verify intentional dynamic route`);
  }
}

const report = {
  version: 'GNK_ASG_ROUTE_SITEMAP_PARITY_V2',
  scope: 'ALL_LOCAL_PUBLIC_INDEXABLE_INDEX_HTML_PLUS_EDITORIAL_REGISTRY',
  ok: failures.length === 0,
  stats: {
    staticPublicRoutes: distinctStaticPublicRoutes.size,
    publicRegistryRoutes: publicRegistryRoutes.length,
    distinctSitemapRoutes: allSitemapRoutes.size,
    sitemapFilesChecked: sitemapRoutes.size
  },
  failures,
  warnings,
  sitemaps: Object.fromEntries([...sitemapRoutes].map(([name, set]) => [name, set.size]))
};
const out = path.join(ROOT, 'artifacts', 'route-sitemap-parity');
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
