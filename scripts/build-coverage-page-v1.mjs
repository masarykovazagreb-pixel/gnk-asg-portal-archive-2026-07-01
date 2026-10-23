#!/usr/bin/env node
/**
 * JAVNA STRANICA POKRIVENOSTI — /pokrivenost/ i /en/coverage/.
 *
 * Stranica ne obećava "sve zemlje sutra". Pokazuje tri stvari koje se mogu
 * provjeriti: što je javno danas, koji su valovi dogovoreni i što svaki grad
 * mora imati prije objave. Brojevi se čitaju iz world-coverage-v1.json, pa
 * se stranica ne može razilaziti s mrežom.
 *
 *   node scripts/build-coverage-page-v1.mjs
 *   node scripts/build-coverage-page-v1.mjs --check
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { figureHtml, artStylesheet } from './lib/page-art-v1.mjs';
import { entityGraphJson } from './lib/entity-graph-v1.mjs';
import { PLANNED, WAVES } from '../apps/world/lib/expansion-plan.mjs';
import { CONTINENTS as WORLD_CONTINENTS } from '../apps/world/lib/registry.mjs';
import { langName } from '../apps/world/lib/language-names.mjs';

/* Plan piše kontinente na hrvatskom, tablica ih grupira na engleskom — isti
   ključevi koje koristi `world-coverage-v1.json`. */
