import core from './index-v3.js';

const PROTECTED = new Set([
  '/api/operator-send-mail',
  '/api/admin-mail-send',
  '/api/operator-mailbox-config',
  '/api/operator-signature-load',
  '/api/operator-signature-save',
  '/api/operator-mail-log'
]);

function suppliedToken(request) {
  const authorization = request.headers.get('authorization') || '';
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);
  const url = new URL(request.url);
  return String(
    (bearer && bearer[1]) ||
    request.headers.get('x-operator-token') ||
    request.headers.get('x-admin-token') ||
    url.searchParams.get('token') ||
    ''
  ).trim();
}

function constantTimeEqual(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashAuthorized(request, env) {
  const supplied = suppliedToken(request);
  const expected = String(env.OPERATOR_TOKEN_SHA256 || '').trim().toLowerCase();
  if (!supplied || !expected || expected.length !== 64) return false;
  return constantTimeEqual(await sha256(supplied), expected);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
      'access-control-allow-origin':'*',
      'access-control-allow-methods':'GET, POST, OPTIONS',
      'access-control-allow-headers':'content-type, authorization, x-operator-token, x-admin-token'
    }
  });
}

function patchedEnvironment(env, supplied) {
  return new Proxy(env, {
    get(target, property, receiver) {
      if (property === 'GNK_ASG_OPERATOR_TOKEN') return supplied;
      return Reflect.get(target, property, receiver);
    }
  });
}

function isProtected(path) {
  return PROTECTED.has(path) || path.startsWith('/api/mail-center/');
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';

    if (path === '/api/operator-auth-check') {
      if (request.method === 'OPTIONS') return new Response(null, { status:204, headers:json({}).headers });
      const ok = await hashAuthorized(request, env);
      return json({ ok, authenticated:ok, worker:'gnk-asg-contact-api', version:'gnk-asg-mail-unified-v3-20260626' }, ok ? 200 : 401);
    }

    if (isProtected(path)) {
      if (!(await hashAuthorized(request, env))) return core.fetch(request, env, ctx);
      const supplied = suppliedToken(request);
      return core.fetch(request, patchedEnvironment(env, supplied), ctx);
    }

    return core.fetch(request, env, ctx);
  },

  async email(message, env, ctx) {
    if (typeof core.email === 'function') return core.email(message, env, ctx);
  }
};
