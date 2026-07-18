// GNK_ASG_CONTACT_CASE_CENTER_V2
// Zaštićen backend modul za kontaktne upite (contact/media formulari).
// Svaki zapis dobiva zajednički caseId format GNK-YYYYMMDD-XXXXXXXX koji
// se koristi i u Mail Studio predmetu i u PDF Center dokumentu, radi
// medjusobnog povezivanja bez dupliciranja podataka.
//
// Pohrana: D1 (GNK_ASG_D1), tablica contact_cases.
// NE dira mail slanje, DNS, rute, tajne ni produkcijsku konfiguraciju.
// Svaka /api/contact-cases/* ruta zahtijeva aktivnu admin/operator sesiju
// - provjeru radi pozivatelj prije poziva ovog modula.

export const VERSION = 'GNK_ASG_CONTACT_CASE_CENTER_V2_20260718_IDEMPOTENT_CREATE';
export const API_PREFIX = '/api/contact-cases';

const clean = v => String(v ?? '').trim();
const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

export function generateCaseId() {
  const now = new Date();
  const two = n => String(n).padStart(2, '0');
  const date = `${now.getUTCFullYear()}${two(now.getUTCMonth() + 1)}${two(now.getUTCDate())}`;
  const fingerprint = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `GNK-${date}-${fingerprint}`;
}

function normalizeIdempotencyKey(value) {
  const key = clean(value).slice(0, 160);
  if (!key) return '';
  if (!/^[A-Za-z0-9._:-]{16,160}$/.test(key)) throw new Error('invalid_idempotency_key');
  return key;
}

async function ensureSchema(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS contact_cases(
    case_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    source TEXT,
    name TEXT,
    email TEXT,
    subject TEXT,
    message TEXT,
    language TEXT,
    idempotency_key TEXT,
    mail_studio_thread_id TEXT,
    pdf_document_id TEXT,
    assigned_to TEXT,
    notes TEXT
  )`).run();
  try { await db.prepare('ALTER TABLE contact_cases ADD COLUMN idempotency_key TEXT').run(); } catch {}
  await db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_cases_idempotency
    ON contact_cases(idempotency_key) WHERE idempotency_key IS NOT NULL AND idempotency_key <> ''`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_contact_cases_email ON contact_cases(email)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_contact_cases_status ON contact_cases(status)`).run();
}

export async function createContactCase(env, payload) {
  const db = env.GNK_ASG_D1;
  await ensureSchema(db);
  const idempotencyKey = normalizeIdempotencyKey(payload.idempotencyKey);
  if (idempotencyKey) {
    const existing = await db.prepare('SELECT case_id, created_at FROM contact_cases WHERE idempotency_key = ?').bind(idempotencyKey).first();
    if (existing) return { caseId: existing.case_id, createdAt: existing.created_at, reused: true };
  }
  const caseId = generateCaseId();
  const now = new Date().toISOString();
  const statement = idempotencyKey
    ? `INSERT OR IGNORE INTO contact_cases
      (case_id, created_at, updated_at, status, source, name, email, subject, message, language, idempotency_key)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    : `INSERT INTO contact_cases
      (case_id, created_at, updated_at, status, source, name, email, subject, message, language, idempotency_key)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
  const result = await db.prepare(statement).bind(
    caseId, now, now, 'open',
    clean(payload.source) || 'contact-form',
    clean(payload.name),
    clean(payload.email),
    clean(payload.subject),
    clean(payload.message),
    clean(payload.language) || 'hr',
    idempotencyKey || null
  ).run();
  if (idempotencyKey && Number(result?.meta?.changes || 0) === 0) {
    const existing = await db.prepare('SELECT case_id, created_at FROM contact_cases WHERE idempotency_key = ?').bind(idempotencyKey).first();
    if (existing) return { caseId: existing.case_id, createdAt: existing.created_at, reused: true };
    throw new Error('idempotent_contact_insert_failed');
  }
  return { caseId, createdAt: now, reused: false };
}

async function listCases(env, url) {
  const db = env.GNK_ASG_D1;
  await ensureSchema(db);
  const status = clean(url.searchParams.get('status'));
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
  let query = 'SELECT * FROM contact_cases';
  const binds = [];
  if (status) { query += ' WHERE status = ?'; binds.push(status); }
  query += ' ORDER BY created_at DESC LIMIT ?';
  binds.push(limit);
  const result = await db.prepare(query).bind(...binds).all();
  return json({ ok: true, cases: result.results || [] });
}

async function lookupCase(env, url) {
  const db = env.GNK_ASG_D1;
  await ensureSchema(db);
  const query = clean(url.searchParams.get('q') || url.searchParams.get('case'));
  if (!query) return json({ ok: false, error: 'missing_query' }, 400);
  const exact = await db.prepare('SELECT * FROM contact_cases WHERE case_id = ?').bind(query).first();
  if (exact) return json({ ok: true, cases: [exact] });
  const like = `%${query}%`;
  const result = await db.prepare(
    'SELECT * FROM contact_cases WHERE email LIKE ? OR name LIKE ? OR subject LIKE ? ORDER BY created_at DESC LIMIT 50'
  ).bind(like, like, like).all();
  const cases = result.results || [];
  if (!cases.length) return json({ ok: false, error: 'not_found', query }, 404);
  return json({ ok: true, cases });
}

async function updateCase(request, env) {
  const body = await request.json().catch(() => ({}));
  const caseId = clean(body.caseId);
  if (!caseId) return json({ ok: false, error: 'missing_case_id' }, 400);
  const db = env.GNK_ASG_D1;
  await ensureSchema(db);
  const existing = await db.prepare('SELECT * FROM contact_cases WHERE case_id = ?').bind(caseId).first();
  if (!existing) return json({ ok: false, error: 'not_found' }, 404);

  const fields = [];
  const binds = [];
  for (const [col, key] of [['status', 'status'], ['mail_studio_thread_id', 'mailStudioThreadId'], ['pdf_document_id', 'pdfDocumentId'], ['assigned_to', 'assignedTo'], ['notes', 'notes']]) {
    if (body[key] !== undefined) { fields.push(`${col} = ?`); binds.push(clean(body[key])); }
  }
  if (!fields.length) return json({ ok: false, error: 'no_fields_to_update' }, 400);
  fields.push('updated_at = ?');
  binds.push(new Date().toISOString());
  binds.push(caseId);
  await db.prepare(`UPDATE contact_cases SET ${fields.join(', ')} WHERE case_id = ?`).bind(...binds).run();
  const updated = await db.prepare('SELECT * FROM contact_cases WHERE case_id = ?').bind(caseId).first();
  return json({ ok: true, case: updated });
}

export async function handleContactCaseCenter(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (!path.startsWith(API_PREFIX)) return null;

  if (path === `${API_PREFIX}/list` && request.method === 'GET') return listCases(env, url);
  if (path === `${API_PREFIX}/lookup` && request.method === 'GET') return lookupCase(env, url);
  if (path === `${API_PREFIX}/create` && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const result = await createContactCase(env, body);
    return json({ ok: true, ...result });
  }
  if (path === `${API_PREFIX}/update` && request.method === 'POST') return updateCase(request, env);

  return json({ ok: false, error: 'not_found' }, 404);
}
