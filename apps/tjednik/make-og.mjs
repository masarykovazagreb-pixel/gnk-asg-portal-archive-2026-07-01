import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#07141f"/><stop offset=".55" stop-color="#0a1f2c"/><stop offset="1" stop-color="#0c2a33"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2fd3c0"/><stop offset="1" stop-color="#7aa7ff"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1040" cy="90" r="260" fill="#2fd3c0" opacity="0.07"/>
  <circle cx="1120" cy="540" r="200" fill="#7aa7ff" opacity="0.08"/>
  <rect x="72" y="84" width="64" height="4" fill="url(#bar)"/>
  <text x="72" y="152" font-family="DejaVu Sans, Arial, sans-serif" font-size="22" letter-spacing="7" fill="#2fd3c0" font-weight="700">GNK ASG · TJEDNIK</text>
  <text x="72" y="282" font-family="DejaVu Serif, Georgia, serif" font-size="96" fill="#eef8fa" font-weight="700">BUSINESS</text>
  <text x="72" y="382" font-family="DejaVu Serif, Georgia, serif" font-size="96" fill="#2fd3c0" font-weight="700">TJEDNIK</text>
  <text x="72" y="462" font-family="DejaVu Sans, Arial, sans-serif" font-size="27" fill="#b7cdd4">Kritika poslovnog izvještavanja: Lider · Jutarnji · Poslovni · Forbes</text>
  <rect x="72" y="512" width="380" height="2" fill="url(#bar)"/>
  <text x="72" y="566" font-family="DejaVu Sans, Arial, sans-serif" font-size="24" fill="#8fa8b2">Tjedna promjena · Dnevni dodaci · Izvornik uvijek povezan</text>
</svg>`;
const out = 'apps/tjednik/src/assets/og/tjednik.png';
mkdirSync('apps/tjednik/src/assets/og', { recursive: true });
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
console.log('OG written', out);
