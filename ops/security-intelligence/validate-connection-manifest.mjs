#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';

const path = process.argv[2] || 'ops/security-intelligence/connection-manifest-v1.json';
const manifest = JSON.parse(fs.readFileSync(path, 'utf8'));
const fail = (message) => { console.error(`MANIFEST_INVALID: ${message}`); process.exitCode = 1; };
const assert = (condition, message) => { if (!condition) fail(message); };
const forbiddenValue = /(-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16})/;

assert(manifest.mode === 'PREP_ONLY', 'mode must remain PREP_ONLY');
assert(manifest.connection_policy?.actual_connect_requires_explicit_owner_approval === true, 'actual connect must require explicit owner approval');
assert(manifest.connection_policy?.private_leaked_stolen_or_classified_sources_forbidden === true, 'private/leaked/stolen/classified sources must remain forbidden');
assert(manifest.connection_policy?.secrets_in_repository_forbidden === true, 'secrets in repository must remain forbidden');
assert(manifest.connection_policy?.unknown_provenance_fail_closed === true, 'unknown provenance must fail closed');
assert(Array.isArray(manifest.sources) && manifest.sources.length > 0, 'sources must be non-empty');

const allowedStates = new Set(manifest.states || []);
const ids = new Set();
for (const [i, source] of manifest.sources.entries()) {
  const p = `sources[${i}]`;
  for (const key of ['id','name','category','state','endpoint_type','auth_model','allowed_use','prohibited_use','retention_class','polling_model','rate_limit_policy','schema_mapping','redaction_policy','sandbox_plan','kill_switch','rollback','acceptance_criteria','evidence_requirement','owner_gated']) {
    assert(Object.hasOwn(source, key), `${p} missing ${key}`);
  }
  assert(/^[a-z0-9-]+$/.test(source.id), `${p}.id must be a stable lowercase slug`);
  assert(!ids.has(source.id), `duplicate source id ${source.id}`);
  ids.add(source.id);
  assert(allowedStates.has(source.state), `${source.id} has invalid state ${source.state}`);
  assert(source.state !== 'CONNECTED', `${source.id} cannot be CONNECTED while mode=PREP_ONLY`);
  assert(source.owner_gated === true, `${source.id} must remain owner-gated for actual connection`);
  assert(Array.isArray(source.allowed_use) && source.allowed_use.length > 0, `${source.id} allowed_use required`);
  assert(Array.isArray(source.prohibited_use) && source.prohibited_use.length > 0, `${source.id} prohibited_use required`);
  assert(Array.isArray(source.acceptance_criteria) && source.acceptance_criteria.length > 0, `${source.id} acceptance_criteria required`);
}

function scan(value, trail='root') {
  if (typeof value === 'string' && forbiddenValue.test(value)) fail(`${trail} appears to contain secret material`);
  else if (Array.isArray(value)) value.forEach((v,i) => scan(v, `${trail}[${i}]`));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k,v]) => scan(v, `${trail}.${k}`));
}
scan(manifest);

const connected = manifest.promotion_gate?.connected_requires || [];
assert(connected.includes('READY_TO_CONNECT'), 'CONNECTED gate must require READY_TO_CONNECT');
assert(connected.includes('explicit owner approval'), 'CONNECTED gate must require explicit owner approval');

if (process.exitCode) process.exit(process.exitCode);
console.log(`MANIFEST_VALID: ${manifest.sources.length} source candidates; mode=${manifest.mode}; actual-connect=owner-gated`);
