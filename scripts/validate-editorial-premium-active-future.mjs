#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const sourceDir = path.join(root, 'apps', 'portal', 'data', 'editorial-plan');
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: process.env.EDITORIAL_TIME_ZONE || 'Europe/Zagreb',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date()).replaceAll('-', '');

const eligible = fs.readdirSync(sourceDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /^\d{8}.*\.json$/i.test(entry.name))
  .filter((entry) => entry.name.slice(0, 8) >= today)
  .map((entry) => entry.name)
  .sort();

if (eligible.length === 0) {
  console.error(`No active or future editorial plans found for cutoff ${today}.`);
  process.exit(1);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gnk-editorial-premium-'));
const tempPlanDir = path.join(tempRoot, 'apps', 'portal', 'data', 'editorial-plan');
fs.mkdirSync(tempPlanDir, { recursive: true });

for (const name of eligible) {
  fs.copyFileSync(path.join(sourceDir, name), path.join(tempPlanDir, name));
}

const validator = path.join(root, 'scripts', 'validate-editorial-premium-contract.mjs');
const result = spawnSync(process.execPath, [validator, ...process.argv.slice(2)], {
  cwd: tempRoot,
  env: {
    ...process.env,
    EDITORIAL_PREMIUM_SCOPE: 'active-future',
    EDITORIAL_PREMIUM_CUTOFF: today,
    EDITORIAL_PREMIUM_ELIGIBLE_FILES: String(eligible.length)
  },
  encoding: 'utf8'
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

fs.rmSync(tempRoot, { recursive: true, force: true });
process.exit(result.status ?? 1);
