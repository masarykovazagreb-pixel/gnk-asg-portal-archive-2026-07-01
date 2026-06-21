export const OPERATOR_AUDIT_LOG_KEY = 'mail-agent:operator-audit-log:v1';

export async function readOperatorAuditLog(env, limit = 200) {
  if (!env?.GNK_ASG_KV) return [];
  const raw = await env.GNK_ASG_KV.get(OPERATOR_AUDIT_LOG_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, Math.max(1, Math.min(Number(limit) || 200, 1000))) : [];
  } catch {
    return [];
  }
}

export async function writeOperatorAuditLog(env, event = {}) {
  if (!env?.GNK_ASG_KV) return null;
  const now = new Date().toISOString();
  const item = {
    id: String(event.id || crypto.randomUUID()),
    action: clean(event.action, 120),
    entityType: clean(event.entityType, 80),
    entityId: clean(event.entityId, 160),
    actor: clean(event.actor || 'operator-token', 80),
    result: clean(event.result || 'success', 40),
    metadata: sanitiseMetadata(event.metadata),
    createdAt: now
  };
  const existing = await readOperatorAuditLog(env, 1000);
  const next = [item, ...existing].slice(0, 1000);
  await env.GNK_ASG_KV.put(OPERATOR_AUDIT_LOG_KEY, JSON.stringify(next, null, 2));
  return item;
}

function clean(value, maxLength) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function sanitiseMetadata(value) {
  if (!value || typeof value !== 'object') return {};
  const blocked = new Set(['token', 'authorization', 'password', 'secret', 'base64', 'body']);
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (blocked.has(String(key).toLowerCase())) continue;
    if (item == null || ['string', 'number', 'boolean'].includes(typeof item)) {
      result[key] = typeof item === 'string' ? item.slice(0, 300) : item;
    }
  }
  return result;
}
