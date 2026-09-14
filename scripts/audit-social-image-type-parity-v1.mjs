import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const pages = [];

const walk = dir => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['data'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name === 'index.html') pages.push(full);
  }
};

const routeFor = file => {
  const rel = path.relative(PORTAL, path.dirname(file)).split(path.sep).join('/');
  return rel ? `/${rel}/` : '/';
};

const meta = (html, key, attr = 'property') => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const a = new RegExp(`<meta[^>]+${attr}=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
  const b = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${escaped}["'][^>]*>`, 'i');
  return html.match(a)?.[1] || html.match(b)?.[1] || '';
};

const mimeByExt = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.svg', 'image/svg+xml'],
  ['.avif', 'image/avif']
]);

walk(PORTAL);
let socialImages = 0;

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const route = routeFor(file);
  const ogImage = meta(html, 'og:image');
  const ogType = meta(html, 'og:image:type');
  const twitterImage = meta(html, 'twitter:image', 'name');

  if (!ogImage && !twitterImage) continue;
  socialImages += 1;

  if (!ogImage) {
    failures.push(`${route}: twitter:image exists without og:image`);
    continue;
  }
  if (!ogType) {
    failures.push(`${route}: og:image:type is missing`);
    continue;
  }

  let pathname = '';
  try { pathname = new URL(ogImage, 'https://gnk-asg.hr').pathname; }
  catch {
    failures.push(`${route}: invalid og:image URL (${ogImage})`);
    continue;
  }

  const ext = path.extname(pathname).toLowerCase();
  const expected = mimeByExt.get(ext);
  if (!expected) {
    failures.push(`${route}: unsupported social image extension ${ext || '(none)'}`);
    continue;
  }
  if (ogType.toLowerCase() !== expected) {
    failures.push(`${route}: og:image:type ${ogType} does not match ${expected} for ${ogImage}`);
  }
  if (twitterImage && twitterImage !== ogImage) {
    failures.push(`${route}: twitter:image must match og:image`);
  }
}

const report = {
  version: 'GNK_ASG_SOCIAL_IMAGE_TYPE_PARITY_V1',
  scope: 'PUBLIC_INDEX_HTML_SOCIAL_IMAGES',
  ok: failures.length === 0,
  stats: { pagesChecked: pages.length, pagesWithSocialImages: socialImages },
  failures
};

const out = path.join(ROOT, 'artifacts', 'social-image-type-parity');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
