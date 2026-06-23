import core from './index-news-quality-v2.js';

const BACKEND_PREFIXES = [
  '/auto-editor',
  '/operator-dashboard',
  '/operator-mobile',
  '/mail-studio',
  '/mail-studio-pro',
  '/admin-center',
  '/news-admin',
  '/pdf-publisher',
  '/social-share',
  '/wa-center',
  '/app',
  '/review'
];

const INDEX_PATHS = new Set(['/', '/en', '/en/']);

const CONTACT_PATHS = new Set([
  '/contact',
  '/contact/',
  '/en/contact',
  '/en/contact/'
]);

const BACKEND_ASSETS =
  '<link rel="stylesheet" href="/assets/backend-ui-shell.css?v=20260623-backend-5">' +
  '<script defer src="/assets/backend-ui-shell.js?v=20260623-backend-5"></script>';

const INDEX_ASSETS =
  '<link rel="stylesheet" href="/assets/index-iq200.css?v=20260623-iq200-2">' +
  '<link rel="stylesheet" href="/assets/visual-quality-v2.css?v=20260623-v2">' +
  '<script defer src="/assets/index-iq200.js?v=20260623-iq200-2"></script>' +
  '<script defer src="/assets/visual-quality-v2.js?v=20260623-v2"></script>' +
  '<script defer src="/assets/admin-route-bridge.js?v=20260623-admin-1"></script>';

const CONTACT_ASSETS =
  '<link rel="stylesheet" href="/assets/contact-quality-v2.css?v=20260623-v2">' +
  '<script defer src="/assets/contact-quality-v2.js?v=20260623-v2"></script>';

const PUBLIC_ASSETS =
  '<link rel="stylesheet" href="/assets/brand/gnk-asg-global-layer.css?v=20260624-global-7">' +
  '<link rel="stylesheet" href="/assets/public-site-unified-v6.css?v=20260624-public-7">' +
  '<link rel="stylesheet" href="/assets/public-menu-centered-v7.css?v=20260624-menu-center-7">' +
  '<script defer src="/assets/brand/gnk-asg-global-layer.js?v=20260624-global-7"></script>' +
  '<script defer src="/assets/public-site-unified-v6.js?v=20260624-public-7"></script>';

function isBackendPath(path) {
  return BACKEND_PREFIXES.some(prefix =>
    path === prefix || path.startsWith(`${prefix}/`)
  );
}

function cleanIndexTitle(html, path) {
  if (path === '/') {
    return html.replace(
      'Index / <span>početna stranica</span>',
      'Korporativni <span>ekosustav</span>'
    );
  }

  return html.replace(
    'Index / <span>home page</span>',
    'Corporate <span>ecosystem</span>'
  );
}

function stripSharedAssets(html) {
  return html
    .replace(/<link[^>]+gnk-asg-global-layer\.css[^>]*>/gi,'')
    .replace(/<script[^>]+gnk-asg-global-layer\.js[^>]*><\/script>/gi,'')
    .replace(/<link[^>]+public-site-unified-v6\.css[^>]*>/gi,'')
    .replace(/<script[^>]+public-site-unified-v6\.js[^>]*><\/script>/gi,'')
    .replace(/<link[^>]+public-menu-centered-v7\.css[^>]*>/gi,'');
}

function injectHtml(response, html, assets, cacheControl) {
  const headers = new Headers(response.headers);
  headers.delete('content-length');

  if (cacheControl) {
    headers.set('cache-control',cacheControl);
  }

  const normalized = stripSharedAssets(html);

  return new Response(
    normalized.replace('</head>',`${assets}</head>`),
    {
      status:response.status,
      statusText:response.statusText,
      headers
    }
  );
}

async function explicitAutoEditor(request, env, path) {
  if (!env.ASSETS?.fetch) return null;
  if (path !== '/auto-editor' && path !== '/auto-editor/') return null;
  const assetUrl = new URL('/auto-editor/index.html',request.url);
  return env.ASSETS.fetch(new Request(assetUrl.toString(),request));
}

async function fetchHandler(request, env, ctx) {
  const path = new URL(request.url).pathname;
  const explicit = await explicitAutoEditor(request,env,path);
  const response = explicit || await core.fetch(request,env,ctx);
  const type = response.headers.get('content-type') || '';
  const isHtml = request.method === 'GET' && type.includes('text/html');

  if (!isHtml) return response;

  const html = await response.text();

  if (isBackendPath(path)) {
    return injectHtml(
      response,
      html,
      BACKEND_ASSETS,
      'no-store, no-cache, must-revalidate, max-age=0'
    );
  }

  if (CONTACT_PATHS.has(path)) {
    return injectHtml(
      response,
      html,
      CONTACT_ASSETS + PUBLIC_ASSETS,
      'no-store, no-cache, must-revalidate, max-age=0'
    );
  }

  if (INDEX_PATHS.has(path)) {
    return injectHtml(
      response,
      cleanIndexTitle(html,path),
      INDEX_ASSETS + PUBLIC_ASSETS
    );
  }

  return injectHtml(
    response,
    html,
    PUBLIC_ASSETS
  );
}

export default {
  fetch:fetchHandler,

  async scheduled(event,env,ctx) {
    if (typeof core.scheduled === 'function') {
      return core.scheduled(event,env,ctx);
    }
  },

  async email(message,env,ctx) {
    if (typeof core.email === 'function') {
      return core.email(message,env,ctx);
    }
  }
};