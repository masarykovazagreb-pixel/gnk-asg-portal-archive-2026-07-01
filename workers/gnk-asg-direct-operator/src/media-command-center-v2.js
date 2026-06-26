import {handleMediaCommandCenter as handleV1,handleMediaCommandCenterEmail,VERSION as V1_VERSION} from './media-command-center-v1.js';

export const VERSION='GNK_ASG_MEDIA_COMMAND_CENTER_V2_20260626_R3_HANDOFF_LOCK';
const API='/api/media-command-center';
const HANDOFF={
  version:'GNK_ASG_MEDIA_HANDOFF_2026-06-26',
  sha256:'f34dda0a2aa7dfd88128c91a0e359b14ce20ced9bb74e02bcfaad62dfa81012f',
  sizeBytes:110429,
  contactCount:112,
  withEmail:42,
  automationCandidates:22,
  initialApprovals:0,
  priorities:{A:89,B:23},
  expectedFileNames:['media_contacts_112_full.json','GNK_ASG_media_contacts_112_full_2026-06-26.json']
};
const REQUIRED_FIELDS=['mailCode','priority','country','outlet','recipientTitle','recipientName','role','secondaryDesk','attentionLine','email','channel','language','salutation','personStatus','channelStatus','automationAllowed','approved','sentStatus','responseStatus','source','note'];
const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const dbOf=env=>env.GNK_ASG_D1||null;
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate, max-age=0','x-gnk-asg-media-command-v2':VERSION}});

