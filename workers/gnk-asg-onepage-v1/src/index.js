const VERSION = 'GNK_ASG_ONEPAGE_WORKER_V1_20260627';
const LEGACY_CONTACT = 'https://gnk-asg.hr/api/contact-submit';

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}
  });
}

function securityHeaders(headers) {
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('x-gnk-asg-onepage', VERSION);
  return headers;
}

async function proxyContact(request) {
  if (request.method !== 'POST') return json({ok:false,error:'method_not_allowed'}, 405);
  const response = await fetch(LEGACY_CONTACT, {
    method: 'POST',
    headers: {'content-type':'application/json'},
    body: await request.text()
  });
  const headers = securityHeaders(new Headers(response.headers));
  headers.set('access-control-allow-origin', '*');
  headers.set('cache-control', 'no-store');
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}

async function serveAsset(request, env, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  const response = await env.ASSETS.fetch(new Request(url, request));
  const headers = securityHeaders(new Headers(response.headers));
  if (pathname.endsWith('.html') || pathname === '/') headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
  else if (/\.(?:css|js|json)$/i.test(pathname)) headers.set('cache-control', 'public, max-age=300, must-revalidate');
  headers.delete('content-length');
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (request.method === 'OPTIONS' && path === '/api/contact') {
      return new Response(null, {status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'content-type','access-control-max-age':'86400'}});
    }
    if (path === '/api/contact') return proxyContact(request);
    if (path === '/health') return json({ok:true,version:VERSION,project:'onepage-v1'});
    if (request.method !== 'GET' && request.method !== 'HEAD') return json({ok:false,error:'method_not_allowed'}, 405);
    const direct = await serveAsset(request, env, url.pathname);
    if (direct.status !== 404) return direct;
    return serveAsset(request, env, '/index.html');
  }
};
