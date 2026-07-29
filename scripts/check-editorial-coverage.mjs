#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PLAN_DIR = path.join(ROOT, 'apps', 'portal', 'data', 'editorial-plan');
const REQUIRED_DAYS = Number(process.env.EDITORIAL_REQUIRED_DAYS || 7);
const REPLENISH_AT_DAYS = Number(process.env.EDITORIAL_REPLENISH_AT_DAYS || 2);
const TIME_ZONE = process.env.EDITORIAL_TIME_ZONE || 'Europe/Zagreb';

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function extractItems(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.content)) return value.content;
  return [];
}

function parseDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00Z` : text;
  const parsed = new Date(dateOnly);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function dateFromFilename(file) {
  const name = path.basename(file);
  const match = name.match(/^(\d{4})(\d{2})(\d{2})(?:-|\.)/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function zagrebDateKey(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

const todayKey = zagrebDateKey(new Date());
const allJsonFiles = walk(PLAN_DIR).filter((file) => file.endsWith('.json'));
const manifestFiles = allJsonFiles.filter((file) => path.basename(file) === 'manifest.json');
const files = allJsonFiles.filter((file) => path.basename(file) !== 'manifest.json');
const entries = [];
const invalid = [];

for (const manifestFile of manifestFiles) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    if (!Array.isArray(manifest?.packages)) {
      invalid.push({ file: path.relative(ROOT, manifestFile), reason: 'editorial manifest must contain packages array' });
    }
  } catch (error) {
    invalid.push({ file: path.relative(ROOT, manifestFile), reason: `invalid manifest JSON: ${error.message}` });
  }
}

for (const file of files) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    invalid.push({ file: path.relative(ROOT, file), reason: `invalid JSON: ${error.message}` });
    continue;
  }

  const fileDate = dateFromFilename(file);
  const items = extractItems(parsed);
  if (items.length === 0) {
    invalid.push({ file: path.relative(ROOT, file), reason: 'editorial plan contains no items' });
    continue;
  }

  for (const item of items) {
    const rawDate = item.publishAt || item.scheduledAt || item.publishDate || item.date || item.scheduled_date || fileDate;
    const date = parseDate(rawDate);
    if (!date) {
      invalid.push({ file: path.relative(ROOT, file), slug: item.slug || null, reason: 'missing or invalid publication date and filename has no YYYYMMDD prefix' });
      continue;
    }
    entries.push({
      file: path.relative(ROOT, file),
      slug: item.slug || null,
      type: item.type || 'unknown',
      dateKey: zagrebDateKey(date),
      rawDate,
      dateSource: rawDate === fileDate ? 'filename' : 'item'
    });
  }
}

const future = entries.filter((entry) => entry.dateKey >= todayKey);
const days = [...new Set(future.map((entry) => entry.dateKey))].sort();
const lastDay = days.at(-1) || null;

let consecutiveDays = 0;
if (days.length > 0) {
  const cursor = new Date(`${todayKey}T12:00:00Z`);
  const set = new Set(days);
  while (set.has(zagrebDateKey(cursor))) {
    consecutiveDays += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

const needsReplenishment = consecutiveDays <= REPLENISH_AT_DAYS;
const coverageOk = consecutiveDays >= REQUIRED_DAYS;
const duplicateSlots = [];
const slotMap = new Map();
for (const entry of future) {
  const key = `${entry.dateKey}:${entry.type}:${entry.slug || ''}`;
  const list = slotMap.get(key) || [];
  list.push(entry.file);
  slotMap.set(key, list);
}
for (const [slot, sourceFiles] of slotMap) {
  if (sourceFiles.length > 1) duplicateSlots.push({ slot, sourceFiles });
}

const report = {
  contract: 'GNK_ASG_EDITORIAL_COVERAGE_V1',
  timeZone: TIME_ZONE,
  today: todayKey,
  requiredDays: REQUIRED_DAYS,
  replenishAtDays: REPLENISH_AT_DAYS,
  files: files.length,
  manifestFiles: manifestFiles.length,
  scheduledItems: future.length,
  scheduledDays: days,
  consecutiveDays,
  lastScheduledDay: lastDay,
  coverageOk,
  needsReplenishment,
  invalid,
  duplicateSlots
};

console.log(JSON.stringify(report, null, 2));

if (invalid.length > 0 || duplicateSlots.length > 0 || !coverageOk) process.exit(1);
