import { executeMediaCampaignWindow } from '../src/media-campaign-window.js';

const campaign = {
  id: 'test-campaign',
  failed: 0,
  queue: Array.from({ length: 12 }, (_, index) => ({
    id: `row-${index + 1}`,
    status: 'remaining',
    recipient: { email: `person${index + 1}@example.com`, media: 'Example' }
  }))
};

const result = executeMediaCampaignWindow(campaign, { liveSend: false });

if (result.sent !== 10) throw new Error('Expected exactly 10 simulated sent items per minute window.');
if (result.remaining !== 2) throw new Error('Expected 2 remaining items after first window.');
if (result.status !== 'queued') throw new Error('Expected campaign to remain queued while recipients remain.');
if (result.productionSendEnabled !== false) throw new Error('Expected production send to remain disabled by default.');
