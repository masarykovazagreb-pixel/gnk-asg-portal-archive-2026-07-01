export const VERSION='GNK_ASG_CONTACT_AI_REPLY_V1_20260716';

const PRIMARY_MODEL='@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const FALLBACK_MODEL='@cf/meta/llama-3.1-8b-instruct-fast';
const clean=(value,max=12000)=>String(value??'').replace(/\u0000/g,'').trim().slice(0,max);

function parseOutput(value){
  let text=clean(value,9000).replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const first=text.indexOf('{'),last=text.lastIndexOf('}');
  if(first>=0&&last>first)text=text.slice(first,last+1);
  try{
    const parsed=JSON.parse(text);
    const body=clean(parsed.body,5000);
    if(body.length<40)return null;
    return{body,language:clean(parsed.language,8)||'detected'};
  }catch{return null}
}

function fallback({language,name,caseId,subject,department}){
  if(language==='en')return`Dear ${name},\n\nYour message has been recorded under reference ${caseId} and routed to ${department}.\n\nSubject: ${subject}\n\nThis is a preliminary acknowledgement. The responsible team will review the request and contact you if an essential detail is missing. No approval, payment confirmation, legal conclusion or binding decision is made by this automatic message.\n\nKind regards,`;
  return`Poštovani/Poštovana ${name},\n\nVaša poruka evidentirana je pod referencom ${caseId} i usmjerena jedinici ${department}.\n\nPredmet: ${subject}\n\nOvo je preliminarna automatska potvrda. Nadležni tim pregledat će upit i javiti se ako nedostaje bitan podatak. Ovom porukom ne daje se odobrenje, potvrda plaćanja, pravni zaključak niti obvezujuća odluka.\n\nSrdačan pozdrav,`;
}

function validReply(reply,{language,name,caseId}){
  if(!reply?.body||!reply.body.includes(caseId))return false;
  if(name&&!reply.body.includes(name))return false;
  if(/odobravamo|approved|payment confirmed|plaćanje je potvrđeno|ugovor je sklopljen|binding decision/i.test(reply.body))return false;
  if(language==='en'&&!/Dear|Hello|Thank you/i.test(reply.body))return false;
  if(language!=='en'&&!/Poštovani|Poštovana|Hvala|Pozdrav/i.test(reply.body))return false;
  return true;
}

async function ask(env,model,prompt){
  const result=await env.AI.run(model,{messages:[
    {role:'system',content:'Write a concise, useful, preliminary acknowledgement email for GNK ASG in the requested language. Use the sender name and exact case reference. Briefly reflect the actual subject and message so the reply is not generic. Do not invent facts. Do not approve accreditation, accept an offer, create a contract, provide legal or financial advice, confirm payment, disclose confidential information, promise a deadline, or make a final decision. State that a responsible human team will review the request. Return JSON only with language and body. Include a greeting and courteous closing, but no company signature.'},
    {role:'user',content:prompt}
  ],max_tokens:700,temperature:0.1,top_p:0.8});
  return parseOutput(result?.response||result?.result?.response||result?.output_text||result?.text||'');
}

export async function createContactAcknowledgement(env,input){
  const data={
    language:input.language==='en'?'en':'hr',
    name:clean(input.name,160),caseId:clean(input.caseId,100),subject:clean(input.subject,240),
    message:clean(input.message,6000),department:clean(input.department,180)||'GNK ASG'
  };
  const deterministic=fallback(data);
  if(!/^(1|true|yes|on)$/i.test(clean(env?.AI_CONTACT_REPLY_LIVE,20)))return{text:deterministic,aiUsed:false,model:'deterministic-fallback',version:VERSION};
  if(!env?.AI?.run)return{text:deterministic,aiUsed:false,model:'deterministic-fallback',version:VERSION};
  const prompt=[
    `LANGUAGE: ${data.language}`,
    `SENDER NAME: ${data.name}`,
    `CASE REFERENCE: ${data.caseId}`,
    `DEPARTMENT: ${data.department}`,
    `SUBJECT: ${data.subject}`,
    `MESSAGE:\n${data.message}`
  ].join('\n\n');
  for(const model of[clean(env?.AI_CONTACT_REPLY_MODEL,180)||PRIMARY_MODEL,clean(env?.AI_CONTACT_REPLY_FALLBACK_MODEL,180)||FALLBACK_MODEL]){
    try{const reply=await ask(env,model,prompt);if(validReply(reply,data))return{text:reply.body,aiUsed:true,model,version:VERSION}}catch(error){console.error('contact-ai-reply',model,error)}
  }
  return{text:deterministic,aiUsed:false,model:'deterministic-fallback',version:VERSION};
}
