#!/usr/bin/env node
/**
 * STROJNI ZAPIS RAZMJENE MORA BITI ISTI NA SVAKOM WEBU.
 *
 * `exchange.json` je ono što drugi webovi i agenti čitaju da bi znali što je
 * ovaj web objavio. Ako se oblik razlikuje po webu, uvoz pukne tiho — netko
 * dobije prazan popis i ne zna zašto.
 *
 * Ugovor (v1), kakav piše `writeExchangeJson` u
 * `apps/satellites/lib/razmjena-v1.mjs`:
 *
 *   {
 *     version: 1,
 *     generated: "YYYY-MM-DD",
 *     note: "...",
 *     items: [{ edition, home, url, title, lang, published }]
 *   }
 *
 * Test provjerava svaki zapis u mreži: verziju, datum, najmanje jednu stavku,
 * obavezna polja, HTTPS adrese, ISO datum i jezik. Dopunski `publisher` i
 * `source` nisu obavezni, ali ako postoje moraju biti ispravni.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?(\.\d+)?Z?)?$/;
const LANG = /^[a-z]{2,3}$/;

const files = [];
const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name === 'exchange.json') out.push(full);
  }
  return out;
};
for (const base of ['apps/portal/kanal', 'apps/world/site', 'apps/sites/site', 'apps/arhiva/site', 'apps/dnevnik/site', 'apps/kanal/site']) {
  walk(join(ROOT, base), files);
}

let items = 0;
for (const file of files) {
  const rel = file.slice(ROOT.length + 1);
  let data;
  try { data = JSON.parse(readFileSync(file, 'utf8')); } catch (error) { fails.push(`${rel}: ne parsira se (${error.message})`); continue; }

  check(data.version === 1, `${rel}: version mora biti 1 (${data.version})`);
  check(ISO_DATE.test(String(data.generated || '')), `${rel}: generated nije datum (${data.generated})`);
  check(typeof data.note === 'string' && data.note.length > 10, `${rel}: nema note`);
  check(Array.isArray(data.items), `${rel}: items nije polje`);
  if (!Array.isArray(data.items)) continue;
  check(data.items.length >= 1, `${rel}: nema nijedne stavke`);
  items += data.items.length;

  for (const [index, item] of data.items.entries()) {
    const where = `${rel}#${index}`;
    for (const field of ['edition', 'home', 'url', 'title']) {
      check(Boolean(item[field]), `${where}: nema ${field}`);
    }
    for (const field of ['home', 'url']) {
      if (item[field]) check(/^https:\/\//.test(String(item[field])), `${where}: ${field} nije HTTPS (${String(item[field]).slice(0, 50)})`);
    }
    if (item.published) check(ISO_DATE.test(String(item.published)), `${where}: published nije ISO 8601 (${item.published})`);
    if (item.lang) check(LANG.test(String(item.lang)), `${where}: lang nije oznaka jezika (${item.lang})`);
    check(String(item.title).length >= 8, `${where}: naslov je prekratak`);
  }

  if (data.publisher) {
    check(Boolean(data.publisher.name), `${rel}: publisher bez imena`);
    check(data.publisher.name === 'AKTUAL MEDIA d.o.o.', `${rel}: publisher nije AKTUAL MEDIA d.o.o. (${data.publisher.name})`);
  }
  if (data.source) check(/^https:\/\//.test(String(data.source.url || '')), `${rel}: source.url nije HTTPS`);
}

if (!files.length) fails.push('nijedan exchange.json nije pronađen');

const report = {
  version: 'AKTUAL_MEDIA_EXCHANGE_SCHEMA_V1',
  contract: 'exchange.json v1',
  files: files.length,
  items,
  failures: fails.length,
  ok: fails.length === 0
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) {
  console.error(fails.slice(0, 15).join('\n'));
  if (fails.length > 15) console.error(`… i još ${fails.length - 15}`);
  process.exit(1);
}
