export default {
  async fetch(request, env) {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    }

    const url = new URL(request.url);
    const path = normalisePath(url.pathname);
    const explicit = new Map([
      ['/en/', '/en/index.html'],
      ['/markets/', '/markets/index.html'],
      ['/news/', '/news/index.html'],
      ['/en/assistant/', '/en/assistant/index.html'],
      ['/en/legal/', '/en/legal/index.html']
    ]);

    const assetPath = explicit.get(path) || path;
    const assetUrl = new URL(assetPath, url.origin);
    assetUrl.search = url.search;
    const assetRequest = new Request(assetUrl.toString(), {
      method: request.method,
      headers: request.headers
    });

    const response = await env.ASSETS.fetch(assetRequest);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html') || request.method === 'HEAD') {
      return withHeaders(response, path);
    }

    let html = await response.text();
    if (path === '/en/') {
      html = html
        .replaceAll('https://gnk-asg.hr/objave/', 'https://gnk-asg.hr/publications/')
        .replaceAll('href="/objave/"', 'href="/publications/"')
        .replaceAll("href='/objave/'", "href='/publications/'")
        .replaceAll('value="/objave/"', 'value="/publications/"')
        .replaceAll("value='/objave/'", "value='/publications/'");
    }

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('content-type', 'text/html; charset=utf-8');
    headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
    headers.set('x-gnk-asg-public-route-fix', '2026-06-23-v1');
    headers.set('x-content-type-options', 'nosniff');

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};

function normalisePath(value) {
  const path = String(value || '/').replace(/\/{2,}/g, '/');
  if (path === '/') return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

function withHeaders(response, path) {
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-public-route-fix', '2026-06-23-v1');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('content-language', path.startsWith('/en/') || path === '/markets/' || path === '/news/' ? 'en' : 'hr');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
