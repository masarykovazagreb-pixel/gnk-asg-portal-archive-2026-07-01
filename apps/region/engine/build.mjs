#!/usr/bin/env node
/**
 * AKTUAL MEDIA REGIONAL — generator stranica.
 *
 * Ulaz:  apps/region/data/<kanal>.json  (zapisuje engine/daily.mjs)
 * Izlaz: apps/region/site/<kanal>/**    (statične stranice za Cloudflare Pages)
 *
 * Svaka stranica dobiva: title, description, canonical, robots, hreflang,
 * Open Graph, Twitter card, JSON-LD, vidljive hashtagove i poveznicu na
 * izvornik. Nema izmišljenih tvrdnji: tekst osvrta govori o načinu
 * izvještavanja, a činjenice ostaju kod izvora.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, longDate, shortDate, slugify, isoWeek, themeFor, scoreFromTitle, truncate, safeJson } from './lib.mjs';
import { t, ANALYSIS } from '../src/strings.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const ROOT = join(APP, '..', '..');
const DATA = join(APP, 'data');
const SITE = join(ROOT, 'apps', 'portal', 'kanal');
const LEGACY = join(APP, 'site');

export const CHANNELS = JSON.parse(readFileSync(join(APP, 'channels.json'), 'utf8')).channels;
export const HUB = 'https://gnk-asg.hr/izdanja/';
export const CENTRAL = 'https://gnk-asg.hr/gnk-aktual/';
export const CONTACT = 'info@gnk-asg.hr';
export const SOCIAL_IMAGE = 'https://gnk-asg.hr/assets/gnk-asg-social-card.png';
export const PUBLIC = 'https://gnk-asg.hr';

const checksFor = (item, strings) => {
  const out = [];
  const title = item.title || '';
  const summary = item.summary || '';
  if (/\d/.test(title)) out.push(strings.checks.number);
  if (/\b(naj|najveć|najve|rekord|povijesn|historijsk|prvi put|first ever)\b/i.test(title)) out.push(strings.checks.superlative);
  if (/\b(izvor|izvori|krugovi|neimenovan|anonim|prema saznanjima|saznaje)\b/i.test(`${title} ${summary}`)) out.push(strings.checks.anonymous);
  if (title.includes('?')) out.push(strings.checks.question);
  if (/\b(ekskluziv|otkrivamo|saznajemo|exclusive)\b/i.test(title)) out.push(strings.checks.exclusive);
  if (/[„“”"'][^„“”"']{12,}[„“”"']/.test(summary)) out.push(strings.checks.quote);
  if (!out.length) out.push(strings.checks.number);
  return out.slice(0, 3);
};

const themeOf = (item) => themeFor(`${item.title} ${item.summary}`).id;

/* ---------- traka izdanja: uvijek na dohvat, na svakoj stranici ---------- */

export const CITY_SHORT = {
  zagreb: 'Zagreb', beograd: 'Beograd', sarajevo: 'Sarajevo', budimpesta: 'Budimpešta',
  ljubljana: 'Ljubljana', rim: 'Rim', sofija: 'Sofija', bukurest: 'Bukurešt'
};

function editionsStrip(channel) {
  const items = CHANNELS.map((c) => {
    const current = c.id === channel.id;
    return `<li class="eds-i${current ? ' is-current' : ''}"><a href="${c.base}"${current ? ' aria-current="page"' : ' rel="external noopener"'} aria-label="${esc(c.title)}${current ? ' — ovo izdanje' : ' — otvori izdanje'}">
      <span class="eds-img"><img src="/assets/izdanja/${c.id}-240.webp" alt="" width="96" height="64" loading="lazy" decoding="async"></span>
      <span class="eds-city">${esc(CITY_SHORT[c.id] || c.city)}</span>
    </a></li>`;
  }).join('');
  return `<nav class="eds" aria-label="AKTUAL MEDIA izdanja">
  <a class="eds-home" href="${CENTRAL}#izdanja-po-zemljama" rel="external noopener"><span aria-hidden="true">←</span> AKTUAL MEDIA</a>
  <ul class="eds-row">${items}</ul>
</nav>`;
}

/* ---------- MINI TRAKA: 8 izdanja uvijek na dohvat, pojavi se nakon skrola ---------- */

function miniRail(channel) {
  const items = CHANNELS.map((c) => {
    const cur = c.id === channel.id;
    return `<a href="${c.base}"${cur ? ' aria-current="page"' : ''} title="${esc(c.title)}" aria-label="${esc(c.title)}${cur ? ' — ovo izdanje' : ' — otvori izdanje'}"><img src="/assets/izdanja/${c.id}-440.webp" alt="" width="34" height="34" loading="lazy" decoding="async"><span>${esc(CITY_SHORT[c.id] || c.city)}</span></a>`;
  }).join('');
  return `<nav class="edmini" id="edmini" aria-label="AKTUAL MEDIA izdanja" hidden>
  <a class="edmini-home" href="${CENTRAL}#izdanja-po-zemljama">AKTUAL</a>${items}
</nav>
<script>(function(){var n=document.getElementById('edmini');if(!n)return;var h=document.querySelector('.masthead');if(!h)return;
if(!('IntersectionObserver' in window)){n.hidden=false;return}
new IntersectionObserver(function(e){n.hidden=e[0].isIntersecting},{rootMargin:'-60px 0px 0px 0px'}).observe(h)})();</script>`;
}

/* ---------- MRAVINJAK: gusti klaster naslova unutar izdanja ---------- */

const MRV = {
  hr: {
    nav: 'Mravinjak', title: 'Mravinjak',
    lead: (n) => `Gusto, bez uvoda: ${n} naslova u ovom izdanju. Naslov vodi na osvrt, osvrt na izvornik — ništa se ne tvrdi bez linka.`,
    all: 'Cijeli mravinjak', cross: 'Mravinjak svih izdanja', source: 'izvor'
  },
  sr: {
    nav: 'Mravinjak', title: 'Mravinjak',
    lead: (n) => `Gusto, bez uvoda: ${n} naslova u ovom izdanju. Naslov vodi na osvrt, osvrt na izvornik — ništa se ne tvrdi bez linka.`,
    all: 'Ceo mravinjak', cross: 'Mravinjak svih izdanja', source: 'izvor'
  },
  bs: {
    nav: 'Mravinjak', title: 'Mravinjak',
    lead: (n) => `Gusto, bez uvoda: ${n} naslova u ovom izdanju. Naslov vodi na osvrt, osvrt na izvornik — ništa se ne tvrdi bez linka.`,
    all: 'Cijeli mravinjak', cross: 'Mravinjak svih izdanja', source: 'izvor'
  },
  hu: {
    nav: 'Hangyaboly', title: 'Hangyaboly',
    lead: (n) => `Sűrűn, bevezető nélkül: ${n} cím ebben a kiadásban. A cím az elemzéshez, az elemzés az eredetihez visz — link nélkül nincs állítás.`,
    all: 'Teljes hangyaboly', cross: 'Az összes kiadás hangyabolya', source: 'forrás'
  },
  sl: {
    nav: 'Mravljišče', title: 'Mravljišče',
    lead: (n) => `Gosto, brez uvoda: ${n} naslovov v tej izdaji. Naslov vodi do osvrta, osvrt do izvirnika — brez povezave ni trditve.`,
    all: 'Celo mravljišče', cross: 'Mravljišče vseh izdaj', source: 'vir'
  },
  it: {
    nav: 'Formicaio', title: 'Formicaio',
    lead: (n) => `Fitto, senza introduzione: ${n} titoli di questa edizione. Il titolo porta all'analisi, l'analisi alla fonte — nessuna affermazione senza link.`,
    all: 'Tutto il formicaio', cross: 'Il formicaio di tutte le edizioni', source: 'fonte'
  },
  bg: {
    nav: 'Мравуняк', title: 'Мравуняк',
    lead: (n) => `Гъсто, без увод: ${n} заглавия в това издание. Заглавието води към анализа, анализът — към източника; без връзка няма твърдение.`,
    all: 'Целият мравуняк', cross: 'Мравунякът на всички издания', source: 'източник'
  },
  ro: {
    nav: 'Furnicar', title: 'Furnicar',
    lead: (n) => `Des, fără introducere: ${n} titluri în această ediție. Titlul duce la analiză, analiza la sursă — fără link nu există afirmație.`,
    all: 'Tot furnicarul', cross: 'Furnicarul tuturor edițiilor', source: 'sursă'
  }
};

const mrvStrings = (lang) => MRV[lang] || MRV.hr;

/* Izvori se izmjenjuju kružno da se u stupcima ne nakuplja jedan medij. */
function anthill(items, limit = 64) {
  const buckets = [];
  const index = new Map();
  for (const item of items) {
    const key = item.source || item.sourceName || '';
    if (!index.has(key)) { index.set(key, buckets.length); buckets.push([]); }
    buckets[index.get(key)].push(item);
  }
  const out = [];
  let round = 0;
  while (out.length < Math.min(limit, items.length) && round < items.length + 1) {
    let added = false;
    for (const bucket of buckets) {
      if (bucket.length && out.length < limit) { out.push(bucket.shift()); added = true; }
    }
    if (!added) break;
    round += 1;
  }
  return out;
}

function anthillList(channel, strings, items, { root = '' } = {}) {
  const labels = strings.themeNames;
  return items.map((item) => {
    const theme = themeOf(item);
    return `<a class="mrv-i" href="${root}clanak/${item.slug}/" title="${esc(item.title)} — ${esc(item.sourceName)}">
      <b>${esc(item.sourceName)} <em>· ${esc(labels[theme] || theme)} · ${esc(shortDate(item.date.slice(0, 10), channel.lang))}</em></b>
      <span>${esc(item.title)}</span>
    </a>`;
  }).join('');
}

function mravinjakSection(channel, strings, data) {
  if (!data.items.length) return '';
  const m = mrvStrings(channel.lang);
  const dense = anthill(data.items, 64);
  return `<section class="band" id="mravinjak">
    <div class="mrv">
      <div class="mrv-head">
        <h2>${esc(m.title)} <span>· ${esc(channel.city)}</span></h2>
        <span class="mrv-count">${dense.length} / ${data.items.length}</span>
      </div>
      <p class="mrv-lead">${esc(m.lead(dense.length))}</p>
      <div class="mrv-cols">${anthillList(channel, strings, dense)}</div>
      <div class="mrv-foot">
        <a href="mravinjak/">${esc(m.all)} — ${data.items.length} →</a>
        <a href="https://gnk-asg.hr/gnk-aktual/#mravinjak" rel="external noopener">${esc(m.cross)} ↗</a>
      </div>
    </div>
  </section>`;
}

