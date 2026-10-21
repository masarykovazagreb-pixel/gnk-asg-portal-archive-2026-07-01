#!/usr/bin/env node
// Tehnologija budućnosti — pet mjerenih tehnologija, svaka s izvorom.
//
// Ono što se tiho kvari kod ovakve stranice:
//   1. brojka ostane bez izvora ili izvor prestane postojati u popisu,
//   2. nestane hreflang par, sitemap ili traka na matičnim stranicama,
//   3. structured data obeća citate kojih na stranici nema.
// Test zato ne provjerava ljepotu, nego ugovor: svaka tvrdnja nosi broj,
// svaki broj ima adresu, i sve je povezano u oba smjera.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));
const readPage = (route) => fs.readFileSync(path.join(PORTAL, route, 'index.html'), 'utf8');
const pageExists = (route) => fs.existsSync(path.join(PORTAL, route, 'index.html'));

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

const PAGES = [['tehnologija-buducnosti', 'hr'], ['en/future-technology', 'en']];
const PILLARS = ['misao', 'medicina', 'ucenje', 'energija', 'racunalo'];
const DATA_FILE = 'apps/portal/data/future-tech-v1.json';

/* ---------- 1. stranice postoje i nose ugovor ---------- */

for (const [route, lang] of PAGES) {
  const file = `${route}/index.html`;
  if (!pageExists(route)) { check(false, `${file}: stranica ne postoji`); continue; }
  const html = readPage(route);

  check(html.includes(`<html lang="${lang}"`), `${file}: html lang nije ${lang}`);
  check(html.includes('hreflang="hr"') && html.includes('hreflang="en"'), `${file}: nema hreflang para`);
  check(html.includes('hreflang="x-default"'), `${file}: nema x-default`);
  check(/rel="canonical" href="https:\/\/gnk-asg\.hr\//.test(html), `${file}: canonical nije apsolutan`);
  check(html.includes('name="editor" content="Nermin Sefić"'), `${file}: nema urednika`);
  check(html.includes('property="og:title"') && html.includes('name="twitter:card"'), `${file}: nema OG/Twitter`);
  check((html.match(/#[A-Za-zČĆŠŽĐčćšžđ]+/g) || []).length >= 5, `${file}: premalo hashtagova`);
  check(html.includes('class="ft-skip"'), `${file}: nema preskoka sadržaja`);
  check(/:focus-visible/.test(html), `${file}: nema vidljivog fokusa`);
  check(html.includes('/assets/public-unified-menu-v6.js'), `${file}: nema jedinstvenog izbornika`);
  check(html.includes('id="sadrzaj"'), `${file}: nema glavne mete`);
  check(html.includes('rel="alternate" type="application/json"'), `${file}: nema veze na strojne izvore`);

  // Svaki stup mora imati sidro (dolazne poveznice iz trake i hashtagova).
  for (const pillar of PILLARS) check(html.includes(`id="${pillar}"`), `${file}: nema stup ${pillar}`);

  const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  check(links.length >= 6, `${file}: samo ${links.length} poveznica (traži se ≥6)`);
  check(links.some((href) => href === '/gnk-aktual/'), `${file}: nema puta na AKTUAL MEDIA`);
  check(links.some((href) => href === '/izdanja/'), `${file}: nema poveznice na izdanja`);
  check(links.some((href) => href === '/izdanja/tehnologija/'), `${file}: nema poveznice na dnevni desk`);
  check(links.some((href) => href === '/radio/'), `${file}: nema radija`);
  check(links.some((href) => href.startsWith('/s-chat/')), `${file}: nema asistenta`);

  // JSON-LD mora biti ispravan i nositi TechArticle, ItemList i BreadcrumbList.
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  check(blocks.length >= 1, `${file}: nema JSON-LD`);
  let types = [];
  let article = null;
  for (const block of blocks) {
    let parsed;
    try { parsed = JSON.parse(block); } catch { check(false, `${file}: JSON-LD nije ispravan JSON`); continue; }
    const graph = parsed['@graph'] || [parsed];
    types = types.concat(graph.map((node) => node['@type']));
    article = graph.find((node) => node['@type'] === 'TechArticle') || article;
  }
  for (const type of ['TechArticle', 'ItemList', 'BreadcrumbList', 'WebSite', 'Person']) {
    check(types.includes(type), `${file}: JSON-LD nema ${type}`);
  }
  if (article) {
    check(article.inLanguage === lang, `${file}: TechArticle nije na jeziku stranice`);
    check(Array.isArray(article.citation) && article.citation.length >= 15, `${file}: TechArticle citira ${(article.citation || []).length} izvora (traži se ≥15)`);
  }
}

/* ---------- 2. svaka tvrdnja ima izvor, svaki izvor ima adresu ---------- */

const data = exists(DATA_FILE) ? JSON.parse(read(DATA_FILE)) : null;
check(Boolean(data), `${DATA_FILE}: ne postoji`);
if (data) {
  check(data.pillarCount === PILLARS.length, `podaci: ${data.pillarCount} stupova`);
  check(data.sources.length === data.sourceCount, 'podaci: sourceCount ne odgovara popisu');
  check(data.sources.every((source) => /^https:\/\//.test(source.url)), 'podaci: izvor nije https');
  check(data.sources.every((source) => /^\d{4}-\d{2}-\d{2}$/.test(source.date)), 'podaci: datum nije ISO');
  check(data.sources.every((source) => source.publisher && source.title), 'podaci: izvor bez nakladnika ili naslova');
  check(data.timeline.every((event) => Array.isArray(event.sources) && event.sources.length), 'podaci: događaj bez izvora');

  for (const [route] of PAGES) {
    if (!pageExists(route)) continue;
    const html = readPage(route);
    const facts = [...html.matchAll(/<div class="ft-fact"/g)].length;
    check(facts === 16, `${route}: ${facts} tvrdnji (očekuje se 16)`);
    for (const source of data.sources) {
      check(html.includes(source.url), `${route}: nema adresu izvora ${source.url}`);
    }
    const sourceItems = [...html.matchAll(/<li id="s-[a-z0-9]+"/g)].length;
    check(sourceItems === data.sources.length, `${route}: popis izvora ima ${sourceItems}, podaci ${data.sources.length}`);
  }
}

/* ---------- 3. sitemapi i trake ---------- */

const sectionSitemap = 'apps/portal/tehnologija-buducnosti/sitemap.xml';
check(exists(sectionSitemap), 'nema vlastitog sitemapa sekcije');
if (exists(sectionSitemap)) {
  const xml = read(sectionSitemap);
  check((xml.match(/<url>/g) || []).length === 2, 'sitemap sekcije nema dva jezika');
  check(xml.includes('hreflang="hr"') && xml.includes('hreflang="en"') && xml.includes('hreflang="x-default"'), 'sitemap sekcije nema hreflang');
}
const mainSitemap = read('apps/portal/sitemap.xml');
check(mainSitemap.includes('https://gnk-asg.hr/tehnologija-buducnosti/'), 'glavni sitemap nema hrvatsku stranicu');
check(mainSitemap.includes('https://gnk-asg.hr/en/future-technology/'), 'glavni sitemap nema englesku stranicu');
check(read('apps/portal/sitemap-index.xml').includes('tehnologija-buducnosti/sitemap.xml'), 'sitemap-index ne navodi sitemap sekcije');

const BANDED = ['gnk-aktual/index.html', 'en/gnk-aktual/index.html', 'izdanja/index.html', 'izdanja/tehnologija/index.html', 'kanal/index.html', 'usa/index.html'];
for (const file of BANDED) {
  const full = path.join(PORTAL, file);
  if (!fs.existsSync(full)) { check(false, `${file}: ne postoji`); continue; }
  const html = fs.readFileSync(full, 'utf8');
  check(html.includes('FUTURE-TECH-BAND:START'), `${file}: nema traku tehnologije`);
  check(html.includes('href="/tehnologija-buducnosti/"') || html.includes('href="/en/future-technology/"'), `${file}: traka ne vodi na stranicu`);
}

/* ---------- 4. agent zna o čemu se radi ---------- */

const kb = JSON.parse(read('apps/portal/data/knowledge-base.json'));
const group = (kb.skupine || []).find((item) => String(item.naslov || '').trim() === 'Tehnologija budućnosti');
check(Boolean(group), 'baza znanja nema skupinu Tehnologija budućnosti');
if (group) {
  check((group.pitanja || []).length >= 8, `skupina ima ${(group.pitanja || []).length} pitanja, traži se ≥8`);
  const text = (group.pitanja || []).map((item) => `${item.p} ${item.o}`).join(' ');
  check(text.includes('/tehnologija-buducnosti/'), 'baza znanja ne povezuje hrvatsku stranicu');
  check(text.includes('/en/future-technology/'), 'baza znanja ne povezuje englesku stranicu');
  for (const token of ['74', '0,51', '8,6 km', '22', '2,14']) {
    check(text.includes(token), `baza znanja ne nosi brojku ${token}`);
  }
}

const generated = read('workers/gnk-asg-direct-operator/src/knowledge-base.generated-v1.js');
check(generated.includes('Tehnologija budućnosti'), 'modul asistenta ne sadrži skupinu tehnologije');

const governance = JSON.parse(read('config/splus-chat-ai-governance-v1.json'));
const entries = JSON.stringify(governance).match(/"entries":\s*(\d+)/);
const total = (kb.skupine || []).reduce((n, item) => n + (item.pitanja || []).length, 0);
check(Boolean(entries), 'governance nema broj zapisa');
if (entries) check(Number(entries[1]) === total, `governance tvrdi ${entries[1]}, baza ima ${total}`);

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.slice(0, 25) }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, pages: PAGES.length, pillars: PILLARS.length, sources: data ? data.sources.length : 0, failures: 0 }, null, 2));
}
