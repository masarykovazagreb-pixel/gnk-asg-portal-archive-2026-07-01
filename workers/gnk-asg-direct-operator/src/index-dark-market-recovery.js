import app from './index-publication-news-v2.js';
import { handleRefreshRoute, runScheduledRefresh } from './gnk-asg-refresh-backend-v1.js';
import {
  cleanPublications,
  contentQualityStatus,
  publicationSitemap,
  repairHtmlResponse,
  stableJsonPaths,
  stableJsonResponse
} from './publication-quality-core-v6.js';

const DEPLOY_TRIGGER = '2026-06-25-quality-v6';

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
  ['/en/legal/', '/en/legal/index.html'],
  ['/status-automatizacije', '/status-automatizacije/index.html'],
  ['/status-automatizacije/', '/status-automatizacije/index.html'],
  ['/automation-status', '/automation-status/index.html'],
  ['/automation-status/', '/automation-status/index.html']
]);

const PUBLIC_HTML_PREFIXES = [
  '/objave', '/publications', '/vijesti', '/news', '/trzista', '/markets',
  '/assistant', '/en/assistant', '/downloads', '/en/downloads', '/visual-index',
  '/contact', '/en/contact', '/legal', '/en/legal', '/status-automatizacije', '/automation-status'
];

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...jsonHeaders, ...extra }
  });
}

