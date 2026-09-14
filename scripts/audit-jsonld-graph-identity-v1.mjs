import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const stats = { pages: 0, jsonLdBlocks: 0, nodes: 0, parseErrors: 0, duplicateIdConflicts: 0, invalidIds: 0 };

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(ent => {
  const p = path.join(dir, ent.name);
  if (ent.isDirectory()) return walk(p);
  return ent.isFile() && ent.name === 'index.html' ? [p] : [];
});
const routeOf = file => '/' + path.relative(PORTAL, path.dirname(file)).split(path.sep).filter(Boolean).join('/') + (path.dirname(file) === PORTAL ? '' : '/');
const canonicalJson = value => JSON.stringify(value, Object.keys(value || {}).sort());
const flatten = value => {
  const out = [];
  const q = Array.isArray(value) ? [...value] : [value];
  while (q.length) {
    const node = q.shift();
    if (!node || typeof node !== 'object') continue;
    out.push(node);
    if (Array.isArray(node['@graph'])) q.push(...node['@graph']);
  }
  return out;
};

for (const file of walk(PORTAL)) {
  const html = fs.readFileSync(file, 'utf8');
  const route = routeOf(file);
  stats.pages++;
  const byId = new Map();
  const re = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    stats.jsonLdBlocks++;
    let parsed;
    try { parsed = JSON.parse(m[1]); }
    catch (err) {
      stats.parseErrors++;
      failures.push(`${route}: invalid JSON-LD: ${err.message}`);
      continue;
    }
    for (const node of flatten(parsed)) {
      stats.nodes++;
      if (!Object.prototype.hasOwnProperty.call(node, '@id')) continue;
      const id = node['@id'];
      if (typeof id !== 'string' || !id.trim()) {
        stats.invalidIds++;
        failures.push(`${route}: JSON-LD @id must be non-empty string`);
        continue;
      }
      if (/\s/.test(id)) {
        stats.invalidIds++;
        failures.push(`${route}: JSON-LD @id contains whitespace: ${id}`);
      }
      if (!/^(https?:\/\/|#)/i.test(id)) {
        stats.invalidIds++;
        failures.push(`${route}: JSON-LD @id must be absolute HTTP(S) URL or fragment identifier: ${id}`);
      }
      const material = { type: node['@type'] ?? null, url: node.url ?? null, name: node.name ?? null };
      const sig = canonicalJson(material);
      if (byId.has(id) && byId.get(id) !== sig) {
        stats.duplicateIdConflicts++;
        failures.push(`${route}: conflicting JSON-LD nodes reuse @id ${id}`);
      } else if (!byId.has(id)) byId.set(id, sig);
    }
  }
}

const report = { version: 'GNK_ASG_JSONLD_GRAPH_IDENTITY_V1', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'jsonld-graph-identity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
