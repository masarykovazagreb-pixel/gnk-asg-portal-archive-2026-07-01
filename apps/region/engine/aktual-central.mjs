#!/usr/bin/env node
/**
 * AKTUAL MEDIA — središnji pregled (pločice 3×3).
 *
 * Gradi veliki blok na /gnk-aktual/ koji na jednom mjestu pokazuje sve što
 * AKTUAL MEDIA ima. Pločice su prave naslovnice: naziv izdanja, zemlja, jezik
 * i rečenica "što klikom dobijete" ispisani su u samoj slici (tiles.mjs), a
 * isti tekst stoji u alt atributu i aria-labelu, pa je čitljiv i strojevima.
 *
 *  01  Izdanja po zemljama   — 3 × 3 (gradovi mreže + BUSINESS TJEDNIK)
 *  02  Deskovi i platforme   — 3 × 3 (sport, politika, sigurnost, business,
 *                                 tehnologija, moda, galerija, radio, znanje)
 *  03  MRAVINJAK             — rijeka vijesti 3 × 19 iz svih kanala
 *
 * Blok se ubacuje između markera i ne dira ostatak stranice.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, shortDate, truncate, themeFor } from './lib.mjs';
import { CHANNELS, HUB } from './build.mjs';
import { logoFor, logoAlternate, logoJsonLd } from './brand.mjs';
import { deskArt, deskArtPath } from './desk-art.mjs';
import { chromeOf } from '../src/chrome.mjs';

/* Broj jezika se računa iz channels.json, ne prepisuje u tekst: kad se doda
   izdanje na novom jeziku, naslov i opis ne smiju ostati na starom broju. */
const LANG_COUNT = new Set(CHANNELS.map((c) => c.lang)).size;
const HR_SMALL = { 5: 'pet', 6: 'šest', 7: 'sedam', 8: 'osam', 9: 'devet', 10: 'deset', 11: 'jedanaest', 12: 'dvanaest', 13: 'trinaest', 14: 'četrnaest', 15: 'petnaest', 16: 'šesnaest', 17: 'sedamnaest', 18: 'osamnaest', 19: 'devetnaest', 20: 'dvadeset' };
const hrCount = (n) => HR_SMALL[n] || String(n);

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const ROOT = join(APP, '..', '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const DATA = join(APP, 'data');
const FILE = join(PORTAL, 'gnk-aktual', 'index.html');

const START = '<!-- AKTUAL-CENTRAL:START -->';
const SLOT = '<!-- AKTUAL-CENTRAL:SLOT -->';
const END = '<!-- AKTUAL-CENTRAL:END -->';
const IMG = '/assets/izdanja';

const readJSON = (path, fallback) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
};

/* Alt tekstovi = ono što na pločici piše, riječima. */
const CITY_ALT = {
  zagreb: 'AKTUAL MEDIA KANAL ZAGREB — Hrvatska, hrvatski. Dnevni pregled domaćih medija i deset provjerljivih tekstova. Klik otvara izdanje.',
  beograd: 'AKTUAL MEDIA KANAL BEOGRAD — Srbija, srpski. N1, Danas, Nova i Politika, osvrti s linkom na izvornik. Klik otvara izdanje.',
  sarajevo: 'AKTUAL MEDIA KANAL SARAJEVO — Bosna i Hercegovina, bosanski. N1 BiH, Klix, Oslobođenje i Avaz, politika i sigurnost regije. Klik otvara izdanje.',
  budimpesta: 'AKTUAL MEDIA KANAL BUDAPEST — Mađarska, mađarski. Telex, 444, HVG i Portfolio: proračun, inflacija, energetika. Klik otvara izdanje.',
  ljubljana: 'AKTUAL MEDIA KANAL LJUBLJANA — Slovenija, slovenski. Delo, Večer, 24ur i Slovenske novice: gospodarstvo i politika. Klik otvara izdanje.',
  rim: 'AKTUAL MEDIA KANAL ROMA — Italija, talijanski. ANSA, la Repubblica, Il Post e Il Sole 24 Ore: tržišta i EU. Klik otvara izdanje.',
  sofija: 'AKTUAL MEDIA KANAL SOFIJA — Bugarska, bugarski. BTA, Capital, Mediapool i Dnevnik: energetika i fondovi. Klik otvara izdanje.',
  bukurest: 'AKTUAL MEDIA KANAL BUCUREȘTI — Rumunjska, rumunjski. Agerpres, HotNews, Ziarul Financiar i Profit.ro: ekonomija. Klik otvara izdanje.',
  nairobi: 'AKTUAL MEDIA CHANNEL NAIROBI — Kenija, engleski. Daily Nation, The Standard, Capital FM i KBC: istočna Afrika, posao i sigurnost. Klik otvara izdanje.',
  jakarta: 'AKTUAL MEDIA KANAL JAKARTA — Indonezija, indonezijski. ANTARA, Kompas, Detik i Tempo: politika, gospodarstvo i kibernetika. Klik otvara izdanje.',
  newyork: 'AKTUAL MEDIA CHANNEL NEW YORK — SAD, engleski. The New York Times, NPR, Wall Street Journal i Bloomberg: tržišta, politika i tehnologija. Klik otvara izdanje.',
  saopaulo: 'AKTUAL MEDIA CANAL SÃO PAULO — Brazil, portugalski. Folha, G1, UOL i Exame: gospodarstvo, politika i sigurnost. Klik otvara izdanje.',
  sydney: 'AKTUAL MEDIA CHANNEL SYDNEY — Australija, engleski. ABC, Sydney Morning Herald, Guardian Australia i news.com.au: Pacifik, tržišta i klima. Klik otvara izdanje.',
  singapur: 'AKTUAL MEDIA CHANNEL SINGAPUR — Singapur, engleski. CNA, The Straits Times, Business Times i Mothership: trgovina, financije i regija. Klik otvara izdanje.',
  kairo: 'AKTUAL MEDIA KANAL KAIRO — Egipat, arapski. Mada Masr, Youm7 i Al-Masry Al-Youm: gospodarstvo, politika i sigurnost. Klik otvara izdanje.',
  tokio: 'AKTUAL MEDIA KANAL TOKIO — Japan, japanski. NHK, Asahi Shimbun, Mainichi i ITmedia: gospodarstvo, politika i tehnologija. Klik otvara izdanje.',
  peking: 'AKTUAL MEDIA KANAL PEKING — Kina, kineski. BBC 中文, DW 中文, 纽约时报中文网 i 中国新闻网: gospodarstvo, politika i tehnologija. Klik otvara izdanje.'
};

const DESK_ALT = {
  sport: `Sport — desk AKTUAL MEDIA s rezultatima i osvrtima iz svih ${CHANNELS.length} kanala. Klik otvara sportski desk.`,
  politika: `Politika — desk AKTUAL MEDIA: ista odluka u ${CHANNELS.length} zemalja ne izgleda jednako. Klik otvara politički desk.`,
  sigurnost: 'Sigurnost — desk AKTUAL MEDIA: obavještajne teme, kibernetika i preuzimanja. Klik otvara sigurnosni desk.',
  biznis: `Business — desk AKTUAL MEDIA: tržišta, bilance i kapital iz ${CHANNELS.length} zemalja. Klik otvara business desk.`,
  tehnologija: 'Tehnologija — desk AKTUAL MEDIA: umjetna inteligencija, platforme i podatkovni centri. Klik otvara tehnološki desk.',
  moda: 'Tjednik Mode — desk AKTUAL MEDIA: kolekcije, brendovi i poslovni modeli iza njih. Klik otvara modni desk.',
  putovanja: 'Putovanja — desk AKTUAL MEDIA: destinacije, sezona i cijena puta bez vodiča po narudžbi. Klik otvara putni desk.',
  ljubimci: 'Ljubimci — desk AKTUAL MEDIA: udomljavanje, veterinarska skrb i gradska pravila. Klik otvara desk ljubimaca.',
  svijet: 'Svijet — desk AKTUAL MEDIA: globalni okvir za lokalne odluke, od energije do migracija. Klik otvara desk Svijet.'
};

const HASHTAGS = [
  '#NerminSefić', '#NerminSefic', '#SeficNermin', '#SEFICNERMIN', '#AKTUALMEDIA', '#GNKASG', '#Našaizdanja',
  '#KanalZagreb', '#KanalBeograd', '#KanalSarajevo', '#KanalBudimpesta',
  '#KanalLjubljana', '#CanaleRoma', '#KanalSofija', '#CanalulBucuresti',
  '#BusinessTjednik', '#Moda', '#Sport', '#Politika', '#Sigurnost', '#Mravinjak'
];

const MODA_RE = /moda|modn|dizajn|stil|kolekcij|revij|fashion|brend|tkanin|obuć|obuc|nakladn/i;

