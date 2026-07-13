import app,{VERSION as BASE_VERSION} from './index-unified-auth-v17.js';
import {EmailMessage} from 'cloudflare:email';

export const VERSION=`GNK_ASG_UNIFIED_AUTH_V61_20260713_RAW_MAIL_AND_MENU_POLISH_${BASE_VERSION}`;
const SEND_PATHS=new Set(['/api/studio-message/send','/api/admin-mail-send']);
const SCHEDULE_PREFIX='/api/mail-schedule';
const MENU_POLISH='<script defer src="/assets/public-compact-menu-polish-v1.js?v=20260713"></script>';
const MANDATORY_BCC=['beckuphome@gmail.com','rht@gmx.com'];
const clean=value=>String(value??'').trim();
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-mail-transport':VERSION}});
const parseEmails=value=>[...new Set(String(value||'').split(/[;,\s]+/).map(v=>clean(v).toLowerCase()).filter(v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(v)))];
const safeHeader=value=>clean(value).replace(/[\r\n]+/g,' ');
const b64=value=>{const bytes=new TextEncoder().encode(String(value||''));let out='';for(let i=0;i<bytes.length;i+=32768)out+=String.fromCharCode(...bytes.subarray(i,Math.min(i+32768,bytes.length)));return btoa(out).replace(/.{1,76}/g,'$&\r\n').trimEnd();};

async function authenticated(request,env,ctx){
  const target=new URL('/api/operator-auth-check',request.url);
  const check=new Request(target,{method:'GET',headers:request.headers,redirect:'manual'});
  const response=await app.fetch(check,env,ctx);
  return response.ok;
}

function rawMessage({from,fromName,to,subject,text,html}){
  const boundary=`gnk_${crypto.randomUUID().replace(/-/g,'')}`;
  return [
    `From: ${safeHeader(fromName||'GNK ASG')} <${safeHeader(from)}>`,
    `To: ${safeHeader(to)}`,
    `Reply-To: ${safeHeader(from)}`,
    `Subject: ${safeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@gnk-asg.hr>`,
    'MIME-Version: 1.0',
    `X-GNK-ASG-Mail-Transport: ${VERSION}`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64','',b64(text),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64','',b64(html),
    `--${boundary}--`,''
  ].join('\r\n');
}

async function sendRaw(request,env,ctx){
  if(!await authenticated(request,env,ctx))return json({ok:false,error:'unauthorized',message:'Operator/admin session required.'},401);
  if(!env.EMAIL?.send)return json({ok:false,error:'email_binding_missing',message:'Cloudflare EMAIL binding is not configured.'},503);
  let body;try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const from=clean(body.from?.email||body.from||'office@gnk-asg.hr').toLowerCase();
  const fromName=clean(body.fromName||body.from?.name||'GNK ASG');
  const to=parseEmails(body.to),cc=parseEmails(body.cc),bcc=[...new Set([...parseEmails(body.bcc),...MANDATORY_BCC])];
  const recipients=[...new Set([...to,...cc,...bcc])];
  const subject=safeHeader(body.subject);
  const text=clean(body.text||body.plainText||body.body||'');
  const html=clean(body.html||body.bodyHtml||body.body||'')||`<div>${text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])).replace(/\n/g,'<br>')}</div>`;
  if(!to.length||!subject||(!text&&!html))return json({ok:false,error:'missing_required_fields',message:'Recipient, subject and message body are required.'},400);
  const id=crypto.randomUUID(),results=[];
  for(const recipient of recipients){
    try{
      const raw=rawMessage({from,fromName,to:recipient,subject,text,html});
      await env.EMAIL.send(new EmailMessage(from,recipient,raw));
      results.push({recipient,status:'SENT'});
    }catch(error){results.push({recipient,status:'FAILED',error:String(error?.message||error),code:clean(error?.code)||'EMAIL_SEND_FAILED'});}
  }
  const sent=results.filter(r=>r.status==='SENT').length,failed=results.length-sent;
  const firstFailure=results.find(r=>r.status==='FAILED');
  const status=failed===0?'SENT':sent?'PARTIAL':'FAILED';
  return json({ok:failed===0,id,status,delivered:failed===0,sent,failed,results,message:firstFailure?firstFailure.error:'Message sent successfully.',error:firstFailure?.code||undefined,mandatoryBcc:MANDATORY_BCC},failed===0?200:sent?207:502);
}

function scheduleResponse(request){
  const path=pathOf(request);
  if(path===`${SCHEDULE_PREFIX}/list`&&request.method==='GET')return json({ok:true,items:[],message:'Scheduled mail is disabled in controlled mode.'});
  if(path===`${SCHEDULE_PREFIX}/cancel`&&request.method==='POST')return json({ok:false,error:'scheduled_mail_disabled',message:'Scheduled mail is disabled in controlled mode.'},409);
  if(path===SCHEDULE_PREFIX&&request.method==='POST')return json({ok:false,error:'scheduled_mail_disabled',message:'Scheduled mail is disabled in controlled mode.'},409);
  return json({ok:false,error:'not_found'},404);
}

async function injectPolish(request,response){
  if(request.method!=='GET'||response.status!==200)return response;
  const type=String(response.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('text/html'))return response;
  const path=pathOf(request);
  if(path.startsWith('/admin')||path.startsWith('/mail-studio')||path.startsWith('/email-status')||path.startsWith('/operator-dashboard'))return response;
  try{
    let html=await response.text();
    if(!html.includes('public-compact-menu-polish-v1.js'))html=html.includes('</body>')?html.replace('</body>',`${MENU_POLISH}</body>`):`${html}${MENU_POLISH}`;
    const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('content-type','text/html; charset=utf-8');headers.set('x-gnk-compact-menu-polish','v1');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

export default{
  async fetch(request,env,ctx){
    const path=pathOf(request);
    if(SEND_PATHS.has(path)&&request.method==='POST')return sendRaw(request,env,ctx);
    if(path===SCHEDULE_PREFIX||path.startsWith(`${SCHEDULE_PREFIX}/`))return scheduleResponse(request);
    return injectPolish(request,await app.fetch(request,env,ctx));
  },
  scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
