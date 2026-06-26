import { EmailMessage } from 'cloudflare:email';

export const VERSION='GNK_ASG_MEDIA_APPLICATION_PORTAL_V1_20260627';
export const UI_PATH='/media-application';
export const API_PREFIX='/api/media-application';
export const NOTIFICATIONS_PATH='/api/media-command-center/notifications';

const DEADLINE_DEFAULT='2026-07-20T21:59:59.000Z';
const FROM_DEFAULT='media@gnk-asg.hr';
const MAX_REQUEST_BYTES=28*1024*1024;
const MAX_FILE_BYTES=10*1024*1024;
const MAX_FILES=4;
const ALLOWED_TYPES=new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);
const FREE_DOMAINS=new Set(['gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com','aol.com','proton.me','protonmail.com','gmx.com','mail.com','yandex.com']);
const enc=new TextEncoder();

const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const dbOf=env=>env.GNK_ASG_D1||null;
const bucketOf=env=>env.GNK_ASG_MEDIA_ASSETS||null;
const deadline=env=>clean(env.MEDIA_APPLICATION_DEADLINE)||DEADLINE_DEFAULT;
const fromAddress=env=>clean(env.MEDIA_OUTREACH_FROM)||FROM_DEFAULT;
const boolEnv=(value,fallback=false)=>value==null?fallback:/^(1|true|yes|on)$/i.test(clean(value));

