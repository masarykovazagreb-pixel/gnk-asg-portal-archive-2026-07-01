const ASSET_ORIGIN = 'https://gnk-asg-public-pages-live.beckuphome.workers.dev';

export default {
  async fetch(request, env) {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { allow: 'GET, HEAD' }
      });
    }

    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html') || !response.body) {
      return withHeaders(response);
    }

    const transformed = new HTMLRewriter()
      .on('[src]', {
        element(element) {
          const value = element.getAttribute('src');
          if (value && value.startsWith('/assets/')) {
            element.setAttribute('src', ASSET_ORIGIN + value);
          }
        }
      })
      .on('[href]', {
        element(element) {
          const value = element.getAttribute('href');
          if (
            value &&
            (
              value.startsWith('/assets/') ||
              value === '/favicon.svg' ||
              value.startsWith('/site.webmanifest')
            )
          ) {
            element.setAttribute('href', ASSET_ORIGIN + value);
          }
        }
      })
      .transform(response);

    return withHeaders(transformed);
  }
};

function withHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('x-frame-options', 'SAMEORIGIN');
  headers.set('x-gnk-asg-public-pages-live', 'true');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
