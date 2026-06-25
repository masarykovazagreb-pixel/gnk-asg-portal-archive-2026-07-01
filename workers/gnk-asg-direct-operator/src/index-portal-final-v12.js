import core from './index-portal-experience-v10.js';

const VERSION = 'GNK_ASG_PORTAL_FINAL_V12_20260625';

async function fetchHandler(request, env, ctx) {
  const response = await core.fetch(request, env, ctx);
  const path = new URL(request.url).pathname;
  if (request.method !== 'GET' || !['/operator-dashboard','/operator-dashboard/'].includes(path)) return response;
  if (!response.headers.get('content-type')?.includes('text/html')) return response;

  const pattern = /if\([a-zA-Z_$][\w$]*\(\)\)\{\s*document\.getElementById\("login"\)/;
  const html = (await response.text()).replace(pattern, 'if(false){document.getElementById("login")');
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'no-store');
  headers.set('x-gnk-asg-portal-final', VERSION);
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

export default {
  fetch: fetchHandler,
  async scheduled(event, env, ctx) {
    if (typeof core.scheduled === 'function') return core.scheduled(event, env, ctx);
  },
  async email(message, env, ctx) {
    if (typeof core.email === 'function') return core.email(message, env, ctx);
  }
};

export { VERSION };
