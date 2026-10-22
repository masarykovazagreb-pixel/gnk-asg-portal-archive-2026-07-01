#!/usr/bin/env node
/**
 * AKTUAL MEDIA — popis svih proizvoda (/aktual-media/proizvodi/ i /en/…).
 *
 * Provjerava da obje jezične verzije postoje, da imaju jedan naslov, ispravan
 * canonical/hreflang par, valjan JSON-LD graf, da sve unutarnje poveznice vode
 * na stvarne rute (nema 404), da je stranica u glavnom sitemapu s hreflang
 * alternativama i da je povezana iz podatkovnog deska i iz prozorčića AKTUAL-a.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const SITE = 'https://gnk-asg.hr';
const fails = [];
const read = (p) => readFileSync(join(PORTAL, p), 'utf8');
const has = (p) => existsSync(join(PORTAL, p));

const PAGES = [
  { page: 'aktual-media/proizvodi/index.html', lang: 'hr', canonical: `${SITE}/aktual-media/proizvodi/`, alternate: `${SITE}/en/aktual-media/proizvodi/` },
  { page: 'en/aktual-media/proizvodi/index.html', lang: 'en', canonical: `${SITE}/en/aktual-media/proizvodi/`, alternate: `${SITE}/aktual-media/proizvodi/` }
];

for (const { page, lang, canonical, alternate } of PAGES) {
  if (!has(page)) { fails.push(`${page}: nema stranice`); continue; }
  const html = read(page);

  if ((html.match(/<h1\b/g) || []).length !== 1) fails.push(`${page}: nema točno jedan <h1>`);
  if (!html.includes(`<html lang="${lang}">`)) fails.push(`${page}: pogrešan jezik dokumenta`);
  if (!html.includes(`<link rel="canonical" href="${canonical}">`)) fails.push(`${page}: pogrešan canonical`);
  for (const [hrefl, href] of [['hr', `${SITE}/aktual-media/proizvodi/`], ['en', `${SITE}/en/aktual-media/proizvodi/`], ['x-default', `${SITE}/aktual-media/proizvodi/`]]) {
    if (!html.includes(`hreflang="${hrefl}" href="${href}"`)) fails.push(`${page}: nema hreflang ${hrefl} → ${href}`);
  }
  if (!html.includes(`href="${alternate}"`)) fails.push(`${page}: nema poveznice na drugi jezik`);
  if (/<style[\s>]/.test(html)) fails.push(`${page}: ugrađeni <style> (držimo vanjski CSS)`);
  if (!html.includes('/assets/aktual-products-v1.css')) fails.push(`${page}: nema vanjskog CSS-a`);
  if (!/^\s*<meta name="description" content="[^"]{80,320}">/m.test(html)) fails.push(`${page}: meta description nije u granicama`);
  if (!html.includes('property="og:image"')) fails.push(`${page}: nema og:image`);
  if (!html.includes('name="twitter:image"')) fails.push(`${page}: nema twitter:image`);

  /* OG slika mora postojati u repozitoriju. */
  const og = html.match(/property="og:image" content="([^"]+)"/);
  if (og) {
    const rel = og[1].replace(`${SITE}/`, '');
    if (!has(rel)) fails.push(`${page}: og:image ne postoji (${rel})`);
  }

  /* JSON-LD mora biti valjan i sadržavati CollectionPage + ItemList + BreadcrumbList. */
  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!ld) fails.push(`${page}: nema JSON-LD`);
  else {
    let data;
    try { data = JSON.parse(ld[1]); } catch (e) { fails.push(`${page}: JSON-LD nije valjan JSON (${e.message})`); }
    if (data) {
      const types = (data['@graph'] || []).map((n) => n['@type']);
      for (const t of ['CollectionPage', 'BreadcrumbList', 'NewsMediaOrganization']) {
        if (!types.includes(t)) fails.push(`${page}: JSON-LD nema ${t}`);
      }
      const cp = (data['@graph'] || []).find((n) => n['@type'] === 'CollectionPage');
      const n = cp && cp.mainEntity && cp.mainEntity.numberOfItems;
      const listed = cp && cp.mainEntity && Array.isArray(cp.mainEntity.itemListElement) ? cp.mainEntity.itemListElement.length : 0;
      if (n !== listed) fails.push(`${page}: numberOfItems (${n}) nije jednak broju stavki (${listed})`);
      if (listed < 20) fails.push(`${page}: premalo stavki u ItemList (${listed})`);
    }
  }

  /* Sve unutarnje poveznice moraju postojati kao datoteka ili index.html. */
  for (const href of new Set([...html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]))) {
    if (href === '/') { if (!has('index.html')) fails.push(`${page}: nema korijena`); continue; }
    const rel = href.replace(/^\//, '').replace(/\/$/, '');
    const candidates = [join(PORTAL, rel), join(PORTAL, rel, 'index.html')];
    if (!candidates.some((p) => existsSync(p))) fails.push(`${page}: poveznica vodi na nepostojeću rutu ${href}`);
  }

  /* Sadržaj: osam gradova, devet deskova, šest platformi. */
  const cards = (html.match(/class="pr-card"/g) || []).length;
  if (cards !== 23) fails.push(`${page}: ${cards} kartica (mora biti 23: 8 gradova + 9 deskova + 6 platformi)`);
  for (const city of ['zagreb', 'beograd', 'sarajevo', 'budimpesta', 'ljubljana', 'rim', 'sofija', 'bukurest']) {
    if (!html.includes(`href="/kanal/${city}/"`)) fails.push(`${page}: nema grada ${city}`);
  }
  for (const desk of ['sport', 'politika', 'sigurnost', 'biznis', 'tehnologija', 'moda', 'putovanja', 'ljubimci', 'svijet']) {
    if (!html.includes(`href="/izdanja/${desk}/"`)) fails.push(`${page}: nema deska ${desk}`);
  }
  if (!html.includes('rel="external noopener"')) fails.push(`${page}: vanjske poveznice bez rel="external noopener"`);
}

