#!/usr/bin/env node
/**
 * HR/EN index parity — jedan izvor istine za podium AKTUAL MEDIA.
 *
 * Generira i upisuje u oba indexa:
 *   - krugove gradova (8 izdanja) s cistim fotografijama i srcsetom,
 *   - traku deskova, radija, galerije i tjednika,
 *   - red hashtagova.
 *
 * Upotreba:
 *   node scripts/build-index-parity.mjs           # upisi
 *   node scripts/build-index-parity.mjs --check   # samo provjeri (CI)
 *
 * Skript je idempotentan: isti ulaz daje isti izlaz, bez vremenskih oznaka.
 */
import fs from 'node:fs';
import path from 'node:path';
import { archiveCount, hrCount, enCount } from './lib/archive-count.mjs';

const ROOT = process.cwd();
const HR = path.join(ROOT, 'apps/portal/index.html');
const EN = path.join(ROOT, 'apps/portal/en/index.html');
const DATA = path.join(ROOT, 'apps/portal/data/izdanja.json');
const CHANNELS_FILE = path.join(ROOT, 'apps/region/channels.json');
/* Engleska imena gradova za krugove: izdanje na engleskom zadržava svoje ime,
   a hrvatski grad dobiva engleski oblik (Rome, Sofia, Beijing…). */
const CITY_EN = { zagreb: 'Zagreb', beograd: 'Belgrade', sarajevo: 'Sarajevo', budimpesta: 'Budapest', ljubljana: 'Ljubljana', rim: 'Rome', sofija: 'Sofia', bukurest: 'Bucharest', nairobi: 'Nairobi', jakarta: 'Jakarta', newyork: 'New York', saopaulo: 'São Paulo', sydney: 'Sydney', singapur: 'Singapore', kairo: 'Cairo', tokio: 'Tokyo', peking: 'Beijing' };

const checkOnly = process.argv.includes('--check');

const DESKS = [
  { slug: 'sport', hr: 'Sport', en: 'Sport' },
  { slug: 'politika', hr: 'Politika', en: 'Politics' },
  { slug: 'sigurnost', hr: 'Sigurnost', en: 'Security' },
  { slug: 'biznis', hr: 'Business', en: 'Business' },
  { slug: 'tehnologija', hr: 'Tehnologija', en: 'Technology' },
  { slug: 'moda', hr: 'Tjednik Mode', en: 'Fashion Weekly' },
  { slug: 'putovanja', hr: 'Putovanja', en: 'Travel' },
  { slug: 'ljubimci', hr: 'Ljubimci', en: 'Pets' },
  { slug: 'svijet', hr: 'Svijet', en: 'World' },
];

const TAGS = [
  '#NerminSefić', '#NerminSefic', '#SeficNermin', '#SEFICNERMIN',
  '#UrednikNerminSefić', '#AKTUALMEDIA', '#GNKASG',
];

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function cards() {
  const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const list = Array.isArray(data.cards) ? data.cards : [];
  const ids = JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8')).channels.map((c) => c.id);
  const out = ids.map((id) => list.find((c) => c && c.id === id)).filter(Boolean);
  if (out.length !== ids.length) throw new Error(`Ocekivano ${ids.length} izdanja, dobiveno ${out.length}`);
  return out;
}

function circle(c, lang) {
  const en = lang === 'en';
  /* Izdanje koje je već na engleskom nema zaseban /en/ članak — tamo stoji
     kratka stranica s noindex. Zato krug vodi ravno na izdanje. */
  const href = en && c.lang !== 'en' ? `/kanal/${c.id}/en/` : `/kanal/${c.id}/`;
  const city = en ? (CITY_EN[c.id] || c.city) : c.city;
  /* Na engleskoj stranici svaki kanal nosi engleski natpis CHANNEL, bez
     obzira na jezik izdanja; hrvatski natpis KANAL ostaje na HR stranici. */
  const label = en
    ? `AKTUAL MEDIA CHANNEL ${String(city).toUpperCase()} — ${esc(city)}`
    : `AKTUAL MEDIA KANAL ${String(city).toUpperCase()} — ${esc(city)}`;
  return `<li class="amz-i"><a href="${href}" aria-label="${label}"${c.lang === 'en' ? ' hreflang="en"' : ''}><span class="amz-img"><img src="/assets/izdanja/${c.id}-440.webp" srcset="/assets/izdanja/${c.id}-240.webp 240w, /assets/izdanja/${c.id}-440.webp 440w" sizes="(max-width:980px) 92px, (max-width:1240px) 12vw, 160px" alt="${label}" width="440" height="296" decoding="async"></span><b>${esc(city)}</b><small>${esc(c.lang)}</small></a></li>`;
}

