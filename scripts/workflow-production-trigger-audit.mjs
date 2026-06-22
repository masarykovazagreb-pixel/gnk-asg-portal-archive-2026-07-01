import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workflowDir = path.join(root, '.github', 'workflows');
const reportDir = path.join(root, 'reports', 'workflow-production-trigger-audit');
fs.mkdirSync(reportDir, { recursive: true });

const files = fs.readdirSync(workflowDir)
  .filter(name => /\.ya?ml$/i.test(name))
  .sort();

const productionIndicators = [
  /gnk-asg\.hr/i,
  /wrangler\.release\.toml/i,
  /wrangler\.live\.toml/i,
  /workers\/gnk-asg-direct-operator\//i,
  /workers\/gnk-asg-news-pages-live\//i,
  /workers\/gnk-asg-emergency-entry-redirect\//i,
  /workers\/gnk-asg-public-pages-live\//i
];

const records = [];
const violations = [];

for (const file of files) {
  const fullPath = path.join(workflowDir, file);
  const text = fs.readFileSync(fullPath, 'utf8');
  const hasPullRequest = /^\s{0,4}pull_request\s*:/m.test(text);
  const hasPush = /^\s{0,4}push\s*:/m.test(text);
  const hasWorkflowDispatch = /^\s{0,4}workflow_dispatch\s*:/m.test(text);
  const hasWranglerDeploy = /\bwrangler(?:@[^\s]+)?\s+deploy\b|\bwrangler\s+deploy\b/i.test(text);
  const hasProductionIndicator = productionIndicators.some(pattern => pattern.test(text));
  const hasProductionEnvironment = /^\s+environment\s*:\s*production\s*$/m.test(text);
  const hasTypedApproval = /APPROVED/.test(text) && /github\.event\.inputs\.(?:approval|confirmation)/.test(text);
  const hasSourceCommitInput = /source_commit|approved_commit/.test(text);
  const validatesFullSha = /\^\[0-9a-fA-F\]\{40\}\$/.test(text) || /40-character commit SHA/i.test(text);
  const hasApprovalMarker = /PRODUCTION_APPROVED/.test(text) || hasTypedApproval;
  const autoTriggered = hasPullRequest || hasPush;
  const productionDeploy = hasWranglerDeploy && hasProductionIndicator;
  const gatedManualDeploy = hasWorkflowDispatch && hasProductionEnvironment && hasTypedApproval && hasSourceCommitInput && validatesFullSha;

  const record = {
    file,
    hasPullRequest,
    hasPush,
    hasWorkflowDispatch,
    hasWranglerDeploy,
    hasProductionIndicator,
    productionDeploy,
    gatedManualDeploy,
    hasApprovalMarker
  };
  records.push(record);

  if (productionDeploy && autoTriggered) {
    violations.push({
      file,
      code: 'automatic_production_deploy_trigger',
      message: 'Production-capable wrangler deploy must not run from pull_request or push.'
    });
  }

  if (productionDeploy && !gatedManualDeploy) {
    violations.push({
      file,
      code: 'missing_manual_production_gate',
      message: 'Production-capable deploy must require workflow_dispatch, production environment approval, typed approval and full SHA.'
    });
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  workflowCount: records.length,
  productionDeployWorkflowCount: records.filter(item => item.productionDeploy).length,
  gatedProductionDeployWorkflowCount: records.filter(item => item.productionDeploy && item.gatedManualDeploy).length,
  violationCount: violations.length,
  status: violations.length === 0 ? 'PASS' : 'FAIL',
  productionTouched: false,
  records,
  violations
};

fs.writeFileSync(path.join(reportDir, 'report.json'), `${JSON.stringify(summary, null, 2)}\n`);

const lines = [
  '# GNK ASG production workflow trigger audit',
  '',
  `- Status: **${summary.status}**`,
  `- Workflow files: ${summary.workflowCount}`,
  `- Production-capable deploy workflows: ${summary.productionDeployWorkflowCount}`,
  `- Properly gated production deploy workflows: ${summary.gatedProductionDeployWorkflowCount}`,
  `- Violations: ${summary.violationCount}`,
  '- Production touched: **NO**',
  '',
  '| Workflow | Production deploy | Manual gate | Pull request | Push |',
  '|---|---:|---:|---:|---:|',
  ...records.map(item => `| ${item.file} | ${item.productionDeploy ? 'yes' : 'no'} | ${item.gatedManualDeploy ? 'yes' : 'no'} | ${item.hasPullRequest ? 'yes' : 'no'} | ${item.hasPush ? 'yes' : 'no'} |`)
];

if (violations.length) {
  lines.push('', '## Violations', '');
  for (const violation of violations) {
    lines.push(`- ${violation.file}: ${violation.code} — ${violation.message}`);
  }
}

fs.writeFileSync(path.join(reportDir, 'report.md'), `${lines.join('\n')}\n`);
console.log(lines.join('\n'));

if (violations.length) process.exit(1);
