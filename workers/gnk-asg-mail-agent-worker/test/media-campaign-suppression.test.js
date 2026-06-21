import { buildMediaCampaignBatch } from '../src/media-campaign-batch.js';
import {
  addSuppressionEntry,
  applySuppressionToCampaign,
  readSuppressionEntries,
  readSuppressionSet,
  removeSuppressionEntry
} from '../src/media-campaign-suppression.js';

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

const env = { GNK_ASG_KV: new MemoryKV() };

const added = await addSuppressionEntry(env, {
  email: ' Odjava@Example.com ',
  reason: 'opt_out',
  source: 'test'
});
if (added.email !== 'odjava@example.com') throw new Error('Suppression email was not normalised.');

const entries = await readSuppressionEntries(env);
if (entries.length !== 1 || entries[0].reason !== 'opt_out') throw new Error('Suppression entry was not persisted.');

const suppressionSet = await readSuppressionSet(env);
const campaign = buildMediaCampaignBatch({
  id: 'suppression-import-test',
  subject: 'Informacija za {{media}}',
  bodyTemplate: 'Poštovani {{fullName}}',
  pdfAttachmentName: 'release.pdf',
  recipients: [
    { ime: 'Ana', prezime: 'Anić', medij: 'Odjavljeni medij', email: 'odjava@example.com' },
    { ime: 'Ivo', prezime: 'Ivić', medij: 'Aktivni medij', email: 'ivo@example.com' }
  ],
  suppressedEmails: suppressionSet
});

if (campaign.total !== 2) throw new Error('Imported recipient total is incorrect.');
if (campaign.suppressed !== 1) throw new Error('Suppressed recipient was not counted.');
if (campaign.failed !== 0) throw new Error('Suppressed recipient must not be counted as a validation failure.');
if (campaign.remaining !== 1 || campaign.queue[0]?.recipient?.email !== 'ivo@example.com') {
  throw new Error('Suppressed recipient entered the send queue.');
}

const lateCampaign = buildMediaCampaignBatch({
  id: 'suppression-runtime-test',
  subject: 'Informacija za {{media}}',
  bodyTemplate: 'Poštovani {{fullName}}',
  pdfAttachmentName: 'release.pdf',
  recipients: [
    { ime: 'Ivo', prezime: 'Ivić', medij: 'Aktivni medij', email: 'ivo@example.com' }
  ]
});
await addSuppressionEntry(env, { email: 'ivo@example.com', reason: 'manual_block', source: 'operator' });
const runtimeSet = await readSuppressionSet(env);
const guarded = applySuppressionToCampaign(lateCampaign, runtimeSet, new Date('2099-01-01T00:00:00.000Z'));
if (guarded.remaining !== 0 || guarded.suppressed !== 1) throw new Error('Late suppression was not applied before execution.');
if (guarded.queue[0]?.status !== 'suppressed') throw new Error('Suppressed queue item status is incorrect.');

const removed = await removeSuppressionEntry(env, 'ivo@example.com');
if (!removed.removed) throw new Error('Suppression removal did not report an existing entry.');
const afterRemove = await readSuppressionSet(env);
if (afterRemove.has('ivo@example.com')) throw new Error('Suppression entry was not removed.');

console.log('Media campaign suppression test passed: persistence, import gate, runtime gate and removal.');
