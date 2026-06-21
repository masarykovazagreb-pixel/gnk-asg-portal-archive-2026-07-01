import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'reports', 'final-predeploy-gate');
const CONFIG_PATH = 'config/final-predeploy-gate.json';

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function json(relativePath) {
  return JSON.parse(read(relativePath));
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function check(id, pass, detail, severity = 'blocking') {
  return { id, pass: Boolean(pass), detail, severity };
}

const config = json(CONFIG_PATH);
const missingRequiredFiles = config.requiredFiles.filter(file => !exists(file));

const workflow = missingRequiredFiles.includes('.github/workflows/production-live-sync.yml')
  ? ''
  : read('.github/workflows/production-live-sync.yml');
const backlog = missingRequiredFiles.includes('config/project-completion-backlog.json')
  ? {}
  : json('config/project-completion-backlog.json');
const mailToml = missingRequiredFiles.includes('workers/gnk-asg-mail-agent-worker/wrangler.release.toml')
  ? ''
  : read('workers/gnk-asg-mail-agent-worker/wrangler.release.toml');
const directToml = missingRequiredFiles.includes('workers/gnk-asg-direct-operator/wrangler.toml')
  ? ''
  : read('workers/gnk-asg-direct-operator/wrangler.toml');
const publicToml = missingRequiredFiles.includes('workers/gnk-asg-public-pages-live/wrangler.live.toml')
  ? ''
  : read('workers/gnk-asg-public-pages-live/wrangler.live.toml');
const mediaKit = missingRequiredFiles.includes('apps/portal/media-kit/source/media-kit-manifest.json')
  ? {}
  : json('apps/portal/media-kit/source/media-kit-manifest.json');
const video = missingRequiredFiles.includes('apps/portal/data/video-featured.json')
  ? {}
  : json('apps/portal/data/video-featured.json');
const social = missingRequiredFiles.includes('contracts/social-share-policy.json')
  ? {}
  : json('contracts/social-share-policy.json');
const waActions = missingRequiredFiles.includes('apps/portal/data/wa-actions.json')
  ? {}
  : json('apps/portal/data/wa-actions.json');

const checks = [
  check('required-files-present', missingRequiredFiles.length === 0, missingRequiredFiles.length ? missingRequiredFiles.join(', ') : `${config.requiredFiles.length} files present`),
  check('release-candidate-pinned', /^[0-9a-f]{40}$/i.test(config.releaseCandidateCommit), config.releaseCandidateCommit),
  check('production-workflow-manual-only', workflow.includes('workflow_dispatch:') && !/^\s*push:\s*$/m.test(workflow) && !/^\s*pull_request:\s*$/m.test(workflow), 'workflow_dispatch only'),
  check('production-environment-approval', workflow.includes('environment: production'), 'GitHub production environment gate present'),
  check('typed-production-confirmation', workflow.includes("PRODUCTION_APPROVED"), 'exact typed confirmation present'),
  check('approval-marker-validation', workflow.includes('.github/release/PRODUCTION_APPROVED') && workflow.includes('source_commit:'), 'marker path and source commit validation present'),
  check('marker-only-commit-validation', workflow.includes('git diff --name-only HEAD^ HEAD') && workflow.includes("= '1'"), 'approval commit restricted to one marker file'),
  check('mail-live-send-disabled', /MEDIA_CAMPAIGN_LIVE_SEND\s*=\s*"false"/.test(mailToml), 'mass-mail live send remains false'),
  check('mail-safety-tests-in-production-gate', workflow.includes('media-campaign-suppression.test.js') && workflow.includes('media-campaign-retry.test.js') && workflow.includes('media-campaign-e2e.test.js'), 'suppression, retry and 100-recipient simulation required'),
  check('secure-direct-operator-entry', /main\s*=\s*"src\/index-secure\.js"/.test(directToml), 'secure operator wrapper active'),
  check('mail-agent-route-present', /gnk-asg\.hr\/api\/mail-agent\/\*/.test(mailToml), 'Mail Agent route configured'),
  check('mobile-operator-route-present', /gnk-asg\.hr\/operator-mobile\/\*/.test(publicToml), 'mobile operator route configured'),
  check('backlog-production-untouched', backlog.productionTouched === false, `productionTouched=${backlog.productionTouched}`),
  check('backlog-merge-locked', backlog.mergeAllowed === false, `mergeAllowed=${backlog.mergeAllowed}`),
  check('backlog-manual-approval-required', backlog.releaseConstraints?.noProductionDeployWithoutApproval === true && backlog.releaseConstraints?.explicitProductionApprovalMarkerRequired === true, 'manual approval and marker required'),
  check('media-kit-unapproved-download-disabled', mediaKit.productionApproved === false && mediaKit.publicDownloadEnabled === false, `productionApproved=${mediaKit.productionApproved}, publicDownloadEnabled=${mediaKit.publicDownloadEnabled}`),
  check('video-awaiting-upload-not-indexed', video.status === 'awaiting_upload' && video.indexable === false && !video.streamUrl && !video.mp4Url, `status=${video.status}, indexable=${video.indexable}`),
  check('social-autopost-production-locked', social.productionLocked === true && social.deploymentApproved === false && social.safety?.noAutomaticSocialPostingWithoutProviderOAuth === true, 'automatic provider posting remains locked'),
  check('whatsapp-actions-contain-no-secrets', !JSON.stringify(waActions).match(/token|secret|api[_-]?key/i), 'navigation and handover actions only'),
  check('core-deploy-status-defined', ['ready_for_manual_approval', 'ready_for_explicit_production_approval'].includes(config.coreDeploy?.status), config.coreDeploy?.status || 'missing'),
  check('optional-integrations-nonblocking', config.optionalExternalIntegrations.every(item => item.blocksCoreDeploy === false), `${config.optionalExternalIntegrations.length} optional integrations explicitly nonblocking`, 'advisory'),
  check('production-not-preapproved', config.safetyLocks?.productionTouchedBeforeApproval === false && config.safetyLocks?.mergeAllowedBeforeApproval === false, 'preapproval production and merge remain disabled')
];

const blockingFailures = checks.filter(item => !item.pass && item.severity === 'blocking');
const advisoryFailures = checks.filter(item => !item.pass && item.severity !== 'blocking');
const technicalReady = blockingFailures.length === 0;

const report = {
  generatedAt: new Date().toISOString(),
  releaseCandidateCommit: config.releaseCandidateCommit,
  validationBranch: config.validationBranch,
  technicalReady,
  deployStatus: technicalReady ? 'READY_FOR_EXPLICIT_PRODUCTION_APPROVAL' : 'BLOCKED_TECHNICAL',
  productionDeployExecuted: false,
  productionTouched: false,
  massMailLiveSendEnabled: false,
  automaticSocialPostingEnabled: false,
  approvalStillRequired: true,
  productionSmokeTestStillRequired: true,
  optionalIntegrationsDeferred: config.optionalExternalIntegrations.map(item => ({
    id: item.id,
    status: item.status,
    blocksCoreDeploy: item.blocksCoreDeploy,
    requires: item.requires
  })),
  checks,
  blockingFailures: blockingFailures.map(item => item.id),
  advisoryFailures: advisoryFailures.map(item => item.id)
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'predeploy-gate-report.json'), `${JSON.stringify(report, null, 2)}\n`);

