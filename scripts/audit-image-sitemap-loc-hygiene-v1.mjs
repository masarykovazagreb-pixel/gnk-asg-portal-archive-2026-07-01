import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const candidates = [path.join(PORTAL, 'image-sitemap.xml'), path.join(PORTAL, 'sitemap-images.xml')];
const file = candidates.find(fs.existsSync);
const failures = [];
const stats = { imageLocs: 0 };

if (!file) {
  failures.push('image sitemap not found at expected public paths');
} else {
  const xml = fs.readFileSync(file, 'utf8');
  const locs = [...xml.matchAll(/<image:loc>\s*([^<]+?)\s*<\/image:loc>/gi)].map(m => m[1].trim());
  stats.imageLocs = locs.length;
  if (!locs.length) failures.push('image sitemap contains no image:loc entries');
  for (const loc of locs) {
    let u;
    try { u = new URL(loc); } catch { failures.push(`image:loc is not an absolute URL: ${loc}`); continue; }
    if (u.protocol !== 'https:') failures.push(`image:loc must use https: ${loc}`);
    if (u.search) failures.push(`image:loc must not contain query parameters: ${loc}`);
    if (u.hash) failures.push(`image:loc must not contain fragment: ${loc}`);
    if (u.username || u.password) failures.push(`image:loc must not contain credentials: ${loc}`);
    if (u.hostname.replace(/^www\./, '') !== 'gnk-asg.hr') failures.push(`image:loc host outside gnk-asg.hr: ${loc}`);
    if (/\s/.test(loc)) failures.push(`image:loc contains whitespace: ${loc}`);
  }
}

const report = { version: 'GNK_ASG_IMAGE_SITEMAP_LOC_HYGIENE_V1', ok: failures.length === 0, stats, failures };
const out = path.join(ROOT, 'artifacts', 'image-sitemap-loc-hygiene');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
