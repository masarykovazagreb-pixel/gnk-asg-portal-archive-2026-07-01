const VERSION='GNK_ASG_MAIL_IDENTITY_AUTOREPLY_V1_20260706';

const PROFILES={
  'office@gnk-asg.hr':{
    key:'office',prefix:'GNK-OFFICE-IN',address:'office@gnk-asg.hr',fromName:'GNK ASG Office',role:'Office',language:'bilingual',legal:false,
    signature:['GNK ASG Office','Office','E: office@gnk-asg.hr','W: https://gnk-asg.hr']
  },
  'legal@gnk-asg.hr':{
    key:'legal',prefix:'GNK-LEGAL-IN',address:'legal@gnk-asg.hr',fromName:'GNK ASG Legal & Compliance',role:'Legal & Compliance',language:'bilingual',legal:true,
    signature:['GNK ASG Legal & Compliance','Legal & Compliance','E: legal@gnk-asg.hr','W: https://gnk-asg.hr']
  },
  'media@gnk-asg.hr':{
    key:'media',prefix:'GNK-MEDIA-IN',address:'media@gnk-asg.hr',fromName:'GNK DINAMO Ltd. Group | Media Relations & Accreditation Center',role:'Media Relations & Accreditation Center',language:'english',media:true,
    signature:['GNK DINAMO Ltd. Group','Media Relations & Accreditation Center','Media organiser and operational coordinator: GNK ASG d.o.o.','E: media@gnk-asg.hr','W: https://gnk-asg.hr']
  },
  'press@gnk-asg.hr':{
    key:'press',prefix:'GNK-PRESS-IN',address:'press@gnk-asg.hr',fromName:'GNK DINAMO Ltd. Group | Press Desk',role:'Press Desk',language:'english',media:true,
    signature:['GNK DINAMO Ltd. Group','Press Desk / Media Relations & Accreditation Center','Media organiser and operational coordinator: GNK ASG d.o.o.','E: media@gnk-asg.hr','W: https://gnk-asg.hr']
  },
  'it@gnk-asg.hr':{
    key:'it',prefix:'GNK-IT-IN',address:'it@gnk-asg.hr',fromName:'GNK ASG IT',role:'Technical Support',language:'bilingual',legal:false,
    signature:['GNK ASG IT','Technical Support','E: it@gnk-asg.hr','W: https://gnk-asg.hr']
  },
  'assistant@gnk-asg.hr':{
    key:'assistant',prefix:'GNK-ASSISTANT-IN',address:'assistant@gnk-asg.hr',fromName:'GNK ASG Digital Assistant',role:'Automated Communication Support',language:'bilingual',legal:false,
    signature:['GNK ASG Digital Assistant','Automated Communication Support','E: assistant@gnk-asg.hr','W: https://gnk-asg.hr']
  },
  'nermin.sefic@gnk-asg.hr':{
    key:'nermin-sefic',prefix:'GNK-SEFIC-IN',address:'nermin.sefic@gnk-asg.hr',fromName:'Nermin Sefić | Managing Director',role:'Managing Director / Authorised Representative',language:'bilingual',legal:true,
    signature:['Nermin Sefić','Managing Director / Authorised Representative','GNK ASG d.o.o. / GNK DINAMO Ltd. Group','E: nermin.sefic@gnk-asg.hr','W: https://gnk-asg.hr']
  },
  'sefic@gnk-asg.hr':{
    key:'sefic',prefix:'GNK-SEFIC-IN',address:'sefic@gnk-asg.hr',fromName:'Nermin Sefić',role:'Personal business profile',language:'bilingual',legal:true,
    signature:['Nermin Sefić','GNK ASG d.o.o. / GNK DINAMO Ltd. Group','E: sefic@gnk-asg.hr','W: https://gnk-asg.hr']
  },
  'ubo@gnk-asg.hr':{
    key:'ubo',prefix:'GNK-UBO-IN',address:'ubo@gnk-asg.hr',fromName:'Ultimate Beneficial Owner Office',role:'Ownership / UBO correspondence',language:'bilingual',legal:true,
    signature:['Ultimate Beneficial Owner Office','GNK ASG d.o.o. / GNK DINAMO Ltd. Group','E: ubo@gnk-asg.hr','W: https://gnk-asg.hr']
  }
};

