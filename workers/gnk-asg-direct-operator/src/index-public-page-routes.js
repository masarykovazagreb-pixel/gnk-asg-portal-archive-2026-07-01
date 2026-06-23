import app from './index-dark-market-recovery.js';

const VERSION = 'GNK_ASG_PUBLIC_PAGE_ROUTES_V3';

const publicPages = new Map([
  ['/auto-editor', '/public-pages/auto-editor.txt'],
  ['/auto-editor/', '/public-pages/auto-editor.txt'],
  ['/auto-editor/index.html', '/public-pages/auto-editor.txt'],
  ['/media-kit', '/public-pages/media-kit.txt'],
  ['/media-kit/', '/public-pages/media-kit.txt'],
  ['/media-kit/index.html', '/public-pages/media-kit.txt']
]);

async function servePublicPage(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  if (!env.ASSETS || typeof env.ASSETS.fetch !== 'function') return null;

  const url = new URL(request.url);
  const templatePath = publicPages.get(url.pathname);
  if (!templatePath) return null;

  const templateRequest = new Request(new URL(templatePath, url.origin), {
    method: request.method,
    headers: request.headers
  });
  const response = await env.ASSETS.fetch(templateRequest);
  if (!response.ok) {
    return new Response('Public page template is unavailable.', {
      status: 503,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'x-gnk-asg-public-page-routes': VERSION
      }
    });
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-public-page-routes', VERSION);
  return new Response(response.body, { status: 200, headers });
}

export default {
  async fetch(request, env, ctx) {
    const publicPage = await servePublicPage(request, env);
    if (publicPage) return publicPage;
    return app.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    if (typeof app.scheduled === 'function') return app.scheduled(event, env, ctx);
  },

  async email(message, env, ctx) {
    if (typeof app.email === 'function') return app.email(message, env, ctx);
  }
};
