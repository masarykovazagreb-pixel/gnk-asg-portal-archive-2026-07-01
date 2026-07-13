import app,{VERSION as BASE_VERSION} from './index-unified-auth-v18.js';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V20_SCOPED_PUBLIC_RUNTIME_${BASE_VERSION}`;
const INDEX_RELEASE='<script defer src="/assets/release-completion-v1.js?v=20260713-index-final-v6"></script><script defer src="/assets/index-data-resilience-v1.js?v=20260713-resilience-v1"></script><script defer src="/assets/index-editorial-order-v1.js?v=20260713-editorial-v1"></script>';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isIndex=path=>path==='/'||path==='/en';
const isProtected=path=>['/admin','/admin-center','/mail-studio','/campaign-mailer','/email-status','/operator-dashboard','/worker-ops','/digital-headquarters','/media-registration-admin','/webmail'].some(prefix=>path===prefix||path.startsWith(prefix+'/'));
const STATIC_HTML_ROUTES=new Map([
  ['/newsroom','/newsroom/index.html'],['/en/newsroom','/en/newsroom/index.html'],
  ['/objave','/objave/index.html'],['/objave/povjerenje-investitora-kroz-transparentnost','/objave/povjerenje-investitora-kroz-transparentnost/index.html'],['/objave/kiberneticka-sigurnost-i-poslovni-kontinuitet','/objave/kiberneticka-sigurnost-i-poslovni-kontinuitet/index.html'],
  ['/analize','/analize/index.html'],['/analize/ai-infrastruktura-i-potrosnja-energije','/analize/ai-infrastruktura-i-potrosnja-energije/index.html'],['/analize/transparentnost-podataka-kao-poslovna-infrastruktura','/analize/transparentnost-podataka-kao-poslovna-infrastruktura/index.html'],
  ['/komentari','/komentari/index.html'],['/komentari/odgovornost-se-ne-moze-automatizirati','/komentari/odgovornost-se-ne-moze-automatizirati/index.html'],['/komentari/novac-je-informacija-prije-nego-kapital','/komentari/novac-je-informacija-prije-nego-kapital/index.html'],
  ['/trzista','/trzista/index.html'],['/en/markets','/en/markets/index.html'],['/the-code','/the-code/index.html'],['/en/the-code','/en/the-code/index.html']
]);
async function explicitHtml(request,env){
  if((request.method!=='GET'&&request.method!=='HEAD')||!env.ASSETS?.fetch)return null;
  const targetPath=STATIC_HTML_ROUTES.get(pathOf(request));if(!targetPath)return null;
  const target=new URL(targetPath,request.url);target.search='';
  const response=await env.ASSETS.fetch(new Request(target.toString(),{method:request.method,headers:request.headers}));
  if(response.status!==200)return null;
  const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('content-type','text/html; charset=utf-8');headers.set('cache-control','public, max-age=120, stale-while-revalidate=300');headers.set('x-gnk-explicit-html-route',targetPath);headers.set('x-gnk-route-owner',VERSION);
  return new Response(request.method==='HEAD'?null:await response.text(),{status:200,headers});
}
async function finalize(request,response){
  if(request.method!=='GET'||response.status!==200||isProtected(pathOf(request)))return response;
  const type=String(response.headers.get('content-type')||'').toLowerCase();if(!type.includes('text/html'))return response;
  try{
    let html=await response.text();
    html=html.replace(/<script[^>]+release-completion-v1\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+index-data-resilience-v1\.js[^>]*><\/script>/gi,'').replace(/<script[^>]+index-editorial-order-v1\.js[^>]*><\/script>/gi,'');
    if(isIndex(pathOf(request)))html=html.includes('</body>')?html.replace('</body>',`${INDEX_RELEASE}</body>`):`${html}${INDEX_RELEASE}`;
    const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('content-type','text/html; charset=utf-8');headers.set('x-gnk-public-runtime',VERSION);headers.set('x-gnk-index-release',isIndex(pathOf(request))?'v6-final-resilient-editorial':'not-applicable');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}
export default{
  async fetch(request,env,ctx){const direct=await explicitHtml(request,env);return finalize(request,direct||await app.fetch(request,env,ctx));},
  scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};