import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const stats = { pages: 0, robotsTags: 0, googlebotTags: 0, conflicts: 0, malformed: 0 };
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(ent => {
  const p = path.join(dir, ent.name);
  if (ent.isDirectory()) return walk(p);
  return ent.isFile() && ent.name === 'index.html' ? [p] : [];
});
const routeOf = file => '/' + path.relative(PORTAL, path.dirname(file)).split(path.sep).filter(Boolean).join('/') + (path.dirname(file) === PORTAL ? '' : '/');
const valuesFor = (html, name) => {
  const out = [];
  const re = /<meta\s+[^>]*>/gi;
  for (const tag of html.match(re) || []) {
    const n = tag.match(/\bname=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (n !== name) continue;
    const content = tag.match(/\bcontent=["']([^"']*)["']/i)?.[1] ?? '';
    out.push(content);
  }
  return out;
};
const parse = value => value.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
const contradiction = directives => {
  const s = new Set(directives);
  return (s.has('index') && s.has('noindex')) || (s.has('follow') && s.has('nofollow')) || (s.has('archive') && s.has('noarchive')) || (s.has('snippet') && s.has('nosnippet'));
};
for (const file of walk(PORTAL)) {
  const html = fs.readFileSync(file, 'utf8');
  const route = routeOf(file);
  stats.pages++;
  for (const agent of ['robots','googlebot']) {
    const vals = valuesFor(html, agent);
    stats[agent === 'robots' ? 'robotsTags' : 'googlebotTags'] += vals.length;
    if (vals.some(v => !v.trim())) {
      stats.malformed++;
      failures.push(`${route}: empty ${agent} meta content`);
    }
    const directives = vals.flatMap(parse);
    if (contradiction(directives)) {
      stats.conflicts++;
      failures.push(`${route}: contradictory ${agent} directives: ${[...new Set(directives)].join(', ')}`);
    }
    if (vals.length > 1) {
      const normalized = vals.map(v => [...new Set(parse(v))].sort().join(',')).filter(Boolean);
      if (new Set(normalized).size > 1) {
        stats.conflicts++;
        failures.push(`${route}: multiple non-equivalent ${agent} meta tags`);
      }
    }
  }
}
const report = { version: 'GNK_ASG_META_ROBOTS_DIRECTIVE_COHERENCE_V1', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'meta-robots-directive-coherence');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
