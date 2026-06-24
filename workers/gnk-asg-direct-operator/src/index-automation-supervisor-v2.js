import app from './index-automation-supervisor-v1.js';

const VERSION = 'GNK_ASG_AUTOMATION_SUPERVISOR_V2';
const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
    'x-gnk-asg-automation-supervisor': VERSION,
    'x-content-type-options': 'nosniff'
  }
});

const store = env => env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || null;
const text = value => String(value || '').trim();
const nowIso = () => new Date().toISOString();

function token(request) {
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  return text(
    (bearer && bearer[1]) ||
    request.headers.get('x-operator-token') ||
    request.headers.get('x-admin-token') ||
    request.headers.get('x-news-publish-token') ||
    request.headers.get('x-gnk-asg-token')
  );
}

function authorized(request, env) {
  const supplied = token(request);
  const allowed = [
    env.GNK_ASG_OPERATOR_TOKEN,
    env.OPERATOR_TOKEN,
    env.GNK_ASG_ADMIN_TOKEN,
    env.ADMIN_TOKEN,
    env.NEWS_PUBLISH_TOKEN
  ].map(text).filter(Boolean);
  return Boolean(supplied && allowed.includes(supplied));
}

async function writeJson(env, key, value) {
  const kv = store(env);
  if (!kv) return false;
  await kv.put(key, JSON.stringify(value, null, 2));
  return true;
}

async function parse(response) {
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    return { ok: false, error: 'invalid_json_response', raw: raw.slice(0, 500) };
  }
}

async function handle(request, env, ctx) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';

  if (path === '/operator/automation-supervisor/run') {
    if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
    if (!authorized(request, env)) return json({ ok: false, error: 'authorization_required' }, 401);

    const startedAt = nowIso();
    const upstreamResponse = await app.fetch(request, env, ctx);
    const upstream = await parse(upstreamResponse);

    const criticalActionsOk = [
      upstream?.actions?.refreshAll,
      upstream?.actions?.refreshExternalNews,
      upstream?.actions?.autoEditor,
      upstream?.actions?.contentQuality
    ].filter(Boolean).every(action => action?.ok !== false);

    if (criticalActionsOk) {
      await writeJson(env, 'automation:scheduled:last', {
        ok: true,
        version: VERSION,
        mode: 'manual_supervisor_repair',
        startedAt,
        finishedAt: nowIso(),
        cron: 'manual'
      });
    }

    const healthRequest = new Request(new URL('/data/automation-health.json', request.url), {
      method: 'GET',
      headers: request.headers
    });
    const health = await parse(await app.fetch(healthRequest, env, ctx));
    const result = {
      ok: criticalActionsOk && health?.healthy === true,
      version: VERSION,
      startedAt,
      finishedAt: nowIso(),
      upstream,
      health
    };
    await writeJson(env, 'automation:supervisor:v2:last', result);
    return json(result, result.ok ? 200 : 503);
  }

  return app.fetch(request, env, ctx);
}

export default {
  fetch: handle,
  async scheduled(event, env, ctx) {
    if (typeof app.scheduled === 'function') return app.scheduled(event, env, ctx);
  },
  async email(message, env, ctx) {
    if (typeof app.email === 'function') return app.email(message, env, ctx);
  }
};
