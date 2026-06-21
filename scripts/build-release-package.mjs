import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'reports', 'release-package');
const BRANCH = 'experience-ai-live-overview';
const SOURCE_COMMIT = process.env.GITHUB_SHA || 'local';

const files = {
  productionWorkflow: '.github/workflows/production-live-sync.yml',
  backlog: 'config/project-completion-backlog.json',
  phase1Checks: 'config/phase1-critical-checks.json',
  directOperator: 'workers/gnk-asg-direct-operator/wrangler.toml',
  mailAgent: 'workers/gnk-asg-mail-agent-worker/wrangler.release.toml',
  publicPages: 'workers/gnk-asg-public-pages-live/wrangler.live.toml',
  rollbackManifest: 'workers/gnk-asg-mail-agent-worker/src/rollback-manifest.js',
  releaseAudit: 'scripts/release-candidate-audit.mjs'
};

const publicRoutes = [
  'https://gnk-asg.hr/',
  'https://gnk-asg.hr/en/',
  'https://gnk-asg.hr/objave/',
  'https://gnk-asg.hr/publications/',
  'https://gnk-asg.hr/vijesti/',
  'https://gnk-asg.hr/news/',
  'https://gnk-asg.hr/trzista/',
  'https://gnk-asg.hr/markets/',
  'https://gnk-asg.hr/videoteka/',
  'https://gnk-asg.hr/en/video-library/',
  'https://gnk-asg.hr/mail-studio-pro/',
  'https://gnk-asg.hr/mail-studio-pro/campaign/',
  'https://gnk-asg.hr/operator-mobile/',
  'https://gnk-asg.hr/api/mail-agent/health',
  'https://gnk-asg.hr/api/contact-mailboxes',
  'https://gnk-asg.hr/data/news.json',
  'https://gnk-asg.hr/data/market.json',
  'https://publish.gnk-asg.hr/api/publications'
];

const protectedRoutes = [
  'https://gnk-asg.hr/api/mail-agent/inbox',
  'https://gnk-asg.hr/api/media-upload',
  'https://gnk-asg.hr/api/admin-asset-list'
];

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function read(relativePath) {
  return fs.readFileSync(absolute(relativePath), 'utf8');
}

function sha256(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absolute(relativePath))).digest('hex');
}

function routePatterns(toml) {
  return [...toml.matchAll(/^pattern\s*=\s*"([^"]+)"/gm)].map(match => match[1]);
}

function check(name, pass, detail) {
  return { name, pass: Boolean(pass), detail };
}

const missing = Object.entries(files)
  .filter(([, relativePath]) => !exists(relativePath))
  .map(([name, relativePath]) => ({ name, relativePath }));

if (missing.length) {
  console.error(JSON.stringify({ error: 'missing_release_files', missing }, null, 2));
  process.exit(1);
}

const workflow = read(files.productionWorkflow);
const backlog = JSON.parse(read(files.backlog));
const phase1Checks = JSON.parse(read(files.phase1Checks));
const directToml = read(files.directOperator);
const mailToml = read(files.mailAgent);
const publicToml = read(files.publicPages);
const rollback = read(files.rollbackManifest);

