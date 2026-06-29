import app from './index-auto-editor-fallback-v1.js';
import { EmailMessage } from 'cloudflare:email';
import { runScheduledRefresh } from './gnk-asg-refresh-backend-v1.js';
import {
  EDITORIAL_VERSION,
  json,
  editorialStatus,
  listDrafts,
  saveDraft,
  deleteDraft,
  generateAiDraft,
  generateScheduledDraft,
  publishDraft,
  refreshBusinessSources,
  monitorPublications,
  scheduleLock,
  writeScheduleResult
} from './editorial-core-v1.js';
import {runAutomatedPublication,AUTO_PUBLISH_VERSION} from './editorial-auto-publish-v2.js';
import {ensureEditorialBootstrap,EDITORIAL_BOOTSTRAP_VERSION} from './editorial-bootstrap-v2.js';

const ROOT='/auto-editor/editorial';
const API='/auto-editor/editorial/api/';
const BURST_START=Date.parse('2026-06-27T20:00:00+02:00');
const BURST_END=Date.parse('2026-06-29T23:59:59+02:00');
const BURST_TARGET=10;
const MEDIA_EMAIL='media@gnk-asg.hr';
const MEDIA_NAME='GNK DINAMO Ltd. Group | Media Relations & Accreditation Center';
const INTERNAL_COPY='rht@gmx.com';
const INBOUND_VERSION='GNK_ASG_MEDIA_INBOUND_ACTIVE_ENTRY_V1_20260629';
const clean=value=>String(value??'').trim();
async function body(request){try{return await request.json();}catch{return{};}}
function burstState(){const current=Date.now();return{active:current>=BURST_START&&current<=BURST_END,start:new Date(BURST_START).toISOString(),end:new Date(BURST_END).toISOString(),target:BURST_TARGET,cadence:'every 2 hours',afterBurst:'monitor and manual approval'}}

async function isNotFound(response){
  if(response.status===404)return true;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('application/json'))return false;
  try{
    const data=await response.clone().json();
    return data?.error==='not_found'||data?.code==='not_found';
  }catch{return false;}
}

async function servePage(request,env){
  if(!env.ASSETS?.fetch)return json({ok:false,error:'assets_binding_missing'},503);
  const assetUrl=new URL('/auto-editor/index.html',request.url);
  const response=await env.ASSETS.fetch(new Request(assetUrl.toString(),request));
  if(!response.ok)return json({ok:false,error:'editorial_asset_not_found'},404);
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  return new Response(await response.text(),{status:200,headers});
}

async function api(request,env,path){
  if(path===`${API}status`&&request.method==='GET'){
    const status=await editorialStatus(env);
    return json({...status,autoPublishVersion:AUTO_PUBLISH_VERSION,bootstrapVersion:EDITORIAL_BOOTSTRAP_VERSION,burst:burstState(),publicationMode:burstState().active?'validated automatic publication every 2 hours during temporary fill':'draft, monitor and manual approval',mediaInbound:INBOUND_VERSION});
  }
  if(path===`${API}drafts`&&request.method==='GET')return json({ok:true,items:await listDrafts(env)});
  if(path===`${API}draft/save`&&request.method==='POST')return json(await saveDraft(env,await body(request)));
  if(path===`${API}draft/delete`&&request.method==='POST'){const data=await body(request);return json(await deleteDraft(env,clean(data.id)));}
  if(path===`${API}ai-draft`&&request.method==='POST'){
    try{return json(await generateAiDraft(env,await body(request)));}
    catch(error){return json({ok:false,error:clean(error?.message||error)},500);}
  }
  if(path===`${API}publish`&&request.method==='POST'){
    const data=await body(request);
    const result=await publishDraft(env,clean(data.id));
    return json(result,result.ok?200:400);
  }
  if(path===`${API}bootstrap/run`&&request.method==='POST'){
    try{const data=await body(request);const result=await ensureEditorialBootstrap(env,{minimum:Number(data.minimum||BURST_TARGET)});return json(result,result.ok?200:500)}
    catch(error){return json({ok:false,error:clean(error?.message||error)},500)}
  }
  if(path===`${API}auto-publish/run`&&request.method==='POST'){
    try{
      const data=await body(request);
      const result=await runAutomatedPublication(env,{forceSourceRefresh:data.forceSourceRefresh!==false});
      return json(result,result.ok?200:500);
    }catch(error){return json({ok:false,error:clean(error?.message||error)},500);}
  }
  if(path===`${API}sources/refresh`&&request.method==='POST')return json(await refreshBusinessSources(env));
  if(path===`${API}draft/from-news`&&request.method==='POST'){
    try{return json(await generateScheduledDraft(env));}
    catch(error){return json({ok:false,error:clean(error?.message||error)},500);}
  }
  if(path===`${API}monitor/run`&&request.method==='POST')return json(await monitorPublications(env));
  return json({ok:false,error:'not_found'},404);
}

