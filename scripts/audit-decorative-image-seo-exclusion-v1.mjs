import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const IMAGE_SITEMAP = path.join(PORTAL, 'image-sitemap.xml');
const failures = [];
const stats = { htmlFiles: 0, decorativeImages: 0, sitemapLeaks: 0, socialLeaks: 0, schemaLeaks: 0 };

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const p = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(p) : [p];
});
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'i'))?.[1]?.trim() ?? null;
const clean = value => String(value || '').split(/[?#]/)[0];
const sitemap = fs.existsSync(IMAGE_SITEMAP) ? fs.readFileSync(IMAGE_SITEMAP, 'utf8') : '';

for (const file of walk(PORTAL).filter(f => f.endsWith('.html'))) {
  stats.htmlFiles++;
  const rel = '/' + path.relative(PORTAL, file).replaceAll(path.sep, '/');
  const html = fs.readFileSync(file, 'utf8');
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
  const twitterImage = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
  const jsonLdBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join('\n');

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    if (attr(tag, 'alt') !== '') continue;
    stats.decorativeImages++;
    const src = attr(tag, 'src');
    if (!src) continue;
    const srcClean = clean(src);

    if (sitemap.includes(srcClean)) {
      stats.sitemapLeaks++;
      failures.push(`${rel}: decorative image must not be registered as an SEO image in image-sitemap.xml: ${src}`);
    }
    if (clean(ogImage) === srcClean || clean(twitterImage) === srcClean) {
      stats.socialLeaks++;
      failures.push(`${rel}: decorative image must not be promoted as OG/Twitter image: ${src}`);
    }
    if (jsonLdBlocks.includes(src) || jsonLdBlocks.includes(srcClean)) {
      stats.schemaLeaks++;
      failures.push(`${rel}: decorative image must not be promoted through JSON-LD/ImageObject references: ${src}`);
    }
  }
}

const report = {
  version: 'GNK_ASG_DECORATIVE_IMAGE_SEO_EXCLUSION_V1',
  scope: 'PUBLIC_HTML_ALT_EMPTY_IMAGES',
  semantics: 'DECORATIVE_IMAGES_ARE_NOT_SEO_ENTITIES',
  ok: failures.length === 0,
  stats,
  failures
};
const out = path.join(ROOT, 'artifacts', 'decorative-image-seo-exclusion');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
