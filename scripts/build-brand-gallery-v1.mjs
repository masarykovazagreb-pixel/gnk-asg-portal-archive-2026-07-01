#!/usr/bin/env node
/**
 * GALERIJA ZNAKOVA — AKTUAL MEDIA.
 *
 * Gradi galerijske stranice za svaki znak kuće i za naslovnicu svakog
 * gradskog izdanja, pa ih upisuje u /galerija/ i u galerijski sitemap.
 *
 * Zašto zaseban generator: galerija vizuala (visual_gallery.json) pokriva
 * tematske ilustracije, a znakovi izdanja imaju drugi omjer (1200×345) i
 * drugu svrhu — moraju se moći preuzeti, provjeriti i citirati. Zato svaki
 * znak ima vlastitu stranicu s punim podacima: autor, izdavač, pravo
 * korištenja i izvor datoteke.
 *
 * Sve se piše između markera, pa ponovno pokretanje ne briše rad drugih
 * generatora i ne umnožava zapise.
 *
 *   node scripts/build-brand-gallery-v1.mjs
 *   node scripts/build-brand-gallery-v1.mjs --check
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const LOGOS = join(PORTAL, 'data', 'aktual-logos-v1.json');
const CHANNELS = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8')).channels;
const SITE = 'https://gnk-asg.hr';
const CHECK = process.argv.includes('--check');

const START = '<!-- BRAND-GALLERY:START -->';
const END = '<!-- BRAND-GALLERY:END -->';
const MAP_START = '<!-- BRAND-SITEMAP:START -->';
const MAP_END = '<!-- BRAND-SITEMAP:END -->';

const CREAM = '#F4F1E8';
const NAVY = '#19233B';
const RED = '#D9384D';

const esc = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

/** Riječi bez oznaka — za meta keywords (oznake idu u article:tag). */
const words = (list) => [...new Map(list
  .map((w) => String(w).replace(/^#/, '').trim())
  .filter((w) => w && !/nermin|sefi[cć]/i.test(w))
  .map((w) => [w.toLowerCase(), w])).values()];

const tagMetas = (tags) => tags.map((t) => `<meta property="article:tag" content="${esc(t)}">`).join('\n');

/* ---------- ploče ---------- */

function buildEntries(manifest) {
  const entries = [];

  for (const logo of manifest.logos) {
    const isMaster = logo.slug.startsWith('aktual-media');
    const lang = logo.lang === 'en' ? 'en' : 'hr';
    const city = CHANNELS.find((c) => logo.outlet === `kanal/${c.id}/`);
    const deskName = logo.outlet.startsWith('izdanja/') ? logo.outlet.split('/')[1] : '';
    entries.push({
      kind: 'logo',
      slug: `znak-${logo.slug}`,
      image: logo.webp,
      imageType: 'image/webp',
      width: 1200,
      height: 345,
      file: logo.svg,
      svg: logo.svg,
      plate: true,
      lang,
      title: logo.title,
      heading: logo.title,
      kicker: isMaster ? 'Matični znak kuće' : (logo.outlet.startsWith('izdanja/') ? 'Znak deska' : 'Znak gradskog izdanja'),
      description: isMaster
        ? (lang === 'en'
          ? 'The AKTUAL MEDIA wordmark: navy AKTUAL, red MEDIA, the world-edition kicker and the tagline News · context · sources. Used for the English entry point of the house.'
          : 'Znak AKTUAL MEDIA: navy AKTUAL, crvena MEDIA, natpis svjetsko izdanje i slogan Vijesti · kontekst · izvori. Ovo je potpis kuće na hrvatskom jeziku; engleska inačica ima vlastiti znak.')
        : `Znak izdanja ${logo.title}. Isti sustav kao matični znak: prvi dio imena u navyju, drugi u crvenoj. Služi kao potpis izdanja u zaglavlju stranice i kao slika za dijeljenje.`,
      points: [
        ['Format', 'SVG (vektor) + WebP 1200×345'],
        ['Podloga', 'krem #F4F1E8'],
        ['Boje', 'navy #19233B · crvena #D9384D'],
        ['Upotreba', 'znak izdanja, dijeljenje, tiskana najava'],
      ],
      tags: ['#AKTUALMEDIA', '#AktualMedia', '#GNKASG', '#Znak', ...(isMaster ? ['#SvjetskoIzdanje'] : ['#Izdanja'])],
      links: [
        ...(logo.outlet ? [{ href: `/${logo.outlet}`, label: 'Otvori izdanje' }] : []),
        ...(isMaster ? [{ href: lang === 'en' ? '/en/gnk-aktual/' : '/gnk-aktual/', label: 'Otvori AKTUAL MEDIA' }] : []),
        { href: logo.svg, label: 'Preuzmi SVG' },
        { href: '/galerija/', label: 'Sve u galeriji' },
      ],
      headline: city ? `AKTUAL MEDIA · ${city.city.toUpperCase()}` : (deskName ? `AKTUAL MEDIA · ${deskName.toUpperCase()}` : 'AKTUAL MEDIA'),
      caption: `${logo.title} — ${logo.tagline}`,
    });
  }

  for (const channel of CHANNELS) {
    entries.push({
      kind: 'city',
      slug: `izdanje-${channel.id}`,
      image: `/assets/izdanja/${channel.id}-1200.webp`,
      imageType: 'image/webp',
      width: 1200,
      height: 675,
      file: `/assets/izdanja/${channel.id}-1200.webp`,
      plate: false,
      lang: 'hr',
      title: `${channel.city} — naslovnica izdanja ${channel.title}`,
      heading: `${channel.city}: kako izgleda naslovnica izdanja`,
      kicker: 'Naslovnica gradskog izdanja',
      description: `Naslovna fotografija izdanja ${channel.title}. Stoji na kartici izdanja i na vrhu stranice, a ovdje je izdvojena kao samostalna slika s podacima o izvoru i pravu korištenja.`,
      points: [
        ['Format', 'WebP 1200×675 (16:9)'],
        ['Izdanje', channel.title],
        ['Jezik', channel.lang],
        ['Upotreba', 'kartica izdanja, dijeljenje, arhiva'],
      ],
      tags: ['#AKTUALMEDIA', '#AktualMedia', '#GNKASG', `#Kanal${channel.city.replace(/[^A-Za-zČĆŽŠĐčćžšđ]/g, '')}`],
      links: [
        { href: `/kanal/${channel.id}/`, label: 'Otvori izdanje' },
        { href: '/izdanja/', label: 'Sva izdanja' },
        { href: `/assets/izdanja/${channel.id}-1200.webp`, label: 'Preuzmi sliku' },
      ],
      headline: `AKTUAL MEDIA · ${channel.city.toUpperCase()}`,
      caption: `${channel.city} — naslovnica izdanja ${channel.title}`,
    });
  }

  return entries;
}

/* ---------- HTML ---------- */

function cardCss() {
  return `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#050b14;color:#eef3f9;font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
a{color:inherit;text-decoration:none}
a:hover{text-decoration:underline}
main{max-width:1180px;margin:auto;padding:28px 18px 64px}
.crumb{font:600 12px/1.4 system-ui;letter-spacing:.14em;text-transform:uppercase;color:#93a6bd;margin:0 0 18px}
.crumb a{color:#e9c66c}
.bg-card{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:0;border:1px solid #23364f;border-radius:20px;overflow:hidden;background:#08121f;box-shadow:0 24px 60px rgba(0,0,0,.45)}
.bg-media{position:relative;display:flex;align-items:center;justify-content:center;background:#0b1828;padding:0;min-height:260px}
.bg-media img{display:block;width:100%;height:100%;object-fit:cover}
.bg-media--plate{background:${CREAM};padding:26px}
.bg-media--plate img{object-fit:contain;height:auto}
.bg-live{position:absolute;left:14px;bottom:14px;background:rgba(4,11,18,.86);border:1px solid #37516d;color:#bfe8a8;border-radius:999px;padding:6px 12px;font:700 10px/1 system-ui;letter-spacing:.16em;text-transform:uppercase}
.bg-body{padding:clamp(20px,3vw,34px)}
.bg-badge{display:inline-block;background:${NAVY};color:#f2e6c4;border:1px solid rgba(233,198,108,.55);border-radius:4px;padding:6px 10px;font:800 10px/1 system-ui;letter-spacing:.18em;text-transform:uppercase;margin:0 0 14px}
.bg-body h1{font:700 clamp(24px,3.4vw,40px)/1.1 Georgia,"Times New Roman",serif;margin:0 0 12px;color:#f6efd9}
.bg-body p{margin:0 0 16px;color:#ccd8e6}
.bg-spec{list-style:none;padding:0;margin:0 0 20px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 18px}
.bg-spec li{position:relative;padding-left:16px;font-size:14px;color:#d6e1ee}
.bg-spec li::before{content:"";position:absolute;left:0;top:.55em;width:7px;height:7px;border-radius:50%;background:#a8d96b}
.bg-spec b{color:#f6efd9;font-weight:700}
.bg-btns{display:flex;flex-wrap:wrap;gap:10px}
.bg-btn{display:inline-block;border:1px solid #35506e;border-radius:10px;padding:11px 16px;font:700 13px/1 system-ui;color:#e7eef7}
.bg-btn--solid{background:#7fd4f0;border-color:#7fd4f0;color:#062133}
.bg-meta{margin:22px 0 0;padding-top:16px;border-top:1px solid #1d3049;font-size:13px;color:#9fb0c4}
.bg-meta code{background:#0d1c2c;border:1px solid #23364f;border-radius:5px;padding:2px 6px;font-size:12px;color:#cfe0f1}
.bg-tags{list-style:none;display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:14px 0 0}
.bg-tags li{background:#0d1c2c;border:1px solid #23364f;border-radius:999px;padding:5px 11px;font:600 12px/1 system-ui;color:#bcd0e5}
.bg-next{margin:34px 0 0}
.bg-next h2{font:700 20px/1.2 Georgia,serif;color:#f2e6c4;margin:0 0 12px}
.bg-grid{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.bg-grid a{display:block;background:#0b1828;border:1px solid #23364f;border-radius:12px;overflow:hidden}
.bg-grid img{display:block;width:100%;height:auto}
.bg-grid span{display:block;padding:8px 10px;font:600 11px/1.3 system-ui;letter-spacing:.06em;text-transform:uppercase;color:#c3cede}
@media(max-width:820px){.bg-card{grid-template-columns:1fr}.bg-spec{grid-template-columns:1fr}}
`;
}

function pageHtml(entry, all) {
  const canonical = `${SITE}/galerija/${entry.slug}/`;
  const imageUrl = `${SITE}${entry.image}`;
  const keywords = words(entry.tags.concat(['AKTUAL MEDIA', 'Aktual mediji', 'GNK ASG', 'galerija', 'znak']));
  const ratio = entry.height / entry.width;

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ImageObject',
        '@id': `${canonical}#image`,
        name: entry.title,
        caption: entry.caption,
        description: entry.description,
        contentUrl: imageUrl,
        url: canonical,
        width: entry.width,
        height: entry.height,
        encodingFormat: entry.imageType,
        creditText: 'AKTUAL MEDIA d.o.o.',
        creator: { '@type': 'Organization', '@id': `${SITE}/gnk-aktual/#news-organization`, name: 'AKTUAL MEDIA d.o.o.' },
        copyrightNotice: '© AKTUAL MEDIA d.o.o.',
        license: `${SITE}/galerija/`,
        acquireLicensePage: `${SITE}/contact/`,
        representativeOfPage: true,
      },
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: `${entry.title} — AKTUAL MEDIA`,
        description: entry.description,
        inLanguage: entry.lang,
        isPartOf: { '@id': `${SITE}/#website` },
        about: { '@id': `${SITE}/gnk-aktual/#news-organization` },
        primaryImageOfPage: { '@id': `${canonical}#image` },
        editor: { '@id': `${SITE}/#nermin-sefic` },
        publisher: { '@id': `${SITE}/gnk-aktual/#news-organization` },
        keywords: keywords.join(', '),
      },
      {
        '@type': 'NewsMediaOrganization',
        '@id': `${SITE}/gnk-aktual/#news-organization`,
        name: 'AKTUAL MEDIA d.o.o.',
        alternateName: ['AKTUAL MEDIA', 'Aktual Media', 'Aktual mediji', 'Aktual medija', 'Aktual Media d.o.o.'],
        url: `${SITE}/gnk-aktual/`,
        logo: { '@type': 'ImageObject', url: `${SITE}/assets/brand/aktual-media-hr-1200.webp`, width: 1200, height: 345 },
      },
      {
        /* Kanonski WebSite čvor domene — isti @id i isti izdavač kao na svakoj
           drugoj stranici portala. Bez njega galerijska stranica visi bez
           konteksta domene i test identiteta pada. */
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        url: `${SITE}/`,
        name: 'GNK ASG',
        inLanguage: ['hr', 'en'],
        publisher: { '@type': 'Organization', '@id': `${SITE}/#gnk-asg`, name: 'GNK ASG d.o.o.', url: `${SITE}/` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'GNK ASG', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'AKTUAL MEDIA', item: `${SITE}/gnk-aktual/` },
          { '@type': 'ListItem', position: 3, name: 'Galerija', item: `${SITE}/galerija/` },
          { '@type': 'ListItem', position: 4, name: entry.title, item: canonical },
        ],
      },
    ],
  };

  const others = all.filter((x) => x.slug !== entry.slug && x.kind === entry.kind).slice(0, 8);
  const next = `<section class="bg-next"><h2>${entry.kind === 'logo' ? 'Ostali znakovi kuće' : 'Naslovnice ostalih izdanja'}</h2><ul class="bg-grid">${
    others.map((x) => `<li><a href="/galerija/${esc(x.slug)}/"><img src="${esc(x.image)}" alt="${esc(x.title)}" width="${x.width}" height="${x.height}" loading="lazy" decoding="async"><span>${esc(x.title)}</span></a></li>`).join('')
  }</ul></section>`;

  return `<!doctype html>
<html lang="${entry.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(entry.title)} — galerija AKTUAL MEDIA | GNK ASG</title>
<meta name="description" content="${esc(entry.description)}">
<meta name="keywords" content="${esc(keywords.join(', '))}">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="alternate" hreflang="${entry.lang}" href="${canonical}">
<link rel="alternate" hreflang="x-default" href="${canonical}">
${entry.kind === 'logo' ? `<link rel="alternate" type="image/svg+xml" href="${entry.svg}" title="${esc(entry.title)}">` : ''}
${tagMetas(entry.tags)}
<meta property="og:type" content="article">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="og:title" content="${esc(entry.title)}">
<meta property="og:description" content="${esc(entry.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${imageUrl}">
<meta property="og:image:width" content="${entry.width}">
<meta property="og:image:height" content="${entry.height}">
<meta property="og:image:alt" content="${esc(entry.caption)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(entry.title)}">
<meta name="twitter:description" content="${esc(entry.caption)}">
<meta name="twitter:image" content="${imageUrl}">
<meta name="twitter:image:alt" content="${esc(entry.caption)}">
<script type="application/ld+json">${safeJson(jsonld)}</script>
<style>${cardCss()}</style>
</head>
<body>
<main>
<p class="crumb"><a href="/">GNK ASG</a> / <a href="/gnk-aktual/">AKTUAL MEDIA</a> / <a href="/galerija/">Galerija</a> / ${esc(entry.title)}</p>
<article class="bg-card">
  <div class="bg-media${entry.plate ? ' bg-media--plate' : ''}">
    <img src="${esc(entry.image)}" alt="${esc(entry.caption)}" width="${entry.width}" height="${entry.height}" ${entry.plate ? '' : `style="aspect-ratio:${entry.width}/${entry.height}"`} loading="eager" decoding="async" fetchpriority="high">
    <span class="bg-live">${entry.kind === 'logo' ? 'SVG · vektor' : 'Foto · 16:9'}</span>
  </div>
  <div class="bg-body">
    <span class="bg-badge">${esc(entry.headline)}</span>
    <h1>${esc(entry.heading)}</h1>
    <p>${esc(entry.description)}</p>
    <ul class="bg-spec">${entry.points.map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join('')}</ul>
    <div class="bg-btns">${entry.links.map((l, i) => `<a class="bg-btn${i === 0 ? ' bg-btn--solid' : ''}" href="${esc(l.href)}"${l.href.startsWith('http') ? ' rel="external noopener"' : ''}>${esc(l.label)}</a>`).join('')}</div>
    <ul class="bg-tags">${entry.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    <p class="bg-meta">Izdavač <a href="/gnk-aktual/"><b>AKTUAL MEDIA d.o.o.</b></a> · urednik <a href="/nermin-sefic/">Nermin Sefić</a> · matično društvo <a href="/">GNK ASG d.o.o.</a><br>Datoteka: <code>${esc(entry.file)}</code>${entry.kind === 'logo' ? ` · omjer ${entry.width}×${entry.height} (${(ratio).toFixed(2)})` : ''}</p>
  </div>
</article>
${next}
</main>
</body>
</html>`;
}