function localTime(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zagreb',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return{date:`${values.year}-${values.month}-${values.day}`,hour:Number(values.hour),minute:Number(values.minute)};
}

async function scheduledRun(event,env,ctx){
  const local=localTime();
  const burst=burstState();
  const monitorSlot=Math.floor(Date.now()/(2*60*60*1000));
  const result={ok:true,version:EDITORIAL_VERSION,autoPublishVersion:AUTO_PUBLISH_VERSION,bootstrapVersion:EDITORIAL_BOOTSTRAP_VERSION,cron:event?.cron||'',local,burst,startedAt:new Date().toISOString(),bootstrap:null,market:null,monitor:null,sourceRefresh:null,publication:null};
  result.bootstrap=await ensureEditorialBootstrap(env,{minimum:BURST_TARGET});
  if((local.hour===9||local.hour===16)&&await scheduleLock(env,`editorial:lock:source:${local.date}:${local.hour}`,21600)){
    result.sourceRefresh=await refreshBusinessSources(env);
  }
  if(await scheduleLock(env,`editorial:lock:auto-publish:${monitorSlot}`,7100)){
    try{result.market=await runScheduledRefresh(env,ctx);}catch(error){result.market={ok:false,error:clean(error?.message||error)};}
    if(burst.active){
      result.publication=await runAutomatedPublication(env,{forceSourceRefresh:false});
      result.monitor=result.publication?.monitor||await monitorPublications(env);
    }else{
      result.publication={ok:true,status:'TEMPORARY_BURST_COMPLETE',automaticPublication:false,mode:'monitor_and_manual_approval',checkedAt:new Date().toISOString()};
      result.monitor=await monitorPublications(env);
    }
  }
  result.finishedAt=new Date().toISOString();
  result.ok=[result.bootstrap,result.market,result.sourceRefresh,result.publication].filter(Boolean).every(item=>item.ok!==false);
  await writeScheduleResult(env,result);
  return result;
}

