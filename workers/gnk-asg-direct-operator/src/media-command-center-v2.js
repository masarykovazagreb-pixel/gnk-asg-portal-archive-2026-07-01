import {handleMediaCommandCenter as handleV1,handleMediaCommandCenterEmail,VERSION as V1_VERSION} from './media-command-center-v1.js';

export const VERSION='GNK_ASG_MEDIA_COMMAND_CENTER_V2_20260626';
const API='/api/media-command-center';
const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const dbOf=env=>env.GNK_ASG_D1||null;
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate, max-age=0','x-gnk-asg-media-command-v2':VERSION}});

async function ensureColumns(env){
  const db=dbOf(env);if(!db)throw new Error('GNK_ASG_D1 binding is not configured');
  const rows=(await db.prepare(`PRAGMA table_info(media_outreach_contacts)`).all()).results||[];
  const names=new Set(rows.map(row=>row.name));
  const additions=[
    ['source_version','TEXT'],['verification_checked_at','TEXT'],['approval_expires_at','TEXT'],
    ['to_email','TEXT'],['cc_email','TEXT'],['requires_personalization','INTEGER NOT NULL DEFAULT 0'],
    ['blocked_reason','TEXT'],['operational_status','TEXT NOT NULL DEFAULT \'UNASSESSED\'']
  ];
  for(const [name,type] of additions)if(!names.has(name))await db.prepare(`ALTER TABLE media_outreach_contacts ADD COLUMN ${name} ${type}`).run();
  return db;
}

function lower(value){return clean(value).toLocaleLowerCase('hr');}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));}
function splitAddresses(value){return clean(value).split(/[;,]/).map(item=>item.trim()).filter(validEmail);}

function assess(contact,suppressed=false){
  const email=clean(contact.email||contact.toEmail||contact.to_email);
  const note=lower(contact.note);
  const channel=lower(contact.channelStatus||contact.channel_status);
  const person=lower(contact.personStatus||contact.person_status);
  const approved=Boolean(contact.approved);
  const allowed=Boolean(contact.automationAllowed??contact.automation_allowed);
  const expires=Date.parse(contact.approvalExpiresAt||contact.approval_expires_at||'');
  const expired=Number.isFinite(expires)&&expires<=Date.now();
  const explicitBlock=/ne slati|do not send|zabran|blocked/.test(`${note} ${channel}`);
  const verificationPending=/provjera u tijeku|nije još provjereno|nije jos provjereno|za verifikaciju/.test(`${channel} ${person} ${note}`);
  const manual=/ručno|rucno|kontakt-obrazac|support|letters inbox|nije urednički pitch|nije urednicki pitch/.test(`${channel} ${note}`);
  const requiresPersonalization=/strogu personalizaciju|ne slati generički|ne slati genericki|individualno|ciljano/.test(note);
  const addresses=splitAddresses(contact.channel||'');
  const toEmail=clean(contact.toEmail||contact.to_email)||addresses[0]||email;
  const ccEmail=clean(contact.ccEmail||contact.cc_email)||addresses.slice(1).join(', ');
  let operationalStatus='READY';
  let blockedReason='';
  if(suppressed){operationalStatus='SUPPRESSED';blockedReason='Kontakt je na suppression listi.';}
  else if(explicitBlock){operationalStatus='BLOCKED';blockedReason='Napomena ili status izričito zabranjuje slanje.';}
  else if(!validEmail(toEmail)){operationalStatus='MANUAL_ONLY';blockedReason='Nema valjanog primarnog e-maila.';}
  else if(verificationPending){operationalStatus='NEEDS_VERIFICATION';blockedReason='Osoba ili urednički kanal nisu završno potvrđeni.';}
  else if(!allowed){operationalStatus=manual?'MANUAL_ONLY':'NOT_AUTOMATION_ALLOWED';blockedReason='Kontakt nije dopušten za automatizirano slanje.';}
  else if(expired){operationalStatus='EXPIRED_APPROVAL';blockedReason='Ručno odobrenje je isteklo.';}
  else if(!approved){operationalStatus='AWAITING_APPROVAL';blockedReason='Potreban je završni ručni pristanak.';}
  return{operationalStatus,blockedReason,toEmail,ccEmail,requiresPersonalization,ready:operationalStatus==='READY'};
}

