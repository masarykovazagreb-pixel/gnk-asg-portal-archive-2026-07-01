#!/usr/bin/env node
/**
 * SEO MATRICA — gate za meta sloj cijele mreže.
 *
 * Matricu gradi `apps/sites/engine/hub.mjs` iz stvarnih datoteka. Ovaj test
 * provjerava da je zapis potpun (116 ruta: izdanja, mrežni deskovi,
 * 17 prijestolnica na dva jezika i dva atlasa), da nijedna ruta nema otvoren
 * problem i da svaka nosi hashtagove, keywords i meta ugovor.
 *
 * Test ne pristupa mreži. Ako padne, popravlja se generator ili matrica —
 * nikad test.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'apps', 'portal', 'data', 'seo-matrix-v1.json');
const fails = [];

assert.ok(existsSync(FILE), 'data/seo-matrix-v1.json nedostaje — pokreni node apps/sites/engine/hub.mjs');
const matrix = JSON.parse(readFileSync(FILE, 'utf8'));

if (matrix.version !== 'GNK_ASG_SEO_MATRIX_V1_20261022') fails.push(`neočekivana verzija ${matrix.version}`);
if (matrix.publisher?.name !== 'AKTUAL MEDIA d.o.o.') fails.push('izdavač nije AKTUAL MEDIA');
if (matrix.editor?.name !== 'Nermin Sefić') fails.push('nema urednika');
if (matrix.totals?.routes !== 116) fails.push(`ruta ${matrix.totals?.routes} (očekivano 116)`);
if (matrix.totals?.ok !== 116) fails.push(`čistih ruta ${matrix.totals?.ok}/116`);
if (matrix.totals?.issues !== 0) fails.push(`otvorenih problema ${matrix.totals?.issues}`);
if (matrix.totals?.score !== 100) fails.push(`prosječna ocjena ${matrix.totals?.score}`);
if ((matrix.issues || []).length) fails.push(`matrica ima problema: ${matrix.issues.slice(0, 5).join(' | ')}`);
if (matrix.totals?.hashtags < 30) fails.push(`samo ${matrix.totals?.hashtags} različitih hashtagova`);

/* Prijestolnice moraju biti u matrici s oba jezika: 17 gradova × 2 rute,
   plus indeks i atlas na svakom jeziku. Ako se stranica izgradi a matrica je
   ne vidi, SEO sloj tiho zaostaje — zato je ovo zaseban tvrdi uvjet. */
const capitalsFile = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'capitals.json'), 'utf8'));
const capitalSlugs = (capitalsFile.capitals || []).map((capital) => capital.slug);
const capitalRoutes = (matrix.routes || []).filter((route) => route.kind === 'capital');
if (capitalRoutes.length !== capitalSlugs.length * 2) fails.push(`prijestolnica u matrici ${capitalRoutes.length}/${capitalSlugs.length * 2}`);
for (const slug of capitalSlugs) {
  for (const url of [`https://gnk-asg.hr/glavni-gradovi/${slug}/`, `https://gnk-asg.hr/en/capitals/${slug}/`]) {
    const route = capitalRoutes.find((item) => item.url === url);
    if (!route) { fails.push(`${url}: nije u matrici`); continue; }
    if (!(route.jsonld || []).includes('City')) fails.push(`${url}: JSON-LD bez City`);
    if ((route.keywords || 0) < 20) fails.push(`${url}: samo ${route.keywords} ključnih riječi`);
  }
}
for (const url of ['https://gnk-asg.hr/glavni-gradovi/', 'https://gnk-asg.hr/en/capitals/', 'https://gnk-asg.hr/atlas/', 'https://gnk-asg.hr/en/atlas/']) {
  if (!(matrix.routes || []).some((route) => route.url === url && route.kind === 'capital-index')) fails.push(`${url}: indeks nije u matrici`);
}

