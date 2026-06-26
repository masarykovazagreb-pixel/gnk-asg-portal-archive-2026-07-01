import app from './index.js';
import {enforceRequiredSignature,VERSION as EMAIL_SIGNATURE_VERSION} from '../../gnk-asg-direct-operator/src/email-signature-contract-v1.js';

export const VERSION='GNK_ASG_CONTACT_AI_MAIL_WRAPPER_V5_20260627';
const ARCHIVE_ADDRESS='rht@gmx.com';
const DEFAULT_MODEL='@cf/meta/llama-3.1-8b-instruct-fast';
const CENTERS=[
  'Budapest','New York','London','Dubai','Singapore',
  'Tokyo','Zurich','Berlin','Paris','São Paulo'
];
const SIGNATURE_PATHS=new Set([
  '/api/operator-signature-load',
  '/api/operator-signature-save',
  '/api/operator-mailbox-config'
]);
const phonePattern=/(?:\+?385\s*\(?0?\)?\s*91\s*610\s*4398|\+?385\s*91\s*535\s*8365|0?91\s*535\s*8365)/gi;
const whatsAppPattern=/(?:https?:\/\/)?(?:www\.)?wa\.me\/\d+\/?/gi;

const clean=value=>String(value??'').trim();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[char]);
const addressList=value=>(Array.isArray(value)?value:[value]).flatMap(item=>String(item||'').split(/[;,\n]+/)).map(item=>item.trim()).filter(Boolean);
const unique=value=>[...new Set(value.map(item=>String(item).toLowerCase()))];

