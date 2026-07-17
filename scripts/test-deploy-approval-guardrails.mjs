import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>fs.readFileSync(path,'utf8');
const workflow=read('.github/workflows/deploy-admin-auth-v6.yml');
const validationWorkflow=read('.github/workflows/deploy-mail-studio-multilingual.yml');
const publicAssetsValidation=read('.github/workflows/deploy-public-portal-assets-safe.yml');
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
 'authorize-production:',
 'deploy-production:',
 "github.ref == 'refs/heads/main'",
 'needs: [authorize-production]',
 'environment: production',
 'require_eq "$GITHUB_SHA" "$APPROVED_SHA"',
 'require_eq "$(git rev-parse origin/main)" "$APPROVED_SHA"',
 "inputs.confirm_production_deploy == 'DEPLOY_ADMIN_AUTH_V6'",
 'group: gnk-asg-production-deploy',
 'cancel-in-progress: false',
 'production-verification-${{ inputs.approved_sha }}',
 'deploy-preflight-${{ inputs.approved_sha }}',
 'DEPLOY_REVISION:${DEPLOY_SOURCE_SHA}',
 'bash scripts/verify-production-release-v38.sh deploy-verification'
]);
const deployRevisionExport='echo "Authorized SHA and approval reconfirmed immediately before production deployment."\n          echo "DEPLOY_SOURCE_SHA=$APPROVED_SHA" >> "$GITHUB_ENV"';
assert.ok(workflow.includes(deployRevisionExport),'approved SHA must be exported to GITHUB_ENV as a separate shell command');
assert.ok(!workflow.includes('deployment.\\n          echo "DEPLOY_SOURCE_SHA='),'deploy revision export must not be embedded in the preceding echo');
requireText('workflow V38 release assertions',workflow,[
 'index-unified-auth-v23.js','index-unified-auth-v21.js','mail-identity-autoreply-v2.js',
 'index-editorial-order-v6.js','index-editorial-order-v1.js','editorial-latest-index-v1.js',
 'contact-form-v2.js','mail-studio-ui-v28.js','apps/portal/data/news.json',
 'scripts/test-news-share-routing-v1.mjs','scripts/verify-production-release-v38.sh',
 'current-static-asset-20260715','source-redirect','20260715-source-links-v2',
 'Kapitalna disciplina u razdoblju geopolitičkih i energetskih šokova','AI ne smije pisati konačnu odluku',
 'GNK_ASG_MAIL_IDENTITY_AUTOREPLY_V9_20260717_UNTRUSTED_SUBJECT_DATA','aiMessageText','loadEmailLogo','signature.html',
 'min-height:520px'
]);
forbidText('workflow',workflow,[
 "grep -o 'public-compact-menu-v1.js'",
 'news_count=$(node -e',
 'ASSERT admin session readiness HTTP 200',
 'scripts/verify-production-route.sh'
]);

forbidText('production workflow bypasses',workflow,[
 'git merge-base --is-ancestor',
 'contents: write',
 'GNK_ASG_MAIL_IDENTITY_AUTOREPLY_V6_20260715_AI_BRANDED',
 "DEPLOY PRODUCTION"
]);
requireText('validation-only workflow',validationWorkflow,[
 'pull_request:',
 'wrangler deploy --dry-run',
 'Production deployment is not permitted from this event.'
]);
forbidText('validation-only workflow',validationWorkflow,[
 'workflow_dispatch:',
 'authorize-production:',
 'deploy-production:',
 'environment: production',
 'CLOUDFLARE_API_TOKEN',
 'CLOUDFLARE_ACCOUNT_ID',
 'git push origin',
 'Persist generated portal metadata'
]);
assert.equal(/wrangler deploy(?! --dry-run)/.test(validationWorkflow),false,'validation workflow must not contain a write-capable wrangler deploy');
requireText('legacy public-assets validation-only workflow',publicAssetsValidation,[
 'pull_request:',
 'wrangler@4 deploy --dry-run',
 'Production deployment is not permitted from this event.'
]);
forbidText('legacy public-assets validation-only workflow',publicAssetsValidation,[
 'workflow_dispatch:',
 'confirm_public_assets_deploy:',
 'DEPLOY_PUBLIC_PORTAL_SAFE',
 'CLOUDFLARE_API_TOKEN',
 'CLOUDFLARE_ACCOUNT_ID',
 'environment: production'
]);
assert.equal(/wrangler@4 deploy(?! --dry-run)/.test(publicAssetsValidation),false,'legacy public-assets workflow must not contain a write-capable wrangler deploy');

