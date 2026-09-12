import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const stats = { pages: 0, canonicals: 0 };

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(ent => {
  const p = path.join(dir, ent.name);
  return ent.isDirectory() ? walk(p) : (ent.isFile() && ent.name === 'index.html' ? [p] : []);
});
const routeOf = file => {
  const dir = path.relative(PORTAL, path.dirname(file)).split(path.sep).filter(Boolean).join('/');
  return dir ? `/${dir}/` : '/';
};

for (const file of walk(PORTAL)) {
  stats.pages++;
  const html = fs.readFileSync(file, 'utf8');
  const route = routeOf(file);
  const matches = [...html.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>|<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/gi)];
  if (matches.length !== 1) {
    failures.push(`${route}: expected exactly one canonical, found ${matches.length}`);
    continue;
  }
  stats.canonicals++;
  const href = matches[0][1] || matches[0][2] || '';
  let u;
  try { u = new URL(href); } catch { failures.push(`${route}: canonical is not an absolute URL: ${href}`); continue; }
  if (u.protocol !== 'https:') failures.push(`${route}: canonical must use https: ${href}`);
  if (u.search) failures.push(`${route}: canonical must not contain query parameters: ${href}`);
  if (u.hash) failures.push(`${route}: canonical must not contain fragment: ${href}`);
  if (u.username || u.password) failures.push(`${route}: canonical must not contain credentials: ${href}`);
  if (u.hostname.replace(/^www\./, '') !== 'gnk-asg.hr') failures.push(`${route}: canonical host outside gnk-asg.hr: ${href}`);
}

const report = { version: 'GNK_ASG_CANONICAL_QUERY_FRAGMENT_HYGIENE_V1', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'canonical-query-fragment-hygiene');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