function allItems() {
  const out = [];
  for (const channel of CHANNELS) {
    const data = readJSON(join(DATA, `${channel.id}.json`), { items: [] });
    for (const item of data.items || []) {
      if (!item?.title || !item?.slug) continue;
      out.push({ ...item, channel, theme: themeFor(`${item.title} ${item.summary}`).id });
    }
  }
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

const linkFor = (item) => `${item.channel.base}clanak/${item.slug}/`;

/* Pločica: cijela je link, tekst je u slici, alt i aria-label nose isto. */
function tile({ href, img, alt, external = false, badge = '', small = false, sub = null }) {
  const rel = external ? ' rel="external noopener"' : '';
  const foot = sub
    ? `<div class="amc-tile-foot"><span>${esc(sub.label)}</span><a href="${esc(sub.href)}"${rel}>${esc(sub.cta)} →</a></div>`
    : '';
  return `<li class="amc-tile${small ? ' amc-tile--small' : ''}">
    <a class="amc-tile-link" href="${esc(href)}"${rel} aria-label="${esc(alt)}">
      <img class="amc-tile-img" src="${/^(?:https?:)?\//.test(img) ? esc(img) : `${IMG}/${esc(img)}`}" alt="${esc(alt)}" width="880" height="587" loading="lazy" decoding="async">
      ${badge ? `<span class="amc-tile-badge">${esc(badge)}</span>` : ''}
      <span class="amc-tile-go" aria-hidden="true">→</span>
    </a>
    ${foot}
  </li>`;
}

const CITY_ALT_EN = {
  zagreb: 'AKTUAL MEDIA KANAL ZAGREB — Croatia, Croatian. A daily review of domestic media and ten verifiable stories. Click opens the edition.',
  beograd: 'AKTUAL MEDIA KANAL BELGRADE — Serbia, Serbian. N1, Danas, Nova and Politika, reviews with a link to the original. Click opens the edition.',
  sarajevo: 'AKTUAL MEDIA KANAL SARAJEVO — Bosnia and Herzegovina, Bosnian. N1 BiH, Klix, Oslobođenje and Avaz, politics and security in the region. Click opens the edition.',
  budimpesta: 'AKTUAL MEDIA KANAL BUDAPEST — Hungary, Hungarian. Telex, 444, HVG and Portfolio: budget, inflation, energy. Click opens the edition.',
  ljubljana: 'AKTUAL MEDIA KANAL LJUBLJANA — Slovenia, Slovenian. Delo, Večer, 24ur and Slovenske novice: economy and politics. Click opens the edition.',
  rim: 'AKTUAL MEDIA KANAL ROMA — Italy, Italian. ANSA, la Repubblica, Il Post and Il Sole 24 Ore: markets and the EU. Click opens the edition.',
  sofija: 'AKTUAL MEDIA KANAL SOFIJA — Bulgaria, Bulgarian. BTA, Capital, Mediapool and Dnevnik: energy and funds. Click opens the edition.',
  bukurest: 'AKTUAL MEDIA KANAL BUCUREȘTI — Romania, Romanian. Agerpres, HotNews, Ziarul Financiar and Profit.ro: the economy. Click opens the edition.',
  nairobi: 'AKTUAL MEDIA CHANNEL NAIROBI — Kenya, English. Daily Nation, The Standard, Capital FM and KBC: East Africa, business and security. Click opens the edition.',
  jakarta: 'AKTUAL MEDIA KANAL JAKARTA — Indonesia, Indonesian. ANTARA, Kompas, Detik and Tempo: politics, economy and cyber. Click opens the edition.',
  newyork: 'AKTUAL MEDIA CHANNEL NEW YORK — United States, English. The New York Times, NPR, The Wall Street Journal and Bloomberg: markets, politics and technology. Click opens the edition.',
  saopaulo: 'AKTUAL MEDIA CANAL SÃO PAULO — Brazil, Portuguese. Folha, G1, UOL and Exame: economy, politics and public security. Click opens the edition.',
  sydney: 'AKTUAL MEDIA CHANNEL SYDNEY — Australia, English. ABC, The Sydney Morning Herald, Guardian Australia and news.com.au: the Pacific, markets and climate. Click opens the edition.',
  singapur: 'AKTUAL MEDIA CHANNEL SINGAPUR — Singapore, English. CNA, The Straits Times, The Business Times and Mothership: trade, finance and the region. Click opens the edition.',
  kairo: 'AKTUAL MEDIA KANAL KAIRO — Egypt, Arabic. Mada Masr, Youm7 and Al-Masry Al-Youm: economy, politics and security. Click opens the edition.',
  tokio: 'AKTUAL MEDIA KANAL TOKIO — Japan, Japanese. NHK, Asahi Shimbun, Mainichi and ITmedia: economy, politics and technology. Click opens the edition.',
  peking: 'AKTUAL MEDIA KANAL PEKING — China, Chinese. BBC Chinese, DW Chinese, NYT Chinese and China News: economy, politics and technology. Click opens the edition.'
};

function cityTiles(cards, lang = 'hr') {
  const en = lang === 'en';
  return CHANNELS.map((c) => {
    const card = cards.find((x) => x.id === c.id) || {};
    return tile({
      href: c.base, img: `${c.id}-tile.webp`,
      alt: (en ? CITY_ALT_EN[c.id] : CITY_ALT[c.id]) || `${c.title} — ${en ? 'click opens the edition.' : 'klik otvara izdanje.'}`,
      external: true, badge: card.count ? `${card.count} ${en ? 'stories' : 'tekstova'}` : '',
      sub: {
        href: `${c.base}mravinjak/`,
        label: en ? 'News anthill' : 'Mravinjak',
        cta: card.count ? (en ? `all ${card.count} headlines` : `svih ${card.count} naslova`) : (en ? 'all headlines' : 'svi naslovi')
      }
    });
  }).join('');
}

function deskTiles(items, gallery, lang = 'hr') {
  const DESK_RE = {
    moda: MODA_RE,
    putovanja: /putovanj|turiz|hotel|destinacij|plaž|plaz|letov|krstar|aviokart|aerodrom|viza|izlet|advent|sezon|gostiju|noćenj|nocenj|kampu|kamp|planinar|bicikl|vlak|trajekt/i,
    ljubimci: /ljubimc|kućni ljubim|kucni ljubim|veterinar|udomlj|životinj|zivotinj|azil|kinolog|pas\b|psa\b|pse\b|psima|mačk|mack|ptic|akvarij|čipir|cipir|steriliz/i,
    svijet: /svijet|svet\b|global|europ|\beu\b|nato|kijev|ukrajin|gaza|izrael|iran|\bsad\b|amerik|kina|kinesk|rusij|moskv|trump|putin|migracij|klim|opec|naft|tarif|carin|vijeće sigurnosti/i
  };
  const count = (id) => DESK_RE[id]
    ? items.filter((i) => DESK_RE[id].test(`${i.title} ${i.summary}`)).length
    : items.filter((i) => i.theme === ({ sport: 'sport', politika: 'politika', sigurnost: 'sigurnost', biznis: 'ekonomija', tehnologija: 'ai' }[id] || '')).length;
  const en = lang === 'en';
  const DESK_ALT_EN = {
    sport: `Sport — an AKTUAL MEDIA desk with results and reviews from all ${CHANNELS.length} channels. Click opens the sport desk.`,
    politika: `Politics — an AKTUAL MEDIA desk: the same decision does not look the same in ${CHANNELS.length} countries. Click opens the politics desk.`,
    sigurnost: 'Security — an AKTUAL MEDIA desk: intelligence topics, cyber and takeovers. Click opens the security desk.',
    biznis: `Business — an AKTUAL MEDIA desk: markets, balance sheets and capital from ${CHANNELS.length} countries. Click opens the business desk.`,
    tehnologija: 'Technology — an AKTUAL MEDIA desk: artificial intelligence, platforms and data centres. Click opens the technology desk.',
    moda: 'Mode Weekly — an AKTUAL MEDIA desk: collections, brands and the business models behind them. Click opens the mode desk.',
    putovanja: 'Travel — an AKTUAL MEDIA desk: destinations, season and the real cost of the trip. Click opens the travel desk.',
    ljubimci: 'Pets — an AKTUAL MEDIA desk: adoption, veterinary care and city rules. Click opens the pets desk.',
    svijet: 'World — an AKTUAL MEDIA desk: the global frame for local decisions, from energy to migration. Click opens the world desk.'
  };
  const desks = ['sport', 'politika', 'sigurnost', 'biznis', 'tehnologija', 'moda', 'putovanja', 'ljubimci', 'svijet'].map((id) => tile({
    /* Naslovnica deska je ilustracija iz /assets/desk/art/ — ista slika kao
       na /izdanja/ i u heroju deska, pa se izdanje prepoznaje na svakom ulazu. */
    href: `/izdanja/${id}/`, img: deskArt(id) ? deskArtPath(id, '800') : `${id}-tile.webp`, alt: en ? DESK_ALT_EN[id] : DESK_ALT[id],
    badge: `${count(id)} ${en ? 'stories' : 'tekstova'}`
  })).join('');
  const extra = [
    { href: '/galerija/', img: 'galerija-tile.webp', alt: en ? `Nermin Sefić gallery — ${gallery.count || 63} pages of portraits and visuals. Click opens the gallery.` : `Galerija Nermina Sefića — ${gallery.count || 63} stranica s portretima i vizualima. Klik otvara galeriju.`, badge: `${gallery.count || 63} ${en ? 'pages' : 'stranica'}` },
    { href: '/radio/', img: 'radio-tile.webp', alt: en ? `AKTUAL MEDIA RADIO — a discreet player and a list of public radio stations from ${CHANNELS.length} countries. Click opens the radio.` : `AKTUAL MEDIA RADIO — diskretni player i popis javnih radijskih kuća ${CHANNELS.length} zemalja. Klik otvara radio.`, badge: en ? `${CHANNELS.length} countries` : `${CHANNELS.length} zemalja` },
    { href: '/knowledge-center/', img: 'znanje-tile.webp', alt: en ? 'Knowledge Center — answers about the group, projects and finances with a link to the document. Click opens the Knowledge Center.' : 'Centar znanja — odgovori o grupi, projektima i financijama s poveznicom na dokument. Klik otvara centar znanja.', badge: en ? 'answers' : 'odgovori' }
  ].map((x) => `<li class="amc-tile amc-tile--small">
      <a class="amc-tile-link amc-tile-link--text" href="${esc(x.href)}" aria-label="${esc(x.alt)}">
        <span class="amc-tile-kicker">AKTUAL MEDIA</span>
        <span class="amc-tile-name">${esc(x.alt.split(' — ')[0])}</span>
        <span class="amc-tile-text">${esc(x.alt.split(' — ')[1] || '')}</span>
        <span class="amc-tile-badge">${esc(x.badge)}</span>
        <span class="amc-tile-go" aria-hidden="true">→</span>
      </a>
    </li>`).join('');
  return desks + extra;
}

function riverColumn(items) {
  return `<ul class="amc-river-col">${items.map((item) => `<li>
      <time datetime="${esc(item.date)}">${esc(shortDate(item.date.slice(0, 10)))}</time>
      <a href="${esc(linkFor(item))}">${esc(truncate(item.title, 92))}</a>
      <span class="amc-river-src" title="${esc(item.channel.title)}">${esc(item.sourceName)} · ${esc(item.channel.city)}</span>
    </li>`).join('')}</ul>`;
}


/* ---------- NAŠA IZDANJA: krugovi na vrhu stranice ---------- */
/* Krugovi su prave fotografije gradova (bez teksta u slici), pa se grad
   prepoznaje na prvi pogled. Naziv i broj tekstova stoje ispod kruga, a
   klik vodi na izdanje. Ispod je traka platformi. */

const CITY_SHORT = {
  zagreb: 'Zagreb', beograd: 'Beograd', sarajevo: 'Sarajevo', budimpesta: 'Budimpešta',
  ljubljana: 'Ljubljana', rim: 'Rim', sofija: 'Sofija', bukurest: 'Bukurešt',
  nairobi: 'Nairobi', jakarta: 'Jakarta', newyork: 'New York', saopaulo: 'São Paulo',
  sydney: 'Sydney', singapur: 'Singapur', kairo: 'Kairo', tokio: 'Tokio', peking: 'Peking'
};

const RAIL_TEXT = {
  hr: {
    label: 'Naša izdanja',
    lead: `${CHANNELS.length} gradskih kanala na ${new Set(CHANNELS.map((c) => c.lang)).size} jezika, BUSINESS TJEDNIK i TJEDNIK MODE. Klik vodi na izdanje, a s izdanja se uvijek vraćate gumbom <strong>← AKTUAL MEDIA</strong>.`,
    all: 'Sva izdanja ↓',
    platforms: 'Deskovi i platforme',
    aria: 'Naša izdanja — AKTUAL MEDIA kanali',
    open: 'otvori izdanje', texts: 'tekstova',
    names: ['Business Tjednik', 'Tjednik Mode', 'Sport', 'Politika', 'Sigurnost', 'Tehnologija', 'Putovanja', 'Ljubimci', 'Svijet', 'Business desk', 'Galerija', 'Radio']
  },
  en: {
    label: 'Our editions',
    lead: `${CHANNELS.length} city channels in ${new Set(CHANNELS.map((c) => c.lang)).size} languages, BUSINESS WEEKLY and FASHION WEEKLY. A click opens the edition; from every edition the <strong>← AKTUAL MEDIA</strong> button brings you back.`,
    all: 'All editions ↓',
    platforms: 'Desks and platforms',
    aria: 'Our editions — AKTUAL MEDIA channels',
    open: 'open edition', texts: 'stories',
    names: ['Business Weekly', 'Fashion Weekly', 'Sport', 'Politics', 'Security', 'Technology', 'Travel', 'Pets', 'World', 'Business desk', 'Gallery', 'Radio']
  }
};



/* ---------- ATLAS: naslovna grafika mreže ---------- */
/* Jedna ilustracija za cijelu maticu: noćni atlas svijeta sa zlatnim
   meridijanima. Stoji odmah ispod mastheada, prije navigacije rubrika, jer
   objašnjava što stranica jest prije nego što traži prvi klik. Alt i natpis
   dolaze iz jezičnog paketa (chrome.artAlt/artNote) — nikad se ne pišu u
   šabloni na jednom jeziku. */

const ATLAS_ART = (() => {
  try {
    return JSON.parse(readFileSync(join(PORTAL, 'data', 'atlas-art-v1.json'), 'utf8'));
  } catch { return null; }
})();

function withAtlas(page, lang) {
  const image = ATLAS_ART && ATLAS_ART.images.find((item) => item.slug === 'aktual-media-atlas');
  if (!image) return page;
  const chrome = chromeOf(lang);
  const en = lang === 'en';
  const alt = (image.alt && (image.alt[lang] || image.alt.en)) || '';
  const note = chrome.artNote || '';
  const block = `<!-- ATLAS:START -->
  <section class="am-atlas" aria-label="${en ? 'The network atlas' : 'Atlas mreže'}">
    <figure>
      <img src="${image.src}" srcset="${image.src.replace('-1600', '-800')} 800w, ${image.src} 1600w" sizes="(max-width: 900px) 100vw, 1280px" alt="${esc(alt)}" width="${image.width}" height="${image.height}" loading="eager" decoding="async" fetchpriority="high">
      <figcaption>
        <span class="am-atlas-k">${en ? 'One centre, every address' : 'Jedno središte, sve adrese'}</span>
        <span class="am-atlas-t">${esc(note)}</span>
        <span class="am-atlas-l"><a href="/mreza/">${en ? 'The spider web' : 'Paukova mreža'} →</a> · <a href="${en ? '/en/capitals/' : '/glavni-gradovi/'}">${en ? 'Capitals' : 'Glavni gradovi'} →</a> · <a href="/izdanja/">${en ? 'All editions' : 'Sva izdanja'} →</a></span>
      </figcaption>
    </figure>
  </section>
  <!-- ATLAS:END -->`;
  const css = `<style>/* atlas mreže */
.am-atlas{margin:0;padding:0;background:#04080f}
.am-atlas figure{margin:0;position:relative}
.am-atlas img{display:block;width:100%;height:auto;max-height:min(58vh,520px);object-fit:cover;object-position:center 42%}
.am-atlas figcaption{position:relative;display:flex;flex-wrap:wrap;gap:6px 18px;align-items:baseline;justify-content:space-between;padding:10px clamp(14px,4vw,44px);background:linear-gradient(180deg,#04080f,rgba(4,8,15,.92));color:#e7ecf3;font:600 11.5px/1.5 system-ui,sans-serif}
.am-atlas-k{font:800 10.5px/1 system-ui;letter-spacing:.2em;text-transform:uppercase;color:#e0bd69}
.am-atlas-t{color:#9aabbf;font-weight:500;max-width:56ch}
.am-atlas-l a{color:#e0bd69;text-decoration:none;border-bottom:1px solid rgba(224,189,105,.35)}
.am-atlas-l a:hover{border-color:#e0bd69}
@media (max-width:620px){.am-atlas img{max-height:240px}.am-atlas-t{display:none}}</style>`;
  let out = page;
  if (out.includes('<!-- ATLAS:START -->')) {
    out = out.replace(/<!-- ATLAS:START -->[\s\S]*?<!-- ATLAS:END -->/, block);
  } else {
    const at = out.indexOf('<nav class="am-sectionnav"');
    if (at > 0) out = `${out.slice(0, at)}${block}\n\n  ${out.slice(at)}`;
  }
  /* Navigacija rubrika dobiva put do prijestolnica — jednom, bez duplikata. */
  const capHref = en ? '/en/capitals/' : '/glavni-gradovi/';
  if (!out.includes(`href="${capHref}"`) && out.includes('<nav class="am-sectionnav"')) {
    const navRe = en
      ? /(<a href="\/en\/gnk-aktual\/network\/">[^<]*<\/a>)/
      : /(<a href="\/gnk-aktual\/mreza\/">[^<]*<\/a>)/;
    out = out.replace(navRe, `$1<a href="${capHref}">${en ? 'Capitals' : 'Glavni gradovi'}</a>`);
  }
  if (!out.includes('.am-atlas figcaption')) {
    out = out.includes('</head>') ? out.replace('</head>', `${css}\n</head>`) : `${css}\n${out}`;
  }
  return out;
}

/* ---------- "prije X" iz stvarnog datuma objave ---------- */

function agoShort(iso, generated = new Date().toISOString()) {
  if (!iso) return '';
  const diff = Date.parse(generated) - Date.parse(iso);
  if (!Number.isFinite(diff) || diff < 0) return '';
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'prije < 1 h';
  if (h < 48) return `prije ${h} h`;
  const d = Math.floor(h / 24);
  return `prije ${d} d`;
}

/* ---------- karta regije: drugi ulaz u ista izdanja ---------- */

const GEO = {
  ljubljana: [14.51, 46.06], zagreb: [15.98, 45.81], budimpesta: [19.04, 47.50],
  beograd: [20.46, 44.79], sarajevo: [18.41, 43.86], rim: [12.50, 41.90],
  sofija: [23.32, 42.70], bukurest: [26.10, 44.43]
};

const AMM_C = {
  zagreb: '#e9c66c', beograd: '#7fb2ff', sarajevo: '#7ee0a1', budimpesta: '#ff9f6e',
  ljubljana: '#c79bff', rim: '#ff7d7d', sofija: '#6fe0d6', bukurest: '#f2a8d0',
  nairobi: '#8fe0a8', jakarta: '#79c7ff', newyork: '#8ab4ff', saopaulo: '#8ddf8d',
  sydney: '#74d9e0', singapur: '#79e0c8', kairo: '#f0b27a', tokio: '#f2a0c0', peking: '#f08a8a'
};

function networkPodium(circles, cards, lang = 'hr') {
  /* Mreža izdanja: krugovi gore, obojene žice, pa pravokutnik s kartom,
     stanicama i osam kartica — sve u istoj plohi. */
  const EN = lang === 'en';
  const W = 1000, H = 156;
  const lons = Object.values(GEO).map((g) => g[0]);
  const lats = Object.values(GEO).map((g) => g[1]);
  const [x0, x1] = [Math.min(...lons) - 2.2, Math.max(...lons) + 2.2];
  const [y0, y1] = [Math.min(...lats) - 0.7, Math.max(...lats) + 0.7];
  const px = (lon) => 78 + ((lon - x0) / (x1 - x0)) * (W - 156);
  const py = (lat) => H - 40 - ((lat - y0) / (y1 - y0)) * (H - 86);

  /* Karta je europska, pa na njoj stoje samo europska izdanja. Svjetska
     izdanja imaju svoj blok ispod — karta koja bi ih nacrtala preko Europe
     lagala bi o zemljopisu. */
  const mapped = CHANNELS.filter((c) => GEO[c.id]);
  const offMap = CHANNELS.filter((c) => !GEO[c.id]).map((c) => CITY_SHORT[c.id] || c.city);
  const counted = mapped.map((c) => ({ c, count: (cards.find((x) => x.id === c.id) || {}).count || 0 }));
  const total = counted.reduce((sum, x) => sum + x.count, 0);
  const max = Math.max(1, ...counted.map((x) => x.count));
  const nf = (n) => n.toLocaleString('hr-HR');
  const color = (c) => AMM_C[c.id] || '#e9c66c';
  const rank = (i) => String(i + 1).padStart(2, '0');

  const pins = counted.map(({ c, count }, i) => {
    const g = GEO[c.id];
    if (!g) return '';
    const cx = px(g[0]).toFixed(1), cy = py(g[1]).toFixed(1);
    const city = CITY_SHORT[c.id] || c.city;
    return `<a class="amm-pin" href="${esc(c.base)}" style="--c:${color(c)}" aria-label="${esc(c.title)} — ${count} ${EN ? 'stories' : 'tekstova'} — ${EN ? 'open edition' : 'otvori izdanje'}">
      <circle class="amm-halo" cx="${cx}" cy="${cy}" r="11"></circle>
      <circle class="amm-dot" cx="${cx}" cy="${cy}" r="4.6"></circle>
      <text class="amm-pin-n" x="${cx}" y="${(Number(cy) + 20).toFixed(1)}" text-anchor="middle">${esc(CITY_SHORT[c.id] || c.city)}</text>
      <title>${esc(city)} — ${esc(c.title)} · ${count} ${EN ? 'stories' : 'tekstova'}</title>
    </a>`;
  }).join('');

  /* Zlatna ruta ide zapad → istok kroz sve gradove, s odvojkom iz Colorada. */
  const route = [...counted].sort((a, b) => (GEO[a.c.id]?.[0] ?? 0) - (GEO[b.c.id]?.[0] ?? 0))
    .map(({ c }) => GEO[c.id]).filter(Boolean)
    .map((g) => `${px(g[0]).toFixed(1)},${py(g[1]).toFixed(1)}`).join(' L ');
  const first = [...counted].sort((a, b) => (GEO[a.c.id]?.[0] ?? 0) - (GEO[b.c.id]?.[0] ?? 0)).find((x) => GEO[x.c.id]);

  const wires = counted.map(({ c }) => `<span style="--c:${color(c)}"></span>`).join('');
  const stations = counted.map(({ c }, i) => `<li style="--c:${color(c)}"><span>${rank(i)}</span></li>`).join('');
  const tiles = counted.map(({ c, count }, i) => {
    const city = CITY_SHORT[c.id] || c.city;
    const bar = Math.round((count / max) * 100);
    return `<a class="amm-card" href="${esc(c.base)}" style="--c:${color(c)}" aria-label="${esc(c.title)} — ${count} ${EN ? 'stories' : 'tekstova'} — ${EN ? 'open edition' : 'otvori izdanje'}">
      <span class="amm-card-k">${rank(i)}</span>
      <b>${esc(city)}</b>
      <span class="amm-card-c">${nf(count)}</span>
      <span class="amm-bar" aria-hidden="true"><span style="width:${bar}%"></span></span>
      <span class="amm-card-l">${esc(c.lang)} · ${esc(c.country)}</span>
      <span class="amm-card-go">${EN ? 'open' : 'otvori'} →</span>
    </a>`;
  }).join('');

  const rainbow = counted.map(({ c }) => color(c)).join(',');
  const label = EN ? 'Network map — pick a city' : 'Karta mreže — odaberi grad';
  const cityCount = counted.filter((x) => x.count).length;

  return `<div class="amx-podium">
  <ul class="amx-row">${circles}</ul>
  <div class="amx-wires" aria-hidden="true">${wires}</div>
  <section class="amm" aria-label="${esc(label)}" style="--amm-rainbow:linear-gradient(90deg,${rainbow})">
    <span class="amm-rainbow" aria-hidden="true"></span>
    <div class="amm-top">
      <span class="amm-flag">${EN ? 'Network' : 'Karta mreže'}</span>
      <p class="amm-count"><b>${nf(total)}</b> ${EN ? 'stories' : 'tekstova'} <span>·</span> <b>${cityCount}</b> ${EN ? 'European cities on the map' : 'europskih gradova na karti'} <span>·</span> <b>${mapped.length}</b> ${EN ? 'languages on the map' : 'jezika na karti'} <span>·</span> <b>${CHANNELS.length}</b> ${EN ? 'editions in total' : 'izdanja ukupno'}</p>
      <a class="amm-origin" href="/usa/"><span class="amm-gem" aria-hidden="true"></span>${EN ? 'Origin: GNK DINAMO Ltd. · Colorado, USA' : 'Ishodište: GNK DINAMO Ltd. · Colorado, USA'} <b>→</b></a>
    </div>
    <figure class="amm-route">
      <svg class="amm-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="ammSea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#13293f"/><stop offset=".55" stop-color="#0a1a2b"/><stop offset="1" stop-color="#06101a"/></linearGradient>
          <radialGradient id="ammGlow" cx="0" cy="0" r="1" gradientTransform="translate(${px(GEO.rim[0]).toFixed(1)} ${py(GEO.rim[1]).toFixed(1)}) rotate(20) scale(230)"><stop offset="0" stop-color="rgba(255,125,125,.22)"/><stop offset="1" stop-color="rgba(255,125,125,0)"/></radialGradient>
        </defs>
        <rect width="${W}" height="${H}" fill="url(#ammSea)"></rect>
        <rect width="${W}" height="${H}" fill="url(#ammGlow)"></rect>
        ${[...Array(4)].map((_, i) => `<line x1="16" y1="${((i + 1) * H) / 5}" x2="${W - 16}" y2="${((i + 1) * H) / 5}" stroke="rgba(255,255,255,.05)" stroke-dasharray="1 6"></line>`).join('')}
        ${[...Array(11)].map((_, i) => `<line x1="${((i + 1) * W) / 12}" y1="12" x2="${((i + 1) * W) / 12}" y2="${H - 12}" stroke="rgba(255,255,255,.04)" stroke-dasharray="1 6"></line>`).join('')}
        <path d="M 34 40 C 90 62, ${(px(GEO[first.c.id][0]) * 0.55).toFixed(1)} ${(py(GEO[first.c.id][1]) * 0.85).toFixed(1)}, ${px(GEO[first.c.id][0]).toFixed(1)} ${py(GEO[first.c.id][1]).toFixed(1)}" fill="none" stroke="rgba(245,217,138,.55)" stroke-width="1.3" stroke-dasharray="3 5"></path>
        <path d="M ${route}" fill="none" stroke="rgba(233,198,108,.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
        <g class="amm-co" aria-hidden="true"><rect x="10" y="28" width="48" height="22" rx="11"></rect><text x="34" y="43" text-anchor="middle">CO · USA</text></g>
        ${pins}
      </svg>
      <figcaption class="amm-legend"><span class="amm-gem" aria-hidden="true"></span>${EN ? 'gold line = network route · colour = edition · click opens the channel' : 'zlatna linija = ruta mreže · boja = izdanje · klik vodi na kanal'}</figcaption>
    </figure>
    <ol class="amm-stations" aria-hidden="true">${stations}</ol>
    <div class="amm-grid">${tiles}</div>
    <div class="amm-homebar">
      <a class="amm-home" href="/usa/">
        <span class="amm-home-k">${EN ? 'Project origin' : 'Ishodište projekta'}</span>
        <b>GNK DINAMO Ltd.</b>
        <span class="amm-home-loc">Boulder, Colorado, USA</span>
        <span class="amm-home-go">${EN ? 'Open origin page' : 'Otvori stranicu ishodišta'} →</span>
      </a>
      <p class="amm-note">${EN
        ? `${mapped.length} European cities are drawn on this map; the other ${offMap.length} editions — ${offMap.join(', ')} — have their own blocks below. Every card opens the edition; every edition returns here.`
        : `${mapped.length} europskih gradova nacrtano je na ovoj karti; ostalih ${offMap.length} izdanja — ${offMap.join(', ')} — imaju vlastite blokove ispod. Svaka kartica otvara izdanje, a svako izdanje vraća ovamo.`}</p>
    </div>
    <div class="amm-foot">
      <a href="/kanal/">${EN ? 'All channels' : 'Svi kanali'} (${CHANNELS.length}) →</a>
      <a href="/izdanja/">${EN ? 'All editions' : 'Sva izdanja'} →</a>
      <a href="/radio/">Radio →</a>
      <a href="/top-teme/">${EN ? 'Top topics' : 'Top teme'} →</a>
      <a href="/medijska-kritika/">${EN ? 'Media critique' : 'Kritika medija'} →</a>
      <a class="amm-w43" href="https://gnk-asg-tjednik.pages.dev/tjednik/2026-W43/">Tjednik 2026-W43 →</a>
      <a href="/usa/">USA →</a>
      <span class="amm-foot-note">${EN ? `USA → region → ${CHANNELS.length} cities` : `USA → regija → ${CHANNELS.length} gradova`}</span>
    </div>
    <ul class="amm-tags" aria-label="${EN ? 'Tags' : 'Oznake'}">
      <li class="amm-tags-k">${EN ? 'Tags' : 'Oznake'}</li>
      <li><a href="/nermin-sefic/">#NerminSefić</a></li>
      <li><a href="/nermin-sefic/">#NerminSefic</a></li>
      <li><a href="/autorske-objave/">#SeficNermin</a></li>
      <li><a href="/autorske-objave/">#SEFICNERMIN</a></li>
      <li><a href="/nermin-sefic/">#UrednikNerminSefić</a></li>
      <li><a href="/gnk-aktual/">#AKTUALMEDIA</a></li>
      <li><a href="/kanal/">#GNKASG</a></li>
      <li><a href="https://gnk-asg-tjednik.pages.dev/tjednik/2026-W43/">#TjednikW43</a></li>
    </ul>
  </section>
</div>`;
}

function homeRail(cards, moda, lang = 'hr') {
  const T = RAIL_TEXT[lang] || RAIL_TEXT.hr;
  const generatedAt = new Date().toISOString();
  const circles = CHANNELS.map((c, i) => {
    const card = cards.find((x) => x.id === c.id) || {};
    const city = CITY_SHORT[c.id] || c.city;
    const count = card.count || 0;
    return `<li class="amx-item">
      <a class="amx-link" href="${esc(c.base)}" rel="external noopener" aria-label="${esc(c.title)} — ${esc(c.country)} — ${count} ${esc(T.texts)} — ${esc(T.open)}">
        <span class="amx-ring"><img src="${IMG}/${esc(c.id)}-440.webp" srcset="${IMG}/${esc(c.id)}-240.webp 240w, ${IMG}/${esc(c.id)}-440.webp 440w" sizes="(max-width:620px) 84px,(max-width:1040px) 22vw,11vw" alt="${esc(c.title)} — ${esc(city)}, ${esc(c.country)}" width="440" height="440" loading="${i < 2 ? 'eager' : 'lazy'}" fetchpriority="${i === 0 ? 'high' : 'auto'}" decoding="async">${count ? `<span class="amx-badge">${count}</span>` : ''}</span>
        <b>${esc(city)}</b>
        <span class="amx-line" style="--c:${AMM_C[c.id] || '#e9c66c'}" aria-hidden="true"></span>
        <small>${esc(c.lang)} · ${esc(c.country)}</small>
        <em class="amx-ago">${esc(agoShort(card.lastItemAt, generatedAt))}</em>
      </a>
    </li>`;
  }).join('');

  const platforms = [
    ['https://gnk-asg-tjednik.pages.dev/', 'Business Tjednik'],
    [`${HUB}moda/`, 'Tjednik Mode'],
    [`${HUB}sport/`, 'Sport'],
    [`${HUB}politika/`, 'Politika'],
    [`${HUB}sigurnost/`, 'Sigurnost'],
    [`${HUB}tehnologija/`, 'Tehnologija'],
    [`${HUB}putovanja/`, 'Putovanja'],
    [`${HUB}ljubimci/`, 'Ljubimci'],
    [`${HUB}svijet/`, 'Svijet'],
    [`${HUB}biznis/`, 'Business desk'],
    ['https://gnk-asg.hr/galerija/', 'Galerija'],
    ['https://gnk-asg.hr/radio/', 'Radio']
  ].map(([href], i) => `<a href="${esc(href)}"${href.startsWith('http') ? ' rel="external noopener"' : ''}>${esc(T.names[i])}</a>`).join('');

  return `<style id="amx-style">.amx{margin:26px 0 0;background:#fffdf8;border:1px solid #d8d3c7;border-top:6px solid #111;scroll-margin-top:64px}
.amx-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:12px 18px;border-bottom:1px solid #d8d3c7}
.amx-flag{background:#d71920;color:#fff;font:900 11px/1 Inter,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;padding:9px 12px;white-space:nowrap}
.amx-head p{margin:0;font:400 12.5px/1.45 Georgia,serif;color:#332f28;max-width:70ch}
.amx-head p strong{font-family:system-ui,sans-serif;font-size:11.5px;letter-spacing:.04em;white-space:nowrap}
.amx-all{margin-left:auto;font:900 10.5px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;border-bottom:2px solid #d71920;padding-bottom:4px;white-space:nowrap}
.amx-all:hover{color:#d71920}
.amx-row{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;list-style:none;margin:0;padding:16px 18px 6px}
.amx-item{min-width:0}
.amx-link{display:grid;justify-items:center;gap:7px;text-align:center;text-decoration:none}
.amx-ring{position:relative;display:block;width:100%;aspect-ratio:1;border-radius:50%;padding:4px;background:linear-gradient(140deg,#e9c66c,#b8862f 45%,#f3dfa8);box-shadow:0 10px 20px rgba(15,23,42,.22),0 2px 4px rgba(15,23,42,.12);transition:transform .22s ease,box-shadow .22s ease}
.amx-ring img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 38%;border-radius:50%;border:2px solid #fffdf8;filter:contrast(1.07) saturate(1.06)}
.amx-ring::after{content:"";position:absolute;inset:4px;border-radius:50%;pointer-events:none;box-shadow:inset 0 0 0 1px rgba(8,15,24,.20),inset 0 -16px 24px rgba(8,15,24,.16)}
.amx-badge{position:absolute;right:-2px;bottom:4px;background:#111;color:#e9c66c;font:800 9px/1 system-ui,sans-serif;letter-spacing:.02em;padding:4px 6px;border-radius:999px;border:2px solid #fffdf8}
.amx-link b{font:900 13px/1.05 Impact,"Arial Black",system-ui,sans-serif;letter-spacing:.01em;text-transform:uppercase;color:#0a0d12}
.amx-line{display:block;width:30px;height:3px;border-radius:3px;background:var(--c,#e9c66c);margin:1px auto 0;opacity:.9;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.amx-link small{font:700 9px/1.2 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#4b4638}
.amx-ago{font:700 8.5px/1.2 system-ui,sans-serif;font-style:normal;letter-spacing:.05em;color:#6d6555}
.amx-podium{position:relative;padding:2px 0 8px}
.amx-wires{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;padding:0 18px;height:24px;position:relative;z-index:2}
.amx-wires span{justify-self:center;width:2px;height:100%;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 25%,transparent),var(--c));position:relative}
.amx-wires span::after{content:"";position:absolute;left:50%;bottom:-3px;width:7px;height:7px;border-radius:50%;transform:translateX(-50%);background:var(--c);box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 20%,transparent)}
.amm{position:relative;border:1px solid #e3d9c3;border-top:3px solid #c8963c;border-radius:0 0 24px 24px;overflow:hidden;background:
radial-gradient(70% 120% at 0% 0%,rgba(233,198,108,.28),transparent 58%),
radial-gradient(60% 110% at 100% 0%,rgba(140,47,47,.09),transparent 60%),
linear-gradient(165deg,#fffefb 0%,#faf5e9 52%,#fffdf8 100%);
box-shadow:0 24px 50px rgba(31,38,48,.14)}
.amm::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:0;background:linear-gradient(120deg,rgba(255,255,255,.5),transparent 40%,rgba(255,255,255,.3) 75%,transparent)}
.amm-rainbow{position:absolute;left:0;right:0;top:0;height:4px;background:var(--amm-rainbow,#e9c66c);opacity:.85;z-index:3}
.amm-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:16px 18px 12px;border-bottom:1px solid #ece3d1;position:relative;z-index:1}
.amm-flag{background:linear-gradient(135deg,#f3dfa8,#e9c66c 45%,#c8963c);color:#141414;font:900 10px/1 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;padding:7px 11px;border-radius:999px;box-shadow:0 6px 14px rgba(200,150,60,.28)}
.amm-count{margin:0;font:700 11px/1.3 system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase;color:#514a3b}
.amm-count b{color:#171b21;font-size:13px}
.amm-count span{color:#b9af9a;margin:0 3px}
.amm-origin{margin-left:auto;display:inline-flex;align-items:center;gap:7px;font:800 10px/1 system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#8c2f2f;text-decoration:none;border:1px solid rgba(140,47,47,.35);border-radius:999px;padding:7px 12px;background:rgba(140,47,47,.06);transition:background .18s ease,color .18s ease,border-color .18s ease}
.amm-origin b{font-weight:900}
.amm-origin:hover{background:#8c2f2f;color:#fff;border-color:#8c2f2f}
.amm-gem{width:7px;height:7px;flex:0 0 auto;transform:rotate(45deg);background:linear-gradient(135deg,#f3dfa8,#c8963c);border-radius:1px;box-shadow:0 0 0 2px rgba(200,150,60,.16)}
.amm-route{position:relative;margin:12px 18px 0;border-radius:16px;overflow:hidden;border:1px solid #0b1a2b;background:#08131f;box-shadow:inset 0 0 40px rgba(0,0,0,.55),0 10px 24px rgba(11,26,43,.18)}
.amm-svg{display:block;width:100%;height:auto}
.amm-pin .amm-halo{fill:var(--c,#e9c66c);opacity:.18;transition:opacity .18s ease}
.amm-pin .amm-dot{fill:var(--c,#e9c66c);stroke:#061019;stroke-width:1.6}
.amm-pin .amm-pin-n{font:800 9px/1 system-ui,sans-serif;letter-spacing:.06em;fill:#e9e3d4;opacity:.72;paint-order:stroke;stroke:rgba(4,12,20,.75);stroke-width:2.4px}
.amm-pin:hover .amm-halo,.amm-pin:focus-visible .amm-halo{opacity:.5}
.amm-pin:hover .amm-dot{fill:#fff}
.amm-co rect{fill:#f5d98a}
.amm-co text{font:900 8px/1 system-ui,sans-serif;letter-spacing:.06em;fill:#0c1015}
.amm-legend{margin:0;display:flex;align-items:center;gap:7px;padding:7px 12px;font:700 9px/1.3 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#ece3cf;background:rgba(4,12,20,.68)}
.amm-stations{list-style:none;display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;margin:0;padding:12px 18px 0;position:relative}
.amm-stations::before{content:"";position:absolute;left:18px;right:18px;top:17px;height:2px;background:linear-gradient(90deg,#c8963c,#e9c66c 50%,#c8963c);opacity:.45}
.amm-stations li{display:grid;justify-items:center;gap:4px;position:relative;z-index:1}
.amm-stations li::before{content:"";width:9px;height:9px;border-radius:50%;background:var(--c);border:2px solid #fffdf8;box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 24%,transparent)}
.amm-stations li span{font:800 8px/1 system-ui,sans-serif;letter-spacing:.12em;color:#8a7f68}
.amm-grid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;padding:10px 18px 14px}
.amm-card{display:grid;gap:3px;padding:9px 9px 8px;border-radius:12px;text-decoration:none;color:#171b21;background:#fff;border:1px solid #e8dfcc;border-top:3px solid var(--c);transition:transform .16s ease,box-shadow .16s ease,background .16s ease}
.amm-card:hover,.amm-card:focus-visible{transform:translateY(-2px);box-shadow:0 10px 20px rgba(31,38,48,.12);background:color-mix(in srgb,var(--c) 9%,#fff)}
.amm-card-k{font:800 7.5px/1 system-ui,sans-serif;letter-spacing:.18em;color:#786f5d}
.amm-card b{font:900 11.5px/1.02 Impact,"Arial Black",system-ui,sans-serif;letter-spacing:.01em;text-transform:uppercase;color:#111}
.amm-card-c{font:800 15px/1 system-ui,sans-serif;color:#111;letter-spacing:-.01em}
.amm-card-l{font:700 7.5px/1.2 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#5b5445}
.amm-card .amm-bar{position:static;height:3px;margin:1px 0 1px;border-radius:3px;background:#eee6d4;overflow:hidden}
.amm-card .amm-bar span{display:block;height:100%;background:var(--c);opacity:.95}
.amm-card-go{font:800 8px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#8c2f2f;opacity:.9}
.amm-homebar{display:grid;grid-template-columns:minmax(0,320px) minmax(0,1fr);gap:14px;align-items:center;padding:0 18px 14px}
.amm-home{display:grid;gap:2px;padding:12px 14px;border-radius:16px;text-decoration:none;color:#171b21;background:linear-gradient(120deg,#fff8e4,#fdf1d2 65%,#fffdf8);border:1px solid rgba(200,150,60,.45);box-shadow:0 8px 18px rgba(200,150,60,.14);transition:transform .18s ease,box-shadow .18s ease}
.amm-home:hover{transform:translateY(-2px);box-shadow:0 16px 30px rgba(200,150,60,.22)}
.amm-home-k{font:800 8.5px/1 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#8a6a1f}
.amm-home b{font:900 15px/1.1 Georgia,serif;letter-spacing:.01em;color:#111}
.amm-home-loc{font:600 10px/1.3 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6b6558}
.amm-home-go{font:800 9.5px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#8c2f2f;margin-top:4px}
.amm-note{margin:0;font:400 12px/1.5 Georgia,serif;color:#5d574a;max-width:62ch}
.amm-foot{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:10px 18px 12px;border-top:1px solid #ece3d1;background:rgba(255,255,255,.55);position:relative;z-index:1}
.amm-foot a{font:800 9.5px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#8c2f2f;text-decoration:none;border-bottom:1px solid transparent}
.amm-foot a:hover{border-color:#8c2f2f}
.amm-tags{list-style:none;display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin:0;padding:0 18px 14px;position:relative;z-index:1}
.amm-tags-k{font:800 8.5px/1 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#786f5d;margin-right:2px}
.amm-tags a{display:inline-block;font:800 9.5px/1 system-ui,sans-serif;letter-spacing:.04em;text-decoration:none;color:#4a463d;background:color-mix(in srgb,#e9c66c 16%,#fff);border:1px solid color-mix(in srgb,#c8963c 40%,#e3d9c3);border-radius:999px;padding:5px 9px;transition:background .15s ease,color .15s ease}
.amm-tags a:hover{background:#8c2f2f;color:#fff;border-color:#8c2f2f}
.amm-w43{color:#111 !important;background:linear-gradient(135deg,#f3dfa8,#e9c66c);border-bottom:0 !important;border-radius:999px;padding:5px 9px}
.amm-w43:hover{background:#8c2f2f;color:#fff !important}
.amm-foot-note{margin-left:auto;font:700 9px/1 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#83795f}
@media(max-width:1040px){.amx-wires,.amm-stations{display:none}.amm-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.amm-homebar{grid-template-columns:1fr}}
@media(max-width:620px){.amm-grid{grid-template-columns:repeat(2,minmax(0,1fr));padding:10px 12px 12px}.amm-count{order:3;flex-basis:100%}.amm-origin{margin-left:0}.amm-foot-note{display:none}.amm-top{padding:14px 12px 10px}.amm-route{margin:10px 12px 0}.amm-homebar{padding:0 12px 12px}}
.amx-ring img[alt*="Zagreb"]{object-position:center 42%}
.amx-ring img[alt*="Beograd"]{object-position:center 40%}
.amx-ring img[alt*="Sarajevo"]{object-position:center 44%}
.amx-ring img[alt*="Budimpešta"]{object-position:center 38%}
.amx-ring img[alt*="Ljubljana"]{object-position:center 40%}
.amx-ring img[alt*="Rim"]{object-position:center 36%}
.amx-ring img[alt*="Sofija"]{object-position:center 42%}
.amx-ring img[alt*="Bukurešt"]{object-position:center 40%}
.amx-link:hover .amx-ring,.amx-link:focus-visible .amx-ring{transform:translateY(-3px) scale(1.03);box-shadow:0 14px 26px rgba(15,23,42,.26)}
.amx-link:hover b{color:#d71920}
.amx-platforms{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:10px 18px 16px}
.amx-plabel{font:800 9.5px/1 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#8a8578;margin-right:4px}
.amx-platforms a{border:1px solid #111;padding:7px 10px;font:800 10px/1 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;transition:background .15s ease,color .15s ease}
.amx-platforms a:hover{background:#111;color:#fffdf8}
@media(max-width:1040px){.amx-row{grid-template-columns:repeat(4,minmax(0,1fr));row-gap:16px}}
@media(max-width:620px){
  .amx-head{gap:10px;padding:12px}
  .amx-head p{font-size:11.5px;order:3;flex-basis:100%}
  .amx-all{margin-left:0}
  .amx-row{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:14px 12px 8px;scrollbar-width:none;-ms-overflow-style:none}
  .amx-row::-webkit-scrollbar{display:none;height:0}
  .amx-item{flex:0 0 84px;scroll-snap-align:start}
  .amx-link b{font-size:12px}
  .amx-link small{font-size:8.5px}
  .amx-platforms{padding:8px 12px 14px}
}</style>
<section class="amx" aria-label="${esc(T.aria)}">
  <div class="amx-head">
    <span class="amx-flag">${esc(T.label)}</span>
    <p>${T.lead}</p>
    <a class="amx-all" href="#izdanja-po-zemljama">${esc(T.all)}</a>
  </div>
  ${networkPodium(circles, cards, lang)}
  <div class="amx-platforms"><span class="amx-plabel">${esc(T.platforms)}</span>${platforms}</div>
</section>`;
}

/* ---------- svjetska izdanja: pet kontinenata ---------- */

const CONTINENTS = [
  { id: 'afrika', hr: 'Afrika', en: 'Africa', cities: ['kairo', 'nairobi'],
    hrNote: 'dva izdanja: arapski i engleski', enNote: 'two editions: Arabic and English' },
  { id: 'azija', hr: 'Azija', en: 'Asia', cities: ['jakarta', 'singapur', 'tokio', 'peking'],
    hrNote: 'četiri izdanja: indonezijski, engleski, japanski, kineski', enNote: 'four editions: Indonesian, English, Japanese, Chinese' },
  { id: 'sjeverna-amerika', hr: 'Sjeverna Amerika', en: 'North America', cities: ['newyork'],
    hrNote: 'jedno izdanje: engleski', enNote: 'one edition: English' },
  { id: 'juzna-amerika', hr: 'Južna Amerika', en: 'South America', cities: ['saopaulo'],
    hrNote: 'jedno izdanje: portugalski', enNote: 'one edition: Portuguese' },
  { id: 'oceanija', hr: 'Oceanija', en: 'Oceania', cities: ['sydney'],
    hrNote: 'jedno izdanje: engleski', enNote: 'one edition: English' }
];

function worldPodium(cards, lang = 'hr') {
  const EN = lang === 'en';
  const T = (hr, eng) => (EN ? eng : hr);
  const byId = (id) => CHANNELS.find((c) => c.id === id);
  const count = (id) => (cards.find((x) => x.id === id) || {}).count || 0;
  const city = (id) => CITY_SHORT[id] || (byId(id) || {}).city || id;
  const total = CHANNELS.filter((c) => CONTINENTS.some((k) => k.cities.includes(c.id)))
    .reduce((sum, c) => sum + count(c.id), 0);
  const nf = (n) => n.toLocaleString(EN ? 'en-US' : 'hr-HR');
  /* Izdanje bez ijednog zapisa nije nula nego „u pripremi": arhiva mu se puni
     backfillom. Nula na ploči čita se kao kvar, a nije kvar. */
  const state = (id) => (count(id) ? `${count(id)}` : T('u pripremi', 'filling'));
  const label = (id) => (count(id) ? `${count(id)} ${T('tekstova', 'stories')}` : T('arhiva se puni', 'archive filling'));
  const langNames = { en: T('engleski', 'English'), id: T('indonezijski', 'Indonesian'), pt: T('portugalski', 'Portuguese'), ar: T('arapski', 'Arabic'), ja: T('japanski', 'Japanese'), zh: T('kineski', 'Chinese') };

  const continents = CONTINENTS.map((k, i) => {
    const links = k.cities.map((id) => {
      const c = byId(id);
      if (!c) return '';
      return `<li><a href="${esc(c.base)}" hreflang="${c.lang}" aria-label="${esc(T(`AKTUAL MEDIA ${city(id)} — ${langNames[c.lang] || c.lang}, ${label(id)}. Otvori izdanje.`, `AKTUAL MEDIA ${city(id)} — ${langNames[c.lang] || c.lang}, ${label(id)}. Open the edition.`))}"><span class="amw-dot" style="--c:${AMM_C[id] || '#e9c66c'}" aria-hidden="true"></span><b>${esc(city(id))}</b><small>${esc(c.lang)} · ${state(id)}</small></a></li>`;
    }).join('');
    return `<li class="amw-cont">
      <span class="amw-num">${String(i + 1).padStart(2, '0')}</span>
      <b class="amw-name">${esc(EN ? k.en : k.hr)}</b>
      <span class="amw-note">${esc(EN ? k.enNote : k.hrNote)}</span>
      <ul class="amw-cities">${links}</ul>
    </li>`;
  }).join('');

  const tiles = CONTINENTS.flatMap((k) => k.cities).map((id) => {
    const c = byId(id);
    if (!c) return '';
    const alt = (EN ? CITY_ALT_EN[id] : CITY_ALT[id]) || `${c.title} — ${T('klik otvara izdanje.', 'click opens the edition.')}`;
    return tile({ href: c.base, img: `${c.id}-tile.webp`, alt, external: true,
      badge: label(id) });
  }).join('');

  return `
  <section class="amw" id="svjetska-izdanja" aria-labelledby="amwTitle">
    <div class="amw-head">
      <div>
        <span class="amw-kicker">${T('SVJETSKA IZDANJA · PET KONTINENATA', 'WORLD EDITIONS · FIVE CONTINENTS')}</span>
        <h3 id="amwTitle">${T('Devet novih gradova, pet kontinenata, jedna metodologija', 'Nine new cities, five continents, one methodology')}</h3>
      </div>
      <span class="amw-dim">${total ? `${nf(total)} ${T('tekstova', 'stories')} · ` : T('arhiva se puni · ', 'archive filling · ')}${CONTINENTS.reduce((n, k) => n + k.cities.length, 0)} ${T('izdanja', 'editions')}</span>
    </div>
    <p class="amw-lead">${T(
      'Ista pravila kao u regiji: svako izdanje čita javne feedove svojih medija, svaki zapis nosi izravnu poveznicu na izvornik i datum, a osvrt govori o načinu izvještavanja. Izdanja su na jeziku svoje zemlje — indonezijski, portugalski, arapski, japanski i kineski — a svako ima engleski ulaz koji objašnjava izdanje bez prevođenja samih tekstova.',
      'The same rules as in the region: every edition reads the public feeds of its outlets, every record carries a direct link to the original and a date, and the review is about how the story was reported. Editions are published in the language of their country — Indonesian, Portuguese, Arabic, Japanese and Chinese — and each has an English entry point that explains the edition without translating the articles.'
    )}</p>
    <ol class="amw-rail">${continents}</ol>
    <ul class="amc-grid3">${tiles}</ul>
    <p class="amc-note">${T(
      'Svjetska izdanja su na istoj domeni kao i regionalna, s vlastitim feedom i sitemapom. Engleski ulaz nalazi se na adresi izdanja pod <code>/en/</code>; za izdanja koja su već na engleskom ta adresa vodi natrag na izdanje i nije zaseban sadržaj.',
      'World editions sit on the same domain as the regional ones, each with its own feed and sitemap. The English entry point is at <code>/en/</code> under the edition; for editions already in English that address points back to the edition and is not separate content.'
    )}</p>
  </section>`;
}

/* AKTUAL MEDIA is the editorial brand; GNK ASG keeps its separate corporate
 * WebSite identity at the domain root. Google does not grant independent site
 * names to subdirectories, so we model the brand as a NewsMediaOrganization. */
const AKTUAL_BRAND_START = '<!-- AKTUAL-MEDIA-SEO-ENTITY:START -->';
const AKTUAL_BRAND_END = '<!-- AKTUAL-MEDIA-SEO-ENTITY:END -->';
const AKTUAL_BRAND_ID = 'https://gnk-asg.hr/gnk-aktual/#news-organization';
export function strengthenAktualBrand(html, lang = 'hr', collection = null) {
  // Inspect only publisher nodes that survive replacement of our own marker.
  const oldStart=html.indexOf(AKTUAL_BRAND_START),oldEnd=html.indexOf(AKTUAL_BRAND_END);
  if(oldStart!==-1&&oldEnd>oldStart)
    html=html.slice(0,oldStart)+html.slice(oldEnd+AKTUAL_BRAND_END.length);
  const pageUrl=lang==='en'?'https://gnk-asg.hr/en/gnk-aktual/':'https://gnk-asg.hr/gnk-aktual/';
  // Update the canonical newsroom CollectionPage rather than adding another
  // conflicting copy in the body on every daily build.
  const existingScripts = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  html = html.replace(existingScripts, (block, raw) => {
    let node;
    try { node = JSON.parse(raw); } catch { return block; }
    if (node['@type'] === 'CollectionPage'
        && node.url === pageUrl) {
      node.publisher = { '@id': AKTUAL_BRAND_ID };
      node.about = { '@id': AKTUAL_BRAND_ID };
      if(collection?.['@type']==='ItemList')node.mainEntity={
        '@type':'ItemList',numberOfItems:collection.numberOfItems,itemListElement:collection.itemListElement};
      else if(collection?.mainEntity)node.mainEntity=collection.mainEntity;
      if(collection?.hasPart)node.hasPart=collection.hasPart;
      return '<script type="application/ld+json">' + JSON.stringify(node) + '</script>';
    }
    return block;
  });
  const hasPublisherEntity = [...html.matchAll(existingScripts)].some((match) => {
    try {
      const node = JSON.parse(match[1]);
      return (node['@graph'] || [node]).some((part) =>
        part['@type'] === 'NewsMediaOrganization' && part['@id'] === AKTUAL_BRAND_ID);
    } catch { return false; }
  });
  const editionUrls = CHANNELS.map((channel) => ({
    '@type': 'ListItem', name: channel.title, url: channel.base
  }));
  const sections = [
    ['/izdanja/sport/', 'Sport'], ['/izdanja/politika/', 'Politika'],
    ['/izdanja/sigurnost/', 'Sigurnost'], ['/izdanja/biznis/', 'Biznis'],
    ['/izdanja/tehnologija/', 'Tehnologija'], ['/izdanja/moda/', 'Moda'],
    ['/izdanja/putovanja/', 'Putovanja'], ['/izdanja/ljubimci/', 'Ljubimci'],
    ['/izdanja/svijet/', 'Svijet']
  ].map(([route, name]) => ({ '@type': 'ListItem', name: name + ' — AKTUAL MEDIA', url: 'https://gnk-asg.hr' + route }));
  const endpoints = [...editionUrls, ...sections, {
    '@type': 'ListItem', name: 'BUSINESS TJEDNIK', url: 'https://gnk-asg-tjednik.pages.dev/'
  }].map((item, i) => ({ ...item, position: i + 1 }));
  const entity = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsMediaOrganization', '@id': AKTUAL_BRAND_ID,
        name: 'AKTUAL MEDIA d.o.o.', alternateName: ['AKTUAL MEDIA', 'Aktual mediji', 'Aktual Media', 'AKTUAL MEDIA KANAL'],
        url: 'https://gnk-asg.hr/gnk-aktual/',
        logo: logoJsonLd(lang==='en'?'aktual-media-en':'aktual-media-hr'),
        description: 'Vijesti, regionalna izdanja, analize, tematski deskovi, poslovni tjednik i radio.',
        parentOrganization: { '@id': 'https://gnk-asg.hr/#gnk-asg' },
        editor: { '@id': 'https://gnk-asg.hr/#nermin-sefic' },
        subjectOf: [
          { '@type': 'WebPage', url: 'https://gnk-asg.hr/izdanja/' },
          { '@type': 'WebPage', url: 'https://gnk-asg.hr/radio/' },
          { '@type': 'WebPage', url: 'https://gnk-asg.hr/aktual-media/' }
        ]
      },
      {
        '@type': 'ItemList', '@id': 'https://gnk-asg.hr/gnk-aktual/#editions',
        name: 'Izdanja AKTUAL MEDIA', numberOfItems: endpoints.length,
        itemListElement: endpoints
      }
    ]
  };
  if (hasPublisherEntity) entity['@graph'] = entity['@graph'].filter(
    (part) => part['@type'] !== 'NewsMediaOrganization');
  const snippet = AKTUAL_BRAND_START + '\n' +
    '<script type="application/ld+json">' + JSON.stringify(entity).replace(/</g, '\\u003c') + '</script>\n' +
    '<link rel="sitemap" type="application/xml" href="/izdanja/sitemap.xml">\n' +
    AKTUAL_BRAND_END;
  html = html.replace(/<meta property="og:site_name" content="[^"]*">/i,
    '<meta property="og:site_name" content="AKTUAL MEDIA">');
  const start = html.indexOf(AKTUAL_BRAND_START);
  const end = html.indexOf(AKTUAL_BRAND_END);
  if (start !== -1 && end > start) {
    html = html.slice(0, start) + snippet + html.slice(end + AKTUAL_BRAND_END.length);
  } else {
    html = html.replace('</head>', snippet + '\n</head>');
  }
  return html;
}

