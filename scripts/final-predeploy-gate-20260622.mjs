import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'config', 'final-predeploy-gate-20260622.json');
const OUT = path.join(ROOT, 'reports', 'final-predeploy-gate-20260622');
fs.mkdirSync(OUT, { recursive: true });

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const checks = [];

const exists = relative => fs.existsSync(path.join(ROOT, relative));
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const json = relative => JSON.parse(read(relative));
const check = (name, pass, detail = '') => checks.push({ name, pass: Boolean(pass), detail: String(detail) });

function ancestor(source) {
  const result = spawnSync('git', ['merge-base', '--is-ancestor', source, 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  return result.status === 0;
}

check('Pinned source commit is a full SHA', /^[0-9a-f]{40}$/.test(config.sourceCommit), config.sourceCommit);
check('Pinned source commit is an ancestor of gate branch', ancestor(config.sourceCommit), config.sourceCommit);
check('Checkpoint branch is named', /^predeploy-checkpoint-/.test(config.checkpointBranch), config.checkpointBranch);
check('Production deploy is disabled in gate configuration', config.productionDeployAllowed === false, config.productionDeployAllowed);
check('Production marker creation is disabled in gate configuration', config.productionMarkerAllowed === false, config.productionMarkerAllowed);
check('Merge is disabled in gate configuration', config.mergeAllowed === false, config.mergeAllowed);
check('Approval marker is absent', !exists('.github/release/PRODUCTION_APPROVED'), 'marker must not exist before explicit approval');

const backlog = json('config/project-completion-backlog.json');
check('Backlog records limited production hotfix history', backlog.productionTouched === true && backlog.limitedEmergencyHotfixesExecuted === true, 'historical hotfixes recorded');
check('Full production release has not executed', backlog.fullProductionReleaseExecuted === false, backlog.fullProductionReleaseExecuted);
check('Merge remains locked', backlog.mergeAllowed === false, backlog.mergeAllowed);
check('Automatic production deploys remain prohibited', backlog.releaseConstraints?.automaticProductionDeployTriggersAllowed === false, 'manual gate only');
check('Production environment approval remains required', backlog.releaseConstraints?.productionEnvironmentApprovalRequired === true, 'GitHub production environment');

const mailToml = read('workers/gnk-asg-mail-agent-worker/wrangler.release.toml');
check('Mass mail live send is disabled', /MEDIA_CAMPAIGN_LIVE_SEND\s*=\s*"false"/.test(mailToml), 'MEDIA_CAMPAIGN_LIVE_SEND=false');

const productionWorkflow = read('.github/workflows/production-live-sync.yml');
check('Production workflow is manual-only', /workflow_dispatch\s*:/.test(productionWorkflow) && !/^\s{0,4}(push|pull_request)\s*:/m.test(productionWorkflow), 'workflow_dispatch only');
check('Production workflow requires production environment approval', /^\s+environment\s*:\s*production\s*$/m.test(productionWorkflow), 'environment: production');
check('Production workflow requires typed approval', productionWorkflow.includes('PRODUCTION_APPROVED'), 'exact confirmation');
check('Production workflow validates full SHA', /\^\[0-9a-fA-F\]\{40\}\$/.test(productionWorkflow), '40-character SHA');
check('Production workflow enforces marker-only commit', productionWorkflow.includes('git diff --name-only HEAD^ HEAD') && productionWorkflow.includes('.github/release/PRODUCTION_APPROVED'), 'single marker file');

for (const file of [
  '.github/workflows/emergency-root-route-live-hotfix.yml',
  '.github/workflows/emergency-entry-route-hotfix.yml',
  '.github/workflows/functional-repair-live-hotfix.yml',
  '.github/workflows/news-pages-live-repair.yml'
]) {
  const text = read(file);
  check(`${file} is manual-only`, /workflow_dispatch\s*:/.test(text) && !/^\s{0,4}(push|pull_request)\s*:/m.test(text), 'no automatic production trigger');
  check(`${file} requires production environment`, /^\s+environment\s*:\s*production\s*$/m.test(text), 'environment: production');
  check(`${file} requires full SHA`, /\^\[0-9a-fA-F\]\{40\}\$/.test(text) || /40-character commit SHA/i.test(text), 'full source SHA');
}

const bppHr = read('apps/portal/platforme/bpp/index.html');
const bppEn = read('apps/portal/en/platforms/bpp/index.html');
const bppMenu = read('apps/portal/assets/preview-bpp-integration.js');
check('HR BPP page uses canonical external URL', bppHr.includes('https://bpp.is/') && !bppHr.includes('www.bpp.is'), 'https://bpp.is/');
check('EN BPP page uses canonical external URL', bppEn.includes('https://bpp.is/') && !bppEn.includes('www.bpp.is'), 'https://bpp.is/');
check('BPP menu card uses canonical external URL', bppMenu.includes("card.href='https://bpp.is/'"), 'external menu destination');

const publicWorker = read('workers/gnk-asg-public-pages-live/src/index.js');
check('HR and EN contact routes are paired', publicWorker.includes("{ hr: '/contact/', en: '/en/contact/' }"), 'language pair');
check('Contact repair markup is injected centrally', publicWorker.includes('contactRepairMarkup()') && publicWorker.includes('contact-form-repair-v1.js'), 'public pages worker');

const workflowEvidence = json('reports/final-predeploy-gate-20260622/source-workflows.json');
check('Source workflow evidence belongs to pinned commit', workflowEvidence.sourceCommit === config.sourceCommit, workflowEvidence.sourceCommit);
check('All required source workflows are successful', workflowEvidence.status === 'PASS' && workflowEvidence.failed.length === 0 && workflowEvidence.missing.length === 0, `${workflowEvidence.successfulCount}/${config.requiredSourceRuns.length}`);
check('Minimum successful source workflow count reached', workflowEvidence.successfulCount >= config.minimumSuccessfulSourceWorkflows, workflowEvidence.successfulCount);

const routeAudit = json('reports/hr-en-public-route-audit/route-audit.json');
check('HR/EN route audit passes', routeAudit.status === 'PASS' && routeAudit.failed === 0, `${routeAudit.publicRouteCount} public routes`);
check('Route audit performs no production deploy', routeAudit.productionTouched === false && routeAudit.productionDeployPerformed === false, 'read-only HTTP audit');
check('Required public route count reached', routeAudit.publicRouteCount >= config.requiredPublicRoutes, routeAudit.publicRouteCount);

const restore = json('reports/backup-restore-rehearsal/backup-manifest.json');
check('Repository restore rehearsal passes', restore.repositoryManagedState === 'PASS' && restore.failedFileCount === 0, `${restore.restoredFileCount}/${restore.managedFileCount}`);
check('Restore rehearsal does not touch production', restore.productionTouched === false, 'isolated rehearsal');

const release = json('reports/release-package/release-manifest.json');
check('Release package is ready for manual approval', release.releaseStatus === 'READY_FOR_MANUAL_APPROVAL', release.releaseStatus);
check('Release package is bound to pinned source commit', release.sourceCommit === config.sourceCommit, release.sourceCommit);
check('Release package generation performs no production writes', release.productionWrites === false, release.productionWrites);
check('Release manifest records full release not executed', release.fullProductionReleaseExecuted === false, release.fullProductionReleaseExecuted);
check('Release manifest records limited hotfixes', release.limitedEmergencyHotfixesExecuted === true, release.limitedEmergencyHotfixesExecuted);
check('Protected route inventory is complete', release.protectedRoutes.length >= config.requiredProtectedRoutes, release.protectedRoutes.length);

const contrast = json('reports/mobile-contrast-browser-audit/report.json');
check('Mobile contrast audit passes', contrast.status === 'PASS' && contrast.totalFailures === 0 && contrast.scenarioErrorCount === 0, `${contrast.totalChecks} checks`);
check('Four HR/EN dark/light scenarios were tested', contrast.scenarioCount === config.requiredMobileContrastScenarios, contrast.scenarioCount);
check('Contrast audit does not touch production', contrast.productionTouched === false, 'read-only browser audit');

const triggerAudit = json('reports/workflow-production-trigger-audit/report.json');
check('Production workflow trigger audit passes', triggerAudit.status === 'PASS' && triggerAudit.violationCount === 0, `${triggerAudit.productionDeployWorkflowCount} production workflows`);
check('Trigger audit performs no production changes', triggerAudit.productionTouched === false, 'read-only workflow audit');

const failed = checks.filter(item => !item.pass);
const report = {
  generatedAt: new Date().toISOString(),
  gateVersion: config.gateVersion,
  sourceBranch: config.sourceBranch,
  sourceCommit: config.sourceCommit,
  checkpointBranch: config.checkpointBranch,
  status: failed.length === 0 ? config.expectedStatus : 'BLOCKED',
  productionDeployExecuted: false,
  productionMarkerCreated: false,
  mergeExecuted: false,
  massMailLiveSendEnabled: false,
  totalChecks: checks.length,
  passedChecks: checks.length - failed.length,
  failedChecks: failed.length,
  checks,
  failures: failed
};

fs.writeFileSync(path.join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
const rows = checks.map(item => `| ${item.pass ? 'PASS' : 'FAIL'} | ${item.name.replace(/\|/g, '\\|')} | ${item.detail.replace(/\|/g, '\\|')} |`).join('\n');
const markdown = `# GNK ASG završni pre-deploy gate\n\n- Status: **${report.status}**\n- Izvorna grana: \`${report.sourceBranch}\`\n- Izvorni commit: \`${report.sourceCommit}\`\n- Checkpoint: \`${report.checkpointBranch}\`\n- Provjere: ${report.passedChecks}/${report.totalChecks}\n- Produkcijski deploy izvršen: NE\n- Approval marker kreiran: NE\n- Merge izvršen: NE\n- Masovno live slanje: ISKLJUČENO\n\n| Rezultat | Provjera | Detalj |\n|---|---|---|\n${rows}\n`;
fs.writeFileSync(path.join(OUT, 'report.md'), markdown);
console.log(markdown);
if (failed.length) process.exit(1);
