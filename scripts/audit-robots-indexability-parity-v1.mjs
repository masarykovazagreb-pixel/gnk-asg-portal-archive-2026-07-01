import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const ROBOTS = path.join(PORTAL, 'robots.txt');
const failures = [];
const warnings = [];
const stats = { registryItems: 0, checkedPages: 0, blockedByRobots: 0, noindexPages: 0, missingRobotsMeta: 0 };

const routeFile = route => route === '/' ? path.join(PORTAL, 'index.html') : path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const extractMetaRobots = html => {
  const direct = html.match(/<meta\s+[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1];
  const reversed = html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']robots["'][^>]*>/i)?.[1];
  return String(direct || reversed || '').trim().toLowerCase();
};

if (!fs.existsSync(REGISTRY)) {
  console.error('Missing editorial registry');
  process.exit(1);
}
if (!fs.existsSync(ROBOTS)) {
  console.error('Missing robots.txt');
  process.exit(1);
}

const robotsText = fs.readFileSync(ROBOTS, 'utf8');
const lines = robotsText.split(/\r?\n/).map(line => line.replace(/#.*$/, '').trim()).filter(Boolean);
let appliesToAll = false;
const disallows = [];
for (const line of lines) {
  const [rawKey, ...rest] = line.split(':');
  const key = String(rawKey || '').trim().toLowerCase();
  const value = rest.join(':').trim();
  if (key === 'user-agent') {
    appliesToAll = value === '*';
    continue;
  }
  if (appliesToAll && key === 'disallow' && value) disallows.push(value);
}

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const items = Array.isArray(registry.items) ? registry.items : [];
stats.registryItems = items.length;

for (const item of items) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  stats.checkedPages++;
  const html = fs.readFileSync(file, 'utf8');
  const robotsMeta = extractMetaRobots(html);
  if (!robotsMeta) {
    stats.missingRobotsMeta++;
    warnings.push(`${route}: no explicit meta robots directive; relying on default index/follow behavior`);
  }
  if (/(^|[,\s])noindex([,\s]|$)/i.test(robotsMeta)) {
    stats.noindexPages++;
    failures.push(`${route}: editorial registry page contains noindex`);
  }
  for (const rule of disallows) {
    if (rule === '/') {
      stats.blockedByRobots++;
      failures.push(`${route}: blocked by User-agent:* Disallow: /`);
      break;
    }
    const normalizedRule = rule.split(/[?#]/, 1)[0];
    if (normalizedRule && route.startsWith(normalizedRule)) {
      stats.blockedByRobots++;
      failures.push(`${route}: blocked by User-agent:* Disallow: ${rule}`);
      break;
    }
  }
}

const sitemapLines = lines.filter(line => /^sitemap\s*:/i.test(line));
if (!sitemapLines.length) failures.push('robots.txt declares no Sitemap directive');

const report = {
  version: 'GNK_ASG_ROBOTS_INDEXABILITY_PARITY_V1',
  scope: 'materialized editorial registry pages vs User-agent:* robots policy',
  ok: failures.length === 0,
  stats,
  disallows,
  failures,
  warnings
};
const out = path.join(ROOT, 'artifacts', 'robots-indexability-parity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
