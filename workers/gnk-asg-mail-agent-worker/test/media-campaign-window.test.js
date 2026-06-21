import { executeMediaCampaignWindow } from '../src/media-campaign-window.js';

const now = new Date('2026-06-21T08:00:00.000Z');
const campaign = {
  id: 'test-campaign',
  failed: 0,
  queue: Array.from({ length: 12 }, (_, index) => ({
    id: `row-${index + 1}`,
    status: 'remaining',
    recipient: { email: `person${index + 1}@example.com`, media: 'Example' }
  }))
};

const result = executeMediaCampaignWindow(campaign, { liveSend: false, now });

if (result.sent !== 0) throw new Error('Simulated window must not increment sent.');
if (result.tested !== 10) throw new Error('Expected exactly 10 tested items per minute window.');
if (result.remaining !== 2) throw new Error('Expected 2 remaining items after first window.');
if (result.status !== 'queued') throw new Error('Expected campaign to remain queued while recipients remain.');
if (result.productionSendEnabled !== false) throw new Error('Expected production send to remain disabled by default.');
if (result.executionBlocked !== false) throw new Error('Expected unscheduled campaign execution to be allowed.');
