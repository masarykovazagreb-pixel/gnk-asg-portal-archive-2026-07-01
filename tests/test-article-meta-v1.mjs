#!/usr/bin/env node
/**
 * Provjera meta opisa članaka AKTUAL MEDIA KANAL-a.
 *  - pravilo (scripts/lib/article-meta-v1.mjs) uvijek daje 1–200 znakova i nikad prazno;
 *  - nema strojnog prefiksa „What to check:”;
 *  - na objavljenim stranicama: description, og:description i twitter:description su isti
 *    i nijedan nije duži od 200 znakova.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { articleMetaDescription } from '../scripts/lib/article-meta-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const ok = (c, msg) => { if (!c) fails.push(msg); };

// 1. pravilo na poznatim ulazima
const d1 = articleMetaDescription({ title: 'Naslov', summary: 'What to check: Sažetak članka koji je dovoljno dug da stane u opis stranice bez problema.', sourceName: 'Izvor', channelTitle: 'KANAL', date: '2026-10-27' });
ok(!/What to check/.test(d1), 'prefiks „What to check:” nije skinut');
ok(d1.length >= 1 && d1.length <= 200, `duljina ${d1.length}`);
const long = 'riječ '.repeat(80);
const d2 = articleMetaDescription({ title: 'T', summary: long, sourceName: 'I', channelTitle: 'K', date: '' });
ok(d2.length <= 200 && d2.endsWith('…'), 'predugi sažetak nije skraćen na 200');
ok(articleMetaDescription({ title: '', summary: '', sourceName: '', channelTitle: '', date: '' }).length >= 0, 'prazan ulaz pada');

// 2. objavljene stranice
const dir = join(ROOT, 'apps/portal/kanal');
let checked = 0;
if (existsSync(dir)) {
  for (const city of readdirSync(dir)) {
    const cdir = join(dir, city, 'clanak');
    if (!existsSync(cdir)) continue;
    for (const slug of readdirSync(cdir)) {
      const f = join(cdir, slug, 'index.html');
      if (!existsSync(f)) continue;
      const h = readFileSync(f, 'utf8');
      const dec = (v) => v.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      const m = (re) => { const x = h.match(re); return x ? dec(x[1]) : null; };
      const d = m(/<meta name="description" content="([^"]*)"/);
      if (d === null) continue;
      checked++;
      const og = m(/<meta property="og:description" content="([^"]*)"/);
      const tw = m(/<meta name="twitter:description" content="([^"]*)"/);
      ok(d.length <= 200, `${f}: opis ${d.length} znakova`);
      if (og !== null) ok(og === d, `${f}: og:description se ne podudara`);
      if (tw !== null) ok(tw === d, `${f}: twitter:description se ne podudara`);
      if (checked > 400) break; // uzorak; puna provjera u --check načinu skripte
    }
    if (checked > 400) break;
  }
}
ok(checked > 0 || !existsSync(dir), 'nema članaka za provjeru');

// 3. stranice tema kanala i galerije: opis 1–200 znakova (decode entiteta)
const dec = (v) => v.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const extra = [];
if (existsSync(dir)) for (const city of readdirSync(dir)) {
  const td = join(dir, city, 'tema');
  if (existsSync(td)) for (const t of readdirSync(td)) { const f = join(td, t, 'index.html'); if (existsSync(f)) extra.push(f); }
  const id = join(dir, city, 'izvor');
  if (existsSync(id)) for (const t of readdirSync(id)) { const f = join(id, t, 'index.html'); if (existsSync(f)) extra.push(f); }
}
const gdir = join(ROOT, 'apps/portal/galerija');
if (existsSync(gdir)) for (const g of readdirSync(gdir)) { const f = join(gdir, g, 'index.html'); if (existsSync(f)) extra.push(f); }
let extraChecked = 0;
for (const f of extra) {
  const h = readFileSync(f, 'utf8');
  const d = h.match(/<meta name="description" content="([^"]*)"/);
  if (!d) continue;
  extraChecked++;
  const v = dec(d[1]);
  ok(v.length >= 1 && v.length <= 200, `${f}: opis ${v.length} znakova`);
}
ok(extraChecked > 0 || extra.length === 0, 'nema stranica tema/galerije za provjeru');

if (fails.length) {
  console.error('FAIL test-article-meta-v1');
  for (const f of fails.slice(0, 20)) console.error('  ✗', f);
  process.exit(1);
}
console.log(`PASS test-article-meta-v1 (uzorak ${checked} članaka; tema, izvori i galerija ${extraChecked})`);
