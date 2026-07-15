import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>fs.readFileSync(path,'utf8');
const workflow=read('.github/workflows/deploy-admin-auth-v6.yml');
const tool=read('scripts/prepare-approved-deploy-v1.mjs');
const preflight=read('scripts/check-newsroom-route-readiness.sh');
const verifier=read('scripts/verify-production-release-v38.sh');
const baseWorker=read('workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js');
const releaseWorker=read('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js');
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
 'bash scripts/verify-production-release-v38.sh deploy-verification'
]);
requireText('workflow V38 release assertions',workflow,[
 'index-unified-auth-v23.js','index-unified-auth-v21.js','mail-identity-autoreply-v2.js',
 'index-editorial-order-v6.js','index-editorial-order-v1.js','editorial-latest-index-v1.js',
 'contact-form-v2.js','mail-studio-ui-v28.js','apps/portal/data/news.json',
 'scripts/test-news-share-routing-v1.mjs','scripts/verify-production-release-v38.sh',
 'current-static-asset-20260715','source-redirect','20260715-source-links-v2',
 'Kapitalna disciplina u razdoblju geopolitičkih i energetskih šokova','AI ne smije pisati konačnu odluku',
 'GNK_ASG_MAIL_IDENTITY_AUTOREPLY_V6_20260715_AI_BRANDED','aiMessageText','loadEmailLogo','signature.html',
 'min-height:520px','latest news is not 2026-07-15','reference news source URL missing'
]);
forbidText('workflow',workflow,[
 "grep -o 'public-compact-menu-v1.js'",
 'news_count=$(node -e',
 'ASSERT admin session readiness HTTP 200',
 'scripts/verify-production-route.sh'
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

requireText('V38 production verifier',verifier,[
 'x-gnk-deploy-revision',
 'x-gnk-active-release',
 'x-gnk-active-entrypoint',
 'current-static-asset-20260715',
 'x-gnk-news-share',
 'source-redirect',
 'Kapitalna disciplina u razdoblju geopolitičkih i energetskih šokova',
 'AI ne smije pisati konačnu odluku',
 'contact readiness HTTP 200',
 'verify_release_marker mail-logo',
 'case "$mail_status" in 400|401|403)'
]);
forbidText('V38 production verifier',verifier,[
 'wrangler deploy',
 'api.cloudflare.com/client/v4/zones',
 'cloudflare_api_token='
]);

requireText('V29 base worker',baseWorker,[
 'GNK_ASG_UNIFIED_AUTH_V29_DIRECT_INDEX_CANONICAL_RELEASE',
 "['/','/index.html']","['/en','/en/index.html']",
 "new URL(canonicalPath,'https://assets.local')",'function newsroomFallback','function canonicalLogoAlias'
]);
requireText('V38 release worker',releaseWorker,[
 'GNK_ASG_UNIFIED_AUTH_V38_RELEASE_PROOF_NEWS_SOURCE_LINKS',
 "export const ENTRYPOINT='src/index-unified-auth-v23.js'",
 "headers.set('x-gnk-deploy-revision',revision)",
 'current-static-asset-20260715','source-redirect'
]);
requireText('news production assertion',newsAssert,[
 'content-type','application/json','parsed?.items','parsed?.posts','parsed?.news','items.length<minimum'
]);
requireText('approved deploy helper',tool,[
 "branch!=='main'",'merge-base','--is-ancestor','approved_sha=${expectedSha}','GNK_ASG_DEPLOY_APPROVED','--execute',"mode:execute?'execute':'prepare-only'"
]);

console.log(JSON.stringify({
 ok:true,
 deployStarted:false,
 approvalInput:'exact-main-sha',
 productionVerification:'V38 exact release headers and public route evidence',
 adminSessionVerification:'ready-or-configured-unauthorized',
 editorialAssetsVerification:'current static assets and canonical routes',
 preflight:'before-secrets-and-deploy',
 routeMutation:false,
 finalAssertions:'named-and-diagnostic'
},null,2));
