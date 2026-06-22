import core from './index.js';

const protectedPaths = new Set(['/api/media-upload', '/api/admin-asset-list']);
const allowedOrigins = new Set(['https://gnk-asg.hr']);
const repairMarkup = [
  '<link id="gnk-global-layer-css" rel="stylesheet" href="/assets/brand/gnk-asg-global-layer.css?v=20260621-functional-v2">',
  '<link id="gnk-functional-repair-css" rel="stylesheet" href="/assets/portal-functional-repair-v1.css?v=20260621-2">',
  '<script id="gnk-global-layer-js" defer src="/assets/brand/gnk-asg-global-layer.js?v=20260621-functional-v2"></script>',
  '<script id="gnk-operator-token-vault" defer src="/assets/operator-token-vault.js?v=20260621-functional-v2"></script>',
  '<script id="gnk-portal-ui-repair" defer src="/assets/portal-ui-repair-v1.js?v=20260621-2"></script>',
  '<script id="gnk-contact-form-repair" defer src="/assets/contact-form-repair-v1.js?v=20260621-2"></script>',
  '<script id="gnk-admin-functional-repair" defer src="/assets/admin-functional-repair-v1.js?v=20260621-2"></script>',
  '<script id="gnk-dashboard-compat" defer src="/assets/operator-dashboard-compat-v1.js?v=20260621-2"></script>'
].join('');

function protectedCorsHeaders(request) {
  const origin = request.headers.get('origin') || '';
  const allowedOrigin = allowedOrigins.has(origin) ? origin : 'https://gnk-asg.hr';
  return {
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-operator-token,x-admin-token,x-gnk-asg-token',
    'access-control-max-age': '600',
    'vary': 'Origin'
  };
}

function withRepairLayer(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') || !response.body) return response;
  return new HTMLRewriter().on('head', {
    element(element) {
      element.append(repairMarkup, { html:true });
    }
  }).transform(response);
}

async function delegateWithStaticAssetFallback(request, env, ctx) {
  const response = await core.fetch(request, env, ctx);
  const methodAllowsAssets = request.method === 'GET' || request.method === 'HEAD';
  if (!methodAllowsAssets || response.status !== 404 || !env.ASSETS || typeof env.ASSETS.fetch !== 'function') {
    return withRepairLayer(response);
  }
  const assetResponse = await env.ASSETS.fetch(request);
  return withRepairLayer(assetResponse.status === 404 ? response : assetResponse);
}

const GNK_ASG_SECURE_NEWS_PUBLISH_V1 = true;

