#!/usr/bin/env node
/**
 * NASLOVNE ILUSTRACIJE DESKOVA — ugovor između slika i stranica.
 *
 * Zašto test: kartice deskova su prije ovoga bile plohe u boji, a stranica
 * deska nije imala nijednu veliku sliku. Kad se slika ne učitava, stranica
 * izgleda kao da je prazna — a to se ne vidi u HTML-u ako nitko ne provjeri
 * da datoteka postoji, da ima alt i da je ista slika na svim ulazima.
 *
 * Provjere:
 *   1. manifest (`data/desk-art-v1.json`) ima svih devet deskova i sve veličine;
 *   2. svaka datoteka postoji, ima WebP/JPG potpis i razumnu veličinu;
 *   3. alt je opisan, na hrvatskom i engleskom, bez „undefined";
 *   4. hero na /izdanja/<desk>/ koristi 1200, ima preload i OG sliku;
 *   5. kartica na /izdanja/ i pločica na /gnk-aktual/ koriste istu ilustraciju;
 *   6. mreža na dnu stranice ima sličicu za svaki desk i svaki grad.
 *
 * Test ne piše ništa i ne pristupa mreži.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(read(rel));

const failures = [];
const fail = (message) => failures.push(message);

const MANIFEST_REL = 'apps/portal/data/desk-art-v1.json';
if (!existsSync(join(ROOT, MANIFEST_REL))) {
  console.error(JSON.stringify({ ok: false, failures: [`${MANIFEST_REL}: nedostaje — pokreni node scripts/build-desk-art-v1.mjs`] }, null, 2));
  process.exit(1);
}
const manifest = readJson(MANIFEST_REL);
const images = manifest.images || [];
const DESKS = ['sport', 'politika', 'biznis', 'tehnologija', 'putovanja', 'ljubimci', 'svijet', 'moda', 'sigurnost'];

if (images.length !== DESKS.length) fail(`manifest: ${images.length} grafika, očekivano ${DESKS.length}`);
for (const id of DESKS) if (!images.some((image) => image.id === id)) fail(`manifest: nema grafike za ${id}`);

const SIZES = { 240: [240, 160], 440: [440, 248], 640: [640, 360], 800: [800, 450], 1200: [1200, 675], 1600: [1600, 900] };

for (const image of images) {
  const { id } = image;
  if (!DESKS.includes(id)) fail(`manifest: nepoznat desk ${id}`);
  for (const lang of ['hr', 'en']) {
    const alt = image.alt && image.alt[lang];
    if (!alt) fail(`${id}: nema alt na ${lang}`);
    else {
      if (alt.length < 40 || alt.length > 220) fail(`${id}: alt (${lang}) ima ${alt.length} znakova, traži se 40–220`);
      if (/undefined|null/i.test(alt)) fail(`${id}: alt (${lang}) sadrži "undefined"`);
      if (!/(ilustracija|illustration)/i.test(alt)) fail(`${id}: alt (${lang}) ne kaže da je ilustracija`);
    }
    if (!image.title || !image.title[lang]) fail(`${id}: nema naslov grafike na ${lang}`);
  }

  const files = Object.keys(SIZES).map((size) => [`apps/portal${image.hero.replace(/-\d+\.webp$/, `-${size}.webp`)}`, size]);
  files.push([`apps/portal${image.og}`, 'og']);
  for (const [rel, size] of files) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) { fail(`${id}: nedostaje ${rel}`); continue; }
    const bytes = statSync(abs).size;
    if (bytes < 2500) fail(`${id}: ${rel} ima samo ${bytes} B`);
    const head = readFileSync(abs).subarray(0, 12);
    if (size === 'og') {
      if (head[0] !== 0xff || head[1] !== 0xd8) fail(`${id}: ${rel} nije JPEG`);
      continue;
    }
    if (head.subarray(0, 4).toString('ascii') !== 'RIFF' || head.subarray(8, 12).toString('ascii') !== 'WEBP') fail(`${id}: ${rel} nije WebP`);
  }

  /* WebP dimenzije: VP8L (lossless), VP8 (lossy) ili VP8X. */
  const dims = (rel) => {
    const buffer = readFileSync(join(ROOT, rel));
    const chunk = buffer.subarray(12, 16).toString('ascii');
    if (chunk === 'VP8X') return [1 + buffer.readUIntLE(24, 3), 1 + buffer.readUIntLE(27, 3)];
    if (chunk === 'VP8L') {
      const bits = buffer.readUInt32LE(21);
      return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
    }
    if (chunk === 'VP8 ') return [buffer.readUInt16LE(26) & 0x3fff, buffer.readUInt16LE(28) & 0x3fff];
    return [0, 0];
  };
  for (const [size, [w, h]] of Object.entries(SIZES)) {
    const rel = `apps/portal${image.hero.replace(/-\d+\.webp$/, `-${size}.webp`)}`;
    if (!existsSync(join(ROOT, rel))) continue;
    const [fileW, fileH] = dims(rel);
    if (fileW !== w || fileH !== h) fail(`${id}: ${rel} ima ${fileW}×${fileH}, očekivano ${w}×${h}`);
  }
}

