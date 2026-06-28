import core from './index-portal-final-v13.js';

export const VERSION='GNK_ASG_PORTAL_FINAL_V14_FEATURED_CODE_20260628';
const INDEX_PATHS=new Set(['/','/en']);
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isHtml=response=>String(response.headers.get('content-type')||'').toLowerCase().includes('text/html');

function headersFor(response){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-portal-final',VERSION);
  headers.set('x-gnk-asg-featured-code','THE_CODE_FEATURED_V1');
  return headers;
}

function injectFeaturedCode(html){
  if(!html.includes('/assets/index-premium-map-code-v2.css')){
    html=html.replace('</head>','<link rel="stylesheet" href="/assets/index-premium-map-code-v2.css?v=20260628-featured1"></head>');
  }
  if(!html.includes('/assets/index-featured-code-v1.js')){
    html=html.replace('</body>','<script src="/assets/index-featured-code-v1.js?v=20260628-featured1" defer></script></body>');
  }
  return html;
}

export default{
  async fetch(request,env,ctx){
    const response=await core.fetch(request,env,ctx);
    if(request.method==='GET'&&INDEX_PATHS.has(pathOf(request))&&response.ok&&isHtml(response)){
      const html=injectFeaturedCode(await response.text());
      return new Response(html,{status:response.status,statusText:response.statusText,headers:headersFor(response)});
    }
    return response;
  },
  async scheduled(event,env,ctx){if(typeof core.scheduled==='function')return core.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof core.email==='function')return core.email(message,env,ctx);}
};