/* ---------- index + sitemap ---------- */

function indexSection(entries) {
  const logos = entries.filter((e) => e.kind === 'logo');
  const cities = entries.filter((e) => e.kind === 'city');
  const tile = (e, cls = '') => `<li class="${cls}"><a href="/galerija/${esc(e.slug)}/"><img src="${esc(e.image)}" alt="${esc(e.caption)}" width="${e.width}" height="${e.height}" loading="lazy" decoding="async"><span>${esc(e.title)}</span></a></li>`;
  return `${START}
<section aria-labelledby="znakovi" style="margin:40px 0 0">
  <h2 id="znakovi">Znakovi kuće AKTUAL MEDIA <span style="font:600 12px/1.4 system-ui;letter-spacing:.12em;text-transform:uppercase;color:#9fb0c4">${logos.length} znakova</span></h2>
  <p class="lead">Svako izdanje ima svoj znak u istoj familiji: prvi dio imena u navyju, drugi u crvenoj, natpis iznad i slogan ispod. Znakovi su vektorski (SVG) i svaki ima vlastitu stranicu s podacima o upotrebi.</p>
  <ul style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px">${logos.map((e) => tile(e)).join('')}</ul>
</section>
<section aria-labelledby="naslovnice" style="margin:40px 0 0">
  <h2 id="naslovnice">Naslovnice gradskih izdanja</h2>
  <p class="lead">Fotografija koja stoji na kartici i vrhu svakog gradskog izdanja, izdvojena kao samostalna slika s podacima o izvoru i pravu korištenja.</p>
  <ul style="list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">${cities.map((e) => tile(e)).join('')}</ul>
</section>
${END}`;
}

