import fs from 'node:fs';

const AUDITED_MAIN_SHA = 'dc6f34cff0def561b461a5218365d8a6f20d022e';

function read(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`Missing required file: ${path}`);
  }
  return fs.readFileSync(path, 'utf8');
}

function requireText(name, value, expected) {
  if (!value.includes(expected)) {
    throw new Error(`${name}: missing expected marker: ${expected}`);
  }
}

const deployWorkflow = read('.github/workflows/deploy-admin-auth-v6.yml');
const productionVerifier = read('scripts/verify-production-release-v38.sh');
const directOperator = read('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js');
const mediaRegistrationBackend = read('workers/gnk-asg-direct-operator/src/media-registration-v1.js');
const mediaRegistrationFrontend = read('apps/portal/assets/media-registration-v1.js');
const clickTracking = read('workers/gnk-asg-direct-operator/src/email-click-tracking-v1.js');
const clickContract = read('scripts/test-email-click-tracking-v1.mjs');

requireText('deploy workflow', deployWorkflow, 'workflow_dispatch:');
requireText('deploy workflow', deployWorkflow, "inputs.confirm_production_deploy == 'DEPLOY_ADMIN_AUTH_V6'");
requireText('deploy workflow', deployWorkflow, 'approved_sha:');
requireText('deploy workflow', deployWorkflow, 'git merge-base --is-ancestor "$APPROVED_SHA" origin/main');
requireText('deploy workflow', deployWorkflow, 'Verify exact production release');

requireText('production verifier', productionVerifier, "release_prefix='GNK_ASG_UNIFIED_AUTH_V38_RELEASE_PROOF_NEWS_SOURCE_LINKS'");
requireText('production verifier', productionVerifier, 'x-gnk-deploy-revision: ${revision}');
requireText('direct operator', directOperator, 'GNK_ASG_UNIFIED_AUTH_V38_RELEASE_PROOF_NEWS_SOURCE_LINKS');

requireText('click tracking runtime', clickTracking, 'CLICKED');
requireText('click tracking contract', clickContract, "event:'CLICKED'");
requireText('click tracking contract', clickContract, 'mailSent:false');

const frontendOpenRegistration =
  mediaRegistrationFrontend.includes("api('/register'") &&
  mediaRegistrationFrontend.includes('regUsername') &&
  mediaRegistrationFrontend.includes('regPassword');

const backendOpenRegistration =
  mediaRegistrationBackend.includes('media_registration_accounts') &&
  mediaRegistrationBackend.includes("p===`${PUBLIC_API}/register`") &&
  mediaRegistrationBackend.includes('password_hash');

const backendInvitationLogin =
  mediaRegistrationBackend.includes('media_invitation_access') &&
  mediaRegistrationBackend.includes('mailCode') &&
  mediaRegistrationBackend.includes('pin');

if (!frontendOpenRegistration) {
  throw new Error('media registration frontend: open registration contract is missing');
}
if (!backendInvitationLogin) {
  throw new Error('media registration backend: invitation compatibility contract is missing');
}

const mediaRegistrationContract = frontendOpenRegistration && backendOpenRegistration
  ? 'OPEN_REGISTRATION_ALIGNED'
  : 'BROKEN_FRONTEND_OPEN_BACKEND_INVITATION_ONLY';

const result = {
  ok: mediaRegistrationContract === 'OPEN_REGISTRATION_ALIGNED',
  auditedMainSha: AUDITED_MAIN_SHA,
  release: 'V38',
  deployMode: 'manual-exact-sha',
  clickTrackingOnMain: true,
  mediaRegistration: {
    frontendOpenRegistration,
    backendOpenRegistration,
    backendInvitationLogin,
    contract: mediaRegistrationContract
  },
  productionDecision: 'BLOCKED_PENDING_CONSOLIDATION',
  requiredBeforeProduction: [
    'repair the Media Application frontend/backend registration contract',
    'decide PR 467 or explicitly exclude it',
    'run a fresh full audit on the resulting exact main SHA',
    'perform read-only live route verification without sending email',
    'obtain separate explicit production approval for the exact main SHA'
  ]
};

console.log(JSON.stringify(result, null, 2));