function GNK_NEWS_JSON(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function GNK_NEWS_SLUG(value) {
  return String(value || 'vijest')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'vijest';
}

async function GNK_NEWS_AUTHORIZED(request) {
  try {
    const check = await fetch(
      'https://operator.gnk-asg.hr/operator/status',
      {
        method: 'GET',
        headers: request.headers,
        redirect: 'manual'
      }
    );

    return check.status === 200;
  } catch {
    return false;
  }
}

async function GNK_NEWS_READ_LIST(env) {
  if (!env.GNK_ASG_KV) return [];

  try {
    const raw = await env.GNK_ASG_KV.get('data:news:items');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function GNK_NEWS_PUBLISH(request, env) {
  if (request.method !== 'POST') {
    return GNK_NEWS_JSON(
      { ok: false, error: 'method_not_allowed' },
      405
    );
  }

  if (!(await GNK_NEWS_AUTHORIZED(request))) {
    return GNK_NEWS_JSON(
      { ok: false, error: 'authorization_required' },
      401
    );
  }

  if (!env.GNK_ASG_KV) {
    return GNK_NEWS_JSON(
      { ok: false, error: 'GNK_ASG_KV_missing' },
      500
    );
  }

  let body = {};

  try {
    body = await request.json();
  } catch {
    return GNK_NEWS_JSON(
      { ok: false, error: 'invalid_json' },
      400
    );
  }

  const title = String(body.title || '').trim();

  if (!title) {
    return GNK_NEWS_JSON(
      { ok: false, error: 'missing_title' },
      400
    );
  }

  const now = new Date().toISOString();
  const id = String(
    body.id ||
    `news-${now.replace(/[^0-9]/g, '').slice(0, 14)}-${GNK_NEWS_SLUG(title)}`
  );

  const sourceUrl = String(
    body.url ||
    body.sourceUrl ||
    ''
  ).trim();

  const item = {
    id,
    kind: 'news',
    lang: String(body.lang || 'hr'),
    title,
    slug: String(body.slug || GNK_NEWS_SLUG(title)),
    summary: String(body.summary || '').trim(),
    body: String(body.body || body.bodyHtml || '').trim(),
    url: sourceUrl,
    sourceUrl,
    source: String(body.source || 'GNK ASG').trim(),
    region: String(body.region || body.source || 'GNK ASG').trim(),
    group: String(body.group || body.category || 'business').trim(),
    category: String(body.category || body.group || 'business').trim(),
    image: String(body.image || '').trim(),
    published_at: String(
      body.published_at ||
      body.publishedAt ||
      now
    ),
    share_url: String(
      body.share_url ||
      `/podijeli/vijest/${encodeURIComponent(id)}/`
    ),
    status: 'published',
    createdAt: now,
    updatedAt: now
  };

  const current = await GNK_NEWS_READ_LIST(env);

  const next = [
    item,
    ...current.filter(entry =>
      entry &&
      entry.id !== id &&
      String(entry.url || entry.sourceUrl || '') !== sourceUrl
    )
  ].slice(0, 500);

  await env.GNK_ASG_KV.put(
    `news:${id}`,
    JSON.stringify(item, null, 2)
  );

  await env.GNK_ASG_KV.put(
    'data:news:items',
    JSON.stringify(next, null, 2)
  );

  return GNK_NEWS_JSON({
    ok: true,
    stored: 'data:news:items',
    id,
    total: next.length,
    item
  });
}
const GNK_ASG_NEWS_ADMIN_ASSET_ROUTE_V1 = true;

async function GNK_ASG_SERVE_NEWS_ADMIN(request, env) {
  if (!env.ASSETS || typeof env.ASSETS.fetch !== 'function') {
    return new Response(
      JSON.stringify({ ok: false, error: 'assets_binding_unavailable' }),
      {
        status: 503,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store'
        }
      }
    );
  }

  const currentUrl = new URL(request.url);
  const assetUrl = new URL('/news-admin/', currentUrl.origin);
  assetUrl.search = currentUrl.search;

  const assetResponse = await env.ASSETS.fetch(
    new Request(assetUrl.toString(), {
      method: request.method,
      headers: request.headers
    })
  );

  const headers = new Headers(assetResponse.headers);
  headers.set('cache-control', 'no-store, no-cache, must-revalidate');
  headers.set('x-gnk-asg-page-source', 'direct-operator-assets');

  return new Response(assetResponse.body, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers
  });
}
export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;

    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      (
        path === '/news-admin' ||
        path === '/news-admin/' ||
        path === '/news-admin/index.html'
      )
    ) {
      return await GNK_ASG_SERVE_NEWS_ADMIN(request, env);
    }

    if (path === '/operator/publish-news') {
      if (request.method === 'GET' || request.method === 'HEAD') {
        return await GNK_ASG_SERVE_NEWS_ADMIN(request, env);
      }

      return await GNK_NEWS_PUBLISH(request, env);
    }
    if (request.method === 'OPTIONS' && protectedPaths.has(path)) {
      return new Response(null, { status:204, headers:protectedCorsHeaders(request) });
    }
    if (request.method === 'OPTIONS') return core.fetch(request, env, ctx);

    if (protectedPaths.has(path)) {
      const check = await fetch('https://operator.gnk-asg.hr/operator/status', {
        method:'GET', headers:request.headers, redirect:'manual'
      });
      if (check.status !== 200) {
        return new Response(JSON.stringify({ok:false,error:'authorization_required'}), {
          status:401,
          headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...protectedCorsHeaders(request)}
        });
      }
    }
    return delegateWithStaticAssetFallback(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    if (typeof core.scheduled === 'function') return core.scheduled(event, env, ctx);
  },

  async email(message, env, ctx) {
    if (typeof core.email === 'function') return core.email(message, env, ctx);
  }
};
