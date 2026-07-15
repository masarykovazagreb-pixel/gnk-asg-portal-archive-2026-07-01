import assert from 'node:assert/strict';
import fs from 'node:fs';

const expectedBase = 'f9c97c178341687e2265e569946d09d9aa066624';
const workflow = fs.readFileSync('.github/workflows/deploy-admin-auth-v6.yml', 'utf8');
const verifier = fs.readFileSync('scripts/verify-production-release-v38.sh', 'utf8');
const releaseWorker = fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js', 'utf8');

for (const marker of [
  'DEPLOY_ADMIN_AUTH_V6',
  'approved_sha',
  'Verify exact approved release source',
  'Validate current V38 release package',
  'verify-production-release-v38.sh'
]) {
  assert.ok(workflow.includes(marker), `missing deploy guardrail marker: ${marker}`);
}

for (const marker of [
  'x-gnk-deploy-revision',
  'x-gnk-active-release',
  'x-gnk-active-entrypoint'
]) {
  assert.ok(verifier.includes(marker), `missing V38 verifier marker: ${marker}`);
}

assert.ok(
  releaseWorker.includes('GNK_ASG_UNIFIED_AUTH_V38_RELEASE_PROOF_NEWS_SOURCE_LINKS'),
  'current V38 release worker marker missing'
);

console.log(JSON.stringify({
  ok: true,
  auditOnly: true,
  expectedBase,
  deployStarted: false,
  mailSent: false,
  productionMutation: false
}, null, 2));
