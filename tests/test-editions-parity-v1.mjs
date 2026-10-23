#!/usr/bin/env node
/**
 * JEDNAK STANDARD NA SVAKOM IZDANJU — 17 gradova i 9 svjetskih portala.
 *
 * Jedna stranica može izgledati ispravno, a mreža ipak biti neujednačena:
 * jedno izdanje bez vlastite slike, drugo sa zakašnjelim feedom, treće bez
 * canonicala, četvrto bez mreže. Ovaj test mjeri mrežu, ne stranicu.
 *
 * Provjerava, za svako izdanje:
 *   1. identitet    — vlastita slika, znak i OG (nijedna se ne dijeli);
 *   2. jezik        — html lang/dir prati channels.json, EN ulaz postoji;
 *   3. SEO          — canonical, title, description, OG/Twitter, JSON-LD;
 *   4. paukova mreža— blok mreže s 20 ulaza i svim portalima, jednom;
 *   5. svježina    — podaci, feed i sitemap nisu stariji od tri dana;
 *   6. dizajn       — ista CSS datoteka na svim izdanjima iste vrste;
 *   7. sinkronizacija — brojevi u /izdanja/ i /mreza/ odgovaraju podacima.
 *
 * Pokretanje:
 *   node tests/test-editions-parity-v1.mjs            sve
 *   node tests/test-editions-parity-v1.mjs --only rim
 *   node tests/test-editions-parity-v1.mjs --max-age 4   dopuštena starost u danima
 *
 * Test ne gradi ništa. Ako izlaz nedostaje, to je nalaz, ne razlog za gradnju:
 * mreža mora biti provjerljiva onakva kakva je objavljena.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORLD_PORTALS, CONTINENT_LIST } from '../apps/world/lib/registry.mjs';
import { coreTargets, portalTargets } from '../apps/satellites/lib/network-v1.mjs';
import { chromeOf, editionsUi } from '../apps/region/src/chrome.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : '';
const MAX_AGE = Number(args.includes('--max-age') ? args[args.indexOf('--max-age') + 1] : 3);

const CHANNELS = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8')).channels;
const KANAL = join(ROOT, 'apps', 'portal', 'kanal');
const IZDANJA = join(ROOT, 'apps', 'portal', 'assets', 'izdanja');
const BRAND = join(ROOT, 'apps', 'portal', 'assets', 'brand');
const WORLD = join(ROOT, 'apps', 'world', 'site');

const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };
const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : '');
const hash = (file) => (existsSync(file) ? createHash('md5').update(readFileSync(file)).digest('hex') : '');
const days = (iso) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? (Date.now() - t) / 86400000 : Number.POSITIVE_INFINITY;
};
const firstMatch = (text, re) => (text.match(re) || [])[1] || '';
const escText = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const attr = (html, property) => firstMatch(html, new RegExp(`<meta[^>]+(?:name|property)="${property}"[^>]+content="([^"]*)"`, 'i'));

/* ---------- priprema: zajedničke vrijednosti ---------- */

const editionTargets = coreTargets('hr');
const portalsAll = portalTargets('');

const report = { editions: [], portals: [], design: {}, sync: {} };

/* ---------- 1. GRADSKA IZDANJA ---------- */

const cssHashes = new Map();
const ogHashes = new Map();
const brandHashes = new Map();
const izdanjaCards = (() => {
  try { return JSON.parse(read(join(ROOT, 'apps', 'portal', 'data', 'izdanja.json'))).cards || []; } catch { return []; }
})();

