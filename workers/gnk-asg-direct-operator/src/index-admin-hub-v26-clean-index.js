import app from './index-admin-hub-v25-mail-smoke.js';

export const VERSION='GNK_ASG_ADMIN_HUB_V26_CLEAN_INDEX_20260627';
const STYLE='<link rel="stylesheet" href="/assets/index-activation-clean-v2.css?v=20260627-v1">';

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}
function aliasRequest(request,path){const url=new URL(request.url);url.pathname=path;return new Request(url.toString(),request);}
function aliasResponse(response,alias){const headers=new Headers(response.headers);headers.set('x-gnk-asg-news-alias',alias);headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}
async function patch(response,path,request){
  if(request.method!=='GET'||!['/','/en'].includes(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-index-clean-layout',VERSION);
  let html=await response.text();
  if(!html.includes('index-activation-clean-v2.css'))html=html.replace('</head>',`${STYLE}</head>`);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(request.method==='GET'&&path==='/data/news-feed.json')return aliasResponse(await app.fetch(aliasRequest(request,'/data/news.json'),env,ctx),'news-feed-to-news-json');
    if(request.method==='GET'&&path==='/data/news_archive.json')return aliasResponse(await app.fetch(aliasRequest(request,'/data/news-archive.json'),env,ctx),'news-archive-underscore-to-hyphen');
    return patch(await app.fetch(request,env,ctx),path,request);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
