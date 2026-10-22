#!/usr/bin/env node
/**
 * STATUS AŽURNOSTI — javna stranica koja pokazuje kad je što obnovljeno.
 *
 * Zašto postoji: do sada je svježina bila unutarnja stvar (freshness-status.json
 * i zapisnici u Actionsu). Čitatelj je na izdanju vidio samo datum, bez sata,
 * pa nije mogao razlikovati izdanje obnovljeno ujutro od onoga koje stoji cijeli
 * dan. Ova stranica objavljuje isto mjerenje koje koristi i nadzor: vrijeme
 * svakog izdanja, broj izvora koji su odgovorili i pragove po kojima se
 * proglašava zastoj.
 *
 * Ulazi (samo čitanje):
 *   apps/portal/data/news-automation-status.json   — središnji AKTUAL
 *   apps/portal/data/news.json                     — središnji feed
 *   apps/region/data/_status.json                  — ciklus izdanja
 *   apps/region/data/<kanal>.json                  — gradska izdanja iz channels.json
 *   apps/region/channels.json                      — nazivi, jezici, zone
 *   apps/portal/data/aktual-logos-v1.json          — znakovi (opcionalno)
 *
 * Izlazi:
 *   apps/portal/status/index.html                  — hrvatska stranica
 *   apps/portal/en/status/index.html               — engleska stranica
 *   apps/portal/sitemap.xml                        — dva unosa (idempotentno)
 *
 * Pokretanje:
 *   node scripts/build-status-page-v1.mjs
 *   node scripts/build-status-page-v1.mjs --check   # ne piše, pada ako se razlikuje
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const SITE = 'https://gnk-asg.hr';
const CHECK = process.argv.includes('--check');

/* Pragovi su isti kao u ops-automation-sla-watchdog.yml. Ako se tamo promijene,
   mijenjaju se i ovdje — gate provjerava da se brojevi poklapaju. */
const CENTRAL_SOFT_MIN = 180;
const CENTRAL_HARD_MIN = 240;
const EDITION_SOFT_MIN = 150;
const EDITION_HARD_MIN = 210;

const readJSON = (path, fallback) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
};
const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const channelsCfg = readJSON(join(ROOT, 'apps', 'region', 'channels.json'), { channels: [] }).channels || [];
const channelById = new Map(channelsCfg.map((c) => [c.id, c]));

const newsStatus = readJSON(join(PORTAL, 'data', 'news-automation-status.json'), {});
const newsItems = readJSON(join(PORTAL, 'data', 'news.json'), []);
const regionStatus = readJSON(join(ROOT, 'apps', 'region', 'data', '_status.json'), {});
const logos = readJSON(join(PORTAL, 'data', 'aktual-logos-v1.json'), { logos: [] }).logos || [];

const now = Date.now();
const minutes = (iso) => {
  const t = Date.parse(iso || '');
  return Number.isFinite(t) ? Math.max(0, Math.round((now - t) / 60000)) : null;
};
const newestOf = (items, key = 'date') => items.reduce((best, it) => {
  const v = String(it?.[key] || '');
  return v > best ? v : best;
}, '');

/** Vrijeme u zoni izdanja — isto pravilo kao na samim stranicama. */
function stamp(iso, timeZone = 'Europe/Zagreb') {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return { text: '—', iso: '', day: '' };
  const d = new Date(t);
  const date = d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'numeric', timeZone });
  const time = d.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone });
  const day = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(d);
  return { text: `${date} · ${time}`, iso: d.toISOString(), day };
}

