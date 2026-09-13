import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const ORIGIN = 'https://gnk-asg.hr';
const files = ['sitemap.xml','editorial-sitemap.xml','image-sitemap.xml','visual-sitemap.xml','news-sitemap.xml'].filter(f => fs.existsSync(path.join(PORTAL,f)));
const failures = [];
const checked = [];

const decode = s => String(s || '').replace(/&amp;/g,'&').trim();
for (const name of files) {
  const xml = fs.readFileSync(path.join(PORTAL,name),'utf8');
  const locs = [...xml.matchAll(/<(?:image:)?loc>([\s\S]*?)<\/(?:image:)?loc>/gi)].map(m=>decode(m[1]));
  const seen = new Set();
  for (const raw of locs) {
    let u;
    try { u = new URL(raw); } catch { failures.push(`${name}: invalid URL ${raw}`); continue; }
    if (u.origin !== ORIGIN) failures.push(`${name}: non-canonical origin ${raw}`);
    if (u.protocol !== 'https:') failures.push(`${name}: non-HTTPS URL ${raw}`);
    if (u.hash) failures.push(`${name}: fragment not allowed in sitemap URL ${raw}`);
    if (name !== 'image-sitemap.xml' && u.search) failures.push(`${name}: query string not allowed for page sitemap URL ${raw}`);
    const key = `${name}|${u.href}`;
    if (seen.has(u.href)) failures.push(`${name}: duplicate URL ${u.href}`);
    seen.add(u.href);
    checked.push({sitemap:name,url:u.href});
  }
}
if (!files.length) failures.push('no sitemap files found for hygiene audit');
const report = {version:'GNK_ASG_SITEMAP_URL_HYGIENE_V1',ok:failures.length===0,sitemaps:files,urlsChecked:checked.length,failures,checked};
const out = path.join(ROOT,'artifacts','sitemap-url-hygiene');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if (failures.length) process.exit(1);