const checks = [
  check('Manual production workflow dispatch only', workflow.includes('workflow_dispatch:') && !/^\s*push:\s*$/m.test(workflow), 'ordinary development pushes cannot deploy production'),
  check('Typed production confirmation required', workflow.includes('PRODUCTION_APPROVED'), 'manual release requires exact confirmation'),
  check('Exact marker commit required', workflow.includes('approved_commit') && workflow.includes('source_commit:'), 'marker commit and tested parent are linked'),
  check('Marker-only commit enforced', workflow.includes("git diff --name-only HEAD^ HEAD") && workflow.includes(".github/release/PRODUCTION_APPROVED"), 'release marker commit cannot contain unrelated changes'),
  check('Backlog keeps production locked', backlog.productionTouched === false && backlog.mergeAllowed === false, 'development branch remains non-production'),
  check('Explicit approval marker policy enabled', backlog.releaseConstraints?.explicitProductionApprovalMarkerRequired === true, 'release requires repository marker'),
  check('Mail campaign live sending disabled by default', /MEDIA_CAMPAIGN_LIVE_SEND\s*=\s*"false"/.test(mailToml), 'mass delivery cannot start accidentally'),
  check('Protected operator entry point enabled', /main\s*=\s*"src\/index-secure\.js"/.test(directToml), 'direct operator uses the secure wrapper'),
  check('Rollback disables runtime gates first', rollback.includes('disable runtime feature gates before reverting code'), 'rollback order is explicit'),
  check('Phase 1 route inventory exists', Array.isArray(phase1Checks.checks) && phase1Checks.checks.length >= 20, `${phase1Checks.checks?.length || 0} checks configured`),
  check('Public pages routes are explicit', routePatterns(publicToml).length >= 10, `${routePatterns(publicToml).length} public route patterns`),
  check('Mail Agent production routes are explicit', routePatterns(mailToml).length >= 2, `${routePatterns(mailToml).length} mail route patterns`)
];

const failed = checks.filter(item => !item.pass);
const manifest = {
  generatedAt: new Date().toISOString(),
  branch: BRANCH,
  sourceCommit: SOURCE_COMMIT,
  readOnlyGeneration: true,
  productionTouched: false,
  releaseStatus: failed.length ? 'BLOCKED' : 'READY_FOR_MANUAL_APPROVAL',
  publicRoutes,
  protectedRoutes,
  expectedPublicStatus: 200,
  expectedProtectedStatus: 401,
  components: Object.entries(files).map(([name, relativePath]) => ({
    name,
    path: relativePath,
    sha256: sha256(relativePath)
  })),
  workerRoutes: {
    directOperator: routePatterns(directToml),
    mailAgent: routePatterns(mailToml),
    publicPages: routePatterns(publicToml)
  },
  checks,
  failedChecks: failed.map(item => item.name),
  approvalMarkerTemplate: [
    'approved: true',
    'target: production',
    `branch: ${BRANCH}`,
    `source_commit: ${SOURCE_COMMIT}`
  ]
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const rows = checks
  .map(item => `| ${item.pass ? 'PASS' : 'FAIL'} | ${item.name.replace(/\|/g, '\\|')} | ${item.detail.replace(/\|/g, '\\|')} |`)
  .join('\n');

const summary = `# GNK ASG završni release paket\n\n- Status: **${manifest.releaseStatus}**\n- Grana: \`${BRANCH}\`\n- Izvorni commit: \`${SOURCE_COMMIT}\`\n- Produkcija promijenjena: NE\n- Javni URL-ovi: ${publicRoutes.length}\n- Zaštićeni URL-ovi: ${protectedRoutes.length}\n- Provjere: ${checks.length - failed.length}/${checks.length}\n\n| Rezultat | Provjera | Detalj |\n|---|---|---|\n${rows}\n`;

fs.writeFileSync(path.join(OUT, 'release-summary.md'), summary);

const rollbackPlan = `# GNK ASG rollback plan\n\n1. Odmah zadržati \`MEDIA_CAMPAIGN_LIVE_SEND=false\` i ostale runtime gateove isključenima.\n2. Utvrditi koji je Worker ili ruta uzrokovao neuspjeh smoke testa.\n3. Vratiti samo odgovarajući Worker na zadnju potvrđenu verziju, bez promjene DNS-a ili secretsa.\n4. Ponoviti javni i privatni smoke test.\n5. Ako problem nije izoliran, zaustaviti release i zadržati prethodnu produkcijsku verziju.\n\nZabranjeno tijekom rollbacka: promjena DNS-a, rotacija secretsa bez potrebe, uključivanje masovnog slanja i nekontrolirano brisanje KV/D1/R2 podataka.\n`;

fs.writeFileSync(path.join(OUT, 'rollback-plan.md'), rollbackPlan);

console.log(summary);
if (failed.length) process.exit(1);
