import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const QUEUE_FILE = path.resolve('apps/portal/data/linkedin-content/today.json');
const OUT_PNG = path.resolve('apps/portal/data/linkedin-content/today-image.png');
const ARCHIVE_DIR = path.resolve('apps/portal/data/linkedin-content/archive');

// Human-readable titles/taglines per project id, matching the site's own
// editorial voice. Kept here (not derived from postText) so the image
// headline stays short and legible regardless of which text variant
// rotated in today.
const PROJECT_META = {
  'ideje': { title: 'Ideje u djelovanju', tag: 'Gdje ideje postaju stvarnost' },
  'aktual-media': { title: 'AKTUAL MEDIA', tag: 'Najvažnije svjetske vijesti na jednom mjestu' },
  'puls-trzista': { title: 'Puls Tržišta', tag: 'Svjetska tržišta i kripto, uživo' },
  'trzisne-krize': { title: 'Tržišne krize', tag: '2000. – 2026. u brojkama' },
  'synapse': { title: 'SYNAPSE', tag: 'AI 3D demo' },
  'nilus-bio': { title: 'Nilus Bio', tag: 'PRJ-006' },
  'digital-solutions': { title: 'GNK DINAMO Digital Solutions', tag: 'Tehnologija i infrastruktura' },
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrapText(text, maxCharsPerLine) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxCharsPerLine) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function buildSvg({ title, tag, date }) {
  const W = 1200, H = 1200;
  const titleLines = wrapText(title, 16);
  const titleFontSize = titleLines.length > 1 ? 68 : 82;
  const titleStartY = 560 - (titleLines.length - 1) * (titleFontSize + 6) / 2;

  const titleTspans = titleLines.map((line, i) =>
    `<tspan x="100" dy="${i === 0 ? 0 : titleFontSize + 6}">${esc(line)}</tspan>`
  ).join('');

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="15%" cy="10%" r="90%">
      <stop offset="0%" stop-color="#161920"/>
      <stop offset="55%" stop-color="#0d0f14"/>
      <stop offset="100%" stop-color="#08090c"/>
    </radialGradient>
    <linearGradient id="goldline" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#b68522"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <!-- subtle network dot texture -->
  <g opacity="0.25">
    ${Array.from({length: 40}).map((_,i)=>{
      const x = (i*173+97)%W, y=(i*281+61)%H, r = (i%5===0)?2.4:1.2;
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="#d4af37"/>`;
    }).join('')}
  </g>
  <!-- top brand row -->
  <text x="100" y="120" font-family="Arial, sans-serif" font-weight="900" font-size="34" fill="#d4af37" letter-spacing="2">GNK ASG</text>
  <text x="100" y="150" font-family="Arial, sans-serif" font-weight="700" font-size="20" fill="#94a3b8" letter-spacing="3">GNK DINAMO LTD. GROUP</text>
  <rect x="100" y="175" width="140" height="4" fill="url(#goldline)"/>
  <!-- eyebrow -->
  <text x="100" y="330" font-family="Arial, sans-serif" font-weight="900" font-size="26" fill="#e0bd69" letter-spacing="4">${esc(date)}</text>
  <!-- title -->
  <text x="100" y="${titleStartY}" font-family="Georgia, 'Times New Roman', serif" font-weight="500" font-size="${titleFontSize}" fill="#f8fafc">${titleTspans}</text>
  <!-- tagline -->
  <text x="100" y="780" font-family="Arial, sans-serif" font-weight="600" font-size="34" fill="#c5cfdb">${esc(tag)}</text>
  <!-- footer -->
  <rect x="0" y="1060" width="${W}" height="140" fill="rgba(212,175,55,.06)"/>
  <line x1="100" y1="1060" x2="${W-100}" y2="1060" stroke="rgba(212,175,55,.35)" stroke-width="2"/>
  <text x="100" y="1110" font-family="Arial, sans-serif" font-weight="800" font-size="24" fill="#d4af37">gnk-asg.hr</text>
  <text x="100" y="1145" font-family="Arial, sans-serif" font-weight="500" font-size="18" fill="#94a3b8">GNK ASG d.o.o. · GNK DINAMO Ltd. · Nermin Sefić</text>
</svg>`;
}

async function main() {
  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  const meta = PROJECT_META[queue.projectId] || { title: queue.projectId, tag: 'GNK ASG' };
  const dateLabel = new Date(queue.generatedAt).toLocaleDateString('hr-HR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();

  const svg = buildSvg({ title: meta.title, tag: meta.tag, date: dateLabel });

  fs.mkdirSync(path.dirname(OUT_PNG), { recursive: true });
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

  const pngBuffer = await sharp(Buffer.from(svg)).png({ quality: 92 }).toBuffer();
  fs.writeFileSync(OUT_PNG, pngBuffer);

  const dateStamp = new Date(queue.generatedAt).toISOString().slice(0, 10);
  const archivePath = path.join(ARCHIVE_DIR, `${dateStamp}-${queue.projectId}.png`);
  fs.writeFileSync(archivePath, pngBuffer);

  console.log('Image generated:', OUT_PNG, '(' + pngBuffer.length + ' bytes)');
  console.log('Archived to:', archivePath);
}

main().catch(err => { console.error(err); process.exit(1); });
