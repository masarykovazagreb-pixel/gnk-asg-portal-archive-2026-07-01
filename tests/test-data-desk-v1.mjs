#!/usr/bin/env node
// Podatkovni desk — četiri mjerenja vlastite arhive.
//
// Ono što se tiho kvari kod ovakvih stranica:
//   1. brojka na stranici prestane odgovarati arhivi iz koje je izračunata,
//   2. stranica ostane bez para na drugom jeziku ili bez sitemapa,
//   3. structured data tvrdi Dataset koji ne postoji.
// Test zato ne provjerava ljepotu, nego da svaki broj ima izvor u
// apps/region/data/*.json i da je svaka stranica povezana u oba smjera.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const DATA = path.join(ROOT, 'apps', 'region', 'data');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));
const readPage = (route) => fs.readFileSync(path.join(PORTAL, route, 'index.html'), 'utf8');
const pageExists = (route) => fs.existsSync(path.join(PORTAL, route, 'index.html'));

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

const DESKS = [
  ['aktual-media/nocna-smjena', 'en/aktual-media/the-3am-edition'],
  ['aktual-media/jedan-glas', 'en/aktual-media/one-voice'],
  ['aktual-media/karta-tisine', 'en/aktual-media/the-silence-map'],
  ['aktual-media/osam-jezika', 'en/aktual-media/one-vocabulary'],
];
const INDEX = [['aktual-media', 'en/aktual-media']];

/* ---------- 1. stranice postoje i nose ugovor ---------- */

