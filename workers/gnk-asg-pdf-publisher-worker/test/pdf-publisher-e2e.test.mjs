import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKER_ROOT = path.resolve(HERE, '..');
const SOURCE_ROOT = path.join(WORKER_ROOT, 'src');
const REPORT_ROOT = path.resolve(WORKER_ROOT, '..', '..', 'reports', 'pdf-publisher-e2e-smoke');
const INDEX_KEY = 'preview:pdf-publications:index:v1';
const PREVIEW_ORIGIN = 'https://pdf-preview.workers.dev';
const ALLOWED_ORIGIN = 'https://preview.gnk-asg.hr';
const UNTRUSTED_ORIGIN = 'https://example.invalid';
const TOKEN = 'pdf-e2e-token';
const PDF_BYTES = new TextEncoder().encode('%PDF-1.7\nGNK ASG preview test\n%%EOF');

class FakeKV {
  constructor() {
    this.values = new Map();
    this.putCalls = [];
  }

  async get(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  async put(key, value) {
    const normalized = String(value);
    this.values.set(key, normalized);
    this.putCalls.push({ key, value: normalized });
  }
}

async function bodyToBytes(body) {
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  return new Uint8Array(await new Response(body).arrayBuffer());
}

class FakeR2 {
  constructor() {
    this.objects = new Map();
    this.putCalls = [];
  }

  async put(key, body, options = {}) {
    const bytes = await bodyToBytes(body);
    const record = {
      key,
      bytes,
      httpMetadata: options.httpMetadata || {},
      customMetadata: options.customMetadata || {},
      httpEtag: `\"fake-${bytes.byteLength}-${this.objects.size + 1}\"`
    };
    this.objects.set(key, record);
    this.putCalls.push(record);
  }

  async get(key) {
    const record = this.objects.get(key);
    if (!record) return null;
    return {
      body: record.bytes,
      httpEtag: record.httpEtag,
      writeHttpMetadata(headers) {
        if (record.httpMetadata.contentType) headers.set('content-type', record.httpMetadata.contentType);
        if (record.httpMetadata.contentDisposition) headers.set('content-disposition', record.httpMetadata.contentDisposition);
      }
    };
  }
}

function request(pathname, init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('origin')) headers.set('origin', ALLOWED_ORIGIN);
  return new Request(`${PREVIEW_ORIGIN}${pathname}`, { ...init, headers });
}

function pdfForm(overrides = {}) {
  const form = new FormData();
  form.set('file', overrides.file || new File([PDF_BYTES], 'gnk-asg-test.pdf', { type: 'application/pdf' }));
  form.set('title', overrides.title ?? 'GNK ASG PDF test publication');
  form.set('summary', overrides.summary ?? 'This controlled preview document verifies the secure PDF publication workflow.');
  form.set('lang', overrides.lang ?? 'hr');
  form.set('type', overrides.type ?? 'publication');
  form.set('status', overrides.status ?? 'draft');
  form.set('author', overrides.author ?? 'Nermin Sefić');
  form.set('keywords', overrides.keywords ?? 'GNK ASG, PDF, preview');
  return form;
}

async function jsonBody(response) {
  return JSON.parse(await response.text());
}

async function loadWorker() {
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'gnk-asg-pdf-publisher-'));
  await writeFile(path.join(tempRoot, 'package.json'), '{"type":"module"}\n', 'utf8');
  for (const filename of ['index.js', 'upload.js', 'storage.js', 'utils.js']) {
    await writeFile(path.join(tempRoot, filename), await readFile(path.join(SOURCE_ROOT, filename), 'utf8'), 'utf8');
  }
  const moduleUrl = `${pathToFileURL(path.join(tempRoot, 'index.js')).href}?run=${Date.now()}`;
  const module = await import(moduleUrl);
  return { worker: module.default, cleanup: () => rm(tempRoot, { recursive: true, force: true }) };
}

