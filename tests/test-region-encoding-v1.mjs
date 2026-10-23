#!/usr/bin/env node
/**
 * KODIRANJE IZVORA — jedna greška koja tiho pokvari cijelo izdanje.
 *
 * São Paulo je stizao s feedova u ISO-8859-1, a `res.text()` dekodira UTF-8.
 * Rezultat: „Minist�rio da Justi�a" u naslovu, sažetku, feedu i svakoj
 * generiranoj stranici. Nitko to ne prijavi — stranica se i dalje objavi.
 *
 * Test čuva četiri stvari:
 *   1. dekodiranje: deklarirani latin-1 mora vratiti „Ministério";
 *   2. prednost: valjani UTF-8 se ne dvostruko dekodira ni kad zaglavlje laže;
 *   3. podaci: nijedan zapis izdanja ne nosi U+FFFD;
 *   4. objavljeni izlaz: nijedna stranica, feed ni sitemap ne nosi U+FFFD.
 *
 * Pokretanje:
 *   node tests/test-region-encoding-v1.mjs
 *   node tests/test-region-encoding-v1.mjs --data-only    samo podaci, bez izlaza
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeBody, isCorrupt } from '../apps/region/engine/lib.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'apps', 'region', 'data');
const OUTPUTS = [
  join(ROOT, 'apps', 'portal', 'kanal'),
  join(ROOT, 'apps', 'world', 'site')
];
const DATA_ONLY = process.argv.includes('--data-only');

const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };
const fakeRes = (contentType = '') => ({ headers: { get: () => contentType } });

/* ---------- 1. Dekodiranje ---------- */

const latin1 = Buffer.from('<?xml version="1.0" encoding="ISO-8859-1"?><title>Ministério da Justiça</title>', 'latin1');
const decodedLatin = decodeBody(latin1, fakeRes('application/xml; charset=iso-8859-1'));
check(decodedLatin.includes('Ministério da Justiça'), `latin-1 nije dekodiran: ${decodedLatin.slice(0, 70)}`);
check(!isCorrupt(decodedLatin), 'latin-1 dekodiranje ostavlja U+FFFD');

/* Valjani UTF-8 ima prednost čak i kad zaglavlje tvrdi latin-1 — čest slučaj
   kod feedova koji nisu ažurirali zaglavlje nakon prelaska na UTF-8. */
const utf8 = Buffer.from('<title>Ministério da Justiça — São Paulo</title>', 'utf8');
const decodedUtf8 = decodeBody(utf8, fakeRes('application/xml; charset=iso-8859-1'));
check(decodedUtf8.includes('Ministério da Justiça — São Paulo'), 'UTF-8 nije prepoznat');
check(!decodedUtf8.includes('Ã'), 'UTF-8 je dvostruko dekodiran');

/* Charset iz XML deklaracije kad zaglavlje ne kaže ništa. */
const fromXml = decodeBody(Buffer.from('<?xml version="1.0" encoding="windows-1252"?><t>café São</t>', 'latin1'), fakeRes('application/xml'));
check(fromXml.includes('café São'), `windows-1252 iz XML-a nije dekodiran: ${fromXml}`);

/* Charset iz <meta charset> kad nema ni zaglavlja ni XML deklaracije. */
const fromMeta = decodeBody(Buffer.from('<meta charset="iso-8859-1"><p>informações</p>', 'latin1'), fakeRes('text/html'));
check(fromMeta.includes('informações'), `charset iz meta nije dekodiran: ${fromMeta}`);

/* ---------- 2. Podaci izdanja ---------- */

const looksCorrupt = (item) => isCorrupt(
  [item?.title, item?.summary, item?.author, item?.imageAlt, ...(item?.categories || [])].join(' ')
);
let records = 0;
let dataFiles = 0;
for (const name of readdirSync(DATA).filter((file) => file.endsWith('.json') && !file.startsWith('_'))) {
  let data;
  try { data = JSON.parse(readFileSync(join(DATA, name), 'utf8')); } catch { continue; }
  if (!Array.isArray(data.items)) continue;
  dataFiles += 1;
  for (const item of data.items) {
    records += 1;
    check(!looksCorrupt(item), `${name}: zapis ${item.slug || '(bez sluga)'} sadrži U+FFFD`);
  }
}

/* ---------- 3. Objavljeni izlaz ---------- */

const TEXT = new Set(['.html', '.xml', '.json', '.txt', '.webmanifest']);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (TEXT.has(extname(name))) out.push(full);
  }
  return out;
}

let published = 0;
if (!DATA_ONLY) {
  for (const dir of OUTPUTS) {
    for (const file of walk(dir)) {
      const text = readFileSync(file, 'utf8');
      if (!isCorrupt(text)) { published += 1; continue; }
      const count = text.split('\uFFFD').length - 1;
      fails.push(`${file.slice(ROOT.length + 1)}: ${count} znakova U+FFFD u objavljenom izlazu`);
    }
  }
}

/* ---------- 4. Ugovor čitača ---------- */

/* Svaki engine koji čita feed ili stranicu mora dekodirati sam. `res.text()`
   pretpostavlja UTF-8 i to je upravo greška koja je pokvarila São Paulo. */
for (const dir of ['apps/region/engine', 'apps/sites/engine', 'apps/tjednik/engine']) {
  const full = join(ROOT, dir);
  if (!existsSync(full)) continue;
  for (const name of readdirSync(full).filter((file) => file.endsWith('.mjs'))) {
    const source = readFileSync(join(full, name), 'utf8');
    if (!/await\s+(?:res|response|r)\.text\(\)/.test(source)) continue;
    if (source.includes('decodeBody')) continue;
    fails.push(`${dir}/${name}: čita .text() bez decodeBody — charset se gubi`);
  }
}

const report = {
  ok: fails.length === 0,
  version: 'GNK_ASG_REGION_ENCODING_V1_20261023',
  dataFiles,
  records,
  publishedFiles: published,
  failures: fails.slice(0, 25)
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) process.exit(1);
