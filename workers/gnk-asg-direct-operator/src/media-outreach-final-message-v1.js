export const VERSION='GNK_ASG_MEDIA_OUTREACH_FINAL_MESSAGE_V3_STRICT_ENGLISH_20260630';

const clean=value=>String(value??'').trim();
const MEDIA_EMAIL='media@gnk-asg.hr';
const BLOCKED_PHRASES=[
  'poštovani','poštovana','poštovane','poštovani gospodine','poštovana gospođo',
  'na ruke','s poštovanjem','rok za prijavu','troškove putovanja','troškovi putovanja',
  'smještaj','smeštaj','pozivamo redakciju','prijavu svojeg predstavnika','prijavu svog predstavnika',
  'obvezno navedite','obavezno navedite','konačnu odluku','glavni urednik','redakcija / news desk',
  'nije poslano','nema odgovora'
];

function header(payload,name){
  const headers=payload?.headers||{};
  return clean(headers[name]??headers[name.toLowerCase()]??headers[name.toUpperCase()]);
}

function isOutreachDelivery(payload={}){
  return Boolean(header(payload,'X-GNK-Delivery-Version')||header(payload,'X-GNK-ASG-Outreach-Delivery'));
}

function decodeEntities(value){
  return String(value||'')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>');
}

function visibleText(value){
  return decodeEntities(String(value||'')
    .replace(/<!--([\s\S]*?)-->/g,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<br\s*\/?\s*>/gi,'\n')
    .replace(/<\/(?:p|div|tr|table|h[1-6]|li)>/gi,'\n')
    .replace(/<[^>]+>/g,' '))
    .replace(/[ \t]+\n/g,'\n')
    .replace(/\n{3,}/g,'\n\n')
    .replace(/[ \t]{2,}/g,' ')
    .trim();
}

export function validateEnglishOnlyContent({html='',text=''}={}){
  const source=`${visibleText(html)}\n${clean(text)}`.toLocaleLowerCase('hr');
  const markers=BLOCKED_PHRASES.filter(phrase=>source.includes(phrase));
  return{ok:markers.length===0,markers};
}

function attentionParts(text=''){
  const source=String(text||'');
  const match=source.match(/For the attention of\s+([^,\n]+),\s*([^\n]+)/i);
  const person=clean(match?.[1]).replace(/[.\s]+$/,'');
  const outlet=clean(match?.[2]).replace(/[.\s]+$/,'');
  return{
    person:/editor|desk|newsroom|redakc|kontakt/i.test(person)?'':person,
    outlet:/editorial desk|editor-in-chief/i.test(outlet)?'':outlet
  };
}

function referenceCode(text=''){
  const source=String(text||'');
  const explicit=source.match(/(?:reference code|quote reference code|šifru|sifru)\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{5,})/i);
  if(explicit)return clean(explicit[1]).toUpperCase();
  const generic=source.match(/\b(GNK-[A-Z0-9-]{6,})\b/i);
  return clean(generic?.[1]||'GNK-ASG-TEST').toUpperCase();
}

function preferredGreeting(text=''){
  const english=String(text||'').split(/\r?\n/).map(clean).find(line=>/^Dear\s+.{1,120},$/i.test(line));
  if(english&&!/Dear\s+(?:Editor|Editorial Team),/i.test(english))return english;
  const{person,outlet}=attentionParts(text);
  if(person)return`Dear ${person},`;
  if(outlet)return`Dear ${outlet} Editorial Team,`;
  return'Dear Editorial Team,';
}

function replaceHtmlGreeting(html,text){
  const greeting=preferredGreeting(text);
  let value=String(html||'')
    .replace(/<html(?![^>]*\blang=)/i,'<html lang="en"')
    .replace(/\{\{GREETING\}\}/g,greeting)
    .replace(/Dear\s+Redakcija\s*\/\s*news\s*desk,/gi,greeting)
    .replace(/Dear\s+(?:Editor|Editorial Team),/gi,greeting)
    .replace(/Poštovan(?:i|a|e)[^,<]{0,120},/gi,greeting);
  return value;
}

function englishText(payload={}){
  const original=clean(payload.text||payload.body||payload.plainText);
  const{person,outlet}=attentionParts(original);
  const code=referenceCode(original);
  const greeting=preferredGreeting(original);
  const attention=outlet?`For the attention of ${person||'the Editorial Team'}, ${outlet}`:'For the attention of the Editorial Team';
  const newsroom=outlet||'your newsroom';
  const applicationUrl=`https://gnk-asg.hr/media-application/?lang=en&code=${encodeURIComponent(code)}`;
  return[
    greeting,
    '',
    attention,
    '',
    `GNK DINAMO Ltd. Group invites ${newsroom} to participate in and cover THE CODE programme in New York from 6 to 8 October 2026.`,
    '',
    'The central programme takes place on 7 October 2026 at 11:30 a.m. ET. Travel, accommodation and other reasonable, documented and pre-approved costs directly related to attendance and reporting are covered by the organizer. Accommodation in New York has already been reserved and paid.',
    '',
    `Please submit the nominated representative no later than 20 July 2026 at 23:59 CEST. Quote reference code ${code} in the application subject and body. Do not send a passport copy by ordinary email at the initial stage.`,
    '',
    `Application form: ${applicationUrl}`,
    `Application mailbox: ${MEDIA_EMAIL}`,
    '',
    'Receipt of a complete application does not constitute automatic approval. The final decision is made by an authorized person after human verification.',
    '',
    'Kind regards,'
  ].join('\n');
}

function contractError(markers){
  const error=new Error(`Media outreach message is not English-only: ${markers.join(', ')}`);
  error.code='MEDIA_MESSAGE_NOT_ENGLISH_ONLY';
  error.markers=markers;
  return error;
}

export function finalizeMediaPayload(payload={}){
  if(!isOutreachDelivery(payload))return payload;
  const text=englishText(payload);
  const html=replaceHtmlGreeting(payload.html,text);
  const validation=validateEnglishOnlyContent({html,text});
  if(!validation.ok)throw contractError(validation.markers);
  return{
    ...payload,
    subject:'CODE',
    text,
    html,
    headers:{
      ...(payload.headers||{}),
      'X-GNK-ASG-Final-Message':VERSION,
      'X-GNK-ASG-Language':'en',
      'X-GNK-ASG-Outreach-Delivery':'strict-english'
    }
  };
}

export function withFinalMediaMessage(env){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  const wrapped=Object.create(env||null);
  Object.defineProperty(wrapped,'EMAIL',{
    enumerable:true,
    configurable:true,
    value:{send(payload){return binding.send.call(binding,finalizeMediaPayload(payload));}}
  });
  return wrapped;
}