function normalizeImported(item){
  const result={
    mailCode:clean(item.mailCode),priority:clean(item.priority),country:clean(item.country),outlet:clean(item.outlet),
    recipientTitle:clean(item.recipientTitle),recipientName:clean(item.recipientName),role:clean(item.role),secondaryDesk:clean(item.secondaryDesk),
    attentionLine:clean(item.attentionLine),email:clean(item.email).toLowerCase(),channel:clean(item.channel),language:clean(item.language),
    salutation:clean(item.salutation),personStatus:clean(item.personStatus),channelStatus:clean(item.channelStatus),
    automationAllowed:Boolean(item.automationAllowed),source:clean(item.source),note:clean(item.note),sourceVersion:clean(item.sourceVersion)||'GNK_ASG_MEDIA_HANDOFF_2026-06-26'
  };
  return{...result,...assess({...result,approved:false},false)};
}

function validateDataset(input){
  const items=Array.isArray(input)?input:Array.isArray(input?.contacts)?input.contacts:[];
  const normalized=items.map(normalizeImported);
  const errors=[];const codes=new Set();const outlets=new Set();
  normalized.forEach((item,index)=>{
    if(!item.mailCode)errors.push({index,error:'mailCode_missing'});
    if(!item.outlet)errors.push({index,error:'outlet_missing'});
    if(item.mailCode&&codes.has(item.mailCode))errors.push({index,error:'duplicate_mailCode',value:item.mailCode});
    codes.add(item.mailCode);outlets.add(lower(item.outlet));
  });
  const summary={count:normalized.length,uniqueCodes:codes.size,uniqueOutlets:outlets.size,withEmail:normalized.filter(x=>validEmail(x.email)).length,automationCandidates:normalized.filter(x=>x.automationAllowed).length,blocked:normalized.filter(x=>['BLOCKED','NEEDS_VERIFICATION'].includes(x.operationalStatus)).length};
  if(normalized.length!==112)errors.push({error:'expected_112_contacts',actual:normalized.length});
  return{ok:errors.length===0,items:normalized,summary,errors};
}

async function suppressedSet(db){
  const rows=(await db.prepare(`SELECT email FROM media_suppressions`).all()).results||[];
  return new Set(rows.map(row=>lower(row.email)));
}

async function enrichContacts(env,items){
  const db=await ensureColumns(env);const suppressed=await suppressedSet(db);
  return items.map(item=>({...item,...assess(item,suppressed.has(lower(item.email)))}));
}

async function readinessSummary(env){
  const db=await ensureColumns(env);const suppressed=await suppressedSet(db);
  const rows=(await db.prepare(`SELECT * FROM media_outreach_contacts ORDER BY id`).all()).results||[];
  const assessed=rows.map(row=>assess(row,suppressed.has(lower(row.email))));
  const counts={};for(const item of assessed)counts[item.operationalStatus]=(counts[item.operationalStatus]||0)+1;
  return{total:rows.length,counts,ready:counts.READY||0,blocked:(counts.BLOCKED||0)+(counts.SUPPRESSED||0),needsVerification:counts.NEEDS_VERIFICATION||0,awaitingApproval:counts.AWAITING_APPROVAL||0};
}

async function importPreview(request,env){
  let body;try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const checked=validateDataset(body);if(!checked.ok)return json({ok:false,...checked},400);
  const db=await ensureColumns(env);const existing=(await db.prepare(`SELECT mail_code,outlet,email,source_version FROM media_outreach_contacts`).all()).results||[];
  const byCode=new Map(existing.map(row=>[row.mail_code,row]));
  let creates=0,updates=0,unchanged=0;
  for(const item of checked.items){const current=byCode.get(item.mailCode);if(!current)creates++;else if(clean(current.outlet)!==item.outlet||clean(current.email)!==item.email||clean(current.source_version)!==item.sourceVersion)updates++;else unchanged++;}
  return json({ok:true,dryRun:true,summary:checked.summary,diff:{creates,updates,unchanged,existing:existing.length},warnings:['Odobrenja, sentStatus i responseStatus neće se prepisivati.','Slanje ostaje zaključano dok se svaki kontakt zasebno ne odobri.']});
}

