#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const manifestPath = process.argv[2] || path.join('ops', 'security-intelligence', 'connection-manifest-v1.json');
const requiredTop = ['schema_version', 'status_policy', 'global_controls', 'trust_tiers', 'sources', 'promotion_gate'];
const requiredSource = [
  'id', 'name', 'category', 'state', 'trust_tier', 'endpoint_type', 'auth_model',
  'polling_model', 'data_retention_class', 'allowed_use', 'prohibited_use', 'owner_gated',
  'sandbox_plan', 'rollback', 'acceptance_criteria', 'evidence_requirement'
];
const forbiddenKeyPattern = /(secret|token|password|credential|api[_-]?key|private[_-]?key)/i;
const forbiddenValuePattern = /(-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16})/;

function fail(message) {
  console.error(`MANIFEST_INVALID: ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function scanForSecrets(value, trail = 'root') {
  if (Array.isArray(value)) {
    value.forEach((item, i) => scanForSecrets(item, `${trail}[${i}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeyPattern.test(key) && typeof child === 'string' && child.trim()) {
      fail(`${trail}.${key} must not contain secret material`);
    }
    if (typeof child === 'string' && forbiddenValuePattern.test(child)) {
      fail(`${trail}.${key} appears to contain secret material`);
    }
    scanForSecrets(child, `${trail}.${key}`);
  }
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(`cannot parse ${manifestPath}: ${error.message}`);
  process.exit();
}

for (const key of requiredTop) assert(Object.hasOwn(manifest, key), `missing top-level key: ${key}`);

const allowedStates = new Set(manifest.status_policy?.allowed_states || []);
const trustTiers = new Set(Object.keys(manifest.trust_tiers || {}));
assert(allowedStates.size > 0, 'status_policy.allowed_states must be non-empty');
assert(trustTiers.size > 0, 'trust_tiers must be non-empty');
assert(manifest.global_controls?.mode === 'PREP_ONLY', 'global_controls.mode must remain PREP_ONLY');
assert(manifest.global_controls?.owner_gate_for_live_connect === true, 'live connect must remain owner-gated');
assert(manifest.status_policy?.connected_requires_owner_approval === true, 'CONNECTED must require owner approval');
assert(manifest.global_controls?.private_or_leaked_sources_forbidden === true, 'private/leaked sources must remain forbidden');
assert(manifest.global_controls?.secrets_in_manifest_forbidden === true, 'secrets in manifest must remain forbidden');
assert(Array.isArray(manifest.sources) && manifest.sources.length > 0, 'sources must be a non-empty array');

const seenIds = new Set();
for (const [index, source] of manifest.sources.entries()) {
  const prefix = `sources[${index}]`;
  for (const field of requiredSource) assert(Object.hasOwn(source, field), `${prefix} missing ${field}`);
  assert(typeof source.id === 'string' && /^[a-z0-9-]+$/.test(source.id), `${prefix}.id must be a stable lowercase slug`);
  assert(!seenIds.has(source.id), `duplicate source id: ${source.id}`);
  seenIds.add(source.id);
  assert(allowedStates.has(source.state), `${source.id}: state ${source.state} is not allowed`);
  assert(trustTiers.has(source.trust_tier), `${source.id}: unknown trust tier ${source.trust_tier}`);
  assert(Array.isArray(source.allowed_use) && source.allowed_use.length > 0, `${source.id}: allowed_use must be non-empty`);
  assert(Array.isArray(source.prohibited_use) && source.prohibited_use.length > 0, `${source.id}: prohibited_use must be non-empty`);
  assert(Array.isArray(source.acceptance_criteria) && source.acceptance_criteria.length > 0, `${source.id}: acceptance_criteria must be non-empty`);
  assert(typeof source.rollback === 'string' && source.rollback.trim(), `${source.id}: rollback must be defined`);
  assert(typeof source.sandbox_plan === 'string' && source.sandbox_plan.trim(), `${source.id}: sandbox_plan must be defined`);
  assert(typeof source.evidence_requirement === 'string' && source.evidence_requirement.trim(), `${source.id}: evidence_requirement must be defined`);
  if (source.state === 'CONNECTED') fail(`${source.id}: CONNECTED is forbidden while global mode is PREP_ONLY`);
  if (source.trust_tier === 'REJECT') assert(source.state === 'REJECTED' || source.state === 'BLOCKED', `${source.id}: REJECT tier cannot be active`);
}

const connectedRequires = manifest.promotion_gate?.connected_requires || [];
assert(Array.isArray(connectedRequires), 'promotion_gate.connected_requires must be an array');
assert(connectedRequires.includes('explicit owner approval'), 'connected gate must include explicit owner approval');
assert(connectedRequires.includes('READY_TO_CONNECT'), 'connected gate must require READY_TO_CONNECT');

scanForSecrets(manifest);

if (process.exitCode) process.exit(process.exitCode);
console.log(`MANIFEST_VALID: ${manifest.sources.length} sources; mode=${manifest.global_controls.mode}; live-connect=owner-gated`);
