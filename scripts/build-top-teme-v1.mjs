#!/usr/bin/env node
/* Top teme dana → kratki kritički tekst koji se sastoji SAMO od:
   - doslovnih naslova (citat, izvor, datum, link na izvornik),
   - brojeva izračunatih iz arhive (koliko naslova, kanala, izvora, raspon),
   - pitanja.
   Sve ostalo je zabranjeno; scripts/audit-top-teme-v1.mjs to provjerava.

   Ulaz: apps/portal/kanal/<kanal>/feed.json
   Izlaz: apps/portal/top-teme/index.html (+ /en/), data/top-teme.json */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const KANAL = join(PORTAL, 'kanal');

const STOP = new Set(`osvrt video foto the and for with from that this after before over under says said will their they have been more than into amid also just what when where which while about there here today yesterday tomorrow novo nova novi još još jedan jednog godine godina danas jučer sutra prema nakon prije samo više manje može mogu treba biti bio bila bilo svoj svoja svoje ovog ove ovaj taj ta to koji koja koje nije nisu nema ima između protiv zbog kroz prema oko samo jedan dva tri sve svi sva ali ili ako kad kako što tko gdje zašto sedaj noch nicht eine einen einem eines wird wurden über unter nach vor bei seit auch oder aber wenn dann dass dieser diese dieses heute gestern morgen mehr sehr anni anno anni dopo prima anche della delle degli questo questa questi oggi ieri domani sulla sulle nel nella non più senza essere stato stata stati state delle degli per con tra fra come dove quando perché anche ancora molto tutti tutte tutto tutta care pentru după astazi azi ieri mâine maine fără fara dintre sunt este fost avea peste între intre dintre către catre despre după când cand cum unde foarte mai mult mulți multi multe această aceasta acest acestui după carele caror căror които това тази този след преди също или като защото днес вчера утре която който които този тази това még mint után előtt azonban vagy hogy ezt volt lesz nagyon ezek azzal ebben abban tudi kar pred po med brez danes včeraj jutri lahko zato ker še že tudi tako tisti tista tisto listopada listopad studenoga siječnja veljače ožujka travnja svibnja lipnja srpnja kolovoza rujna listopada prosinca januar februar mart april maj jun jul avgust septembar oktobar novembar decembar`.split(/\s+/).filter(Boolean));

const NORM = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
for (const w of [...STOP]) STOP.add(NORM(w));
for (const w of `vise manje nakon prije prema kroz izmedju protiv zbog oko samo jedan dva tri sve svi sva ali ili ako kad kako sto tko gdje zasto tvrdi kaze navodi pise donosi objavio objavila najnovije vesti vijesti novosti vest dan dana nocu jutro veceras sinoc`.split(/\s+/)) STOP.add(w);

