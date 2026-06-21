import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, 'reports', 'release-candidate-audit');
const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function check(name, pass, detail = '') {
  checks.push({ name, pass: Boolean(pass), detail });
}

function validJson(relativePath) {
  try {
    JSON.parse(read(relativePath));
    return true;
  } catch {
    return false;
  }
}

const requiredFiles = [
  'apps/portal/assets/operator-token-vault.js',
  'apps/portal/assets/mobile-admin-publisher.js',
  'apps/portal/operator-mobile/index.html',
  'apps/portal/assets/mail-studio-pro.js',
  'apps/portal/mail-studio-pro/index.html',
  'apps/portal/assets/pdf-publisher-secure.js',
  'apps/portal/pdf-publisher/index.html',
  'workers/gnk-asg-mail-agent-worker/src/ai.js',
  'workers/gnk-asg-mail-agent-worker/src/thread-context.js',
  'workers/gnk-asg-mail-agent-worker/src/media-campaign-lease.js',
  'workers/gnk-asg-mail-agent-worker/src/rollback-manifest.js',
  'scripts/mobile-admin-security-audit.mjs',
  'scripts/publications-regression-audit.mjs',
  'scripts/news-market-regression-audit.mjs',
  'workers/gnk-asg-preview-portal-worker/test/video-sitemap.test.js'
];

for (const file of requiredFiles) {
  check(`Required file: ${file}`, exists(file), exists(file) ? 'present' : 'missing');
}

const jsonFiles = [
  'config/project-completion-backlog.json',
  'config/phase1-critical-checks.json',
  'contracts/editorial-automation-policy.json',
  'contracts/mail-agent/media-campaign-safety.contract.json',
  'contracts/social-share-policy.json',
  'apps/portal/data/publications-auto.json',
  'apps/portal/data/generated-gallery-30.json',
  'apps/portal/data/video-library-items.json',
  'apps/portal/data/video-featured.json'
];

for (const file of jsonFiles) {
  check(`Valid JSON: ${file}`, exists(file) && validJson(file), 'must parse without recovery');
}

const mobilePage = read('apps/portal/operator-mobile/index.html');
const studioPage = read('apps/portal/mail-studio-pro/index.html');
const pdfPage = read('apps/portal/pdf-publisher/index.html');
const activeClients = [
  mobilePage,
  studioPage,
  pdfPage,
  read('apps/portal/assets/mobile-admin-publisher.js'),
  read('apps/portal/assets/mail-studio-pro.js'),
  read('apps/portal/assets/pdf-publisher-secure.js')
].join('\n');

