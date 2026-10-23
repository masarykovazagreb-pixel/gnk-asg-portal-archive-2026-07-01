#!/usr/bin/env node
/**
 * PRENOS — provjera da je svaki naš tekst stvarno na svakoj domeni.
 *
 * Test čita korpus iz stvarnih datoteka (kolumne, autorski tekstovi,
 * pojašnjenja s kanala) i traži svaki zapis na svakom cilju:
 * šest stranica mreže i devet svjetskih izdanja. Ne vjeruje build skripti.
 *
 * Provjerava ono što se tiho pokvari:
 *   1. popis /prenos/ postoji i vodi na svaki zapis;
 *   2. svaki zapis ima stranicu (osim kolumni, koje žive u /kolumna/);
 *   3. canonical pokazuje na izvornik — kopija ne otima matičnu adresu;
 *   4. izvornik je vidljivo naveden, s apsolutnim linkom;
 *   5. slika autora postoji i na disku i u HTML-u;
 *   6. naslov, tekst i oznake nisu prazni;
 *   7. sitemap cilja sadrži adrese prenosa.
 *
 * Pokretanje: node tests/test-prenos-v1.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCorpus } from '../scripts/lib/corpus-v1.mjs';
import { SITES } from '../apps/sites/lib/registry.mjs';
import { WORLD_PORTALS } from '../apps/world/lib/registry.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };

const corpus = readCorpus(ROOT);
check(corpus.length >= 40, `korpus je premali: ${corpus.length}`);

const corporate = corpus.filter((item) => /gnk\s*(asg|dinamo)/i.test(`${item.title} ${item.description} ${(item.tags || []).join(' ')}`));
check(corporate.length >= 5, `nema dovoljno korporativnih tekstova u korpusu: ${corporate.length}`);
check(corpus.some((item) => /pojasnjenje-gnk-asg-i-gnk-dinamo/i.test(item.slug)), 'u korpusu nema pojašnjenja GNK ASG / GNK DINAMO Ltd.');
const explainer = corpus.find((item) => /pojasnjenje-gnk-asg-i-gnk-dinamo/i.test(item.slug));
check(Boolean(explainer) && /gnk\s*dinamo/i.test(`${explainer.title} ${explainer.description}`), 'pojašnjenje ne spominje GNK DINAMO Ltd.');

const targets = [
  ...SITES.map((site) => ({
    key: site.slug,
    dir: join(ROOT, 'apps', 'sites', 'site', site.slug),
    columnBase: '/kolumna/',
    sitemap: join(ROOT, 'apps', 'sites', 'site', site.slug, 'sitemap.xml')
  })),
  ...WORLD_PORTALS.map((portal) => ({
    key: `world-${portal.id}`,
    dir: join(ROOT, 'apps', 'world', 'site', portal.id),
    columnBase: '/kolumne/',
    sitemap: join(ROOT, 'apps', 'world', 'site', portal.id, 'sitemap.xml')
  }))
];

let pages = 0;
for (const target of targets) {
  const prenosDir = join(target.dir, 'prenos');
  const indexFile = join(prenosDir, 'index.html');

  if (!existsSync(indexFile)) { fails.push(`${target.key}: nema /prenos/`); continue; }
  const index = readFileSync(indexFile, 'utf8');
  pages += 1;

  check(existsSync(join(prenosDir, 'img', 'nermin-sefic.webp')), `${target.key}: nema slike autora`);
  check(index.includes('img/nermin-sefic.webp'), `${target.key}: popis ne prikazuje sliku autora`);

  for (const item of corpus) {
    const href = item.kind === 'kolumna' ? `${target.columnBase}${item.slug}/` : `/prenos/${item.slug}/`;
    check(index.includes(`href="${href}"`), `${target.key}: popis ne vodi na ${item.slug}`);

    const file = item.kind === 'kolumna'
      ? join(target.dir, target.columnBase.replace(/^\/|\/$/g, ''), item.slug, 'index.html')
      : join(prenosDir, item.slug, 'index.html');
    if (!existsSync(file)) { fails.push(`${target.key}: nema stranice ${item.slug}`); continue; }
    const html = readFileSync(file, 'utf8');
    pages += 1;

    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '';
    check(canonical === item.canonical, `${target.key}/${item.slug}: canonical nije izvornik`);
    check(html.includes(`href="${item.canonical}"`), `${target.key}/${item.slug}: nema linka na izvornik`);
    check(/<h1>[^<]{8,}<\/h1>/.test(html), `${target.key}/${item.slug}: nema naslova`);
    check(/<p>[^<]{80,}/.test(html), `${target.key}/${item.slug}: nema prenesenog teksta`);
    check(html.includes('#AKTUALMEDIA') && html.includes('#NerminSefić'), `${target.key}/${item.slug}: nema oznaka`);
    check(/name="editor" content="Nermin Sefić"/.test(html), `${target.key}/${item.slug}: nema meta urednika`);
    check(html.includes('nermin-sefic.webp'), `${target.key}/${item.slug}: nema slike autora`);
  }

  if (existsSync(target.sitemap)) {
    const sitemap = readFileSync(target.sitemap, 'utf8');
    check(sitemap.includes('<loc>') && /prenos|kolum/.test(sitemap), `${target.key}: sitemap ne sadrži prenos`);
  }
}

const ok = fails.length === 0;
console.log(JSON.stringify({
  ok,
  checks: 'GNK_ASG_PRENOS_V1',
  corpus: corpus.length,
  corporate: corporate.length,
  targets: targets.length,
  pages,
  failures: fails.slice(0, 20)
}, null, 2));
if (!ok) process.exit(1);
