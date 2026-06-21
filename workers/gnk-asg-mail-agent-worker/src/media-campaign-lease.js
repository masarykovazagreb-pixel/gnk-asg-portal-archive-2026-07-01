const WINDOW_MS = 60_000;

export function strictCampaignLeaseReady(env) {
  return Boolean(env?.GNK_ASG_D1 && typeof env.GNK_ASG_D1.prepare === 'function');
}

export async function acquireMediaCampaignLease(env, campaignId, now = new Date()) {
  if (!strictCampaignLeaseReady(env)) {
    return {
      acquired: false,
      reason: 'strict_rate_limit_storage_unavailable',
      retryAfterSeconds: null
    };
  }

  const current = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(current.getTime())) {
    return {
      acquired: false,
      reason: 'invalid_now',
      retryAfterSeconds: null
    };
  }

  const id = String(campaignId || '').trim();
  if (!/^[a-zA-Z0-9._:-]{1,160}$/.test(id)) {
    return {
      acquired: false,
      reason: 'invalid_campaign_id',
      retryAfterSeconds: null
    };
  }

  await env.GNK_ASG_D1.prepare(`
    CREATE TABLE IF NOT EXISTS media_campaign_rate_leases (
      campaign_id TEXT PRIMARY KEY,
      last_started_at INTEGER NOT NULL DEFAULT 0,
      lease_id TEXT,
      updated_at TEXT NOT NULL
    )
  `).run();

  const nowMs = current.getTime();
  const leaseId = crypto.randomUUID();
  const updatedAt = current.toISOString();

  await env.GNK_ASG_D1.prepare(`
    INSERT OR IGNORE INTO media_campaign_rate_leases
      (campaign_id, last_started_at, lease_id, updated_at)
    VALUES (?, 0, NULL, ?)
  `).bind(id, updatedAt).run();

  const result = await env.GNK_ASG_D1.prepare(`
    UPDATE media_campaign_rate_leases
    SET last_started_at = ?, lease_id = ?, updated_at = ?
    WHERE campaign_id = ? AND last_started_at <= ?
  `).bind(nowMs, leaseId, updatedAt, id, nowMs - WINDOW_MS).run();

  const changes = Number(result?.meta?.changes || 0);
  if (changes === 1) {
    return {
      acquired: true,
      reason: 'acquired',
      leaseId,
      acquiredAt: updatedAt,
      nextAllowedAt: new Date(nowMs + WINDOW_MS).toISOString(),
      retryAfterSeconds: 60
    };
  }

  const row = await env.GNK_ASG_D1.prepare(`
    SELECT last_started_at FROM media_campaign_rate_leases WHERE campaign_id = ?
  `).bind(id).first();
  const lastStartedAt = Number(row?.last_started_at || nowMs);
  const remainingMs = Math.max(0, lastStartedAt + WINDOW_MS - nowMs);

  return {
    acquired: false,
    reason: 'rate_limited',
    nextAllowedAt: new Date(lastStartedAt + WINDOW_MS).toISOString(),
    retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000))
  };
}
