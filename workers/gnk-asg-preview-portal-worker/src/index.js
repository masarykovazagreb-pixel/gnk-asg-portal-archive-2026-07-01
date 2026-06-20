const LIVE_ORIGIN = 'https://gnk-asg.hr';
const SOCIAL_SHARE_ORIGIN = 'https://gnk-asg-social-share-preview.beckuphome.workers.dev';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/__preview/locale') {
      const country = String(request.cf?.country || request.headers.get('cf-ipcountry') || 'XX').toUpperCase();
      return json({
        ok: true,
        country,
        defaultLanguage: country === 'HR' ? 'hr' : 'en',
        ipStored: false,
        preferenceStorage: 'browser-only',
        updatedAt: new Date().toISOString()
      });
    }

    if (url.pathname === '/__preview/status') {
      return json({
        ok: true,
        service: 'GNK ASG Business Light Preview',
        productionRouteConfigured: false,
        productionWritesAllowed: false,
        liveReadProxy: true,
        socialSharePreview: SOCIAL_SHARE_ORIGIN,
        updatedAt: new Date().toISOString()
      });
    }

    if (url.pathname.startsWith('/api/social-share/') || url.pathname.startsWith('/s/')) {
      return proxySocialShare(request, url);
    }

    if (isWriteLocked(request, url.pathname)) {
      return json({
        ok: false,
        error: 'preview_write_locked',
        message: 'Ova radnja je zaključana u preview verziji. Produkcija nije promijenjena.',
        path: url.pathname
      }, 423);
    }

    if (shouldProxyRead(request, url.pathname)) {
      return proxyLiveRead(request, url);
    }

    const response = await env.ASSETS.fetch(request);
    return enhanceStaticResponse(response);
  }
};

function isWriteLocked(request, pathname) {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return false;
  if (pathname === '/api/ai-assist' || pathname.startsWith('/api/ai-assist/')) return false;
  return pathname.startsWith('/api/') ||
    pathname.startsWith('/operator/') ||
    pathname.startsWith('/auto-editor') ||
    pathname.startsWith('/command-center') ||
    pathname.startsWith('/publish');
}

function shouldProxyRead(request, pathname) {
  if (request.method === 'POST' && (pathname === '/api/ai-assist' || pathname.startsWith('/api/ai-assist/'))) return true;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return false;
  return pathname.startsWith('/data/') ||
    pathname.startsWith('/api/market') ||
    pathname.startsWith('/api/contact-mailboxes') ||
    pathname.startsWith('/api/contact-submit') ||
    pathname.startsWith('/api/ai-assist') ||
    pathname.startsWith('/api/mail-center/') ||
    pathname.startsWith('/operator/contact-inbox') ||
    pathname.startsWith('/operator/mail-log-list') ||
    pathname.startsWith('/backend-status');
}

async function proxyLiveRead(request, previewUrl) {
  const liveUrl = new URL(previewUrl.pathname + previewUrl.search, LIVE_ORIGIN);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cookie');
  headers.set('x-gnk-asg-preview-proxy', 'read-only');

  const init = {
    method: request.method,
    headers,
    redirect: 'follow'
  };

  if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body;
  const response = await fetch(liveUrl, init);
  return withPreviewHeaders(response);
}

async function proxySocialShare(request, previewUrl) {
  const target = new URL(previewUrl.pathname + previewUrl.search, SOCIAL_SHARE_ORIGIN);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cookie');
  headers.set('x-gnk-asg-preview-proxy', 'social-share');
  const init = { method: request.method, headers, redirect: 'follow' };
  if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body;
  const response = await fetch(target, init);
  return withPreviewHeaders(response);
}

function enhanceStaticResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') || !response.body) return withPreviewHeaders(response);
  const transformed = new HTMLRewriter()
    .on('head', {
      element(element) {
        element.append('<script defer src="/assets/admin-universal-shell.js?v=20260620-10"></script>', { html: true });
      }
    })
    .transform(response);
  return withPreviewHeaders(transformed);
}

function withPreviewHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('x-gnk-asg-preview', 'true');
  headers.set('x-gnk-asg-production-changed', 'false');
  headers.set('cache-control', 'no-store');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-gnk-asg-preview': 'true',
      'x-gnk-asg-production-changed': 'false'
    }
  });
}
