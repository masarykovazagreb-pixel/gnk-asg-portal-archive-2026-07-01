import { buildMediaCampaignBatch } from '../src/media-campaign-batch.js';
import { buildMediaCampaignMessage } from '../src/media-campaign-message.js';
import { executeMediaCampaignWindow } from '../src/media-campaign-window.js';

const recipients = Array.from({ length: 100 }, (_, index) => ({
  ime: `Ime${index + 1}`,
  prezime: `Prezime${index + 1}`,
  medij: `Medij ${index + 1}`,
  email: `kontakt${index + 1}@example.com`
}));

const payload = {
  id: 'media-e2e-100',
  subject: 'Obavijest za {{media}}',
  bodyTemplate: 'Poštovani {{fullName}},\n\nobraćamo Vam se u vezi medija {{media}}. Kontakt: {{email}}.',
  senderMailbox: 'media@gnk-asg.hr',
  signatureProfile: 'media',
  language: 'hr',
  pdfAttachmentName: 'GNK_ASG_Media_Release.pdf',
  scheduledAt: '2026-06-21T10:00:00.000Z',
  recipients
};

let campaign = buildMediaCampaignBatch(payload);

if (campaign.total !== 100) throw new Error('Expected 100 imported recipients.');
if (campaign.remaining !== 100) throw new Error('Expected 100 remaining recipients.');
if (campaign.failed !== 0) throw new Error('Expected zero invalid recipients.');
if (campaign.rateLimitPerMinute !== 10) throw new Error('Expected 10 messages per minute limit.');
if (campaign.status !== 'scheduled') throw new Error('Expected scheduled status before due time.');

const beforeDue = executeMediaCampaignWindow(campaign, {
  liveSend: false,
  now: new Date('2026-06-21T09:59:00.000Z')
});
if (!beforeDue.executionBlocked || beforeDue.lastWindowCount !== 0) {
  throw new Error('Campaign must not execute before scheduled time.');
}

const sampleMessages = campaign.queue.map(item => buildMediaCampaignMessage(campaign, item));
if (sampleMessages.length !== 100) throw new Error('Expected 100 personalised message previews.');
if (new Set(sampleMessages.map(item => item.to)).size !== 100) throw new Error('Recipient emails must stay unique.');
if (!sampleMessages.every(item => item.subject.includes(item.media))) throw new Error('Subject personalisation failed.');
if (!sampleMessages.every(item => item.body.includes(item.displayName))) throw new Error('Full-name personalisation failed.');
if (!sampleMessages.every(item => item.attachments[0]?.filename === 'GNK_ASG_Media_Release.pdf')) {
  throw new Error('PDF metadata missing from personalised message.');
}
if (!sampleMessages.every(item => item.signatureProfile === 'media')) throw new Error('Automatic media signature profile missing.');

for (let minute = 0; minute < 10; minute += 1) {
  campaign = executeMediaCampaignWindow(campaign, {
    liveSend: false,
    now: new Date(Date.parse('2026-06-21T10:00:00.000Z') + minute * 60_000)
  });
  if (campaign.lastWindowCount !== 10) throw new Error(`Window ${minute + 1} did not process exactly 10 messages.`);
}

if (campaign.sent !== 0) throw new Error('Test mode must never mark messages as sent.');
if (campaign.tested !== 100) throw new Error('Expected all 100 messages to be tested.');
if (campaign.failed !== 0) throw new Error('Expected zero failed test messages.');
if (campaign.remaining !== 0) throw new Error('Expected zero remaining messages.');
if (campaign.status !== 'complete') throw new Error('Expected completed test campaign.');
if (campaign.productionSendEnabled !== false) throw new Error('Production sending must remain disabled.');

console.log('Media campaign E2E simulation passed: 100 recipients, 10/min, personalised, scheduled, PDF metadata, no live send.');