function mravinjakPage(channel, strings, data) {
  const m = mrvStrings(channel.lang);
  const items = data.items;
  const themeCount = new Map();
  for (const item of items) {
    const id = themeOf(item);
    themeCount.set(id, (themeCount.get(id) || 0) + 1);
  }
  const chips = [...themeCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => `<a class="chip" href="../tema/${id}/">${esc(strings.themeNames[id] || id)} <strong>${n}</strong></a>`).join('');

  const body = `${header(channel, strings, 'mravinjak/', '../')}
<main id="sadrzaj" class="page">
  <p class="dateline">${esc(channel.title)} · ${esc(strings.editionOf)}</p>
  <h1>${esc(m.title)} — ${esc(channel.city)}</h1>
  <p class="lead">${esc(m.lead(items.length))}</p>
  <p class="chips">${chips}</p>
  <section class="mrv mrv--page">
    <div class="mrv-head"><h2>${esc(m.title)} <span>· ${items.length}</span></h2>
      <label class="mrv-wall-btn"><input type="checkbox" id="mrvwall"><span>Zid · 8 stupaca</span></label>
      <span class="mrv-count">${esc(channel.country)} · ${esc(channel.lang)}</span></div>
    <div class="mrv-cols">${anthillList(channel, strings, anthill(items, items.length), { root: '../' })}</div>
    <div class="mrv-foot">
      <a href="../">← ${esc(channel.title)}</a>
      <a href="https://gnk-asg.hr/gnk-aktual/#mravinjak" rel="external noopener">${esc(m.cross)} ↗</a>
    </div>
  </section>
  <p class="small">${esc(strings.autoNote)}</p>
  <p><a href="../">← ${esc(strings.back)}</a></p>
</main>
<script>(function(){var c=document.getElementById('mrvwall');if(!c)return;
var k='mrv-wall';try{if(localStorage.getItem('mrv-wall')==='1'){document.body.classList.add(k);c.checked=true}}catch(e){}
c.addEventListener('change',function(){document.body.classList.toggle(k,c.checked);try{localStorage.setItem('mrv-wall',c.checked?'1':'0')}catch(e){}})})();</script>
${footer(channel, strings)}`;

  const jsonld = [
    {
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      '@id': `${url(channel, 'mravinjak/')}#mravinjak`, url: url(channel, 'mravinjak/'),
      name: `${m.title} — ${channel.title}`, description: m.lead(items.length),
      inLanguage: channel.lang, isPartOf: { '@id': `${PUBLIC}/#website` },
      publisher: { '@type': 'NewsMediaOrganization', name: 'AKTUAL MEDIA d.o.o.', url: HUB, email: CONTACT, editor: { '@type': 'Person', name: 'Nermin Sefić', url: 'https://gnk-asg.hr/nermin-sefic/' } }
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'AKTUAL MEDIA', item: HUB },
        { '@type': 'ListItem', position: 2, name: channel.title, item: channel.base },
        { '@type': 'ListItem', position: 3, name: m.title, item: url(channel, 'mravinjak/') }
      ]
    },
    {
      '@context': 'https://schema.org', '@type': 'ItemList',
      name: `${m.title} — ${channel.title}`, numberOfItems: items.length,
      itemListElement: items.slice(0, 60).map((i, index) => ({ '@type': 'ListItem', position: index + 1, url: url(channel, `clanak/${i.slug}/`), name: i.title }))
    }
  ];

  return shell(channel, strings, {
    title: `${m.title} — ${channel.title} · ${items.length}`,
    description: m.lead(items.length),
    path: 'mravinjak/',
    keywords: [...channel.hashtags, '#Mravinjak', '#SeficNermin', channel.city, channel.country, 'AKTUAL MEDIA'],
    jsonld,
    body,
    root: '../'
  });
}

export function loadChannel(channel) {
  const file = join(DATA, `${channel.id}.json`);
  if (!existsSync(file)) return { version: 1, channel: channel.id, updatedAt: '', items: [] };
  return JSON.parse(readFileSync(file, 'utf8'));
}

const relRoot = '';
const url = (channel, path = '') => `${channel.base}${path}`;

/* Engleska imena jezika — za "published in …" i jezični prekidač. */
const COUNTRY_EN = {
  'Hrvatska': 'Croatia', 'Srbija': 'Serbia', 'Bosna i Hercegovina': 'Bosnia and Herzegovina',
  'Mađarska': 'Hungary', 'Slovenija': 'Slovenia', 'Italija': 'Italy',
  'Bugarska': 'Bulgaria', 'Rumunjska': 'Romania'
};
const LANG_NAME = {
  hr: 'Croatian', sr: 'Serbian', bs: 'Bosnian', hu: 'Hungarian',
  sl: 'Slovenian', it: 'Italian', bg: 'Bulgarian', ro: 'Romanian'
};

/* ---------- HTML okvir ---------- */

function shell(channel, strings, { title, description, path, keywords = [], jsonld = [], body, ogAlt = '', type = 'website', published, modified, root = '', image = '', lang = '', locale = '' }) {
  const pageLang = lang || channel.lang;
  const pageLocale = locale || strings.locale;
  const altOriginal = `${PUBLIC}/kanal/${channel.id}/`;
  const altEnglish = `${PUBLIC}/kanal/${channel.id}/en/`;
  const canonical = url(channel, path);
  /* Ime autora se NE stavlja u meta keywords (pravilo repoa i CI gate);
     ono ide u JSON-LD i u vidljive hashtagove. */
  const tags = [...new Set(keywords.filter((k) => !/nermin|sefi[cć]/i.test(k)))].slice(0, 18);
  const ogImage = image || `${PUBLIC}/assets/izdanja/${channel.id}-og.jpg`;
  const hero = `${PUBLIC}/assets/izdanja/${channel.id}-1200.webp`;

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsMediaOrganization', '@id': `${PUBLIC}/#gnk-asg`,
        name: 'GNK ASG d.o.o.', alternateName: ['AKTUAL MEDIA', 'AKTUAL MEDIA KANAL', 'GNK ASG'],
        url: `${PUBLIC}/`, email: CONTACT,
        logo: { '@type': 'ImageObject', url: `${PUBLIC}/assets/gnk-asg-social-card.png` },
        parentOrganization: { '@type': 'Organization', name: 'GNK ASG d.o.o.', url: `${PUBLIC}/` },
        editor: { '@id': `${PUBLIC}/#nermin-sefic` },
        sameAs: [
          `${PUBLIC}/gnk-aktual/`, `${PUBLIC}/izdanja/`, `${PUBLIC}/galerija/`, `${PUBLIC}/radio/`
        ]
      },
      {
        '@type': 'Person', '@id': `${PUBLIC}/#nermin-sefic`,
        name: 'Nermin Sefić',
        jobTitle: 'Urednik i direktor',
        url: `${PUBLIC}/nermin-sefic/`,
        worksFor: { '@id': `${PUBLIC}/#gnk-asg` },
        subjectOf: { '@type': 'ItemList', url: `${PUBLIC}/autorske-objave/` }
      },
      {
        '@type': 'WebSite', '@id': `${PUBLIC}/#website`,
        url: `${PUBLIC}/`, name: 'GNK ASG', inLanguage: ['hr', 'en'],
        publisher: { '@id': `${PUBLIC}/#gnk-asg` }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'GNK ASG', item: `${PUBLIC}/` },
          { '@type': 'ListItem', position: 2, name: 'AKTUAL MEDIA', item: `${PUBLIC}/gnk-aktual/` },
          { '@type': 'ListItem', position: 3, name: channel.title, item: channel.base },
          ...(path ? [{ '@type': 'ListItem', position: 4, name: title, item: canonical }] : [])
        ]
      },
      ...jsonld.filter((node) => !(Array.isArray(node['@type']) ? node['@type'] : [node['@type']]).includes('WebSite'))
    ]
  };
  const ld = `<script type="application/ld+json">${safeJson(graph)}</script>`;
  const palette = channel.palette;
  return `<!doctype html>
<html lang="${pageLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(truncate(description, 300))}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="publisher" content="AKTUAL MEDIA d.o.o.">
<meta name="keywords" content="${esc(tags.join(', '))}">
<meta name="news_keywords" content="${esc(tags.join(', '))}">
<meta name="geo.region" content="${esc(channel.country)}">
<meta name="geo.placename" content="${esc(channel.city)}">
<meta name="theme-color" content="${palette.bg}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="${channel.lang}" href="${altOriginal}">
<link rel="alternate" hreflang="en" href="${altEnglish}">
<link rel="alternate" hreflang="x-default" href="${altOriginal}">
<link rel="alternate" type="application/rss+xml" title="${esc(channel.title)}" href="${url(channel, 'feed.xml')}">
<link rel="alternate" type="application/feed+json" title="${esc(channel.title)}" href="${url(channel, 'feed.json')}">
<link rel="author" href="${PUBLIC}/nermin-sefic/">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" as="image" href="${hero}"${hero.includes(`/izdanja/${channel.id}-1200.webp`) ? ` imagesrcset="/assets/izdanja/${channel.id}-800.webp 800w, /assets/izdanja/${channel.id}-1200.webp 1200w" imagesizes="(max-width:760px) 100vw, 1200px"` : ''} fetchpriority="high">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${esc(channel.title)}">
<meta property="og:locale" content="${pageLocale}">
<meta property="og:locale:alternate" content="hr_HR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(truncate(description, 300))}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:secure_url" content="${ogImage}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(ogAlt || title)}">
${published ? `<meta property="article:published_time" content="${published}">` : ''}
${modified ? `<meta property="article:modified_time" content="${modified}">` : ''}
${published ? `<meta property="article:author" content="${PUBLIC}/nermin-sefic/">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(truncate(description, 200))}">
<meta name="twitter:image" content="${ogImage}">
<meta name="twitter:image:alt" content="${esc(ogAlt || title)}">
<meta name="twitter:site" content="@aktualmedia">
<style>:root{--bg:${palette.bg};--surface:${palette.surface};--accent:${palette.accent};--accent2:${palette.accent2};--ink:${palette.ink}}</style>
<link rel="stylesheet" href="${root}assets/region.css?v=20261021-focus-ring">
${ld}
</head>
<body data-channel="${channel.id}" data-lang="${channel.lang}">
<a class="skip" href="#sadrzaj">Sadržaj</a>
${body}
<a class="hublink" href="${CENTRAL}#izdanja-po-zemljama" rel="external noopener" aria-label="Vrati se u AKTUAL MEDIA — sva izdanja"><span aria-hidden="true">←</span> AKTUAL MEDIA</a>
${miniRail(channel)}
<script src="/assets/aktual-radio-mini-v1.js?v=20261020-radio-mini" defer></script>
</body>
</html>`;
}

function header(channel, strings, active = '', root = '') {
  const mrvLabel = mrvStrings(channel.lang).nav;
  const nav = [
    ['', strings.latest],
    ['mravinjak/', mrvLabel],
    ['izvori/', strings.sources],
    ['metodologija/', strings.methodology]
  ].map(([href, label]) => `<a href="${root}${href}"${href === active ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');
  return `<header class="top">
  <div class="topbar"><span>${esc(strings.editionOf)}</span><a class="topback" href="${CENTRAL}#izdanja-po-zemljama" rel="external noopener">← AKTUAL MEDIA · sva izdanja</a></div>
  <div class="masthead">
    <div class="brand">
      <span class="kicker">${esc(channel.country)} · ${esc(channel.city)}</span>
      <a class="logo" href="${root}./">${esc(channel.title)}</a>
      <p class="strap">${esc(strings.aboutText.split('.')[0])}.</p>
    </div>
    <div class="mastmeta">
      <span>${esc(strings.editor)}: <strong>Nermin Sefić</strong></span>
      <span>${esc(strings.director)}: <strong>Nermin Sefić</strong></span>
      <span>${esc(strings.publisher)}: AKTUAL MEDIA d.o.o.</span>
    </div>
  </div>
  <ul class="hastag-line" aria-label="Oznake izdanja">
    <li class="hastag-k">Oznake</li>
    <li><a href="/nermin-sefic/">#NerminSefić</a></li>
    <li><a href="/nermin-sefic/">#NerminSefic</a></li>
    <li><a href="/autorske-objave/">#SeficNermin</a></li>
    <li><a href="/autorske-objave/">#SEFICNERMIN</a></li>
    <li><a href="/nermin-sefic/">#UrednikNerminSefić</a></li>
    <li><span>#AKTUALMEDIA</span></li>
    <li><span>#GNKASG</span></li>
    <li><span>${esc(channel.hashtags[0] || '')}</span></li>
  </ul>
  ${editionsStrip(channel)}
  <nav class="mainnav" aria-label="${esc(strings.latest)}">${nav}<a href="${CENTRAL}#izdanja-po-zemljama" rel="external">${esc(strings.hub)} ↗</a><a class="langswitch" href="${root}en/" hreflang="en" lang="en" aria-label="Read this edition in English">EN — English</a></nav>
</header>`;
}

