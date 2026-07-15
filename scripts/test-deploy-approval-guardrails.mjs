import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>fs.readFileSync(path,'utf8');
const workflow=read('.github/workflows/deploy-admin-auth-v6.yml');
const tool=read('scripts/prepare-approved-deploy-v1.mjs');
const preflight=read('scripts/check-newsroom-route-readiness.sh');
const verifier=read('scripts/verify-production-route.sh');
const baseWorker=read('workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js');
const releaseWorker=read('workers/gnk-asg-direct-operator/src/index-unified-auth-v21.js');
const newsAssert=read('scripts/assert-production-news-fallback.mjs');

function requireText(label,source,values){
 for(const value of values)assert.ok(source.includes(value),`${label} missing: ${value}`);
}
function forbidText(label,source,values){
 for(const value of values)assert.ok(!source.includes(value),`${label} contains forbidden text: ${value}`);
}

requireText('workflow approval contract',workflow,[
 'approved_sha:',
 'ref: ${{ inputs.approved_sha }}',
 'git merge-base --is-ancestor "$APPROVED_SHA" origin/main',
 "inputs.confirm_production_deploy == 'DEPLOY_ADMIN_AUTH_V6'",
 'group: gnk-asg-production-deploy',
 'cancel-in-progress: false',
 'production-verification-${{ inputs.approved_sha }}',
 'deploy-preflight-${{ inputs.approved_sha }}',
 'DEPLOY_REVISION:${DEPLOY_SOURCE_SHA}',
 'bash scripts/verify-production-route.sh "$1" "deploy-verification/$2" "${3:-}"'
]);
requireText('workflow release assertions',workflow,[
 'public-unified-menu-v6.js','public-contrast-hardening-v1.js','index-editorial-order-v6.js','mail-studio-ui-v28.js',
 '__GNK_UNIFIED_MENU_V6__','__GNK_CONTRAST_HARDENING_V1__','__GNK_INDEX_EDITORIAL_ORDER_V6__',
 'x-gnk-unified-menu-current: full-v6-workers','x-gnk-contrast: hardened-v1','x-gnk-index-editorial: v6-news-100',
 'assert-production-news-fallback.mjs','contact readiness HTTP 200','canonical mail logo HTTP 200 PNG',
 'test-unified-shell-contract.mjs','test-visible-menu-logo-content-v1.mjs','test-final-release-v31.mjs',
 'test-contact-form-contract.mjs','test-the-code-index-contract.mjs','test-index-content-contract.mjs',
 'test-public-editorial-asset-routes-v1.mjs','globalne-kamatne-stope-nakon-inflacijskog-soka',
 'brzina-bez-kontrole-nije-inovacija','x-gnk-editorial-request-path',
 'GNK_ASG_UNIFIED_AUTH_V34_PUBLIC_EDITORIAL_ASSETS_GNK_PUBLIC_EDITORIAL_ASSETS_V2_20260715',
 'ASSERT admin session endpoint controlled','401|403','"configured"'
]);
forbidText('workflow',workflow,[
 "grep -o 'public-compact-menu-v1.js'",
 'news_count=$(node -e',
 'ASSERT admin session readiness HTTP 200'
]);

const preflightPosition=workflow.indexOf('Preflight Newsroom route ownership');
const tokenPosition=workflow.indexOf('Resolve token hash');
const firstDeployPosition=workflow.indexOf('Deploy contact session bridge');
assert.ok(preflightPosition>=0&&tokenPosition>=0&&firstDeployPosition>=0,'workflow preflight/deploy steps missing');
assert.ok(preflightPosition<tokenPosition&&preflightPosition<firstDeployPosition,'preflight must run before secrets and deploy');

requireText('newsroom preflight',preflight,[
 'gnk-asg-news-backend','/newsroom/','/en/newsroom/','No production changes were made',
 '[[ "$status" = "500" ]]','^server: cloudflare','^content-type: text/plain','error code: 1101',
 'known_recovery_fix_present','git hash-object','f113c5b77ff2572e1723274a86b687904e9b99f8',
 'f7a20819b51d2ef515d719b82b759b2ee1883a7e','V29 direct-index unified release'
]);
assert.ok(preflight.indexOf('grep -Fiq "$blocked_worker"')<preflight.indexOf('&&known_recovery_fix_present'),'blocked owner check must precede audited recovery');
assert.doesNotMatch(preflight,/\bwrangler\b|api\.cloudflare\.com|cloudflare_api_token|cloudflare_account_id|routes?\s*=|api token/i);
assert.doesNotMatch(preflight,/curl[\s\S]{0,200}(?:--request|-X)\s*(?:POST|PUT|PATCH|DELETE)/i);

requireText('production verifier',verifier,[
 'grep -Fq -- "$expected_marker" "$output"',
 'grep -Fiq -- "$expected_marker" "$headers"',
 'allowed_statuses="${4:-200}"',
 '"$url" == https://gnk-asg.hr/admin-login/*',
 'allowed_statuses="200,401"',
 'status_allowed "$status"'
]);
forbidText('production verifier',verifier,[
 'gnk-asg.hr/admin-center/*','gnk-asg.hr/mail-studio/*','gnk-asg.hr/operator-dashboard/*'
]);

requireText('V29 base worker',baseWorker,[
 'GNK_ASG_UNIFIED_AUTH_V29_DIRECT_INDEX_CANONICAL_RELEASE',
 "['/','/index.html']","['/en','/en/index.html']",
 "new URL(canonicalPath,'https://assets.local')",'function newsroomFallback','function canonicalLogoAlias'
]);
requireText('V31 release worker',releaseWorker,[
 'GNK_ASG_UNIFIED_AUTH_V31_MAIL_NEWS_CONTRAST','handleContactStudio','public-unified-menu-v6.js',
 'public-contrast-hardening-v1.js','index-editorial-order-v6.js','mail-studio-ui-v28.js',
 "x-gnk-unified-menu-current','full-v6-workers","x-gnk-contrast','hardened-v1",
 "x-gnk-index-editorial',isIndex(route)?'v6-news-100'"
]);
requireText('news production assertion',newsAssert,[
 'content-type','application/json','parsed?.items','parsed?.posts','parsed?.news','items.length<minimum'
]);
requireText('approved deploy helper',tool,[
 "branch!=='main'","merge-base','--is-ancestor",'approved_sha=${expectedSha}','GNK_ASG_DEPLOY_APPROVED','--execute',"mode:execute?'execute':'prepare-only'"
]);

console.log(JSON.stringify({
 ok:true,
 deployStarted:false,
 approvalInput:'exact-main-sha',
 adminLoginVerification:'exact-host-path-200-or-401-with-marker',
 adminSessionVerification:'ready-or-configured-unauthorized',
 editorialAssetsVerification:'canonical-trailing-slash-v34',
 preflight:'before-secrets-and-deploy',
 routeMutation:false,
 finalAssertions:'named-and-diagnostic'
},null,2));