check(
  'Mobile admin activates session vault',
  mobilePage.indexOf('operator-token-vault.js') >= 0,
  'mobile admin must load the shared vault'
);
check(
  'Mail Studio activates session vault before application',
  studioPage.indexOf('operator-token-vault.js') >= 0 &&
    studioPage.indexOf('operator-token-vault.js') < studioPage.indexOf('mail-studio-pro.js'),
  'vault must load first'
);
check(
  'PDF Publisher activates secure client',
  pdfPage.includes('operator-token-vault.js') &&
    pdfPage.includes('pdf-publisher-secure.js') &&
    !pdfPage.includes('/assets/pdf-publisher.js'),
  'legacy persistent-token client must stay inactive'
);
check(
  'Active clients do not persist operator credentials',
  !/localStorage\.getItem\(\s*['"]GNK_ASG_OPERATOR_TOKEN['"]/.test(activeClients) &&
    !/localStorage\.setItem\(\s*['"]GNK_ASG_OPERATOR_TOKEN['"]/.test(activeClients) &&
    !/const\s+TOKEN_KEY\s*=\s*['"]GNK_ASG_OPERATOR_TOKEN['"]/.test(activeClients),
  'operator token may exist only in session vault'
);
check(
  'Active clients do not place token in URL',
  !/[?&]token=|withToken\s*\(|URLSearchParams[\s\S]{0,120}token/i.test(activeClients),
  'credentials must use request headers'
);
check(
  'No obvious hardcoded operator secret',
  !/(operator[-_ ]?token|bearer)\s*[:=]\s*['"][A-Za-z0-9_-]{24,}['"]/i.test(activeClients),
  'no concrete credential value is allowed'
);

const mailAi = read('workers/gnk-asg-mail-agent-worker/src/ai.js');
const threadContext = read('workers/gnk-asg-mail-agent-worker/src/thread-context.js');
const mailStudio = read('apps/portal/assets/mail-studio-pro.js');
check(
  'Mail AI receives full thread and stores compact review snapshot',
  mailAi.includes('buildThreadContext') &&
    mailAi.includes('compactThreadContext') &&
    mailAi.includes('threadMessageCount'),
  'AI analysis and human review must use related chronology'
);
check(
  'Thread limits are explicit',
  threadContext.includes('MAX_THREAD_MESSAGES = 20') &&
    threadContext.includes('MAX_REVIEW_MESSAGES = 8'),
  'full and review context limits must be bounded'
);
check(
  'Held AI draft remains a manual action',
  mailStudio.includes("currentBox === 'held' && selected.draft?.body") &&
    mailStudio.includes('Slanje ostaje ručna radnja'),
  'sensitive drafts cannot silently auto-send from the UI'
);

const campaignContract = JSON.parse(read('contracts/mail-agent/media-campaign-safety.contract.json'));
check(
  'Campaign production lock is present',
  campaignContract.productionLocked === true || campaignContract.liveSendingEnabled === false,
  'campaign delivery must remain locked by default'
);

for (const config of [
  'workers/gnk-asg-mail-agent-worker/wrangler.preview.toml',
  'workers/gnk-asg-social-share-worker/wrangler.preview.toml'
]) {
  const text = read(config);
  check(
    `Preview route lock: ${config}`,
    !/(^|\n)\s*routes?\s*=/m.test(text) && /workers_dev\s*=\s*true/.test(text),
    'preview worker must use workers.dev without production route mapping'
  );
}

const backlog = JSON.parse(read('config/project-completion-backlog.json'));
check(
  'Backlog keeps production locked',
  backlog.productionTouched === false && backlog.mergeAllowed === false,
  'production and merge require explicit approval'
);
const runnerItem = backlog.items?.find(item => item.id === 'github-actions-runner');
check(
  'Runner status is explicitly and honestly recorded',
  Boolean(runnerItem) && ['done', 'blocked_external'].includes(runnerItem.status),
  runnerItem ? `recorded status: ${runnerItem.status}` : 'runner status entry is missing'
);
check(
  'Release requires explicit production approval marker',
  backlog.releaseConstraints?.explicitProductionApprovalMarkerRequired === true,
  'ordinary development pushes must not deploy production'
);

const rollback = read('workers/gnk-asg-mail-agent-worker/src/rollback-manifest.js');
check(
  'Rollback protects production systems',
  rollback.includes('productionTouched: false') &&
    rollback.includes('secretsTouched: false') &&
    rollback.includes('dnsTouched: false') &&
    rollback.includes('cloudflareRoutesTouched: false') &&
    rollback.includes('disable runtime feature gates before reverting code'),
  'rollback must remain development-branch only'
);

const failed = checks.filter(item => !item.pass);
const report = {
  generatedAt: new Date().toISOString(),
  branch: 'experience-ai-live-overview',
  readOnly: true,
  productionWrites: false,
  productionTouched: false,
  mergeAllowed: false,
  status: failed.length ? 'FAIL' : 'PASS',
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks
};

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(REPORT_DIR, 'release-candidate-audit.json'),
  `${JSON.stringify(report, null, 2)}\n`
);

const rows = checks
  .map(item => `| ${item.pass ? 'PASS' : 'FAIL'} | ${item.name.replace(/\|/g, '\\|')} | ${item.detail.replace(/\|/g, '\\|')} |`)
  .join('\n');
const markdown = `# GNK ASG Release Candidate Audit\n\n- Status: **${report.status}**\n- Read-only: YES\n- Production writes: NO\n- Production touched: NO\n- Merge allowed: NO\n- Passed: ${report.passed}/${report.total}\n\n| Result | Check | Detail |\n|---|---|---|\n${rows}\n`;
fs.writeFileSync(path.join(REPORT_DIR, 'release-candidate-audit.md'), markdown);

console.log(markdown);
if (failed.length) process.exit(1);