function footer(channel, strings, extra = '') {
  const others = CHANNELS.filter((c) => c.id !== channel.id);
  const links = others.map((c) => `<a href="${c.base}" rel="external noopener">${esc(c.title)}</a>`).join('');
  const tags = [...new Set([...channel.hashtags, '#AktualMedia', '#AKTUALMEDIA', '#GNKASG', '#NerminSefić', '#NerminSefic', '#SeficNermin', '#SEFICNERMIN', '#UrednikNerminSefić'])].map((x) => `<li class="tag">${esc(x)}</li>`).join('');
  /* Pločice drugih izdanja: kamo god čitatelj ode, vidi i ostale stranice. */
  const tiles = [...others, channel].map((c) => `<li class="xf-tile"><a href="${c.base}" rel="external noopener">
      <img src="/assets/izdanja/${c.id}-tile.webp" alt="${esc(c.title)} — ${esc(c.country)} — otvori izdanje" width="880" height="587" loading="lazy" decoding="async">
    </a></li>`).join('');
  const desks = [['sport', 'Sport'], ['politika', 'Politika'], ['sigurnost', 'Sigurnost'], ['biznis', 'Business'], ['tehnologija', 'Tehnologija'], ['moda', 'Tjednik Mode'], ['putovanja', 'Putovanja'], ['ljubimci', 'Ljubimci'], ['svijet', 'Svijet']]
    .map(([id, label]) => `<a href="/izdanja/${id}/">${esc(label)}</a>`).join('') + '<a href="/radio/">Radio</a><a href="/galerija/">Galerija</a><a href="/usa/">Colorado · USA</a><a href="/kanal/">Svi kanali</a><a href="/aktual-media/">Podatkovni desk</a><a href="/digital-workforce/knjiga/">Knjiga radnika</a><a href="https://gnk-asg-tjednik.pages.dev/tjednik/2026-W43/" rel="external noopener">Tjednik W43 ↗</a>';
  return `<footer class="foot">
  <section class="xf" aria-label="Ostala izdanja AKTUAL MEDIA">
    <div class="xf-head"><h2>Ostala izdanja — klik vodi na izdanje</h2><a href="${CENTRAL}#izdanja-po-zemljama" rel="external noopener">Sva izdanja →</a></div>
    <ul class="xf-grid">${tiles}</ul>
    <div class="xf-desks">${desks}<a href="https://gnk-asg-tjednik.pages.dev/" rel="external noopener">BUSINESS TJEDNIK ↗</a><a href="https://gnk-asg.hr/gnk-aktual/" rel="external noopener">AKTUAL MEDIA — sve na jednom mjestu ↗</a><a href="/izdanja/">Sva izdanja</a></div>
  </section>
  <div class="footgrid">
    <div>
      <h2>${esc(strings.otherChannels)}</h2>
      <p class="footlinks">${links}<a href="${CENTRAL}#izdanja-po-zemljama" rel="external">${esc(strings.hub)} ↗</a></p>
    </div>
    <div>
      <h2>${esc(strings.publisher)}</h2>
      <p>AKTUAL MEDIA d.o.o. · GNK ASG<br>${esc(strings.editor)}: Nermin Sefić<br><a href="mailto:${CONTACT}">${CONTACT}</a></p>
    </div>
    <div>
      <h2>${esc(strings.hashtags)}</h2>
      <ul class="tags">${tags}</ul>
    </div>
  </div>
  <p class="disclaimer">${esc(strings.autoNote)}</p>
  ${extra}
</footer>`;
}

/* ---------- kartice ---------- */

function card(channel, strings, item, { lead = false, root = '' } = {}) {
  const theme = themeOf(item);
  const labels = strings.themeNames;
  return `<article class="card${lead ? ' card--lead' : ''}">
  <div class="cardmeta"><span class="src">${esc(item.sourceName)}</span><span class="dot">·</span><span class="theme">${esc(labels[theme] || theme)}</span><span class="dot">·</span><time datetime="${esc(item.date)}">${esc(shortDate(item.date.slice(0, 10), channel.lang))}</time></div>
  <h3 class="cardtitle"><a href="${root}clanak/${item.slug}/">${esc(item.title)}</a></h3>
  ${item.summary ? `<p class="cardsum">${esc(truncate(item.summary, lead ? 320 : 170))}</p>` : ''}
  <a class="more" href="${root}clanak/${item.slug}/">${esc(strings.analysis)} →</a>
</article>`;
}

/* ---------- stranice ---------- */

function homePage(channel, strings, data) {
  const items = data.items;
  const lead = items[0];
  const rest = items.slice(1, 13);
  const more = items.slice(13, 30);
  const themes = [...new Set(items.map(themeOf))];
  const themeLinks = themes.map((id) => `<a class="chip" href="tema/${id}/">${esc(strings.themeNames[id] || id)}</a>`).join('');
  const sources = channel.sources.map((s) => `<a class="chip" href="izvor/${s.id}/">${esc(s.name)}</a>`).join('');

  const body = `${header(channel, strings)}
<main id="sadrzaj">
  <section class="intro intro--hero">
    <img class="heroimg" src="/assets/izdanja/${channel.id}-1200.webp" srcset="/assets/izdanja/${channel.id}-800.webp 800w, /assets/izdanja/${channel.id}-1200.webp 1200w" sizes="(max-width:760px) 100vw, 1200px" alt="${esc(channel.title)} — ${esc(channel.city)}, ${esc(channel.country)}" width="1200" height="675" fetchpriority="high" decoding="async">
    <div class="intro-main">
      <p class="dateline">${esc(strings.daily)} · ${esc(longDate(new Date().toISOString().slice(0, 10), channel.lang))}${data.updatedAt ? ` · ${esc(strings.updated)} ${esc(shortDate(data.updatedAt.slice(0, 10), channel.lang))}` : ''}</p>
      <h1>${esc(channel.title)}</h1>
      <p class="intro-text">${esc(strings.aboutText)}</p>
      <p class="live"><span class="live-n"><b>${items.length}</b> ${esc(strings.latest).toLowerCase()}</span><span class="live-sep">·</span><span class="live-t"><time datetime="${esc((items[0]?.date || data.updatedAt || '').slice(0, 10))}">${esc(strings.updated)} ${esc(shortDate((items[0]?.date || data.updatedAt || '').slice(0, 10), channel.lang))}</time></span></p>
      <p class="intro-tags">${channel.hashtags.map((h) => `<span class="tag">${esc(h)}</span>`).join(' ')}</p>
      <p class="hero-tags">Oznake izdanja: <a href="/nermin-sefic/">#NerminSefić</a> · <a href="/nermin-sefic/">#NerminSefic</a> · <a href="/autorske-objave/">#SeficNermin</a> · <a href="/autorske-objave/">#SEFICNERMIN</a> · <a href="/nermin-sefic/">#UrednikNerminSefić</a> · #AKTUALMEDIA · #GNKASG · ${esc(channel.hashtags[0] || '')}</p>
    </div>
    <aside class="intro-side">
      <h2>${esc(strings.radio)}</h2>
      ${channel.radio.map((r) => `<a class="radio" href="${r.url}" target="_blank" rel="external noopener"><span class="radio-dot" aria-hidden="true"></span><span>${esc(r.name)}</span><small>${esc(strings.radioNote)}</small></a>`).join('')}
    </aside>
  </section>

  ${lead ? `<section class="leadgrid">
    ${card(channel, strings, lead, { lead: true })}
    <div class="leadside">${rest.slice(0, 4).map((i) => card(channel, strings, i)).join('')}</div>
  </section>` : `<section class="leadgrid"><div class="empty"><h2>${esc(strings.emptyTitle)}</h2><p>${esc(strings.emptyText)}</p></div></section>`}

  <section class="band">
    <div class="bandhead"><h2>${esc(strings.latest)}</h2><span class="count">${items.length}</span></div>
    <div class="grid">${rest.slice(4).map((i) => card(channel, strings, i)).join('')}</div>
  </section>

  ${more.length ? `<section class="band">
    <div class="bandhead"><h2>${esc(strings.allNews)}</h2></div>
    <ul class="list">${more.map((i) => `<li><time datetime="${esc(i.date)}">${esc(shortDate(i.date.slice(0, 10), channel.lang))}</time><a href="clanak/${i.slug}/">${esc(i.title)}</a><span class="src">${esc(i.sourceName)}</span></li>`).join('')}</ul>
  </section>` : ''}

  ${mravinjakSection(channel, strings, data)}

  <section class="band">
    <div class="bandhead"><h2>${esc(strings.themes)}</h2></div>
    <p class="chips">${themeLinks || `<span class="chip">${esc(strings.themeNames.drustvo)}</span>`}</p>
  </section>

  <section class="band about">
    <div>
      <h2>${esc(strings.aboutTitle)}</h2>
      <p>${esc(strings.aboutText)}</p>
      <p class="small">${esc(strings.autoNote)}</p>
    </div>
    <div>
      <h2>${esc(strings.sources)}</h2>
      <p class="chips">${sources}</p>
      <p class="small">${esc(strings.sourcesLead)}</p>
      <p><a href="metodologija/">${esc(strings.methodology)} →</a></p>
    </div>
  </section>

  ${items.length ? '' : `<section class="band empty"><h2>${esc(strings.emptyTitle)}</h2><p>${esc(strings.emptyText)}</p></section>`}
</main>
${footer(channel, strings)}`;

  /* WebSite i Organization već nosi shell graf. Ovdje ostaje samo
     sadržaj specifičan za stranicu — bez drugog entiteta iste vrste. */
  const jsonld = [
    {
      '@context': 'https://schema.org', '@type': 'ItemList',
      name: `${channel.title} — ${strings.latest}`, numberOfItems: items.length,
      itemListElement: items.slice(0, 20).map((i, index) => ({
        '@type': 'ListItem', position: index + 1, url: url(channel, `clanak/${i.slug}/`), name: i.title
      }))
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'AKTUAL MEDIA', item: HUB },
        { '@type': 'ListItem', position: 2, name: channel.title, item: channel.base }
      ]
    }
  ];

  return shell(channel, strings, {
    title: channel.id === 'zagreb'
      ? `${channel.title} — 10 provjerljivih objava dnevno: analize, rokovi, brojke i pojašnjenja`
      : `${channel.title} — dnevni osvrti · ${channel.city}, ${channel.country} · ${new Date().toISOString().slice(0, 10)}`,
    description: `${channel.title}: ${strings.aboutText}`,
    path: '',
    keywords: [...channel.hashtags, channel.country, channel.city, ...channel.sources.map((s) => s.name), 'AKTUAL MEDIA', 'GNK ASG'],
    jsonld,
    body
  });
}


