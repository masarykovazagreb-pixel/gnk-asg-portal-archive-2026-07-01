import fs from 'node:fs';
import assert from 'node:assert/strict';

const helper=fs.readFileSync('scripts/deploy-direct-operator-with-retry-v1.sh','utf8');
const workflow=fs.readFileSync('.github/workflows/deploy-admin-auth-v6.yml','utf8');

for(const marker of [
  'MAX_ATTEMPTS=3',
  'wrangler@4.112.0 deploy',
  "2) delay=30",
  "3) delay=90",
  'assets-upload-session',
  'code: 10013',
  'deploy-wrangler-logs',
  '[REDACTED_TOKEN_HASH]'
]) assert.ok(helper.includes(marker),`retry helper marker missing: ${marker}`);

for(const marker of [
  'bash ../../scripts/deploy-direct-operator-with-retry-v1.sh',
  'name: deploy-wrangler-logs-${{ inputs.approved_sha }}',
  'path: deploy-wrangler-logs',
  'if: always()'
]) assert.ok(workflow.includes(marker),`workflow retry contract missing: ${marker}`);

assert.ok(workflow.includes("inputs.confirm_production_deploy == 'DEPLOY_ADMIN_AUTH_V6'"),'production approval gate changed');
assert.ok(workflow.includes('require_eq "$(git rev-parse origin/main)" "$APPROVED_SHA"'),'exact main SHA gate changed');
console.log(JSON.stringify({ok:true,maxAttempts:3,backoffSeconds:[30,90],retryOnlyForCloudflareAssets10013:true,logsUploaded:true,approvalGatePreserved:true},null,2));