/* Dva samostalna portala: iste pločice kao kanali, ali vanjska domena.
   ARHIVA i DNEVNIK nisu podstranice gnk-asg.hr — imaju vlastiti sitemap i feed. */
function portalTiles(lang) {
  const en = lang === 'en';
  const items = [
    { id: 'arhiva', url: `https://gnk-asg-arhiva.pages.dev/${en ? 'en/' : ''}`, label: en ? `AKTUAL ARCHIVE — ${enCount(archiveCount())} stories from the city editions, with originals. Opens the archive portal.` : `AKTUAL ARHIVA — ${hrCount(archiveCount())} tekstova gradskih izdanja, s izvornikom. Otvara arhivu na zasebnoj domeni.`, name: en ? 'ARCHIVE' : 'ARHIVA', lang: en ? 'en' : 'hr' },
    { id: 'dnevnik', url: `https://gnk-asg-dnevnik.pages.dev/${en ? 'en/' : ''}`, label: en ? 'AKTUAL DAILY — one day, every city that published, hour by hour. Opens the daily portal.' : 'AKTUAL DNEVNIK — jedan dan, svi gradovi koji su objavili, po satima. Otvara dnevnik na zasebnoj domeni.', name: en ? 'DAILY' : 'DNEVNIK', lang: en ? 'en' : 'hr' },
  ];
  return items.map((p) => `<li class="amz-i amz-i--portal"><a href="${p.url}" rel="external noopener" aria-label="${esc(p.label)}"><span class="amz-img"><img src="/assets/izdanja/${p.id}-440.webp" srcset="/assets/izdanja/${p.id}-240.webp 240w, /assets/izdanja/${p.id}-440.webp 440w" sizes="(max-width:980px) 92px, (max-width:1240px) 12vw, 160px" alt="${esc(p.label)}" width="440" height="294" decoding="async"></span><b>${esc(p.name)}</b><small>${esc(p.lang)}</small></a></li>`).join('');
}

function deskStrip(lang) {
  const en = lang === 'en';
  const desk = DESKS.map((d) => `<li><a href="/izdanja/${d.slug}/"><b>${en ? d.en : d.hr}</b><span>${en ? 'desk' : 'desk'}</span></a></li>`).join('');
  const tail = en
    ? `<li><a class="is-radio" href="/en/radio/"><b>AKTUAL MEDIA RADIO</b><span>player</span></a></li>`
    : `<li><a class="is-radio" href="/radio/"><b>AKTUAL MEDIA RADIO</b><span>player</span></a></li>`;
  const gallery = `<li><a href="/galerija/"><b>${en ? 'Gallery' : 'Galerija'}</b><span>${en ? 'photo' : 'foto'}</span></a></li>`;
  const total = JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8')).channels.length;
  const channels = `<li><a href="/kanal/"><b>${en ? 'All channels' : 'Svi kanali'}</b><span>${total} ${en ? 'editions' : 'izdanja'}</span></a></li>`;
  const tjednik = `<li><a href="https://gnk-asg-tjednik.pages.dev/" rel="external noopener"><b>Business Tjednik</b><span>${en ? 'weekly' : 'tjednik'}</span></a></li>`;
  const hub = `<li><a href="${en ? '/en/gnk-aktual/' : '/gnk-aktual/'}"><b>AKTUAL MEDIA</b><span>${en ? 'hub' : 'središte'}</span></a></li>`;
  const satellites = `<li><a href="https://gnk-asg-arhiva.pages.dev/${en ? 'en/' : ''}" rel="external noopener"><b>${en ? 'AKTUAL ARCHIVE' : 'AKTUAL ARHIVA'}</b><span>${en ? 'portal' : 'portal'}</span></a></li><li><a href="https://gnk-asg-dnevnik.pages.dev/${en ? 'en/' : ''}" rel="external noopener"><b>${en ? 'AKTUAL DAILY' : 'AKTUAL DNEVNIK'}</b><span>${en ? 'portal' : 'portal'}</span></a></li>`;
  const week = `<li><a href="https://gnk-asg-tjednik.pages.dev/tjednik/2026-W43/" rel="external noopener"><b>Tjednik W43</b><span>${en ? 'this week' : 'ovaj tjedan'}</span></a></li>`;
  return `<ul class="amz-net" aria-label="${en ? 'Desks, radio and other AKTUAL MEDIA pages' : 'Deskovi, radio i ostale stranice AKTUAL MEDIA'}">${desk}${tail}${gallery}${channels}${tjednik}${hub}${satellites}${week}</ul>`;
}

