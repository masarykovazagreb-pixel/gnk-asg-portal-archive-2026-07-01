#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PORTAL = path.join(ROOT, 'apps', 'portal');
const REGISTRY = path.join(PORTAL, 'data', 'editorial-registry.json');
const ORIGIN = 'https://gnk-asg.hr';
const failures = [];
const warnings = [];
const stats = { pagesChecked: 0, imagesChecked: 0, dimensionsVerified: 0, dimensionMismatches: 0, unsupportedFormats: 0, missingAssets: 0 };

const extract = (html, regex) => html.match(regex)?.[1]?.trim() || '';
const property = (html, name) => extract(html, new RegExp(`<meta\\s+[^>]*property=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i')) || extract(html, new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*property=["']${name}["'][^>]*>`, 'i'));
const routeFile = route => path.join(PORTAL, route.replace(/^\\/+|\\/+$/g, ''), 'index.html');
const localAsset = value => {
  try {
    const url = new URL(value);
    if (url.origin !== ORIGIN) return null;
    return path.join(PORTAL, decodeURIComponent(url.pathname).replace(/^\\/+/, ''));
  } catch { return null; }
};
const jpegSize = buffer => {
  let i = 2;
  while (i + 9 < buffer.length) {
    if (buffer[i] !== 0xff) { i++; continue; }
    const marker = buffer[i + 1];
    if (marker === 0xd8 || marker === 0xd9) { i += 2; continue; }
    if (i + 4 > buffer.length) break;
    const len = buffer.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > buffer.length) break;
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      return { width: buffer.readUInt16BE(i + 7), height: buffer.readUInt16BE(i + 5) };
    }
    i += 2 + len;
  }
  return null;
};
const imageSize = file => {
  const b = fs.readFileSync(file);
  if (b.length >= 24 && b.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b.length >= 10 && ['GIF87a','GIF89a'].includes(b.subarray(0,6).toString('ascii'))) return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  if (b.length >= 12 && b[0] === 0xff && b[1] === 0xd8) return jpegSize(b);
  return null;
};

if (!fs.existsSync(REGISTRY)) process.exit(1);
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
for (const item of Array.isArray(registry.items) ? registry.items : []) {
  const route = String(item.path || '');
  if (!route.startsWith('/')) continue;
  const file = routeFile(route);
  if (!fs.existsSync(file)) continue;
  stats.pagesChecked++;
  const html = fs.readFileSync(file, 'utf8');
  const image = property(html, 'og:image');
  const width = Number(property(html, 'og:image:width'));
  const height = Number(property(html, 'og:image:height'));
  if (!image || !Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) continue;
  const asset = localAsset(image);
  if (!asset) continue;
  stats.imagesChecked++;
  if (!fs.existsSync(asset) || !fs.statSync(asset).isFile()) {
    stats.missingAssets++;
    failures.push(`${route}: og:image asset missing: ${image}`);
    continue;
  }
  const actual = imageSize(asset);
  if (!actual) {
    stats.unsupportedFormats++;
    warnings.push(`${route}: intrinsic dimensions not locally verifiable for ${image}; runtime verification required`);
    continue;
  }
  stats.dimensionsVerified++;
  if (actual.width !== width || actual.height !== height) {
    stats.dimensionMismatches++;
    failures.push(`${route}: declared og:image dimensions ${width}x${height} differ from intrinsic ${actual.width}x${actual.height}: ${image}`);
  }
}

const report = { version: 'GNK_ASG_SOCIAL_IMAGE_INTRINSIC_DIMENSIONS_V1', ok: failures.length === 0, stats, failures, warnings };
const out = path.join(ROOT, 'artifacts', 'social-image-intrinsic-dimensions');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
