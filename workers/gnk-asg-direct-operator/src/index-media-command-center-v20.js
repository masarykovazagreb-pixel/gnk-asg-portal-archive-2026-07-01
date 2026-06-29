import app from './index-mail-studio-bridge-v16.js';
import {handleMediaCommandCenter,handleMediaCommandCenterEmail,VERSION as MEDIA_VERSION} from './media-command-center-v1.js';
import {
  VERSION as MEDIA_AI_VERSION,
  prepareMediaInbound,
  sendMediaAiResponse,
  lookupApplicationForMessage,
  cloneInboundMessage,
  coreEnvWithoutAutoAck,
  suppressInboundSender,
  finalizeInbound
} from './media-ai-responder-v2.js';

const VERSION='GNK_ASG_MEDIA_COMMAND_CENTER_WRAPPER_V21_20260629_GLOBAL_AI_DESKS';
const COOKIE='gnk_asg_admin_session';
const MAX_AGE=43200;
const enc=new TextEncoder();
const TOKEN_NAMES=new Set(['OPERATOR_TOKEN','GNK_ASG_OPERATOR_TOKEN','ADMIN_TOKEN','GNK_ASG_ADMIN_TOKEN','NEWS_PUBLISH_TOKEN','SECRET_TOKEN']);
const MEDIA_UI='/media-command-center';
const MEDIA_API='/api/media-command-center';
const MEDIA_EMAIL='media@gnk-asg.hr';
const NAV_SCRIPT='<script defer src="/assets/admin-media-command-center-nav-v20.js?v=20260629-2"></script>';
const PRIVATE_PATHS=['/admin-center','/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/auto-editor','/news-admin','/pdf-publisher','/social-share','/wa-center','/review',MEDIA_UI];

