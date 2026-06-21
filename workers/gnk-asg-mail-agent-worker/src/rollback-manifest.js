export const PHASE1_ROLLBACK_MANIFEST = {
  scope: 'gnk-asg-mail-agent-worker',
  branch: 'experience-ai-live-overview',
  productionTouched: false,
  secretsTouched: false,
  dnsTouched: false,
  cloudflareRoutesTouched: false,
  rollbackPrinciple: 'revert_small_commits_only',
  protectedRuntimeFlags: [
    'MEDIA_CAMPAIGN_LIVE_SEND',
    'OPERATOR_TOKEN',
    'GNK_ASG_OPERATOR_TOKEN'
  ],
  safeRollbackTargets: [
    'src/phase1-readiness.js',
    'src/mail-agent-self-test.js',
    'src/media-campaign-window.js',
    'src/media-campaign-actions.js',
    'src/media-campaign-state.js',
    'src/media-campaign-batch.js',
    'src/thread-safety.js'
  ]
};

export function rollbackReadiness() {
  return {
    ok: true,
    manifest: PHASE1_ROLLBACK_MANIFEST,
    instruction: 'Rollback is limited to reverting development-branch commits. Do not change production routes, secrets, DNS, or Cloudflare bindings.'
  };
}