const CONTINENT_EN = {
  Europa: 'Europe', 'Sjeverna Amerika': 'North America', 'Južna Amerika': 'South America',
  Afrika: 'Africa', Azija: 'Asia', Oceanija: 'Oceania'
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const CHECK = process.argv.includes('--check');
const SITE = 'https://gnk-asg.hr';

const data = JSON.parse(readFileSync(join(PORTAL, 'data', 'world-coverage-v1.json'), 'utf8'));
const channels = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8')).channels;

const esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const CONTINENT_HR = {
  Europe: 'Europa', 'North America': 'Sjeverna Amerika', 'South America': 'Južna Amerika',
  Africa: 'Afrika', Asia: 'Azija', Oceania: 'Oceanija'
};

const LIVE_BY_ID = new Map(channels.map((channel) => [channel.id, channel]));

const CSS = `
.cv-wrap{max-width:1040px;margin:0 auto;padding:0 22px}
.cv-head{padding:34px 0 8px}
.cv-k{font:800 11px/1.4 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#8a6a1f;margin:0 0 10px}
.cv-h1{font:800 clamp(30px,4.4vw,46px)/1.08 system-ui,sans-serif;margin:0 0 14px}
.cv-lead{font:400 18px/1.6 system-ui,sans-serif;color:#3c4657;max-width:72ch;margin:0 0 26px}
.cv-stats{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:0 0 34px}
.cv-stat{border:1px solid #e3e8f0;border-radius:14px;padding:16px 18px;background:#fff}
.cv-stat b{display:block;font:800 30px/1 system-ui,sans-serif;color:#12233a;margin:0 0 6px}
.cv-stat span{display:block;font:600 11px/1.45 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6a7688}
.cv-h2{font:800 24px/1.2 system-ui,sans-serif;margin:34px 0 12px;color:#12233a}
.cv-p{font:400 16px/1.65 system-ui,sans-serif;color:#3c4657;max-width:74ch;margin:0 0 16px}
.cv-wave{border:1px solid #e3e8f0;border-radius:16px;background:#fff;margin:0 0 16px;overflow:hidden}
.cv-wave header{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:16px 18px;border-bottom:1px solid #edf1f6;flex-wrap:wrap}
.cv-wave header b{font:800 17px/1.3 system-ui,sans-serif;color:#12233a}
.cv-wave header span{font:700 10.5px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#8a6a1f}
.cv-wave .body{padding:14px 18px 18px}
.cv-wave .note{font:400 14.5px/1.6 system-ui,sans-serif;color:#5b6676;margin:0 0 12px}
.cv-cities{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}
.cv-cities li{font:600 13px/1 system-ui,sans-serif;color:#243040;background:#f4f7fb;border:1px solid #e3e8f0;border-radius:999px;padding:7px 11px}
.cv-cities li.live{background:#eef8f0;border-color:#cfe9d5;color:#1d5a2c}
.cv-cities li small{font-weight:500;opacity:.7}
.cv-req{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin:0 0 12px;padding:0;list-style:none}
.cv-req li{border:1px solid #e3e8f0;border-radius:12px;padding:14px 16px;background:#fafcff;font:400 14.5px/1.55 system-ui,sans-serif;color:#3c4657}
.cv-note{border-left:3px solid #c8963c;padding:2px 0 2px 14px;font:400 15px/1.65 system-ui,sans-serif;color:#4a5566;margin:22px 0}
.cv-links{display:flex;flex-wrap:wrap;gap:10px;margin:26px 0 44px}
.cv-links a{font:700 12px/1 system-ui,sans-serif;letter-spacing:.06em;text-decoration:none;color:#12233a;border:1px solid #dbe3ee;border-radius:999px;padding:11px 15px;background:#fff}
.cv-links a:hover{border-color:#c8963c}
.cv-tablewrap{overflow-x:auto;border:1px solid #e3e8f0;border-radius:16px;background:#fff;margin:0 0 26px}
.cv-table{width:100%;border-collapse:collapse;font:400 14.5px/1.45 system-ui,sans-serif;min-width:620px}
.cv-table caption{text-align:left;padding:14px 18px 10px;font:800 15px/1.3 system-ui,sans-serif;color:#12233a;border-bottom:1px solid #edf1f6}
.cv-table th{text-align:left;font:700 10.5px/1.3 system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#6a7688;padding:9px 18px;border-bottom:1px solid #edf1f6;background:#fafcff}
.cv-table td{padding:9px 18px;border-bottom:1px solid #f2f5f9;color:#28323f;vertical-align:top}
.cv-table tr:last-child td{border-bottom:0}
.cv-table td a{color:#12233a;font-weight:700;text-decoration:none;border-bottom:1px solid #c8963c}
.cv-tag{display:inline-block;font:700 10px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:5px 8px;border-radius:999px;background:#f4f7fb;color:#5b6676;border:1px solid #e3e8f0;white-space:nowrap}
.cv-tag.live{background:#eef8f0;border-color:#cfe9d5;color:#1d5a2c}
.cv-legend{font:400 13px/1.6 system-ui,sans-serif;color:#6a7688;margin:-14px 0 26px}
`;

function page(lang) {
  const hr = lang === 'hr';
  const canonical = hr ? `${SITE}/pokrivenost/` : `${SITE}/en/coverage/`;
  const other = hr ? `${SITE}/en/coverage/` : `${SITE}/pokrivenost/`;
  const title = hr
    ? `Pokrivenost mreže — ${data.live.editions} javnih izdanja, plan do ${data.total.countries} zemalja | AKTUAL MEDIA`
    : `Network coverage — ${data.live.editions} live editions, a plan towards ${data.total.countries} countries | AKTUAL MEDIA`;
  const description = hr
    ? `Javno: ${data.live.editions} gradskih izdanja u ${data.live.countries} zemalja na ${data.live.languages} jezika. Plan: ${data.planned.cities} gradova, ukupno ${data.total.countries} zemalja, u pet valova — sa zahtjevima koje svako izdanje mora ispuniti.`
    : `Live: ${data.live.editions} city editions in ${data.live.countries} countries and ${data.live.languages} languages. Plan: ${data.planned.cities} cities, ${data.total.countries} countries in total, in five waves — with the requirements each edition must meet.`;

  const hero = figureHtml({
    portal: PORTAL,
    art: 'izdanja/singapur',
    alt: hr
      ? 'Singapur: gradska panorama i luka u sumrak'
      : 'Singapore: city skyline and harbour at dusk',
    caption: hr
      ? 'Jedan grad, jedno izdanje, jedan izvor provjere. Singapur je jedno od devet svjetskih izdanja.'
      : 'One city, one edition, one source of verification. Singapore is one of nine world editions.'
  });

  const stats = [
    [data.live.editions, hr ? 'javnih izdanja' : 'live editions'],
    [data.live.countries, hr ? 'zemalja javno' : 'countries live'],
    [data.live.languages, hr ? 'jezika' : 'languages'],
    [data.total.countries, hr ? 'zemalja u planu' : 'countries planned'],
    [data.planned.cities, hr ? 'gradova u planu' : 'cities planned']
  ].map(([value, label]) => `      <div class="cv-stat"><b>${value}</b><span>${esc(label)}</span></div>`).join('\n');

  const liveCities = data.live.ids.map((id) => {
    const channel = LIVE_BY_ID.get(id);
    if (!channel) return '';
    return `          <li class="live">${esc(channel.city)} <small>${esc(channel.lang)}</small></li>`;
  }).filter(Boolean).join('\n');

  const waves = data.planned.waves.map((wave) => {
    const isLive = wave.status === 'live';
    return `      <section class="cv-wave">
        <header>
          <b>${esc(wave.name)}</b>
          <span>${isLive ? (hr ? 'javno' : 'live') : `${wave.cities} ${hr ? 'gradova' : 'cities'}`}</span>
        </header>
        <div class="body">
          ${isLive ? `<ul class="cv-cities">\n${liveCities}\n          </ul>` : `<p class="note">${hr
            ? 'Gradovi ovog vala dobivaju adresu tek kad ispune sve četiri točke ispod. Do tada ih ne objavljujemo — prazna stranica nije izdanje.'
            : 'Cities in this wave get an address only when all four requirements below are met. Until then they are not published — an empty page is not an edition.'}</p>`}
        </div>
      </section>`;
  }).join('\n');

  const requirements = data.requirements.map((requirement) => `        <li>${esc(hr ? requirement.hr : requirement.en)}</li>`).join('\n');

  const continentRows = Object.entries(data.byContinent)
    .sort((a, b) => (b[1].live || 0) + b[1].planned - ((a[1].live || 0) + a[1].planned))
    .map(([name, counts]) => `      <div class="cv-stat"><b>${(counts.live || 0)} + ${counts.planned}</b><span>${esc(hr ? CONTINENT_HR[name] || name : name)} · ${hr ? 'javno + plan' : 'live + planned'}</span></div>`)
    .join('\n');

  /* Tablica svih zemalja: ono što mreža pokriva danas i ono što je u planu.
     Redak je činjenica (država, prijestolnica, jezik, val), a status se čita
     iz channels.json — ništa se ne upisuje rukom. */
  const liveById = new Map(channels.map((channel) => [channel.countryCode, channel]));
  const rows = [
    ...channels.map((channel) => ({
      code: channel.countryCode,
      country: { hr: channel.country, en: channel.country },
      capital: { hr: channel.city, en: channel.city },
      lang: channel.lang,
      wave: 1,
      live: channel
    })),
    ...PLANNED.filter((entry) => !liveById.has(entry.countryCode)).map((entry) => ({
      code: entry.countryCode,
      country: { hr: entry.country, en: entry.countryEn },
      capital: { hr: entry.city, en: entry.cityEn },
      lang: entry.lang,
      wave: Number(String(entry.wave).replace(/\D/g, '')) || 0,
      live: null
    }))
  ].sort((a, b) => a.country.hr.localeCompare(b.country.hr, 'hr'));

  const byContinent = new Map();
  for (const row of rows) {
    const live = row.live;
    const continent = live
      ? ((WORLD_CONTINENTS[live.id] || {}).en || 'Europe')
      : CONTINENT_EN[(PLANNED.find((entry) => entry.countryCode === row.code) || {}).continent] || 'Europe';
    if (!byContinent.has(continent)) byContinent.set(continent, []);
    byContinent.get(continent).push({ ...row, continent });
  }
  const continentOrder = ['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania'];
  const countryTables = continentOrder.filter((name) => byContinent.has(name)).map((name) => {
    const list = byContinent.get(name).sort((a, b) => a.country.hr.localeCompare(b.country.hr, 'hr'));
    const liveCount = list.filter((row) => row.live).length;
    const body = list.map((row) => {
      const nameCell = row.live
        ? `<a href="${esc(row.live.base)}" hreflang="${esc(row.lang)}">${esc(hr ? row.country.hr : row.country.en)}</a>`
        : esc(hr ? row.country.hr : row.country.en);
      const state = row.live
        ? `<span class="cv-tag live">${hr ? 'javno' : 'live'}</span>`
        : `<span class="cv-tag">${hr ? `val ${row.wave}` : `wave ${row.wave}`}</span>`;
      return `        <tr><td>${nameCell}</td><td>${esc(hr ? row.capital.hr : row.capital.en)}</td><td>${esc(langName(row.lang, hr ? 'hr' : 'en'))}</td><td>${state}</td></tr>`;
    }).join('\n');
    return `  <div class="cv-tablewrap">
    <table class="cv-table">
      <caption>${esc(hr ? CONTINENT_HR[name] || name : name)} — ${list.length} ${hr ? 'zemalja' : 'countries'} · ${liveCount} ${hr ? 'javno' : 'live'}</caption>
      <thead><tr><th>${hr ? 'Zemlja' : 'Country'}</th><th>${hr ? 'Prijestolnica' : 'Capital'}</th><th>${hr ? 'Jezik izdanja' : 'Edition language'}</th><th>${hr ? 'Status' : 'Status'}</th></tr></thead>
      <tbody>
${body}
      </tbody>
    </table>
  </div>`;
  }).join('\n');

  const graph = entityGraphJson({ compact: true }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#f7f4ec">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="hr" href="${SITE}/pokrivenost/">
<link rel="alternate" hreflang="en" href="${SITE}/en/coverage/">
<link rel="alternate" hreflang="x-default" href="${SITE}/pokrivenost/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/assets/izdanja/singapur-og.jpg">
<meta property="og:image:alt" content="${hr ? 'Singapur: gradska panorama i luka u sumrak' : 'Singapore: city skyline and harbour at dusk'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}/assets/izdanja/singapur-og.jpg">
<meta name="twitter:image:alt" content="${hr ? 'Singapur: gradska panorama i luka u sumrak' : 'Singapore: city skyline and harbour at dusk'}">
<meta name="twitter:site" content="@aktualmedia">
<meta name="author" content="Nermin Sefić">
<meta name="editor" content="Nermin Sefić">
<meta property="article:tag" content="#AKTUALMEDIA">
<meta property="article:tag" content="#GNKASG">
<meta property="article:tag" content="#NerminSefić">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/page-art-v1.css">
<style>${CSS}</style>
<script type="application/ld+json" id="network-entity-v1">${graph}</script>
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://gnk-asg.hr/#website',
        url: 'https://gnk-asg.hr/',
        name: 'GNK ASG',
        inLanguage: ['hr', 'en'],
        publisher: { '@id': 'https://gnk-asg.hr/#gnk-asg' }
      },
      {
        '@type': 'WebPage',
        '@id': `${canonical}#page`,
        url: canonical,
        name: hr ? 'Pokrivenost mreže' : 'Network coverage',
        description,
        inLanguage: lang,
        isPartOf: { '@id': 'https://gnk-asg.hr/#website' },
        about: { '@id': 'https://gnk-asg.hr/#aktual-media' },
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'GNK ASG', item: 'https://gnk-asg.hr/' },
            { '@type': 'ListItem', position: 2, name: hr ? 'Pokrivenost' : 'Coverage', item: canonical }
          ]
        }
      },
      {
        '@type': 'Dataset',
        name: hr ? 'Pokrivenost mreže AKTUAL MEDIA' : 'AKTUAL MEDIA network coverage',
        description,
        url: canonical,
        creator: { '@id': 'https://gnk-asg.hr/#aktual-media' },
        variableMeasured: hr
          ? ['javna izdanja', 'zemlje', 'jezici', 'planirani gradovi']
          : ['live editions', 'countries', 'languages', 'planned cities']
      }
    ]
  }).replace(/</g, '\\u003c')}</script>
