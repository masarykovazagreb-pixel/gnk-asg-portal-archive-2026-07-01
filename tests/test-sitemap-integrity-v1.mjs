#!/usr/bin/env node
/**
 * SITEMAP INTEGRITET — svaka adresa u sitemapu mora postojati.
 *
 * Sitemap je obećanje tražilici: „ova stranica postoji". Ako adresa vodi na
 * 404, obećanje je lažno i povjerenje se troši. Ovaj test zato otvara svaki
 * sitemap pod portalom i provjerava:
 *
 *   1. sitemap je dobro oblikovan (urlset ili sitemapindex) i ima barem jednu
 *      adresu;
 *   2. svaka adresa na gnk-asg.hr ima stvarnu datoteku (ili index.html u mapi);
 *   3. svaki sitemap je naveden u sitemap-index.xml, a svaki unos indeksa
 *      pokazuje na postojeći sitemap;
 *   4. nijedan sitemap nije prazan i nijedna adresa nije prazna.
 *
 * Test ne piše ništa i ne pristupa mreži.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const ORIGIN = 'https://gnk-asg.hr/';

const failures = [];
const notes = [];
const fail = (message) => failures.push(message);

/* ---------- 1. popis sitemapa ---------- */

const sitemaps = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['assets', 'data', 'node_modules'].includes(entry.name)) continue;
      walk(full);
    } else if (/sitemap[^/]*\.xml$/i.test(entry.name)) {
      sitemaps.push(full);
    }
  }
};
walk(PORTAL);

if (sitemaps.length < 20) fail(`nađeno ${sitemaps.length} sitemapa — očekuje se barem 20`);

/* ---------- 2. svaka adresa mora postojati ---------- */

const toFile = (url) => {
  const path = url.slice(ORIGIN.length);
  let file = path.endsWith('/') ? join(PORTAL, path, 'index.html') : join(PORTAL, path);
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
  } catch {
    return file;
  }
  return file;
};

let total = 0;
let external = 0;
const perSitemap = new Map();
for (const file of sitemaps) {
  const rel = relative(PORTAL, file);
  const xml = readFileSync(file, 'utf8');
  const isIndex = /<sitemapindex/.test(xml);
  if (!isIndex && !/<urlset/.test(xml)) fail(`${rel}: nije ni urlset ni sitemapindex`);
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1].trim());
  if (!locs.length) fail(`${rel}: nema nijedne adrese`);
  let local = 0;
  for (const loc of locs) {
    if (!loc) { fail(`${rel}: prazna adresa`); continue; }
    if (!loc.startsWith(ORIGIN)) { external += 1; continue; }
    local += 1;
    total += 1;
    if (!existsSync(toFile(loc))) fail(`${rel}: ${loc} ne postoji kao datoteka`);
  }
  perSitemap.set(rel, { urls: local, index: isIndex });
  /* lastmod je dio ugovora: bez datuma tražilica ne zna je li sitemap svjež. */
  if (!isIndex) {
    const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) || [];
    for (const block of urlBlocks) {
      const lastmod = (block.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1] || '';
      if (lastmod && !/^\d{4}-\d{2}-\d{2}/.test(lastmod)) fail(`${rel}: lastmod "${lastmod}" nije datum`);
    }
  }
}

/* ---------- 3. indeks mora pokriti sve sitemape ---------- */

const indexFile = join(PORTAL, 'sitemap-index.xml');
if (!existsSync(indexFile)) fail('sitemap-index.xml nedostaje');
else {
  const xml = readFileSync(indexFile, 'utf8');
  const indexed = new Set([...xml.matchAll(/<loc>([^<]*)<\/loc>/g)]
    .map((match) => match[1].trim())
    .filter((loc) => loc.startsWith(ORIGIN))
    .map((loc) => loc.slice(ORIGIN.length)));
  for (const [rel] of perSitemap) {
    if (rel === 'sitemap-index.xml') continue;
    if (!indexed.has(rel)) fail(`sitemap-index.xml ne navodi ${rel}`);
  }
  for (const loc of indexed) {
    if (!existsSync(join(PORTAL, loc))) fail(`sitemap-index.xml vodi na ${loc}, koji ne postoji`);
  }
  if (indexed.size < sitemaps.length - 1) notes.push(`indeks ima ${indexed.size} unosa za ${sitemaps.length - 1} sitemapa`);
}

/* ---------- 4. sažetak ---------- */

const byKind = {};
for (const [rel, info] of perSitemap) {
  const kind = rel.includes('/kanal/') ? 'kanal' : rel.startsWith('glavni-gradovi') ? 'prijestolnice' : rel.includes('/') ? 'sekcija' : 'korijen';
  byKind[kind] = (byKind[kind] || 0) + info.urls;
}

console.log(JSON.stringify({
  ok: failures.length === 0,
  version: 'GNK_ASG_SITEMAP_INTEGRITY_V1_20261023',
  sitemaps: sitemaps.length,
  urls: total,
  external,
  byKind,
  notes,
  failures
}, null, 2));
if (failures.length) process.exit(1);
