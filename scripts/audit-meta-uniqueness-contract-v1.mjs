import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const failures = [];
const warnings = [];
const stats = { registryItems: 0, checkedPages: 0, duplicateTitles: 0, duplicateDescriptions: 0, missingTitles: 0, missingDescriptions: 0, missingH1: 0, titleEqualsH1: 0 };
const normalize = value => String(value || '').replace(/&amp;/gi, '&').replace(/&#39;/g, "'").replace(/&quot;/gi, '"').replace(/\s+/g, ' ').trim();
const extract = (html, regex) => normalize(html.match(regex)?.[1] || '');
const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const records = [];

if (!fs.existsSync(REGISTRY)) {
  console.error('Missing editorial registry');
  process.exit(1);
}
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const items = Array.isArray(registry.items) ? registry.items : [];
stats.registryItems = items.length;

for (const item of items) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const title = extract(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = extract(html, /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) || extract(html, /<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  const h1 = extract(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  stats.checkedPages++;
  if (!title) { stats.missingTitles++; failures.push(`${route}: missing <title>`); }
  if (!description) { stats.missingDescriptions++; failures.push(`${route}: missing meta description`); }
  if (!h1) { stats.missingH1++; failures.push(`${route}: missing visible H1`); }
  if (title && h1 && title.toLocaleLowerCase('hr') === h1.toLocaleLowerCase('hr')) stats.titleEqualsH1++;
  records.push({ route, title, description, h1 });
}

for (const [field, statKey] of [['title', 'duplicateTitles'], ['description', 'duplicateDescriptions']]) {
  const groups = new Map();
  for (const row of records) {
    const value = normalize(row[field]).toLocaleLowerCase('hr');
    if (!value) continue;
    const routes = groups.get(value) || [];
    routes.push(row.route);
    groups.set(value, routes);
  }
  for (const [value, routes] of groups) {
    if (routes.length < 2) continue;
    stats[statKey] += routes.length;
    failures.push(`duplicate ${field} across ${routes.join(', ')}: ${value}`);
  }
}

for (const row of records) {
  if (row.title && row.title.length < 18) warnings.push(`${row.route}: unusually short title (${row.title.length} chars)`);
  if (row.description && (row.description.length < 70 || row.description.length > 190)) warnings.push(`${row.route}: meta description length ${row.description.length} chars`);
}

const report = { version: 'GNK_ASG_META_UNIQUENESS_CONTRACT_V1', scope: 'materialized editorial registry pages', ok: failures.length === 0, stats, failures, warnings };
const out = path.join(ROOT, 'artifacts', 'meta-uniqueness-contract');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
