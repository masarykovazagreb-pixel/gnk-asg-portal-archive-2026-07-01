import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const temp = mkdtempSync(join(tmpdir(), 'gnk-gallery-seo-'));
const generator = resolve('scripts/build_gallery_standalone_pages.py');
const featuredIds = [
  'rast-prihoda-gold-navy-01',
  'globalna-mreza-emerald-growth-02',
  'digitalna-transformacija-azure-tech-03',
  'inovacija-i-ai-teal-stability-06',
  'kiberneticka-sigurnost-steel-infrastructure-08',
  'sportska-tehnologija-rose-momentum-07',
];
const items = featuredIds.map((id, index) => ({
  id,
  title: `Test gallery topic ${index + 1}`,
  description: `A descriptive gallery test item ${index + 1}.`,
  src: `/assets/gallery/test-${index + 1}.webp`,
  alt: `Original illustration of gallery test topic ${index + 1}`,
}));
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map((match) => [match[1].toLowerCase(), match[3].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")]));
const meta = (html, property) => {
  const tag = html.match(new RegExp(`<meta\\b(?=[^>]*\\b(?:property|name)=["']${property}["'])[^>]*>`, 'i'))?.[0];
  return tag ? attrs(tag).content : null;
};
const canonical = (html) => {
  const tag = html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i)?.[0];
  return tag ? attrs(tag).href : null;
};
const schemaFrom = (html) => {
  const raw = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  assert(raw, 'JSON-LD structured data is required');
  return JSON.parse(raw);
};
const visibleText = (value) => value.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const luminance = (hex) => {
  const channels = hex.slice(1).match(/../g).map((value) => parseInt(value, 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};
const contrast = (first, second) => {
  const [light, dark] = [luminance(first), luminance(second)].sort((left, right) => right - left);
  return (light + 0.05) / (dark + 0.05);
};
const read = (route) => readFileSync(join(temp, 'apps', 'portal', route, 'index.html'), 'utf8');

try {
  const manifestPath = join(temp, 'apps', 'portal', 'data', 'visual_gallery.json');
  mkdirSync(join(temp, 'apps', 'portal', 'data'), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify({ items }, null, 2)}\n`);
  mkdirSync(join(temp,'apps/portal/assets/editorial/generated'),{recursive:true});
  writeFileSync(join(temp,'apps/portal/assets/editorial/generated/topic.webp'),'fixture');
  writeFileSync(join(temp,'apps/portal/data/editorial-registry.json'),JSON.stringify({items:[
    {path:'/komentari/topic/',title:'Original topic',description:'Original topic cover',image:'https://gnk-asg.hr/assets/editorial/generated/topic.webp',imageAlt:'Topic cover'},
    {path:'/komentari/external/',title:'External photo',image:'https://external.example/photo.jpg'}
  ]}));
  mkdirSync(join(temp,'apps/portal/galerija/legacy'),{recursive:true});
  writeFileSync(join(temp,'apps/portal/galerija/legacy/index.html'),'<h1>Legacy</h1>');
  for(const file of ['sitemap.xml','image-sitemap.xml'])writeFileSync(join(temp,'apps/portal',file),'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://gnk-asg.hr/keep-existing/</loc></url></urlset>');
  const result = spawnSync('python3', [generator], { cwd: temp, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const galleryIndex=read('galerija');
  assert.match(galleryIndex,/Original topic/);
  assert.match(galleryIndex,/\/galerija\/legacy\//,'keep established routes outside the manifest');
  assert.doesNotMatch(galleryIndex,/External photo/,'do not import external images');
  const generatedId=galleryIndex.match(/\/galerija\/(editorial-[a-f0-9]{16})\//)?.[1];
  assert(generatedId);
  const generated=read(`galerija/${generatedId}`);
  assert.match(generated,/href="\/komentari\/topic\/"/);
  assert.equal(meta(generated,'og:image:height'),'630');
  for(const file of ['sitemap.xml','image-sitemap.xml']) {
    const xml=readFileSync(join(temp,'apps/portal',file),'utf8');
    assert.match(xml,/https:\/\/gnk-asg.hr\/keep-existing\//,'preserve other publishers URLs');
    assert(xml.includes(`https://gnk-asg.hr/galerija/${generatedId}/`));
  }
  const again=spawnSync('python3',[generator],{cwd:temp,encoding:'utf8'});
  assert.equal(again.status,0,again.stderr);
  const sitemap=readFileSync(join(temp,'apps/portal/sitemap.xml'),'utf8');
  assert.equal(sitemap.split(`https://gnk-asg.hr/galerija/${generatedId}/`).length-1,1,'idempotent gallery sitemap');

  for (const item of items) {
    for (const locale of ['hr', 'en']) {
      const base = locale === 'en' ? 'en/visual-index' : 'visual-index';
      const html = read(`${base}/${item.id}`);
      const url = `https://gnk-asg.hr/${base}/${item.id}/`;
      assert.equal(canonical(html), url, `${locale} canonical must match the actual detail route`);
      assert.equal(meta(html, 'og:url'), url, `${locale} Open Graph URL must match canonical`);
      assert.equal(meta(html, 'og:title'), `${item.title} | GNK ASG`);
      assert.equal(meta(html, 'og:description'), item.description);
      assert.equal(meta(html, 'og:image'), `https://gnk-asg.hr${item.src}`);
      assert.equal(meta(html, 'og:image:alt'), item.alt);
      assert.equal(meta(html, 'twitter:image:alt'), item.alt);
      assert.match(html, /<meta\s+name="editor"\s+content="Nermin Sefić">/);
      assert.doesNotMatch(html, /<meta\b[^>]*\bname=["']author["']/i, 'editor credit must not be emitted as an author byline');
      assert.match(html, new RegExp(`<html lang="${locale}">`));
      const image = html.match(/<img\b[^>]*>/i)?.[0];
      assert(image, 'gallery detail needs a visible image');
      assert.equal(attrs(image).alt, item.alt, 'every gallery image needs meaningful alt text');
      const graph = schemaFrom(html)['@graph'];
      assert.equal(graph.filter((node) => node['@type'] === 'WebPage').length, 1);
      assert.equal(graph.filter((node) => node['@type'] === 'ImageObject').length, 1);
      assert.equal(graph.filter((node) => node['@type'] === 'WebSite').length, 1);
      const webpage = graph.find((node) => node['@type'] === 'WebPage');
      assert.equal(webpage.url, url);
      assert.equal(webpage.publisher?.['@type'], 'Organization');
      assert.equal(webpage.publisher?.name, 'GNK ASG d.o.o.');
      assert.equal(webpage.editor?.name, 'Nermin Sefić');
      assert.equal(webpage.author, undefined);
      const website = graph.find((node) => node['@type'] === 'WebSite');
      assert.equal(website.name, 'GNK ASG');
    }
    const galleryHtml = read(`galerija/${item.id}`);
    const galleryUrl = `https://gnk-asg.hr/galerija/${item.id}/`;
    assert.equal(canonical(galleryHtml), galleryUrl);
    assert.equal(meta(galleryHtml, 'og:url'), galleryUrl);
  }

  const indexHtml = readFileSync(join(temp, 'apps', 'portal', 'galerija', 'index.html'), 'utf8');
  const indexCanonical = canonical(indexHtml);
  assert.equal(indexCanonical, 'https://gnk-asg.hr/galerija/');
  assert.equal(meta(indexHtml, 'og:url'), indexCanonical);
  assert.equal(meta(indexHtml, 'og:image'), 'https://gnk-asg.hr/assets/seo-gallery/gnk-asg-ai-asistent.jpg');
  assert.match(indexHtml, /<meta\s+name="editor"\s+content="Nermin Sefić">/);
  assert.doesNotMatch(indexHtml, /<meta\b[^>]*\bname=["']author["']/i);
  assert.match(indexHtml, /prefers-reduced-motion:reduce/);
  assert.match(indexHtml, /a:focus-visible/);
  assert.match(indexHtml, /@media\(max-width:800px\)/);
  assert.match(indexHtml, /@media\(max-width:520px\)/);
  assert(contrast('#e8edf3', '#071426') >= 4.5, 'gallery body text contrast must meet WCAG AA');
  assert(contrast('#e0bd69', '#071426') >= 4.5, 'gallery link contrast must meet WCAG AA');
  assert(contrast('#d7e1eb', '#122a43') >= 4.5, 'gallery note contrast must meet WCAG AA');
  const indexImages = [...indexHtml.matchAll(/<img\b[^>]*>/gi)].map((match) => attrs(match[0]));
  assert(indexImages.length >= 6);
  assert(indexImages.every((image) => image.alt?.trim()), 'gallery index images need descriptive alt text');
  for (const link of indexHtml.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) {
    const opening = link[0].slice(0, link[0].indexOf('>') + 1);
    const attributes = attrs(opening);
    const imageNames = [...link[1].matchAll(/<img\b[^>]*>/gi)].map((image) => attrs(image[0]).alt || '').join(' ');
    assert(attributes['aria-label'] || attributes.title || visibleText(link[1]) || imageNames, 'gallery links need an accessible name for keyboard and assistive-technology users');
  }
  const indexSchema = schemaFrom(indexHtml)['@graph'];
  const gallery = indexSchema.find((node) => node['@type'] === 'ImageGallery');
  const webpage = indexSchema.find((node) => node['@type'] === 'WebPage');
  assert.equal(gallery.url, indexCanonical);
  assert.equal(webpage.url, indexCanonical);
  assert.equal(webpage.publisher?.name, 'GNK ASG d.o.o.');
  assert.equal(webpage.editor?.name, 'Nermin Sefić');
  assert.equal(webpage.author, undefined);
  console.log('Standalone gallery canonical, Open Graph, schema, alt text and publisher/editor contract: PASS');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
