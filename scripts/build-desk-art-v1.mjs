#!/usr/bin/env node
/**
 * AKTUAL MEDIA — grafika tematskih deskova.
 *
 * Zašto: kartice deskova imale su plohu u boji, a stranica deska nije imala
 * nijednu veliku sliku. Za čitatelja je to izgledalo kao prazna kućica, a za
 * dijeljenje kao stranica bez naslovnice. Ovaj skript iz jednog izvora
 * (`assets/desk/src/<id>.png|webp`, 16:9) pravi sve veličine koje stranice
 * traže — i to na jednom mjestu, pa kartica, hero i OG slika nikad nisu
 * različitih dimenzija.
 *
 * Pravila:
 *   • grafika je ILUSTRACIJA, ne fotografija događaja — alt i potpis to kažu;
 *   • u slici nema teksta (ime deska stoji u HTML-u, ne u rasteru);
 *   • ista familija za sve: noćna redakcija u paleti AKTUAL MEDIA;
 *   • veličine su fiksne i zapisane u manifestu, da ih CSS može rezervirati.
 *
 * Izlaz (apps/portal/assets/desk/art/):
 *   <id>-240.webp    240×160    minijatura u popisu osvrta
 *   <id>-440.webp    440×248    kartica
 *   <id>-640.webp    640×360    naslovna kartica na /izdanja/
 *   <id>-800.webp    800×450    srcset
 *   <id>-1200.webp  1200×675    hero na stranici deska
 *   <id>-1600.webp  1600×900    široki zaslon
 *   <id>-og.jpg     1200×630    Open Graph / Twitter
 *
 * Pokretanje:
 *   node scripts/build-desk-art-v1.mjs            # sve
 *   node scripts/build-desk-art-v1.mjs --only politika
 *   node scripts/build-desk-art-v1.mjs --check    # samo provjeri manifest
 *
 * Zahtijeva ImageMagick 6 (`convert`).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DESK_ART as META } from '../apps/region/engine/desk-art.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SRC = join(ROOT, 'assets', 'desk', 'src');
const OUT = join(ROOT, 'apps', 'portal', 'assets', 'desk', 'art');
const MANIFEST = join(ROOT, 'apps', 'portal', 'data', 'desk-art-v1.json');

const arg = (name, fallback = '') => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
};
const ONLY = arg('--only', '');
const CHECK = process.argv.includes('--check');

const SIZES = [
  ['240', 240, 160],
  ['440', 440, 248],
  ['640', 640, 360],
  ['800', 800, 450],
  ['1200', 1200, 675],
  ['1600', 1600, 900]
];

const dims = (file) => {
  const [w, h] = execFileSync('identify', ['-format', '%w %h', file], { encoding: 'utf8' }).trim().split(' ').map(Number);
  return { w, h };
};

const run = (args) => execFileSync('convert', args, { stdio: 'pipe' });

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const sources = readdirSync(SRC)
  .filter((file) => /\.(png|jpe?g|webp)$/i.test(file))
  .map((file) => basename(file).replace(/\.[^.]+$/, ''))
  .filter((id) => !ONLY || id === ONLY)
  .sort();

if (!sources.length) {
  console.error('[desk-art] nema izvora u assets/desk/src/');
  process.exit(1);
}

const manifest = {
  version: 'AKTUAL_MEDIA_DESK_ART_V1_20261023',
  generatedBy: 'scripts/build-desk-art-v1.mjs',
  source: 'assets/desk/src/<id>.png (16:9)',
  kind: 'illustration',
  note: {
    hr: 'Naslovne grafike deskova su generirane ilustracije, ne fotografije događaja. U slici nema teksta; ime deska nosi HTML i alt atribut.',
    en: 'Desk cover art are generated illustrations, not photographs of events. No text is baked into the image; the desk name lives in HTML and alt text.'
  },
  sizes: Object.fromEntries(SIZES.map(([name, w, h]) => [name, { w, h }])),
  images: []
};

for (const id of sources) {
  const meta = META[id];
  if (!meta) {
    console.error(`[desk-art] ${id}: nema alt teksta u META — alt se ne izmišlja`);
    process.exit(1);
  }
  const source = readdirSync(SRC).find((file) => basename(file).replace(/\.[^.]+$/, '') === id && /\.(png|jpe?g|webp)$/i.test(file));
  const file = join(SRC, source);
  const { w: sourceW, h: sourceH } = dims(file);
  if (sourceW < 1200 || sourceH < 675) {
    console.error(`[desk-art] ${id}: izvor ${sourceW}×${sourceH} je manji od 1200×675`);
    process.exit(1);
  }

  if (!CHECK) {
    for (const [name, w, h] of SIZES) {
      run([file, '-resize', `${w}x${h}^`, '-gravity', 'center', '-extent', `${w}x${h}`,
        '-quality', name === '240' ? '80' : '84', '-strip', join(OUT, `${id}-${name}.webp`)]);
    }
    run([file, '-resize', '1200x630^', '-gravity', 'center', '-extent', '1200x630',
      '-quality', '86', '-strip', join(OUT, `${id}-og.jpg`)]);
    console.log(`[desk-art] ${id} → 240/440/640/800/1200/1600 + og.jpg`);
  }

  const hero = join(OUT, `${id}-1200.webp`);
  const card = join(OUT, `${id}-640.webp`);
  for (const required of [hero, card, join(OUT, `${id}-og.jpg`), join(OUT, `${id}-240.webp`)]) {
    if (!existsSync(required)) {
      console.error(`[desk-art] nedostaje ${required} — pokreni bez --check`);
      process.exit(1);
    }
  }
  manifest.images.push({
    id,
    title: meta.title,
    alt: meta.alt,
    note: {
      hr: 'Generirana ilustracija, ne fotografija događaja.',
      en: 'Generated illustration, not a photograph of events.'
    },
    hero: `/assets/desk/art/${id}-1200.webp`,
    card: `/assets/desk/art/${id}-640.webp`,
    thumb: `/assets/desk/art/${id}-240.webp`,
    og: `/assets/desk/art/${id}-og.jpg`,
    width: 1200,
    height: 675,
    bytes: statSync(hero).size
  });
}

/* `--only` ne smije obrisati ostale grafike iz manifesta: učitaj postojeći
   popis i zamijeni samo traženi desk. Inače bi jedan popravak slike tiho
   uklonio osam zapisa i test bi pao tek na sljedećem build-u. */
if (ONLY) {
  const merged = new Map();
  if (existsSync(MANIFEST)) {
    for (const image of (JSON.parse(readFileSync(MANIFEST, 'utf8')).images || [])) merged.set(image.id, image);
  }
  for (const image of manifest.images) merged.set(image.id, image);
  manifest.images = Object.keys(META).map((id) => merged.get(id)).filter(Boolean);
}

const payload = JSON.stringify(manifest, null, 2) + '\n';
if (CHECK) {
  const current = existsSync(MANIFEST) ? readFileSync(MANIFEST, 'utf8') : '';
  if (current !== payload) {
    console.error('[desk-art] manifest nije osvježen — pokreni bez --check');
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, images: manifest.images.length, version: manifest.version }, null, 2));
} else {
  writeFileSync(MANIFEST, payload);
  console.log(`[desk-art] gotovo · ${manifest.images.length} grafika · ${MANIFEST.replace(ROOT + '/', '')}`);
}
