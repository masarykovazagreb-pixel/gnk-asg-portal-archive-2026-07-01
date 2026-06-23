import app from './index-publication-news-hotfix.js';
import { handleRefreshRoute, runScheduledRefresh } from './gnk-asg-refresh-backend-v1.js';

const DEPLOY_TRIGGER = '2026-06-23-business-dark-v1';

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, no-cache, must-revalidate, max-age=0'
};

const explicitPublicAssets = new Map([
  ['/markets', '/markets/index.html'],
  ['/markets/', '/markets/index.html'],
  ['/news', '/news/index.html'],
  ['/news/', '/news/index.html'],
  ['/en/assistant', '/en/assistant/index.html'],
  ['/en/assistant/', '/en/assistant/index.html'],
  ['/en/legal', '/en/legal/index.html'],
  ['/en/legal/', '/en/legal/index.html']
]);

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...jsonHeaders, ...extra }
  });
}

async function parseJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`invalid_json_${response.status}`);
  }
}

function makeGet(origin, path, request) {
  return new Request(new URL(path, origin).toString(), {
    method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: request.headers
  });
}

function marketPayload(market, chart) {
  const crypto = Array.isArray(market?.crypto) ? market.crypto : [];
  const map = Object.fromEntries(crypto.map(item => [String(item?.symbol || '').toUpperCase(), item]));
  const btc = map.BTC || {};
  const eth = map.ETH || {};
  const sol = map.SOL || {};
  const xrp = map.XRP || {};
  const status = String(market?.status || 'FALLBACK').toUpperCase();
  const fx = market?.fx?.value ?? null;
  const history = Array.isArray(chart?.prices)
    ? chart.prices
        .filter(point => point && Number.isFinite(Number(point.value)))
        .map(point => ({ at: point.time, btc_eur: Number(point.value) }))
    : [];

  return {
    ok: market?.ok !== false,
    status,
    updatedAt: market?.updatedAt || new Date().toISOString(),
    disclaimer: market?.disclaimer || 'Podatci su informativni, mogu kasniti i nisu financijski savjet.',
    cards: [
      { label: 'Bitcoin', value: btc.priceEur ?? null, suffix: ' EUR', note: `BTC/EUR · ${btc.status || status}` },
      { label: 'Ethereum', value: eth.priceEur ?? null, suffix: ' EUR', note: `ETH/EUR · ${eth.status || status}` },
      { label: 'Solana', value: sol.priceEur ?? null, suffix: ' EUR', note: `SOL/EUR · ${sol.status || status}` },
      { label: 'XRP', value: xrp.priceEur ?? null, suffix: ' EUR', note: `XRP/EUR · ${xrp.status || status}` },
      { label: 'USD/EUR', value: fx, suffix: '', note: `FX · ${market?.fx?.status || status}` },
      { label: 'Zlato', value: null, suffix: ' EUR', note: 'SNAPSHOT · robni izvor nije povezan' },
      { label: 'Brent', value: null, suffix: ' USD', note: 'SNAPSHOT · robni izvor nije povezan' }
    ],
    history,
    assets: {
      bitcoin: {
        price_eur: btc.priceEur ?? null,
        price_usd: btc.priceUsd ?? null,
        change_24h: btc.change24hEur ?? null,
        status: btc.status || status
      },
      ethereum: {
        price_eur: eth.priceEur ?? null,
        price_usd: eth.priceUsd ?? null,
        change_24h: eth.change24hEur ?? null,
        status: eth.status || status
      },
      solana: {
        price_eur: sol.priceEur ?? null,
        price_usd: sol.priceUsd ?? null,
        change_24h: sol.change24hEur ?? null,
        status: sol.status || status
      },
      xrp: {
        price_eur: xrp.priceEur ?? null,
        price_usd: xrp.priceUsd ?? null,
        change_24h: xrp.change24hEur ?? null,
        status: xrp.status || status
      },
      usd_eur: {
        rate: fx,
        date: market?.fx?.date || null,
        status: market?.fx?.status || status
      },
      asg_gold_reference: { value_eur: null, status: 'SNAPSHOT' },
      brent: { price: null, price_usd: null, status: 'SNAPSHOT' }
    },
    raw: market
  };
}

