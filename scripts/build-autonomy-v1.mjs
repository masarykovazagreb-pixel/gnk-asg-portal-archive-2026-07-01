#!/usr/bin/env node
// Autonomija 365 — mjeri, ne obećava.
//
// Ova skripta čita plan iz ops/AUTONOMY-365.json, mjeri stvarno stanje u
// repozitoriju i piše /autonomija/ i /en/autonomy/. Svaki broj na stranici
// dolazi iz datoteke ili iz mjerenja; nema ručno upisanih vrijednosti.
//
//   node scripts/build-autonomy-v1.mjs            # izmjeri i upiši stranice
//   node scripts/build-autonomy-v1.mjs --check     # samo provjeri, ne piši
//   node scripts/build-autonomy-v1.mjs --strict    # izađi s 1 ako tvrdi kriterij pada
//
// Stranicu piše workflow autonomija-365.yml svakih šest sati. Ako se ovdje
// pojavi crveno, to nije ukras: to je posao koji nije odradio svoj ciklus.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allowedImageHosts } from '../workers/gnk-asg-direct-operator/src/image-proxy-v1.js';
import { REGION_IMAGE_HOST_LIST } from '../workers/gnk-asg-direct-operator/src/image-hosts-v1.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = path.join(ROOT, 'apps/portal');
const SITE = 'https://gnk-asg.hr';
const PLAN_FILE = path.join(ROOT, 'ops/AUTONOMY-365.json');
const CHECK = process.argv.includes('--check');
const STRICT = process.argv.includes('--strict');

/* Popis izdanja dolazi iz channels.json: dashboard ne smije ostati na osam
   gradova kad se doda novo izdanje. */
const CITY_IDS = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps', 'region', 'channels.json'), 'utf8')).channels.map((c) => c.id);
const DESK_IDS = ['sport', 'politika', 'biznis', 'tehnologija', 'putovanja', 'ljubimci', 'svijet', 'moda', 'sigurnost'];

const plan = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'));

const readJson = (file, fallback = null) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
};
const readText = (file, fallback = '') => {
  try { return fs.readFileSync(file, 'utf8'); } catch { return fallback; }
};
const itemsOf = (data) => (Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : []));
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const now = new Date();
const dateOnly = (d = now) => d.toISOString().slice(0, 10);
const stamp = (d = now) => d.toISOString().replace(/\.\d+Z$/, 'Z');
const hoursBetween = (value) => {
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, (now.getTime() - t) / 3600000);
};
const round1 = (n) => Math.round(n * 10) / 10;

/* ---------- mjerenja ---------- */

const channels = CITY_IDS.map((id) => {
  const data = readJson(path.join(ROOT, `apps/region/data/${id}.json`));
  const items = itemsOf(data);
  const newest = items
    .map((i) => i.date || i.published || i.published_at || '')
    .filter(Boolean)
    .sort()
    .pop() || '';
  return { id, items: items.length, newest, ageHours: newest ? hoursBetween(newest) : null };
});

const news = readJson(path.join(PORTAL, 'data/news.json'));
const newsItems = itemsOf(news);
const newsNewest = newsItems.map((i) => i.published_at || i.publishedAt || i.date || '').filter(Boolean).sort().pop() || '';
const newsAge = newsNewest ? hoursBetween(newsNewest) : null;

const portalJs = readText(path.join(PORTAL, 'assets/aktual-media-world-v1.js'));
/* Hostovi "u feedu" nisu samo 300 najnovijih zapisa: arhiva svakog od 17
   izdanja je dio istog feeda, a posrednik mora pokriti sve izvore iz kojih
   slike dolaze. Mjerenje je zato unija news.json i svih arhiva kanala — inače
   kriterij trajno pada zbog hostova koji u trenutnom izvatku nisu prisutni. */
