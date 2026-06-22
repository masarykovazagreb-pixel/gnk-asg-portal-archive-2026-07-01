import secure from './index-secure.js';

const sendAliases = new Set([
  '/api/admin-mail-send',
  '/api/operator-send-mail'
]);

function rewriteAlias(request) {
  const url = new URL(request.url);
  if (request.method === 'POST' && sendAliases.has(url.pathname)) {
    url.pathname = '/api/mail-agent/send';
    return new Request(url.toString(), request);
  }
  return request;
}

export default {
  async fetch(request, env, ctx) {
    return secure.fetch(rewriteAlias(request), env, ctx);
  },

  async email(message, env, ctx) {
    if (typeof secure.email === 'function') {
      return secure.email(message, env, ctx);
    }
  }
};
