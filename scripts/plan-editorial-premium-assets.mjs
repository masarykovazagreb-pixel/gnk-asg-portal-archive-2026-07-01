#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const remediationPath = process.argv[2] || 'ops/evidence/editorial-premium-remediation.json';
const outputJsonPath = process.argv[3] || 'ops/evidence/editorial-premium-assets.json';
const outputMarkdownPath = process.argv[4] || 'ops/evidence/editorial-premium-assets.md';

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(ROOT, file), 'utf8'));
}

function entries(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.content)) return value.content;
  return [];
}

function safeSlug(value, fallback) {
  const normalized = String(value || fallback || 'editorial-item')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'editorial-item';
}

function recordHorizon(record) {
  return String(record?.horizon || record?.priority || '').trim().toLowerCase();
}

function assetRecord(fileRecord, item, index) {
  const slug = safeSlug(item.slug || item.title, `item-${index + 1}`);
  const base = `/assets/editorial-premium/${fileRecord.date || 'undated'}/${slug}`;
  return {
    priority: recordHorizon(fileRecord),
    date: fileRecord.date || null,
    sourceFile: fileRecord.file,
    index,
    slug,
    title: item.title || slug,
    section: item.section || null,
    currentHeroImage: item.image || item.heroImage || null,
    requiredHeroImage: `${base}-hero.webp`,
    requiredOgImage: `${base}-og.webp`,
    heroDimensions: '1600x900',
    ogDimensions: '1200x630',
    altText: item.imageAlt || null,
    productionBrief: [
      item.title || slug,
      item.section ? `Tema: ${item.section}.` : null,
      item.description || item.summary || null,
      'Vizual mora biti originalan, bez generičkih stock motiva, bez teksta u slici i usklađen s crno-zlatnim GNK ASG identitetom.'
    ].filter(Boolean).join(' ')
  };
}

const remediation = readJson(remediationPath);
const selectedFiles = remediation.files.filter((record) => ['active', 'future'].includes(recordHorizon(record)));
const assets = [];

for (const fileRecord of selectedFiles) {
  const source = readJson(fileRecord.file);
  entries(source).forEach((item, index) => assets.push(assetRecord(fileRecord, item, index)));
}

const duplicateTargets = [...assets.reduce((map, item) => {
  for (const target of [item.requiredHeroImage, item.requiredOgImage]) {
    map.set(target, (map.get(target) || 0) + 1);
  }
  return map;
}, new Map()).entries()].filter(([, count]) => count > 1);

if (duplicateTargets.length > 0) {
  throw new Error(`Asset plan contains duplicate target paths: ${duplicateTargets.map(([target]) => target).join(', ')}`);
}

const report = {
  contract: 'GNK_ASG_EDITORIAL_PREMIUM_ASSET_PLAN_V1',
  referenceDate: remediation.referenceDate,
  sourceDigest: remediation.sourceDigest,
  mutateContent: false,
  selectedFiles: selectedFiles.length,
  assetPairs: assets.length,
  requiredFiles: assets.length * 2,
  policy: {
    scope: ['active', 'future'],
    heroFormat: 'WebP',
    ogFormat: 'WebP',
    uniquePaths: true,
    note: 'Plan ne stvara niti zamjenjuje slike. Definira jedinstvene ciljne putanje i produkcijske briefove za ručno ili odobreno generiranje.'
  },
  assets
};

fs.mkdirSync(path.dirname(path.resolve(ROOT, outputJsonPath)), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, outputJsonPath), `${JSON.stringify(report, null, 2)}\n`);

const rows = assets.map((item) => `| ${item.priority} | ${item.date || '-'} | ${item.slug} | \`${item.requiredHeroImage}\` | \`${item.requiredOgImage}\` |`);
const markdown = [
  '# Editorial Premium Asset Production Plan',
  '',
  `Referentni datum: **${report.referenceDate}**`,
  `Aktivne i buduće stavke: **${report.assetPairs}**`,
  `Potrebne jedinstvene datoteke: **${report.requiredFiles}**`,
  '',
  '> Ovaj plan je read-only. Ne generira lažne vizuale, ne duplicira postojeće slike i ne mijenja editorial sadržaj.',
  '',
  '| Prioritet | Datum | Slug | Hero 1600×900 | OG 1200×630 |',
  '|---|---|---|---|---|',
  ...rows,
  ''
].join('\n');
fs.writeFileSync(path.resolve(ROOT, outputMarkdownPath), markdown);

console.log(JSON.stringify({ selectedFiles: report.selectedFiles, assetPairs: report.assetPairs, requiredFiles: report.requiredFiles }));
