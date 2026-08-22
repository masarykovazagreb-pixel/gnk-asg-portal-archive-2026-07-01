import fs from 'node:fs';

const path = 'config/master-nn-reconciliation-v1.json';
const raw = fs.readFileSync(path, 'utf8');
const data = JSON.parse(raw);

const errors = [];
const sha40 = /^[0-9a-f]{40}$/;

if (data.version !== 'MASTER_NN_RECONCILIATION_V1') errors.push('unexpected version');
if (!sha40.test(data.createdFromMainSha || '')) errors.push('createdFromMainSha must be a 40-char lowercase SHA');
if (!data.canonicalBranch) errors.push('canonicalBranch missing');
if (!Number.isInteger(data.canonicalPullRequest)) errors.push('canonicalPullRequest must be integer');
if (!Array.isArray(data.sourcePullRequests) || data.sourcePullRequests.length < 3) errors.push('sourcePullRequests incomplete');
for (const pr of data.sourcePullRequests || []) {
  if (!Number.isInteger(pr.number)) errors.push('PR number must be integer');
  if (!sha40.test(pr.headSha || '')) errors.push(`PR ${pr.number ?? '?'} headSha invalid`);
  if (!Array.isArray(pr.scope) || pr.scope.length === 0) errors.push(`PR ${pr.number ?? '?'} scope missing`);
  if (pr.superseded !== true) errors.push(`PR ${pr.number ?? '?'} must be marked superseded`);
}
for (const key of ['singleWriter', 'exactShaCheck', 'serializedMigration', 'targetedCiRequired', 'reviewBeforeMerge', 'noBlindReruns', 'noFakeGreen']) {
  if (data.rules?.[key] !== true) errors.push(`rule ${key} must be true`);
}
if (!Array.isArray(data.migrationOrder) || data.migrationOrder.at(-1) !== 'integration-e2e') errors.push('migration order must end with integration-e2e');

if (errors.length) {
  console.error('MASTER/NN reconciliation validation failed:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`MASTER/NN reconciliation manifest valid for base ${data.createdFromMainSha}, canonical PR #${data.canonicalPullRequest}`);
