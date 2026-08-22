#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const modelPath = path.join(root, 'config/nn-constitutional-model-v1.json');

const fail = (message) => {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
};

if (!fs.existsSync(modelPath)) fail('Missing config/nn-constitutional-model-v1.json');
if (process.exitCode) process.exit(process.exitCode);

const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));

if (model.version !== 'NN_CONSTITUTIONAL_MODEL_V1') fail('Unexpected NN model version.');
if (model.objective?.verifiedOperationalAutonomyTargetPct !== 99) fail('Operational autonomy target must remain 99%.');
if (model.objective?.sovereignOwnerAuthorityPct !== 1) fail('Sovereign Owner authority must remain 1%.');

for (const key of ['selfPrivilegeEscalation', 'selfApprovalR2R3']) {
  if (model.authority?.[key] !== false) fail(`authority.${key} must remain false.`);
}
if (model.authority?.authorityChangesRequireExplicitHumanAuthorization !== true) fail('Authority changes must require explicit human authorization.');
if (model.authority?.bindingExternalActionsRequireOwnerOrDelegatedHumanApproval !== true) fail('Binding external actions must require human approval.');

for (const layer of ['core', 'operational', 'knowledge', 'learning']) {
  if (!model.memory?.layers?.includes(layer)) fail(`Missing memory layer: ${layer}`);
}
for (const ledger of ['outcome', 'decision', 'capability', 'rejected-strategy', 'provenance', 'freshness', 'confidence']) {
  if (!model.memory?.ledgers?.includes(ledger)) fail(`Missing NN ledger: ${ledger}`);
}

const expectedPipeline = ['individual-first', 'peer', 'collective', 'contradiction-search', 'red-team', 'independent-reviewer', 'orchestrator-or-ceo', 'nn-learning'];
if (JSON.stringify(model.reasoningPipeline) !== JSON.stringify(expectedPipeline)) fail('Reasoning pipeline order changed or is incomplete.');

for (const moduleName of ['metaReasoner', 'strategyGenome', 'capabilityEvolutionEngine', 'externalIntelligenceMesh', 'modelCouncil', 'novelLogicLab', 'evolutionEvaluator', 'rollbackMemory']) {
  if (!model.evolutionModules?.[moduleName]) fail(`Missing evolution module: ${moduleName}`);
}
if (model.evolutionModules?.novelLogicLab?.productionWrite !== false) fail('Novel Logic Lab must remain sandbox-only.');

for (const gate of ['sandbox-task-pass', 'independent-test-pass', 'measured-quality-threshold', 'reviewer-approval', 'no-critical-safety-regression']) {
  if (!model.workforceTraining?.promotionGate?.required?.includes(gate)) fail(`Missing promotion gate: ${gate}`);
}
if (model.workforceTraining?.promotionGate?.timeServedSufficient !== false) fail('Time served must never be sufficient for worker promotion.');

const publicStatuses = model.publicWorkerEntityLayer?.truthfulStatusOnly ?? [];
if (JSON.stringify(publicStatuses) !== JSON.stringify(['LIVE', 'STALE', 'DEGRADED'])) fail('Public worker statuses must remain exactly LIVE/STALE/DEGRADED.');
for (const banned of ['fabricated-activity', 'doorway-pages', 'keyword-stuffing']) {
  if (!model.publicWorkerEntityLayer?.prohibitions?.includes(banned)) fail(`Missing public entity prohibition: ${banned}`);
}

const guard = model.releaseGuardrails ?? {};
for (const requiredTrue of ['singleWriter', 'exactShaBeforeWrite', 'serializedWriteMergeDeploy', 'failClosedUnknownWriterState', 'socialWritesOnHold', 'noSecretsInRepoOrClient', 'standardGithubHostedRunnerOnlyUnlessSeparatelyApproved', 'noBlindReruns', 'noFakeGreen']) {
  if (guard[requiredTrue] !== true) fail(`releaseGuardrails.${requiredTrue} must remain true.`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log('NN constitutional model contract is valid: authority ceiling, memory layers, reasoning pipeline, promotion gates and release guardrails are intact.');
