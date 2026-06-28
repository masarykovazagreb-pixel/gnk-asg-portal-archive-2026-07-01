CREATE TABLE IF NOT EXISTS media_access_codes (
  id TEXT PRIMARY KEY,
  mail_code TEXT NOT NULL,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  expires_at TEXT NOT NULL,
  used_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_access_codes_lookup
  ON media_access_codes (mail_code, email, status, expires_at);

CREATE TABLE IF NOT EXISTS media_access_sessions (
  id TEXT PRIMARY KEY,
  mail_code TEXT NOT NULL,
  email TEXT NOT NULL,
  session_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_access_sessions_lookup
  ON media_access_sessions (session_hash, expires_at);

CREATE TABLE IF NOT EXISTS media_access_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  mail_code TEXT,
  email TEXT,
  detail_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_access_events_mail_code
  ON media_access_events (mail_code, created_at);
