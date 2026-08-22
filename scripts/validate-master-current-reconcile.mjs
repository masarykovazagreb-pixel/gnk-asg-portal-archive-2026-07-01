import fs from 'node:fs';

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const fail = (msg) => { throw new Error(msg); };
const assert = (cond, msg) => { if (!cond) fail(msg); };

const nn = read('config/nn-constitutional-model-v1.json');
const learning = read('config/master-asg-intelligence-learning-v1.json');
const health = read('config/health-sentinel-persistent-ledger-v1.json');
const legal = read('config/master-asg-legal-department-v1.json');

assert(nn.objective?.verifiedOperationalAutonomyTargetPct === 99, 'NN autonomy target must be 99');
assert(nn.objective?.sovereignOwnerAuthorityPct === 1, 'Sovereign owner authority must be 1');
assert(nn.authority?.selfPrivilegeEscalation === false, 'NN self privilege escalation must remain disabled');
assert(nn.authority?.selfApprovalR2R3 === false, 'NN R2/R3 self approval must remain disabled');
assert(nn.releaseGuardrails?.singleWriter === true, 'NN must enforce Single-Writer');
assert(nn.releaseGuardrails?.exactShaBeforeWrite === true, 'NN must enforce Exact-SHA');
assert(nn.releaseGuardrails?.socialWritesOnHold === true, 'Social writes must remain HOLD');

assert(learning.modes?.individual?.default === true, 'Individual-first must remain default');
assert(learning.workerFactory?.limits?.selfApproval === false, 'Worker Factory self approval must be disabled');
assert(learning.workerFactory?.limits?.selfEscalationOfPrivileges === false, 'Worker Factory privilege escalation must be disabled');
assert(learning.learningLedger?.required === true, 'Learning ledger must be required');

assert(health.storageModel?.persistentLedgerRequired === true, 'Persistent provider ledger is required');
assert(health.transitionPolicy?.maxAutomaticRetries === 2, 'Automatic retries must remain bounded at 2');
assert(health.transitionPolicy?.unknownStateFailsClosed === true, 'Unknown provider state must fail closed');
assert(health.transitionPolicy?.recoveryHysteresis?.requiredConsecutiveHealthyChecks >= 3, 'Recovery hysteresis must require >=3 healthy checks');
assert(health.selection?.testOrMockProviderProductionReady === false, 'Test/mock provider cannot be production-ready');
assert(health.singleWriter?.stateToMainWritesSerialized === true, 'Provider state-to-main writes must be serialized');
assert(health.singleWriter?.exactShaImmediatelyBeforeWrite === true, 'Provider write must verify Exact-SHA immediately before write');

assert(legal.reportsTo === 'ceo-agent', 'Legal Department must report to CEO agent');
assert(legal.departmentLead?.id === 'clo-agent', 'Legal Department must have CLO agent');
assert(Array.isArray(legal.workers) && legal.workers.some(w => w.id === 'legal-reviewer'), 'Independent legal reviewer is required');
assert(Array.isArray(legal.guardrails) && legal.guardrails.some(g => g.includes('No external filing')), 'Legal external-action approval guardrail is required');

console.log('MASTER current reconciliation contracts: VALID');
