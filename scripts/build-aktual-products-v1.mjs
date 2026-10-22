#!/usr/bin/env node
/**
 * AKTUAL MEDIA — stranica sa svim proizvodima.
 *
 * Jedno mjesto na koje vode „prozorčići" s naslovnice: gradska izdanja,
 * devet deskova, tjednik, moda, galerija, radio, mreža i javni status.
 * Stranica je dvojezična (HR/EN), ima vlastiti CSS (bez ugrađenih stilova),
 * JSON-LD graf i unose u glavnom sitemapu.
 *
 * Pokretanje: node scripts/build-aktual-products-v1.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const SITE = 'https://gnk-asg.hr';
const V = '20261022';
const CSS_FILE = join(PORTAL, 'assets', 'aktual-products-v1.css');

const channels = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8')).channels;

function itemsFor(id) {
  const file = join(ROOT, 'apps', 'region', 'data', `${id}.json`);
  if (!existsSync(file)) return 420;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    return Array.isArray(data.items) ? data.items.length : 420;
  } catch {
    return 420;
  }
}

const CITY_COPY = {
  zagreb: ['Zagreb', 'Hrvatska'],
  beograd: ['Beograd', 'Srbija'],
  sarajevo: ['Sarajevo', 'Bosna i Hercegovina'],
  budimpesta: ['Budimpešta', 'Mađarska'],
  ljubljana: ['Ljubljana', 'Slovenija'],
  rim: ['Rim', 'Italija'],
  sofija: ['Sofija', 'Bugarska'],
  bukurest: ['Bukurešt', 'Rumunjska'],
  /* Svjetska izdanja: pet kontinenata izvan regije. */
  nairobi: ['Nairobi', 'Kenija'],
  jakarta: ['Jakarta', 'Indonezija'],
  newyork: ['New York', 'SAD'],
  saopaulo: ['São Paulo', 'Brazil'],
  sydney: ['Sydney', 'Australija'],
  singapur: ['Singapur', 'Singapur'],
  kairo: ['Kairo', 'Egipat'],
  tokio: ['Tokio', 'Japan'],
  peking: ['Peking', 'Kina']
};

const DESKS = [
  ['sport', 'Sport', 'Rezultati, klubovi i kontekst'],
  ['politika', 'Politika', 'Odluke, institucije i rokovi'],
  ['sigurnost', 'Sigurnost', 'Rat, nesreće i provjere'],
  ['biznis', 'Business', 'Brojevi, tržišta i tvrtke'],
  ['tehnologija', 'Tehnologija', 'AI, čipovi i infrastruktura'],
  ['moda', 'Tjednik Mode', 'Moda, dizajn i stil'],
  ['putovanja', 'Putovanja', 'Rute, mjesta i prakse'],
  ['ljubimci', 'Ljubimci', 'Zdravlje, njega i prava'],
  ['svijet', 'Svijet', 'Regije, sukobi i trendovi']
];

const PLATFORMS = [
  ['https://gnk-asg-tjednik.pages.dev/', 'Business Tjednik', 'Tjedni poslovni pregled W43'],
  ['/galerija/', 'Galerija znakova', '63 stranice znakova kuće'],
  ['/radio/', 'Radio', 'Šest stanica, jedan player'],
  ['/gnk-aktual/mreza/', 'Mreža izdanja', '17 gradova i 13 jezika na jednoj karti'],
  ['/status/', 'Status ažurnosti', 'Javno mjerenje svježine svakog izdanja'],
  ['/aktual-media/', 'Podatkovni desk', 'Četiri mjerenja vlastite arhive'],
  ['https://gnk-asg-arhiva.pages.dev/', 'AKTUAL ARHIVA', 'Samostalan portal: 3.360 tekstova u pretraživoj arhivi'],
  ['https://gnk-asg-dnevnik.pages.dev/', 'AKTUAL DNEVNIK', 'Samostalan portal: jedan dan, svi gradovi koji objave, po satima']
];

