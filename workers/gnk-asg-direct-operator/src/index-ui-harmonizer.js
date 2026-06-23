import core from './index-news-quality-v2.js';

const BACKEND_PATHS = new Set([
  '/operator-dashboard', '/operator-dashboard/',
  '/operator-mobile', '/operator-mobile/',
  '/mail-studio', '/mail-studio/'
]);

const ASSETS = '<link rel="stylesheet" href="/assets/backend-ui-shell.css?v=20260623-backend-1"><script defer src="/assets/backend-ui-shell.js?v=20260623-backend-1"></script>';

async function fetchHandler(request, env, ctx) {
  const response = await core.fetch(request, env, ctx);
  const path = new URL(request.url).pathname;
  const type = response.headers.get('content-type') || '';
  if (request.method === 'GET' && BACKEND_PATHS.has(path) && type.includes('text/html')) {
    const html = await response.text();
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
    return new Response(html.replace('</head>', `${ASSETS}</head>`), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
  return response;
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
