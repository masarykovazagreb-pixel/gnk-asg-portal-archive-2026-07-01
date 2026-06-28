import app from './index-project50-v28-news-no-fallback.js';

export const VERSION='GNK_ASG_PROJECT50_V29_ADMIN_FRAME_BRIDGE_20260628';
const ADMIN_MODULES=new Set(['/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/auto-editor','/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/media-command-center','/memorandum-studio']);
const FRAME_BRIDGE='<script defer src="/assets/admin-frame-bridge-v1.js?v=20260628-v1"></script>';
const MODULE_BRIDGE='<script defer src="/assets/admin-module-bridge-v1.js?v=20260628-v1"></script>';

function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/'}
function sameOriginCsp(value){
  const directives=String(value||'').split(';').map(item=>item.trim()).filter(Boolean).filter(item=>!/^frame-ancestors\b/i.test(item));
  directives.push("frame-ancestors 'self'");
  return directives.join('; ');
}
async function patchAdminBridge(response,path,request){
  if(request.method!=='GET'||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const url=new URL(request.url);
  const embedded=url.searchParams.get('embedded')==='1';
  const adminCenter=path==='/admin-center';
  if(!adminCenter&&!(embedded&&ADMIN_MODULES.has(path)))return response;

  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('x-frame-options');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('content-security-policy',sameOriginCsp(headers.get('content-security-policy')));
  headers.set('x-gnk-asg-admin-frame-bridge',VERSION);

  let html=await response.text();
  if(adminCenter&&!html.includes('admin-frame-bridge-v1.js'))html=html.replace('</body>',`${FRAME_BRIDGE}</body>`);
  if(embedded&&!html.includes('admin-module-bridge-v1.js'))html=html.replace('</body>',`${MODULE_BRIDGE}</body>`);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const response=await app.fetch(request,env,ctx);
    return patchAdminBridge(response,pathOf(request),request);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx)},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx)}
};