import app from './index-dark-market-recovery.js';

const VERSION = 'GNK_ASG_PUBLIC_PAGE_ROUTES_V1';

const publicAssets = new Map([
  ['/auto-editor', '/auto-editor/index.html'],
  ['/auto-editor/', '/auto-editor/index.html'],
  ['/auto-editor/index.html', '/auto-editor/index.html'],
  ['/media-kit', '/media-kit/index.html'],
  ['/media-kit/', '/media-kit/index.html'],
  ['/media-kit/index.html', '/media-kit/index.html']
]);

async function servePublicAsset(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  if (!env.ASSETS || typeof env.ASSETS.fetch !== 'function') return null;

  const url = new URL(request.url);
  const assetPath = publicAssets.get(url.pathname);
  if (!assetPath) return null;

  const assetRequest = new Request(new URL(assetPath, url.origin), {
    method: request.method,
    headers: request.headers
  });
  const response = await env.ASSETS.fetch(assetRequest);
  if (response.status === 404) return null;

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-public-page-routes', VERSION);
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request, env, ctx) {
    const publicAsset = await servePublicAsset(request, env);
    if (publicAsset) return publicAsset;
    return app.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    if (typeof app.scheduled === 'function') return app.scheduled(event, env, ctx);
  },

  async email(message, env, ctx) {
    if (typeof app.email === 'function') return app.email(message, env, ctx);
  }
};
