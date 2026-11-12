#!/usr/bin/env node
/**
 * GENERATOR: Aktual World — statičke stranice za 201 zemlju + 10 gradova
 *
 * Skripta generira statičke HTML stranice, RSS feedove i sitemap za sve
 * zemlje i gradove mreže. Izlaz je spreman za gnk-asg.hr/gnk-aktual/media/ i
 * gnk-asg.hr/gnk-aktual/grad/.
 *
 * Ulaz: data/world-countries-v1.json (generiran od scripts/generate-world-countries-v1.mjs)
 * Izlaz: site/  (spremno za deploy na Cloudflare Pages / GitHub Pages)
 *
 * Pokretanje:
 *   node scripts/build-aktual-world-v1.mjs
 *   node scripts/build-aktual-world-v1.mjs --base https://gnk-asg.hr/gnk-aktual/
 *
 * Urednik: Nermin Sefić · GNK ASG · GNK DINAMO Ltd · AKTUAL MEDIA
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { refreshTag } from '../apps/shared/refresh-tag-v1.mjs';
import { impressumBlock } from '../apps/shared/impressum-v1.mjs';
import { externalStationSection } from '../apps/shared/aktual-external-stations-v1.mjs';
import { countryNavigation, cityNavigation } from '../apps/shared/aktual-world-navigation-v1.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const DATA = join(ROOT, 'apps', 'portal', 'data', 'world-countries-v1.json');
const OUT = process.env.AKTUAL_WORLD_OUT ? resolve(process.env.AKTUAL_WORLD_OUT) : join(ROOT, 'site');
const baseIndex = process.argv.indexOf('--base');
const BASE = ((baseIndex >= 0 ? process.argv[baseIndex+1] : null) || process.env.AKTUAL_WORLD_BASE || 'https://gnk-asg.hr/gnk-aktual/').replace(/\/+$/, '') + '/';

const data = JSON.parse(readFileSync(DATA, 'utf8'));
if (new Set(data.countries.map(c=>c.slug)).size !== data.countries.length || new Set(data.countries.map(c=>c.code)).size !== data.countries.length) throw new Error('Duplicate country slug/code; refusing overwrite.');
const CACHE_PATH = process.env.AKTUAL_WORLD_CACHE ? resolve(process.env.AKTUAL_WORLD_CACHE) : join(ROOT, 'apps', 'portal', 'data', 'aktual-world-headlines-v1.json');
const cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, 'utf8')) : null;
const maxCacheAgeMs = 24 * 60 * 60 * 1000;
const cacheFresh = cache && Number.isFinite(Date.parse(cache.updatedAt)) && Date.now() - Date.parse(cache.updatedAt) < maxCacheAgeMs && Date.now() >= Date.parse(cache.updatedAt);
function safeHeadlines(rows) {
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  return rows.filter(row => {
    if (!row || typeof row.title !== 'string' || !row.title.trim() || typeof row.source !== 'string' || !row.source.trim() || typeof row.url !== 'string') return false;
    const date = Date.parse(row.publishedAt), age = Date.now() - date;
    if (!Number.isFinite(date) || age < -3600000 || age > 72 * 3600000) return false;
    try {
      const url = new URL(row.url);
      if (url.protocol !== 'https:' || url.username || url.password || !url.hostname || seen.has(url.href)) return false;
      seen.add(url.href);
      return true;
    } catch { return false; }
  });
}
const currentHeadlines = slug => cacheFresh ? safeHeadlines(cache.countries?.[slug]) : [];
const cityHeadlines = slug => cacheFresh ? safeHeadlines(cache.cities?.[slug]) : [];
function sourceCheckSummary(kind, slug) {
  if (!cacheFresh || !Array.isArray(cache.sourceChecks)) return '';
  const checks = cache.sourceChecks.filter(x => x && x.kind === kind && x.scope === slug);
  if (!checks.length) return '';
  const failed = checks.filter(x => x.status === 'failed').length;
  const empty = checks.filter(x => x.status === 'no-eligible-headlines').length;
  const withHeadlines = checks.filter(x => x.status === 'headlines').length;
  return `Provjere pri zadnjem dohvatu: ${checks.length}; s prihvaćenim naslovima ${withHeadlines}, bez prihvatljivih naslova ${empty}, neuspješnih ${failed}. Ovo nije provjera svih konfiguriranih izvora.`;
}


// Helper: escape XML
const escXml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

// Helper: escape HTML
const escHtml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Generiraj HTML stranicu za zemlju
 */
