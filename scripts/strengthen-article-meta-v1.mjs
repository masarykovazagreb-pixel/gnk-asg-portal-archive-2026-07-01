#!/usr/bin/env node
/**
 * JAČANJE META OPISA ČLANAKA AKTUAL MEDIA KANAL-a.
 *
 * Popravlja postojeće stranice apps/portal/kanal/<grad>/clanak/<slug>/index.html:
 * meta description, og:description i twitter:description dobivaju isti opis,
 * prema pravilu iz scripts/lib/article-meta-v1.mjs (80–200 znakova, bez
 * strojnog prefiksa, bez duplikata). Ne dira tijelo stranice ni JSON-LD.
 *
 *   node scripts/strengthen-article-meta-v1.mjs --check   # izvještaj, bez pisanja
 *   node scripts/strengthen-article-meta-v1.mjs --write   # upiše promjene
 *
 * Generator (apps/region/engine/build.mjs) koristi isto pravilo, pa dnevni
 * ciklus ne vraća stare opise.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { articleMetaDescription, clip } from './lib/article-meta-v1.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = join(ROOT, 'apps/portal/kanal');
const WRITE = process.argv.includes('--write');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function articles() {
  const out = [];
  if (!existsSync(PORTAL)) return out;
  for (const city of readdirSync(PORTAL)) {
    const dir = join(PORTAL, city, 'clanak');
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    for (const slug of readdirSync(dir)) {
      const file = join(dir, slug, 'index.html');
      if (existsSync(file)) out.push({ city, slug, file });
    }
  }
  return out;
}

function parse(html, slug) {
  const t = html.match(/<title>([^<]*)<\/title>/);
  const d = html.match(/<meta name="description" content="([^"]*)"/);
  const title = t ? unesc(t[1]) : '';
  // „Naslov — Izvor | KANAL” (vidi apps/region/engine/build.mjs)
  const m = title.match(/^(.*) — (.*?) \| (.*)$/);
  const dateM = slug.match(/-(\d{4}-\d{2}-\d{2})-/);
  return {
    title: m ? m[1] : title,
    sourceName: m ? m[2] : '',
    channelTitle: m ? m[3] : '',
    date: dateM ? dateM[1] : '',
    summary: d ? unesc(d[1]) : '',
    hasDesc: !!d,
  };
}

const items = articles().map((a) => {
  const html = readFileSync(a.file, 'utf8');
  return { ...a, html, p: parse(html, a.slug) };
});

// 1. prvi prolaz
for (const it of items) it.next = articleMetaDescription(it.p);

// 2. deduplikacija: ako isti opis ima više članaka, naslov ide ispred
const count = new Map();
for (const it of items) count.set(it.next, (count.get(it.next) || 0) + 1);
for (const it of items) {
  if (count.get(it.next) > 1 && it.p.title) {
    it.next = clip(`${it.p.title}. ${it.next}`, 200);
  }
}

// 3. izvještaj
const stats = { total: items.length, changed: 0, short: 0, long: 0, dupAfter: 0 };
const seen = new Map();
for (const it of items) {
  if (it.next !== (it.p.summary || '')) stats.changed++;
  if (it.next.length < 80) stats.short++;
  if (it.next.length > 200) stats.long++;
  seen.set(it.next, (seen.get(it.next) || 0) + 1);
}
stats.dupAfter = [...seen.values()].filter((v) => v > 1).reduce((a, b) => a + b, 0);
console.log(JSON.stringify(stats, null, 2));

if (!WRITE) {
  console.log('(--check: ništa nije upisano; pokreni s --write)');
  process.exit(0);
}

let written = 0;
for (const it of items) {
  if (!it.p.hasDesc) continue;
  let html = it.html;
  const enc = esc(it.next);
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${enc}$2`);
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${enc}$2`);
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${enc}$2`);
  if (html !== it.html) {
    writeFileSync(it.file, html);
    written++;
  }
}
console.log(`upisano: ${written}`);
