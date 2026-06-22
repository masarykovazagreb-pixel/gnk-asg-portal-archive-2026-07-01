import core from './index.js';

const publicPaths = new Set(['/api/mail-agent/health','/api/mail-agent/status']);

function suppliedToken(request) {
  const bearer = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i,'').trim();
  return String(request.headers.get('x-operator-token') || bearer).trim();
}

function safeEqual(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  if (!a || !b || a.length !== b.length) return false;

  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

async function operatorAuthorized(request) {
  if (!suppliedToken(request)) return false;
  try {
    const response = await fetch('https://operator.gnk-asg.hr/operator/status', {
      method:'GET',
      headers:request.headers,
      redirect:'manual'
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

function envWithVerifiedOperatorToken(env, verifiedToken) {
  const existing = String(env.OPERATOR_TOKEN || env.GNK_ASG_OPERATOR_TOKEN || '').trim();
  if (existing || !verifiedToken) return env;

  return new Proxy(env, {
    get(target, property, receiver) {
      if (property === 'OPERATOR_TOKEN') return verifiedToken;
      return Reflect.get(target, property, receiver);
    }
  });
}

function internalRequest(request, env, verifiedToken = '') {
  const internalToken = String(
    env.OPERATOR_TOKEN ||
    env.GNK_ASG_OPERATOR_TOKEN ||
    verifiedToken ||
    ''
  ).trim();
  if (!internalToken) return request;

  const headers = new Headers(request.headers);
  headers.set('authorization',`Bearer ${internalToken}`);
  headers.set('x-operator-token',internalToken);
  return new Request(request,{headers});
}

function unauthorizedResponse() {
  return new Response(JSON.stringify({ok:false,error:'unauthorized',message:'Operator sesija nije potvrđena.'}), {
    status:401,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store',
      'access-control-allow-origin':'https://gnk-asg.hr',
      'access-control-allow-methods':'GET,POST,OPTIONS',
      'access-control-allow-headers':'content-type,authorization,x-operator-token',
      'vary':'Origin'
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const pathname = new URL(request.url).pathname;
    if (request.method === 'OPTIONS' || publicPaths.has(pathname)) return core.fetch(request,env,ctx);

    const candidate = suppliedToken(request);
    const expected = String(env.OPERATOR_TOKEN || env.GNK_ASG_OPERATOR_TOKEN || '').trim();
    const directMatch = Boolean(expected && safeEqual(candidate, expected));
    if (directMatch) return core.fetch(request,env,ctx);

    if (!candidate || !await operatorAuthorized(request)) {
      return unauthorizedResponse();
    }

    const effectiveEnv = envWithVerifiedOperatorToken(env, candidate);
    return core.fetch(internalRequest(request,effectiveEnv,candidate),effectiveEnv,ctx);
  },

  async email(message,env,ctx) {
    if (typeof core.email === 'function') return core.email(message,env,ctx);
  }
};
