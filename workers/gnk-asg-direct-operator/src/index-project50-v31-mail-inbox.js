import app from './index-project50-v30-unified-menu.js';
import {handleMailInbox,INBOX_PATH,VERSION as INBOX_VERSION} from './mail-inbox-contact-v1.js';

export const VERSION='GNK_ASG_PROJECT50_V31_CONNECTED_MAIL_INBOX_20260628';
const STATUS_PATHS=new Set(['/data/news-automation-status.json','/data/deployment-status.json','/data/portal-version.json']);
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';

function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-mail-inbox',INBOX_VERSION);
  headers.set('x-gnk-asg-entry-wrapper',VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function patchStatus(response,path){
  if(!STATUS_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type','application/json; charset=utf-8');
    headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
    headers.set('x-gnk-asg-mail-inbox',INBOX_VERSION);
    headers.set('x-gnk-asg-entry-wrapper',VERSION);
    return new Response(JSON.stringify({...payload,entryPoint:'src/index-project50-v31-mail-inbox.js',deployedEntryPoint:'src/index-project50-v31-mail-inbox.js',mailInbox:INBOX_VERSION,mailInboxConnected:true,mailInboxSource:'CONTACT_FORM_KV',checkedAt:new Date().toISOString()},null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(path===INBOX_PATH&&request.method==='GET'){
      const gate=await app.fetch(request,env,ctx);
      if(!gate.ok)return stamp(gate);
      const inbox=await handleMailInbox(request,env);
      if(inbox)return stamp(inbox);
      return stamp(gate);
    }
    const response=await app.fetch(request,env,ctx);
    return patchStatus(response,path);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
