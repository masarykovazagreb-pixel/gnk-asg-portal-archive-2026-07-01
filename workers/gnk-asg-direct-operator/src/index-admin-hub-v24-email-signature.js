import app from './index-admin-hub-v23-aktual.js';
import {withRequiredEmailSignature,VERSION as EMAIL_SIGNATURE_VERSION} from './email-signature-contract-v1.js';

export const VERSION='GNK_ASG_ADMIN_HUB_V24_REQUIRED_EMAIL_SIGNATURE_20260626';

function signedEnv(env){return withRequiredEmailSignature(env);}
function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-admin-hub-v24',VERSION);
  headers.set('x-gnk-asg-email-signature-contract',EMAIL_SIGNATURE_VERSION);
  headers.set('x-gnk-asg-email-logo-required','true');
  headers.set('x-gnk-asg-email-signature-format','UNIFIED');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){return stamp(await app.fetch(request,signedEnv(env),ctx));},
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,signedEnv(env),ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,signedEnv(env),ctx);}
};
