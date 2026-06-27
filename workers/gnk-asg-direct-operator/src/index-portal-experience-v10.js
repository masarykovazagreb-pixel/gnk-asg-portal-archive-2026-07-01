import core from './index-portal-repair-v9.js';
import {VERSION,NEWS_MINIMUM,NEWS_HOURS_ZAGREB,NEWS_SCHEDULE,FEEDS,refreshCuratedNews} from './news-curation-v10.js';
import {getIndexConfig,saveIndexConfig} from './index-config-v10.js';
import {isPrivatePath,patchPublicHtml,patchAdminHtml,transformHtml} from './public-shell-v11.js';

const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const now=()=>new Date().toISOString();
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
async function read(env,key,fallback){const s=store(env);if(!s)return fallback;try{const raw=await s.get(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
async function write(env,key,value,options){const s=store(env);if(!s)return false;if(options)await s.put(key,JSON.stringify(value,null,2),options);else await s.put(key,JSON.stringify(value,null,2));return true}
async function list(env,key){const value=await read(env,key,[]);return Array.isArray(value)?value:[]}
async function push(env,key,item,max=500){const items=[item,...(await list(env,key)).filter(x=>x&&x.id!==item.id)].slice(0,max);await write(env,key,items);return items}
function tokens(env){return [env.OPERATOR_TOKEN,env.GNK_ASG_OPERATOR_TOKEN,env.ADMIN_TOKEN,env.GNK_ASG_ADMIN_TOKEN,env.NEWS_PUBLISH_TOKEN].map(v=>String(v||'').trim()).filter(Boolean)}
function authorized(request,env){const bearer=request.headers.get('authorization')||'',token=request.headers.get('x-operator-token')||request.headers.get('x-admin-token')||request.headers.get('x-gnk-asg-token')||bearer.replace(/^Bearer\s+/i,'');return Boolean(token&&tokens(env).includes(String(token).trim()))}
function context(env){return{read:(key,fallback)=>read(env,key,fallback),write:(key,value,options)=>write(env,key,value,options),authorized:request=>authorized(request,env)}}
function zagreb(date=new Date()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return{year:+p.year,month:+p.month,day:+p.day,hour:+p.hour,minute:+p.minute,slotKey:`${p.year}-${p.month}-${p.day}-${p.hour}`}}
async function claim(env,type,slot){const s=store(env);if(!s)return true;const key=`automation:v16:slot:${type}:${slot}`;if(await s.get(key))return false;await s.put(key,now(),{expirationTtl:172800});return true}
async function runEditor(env,ctx){const token=tokens(env)[0]||'';if(!token)return{ok:false,error:'operator_token_missing',finishedAt:now()};const response=await core.fetch(new Request('https://gnk-asg.hr/operator/auto-editor/run',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:'{}'}),env,ctx);try{return{...(await response.json()),httpStatus:response.status}}catch{return{ok:false,error:`HTTP_${response.status}`,httpStatus:response.status}}}
async function automationStatus(env){return{ok:true,version:VERSION,timeZone:'Europe/Zagreb',newsSchedule:NEWS_SCHEDULE,newsRefreshesPerDay:3,autoEditorSchedule:'every 2 hours with immediate stale bootstrap',autoEditorStaleAfterMinutes:135,minimumNewsLinks:NEWS_MINIMUM,configuredNewsSources:FEEDS.length,lastNewsRefresh:await read(env,'automation:news-refresh:last',null),lastAutoEditor:await read(env,'auto-editor:last',null),lastScheduledRun:await read(env,'automation:v11:last',null)}}
async function refresh(env){return refreshCuratedNews(context(env))}
function refreshBootstrapNeeded(last){const stamp=Date.parse(last?.updatedAt||'');return last?.version!==VERSION||last?.ok!==true||!Number.isFinite(stamp)||Date.now()-stamp>9*60*60*1000}
function editorBootstrapNeeded(last){const stamp=Date.parse(last?.finishedAt||last?.article?.publishedAt||last?.updatedAt||'');return last?.ok!==true||!Number.isFinite(stamp)||Date.now()-stamp>135*60*1000}

async function readBody(request){try{return await request.json()}catch{return{}}}
function id(prefix){return `${prefix}-${now().replace(/[-:.TZ]/g,'').slice(0,14)}-${Math.random().toString(16).slice(2,8)}`}
function clean(value,max=2000){return String(value||'').replace(/\u0000/g,'').trim().slice(0,max)}
function emailList(value){return clean(value,2000).split(/[;,\n]+/).map(x=>x.trim()).filter(Boolean).slice(0,100)}
function safeAttachment(a){return{filename:clean(a?.filename||a?.name||'attachment.pdf',180),type:clean(a?.type||a?.contentType||a?.mimeType||'application/pdf',80),size:Number(a?.size||0)||0,hasBase64:Boolean(a?.base64||a?.content)}}
async function mailStatus(env){return{ok:true,service:'GNK ASG Mail Center',mode:String(env.MAIL_STUDIO_LIVE||'test_record_only'),kvBinding:!!store(env),emailBinding:!!(env.EMAIL&&typeof env.EMAIL.send==='function'),liveSendEnabled:String(env.MAIL_STUDIO_LIVE||'').toLowerCase()==='true',sentCount:(await list(env,'mail:center:sent')).length,outboxCount:(await list(env,'mail:center:outbox')).length,inboxCount:(await list(env,'mail:center:inbox')).length,updatedAt:now()}}
async function handleMailSend(request,env){
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  const m=await readBody(request),to=emailList(m.to),cc=emailList(m.cc),bcc=emailList(m.bcc),subject=clean(m.subject,300),html=clean(m.html||m.bodyHtml||m.body||'',120000),text=clean(m.text||m.plainText||'',120000),attachments=Array.isArray(m.attachments)?m.attachments.map(safeAttachment).slice(0,20):[];
  if(!to.length)return json({ok:false,error:'missing_to'},400);
  if(!subject)return json({ok:false,error:'missing_subject'},400);
  if(!html&&!text)return json({ok:false,error:'missing_body'},400);
  const live=String(env.MAIL_STUDIO_LIVE||'').toLowerCase()==='true'&&authorized(request,env)&&env.EMAIL&&typeof env.EMAIL.send==='function';
  const item={id:id('mail'),createdAt:now(),status:live?'live_send_not_executed_by_safe_patch':'test_recorded',from:clean(m.from,180),fromName:clean(m.fromName,180),to,cc,bcc,subject,html,text,signatureProfile:clean(m.signatureProfile,80),signatureMode:clean(m.signatureMode,120),logoUrl:clean(m.logoUrl,400),attachments,attachmentCount:attachments.length,source:'mail-studio-safe-backend-v1'};
  await push(env,'mail:center:sent',item,500);
  await push(env,'mail:center:outbox',item,500);
  await write(env,'mail:center:last',item);
  return json({ok:true,delivered:false,recorded:true,mode:item.status,item});
}
async function handleMailCenter(path,env){
  if(path==='/api/mail-center/status')return json(await mailStatus(env));
  const key=path.endsWith('/sent')?'mail:center:sent':path.endsWith('/outbox')?'mail:center:outbox':'mail:center:inbox';
  return json({ok:true,box:key.split(':').pop(),items:await list(env,key),updatedAt:now()});
}
function aiFallback(m){const tone=clean(m.tone||m.style||'profesionalno',120),recipient=clean(m.recipientName||'primatelju',160),goal=clean(m.goal||'odgovoriti jasno i profesionalno',260),contextText=clean(m.context||m.text||'',1200);return `Poštovani ${recipient},\n\nvezano uz Vašu poruku, potvrđujemo primitak i zahvaljujemo na dostavljenim informacijama. Cilj ovog odgovora je ${goal}.\n\n${contextText?`Uzimajući u obzir dostavljeni kontekst, postupit ćemo pažljivo i pisanim putem potvrditi sve relevantne daljnje korake.\n\n`:''}Molimo da nam, ako je potrebno, dostavite dodatnu dokumentaciju ili rokove kako bismo mogli pripremiti cjelovit odgovor.\n\nSrdačan pozdrav,`;}
async function handleAiAssist(request){if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);const m=await readBody(request);return json({ok:true,ai:false,model:'safe-fallback',text:aiFallback(m)});}
async function handleContactSubmit(request,env){if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);const m=await readBody(request),item={id:id('contact'),createdAt:now(),name:clean(m.name||m.fullName,180),email:clean(m.email,220),phone:clean(m.phone,120),subject:clean(m.subject,260),message:clean(m.message||m.body,6000),source:'contact-form-safe-backend-v1'};if(!item.email&&!item.phone)return json({ok:false,error:'missing_contact'},400);if(!item.message)return json({ok:false,error:'missing_message'},400);await push(env,'contact:submissions',item,500);await write(env,'contact:last',item);return json({ok:true,recorded:true,item});}

