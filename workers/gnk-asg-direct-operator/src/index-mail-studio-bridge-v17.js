import app from './index-mail-studio-bridge-v15.js';

export const VERSION='GNK_ASG_MAIL_STUDIO_BRIDGE_V17_20260630_ENGLISH_V26_NO_HISTORY';
const CORE='/assets/mail-studio-english-v23.js?v=20260630-7';
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const isMail=path=>path==='/mail-studio'||path.startsWith('/mail-studio/')||path==='/mail-studio-pro'||path.startsWith('/mail-studio-pro/');
const isMailApi=path=>path==='/api/admin-mail-send'||path.startsWith('/api/studio-message/')||path.startsWith('/api/mail-center/');
const isMailboxApi=path=>path==='/api/studio-message/inbox'||path==='/api/mail-center/inbox'||path==='/api/studio-message/sent'||path==='/api/mail-center/sent'||path==='/api/studio-message/outbox'||path==='/api/mail-center/outbox';
const CROATIAN=/\b(poštovani|postovani|poštovana|postovana|predmet|prijava|redakcija|mediji|akreditacija|poziv|odgovor|potvrda|upit|poruka|poruke|slanje|vijesti|direktor|osobni|urednički|urednicki|hvala|molimo|zaprimili|zaprimljena|primitak|vezano|vašu|vasu|najkraćem|najkracem|srdačan|srdacan|pozdrav|poštovanjem|postovanjem|obavijestite|pošiljatelja|posiljatelja)\b/i;
const SENDER_NAMES=new Map([
  ['office@gnk-asg.hr','GNK ASG Office'],
  ['legal@gnk-asg.hr','GNK ASG Legal & Compliance'],
  ['media@gnk-asg.hr','GNK DINAMO Ltd. Group | Media Relations & Accreditation Center'],
  ['it@gnk-asg.hr','GNK ASG IT | Digital Assistant'],
  ['nermin.sefic@gnk-asg.hr','Nermin Sefić | Managing Director'],
  ['info@gnk-asg.hr','GNK ASG Information Desk']
]);
const RESPONSE_REPLACEMENTS=[
  [/IT\s*[–-]\s*Osobni digitalni asistent/gi,'GNK ASG IT | Digital Assistant'],
  [/Nermin Sefić\s*\/\s*Direktor/gi,'Nermin Sefić | Managing Director'],
  [/Korporativne informacije, objave i medijski upiti/gi,'Corporate information, announcements and media inquiries'],
  [/Automatizirana komunikacijska podrška/gi,'Automated communications support'],
  [/Direktor/gi,'Managing Director']
];

