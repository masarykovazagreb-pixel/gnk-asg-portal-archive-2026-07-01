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

const SENSITIVE_UI_PREFIXES = [
  '/operator-dashboard',
  '/operator-mobile',
  '/mail-studio',
  '/mail-studio-pro',
  '/admin-center',
  '/news-admin',
  '/pdf-publisher',
  '/social-share',
  '/wa-center',
  '/review'
];

const SESSION_COOKIE = 'gnk_asg_admin_session';
const SESSION_MAX_AGE = 12 * 60 * 60;
const DEFAULT_ADMIN_PATH = '/operator-dashboard/';
const encoder = new TextEncoder();

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

const PUBLIC_LINK_GUARD = `<script id="gnk-public-sensitive-link-guard">
(() => {
  const blocked = ['/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center','/news-admin','/pdf-publisher','/social-share','/wa-center','/review'];
  const removeSensitiveLinks = () => {
    document.querySelectorAll('a[href]').forEach(link => {
      try {
        const path = new URL(link.getAttribute('href'), location.origin).pathname.replace(/\\/+$/, '') || '/';
        if (blocked.some(prefix => path === prefix || path.startsWith(prefix + '/'))) link.remove();
      } catch {}
    });
  };
  document.addEventListener('DOMContentLoaded', removeSensitiveLinks, { once: true });
  new MutationObserver(removeSensitiveLinks).observe(document.documentElement, { childList: true, subtree: true });
  removeSensitiveLinks();
})();
</script>`;

const PUBLIC_ASSETS =
  '<link rel="stylesheet" href="/assets/brand/gnk-asg-global-layer.css?v=20260624-global-9">' +
  '<link rel="stylesheet" href="/assets/public-site-unified-v6.css?v=20260624-public-9">' +
  '<link rel="stylesheet" href="/assets/public-menu-centered-v7.css?v=20260624-menu-center-9">' +
  '<script defer src="/assets/brand/gnk-asg-global-layer.js?v=20260624-global-9"></script>' +
  '<script defer src="/assets/public-site-unified-v6.js?v=20260624-public-9"></script>' +
  '<script defer src="/assets/public-menu-final-v9.js?v=20260624-menu-final-9"></script>' +
  PUBLIC_LINK_GUARD;

function isBackendPath(path) {
  return BACKEND_PREFIXES.some(prefix =>
    path === prefix || path.startsWith(`${prefix}/`)
  );
}

function isSensitiveUiPath(path) {
  return SENSITIVE_UI_PREFIXES.some(prefix =>
    path === prefix || path.startsWith(`${prefix}/`)
  );
}

function operatorSecrets(env) {
  return [
    env.GNK_ASG_OPERATOR_TOKEN,
    env.OPERATOR_TOKEN,
    env.GNK_ASG_ADMIN_TOKEN,
    env.ADMIN_TOKEN,
    env.NEWS_PUBLISH_TOKEN
  ].map(value => String(value || '').trim()).filter(Boolean);
}

function requestToken(request) {
  const authorization = request.headers.get('authorization') || '';
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);
  return String(
    (bearer && bearer[1]) ||
    request.headers.get('x-operator-token') ||
    request.headers.get('x-admin-token') ||
    request.headers.get('x-gnk-asg-token') ||
    ''
  ).trim();
}

