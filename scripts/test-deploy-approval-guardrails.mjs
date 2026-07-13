import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow=fs.readFileSync('.github/workflows/deploy-admin-auth-v6.yml','utf8');
const tool=fs.readFileSync('scripts/prepare-approved-deploy-v1.mjs','utf8');

assert.match(workflow,/approved_sha:/);
assert.match(workflow,/ref: \$\{\{ inputs\.approved_sha \}\}/);
assert.match(workflow,/git merge-base --is-ancestor "\$APPROVED_SHA" origin\/main/);
assert.match(workflow,/inputs\.confirm_production_deploy == 'DEPLOY_ADMIN_AUTH_V6'/);
assert.match(workflow,/group: gnk-asg-production-deploy/);
assert.match(workflow,/cancel-in-progress: false/);
assert.match(workflow,/x-gnk-explicit-html-route/);
assert.match(workflow,/production-verification-\$\{\{ inputs\.approved_sha \}\}/);
assert.match(workflow,/DEPLOY_REVISION:\$\{DEPLOY_SOURCE_SHA\}/);
assert.match(workflow,/GNK_RELEASE_COMPLETION_V7/);
assert.match(workflow,/__GNK_INDEX_DATA_RESILIENCE_V2__/);
assert.match(workflow,/__GNK_INDEX_EDITORIAL_ORDER_V3__/);
assert.match(workflow,/index-data-resilience-v1\.js\?v=20260713-resilience-v2/);
assert.match(workflow,/index-editorial-order-v1\.js\?v=20260713-editorial-v3/);
assert.doesNotMatch(workflow,/GNK_RELEASE_COMPLETION_V6/);
assert.doesNotMatch(workflow,/resilience\.js "\/data\/news\.json"/);

assert.match(tool,/branch!==\'main\'/);
assert.match(tool,/merge-base','--is-ancestor/);
assert.match(tool,/approved_sha=\$\{expectedSha\}/);
assert.match(tool,/GNK_ASG_DEPLOY_APPROVED/);
assert.match(tool,/--execute/);
assert.match(tool,/mode:execute\?'execute':'prepare-only'/);

console.log(JSON.stringify({ok:true,deployStarted:false,indexRuntime:'V7',guards:['exact-confirmation','approved-sha','main-only','clean-tree','ancestry','predeploy-tests','runtime-markers','route-ownership-evidence']},null,2));
