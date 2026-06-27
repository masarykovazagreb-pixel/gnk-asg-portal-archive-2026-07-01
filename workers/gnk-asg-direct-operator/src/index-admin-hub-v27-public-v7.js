import app from './index-admin-hub-v26-clean-index.js';
export const VERSION='GNK_ASG_PUBLIC_V7_HR_EN_ADMIN_HR_20260627';
const CODE_STYLE='<link rel="stylesheet" href="/the-code/assets/the-code-embed-v7.css?v=7">';
const CODE_SCRIPT='<script defer src="/the-code/assets/the-code-ready-v7.js?v=7"></script>';
function pathOf(request){return new URL(request.url).pathname.replace(/\/+$/,'')||'/';}
function fresh(headers){headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');headers.set('cloudflare-cdn-cache-control','no-store');return headers;}
async function patchCode(response,path,request){
  if(request.method!=='GET'||!['/the-code','/the-code/index.html'].includes(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('the-code-embed-v7.css'))html=html.replace('</head>',CODE_STYLE+'</head>');
  if(!html.includes('the-code-ready-v7.js'))html=html.replace('</body>',CODE_SCRIPT+'</body>');
  const headers=fresh(new Headers(response.headers));headers.set('x-gnk-asg-the-code-embed','V7_EXTERNAL_CONTROL_ONLY');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
export default{
  async fetch(request,env,ctx){const path=pathOf(request);let response=await app.fetch(request,env,ctx);response=await patchCode(response,path,request);const headers=fresh(new Headers(response.headers));if(path==='/'||path==='/en')headers.set('x-gnk-asg-public-release',VERSION);return new Response(response.body,{status:response.status,statusText:response.statusText,headers});},
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
