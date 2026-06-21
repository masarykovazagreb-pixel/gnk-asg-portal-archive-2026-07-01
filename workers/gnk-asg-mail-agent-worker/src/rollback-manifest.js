export const PHASE1_ROLLBACK_MANIFEST = {
  scope: 'gnk-asg-phase1-release-candidate',
  branch: 'experience-ai-live-overview',
  productionTouched: false,
  secretsTouched: false,
  dnsTouched: false,
  cloudflareRoutesTouched: false,
  githubOnly: true,
  rollbackPrinciple: 'revert_small_commits_only',
  protectedRuntimeFlags: [
    'MEDIA_CAMPAIGN_LIVE_SEND',
    'MAIL_AUTOMATION_AUTO_SEND',
    'OPERATOR_TOKEN',
    'GNK_ASG_OPERATOR_TOKEN'
  ],
  protectedExternalSystems: [
    'gnk-asg.hr production routes',
    'Cloudflare secrets and bindings',
    'Cloudflare Email Routing',
    'R2 production media assets',
    'WhatsApp Business Cloud API',
    'social provider OAuth applications'
  ],
  safeRollbackTargets: [
    'workers/gnk-asg-mail-agent-worker/src/phase1-readiness.js',
    'workers/gnk-asg-mail-agent-worker/src/mail-agent-self-test.js',
    'workers/gnk-asg-mail-agent-worker/src/media-campaign-window.js',
    'workers/gnk-asg-mail-agent-worker/src/media-campaign-actions.js',
    'workers/gnk-asg-mail-agent-worker/src/media-campaign-state.js',
    'workers/gnk-asg-mail-agent-worker/src/media-campaign-batch.js',
    'workers/gnk-asg-mail-agent-worker/src/media-campaign-lease.js',
    'workers/gnk-asg-mail-agent-worker/src/thread-safety.js',
    'workers/gnk-asg-mail-agent-worker/src/thread-context.js',
    'workers/gnk-asg-mail-agent-worker/src/ai.js',
    'apps/portal/assets/operator-token-vault.js',
    'apps/portal/assets/mobile-admin-publisher.js',
    'apps/portal/operator-mobile/index.html',
    'apps/portal/assets/mail-studio-pro.js',
    'apps/portal/mail-studio-pro/index.html',
    'apps/portal/assets/pdf-publisher-secure.js',
    'apps/portal/pdf-publisher/index.html',
    'scripts/mobile-admin-security-audit.mjs'
  ],
  rollbackOrder: [
    'disable runtime feature gates before reverting code',
    'revert the smallest affected development-branch commit',
    'rerun read-only syntax and regression checks',
    'confirm production routes, DNS, secrets and bindings remain unchanged'
  ]
};

export function rollbackReadiness() {
  const unchanged = [
    PHASE1_ROLLBACK_MANIFEST.productionTouched,
    PHASE1_ROLLBACK_MANIFEST.secretsTouched,
    PHASE1_ROLLBACK_MANIFEST.dnsTouched,
    PHASE1_ROLLBACK_MANIFEST.cloudflareRoutesTouched
  ].every(value => value === false);

  return {
    ok: unchanged && PHASE1_ROLLBACK_MANIFEST.safeRollbackTargets.length > 0,
    manifest: PHASE1_ROLLBACK_MANIFEST,
    instruction: 'Rollback is limited to development-branch commits. Disable feature gates first and do not change production routes, secrets, DNS or Cloudflare bindings.'
  };
}