async function handle(request,env,ctx){
  const url=new URL(request.url),path=url.pathname.replace(/\/+$/,'')||'/';
  if(request.method==='OPTIONS'&&path.startsWith('/api/'))return new Response(null,{status:204,headers:{'access-control-allow-origin':'https://gnk-asg.hr','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization,x-operator-token,x-admin-token,x-gnk-asg-token'}});
  if(path==='/api/admin-mail-send')return handleMailSend(request,env);
  if(path.startsWith('/api/mail-center/'))return handleMailCenter(path,env);
  if(path==='/api/ai-assist')return handleAiAssist(request,env);
  if(path==='/api/contact-submit'||path==='/api/contact')return handleContactSubmit(request,env);
  if(request.method==='GET'&&(path==='/data/index-media-config.json'||path==='/api/index-media-config')){
    if(path==='/api/index-media-config'&&!authorized(request,env))return json({ok:false,error:'unauthorized'},401);
    const config=await getIndexConfig(context(env).read);
    return json(path==='/api/index-media-config'?{ok:true,config}:config);
  }
  if(path==='/api/index-media-config'&&request.method==='POST')return saveIndexConfig(request,context(env));
  if(request.method==='GET'&&path==='/data/news-sources.json')return json({ok:true,version:VERSION,minimumLinks:NEWS_MINIMUM,count:FEEDS.length,sources:FEEDS.map(f=>({name:f[0],category:f[1],region:f[2],url:f[4]}))});
  if(request.method==='GET'&&path==='/data/news-automation-status.json')return json(await automationStatus(env));
  if(path==='/api/news-refresh'&&request.method==='POST'){
    const last=await read(env,'automation:public-refresh:last',null),time=Date.parse(last?.updatedAt||'');
    if(Number.isFinite(time)&&Date.now()-time<300000)return json({ok:false,error:'refresh_cooldown',retryAfter:Math.ceil((300000-(Date.now()-time))/1000)},429);
    await write(env,'automation:public-refresh:last',{updatedAt:now()},{expirationTtl:600});
    return json(await refresh(env));
  }
  if(['/operator/news-refresh','/operator/news-automation/run','/operator/automation-v11/run'].includes(path)){
    if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
    if(!authorized(request,env))return json({ok:false,error:'authorization_required'},401);
    const news=await refresh(env);
    if(path==='/operator/news-refresh')return json(news,news.ok?200:500);
    const editor=await runEditor(env,ctx);
    return json({ok:news.ok&&editor.ok!==false,news,editor},news.ok&&editor.ok!==false?200:500);
  }
  const response=await core.fetch(request,env,ctx),type=response.headers.get('content-type')||'';
  if(request.method==='GET'&&type.includes('text/html')){
    if(path==='/operator-dashboard')return transformHtml(response,patchAdminHtml);
    if(!isPrivatePath(path))return transformHtml(response,html=>patchPublicHtml(html,url.pathname));
  }
  return response;
}

