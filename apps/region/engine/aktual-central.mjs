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
import { logoFor, logoAlternate, logoJsonLd } from './brand.mjs';

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
    names: ['Business Tjednik', 'Tjednik Mode', 'Sport', 'Politika', 'Sigurnost', 'Tehnologija', 'Putovanja', 'Ljubimci', 'Svijet', 'Business desk', 'Galerija', 'Radio']
  },
  en: {
    label: 'Our editions',
    lead: 'Eight city channels in eight languages, BUSINESS WEEKLY and FASHION WEEKLY. A click opens the edition; from every edition the <strong>← AKTUAL MEDIA</strong> button brings you back.',
    all: 'All editions ↓',
    platforms: 'Desks and platforms',
    aria: 'Our editions — AKTUAL MEDIA channels',
    open: 'open edition', texts: 'stories',
    names: ['Business Weekly', 'Fashion Weekly', 'Sport', 'Politics', 'Security', 'Technology', 'Travel', 'Pets', 'World', 'Business desk', 'Gallery', 'Radio']
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

const AMM_C = {
  zagreb: '#e9c66c', beograd: '#7fb2ff', sarajevo: '#7ee0a1', budimpesta: '#ff9f6e',
  ljubljana: '#c79bff', rim: '#ff7d7d', sofija: '#6fe0d6', bukurest: '#f2a8d0'
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

  const counted = CHANNELS.map((c) => ({ c, count: (cards.find((x) => x.id === c.id) || {}).count || 0 }));
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
      <p class="amm-count"><b>${nf(total)}</b> ${EN ? 'stories' : 'tekstova'} <span>·</span> <b>${cityCount}</b> ${EN ? 'cities' : 'gradova'} <span>·</span> <b>8</b> ${EN ? 'languages' : 'jezika'}</p>
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
        ? 'Eight cities, eight languages, one network. Every card opens the edition; every edition returns here.'
        : 'Osam gradova, osam jezika, jedna mreža. Svaka kartica otvara izdanje, a svako izdanje vraća ovamo.'}</p>
    </div>
    <div class="amm-foot">
      <a href="/kanal/">${EN ? 'All channels' : 'Svi kanali'} →</a>
      <a href="/izdanja/">${EN ? 'All editions' : 'Sva izdanja'} →</a>
      <a href="/radio/">Radio →</a>
      <a href="/top-teme/">${EN ? 'Top topics' : 'Top teme'} →</a>
      <a href="/medijska-kritika/">${EN ? 'Media critique' : 'Kritika medija'} →</a>
      <a class="amm-w43" href="https://gnk-asg-tjednik.pages.dev/tjednik/2026-W43/">Tjednik 2026-W43 →</a>
      <a href="/usa/">USA →</a>
      <span class="amm-foot-note">${EN ? 'USA → region → 8 cities' : 'USA → regija → 8 gradova'}</span>
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

  const stripe = [
    ['8', 'gradskih izdanja'], [String(items.length), 'tekstova u arhivi'], [String(sources.size), 'medijskih izvora'],
    [String(gallery.count || 63), 'stranica galerije'], ['8', 'jezika'], ['9', 'deskova i platformi']
  ].map(([n, l]) => `<li><b>${esc(n)}</b><span>${esc(l)}</span></li>`).join('');

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
  const masterMark = () => {
    const hr = logoFor('aktual-media-hr');
    const en = logoFor('aktual-media-en');
    if (!hr || !en) return '';
    return `<div class="amc-marks">
      <a class="amc-mark amc-mark--hr" href="/gnk-aktual/" aria-label="AKTUAL MEDIA — hrvatsko izdanje"><img src="${hr.webp}" alt="${esc(hr.title)} — ${esc(hr.tagline)}" width="420" height="121" loading="eager" decoding="async" fetchpriority="high"></a>
      <a class="amc-mark amc-mark--en" href="/en/gnk-aktual/" hreflang="en" lang="en" aria-label="AKTUAL MEDIA — world edition"><img src="${en.webp}" alt="${esc(en.title)} — ${esc(en.tagline)}" width="300" height="86" loading="lazy" decoding="async"></a>
    </div>`;
  };

  const block = `${START}
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
      ${masterMark()}
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
    /* Engleska stranica ima svoj masthead (drukčiji od hrvatskog bloka), pa
       znak ide u .am-brand — iznad natpisa "World edition". Isti par znakova
       kao na HR stranici, samo obrnutim redom: EN je glavni, HR vodi natrag. */
    const hrLogo = logoFor('aktual-media-hr');
    const enLogo = logoFor('aktual-media-en');
    if (hrLogo && enLogo && !en.includes('am-mast-logo')) {
      const mark = `<a class="am-mast-logo" href="/en/gnk-aktual/" hreflang="en" lang="en" aria-label="AKTUAL MEDIA — world edition">
        <img src="${enLogo.webp}" alt="${esc(enLogo.title)} — ${esc(enLogo.tagline)}" width="420" height="121" loading="eager" decoding="async" fetchpriority="high">
      </a>`;
      const enAt = en.indexOf('<span class="am-brand-kicker">World edition</span>');
      if (enAt > 0) {
        en = en.slice(0, enAt) + mark + en.slice(enAt);
        if (!en.includes('.am-mast-logo{')) {
          en = en.replace('</style>', `.am-mast-logo{display:block;max-width:420px;margin:0 0 12px;line-height:0;border-radius:10px;overflow:hidden}
.am-mast-logo img{display:block;width:100%;height:auto}
@media(max-width:620px){.am-mast-logo{max-width:300px}}
</style>`);
        }
      }
    }
    en = addPerf(addLogoAlternates(en, ['aktual-media-en', 'aktual-media-hr']));
    en = strengthenAktualBrand(en, 'en', jsonld);
    writeFileSync(EN, en);
  }

  return { ok: true, items: items.length, sources: sources.size, channels: CHANNELS.length, tiles: 15, river: river.length, moda };
}
