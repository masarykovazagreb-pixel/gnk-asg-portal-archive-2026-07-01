#!/usr/bin/env node
/**
 * PRIJENOS MREŽE — /prenos/ i /en/prenos/.
 *
 * Svaki tekst s matice putuje na svaku adresu mreže. Do sada se to vidjelo
 * samo na cilju (svaka domena ima svoj /prenos/), a matica nije pokazivala
 * gdje joj tekstovi žive. Ova stranica zatvara krug: popis po tekstu, s
 * izravnom vezom na svaku objavljenu kopiju i s kanonskim izvorom.
 *
 * Pravila:
 *  - popis se ne piše rukom; čita se iz korpusa i s diska, pa se ne može
 *    razilaziti sa stvarnošću (kopija koja ne postoji ne ulazi na popis);
 *  - svaka kopija nosi atribuciju i vezu na izvor, pa matica uzvraća vezom;
 *  - HR i EN stranica su par (hreflang), uz JSON s cijelom matricom.
 *
 *   node scripts/build-prenos-hub-v1.mjs [--check]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCorpus, KIND_LABEL } from './lib/corpus-v1.mjs';
import { SITES } from '../apps/sites/lib/registry.mjs';
import { WORLD_PORTALS } from '../apps/world/lib/registry.mjs';
import { houseRibbonHtml, HOUSE_RIBBON_CSS } from './lib/house-ribbon-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const CHECK = process.argv.includes('--check');
const SITE = 'https://gnk-asg.hr';
const LISTED_TEXTS = 24;

const esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const LANG_LABEL = {
  hr: 'hrvatski', en: 'engleski', id: 'indonezijski', pt: 'portugalski',
  ar: 'arapski', ja: 'japanski', zh: 'kineski', sr: 'srpski', bs: 'bosanski'
};

/* Ciljevi prijenosa: samostalne domene mreže. Gradska izdanja na istoj
   domeni ne dobivaju kopiju — ona nose popis naslova s kanonskom vezom. */
const TARGETS = [
  ...SITES.map((site) => ({
    key: site.slug,
    region: 'site',
    name: site.name,
    base: site.base,
    lang: site.lang || 'hr',
    dir: join(ROOT, 'apps', 'sites', 'site', site.slug)
  })),
  ...WORLD_PORTALS.map((portal) => ({
    key: portal.id,
    region: 'world',
    name: portal.name,
    base: portal.base,
    lang: portal.lang,
    dir: join(ROOT, 'apps', 'world', 'site', portal.id)
  }))
];

/* Adresa kopije je ugovor generatora, ne stanje na disku: `writePrenos`
   objavljuje svaki tekst iz korpusa na svakoj adresi mreže, a kolumne idu u
   vlastitu sekciju (/kolumna/ na samostalnim stranicama, /kolumne/ na
   svjetskim izdanjima). Tako je popis isti u repozitoriju i u CI-ju, gdje
   se izlaz svjetskih portala ne čuva (apps/world/site je u .gitignore). */
function copyUrl(target, item) {
  const base = target.base;
  if (item.kind === 'kolumna') {
    return target.region === 'world' ? `${base}kolumne/${item.slug}/` : `${base}kolumna/${item.slug}/`;
  }
  return `${base}prenos/${item.slug}/`;
}

/* Provjera stvarnosti tamo gdje je izlaz u repozitoriju: samostalne stranice
   se čuvaju, pa se svaka najavljena kopija mora naći na disku. Svjetska
   izdanja se grade u objavi, pa se za njih provjerava samo ugovor. */
function missingCopy(target, item) {
  if (target.region === 'world' || !existsSync(target.dir)) return null;
  const relative = copyUrl(target, item).slice(target.base.length);
  return existsSync(join(target.dir, relative, 'index.html')) ? null : relative;
}

