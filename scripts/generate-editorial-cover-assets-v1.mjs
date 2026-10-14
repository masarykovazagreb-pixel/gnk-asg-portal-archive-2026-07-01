#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { writeCoverWebp } from './lib/editorial-cover-art-v1.mjs';

const PORTAL = 'apps/portal';
const REGISTRY_PATH = `${PORTAL}/data/editorial-registry.json`;
const MANIFEST_PATH = `${PORTAL}/data/editorial-image-manifest.json`;
const OUTPUT_DIR = `${PORTAL}/assets/editorial/generated`;
const SITE = 'https://gnk-asg.hr';
const ART_VERSION = '2026-10-14-clean-cover-v2';
const FORCE = process.argv.includes('--force');
const protectedPath = (route) => /(?:^|\/)spt(?:[-/]|$)|\b(?:bank|banks|banking)(?:[-/]|$)|\badria-?bank(?:[-/]|$)/i.test(route);
const routeId = (route) => `${route.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[đĐ]/g, (char) => char === 'Đ' ? 'D' : 'd').replace(/^\/+|\/+$/g, '').replace(/[^A-Za-z0-9-]+/g, '-').replace(/-+/g, '-').toLowerCase()}-${createHash('sha1').update(route).digest('hex').slice(0, 8)}`;
const typeLabel = (type, language) => ({
  objava: language === 'en' ? 'Publication' : 'Objava',
  komentar: language === 'en' ? 'Commentary' : 'Komentar',
  analiza: language === 'en' ? 'Analysis' : 'Analiza',
  kolumna: language === 'en' ? 'Column' : 'Kolumna',
}[type] || 'Editorial');

if (!fs.existsSync(REGISTRY_PATH)) throw new Error(`Missing canonical registry: ${REGISTRY_PATH}`);
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const existing = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) : { items: [] };
const priorByPath = new Map((existing.items || []).map((item) => [item.path, item]));
const items = [];
let generated = 0;
let reused = 0;
let excluded = 0;
for (const entry of registry.items || []) {
  if (!['objava', 'komentar', 'analiza', 'kolumna'].includes(entry.type) || protectedPath(entry.path)) {
    excluded++;
    continue;
  }
  if (!entry.title || !entry.path) continue;
  const id = routeId(entry.path);
  const relativeImage = `/assets/editorial/generated/${id}.webp`;
  const output = path.join(OUTPUT_DIR, `${id}.webp`);
  const kicker = `${typeLabel(entry.type, entry.language)} · ${entry.author || 'AKTUAL MEDIA'}`;
  const previous = priorByPath.get(entry.path);
  if (FORCE || existing.artVersion !== ART_VERSION || !fs.existsSync(output) || previous?.image !== relativeImage || previous?.title !== entry.title || previous?.kicker !== kicker) {
    writeCoverWebp({
      title: entry.title,
      kicker,
      seed: `${entry.path}|${entry.title}`,
      type: entry.type,
    }, output);
    generated++;
  } else reused++;
  items.push({
    path: entry.path,
    type: entry.type,
    language: entry.language,
    title: entry.title,
    kicker,
    image: relativeImage,
    url: `${SITE}${relativeImage}`,
    alt: `${entry.language === 'en' ? 'Editorial illustration for' : 'Urednička ilustracija za tekst'}: ${entry.title}`,
    width: 1200,
    height: 630,
    creator: 'GNK ASG d.o.o. · lokalno generirana urednička ilustracija',
    license: 'GNK ASG original conceptual artwork; no third-party photograph included',
  });
}
items.sort((a, b) => a.path.localeCompare(b.path));
const manifestCore = {
  version: 'GNK_ASG_EDITORIAL_IMAGE_MANIFEST_V1',
  artVersion: ART_VERSION,
  policy: 'One unique local thematic cover per canonical editorial route; restricted SPT and banking paths are never touched.',
  total: items.length,
  excludedProtectedRoutes: excluded,
  items,
};
const stableExisting = JSON.stringify({ version: existing.version, artVersion: existing.artVersion, policy: existing.policy, total: existing.total, excludedProtectedRoutes: existing.excludedProtectedRoutes, items: existing.items || [] }) === JSON.stringify(manifestCore);
const manifest = { generatedAt: stableExisting ? existing.generatedAt : new Date().toISOString(), ...manifestCore };
fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ version: manifest.version, total: manifest.total, generated, reused, excludedProtectedRoutes: excluded, output: OUTPUT_DIR }, null, 2));
