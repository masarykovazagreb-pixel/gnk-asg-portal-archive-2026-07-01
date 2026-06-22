const MAIL_AGENT_BASE = 'https://gnk-asg-mail-agent-preview.beckuphome.workers.dev';

function suppliedToken(request) {
  const authorization = String(request.headers.get('authorization') || '');
  const bearer = authorization.replace(/^Bearer\s+/i, '').trim();
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

async function operatorAuthorized(request, env) {
  const candidate = suppliedToken(request);
  const localTokens = [
    env.OPERATOR_TOKEN,
    env.GNK_ASG_OPERATOR_TOKEN
  ].map(value => String(value || '').trim()).filter(Boolean);

  if (localTokens.some(token => safeEqual(candidate, token))) return true;
  if (!candidate) return false;

  try {
    const response = await fetch('https://operator.gnk-asg.hr/operator/status', {
      method: 'GET',
      headers: request.headers,
      redirect: 'manual'
    });

    return response.status === 200;
  } catch {
    return false;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export async function handleMailAgentProxy(request, env) {
  const sourceUrl = new URL(request.url);

  if (!sourceUrl.pathname.startsWith('/api/mail-agent/')) {
    return null;
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': 'https://gnk-asg.hr',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'content-type,authorization,x-operator-token',
        'access-control-max-age': '600',
        'cache-control': 'no-store',
        vary: 'Origin'
      }
    });
  }

  if (!await operatorAuthorized(request, env)) {
    return json({
      ok: false,
      error: 'unauthorized',
      message: 'Operator sesija nije potvrđena.'
    }, 401);
  }

  const internalToken = String(
    env.OPERATOR_TOKEN ||
    env.GNK_ASG_OPERATOR_TOKEN ||
    ''
  ).trim();

  if (!internalToken) {
    return json({
      ok: false,
      error: 'mail_proxy_secret_missing'
    }, 503);
  }

  const targetUrl = new URL(
    sourceUrl.pathname + sourceUrl.search,
    MAIL_AGENT_BASE
  );

  const headers = new Headers(request.headers);
  headers.set('authorization', `Bearer ${internalToken}`);
  headers.set('x-operator-token', internalToken);
  headers.delete('host');
  headers.delete('content-length');

  const upstream = await fetch(targetUrl.toString(), {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : request.body,
    redirect: 'manual'
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set('cache-control', 'no-store');
  responseHeaders.set('x-gnk-asg-mail-proxy', 'same-origin-v1');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
}