const workflowDirectory='.github/workflows';
const approvedProductionWorkflow='deploy-admin-auth-v6.yml';
const workflowFiles=fs.readdirSync(workflowDirectory).filter(file=>/\.ya?ml$/i.test(file)).sort();
const alternateDeployViolations=[];
for(const file of workflowFiles){
 if(file===approvedProductionWorkflow)continue;
 const source=read(`${workflowDirectory}/${file}`);
 const writeDeployLine=source.split(/\r?\n/).find(line=>
  /^\s*(?:run:\s*)?(?:(?:npx|bunx)\s+(?:--yes\s+)?|(?:pnpm|yarn)\s+(?:dlx\s+)?)?wrangler(?:@\d+)?\s+(?:pages\s+)?deploy\b/i.test(line)&&! /--dry-run\b/i.test(line)
 );
 if(writeDeployLine)alternateDeployViolations.push(`${file}: write-capable Wrangler deploy: ${writeDeployLine.trim()}`);
 if(/cloudflare\/wrangler-action[^\n]*[\s\S]{0,500}\bcommand:\s*["']?(?:pages\s+)?deploy\b/i.test(source))alternateDeployViolations.push(`${file}: Wrangler Action deploy`);
 if(/^\s*environment:\s*production\s*$/im.test(source))alternateDeployViolations.push(`${file}: production environment job`);
}
assert.deepEqual(alternateDeployViolations,[],'Only deploy-admin-auth-v6.yml may contain production deployment capability');

const preflightPosition=workflow.indexOf('Preflight Newsroom route ownership');
const installPosition=workflow.indexOf('Install locked direct operator dependencies without lifecycle scripts');
const integrityPosition=workflow.indexOf('Reconfirm tracked release integrity before any production secret');
const tokenPosition=workflow.indexOf('Resolve token hash after integrity verification');
const operatorSecretPosition=workflow.indexOf('secrets.GNK_ASG_OPERATOR_TOKEN');
const cloudflareSecretPosition=workflow.indexOf('secrets.CLOUDFLARE_API_TOKEN');
const firstDeployPosition=workflow.indexOf('Deploy contact session bridge');
assert.ok([preflightPosition,installPosition,integrityPosition,tokenPosition,operatorSecretPosition,cloudflareSecretPosition,firstDeployPosition].every(position=>position>=0),'workflow preflight/integrity/secret/deploy steps missing');
assert.ok(preflightPosition<installPosition,'route preflight must run before dependency installation');
assert.ok(installPosition<integrityPosition,'dependency installation must finish before final integrity verification');
assert.ok(integrityPosition<tokenPosition&&integrityPosition<operatorSecretPosition,'operator secret must not be exposed before final integrity verification');
assert.ok(tokenPosition<cloudflareSecretPosition&&operatorSecretPosition<cloudflareSecretPosition,'Cloudflare credentials must remain later than operator-token hashing');
assert.ok(cloudflareSecretPosition<firstDeployPosition,'Cloudflare credentials must only appear in deploy steps');

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
 preflight:'before-dependencies-and-all-production-secrets',
 routeMutation:false,
 finalAssertions:'named-diagnostic-and-secret-ordered'
},null,2));