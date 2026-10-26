#!/usr/bin/env node
/**
 * IZDANJA — naslovne slike iz jednog izvora, u svim veličinama.
 *
 * Zašto postoji: devet svjetskih izdanja imalo je apstraktne plohe umjesto
 * grada. Na popisu izdanja to izgleda kao prazan crni krug — čitatelj ne vidi
 * o kojem gradu je riječ dok ne pročita natpis, a pločica bez slike ne nosi
 * ni jednu informaciju koju oko može primiti prije teksta.
 *
 * Kako radi: svaka naslovnica ima izvornu sliku u `apps/portal/assets/src/`
 * i iz nje se deterministicizirano izvodi cijeli set koji generatori traže:
 *
 *   <id>-240.webp    240×160    traka izdanja
 *   <id>-440.webp    440×248    kartice i krugovi na ploči
 *   <id>-800.webp    800×450    srcset
 *   <id>-1200.webp  1200×675    velika naslovnica
 *   <id>-880.webp    880×587    ulaz za `tiles.mjs` (pločica s tekstom)
 *   <id>-og.jpg     1200×630    Open Graph / Twitter
 *
 * Rez se radi iz sredine (`-gravity center`) i bez metapodataka (`-strip`), pa
 * dva pokretanja daju iste bajtove. Izvor se ne mijenja.
 *
 * Podrijetlo se ne prepisuje ručno: svaki par ide u
 * `apps/portal/data/edition-photo-provenance-v1.json`, s tipom zapisa, licencom
 * i napomenom da je riječ o ilustraciji, a ne o reportažnoj fotografiji.
 *
 * Pokretanje:
 *   node scripts/build-edition-photos-v1.mjs            # sve što ima izvor
 *   node scripts/build-edition-photos-v1.mjs --only kairo
 *   node scripts/build-edition-photos-v1.mjs --check    # ništa ne piše, samo provjeri
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SRC = join(ROOT, 'apps', 'portal', 'assets', 'src');
const OUT = join(ROOT, 'apps', 'portal', 'assets', 'izdanja');
const MANIFEST = join(ROOT, 'apps', 'portal', 'data', 'edition-photo-provenance-v1.json');

const arg = (name, fallback = '') => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1] ?? fallback;
};
const ONLY = arg('--only', '');
const CHECK = process.argv.includes('--check');

/* Jedan popis veličina — isti za sva izdanja. */
const SIZES = [
  { suffix: '240', w: 240, h: 160, q: 80 },
  { suffix: '440', w: 440, h: 248, q: 82 },
  { suffix: '800', w: 800, h: 450, q: 82 },
  { suffix: '1200', w: 1200, h: 675, q: 84 },
  { suffix: '880', w: 880, h: 587, q: 84 }
];

/* Gradovi za koje postoji izvor. Ostali (osam regionalnih) imaju svoje
   fotografije iz drugog izvora i ovaj ih ne dira. */
const CITIES = ['nairobi', 'jakarta', 'newyork', 'saopaulo', 'sydney', 'singapur', 'kairo', 'tokio', 'peking'];

const run = (args) => execFileSync('convert', args, { stdio: 'pipe' });

const sources = () => {
  if (!existsSync(SRC)) return [];
  return readdirSync(SRC)
    .filter((name) => ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(name).toLowerCase()))
    .map((name) => ({ id: name.slice(0, -extname(name).length), file: join(SRC, name) }))
    .filter((entry) => !ONLY || entry.id === ONLY)
    .filter((entry) => CITIES.includes(entry.id))
    .sort((a, b) => a.id.localeCompare(b.id));
};

const main = () => {
  if (!CHECK) mkdirSync(OUT, { recursive: true });
  const found = sources();
  if (!found.length) {
    console.error(`Nema izvornih slika u ${SRC} (tražim: ${CITIES.join(', ')})`);
    process.exit(1);
  }

  const manifest = {
    version: 'AKTUAL_MEDIA_EDITION_PHOTO_PROVENANCE_V1',
    note: 'Naslovne slike izdanja. Tip "illustration" znači da slika nije reportažna fotografija događaja, nego digitalno izrađen prikaz grada za potrebe naslovnice.',
    sizes: SIZES.map((size) => `${size.w}x${size.h}`),
    items: [],
    generated: []
  };
  let written = 0;

  for (const { id, file } of found) {
    const source = statSync(file);
    for (const size of SIZES) {
      const target = join(OUT, `${id}-${size.suffix}.webp`);
      if (CHECK) {
        if (!existsSync(target)) { console.error(`✗ ${id}-${size.suffix}.webp nedostaje`); process.exitCode = 1; }
        continue;
      }
      run([file, '-auto-orient', '-resize', `${size.w}x${size.h}^`, '-gravity', 'center',
        '-extent', `${size.w}x${size.h}`, '-strip', '-quality', String(size.q), target]);
      written += 1;
    }
    const og = join(OUT, `${id}-og.jpg`);
    if (CHECK) {
      if (!existsSync(og)) { console.error(`✗ ${id}-og.jpg nedostaje`); process.exitCode = 1; }
    } else {
      run([file, '-auto-orient', '-resize', '1200x630^', '-gravity', 'center',
        '-extent', '1200x630', '-strip', '-quality', '86', og]);
      written += 1;
    }

    manifest.items.push({
      id,
      source: `apps/portal/assets/src/${id}${extname(file)}`,
      sourceBytes: source.size,
      type: 'illustration',
      creator: 'AKTUAL MEDIA',
      rights: 'Vlastita izrada za AKTUAL MEDIA; nije reportažna fotografija događaja.',
      alt: `${id} — prikaz grada za naslovnicu izdanja`,
      widths: SIZES.map((size) => size.w).concat(630)
    });
  }

  /* Ostale naslovnice (regionalna izdanja, gradovi koji još nisu izdanja,
     desk pločice) ne dolaze iz fotografije nego iz generatora grafike. One
     također moraju imati zapis — samo drugog tipa. Popis se čita s diska, pa
     se ne može razići od onoga što stvarno postoji. */
  const covered = new Set(manifest.items.map((item) => item.id));
  for (const name of readdirSync(OUT)) {
    const match = name.match(/^([a-z0-9-]+)-(240|440|800|1200|880)\.webp$/);
    if (!match || covered.has(match[1]) || manifest.generated.some((item) => item.id === match[1])) continue;
    manifest.generated.push({
      id: match[1],
      type: 'editorial-art',
      generator: 'apps/region/engine/tiles.mjs',
      creator: 'AKTUAL MEDIA',
      rights: 'Vlastita izrada za mrežu; izvorni snimak nije zabilježen u ovom zapisu.',
      note: 'Naslovnica iz generatora grafike. Nedostatak: podrijetlo izvornog snimka nije zapisano — vidi zadatak 29.'
    });
  }

  if (!CHECK) {
    writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(JSON.stringify({ version: manifest.version, editions: manifest.items.length, files: written, out: 'apps/portal/assets/izdanja' }, null, 2));
  } else {
    console.log(JSON.stringify({ version: manifest.version, editions: manifest.items.length, check: 'ok' }, null, 2));
  }
};

main();