function buildCountryPage(country) {
  const url = `${BASE}media/${country.slug}/`;
  const title = `AKTUAL MEDIA ${country.nameLocal} — izvori`;
  const description = `Katalog ${country.sources} informativnih izvora za ${country.nameLocal}. Objavljujemo poveznice na izvorne medije, ne njihove članke; naslovi se prikazuju nakon provjerene obnove.`;

  const sources = country.sourcesList.map(s => `<a href="${escHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escHtml(s.name)}</a>`).join(' · ');

  // JSON-LD: NewsMediaOrganization + Place + WebSite
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsMediaOrganization",
        "name": `Aktual Media ${country.nameLocal}`,
        "url": url,
        "editor": { "@type": "Person", "@id": "https://gnk-asg.hr/#nermin-sefic", "name": "Nermin Sefić", "url": "https://gnk-asg.hr/nermin-sefic/" },
        "publisher": { "@type": "Organization", "@id": "https://gnk-asg.hr/#gnk-asg", "name": "GNK ASG d.o.o.", "url": "https://gnk-asg.hr/" },
      },
      {
        "@type": "Place",
        "name": country.nameLocal,
        "alternateName": country.nameEn,
        "address": { "@type": "PostalAddress", "addressCountry": country.code },
      },
      {
        "@type": "CollectionPage",
        "name": title,
        "url": url,
        "inLanguage": "hr",
        "description": description,
      },
      {
        "@type": "WebSite",
        "@id": "https://gnk-asg.hr/#website",
        "name": "GNK ASG",
        "url": "https://gnk-asg.hr/",
        "inLanguage": ["hr", "en"],
        "publisher": { "@id": "https://gnk-asg.hr/#gnk-asg" },
      },
    ],
  };

  return `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/am-design-v1.css" data-am-design="v1">
<link rel="stylesheet" href="/assets/aktual-world-page-a11y-v1.css">
<title>${escHtml(title)}</title>
<meta name="description" content="${escHtml(description)}">
<meta name="keywords" content="Aktual Media ${country.nameEn}, ${country.nameLocal} vijesti, ${country.nameEn} news, ${country.region} news, GNK ASG, GNK Dinamo Ltd, Aktual Media">
<meta name="news_keywords" content="Aktual Media ${country.nameEn}, ${country.nameLocal}, GNK ASG, GNK Dinamo Ltd">
<meta name="hashtags" content="#NerminSefic #NerminSefić #GNKASG #GNKDinamoLtd #AktualMedia #AktualMedia${country.nameEn.replace(/\s|&/g, '')}">
<meta name="author" content="Nermin Sefić — GNK ASG / GNK Dinamo Ltd">
<meta name="editor" content="Nermin Sefić">
<meta name="publisher" content="AKTUAL MEDIA d.o.o.">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="hr" href="${url}">
<link rel="alternate" hreflang="x-default" href="${url}">
<link rel="alternate" type="application/rss+xml" title="Aktual Media ${country.nameLocal} RSS" href="${BASE}media/${country.slug}/feed.xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Aktual Media ${country.nameLocal}">
<meta property="og:title" content="${escHtml(title)}">
<meta property="og:description" content="${escHtml(description)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${country.language}">
<meta property="og:image" content="https://gnk-asg.hr/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escHtml(title)}">
<meta name="twitter:description" content="${escHtml(description)}">
<meta name="twitter:image" content="https://gnk-asg.hr/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp">
<meta name="geo.region" content="${country.code}">
<meta name="geo.country" content="${country.code}">
<meta name="geo.placename" content="${country.nameLocal}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#061019;color:#e8edf3;font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:#e0bd69;text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:1080px;margin:0 auto;padding:0 clamp(16px,4vw,40px)}
.top{background:#04101d;border-bottom:1px solid #1b3550;font:700 11px/1.4 system-ui;letter-spacing:.12em;text-transform:uppercase;color:#8fa3ba;padding:11px 0}
.top .wrap{display:flex;flex-wrap:wrap;gap:8px 16px;justify-content:space-between}
.head{padding:clamp(26px,5vw,52px) 0 20px;border-bottom:1px solid #1b3550}
.kicker{font:700 11px/1.4 system-ui;letter-spacing:.18em;text-transform:uppercase;color:#e0bd69;margin:0 0 8px}
.head h1{font:700 clamp(28px,5vw,46px)/1.06 Georgia,"Times New Roman",serif;margin:0 0 12px}
.lead{max-width:74ch;color:#b9c6d6;margin:0 0 16px}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin:18px 0 0;padding:0;list-style:none;font:700 10.5px/1 system-ui;letter-spacing:.06em;text-transform:uppercase}
.tags a{border:1px solid #25435f;border-radius:999px;padding:6px 10px;color:#cfdbe9}
.tags a:hover{border-color:#e0bd69;color:#e0bd69;text-decoration:none}
.section{padding:28px 0;border-bottom:1px solid #132c44}
.section h2{font:700 clamp(20px,2.6vw,28px)/1.2 Georgia,serif;margin:0 0 6px}
.section p{margin:0 0 14px;color:#b9c6d6;max-width:78ch}
.sources{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
.sources a{background:#0b1d31;border:1px solid #1e3b58;border-radius:8px;padding:8px 14px;font-size:14px}
.owner{background:#0a1a2c;border-left:3px solid #e0bd69;padding:14px 16px;margin:16px 0;color:#cfdbe9;font-size:15px}
.owner strong{color:#e0bd69}
.footer{padding:24px 0;border-top:1px solid #132c44;font-size:13px;color:#8fa3ba}
.footer a{color:#e0bd69}
</style>
</head>
<body>
<a class="skip" href="#worldContent">Preskoči na sadržaj</a>
<div class="top"><div class="wrap"><span>AKTUAL MEDIA · ${country.flag} ${country.nameLocal}</span><span><a href="${BASE}">← AKTUAL MEDIA</a></span></div></div>
<main id="worldContent" class="wrap" tabindex="-1">
  <div class="head">
    <p class="kicker">AKTUAL MEDIA · ${country.region.toUpperCase()}</p>
    <h1>${country.flag} Aktual Media ${country.nameLocal} · ${country.nameEn}</h1>
    <p class="lead">Pregled ${country.sources} navedenih izvora. Noviji naslovi prikazuju se samo nakon uspješne obnove; tekstovi ostaju kod izvornih izdavača. Urednik: Nermin Sefić.</p>
    <ul class="tags">
      <li><a href="https://gnk-asg.hr/nermin-sefic/">#NerminSefic</a></li>
      <li><a href="https://gnk-asg.hr/">#GNKASG</a></li>
      <li><a href="https://gnk-asg.hr/">#GNKDinamoLtd</a></li>
      <li><a href="${BASE}">#AktualMedia</a></li>
      <li><a href="${BASE}media/${country.slug}/feed.xml">RSS</a></li>
    </ul>
  </div>

${countryNavigation(country, data.cities, BASE)}${externalStationSection(country.slug)}  <div class="section">
    <h2>Izvori</h2>
    <p>${country.sources} konfiguriranih izvora za praćenje; dostupnost i prava korištenja provjeravaju se zasebno:</p>
    <div class="sources">${sources}</div>
  </div>

  <div class="section">
    <h2>Posljednje povezane vijesti</h2>
    <p>${currentHeadlines(country.slug).length ? `Naslovi vanjskih izvora osvježeni: ${escHtml(cache.updatedAt)}. Prikazuju se samo naslovi i poveznice.` : 'Trenutačno nema provjerenog svježeg skupa naslova. Slijedite izvorne medije za aktualne vijesti.'}</p>
    ${sourceCheckSummary('country', country.slug) ? `<p>${escHtml(sourceCheckSummary('country', country.slug))}</p>` : ''}
    <div class="sources">${currentHeadlines(country.slug).map(row=>`<a href="${escHtml(row.url)}" target="_blank" rel="noopener noreferrer nofollow">${escHtml(row.title)} · ${escHtml(row.source)} · <time datetime="${escHtml(new Date(row.publishedAt).toISOString())}">${escHtml(new Date(row.publishedAt).toISOString().slice(0, 10))} UTC</time></a>`).join('')}</div>
  </div>
  <div class="section">
    <h2>RSS feed</h2>
    <p>Pretplati se na RSS feed za ${country.nameLocal}:</p>
    <div class="sources"><a href="${BASE}media/${country.slug}/feed.xml">📡 RSS feed — ${country.nameLocal}</a></div>
  </div>

  <div class="owner">
    <strong>Vlasnik:</strong> Nermin Sefić · <strong>Grupacija:</strong> GNK DINAMO Ltd. · <strong>Izdavač:</strong> AKTUAL MEDIA d.o.o. · <strong>Nositelj:</strong> GNK ASG d.o.o.
    <br>#NerminSefic #NerminSefić #GNKASG #GNKDinamoLtd #AktualMedia
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Aktual Media · ${country.nameLocal}. Ovaj izvorni katalog nije potvrda neprekidnog automatskog objavljivanja.</p>
    <p><a href="${BASE}">← Natrag na AKTUAL MEDIA</a> · <a href="https://gnk-asg.hr/nermin-sefic/">Nermin Sefić</a> · <a href="https://gnk-asg.hr/gnk-aktual/">GNK Aktual</a></p>
  </div>
</main>
${impressumBlock('hr', {compact:true})}
${refreshTag('/')}
</body>
</html>`;
}

