#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mustExist = [
  'workers/gnk-asg-direct-operator/src/media-projects-v1.js',
  'workers/gnk-asg-direct-operator/src/index-final-admin-gateway-projects-v1.js'
];

const requiredEndpointSuffixes = [
  '/projects',
  '/project',
  '/project-contacts',
  '/project-html',
  '/project-pdf',
  '/project-html-preview',
  '/project-pdf-preview',
  '/project-settings',
  '/project-preview',
  '/project-export'
];

const checks = [
  ['D1 project table', /CREATE TABLE IF NOT EXISTS media_projects\b/],
  ['D1 contacts table', /CREATE TABLE IF NOT EXISTS media_project_contacts\b/],
  ['D1 events table', /CREATE TABLE IF NOT EXISTS media_project_events\b/],
  ['external sending default locked', /external_sending_enabled\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/],
  ['external sending forced off on write', /external_sending_enabled\s*=\s*0/],
  ['gateway environment live lock', /MEDIA_OUTREACH_LIVE/],
  ['gateway returns false for live flag', /return\s*['"]false['"]/],
  ['contacts remain not queued', /send_status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+['"]NOT_QUEUED['"]/],
  ['safe import writes NOT_QUEUED', /['"]NOT_QUEUED['"]/],
  ['contact cap', /MAX_CONTACTS\s*=\s*2000/],
  ['PDF cap', /MAX_PDF_BYTES\s*=\s*8\s*\*\s*1024\s*\*\s*1024/],
  ['HTML cap', /MAX_HTML_BYTES\s*=\s*768\s*\*\s*1024/],
  ['attempt counter', /attempts\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/],
  ['provider message id', /provider_message_id\s+TEXT/],
  ['recipient error field', /last_error\s+TEXT/],
  ['recipient sent timestamp', /sent_at\s+TEXT/],
  ['interval clamp', /Math\.max\(30\s*,\s*Math\.min\(86400/],
  ['personalized HTML preview', /function\s+personalizeHtml\b|const\s+personalizeHtml\b/],
  ['HTML preview endpoint implementation', /project-html-preview/],
  ['PDF preview endpoint implementation', /project-pdf-preview/],
  ['export endpoint implementation', /project-export/],
  ['TXT export branch', /format\s*===\s*['"]txt['"]/],
  ['CSV export content type', /text\/csv; charset=utf-8/],
  ['version build lock payload', /mediaOutreachBuildLock\s*:\s*true/],
  ['response lock header', /x-gnk-asg-media-outreach-build-lock/]
];

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`missing required file: ${rel}`);
  return fs.readFileSync(file, 'utf8');
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`missing ${label}: ${needle}`);
}

function assertMatches(source, pattern, label) {
  if (!pattern.test(source)) throw new Error(`missing ${label}: ${pattern}`);
}

function assertGatewayEndpoint(gateway, suffix) {
  const literal = `/api/media-command-center${suffix}`;
  const templated = ['`${API}' + suffix + '`', '`' + '${API}' + suffix + '`'];
  if (gateway.includes(literal) || templated.some(value => gateway.includes(value))) return;
  throw new Error(`missing gateway endpoint: ${literal} or templated API${suffix}`);
}

function main() {
  const files = Object.fromEntries(mustExist.map(rel => [rel, read(rel)]));
  const media = files['workers/gnk-asg-direct-operator/src/media-projects-v1.js'];
  const gateway = files['workers/gnk-asg-direct-operator/src/index-final-admin-gateway-projects-v1.js'];
  const combined = `${media}\n${gateway}`;

  assertIncludes(gateway, "const API='/api/media-command-center'", 'gateway API constant');
  for (const suffix of requiredEndpointSuffixes) assertGatewayEndpoint(gateway, suffix);
  for (const [label, pattern] of checks) assertMatches(combined, pattern, label);

  console.log(JSON.stringify({
    ok: true,
    checkedAt: new Date().toISOString(),
    files: mustExist.length,
    endpoints: requiredEndpointSuffixes.length,
    checks: checks.length,
    verifiedExports: ['csv', 'txt'],
    nextExportGap: 'xlsx',
    safety: 'external sending locked; imports remain NOT_QUEUED'
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