function constantTimeEqual(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

function hasValidRequestToken(request, env) {
  const supplied = requestToken(request);
  if (!supplied) return false;
  return operatorSecrets(env).some(secret => constantTimeEqual(supplied, secret));
}

function base64Url(bytes) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return base64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

function cookieValue(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return '';
}

async function validSession(request, env) {
  const secrets = operatorSecrets(env);
  if (!secrets.length) return false;
  const value = cookieValue(request, SESSION_COOKIE);
  const separator = value.indexOf('.');
  if (separator < 1) return false;
  const expires = Number(value.slice(0, separator));
  const signature = value.slice(separator + 1);
  if (!Number.isFinite(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(secrets[0], `gnk-asg-admin:${expires}`);
  return constantTimeEqual(signature, expected);
}

async function authorizedUiRequest(request, env) {
  if (hasValidRequestToken(request, env)) return true;
  return validSession(request, env);
}

function safeNext(value) {
  const fallback = DEFAULT_ADMIN_PATH;
  try {
    const raw = String(value || fallback);
    if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
    const parsed = new URL(raw, 'https://gnk-asg.hr');
    if (parsed.origin !== 'https://gnk-asg.hr') return fallback;
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    if (!isSensitiveUiPath(path)) return fallback;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loginPage(next, message = '', status = 401) {
  const safe = safeNext(next);
  const error = message ? `<p class="error">${escapeHtml(message)}</p>` : '';
  const html = `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>GNK ASG — Zaštićeni pristup</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 75% 0,rgba(46,156,255,.24),transparent 34%),linear-gradient(160deg,#01050c,#07172a 55%,#020812);font-family:Arial,sans-serif;color:#f7f9fc}.card{width:min(460px,100%);padding:30px;border:1px solid rgba(215,170,60,.5);border-radius:22px;background:rgba(7,23,42,.96);box-shadow:0 30px 90px rgba(0,0,0,.55)}.eyebrow{color:#d7aa3c;font-size:11px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}h1{margin:10px 0 8px;font-size:28px}p{color:#afbdd0;line-height:1.55}.error{padding:11px 13px;border:1px solid rgba(255,90,90,.5);border-radius:10px;background:rgba(255,70,70,.09);color:#ffd0d0}label{display:block;margin:20px 0 8px;color:#ffe08a;font-weight:800}input{width:100%;padding:14px;border:1px solid rgba(215,170,60,.45);border-radius:12px;background:#020812;color:#fff;font:inherit}button{width:100%;margin-top:16px;padding:14px;border:1px solid #d7aa3c;border-radius:12px;background:linear-gradient(135deg,#d7aa3c,#ffe08a);color:#07101d;font-weight:900;cursor:pointer}.back{display:block;margin-top:18px;text-align:center;color:#afbdd0;text-decoration:none;font-size:13px}</style>
</head>
<body>
<main class="card">
<div class="eyebrow">GNK ASG Secure Operations Layer</div>
<h1>Zaštićeni administratorski pristup</h1>
<p>Za Mobilni Admin, Admin i Mail Center potreban je važeći operatorski token. Sesija traje najviše 12 sati i spremljena je u sigurnom HttpOnly kolačiću.</p>
${error}
<form method="post" action="/operator/session/login" autocomplete="off">
<input type="hidden" name="next" value="${escapeHtml(safe)}">
<label for="token">Operatorski token</label>
<input id="token" name="token" type="password" required autofocus autocomplete="current-password">
<button type="submit">SIGURNA PRIJAVA</button>
</form>
<a class="back" href="/">Povratak na javni portal</a>
</main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      'pragma': 'no-cache',
      'x-robots-tag': 'noindex, nofollow, noarchive',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'frame-ancestors': "'none'"
    }
  });
}

async function login(request, env) {
  const secrets = operatorSecrets(env);
  if (!secrets.length) {
    return loginPage(DEFAULT_ADMIN_PATH, 'Sigurnosni secret nije konfiguriran. Pristup je zaključan.', 503);
  }

  let token = '';
  let next = DEFAULT_ADMIN_PATH;
  const type = request.headers.get('content-type') || '';
  try {
    if (type.includes('application/json')) {
      const body = await request.json();
      token = String(body?.token || '').trim();
      next = safeNext(body?.next);
    } else {
      const form = await request.formData();
      token = String(form.get('token') || '').trim();
      next = safeNext(form.get('next'));
    }
  } catch {
    return loginPage(next, 'Zahtjev za prijavu nije ispravan.', 400);
  }

  const valid = token && secrets.some(secret => constantTimeEqual(token, secret));
  if (!valid) return loginPage(next, 'Token nije valjan.', 401);

  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const signature = await hmac(secrets[0], `gnk-asg-admin:${expires}`);
  const headers = new Headers({
    location: next,
    'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
    'set-cookie': `${SESSION_COOKIE}=${encodeURIComponent(`${expires}.${signature}`)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}`
  });
  return new Response(null, { status: 303, headers });
}

function logout() {
  return new Response(null, {
    status: 303,
    headers: {
      location: '/',
      'cache-control': 'no-store',
      'set-cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
    }
  });
}

async function sessionStatus(request, env) {
  return new Response(JSON.stringify({
    ok: true,
    authenticated: await authorizedUiRequest(request, env),
    sessionMaxAgeSeconds: SESSION_MAX_AGE
  }, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

function cleanIndexTitle(html, path) {
  if (path === '/') {
    return html
      .replace('<h1>Index / <span>početna stranica</span></h1>', '')
      .replace('Index / <span>početna stranica</span>', '');
  }

  return html
    .replace('<h1>Index / <span>home page</span></h1>', '')
    .replace('Index / <span>home page</span>', '');
}

function stripSharedAssets(html) {
  return html
    .replace(/<link[^>]+gnk-asg-global-layer\.css[^>]*>/gi,'')
    .replace(/<script[^>]+gnk-asg-global-layer\.js[^>]*><\/script>/gi,'')
    .replace(/<link[^>]+public-site-unified-v6\.css[^>]*>/gi,'')
    .replace(/<script[^>]+public-site-unified-v6\.js[^>]*><\/script>/gi,'')
    .replace(/<link[^>]+public-menu-centered-v7\.css[^>]*>/gi,'')
    .replace(/<script[^>]+public-menu-final-v9\.js[^>]*><\/script>/gi,'');
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
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === '/operator/session/login') {
    if (request.method === 'POST') return login(request, env);
    const next = safeNext(url.searchParams.get('next'));
    if (await authorizedUiRequest(request, env)) {
      return Response.redirect(new URL(next, url.origin).toString(), 303);
    }
    return loginPage(next);
  }

  if (path === '/operator/session/logout') return logout();
  if (path === '/operator/session/status') return sessionStatus(request, env);

  if (isSensitiveUiPath(path) && !(await authorizedUiRequest(request, env))) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(JSON.stringify({ ok: false, error: 'authorization_required' }), {
        status: 401,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store'
        }
      });
    }
    return loginPage(`${url.pathname}${url.search}`);
  }

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