for (const [hr, en] of [...INDEX, ...DESKS]) {
  for (const [route, lang] of [[hr, 'hr'], [en, 'en']]) {
    const file = `${route}/index.html`;
    if (!pageExists(route)) { check(false, `${file}: stranica ne postoji`); continue; }
    const html = readPage(route);
    check(/<html lang="(hr|en)"/.test(html), `${file}: nema html lang`);
    check(html.includes(`hreflang="hr"`) && html.includes(`hreflang="en"`), `${file}: nema hreflang par`);
    check(/rel="canonical" href="https:\/\/gnk-asg\.hr\//.test(html), `${file}: canonical nije apsolutan`);
    check(html.includes('name="editor" content="Nermin Sefić"'), `${file}: nema urednika`);
    check(html.includes('#AktualMedia'), `${file}: nema hashtagova`);
    check(html.includes('class="dd-skip"'), `${file}: nema preskoka sadržaja`);
    check(/:focus-visible/.test(html), `${file}: nema vidljivog fokusa`);
    check(html.includes('/assets/public-unified-menu-v6.js'), `${file}: nema jedinstvenog izbornika`);
    check(html.includes('id="sadrzaj"'), `${file}: nema glavne mete`);
    check(new RegExp(`hreflang="${lang}"`).test(html), `${file}: hreflang ne uključuje vlastiti jezik`);

    const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    check(links.length >= 6, `${file}: samo ${links.length} poveznica (traži se ≥6)`);
    check(links.some((href) => href.startsWith('/gnk-aktual/')), `${file}: nema puta natrag na AKTUAL MEDIA`);
    check(links.some((href) => href === '/izdanja/' || href.startsWith('/izdanja/')), `${file}: nema poveznice na izdanja`);

    // JSON-LD mora biti ispravan JSON i nositi WebSite + Dataset.
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    check(blocks.length >= 1, `${file}: nema JSON-LD`);
    let parsed = null;
    for (const block of blocks) {
      try { parsed = JSON.parse(block); } catch { check(false, `${file}: JSON-LD nije ispravan JSON`); }
    }
    const graph = parsed?.['@graph'] || (parsed ? [parsed] : []);
    const types = graph.flatMap((node) => (Array.isArray(node['@type']) ? node['@type'] : [node['@type']]));
    check(types.includes('WebSite'), `${file}: JSON-LD bez WebSite čvora`);
    if (!INDEX.some(([a, b]) => route === a || route === b)) {
      check(types.includes('Dataset'), `${file}: JSON-LD bez Dataset čvora`);
    }
    check(types.filter((type) => type === 'WebSite').length === 1, `${file}: ${types.filter((t) => t === 'WebSite').length} WebSite čvora (očekivan 1)`);
  }
}

/* ---------- 2. brojke dolaze iz arhive ---------- */

const dataFile = 'apps/portal/data/aktual-data-desk-v1.json';
check(exists(dataFile), `${dataFile}: nema datoteke s mjerenjima`);
if (exists(dataFile)) {
  const data = JSON.parse(read(dataFile));
  const channels = fs.readdirSync(DATA).filter((name) => name.endsWith('.json') && !name.startsWith('_'));
  check(data.channels === channels.length, `mjerenja pokrivaju ${data.channels} izdanja, arhiva ima ${channels.length}`);

  let items = 0;
  for (const name of channels) {
    const channel = JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'));
    items += (channel.items || []).filter((item) => item && item.date && item.slug).length;
  }
  check(data.items === items, `mjerenja tvrde ${data.items} zapisa, arhiva ima ${items}`);

  const sumNight = data.night.rows.reduce((n, row) => n + row.count, 0);
  check(sumNight === data.night.totals.items, `zbroj noćnih redaka ${sumNight} nije jednak ukupnom ${data.night.totals.items}`);
  check(data.night.totals.items <= data.items, 'noćnih zapisa više nego svih zapisa');

  for (const row of data.night.rows) {
    check(row.count <= row.total, `${row.id}: noćnih ${row.count} više od ukupno ${row.total}`);
    check(row.share >= 0 && row.share <= 100, `${row.id}: udio izvan 0–100`);
  }
  for (const row of data.voice.rows) {
    check(row.leadShare >= 0 && row.leadShare <= 100, `${row.id}: udio izvora izvan 0–100`);
    check(row.sources >= 1, `${row.id}: bez izvora`);
  }
  for (const row of data.silence.rows) {
    check(row.gap >= 0, `${row.id}: negativna pauza`);
    check(row.gapEnd >= row.gapStart, `${row.id}: pauza završava prije početka`);
  }
  check(Array.isArray(data.vocabulary) && data.vocabulary.length > 0, 'rječnik je prazan');
  for (const word of data.vocabulary) {
    check(word.cities >= 4 && word.cities <= data.channels, `${word.token}: gradova ${word.cities}`);
  }

  // Brojka iz zaglavlja stranice mora postojati u mjerenjima.
  const nightPage = readPage(DESKS[0][0]);
  check(nightPage.includes(`<b>${data.night.totals.items}</b>`), 'noćna stranica ne prikazuje ukupan broj iz mjerenja');
  const voicePage = readPage(DESKS[1][0]);
  check(voicePage.includes(`${data.voice.rows[0].leadShare}%`), 'stranica o izvorima ne prikazuje izmjereni vrh');
}

/* ---------- 3. sitemap i povezanost u oba smjera ---------- */

check(exists('apps/portal/aktual-media/sitemap.xml'), 'nema sitemapa sekcije');
const sectionSitemap = read('apps/portal/aktual-media/sitemap.xml');
for (const [hr, en] of DESKS) {
  check(sectionSitemap.includes(`https://gnk-asg.hr/${hr}/`), `sitemap sekcije bez ${hr}`);
  check(sectionSitemap.includes(`https://gnk-asg.hr/${en}/`), `sitemap sekcije bez ${en}`);
}

check(exists('apps/portal/sitemap.xml'), 'nema glavnog sitemapa');
const mainSitemap = read('apps/portal/sitemap.xml');
for (const [hr, en] of [...INDEX, ...DESKS]) {
  check(mainSitemap.includes(`<loc>https://gnk-asg.hr/${hr}/</loc>`), `glavni sitemap bez ${hr}`);
  check(mainSitemap.includes(`<loc>https://gnk-asg.hr/${en}/</loc>`), `glavni sitemap bez ${en}`);
}
check(read('apps/portal/sitemap-index.xml').includes('aktual-media/sitemap.xml'), 'sitemap-index ne navodi sekciju');

// AKTUAL MEDIA mora pokazivati na desk, a desk natrag na AKTUAL MEDIA.
for (const file of ['apps/portal/gnk-aktual/index.html', 'apps/portal/en/gnk-aktual/index.html']) {
  const html = read(file);
  check(html.includes('DATA-DESK-BAND:START'), `${file}: nema trake podatkovnog deska`);
  for (const [hr, en] of DESKS) {
    check(html.includes(`/${hr}/`) || html.includes(`/${en}/`), `${file}: traka ne vodi na ${hr}`);
  }
}
check(read('apps/portal/izdanja/index.html').includes('/aktual-media/'), '/izdanja/ ne vodi na podatkovni desk');

/* ---------- 4. agent zna o čemu se radi ---------- */

const kb = JSON.parse(read('apps/portal/data/knowledge-base.json'));
const group = (kb.skupine || []).find((item) => String(item.naslov || '').trim() === 'Podatkovni desk');
check(Boolean(group), 'baza znanja nema skupinu Podatkovni desk');
if (group) {
  check((group.pitanja || []).length >= 8, `skupina ima ${(group.pitanja || []).length} pitanja, traži se ≥8`);
  const text = (group.pitanja || []).map((item) => `${item.p} ${item.o}`).join(' ');
  for (const [hr, en] of DESKS) {
    check(text.includes(hr) || text.includes(en), `baza znanja ne povezuje ${hr}`);
  }
  check(!/Stranica:/i.test(text), 'baza znanja vraća hrvatski sufiks "Stranica:" u odgovorima deska');
}

const generated = read('workers/gnk-asg-direct-operator/src/knowledge-base.generated-v1.js');
check(generated.includes('Podatkovni desk'), 'modul asistenta ne sadrži skupinu deska');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.slice(0, 25) }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, pages: (INDEX.length + DESKS.length) * 2, failures: 0 }, null, 2));
}
