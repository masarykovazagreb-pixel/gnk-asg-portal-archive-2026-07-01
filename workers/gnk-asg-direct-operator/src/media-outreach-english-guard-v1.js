export const VERSION='GNK_ASG_MEDIA_OUTREACH_ENGLISH_GUARD_V1_20260630';

const clean=value=>String(value??'').trim();
const MIXED_GREETING_PATTERNS=[
  /Dear\s+Uredni(?:č|&#269;|&ccaron;)ki\s+ili\s+organizacijski\s+kontakt\s*,?/gi,
  /Dear\s+Urednicki\s+ili\s+organizacijski\s+kontakt\s*,?/gi,
  /Poštovani\s+urednički\s+ili\s+organizacijski\s+kontakt\s*,?/gi,
  /Postovani\s+urednicki\s+ili\s+organizacijski\s+kontakt\s*,?/gi
];
const FORBIDDEN=/urednički|urednicki|organizacijski\s+kontakt|poštovan|postovan/i;

function header(payload,name){
  const headers=payload?.headers||{};
  return clean(headers[name]??headers[name.toLowerCase()]??headers[name.toUpperCase()]);
}

function isOutreach(payload={}){
  return Boolean(header(payload,'X-GNK-Delivery-Version')||header(payload,'X-GNK-ASG-Outreach-Delivery'));
}

function greetingFrom(payload={}){
  const source=String(payload.text||payload.plainText||'');
  const attention=source.match(/For the attention of\s+([^,\n]+),\s*([^\n]+)/i);
  const person=clean(attention?.[1]);
  const outlet=clean(attention?.[2]);
  if(person&&!/editor|desk|newsroom|redakc|kontakt/i.test(person))return`Dear ${person},`;
  if(outlet&&!/editorial desk|editor-in-chief/i.test(outlet))return`Dear ${outlet} Editorial Team,`;
  return'Dear Editorial Team,';
}

function replaceMixed(value,greeting){
  let output=String(value||'');
  for(const pattern of MIXED_GREETING_PATTERNS)output=output.replace(pattern,greeting);
  return output;
}

export function enforceEnglishGreeting(payload={}){
  if(!isOutreach(payload))return payload;
  const greeting=greetingFrom(payload);
  const html=replaceMixed(payload.html,greeting);
  const text=replaceMixed(payload.text,greeting);
  const plainText=replaceMixed(payload.plainText,greeting);
  if(FORBIDDEN.test(`${html}\n${text}\n${plainText}`)){
    const error=new Error('Media outreach greeting is not English-only');
    error.code='MEDIA_GREETING_NOT_ENGLISH';
    throw error;
  }
  return{
    ...payload,
    html,
    text,
    plainText,
    headers:{...(payload.headers||{}),'X-GNK-ASG-English-Guard':VERSION}
  };
}

export function withEnglishGreetingGuard(env){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  const wrapped=Object.create(env||null);
  Object.defineProperty(wrapped,'EMAIL',{
    enumerable:true,
    configurable:true,
    value:{send(payload){return binding.send.call(binding,enforceEnglishGreeting(payload));}}
  });
  return wrapped;
}
