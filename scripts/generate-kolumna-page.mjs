#!/usr/bin/env node
/**
 * Legacy detail-page generator, restricted to already-published column records.
 * The canonical scheduled publisher is Content Factory; this utility never
 * creates pages for non-column records or drafts from the shared feed.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const PORTAL = resolve('apps/portal');
const KOLUMNE = resolve(PORTAL, 'data/kolumne.json');
const REGISTRY = resolve(PORTAL, 'data/editorial-registry.json');
const SITE = 'https://gnk-asg.hr';
const esc = (value) => String(value ?? '').replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[char]));
const jsonForHtml = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function toItems(source) {
  if (Array.isArray(source)) return source;
  if (source && Array.isArray(source.items)) return source.items;
  throw new Error('kolumne.json must be an array or an object with an items array.');
}
function columnRoutes(item) {
  const slug = item?.slug;
  if (!/^[a-z0-9-]+$/.test(slug || '')) return null;
  const hrPath = `/gnk-aktual/kolumne/${slug}/`;
  const enPath = `/en/gnk-aktual/columns/${slug}/`;
  const urlPath = item.url ? new URL(item.url, SITE).pathname : '';
  const suppliedPath = item.path || urlPath;
  if (item.path && urlPath && item.path !== urlPath) return null;
  if (suppliedPath !== hrPath) return null;
  return { hrPath, enPath };
}
function paragraphs(text) {
  return String(text || '').split(/\n\n+/).map((paragraph) => paragraph.trim()).filter(Boolean)
    .map((paragraph) => `<p>${esc(paragraph).replace(/\n/g, ' ')}</p>`).join('\n');
}
function pageHtml(item, language, routes) {
  const english = language === 'en';
  const route = english ? routes.enPath : routes.hrPath;
  const title = english ? (item.naslov_en || item.naslov) : item.naslov;
  const seoTitle = english ? (item.seo_naslov_en || item.seo_naslov || title) : (item.seo_naslov || title);
  const description = english ? (item.meta_opis_en || item.meta_opis || title) : (item.meta_opis || title);
  const body = english ? (item.tekst_en || '') : (item.tekst || '');
  if (!title || !body) throw new Error(`${item.slug}: published ${language} column needs a title and body.`);
  const image = String(item.slika || '');
  if (!image.startsWith('/assets/')) throw new Error(`${item.slug}: column image must be a first-party local /assets/ path.`);
  const alt = english ? (item.slika_alt_en || `Nermin Sefić — ${title}`) : (item.slika_alt || `Nermin Sefić — ${title}`);
  const canonical = `${SITE}${route}`;
  const published = item.objavljeno || '';
  const home = english ? 'Home' : 'Početna';
  const back = english ? '← Back to columns' : '← Natrag na kolumne';
  const languageLink = english ? 'Čitaj na hrvatskom →' : 'Read in English →';
  const languageLabel = english ? 'Column · AKTUAL MEDIA' : 'Kolumna · AKTUAL MEDIA';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'OpinionNewsArticle',
    headline: title,
    description,
    url: canonical,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    image: { '@type': 'ImageObject', url: `${SITE}${image}` },
    author: { '@type': 'Person', name: 'Nermin Sefić', url: `${SITE}/nermin-sefic/` },
    publisher: { '@type': 'Organization', name: 'GNK ASG d.o.o.', url: `${SITE}/` },
    datePublished: published,
    inLanguage: english ? 'en' : 'hr',
    isAccessibleForFree: true,
  };
  return `<!doctype html><html lang="${english ? 'en' : 'hr'}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(seoTitle)} | AKTUAL MEDIA</title><meta name="description" content="${esc(description)}"><meta name="author" content="Nermin Sefić"><meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${esc(canonical)}"><link rel="alternate" hreflang="hr" href="${SITE}${routes.hrPath}"><link rel="alternate" hreflang="en" href="${SITE}${routes.enPath}"><link rel="alternate" hreflang="x-default" href="${SITE}${routes.hrPath}">
<meta property="og:type" content="article"><meta property="og:locale" content="${english ? 'en_US' : 'hr_HR'}"><meta property="og:site_name" content="AKTUAL MEDIA | GNK ASG"><meta property="og:title" content="${esc(seoTitle)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${SITE}${esc(image)}"><meta property="og:image:alt" content="${esc(alt)}"><meta property="article:published_time" content="${esc(published)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(seoTitle)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${SITE}${esc(image)}"><meta name="twitter:image:alt" content="${esc(alt)}"><script type="application/ld+json">${jsonForHtml(schema)}</script>
<style>body{margin:0;background:#F0E6C4;color:#241C0E;font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:40px 20px}h1{font-family:'Arial Black',Impact,sans-serif;font-size:2rem;line-height:1.1}p{font-size:1.05rem;line-height:1.65;margin:0 0 16px}a{font-family:Arial,sans-serif;font-size:.8rem;font-weight:800;text-transform:uppercase;color:#C81E1E;text-decoration:none;display:inline-block;margin:0 0 8px}.eyebrow{font-family:Arial,sans-serif;font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#C81E1E}.cover{max-width:100%;height:auto;border:3px solid #241C0E;margin:0 0 20px}</style>
</head><body><a href="${english ? '/en/gnk-aktual/columns/' : '/gnk-aktual/kolumne/'}">${back}</a><br><a href="${english ? routes.hrPath : routes.enPath}">${languageLink}</a><nav aria-label="${english ? 'Breadcrumb' : 'Krušne mrvice'}"><a href="${english ? '/en/' : '/'}">${home}</a> › <a href="${english ? '/en/gnk-aktual/columns/' : '/gnk-aktual/kolumne/'}">${english ? 'Columns' : 'Kolumne'}</a></nav><article><p class="eyebrow">${languageLabel} · Nermin Sefić</p><h1>${esc(title)}</h1><img class="cover" src="${esc(image)}" alt="${esc(alt)}" width="1200" height="630" loading="eager" decoding="async">${paragraphs(body)}</article></body></html>`;
}

const source = JSON.parse(readFileSync(KOLUMNE, 'utf8'));
const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
const records = toItems(source);
const publishedPaths = new Set((registry.items || []).filter((item) => item?.type === 'kolumna' && item.status === 'published').map((item) => item.path));
const candidates = records.map((item) => ({ item, routes: columnRoutes(item) })).filter(({ item, routes }) => routes && publishedPaths.has(routes.hrPath));
const slugAt = process.argv.indexOf('--slug');
const slug = slugAt >= 0 ? process.argv[slugAt + 1] : null;
const all = process.argv.includes('--sve');
if (all === Boolean(slug)) {
  console.error('Use exactly one of --slug <slug> or --sve. Only already-published column routes are eligible.');
  process.exit(2);
}
const selected = slug ? candidates.filter(({ item }) => item.slug === slug) : candidates;
if (!selected.length) {
  console.error(slug ? `No published Croatian column with slug "${slug}" exists in the canonical registry.` : 'No already-published columns were found in kolumne.json.');
  process.exit(1);
}
for (const { item, routes } of selected) {
  const hrFile = resolve(PORTAL, routes.hrPath.replace(/^\/+|\/+$/g, ''), 'index.html');
  if (!publishedPaths.has(routes.hrPath)) throw new Error(`${routes.hrPath}: cannot generate an unpublished route.`);
  if (!existsSync(hrFile)) throw new Error(`${routes.hrPath}: registry says published but the page does not exist.`);
  // The English translation is generated only when the public English route is already registered.
  const enPublished = publishedPaths.has(routes.enPath);
  const targets = [[hrFile, pageHtml(item, 'hr', routes)]];
  if (enPublished && item.tekst_en) {
    const enFile = resolve(PORTAL, routes.enPath.replace(/^\/+|\/+$/g, ''), 'index.html');
    if (!existsSync(enFile)) throw new Error(`${routes.enPath}: registry says published but the page does not exist.`);
    targets.push([enFile, pageHtml(item, 'en', routes)]);
  }
  for (const [file, html] of targets) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html, 'utf8');
    console.log(`Generated published page: ${file}`);
  }
}
