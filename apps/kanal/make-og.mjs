#!/usr/bin/env node
/**
 * Generira 1200×630 OG slike za KANAL (jedna po objavi + naslovnica).
 * Zahtijeva sharp:
 *   NODE_PATH=/home/user/.cache/ogtool/node_modules node apps/kanal/make-og.mjs
 */
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(process.env.NODE_PATH ? `${process.env.NODE_PATH}/` : import.meta.url);
const sharp = require('sharp');

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'src');
const OUT = join(SRC, 'assets', 'og');
mkdirSync(OUT, { recursive: true });

const site = JSON.parse(readFileSync(join(SRC, 'site.json'), 'utf8'));
const articles = readdirSync(join(SRC, 'articles')).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(SRC, 'articles', f), 'utf8')));

const photos = [
  'nermin-sefic-04-strategy-boardroom.webp',
  'nermin-sefic-01-official-desk-portrait.webp',
  'nermin-sefic-09-conference-book.webp'
];
const PHOTO = join(SRC, 'assets');
/* Izrez fokusa na osobu — koordinate u apsolutnim pikselima izvorne slike. */
const CROPS = {
  'nermin-sefic-04-strategy-boardroom.webp': { srcW: 1672, srcH: 941, left: 520, top: 0, width: 700, height: 941 },
  'nermin-sefic-01-official-desk-portrait.webp': { srcW: 1672, srcH: 941, left: 470, top: 0, width: 700, height: 941 },
  'nermin-sefic-09-conference-book.webp': { srcW: 1254, srcH: 1254, left: 200, top: 0, width: 934, height: 1254 }
};
const PHOTO_LEFT = 660;
const PHOTO_W = 540;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const wrap = (text, max) => {
  const out = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    if ((line + ' ' + w).trim().length > max && line) { out.push(line.trim()); line = w; }
    else line = (line + ' ' + w).trim();
  }
  if (line) out.push(line.trim());
  return out;
};
const fmt = (iso) => new Date(`${iso}T09:00:00+02:00`).toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' });

function card({ kicker, title, byline, withPhoto }) {
  const maxChars = withPhoto ? 20 : 30;
  let lines = wrap(title, maxChars);
  if (lines.length > 4) lines = lines.slice(0, 4);
  const fontSize = lines.length >= 4 ? 41 : lines.length === 3 ? 46 : 52;
  const lineH = Math.round(fontSize * 1.13);
  const startY = 300 - ((lines.length - 1) * lineH) / 2;
  const titleSvg = lines.map((l, i) => `<text x="72" y="${startY + i * lineH}" font-family="DejaVu Serif" font-weight="bold" font-size="${fontSize}" fill="#F6F1E6">${esc(l)}</text>`).join('');
  const ruleY = startY + lines.length * lineH + 6;
  const byY = ruleY + 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0B0C0F" stop-opacity="1"/>
      <stop offset="0.62" stop-color="#0B0C0F" stop-opacity="1"/>
      <stop offset="1" stop-color="#0B0C0F" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0B0C0F" stop-opacity="1"/>
      <stop offset="0.56" stop-color="#0B0C0F" stop-opacity="0.98"/>
      <stop offset="0.70" stop-color="#0B0C0F" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#0B0C0F" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="6" fill="#C9A24A"/>
  <rect x="72" y="96" width="54" height="3" fill="#C9A24A"/>
  <text x="140" y="104" font-family="DejaVu Sans" font-size="19" letter-spacing="4" fill="#C9A24A">GNK ASG · KANAL</text>
  <text x="72" y="170" font-family="DejaVu Sans" font-weight="bold" font-size="20" letter-spacing="3" fill="#E07164">${esc(kicker.toUpperCase())}</text>
  ${titleSvg}
  <line x1="72" y1="${ruleY}" x2="${withPhoto ? 660 : 1060}" y2="${ruleY}" stroke="#2E3139"/>
  <text x="72" y="${byY}" font-family="DejaVu Sans" font-size="19" fill="#A2A4AD">${esc(byline)}</text>
  <text x="72" y="574" font-family="DejaVu Sans" font-size="16" letter-spacing="1" fill="#6E7179">IZVOR: GNK ASG KANAL · 2026</text>
  ${withPhoto ? `<rect x="${PHOTO_LEFT - 40}" y="0" width="230" height="630" fill="url(#fade)"/>` : ''}
</svg>`;
}

async function render(svg, photoFile) {
  const layers = [];
  if (photoFile) {
    const c = CROPS[photoFile];
    const photo = await sharp(join(PHOTO, photoFile))
      .extract({ left: c.left, top: c.top, width: c.width, height: c.height })
      .resize(PHOTO_W, 630, { fit: 'cover', position: 'centre' })
      .modulate({ brightness: 0.86, saturation: 0.92 })
      .toBuffer();
    layers.push({ input: photo, left: PHOTO_LEFT, top: 0 });
  }
  layers.push({ input: Buffer.from(svg), left: 0, top: 0 });
  return sharp({ create: { width: 1200, height: 630, channels: 4, background: '#0B0C0F' } })
    .composite(layers)
    .flatten({ background: '#0B0C0F' })
    .png({ quality: 88, compressionLevel: 9 })
    .toBuffer();
}

for (const [i, a] of articles.entries()) {
  const svg = card({
    kicker: site.sections[a.section]?.label || 'KANAL',
    title: a.title,
    byline: `Nermin Sefić · ${fmt(a.date)}`,
    withPhoto: true
  });
  const buf = await render(svg, photos[i % photos.length]);
  writeFileSync(join(OUT, `${a.slug}.png`), buf);
  console.log('OG:', a.slug, Math.round(buf.length / 1024) + ' KB');
}

const homeSvg = card({
  kicker: 'GNK ASG · Zagreb',
  title: 'Objave, analize i pojašnjenja koja preuzima AKTUAL MEDIA',
  byline: 'Nermin Sefić, glavni urednik · 10 objava u prvom izdanju',
  withPhoto: false
});
writeFileSync(join(OUT, 'naslovnica.png'), await render(homeSvg, null));
console.log('OG: naslovnica');
