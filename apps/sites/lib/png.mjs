/**
 * OG slika bez ijedne vanjske biblioteke.
 *
 * Twitter, Facebook i LinkedIn ne prikazuju SVG u kartici, pa svaka stranica
 * dobiva pravi PNG (1200×630) u svojoj paleti. Crta se piksel po piksel:
 * gradijent, sjaj, prstenovi i valovi — bez teksta, bez fotografija i bez
 * lažnih scena. Isti seed uvijek daje istu sliku, pa je build ponovljiv.
 */
import { deflateSync } from 'node:zlib';

const DEFAULT_W = 1200;
const DEFAULT_H = 630;

const hex = (value) => {
  const clean = value.replace('#', '');
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
};

const table = (() => {
  const cells = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    cells[n] = c >>> 0;
  }
  return cells;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 0);
  return Buffer.concat([head, data, crc]);
}

const clamp = (value) => (value < 0 ? 0 : value > 255 ? 255 : value | 0);
const mix = (a, b, t) => a + (b - a) * t;

export function ogPng({ seed = 'gnk', bg = '#0a0b10', accent = '#ef4444', accent2 = '#60a5fa', variant = 0, width = DEFAULT_W, height = DEFAULT_H }) {
  const W = width;
  const H = height;
  const base = hex(bg);
  const a1 = hex(accent);
  const a2 = hex(accent2);
  const px = Buffer.alloc(W * H * 3);
  const ringCx = W * (0.63 + (variant % 3) * 0.05);
  const ringCy = H * 0.48;
  const bands = 11 + variant * 2;

  for (let y = 0; y < H; y += 1) {
    const v = y / H;
    for (let x = 0; x < W; x += 1) {
      const u = x / W;
      const glow = Math.max(0, 1 - Math.hypot((x - ringCx) / (W * 0.62), (y - ringCy) / (H * 0.75)));
      const glow2 = Math.max(0, 1 - Math.hypot((x - W * 0.12) / (W * 0.5), (y - H * 0.9) / (H * 0.8)));
      let r = mix(base[0], a1[0], 0.10 + 0.34 * glow) + a2[0] * 0.06 * glow2;
      let g = mix(base[1], a1[1], 0.10 + 0.34 * glow) + a2[1] * 0.06 * glow2;
      let b = mix(base[2], a1[2], 0.10 + 0.34 * glow) + a2[2] * 0.06 * glow2;

      if (variant % 3 === 0) {
        const d = Math.hypot((x - ringCx) * 0.72, y - ringCy);
        const wave = Math.sin(d / 26) * 0.5 + 0.5;
        const strength = Math.pow(wave, 7) * Math.max(0, 1 - d / (W * 0.75));
        r = mix(r, a1[0], strength * 0.55); g = mix(g, a1[1], strength * 0.55); b = mix(b, a1[2], strength * 0.55);
        if (Math.abs(((d / 78) % 1) - 0.5) < 0.012 && d < W * 0.78) {
          r = mix(r, a2[0], 0.35); g = mix(g, a2[1], 0.35); b = mix(b, a2[2], 0.35);
        }
      } else if (variant % 3 === 1) {
        const edge = ((u * bands + v * 0.55) % 1);
        if (edge < 0.05) {
          const t = 0.5 * (1 - v);
          r = mix(r, a2[0], t); g = mix(g, a2[1], t); b = mix(b, a2[2], t);
        }
        const bar = Math.abs(u - 0.18 - v * 0.35);
        if (bar < 0.012) { r = mix(r, a1[0], 0.5); g = mix(g, a1[1], 0.5); b = mix(b, a1[2], 0.5); }
      } else {
        const wave = Math.sin(u * 9.4 + v * 5.2 + variant) * 0.5 + 0.5;
        const line = Math.pow(wave, 12);
        r = mix(r, a2[0], line * 0.5); g = mix(g, a2[1], line * 0.5); b = mix(b, a2[2], line * 0.5);
        const d2 = Math.hypot(x - W * 0.34, y - H * 0.42);
        if (d2 < H * 0.26) { r = mix(r, a1[0], 0.16); g = mix(g, a1[1], 0.16); b = mix(b, a1[2], 0.16); }
      }

      const o = (y * W + x) * 3;
      px[o] = clamp(r);
      px[o + 1] = clamp(g);
      px[o + 2] = clamp(b);
    }
  }

  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y += 1) {
    raw[y * (W * 3 + 1)] = 0;
    px.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export const ogSize = { width: DEFAULT_W, height: DEFAULT_H };
