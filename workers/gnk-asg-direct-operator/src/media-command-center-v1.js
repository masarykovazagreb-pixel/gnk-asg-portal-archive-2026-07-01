import { EmailMessage } from 'cloudflare:email';

export const VERSION='GNK_ASG_MEDIA_COMMAND_CENTER_V1_20260626';
const UI_PATH='/media-command-center';
const API_PREFIX='/api/media-command-center';
const DEADLINE_DEFAULT='2026-07-20T21:59:59.000Z';
const FROM_DEFAULT='media@gnk-asg.hr';
const CONTACTS_ASSET='/data/media-outreach-contacts-v1.json';
const CONFIG_KEY='media-command-center:campaign:v1';
const enc=new TextEncoder();
const dec=new TextDecoder();

const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const dbOf=env=>env.GNK_ASG_D1||null;
const kvOf=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const bucketOf=env=>env.GNK_ASG_MEDIA_ASSETS||null;
const boolEnv=(value,fallback=false)=>value==null?fallback:/^(1|true|yes|on)$/i.test(String(value));
const intEnv=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;

function json(data,status=200,extra={}){
  return new Response(JSON.stringify(data,null,2),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, no-cache, must-revalidate, max-age=0',
    'x-gnk-asg-media-command-center':VERSION,
    ...extra
  }});
}
function tokens(env){return [env.OPERATOR_TOKEN,env.GNK_ASG_OPERATOR_TOKEN,env.ADMIN_TOKEN,env.GNK_ASG_ADMIN_TOKEN,env.NEWS_PUBLISH_TOKEN,env.SECRET_TOKEN].map(clean).filter(Boolean);}
function authorized(request,env){
  const authorization=request.headers.get('authorization')||'';
  const token=clean(authorization.replace(/^Bearer\s+/i,'')||request.headers.get('x-operator-token')||request.headers.get('x-admin-token')||request.headers.get('x-gnk-asg-token'));
  return Boolean(token&&tokens(env).includes(token));
}
async function sha256(bytes){
  const value=bytes instanceof ArrayBuffer?bytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const digest=await crypto.subtle.digest('SHA-256',value);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function bytesToBase64(bytes){
  let out='';
  const view=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  for(let i=0;i<view.length;i+=0x8000)out+=String.fromCharCode(...view.subarray(i,i+0x8000));
  return btoa(out);
}
function base64ToBytes(value){
  const binary=atob(String(value||'').replace(/\s+/g,''));
  const out=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);
  return out;
}
function decodeQuotedPrintable(value){
  const normalized=String(value||'').replace(/=\r?\n/g,'');
  const bytes=[];
  for(let i=0;i<normalized.length;i++){
    if(normalized[i]==='='&&/^[0-9A-F]{2}$/i.test(normalized.slice(i+1,i+3))){bytes.push(parseInt(normalized.slice(i+1,i+3),16));i+=2;}
    else bytes.push(normalized.charCodeAt(i)&255);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}
function parseHeaderBlock(raw){
  const unfolded=String(raw||'').replace(/\r?\n[ \t]+/g,' ');
  const headers={};
  for(const line of unfolded.split(/\r?\n/)){
    const index=line.indexOf(':');
    if(index<1)continue;
    const key=line.slice(0,index).trim().toLowerCase();
    const value=line.slice(index+1).trim();
    headers[key]=headers[key]?`${headers[key]}, ${value}`:value;
  }
  return headers;
}
function splitEntity(raw){
  const match=String(raw||'').match(/\r?\n\r?\n/);
  if(!match)return{headers:{},body:String(raw||'')};
  const index=match.index;
  return{headers:parseHeaderBlock(raw.slice(0,index)),body:raw.slice(index+match[0].length)};
}
function headerParam(header,name){
  const re=new RegExp(`${name}\\s*=\\s*(?:"([^"]+)"|([^;\\s]+))`,'i');
  const match=String(header||'').match(re);
  return clean(match?.[1]||match?.[2]);
}
function decodeMimeText(body,encoding){
  const mode=clean(encoding).toLowerCase();
  if(mode==='base64')return dec.decode(base64ToBytes(body));
  if(mode==='quoted-printable')return decodeQuotedPrintable(body);
  return String(body||'');
}
function parseMime(raw,depth=0,result={texts:[],attachments:[]}){
  if(depth>5)return result;
  const {headers,body}=splitEntity(raw);
  const contentType=headers['content-type']||'text/plain';
  const disposition=headers['content-disposition']||'';
  const transfer=headers['content-transfer-encoding']||'';
  const boundary=headerParam(contentType,'boundary');
  if(/^multipart\//i.test(contentType)&&boundary){
    const marker=`--${boundary}`;
    for(const part of body.split(marker).slice(1)){
      if(part.trim()==='--'||part.startsWith('--'))continue;
      parseMime(part.replace(/^\r?\n/,''),depth+1,result);
    }
    return result;
  }
  const filename=headerParam(disposition,'filename')||headerParam(contentType,'name');
  if(filename||/attachment/i.test(disposition)){
    let bytes;
    if(clean(transfer).toLowerCase()==='base64')bytes=base64ToBytes(body);
    else bytes=enc.encode(decodeMimeText(body,transfer));
    result.attachments.push({filename:filename||'attachment.bin',mimeType:contentType.split(';')[0].trim()||'application/octet-stream',bytes});
    return result;
  }
  if(/^text\/(plain|html)/i.test(contentType))result.texts.push({type:contentType.split(';')[0].trim(),value:decodeMimeText(body,transfer)});
  return result;
}
function htmlToText(value){return String(value||'').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/[ \t]+/g,' ').replace(/\n\s+/g,'\n').trim();}
function extractCode(text){return clean(String(text||'').match(/GNK-MEDIA-\d{8}-[A-Z]{2}-[A-Z0-9]{1,8}-\d{3}/i)?.[0]).toUpperCase();}
function normalizeLabel(value){return clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'');}
function extractFields(text){
  const aliases={
    outlet_name:['mediaoutlet','newsroommediaoutlet','redakcijamedij','nazivmedija','outlet'],
    outlet_country:['country','drzava','countryofmediaoutlet'],
    outlet_website:['website','websitemedija','mediawebsite','sluzbenawebstranica'],
    applicant_name:['applicantfullname','imeiprezime','fullname','imeiprezimeprijavljenogpredstavnika'],
    applicant_role:['applicantrole','funkcija','positiontitle','funkcijaiodjel'],
    applicant_email:['applicantofficialemail','sluzbenimail','officialemail','sluzbenie-mail'],
    applicant_mobile:['applicantmobile','mobitel','mobilewhatsapp','mobitelwhatsapp'],
    editor_name:['editorfullname','imeurednika','editorname','odgovorniurednik'],
    editor_role:['editorrole','funkcijaurednika','editortitle'],
    editor_email:['editorofficialemail','mailurednika','editoremail','e-mailurednika'],
    editor_mobile:['editormobile','mobitelurednika','editorphone'],
    departure_city:['departurecity','gradpolaska'],
    preferred_airport:['preferredairport','aerodrompolaska','zracnaluka'],
    travel_dates:['traveldates','datumiputovanja','ocekivanidatumiputovanja'],
    declaration:['newsroomdeclaration','izjavaredakcije','declaration'],
    other_costs:['otherexpectedcosts','ostalitroskovi','ostaliocekivanitroskovi']
  };
  const reverse={};
  for(const [field,list] of Object.entries(aliases))for(const alias of list)reverse[alias]=field;
  const out={};
  for(const line of String(text||'').split(/\r?\n/)){
    const match=line.match(/^\s*([^:]{2,70})\s*:\s*(.+?)\s*$/);
    if(!match)continue;
    const field=reverse[normalizeLabel(match[1])];
    if(field)out[field]=clean(match[2]);
  }
  return out;
}
function emailDomain(email){return clean(email).toLowerCase().split('@')[1]||'';}
function validEmail(email){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(email));}
function validPhone(phone){return /^\+[1-9]\d{7,14}$/.test(clean(phone).replace(/[\s().-]/g,''));}
function isFreeDomain(domain){return new Set(['gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com','aol.com','proton.me','protonmail.com','gmx.com','mail.com','yandex.com']).has(clean(domain).toLowerCase());}
function deadline(env){return clean(env.MEDIA_APPLICATION_DEADLINE)||DEADLINE_DEFAULT;}
function applicationStatus(app,documents,receivedAt,env){
  const required=['outlet_name','outlet_country','outlet_website','applicant_name','applicant_role','applicant_email','applicant_mobile','editor_name','editor_role','editor_email','editor_mobile','departure_city','preferred_airport','travel_dates','declaration'];
  const missingFields=required.filter(field=>!clean(app[field]));
  const invalidFields=[];
  if(app.applicant_email&&!validEmail(app.applicant_email))invalidFields.push('applicant_email');
  if(app.editor_email&&!validEmail(app.editor_email))invalidFields.push('editor_email');
  if(app.applicant_mobile&&!validPhone(app.applicant_mobile))invalidFields.push('applicant_mobile');
  if(app.editor_mobile&&!validPhone(app.editor_mobile))invalidFields.push('editor_mobile');
  const categories=new Set(documents.filter(d=>!d.rejected).map(d=>d.category));
  const missingDocuments=[];
  if(!categories.has('assignment_letter'))missingDocuments.push('assignment_letter');
  if(!categories.has('press_credential'))missingDocuments.push('press_credential');
  if(!categories.has('flight_document'))missingDocuments.push('flight_document');
  const applicantDomain=emailDomain(app.applicant_email),editorDomain=emailDomain(app.editor_email);
  const domainsMatch=Boolean(applicantDomain&&editorDomain&&applicantDomain===editorDomain&&!isFreeDomain(applicantDomain));
  const late=Date.parse(receivedAt)>Date.parse(deadline(env));
  let status='READY_FOR_HUMAN_REVIEW';
  if(late)status='LATE';
  else if(!app.invitation_code)status='UNMATCHED_INVITATION_CODE';
  else if(missingFields.length||invalidFields.length||missingDocuments.length)status='INCOMPLETE';
  else if(!domainsMatch)status='MANUAL_DOMAIN_VERIFICATION';
  let score=0;
  if(app.invitation_code)score+=10;
  if(!late)score+=10;
  if(!missingFields.length)score+=20;
  if(!invalidFields.length)score+=10;
  if(categories.has('assignment_letter'))score+=15;
  if(categories.has('press_credential'))score+=10;
  if(categories.has('flight_document'))score+=15;
  if(domainsMatch)score+=10;
  return{status,score,missingFields,invalidFields,missingDocuments,domainsMatch,late};
}
function documentCategory(filename){
  const name=clean(filename).toLowerCase();
  if(/passport|putovnic/.test(name))return'passport_rejected';
  if(/assignment|letterhead|redakc|nalog|akredit/.test(name))return'assignment_letter';
  if(/press|credential|novinar|published|sample|clanak|article/.test(name))return'press_credential';
  if(/flight|ticket|itinerary|booking|reservation|proforma|predracun|let/.test(name))return'flight_document';
  if(/estimate|cost|expense|ponuda|trosak/.test(name))return'other_cost_estimate';
  return'other';
}
function safeFilename(value){return clean(value||'attachment.bin').replace(/[^A-Za-z0-9._-]+/g,'_').slice(0,150)||'attachment.bin';}
function makeApplicationId(){return`GNK-APP-2026-${crypto.randomUUID().slice(0,8).toUpperCase()}`;}
function makeEventId(){return crypto.randomUUID();}