function baseHeaders(extra={}){
  return {
    'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
    'x-content-type-options':'nosniff',
    'referrer-policy':'strict-origin-when-cross-origin',
    'x-gnk-asg-media-application':VERSION,
    ...extra
  };
}
function json(payload,status=200,extra={}){
  return new Response(JSON.stringify(payload,null,2),{status,headers:baseHeaders({'content-type':'application/json; charset=utf-8',...extra})});
}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));}
function validPhone(value){return /^\+[1-9]\d{7,14}$/.test(clean(value).replace(/[\s().-]/g,''));}
function emailDomain(value){return clean(value).toLowerCase().split('@')[1]||'';}
function safeFilename(value){return clean(value||'document.bin').replace(/[^A-Za-z0-9._-]+/g,'_').slice(0,150)||'document.bin';}
function makeApplicationId(){return `GNK-APP-2026-${crypto.randomUUID().slice(0,8).toUpperCase()}`;}
function makeEventId(){return crypto.randomUUID();}
function invitationCode(value){return clean(value).toUpperCase();}
function validInvitationFormat(value){return /^GNK-MEDIA-\d{8}-[A-Z]{2}-[A-Z0-9]{1,8}-\d{3}$/.test(invitationCode(value));}
function normalizeUrl(value){
  const text=clean(value);
  if(!text)return'';
  try{
    const url=new URL(/^https?:\/\//i.test(text)?text:`https://${text}`);
    return ['http:','https:'].includes(url.protocol)?url.toString():'';
  }catch{return'';}
}
async function sha256(bytes){
  const value=bytes instanceof ArrayBuffer?bytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const digest=await crypto.subtle.digest('SHA-256',value);
  return [...new Uint8Array(digest)].map(item=>item.toString(16).padStart(2,'0')).join('');
}
function bytesToBase64(bytes){
  let out='';
  const view=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  for(let i=0;i<view.length;i+=0x8000)out+=String.fromCharCode(...view.subarray(i,i+0x8000));
  return btoa(out);
}
function foldBase64(value){return value.replace(/.{1,76}/g,'$&\r\n').trimEnd();}

async function ensureSchema(env){
  const db=dbOf(env);
  if(!db)throw new Error('GNK_ASG_D1 binding is not configured');
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS media_outreach_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, mail_code TEXT UNIQUE NOT NULL, priority TEXT, country TEXT, outlet TEXT NOT NULL,
      recipient_title TEXT, recipient_name TEXT, role TEXT, secondary_desk TEXT, attention_line TEXT, email TEXT,
      channel TEXT, language TEXT, salutation TEXT, person_status TEXT, channel_status TEXT,
      automation_allowed INTEGER NOT NULL DEFAULT 0, approved INTEGER NOT NULL DEFAULT 0,
      sent_status TEXT NOT NULL DEFAULT 'NIJE POSLANO', response_status TEXT NOT NULL DEFAULT 'NEMA ODGOVORA',
      source TEXT, note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_outreach_events (
      id TEXT PRIMARY KEY, event_type TEXT NOT NULL, mail_code TEXT, application_id TEXT, outlet TEXT,
      email TEXT, detail_json TEXT, created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_applications (
      application_id TEXT PRIMARY KEY, invitation_code TEXT, received_at TEXT NOT NULL, source_message_id TEXT,
      source_from TEXT, source_subject TEXT, outlet_name TEXT, outlet_country TEXT, outlet_website TEXT,
      applicant_name TEXT, applicant_role TEXT, applicant_email TEXT, applicant_mobile TEXT,
      editor_name TEXT, editor_role TEXT, editor_email TEXT, editor_mobile TEXT,
      declaration TEXT, departure_city TEXT, preferred_airport TEXT, travel_dates TEXT, other_costs TEXT,
      status TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, missing_json TEXT, domain_match INTEGER NOT NULL DEFAULT 0,
      raw_r2_key TEXT, human_decision TEXT NOT NULL DEFAULT 'PENDING', decision_reason TEXT, decided_by TEXT, decided_at TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_application_documents (
      id TEXT PRIMARY KEY, application_id TEXT NOT NULL, category TEXT NOT NULL, filename TEXT NOT NULL,
      mime_type TEXT, size_bytes INTEGER, sha256 TEXT, r2_key TEXT, rejected INTEGER NOT NULL DEFAULT 0,
      rejection_reason TEXT, created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_media_applications_status ON media_applications(status,human_decision,received_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_media_events_created ON media_outreach_events(created_at)`)
  ]);
  return db;
}

async function ensureContacts(env){
  const db=await ensureSchema(env);
  const count=Number((await db.prepare(`SELECT COUNT(*) AS count FROM media_outreach_contacts`).first())?.count||0);
  if(count)return count;
  if(!env.ASSETS?.fetch)return 0;
  const response=await env.ASSETS.fetch(new Request('https://assets.local/data/media-outreach-contacts-v1.json'));
  if(!response.ok)return 0;
  const contacts=await response.json();
  const stamp=now();
  const statements=(Array.isArray(contacts)?contacts:[]).map(item=>db.prepare(`INSERT INTO media_outreach_contacts(
    mail_code,priority,country,outlet,recipient_title,recipient_name,role,secondary_desk,attention_line,email,channel,language,salutation,
    person_status,channel_status,automation_allowed,approved,sent_status,response_status,source,note,created_at,updated_at
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(mail_code) DO NOTHING`)
    .bind(clean(item.mailCode),clean(item.priority),clean(item.country),clean(item.outlet),clean(item.recipientTitle),clean(item.recipientName),clean(item.role),clean(item.secondaryDesk),clean(item.attentionLine),clean(item.email).toLowerCase(),clean(item.channel),clean(item.language),clean(item.salutation),clean(item.personStatus),clean(item.channelStatus),item.automationAllowed?1:0,item.approved?1:0,clean(item.sentStatus)||'NIJE POSLANO',clean(item.responseStatus)||'NEMA ODGOVORA',clean(item.source),clean(item.note),stamp,stamp));
  for(let i=0;i<statements.length;i+=40)await db.batch(statements.slice(i,i+40));
  return statements.length;
}

async function recordEvent(env,type,data={}){
  const db=await ensureSchema(env);
  await db.prepare(`INSERT INTO media_outreach_events(id,event_type,mail_code,application_id,outlet,email,detail_json,created_at) VALUES(?,?,?,?,?,?,?,?)`)
    .bind(makeEventId(),type,clean(data.mailCode),clean(data.applicationId),clean(data.outlet),clean(data.email).toLowerCase(),JSON.stringify(data.detail||{}),now()).run();
}

async function assetResponse(request,env,assetPath,contentType){
  if(!env.ASSETS?.fetch)return null;
  const response=await env.ASSETS.fetch(new Request(new URL(assetPath,request.url),{method:request.method,headers:request.headers}));
  if(response.status===404)return null;
  const headers=new Headers(response.headers);
  headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
  headers.set('x-robots-tag','noindex,nofollow,noarchive');
  headers.set('x-content-type-options','nosniff');
  headers.set('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  headers.set('referrer-policy','strict-origin-when-cross-origin');
  headers.set('permissions-policy','camera=(), microphone=(), geolocation=(), payment=()');
  headers.set('x-gnk-asg-media-application',VERSION);
  if(contentType)headers.set('content-type',contentType);
  return new Response(request.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers});
}

function publicConfig(env){
  return {
    ok:true,
    version:VERSION,
    deadline:deadline(env),
    applicationMailbox:fromAddress(env),
    applicationUrl:'https://gnk-asg.hr/media-application/',
    maxFileBytes:MAX_FILE_BYTES,
    maxFiles:MAX_FILES,
    acceptedTypes:[...ALLOWED_TYPES],
    travelPolicy:{
      organizerPaysTravel:true,
      organizerPaysAccommodation:true,
      accommodationReservedAndPaid:true,
      ticketPurchaseBeforeApproval:false,
      applicantProvidesPreferredAirportAndFlightOptions:true,
      writtenPreApprovalRequired:true
    },
    requiredDocuments:['assignment_letter','press_credential'],
    optionalDocuments:['flight_proposal','other_cost_estimate'],
    privacy:{passportCopyAcceptedAtInitialStage:false,ordinaryEmailForPassport:false},
    decision:'HUMAN_ONLY'
  };
}

function sameOrigin(request){
  const origin=request.headers.get('origin');
  if(!origin)return true;
  try{return new URL(origin).origin===new URL(request.url).origin;}catch{return false;}
}

async function validateInvitation(env,code){
  if(!validInvitationFormat(code))return null;
  const db=await ensureSchema(env);
  await ensureContacts(env);
  return await db.prepare(`SELECT mail_code,outlet,country,email FROM media_outreach_contacts WHERE mail_code=?`).bind(invitationCode(code)).first();
}

function fileEntry(form,name,category){
  const file=form.get(name);
  if(!file||typeof file.arrayBuffer!=='function'||!clean(file.name))return null;
  return{file,category};
}

async function storeDocument(env,applicationId,entry){
  const db=await ensureSchema(env);
  const bucket=bucketOf(env);
  const file=entry.file;
  const filename=safeFilename(file.name);
  const extension=(filename.split('.').pop()||'').toLowerCase();
  const fallbackTypes={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
  const mime=clean(file.type)||fallbackTypes[extension]||'application/octet-stream';
  const id=crypto.randomUUID();
  const created=now();
  const nameLower=filename.toLowerCase();
  if(/passport|putovnic/.test(nameLower)){
    await db.prepare(`INSERT INTO media_application_documents(id,application_id,category,filename,mime_type,size_bytes,sha256,r2_key,rejected,rejection_reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id,applicationId,'passport_rejected',filename,mime,Number(file.size||0),'','',1,'Passport copy is not accepted in the initial application',created).run();
    return{id,category:'passport_rejected',filename,rejected:true,rejectionReason:'passport_copy_rejected'};
  }
  if(Number(file.size||0)>MAX_FILE_BYTES){
    await db.prepare(`INSERT INTO media_application_documents(id,application_id,category,filename,mime_type,size_bytes,sha256,r2_key,rejected,rejection_reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id,applicationId,entry.category,filename,mime,Number(file.size||0),'','',1,'File exceeds 10 MB',created).run();
    return{id,category:entry.category,filename,rejected:true,rejectionReason:'size_limit'};
  }
  if(!ALLOWED_TYPES.has(mime)){
    await db.prepare(`INSERT INTO media_application_documents(id,application_id,category,filename,mime_type,size_bytes,sha256,r2_key,rejected,rejection_reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id,applicationId,entry.category,filename,mime,Number(file.size||0),'','',1,'File type is not allowed',created).run();
    return{id,category:entry.category,filename,rejected:true,rejectionReason:'file_type'};
  }
  const bytes=new Uint8Array(await file.arrayBuffer());
  const hash=await sha256(bytes);
  const key=`media-applications/${applicationId}/documents/${id}-${filename}`;
  if(bucket)await bucket.put(key,bytes,{httpMetadata:{contentType:mime},customMetadata:{applicationId,category:entry.category,sha256:hash,source:'web-portal'}});
  await db.prepare(`INSERT INTO media_application_documents(id,application_id,category,filename,mime_type,size_bytes,sha256,r2_key,rejected,rejection_reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id,applicationId,entry.category,filename,mime,bytes.length,hash,bucket?key:'',0,'',created).run();
  return{id,category:entry.category,filename,mimeType:mime,sizeBytes:bytes.length,sha256:hash,r2Key:bucket?key:'',rejected:false};
}

function triageApplication(app,documents,receivedAt,env){
  const required=['outlet_name','outlet_country','outlet_website','applicant_name','applicant_role','applicant_email','applicant_mobile','editor_name','editor_role','editor_email','editor_mobile','departure_city','preferred_airport','travel_dates','declaration'];
  const missingFields=required.filter(field=>!clean(app[field]));
  const invalidFields=[];
  if(app.applicant_email&&!validEmail(app.applicant_email))invalidFields.push('applicant_email');
  if(app.editor_email&&!validEmail(app.editor_email))invalidFields.push('editor_email');
  if(app.applicant_mobile&&!validPhone(app.applicant_mobile))invalidFields.push('applicant_mobile');
  if(app.editor_mobile&&!validPhone(app.editor_mobile))invalidFields.push('editor_mobile');
  if(app.outlet_website&&!normalizeUrl(app.outlet_website))invalidFields.push('outlet_website');
  const categories=new Set(documents.filter(item=>!item.rejected).map(item=>item.category));
  const missingDocuments=[];
  if(!categories.has('assignment_letter'))missingDocuments.push('assignment_letter');
  if(!categories.has('press_credential'))missingDocuments.push('press_credential');
  const applicantDomain=emailDomain(app.applicant_email);
  const editorDomain=emailDomain(app.editor_email);
  const domainsMatch=Boolean(applicantDomain&&editorDomain&&applicantDomain===editorDomain&&!FREE_DOMAINS.has(applicantDomain));
  const late=Date.parse(receivedAt)>Date.parse(deadline(env));
  let status='READY_FOR_HUMAN_REVIEW';
  if(late)status='LATE';
  else if(missingFields.length||invalidFields.length||missingDocuments.length)status='INCOMPLETE';
  else if(!domainsMatch)status='MANUAL_DOMAIN_VERIFICATION';
  let score=0;
  if(app.invitation_code)score+=15;
  if(!late)score+=10;
  if(!missingFields.length)score+=25;
  if(!invalidFields.length)score+=10;
  if(categories.has('assignment_letter'))score+=15;
  if(categories.has('press_credential'))score+=15;
  if(domainsMatch)score+=10;
  return{status,score,missingFields,invalidFields,missingDocuments,domainsMatch,late};
}

async function submissionAllowed(env,email,code){
  const db=await ensureSchema(env);
  const recent=Number((await db.prepare(`SELECT COUNT(*) AS count FROM media_outreach_events WHERE event_type='portal_application_received' AND LOWER(email)=LOWER(?) AND datetime(created_at)>=datetime('now','-1 hour')`).bind(email).first())?.count||0);
  if(recent>=3)return{ok:false,error:'rate_limit'};
  const duplicate=await db.prepare(`SELECT application_id FROM media_applications WHERE invitation_code=? AND LOWER(applicant_email)=LOWER(?) AND datetime(received_at)>=datetime('now','-15 minutes') ORDER BY received_at DESC LIMIT 1`).bind(code,email).first();
  if(duplicate)return{ok:false,error:'duplicate_recent',applicationId:duplicate.application_id};
  return{ok:true};
}

function acknowledgement(app,triage,applicationId,env){
  const missing=[...triage.missingFields,...triage.invalidFields.map(item=>`invalid:${item}`),...triage.missingDocuments.map(item=>`document:${item}`)];
  const subject=`[${applicationId}] Prijava zaprimljena / Application received – ${app.outlet_name}`;
  const statusLine=triage.status==='INCOMPLETE'
    ?`Prijava zahtijeva dopunu / The application requires additional information: ${missing.join(', ')}.`
    :triage.status==='LATE'
      ?'Prijava je zaprimljena nakon roka / The application was received after the deadline.'
      :'Prijava je upućena na ljudsku provjeru. Ova poruka nije odobrenje / The application has entered human verification. This message is not an approval.';
  const text=[
    `Poštovani / Dear ${app.applicant_name},`,'',
    `Prijava redakcije ${app.outlet_name} zaprimljena je pod šifrom ${applicationId}.`,
    `The newsroom application has been received under code ${applicationId}.`,
    `Šifra poziva / Invitation code: ${app.invitation_code}.`,'',statusLine,'',
    'Avionsku kartu nemojte kupovati prije pisanog odobrenja GNK ASG-a. Nakon odobrenja organizator ili ovlaštena agencija organizira i plaća kartu.',
    'Do not purchase an airline ticket before written GNK ASG approval. After approval, the organizer or its authorized agency arranges and pays for the ticket.','',
    'Smještaj u New Yorku rezerviran je i plaćen. / Accommodation in New York has been reserved and paid.','',
    `U daljnjoj komunikaciji navedite ${applicationId} i ${app.invitation_code}. / Quote both codes in all further correspondence.`,'',
    'GNK ASG Media Relations',fromAddress(env)
  ].join('\n');
  return{subject,text};
}

async function sendAcknowledgement(env,to,subject,text){
  if(!env.EMAIL?.send||!validEmail(to))return false;
  const from=fromAddress(env);
  const body64=foldBase64(bytesToBase64(enc.encode(text)));
  const raw=[
    `From: GNK ASG Media Relations <${from}>`,
    `To: ${to}`,
    `Reply-To: ${from}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@gnk-asg.hr>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64','',body64,''
  ].join('\r\n');
  await env.EMAIL.send(new EmailMessage(from,to,raw));
  return true;
}

async function submitApplication(request,env){
  if(!sameOrigin(request))return json({ok:false,error:'origin_not_allowed'},403);
  const length=Number(request.headers.get('content-length')||0);
  if(length>MAX_REQUEST_BYTES)return json({ok:false,error:'request_too_large',maxBytes:MAX_REQUEST_BYTES},413);
  const type=clean(request.headers.get('content-type')).toLowerCase();
  if(!type.includes('multipart/form-data'))return json({ok:false,error:'multipart_form_required'},415);
  let form;
  try{form=await request.formData();}catch{return json({ok:false,error:'invalid_form_data'},400);}
  if(clean(form.get('companyFax')))return json({ok:true,received:true});
  if(clean(form.get('privacyConsent'))!=='yes'||clean(form.get('newsroomDeclaration'))!=='yes'||clean(form.get('costPolicy'))!=='yes')return json({ok:false,error:'required_confirmations_missing'},400);

  const code=invitationCode(form.get('invitationCode'));
  const contact=await validateInvitation(env,code);
  if(!contact)return json({ok:false,error:'invitation_code_not_found',message:'Provjerite šifru iz poziva / Check the reference code from the invitation.'},404);

  const app={
    invitation_code:code,
    outlet_name:clean(form.get('outletName')),
    outlet_country:clean(form.get('outletCountry')),
    outlet_website:normalizeUrl(form.get('outletWebsite')),
    applicant_name:clean(form.get('applicantName')),
    applicant_role:clean(form.get('applicantRole')),
    applicant_email:clean(form.get('applicantEmail')).toLowerCase(),
    applicant_mobile:clean(form.get('applicantMobile')),
    editor_name:clean(form.get('editorName')),
    editor_role:clean(form.get('editorRole')),
    editor_email:clean(form.get('editorEmail')).toLowerCase(),
    editor_mobile:clean(form.get('editorMobile')),
    declaration:`Newsroom declaration confirmed through the GNK ASG application portal at ${now()}`,
    departure_city:clean(form.get('departureCity')),
    preferred_airport:clean(form.get('preferredAirport')),
    travel_dates:clean(form.get('travelDates')),
    other_costs:JSON.stringify({flightProposal:clean(form.get('flightProposal')),otherCosts:clean(form.get('otherCosts'))})
  };

  const requiredText=['outlet_name','outlet_country','outlet_website','applicant_name','applicant_role','applicant_email','applicant_mobile','editor_name','editor_role','editor_email','editor_mobile','departure_city','preferred_airport','travel_dates'];
  if(requiredText.some(field=>!clean(app[field])))return json({ok:false,error:'required_fields_missing'},400);
  if(!validEmail(app.applicant_email)||!validEmail(app.editor_email))return json({ok:false,error:'invalid_email'},400);
  if(!validPhone(app.applicant_mobile)||!validPhone(app.editor_mobile))return json({ok:false,error:'invalid_phone',message:'Use international format, for example +385...'},400);

  const gate=await submissionAllowed(env,app.applicant_email,code);
  if(!gate.ok)return json({ok:false,...gate},gate.error==='rate_limit'?429:409);

  const entries=[
    fileEntry(form,'assignmentLetter','assignment_letter'),
    fileEntry(form,'pressCredential','press_credential'),
    fileEntry(form,'flightProposalDocument','flight_document'),
    fileEntry(form,'otherCostDocument','other_cost_estimate')
  ].filter(Boolean);
  if(entries.length>MAX_FILES)return json({ok:false,error:'too_many_files',maxFiles:MAX_FILES},400);

  const applicationId=makeApplicationId();
  const receivedAt=now();
  const documents=[];
  for(const entry of entries)documents.push(await storeDocument(env,applicationId,entry));
  const triage=triageApplication(app,documents,receivedAt,env);
  const db=await ensureSchema(env);
  const stamp=now();
  await db.prepare(`INSERT INTO media_applications(application_id,invitation_code,received_at,source_message_id,source_from,source_subject,outlet_name,outlet_country,outlet_website,applicant_name,applicant_role,applicant_email,applicant_mobile,editor_name,editor_role,editor_email,editor_mobile,declaration,departure_city,preferred_airport,travel_dates,other_costs,status,score,missing_json,domain_match,raw_r2_key,human_decision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(applicationId,code,receivedAt,'',`portal:${app.applicant_email}`,`Portal application ${code}`,app.outlet_name,app.outlet_country,app.outlet_website,app.applicant_name,app.applicant_role,app.applicant_email,app.applicant_mobile,app.editor_name,app.editor_role,app.editor_email,app.editor_mobile,app.declaration,app.departure_city,app.preferred_airport,app.travel_dates,app.other_costs,triage.status,triage.score,JSON.stringify({missingFields:triage.missingFields,invalidFields:triage.invalidFields,missingDocuments:triage.missingDocuments,source:'web-portal',contactOutlet:contact.outlet}),triage.domainsMatch?1:0,'','PENDING',stamp,stamp).run();
  await recordEvent(env,'portal_application_received',{mailCode:code,applicationId,outlet:app.outlet_name,email:app.applicant_email,detail:{status:triage.status,score:triage.score,documentCount:documents.length,contactOutlet:contact.outlet}});

  let acknowledgementSent=false;
  if(boolEnv(env.MEDIA_APPLICATION_AUTO_ACK,true)){
    const ack=acknowledgement(app,triage,applicationId,env);
    try{
      acknowledgementSent=await sendAcknowledgement(env,app.applicant_email,ack.subject,ack.text);
      if(acknowledgementSent)await recordEvent(env,'application_ack_sent',{mailCode:code,applicationId,outlet:app.outlet_name,email:app.applicant_email,detail:{source:'web-portal',status:triage.status}});
    }catch(error){
      await recordEvent(env,'application_ack_failed',{mailCode:code,applicationId,outlet:app.outlet_name,email:app.applicant_email,detail:{source:'web-portal',error:String(error?.message||error).slice(0,300)}});
    }
  }
  return json({
    ok:true,
    applicationId,
    invitationCode:code,
    receivedAt,
    status:triage.status,
    score:triage.score,
    acknowledgementSent,
    missing:{fields:triage.missingFields,invalid:triage.invalidFields,documents:triage.missingDocuments},
    message:'Prijava je zaprimljena i čeka ljudsku provjeru. / The application has been received and awaits human verification.'
  },201);
}

function policyNotifications(env){
  const deadlineText=new Intl.DateTimeFormat('hr-HR',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Zagreb'}).format(new Date(deadline(env)));
  return [
    {id:'policy-portal',level:'ok',title:'Prijavno sučelje je aktivno',message:'Pozvane redakcije mogu se prijaviti putem jedinstvene šifre na /media-application/.',source:'POLICY'},
    {id:'policy-mailbox',level:'ok',title:'Media mailbox je aktivan',message:`Službena adresa za odgovore i dopune je ${fromAddress(env)}.`,source:'POLICY'},
    {id:'policy-ack',level:boolEnv(env.MEDIA_APPLICATION_AUTO_ACK,true)?'ok':'warn',title:'Automatska potvrda zaprimanja',message:boolEnv(env.MEDIA_APPLICATION_AUTO_ACK,true)?'Potvrda se šalje nakon uspješnog zaprimanja prijave.':'Automatska potvrda trenutno je isključena.',source:'POLICY'},
    {id:'policy-flight',level:'info',title:'Karta se ne kupuje unaprijed',message:'Redakcija predlaže let; GNK ASG ili ovlaštena agencija odobrava, organizira i plaća kartu.',source:'POLICY'},
    {id:'policy-hotel',level:'ok',title:'Smještaj je osiguran',message:'Smještaj u New Yorku rezerviran je i plaćen po odobrenoj redakciji.',source:'POLICY'},
    {id:'policy-letter',level:'info',title:'Obvezno pismo redakcije',message:'Prijava mora sadržavati potpisano pismo redakcijskog angažmana na službenom memorandumu.',source:'POLICY'},
    {id:'policy-credential',level:'info',title:'Obvezan dokaz profesionalnog rada',message:'Potrebna je novinarska iskaznica ili dokaz nedavno objavljenih radova.',source:'POLICY'},
    {id:'policy-passport',level:'warn',title:'Putovnica se ne šalje u početnoj fazi',message:'Preslika putovnice nije prihvatljiva običnim e-mailom niti kroz početni obrazac.',source:'POLICY'},
    {id:'policy-human',level:'info',title:'Odluka ostaje ljudska',message:'Automatizacija provjerava potpunost; odobrenje daje isključivo ovlaštena osoba.',source:'POLICY'},
    {id:'policy-deadline',level:'warn',title:'Rok za prijavu',message:`Rok istječe ${deadlineText}.`,source:'POLICY'}
  ];
}

function eventNotification(row){
  let detail={};try{detail=JSON.parse(row.detail_json||'{}');}catch{}
  const titles={
    portal_application_received:'Nova prijava kroz sučelje',
    application_received:'Nova prijava e-mailom',
    application_ack_sent:'Potvrda zaprimanja poslana',
    application_ack_failed:'Potvrda nije poslana',
    application_decision:'Donesena odluka o prijavi',
    message_sent:'Medijska poruka obrađena',
    contact_approval:'Promijenjeno odobrenje kontakta'
  };
  return{
    id:row.id,
    level:/failed|rejected|blocked/i.test(row.event_type)?'bad':/decision|approval/i.test(row.event_type)?'warn':'ok',
    title:titles[row.event_type]||row.event_type.replace(/_/g,' '),
    message:[row.outlet,row.application_id,row.mail_code,detail.status,detail.decision].filter(Boolean).join(' · ')||'Operativni događaj zabilježen je u sustavu.',
    source:'EVENT',
    createdAt:row.created_at,
    eventType:row.event_type
  };
}

export async function handleMediaOperationalNotifications(request,env){
  if(pathOf(request)!==NOTIFICATIONS_PATH)return null;
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405,{'allow':'GET'});
  const db=await ensureSchema(env);
  const rows=(await db.prepare(`SELECT id,event_type,mail_code,application_id,outlet,email,detail_json,created_at FROM media_outreach_events ORDER BY created_at DESC LIMIT 20`).all()).results||[];
  const events=rows.map(eventNotification);
  const defaults=policyNotifications(env);
  const items=[...events,...defaults.filter(item=>!events.some(event=>event.id===item.id))].slice(0,Math.max(10,Math.min(20,events.length+defaults.length)));
  const nextRefreshAt=new Date(Date.now()+30*60*1000).toISOString();
  return json({ok:true,version:VERSION,items,count:items.length,eventCount:events.length,minimumVisible:10,refreshIntervalSeconds:1800,nextRefreshAt});
}

export async function handleMediaApplicationPortal(request,env){
  const path=pathOf(request);
  const isUi=path===UI_PATH||path.startsWith(`${UI_PATH}/`);
  const isApi=path===API_PREFIX||path.startsWith(`${API_PREFIX}/`);
  if(!isUi&&!isApi)return null;
  if(isUi&&['GET','HEAD'].includes(request.method))return await assetResponse(request,env,'/media-application/index.html','text/html; charset=utf-8')||json({ok:false,error:'ui_asset_missing'},404);
  if(request.method==='GET'&&path===`${API_PREFIX}/config`)return json(publicConfig(env));
  if(request.method==='POST'&&path===`${API_PREFIX}/submit`)return submitApplication(request,env);
  return json({ok:false,error:'not_found'},404);
}