</head>
<body style="background:#f7f4ec;color:#12233a">
<div class="cv-wrap">
  <header class="cv-head">
    <p class="cv-k">AKTUAL MEDIA · ${hr ? 'pokrivenost mreže' : 'network coverage'}</p>
    <h1 class="cv-h1">${hr ? 'Svaka zemlja, jedna prijestolnica, jedno izdanje' : 'Every country, one capital, one edition'}</h1>
    <p class="cv-lead">${hr
      ? 'Mreža raste valovima. Novi grad ne dobiva adresu zato što je na popisu, nego kad ima provjerene izvore, scenu grada, sučelje na svom jeziku i barem jedan stvarni zapis u arhivi. Ova stranica pokazuje gdje smo danas i što je dogovoreno.'
      : 'The network grows in waves. A new city gets an address not because it is on a list, but when it has verified sources, a city scene, an interface in its own language and at least one real record in the archive. This page shows where we are today and what has been agreed.'}</p>
  </header>

  <div class="cv-stats">
${stats}
  </div>

  ${hero}

  <h2 class="cv-h2">${hr ? 'Valovi' : 'Waves'}</h2>
  <p class="cv-p">${hr
    ? 'Deset valova pokriva šest kontinenata i sve zemlje svijeta. Prvi val je javan; ostali su plan, ne objava.'
    : 'Ten waves cover six continents and every country in the world. The first wave is live; the rest are a plan, not a publication.'}</p>
