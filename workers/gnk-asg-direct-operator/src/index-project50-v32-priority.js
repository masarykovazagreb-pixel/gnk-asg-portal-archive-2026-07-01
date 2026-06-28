import app from './index-project50-v31-mail-inbox.js';

export const VERSION='GNK_ASG_PROJECT50_V32_PRIORITY_INDEX_CONTACT_MAIL_MEDIA_AUTH_20260628';
const INDEX_PATHS=new Set(['/','/en']);
const CONTACT_PATHS=new Set(['/contact','/en/contact']);
const STATUS_PATHS=new Set(['/data/news-automation-status.json','/data/deployment-status.json','/data/portal-version.json']);
const INDEX_STYLE='<link rel="stylesheet" href="/assets/index-priority-v1.css?v=20260628-v1">';
const INDEX_SCRIPT='<script defer src="/assets/index-priority-v1.js?v=20260628-v2"></script>';

const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
function headersOf(response){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.delete('etag');
  headers.delete('last-modified');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-priority-release',VERSION);
  return headers;
}
function injectOnce(html,marker,content,closing){return html.includes(marker)?html:html.replace(closing,`${content}${closing}`);}
async function patchHtml(response,path,request){
  if(request.method!=='GET'||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  if(!INDEX_PATHS.has(path)&&!CONTACT_PATHS.has(path)&&path!=='/admin-center')return response;
  let html=await response.text();
  const headers=headersOf(response);
  if(INDEX_PATHS.has(path)){
    html=injectOnce(html,'index-priority-v1.css',INDEX_STYLE,'</head>');
    html=injectOnce(html,'index-priority-v1.js',INDEX_SCRIPT,'</body>');
    headers.set('x-gnk-asg-index-priority','THE_CODE_FIRST_CENTERED_PLAY_CONTROL');
  }
  if(CONTACT_PATHS.has(path)){
    html=html.replace(/contact-quality-v2\.css\?v=[^"']+/gi,'contact-quality-v2.css?v=20260628-v5');
    headers.set('x-gnk-asg-contact-design','INDEX_ALIGNED_WHITE_CHAMPAGNE_BLACK_V5');
  }
  if(path==='/admin-center')headers.set('x-gnk-asg-admin-auth','TOKEN_OR_HTTPONLY_SESSION_REQUIRED');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
async function patchStatus(response,path){
  if(!STATUS_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    const headers=headersOf(response);headers.set('content-type','application/json; charset=utf-8');
    return new Response(JSON.stringify({...payload,entryPoint:'src/index-project50-v32-priority.js',deployedEntryPoint:'src/index-project50-v32-priority.js',priorityRelease:VERSION,indexPriority:'THE_CODE_FIRST_CENTERED_PLAY_CONTROL',contactDesign:'INDEX_ALIGNED_WHITE_CHAMPAGNE_BLACK_V5',adminAuth:'TOKEN_OR_HTTPONLY_SESSION_REQUIRED',mailStudioPriority:true,mediaSenderPriority:true,checkedAt:new Date().toISOString()},null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(path==='/operator-dashboard'&&request.method==='GET')return new Response(null,{status:303,headers:{location:'/admin-center/?module=operator','cache-control':'no-store','x-gnk-asg-admin-entry':'TOKEN_PROTECTED_ADMIN_CENTER'}});
    let response=await app.fetch(request,env,ctx);
    response=await patchStatus(response,path);
    return patchHtml(response,path,request);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
