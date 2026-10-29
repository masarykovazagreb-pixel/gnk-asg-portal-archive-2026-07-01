#!/usr/bin/env node
/**
 * META OPISI JAVNIH STRANICA: izvori KANAL-a i predugi opisi.
 *
 *  - apps/portal/kanal/<grad>/izvor/<izvor>/index.html: opis je bio samo
 *    „Osvrti na tekstove izvora X u izdanju Y.” (~70 znakova). Novi:
 *    „<naziv izvora>: <postojeći opis> <najnoviji naslov>”, najviše 200 znakova.
 *  - predugi opisi (> 200 znakova) na naslovnicama kanala, glavnim gradovima,
 *    izdanjima i engleskim stranicama: skraćuju se na granici riječi.
 *
 * Mijenja se samo meta description, og:description i twitter:description.
 *
 *   node scripts/strengthen-page-meta-v1.mjs --check
 *   node scripts/strengthen-page-meta-v1.mjs --write
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clip } from './lib/article-meta-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = (...x) => join(ROOT, 'apps/portal', ...x);
const WRITE = process.argv.includes('--write');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dec = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const strip = (s) => dec(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const dirs = (base) => (existsSync(base) && statSync(base).isDirectory() ? readdirSync(base).map((x) => join(base, x)) : []);

function walk(dir, name, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, name, out);
    else if (e === name) out.push(p);
  }
  return out;
}

const targets = [];
// izvori: kanal/<grad>/izvor/<izvor>/index.html
for (const city of dirs(P('kanal'))) for (const src of dirs(join(city, 'izvor'))) {
  const f = join(src, 'index.html'); if (existsSync(f)) targets.push({ f, kind: 'izvor' });
}
// predugi opisi: naslovnice kanala, glavni gradovi, izdanja, engleske stranice
for (const city of dirs(P('kanal'))) { const f = join(city, 'index.html'); if (existsSync(f)) targets.push({ f, kind: 'clip' }); }
for (const f of [P('glavni-gradovi/index.html'), P('izdanja/index.html')]) if (existsSync(f)) targets.push({ f, kind: 'clip' });
for (const f of walk(P('en'), 'index.html')) targets.push({ f, kind: 'clip' });

const plan = [];
for (const { f, kind } of targets) {
  const html = readFileSync(f, 'utf8');
  const d = html.match(/<meta name="description" content="([^"]*)"/);
  if (!d) continue;
  const old = dec(d[1]);
  let next = old;
  if (kind === 'izvor') {
    const h1 = html.match(/<h1>([^<]*)<\/h1>/);
    const head = html.match(/<ul class="list big"><li>.*?<a [^>]*>(.*?)<\/a>/s);
    if (!h1) continue;
    const name = strip(h1[1]).split(' — ')[0];
    const latest = head ? strip(head[1]) : '';
    next = clip(latest ? `${name}: ${old} ${latest}` : `${name}: ${old}`, 200);
  } else if (old.length > 200) {
    next = clip(old, 200);
  }
  if (next !== old) plan.push({ f, html, next, old, kind });
}

const stats = { candidates: targets.length, changed: plan.length, izvor: plan.filter((p) => p.kind === 'izvor').length, clip: plan.filter((p) => p.kind === 'clip').length, nowShort: plan.filter((p) => p.next.length < 80).length, nowLong: plan.filter((p) => p.next.length > 200).length };
console.log(JSON.stringify(stats, null, 2));
if (!WRITE) { console.log('(--check: ništa nije upisano)'); process.exit(0); }

let written = 0;
for (const p of plan) {
  const enc = esc(p.next);
  let h = p.html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${enc}$2`);
  h = h.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${enc}$2`);
  h = h.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${enc}$2`);
  if (h !== p.html) { writeFileSync(p.f, h); written++; }
}
console.log(`upisano: ${written}`);
