import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>fs.readFileSync(path,'utf8');
const workflow=read('.github/workflows/deploy-admin-auth-v6.yml');
const retryHelper=read('scripts/deploy-direct-operator-with-retry-v1.sh');
const validationWorkflow=read('.github/workflows/deploy-mail-studio-multilingual.yml');
const publicAssetsValidation=read('.github/workflows/deploy-public-portal-assets-safe.yml');
const blogMirrorWorkflow=read('.github/workflows/blog-mirror-publish.yml');
const editorialDeployWorkflow=read('.github/workflows/editorial-content-deploy.yml');
const nightlySeoWorkflow=read('.github/workflows/gnk-seo-nightly-audit.yml');
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
 'notify_search_engines:','default: false',"if: ${{ needs.deploy-production.result == 'success' && inputs.notify_search_engines == true }}",
 'deploy-preflight-${{ inputs.approved_sha }}','bash scripts/verify-production-release-v38.sh deploy-verification',
 'bash ../../scripts/deploy-direct-operator-with-retry-v1.sh','deploy-wrangler-logs-${{ inputs.approved_sha }}'
]);

const devtoPreviewWorkflow=read('.github/workflows/devto-mirror-publish.yml');
requireText('read-only Dev.to mirror preview',devtoPreviewWorkflow,[
 "cron: '45 * * * *'",'permissions:\n  contents: read',"node-version: '24'",
 'Preview queue without secrets','node scripts/devto-publish-resilient-v1.mjs','actions/upload-artifact@v4'
]);
forbidText('read-only Dev.to mirror preview',devtoPreviewWorkflow,['contents: write','DEVTO_API_KEY','--live','git push','continue-on-error: true']);

const externalDistributionWorkflows=[
 ['blog-mirror-publish.yml',blogMirrorWorkflow],
 ['objavi-devto-sada.yml',read('.github/workflows/objavi-devto-sada.yml')],
 ['objavi-tumblr-sada.yml',read('.github/workflows/objavi-tumblr-sada.yml')],
 ['social-distribution.yml',read('.github/workflows/social-distribution.yml')]
];
for(const [name,source] of externalDistributionWorkflows){
 const triggers=source.match(/^on:\s*\n([\s\S]*?)^(?:permissions|concurrency|jobs):/m)?.[1]||'';
 requireText(`external distribution opt-in (${name})`,source,[
  'confirm_external_distribution:','default: false',"inputs.confirm_external_distribution == true",
  "vars.GNK_ASG_EXTERNAL_DISTRIBUTION == 'true'","github.ref == 'refs/heads/main'"
 ]);
 assert.match(triggers,/^\s{2}workflow_dispatch:/m,`${name} must be manually dispatched`);
 assert.doesNotMatch(triggers,/^\s{2}(?:push|schedule):/m,`${name} must never be triggered automatically`);
}
const socialWorkflow=externalDistributionWorkflows.find(([name])=>name==='social-distribution.yml')[1];
requireText('social live approval gate',socialWorkflow,["vars.SOCIAL_LIVE != '1'","inputs.confirm_external_distribution == true"]);
const devtoOneShot=externalDistributionWorkflows.find(([name])=>name==='objavi-devto-sada.yml')[1];
const tumblrOneShot=externalDistributionWorkflows.find(([name])=>name==='objavi-tumblr-sada.yml')[1];
forbidText('Dev.to credential inputs',devtoOneShot,['devto_key:','inputs.devto_key']);
requireText('Dev.to repository credential',devtoOneShot,['secrets.DEVTO_API_KEY']);
forbidText('Tumblr credential inputs',tumblrOneShot,['consumer_key:','consumer_secret:','token_secret:','inputs.consumer_key','inputs.consumer_secret']);
requireText('Tumblr repository credentials',tumblrOneShot,['secrets.TUMBLR_CONSUMER_KEY','secrets.TUMBLR_CONSUMER_SECRET','secrets.TUMBLR_TOKEN','secrets.TUMBLR_TOKEN_SECRET']);
const schedulePolicy=JSON.parse(read('ops/production-workflow-allowlist-v2.json'));
assert.ok(!schedulePolicy.scheduledProductionOwners['blog-mirror-publish.yml'],'external distribution must not be scheduled');
assert.deepEqual(schedulePolicy.scheduledProductionOwners['devto-mirror-publish.yml'],["45 * * * *"],'Dev.to mirror schedule must remain read-only preview only');
assert.equal(schedulePolicy.externalDistributionApproval.repositoryOptInVariable,'GNK_ASG_EXTERNAL_DISTRIBUTION');
assert.equal(schedulePolicy.externalDistributionApproval.perRunInput,'confirm_external_distribution');
assert.equal(schedulePolicy.externalDistributionApproval.automaticTriggersAllowed,false);
assert.deepEqual(
 [...schedulePolicy.externalDistributionApproval.livePublishingWorkflows].sort(),
 externalDistributionWorkflows.map(([name])=>name).sort()
);
requireText('editorial deploy notification suppression',editorialDeployWorkflow,['notify_search_engines=false']);
requireText('nightly search notification gate',nightlySeoWorkflow,[
 'notify_search_engines:','default: false',"github.event_name == 'workflow_dispatch' && inputs.notify_search_engines == true",
 'Manually submit URLs to IndexNow after explicit approval'
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
requireText('production verifier',verifier,['x-gnk-deploy-revision','x-gnk-active-release','x-gnk-active-entrypoint','contact readiness HTTP 200','home-bank-nav-version','menu-bank','Banka / Adria Bank','20261012-radio-panel-polish-v2-bank-nav-v1']);
forbidText('production verifier',verifier,['wrangler deploy','cloudflare_api_token=']);

console.log(JSON.stringify({
 ok:true,
 approvalInput:'exact-main-sha',
 boundedCloudflareRetry:true,
 retryOnlyForAssetsSession10013:true,
 diagnosticsArtifact:true,
 searchNotifications:'default-off-explicit-opt-in-required',
 externalDistribution:'manual-per-run-owner-opt-in-required',
 alternateProductionDeploys:false
},null,2));
