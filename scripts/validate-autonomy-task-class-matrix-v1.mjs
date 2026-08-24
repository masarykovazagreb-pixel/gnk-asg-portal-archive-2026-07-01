import fs from 'node:fs';

const path = 'ops/autonomy/task-class-matrix-v1.json';
const doc = JSON.parse(fs.readFileSync(path, 'utf8'));
const required = ['id','owner','risk','scope','allowedActions','deniedActions','preconditions','idempotency','rollback','telemetry','slo','costCeiling','confidenceThreshold','escalationTrigger','retirementPath','status','evidence'];
const validRisks = new Set(['R0','R1','R2','R3']);
const validStatuses = new Set(['verified_auto','blocked','owner_gated','candidate','quarantined','retired']);
let failures = [];

if (!Array.isArray(doc.taskClasses) || doc.taskClasses.length === 0) failures.push('taskClasses missing or empty');
const ids = new Set();
for (const task of doc.taskClasses || []) {
  for (const key of required) {
    if (!(key in task)) failures.push(`${task.id || '<unknown>'}: missing ${key}`);
  }
  if (ids.has(task.id)) failures.push(`${task.id}: duplicate id`);
  ids.add(task.id);
  if (!validRisks.has(task.risk)) failures.push(`${task.id}: invalid risk ${task.risk}`);
  if (!validStatuses.has(task.status)) failures.push(`${task.id}: invalid status ${task.status}`);
  if (!Array.isArray(task.allowedActions) || !Array.isArray(task.deniedActions)) failures.push(`${task.id}: actions must be arrays`);
  if (!Array.isArray(task.preconditions) || task.preconditions.length === 0) failures.push(`${task.id}: preconditions required`);
  if (!Array.isArray(task.telemetry) || task.telemetry.length === 0) failures.push(`${task.id}: telemetry required`);
  if (!Array.isArray(task.evidence) || task.evidence.length === 0) failures.push(`${task.id}: evidence required`);
  if (typeof task.confidenceThreshold !== 'number' || task.confidenceThreshold < 0 || task.confidenceThreshold > 1) failures.push(`${task.id}: confidenceThreshold must be 0..1`);
  if ((task.risk === 'R2' || task.risk === 'R3') && task.status === 'verified_auto') failures.push(`${task.id}: R2/R3 cannot be verified_auto`);
  if ((task.risk === 'R2' || task.risk === 'R3') && task.status !== 'owner_gated' && task.status !== 'blocked' && task.status !== 'retired') failures.push(`${task.id}: R2/R3 must remain owner-gated/blocked/retired`);
  if (task.status === 'verified_auto' && !['R0','R1'].includes(task.risk)) failures.push(`${task.id}: verified_auto only allowed for R0/R1`);
}

const operational = (doc.taskClasses || []).filter(t => t.status !== 'retired');
const verified = operational.filter(t => t.status === 'verified_auto');
const ownerGated = operational.filter(t => t.status === 'owner_gated');
const blocked = operational.filter(t => t.status === 'blocked');
const automationScore = operational.length ? verified.length / operational.length : 0;
const claim99Eligible = automationScore >= 0.99 && blocked.length === 0 && doc.measurement?.claim99Allowed === true;

const result = {
  ok: failures.length === 0,
  version: doc.version,
  definedTaskClasses: operational.length,
  verifiedAuto: verified.length,
  ownerGated: ownerGated.length,
  blocked: blocked.length,
  measuredAutomationRatio: Number(automationScore.toFixed(4)),
  claim99Eligible,
  policyClaim99Allowed: doc.measurement?.claim99Allowed === true,
  failures
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
if (claim99Eligible) {
  console.log('99/1 claim gate: eligible by current matrix.');
} else {
  console.log('99/1 claim gate: NOT eligible; continue evidence collection and blocker removal.');
}
