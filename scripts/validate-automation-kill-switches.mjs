#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const controlPath = path.join(root, 'ops/automation-control-v1.json');
const switchesPath = path.join(root, 'ops/automation-kill-switches.json');

const fail = (message) => {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
};

for (const file of [controlPath, switchesPath]) {
  if (!fs.existsSync(file)) fail(`Missing required control file: ${path.relative(root, file)}`);
}
if (process.exitCode) process.exit(process.exitCode);

const control = JSON.parse(fs.readFileSync(controlPath, 'utf8'));
const switches = JSON.parse(fs.readFileSync(switchesPath, 'utf8'));

if (switches.defaultMode !== 'hold') fail('defaultMode must remain hold while PR is in stabilization.');
if (control.recoveryCheckpoint?.branch !== switches.checkpoint?.branch) fail('Checkpoint branch mismatch.');
if (control.recoveryCheckpoint?.sha !== switches.checkpoint?.sha) fail('Checkpoint SHA mismatch.');

if (typeof switches.releaseFence?.enabled !== 'boolean') fail('releaseFence.enabled must be boolean.');
if (!switches.releaseFence?.reason) fail('releaseFence.reason is required.');

const requiredChannels = [
  'portalPublish',
  'bloggerPublish',
  'devtoPublish',
  'linkedinPublish',
  'mailSend',
  'newsWrite',
  'marketRefresh',
  'backupMirror',
  'workerTelemetry'
];
for (const channel of requiredChannels) {
  if (!Object.hasOwn(switches.channels ?? {}, channel)) fail(`Missing channel kill-switch: ${channel}`);
  if (typeof switches.channels?.[channel]?.enabled !== 'boolean') fail(`Kill-switch ${channel} must define boolean enabled.`);
  if (!switches.channels?.[channel]?.reason) fail(`Kill-switch ${channel} must define a reason.`);
}

for (const channel of ['portalPublish', 'bloggerPublish', 'linkedinPublish', 'mailSend']) {
  if (switches.channels?.[channel]?.enabled !== false) fail(`${channel} must remain disabled during stabilization.`);
}
if (switches.channels?.newsWrite?.enabled !== true) fail('newsWrite must be enabled for the canonical GNK News Refresh V2 single writer.');
if (switches.channels?.workerTelemetry?.enabled !== true) fail('workerTelemetry must remain enabled for observation-only telemetry.');
if (switches.releaseRules?.requireGreenPremiumContract !== true) fail('Premium contract must be required before release.');
if (switches.releaseRules?.requireCanonical200BeforeSyndication !== true) fail('Canonical HTTP 200 must be required before syndication.');
if (switches.releaseRules?.requireExternalPostIdForSuccess !== true) fail('External post ID must be required for publication success.');
if (switches.releaseRules?.requireIdempotencyKey !== true) fail('Idempotency key must be required.');
if (switches.releaseRules?.forbidActionEndpointSmokePost !== true) fail('Action endpoint smoke POST must remain forbidden.');

const safeMethods = switches.releaseRules?.safeHealthMethods ?? [];
for (const method of ['GET', 'HEAD', 'OPTIONS']) {
  if (!safeMethods.includes(method)) fail(`Missing safe health method: ${method}`);
}
if (safeMethods.some((method) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method))) {
  fail('Mutating HTTP methods are forbidden in safeHealthMethods.');
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`Automation kill-switch contract is valid; release fence is ${switches.releaseFence.enabled ? 'ACTIVE' : 'inactive'}.`);
