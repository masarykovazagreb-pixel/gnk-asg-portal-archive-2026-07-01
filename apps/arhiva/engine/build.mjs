#!/usr/bin/env node
/**
 * AKTUAL ARHIVA — samostalan portal na vlastitoj domeni.
 *
 * Ulaz: apps/region/data/*.json (gradska izdanja koja imaju stvarnu arhivu).
 * Izlaz: apps/arhiva/site/ — statične stranice, sitemap, feed, robots,
 *        strojni indeks za pretragu i zajednička ljuska.
 *
 * Pokretanje: node apps/arhiva/engine/build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  page, esc, fmtDate, cityCard, storyRow, sitemap, robots, rss,
  breadcrumb, websiteNode, publisherNode, ARHIVA, DNEVNIK, MAIN, SITE_CSS
} from '../../satellites/lib/shell.mjs';
import { writeExchangeJson } from '../../satellites/lib/razmjena-v1.mjs';
import { designTokensCss } from '../../shared/design-system-v1.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SITE = join(ROOT, 'apps', 'arhiva', 'site');
const SITE_URL = ARHIVA;
const VERSION = 'AKTUAL_ARHIVA_V1_20261022';

const channels = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8')).channels;
const CITY_EN = {
  zagreb: 'Zagreb', beograd: 'Belgrade', sarajevo: 'Sarajevo', budimpesta: 'Budapest',
  ljubljana: 'Ljubljana', rim: 'Rome', sofija: 'Sofia', bukurest: 'Bucharest'
};
const COUNTRY_EN = {
  zagreb: 'Croatia', beograd: 'Serbia', sarajevo: 'Bosnia and Herzegovina', budimpesta: 'Hungary',
  ljubljana: 'Slovenia', rim: 'Italy', sofija: 'Bulgaria', bukurest: 'Romania'
};

const data = channels.map((c) => {
  const file = join(ROOT, 'apps', 'region', 'data', `${c.id}.json`);
  if (!existsSync(file)) return { c, items: [] };
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  return { c: { ...c, cityEn: c.cityEn || CITY_EN[c.id], countryEn: c.countryEn || COUNTRY_EN[c.id] }, items: parsed.items || [] };
});
/* Arhiva raste s mrežom: gradovi s najmanje jednim zapisom su „živi" i samo
   oni ulaze u naslove i brojke. Ostali su na karti mreže, s praznom arhivom
   koja se puni, i to se tako i piše — bez zaokruživanja na starih osam. */
const live = data.filter((d) => d.items.length > 0);
const citiesLabel = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'grad' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'grada' : 'gradova');
const liveNames = (lang) => live.map(({ c }) => (lang === 'hr' ? c.city : c.cityEn)).join(', ');

const all = data.flatMap(({ c, items }) => items.map((it) => ({ ...it, city: c })));
all.sort((a, b) => new Date(b.date) - new Date(a.date));

const sources = new Set(all.map((it) => it.sourceName || it.source).filter(Boolean));
const langs = new Set(all.map((it) => it.city.lang));

