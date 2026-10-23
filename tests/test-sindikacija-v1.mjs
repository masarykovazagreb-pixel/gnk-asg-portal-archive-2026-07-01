#!/usr/bin/env node
/**
 * SINDIKACIJA — provjera da je svaka kolumna stvarno prenesena.
 *
 * Test ne vjeruje generatoru: otvara svaku izvornu kolumnu na portalu i traži
 * njezinu stranicu na svakoj povezanoj domeni. Provjerava četiri stvari koje
 * se najlakše tiho pokvare:
 *
 *   1. stranica postoji na svakoj od šest stranica mreže;
 *   2. `<link rel="canonical">` pokazuje na izvornik — kopija ne otima
 *      matičnu adresu i ne stvara duplikat u tražilici;
 *   3. izvornik je vidljivo naveden u tekstu, s apsolutnim linkom;
 *   4. naslov i prvi odlomak stvarno postoje — prazna kolumna ne prolazi.
 *
 * Pokretanje: node tests/test-sindikacija-v1.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITES } from '../apps/sites/lib/registry.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'apps', 'portal', 'gnk-aktual', 'kolumne');
const SITE_ROOT = join(ROOT, 'apps', 'sites', 'site');

const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };

/* Izvornik nosi vlastiti canonical; neke kolumne su preslike autorskih
   objava, pa se adresa izvora čita, a ne sastavlja po imenu mape. */
const sources = readdirSync(SOURCE)
  .filter((name) => statSync(join(SOURCE, name)).isDirectory())
  .filter((name) => existsSync(join(SOURCE, name, 'index.html')))
  .map((name) => {
    const html = readFileSync(join(SOURCE, name, 'index.html'), 'utf8');
    return { slug: name, canonical: (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '' };
  })
  .filter((row) => row.canonical && /<h1[^>]*>/i.test(readFileSync(join(SOURCE, row.slug, 'index.html'), 'utf8')));
const slugs = sources.map((row) => row.slug);

check(slugs.length >= 10, `izvornih kolumni je premalo: ${slugs.length}`);

let pages = 0;
for (const site of SITES) {
  const base = join(SITE_ROOT, site.slug, 'kolumna');
  check(existsSync(join(base, 'index.html')), `${site.slug}: nema /kolumna/ popisa`);

  const index = existsSync(join(base, 'index.html')) ? readFileSync(join(base, 'index.html'), 'utf8') : '';
  for (const slug of slugs) {
    const sourceUrl = (sources.find((row) => row.slug === slug) || {}).canonical || '';
    const file = join(base, slug, 'index.html');
    if (!existsSync(file)) { fails.push(`${site.slug}: nedostaje kolumna ${slug}`); continue; }
    const html = readFileSync(file, 'utf8');
    pages += 1;

    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '';
    check(canonical === sourceUrl, `${site.slug}/${slug}: canonical nije izvornik (${canonical})`);
    check(html.includes(`href="${sourceUrl}"`), `${site.slug}/${slug}: nema vidljivog linka na izvornik`);
    check(/<h1>[^<]{10,}<\/h1>/.test(html), `${site.slug}/${slug}: nema naslova`);
    check(/<div class="body">[\s\S]*?<p>[^<]{80,}/.test(html), `${site.slug}/${slug}: nema prenesenog teksta`);
    check(html.includes('#AKTUALMEDIA') && html.includes('#GNKASG') && html.includes('#NerminSefić'), `${site.slug}/${slug}: nedostaju oznake`);
    check(/name="editor" content="Nermin Sefić"/.test(html), `${site.slug}/${slug}: nema meta urednika`);
    check(html.includes('network-entity-v1'), `${site.slug}/${slug}: nema entitetskog grafa`);
    check(index.includes(`/kolumna/${slug}/`), `${site.slug}: popis ne vodi na ${slug}`);
  }
}

const ok = fails.length === 0;
console.log(JSON.stringify({
  ok,
  checks: 'GNK_ASG_SINDIKACIJA_V1',
  columns: slugs.length,
  sites: SITES.length,
  pages,
  failures: fails.slice(0, 25)
}, null, 2));
if (!ok) process.exit(1);
