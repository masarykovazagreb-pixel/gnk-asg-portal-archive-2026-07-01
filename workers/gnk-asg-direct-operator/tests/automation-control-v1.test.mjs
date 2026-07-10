import assert from 'node:assert/strict';
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

console.log('automation-control-v1: 99% content automation enabled with protected final actions');
