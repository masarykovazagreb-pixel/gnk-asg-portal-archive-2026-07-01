export const MEDIA_CAMPAIGN_SUPPRESSION_KEY = 'mail-agent:media-campaign:suppressions:v1';

export function normaliseSuppressionEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export async function readSuppressionEntries(env) {
  if (!env?.GNK_ASG_KV) return [];
  const raw = await env.GNK_ASG_KV.get(MEDIA_CAMPAIGN_SUPPRESSION_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(entry => entry?.email).map(normaliseEntry)
      : [];
  } catch {
    return [];
  }
}

export async function readSuppressionSet(env) {
  const entries = await readSuppressionEntries(env);
  return new Set(entries.map(entry => entry.email));
}

export async function addSuppressionEntry(env, input = {}) {
  if (!env?.GNK_ASG_KV) throw new Error('suppression_storage_unavailable');
  const email = normaliseSuppressionEmail(input.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('invalid_suppression_email');

  const entries = await readSuppressionEntries(env);
  const now = new Date().toISOString();
  const existing = entries.find(entry => entry.email === email);
  const entry = {
    email,
    reason: String(input.reason || existing?.reason || 'opt_out').trim().slice(0, 160),
    source: String(input.source || existing?.source || 'operator').trim().slice(0, 80),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
  const next = [entry, ...entries.filter(item => item.email !== email)].slice(0, 5000);
  await env.GNK_ASG_KV.put(MEDIA_CAMPAIGN_SUPPRESSION_KEY, JSON.stringify(next, null, 2));
  return entry;
}

export async function removeSuppressionEntry(env, emailValue) {
  if (!env?.GNK_ASG_KV) throw new Error('suppression_storage_unavailable');
  const email = normaliseSuppressionEmail(emailValue);
  const entries = await readSuppressionEntries(env);
  const existed = entries.some(entry => entry.email === email);
  const next = entries.filter(entry => entry.email !== email);
  await env.GNK_ASG_KV.put(MEDIA_CAMPAIGN_SUPPRESSION_KEY, JSON.stringify(next, null, 2));
  return { email, removed: existed };
}

export function isSuppressedEmail(suppressionSet, emailValue) {
  const email = normaliseSuppressionEmail(emailValue);
  return suppressionSet instanceof Set && suppressionSet.has(email);
}

export function applySuppressionToCampaign(campaign = {}, suppressionSet = new Set(), now = new Date()) {
  const queue = Array.isArray(campaign.queue) ? campaign.queue : [];
  const processedAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const nextQueue = queue.map(item => {
    if (item.status !== 'remaining') return item;
    if (!isSuppressedEmail(suppressionSet, item.recipient?.email)) return item;
    return {
      ...item,
      status: 'suppressed',
      processedAt,
      failureReason: 'suppressed_recipient'
    };
  });
  const remaining = nextQueue.filter(item => item.status === 'remaining').length;
  const suppressed = nextQueue.filter(item => item.status === 'suppressed').length;
  const sent = nextQueue.filter(item => item.status === 'sent').length;
  const tested = nextQueue.filter(item => item.status === 'tested').length;
  const failed = nextQueue.filter(item => item.status === 'failed').length;
  return {
    ...campaign,
    queue: nextQueue,
    remaining,
    suppressed,
    sent,
    tested,
    failed,
    status: remaining ? campaign.status : (failed && !sent && !tested && !suppressed ? 'failed' : 'complete')
  };
}

function normaliseEntry(entry) {
  return {
    email: normaliseSuppressionEmail(entry.email),
    reason: String(entry.reason || 'opt_out'),
    source: String(entry.source || 'operator'),
    createdAt: entry.createdAt || null,
    updatedAt: entry.updatedAt || entry.createdAt || null
  };
}
