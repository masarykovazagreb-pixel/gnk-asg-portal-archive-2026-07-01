const UPSTREAM_ORIGIN = 'https://gnk-asg.hr';
const FILM_PREFIX = '/film/the-code';

function absolute(value) {
  if (!value || value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('#')) return value;
  try { return new URL(value, `${UPSTREAM_ORIGIN}/the-code/`).href; }
  catch { return value; }
}

class AttributeRewriter {
  constructor(attribute) { this.attribute = attribute; }
  element(element) {
    const value = element.getAttribute(this.attribute);
    if (value) element.setAttribute(this.attribute, absolute(value));
  }
}

class HeadInjector {
  element(element) {
    element.prepend(`<base href="${UPSTREAM_ORIGIN}/the-code/">`, {html:true});
    element.append('<style id="gnk-film-proxy-lock">html,body{overflow:hidden!important;overscroll-behavior:none!important}body{margin:0!important}::-webkit-scrollbar{display:none!important}</style>', {html:true});
  }
}

class BodyInjector {
  element(element) {
    element.append('<script src="/film-bridge.js?v=1"></script>', {html:true});
  }
}

function cleanHeaders(source) {
  const headers = new Headers(source);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('content-security-policy');
  headers.delete('content-security-policy-report-only');
  headers.delete('x-frame-options');
  headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-film-proxy', 'GNK_ASG_FILM_PROXY_V1_20260627');
  return headers;
}

export async function handleFilmProxy(request) {
  const incoming = new URL(request.url);
  if (!incoming.pathname.startsWith(FILM_PREFIX)) return null;

  const suffix = incoming.pathname.slice(FILM_PREFIX.length).replace(/^\/+/, '');
  const upstream = new URL(`/the-code/${suffix}`, UPSTREAM_ORIGIN);
  incoming.searchParams.forEach((value, key) => {
    if (!['restart'].includes(key)) upstream.searchParams.set(key, value);
  });

  const upstreamResponse = await fetch(new Request(upstream, {
    method: request.method,
    headers: request.headers,
    redirect: 'follow'
  }));
  const headers = cleanHeaders(upstreamResponse.headers);
  const contentType = String(headers.get('content-type') || '');

  if (!contentType.includes('text/html') || request.method === 'HEAD') {
    return new Response(request.method === 'HEAD' ? null : upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers
    });
  }

  const transformed = new HTMLRewriter()
    .on('[src]', new AttributeRewriter('src'))
    .on('[href]', new AttributeRewriter('href'))
    .on('[poster]', new AttributeRewriter('poster'))
    .on('head', new HeadInjector())
    .on('body', new BodyInjector())
    .transform(new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers
    }));

  return transformed;
}
