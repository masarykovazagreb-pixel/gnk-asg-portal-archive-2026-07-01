import { AUTO_EDITOR_KEYS, generateEditorialDraft } from './pipeline.js';
import { AUTO_EDITOR_SCHEDULE, editorialSlot, runEditorialSchedule } from './schedule.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers() });

    if (request.method === 'GET' && path === '/__preview/auto-editor/status') {
      const store = storage(env);
      const drafts = store ? await readJson(store, AUTO_EDITOR_KEYS.drafts, []) : [];
      return json({
        ok: true,
        service: 'GNK ASG Auto Editor V2 Preview',
        previewOnly: true,
        productionRouteConfigured: false,
        writesEnabled: writesEnabled(env),
        storageAvailable: Boolean(store),
        aiAvailable: Boolean(env.AI?.run),
        mode: 'draft_first',
        autoPublish: false,
        schedule: AUTO_EDITOR_SCHEDULE,
        currentSlot: editorialSlot(new Date()),
        draftCount: Array.isArray(drafts) ? drafts.length : 0
      });
    }

    if (request.method === 'GET' && path === '/__preview/auto-editor/drafts') {
      if (!authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
      const store = storage(env);
      if (!store) return json({ ok: false, error: 'preview_storage_missing' }, 503);
      return json({
        ok: true,
        items: await readJson(store, AUTO_EDITOR_KEYS.drafts, []),
        published: false
      });
    }

    if (request.method === 'POST' && path === '/__preview/auto-editor/run-draft') {
      if (!authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
      if (!writesEnabled(env)) {
        return json({
          ok: false,
          error: 'preview_writes_locked',
          message: 'Auto Editor upisi nisu uključeni u preview okruženju.'
        }, 423);
      }
      if (!storage(env)) return json({ ok: false, error: 'preview_storage_missing' }, 503);
      if (!env.AI?.run) return json({ ok: false, error: 'preview_ai_binding_missing' }, 503);
      return json(await generateEditorialDraft(env, { now: new Date(), slot: 'manual-preview' }));
    }

    return json({ ok: false, error: 'not_found', path }, 404);
  },

  async scheduled(event, env, ctx) {
    if (!writesEnabled(env) || !storage(env) || !env.AI?.run) return;
    const task = runEditorialSchedule({
      env,
      now: new Date(event?.scheduledTime || Date.now()),
      execute: ({ slot, now }) => generateEditorialDraft(env, { slot, now })
    });
    if (ctx?.waitUntil) ctx.waitUntil(task);
    else await task;
  }
};

function writesEnabled(env) {
  return String(env.AUTO_EDITOR_PREVIEW_WRITE || '').toLowerCase() === 'true';
}

function storage(env = {}) {
  return env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || env.CONTENT_KV || null;
}

function authorized(request, env) {
  const expected = env.OPERATOR_TOKEN || env.GNK_ASG_OPERATOR_TOKEN || '';
  if (!expected) return false;
  const bearer = request.headers.get('authorization') || '';
  const supplied = request.headers.get('x-operator-token') || bearer.replace(/^Bearer\s+/i, '');
  return supplied === expected;
}

async function readJson(store, key, fallback) {
  try {
    const raw = await store.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function headers() {
  return {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': 'https://gnk-asg-business-light-preview.beckuphome.workers.dev',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-operator-token',
    'x-gnk-asg-preview': 'true',
    'x-gnk-asg-production-changed': 'false'
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: headers()
  });
}