const write = (rel, content) => {
  const file = join(SITE, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
};

rmSync(SITE, { recursive: true, force: true });
mkdirSync(SITE, { recursive: true });
cpSync(join(ROOT, 'apps', 'satellites', 'assets'), join(SITE, 'assets', 'brand'), { recursive: true });

/* ---------- zajednički dijelovi ---------- */
const nav = (lang) => {
  const hr = lang === 'hr';
  return [
    `<a href="${hr ? '/' : '/en/'}">${hr ? 'Početna' : 'Home'}</a>`,
    `<a href="${hr ? '/#gradovi' : '/en/#cities'}">${hr ? 'Gradovi' : 'Cities'}</a>`,
    `<a href="${hr ? '/o-arhivi/' : '/en/about/'}">${hr ? 'O arhivi' : 'About'}</a>`,
    `<a href="${DNEVNIK}/">${hr ? 'DNEVNIK ↗' : 'DAILY ↗'}</a>`,
    `<a href="${MAIN}/gnk-aktual/">AKTUAL MEDIA ↗</a>`,
    `<a href="${hr ? '/en/' : '/'}" hreflang="${hr ? 'en' : 'hr'}">${hr ? 'EN' : 'HR'}</a>`
  ].join('');
};

const ogImage = () => `${SITE_URL}/assets/brand/aktual-arhiva-og.jpg`;
const OG_ALT = 'AKTUAL ARHIVA — linija s tri čvora: GNK ASG, ARHIVA, DNEVNIK';

const stats = [
  [String(all.length), 'tekstova u arhivi'],
  [`${live.length}`, `gradova s arhivom (od ${channels.length} u mreži)`],
  [String(langs.size), 'jezika'],
  [String(sources.size), 'medijskih izvora']
];
const statsEn = [
  [String(all.length), 'stories in the archive'],
  [`${live.length}`, `cities with an archive (of ${channels.length} in the network)`],
  [String(langs.size), 'languages'],
  [String(sources.size), 'media sources']
];

const statsList = (lang) => (lang === 'hr' ? stats : statsEn)
  .map(([n, l]) => `<li><b>${esc(n)}</b><span>${esc(l)}</span></li>`).join('');

const itemList = (items, lang, city = null, showImage = true) =>
  `<ul class="list">${items.map((it) => storyRow(it, lang, { city: city || it.city, showImage })).join('')}</ul>`;

/* ---------- naslovnica ---------- */
function home(lang) {
  const hr = lang === 'hr';
  const path = hr ? '/' : '/en/';
  const n = hr ? all.length.toLocaleString('hr-HR') : all.length.toLocaleString('en-US');
  const title = hr
    ? `AKTUAL ARHIVA — ${n} tekstova, ${live.length} ${citiesLabel(live.length)}`
    : `AKTUAL ARCHIVE — ${n} stories, ${live.length} cities`;
  const desc = hr
    ? `Pretraživa arhiva ${n} tekstova iz ${live.length} ${citiesLabel(live.length)} AKTUAL MEDIA. Svaki zapis vodi na izvornik; mreža ima ${channels.length} kanala i raste.`
    : `Archive of ${n} stories from ${live.length} AKTUAL MEDIA city editions. Every record links to the publisher; the network has ${channels.length} channels and keeps growing.`;

  const body = `<header class="hero">
  <p class="kicker">${hr ? 'AKTUAL MEDIA · arhiva' : 'AKTUAL MEDIA · archive'}</p>
  <h1>${hr ? `Arhiva ${live.length} ${citiesLabel(live.length)}, jedan indeks` : `${live.length} cities, one index`}</h1>
  <p class="lead">${hr
    ? `Ovo nije još jedan pregled vijesti. Ovo je arhiva: svaki tekst koji su gradski kanali zabilježili, s medijem, vremenom i izvornikom. Sada je u njoj ${live.length} od ${channels.length} izdanja mreže; ostala se pune svojim ciklusima. Pretražujete naslove i izvore, a čitate kod izdavača.`
    : `This is not another news digest. This is an archive: every story the city channels recorded, with the publisher, the time and the original. It currently holds ${live.length} of the ${channels.length} editions in the network; the rest fill up through their own cycles. Search headlines and sources, read at the publisher.`}</p>
  <ul class="stats">${statsList(lang)}</ul>
  <div class="search" role="search">
    <label class="skip" for="q">${hr ? 'Pretraži arhivu' : 'Search the archive'}</label>
    <input id="q" name="q" type="search" autocomplete="off" placeholder="${hr ? 'Pretraži naslove, medije, gradove…' : 'Search headlines, publishers, cities…'}">
    <a class="btn" href="${hr ? '/#najnovije' : '/en/#latest'}">${hr ? 'Najnovije ↓' : 'Latest ↓'}</a>
  </div>
  <p class="sub" id="searchStatus" aria-live="polite">${hr ? 'Pretraga se učitava tek kad počnete tipkati.' : 'Search loads only when you start typing.'}</p>
  <div id="results"></div>
</header>

<section id="gradovi">
  <h2>${hr ? `${channels.length} gradova u mreži` : `${channels.length} cities in the network`}</h2>
  <p class="sub">${hr ? 'Svaki grad ima svoje izdanje, svoj jezik i svoj izvor. Klik otvara arhivu tog grada; kartica bez zapisa znači da arhiva tog izdanja još nije počela.' : 'Every city has its own edition, its own language and its own sources. A click opens that city archive; a card without records means that edition’s archive has not started yet.'}</p>
  <ul class="grid">${data.map(({ c, items }) => cityCard(c, items.length ? `${items.length} ${hr ? 'tekstova' : 'stories'}` : (hr ? 'arhiva se puni' : 'archive filling'), lang)).join('')}</ul>
</section>

<section id="najnovije">
  <h2>${hr ? 'Najnovije u arhivi' : 'Latest in the archive'}</h2>
  <p class="sub">${hr ? 'Posljednjih 40 zapisa, poredano po vremenu objave. Naslov vodi na izvornik, „na portalu" na našu stranicu.' : 'The last 40 records, ordered by publication time. The headline opens the original; “on the portal” opens our page.'}</p>
  ${itemList(all.slice(0, 40), lang)}
  <div class="row">
    <a class="btn solid" href="${hr ? '/#gradovi' : '/en/#cities'}">${hr ? 'Odaberi grad →' : 'Pick a city →'}</a>
    <a class="btn" href="${DNEVNIK}${hr ? '/' : '/en/'}">${hr ? `DNEVNIK: jedan dan, ${live.length} ${citiesLabel(live.length)} →` : `DAILY: one day, ${live.length} cities →`}</a>
  </div>
</section>

<p class="note">${hr
    ? 'Sve je automatski sastavljeno iz javnih feedova, sitemapa i API-ja izvornih medija. Tekstovi se ne prenose u cijelosti; svaki zapis vodi na izvornik. Brojke se računaju iz arhive pri svakoj gradnji.'
    : 'Everything is assembled automatically from public feeds, sitemaps and APIs of the original media. Texts are never reproduced in full; every record links to the original. Figures are computed from the archive at every build.'}</p>`;

  write(path === '/' ? 'index.html' : 'en/index.html', page({
    lang, siteName: hr ? 'AKTUAL ARHIVA' : 'AKTUAL ARCHIVE', siteUrl: SITE_URL, path,
    title, desc, body, navHtml: nav(lang), ogImage: ogImage(), ogImageAlt: OG_ALT,
    altUrl: `${SITE_URL}${hr ? '/en/' : '/'}`,
    alternates: [['application/rss+xml', '/feed.xml']],
    jsonld: [
      websiteNode(SITE_URL, lang),
      publisherNode(),
      {
        '@type': 'CollectionPage', '@id': `${SITE_URL}${path}#webpage`, url: `${SITE_URL}${path}`,
        name: title, description: desc, inLanguage: lang,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': `${MAIN}/gnk-aktual/#news-organization` },
        mainEntity: {
          '@type': 'ItemList', numberOfItems: channels.length,
          itemListElement: data.map(({ c, items }, i) => ({
            '@type': 'ListItem', position: i + 1,
            name: hr ? c.title : c.title.replace('KANAL', 'CHANNEL'),
            url: `${SITE_URL}${hr ? `/grad/${c.id}/` : `/en/city/${c.id}/`}`,
            description: `${items.length} ${hr ? 'tekstova' : 'stories'}`
          }))
        }
      },
      breadcrumb(SITE_URL, lang, path, hr ? 'Arhiva' : 'Archive', hr ? 'AKTUAL ARHIVA' : 'AKTUAL ARCHIVE')
    ]
  }));
}

/* ---------- grad ---------- */
function cityPage(entry, lang) {
  const hr = lang === 'hr';
  const { c, items } = entry;
  const path = hr ? `/grad/${c.id}/` : `/en/city/${c.id}/`;
  const cityName = hr ? c.city : c.cityEn;
  const country = hr ? c.country : c.countryEn;
  // Naslov izdanja je vlastito ime; na engleskom "KANAL" postaje "CHANNEL",
  // da EN stranica ne nosi hrvatsku riječ u naslovu i opisu.
  const editionTitle = hr ? c.title : c.title.replace('KANAL', 'CHANNEL');
  const title = hr
    ? `${cityName} — arhiva ${items.length} tekstova | AKTUAL ARHIVA`
    : `${cityName} — archive of ${items.length} stories | AKTUAL ARCHIVE`;
  const desc = hr
    ? `Svi tekstovi izdanja ${c.title} (${country}, ${c.lang}) u arhivi: ${items.length} zapisa s medijem, vremenom i poveznicom na izvornik.`
    : `All ${items.length} stories of the ${editionTitle} edition (${country}, ${c.lang}) in one archive, each with publisher, time and a link to the original.`;

  const neighbours = data.filter((x) => x.c.id !== c.id).slice(0, 7);
  const body = `<header class="hero">
  <p class="kicker">${esc(editionTitle)} · ${esc(c.lang)} · ${esc(country)}</p>
  <h1>${esc(cityName)}</h1>
  <p class="lead">${hr
    ? `Arhiva izdanja za ${cityName}: ${items.length} tekstova iz ${new Set(items.map((i) => i.sourceName)).size} medija. Poredano od najnovijeg.`
    : `The archive of the ${cityName} edition: ${items.length} stories from ${new Set(items.map((i) => i.sourceName)).size} publishers. Newest first.`}</p>
  <div class="row">
    <a class="btn solid" href="${hr ? '/' : '/en/'}">${hr ? '← Sve arhive' : '← All archives'}</a>
    <a class="btn" href="${c.base}">${hr ? 'Izdanje na portalu →' : 'Edition on the portal →'}</a>
    <a class="btn" href="${DNEVNIK}${hr ? '/' : '/en/'}">${hr ? 'DNEVNIK ↗' : 'DAILY ↗'}</a>
  </div>
</header>
<section>
  <h2>${hr ? 'Svi zapisi' : 'All records'}</h2>
  <p class="sub">${hr ? 'Naslov vodi na izvornik. „na portalu" vodi na našu stranicu s kontekstom i izvorom.' : 'The headline opens the original. “on the portal” opens our page with context and source.'}</p>
  ${itemList(items, lang, c, true)}
</section>
<section>
  <h2>${hr ? 'Ostali gradovi' : 'Other cities'}</h2>
  <ul class="grid">${neighbours.map(({ c: n, items: ni }) => cityCard(n, `${ni.length} ${hr ? 'tekstova' : 'stories'}`, lang)).join('')}</ul>
</section>`;

  write(hr ? `grad/${c.id}/index.html` : `en/city/${c.id}/index.html`, page({
    lang, siteName: hr ? 'AKTUAL ARHIVA' : 'AKTUAL ARCHIVE', siteUrl: SITE_URL, path,
    title, desc, body, navHtml: nav(lang), ogImage: ogImage(), ogImageAlt: OG_ALT,
    altUrl: `${SITE_URL}${hr ? `/en/city/${c.id}/` : `/grad/${c.id}/`}`,
    jsonld: [
      websiteNode(SITE_URL, lang),
      publisherNode(),
      {
        '@type': 'CollectionPage', '@id': `${SITE_URL}${path}#webpage`, url: `${SITE_URL}${path}`,
        name: title, description: desc, inLanguage: lang,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': `${MAIN}/gnk-aktual/#news-organization` },
        about: { '@type': 'Place', name: cityName, address: { '@type': 'PostalAddress', addressCountry: c.countryCode } },
        mainEntity: {
          '@type': 'ItemList', numberOfItems: Math.min(20, items.length),
          itemListElement: items.slice(0, 20).map((it, i) => ({
            '@type': 'ListItem', position: i + 1, name: it.title, url: it.url
          }))
        }
      },
      breadcrumb(SITE_URL, lang, path, cityName, hr ? 'AKTUAL ARHIVA' : 'AKTUAL ARCHIVE')
    ]
  }));
}

/* ---------- o arhivi ---------- */
function about(lang) {
  const hr = lang === 'hr';
  const path = hr ? '/o-arhivi/' : '/en/about/';
  const title = hr ? 'O arhivi — kako nastaje i što jamči | AKTUAL ARHIVA' : 'About the archive — how it is built | AKTUAL ARCHIVE';
  const desc = hr
    ? `Metodologija AKTUAL ARHIVA: javni feedovi, sitemapi i API-ji ${channels.length} izdanja, atribucija izvornika, automatsko sastavljanje i jasne granice.`
    : `AKTUAL ARCHIVE methodology: public feeds, sitemaps and APIs of ${channels.length} editions, source attribution, automatic assembly and clear limits.`;

  const body = `<header class="hero">
  <p class="kicker">${hr ? 'Metodologija' : 'Methodology'}</p>
  <h1>${hr ? 'Kako nastaje arhiva' : 'How the archive is built'}</h1>
  <p class="lead">${hr
    ? 'Arhiva ne piše vijesti. Ona bilježi što su drugi objavili, povezuje na izvornik i čuva vrijeme i medij svakog zapisa.'
    : 'The archive does not write the news. It records what others published, links to the original and keeps the time and publisher of every record.'}</p>
  <div class="row"><a class="btn solid" href="${hr ? '/' : '/en/'}">${hr ? '← Arhiva' : '← Archive'}</a></div>
</header>
<section>
  <h2>${hr ? 'Četiri pravila' : 'Four rules'}</h2>
  <ul class="grid">
    <li class="card"><b>${hr ? 'Izvornik je uvijek povezan' : 'The original is always linked'}</b><span>${hr ? 'Naslov vodi na stranicu izdavača. Ne prenosimo cijeli tekst.' : 'The headline opens the publisher page. We do not reproduce the full text.'}</span></li>
    <li class="card"><b>${hr ? 'Atribucija uz svaki zapis' : 'Attribution on every record'}</b><span>${hr ? 'Medij, vrijeme i grad stoje uz naslov; bez izmišljenih autora.' : 'Publisher, time and city sit next to the headline; no invented authors.'}</span></li>
    <li class="card"><b>${hr ? 'Automatski, i tako označeno' : 'Automatic, and labelled as such'}</b><span>${hr ? 'Zapisi se sastavljaju strojno; urednički pregled nije tvrdnja ovog portala.' : 'Records are assembled by machine; editorial review is not claimed by this portal.'}</span></li>
    <li class="card"><b>${hr ? 'Brojke iz arhive' : 'Figures from the archive'}</b><span>${hr ? 'Svi zbrojevi računaju se pri svakoj gradnji iz istih podataka.' : 'Every total is computed at build time from the same data.'}</span></li>
  </ul>
</section>
<section>
  <h2>${hr ? 'Ograničenja' : 'Limits'}</h2>
  <p class="sub">${hr
    ? 'Arhiva pokriva ono što su izdanja zabilježila, ne sve što je objavljeno u svijetu. Ako izvor promijeni ili ukloni tekst, poveznica može prestati raditi; naš zapis ostaje kao trag naslova i vremena.'
    : 'The archive covers what the editions recorded, not everything published in the world. If a source changes or removes a text, the link may stop working; our record remains as a trace of headline and time.'}</p>
  <p class="sub">${hr
    ? `Trenutno: ${all.length} zapisa, ${channels.length} gradova, ${sources.size} medija, ${langs.size} jezika.`
    : `Currently: ${all.length} records, ${channels.length} cities, ${sources.size} publishers, ${langs.size} languages.`}</p>
</section>
<section>
  <h2>${hr ? 'Dalje' : 'Next'}</h2>
  <ul class="grid">
    <li><a class="card" href="${DNEVNIK}${hr ? '/' : '/en/'}"><b>${hr ? 'AKTUAL DNEVNIK' : 'AKTUAL DAILY'}</b><span>${hr ? `Jedan dan, ${live.length} ${citiesLabel(live.length)} — što je objavljeno i kada.` : `One day, ${live.length} cities — what was published and when.`}</span></a></li>
    <li><a class="card" href="${MAIN}/gnk-aktual/"><b>AKTUAL MEDIA</b><span>${hr ? `Središnje izdanje i ${channels.length} gradskih kanala.` : `The central edition and ${channels.length} city channels.`}</span></a></li>
    <li><a class="card" href="${MAIN}/aktual-media/"><b>${hr ? 'Podatkovni desk' : 'Data desk'}</b><span>${hr ? 'Četiri mjerenja vlastite arhive.' : 'Four measurements of our own archive.'}</span></a></li>
  </ul>
</section>`;

  write(hr ? 'o-arhivi/index.html' : 'en/about/index.html', page({
    lang, siteName: hr ? 'AKTUAL ARHIVA' : 'AKTUAL ARCHIVE', siteUrl: SITE_URL, path,
    title, desc, body, navHtml: nav(lang), ogImage: ogImage(), ogImageAlt: OG_ALT,
    altUrl: `${SITE_URL}${hr ? '/en/about/' : '/o-arhivi/'}`,
    jsonld: [
      websiteNode(SITE_URL, lang), publisherNode(),
      {
        '@type': 'AboutPage', '@id': `${SITE_URL}${path}#webpage`, url: `${SITE_URL}${path}`,
        name: title, description: desc, inLanguage: lang,
        isPartOf: { '@id': `${SITE_URL}/#website` }
      },
      breadcrumb(SITE_URL, lang, path, hr ? 'O arhivi' : 'About', hr ? 'AKTUAL ARHIVA' : 'AKTUAL ARCHIVE')
    ]
  }));
}

/* ---------- 404 ---------- */
write('404.html', `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Stranica nije pronađena — AKTUAL ARHIVA</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/assets/site.css?v=20261022"></head>
<body><main class="wrap" style="padding:60px 0"><p class="kicker">404</p><h1>Nema te stranice</h1>
<p class="lead">Možda je izdanje promijenilo adresu. Arhiva je ovdje:</p>
<div class="row"><a class="btn solid" href="/">Arhiva</a><a class="btn" href="/#gradovi">Gradovi</a><a class="btn" href="${MAIN}/gnk-aktual/">AKTUAL MEDIA</a></div></main></body></html>`);

/* ---------- statika ---------- */
write('assets/site.css', SITE_CSS);
write('robots.txt', robots(SITE_URL));
/* Isti popis razmjene koji stranica prikazuje, u strojnom obliku. */
writeExchangeJson(SITE, { root: ROOT, selfHome: `${SITE_URL}/`, selfNames: ['AKTUAL ARHIVA'] });
write('feed.xml', rss({ siteUrl: SITE_URL, siteName: 'AKTUAL ARHIVA', desc: `Arhiva gradskih izdanja AKTUAL MEDIA (${live.length} od ${channels.length} izdanja)`, items: all.slice(0, 40), lang: 'hr' }));

write('data/arhiva.json', JSON.stringify({
  version: VERSION,
  generated: new Date().toISOString(),
  count: all.length,
  cities: data.map(({ c, items }) => ({ id: c.id, name: c.city, nameEn: c.cityEn, lang: c.lang, count: items.length })),
  items: all.map((it) => ({ t: it.title, u: it.url, d: it.date, c: it.city.id, s: it.sourceName || it.source }))
}));

write('data/stats.json', JSON.stringify({
  version: VERSION,
  generated: new Date().toISOString(),
  stories: all.length,
  cities: channels.length,
  languages: langs.size,
  sources: sources.size,
  perCity: Object.fromEntries(data.map(({ c, items }) => [c.id, items.length])),
  latest: all[0] ? all[0].date : null
}, null, 2));

write('assets/arhiva.js', `/* Pretraga arhive: podaci se učitavaju tek na prvi unos. */
(function () {
  var input = document.getElementById('q');
  var out = document.getElementById('results');
  var status = document.getElementById('searchStatus');
  if (!input || !out) return;
  var data = null, loading = false;
  var cities = {};

  function load() {
    if (data || loading) return Promise.resolve(data);
    loading = true;
    if (status) status.textContent = 'Učitavam indeks…';
    return fetch('/data/arhiva.json', { credentials: 'omit' })
      .then(function (r) { return r.json(); })
      .then(function (json) {
        data = json;
        (json.cities || []).forEach(function (c) { cities[c.id] = c.name; });
        if (status) status.textContent = 'Indeks: ' + json.count + ' zapisa.';
        return data;
      })
      .catch(function () { if (status) status.textContent = 'Indeks nije dostupan.'; });
  }

  function row(it) {
    var li = document.createElement('li');
    li.className = 'item noimg';
    var d = document.createElement('div');
    var h = document.createElement('h3');
    var a = document.createElement('a');
    a.href = it.u; a.target = '_blank'; a.rel = 'external noopener noreferrer nofollow';
    a.textContent = it.t;
    h.appendChild(a);
    var meta = document.createElement('div');
    meta.className = 'meta';
    var c = document.createElement('span'); c.textContent = cities[it.c] || it.c;
    var s = document.createElement('span'); s.textContent = it.s;
    var t = document.createElement('time'); t.dateTime = it.d; t.textContent = it.d.slice(0, 16).replace('T', ' ');
    var p = document.createElement('a'); p.href = '/grad/' + it.c + '/'; p.textContent = 'arhiva grada';
    meta.append(c, s, t, p);
    d.append(h, meta);
    li.appendChild(d);
    return li;
  }

  function render(q) {
    var needle = q.trim().toLowerCase();
    out.textContent = '';
    if (needle.length < 2) return;
    var hits = (data.items || []).filter(function (it) {
      return it.t.toLowerCase().indexOf(needle) > -1 || (it.s || '').toLowerCase().indexOf(needle) > -1;
    }).slice(0, 50);
    if (status) status.textContent = hits.length + ' rezultata (prikazano do 50).';
    var ul = document.createElement('ul');
    ul.className = 'list';
    hits.forEach(function (it) { ul.appendChild(row(it)); });
    if (hits.length) out.appendChild(ul);
  }

  input.addEventListener('input', function () {
    load().then(function (d) { if (d) render(input.value); });
  });
  input.addEventListener('focus', load);
})();
`);

/* ---------- sitemap ---------- */
const day = new Date().toISOString().slice(0, 10);
const entries = [
  { loc: `${SITE_URL}/`, alternates: [['hr', `${SITE_URL}/`], ['en', `${SITE_URL}/en/`], ['x-default', `${SITE_URL}/`]] },
  { loc: `${SITE_URL}/en/`, alternates: [['hr', `${SITE_URL}/`], ['en', `${SITE_URL}/en/`], ['x-default', `${SITE_URL}/`]] },
  ...channels.flatMap((c) => ([
    { loc: `${SITE_URL}/grad/${c.id}/`, alternates: [['hr', `${SITE_URL}/grad/${c.id}/`], ['en', `${SITE_URL}/en/city/${c.id}/`], ['x-default', `${SITE_URL}/grad/${c.id}/`]] },
    { loc: `${SITE_URL}/en/city/${c.id}/`, alternates: [['hr', `${SITE_URL}/grad/${c.id}/`], ['en', `${SITE_URL}/en/city/${c.id}/`], ['x-default', `${SITE_URL}/grad/${c.id}/`]] }
  ])),
  { loc: `${SITE_URL}/o-arhivi/`, alternates: [['hr', `${SITE_URL}/o-arhivi/`], ['en', `${SITE_URL}/en/about/`], ['x-default', `${SITE_URL}/o-arhivi/`]] },
  { loc: `${SITE_URL}/en/about/`, alternates: [['hr', `${SITE_URL}/o-arhivi/`], ['en', `${SITE_URL}/en/about/`], ['x-default', `${SITE_URL}/o-arhivi/`]] }
].map((e) => ({ ...e, lastmod: day }));
write('sitemap.xml', sitemap(entries));

write('llms.txt', `# AKTUAL ARHIVA — archive of AKTUAL MEDIA city editions

> Independent archive portal. Machine-assembled from public feeds, sitemaps and APIs of the ${channels.length} city editions in the network. Every record links to the original publisher; texts are never reproduced in full.

- ${all.length} records, ${channels.length} cities, ${sources.size} publishers, ${langs.size} languages.
- Human start page: ${SITE_URL}/
- English start page: ${SITE_URL}/en/
- Machine index (search): ${SITE_URL}/data/arhiva.json
- Stats: ${SITE_URL}/data/stats.json
- Sitemap: ${SITE_URL}/sitemap.xml
- Feed: ${SITE_URL}/feed.xml
- Sister portal (daily timeline): ${DNEVNIK}/
- Publisher: AKTUAL MEDIA d.o.o., ${MAIN}/gnk-aktual/ — editor and director Nermin Sefić, ${MAIN}/nermin-sefic/
- Freshness of the editions: ${MAIN}/status/
`);

/* ---------- gradnja stranica ---------- */
home('hr');
home('en');
for (const entry of data) {
  cityPage(entry, 'hr');
  cityPage(entry, 'en');
}
about('hr');
about('en');

const files = all.length;
// Broj se računa iz podataka, ne upisuje rukom.
console.log(JSON.stringify({
  ok: true,
  version: VERSION,
  site: SITE_URL,
  stories: all.length,
  cities: channels.length,
  sources: sources.size,
  pagesHtml: 2 + channels.length * 2 + 2,
  outDir: SITE
}, null, 2));
