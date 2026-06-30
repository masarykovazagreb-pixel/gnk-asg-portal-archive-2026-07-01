#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mustExist = [
  'workers/gnk-asg-direct-operator/src/media-projects-v1.js',
  'workers/gnk-asg-direct-operator/src/index-final-admin-gateway-projects-v1.js',
  'workers/gnk-asg-direct-operator/src/media-projects-ui-v1.js'
];

const requiredEndpoints = [
  '/api/media-command-center/projects',
  '/api/media-command-center/project',
  '/api/media-command-center/project-contacts',
  '/api/media-command-center/project-html',
  '/api/media-command-center/project-pdf',
  '/api/media-command-center/project-html-preview',
  '/api/media-command-center/project-pdf-preview',
  '/api/media-command-center/project-settings',
  '/api/media-command-center/project-preview',
  '/api/media-command-center/project-export'
];

const requiredTables = [
  'media_projects',
  'media_project_contacts',
  'media_project_events'
];

const requiredSafetyTokens = [
  'external_sending_enabled INTEGER NOT NULL DEFAULT 0',
  'external_sending_enabled=0',
  'MEDIA_OUTREACH_LIVE',
  "return'false'"
];

const requiredExportTokens = [
  'format=csv',
  'format=txt',
  'format=xlsx'
];

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`missing required file: ${rel}`);
  return fs.readFileSync(file, 'utf8');
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`missing ${label}: ${needle}`);
}

function main() {
  const files = Object.fromEntries(mustExist.map(rel => [rel, read(rel)]));
  const media = files['workers/gnk-asg-direct-operator/src/media-projects-v1.js'];
  const gateway = files['workers/gnk-asg-direct-operator/src/index-final-admin-gateway-projects-v1.js'];
  const ui = files['workers/gnk-asg-direct-operator/src/media-projects-ui-v1.js'];

  for (const endpoint of requiredEndpoints) assertIncludes(gateway, endpoint, 'gateway endpoint');
  for (const table of requiredTables) assertIncludes(media, table, 'D1 table');
  for (const token of requiredSafetyTokens) assertIncludes(`${media}\n${gateway}`, token, 'send lock token');
  for (const token of requiredExportTokens) assertIncludes(ui, token, 'UI export option');

  assertIncludes(media, 'MAX_CONTACTS=2000', 'contact cap');
  assertIncludes(media, 'MAX_PDF_BYTES=8*1024*1024', 'PDF cap');
  assertIncludes(media, 'MAX_HTML_BYTES=768*1024', 'HTML cap');
  assertIncludes(media, 'attempts INTEGER NOT NULL DEFAULT 0', 'attempt counter');
  assertIncludes(media, 'provider_message_id TEXT', 'provider message id');
  assertIncludes(media, 'last_error TEXT', 'recipient error field');
  assertIncludes(media, 'sent_at TEXT', 'recipient sent timestamp');
  assertIncludes(media, 'Math.max(30,Math.min(86400', 'interval clamp');
  assertIncludes(media, "send_status='NOT_QUEUED'", 'safe import status');
  assertIncludes(gateway, 'mediaOutreachBuildLock:true', 'version build lock');
  assertIncludes(gateway, 'x-gnk-asg-media-outreach-build-lock', 'response lock header');

  console.log(JSON.stringify({
    ok: true,
    checkedAt: new Date().toISOString(),
    files: mustExist.length,
    endpoints: requiredEndpoints.length,
    tables: requiredTables.length,
    safety: 'external sending locked; imports remain NOT_QUEUED'
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
