import app from './index-project50-v30-unified-menu.js';
import {handleMailInbox,INBOX_PATH,VERSION as INBOX_VERSION} from './mail-inbox-contact-v1.js';
import {storeInboundMetadata,VERSION as DIRECT_INBOUND_VERSION} from './mail-inbound-service-v1.js';
import {maybeSendInboundAutoReply,VERSION as INBOUND_REPLY_VERSION} from './mail-inbound-auto-reply-v1.js';
import {handleMailAiAssist,AI_PATH,VERSION as AI_VERSION,DEFAULT_MODEL as AI_DEFAULT_MODEL} from './mail-ai-assist-v2.js';

export const VERSION='GNK_ASG_PROJECT50_V31_UNIFIED_INBOX_AUTO_REPLY_AI_20260628';
const STATUS_PATHS=new Set(['/data/news-automation-status.json','/data/deployment-status.json','/data/portal-version.json']);
const MAIL_STUDIO_PATHS=new Set(['/mail-studio','/mail-studio-pro']);
const MAIL_STUDIO_UI='<script defer src="/assets/mail-studio-inbox-ui-v1.js?v=20260628-v2"></script><script defer src="/assets/mail-studio-ai-media-v1.js?v=20260628-v1"></script>';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';

function stamp(response,extra={}){
  const headers=new Headers(response.headers);
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-mail-inbox',INBOX_VERSION);
  headers.set('x-gnk-asg-direct-inbound',DIRECT_INBOUND_VERSION);
  headers.set('x-gnk-asg-inbound-auto-reply',INBOUND_REPLY_VERSION);
  headers.set('x-gnk-asg-mail-ai',AI_VERSION);
  headers.set('x-gnk-asg-entry-wrapper',VERSION);
  for(const [key,value] of Object.entries(extra))headers.set(key,value);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function protectedMailGate(request,env,ctx){
  const target=new URL('/api/mail-center/status',request.url);
  const headers=new Headers(request.headers);
  headers.set('accept','application/json');
  headers.set('cache-control','no-cache');
  return app.fetch(new Request(target,{method:'GET',headers,redirect:'manual'}),env,ctx);
}

async function patchStatus(response,path,env){
  if(!STATUS_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  try{
    const payload=await response.json();
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type','application/json; charset=utf-8');
    headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
    headers.set('x-gnk-asg-mail-inbox',INBOX_VERSION);
    headers.set('x-gnk-asg-direct-inbound',DIRECT_INBOUND_VERSION);
    headers.set('x-gnk-asg-inbound-auto-reply',INBOUND_REPLY_VERSION);
    headers.set('x-gnk-asg-mail-ai',AI_VERSION);
    headers.set('x-gnk-asg-entry-wrapper',VERSION);
    return new Response(JSON.stringify({...payload,entryPoint:'src/index-project50-v31-mail-inbox.js',deployedEntryPoint:'src/index-project50-v31-mail-inbox.js',entryWrapper:VERSION,mailInbox:INBOX_VERSION,mailInboxConnected:true,mailInboxSources:['CONTACT_FORM_KV','DIRECT_EMAIL_METADATA_KV'],directInbound:DIRECT_INBOUND_VERSION,directInboundContentParsed:false,directInboundAutoReply:INBOUND_REPLY_VERSION,directInboundAutoReplyEnabled:String(env.MAIL_INBOUND_AUTO_REPLY||'false').toLowerCase()==='true',directInboundAutoReplyMode:String(env.MAIL_INBOUND_AUTO_REPLY_MODE||'media-only'),mailInboxUi:'GNK_ASG_MAIL_STUDIO_INBOX_UI_V2_CENTERS_20260628',receivingCenters:'GNK_ASG_MAIL_RECEIVING_CENTERS_V1_20260628',receivingCenterCount:10,mailAi:AI_VERSION,mailAiUi:'GNK_ASG_MAIL_STUDIO_AI_MEDIA_V1_20260628',mailAiModel:String(env.MAIL_AI_MODEL||env.AUTO_EDITOR_MODEL||AI_DEFAULT_MODEL),mailAiBinding:Boolean(env.AI&&typeof env.AI.run==='function'),mailAiProtectedBy:'MAIL_CENTER_SESSION_GATE',checkedAt:new Date().toISOString()},null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

async function injectMailStudioUi(response,path,request){
  if(request.method!=='GET'||!MAIL_STUDIO_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-gnk-asg-mail-inbox-ui','GNK_ASG_MAIL_STUDIO_INBOX_UI_V2_CENTERS_20260628');
  headers.set('x-gnk-asg-mail-ai-ui','GNK_ASG_MAIL_STUDIO_AI_MEDIA_V1_20260628');
  let html=await response.text();
  if(!html.includes('mail-studio-inbox-ui-v1.js'))html=html.replace('</body>',`${MAIL_STUDIO_UI}</body>`);
  else if(!html.includes('mail-studio-ai-media-v1.js'))html=html.replace('</body>','<script defer src="/assets/mail-studio-ai-media-v1.js?v=20260628-v1"></script></body>');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

async function processInbound(message,env){
  const intake=await storeInboundMetadata(message,env).catch(error=>({ok:false,error:String(error?.message||error),record:null}));
  const autoReply=intake?.record
    ? await maybeSendInboundAutoReply(message,env,intake.record).catch(error=>({ok:false,sent:false,reason:'auto_reply_processing_failed',error:String(error?.message||error)}))
    : {ok:false,sent:false,reason:'inbound_record_missing'};
  return{intake,autoReply};
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
    if(path===AI_PATH){
      const gate=await protectedMailGate(request,env,ctx);
      if(!gate.ok)return stamp(gate,{'x-gnk-asg-mail-ai-gate':'DENIED'});
      const response=await handleMailAiAssist(request,env);
      if(response)return stamp(response,{'x-gnk-asg-mail-ai-gate':'MAIL_CENTER_SESSION'});
    }
    let response=await app.fetch(request,env,ctx);
    response=await patchStatus(response,path,env);
    return injectMailStudioUi(response,path,request);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){
    const processing=processInbound(message,env);
    if(ctx?.waitUntil)ctx.waitUntil(processing);
    if(typeof app.email==='function')return app.email(message,env,ctx);
    return processing;
  }
};
