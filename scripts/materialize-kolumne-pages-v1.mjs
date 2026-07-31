#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT = process.cwd();
const PORTAL = resolve(ROOT, 'apps/portal');
const INPUT = resolve(PORTAL, 'data/kolumne.json');
const DEFAULT_OUTPUT = resolve(PORTAL, 'gnk-aktual/kolumne');
const SITE = 'https://gnk-asg.hr';
const WRITE = process.argv.includes('--write');
const outputArg = (() => {
  const i = process.argv.indexOf('--output');
  return i >= 0 ? process.argv[i + 1] : null;
})();
const OUTPUT = outputArg ? resolve(ROOT, outputArg) : DEFAULT_OUTPUT;

const fail = (message) => {
  console.error(`ERROR: ${message}`);
  process.exit(1);
};

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const paragraphs = (text = '') => String(text)
  .split(/\n\s*\n/)
  .map((part) => part.trim())
  .filter(Boolean)
  .map((part) => `<p>${esc(part).replaceAll('\n', '<br>')}</p>`)
  .join('\n');

const safeSlug = (value) => {
  const slug = String(value || '').trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) fail(`Neispravan slug kolumne: ${slug}`);
  return slug;
};

const render = (item) => {
  const slug = safeSlug(item.slug);
  const title = item.seo_naslov || item.naslov;
  const description = item.meta_opis || item.naslov;
  const canonicalPath = `/gnk-aktual/kolumne/${slug}/`;
  const canonical = `${SITE}${canonicalPath}`;
  const image = item.slika || `${SITE}/assets/gnk-asg-logo.png`;
  const published = item.objavljeno || new Date(0).toISOString();
  const body = paragraphs(item.tekst);
  if (body.length < 200) fail(`${slug}: tekst kolumne je prekratak za samostalnu stranicu`);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished: published,
    dateModified: published,
    mainEntityOfPage: canonical,
    image: [image],
    author: { '@type': 'Person', name: 'Nermin Sefić' },
    publisher: {
      '@type': 'Organization',
      name: 'GNK ASG d.o.o.',
      logo: { '@type': 'ImageObject', url: `${SITE}/assets/gnk-asg-logo.png` }
    }
  };

  return `<!doctype html>
<html lang="hr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="author" content="Nermin Sefić">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${esc(canonical)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:image" content="${esc(image)}">
  <meta property="article:author" content="Nermin Sefić">
  <meta property="article:published_time" content="${esc(published)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(image)}">
  <script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>
  <style>
    :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#050505;color:#f5f2e8;font-family:Arial,sans-serif;line-height:1.75}main{width:min(900px,calc(100% - 32px));margin:0 auto;padding:56px 0 80px}.eyebrow{color:#d6ae4a;letter-spacing:.14em;text-transform:uppercase;font-size:.78rem}h1{font-size:clamp(2rem,6vw,4.5rem);line-height:1.05;margin:.5rem 0 1rem}figure{margin:28px 0}img{display:block;width:100%;max-height:560px;object-fit:cover;border:1px solid rgba(214,174,74,.35)}article{font-size:1.08rem}a{color:#e4c46f}.meta{color:#bdb6a4}.back{display:inline-block;margin-top:36px}
  </style>
</head>
<body>
<main>
  <div class="eyebrow">GNK ASG · Kolumna</div>
  <h1>${esc(item.naslov || title)}</h1>
  <p class="meta">Autor: Nermin Sefić · Izdavač: GNK ASG d.o.o.</p>
  <figure><img src="${esc(image)}" alt="${esc(item.naslov || title)}" loading="eager"></figure>
  <article>${body}</article>
  <a class="back" href="/gnk-aktual/">Povratak na AKTUAL MEDIA</a>
</main>
</body>
</html>\n`;
};

if (!existsSync(INPUT)) fail(`Nedostaje ulazna datoteka: ${INPUT}`);
const doc = JSON.parse(readFileSync(INPUT, 'utf8'));
const items = Array.isArray(doc) ? doc : doc.items;
if (!Array.isArray(items) || items.length === 0) fail('kolumne.json nema nijednu kolumnu');

const seen = new Set();
const outputs = [];
for (const item of items) {
  const slug = safeSlug(item.slug);
  if (seen.has(slug)) fail(`Duplikat sluga: ${slug}`);
  seen.add(slug);
  const html = render(item);
  const file = resolve(OUTPUT, slug, 'index.html');
  outputs.push({ slug, file, bytes: Buffer.byteLength(html) });
  if (WRITE) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html, 'utf8');
  }
}

console.log(JSON.stringify({
  ok: true,
  mode: WRITE ? 'write' : 'validate-only',
  input: INPUT,
  output: OUTPUT,
  count: outputs.length,
  pages: outputs
}, null, 2));
