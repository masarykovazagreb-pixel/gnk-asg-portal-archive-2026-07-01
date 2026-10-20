#!/usr/bin/env node
/* Medijska kritika: mjerljivi pokazatelji načina na koji izvori pišu.
   Ne ocjenjuje istinitost — mjeri oblik: brojke u naslovu, superlative,
   pitanja, neimenovane izvore i duljinu sažetka. Sve se računa iz feedova. */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const KANAL = join(PORTAL, 'kanal');

const RE = {
  digit: /\d/,
  superlative: /\b(naj|najveć|najve|rekord|povijesn|historijsk|prvi put|first ever|top)\b/i,
  question: /\?/,
  anonymous: /\b(izvor|izvori|krugovi|neimenovan|anonim|prema saznanjima|saznaje|sources say)\b/i,
  exclusive: /\b(ekskluziv|otkrivamo|saznajemo|exclusive)\b/i
};

const rows = [];
const channels = readdirSync(KANAL, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
for (const ch of channels) {
  const f = join(KANAL, ch, 'feed.json');
  if (!existsSync(f)) continue;
  let feed;
  try { feed = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
  const items = Array.isArray(feed) ? feed : feed.items || [];
  for (const it of items) {
    const tags = Array.isArray(it.tags) ? it.tags : [];
    const source = tags[0] || (it._region && it._region.source) || 'Nepoznat izvor';
    rows.push({ channel: ch, source: String(source), title: it.title || '', summary: it.summary || '' });
  }
}

const bySource = new Map();
for (const r of rows) {
  if (!bySource.has(r.source)) bySource.set(r.source, { source: r.source, n: 0, digit: 0, sup: 0, q: 0, anon: 0, excl: 0, sumLen: 0, channels: new Set() });
  const s = bySource.get(r.source);
  s.n += 1;
  s.channels.add(r.channel);
  if (RE.digit.test(r.title)) s.digit += 1;
  if (RE.superlative.test(r.title)) s.sup += 1;
  if (RE.question.test(r.title)) s.q += 1;
  if (RE.anonymous.test(`${r.title} ${r.summary}`)) s.anon += 1;
  if (RE.exclusive.test(`${r.title} ${r.summary}`)) s.excl += 1;
  s.sumLen += r.summary.length;
}

const list = [...bySource.values()]
  .filter((s) => s.n >= 8)
  .map((s) => ({
    source: s.source,
    items: s.n,
    channels: s.channels.size,
    digit: Math.round((s.digit / s.n) * 100),
    superlative: Math.round((s.sup / s.n) * 100),
    question: Math.round((s.q / s.n) * 100),
    anonymous: Math.round((s.anon / s.n) * 100),
    exclusive: Math.round((s.excl / s.n) * 100),
    avgSummary: Math.round(s.sumLen / s.n)
  }))
  .sort((a, b) => b.items - a.items);

const top = list.slice(0, 24);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const T = {
  hr: {
    title: 'Kritika medija — što se da izmjeriti',
    lead: 'Ova stranica ne ocjenjuje je li neki tekst istinit. Mjeri oblik: koliko naslovi koriste brojke, superlative, pitanja i neimenovane izvore, te koliko je dugačak sažetak. Sve je izračunato iz objavljenih osvrta i njihovih izvora.',
    method: 'Metoda',
    methodText: 'Uzet je svaki objavljeni osvrt iz osam kanala i pridružen izvoru iz oznake. Postotci su udjeli u ukupnom broju osvrta tog izvora. Uključeni su izvori s najmanje osam osvrta. Brojka u naslovu nije mana; pitanje je samo je li objašnjena u tekstu. Superlativ nije laž; pitanje je čime je potkrijepljen.',
    cols: ['Izvor', 'Osvrta', 'Kanalâ', 'Brojka u naslovu', 'Superlativ', 'Pitanje', 'Neimenovan izvor', 'Ekskluziva', 'Sažetak (znakova)'],
    note: 'Pokazatelji su formalni. Visok udio ne znači da izvor griješi, ali znači da čitatelj mora više provjeravati.',
    back: '← AKTUAL MEDIA',
    all: 'Sva izdanja →'
  },
  en: {
    title: 'Media critique — what can be measured',
    lead: 'This page does not judge whether a story is true. It measures form: how often headlines use numbers, superlatives, questions and unnamed sources, and how long the summary is. Everything is computed from published reviews and their sources.',
    method: 'Method',
    methodText: 'Every published review from the eight channels is assigned to the source in its tag. Percentages are shares of that source’s reviews. Sources with at least eight reviews are included. A number in a headline is not a flaw; the question is whether the text explains it. A superlative is not a lie; the question is what supports it.',
    cols: ['Source', 'Reviews', 'Channels', 'Number in headline', 'Superlative', 'Question', 'Unnamed source', 'Exclusive', 'Summary (chars)'],
    note: 'These indicators are formal. A high share does not mean the source is wrong, but it does mean the reader has more to verify.',
    back: '← AKTUAL MEDIA',
    all: 'All editions →'
  }
};

function page(lang) {
  const t = T[lang];
  const EN = lang === 'en';
  const body = top.map((s) => `<tr>
    <td><b>${esc(s.source)}</b></td>
    <td>${s.items}</td><td>${s.channels}</td>
    <td><span class="bar"><i style="width:${Math.min(100, s.digit)}%"></i></span>${s.digit}%</td>
    <td><span class="bar"><i style="width:${Math.min(100, s.superlative)}%"></i></span>${s.superlative}%</td>
    <td>${s.question}%</td>
    <td>${s.anonymous}%</td>
    <td>${s.exclusive}%</td>
    <td>${s.avgSummary}</td>
  </tr>`).join('');

  return `<!doctype html>
<html lang="${EN ? 'en' : 'hr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)} — AKTUAL MEDIA</title>
<meta name="description" content="${esc(t.lead.slice(0, 240))}">
<link rel="canonical" href="https://gnk-asg.hr/medijska-kritika/${EN ? 'en/' : ''}">
<link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/medijska-kritika/">
<link rel="alternate" hreflang="en" href="https://gnk-asg.hr/medijska-kritika/en/">
<link rel="alternate" hreflang="x-default" href="https://gnk-asg.hr/medijska-kritika/">
<meta name="keywords" content="GNK ASG, AKTUAL MEDIA, medijska kritika, media critique, izvori, transparentnost, SEO">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(t.title)} — AKTUAL MEDIA">
<meta property="og:description" content="${esc(t.lead.slice(0, 200))}">
<meta property="og:locale" content="${EN ? 'en_GB' : 'hr_HR'}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<style>
*{box-sizing:border-box}body{margin:0;background:#faf7ef;color:#14181e;font:16px/1.55 Georgia,serif}
a{color:#8c2f2f}
.mk-top{background:#0d1723;color:#f3ead6;padding:10px 18px;font:700 10px/1.4 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase}
.mk-top a{color:#e9c66c;text-decoration:none;margin-right:16px}
.mk-wrap{max-width:1140px;margin:0 auto;padding:34px 20px 56px}
h1{font:900 clamp(27px,4.4vw,44px)/1.02 Impact,"Arial Black",system-ui,sans-serif;text-transform:uppercase;margin:0 0 10px}
.mk-lead{font-size:16.5px;max-width:80ch;color:#3d3a33;margin:0 0 18px}
.mk-method{background:#fff;border:1px solid #e3d9c3;border-left:6px solid #c8963c;border-radius:12px;padding:14px 16px;margin:0 0 20px}
.mk-method h2{margin:0 0 6px;font:900 13px/1 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#8a6a1f}
.mk-method p{margin:0;font-size:14.5px;color:#4a463d;max-width:95ch}
.mk-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e3d9c3;border-radius:12px;overflow:hidden;font:13px/1.35 system-ui,sans-serif}
.mk-table th{background:#0d1723;color:#f3ead6;text-align:left;padding:9px 10px;font:800 9.5px/1.2 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}
.mk-table td{padding:8px 10px;border-top:1px solid #efe7d7;white-space:nowrap}
.mk-table tr:nth-child(even) td{background:#fdfbf4}
.bar{display:inline-block;width:44px;height:5px;border-radius:3px;background:#eee6d4;margin-right:7px;vertical-align:middle;overflow:hidden}
.bar i{display:block;height:100%;background:linear-gradient(90deg,#e9c66c,#c8963c)}
.mk-note{margin:16px 0 0;font-size:13.5px;color:#5d5648;border-left:3px solid #c8963c;padding-left:12px}
.mk-foot{margin-top:28px;display:flex;gap:14px;flex-wrap:wrap;border-top:1px solid #e3d9c3;padding-top:14px}
.mk-foot a{font:800 10.5px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;color:#8c2f2f}
@media(max-width:760px){.mk-table{font-size:11.5px}.mk-table td,.mk-table th{padding:6px 7px}.bar{display:none}}
</style>
</head>
<body>
<div class="mk-top"><a href="/">GNK ASG</a><a href="/gnk-aktual/">AKTUAL MEDIA</a><a href="/izdanja/">${EN ? 'Editions' : 'Izdanja'}</a><a href="/kanal/">${EN ? 'Channels' : 'Kanali'}</a><a href="/workers/grupacije/">${EN ? 'Automations' : 'Automatizacije'}</a><a href="/radio/">Radio</a></div>
<main class="mk-wrap">
  <h1>${esc(t.title)}</h1>
  <p class="mk-lead">${esc(t.lead)}</p>
  <section class="mk-method"><h2>${esc(t.method)}</h2><p>${esc(t.methodText)}</p></section>
  <table class="mk-table">
    <thead><tr>${t.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${body}</tbody>
  </table>
  <p class="mk-note">${esc(t.note)}</p>
  <nav class="mk-foot">
    <a href="/gnk-aktual/">${esc(t.back)}</a>
    <a href="/izdanja/">${esc(t.all)}</a>
    <a href="/medijska-kritika/${EN ? '' : 'en/'}">${EN ? 'Hrvatski' : 'English'}</a>
    <a href="/workers/grupacije/">${EN ? 'Worker groups' : 'Grupacije radnika'}</a>
    <a href="/kanal/">${EN ? 'All channels' : 'Svi kanali'}</a>
    <a href="/galerija/">${EN ? 'Gallery' : 'Galerija'}</a>
  </nav>
  <ul class="mk-tags" style="list-style:none;display:flex;flex-wrap:wrap;gap:7px;margin:18px 0 0;padding:0">
    <li style="font:800 8.5px/1 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#a29884;align-self:center">${EN ? 'Tags' : 'Oznake'}</li>
    ${['#NerminSefić','#NerminSefic','#SeficNermin','#SEFICNERMIN','#UrednikNerminSefić','#AKTUALMEDIA','#GNKASG','#KritikaMedija'].map((t) => `<li><a href="${/nermin/i.test(t) || /Sefic|SEFIC/.test(t) ? '/nermin-sefic/' : '/gnk-aktual/'}" style="display:inline-block;font:800 9.5px/1 system-ui,sans-serif;text-decoration:none;color:#4a463d;background:#f6f2e8;border:1px solid #e0d6c1;border-radius:999px;padding:5px 9px">${t}</a></li>`).join('')}
  </ul>
</main>
</body>
</html>`;
}

const dir = join(PORTAL, 'medijska-kritika');
mkdirSync(join(dir, 'en'), { recursive: true });
writeFileSync(join(dir, 'index.html'), page('hr'));
writeFileSync(join(dir, 'en', 'index.html'), page('en'));
writeFileSync(join(PORTAL, 'data', 'media-critique.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), totalItems: rows.length, sources: list }, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, items: rows.length, sources: list.length, top: top.slice(0, 3).map((s) => [s.source, s.items]) }));
