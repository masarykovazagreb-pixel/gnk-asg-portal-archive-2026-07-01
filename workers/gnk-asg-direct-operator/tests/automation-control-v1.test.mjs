import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AUTOMATION_POLICY, AUTOMATION_VERSION, canRunAutomation, getAutomationStatus, requiresManualApproval } from '../src/automation-control-v1.js';

assert.match(AUTOMATION_VERSION,/^GNK_ASG_AUTOMATION_CONTROL_V1_/);
assert.equal(AUTOMATION_POLICY.enabled,true);
assert.equal(AUTOMATION_POLICY.targetAutomationPercent,99);
assert.equal(AUTOMATION_POLICY.mode,'prepare-review-queue');

for(const capability of ['research','drafting','translation','seoMetadata','visualBriefs','newsroomArticles','publicationQueue','qualityChecks','accessibilityChecks','hrEnParityChecks']){
  assert.equal(canRunAutomation(capability),true,`${capability} must stay enabled`);
}

for(const action of ['externalPublish','productionDeploy','mergeToMain']){
  assert.equal(requiresManualApproval(action),true,`${action} must retain the final approval gate`);
}

for(const action of ['bulkEmail','campaignSend','dnsChanges','cloudflareRouteChanges','secretChanges']){
  assert.equal(AUTOMATION_POLICY.protectedActions[action],'disabled',`${action} must stay disabled`);
}

const status=getAutomationStatus();
assert.equal(status.ok,true);
assert.equal(status.enabled,true);
assert.equal(status.targetAutomationPercent,99);
assert.equal(status.manualFinalGate,true);
assert.ok(status.disabledExternalActions.includes('bulkEmail'));

const authSource=await readFile(new URL('../src/index-unified-auth-v14.js',import.meta.url),'utf8');
const workerOpsGuard=await readFile(new URL('../src/index-unified-auth-v16.js',import.meta.url),'utf8');
assert.match(authSource,/function safeNext\(/,'shared login next values must remain sanitized');
assert.ok(!authSource.includes("'/worker-ops'"),'shared V14 auth logic must remain unchanged by the Worker Ops fix');
assert.match(workerOpsGuard,/WORKER_OPS_LOGIN_NEXT='\/operator-dashboard\/\?workerOpsReturn=1'/,'V16 must use a safe allowed intermediate login target');
assert.match(workerOpsGuard,/target\.searchParams\.set\('next',WORKER_OPS_LOGIN_NEXT\)/,'the login form must preserve the isolated return marker');
assert.match(workerOpsGuard,/target\.searchParams\.get\('workerOpsReturn'\)!=='1'/,'only the explicit Worker Ops return marker may be rewritten');
assert.match(workerOpsGuard,/headers\.set\('location',WORKER_OPS_PATH\)/,'successful login must return to /worker-ops/');
assert.match(workerOpsGuard,/path\.startsWith\('\/worker-ops\/'\)/,'direct Worker Ops assets must stay behind the entry guard');

console.log('automation-control-v1: protected final actions and isolated Worker Ops login return locked');
