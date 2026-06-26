import app from './index-article-automation-v2.js';
import { patchPublicHtml, transformHtml } from './public-shell-v11.js';

export const INDEX_LOCK_VERSION = 'GNK_ASG_INDEX_LOCK_V4_20260626';
const INDEX_PATHS = new Map([
  ['/', '/index.html'],
  ['/en', '/en/index.html']
]);

function normalize(path) {
  return path.replace(/\/+$/, '') || '/';
}

async function lockedIndex(request, env, path) {
  if (!env.ASSETS?.fetch) return null;
  const assetPath = INDEX_PATHS.get(path);
  if (!assetPath) return null;
  const target = new URL(assetPath, request.url);
  const source = await env.ASSETS.fetch(new Request(target, {
    method:'GET',
    headers:request.headers
  }));
  if (!source.ok) return null;
  const response = await transformHtml(source, html => patchPublicHtml(html, path === '/' ? '/' : '/en/'));
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-index-lock', INDEX_LOCK_VERSION);
  headers.set('x-gnk-asg-index-source', assetPath);
  headers.set('vary', 'accept-encoding');
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status:200,
    headers
  });
}

export default {
  async fetch(request, env, ctx) {
    const path = normalize(new URL(request.url).pathname);
    if (['GET', 'HEAD'].includes(request.method) && INDEX_PATHS.has(path)) {
      const response = await lockedIndex(request, env, path);
      if (response) return response;
    }
    const response = await app.fetch(request, env, ctx);
    const headers = new Headers(response.headers);
    headers.set('x-gnk-asg-index-lock', INDEX_LOCK_VERSION);
    return new Response(response.body, {
      status:response.status,
      statusText:response.statusText,
      headers
    });
  },
  async scheduled(event, env, ctx) {
    if (typeof app.scheduled === 'function') return app.scheduled(event, env, ctx);
  },
  async email(message, env, ctx) {
    if (typeof app.email === 'function') return app.email(message, env, ctx);
  }
};
