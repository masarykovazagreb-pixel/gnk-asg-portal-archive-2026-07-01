#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const portalRoot = resolve(scriptDir, '..');
const repoRoot = resolve(portalRoot, '..', '..');

const results = [];

function ok(label) {
  results.push({ label, ok: true });
}

function assert(condition, label) {
  if (!condition) {
    results.push({ label, ok: false });
    throw new Error(label);
  }
  ok(label);
}

function file(relPath) {
  const fullPath = resolve(portalRoot, relPath);
  assert(existsSync(fullPath), `exists: apps/portal/${relPath}`);
  assert(statSync(fullPath).size > 0, `non-empty: apps/portal/${relPath}`);
  return readFileSync(fullPath);
}

function text(relPath) {
  return file(relPath).toString('utf8');
}

function repoText(relPath) {
  const fullPath = resolve(repoRoot, relPath);
  assert(existsSync(fullPath), `exists: ${relPath}`);
  assert(statSync(fullPath).size > 0, `non-empty: ${relPath}`);
  return readFileSync(fullPath, 'utf8');
}

function contains(source, needle, label) {
  assert(source.includes(needle), label || `contains: ${needle}`);
}

function indexOfOrFail(source, needle, label) {
  const index = source.indexOf(needle);
  assert(index >= 0, label || `contains: ${needle}`);
  return index;
}

function flattenKeys(value, prefix = '', output = []) {
  if (!value || typeof value !== 'object') return output;
  for (const key of Object.keys(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    output.push(path);
    flattenKeys(value[key], path, output);
  }
  return output;
}

try {
  const indexHtml = text('index.html');
  contains(indexHtml, '/the-code/', 'public index links to /the-code/');
  contains(indexHtml, 'gallery-bootstrap.js', 'gallery bootstrap remains referenced');
  contains(indexHtml, 'gallery-brand-safety.js', 'gallery brand safety remains referenced');

  const enIndex = text('en/index.html');
  contains(enIndex, '<html', 'EN index is valid HTML shell');

  const theCode = text('the-code/index.html');
  contains(theCode, 'THE CODE', 'THE CODE module exists');
  contains(theCode, 'New York', 'THE CODE New York reference exists');
  contains(theCode, '2026', 'THE CODE 2026 activation reference exists');

  const google = text('google46686328e30c759f.html').trim();
  assert(google === 'google-site-verification: google46686328e30c759f.html', 'Google verification file has exact expected content');

  const financeRaw = text('data/finance-kpi-2025.json');
  const finance = JSON.parse(financeRaw);
  assert(finance.currency === 'EUR', 'finance KPI currency is EUR');
  assert(Array.isArray(finance.rules?.excludedMetrics), 'finance KPI excludedMetrics rule exists');
  assert(finance.rules.excludedMetrics.includes('ROI'), 'finance KPI explicitly excludes ROI');
  assert(finance.rules.excludedMetrics.includes('ROA'), 'finance KPI explicitly excludes ROA');
  assert(finance.downloads?.every(item => item.href?.startsWith('/downloads/')), 'finance downloads use public /downloads/ paths');

  const financeKeysOutsideRules = flattenKeys({ ...finance, rules: { ...finance.rules, excludedMetrics: [] } })
    .map(item => item.toLowerCase());
  assert(!financeKeysOutsideRules.some(key => /(^|\.)roi($|\.)/.test(key) || /(^|\.)roa($|\.)/.test(key)), 'finance KPI has no ROI/ROA metric keys outside exclusion list');

  for (const item of finance.downloads || []) {
    const relPath = item.href.replace(/^\//, '');
    const pdf = file(relPath);
    assert(pdf.subarray(0, 5).toString('utf8') === '%PDF-', `valid PDF signature: apps/portal/${relPath}`);
  }

  const unified = repoText('workers/gnk-asg-direct-operator/src/index-unified-auth-v14.js');
  contains(unified, "import {", 'unified worker imports modules');
  contains(unified, 'handleMailStudioAdapter', 'unified worker includes mail studio adapter');
  contains(unified, "'/api/admin-mail-send'", 'admin mail send route is recognized');
  contains(unified, "path.startsWith('/api/mail-center/')", 'mail-center routes are protected');
  contains(unified, "path.startsWith('/api/mail-sync')", 'mail-sync routes are protected');
  contains(unified, "path.startsWith('/api/campaign-mailer')", 'campaign-mailer routes are protected');
  contains(unified, "bulkMail:false", 'backend status reports bulk mail disabled');
  contains(unified, "productionDeploy:false", 'backend status reports production deploy disabled');
  contains(unified, "'/media-application'", 'media application is public UI');

  const manualMail = repoText('workers/gnk-asg-direct-operator/src/manual-mail-service-v1.js');
  const confirmCheck = indexOfOrFail(manualMail, "clean(body.confirm)!=='SEND_MAIL'", 'manual mail requires SEND_MAIL confirmation');
  const liveCheck = indexOfOrFail(manualMail, 'MAIL_MANUAL_LIVE', 'manual mail requires MAIL_MANUAL_LIVE gate');
  const bindingCheck = indexOfOrFail(manualMail, 'env.EMAIL?.send', 'manual mail requires Email binding');
  const sendCall = indexOfOrFail(manualMail, 'env.EMAIL.send(payload)', 'manual mail has a single explicit provider send call');
  assert(confirmCheck < liveCheck && liveCheck < bindingCheck && bindingCheck < sendCall, 'mail send safety gate order is confirmation -> live flag -> binding -> send');
  contains(manualMail, 'MAX_RECIPIENTS=25', 'manual mail caps recipients at 25');
  contains(manualMail, 'MAX_ATTACHMENTS=8', 'manual mail caps attachments at 8');
  contains(manualMail, 'MAX_TOTAL_ATTACHMENT_BYTES=3400000', 'manual mail caps total attachment bytes');
  contains(manualMail, "MANDATORY_BCC.toLowerCase()", 'manual mail enforces mandatory BCC');
  contains(manualMail, "'exe'", 'manual mail blocks executable attachments');
  contains(manualMail, "'html'", 'manual mail blocks HTML attachments');
  contains(manualMail, "'js'", 'manual mail blocks JavaScript attachments');
  contains(manualMail, 'duplicate_recent_send', 'manual mail has duplicate-send protection');
  contains(manualMail, 'inboundConnected:false', 'manual mail explicitly marks inbox reading as disconnected');

  const adapter = repoText('workers/gnk-asg-direct-operator/src/mail-studio-adapter-v1.js');
  contains(adapter, "bulkMailLocked:true", 'mail-sync health reports bulk mail locked');
  contains(adapter, 'no external mailbox state was changed', 'mail state actions are review-safe');
  contains(adapter, "folder==='drafts'", 'mail adapter supports local/KV drafts');
  contains(adapter, "routedTo:'/api/admin-mail-send'", 'studio send route delegates to manual send service');

  const wrangler = repoText('workers/gnk-asg-direct-operator/wrangler.toml');
  contains(wrangler, 'directory = "../../apps/portal"', 'wrangler assets point to apps/portal');
  contains(wrangler, 'run_worker_first = true', 'wrangler runs worker before assets');

  console.log('SAFE MAIL + PORTAL SMOKE CHECKS PASSED');
  for (const result of results) console.log(`✓ ${result.label}`);
} catch (error) {
  console.error('SAFE MAIL + PORTAL SMOKE CHECKS FAILED');
  for (const result of results) console.error(`${result.ok ? '✓' : '✗'} ${result.label}`);
  console.error(error.message);
  process.exit(1);
}
