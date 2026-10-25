#!/usr/bin/env node
/**
 * CENZUS `<style>` BLOKOVA — koliko stilova nosi svaka javna stranica.
 *
 * Zašto: jedan list po webu je pravilo, a ne želja. Kad stranica nosi deset
 * ugrađenih blokova, svaki popravak izgleda mora se napraviti deset puta, a
 * redoslijed kaskade ovisi o tome gdje je koji blok završio u dokumentu. Ovaj
 * alat ne popravlja ništa — samo broji i imenuje, da se popravak radi na
 * pravom mjestu.
 *
 * Izlaz:
 *   apps/portal/data/style-blocks-census-v1.json   (strojni zapis)
 *   docs/cenzus-style-blokova-v1.md                (kratki izvještaj)
 *
 * Naredbe:
 *   node scripts/audit-style-blocks-v1.mjs
 *   node scripts/audit-style-blocks-v1.mjs --max 3   (padne ako ijedna stranica
 *                                                     ima više od 3 bloka)
 */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOTS = ['apps/portal', 'apps/world/site', 'apps/sites/site', 'apps/tjednik/site',
  'apps/kanal/site', 'apps/arhiva/site', 'apps/dnevnik/site'];
const SKIP = new Set(['node_modules', '.git', 'assets', 'data', '__preview']);

const argValue = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : null;
};
const MAX = Number(argValue('--max') || 0);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
};

const blocksOf = (html) => {
  const out = [];
  for (const m of html.matchAll(/<style\b([^>]*)>/gi)) {
    const close = html.indexOf('</style>', m.index);
    out.push({
      attrs: m[1].trim(),
      id: (/id="([^"]+)"/.exec(m[1]) || [, ''])[1],
      bytes: close > -1 ? close - m.index : 0
    });
  }
  return out;
};

const histogram = {};
const perRoot = {};
const offenders = [];
let pages = 0;
let fullStylePages = 0;

for (const root of ROOTS) {
  const dir = join(ROOT, root);
  let rootPages = 0;
  let rootBlocks = 0;
  for (const file of walk(dir)) {
    const html = readFileSync(file, 'utf8');
    if (!/<html[\s>]/i.test(html)) continue;
    const blocks = blocksOf(html);
    pages += 1;
    rootPages += 1;
    rootBlocks += blocks.length;
    histogram[blocks.length] = (histogram[blocks.length] || 0) + 1;
    if (blocks.length) fullStylePages += 1;
    if (blocks.length > 1) {
      offenders.push({
        file: relative(ROOT, file),
        blocks: blocks.length,
        names: blocks.map((b) => b.id || '(bez id)'),
        bytes: blocks.reduce((n, b) => n + b.bytes, 0)
      });
    }
  }
  perRoot[root] = { pages: rootPages, blocks: rootBlocks, avg: rootPages ? +(rootBlocks / rootPages).toFixed(2) : 0 };
}

offenders.sort((a, b) => b.blocks - a.blocks || b.bytes - a.bytes);

const summary = {
  version: 'STYLE_BLOCKS_CENSUS_V1',
  generatedAt: new Date().toISOString().slice(0, 10),
  pages,
  pagesWithInlineStyle: fullStylePages,
  blocksTotal: Object.entries(histogram).reduce((n, [k, v]) => n + Number(k) * v, 0),
  histogram: Object.fromEntries(Object.entries(histogram).sort((a, b) => Number(a[0]) - Number(b[0]))),
  perRoot,
  maxBlocksOnPage: offenders.length ? offenders[0].blocks : 1,
  offenders: offenders.slice(0, 40),
  offenderCount: offenders.length
};

mkdirSync(join(ROOT, 'apps/portal/data'), { recursive: true });
writeFileSync(join(ROOT, 'apps/portal/data/style-blocks-census-v1.json'), `${JSON.stringify(summary, null, 2)}\n`);

const rows = offenders.slice(0, 15).map((o) => `| \`${o.file}\` | ${o.blocks} | ${o.bytes} | ${o.names.join(', ')} |`).join('\n');
const rootRows = Object.entries(perRoot)
  .map(([name, r]) => `| ${name} | ${r.pages} | ${r.blocks} | ${r.avg} |`)
  .join('\n');

const md = `# Cenzus \`<style>\` blokova

Snimak: **${summary.generatedAt}** · alat: \`scripts/audit-style-blocks-v1.mjs\`

Jedan list po webu je pravilo; ugrađeni blokovi su iznimka koja se mora znati
izbrojati. Ovaj cenzus ne mijenja stranice — imenuje mjesta na kojima se
izgled popravlja teže nego što bi trebalo.

## Zbroj

- javnih stranica: **${pages}**
- stranica s ugrađenim stilom: **${fullStylePages}**
- ugrađenih blokova ukupno: **${summary.blocksTotal}**
- najviše blokova na jednoj stranici: **${summary.maxBlocksOnPage}**

## Razdioba (blokova → stranica)

${Object.entries(summary.histogram).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Po webu

| web | stranica | blokova | prosjek |
| --- | --- | --- | --- |
${rootRows}

## Najteže stranice

| stranica | blokova | bajtova | imena blokova |
| --- | --- | --- | --- |
${rows}
`;
writeFileSync(join(ROOT, 'docs/cenzus-style-blokova-v1.md'), md);

console.log(JSON.stringify({
  ok: MAX ? summary.maxBlocksOnPage <= MAX : true,
  pages,
  blocksTotal: summary.blocksTotal,
  maxBlocksOnPage: summary.maxBlocksOnPage,
  pagesOver1: offenders.length,
  max: MAX || null,
  out: 'apps/portal/data/style-blocks-census-v1.json',
  report: 'docs/cenzus-style-blokova-v1.md'
}, null, 2));

if (MAX && summary.maxBlocksOnPage > MAX) process.exit(1);
