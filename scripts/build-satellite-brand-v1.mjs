#!/usr/bin/env node
/**
 * AKTUAL ARHIVA / AKTUAL DNEVNIK — znak i OG kartica (1200×630).
 *
 * Zašto generator: oba portala moraju izgledati kao ista familija kao
 * AKTUAL MEDIA, ali svaki mora imati vlastitu OG sliku na vlastitoj domeni
 * (Facebook i X ne vole tuđe hostove, a i ovako slika nema vanjskih ovisnosti).
 *
 * Motiv je doslovno "linija": tri čvora na istoj vodoravnoj crti —
 * matični portal, ARHIVA, DNEVNIK. Na svakoj kartici jedan je čvor crven.
 *
 * Izlaz: apps/satellites/assets/
 *   aktual-arhiva-og.jpg, aktual-dnevnik-og.jpg   (1200×630)
 *   aktual-arhiva.svg, aktual-dnevnik.svg         (vektorski znak, 1200×345)
 *   favicon.svg                                   (isti za oba, 32×32)
 *
 * Pokretanje: node scripts/build-satellite-brand-v1.mjs
 * Provjera:   node scripts/build-satellite-brand-v1.mjs --check
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'apps/satellites/assets');
// Iste kartice služe kao pločice na gnk-asg.hr (880×587, webp).
const TILES = join(ROOT, 'apps/portal/assets/izdanja');
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const FONT_R = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';

const NAVY = '#19233B';
const DEEPER = '#0C1424';
const CREAM = '#F4F1E8';
const RED = '#D9384D';
const MUTED = '#8FA0BF';

const CARDS = [
  {
    slug: 'aktual-arhiva',
    site: 'AKTUAL ARHIVA',
    left: 'AKTUAL',
    right: 'ARHIVA',
    kicker: 'AKTUAL MEDIA · SAMOSTALNI PORTAL',
    tagline: '3.360 tekstova · osam gradova · svaki s izvornikom',
    host: 'gnk-asg-arhiva.pages.dev',
    active: 1,
    alt: 'Kartica AKTUAL ARHIVA: navy AKTUAL, crvena ARHIVA, linija s tri čvora i natpis 3.360 tekstova osam gradova.',
  },
  {
    slug: 'aktual-dnevnik',
    site: 'AKTUAL DNEVNIK',
    left: 'AKTUAL',
    right: 'DNEVNIK',
    kicker: 'AKTUAL MEDIA · SAMOSTALNI PORTAL',
    tagline: 'jedan dan · osam gradova · sve po satima',
    host: 'gnk-asg-dnevnik.pages.dev',
    active: 2,
    alt: 'Kartica AKTUAL DNEVNIK: navy AKTUAL, crvena DNEVNIK, linija s tri čvora i natpis jedan dan osam gradova.',
  },
];

const BG = { w: 1200, h: 630 };

/** Jedan MVG dokument po kartici — ImageMagick prima -draw @datoteka. */
const render = (card, { check = false } = {}) => {
  const out = join(OUT, `${card.slug}-og.jpg`);
  if (check) {
    if (!existsSync(out)) throw new Error(`nema ${out}`);
    const size = statSync(out).size;
    if (size < 8000) throw new Error(`${out} je premalen: ${size} B`);
    return { ok: true, file: out, bytes: size };
  }
  mkdirSync(OUT, { recursive: true });

  const y = 455;
  const xs = [720, 860, 1000];
  const labels = ['GNK ASG', 'ARHIVA', 'DNEVNIK'];
  const lines = [
    `fill ${DEEPER}`, 'polygon 820,0 1200,0 1200,630 620,630',
    `fill #232F4C`, 'polygon 980,0 1200,0 1200,300',
    `stroke ${MUTED}`, 'stroke-width 2', 'fill none', `line 700,${y} 1120,${y}`,
  ];
  xs.forEach((x, i) => {
    const active = i === card.active;
    lines.push(`fill ${active ? RED : NAVY}`, `stroke ${active ? RED : MUTED}`, 'stroke-width 2',
      `circle ${x},${y} ${x + 9},${y}`);
  });
  labels.forEach((label, i) => {
    lines.push(`fill ${i === card.active ? CREAM : MUTED}`, 'stroke none',
      `font '${FONT_R}'`, 'font-size 20', `text ${xs[i] - 34},${y + 44} '${label}'`);
  });
  lines.push(
    `fill ${MUTED}`, 'stroke none', `font '${FONT}'`, 'font-size 22', `text 80,116 '${card.kicker}'`,
    `fill ${RED}`, 'stroke none', 'rectangle 80,140 168,146',
    `font '${FONT}'`, 'font-size 110', `fill ${CREAM}`, `text 76,292 '${card.left}'`,
    `font '${FONT}'`, 'font-size 110', `fill ${RED}`, `text 76,404 '${card.right}'`,
    `font '${FONT_R}'`, 'font-size 31', `fill ${CREAM}`, `text 80,540 '${card.tagline}'`,
    `font '${FONT_R}'`, 'font-size 21', `fill ${MUTED}`, `text 80,592 '${card.host}'`,
  );

  const mvg = join(OUT, `.${card.slug}.mvg`);
  writeFileSync(mvg, lines.join('\n'), 'utf8');
  try {
    execFileSync('convert', ['-size', `${BG.w}x${BG.h}`, `xc:${NAVY}`, '-draw', `@${mvg}`,
      '-depth', '8', '-quality', '90', out], { stdio: 'pipe' });
  } finally {
    try { execFileSync('rm', ['-f', mvg]); } catch { /* noop */ }
  }
  return { ok: true, file: out, bytes: statSync(out).size };
};

