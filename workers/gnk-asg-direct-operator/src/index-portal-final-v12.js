import core from './index-portal-experience-v10.js';

const VERSION = 'GNK_ASG_PORTAL_FINAL_V12_20260625';

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-gnk-asg-portal-final': VERSION
    }
  });
}

function withVersionHeader(response) {
  const headers = new Headers(response.headers);
  headers.set('x-gnk-asg-portal-final', VERSION);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function assetResponse(request, env, assetPath, contentType) {
  if (!env.ASSETS?.fetch) return null;
  const response = await env.ASSETS.fetch(new Request(new URL(assetPath, request.url), request));
  if (response.status === 404) return null;
  const headers = new Headers(response.headers);
  headers.set('content-type', contentType);
  headers.set('cache-control', 'public, max-age=86400, stale-while-revalidate=604800');
  headers.set('x-gnk-asg-portal-final', VERSION);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function statusAsset(request, env, english) {
  if (!env.ASSETS?.fetch) return null;
  const target = new URL(english ? '/automation-status/index.html' : '/status-automatizacije/index.html', request.url);
  const assetRequest = new Request(target, {
    method: 'GET',
    headers: request.headers
  });
  const response = await env.ASSETS.fetch(assetRequest);
  return response.status === 404 ? null : withVersionHeader(response);
}

async function fetchHandler(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (request.method === 'GET' && path === '/data/portal-version.json') {
    return json({
      ok: true,
      version: VERSION,
      publicUx: 'GNK_ASG_PUBLIC_UX_V12',
      publicMenu: 'GNK_ASG_PUBLIC_MENU_FINAL_V12',
      favicon: 'GNK_ASG_FAVICON_V1',
      indexClock: 'GNK_ASG_INDEX_CLOCK_V2',
      automation: 'GNK_ASG_PORTAL_EXPERIENCE_V10_20260625',
      timeZone: 'Europe/Zagreb',
      deployedEntryPoint: 'src/index-portal-final-v12.js'
    });
  }

  if (request.method === 'GET' && (path === '/favicon.ico' || path === '/favicon.svg')) {
    const response = await assetResponse(request, env, '/assets/gnk-asg-favicon.svg', 'image/svg+xml; charset=utf-8');
    if (response) return response;
  }

  if (request.method === 'GET' && path === '/status-automatizacije') {
    const response = await statusAsset(request, env, false);
    if (response) return response;
  }

  if (request.method === 'GET' && path === '/automation-status') {
    const response = await statusAsset(request, env, true);
    if (response) return response;
  }

  const response = await core.fetch(request, env, ctx);
  if (request.method !== 'GET' || path !== '/operator-dashboard') return withVersionHeader(response);
  if (!response.headers.get('content-type')?.includes('text/html')) return withVersionHeader(response);

  const pattern = /if\([a-zA-Z_$][\w$]*\(\)\)\{\s*document\.getElementById\("login"\)/;
  const html = (await response.text()).replace(pattern, 'if(false){document.getElementById("login")');
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'no-store');
  headers.set('x-gnk-asg-portal-final', VERSION);
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

export default {
  fetch: fetchHandler,
  async scheduled(event, env, ctx) {
    if (typeof core.scheduled === 'function') return core.scheduled(event, env, ctx);
  },
  async email(message, env, ctx) {
    if (typeof core.email === 'function') return core.email(message, env, ctx);
  }
};

export { VERSION };
