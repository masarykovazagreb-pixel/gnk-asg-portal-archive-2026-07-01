import publicApp from '../../gnk-asg-direct-operator/src/index-auto-editor-quality-bridge-v1.js';

const VERSION = 'GNK_ASG_PUBLIC_MENU_ADMIN_FIX_V1_20260625';
const TARGET = '/assets/public-menu-final-v9.js';
const STATIC_ASSETS = new Set([
  '/assets/public-content-shell-v1.css',
  '/assets/public-content-shell-v1.js',
  '/assets/public-data-stability-v1.js',
  '/assets/public-site-unified-v6.js'
]);
const STATIC_PAGES = new Map([
  ['/status-automatizacije', '/status-automatizacije/index.html'],
  ['/status-automatizacije/', '/status-automatizacije/index.html'],
  ['/automation-status', '/automation-status/index.html'],
  ['/automation-status/', '/automation-status/index.html']
]);

async function serveAsset(request, env, path, contentType = '') {
  if (!env.ASSETS?.fetch) {
    return new Response('Assets binding missing', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }

  const assetUrl = new URL(path, request.url);
  const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
  if (contentType) headers.set('content-type', contentType);
  headers.set('x-gnk-asg-public-route', VERSION);

  return new Response(await response.arrayBuffer(), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === TARGET) {
      const response = await serveAsset(request, env, TARGET, 'application/javascript; charset=utf-8');
      const headers = new Headers(response.headers);
      headers.set('x-gnk-asg-menu-fix', VERSION);
      return new Response(await response.arrayBuffer(), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    if (STATIC_ASSETS.has(url.pathname)) {
      const contentType = url.pathname.endsWith('.css')
        ? 'text/css; charset=utf-8'
        : 'application/javascript; charset=utf-8';
      return serveAsset(request, env, url.pathname, contentType);
    }

    const staticPage = STATIC_PAGES.get(url.pathname);
    if (staticPage) return serveAsset(request, env, staticPage, 'text/html; charset=utf-8');

    return publicApp.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    if (typeof publicApp.scheduled === 'function') return publicApp.scheduled(event, env, ctx);
  }
};