async function marketApi(request, env, ctx) {
  const origin = new URL(request.url).origin;
  const marketResponse = await handleRefreshRoute(makeGet(origin, '/data/market.json', request), env, ctx);
  if (!marketResponse) return json({ ok: false, error: 'market_route_unavailable' }, 503);

  const market = await parseJson(marketResponse);
  let chart = null;
  try {
    const chartResponse = await handleRefreshRoute(makeGet(origin, '/data/btc_chart.json', request), env, ctx);
    if (chartResponse?.ok) chart = await parseJson(chartResponse);
  } catch {
    chart = null;
  }

  return json(marketPayload(market, chart), marketResponse.ok ? 200 : marketResponse.status, {
    'x-gnk-asg-market-recovery': 'business-dark-v1',
    'x-gnk-asg-deploy-trigger': DEPLOY_TRIGGER
  });
}

async function serveExplicitAsset(path, request, env) {
  const assetPath = explicitPublicAssets.get(path);
  if (!assetPath || !env.ASSETS?.fetch) return null;

  const assetRequest = new Request(new URL(assetPath, request.url).toString(), {
    method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: request.headers
  });
  const response = await env.ASSETS.fetch(assetRequest);
  return response.status === 404 ? null : response;
}

async function fixHomepage(response, path) {
  const isHome = path === '/' || path === '/index.html' || path === '/en' || path === '/en/' || path === '/en/index.html';
  if (!isHome) return response;
  if (!response?.headers?.get('content-type')?.includes('text/html')) return response;

  let html = await response.text();

  if (path.startsWith('/en')) {
    html = html
      .replaceAll('https://gnk-asg.hr/objave/', 'https://gnk-asg.hr/publications/')
      .replaceAll('href="/objave/"', 'href="/publications/"')
      .replaceAll("href='/objave/'", "href='/publications/'")
      .replaceAll('value="/objave/"', 'value="/publications/"')
      .replaceAll("value='/objave/'", "value='/publications/'");
  }

  html = html
    .replace(/gnk-asg-global-layer\.css\?v=[^"']+/g, 'gnk-asg-global-layer.css?v=20260623-business-dark-v1')
    .replace(/gnk-asg-global-layer\.js\?v=[^"']+/g, 'gnk-asg-global-layer.js?v=20260623-business-dark-v1');

  const lock = `<style id="gnk-business-dark-inline">#gnk-asg-theme-toggle{display:none!important}</style><script id="gnk-business-dark-lock">try{localStorage.setItem('gnk-asg-theme','dark')}catch(e){}document.documentElement.dataset.gnkTheme='dark';new MutationObserver(function(){if(document.documentElement.dataset.gnkTheme!=='dark')document.documentElement.dataset.gnkTheme='dark';var b=document.getElementById('gnk-asg-theme-toggle');if(b)b.remove()}).observe(document.documentElement,{attributes:true,attributeFilter:['data-gnk-theme']});</script>`;
  html = html.includes('gnk-business-dark-lock') ? html : html.replace('</head>', `${lock}</head>`);

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-business-theme', 'dark-v1');
  headers.set('x-gnk-asg-deploy-trigger', DEPLOY_TRIGGER);
  if (path.startsWith('/en')) headers.set('x-gnk-asg-menu-fix', 'en-routes-v1');
  return new Response(html, { status: response.status, headers });
}

async function fetchHandler(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const originalPath = url.pathname;

  if (path === '/api/market') return marketApi(request, env, ctx);

  const explicitAsset = await serveExplicitAsset(originalPath, request, env) ||
    await serveExplicitAsset(path, request, env);
  if (explicitAsset) return explicitAsset;

  if (
    path === '/data/market.json' ||
    path === '/data/digital-assets.json' ||
    path === '/data/btc_chart.json' ||
    path === '/data/btc-chart.json' ||
    path === '/data/fast_market_status.json' ||
    path === '/data/update_status.json' ||
    path === '/backend-status' ||
    path === '/operator/backend-status' ||
    path === '/operator/refresh-market' ||
    path === '/operator/refresh-all' ||
    path === '/operator/refresh-status' ||
    path === '/operator/refresh-help'
  ) {
    return handleRefreshRoute(request, env, ctx);
  }

  const response = await app.fetch(request, env, ctx);
  return fixHomepage(response, originalPath);
}

export default {
  fetch: fetchHandler,
  async scheduled(event, env, ctx) {
    const tasks = [runScheduledRefresh(env, ctx)];
    if (typeof app.scheduled === 'function') tasks.push(app.scheduled(event, env, ctx));
    const task = Promise.allSettled(tasks);
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