export function buildAktualCentral({ cards = [] } = {}) {
  if (!existsSync(FILE)) return { ok: false, reason: 'nema gnk-aktual/index.html' };
  let html = readFileSync(FILE, 'utf8');

  const items = allItems();
  const sources = new Set(items.map((i) => i.sourceName));
  const gallery = readJSON(join(PORTAL, 'data', 'nermin-sefic-gallery.json'), { items: [], count: 0 });
  const moda = items.filter((i) => MODA_RE.test(`${i.title} ${i.summary}`)).length;
  const sport = items.filter((i) => i.theme === 'sport').length;
  const politics = items.filter((i) => i.theme === 'politika').length;
  const security = items.filter((i) => ['sigurnost', 'rat', 'potres'].includes(i.theme)).length;

  /* Rijeka 3 × 19: kanali se izmjenjuju, pa svaki stupac nosi više izdanja. */
  const byChannel = new Map(CHANNELS.map((c) => [c.id, []]));
  for (const item of [...items].sort((a, b) => String(b.date).localeCompare(String(a.date)))) {
    byChannel.get(item.channel.id)?.push(item);
  }
  const queues = [...byChannel.values()].filter((queue) => queue.length);
  const river = [];
  for (let round = 0; river.length < 57 && queues.some((queue) => queue.length > round); round += 1) {
    for (const queue of queues) {
      if (queue[round] && river.length < 57) river.push(queue[round]);
    }
  }
  const third = Math.ceil(river.length / 3);
  const columns = [river.slice(0, third), river.slice(third, third * 2), river.slice(third * 2)];

  const stripeFor = (lang) => {
    const en = lang === 'en';
    const langs = new Set(CHANNELS.map((c) => c.lang));
    const regions = CHANNELS.filter((c) => CONTINENTS.every((k) => !k.cities.includes(c.id))).length;
    const world = CHANNELS.length - regions;
    return [
      [String(CHANNELS.length), en ? 'city editions' : 'gradskih izdanja'],
      [String(items.length), en ? 'stories in the archive' : 'tekstova u arhivi'],
      [String(sources.size), en ? 'media sources' : 'medijskih izvora'],
      [String(langs.size), en ? 'languages' : 'jezika'],
      [String(regions), en ? 'regional editions' : 'regionalnih izdanja'],
      [String(world), en ? 'world editions' : 'svjetskih izdanja']
    ].map(([n, l]) => `<li><b>${esc(n)}</b><span>${esc(l)}</span></li>`).join('');
  };

  /* Stranica već nosi svoj CollectionPage čvor (glavni generator) s
     publisherom i mainEntity popisom. Ovaj blok zato NE ponavlja
     CollectionPage — dva čvora s istim URL-om ruše test identiteta i Google
     čita dva različita opisa iste stranice. Umjesto toga dodaje se jedan
     ItemList s popisom svih odredišta koja blok nudi. */
  const destinations = [
    ...CHANNELS.map((c) => ({ name: c.title, url: c.base })),
    ...['sport', 'politika', 'sigurnost', 'biznis', 'tehnologija', 'moda', 'putovanja', 'ljubimci', 'svijet']
      .map((id) => ({ name: `${id.toUpperCase()} — AKTUAL MEDIA`, url: `${HUB}${id}/` })),
  ];
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': 'https://gnk-asg.hr/gnk-aktual/#all-destinations',
    name: 'Sva odredišta AKTUAL MEDIA s ove stranice',
    numberOfItems: destinations.length,
    itemListElement: destinations.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, url: item.url })),
  };

  /* Oba matična znaka stoje u herou: hrvatski i engleski. Čitatelj koji
     dođe na /gnk-aktual/ prvo vidi kako se kuća potpisuje, a EN znak vodi
     na englesku stranicu istog sadržaja. */
  const masterMark = (lang = 'hr') => {
    const isEn = lang === 'en';
    const hr = logoFor('aktual-media-hr');
    const en = logoFor('aktual-media-en');
    if (!hr || !en) return '';
    return `<div class="amc-marks">
      <a class="amc-mark amc-mark--hr" href="/gnk-aktual/" aria-label="${isEn ? 'AKTUAL MEDIA — Croatian edition' : 'AKTUAL MEDIA — hrvatsko izdanje'}"><img src="${hr.webp}" alt="${esc(hr.title)} — ${esc(hr.tagline)}" width="420" height="121" loading="eager" decoding="async" fetchpriority="high"></a>
      <a class="amc-mark amc-mark--en" href="/en/gnk-aktual/" hreflang="en" lang="en" aria-label="AKTUAL MEDIA — world edition"><img src="${en.webp}" alt="${esc(en.title)} — ${esc(en.tagline)}" width="300" height="86" loading="lazy" decoding="async"></a>
    </div>`;
  };

  const centralBlock = (lang = 'hr') => {
  const en = lang === 'en';
  const T = (hr, eng) => (en ? eng : hr);
  return `${START}
<style id="amc-style">
.am-central{--amc-ink:#f4f7fc;--amc-muted:#a9b8cc;--amc-gold:#e9c66c;--amc-line:rgba(233,198,108,.28);background:radial-gradient(1200px 600px at 12% -10%,rgba(233,198,108,.12),transparent 60%),#050d18;color:var(--amc-ink);border:1px solid rgba(233,198,108,.24);border-radius:26px;padding:clamp(16px,3.2vw,40px);margin:30px 0;font-family:inherit;overflow:hidden}
.am-central *{box-sizing:border-box}
.am-central a{color:inherit;text-decoration:none}
.amc-eyebrow{font:800 11px/1.4 Inter,system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--amc-gold);margin:0}
.amc-marks{display:flex;flex-wrap:wrap;align-items:center;gap:14px;margin:0 0 18px}
.amc-mark{display:block;border-radius:10px;overflow:hidden;line-height:0;border:1px solid rgba(233,198,108,.3)}
.amc-mark img{display:block;width:auto;height:auto}
.amc-mark--hr img{height:92px}
.amc-mark--en img{height:64px}
@media(max-width:620px){.amc-mark--hr img{height:64px}.amc-mark--en img{height:46px}}
.am-central h2{font:700 clamp(28px,3.8vw,48px)/1.04 Georgia,serif;letter-spacing:-.02em;margin:10px 0 14px;max-width:24ch}
.am-center{text-align:center}
.amc-hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:clamp(16px,3vw,34px);align-items:center}
.amc-hero-copy p.amc-lead{color:var(--amc-muted);line-height:1.6;margin:0 0 18px;max-width:56ch;font-size:15.5px}
.amc-hero-art{position:relative;border-radius:20px;overflow:hidden;border:1px solid rgba(233,198,108,.34);box-shadow:0 30px 70px rgba(0,0,0,.55)}
.amc-hero-art img{display:block;width:100%;height:auto}
.amc-hero-art:hover img{transform:scale(1.02)}
.amc-hero-art img{transition:transform .5s ease}
.amc-hero-cta{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}
.amc-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 18px;border-radius:12px;font:800 13px/1 Inter,system-ui,sans-serif;letter-spacing:.02em;border:1px solid rgba(233,198,108,.5);color:var(--amc-gold);transition:background .2s ease,color .2s ease,transform .2s ease}
.amc-btn:hover{background:var(--amc-gold);color:#06111f;transform:translateY(-1px)}
.amc-btn--solid{background:var(--amc-gold);color:#06111f;border-color:var(--amc-gold)}
.amc-btn--solid:hover{background:#fff0c4}
.amc-stripe{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;list-style:none;padding:0;margin:26px 0 6px}
.amc-line{margin-top:30px}
.amc-rail{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;list-style:none;padding:0;margin:8px 0 22px;counter-reset:none}
.amc-rail::before{content:"";position:absolute;left:8%;right:8%;top:15px;height:2px;background:linear-gradient(90deg,rgba(233,198,108,.15),rgba(233,198,108,.55),rgba(233,198,108,.15))}
.amc-node{position:relative;padding:0 10px;text-align:center}
.amc-node::before{content:"";display:block;width:14px;height:14px;margin:8px auto 12px;border-radius:50%;background:#050d18;border:2px solid rgba(233,198,108,.55);position:relative;z-index:1}
.amc-node--here::before{background:var(--amc-gold);border-color:var(--amc-gold);box-shadow:0 0 0 5px rgba(233,198,108,.16)}
.amc-node b{display:block;font:800 12.5px/1.3 Inter,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--amc-ink)}
.amc-node a b{color:var(--amc-gold)}
.amc-node a:hover b{text-decoration:underline}
.amc-node span{display:block;margin-top:6px;font-size:12.5px;line-height:1.45;color:var(--amc-muted)}
.amc-why{border:1px dashed var(--amc-line);border-radius:16px;padding:18px;background:rgba(255,255,255,.02);list-style:none}
.amc-why b{display:block;font:800 12px/1.3 Inter,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--amc-gold);margin-bottom:8px}
.amc-why p{margin:0;font-size:13px;line-height:1.6;color:var(--amc-muted)}
.amc-why a{color:var(--amc-gold);text-decoration:underline}
@media (max-width:860px){.amc-rail{grid-template-columns:1fr;gap:14px}.amc-rail::before{left:21px;right:auto;top:8%;bottom:8%;width:2px;height:auto;background:linear-gradient(180deg,rgba(233,198,108,.15),rgba(233,198,108,.55),rgba(233,198,108,.15))}.amc-node{text-align:left;padding-left:56px}.amc-node::before{position:absolute;left:15px;top:2px;margin:0}}
.amc-stripe li{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:13px 13px 11px}
.amc-stripe b{display:block;font:700 25px/1 Georgia,serif;color:var(--amc-gold)}
.amc-stripe span{display:block;margin-top:6px;font-size:11.5px;color:var(--amc-muted);line-height:1.32}
.amc-sec{margin-top:34px;padding-top:20px;border-top:1px solid var(--amc-line)}
.amc-sec-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:14px}
.amc-sec-head h3{font:700 clamp(20px,2.2vw,27px)/1.12 Georgia,serif;margin:4px 0 0;letter-spacing:-.01em}
.amc-sec-head .amc-dim{font:700 11px/1.4 Inter,system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--amc-muted)}
.amc-sec-num{font:800 11px/1 Inter,system-ui,sans-serif;letter-spacing:.18em;color:var(--amc-gold);display:block;margin-bottom:6px}
.amc-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;list-style:none;padding:0;margin:0}
.amc-tile{position:relative;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.12);background:#08131f;transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease}
.amc-tile:hover,.amc-tile:focus-within{transform:translateY(-3px);border-color:rgba(233,198,108,.75);box-shadow:0 24px 50px rgba(0,0,0,.5)}
.amc-tile-link{display:block;position:relative}
.amc-tile-img{display:block;width:100%;height:auto;aspect-ratio:880/587;object-fit:cover;transition:transform .5s ease;filter:saturate(1.03)}
.amc-tile:hover .amc-tile-img{transform:scale(1.035)}
.amc-tile-badge{position:absolute;left:12px;top:12px;background:rgba(5,13,24,.82);border:1px solid rgba(233,198,108,.45);color:var(--amc-gold);font:800 10.5px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;border-radius:999px;padding:7px 10px;backdrop-filter:blur(6px)}
.amc-tile-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 12px;border-top:1px solid rgba(255,255,255,.1);font:700 10.5px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:rgba(233,240,247,.5)}
.amc-tile-foot a{color:var(--amc-gold);text-decoration:none}
.amc-tile-foot a:hover{color:#fff}
.amc-tile-go{position:absolute;right:12px;bottom:12px;width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:rgba(233,198,108,.92);color:#06111f;font:800 17px/1 Inter,system-ui,sans-serif;opacity:0;transform:translateX(-6px);transition:opacity .2s ease,transform .2s ease}
.amc-tile:hover .amc-tile-go,.amc-tile:focus-within .amc-tile-go{opacity:1;transform:translateX(0)}
.amc-tile-link--text{display:flex;flex-direction:column;gap:7px;min-height:100%;padding:18px 18px 20px;background:linear-gradient(160deg,rgba(255,255,255,.06),rgba(255,255,255,.015));aspect-ratio:880/587}
.amc-tile--small .amc-tile-link--text{aspect-ratio:auto}
.amc-tile-kicker{font:800 10px/1.4 Inter,system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--amc-gold)}
.amc-tile-name{font:700 clamp(17px,1.6vw,21px)/1.15 Georgia,serif}
.amc-tile-text{font-size:12.8px;line-height:1.45;color:#c9d5e6}
.amc-tile--small .amc-tile-badge{position:static;align-self:flex-start;margin-top:auto}
.amc-river{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:4px}
.amc-river-col{list-style:none;margin:0;padding:0}
.amc-river-col li{padding:9px 0;border-bottom:1px solid rgba(255,255,255,.075);display:grid;grid-template-columns:50px 1fr;gap:8px}
.amc-river-col time{font:700 10.5px/1.5 Inter,system-ui,sans-serif;color:var(--amc-gold);padding-top:2px}
.amc-river-col a{font-size:13.3px;line-height:1.35;grid-column:2}
.amc-river-col a:hover{text-decoration:underline;color:#fff}
.amc-river-src{grid-column:2;font-size:11px;color:var(--amc-muted)}
.amc-note{color:var(--amc-muted);font-size:12px;line-height:1.55;margin:16px 0 0}
.amc-note a{color:var(--amc-gold);text-decoration:underline}
.amc-tags{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:14px 0 0}
.amc-tags li{font:700 11.5px/1 Inter,system-ui,sans-serif;color:var(--amc-gold);border:1px solid var(--amc-line);border-radius:999px;padding:7px 10px}
.amc-footlink{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;list-style:none;padding:0;margin:14px 0 0}
.amc-footlink a{display:block;padding:10px 12px;border:1px solid rgba(255,255,255,.12);border-radius:10px;font:700 12px/1.2 Inter,system-ui,sans-serif;color:#dfe8f4}
.amc-footlink a:hover{border-color:var(--amc-gold);color:var(--amc-gold)}
@media (max-width:1040px){.amc-hero{grid-template-columns:1fr}.amc-stripe{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:860px){.amc-grid3{grid-template-columns:repeat(2,minmax(0,1fr))}.amc-river{grid-template-columns:1fr 1fr}}
@media (max-width:600px){.amc-grid3{grid-template-columns:1fr}.amc-river{grid-template-columns:1fr}.amc-stripe{grid-template-columns:1fr 1fr}}
.amw{margin-top:38px;padding-top:24px;border-top:1px solid var(--amc-line)}
.amw-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:10px}
.amw-kicker{font:800 11px/1 Inter,system-ui,sans-serif;letter-spacing:.18em;color:var(--amc-gold)}
.amw-head h3{font:700 clamp(21px,2.3vw,29px)/1.12 Georgia,serif;margin:6px 0 0;letter-spacing:-.01em}
.amw-dim{font:700 11px/1.4 Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--amc-muted)}
.amw-lead{margin:0 0 18px;max-width:78ch;font-size:13.5px;line-height:1.65;color:#c9d5e6}
.amw-rail{list-style:none;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0;padding:0;margin:0 0 20px;position:relative}
.amw-rail::before{content:"";position:absolute;left:6%;right:6%;top:14px;height:2px;background:linear-gradient(90deg,rgba(233,198,108,.15),rgba(233,198,108,.55),rgba(233,198,108,.15))}
.amw-cont{position:relative;padding:0 10px;text-align:center}
.amw-cont::before{content:"";display:block;width:13px;height:13px;margin:8px auto 10px;border-radius:50%;background:#050d18;border:2px solid rgba(233,198,108,.55);position:relative;z-index:1}
.amw-num{font:800 9.5px/1 Inter,system-ui,sans-serif;letter-spacing:.18em;color:var(--amc-gold)}
.amw-name{display:block;margin-top:4px;font:800 12px/1.3 Inter,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--amc-ink)}
.amw-note{display:block;margin-top:4px;font-size:11px;line-height:1.4;color:var(--amc-muted)}
.amw-cities{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:5px}
.amw-cities a{display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;padding:6px 8px;border:1px solid rgba(255,255,255,.12);border-radius:9px;text-decoration:none;transition:border-color .16s ease,color .16s ease}
.amw-cities a:hover{border-color:var(--amc-gold)}
.amw-dot{width:7px;height:7px;border-radius:50%;background:var(--c);box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 22%,transparent)}
.amw-cities b{font:800 11px/1 Inter,system-ui,sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#eef3f8}
.amw-cities small{font:700 9.5px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;color:var(--amc-muted)}
@media (max-width:1040px){.amw-rail{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:18px}.amw-rail::before{display:none}}
@media (max-width:620px){.amw-rail{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.amc-tile,.amc-tile-img,.amc-tile-go,.amc-btn{transition:none}.amc-tile:hover{transform:none}.amc-tile:hover .amc-tile-img{transform:none}}
</style>
<section class="am-central" id="sve-aktual-media" aria-labelledby="amcTitle">
  <div class="amc-hero">
    <div class="amc-hero-copy">
      ${masterMark(lang)}
      <p class="amc-eyebrow">${T('AKTUAL MEDIA · sve na jednom mjestu', 'AKTUAL MEDIA · everything in one place')}</p>
      <h2 id="amcTitle">${T(`${hrCount(CHANNELS.length)[0].toUpperCase()}${hrCount(CHANNELS.length).slice(1)} gradova`, `${CHANNELS.length} cities`)}, ${T(`${hrCount(LANG_COUNT)} jezika`, `${LANG_COUNT} languages`)}, ${items.length.toLocaleString(en ? 'en-US' : 'hr-HR')} ${T('tekstova', 'stories')} — ${T('na jednoj ploči', 'on one board')}</h2>
      <p class="amc-lead">${T('Svaka pločica je naslovnica izdanja: na njoj piše što se klikom dobije, a klik vodi na glavni link. Osam izdanja pokriva regiju — Zagreb, Beograd, Sarajevo, Budimpešta, Ljubljana, Rim, Sofija i Bukurešt — a devet svjetskih pokriva pet kontinenata: Kairo i Nairobi, Jakarta, Singapur, Tokio i Peking, New York, São Paulo i Sydney. S tih stranica uvijek se vraćate ovamo, u središte gdje se sve spaja. S regijom, mreža pokriva šest nastanjenih kontinenata — Europe, Afrike, Azije, Sjeverne i Južne Amerike te Oceanije — a svaka pločica nosi jezik izdanja i vlastiti feed.', 'Every tile is the cover of an edition: it says what a click gets you, and the click opens the main link. Eight editions cover the region — Zagreb, Belgrade, Sarajevo, Budapest, Ljubljana, Rome, Sofia and Bucharest — and nine world editions cover five continents: Cairo and Nairobi, Jakarta, Singapore, Tokyo and Beijing, New York, São Paulo and Sydney. From those pages you always come back here, to the centre where everything connects. With the region included, the network covers six inhabited continents — Europe, Africa, Asia, North and South America and Oceania — and every tile names the edition’s language and its own feed.')}</p>
      <div class="amc-hero-cta">
        <a class="amc-btn amc-btn--solid" href="#izdanja-po-zemljama">${T('Izdanja 3 × 3 ↓', 'Editions 3 × 3 ↓')}</a>
        <a class="amc-btn" href="#mravinjak">${T('Mravinjak vijesti ↓', 'News anthill ↓')}</a>
        <a class="amc-btn" href="/izdanja/">${T('Sva izdanja →', 'All editions →')}</a>
      </div>
    </div>
    <a class="amc-hero-art" href="https://gnk-asg.hr/izdanja/" aria-label="${T('AKTUAL MEDIA — sva izdanja na jednom mjestu', 'AKTUAL MEDIA — every edition in one place')}">
      <img src="${IMG}/aktual-media-tile.webp" alt="${T('AKTUAL MEDIA — sve što imamo: izdanja, deskovi, tjednik, galerija i radio. Središnje mjesto.', 'AKTUAL MEDIA — everything we have: editions, desks, weekly, gallery and radio. One central place.')}" width="880" height="587" loading="eager" decoding="async">
    </a>
  </div>

  <ul class="amc-stripe">${stripeFor(lang)}</ul>
  ${lineBlock(lang)}

  <section class="amc-sec" id="izdanja-po-zemljama" aria-labelledby="amcSec1">
    <div class="amc-sec-head">
      <div><span class="amc-sec-num">${T('01 · PLOČICE 3 × 3', '01 · TILES 3 × 3')}</span><h3 id="amcSec1">${T('Izdanja po zemljama', 'Editions by country')}</h3></div>
      <span class="amc-dim">${T(`${CHANNELS.length} gradova + business tjednik · klik vodi na izdanje`, `${CHANNELS.length} cities + business weekly · click opens the edition`)}</span>
    </div>
    <ul class="amc-grid3">${cityTiles(cards, lang)}${tile({ href: 'https://gnk-asg-tjednik.pages.dev/', img: 'tjednik-tile.webp', alt: T('BUSINESS TJEDNIK — Lider, Jutarnji, Poslovni i Forbes kroz tjednu kritiku. Klik otvara tjednik.', 'BUSINESS TJEDNIK — Lider, Jutarnji, Poslovni and Forbes in a weekly review. Click opens the weekly.'), external: true, badge: T('tjednik', 'weekly') })}</ul>
  </section>

  ${worldPodium(cards, lang)}

  <section class="amc-sec" id="deskovi" aria-labelledby="amcSec2">
    <div class="amc-sec-head">
      <div><span class="amc-sec-num">${T('02 · PLOČICE 3 × 3', '02 · TILES 3 × 3')}</span><h3 id="amcSec2">${T('Deskovi, tjednik mode i platforme', 'Desks, Mode weekly and platforms')}</h3></div>
      <span class="amc-dim">sport · politika · sigurnost · business · tehnologija · moda · putovanja · ljubimci · svijet</span>
    </div>
    <ul class="amc-grid3">${deskTiles(items, gallery, lang)}</ul>
  </section>

  <section class="amc-sec" id="mravinjak" aria-labelledby="amcSec3">
    <div class="amc-sec-head">
      <div><span class="amc-sec-num">${T('03 · MRAVINJAK · 3 × 19', '03 · ANTHILL · 3 × 19')}</span><h3 id="amcSec3">${T('Vijesti koje vučemo k sebi', 'Stories we pull toward us')}</h3></div>
      <span class="amc-dim">${items.length} ${T('tekstova', 'stories')} ${T('iz', 'from')} ${sources.size} ${T('medija', 'media')} · 8 ${T('jezika', 'languages')}</span>
    </div>
    <div class="amc-river">${columns.map(riverColumn).join('')}</div>
    <p class="amc-note">${T(
      `Mravinjak je naš dnevni pogon: ${CHANNELS.length} kanala čita javne feedove, sitemape i API-je svojih medija, sprema naslov, sažetak, datum i poveznicu na izvornik te iz toga gradi osvrt na način izvještavanja. Tekstovi se ne preuzimaju u cijelosti; svaki zapis vodi na izvornik, a tvrdnje izvora nisu tvrdnje redakcije. Sport ${sport} · Politika ${politics} · Sigurnost, rat i potresi ${security} · Moda i stil ${moda}.`,
      `The anthill is our daily engine: ${CHANNELS.length} channels read public feeds, sitemaps and APIs of their media, store the headline, summary, date and a link to the original, and from that build a review of how the story was reported. Texts are never copied in full; every record links to the original, and claims from sources are not the claims of the newsroom. Sport ${sport} · Politics ${politics} · Security, war and earthquakes ${security} · Mode and style ${moda}.`
    )}</p>
  </section>

  <section class="amc-sec" aria-labelledby="amcSec4">
    <div class="amc-sec-head">
      <div><span class="amc-sec-num">${T('04 · DALJE', '04 · NEXT')}</span><h3 id="amcSec4">${T('Gdje još možete otići', 'Where else you can go')}</h3></div>
      <span class="amc-dim">${T('tabloidi · arhiva · alati', 'tabloids · archive · tools')}</span>
    </div>
    <ul class="amc-footlink">
      <li><a href="/izdanja/">${T('Naša izdanja', 'Our editions')}</a></li>
      <li><a href="/objave/">${T('Objave', 'Publications')}</a></li>
      <li><a href="/komentari/">${T('Komentari', 'Commentary')}</a></li>
      <li><a href="/autorske-objave/">${T('Autorske objave', 'Author publications')}</a></li>
      <li><a href="/galerija/">${T('Galerija Nermina Sefića', 'Nermin Sefić gallery')}</a></li>
      <li><a href="/radio/">AKTUAL MEDIA RADIO</a></li>
      <li><a href="/knowledge-center/">${T('Centar znanja', 'Knowledge Center')}</a></li>
      <li><a href="/digital-workforce/">${T('Digitalna radna snaga', 'Digital workforce')}</a></li>
      <li><a href="https://gnk-asg-tjednik.pages.dev/" rel="external noopener">BUSINESS TJEDNIK ↗</a></li>
      <li><a href="https://gnk-asg-tjednik.pages.dev/tjednik/2026-W43/" rel="external noopener"><strong>${T('Tjednik 2026-W43 — ovaj tjedan ↗', 'Week 2026-W43 — this week ↗')}</strong></a></li>
      <li><a href="https://gnk-asg-tjednik.pages.dev/izvori/lider/" rel="external noopener">Lider ↗</a></li>
      <li><a href="https://gnk-asg-tjednik.pages.dev/izvori/jutarnji/" rel="external noopener">Jutarnji list ↗</a></li>
      <li><a href="https://gnk-asg-tjednik.pages.dev/izvori/poslovni/" rel="external noopener">Poslovni dnevnik ↗</a></li>
      <li><a href="https://gnk-asg-tjednik.pages.dev/izvori/forbes/" rel="external noopener">Forbes ↗</a></li>
    </ul>
  </section>

  <section class="amc-sec" aria-labelledby="amcSec5">
    <div class="amc-sec-head">
      <div><span class="amc-sec-num">${T('05 · OZNAKE', '05 · TAGS')}</span><h3 id="amcSec5">${T('Hashtagovi izdanja', 'Edition hashtags')}</h3></div>
      <span class="amc-dim">#NerminSefić · #NerminSefic · #SeficNermin · #SEFICNERMIN</span>
    </div>
    <ul class="amc-tags">${HASHTAGS.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
    <p class="amc-note">${T('Urednik i direktor izdanja je', 'The editor and director of the edition is')} <strong>Nermin Sefić</strong>. ${T('Za autora se koriste oznake', 'Author tags are')} #NerminSefić, #NerminSefic, #SeficNermin ${T('i', 'and')} #SEFICNERMIN. ${T('Kontakt', 'Contact')}: <a href="mailto:info@gnk-asg.hr">info@gnk-asg.hr</a>.</p>
  </section>
</section>
${END}`;
  };

  // "Linija": tri portala na istoj crti. ARHIVA i DNEVNIK imaju vlastitu domenu,
  // vlastiti sitemap i vlastiti feed — zato su ovdje pločice, a ne podstranice.
  const lineBlock = (lang) => {
    const en = lang === 'en';
    const T = (hr, eng) => (en ? eng : hr);
    // Brojevi se čitaju iz podataka, nikad ne upisuju rukom.
    const total = items.length.toLocaleString(en ? 'en-US' : 'hr-HR');
    const nodes = [
      `<li class="amc-node amc-node--here"><b>GNK ASG</b><span>${T('matični portal · ovdje ste', 'main portal · you are here')}</span></li>`,
      `<li class="amc-node"><a href="https://gnk-asg-arhiva.pages.dev/${en ? 'en/' : ''}"><b>AKTUAL ARHIVA</b><span>${T(`${total} tekstova, osam gradova, pretraga po mediju`, `${total} stories, eight cities, search by publisher`)}</span></a></li>`,
      `<li class="amc-node"><a href="https://gnk-asg-dnevnik.pages.dev/${en ? 'en/' : ''}"><b>AKTUAL DNEVNIK</b><span>${T('jedan dan, osam gradova, sve po satima', 'one day, eight cities, hour by hour')}</span></a></li>`,
    ].join('');
    return `
  <section class="amc-sec amc-line" id="linija" aria-labelledby="amcLine">
    <div class="amc-sec-head">
      <div><span class="amc-sec-num">${T('LINIJA · TRI ADRESE', 'LINE · THREE ADDRESSES')}</span><h3 id="amcLine">${T('Ista linija, tri portala', 'One line, three portals')}</h3></div>
      <span class="amc-dim">gnk-asg.hr → gnk-asg-arhiva.pages.dev → gnk-asg-dnevnik.pages.dev</span>
    </div>
    <ol class="amc-rail">${nodes}</ol>
    <ul class="amc-grid3">
      ${tile({ href: `https://gnk-asg-arhiva.pages.dev/${en ? 'en/' : ''}`, img: 'arhiva-tile.webp', alt: T(`AKTUAL ARHIVA — pločica: ${total} tekstova osam gradova, pretraga arhive, svaki zapis vodi na izvornik. Klik otvara arhivu.`, `AKTUAL ARHIVA tile: ${total} stories from eight cities, archive search, every record links to the original. Click opens the archive.`), external: true, badge: T('arhiva', 'archive') })}
      ${tile({ href: `https://gnk-asg-dnevnik.pages.dev/${en ? 'en/' : ''}`, img: 'dnevnik-tile.webp', alt: T('AKTUAL DNEVNIK — pločica: jedan dan, osam gradova, objave po satima. Klik otvara dnevnik.', 'AKTUAL DNEVNIK tile: one day, eight cities, posts by the hour. Click opens the daily.'), external: true, badge: T('dnevnik', 'daily') })}
      <li class="amc-why"><b>${T('Zašto zasebno', 'Why separate')}</b><p>${T(
        `Arhiva i dnevnik imaju vlastitu domenu, vlastiti sitemap, vlastiti feed i vlastiti robots.txt. Tako pretraživač ne mora proći kroz cijeli matični portal da dođe do ${total} zapisa, a vi možete otvoriti arhivu bez ijedne druge stranice. Sve je na free hostingu (Cloudflare Pages), bez plaćene domene — i dalje povezano ovom linijom.`,
        `The archive and the daily have their own domain, sitemap, feed and robots.txt. That way a crawler does not have to walk the whole main portal to reach ${total} records, and you can open the archive without any other page. Everything runs on free hosting (Cloudflare Pages), with no paid domain — and still connected by this line.`
      )}</p></li>
    </ul>
  </section>

`;
  };

  const block = centralBlock('hr');

  if (html.includes(START) && html.includes(END)) {
    html = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), () => block);
  } else if (html.includes(SLOT)) {
    html = html.replace(SLOT, block);
  } else {
    const anchor = '<!-- IZDANJA-BAND:END -->';
    if (!html.includes(anchor)) return { ok: false, reason: 'nema IZDANJA-BAND markera' };
    html = html.replace(anchor, `${anchor}\n${block}`);
  }

  const desc = `AKTUAL MEDIA na jednoj ploči: ${CHANNELS.length} gradskih izdanja na ${hrCount(LANG_COUNT)} jezika — osam u regiji i devet na pet kontinenata — ${items.length} tekstova iz ${sources.size} medija, devet deskova, poslovni tjednik, moda, galerija i radio. Urednik i direktor: Nermin Sefić.`;
  /* Opis se mijenja na svakom ciklusu, pa se mora zamijeniti na svim trima
     mjestima — dosad je twitter:description ostajao na starom broju tekstova
     i medija i nije se slagao s og:description. */
  const safeDesc = esc(truncate(desc, 300));
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${safeDesc}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${safeDesc}">`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${safeDesc}">`);
  /* JSON-LD čvorovi (CollectionPage i hasPart po izdanju) nose stari opis
     „8 gradskih izdanja na 8 jezika, 3360 tekstova". Opis se mijenja, pa se
     u graf upisuje isti, svježi tekst — jedan izvor za sve čvorove. */
  html = html.replace(/AKTUAL MEDIA na jednoj ploči: [^"\\]*?Nermin Sefić\./g, desc);

  const PERF = `<link rel="preload" as="image" href="${IMG}/zagreb-440.webp" imagesrcset="${IMG}/zagreb-240.webp 240w, ${IMG}/zagreb-440.webp 440w" imagesizes="(max-width:620px) 84px,(max-width:1040px) 22vw,11vw" fetchpriority="high">\n<style id="aktual-perf">.amc-river,.amc-tiles,.amm-grid,.amx-platforms{content-visibility:auto;contain-intrinsic-size:auto 640px}@media(prefers-reduced-motion:reduce){.amx-ring,.amm-card,.amm-home{transition:none}}</style>\n</head>`;
  const addPerf = (page) => page.includes('id="aktual-perf"') ? page : page.replace('</head>', PERF);
  /* Vektorska inačica znaka u <head> — jednom, ne na svakom ciklusu. */
  const addLogoAlternates = (page, slugs) => {
    if (/rel="alternate" type="image\/svg\+xml"/.test(page)) return page;
    const links = slugs.map((slug) => logoAlternate(slug)).filter(Boolean).join('\n');
    if (!links) return page;
    const canonical = page.match(/<link rel="canonical" href="[^"]+">/);
    if (!canonical) return page;
    return page.replace(canonical[0], `${canonical[0]}\n${links}`);
  };
  /* Traka krugova ide odmah ispod rubrika, prije vijesti. */
  /* Traka proizvoda na vrhu i iskačuća najava.
     Beograd je prvi jer je srpsko izdanje novo; uz njega idu i ostali
     proizvodi AKTUAL MEDIA (tjednik, moda, galerija, status). Sve je u
     vanjskim datotekama da radi i pod strogim CSP-om. */
  const promoBlock = (lang) => {
    const hr = lang !== 'en';
    const t = hr ? {
      nav: 'AKTUAL MEDIA — izdanja i proizvodi',
      new: 'Novo', beograd: 'Beograd · Srbija', business: 'Business Tjednik',
      mode: 'Tjednik Mode', editions: 'Sva izdanja', gallery: 'Galerija',
      status: 'Status ažurnosti', radio: 'Radio',
      eyebrow: 'AKTUAL MEDIA · mreža izdanja',
      title: 'Beograd je sada u fokusu',
      lead: 'Novo gradsko izdanje za Srbiju: 420 tekstova, osam izvora i dnevni ritam. Uz njega idu poslovni tjednik, moda, galerija i javni status ažurnosti — sve na jednom mjestu.',
      tiles: [
        ['/kanal/beograd/', 'Beograd', 'Srbija · 420 tekstova', 'Novo'],
        ['/kanal/zagreb/', 'Zagreb', 'Hrvatska · 420 tekstova', ''],
        ['/kanal/sarajevo/', 'Sarajevo', 'Bosna i Hercegovina', ''],
        ['https://gnk-asg-tjednik.pages.dev/', 'Business Tjednik', 'Tjednik W43', ''],
        ['/izdanja/moda/', 'Tjednik Mode', 'Moda i stil', ''],
        ['/status/', 'Status ažurnosti', 'Javno mjerenje svježine', 'Novo']
      ],
      cta: 'Sva izdanja →',
      shareStatus: 'Podijeli status na X ↗',
      shareBeograd: 'Podijeli Beograd na X ↗',
      close: 'Zatvori najavu',
      later: 'Kasnije',
      never: 'Ne prikazuj više'
    } : {
      nav: 'AKTUAL MEDIA — editions and products',
      new: 'New', beograd: 'Belgrade · Serbia', business: 'Business Weekly',
      mode: 'Mode Weekly', editions: 'All editions', gallery: 'Gallery',
      status: 'Freshness status', radio: 'Radio',
      eyebrow: 'AKTUAL MEDIA · edition network',
      title: 'Belgrade is now in focus',
      lead: 'A new city edition for Serbia: 420 stories, eight sources and a daily rhythm. Alongside it: the business weekly, mode, gallery and a public freshness status — all in one place.',
      tiles: [
        ['/kanal/beograd/', 'Belgrade', 'Serbia · 420 stories', 'New'],
        ['/kanal/zagreb/', 'Zagreb', 'Croatia · 420 stories', ''],
        ['/kanal/sarajevo/', 'Sarajevo', 'Bosnia and Herzegovina', ''],
        ['https://gnk-asg-tjednik.pages.dev/', 'Business Weekly', 'Week W43', ''],
        ['/izdanja/moda/', 'Mode Weekly', 'Fashion and style', ''],
        ['/en/status/', 'Freshness status', 'Public freshness measurement', 'New']
      ],
      cta: 'All editions →',
      shareStatus: 'Share status on X ↗',
      shareBeograd: 'Share Belgrade on X ↗',
      close: 'Close announcement',
      later: 'Later',
      never: "Don't show again"
    };
    const ext = (url) => /^https?:/.test(url) ? ' rel="external noopener"' : '';
    const tiles = t.tiles.map(([url, name, note, badge]) => `<li><a href="${url}"${ext(url)}>${badge ? `<span>${esc(badge)}</span>` : ''}<b>${esc(name)}</b><i>${esc(note)}</i></a></li>`).join('');
    const win = hr ? [
      ['/status/', 'status', 'Status ažurnosti', 'Javno mjerenje svježine'],
      ['/kanal/beograd/', 'beograd', 'KANAL BEOGRAD', 'Novo izdanje za Srbiju'],
      ['https://gnk-asg-tjednik.pages.dev/', 'tjednik', 'Business Tjednik', 'W43 · poslovni pregled'],
      ['/galerija/', 'galerija', 'Galerija', '63 stranice znakova'],
      ['/gnk-aktual/mreza/', 'mreza', 'Mreža izdanja', '8 gradova, 8 jezika']
    ] : [
      ['/en/status/', 'status', 'Freshness status', 'Public freshness measurement'],
      ['/kanal/beograd/', 'beograd', 'KANAL BEOGRAD', 'New edition for Serbia'],
      ['https://gnk-asg-tjednik.pages.dev/', 'tjednik', 'Business Weekly', 'Week W43 · business review'],
      ['/galerija/', 'galerija', 'Gallery', '63 brand pages'],
      ['/en/gnk-aktual/network/', 'mreza', 'Edition network', '8 cities, 8 languages']
    ];
    const windowRow = `<nav class="am-win-row" aria-label="${esc(hr ? 'Nove stranice AKTUAL MEDIA' : 'New AKTUAL MEDIA pages')}">
  <div class="am-win-head"><h2>${esc(hr ? 'Prozorčići · novo u AKTUAL MEDIA' : 'Mini windows · new in AKTUAL MEDIA')}</h2><a href="${hr ? '/aktual-media/proizvodi/' : '/en/aktual-media/proizvodi/'}">${esc(hr ? 'Svi proizvodi →' : 'All products →')}</a></div>
  <ul class="am-win-grid">${win.map(([url, slug, title, note]) => `<li class="am-win"><a href="${url}"${/^https?:/.test(url) ? ' rel="external noopener"' : ''}><span class="am-win-bar" aria-hidden="true"><i></i><i></i><i></i><b>${esc(slug)}</b></span><span class="am-win-body"><strong>${esc(title)}</strong><span>${esc(note)}</span></span></a></li>`).join('')}</ul>
</nav>`;
    const adCopy = hr ? [
      ['/kanal/beograd/', 'Beograd je otvoren', '420 tekstova, osam izvora i dnevni ritam — novo izdanje za Srbiju.', 'Otvori Beograd →'],
      ['https://gnk-asg-tjednik.pages.dev/', 'Business Tjednik', 'W43: brojevi, odluke i kontekst za poslovni tjedan.', 'Otvori tjednik ↗'],
      ['/status/', 'Status ažurnosti', 'Vidi kada je koje izdanje zadnji put obnovljeno — bez procjena.', 'Pogledaj status →']
    ] : [
      ['/kanal/beograd/', 'Belgrade is live', '420 stories, eight sources and a daily rhythm — a new edition for Serbia.', 'Open Belgrade →'],
      ['https://gnk-asg-tjednik.pages.dev/', 'Business Weekly', 'Week W43: numbers, decisions and context for the business week.', 'Open weekly ↗'],
      ['/en/status/', 'Freshness status', 'See when each edition was last refreshed — measured, not estimated.', 'View status →']
    ];
    const adHtml = `<aside class="am-ad" id="amAd" hidden aria-label="${esc(hr ? 'Reklama AKTUAL MEDIA' : 'AKTUAL MEDIA promotion')}">
  <div class="am-ad-top"><span class="am-ad-kicker">${esc(hr ? 'AKTUAL MEDIA · preporuka' : 'AKTUAL MEDIA · recommended')}</span><button class="am-ad-close" type="button" data-am-ad-close aria-label="${esc(hr ? 'Zatvori reklamu' : 'Close promotion')}">×</button></div>
  ${adCopy.map(([url, title, text, cta], i) => `<div class="am-ad-body" data-am-ad-item${i ? ' hidden' : ''}><a href="${url}"${/^https?:/.test(url) ? ' rel="external noopener"' : ''}><b>${esc(title)}</b><span>${esc(text)}</span><em>${esc(cta)}</em></a></div>`).join('')}
  <div class="am-ad-dots" aria-hidden="true">${adCopy.map((_, i) => `<i${i === 0 ? ' class="on"' : ''}></i>`).join('')}</div>
</aside>`;

    const shareStatus = 'https://twitter.com/intent/tweet?url=' + encodeURIComponent('https://gnk-asg.hr' + (hr ? '/status/' : '/en/status/')) + '&text=' + encodeURIComponent(hr ? 'AKTUAL MEDIA — javni status ažurnosti sedamnaest gradskih izdanja' : 'AKTUAL MEDIA — public freshness status of seventeen city editions');
    const shareBeograd = 'https://twitter.com/intent/tweet?url=' + encodeURIComponent('https://gnk-asg.hr/kanal/beograd/') + '&text=' + encodeURIComponent(hr ? 'AKTUAL MEDIA KANAL BEOGRAD — novo izdanje za Srbiju' : 'AKTUAL MEDIA KANAL BEOGRAD — a new edition for Serbia');
    return `<!-- AKTUAL-PROMO:START -->
<link rel="stylesheet" href="/assets/aktual-promo-v1.css?v=20261022b">
<nav class="am-promo-top" id="amPromoTop" aria-label="${esc(t.nav)}"><div class="am-promo-top-in"><span class="am-promo-top-label">AKTUAL MEDIA</span><ul><li><a href="/kanal/beograd/"><b>${esc(t.new)}</b> ${esc(t.beograd)}</a></li><li><a href="https://gnk-asg-tjednik.pages.dev/" rel="external noopener">${esc(t.business)} ↗</a></li><li><a href="/izdanja/moda/">${esc(t.mode)}</a></li><li><a href="/izdanja/">${esc(t.editions)}</a></li><li><a href="/galerija/">${esc(t.gallery)}</a></li><li><a href="${hr ? '/status/' : '/en/status/'}">${esc(t.status)}</a></li><li><a href="/radio/">${esc(t.radio)}</a></li></ul></div></nav>
${windowRow}
${adHtml}
<div class="am-promo-modal" id="amPromoModal" hidden>
  <div class="am-promo-backdrop" data-am-promo-close></div>
  <div class="am-promo-card" role="dialog" aria-modal="true" aria-labelledby="amPromoTitle" aria-describedby="amPromoLead">
    <button class="am-promo-x" type="button" data-am-promo-close aria-label="${esc(t.close)}">×</button>
    <p class="am-promo-eyebrow">${esc(t.eyebrow)}</p>
    <h2 id="amPromoTitle">${esc(t.title)}</h2>
    <p class="am-promo-lead" id="amPromoLead">${esc(t.lead)}</p>
    <ul class="am-promo-grid">${tiles}</ul>
    <div class="am-promo-actions">
      <a class="am-promo-cta" href="/izdanja/">${esc(t.cta)}</a>
      <a class="am-promo-share" href="${esc(shareStatus)}" target="_blank" rel="external noopener noreferrer nofollow">${esc(t.shareStatus)}</a>
      <a class="am-promo-share" href="${esc(shareBeograd)}" target="_blank" rel="external noopener noreferrer nofollow">${esc(t.shareBeograd)}</a>
      <button type="button" class="am-promo-later" data-am-promo-close>${esc(t.later)}</button>
      <button type="button" class="am-promo-never" data-am-promo-never>${esc(t.never)}</button>
    </div>
  </div>
</div>
<script src="/assets/aktual-promo-v1.js?v=20261022b" defer></script>
<!-- AKTUAL-PROMO:END -->`;
  };
  const withPromo = (page, lang) => {
    const block = promoBlock(lang);
    const PS = '<!-- AKTUAL-PROMO:START -->';
    const PE = '<!-- AKTUAL-PROMO:END -->';
    if (page.includes(PS) && page.includes(PE)) {
      return page.replace(new RegExp(`${PS}[\\s\\S]*?${PE}`), () => block);
    }
    const at = page.indexOf('<section class="am-masthead"');
    if (at > 0) return `${page.slice(0, at)}${block}\n\n  ${page.slice(at)}`;
    return page;
  };

  const RS = '<!-- AKTUAL-RAIL:START -->';
  const RE = '<!-- AKTUAL-RAIL:END -->';
  const railHr = homeRail(cards, moda, 'hr');
  if (html.includes(RS) && html.includes(RE)) {
    html = html.replace(new RegExp(`${RS}[\\s\\S]*?${RE}`), () => `${RS}\n${railHr}\n${RE}`);
  } else {
    const navOpen = html.indexOf('<nav class="am-sectionnav"');
    const navClose = navOpen >= 0 ? html.indexOf('</nav>', navOpen) : -1;
    if (navClose > 0) {
      const at = navClose + '</nav>'.length;
      html = `${html.slice(0, at)}\n${RS}\n${railHr}\n${RE}${html.slice(at)}`;
    }
  }
  html = withPromo(html, 'hr');
  html = withAtlas(html, 'hr');
  html = addPerf(addLogoAlternates(html, ['aktual-media-hr']));
  html = strengthenAktualBrand(html, 'hr', jsonld);
  writeFileSync(FILE, html);

  /* Engleska stranica dobiva istu traku krugova, s engleskim natpisima. */
  const EN = join(PORTAL, 'en', 'gnk-aktual', 'index.html');
  if (existsSync(EN)) {
    let en = readFileSync(EN, 'utf8');
    const rail = homeRail(cards, moda, 'en');
    if (en.includes(RS) && en.includes(RE)) {
      en = en.replace(new RegExp(`${RS}[\\s\\S]*?${RE}`), () => `${RS}\n${rail}\n${RE}`);
    } else {
      const navOpen = en.indexOf('<nav class="am-sectionnav"');
      const navClose = navOpen >= 0 ? en.indexOf('</nav>', navOpen) : -1;
      if (navClose > 0) {
        const at = navClose + '</nav>'.length;
        en = `${en.slice(0, at)}\n${RS}\n${rail}\n${RE}${en.slice(at)}`;
      }
    }
    /* EN masthead mora izgledati isto kao hrvatski: JEDAN naslov.
       22. 10. 2026. engleska je stranica imala i znak (sliku) i tekstni <h1>,
       pa se isti naslov vidio dvaput — dvije „logo" verzije. Sada se znak
       uklanja iz mastheada, a vraća se isti tekstni blok koji nosi HR
       stranica. Znakovi kuće ostaju u JSON-LD-u, galeriji i amc-sekciji. */
    const normalizeEnBrand = (page) => {
      if (!page.includes('<div class="am-brand">')) return page;
      const brand = `<span class="am-brand-kicker">World edition</span>
      <h1 id="amMasthead">AKTUAL <span>MEDIA</span></h1>
      <p class="am-brand-sub">News · context · sources</p>`;
      return page.replace(/(<div class="am-brand">)[\s\S]*?(<\/div>)/, (_m, open, close) => `${open}\n      ${brand}\n    ${close}`);
    };
    en = normalizeEnBrand(en);
    /* Ukloni ostatke prijašnjeg znaka iz mastheada (CSS i pomoćna klasa)
       kako stranica ne bi nosila mrtva pravila. */
    en = en
      .replace(/<style>\.am-sr-only\{[^<]*<\/style>\n?/g, '')
      .replace(/\.am-mast-logo\{[^}]*\}\n?/g, '')
      .replace(/\.am-mast-logo img\{[^}]*\}\n?/g, '')
      .replace(/@media\(max-width:620px\)\{\.am-mast-logo\{max-width:300px\}\}\n?/g, '')
      .replace(/<a class="am-mast-logo"[\s\S]*?<\/a>/g, '');
    /* Engleska stranica dobiva istu središnju ploču, s engleskim natpisima.
       Do 22. 10. 2026. EN je imala samo traku krugova — bez ploče izdanja,
       deskova, mravinjaka i odredišta, pa je bila ~500 redaka kraća od HR. */
    const enBlock = centralBlock('en');
    if (en.includes(START) && en.includes(END)) {
      en = en.replace(new RegExp(`${START}[\\s\\S]*?${END}`), () => enBlock);
    } else if (en.includes('<!-- IZDANJA-BAND:START -->')) {
      en = en.replace('<!-- IZDANJA-BAND:START -->', `${enBlock}\n<!-- IZDANJA-BAND:START -->`);
    } else if (en.includes('<!-- AKTUAL-MREZA-BAND:START -->')) {
      en = en.replace('<!-- AKTUAL-MREZA-BAND:START -->', `${enBlock}\n<!-- AKTUAL-MREZA-BAND:START -->`);
    }
    en = withPromo(en, 'en');
    en = withAtlas(en, 'en');
    en = addPerf(addLogoAlternates(en, ['aktual-media-en', 'aktual-media-hr']));
    en = strengthenAktualBrand(en, 'en', jsonld);
    writeFileSync(EN, en);
  }

  return { ok: true, items: items.length, sources: sources.size, channels: CHANNELS.length, tiles: 15, river: river.length, moda };
}