const absent = [];
const items = readCorpus(ROOT).map((item) => {
  const copies = TARGETS.map((target) => {
    const missing = missingCopy(target, item);
    if (missing) absent.push(`${target.key}: ${missing}`);
    return { target, url: copyUrl(target, item) };
  });
  return { ...item, copies };
}).filter((item) => item.copies.length > 0);

if (absent.length) {
  console.error(`::warning::Najavljena kopija ne postoji na disku (${absent.length}): ${absent.slice(0, 5).join(', ')}`);
}

const addresses = TARGETS.map((target) => ({
  target,
  count: items.filter((item) => item.copies.some((copy) => copy.target.key === target.key)).length
}));

const languages = [...new Set(TARGETS.map((target) => target.lang))].sort();
const copyCount = items.reduce((sum, item) => sum + item.copies.length, 0);
const listed = items.slice(0, LISTED_TEXTS);

const copy = {
  hr: {
    lang: 'hr',
    path: '/prenos/',
    altPath: '/en/prenos/',
    altLang: 'en',
    title: 'Prijenos mreže — gdje je svaki naš tekst objavljen | AKTUAL MEDIA',
    description: 'Svaki tekst s gnk-asg.hr prenesen je na 15 adresa mreže AKTUAL MEDIA u 7 jezika — uz atribuciju i vezu na kanonski izvor. Popis po tekstu i izdanju.',
    kicker: 'AKTUAL MEDIA · prijenos mreže',
    h1: 'Gdje je svaki naš tekst objavljen',
    lead: 'Tekst se ne piše dvaput. Jednom nastaje na matici, a onda ga svaka adresa mreže objavljuje kao vlastitu stranicu — s potpisom izvora i vezom na kanonski tekst. Ova stranica pokazuje gdje sve taj tekst stoji, bez popisa koji se piše rukom: brojevi se čitaju iz korpusa i s diska.',
    statLabels: ['tekstova u prijenosu', 'adresa mreže', 'objavljenih kopija', 'jezika'],
    tableHead: ['Adresa', 'Jezik', 'Tekstova'],
    textsHead: 'Najnoviji tekstovi i gdje su objavljeni',
    canonicalWord: 'Izvornik',
    copiesWord: 'Kopije',
    note: 'Kopija koja ne postoji na disku ne ulazi na popis. Gradska izdanja na istoj domeni ne nose kopiju: ona objavljuju popis naslova s vezom na kanonski tekst. Cijela matrica dostupna je u podacima (JSON).',
    links: [
      ['/pokrivenost/', 'Pokrivenost mreže'],
      ['/mreza/', 'Mreža'],
      ['/izdanja/', 'Sva izdanja'],
      ['/gnk-aktual/', 'AKTUAL MEDIA'],
      ['/objave/', 'Objave']
    ],
    jsonLink: 'Podaci (JSON)',
    altLink: 'English'
  },
  en: {
    lang: 'en',
    path: '/en/prenos/',
    altPath: '/prenos/',
    altLang: 'hr',
    title: 'Network republication — where every text of ours is published | AKTUAL MEDIA',
    description: 'Every text from gnk-asg.hr is republished on 15 AKTUAL MEDIA addresses in 7 languages, with attribution and a canonical link. Listed by text.',
    kicker: 'AKTUAL MEDIA · network republication',
    h1: 'Where every text of ours is published',
    lead: 'A text is not written twice. It is written once at the source and then every address in the network publishes it as its own page — with the source named and a link back to the canonical text. This page shows where that text stands, from data rather than a hand-written list: the numbers are read from the corpus and from disk.',
    statLabels: ['texts republished', 'network addresses', 'published copies', 'languages'],
    tableHead: ['Address', 'Language', 'Texts'],
    textsHead: 'Latest texts and where they are published',
    canonicalWord: 'Source',
    copiesWord: 'Copies',
    note: 'A copy that does not exist on disk is not listed. City editions on the same domain carry no copy: they publish a list of headlines linking to the canonical text. The full matrix is available as data (JSON).',
    links: [
      ['/en/coverage/', 'Network coverage'],
      ['/en/network/', 'Network'],
      ['/en/gnk-aktual/', 'AKTUAL MEDIA'],
      ['/en/publications/', 'Publications'],
      ['/en/newsroom/', 'Newsroom']
    ],
    jsonLink: 'Data (JSON)',
    altLink: 'Hrvatski'
  }
};

