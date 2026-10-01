import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = path.join(ROOT, 'config', 'control-plane', 'bot-ownership-v1.json');
const WORKFLOWS = path.join(ROOT, '.github', 'workflows');
const failures = [];
const warnings = [];

const data = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const byWorkflow = new Map(data.workflows.map((w) => [w.workflow, w]));
const shared = new Set(Object.keys(data.policy.sharedPathMigrationExceptions || {}));
const legacyDirectMain = new Set(data.policy.legacyDirectMainAllowlist || []);

function workflowText(name) {
  const p = path.join(WORKFLOWS, name);
  if (!fs.existsSync(p)) {
    failures.push('registered workflow missing: ' + name);
    return '';
  }
  return fs.readFileSync(p, 'utf8');
}
function hasWritePermission(text) { return /contents:\s*write\b/.test(text); }
function hasDirectMainPush(text) { return /git\s+push[^\n]*(?:HEAD:main|origin\s+main)\b/.test(text); }
function isReadOnlyRole(role) { return /auditor|supervisor|archived-wrapper/.test(role); }

for (const entry of data.workflows) {
  const text = workflowText(entry.workflow);
  if (!text) continue;
  if (isReadOnlyRole(entry.role) && hasWritePermission(text)) failures.push(entry.workflow + ': read-only role has contents: write');
  if (isReadOnlyRole(entry.role) && hasDirectMainPush(text)) failures.push(entry.workflow + ': read-only role pushes directly to main');
  if (entry.workflow === 'workforce-supervisor-agent.yml' && (hasWritePermission(text) || hasDirectMainPush(text))) {
    failures.push('workforce-supervisor-agent.yml must remain strictly read-only');
  }
}

const owners = new Map();
for (const entry of data.workflows) {
  for (const p of entry.write || []) {
    if (shared.has(p)) continue;
    const previous = owners.get(p);
    if (previous && previous !== entry.workflow) failures.push('duplicate registered writer for ' + p + ': ' + previous + ' and ' + entry.workflow);
    else owners.set(p, entry.workflow);
  }
}

for (const file of fs.readdirSync(WORKFLOWS).filter((f) => /\.ya?ml$/i.test(f))) {
  const text = fs.readFileSync(path.join(WORKFLOWS, file), 'utf8');
  if (!hasDirectMainPush(text)) continue;
  if (!legacyDirectMain.has(file)) failures.push(file + ': unregistered direct-main writer');
  else warnings.push(file + ': legacy direct-main writer; migration debt remains');
}
for (const file of legacyDirectMain) {
  if (!byWorkflow.has(file)) failures.push(file + ': legacy direct-main allowlist entry lacks ownership record');
}
const taskIds = new Set(data.auditTasks.map((t) => t.id));
for (let id = 1; id <= 23; id++) if (!taskIds.has(id)) failures.push('missing audit task ' + id);

const result = {
  ok: failures.length === 0,
  version: data.version,
  registeredWorkflows: data.workflows.length,
  mappedAuditTasks: data.auditTasks.length,
  legacyDirectMainDebt: warnings.length,
  warnings,
  failures
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