/* ---------- komentar redakcijskog bota (označen kao automatiziran) ---------- */

const BOT = {
  hr: {
    label: 'Komentar redakcijskog bota',
    note: 'Ovaj komentar sastavio je redakcijski bot iz naslova, sažetka, datuma i poveznice na izvornik — nije komentar čitatelja i nije pojedinačno urednički pregledan.',
    num: 'Naslov ističe brojku, pa je prvo pitanje što ta brojka mjeri, na koje se razdoblje odnosi i postoji li dokument iza nje.',
    nonum: 'Naslov ne ističe brojku, pa je glavno pitanje što je u tekstu tvrdnja, a što kontekst koji je okružuje.'
  },
  sr: {
    label: 'Komentar redakcijskog bota',
    note: 'Ovaj komentar sastavio je redakcijski bot iz naslova, sažetka, datuma i veze ka izvoru — nije komentar čitalaca i nije pojedinačno urednički pregledan.',
    num: 'Naslov ističe brojku, pa je prvo pitanje šta ta brojka meri, na koji period se odnosi i postoji li dokument iza nje.',
    nonum: 'Naslov ne ističe brojku, pa je glavno pitanje šta je u tekstu tvrdnja, a šta kontekst koji je okružuje.'
  },
  bs: {
    label: 'Komentar redakcijskog bota',
    note: 'Ovaj komentar sastavio je redakcijski bot iz naslova, sažetka, datuma i linka na izvor — nije komentar čitalaca i nije pojedinačno urednički pregledan.',
    num: 'Naslov ističe brojku, pa je prvo pitanje šta ta brojka mjeri, na koji period se odnosi i postoji li dokument iza nje.',
    nonum: 'Naslov ne ističe brojku, pa je glavno pitanje šta je u tekstu tvrdnja, a šta kontekst koji je okružuje.'
  },
  hu: {
    label: 'A szerkesztőségi bot megjegyzése',
    note: 'Ezt a megjegyzést a szerkesztőségi bot készítette a címből, a kivonatból, a dátumból és a forráslinkből — nem olvasói hozzászólás, és nem esett egyedi szerkesztői ellenőrzésen.',
    num: 'A cím számot emel ki, ezért az első kérdés az, hogy mit mér ez a szám, melyik időszakra vonatkozik, és van-e mögötte dokumentum.',
    nonum: 'A cím nem emel ki számot, ezért a fő kérdés az, mi a tény állítása a szövegben, és mi a kontextus.'
  },
  sl: {
    label: 'Komentar uredniškega bota',
    note: 'Ta komentar je sestavil uredniški bot iz naslova, povzetka, datuma in povezave na vir — ni komentar bralcev in ni bil posamično uredniško pregledan.',
    num: 'Naslov poudarja številko, zato je prvo vprašanje, kaj ta številka meri, na katero obdobje se nanaša in ali za njo stoji dokument.',
    nonum: 'Naslov ne poudarja številke, zato je glavno vprašanje, kaj je v besedilu trditev in kaj kontekst.'
  },
  it: {
    label: 'Commento del bot redazionale',
    note: 'Questo commento è stato composto dal bot della redazione da titolo, sommario, data e link alla fonte — non è un commento dei lettori e non è stato verificato singolarmente.',
    num: 'Il titolo mette in evidenza un numero: la prima domanda è che cosa misuri, a quale periodo si riferisca e se esista un documento a sostegno.',
    nonum: 'Il titolo non mette in evidenza un numero: la domanda principale è che cosa sia affermazione nel testo e che cosa contesto.'
  },
  bg: {
    label: 'Коментар на редакционния бот',
    note: 'Този коментар е съставен от редакционния бот от заглавието, резюмето, датата и връзката към източника — не е читателски коментар и не е индивидуално редакторски проверен.',
    num: 'Заглавието изтъква число, затова първият въпрос е какво измерва то, за кой период се отнася и има ли документ зад него.',
    nonum: 'Заглавието не изтъква число, затова основният въпрос е кое в текста е твърдение и кое е контекст.'
  },
  ro: {
    label: 'Comentariul botului redacției',
    note: 'Acest comentariu a fost compus de botul redacției din titlu, rezumat, data și linkul către sursă — nu este un comentariu al cititorilor și nu a fost verificat individual.',
    num: 'Titlul evidențiază o cifră, așa că prima întrebare este ce măsoară acea cifră, la ce perioadă se referă și dacă există un document în spatele ei.',
    nonum: 'Titlul nu evidențiază o cifră, așa că întrebarea principală este ce este afirmație în text și ce este context.'
  }
};

function articlePage(channel, strings, item, items) {
  const theme = themeOf(item);
  const a = ANALYSIS[channel.lang] || ANALYSIS.hr;
  const themeName = strings.themeNames[theme] || theme;
  const ctx = { title: item.title, summary: item.summary, theme: themeName, source: item.sourceName, date: longDate(item.date.slice(0, 10), channel.lang) };
  const paragraphs = [
    a.context(ctx),
    a.claim(ctx),
    item.summary ? a.summary(ctx) : a.noSummary(ctx)
  ];
  if (/\d/.test(item.title)) paragraphs.push(a.numbers(ctx));
  if (/\b(izvor|izvori|krugovi|neimenovan|anonim|prema saznanjima|saznaje)\b/i.test(`${item.title} ${item.summary}`)) paragraphs.push(a.unnamed(ctx));
  if (a.headline) paragraphs.push(a.headline(ctx));
  if (a.attribution) paragraphs.push(a.attribution(ctx));
  if (a.verification) paragraphs.push(a.verification(ctx));
  if (a.counterpoint) paragraphs.push(a.counterpoint(ctx));
  paragraphs.push(a.framing(ctx), a.read(ctx));
  const day = item.date.slice(0, 10);
  const checks = checksFor(item, strings);
  const related = items.filter((i) => i.slug !== item.slug && themeOf(i) === theme).slice(0, 4);
  const score = scoreFromTitle(item.title);
  const tags = [...new Set([...channel.hashtags, channel.country, channel.city, item.sourceName, strings.themeNames[theme] || theme])];
  const bot = BOT[channel.lang] || BOT.hr;
  const botText = `${bot.note} ${/\d/.test(item.title) ? bot.num : bot.nonum}`;

  const root = '../../';
  /* Slika ide kroz naš posrednik: izdavač ne vidi čitatelja, a slika je
     keširana na rubu. Ako je nema, članak ostaje bez slike — ne lijepimo
     zamjensku koja glumi fotografiju. */
  const heroImage = /^https:\/\//.test(item.image || '')
    ? `${PUBLIC}/api/img?u=${encodeURIComponent(item.image)}&w=1200`
    : '';
  const ogImage = heroImage || `${PUBLIC}/assets/izdanja/${channel.id}-og.jpg`;
  const body = `${header(channel, strings, '', root)}
<main id="sadrzaj" class="article">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="${root}">${esc(channel.title)}</a> <span>›</span> <a href="${root}izvor/${item.source}/">${esc(item.sourceName)}</a> <span>›</span> <span>${esc(strings.analysis)}</span></nav>
  <article>
    <header class="arthead">
      <p class="kicker">${esc(item.sourceName)} · ${esc(strings.themeNames[theme] || theme)}</p>
      <h1>${esc(item.title)}</h1>
      <p class="artmeta"><time datetime="${esc(item.date)}">${esc(longDate(day, channel.lang))}</time> · ${esc(strings.source)}: <a href="${item.url}" target="_blank" rel="external noopener nofollow">${esc(item.sourceName)} ↗</a></p>
    </header>

    ${heroImage ? `<figure class="artimg"><img src="${esc(heroImage)}" alt="${esc(item.imageAlt || item.title)}" width="1200" height="675" loading="eager" decoding="async" referrerpolicy="no-referrer">${item.sourceName ? `<figcaption>${esc(strings.photoFrom || 'Foto')}: ${esc(item.sourceName)}</figcaption>` : ''}</figure>` : ''}

    ${score ? `<div class="scorebox"><span class="scorelabel">${esc(strings.source)}</span><strong class="score">${esc(score.label)}</strong><span class="small">${esc(item.title)}</span></div>` : ''}

    <section class="quote">
      <h2>${esc(strings.summary)}</h2>
      <blockquote>${esc(item.summary || item.title)}</blockquote>
      <p class="small">${esc(strings.quoteNote)}</p>
      <p><a class="cta" href="${item.url}" target="_blank" rel="external noopener nofollow">${esc(strings.readAtSource)} ↗</a></p>
    </section>

    <section class="osvrt">
      ${paragraphs.map((p) => `<p>${esc(p)}</p>`).join('\n      ')}
    </section>

    <section class="botnote" aria-label="${esc(bot.label)}">
      <p class="botnote-k">${esc(bot.label)}</p>
      <p>${esc(botText)}</p>
    </section>

    <section class="checks">
      <h2>${esc(strings.analysis)}</h2>
      <ol>${checks.map((c) => `<li>${esc(c)}</li>`).join('')}</ol>
      <p class="small">${esc(strings.autoNote)}</p>
    </section>

    <ul class="hastag-line" aria-label="Oznake teksta">
      <li class="hastag-k">Oznake</li>
      <li><a href="/nermin-sefic/">#NerminSefić</a></li>
      <li><a href="/nermin-sefic/">#NerminSefic</a></li>
      <li><a href="/autorske-objave/">#SeficNermin</a></li>
      <li><a href="/autorske-objave/">#SEFICNERMIN</a></li>
      <li><a href="/nermin-sefic/">#UrednikNerminSefić</a></li>
      <li><a href="/gnk-aktual/">#AKTUALMEDIA</a></li>
      <li><a href="/kanal/">#GNKASG</a></li>
      ${tags.map((tag) => `<li><span>${esc(tag)}</span></li>`).join('')}
    </ul>

    ${related.length ? `<section class="related"><h2>${esc(strings.themeNames[theme] || theme)}</h2><ul class="list">${related.map((r) => `<li><time datetime="${esc(r.date)}">${esc(shortDate(r.date.slice(0, 10), channel.lang))}</time><a href="${root}clanak/${r.slug}/">${esc(r.title)}</a><span class="src">${esc(r.sourceName)}</span></li>`).join('')}</ul></section>` : ''}

    <p class="backlink"><a href="${root}">← ${esc(strings.back)}</a></p>
  </article>
</main>
${footer(channel, strings)}`;

  const canonical = url(channel, `clanak/${item.slug}/`);
  const jsonld = [
    {
      '@context': 'https://schema.org', '@type': 'NewsArticle',
      '@id': `${canonical}#clanak`, url: canonical, mainEntityOfPage: canonical,
      headline: truncate(item.title, 110), name: item.title,
      description: truncate(item.summary || item.title, 300),
      inLanguage: channel.lang,
      datePublished: item.date, dateModified: item.date,
      isBasedOn: item.url,
      isAccessibleForFree: true,
      articleSection: strings.themeNames[theme] || theme,
      keywords: [...new Set([...tags, 'AKTUAL MEDIA', 'media critique'])].join(', '),
      author: { '@type': 'Organization', name: 'AKTUAL MEDIA d.o.o.', url: HUB },
      editor: { '@type': 'Person', name: 'Nermin Sefić', url: 'https://gnk-asg.hr/nermin-sefic/' },
      publisher: {
        '@type': 'NewsMediaOrganization', name: 'AKTUAL MEDIA d.o.o.', url: HUB,
        logo: { '@type': 'ImageObject', url: 'https://gnk-asg.hr/assets/logo-gnk-asg-canonical.svg' },
        employee: [{ '@type': 'Person', name: 'Nermin Sefić', jobTitle: 'Direktor', url: 'https://gnk-asg.hr/nermin-sefic/' }]
      },
      citation: { '@type': 'CreativeWork', name: item.title, url: item.url, publisher: { '@type': 'Organization', name: item.sourceName } },
      comment: [{
        '@type': 'Comment', '@id': `${canonical}#komentar-bota`, url: `${canonical}#komentar-bota`,
        text: botText, dateCreated: item.date, inLanguage: channel.lang,
        author: { '@type': 'Organization', name: 'AKTUAL MEDIA · redakcijski bot', url: url(channel, 'metodologija/') }
      }]
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'AKTUAL MEDIA', item: HUB },
        { '@type': 'ListItem', position: 2, name: channel.title, item: channel.base },
        { '@type': 'ListItem', position: 3, name: item.sourceName, item: url(channel, `izvor/${item.source}/`) },
        { '@type': 'ListItem', position: 4, name: truncate(item.title, 80), item: canonical }
      ]
    }
  ];

  return shell(channel, strings, {
    title: `${item.title} — ${item.sourceName} | ${channel.title}`,
    description: item.summary || `${strings.analysis}: ${item.title} (${item.sourceName})`,
    path: `clanak/${item.slug}/`,
    keywords: [...tags, item.sourceName],
    jsonld,
    body,
    type: 'article',
    published: item.date,
    modified: item.date,
    ogAlt: item.imageAlt || item.title,
    image: ogImage,
    root
  });
}

