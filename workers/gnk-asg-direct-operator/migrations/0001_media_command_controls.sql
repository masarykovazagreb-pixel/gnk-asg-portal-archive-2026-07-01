CREATE TABLE IF NOT EXISTS media_outreach_contact_controls (
  mail_code TEXT PRIMARY KEY,
  source_version TEXT,
  verification_checked_at TEXT,
  approval_expires_at TEXT,
  to_email TEXT,
  cc_email TEXT,
  requires_personalization INTEGER NOT NULL DEFAULT 0,
  blocked_reason TEXT,
  operational_status TEXT NOT NULL DEFAULT 'UNASSESSED',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media_contact_imports (
  id TEXT PRIMARY KEY,
  source_version TEXT NOT NULL,
  source_sha256 TEXT,
  contact_count INTEGER NOT NULL,
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  unchanged_count INTEGER NOT NULL DEFAULT 0,
  imported_by TEXT,
  detail_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media_delivery_attempts (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL,
  mail_code TEXT NOT NULL,
  campaign_version TEXT,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error_code TEXT,
  detail_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_controls_status ON media_outreach_contact_controls(operational_status,approval_expires_at);
CREATE INDEX IF NOT EXISTS idx_media_delivery_contact ON media_delivery_attempts(mail_code,created_at);
CREATE INDEX IF NOT EXISTS idx_media_delivery_status ON media_delivery_attempts(status,created_at);
