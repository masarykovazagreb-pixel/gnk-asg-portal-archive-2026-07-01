import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, validateRegistry, runAgents, checkCandidate } from '../apps/agents/operations/run-v1.mjs';

const registry = JSON.parse(readFileSync(join(ROOT, 'apps/agents/operations/agents-v1.json'), 'utf8'));
test('30 unique agents have bounded, fixed diagnostic commands and concrete tasks', () => {
  validateRegistry(registry);
  assert.equal(new Set(registry.agents.map(a => a.id)).size, 30);
  const altered = structuredClone(registry);
  altered.agents[0].command = ['node', 'scripts/apply-refresh-v1.mjs'];
  assert.throws(() => validateRegistry(altered), /Invalid agent/);
  assert.throws(() => runAgents(registry, 'O99'), /Unknown agent/);
});
test('runner reports success, failure, and timeouts without granting publication', () => {
  const ok = () => ({status: 0, stdout: '', stderr: ''});
  const result = runAgents(registry, 'O01', ok);
  assert.equal(result.complete, false);
  assert.equal(result.passed, 1);
  const failure = runAgents(registry, 'O02', () => ({status: null, signal: 'SIGTERM', error: new Error('timeout')}));
  assert.equal(failure.failed, 1);
  assert.equal(failure.agents[0].error, 'timeout');
});
test('metadata pass remains a human decision; invalid candidate fails closed', () => {
  const fake = ([script]) => ({status: 0, stdout: JSON.stringify(script.includes('prepublication')
    ? {reportType: 'editorial-prepublication-readiness', readiness: 'checks-complete-awaiting-separate-publication-decision', automaticPublishing: false, blockers: []}
    : {status: 'metadata-check-passed-needs-human-evidence', published: false, blockers: []}), stderr: ''});
  const result = checkCandidate('/tmp/candidate', '2026-10-19', fake);
  assert.equal(checkCandidate('/tmp/candidate', '2026-10-19', () => ({status: 0, stdout: '{}', stderr: ''})).status, 'blocked');
  assert.equal(result.status, 'metadata-passed-human-decision-required');
  assert.equal(result.published, false);
  assert.equal(result.approvalGranted, false);
  assert.throws(() => checkCandidate('/tmp/candidate', '2026-02-30', fake), /Invalid/);
  const dir = mkdtempSync(join(tmpdir(), 'operations-30-'));
  try {
    const candidate = join(dir, 'candidate.json');
    writeFileSync(candidate, '{}');
    const blocked = checkCandidate(candidate, '2026-10-19');
    assert.equal(blocked.status, 'blocked');
    assert.equal(blocked.published, false);
    assert.equal(blocked.checks.length, 2);
    assert.ok(blocked.checks.every(c => c.status === 'fail'));
    assert.equal(checkCandidate(join(dir, 'missing.json'), '2026-10-19').status, 'blocked');
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