/** Pločica za gnk-asg.hr: ista grafika, bez rezanja teksta (dodaje se navy pojas). */
const makeTile = (card) => {
  const src = join(OUT, `${card.slug}-og.jpg`);
  const out = join(TILES, `${card.slug.replace('aktual-', '')}-tile.webp`);
  if (process.argv.includes('--check')) {
    if (!existsSync(out)) throw new Error(`nema ${out}`);
    return { ok: true, file: out, bytes: statSync(out).size };
  }
  mkdirSync(TILES, { recursive: true });
  execFileSync('convert', [src, '-resize', '880x462', '-background', NAVY, '-gravity', 'north',
    '-extent', '880x587', '-quality', '88', out], { stdio: 'pipe' });
  // iste pločice u dva manja iznosa za naslovnicu (240w / 440w)
  for (const w of [240, 440]) {
    const h = Math.round((587 / 880) * w);
    execFileSync('convert', [out, '-resize', `${w}x${h}`, '-quality', '86', join(TILES, `${card.slug.replace('aktual-', '')}-${w}.webp`)], { stdio: 'pipe' });
  }
  return { ok: true, file: out, bytes: statSync(out).size };
};

const svg = (card) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 345" width="1200" height="345" role="img" aria-labelledby="t d">
<title id="t">${card.site}</title>
<desc id="d">${card.alt}</desc>
<rect width="1200" height="345" fill="${NAVY}"/>
<rect x="0" y="0" width="1200" height="6" fill="${RED}"/>
<text x="48" y="96" font-family="DejaVu Sans, Arial, sans-serif" font-size="26" letter-spacing="6" fill="${MUTED}">${card.kicker}</text>
<text x="44" y="232" font-family="DejaVu Sans, Arial, sans-serif" font-weight="bold" font-size="104" fill="${CREAM}">${card.left}</text>
<text x="44" y="322" font-family="DejaVu Sans, Arial, sans-serif" font-weight="bold" font-size="104" fill="${RED}">${card.right}</text>
<g stroke="${MUTED}" stroke-width="2"><line x1="780" y1="200" x2="1140" y2="200"/></g>
<circle cx="820" cy="200" r="9" fill="${card.active === 0 ? RED : NAVY}" stroke="${MUTED}" stroke-width="2"/>
<circle cx="960" cy="200" r="9" fill="${card.active === 1 ? RED : NAVY}" stroke="${MUTED}" stroke-width="2"/>
<circle cx="1100" cy="200" r="9" fill="${card.active === 2 ? RED : NAVY}" stroke="${MUTED}" stroke-width="2"/>
</svg>
`;

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="AKTUAL MEDIA">
<rect width="64" height="64" rx="12" fill="${NAVY}"/>
<path d="M14 46 L32 18 L50 46 Z" fill="none" stroke="${CREAM}" stroke-width="5" stroke-linejoin="round"/>
<circle cx="32" cy="46" r="5" fill="${RED}"/>
</svg>
`;

const check = process.argv.includes('--check');
const results = CARDS.map((c) => render(c, { check }));
const tiles = CARDS.map(makeTile);
if (!check) {
  for (const c of CARDS) writeFileSync(join(OUT, `${c.slug}.svg`), svg(c), 'utf8');
  writeFileSync(join(OUT, 'favicon.svg'), favicon, 'utf8');
}
console.log(JSON.stringify({
  ok: true,
  version: 'AKTUAL_SATELLITES_BRAND_V1_20261022',
  out: OUT,
  files: [...results, ...tiles].map((r) => ({ file: r.file.replace(ROOT + '/', ''), bytes: r.bytes })),
}, null, 2));
