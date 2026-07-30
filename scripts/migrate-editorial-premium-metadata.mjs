#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PLAN_DIR = path.join(ROOT, 'apps', 'portal', 'data', 'editorial-plan');
const WRITE = process.argv.includes('--write');
const SCOPE_ARG = process.argv.find((arg) => arg.startsWith('--scope='));
const SCOPE = SCOPE_ARG ? SCOPE_ARG.slice('--scope='.length) : 'active-future';
const REFERENCE_DATE = String(process.env.EDITORIAL_REFERENCE_DATE || new Date().toISOString().slice(0, 10)).replaceAll('-', '');

const REQUIRED_HASHTAGS = ['#NerminSefić', '#NerminSefic', '#GNKASG', '#GNKASGdoo', '#GNKDINAMOLtd'];
const VALID_SCOPES = new Set(['active', 'future', 'active-future', 'all']);

if (!VALID_SCOPES.has(SCOPE)) {
  console.error(`Nepoznat scope: ${SCOPE}. Dopušteno: ${[...VALID_SCOPES].join(', ')}`);
  process.exit(2);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function horizonFor(file) {
  const match = path.basename(file).match(/(20\d{6})/);
  if (!match) return 'undated';
  if (match[1] < REFERENCE_DATE) return 'legacy';
  if (match[1] === REFERENCE_DATE) return 'active';
  return 'future';
}

function inScope(horizon) {
  if (SCOPE === 'all') return true;
  if (SCOPE === 'active-future') return horizon === 'active' || horizon === 'future';
  return horizon === SCOPE;
}

function asEntries(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.content)) return value.content;
  return null;
}

function normalizeItem(item) {
  const next = { ...item };
  const changes = [];
  const setIfMissing = (field, value) => {
    if (value == null || value === '') return;
    if (String(next[field] || '').trim()) return;
    next[field] = value;
    changes.push(field);
  };

  setIfMissing('author', 'Nermin Sefić');
  setIfMissing('editor', 'Nermin Sefić');
  setIfMissing('publisher', 'GNK ASG d.o.o.');
  setIfMissing('internationalPublisher', 'GNK DINAMO Ltd.');

  const hashtags = Array.isArray(next.hashtags) ? [...next.hashtags] : [];
  for (const tag of REQUIRED_HASHTAGS) {
    if (!hashtags.includes(tag)) hashtags.push(tag);
  }
  if (JSON.stringify(hashtags) !== JSON.stringify(next.hashtags || [])) {
    next.hashtags = hashtags;
    changes.push('hashtags');
  }

  setIfMissing('description', next.summary || '');
  setIfMissing('summary', next.description || '');
  setIfMissing('seoTitle', next.title ? `${next.title} | GNK ASG` : '');
  setIfMissing('canonical', next.slug ? `https://gnk-asg.hr/objave/${next.slug}/` : '');
  setIfMissing('ogTitle', next.title || '');
  setIfMissing('ogDescription', next.description || next.summary || '');
  setIfMissing('ogImage', next.image || next.heroImage || '');

  return { next, changes: [...new Set(changes)] };
}

const files = walk(PLAN_DIR).filter((file) => file.endsWith('.json'));
const report = {
  contract: 'GNK_ASG_EDITORIAL_PREMIUM_METADATA_MIGRATION_V1',
  mode: WRITE ? 'write' : 'dry-run',
  scope: SCOPE,
  referenceDate: REFERENCE_DATE,
  scannedFiles: 0,
  eligibleFiles: 0,
  changedFiles: 0,
  changedItems: 0,
  changesByField: {},
  files: []
};

for (const file of files) {
  report.scannedFiles += 1;
  const horizon = horizonFor(file);
  if (!inScope(horizon)) continue;
  report.eligibleFiles += 1;

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`${path.relative(ROOT, file)}: neispravan JSON: ${error.message}`);
    process.exitCode = 1;
    continue;
  }

  const entries = asEntries(parsed);
  if (!entries) continue;

  const itemReports = [];
  const migrated = entries.map((item, index) => {
    const { next, changes } = normalizeItem(item);
    if (changes.length) {
      report.changedItems += 1;
      for (const field of changes) report.changesByField[field] = (report.changesByField[field] || 0) + 1;
      itemReports.push({ index, slug: item.slug || null, fields: changes });
    }
    return next;
  });

  if (!itemReports.length) continue;
  report.changedFiles += 1;
  report.files.push({ file: path.relative(ROOT, file), horizon, items: itemReports });

  if (WRITE) {
    const output = Array.isArray(parsed) ? migrated : Array.isArray(parsed.items) ? { ...parsed, items: migrated } : { ...parsed, content: migrated };
    fs.writeFileSync(file, `${JSON.stringify(output, null, 2)}\n`);
  }
}

console.log(JSON.stringify(report, null, 2));

if (WRITE) {
  console.error(`Migracija završena: ${report.changedFiles} datoteka, ${report.changedItems} stavki.`);
} else {
  console.error(`Dry-run: ${report.changedFiles} datoteka i ${report.changedItems} stavki zahtijevaju determinističku metadata migraciju.`);
}
