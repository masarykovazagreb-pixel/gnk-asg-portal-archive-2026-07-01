#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const queuePath = path.join(root, 'content', 'factory-queue', 'queue.json');
const calendarPath = path.join(root, 'apps', 'portal', 'data', 'publication-calendar.json');
const checkOnly = process.argv.includes('--check');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const queue = readJson(queuePath);
const calendar = readJson(calendarPath);
const skipped = new Set(Array.isArray(queue.skipped) ? queue.skipped : []);

if (!Array.isArray(calendar.items)) {
  throw new Error('publication-calendar.json must contain an items array');
}

const removed = calendar.items.filter((item) => skipped.has(item?.id));
const nextItems = calendar.items.filter((item) => !skipped.has(item?.id));

if (!removed.length) {
  console.log('publication calendar already matches queue skipped IDs');
  process.exit(0);
}

const removedIds = [...new Set(removed.map((item) => item.id))];

if (checkOnly) {
  console.error(`publication calendar contains skipped queue IDs: ${removedIds.join(', ')}`);
  process.exit(1);
}

const next = {
  ...calendar,
  items: nextItems,
  sourceOfTruth: 'content/factory-queue/queue.json',
  excludedByQueue: [...skipped].sort(),
};

fs.writeFileSync(calendarPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
console.log(`publication calendar synchronized; removed skipped IDs: ${removedIds.join(', ')}`);
