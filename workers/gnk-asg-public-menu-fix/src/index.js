const VERSION = 'GNK_ASG_PUBLIC_MENU_ADMIN_FIX_V1_20260625';
const TARGET = '/assets/public-menu-final-v9.js';

function patchAdminControl(source) {
  const original = `  const renderLinks = links => links.map(([label,href,rel]) => {
    const current = isActive(href) ? ' aria-current="page"' : '';
    const relation = rel ? \` rel="\${rel}"\` : '';
    return \`<a href="\${href}"\${current}\${relation}>\${label}</a>\`;
  }).join('');`;

  const replacement = `  const renderLinks = links => links.map(([label,href,rel]) => {
    if (rel === 'nofollow') {
      return \`<form action="\${href}" method="get" style="display:inline-flex;margin:0"><button type="submit" aria-label="\${label}" style="display:inline-flex;align-items:center;min-height:34px;padding:8px 10px;border:1px solid transparent;border-radius:10px;background:transparent;color:#eaf0f8;font:800 12px/1 Arial,sans-serif;cursor:pointer">\${label}</button></form>\`;
    }
    const current = isActive(href) ? ' aria-current="page"' : '';
    return \`<a href="\${href}"\${current}>\${label}</a>\`;
  }).join('');`;

  return source.includes(original) ? source.replace(original, replacement) : source;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== TARGET) {
      return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
    if (!env.ASSETS?.fetch) {
      return new Response('Assets binding missing', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
    const assetUrl = new URL(TARGET, request.url);
    const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('content-type', 'application/javascript; charset=utf-8');
    headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
    headers.set('x-gnk-asg-menu-fix', VERSION);
    return new Response(patchAdminControl(await response.text()), { status: response.status, statusText: response.statusText, headers });
  }
};
