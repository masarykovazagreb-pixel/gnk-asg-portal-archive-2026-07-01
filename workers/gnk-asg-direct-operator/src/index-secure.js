import core from './index.js';

const protectedPaths = new Set(['/api/media-upload', '/api/admin-asset-list']);
const allowedOrigins = new Set(['https://gnk-asg.hr']);

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

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;

    if (request.method === 'OPTIONS' && protectedPaths.has(path)) {
      return new Response(null, {
        status: 204,
        headers: protectedCorsHeaders(request)
      });
    }

    if (request.method === 'OPTIONS') {
      return core.fetch(request, env, ctx);
    }

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
            'cache-control': 'no-store',
            ...protectedCorsHeaders(request)
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
