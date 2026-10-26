#!/usr/bin/env node
/**
 * SVAKA PRENESENA KOPIJA NOSI IZVOR.
 *
 * Prenošenje je dopušteno samo s atribucijom: izvor, autor, datum i veza na
 * izvornik. Bez toga kopija izgleda kao vlastiti tekst — a to je upravo ono
 * što mreža ne smije raditi (klijent je izričito tražio da se vijesti šire
 * "kao virus, ne doslovno").
 *
 * Test gleda svaku stranicu u `/prenos/` i `/kolumna/` na samostalnim webovima
 * te provjerava da nosi:
 *   • blok atribucije (klasa `am-attr`, `attribution`, `src` ili `izvor`),
 *   • vezu na izvornik (`rel="canonical"` ili `Izvor`/`Source` link),
 *   • ime autora (Nermin Sefić) ili napomenu da je tekst automatski sastavljen.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };

const ATTR = /class="[^"]*(?:am-attr|attribution|src|izvor|authorx)[^"]*"|Izvor:|Source:|Preuzeto s|Originally published/i;
const SOURCE_LINK = /rel="canonical"|class="[^"]*(?:source|izvor)[^"]*"[^>]*href="https?:|<a [^>]*href="https?:\/\/[^"]+"[^>]*>\s*(?:Izvor|Source|izvornik)/i;
const AUTHOR = /Nermin Sefi[cć]|automatski sastavljen|automatically assembled|AI[- ]assisted/i;

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
};

let pages = 0;
const streams = [];
for (const site of readdirSync(join(ROOT, 'apps/sites/site'))) {
  for (const stream of ['prenos', 'kolumna']) {
    const dir = join(ROOT, 'apps/sites/site', site, stream);
    if (!existsSync(dir)) continue;
    const files = walk(dir);
    streams.push({ site, stream, files: files.length });
    for (const file of files) {
      /* Popis (`/prenos/`, `/kolumna/`) nije preneseni tekst nego kazalo —
         atribucija se traži na svakoj pojedinačnoj stranici. */
      const depth = relative(join(ROOT, 'apps/sites/site', site), dirname(file)).split('/').filter(Boolean).length;
      if (depth <= 1) continue;
      pages += 1;
      const html = readFileSync(file, 'utf8');
      const rel = relative(ROOT, file);
      if (!ATTR.test(html)) fails.push(`${rel}: nema blok atribucije`);
      if (!SOURCE_LINK.test(html)) fails.push(`${rel}: nema vezu na izvornik`);
      if (!AUTHOR.test(html)) fails.push(`${rel}: nema autora ni napomene o automatskom sastavljanju`);
    }
  }
}

if (!pages) fails.push('nijedna prenesena stranica nije pronađena');

const report = {
  version: 'AKTUAL_MEDIA_ATTRIBUTION_V1',
  pages,
  streams: streams.length,
  failures: fails.length,
  ok: fails.length === 0
};
console.log(JSON.stringify(report, null, 2));
if (fails.length) {
  console.error(fails.slice(0, 12).join('\n'));
  if (fails.length > 12) console.error(`… i još ${fails.length - 12}`);
  process.exit(1);
}
