export function buildHealthSummary({ selfTest, readiness, rollback }) {
  const codeReady = Boolean(readiness?.codeReady ?? readiness?.ok);
  const liveReady = Boolean(readiness?.liveReady);
  const automation = readiness?.automation || {};
  const productionUntouched = automation.productionTouched === false;

  return {
    ok: Boolean(codeReady && selfTest?.ok && productionUntouched),
    status: codeReady && selfTest?.ok && productionUntouched
      ? (liveReady ? 'healthy_live_ready' : 'healthy_locked')
      : 'degraded',
    liveReady,
    mailLiveReady: Boolean(readiness?.mailLiveReady),
    automationPreviewReady: Boolean(readiness?.automationPreviewReady),
    automationLiveReady: Boolean(readiness?.automationLiveReady),
    routineAutoSendReady: Boolean(readiness?.routineAutoSendReady),
    service: 'GNK ASG Mail Agent',
    phase: readiness?.phase || 'phase1',
    public: true,
    exposesMailboxContent: false,
    productionTouched: !productionUntouched,
    automation: {
      codeReady: Boolean(automation.codeReady),
      previewReady: Boolean(automation.previewReady),
      liveReady: Boolean(automation.liveReady),
      productionTouched: Boolean(automation.productionTouched),
      modules: automation.modules || {}
    },
    blockedItems: Array.isArray(readiness?.blockedItems) ? readiness.blockedItems : [],
    checks: {
      selfTest: Boolean(selfTest?.ok),
      codeReadiness: codeReady,
      liveReadiness: liveReady,
      mailLiveReadiness: Boolean(readiness?.mailLiveReady),
      automationCodeReadiness: Boolean(automation.codeReady),
      automationPreviewReadiness: Boolean(automation.previewReady),
      automationProductionRoutesAbsent: productionUntouched,
      rollbackManifest: Boolean(rollback?.ok),
      sensitiveRepliesHeld: Boolean(selfTest?.checks?.sensitiveAutoSendHeld),
      mediaWindowLimitTen: Boolean(selfTest?.checks?.windowLimitTen),
      strictRateLimitLease: Boolean(readiness?.bindings?.d1RateLease)
    }
  };
}
