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

const readSource=name=>readFile(new URL(`../src/${name}`,import.meta.url),'utf8');
const authSource=await readSource('index-unified-auth-v14.js');
const activeGuard=await readSource('index-unified-auth-v16.js');
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
assert.match(activeGuard,/scheduledAutomation:'email-status-sync-only'/,'version metadata must disclose the only scheduled task');
assert.match(activeGuard,/lowerScheduledHandlers:'disabled'/,'version metadata must disclose that lower scheduled handlers are disabled');
assert.doesNotMatch(activeGuard,/app\.scheduled/,'active V16 cron must not invoke public operations, project workforce or news scheduled cycles');

const trackingFacade=await readSource('email-status-tracking-v5.js');
const trackingV6=await readSource('email-status-tracking-v6.js');
const trackingV5Core=await readSource('email-status-tracking-v5-core.js');
const trackingV4=await readSource('email-status-tracking-v4.js');
const trackingV2=await readSource('email-status-tracking-v2.js');
const trackingV3=await readSource('email-status-tracking-v3.js');
const trackingSchema=await readSource('email-status-tracking-v1.js');
assert.match(trackingFacade,/export \* from '.\/email-status-tracking-v6\.js'/,'V5 facade must resolve to V6');
assert.match(trackingV6,/GNK_ASG_EMAIL_STATUS_TRACKING_V6_20260710_/,'V6 tracking marker must reflect the restored deployment');
assert.match(trackingV6,/email-status-dashboard-v2\.js\?v=20260710-3/,'Email Status dashboard enhancer must use the current cache key');
assert.match(trackingV6,/import \* as base from '.\/email-status-tracking-v5-core\.js'/);
assert.match(trackingV6,/export const API_PREFIX=base\.API_PREFIX/);
assert.match(trackingV6,/export const withEmailStatusTracking=base\.withEmailStatusTracking/);
assert.match(trackingV6,/export const syncCloudflareEmailStatuses=base\.syncCloudflareEmailStatuses/);
assert.match(trackingV5Core,/import \* as base from '.\/email-status-tracking-v4\.js'/);
assert.match(trackingV4,/import \* as rawTracking from '.\/email-status-tracking-v2\.js'/);
assert.match(trackingV4,/import \* as status from '.\/email-status-tracking-v3\.js'/);
assert.match(trackingV2,/import \{EmailMessage\} from 'cloudflare:email'/,'raw MIME tracking must retain the Cloudflare email virtual module');
assert.match(trackingV3,/handleEmailStatusRequest/);
assert.match(trackingSchema,/first_opened_at TEXT/);
assert.match(trackingSchema,/last_opened_at TEXT/);
assert.match(trackingSchema,/open_count INTEGER/);
assert.doesNotMatch(trackingSchema,/ip_address|user_agent|cf-connecting-ip|user-agent/i,'Email Status must not store IP addresses or user-agent metadata');

const wrangler=await readFile(new URL('../wrangler.toml',import.meta.url),'utf8');
assert.match(wrangler,/keep_vars = true/,'Wrangler deploy must preserve existing dashboard variables not listed in source control');
assert.match(wrangler,/EMAIL_OPEN_TRACKING_ENABLED = "true"/,'deploy configuration must inject the classic open-tracking pixel');
assert.match(wrangler,/MEDIA_OUTREACH_LIVE = "false"/,'media outreach must remain disabled');
assert.match(wrangler,/MAIL_PROFILE_TEST_LIVE = "false"/,'mail profile test sends must remain disabled');

console.log('automation-control-v1: protected actions, preserved dashboard variables, Worker Ops, Email Status tracking and scheduled-sync isolation locked');