/* ---------- stranice ---------- */

for (const image of images) {
  const { id } = image;
  const pageRel = `apps/portal/izdanja/${id}/index.html`;
  if (!existsSync(join(ROOT, pageRel))) { fail(`${pageRel}: nedostaje`); continue; }
  const html = read(pageRel);
  if (!html.includes(`<figure class="iz-hero">`)) fail(`${id}: stranica nema hero ilustraciju`);
  if (!html.includes(`src="/assets/desk/art/${id}-1200.webp"`)) fail(`${id}: hero ne koristi 1200`);
  if (!html.includes(`imagesrcset="/assets/desk/art/${id}-640.webp 640w`)) fail(`${id}: hero nema preload srcset`);
  if (!html.includes(`fetchpriority="high"`)) fail(`${id}: hero nema fetchpriority`);
  if (!html.includes(`content="https://gnk-asg.hr/assets/desk/art/${id}-og.jpg"`)) fail(`${id}: OG slika nije grafika deska`);
  if (!html.includes('Generirana grafika, nije fotografija događaja')) fail(`${id}: hero ne kaže da je ilustracija`);
  const heroAlt = (html.match(/<figure class="iz-hero">[\s\S]*?<img src="[^"]+" alt="([^"]+)"/) || [])[1] || '';
  if (heroAlt.length < 40) fail(`${id}: hero alt je prekratak (${heroAlt.length})`);
  if (!html.includes(`width="1200" height="675"`)) fail(`${id}: hero nema rezervirane dimenzije`);
  if (!/\.iz-hero img\{[^}]*aspect-ratio:16\/9/.test(html)) fail(`${id}: CSS ne rezervira 16:9 za hero`);
}

const indexRel = 'apps/portal/izdanja/index.html';
const index = read(indexRel);
for (const image of images) {
  if (!index.includes(`src="/assets/desk/art/${image.id}-640.webp"`)) fail(`${indexRel}: kartica ${image.id} nema ilustraciju 640`);
  if (index.includes(`/assets/izdanja/${image.id}-tile.webp`)) fail(`${indexRel}: kartica ${image.id} još koristi staru plohu`);
}

const centralRel = 'apps/portal/gnk-aktual/index.html';
if (existsSync(join(ROOT, centralRel))) {
  const central = read(centralRel);
  for (const image of images) {
    if (!central.includes(`src="/assets/desk/art/${image.id}-800.webp"`)) fail(`${centralRel}: pločica ${image.id} nema ilustraciju`);
  }
}

const networkRel = 'apps/portal/izdanja/politika/index.html';
const network = read(networkRel);
for (const image of images) {
  if (!network.includes(`src="/assets/desk/art/${image.id}-240.webp"`)) fail(`${networkRel}: mreža nema sličicu za ${image.id}`);
}
for (const channel of readJson('apps/region/channels.json').channels) {
  if (!network.includes(`src="/assets/izdanja/${channel.id}-240.webp"`)) fail(`${networkRel}: mreža nema sličicu za ${channel.id}`);
}
for (let variant = 1; variant <= 6; variant += 1) {
  if (!network.includes(`.iz-thumb-p${variant}{`)) fail(`${networkRel}: nema CSS kropa .iz-thumb-p${variant}`);
}

const result = {
  ok: failures.length === 0,
  version: 'GNK_ASG_DESK_ART_V1_20261023',
  illustrations: images.length,
  sizes: Object.keys(SIZES).length + 1,
  desks: DESKS.length,
  failures
};
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