function addArchiveBcc(payload){
  const all=unique([...addressList(payload.to),...addressList(payload.cc),...addressList(payload.bcc)]);
  if(all.includes(ARCHIVE_ADDRESS))return payload;
  return{...payload,bcc:[...addressList(payload.bcc),ARCHIVE_ADDRESS]};
}
function randomCenter(){
  const values=new Uint32Array(1);
  crypto.getRandomValues(values);
  return CENTERS[values[0]%CENTERS.length];
}
function paragraphs(value){
  return clean(value).split(/\n{2,}/).filter(Boolean).map(part=>`<p style="margin:0 0 14px;line-height:1.6">${escapeHtml(part).replace(/\n/g,'<br>')}</p>`).join('');
}
function field(text,label,nextLabels=[]){
  const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const tail=nextLabels.length?`(?=\\n(?:${nextLabels.map(item=>item.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')}):|$)`:'$';
  const match=String(text||'').match(new RegExp(`(?:^|\\n)${escaped}:\\s*([\\s\\S]*?)${tail}`,'i'));
  return clean(match?.[1]);
}
function contactContext(payload){
  const text=String(payload?.text||'');
  if(!/GNK ASG\s*[–-]\s*novi upit putem kontakt forme/i.test(text))return null;
  const labels=['Evidencijski broj','Odjel','Vrijeme','Podnositelj','E-mail','Telefon','Predmet','PDF','Poruka'];
  return{
    caseId:field(text,'Evidencijski broj',labels.slice(1)),
    department:field(text,'Odjel',labels.slice(2)),
    receivedAt:field(text,'Vrijeme',labels.slice(3)),
    name:field(text,'Podnositelj',labels.slice(4)),
    email:field(text,'E-mail',labels.slice(5)),
    subject:field(text,'Predmet',labels.slice(7)),
    attachmentName:field(text,'PDF',labels.slice(8)),
    message:field(text,'Poruka',[]),
    attachmentCount:Array.isArray(payload?.attachments)?payload.attachments.length:0
  };
}
function isAutoAcknowledgement(payload,context){
  const subject=clean(payload?.subject);
  const recipients=addressList(payload?.to).map(value=>value.toLowerCase());
  return Boolean(context?.email&&recipients.includes(context.email.toLowerCase())&&/(potvrda zaprimanja|acknowledg|confirmation)/i.test(subject));
}
function extractJson(raw){
  const value=String(raw||'').replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
  const start=value.indexOf('{');
  const end=value.lastIndexOf('}');
  if(start<0||end<=start)throw new Error('AI_JSON_MISSING');
  return JSON.parse(value.slice(start,end+1));
}
function looksCroatian(value){
  return /\b(poštovani|poruka|upit|zaprim|prilog|molim|hvala|lijep|srdačan|odgovor|predmet)\b|[čćžšđ]/i.test(String(value||''));
}
function hasAttachment(context){
  if(Number(context?.attachmentCount||0)>0)return true;
  const name=clean(context?.attachmentName).toLowerCase();
  return Boolean(name&&!['-','none','nije priložen','nije prilozen'].includes(name));
}
function fallbackAcknowledgement(context,center){
  const attachmentText=hasAttachment(context)
    ?'Sadržaj poruke i svi dostavljeni prilozi evidentirani su u cijelosti.'
    :'Sadržaj poruke evidentiran je u cijelosti.';
  if(looksCroatian(`${context.subject} ${context.message}`)){
    return{
      subject:`[${context.caseId||'GNK ASG'}] Potvrda zaprimanja poruke`,
      text:`Poštovani/Poštovana ${context.name||''},\n\nVašu poruku zaprimio je GNK ASG Global Communications Center — ${center}.\n\nPredmet: ${context.subject||'-'}\nPošiljatelj: ${context.name||context.email||'-'}\nVrijeme zaprimanja: ${context.receivedAt||new Date().toISOString()}\nStatus: Evidentirano i usmjereno nadležnoj jedinici.\n\n${attachmentText}\n\nOvo je automatska potvrda zaprimanja. Nadležni tim odgovorit će nakon obrade.\n\nSrdačan pozdrav,`
    };
  }
  return{
    subject:`[${context.caseId||'GNK ASG'}] Message received`,
    text:`Dear ${context.name||'Sender'},\n\nYour message has been received by the GNK ASG Global Communications Center — ${center}.\n\nSubject: ${context.subject||'-'}\nSender: ${context.name||context.email||'-'}\nReceived: ${context.receivedAt||new Date().toISOString()}\nStatus: Recorded and routed to the responsible unit.\n\nThe message content and any submitted attachments have been recorded in full.\n\nThis is an automated acknowledgement. The responsible team will respond after review.\n\nKind regards,`
  };
}
async function aiAcknowledgement(env,context,center){
  if(!env?.AI?.run)return fallbackAcknowledgement(context,center);
  const model=clean(env.AUTO_REPLY_MODEL)||DEFAULT_MODEL;
  const system=`You are the automated intake assistant for GNK ASG Global Communications Network. Produce only a valid JSON object with the keys subject and text. Write in exactly the same language as the sender's original message. This is only a receipt acknowledgement, not a substantive answer. Never provide legal, financial, contractual or operational conclusions. Never promise a deadline. Do not use markdown. End the text with a natural polite closing in the sender's language, but do not add company contact details or a signature block.`;
  const prompt=`Create a professional, concise and subtly intriguing acknowledgement of 110 to 180 words. State that the message was received by "GNK ASG Global Communications Center — ${center}". Include the original subject, sender name or email, exact received time and a naturally translated status equivalent to "Evidentirano i usmjereno nadležnoj jedinici". Confirm that the full message content and all submitted attachments, if any, were recorded. State that this is an automated acknowledgement and that the responsible team will reply after review. Preserve the case ID in the email subject.\n\nCase ID: ${context.caseId||'-'}\nSender: ${context.name||'-'} <${context.email||'-'}>\nOriginal subject: ${context.subject||'-'}\nReceived at: ${context.receivedAt||new Date().toISOString()}\nAttachment: ${context.attachmentName||'none'}\nOriginal message:\n${String(context.message||'').slice(0,6000)}`;
  try{
    const result=await env.AI.run(model,{messages:[{role:'system',content:system},{role:'user',content:prompt}],temperature:0.25,max_tokens:900});
    const raw=String(result?.response||result?.result?.response||result?.output_text||result?.text||'');
    const parsed=extractJson(raw);
    const subject=clean(parsed.subject).slice(0,240);
    const text=clean(parsed.text).slice(0,6000);
    if(!subject||text.length<80)throw new Error('AI_RESPONSE_INVALID');
    return{subject,text};
  }catch{
    return fallbackAcknowledgement(context,center);
  }
}
function stripContactDetails(value){
  const original=String(value??'');
  if(!original)return original;
  if(/<[^>]+>/.test(original)){
    return original
      .replace(/<div\b[^>]*data-gnk-asg-contact=["'][^"']*["'][^>]*>[\s\S]*?<\/div>/gi,'')
      .replace(/<div\b[^>]*>\s*(?:Telefon|Kontakt|Phone|Tel\.?|Mobile|Mobitel|WhatsApp)\s*:?\s*(?:<[^>]+>\s*)*(?:(?:https?:\/\/)?(?:www\.)?wa\.me\/\d+\/?|(?:\+?385\s*\(?0?\)?\s*91\s*610\s*4398|\+?385\s*91\s*535\s*8365|0?91\s*535\s*8365))[\s\S]*?<\/div>/gi,'')
      .replace(/<a\b[^>]*href=["'][^"']*wa\.me[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,'')
      .replace(phonePattern,'')
      .replace(whatsAppPattern,'');
  }
  return original.split(/\r?\n/).filter(line=>{
    if(phonePattern.test(line)){phonePattern.lastIndex=0;return false;}
    phonePattern.lastIndex=0;
    if(whatsAppPattern.test(line)){whatsAppPattern.lastIndex=0;return false;}
    whatsAppPattern.lastIndex=0;
    return !/^\s*(?:telefon|kontakt|phone|tel\.?|mobile|mobitel|whatsapp)\s*:/i.test(line);
  }).join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
function sanitizeSignatureData(value,key=''){
  if(Array.isArray(value))return value.map(item=>sanitizeSignatureData(item,key));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([childKey,child])=>[childKey,sanitizeSignatureData(child,childKey)]));
  if(typeof value==='string'&&/signature/i.test(key))return stripContactDetails(value);
  return value;
}
async function sanitizeSignatureResponse(response,path){
  if(!SIGNATURE_PATHS.has(path)||!response.ok||!String(response.headers.get('content-type')||'').toLowerCase().includes('application/json'))return response;
  try{
    const data=sanitizeSignatureData(await response.json());
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('content-type','application/json; charset=utf-8');
    return new Response(JSON.stringify(data,null,2),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

function wrappedEnv(env){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  let context=null;
  const wrapped=Object.create(env||null);
  Object.defineProperty(wrapped,'EMAIL',{
    enumerable:true,
    configurable:true,
    value:{
      async send(payload){
        const captured=contactContext(payload);
        if(captured)context=captured;
        let outgoing={...payload};
        if(isAutoAcknowledgement(outgoing,context)){
          const acknowledgement=await aiAcknowledgement(env,context,randomCenter());
          outgoing={...outgoing,subject:acknowledgement.subject,text:acknowledgement.text,html:paragraphs(acknowledgement.text)};
        }
        outgoing=addArchiveBcc(outgoing);
        outgoing=enforceRequiredSignature(outgoing);
        return binding.send.call(binding,outgoing);
      }
    }
  });
  return wrapped;
}
function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-contact-ai-mail-wrapper',VERSION);
  headers.set('x-gnk-asg-email-signature-contract',EMAIL_SIGNATURE_VERSION);
  headers.set('x-gnk-asg-archive-bcc','enabled');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
    let response=await app.fetch(request,wrappedEnv(env),ctx);
    response=await sanitizeSignatureResponse(response,path);
    return stamp(response);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,wrappedEnv(env),ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,wrappedEnv(env),ctx);}
};