async function importApply(request,env){
  let body;try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  if(clean(body.confirm)!=='IMPORT_112_CONTACTS')return json({ok:false,error:'confirmation_required',required:'IMPORT_112_CONTACTS'},409);
  const checked=validateDataset(body);if(!checked.ok)return json({ok:false,...checked},400);
  const db=await ensureColumns(env);const stamp=now();
  const statements=checked.items.map(item=>db.prepare(`INSERT INTO media_outreach_contacts(
    mail_code,priority,country,outlet,recipient_title,recipient_name,role,secondary_desk,attention_line,email,channel,language,salutation,
    person_status,channel_status,automation_allowed,approved,sent_status,response_status,source,note,created_at,updated_at,
    source_version,to_email,cc_email,requires_personalization,blocked_reason,operational_status
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,'NIJE POSLANO','NEMA ODGOVORA',?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(mail_code) DO UPDATE SET priority=excluded.priority,country=excluded.country,outlet=excluded.outlet,
    recipient_title=excluded.recipient_title,recipient_name=excluded.recipient_name,role=excluded.role,secondary_desk=excluded.secondary_desk,
    attention_line=excluded.attention_line,email=excluded.email,channel=excluded.channel,language=excluded.language,salutation=excluded.salutation,
    person_status=excluded.person_status,channel_status=excluded.channel_status,automation_allowed=excluded.automation_allowed,
    source=excluded.source,note=excluded.note,updated_at=excluded.updated_at,source_version=excluded.source_version,
    to_email=excluded.to_email,cc_email=excluded.cc_email,requires_personalization=excluded.requires_personalization,
    blocked_reason=excluded.blocked_reason,operational_status=excluded.operational_status`)
    .bind(item.mailCode,item.priority,item.country,item.outlet,item.recipientTitle,item.recipientName,item.role,item.secondaryDesk,item.attentionLine,item.email,item.channel,item.language,item.salutation,item.personStatus,item.channelStatus,item.automationAllowed?1:0,item.source,item.note,stamp,stamp,item.sourceVersion,item.toEmail,item.ccEmail,item.requiresPersonalization?1:0,item.blockedReason,item.operationalStatus));
  for(let index=0;index<statements.length;index+=30)await db.batch(statements.slice(index,index+30));
  await db.prepare(`INSERT INTO media_outreach_events(id,event_type,detail_json,created_at) VALUES(?,?,?,?)`).bind(crypto.randomUUID(),'contacts_imported_v2',JSON.stringify({version:VERSION,summary:checked.summary}),stamp).run();
  return json({ok:true,imported:checked.summary,readiness:await readinessSummary(env)});
}

async function intercept(request,env,ctx){
  const url=new URL(request.url),path=url.pathname.replace(/\/+$/,'')||'/';
  if(path===`${API}/import-preview`&&request.method==='POST')return importPreview(request,env);
  if(path===`${API}/import-contacts`&&request.method==='POST')return importApply(request,env);
  if(path===`${API}/readiness-summary`&&request.method==='GET')return json({ok:true,version:VERSION,...await readinessSummary(env)});
  if(path===`${API}/send-one`&&request.method==='POST'){
    const copy=request.clone();let body;try{body=await copy.json();}catch{return json({ok:false,error:'invalid_json'},400);}
    const db=await ensureColumns(env);const row=await db.prepare(`SELECT c.*,s.email AS suppressed_email FROM media_outreach_contacts c LEFT JOIN media_suppressions s ON LOWER(s.email)=LOWER(c.email) WHERE c.mail_code=?`).bind(clean(body.mailCode)).first();
    if(!row)return json({ok:false,error:'contact_not_found'},404);
    const state=assess(row,Boolean(row.suppressed_email));
    if(!state.ready)return json({ok:false,error:'contact_not_operationally_ready',...state},409);
  }
  const response=await handleV1(request,env,ctx);if(!response)return null;
  if(path===`${API}/contacts`&&request.method==='GET'){
    try{const payload=await response.clone().json();if(payload?.items)payload.items=await enrichContacts(env,payload.items);return json({...payload,mediaCommandV2:VERSION});}catch{return response;}
  }
  if(path===`${API}/status`&&request.method==='GET'){
    try{const payload=await response.clone().json();return json({...payload,mediaCommandV1:V1_VERSION,mediaCommandV2:VERSION,readiness:await readinessSummary(env)});}catch{return response;}
  }
  const headers=new Headers(response.headers);headers.set('x-gnk-asg-media-command-v2',VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export const handleMediaCommandCenter=intercept;
export{handleMediaCommandCenterEmail};