async function ensureSchema(env){
  const db=dbOf(env);
  if(!db)throw new Error('GNK_ASG_D1 binding is not configured');
  const statements=[
    `CREATE TABLE IF NOT EXISTS media_outreach_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, mail_code TEXT UNIQUE NOT NULL, priority TEXT, country TEXT, outlet TEXT NOT NULL,
      recipient_title TEXT, recipient_name TEXT, role TEXT, secondary_desk TEXT, attention_line TEXT, email TEXT,
      channel TEXT, language TEXT, salutation TEXT, person_status TEXT, channel_status TEXT,
      automation_allowed INTEGER NOT NULL DEFAULT 0, approved INTEGER NOT NULL DEFAULT 0,
      sent_status TEXT NOT NULL DEFAULT 'NIJE POSLANO', response_status TEXT NOT NULL DEFAULT 'NEMA ODGOVORA',
      source TEXT, note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS media_outreach_events (
      id TEXT PRIMARY KEY, event_type TEXT NOT NULL, mail_code TEXT, application_id TEXT, outlet TEXT,
      email TEXT, detail_json TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS media_applications (
      application_id TEXT PRIMARY KEY, invitation_code TEXT, received_at TEXT NOT NULL, source_message_id TEXT,
      source_from TEXT, source_subject TEXT, outlet_name TEXT, outlet_country TEXT, outlet_website TEXT,
      applicant_name TEXT, applicant_role TEXT, applicant_email TEXT, applicant_mobile TEXT,
      editor_name TEXT, editor_role TEXT, editor_email TEXT, editor_mobile TEXT,
      declaration TEXT, departure_city TEXT, preferred_airport TEXT, travel_dates TEXT, other_costs TEXT,
      status TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, missing_json TEXT, domain_match INTEGER NOT NULL DEFAULT 0,
      raw_r2_key TEXT, human_decision TEXT NOT NULL DEFAULT 'PENDING', decision_reason TEXT, decided_by TEXT, decided_at TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS media_application_documents (
      id TEXT PRIMARY KEY, application_id TEXT NOT NULL, category TEXT NOT NULL, filename TEXT NOT NULL,
      mime_type TEXT, size_bytes INTEGER, sha256 TEXT, r2_key TEXT, rejected INTEGER NOT NULL DEFAULT 0,
      rejection_reason TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS media_suppressions (
      email TEXT PRIMARY KEY, reason TEXT, created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_media_contacts_outlet ON media_outreach_contacts(outlet)`,
    `CREATE INDEX IF NOT EXISTS idx_media_contacts_send ON media_outreach_contacts(approved,automation_allowed,sent_status)`,
    `CREATE INDEX IF NOT EXISTS idx_media_applications_status ON media_applications(status,human_decision,received_at)`,
    `CREATE INDEX IF NOT EXISTS idx_media_events_created ON media_outreach_events(created_at)`
  ];
  await db.batch(statements.map(sql=>db.prepare(sql)));
  return db;
}
async function event(env,type,data={}){
  const db=await ensureSchema(env);
  await db.prepare(`INSERT INTO media_outreach_events(id,event_type,mail_code,application_id,outlet,email,detail_json,created_at) VALUES(?,?,?,?,?,?,?,?)`)
    .bind(makeEventId(),type,clean(data.mailCode),clean(data.applicationId),clean(data.outlet),clean(data.email),JSON.stringify(data.detail||{}),now()).run();
}
async function readCampaign(env){
  const fallback={
    titleHr:'Poziv redakciji za sudjelovanje i medijsko praćenje programa u New Yorku',
    titleEn:'Invitation to participate in and cover the New York programme',
    bodyHr:'Organizator je medijska agencija u sklopu grupacije GNK ASG. Troškove putovanja, smještaja i ostale opravdane, dokumentirane i unaprijed odobrene troškove neposredno povezane sa sudjelovanjem i izvještavanjem snosi organizator. Smještaj u New Yorku već je rezerviran i plaćen.',
    bodyEn:'The organizer is a media agency within the GNK ASG group. Travel, accommodation and other reasonable, documented and pre-approved costs directly related to attendance and reporting are covered by the organizer. Accommodation in New York has already been reserved and paid.',
    deadline:'20 July 2026 at 23:59 CEST',
    applicationEmail:FROM_DEFAULT,
    pdfR2Key:''
  };
  const kv=kvOf(env);if(!kv)return fallback;
  try{const raw=await kv.get(CONFIG_KEY);return raw?{...fallback,...JSON.parse(raw)}:fallback;}catch{return fallback;}
}
async function saveCampaign(env,data){
  const current=await readCampaign(env);
  const next={...current,...data,updatedAt:now()};
  const kv=kvOf(env);if(!kv)throw new Error('KV binding is not configured');
  await kv.put(CONFIG_KEY,JSON.stringify(next,null,2));
  return next;
}
async function assetResponse(request,env,assetPath,contentType){
  if(!env.ASSETS?.fetch)return null;
  const response=await env.ASSETS.fetch(new Request(new URL(assetPath,request.url),{method:request.method,headers:request.headers}));
  if(response.status===404)return null;
  const headers=new Headers(response.headers);headers.set('cache-control','no-store');headers.set('x-robots-tag','noindex,nofollow');
  if(contentType)headers.set('content-type',contentType);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
async function seedContacts(env,force=false){
  const db=await ensureSchema(env);
  const count=Number((await db.prepare(`SELECT COUNT(*) AS count FROM media_outreach_contacts`).first())?.count||0);
  if(count&&!force)return{ok:true,seeded:false,count};
  const response=await env.ASSETS?.fetch(new Request(`https://assets.local${CONTACTS_ASSET}`));
  if(!response?.ok)throw new Error('Contacts asset is unavailable');
  const contacts=await response.json();
  const stamp=now();
  const statements=contacts.map(item=>db.prepare(`INSERT INTO media_outreach_contacts(
    mail_code,priority,country,outlet,recipient_title,recipient_name,role,secondary_desk,attention_line,email,channel,language,salutation,
    person_status,channel_status,automation_allowed,approved,sent_status,response_status,source,note,created_at,updated_at
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(mail_code) DO UPDATE SET priority=excluded.priority,country=excluded.country,outlet=excluded.outlet,
    recipient_title=excluded.recipient_title,recipient_name=excluded.recipient_name,role=excluded.role,secondary_desk=excluded.secondary_desk,
    attention_line=excluded.attention_line,email=excluded.email,channel=excluded.channel,language=excluded.language,salutation=excluded.salutation,
    person_status=excluded.person_status,channel_status=excluded.channel_status,automation_allowed=excluded.automation_allowed,
    source=excluded.source,note=excluded.note,updated_at=excluded.updated_at`)
    .bind(item.mailCode,clean(item.priority),clean(item.country),clean(item.outlet),clean(item.recipientTitle),clean(item.recipientName),clean(item.role),clean(item.secondaryDesk),clean(item.attentionLine),clean(item.email).toLowerCase(),clean(item.channel),clean(item.language),clean(item.salutation),clean(item.personStatus),clean(item.channelStatus),item.automationAllowed?1:0,item.approved?1:0,clean(item.sentStatus)||'NIJE POSLANO',clean(item.responseStatus)||'NEMA ODGOVORA',clean(item.source),clean(item.note),stamp,stamp));
  for(let i=0;i<statements.length;i+=40)await db.batch(statements.slice(i,i+40));
  await event(env,'contacts_seeded',{detail:{count:contacts.length,force}});
  return{ok:true,seeded:true,count:contacts.length};
}
function contactFromRow(row){return{
  id:row.id,mailCode:row.mail_code,priority:row.priority,country:row.country,outlet:row.outlet,
  recipientTitle:row.recipient_title,recipientName:row.recipient_name,role:row.role,secondaryDesk:row.secondary_desk,
  attentionLine:row.attention_line,email:row.email,channel:row.channel,language:row.language,salutation:row.salutation,
  personStatus:row.person_status,channelStatus:row.channel_status,automationAllowed:Boolean(row.automation_allowed),approved:Boolean(row.approved),
  sentStatus:row.sent_status,responseStatus:row.response_status,source:row.source,note:row.note,updatedAt:row.updated_at
};}
function applicationFromRow(row){let missing={};try{missing=JSON.parse(row.missing_json||'{}');}catch{}return{
  applicationId:row.application_id,invitationCode:row.invitation_code,receivedAt:row.received_at,sourceFrom:row.source_from,sourceSubject:row.source_subject,
  outletName:row.outlet_name,outletCountry:row.outlet_country,outletWebsite:row.outlet_website,
  applicantName:row.applicant_name,applicantRole:row.applicant_role,applicantEmail:row.applicant_email,applicantMobile:row.applicant_mobile,
  editorName:row.editor_name,editorRole:row.editor_role,editorEmail:row.editor_email,editorMobile:row.editor_mobile,
  declaration:row.declaration,departureCity:row.departure_city,preferredAirport:row.preferred_airport,travelDates:row.travel_dates,otherCosts:row.other_costs,
  status:row.status,score:row.score,missing,domainMatch:Boolean(row.domain_match),rawR2Key:row.raw_r2_key,
  humanDecision:row.human_decision,decisionReason:row.decision_reason,decidedBy:row.decided_by,decidedAt:row.decided_at,updatedAt:row.updated_at
};}
function languageIsCroatian(value){return /hrvat|croat|serb|srps/i.test(clean(value));}
function composeMessage(contact,campaign){
  const hr=languageIsCroatian(contact.language);
  const title=hr?campaign.titleHr:campaign.titleEn;
  const body=hr?campaign.bodyHr:campaign.bodyEn;
  const salutation=contact.salutation||(hr?'Poštovani,':'Dear Editor,');
  const attention=contact.attention_line||(hr?`Na ruke: ${contact.recipient_name||contact.recipient_title||'glavnom uredniku'}, ${contact.outlet}`:`For the attention of ${contact.recipient_name||contact.recipient_title||'the Editor-in-Chief'}, ${contact.outlet}`);
  const requirements=hr?
`Prijavu je potrebno dostaviti do ${campaign.deadline} na ${campaign.applicationEmail}. U prijavi navedite redakciju, ime i prezime, funkciju, službeni e-mail, mobitel, kontakt odgovornog urednika, grad i zračnu luku polaska te priložite pismo redakcijskog angažmana, dokaz profesionalnog rada i avionsku kartu, potvrđenu rezervaciju/itinerar ili predračun za let. U početnoj prijavi nemojte običnim e-mailom slati presliku putovnice.`:
`The newsroom application must reach ${campaign.applicationEmail} no later than ${campaign.deadline}. It must identify the newsroom, applicant, role, official email, mobile number, responsible editor, city and airport of departure, and include a signed assignment letter, proof of professional work, and an issued airline ticket, confirmed reservation/itinerary, or flight pro forma invoice. Do not send a passport copy by ordinary email at the initial stage.`;
  const codeInstruction=hr?`U predmetu, prijavi i svakom odgovoru obvezno navedite šifru ${contact.mail_code}.`:`Please quote reference code ${contact.mail_code} in the subject, application and all replies.`;
  const text=[salutation,'',attention,'',body,'',requirements,'',codeInstruction,'',hr?'S poštovanjem,':'Kind regards,','GNK ASG Media Relations',campaign.applicationEmail].join('\n');
  return{subject:`[${contact.mail_code}] ${title} – ${contact.outlet}`,text};
}
function foldBase64(value){return value.replace(/.{1,76}/g,'$&\r\n').trimEnd();}
async function buildRawEmail(env,to,subject,text,campaign){
  const from=clean(env.MEDIA_OUTREACH_FROM)||FROM_DEFAULT;
  const boundary=`gnk_${crypto.randomUUID().replace(/-/g,'')}`;
  const text64=foldBase64(bytesToBase64(enc.encode(text)));
  const lines=[
    `From: GNK ASG Media Relations <${from}>`,`To: ${to}`,`Reply-To: ${from}`,
    `Subject: ${subject}`,`Date: ${new Date().toUTCString()}`,`Message-ID: <${crypto.randomUUID()}@gnk-asg.hr>`,
    `MIME-Version: 1.0`,`X-GNK-Media-Code: ${extractCode(subject)}`
  ];
  const key=clean(campaign.pdfR2Key||env.MEDIA_OUTREACH_PDF_KEY);
  const bucket=bucketOf(env);
  if(key&&bucket){
    const object=await bucket.get(key);
    if(object){
      const bytes=new Uint8Array(await object.arrayBuffer());
      lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`,'',`--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',text64,`--${boundary}`,'Content-Type: application/pdf; name="GNK-ASG-media-information.pdf"','Content-Disposition: attachment; filename="GNK-ASG-media-information.pdf"','Content-Transfer-Encoding: base64','',foldBase64(bytesToBase64(bytes)),`--${boundary}--`,'');
      return lines.join('\r\n');
    }
  }
  lines.push('Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',text64,'');
  return lines.join('\r\n');
}
async function sendEmail(env,to,subject,text,campaign){
  if(!env.EMAIL?.send)throw new Error('EMAIL binding is not configured');
  const from=clean(env.MEDIA_OUTREACH_FROM)||FROM_DEFAULT;
  const raw=await buildRawEmail(env,to,subject,text,campaign);
  await env.EMAIL.send(new EmailMessage(from,to,raw));
}
async function rateAllowed(env){
  const db=await ensureSchema(env),hour=intEnv(env.MEDIA_OUTREACH_MAX_PER_HOUR,10),day=intEnv(env.MEDIA_OUTREACH_MAX_PER_DAY,50);
  const h=Number((await db.prepare(`SELECT COUNT(*) AS count FROM media_outreach_events WHERE event_type='message_sent' AND created_at>=datetime('now','-1 hour')`).first())?.count||0);
  const d=Number((await db.prepare(`SELECT COUNT(*) AS count FROM media_outreach_events WHERE event_type='message_sent' AND created_at>=datetime('now','-1 day')`).first())?.count||0);
  return{ok:h<hour&&d<day,hour:{used:h,limit:hour},day:{used:d,limit:day}};
}
async function listContacts(env,url){
  const db=await ensureSchema(env);
  await seedContacts(env,false);
  const limit=Math.min(250,Math.max(1,Number(url.searchParams.get('limit')||150)));
  const offset=Math.max(0,Number(url.searchParams.get('offset')||0));
  const search=clean(url.searchParams.get('q')).toLowerCase();
  const ready=url.searchParams.get('ready');
  const clauses=[],bind=[];
  if(search){clauses.push(`(LOWER(outlet) LIKE ? OR LOWER(country) LIKE ? OR LOWER(recipient_name) LIKE ? OR LOWER(email) LIKE ?)`);for(let i=0;i<4;i++)bind.push(`%${search}%`);}
  if(ready==='1')clauses.push(`automation_allowed=1 AND email<>''`);
  if(ready==='0')clauses.push(`(automation_allowed=0 OR email='')`);
  const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:'';
  const result=await db.prepare(`SELECT * FROM media_outreach_contacts ${where} ORDER BY CASE priority WHEN 'A' THEN 0 WHEN 'B' THEN 1 ELSE 2 END,country,outlet LIMIT ? OFFSET ?`).bind(...bind,limit,offset).all();
  const total=Number((await db.prepare(`SELECT COUNT(*) AS count FROM media_outreach_contacts ${where}`).bind(...bind).first())?.count||0);
  return{items:(result.results||[]).map(contactFromRow),total,limit,offset};
}
async function listApplications(env,url){
  const db=await ensureSchema(env);
  const limit=Math.min(250,Math.max(1,Number(url.searchParams.get('limit')||100)));
  const status=clean(url.searchParams.get('status'));
  const decision=clean(url.searchParams.get('decision'));
  const clauses=[],bind=[];
  if(status){clauses.push('status=?');bind.push(status);}
  if(decision){clauses.push('human_decision=?');bind.push(decision);}
  const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:'';
  const result=await db.prepare(`SELECT * FROM media_applications ${where} ORDER BY received_at DESC LIMIT ?`).bind(...bind,limit).all();
  const applications=[];
  for(const row of result.results||[]){
    const app=applicationFromRow(row);
    const docs=await db.prepare(`SELECT id,category,filename,mime_type,size_bytes,sha256,r2_key,rejected,rejection_reason,created_at FROM media_application_documents WHERE application_id=? ORDER BY created_at`).bind(app.applicationId).all();
    app.documents=docs.results||[];applications.push(app);
  }
  return applications;
}
async function status(env){
  const db=await ensureSchema(env);await seedContacts(env,false);
  const contact=await db.prepare(`SELECT COUNT(*) AS total,SUM(CASE WHEN email<>'' THEN 1 ELSE 0 END) AS with_email,SUM(CASE WHEN automation_allowed=1 AND email<>'' THEN 1 ELSE 0 END) AS ready,SUM(CASE WHEN approved=1 THEN 1 ELSE 0 END) AS approved,SUM(CASE WHEN sent_status='POSLANO' THEN 1 ELSE 0 END) AS sent FROM media_outreach_contacts`).first();
  const applications=await db.prepare(`SELECT COUNT(*) AS total,SUM(CASE WHEN status='READY_FOR_HUMAN_REVIEW' THEN 1 ELSE 0 END) AS ready,SUM(CASE WHEN status='INCOMPLETE' THEN 1 ELSE 0 END) AS incomplete,SUM(CASE WHEN status='LATE' THEN 1 ELSE 0 END) AS late,SUM(CASE WHEN human_decision='APPROVED' THEN 1 ELSE 0 END) AS approved FROM media_applications`).first();
  const rate=await rateAllowed(env),campaign=await readCampaign(env);
  return{ok:true,version:VERSION,live:boolEnv(env.MEDIA_OUTREACH_LIVE,false),autoAcknowledgement:boolEnv(env.MEDIA_APPLICATION_AUTO_ACK,true),deadline:deadline(env),applicationMailbox:clean(env.MEDIA_OUTREACH_FROM)||FROM_DEFAULT,bindings:{d1:Boolean(dbOf(env)),r2:Boolean(bucketOf(env)),email:Boolean(env.EMAIL),kv:Boolean(kvOf(env)),assets:Boolean(env.ASSETS)},contacts:contact,applications,rate,campaign,time:now()};
}
async function parseJson(request){try{return await request.json();}catch{return{};}}

export async function handleMediaCommandCenter(request,env,ctx){
  const path=pathOf(request),url=new URL(request.url);
  if(path!==UI_PATH&&!path.startsWith(`${UI_PATH}/`)&&!path.startsWith(`${API_PREFIX}/`)&&path!==API_PREFIX)return null;
  if(!authorized(request,env))return path.startsWith(API_PREFIX)?json({ok:false,error:'unauthorized'},401):new Response(`<!doctype html><meta charset="utf-8"><title>GNK ASG</title><h1>Neovlašten pristup</h1>`,{status:401,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
  if((path===UI_PATH||path===`${UI_PATH}/`)&&['GET','HEAD'].includes(request.method))return await assetResponse(request,env,'/media-command-center/index.html','text/html; charset=utf-8')||json({ok:false,error:'ui_asset_missing'},404);
  if(request.method==='GET'&&path===`${API_PREFIX}/status`)return json(await status(env));
  if(request.method==='GET'&&path===`${API_PREFIX}/contacts`)return json({ok:true,...await listContacts(env,url)});
  if(request.method==='POST'&&path===`${API_PREFIX}/seed`)return json(await seedContacts(env,true));
  if(request.method==='GET'&&path===`${API_PREFIX}/campaign`)return json({ok:true,campaign:await readCampaign(env)});
  if(request.method==='POST'&&path===`${API_PREFIX}/campaign`){const data=await parseJson(request);return json({ok:true,campaign:await saveCampaign(env,data)});}
  if(request.method==='POST'&&path===`${API_PREFIX}/contact-approval`){
    const data=await parseJson(request),db=await ensureSchema(env),code=clean(data.mailCode),approved=data.approved?1:0;
    const result=await db.prepare(`UPDATE media_outreach_contacts SET approved=?,updated_at=? WHERE mail_code=?`).bind(approved,now(),code).run();
    await event(env,'contact_approval',{mailCode:code,detail:{approved:Boolean(approved)}});
    return json({ok:true,changed:result.meta?.changes||0,mailCode:code,approved:Boolean(approved)});
  }
  if(request.method==='POST'&&path===`${API_PREFIX}/preview`){
    const data=await parseJson(request),db=await ensureSchema(env),row=await db.prepare(`SELECT * FROM media_outreach_contacts WHERE mail_code=?`).bind(clean(data.mailCode)).first();
    if(!row)return json({ok:false,error:'contact_not_found'},404);
    const campaign={...(await readCampaign(env)),...(data.campaign||{})};return json({ok:true,contact:contactFromRow(row),message:composeMessage(row,campaign)});
  }
  if(request.method==='POST'&&path===`${API_PREFIX}/send-one`){
    const data=await parseJson(request),db=await ensureSchema(env),row=await db.prepare(`SELECT * FROM media_outreach_contacts WHERE mail_code=?`).bind(clean(data.mailCode)).first();
    if(!row)return json({ok:false,error:'contact_not_found'},404);
    if(!row.email)return json({ok:false,error:'verified_email_missing'},409);
    if(!row.automation_allowed)return json({ok:false,error:'automation_not_allowed'},409);
    if(!row.approved)return json({ok:false,error:'contact_not_approved'},409);
    if(await db.prepare(`SELECT email FROM media_suppressions WHERE email=?`).bind(row.email.toLowerCase()).first())return json({ok:false,error:'suppressed'},409);
    const rate=await rateAllowed(env);if(!rate.ok)return json({ok:false,error:'rate_limit',rate},429);
    const campaign={...(await readCampaign(env)),...(data.campaign||{})},message=composeMessage(row,campaign),live=boolEnv(env.MEDIA_OUTREACH_LIVE,false)&&data.live===true;
    if(live)await sendEmail(env,row.email,message.subject,message.text,campaign);
    await db.prepare(`UPDATE media_outreach_contacts SET sent_status=?,updated_at=? WHERE mail_code=?`).bind(live?'POSLANO':'DRY-RUN',now(),row.mail_code).run();
    await event(env,'message_sent',{mailCode:row.mail_code,outlet:row.outlet,email:row.email,detail:{live,subject:message.subject}});
    return json({ok:true,live,message,rate});
  }
  if(request.method==='GET'&&path===`${API_PREFIX}/applications`)return json({ok:true,applications:await listApplications(env,url)});
  if(request.method==='POST'&&path===`${API_PREFIX}/application-decision`){
    const data=await parseJson(request),decision=clean(data.decision).toUpperCase(),allowed=new Set(['PENDING','REQUEST_MORE_INFORMATION','VERIFIED','APPROVED','REJECTED']);
    if(!allowed.has(decision))return json({ok:false,error:'invalid_decision'},400);
    const db=await ensureSchema(env),stamp=now();
    const result=await db.prepare(`UPDATE media_applications SET human_decision=?,decision_reason=?,decided_by=?,decided_at=?,updated_at=? WHERE application_id=?`).bind(decision,clean(data.reason),clean(data.decidedBy)||'ADMIN',stamp,stamp,clean(data.applicationId)).run();
    await event(env,'application_decision',{applicationId:clean(data.applicationId),detail:{decision,reason:clean(data.reason),decidedBy:clean(data.decidedBy)||'ADMIN'}});
    return json({ok:true,changed:result.meta?.changes||0,decision});
  }
  if(request.method==='POST'&&path===`${API_PREFIX}/suppress`){
    const data=await parseJson(request),email=clean(data.email).toLowerCase();if(!validEmail(email))return json({ok:false,error:'invalid_email'},400);
    const db=await ensureSchema(env);await db.prepare(`INSERT INTO media_suppressions(email,reason,created_at) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET reason=excluded.reason`).bind(email,clean(data.reason)||'manual',now()).run();
    await event(env,'suppression_added',{email,detail:{reason:clean(data.reason)||'manual'}});return json({ok:true,email});
  }
  return json({ok:false,error:'not_found'},404);
}

async function storeInboundDocuments(env,applicationId,attachments){
  const db=await ensureSchema(env),bucket=bucketOf(env),saved=[];
  for(const item of attachments){
    const category=documentCategory(item.filename),filename=safeFilename(item.filename),mime=clean(item.mimeType)||'application/octet-stream';
    const id=crypto.randomUUID(),created=now();
    if(category==='passport_rejected'){
      await db.prepare(`INSERT INTO media_application_documents(id,application_id,category,filename,mime_type,size_bytes,sha256,r2_key,rejected,rejection_reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(id,applicationId,category,filename,mime,item.bytes.length,'','',1,'Passport copy is not accepted by ordinary email at the initial stage',created).run();
      saved.push({id,category,filename,mimeType:mime,sizeBytes:item.bytes.length,rejected:true,rejectionReason:'passport_copy_rejected'});continue;
    }
    if(item.bytes.length>15*1024*1024){
      await db.prepare(`INSERT INTO media_application_documents(id,application_id,category,filename,mime_type,size_bytes,sha256,r2_key,rejected,rejection_reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(id,applicationId,category,filename,mime,item.bytes.length,'','',1,'Attachment exceeds 15 MB',created).run();
      saved.push({id,category,filename,mimeType:mime,sizeBytes:item.bytes.length,rejected:true,rejectionReason:'size_limit'});continue;
    }
    const hash=await sha256(item.bytes),key=`media-applications/${applicationId}/documents/${id}-${filename}`;
    if(bucket)await bucket.put(key,item.bytes,{httpMetadata:{contentType:mime},customMetadata:{applicationId,category,sha256:hash}});
    await db.prepare(`INSERT INTO media_application_documents(id,application_id,category,filename,mime_type,size_bytes,sha256,r2_key,rejected,rejection_reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(id,applicationId,category,filename,mime,item.bytes.length,hash,bucket?key:'',0,'',created).run();
    saved.push({id,category,filename,mimeType:mime,sizeBytes:item.bytes.length,sha256:hash,r2Key:bucket?key:'',rejected:false});
  }
  return saved;
}
function acknowledgement(app,triage,applicationId,env){
  const incomplete=triage.status==='INCOMPLETE';
  const late=triage.status==='LATE';
  const missing=[...triage.missingFields,...triage.invalidFields.map(x=>`invalid:${x}`),...triage.missingDocuments.map(x=>`document:${x}`)];
  const subject=`[${applicationId}] Prijava zaprimljena / Application received – ${app.outlet_name||'media application'}`;
  const text=[
    `Poštovani / Dear ${app.applicant_name||'Applicant'},`,'',
    `Vaša prijava zaprimljena je pod šifrom ${applicationId}. / Your application has been received under code ${applicationId}.`,
    `Izvorna šifra poziva / Original invitation code: ${app.invitation_code||'nije prepoznata / not identified'}.`,'',
    late?'Prijava je zaprimljena nakon roka 20. srpnja 2026. u 23:59 CEST. / The application was received after the deadline of 20 July 2026 at 23:59 CEST.':
    incomplete?`Prijava nije potpuna. Nedostaje ili nije valjano / Missing or invalid: ${missing.join(', ')}.`:
    'Prijava je upućena na ljudsku provjeru. Ova poruka nije potvrda odobrenja. / The application has entered human verification. This message is not an approval.','',
    'Smještaj u New Yorku već je rezerviran i plaćen. / Accommodation in New York has already been reserved and paid.',
    'Troškove puta, smještaja i ostale opravdane, dokumentirane i unaprijed odobrene troškove snosi organizator – medijska agencija u sklopu grupacije GNK ASG. / Travel, accommodation and other reasonable, documented and pre-approved costs are covered by the organizer, a media agency within the GNK ASG group.','',
    `U daljnjoj komunikaciji navedite obje šifre: ${applicationId} i ${app.invitation_code||'[invitation code]'}. / Quote both codes in all further correspondence.`,'',
    'GNK ASG Media Relations',clean(env.MEDIA_OUTREACH_FROM)||FROM_DEFAULT
  ].join('\n');
  return{subject,text};
}

export async function handleMediaCommandCenterEmail(message,env,ctx){
  const to=clean(message.to).toLowerCase();
  if(to!==(clean(env.MEDIA_OUTREACH_FROM)||FROM_DEFAULT).toLowerCase())return false;
  const subject=clean(message.headers?.get?.('subject')||'');
  const from=clean(message.from||message.headers?.get?.('from')||'');
  const rawBuffer=await new Response(message.raw).arrayBuffer();
  const rawText=dec.decode(rawBuffer);
  const parsed=parseMime(rawText);
  const plain=parsed.texts.find(x=>x.type==='text/plain')?.value||htmlToText(parsed.texts.find(x=>x.type==='text/html')?.value||'');
  const fields=extractFields(plain),applicationId=makeApplicationId(),receivedAt=now(),invitationCode=extractCode(`${subject}\n${plain}`);
  const db=await ensureSchema(env),bucket=bucketOf(env);
  let rawKey='';
  if(bucket){rawKey=`media-applications/${applicationId}/raw/message.eml`;await bucket.put(rawKey,rawBuffer,{httpMetadata:{contentType:'message/rfc822'},customMetadata:{applicationId,sourceFrom:from}});}
  const documents=await storeInboundDocuments(env,applicationId,parsed.attachments);
  const app={
    invitation_code:invitationCode,outlet_name:fields.outlet_name||'',outlet_country:fields.outlet_country||'',outlet_website:fields.outlet_website||'',
    applicant_name:fields.applicant_name||'',applicant_role:fields.applicant_role||'',applicant_email:fields.applicant_email||from,applicant_mobile:fields.applicant_mobile||'',
    editor_name:fields.editor_name||'',editor_role:fields.editor_role||'',editor_email:fields.editor_email||'',editor_mobile:fields.editor_mobile||'',
    declaration:fields.declaration||'',departure_city:fields.departure_city||'',preferred_airport:fields.preferred_airport||'',travel_dates:fields.travel_dates||'',other_costs:fields.other_costs||''
  };
  const triage=applicationStatus(app,documents,receivedAt,env),stamp=now();
  await db.prepare(`INSERT INTO media_applications(application_id,invitation_code,received_at,source_message_id,source_from,source_subject,outlet_name,outlet_country,outlet_website,applicant_name,applicant_role,applicant_email,applicant_mobile,editor_name,editor_role,editor_email,editor_mobile,declaration,departure_city,preferred_airport,travel_dates,other_costs,status,score,missing_json,domain_match,raw_r2_key,human_decision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(applicationId,invitationCode,receivedAt,clean(message.headers?.get?.('message-id')),from,subject,app.outlet_name,app.outlet_country,app.outlet_website,app.applicant_name,app.applicant_role,app.applicant_email,app.applicant_mobile,app.editor_name,app.editor_role,app.editor_email,app.editor_mobile,app.declaration,app.departure_city,app.preferred_airport,app.travel_dates,app.other_costs,triage.status,triage.score,JSON.stringify({missingFields:triage.missingFields,invalidFields:triage.invalidFields,missingDocuments:triage.missingDocuments}),triage.domainsMatch?1:0,rawKey,'PENDING',stamp,stamp).run();
  await event(env,'application_received',{mailCode:invitationCode,applicationId,outlet:app.outlet_name,email:app.applicant_email,detail:{status:triage.status,score:triage.score,documentCount:documents.length}});
  if(boolEnv(env.MEDIA_APPLICATION_AUTO_ACK,true)&&validEmail(app.applicant_email)){
    const ack=acknowledgement(app,triage,applicationId,env);
    try{
      const raw=await buildRawEmail(env,app.applicant_email,ack.subject,ack.text,{pdfR2Key:''});
      if(typeof message.reply==='function')await message.reply(new EmailMessage(clean(env.MEDIA_OUTREACH_FROM)||FROM_DEFAULT,app.applicant_email,raw));
      else await env.EMAIL?.send?.(new EmailMessage(clean(env.MEDIA_OUTREACH_FROM)||FROM_DEFAULT,app.applicant_email,raw));
      await event(env,'application_ack_sent',{mailCode:invitationCode,applicationId,email:app.applicant_email,detail:{status:triage.status}});
    }catch(error){await event(env,'application_ack_failed',{mailCode:invitationCode,applicationId,email:app.applicant_email,detail:{error:String(error?.message||error)}});}
  }
  return true;
}
