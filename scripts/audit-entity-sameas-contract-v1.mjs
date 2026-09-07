import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const failures = [];
const warnings = [];
const stats = { pages: 0, entitySignals: 0, sameAsUrls: 0, invalidUrls: 0, duplicateUrls: 0 };
const fail = m => failures.push(m);
const listify = v => Array.isArray(v) ? v : (v == null ? [] : [v]);
const nodesFrom = v => Array.isArray(v?.['@graph']) ? v['@graph'] : [v];
const routeFile = route => path.join(PORTAL, route.replace(/^\/+|\/+$/g, ''), 'index.html');
const entityName = v => typeof v === 'string' ? v.trim() : String(v?.name || '').trim();

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
      for (const field of ['about', 'mentions']) {
        for (const entity of listify(node?.[field])) {
          if (!entity || typeof entity !== 'object' || !entity.sameAs) continue;
          stats.entitySignals++;
          const seen = new Set();
          for (const raw of listify(entity.sameAs)) {
            const value = String(raw || '').trim();
            stats.sameAsUrls++;
            let url;
            try { url = new URL(value); }
            catch { stats.invalidUrls++; fail(`${route}: ${field} entity ${entityName(entity) || '(unnamed)'} has invalid sameAs URL ${value || '(empty)'}`); continue; }
            if (url.protocol !== 'https:') {
              stats.invalidUrls++;
              fail(`${route}: ${field} entity ${entityName(entity) || '(unnamed)'} sameAs must use HTTPS: ${value}`);
            }
            const normalized = url.href.replace(/\/$/, '').toLowerCase();
            if (seen.has(normalized)) {
              stats.duplicateUrls++;
              fail(`${route}: ${field} entity ${entityName(entity) || '(unnamed)'} repeats sameAs URL ${value}`);
            }
            seen.add(normalized);
          }
        }
      }
    }
  }
}

const report = { version: 'GNK_ASG_ENTITY_SAMEAS_CONTRACT_V1', scope: 'about/mentions sameAs links on materialized editorial pages', ok: failures.length === 0, stats, failures, warnings };
const out = path.join(ROOT, 'artifacts', 'entity-sameas-contract');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
