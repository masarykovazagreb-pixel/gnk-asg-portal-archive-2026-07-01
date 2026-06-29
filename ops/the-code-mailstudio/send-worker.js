import {handleManualMailService} from '../../workers/gnk-asg-direct-operator/src/manual-mail-service-v1.js';

const clean = value => String(value ?? '').trim();

function secureEqual(a, b) {
  const left = new TextEncoder().encode(String(a || ''));
  const right = new TextEncoder().encode(String(b || ''));
  let mismatch = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    mismatch |= (left[i % Math.max(left.length, 1)] || 0) ^
      (right[i % Math.max(right.length, 1)] || 0);
  }
  return mismatch === 0 && left.length >= 32;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/send' || request.method !== 'POST') {
      return new Response('Not found', {status: 404, headers: {'cache-control': 'no-store'}});
    }
    const supplied = clean(request.headers.get('x-gnk-mail-once-nonce'));
    if (!secureEqual(supplied, env.SEND_NONCE)) {
      return new Response('Not found', {status: 404, headers: {'cache-control': 'no-store'}});
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ok: false, error: 'invalid_json'}), {
        status: 400,
        headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'}
      });
    }
    const internal = new Request('https://mail-studio.internal/api/admin-mail-send', {
      method: 'POST',
      headers: {'content-type': 'application/json; charset=utf-8'},
      body: JSON.stringify({...body, profile: 'media', confirm: 'SEND_MAIL'})
    });
    return handleManualMailService(internal, env);
  }
};