function tagRow(lang) {
  const en = lang === 'en';
  const list = TAGS.map((t) => `<li><a href="/nermin-sefic/">${t}</a></li>`).join('');
  return `<ul class="amz-tags" aria-label="${en ? 'Edition hashtags' : 'Oznake izdanja'}">${list}</ul>`;
}

function podium(lang) {
  const row = `<ul class="amz-row">${cards().map((c) => circle(c, lang)).join('')}${portalTiles(lang)}</ul>`;
  return `${row}\n    ${deskStrip(lang)}\n    ${tagRow(lang)}`;
}

const TAGS_CSS = `  #aktual-izdanja .amz-tags{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0;padding:0;list-style:none}
  #aktual-izdanja .amz-tags a{display:inline-block;padding:5px 9px;border:1px solid #e0d6c1;border-radius:999px;background:#fff;color:#6b5a2a;font:800 10px/1 system-ui,sans-serif;letter-spacing:.06em;text-decoration:none}
  #aktual-izdanja .amz-tags a:hover{border-color:#c8963c;color:#8a6a1f;background:#fffdf6}`;

function replacePodium(html, lang) {
  const start = html.indexOf('<ul class="amz-row">');
  if (start < 0) throw new Error('amz-row nije pronaden');
  const endTag = html.indexOf('</section>', start);
  if (endTag < 0) throw new Error('kraj sekcije #aktual-izdanja nije pronaden');
  const before = html.slice(0, start);
  const after = html.slice(endTag);
  return `${before}${podium(lang)}\n  </div>\n  ${after}`;
}

function ensureHead(html) {
  const css = '<link rel="stylesheet" href="/assets/index-redesign-production.css?v=20261020-amz">';
  const js = '<script src="/assets/index-redesign-production.js?v=20261020-amz" defer></script>';
  let out = html;
  if (!out.includes('/assets/index-redesign-production.css')) out = out.replace('</head>', `${css}</head>`);
  if (!out.includes('/assets/index-redesign-production.js')) out = out.replace('</head>', `${js}</head>`);
  return out;
}

function ensureTagsCss(html) {
  if (html.includes('.amz-tags{')) return html;
  const style = `<style>\n${TAGS_CSS}\n</style>`;
  const anchor = '<div class="container">';
  const i = html.indexOf('id="aktual-izdanja"');
  const j = html.indexOf(anchor, i);
  return j < 0 ? html : html.slice(0, j) + style + '\n  ' + html.slice(j);
}

