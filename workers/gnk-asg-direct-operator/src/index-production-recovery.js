import app from './index-news-automation.js';
import { handleRefreshRoute } from './gnk-asg-refresh-backend-v1.js';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, no-cache, must-revalidate, max-age=0'
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...JSON_HEADERS, ...extra }
  });
}

function requestFor(origin, path, request) {
  const url = new URL(path, origin);
  return new Request(url.toString(), {
    method: request?.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: request?.headers || undefined
  });
}

function normalizeMarket(data, chartData = null) {
  const crypto = Array.isArray(data?.crypto) ? data.crypto : [];
  const bySymbol = Object.fromEntries(
    crypto.map(item => [String(item?.symbol || '').toUpperCase(), item])
  );
  const btc = bySymbol.BTC || {};
  const eth = bySymbol.ETH || {};
  const sol = bySymbol.SOL || {};
  const xrp = bySymbol.XRP || {};
  const fxValue = data?.fx?.value ?? null;
  const overallStatus = String(data?.status || 'FALLBACK').toUpperCase();

  const cards = [
    { label: 'Bitcoin', value: btc.priceEur ?? null, suffix: ' EUR', note: `BTC/EUR · ${btc.status || overallStatus}` },
    { label: 'Ethereum', value: eth.priceEur ?? null, suffix: ' EUR', note: `ETH/EUR · ${eth.status || overallStatus}` },
    { label: 'Solana', value: sol.priceEur ?? null, suffix: ' EUR', note: `SOL/EUR · ${sol.status || overallStatus}` },
    { label: 'XRP', value: xrp.priceEur ?? null, suffix: ' EUR', note: `XRP/EUR · ${xrp.status || overallStatus}` },
    { label: 'USD/EUR', value: fxValue, suffix: '', note: `FX · ${data?.fx?.status || overallStatus}` },
    { label: 'Zlato', value: null, suffix: ' EUR', note: 'SNAPSHOT · robni izvor nije povezan' },
    { label: 'Brent', value: null, suffix: ' USD', note: 'SNAPSHOT · robni izvor nije povezan' }
  ];

  const history = Array.isArray(chartData?.prices)
    ? chartData.prices
        .filter(point => point && Number.isFinite(Number(point.value)))
        .map(point => ({ at: point.time, btc_eur: Number(point.value) }))
    : [];

  return {
    ok: data?.ok !== false,
    status: overallStatus,
    updatedAt: data?.updatedAt || new Date().toISOString(),
    cache: data?.cache || null,
    disclaimer:
      data?.disclaimer ||
      'Podatci su informativni, mogu kasniti i nisu financijski savjet.',
    cards,
    history,
    assets: {
      bitcoin: {
        price_eur: btc.priceEur ?? null,
        price_usd: btc.priceUsd ?? null,
        change_24h: btc.change24hEur ?? null,
        status: btc.status || overallStatus
      },
      ethereum: {
        price_eur: eth.priceEur ?? null,
        price_usd: eth.priceUsd ?? null,
        change_24h: eth.change24hEur ?? null,
        status: eth.status || overallStatus
      },
      solana: {
        price_eur: sol.priceEur ?? null,
        price_usd: sol.priceUsd ?? null,
        change_24h: sol.change24hEur ?? null,
        status: sol.status || overallStatus
      },
      xrp: {
        price_eur: xrp.priceEur ?? null,
        price_usd: xrp.priceUsd ?? null,
        change_24h: xrp.change24hEur ?? null,
        status: xrp.status || overallStatus
      },
      usd_eur: {
        rate: fxValue,
        date: data?.fx?.date || null,
        status: data?.fx?.status || overallStatus
      },
      asg_gold_reference: { value_eur: null, status: 'SNAPSHOT' },
      brent: { price: null, status: 'SNAPSHOT' }
    },
    raw: data
  };
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Neispravan JSON odgovor (${response.status})`);
  }
}

async function handleMarketApi(request, env, ctx) {
  const origin = new URL(request.url).origin;
  const marketResponse = await handleRefreshRoute(
    requestFor(origin, '/data/market.json', request),
    env,
    ctx
  );

  if (!marketResponse) {
    return json({ ok: false, error: 'market_route_unavailable' }, 503);
  }

  const marketData = await readJsonResponse(marketResponse);
  let chartData = null;

  try {
    const chartResponse = await handleRefreshRoute(
      requestFor(origin, '/data/btc_chart.json', request),
      env,
      ctx
    );
    if (chartResponse?.ok) chartData = await readJsonResponse(chartResponse);
  } catch {
    chartData = null;
  }

  return json(
    normalizeMarket(marketData, chartData),
    marketResponse.ok ? 200 : marketResponse.status,
    { 'x-gnk-asg-recovery': 'market-compat-v2' }
  );
}

async function handleRecoveryRoute(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === '/api/market') {
    return handleMarketApi(request, env, ctx);
  }

  if (path === '/api/news') {
    const response = await app.fetch(
      requestFor(url.origin, '/data/news.json', request),
      env,
      ctx
    );
    const data = await readJsonResponse(response);
    return json(data, response.ok ? 200 : response.status, {
      'x-gnk-asg-recovery': 'news-compat-v2'
    });
  }

  if (
    path === '/data/market.json' ||
    path === '/data/digital-assets.json' ||
    path === '/data/btc_chart.json' ||
    path === '/data/btc-chart.json' ||
    path === '/data/fast_market_status.json' ||
    path === '/data/update_status.json' ||
    path === '/backend-status' ||
    path === '/operator/backend-status' ||
    path === '/operator/refresh-news' ||
    path === '/operator/refresh-market' ||
    path === '/operator/refresh-all' ||
    path === '/operator/refresh-status' ||
    path === '/operator/refresh-help'
  ) {
    return handleRefreshRoute(request, env, ctx);
  }

  return null;
}

export default {
  async fetch(request, env, ctx) {
    const recovered = await handleRecoveryRoute(request, env, ctx);
    if (recovered) return recovered;
    return app.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    const marketTask = handleRefreshRoute(
      new Request('https://gnk-asg.hr/data/market.json'),
      env,
      ctx
    );
    const tasks = [marketTask];

    if (typeof app.scheduled === 'function') {
      tasks.push(app.scheduled(event, env, ctx));
    }

    const task = Promise.allSettled(tasks);
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(task);
      return;
    }
    return task;
  },

  async email(message, env, ctx) {
    if (typeof app.email === 'function') return app.email(message, env, ctx);
  }
};
