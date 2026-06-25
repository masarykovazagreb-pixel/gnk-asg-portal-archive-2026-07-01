const VERSION = 'GNK_ASG_PUBLIC_MENU_ROUTE_V2_20260625';
const TARGET = '/assets/public-menu-final-v9.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== TARGET) {
      return new Response('Not found', {
        status: 404,
        headers: { 'content-type': 'text/plain; charset=utf-8' }
      });
    }
    if (!env.ASSETS?.fetch) {
      return new Response('Assets binding missing', {
        status: 503,
        headers: { 'content-type': 'text/plain; charset=utf-8' }
      });
    }

    const response = await env.ASSETS.fetch(new Request(new URL(TARGET, request.url), request));
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('content-type', 'application/javascript; charset=utf-8');
    headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
    headers.set('x-gnk-asg-menu-fix', VERSION);

    return new Response(await response.arrayBuffer(), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
