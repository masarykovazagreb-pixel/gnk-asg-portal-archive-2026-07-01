#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const PORTAL = 'apps/portal';
const REGISTRY = `${PORTAL}/data/editorial-registry.json`;
const IMAGE_MANIFEST = `${PORTAL}/data/editorial-image-manifest.json`;
const PAGES = [
  { language: 'hr', path: `${PORTAL}/gnk-aktual/kolumne/index.html`, prefix: '/gnk-aktual/kolumne/' },
  { language: 'en', path: `${PORTAL}/en/gnk-aktual/columns/index.html`, prefix: '/en/gnk-aktual/columns/' },
];
const SITE = 'https://gnk-asg.hr';
const WRITE = process.argv.includes('--write');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const decode = (value = '') => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const attrValue = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] || '';
const formatDate = (value, language) => {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'hr-HR', { year: 'numeric', month: 'long', day: 'numeric' }).format(parsed);
};
const card = (item, image, language) => {
  const date = formatDate(item.publishedAt || item.published_at, language);
  const label = language === 'en' ? 'AKTUAL MEDIA · COLUMN' : 'AKTUAL MEDIA · KOLUMNA';
  const dateText = date ? `<time datetime="${esc(item.publishedAt || item.published_at)}">${esc(date)}</time>` : '';
  return `<article class="card"><a href="${esc(item.path)}"><img src="${esc(image.image)}" alt="${esc(image.alt)}" width="1200" height="630" loading="lazy" decoding="async"></a><div class="body"><span class="tag">${label}</span><h2><a href="${esc(item.path)}">${esc(item.title)}</a></h2><p class="summary">${esc(item.description || '')}</p><div class="meta">${dateText}${dateText ? ' · ' : ''}Nermin Sefić</div></div></article>`;
};

if (!fs.existsSync(REGISTRY) || !fs.existsSync(IMAGE_MANIFEST)) throw new Error('Generate the canonical editorial registry and cover-image manifest first.');
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(IMAGE_MANIFEST, 'utf8'));
const imageByPath = new Map((manifest.items || []).map((image) => [image.path, image]));
let changed = 0;
let total = 0;
for (const page of PAGES) {
  if (!fs.existsSync(page.path)) throw new Error(`Missing columns index: ${page.path}`);
  let html = fs.readFileSync(page.path, 'utf8');
  const before = html;
  const items = (registry.items || []).filter((item) => item.type === 'kolumna' && item.language === page.language && item.status === 'published' && item.path.startsWith(page.prefix));
  if (!items.length) throw new Error(`No published ${page.language} columns found for ${page.prefix}`);
  const entries = items.map((item) => {
    const image = imageByPath.get(item.path);
    if (!image) throw new Error(`${item.path}: missing generated cover image`);
    return { item, image };
  });
  const cards = entries.map(({ item, image }) => card(item, image, page.language)).join('\n');
  const sectionMarkup = `<h2 id="columns-heading" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0">${page.language === 'en' ? 'All published columns' : 'Sve objavljene kolumne'}</h2><section id="columns" class="grid" aria-labelledby="columns-heading">${cards}</section>`;
  html = html.replace(/<h2\b[^>]*id=["']columns-heading["'][^>]*>[\s\S]*?<\/h2>/gi, '');
  const sectionPattern = /<section\b[^>]*id=["']columns["'][^>]*>[\s\S]*?<\/section>/i;
  if (!sectionPattern.test(html)) throw new Error(`${page.path}: missing #columns collection slot`);
  html = html.replace(sectionPattern, sectionMarkup);
  // An old async renderer replaced the server HTML with a short fetch result.
  html = html.replace(/\s*<script>\s*\(function\(\)\s*\{[\s\S]*?\}\)\(\);\s*<\/script>/i, '');

  const language = page.language;
  const canonical = `${SITE}${page.prefix}`;
  const pageTitle = language === 'en' ? 'Nermin Sefić — Columnist | AKTUAL MEDIA' : 'Nermin Sefić — kolumnist | AKTUAL MEDIA';
  const listNode = {
    '@type': 'ItemList',
    '@id': `${canonical}#columns`,
    name: language === 'en' ? 'All published columns by Nermin Sefić' : 'Sve objavljene kolumne Nermina Sefića',
    numberOfItems: entries.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: entries.map(({ item, image }, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE}${item.path}`, name: item.title, image: `${SITE}${image.image}` })),
  };
  let jsonLdChanged = false;
  html = html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (block, raw) => {
    let data;
    try { data = JSON.parse(raw); } catch { return block; }
    let found = false;
    const visit = (value) => {
      if (Array.isArray(value)) return value.forEach(visit);
      if (!value || typeof value !== 'object') return;
      const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
      if (types.includes('ItemList') && /columns|kolumn/i.test(`${value['@id'] || ''} ${value.name || ''}`)) {
        Object.assign(value, listNode);
        found = true;
      }
      Object.values(value).forEach(visit);
    };
    visit(data);
    if (found) {
      jsonLdChanged = true;
      return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
    }
    return block;
  });
  if (!jsonLdChanged) html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...listNode })}</script></head>`);

  const ogAlt = language === 'en' ? 'Nermin Sefić, AKTUAL MEDIA columnist' : 'Nermin Sefić, kolumnist AKTUAL MEDIA';
  const meta = (keyAttr, key, value) => `<meta ${keyAttr}="${esc(key)}" content="${esc(value)}">`;
  if (!/<meta\b[^>]*property=["']og:image:alt["']/i.test(html)) html = html.replace('</head>', `${meta('property','og:image:alt',ogAlt)}</head>`);
  if (!/<meta\b[^>]*name=["']twitter:image:alt["']/i.test(html)) html = html.replace('</head>', `${meta('name','twitter:image:alt',ogAlt)}</head>`);
  if (!/<meta\b[^>]*name=["']robots["']/i.test(html)) html = html.replace('</head>', `${meta('name','robots','index,follow,max-image-preview:large,max-snippet:-1')}</head>`);
  // Keep the collection index useful even with JavaScript disabled.
  const headEnd = html.indexOf('</head>');
  const mainEnd = html.indexOf('</main>');
  if (mainEnd < 0 || headEnd < 0) throw new Error(`${page.path}: malformed static page shell`);
  if (html !== before) {
    changed++;
    if (WRITE) fs.writeFileSync(page.path, html);
  }
  total += entries.length;
  console.log(`${language}: ${entries.length} server-rendered column cards${WRITE ? '' : ' (dry run)'}`);
}
console.log(JSON.stringify({ version: 'AKTUAL_COLUMNS_STATIC_INDEX_V1', items: total, filesChanged: changed, write: WRITE, pageTitle: PAGES.map((page) => page.path) }, null, 2));
