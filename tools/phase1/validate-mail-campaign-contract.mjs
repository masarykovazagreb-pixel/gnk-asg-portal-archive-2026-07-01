import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const contractPath = resolve(here, '../../contracts/mail-agent/media-campaign-safety.contract.json');
const contract = JSON.parse(readFileSync(contractPath, 'utf8'));

const requiredTopLevel = ['version', 'scope', 'production_policy', 'media_campaign_requirements', 'ai_reply_requirements'];
const requiredRecipientFields = ['firstName', 'lastName', 'media', 'email'];
const requiredTracking = ['sent', 'failed', 'remaining', 'paused', 'scheduled', 'testSent'];
const requiredApprovalClasses = [
  'legal',
  'financial',
  'contractual',
  'reputational',
  'security',
  'personal_data',
  'sensitive',
  'binding_commitment'
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function includesAll(actual, expected, label) {
  assert(Array.isArray(actual), `${label} must be an array`);
  for (const item of expected) {
    assert(actual.includes(item), `${label} missing ${item}`);
  }
}

for (const key of requiredTopLevel) {
  assert(Object.hasOwn(contract, key), `contract missing ${key}`);
}

assert(contract.production_policy.live_send_default === false, 'live send must stay disabled by default');
assert(contract.production_policy.operator_token_required === true, 'operator token must be required');
assert(contract.production_policy.max_messages_per_minute <= 10, 'rate limit must not exceed 10/min');
assert(contract.production_policy.batch_target <= 100, 'batch target must not exceed 100');
assert(contract.production_policy.requires_explicit_operator_approval_for_live_send === true, 'live sending requires approval');

includesAll(contract.media_campaign_requirements.recipient_fields, requiredRecipientFields, 'recipient_fields');
includesAll(contract.media_campaign_requirements.status_tracking, requiredTracking, 'status_tracking');
assert(contract.media_campaign_requirements.no_bulk_blind_send === true, 'blind bulk send must be blocked');

assert(contract.ai_reply_requirements.applies_to === 'all_incoming_mailboxes_and_threads', 'AI reply assistant must apply to all inbox threads');
assert(contract.ai_reply_requirements.thread_reading === 'full_thread_required_when_available', 'AI must read full thread when available');
includesAll(contract.ai_reply_requirements.approval_required_for, requiredApprovalClasses, 'approval_required_for');

console.log(JSON.stringify({ ok: true, contract: contract.version, maxPerMinute: contract.production_policy.max_messages_per_minute }, null, 2));