const editions = new Map((matrix.editions || []).map((edition) => [edition.slug, edition]));
if (editions.size !== 6) fails.push(`izdanja ${editions.size}/6`);
for (const [slug, edition] of editions) {
  if (edition.routes < 12) fails.push(`${slug}: samo ${edition.routes} ruta`);
  if (edition.score !== 100) fails.push(`${slug}: ocjena ${edition.score}`);
  if ((edition.hashtags || []).length < 3) fails.push(`${slug}: premalo hashtagova`);
}

const seen = new Set();
for (const route of matrix.routes || []) {
  const label = route.url || route.file;
  if (seen.has(route.url)) fails.push(`${label}: dvostruka ruta`);
  seen.add(route.url);
  if (route.score !== 100) fails.push(`${label}: ocjena ${route.score}`);
  if ((route.issues || []).length) fails.push(`${label}: ${route.issues.join(', ')}`);
  if (typeof route.title !== 'string' || route.title.length < 15 || route.title.length > 90) fails.push(`${label}: naslov ${typeof route.title === 'string' ? route.title.length : 'nedostaje'}`);
  if (route.descriptionLength < 80 || route.descriptionLength > 320) fails.push(`${label}: opis ${route.descriptionLength}`);
  if (!/^https:\/\//.test(route.canonical)) fails.push(`${label}: canonical nije https`);
  for (const lang of ['hr', 'en', 'x-default']) if (!(route.hreflang || []).includes(lang)) fails.push(`${label}: nema hreflang ${lang}`);
  if (route.keywords < 5) fails.push(`${label}: samo ${route.keywords} ključnih riječi`);
  if (route.og !== 5) fails.push(`${label}: OG ${route.og}/5`);
  if (route.twitter !== 4) fails.push(`${label}: Twitter ${route.twitter}/4`);
  const tags = route.hashtags || [];
  if (tags.length < 3) fails.push(`${label}: hashtagovi ${tags.length}/3`);
  if (tags.some((tag) => !/^#[A-Za-z0-9]+$/.test(tag))) fails.push(`${label}: neispravan hashtag`);
  if (new Set(tags.map((tag) => tag.toLowerCase())).size !== tags.length) fails.push(`${label}: dvostruki hashtag`);
  if (!tags.some((tag) => /aktualmedia/i.test(tag))) fails.push(`${label}: nema #AktualMedia`);
  if (!(route.jsonld || []).includes('WebSite')) fails.push(`${label}: JSON-LD bez WebSite`);
  if (!(route.jsonld || []).includes('BreadcrumbList')) fails.push(`${label}: JSON-LD bez BreadcrumbList`);
  const wanted = route.kind === 'article' ? 'Article' : 'CollectionPage';
  if (!(route.jsonld || []).includes(wanted)) fails.push(`${label}: JSON-LD bez ${wanted}`);
  if (route.kind === 'article' && !tags.includes('#AktualMedia')) fails.push(`${label}: članak bez #AktualMedia`);
  if (route.edition && !editions.has(route.edition)) fails.push(`${label}: nepoznato izdanje ${route.edition}`);
  if (!existsSync(join(ROOT, route.file))) fails.push(`${label}: datoteka ne postoji`);
}

/* Neovisna provjera triju datoteka: matrica mora opisivati stvarni HTML. */
for (const route of (matrix.routes || []).filter((item) => ['article', 'edition-desk', 'home'].includes(item.kind)).slice(0, 3)) {
  const html = readFileSync(join(ROOT, route.file), 'utf8');
  const inFile = (html.match(/<meta name="hashtags" content="([^"]*)">/) || [])[1]?.split(/\s+/).filter(Boolean) || [];
  for (const tag of route.hashtags) if (!inFile.includes(tag)) { fails.push(`${route.url}: hashtag ${tag} nije u datoteci`); break; }
  if (!html.includes(route.canonical)) fails.push(`${route.url}: canonical nije u datoteci`);
}

if (fails.length) {
  console.error(`SEO MATRICA — ${fails.length} problema:`);
  for (const fail of fails.slice(0, 40)) console.error(`  ✗ ${fail}`);
  process.exit(1);
}
console.log(`SEO MATRICA — OK: ${matrix.totals.routes} ruta, ${matrix.totals.hashtags} hashtagova, ocjena ${matrix.totals.score}.`);