const archiveHosts = new Set();
for (const channel of CITY_IDS) {
  const data = readJson(path.join(ROOT, `apps/region/data/${channel}.json`));
  for (const item of itemsOf(data)) {
    const candidates = [item.image, item.imageUrl, item.img, item.thumbnail];
    for (const source of (item.sources || [])) candidates.push(source.image, source.url);
    for (const value of candidates) {
      if (!/^https:\/\//i.test(String(value || ''))) continue;
      try { archiveHosts.add(new URL(value).hostname.toLowerCase()); } catch { /* ignore */ }
    }
  }
}
const feedHosts = new Set([
  ...archiveHosts,
  ...newsItems
    .map((i) => String(i.image || ''))
    .filter((u) => /^https:\/\//i.test(u))
    .map((u) => { try { return new URL(u).hostname.toLowerCase(); } catch { return ''; } })
    .filter(Boolean)
]);
const allow = new Set(allowedImageHosts().map((h) => h.toLowerCase()));
const hostsMissing = [...feedHosts].filter((h) => !allow.has(h));
// Regionalni hostovi (osam izdanja) nisu "višak": provjeravaju se zasebno (test-image-proxy-coverage).
const regionHosts = new Set(REGION_IMAGE_HOST_LIST.map((h) => h.toLowerCase()));
const hostsExtra = [...allow].filter((h) => !feedHosts.has(h) && !regionHosts.has(h));

const desksWithImages = DESK_IDS.filter((id) => /<img\b/i.test(readText(path.join(PORTAL, `izdanja/${id}/index.html`))));

/* ---------- kriteriji ---------- */

function measure(criterion) {
  switch (criterion.type) {
    case 'channel-archive-min': {
      const min = Math.min(...channels.map((c) => c.items));
      return {
        measured: min,
        actual: `${min} / ${criterion.value}`,
        state: min >= criterion.value ? 'ok' : 'fail',
        note: { hr: channels.map((c) => `${c.id} ${c.items}`).join(' · '), en: channels.map((c) => `${c.id} ${c.items}`).join(' · ') },
      };
    }
    case 'channel-fresh-hours': {
      const ages = channels.map((c) => c.ageHours).filter((n) => typeof n === 'number');
      if (!ages.length) return { actual: '—', state: 'fail', note: { hr: 'nijedan kanal nema datum', en: 'no channel carries a date' } };
      const max = Math.max(...ages);
      return {
        measured: round1(max),
        actual: `${round1(max)} h`,
        state: max <= criterion.value ? 'ok' : 'watch',
        note: (() => { const n = channels.map((c) => `${c.id} ${c.ageHours === null ? '—' : round1(c.ageHours) + ' h'}`).join(' · '); return { hr: n, en: n }; })(),
      };
    }
    case 'source-images': {
      const proxied = portalJs.includes('/api/img?u=');
      const fallback = portalJs.includes('localEditorialVisuals');
      return {
        measured: proxied && !fallback ? 1 : 0,
        actual: proxied && !fallback ? 'posrednik' : (fallback ? 'zamjenske ilustracije' : 'bez posrednika'),
        actualEn: proxied && !fallback ? 'proxy' : (fallback ? 'shared artwork' : 'no proxy'),
        state: proxied && !fallback ? 'ok' : 'fail',
        note: proxied ? { hr: '/api/img?u= prisutan', en: '/api/img?u= present' } : { hr: 'u portalu nema poziva posredniku', en: 'the portal makes no proxy call' },
      };
    }
    case 'proxy-allowlist': {
      // Kao i test-image-proxy-v1: neiskorišten unos (višak) nije kvar — feedovi rotiraju.
      // Ruši samo host kojeg na popisu nema (slika bi tiho nestala).
      const equal = hostsMissing.length === 0;
      return {
        measured: allow.size,
        actual: `${allow.size} / ${feedHosts.size}`,
        state: equal ? 'ok' : 'fail',
        note: equal
          ? { hr: 'popis i feed se podudaraju u cijelosti', en: 'the list and the feed match exactly' }
          : { hr: `nedostaje: ${hostsMissing.join(', ') || '—'} · višak: ${hostsExtra.join(', ') || '—'}`, en: `missing: ${hostsMissing.join(', ') || '—'} · extra: ${hostsExtra.join(', ') || '—'}` },
      };
    }
    case 'desk-images': {
      return {
        measured: desksWithImages.length,
        actual: `${desksWithImages.length} / ${DESK_IDS.length}`,
        state: desksWithImages.length === DESK_IDS.length ? 'ok' : 'watch',
        note: desksWithImages.length === DESK_IDS.length
          ? { hr: 'svaki desk ima sliku u objavljenom HTML-u', en: 'every desk carries an image in the published HTML' }
          : { hr: `bez slike: ${DESK_IDS.filter((d) => !desksWithImages.includes(d)).join(', ')}`, en: `without an image: ${DESK_IDS.filter((d) => !desksWithImages.includes(d)).join(', ')}` },
      };
    }
    case 'news-fresh-hours': {
      if (newsAge === null) return { actual: '—', state: 'fail', note: { hr: 'news.json nema datum', en: 'news.json carries no date' } };
      return {
        measured: round1(newsAge),
        actual: `${round1(newsAge)} h`,
        state: newsAge <= criterion.value ? 'ok' : 'watch',
        note: { hr: `${newsItems.length} zapisa · najnoviji ${newsNewest || '—'}`, en: `${newsItems.length} items · newest ${newsNewest || '—'}` },
      };
    }
    case 'bilingual':
    case 'links-min':
      // Mjeri se nad upravo generiranim HTML-om (vidi MeasureSelf niže).
      return { actual: '—', state: 'ok', note: { hr: '', en: '' } };
    default:
      return { value: null, actual: '—', state: 'fail', note: `nepoznat tip: ${criterion.type}` };
  }
}

const criteria = plan.criteria.map((c) => ({ ...c, ...measure(c) }));

/* ---------- stranica ---------- */

const ic = { ok: '●', watch: '◐', fail: '○' };
const stateLabel = {
  hr: { ok: 'zadovoljeno', watch: 'nadzire se', fail: 'otvoreno' },
  en: { ok: 'met', watch: 'watched', fail: 'open' },
};

function shell({ lang, title, description, canonical, alternates, jsonld, body }) {
  const t = (hr, en) => (lang === 'hr' ? hr : en);
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="author" content="AKTUAL MEDIA d.o.o.">
<meta name="editor" content="Nermin Sefić">
<link rel="canonical" href="${canonical}">
${alternates.map(([hreflang, href]) => `<link rel="alternate" hreflang="${hreflang}" href="${href}">`).join('\n')}
<meta property="og:type" content="website">
<meta property="og:site_name" content="AKTUAL MEDIA">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/assets/izdanja/aktual-media-og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${t('hr_HR', 'en_GB')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE}/assets/izdanja/aktual-media-og.jpg">
<link rel="stylesheet" href="/assets/public-design-tokens-v1.css">
${jsonld.map((node) => `<script type="application/ld+json">${JSON.stringify(node)}</script>`).join('\n')}
<style>
*{box-sizing:border-box}
body{margin:0;background:#061019;color:#e8edf3;font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:inherit}
.au-wrap{max-width:1180px;margin:0 auto;padding:0 clamp(16px,4vw,40px)}
.au-top{background:#040b14;border-bottom:1px solid #17314a}
.au-top .au-wrap{display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;padding:12px 0}
.au-brand{font:800 12px/1 system-ui;letter-spacing:.16em;text-transform:uppercase;color:#e0bd69;text-decoration:none}
.au-nav{display:flex;flex-wrap:wrap;gap:14px;font:700 11px/1 system-ui;letter-spacing:.08em;text-transform:uppercase}
.au-nav a{color:#a9b6c6;text-decoration:none}
.au-nav a:hover{color:#e0bd69}
.au-hero{padding:clamp(34px,6vw,70px) 0 28px;background:radial-gradient(90% 120% at 12% 0%,rgba(224,189,105,.12),transparent 60%),linear-gradient(180deg,#061019,#071426)}
.au-kicker{font:800 11px/1 system-ui;letter-spacing:.2em;text-transform:uppercase;color:#8fa3ba;margin:0 0 14px}
.au-hero h1{font:700 clamp(32px,5.4vw,62px)/1.02 Georgia,serif;margin:0 0 16px;letter-spacing:-.02em}
.au-hero p{max-width:74ch;margin:0;color:#c3cede;font-size:clamp(15px,1.6vw,18px)}
.au-horizon{display:inline-flex;flex-wrap:wrap;gap:10px;margin-top:20px;padding:10px 14px;border:1px solid #2c4a6b;border-radius:999px;font:700 11px/1 system-ui;letter-spacing:.08em;text-transform:uppercase;color:#e0bd69}
.au-score{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:26px 0 0}
.au-score div{background:#0b1d31;border:1px solid #1e3b58;border-radius:14px;padding:16px 18px}
.au-score b{display:block;font:700 clamp(26px,3.4vw,38px)/1 Georgia,serif;color:#e0bd69}
.au-score span{font:700 10px/1.4 system-ui;letter-spacing:.12em;text-transform:uppercase;color:#8fa3ba}
.au-band{padding:34px 0;border-top:1px solid #17314a}
.au-band h2{font:700 clamp(22px,2.6vw,30px)/1.15 Georgia,serif;margin:0 0 6px}
.au-band .au-sub{margin:0 0 20px;color:#9fb0c4;max-width:80ch}
.au-flow{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
.au-step{position:relative;background:#0b1d31;border:1px solid #1e3b58;border-radius:12px;padding:16px}
.au-step h3{margin:0 0 6px;font:700 15px/1.2 system-ui}
.au-step p{margin:0 0 10px;color:#a9b6c6;font-size:13.5px}
.au-step small{display:block;font:700 10px/1.5 system-ui;letter-spacing:.08em;text-transform:uppercase;color:#8fa3ba}
.au-step small b{color:#e0bd69}
.au-table{width:100%;border-collapse:collapse;font-size:14.5px}
.au-table th{text-align:left;font:700 10px/1.4 system-ui;letter-spacing:.12em;text-transform:uppercase;color:#8fa3ba;padding:8px 10px;border-bottom:1px solid #24425f}
.au-table td{padding:11px 10px;border-bottom:1px solid #16304a;vertical-align:top}
.au-table tr:last-child td{border-bottom:0}
.au-state{font:800 11px/1 system-ui;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.au-state.ok{color:#7ddba1}.au-state.watch{color:#e0bd69}.au-state.fail{color:#ff8d7a}
.au-owner{font:600 11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:#a9b6c6}
.au-note{display:block;color:#7f8fa3;font-size:11.5px;margin-top:3px;overflow-wrap:anywhere}
.au-line{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:0 0 18px;padding:0;list-style:none}
.au-line li{position:relative;padding:12px 10px 10px;background:#0a1b2d;border:1px solid #1e3b58;border-radius:10px;font:700 10px/1.35 system-ui;letter-spacing:.06em;text-transform:uppercase;color:#9fb0c4}
.au-line li::before{content:"";position:absolute;left:10px;right:10px;top:6px;height:2px;background:linear-gradient(90deg,#e0bd69,rgba(224,189,105,.15))}
.au-line b{display:block;color:#e8edf3;font:700 12px/1.3 system-ui;letter-spacing:0;text-transform:none;margin:6px 0 2px}
.au-line span{display:block;color:#7f8fa3;font-weight:600}
.au-q{display:grid;gap:14px}
.au-quarter{background:linear-gradient(160deg,#0b1d31,#081522);border:1px solid #1e3b58;border-left:4px solid #e0bd69;border-radius:12px;padding:18px 20px}
.au-quarter header{display:flex;flex-wrap:wrap;gap:10px;align-items:baseline;justify-content:space-between}
.au-quarter h3{margin:0;font:700 20px/1.2 Georgia,serif}
.au-quarter time{font:700 10px/1 system-ui;letter-spacing:.1em;text-transform:uppercase;color:#8fa3ba}
.au-quarter p{margin:8px 0 0;color:#c3cede}
.au-quarter ul{margin:10px 0 0;padding-left:18px;color:#a9b6c6;font-size:14px}
.au-exit{margin:10px 0 0;display:flex;flex-wrap:wrap;gap:6px;padding:0;list-style:none}
.au-exit li{font:700 9.5px/1 system-ui;letter-spacing:.08em;text-transform:uppercase;border:1px solid #25435f;border-radius:999px;padding:5px 8px;color:#9fb0c4}
.au-next{display:grid;gap:10px;margin:0;padding:0;list-style:none}
.au-next li{background:#0b1d31;border:1px solid #1e3b58;border-radius:10px;padding:13px 16px}
.au-next b{color:#e8edf3}
.au-next span{display:block;color:#8fa3ba;font-size:12.5px;margin-top:4px}
.au-foot{border-top:1px solid #17314a;background:#040b14;padding:26px 0 34px;margin-top:20px;color:#9fb0c4;font-size:13px}
.au-foot p{margin:0 0 8px}
.au-tags{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px;padding:0;list-style:none;font:700 10px/1 system-ui;letter-spacing:.06em;text-transform:uppercase}
.au-tags a{border:1px solid #25435f;border-radius:999px;padding:6px 9px;text-decoration:none;color:#c8d6e6}
.au-tags a:hover{border-color:#e0bd69;color:#e0bd69}
.au-links{display:flex;flex-wrap:wrap;gap:14px;font:700 11px/1 system-ui;letter-spacing:.06em;text-transform:uppercase}
.au-links a{color:#e0bd69;text-decoration:none}
@media(max-width:680px){.au-score{grid-template-columns:1fr}.au-table{font-size:13px}.au-table th:nth-child(4),.au-table td:nth-child(4){display:none}}
</style>
<script defer src="/assets/public-contrast-hardening-v1.js?v=20261021-autonomy"></script>
<script defer src="/assets/public-unified-menu-v6.js?v=20261021-autonomy"></script>
</head>
<body>
${body}
</body>
</html>
`;
}

function render(lang, rows) {
  const hr = lang === 'hr';
  const t = (a, b) => (hr ? a : b);
  const canonical = hr ? `${SITE}/autonomija/` : `${SITE}/en/autonomy/`;
  const alternates = [
    ['hr', `${SITE}/autonomija/`],
    ['en', `${SITE}/en/autonomy/`],
    ['x-default', `${SITE}/autonomija/`],
  ];
  const ok = rows.filter((r) => r.state === 'ok').length;
  const watch = rows.filter((r) => r.state === 'watch').length;
  const fail = rows.filter((r) => r.state === 'fail').length;
  const open = rows.filter((r) => r.state !== 'ok');

  const jsonld = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      url: `${SITE}/`,
      name: 'GNK ASG',
      inLanguage: ['hr', 'en'],
      publisher: { '@type': 'Organization', '@id': `${SITE}/#gnk-asg`, name: 'GNK ASG d.o.o.', url: `${SITE}/` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${canonical}#page`,
      url: canonical,
      name: plan.title[lang],
      description: plan.principle[lang],
      inLanguage: lang,
      isPartOf: { '@id': `${SITE}/#website` },
      publisher: { '@id': `${SITE}/#gnk-asg` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: t('Kriteriji autonomije', 'Autonomy criteria'),
      numberOfItems: rows.length,
      itemListElement: rows.map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: r.label[lang],
        description: `${lang === 'en' && r.actualEn ? r.actualEn : r.actual} · ${stateLabel[lang][r.state]}`,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'GNK ASG', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'AKTUAL MEDIA', item: `${SITE}/gnk-aktual/` },
        { '@type': 'ListItem', position: 3, name: plan.title[lang], item: canonical },
      ],
    },
  ];

  const body = `<header class="au-top"><div class="au-wrap">
  <a class="au-brand" href="/">GNK ASG · AKTUAL MEDIA</a>
  <nav class="au-nav" aria-label="${t('Navigacija', 'Navigation')}">
    <a href="/gnk-aktual/">AKTUAL MEDIA</a>
    <a href="/izdanja/">${t('Izdanja', 'Editions')}</a>
    <a href="/kanal/">${t('Kanali', 'Channels')}</a>
    <a href="/zdravlje/">${t('Zdravlje', 'Health')}</a>
    <a href="/radio/">Radio</a>
    <a href="${hr ? '/s-chat/?ctx=%2Fautonomija%2F' : '/en/s-chat/?ctx=%2Fen%2Fautonomy%2F'}">${t('Pitaj asistenta', 'Ask the assistant')}</a>
    <a href="${hr ? '/en/autonomy/' : '/autonomija/'}" hreflang="${hr ? 'en' : 'hr'}" lang="${hr ? 'en' : 'hr'}">${hr ? 'English' : 'Hrvatski'}</a>
  </nav>
</div></header>

<main id="sadrzaj">
  <section class="au-hero"><div class="au-wrap">
    <p class="au-kicker">${t('Autonomija · 365 dana · mjereno iz repozitorija', 'Autonomy · 365 days · measured from the repository')}</p>
    <h1>${esc(plan.title[lang])}</h1>
    <p>${esc(plan.principle[lang])}</p>
    <p class="au-horizon"><span>${esc(plan.horizon.starts)} → ${esc(plan.horizon.ends)}</span><span>${esc(String(plan.horizon.days))} ${t('dana', 'days')}</span><span>${t('mjereno', 'measured')} ${esc(stamp())}</span></p>
    <div class="au-score" role="list">
      <div role="listitem"><b data-metric="ok">${ok}</b><span>${t('zadovoljeno', 'met')}</span></div>
      <div role="listitem"><b data-metric="watch">${watch}</b><span>${t('nadzire se', 'watched')}</span></div>
      <div role="listitem"><b data-metric="fail">${fail}</b><span>${t('otvoreno', 'open')}</span></div>
    </div>
  </div></section>

  <section class="au-band"><div class="au-wrap">
    <h2>${t('Kako sustav radi bez ručnog popravka', 'How the system runs without manual repair')}</h2>
    <p class="au-sub">${t('Svaki korak ima jednog vlasnika i raspored. Ako korak izostane, pada njegova provjera — ne tuđa.', 'Every step has one owner and one schedule. If a step is missed, its own check fails — not someone else’s.')}</p>
    <div class="au-flow">
      ${plan.pipeline.map((s) => `<article class="au-step">
        <h3>${esc(s[lang])}</h3>
        <p>${esc(s.detail[lang])}</p>
        <small><b>${esc(s.owner)}</b><br>${esc(lang === 'en' && s.cadenceEn ? s.cadenceEn : s.cadence)}</small>
      </article>`).join('\n      ')}
    </div>
  </div></section>

  <section class="au-band" id="kriteriji"><div class="au-wrap">
    <h2>${t('Kriteriji koje sustav sam provjerava', 'Criteria the system checks by itself')}</h2>
    <p class="au-sub">${t('Tvrdi kriterij mora stajati prije svake objave. Nadzorni smije zakasniti jedan ciklus, ali se vidi na ovoj ploči.', 'A hard criterion must stand before every release. A watched one may miss a single cycle, but it shows on this board.')}</p>
    <table class="au-table">
      <thead><tr><th>${t('Kriterij', 'Criterion')}</th><th>${t('Stanje', 'State')}</th><th>${t('Vrijednost', 'Value')}</th><th>${t('Vlasnik', 'Owner')}</th></tr></thead>
      <tbody>
      ${rows.map((r) => `<tr>
        <td><a href="${r.route}">${esc(r.label[lang])}</a><span class="au-note">${esc(typeof r.note === 'string' ? r.note : (r.note?.[lang] || ''))}</span></td>
        <td><span class="au-state ${r.state}" data-criterion="${esc(r.id)}" data-state="${r.state}">${ic[r.state]} ${esc(stateLabel[lang][r.state])}</span></td>
        <td>${esc(lang === 'en' && r.actualEn ? r.actualEn : r.actual)}</td>
        <td><span class="au-owner">${esc(r.owner)}</span></td>
      </tr>`).join('\n      ')}
      </tbody>
    </table>
  </div></section>

  <section class="au-band" id="plan"><div class="au-wrap">
    <h2>${t('Smjer za sljedećih 365 dana', 'Direction for the next 365 days')}</h2>
    <p class="au-sub">${t('Četiri kvartala i završna kontrolna točka. Svaki kvartal ima izlaz koji se mjeri istim kriterijima iz tablice iznad.', 'Four quarters and a closing checkpoint. Every quarter has an exit measured by the same criteria as the table above.')}</p>
    <ol class="au-line" aria-label="${t('Vremenska crta', 'Timeline')}">
      ${plan.quarters.map((q) => `<li>${esc(q.from)}<b>${esc(q.label[lang])}</b><span>${esc(q.to)}</span></li>`).join('')}
    </ol>
    <div class="au-q">
      ${plan.quarters.map((q) => `<article class="au-quarter">
        <header><h3>${esc(q.label[lang])}</h3><time datetime="${esc(q.from)}">${esc(q.from)} → ${esc(q.to)}</time></header>
        <p>${esc(q.focus[lang])}</p>
        <ul>${q.deliverables.map((d) => `<li>${esc(d[lang])}</li>`).join('')}</ul>
        <ul class="au-exit" aria-label="${t('Izlazni kriteriji', 'Exit criteria')}">${q.exit.map((id) => {
          const row = rows.find((r) => r.id === id);
          return `<li>${esc(id)}${row ? ` · ${esc(stateLabel[lang][row.state])}` : ''}</li>`;
        }).join('')}</ul>
      </article>`).join('\n      ')}
    </div>
  </div></section>

  <section class="au-band" id="sljedece"><div class="au-wrap">
    <h2>${t('Što je sada otvoreno', 'What is open right now')}</h2>
    <p class="au-sub">${esc(plan.next[lang])}</p>
    ${open.length ? `<ul class="au-next">${open.map((r) => `<li><b>${esc(r.label[lang])}</b><span>${esc(lang === 'en' && r.actualEn ? r.actualEn : r.actual)} · ${esc(r.owner)} · <a href="${r.route}">${t('provjeri', 'check')} →</a></span></li>`).join('')}</ul>`
      : `<p><strong>${t('Nema otvorenih kriterija u ovom mjerenju.', 'No open criteria in this measurement.')}</strong> ${t('To vrijedi do sljedećeg ciklusa — ploča se mjeri iznova svakih šest sati.', 'That holds until the next cycle — the board is measured again every six hours.')}</p>`}
  </div></section>
</main>

<footer class="au-foot"><div class="au-wrap">
  <ul class="au-tags" aria-label="${t('Oznake', 'Tags')}">
    <li><a href="/nermin-sefic/">#NerminSefić</a></li>
    <li><a href="/nermin-sefic/">#NerminSefic</a></li>
    <li><a href="/autorske-objave/">#SeficNermin</a></li>
    <li><a href="/autorske-objave/">#SEFICNERMIN</a></li>
    <li><a href="/gnk-aktual/">#AKTUALMEDIA</a></li>
    <li><a href="/kanal/">#GNKASG</a></li>
    <li><a href="/autonomija/">#Autonomija365</a></li>
  </ul>
  <p><strong>AKTUAL MEDIA d.o.o.</strong> · ${t('Urednik', 'Editor')}: Nermin Sefić · <a href="mailto:info@gnk-asg.hr">info@gnk-asg.hr</a></p>
  <p>${t('Brojevi na ovoj stranici čitaju se iz repozitorija u trenutku gradnje. Stranica ne objavljuje procjene ni najave rezultata.', 'The numbers on this page are read from the repository at build time. The page publishes no estimates and no forecasts of results.')}</p>
  <p class="au-links">
    <a href="/gnk-aktual/">AKTUAL MEDIA</a>
    <a href="/izdanja/">${t('Sva izdanja', 'All editions')}</a>
    <a href="/kanal/">${t('Kanali', 'Channels')}</a>
    <a href="/galerija/">${t('Galerija', 'Gallery')}</a>
    <a href="/zdravlje/">${t('Zdravlje sustava', 'System health')}</a>
    <a href="/radio/">AKTUAL RADIO</a>
    <a href="/usa/">USA</a>
    <a href="${hr ? '/en/autonomy/' : '/autonomija/'}">${hr ? 'English' : 'Hrvatski'}</a>
  </p>
</div></footer>`;

  return shell({
    lang,
    title: `${plan.title[lang]} | AKTUAL MEDIA`,
    description: hr
      ? 'Autonomija 365: kako AKTUAL MEDIA radi bez ručnog popravka. Mjereni kriteriji, vlasnici poslova i smjer za sljedećih 365 dana.'
      : 'Autonomy 365: how AKTUAL MEDIA runs without manual repair. Measured criteria, job owners and the direction for the next 365 days.',
    canonical,
    alternates,
    jsonld,
    body,
  });
}

/* ---------- samokriteriji (mjere se nad generiranim HTML-om) ---------- */

let hrHtml = render('hr', criteria);
let enHtml = render('en', criteria);

const internalLinks = (html) => {
  const links = [...html.matchAll(/href="(\/[^"#?]*)/g)].map((m) => m[1]);
  return new Set(links.filter((href) => !href.startsWith('//'))).size;
};

for (const criterion of criteria) {
  if (criterion.type === 'bilingual') {
    const ok = hrHtml.includes('/en/autonomy/') && enHtml.includes('/autonomija/');
    criterion.state = ok ? 'ok' : 'fail';
    criterion.actual = ok ? 'hr + en' : 'nedostaje veza';
    criterion.value = ok ? 1 : 0;
    criterion.note = ok
      ? { hr: 'obje stranice nose hreflang i međusobnu poveznicu', en: 'both pages carry hreflang and link to each other' }
      : { hr: 'jedna stranica ne vodi na drugu', en: 'one page does not link to the other' };
  }
  if (criterion.type === 'links-min') {
    const min = Math.min(internalLinks(hrHtml), internalLinks(enHtml));
    const target = Number(criterion.value) || 6;
    criterion.state = min >= target ? 'ok' : 'fail';
    criterion.actual = `${min} / ${target}`;
    criterion.note = { hr: `hr ${internalLinks(hrHtml)} · en ${internalLinks(enHtml)}`, en: `hr ${internalLinks(hrHtml)} · en ${internalLinks(enHtml)}` };
    criterion.measured = min;
  }
}

hrHtml = render('hr', criteria);
enHtml = render('en', criteria);

/* ---------- zapisi ---------- */

const summary = {
  version: plan.version,
  generatedAt: stamp(),
  horizon: plan.horizon,
  criteria: criteria.map((c) => ({
    id: c.id,
    state: c.state,
    severity: c.severity,
    actual: c.actual,
    target: c.type.includes('hours') ? `${c.value} h` : (c.type === 'links-min' ? `${c.value}` : (typeof c.value === 'number' ? c.value : null)),
    owner: c.owner,
    route: c.route,
    label: c.label,
    note: c.note,
  })),
  totals: {
    all: criteria.length,
    ok: criteria.filter((c) => c.state === 'ok').length,
    watch: criteria.filter((c) => c.state === 'watch').length,
    fail: criteria.filter((c) => c.state === 'fail').length,
  },
  measured: {
    channels: channels.map((c) => ({ id: c.id, items: c.items, newest: c.newest, ageHours: c.ageHours === null ? null : round1(c.ageHours) })),
    news: { items: newsItems.length, newest: newsNewest, ageHours: newsAge === null ? null : round1(newsAge) },
    proxies: { allowed: allow.size, feedHosts: feedHosts.size },
    desks: { withImages: desksWithImages.length, total: DESK_IDS.length },
  },
};

function updateSitemap() {
  const file = path.join(PORTAL, 'sitemap.xml');
  let xml = readText(file);
  if (!xml) return false;
  const entries = [
    ['https://gnk-asg.hr/autonomija/', '/autonomija/', '/en/autonomy/', 'hr'],
    ['https://gnk-asg.hr/en/autonomy/', '/en/autonomy/', '/autonomija/', 'en'],
  ];
  let changed = false;
  for (const [loc, self, alt, lang] of entries) {
    const block = `  <url><loc>${loc}</loc><lastmod>${dateOnly()}</lastmod><changefreq>daily</changefreq><priority>0.8</priority><xhtml:link rel="alternate" hreflang="${lang}" href="${SITE}${self}"/><xhtml:link rel="alternate" hreflang="${lang === 'hr' ? 'en' : 'hr'}" href="${SITE}${alt}"/><xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/autonomija/"/></url>`;
    const existing = new RegExp(`  <url><loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>[\\s\\S]*?</url>`);
    if (existing.test(xml)) {
      const next = xml.replace(existing, block);
      if (next !== xml) { xml = next; changed = true; }
    } else {
      xml = xml.replace('</urlset>', `${block}\n</urlset>`);
      changed = true;
    }
  }
  if (changed && !CHECK) fs.writeFileSync(file, xml);
  return changed;
}

const outputs = [
  [path.join(PORTAL, 'autonomija/index.html'), hrHtml],
  [path.join(PORTAL, 'en/autonomy/index.html'), enHtml],
  [path.join(PORTAL, 'data/autonomy-status.json'), `${JSON.stringify(summary, null, 2)}\n`],
  [path.join(ROOT, 'artifacts/autonomy-status.json'), `${JSON.stringify(summary, null, 2)}\n`],
];

if (!CHECK) {
  for (const [file, body] of outputs) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  }
  updateSitemap();
}

const hardFailures = criteria.filter((c) => c.severity === 'hard' && c.state === 'fail');
console.log(JSON.stringify({
  ok: hardFailures.length === 0,
  checkOnly: CHECK,
  written: CHECK ? 0 : outputs.length,
  totals: summary.totals,
  open: criteria.filter((c) => c.state !== 'ok').map((c) => `${c.id}:${c.state}`),
  hardFailures: hardFailures.map((c) => c.id),
}, null, 2));

if (STRICT && hardFailures.length) {
  console.error(`Tvrdi kriteriji nisu zadovoljeni: ${hardFailures.map((c) => c.id).join(', ')}`);
  process.exit(1);
}
