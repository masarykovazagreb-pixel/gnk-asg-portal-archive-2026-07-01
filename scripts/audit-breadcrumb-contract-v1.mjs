import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const ORIGIN = 'https://gnk-asg.hr';
const failures = [];
const warnings = [];
const stats = { registryItems: 0, checkedPages: 0, breadcrumbPages: 0, missingBreadcrumbs: 0, canonicalMismatches: 0, positionErrors: 0, foreignItems: 0 };
const fail = m => failures.push(m);
const warn = m => warnings.push(m);
const extract = (html, regex) => html.match(regex)?.[1]?.trim() || '';
const canonical = html => extract(html, /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i) || extract(html, /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const nodesFrom = value => Array.isArray(value?.['@graph']) ? value['@graph'] : [value];

if (!fs.existsSync(REGISTRY)) process.exit(1);
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const items = Array.isArray(registry.items) ? registry.items : [];
stats.registryItems = items.length;

for (const item of items) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  stats.checkedPages++;
  const pageCanonical = canonical(html) || `${ORIGIN}${route}`;
  const blocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
  const breadcrumbNodes = [];
  for (const [i, block] of blocks.entries()) {
    try {
      const parsed = JSON.parse(block[1]);
      for (const node of nodesFrom(parsed)) if (node?.['@type'] === 'BreadcrumbList') breadcrumbNodes.push(node);
    } catch (error) {
      fail(`${route}: invalid JSON-LD block ${i + 1}: ${error.message}`);
    }
  }
  if (!breadcrumbNodes.length) {
    stats.missingBreadcrumbs++;
    fail(`${route}: missing BreadcrumbList structured data`);
    continue;
  }
  if (breadcrumbNodes.length > 1) warn(`${route}: multiple BreadcrumbList nodes found`);
  stats.breadcrumbPages++;
  const list = breadcrumbNodes[0]?.itemListElement;
  if (!Array.isArray(list) || list.length < 2) {
    fail(`${route}: BreadcrumbList must contain at least two ListItem entries`);
    continue;
  }
  for (let i = 0; i < list.length; i++) {
    const entry = list[i] || {};
    if (entry['@type'] !== 'ListItem') fail(`${route}: breadcrumb entry ${i + 1} is not ListItem`);
    if (Number(entry.position) !== i + 1) {
      stats.positionErrors++;
      fail(`${route}: breadcrumb position ${entry.position ?? '(missing)'} must equal ${i + 1}`);
    }
    const target = typeof entry.item === 'string' ? entry.item : entry.item?.['@id'] || entry.item?.url || '';
    if (!target) fail(`${route}: breadcrumb entry ${i + 1} has no item URL`);
    else {
      try {
        const u = new URL(target, ORIGIN);
        if (u.origin !== ORIGIN) {
          stats.foreignItems++;
          fail(`${route}: breadcrumb entry ${i + 1} points outside GNK ASG origin: ${target}`);
        }
      } catch {
        fail(`${route}: breadcrumb entry ${i + 1} has invalid URL: ${target}`);
      }
    }
    if (!String(entry.name || '').trim()) fail(`${route}: breadcrumb entry ${i + 1} has no name`);
  }
  const firstTarget = typeof list[0]?.item === 'string' ? list[0].item : list[0]?.item?.['@id'] || list[0]?.item?.url || '';
  try {
    if (new URL(firstTarget, ORIGIN).href !== `${ORIGIN}/`) fail(`${route}: first breadcrumb item must resolve to ${ORIGIN}/`);
  } catch {}
  const last = list[list.length - 1] || {};
  const lastTarget = typeof last.item === 'string' ? last.item : last.item?.['@id'] || last.item?.url || '';
  try {
    if (new URL(lastTarget, ORIGIN).href !== new URL(pageCanonical, ORIGIN).href) {
      stats.canonicalMismatches++;
      fail(`${route}: final breadcrumb item must equal canonical URL`);
    }
  } catch {
    stats.canonicalMismatches++;
    fail(`${route}: cannot compare final breadcrumb item with canonical URL`);
  }
}

const report = { version: 'GNK_ASG_BREADCRUMB_CONTRACT_V1', scope: 'materialized editorial registry pages', ok: failures.length === 0, stats, failures, warnings };
const out = path.join(ROOT, 'artifacts', 'breadcrumb-contract');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