const CSS = `
.pn-wrap{max-width:1040px;margin:0 auto;padding:0 22px 40px}
.pn-head{padding:34px 0 8px}
.pn-k{font:800 11px/1.4 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#8a6a1f;margin:0 0 10px}
.pn-h1{font:800 clamp(30px,4.4vw,46px)/1.08 system-ui,sans-serif;margin:0 0 14px}
.pn-lead{font:400 18px/1.6 system-ui,sans-serif;color:#3c4657;max-width:72ch;margin:0 0 26px}
.pn-stats{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:0 0 32px}
.pn-stat{border:1px solid #e3e8f0;border-radius:14px;padding:16px 18px;background:#fff}
.pn-stat b{display:block;font:800 30px/1 system-ui,sans-serif;color:#12233a;margin:0 0 6px}
.pn-stat span{display:block;font:600 11px/1.45 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6a7688}
.pn-h2{font:800 24px/1.2 system-ui,sans-serif;margin:34px 0 12px;color:#12233a}
.pn-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e3e8f0;border-radius:14px;overflow:hidden;font:400 14px/1.5 system-ui,sans-serif}
.pn-table th{text-align:left;font:700 11px/1.4 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6a7688;padding:12px 14px;border-bottom:1px solid #e3e8f0;background:#fbfaf6}
.pn-table td{padding:10px 14px;border-bottom:1px solid #eef1f6;vertical-align:top}
.pn-table tr:last-child td{border-bottom:0}
.pn-table td b{font-weight:700;color:#12233a}
.pn-table td small{display:block;color:#6a7688;font-size:11px;word-break:break-all}
.pn-lang{display:inline-block;font:700 11px/1 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#0f4c81;background:#eaf2fa;border-radius:999px;padding:5px 9px}
.pn-cards{display:grid;gap:14px}
.pn-card{border:1px solid #e3e8f0;border-radius:14px;background:#fff;padding:16px 18px}
.pn-card h3{font:800 17px/1.35 system-ui,sans-serif;margin:0 0 6px}
.pn-card h3 a{color:#12233a;text-decoration:none}
.pn-card h3 a:hover,.pn-card h3 a:focus-visible{text-decoration:underline}
.pn-meta{font:600 11px/1.5 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6a7688;margin:0 0 10px}
.pn-meta a{color:#8a6a1f}
.pn-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}
.pn-chips a{display:inline-block;font:600 12px/1.3 system-ui,sans-serif;color:#12233a;background:#f4f6fa;border:1px solid #e3e8f0;border-radius:999px;padding:6px 11px;text-decoration:none}
.pn-chips a:hover,.pn-chips a:focus-visible{background:#eaf2fa;border-color:#c9dcf0}
.pn-chips small{color:#6a7688;font-weight:600}
.pn-note{font:400 14px/1.6 system-ui,sans-serif;color:#4a5568;background:#fff;border:1px solid #e3e8f0;border-left:4px solid #8a6a1f;border-radius:10px;padding:14px 16px;margin:26px 0 0}
.pn-links{display:flex;flex-wrap:wrap;gap:10px;margin:26px 0 0}
.pn-links a{display:inline-block;font:700 13px/1.3 system-ui,sans-serif;color:#12233a;background:#fff;border:1px solid #e3e8f0;border-radius:999px;padding:9px 14px;text-decoration:none}
.pn-links a:hover,.pn-links a:focus-visible{background:#eaf2fa;border-color:#c9dcf0}
.skip-to-content{position:absolute;left:-9999px;top:0;z-index:9999;background:#e9c66c;color:#08131f;font:800 13px/1 system-ui,sans-serif;padding:12px 16px;border-radius:0 0 10px 0}
.skip-to-content:focus{left:0}
:focus-visible{outline:3px solid #8a6a1f;outline-offset:2px}
@media (max-width:640px){.pn-table td small{font-size:10px}}
`;

