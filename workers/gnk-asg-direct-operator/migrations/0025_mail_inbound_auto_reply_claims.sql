CREATE TABLE IF NOT EXISTS mail_inbound_auto_reply_claims (
  case_id TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN ('pending','sent','failed')),
  sender TEXT NOT NULL DEFAULT '',
  recipient TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sent_at TEXT,
  failed_at TEXT,
  error TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_mail_inbound_auto_reply_claims_state_updated
  ON mail_inbound_auto_reply_claims (state, updated_at DESC);
