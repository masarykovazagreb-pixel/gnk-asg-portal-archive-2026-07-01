import app from './index.js';
import {handleFilmProxy} from './film-proxy-v1.js';

const STYLE = '<link rel="stylesheet" href="/film-controller.css?v=1">';
const SCRIPT = '<script src="/film-controller.js?v=1" defer></script>';
const VERSION = 'GNK_ASG_ONEPAGE_FILM_V3_20260627';

async function patchIndex(response, request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (request.method !== 'GET' || path !== '/' || !response.ok || !String(response.headers.get('content-type') || '').includes('text/html')) return response;

  let body = await response.text();
  if (!body.includes('film-controller.css')) body = body.replace('</head>', `${STYLE}</head>`);
  if (!body.includes('film-controller.js')) body = body.replace('</body>', `${SCRIPT}</body>`);

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-onepage-film', VERSION);
  return new Response(body, {status:response.status,statusText:response.statusText,headers});
}

export default {
  async fetch(request, env, ctx) {
    const film = await handleFilmProxy(request);
    if (film) return film;
    const response = await app.fetch(request, env, ctx);
    return patchIndex(response, request);
  }
};
