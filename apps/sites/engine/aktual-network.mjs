/**
 * AKTUAL MEDIA — mreža izdanja.
 *
 * Šest neovisnih stranica ima vlastite domene, ali jednog izdavača. Ova
 * datoteka gradi mjesto na matičnoj domeni gdje se sve vodi pod AKTUAL MEDIA:
 *
 *   /gnk-aktual/mreza/            — popis svih 62 stranice, po izdanju
 *   /en/gnk-aktual/network/       — isti popis na engleskom
 *   /data/mreza-pages-v1.json     — strojni popis svih stranica
 *   /mreza/feed.xml               — Atom feed svih stranica mreže
 *   traka na /gnk-aktual/ i /en/gnk-aktual/
 *
 * Zašto ovako: stranice žive na svojim domenama (canonical ostaje tamo gdje
 * tekst jest), a matična domena dobiva indeks koji svakoj stranici daje
 * dolaznu poveznicu i jasnog izdavača. To je razlika između mreže i skupa
 * nepovezanih micrositeova.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { deskHashtags, tagSlug } from '../lib/seo.mjs';
import { entityGraphJson } from '../../../scripts/lib/entity-graph-v1.mjs';
import { join, dirname } from 'node:path';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const write = (file, body) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, body); };

const SITE = 'https://gnk-asg.hr';
const DESK_HR = `${SITE}/gnk-aktual/mreza/`;
const DESK_EN = `${SITE}/en/gnk-aktual/network/`;
const HUB_HR = `${SITE}/mreza/`;
const HUB_EN = `${SITE}/en/network/`;
const AKTUAL = `${SITE}/gnk-aktual/`;
const editionDesk = (lang, slug) => (lang === 'en' ? `${DESK_EN}${slug}/` : `${DESK_HR}${slug}/`);
const TAG_HR = `${DESK_HR}oznake/`;
const TAG_EN = `${DESK_EN}tags/`;
const tagDesk = (lang) => (lang === 'en' ? TAG_EN : TAG_HR);
const OG = `${SITE}/assets/izdanja/aktual-media-og.jpg`;
const MARK_START = '<!-- AKTUAL-MREZA-BAND:START -->';
const MARK_END = '<!-- AKTUAL-MREZA-BAND:END -->';

const T = {
  hr: {
    lang: 'hr', other: 'en',
    title: 'AKTUAL MEDIA — mreža izdanja: svi tekstovi pod jednim izdavačem | GNK ASG',
    description: 'AKTUAL MEDIA vodi šest neovisnih izdanja na vlastitim domenama: BOR USA, KOŠARKA 360, SCENA ZNANOSTI, STEP BUDUĆNOSTI, ZDRAVLJE 360 i privremeni desk IZBORI U SRBIJI. Popis svake stranice na hrvatskom i engleskom, s izvorom i urednikom.',
    kicker: 'AKTUAL MEDIA · mreža izdanja',
    h1: 'Svi tekstovi mreže, pod jednim izdavačem',
    lead: 'Šest neovisnih izdanja ima vlastite domene, vlastite sitemape i vlastite arhive — ali istog izdavača, istog urednika i isti standard: izvor za svaku brojku, datum za svaki izvor, ispravak na mjestu pogreške. Ovdje je popis svake stranice, da se svaki tekst može naći s matične domene.',
    stats: null,
    editions: 'Izdanja i njihove stranice',
    editionsLead: 'Naslovi i opisi ispod isti su oni koje stranica nosi u svom naslovu i opisu za tražilice. Ništa se ne prepisuje ni ne skraćuje za ovaj popis.',
    pages: 'Sve stranice',
    pagesLead: 'Popis je potpun: svaka stranica svakog izdanja, na oba jezika. Ako ovdje nečega nema, to izdanje nije objavljeno.',
    govTitle: 'Kako se mreža vodi pod AKTUAL MEDIA',
    gov: [
      ['Canonical ostaje na izdanju', 'Svaka stranica ima canonical na svojoj domeni. Ovaj popis je indeks, ne kopija — pa nema dvostrukog sadržaja.'],
      ['Jedan izdavač, jasno naveden', 'Publisher je AKTUAL MEDIA d.o.o., urednik i direktor Nermin Sefić. To stoji u JSON-LD-u, meta oznakama i podnožju svake stranice.'],
      ['Vlastiti sitemap i feed po izdanju', 'Svako izdanje ima /sitemap.xml, /feed.xml i /robots.txt. Matična domena drži indeks i zbirni feed, ne tuđe sitemape.'],
      ['Ispravak na mjestu pogreške', 'Ako se tekst ispravi, ispravak se objavljuje na stranici na kojoj je pogreška nastala — indeks se tada samo osvježi.'],
    ],
    dataTitle: 'Strojni pristup',
    dataLead: 'Popis stranica, feed i sitemapi su javni. Crawler ne mora pogađati strukturu.',
    backHub: 'Mrežni hub (GNK ASG)', desk: 'AKTUAL MEDIA', editionsLink: 'Sva izdanja',
    jsonLink: 'Popis stranica (JSON)', feedLink: 'Zbirni feed (Atom)',
    footer: 'Mreža je dio AKTUAL MEDIA d.o.o. i GNK ASG mreže. Svaka stranica ima vlastitu domenu, sitemap i feed; ovaj indeks ih povezuje.',
    bandTitle: 'Šest izdanja pod AKTUAL MEDIA',
    bandLead: 'Teme koje su na matičnoj stranici bile prekratko obrađene dobile su vlastite domene — i istog izdavača. Popis svake stranice je na jednom mjestu.',
    bandCta: 'Otvori mrežu izdanja AKTUAL MEDIA',
  },
  en: {
    lang: 'en', other: 'hr',
    title: 'AKTUAL MEDIA — network of editions: every text under one publisher | GNK ASG',
    description: 'AKTUAL MEDIA runs six independent editions on their own domains: BOR USA, KOŠARKA 360, SCENA ZNANOSTI, STEP BUDUĆNOSTI, ZDRAVLJE 360 and the temporary IZBORI U SRBIJI desk. Every page listed in Croatian and English, with source and editor.',
    kicker: 'AKTUAL MEDIA · network of editions',
    h1: 'Every text in the network, under one publisher',
    lead: 'Six independent editions have their own domains, sitemaps and archives — but one publisher, one editor and one standard: a source for every figure, a date for every source, a correction where the error was made. Here is every page, so any text can be found from the parent domain.',
    stats: null,
    editions: 'Editions and their pages',
    editionsLead: 'The titles and descriptions below are the same ones each page carries in its search title and description. Nothing is rewritten or shortened for this list.',
    pages: 'All pages',
    pagesLead: 'The list is complete: every page of every edition, in both languages. If something is missing here, that edition was not published.',
    govTitle: 'How the network is held under AKTUAL MEDIA',
    gov: [
      ['Canonical stays with the edition', 'Every page has a canonical on its own domain. This list is an index, not a copy — so there is no duplicate content.'],
      ['One publisher, clearly named', 'The publisher is AKTUAL MEDIA d.o.o.; the editor and director is Nermin Sefić. That appears in JSON-LD, meta tags and the footer of every page.'],
      ['Own sitemap and feed per edition', 'Each edition has /sitemap.xml, /feed.xml and /robots.txt. The parent domain holds the index and the combined feed, not other sites’ sitemaps.'],
      ['A correction where the error was made', 'If a text is corrected, the correction is published on the page where the error occurred — the index is then refreshed.'],
    ],
    dataTitle: 'Machine access',
    dataLead: 'The page list, the feed and the sitemaps are public. A crawler should not have to guess the structure.',
    backHub: 'Network hub (GNK ASG)', desk: 'AKTUAL MEDIA', editionsLink: 'All editions',
    jsonLink: 'Page list (JSON)', feedLink: 'Combined feed (Atom)',
    footer: 'The network is part of AKTUAL MEDIA d.o.o. and the GNK ASG network. Every page has its own domain, sitemap and feed; this index connects them.',
    bandTitle: 'Six editions under AKTUAL MEDIA',
    bandLead: 'Topics that were covered too briefly on the parent site received their own domains — and the same publisher. Every page is listed in one place.',
    bandCta: 'Open the AKTUAL MEDIA network of editions',
  },
};

const CSS = `*{box-sizing:border-box}
:root{--bg:#04080f;--ink:#eef3f9;--soft:#a9bad0;--gold:#e8c56a;--line:rgba(232,197,106,.22)}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:radial-gradient(1100px 600px at 84% -10%,rgba(232,197,106,.12),transparent 62%),radial-gradient(760px 460px at 6% 4%,rgba(116,182,255,.08),transparent 60%),var(--bg);color:var(--ink);font:16px/1.66 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:inherit;text-decoration:none}a:hover{text-decoration:underline;text-underline-offset:3px}
img{max-width:100%;display:block;height:auto}
.wrap{max-width:1140px;margin:0 auto;padding:0 clamp(16px,4vw,44px)}
.top{background:rgba(3,8,15,.86);border-bottom:1px solid #16304a;font:700 10.5px/1.4 system-ui;letter-spacing:.14em;text-transform:uppercase;color:#8ba1b8}
.top .wrap{display:flex;flex-wrap:wrap;gap:8px 18px;justify-content:space-between;padding:11px 0}
.top a{color:var(--gold)}
.hero{padding:clamp(32px,6vw,72px) 0 28px;border-bottom:1px solid var(--line)}
.hero .house{margin:0 0 16px}.hero .house img{height:48px;width:auto;max-width:220px;border-radius:6px}
.k{font:800 11px/1.4 system-ui;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin:0 0 12px}
h1{font:800 clamp(32px,5.6vw,64px)/1.04 Georgia,"Times New Roman",serif;letter-spacing:-.025em;margin:0 0 16px;max-width:20ch}
.sub{max-width:74ch;color:#c3d0e0;font-size:clamp(15px,1.5vw,18px);margin:0 0 22px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:0;padding:0;list-style:none}
.stats div{border:1px solid var(--line);border-radius:14px;padding:13px 15px;background:linear-gradient(180deg,rgba(12,26,44,.9),rgba(7,16,28,.7))}
.stats b{display:block;font:800 clamp(22px,3vw,32px)/1 Georgia,serif;color:var(--gold)}
.stats span{display:block;color:#93a7bf;font-size:11.5px;margin-top:6px}
section{padding:clamp(26px,4.5vw,48px) 0;border-bottom:1px solid #132840}
h2{font:800 clamp(24px,3.4vw,38px)/1.1 Georgia,serif;letter-spacing:-.015em;margin:0 0 10px}
section > p.lead{color:var(--soft);max-width:82ch;margin:0 0 18px}
.ed{border:1px solid var(--line);border-radius:18px;padding:18px 20px;margin:0 0 14px;background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.008))}
.ed h3{font:800 22px/1.2 Georgia,serif;margin:0 0 4px;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:baseline}
.ed h3 a{color:inherit}
.ed h3 span{font:800 10px/1 system-ui;letter-spacing:.14em;text-transform:uppercase;color:#8ba1b8;border:1px solid #24425f;border-radius:999px;padding:5px 9px}
.ed .tag{color:#cbd7e4;font-size:14px;margin:0 0 12px;max-width:80ch}
.pages{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.pages a{display:block;border:1px solid #16304a;border-radius:12px;padding:10px 13px;background:rgba(9,20,34,.6);transition:border-color .15s,transform .15s}
.pages a:hover{border-color:var(--gold);text-decoration:none;transform:translateY(-1px)}
.pages b{display:block;font:700 14.5px/1.35 Georgia,serif;color:#eef4fa}
.pages small{display:block;color:#8ba1b8;font-size:12px;line-height:1.45;margin-top:3px}
.pages .l{float:right;font:800 9.5px/1 system-ui;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin-left:8px}
.meta{display:flex;flex-wrap:wrap;gap:8px 14px;margin:12px 0 0;font:700 10.5px/1 system-ui;letter-spacing:.08em;text-transform:uppercase;color:#93a7bf}
.meta a{color:#d6e0ea;border-bottom:1px solid #24425f}
.rules{list-style:none;margin:18px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}
.rules li{border:1px solid #1b3852;border-radius:14px;padding:14px 16px;background:rgba(9,20,34,.6);font-size:13.5px;color:#b9c8d8}
.rules b{display:block;color:var(--gold);font:800 10.5px/1 system-ui;letter-spacing:.14em;text-transform:uppercase;margin-bottom:7px}
.links{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0 0}
.links a{border:1px solid #2c4a6b;border-radius:999px;padding:9px 14px;font:800 11px/1 system-ui;letter-spacing:.08em;text-transform:uppercase;color:#dbe5f1}
.links a:hover{border-color:var(--gold);color:var(--gold);text-decoration:none}
.tags{display:flex;flex-wrap:wrap;gap:7px;margin:14px 0 0;padding:0;list-style:none}
.tags a{display:inline-block;border:1px solid #24425f;border-radius:999px;padding:6px 11px;font:700 10.5px/1 system-ui;letter-spacing:.06em;color:#cfe0f2;background:rgba(9,20,34,.6)}
.tags a:hover{border-color:var(--gold);color:var(--gold);text-decoration:none}
.btn{display:inline-block;border:1px solid var(--gold);border-radius:999px;padding:10px 16px;font:800 11.5px/1 system-ui;letter-spacing:.1em;text-transform:uppercase;color:#0a0d12;background:var(--gold);margin-top:14px}
.btn:hover{text-decoration:none;filter:brightness(1.06)}
footer{padding:30px 0 54px;color:#8496ab;font-size:13px}
footer a{color:#d6e0ea}
.skip{position:absolute;left:-9999px;top:0;background:var(--gold);color:#08090c;font:800 13px/1 system-ui;padding:12px 18px}
.skip:focus{left:0}
:focus-visible{outline:3px solid #74b6ff;outline-offset:3px}
`;

const siteSlugForTag = (tag, sites) => {
  const match = sites.find((site) => (site.hashtags || []).some((item) => item.toLowerCase() === tag.toLowerCase()));
  return match ? match.slug : '';
};

const byEdition = (pages) => {
  const map = new Map();
  for (const page of pages) {
    if (!map.has(page.edition)) map.set(page.edition, []);
    map.get(page.edition).push(page);
  }
  return map;
};

const orderOf = (slug) => {
  if (slug === '') return -1;
  if (slug === 'metodologija') return 999;
  return 0;
};
const plural = (n, lang) => {
  if (lang === 'en') return `${n} ${n === 1 ? 'page' : 'pages'}`;
  const mod10 = n % 10; const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} stranica`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} stranice`;
  return `${n} stranica`;
};

function short(description, limit = 190) {
  const clean = String(description || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > 80 ? space : limit).replace(/[\s,;:–-]+$/, '')}…`;
}

function pageRow(page, lang) {
  const otherLang = lang === 'en' ? 'hr' : 'en';
  return `<li><a href="${page.url}" rel="external noopener" hreflang="${page.lang}" lang="${page.lang}">
    <span class="l">${page.lang.toUpperCase()}</span><b>${esc(page.title)}</b><small>${esc(short(page.description))}</small>
  </a></li>`;
}

function deskPage(lang, { sites, pages }) {
  const t = T[lang];
  const canonical = lang === 'en' ? DESK_EN : DESK_HR;
  const alternate = lang === 'en' ? DESK_HR : DESK_EN;
  const grouped = byEdition(pages);
  const counts = new Map([...grouped].map(([slug, list]) => [slug, list.length]));
  const total = pages.length;
  const perLang = pages.filter((page) => page.lang === lang).length;
  const hashtags = deskHashtags(sites);
  const keywords = [...hashtags.map((tag) => tag.replace('#', '')), 'AKTUAL MEDIA', lang === 'en' ? 'network of editions' : 'mreža izdanja', ...sites.map((site) => site.name), 'GNK ASG'].join(', ');
  const stats = lang === 'en'
    ? [[String(sites.length), 'editions'], [String(perLang), 'pages per language'], ['2', 'languages'], [String(sites.length), 'domains'], ['1', 'editor']]
    : [[String(sites.length), 'izdanja'], [String(perLang), 'stranica po jeziku'], ['2', 'jezika'], [String(sites.length), 'domena'], ['1', 'urednik']];

  const editions = sites.map((site) => {
    const list = (grouped.get(site.slug) || [])
      .filter((page) => page.lang === lang)
      .sort((a, b) => orderOf(a.slug) - orderOf(b.slug));
    return `<article class="ed" id="${site.slug}" style="border-left:4px solid ${site.accent}">
      <h3><a href="${site.url}/" rel="external noopener">${esc(site.name)}</a> <span>${esc(site.domain)}</span></h3>
      <p class="tag">${esc(site.tagline[lang])}</p>
      <ul class="pages">${list.map((page) => pageRow(page, lang)).join('')}</ul>
      <p class="meta">
        <span>${lang === 'en' ? `${counts.get(site.slug) || 0} pages (both languages)` : `${counts.get(site.slug) || 0} stranica (oba jezika)`}</span>
        <a href="${site.outputs.sitemap}">sitemap.xml</a>
        <a href="${site.outputs.feed}">feed.xml</a>
        <a href="${site.outputs.robots}">robots.txt</a>
        <a href="${editionDesk(lang, site.slug)}">${lang === 'en' ? `All ${site.name} pages` : `Sve stranice: ${site.name}`}</a>
      </p>
    </article>`;
  }).join('');

  const allRows = pages
    .filter((page) => page.lang === lang)
    .map((page) => `<li><a href="${page.url}" rel="external noopener"><b>${esc(page.title)}</b><small>${esc(page.editionName)} · ${esc(page.nav)}</small></a></li>`)
    .join('');

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': 'https://gnk-asg.hr/#website', name: 'GNK ASG', url: 'https://gnk-asg.hr/', inLanguage: ['hr', 'en'], publisher: { '@id': 'https://gnk-asg.hr/#gnk-asg' } },
      { '@type': 'Organization', '@id': 'https://gnk-asg.hr/#gnk-asg', name: 'GNK ASG d.o.o.', url: 'https://gnk-asg.hr/' },
      {
        '@type': 'NewsMediaOrganization', '@id': 'https://gnk-asg.hr/#aktual-media', name: 'AKTUAL MEDIA d.o.o.', url: AKTUAL,
        parentOrganization: { '@id': 'https://gnk-asg.hr/#gnk-asg' }, editor: { '@id': 'https://gnk-asg.hr/#nermin-sefic' },
        brand: { '@type': 'Brand', name: 'AKTUAL MEDIA', url: AKTUAL },
        owns: sites.map((site) => ({ '@type': 'Brand', name: site.name, url: `${site.url}/` })),
      },
      { '@type': 'Person', '@id': 'https://gnk-asg.hr/#nermin-sefic', name: 'Nermin Sefić', jobTitle: lang === 'en' ? 'Editor and director' : 'Urednik i direktor', url: 'https://gnk-asg.hr/nermin-sefic/', worksFor: { '@id': 'https://gnk-asg.hr/#aktual-media' } },
      {
        '@type': 'CollectionPage', '@id': `${canonical}#page`, url: canonical, name: t.title, headline: t.h1, description: t.description,
        inLanguage: lang, datePublished: '2026-10-22', dateModified: new Date().toISOString().slice(0, 10),
        keywords: keywords,
        isPartOf: [{ '@id': 'https://gnk-asg.hr/#website' }, { '@id': `${HUB_HR}#page` }], author: { '@id': 'https://gnk-asg.hr/#aktual-media' },
        editor: { '@id': 'https://gnk-asg.hr/#nermin-sefic' }, publisher: { '@id': 'https://gnk-asg.hr/#aktual-media' },
        image: { '@type': 'ImageObject', url: OG, width: 1200, height: 630 },
        hasPart: sites.map((site) => ({ '@type': 'CreativeWork', name: site.name, url: `${site.url}/`, inLanguage: ['hr', 'en'], publisher: { '@id': 'https://gnk-asg.hr/#aktual-media' } })),
        mainEntity: { '@id': `${canonical}#lista` },
      },
      {
        '@type': 'ItemList', '@id': `${canonical}#lista`, name: t.pages, numberOfItems: total,
        itemListElement: pages.filter((page) => page.lang === lang).map((page, index) => ({
          '@type': 'ListItem', position: index + 1, name: page.title, url: page.url,
        })),
      },
      {
        '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'GNK ASG', item: 'https://gnk-asg.hr/' },
          { '@type': 'ListItem', position: 2, name: 'AKTUAL MEDIA', item: AKTUAL },
          { '@type': 'ListItem', position: 3, name: t.kicker, item: canonical },
        ],
      },
    ],
  };

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.description)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="publisher" content="AKTUAL MEDIA d.o.o.">
<meta name="copyright" content="AKTUAL MEDIA d.o.o.">
<meta name="keywords" content="${esc(keywords)}">
<meta name="news_keywords" content="${esc(keywords)}">
<meta name="hashtags" content="${esc(hashtags.join(' '))}">
<meta name="theme-color" content="#04080f">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${lang}" href="${canonical}">
<link rel="alternate" hreflang="${t.other}" href="${alternate}">
<link rel="alternate" hreflang="x-default" href="${DESK_HR}">
<link rel="alternate" type="application/atom+xml" title="AKTUAL MEDIA — mreža" href="/mreza/feed.xml">
<link rel="alternate" type="application/json" title="Mreža — popis stranica" href="/data/mreza-pages-v1.json">
<link rel="alternate" type="text/markdown" title="Mreža — Markdown" href="/gnk-aktual/mreza/index.md">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AKTUAL MEDIA · mreža izdanja">
<meta property="og:title" content="${esc(t.title)}">
<meta property="og:description" content="${esc(t.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${lang === 'en' ? 'en_GB' : 'hr_HR'}">
<meta property="og:image" content="${OG}">
<meta property="og:image:alt" content="AKTUAL MEDIA — mreža izdanja">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t.title)}">
<meta name="twitter:description" content="${esc(t.description)}">
<meta name="twitter:image" content="${OG}">
<meta name="twitter:image:alt" content="AKTUAL MEDIA — mreža izdanja">
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<meta name="editor" content="Nermin Sefić">
<meta property="article:tag" content="#AKTUALMEDIA">
<meta property="article:tag" content="#GNKASG">
<script type="application/ld+json" id="network-entity-v1">${entityGraphJson()}</script>
<link rel="author" href="https://gnk-asg.hr/nermin-sefic/">
</head>
<body>
<a class="skip" href="#main">${lang === 'en' ? 'Skip to content' : 'Preskoči na sadržaj'}</a>
<div class="top"><div class="wrap"><span>AKTUAL MEDIA d.o.o. · ${esc(t.kicker)}</span><span><a href="${AKTUAL}">${esc(t.desk)}</a> · <a href="${HUB_HR}">${esc(t.backHub)}</a> · <a href="/izdanja/">${esc(t.editionsLink)}</a> · <a href="${alternate}" hreflang="${t.other}" lang="${t.other}">${lang === 'en' ? 'Hrvatski' : 'English'}</a></span></div></div>
<main id="main">
<div class="hero"><div class="wrap">
  <div class="house"><img src="/assets/brand/aktual-media-en-1200.webp" alt="AKTUAL MEDIA — world edition" width="167" height="48" decoding="async"></div>
  <p class="k">${esc(t.kicker)}</p>
  <h1>${esc(t.h1)}</h1>
  <p class="sub">${esc(t.lead)}</p>
  <ul class="tags">${hashtags.map((tag) => `<li><a href="${HUB_HR}#${siteSlugForTag(tag, sites)}" rel="external noopener">${esc(tag)}</a></li>`).join('')}</ul>
  <ul class="stats">${stats.map(([n, l]) => `<li><div><b>${esc(n)}</b><span>${esc(l)}</span></div></li>`).join('')}</ul>
  <p class="links">
    <a href="/data/mreza-pages-v1.json">${esc(t.jsonLink)}</a>
    <a href="/mreza/feed.xml">${esc(t.feedLink)}</a>
    <a href="${lang === 'en' ? HUB_EN : HUB_HR}">${esc(t.backHub)}</a>
    <a href="${tagDesk(lang)}">${lang === 'en' ? 'All hashtags' : 'Sve oznake'}</a>
  </p>
</div></div>

<section><div class="wrap">
  <h2>${esc(t.editions)}</h2>
  <p class="lead">${esc(t.editionsLead)}</p>
  ${editions}
</div></section>

<section><div class="wrap">
  <h2>${esc(t.pages)}</h2>
  <p class="lead">${esc(t.pagesLead)}</p>
  <ul class="pages">${allRows}</ul>
</div></section>

<section><div class="wrap">
  <h2>${esc(t.govTitle)}</h2>
  <ul class="rules">${t.gov.map(([b, p]) => `<li><b>${esc(b)}</b>${esc(p)}</li>`).join('')}</ul>
  <h2 style="margin-top:28px">${esc(t.dataTitle)}</h2>
  <p class="lead">${esc(t.dataLead)}</p>
  <p class="links">
    <a href="/data/mreza-pages-v1.json">mreza-pages-v1.json</a>
    <a href="/data/mreza-v1.json">mreza-v1.json</a>
    <a href="/data/seo-matrix-v1.json">seo-matrix-v1.json</a>
    <a href="/glavni-gradovi/feed.json">prijestolnice · feed.json</a>
    <a href="/glavni-gradovi/feed.xml">prijestolnice · feed.xml</a>
    <a href="/mreza/sitemap.xml">sitemap.xml</a>
    <a href="/mreza/feed.xml">feed.xml</a>
    <a href="/mreza/feeds.opml">feeds.opml</a>
    <a href="${AKTUAL}">${esc(t.desk)}</a>
    <a href="/nermin-sefic/">Nermin Sefić</a>
  </p>
</div></section>
</main>
<footer><div class="wrap">
  <p>${esc(t.footer)}</p>
  <p class="iz-tags"><a href="/gnk-aktual/">#AKTUALMEDIA</a> · <a href="/gnk-aktual/">#GNKASG</a></p>
  <p>© 2026 AKTUAL MEDIA d.o.o. · <a href="/nermin-sefic/">Nermin Sefić</a> · ${lang === 'en' ? 'Editor and director' : 'Urednik i direktor'} · <a href="${HUB_HR}">${esc(t.backHub)}</a></p>
</div></footer>
</body>
</html>`;
}


function editionPage(lang, site, { sites, pages }) {
  const t = T[lang];
  const canonical = editionDesk(lang, site.slug);
  const alternate = editionDesk(lang === 'en' ? 'hr' : 'en', site.slug);
  const desk = lang === 'en' ? DESK_EN : DESK_HR;
  const list = pages
    .filter((page) => page.edition === site.slug && page.lang === lang)
    .sort((a, b) => orderOf(a.slug) - orderOf(b.slug));
  const count = pages.filter((page) => page.edition === site.slug).length;
  const tagline = String(site.tagline[lang] || '').trim();
  const hashtags = deskHashtags(sites, site.slug);
  const hashtagWords = hashtags.map((tag) => tag.replace('#', ''));
  const title = lang === 'en'
    ? `${site.name} — every page of the edition under AKTUAL MEDIA | GNK ASG`
    : `${site.name} — sve stranice izdanja pod AKTUAL MEDIA | GNK ASG`;
  const tail = lang === 'en'
    ? `All ${list.length} pages of this edition in English, plus the Croatian twin, under one publisher: AKTUAL MEDIA d.o.o. Editor and director: Nermin Sefić.`
    : `Svih ${list.length} stranica ovog izdanja na hrvatskom, uz engleski par, pod jednim izdavačem: AKTUAL MEDIA d.o.o. Urednik i direktor: Nermin Sefić.`;
  const description = short(`${tagline} ${tail}`, 315);
  const siblings = sites.filter((item) => item.slug !== site.slug);
  const rows = list.map((page) => pageRow(page, lang)).join('');
  const siblingRows = siblings.map((item) => `<li><a href="${editionDesk(lang, item.slug)}" style="border-left:3px solid ${item.accent}">
    <b>${esc(item.name)}</b><small>${esc(item.tagline[lang])}</small></a></li>`).join('');
  const aboutName = lang === 'en' ? `${site.name} edition` : `Izdanje ${site.name}`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': 'https://gnk-asg.hr/#website', name: 'GNK ASG', url: 'https://gnk-asg.hr/', inLanguage: ['hr', 'en'], publisher: { '@id': 'https://gnk-asg.hr/#gnk-asg' } },
      { '@type': 'Organization', '@id': 'https://gnk-asg.hr/#gnk-asg', name: 'GNK ASG d.o.o.', url: 'https://gnk-asg.hr/' },
      {
        '@type': 'NewsMediaOrganization', '@id': 'https://gnk-asg.hr/#aktual-media', name: 'AKTUAL MEDIA d.o.o.', url: AKTUAL,
        parentOrganization: { '@id': 'https://gnk-asg.hr/#gnk-asg' }, editor: { '@id': 'https://gnk-asg.hr/#nermin-sefic' },
        brand: { '@type': 'Brand', name: 'AKTUAL MEDIA', url: DESK_HR },
        owns: sites.map((item) => ({ '@type': 'Brand', name: item.name, url: `${item.url}/` })),
      },
      { '@type': 'Person', '@id': 'https://gnk-asg.hr/#nermin-sefic', name: 'Nermin Sefić', jobTitle: lang === 'en' ? 'Editor and director' : 'Urednik i direktor', url: 'https://gnk-asg.hr/nermin-sefic/', worksFor: { '@id': 'https://gnk-asg.hr/#aktual-media' } },
      {
        '@type': 'CollectionPage', '@id': `${canonical}#page`, url: canonical, name: title, headline: aboutName, description,
        inLanguage: lang, datePublished: '2026-10-22', dateModified: new Date().toISOString().slice(0, 10),
        keywords: [...hashtagWords, site.name, 'AKTUAL MEDIA'].join(', '),
        isPartOf: [{ '@id': 'https://gnk-asg.hr/#website' }, { '@id': `${desk}#page` }],
        author: { '@id': 'https://gnk-asg.hr/#aktual-media' }, editor: { '@id': 'https://gnk-asg.hr/#nermin-sefic' },
        publisher: { '@id': 'https://gnk-asg.hr/#aktual-media' },
        about: { '@type': 'Brand', name: site.name, url: `${site.url}/`, slogan: tagline },
        image: { '@type': 'ImageObject', url: OG, width: 1200, height: 630 },
        mainEntity: { '@id': `${canonical}#lista` },
      },
      {
        '@type': 'ItemList', '@id': `${canonical}#lista`, name: lang === 'en' ? `All pages — ${site.name}` : `Sve stranice — ${site.name}`,
        numberOfItems: list.length,
        itemListElement: list.map((page, index) => ({ '@type': 'ListItem', position: index + 1, name: page.title, url: page.url })),
      },
      {
        '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'GNK ASG', item: 'https://gnk-asg.hr/' },
          { '@type': 'ListItem', position: 2, name: 'AKTUAL MEDIA', item: AKTUAL },
          { '@type': 'ListItem', position: 3, name: lang === 'en' ? 'Network of editions' : 'Mreža izdanja', item: desk },
          { '@type': 'ListItem', position: 4, name: site.name, item: canonical },
        ],
      },
    ],
  };

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="publisher" content="AKTUAL MEDIA d.o.o.">
<meta name="copyright" content="AKTUAL MEDIA d.o.o.">
<meta name="keywords" content="${esc([...hashtagWords, site.name, 'AKTUAL MEDIA', lang === 'en' ? 'network of editions, publisher, editor' : 'mreža izdanja, izdavač, urednik', 'GNK ASG'].join(', '))}">
<meta name="news_keywords" content="${esc([...hashtagWords, site.name, 'AKTUAL MEDIA', 'GNK ASG'].join(', '))}">
<meta name="hashtags" content="${esc(hashtags.join(' '))}">
<meta name="theme-color" content="#04080f">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${lang}" href="${canonical}">
<link rel="alternate" hreflang="${t.other}" href="${alternate}">
<link rel="alternate" hreflang="x-default" href="${editionDesk('hr', site.slug)}">
<link rel="alternate" type="application/atom+xml" title="AKTUAL MEDIA — mreža" href="/mreza/feed.xml">
<link rel="alternate" type="application/json" title="Mreža — popis stranica" href="/data/mreza-pages-v1.json">
<link rel="alternate" type="text/markdown" title="Mreža — Markdown" href="${lang === 'en' ? '/en/gnk-aktual/network/index.md' : '/gnk-aktual/mreza/index.md'}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AKTUAL MEDIA · ${esc(site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${lang === 'en' ? 'en_GB' : 'hr_HR'}">
<meta property="og:image" content="${OG}">
<meta property="og:image:alt" content="${esc(`${site.name} — AKTUAL MEDIA`)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${OG}">
<meta name="twitter:image:alt" content="${esc(`${site.name} — AKTUAL MEDIA`)}">
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<meta name="editor" content="Nermin Sefić">
<meta property="article:tag" content="#AKTUALMEDIA">
<meta property="article:tag" content="#GNKASG">
<script type="application/ld+json" id="network-entity-v1">${entityGraphJson()}</script>
<link rel="author" href="https://gnk-asg.hr/nermin-sefic/">
</head>
<body>
<a class="skip" href="#main">${lang === 'en' ? 'Skip to content' : 'Preskoči na sadržaj'}</a>
<div class="top"><div class="wrap"><span>AKTUAL MEDIA d.o.o. · ${esc(site.name)}</span><span><a href="${AKTUAL}">${esc(t.desk)}</a> · <a href="${desk}">${lang === 'en' ? 'Edition network' : 'Mreža izdanja'}</a> · <a href="${alternate}" hreflang="${t.other}" lang="${t.other}">${lang === 'en' ? 'Hrvatski' : 'English'}</a></span></div></div>
<main id="main">
<div class="hero"><div class="wrap">
  <div class="house"><img src="/assets/brand/aktual-media-en-1200.webp" alt="AKTUAL MEDIA — world edition" width="167" height="48" decoding="async"></div>
  <p class="k">${esc(t.kicker)} · ${esc(site.name)}</p>
  <h1>${esc(site.name)} — ${lang === 'en' ? 'every page under AKTUAL MEDIA' : 'sve stranice pod AKTUAL MEDIA'}</h1>
  <p class="sub">${esc(tagline)}</p>
  <ul class="tags">${hashtags.map((tag) => `<li><a href="${HUB_HR}#${site.slug}" rel="external noopener">${esc(tag)}</a></li>`).join('')}</ul>
  <ul class="stats">
    <li><div><b>${list.length}</b><span>${lang === 'en' ? 'pages in this language' : 'stranica na ovom jeziku'}</span></div></li>
    <li><div><b>${count}</b><span>${lang === 'en' ? 'pages in both languages' : 'stranica na oba jezika'}</span></div></li>
    <li><div><b>2</b><span>${lang === 'en' ? 'languages' : 'jezika'}</span></div></li>
    <li><div><b>1</b><span>${lang === 'en' ? 'publisher' : 'izdavač'}</span></div></li>
    <li><div><b>1</b><span>${lang === 'en' ? 'editor' : 'urednik'}</span></div></li>
  </ul>
  <p class="links">
    <a href="${site.url}/" rel="external noopener">${esc(site.domain)}</a>
    <a href="${desk}">${lang === 'en' ? 'Full network index' : 'Cijeli popis mreže'}</a>
    <a href="${site.outputs.sitemap}">sitemap.xml</a>
    <a href="${site.outputs.feed}">feed.xml</a>
    <a href="${site.outputs.robots}">robots.txt</a>
    <a href="${tagDesk(lang)}">${lang === 'en' ? 'All hashtags' : 'Sve oznake'}</a>
  </p>
</div></div>

<section><div class="wrap">
  <h2>${lang === 'en' ? `All pages of ${site.name}` : `Sve stranice izdanja ${site.name}`}</h2>
  <p class="lead">${lang === 'en'
    ? 'Each row is a published page. The title and description are the ones the page itself carries; the link opens the text on its own domain, where the canonical and the full article are.'
    : 'Svaki redak je objavljena stranica. Naslov i opis su oni koje stranica sama nosi; poveznica otvara tekst na njegovoj domeni, gdje su canonical i cijeli članak.'}</p>
  <ul class="pages">${rows}</ul>
  <p class="meta"><span>${lang === 'en' ? `${count} pages (both languages)` : `${count} stranica (oba jezika)`}</span><span>${esc(site.domain)}</span><span>${lang === 'en' ? 'Publisher: AKTUAL MEDIA d.o.o.' : 'Izdavač: AKTUAL MEDIA d.o.o.'}</span></p>
</div></section>

<section><div class="wrap">
  <h2>${lang === 'en' ? 'Other editions in the network' : 'Ostala izdanja u mreži'}</h2>
  <p class="lead">${lang === 'en'
    ? 'The same publisher, the same editorial rules, a separate domain for each topic.'
    : 'Isti izdavač, ista urednička pravila, zasebna domena za svaku temu.'}</p>
  <ul class="pages">${siblingRows}</ul>
  <p class="links"><a href="${desk}">${lang === 'en' ? 'AKTUAL MEDIA — network of editions' : 'AKTUAL MEDIA — mreža izdanja'} →</a></p>
</div></section>
</main>
<footer><div class="wrap">
  <p>${esc(t.footer)}</p>
  <p class="iz-tags"><a href="/gnk-aktual/">#AKTUALMEDIA</a> · <a href="/gnk-aktual/">#GNKASG</a></p>
  <p>© 2026 AKTUAL MEDIA d.o.o. · <a href="/nermin-sefic/">Nermin Sefić</a> · ${lang === 'en' ? 'Editor and director' : 'Urednik i direktor'} · <a href="${desk}">${lang === 'en' ? 'Network index' : 'Popis mreže'}</a></p>
</div></footer>
</body>
</html>`;
}



function markdownIndex(lang, { sites, pages }) {
  const t = T[lang];
  const desk = lang === 'en' ? DESK_EN : DESK_HR;
  const grouped = byEdition(pages);
  const lines = [
    `# ${lang === 'en' ? 'AKTUAL MEDIA — network of editions' : 'AKTUAL MEDIA — mreža izdanja'}`,
    '',
    `> ${t.description}`,
    '',
    `- ${lang === 'en' ? 'Publisher' : 'Izdavač'}: AKTUAL MEDIA d.o.o. — ${AKTUAL}`,
    `- ${lang === 'en' ? 'Editor and director' : 'Urednik i direktor'}: Nermin Sefić — https://gnk-asg.hr/nermin-sefic/`,
    `- ${lang === 'en' ? 'Index' : 'Indeks'} (HR): ${DESK_HR}`,
    `- ${lang === 'en' ? 'Index' : 'Indeks'} (EN): ${DESK_EN}`,
    `- ${lang === 'en' ? 'Hashtags' : 'Oznake'}: ${lang === 'en' ? TAG_EN : TAG_HR}`,
    `- ${lang === 'en' ? 'Machine-readable list' : 'Strojni popis'}: ${SITE}/data/mreza-pages-v1.json`,
    `- ${lang === 'en' ? 'Combined feed' : 'Zbirni feed'}: ${SITE}/mreza/feed.xml`,
    '',
  ];
  for (const site of sites) {
    const list = (grouped.get(site.slug) || []).filter((page) => page.lang === lang).sort((a, b) => orderOf(a.slug) - orderOf(b.slug));
    lines.push(`## ${site.name}`, '', `${site.domain} · ${site.url}/ · ${list.length} ${lang === 'en' ? 'pages' : 'stranica'}`, '');
    for (const page of list) lines.push(`- [${page.title}](${page.url}) — ${short(page.description, 220)}`);
    lines.push('');
  }
  const tags = [...new Set(pages.filter((page) => page.lang === lang).flatMap((page) => page.hashtags || []))].sort();
  lines.push(`## ${lang === 'en' ? 'Hashtags' : 'Oznake'}`, '', tags.map((tag) => `[${tag}](${tagDesk(lang)}#${tagSlug(tag)})`).join(' · '), '');
  return `${lines.join('\n').trimEnd()}\n`;
}

function tagsPage(lang, { sites, pages }) {
  const t = T[lang];
  const canonical = tagDesk(lang);
  const alternate = tagDesk(lang === 'en' ? 'hr' : 'en');
  const desk = lang === 'en' ? DESK_EN : DESK_HR;
  const local = pages.filter((page) => page.lang === lang);

  const groups = new Map();
  for (const page of local) {
    for (const tag of page.hashtags || []) {
      if (!groups.has(tag)) groups.set(tag, []);
      groups.get(tag).push(page);
    }
  }
  const ordered = [...groups.entries()].sort((a, b) => (b[1].length - a[1].length) || a[0].localeCompare(b[0]));
  const hashtags = [...new Set([...deskHashtags(sites), ...ordered.map(([tag]) => tag)])].slice(0, 20);
  const hashtagWords = hashtags.map((tag) => tag.replace('#', ''));
  const title = lang === 'en'
    ? `All hashtags of the network — every AKTUAL MEDIA edition | GNK ASG`
    : `Sve oznake mreže — hashtagovi svih izdanja AKTUAL MEDIA | GNK ASG`;
  const description = lang === 'en'
    ? `All ${ordered.length} hashtags used across the six editions of the AKTUAL MEDIA network, with every page that carries them. One publisher, one editor, two languages: every tag opens the exact texts it marks.`
    : `Svih ${ordered.length} oznaka koje koristi šest izdanja mreže AKTUAL MEDIA, uz svaku stranicu koja ih nosi. Jedan izdavač, jedan urednik, dva jezika: svaka oznaka vodi na točno one tekstove koje označava.`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': 'https://gnk-asg.hr/#website', name: 'GNK ASG', url: 'https://gnk-asg.hr/', inLanguage: ['hr', 'en'], publisher: { '@id': 'https://gnk-asg.hr/#gnk-asg' } },
      { '@type': 'Organization', '@id': 'https://gnk-asg.hr/#gnk-asg', name: 'GNK ASG d.o.o.', url: 'https://gnk-asg.hr/' },
      {
        '@type': 'NewsMediaOrganization', '@id': 'https://gnk-asg.hr/#aktual-media', name: 'AKTUAL MEDIA d.o.o.', url: AKTUAL,
        parentOrganization: { '@id': 'https://gnk-asg.hr/#gnk-asg' }, editor: { '@id': 'https://gnk-asg.hr/#nermin-sefic' },
        brand: { '@type': 'Brand', name: 'AKTUAL MEDIA', url: DESK_HR },
        owns: sites.map((site) => ({ '@type': 'Brand', name: site.name, url: `${site.url}/` })),
      },
      { '@type': 'Person', '@id': 'https://gnk-asg.hr/#nermin-sefic', name: 'Nermin Sefić', jobTitle: lang === 'en' ? 'Editor and director' : 'Urednik i direktor', url: 'https://gnk-asg.hr/nermin-sefic/', worksFor: { '@id': 'https://gnk-asg.hr/#aktual-media' } },
      {
        '@type': 'CollectionPage', '@id': `${canonical}#page`, url: canonical, name: title, headline: lang === 'en' ? 'All hashtags of the network' : 'Sve oznake mreže',
        description, inLanguage: lang, datePublished: '2026-10-22', dateModified: new Date().toISOString().slice(0, 10),
        keywords: [...hashtagWords, 'AKTUAL MEDIA', lang === 'en' ? 'hashtags, network of editions' : 'hashtagovi, mreža izdanja', 'GNK ASG'].join(', '),
        isPartOf: [{ '@id': 'https://gnk-asg.hr/#website' }, { '@id': `${desk}#page` }],
        author: { '@id': 'https://gnk-asg.hr/#aktual-media' }, editor: { '@id': 'https://gnk-asg.hr/#nermin-sefic' },
        publisher: { '@id': 'https://gnk-asg.hr/#aktual-media' },
        image: { '@type': 'ImageObject', url: OG, width: 1200, height: 630 },
        mainEntity: { '@id': `${canonical}#lista` },
      },
      {
        '@type': 'ItemList', '@id': `${canonical}#lista`, name: lang === 'en' ? 'Hashtags' : 'Oznake', numberOfItems: ordered.length,
        itemListElement: ordered.map(([tag, list], index) => ({
          '@type': 'ListItem', position: index + 1, name: tag, url: `${canonical}#${tagSlug(tag)}`,
          description: lang === 'en' ? `${list.length} pages` : `${list.length} stranica`,
        })),
      },
      {
        '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'GNK ASG', item: 'https://gnk-asg.hr/' },
          { '@type': 'ListItem', position: 2, name: 'AKTUAL MEDIA', item: AKTUAL },
          { '@type': 'ListItem', position: 3, name: lang === 'en' ? 'Network of editions' : 'Mreža izdanja', item: desk },
          { '@type': 'ListItem', position: 4, name: lang === 'en' ? 'Hashtags' : 'Oznake', item: canonical },
        ],
      },
    ],
  };

  const blocks = ordered.map(([tag, list]) => `<section class="tagblock" id="${tagSlug(tag)}" style="border-bottom:1px solid #132840;padding:18px 0">
    <h2 style="font-size:clamp(20px,2.6vw,28px);margin:0 0 4px">${esc(tag)} <span style="font:700 11px/1 system-ui;letter-spacing:.1em;text-transform:uppercase;color:#8ba1b8">${lang === 'en' ? `${list.length} pages` : `${list.length} stranica`}</span></h2>
    <ul class="pages">${list.map((page) => pageRow(page, lang)).join('')}</ul>
  </section>`).join('\n');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="publisher" content="AKTUAL MEDIA d.o.o.">
<meta name="copyright" content="AKTUAL MEDIA d.o.o.">
<meta name="keywords" content="${esc([...hashtagWords, 'AKTUAL MEDIA', lang === 'en' ? 'hashtags' : 'hashtagovi', lang === 'en' ? 'network of editions' : 'mreža izdanja', 'GNK ASG'].join(', '))}">
<meta name="news_keywords" content="${esc([...hashtagWords, 'AKTUAL MEDIA', 'GNK ASG'].join(', '))}">
<meta name="hashtags" content="${esc(hashtags.join(' '))}">
<meta name="theme-color" content="#04080f">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${lang}" href="${canonical}">
<link rel="alternate" hreflang="${t.other}" href="${alternate}">
<link rel="alternate" hreflang="x-default" href="${TAG_HR}">
<link rel="alternate" type="application/atom+xml" title="AKTUAL MEDIA — mreža" href="/mreza/feed.xml">
<link rel="alternate" type="application/json" title="Mreža — popis stranica" href="/data/mreza-pages-v1.json">
<link rel="alternate" type="text/markdown" title="Mreža — Markdown" href="${lang === 'en' ? '/en/gnk-aktual/network/index.md' : '/gnk-aktual/mreza/index.md'}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AKTUAL MEDIA · ${lang === 'en' ? 'hashtags' : 'oznake'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${lang === 'en' ? 'en_GB' : 'hr_HR'}">
<meta property="og:image" content="${OG}">
<meta property="og:image:alt" content="AKTUAL MEDIA — ${lang === 'en' ? 'hashtags of the network' : 'oznake mreže'}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${OG}">
<meta name="twitter:image:alt" content="AKTUAL MEDIA — ${lang === 'en' ? 'hashtags of the network' : 'oznake mreže'}">
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<meta name="editor" content="Nermin Sefić">
<meta property="article:tag" content="#AKTUALMEDIA">
<meta property="article:tag" content="#GNKASG">
<script type="application/ld+json" id="network-entity-v1">${entityGraphJson()}</script>
<link rel="author" href="https://gnk-asg.hr/nermin-sefic/">
</head>
<body>
<a class="skip" href="#main">${lang === 'en' ? 'Skip to content' : 'Preskoči na sadržaj'}</a>
<div class="top"><div class="wrap"><span>AKTUAL MEDIA d.o.o. · ${esc(t.kicker)}</span><span><a href="${AKTUAL}">${esc(t.desk)}</a> · <a href="${desk}">${lang === 'en' ? 'Edition network' : 'Mreža izdanja'}</a> · <a href="${alternate}" hreflang="${t.other}" lang="${t.other}">${lang === 'en' ? 'Hrvatski' : 'English'}</a></span></div></div>
<main id="main">
<div class="hero"><div class="wrap">
  <div class="house"><img src="/assets/brand/aktual-media-en-1200.webp" alt="AKTUAL MEDIA — world edition" width="167" height="48" decoding="async"></div>
  <p class="k">${esc(t.kicker)} · ${lang === 'en' ? 'hashtags' : 'oznake'}</p>
  <h1>${lang === 'en' ? 'All hashtags of the network' : 'Sve oznake mreže'}</h1>
  <p class="sub">${esc(description)}</p>
  <p class="links">
    <a href="${desk}">${lang === 'en' ? 'Full network index' : 'Cijeli popis mreže'}</a>
    <a href="${AKTUAL}">AKTUAL MEDIA</a>
    <a href="${lang === 'en' ? HUB_EN : HUB_HR}">${esc(t.backHub)}</a>
    <a href="/data/mreza-pages-v1.json">${esc(t.jsonLink)}</a>
    <a href="/mreza/feed.xml">${esc(t.feedLink)}</a>
  </p>
</div></div>
${blocks}
</main>
<footer><div class="wrap">
  <p>${esc(t.footer)}</p>
  <p class="iz-tags"><a href="/gnk-aktual/">#AKTUALMEDIA</a> · <a href="/gnk-aktual/">#GNKASG</a></p>
  <p>© 2026 AKTUAL MEDIA d.o.o. · <a href="/nermin-sefic/">Nermin Sefić</a> · ${lang === 'en' ? 'Editor and director' : 'Urednik i direktor'} · <a href="${desk}">${lang === 'en' ? 'Network index' : 'Popis mreže'}</a></p>
</div></footer>
</body>
</html>`;
}

function bandHtml(lang, { sites, pages }) {
  const t = T[lang];
  const desk = lang === 'en' ? DESK_EN : DESK_HR;
  const items = sites.map((site) => `<li><a href="${site.url}/" rel="external noopener" style="border-left:3px solid ${site.accent}">
    <b>${esc(site.name)}</b><span>${esc(site.domain)}</span></a></li>`).join('');
  return `${MARK_START}
<style>
.am-netband{--nb-gold:#e8c56a;--nb-line:rgba(232,197,106,.24);margin:26px 0;padding:clamp(16px,2.6vw,28px);border:1px solid var(--nb-line);border-radius:20px;background:linear-gradient(160deg,rgba(232,197,106,.07),rgba(6,14,24,.6));color:#eef3f9}
.am-netband h2{font:800 clamp(20px,2.6vw,28px)/1.15 Georgia,serif;margin:0 0 8px;color:#f4f7fb}
.am-netband p{margin:0 0 14px;color:#a9bad0;font-size:14px;max-width:80ch}
.am-netband ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}
.am-netband li a{display:block;border:1px solid #1e3b58;border-radius:12px;padding:10px 12px;background:rgba(9,20,34,.62);color:#eef3f9;text-decoration:none}
.am-netband li a:hover{border-color:var(--nb-gold)}
.am-netband b{display:block;font:800 12.5px/1.3 Georgia,serif}
.am-netband span{display:block;color:#8ba1b8;font-size:10.5px;letter-spacing:.05em;margin-top:3px}
.am-netband .am-netband-go{display:inline-block;margin-top:14px;border:1px solid var(--nb-gold);border-radius:999px;padding:9px 14px;font:800 10.5px/1 system-ui;letter-spacing:.1em;text-transform:uppercase;color:#0a0d12;background:var(--nb-gold);text-decoration:none}
.am-netband .am-netband-go:hover{filter:brightness(1.06)}
</style>
<section class="am-netband" aria-label="${esc(t.bandTitle)}">
  <h2>${esc(t.bandTitle)}</h2>
  <p>${esc(t.bandLead)} <strong style="color:#f4f7fb">${plural(pages.length, lang)}</strong> ${lang === 'en' ? 'in two languages.' : 'na dva jezika.'}</p>
  <ul>${items}</ul>
  <a class="am-netband-go" href="${desk}">${esc(t.bandCta)} →</a>
</section>
${MARK_END}`;
}

export function injectAktualBand(portalRoot, { sites, pages }) {
  const targets = [
    { file: join(portalRoot, 'gnk-aktual', 'index.html'), lang: 'hr' },
    { file: join(portalRoot, 'en', 'gnk-aktual', 'index.html'), lang: 'en' },
  ];
  const report = [];
  for (const { file, lang } of targets) {
    if (!existsSync(file)) { report.push(`${file}: nema`); continue; }
    let html = readFileSync(file, 'utf8');
    const block = bandHtml(lang, { sites, pages });
    if (html.includes(MARK_START) && html.includes(MARK_END)) {
      html = html.replace(new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}`), () => block);
    } else if (html.includes('</main>')) {
      html = html.replace('</main>', `${block}\n</main>`);
    } else {
      report.push(`${file}: nema </main>`);
      continue;
    }
    writeFileSync(file, html);
    report.push(`${file}: traka ubačena`);
  }
  return report;
}

function atom(pages) {
  const sorted = [...pages].sort((a, b) => (a.updated === b.updated ? a.url.localeCompare(b.url) : (a.updated < b.updated ? 1 : -1)));
  const newest = sorted[0]?.updated || '2026-10-22';
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>AKTUAL MEDIA — mreža izdanja</title>
  <subtitle>Sve stranice šest neovisnih izdanja, na jednom feedu.</subtitle>
  <link href="${SITE}/mreza/feed.xml" rel="self"/>
  <link href="${DESK_HR}"/>
  <id>${DESK_HR}</id>
  <updated>${newest}T07:00:00Z</updated>
  <author><name>AKTUAL MEDIA d.o.o. · Nermin Sefić</name><uri>https://gnk-asg.hr/nermin-sefic/</uri></author>
  <rights>© 2026 AKTUAL MEDIA d.o.o.</rights>
${sorted.map((page) => `  <entry>
    <title>${esc(page.title)}</title>
    <link href="${page.url}"/>
    <id>${page.url}</id>
    <updated>${page.updated}T07:00:00Z</updated>
    <summary>${esc(short(page.description, 300))}</summary>
    <category term="${esc(page.edition)}"/>
${(page.hashtags || []).map((tag) => `    <category term="${esc(tag.replace('#', ''))}"/>`).join('\n')}
  </entry>`).join('\n')}
</feed>
`;
}


const NAV_MARK = 'AKTUAL-MREZA-NAV';

function injectAktualNav(portalRoot) {
  const targets = [
    { file: join(portalRoot, 'gnk-aktual', 'index.html'), lang: 'hr', href: '/gnk-aktual/mreza/', label: 'Mreža izdanja', note: 'Mreža izdanja AKTUAL MEDIA' },
    { file: join(portalRoot, 'en', 'gnk-aktual', 'index.html'), lang: 'en', href: '/en/gnk-aktual/network/', label: 'Edition network', note: 'AKTUAL MEDIA edition network' },
  ];
  let touched = 0;
  for (const target of targets) {
    if (!existsSync(target.file)) continue;
    let html = readFileSync(target.file, 'utf8');
    const link = `<a href="${target.href}">${target.label}</a>`;
    const moreLink = `<a href="${target.href}">${target.note}</a>`;
    let changed = false;
    if (!html.includes(`href="${target.href}"`)) {
      const nav = html.match(/<nav class="am-sectionnav"[^>]*>([\s\S]*?)<\/nav>/);
      if (nav) {
        html = html.replace(nav[0], nav[0].replace('</nav>', `${link}</nav>`));
        changed = true;
      }
      const more = html.match(/<nav class="amn-more"[^>]*>([\s\S]*?)<\/nav>/);
      if (more) {
        html = html.replace(more[0], more[0].replace('</nav>', `${moreLink}</nav>`));
        changed = true;
      }
    }
    if (changed) { writeFileSync(target.file, html); touched += 1; }
  }
  return touched;
}

function ensureLlms(portalRoot, { sites, pages }) {
  const file = join(portalRoot, 'llms.txt');
  if (!existsSync(file)) return false;
  const START = `<!-- AKTUAL-MREZA-LLMS:START -->`;
  const END = `<!-- AKTUAL-MREZA-LLMS:END -->`;
  const block = `${START}
## AKTUAL MEDIA — network of editions
- Publisher: AKTUAL MEDIA d.o.o. (https://gnk-asg.hr/gnk-aktual/), editor and director Nermin Sefić (https://gnk-asg.hr/nermin-sefic/).
- ${sites.length} independent editions, ${pages.length} pages in Croatian and English, listed on one index: ${DESK_HR}
- English index: ${DESK_EN}
- Machine-readable list of every page: ${SITE}/data/mreza-pages-v1.json
- Combined Atom feed: ${SITE}/mreza/feed.xml
- Hashtag index: ${TAG_HR} (HR) · ${TAG_EN} (EN)
- Markdown index for assistants and crawlers: ${DESK_HR}index.md (HR) · ${DESK_EN}index.md (EN)
- SEO matrix (title, description, hashtags, JSON-LD per route): ${SITE}/data/seo-matrix-v1.json
- Feeds for any reader: ${SITE}/mreza/feeds.opml
${sites.map((site) => `- ${site.name}: ${site.url}/ · every page under AKTUAL MEDIA: ${editionDesk('hr', site.slug)} (HR) · ${editionDesk('en', site.slug)} (EN)`).join('\n')}
- Each edition keeps its own domain, sitemap, feed and robots.txt; the index lists the exact title and description of every page without rewriting them.
${END}`;
  let text = readFileSync(file, 'utf8');
  if (text.includes(START) && text.includes(END)) {
    const pattern = new RegExp(`${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    text = text.replace(pattern, block);
  } else {
    text = `${text.trimEnd()}\n\n${block}\n`;
  }
  writeFileSync(file, text);
  return true;
}

export function buildAktualNetwork(portalRoot, { sites, pages, today }) {
  const withMeta = pages.map((page) => {
    const site = sites.find((item) => item.slug === page.edition);
    return { ...page, editionName: page.editionName || site?.name || page.edition, url: page.url };
  });

  write(join(portalRoot, 'gnk-aktual', 'mreza', 'index.html'), deskPage('hr', { sites, pages: withMeta }));
  write(join(portalRoot, 'en', 'gnk-aktual', 'network', 'index.html'), deskPage('en', { sites, pages: withMeta }));
  for (const site of sites) {
    write(join(portalRoot, 'gnk-aktual', 'mreza', site.slug, 'index.html'), editionPage('hr', site, { sites, pages: withMeta }));
    write(join(portalRoot, 'en', 'gnk-aktual', 'network', site.slug, 'index.html'), editionPage('en', site, { sites, pages: withMeta }));
  }
  write(join(portalRoot, 'gnk-aktual', 'mreza', 'oznake', 'index.html'), tagsPage('hr', { sites, pages: withMeta }));
  write(join(portalRoot, 'en', 'gnk-aktual', 'network', 'tags', 'index.html'), tagsPage('en', { sites, pages: withMeta }));
  write(join(portalRoot, 'gnk-aktual', 'mreza', 'index.md'), markdownIndex('hr', { sites, pages: withMeta }));
  write(join(portalRoot, 'en', 'gnk-aktual', 'network', 'index.md'), markdownIndex('en', { sites, pages: withMeta }));

  const index = {
    version: 'GNK_ASG_MREZA_PAGES_V1_20261022',
    updatedAt: new Date().toISOString(),
    publisher: { name: 'AKTUAL MEDIA d.o.o.', url: AKTUAL },
    editor: { name: 'Nermin Sefić', url: 'https://gnk-asg.hr/nermin-sefic/', role: 'Urednik i direktor' },
    desk: { hr: DESK_HR, en: DESK_EN },
    count: withMeta.length,
    editions: sites.map((site) => ({ slug: site.slug, name: site.name, url: `${site.url}/`, domain: site.domain, pages: withMeta.filter((page) => page.edition === site.slug).length })),
    pages: withMeta.map((page) => ({
      edition: page.edition, editionName: page.editionName, lang: page.lang, slug: page.slug, nav: page.nav,
      url: page.url, title: page.title, description: page.description, updated: page.updated, image: page.image,
      hashtags: page.hashtags || [],
    })),
  };
  write(join(portalRoot, 'data', 'mreza-pages-v1.json'), JSON.stringify(index, null, 2) + '\n');
  write(join(portalRoot, 'mreza', 'feed.xml'), atom(withMeta));
  const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>AKTUAL MEDIA — mreža izdanja</title><ownerName>AKTUAL MEDIA d.o.o.</ownerName></head>
  <body>
    <outline text="AKTUAL MEDIA — sve stranice mreže" title="AKTUAL MEDIA — sve stranice mreže" type="rss" xmlUrl="${SITE}/mreza/feed.xml" htmlUrl="${DESK_HR}"/>
    <outline text="Glavni gradovi" title="Glavni gradovi" type="rss" xmlUrl="${SITE}/glavni-gradovi/feed.xml" htmlUrl="${SITE}/glavni-gradovi/"/>
    <outline text="Capitals (EN)" title="Capitals (EN)" type="rss" xmlUrl="${SITE}/en/capitals/feed.xml" htmlUrl="${SITE}/en/capitals/"/>
${sites.map((site) => `    <outline text="${esc(site.name)}" title="${esc(site.name)}" type="rss" xmlUrl="${site.outputs.feed}" htmlUrl="${site.url}/"/>
    <outline text="${esc(site.name)} (EN)" title="${esc(site.name)} (EN)" type="rss" xmlUrl="${site.outputs.feedEn || `${site.url}/en/feed.xml`}" htmlUrl="${site.url}/en/"/>`).join('\n')}
  </body>
</opml>
`;
  write(join(portalRoot, 'mreza', 'feeds.opml'), opml);

  const editionRows = sites.map((site) => {
    const hr = editionDesk('hr', site.slug);
    const en = editionDesk('en', site.slug);
    return `  <url><loc>${hr}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority><xhtml:link rel="alternate" hreflang="hr" href="${hr}"/><xhtml:link rel="alternate" hreflang="en" href="${en}"/><xhtml:link rel="alternate" hreflang="x-default" href="${hr}"/></url>
  <url><loc>${en}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority><xhtml:link rel="alternate" hreflang="en" href="${en}"/><xhtml:link rel="alternate" hreflang="hr" href="${hr}"/><xhtml:link rel="alternate" hreflang="x-default" href="${hr}"/></url>`;
  }).join('\n');
  const tagRow = (loc, alt, lang) => `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority><xhtml:link rel="alternate" hreflang="${lang}" href="${loc}"/><xhtml:link rel="alternate" hreflang="${lang === 'hr' ? 'en' : 'hr'}" href="${alt}"/><xhtml:link rel="alternate" hreflang="x-default" href="${TAG_HR}"/></url>`;
  const sitemapDesk = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>${DESK_HR}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority><xhtml:link rel="alternate" hreflang="hr" href="${DESK_HR}"/><xhtml:link rel="alternate" hreflang="en" href="${DESK_EN}"/><xhtml:link rel="alternate" hreflang="x-default" href="${DESK_HR}"/></url>
  <url><loc>${DESK_EN}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority><xhtml:link rel="alternate" hreflang="en" href="${DESK_EN}"/><xhtml:link rel="alternate" hreflang="hr" href="${DESK_HR}"/><xhtml:link rel="alternate" hreflang="x-default" href="${DESK_HR}"/></url>
${editionRows}
${tagRow(TAG_HR, TAG_EN, 'hr')}
${tagRow(TAG_EN, TAG_HR, 'en')}
  <url><loc>${SITE}/mreza/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority><xhtml:link rel="alternate" hreflang="hr" href="${HUB_HR}"/><xhtml:link rel="alternate" hreflang="en" href="${HUB_EN}"/><xhtml:link rel="alternate" hreflang="x-default" href="${HUB_HR}"/></url>
  <url><loc>${SITE}/en/network/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority><xhtml:link rel="alternate" hreflang="en" href="${HUB_EN}"/><xhtml:link rel="alternate" hreflang="hr" href="${HUB_HR}"/><xhtml:link rel="alternate" hreflang="x-default" href="${HUB_HR}"/></url>
</urlset>
`;
  write(join(portalRoot, 'gnk-aktual', 'mreza', 'sitemap.xml'), sitemapDesk);
  const band = injectAktualBand(portalRoot, { sites, pages: withMeta });
  const nav = injectAktualNav(portalRoot);
  ensureLlms(portalRoot, { sites, pages: withMeta });

  return { pages: withMeta.length, editions: sites.length, desk: DESK_HR, band, nav };
}

export const AKTUAL_NETWORK = { DESK_HR, DESK_EN, HUB_HR, HUB_EN, MARK_START, MARK_END };