function sitemapBlock(entries) {
  const rows = entries.map((e) => {
    const loc = `${SITE}/galerija/${e.slug}/`;
    return `<url><loc>${loc}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod><changefreq>monthly</changefreq><priority>${e.kind === 'logo' ? '0.6' : '0.5'}</priority>`
      + `<image:image><image:loc>${SITE}${e.image}</image:loc><image:title>${esc(e.title)}</image:title>`
      + `<image:caption>${esc(e.caption)}</image:caption></image:image></url>`;
  }).join('\n');
  return `${MAP_START}\n${rows}\n${MAP_END}`;
}

/* ---------- run ---------- */

const manifest = JSON.parse(readFileSync(LOGOS, 'utf8'));
const entries = buildEntries(manifest);
const written = [];
let drift = false;

for (const entry of entries) {
  const target = join(PORTAL, 'galerija', entry.slug, 'index.html');
  const html = pageHtml(entry, entries);
  if (CHECK) {
    if (!existsSync(target) || readFileSync(target, 'utf8') !== html) drift = true;
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, html);
    written.push(entry.slug);
  }
}

/* /galerija/index.html ima jednog vlasnika — scripts/build_gallery_standalone_pages.py,
   koji u sebi nosi istu sekciju znakova. Ovaj generator ne dira indeks, da
   dva pisca ne bi brisala rad onoga drugoga. Ovdje se samo provjerava da
   sekcija na indeksu postoji i da pokazuje na sve izgrađene rute. */
