#!/usr/bin/env node
/**
 * SLIKE — gate za alt, dimenzije i postojeće datoteke.
 *
 * Pravilo proizvoda: nijedna kartica, pločica ili krug nije bez slike, a
 * nijedna slika nije bez opisa. Ovaj test pada na tri stvari:
 *
 *   1. `<img>` bez `alt` ili s praznim `alt` (osim unutar <script> predloška,
 *      gdje nije riječ o stvarnom DOM-u);
 *   2. `<img>` bez `width` i `height` — bez njih se sadržaj pomiče dok se
 *      slika učitava (CLS);
 *   3. `src` koji pokazuje na datoteku koja ne postoji u repozitoriju.
 *
 * Test ne pristupa mreži. Ako padne, popravlja se generator ili sadržaj.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps', 'portal');
const DIRS = ['kanal', 'gnk-aktual', 'izdanja', 'glavni-gradovi', 'atlas', 'mreza', 'trgovina', 'spt', 'en'];
const fails = [];
let images = 0;

const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
};

const srcCache = new Map();
const srcExists = (src, file) => {
  if (srcCache.has(src)) return srcCache.get(src);
  let ok = true;
  if (/^(?:https?:)?\/\//.test(src) || src.startsWith('data:') || src.startsWith('/api/')) ok = true;
  else {
    const clean = src.split('?')[0].split('#')[0];
    ok = existsSync(clean.startsWith('/') ? join(PORTAL, clean) : resolve(dirname(file), clean));
  }
  srcCache.set(src, ok);
  return ok;
};

for (const dir of DIRS) {
  const root = join(PORTAL, dir);
  if (!existsSync(root)) continue;
  for (const file of walk(root)) {
    const html = readFileSync(file, 'utf8');
    const rel = file.slice(ROOT.length + 1);
    /* Predlošci u <script> blokovima nisu DOM; preskaču se. */
    const visible = html.replace(/<script[\s\S]*?<\/script>/g, '');
    for (const match of visible.matchAll(/<img\b[^>]*>/g)) {
      images += 1;
      const tag = match[0];
      const attr = (name) => (tag.match(new RegExp(`\\b${name}="([^"]*)"`)) || [])[1];
      const where = `${rel}: ${tag.slice(0, 90)}`;
      if (!/\balt=/.test(tag)) { fails.push(`${where} — nema alt`); continue; }
      if (!attr('alt').trim()) fails.push(`${where} — prazan alt`);
      if (!attr('width') || !attr('height')) fails.push(`${where} — nema width/height`);
      if (attr('src') && !srcExists(attr('src'), file)) fails.push(`${where} — datoteka ne postoji: ${attr('src')}`);
    }
  }
}

/* Nijedna novinska kartica i nijedna pločica na ulazu u AKTUAL MEDIA ne
   smije ostati bez slike. Provjera je namjerno tvrda: kartica bez slike je
   kartica koju čitatelj preskače. */
let cards = 0;
for (const file of [...walk(join(PORTAL, 'kanal')), join(PORTAL, 'gnk-aktual', 'index.html'), join(PORTAL, 'en', 'gnk-aktual', 'index.html')]) {
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  for (const match of html.matchAll(/<article class="card[^"]*">([\s\S]*?)<\/article>/g)) {
    cards += 1;
    if (!match[1].includes('<img')) fails.push(`${file.slice(ROOT.length + 1)} — kartica bez slike`);
  }
  for (const match of html.matchAll(/<li class="amc-tile[^"]*">([\s\S]*?)<\/li>/g)) {
    cards += 1;
    if (!match[1].includes('<img')) fails.push(`${file.slice(ROOT.length + 1)} — pločica bez slike`);
  }
}

if (fails.length) {
  console.error(`SLIKE — ${fails.length} problema (${images} slika provjereno):`);
  for (const fail of fails.slice(0, 40)) console.error(`  ✗ ${fail}`);
  if (fails.length > 40) console.error(`  … i još ${fails.length - 40}`);
  process.exit(1);
}
console.log(`SLIKE — OK: ${images} slika i ${cards} kartica/pločica, svaka s alt-om, dimenzijama i postojećom datotekom.`);
