const ASSET_ORIGIN = 'https://gnk-asg-public-pages-live.beckuphome.workers.dev';
const PUBLIC_ORIGIN = 'https://gnk-asg.hr';

const LANGUAGE_PAIRS = [
  { hr: '/', en: '/en/' },
  { hr: '/objave/', en: '/publications/' },
  { hr: '/vijesti/', en: '/news/' },
  { hr: '/trzista/', en: '/markets/' },
  { hr: '/videoteka/', en: '/en/video-library/' },
  { hr: '/video/', en: '/en/video/' },
  { hr: '/platforme/bpp/', en: '/en/platforms/bpp/' },
  { hr: '/media-kit/', en: '/en/media-kit/' },
  { hr: '/contact/', en: '/en/contact/' },
  { hr: '/legal/', en: '/en/legal/' },
  { hr: '/privatnost/', en: '/en/privacy/' },
  { hr: '/uvjeti-koristenja/', en: '/en/terms/' },
  { hr: '/kolacici/', en: '/en/cookies/' }
];

const CONTACT_PATHS = new Set(['/contact/', '/en/contact/']);

export default {
  async fetch(request, env) {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { allow: 'GET, HEAD' }
      });
    }

    const url = new URL(request.url);
    const normalisedPath = normalisePath(url.pathname);
    const routeSeo = languageMetadata(normalisedPath);
    const isContactRoute = CONTACT_PATHS.has(normalisedPath);
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html') || !response.body) {
      return withHeaders(response, routeSeo?.language);
    }

    let rewriter = new HTMLRewriter()
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
      });

    if (routeSeo) {
      rewriter = rewriter
        .on('html', {
          element(element) {
            element.setAttribute('lang', routeSeo.language);
          }
        })
        .on('link[rel="canonical"]', {
          element(element) {
            element.remove();
          }
        })
        .on('link[rel="alternate"][hreflang]', {
          element(element) {
            element.remove();
          }
        })
        .on('meta[property="og:url"]', {
          element(element) {
            element.remove();
          }
        })
        .on('meta[property="og:locale"]', {
          element(element) {
            element.remove();
          }
        })
        .on('head', {
          element(element) {
            element.append(seoMarkup(routeSeo), { html: true });
            if (isContactRoute) {
              element.append(contactRepairMarkup(), { html: true });
            }
          }
        });
    }

    return withHeaders(rewriter.transform(response), routeSeo?.language);
  }
};

function normalisePath(value) {
  const path = String(value || '/').replace(/\/{2,}/g, '/');
  if (path === '/') return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

function languageMetadata(pathname) {
  const path = normalisePath(pathname);
  for (const pair of LANGUAGE_PAIRS) {
    if (path === pair.hr) {
      return {
        language: 'hr',
        canonical: `${PUBLIC_ORIGIN}${pair.hr}`,
        hr: `${PUBLIC_ORIGIN}${pair.hr}`,
        en: `${PUBLIC_ORIGIN}${pair.en}`,
        xDefault: `${PUBLIC_ORIGIN}${pair.hr}`,
        ogLocale: 'hr_HR'
      };
    }
    if (path === pair.en) {
      return {
        language: 'en',
        canonical: `${PUBLIC_ORIGIN}${pair.en}`,
        hr: `${PUBLIC_ORIGIN}${pair.hr}`,
        en: `${PUBLIC_ORIGIN}${pair.en}`,
        xDefault: `${PUBLIC_ORIGIN}${pair.hr}`,
        ogLocale: 'en_US'
      };
    }
  }
  return null;
}

function seoMarkup(metadata) {
  return [
    `<link rel="canonical" href="${metadata.canonical}">`,
    `<link rel="alternate" hreflang="hr" href="${metadata.hr}">`,
    `<link rel="alternate" hreflang="en" href="${metadata.en}">`,
    `<link rel="alternate" hreflang="x-default" href="${metadata.xDefault}">`,
    `<meta property="og:url" content="${metadata.canonical}">`,
    `<meta property="og:locale" content="${metadata.ogLocale}">`
  ].join('');
}

function contactRepairMarkup() {
  return [
    `<link id="gnk-functional-repair-css" rel="stylesheet" href="${ASSET_ORIGIN}/assets/portal-functional-repair-v1.css?v=20260622-1">`,
    `<script defer src="${ASSET_ORIGIN}/assets/portal-ui-repair-v1.js?v=20260622-1"></script>`,
    `<script defer src="${ASSET_ORIGIN}/assets/contact-form-repair-v1.js?v=20260622-1"></script>`
  ].join('');
}

function withHeaders(response, language) {
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('x-frame-options', 'SAMEORIGIN');
  headers.set('x-gnk-asg-public-pages-live', 'true');
  headers.set('content-language', language || (response.url?.includes('/en/') ? 'en' : 'hr'));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
