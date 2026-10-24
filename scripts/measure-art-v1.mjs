#!/usr/bin/env node
/**
 * MJERENJE GRAFIKE — koliko slika nosi sadržaj, a koliko je prazna ploha.
 *
 * Gradska grafika se pojavljuje u krugu od 84 px. Apstraktna grafika s
 * gradijentom u tom krugu izgleda kao prazan tamni disk: grad se ne
 * prepoznaje, a čitatelj vidi "rupicu" u mreži. Zato se svaka gradska slika
 * mjeri: srednja svjetlina (mean) i raspršenje (standard deviation). Prazna
 * ploha ima nisko raspršenje; noćna scena bez detalja ima nisku svjetlinu.
 *
 * Skript piše `apps/portal/data/art-richness-v1.json` s otiskom svake
 * datoteke, pa test može provjeriti i sadržaj i svježinu popisa bez
 * dekodiranja WebP-a u Nodeu.
 *
 * Pokretanje:
 *   node scripts/measure-art-v1.mjs            # izmjeri i upiši popis
 *   node scripts/measure-art-v1.mjs --check    # samo provjeri (ne piše)
 *
 * Zahtijeva ImageMagick (`identify`).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const ART = join(ROOT, 'apps', 'portal', 'assets', 'izdanja');
const OUT = join(ROOT, 'apps', 'portal', 'data', 'art-richness-v1.json');
const CHECK = process.argv.includes('--check');

/* Pragovi: ispod ovoga slika u krugu izgleda kao prazna ploha. */
const MIN_STD = 25;
const MIN_MEAN = 35;
/* Mjere se najmanje veličine — one idu u krugove i trake. */
const SUFFIXES = ['-240.webp', '-440.webp'];

const haveIdentify = (() => {
  try { execFileSync('identify', ['-version'], { stdio: 'pipe' }); return true; } catch { return false; }
})();

const measure = (file) => {
  const out = execFileSync('identify', ['-format', '%[fx:int(255*standard_deviation)] %[fx:int(255*mean)]', file], { encoding: 'utf8' }).trim();
  const [std, mean] = out.split(/\s+/).map(Number);
  return { std, mean };
};

const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 16);

if (!existsSync(ART)) {
  console.error('Nema apps/portal/assets/izdanja — pokreni izgradnju grafike.');
  process.exit(1);
}

const files = readdirSync(ART).filter((name) => SUFFIXES.some((suffix) => name.endsWith(suffix))).sort();
const entries = [];
const fails = [];

for (const name of files) {
  const full = join(ART, name);
  const id = name.replace(/-\d+\.webp$/, '');
  const size = name.match(/-(\d+)\.webp$/)[1];
  const record = { id, size, file: `/assets/izdanja/${name}`, sha256: sha(full) };
  if (haveIdentify) {
    Object.assign(record, measure(full));
    if (record.std < MIN_STD) fails.push(`${name}: raspršenje ${record.std} < ${MIN_STD} — ploha bez sadržaja`);
    if (record.mean < MIN_MEAN) fails.push(`${name}: svjetlina ${record.mean} < ${MIN_MEAN} — previše tamno za krug`);
  }
  entries.push(record);
}

if (!haveIdentify) {
  console.error('::error::ImageMagick `identify` nije dostupan — mjerenje nije moguće.');
  process.exit(1);
}

const payload = {
  version: 'ART_RICHNESS_V1_20261023',
  generatedAt: new Date().toISOString(),
  thresholds: { std: MIN_STD, mean: MIN_MEAN },
  files: entries.length,
  entries
};

if (CHECK) {
  if (!existsSync(OUT)) {
    console.error('Nema popisa — pokreni node scripts/measure-art-v1.mjs');
    process.exit(1);
  }
  const previous = JSON.parse(readFileSync(OUT, 'utf8'));
  const known = new Map(previous.entries.map((e) => [e.file, e]));
  for (const entry of entries) {
    const before = known.get(entry.file);
    if (!before) { fails.push(`${entry.file}: nije u popisu`); continue; }
    if (before.sha256 !== entry.sha256) fails.push(`${entry.file}: datoteka se promijenila — ponovi mjerenje`);
    if (entry.std < MIN_STD || entry.mean < MIN_MEAN) fails.push(`${entry.file}: premalo sadržaja (std ${entry.std}, mean ${entry.mean})`);
  }
} else {
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
}

if (fails.length) {
  console.error(`GRAFIKA — ${fails.length} problema u ${entries.length} datoteka:`);
  for (const fail of fails.slice(0, 30)) console.error(`  ✗ ${fail}`);
  process.exit(1);
}
console.log(`GRAFIKA — OK: ${entries.length} gradskih slika, svaka iznad praga (std ≥ ${MIN_STD}, svjetlina ≥ ${MIN_MEAN}).`);