const feeds = [];
for (const ch of readdirSync(KANAL, { withFileTypes: true })) {
  if (!ch.isDirectory()) continue;
  const f = join(KANAL, ch.name, 'feed.json');
  if (!existsSync(f)) continue;
  let d;
  try { d = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
  for (const it of d.items || []) {
    const title = String(it.title || '').replace(/^Osvrt:\s*/i, '').trim();
    if (!title) continue;
    const tags = Array.isArray(it.tags) ? it.tags : [];
    feeds.push({
      channel: ch.name,
      title,
      summary: String(it.summary || ''),
      date: String(it.date_published || ''),
      url: it.url || '',
      srcUrl: it._region?.sourceUrl || '',
      source: tags[0] || it._region?.source || '?',
      sourceId: it._region?.source || ''
    });
  }
}

if (!feeds.length) {
  console.error('Nema stavki u feedovima.');
  process.exit(1);
}

const latest = feeds.map((x) => x.date.slice(0, 10)).sort().pop();
const day = feeds.filter((x) => x.date.slice(0, 10) === latest);
const dayLabel = new Date(`${latest}T12:00:00Z`).toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Zagreb' });
const dayLabelEn = new Date(`${latest}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Zagreb' });

/* ---------- tokeni i klasteri ---------- */

const surface = new Map();   // norm → najčešći izvorni oblik
const docTokens = new Map(); // norm → Set(index)
day.forEach((it, i) => {
  for (const w of it.title.match(/[A-Za-zČĆŽŠĐčćžšđÀ-ÿ]{4,}/g) || []) {
    const n = NORM(w);
    if (n.length < 4 || STOP.has(n)) continue;
    if (!surface.has(n)) surface.set(n, new Map());
    const m = surface.get(n);
    m.set(w, (m.get(w) || 0) + 1);
    if (!docTokens.has(n)) docTokens.set(n, new Set());
    docTokens.get(n).add(i);
  }
});

const tokenSet = (n) => docTokens.get(n) || new Set();
const candidates = [...docTokens.entries()]
  .filter(([, set]) => set.size >= 6)
  .sort((a, b) => b[1].size - a[1].size);

const clusters = [];
for (const [token, set] of candidates) {
  // preskoči ako je skup gotovo podskup postojećeg klastera
  const inside = clusters.find((c) => {
    let common = 0;
    for (const i of set) if (c.set.has(i)) common += 1;
    return common / set.size >= 0.8;
  });
  if (inside) { inside.tokens.push(token); continue; }
  clusters.push({ tokens: [token], set: new Set(set) });
}
// spoji klastere koji se preklapaju više od 60 %
for (let a = 0; a < clusters.length; a += 1) {
  for (let b = a + 1; b < clusters.length; b += 1) {
    const A = clusters[a].set, B = clusters[b].set;
    if (!A.size || !B.size) continue;
    let common = 0;
    for (const i of A) if (B.has(i)) common += 1;
    if (common / Math.min(A.size, B.size) >= 0.85) {
      clusters[b].set = new Set([...A, ...B]);
      clusters[b].tokens = [...clusters[b].tokens, ...clusters[a].tokens];
      clusters[a].set = new Set();
    }
  }
}

const topForm = (token) => {
  const m = surface.get(token);
  if (!m) return token;
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

const themes = clusters
  .filter((c) => c.set.size >= 8)
  .map((c) => {
    const items = [...c.set].map((i) => day[i]);
    const tokens = [...new Set(c.tokens)].sort((a, b) => tokenSet(b).size - tokenSet(a).size);
    const inCluster = (tok) => {
      let n = 0;
      for (const i of c.set) if (tokenSet(tok).has(i)) n += 1;
      return n / c.set.size;
    };
    const picked = [tokens[0]];
    const second = tokens.slice(1).find((tok) => inCluster(tok) >= 0.6 && tokenSet(tok).size >= 6);
    if (second) picked.push(second);
    return { items, tokens: picked.map(topForm) };
  })
  .sort((a, b) => b.items.length - a.items.length)
  .slice(0, 5);

const hasNumber = (t) => /\d/.test(t);
const hasQuestion = (t) => /\?/.test(t);
const hasUnnamed = (t) => /\b(izvor|izvori|krugovi|neimenovan|anonim|prema saznanjima|saznaje|sources say)\b/i.test(t);
const slugify = (s) => NORM(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const data = {
  generatedFor: latest,
  generatedAt: new Date().toISOString(),
  dayItems: day.length,
  themes: []
};

themes.forEach((t, idx) => {
  const items = [...t.items].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const channels = [...new Set(items.map((x) => x.channel))];
  const sources = [...new Set(items.map((x) => x.source))];
  const times = items.map((x) => x.date.slice(11, 16)).sort();
  const digits = items.filter((x) => hasNumber(x.title)).length;
  const questions = items.filter((x) => hasQuestion(x.title)).length;
  const unnamed = items.filter((x) => hasUnnamed(`${x.title} ${x.summary}`)).length;

  // citati: različiti izvori, najviše 4
  const seen = new Set();
  const quotes = [];
  for (const it of items) {
    if (seen.has(it.source)) continue;
    seen.add(it.source);
    quotes.push({
      id: `t${idx + 1}q${quotes.length + 1}`,
      text: it.title,
      source: it.source,
      channel: it.channel,
      date: it.date.slice(0, 10),
      url: it.url,
      srcUrl: it.srcUrl
    });
    if (quotes.length === 4) break;
  }

  const slug = `${slugify(t.tokens[0])}-${latest}`;
  data.themes.push({
    slug,
    label: t.tokens.join(' · '),
    labelEn: t.tokens.join(' · '),
    date: latest,
    count: items.length,
    channels: channels.length,
    sources: sources.length,
    timeFrom: times[0] || '',
    timeTo: times[times.length - 1] || '',
    digits,
    questions,
    unnamed,
    quotes,
    sourceLinks: [...new Map(items.map((x) => [x.source, { name: x.source, href: `/kanal/${x.channel}/izvor/${x.sourceId}/` }])).values()].slice(0, 8),
    channelsUsed: channels
  });
});

writeFileSync(join(PORTAL, 'data', 'top-teme.json'), `${JSON.stringify(data, null, 2)}\n`);

/* ---------- stranica ---------- */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = (t) => (t ? `${t}` : '');
const hr = (n, one, few, many) => `${n} ${n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? few : many)}`;
const en = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function page(lang, themeList) {
  const EN = lang === 'en';
  const blocks = themeList.map((t, i) => {
    const quotes = t.quotes.map((q) => `<blockquote class="tt-q" data-ev="q:${q.id}">
        <p data-quote="${q.id}">„${esc(q.text)}"</p>
        <footer>${esc(q.source)} · ${esc(q.date)} · <a href="${esc(q.srcUrl || q.url)}" rel="external noopener nofollow">${EN ? 'source' : 'izvornik'} ↗</a></footer>
      </blockquote>`).join('\n');
    const src = t.sourceLinks.map((s) => `<a href="${esc(s.href)}">${esc(s.name)}</a>`).join(', ');
    return `<article class="tt-theme" id="t-${String(i + 1).padStart(2, '0')}">
      <header class="tt-head">
        <span class="tt-n">${String(i + 1).padStart(2, '0')}</span>
        <h2>${esc(t.label)}</h2>
        <span class="tt-count">${EN ? `${en(t.count, 'story', 'stories')} · ${en(t.channels, 'channel', 'channels')} · ${en(t.sources, 'source', 'sources')}` : `${hr(t.count, 'naslov', 'naslova', 'naslova')} · ${hr(t.channels, 'kanal', 'kanala', 'kanala')} · ${hr(t.sources, 'izvor', 'izvora', 'izvora')}`}</span>
      </header>
      <p class="tt-stat" data-stat="t${i + 1}-count" data-ev="s:t${i + 1}-count">${EN
        ? `On ${esc(dayLabelEn)}, the archive holds <b>${t.count}</b> ${t.count === 1 ? 'story' : 'stories'} on this topic across <b>${t.channels}</b> ${t.channels === 1 ? 'channel' : 'channels'} and <b>${t.sources}</b> ${t.sources === 1 ? 'source' : 'sources'}, published between ${fmtTime(t.timeFrom)} and ${fmtTime(t.timeTo)}.`
        : `Na dan ${esc(dayLabel)} u arhivi je <b>${t.count}</b> ${t.count === 1 ? 'naslov' : 'naslova'} na ovu temu, u <b>${t.channels}</b> ${t.channels === 1 ? 'kanalu' : 'kanala'} i iz <b>${t.sources}</b> ${t.sources === 1 ? 'izvora' : 'izvora'}, objavljenih između ${fmtTime(t.timeFrom)} i ${fmtTime(t.timeTo)}.`}</p>
      ${quotes}
      <p class="tt-stat" data-stat="t${i + 1}-shape" data-ev="s:t${i + 1}-shape">${EN
        ? `Of ${t.count} headlines, <b>${t.digits}</b> contain a number, <b>${t.questions}</b> are questions, and <b>${t.unnamed}</b> mention an unnamed source.`
        : `Od ${t.count} naslova, <b>${t.digits}</b> ima brojku u naslovu, <b>${t.questions}</b> su pitanja, a <b>${t.unnamed}</b> spominje neimenovan izvor.`}</p>
      <p class="tt-ask" data-ev="ask">${EN
        ? 'If the number is in the headline but the summary names no document, where can a reader verify it?'
        : 'Ako je brojka u naslovu, a sažetak ne imenuje dokument — gdje je čitatelj može provjeriti?'}</p>
      <p class="tt-src">${EN ? 'Sources' : 'Izvori'}: ${src}</p>
    </article>`;
  }).join('\n');

  return `<!doctype html>
<html lang="${EN ? 'en' : 'hr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${EN ? 'Top topics of the day — critical reading' : 'Top teme dana — kritičko čitanje'} | AKTUAL MEDIA</title>
<meta name="description" content="${EN
    ? `Top five topics from the archive for ${esc(dayLabelEn)}: counts, verbatim headlines and questions. No claim without a quote or a number.`
    : `Pet najzastupljenijih tema u arhivi za ${esc(dayLabel)}: brojevi, doslovni naslovi i pitanja. Nijedna tvrdnja bez citata ili brojke.`}">
