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
const activeGuard=await readFile(new URL('../src/index-unified-auth-v16.js',import.meta.url),'utf8');
assert.match(authSource,/function safeNext\(/,'shared login next values must remain sanitized');
assert.ok(!authSource.includes("'/worker-ops'"),'shared V14 auth logic must remain unchanged by the Worker Ops fix');
assert.match(activeGuard,/WORKER_OPS_LOGIN_NEXT='\/operator-dashboard\/\?workerOpsReturn=1'/,'V16 must use a safe allowed intermediate login target');
assert.match(activeGuard,/target\.searchParams\.set\('next',WORKER_OPS_LOGIN_NEXT\)/,'the login form must preserve the isolated return marker');
assert.match(activeGuard,/target\.searchParams\.get\('workerOpsReturn'\)!=='1'/,'only the explicit Worker Ops return marker may be rewritten');
assert.match(activeGuard,/headers\.set\('location',WORKER_OPS_PATH\)/,'successful login must return to /worker-ops/');
assert.match(activeGuard,/path\.startsWith\('\/worker-ops\/'\)/,'direct Worker Ops assets must stay behind the entry guard');

assert.match(activeGuard,/withEmailStatusTracking/,'active V16 must install the outbound Email Status tracking proxy');
assert.match(activeGuard,/handleEmailStatusRequest/,'active V16 must route Email Status APIs to the tracking backend');
assert.match(activeGuard,/syncCloudflareEmailStatuses/,'active V16 scheduled handler must reconcile provider delivery states');
assert.match(activeGuard,/isEmailStatusApiPath\(path\)/,'active V16 must intercept the Email Status API namespace');
assert.match(activeGuard,/!isEmailStatusPixel\(path\)&&!await isAuthenticated/,'records, health and sync must require operator authentication');
assert.match(activeGuard,/const active=trackedEnv\(env\)/,'fetch, scheduled and email handlers must use the tracked environment');
assert.match(activeGuard,/emailStatusApi:'operator-auth-required'/,'version metadata must advertise the protected API contract');
assert.match(activeGuard,/emailStatusPixel:'public-no-request-metadata'/,'version metadata must advertise the privacy-minimized public pixel contract');

const emailStatus=await import('../src/email-status-tracking-v5.js');
assert.match(emailStatus.VERSION,/^GNK_ASG_EMAIL_STATUS_TRACKING_V6_/,'V5 compatibility facade must resolve to the current V6 implementation');
assert.equal(emailStatus.API_PREFIX,'/api/email-status');
for(const name of ['withEmailStatusTracking','handleEmailStatusRequest','syncCloudflareEmailStatuses','isEmailStatusPath']){
  assert.equal(typeof emailStatus[name],'function',`Email Status export ${name} must remain available`);
}
const emailStatusSchema=await readFile(new URL('../src/email-status-tracking-v1.js',import.meta.url),'utf8');
assert.match(emailStatusSchema,/first_opened_at TEXT/);
assert.match(emailStatusSchema,/last_opened_at TEXT/);
assert.match(emailStatusSchema,/open_count INTEGER/);
assert.doesNotMatch(emailStatusSchema,/ip_address|user_agent|cf-connecting-ip|user-agent/i,'Email Status must not store IP addresses or user-agent metadata');

console.log('automation-control-v1: protected final actions, Worker Ops return and active privacy-minimized Email Status gateway locked');
