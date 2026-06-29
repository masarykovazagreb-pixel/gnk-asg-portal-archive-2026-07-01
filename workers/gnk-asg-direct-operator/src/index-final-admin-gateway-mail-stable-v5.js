import app,{VERSION as BASE_VERSION} from './index-final-admin-gateway-post-code-v3.js';

export const VERSION=`GNK_ASG_FINAL_GATEWAY_MAIL_STABLE_V5_TO_${BASE_VERSION}`;
const MAIL_PATH='/mail-studio';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const matches=(path,base)=>path===base||path.startsWith(`${base}/`);
const isHtml=response=>String(response.headers.get('content-type')||'').toLowerCase().includes('text/html');

function redirect(location){return new Response(null,{status:303,headers:{location,'cache-control':'no-store','x-gnk-asg-mail-stable':VERSION}});}
function stamp(response,flow=''){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.delete('last-modified');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('cdn-cache-control','no-store');
  headers.set('cloudflare-cdn-cache-control','no-store');
  headers.set('x-gnk-asg-mail-stable',VERSION);
  if(flow)headers.set('x-gnk-asg-mail-stable-flow',flow);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
async function authorized(request,env,ctx){
  const url=new URL('/api/operator-auth-check',request.url);
  const probe=new Request(url,{method:'GET',headers:request.headers});
  try{return (await app.fetch(probe,env,ctx)).ok;}catch{return false;}
}
async function serveStable(request,env){
  if(!env.ASSETS?.fetch)return null;
  const target=new URL('/mail-studio-stable/index.html',request.url);
  const response=await env.ASSETS.fetch(new Request(target,{method:request.method,headers:request.headers}));
  if(!response.ok||!isHtml(response))return null;
  return stamp(response,'STABLE_UI');
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(matches(path,MAIL_PATH)&&['GET','HEAD'].includes(request.method)){
      if(!(await authorized(request,env,ctx)))return redirect(`/admin-center/?next=${encodeURIComponent('/mail-studio/')}`);
      const stable=await serveStable(request,env);
      if(stable)return stable;
    }
    return stamp(await app.fetch(request,env,ctx),'BASE');
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