const css = `*{box-sizing:border-box}
body{margin:0;background:#061019;color:#e8edf3;font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:inherit;text-decoration:none}
a:hover{text-decoration:underline}
.pr-wrap{max-width:1120px;margin:0 auto;padding:0 clamp(16px,4vw,40px)}
.pr-topbar{background:#08131f;border-bottom:1px solid #17334d}
.pr-top{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;justify-content:space-between;padding:14px 0;font-size:12.5px;color:#9fb3c8}
.pr-nav{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center}
.pr-nav a{color:#cfe0f2;padding:2px 0;border-bottom:1px solid transparent}
.pr-nav a:hover{border-bottom-color:#e9c66c;text-decoration:none}
.pr-top .pr-brand{font:800 11px/1 system-ui;letter-spacing:.18em;text-transform:uppercase;color:#e9c66c}
.pr-head{padding:34px 0 10px}
.pr-kicker{margin:0 0 8px;font:800 11px/1.3 system-ui;letter-spacing:.18em;text-transform:uppercase;color:#e9c66c}
h1{margin:0 0 12px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(30px,4.4vw,48px);line-height:1.04;letter-spacing:-.02em}
.pr-lead{margin:0;max-width:70ch;color:#b9c8d8}
.pr-sec{padding:26px 0;border-top:1px solid #17334d}
.pr-sec h2{margin:0 0 6px;font-family:Georgia,serif;font-size:clamp(22px,2.6vw,30px)}
.pr-sec p{margin:0 0 14px;color:#9fb3c8;max-width:70ch}
.pr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;list-style:none;margin:0;padding:0}
.pr-card{display:block;height:100%;padding:13px 15px;border:1px solid #23405a;border-radius:12px;background:#0b1a29;transition:border-color .18s ease,transform .18s ease}
.pr-card:hover,.pr-card:focus-visible{border-color:#e9c66c;transform:translateY(-2px);text-decoration:none}
.pr-card b{display:block;font-size:15px;line-height:1.2;margin:0 0 3px}
.pr-card span{display:block;font-size:12px;color:#93a6bb;line-height:1.4}
.pr-card em{display:inline-block;margin-top:7px;font:800 9.5px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;color:#0a1522;background:#e9c66c;border-radius:999px;padding:3px 7px;font-style:normal}
.pr-note{margin:26px 0 0;padding:14px 16px;border:1px solid #23405a;border-radius:12px;color:#93a6bb;font-size:13px}
.pr-foot{padding:26px 0 46px;border-top:1px solid #17334d;color:#93a6bb;font-size:12.5px}
.pr-foot a{color:#cfe0f2}
@media (prefers-reduced-motion:reduce){.pr-card{transition:none}.pr-card:hover{transform:none}}
`;

const WORLD_IDS = ['nairobi', 'jakarta', 'newyork', 'saopaulo', 'sydney', 'singapur', 'kairo', 'tokio', 'peking'];
const LANGS = new Set(channels.map((c) => c.lang)).size;
const REGION = channels.filter((c) => !WORLD_IDS.includes(c.id)).length;
const WORLD = channels.length - REGION;
const hrTitle = 'Svi proizvodi AKTUAL MEDIA — izdanja, deskovi, tjednik, galerija, status';
const hrDesc = `${channels.length} gradskih izdanja na ${LANGS} jezika na pet kontinenata (${REGION} regionalnih i ${WORLD} svjetskih), devet deskova, Business Tjednik, Tjednik Mode, galerija znakova, radio, mreža izdanja i javni status ažurnosti — svi proizvodi AKTUAL MEDIA na jednom popisu.`;
const enTitle = 'All AKTUAL MEDIA products — editions, desks, weekly, gallery, status';
const enDesc = `${channels.length} city editions in ${LANGS} languages across five continents (${REGION} regional and ${WORLD} world editions), nine desks, Business Weekly, Mode Weekly, the brand gallery, radio, the edition network and the public freshness status — every AKTUAL MEDIA product on one page.`;

const cityCards = (lang) => channels.map((c) => {
  const [name, country] = CITY_COPY[c.id] || [c.id, ''];
  const url = `/kanal/${c.id}/`;
  const badge = c.id === 'beograd' ? `<em>${lang === 'hr' ? 'Novo' : 'New'}</em>` : '';
  return `<li><a class="pr-card" href="${url}"><b>${name}</b><span>${c.lang} · ${country} · ${itemsFor(c.id)} ${lang === 'hr' ? 'tekstova' : 'stories'}</span>${badge}</a></li>`;
}).join('');