/* Sitemap: oba URL-a s hreflang alternativama. */
const sitemap = 'sitemap.xml';
if (!has(sitemap)) fails.push('sitemap.xml: nema datoteke');
else {
  const xml = read(sitemap);
  for (const loc of [`${SITE}/aktual-media/proizvodi/`, `${SITE}/en/aktual-media/proizvodi/`]) {
    const re = new RegExp(`<url><loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>([\\s\\S]*?)</url>`);
    const m = xml.match(re);
    if (!m) { fails.push(`sitemap.xml: nema ${loc}`); continue; }
    if (!/hreflang="hr"/.test(m[1]) || !/hreflang="en"/.test(m[1]) || !/hreflang="x-default"/.test(m[1])) {
      fails.push(`sitemap.xml: ${loc} nema sve hreflang alternative`);
    }
  }
}

/* Interna otkrivljivost: podatkovni desk i AKTUAL prozorčići vode na popis. */
for (const [page, needle] of [
  ['aktual-media/index.html', '/aktual-media/proizvodi/'],
  ['en/aktual-media/index.html', '/en/aktual-media/proizvodi/'],
  ['gnk-aktual/index.html', '/aktual-media/proizvodi/'],
  ['en/gnk-aktual/index.html', '/en/aktual-media/proizvodi/']
]) {
  if (!has(page)) { fails.push(`${page}: nema stranice`); continue; }
  if (!read(page).includes(needle)) fails.push(`${page}: ne vodi na ${needle}`);
}

/* Strojno čitljiv katalog: /data/aktual-products-v1.json */
const catalogPath = 'data/aktual-products-v1.json';
if (!has(catalogPath)) fails.push(`${catalogPath}: nema kataloga`);
else {
  let cat;
  try { cat = JSON.parse(read(catalogPath)); } catch (e) { fails.push(`${catalogPath}: nije valjan JSON (${e.message})`); }
  if (cat) {
    if (!cat.counts || cat.counts.cities !== 8 || cat.counts.desks !== 9 || cat.counts.platforms !== 6) {
      fails.push(`${catalogPath}: krivi brojevi (${JSON.stringify(cat.counts)})`);
    }
    if (!Array.isArray(cat.products) || cat.products.length !== 23) fails.push(`${catalogPath}: nema 23 proizvoda`);
    if (cat.pages?.hr !== `${SITE}/aktual-media/proizvodi/` || cat.pages?.en !== `${SITE}/en/aktual-media/proizvodi/`) {
      fails.push(`${catalogPath}: krive stranice`);
    }
    for (const prod of cat.products || []) {
      if (!/^https:\/\//.test(prod.url || '')) { fails.push(`${catalogPath}: ${prod.name} nema apsolutni URL`); continue; }
      if (prod.url.startsWith(SITE)) {
        const rel = prod.url.slice(SITE.length + 1).replace(/\/$/, '');
        if (!existsSync(join(PORTAL, rel)) && !existsSync(join(PORTAL, rel, 'index.html'))) {
          fails.push(`${catalogPath}: ${prod.name} vodi na nepostojeću rutu ${prod.url}`);
        }
      }
    }
  }
}

/* llms.txt / llms-full.txt: točno jedan marker-blok s istim dvjema stranicama. */
for (const name of ['llms.txt', 'llms-full.txt']) {
  if (!has(name)) { fails.push(`${name}: nema datoteke`); continue; }
  const txt = read(name);
  const blocks = (txt.match(/<!-- AKTUAL-PRODUCTS-LLMS:START -->/g) || []).length;
  if (blocks !== 1) fails.push(`${name}: ${blocks} blokova o proizvodima (mora biti 1)`);
  if (!txt.includes(`${SITE}/aktual-media/proizvodi/`)) fails.push(`${name}: nema HR popisa`);
  if (!txt.includes(`${SITE}/en/aktual-media/proizvodi/`)) fails.push(`${name}: nema EN popisa`);
  if (!txt.includes(`${SITE}/data/aktual-products-v1.json`)) fails.push(`${name}: nema kataloga`);
}

/* Generator mora biti deterministički: CSS i stranice se pišu iz skripte. */
if (!has('assets/aktual-products-v1.css')) fails.push('assets/aktual-products-v1.css: nema datoteke');
if (!existsSync(join(ROOT, 'scripts', 'build-aktual-products-v1.mjs'))) fails.push('scripts/build-aktual-products-v1.mjs: nema generatora');

console.log(JSON.stringify({
  ok: fails.length === 0,
  version: 'GNK_ASG_PRODUCTS_HUB_V1_20261022',
  pages: PAGES.length,
  failures: fails,
}, null, 2));

if (fails.length) process.exitCode = 1;
