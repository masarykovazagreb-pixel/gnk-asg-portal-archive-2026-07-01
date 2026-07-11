// GNK_ASG_PDF_CENTER_V1
// Zastiten backend modul za PDF dokumente povezane s kontaktnim
// slucajevima i Mail Studio predmetima preko zajednickog caseId-a.
//
// Pohrana datoteka: R2 (GNK_ASG_MEDIA_ASSETS), kljuc oblika
// pdf-center/<caseId>/<documentId>.pdf
// Metapodaci: D1 (GNK_ASG_D1), tablica pdf_documents.
// KV se NE koristi kao glavno spremiste - samo eventualni kratkotrajni cache.
//
// NE dira mail slanje, DNS, rute, tajne ni produkcijsku konfiguraciju.
// Svaka /api/pdf-center/* ruta zahtijeva aktivnu admin/operator sesiju -
// provjeru radi pozivatelj (index-unified-auth-v16.js), isti obrazac kao
// email-status-tracking-v5.js.

export const VERSION = 'GNK_ASG_PDF_CENTER_V1_20260711';
export const API_PREFIX = '/api/pdf-center';

const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25MB po dokumentu

const clean = v => String(v ?? '').trim();
const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

function generateDocumentId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
}

function r2Key(caseId, documentId, filename) {
  const safeName = clean(filename).replace(/[^a-zA-Z0-9._-]/g, '_') || 'document.pdf';
  return `pdf-center/${caseId}/${documentId}-${safeName}`;
}

async function ensureSchema(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS pdf_documents(
    document_id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    filename TEXT,
    content_type TEXT NOT NULL DEFAULT 'application/pdf',
    size_bytes INTEGER NOT NULL DEFAULT 0,
    uploaded_at TEXT NOT NULL,
    uploaded_by TEXT,
    label TEXT,
    notes TEXT
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_pdf_documents_case ON pdf_documents(case_id)`).run();
}

async function uploadDocument(request, env) {
  const url = new URL(request.url);
  const caseId = clean(url.searchParams.get('caseId'));
  if (!caseId) return json({ ok: false, error: 'missing_case_id' }, 400);

  const contentType = clean(request.headers.get('content-type'));
  if (!contentType.includes('application/pdf') && !contentType.includes('multipart/form-data')) {
    return json({ ok: false, error: 'expected_pdf_content_type' }, 400);
  }

  let bytes, filename, label, uploadedBy;
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') return json({ ok: false, error: 'missing_file_field' }, 400);
    bytes = await file.arrayBuffer();
    filename = file.name || 'document.pdf';
    label = clean(form.get('label'));
    uploadedBy = clean(form.get('uploadedBy'));
  } else {
    bytes = await request.arrayBuffer();
    filename = clean(url.searchParams.get('filename')) || 'document.pdf';
    label = clean(url.searchParams.get('label'));
    uploadedBy = clean(url.searchParams.get('uploadedBy'));
  }

  if (!bytes || bytes.byteLength === 0) return json({ ok: false, error: 'empty_file' }, 400);
  if (bytes.byteLength > MAX_PDF_BYTES) return json({ ok: false, error: 'file_too_large', maxBytes: MAX_PDF_BYTES }, 413);

  const documentId = generateDocumentId();
  const key = r2Key(caseId, documentId, filename);

  await env.GNK_ASG_MEDIA_ASSETS.put(key, bytes, {
    httpMetadata: { contentType: 'application/pdf' }
  });

  const db = env.GNK_ASG_D1;
  await ensureSchema(db);
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO pdf_documents
    (document_id, case_id, r2_key, filename, content_type, size_bytes, uploaded_at, uploaded_by, label)
    VALUES (?,?,?,?,?,?,?,?,?)`).bind(
    documentId, caseId, key, filename, 'application/pdf', bytes.byteLength, now, uploadedBy || null, label || null
  ).run();

  return json({ ok: true, documentId, caseId, filename, sizeBytes: bytes.byteLength, uploadedAt: now });
}

async function listDocumentsForCase(env, url) {
  const caseId = clean(url.searchParams.get('caseId'));
  if (!caseId) return json({ ok: false, error: 'missing_case_id' }, 400);
  const db = env.GNK_ASG_D1;
  await ensureSchema(db);
  const result = await db.prepare('SELECT * FROM pdf_documents WHERE case_id = ? ORDER BY uploaded_at DESC').bind(caseId).all();
  return json({ ok: true, caseId, documents: result.results || [] });
}

async function downloadDocument(env, url) {
  const documentId = clean(url.searchParams.get('documentId'));
  if (!documentId) return json({ ok: false, error: 'missing_document_id' }, 400);
  const db = env.GNK_ASG_D1;
  await ensureSchema(db);
  const record = await db.prepare('SELECT * FROM pdf_documents WHERE document_id = ?').bind(documentId).first();
  if (!record) return json({ ok: false, error: 'not_found' }, 404);
  const object = await env.GNK_ASG_MEDIA_ASSETS.get(record.r2_key);
  if (!object) return json({ ok: false, error: 'file_missing_in_storage' }, 404);
  const headers = new Headers();
  headers.set('content-type', 'application/pdf');
  headers.set('content-disposition', `inline; filename="${record.filename || 'document.pdf'}"`);
  headers.set('cache-control', 'no-store');
  return new Response(object.body, { status: 200, headers });
}

async function deleteDocument(request, env) {
  const body = await request.json().catch(() => ({}));
  const documentId = clean(body.documentId);
  if (!documentId) return json({ ok: false, error: 'missing_document_id' }, 400);
  const db = env.GNK_ASG_D1;
  await ensureSchema(db);
  const record = await db.prepare('SELECT * FROM pdf_documents WHERE document_id = ?').bind(documentId).first();
  if (!record) return json({ ok: false, error: 'not_found' }, 404);
  await env.GNK_ASG_MEDIA_ASSETS.delete(record.r2_key);
  await db.prepare('DELETE FROM pdf_documents WHERE document_id = ?').bind(documentId).run();
  return json({ ok: true, deleted: documentId });
}

export async function handlePdfCenter(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (!path.startsWith(API_PREFIX)) return null;

  if (path === `${API_PREFIX}/upload` && request.method === 'POST') return uploadDocument(request, env);
  if (path === `${API_PREFIX}/list` && request.method === 'GET') return listDocumentsForCase(env, url);
  if (path === `${API_PREFIX}/download` && request.method === 'GET') return downloadDocument(env, url);
  if (path === `${API_PREFIX}/delete` && request.method === 'POST') return deleteDocument(request, env);

  return json({ ok: false, error: 'not_found' }, 404);
}
