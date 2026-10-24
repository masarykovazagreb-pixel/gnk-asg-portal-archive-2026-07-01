#!/usr/bin/env node
/**
 * ATLAS → IZDANJA: preslikava atlas grafiku u mape koje stranice već traže.
 *
 * Zašto poseban korak, a ne izravni upis: `apps/portal/assets/izdanja/` je
 * ugovor s ostatkom portala — imena (`<id>-440.webp`, `<id>-1200.webp`,
 * `<id>-og.jpg`) i dimenzije koriste pločice, feedovi, OG oznake i sitemap
 * slika. Atlas generator proizvodi svoje ime (`atlas/<id>-440.webp`), a ovaj
 * skript jamči da su dimenzije iste prije preslikavanja. Ako se ne slažu,
 * prekida se — bolje bez zamjene nego s razmazanom naslovnicom.
 *
 * Pokretanje:
 *   node scripts/apply-atlas-art-v1.mjs            # samo svjetska izdanja
 *   node scripts/apply-atlas-art-v1.mjs --all      # i matična grafika
 *   node scripts/apply-atlas-art-v1.mjs --check    # provjeri bez pisanja
 */
import { copyFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const ATLAS = join(ROOT, 'apps', 'portal', 'assets', 'atlas');
const OUT = join(ROOT, 'apps', 'portal', 'assets', 'izdanja');
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'apps', 'portal', 'data', 'atlas-art-v1.json'), 'utf8'));
const CHECK = process.argv.includes('--check');

/* Devet svjetskih izdanja. Regionalna izdanja imaju stvarne fotografije
   gradova i njih ovaj skript ne dira. Tri prijestolnice koje još nemaju
   izdanje (Washington, Brasília, Canberra) dijele istu grafiku s atlasom,
   pa se i one primjenjuju — stranica prijestolnice ne smije ostati na
   staroj plohi kad se atlas promijeni. */
const TARGETS = ['nairobi', 'jakarta', 'newyork', 'saopaulo', 'sydney', 'singapur', 'kairo', 'tokio', 'peking', 'washington', 'brasilia', 'canberra'];

/* Izlazna imena i dimenzije koje portal očekuje. */
const CONTRACT = [
  ['240', 240, 160],
  ['440', 440, 248],
  ['800', 800, 450],
  ['880', 880, 587],
  ['1200', 1200, 675]
];

const dims = (file) => execFileSync('identify', ['-format', '%w %h', file], { encoding: 'utf8' }).trim();

const sizesInManifest = MANIFEST.sizes || {};
for (const [name, w, h] of CONTRACT) {
  const size = sizesInManifest[name];
  if (!size || size.w !== w || size.h !== h) {
    console.error(`[apply] manifest nema veličinu ${name} ${w}×${h} — pokreni build-atlas-art-v1.mjs`);
    process.exit(1);
  }
}

const applied = [];
for (const slug of TARGETS) {
  const image = MANIFEST.images.find((item) => item.slug === slug);
  if (!image) {
    console.error(`[apply] nema atlas grafike za ${slug}`);
    process.exit(1);
  }
  for (const [name, w, h] of CONTRACT) {
    const src = join(ATLAS, `${slug}-${name}.webp`);
    const dst = join(OUT, `${slug}-${name}.webp`);
    if (!existsSync(src)) {
      console.error(`[apply] nema ${src}`);
      process.exit(1);
    }
    const actual = dims(src);
    if (actual !== `${w} ${h}`) {
      console.error(`[apply] ${src} je ${actual}, ugovor traži ${w} ${h}`);
      process.exit(1);
    }
    if (!CHECK) copyFileSync(src, dst);
    applied.push(dst);
  }
  const ogSrc = join(ATLAS, `${slug}-og.jpg`);
  if (existsSync(ogSrc) && !CHECK) copyFileSync(ogSrc, join(OUT, `${slug}-og.jpg`));
}

console.log(JSON.stringify({
  ok: true,
  version: MANIFEST.version,
  mode: CHECK ? 'check' : 'apply',
  editions: TARGETS.length,
  files: CHECK ? applied.filter((file) => existsSync(file)).length : applied.length,
  note: 'Regionalna izdanja zadržavaju fotografije; atlas mijenja devet svjetskih izdanja i tri prijestolnice u pripremi.',
  sample: applied.slice(0, 3).map((file) => file.replace(ROOT + '/', '') + ` (${statSync(file).size} B)`)
}, null, 2));
