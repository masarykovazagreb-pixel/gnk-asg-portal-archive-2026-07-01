#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { isProtectedEditorialRoute as protectedPath } from './lib/editorial-route-protection-v1.mjs';

const PORTAL = 'apps/portal';
const REGISTRY_PATH = `${PORTAL}/data/editorial-registry.json`;
const MANIFEST_PATH = `${PORTAL}/data/editorial-image-manifest.json`;
const SITE = 'https://gnk-asg.hr';
const WRITE = process.argv.includes('--write');
const PAGES = [
  { file: `${PORTAL}/objave/index.html`, type: 'objava', language: 'hr', prefix: '/objave/', title: 'Sve objavljene objave' },
  { file: `${PORTAL}/komentari/index.html`, type: 'komentar', language: 'hr', prefix: '/komentari/', title: 'Svi objavljeni komentari' },
  { file: `${PORTAL}/analize/index.html`, type: 'analiza', language: 'hr', prefix: '/analize/', title: 'Sve objavljene analize' },
  { file: `${PORTAL}/en/publications/index.html`, type: 'objava', language: 'en', prefix: '/en/publications/', title: 'All published publications' },
  { file: `${PORTAL}/en/commentary/index.html`, type: 'komentar', language: 'en', prefix: '/en/commentary/', title: 'All published commentary' },
  { file: `${PORTAL}/en/analyses/index.html`, type: 'analiza', language: 'en', prefix: '/en/analyses/', title: 'All published analyses' },
];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const unescapeHtml = (input = '') => {
  let value = String(input);
  for (let pass = 0; pass < 6; pass++) {
    const decoded = value.replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'")
      .replace(/&#(\d+);/g, (entity, digits) => { const point = Number(digits); return Number.isSafeInteger(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity; })
      .replace(/&#x([0-9a-f]+);/gi, (entity, hex) => { const point = parseInt(hex, 16); return Number.isSafeInteger(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity; });
    if (decoded === value) break;
    value = decoded;
  }
  return value;
};
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const attr = (tag, name) => tag.match(new RegExp(`\\b${escapeRegex(name)}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] || '';
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const typeLabel = (type, language) => ({
  objava: language === 'en' ? 'PUBLICATION' : 'OBJAVA',
  komentar: language === 'en' ? 'COMMENTARY' : 'KOMENTAR',
  analiza: language === 'en' ? 'ANALYSIS' : 'ANALIZA',
}[type] || 'AKTUAL MEDIA');
const action = (type, language) => ({
  objava: language === 'en' ? 'Open publication →' : 'Otvori objavu →',
  komentar: language === 'en' ? 'Open commentary →' : 'Otvori komentar →',
  analiza: language === 'en' ? 'Open analysis →' : 'Otvori analizu →',
}[type] || (language === 'en' ? 'Read →' : 'Pročitaj →'));
const formatDate = (value, language) => {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'hr-HR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(parsed);
};
const localImage = (url) => {
  if (!url) return '/assets/editorial/aktual-media-800.webp';
  try {
    const parsed = new URL(url, SITE);
    return parsed.origin === SITE ? parsed.pathname : url;
  } catch { return url; }
};
const card = (item, image, page) => {
  const date = formatDate(item.publishedAt || item.published_at, page.language);
  const author = item.author === 'Nermin Sefić' ? (page.language === 'en' ? 'Nermin Sefić' : 'Nermin Sefić') : item.author;
  const meta = [author, date].filter(Boolean).join(' · ');
  const description = item.description || (page.language === 'en' ? `Read the full ${page.type} by GNK ASG.` : `Pročitajte cijeli tekst rubrike ${page.type}.`);
  return `<article class="editorial-card" data-editorial-route="${esc(item.path)}"><img src="${esc(image.image)}" width="1200" height="630" alt="${esc(image.alt || item.title)}" loading="lazy" decoding="async"><p class="eyebrow">${typeLabel(item.type, page.language)}${meta ? ` · ${esc(meta)}` : ''}</p><h2><a href="${esc(item.path)}">${esc(item.title)}</a></h2><p>${esc(description)}</p><a href="${esc(item.path)}">${action(item.type, page.language)}</a></article>`;
};
const pageMetas = (html, page) => {
  const existingTitle = [...html.matchAll(/<meta\b[^>]*property=["']og:title["'][^>]*>/gi)].map((match) => attr(match[0], 'content'))[0] || page.title;
  const description = [...html.matchAll(/<meta\b[^>]*name=["']description["'][^>]*>/gi)].map((match) => attr(match[0], 'content'))[0] || '';
  const image = [...html.matchAll(/<meta\b[^>]*property=["']og:image["'][^>]*>/gi)].map((match) => attr(match[0], 'content'))[0] || `${SITE}/assets/gnk-asg-social-card.png`;
  return { title: unescapeHtml(existingTitle), description: unescapeHtml(description), image: unescapeHtml(image) };
};
function updateHead(html, page, items, pageTitle, description, image, count) {
  const canonical = `${SITE}${page.prefix}`;
  const metaTag = (keyAttr, key, value) => `<meta ${keyAttr}="${esc(key)}" content="${esc(value)}">`;
  const upsertMeta = (source, keyAttr, key, value) => {
    let found = false;
    const next = source.replace(/<meta\b[^>]*>/gi, (tag) => {
      if (attr(tag, keyAttr).toLowerCase() !== key.toLowerCase()) return tag;
      if (found) return '';
      found = true;
      const content = new RegExp(`\\bcontent\\s*=\\s*(["'])(.*?)\\1`, 'i');
      return content.test(tag) ? tag.replace(content, `content="${esc(value)}"`) : tag.replace(/\s*\/?>$/, (end) => ` content="${esc(value)}"${end}`);
    });
    return found ? next : next.replace('</head>', `${metaTag(keyAttr, key, value)}</head>`);
  };
  const upsertLink = (source) => {
    let found = false;
    const next = source.replace(/<link\b[^>]*>/gi, (tag) => {
      if (!attr(tag, 'rel').toLowerCase().split(/\s+/).includes('canonical')) return tag;
      if (found) return '';
      found = true;
      const re = /\bhref\s*=\s*(["'])(.*?)\1/i;
      return re.test(tag) ? tag.replace(re, `href="${esc(canonical)}"`) : tag.replace(/\s*\/?>$/, (end) => ` href="${esc(canonical)}"${end}`);
    });
    return found ? next : next.replace('</head>', `<link rel="canonical" href="${esc(canonical)}"></head>`);
  };
  let out = html.replace(/<meta\b[^>]*name=["']keywords["'][^>]*>/gi, '');
  out = upsertLink(out);
  out = upsertMeta(out, 'name', 'robots', 'index,follow,max-image-preview:large,max-snippet:-1');
  out = upsertMeta(out, 'property', 'og:type', 'website');
  out = upsertMeta(out, 'property', 'og:title', pageTitle);
  out = upsertMeta(out, 'property', 'og:description', description);
  out = upsertMeta(out, 'property', 'og:url', canonical);
  out = upsertMeta(out, 'property', 'og:image', image);
  out = upsertMeta(out, 'property', 'og:image:alt', `${page.title} · GNK ASG / AKTUAL MEDIA`);
  out = upsertMeta(out, 'property', 'og:image:width', '1200');
  out = upsertMeta(out, 'property', 'og:image:height', '630');
  out = upsertMeta(out, 'property', 'og:image:type', image.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/png');
  out = upsertMeta(out, 'name', 'twitter:card', 'summary_large_image');
  out = upsertMeta(out, 'name', 'twitter:title', pageTitle);
  out = upsertMeta(out, 'name', 'twitter:description', description);
  out = upsertMeta(out, 'name', 'twitter:image', image);
  out = upsertMeta(out, 'name', 'twitter:image:alt', `${page.title} · GNK ASG / AKTUAL MEDIA`);

  let schemaFound = false;
  out = out.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (block, raw) => {
    let schema;
    try { schema = JSON.parse(raw); } catch { return block; }
    const visit = (value) => {
      if (Array.isArray(value)) return value.forEach(visit);
      if (!value || typeof value !== 'object') return;
      const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
      if (page.type === 'objava' && types.includes('CollectionPage')) {
        value.name = page.language === 'en' ? 'Publications · GNK ASG' : 'Objave · GNK ASG';
        value.description = page.language === 'en'
          ? 'GNK ASG corporate publications on transparency, cybersecurity, technology, capital and responsible governance.'
          : 'Objave i vijesti GNK ASG o financijama, upravljanju, tehnologiji, sigurnosti i odgovornom poslovanju.';
        for (const key of ['author', 'creator']) {
          const candidates = Array.isArray(value[key]) ? value[key] : [value[key]];
          if (candidates.some((candidate) => candidate && typeof candidate === 'object' && (Array.isArray(candidate['@type']) ? candidate['@type'] : [candidate['@type']]).includes('Person') && /nermin\s+sefi[cć]/i.test(candidate.name || ''))) delete value[key];
        }
      }
      if (types.includes('ItemList')) {
        schemaFound = true;
        value.name = page.title;
        value.numberOfItems = count;
        value.itemListOrder = 'https://schema.org/ItemListOrderDescending';
        value.itemListElement = items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE}${item.path}`, name: item.title, image: `${SITE}${item.cover.image}` }));
      }
      if (Array.isArray(value.keywords)) value.keywords = value.keywords.filter((word) => !/(?:nermin|sefi[cć])/i.test(String(word)));
      Object.values(value).forEach(visit);
    };
    visit(schema);
    return `<script type="application/ld+json">${safeJson(schema)}</script>`;
  });
  if (!schemaFound) {
    const schema = { '@context': 'https://schema.org', '@type': 'ItemList', '@id': `${canonical}#items`, name: page.title, numberOfItems: count, itemListOrder: 'https://schema.org/ItemListOrderDescending', itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE}${item.path}`, name: item.title, image: `${SITE}${item.cover.image}` })) };
    out = out.replace('</head>', `<script type="application/ld+json">${safeJson(schema)}</script></head>`);
  }
  if (page.type === 'objava') {
    out = out.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, `<title>${esc(pageTitle)}</title>`);
    out = out.replace(/<meta\b[^>]*name=["']author["'][^>]*>/gi, '');
    out = out.replace(/<meta\b[^>]*property=["']article:author["'][^>]*>/gi, '');
    out = out.replace(/<link\b[^>]*rel=["'][^"']*author[^"']*["'][^>]*>/gi, '');
  }
  return out;
}

if (!fs.existsSync(REGISTRY_PATH) || !fs.existsSync(MANIFEST_PATH)) throw new Error('Generate editorial registry and image manifest before building archive listings.');
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const imageByPath = new Map((manifest.items || []).map((entry) => [entry.path, entry]));
let changed = 0;
let cardCount = 0;
const reports = [];
for (const page of PAGES) {
  if (!fs.existsSync(page.file)) throw new Error(`Missing collection page: ${page.file}`);
  const items = (registry.items || []).filter((item) => item.type === page.type && item.language === page.language && item.status === 'published' && item.path.startsWith(page.prefix));
  if (!items.length) throw new Error(`${page.prefix}: no published editorial records.`);
  const prepared = items.map((item) => {
    const artwork = imageByPath.get(item.path) || {
      path: item.path, image: localImage(item.image), url: item.image,
      alt: item.imageAlt || item.title,
    };
    return { ...item, cover: artwork };
  });
  const cards = prepared.map((item) => card(item, item.cover, page)).join('\n');
  const countText = page.language === 'en' ? `${items.length} published items · all links are available in static HTML.` : `${items.length} objavljenih tekstova · sve poveznice dostupne su u statičkom HTML-u.`;
  const replacement = `<p class="editorial-listing-count" data-static-editorial-count="${items.length}">${esc(countText)}</p><section class="editorial-grid" aria-label="${esc(page.title)}" data-static-editorial-listing="v1">${cards}</section>`;
  let html = fs.readFileSync(page.file, 'utf8');
  const before = html;
  html = html.replace(/<!-- WORLD_TOPICS_20260810_START -->[\s\S]*?<!-- WORLD_TOPICS_20260810_END -->/gi, '');
  html = html.replace(/<p\b[^>]*class=["'][^"']*\beditorial-listing-count\b[^"']*["'][^>]*>[\s\S]*?<\/p>/gi, '');
  const grid = /<section\b[^>]*class=["'][^"']*editorial-grid[^"']*["'][^>]*>[\s\S]*?<\/section>/i;
  if (!grid.test(html)) throw new Error(`${page.file}: editorial card section not found.`);
  html = html.replace(grid, replacement);
  html = html.replace(/<script\b[^>]*src=["']\/assets\/editorial-latest-index-v1\.js[^"']*["'][^>]*><\/script>/gi, '');
  const oldMeta = pageMetas(before, page);
  const metaTitle = page.type === 'objava'
    ? (page.language === 'en' ? 'Publications · GNK ASG' : 'Objave · GNK ASG')
    : oldMeta.title || page.title;
  const metaDescription = page.type === 'objava'
    ? (page.language === 'en'
      ? 'GNK ASG corporate publications on transparency, cybersecurity, technology, capital and responsible governance.'
      : 'Objave i vijesti GNK ASG o financijama, upravljanju, tehnologiji, sigurnosti i odgovornom poslovanju.')
    : oldMeta.description || `${page.title} · GNK ASG / AKTUAL MEDIA.`;
  html = updateHead(html, page, prepared, metaTitle, metaDescription, oldMeta.image, items.length);
  if (page.type === 'analiza' && items.some((item) => item.author !== 'Nermin Sefić')) {
    html = html.replace(/<meta\b[^>]*name=["']author["'][^>]*>/gi, '').replace(/<link\b[^>]*rel=["']author["'][^>]*>/gi, '');
  }
  if (html !== before) {
    changed++;
    if (WRITE) fs.writeFileSync(page.file, html);
  }
  cardCount += items.length;
  reports.push({ path: page.file.replace(`${PORTAL}/`, '/'), type: page.type, language: page.language, cards: items.length });
}
console.log(JSON.stringify({ version: 'EDITORIAL_STATIC_ARCHIVE_LISTINGS_V1', write: WRITE, filesChanged: changed, totalCards: cardCount, pages: reports }, null, 2));
