import publicApp from './index-project50-v32-priority.js';
import adminApp from './index-admin-functional-v1.js';
import {handleContactSubmit,PATH as CONTACT_PATH,VERSION as CONTACT_VERSION} from './contact-submit-v1.js';

export const VERSION='GNK_ASG_FINAL_FUNCTIONAL_V1_20260628';
const ADMIN_UI=['/admin-center','/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/media-command-center','/media-access-admin'];
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isAdminUi=path=>ADMIN_UI.some(prefix=>path===prefix||path.startsWith(prefix+'/'));
const isAdminApi=path=>path==='/api/operator-auth-check'||path==='/api/operator-session/login'||path==='/operator/session/logout'||path==='/api/admin-mail-send'||path.startsWith('/api/mail-center/')||path.startsWith('/api/media-command-center')||path.startsWith('/api/media-access/admin')||path==='/operator'||path.startsWith('/operator/')||path.startsWith('/api/operator-')||path.startsWith('/api/admin-');
function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-final-functional',VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(path===CONTACT_PATH){
      const response=await handleContactSubmit(request,env);
      if(response){const headers=new Headers(response.headers);headers.set('x-gnk-asg-contact-service',CONTACT_VERSION);headers.set('x-gnk-asg-final-functional',VERSION);return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}
    }
    if(isAdminUi(path)||isAdminApi(path))return stamp(await adminApp.fetch(request,env,ctx));
    return stamp(await publicApp.fetch(request,env,ctx));
  },
  async scheduled(event,env,ctx){if(typeof publicApp.scheduled==='function')return publicApp.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof publicApp.email==='function')return publicApp.email(message,env,ctx);}
};
