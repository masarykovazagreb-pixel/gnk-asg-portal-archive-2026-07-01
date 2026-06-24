const DASHBOARD_ASSET = '/operator-dashboard/';

function injectSecurityPatch(html) {
  const withoutForcedToken = html.replace(
    /<script\s+id=["']gnk-asg-force-token-sync["'][^>]*>[\s\S]*?<\/script>/gi,
    ''
  );

  const sharedShell = `<link rel="stylesheet" href="/assets/backend-ui-shell.css?v=20260624-backend-6">
<style id="gnk-operator-shared-auth-only">#login{display:none!important}#gnk-asg-premium-header,#gnk-asg-overlay,#gnk-asg-drawer,#gnk-asg-admin-launcher,.gnk-asg-final-menu-wrap{display:none!important}</style>
<script src="/assets/backend-ui-shell.js?v=20260624-backend-6"></script>`;

  const patch = `<script id="gnk-asg-secure-manual-token-v3">
(() => {
  'use strict';
  const KEY = 'gnk_asg_operator_token_session';
  const read = () => { try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; } };
  const write = value => {
    try {
      if (value) sessionStorage.setItem(KEY,value);
      else sessionStorage.removeItem(KEY);
      localStorage.removeItem('GNK_ASG_OPERATOR_TOKEN');
    } catch {}
  };
  const output = value => {
    const node = document.getElementById('loginOut');
    if (node) node.textContent = value;
  };
  const headers = () => {
    const value = read();
    return value ? {'content-type':'application/json','authorization':'Bearer '+value,'x-operator-token':value} : {'content-type':'application/json'};
  };
  const verify = async value => {
    if (!value) return false;
    try {
      const response = await fetch('/api/operator-auth-check?cb='+Date.now(),{
        headers:{authorization:'Bearer '+value,'x-operator-token':value,'cache-control':'no-cache'},
        credentials:'same-origin'
      });
      return response.ok;
    } catch { return false; }
  };
  const unlock = async () => {
    document.getElementById('login')?.classList.add('hidden');
    document.getElementById('app')?.classList.remove('hidden');
    document.body.classList.add('gnk-admin-authenticated');
    try { await window.init?.(); } catch {}
  };

  window.GNK_ASG_FORCE_OPERATOR_TOKEN = '';
  window.token = read;
  window.gnkAsgForceToken = read;
  window.authHeaders = headers;
  window.withTokenUrl = url => url;
  window.gnkAsgWithTokenUrl = url => url;
  window.bootstrapTokenFromUrl = () => {
    try {
      const url = new URL(location.href);
      url.searchParams.delete('token');
      url.searchParams.delete('operator_token');
      history.replaceState(null,'',url.pathname+url.search+url.hash);
    } catch {}
  };
  window.saveToken = async () => {
    const sharedInput = document.getElementById('gnkAdminToken');
    const input = document.getElementById('tokenInput');
    const value = String(sharedInput?.value || input?.value || '').trim();
    if (!value) { output('Token nije upisan.'); return; }
    output('Provjera tokena…');
    if (!(await verify(value))) {
      write('');
      if (input) input.value='';
      output('Token nije prihvaćen.');
      return;
    }
    write(value);
    if (input) input.value=value;
    output('Token je potvrđen. Mail funkcije su otključane.');
    await unlock();
  };
  window.clearToken = () => {
    write('');
    const input = document.getElementById('tokenInput');
    if (input) input.value='';
    document.getElementById('app')?.classList.add('hidden');
    document.body.classList.remove('gnk-admin-authenticated');
    output('Token je uklonjen iz ove kartice.');
  };
  window.logout = window.clearToken;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input,init={}) => {
    const raw = typeof input === 'string' ? input : input?.url || '';
    const url = new URL(raw,location.origin);
    const protectedApi = url.pathname.startsWith('/api/operator-') || url.pathname.startsWith('/operator/') || url.pathname.startsWith('/api/admin-mail-send') || url.pathname.startsWith('/api/mail-center/');
    if (!protectedApi) return nativeFetch(input,init);
    const value = read();
    const requestHeaders = new Headers(init.headers || {});
    if (value && !requestHeaders.has('authorization')) {
      requestHeaders.set('authorization','Bearer '+value);
      requestHeaders.set('x-operator-token',value);
    }
    return nativeFetch(input,{...init,headers:requestHeaders,credentials:'same-origin'});
  };

  const start = async () => {
    try { localStorage.removeItem('GNK_ASG_OPERATOR_TOKEN'); } catch {}
    document.getElementById('gnk-asg-force-token-sync')?.remove();
    const input = document.getElementById('tokenInput');
    if (input) input.value = read();
    document.getElementById('login')?.classList.add('hidden');
    if (read() && await verify(read())) await unlock();
    else document.getElementById('app')?.classList.add('hidden');
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
</script>`;

  return withoutForcedToken.includes('</body>')
    ? withoutForcedToken.replace('</body>',`${sharedShell}${patch}</body>`)
    : `${withoutForcedToken}${sharedShell}${patch}`;
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
    headers.set('x-gnk-asg-operator-center','secure-manual-token-v3');

    if (request.method === 'HEAD') return new Response(null,{status:asset.status,headers});
    if (!String(asset.headers.get('content-type') || '').includes('text/html')) {
      return new Response(asset.body,{status:asset.status,headers});
    }

    return new Response(injectSecurityPatch(await asset.text()),{
      status:asset.status,
      statusText:asset.statusText,
      headers
    });
  }
};