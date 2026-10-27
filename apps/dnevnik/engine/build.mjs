#!/usr/bin/env node
/**
 * AKTUAL DNEVNIK — samostalan portal: jedan dan, sva izdanja mreže.
 *
 * Ulaz: apps/region/data/*.json. Izlaz: apps/dnevnik/site/.
 * Za svaki od posljednjih 14 dana gradi stranicu koja pokazuje što je
 * svako izdanje objavilo tog dana, po satima (UTC) i po gradu.
 *
 * Pokretanje: node apps/dnevnik/engine/build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  page, esc, fmtDate, fmtDay, fmtNum, storyRow, sitemap, robots, rss,
  breadcrumb, websiteNode, publisherNode, ARHIVA, DNEVNIK, MAIN, SITE_CSS
} from '../../satellites/lib/shell.mjs';
import { writeExchangeJson } from '../../satellites/lib/razmjena-v1.mjs';
import { refreshTag, ensureRefreshModule } from '../../shared/refresh-tag-v1.mjs';
import { impressumBlock } from '../../shared/impressum-v1.mjs';
import { authorBand, ensureAuthorPortrait, AUTHOR_PORTRAIT } from '../../shared/author-band-v1.mjs';
import { designTokensCss } from '../../shared/design-system-v1.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SITE = join(ROOT, 'apps', 'dnevnik', 'site');
const SITE_URL = DNEVNIK;
const VERSION = 'AKTUAL_DNEVNIK_V1_20261022';
const DAYS = 14;

const channels = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8')).channels;
const CITY_EN = {
  zagreb: 'Zagreb', beograd: 'Belgrade', sarajevo: 'Sarajevo', budimpesta: 'Budapest',
  ljubljana: 'Ljubljana', rim: 'Rome', sofija: 'Sofia', bukurest: 'Bucharest'
};

const data = channels.map((c) => {
  const file = join(ROOT, 'apps', 'region', 'data', `${c.id}.json`);
  const parsed = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { items: [] };
  return { c: { ...c, cityEn: c.cityEn || CITY_EN[c.id] }, items: parsed.items || [] };
});
/* Koliko izdanja stvarno ima zapise — iz toga se računa svaki broj i svaki
   naslov. Mreža može imati više kanala od današnjeg presjeka i to se kaže. */
const live = data.filter((d) => d.items.length > 0);
const citiesLabel = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'grad' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'grada' : 'gradova');

const all = data.flatMap(({ c, items }) => items.map((it) => ({ ...it, city: c })));
const byDay = new Map();
for (const it of all) {
  const day = String(it.date).slice(0, 10);
  if (!byDay.has(day)) byDay.set(day, []);
  byDay.get(day).push(it);
}
const days = [...byDay.keys()].sort().reverse().slice(0, DAYS);
for (const list of byDay.values()) list.sort((a, b) => new Date(b.date) - new Date(a.date));

const sources = new Set(all.map((it) => it.sourceName || it.source).filter(Boolean));
const recent = all.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

