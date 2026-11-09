-- Idempotent schema for the Digital Workforce Editor Desk D1 store.
-- Review against production before applying; this migration does not run automatically.
-- Column names and constraints mirror ensureTable() in digital-workforce-api-v1.js.
CREATE TABLE IF NOT EXISTS editor_desk_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_date TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  public_json TEXT NOT NULL,
  sensitive_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
