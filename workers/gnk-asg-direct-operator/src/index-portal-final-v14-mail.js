import core from './index-portal-final-v13.js';

const VERSION = 'GNK_ASG_PORTAL_FINAL_V14_MAIL_20260626';
const MAIL_PATHS = new Set(['/mail-studio','/mail-studio-pro']);

function withHeaders(response) {
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-robots-tag','noindex, nofollow');
  headers.set('x-gnk-asg-mail-studio',VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function mailStudio(request,env) {
  if (!env.ASSETS?.fetch) return new Response('Mail Studio assets unavailable',{status:503});
  const target = new URL('/mail-studio/index.html',request.url);
  const assetRequest = new Request(target,{
    method:request.method,
    headers:request.headers
  });
  const response = await env.ASSETS.fetch(assetRequest);
  if (response.status === 404) return new Response('Mail Studio not found',{status:404});
  return withHeaders(response);
}

export default {
  async fetch(request,env,ctx) {
    const path = new URL(request.url).pathname.replace(/\/+$/,'') || '/';
    if ((request.method === 'GET' || request.method === 'HEAD') && MAIL_PATHS.has(path)) {
      return mailStudio(request,env);
    }
    return core.fetch(request,env,ctx);
  },
  async scheduled(event,env,ctx) {
    if (typeof core.scheduled === 'function') return core.scheduled(event,env,ctx);
  },
  async email(message,env,ctx) {
    if (typeof core.email === 'function') return core.email(message,env,ctx);
  }
};