const store=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const now=()=>new Date().toISOString();
const clean=value=>String(value||'').replace(/\u0000/g,'').trim();
const lower=value=>clean(value).toLowerCase();
const isGnk=value=>/@gnk-asg\.hr$/i.test(clean(value).replace(/^.*<([^>]+)>.*$/,'$1'));
function header(message,name){try{return message.headers?.get?.(name)||''}catch{return''}}
function emailFrom(value){return clean(value).replace(/^.*<([^>]+)>.*$/,'$1').replace(/[<>"'()]/g,'').trim().toLowerCase()}
function recipients(message){
  const candidates=[message.to,message.rcptTo,header(message,'to'),header(message,'delivered-to')].filter(Boolean).join(',');
  return (candidates.match(/[A-Z0-9._%+-]+@gnk-asg\.hr/gi)||[]).map(x=>x.toLowerCase());
}
function profileFor(message){
  const found=recipients(message).find(address=>PROFILES[address]);
  return found?PROFILES[found]:PROFILES['office@gnk-asg.hr'];
}
function safeSubject(value){
  const subject=clean(value||'No subject').slice(0,240);
  if(/^=\?[^?]+\?[bq]\?/i.test(subject))return 'Encoded subject omitted for readability';
  return subject.replace(/[\r\n]+/g,' ');
}
function ref(profile){return `${profile.prefix}-${now().replace(/[-:.TZ]/g,'').slice(0,14)}-${Math.random().toString(16).slice(2,10).toUpperCase()}`}
function shouldSkip(message){
  const from=emailFrom(message.from||header(message,'from'));
  const auto=lower(header(message,'auto-submitted'));
  const precedence=lower(header(message,'precedence'));
  const subject=lower(header(message,'subject'));
  if(!from)return true;
  if(isGnk(from))return true;
  if(auto&&auto!=='no')return true;
  if(['bulk','junk','list'].includes(precedence))return true;
  if(subject.startsWith('re:')&&subject.includes('gnk-'))return true;
  return false;
}
function hrBody(profile,reference,subject){
  const legal=profile.legal?' Ova potvrda ne predstavlja prihvat ponude, priznanje odgovornosti, odricanje od prava, pravno mišljenje niti konačnu odluku.':' Ova potvrda ne predstavlja prihvat ponude, ugovornu obvezu, pravno mišljenje niti konačnu odluku.';
  return [
    'Poštovani,',
    '',
    `potvrđujemo da je Vaša poruka zaprimljena na adresi ${profile.address} (${profile.role}) pod evidencijskim brojem ${reference}.`,
    '',
    `Izvorni predmet: ${subject}`,
    '',
    `Poruka je evidentirana i proslijeđena nadležnoj osobi na ljudski pregled.${legal}`,
    '',
    'U daljnjoj komunikaciji navedite gornji evidencijski broj.'
  ].join('\n');
}
function enBody(profile,reference,subject){
  if(profile.media){
    return [
      'Dear Sir or Madam,',
      '',
      `This confirms that your message has been received by the ${profile.role} under reference ${reference}.`,
      '',
      `Original subject: ${subject}`,
      '',
      'Your message has been placed in the human-review queue. This automated acknowledgement does not constitute accreditation approval, acceptance of an offer, a contractual commitment or a final decision. Please quote the reference above in further correspondence.'
    ].join('\n');
  }
  const legal=profile.legal?' This acknowledgement does not constitute acceptance of an offer, admission of liability, waiver of rights, legal advice or a final decision.':' This acknowledgement does not constitute acceptance of an offer, a contractual commitment, legal advice or a final decision.';
  return [
    'Dear Sir or Madam,',
    '',
    `This confirms that your message has been received at ${profile.address} (${profile.role}) under reference ${reference}.`,
    '',
    `Original subject: ${subject}`,
    '',
    `The message has been recorded and routed to the responsible person for human review.${legal}`,
    '',
    'Please quote the reference above in further correspondence.'
  ].join('\n');
}
function body(profile,reference,subject){
  const parts=profile.language==='english'?[enBody(profile,reference,subject)]:[hrBody(profile,reference,subject),'','--- ENGLISH ---','',enBody(profile,reference,subject)];
  return [...parts,'',profile.signature.join('\n')].join('\n');
}
function rawMessage(profile,to,reference,subject,text,inReplyTo){
  const safeTo=emailFrom(to);
  const replySubject=`Re: ${subject}`.replace(/[\r\n]+/g,' ').slice(0,250);
  const headers=[
    `From: "${profile.fromName.replace(/"/g,'') }" <${profile.address}>`,
    `To: <${safeTo}>`,
    `Subject: ${replySubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'Auto-Submitted: auto-replied',
    'X-Auto-Response-Suppress: All',
    `X-GNK-ASG-Autoreply-Version: ${VERSION}`,
    `X-GNK-ASG-Reference: ${reference}`
  ];
  if(inReplyTo){headers.push(`In-Reply-To: ${inReplyTo}`);headers.push(`References: ${inReplyTo}`);}
  return `${headers.join('\r\n')}\r\n\r\n${text}`;
}
async function record(env,item){
  const kv=store(env);
  if(!kv)return false;
  try{
    const key='mail:autoreply:audit:v1';
    const current=JSON.parse(await kv.get(key)||'[]');
    const next=[item,...(Array.isArray(current)?current:[])].slice(0,300);
    await kv.put(key,JSON.stringify(next,null,2));
    await kv.put('mail:autoreply:last',JSON.stringify(item,null,2));
    return true;
  }catch{return false;}
}

async function sendReply(message,profile,from,reference,subject,text){
  if(typeof message.reply!=='function')return {ok:false,reason:'message_reply_unavailable'};
  if(typeof EmailMessage==='undefined')return {ok:false,reason:'EmailMessage_unavailable'};
  const raw=rawMessage(profile,from,reference,subject,text,header(message,'message-id'));
  const outgoing=new EmailMessage(profile.address,emailFrom(from),raw);
  await message.reply(outgoing);
  return {ok:true,method:'message.reply'};
}

async function handleIncomingEmail(message,env,ctx,core){
  const from=message.from||header(message,'from');
  const profile=profileFor(message);
  const subject=safeSubject(header(message,'subject')||message.subject);
  const reference=ref(profile);
  const skipped=shouldSkip(message);
  const text=body(profile,reference,subject);
  const audit={version:VERSION,createdAt:now(),from:emailFrom(from),to:profile.address,profile:profile.key,reference,subject,skipped,reply:{ok:false,reason:'not_attempted'}};
  if(!skipped){
    try{audit.reply=await sendReply(message,profile,from,reference,subject,text);}catch(error){audit.reply={ok:false,reason:String(error?.message||error)}}
  }else{
    audit.reply={ok:false,reason:'skipped_loop_or_invalid_sender'};
  }
  await record(env,audit);
  if(!audit.reply.ok&&typeof core?.email==='function'&&!PROFILES[profile.address])return core.email(message,env,ctx);
  return audit;
}

export {VERSION,PROFILES,handleIncomingEmail};
