#!/usr/bin/env node
/**
 * TONSKI PODIZANJE ILUSTRACIJA DESKOVA.
 *
 * Ilustracije za politiku, modu, sigurnost i svijet rade se u noćnom,
 * kazališnom tonu: duboka plava i gotovo crna sjenila. Na naslovnici to
 * izgleda dobro, ali u krugu od 84 px takva slika postaje tamna ploha bez
 * detalja — čitatelj ne vidi ni motive ni razliku među deskovima.
 *
 * Skript diže svjetlinu i srednje tonove, a boju ostavlja gotovo netaknutu:
 *
 *     -modulate 122,104,100 -gamma 1.10
 *
 * Isti postupak ide na sve veličine jednog deska, pa nema razlike između
 * kruga i naslovnice. Izvorni ton ostaje prepoznatljiv; mijenja se samo
 * koliko svjetla slika nosi.
 *
 * Pokretanje:
 *   node scripts/tone-desk-art-v1.mjs --check   # izmjeri, ništa ne mijenja
 *   node scripts/tone-desk-art-v1.mjs           # primijeni na tamne deske
 *   node scripts/tone-desk-art-v1.mjs --only moda
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const ART = join(ROOT, 'apps', 'portal', 'assets', 'desk', 'art');

/* Ispod ovoga krug izgleda kao prazna ploha. */
const MIN_MEAN = 40;
const TONE = { brightness: 122, saturation: 104, gamma: 1.1 };

const arg = (name, fallback = '') => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1] ?? fallback;
};
const CHECK = process.argv.includes('--check');
const ONLY = arg('--only', '');

const measure = (file) => {
  const out = execFileSync('identify', ['-format', '%[fx:int(255*standard_deviation)] %[fx:int(255*mean)]', file], { encoding: 'utf8' }).trim();
  const [std, mean] = out.split(/\s+/).map(Number);
  return { std, mean };
};

const desks = [...new Set(
  readdirSync(ART)
    .filter((name) => /-240\.webp$/.test(name))
    .map((name) => name.replace(/-240\.webp$/, ''))
)].sort();

let changed = 0;
const report = [];

for (const desk of desks) {
  if (ONLY && ONLY !== desk) continue;
  const thumb = join(ART, `${desk}-240.webp`);
  if (!existsSync(thumb)) continue;
  const before = measure(thumb);
  report.push({ desk, ...before, toned: false });
  if (before.mean >= MIN_MEAN || CHECK) continue;

  for (const file of readdirSync(ART)) {
    if (!file.startsWith(`${desk}-`)) continue;
    if (!/\.(webp|jpg)$/.test(file)) continue;
    const full = join(ART, file);
    execFileSync('convert', [
      full,
      '-modulate', `${TONE.brightness},${TONE.saturation},100`,
      '-gamma', String(TONE.gamma),
      '-quality', file.endsWith('.jpg') ? '86' : '82',
      '-strip',
      full
    ], { stdio: 'pipe' });
  }
  changed += 1;
  const after = measure(thumb);
  const entry = report.find((r) => r.desk === desk);
  entry.toned = true;
  entry.after = after;
  console.log(`[ton] ${desk}: svjetlina ${before.mean} → ${after.mean}, raspršenje ${before.std} → ${after.std}`);
}

const stillDark = report.filter((r) => (r.after ?? r).mean < MIN_MEAN);

if (!CHECK && changed === 0 && stillDark.length) {
  console.error(`::error::${stillDark.length} deskova je još tamno: ${stillDark.map((r) => r.desk).join(', ')}`);
  process.exit(1);
}
console.log(CHECK
  ? `[ton] provjera: ${report.length} deskova, ${report.filter((r) => r.mean < MIN_MEAN).length} ispod praga (${MIN_MEAN}).`
  : `[ton] gotovo: podignuto ${changed} deskova, ${report.length} ukupno.`);
