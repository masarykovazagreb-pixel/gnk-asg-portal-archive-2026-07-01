import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const checked = [];
const HOSTS = new Set(['gnk-asg.hr', 'www.gnk-asg.hr']);

const routeFile = pathname => {
  let p = pathname || '/';
  p = p.replace(/\/+/g, '/');
  if (p === '/') return path.join(PORTAL, 'index.html');
  if (p.endsWith('/')) return path.join(PORTAL, p.replace(/^\/+|\/+$/g, ''), 'index.html');
  const ext = path.extname(p);
  return ext ? path.join(PORTAL, p.replace(/^\//, '')) : path.join(PORTAL, p.replace(/^\/+|\/+$/g, ''), 'index.html');
};

const walk = dir => {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (entry.name.startsWith('.') || ['data', 'assets'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!entry.isFile() || entry.name !== 'index.html') continue;
    const html = fs.readFileSync(full, 'utf8');
    const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1]
      || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1];
    if (!canonical) continue;
    let u;
    try { u = new URL(canonical, 'https://gnk-asg.hr'); } catch { failures.push(`${path.relative(PORTAL, full)}: invalid canonical URL ${canonical}`); continue; }
    if (!HOSTS.has(u.hostname.toLowerCase())) continue;
    const target = routeFile(u.pathname);
    checked.push({source:path.relative(PORTAL, full), canonical:u.href, target:path.relative(PORTAL, target)});
    if (!fs.existsSync(target)) failures.push(`${path.relative(PORTAL, full)}: local canonical target does not materialize: ${u.pathname}`);
  }
};

walk(PORTAL);
const report = {version:'GNK_ASG_CANONICAL_TARGET_MATERIALIZATION_V1', ok:failures.length===0, checkedCount:checked.length, failures, checked};
const out = path.join(ROOT, 'artifacts', 'canonical-target-materialization');
fs.mkdirSync(out, {recursive:true});
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2)+'\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
