#!/usr/bin/env node
/**
 * AKTUAL MEDIA — središnji pregled (pločice 3×3).
 *
 * Gradi veliki blok na /gnk-aktual/ koji na jednom mjestu pokazuje sve što
 * AKTUAL MEDIA ima. Pločice su prave naslovnice: naziv izdanja, zemlja, jezik
 * i rečenica "što klikom dobijete" ispisani su u samoj slici (tiles.mjs), a
 * isti tekst stoji u alt atributu i aria-labelu, pa je čitljiv i strojevima.
 *
 *  01  Izdanja po zemljama   — 3 × 3 (osam gradova + BUSINESS TJEDNIK)
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
  bukurest: 'AKTUAL MEDIA KANAL BUCUREȘTI — Rumunjska, rumunjski. Agerpres, HotNews, Ziarul Financiar i Profit.ro: ekonomija. Klik otvara izdanje.'
};

const DESK_ALT = {
  sport: 'Sport — desk AKTUAL MEDIA s rezultatima i osvrtima iz svih osam kanala. Klik otvara sportski desk.',
  politika: 'Politika — desk AKTUAL MEDIA: ista odluka u osam zemalja ne izgleda jednako. Klik otvara politički desk.',
  sigurnost: 'Sigurnost — desk AKTUAL MEDIA: obavještajne teme, kibernetika i preuzimanja. Klik otvara sigurnosni desk.',
  biznis: 'Business — desk AKTUAL MEDIA: tržišta, bilance i kapital iz osam zemalja. Klik otvara business desk.',
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
      <img class="amc-tile-img" src="${IMG}/${esc(img)}" alt="${esc(alt)}" width="880" height="587" loading="lazy" decoding="async">
      ${badge ? `<span class="amc-tile-badge">${esc(badge)}</span>` : ''}
      <span class="amc-tile-go" aria-hidden="true">→</span>
    </a>
    ${foot}
  </li>`;
}

function cityTiles(cards) {
  return CHANNELS.map((c) => {
    const card = cards.find((x) => x.id === c.id) || {};
    return tile({
      href: c.base, img: `${c.id}-tile.webp`, alt: CITY_ALT[c.id] || `${c.title} — klik otvara izdanje.`,
      external: true, badge: card.count ? `${card.count} tekstova` : '',
      sub: { href: `${c.base}mravinjak/`, label: 'Mravinjak', cta: card.count ? `svih ${card.count} naslova` : 'svi naslovi' }
    });
  }).join('');
}

function deskTiles(items, gallery) {
  const DESK_RE = {
    moda: MODA_RE,
    putovanja: /putovanj|turiz|hotel|destinacij|plaž|plaz|letov|krstar|aviokart|aerodrom|viza|izlet|advent|sezon|gostiju|noćenj|nocenj|kampu|kamp|planinar|bicikl|vlak|trajekt/i,
    ljubimci: /ljubimc|kućni ljubim|kucni ljubim|veterinar|udomlj|životinj|zivotinj|azil|kinolog|pas\b|psa\b|pse\b|psima|mačk|mack|ptic|akvarij|čipir|cipir|steriliz/i,
    svijet: /svijet|svet\b|global|europ|\beu\b|nato|kijev|ukrajin|gaza|izrael|iran|\bsad\b|amerik|kina|kinesk|rusij|moskv|trump|putin|migracij|klim|opec|naft|tarif|carin|vijeće sigurnosti/i
  };
  const count = (id) => DESK_RE[id]
    ? items.filter((i) => DESK_RE[id].test(`${i.title} ${i.summary}`)).length
    : items.filter((i) => i.theme === ({ sport: 'sport', politika: 'politika', sigurnost: 'sigurnost', biznis: 'ekonomija', tehnologija: 'ai' }[id] || '')).length;
  const desks = ['sport', 'politika', 'sigurnost', 'biznis', 'tehnologija', 'moda', 'putovanja', 'ljubimci', 'svijet'].map((id) => tile({
    href: `/izdanja/${id}/`, img: `${id}-tile.webp`, alt: DESK_ALT[id], badge: `${count(id)} tekstova`
  })).join('');
  const extra = [
    { href: '/galerija/', img: 'galerija-tile.webp', alt: `Galerija Nermina Sefića — ${gallery.count || 63} stranica s portretima i vizualima. Klik otvara galeriju.`, badge: `${gallery.count || 63} stranica` },
    { href: '/radio/', img: 'radio-tile.webp', alt: 'AKTUAL MEDIA RADIO — diskretni player i popis javnih radijskih kuća osam zemalja. Klik otvara radio.', badge: '8 zemalja' },
    { href: '/knowledge-center/', img: 'znanje-tile.webp', alt: 'Centar znanja — odgovori o grupi, projektima i financijama s poveznicom na dokument. Klik otvara centar znanja.', badge: 'odgovori' }
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
  ljubljana: 'Ljubljana', rim: 'Rim', sofija: 'Sofija', bukurest: 'Bukurešt'
};

const RAIL_TEXT = {
  hr: {
    label: 'Naša izdanja',
    lead: 'Osam gradskih kanala na osam jezika, BUSINESS TJEDNIK i TJEDNIK MODE. Klik vodi na izdanje, a s izdanja se uvijek vraćate gumbom <strong>← AKTUAL MEDIA</strong>.',
    all: 'Sva izdanja ↓',
    platforms: 'Deskovi i platforme',
    aria: 'Naša izdanja — AKTUAL MEDIA kanali',
    open: 'otvori izdanje', texts: 'tekstova',
    names: ['Business Tjednik', 'Tjednik Mode', 'Sport', 'Politika', 'Sigurnost', 'Tehnologija', 'Business desk', 'Galerija', 'Radio']
  },
  en: {
    label: 'Our editions',
    lead: 'Eight city channels in eight languages, BUSINESS WEEKLY and FASHION WEEKLY. A click opens the edition; from every edition the <strong>← AKTUAL MEDIA</strong> button brings you back.',
    all: 'All editions ↓',
    platforms: 'Desks and platforms',
    aria: 'Our editions — AKTUAL MEDIA channels',
    open: 'open edition', texts: 'stories',
    names: ['Business Weekly', 'Fashion Weekly', 'Sport', 'Politics', 'Security', 'Technology', 'Business desk', 'Gallery', 'Radio']
  }
};


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

function regionMap(cards, lang = 'hr') {
  const W = 640, H = 420;
  const lons = Object.values(GEO).map((g) => g[0]);
  const lats = Object.values(GEO).map((g) => g[1]);
  const [x0, x1] = [Math.min(...lons) - 1.6, Math.max(...lons) + 1.6];
  const [y0, y1] = [Math.min(...lats) - 1.2, Math.max(...lats) + 1.2];
  const px = (lon) => ((lon - x0) / (x1 - x0)) * W;
  const py = (lat) => H - ((lat - y0) / (y1 - y0)) * H;

  const pins = CHANNELS.map((c) => {
    const g = GEO[c.id];
    if (!g) return '';
    const card = cards.find((x) => x.id === c.id) || {};
    const cx = px(g[0]).toFixed(1), cy = py(g[1]).toFixed(1);
    const city = CITY_SHORT[c.id] || c.city;
    const anchor = cx > W * 0.78 ? 'end' : 'start';
    const dx = anchor === 'end' ? '-14' : '14';
    return `<a class="amm-pin" href="${esc(c.base)}" aria-label="${esc(c.title)} — ${card.count || 0} ${lang === 'en' ? 'stories' : 'tekstova'} — ${lang === 'en' ? 'open edition' : 'otvori izdanje'}">
      <circle cx="${cx}" cy="${cy}" r="9"></circle>
      <circle class="amm-pulse" cx="${cx}" cy="${cy}" r="9"></circle>
      <text x="${(Number(cx) + Number(dx)).toFixed(1)}" y="${(Number(cy) + 4).toFixed(1)}" text-anchor="${anchor}">${esc(city)}</text>
      <title>${esc(c.title)} — ${card.count || 0} ${lang === 'en' ? 'stories' : 'tekstova'}</title>
    </a>`;
  }).join('');

  const list = CHANNELS.map((c) => `<li><a href="${esc(c.base)}">${esc(CITY_SHORT[c.id] || c.city)}</a></li>`).join('');
  const label = lang === 'en' ? 'Region map — pick a city' : 'Karta regije — odaberi grad';

  return `<div class="amm">
  <div class="amm-head"><span class="amm-flag">${lang === 'en' ? 'Map' : 'Karta'}</span><span>${esc(label)}</span></div>
  <svg class="amm-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
    <defs><linearGradient id="ammSea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d1c2c"/><stop offset="1" stop-color="#060f19"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#ammSea)"></rect>
    ${[...Array(9)].map((_, i) => `<line x1="0" y1="${(i * H) / 8}" x2="${W}" y2="${(i * H) / 8}" stroke="rgba(255,255,255,.05)"></line>`).join('')}
    ${[...Array(13)].map((_, i) => `<line x1="${(i * W) / 12}" y1="0" x2="${(i * W) / 12}" y2="${H}" stroke="rgba(255,255,255,.05)"></line>`).join('')}
    ${pins}
  </svg>
  <ul class="amm-list">${list}</ul>
</div>`;
}

function homeRail(cards, moda, lang = 'hr') {
  const T = RAIL_TEXT[lang] || RAIL_TEXT.hr;
  const generatedAt = new Date().toISOString();
  const circles = CHANNELS.map((c) => {
    const card = cards.find((x) => x.id === c.id) || {};
    const city = CITY_SHORT[c.id] || c.city;
    const count = card.count || 0;
    return `<li class="amx-item">
      <a class="amx-link" href="${esc(c.base)}" rel="external noopener" aria-label="${esc(c.title)} — ${esc(c.country)} — ${count} ${esc(T.texts)} — ${esc(T.open)}">
        <span class="amx-ring"><img src="${IMG}/${esc(c.id)}-440.webp" alt="${esc(c.title)} — ${esc(city)}, ${esc(c.country)}" width="440" height="440" loading="lazy" decoding="async">${count ? `<span class="amx-badge">${count}</span>` : ''}</span>
        <b>${esc(city)}</b>
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
.amx-head p{margin:0;font:400 12.5px/1.45 Georgia,serif;color:#4a4741;max-width:70ch}
.amx-head p strong{font-family:system-ui,sans-serif;font-size:11.5px;letter-spacing:.04em;white-space:nowrap}
.amx-all{margin-left:auto;font:900 10.5px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;border-bottom:2px solid #d71920;padding-bottom:4px;white-space:nowrap}
.amx-all:hover{color:#d71920}
.amx-row{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;list-style:none;margin:0;padding:16px 18px 6px}
.amx-item{min-width:0}
.amx-link{display:grid;justify-items:center;gap:7px;text-align:center;text-decoration:none}
.amx-ring{position:relative;display:block;width:100%;aspect-ratio:1;border-radius:50%;padding:4px;background:linear-gradient(140deg,#e9c66c,#b8862f 45%,#f3dfa8);box-shadow:0 8px 18px rgba(15,23,42,.16);transition:transform .22s ease,box-shadow .22s ease}
.amx-ring img{display:block;width:100%;height:100%;object-fit:cover;border-radius:50%;border:2px solid #fffdf8}
.amx-badge{position:absolute;right:-2px;bottom:4px;background:#111;color:#e9c66c;font:800 9px/1 system-ui,sans-serif;letter-spacing:.02em;padding:4px 6px;border-radius:999px;border:2px solid #fffdf8}
.amx-link b{font:900 13px/1.05 Impact,"Arial Black",system-ui,sans-serif;letter-spacing:.01em;text-transform:uppercase;color:#111}
.amx-link small{font:700 9px/1.2 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#67645e}
.amx-ago{font:700 8.5px/1.2 system-ui,sans-serif;font-style:normal;letter-spacing:.05em;color:#9a9384}
.amm{margin:6px 18px 4px;border:1px solid #111;background:#060f19;position:relative}
.amm-head{display:flex;gap:10px;align-items:center;padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.12);font:700 10.5px/1.3 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.7)}
.amm-flag{background:#e9c66c;color:#0c1015;padding:5px 8px;font-weight:900;letter-spacing:.14em}
.amm-svg{display:block;width:100%;height:auto}
.amm-pin circle{fill:#e9c66c;stroke:#060f19;stroke-width:2.5}
.amm-pin .amm-pulse{fill:none;stroke:#e9c66c;stroke-width:1.5;opacity:.5}
.amm-pin text{fill:#fff;font:800 13px/1 system-ui,sans-serif;letter-spacing:.02em;paint-order:stroke;stroke:#060f19;stroke-width:3.5}
.amm-pin:hover circle{fill:#fff}
.amm-pin:hover text{fill:#e9c66c}
.amm-list{display:none;list-style:none;margin:0;padding:10px 12px 14px;flex-wrap:wrap;gap:8px}
.amm-list a{font:800 11px/1 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#e9c66c;border:1px solid rgba(233,198,108,.4);padding:7px 9px;text-decoration:none}
@media(max-width:700px){.amm-svg{display:none}.amm-list{display:flex}}
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
  <ul class="amx-row">${circles}</ul>
  ${regionMap(cards, lang)}
  <div class="amx-platforms"><span class="amx-plabel">${esc(T.platforms)}</span>${platforms}</div>
</section>`;
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

  const stripe = [
    ['8', 'gradskih izdanja'], [String(items.length), 'tekstova u arhivi'], [String(sources.size), 'medijskih izvora'],
    [String(gallery.count || 63), 'stranica galerije'], ['8', 'jezika'], ['9', 'deskova i platformi']
  ].map(([n, l]) => `<li><b>${esc(n)}</b><span>${esc(l)}</span></li>`).join('');

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'AKTUAL MEDIA — sve na jednom mjestu',
    url: 'https://gnk-asg.hr/gnk-aktual/',
    inLanguage: 'hr',
    description: 'Osam gradskih izdanja, šest deskova, poslovni tjednik, galerija, radio i centar znanja na jednoj stranici.',
    about: { '@type': 'Organization', name: 'AKTUAL MEDIA d.o.o.', url: 'https://gnk-asg.hr/' },
    editor: { '@type': 'Person', name: 'Nermin Sefić', jobTitle: 'Urednik i direktor', url: 'https://gnk-asg.hr/nermin-sefic/' },
    hasPart: CHANNELS.map((c) => ({ '@type': 'WebSite', name: c.title, url: c.base, inLanguage: c.lang })),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: 15,
      itemListElement: [
        ...CHANNELS.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.title, url: c.base })),
        ...['sport', 'politika', 'sigurnost', 'biznis', 'tehnologija', 'moda', 'putovanja', 'ljubimci', 'svijet'].map((id, i) => ({ '@type': 'ListItem', position: 9 + i, name: id.toUpperCase(), url: `${HUB}${id}/` }))
      ]
    }
  };

  const block = `${START}
<style id="amc-style">
.am-central{--amc-ink:#f4f7fc;--amc-muted:#a9b8cc;--amc-gold:#e9c66c;--amc-line:rgba(233,198,108,.28);background:radial-gradient(1200px 600px at 12% -10%,rgba(233,198,108,.12),transparent 60%),#050d18;color:var(--amc-ink);border:1px solid rgba(233,198,108,.24);border-radius:26px;padding:clamp(16px,3.2vw,40px);margin:30px 0;font-family:inherit;overflow:hidden}
.am-central *{box-sizing:border-box}
.am-central a{color:inherit;text-decoration:none}
.amc-eyebrow{font:800 11px/1.4 Inter,system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--amc-gold);margin:0}
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
@media (prefers-reduced-motion:reduce){.amc-tile,.amc-tile-img,.amc-tile-go,.amc-btn{transition:none}.amc-tile:hover{transform:none}.amc-tile:hover .amc-tile-img{transform:none}}
</style>
<section class="am-central" id="sve-aktual-media" aria-labelledby="amcTitle">
  <div class="amc-hero">
    <div class="amc-hero-copy">
      <p class="amc-eyebrow">AKTUAL MEDIA · sve na jednom mjestu</p>
      <h2 id="amcTitle">Osam zemalja, sva izdanja, ${items.length} tekstova — na jednoj ploči</h2>
      <p class="amc-lead">Svaka pločica je naslovnica izdanja: na njoj piše što se klikom dobije, a klik vodi na glavni link — AKTUAL MEDIA KANAL Zagreb, Beograd, Sarajevo, Budapest, Ljubljana, Roma, Sofija ili București. S tih stranica uvijek se vraćate ovamo, u središte gdje se sve spaja.</p>
      <div class="amc-hero-cta">
        <a class="amc-btn amc-btn--solid" href="#izdanja-po-zemljama">Izdanja 3 × 3 ↓</a>
        <a class="amc-btn" href="#mravinjak">Mravinjak vijesti ↓</a>
        <a class="amc-btn" href="/izdanja/">Sva izdanja →</a>
      </div>
    </div>
    <a class="amc-hero-art" href="https://gnk-asg.hr/izdanja/" aria-label="AKTUAL MEDIA — sva izdanja na jednom mjestu">
      <img src="${IMG}/aktual-media-tile.webp" alt="AKTUAL MEDIA — sve što imamo: izdanja, deskovi, tjednik, galerija i radio. Središnje mjesto." width="880" height="587" loading="eager" decoding="async">
    </a>
  </div>

  <ul class="amc-stripe">${stripe}</ul>

  <section class="amc-sec" id="izdanja-po-zemljama" aria-labelledby="amcSec1">
    <div class="amc-sec-head">
      <div><span class="amc-sec-num">01 · PLOČICE 3 × 3</span><h3 id="amcSec1">Izdanja po zemljama</h3></div>
      <span class="amc-dim">8 gradova + business tjednik · klik vodi na izdanje</span>
    </div>
    <ul class="amc-grid3">${cityTiles(cards)}${tile({ href: 'https://gnk-asg-tjednik.pages.dev/', img: 'tjednik-tile.webp', alt: 'BUSINESS TJEDNIK — Lider, Jutarnji, Poslovni i Forbes kroz tjednu kritiku. Klik otvara tjednik.', external: true, badge: 'tjednik' })}</ul>
  </section>

  <section class="amc-sec" id="deskovi" aria-labelledby="amcSec2">
    <div class="amc-sec-head">
      <div><span class="amc-sec-num">02 · PLOČICE 3 × 3</span><h3 id="amcSec2">Deskovi, tjednik mode i platforme</h3></div>
      <span class="amc-dim">sport · politika · sigurnost · business · tehnologija · moda · putovanja · ljubimci · svijet</span>
    </div>
    <ul class="amc-grid3">${deskTiles(items, gallery)}</ul>
  </section>

  <section class="amc-sec" id="mravinjak" aria-labelledby="amcSec3">
    <div class="amc-sec-head">
      <div><span class="amc-sec-num">03 · MRAVINJAK · 3 × 19</span><h3 id="amcSec3">Vijesti koje vučemo k sebi</h3></div>
      <span class="amc-dim">${items.length} tekstova iz ${sources.size} medija · 8 jezika</span>
    </div>
    <div class="amc-river">${columns.map(riverColumn).join('')}</div>
    <p class="amc-note">Mravinjak je naš dnevni pogon: osam kanala čita javne feedove, sitemape i API-je svojih medija, sprema naslov, sažetak, datum i poveznicu na izvornik te iz toga gradi osvrt na način izvještavanja. Tekstovi se ne preuzimaju u cijelosti; svaki zapis vodi na izvornik, a tvrdnje izvora nisu tvrdnje redakcije. Sport ${sport} · Politika ${politics} · Sigurnost, rat i potresi ${security} · Moda i stil ${moda}.</p>
  </section>

  <section class="amc-sec" aria-labelledby="amcSec4">
    <div class="amc-sec-head">
      <div><span class="amc-sec-num">04 · DALJE</span><h3 id="amcSec4">Gdje još možete otići</h3></div>
      <span class="amc-dim">tabloidi · arhiva · alati</span>
    </div>
    <ul class="amc-footlink">
      <li><a href="/izdanja/">Naša izdanja</a></li>
      <li><a href="/objave/">Objave</a></li>
      <li><a href="/komentari/">Komentari</a></li>
      <li><a href="/autorske-objave/">Autorske objave</a></li>
      <li><a href="/galerija/">Galerija Nermina Sefića</a></li>
      <li><a href="/radio/">AKTUAL MEDIA RADIO</a></li>
      <li><a href="/knowledge-center/">Centar znanja</a></li>
      <li><a href="/digital-workforce/">Digitalna radna snaga</a></li>
      <li><a href="https://gnk-asg-tjednik.pages.dev/" rel="external noopener">BUSINESS TJEDNIK ↗</a></li>
      <li><a href="https://gnk-asg-tjednik.pages.dev/tjednik/2026-W43/" rel="external noopener"><strong>Tjednik 2026-W43 — ovaj tjedan ↗</strong></a></li>
      <li><a href="https://gnk-asg-tjednik.pages.dev/izvori/lider/" rel="external noopener">Lider ↗</a></li>
      <li><a href="https://gnk-asg-tjednik.pages.dev/izvori/jutarnji/" rel="external noopener">Jutarnji list ↗</a></li>
      <li><a href="https://gnk-asg-tjednik.pages.dev/izvori/poslovni/" rel="external noopener">Poslovni dnevnik ↗</a></li>
      <li><a href="https://gnk-asg-tjednik.pages.dev/izvori/forbes/" rel="external noopener">Forbes ↗</a></li>
    </ul>
  </section>

  <section class="amc-sec" aria-labelledby="amcSec5">
    <div class="amc-sec-head">
      <div><span class="amc-sec-num">05 · OZNAKE</span><h3 id="amcSec5">Hashtagovi izdanja</h3></div>
      <span class="amc-dim">#NerminSefić · #NerminSefic · #SeficNermin · #SEFICNERMIN</span>
    </div>
    <ul class="amc-tags">${HASHTAGS.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
    <p class="amc-note">Urednik i direktor izdanja je <strong>Nermin Sefić</strong>. Za autora se koriste oznake #NerminSefić, #NerminSefic, #SeficNermin i #SEFICNERMIN. Kontakt: <a href="mailto:info@gnk-asg.hr">info@gnk-asg.hr</a>.</p>
  </section>
</section>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
${END}`;

  if (html.includes(START) && html.includes(END)) {
    html = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), () => block);
  } else if (html.includes(SLOT)) {
    html = html.replace(SLOT, block);
  } else {
    const anchor = '<!-- IZDANJA-BAND:END -->';
    if (!html.includes(anchor)) return { ok: false, reason: 'nema IZDANJA-BAND markera' };
    html = html.replace(anchor, `${anchor}\n${block}`);
  }

  const desc = `AKTUAL MEDIA na jednoj ploči: 8 gradskih izdanja na 8 jezika, ${items.length} tekstova iz ${sources.size} medija, šest deskova, poslovni tjednik, moda, galerija i radio. Urednik i direktor: Nermin Sefić.`;
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(truncate(desc, 300))}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(truncate(desc, 300))}">`);

  /* Traka krugova ide odmah ispod rubrika, prije vijesti. */
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
    writeFileSync(EN, en);
  }

  return { ok: true, items: items.length, sources: sources.size, channels: CHANNELS.length, tiles: 15, river: river.length, moda };
}
