import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const contractPath = path.join(root, 'ops/app-worker-route-isolation.json');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(contract.mode === 'stabilization-hold', 'Isolation contract must remain in stabilization-hold mode.');
assert(contract.rules?.allowProtectedPathChanges === false, 'Protected path changes must remain disabled.');
assert(contract.rules?.allowWorkerRouteChanges === false, 'Worker route changes must remain disabled.');
assert(contract.rules?.allowCloudflareConfigurationChanges === false, 'Cloudflare configuration changes must remain disabled.');
assert(contract.rules?.allowDeploy === false, 'Deploy must remain disabled.');
assert(contract.rules?.requireExplicitApprovalToReleaseHold === true, 'Explicit approval must be required to release hold mode.');

const requiredProtectedPrefixes = [
  'apps/portal/app/',
  'apps/portal/preuzimanja/api-lab/'
];
for (const prefix of requiredProtectedPrefixes) {
  assert(contract.protectedRepositoryPrefixes?.includes(prefix), `Missing protected repository prefix: ${prefix}`);
}

const requiredProtectedBranches = [
  'checkpoint/recovery-20260729-1617-zagreb',
  'api-lab',
  'api-lab-pages',
  'api-lab-preuzimanja',
  'tocka-vracanja/preuzimanja-20260729'
];
for (const branch of requiredProtectedBranches) {
  assert(contract.protectedBranches?.includes(branch), `Missing protected branch: ${branch}`);
}

let changedFiles = [];
try {
  const baseRef = process.env.GITHUB_BASE_REF || 'main';
  execFileSync('git', ['fetch', '--no-tags', '--depth=1', 'origin', baseRef], { stdio: 'ignore' });
  const diff = execFileSync('git', ['diff', '--name-only', `origin/${baseRef}...HEAD`], { encoding: 'utf8' });
  changedFiles = diff.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
} catch (error) {
  errors.push(`Unable to calculate protected-path diff: ${error.message}`);
}

for (const file of changedFiles) {
  for (const prefix of contract.protectedRepositoryPrefixes || []) {
    if (file.startsWith(prefix)) errors.push(`Protected path changed by this PR: ${file}`);
  }

  const basename = path.basename(file);
  if ((contract.workerConfigurationPatterns || []).includes(basename)) {
    errors.push(`Worker or Cloudflare configuration changed during hold mode: ${file}`);
  }
}

const automationFiles = changedFiles.filter((file) =>
  (file.startsWith('.github/workflows/') || file.startsWith('scripts/')) &&
  file !== 'scripts/validate-app-worker-route-isolation.mjs'
);

for (const file of automationFiles) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
  const text = fs.readFileSync(absolute, 'utf8');
  for (const protectedPath of contract.protectedPublicPaths || []) {
    const mutationPattern = new RegExp(`(?:write|copy|move|rename|delete|remove|deploy|publish)[^\\n]{0,160}${protectedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    if (mutationPattern.test(text)) {
      errors.push(`Automation appears able to mutate protected public path ${protectedPath}: ${file}`);
    }
  }
}

if (errors.length > 0) {
  console.error('App and Worker route isolation contract failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`App and Worker route isolation contract passed. Reviewed ${changedFiles.length} changed files.`);
