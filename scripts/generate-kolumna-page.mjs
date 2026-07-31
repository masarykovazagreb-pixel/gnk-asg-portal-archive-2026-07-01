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

const PORTAL = resolve('apps/portal');
const KOLUMNE = resolve(PORTAL, 'data/kolumne.json');
const SITE = 'https://gnk-asg.hr';

const escH = (s) => String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

function stranicaHtml(k) {
  const putanja = `/gnk-aktual/kolumne/${k.slug}/`;
  const odlomci = (k.tekst || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escH(p)}</p>`)
    .join('\n      ');

  const slikaTag = k.slika
    ? `<img src="${escH(k.slika)}" alt="${escH(k.naslov)}" style="max-width:100%;border:3px solid #241C0E;margin-bottom:20px">`
    : '';

  return `<!doctype html><html lang="hr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escH(k.seo_naslov || k.naslov)} | AKTUAL MEDIA</title>
<meta name="description" content="${escH(k.meta_opis || '')}">
<meta name="keywords" content="${escH((k.kljucne_rijeci || []).join(', '))}">
<meta name="author" content="Nermin Sefić">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${SITE}${putanja}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escH(k.seo_naslov || k.naslov)}">
<meta property="og:description" content="${escH(k.meta_opis || '')}">
<meta property="og:url" content="${SITE}${putanja}">
<meta property="og:image" content="${SITE}${escH(k.slika || '/assets/gnk-asg-social-card.png')}">
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'NewsArticle',
  headline: k.naslov, description: k.meta_opis, url: SITE + putanja,
  author: { '@type': 'Person', name: 'Nermin Sefić' },
  publisher: { '@type': 'Organization', name: 'GNK ASG d.o.o.' },
  datePublished: k.objavljeno,
})}</script>
<style>
body{margin:0;background:#F0E6C4;color:#241C0E;font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:40px 20px}
h1{font-family:'Arial Black',Impact,sans-serif;font-size:2rem;line-height:1.1}
p{font-size:1.05rem;line-height:1.65;margin:0 0 16px}
a.natrag{font-family:Arial,sans-serif;font-size:.8rem;font-weight:800;text-transform:uppercase;color:#C81E1E;text-decoration:none}
.oznaka{font-family:Arial,sans-serif;font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#C81E1E;display:block;margin-bottom:10px}
</style>
</head>
<body>
<a class="natrag" href="/gnk-aktual/">← Natrag na AKTUAL MEDIA</a>
<article>
  <span class="oznaka">Kolumna · Nermin Sefić</span>
  <h1>${escH(k.naslov)}</h1>
  ${slikaTag}
  ${odlomci}
</article>
</body></html>`;
}

function generirajZaSlug(k) {
  const putanja = resolve(PORTAL, 'gnk-aktual', 'kolumne', k.slug, 'index.html');
  mkdirSync(dirname(putanja), { recursive: true });
  writeFileSync(putanja, stranicaHtml(k), 'utf8');
  console.log(`Generirano: apps/portal/gnk-aktual/kolumne/${k.slug}/index.html`);
}

const kolumneDoc = JSON.parse(readFileSync(KOLUMNE, 'utf8'));
const argSlug = (() => { const i = process.argv.indexOf('--slug'); return i > -1 ? process.argv[i + 1] : null; })();
const sve = process.argv.includes('--sve');

if (sve) {
  kolumneDoc.items.forEach(generirajZaSlug);
} else if (argSlug) {
  const k = kolumneDoc.items.find((x) => x.slug === argSlug);
  if (!k) { console.error('Nema kolumne sa slugom:', argSlug); process.exit(1); }
  generirajZaSlug(k);
} else {
  console.error('Koristi --slug <slug> ili --sve');
  process.exit(1);
}