const SECTIONS = {
  hr: {
    highlights: `<section id="highlights"><div class="container"><div class="section-head"><div><p class="eyebrow">Istaknuto</p><h2>THE CODE i ideje u akciji</h2></div><p>Dva projekta koja pokazuju drugu stranu portala — od aktivacije grupe do praćenja sportaša.</p></div><div class="kartice-niz"><div class="static-preview-card"><img src="/assets/editorial/the-code-card.webp" width="600" height="600" alt="THE CODE — strateška aktivacija grupe" loading="lazy"><div class="static-preview-body"><h3 class="static-preview-title">THE CODE</h3><span class="static-preview-tag">Strateška aktivacija grupe</span><p>Aktivacija GNK DINAMO Ltd. grupe i njezino povezivanje u jedan sustav.</p><a class="btn gold" href="/the-code/">Otvori THE CODE &rarr;</a></div></div><div class="static-preview-card"><img src="/assets/editorial/projects-card.webp" width="600" height="600" alt="SPT — Sports Performance Tracking" loading="lazy"><div class="static-preview-body"><h3 class="static-preview-title">SPT</h3><span class="static-preview-tag">GPS + UWB praćenje sportaša</span><p>Sports Performance Tracking — praćenje kretanja i opterećenja sportaša.</p><a class="btn gold" href="/spt/">Otvori SPT &rarr;</a></div></div></div></div></section>`,
    'editorial-feed': `<section id="editorial-feed"><div class="container"><div class="section-head"><div><p class="eyebrow">Uredničke publikacije</p><h2>Objave i komentari</h2></div><p>Autorski tekstovi i komentari portala, s izvorima i uredničkim odobrenjem.</p></div><div class="kartice-niz"><div class="static-preview-card"><img src="/assets/editorial/objave-800.webp" width="600" height="600" alt="Objave GNK ASG" loading="lazy"><div class="static-preview-body"><h3 class="static-preview-title">Objave</h3><span class="static-preview-tag">Autorski tekstovi</span><p>Tekstovi o financijama, tehnologiji, upravljanju i tržištima, sa svakim izvorom navedenim.</p><a class="btn gold" href="/objave/">Otvori objave &rarr;</a></div></div><div class="static-preview-card"><img src="/assets/editorial/group-network-card.webp" width="600" height="600" alt="Komentari GNK ASG" loading="lazy"><div class="static-preview-body"><h3 class="static-preview-title">Komentari</h3><span class="static-preview-tag">Kritičko čitanje</span><p>Komentari na medijske objave i odluke, odvojeni od automatski sastavljenih osvrta.</p><a class="btn gold" href="/komentari/">Otvori komentare &rarr;</a></div></div><div class="static-preview-card"><img src="/assets/editorial/projects-card.webp" width="600" height="600" alt="Autorske objave" loading="lazy"><div class="static-preview-body"><h3 class="static-preview-title">Autorske objave</h3><span class="static-preview-tag">Popis svih autorskih tekstova</span><p>Sve autorske objave na jednom mjestu, s datumom i poveznicom na izvornik.</p><a class="btn gold" href="/autorske-objave/">Otvori popis &rarr;</a></div></div></div></div></section>`,
    'projects-preview': `<section id="projects-preview"><div class="container"><div class="section-head"><div><p class="eyebrow">Strateški portfelj</p><h2>Aktualni projekti</h2></div><p>Grupna mreža, digitalna radna snaga i sportski sustav — svaki projekt sa svojim ulazom.</p></div><div class="kartice-niz"><div class="static-preview-card"><img src="/assets/editorial/group-network-card.webp" width="600" height="600" alt="Grupna mreža GNK DINAMO Ltd." loading="lazy"><div class="static-preview-body"><h3 class="static-preview-title">Grupna mreža</h3><span class="static-preview-tag">33 društva · 12 lokacija u širenju</span><p>Interaktivni pregled društava, projekata i operativnih lokacija grupe.</p><a class="btn gold" href="/group-network/">Otvori mrežu &rarr;</a></div></div><div class="static-preview-card"><img src="/assets/editorial/projects-card.webp" width="600" height="600" alt="Digitalna radna snaga" loading="lazy"><div class="static-preview-body"><h3 class="static-preview-title">Digitalna radna snaga</h3><span class="static-preview-tag">Javna simulacija</span><p>Pregled radnih uloga, grupa i automatizacija koje održavaju portal.</p><a class="btn gold" href="/digital-workforce/">Otvori radnu snagu &rarr;</a></div></div></div></div></section>`,
  },
  en: {
    kartice: `<section id="kartice"><div class="container"><div class="section-head"><div><p class="eyebrow">Overview</p><h2>Everything in one place</h2></div><p>Group, projects, publications and markets — each area with its own entry point.</p></div><div class="kartice-niz"><div class="static-preview-card"><img src="/assets/editorial/group-network-card.webp" width="600" height="600" alt="Global Group Network" loading="lazy"><div class="static-preview-body"><h3 class="static-preview-title">Group network</h3><span class="static-preview-tag">33 companies · 12 expansion locations</span><p>Interactive view of the companies, projects and operating locations of the group.</p><a class="btn gold" href="/en/group-network/">Open network &rarr;</a></div></div><div class="static-preview-card"><img src="/assets/editorial/projects-card.webp" width="600" height="600" alt="Current projects" loading="lazy"><div class="static-preview-body"><h3 class="static-preview-title">Projects</h3><span class="static-preview-tag">Strategic portfolio</span><p>Development areas connected into a single system.</p><a class="btn gold" href="/en/projects/">Open projects &rarr;</a></div></div><div class="static-preview-card"><img src="/assets/editorial/objave-800.webp" width="600" height="600" alt="Publications" loading="lazy"><div class="static-preview-body"><h3 class="static-preview-title">Publications</h3><span class="static-preview-tag">Authored articles</span><p>Articles on finance, technology, governance and markets, with sources listed.</p><a class="btn gold" href="/en/publications/">Open publications &rarr;</a></div></div><div class="static-preview-card"><img src="/assets/editorial/the-code-card.webp" width="600" height="600" alt="Markets" loading="lazy"><div class="static-preview-body"><h3 class="static-preview-title">Markets</h3><span class="static-preview-tag">Indices · commodities · FX</span><p>Market overview with the same data shown on the Croatian index.</p><a class="btn gold" href="/en/markets/">Open markets &rarr;</a></div></div></div></div></section>`,
  },
};

function ensureSections(html, lang) {
  const wanted = SECTIONS[lang] || {};
  const missing = Object.entries(wanted).filter(([id]) => !html.includes(`id="${id}"`));
  if (!missing.length) return html;
  const block = missing.map(([, markup]) => markup).join('\n');
  return html.replace('</main>', `${block}\n</main>`);
}

