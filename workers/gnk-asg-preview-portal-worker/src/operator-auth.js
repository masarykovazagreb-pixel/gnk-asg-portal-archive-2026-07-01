export function handlePreviewOperatorStatus(request, env) {
  const supplied = readOperatorToken(request);
  const expected = String(env.PREVIEW_OPERATOR_TOKEN || '').trim();

  if (!supplied) {
    return json({
      ok: false,
      error: 'operator_token_required',
      productionWritesAllowed: false
    }, 401);
  }

  if (!expected) {
    return json({
      ok: false,
      error: 'operator_token_not_configured',
      productionWritesAllowed: false
    }, 503);
  }

  if (!constantTimeEqual(supplied, expected)) {
    return json({
      ok: false,
      error: 'operator_token_invalid',
      productionWritesAllowed: false
    }, 403);
  }

  return json({
    ok: true,
    authenticated: true,
    scope: 'preview-readiness',
    productionWritesAllowed: false,
    updatedAt: new Date().toISOString()
  });
}

function readOperatorToken(request) {
  const direct = String(request.headers.get('x-operator-token') || '').trim();
  if (direct) return direct;

  const authorization = String(request.headers.get('authorization') || '').trim();
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-gnk-asg-preview': 'true',
      'x-gnk-asg-production-changed': 'false'
    }
  });
}
