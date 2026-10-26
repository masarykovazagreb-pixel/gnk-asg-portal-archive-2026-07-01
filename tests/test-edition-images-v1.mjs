#!/usr/bin/env node
/**
 * SLIKE IZDANJA — nema crnih krugova.
 *
 * Na popisu izdanja svaki krug nosi sliku grada. Apstraktna tamna grafika
 * (gradijent bez scene) na krugu izgleda kao prazna ploha, pa čitatelj ne vidi
 * grad. Test traži za svako od 17 izdanja:
 *   1. kompletan set datoteka (240, 440, 800, 880, 1200, og.jpg);
 *   2. prosječnu svjetlinu velike slike iznad praga — tamna ploha pada ispod.
 *
 * Prag 0,15 (0–1 skala) razdvaja scene (0,19–0,29) od tamne grafike (0,08–0,11)
 * s rezervom s obje strane.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'apps', 'portal', 'assets', 'izdanja');
const MIN_MEAN = 0.15;
const SETS = ['240.webp', '440.webp', '800.webp', '880.webp', '1200.webp', 'og.jpg'];

const ids = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8')).channels.map((c) => c.id);
const fails = [];
const report = [];

const mean = (file) => {
  const out = execFileSync('convert', [file, '-colorspace', 'Gray', '-format', '%[fx:mean]', 'info:'], { encoding: 'utf8' });
  return Number(out.trim());
};

for (const id of ids) {
  const missing = SETS.filter((suffix) => !existsSync(join(DIR, `${id}-${suffix}`)));
  if (missing.length) {
    fails.push(`${id}: nedostaju ${missing.join(', ')}`);
    continue;
  }
  const m = mean(join(DIR, `${id}-1200.webp`));
  report.push({ id, mean: Number(m.toFixed(3)) });
  if (m < MIN_MEAN) fails.push(`${id}: tamna slika (prosjek ${m.toFixed(3)} < ${MIN_MEAN}) — crni krug`);
}

const result = {
  version: 'AKTUAL_MEDIA_EDITION_IMAGES_V1',
  editions: ids.length,
  minMean: MIN_MEAN,
  darkest: report.slice().sort((a, b) => a.mean - b.mean).slice(0, 3),
  failures: fails.length,
  ok: fails.length === 0
};
console.log(JSON.stringify(result, null, 2));
if (fails.length) {
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}
