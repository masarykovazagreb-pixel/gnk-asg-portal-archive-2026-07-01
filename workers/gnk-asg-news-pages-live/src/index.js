const PUBLIC_ORIGIN = 'https://gnk-asg.hr';

const REPAIR_MARKUP = [
  '<link id="gnk-functional-repair-css" rel="stylesheet" href="/assets/portal-functional-repair-v1.css?v=20260621-2">',
  '<script id="gnk-portal-ui-repair" defer src="/assets/portal-ui-repair-v1.js?v=20260621-2"></script>'
].join('');

export default {
  async fetch(request, env) {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    }

    const url = new URL(request.url);
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html') || !response.body) {
      return withHeaders(response, url.pathname.startsWith('/news/') ? 'en' : 'hr');
    }

    const metadata = url.pathname.startsWith('/news/')
      ? { language: 'en', canonical: `${PUBLIC_ORIGIN}/news/`, alternate: `${PUBLIC_ORIGIN}/vijesti/`, locale: 'en_US' }
      : { language: 'hr', canonical: `${PUBLIC_ORIGIN}/vijesti/`, alternate: `${PUBLIC_ORIGIN}/news/`, locale: 'hr_HR' };

    const transformed = new HTMLRewriter()
      .on('html', {
        element(element) {
          element.setAttribute('lang', metadata.language);
          element.setAttribute('data-gnk-theme', 'dark');
        }
      })
      .on('link[rel="canonical"]', { element(element) { element.remove(); } })
      .on('link[rel="alternate"][hreflang]', { element(element) { element.remove(); } })
      .on('meta[property="og:url"]', { element(element) { element.remove(); } })
      .on('meta[property="og:locale"]', { element(element) { element.remove(); } })
      .on('head', {
        element(element) {
          element.append([
            `<link rel="canonical" href="${metadata.canonical}">`,
            `<link rel="alternate" hreflang="${metadata.language}" href="${metadata.canonical}">`,
            `<link rel="alternate" hreflang="${metadata.language === 'hr' ? 'en' : 'hr'}" href="${metadata.alternate}">`,
            `<meta property="og:url" content="${metadata.canonical}">`,
            `<meta property="og:locale" content="${metadata.locale}">`,
            REPAIR_MARKUP
          ].join(''), { html: true });
        }
      })
      .transform(response);

    return withHeaders(transformed, metadata.language);
  }
};

function withHeaders(response, language) {
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store');
  headers.set('content-language', language);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('x-frame-options', 'SAMEORIGIN');
  headers.set('x-gnk-asg-news-pages-live', 'true');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
