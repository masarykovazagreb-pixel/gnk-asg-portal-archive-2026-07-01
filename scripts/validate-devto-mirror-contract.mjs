#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const script = readFileSync('scripts/devto-publish-resilient-v1.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/devto-mirror-publish.yml', 'utf8');
const globalControl = JSON.parse(readFileSync('ops/automation-control-v1.json', 'utf8'));
const devtoControl = JSON.parse(readFileSync('ops/devto-mirror-control-v1.json', 'utf8'));
const switches = JSON.parse(readFileSync('ops/automation-kill-switches.json', 'utf8'));

const requiredScript = [
  "LIVE_REQUESTED && API_KEY.length > 0",
  "blocked-missing-secret",
  "blocked-kill-switch",
  "devtoPublishEnabled",
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
  "permissions:\n  contents: read",
  "workflow_dispatch:",
  "schedule:",
  "Preview queue without secrets",
  "actions/upload-artifact@v4",
];

const failures = [];
for (const token of requiredScript) if (!script.includes(token)) failures.push(`script missing: ${token}`);
for (const token of requiredWorkflow) if (!workflow.includes(token)) failures.push(`workflow missing: ${token}`);

if (/continue-on-error:\s*true/.test(workflow)) failures.push('workflow must not hide preview failures');
if (/DEVTO_API_KEY/.test(workflow)) failures.push('preview workflow must not access DEVTO_API_KEY');
if (/git\s+push/.test(workflow)) failures.push('new Dev.to automation must not push directly to main');
if (/contents:\s*write/.test(workflow)) failures.push('scheduled preview must remain read-only');

if (globalControl.globalRules?.directWritesToMainForbiddenForNewAutomation !== true) failures.push('direct-write protection is not enabled');
if (devtoControl.schedule?.mode !== 'read-only-preview') failures.push('Dev.to control must register read-only preview mode');
if (devtoControl.permissions?.directWriteToMain !== false) failures.push('Dev.to control must forbid direct writes to main');
if (devtoControl.livePublishing?.enabledByDefault !== false) failures.push('Dev.to live publishing must default to disabled');
if (devtoControl.livePublishing?.requiredGlobalKillSwitch !== 'devtoPublish') failures.push('Dev.to control must reference the global channel kill switch');
if (switches.channels?.devtoPublish?.enabled !== false) failures.push('Dev.to live kill switch must default to disabled');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Dev.to mirror contract is valid and read-only by default.');
