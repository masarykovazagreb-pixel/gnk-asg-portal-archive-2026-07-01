import core from './index-portal-repair-v9.js';
import {VERSION,NEWS_MINIMUM,NEWS_HOURS_ZAGREB,NEWS_SCHEDULE,FEEDS,refreshCuratedNews} from './news-curation-v10.js';
import {getIndexConfig,saveIndexConfig} from './index-config-v10.js';
import {isPrivatePath,patchPublicHtml,patchAdminHtml,transformHtml} from './public-shell-v11.js';

const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const now=()=>new Date().toISOString();
const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
async function read(env,key,fallback){const s=store(env);if(!s)return fallback;try{const raw=await s.get(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
async function write(env,key,value,options){const s=store(env);if(!s)return false;if(options)await s.put(key,JSON.stringify(value,null,2),options);else await s.put(key,JSON.stringify(value,null,2));return true}
function tokens(env){return [env.OPERATOR_TOKEN,env.GNK_ASG_OPERATOR_TOKEN,env.ADMIN_TOKEN,env.GNK_ASG_ADMIN_TOKEN,env.NEWS_PUBLISH_TOKEN].map(v=>String(v||'').trim()).filter(Boolean)}
function authorized(request,env){const bearer=request.headers.get('authorization')||'',token=request.headers.get('x-operator-token')||request.headers.get('x-admin-token')||request.headers.get('x-gnk-asg-token')||bearer.replace(/^Bearer\s+/i,'');return Boolean(token&&tokens(env).includes(String(token).trim()))}
function context(env){return{read:(key,fallback)=>read(env,key,fallback),write:(key,value,options)=>write(env,key,value,options),authorized:request=>authorized(request,env)}}
function zagreb(date=new Date()){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return{year:+p.year,month:+p.month,day:+p.day,hour:+p.hour,minute:+p.minute,slotKey:`${p.year}-${p.month}-${p.day}-${p.hour}`}}
async function claim(env,type,slot){const s=store(env);if(!s)return true;const key=`automation:v16:slot:${type}:${slot}`;if(await s.get(key))return false;await s.put(key,now(),{expirationTtl:172800});return true}
async function runEditor(env,ctx){const token=tokens(env)[0]||'';if(!token)return{ok:false,error:'operator_token_missing',finishedAt:now()};const response=await core.fetch(new Request('https://gnk-asg.hr/operator/auto-editor/run',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:'{}'}),env,ctx);try{return{...(await response.json()),httpStatus:response.status}}catch{return{ok:false,error:`HTTP_${response.status}`,httpStatus:response.status}}}
async function automationStatus(env){return{ok:true,version:VERSION,timeZone:'Europe/Zagreb',newsSchedule:NEWS_SCHEDULE,newsRefreshesPerDay:3,autoEditorSchedule:'every 2 hours with immediate stale bootstrap',autoEditorStaleAfterMinutes:135,minimumNewsLinks:NEWS_MINIMUM,configuredNewsSources:FEEDS.length,lastNewsRefresh:await read(env,'automation:news-refresh:last',null),lastAutoEditor:await read(env,'auto-editor:last',null),lastScheduledRun:await read(env,'automation:v11:last',null)}
async function refresh(env){return refreshCuratedNews(context(env))}
function refreshBootstrapNeeded(last){const stamp=Date.parse(last?.updatedAt||'');return last?.version!==VERSION||last?.ok!==true||!Number.isFinite(stamp)||Date.now()-stamp>9*60*60*1000}
function editorBootstrapNeeded(last){const stamp=Date.parse(last?.finishedAt||last?.article?.publishedAt||last?.updatedAt||'');return last?.ok!==true||!Number.isFinite(stamp)||Date.now()-stamp>135*60*1000}

async function handle(request,env,ctx){
  const url=new URL(request.url),path=url.pathname.replace(/\/+$/,'')||'/';
  if(request.method==='GET'&&(path==='/data/index-media-config.json'||path==='/api/index-media-config')){
    if(path==='/api/index-media-config'&&!authorized(request,env))return json({ok:false,error:'unauthorized'},401);
    const config=await getIndexConfig(context(env).read);
    return json(path==='/api/index-media-config'?{ok:true,config}:config);
  }
  if(path==='/api/index-media-config'&&request.method==='POST')return saveIndexConfig(request,context(env));
  if(request.method==='OPTIONS'&&path==='/api/index-media-config')return new Response(null,{status:204});
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