const deskCards = (lang) => DESKS.map(([slug, hr, note]) => {
  const label = lang === 'hr' ? hr : ({ sport: 'Sport', politika: 'Politics', sigurnost: 'Security', biznis: 'Business', tehnologija: 'Technology', moda: 'Mode Weekly', putovanja: 'Travel', ljubimci: 'Pets', svijet: 'World' }[slug] || hr);
  return `<li><a class="pr-card" href="/izdanja/${slug}/"><b>${label}</b><span>${note}</span></a></li>`;
}).join('');

const platformCards = (lang) => PLATFORMS.map(([url, hr, note]) => {
  const label = lang === 'hr' ? hr : ({ 'Business Tjednik': 'Business Weekly', 'Galerija znakova': 'Brand gallery', 'Radio': 'Radio', 'Mreža izdanja': 'Edition network', 'Status ažurnosti': 'Freshness status', 'Podatkovni desk': 'Data desk' }[hr] || hr);
  const noteEn = {
    'Tjedni poslovni pregled W43': 'Weekly business review W43',
    '63 stranice znakova kuće': '63 pages of house brand marks',
    'Šest stanica, jedan player': 'Six stations, one player',
    '8 gradova i 8 jezika na jednoj karti': '8 cities and 8 languages on one map',
    'Javno mjerenje svježine svakog izdanja': 'Public freshness measurement for every edition',
    'Četiri mjerenja vlastite arhive': 'Four measurements of our own archive',
    'Samostalan portal: 3.360 tekstova u pretraživoj arhivi': 'Standalone portal: 3,360 stories in a searchable archive',
    'Samostalan portal: jedan dan, svi gradovi koji objave, po satima': 'Standalone portal: one day, every city that published, hour by hour'
  }[note] || note;
  return `<li><a class="pr-card" href="${url}"${/^https?:/.test(url) ? ' rel="external noopener"' : ''}><b>${label}</b><span>${lang === 'hr' ? note : noteEn}</span></a></li>`;
}).join('');

const ld = (lang, title, desc, canonical) => JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'GNK ASG', inLanguage: ['hr', 'en'], publisher: { '@id': `${SITE}/#gnk-asg` } },
    {
      '@type': 'NewsMediaOrganization', '@id': `${SITE}/gnk-aktual/#news-organization`, name: 'AKTUAL MEDIA d.o.o.',
      alternateName: ['AKTUAL MEDIA', 'Aktual Media', 'Aktual mediji', 'AKTUAL MEDIA KANAL'],
      url: `${SITE}/gnk-aktual/`,
      logo: { '@type': 'ImageObject', '@id': `${SITE}/assets/brand/aktual-media-hr.svg#logo`, url: `${SITE}/assets/brand/aktual-media-hr.svg`, contentUrl: `${SITE}/assets/brand/aktual-media-hr-1200.webp`, width: 1200, height: 345, caption: 'AKTUAL MEDIA — svjetsko izdanje', encodingFormat: 'image/svg+xml' },
      editor: { '@id': `${SITE}/#nermin-sefic` }
    },
    { '@type': 'Person', '@id': `${SITE}/#nermin-sefic`, name: 'Nermin Sefić', jobTitle: 'Urednik i direktor', url: `${SITE}/nermin-sefic/` },
    {
      '@type': 'CollectionPage', '@id': `${canonical}#webpage`, url: canonical, name: title, description: desc, inLanguage: lang,
      isPartOf: { '@id': `${SITE}/#website` }, publisher: { '@id': `${SITE}/gnk-aktual/#news-organization` }, editor: { '@id': `${SITE}/#nermin-sefic` },
      mainEntity: {
        '@type': 'ItemList', numberOfItems: channels.length + DESKS.length + PLATFORMS.length,
        itemListElement: [
          ...channels.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.title, url: `${SITE}/kanal/${c.id}/` })),
          ...DESKS.map(([slug, name], i) => ({ '@type': 'ListItem', position: channels.length + i + 1, name: `${name} — AKTUAL MEDIA`, url: `${SITE}/izdanja/${slug}/` })),
          ...PLATFORMS.map(([url, name], i) => ({ '@type': 'ListItem', position: channels.length + DESKS.length + i + 1, name, url: url.startsWith('http') ? url : `${SITE}${url}` }))
        ]
      }
    },
    { '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`, itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'GNK ASG', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'AKTUAL MEDIA', item: `${SITE}/gnk-aktual/` },
      { '@type': 'ListItem', position: 3, name: lang === 'hr' ? 'Proizvodi' : 'Products', item: canonical }
    ] }
  ]
});

