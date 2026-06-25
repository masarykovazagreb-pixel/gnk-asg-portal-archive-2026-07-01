const PUBLIC_ORIGIN = 'https://gnk-asg.hr';
const V13_CSS = '<link rel="stylesheet" href="/assets/public-visual-v13.css?v=20260625-v13">';
const V13_MENU = '<script defer src="/assets/public-menu-v13.js?v=20260625-v13"></script>';

export default {
  async fetch(request, env) {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    }

    const url = new URL(request.url);
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';
    const english = url.pathname.startsWith('/news/');

    if (!contentType.includes('text/html') || !response.body) {
      return withHeaders(response, english ? 'en' : 'hr');
    }

    const metadata = english
      ? { language: 'en', canonical: `${PUBLIC_ORIGIN}/news/`, alternate: `${PUBLIC_ORIGIN}/vijesti/`, locale: 'en_US' }
      : { language: 'hr', canonical: `${PUBLIC_ORIGIN}/vijesti/`, alternate: `${PUBLIC_ORIGIN}/news/`, locale: 'hr_HR' };

    const transformed = new HTMLRewriter()
      .on('html', {
        element(element) {
          element.setAttribute('lang', metadata.language);
          element.setAttribute('data-gnk-theme', 'dark');
        }
      })
      .on('body', {
        element(element) {
          const existing = element.getAttribute('class') || '';
          element.setAttribute('class', `${existing} gnk-public-v13 gnk-route-news`.trim());
          element.setAttribute('data-language', metadata.language);
          element.append(V13_MENU, { html: true });
        }
      })
      .on('link[rel="canonical"]', { element(element) { element.remove(); } })
      .on('link[rel="alternate"][hreflang]', { element(element) { element.remove(); } })
      .on('meta[property="og:url"]', { element(element) { element.remove(); } })
      .on('meta[property="og:locale"]', { element(element) { element.remove(); } })
      .on('link[href*="public-menu-unified-v12.css"]', { element(element) { element.remove(); } })
      .on('link[href*="public-visual-v13.css"]', { element(element) { element.remove(); } })
      .on('script[src*="public-menu-final-v9.js"]', { element(element) { element.remove(); } })
      .on('script[src*="public-menu-v13.js"]', { element(element) { element.remove(); } })
      .on('script[src*="gnk-asg-global-layer.js"]', { element(element) { element.remove(); } })
      .on('link[href*="gnk-asg-global-layer.css"]', { element(element) { element.remove(); } })
      .on('.news-actions', { element(element) { element.remove(); } })
      .on('head', {
        element(element) {
          element.append([
            `<link rel="canonical" href="${metadata.canonical}">`,
            `<link rel="alternate" hreflang="${metadata.language}" href="${metadata.canonical}">`,
            `<link rel="alternate" hreflang="${metadata.language === 'hr' ? 'en' : 'hr'}" href="${metadata.alternate}">`,
            `<meta property="og:url" content="${metadata.canonical}">`,
            `<meta property="og:locale" content="${metadata.locale}">`,
            V13_CSS
          ].join(''), { html: true });
        }
      })
      .transform(response);

    return withHeaders(transformed, metadata.language);
  }
};

function withHeaders(response, language) {
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('content-language', language);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('x-frame-options', 'SAMEORIGIN');
  headers.set('x-gnk-asg-news-pages-live', 'true');
  headers.set('x-gnk-asg-public-visual', 'GNK_ASG_PUBLIC_VISUAL_V13_20260625');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
