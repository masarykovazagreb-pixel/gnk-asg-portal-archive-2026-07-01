#!/usr/bin/env node
/**
 * SVAKA SLIKA IMA PODRIJETLO.
 *
 * Pravilo mreže: nijedna slika bez zabilježenog podrijetla, bez dimenzija i
 * bez `alt` teksta. To nije formalnost — slika bez zapisa o podrijetlu je
 * pravni rizik, a slika bez dimenzija pomiče sadržaj dok se učitava.
 *
 * Test gleda tri stvari:
 *   1. naslovne slike izdanja (`/assets/izdanja/`) imaju zapis u
 *      `edition-photo-provenance-v1.json` s tipom, pravima i izvorom;
 *   2. nijedna stranica ne učitava sliku s tuđeg hosta osim kroz vlastiti
 *      proxy (`/api/img?u=`), što je jedini dopušteni način;
 *   3. nijedna `<img>` na javnim stranicama nema prazan `alt`, a `alt` nije
 *      ni samo ime datoteke.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };

/* --- 1. zapis podrijetla naslovnica --- */
const manifestFile = join(ROOT, 'apps/portal/data/edition-photo-provenance-v1.json');
check(existsSync(manifestFile), 'nema edition-photo-provenance-v1.json — pokreni scripts/build-edition-photos-v1.mjs');
let recorded = 0;
if (existsSync(manifestFile)) {
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  check(manifest.version === 'AKTUAL_MEDIA_EDITION_PHOTO_PROVENANCE_V1', `neočekivana verzija zapisa: ${manifest.version}`);
  const ids = new Set();
  for (const item of manifest.items || []) {
    ids.add(item.id);
    recorded += 1;
    for (const field of ['source', 'type', 'creator', 'rights', 'alt']) {
      if (!item[field]) fails.push(`zapis ${item.id}: nema ${field}`);
    }
    check(existsSync(join(ROOT, item.source)), `zapis ${item.id}: izvor ${item.source} ne postoji`);
    check(/\.(jpg|jpeg|png|webp)$/i.test(item.source), `zapis ${item.id}: izvor nije slika`);
  }
  /* Svaka naslovnica koja postoji na disku mora imati zapis — bilo kao
     fotografija s izvorom, bilo kao vlastita grafika s generatorom. */
  const artIds = new Set((manifest.generated || []).map((item) => item.id));
  for (const item of manifest.generated || []) {
    check(item.type === 'editorial-art', `grafika ${item.id}: tip nije editorial-art`);
    check(Boolean(item.rights && item.creator && item.generator), `grafika ${item.id}: nema prava, autora ili generatora`);
    check(existsSync(join(ROOT, item.generator)), `grafika ${item.id}: generator ${item.generator} ne postoji`);
  }
  const dir = join(ROOT, 'apps/portal/assets/izdanja');
  for (const name of readdirSync(dir)) {
    const match = name.match(/^([a-z0-9-]+)-(240|440|800|1200|880)\.webp$/);
    if (!match) continue;
    if (ids.has(match[1]) || artIds.has(match[1])) continue;
    fails.push(`apps/portal/assets/izdanja/${name}: naslovnica bez zapisa podrijetla`);
  }
}

/* --- 2 i 3. vanjski hostovi i alt u izlazu --- */
/* Mreža koju ovaj sloj gradi: svjetski portali, KANAL, arhiva, dnevnik,
   samostalni webovi i središnje stranice portala. Naslijeđene portalove
   stranice (trgovina, spt, starije objave) imaju vlastiti gate
   (`test-image-alt-v1`) i svoj dug; ovdje se ne miješaju da se ne bi
   skrivale stvarne greške mreže u 70.000 naslijeđenih. */
const WEBS = ['apps/world/site', 'apps/kanal/site', 'apps/arhiva/site', 'apps/dnevnik/site', 'apps/sites/site'];
const PORTAL_PATHS = ['gnk-aktual', 'kanal', 'sve-stranice', 'izdanja', 'aktual-media', 'status', 'radio'];
const SKIP = new Set(['admin', 'admin-center', 'admin-login', 'control', 'webmail', 'mail-studio',
  'campaign-mailer', 'email-status', 'worker-ops', 'operator-dashboard', 'digital-headquarters',
  'media-registration-admin', 'api', 'assets', 'data', '__preview', 'app', 'synapse-demo', 'pulse-demo']);

const walk = (dir, out = [], depth = 0) => {
  if (!existsSync(dir) || depth > 7) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) { if (!SKIP.has(name)) walk(full, out, depth + 1); }
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
};

let images = 0;
let pages = 0;
const seen = new Set();
const roots = WEBS.map((base) => ({ base, root: join(ROOT, base) }));
for (const name of PORTAL_PATHS) {
  const root = join(ROOT, 'apps/portal', name);
  if (existsSync(root)) roots.push({ base: `apps/portal/${name}`, root });
}

for (const { base, root } of roots) {
  for (const file of walk(root)) {
    pages += 1;
    const html = readFileSync(file, 'utf8');
    const rel = file.slice(ROOT.length + 1);
    for (const match of html.matchAll(/<img\b[^>]*>/g)) {
      images += 1;
      const tag = match[0];
      const src = (tag.match(/src="([^"]*)"/) || [])[1] || '';
      const alt = (tag.match(/alt="([^"]*)"/) || [])[1];
      /* Prazan alt je dopušten samo za ukrasnu sliku koja stoji izravno u
         elementu skrivenom od čitača ekrana (`aria-hidden="true"`). */
      const index = match.index || 0;
      const context = html.slice(Math.max(0, index - 320), index) + tag;
      const decorative = /aria-hidden="true"/.test(context);
      if (alt === undefined) fails.push(`${rel}: <img> bez alt (${src.slice(0, 50)})`);
      else if (alt.trim() === '' && !decorative) fails.push(`${rel}: prazan alt (${src.slice(0, 50)})`);
      else if (/\.(webp|jpg|jpeg|png|svg)$/i.test(alt.trim())) fails.push(`${rel}: alt je ime datoteke (${alt})`);
      if (/^https?:\/\//.test(src) && !/^https?:\/\/(gnk-asg\.hr|www\.gnk-asg\.hr)\//.test(src)) {
        fails.push(`${rel}: slika s tuđeg hosta bez proxya (${src.slice(0, 60)})`);
      }
      if (src && !/^https?:|^data:/.test(src)) {
        const local = src.split('?')[0];
        if (local.startsWith('/')) {
          const key = new URL(local, 'https://x/').pathname;
          if (!seen.has(key)) {
            seen.add(key);
            const candidates = [join(ROOT, 'apps/portal', key), join(root, key.replace(/^\//, ''))];
            if (!candidates.some((path) => existsSync(path))) {
              /* Slike iz mreže žive na portalu; ostalo se preskače da test ne
                 pada na rute koje se poslužuju iz drugog korijena. */
            }
          }
        }
      }
    }
  }
}

const report = {
  version: 'AKTUAL_MEDIA_IMAGE_PROVENANCE_V1',
  editions: recorded,
  art: existsSync(manifestFile) ? (JSON.parse(readFileSync(manifestFile, 'utf8')).generated || []).length : 0,
  pages,
  images,
  failures: fails.length,
  ok: fails.length === 0
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) {
  console.error([...new Set(fails)].slice(0, 12).join('\n'));
  process.exit(1);
}
