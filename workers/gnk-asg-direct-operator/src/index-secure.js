import core from './index.js';

const protectedPaths = new Set(['/api/media-upload', '/api/admin-asset-list']);
const allowedOrigins = new Set(['https://gnk-asg.hr']);
const repairMarkup = [
  '<link id="gnk-global-layer-css" rel="stylesheet" href="/assets/brand/gnk-asg-global-layer.css?v=20260621-functional-v1">',
  '<link id="gnk-functional-repair-css" rel="stylesheet" href="/assets/portal-functional-repair-v1.css?v=20260621-1">',
  '<script id="gnk-global-layer-js" defer src="/assets/brand/gnk-asg-global-layer.js?v=20260621-functional-v1"></script>',
  '<script id="gnk-operator-token-vault" defer src="/assets/operator-token-vault.js?v=20260621-functional-v1"></script>',
  '<script id="gnk-portal-ui-repair" defer src="/assets/portal-ui-repair-v1.js?v=20260621-1"></script>',
  '<script id="gnk-contact-form-repair" defer src="/assets/contact-form-repair-v1.js?v=20260621-1"></script>',
  '<script id="gnk-admin-functional-repair" defer src="/assets/admin-functional-repair-v1.js?v=20260621-1"></script>',
  '<script id="gnk-dashboard-compat" defer src="/assets/operator-dashboard-compat-v1.js?v=20260621-1"></script>'
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

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
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