async function ensureSchema(env){
  const db=dbOf(env);if(!db)throw new Error('GNK_ASG_D1 binding is not configured');
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS media_outreach_contact_controls(
      mail_code TEXT PRIMARY KEY,source_version TEXT,verification_checked_at TEXT,approval_expires_at TEXT,
      to_email TEXT,cc_email TEXT,requires_personalization INTEGER NOT NULL DEFAULT 0,
      blocked_reason TEXT,operational_status TEXT NOT NULL DEFAULT 'UNASSESSED',updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_contact_imports(
      id TEXT PRIMARY KEY,source_version TEXT NOT NULL,source_sha256 TEXT,contact_count INTEGER NOT NULL,
      created_count INTEGER NOT NULL DEFAULT 0,updated_count INTEGER NOT NULL DEFAULT 0,unchanged_count INTEGER NOT NULL DEFAULT 0,
      imported_by TEXT,detail_json TEXT,created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_delivery_attempts(
      id TEXT PRIMARY KEY,idempotency_key TEXT UNIQUE NOT NULL,mail_code TEXT NOT NULL,campaign_version TEXT,
      mode TEXT NOT NULL,status TEXT NOT NULL,provider_message_id TEXT,error_code TEXT,detail_json TEXT,
      created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`)
  ]);
  return db;
}

function lower(value){return clean(value).toLocaleLowerCase('hr');}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));}
function splitAddresses(value){return clean(value).split(/[;,]/).map(item=>item.trim()).filter(validEmail);}
function priorityCounts(items){return items.reduce((result,item)=>{const key=clean(item.priority)||'UNSET';result[key]=(result[key]||0)+1;return result;},{});}

function routeAddresses(contact,control={}){
  const addresses=splitAddresses(contact.channel||'');
  if(clean(contact.mailCode)==='GNK-MEDIA-20260626-XX-TWP-096'){
    return{
      toEmail:clean(control.to_email)||addresses[1]||addresses[0]||clean(contact.email),
      ccEmail:clean(control.cc_email)||addresses[0]||'',
      routingRule:'TO Zachary Goldfarb for business/technology/AI; CC Matt Murray only for strategically important stories.'
    };
  }
  return{
    toEmail:clean(control.to_email)||addresses[0]||clean(contact.email),
    ccEmail:clean(control.cc_email)||addresses.slice(1).join(', '),
    routingRule:''
  };
}

function assess(contact,control={},suppressed=false){
  const note=lower(contact.note),channel=lower(contact.channelStatus||contact.channel_status),person=lower(contact.personStatus||contact.person_status);
  const approved=Boolean(contact.approved),allowed=Boolean(contact.automationAllowed??contact.automation_allowed);
  const expires=Date.parse(control.approval_expires_at||contact.approvalExpiresAt||contact.approval_expires_at||'');
  const expired=Number.isFinite(expires)&&expires<=Date.now();
  const explicitBlock=/ne slati|do not send|zabran|blocked/.test(`${note} ${channel}`);
  const verificationPending=/provjera u tijeku|nije još provjereno|nije jos provjereno|za verifikaciju/.test(`${channel} ${person} ${note}`);
  const manual=/ručno|rucno|kontakt-obrazac|support|letters inbox|nije urednički pitch|nije urednicki pitch/.test(`${channel} ${note}`);
  const requiresPersonalization=Boolean(control.requires_personalization)||/strogu personalizaciju|ne slati generički|ne slati genericki|individualno|ciljano/.test(note);
  const routed=routeAddresses(contact,control);
  let operationalStatus='READY',blockedReason='';
  if(suppressed){operationalStatus='SUPPRESSED';blockedReason='Kontakt je na suppression listi.';}
  else if(explicitBlock){operationalStatus='BLOCKED';blockedReason='Napomena ili status izričito zabranjuje slanje.';}
  else if(!validEmail(routed.toEmail)){operationalStatus='MANUAL_ONLY';blockedReason='Nema valjanog primarnog e-maila.';}
  else if(verificationPending){operationalStatus='NEEDS_VERIFICATION';blockedReason='Osoba ili urednički kanal nisu završno potvrđeni.';}
  else if(!allowed){operationalStatus=manual?'MANUAL_ONLY':'NOT_AUTOMATION_ALLOWED';blockedReason='Kontakt nije dopušten za automatizirano slanje.';}
  else if(expired){operationalStatus='EXPIRED_APPROVAL';blockedReason='Ručno odobrenje je isteklo.';}
  else if(!approved){operationalStatus='AWAITING_APPROVAL';blockedReason='Potreban je završni ručni pristanak.';}
  return{operationalStatus,blockedReason,toEmail:routed.toEmail,ccEmail:routed.ccEmail,routingRule:routed.routingRule,requiresPersonalization,ready:operationalStatus==='READY'};
}

function normalizeImported(item){
  const result={
    mailCode:clean(item.mailCode),priority:clean(item.priority),country:clean(item.country),outlet:clean(item.outlet),
    recipientTitle:clean(item.recipientTitle),recipientName:clean(item.recipientName),role:clean(item.role),secondaryDesk:clean(item.secondaryDesk),
    attentionLine:clean(item.attentionLine),email:clean(item.email).toLowerCase(),channel:clean(item.channel),language:clean(item.language),
    salutation:clean(item.salutation),personStatus:clean(item.personStatus),channelStatus:clean(item.channelStatus),
    automationAllowed:Boolean(item.automationAllowed),approved:Boolean(item.approved),source:clean(item.source),note:clean(item.note),sourceVersion:HANDOFF.version
  };
  return{...result,...assess(result,{},false)};
}

function validateHandoff(body){
  const errors=[];
  const actualHash=clean(body?.datasetSha256).toLowerCase();
  const actualSize=Number(body?.datasetSizeBytes);
  if(!actualHash)errors.push({error:'dataset_sha256_required'});
  else if(actualHash!==HANDOFF.sha256)errors.push({error:'dataset_sha256_mismatch',expected:HANDOFF.sha256,actual:actualHash});
  if(Number.isFinite(actualSize)&&actualSize!==HANDOFF.sizeBytes)errors.push({error:'dataset_size_mismatch',expected:HANDOFF.sizeBytes,actual:actualSize});
  return errors;
}

function validateDataset(input){
  const source=Array.isArray(input)?input:Array.isArray(input?.contacts)?input.contacts:[];
  const normalized=source.map(normalizeImported),errors=[];
  const codes=new Set(),outlets=new Set();
  source.forEach((item,index)=>{
    for(const field of REQUIRED_FIELDS)if(!Object.prototype.hasOwnProperty.call(item,field))errors.push({index,error:'missing_required_field',field});
  });
  normalized.forEach((item,index)=>{
    if(!item.mailCode)errors.push({index,error:'mailCode_missing'});
    if(!item.outlet)errors.push({index,error:'outlet_missing'});
    if(item.mailCode&&codes.has(item.mailCode))errors.push({index,error:'duplicate_mailCode',value:item.mailCode});
    codes.add(item.mailCode);outlets.add(lower(item.outlet));
  });
  const priorities=priorityCounts(normalized);
  const summary={
    count:normalized.length,uniqueCodes:codes.size,uniqueOutlets:outlets.size,
    withEmail:normalized.filter(item=>validEmail(item.email)).length,
    automationCandidates:normalized.filter(item=>item.automationAllowed).length,
    initialApprovals:normalized.filter(item=>item.approved).length,
    blocked:normalized.filter(item=>['BLOCKED','NEEDS_VERIFICATION'].includes(item.operationalStatus)).length,
    priorities
  };
  if(summary.count!==HANDOFF.contactCount)errors.push({error:'expected_112_contacts',actual:summary.count});
  if(summary.uniqueCodes!==HANDOFF.contactCount)errors.push({error:'expected_112_unique_codes',actual:summary.uniqueCodes});
  if(summary.withEmail!==HANDOFF.withEmail)errors.push({error:'expected_42_email_contacts',actual:summary.withEmail});
  if(summary.automationCandidates!==HANDOFF.automationCandidates)errors.push({error:'expected_22_automation_candidates',actual:summary.automationCandidates});
  if(summary.initialApprovals!==HANDOFF.initialApprovals)errors.push({error:'initial_approvals_must_be_zero',actual:summary.initialApprovals});
  if((priorities.A||0)!==HANDOFF.priorities.A||(priorities.B||0)!==HANDOFF.priorities.B)errors.push({error:'priority_distribution_mismatch',expected:HANDOFF.priorities,actual:priorities});
  return{ok:errors.length===0,items:normalized,summary,errors};
}

async function controlMap(db){const rows=(await db.prepare(`SELECT * FROM media_outreach_contact_controls`).all()).results||[];return new Map(rows.map(row=>[row.mail_code,row]));}
async function suppressedSet(db){const rows=(await db.prepare(`SELECT email FROM media_suppressions`).all()).results||[];return new Set(rows.map(row=>lower(row.email)));}

async function enrichContacts(env,items){
  const db=await ensureSchema(env),controls=await controlMap(db),suppressed=await suppressedSet(db);
  return items.map(item=>({...item,...assess(item,controls.get(item.mailCode)||{},suppressed.has(lower(item.email)))}));
}

async function readinessSummary(env){
  const db=await ensureSchema(env),controls=await controlMap(db),suppressed=await suppressedSet(db);
  const rows=(await db.prepare(`SELECT * FROM media_outreach_contacts ORDER BY id`).all()).results||[];
  const assessed=rows.map(row=>assess(row,controls.get(row.mail_code)||{},suppressed.has(lower(row.email))));
  const counts={};for(const item of assessed)counts[item.operationalStatus]=(counts[item.operationalStatus]||0)+1;
  return{total:rows.length,counts,ready:counts.READY||0,blocked:(counts.BLOCKED||0)+(counts.SUPPRESSED||0),needsVerification:counts.NEEDS_VERIFICATION||0,awaitingApproval:counts.AWAITING_APPROVAL||0};
}

async function importPreview(request,env){
  let body;try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const handoffErrors=validateHandoff(body);if(handoffErrors.length)return json({ok:false,error:'handoff_validation_failed',errors:handoffErrors,handoff:HANDOFF},409);
  const checked=validateDataset(body);if(!checked.ok)return json({ok:false,...checked},400);
  const db=await ensureSchema(env),existing=(await db.prepare(`SELECT mail_code,outlet,email FROM media_outreach_contacts`).all()).results||[],controls=await controlMap(db);
  const byCode=new Map(existing.map(row=>[row.mail_code,row]));let creates=0,updates=0,unchanged=0;
  for(const item of checked.items){const current=byCode.get(item.mailCode),control=controls.get(item.mailCode);if(!current)creates++;else if(clean(current.outlet)!==item.outlet||clean(current.email)!==item.email||clean(control?.source_version)!==item.sourceVersion)updates++;else unchanged++;}
  const controls=checked.items.filter(item=>['BLOCKED','NEEDS_VERIFICATION'].includes(item.operationalStatus)||item.requiresPersonalization||item.routingRule).map(item=>({mailCode:item.mailCode,outlet:item.outlet,operationalStatus:item.operationalStatus,requiresPersonalization:item.requiresPersonalization,routingRule:item.routingRule,reason:item.blockedReason}));
  return json({ok:true,dryRun:true,handoff:{version:HANDOFF.version,sha256:HANDOFF.sha256,verified:true},summary:checked.summary,diff:{creates,updates,unchanged,existing:existing.length},controls,warnings:['Odobrenja, sentStatus i responseStatus neće se prepisivati.','Slanje ostaje zaključano dok se svaki kontakt zasebno ne odobri.']});
}

async function importApply(request,env){
  let body;try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  if(clean(body.confirm)!=='IMPORT_112_CONTACTS')return json({ok:false,error:'confirmation_required',required:'IMPORT_112_CONTACTS'},409);
  const handoffErrors=validateHandoff(body);if(handoffErrors.length)return json({ok:false,error:'handoff_validation_failed',errors:handoffErrors,handoff:HANDOFF},409);
  const checked=validateDataset(body);if(!checked.ok)return json({ok:false,...checked},400);
  const db=await ensureSchema(env),stamp=now(),existing=(await db.prepare(`SELECT mail_code,outlet,email FROM media_outreach_contacts`).all()).results||[],existingByCode=new Map(existing.map(row=>[row.mail_code,row]));
  let created=0,updated=0,unchanged=0;
  for(const item of checked.items){
    const current=existingByCode.get(item.mailCode);
    if(!current)created++;else if(clean(current.outlet)!==item.outlet||clean(current.email)!==item.email)updated++;else unchanged++;
    await db.prepare(`INSERT INTO media_outreach_contacts(mail_code,priority,country,outlet,recipient_title,recipient_name,role,secondary_desk,attention_line,email,channel,language,salutation,person_status,channel_status,automation_allowed,approved,sent_status,response_status,source,note,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,'NIJE POSLANO','NEMA ODGOVORA',?,?,?,?)
      ON CONFLICT(mail_code) DO UPDATE SET priority=excluded.priority,country=excluded.country,outlet=excluded.outlet,recipient_title=excluded.recipient_title,recipient_name=excluded.recipient_name,role=excluded.role,secondary_desk=excluded.secondary_desk,attention_line=excluded.attention_line,email=excluded.email,channel=excluded.channel,language=excluded.language,salutation=excluded.salutation,person_status=excluded.person_status,channel_status=excluded.channel_status,automation_allowed=excluded.automation_allowed,source=excluded.source,note=excluded.note,updated_at=excluded.updated_at`)
      .bind(item.mailCode,item.priority,item.country,item.outlet,item.recipientTitle,item.recipientName,item.role,item.secondaryDesk,item.attentionLine,item.email,item.channel,item.language,item.salutation,item.personStatus,item.channelStatus,item.automationAllowed?1:0,item.source,item.note,stamp,stamp).run();
    await db.prepare(`INSERT INTO media_outreach_contact_controls(mail_code,source_version,to_email,cc_email,requires_personalization,blocked_reason,operational_status,updated_at) VALUES(?,?,?,?,?,?,?,?)
      ON CONFLICT(mail_code) DO UPDATE SET source_version=excluded.source_version,to_email=excluded.to_email,cc_email=excluded.cc_email,requires_personalization=excluded.requires_personalization,blocked_reason=excluded.blocked_reason,operational_status=excluded.operational_status,updated_at=excluded.updated_at`)
      .bind(item.mailCode,item.sourceVersion,item.toEmail,item.ccEmail,item.requiresPersonalization?1:0,item.blockedReason,item.operationalStatus,stamp).run();
  }
  await db.prepare(`INSERT INTO media_contact_imports(id,source_version,source_sha256,contact_count,created_count,updated_count,unchanged_count,imported_by,detail_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)`)
    .bind(crypto.randomUUID(),HANDOFF.version,HANDOFF.sha256,checked.summary.count,created,updated,unchanged,clean(body.importedBy)||'ADMIN',JSON.stringify(checked.summary),stamp).run();
  return json({ok:true,handoff:{version:HANDOFF.version,sha256:HANDOFF.sha256,verified:true},imported:{...checked.summary,created,updated,unchanged},readiness:await readinessSummary(env)});
}

async function intercept(request,env,ctx){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path===`${API}/handoff-manifest`&&request.method==='GET')return json({ok:true,version:VERSION,handoff:HANDOFF,requiredFields:REQUIRED_FIELDS,privacy:{publicDatasetIncluded:false}});
  if(path===`${API}/import-preview`&&request.method==='POST')return importPreview(request,env);
  if(path===`${API}/import-contacts`&&request.method==='POST')return importApply(request,env);
  if(path===`${API}/readiness-summary`&&request.method==='GET')return json({ok:true,version:VERSION,...await readinessSummary(env)});
  if(path===`${API}/send-one`&&request.method==='POST'){
    const copy=request.clone();let body;try{body=await copy.json();}catch{return json({ok:false,error:'invalid_json'},400);}
    const db=await ensureSchema(env),controls=await controlMap(db),row=await db.prepare(`SELECT c.*,s.email AS suppressed_email FROM media_outreach_contacts c LEFT JOIN media_suppressions s ON LOWER(s.email)=LOWER(c.email) WHERE c.mail_code=?`).bind(clean(body.mailCode)).first();
    if(!row)return json({ok:false,error:'contact_not_found'},404);
    const state=assess(row,controls.get(row.mail_code)||{},Boolean(row.suppressed_email));if(!state.ready)return json({ok:false,error:'contact_not_operationally_ready',...state},409);
  }
  const response=await handleV1(request,env,ctx);if(!response)return null;
  if(path===`${API}/contacts`&&request.method==='GET'){try{const payload=await response.clone().json();if(payload?.items)payload.items=await enrichContacts(env,payload.items);return json({...payload,mediaCommandV2:VERSION});}catch{return response;}}
  if(path===`${API}/status`&&request.method==='GET'){try{const payload=await response.clone().json();return json({...payload,mediaCommandV1:V1_VERSION,mediaCommandV2:VERSION,handoff:{version:HANDOFF.version,sha256:HANDOFF.sha256,contactCount:HANDOFF.contactCount},readiness:await readinessSummary(env)});}catch{return response;}}
  const headers=new Headers(response.headers);headers.set('x-gnk-asg-media-command-v2',VERSION);return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export const handleMediaCommandCenter=intercept;
export{handleMediaCommandCenterEmail};