async function parseJson(response) {
  const value = await response.text();
  try {
    return JSON.parse(value);
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
  if (!marketResponse) return json({ ok: false, status: 'FALLBACK', updatedAt: new Date().toISOString(), cards: [], history: [], error: 'market_route_unavailable' }, 200);

  let market = null;
  try {
    market = await parseJson(marketResponse);
  } catch {
    market = { ok: false, status: 'FALLBACK', updatedAt: new Date().toISOString(), crypto: [], fx: null };
  }

  let chart = null;
  try {
    const chartResponse = await handleRefreshRoute(makeGet(origin, '/data/btc_chart.json', request), env, ctx);
    if (chartResponse?.ok) chart = await parseJson(chartResponse);
  } catch {
    chart = null;
  }

  return json(marketPayload(market, chart), 200, {
    'x-gnk-asg-market-recovery': 'business-dark-v2-quality-v6',
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

async function readAsset(env, requestUrl, assetPath) {
  if (!env.ASSETS?.fetch) return { status: 503, text: '' };
  const response = await env.ASSETS.fetch(new Request(new URL(assetPath, requestUrl).toString()));
  return { status: response.status, text: await response.text() };
}

async function themeDebug(request, env) {
  const [home, css, js, appJs, networkJs, globeJs] = await Promise.all([
    readAsset(env, request.url, '/index.html'),
    readAsset(env, request.url, '/assets/brand/gnk-asg-global-layer.css'),
    readAsset(env, request.url, '/assets/brand/gnk-asg-global-layer.js'),
    readAsset(env, request.url, '/assets/app.js'),
    readAsset(env, request.url, '/assets/group-network.js'),
    readAsset(env, request.url, '/assets/group-globe-3d.js')
  ]);

  const checks = {
    workerActive: true,
    deployTrigger: DEPLOY_TRIGGER,
    homeAsset200: home.status === 200,
    homeLoadsGlobalCss: home.text.includes('gnk-asg-global-layer.css'),
    homeLoadsGlobalJs: home.text.includes('gnk-asg-global-layer.js'),
    homeLoadsAppJs: home.text.includes('assets/app.js'),
    premiumCss200: css.status === 200,
    premiumCssDarkVariables: css.text.includes('--asg-bg:#050d19'),
    premiumCssShell: css.text.includes('gnk-asg-premium-shell'),
    premiumJs200: js.status === 200,
    premiumJsV3: js.text.includes('__GNK_ASG_PREMIUM_V3__'),
    premiumJsInstallsShell: js.text.includes("classList.add('gnk-asg-premium-shell')"),
    appLoadsNetwork: appJs.text.includes('group-network.js'),
    appLoadsGlobe: appJs.text.includes('group-globe-3d.js'),
    networkAsset200: networkJs.status === 200,
    networkMarker: networkJs.text.includes('global-network'),
    globeAsset200: globeJs.status === 200,
    globeMarker: globeJs.text.includes('globe-panel'),
    darkLockInjectedByWorker: true,
    qualityV6Integrated: true
  };

  const required = Object.values(checks).filter(value => typeof value === 'boolean');

  return json({
    ok: required.every(Boolean),
    theme: 'dark-business',
    checks
  }, required.every(Boolean) ? 200 : 503, {
    'x-gnk-asg-business-theme': 'dark-v2',
    'x-gnk-asg-deploy-trigger': DEPLOY_TRIGGER
  });
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
    .replace(/gnk-asg-global-layer\.css\?v=[^"']+/g, 'gnk-asg-global-layer.css?v=20260623-business-dark-v2')
    .replace(/gnk-asg-global-layer\.js\?v=[^"']+/g, 'gnk-asg-global-layer.js?v=20260623-business-dark-v2');

  const lock = `<style id="gnk-business-dark-inline">#gnk-asg-theme-toggle{display:none!important}</style><script id="gnk-business-dark-lock">try{localStorage.setItem('gnk-asg-theme','dark')}catch(e){}document.documentElement.dataset.gnkTheme='dark';new MutationObserver(function(){if(document.documentElement.dataset.gnkTheme!=='dark')document.documentElement.dataset.gnkTheme='dark';var b=document.getElementById('gnk-asg-theme-toggle');if(b)b.remove()}).observe(document.documentElement,{attributes:true,attributeFilter:['data-gnk-theme']});</script>`;
  html = html.includes('gnk-business-dark-lock') ? html : html.replace('</head>', `${lock}</head>`);

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-business-theme', 'dark-v2');
  headers.set('x-gnk-asg-deploy-trigger', DEPLOY_TRIGGER);
  if (path.startsWith('/en')) headers.set('x-gnk-asg-menu-fix', 'en-routes-v1');
  return new Response(html, { status: response.status, headers });
}

function shouldClean(path, method) {
  if (method !== 'GET' && method !== 'HEAD') return false;
  return path === '/objave' || path.startsWith('/objave/') ||
    path === '/publications' || path.startsWith('/publications/') ||
    path === '/data/news.json' || path === '/data/auto-editor.json';
}

function isPublicHtml(path) {
  return PUBLIC_HTML_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

async function fetchHandler(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const originalPath = url.pathname;

  if (path === '/api/market') return marketApi(request, env, ctx);
  if (path === '/theme-debug') return themeDebug(request, env);
  if (path === '/data/content-quality-status.json') return json(await contentQualityStatus(env));
  if (path === '/sitemap-objave.xml') return publicationSitemap(env, false);
  if (path === '/image-sitemap-objave.xml') return publicationSitemap(env, true);

  if (shouldClean(path, request.method)) await cleanPublications(env, false);

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
    const response = await handleRefreshRoute(request, env, ctx);
    if (stableJsonPaths.has(path) && response) return stableJsonResponse(response, path);
    return response;
  }

  let response = await app.fetch(request, env, ctx);
  if (stableJsonPaths.has(path)) return stableJsonResponse(response, path);

  response = await fixHomepage(response, originalPath);
  if (isPublicHtml(path) && path !== '/' && path !== '/en') return repairHtmlResponse(response);
  return response;
}

export default {
  fetch: fetchHandler,
  async scheduled(event, env, ctx) {
    const task = (async () => {
      const automation = await Promise.allSettled([
        runScheduledRefresh(env, ctx),
        typeof app.scheduled === 'function' ? app.scheduled(event, env, {}) : Promise.resolve(null)
      ]);
      const quality = await cleanPublications(env, true);
      return { ok: quality.ok !== false, automation, quality, finishedAt: new Date().toISOString() };
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