const indexPath = join(PORTAL, 'galerija', 'index.html');
const indexHtml = readFileSync(indexPath, 'utf8');
const missingOnIndex = entries.filter((e) => !indexHtml.includes(`/galerija/${e.slug}/`));
if (missingOnIndex.length) {
  console.error(JSON.stringify({ ok: false, reason: 'indeks ne pokazuje sve znakove',
    missing: missingOnIndex.map((e) => e.slug).slice(0, 10) }, null, 2));
  process.exit(1);
}

/* Galerijski sitemap: zamijeni markirani blok. */
const mapPath = join(PORTAL, 'galerija', 'sitemap.xml');
const mapXml = readFileSync(mapPath, 'utf8');
let nextMap;
if (mapXml.includes(MAP_START) && mapXml.includes(MAP_END)) {
  nextMap = mapXml.replace(new RegExp(`${MAP_START}[\\s\\S]*?${MAP_END}`), () => sitemapBlock(entries).trim());
} else {
  nextMap = mapXml.replace('</urlset>', `${sitemapBlock(entries)}\n</urlset>`);
}
if (CHECK) { if (nextMap !== mapXml) drift = true; }
else if (nextMap !== mapXml) { writeFileSync(mapPath, nextMap); }

const report = {
  ok: true,
  version: 'GNK_ASG_BRAND_GALLERY_V1_20261022',
  logos: entries.filter((e) => e.kind === 'logo').length,
  cityCovers: entries.filter((e) => e.kind === 'city').length,
  routes: entries.length,
  written: written.length,
  mode: CHECK ? 'check' : 'write',
};
if (CHECK && drift) { console.log(JSON.stringify({ ...report, ok: false, drift: true }, null, 2)); process.exit(1); }
console.log(JSON.stringify(report, null, 2));