const write = (rel, content) => {
  const file = join(SITE, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
};

rmSync(SITE, { recursive: true, force: true });
mkdirSync(SITE, { recursive: true });
cpSync(join(ROOT, 'apps', 'satellites', 'assets'), join(SITE, 'assets', 'brand'), { recursive: true });
ensureRefreshModule(SITE);

const nav = (lang) => {
  const hr = lang === 'hr';
  return [
    `<a href="${hr ? '/' : '/en/'}">${hr ? 'Početna' : 'Home'}</a>`,
    `<a href="${hr ? '/#dani' : '/en/#days'}">${hr ? 'Dani' : 'Days'}</a>`,
    `<a href="${hr ? '/o-dnevniku/' : '/en/about/'}">${hr ? 'O dnevniku' : 'About'}</a>`,
    `<a href="${ARHIVA}/">${hr ? 'ARHIVA ↗' : 'ARCHIVE ↗'}</a>`,
    `<a href="${MAIN}/gnk-aktual/">AKTUAL MEDIA ↗</a>`,
    `<a href="${hr ? '/en/' : '/'}" hreflang="${hr ? 'en' : 'hr'}">${hr ? 'EN' : 'HR'}</a>`
  ].join('');
};

const ogImage = () => `${SITE_URL}/assets/brand/aktual-dnevnik-og.jpg`;
const OG_ALT = 'AKTUAL DNEVNIK — linija s tri čvora: GNK ASG, ARHIVA, DNEVNIK';

const hours = (items) => {
  const buckets = new Array(24).fill(0);
  for (const it of items) {
    const h = new Date(it.date).getUTCHours();
    buckets[h] += 1;
  }
  return buckets;
};

const bars = (items, lang) => {
  const b = hours(items);
  const max = Math.max(...b, 1);
  return `<ul class="bars" aria-label="${lang === 'hr' ? 'Objave po satu (UTC)' : 'Posts per hour (UTC)'}">${b
    .map((n, h) => `<li style="height:${Math.max(2, Math.round((n / max) * 42))}px" title="${String(h).padStart(2, '0')}:00 UTC — ${n}"></li>`)
    .join('')}</ul>
  <p class="sub">${lang === 'hr' ? 'Stupci: objave po satu, 00–23 UTC. Najviši stupac = najaktivniji sat.' : 'Bars: posts per hour, 00–23 UTC. Tallest bar = busiest hour.'}</p>`;
};

/* ---------- naslovnica ---------- */
function home(lang) {
  const hr = lang === 'hr';
  const path = hr ? '/' : '/en/';
  const title = hr ? `AKTUAL DNEVNIK — jedan dan, ${live.length} ${citiesLabel(live.length)}` : `AKTUAL DAILY — one day, ${live.length} cities`;
  const desc = hr
    ? `Presjek ${live.length} gradskih izdanja po danima i satima: ${days.length} dana unatrag, tko je što objavio i kada. Svaki zapis vodi na izvornik.`
    : `${live.length} city editions cut by day and hour: the last ${days.length} days, who published what and when. Every record links to the original.`;

  const total = days.reduce((a, d) => a + byDay.get(d).length, 0);
  const dayRows = days.map((d) => {
    const items = byDay.get(d);
    const cities = new Set(items.map((i) => i.city.id)).size;
    return `<li><a href="${hr ? `/dan/${d}/` : `/en/day/${d}/`}"><b>${fmtDay(d, lang)}</b><span>${items.length} ${hr ? 'tekstova' : 'stories'} · ${cities}/${live.length} ${hr ? 'gradova' : 'cities'}</span></a></li>`;
  }).join('');

  const body = `<header class="hero">
  <p class="kicker">${hr ? 'AKTUAL MEDIA · dnevnik' : 'AKTUAL MEDIA · daily'}</p>
  <h1>${hr ? `Jedan dan, ${live.length} ${citiesLabel(live.length)}` : `One day, ${live.length} cities`}</h1>
  <p class="lead">${hr
    ? `Umjesto još jednog popisa vijesti, ovdje stoji dan: što je svako od ${live.length} izdanja s arhivom objavilo, u kojem satu i iz kojeg medija. Mreža ukupno ima ${channels.length} kanala; novi se pridružuju kad dobiju zapise. Odaberite dan i vidite cijelu sliku.`
    : `Instead of another list of news, here is a day: what each of the ${live.length} editions with an archive published, in which hour and from which publisher. The network has ${channels.length} channels in total; new ones join once they have records. Pick a day and see the whole picture.`}</p>
  <ul class="stats">
    <li><b>${days.length}</b><span>${hr ? 'dana u presjeku' : 'days in view'}</span></li>
    <li><b>${total}</b><span>${hr ? 'tekstova u tim danima' : 'stories in those days'}</span></li>
    <li><b>${live.length}</b><span>${hr ? 'gradova u presjeku' : 'cities in view'}</span></li>
    <li><b>${sources.size}</b><span>${hr ? 'medija ukupno' : 'publishers overall'}</span></li>
  </ul>
</header>

<section id="dani">
  <h2>${hr ? `Posljednjih ${days.length} dana` : `The last ${days.length} days`}</h2>
  <p class="sub">${hr ? 'Klik otvara dnevni presjek: kolona po gradu, jedan dan, svi izvornici povezani.' : 'A click opens the day: one column per city, one day, every original linked.'}</p>
  <ul class="days">${dayRows}</ul>
</section>

<section>
  <h2>${hr ? 'Najnovije u ovom trenutku' : 'Latest right now'}</h2>
  <p class="sub">${hr ? `Posljednjih 12 zapisa iz svih ${live.length} izdanja s arhivom.` : `The last 12 records from all ${live.length} editions with an archive.`}</p>
  <ul class="list">${recent.slice(0, 12).map((it) => storyRow(it, lang, { city: it.city, cityBase: ARHIVA })).join('')}</ul>
  <div class="row">
    <a class="btn solid" href="${ARHIVA}${hr ? '/' : '/en/'}">${hr ? 'Cijela arhiva →' : 'The whole archive →'}</a>
    <a class="btn" href="${MAIN}/gnk-aktual/">${hr ? 'AKTUAL MEDIA →' : 'AKTUAL MEDIA →'}</a>
  </div>
</section>

<p class="note">${hr
    ? 'Dnevnik ne uređuje vijesti i ne bira važnije od manje važnih: on bilježi što je zabilježeno i kada. Svaki zapis vodi na izvornik; tvrdnje izvora nisu tvrdnje redakcije.'
    : 'The daily does not edit the news and does not rank what matters more: it records what was recorded and when. Every record links to the original; claims from sources are not the claims of the newsroom.'}</p>`;

  write(hr ? 'index.html' : 'en/index.html', page({
    lang, siteName: hr ? 'AKTUAL DNEVNIK' : 'AKTUAL DAILY', siteUrl: SITE_URL, path,
    title, desc, body, navHtml: nav(lang), ogImage: ogImage(), ogImageAlt: OG_ALT,
    altUrl: `${SITE_URL}${hr ? '/en/' : '/'}`,
    alternates: [['application/rss+xml', '/feed.xml']],
    jsonld: [
      websiteNode(SITE_URL, lang), publisherNode(),
      {
        '@type': 'CollectionPage', '@id': `${SITE_URL}${path}#webpage`, url: `${SITE_URL}${path}`,
        name: title, description: desc, inLanguage: lang,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': `${MAIN}/gnk-aktual/#news-organization` },
        mainEntity: {
          '@type': 'ItemList', numberOfItems: days.length,
          itemListElement: days.map((d, i) => ({
            '@type': 'ListItem', position: i + 1,
            name: fmtDay(d, lang), url: `${SITE_URL}${hr ? `/dan/${d}/` : `/en/day/${d}/`}`
          }))
        }
      },
      breadcrumb(SITE_URL, lang, path, hr ? 'Dnevnik' : 'Daily', hr ? 'AKTUAL DNEVNIK' : 'AKTUAL DAILY')
    ]
  }));
}

/* ---------- dan ---------- */
function dayPage(dayIso, lang) {
  const hr = lang === 'hr';
  const path = hr ? `/dan/${dayIso}/` : `/en/day/${dayIso}/`;
  const items = byDay.get(dayIso) || [];
  const citiesCovered = new Set(items.map((i) => i.city.id)).size;
  const pubs = new Set(items.map((i) => i.sourceName || i.source)).size;
  const title = hr
    ? `${fmtDay(dayIso, 'hr')} — ${items.length} tekstova | AKTUAL DNEVNIK`
    : `${fmtDay(dayIso, 'en')} — ${items.length} stories | AKTUAL DAILY`;
  const desc = hr
    ? `Što su ${fmtDay(dayIso, 'hr')} objavila AKTUAL MEDIA izdanja: ${items.length} tekstova iz ${pubs} medija, po gradovima i satima. Svaki zapis vodi na izvornik.`
    : `What the AKTUAL MEDIA editions published on ${fmtDay(dayIso, 'en')}: ${items.length} stories from ${pubs} publishers, by city and hour. Every record links to the original.`;

  const idx = days.indexOf(dayIso);
  const newer = idx > 0 ? days[idx - 1] : null;
  const older = idx >= 0 && idx < days.length - 1 ? days[idx + 1] : null;

  const columns = data.map(({ c, items: cityItems }) => {
    const todays = cityItems
      .filter((it) => String(it.date).slice(0, 10) === dayIso)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const head = `<h3><a href="${ARHIVA}${hr ? `/grad/${c.id}/` : `/en/city/${c.id}/`}">${esc(hr ? c.city : c.cityEn)}</a> <span class="pill">${todays.length}</span></h3>`;
    if (!todays.length) {
      return `<div class="col">${head}<p class="sub">${hr ? 'Nema zapisa za ovaj dan.' : 'No records for this day.'}</p></div>`;
    }
    const rows = todays.slice(0, 10).map((it) => `<li><time datetime="${esc(it.date)}">${fmtDate(it.date, lang)}</time>
      <a href="${esc(it.url)}" target="_blank" rel="external noopener noreferrer nofollow">${esc(it.title)}</a></li>`).join('');
    const cityHref = `${ARHIVA}${hr ? `/grad/${c.id}/` : `/en/city/${c.id}/`}`;
    const more = `<p class="sub"><a href="${cityHref}">${todays.length > 10
      ? (hr ? `svih ${todays.length} u arhivi grada` : `all ${todays.length} in the city archive`)
      : (hr ? 'arhiva grada' : 'city archive')}</a></p>`;
    return `<div class="col">${head}<ul>${rows}</ul>${more}</div>`;
  }).join('');

  const body = `<header class="hero">
  <p class="kicker">${hr ? 'Dnevni presjek' : 'Daily cross-section'} · ${esc(dayIso)}</p>
  <h1>${fmtDay(dayIso, lang)}</h1>
  <p class="lead">${hr
    ? `${items.length} tekstova iz ${pubs} medija, u ${citiesCovered} od 8 gradova. Poredano po gradu i vremenu objave.`
    : `${items.length} stories from ${pubs} publishers, in ${citiesCovered} of 8 cities. Ordered by city and publication time.`}</p>
  ${bars(items, lang)}
  <div class="row">
    ${older ? `<a class="btn" href="${hr ? `/dan/${older}/` : `/en/day/${older}/`}">← ${fmtDay(older, lang)}</a>` : ''}
    <a class="btn solid" href="${hr ? '/' : '/en/'}">${hr ? 'Svi dani' : 'All days'}</a>
    ${newer ? `<a class="btn" href="${hr ? `/dan/${newer}/` : `/en/day/${newer}/`}">${fmtDay(newer, lang)} →</a>` : ''}
  </div>
</header>
<section>
  <h2>${hr ? `${live.length} ${citiesLabel(live.length)}, jedan dan` : `${live.length} cities, one day`}</h2>
  <p class="sub">${hr ? 'Po deset najnovijih zapisa po gradu; puni popis je u arhivi grada.' : 'The ten latest records per city; the full list is in the city archive.'}</p>
  <div class="cols">${columns}</div>
</section>
<section>
  <h2>${hr ? 'Cijeli dan u arhivi' : 'The whole day in the archive'}</h2>
  <p class="sub">${hr ? 'Svi zapisi ovog dana, kronološki, s izvornikom i poveznicom na portal.' : 'Every record of this day, in order, with the original and a link to the portal.'}</p>
  <ul class="list">${items.map((it) => storyRow(it, lang, { city: it.city, cityBase: ARHIVA })).join('')}</ul>
</section>`;

  write(hr ? `dan/${dayIso}/index.html` : `en/day/${dayIso}/index.html`, page({
    lang, siteName: hr ? 'AKTUAL DNEVNIK' : 'AKTUAL DAILY', siteUrl: SITE_URL, path,
    title, desc, body, navHtml: nav(lang), ogImage: ogImage(), ogImageAlt: OG_ALT,
    altUrl: `${SITE_URL}${hr ? `/en/day/${dayIso}/` : `/dan/${dayIso}/`}`,
    jsonld: [
      websiteNode(SITE_URL, lang), publisherNode(),
      {
        '@type': 'CollectionPage', '@id': `${SITE_URL}${path}#webpage`, url: `${SITE_URL}${path}`,
        name: title, description: desc, inLanguage: lang, temporalCoverage: dayIso,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': `${MAIN}/gnk-aktual/#news-organization` },
        mainEntity: {
          '@type': 'ItemList', numberOfItems: Math.min(20, items.length),
          itemListElement: items.slice(0, 20).map((it, i) => ({
            '@type': 'ListItem', position: i + 1, name: it.title, url: it.url
          }))
        }
      },
      breadcrumb(SITE_URL, lang, path, fmtDay(dayIso, lang), hr ? 'AKTUAL DNEVNIK' : 'AKTUAL DAILY')
    ]
  }));
}

/* ---------- o dnevniku ---------- */
function about(lang) {
  const hr = lang === 'hr';
  const path = hr ? '/o-dnevniku/' : '/en/about/';
  const title = hr ? 'O dnevniku — što je presjek i što nije | AKTUAL DNEVNIK' : 'About the daily — what it is and is not | AKTUAL DAILY';
  const desc = hr
    ? `AKTUAL DNEVNIK je presjek, ne rangiranje: bilježi što su izdanja mreže objavila u kojem satu i povezuje izvornike. U presjeku: ${live.length} od ${channels.length} kanala.`
    : `AKTUAL DAILY is a cross-section, not a ranking: it records what the network's editions published in which hour and links every original (${live.length} of ${channels.length} channels).`;

  const body = `<header class="hero">
  <p class="kicker">${hr ? 'Metodologija' : 'Methodology'}</p>
  <h1>${hr ? 'Presjek, ne rangiranje' : 'A cross-section, not a ranking'}</h1>
  <p class="lead">${hr
    ? `Dnevnik odgovara na pitanje „što se dogodilo tog dana u ${live.length} ${citiesLabel(live.length)}", a ne „što je najvažnije". Zato nema bodova, ni redoslijeda važnosti — samo vrijeme, grad i izvornik.`
    : `The daily answers “what happened that day in ${live.length} cities”, not “what matters most”. That is why there are no scores and no order of importance — only time, city and the original.`}</p>
  <div class="row"><a class="btn solid" href="${hr ? '/' : '/en/'}">${hr ? '← Dani' : '← Days'}</a></div>
</header>
<section>
  <h2>${hr ? 'Što stoji u presjeku' : 'What the cross-section contains'}</h2>
  <ul class="grid">
    <li class="card"><b>${hr ? 'Sat po sat' : 'Hour by hour'}</b><span>${hr ? 'Stupci pokazuju koliko je zapisa objavljeno u svakom satu (UTC).' : 'Bars show how many records were published in each hour (UTC).'}</span></li>
    <li class="card"><b>${hr ? 'Grad po grad' : 'City by city'}</b><span>${hr ? 'Kolona po gradu, ista pravila za sve; prazna kolona je jednako važna informacija.' : 'One column per city, the same rules for all; an empty column is information too.'}</span></li>
    <li class="card"><b>${hr ? 'Izvornik uz svaki naslov' : 'An original next to every headline'}</b><span>${hr ? 'Bez prijepisa cijelog teksta i bez izmišljenih citata.' : 'No full-text copies and no invented quotes.'}</span></li>
    <li class="card"><b>${hr ? 'Bez uredničkog rangiranja' : 'No editorial ranking'}</b><span>${hr ? 'Redoslijed je vremenski; o važnosti čitatelj odlučuje sam.' : 'The order is chronological; the reader decides what matters.'}</span></li>
  </ul>
</section>
<section>
  <h2>${hr ? 'Dalje' : 'Next'}</h2>
  <ul class="grid">
    <li><a class="card" href="${ARHIVA}${hr ? '/' : '/en/'}"><b>${hr ? 'AKTUAL ARHIVA' : 'AKTUAL ARCHIVE'}</b><span>${hr ? `Pretraživa arhiva svih ${fmtNum(all.length, 'hr')} tekstova.` : `A searchable archive of all ${fmtNum(all.length, 'en')} stories.`}</span></a></li>
    <li><a class="card" href="${MAIN}/status/"><b>${hr ? 'Status ažurnosti' : 'Freshness status'}</b><span>${hr ? 'Kada je koje izdanje zadnji put obnovljeno.' : 'When each edition was last refreshed.'}</span></a></li>
    <li><a class="card" href="${MAIN}/aktual-media/"><b>${hr ? 'Podatkovni desk' : 'Data desk'}</b><span>${hr ? 'Četiri mjerenja vlastite arhive.' : 'Four measurements of our own archive.'}</span></a></li>
  </ul>
</section>`;

  write(hr ? 'o-dnevniku/index.html' : 'en/about/index.html', page({
    lang, siteName: hr ? 'AKTUAL DNEVNIK' : 'AKTUAL DAILY', siteUrl: SITE_URL, path,
    title, desc, body, navHtml: nav(lang), ogImage: ogImage(), ogImageAlt: OG_ALT,
    altUrl: `${SITE_URL}${hr ? '/en/about/' : '/o-dnevniku/'}`,
    jsonld: [
      websiteNode(SITE_URL, lang), publisherNode(),
      {
        '@type': 'AboutPage', '@id': `${SITE_URL}${path}#webpage`, url: `${SITE_URL}${path}`,
        name: title, description: desc, inLanguage: lang,
        isPartOf: { '@id': `${SITE_URL}/#website` }
      },
      breadcrumb(SITE_URL, lang, path, hr ? 'O dnevniku' : 'About', hr ? 'AKTUAL DNEVNIK' : 'AKTUAL DAILY')
    ]
  }));
}

write('404.html', `<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="${SITE_URL}/assets/brand/favicon.svg" type="image/svg+xml">
<title>Stranica nije pronađena — AKTUAL DNEVNIK</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/assets/site.css?v=20261022"></head>
<body><a class="skip" href="#sadrzaj">Sadržaj</a><main id="sadrzaj" class="wrap" style="padding:60px 0"><p class="kicker">404</p><h1>Nema te stranice</h1>
<p class="lead">Dani su ovdje:</p><div class="row"><a class="btn solid" href="/">Dnevnik</a><a class="btn" href="${ARHIVA}/">Arhiva</a><a class="btn" href="${MAIN}/gnk-aktual/">AKTUAL MEDIA</a></div></main>${authorBand('hr')}${impressumBlock('hr')}${refreshTag('/')}</body></html>`);

write('assets/site.css', SITE_CSS);
ensureAuthorPortrait(AUTHOR_PORTRAIT, resolve(dirname(fileURLToPath(import.meta.url)), '..', 'site'));
write('robots.txt', robots(SITE_URL));
/* Isti popis razmjene koji stranica prikazuje, u strojnom obliku. */
writeExchangeJson(SITE, { root: ROOT, selfHome: `${SITE_URL}/`, selfNames: ['AKTUAL DNEVNIK'] });
write('feed.xml', rss({
  siteUrl: SITE_URL, siteName: 'AKTUAL DNEVNIK',
  desc: 'Dnevni presjek gradskih izdanja AKTUAL MEDIA',
  items: recent.slice(0, 40), lang: 'hr'
}));

write('data/days.json', JSON.stringify({
  version: VERSION,
  generated: new Date().toISOString(),
  days: days.map((d) => ({
    date: d,
    stories: byDay.get(d).length,
    cities: [...new Set(byDay.get(d).map((i) => i.city.id))],
    hourly: hours(byDay.get(d)),
    url: `${SITE_URL}/dan/${d}/`
  }))
}, null, 2));

home('hr');
home('en');
for (const d of days) {
  dayPage(d, 'hr');
  dayPage(d, 'en');
}
about('hr');
about('en');

const day0 = new Date().toISOString().slice(0, 10);
const entries = [
  { loc: `${SITE_URL}/`, alternates: [['hr', `${SITE_URL}/`], ['en', `${SITE_URL}/en/`], ['x-default', `${SITE_URL}/`]] },
  { loc: `${SITE_URL}/en/`, alternates: [['hr', `${SITE_URL}/`], ['en', `${SITE_URL}/en/`], ['x-default', `${SITE_URL}/`]] },
  ...days.flatMap((d) => ([
    { loc: `${SITE_URL}/dan/${d}/`, alternates: [['hr', `${SITE_URL}/dan/${d}/`], ['en', `${SITE_URL}/en/day/${d}/`], ['x-default', `${SITE_URL}/dan/${d}/`]] },
    { loc: `${SITE_URL}/en/day/${d}/`, alternates: [['hr', `${SITE_URL}/dan/${d}/`], ['en', `${SITE_URL}/en/day/${d}/`], ['x-default', `${SITE_URL}/dan/${d}/`]] }
  ])),
  { loc: `${SITE_URL}/o-dnevniku/`, alternates: [['hr', `${SITE_URL}/o-dnevniku/`], ['en', `${SITE_URL}/en/about/`], ['x-default', `${SITE_URL}/o-dnevniku/`]] },
  { loc: `${SITE_URL}/en/about/`, alternates: [['hr', `${SITE_URL}/o-dnevniku/`], ['en', `${SITE_URL}/en/about/`], ['x-default', `${SITE_URL}/o-dnevniku/`]] }
].map((e) => ({ ...e, lastmod: day0 }));
write('sitemap.xml', sitemap(entries));

write('llms.txt', `# AKTUAL DNEVNIK — one day, ${live.length} cities

> Independent daily cross-section of the ${live.length} AKTUAL MEDIA editions with an archive (network: ${channels.length} channels). For each of the last ${days.length} days it lists what every city edition published, by hour and by city. Every record links to the original publisher; there is no ranking of importance.

- Days in view: ${days.length}; records: ${days.reduce((a, d) => a + byDay.get(d).length, 0)}; publishers: ${sources.size}.
- Start page: ${SITE_URL}/
- English start page: ${SITE_URL}/en/
- Machine view of the days: ${SITE_URL}/data/days.json
- Sitemap: ${SITE_URL}/sitemap.xml
- Feed: ${SITE_URL}/feed.xml
- Sister portal (searchable archive): ${ARHIVA}/
- Publisher: AKTUAL MEDIA d.o.o., ${MAIN}/gnk-aktual/ — editor and director Nermin Sefić, ${MAIN}/nermin-sefic/
`);

console.log(JSON.stringify({
  ok: true,
  version: VERSION,
  site: SITE_URL,
  days: days.length,
  storiesInDays: days.reduce((a, d) => a + byDay.get(d).length, 0),
  pagesHtml: 4 + days.length * 2,
  outDir: SITE
}, null, 2));