${waves}

  <h2 class="cv-h2">${hr ? 'Sve zemlje, po kontinentima' : 'Every country, by continent'}</h2>
  <p class="cv-p">${hr
    ? 'Popis je potpun: 193 države članice Ujedinjenih naroda te Sveta Stolica i Palestina. Uz svaku zemlju stoji prijestolnica iz koje se pokriva, jezik izdanja i status — javno ili val u kojem se otvara. Kad izdanje ispuni četiri uvjeta, status se mijenja sam, u istom ciklusu.'
    : 'The list is complete: the 193 member states of the United Nations plus the Holy See and Palestine. Each country carries the capital it is covered from, the edition language and its status — live, or the wave in which it opens. When an edition meets the four requirements, the status changes by itself, in the same cycle.'}</p>
  <p class="cv-legend">${hr
    ? 'Status „javno” znači da adresa postoji, ima sitemap i feed te barem jedan stvarni zapis. Status „val” znači da je zemlja u planu, ali stranica još ne postoji — prazna stranica se ne objavljuje.'
    : 'A “live” status means the address exists, has a sitemap and feed, and at least one real record. A “wave” status means the country is planned but the page does not exist yet — an empty page is not published.'}</p>
${countryTables}

  <h2 class="cv-h2">${hr ? 'Po kontinentima' : 'By continent'}</h2>
  <div class="cv-stats">