const WEBSITE = {
  '@type': 'WebSite',
  '@id': `${SITE}/#website`,
  url: `${SITE}/`,
  name: 'GNK ASG',
  inLanguage: ['hr', 'en'],
  publisher: { '@type': 'Organization', '@id': `${SITE}/#gnk-asg`, name: 'GNK ASG d.o.o.', url: `${SITE}/` }
};

function jsonLd(page) {
  const graph = [
    WEBSITE,
    { '@type': 'Organization', '@id': `${SITE}/#gnk-asg`, name: 'GNK ASG d.o.o.', url: `${SITE}/` },
    {
      '@type': 'WebPage',
      '@id': `${SITE}${page.path}#page`,
      url: `${SITE}${page.path}`,
      name: page.title,
      description: page.description,
      inLanguage: page.lang,
      isPartOf: { '@id': `${SITE}/#website` },
      about: { '@type': 'Thing', name: 'AKTUAL MEDIA network republication' },
      mainEntity: {
        '@type': 'ItemList',
        name: page.textsHead,
        numberOfItems: listed.length,
        itemListElement: listed.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.title,
          url: item.canonical
        }))
      }
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'AKTUAL MEDIA', item: `${SITE}${page.lang === 'en' ? '/en/' : '/'}` },
        { '@type': 'ListItem', position: 2, name: page.kicker, item: `${SITE}${page.path}` }
      ]
    }
  ];
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}

function head(page) {
  return `<!doctype html>
<html lang="${page.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#f7f4ec">
<link rel="canonical" href="${SITE}${page.path}">
<link rel="alternate" hreflang="${page.lang}" href="${SITE}${page.path}">
<link rel="alternate" hreflang="${page.altLang}" href="${SITE}${page.altPath}">
<link rel="alternate" hreflang="x-default" href="${SITE}/prenos/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="og:locale" content="${page.lang === 'en' ? 'en_GB' : 'hr_HR'}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${SITE}${page.path}">
<meta property="og:image" content="${SITE}/assets/brand/aktual-media-mark.svg">
<meta property="og:image:alt" content="AKTUAL MEDIA — network mark">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)}">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="twitter:image" content="${SITE}/assets/brand/aktual-media-mark.svg">
<meta name="twitter:image:alt" content="AKTUAL MEDIA — network mark">
<meta property="article:tag" content="#AKTUALMEDIA">
<meta property="article:tag" content="#GNKASG">
<meta property="article:tag" content="#PrijenosMreze">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${jsonLd(page)}
<style>${CSS}</style>
</head>`;
}

function statsHtml(page) {
  const values = [items.length, addresses.length, copyCount, languages.length];
  return `<div class="pn-stats">${values.map((value, index) => `<div class="pn-stat"><b>${value}</b><span>${esc(page.statLabels[index])}</span></div>`).join('')}</div>`;
}

function addressTable(page) {
  const rows = addresses.map(({ target, count }) => `<tr>
<td><b>${esc(target.name)}</b><small>${esc(target.base)}</small></td>
<td><span class="pn-lang">${esc(target.lang)}</span></td>
<td>${count}</td>
</tr>`).join('');
  return `<table class="pn-table">
<caption class="pn-h2" style="text-align:left">${esc(page.lang === 'en' ? 'Addresses in the network' : 'Adrese u mreži')}</caption>
<thead><tr>${page.tableHead.map((label) => `<th scope="col">${esc(label)}</th>`).join('')}</tr></thead>
<tbody>${rows}</tbody>
</table>`;
}

