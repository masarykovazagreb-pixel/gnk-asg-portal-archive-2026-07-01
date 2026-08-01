#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const script = readFileSync('scripts/devto-publish-resilient-v1.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/devto-mirror-publish.yml', 'utf8');

const requiredScript = [
  "LIVE_REQUESTED && API_KEY.length > 0",
  "blocked-missing-secret",
  "canonicalIsLive",
  "canonical_url: SITE + canonicalPath",
  "state.posted[entry.canonicalPath]",
  "MAX_ATTEMPTS",
  "HEALTH",
];
const requiredWorkflow = [
  "concurrency:",
  "cancel-in-progress: false",
  "node-version: '24'",
  "DEVTO_API_KEY: ${{ secrets.DEVTO_API_KEY }}",
  "workflow_dispatch:",
  "schedule:",
  "git push origin HEAD:main",
];

const failures = [];
for (const token of requiredScript) if (!script.includes(token)) failures.push(`script missing: ${token}`);
for (const token of requiredWorkflow) if (!workflow.includes(token)) failures.push(`workflow missing: ${token}`);

if (/continue-on-error:\s*true/.test(workflow)) failures.push('workflow must not hide publish failures');
if (/DEVTO_API_KEY\s*=\s*['\"][^$]/.test(workflow)) failures.push('workflow contains a literal API key');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Dev.to mirror contract is valid.');