function stats(html) {
  const ids = [...html.matchAll(/<section[^>]*id="([^"]+)"/g)].map((m) => m[1]);
  const rowStart = html.indexOf('<ul class="amz-row">');
  const rowEnd = html.indexOf('</ul>', rowStart);
  const row = html.slice(rowStart, rowEnd);
  const netStart = html.indexOf('<ul class="amz-net"');
  const netEnd = netStart < 0 ? -1 : html.indexOf('</ul>', netStart);
  return {
    ids,
    circles: (row.match(/class="amz-i"/g) || []).length,
    circlesEn: (row.match(/\/kanal\/[a-z]+\/en\//g) || []).length,
    tiles: (row.match(/-tile\.webp/g) || []).length,
    photos: (row.match(/src="[^"]*-440\.webp"/g) || []).length,
    srcset: (row.match(/srcset=/g) || []).length,
    desks: netStart < 0 ? 0 : (html.slice(netStart, netEnd).match(/<li>/g) || []).length,
    tags: (html.match(/class="amz-tags"/g) || []).length,
  };
}

function main() {
  const files = [
    { lang: 'hr', file: HR },
    { lang: 'en', file: EN },
  ];
  const next = {};
  for (const { lang, file } of files) {
    let html = fs.readFileSync(file, 'utf8');
    html = ensureHead(html);
    html = ensureTagsCss(html);
    html = replacePodium(html, lang);
    html = ensureSections(html, lang);
    next[file] = html;
  }

  const hr = stats(next[HR]);
  const en = stats(next[EN]);
  const problems = [];
  // Gradski krugovi + 2 samostalna portala (ARHIVA, DNEVNIK). Broj krugova se
  // čita iz channels.json, pa novo izdanje ne ruši paritet — nego ga proširuje.
  const expected = JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8')).channels.length;
  const englishChannelCount = JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8')).channels.filter((c) => c.lang === 'en').length;
  if (hr.circles !== expected || en.circles !== expected) problems.push(`krugovi HR=${hr.circles} EN=${en.circles} (očekivano ${expected})`);
  if (hr.photos !== expected + 2 || en.photos !== expected + 2) problems.push(`fotografije HR=${hr.photos} EN=${en.photos}`);
  if (hr.srcset !== expected + 2 || en.srcset !== expected + 2) problems.push(`srcset HR=${hr.srcset} EN=${en.srcset}`);
  if (hr.tiles || en.tiles) problems.push(`tile slike HR=${hr.tiles} EN=${en.tiles}`);
  // /en/ pregled postoji samo za izdanja koja nisu na engleskom.
  if (en.circlesEn !== expected - englishChannelCount) problems.push(`EN linkovi na /en/=${en.circlesEn} (očekivano ${expected - englishChannelCount})`);
  // 17 = 9 deskovi + radio + galerija + svi kanali + tjednik + hub + ARHIVA + DNEVNIK + tjednik W43
  if (hr.desks !== 17 || en.desks !== 17) problems.push(`deskovi HR=${hr.desks} EN=${en.desks}`);
  if (hr.tags !== 1 || en.tags !== 1) problems.push(`hashtag red HR=${hr.tags} EN=${en.tags}`);
  const hrIds = new Set(hr.ids);
  const enIds = new Set(en.ids);
  const missingInEn = [...hrIds].filter((x) => !enIds.has(x));
  const missingInHr = [...enIds].filter((x) => !hrIds.has(x));

  console.log(JSON.stringify({ hr, en, missingInEn, missingInHr, problems }, null, 2));

  if (checkOnly) {
    if (problems.length) {
      console.error(`INDEX PARITY FAILED: ${problems.join('; ')}`);
      process.exit(1);
    }
    const stale = files.filter(({ file }) => fs.readFileSync(file, 'utf8') !== next[file]);
    if (stale.length) {
      console.error(`INDEX PARITY FAILED: generirani sadrzaj nije upisan u ${stale.map((s) => path.relative(ROOT, s.file)).join(', ')}`);
      console.error('Pokreni: node scripts/build-index-parity.mjs');
      process.exit(1);
    }
    console.log('INDEX PARITY OK');
    return;
  }

  if (problems.length) {
    console.error(`INDEX PARITY FAILED: ${problems.join('; ')}`);
    process.exit(1);
  }

  for (const { file } of files) {
    const old = fs.readFileSync(file, 'utf8');
    if (old !== next[file]) {
      fs.writeFileSync(file, next[file]);
      console.log(`upisano: ${path.relative(ROOT, file)}`);
    } else {
      console.log(`bez promjene: ${path.relative(ROOT, file)}`);
    }
  }
}

main();