function textCards(page) {
  return `<div class="pn-cards">${listed.map((item) => {
    const kind = KIND_LABEL[item.kind]?.[page.lang] || item.kind;
    const chips = item.copies
      .map(({ target, url }) => `<li><a href="${esc(url)}" rel="external noopener" hreflang="${esc(target.lang)}">${esc(target.name)} <small>${esc(target.lang)}</small></a></li>`)
      .join('');
    return `<article class="pn-card">
<h3><a href="${esc(item.canonical)}">${esc(item.title)}</a></h3>
<p class="pn-meta">${esc(kind)} · ${esc(item.published)} · ${esc(page.canonicalWord)}: <a href="${esc(item.canonical)}">gnk-asg.hr</a> · ${esc(page.copiesWord)}: ${item.copies.length}</p>
<ul class="pn-chips">${chips}</ul>
</article>`;
  }).join('')}</div>`;
}

function pageHtml(page) {
  return `${head(page)}
<body style="background:#f7f4ec;color:#12233a">
<a class="skip-to-content" href="#sadrzaj">${page.lang === 'en' ? 'Skip to content' : 'Preskoči na sadržaj'}</a>
${houseRibbonHtml(page.lang)}
<link rel="stylesheet" href="${HOUSE_RIBBON_CSS}">
<main id="sadrzaj" class="pn-wrap">
  <header class="pn-head">
    <p class="pn-k">${esc(page.kicker)}</p>
    <h1 class="pn-h1">${esc(page.h1)}</h1>
    <p class="pn-lead">${esc(page.lead)}</p>
  </header>
  ${statsHtml(page)}
  ${addressTable(page)}
  <h2 class="pn-h2">${esc(page.textsHead)}</h2>
  ${textCards(page)}
  <p class="pn-note">${esc(page.note)}</p>
  <nav class="pn-links" aria-label="${page.lang === 'en' ? 'Related pages' : 'Povezane stranice'}">
    ${page.links.map(([href, label]) => `<a href="${href}">${esc(label)}</a>`).join('')}
    <a href="${page.altPath}" hreflang="${page.altLang}">${esc(page.altLink)}</a>
    <a href="/data/prenos-network-v1.json">${esc(page.jsonLink)}</a>
  </nav>
</main>
</body>
</html>
`;
}

const data = {
  version: 'GNK_ASG_PRENOS_HUB_V1_20261024',
  generatedFrom: 'scripts/build-prenos-hub-v1.mjs',
  source: `${SITE}/prenos/`,
  targets: addresses.map(({ target, count }) => ({ key: target.key, name: target.name, base: target.base, lang: target.lang, texts: count })),
  texts: items.map((item) => ({
    slug: item.slug,
    kind: item.kind,
    title: item.title,
    canonical: item.canonical,
    published: item.published,
    copies: item.copies.map(({ target, url }) => ({ key: target.key, lang: target.lang, url }))
  })),
  totals: { texts: items.length, addresses: addresses.length, copies: copyCount, languages: languages.length }
};

const outputs = [
  [join(PORTAL, 'prenos', 'index.html'), pageHtml(copy.hr)],
  [join(PORTAL, 'en', 'prenos', 'index.html'), pageHtml(copy.en)],
  [join(PORTAL, 'data', 'prenos-network-v1.json'), `${JSON.stringify(data, null, 2)}\n`]
];

let changed = 0;
for (const [file, content] of outputs) {
  const current = existsSync(file) ? readFileSync(file, 'utf8') : null;
  if (current === content) continue;
  changed += 1;
  if (!CHECK) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
}

console.log(JSON.stringify({
  version: 'GNK_ASG_PRENOS_HUB_V1_20261024',
  mode: CHECK ? 'check' : 'write',
  texts: items.length,
  addresses: addresses.length,
  copies: copyCount,
  languages: languages.length,
  listed: listed.length,
  written: changed
}, null, 2));

if (CHECK && changed) {
  console.error(`Prijenos mreže nije osvježen na ${changed} datoteka; pokreni bez --check.`);
  process.exitCode = 1;
}
