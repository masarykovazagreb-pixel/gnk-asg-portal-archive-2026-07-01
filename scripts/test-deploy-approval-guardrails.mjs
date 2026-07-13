import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow=fs.readFileSync('.github/workflows/deploy-admin-auth-v6.yml','utf8');
const tool=fs.readFileSync('scripts/prepare-approved-deploy-v1.mjs','utf8');
const preflight=fs.readFileSync('scripts/check-newsroom-route-readiness.sh','utf8');
const verifier=fs.readFileSync('scripts/verify-production-route.sh','utf8');
const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js','utf8');

for(const marker of [/approved_sha:/,/ref: \$\{\{ inputs\.approved_sha \}\}/,/git merge-base --is-ancestor "\$APPROVED_SHA" origin\/main/,/inputs\.confirm_production_deploy == 'DEPLOY_ADMIN_AUTH_V6'/,/group: gnk-asg-production-deploy/,/cancel-in-progress: false/,/production-verification-\$\{\{ inputs\.approved_sha \}\}/,/deploy-preflight-\$\{\{ inputs\.approved_sha \}\}/,/DEPLOY_REVISION:\$\{DEPLOY_SOURCE_SHA\}/])assert.match(workflow,marker);
for(const marker of [/GNK_RELEASE_COMPLETION_V8/,/__GNK_INDEX_DATA_RESILIENCE_V2__/,/__GNK_INDEX_EDITORIAL_ORDER_V4__/,/__GNK_UNIFIED_DESIGN_V2__/,/__GNK_UNIFIED_MENU_V4__/,/logo-gnk-asg-canonical\.svg/,/logo-gnk-asg-email\.png/,/x-gnk-public-design: v2-unified/,/x-gnk-unified-menu: public-and-protected/,/contact readiness HTTP 200/,/canonical mail logo HTTP 200 PNG/])assert.match(workflow,marker);
for(const test of ['test-unified-shell-contract.mjs','test-contact-form-contract.mjs','test-the-code-index-contract.mjs','test-index-content-contract.mjs'])assert.match(workflow,new RegExp(test.replace('.','\\.')));
assert.doesNotMatch(workflow,/GNK_RELEASE_COMPLETION_V7|__GNK_INDEX_EDITORIAL_ORDER_V3__|__GNK_PUBLIC_DESIGN_RUNTIME_V1__|logo-gnk-asg-gold\.svg|x-gnk-public-design: v1/);
assert.doesNotMatch(workflow,/grep -o 'public-compact-menu-v1\.js'.*wc -l/);
assert.match(workflow,/bash scripts\/verify-production-route\.sh "\$1" "deploy-verification\/\$2" "\$\{3:-\}"/);

const preflightPosition=workflow.indexOf('Preflight Newsroom route ownership'),tokenPosition=workflow.indexOf('Resolve token hash'),firstDeployPosition=workflow.indexOf('Deploy contact session bridge');
assert.ok(preflightPosition>=0&&tokenPosition>=0&&firstDeployPosition>=0);
assert.ok(preflightPosition<tokenPosition);
assert.ok(preflightPosition<firstDeployPosition);

assert.match(preflight,/gnk-asg-news-backend/);
assert.match(preflight,/\/newsroom\//);
assert.match(preflight,/\/en\/newsroom\//);
assert.match(preflight,/No production changes were made/);
assert.doesNotMatch(preflight,/\bwrangler\b|api\.cloudflare\.com|cloudflare_api_token|cloudflare_account_id|routes?\s*=|api token/i);
assert.doesNotMatch(preflight,/curl[\s\S]{0,200}(?:--request|-X)\s*(?:POST|PUT|PATCH|DELETE)/i);
for(const marker of [/\[\[ "\$status" = "500" \]\]/,/\^server: cloudflare/,/\^content-type: text\/plain/,/error code: 1101/,/known_recovery_fix_present/,/git hash-object/,/f113c5b77ff2572e1723274a86b687904e9b99f8/,/6c80b068bb44fc7bd9bd5993986bdfec8df2d1e3/,/V28 unified logo\/content\/contact release/])assert.match(preflight,marker);
const blockedOwnerPosition=preflight.indexOf('grep -Fiq "$blocked_worker"'),recoveryPosition=preflight.indexOf('&& known_recovery_fix_present');assert.ok(blockedOwnerPosition>=0&&recoveryPosition>=0&&blockedOwnerPosition<recoveryPosition);

assert.match(verifier,/grep -Fq -- "\$expected_marker" "\$output"/);
assert.match(verifier,/grep -Fiq -- "\$expected_marker" "\$headers"/);
assert.doesNotMatch(verifier,/grep -Fq "\$expected_marker"|grep -Fiq "\$expected_marker"/);

assert.match(worker,/GNK_ASG_UNIFIED_AUTH_V28_CANONICAL_LOGO_CONTACT_RELEASE/);
assert.match(worker,/new URL\(canonicalPath,'https:\/\/assets\.local'\)/);
assert.match(worker,/function newsroomFallback/);
assert.match(worker,/x-gnk-static-asset-fallback/);
assert.match(worker,/CONTACT_PATH='\/api\/contact-submit'/);
assert.match(worker,/if\(pathOf\(request\)===CONTACT_PATH\)return handleContact/);
assert.match(worker,/function canonicalLogoAlias/);
assert.match(worker,/logo-gnk-asg-canonical\.svg/);
assert.match(worker,/logo-gnk-asg-email\.png/);
assert.match(worker,/handleEmailLogo/);
assert.match(worker,/x-gnk-unified-menu/);
assert.match(worker,/public-and-protected/);
assert.doesNotMatch(worker,/new URL\(targetPath,request\.url\)/);

for(const marker of [/branch!==\'main\'/,/merge-base','--is-ancestor/,/approved_sha=\$\{expectedSha\}/,/GNK_ASG_DEPLOY_APPROVED/,/--execute/,/mode:execute\?'execute':'prepare-only'/])assert.match(tool,marker);

console.log(JSON.stringify({ok:true,deployStarted:false,indexRuntime:'V8',publicDesign:'V2',menu:'V4',contact:'V2',worker:'V28',canonicalLogoAlias:true,newsroomAssetRouting:'canonical-binding-path-with-hard-stop-fallback',preflight:'before-secrets-and-deploy',finalAssertions:'named-and-diagnostic'},null,2));