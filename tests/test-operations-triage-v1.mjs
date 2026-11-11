import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, runAgents } from '../apps/agents/operations/run-v1.mjs';
import { makeTriage } from '../apps/agents/operations/triage-v1.mjs';

const registry = JSON.parse(readFileSync(join(ROOT, 'apps/agents/operations/agents-v1.json'), 'utf8'));
const sha = 'a'.repeat(40);
const fakePass = () => ({status: 0, stdout: '', stderr: ''});

test('partial and missing results remain unknown, not passed or fixed', () => {
  const report = {...runAgents(registry, 'O01', fakePass), sourceSha: sha};
  const result = makeTriage(registry, report, sha);
  assert.deepEqual(result.summary, {totalAgents:30, checked:1, passed:1, failed:0, notRun:29, tasks:29});
  assert.equal(result.reportState, 'partial');
  assert.ok(result.tasks.every(t => t.state === 'not-run' && t.humanReviewRequired && !t.autoFix && !t.autoPublish));
  assert.equal(makeTriage(registry, null, sha).summary.notRun, 30);
});
test('failures become stable tasks without echoing arbitrary output or granting approval', () => {
  const report = {...runAgents(registry, undefined, ([file]) => file.includes('ai-act') ? {status:1, stderr:'secret text', stdout:''} : fakePass()), sourceSha: sha};
  const a = makeTriage(registry, report, sha);
  assert.equal(a.summary.failed, 1);
  assert.equal(a.tasks[0].id, 'OPS-TRIAGE-O06');
  assert.equal(a.tasks[0].priority, 1);
  assert.equal(a.tasks[0].state, 'investigate');
  assert.equal(JSON.stringify(a).includes('secret text'), false);
  assert.deepEqual(a, makeTriage(registry, report, sha));
});
test('rejects malformed, stale, tampered and dishonest complete reports', () => {
  const report = {...runAgents(registry, 'O01', fakePass), sourceSha: sha};
  assert.throws(() => makeTriage(registry, report, 'b'.repeat(40)), /wrong-revision/);
  assert.throws(() => makeTriage(registry, {...report, complete:true}, sha), /missing/);
  assert.throws(() => makeTriage(registry, {...report, passed:2}, sha), /counts/);
  assert.throws(() => makeTriage(registry, {...report, agents:[...report.agents,...report.agents]}, sha), /duplicate/);
  const tampered = structuredClone(report); tampered.agents[0].command[1] = 'scripts/apply-refresh-v1.mjs';
  assert.throws(() => makeTriage(registry, tampered, sha), /Invalid/);
  assert.throws(() => makeTriage(registry, null, 'short'), /SHA/);
});
