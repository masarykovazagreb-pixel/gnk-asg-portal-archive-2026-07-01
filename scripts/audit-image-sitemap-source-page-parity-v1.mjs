import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const FILE = path.join(PORTAL, 'image-sitemap.xml');
const ORIGIN = 'https://gnk-asg.hr';
const failures = [];
const records = [];

const decode = s => String(s || '').replace(/&amp;/g, '&').trim();
const localFromUrl = raw => {
  const u = new URL(decode(raw));
  if (u.origin !== ORIGIN) return null;
  const p = decodeURIComponent(u.pathname);
  return path.join(PORTAL, p.replace(/^\//, ''));
};
const pageFileFromUrl = raw => {
  const u = new URL(decode(raw));
  if (u.origin !== ORIGIN) return null;
  const p = decodeURIComponent(u.pathname);
  if (p.endsWith('/')) return path.join(PORTAL, p.replace(/^\//, ''), 'index.html');
  return path.join(PORTAL, p.replace(/^\//, ''));
};

if (!fs.existsSync(FILE)) {
  console.error(`Missing image sitemap: ${FILE}`);
  process.exit(1);
}
const xml = fs.readFileSync(FILE, 'utf8');
for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
  const body = block[1];
  const pageLoc = decode(body.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1]);
  if (!pageLoc) {
    failures.push('image-sitemap url block missing page <loc>');
    continue;
  }
  let pageFile;
  try { pageFile = pageFileFromUrl(pageLoc); } catch { failures.push(`invalid page URL: ${pageLoc}`); continue; }
  if (!pageFile) failures.push(`foreign page origin in image sitemap: ${pageLoc}`);
  else if (!fs.existsSync(pageFile)) failures.push(`image sitemap source page does not materialize locally: ${pageLoc}`);

  const imageLocs = [...body.matchAll(/<image:loc>([\s\S]*?)<\/image:loc>/gi)].map(m => decode(m[1]));
  if (!imageLocs.length) failures.push(`image sitemap source page has no image entries: ${pageLoc}`);
  const seen = new Set();
  for (const imageLoc of imageLocs) {
    if (seen.has(imageLoc)) failures.push(`duplicate image entry within source page ${pageLoc}: ${imageLoc}`);
    seen.add(imageLoc);
    let asset;
    try { asset = localFromUrl(imageLoc); } catch { failures.push(`invalid image URL for ${pageLoc}: ${imageLoc}`); continue; }
    if (!asset) failures.push(`foreign image origin for ${pageLoc}: ${imageLoc}`);
    else if (!fs.existsSync(asset)) failures.push(`image sitemap asset does not materialize locally: ${imageLoc}`);
    records.push({pageLoc, imageLoc, localAssetExists: Boolean(asset && fs.existsSync(asset))});
  }
}

const report = {version:'GNK_ASG_IMAGE_SITEMAP_SOURCE_PAGE_PARITY_V1', ok:failures.length===0, sourcePages:new Set(records.map(x=>x.pageLoc)).size, imageEntries:records.length, failures, records};
const out = path.join(ROOT, 'artifacts', 'image-sitemap-source-page-parity');
fs.mkdirSync(out, {recursive:true});
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
