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

const publicLayer = model.publicWorkerEntityLayer ?? {};
if (publicLayer.indexOnlyPublicIntendedProfiles !== true) fail('Only explicitly public-intended worker profiles may be indexable.');
const requiredPublicSeo = [
  'unique-title',
  'unique-meta-description',
  'canonical',
  'reciprocal-hreflang-hr-en-x-default',
  'open-graph',
  'twitter-card',
  'breadcrumb-schema',
  'semantically-correct-entity-schema',
  'stable-slug',
  'internal-links',
  'controlled-image-alt-width-height',
  'sitemap',
  'image-sitemap',
  'indexability-check'
];
for (const requirement of requiredPublicSeo) {
  if (!publicLayer.requiredWhenApplicable?.includes(requirement)) fail(`Missing public worker SEO/entity requirement: ${requirement}`);
}
for (const requirement of ['CollectionPage', 'ItemList', 'Organization', 'BreadcrumbList', 'aggregated-public-results', 'worker-categories', 'skills', 'internal-linking', 'aeo-geo-entity-structure']) {
  if (!publicLayer.hubRequirements?.includes(requirement)) fail(`Missing Digital Workforce hub requirement: ${requirement}`);
}
const publicStatuses = publicLayer.truthfulStatusOnly ?? [];
if (JSON.stringify(publicStatuses) !== JSON.stringify(['LIVE', 'STALE', 'DEGRADED'])) fail('Public worker statuses must remain exactly LIVE/STALE/DEGRADED.');
for (const banned of ['fabricated-activity', 'doorway-pages', 'keyword-stuffing', 'duplicate-title-meta', 'indexing-sensitive-internal-probation-profiles']) {
  if (!publicLayer.prohibitions?.includes(banned)) fail(`Missing public entity prohibition: ${banned}`);
}

for (const internalField of ['full-structured-evidence', 'provenance', 'confidence', 'results', 'errors']) {
  if (!model.reporting?.internal?.includes(internalField)) fail(`Missing internal reporting requirement: ${internalField}`);
}
for (const externalGuard of ['short-safe-summary', 'no-secrets', 'no-sensitive-data', 'no-confidential-legal-business-data', 'no-private-chain-of-thought']) {
  if (!model.reporting?.external?.includes(externalGuard)) fail(`Missing external reporting guardrail: ${externalGuard}`);
}

const guard = model.releaseGuardrails ?? {};
for (const requiredTrue of ['singleWriter', 'exactShaBeforeWrite', 'serializedWriteMergeDeploy', 'failClosedUnknownWriterState', 'socialWritesOnHold', 'noSecretsInRepoOrClient', 'standardGithubHostedRunnerOnlyUnlessSeparatelyApproved', 'noBlindReruns', 'noFakeGreen']) {
  if (guard[requiredTrue] !== true) fail(`releaseGuardrails.${requiredTrue} must remain true.`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log('NN constitutional model contract is valid: authority ceiling, memory, reasoning, promotion, public worker SEO/entity, reporting and release invariants are intact.');