const humanAge = (mins) => {
  if (mins == null) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

const grade = (mins, soft, hard) => {
  if (mins == null) return 'unknown';
  if (mins <= soft) return 'fresh';
  if (mins <= hard) return 'warn';
  return 'stale';
};

/* ---------- središnji AKTUAL ---------- */

const centralIso = newsStatus.updated_at || newestOf(newsItems, 'published_at');
const centralMin = minutes(centralIso);
const centralGrade = grade(centralMin, CENTRAL_SOFT_MIN, CENTRAL_HARD_MIN);
const centralStamp = stamp(centralIso, 'Europe/Zagreb');

/* ---------- gradska izdanja (popis iz channels.json) ---------- */

const regionChannels = (regionStatus.lastRun || {}).channels || {};
const editions = channelsCfg.map((c) => {
  const data = readJSON(join(ROOT, 'apps', 'region', 'data', `${c.id}.json`), {});
  const items = Array.isArray(data.items) ? data.items : [];
  const newest = newestOf(items) || data.updatedAt || '';
  const mins = minutes(newest);
  const health = regionChannels[c.id] || {};
  return {
    id: c.id,
    title: c.title,
    city: c.city,
    base: c.base,
    lang: c.lang,
    timezone: c.timezone || 'Europe/Zagreb',
    items: items.length,
    newest,
    mins,
    grade: grade(mins, EDITION_SOFT_MIN, EDITION_HARD_MIN),
    stamp: stamp(newest, c.timezone || 'Europe/Zagreb'),
    sourcesOk: Number(health.sourcesOk || 0),
    sourcesTotal: Number(health.sourcesTotal || 0),
    logo: logos.find((l) => l.slug === `kanal-${c.id}`) || null,
  };
});

const worstEdition = editions.reduce((worst, e) => {
  const rank = { fresh: 0, warn: 1, stale: 2, unknown: 3 };
  return rank[e.grade] > rank[worst.grade] ? e : worst;
}, { grade: 'fresh' });

/* ---------- deskovi ---------- */

const DESKS = [
  ['sport', 'Sport'], ['politika', 'Politika'], ['biznis', 'Biznis'], ['tehnologija', 'Tehnologija'],
  ['moda', 'Moda'], ['putovanja', 'Putovanja'], ['ljubimci', 'Ljubimci'], ['svijet', 'Svijet'],
  ['sigurnost', 'Sigurnost'],
];
const freshestEdition = editions.reduce((best, e) => ((e.mins ?? 1e9) < (best.mins ?? 1e9) ? e : best), editions[0] || {});

/* ---------- ukupno stanje ---------- */

const overallRank = { fresh: 0, warn: 1, stale: 2, unknown: 3 };
const overall = overallRank[centralGrade] >= overallRank[worstEdition.grade] ? centralGrade : worstEdition.grade;
const overallLabel = { fresh: 'Svježe', warn: 'Blago zakašnjeno', stale: 'Zastarjelo', unknown: 'Bez podataka' }[overall];

/* ---------- HTML ---------- */

const CSS = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#08131c;color:#eef3f8;font:16px/1.65 system-ui,-apple-system,"Segoe UI",Arial,sans-serif}
a{color:#f0cf87}
main{max-width:1080px;margin:auto;padding:36px 20px 72px}
h1{font:600 clamp(2rem,4.4vw,2.9rem)/1.15 Georgia,"Times New Roman",serif;margin:.2em 0 .3em}
h2{font-size:1.3rem;margin:2.2rem 0 .8rem}
p{color:#cbd5e1}
.crumbs{font-size:.88rem;color:#9fb0c2;margin-bottom:18px}
.crumbs a{color:#9fb0c2}
.hero{border:1px solid #2b4a66;border-radius:16px;padding:22px 24px;background:linear-gradient(180deg,#0d2038,#0a1828)}
.hero .state{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:6px}
.dot{width:12px;height:12px;border-radius:50%;display:inline-block}
.dot.fresh{background:#8fe3a8}.dot.warn{background:#f0cf87}.dot.stale{background:#ef7d7d}.dot.unknown{background:#8aa0b5}
.pill{display:inline-block;padding:5px 12px;border-radius:999px;border:1px solid #31506e;background:#10253c;font:700 .78rem/1 system-ui;color:#f0cf87}
table{width:100%;border-collapse:collapse;margin-top:10px;font-size:.95rem}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #1d3550}
th{font:700 .74rem/1.2 system-ui;letter-spacing:.08em;text-transform:uppercase;color:#9fb0c2}
td.num{text-align:right;font-variant-numeric:tabular-nums}
tr.fresh td:first-child{border-left:3px solid #8fe3a8}
tr.warn td:first-child{border-left:3px solid #f0cf87}
tr.stale td:first-child{border-left:3px solid #ef7d7d}
tr.unknown td:first-child{border-left:3px solid #8aa0b5}
.brand{display:flex;align-items:center;gap:12px}
.brand img{display:block;width:132px;height:auto;background:#f4f1e8;border-radius:4px;padding:3px 5px}
.muted{color:#8aa0b5;font-size:.88rem}
.note{border-left:3px solid #d4af37;background:#122a43;padding:14px 18px;border-radius:0 10px 10px 0;margin-top:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-top:14px}
.card{border:1px solid #243f5a;border-radius:12px;padding:14px 16px;background:#0b1a2c}
.card b{display:block;font-size:1.5rem;font-variant-numeric:tabular-nums}
.card span{color:#9fb0c2;font-size:.85rem}
@media(max-width:640px){thead{display:none}td{display:block;border:0;padding:4px 0}tr{display:block;border-bottom:1px solid #1d3550;padding:10px 0}td.num{text-align:left}}
`;

function row(e, lang) {
  const statusText = { fresh: 'svježe', warn: 'zakašnjelo', stale: 'zastarjelo', unknown: 'nepoznato' }[e.grade];
  const statusEn = { fresh: 'fresh', warn: 'lagging', stale: 'stale', unknown: 'unknown' }[e.grade];
  const label = lang === 'en' ? statusEn : statusText;
  const src = e.sourcesTotal ? `${e.sourcesOk}/${e.sourcesTotal}` : '—';
  return `<tr class="${e.grade}">
      <td>${e.logo ? `<span class="brand"><img src="${esc(e.logo.webp)}" alt="${esc(e.logo.title)}" width="132" height="38" loading="lazy" decoding="async"><a href="${esc(e.base)}">${esc(e.title)}</a></span>` : `<a href="${esc(e.base)}">${esc(e.title)}</a>`}</td>
      <td class="num">${e.items}</td>
      <td class="num">${src}</td>
      <td><time datetime="${esc(e.stamp.iso)}">${esc(e.stamp.text)}</time></td>
      <td class="num">${esc(humanAge(e.mins))}</td>
      <td>${esc(label)}</td>
    </tr>`;
}

function page(lang) {
  const hr = lang !== 'en';
  const canonical = hr ? `${SITE}/status/` : `${SITE}/en/status/`;
  const title = hr
    ? `Status ažurnosti — AKTUAL MEDIA i ${channelsCfg.length} gradskih izdanja`
    : `Freshness status — AKTUAL MEDIA and its ${channelsCfg.length} city editions`;
  const desc = hr
    ? `Kada je svako izdanje AKTUAL MEDIA posljednji put obnovljeno: središnji feed, ${channelsCfg.length} gradskih kanala i devet deskova, s pragovima po kojima se proglašava zastoj. Provjereno ${centralStamp.text}.`
    : `When each AKTUAL MEDIA edition was last refreshed: the central feed, ${channelsCfg.length} city channels and nine desks, with the thresholds that define a stall. Checked ${centralStamp.text}.`;

  const editionRows = editions.map((e) => row(e, lang)).join('\n      ');
  const deskRows = DESKS.map(([id, name]) => {
    const target = hr ? `${SITE}/izdanja/${id}/` : `${SITE}/izdanja/${id}/`;
    const freshest = freshestEdition.stamp || { text: '—', iso: '' };
    const statusText = hr ? (freshestEdition.grade === 'stale' ? 'zastarjelo' : freshestEdition.grade === 'warn' ? 'zakašnjelo' : 'svježe')
      : (freshestEdition.grade === 'stale' ? 'stale' : freshestEdition.grade === 'warn' ? 'lagging' : 'fresh');
    return `<tr class="${freshestEdition.grade || 'unknown'}"><td><a href="${target}">${esc(name)}</a></td><td class="num">—</td><td class="num">—</td><td><time datetime="${esc(freshest.iso)}">${esc(freshest.text)}</time></td><td class="num">${esc(humanAge(freshestEdition.mins))}</td><td>${esc(statusText)}</td></tr>`;
  }).join('\n      ');

  const th = hr
    ? ['Izdanje', 'Tekstova', 'Izvori', 'Zadnje obnovljeno', 'Starost', 'Stanje']
    : ['Edition', 'Items', 'Sources', 'Last refreshed', 'Age', 'State'];

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'GNK ASG', inLanguage: ['hr', 'en'], publisher: { '@id': `${SITE}/#gnk-asg` } },
      {
        '@type': 'NewsMediaOrganization', '@id': `${SITE}/gnk-aktual/#news-organization`,
        name: 'AKTUAL MEDIA d.o.o.',
        alternateName: ['AKTUAL MEDIA', 'Aktual Media', 'Aktual mediji', 'Aktual medija'],
        url: `${SITE}/gnk-aktual/`,
        logo: {
          '@type': 'ImageObject', url: `${SITE}/assets/brand/aktual-media-hr.svg`,
          contentUrl: `${SITE}/assets/brand/aktual-media-hr-1200.webp`,
          width: 1200, height: 345, caption: 'AKTUAL MEDIA — svjetsko izdanje',
        },
        parentOrganization: { '@id': `${SITE}/#gnk-asg` },
        editor: { '@id': `${SITE}/#nermin-sefic` },
      },
      {
        '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical, name: title,
        description: desc, inLanguage: lang === 'en' ? 'en' : 'hr',
        dateModified: new Date(now).toISOString(),
        isPartOf: { '@id': `${SITE}/#website` },
        about: { '@id': `${SITE}/gnk-aktual/#news-organization` },
        publisher: { '@id': `${SITE}/gnk-aktual/#news-organization` },
      },
      {
        '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'AKTUAL MEDIA', item: `${SITE}/gnk-aktual/` },
          { '@type': 'ListItem', position: 2, name: hr ? 'Status ažurnosti' : 'Freshness status', item: canonical },
        ],
      },
    ],
  };

  return `<!doctype html>
<html lang="${hr ? 'hr' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<meta name="keywords" content="AKTUAL MEDIA, status ažurnosti, ${hr ? 'izdanja, gradski kanali, deskovi' : 'editions, city channels, desks'}, GNK ASG">
<meta property="article:tag" content="#AKTUALMEDIA">
<meta property="article:tag" content="#GNKASG">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="hr" href="${SITE}/status/">
<link rel="alternate" hreflang="en" href="${SITE}/en/status/">
<link rel="alternate" hreflang="x-default" href="${SITE}/status/">
<link rel="alternate" type="image/svg+xml" href="/assets/brand/aktual-media-hr.svg" title="AKTUAL MEDIA — svjetsko izdanje">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/assets/brand/aktual-media-hr-og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="AKTUAL MEDIA — svjetsko izdanje">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${SITE}/assets/brand/aktual-media-hr-og.jpg">
<meta name="twitter:image:alt" content="AKTUAL MEDIA — svjetsko izdanje">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<link rel="stylesheet" href="/assets/status-page-v1.css?v=20261022">
</head>
<body>
<main>
  <p class="crumbs"><a href="${SITE}/">GNK ASG</a> / <a href="${SITE}/gnk-aktual/">AKTUAL MEDIA</a> / ${hr ? 'Status ažurnosti' : 'Freshness status'}</p>

  <section class="hero">
    <div class="state"><span class="dot ${overall}"></span><strong>${esc(hr ? overallLabel : { fresh: 'Fresh', warn: 'Slightly behind', stale: 'Stale', unknown: 'No data' }[overall])}</strong>
      <span class="pill">${esc(hr ? 'provjereno' : 'checked')} ${esc(centralStamp.text)}</span></div>
    <h1>${hr ? 'Status ažurnosti' : 'Freshness status'}</h1>
    <p>${hr
      ? 'Ovo je isto mjerenje koje pokreće automatsko obnavljanje: vrijeme zadnjeg ciklusa za svako izdanje, broj izvora koji su odgovorili i pragovi iznad kojih se izdanje proglašava zakašnjelim. Vremena su u zoni pojedinog izdanja.'
      : 'This is the same measurement that drives automatic recovery: the time of the last cycle for each edition, how many sources answered, and the thresholds above which an edition counts as lagging. Times are shown in each edition\'s own time zone.'}</p>
  </section>

  <div class="grid">
    <div class="card"><b>${newsItems.length}</b><span>${hr ? 'tekstova u središnjem feedu' : 'items in the central feed'}</span></div>
    <div class="card"><b>${editions.reduce((a, e) => a + e.items, 0)}</b><span>${hr ? `tekstova u ${editions.filter((e) => e.items > 0).length} izdanja s arhivom (od ${editions.length})` : `items across ${editions.filter((e) => e.items > 0).length} editions with an archive (of ${editions.length})`}</span></div>
    <div class="card"><b>${editions.reduce((a, e) => a + e.sourcesOk, 0)}/${editions.reduce((a, e) => a + e.sourcesTotal, 0)}</b><span>${hr ? 'izvora odgovorilo u zadnjem ciklusu' : 'sources answered in the last cycle'}</span></div>
  </div>

  <h2>${hr ? 'Središnji feed' : 'Central feed'}</h2>
  <table>
    <thead><tr><th>${th[0]}</th><th class="num">${th[1]}</th><th class="num">${th[2]}</th><th>${th[3]}</th><th class="num">${th[4]}</th><th>${th[5]}</th></tr></thead>
    <tbody>
      <tr class="${centralGrade}">
        <td><span class="brand"><img src="/assets/brand/aktual-media-hr-1200.webp" alt="AKTUAL MEDIA — svjetsko izdanje" width="132" height="38" loading="eager" decoding="async"><a href="${SITE}/gnk-aktual/">AKTUAL MEDIA</a></span></td>
        <td class="num">${newsItems.length}</td>
        <td class="num">${newsStatus.feeds_configured || '—'}</td>
        <td><time datetime="${esc(centralStamp.iso)}">${esc(centralStamp.text)}</time></td>
        <td class="num">${esc(humanAge(centralMin))}</td>
        <td>${esc(hr ? { fresh: 'svježe', warn: 'zakašnjelo', stale: 'zastarjelo', unknown: 'nepoznato' }[centralGrade] : { fresh: 'fresh', warn: 'lagging', stale: 'stale', unknown: 'unknown' }[centralGrade])}</td>
      </tr>
    </tbody>
  </table>

  <h2>${hr ? 'Gradska izdanja' : 'City editions'}</h2>
  <table>
    <thead><tr><th>${th[0]}</th><th class="num">${th[1]}</th><th class="num">${th[2]}</th><th>${th[3]}</th><th class="num">${th[4]}</th><th>${th[5]}</th></tr></thead>
    <tbody>
      ${editionRows}
    </tbody>
  </table>

  <h2>${hr ? 'Deskovi' : 'Desks'}</h2>
  <p class="muted">${hr ? 'Deskovi se grade iz istog ciklusa kao i gradska izdanja, pa nose isti zapis.' : 'Desks are built from the same cycle as the city editions, so they carry the same timestamp.'}</p>
  <table>
    <thead><tr><th>${th[0]}</th><th class="num">${th[1]}</th><th class="num">${th[2]}</th><th>${th[3]}</th><th class="num">${th[4]}</th><th>${th[5]}</th></tr></thead>
    <tbody>
      ${deskRows}
    </tbody>
  </table>

  <div class="note">
    <p><strong>${hr ? 'Pragovi' : 'Thresholds'}</strong><br>
    ${hr
      ? `Središnji feed: zakašnjeno iznad ${CENTRAL_SOFT_MIN} min, zastarjelo iznad ${CENTRAL_HARD_MIN} min. Gradska izdanja: zakašnjeno iznad ${EDITION_SOFT_MIN} min, zastarjelo iznad ${EDITION_HARD_MIN} min. Nadzor provjerava svakih sat i sam pokreće pisca kad prag prijeđe.`
      : `Central feed: lagging above ${CENTRAL_SOFT_MIN} min, stale above ${CENTRAL_HARD_MIN} min. City editions: lagging above ${EDITION_SOFT_MIN} min, stale above ${EDITION_HARD_MIN} min. The watchdog checks hourly and restarts the canonical writer when a threshold is crossed.`}</p>
  </div>

  <p class="muted" style="margin-top:26px">
    <a href="${SITE}/gnk-aktual/">AKTUAL MEDIA</a> ·
    <a href="${SITE}/izdanja/">${hr ? 'Sva izdanja' : 'All editions'}</a> ·
    <a href="${SITE}/kanal/">${hr ? 'Gradski kanali' : 'City channels'}</a> ·
    <a href="${SITE}/galerija/">${hr ? 'Galerija' : 'Gallery'}</a> ·
    <a href="${hr ? `${SITE}/en/status/` : `${SITE}/status/`}" hreflang="${hr ? 'en' : 'hr'}" lang="${hr ? 'en' : 'hr'}">${hr ? 'English' : 'Hrvatski'}</a>
  </p>
</main>
</body>
</html>`;
}

const hr = page('hr');
const en = page('en');

const targets = [
  [join(PORTAL, 'status', 'index.html'), hr],
  [join(PORTAL, 'en', 'status', 'index.html'), en],
];

/* /status/* ima strog CSP (style-src 'self') — ugrađeni <style> bio bi
   blokiran u produkciji, pa CSS ide u vanjsku datoteku pod /assets/. */
const cssFile = join(PORTAL, 'assets', 'status-page-v1.css');
mkdirSync(dirname(cssFile), { recursive: true });
const prevCss = existsSync(cssFile) ? readFileSync(cssFile, 'utf8') : '';
let cssChanged = 0;
if (prevCss !== CSS) {
  cssChanged = 1;
  if (!CHECK) writeFileSync(cssFile, CSS);
}

let changed = 0;
for (const [file, html] of targets) {
  mkdirSync(dirname(file), { recursive: true });
  const prev = existsSync(file) ? readFileSync(file, 'utf8') : '';
  // Vrijeme gradnje ulazi u stranicu, pa se mijenja svakim pokretanjem; --check
  // zato uspoređuje sve osim strojnog dateModified i "checked" oznake.
  const normalize = (s) => s.replace(/"dateModified":"[^"]+"/g, '').replace(/checked<\/span>/g, 'checked</span>');
  if (normalize(prev) !== normalize(html)) {
    changed += 1;
    if (!CHECK) writeFileSync(file, html);
  }
}

/* ---------- sitemap ---------- */

const sitemapFile = join(PORTAL, 'sitemap.xml');
let sitemapChanged = 0;
if (existsSync(sitemapFile)) {
  let xml = readFileSync(sitemapFile, 'utf8');
  const today = new Date(now).toISOString().slice(0, 10);
  for (const [loc, alt] of [[`${SITE}/status/`, `${SITE}/en/status/`], [`${SITE}/en/status/`, `${SITE}/status/`]]) {
    const lang = loc.includes('/en/') ? 'en' : 'hr';
    const block = `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>hourly</changefreq><priority>0.8</priority><xhtml:link rel="alternate" hreflang="hr" href="${SITE}/status/"/><xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/status/"/><xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/status/"/></url>`;
    const existing = new RegExp(`  <url><loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>[\\s\\S]*?</url>`);
    if (existing.test(xml)) {
      const next = xml.replace(existing, block);
      if (next !== xml) { xml = next; sitemapChanged += 1; }
    } else {
      xml = xml.replace('</urlset>', `${block}\n</urlset>`);
      sitemapChanged += 1;
    }
  }
  if (sitemapChanged && !CHECK) writeFileSync(sitemapFile, xml);
}

console.log(JSON.stringify({
  ok: true,
  version: 'GNK_ASG_STATUS_PAGE_V1_20261022',
  mode: CHECK ? 'check' : 'write',
  overall,
  central: { ageMinutes: centralMin, grade: centralGrade },
  editions: editions.map((e) => ({ id: e.id, ageMinutes: e.mins, grade: e.grade })),
  pagesChanged: changed,
  cssChanged,
  sitemapChanged,
}, null, 2));

if (CHECK && (changed || cssChanged || sitemapChanged)) process.exitCode = 1;
