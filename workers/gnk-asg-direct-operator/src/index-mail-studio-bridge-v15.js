import app from './index-unified-auth-v15.js';
import {handleMailProfileDeliveryTest,STATUS_PATH as PROFILE_STATUS_PATH,SEND_PATH as PROFILE_SEND_PATH,VERSION as PROFILE_DELIVERY_VERSION} from './mail-profile-delivery-test-v1.js';

const VERSION='GNK_ASG_MAIL_STUDIO_BRIDGE_V15_20260626_R10_PROFILE_DELIVERY_TEST';
const REVISION='10';
const MAIL_SCRIPT='<script defer src="/assets/mail-studio-auth-bridge-v16.js?v=20260626-1"></script>';
const CONTROLS_SCRIPT='<script defer src="/assets/mail-studio-controls-v18.js?v=20260626-2"></script>';
const CLICK_SCRIPT='<script defer src="/assets/mail-studio-click-feedback-v19.js?v=20260626-1"></script>';
const PROFILE_TEST_SCRIPT='<script defer src="/assets/mail-studio-profile-test-v1.js?v=20260626-2"></script>';
const ADMIN_SCRIPT='<script defer src="/assets/admin-session-fallback-v17.js?v=20260626-3"></script>';
const PROFILE_ENDPOINTS=new Set([PROFILE_STATUS_PATH,PROFILE_SEND_PATH]);

const cleanPath=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const privatePaths=['/admin-center','/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/auto-editor','/news-admin','/pdf-publisher','/social-share','/wa-center','/review'];
const isPrivate=path=>privatePaths.some(prefix=>path===prefix||path.startsWith(prefix+'/'));
const isMailStudio=path=>path==='/mail-studio'||path.startsWith('/mail-studio/')||path==='/mail-studio-pro'||path.startsWith('/mail-studio-pro/');

function stampWithoutInjection(response){
  const headers=new Headers(response.headers);
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-mail-studio-bridge',VERSION);
  headers.set('x-gnk-asg-mail-profile-delivery-test',PROFILE_DELIVERY_VERSION);
  headers.set('x-gnk-asg-auth-page-isolation','ENABLED');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function profileAuth(request,env,ctx){
  const target=new URL('/api/operator-auth-check',request.url);
  const headers=new Headers(request.headers);
  headers.set('accept','application/json');
  headers.set('cache-control','no-cache');
  const response=await app.fetch(new Request(target,{method:'GET',headers,redirect:'manual'}),env,ctx);
  if(response.ok)return null;
  const status=response.status===403?403:401;
  return new Response(JSON.stringify({ok:false,error:'authentication_required'},null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-mail-studio-bridge':VERSION,'x-gnk-asg-mail-profile-delivery-test':PROFILE_DELIVERY_VERSION}});
}

async function inject(response,path){
  const type=String(response.headers.get('content-type')||'');
  if(!type.includes('text/html'))return response;
  if(response.status===401||response.status===403||response.status===503)return stampWithoutInjection(response);
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-mail-studio-bridge',VERSION);
  headers.set('x-gnk-asg-admin-session-fallback','V19_COOKIE_ONLY');
  headers.set('x-gnk-asg-mail-studio-auth','V16_COOKIE_ONLY');
  headers.set('x-gnk-asg-mail-studio-controls','V18');
  headers.set('x-gnk-asg-mail-studio-click-feedback','V19');
  headers.set('x-gnk-asg-mail-profile-test','V2_DELIVERY');
  headers.set('x-gnk-asg-mail-profile-delivery-test',PROFILE_DELIVERY_VERSION);
  headers.set('x-gnk-asg-auth-page-isolation','ENABLED');
  let html=await response.text();
  const loginDocument=/<title>[^<]*(?:Sigurna prijava|prijava)[^<]*<\/title>/i.test(html)&&/<input[^>]+name=["']token["']/i.test(html);
  if(loginDocument)return new Response(html,{status:response.status,statusText:response.statusText,headers});
  html=html.replace(/<script[^>]+src=["'][^"']*mail-studio-auth-bridge-v15\.js[^"']*["'][^>]*><\/script>/gi,'');
  let scripts='';
  if(isMailStudio(path)&&!html.includes('mail-studio-auth-bridge-v16.js'))scripts+=MAIL_SCRIPT;
  if(isMailStudio(path)&&!html.includes('mail-studio-controls-v18.js'))scripts+=CONTROLS_SCRIPT;
  if(isMailStudio(path)&&!html.includes('mail-studio-click-feedback-v19.js'))scripts+=CLICK_SCRIPT;
  if(isMailStudio(path)&&!html.includes('mail-studio-profile-test-v1.js'))scripts+=PROFILE_TEST_SCRIPT;
  if(isPrivate(path)&&!html.includes('admin-session-fallback-v17.js'))scripts+=ADMIN_SCRIPT;
  if(scripts)html=html.includes('</head>')?html.replace('</head>',`${scripts}</head>`):scripts+html;
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

async function version(request,env,ctx){
  const response=await app.fetch(request,env,ctx);
  try{
    const payload=await response.clone().json();
    return new Response(JSON.stringify({...payload,mailStudioBridge:VERSION,mailStudioBridgeRevision:REVISION,mailProfileTest:'GNK_ASG_MAIL_PROFILE_TEST_V2_20260626_DELIVERY',mailProfileDeliveryTest:PROFILE_DELIVERY_VERSION,mailSignatureContact:'PHONE_ICON_NEW_NUMBER_WHATSAPP_ICON',unifiedAuth:'GNK_ASG_UNIFIED_AUTH_V15_20260626_LOGIN_ISOLATION',mailStudioAuth:'GNK_ASG_MAIL_STUDIO_AUTH_BRIDGE_V16_20260626_COOKIE_ONLY',mailStudioControls:'GNK_ASG_MAIL_STUDIO_CONTROLS_V18_20260626',mailStudioClickFeedback:'GNK_ASG_MAIL_STUDIO_CLICK_FEEDBACK_V19_20260626',adminSessionFallback:'GNK_ASG_ADMIN_SESSION_FALLBACK_V19_20260626_COOKIE_ONLY_HEALTH',authPageIsolation:'ENABLED',deployedEntryPoint:'src/index-mail-studio-bridge-v15.js'},null,2),{
      status:response.status,
      headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-mail-studio-bridge':VERSION,'x-gnk-asg-admin-session-fallback':'V19_COOKIE_ONLY','x-gnk-asg-mail-studio-auth':'V16_COOKIE_ONLY','x-gnk-asg-mail-studio-controls':'V18','x-gnk-asg-mail-studio-click-feedback':'V19','x-gnk-asg-mail-profile-test':'V2_DELIVERY','x-gnk-asg-mail-profile-delivery-test':PROFILE_DELIVERY_VERSION,'x-gnk-asg-auth-page-isolation':'ENABLED'}
    });
  }catch{return response;}
}

export default{
  async fetch(request,env,ctx){
    const path=cleanPath(request);
    if(request.method==='GET'&&path==='/data/portal-version.json')return version(request,env,ctx);
    if(PROFILE_ENDPOINTS.has(path)){
      const denied=await profileAuth(request,env,ctx);
      if(denied)return stampWithoutInjection(denied);
      const response=await handleMailProfileDeliveryTest(request,env);
      if(response)return stampWithoutInjection(response);
    }
    const response=await app.fetch(request,env,ctx);
    if(isPrivate(path)&&['GET','HEAD'].includes(request.method))return inject(response,path);
    return response;
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
