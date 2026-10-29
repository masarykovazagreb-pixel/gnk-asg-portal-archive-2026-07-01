#!/usr/bin/env node
/**
 * META OPIS STRANICA TEMA KANAL-a (apps/portal/kanal/<grad>/tema/<tema>/).
 *
 * Stari opis je bio samo broj osvrta („6 osvrta u izdanju …”, ~45 znakova).
 * Novi: „<naziv teme>: <postojeći opis>. <najnoviji naslov>”, najviše 200 znakova.
 * Sve dolazi iz same stranice (naziv, broj, najnoviji naslov), ništa se ne izmišlja.
 *
 *   node scripts/strengthen-theme-meta-v1.mjs --check
 *   node scripts/strengthen-theme-meta-v1.mjs --write
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clip } from './lib/article-meta-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KANAL = join(ROOT, 'apps/portal/kanal');
const WRITE = process.argv.includes('--write');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dec = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const strip = (s) => dec(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function themePages() {
  const out = [];
  if (!existsSync(KANAL)) return out;
  for (const city of readdirSync(KANAL)) {
    const dir = join(KANAL, city, 'tema');
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    for (const t of readdirSync(dir)) {
      const f = join(dir, t, 'index.html');
      if (existsSync(f)) out.push(f);
    }
  }
  return out;
}

let changed = 0, short = 0, long = 0, skipped = 0;
const after = new Map();
const plan = [];
for (const f of themePages()) {
  const html = readFileSync(f, 'utf8');
  const d = html.match(/<meta name="description" content="([^"]*)"/);
  const h1 = html.match(/<h1>([^<]*)<\/h1>/);
  const headline = html.match(/<ul class="list big"><li>.*?<a [^>]*>(.*?)<\/a>/s);
  if (!d || !h1) { skipped++; continue; }
  const themeName = strip(h1[1]).split(' — ')[0];
  const base = dec(d[1]).replace(/^[^:]*: /, ''); // već dodan naziv teme ostaje van zagrade
  const head = headline ? strip(headline[1]) : '';
  let next = clip(head ? `${themeName}: ${base}. ${head}` : `${themeName}: ${base}`, 200);
  // kratko zbog kratkog naslova ili praznog popisa ostaje istinito; ne izmišljamo
  plan.push({ f, html, next, old: dec(d[1]) });
  after.set(next, (after.get(next) || 0) + 1);
}
for (const p of plan) {
  if (p.next.length < 80) short++;
  if (p.next.length > 200) long++;
  if (p.next !== p.old) changed++;
}
const dup = [...after.values()].filter((v) => v > 1).reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ pages: plan.length, changed, short, long, dupAfter: dup, skipped }, null, 2));
if (!WRITE) { console.log('(--check: ništa nije upisano)'); process.exit(0); }

let written = 0;
for (const p of plan) {
  const enc = esc(p.next);
  let html = p.html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${enc}$2`);
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${enc}$2`);
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${enc}$2`);
  if (html !== p.html) { writeFileSync(p.f, html); written++; }
}
console.log(`upisano: ${written}`);