const clean=value=>String(value||'').trim();
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isMedia=path=>path===MEDIA_UI||path.startsWith(`${MEDIA_UI}/`)||path===MEDIA_API||path.startsWith(`${MEDIA_API}/`);
const isPrivate=path=>PRIVATE_PATHS.some(prefix=>path===prefix||path.startsWith(`${prefix}/`));
function json(data,status=200,extra={}){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-media-command-wrapper':VERSION,'x-gnk-asg-media-ai-responder':MEDIA_AI_VERSION,...extra}});}
function eq(a,b){a=String(a||'');b=String(b||'');let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
async function sha(value){const digest=await crypto.subtle.digest('SHA-256',enc.encode(String(value||'')));return[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function b64(bytes){let value='';for(const item of new Uint8Array(bytes))value+=String.fromCharCode(item);return btoa(value).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');}
async function mac(secret,value){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(await crypto.subtle.sign('HMAC',key,enc.encode(value)));}
function rawSecrets(env){return [...TOKEN_NAMES].map(name=>clean(env[name])).filter(Boolean);}
async function material(env){const configuredHash=clean(env.OPERATOR_TOKEN_SHA256).toLowerCase();if(/^[a-f0-9]{64}$/.test(configuredHash))return{configured:true,hash:configuredHash,raw:rawSecrets(env)[0]||'',source:'sha256'};const raw=rawSecrets(env)[0]||'';return raw?{configured:true,hash:await sha(raw),raw,source:'raw'}:{configured:false,hash:'',raw:'',source:'none'};}
function requestToken(request){const authorization=request.headers.get('authorization')||'',match=authorization.match(/^Bearer\s+(.+)$/i);return clean((match&&match[1])||request.headers.get('x-operator-token')||request.headers.get('x-admin-token')||request.headers.get('x-gnk-asg-token'));}
function cookieValue(request){for(const part of (request.headers.get('cookie')||'').split(';')){const index=part.indexOf('=');if(index>0&&part.slice(0,index).trim()===COOKIE){try{return decodeURIComponent(part.slice(index+1).trim());}catch{return'';}}}return'';}
async function tokenOk(request,env){const token=requestToken(request),auth=await material(env);if(!token||!auth.configured)return{ok:false,auth};return{ok:auth.raw?eq(token,auth.raw):eq(await sha(token),auth.hash),auth};}
async function sessionOk(request,env){const auth=await material(env),value=cookieValue(request),dot=value.indexOf('.');if(!auth.configured||dot<1)return{ok:false,auth};const expires=Number(value.slice(0,dot)),signature=value.slice(dot+1);if(!Number.isFinite(expires)||expires<=Math.floor(Date.now()/1000))return{ok:false,auth};return{ok:eq(signature,await mac(auth.hash,`gnk-asg-admin:${expires}`)),auth};}
async function access(request,env){const direct=await tokenOk(request,env);if(direct.ok)return{ok:true,mode:'token',auth:direct.auth};const session=await sessionOk(request,env);if(session.ok)return{ok:true,mode:'session',auth:session.auth};return{ok:false,mode:null,auth:direct.auth.configured?direct.auth:session.auth};}
async function sessionCookie(auth){const expires=Math.floor(Date.now()/1000)+MAX_AGE,signature=await mac(auth.hash,`gnk-asg-admin:${expires}`);return`${COOKIE}=${encodeURIComponent(`${expires}.${signature}`)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE}`;}
function esc(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function loginPage(message='',status=401){const error=message?`<p class="error">${esc(message)}</p>`:'';return new Response(`<!doctype html><html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>GNK ASG — Media Command prijava</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 20% 0%,#173257,#020812 55%);color:#fff;font-family:Arial,sans-serif}.card{width:min(460px,90%);padding:28px;border:1px solid #d7aa3c;border-radius:20px;background:#07172a;box-shadow:0 28px 80px rgba(0,0,0,.55)}h1{margin:0 0 12px;color:#ffe08a}p{color:#cbd5e1;line-height:1.5}.error{color:#ffb4b4}input,button,a{width:100%;box-sizing:border-box;padding:14px;margin-top:10px;border-radius:10px}input{border:1px solid rgba(215,170,60,.55);background:#020812;color:#fff}button{border:0;background:#e6bd57;color:#07101d;font-weight:900;cursor:pointer}.back{display:block;text-align:center;color:#fff;text-decoration:none;border:1px solid rgba(215,170,60,.35)}</style></head><body><main class="card"><h1>Media Command Center</h1><p>Zaštićeni modul ispod GNK ASG Admina. Unesite postojeći operatorski token.</p>${error}<form method="post" action="/media-command-center/"><input name="token" type="password" required autofocus autocomplete="current-password" placeholder="Operatorski token"><button type="submit">PRIJAVA</button></form><a class="back" href="/admin-center/">Povratak na Admin</a></main></body></html>`,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-gnk-asg-media-command-wrapper':VERSION,'x-gnk-asg-media-ai-responder':MEDIA_AI_VERSION}});}
async function submittedToken(request){try{const form=await request.formData();return clean(form.get('token'));}catch{return'';}}
async function login(request,env){const token=await submittedToken(request),auth=await material(env);if(!auth.configured)return loginPage('Operatorski secret nije konfiguriran.',503);const valid=Boolean(token&&(auth.raw?eq(token,auth.raw):eq(await sha(token),auth.hash)));if(!valid)return loginPage('Token nije valjan.',401);return new Response(null,{status:303,headers:{location:'/media-command-center/','cache-control':'no-store','set-cookie':await sessionCookie(auth),'x-gnk-asg-media-command-wrapper':VERSION,'x-gnk-asg-media-ai-responder':MEDIA_AI_VERSION}});}
function internalToken(auth){return`gnk-auth-v14-${auth.hash}`;}
function patchedEnv(env,token){return new Proxy(env,{get(target,property,receiver){if(TOKEN_NAMES.has(String(property)))return token;return Reflect.get(target,property,receiver);}});}
function patchedRequest(request,token){const headers=new Headers(request.headers);headers.set('authorization',`Bearer ${token}`);headers.set('x-operator-token',token);headers.set('x-admin-token',token);headers.set('x-gnk-asg-token',token);return new Request(request,{headers});}
async function injectNavigation(response){const type=String(response.headers.get('content-type')||'');if(!type.includes('text/html'))return response;const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');headers.set('x-gnk-asg-media-command-wrapper',VERSION);headers.set('x-gnk-asg-media-ai-responder',MEDIA_AI_VERSION);let html=await response.text();if(!html.includes('admin-media-command-center-nav-v20.js'))html=html.includes('</body>')?html.replace('</body>',`${NAV_SCRIPT}</body>`):html+NAV_SCRIPT;return new Response(html,{status:response.status,statusText:response.statusText,headers});}
async function versionResponse(request,env,ctx){const response=await app.fetch(request,env,ctx);try{const payload=await response.clone().json();return json({...payload,deployedEntryPoint:'src/index-final-admin-gateway-v1.js',mediaCommandIntegrationEntryPoint:'src/index-mail-studio-bridge-v16.js',mediaCommandCenter:MEDIA_VERSION,mediaCommandWrapper:VERSION,mediaCommandRoute:'/media-command-center/',mediaCommandDeadline:'2026-07-20T23:59:59+02:00',mediaCommandEntryPoint:'src/index-media-command-center-v20.js',mediaCommandSending:'LOCKED_UNTIL_FINAL_PDF_APPROVAL',mediaAiResponder:MEDIA_AI_VERSION,mediaAiMode:'DETERMINISTIC_RANDOM_VIRTUAL_DESK_TWO_PASS_HUMAN_REVIEW',mediaAiDisclosure:'REQUIRED'});}catch{return response;}}
function address(value){const text=clean(value),match=text.match(/<([^>]+)>/);return clean(match?.[1]||text).toLowerCase();}
function mediaTarget(message){return address(message?.to||message?.headers?.get?.('to'))===MEDIA_EMAIL;}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(request.method==='GET'&&path==='/data/portal-version.json')return versionResponse(request,env,ctx);
    if(isMedia(path)){
      if(path===MEDIA_UI&&request.method==='POST'&&(request.headers.get('content-type')||'').includes('application/x-www-form-urlencoded'))return login(request,env);
      const state=await access(request,env);
      if(!state.ok)return path.startsWith(MEDIA_API)?json({ok:false,error:'unauthorized',configured:state.auth.configured},401):loginPage();
      if(path===`${MEDIA_API}/send-one`||path===`${MEDIA_API}/send-batch`)return json({ok:false,error:'production_sending_locked',message:'Slanje je zaključano do završne validacije PDF-a, kvota i izričitog produkcijskog odobrenja.'},423);
      const token=internalToken(state.auth),response=await handleMediaCommandCenter(patchedRequest(request,token),patchedEnv(env,token),ctx);
      return injectNavigation(response||json({ok:false,error:'media_route_not_handled'},500));
    }
    const response=await app.fetch(request,env,ctx);
    if(isPrivate(path)&&['GET','HEAD'].includes(request.method))return injectNavigation(response);
    return response;
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){
    if(mediaTarget(message)){
      let prepared=null;
      try{
        const rawBuffer=await new Response(message.raw).arrayBuffer();
        prepared=await prepareMediaInbound(message,rawBuffer,env);
        if(prepared.action==='ignore'){
          if(prepared.record)await finalizeInbound(env,prepared.record,'IGNORED',{reason:prepared.reason});
          return;
        }
        if(prepared.action==='unsubscribe'){
          await suppressInboundSender(env,prepared.record,'recipient_unsubscribe_request');
          return;
        }
        const replay=cloneInboundMessage(message,rawBuffer);
        if(prepared.action==='pass'){
          try{await handleMediaCommandCenterEmail(replay,env,ctx);}catch(error){console.error('media-command-center-email-pass',error);}
          return;
        }
        if(prepared.action==='application'){
          const handled=await handleMediaCommandCenterEmail(replay,coreEnvWithoutAutoAck(env),ctx);
          const application=await lookupApplicationForMessage(env,prepared.record.messageId);
          if(!handled)throw new Error('application_not_recorded');
          await sendMediaAiResponse(message,env,prepared.record,{application:application||{applicationId:'',status:'PENDING',invitation_code:prepared.record.classification.invitationCode}});
          return;
        }
        await sendMediaAiResponse(message,env,prepared.record);
        return;
      }catch(error){
        console.error('media-ai-inbound',error);
        if(prepared?.record)await finalizeInbound(env,prepared.record,'ERROR',{error:String(error?.message||error).slice(0,500)}).catch(()=>{});
        return;
      }
    }
    if(typeof app.email==='function')return app.email(message,env,ctx);
  }
};
