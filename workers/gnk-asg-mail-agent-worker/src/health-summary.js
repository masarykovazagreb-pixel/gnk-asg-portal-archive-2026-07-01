export function buildHealthSummary({ selfTest, readiness, rollback }) {
  const codeReady = Boolean(readiness?.codeReady ?? readiness?.ok);
  const liveReady = Boolean(readiness?.liveReady);
  return {
    ok: Boolean(codeReady && selfTest?.ok),
    status: codeReady && selfTest?.ok ? (liveReady ? 'healthy_live_ready' : 'healthy_locked') : 'degraded',
    liveReady,
    routineAutoSendReady: Boolean(readiness?.routineAutoSendReady),
    service: 'GNK ASG Mail Agent',
    phase: readiness?.phase || 'phase1',
    public: true,
    exposesMailboxContent: false,
    blockedItems: Array.isArray(readiness?.blockedItems) ? readiness.blockedItems : [],
    checks: {
      selfTest: Boolean(selfTest?.ok),
      codeReadiness: codeReady,
      liveReadiness: liveReady,
      rollbackManifest: Boolean(rollback?.ok),
      sensitiveRepliesHeld: Boolean(selfTest?.checks?.sensitiveAutoSendHeld),
      mediaWindowLimitTen: Boolean(selfTest?.checks?.windowLimitTen),
      strictRateLimitLease: Boolean(readiness?.bindings?.d1RateLease)
    }
  };
}
