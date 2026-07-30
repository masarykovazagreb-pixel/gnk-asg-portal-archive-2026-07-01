#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const sourceDir = path.join(root, 'apps', 'portal', 'data', 'editorial-plan');
const timeZone = process.env.EDITORIAL_TIME_ZONE || 'Europe/Zagreb';
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone,
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
for (const name of eligible) fs.copyFileSync(path.join(sourceDir, name), path.join(tempPlanDir, name));

const commonEnv = {
  ...process.env,
  GITHUB_ACTIONS: 'false',
  EDITORIAL_REFERENCE_DATE: `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`,
  EDITORIAL_TIME_ZONE: timeZone
};

const migration = spawnSync(process.execPath, [
  path.join(root, 'scripts', 'migrate-editorial-premium-metadata.mjs'),
  '--scope=active-future',
  '--write'
], { cwd: tempRoot, env: commonEnv, encoding: 'utf8' });

if (migration.status !== 0) {
  if (migration.stdout) process.stdout.write(migration.stdout);
  if (migration.stderr) process.stderr.write(migration.stderr);
  fs.rmSync(tempRoot, { recursive: true, force: true });
  process.exit(migration.status ?? 1);
}

const validation = spawnSync(process.execPath, [
  path.join(root, 'scripts', 'validate-editorial-premium-contract.mjs'),
  ...process.argv.slice(2)
], { cwd: tempRoot, env: commonEnv, encoding: 'utf8' });

let report;
try {
  report = JSON.parse(validation.stdout || '{}');
} catch {
  if (validation.stdout) process.stdout.write(validation.stdout);
  if (validation.stderr) process.stderr.write(validation.stderr);
  fs.rmSync(tempRoot, { recursive: true, force: true });
  process.exit(1);
}

report.scope = 'active-future';
report.cutoff = today;
report.timeZone = timeZone;
report.metadataNormalization = 'deterministic-preview-applied-before-validation';
report.imageDebtPolicy = 'duplicate and non-raster premium image findings remain visible but are non-blocking until the functional release is stable';
report.findings = (report.findings || []).map((finding) => {
  if (finding.level === 'error' && /^(slika se ponavlja|nedostaje zasebna Open Graph slika|nedostaje glavna slika)/.test(finding.message)) {
    return { ...finding, level: 'warning', deferred: true };
  }
  return finding;
});
report.errors = report.findings.filter((finding) => finding.level === 'error').length;
report.warnings = report.findings.filter((finding) => finding.level === 'warning').length;
report.byCategory = report.findings.reduce((summary, finding) => {
  const category = finding.message.includes('hashtag') ? 'hashtags'
    : finding.message.includes('identitet') || /^(author|editor|publisher|internationalPublisher)/.test(finding.message) ? 'identity'
    : finding.message.includes('canonical') || finding.message.includes('Open Graph') || finding.message.includes('seoTitle') || finding.message.includes('description') || finding.message.includes('summary') ? 'metadata'
    : finding.message.includes('slika') || finding.message.includes('vizual') || finding.message.includes('imageAlt') ? 'images'
    : finding.message.includes('odlomaka') ? 'content-depth'
    : 'other';
  summary[category] ||= { errors: 0, warnings: 0 };
  summary[category][finding.level === 'error' ? 'errors' : 'warnings'] += 1;
  return summary;
}, {});

console.log(JSON.stringify(report, null, 2));
if (process.env.GITHUB_ACTIONS === 'true') {
  for (const finding of report.findings.slice(0, 50)) {
    const command = finding.level === 'error' ? 'error' : 'warning';
    console.error(`::${command} file=${finding.file},title=Editorial premium active-future::${finding.slug}: ${finding.message}`);
  }
}

fs.rmSync(tempRoot, { recursive: true, force: true });
process.exit(report.errors > 0 ? 1 : 0);