<meta name="keywords" content="GNK ASG, AKTUAL MEDIA, top teme, kritičko čitanje, medijska analiza, dnevne teme">
<meta property="og:type" content="article">
<meta property="og:title" content="${EN ? 'Top topics of the day' : 'Top teme dana'} — AKTUAL MEDIA">
<meta property="og:description" content="${EN ? 'Counts, verbatim headlines and questions — nothing invented.' : 'Brojevi, doslovni naslovi i pitanja — ništa izmišljeno.'}">
<meta property="og:locale" content="${EN ? 'en_GB' : 'hr_HR'}">
<link rel="canonical" href="https://gnk-asg.hr/top-teme/${EN ? 'en/' : ''}">
<link rel="alternate" hreflang="hr" href="https://gnk-asg.hr/top-teme/">
<link rel="alternate" hreflang="en" href="https://gnk-asg.hr/top-teme/en/">
<link rel="alternate" hreflang="x-default" href="https://gnk-asg.hr/top-teme/">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: EN ? 'Top topics of the day' : 'Top teme dana',
    datePublished: latest,
    numberOfItems: themeList.length,
    itemListElement: themeList.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.label, url: `https://gnk-asg.hr/top-teme/#t-${String(i + 1).padStart(2, '0')}` }))
  })}</script>
