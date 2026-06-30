import app from './index-mail-studio-bridge-v15.js';
export const VERSION='GNK_ASG_MAIL_STUDIO_BRIDGE_V17_20260630_ENGLISH';
const CORE='/assets/mail-studio-english-v23.js?v=20260630-1';
const HISTORY='/assets/delivery-history-dashboard-v3.js?v=20260630-2';
const pathOf=r=>new URL(r.url).pathname.replace(/\/+$/,'')||'/';
const isMail=p=>p==='/mail-studio'||p.startsWith('/mail-studio/')||p==='/mail-studio-pro'||p.startsWith('/mail-studio-pro/');
async function patch(response,path){
 if(!isMail(path))return response;
 if(!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
 const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.set('cache-control','no-store');headers.set('x-gnk-asg-mail-studio-language','ENGLISH_ONLY');
 let html=await response.text();
 for(const name of ['studio-core-v21','mail-studio-controls-v18','mail-studio-click-feedback-v19','mail-studio-hotfix-v20','mail-studio-profile-test-v1','mail-studio-delivery-policy-v1','mail-studio-delivery-history-v2','delivery-history-dashboard-v3','mail-studio-english-v23'])html=html.replace(new RegExp(`<script[^>]+src=["'][^"']*${name}\\.js[^"']*["'][^>]*><\\/script>`,'gi'),'');
 const scripts=`<script defer src="${CORE}"></script><script defer src="${HISTORY}"></script>`;
 html=html.includes('</body>')?html.replace('</body>',scripts+'</body>'):html+scripts;
 return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
export default{async fetch(request,env,ctx){return patch(await app.fetch(request,env,ctx),pathOf(request));},scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}};
