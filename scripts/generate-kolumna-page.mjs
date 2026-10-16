#!/usr/bin/env node
/**
 * scripts/generate-kolumna-page.mjs
 *
 * Generira PRAVU staticku HTML stranicu za jednu kolumnu, na putu koji
 * editorial-registry.json vec obecava (/gnk-aktual/kolumne/<slug>/).
 *
 * Ovo rjesava DVA problema odjednom, istim potezom:
 *  1. 404 kad se otvori izravna poveznica na kolumnu
 *  2. blog-publish-v1.mjs ne moze poslati kolumnu na Blogger jer trazi
 *     bas ovakvu datoteku (vidi readArticle() u toj skripti - ocekuje
 *     og:title/description/keywords/og:image u <meta> i <p> odlomke
 *     unutar <article>)
 *
 * Pokretanje:
 *   node scripts/generate-kolumna-page.mjs --slug 08-cibona-prvak
 *   node scripts/generate-kolumna-page.mjs --sve      (regenerira sve iz kolumne.json)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const PORTAL = resolve('apps/portal');
const KOLUMNE = resolve(PORTAL, 'data/kolumne.json');
const SITE = 'https://gnk-asg.hr';

const escH = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

function stranicaHtml(k, jezik) {
  const en = jezik === 'en';
  const putanja = en ? `/en/gnk-aktual/columns/${k.slug}/` : `/gnk-aktual/kolumne/${k.slug}/`;
  const naslov = en ? (k.naslov_en || k.naslov) : k.naslov;
  const seoNaslov = en ? (k.seo_naslov_en || k.seo_naslov) : k.seo_naslov;
  const metaOpis = en ? (k.meta_opis_en || k.meta_opis) : k.meta_opis;
  const tekst = en ? (k.tekst_en || k.tekst) : k.tekst;
  const altPutanja = en ? `/gnk-aktual/kolumne/${k.slug}/` : `/en/gnk-aktual/columns/${k.slug}/`;
  const altOznaka = en ? 'Čitaj na hrvatskom' : 'Read in English';
  const hasEnTranslation = Boolean(k.tekst_en && k.naslov_en && k.meta_opis_en);
  const showAlternate = en || hasEnTranslation;
  const hreflang = showAlternate ? `${hreflang}` : '';
  const languageLink = showAlternate ? `${languageLink}` : '';
  const natragOznaka = en ? '← Back to AKTUAL MEDIA' : '← Natrag na AKTUAL MEDIA';
  const natragPutanja = en ? '/en/gnk-aktual/' : '/gnk-aktual/';

  const odlomci = (tekst || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escH(p)}</p>`)
    .join('\n      ');

  const routeName = putanja.split('/').filter(Boolean).join('-').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/-+/g, '-').toLowerCase();
  const imagePath = `/assets/editorial/generated/${routeName}-${createHash('sha1').update(putanja).digest('hex').slice(0,8)}.webp`;
  const slikaTag = `<img class="article-cover" src="${imagePath}" alt="${escH(naslov)}" width="1200" height="630" style="max-width:100%;height:auto;border:3px solid #241C0E;margin-bottom:20px">`;
  const tags = (Array.isArray(k.hashtagovi) ? k.hashtagovi : []).map(t => String(t).replace(/^#/, '').trim()).filter(Boolean);
  const hashtagHtml = tags.length ? `<p class="article-hashtags">${tags.map(t => '#'+escH(t)).join(' ')}</p>` : '';

  return `<!doctype html><html lang="${en ? 'en' : 'hr'}"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escH(seoNaslov || naslov)} | AKTUAL MEDIA</title>
<meta name="description" content="${escH(metaOpis || '')}">
<meta name="keywords" content="${escH((k.kljucne_rijeci || []).join(', '))}">
<meta name="author" content="Nermin Sefić"><meta property="article:published_time" content="${escH(k.objavljeno)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${SITE}${putanja}">
<link rel="alternate" hreflang="${en ? 'hr' : 'en'}" href="${SITE}${altPutanja}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escH(seoNaslov || naslov)}">
<meta property="og:description" content="${escH(metaOpis || '')}">
<meta property="og:url" content="${SITE}${putanja}">
<meta property="og:image" content="${SITE}${imagePath}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${SITE}${imagePath}">
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'OpinionNewsArticle',
  headline: naslov, description: metaOpis, url: SITE + putanja,
  mainEntityOfPage: { '@type': 'WebPage', '@id': SITE + putanja },
  image: [SITE + imagePath],
  author: { '@type': 'Person', name: 'Nermin Sefić', url: SITE + '/nermin-sefic/' },
  publisher: { '@type': 'Organization', name: 'GNK ASG d.o.o.' },
  datePublished: k.objavljeno, inLanguage: en ? 'en' : 'hr',
})}</script>
<style>
body{margin:0;background:#F0E6C4;color:#241C0E;font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:40px 20px}
h1{font-family:'Arial Black',Impact,sans-serif;font-size:2rem;line-height:1.1}
p{font-size:1.05rem;line-height:1.65;margin:0 0 16px}
a.natrag,a.alt-jezik{font-family:Arial,sans-serif;font-size:.8rem;font-weight:800;text-transform:uppercase;color:#C81E1E;text-decoration:none;display:inline-block;margin-bottom:6px}
.oznaka{font-family:Arial,sans-serif;font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#C81E1E;display:block;margin-bottom:10px}
</style>
</head>
<body>
<a class="natrag" href="${natragPutanja}">${natragOznaka}</a><br>
<a class="alt-jezik" href="${altPutanja}">${altOznaka} →</a>
<article>
  <span class="oznaka">${en ? 'Column' : 'Kolumna'} · Nermin Sefić</span>
  <h1>${escH(naslov)}</h1>
  ${slikaTag}
  ${odlomci}
  ${hashtagHtml}
</article>
</body></html>`;
}

function generirajZaSlug(k) {
  const putanjaHr = resolve(PORTAL, 'gnk-aktual', 'kolumne', k.slug, 'index.html');
  if (existsSync(putanjaHr)) throw new Error('Refusing to overwrite an already published column: '+putanjaHr);
  mkdirSync(dirname(putanjaHr), { recursive: true });
  writeFileSync(putanjaHr, stranicaHtml(k, 'hr'), 'utf8');
  console.log(`Generirano: apps/portal/gnk-aktual/kolumne/${k.slug}/index.html`);

  if (k.tekst_en) {
    const putanjaEn = resolve(PORTAL, 'en', 'gnk-aktual', 'columns', k.slug, 'index.html');
    if (existsSync(putanjaEn)) throw new Error('Refusing to overwrite an already published EN column: '+putanjaEn);
    mkdirSync(dirname(putanjaEn), { recursive: true });
    writeFileSync(putanjaEn, stranicaHtml(k, 'en'), 'utf8');
    console.log(`Generirano: apps/portal/en/gnk-aktual/columns/${k.slug}/index.html`);
  }
}

const kolumneDoc = JSON.parse(readFileSync(KOLUMNE, 'utf8'));
const argSlug = (() => { const i = process.argv.indexOf('--slug'); return i > -1 ? process.argv[i + 1] : null; })();
const sve = process.argv.includes('--sve');
const items = Array.isArray(kolumneDoc) ? kolumneDoc : kolumneDoc.items;
if (!Array.isArray(items)) throw new Error('kolumne.json must be an array or an items array');

if (sve) {
  items.forEach(generirajZaSlug);
} else if (argSlug) {
  const k = items.find((x) => x.slug === argSlug);
  if (!k) { console.error('Nema kolumne sa slugom:', argSlug); process.exit(1); }
  generirajZaSlug(k);
} else {
  console.error('Koristi --slug <slug> ili --sve');
  process.exit(1);
}
