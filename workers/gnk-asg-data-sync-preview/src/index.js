import { runScheduledDataSync } from './schedule.js';
import {
  DATA_KEYS,
  readSnapshot,
  readUpdateStatus,
  refreshNews
} from './refresh.js';
import { refreshMarketWithPublicFallbacks } from './public-market-fallbacks.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: baseHeaders() });

    if (request.method === 'GET' && path === '/__preview/data-sync/status') {
      return json({
        ok: true,
        service: 'GNK ASG Data Sync V2 Preview',
        previewOnly: true,
        productionRouteConfigured: false,
        writesEnabled: writesEnabled(env),
        storageAvailable: Boolean(storage(env)),
        timeZone: 'Europe/Zagreb',
        newsLocalTimes: ['09:00', '16:00'],
        marketIntervalMinutes: 15,
        publicFallbackProviders: ['CoinPaprika'],
        status: await readUpdateStatus(env)
      });
    }

    if (request.method === 'GET' && (path === '/data/news.json' || path === '/data/business-news.json')) {
      return json(await readSnapshot(env, DATA_KEYS.news, { liveMinutes: 480, delayedMinutes: 960 }));
    }
    if (request.method === 'GET' && (path === '/data/market.json' || path === '/data/digital-assets.json')) {
      return json(await readSnapshot(env, DATA_KEYS.market, { liveMinutes: 20, delayedMinutes: 90 }));
    }
    if (request.method === 'GET' && (path === '/data/btc_chart.json' || path === '/data/btc-chart.json')) {
      return json(await readSnapshot(env, DATA_KEYS.btcChart, { liveMinutes: 20, delayedMinutes: 90 }));
    }
    if (request.method === 'GET' && (path === '/data/update_status.json' || path === '/backend-status')) {
      return json(await readUpdateStatus(env));
    }

    if (request.method === 'POST' && path.startsWith('/__preview/data-sync/run-')) {
      if (!authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);
      if (!writesEnabled(env)) {
        return json({
          ok: false,
          error: 'preview_writes_locked',
          message: 'Data sync upisi nisu uključeni u preview okruženju.'
        }, 423);
      }
      if (!storage(env)) return json({ ok: false, error: 'preview_storage_missing' }, 503);

      const task = path.split('/').pop();
      if (task === 'run-news') return json(await refreshNews(env));
      if (task === 'run-market') return json(await refreshMarketWithPublicFallbacks(env));
      if (task === 'run-all') {
        const market = await refreshMarketWithPublicFallbacks(env);
        const news = await refreshNews(env);
        return json({ ok: market.ok !== false && news.ok !== false, market, news });
      }
    }

    return json({ ok: false, error: 'not_found', path }, 404);
  },

  async scheduled(event, env, ctx) {
    if (!writesEnabled(env) || !storage(env)) return;
    const task = runScheduledDataSync({
      env,
      now: new Date(event?.scheduledTime || Date.now()),
      refreshNews: () => refreshNews(env),
      refreshMarket: () => refreshMarketWithPublicFallbacks(env)
    });
    if (ctx?.waitUntil) ctx.waitUntil(task);
    else await task;
  }
};

function writesEnabled(env) {
  return String(env.DATA_SYNC_PREVIEW_WRITE || '').toLowerCase() === 'true';
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

function baseHeaders() {
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
    headers: baseHeaders()
  });
}