function header(message,name){try{return clean(message?.headers?.get?.(name));}catch{return'';}}
function emailAddress(value){const text=clean(value);const match=text.match(/<([^>]+)>/);return clean(match?.[1]||text).toLowerCase();}
function isMediaTarget(message){return emailAddress(message?.to||header(message,'to'))===MEDIA_EMAIL;}
function safeHeader(value){return clean(value).replace(/[\r\n]+/g,' ').slice(0,240);}
function automatedInbound(message,from){
  const auto=header(message,'auto-submitted').toLowerCase();
  const precedence=header(message,'precedence').toLowerCase();
  const suppress=header(message,'x-auto-response-suppress').toLowerCase();
  const subject=header(message,'subject').toLowerCase();
  return Boolean((auto&&auto!=='no')||/bulk|list|junk/.test(precedence)||suppress||/mailer-daemon|postmaster|no-?reply|donotreply/.test(from)||/automatic reply|auto reply|out of office|izvan ureda|undeliverable|delivery status notification/.test(subject));
}
function detectLanguage(value){
  const text=` ${clean(value).toLowerCase().replace(/[^a-zà-žčćžšđ\s]/g,' ')} `;
  const hr=[' poštovani ',' prijava ',' redakcija ',' akreditacija ',' mediji ',' upit ',' poruka ',' zaprimljena ',' dokument ',' molim ',' hvala '].reduce((n,x)=>n+(text.includes(x)?1:0),0);
  const de=[' guten tag ',' anfrage ',' presse ',' nachricht ',' dokument ',' danke '].reduce((n,x)=>n+(text.includes(x)?1:0),0);
  const it=[' buongiorno ',' richiesta ',' stampa ',' messaggio ',' documento ',' grazie '].reduce((n,x)=>n+(text.includes(x)?1:0),0);
  if(hr>Math.max(de,it,0))return'hr';
  if(de>Math.max(hr,it,0))return'de';
  if(it>Math.max(hr,de,0))return'it';
  return'en';
}
function reference(){return`GNK-MEDIA-IN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;}
function acknowledgement(language,ref,subject){
  const texts={
    en:`Dear Sir or Madam,\n\nThis confirms that your message has been received by the GNK DINAMO Ltd. Group Media Relations & Accreditation Center under reference ${ref}.\n\nOriginal subject: ${subject}\n\nYour message has been placed in the human-review queue. This automatic acknowledgement is not an accreditation approval, acceptance of an offer, contractual commitment or final decision. Please quote the reference above in further correspondence.\n\nKind regards,\nGNK DINAMO Ltd. Group\nMedia Relations & Accreditation Center\nmedia@gnk-asg.hr`,
    hr:`Poštovani,\n\npotvrđujemo da je Vaša poruka zaprimljena u GNK DINAMO Ltd. Group Media Relations & Accreditation Center pod evidencijskim brojem ${ref}.\n\nIzvorni predmet: ${subject}\n\nPoruka je upućena u red za ljudski pregled. Ova automatska potvrda nije odobrenje akreditacije, prihvat ponude, ugovorna obveza niti konačna odluka. U daljnjoj komunikaciji navedite gornji evidencijski broj.\n\nSrdačan pozdrav,\nGNK DINAMO Ltd. Group\nMedia Relations & Accreditation Center\nmedia@gnk-asg.hr`,
    de:`Sehr geehrte Damen und Herren,\n\nwir bestätigen den Eingang Ihrer Nachricht beim Media Relations & Accreditation Center der GNK DINAMO Ltd. Group unter der Referenz ${ref}.\n\nUrsprünglicher Betreff: ${subject}\n\nIhre Nachricht wurde zur menschlichen Prüfung weitergeleitet. Diese automatische Bestätigung stellt keine Akkreditierungszusage, Annahme eines Angebots, vertragliche Verpflichtung oder endgültige Entscheidung dar.\n\nMit freundlichen Grüßen\nGNK DINAMO Ltd. Group\nMedia Relations & Accreditation Center\nmedia@gnk-asg.hr`,
    it:`Gentili Signori,\n\nconfermiamo che il vostro messaggio è stato ricevuto dal Media Relations & Accreditation Center di GNK DINAMO Ltd. Group con il numero di riferimento ${ref}.\n\nOggetto originale: ${subject}\n\nIl messaggio è stato inoltrato per una verifica umana. Questa conferma automatica non costituisce approvazione dell'accredito, accettazione di un'offerta, impegno contrattuale o decisione finale.\n\nCordiali saluti\nGNK DINAMO Ltd. Group\nMedia Relations & Accreditation Center\nmedia@gnk-asg.hr`
  };
  return texts[language]||texts.en;
}
function rawEmail(to,subject,text,originalMessageId=''){
  const id=safeHeader(originalMessageId);
  return[
    `From: ${MEDIA_NAME} <${MEDIA_EMAIL}>`,
    `To: ${to}`,
    `Reply-To: ${MEDIA_EMAIL}`,
    `Subject: ${safeHeader(subject)}`,
    id?`In-Reply-To: ${id}`:'',
    id?`References: ${id}`:'',
    'Auto-Submitted: auto-replied',
    'X-Auto-Response-Suppress: All',
    `X-GNK-ASG-Media-Inbound: ${INBOUND_VERSION}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',text
  ].filter(Boolean).join('\r\n');
}
async function saveInbound(env,record,rawBytes){
  try{
    if(env.GNK_ASG_D1?.prepare){
      await env.GNK_ASG_D1.prepare(`CREATE TABLE IF NOT EXISTS media_inbound_messages(id TEXT PRIMARY KEY,received_at TEXT NOT NULL,from_email TEXT,to_email TEXT,subject TEXT,message_id TEXT,language TEXT,status TEXT,auto_reply_status TEXT,raw_r2_key TEXT,error TEXT)`).run();
      await env.GNK_ASG_D1.prepare(`INSERT OR REPLACE INTO media_inbound_messages(id,received_at,from_email,to_email,subject,message_id,language,status,auto_reply_status,raw_r2_key,error) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(record.id,record.receivedAt,record.from,MEDIA_EMAIL,record.subject,record.messageId,record.language,record.status,record.autoReplyStatus,record.rawR2Key||'',record.error||'').run();
    }
  }catch{}
  try{
    if(env.GNK_ASG_MEDIA_ASSETS?.put&&rawBytes?.byteLength){
      const key=`media-inbound/${record.id}/message.eml`;
      await env.GNK_ASG_MEDIA_ASSETS.put(key,rawBytes,{httpMetadata:{contentType:'message/rfc822'},customMetadata:{reference:record.id,from:record.from,receivedAt:record.receivedAt}});
      record.rawR2Key=key;
    }
  }catch{}
  try{
    const kv=env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV;
    if(kv){
      const raw=await kv.get('mail:center:inbox');
      const list=raw?JSON.parse(raw):[];
      await kv.put('mail:center:inbox',JSON.stringify([{...record,rawBytes:undefined},...(Array.isArray(list)?list:[]).filter(item=>item?.id!==record.id)].slice(0,500)));
      await kv.put(`media:inbound:${record.id}`,JSON.stringify({...record,rawBytes:undefined}));
    }
  }catch{}
}
async function handleMediaInbound(message,env){
  if(!isMediaTarget(message))return false;
  const from=emailAddress(message?.from||header(message,'from'));
  const subject=safeHeader(header(message,'subject')||'(no subject)');
  const messageId=safeHeader(header(message,'message-id'));
  const id=reference(),receivedAt=new Date().toISOString();
  let rawBytes=new ArrayBuffer(0),rawText='';
  try{rawBytes=await new Response(message.raw).arrayBuffer();rawText=new TextDecoder().decode(rawBytes).slice(0,100000);}catch{}
  const language=detectLanguage(`${subject}\n${rawText}`);
  const base={id,receivedAt,from,subject,messageId,language,status:'RECEIVED',autoReplyStatus:'SKIPPED',rawR2Key:'',error:''};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(from)||from===MEDIA_EMAIL||automatedInbound(message,from)){
    await saveInbound(env,{...base,status:'RECEIVED_NO_AUTO_REPLY'},rawBytes);
    return true;
  }
  const kv=env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV;
  const dedupeSource=messageId||`${from}|${subject}|${rawText.slice(0,500)}`;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(dedupeSource));
  const dedupeKey=`media:inbound:dedupe:${[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('')}`;
  try{if(kv&&await kv.get(dedupeKey)){await saveInbound(env,{...base,status:'DUPLICATE'},rawBytes);return true;}if(kv)await kv.put(dedupeKey,id,{expirationTtl:604800});}catch{}
  const text=acknowledgement(language,id,subject),replySubject=/^re:/i.test(subject)?subject:`Re: ${subject}`;
  try{
    const outbound=new EmailMessage(MEDIA_EMAIL,from,rawEmail(from,replySubject,text,messageId));
    if(typeof message.reply==='function')await message.reply(outbound);else if(env.EMAIL?.send)await env.EMAIL.send(outbound);else throw new Error('email_reply_binding_missing');
    try{
      if(env.EMAIL?.send){
        const copyText=`Automatic media acknowledgement copy\n\nReference: ${id}\nFrom: ${from}\nOriginal subject: ${subject}\nLanguage: ${language}\nReceived: ${receivedAt}\nStatus: SENT`;
        await env.EMAIL.send(new EmailMessage(MEDIA_EMAIL,INTERNAL_COPY,rawEmail(INTERNAL_COPY,`[${id}] Media acknowledgement copy`,copyText,'')));
      }
    }catch{}
    await saveInbound(env,{...base,autoReplyStatus:'SENT',autoReplyAt:new Date().toISOString()},rawBytes);
  }catch(error){
    await saveInbound(env,{...base,autoReplyStatus:'FAILED',error:String(error?.message||error).slice(0,500)},rawBytes);
  }
  return true;
}

export default{
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
    const response=await app.fetch(request,env,ctx);
    if(path!==ROOT&&!path.startsWith(API))return response;
    if(!(await isNotFound(response)))return response;
    if(path===ROOT&&(request.method==='GET'||request.method==='HEAD'))return servePage(request,env);
    if(path.startsWith(API))return api(request,env,path);
    return response;
  },
  async scheduled(event,env,ctx){
    const task=scheduledRun(event,env,ctx);
    if(ctx?.waitUntil){ctx.waitUntil(task);return;}
    return task;
  },
  async email(message,env,ctx){
    if(await handleMediaInbound(message,env))return;
    if(typeof app.email==='function')return app.email(message,env,ctx);
  }
};