const rows = checks.map(item => `| ${item.pass ? 'PASS' : 'FAIL'} | ${item.severity} | ${item.id} | ${String(item.detail).replace(/\|/g, '\\|')} |`).join('\n');
const deferred = report.optionalIntegrationsDeferred.map(item => `- ${item.id}: ${item.status}; core deploy blocker: ${item.blocksCoreDeploy ? 'yes' : 'no'}`).join('\n');

const markdown = `# GNK ASG final pre-deploy gate\n\n- Deploy status: **${report.deployStatus}**\n- Release candidate: \`${report.releaseCandidateCommit}\`\n- Technical checks: ${checks.length - blockingFailures.length - advisoryFailures.length}/${checks.length} passing\n- Production deploy executed: **NO**\n- Production touched: **NO**\n- Explicit production approval still required: **YES**\n- Production smoke test still required: **YES**\n- Mass-mail live send: **DISABLED**\n- Automatic social posting: **DISABLED**\n\n## Checks\n\n| Result | Severity | Check | Detail |\n|---|---|---|---|\n${rows}\n\n## Deferred optional integrations\n\n${deferred}\n`;

fs.writeFileSync(path.join(OUT, 'predeploy-gate-report.md'), markdown);
console.log(markdown);

if (!technicalReady) process.exit(1);
