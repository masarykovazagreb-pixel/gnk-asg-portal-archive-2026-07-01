import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const stats = { pages: 0, alternates: 0 };

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
  const tags = [...html.matchAll(/<link\b[^>]*\brel=["']alternate["'][^>]*>/gi)].map(m => m[0]);
  for (const tag of tags) {
    const hreflang = tag.match(/\bhreflang=["']([^"']+)["']/i)?.[1];
    if (!hreflang) continue;
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    stats.alternates++;
    if (!href) { failures.push(`${route}: hreflang ${hreflang} missing href`); continue; }
    let u;
    try { u = new URL(href); } catch { failures.push(`${route}: hreflang ${hreflang} href is not absolute: ${href}`); continue; }
    if (u.protocol !== 'https:') failures.push(`${route}: hreflang ${hreflang} must use https: ${href}`);
    if (u.search) failures.push(`${route}: hreflang ${hreflang} must not contain query parameters: ${href}`);
    if (u.hash) failures.push(`${route}: hreflang ${hreflang} must not contain fragment: ${href}`);
    if (u.username || u.password) failures.push(`${route}: hreflang ${hreflang} must not contain credentials: ${href}`);
    if (u.hostname.replace(/^www\./, '') !== 'gnk-asg.hr') failures.push(`${route}: hreflang ${hreflang} host outside gnk-asg.hr: ${href}`);
  }
}

const report = { version: 'GNK_ASG_HREFLANG_URL_HYGIENE_V1', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'hreflang-url-hygiene');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