function clean(value){return String(value??'').trim();}
function dbOf(env){return env?.GNK_ASG_D1||null;}
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-mail-studio-bridge-v17':VERSION}});}
function senderIdentity(from){
  if(from&&typeof from==='object')return{email:clean(from.email).toLowerCase(),name:clean(from.name)};
  const raw=clean(from),match=raw.match(/^(.*?)\s*<([^>]+)>$/);
  return match?{email:clean(match[2]).toLowerCase(),name:clean(match[1])}:{email:raw.toLowerCase(),name:''};
}
function htmlToText(value){return String(value||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();}
function normalizeEnglishBody(value){
  return String(value||'')
    .replace(/Srdačan pozdrav/gi,'Kind regards')
    .replace(/S poštovanjem/gi,'Kind regards')
    .replace(/OIB\s*:/gi,'Tax ID (OIB):')
    .replace(/MBS\s*:/gi,'Court Register (MBS):')
    .replace(/\bWeb\s*:/gi,'Website:')
    .replace(/E-mail\s*:/gi,'Email:')
    .replace(/IT\s*[–-]\s*Osobni digitalni asistent/gi,'GNK ASG IT | Digital Assistant')
    .replace(/Nermin Sefić\s*\/\s*Direktor/gi,'Nermin Sefić | Managing Director');
}
function normalizeOutbound(payload={}){
  const identity=senderIdentity(payload.from),subject=clean(payload.subject).replace(/[\r\n]+/g,' ');
  if(!subject){const error=new Error('Email subject is required');error.code='EMAIL_SUBJECT_REQUIRED';throw error;}
  if(CROATIAN.test(subject)){const error=new Error('Email subject must be written in English');error.code='EMAIL_SUBJECT_NOT_ENGLISH';throw error;}
  const text=normalizeEnglishBody(payload.text||payload.plainText||payload.body||'');
  const html=normalizeEnglishBody(payload.html||payload.bodyHtml||payload.htmlBody||'');
  const visibleText=clean(text||htmlToText(html));
  if(!visibleText){const error=new Error('Email body is required');error.code='EMAIL_BODY_REQUIRED';throw error;}
  if(CROATIAN.test(visibleText)){const error=new Error('Email body must be written in English');error.code='EMAIL_BODY_NOT_ENGLISH';throw error;}
  const email=identity.email||'info@gnk-asg.hr';
  return{...payload,from:{email,name:SENDER_NAMES.get(email)||'GNK ASG'},subject,text,plainText:text,html,bodyHtml:html,headers:{...(payload.headers||{}),'X-GNK-ASG-Mail-Language':'ENGLISH_ONLY','X-GNK-ASG-Mail-Studio-Bridge':VERSION}};
}
function withEnglishMailHeaders(env){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  const wrapped=Object.create(env||null);
  Object.defineProperty(wrapped,'EMAIL',{enumerable:true,configurable:true,value:{send(payload){return binding.send.call(binding,normalizeOutbound(payload));}}});
  return wrapped;
}
async function ensureInbox(env){
  const db=dbOf(env);if(!db?.prepare)return null;
  await db.prepare(`CREATE TABLE IF NOT EXISTS manual_mail_inbox(
    id TEXT PRIMARY KEY,message_id TEXT,from_email TEXT,to_email TEXT,subject TEXT,received_at TEXT,status TEXT NOT NULL DEFAULT 'RECEIVED'
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_manual_mail_inbox_received ON manual_mail_inbox(received_at DESC)`).run();
  return db;
}
function header(message,name){try{return clean(message?.headers?.get?.(name));}catch{return'';}}
async function storeInbound(message,env){
  try{
    const db=await ensureInbox(env);if(!db)return;
    const messageId=header(message,'message-id')||crypto.randomUUID();
    const id=messageId.replace(/[<>]/g,'').slice(0,240)||crypto.randomUUID();
    const from=clean(message?.from||header(message,'from')).slice(0,500);
    const to=clean(message?.to||header(message,'to')).slice(0,500);
    const subject=(header(message,'subject')||'(no subject)').replace(/[\r\n]+/g,' ').slice(0,240);
    const receivedAt=new Date().toISOString();
    await db.prepare(`INSERT OR IGNORE INTO manual_mail_inbox(id,message_id,from_email,to_email,subject,received_at,status) VALUES(?,?,?,?,?,?,?)`).bind(id,messageId,from,to,subject,receivedAt,'RECEIVED').run();
  }catch(error){console.error('manual-mail-inbox-store',error);}
}
function mailboxResponse(){return json({ok:true,version:VERSION,items:[],message:'Message records are available only in the controlled spreadsheet audit export.'});}
function translateLogin(html){
  return String(html||'')
    .replace(/<html\s+lang=["']hr["']/i,'<html lang="en"')
    .replace(/GNK ASG\s*[—-]\s*Sigurna prijava/gi,'GNK ASG — Secure sign in')
    .replace(/GNK ASG sigurna prijava/gi,'GNK ASG secure sign in')
    .replace(/Unesite postojeći operatorski token\. Nakon provjere otvara se sigurna HttpOnly sesija koja traje 12 sati\./gi,'Enter the existing operator token. A secure HttpOnly session will remain active for 12 hours after validation.')
    .replace(/Operatorski token/gi,'Operator token')
    .replace(/PRIJAVA/g,'SIGN IN')
    .replace(/Povratak na portal/gi,'Return to portal')
    .replace(/Operatorski secret nije konfiguriran\./gi,'The operator secret is not configured.')
    .replace(/Token nije valjan\./gi,'The token is not valid.');
}
async function patchMailPage(response,path){
  if(!isMail(path)||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.delete('last-modified');
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');headers.set('cdn-cache-control','no-store');headers.set('cloudflare-cdn-cache-control','no-store');
  headers.set('x-gnk-asg-mail-studio-language','ENGLISH_ONLY');headers.set('x-gnk-asg-mail-studio-bridge-v17',VERSION);
  let html=await response.text();
  if([401,403,503].includes(response.status))html=translateLogin(html);
  else{
    for(const name of ['studio-core-v21','mail-studio-controls-v18','mail-studio-click-feedback-v19','mail-studio-hotfix-v20','mail-studio-profile-test-v1','mail-studio-delivery-policy-v1','mail-studio-delivery-history-v2','delivery-history-dashboard-v3','mail-studio-english-v23'])html=html.replace(new RegExp(`<script[^>]+src=["'][^"']*${name}\\.js[^"']*["'][^>]*><\\/script>`,'gi'),'');
    const scripts=`<script defer src="${CORE}"></script>`;
    html=html.includes('</body>')?html.replace('</body>',scripts+'</body>'):html+scripts;
  }
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
async function patchMailJson(response,path){
  if(!isMailApi(path)||!String(response.headers.get('content-type')||'').includes('application/json'))return response;
  const headers=new Headers(response.headers);headers.delete('content-length');headers.set('cache-control','no-store');
  let text=await response.text();for(const [pattern,replacement] of RESPONSE_REPLACEMENTS)text=text.replace(pattern,replacement);
  return new Response(text,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request),active=isMailApi(path)?withEnglishMailHeaders(env):env;
    const response=await app.fetch(request,active,ctx);
    if(isMailboxApi(path)&&response.ok)return mailboxResponse();
    return patchMailJson(await patchMailPage(response,path),path);
  },
  scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){
    await storeInbound(message,env);
    if(typeof app.email==='function')return app.email(message,env,ctx);
  }
};