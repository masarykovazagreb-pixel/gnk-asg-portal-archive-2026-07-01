import { createMediaCampaign, runMediaCampaignWindow } from '../src/media-campaign-service.js';

class MemoryKV {
  constructor() {
    this.values = new Map();
  }

  async get(key) {
    return this.values.get(key) ?? null;
  }

  async put(key, value) {
    this.values.set(key, String(value));
  }
}

const env = {
  GNK_ASG_KV: new MemoryKV(),
  MEDIA_CAMPAIGN_LIVE_SEND: 'false'
};

const payload = {
  id: 'service-guard-test',
  subject: 'Informacija za {{media}}',
  bodyTemplate: 'Poštovani {{fullName}}, obraćamo Vam se u vezi medija {{media}}.',
  senderMailbox: 'media@gnk-asg.hr',
  signatureProfile: 'media',
  language: 'hr',
  pdfAttachmentName: 'release.pdf',
  pdfAttachment: {
    filename: 'release.pdf',
    mimeType: 'application/pdf',
    size: 8,
    base64: 'JVBERi0x'
  },
  recipients: [
    {
      ime: 'Ana',
      prezime: 'Anić',
      medij: 'Primjer Media',
      email: 'ana@example.com'
    }
  ]
};

const created = await createMediaCampaign(env, payload);
if (!created.batch.attachmentKey) throw new Error('PDF attachment key was not stored.');
if (created.batch.remaining !== 1) throw new Error('Campaign queue was not created.');

const unconfirmedLive = await runMediaCampaignWindow(env, created.batch, { mode: 'live' });
if (unconfirmedLive.ok || unconfirmedLive.error !== 'live_confirmation_required') {
  throw new Error('Live sending must require campaign ID confirmation.');
}

const disabledLive = await runMediaCampaignWindow(env, created.batch, {
  mode: 'live',
  confirmCampaignId: created.batch.id
});
if (disabledLive.ok || disabledLive.error !== 'live_send_not_configured') {
  throw new Error('Live sending must remain disabled without the environment gate.');
}

const testRun = await runMediaCampaignWindow(env, created.batch, { mode: 'test' });
if (!testRun.ok || testRun.productionSendEnabled !== false) {
  throw new Error('Test window must execute without enabling production sending.');
}
if (testRun.campaign.tested !== 1 || testRun.campaign.remaining !== 0) {
  throw new Error('Test window did not update campaign counters.');
}

console.log('Media campaign service guard test passed.');
