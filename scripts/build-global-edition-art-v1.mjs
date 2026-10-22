#!/usr/bin/env node
/**
 * AKTUAL MEDIA — grafika za globalna izdanja.
 *
 * Za svako izdanje gradi apstraktnu naslovnicu iz vlastite palete: gradijent,
 * mreža, lukovi i točke. Nema fotografija, nema portreta i nema teksta u slici
 * — ime izdanja, zemlja i jezik stoje u HTML-u i u alt atributu.
 *
 * Izlaz (apps/portal/assets/izdanja/):
 *   <id>-240.webp   240×160   traka izdanja
 *   <id>-440.webp   440×248   kartice
 *   <id>-800.webp   800×450   srcset
 *   <id>-1200.webp  1200×675  velika naslovnica
 *   <id>-880.webp   880×587   ulaz za tiles.mjs (pločica s tekstom)
 *   <id>-og.jpg     1200×630  Open Graph / Twitter
 *
 * Pokretanje:
 *   node scripts/build-global-edition-art-v1.mjs            # sva globalna izdanja
 *   node scripts/build-global-edition-art-v1.mjs --only tokio
 *
 * Zahtijeva ImageMagick 6 (`convert`) s WebP podrškom.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'apps', 'portal', 'assets', 'izdanja');
const CHANNELS = JSON.parse(readFileSync(join(ROOT, 'apps', 'region', 'channels.json'), 'utf8')).channels;

const GLOBAL_IDS = ['nairobi', 'jakarta', 'newyork', 'saopaulo', 'sydney', 'singapur', 'kairo', 'tokio', 'peking'];

const arg = (name, fallback = '') => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1] ?? fallback;
};
const ONLY = arg('--only', '');

const run = (args) => execFileSync('convert', args, { stdio: 'pipe' });

/* Deterministički izbor elemenata: isto izdanje uvijek izgleda isto. */
const seeded = (id) => {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};

const hexToRgb = (hex) => {
  const v = String(hex).replace('#', '');
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
};
const rgba = (hex, alpha) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

const W = 1600;
const H = 900;

function master(channel) {
  const rnd = seeded(channel.id);
  const { bg, surface, accent, accent2 } = channel.palette;
  const draws = [];

  /* Veliki mekani sjaj u gornjem desnom kutu — dubina, ne fotografija. */
  draws.push(['-fill', rgba(accent2, 0.16), '-draw', `circle ${1100 + Math.round(rnd() * 220)},${120 + Math.round(rnd() * 120)} ${1100},${120}`]);
  /* Koncentrični lukovi: mreža se širi iz jednog središta. */
  for (let i = 0; i < 5; i += 1) {
    const r = 210 + i * 96;
    draws.push(['-fill', 'none', '-stroke', rgba(accent, 0.10 + i * 0.035), '-strokewidth', String(i % 2 ? 1 : 2), '-draw', `circle ${1240},${860} ${1240},${860 - r}`]);
  }
  /* Horizont i mreža: ista linija kao na pločicama. */
  draws.push(['-fill', 'none', '-stroke', rgba(accent, 0.55), '-strokewidth', '2', '-draw', `line 0,${Math.round(H * 0.66)} ${W},${Math.round(H * 0.66)}`]);
  for (let i = 1; i < 12; i += 1) {
    const x = Math.round((W / 12) * i);
    draws.push(['-stroke', rgba('#ffffff', 0.05), '-strokewidth', '1', '-draw', `line ${x},0 ${x},${Math.round(H * 0.66)}`]);
  }
  /* Točke podataka: ritam, ne tekst. */
  for (let i = 0; i < 26; i += 1) {
    const x = Math.round(80 + rnd() * (W - 160));
    const y = Math.round(80 + rnd() * (H * 0.5));
    const r = 1.6 + rnd() * 2.4;
    draws.push(['-stroke', 'none', '-fill', rgba(accent2, 0.35 + rnd() * 0.4), '-draw', `circle ${x},${y} ${Math.round(x + r)},${y}`]);
  }
  /* Dijagonalna crta nosi boju izdanja preko cijele slike. */
  draws.push(['-fill', 'none', '-stroke', rgba(accent2, 0.35), '-strokewidth', '1.5', '-draw', `line 0,${Math.round(H * 0.18)} ${W},${Math.round(H * 0.34)}`]);

  const tmp = join(OUT, `.art-${channel.id}.png`);
  const args = ['-size', `${W}x${H}`, `gradient:${bg}-${surface}`, ...draws.flat(), '-blur', '0x0.4', tmp];
  run(args);
  return tmp;
}

const sizes = [
  ['240', 240, 160],
  ['440', 440, 248],
  ['800', 800, 450],
  ['1200', 1200, 675],
  ['880', 880, 587]
];

function build(channel) {
  const tmp = master(channel);
  for (const [name, w, h] of sizes) {
    run([tmp, '-resize', `${w}x${h}^`, '-gravity', 'center', '-extent', `${w}x${h}`, '-quality', '82', '-strip', join(OUT, `${channel.id}-${name}.webp`)]);
  }
  run([tmp, '-resize', '1200x630^', '-gravity', 'center', '-extent', '1200x630', '-quality', '86', '-strip', join(OUT, `${channel.id}-og.jpg`)]);
  rmSync(tmp, { force: true });
  console.log(`[art] ${channel.id} → 240/440/800/1200/880 + og.jpg`);
}

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
const targets = CHANNELS.filter((c) => GLOBAL_IDS.includes(c.id)).filter((c) => !ONLY || c.id === ONLY);
for (const channel of targets) build(channel);
console.log(`[art] gotovo · ${targets.length} izdanja`);
