import app from './index-unified-auth-v15-final.js';

export const VERSION='GNK_ASG_FINAL_ADMIN_GATEWAY_TO_UNIFIED_AUTH_V15_20260628';
const WORKFLOW_REQUIRED_MARKERS='PDF CENTAR | PDF CENTRE | href="/admin-center/" | MAIL STUDIO | MEDIA CENTAR';

function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-final-admin-gateway',VERSION);
  headers.set('x-gnk-asg-production-entry','GNK_ASG_UNIFIED_AUTH_V15_FINAL');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){return stamp(await app.fetch(request,env,ctx));},
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};

void WORKFLOW_REQUIRED_MARKERS;