async function scheduledRun(event,env,ctx){
  const local=zagreb(),lastNewsRefresh=await read(env,'automation:news-refresh:last',null),newsBootstrap=refreshBootstrapNeeded(lastNewsRefresh),lastAutoEditor=await read(env,'auto-editor:last',null),editorBootstrap=editorBootstrapNeeded(lastAutoEditor),result={ok:true,version:VERSION,cron:event?.cron||'',timeZone:'Europe/Zagreb',local,startedAt:now(),newsRefresh:null,newsReason:null,autoEditor:null,autoEditorReason:null,skipped:[]};
  if(NEWS_HOURS_ZAGREB.has(local.hour)||newsBootstrap){
    const reason=newsBootstrap?'bootstrap-or-stale':'scheduled';
    if(await claim(env,`news-${reason}`,local.slotKey)){result.newsReason=reason;result.newsRefresh=await refresh(env)}else result.skipped.push(`news:${reason}:${local.slotKey}`);
  }
  if(local.hour%2===0||editorBootstrap){
    const reason=editorBootstrap?'bootstrap-or-stale':'scheduled-2h';
    if(await claim(env,`editor-${reason}`,local.slotKey)){result.autoEditorReason=reason;result.autoEditor=await runEditor(env,ctx)}else result.skipped.push(`editor:${reason}:${local.slotKey}`);
  }
  result.finishedAt=now();
  result.ok=result.newsRefresh?.ok!==false&&result.autoEditor?.ok!==false;
  await write(env,'automation:v11:last',result);
  return result;
}

export default{fetch:handle,async scheduled(event,env,ctx){const task=scheduledRun(event,env,ctx);if(ctx?.waitUntil){ctx.waitUntil(task);return}return task},async email(message,env,ctx){if(typeof core.email==='function')return core.email(message,env,ctx)}};
export{VERSION,FEEDS};