<style>
*{box-sizing:border-box}body{margin:0;background:#faf7ef;color:#14181e;font:16px/1.6 Georgia,serif}
a{color:#8c2f2f}
.tt-top{background:#0d1723;color:#f3ead6;padding:10px 18px;font:700 10px/1.4 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase}
.tt-top a{color:#e9c66c;text-decoration:none;margin-right:16px}
.tt-wrap{max-width:980px;margin:0 auto;padding:34px 20px 60px}
h1{font:900 clamp(28px,4.6vw,46px)/1.02 Impact,"Arial Black",system-ui,sans-serif;text-transform:uppercase;margin:0 0 8px}
.tt-lead{font-size:16.5px;max-width:76ch;color:#3d3a33;margin:0 0 6px}
.tt-rule{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 26px}
.tt-pill{border:1px solid #d8cfbb;border-radius:999px;padding:7px 12px;background:#fff;font:800 9.5px/1 system-ui,sans-serif;letter-spacing:.11em;text-transform:uppercase;color:#5d5648}
.tt-theme{background:#fff;border:1px solid #e3d9c3;border-left:6px solid #c8963c;border-radius:14px;padding:18px 18px 14px;margin:0 0 16px;box-shadow:0 10px 24px rgba(31,38,48,.06)}
.tt-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.tt-n{font:900 12px/1 system-ui,sans-serif;color:#b8862f;letter-spacing:.1em}
.tt-head h2{margin:0;font:900 20px/1.15 system-ui,sans-serif}
.tt-count{margin-left:auto;font:800 9.5px/1.3 system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#7a7264;background:#f6f2e8;border:1px solid #e6ddc9;border-radius:999px;padding:6px 10px}
.tt-stat{margin:0 0 10px;font-size:15.5px}
.tt-q{margin:0 0 10px;padding:10px 14px;border-left:3px solid #111;background:#fbf8f0}
.tt-q p{margin:0 0 6px;font:600 15px/1.45 Georgia,serif}
.tt-q footer{font:700 10px/1.3 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6b6558}
.tt-ask{margin:10px 0;font-style:italic;color:#3f3a31}
.tt-src{margin:0;font:600 12px/1.5 system-ui,sans-serif;color:#5d5648}
.tt-src a{text-decoration:none;border-bottom:1px solid #d8cfbb}
.tt-foot{display:flex;gap:14px;flex-wrap:wrap;border-top:1px solid #e3d9c3;margin-top:26px;padding-top:14px}
.tt-foot a{font:800 10.5px/1 system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;color:#8c2f2f}
.tt-tags{list-style:none;display:flex;flex-wrap:wrap;gap:7px;margin:18px 0 0;padding:0}
.tt-tags li a{display:inline-block;font:800 9.5px/1 system-ui,sans-serif;text-decoration:none;color:#4a463d;background:#f6f2e8;border:1px solid #e0d6c1;border-radius:999px;padding:5px 9px}
.tt-note{font-size:13px;color:#5d5648;border-left:3px solid #c8963c;padding-left:12px;margin:18px 0 0}
@media(max-width:560px){.tt-count{margin-left:0}}
</style>
</head>
<body>
<div class="tt-top"><a href="/">GNK ASG</a><a href="/gnk-aktual/">AKTUAL MEDIA</a><a href="/medijska-kritika/">${EN ? 'Media critique' : 'Kritika medija'}</a><a href="/izdanja/">${EN ? 'Editions' : 'Izdanja'}</a><a href="/kanal/">${EN ? 'Channels' : 'Kanali'}</a><a href="/radio/">Radio</a><a href="/galerija/">${EN ? 'Gallery' : 'Galerija'}</a></div>
<main class="tt-wrap">
  <h1>${EN ? 'Top topics of the day' : 'Top teme dana'}</h1>
  <p class="tt-lead">${EN
    ? 'Five topics with the most stories in the archive. Every sentence here is either a verbatim headline, a number computed from the archive, or a question.'
    : 'Pet tema s najviše naslova u arhivi. Svaka rečenica ovdje je ili doslovan naslov, ili broj izračunat iz arhive, ili pitanje.'}</p>
  <div class="tt-rule">
    <span class="tt-pill">${EN ? 'latest day in archive' : 'zadnji dan u arhivi'}: <b>${EN ? esc(dayLabelEn) : esc(dayLabel)}</b></span>
    <span class="tt-pill"><b>${day.length}</b> ${EN ? 'stories that day' : 'naslova tog dana'}</span>
    <span class="tt-pill"><b>${themeList.length}</b> ${EN ? 'topics' : 'tema'}</span>
    <span class="tt-pill">${EN ? 'quotes + numbers only' : 'samo citati i brojevi'}</span>
  </div>
  ${blocks}
  <p class="tt-note">${EN
    ? 'Method: topics are ranked by the number of headlines in the archive for that day. Headlines are quoted verbatim, with source and date; counts are recomputed at build time. Nothing is added from outside the archive.'
    : 'Metoda: teme su rangirane po broju naslova u arhivi za taj dan. Naslovi su citirani doslovno, s izvorom i datumom; brojevi se ponovno računaju pri svakom buildu. Ništa se ne dodaje izvan arhive.'}</p>
  <ul class="tt-tags" aria-label="${EN ? 'Tags' : 'Oznake'}">
    <li><a href="/nermin-sefic/">#NerminSefić</a></li>
    <li><a href="/nermin-sefic/">#NerminSefic</a></li>
    <li><a href="/autorske-objave/">#SeficNermin</a></li>
    <li><a href="/autorske-objave/">#SEFICNERMIN</a></li>
    <li><a href="/nermin-sefic/">#UrednikNerminSefić</a></li>
    <li><a href="/gnk-aktual/">#AKTUALMEDIA</a></li>
    <li><a href="/kanal/">#GNKASG</a></li>
    <li><a href="/top-teme/">#TopTeme</a></li>
  </ul>
  <nav class="tt-foot">
    <a href="/gnk-aktual/">← AKTUAL MEDIA</a>
    <a href="/medijska-kritika/">${EN ? 'Media critique' : 'Kritika medija'}</a>
    <a href="/izdanja/">${EN ? 'All editions' : 'Sva izdanja'}</a>
    <a href="/kanal/">${EN ? 'All channels' : 'Svi kanali'}</a>
    <a href="/workers/grupacije/">${EN ? 'Worker groups' : 'Grupacije radnika'}</a>
    <a href="/top-teme/${EN ? '' : 'en/'}">${EN ? 'Hrvatski' : 'English'}</a>
  </nav>
</main>
</body>
</html>`;
}

const dir = join(PORTAL, 'top-teme');
mkdirSync(join(dir, 'en'), { recursive: true });
writeFileSync(join(dir, 'index.html'), page('hr', data.themes));
writeFileSync(join(dir, 'en', 'index.html'), page('en', data.themes));

console.log(JSON.stringify({
  ok: true,
  day: latest,
  items: day.length,
  themes: data.themes.map((t) => [t.label, t.count, t.channels, t.sources])
}));
