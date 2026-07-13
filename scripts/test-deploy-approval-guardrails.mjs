import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow=fs.readFileSync('.github/workflows/deploy-admin-auth-v6.yml','utf8');
const tool=fs.readFileSync('scripts/prepare-approved-deploy-v1.mjs','utf8');
const preflight=fs.readFileSync('scripts/check-newsroom-route-readiness.sh','utf8');
const verifier=fs.readFileSync('scripts/verify-production-route.sh','utf8');
const publicWorker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js','utf8');

assert.match(workflow,/approved_sha:/);
assert.match(workflow,/ref: \$\{\{ inputs\.approved_sha \}\}/);
assert.match(workflow,/git merge-base --is-ancestor "\$APPROVED_SHA" origin\/main/);
assert.match(workflow,/inputs\.confirm_production_deploy == 'DEPLOY_ADMIN_AUTH_V6'/);
assert.match(workflow,/group: gnk-asg-production-deploy/);
assert.match(workflow,/cancel-in-progress: false/);
assert.match(workflow,/x-gnk-explicit-html-route/);
assert.match(workflow,/production-verification-\$\{\{ inputs\.approved_sha \}\}/);
assert.match(workflow,/deploy-preflight-\$\{\{ inputs\.approved_sha \}\}/);
assert.match(workflow,/DEPLOY_REVISION:\$\{DEPLOY_SOURCE_SHA\}/);
assert.match(workflow,/GNK_RELEASE_COMPLETION_V7/);
assert.match(workflow,/__GNK_INDEX_DATA_RESILIENCE_V2__/);
assert.match(workflow,/__GNK_INDEX_EDITORIAL_ORDER_V3__/);
assert.match(workflow,/__GNK_PUBLIC_DESIGN_RUNTIME_V1__/);
assert.match(workflow,/--gnk-gold-600/);
assert.match(workflow,/logo-gnk-asg-gold\.svg/);
assert.match(workflow,/x-gnk-public-design: v1/);
assert.match(workflow,/Preflight Newsroom route ownership/);
assert.match(workflow,/scripts\/check-newsroom-route-readiness\.sh deploy-preflight/);
assert.match(workflow,/bash scripts\/verify-production-route\.sh "\$1" "deploy-verification\/\$2" "\$\{3:-\}"/);
assert.doesNotMatch(workflow,/GNK_RELEASE_COMPLETION_V6/);
assert.doesNotMatch(workflow,/resilience\.js "\/data\/news\.json"/);

const preflightPosition=workflow.indexOf('Preflight Newsroom route ownership');
const tokenPosition=workflow.indexOf('Resolve token hash');
const firstDeployPosition=workflow.indexOf('Deploy contact session bridge');
assert.ok(preflightPosition>=0&&tokenPosition>=0&&firstDeployPosition>=0);
assert.ok(preflightPosition<tokenPosition,'Newsroom preflight must run before token resolution');
assert.ok(preflightPosition<firstDeployPosition,'Newsroom preflight must run before any deploy step');

assert.match(preflight,/gnk-asg-news-backend/);
assert.match(preflight,/\/newsroom\//);
assert.match(preflight,/\/en\/newsroom\//);
assert.match(preflight,/No production changes were made/);
assert.doesNotMatch(preflight,/\bwrangler\b|api\.cloudflare\.com|cloudflare_api_token|cloudflare_account_id|routes?\s*=|api token/i);
assert.doesNotMatch(preflight,/curl[\s\S]{0,200}(?:--request|-X)\s*(?:POST|PUT|PATCH|DELETE)/i);
assert.match(preflight,/\[\[ "\$status" = "500" \]\]/);
assert.match(preflight,/\^server: cloudflare/);
assert.match(preflight,/\^content-type: text\/plain/);
assert.match(preflight,/error code: 1101/);
assert.match(preflight,/known_recovery_fix_present/);
assert.match(preflight,/git hash-object/);
assert.match(preflight,/f113c5b77ff2572e1723274a86b687904e9b99f8/);
assert.match(preflight,/d15447ac568f447ab56cfa4e2042e1def1e4a6e7/);
assert.match(preflight,/canonical asset-binding paths and a hard-stop newsroom fallback/);

const blockedOwnerPosition=preflight.indexOf('grep -Fiq "$blocked_worker"');
const recoveryCallPosition=preflight.indexOf('&& known_recovery_fix_present');
assert.ok(blockedOwnerPosition>=0&&recoveryCallPosition>=0);
assert.ok(blockedOwnerPosition<recoveryCallPosition,'Blocked Worker ownership must be rejected before recovery is considered');

assert.match(verifier,/grep -Fq -- "\$expected_marker" "\$output"/);
assert.match(verifier,/grep -Fiq -- "\$expected_marker" "\$headers"/);
assert.doesNotMatch(verifier,/grep -Fq "\$expected_marker"/);
assert.doesNotMatch(verifier,/grep -Fiq "\$expected_marker"/);

assert.match(publicWorker,/GNK_ASG_UNIFIED_AUTH_V25_CANONICAL_ASSETS_SAFE_FALLBACK/);
assert.match(publicWorker,/\['\/newsroom','\/newsroom\/index\.html'\]/);
assert.match(publicWorker,/\['\/en\/newsroom','\/en\/newsroom\/index\.html'\]/);
assert.match(publicWorker,/const canonicalAssetPath=targetPath=>targetPath\.endsWith\('\/index\.html'\)\?targetPath\.slice\(0,-10\):targetPath/);
assert.match(publicWorker,/new URL\(canonicalPath,'https:\/\/assets\.local'\)/);
assert.match(publicWorker,/x-gnk-static-asset-path/);
assert.match(publicWorker,/function newsroomFallback/);
assert.match(publicWorker,/x-gnk-static-asset-fallback/);
assert.match(publicWorker,/binding-missing/);
assert.match(publicWorker,/asset-status-\$\{response\.status\}/);
assert.match(publicWorker,/asset-fetch-exception/);
assert.match(publicWorker,/return isNewsroom\(routePath\)\?newsroomFallback\(request,targetPath/);
assert.doesNotMatch(publicWorker,/new URL\(targetPath,request\.url\)/);
assert.doesNotMatch(publicWorker,/const direct=await explicitHtml\(request,env\);if\(!direct&&isNewsroom/);

assert.match(tool,/branch!==\'main\'/);
assert.match(tool,/merge-base','--is-ancestor/);
assert.match(tool,/approved_sha=\$\{expectedSha\}/);
assert.match(tool,/GNK_ASG_DEPLOY_APPROVED/);
assert.match(tool,/--execute/);
assert.match(tool,/mode:execute\?'execute':'prepare-only'/);

console.log(JSON.stringify({
  ok:true,
  deployStarted:false,
  indexRuntime:'V7',
  publicDesign:'V1',
  newsroomAssetRouting:'canonical-binding-path-with-hard-stop-fallback',
  preflight:'before-secrets-and-deploy',
  guards:['exact-confirmation','approved-sha','main-only','clean-tree','ancestry','named-contract-tests','newsroom-preflight','runtime-markers','literal-dash-markers','route-ownership-evidence','audited-1101-recovery','canonical-assets-local-paths','newsroom-hard-stop-fallback','bash-production-verifier','post-deploy-artifacts']
},null,2));