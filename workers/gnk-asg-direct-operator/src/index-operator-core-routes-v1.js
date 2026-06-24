import app from './index-auto-editor-quality-bridge-v1.js';

const VERSION = 'GNK_ASG_OPERATOR_CORE_ROUTES_V1';
const OPERATOR_PATHS = new Set([
  '/operator/system-health',
  '/operator/status',
  '/operator/logs',
  '/operator/contact-inbox'
]);

const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
    'x-content-type-options': 'nosniff',
    'x-gnk-asg-operator-core': VERSION
  }
});

const text = value => String(value || '').trim();
const store = env => env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || null;
const nowIso = () => new Date().toISOString();

function suppliedToken(request) {
  const direct = text(request.headers.get('x-operator-token'));
  if (direct) return direct;

  const authorization = text(request.headers.get('authorization'));
  if (/^Bearer\s+/i.test(authorization)) {
    return authorization.replace(/^Bearer\s+/i, '').trim();
  }

  return '';
}

function isAuthorized(request, env) {
  const supplied = suppliedToken(request);
  if (!supplied) return false;

  const expected = [
    text(env.GNK_ASG_OPERATOR_TOKEN),
    text(env.OPERATOR_TOKEN)
  ].filter(Boolean);

  return expected.some(value => value === supplied);
}

async function readJson(env, key, fallback = null) {
  const kv = store(env);
  if (!kv) return fallback;

  try {
    const raw = await kv.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function systemHealth(request, env, ctx) {
  let publicStatus = {
    ok: false,
    http: 0
  };

  try {
    const statusUrl = new URL('/data/status.json', request.url);
    const response = await app.fetch(new Request(statusUrl.toString(), {
      method: 'GET',
      headers: {
        accept: 'application/json'
      }
    }), env, ctx);

    publicStatus = {
      ok: response.ok,
      http: response.status
    };
  } catch (error) {
    publicStatus = {
      ok: false,
      http: 0,
      error: text(error?.message || error)
    };
  }

  return json({
    ok: true,
    version: VERSION,
    checkedAt: nowIso(),
    environment: text(env.PUBLIC_ENVIRONMENT || 'direct-operator'),
    bindings: {
      primaryKv: Boolean(env.GNK_ASG_KV),
      configKv: Boolean(env.GNK_ASG_CONFIG_KV),
      d1: Boolean(env.GNK_ASG_D1),
      r2: Boolean(env.GNK_ASG_MEDIA_ASSETS),
      ai: Boolean(env.AI),
      assets: Boolean(env.ASSETS),
      email: Boolean(env.EMAIL)
    },
    publicStatus
  });
}

async function operatorStatus(env) {
  const keys = [
    'automation:quality-bridge:scheduled:last',
    'automation:scheduled:last',
    'auto-editor:last',
    'automation:news:last',
    'news:status',
    'market:status',
    'daily-market-brief:latest',
    'content-quality:last'
  ];

  const states = {};

  for (const key of keys) {
    states[key] = await readJson(env, key, null);
  }

  return json({
    ok: true,
    version: VERSION,
    checkedAt: nowIso(),
    states
  });
}

async function operatorLogs(env) {
  const db = env.GNK_ASG_D1;

  if (!db) {
    return json({
      ok: false,
      version: VERSION,
      error: 'd1_binding_missing'
    }, 503);
  }

  const tablesResult = await db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all();

  const tableNames = (tablesResult.results || [])
    .map(row => text(row.name))
    .filter(name => /^[A-Za-z0-9_]+$/.test(name))
    .slice(0, 10);

  const tables = [];

  for (const table of tableNames) {
    let rows = [];

    try {
      const result = await db.prepare(
        `SELECT * FROM "${table}" ORDER BY rowid DESC LIMIT 50`
      ).all();

      rows = result.results || [];
    } catch {
      try {
        const result = await db.prepare(
          `SELECT * FROM "${table}" LIMIT 50`
        ).all();

        rows = result.results || [];
      } catch {
        rows = [];
      }
    }

    tables.push({
      name: table,
      rowCount: rows.length,
      rows
    });
  }

  return json({
    ok: true,
    version: VERSION,
    checkedAt: nowIso(),
    tables
  });
}

async function contactInbox(env) {
  const kv = store(env);

  if (!kv) {
    return json({
      ok: false,
      version: VERSION,
      error: 'kv_binding_missing'
    }, 503);
  }

  const prefixes = [
    'contact-',
    'contact:',
    'contact_',
    'inbox:contact'
  ];

  const names = new Set();

  for (const prefix of prefixes) {
    let cursor = undefined;
    let complete = false;

    while (!complete && names.size < 200) {
      const page = await kv.list({
        prefix,
        limit: 100,
        cursor
      });

      for (const key of page.keys || []) {
        names.add(key.name);
        if (names.size >= 200) break;
      }

      complete = Boolean(page.list_complete);
      cursor = page.cursor;

      if (!cursor) complete = true;
    }
  }

  const items = [];

  for (const name of names) {
    const raw = await kv.get(name);
    let value = raw;

    try {
      value = raw ? JSON.parse(raw) : null;
    } catch {}

    items.push({
      key: name,
      value
    });
  }

  items.sort((a, b) => {
    const av = a.value || {};
    const bv = b.value || {};
    const ad = Date.parse(av.createdAt || av.receivedAt || av.timestamp || '') || 0;
    const bd = Date.parse(bv.createdAt || bv.receivedAt || bv.timestamp || '') || 0;
    return bd - ad;
  });

  return json({
    ok: true,
    version: VERSION,
    checkedAt: nowIso(),
    count: items.length,
    items
  });
}

async function handle(request, env, ctx) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';

  if (!OPERATOR_PATHS.has(path)) {
    return app.fetch(request, env, ctx);
  }

  if (!isAuthorized(request, env)) {
    return json({
      ok: false,
      version: VERSION,
      error: 'unauthorized'
    }, 401);
  }

  if (path === '/operator/system-health') {
    return systemHealth(request, env, ctx);
  }

  if (path === '/operator/status') {
    return operatorStatus(env);
  }

  if (path === '/operator/logs') {
    return operatorLogs(env);
  }

  if (path === '/operator/contact-inbox') {
    return contactInbox(env);
  }

  return json({
    ok: false,
    version: VERSION,
    error: 'not_found'
  }, 404);
}

export default {
  fetch: handle,

  async scheduled(event, env, ctx) {
    if (typeof app.scheduled === 'function') {
      return app.scheduled(event, env, ctx);
    }
  },

  async email(message, env, ctx) {
    if (typeof app.email === 'function') {
      return app.email(message, env, ctx);
    }
  }
};