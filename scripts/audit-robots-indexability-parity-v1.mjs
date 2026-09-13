import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const ROBOTS = path.join(PORTAL, 'robots.txt');
const failures = [];
const warnings = [];
const stats = {
  registryItems: 0,
  checkedPages: 0,
  blockedByRobots: 0,
  noindexPages: 0,
  missingRobotsMeta: 0,
  sitemapDirectives: 0,
  validSitemapDirectives: 0
};

const PUBLIC_HOSTS = new Set(['gnk-asg.hr', 'www.gnk-asg.hr']);
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

// Parse robots groups instead of treating every Disallow after User-agent:* as globally active.
// A new User-agent after rules starts a new group; repeated User-agent lines before rules share a group.
const groups = [];
let currentGroup = null;
for (const line of lines) {
  const idx = line.indexOf(':');
  if (idx < 0) continue;
  const key = line.slice(0, idx).trim().toLowerCase();
  const value = line.slice(idx + 1).trim();
  if (key === 'user-agent') {
    if (!currentGroup || currentGroup.rules.length > 0) {
      currentGroup = { agents: [], rules: [] };
      groups.push(currentGroup);
    }
    currentGroup.agents.push(value.toLowerCase());
    continue;
  }
  if (currentGroup && (key === 'allow' || key === 'disallow')) {
    currentGroup.rules.push({ type: key, value });
  }
}

const starGroups = groups.filter(group => group.agents.includes('*'));
if (!starGroups.length) warnings.push('robots.txt has no explicit User-agent:* group');
const starRules = starGroups.flatMap(group => group.rules).filter(rule => rule.value);
const disallows = starRules.filter(rule => rule.type === 'disallow').map(rule => rule.value);
const allows = starRules.filter(rule => rule.type === 'allow').map(rule => rule.value);

// Robots precedence: select the longest matching rule; Allow wins equal-length ties.
const normalizeRulePath = value => {
  const raw = String(value || '').split(/[?#]/, 1)[0];
  return raw || '';
};
const ruleMatchesRoute = (route, value) => {
  const rule = normalizeRulePath(value);
  if (!rule) return false;
  if (rule === '/') return true;
  return route.startsWith(rule);
};
const effectiveRobotsRule = route => {
  const matches = starRules
    .map(rule => ({ ...rule, normalized: normalizeRulePath(rule.value) }))
    .filter(rule => rule.normalized && ruleMatchesRoute(route, rule.value))
    .sort((a, b) => b.normalized.length - a.normalized.length || (a.type === 'allow' ? -1 : 1));
  return matches[0] || null;
};

// Sitemap directives must be stable, public HTTPS URLs without credentials, query strings or fragments.
const sitemapDirectives = lines
  .map(line => {
    const idx = line.indexOf(':');
    if (idx < 0) return null;
    const key = line.slice(0, idx).trim().toLowerCase();
    if (key !== 'sitemap') return null;
    return line.slice(idx + 1).trim();
  })
  .filter(Boolean);
stats.sitemapDirectives = sitemapDirectives.length;
if (!sitemapDirectives.length) failures.push('robots.txt declares no Sitemap directive');
const seenSitemaps = new Set();
for (const raw of sitemapDirectives) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    failures.push(`robots.txt Sitemap directive is not an absolute URL: ${raw}`);
    continue;
  }
  const normalized = url.href;
  if (seenSitemaps.has(normalized)) {
    failures.push(`robots.txt duplicates Sitemap directive: ${raw}`);
    continue;
  }
  seenSitemaps.add(normalized);
  if (url.protocol !== 'https:') failures.push(`robots.txt Sitemap must use HTTPS: ${raw}`);
  if (url.username || url.password) failures.push(`robots.txt Sitemap must not contain credentials: ${raw}`);
  if (!PUBLIC_HOSTS.has(url.hostname.toLowerCase())) failures.push(`robots.txt Sitemap points outside canonical GNK ASG hosts: ${raw}`);
  if (url.search || url.hash) failures.push(`robots.txt Sitemap must not contain query/fragment: ${raw}`);
  if (!/\.xml$/i.test(url.pathname)) warnings.push(`robots.txt Sitemap does not end in .xml: ${raw}`);
  if (url.protocol === 'https:' && !url.username && !url.password && PUBLIC_HOSTS.has(url.hostname.toLowerCase()) && !url.search && !url.hash) {
    stats.validSitemapDirectives++;
  }
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
  const effectiveRule = effectiveRobotsRule(route);
  if (effectiveRule?.type === 'disallow') {
    stats.blockedByRobots++;
    failures.push(`${route}: blocked by effective User-agent:* Disallow: ${effectiveRule.value}`);
  }
}

const report = {
  version: 'GNK_ASG_ROBOTS_INDEXABILITY_PARITY_V2',
  scope: 'materialized editorial registry pages vs effective User-agent:* robots policy and canonical sitemap directives',
  ok: failures.length === 0,
  stats,
  disallows,
  allows,
  sitemapDirectives,
  failures,
  warnings
};
const out = path.join(ROOT, 'artifacts', 'robots-indexability-parity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
