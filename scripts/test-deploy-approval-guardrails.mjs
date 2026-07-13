import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow=fs.readFileSync('.github/workflows/deploy-admin-auth-v6.yml','utf8');
const tool=fs.readFileSync('scripts/prepare-approved-deploy-v1.mjs','utf8');
const preflight=fs.readFileSync('scripts/check-newsroom-route-readiness.sh','utf8');
const verifier=fs.readFileSync('scripts/verify-production-route.sh','utf8');
const baseWorker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js','utf8');
const releaseWorker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v21.js','utf8');
const newsAssert=fs.readFileSync('scripts/assert-production-news-fallback.mjs','utf8');

for(const marker of [/approved_sha:/,/ref: \$\{\{ inputs\.approved_sha \}\}/,/git merge-base --is-ancestor "\$APPROVED_SHA" origin\/main/,/inputs\.confirm_production_deploy == 'DEPLOY_ADMIN_AUTH_V6'/,/group: gnk-asg-production-deploy/,/cancel-in-progress: false/,/production-verification-\$\{\{ inputs\.approved_sha \}\}/,/deploy-preflight-\$\{\{ inputs\.approved_sha \}\}/,/DEPLOY_REVISION:\$\{DEPLOY_SOURCE_SHA\}/])assert.match(workflow,marker);
for(const marker of [/public-unified-menu-v6\.js/,/public-contrast-hardening-v1\.js/,/index-editorial-order-v6\.js/,/mail-studio-ui-v28\.js/,/__GNK_UNIFIED_MENU_V6__/,/__GNK_CONTRAST_HARDENING_V1__/,/__GNK_INDEX_EDITORIAL_ORDER_V6__/,/x-gnk-unified-menu-current: full-v6-workers/,/x-gnk-contrast: hardened-v1/,/x-gnk-index-editorial: v6-news-100/,/assert-production-news-fallback\.mjs/,/contact readiness HTTP 200/,/canonical mail logo HTTP 200 PNG/])assert.match(workflow,marker);
for(const test of ['test-unified-shell-contract.mjs','test-visible-menu-logo-content-v1.mjs','test-final-release-v31.mjs','test-contact-form-contract.mjs','test-the-code-index-contract.mjs','test-index-content-contract.mjs'])assert.match(workflow,new RegExp(test.replace('.','\\.')));
assert.doesNotMatch(workflow,/news_count=\$\(node -e .*Array\.isArray\(n\)\?n\.length:0/);
assert.doesNotMatch(workflow,/grep -o 'public-compact-menu-v1\.js'.*wc -l/);
assert.match(workflow,/bash scripts\/verify-production-route\.sh "\$1" "deploy-verification\/\$2" "\$\{3:-\}"/);

const preflightPosition=workflow.indexOf('Preflight Newsroom route ownership'),tokenPosition=workflow.indexOf('Resolve token hash'),firstDeployPosition=workflow.indexOf('Deploy contact session bridge');
assert.ok(preflightPosition>=0&&tokenPosition>=0&&firstDeployPosition>=0&&preflightPosition<tokenPosition&&preflightPosition<firstDeployPosition);
assert.match(preflight,/gnk-asg-news-backend/);
assert.match(preflight,/\/newsroom\//);
assert.match(preflight,/\/en\/newsroom\//);
assert.match(preflight,/No production changes were made/);
assert.doesNotMatch(preflight,/\bwrangler\b|api\.cloudflare\.com|cloudflare_api_token|cloudflare_account_id|routes?\s*=|api token/i);
assert.doesNotMatch(preflight,/curl[\s\S]{0,200}(?:--request|-X)\s*(?:POST|PUT|PATCH|DELETE)/i);
for(const marker of [/\[\[ "\$status" = "500" \]\]/,/\^server: cloudflare/,/\^content-type: text\/plain/,/error code: 1101/,/known_recovery_fix_present/,/git hash-object/,/f113c5b77ff2572e1723274a86b687904e9b99f8/,/f7a20819b51d2ef515d719b82b759b2ee1883a7e/,/V29 direct-index unified release/])assert.match(preflight,marker);
const blockedOwnerPosition=preflight.indexOf('grep -Fiq "$blocked_worker"'),recoveryPosition=preflight.indexOf('&&known_recovery_fix_present');assert.ok(blockedOwnerPosition>=0&&recoveryPosition>=0&&blockedOwnerPosition<recoveryPosition);

assert.match(verifier,/grep -Fq -- "\$expected_marker" "\$output"/);
assert.match(verifier,/grep -Fiq -- "\$expected_marker" "\$headers"/);
assert.doesNotMatch(verifier,/grep -Fq "\$expected_marker"|grep -Fiq "\$expected_marker"/);

assert.match(baseWorker,/GNK_ASG_UNIFIED_AUTH_V29_DIRECT_INDEX_CANONICAL_RELEASE/);
assert.match(baseWorker,/\['\/','\/index\.html'\]/);
assert.match(baseWorker,/\['\/en','\/en\/index\.html'\]/);
assert.match(baseWorker,/new URL\(canonicalPath,'https:\/\/assets\.local'\)/);
assert.match(baseWorker,/function newsroomFallback/);
assert.match(baseWorker,/function canonicalLogoAlias/);

assert.match(releaseWorker,/GNK_ASG_UNIFIED_AUTH_V31_MAIL_NEWS_CONTRAST/);
assert.match(releaseWorker,/handleContactStudio/);
assert.match(releaseWorker,/public-unified-menu-v6\.js/);
assert.match(releaseWorker,/public-contrast-hardening-v1\.js/);
assert.match(releaseWorker,/index-editorial-order-v6\.js/);
assert.match(releaseWorker,/mail-studio-ui-v28\.js/);
assert.match(releaseWorker,/x-gnk-unified-menu-current','full-v6-workers/);
assert.match(releaseWorker,/x-gnk-contrast','hardened-v1/);
assert.match(releaseWorker,/x-gnk-index-editorial',isIndex\(route\)\?'v6-news-100'/);

assert.match(newsAssert,/content-type:\\s\*application\\\/json/);
assert.match(newsAssert,/parsed\?\.items/);
assert.match(newsAssert,/parsed\?\.posts/);
assert.match(newsAssert,/parsed\?\.news/);
assert.match(newsAssert,/items\.length<minimum/);

for(const marker of [/branch!==\'main\'/,/merge-base','--is-ancestor/,/approved_sha=\$\{expectedSha\}/,/GNK_ASG_DEPLOY_APPROVED/,/--execute/,/mode:execute\?'execute':'prepare-only'/])assert.match(tool,marker);
console.log(JSON.stringify({ok:true,deployStarted:false,indexRuntime:'V8+V6-editorial',publicDesign:'contrast-hardened-v1',menu:'V6-full-workers',contact:'shared-EmailMessage',worker:'V31',directIndexAssets:true,canonicalLogoAlias:true,newsroomAssetRouting:'canonical-binding-path-with-hard-stop-fallback',newsVerification:'content-type-plus-array-or-object-shape',preflight:'before-secrets-and-deploy',finalAssertions:'named-and-diagnostic'},null,2));