${continentRows}
  </div>

  <h2 class="cv-h2">${hr ? 'Što grad mora imati prije objave' : 'What a city must have before publication'}</h2>
  <ul class="cv-req">
${requirements}
  </ul>

  <p class="cv-note">${hr
    ? `Brojke na ovoj stranici računaju se iz channels.json i plana valova, ne upisuju se rukom. Kad se doda izdanje, mijenjaju se i brojke — u istom ciklusu. Plan trenutno pokriva ${data.total.countries} zemalja; to nije tvrdnja da su sve objavljene.`
    : `The numbers on this page are computed from channels.json and the wave plan, not typed by hand. When an edition is added, the numbers change in the same cycle. The plan currently covers ${data.total.countries} countries; that is not a claim that all of them are published.`}</p>

  <nav class="cv-links">
    <a href="/izdanja/">${hr ? 'Sva izdanja' : 'All editions'}</a>
    <a href="/mreza/">${hr ? 'Mreža' : 'Network'}</a>
    <a href="/gnk-aktual/">AKTUAL MEDIA</a>
    <a href="/nermin-sefic/">Nermin Sefić</a>
    <a href="${other}" hreflang="${hr ? 'en' : 'hr'}">${hr ? 'English' : 'Hrvatski'}</a>
  </nav>
</div>
</body>
</html>
`;
}

const outputs = [
  [join(PORTAL, 'pokrivenost', 'index.html'), page('hr')],
  [join(PORTAL, 'en', 'coverage', 'index.html'), page('en')]
];

for (const [file, html] of outputs) {
  if (CHECK) {
    if (!existsSync(file)) {
      console.error(`::error::nedostaje ${file}`);
      process.exit(1);
    }
    const current = readFileSync(file, 'utf8');
    if (!current.includes(`data.live.editions`) && current.replace(/\s+/g, '') !== html.replace(/\s+/g, '')) {
      /* Sadržaj se mijenja sa svakom promjenom brojki — provjera traži da
         stranica postoji i da nosi iste brojke kao JSON. */
      if (!current.includes(`<b>${data.live.editions}</b>`)) {
        console.error(`::error::${file} nema svježe brojke (${data.live.editions} izdanja)`);
        process.exit(1);
      }
    }
    continue;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, artStylesheet(html));
}

console.log(CHECK
  ? `POKRIVENOST (stranica) — obje stranice postoje i nose svježe brojke.`
  : `POKRIVENOST (stranica) — /pokrivenost/ i /en/coverage/ izgrađene (${data.live.editions} izdanja, ${data.total.countries} zemalja u planu).`);
