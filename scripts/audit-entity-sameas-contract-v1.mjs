import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const ORIGIN = 'https://gnk-asg.hr';
const failures = [];
const warnings = [];
const stats = {
  pages: 0,
  entitySignals: 0,
  sameAsUrls: 0,
  invalidUrls: 0,
  duplicateUrls: 0,
  rootEntities: 0,
  nestedAuthorPublisherEntities: 0,
  identityUrls: 0,
  invalidIdentityUrls: 0
};
const fail = m => failures.push(m);
const listify = v => Array.isArray(v) ? v : (v == null ? [] : [v]);
const nodesFrom = v => Array.isArray(v?.['@graph']) ? v['@graph'] : [v];
const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const entityName = v => typeof v === 'string' ? v.trim() : String(v?.name || '').trim();
const ENTITY_TYPES = new Set(['Person', 'Organization', 'SportsOrganization']);

function validateIdentityUrl(route, label, raw) {
  const value = String(raw || '').trim();
  if (!value) return;
  stats.identityUrls++;
  let url;
  try { url = new URL(value, ORIGIN); }
  catch {
    stats.invalidIdentityUrls++;
    fail(`${route}: ${label} has invalid identity URL ${value}`);
    return;
  }
  if (url.protocol !== 'https:') {
    stats.invalidIdentityUrls++;
    fail(`${route}: ${label} identity URL must use HTTPS: ${value}`);
  }
  if (url.username || url.password) {
    stats.invalidIdentityUrls++;
    fail(`${route}: ${label} identity URL must not contain credentials: ${value}`);
  }
}

function validateEntity(route, label, entity) {
  if (!entity || typeof entity !== 'object' || Array.isArray(entity)) return;
  stats.entitySignals++;
  const name = entityName(entity) || '(unnamed)';
  validateIdentityUrl(route, `${label} ${name} @id`, entity['@id']);
  validateIdentityUrl(route, `${label} ${name} url`, entity.url);

  if (!entity.sameAs) return;
  const seen = new Set();
  for (const raw of listify(entity.sameAs)) {
    const value = String(raw || '').trim();
    stats.sameAsUrls++;
    let url;
    try { url = new URL(value); }
    catch {
      stats.invalidUrls++;
      fail(`${route}: ${label} ${name} has invalid sameAs URL ${value || '(empty)'}`);
      continue;
    }
    if (url.protocol !== 'https:') {
      stats.invalidUrls++;
      fail(`${route}: ${label} ${name} sameAs must use HTTPS: ${value}`);
    }
    if (url.username || url.password) {
      stats.invalidUrls++;
      fail(`${route}: ${label} ${name} sameAs must not contain credentials: ${value}`);
    }
    const normalized = url.href.replace(/\/$/, '').toLowerCase();
    if (seen.has(normalized)) {
      stats.duplicateUrls++;
      fail(`${route}: ${label} ${name} repeats sameAs URL ${value}`);
    }
    seen.add(normalized);
  }
}

if (!fs.existsSync(REGISTRY)) process.exit(1);
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
for (const item of Array.isArray(registry.items) ? registry.items : []) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  stats.pages++;
  for (const [i, match] of [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)].entries()) {
    let parsed;
    try { parsed = JSON.parse(match[1]); }
    catch (error) { fail(`${route}: invalid JSON-LD block ${i + 1}: ${error.message}`); continue; }
    for (const node of nodesFrom(parsed)) {
      if (!node || typeof node !== 'object') continue;

      if (ENTITY_TYPES.has(node['@type'])) {
        stats.rootEntities++;
        validateEntity(route, `root ${node['@type']}`, node);
      }

      for (const field of ['author', 'publisher']) {
        for (const entity of listify(node[field])) {
          if (!entity || typeof entity !== 'object' || Array.isArray(entity)) continue;
          stats.nestedAuthorPublisherEntities++;
          validateEntity(route, field, entity);
        }
      }

      for (const field of ['about', 'mentions']) {
        for (const entity of listify(node[field])) validateEntity(route, `${field} entity`, entity);
      }
    }
  }
}

const report = {
  version: 'GNK_ASG_ENTITY_SAMEAS_CONTRACT_V2',
  scope: 'root Person/Organization, author/publisher and about/mentions identity + sameAs URL integrity on materialized editorial pages',
  ok: failures.length === 0,
  stats,
  failures,
  warnings
};
const out = path.join(ROOT, 'artifacts', 'entity-sameas-contract');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
