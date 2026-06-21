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

async function fixture() {
  const env = {
    GNK_ASG_KV: new MemoryKV(),
    MEDIA_CAMPAIGN_LIVE_SEND: 'false'
  };
  const created = await createMediaCampaign(env, payload);
  return { env, created };
}

async function verifyCreate() {
  const { created } = await fixture();
  assert(created.batch.attachmentKey, 'PDF attachment key was not stored.');
  assert(created.batch.remaining === 1, 'Campaign queue was not created.');
}

async function verifyConfirmationGate() {
  const { env, created } = await fixture();
  const result = await runMediaCampaignWindow(env, created.batch, { mode: 'live' });
  assert(!result.ok && result.error === 'live_confirmation_required', 'Live sending must require campaign ID confirmation.');
}

async function verifyLiveDisabledGate() {
  const { env, created } = await fixture();
  const result = await runMediaCampaignWindow(env, created.batch, {
    mode: 'live',
    confirmCampaignId: created.batch.id
  });
  assert(!result.ok && result.error === 'live_send_not_configured', 'Live sending must remain disabled without the environment gate.');
}

async function verifyStrictLeaseGate() {
  const { env, created } = await fixture();
  env.MEDIA_CAMPAIGN_LIVE_SEND = 'true';
  const result = await runMediaCampaignWindow(env, created.batch, {
    mode: 'live',
    confirmCampaignId: created.batch.id
  });
  assert(!result.ok && result.error === 'strict_rate_limit_storage_unavailable', 'Live sending must require strict D1 rate-limit storage.');
}

async function verifySafeTestRun() {
  const { env, created } = await fixture();
  const result = await runMediaCampaignWindow(env, created.batch, { mode: 'test' });
  assert(result.ok && result.productionSendEnabled === false, 'Test window must execute without enabling production sending.');
  assert(result.campaign.tested === 1 && result.campaign.remaining === 0, 'Test window did not update campaign counters.');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const scenarios = {
  create: verifyCreate,
  confirmation: verifyConfirmationGate,
  disabled: verifyLiveDisabledGate,
  lease: verifyStrictLeaseGate,
  test: verifySafeTestRun
};

const selected = process.argv[2] || 'all';
if (selected === 'all') {
  for (const [name, run] of Object.entries(scenarios)) {
    await run();
    console.log(`Media campaign service scenario passed: ${name}.`);
  }
} else {
  const run = scenarios[selected];
  if (!run) throw new Error(`unknown_scenario:${selected}`);
  await run();
  console.log(`Media campaign service scenario passed: ${selected}.`);
}
