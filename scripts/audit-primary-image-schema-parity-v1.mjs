import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const checked = [];

const isIndexable = html => !/(<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex)/i.test(html);
const routeFromFile = file => {
  const rel = path.relative(PORTAL, path.dirname(file)).split(path.sep).join('/');
  return rel ? `/${rel}/` : '/';
};
const walk = dir => {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    if (entry.name.startsWith('.') || ['data','assets','_headers'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name === 'index.html') {
      const html = fs.readFileSync(full, 'utf8');
      if (isIndexable(html)) inspect(routeFromFile(full), html);
    }
  }
};
const inspect = (route, html) => {
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || null;
  const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || null;
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  let primary = null;
  let imageObject = null;
  for (const raw of scripts) {
    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [parsed]);
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        if (node.primaryImageOfPage) primary = node.primaryImageOfPage;
        const type = node['@type'];
        if (type === 'ImageObject' || (Array.isArray(type) && type.includes('ImageObject'))) imageObject = node;
      }
    } catch {}
  }
  const primaryUrl = typeof primary === 'string' ? primary : primary?.url || primary?.contentUrl || null;
  const imageUrl = imageObject?.contentUrl || imageObject?.url || null;
  const candidate = primaryUrl || imageUrl;
  checked.push({route, og, twitter: tw, primaryImage: candidate});
  if (og && tw && og !== tw) failures.push(`${route}: og:image and twitter:image differ`);
  if (candidate && og && candidate !== og) failures.push(`${route}: structured primary image does not match og:image`);
  if (imageObject && imageObject.representativeOfPage !== true) failures.push(`${route}: ImageObject exists but representativeOfPage is not true`);
};
if (!fs.existsSync(PORTAL)) process.exit(1);
walk(PORTAL);
const report = {version:'GNK_ASG_PRIMARY_IMAGE_SCHEMA_PARITY_V1', ok: failures.length===0, stats:{pagesChecked:checked.length,pagesWithPrimaryImage:checked.filter(x=>x.primaryImage).length}, failures, checked};
const out = path.join(ROOT,'artifacts','primary-image-schema-parity');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'report.json'), JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if (failures.length) process.exit(1);
