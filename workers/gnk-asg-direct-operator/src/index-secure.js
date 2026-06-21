import core from './index.js';

const protectedPaths = new Set(['/api/media-upload', '/api/admin-asset-list']);

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (protectedPaths.has(path)) {
      const check = await fetch('https://operator.gnk-asg.hr/operator/status', {
        method: 'GET',
        headers: request.headers,
        redirect: 'manual'
      });
      if (check.status !== 200) {
        return new Response(JSON.stringify({ ok: false, error: 'authorization_required' }), {
          status: 401,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store'
          }
        });
      }
    }
    return core.fetch(request, env, ctx);
  },
  async scheduled(event, env, ctx) {
    if (typeof core.scheduled === 'function') return core.scheduled(event, env, ctx);
  },
  async email(message, env, ctx) {
    if (typeof core.email === 'function') return core.email(message, env, ctx);
  }
};
