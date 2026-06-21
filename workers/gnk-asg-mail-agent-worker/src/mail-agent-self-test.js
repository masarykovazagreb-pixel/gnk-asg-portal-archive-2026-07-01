import { executeMediaCampaignWindow } from './media-campaign-window.js';
import { mustHoldForApproval } from './thread-safety.js';

export function runMailAgentSelfTest() {
  const campaign = {
    id: 'self-test',
    status: 'queued',
    queue: Array.from({ length: 12 }, (_, index) => ({
      id: `r${index + 1}`,
      email: `test${index + 1}@example.invalid`,
      media: 'Test Media',
      status: 'remaining'
    }))
  };

  const simulated = executeMediaCampaignWindow(campaign, { liveSend: false });
  const live = executeMediaCampaignWindow(campaign, { liveSend: true });
  const sensitiveHold = mustHoldForApproval({ category: 'legal', risk: 'high', autoSend: true });
  const routineAllowed = mustHoldForApproval({ category: 'general', risk: 'low', autoSend: true }) === false;

  return {
    ok: simulated.tested === 10 && simulated.sent === 0 && simulated.remaining === 2 && live.sent === 10 && live.remaining === 2 && sensitiveHold === true && routineAllowed === true,
    checks: {
      simulatedWindowUsesTested: simulated.tested === 10 && simulated.sent === 0,
      liveWindowUsesSent: live.sent === 10,
      windowLimitTen: simulated.lastWindowCount === 10 && live.lastWindowCount === 10,
      remainingPreserved: simulated.remaining === 2 && live.remaining === 2,
      sensitiveAutoSendHeld: sensitiveHold === true,
      routineLowRiskAllowed: routineAllowed === true
    },
    simulated: {
      sent: simulated.sent,
      tested: simulated.tested,
      failed: simulated.failed,
      remaining: simulated.remaining,
      productionSendEnabled: simulated.productionSendEnabled
    },
    live: {
      sent: live.sent,
      tested: live.tested,
      failed: live.failed,
      remaining: live.remaining,
      productionSendEnabled: live.productionSendEnabled
    }
  };
}
