export function buildHealthSummary({ selfTest, readiness, rollback }) {
  return {
    ok: Boolean(readiness?.ok && selfTest?.ok),
    service: 'GNK ASG Mail Agent',
    phase: readiness?.phase || 'phase1',
    public: true,
    exposesMailboxContent: false,
    checks: {
      selfTest: Boolean(selfTest?.ok),
      readiness: Boolean(readiness?.ok),
      rollbackManifest: Boolean(rollback?.ok),
      sensitiveRepliesHeld: Boolean(selfTest?.checks?.sensitiveAutoSendHeld),
      mediaWindowLimitTen: Boolean(selfTest?.checks?.windowLimitTen)
    }
  };
}