function listPage(channel, strings, { title, description, path, items, lead }) {
  const root = path.split('/').filter(Boolean).length >= 2 ? '../../' : '../';
  const body = `${header(channel, strings, path, root)}
<main id="sadrzaj" class="page">
  <h1>${esc(title)}</h1>
  <p class="lead">${esc(lead)}</p>
  ${items.length ? `<ul class="list big">${items.map((i) => `<li><time datetime="${esc(i.date)}">${esc(shortDate(i.date.slice(0, 10), channel.lang))}</time><a href="${root}clanak/${i.slug}/">${esc(i.title)}</a><span class="src">${esc(i.sourceName)}</span></li>`).join('')}</ul>` : `<p class="empty">${esc(strings.emptyText)}</p>`}
  <p><a href="${root}">← ${esc(strings.back)}</a></p>
</main>
${footer(channel, strings)}`;

  const canonical = url(channel, path);
  return shell(channel, strings, {
    title: `${title} | ${channel.title}`,
    description,
    path,
    keywords: [...channel.hashtags, title, channel.city],
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      url: canonical, name: title, description, inLanguage: channel.lang,
      isPartOf: { '@id': `${PUBLIC}/#website` }
    }],
    body,
    root
  });
}

/* ---------- feedovi i sitemap ---------- */

const feedItems = (channel, items) => items.slice(0, 240).map((item) => ({
  id: url(channel, `clanak/${item.slug}/`),
  url: url(channel, `clanak/${item.slug}/`),
  title: `Osvrt: ${item.title}`,
  summary: item.summary || item.title,
  date_published: item.date,
  authors: [{ name: 'AKTUAL MEDIA', url: channel.base }],
  tags: [item.sourceName, channel.city],
  _region: { source: item.source, sourceUrl: item.url, channel: channel.id, status: 'auto-critique' }
}));

function writeFeed(channel, strings, data) {
  const dir = join(SITE, channel.id);
  const items = feedItems(channel, data.items);
  const json = {
    version: 'https://jsonfeed.org/version/1.1',
    title: `${channel.title} — AKTUAL MEDIA`,
    home_page_url: channel.base,
    feed_url: url(channel, 'feed.json'),
    description: strings.aboutText,
    language: channel.lang,
    _region: { publisher: 'AKTUAL MEDIA d.o.o.', editor: 'Nermin Sefić', director: 'Nermin Sefić', status: 'auto-critique', hub: HUB, sources: channel.sources.map((s) => s.name) },
    items
  };
  writeFileSync(join(dir, 'feed.json'), `${JSON.stringify(json, null, 2)}\n`);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${esc(channel.title)} — AKTUAL MEDIA</title>
<link>${channel.base}</link>
<atom:link href="${url(channel, 'feed.xml')}" rel="self" type="application/rss+xml"/>
<description>${esc(strings.aboutText)}</description>
<language>${channel.lang}</language>
<managingEditor>info@gnk-asg.hr (Nermin Sefić)</managingEditor>
<webMaster>info@gnk-asg.hr (Nermin Sefić)</webMaster>
<lastBuildDate>${new Date(data.updatedAt || Date.now()).toUTCString()}</lastBuildDate>
${items.slice(0, 100).map((i) => `<item>
<title>${esc(i.title)}</title>
<link>${i.url}</link>
<guid isPermaLink="true">${i.url}</guid>
<pubDate>${new Date(i.date_published).toUTCString()}</pubDate>
<description>${esc(i.summary)}</description>
<dc:creator>AKTUAL MEDIA</dc:creator>
${i.tags.map((tg) => `<category>${esc(tg)}</category>`).join('\n')}
</item>`).join('\n')}
</channel>
</rss>
`;
  writeFileSync(join(dir, 'feed.xml'), xml);

  writeFileSync(join(dir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${url(channel, 'sitemap.xml')}\n`);

  writeFileSync(join(dir, 'llms.txt'), `# ${channel.title}\n\n> ${strings.aboutText}\n\nIzdavač: AKTUAL MEDIA d.o.o. · Urednik: Nermin Sefić · Direktor: Nermin Sefić · Kontakt: ${CONTACT}\nJezik: ${channel.lang} · Zemlja: ${channel.country} · Grad: ${channel.city}\nStatus: automatski sastavljeni osvrti na način izvještavanja; izvornici su povezani.\n\n## Izvori\n${channel.sources.map((s) => `- ${s.name}`).join('\n')}\n\n## Stranice\n- ${channel.base}\n- ${url(channel, 'mravinjak/')}\n- ${url(channel, 'izvori/')}\n- ${url(channel, 'metodologija/')}\n- ${url(channel, 'en/')} (English overview)\n- ${url(channel, 'feed.json')}\n- ${url(channel, 'sitemap.xml')}\n- ${HUB}\n`);
}

function writeSitemap(channel, data) {
  const urls = [
    { loc: channel.base, priority: '1.0' },
    { loc: url(channel, 'mravinjak/'), priority: '0.7' },
    { loc: url(channel, 'izvori/'), priority: '0.6' },
    { loc: url(channel, 'metodologija/'), priority: '0.5' },
    { loc: url(channel, 'en/'), priority: '0.6' },
    ...[...new Set(data.items.map(themeOf))].map((id) => ({ loc: url(channel, `tema/${id}/`), priority: '0.5' })),
    ...channel.sources.map((s) => ({ loc: url(channel, `izvor/${s.id}/`), priority: '0.4' })),
    ...data.items.map((i) => ({ loc: url(channel, `clanak/${i.slug}/`), priority: '0.8', lastmod: i.date }))
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ''}<changefreq>${u.loc === channel.base ? 'hourly' : 'weekly'}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
  writeFileSync(join(SITE, channel.id, 'sitemap.xml'), xml);
}

/* ---------- javni poziv ---------- */


/* ---------- 301: stara adresa izdanja -> gnk-asg.hr/kanal/<id>/ ---------- */
/* Projekt na pages.dev ostaje živ samo kao preusmjerivač: svaki put vodi na
   kanonsku adresu pod glavnom domenom, gdje su i sitemap i canonical. */

function writeLegacyRedirect(channel) {
  const dir = join(LEGACY, channel.id);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, '_redirects'), `/* ${channel.base}:splat 301\n`);
  writeFileSync(join(dir, 'index.html'), `<!doctype html>
<html lang="${channel.lang}">
<head>
<meta charset="utf-8">
<title>${esc(channel.title)} — preseljeno</title>
<link rel="canonical" href="${channel.base}">
<meta name="robots" content="noindex,follow">
<meta http-equiv="refresh" content="0; url=${channel.base}">
</head>
<body><p>Ovo izdanje je na novoj adresi: <a href="${channel.base}">${esc(channel.title)}</a>.</p></body>
</html>`);
}


