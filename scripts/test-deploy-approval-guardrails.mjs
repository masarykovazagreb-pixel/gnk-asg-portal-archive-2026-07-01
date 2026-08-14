import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>fs.readFileSync(path,'utf8');
const workflow=read('.github/workflows/deploy-admin-auth-v6.yml');
const retryHelper=read('scripts/deploy-direct-operator-with-retry-v1.sh');
const validationWorkflow=read('.github/workflows/deploy-mail-studio-multilingual.yml');
const publicAssetsValidation=read('.github/workflows/deploy-public-portal-assets-safe.yml');
const preflight=read('scripts/check-newsroom-route-readiness.sh');
const verifier=read('scripts/verify-production-release-v38.sh');

const requireText=(label,source,values)=>{for(const value of values)assert.ok(source.includes(value),`${label} missing: ${value}`)};
const forbidText=(label,source,values)=>{for(const value of values)assert.ok(!source.includes(value),`${label} contains forbidden text: ${value}`)};

requireText('workflow approval contract',workflow,[
 'approved_sha:','ref: ${{ inputs.approved_sha }}','authorize-production:','deploy-production:',
 "github.ref == 'refs/heads/main'",'needs: [authorize-production]','environment: production',
 'require_eq "$GITHUB_SHA" "$APPROVED_SHA"','require_eq "$(git rev-parse origin/main)" "$APPROVED_SHA"',
 "inputs.confirm_production_deploy == 'DEPLOY_ADMIN_AUTH_V6'",'group: gnk-asg-main-mutation',
 'cancel-in-progress: false','production-verification-${{ inputs.approved_sha }}',
 'deploy-preflight-${{ inputs.approved_sha }}','bash scripts/verify-production-release-v38.sh deploy-verification',
 'bash ../../scripts/deploy-direct-operator-with-retry-v1.sh','deploy-wrangler-logs-${{ inputs.approved_sha }}'
]);

requireText('bounded retry helper',retryHelper,[
 'MAX_ATTEMPTS=3','wrangler@4.112.0 deploy','DEPLOY_REVISION:${DEPLOY_REVISION}',
 'assets-upload-session','code: 10013','2) delay=30','3) delay=90','[REDACTED_TOKEN_HASH]'
]);

const exportMarker='echo "DEPLOY_SOURCE_SHA=$APPROVED_SHA" >> "$GITHUB_ENV"';
assert.ok(workflow.includes(exportMarker),'approved SHA must be exported to GITHUB_ENV');
assert.ok(workflow.indexOf('Reconfirm tracked release integrity before any production secret')<workflow.indexOf('Resolve token hash after integrity verification'));
assert.ok(workflow.indexOf('Resolve token hash after integrity verification')<workflow.indexOf('Deploy contact session bridge'));
assert.ok(workflow.indexOf('Deploy contact session bridge')<workflow.indexOf('Deploy direct operator and shared assets with bounded Cloudflare retry'));
assert.ok(workflow.indexOf('Deploy direct operator and shared assets with bounded Cloudflare retry')<workflow.indexOf('Deploy operator center'));

forbidText('workflow bypasses',workflow,[
 'git merge-base --is-ancestor','contents: write','DEPLOY PRODUCTION',
 'scripts/verify-production-route.sh',"grep -Fq 'loadEmailLogo'"
]);

requireText('validation-only workflow',validationWorkflow,['pull_request:','wrangler deploy --dry-run','Production deployment is not permitted from this event.']);
forbidText('validation-only workflow',validationWorkflow,['workflow_dispatch:','environment: production','CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID']);
assert.equal(/wrangler deploy(?! --dry-run)/.test(validationWorkflow),false);

requireText('legacy public-assets validation',publicAssetsValidation,['pull_request:','wrangler@4 deploy --dry-run','Production deployment is not permitted from this event.']);
forbidText('legacy public-assets validation',publicAssetsValidation,['workflow_dispatch:','environment: production','CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID']);
assert.equal(/wrangler@4 deploy(?! --dry-run)/.test(publicAssetsValidation),false);

const approved='.github/workflows/deploy-admin-auth-v6.yml';
const violations=[];
for(const file of fs.readdirSync('.github/workflows').filter(f=>/\.ya?ml$/i.test(f))){
 const path=`.github/workflows/${file}`;
 if(path===approved)continue;
 const source=read(path);
 const writeLine=source.split(/\r?\n/).find(line=>/^\s*(?:run:\s*)?(?:(?:npx|bunx)\s+(?:--yes\s+)?|(?:pnpm|yarn)\s+(?:dlx\s+)?)?wrangler(?:@\d+)?\s+(?:pages\s+)?deploy\b/i.test(line)&&!/--dry-run\b/i.test(line));
 if(writeLine)violations.push(`${file}: ${writeLine.trim()}`);
 if(/^\s*environment:\s*production\s*$/im.test(source))violations.push(`${file}: production environment`);
}
assert.deepEqual(violations,[],'Only deploy-admin-auth-v6.yml may contain production deployment capability');

requireText('preflight',preflight,['gnk-asg-news-backend','/newsroom/','/en/newsroom/','No production changes were made']);
assert.doesNotMatch(preflight,/\bwrangler\b|api\.cloudflare\.com|cloudflare_api_token|cloudflare_account_id/i);
requireText('production verifier',verifier,['x-gnk-deploy-revision','x-gnk-active-release','x-gnk-active-entrypoint','contact readiness HTTP 200']);
forbidText('production verifier',verifier,['wrangler deploy','cloudflare_api_token=']);

console.log(JSON.stringify({
 ok:true,
 approvalInput:'exact-main-sha',
 boundedCloudflareRetry:true,
 retryOnlyForAssetsSession10013:true,
 diagnosticsArtifact:true,
 alternateProductionDeploys:false
},null,2));
