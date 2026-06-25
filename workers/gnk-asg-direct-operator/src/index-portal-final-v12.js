import core from './index-portal-experience-v10.js';
import {patchPublicHtml,transformHtml} from './public-shell-v11.js';

const VERSION = 'GNK_ASG_PORTAL_FINAL_V12_20260625';
const PUBLIC_VISUAL = 'GNK_ASG_PUBLIC_VISUAL_V13_20260625';

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-gnk-asg-portal-final': VERSION,
      'x-gnk-asg-public-visual': PUBLIC_VISUAL
    }
  });
}

function withVersionHeader(response) {
  const headers = new Headers(response.headers);
  headers.set('x-gnk-asg-portal-final', VERSION);
  headers.set('x-gnk-asg-public-visual', PUBLIC_VISUAL);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function statusAsset(request, env, english) {
  if (!env.ASSETS?.fetch) return null;
  const route = english ? '/automation-status/' : '/status-automatizacije/';
  const target = new URL(english ? '/automation-status/index.html' : '/status-automatizacije/index.html', request.url);
  const assetRequest = new Request(target, {
    method: 'GET',
    headers: request.headers
  });
  const response = await env.ASSETS.fetch(assetRequest);
  if (response.status === 404) return null;
  if (!response.headers.get('content-type')?.includes('text/html')) return withVersionHeader(response);
  return transformHtml(response, html => patchPublicHtml(html, route));
}

async function fetchHandler(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (request.method === 'GET' && path === '/data/portal-version.json') {
    return json({
      ok: true,
      version: VERSION,
      publicUx: 'GNK_ASG_PUBLIC_UX_V11',
      publicVisual: PUBLIC_VISUAL,
      publicMenu: 'GNK_ASG_PUBLIC_MENU_V13',
      indexClock: 'GNK_ASG_INDEX_CLOCK_V2',
      automation: 'GNK_ASG_PORTAL_EXPERIENCE_V10_20260625',
      timeZone: 'Europe/Zagreb',
      deployedEntryPoint: 'src/index-portal-final-v12.js'
    });
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
  headers.set('x-gnk-asg-public-visual', PUBLIC_VISUAL);
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

export { VERSION, PUBLIC_VISUAL };
