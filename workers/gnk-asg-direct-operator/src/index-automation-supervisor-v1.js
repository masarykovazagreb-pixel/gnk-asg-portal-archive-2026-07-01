import app from './index-article-repair-v1.js';

const VERSION = 'GNK_ASG_AUTOMATION_SUPERVISOR_V1';
const NEWS_MAX_AGE_MINUTES = 90;
const MARKET_MAX_AGE_MINUTES = 90;
const SCHEDULE_MAX_AGE_MINUTES = 90;
const AUTO_EDITOR_MAX_AGE_MINUTES = 240;
const QUALITY_MAX_AGE_MINUTES = 180;

const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
    'x-gnk-asg-automation-supervisor': VERSION,
    'x-content-type-options': 'nosniff'
  }
});

const nowIso = () => new Date().toISOString();
const store = env => env.GNK_ASG_KV || env.GNK_ASG_CONFIG_KV || null;
const text = value => String(value || '').trim();

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

async function writeJson(env, key, value) {
  const kv = store(env);
  if (!kv) return false;
  await kv.put(key, JSON.stringify(value, null, 2));
  return true;
}

async function readList(env, key) {
  const value = await readJson(env, key, []);
  return Array.isArray(value) ? value : [];
}

function timestamp(value) {
  const raw = value?.finishedAt || value?.updatedAt || value?.publishedAt || value?.published_at || value?.startedAt || '';
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ageMinutes(value) {
  const parsed = typeof value === 'number' ? value : timestamp(value);
  if (!parsed) return null;
  return Math.max(0, Math.round((Date.now() - parsed) / 60000));
}

function tokenFromRequest(request) {
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

function operatorSecrets(env) {
  return [
    env.GNK_ASG_OPERATOR_TOKEN,
    env.OPERATOR_TOKEN,
    env.GNK_ASG_ADMIN_TOKEN,
    env.ADMIN_TOKEN,
    env.NEWS_PUBLISH_TOKEN
  ].map(text).filter(Boolean);
}

function authorized(request, env) {
  const supplied = tokenFromRequest(request);
  return Boolean(supplied && operatorSecrets(env).includes(supplied));
}

function internalToken(env) {
  return operatorSecrets(env)[0] || '';
}

async function internalPost(env, path, body = {}) {
  const token = internalToken(env);
  if (!token) return { ok: false, error: 'operator_token_missing', path };

  try {
    const response = await app.fetch(new Request(`https://gnk-asg.hr${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-operator-token': token
      },
      body: JSON.stringify(body)
    }), env, {});

    const raw = await response.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { ok: false, error: 'invalid_json_response', raw: raw.slice(0, 500) };
    }

    return {
      ...data,
      httpStatus: response.status,
      path,
      ok: response.ok && data?.ok !== false
    };
  } catch (error) {
    return { ok: false, error: text(error?.message || error), path };
  }
}

function moduleState(name, value, maxAgeMinutes, extra = {}) {
  const age = ageMinutes(value);
  const fresh = age !== null && age <= maxAgeMinutes;
  const successful = value?.ok !== false && !value?.error;
  return {
    name,
    healthy: Boolean(value && fresh && successful),
    fresh,
    successful,
    ageMinutes: age,
    maxAgeMinutes,
    updatedAt: value?.finishedAt || value?.updatedAt || value?.publishedAt || null,
    error: value?.error || null,
    ...extra
  };
}

async function snapshot(env) {
  const [
    lastNewsRefresh,
    lastAutoEditor,
    lastScheduledRun,
    lastPublicationV2,
    lastQuality,
    lastImage,
    lastSupervisor,
    updateStatus,
    market,
    externalNews,
    approved,
    articleItems,
    editorHistory
  ] = await Promise.all([
    readJson(env, 'automation:news-refresh:last'),
    readJson(env, 'auto-editor:last'),
    readJson(env, 'automation:scheduled:last'),
    readJson(env, 'automation:publication-v2:last'),
    readJson(env, 'quality:publications:last'),
    readJson(env, 'automation:image-selection:last'),
    readJson(env, 'automation:supervisor:last'),
    readJson(env, 'data:update_status.json'),
    readJson(env, 'data:market.json'),
    readJson(env, 'data:news:external'),
    readList(env, 'publish:approved'),
    readList(env, 'data:articles:items'),
    readList(env, 'auto-editor:history')
  ]);

  const latestArticle = approved
    .map(item => ({
      id: item?.id || null,
      slug: item?.slug || null,
      titleHr: item?.titleHr || item?.title || null,
      titleEn: item?.titleEn || null,
      publishedAt: item?.publishedAt || item?.published_at || null,
      wordCountHr: item?.wordCountHr ?? null,
      wordCountEn: item?.wordCountEn ?? null,
      author: item?.author || null,
      image: item?.image || null,
      sources: Array.isArray(item?.sources) ? item.sources.length : 0
    }))
    .sort((a, b) => Date.parse(b.publishedAt || 0) - Date.parse(a.publishedAt || 0))[0] || null;

  const modules = {
    scheduled: moduleState('scheduled', lastScheduledRun, SCHEDULE_MAX_AGE_MINUTES),
    news: moduleState('news', lastNewsRefresh, NEWS_MAX_AGE_MINUTES, {
      itemCount: Number(externalNews?.count || externalNews?.items?.length || 0),
      status: externalNews?.status || null
    }),
    market: moduleState('market', market, MARKET_MAX_AGE_MINUTES, {
      status: market?.status || null,
      cryptoCount: Array.isArray(market?.crypto) ? market.crypto.length : 0,
      fxStatus: market?.fx?.status || null
    }),
    autoEditor: moduleState('autoEditor', lastAutoEditor, AUTO_EDITOR_MAX_AGE_MINUTES, {
      articleId: lastAutoEditor?.article?.id || null,
      articleSlug: lastAutoEditor?.article?.slug || null,
      wordCountHr: lastAutoEditor?.article?.wordCountHr ?? null,
      wordCountEn: lastAutoEditor?.article?.wordCountEn ?? null
    }),
    contentQuality: moduleState('contentQuality', lastQuality, QUALITY_MAX_AGE_MINUTES, {
      removedCount: lastQuality?.removedCount ?? null,
      quarantineCount: lastQuality?.quarantineCount ?? null
    }),
    imageRotation: {
      name: 'imageRotation',
      healthy: approved.length === 0 || Boolean(latestArticle?.image),
      updatedAt: lastImage?.finishedAt || null,
      articleId: lastImage?.articleId || null,
      image: lastImage?.image || null,
      error: lastImage?.error || null
    }
  };

  const required = ['scheduled', 'news', 'market', 'autoEditor', 'contentQuality'];
  const healthy = required.every(key => modules[key].healthy) && modules.imageRotation.healthy;

  return {
    ok: true,
    healthy,
    version: VERSION,
    checkedAt: nowIso(),
    schedule: {
      cron: '0 * * * *',
      newsRefresh: 'hourly',
      marketRefresh: 'hourly',
      autoEditor: 'every 3 hours with stale-run recovery after 4 hours',
      contentQuality: 'hourly',
      imageRotation: 'after each successful automatic publication'
    },
    modules,
    publicationData: {
      approvedCount: approved.length,
      articleItemsCount: articleItems.length,
      editorHistoryCount: editorHistory.length,
      latestArticle
    },
    updateStatus,
    lastPublicationV2,
    lastSupervisor
  };
}

async function repair(env, { forceAutoEditor = false } = {}) {
  const startedAt = nowIso();
  const before = await snapshot(env);
  const actions = {};

  actions.refreshAll = await internalPost(env, '/operator/refresh-all');
  actions.refreshExternalNews = await internalPost(env, '/operator/news-refresh');

  if (forceAutoEditor || !before.modules.autoEditor.healthy) {
    actions.autoEditor = await internalPost(env, '/operator/auto-editor/run');
  } else {
    actions.autoEditor = { ok: true, skipped: true, reason: 'auto_editor_fresh' };
  }

  actions.contentQuality = await internalPost(env, '/operator/content-quality/run');

  const after = await snapshot(env);
  const result = {
    ok: after.healthy,
    version: VERSION,
    startedAt,
    finishedAt: nowIso(),
    forceAutoEditor,
    before,
    actions,
    after
  };
  await writeJson(env, 'automation:supervisor:last', result);
  return result;
}

function compatibilityPayload(path, market) {
  const updatedAt = market?.updatedAt || nowIso();
  const base = {
    ok: true,
    updatedAt,
    source: VERSION,
    disclaimer: 'Podatci su informativni, mogu kasniti i nisu financijski savjet.'
  };

  if (path === '/data/market-indices.json') {
    return { ...base, status: 'UNAVAILABLE', items: [], message: 'Vanjski izvor tržišnih indeksa još nije povezan; sustav ne prikazuje izmišljene vrijednosti.' };
  }
  if (path === '/data/exchanges.json') {
    return { ...base, status: 'UNAVAILABLE', items: [], message: 'Usporedni izvor burzi još nije povezan; sustav ne prikazuje izmišljene vrijednosti.' };
  }
  if (path === '/data/stablecoins.json') {
    return { ...base, status: 'UNAVAILABLE', items: [], message: 'Poseban stablecoin izvor još nije povezan; sustav ne prikazuje izmišljene vrijednosti.' };
  }
  return {
    ...base,
    status: market?.status || 'FALLBACK',
    marketUpdatedAt: market?.updatedAt || null,
    crypto: Array.isArray(market?.crypto)
      ? market.crypto.map(item => ({
          symbol: item?.symbol || null,
          priceEur: item?.priceEur ?? null,
          change24hEur: item?.change24hEur ?? null,
          status: item?.status || market?.status || 'FALLBACK'
        }))
      : [],
    fx: market?.fx || null,
    commodities: market?.commodities || [],
    summary: 'Automatski dnevni tehnički pregled dostupnih tržišnih podataka. Ovo nije investicijska preporuka.'
  };
}

async function handle(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === '/data/automation-health.json' || path === '/data/status.json') {
    return json(await snapshot(env));
  }

  if (
    path === '/data/market-indices.json' ||
    path === '/data/exchanges.json' ||
    path === '/data/stablecoins.json' ||
    path === '/data/daily-market-brief.json'
  ) {
    return json(compatibilityPayload(path, await readJson(env, 'data:market.json')));
  }

  if (path === '/operator/automation-supervisor/status') {
    if (!authorized(request, env)) return json({ ok: false, error: 'authorization_required' }, 401);
    return json(await snapshot(env));
  }

  if (path === '/operator/automation-supervisor/run') {
    if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
    if (!authorized(request, env)) return json({ ok: false, error: 'authorization_required' }, 401);
    let body = {};
    try { body = await request.json(); } catch {}
    const result = await repair(env, { forceAutoEditor: body?.forceAutoEditor === true });
    return json(result, result.ok ? 200 : 503);
  }

  return app.fetch(request, env, ctx);
}

export default {
  fetch: handle,

  async scheduled(event, env, ctx) {
    const task = (async () => {
      const startedAt = nowIso();
      let upstream = null;
      let upstreamError = null;
      try {
        upstream = typeof app.scheduled === 'function'
          ? await app.scheduled(event, env, {})
          : null;
      } catch (error) {
        upstreamError = text(error?.message || error);
      }

      const beforeRecovery = await snapshot(env);
      let recovery = null;
      if (!beforeRecovery.healthy) {
        recovery = await repair(env, { forceAutoEditor: false });
      }

      const result = {
        ok: !upstreamError && (recovery ? recovery.ok : beforeRecovery.healthy),
        version: VERSION,
        cron: event?.cron || '',
        startedAt,
        finishedAt: nowIso(),
        upstream,
        upstreamError,
        beforeRecovery,
        recovery
      };
      await writeJson(env, 'automation:supervisor:scheduled:last', result);
      return result;
    })();

    if (ctx?.waitUntil) {
      ctx.waitUntil(task);
      return;
    }
    return task;
  },

  async email(message, env, ctx) {
    if (typeof app.email === 'function') return app.email(message, env, ctx);
  }
};
