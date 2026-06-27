import app from './index-admin-hub-v25-mail-smoke.js';

export const VERSION='GNK_ASG_ADMIN_HUB_V26_CLEAN_INDEX_20260627';
const STYLE='<link rel="stylesheet" href="/assets/index-activation-clean-v2.css?v=20260627-v1">';

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}
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
    return patch(await app.fetch(request,env,ctx),path,request);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
