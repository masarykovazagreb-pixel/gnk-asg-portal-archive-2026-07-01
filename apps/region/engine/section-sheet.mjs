#!/usr/bin/env node
/**
 * TRAKE RUBRIKA U JEDAN VANJSKI LIST — bez ugrađenih `<style>` blokova.
 *
 * Traka tehnologije, dnevni pregled, događaji i mrežna traka ubacuju se na
 * naslovnicu AKTUAL MEDIA kao marker-sekcije, a sa sobom nose i svoj CSS. Četiri
 * bloka zajedno su ~4,5 KB u samom HTML-u, ne mogu se predmemorirati i ne mogu
 * se popraviti na jednom mjestu.
 *
 * Ovaj modul ih, na kraju gradnje, vadi u `assets/aktual-hub-blocks-v1.css` i na
 * mjesto zadnjeg bloka stavlja jednu vezu. Redoslijed u listu je redoslijed
 * blokova u dokumentu, a veza ulazi u kaskadu tamo gdje je stajao zadnji blok.
 *
 * Modul je idempotentan: kad na stranici nema što izvaditi, ne dira datoteku.
 * Zato `region-deploy.yml` (koji pušta samo `hub.mjs`) i `sync-all` daju isti
 * izlaz — nema ciklusa u kojem se stranica „razmota" pa ponovno složi.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const PORTAL = join(ROOT, 'apps', 'portal');

const PAGES = [
  join(PORTAL, 'gnk-aktual', 'index.html'),
  join(PORTAL, 'en', 'gnk-aktual', 'index.html')
];
const SHEET = join(PORTAL, 'assets', 'aktual-hub-blocks-v1.css');

/* Svaki blok prepoznajemo po njegovoj prvoj klasi, ne po redoslijedu u
   dokumentu: marker-sekcija se može pomaknuti, a CSS ostaje isti. */
const BLOCKS = [
  ['skip', /<style>(?=\s*\.skip-to-content\{)[\s\S]*?<\/style>\n?/],
  ['ft-band', /<style>(?=\s*\.ft-band\{)[\s\S]*?<\/style>\n?/],
  ['dd-band', /<style>(?=\s*\.dd-band\{)[\s\S]*?<\/style>\n?/],
  ['events', /<style id="evd-style">[\s\S]*?<\/style>\n?/],
  ['netband', /<style>(?=\s*\.am-netband\{)[\s\S]*?<\/style>\n?/]
];

const cssOf = (block) => block.replace(/^<style[^>]*>/, '').replace(/<\/style>\n?$/, '').trim();
const LINK_RE = /<link rel="stylesheet" href="\/assets\/aktual-hub-blocks-v1\.css[^"]*">\n?/g;

const SHEET_MARK = /\/\* ---- ([a-z-]+) ---- \*\/\n([\s\S]*?)(?=\n\/\* ---- [a-z-]+ ---- \*\/|$)/g;

/* Čita postojeći list u mapu, da prolaz koji ne nađe nove blokove ne obriše
   dijelove koje je prethodni prolaz već spojio. */
function readSheet() {
  const parts = new Map();
  if (!existsSync(SHEET)) return parts;
  for (const m of readFileSync(SHEET, 'utf8').matchAll(SHEET_MARK)) parts.set(m[1], m[2].trim());
  return parts;
}

export function foldSectionStyles({ dryRun = false } = {}) {
  if (!PAGES.every((file) => existsSync(file))) return { ok: false, reason: 'nema naslovnice', folded: 0 };

  /* 1. Novi dijelovi iz obje jezične inačice; postojeći ostaju ako ih nema. */
  const parts = readSheet();
  for (const file of PAGES) {
    const html = readFileSync(file, 'utf8');
    for (const [key, re] of BLOCKS) {
      const m = html.match(re);
      if (m) parts.set(key, cssOf(m[0]));
    }
  }
  const keys = BLOCKS.map(([k]) => k).filter((k) => parts.has(k));
  if (!keys.length) return { ok: true, folded: 0, reason: 'nema blokova' };

  const css = keys.map((k) => `/* ---- ${k} ---- */\n${parts.get(k)}\n`).join('\n').trim();
  const hash = createHash('sha1').update(css).digest('hex').slice(0, 8);
  const link = `<link rel="stylesheet" href="/assets/aktual-hub-blocks-v1.css?v=${hash}">`;

  /* 2. Izvadi blokove; veza stoji na mjestu zadnjeg izvađenog bloka, pa list
     ulazi u kaskadu tamo gdje je stajao zadnji blok. Stranica bez novih
     blokova ostaje netaknuta (i zadržava postojeću vezu). */
  let changed = 0;
  for (const file of PAGES) {
    const before = readFileSync(file, 'utf8');
    let html = before;
    const spans = [];
    for (const [, re] of BLOCKS) {
      for (const m of html.matchAll(new RegExp(re.source, 'g'))) {
        spans.push({ start: m.index, end: m.index + m[0].length });
      }
    }
    if (!spans.length) continue;
    spans.sort((a, b) => a.start - b.start);
    html = html.replace(LINK_RE, '');
    /* Poredak se računa nakon brisanja stare veze, pa se rasponi ponovo traže. */
    const fresh = [];
    for (const [, re] of BLOCKS) {
      for (const m of html.matchAll(new RegExp(re.source, 'g'))) fresh.push({ start: m.index, end: m.index + m[0].length });
    }
    fresh.sort((a, b) => a.start - b.start);
    for (let i = fresh.length - 1; i >= 0; i -= 1) {
      const { start, end } = fresh[i];
      html = html.slice(0, start) + (i === fresh.length - 1 ? link : '') + html.slice(end);
    }
    /* Prazni redovi se svode na najviše jedan: inače svaka gradnja doda po
       jedan i izlaz se mijenja bez promjene sadržaja. */
    html = html.replace(/\n{3,}/g, '\n\n');
    if (html === before) continue;
    if (!dryRun) writeFileSync(file, html);
    changed += 1;
  }

  if (!dryRun) {
    mkdirSync(dirname(SHEET), { recursive: true });
    writeFileSync(SHEET, `${css}\n`);
  }
  return { ok: true, folded: changed, blocks: keys, bytes: css.length, hash };
}

/* CLI: `node apps/region/engine/section-sheet.mjs` — za ručnu provjeru. */
if (process.argv[1] && process.argv[1].endsWith('section-sheet.mjs')) {
  console.log(JSON.stringify(foldSectionStyles({ dryRun: process.argv.includes('--check') }), null, 2));
}
