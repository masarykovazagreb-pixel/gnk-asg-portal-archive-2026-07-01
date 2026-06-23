import core from './index-news-quality-v2.js';

const BACKEND_PATHS = new Set([
  '/operator-dashboard', '/operator-dashboard/',
  '/operator-mobile', '/operator-mobile/',
  '/mail-studio', '/mail-studio/'
]);
const INDEX_PATHS = new Set(['/', '/en', '/en/']);

const BACKEND_ASSETS = '<link rel="stylesheet" href="/assets/backend-ui-shell.css?v=20260623-backend-3"><script defer src="/assets/backend-ui-shell.js?v=20260623-backend-3"></script>';
const INDEX_ASSETS = '<link rel="stylesheet" href="/assets/index-iq200.css?v=20260623-iq200-1"><script defer src="/assets/index-iq200.js?v=20260623-iq200-1"></script><script defer src="/assets/admin-route-bridge.js?v=20260623-admin-1"></script>';

function cleanIndexTitle(html, path) {
  if (path === '/') {
    return html.replace('Index / <span>početna stranica</span>', 'Korporativni <span>ekosustav</span>');
  }
  return html.replace('Index / <span>home page</span>', 'Corporate <span>ecosystem</span>');
}

async function fetchHandler(request, env, ctx) {
  const response = await core.fetch(request, env, ctx);
  const path = new URL(request.url).pathname;
  const type = response.headers.get('content-type') || '';
  const isHtml = request.method === 'GET' && type.includes('text/html');
  if (!isHtml) return response;

  if (BACKEND_PATHS.has(path)) {
    const html = await response.text();
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
    return new Response(html.replace('</head>', `${BACKEND_ASSETS}</head>`), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  if (INDEX_PATHS.has(path)) {
    const html = await response.text();
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    const updated = cleanIndexTitle(html, path).replace('</head>', `${INDEX_ASSETS}</head>`);
    return new Response(updated, {
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