/* ---------- engleski pregled izdanja ----------
 * Ne prevodi se svaki tekst: prevodi se ulaz. Engleska stranica objašnjava što
 * izdanje radi, navodi izvore i zadnjih 24 naslova u izvornom jeziku (naslov se
 * ne prepisuje), a svaki link vodi na izvorni članak i njegov izvor. */
const EN_UI = {
  intro: (c, n, s) => `AKTUAL MEDIA ${c.title.replace(/^AKTUAL MEDIA\s*/i, '')} covers ${c.city}, ${COUNTRY_EN[c.country] || c.country}. The edition is published in ${LANG_NAME[c.lang] || c.lang}. This page is the English entry point: it explains how the edition works and lists the latest ${n} headlines in the original language, each linked to its source.`,
  what: 'What this edition does',
  bullets: [
    'Every day it reads the public feeds, sitemaps and APIs of the named outlets below.',
    'For each text it writes a short review of how the story is reported: what the headline claims, which number lacks a document, who is quoted, and what the body leaves out.',
    'It never republishes the full article. Each item links to the original with the publication date, and the source is named in the review.',
    'Automated parts are labelled as such. Claims made by a source are attributed to that source, not to this newsroom.'
  ],
  latest: 'Latest headlines (original language)',
  sources: 'Sources this edition reads',
  original: 'Read the edition in the original language',
  note: 'Headlines are shown exactly as published, in the original language. The English text on this page is an editorial overview, not a translation of the articles.'
};

function englishPage(channel, strings, data) {
  const n = Math.min(24, data.items.length);
  const items = data.items.slice(0, n);
  const root = '../';
  const updated = data.items[0]?.date ? shortDate(data.items[0].date.slice(0, 10), 'en') : '';
  const city = CITY_SHORT[channel.id] || channel.city;
  const title = `AKTUAL MEDIA ${city} — English overview of the ${COUNTRY_EN[channel.country] || channel.country} edition`;
  const description = `English entry point for the ${channel.title} edition: what it covers, which outlets it reads and the latest headlines in ${esc(LANG_NAME[channel.lang] || channel.lang)}, each linked to the original source.`;
  const body = `<div class="topbar"><span>AKTUAL MEDIA · ${esc(channel.country)}</span><a class="topback" href="${root}">← ${esc(EN_UI.original)}</a></div>
<header class="top en-head">
  <div class="masthead">
    <div class="brand">
      <span class="kicker">${esc(channel.country)} · ${esc(city)} · English</span>
      <a class="logo" href="${root}">${esc(channel.title)}</a>
      <p class="strap">${esc(EN_UI.note)}</p>
    </div>
    <div class="mastmeta">
      <span>Editor &amp; director: <strong>Nermin Sefić</strong></span>
      <span>Publisher: AKTUAL MEDIA d.o.o.</span>
      <span>${esc(data.items.length)} reviews · ${esc(channel.sources.length)} sources${updated ? ` · latest ${esc(updated)}` : ''}</span>
    </div>
  </div>
  <p class="hastag-line" aria-label="Tags">
    <span class="hastag-k">Tags</span>
    <a href="/nermin-sefic/">#NerminSefić</a>
    <a href="/nermin-sefic/">#NerminSefic</a>
    <a href="/nermin-sefic/">#SeficNermin</a>
    <a href="/nermin-sefic/">#SEFICNERMIN</a>
    <span>#AKTUALMEDIA</span><span>#GNKASG</span><span>#EnglishOverview</span>
  </p>
  <nav class="mainnav" aria-label="Sections"><a href="${root}" hreflang="${channel.lang}" lang="${channel.lang}">${esc(strings.latest)} (${esc(channel.langName)})</a><a href="${root}mravinjak/" hreflang="${channel.lang}" lang="${channel.lang}">${esc(mrvStrings(channel.lang).nav)}</a><a href="${root}metodologija/" hreflang="${channel.lang}" lang="${channel.lang}">${esc(strings.methodology)}</a><a href="${CENTRAL}" rel="external">AKTUAL MEDIA</a><a class="langswitch" href="${root}">${esc(channel.langName)}</a></nav>
</header>
<main id="sadrzaj" class="page">
  <h1>${esc(title)}</h1>
  <p class="lead">${esc(EN_UI.intro(channel, n, channel.sources.length))}</p>
  <p><a class="cta" href="${root}" hreflang="${channel.lang}">← ${esc(EN_UI.original)}</a></p>

  <h2>${esc(EN_UI.what)}</h2>
  <ul class="rules">${EN_UI.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>

  <h2>${esc(EN_UI.latest)}</h2>
  ${items.length ? `<ul class="list en-list">${items.map((i) => `<li><time datetime="${esc(i.date)}">${esc(shortDate(i.date.slice(0, 10), 'en'))}</time><a href="${root}clanak/${esc(i.slug)}/" hreflang="${channel.lang}" lang="${channel.lang}">${esc(i.title)}</a><span class="src">${esc(i.sourceName)}</span></li>`).join('')}</ul>` : '<p class="small">No items stored yet.</p>'}
  <p class="small">${esc(EN_UI.note)}</p>

  <h2>${esc(EN_UI.sources)}</h2>
  <ul class="list">${channel.sources.map((x) => `<li><a href="${root}izvor/${x.id}/" hreflang="${channel.lang}">${esc(x.name)}</a><span class="src">${esc(x.type.toUpperCase())}</span></li>`).join('')}</ul>

  <h2>Other editions</h2>
  <ul class="list">${CHANNELS.filter((c) => c.id !== channel.id).map((c) => `<li><a href="${c.base}en/" hreflang="en">${esc(c.title)}</a><span class="src">${esc(COUNTRY_EN[c.country] || c.country)}</span></li>`).join('')}</ul>
  <p><a href="${HUB}" rel="external">All editions and desks →</a> · <a href="/kanal/" rel="external">Channels</a> · <a href="/radio/" rel="external">AKTUAL MEDIA RADIO</a> · <a href="${CENTRAL}" rel="external">AKTUAL MEDIA</a></p>
</main>
${footer(channel, strings)}`;

  return shell(channel, strings, {
    title: `${title} | AKTUAL MEDIA`,
    description,
    path: 'en/',
    lang: 'en',
    locale: 'en_US',
    keywords: [...channel.hashtags, 'English', 'AKTUAL MEDIA', 'GNK ASG', 'Nermin Sefić review'],
    type: 'website',
    root,
    body,
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'WebPage',
      name: title, description, inLanguage: 'en',
      url: url(channel, 'en/'),
      isPartOf: { '@id': `${PUBLIC}/#website` },
      about: { '@type': 'NewsMediaOrganization', name: 'AKTUAL MEDIA d.o.o.', url: `${PUBLIC}/` },
      editor: { '@type': 'Person', name: 'Nermin Sefić', jobTitle: 'Editor and director', url: `${PUBLIC}/nermin-sefic/` }
    }]
  });
}

export function buildChannel(channel) {
  const strings = t(channel.lang).ui;
  const data = loadChannel(channel);
  data.items = [...data.items]
    .filter((i) => i && i.slug && i.title && i.url)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  // Dopunski izvori (optional) dobivaju stranicu i chip tek kada stvarno daju zapise.
  channel = {
    ...channel,
    sources: channel.sources.filter((source) => !source.optional || data.items.some((item) => item.source === source.id))
  };

  const dir = join(SITE, channel.id);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'assets'), { recursive: true });

  const write = (path, html) => {
    const target = join(dir, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, html);
  };

  write('index.html', homePage(channel, strings, data));
  for (const item of data.items) write(`clanak/${item.slug}/index.html`, articlePage(channel, strings, item, data.items));

  const byTheme = new Map();
  for (const item of data.items) {
    const id = themeOf(item);
    if (!byTheme.has(id)) byTheme.set(id, []);
    byTheme.get(id).push(item);
  }
  for (const [id, list] of byTheme) {
    write(`tema/${id}/index.html`, listPage(channel, strings, {
      title: `${strings.themeNames[id] || id} — ${channel.title}`,
      description: `${strings.themeNames[id] || id}: ${list.length} osvrta u izdanju ${channel.title}.`,
      path: `tema/${id}/`, items: list,
      lead: `${strings.themeNames[id] || id} · ${channel.city} · ${list.length}`
    }));
  }

  for (const source of channel.sources) {
    const list = data.items.filter((i) => i.source === source.id);
    write(`izvor/${source.id}/index.html`, listPage(channel, strings, {
      title: `${source.name} — ${channel.title}`,
      description: `Osvrti na tekstove izvora ${source.name} u izdanju ${channel.title}.`,
      path: `izvor/${source.id}/`, items: list,
      lead: `${source.name} · ${list.length}`
    }));
  }

  write('mravinjak/index.html', mravinjakPage(channel, strings, data));
  write('en/index.html', englishPage(channel, strings, data));

  write('izvori/index.html', listPage(channel, strings, {
    title: `${strings.sources} — ${channel.title}`,
    description: strings.sourcesLead,
    path: 'izvori/', items: data.items,
    lead: strings.sourcesLead
  }));

  const methodBody = `${header(channel, strings, 'metodologija/', '../')}
<main id="sadrzaj" class="page">
  <h1>${esc(strings.methodology)}</h1>
  <p class="lead">${esc(strings.methodLead)}</p>
  <ol class="rules">${strings.methodPoints.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
  <h2>${esc(strings.sources)}</h2>
  <ul class="list">${channel.sources.map((s) => `<li><a href="../izvor/${s.id}/">${esc(s.name)}</a><span class="src">${s.type.toUpperCase()}</span></li>`).join('')}</ul>
  <h2>${esc(strings.contact)}</h2>
  <p><a href="mailto:${CONTACT}">${CONTACT}</a> · AKTUAL MEDIA d.o.o. · ${esc(strings.editor)}: Nermin Sefić</p>
  <p class="small">${esc(strings.autoNote)}</p>
  <p><a href="../">← ${esc(strings.back)}</a></p>
</main>
${footer(channel, strings)}`;
  write('metodologija/index.html', shell(channel, strings, {
    title: `${strings.methodology} — ${channel.title}`,
    description: strings.methodLead,
    path: 'metodologija/',
    keywords: [...channel.hashtags, strings.methodology],
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'AboutPage',
      url: url(channel, 'metodologija/'), name: strings.methodology,
      inLanguage: channel.lang, isPartOf: { '@id': `${PUBLIC}/#website` }
    }],
    body: methodBody,
    root: '../'
  }));

  write('404.html', shell(channel, strings, {
    title: `404 — ${channel.title}`, description: strings.emptyText, path: '404.html',
    jsonld: [], root: '', body: `${header(channel, strings)}<main id="sadrzaj" class="page"><h1>404</h1><p class="lead">${esc(strings.emptyText)}</p><p><a href="/">← ${esc(strings.back)}</a></p></main>${footer(channel, strings)}`
  }));

  writeFileSync(join(dir, 'assets', 'region.css'), CSS);

  writeLegacyRedirect(channel);
  writeFileSync(join(dir, 'assets', 'favicon.svg'), favicon(channel));
  writeFeed(channel, strings, data);
  writeSitemap(channel, data);

  return { channel: channel.id, pages: 4 + data.items.length + byTheme.size + channel.sources.length, items: data.items.length };
}

