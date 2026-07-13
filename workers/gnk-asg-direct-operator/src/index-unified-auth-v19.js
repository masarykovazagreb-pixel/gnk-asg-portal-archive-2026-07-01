import app,{VERSION as BASE_VERSION} from './index-unified-auth-v18.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V19_INDEX_FINAL_${BASE_VERSION}`;
const RELEASE='<script defer src="/assets/release-completion-v1.js?v=20260713-index-final-v6"></script>';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isProtected=path=>path.startsWith('/admin')||path.startsWith('/mail-studio')||path.startsWith('/email-status')||path.startsWith('/operator-dashboard')||path.startsWith('/worker-ops');
async function finalize(request,response){
  if(request.method!=='GET'||response.status!==200||isProtected(pathOf(request)))return response;
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('text/html'))return response;
  try{
    let html=await response.text();
    html=html.replace(/<script[^>]+release-completion-v1\.js[^>]*><\/script>/gi,'');
    html=html.includes('</body>')?html.replace('</body>',`${RELEASE}</body>`):`${html}${RELEASE}`;
    const headers=new Headers(response.headers);
    headers.delete('content-length');headers.delete('content-encoding');
    headers.set('content-type','text/html; charset=utf-8');
    headers.set('x-gnk-index-release','v6-final');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}
export default{
  async fetch(request,env,ctx){return finalize(request,await app.fetch(request,env,ctx));},
  scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};