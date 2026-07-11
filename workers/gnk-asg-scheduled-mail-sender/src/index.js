// GNK_ASG_SCHEDULED_MAIL_SENDER_V1
// Izoliran worker. NE dira postojeci gnk-asg-direct-operator cron
// (koji ostaje iskljucivo email-status-sync). Ovaj worker ima vlastiti
// cron (svakih 5 minuta) i salje iskljucivo preko postojeceg
// /api/admin-mail-send endpointa - ne zaobilazi mandatory BCC,
// potpis ni audit log koji taj endpoint vec primjenjuje.
//
// API:
//   POST /api/mail-schedule        - spremi zakazano slanje
//   GET  /api/mail-schedule/list   - popis zakazanih (i poslanih/otkazanih)
//   POST /api/mail-schedule/cancel - otkazi zakazano slanje prije slanja
//
// Svi endpointi zahtijevaju istu operator-auth sesiju kao Mail Studio.

const clean = v => String(v ?? '').trim();
const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

function kv(env) { return env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || null; }
const LIST_KEY = 'mail:scheduled:list';
const ITEM_KEY = id => `mail:scheduled:item:${id}`;

async function isAuthenticated(request, env) {
  try {
    const target = new URL('/api/operator-auth-check', request.url);
    const res = await fetch(target.toString(), { headers: request.headers });
    return res.ok;
  } catch { return false; }
}

async function readList(env) {
  const store = kv(env);
  if (!store) return [];
  const raw = await store.get(LIST_KEY);
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
}
async function writeList(env, list) {
  const store = kv(env);
  if (!store) return;
  await store.put(LIST_KEY, JSON.stringify(list.slice(0, 500)));
}

async function scheduleSend(request, env) {
  const body = await request.json().catch(() => ({}));
  const sendAt = clean(body.sendAt); // ISO 8601, npr. 2026-07-15T09:00:00+02:00
  const sendAtDate = new Date(sendAt);
  if (!sendAt || Number.isNaN(sendAtDate.getTime())) {
    return json({ ok: false, error: 'invalid_send_at' }, 400);
  }
  if (sendAtDate.getTime() <= Date.now()) {
    return json({ ok: false, error: 'send_at_must_be_future' }, 400);
  }
  const id = crypto.randomUUID();
  const entry = {
    id,
    status: 'scheduled',
    sendAt,
    createdAt: new Date().toISOString(),
    payload: {
      profile: clean(body.profile) || 'general',
      to: body.to, cc: body.cc, bcc: body.bcc,
      subject: clean(body.subject),
      text: body.text, html: body.html,
      attachments: body.attachments || []
    }
  };
  const store = kv(env);
  if (!store) return json({ ok: false, error: 'kv_not_configured' }, 503);
  await store.put(ITEM_KEY(id), JSON.stringify(entry));
  const list = await readList(env);
  list.unshift({ id, status: 'scheduled', sendAt, subject: entry.payload.subject, createdAt: entry.createdAt });
  await writeList(env, list);
  return json({ ok: true, scheduled: { id, sendAt, subject: entry.payload.subject } });
}

async function listScheduled(env) {
  const list = await readList(env);
  return json({ ok: true, items: list });
}

async function cancelScheduled(request, env) {
  const body = await request.json().catch(() => ({}));
  const id = clean(body.id);
  if (!id) return json({ ok: false, error: 'missing_id' }, 400);
  const store = kv(env);
  if (!store) return json({ ok: false, error: 'kv_not_configured' }, 503);
  const raw = await store.get(ITEM_KEY(id));
  if (!raw) return json({ ok: false, error: 'not_found' }, 404);
  const entry = JSON.parse(raw);
  if (entry.status !== 'scheduled') return json({ ok: false, error: 'already_processed' }, 409);
  entry.status = 'cancelled';
  await store.put(ITEM_KEY(id), JSON.stringify(entry));
  const list = await readList(env);
  const updated = list.map(item => item.id === id ? { ...item, status: 'cancelled' } : item);
  await writeList(env, updated);
  return json({ ok: true });
}

async function processDueSends(env) {
  const store = kv(env);
  if (!store) return { processed: 0 };
  const list = await readList(env);
  const now = Date.now();
  let processed = 0;
  for (const item of list) {
    if (item.status !== 'scheduled') continue;
    if (new Date(item.sendAt).getTime() > now) continue;
    const raw = await store.get(ITEM_KEY(item.id));
    if (!raw) continue;
    const entry = JSON.parse(raw);
    if (entry.status !== 'scheduled') continue;
    try {
      const internal = new Request('https://mail-studio.internal/api/admin-mail-send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...entry.payload, confirm: 'SEND_MAIL' })
      });
      const { handleManualMailService } = await import('../../gnk-asg-direct-operator/src/manual-mail-service-v1.js');
      const response = await handleManualMailService(internal, env);
      const result = await response.json().catch(() => ({}));
      entry.status = result && result.ok ? 'sent' : 'failed';
      entry.processedAt = new Date().toISOString();
      entry.result = result;
    } catch (error) {
      entry.status = 'failed';
      entry.processedAt = new Date().toISOString();
      entry.error = String(error && error.message || error);
    }
    await store.put(ITEM_KEY(item.id), JSON.stringify(entry));
    processed += 1;
  }
  if (processed) {
    const updatedList = await readList(env);
    const freshItems = await Promise.all(updatedList.map(async i => {
      const raw = await store.get(ITEM_KEY(i.id));
      if (!raw) return i;
      const e = JSON.parse(raw);
      return { ...i, status: e.status };
    }));
    await writeList(env, freshItems);
  }
  return { processed };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
    if (!await isAuthenticated(request, env)) {
      return json({ ok: false, error: 'unauthorized', message: 'Operator/admin session required.' }, 401);
    }
    if (path === '/api/mail-schedule' && request.method === 'POST') return scheduleSend(request, env);
    if (path === '/api/mail-schedule/list' && request.method === 'GET') return listScheduled(env);
    if (path === '/api/mail-schedule/cancel' && request.method === 'POST') return cancelScheduled(request, env);
    return json({ ok: false, error: 'not_found' }, 404);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(processDueSends(env));
  }
};