const favicon = (channel) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${channel.palette.bg}"/><text x="32" y="42" font-family="Georgia,serif" font-size="30" font-weight="700" text-anchor="middle" fill="${channel.palette.accent}">${esc(channel.title.split(' ').pop().slice(0, 1))}</text></svg>`;

export const CSS = `*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#f6f4ef;color:#15191f;font:16px/1.62 Georgia,"Times New Roman",serif}
a{color:inherit;text-decoration:none}
a:hover{text-decoration:underline}
img{max-width:100%;height:auto}
.skip{position:absolute;left:-9999px}
.skip:focus{left:8px;top:8px;background:#fff;padding:8px;z-index:99}
/* Tipkovnica mora vidjeti gdje je fokus. Bez ovoga preglednik nacrta
   vlastiti obrub koji na tamnim pločama nestane. */
a:focus-visible,button:focus-visible,summary:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{outline:3px solid #e9c66c;outline-offset:3px;border-radius:4px}
main:focus-visible{outline:3px solid #e9c66c;outline-offset:6px}
.top{background:var(--bg);color:var(--ink)}
.xf{border-top:1px solid rgba(255,255,255,.16);padding:26px clamp(16px,4vw,48px) 8px;margin:0 auto;max-width:1400px}
.xf-head{display:flex;justify-content:space-between;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:14px}
.xf-head h2{font:700 clamp(18px,2vw,24px)/1.2 Georgia,serif;margin:0;color:var(--ink)}
.xf-head a{color:var(--accent);font:700 12px/1 system-ui,sans-serif;text-decoration:none}
.xf-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;list-style:none;padding:0;margin:0 0 14px}
.xf-tile{border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.14);transition:transform .2s ease,border-color .2s ease}
.xf-tile:hover{transform:translateY(-2px);border-color:var(--accent)}
.xf-tile img{display:block;width:100%;height:auto;aspect-ratio:880/587;object-fit:cover}
.xf-desks{display:flex;flex-wrap:wrap;gap:8px}
.xf-desks a{font:700 11.5px/1 system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--ink);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:8px 12px;text-decoration:none}
.xf-desks a:hover{border-color:var(--accent);color:var(--accent)}
@media(max-width:900px){.xf-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:600px){.xf-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.edmini{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:79;display:flex;align-items:center;gap:7px;padding:7px 11px;border-radius:999px;background:rgba(8,13,20,.94);border:1px solid rgba(233,198,108,.4);box-shadow:0 14px 34px rgba(0,0,0,.45);backdrop-filter:blur(8px);max-width:min(760px,calc(100vw - 150px));overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}
.edmini::-webkit-scrollbar{display:none;height:0}
.edmini[hidden]{display:none}
.edmini a{display:grid;justify-items:center;gap:2px;text-decoration:none;flex:0 0 auto}
.edmini img{display:block;width:34px;height:34px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(233,198,108,.45)}
.edmini span{font:700 7.5px/1 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.62)}
.edmini a:hover img,.edmini a:focus-visible img{border-color:var(--accent);transform:translateY(-1px)}
.edmini a:hover span{color:var(--accent)}
.edmini a[aria-current] img{border-color:var(--accent);box-shadow:0 0 0 2px rgba(233,198,108,.25)}
.edmini a[aria-current] span{color:var(--accent)}
.edmini-home{font:800 9px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#0c1015;background:var(--accent);border-radius:999px;padding:9px 10px;text-decoration:none}
.edmini-home:hover{background:#fff;text-decoration:none}
@media(max-width:760px){.edmini{max-width:calc(100vw - 20px);bottom:8px}.edmini span{display:none}}
@media(prefers-reduced-motion:reduce){.edmini img,.edmini span{transition:none}}
@media print{.edmini{display:none}}
.hublink{position:fixed;left:18px;bottom:18px;z-index:80;display:inline-flex;align-items:center;gap:7px;background:#0c1015;color:#e9c66c;border:1px solid rgba(233,198,108,.55);border-radius:999px;padding:11px 16px;font:800 11px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;box-shadow:0 12px 28px rgba(0,0,0,.35);transition:background .18s ease,color .18s ease,transform .18s ease}
.hublink:hover,.hublink:focus-visible{background:#e9c66c;color:#0c1015;text-decoration:none;transform:translateY(-2px)}
@media(max-width:600px){.hublink{left:10px;bottom:10px;padding:9px 12px;font-size:10px}}
@media print{.hublink{display:none}}
.topbar{display:flex;justify-content:space-between;align-items:center;gap:12px;font:600 11px/1.4 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;padding:10px clamp(16px,4vw,48px);border-bottom:1px solid rgba(255,255,255,.14);color:var(--accent)}
.topbar .topback{color:var(--accent);text-decoration:none;border:1px solid rgba(233,198,108,.55);border-radius:999px;padding:6px 11px;letter-spacing:.1em;transition:background .18s ease,color .18s ease}
.topbar .topback:hover{background:var(--accent);color:#0c1015;border-color:var(--accent)}
.masthead{display:flex;flex-wrap:wrap;justify-content:space-between;gap:24px;align-items:flex-end;padding:clamp(20px,4vw,40px) clamp(16px,4vw,48px)}
.kicker{display:block;font:600 12px/1.4 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--accent2)}
.logo{display:block;font:700 clamp(30px,5vw,54px)/1.02 Georgia,serif;letter-spacing:-.01em;margin:6px 0 8px;color:var(--ink)}
.strap{margin:0;max-width:46ch;color:rgba(255,255,255,.76);font-size:15px}
.mastmeta{display:grid;gap:4px;font:500 12px/1.6 system-ui,sans-serif;color:rgba(255,255,255,.7);text-align:right}
.langswitch{font-weight:800;letter-spacing:.08em;border:1px solid currentColor;border-radius:999px;padding:5px 10px;text-decoration:none!important}
.hastag-line{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:10px 0 0;padding:10px 0 0;border-top:1px dashed rgba(0,0,0,.16);font:700 11px/1.4 system-ui,-apple-system,sans-serif;letter-spacing:.02em;list-style:none}
.hastag-line a,.hastag-line span,.hastag-line li{text-decoration:none;color:var(--accent2,#8c2f2f)}
.hastag-line a{display:inline-block;background:rgba(140,47,47,.08);border:1px solid rgba(140,47,47,.22);border-radius:999px;padding:4px 9px}
.hastag-line a:hover{background:rgba(140,47,47,.16)}
.hastag-line .hastag-k{font:800 9px/1 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#7a6a4b;border:0;background:none;padding:0}
@media(max-width:600px){.hastag-line{font-size:10px;gap:5px 7px}}
.eds{display:flex;align-items:center;gap:12px;padding:9px clamp(12px,3vw,40px);border-top:1px solid rgba(255,255,255,.12);border-bottom:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.22)}
.eds-home{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;background:var(--accent);color:#0c1015;border-radius:999px;padding:8px 12px;font:800 10px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;white-space:nowrap}
.eds-home:hover{background:#fff;color:#0c1015;text-decoration:none}
.eds-row{display:flex;gap:8px;list-style:none;margin:0;padding:0 2px 2px;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;flex:1 1 auto}
.eds-row::-webkit-scrollbar{display:none;height:0}
.eds-i{flex:0 0 auto}
.eds-i a{display:grid;justify-items:center;gap:4px;text-decoration:none;color:rgba(255,255,255,.72)}
.eds-i a:hover{color:var(--accent);text-decoration:none}
.eds-img{display:block;width:46px;height:46px;border-radius:50%;overflow:hidden;border:2px solid rgba(233,198,108,.35);transition:transform .18s ease,border-color .18s ease}
.eds-img img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 40%}
.eds-i a:hover .eds-img{transform:translateY(-2px);border-color:var(--accent)}
.eds-city{font:700 8.5px/1 system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;white-space:nowrap}
.eds-i.is-current .eds-img{border-color:var(--accent);box-shadow:0 0 0 3px rgba(233,198,108,.18)}
.eds-i.is-current a{color:#fff}
.eds-i.is-current .eds-city{color:var(--accent)}
.eds-i.is-current .eds-city::after{content:" ·"}
@media(max-width:600px){.eds{padding:8px 10px;gap:8px}.eds-home{padding:7px 9px;font-size:9px}.eds-img{width:40px;height:40px}}
@media print{.eds{display:none}}
.mainnav{display:flex;flex-wrap:wrap;gap:4px 18px;padding:12px clamp(16px,4vw,48px);border-top:1px solid rgba(255,255,255,.14);font:600 12px/1.6 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}
.mainnav a{color:var(--ink);opacity:.85}
.mainnav a[aria-current]{opacity:1;color:var(--accent)}
main{max-width:1180px;margin:0 auto;padding:clamp(20px,4vw,44px) clamp(16px,4vw,48px) 56px}
.intro--hero{position:relative;overflow:hidden;border-radius:0 0 6px 6px;padding:clamp(26px,5vw,54px) clamp(16px,4vw,44px);margin:0 calc(-1 * clamp(16px,4vw,48px)) 0;color:#fff;display:grid;grid-template-columns:minmax(0,1.8fr) minmax(240px,.8fr);gap:28px;border-bottom:none;align-items:end}
.heroimg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
.intro--hero::after{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,rgba(6,12,20,.93) 0%,rgba(6,12,20,.74) 34%,rgba(6,12,20,.22) 66%,rgba(6,12,20,0) 100%),linear-gradient(0deg,rgba(6,12,20,.88) 0%,rgba(6,12,20,.30) 38%,rgba(6,12,20,0) 66%)}
.intro--hero>*:not(.heroimg){position:relative;z-index:2}
.intro--hero h1{color:#fff;text-shadow:0 2px 18px rgba(0,0,0,.45)}
.intro--hero .intro-text{color:rgba(255,255,255,.9)}
.intro--hero .dateline{color:#e9c66c}
.intro--hero .intro-side{background:rgba(8,13,20,.72);border-color:rgba(233,198,108,.28);backdrop-filter:blur(6px)}
.intro--hero .intro-side h2{color:#e9c66c}
.intro--hero .radio{color:#fff;border-top-color:rgba(255,255,255,.14)}
.intro--hero .radio small{color:rgba(255,255,255,.62)}
.hero-tags{margin:10px 0 0;font:700 12px/1.7 system-ui,-apple-system,sans-serif;color:rgba(255,255,255,.86);max-width:74ch}
.hero-tags a{color:#f0d68b;text-decoration:none;border-bottom:1px solid rgba(240,214,139,.4)}
.hero-tags a:hover{border-color:#f0d68b}
.live{display:flex;flex-wrap:wrap;gap:10px;align-items:baseline;margin:0 0 12px;font:600 13px/1.4 system-ui,sans-serif;color:rgba(255,255,255,.82)}
.live b{color:#e9c66c;font-size:17px}
.live-sep{color:rgba(255,255,255,.35)}
@media(max-width:820px){.intro--hero{grid-template-columns:1fr;padding:26px 18px}}
.intro{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(240px,.8fr);gap:28px;padding-bottom:28px;border-bottom:2px solid #dcd7cc}
.dateline{font:600 11px/1.5 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#7a6a4b;margin:0 0 10px}
.intro h1{font:700 clamp(34px,5vw,58px)/1.02 Georgia,serif;margin:0 0 14px;letter-spacing:-.015em}
.intro-text{font-size:18px;line-height:1.6;margin:0 0 14px;max-width:60ch}
.intro-tags,.tags{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}
.tag{font:600 11px/1 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;background:var(--bg);color:var(--accent);padding:6px 9px;border-radius:3px}
.intro-side{background:#fff;border:1px solid #e2ddd2;padding:18px}
.intro-side h2{font:600 12px/1.4 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;margin:0 0 12px;color:#6c7480}
.radio{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;align-items:center;padding:9px 0;border-top:1px solid #eee9df;font:600 14px/1.4 system-ui,sans-serif}
.radio small{grid-column:2;font:400 11px/1.4 system-ui,sans-serif;color:#7d8590}
.radio-dot{width:9px;height:9px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 3px rgba(0,0,0,.06);grid-row:span 2}
.leadgrid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:26px;padding:32px 0;border-bottom:1px solid #dcd7cc}
.leadside{display:grid;gap:16px}
.card{border-top:3px solid var(--bg);padding-top:12px;display:grid;gap:6px;align-content:start}
.card--lead{border-top-width:6px}
.card--lead .cardtitle{font:700 clamp(26px,3.2vw,40px)/1.1 Georgia,serif;letter-spacing:-.01em}
.cardmeta{display:flex;flex-wrap:wrap;gap:6px;font:600 11px/1.4 system-ui,sans-serif;color:#7a6a4b;letter-spacing:.04em;text-transform:uppercase}
.cardmeta .src{color:#8c2f2f}
.cardtitle{font:700 20px/1.25 Georgia,serif;margin:0}
.cardsum{margin:0;color:#3d4753;font-size:15px}
.card--lead .cardsum{font-size:17px}
.more{font:600 12px/1.5 system-ui,sans-serif;color:#7a3b2b;letter-spacing:.04em}
.band{padding:34px 0 8px;border-bottom:1px solid #dcd7cc}
.bandhead{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:18px}
.bandhead h2{font:700 15px/1.3 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;margin:0;color:#20262e}
.count{font:600 12px/1 system-ui,sans-serif;background:var(--bg);color:var(--accent);padding:6px 9px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:26px 28px}
.list{list-style:none;margin:0;padding:0}
.list li{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:12px;align-items:baseline;padding:9px 0;border-top:1px solid #e6e1d7}
.list time{font:600 11px/1.4 system-ui,sans-serif;color:#8a7c62}
.list .src{font:600 11px/1.4 system-ui,sans-serif;color:#8c2f2f;white-space:nowrap}
.list.big li{grid-template-columns:72px minmax(0,1fr) auto;font-size:17px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0}
.chip{font:600 12px/1 system-ui,sans-serif;background:#fff;border:1px solid #ddd7ca;padding:8px 11px;color:#3b4250}
.about{display:grid;grid-template-columns:1fr 1fr;gap:36px}
.about h2{font:700 15px/1.3 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;margin:0 0 10px}
.small{font:400 12px/1.6 system-ui,sans-serif;color:#6f7783}
.mrv-wall-btn{display:inline-flex;align-items:center;gap:7px;cursor:pointer;font:800 10px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#e9c66c;border:1px solid rgba(233,198,108,.45);border-radius:999px;padding:8px 12px;margin-left:auto}
.mrv-wall-btn input{position:absolute;opacity:0;width:1px;height:1px}
.mrv-wall-btn:hover{background:rgba(233,198,108,.12)}
.mrv-wall-btn input:checked+span::before{content:"✓ "}
.mrv-wall-btn input:focus-visible+span{outline:2px solid #e9c66c;outline-offset:3px}
body.mrv-wall .mrv-cols{columns:8;column-gap:14px}
body.mrv-wall .mrv-i{font-size:12px;line-height:1.26;padding:5px 0 6px}
body.mrv-wall .mrv-i b em{display:none}
body.mrv-wall .mrv--page{max-width:none}
body.mrv-wall main.page{max-width:none}
@media(max-width:1400px){body.mrv-wall .mrv-cols{columns:6}}
@media(max-width:1000px){body.mrv-wall .mrv-cols{columns:4}}
@media(max-width:700px){body.mrv-wall .mrv-cols{columns:2}}
@media(max-width:460px){body.mrv-wall .mrv-cols{columns:1}}
.mrv{background:#0c1015;color:#eae4d6;border-radius:3px;padding:26px clamp(16px,3vw,32px) 20px;margin:0 0 8px}
.mrv--page{margin-top:26px}
.mrv-head{display:flex;align-items:baseline;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:8px}
.mrv-head h2{font:700 13px/1.3 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;margin:0;color:#e9c66c}
.mrv-head h2 span{color:rgba(234,228,214,.55);letter-spacing:.12em}
.mrv-count{font:600 11px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(234,228,214,.45)}
.mrv-lead{margin:0 0 18px;max-width:82ch;font:400 14px/1.55 system-ui,sans-serif;color:rgba(234,228,214,.74)}
.mrv-cols{columns:4;column-gap:24px}
.mrv-i{display:block;break-inside:avoid;padding:7px 0 8px;border-top:1px solid rgba(255,255,255,.1);font:400 14px/1.3 Georgia,serif;color:#f3eee1}
.mrv-i:hover{text-decoration:none;color:#e9c66c}
.mrv-i b{display:block;font:600 9.5px/1.5 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:rgba(233,198,108,.9);margin-bottom:3px}
.mrv-i b em{font-style:normal;color:rgba(234,228,214,.42)}
.mrv-foot{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:18px;padding-top:13px;border-top:1px solid rgba(255,255,255,.16);font:700 11px/1.4 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}
.mrv-foot a{color:#e9c66c}
.mrv-foot a:hover{color:#fff;text-decoration:none}
@media(max-width:1000px){.mrv-cols{columns:3}}
@media(max-width:760px){.mrv-cols{columns:2}}
@media(max-width:460px){.mrv-cols{columns:1}}
.foot{background:var(--bg);color:rgba(255,255,255,.82);padding:40px clamp(16px,4vw,48px) 28px;margin-top:20px}
.footgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:26px;max-width:1180px;margin:0 auto}
.foot h2{font:600 11px/1.4 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);margin:0 0 10px}
.footlinks{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:14px}
.foot .tag{background:rgba(255,255,255,.08);color:var(--accent2)}
.disclaimer{max-width:1180px;margin:26px auto 0;padding-top:16px;border-top:1px solid rgba(255,255,255,.16);font:400 11px/1.6 system-ui,sans-serif;color:rgba(255,255,255,.55)}
.article{max-width:880px}
.artimg{margin:4px 0 26px;background:#0c1015;border-radius:4px;overflow:hidden}
.artimg img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;background:#0c1015}
.artimg figcaption{padding:8px 12px;font:600 10.5px/1.5 system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#8a7c62;background:#fbf7ec}
.crumbs{font:600 11px/1.6 system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#8a7c62;padding:0 0 18px}
.crumbs a{color:#5b6472}
.arthead h1{font:700 clamp(28px,4.2vw,46px)/1.1 Georgia,serif;margin:6px 0 12px;letter-spacing:-.012em}
.artmeta{font:500 13px/1.6 system-ui,sans-serif;color:#68707c;margin:0 0 24px}
.artmeta a{color:#8c2f2f;text-decoration:underline}
.quote{background:#fff;border-left:5px solid var(--accent);padding:20px 22px;margin:26px 0}
.quote h2{font:600 11px/1.4 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;margin:0 0 10px;color:#7a6a4b}
.quote blockquote{margin:0;font-size:19px;line-height:1.55;color:#232a33}
.cta{display:inline-block;margin-top:8px;font:600 13px/1 system-ui,sans-serif;background:var(--bg);color:var(--accent);padding:12px 16px}
.osvrt{margin:24px 0;font-size:17px;line-height:1.7;color:#252c35}.osvrt p{margin:0 0 12px}
.botnote{margin:22px 0;padding:14px 16px;border-left:4px solid #d9b45a;background:#fbf7ec;border-radius:0 6px 6px 0}
.botnote-k{margin:0 0 6px;font:800 9.5px/1.1 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#8a6a1f}
.botnote p{margin:0;font:400 15px/1.62 Georgia,serif;color:#2a3038}
.checks{margin:26px 0}
.checks h2,.related h2{font:700 14px/1.4 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;margin:0 0 10px}
.checks ol{margin:0;padding-left:20px}
.checks li{margin-bottom:8px}
.scorebox{display:flex;flex-wrap:wrap;align-items:center;gap:12px;background:var(--bg);color:var(--ink);padding:14px 18px;margin:0 0 8px}
.scorelabel{font:600 10px/1 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}
.score{font:700 30px/1 system-ui,sans-serif;color:var(--accent2)}
.scorebox .small{color:rgba(255,255,255,.65)}
.related{margin-top:32px;padding-top:20px;border-top:2px solid #dcd7cc}
.backlink{margin-top:30px;font:600 13px/1.5 system-ui,sans-serif}
.page{max-width:900px}
.page h1{font:700 clamp(28px,4vw,44px)/1.08 Georgia,serif;margin:0 0 12px}
.lead{font-size:18px;color:#3d4753;margin:0 0 22px}
.rules li{margin-bottom:10px}
.empty{background:#fff;border:1px solid #e2ddd2;padding:18px}
@media(max-width:820px){.intro,.leadgrid,.about{grid-template-columns:1fr}.mastmeta{text-align:left}.list li{grid-template-columns:56px minmax(0,1fr)}.list .src{display:none}}
@media(prefers-reduced-motion:no-preference){.cardtitle a{transition:color .15s}.cardtitle a:hover{color:#8c2f2f}}
`;

if (process.argv[1] && process.argv[1].endsWith('build.mjs')) {
  const only = process.argv.includes('--channel') ? process.argv[process.argv.indexOf('--channel') + 1] : '';
  const targets = CHANNELS.filter((c) => !only || c.id === only);
  const report = targets.map((channel) => buildChannel(channel));
  console.log(JSON.stringify({ ok: true, channels: report }, null, 2));
}