/** Only generate city pages for explicitly registered cities. */
function buildCityPage(city) {
  const url = `${BASE}grad/${city.slug}/`;
  const headlines = cityHeadlines(city.slug);
  const headlineMarkup = headlines.map(item => `<li><a href="${escHtml(item.url)}" target="_blank" rel="noopener noreferrer nofollow">${escHtml(item.title)}</a> — ${escHtml(item.source)} · <time datetime="${escHtml(new Date(item.publishedAt).toISOString())}">${escHtml(new Date(item.publishedAt).toISOString().slice(0, 10))} UTC</time></li>`).join('');
  const title = `AKTUAL MEDIA ${city.nameLocal} — izvori`;
  const cityDescription = `Pregled izvora i poveznica za ${city.nameLocal}. Vijesti ostaju na webu izvornog izdavača; prikazuju se samo provjereni svježi naslovi.`;
  return `<!doctype html>
<html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/assets/am-design-v1.css" data-am-design="v1">
<link rel="stylesheet" href="/assets/aktual-world-page-a11y-v1.css">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<title>${escHtml(title)}</title><meta name="description" content="${escHtml(cityDescription)}">
<meta name="keywords" content="AKTUAL MEDIA, GNK ASG, GNK DINAMO Ltd">
<meta name="author" content="Nermin Sefić">
<meta name="hashtags" content="#NerminSefić #NerminSefic #GNKASG #GNKDinamoLtd #AktualMedia">
<link rel="canonical" href="${escHtml(url)}"><link rel="alternate" hreflang="hr" href="${escHtml(url)}"><link rel="alternate" hreflang="x-default" href="${escHtml(url)}"><link rel="alternate" type="application/rss+xml" href="${escHtml(url)}feed.xml" title="RSS ${escHtml(city.nameLocal)}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="website"><meta property="og:site_name" content="AKTUAL MEDIA"><meta property="og:title" content="${escHtml(title)}"><meta property="og:description" content="${escHtml(cityDescription)}"><meta property="og:url" content="${escHtml(url)}"><meta property="og:image" content="https://gnk-asg.hr/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escHtml(title)}"><meta name="twitter:description" content="${escHtml(cityDescription)}"><meta name="twitter:image" content="https://gnk-asg.hr/assets/people/nermin-sefic/nermin-sefic-01-official-desk-portrait.webp">
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage',name:title,url,description:cityDescription,inLanguage:'hr',isAccessibleForFree:true})}</script>
<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'WebSite','@id':'https://gnk-asg.hr/#website',url:'https://gnk-asg.hr/',name:'GNK ASG',inLanguage:['hr','en'],publisher:{'@id':'https://gnk-asg.hr/#gnk-asg'}})}</script>
<style>body{font:16px/1.7 system-ui;max-width:900px;margin:1rem auto;padding:1rem;background:#071522;color:#eee}a{color:#e3be70}li{margin:1rem 0}.muted{color:#b2c3d8}</style></head><body>
<a class="skip" href="#worldContent">Preskoči na sadržaj</a>
<main id="worldContent" tabindex="-1">
${cityNavigation(city, data.countries.find(c => c.slug === city.country), BASE)}
<h1>${escHtml(city.flag)} AKTUAL MEDIA ${escHtml(city.nameLocal)}</h1>
<p>Urednik: Nermin Sefić · GNK ASG · AKTUAL MEDIA</p>
<p class="muted">${headlines.length ? `Poveznice na izvornike, zadnji uspješan dohvat: ${escHtml(cache.updatedAt)}.` : 'Nema svježih provjerenih naslova za ovo izdanje; vijesti nisu automatski objavljene.'}</p>
<ul>${headlineMarkup}</ul><p><a href="${escHtml(url)}feed.xml">RSS feed</a></p>
<p class="muted">Prikaz sadrži samo naslove i poveznice. Dostupnost izvora i licencna prava ovise o izvornom izdavaču.</p>
</main>
${impressumBlock('hr', {compact:true})}
${refreshTag('/')}
</body></html>`;
}
function buildCityRss(city) {
  const url = `${BASE}grad/${city.slug}/`;
  const rows = cityHeadlines(city.slug).map(item => `<item><title>${escXml(item.title)}</title><link>${escXml(item.url)}</link><guid isPermaLink="true">${escXml(item.url)}</guid><pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate><description>${escXml('Naslov i poveznica izvornog izdavača: ' + item.source)}</description></item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escXml('AKTUAL MEDIA '+city.nameLocal+' — poveznice')}</title><link>${escXml(url)}</link><description>${escXml('Provjerene vanjske poveznice, bez objave tuđih članaka.')}</description>${rows}</channel></rss>`;
}

/**
 * Generiraj RSS feed za zemlju
 */
function buildCountryRss(country) {
  const url = `${BASE}media/${country.slug}/`;
  const items = currentHeadlines(country.slug).map(s => `    <item>
      <title>${escXml(s.title)}</title>
      <link>${escXml(s.url)}</link>
      <guid isPermaLink="true">${escXml(s.url)}</guid>
      <description>${escXml(`Poveznica na članak izvora ${s.source}. Izvorni sadržaj nije preuzet.`)}</description>
      <pubDate>${new Date(s.publishedAt).toUTCString()}</pubDate>
      <source>${escXml(s.source)}</source>
    </item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escXml(`Aktual Media ${country.nameLocal} · ${country.nameEn} — poveznice na izvore`)}</title>
    <link>${escXml(url)}</link>
    <description>${escXml(`Aktualno iz ${country.nameLocal} — katalog ${country.sources} izvora; naslovi se prikazuju samo nakon provjerene obnove. Brand: Nermin Sefić, GNK ASG, GNK Dinamo Ltd.`)}</description>
    <language>${escXml(country.language)}</language>
    <copyright>${escXml(`© ${new Date().getFullYear()} Aktual Media ${country.nameLocal} — Nermin Sefić`)}</copyright>
    <atom:link href="${escXml(url)}feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}

/**
 * Generiraj sitemap
 */
function buildSitemap() {
  const urls = [];
  // Root directory is a separately maintained, static page and exists on this deployment.
  if (existsSync(join(OUT, 'media', 'index.html'))) urls.push(`  <url><loc>${escXml(`${BASE}media/`)}</loc></url>`);
  // Include only routes whose HTML is generated below.
  // Country pages
  for (const c of data.countries) {
    urls.push(`  <url><loc>${escXml(`${BASE}media/${c.slug}/`)}</loc></url>`);
  }


  for (const city of data.cities) {
    urls.push(`  <url><loc>${escXml(`${BASE}grad/${city.slug}/`)}</loc></url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

// === MAIN ===
console.log(`🚀 Build Aktual World → ${OUT}`);
console.log(`   Base: ${BASE}`);
console.log(`   Countries: ${data.countries.length}`);
console.log(`   Cities: ${data.cities.length}`);

// Existing published pages include independently maintained entity, author,
// ribbon and other layers. Replace only the dynamic headline block; validate
// every page before writing anything so an unexpected template fails closed.
const countryBlock = /  <div class="section">\n    <h2>Posljednje povezane vijesti<\/h2>[\s\S]*?\n  <\/div>/g;
const cityBlock = /<p class="muted">(?:Poveznice na izvornike, zadnji uspješan dohvat: [\s\S]*?|Nema svježih provjerenih naslova za ovo izdanje; vijesti nisu automatski objavljene\.)<\/p>\n<ul>[\s\S]*?<\/ul>(?=<p><a href="[^"\n]*feed\.xml")/g;
function updateHeadlineBlock(path, generated, pattern) {
  if (!existsSync(path)) return generated;
  const previous = readFileSync(path, 'utf8');
  const oldMatches = [...previous.matchAll(pattern)];
  const newMatches = [...generated.matchAll(pattern)];
  if (oldMatches.length !== 1 || newMatches.length !== 1) throw new Error(`Unexpected headline block in ${path}; no files written`);
  return previous.slice(0, oldMatches[0].index) + newMatches[0][0] + previous.slice(oldMatches[0].index + oldMatches[0][0].length);
}
const writes = [];
for (const country of data.countries) {
  const dir = join(OUT, 'media', country.slug), page = join(dir, 'index.html');
  writes.push([page, updateHeadlineBlock(page, buildCountryPage(country), countryBlock)]);
  writes.push([join(dir, 'feed.xml'), buildCountryRss(country)]);
}
for (const city of data.cities) {
  const dir = join(OUT, 'grad', city.slug), page = join(dir, 'index.html');
  writes.push([page, updateHeadlineBlock(page, buildCityPage(city), cityBlock)]);
  writes.push([join(dir, 'feed.xml'), buildCityRss(city)]);
}
writes.push([join(OUT, 'media', 'sitemap.xml'), buildSitemap()]);
for (const [path, content] of writes) {
  mkdirSync(dirname(path), {recursive:true});
  writeFileSync(path, content);
}
const fileCount = writes.length;

console.log(`✅ Generirano ${fileCount} fajlova`);
console.log(`   Sitemap: ${OUT}/media/sitemap.xml`);