const checks = [];
function check(name, fn) {
  checks.push({ name, fn });
}

const kv = new FakeKV();
const r2 = new FakeR2();
const env = {
  OPERATOR_TOKEN: TOKEN,
  GNK_ASG_KV: kv,
  GNK_ASG_MEDIA_ASSETS: r2
};

const { worker, cleanup } = await loadWorker();
let draftRecord;
let publishedRecord;

check('status endpoint is public and reports preview bindings', async () => {
  const response = await worker.fetch(request('/api/pdf-publications/status'), env);
  const body = await jsonBody(response);
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.mode, 'preview');
  assert.equal(body.productionRouteConfigured, false);
  assert.equal(body.kv, true);
  assert.equal(body.r2, true);
});

check('allowed GNK ASG origin is echoed and wildcard CORS is absent', async () => {
  const response = await worker.fetch(request('/api/pdf-publications/status'), env);
  assert.equal(response.headers.get('access-control-allow-origin'), ALLOWED_ORIGIN);
  assert.notEqual(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(response.headers.get('vary'), 'Origin');
});

check('untrusted preflight origin falls back to the canonical GNK ASG origin', async () => {
  const response = await worker.fetch(request('/api/pdf-publications/upload', {
    method: 'OPTIONS',
    headers: { origin: UNTRUSTED_ORIGIN }
  }), env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://gnk-asg.hr');
  assert.notEqual(response.headers.get('access-control-allow-origin'), '*');
});

check('admin list rejects missing operator token', async () => {
  const response = await worker.fetch(request('/api/pdf-publications/admin'), env);
  const body = await jsonBody(response);
  assert.equal(response.status, 401);
  assert.equal(body.error, 'unauthorized');
});

check('upload rejects non-PDF content', async () => {
  const form = pdfForm({ file: new File(['plain text'], 'document.txt', { type: 'text/plain' }) });
  const response = await worker.fetch(request('/api/pdf-publications/upload', {
    method: 'POST',
    headers: { 'x-operator-token': TOKEN },
    body: form
  }), env);
  const body = await jsonBody(response);
  assert.equal(response.status, 400);
  assert.equal(body.error, 'pdf_only');
});

check('upload rejects short title or summary', async () => {
  const response = await worker.fetch(request('/api/pdf-publications/upload', {
    method: 'POST',
    headers: { 'x-operator-token': TOKEN },
    body: pdfForm({ title: 'Bad', summary: 'Too short' })
  }), env);
  const body = await jsonBody(response);
  assert.equal(response.status, 400);
  assert.equal(body.error, 'title_or_summary_too_short');
});

check('upload rejects unsupported language', async () => {
  const response = await worker.fetch(request('/api/pdf-publications/upload', {
    method: 'POST',
    headers: { 'x-operator-token': TOKEN },
    body: pdfForm({ lang: 'de' })
  }), env);
  const body = await jsonBody(response);
  assert.equal(response.status, 400);
  assert.equal(body.error, 'invalid_language');
});

check('authorized draft upload writes both KV and R2', async () => {
  const response = await worker.fetch(request('/api/pdf-publications/upload', {
    method: 'POST',
    headers: { 'x-operator-token': TOKEN },
    body: pdfForm({ status: 'draft' })
  }), env);
  const body = await jsonBody(response);
  assert.equal(response.status, 201);
  assert.equal(body.ok, true);
  assert.equal(body.preview, true);
  assert.equal(body.record.status, 'draft');
  assert.equal(body.record.author, 'Nermin Sefić');
  assert.match(body.record.r2Key, /^preview\/pdf-publications\/\d{4}\/\d{2}\/pdf-/);
  assert.equal(r2.objects.has(body.record.r2Key), true);
  assert.equal(kv.values.has(`preview:pdf-publication:${body.record.id}`), true);
  assert.equal(kv.values.has(INDEX_KEY), true);
  draftRecord = body.record;
});

check('public list excludes draft records', async () => {
  const response = await worker.fetch(request('/api/pdf-publications'), env);
  const body = await jsonBody(response);
  assert.equal(response.status, 200);
  assert.deepEqual(body.items, []);
});

check('authorized published upload becomes publicly visible', async () => {
  const response = await worker.fetch(request('/api/pdf-publications/upload', {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}` },
    body: pdfForm({
      status: 'published',
      lang: 'en',
      title: 'GNK ASG published PDF verification',
      summary: 'This published preview record verifies public listing and controlled file retrieval.'
    })
  }), env);
  const body = await jsonBody(response);
  assert.equal(response.status, 201);
  assert.equal(body.record.status, 'published');
  assert.equal(body.record.lang, 'en');
  assert.ok(body.record.publishedAt);
  publishedRecord = body.record;

  const listResponse = await worker.fetch(request('/api/pdf-publications'), env);
  const listBody = await jsonBody(listResponse);
  assert.equal(listBody.items.length, 1);
  assert.equal(listBody.items[0].id, publishedRecord.id);
  assert.equal(listBody.items.some(item => item.id === draftRecord.id), false);
});

check('protected admin list includes draft and published records', async () => {
  const response = await worker.fetch(request('/api/pdf-publications/admin', {
    headers: { authorization: `Bearer ${TOKEN}` }
  }), env);
  const body = await jsonBody(response);
  assert.equal(response.status, 200);
  assert.equal(body.items.length, 2);
  assert.deepEqual(new Set(body.items.map(item => item.status)), new Set(['draft', 'published']));
});

check('published PDF file is returned with secure metadata', async () => {
  const response = await worker.fetch(request(`/files/${publishedRecord.id}.pdf`), env);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.match(response.headers.get('content-disposition') || '', /^inline; filename=/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('cache-control'), 'public,max-age=300');
  assert.ok(response.headers.get('etag'));
  assert.equal(response.headers.get('access-control-allow-origin'), ALLOWED_ORIGIN);
  assert.deepEqual(bytes, PDF_BYTES);
});

check('unknown PDF file returns not_found without leaking storage details', async () => {
  const response = await worker.fetch(request('/files/pdf-does-not-exist.pdf'), env);
  const body = await jsonBody(response);
  assert.equal(response.status, 404);
  assert.equal(body.error, 'not_found');
});

let passed = 0;
const failures = [];
try {
  for (const item of checks) {
    try {
      await item.fn();
      passed += 1;
      console.log(`PASS ${item.name}`);
    } catch (error) {
      failures.push({ name: item.name, error: String(error?.stack || error) });
      console.error(`FAIL ${item.name}`);
    }
  }
} finally {
  await cleanup();
}

const report = {
  suite: 'GNK ASG PDF Publisher E2E smoke',
  generatedAt: new Date().toISOString(),
  sourceMode: 'actual worker source copied to isolated ESM temp directory',
  productionNetworkCalls: 0,
  productionWrites: 0,
  fakeKvWrites: kv.putCalls.length,
  fakeR2Writes: r2.putCalls.length,
  total: checks.length,
  passed,
  failed: failures.length,
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  failures
};

await mkdir(REPORT_ROOT, { recursive: true });
await writeFile(path.join(REPORT_ROOT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(path.join(REPORT_ROOT, 'summary.md'), [
  '# GNK ASG PDF Publisher E2E smoke',
  '',
  `- Status: ${report.status}`,
  `- Passed: ${passed}/${checks.length}`,
  `- Production network calls: ${report.productionNetworkCalls}`,
  `- Production writes: ${report.productionWrites}`,
  `- Fake KV writes: ${report.fakeKvWrites}`,
  `- Fake R2 writes: ${report.fakeR2Writes}`,
  '- Scope: status, CORS, authorization, validation, draft/public filtering, KV/R2 storage and PDF retrieval.',
  ''
].join('\n'), 'utf8');

console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