for (const channel of CHANNELS) {
  if (ONLY && channel.id !== ONLY) continue;
  const id = channel.id;
  const dir = join(KANAL, id);
  const row = { id, lang: channel.lang, ok: true, notes: [] };
  const note = (message) => { fails.push(`izdanje ${id}: ${message}`); row.ok = false; row.notes.push(message); };

  /* 1. Identitet — svaka edicija ima svoju sliku, znak i OG. */
  const hero = join(IZDANJA, `${id}-1200.webp`);
  const logo = join(BRAND, `kanal-${id}-1200.webp`);
  const og = join(IZDANJA, `${id}-og.jpg`);
  for (const [label, file] of [['hero', hero], ['znak', logo], ['OG slika', og]]) {
    check(existsSync(file), `izdanje ${id}: nema ${label} (${file.slice(ROOT.length + 1)})`);
    if (!existsSync(file)) note(`nema ${label}`);
  }
  const ogHash = hash(og);
  if (ogHash) {
    if (ogHashes.has(ogHash) && ogHashes.get(ogHash) !== id) note(`dijeli OG sliku s ${ogHashes.get(ogHash)}`);
    else ogHashes.set(ogHash, id);
  }
  const brandHash = hash(logo);
  if (brandHash) {
    if (brandHashes.has(brandHash) && brandHashes.get(brandHash) !== id) note(`dijeli znak s ${brandHashes.get(brandHash)}`);
    else brandHashes.set(brandHash, id);
  }

  /* 2. Datoteke koje svako izdanje mora imati. */
  const home = join(dir, 'index.html');
  if (!existsSync(home)) { note('nema naslovnicu'); report.editions.push(row); continue; }
  for (const file of ['sitemap.xml', 'feed.xml', 'feed.json', 'robots.txt', 'llms.txt', '404.html', 'assets/region.css', 'izvori/index.html', 'metodologija/index.html', 'mravinjak/index.html']) {
    if (!existsSync(join(dir, file))) note(`nema ${file}`);
  }
  if (channel.lang !== 'en' && !existsSync(join(dir, 'en', 'index.html'))) note('nema engleski ulaz /en/');

  const html = read(home);

  /* 3. Jezik i smjer pisma. */
  const lang = firstMatch(html, /<html[^>]+lang="([^"]+)"/i);
  if (lang !== channel.lang) note(`html lang="${lang}" umjesto "${channel.lang}"`);
  const rtl = /<html[^>]+dir="rtl"/i.test(html);
  if (channel.lang === 'ar' && !rtl) note('arapski nije zdesna nalijevo');
  if (channel.lang !== 'ar' && rtl) note('rtl na jeziku koji nije arapski');
  const htmlLang = firstMatch(html, /<meta[^>]+property="og:locale"[^>]+content="([^"]*)"/i) || firstMatch(html, /<meta[^>]+name="og:locale"[^>]+content="([^"]*)"/i);
  if (!htmlLang) note('nema og:locale');

  /* 4. SEO: canonical, title, opis, OG, Twitter, JSON-LD, robots. */
  const canonical = firstMatch(html, /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i);
  const expected = channel.base;
  if (canonical.replace(/\/$/, '') !== expected.replace(/\/$/, '')) note(`canonical ${canonical} umjesto ${expected}`);
  const title = firstMatch(html, /<title>([^<]*)<\/title>/i);
  if (title.length < 15 || title.length > 100) note(`title ima ${title.length} znakova`);
  const description = attr(html, 'description') || attr(html, 'og:description');
  if (description.length < 80 || description.length > 320) note(`description ima ${description.length} znakova`);
  const ogImage = attr(html, 'og:image');
  if (!ogImage.endsWith(`${id}-og.jpg`)) note(`og:image nije vlastita slika (${ogImage || 'nema'})`);
  if (attr(html, 'twitter:card') !== 'summary_large_image') note('nema twitter:card summary_large_image');
  if (!/"@type"\s*:\s*"(?:CollectionPage|WebSite|NewsMediaOrganization)"/.test(html)) note('nema JSON-LD entiteta');
  if (!/<meta[^>]+name="robots"[^>]+content="[^"]*index/i.test(html)) note('nema robots index');
  const hreflang = [...html.matchAll(/hreflang="([^"]+)"/g)].map((m) => m[1]);
  const wantsEn = channel.lang !== 'en';
  if (wantsEn && !hreflang.includes('en')) note('nema hreflang="en"');
  if (channel.lang !== 'hr' && !hreflang.includes('hr')) note('nema hreflang="hr" (matica)');

  /* 4b. Okvir na jeziku izdanja. Sadržaj je odavno lokaliziran, ali su
     oznake, povratni link i podnožje bili hrvatski na svih 17 adresa. */
  const chrome = chromeOf(channel.lang);
  const [edsNav] = editionsUi(channel.lang);
  if (!html.includes(escText(chrome.tagsLead)) && !html.includes(chrome.tagsLead)) note(`nema oznaka na jeziku izdanja („${chrome.tagsLead}”)`);
  if (!html.includes(escText(chrome.otherTitle)) && !html.includes(chrome.otherTitle)) note(`nema naslova ostalih izdanja na jeziku izdanja („${chrome.otherTitle}”)`);
  if (!html.includes(escText(edsNav)) && !html.includes(edsNav)) note(`traka izdanja nije na jeziku izdanja („${edsNav}”)`);
  /* Hrvatski okvir na izdanju koje nije hrvatsko (sr i bs dijele iste riječi). */
  if (!['hr', 'sr', 'bs'].includes(channel.lang)) {
    for (const marker of ['Oznake izdanja', 'Ostala izdanja', 'Sva izdanja', 'Sadržaj', 'klik vodi na izdanje', 'Podatkovni desk', 'Status ažurnosti', 'Mreža izdanja', 'Tehnologija budućnosti', 'Knjiga radnika']) {
      if (html.includes(marker)) note(`hrvatski okvir na jeziku ${channel.lang}: „${marker}”`);
    }
    if (channel.lang !== 'en' && html.includes('entrances under one publisher')) note('blok mreže je na engleskom, ne na jeziku izdanja');
  }

  /* 4c. Manifest i zaglavlja — isti standard kao devet svjetskih portala. */
  const manifestFile = join(dir, 'manifest.webmanifest');
  if (!existsSync(manifestFile)) note('nema manifest.webmanifest');
  else {
    try {
      const manifest = JSON.parse(read(manifestFile));
      if (manifest.lang !== channel.lang) note(`manifest lang ${manifest.lang} ≠ ${channel.lang}`);
      if (!String(manifest.start_url || '').includes(`/kanal/${id}/`)) note('manifest start_url ne vodi na izdanje');
      if (!Array.isArray(manifest.icons) || !manifest.icons.length) note('manifest nema ikonu');
    } catch { note('manifest.webmanifest nije valjan JSON'); }
  }
  if (!/<link[^>]+rel="manifest"[^>]+href="[^"]*manifest\.webmanifest"/.test(html)) note('stranica ne povezuje manifest');

  /* 5. Paukova mreža: jedan blok, 20 ulaza, svi portali. */
  const meshBlocks = (html.match(/data-mesh="v1"/g) || []).length;
  if (meshBlocks !== 1) note(`blok mreže ${meshBlocks}× (mora biti 1×)`);
  const meshItems = (html.match(/data-mesh-item="/g) || []).length;
  const expectedItems = editionTargets.length + portalsAll.length;
  if (meshItems < expectedItems) note(`mreža ima ${meshItems} stavki, očekivano najmanje ${expectedItems}`);
  if (!html.includes('data-mesh-group="core"') || !html.includes('data-mesh-group="portals"')) note('mreža nema obje grupe');

  /* 6. Sitemap i feed: vlastita domena, svjež datum. */
  const sitemap = read(join(dir, 'sitemap.xml'));
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (!locs.length) note('sitemap je prazan');
  for (const loc of locs) if (!loc.startsWith(expected)) note(`sitemap vodi izvan izdanja (${loc})`);
  const lastmod = firstMatch(sitemap, /<lastmod>([^<]+)<\/lastmod>/);
  if (lastmod && days(lastmod) > MAX_AGE + 1) note(`sitemap lastmod star ${Math.round(days(lastmod))} d`);

  const feed = read(join(dir, 'feed.xml'));
  const built = firstMatch(feed, /<lastBuildDate>([^<]+)<\/lastBuildDate>/);
  if (!built) note('feed nema lastBuildDate');
  else if (days(built) > MAX_AGE) note(`feed star ${Math.round(days(built))} d`);
  const feedItems = [...feed.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>/g)].map((m) => m[1]);
  if (!feedItems.length) note('feed nema zapisa');
  for (const link of feedItems.slice(0, 20)) if (!link.startsWith(expected)) note(`feed vodi izvan izdanja (${link})`);

  /* 7. Svježina podataka. */
  const data = (() => { try { return JSON.parse(read(join(ROOT, 'apps', 'region', 'data', `${id}.json`))); } catch { return null; } })();
  if (!data) note('nema podataka izdanja');
  else {
    const age = days(data.updatedAt);
    if (age > MAX_AGE) note(`podaci stari ${Math.round(age)} d`);
    const card = izdanjaCards.find((c) => c.id === id);
    if (!card) note('/izdanja/ ne nosi ovo izdanje');
    if (card && card.count !== (data.items || []).length) note(`/izdanja/ kaže ${card.count}, podaci ${(data.items || []).length}`);
  }

  /* 8. Dizajn: ista CSS datoteka na svim izdanjima. */
  const cssHash = hash(join(dir, 'assets', 'region.css'));
  if (cssHash) cssHashes.set(id, cssHash);

  row.pages = locs.length;
  row.items = data ? (data.items || []).length : 0;
  report.editions.push(row);
}

