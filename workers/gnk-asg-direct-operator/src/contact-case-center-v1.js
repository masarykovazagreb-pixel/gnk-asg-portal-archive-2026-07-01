// GNK_ASG_CONTACT_CASE_CENTER_V1
// Zaštićen backend modul za kontaktne upite (contact/media formulari).
// Svaki zapis dobiva zajednički caseId format GNK-YYYYMMDD-XXXXXXXX koji
// se koristi i u Mail Studio predmetu i u PDF Center dokumentu, radi
// medjusobnog povezivanja bez dupliciranja podataka.
//
// Pohrana: D1 (GNK_ASG_D1), tablica contact_cases.
// NE dira mail slanje, DNS, rute, tajne ni produkcijsku konfiguraciju.
// Svaka /api/contact-cases/* ruta zahtijeva aktivnu admin/operator sesiju
// - provjeru radi pozivatelj (index-unified-auth-v16.js) prije poziva ovog
// modula, dosljedno postojecem obrascu (email-status-tracking-v5.js).

export const VERSION = 'GNK_ASG_CONTACT_CASE_CENTER_V1_20260711';
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
    mail_studio_thread_id TEXT,
    pdf_document_id TEXT,
    assigned_to TEXT,
    notes TEXT
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_contact_cases_email ON contact_cases(email)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_contact_cases_status ON contact_cases(status)`).run();
}

export async function createContactCase(env, payload) {
  const db = env.GNK_ASG_D1;
  await ensureSchema(db);
  const caseId = generateCaseId();
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO contact_cases
    (case_id, created_at, updated_at, status, source, name, email, subject, message, language)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(
    caseId, now, now, 'open',
    clean(payload.source) || 'contact-form',
    clean(payload.name),
    clean(payload.email),
    clean(payload.subject),
    clean(payload.message),
    clean(payload.language) || 'hr'
  ).run();
  return { caseId, createdAt: now };
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
