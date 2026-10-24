/**
 * Zajednički komadić za naslovnu sliku stranice (`page-art v1`).
 *
 * Generator stranica ne smije proizvesti praznu stranicu. Umjesto da svaki
 * generator izmišlja svoj HTML za sliku, ovdje je jedno mjesto: omjer 16:9,
 * `srcset` iz stvarnih datoteka, obavezan `alt` i potpis.
 *
 * Upotreba u generatoru:
 *
 *   import { figureHtml, artStylesheet } from '../../scripts/lib/page-art-v1.mjs';
 *   ...
 *   ${figureHtml({ portal, art: 'desk/art/svijet', alt: '...', caption: '...' })}
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SIZES = [440, 800, 1200];
const CSS_HREF = '/assets/page-art-v1.css';

const esc = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/* Dimenzije iz zaglavlja WebP-a ili JPEG-a — bez vanjskih alata, jer se
   gradnja mora moći izvesti i tamo gdje ImageMagick nije instaliran. */
function dimensions(file) {
  try {
    const buf = readFileSync(file);
    if (buf.slice(0, 4).toString('ascii') === 'RIFF') {
      const sig = buf.slice(12, 16).toString('ascii');
      if (sig === 'VP8X') {
        return [1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)), 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16))];
      }
      if (sig === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
      if (sig === 'VP8L') {
        const b = buf.readUInt32LE(21);
        return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1];
      }
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i < buf.length - 9) {
        if (buf[i] !== 0xff) { i += 1; continue; }
        const marker = buf[i + 1];
        const length = buf.readUInt16BE(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
        }
        i += 2 + length;
      }
    }
  } catch { /* padni na zadanu veličinu */ }
  return [1200, 675];
}

export function figureHtml({ portal, art, alt, caption, eager = true }) {
  const base = join(portal, 'assets', art);
  const available = SIZES.filter((size) => existsSync(`${base}-${size}.webp`));
  const single = available.length ? null : ['.webp', '.jpg', '.png']
    .map((ext) => `${base}${ext}`)
    .find((file) => existsSync(file));
  if (!available.length && !single) return '';

  const src = available.length ? `${base}-${available[available.length - 1]}.webp` : single;
  const [width, height] = dimensions(src);
  const web = (value) => `/assets/${value.slice(join(portal, 'assets').length + 1).split('\\\\').join('/')}`;
  const srcset = available.length > 1
    ? ` srcset="${available.map((size) => `${web(`${base}-${size}.webp`)} ${size}w`).join(', ')}" sizes="(max-width: 720px) 100vw, 900px"`
    : '';
  const loading = eager ? 'eager" fetchpriority="high' : 'lazy';

  return `<!-- page-art:v1 -->
<figure class="page-art" data-art="page-art-v1">
  <img src="${web(src)}"${srcset} width="${width}" height="${height}" alt="${esc(alt)}" loading="${loading}" decoding="async">
  <figcaption>${esc(caption)}</figcaption>
</figure>
<!-- /page-art:v1 -->`;
}

export function artStylesheet(html) {
  if (!html.includes('</head>') || html.includes(CSS_HREF)) return html;
  return html.replace('</head>', `<link rel="stylesheet" href="${CSS_HREF}">\n</head>`);
}

export { CSS_HREF };
