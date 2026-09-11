#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const failures = [];
const pages = [];
const stats = { publicPagesChecked: 0, pagesWithSocialImage: 0, complete: 0 };

const extractMeta = (html, attr, name) => {
  const a = new RegExp(`<meta\\s+[^>]*${attr}=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i');
  const b = new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*${attr}=["']${name}["'][^>]*>`, 'i');
  return html.match(a)?.[1]?.trim() || html.match(b)?.[1]?.trim() || '';
};
const prop = (html, name) => extractMeta(html, 'property', name);
const named = (html, name) => extractMeta(html, 'name', name);
const routeFromFile = file => {
  const rel = path.relative(PORTAL, path.dirname(file)).split(path.sep).join('/');
  return rel ? `/${rel}/` : '/';
};
const isIndexable = html => !/(?:^|[,\s])noindex(?:$|[,\s])/i.test(named(html, 'robots'));
const walk = dir => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['assets', 'data'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name === 'index.html') {
      const html = fs.readFileSync(full, 'utf8');
      if (isIndexable(html)) pages.push({ route: routeFromFile(full), html });
    }
  }
};

if (!fs.existsSync(PORTAL)) process.exit(1);
walk(PORTAL);
stats.publicPagesChecked = pages.length;

for (const { route, html } of pages) {
  const ogImage = prop(html, 'og:image');
  const twitterImage = named(html, 'twitter:image');
  if (!ogImage && !twitterImage) continue;
  stats.pagesWithSocialImage++;

  const required = {
    'og:image': ogImage,
    'og:image:alt': prop(html, 'og:image:alt'),
    'og:image:width': prop(html, 'og:image:width'),
    'og:image:height': prop(html, 'og:image:height'),
    'og:image:type': prop(html, 'og:image:type'),
    'twitter:card': named(html, 'twitter:card'),
    'twitter:image': twitterImage,
    'twitter:image:alt': named(html, 'twitter:image:alt')
  };
  for (const [key, value] of Object.entries(required)) {
    if (!value) failures.push(`${route}: missing ${key}`);
  }
  if (ogImage && twitterImage && ogImage !== twitterImage) failures.push(`${route}: og:image and twitter:image differ`);
  const width = Number(required['og:image:width']);
  const height = Number(required['og:image:height']);
  if (required['og:image:width'] && (!Number.isInteger(width) || width <= 0)) failures.push(`${route}: invalid og:image:width`);
  if (required['og:image:height'] && (!Number.isInteger(height) || height <= 0)) failures.push(`${route}: invalid og:image:height`);
  if (required['og:image:type'] && !/^image\/(?:jpeg|png|webp|gif|avif)$/i.test(required['og:image:type'])) failures.push(`${route}: unsupported og:image:type ${required['og:image:type']}`);
  if (required['twitter:card'] && !/^(summary|summary_large_image)$/i.test(required['twitter:card'])) failures.push(`${route}: unsupported twitter:card ${required['twitter:card']}`);

  const routeFailures = failures.filter(x => x.startsWith(`${route}:`));
  if (!routeFailures.length) stats.complete++;
}

const report = {
  version: 'GNK_ASG_SOCIAL_IMAGE_METADATA_COMPLETENESS_V1',
  scope: 'ALL_PUBLIC_INDEXABLE_INDEX_HTML_PAGES_WITH_SOCIAL_IMAGE',
  ok: failures.length === 0,
  stats,
  failures
};
const out = path.join(ROOT, 'artifacts', 'social-image-metadata-completeness');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
