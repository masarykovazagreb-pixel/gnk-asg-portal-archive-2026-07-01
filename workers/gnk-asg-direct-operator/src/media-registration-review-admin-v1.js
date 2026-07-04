export const VERSION='GNK_ASG_MEDIA_APPLICATIONS_REVIEW_V1_20260704';
export const ADMIN_API='/api/media-registration-admin';

const clean=value=>String(value??'').trim();
const dbOf=env=>env?.GNK_ASG_D1||null;
const bucketOf=env=>env?.GNK_ASG_MEDIA_ASSETS||null;
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate, max-age=0','x-content-type-options':'nosniff','x-gnk-asg-media-review':VERSION}});
const validCode=value=>/^GNK-MEDIA-\d{8}-[A-Z]{2}-[A-Z0-9]{1,12}-\d{3}$/i.test(clean(value));
const safeInteger=(value,min,max,fallback)=>{const parsed=Number.parseInt(value,10);return Number.isFinite(parsed)?Math.min(max,Math.max(min,parsed)):fallback;};
const safeFilename=value=>clean(value).replace(/["\r\n\\/]+/g,'_').slice(0,180)||'media-document';

async function ensureSchema(env){
  const db=dbOf(env);
  if(!db?.prepare)throw new Error('GNK_ASG_D1 binding missing');
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS media_invitation_access(mail_code TEXT PRIMARY KEY,outlet TEXT NOT NULL,email TEXT NOT NULL,recipient_name TEXT,recipient_title TEXT,country TEXT,language TEXT,pin_hash TEXT NOT NULL,pin_cipher TEXT,pin_iv TEXT,issued_at TEXT NOT NULL,expires_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'ACTIVE',mail_status TEXT NOT NULL DEFAULT 'QUEUED',queued_at TEXT NOT NULL,start_after TEXT,sent_at TEXT,provider_message_id TEXT,last_error TEXT,updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_registration_drafts(mail_code TEXT PRIMARY KEY,application_id TEXT,status TEXT NOT NULL DEFAULT 'DRAFT',revision INTEGER NOT NULL DEFAULT 1,data_json TEXT NOT NULL DEFAULT '{}',submitted_at TEXT,approved_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_registration_documents(id TEXT PRIMARY KEY,mail_code TEXT NOT NULL,category TEXT NOT NULL,filename TEXT NOT NULL,mime_type TEXT,size_bytes INTEGER,sha256 TEXT,r2_key TEXT,created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_registration_audit(id TEXT PRIMARY KEY,event_type TEXT NOT NULL,mail_code TEXT,detail_json TEXT,created_at TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_media_registration_status ON media_registration_drafts(status,updated_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_media_registration_documents_code ON media_registration_documents(mail_code,created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_media_registration_audit_code ON media_registration_audit(mail_code,created_at)`)
  ]);
  return db;
}
function parseJson(value,fallback={}){try{return JSON.parse(value||'{}');}catch{return fallback;}}
function participantCount(data){return Array.isArray(data?.participants)?data.participants.length:0;}
function completionScore(data){
  const newsroom=data?.newsroom||{},travel=data?.travel||{},hotel=data?.hotel||{},programme=data?.programme||{},declarations=data?.declarations||{};
  const checks=[newsroom.legalName,newsroom.country,newsroom.website,newsroom.editorName,newsroom.editorEmail,newsroom.editorPhone,participantCount(data)>0,travel.bookingMethod,travel.departureCity,travel.preferredAirport,hotel.roomType,hotel.checkIn,hotel.checkOut,declarations.newsroomAuthorization,declarations.costPolicy,declarations.privacyConsent,declarations.accuracy,programme.mainPresentation!==undefined];
  return Math.round(checks.filter(Boolean).length/checks.length*100);
}
function publicListRow(row){
  const data=parseJson(row.data_json,{}),newsroom=data.newsroom||{};
  return{
    mailCode:row.mail_code,
    applicationId:row.application_id||'',
    status:row.status||'DRAFT',
    revision:Number(row.revision||1),
    submittedAt:row.submitted_at||'',
    approvedAt:row.approved_at||'',
    updatedAt:row.updated_at||'',
    createdAt:row.created_at||'',
    outlet:row.outlet||newsroom.legalName||'',
    brandName:newsroom.brandName||'',
    country:row.country||newsroom.country||'',
    email:row.email||newsroom.editorEmail||'',
    editorName:newsroom.editorName||'',
    participants:participantCount(data),
    completionScore:completionScore(data),
    documentCount:Number(row.document_count||0)
  };
}
async function applications(request,env){
  const db=await ensureSchema(env),url=new URL(request.url);
  const query=clean(url.searchParams.get('query')).slice(0,120);
  const status=clean(url.searchParams.get('status')).toUpperCase().slice(0,40);
  const country=clean(url.searchParams.get('country')).slice(0,100);
  const page=safeInteger(url.searchParams.get('page'),1,100000,1);
  const pageSize=safeInteger(url.searchParams.get('pageSize'),10,100,50);
  const clauses=[],binds=[];
  if(query){clauses.push(`(LOWER(a.outlet) LIKE ? OR LOWER(a.email) LIKE ? OR LOWER(a.mail_code) LIKE ? OR LOWER(COALESCE(d.application_id,'')) LIKE ? OR LOWER(a.country) LIKE ?)`);const like=`%${query.toLowerCase()}%`;binds.push(like,like,like,like,like);}
  if(status){clauses.push('UPPER(d.status)=?');binds.push(status);}
  if(country){clauses.push('a.country=?');binds.push(country);}
  const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:'';
  const countRow=await db.prepare(`SELECT COUNT(*) total FROM media_registration_drafts d JOIN media_invitation_access a ON a.mail_code=d.mail_code ${where}`).bind(...binds).first();
  const rows=(await db.prepare(`SELECT d.mail_code,d.application_id,d.status,d.revision,d.data_json,d.submitted_at,d.approved_at,d.created_at,d.updated_at,a.outlet,a.email,a.country,(SELECT COUNT(*) FROM media_registration_documents x WHERE x.mail_code=d.mail_code) document_count FROM media_registration_drafts d JOIN media_invitation_access a ON a.mail_code=d.mail_code ${where} ORDER BY CASE d.status WHEN 'SUBMITTED' THEN 0 WHEN 'NEEDS_INFORMATION' THEN 1 WHEN 'NEEDS_TRAVEL_DOCUMENTS' THEN 2 WHEN 'APPROVED' THEN 3 WHEN 'TRAVEL_CONFIRMED' THEN 4 WHEN 'DRAFT' THEN 5 ELSE 6 END,d.updated_at DESC LIMIT ? OFFSET ?`).bind(...binds,pageSize,(page-1)*pageSize).all()).results||[];
  const summaries=(await db.prepare(`SELECT status,COUNT(*) count FROM media_registration_drafts GROUP BY status ORDER BY status`).all()).results||[];
  const countries=(await db.prepare(`SELECT DISTINCT country FROM media_invitation_access WHERE country<>'' ORDER BY country`).all()).results||[];
  const total=Number(countRow?.total||0);
  return json({ok:true,version:VERSION,items:rows.map(publicListRow),pagination:{page,pageSize,total,pages:Math.max(1,Math.ceil(total/pageSize))},summary:Object.fromEntries(summaries.map(item=>[item.status,Number(item.count)])),countries:countries.map(item=>item.country),filters:{query,status,country},time:new Date().toISOString()});
}
async function application(request,env){
  const db=await ensureSchema(env),url=new URL(request.url),mailCode=clean(url.searchParams.get('mailCode')).toUpperCase();
  if(!validCode(mailCode))return json({ok:false,error:'invalid_mail_code'},400);
  const row=await db.prepare(`SELECT d.mail_code,d.application_id,d.status,d.revision,d.data_json,d.submitted_at,d.approved_at,d.created_at,d.updated_at,a.outlet,a.email,a.recipient_name,a.recipient_title,a.country,a.language,a.issued_at,a.expires_at,a.status access_status,a.mail_status,a.sent_at,a.provider_message_id,a.last_error FROM media_registration_drafts d JOIN media_invitation_access a ON a.mail_code=d.mail_code WHERE d.mail_code=?`).bind(mailCode).first();
  if(!row)return json({ok:false,error:'application_not_found'},404);
  const documents=(await db.prepare(`SELECT id,category,filename,mime_type,size_bytes,sha256,created_at FROM media_registration_documents WHERE mail_code=? ORDER BY created_at DESC`).bind(mailCode).all()).results||[];
  const auditRows=(await db.prepare(`SELECT id,event_type,detail_json,created_at FROM media_registration_audit WHERE mail_code=? ORDER BY created_at DESC LIMIT 200`).bind(mailCode).all()).results||[];
  const data=parseJson(row.data_json,{});
  return json({ok:true,version:VERSION,application:{...publicListRow({...row,document_count:documents.length}),recipientName:row.recipient_name||'',recipientTitle:row.recipient_title||'',language:row.language||'',issuedAt:row.issued_at||'',accessExpiresAt:row.expires_at||'',accessStatus:row.access_status||'',mailStatus:row.mail_status||'',sentAt:row.sent_at||'',providerMessageId:row.provider_message_id||'',lastError:row.last_error||'',data,documents:documents.map(item=>({...item,downloadUrl:`${ADMIN_API}/document?id=${encodeURIComponent(item.id)}`})),audit:auditRows.map(item=>({id:item.id,eventType:item.event_type,detail:parseJson(item.detail_json,{}),createdAt:item.created_at}))}});
}
async function documentDownload(request,env){
  const db=await ensureSchema(env),bucket=bucketOf(env),url=new URL(request.url),id=clean(url.searchParams.get('id'));
  if(!id||id.length>100)return json({ok:false,error:'invalid_document_id'},400);
  const row=await db.prepare(`SELECT id,mail_code,filename,mime_type,size_bytes,r2_key,sha256 FROM media_registration_documents WHERE id=?`).bind(id).first();
  if(!row)return json({ok:false,error:'document_not_found'},404);
  if(!bucket?.get)return json({ok:false,error:'document_storage_unavailable'},503);
  const object=await bucket.get(row.r2_key);
  if(!object)return json({ok:false,error:'document_object_missing'},404);
  const headers=new Headers({'content-type':clean(row.mime_type)||object.httpMetadata?.contentType||'application/octet-stream','content-disposition':`attachment; filename="${safeFilename(row.filename)}"`,'cache-control':'no-store','x-content-type-options':'nosniff','x-gnk-asg-media-review':VERSION});
  if(row.size_bytes||object.size)headers.set('content-length',String(row.size_bytes||object.size));
  if(row.sha256)headers.set('etag',`"sha256-${row.sha256}"`);
  return new Response(request.method==='HEAD'?null:object.body,{status:200,headers});
}
export async function handleMediaRegistrationReviewAdmin(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(request.method==='GET'&&path===`${ADMIN_API}/applications`)return applications(request,env);
  if(request.method==='GET'&&path===`${ADMIN_API}/application`)return application(request,env);
  if(['GET','HEAD'].includes(request.method)&&path===`${ADMIN_API}/document`)return documentDownload(request,env);
  return null;
}
export async function patchMediaRegistrationAdminPage(response){
  if(!response||!response.ok||!String(response.headers.get('content-type')||'').includes('text/html'))return response;
  let html=await response.text();
  const css='<link rel="stylesheet" href="/assets/media-applications-review-v1.css?v=20260704-1">';
  const script='<script defer src="/assets/media-applications-review-v1.js?v=20260704-1"></script>';
  if(!html.includes('media-applications-review-v1.css'))html=html.replace('</head>',`${css}</head>`);
  if(!html.includes('media-applications-review-v1.js'))html=html.replace('</body>',`${script}</body>`);
  const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');headers.set('x-robots-tag','noindex,nofollow,noarchive');headers.set('x-gnk-asg-media-review',VERSION);
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
