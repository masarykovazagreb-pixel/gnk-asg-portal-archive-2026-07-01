#!/usr/bin/env node
/**
 * AKTUAL MEDIA — gradske slike globalnih izdanja iz stvarne scene.
 *
 * Devet svjetskih izdanja (Nairobi, Jakarta, New York, São Paulo, Sydney,
 * Singapur, Kairo, Tokio, Peking) dobivalo je apstraktnu grafiku: gradijent,
 * lukove i točke. U traci od 84 px ta grafika izgleda kao prazan tamni krug —
 * grad se ne prepoznaje. Ovaj skript uzima scensku ilustraciju iz
 * `assets/global-src/<id>.png` i gradi isti set datoteka kao ostala izdanja.
 *
 * Izlaz (apps/portal/assets/izdanja/):
 *   <id>-240.webp   240×161   krugovi i trake
 *   <id>-440.webp   440×248   kartice
 *   <id>-800.webp   800×450   srcset
 *   <id>-1200.webp  1200×675  naslovnica
 *   <id>-880.webp   880×587   ulaz za tiles.mjs (pločica s tekstom)
 *   <id>-og.jpg     1200×630  Open Graph / Twitter
 *
 * Pokretanje:
 *   node scripts/build-global-edition-photo-v1.mjs           # svih devet
 *   node scripts/build-global-edition-photo-v1.mjs --only tokio
 *
 * Zahtijeva ImageMagick (`convert`).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SRC = join(ROOT, 'assets', 'global-src');
const OUT = join(ROOT, 'apps', 'portal', 'assets', 'izdanja');

const GLOBAL_IDS = ['nairobi', 'jakarta', 'newyork', 'saopaulo', 'sydney', 'singapur', 'kairo', 'tokio', 'peking'];

const arg = (name, fallback = '') => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1] ?? fallback;
};
const ONLY = arg('--only', '');
const CHANNELS = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8')).channels;

const run = (args) => execFileSync('convert', args, { stdio: 'pipe' });

/* Kadriranje: grad je u gornje dvije trećine, nebo nosi boju. Suprotno od
   apstraktne grafike, slika mora imati strukturiran sadržaj i u krugu od 84 px. */
const SIZES = [
  ['240', 240, 161, 82],
  ['440', 440, 295, 82],
  ['800', 800, 450, 84],
  ['1200', 1200, 675, 86],
  ['880', 880, 587, 86]
];

let built = 0;
const missing = [];

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

for (const id of GLOBAL_IDS) {
  if (ONLY && ONLY !== id) continue;
  const source = join(SRC, `${id}.png`);
  if (!existsSync(source)) { missing.push(id); continue; }
  const city = CHANNELS.find((c) => c.id === id);
  const label = city ? `${city.city}, ${city.country}` : id;

  for (const [suffix, width, height, quality] of SIZES) {
    run([
      source,
      '-resize', `${width}x${height}^`,
      '-gravity', 'center',
      '-extent', `${width}x${height}`,
      /* Blago podizanje kontrasta: scena ostaje scena, ali se grad vidi i u
         malom krugu bez crnog okvira. */
      '-modulate', '103,108,100',
      '-unsharp', '0x0.6+0.4+0.02',
      '-quality', String(quality),
      '-strip',
      join(OUT, `${id}-${suffix}.webp`)
    ]);
  }

  /* OG: isti kadar, 1200×630, s malim podnožjem da naslov kartice ne pada na
     najsvjetliji dio neba. */
  run([
    source,
    '-resize', '1200x630^',
    '-gravity', 'center',
    '-extent', '1200x630',
    '-modulate', '102,106,100',
    '-quality', '86',
    '-strip',
    join(OUT, `${id}-og.jpg`)
  ]);

  built += 1;
  console.log(`[global-art] ${id} — ${label}`);
}

if (missing.length) {
  console.error(`::error::Nema izvorne scene za: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`[global-art] gotovo: ${built} izdanja, ${built * SIZES.length} WebP + ${built} OG.`);
