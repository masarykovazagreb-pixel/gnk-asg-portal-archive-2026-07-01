CREATE TABLE IF NOT EXISTS operator_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  source TEXT NOT NULL,
  command TEXT NOT NULL,
  actor TEXT,
  ok INTEGER NOT NULL,
  note TEXT,
  payload_json TEXT,
  result_json TEXT,
  ip TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS operator_snapshot (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  snapshot_key TEXT NOT NULL UNIQUE,
  reason TEXT,
  actor TEXT
);

CREATE INDEX IF NOT EXISTS idx_operator_log_created_at ON operator_log(created_at);
CREATE INDEX IF NOT EXISTS idx_operator_log_command ON operator_log(command);
CREATE INDEX IF NOT EXISTS idx_operator_snapshot_created_at ON operator_snapshot(created_at);
