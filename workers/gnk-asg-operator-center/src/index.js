const DASHBOARD_ASSET = '/operator-dashboard/';

function injectSessionPatch(html) {
  const cleaned = html
    .replace(/<script\s+id=["']gnk-asg-force-token-sync["'][^>]*>[\s\S]*?<\/script>/gi,'')
    .replace(/<script\s+id=["']gnk-asg-secure-manual-token-v3["'][^>]*>[\s\S]*?<\/script>/gi,'');

  const headPatch = `<style id="gnk-operator-session-gate">html.gnk-operator-session-pending body{visibility:hidden}</style>
<script id="gnk-operator-http-only-session-v1">
(() => {
  'use strict';
  document.documentElement.classList.add('gnk-operator-session-pending');
  const login = () => location.replace('/admin-login/?next='+encodeURIComponent(location.pathname+location.search));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(),8000);
  fetch('/api/operator-auth-check',{
    method:'GET',
    credentials:'same-origin',
    cache:'no-store',
    headers:{accept:'application/json'},
    signal:controller.signal
  }).then(async response => {
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.authenticated !== true) throw new Error('unauthorized');
    document.documentElement.classList.remove('gnk-operator-session-pending');
  }).catch(login).finally(() => clearTimeout(timer));
})();
</script>`;

  const sharedShell = `<link rel="stylesheet" href="/assets/backend-ui-shell.css?v=20260624-backend-6">
<style id="gnk-operator-shared-auth-only">#login{display:none!important}#gnk-asg-premium-header,#gnk-asg-overlay,#gnk-asg-drawer,#gnk-asg-admin-launcher,.gnk-asg-final-menu-wrap{display:none!important}</style>
<script src="/assets/backend-ui-shell.js?v=20260624-backend-6"></script>`;

  const withHead = cleaned.includes('</head>')
    ? cleaned.replace('</head>',`${headPatch}</head>`)
    : `${headPatch}${cleaned}`;

  return withHead.includes('</body>')
    ? withHead.replace('</body>',`${sharedShell}</body>`)
    : `${withHead}${sharedShell}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed',{status:405,headers:{allow:'GET, HEAD'}});
    }

    if (path !== '/operator-dashboard') {
      return new Response('Not Found',{status:404});
    }

    if (!env.ASSETS?.fetch) {
      return new Response('Assets binding missing',{status:503});
    }

    const assetUrl = new URL(DASHBOARD_ASSET,request.url);
    const asset = await env.ASSETS.fetch(new Request(assetUrl.toString(),request));
    const headers = new Headers(asset.headers);
    headers.delete('content-length');
    headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
    headers.set('x-robots-tag','noindex, nofollow, noarchive');
    headers.set('x-gnk-asg-operator-center','http-only-session-v1');

    if (request.method === 'HEAD') return new Response(null,{status:asset.status,headers});
    if (!String(asset.headers.get('content-type') || '').includes('text/html')) {
      return new Response(asset.body,{status:asset.status,headers});
    }

    return new Response(injectSessionPatch(await asset.text()),{
      status:asset.status,
      statusText:asset.statusText,
      headers
    });
  }
};