import core from './index-news-quality-v2.js';

const BACKEND_PATHS = new Set([
  '/operator-dashboard', '/operator-dashboard/',
  '/operator-mobile', '/operator-mobile/',
  '/mail-studio', '/mail-studio/'
]);
const INDEX_PATHS = new Set(['/', '/en', '/en/']);
const CONTACT_PATHS = new Set(['/contact', '/contact/', '/en/contact', '/en/contact/']);

const BACKEND_ASSETS = '<link rel="stylesheet" href="/assets/backend-ui-shell.css?v=20260623-backend-2"><script defer src="/assets/backend-ui-shell.js?v=20260623-backend-2"></script>';
const INDEX_ASSETS = '<link rel="stylesheet" href="/assets/index-iq200.css?v=20260623-iq200-2"><link rel="stylesheet" href="/assets/visual-quality-v2.css?v=20260623-v2"><script defer src="/assets/index-iq200.js?v=20260623-iq200-2"></script><script defer src="/assets/visual-quality-v2.js?v=20260623-v2"></script>';
const CONTACT_ASSETS = '<link rel="stylesheet" href="/assets/contact-quality-v2.css?v=20260623-v2"><script defer src="/assets/contact-quality-v2.js?v=20260623-v2"></script>';

function cleanIndexTitle(html, path) {
  if (path === '/') {
    return html.replace('Index / <span>početna stranica</span>', 'Korporativni <span>ekosustav</span>');
  }
  return html.replace('Index / <span>home page</span>', 'Corporate <span>ecosystem</span>');
}

function injectHtml(response, html, assets, cacheControl) {
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  if (cacheControl) headers.set('cache-control', cacheControl);
  return new Response(html.replace('</head>', `${assets}</head>`), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function fetchHandler(request, env, ctx) {
  const response = await core.fetch(request, env, ctx);
  const path = new URL(request.url).pathname;
  const type = response.headers.get('content-type') || '';
  const isHtml = request.method === 'GET' && type.includes('text/html');
  if (!isHtml) return response;

  if (BACKEND_PATHS.has(path)) {
    const html = await response.text();
    return injectHtml(response, html, BACKEND_ASSETS, 'no-store, no-cache, must-revalidate, max-age=0');
  }

  if (CONTACT_PATHS.has(path)) {
    const html = await response.text();
    return injectHtml(response, html, CONTACT_ASSETS, 'no-store, no-cache, must-revalidate, max-age=0');
  }

  if (INDEX_PATHS.has(path)) {
    const html = await response.text();
    return injectHtml(response, cleanIndexTitle(html, path), INDEX_ASSETS);
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