/* ---------- 2. SVJETSKI PORTALI ---------- */

const worldCss = new Map();
const worldBrands = new Map();

for (const portal of WORLD_PORTALS) {
  if (ONLY && portal.id !== ONLY) continue;
  const dir = join(WORLD, portal.id);
  const row = { id: portal.id, lang: portal.lang, ok: true, notes: [] };
  const note = (message) => { fails.push(`portal ${portal.id}: ${message}`); row.ok = false; row.notes.push(message); };

  const home = join(dir, 'index.html');
  if (!existsSync(home)) { note('nema naslovnicu (izlaz nije izgrađen)'); report.portals.push(row); continue; }
  for (const file of ['sitemap.xml', 'feed.xml', 'feed.json', 'robots.txt', 'llms.txt', '404.html', '_headers', 'manifest.webmanifest', 'metodologija/index.html', 'izvori/index.html', 'mreza/index.html']) {
    if (!existsSync(join(dir, file))) note(`nema ${file}`);
  }

  const html = read(home);
  const lang = firstMatch(html, /<html[^>]+lang="([^"]+)"/i);
  if (lang !== portal.lang) note(`html lang="${lang}" umjesto "${portal.lang}"`);
  if (portal.lang === 'ar' && !/<html[^>]+dir="rtl"/i.test(html)) note('arapski nije zdesna nalijevo');

  const canonical = firstMatch(html, /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i);
  if (!canonical.startsWith(portal.base)) note(`canonical ${canonical} izvan portala`);
  const description = attr(html, 'description');
  if (description.length < 41 || description.length > 160) note(`description ima ${description.length} znakova`);
  if (!attr(html, 'og:image')) note('nema og:image');
  if (attr(html, 'twitter:card') !== 'summary_large_image') note('nema twitter:card');
  const meshItems = (html.match(/data-mesh-item="/g) || []).length;
  if (meshItems < 20 + portalTargets(portal.base).length) note(`mreža ima ${meshItems} stavki`);
  if ((html.match(/data-mesh="v1"/g) || []).length !== 1) note('blok mreže nije točno jedan');

  const headers = read(join(dir, '_headers'));
  if (!/Content-Security-Policy:/.test(headers)) note('nema CSP');
  if (!/X-Frame-Options: DENY/.test(headers)) note('nema X-Frame-Options');
  const robots = read(join(dir, 'robots.txt'));
  if (!robots.includes(`${portal.base}sitemap.xml`)) note('robots.txt nema sitemap');

  const brand = join(dir, 'assets', 'brand.webp');
  const brandHash = hash(brand);
  if (brandHash) {
    if (worldBrands.has(brandHash)) note(`dijeli znak s ${worldBrands.get(brandHash)}`);
    else worldBrands.set(brandHash, portal.id);
  } else note('nema vlastiti znak');

  const cssHash = hash(join(dir, 'assets', 'region.css'));
  if (cssHash) worldCss.set(portal.id, cssHash);

  row.pages = (read(join(dir, 'sitemap.xml')).match(/<loc>/g) || []).length;
  report.portals.push(row);
}

/* Zaglavlja: gradska izdanja žive pod /kanal/* na matičnoj domeni, pa ih
   pokriva jedan _headers zapis — mora nositi CSP, inače izdanja nemaju isti
   sigurnosni standard kao svjetski portali. */
{
  const headers = read(join(ROOT, 'apps', 'portal', '_headers'));
  if (!/\/kanal\/\*/.test(headers)) fails.push('_headers nema blok za /kanal/*');
  if (!/\/kanal\/\*[\s\S]{0,600}Content-Security-Policy:/.test(headers)) fails.push('_headers nema CSP za /kanal/*');
}

/* ---------- 3. PRESJEK: DIZAJN I SINHRONIZACIJA ---------- */

const uniqueCss = new Set(cssHashes.values());
if (cssHashes.size > 1 && uniqueCss.size > 1) {
  fails.push(`gradska izdanja nemaju isti dizajn: ${uniqueCss.size} različitih region.css (${[...cssHashes].map(([id, h2]) => `${id}:${h2.slice(0, 6)}`).join(', ')})`);
}
const uniqueWorldCss = new Set(worldCss.values());
if (worldCss.size > 1 && uniqueWorldCss.size > 1) {
  fails.push(`svjetski portali nemaju isti dizajn: ${uniqueWorldCss.size} različitih region.css`);
}
report.design = {
  editionCss: [...new Set(cssHashes.values())].map((h2) => h2.slice(0, 8)),
  portalCss: [...new Set(worldCss.values())].map((h2) => h2.slice(0, 8)),
  editionCssFiles: cssHashes.size,
  portalCssFiles: worldCss.size
};

/* Mreža mora poznavati svako izdanje i svaki portal — inače negdje nema puta. */
const coreUrls = new Set(coreTargets('hr').map((t) => t.url.replace(/\/$/, '')));
for (const channel of CHANNELS) {
  if (ONLY && channel.id !== ONLY) continue;
  check(coreUrls.has(channel.base.replace(/\/$/, '')), `mreža ne poznaje izdanje ${channel.id}`);
}
const portalUrls = new Set(portalsAll.map((t) => t.url.replace(/\/$/, '')));
for (const portal of WORLD_PORTALS) {
  check(portalUrls.has(portal.base.replace(/\/$/, '')), `mreža ne poznaje portal ${portal.id}`);
}

/* Pokrivenost kontinenata: šest nastanjenih, bez Antarktike. */
const continents = new Set(WORLD_PORTALS.map((p) => p.continent.en));
check(continents.size === CONTINENT_LIST.length, `portali pokrivaju ${continents.size} kontinenata, očekivano ${CONTINENT_LIST.length}`);

/* Strojni popis mreže mora se slagati s registrom. */
const mreza = (() => { try { return JSON.parse(read(join(ROOT, 'apps', 'portal', 'data', 'mreza-v1.json'))); } catch { return null; } })();
if (!mreza) fails.push('nema apps/portal/data/mreza-v1.json');
else {
  report.sync = {
    editions: izdanjaCards.length,
    portals: mreza.worldCount,
    portalsInJson: (mreza.world || []).length,
    continents: CONTINENT_LIST.length
  };
  check((mreza.editions || []).length === CHANNELS.length, `mreza-v1.json ima ${(mreza.editions || []).length} gradskih izdanja, očekivano ${CHANNELS.length}`);
  for (const channel of CHANNELS) {
    check((mreza.editions || []).some((e) => e.id === channel.id), `mreza-v1.json ne nosi izdanje ${channel.id}`);
  }
  for (const portal of WORLD_PORTALS) {
    check(izdanjaCards.some((c) => c.id === `world-${portal.id}`), `/izdanja/ ne nosi svjetski portal ${portal.id}`);
  }
  check(izdanjaCards.length === CHANNELS.length + WORLD_PORTALS.length + 5,
    `/izdanja/ ima ${izdanjaCards.length} kartica, očekivano ${CHANNELS.length + WORLD_PORTALS.length + 5} (17 gradova + 9 portala + 5 platformi)`);
  check(mreza.worldCount === WORLD_PORTALS.length, `mreza-v1.json worldCount ${mreza.worldCount} ≠ ${WORLD_PORTALS.length}`);
  check((mreza.world || []).length === WORLD_PORTALS.length, `mreza-v1.json ima ${(mreza.world || []).length} portala`);
  for (const portal of WORLD_PORTALS) {
    check((mreza.world || []).some((w) => w.id === `world-${portal.id}` || w.id === portal.id), `mreza-v1.json ne nosi ${portal.id}`);
  }
}

/* Nadzor: svi kanali moraju biti u _status.json, bez tiho ispalih izdanja. */
const status = (() => { try { return JSON.parse(read(join(ROOT, 'apps', 'region', 'data', '_status.json'))); } catch { return null; } })();
if (!status) fails.push('nema apps/region/data/_status.json');
else {
  const seen = Object.keys(status.lastRun?.channels || {});
  for (const channel of CHANNELS) if (!seen.includes(channel.id)) fails.push(`_status.json ne prati ${channel.id}`);
}

/* ---------- izvještaj ---------- */

const out = {
  ok: fails.length === 0,
  version: 'GNK_ASG_EDITIONS_PARITY_V1_20261023',
  maxAgeDays: MAX_AGE,
  editions: report.editions.length,
  portals: report.portals.length,
  continents: CONTINENT_LIST.length,
  design: report.design,
  sync: report.sync,
  matrix: { editions: report.editions, portals: report.portals },
  failures: fails.slice(0, 40)
};
console.log(JSON.stringify(out, null, 2));
if (fails.length) process.exit(1);