function page(lang) {
  const hr = lang === 'hr';
  const canonical = hr ? `${SITE}/aktual-media/proizvodi/` : `${SITE}/en/aktual-media/proizvodi/`;
  const title = hr ? hrTitle : enTitle;
  const desc = hr ? hrDesc : enDesc;
  const T = hr ? {
    kicker: 'AKTUAL MEDIA · proizvodi', h1: 'Svi proizvodi AKTUAL MEDIA',
    lead: `${channels.length} gradskih izdanja na ${LANGS} jezika i pet kontinenata, devet deskova, poslovni tjednik, moda, galerija, radio i javni status — svaki proizvod ima svoj link i svoje mjesto.`,
    cities: 'Gradska izdanja', citiesNote: 'Svaki grad ima vlastito izdanje na svom jeziku, s poveznicom na svaki izvornik. Prvih osam pokriva regiju, devet novih pokriva pet kontinenata.',
    desks: 'Deskovi i rubrike', desksNote: 'Devet deskova koji dijele istu arhivu, ali gledaju je iz drugog kuta.',
    platforms: 'Platforme i mjerenja', platformsNote: 'Tjednik, galerija, radio, mreža izdanja, status ažurnosti, podatkovni desk te dva samostalna portala na vlastitim domenama — ARHIVA i DNEVNIK.',
    note: 'Svi automatski sastavljeni dijelovi označeni su kao takvi i nisu pojedinačno urednički pregledani. Izvornici su uvijek povezani; tvrdnje izvornika nisu tvrdnje redakcije.',
    foot: 'Urednik i direktor: Nermin Sefić · AKTUAL MEDIA d.o.o.', back: '← AKTUAL MEDIA', all: 'Sva izdanja', status: 'Status ažurnosti'
  } : {
    kicker: 'AKTUAL MEDIA · products', h1: 'All AKTUAL MEDIA products',
    lead: `${channels.length} city editions in ${LANGS} languages across five continents, nine desks, the business weekly, mode, gallery, radio and the public status — every product has its own link and its own place.`,
    cities: 'City editions', citiesNote: 'Every city has its own edition in its own language, with a link to every original source. The first eight cover the region; nine new ones cover five continents.',
    desks: 'Desks and sections', desksNote: 'Nine desks sharing one archive, each looking at it from a different angle.',
    platforms: 'Platforms and measurements', platformsNote: 'Weekly, gallery, radio, edition network, freshness status, the data desk and two standalone portals on their own domains — ARCHIVE and DAILY.',
    note: 'Automatically assembled parts are labelled as such and are not individually editorially reviewed. Original sources are always linked; claims from sources are not the claims of the newsroom.',
    foot: 'Editor and director: Nermin Sefić · AKTUAL MEDIA d.o.o.', back: '← AKTUAL MEDIA', all: 'All editions', status: 'Freshness status'
  };

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="publisher" content="AKTUAL MEDIA d.o.o.">
<meta name="keywords" content="AKTUAL MEDIA, izdanja, deskovi, Business Tjednik, galerija, status, GNK ASG">
<meta name="news_keywords" content="AKTUAL MEDIA, izdanja, deskovi, Business Tjednik, GNK ASG">
<meta property="article:tag" content="#AKTUALMEDIA">
<meta property="article:tag" content="#GNKASG">
<meta name="theme-color" content="#061019">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="hr" href="${SITE}/aktual-media/proizvodi/">
<link rel="alternate" hreflang="en" href="${SITE}/en/aktual-media/proizvodi/">
<link rel="alternate" hreflang="x-default" href="${SITE}/aktual-media/proizvodi/">
<link rel="alternate" type="image/svg+xml" href="/assets/brand/aktual-media-hr.svg" title="AKTUAL MEDIA — svjetsko izdanje">
<link rel="alternate" type="application/json" href="/data/aktual-products-v1.json" title="${hr ? 'Strojno čitljiv popis proizvoda' : 'Machine-readable product catalogue'}">
<link rel="stylesheet" href="/assets/aktual-products-v1.css?v=${V}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${hr ? 'hr_HR' : 'en_GB'}">
<meta property="og:image" content="${SITE}/assets/brand/aktual-media-${lang}-og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="AKTUAL MEDIA — svjetsko izdanje">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${SITE}/assets/brand/aktual-media-${lang}-og.jpg">
<script type="application/ld+json">${ld(lang, title, desc, canonical)}</script>
</head>
<body>
<div class="pr-topbar"><div class="pr-wrap pr-top">
  <span class="pr-brand">AKTUAL MEDIA</span>
  <nav class="pr-nav" aria-label="${hr ? 'Navigacija proizvoda' : 'Products navigation'}">
    <a href="/gnk-aktual/">${T.back}</a>
    <a href="/izdanja/">${T.all}</a>
    <a href="/status/">${T.status}</a>
    <a href="${hr ? '/en/aktual-media/proizvodi/' : '/aktual-media/proizvodi/'}" hreflang="${hr ? 'en' : 'hr'}" lang="${hr ? 'en' : 'hr'}">${hr ? 'English' : 'Hrvatski'}</a>
  </nav>
</div></div>
<main class="pr-wrap">
  <header class="pr-head">
    <p class="pr-kicker">${T.kicker}</p>
    <h1>${T.h1}</h1>
    <p class="pr-lead">${T.lead}</p>
  </header>

  <section class="pr-sec" aria-labelledby="gradovi">
    <h2 id="gradovi">${T.cities}</h2>
    <p>${T.citiesNote}</p>
    <ul class="pr-grid">${cityCards(lang)}</ul>
  </section>

  <section class="pr-sec" aria-labelledby="deskovi">
    <h2 id="deskovi">${T.desks}</h2>
    <p>${T.desksNote}</p>
    <ul class="pr-grid">${deskCards(lang)}</ul>
  </section>

  <section class="pr-sec" aria-labelledby="platforme">
    <h2 id="platforme">${T.platforms}</h2>
    <p>${T.platformsNote}</p>
    <ul class="pr-grid">${platformCards(lang)}</ul>
  </section>

  <p class="pr-note">${T.note}</p>
</main>
<footer class="pr-foot"><div class="pr-wrap">
  <p><strong>AKTUAL MEDIA</strong> · ${T.foot}</p>
  <p><a href="mailto:info@gnk-asg.hr">info@gnk-asg.hr</a> · <a href="/gnk-aktual/">AKTUAL MEDIA</a> · <a href="/izdanja/sitemap.xml">Sitemap izdanja</a> · <a href="/status/">${T.status}</a> · <a href="/data/aktual-products-v1.json">${hr ? 'Strojno čitljiv popis' : 'Machine-readable list'}</a> · <a href="/llms.txt">llms.txt</a></p>
</div></footer>
</body>
</html>
`;
}

mkdirSync(dirname(CSS_FILE), { recursive: true });
writeFileSync(CSS_FILE, css);

const targets = [
  [join(PORTAL, 'aktual-media', 'proizvodi', 'index.html'), page('hr')],
  [join(PORTAL, 'en', 'aktual-media', 'proizvodi', 'index.html'), page('en')]
];
for (const [file, html] of targets) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

/* Sitemap: dva nova unosa s hreflang parom. */
const sitemapFile = join(PORTAL, 'sitemap.xml');
let sitemapChanged = 0;
if (existsSync(sitemapFile)) {
  let xml = readFileSync(sitemapFile, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  for (const loc of [`${SITE}/aktual-media/proizvodi/`, `${SITE}/en/aktual-media/proizvodi/`]) {
    const block = `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority><xhtml:link rel="alternate" hreflang="hr" href="${SITE}/aktual-media/proizvodi/"/><xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/aktual-media/proizvodi/"/><xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/aktual-media/proizvodi/"/></url>`;
    const existing = new RegExp(`  <url><loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>[\\s\\S]*?</url>`);
    if (existing.test(xml)) {
      const next = xml.replace(existing, block);
      if (next !== xml) { xml = next; sitemapChanged += 1; }
    } else {
      xml = xml.replace('</urlset>', `${block}\n</urlset>`);
      sitemapChanged += 1;
    }
  }
  writeFileSync(sitemapFile, xml);
}

/* ---------- strojno čitljiv popis proizvoda ---------- */
const catalog = {
  version: 'GNK_ASG_PRODUCTS_HUB_V1_20261022',
  publisher: {
    name: 'AKTUAL MEDIA d.o.o.',
    url: `${SITE}/gnk-aktual/`,
    editor: 'Nermin Sefić',
    editorUrl: `${SITE}/nermin-sefic/`
  },
  generatedFor: new Date().toISOString().slice(0, 10),
  counts: { cities: channels.length, desks: DESKS.length, platforms: PLATFORMS.length, items: channels.reduce((a, c) => a + itemsFor(c.id), 0) },
  products: [
    ...channels.map((c) => ({ type: 'city-edition', id: c.id, language: c.lang, name: `${(CITY_COPY[c.id] || [c.id])[0]}`, url: `${SITE}/kanal/${c.id}/`, items: itemsFor(c.id) })),
    ...DESKS.map(([slug, name]) => ({ type: 'desk', id: slug, name, url: `${SITE}/izdanja/${slug}/` })),
    ...PLATFORMS.map(([url, name]) => ({ type: 'platform', name, url: url.startsWith('http') ? url : `${SITE}${url}` }))
  ],
  pages: {
    hr: `${SITE}/aktual-media/proizvodi/`,
    en: `${SITE}/en/aktual-media/proizvodi/`
  }
};
mkdirSync(join(PORTAL, 'data'), { recursive: true });
writeFileSync(join(PORTAL, 'data', 'aktual-products-v1.json'), `${JSON.stringify(catalog, null, 2)}\n`);

/* ---------- llms.txt: jedan marker-blok, uvijek isti sadržaj ---------- */
const llmsBlock = `<!-- AKTUAL-PRODUCTS-LLMS:START -->
## AKTUAL MEDIA — products
- One page listing every product: ${SITE}/aktual-media/proizvodi/ (HR) · ${SITE}/en/aktual-media/proizvodi/ (EN)
- ${channels.length} city editions in ${new Set(channels.map((c) => c.lang)).size} languages, ${DESKS.length} desks, ${PLATFORMS.length} platforms; ${catalog.counts.items} archived stories.
- Machine-readable catalogue: ${SITE}/data/aktual-products-v1.json
- Freshness of every edition, measured from the archive: ${SITE}/status/
- City editions are listed at ${SITE}/kanal/ and linked from the index above; each edition keeps its own language, domain, sitemap and feed.
<!-- AKTUAL-PRODUCTS-LLMS:END -->`;
for (const name of ['llms.txt', 'llms-full.txt']) {
  const file = join(PORTAL, name);
  if (!existsSync(file)) continue;
  let txt = readFileSync(file, 'utf8');
  const re = /<!-- AKTUAL-PRODUCTS-LLMS:START -->[\s\S]*?<!-- AKTUAL-PRODUCTS-LLMS:END -->/;
  if (re.test(txt)) txt = txt.replace(re, llmsBlock);
  else txt = `${txt.replace(/\s+$/, '')}\n\n${llmsBlock}\n`;
  writeFileSync(file, txt);
}

console.log(JSON.stringify({
  ok: true,
  version: 'GNK_ASG_PRODUCTS_HUB_V1_20261022',
  cities: channels.length,
  desks: DESKS.length,
  platforms: PLATFORMS.length,
  items: channels.reduce((a, c) => a + itemsFor(c.id), 0),
  sitemapChanged,
  catalogProducts: catalog.products.length
}, null, 2));
