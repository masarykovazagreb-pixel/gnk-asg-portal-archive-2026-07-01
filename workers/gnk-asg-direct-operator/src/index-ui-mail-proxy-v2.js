import app from './index-ui-harmonizer.js';

const MAIL_API_ORIGIN = 'https://gnk-asg-contact-api.beckuphome.workers.dev';
const PROXY_PATHS = new Set([
  '/api/operator-auth-check',
  '/api/operator-send-mail',
  '/api/admin-mail-send',
  '/api/operator-mailbox-config',
  '/api/operator-signature-load',
  '/api/operator-signature-save',
  '/api/operator-mail-log'
]);

async function proxyMailApi(request) {
  const incoming = new URL(request.url);
  const target = new URL(`${incoming.pathname}${incoming.search}`, MAIL_API_ORIGIN);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('x-gnk-asg-proxy', 'direct-operator-mail-v2');

  const init = {
    method: request.method,
    headers,
    redirect: 'manual'
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    init.duplex = 'half';
  }

  const response = await fetch(target.toString(), init);
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('x-gnk-asg-mail-proxy', 'v2');
  responseHeaders.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
  responseHeaders.delete('content-length');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
    if (PROXY_PATHS.has(path)) return proxyMailApi(request);
    return app.fetch(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    if (typeof app.scheduled === 'function') return app.scheduled(event, env, ctx);
  },

  async email(message, env, ctx) {
    if (typeof app.email === 'function') return app.email(message, env, ctx);
  }
};
