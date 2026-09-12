import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const HOSTS = new Set(['gnk-asg.hr','www.gnk-asg.hr']);
const sitemapFiles = fs.readdirSync(PORTAL).filter(n => /sitemap.*\.xml$/i.test(n));
const failures = [];
let checkedCount = 0;

const routeFile = pathname => {
  let p = (pathname || '/').replace(/\/+/g, '/');
  if (p === '/') return path.join(PORTAL, 'index.html');
  if (p.endsWith('/')) return path.join(PORTAL, p.replace(/^\/+|\/+$/g, ''), 'index.html');
  const ext = path.extname(p);
  return ext ? path.join(PORTAL, p.replace(/^\//, '')) : path.join(PORTAL, p.replace(/^\/+|\/+$/g, ''), 'index.html');
};

for (const name of sitemapFiles) {
  const xml = fs.readFileSync(path.join(PORTAL, name), 'utf8');
  for (const m of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) {
    let u;
    try { u = new URL(m[1].trim(), 'https://gnk-asg.hr'); } catch { failures.push(`${name}: invalid loc ${m[1].trim()}`); continue; }
    if (!HOSTS.has(u.hostname.toLowerCase())) continue;
    checkedCount += 1;
    const target = routeFile(u.pathname);
    if (!fs.existsSync(target)) failures.push(`${name}: local loc does not materialize: ${u.pathname}`);
  }
}

const report = {version:'GNK_ASG_SITEMAP_TARGET_MATERIALIZATION_V1', ok:failures.length===0, sitemapFilesChecked:sitemapFiles.length, checkedCount, failures};
const out = path.join(ROOT,'artifacts','sitemap-target-materialization');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(failures.length) process.exit(1);
