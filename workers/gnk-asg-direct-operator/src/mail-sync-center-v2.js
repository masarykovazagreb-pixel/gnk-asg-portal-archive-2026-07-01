import * as base from './mail-sync-center-v1.js';

export const VERSION=`GNK_ASG_MAIL_SYNC_CENTER_V3_20260704_WEBMAIL_${base.VERSION}`;
export const UI_PATH=base.UI_PATH;
export const API_PREFIX=base.API_PREFIX;
export const prepareMailSyncInbound=base.prepareMailSyncInbound;
export const recordMailSyncOutbound=base.recordMailSyncOutbound;
export const RETENTION_POLICY=Object.freeze({policyVersion:'2026-07-04.review.2',messageContentDays:365,attachmentDays:365,operationalMetadataDays:2555,legalHoldOverridesDeletion:true,automaticDeletion:'disabled-until-explicit-approval',reviewOnly:true});

const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const clamp=(value,min,max,fallback)=>{const number=Number(value);return Number.isFinite(number)?Math.min(max,Math.max(min,Math.trunc(number))):fallback;};
const pathOf=request=>new URL(request.url).pathname.replace(/\/+$/,'')||'/';
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate, max-age=0','x-content-type-options':'nosniff','x-gnk-asg-mail-sync':VERSION}});
const PROFILE_BY_EMAIL={'office@gnk-asg.hr':'office','legal@gnk-asg.hr':'legal','media@gnk-asg.hr':'media','press@gnk-asg.hr':'press','it@gnk-asg.hr':'it','assistant@gnk-asg.hr':'assistant','nermin.sefic@gnk-asg.hr':'director','sefic@gnk-asg.hr':'sefic','ubo@gnk-asg.hr':'ubo'};
const OUTBOX_STATUSES=['QUEUED','PENDING','SCHEDULED','RETRY','FAILED','PARTIAL'];

function parseJson(value,fallback=[]){try{return JSON.parse(value||'[]');}catch{return fallback;}}
function addressList(value){if(Array.isArray(value))return value;return String(value||'').split(/[;,]+/).map(email=>clean(email).toLowerCase()).filter(Boolean).map(email=>({email,name:''}));}
function publicRow(row){return{id:row.id,direction:row.direction,folder:row.folder||'',profileId:row.profile_id,mailboxEmail:row.mailbox_email,threadId:row.thread_id,messageId:row.message_id,providerMessageId:row.provider_message_id,fromEmail:row.from_email,fromName:row.from_name,to:parseJson(row.to_json),cc:parseJson(row.cc_json),subject:row.subject,textPreview:clean(row.text_body).slice(0,280),hasContent:Boolean(clean(row.text_body)||clean(row.html_body)),bodyTruncated:Boolean(row.body_truncated),attachmentCount:Number(row.attachment_count||0),status:row.status,processingStatus:row.processing_status,isRead:Boolean(row.is_read),isArchived:(row.folder||'')==='archive'||Boolean(row.is_archived),isStarred:Boolean(row.is_starred),labels:parseJson(row.labels_json),sentAt:row.sent_at,receivedAt:row.received_at,createdAt:row.created_at,updatedAt:row.updated_at,displayTime:row.received_at||row.sent_at||row.created_at||row.updated_at};}

export async function ensureMailSyncSchema(env){
 const db=await base.ensureMailSyncSchema(env);
 for(const sql of [
  `ALTER TABLE mail_sync_messages ADD COLUMN folder TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE mail_sync_messages ADD COLUMN is_starred INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE mail_sync_messages ADD COLUMN labels_json TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE mail_sync_messages ADD COLUMN deleted_at TEXT`,
  `ALTER TABLE mail_sync_messages ADD COLUMN spam_reason TEXT`
 ]){try{await db.prepare(sql).run();}catch{}}
 await db.batch([
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_mail_sync_webmail_folder ON mail_sync_messages(folder,direction,COALESCE(received_at,sent_at,created_at) DESC)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS mail_sync_drafts(id TEXT PRIMARY KEY,profile_id TEXT,from_email TEXT,from_name TEXT,to_json TEXT NOT NULL DEFAULT '[]',cc_json TEXT NOT NULL DEFAULT '[]',bcc_json TEXT NOT NULL DEFAULT '[]',subject TEXT,text_body TEXT,html_body TEXT,attachment_json TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`),
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_mail_sync_drafts_updated ON mail_sync_drafts(updated_at DESC)`)
 ]);
 return db;
}

function addFolderClause(folder,clauses){
 const active=`COALESCE(folder,'')=''`;
 if(folder==='inbox')clauses.push(`direction='INBOUND' AND ${active}`);
 else if(folder==='sent')clauses.push(`direction='OUTBOUND' AND ${active} AND UPPER(COALESCE(status,'')) NOT IN (${OUTBOX_STATUSES.map(()=>'?').join(',')})`);
 else if(folder==='outbox')clauses.push(`direction='OUTBOUND' AND ${active} AND UPPER(COALESCE(status,'')) IN (${OUTBOX_STATUSES.map(()=>'?').join(',')})`);
 else if(folder==='unread')clauses.push(`direction='INBOUND' AND is_read=0 AND ${active}`);
 else if(folder==='archive')clauses.push(`COALESCE(folder,'')='archive'`);
 else if(folder==='spam')clauses.push(`COALESCE(folder,'')='spam'`);
 else if(folder==='trash')clauses.push(`COALESCE(folder,'')='trash'`);
 else if(folder==='starred')clauses.push(`is_starred=1 AND COALESCE(folder,'')<>'trash'`);
 else clauses.push(`COALESCE(folder,'')<>'trash'`);
}

function folderStatusBinds(folder){return folder==='sent'||folder==='outbox'?[...OUTBOX_STATUSES]:[];}

async function folderStats(db){
 const row=await db.prepare(`SELECT
  SUM(CASE WHEN direction='INBOUND' AND COALESCE(folder,'')='' THEN 1 ELSE 0 END) inbox,
  SUM(CASE WHEN direction='INBOUND' AND is_read=0 AND COALESCE(folder,'')='' THEN 1 ELSE 0 END) unread,
  SUM(CASE WHEN direction='OUTBOUND' AND COALESCE(folder,'')='' AND UPPER(COALESCE(status,'')) NOT IN ('QUEUED','PENDING','SCHEDULED','RETRY','FAILED','PARTIAL') THEN 1 ELSE 0 END) sent,
  SUM(CASE WHEN direction='OUTBOUND' AND COALESCE(folder,'')='' AND UPPER(COALESCE(status,'')) IN ('QUEUED','PENDING','SCHEDULED','RETRY','FAILED','PARTIAL') THEN 1 ELSE 0 END) outbox,
  SUM(CASE WHEN COALESCE(folder,'')='archive' THEN 1 ELSE 0 END) archive,
  SUM(CASE WHEN COALESCE(folder,'')='spam' THEN 1 ELSE 0 END) spam,
  SUM(CASE WHEN COALESCE(folder,'')='trash' THEN 1 ELSE 0 END) trash,
  SUM(CASE WHEN is_starred=1 AND COALESCE(folder,'')<>'trash' THEN 1 ELSE 0 END) starred
 FROM mail_sync_messages`).first();
 const drafts=await db.prepare(`SELECT COUNT(*) count FROM mail_sync_drafts`).first();
 return{inbox:Number(row?.inbox||0),unread:Number(row?.unread||0),sent:Number(row?.sent||0),outbox:Number(row?.outbox||0),drafts:Number(drafts?.count||0),archive:Number(row?.archive||0),spam:Number(row?.spam||0),trash:Number(row?.trash||0),starred:Number(row?.starred||0)};
}

async function listMessages(request,env){
 const db=await ensureMailSyncSchema(env),url=new URL(request.url),folder=clean(url.searchParams.get('folder')||'inbox').toLowerCase(),profile=clean(url.searchParams.get('profile')).toLowerCase(),search=clean(url.searchParams.get('search')).toLowerCase().slice(0,150),limit=clamp(url.searchParams.get('limit'),10,200,50),offset=clamp(url.searchParams.get('offset'),0,100000,0),clauses=[],binds=[];
 addFolderClause(folder,clauses);binds.push(...folderStatusBinds(folder));
 if(profile){clauses.push('profile_id=?');binds.push(profile);}
 if(search){const term=`%${search}%`;clauses.push(`(LOWER(COALESCE(subject,'')) LIKE ? OR LOWER(COALESCE(from_email,'')) LIKE ? OR LOWER(COALESCE(to_json,'')) LIKE ? OR LOWER(COALESCE(text_body,'')) LIKE ?)`);binds.push(term,term,term,term);}
 const where=`WHERE ${clauses.join(' AND ')}`;
 const [rows,total,folders,state]=await Promise.all([
  db.prepare(`SELECT * FROM mail_sync_messages ${where} ORDER BY datetime(COALESCE(received_at,sent_at,created_at)) DESC LIMIT ? OFFSET ?`).bind(...binds,limit,offset).all(),
  db.prepare(`SELECT COUNT(*) count FROM mail_sync_messages ${where}`).bind(...binds).first(),folderStats(db),
  db.prepare(`SELECT * FROM mail_sync_state WHERE id=1`).first()
 ]);
 return json({ok:true,version:VERSION,folder,profile,search,total:Number(total?.count||0),limit,offset,items:(rows.results||[]).map(publicRow),folders,sync:state,profiles:PROFILE_BY_EMAIL});
}

async function messageDetail(request,env){
 const db=await ensureMailSyncSchema(env),id=clean(new URL(request.url).searchParams.get('id'));
 if(!id)return json({ok:false,error:'message_id_required'},400);
 const row=await db.prepare(`SELECT * FROM mail_sync_messages WHERE id=?`).bind(id).first();
 if(!row)return json({ok:false,error:'message_not_found'},404);
 const [thread,attachments]=await Promise.all([
  db.prepare(`SELECT * FROM mail_sync_messages WHERE thread_id=? ORDER BY datetime(COALESCE(received_at,sent_at,created_at)) ASC`).bind(row.thread_id).all(),
  db.prepare(`SELECT id,filename,mime_type,size_bytes,storage_status,r2_key,created_at FROM mail_sync_attachments WHERE message_id=? ORDER BY created_at`).bind(id).all()
 ]);
 return json({ok:true,version:VERSION,message:{...publicRow(row),textBody:row.text_body||'',htmlBody:row.html_body||'',bcc:parseJson(row.bcc_json),references:parseJson(row.references_json),inReplyTo:row.in_reply_to,sourceSystem:row.source_system,sourceId:row.source_id,spamReason:row.spam_reason||''},thread:(thread.results||[]).map(publicRow),attachments:(attachments.results||[]).map(item=>({...item,downloadable:Boolean(item.r2_key&&item.storage_status==='STORED')}))});
}

async function updateState(request,env){
 let body={};try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
 const id=clean(body.id),action=clean(body.action).toLowerCase();
 if(!id||!['read','unread','archive','restore','spam','trash','star','unstar'].includes(action))return json({ok:false,error:'invalid_action'},400);
 const db=await ensureMailSyncSchema(env),stamp=now();
 let result;
 if(action==='read')result=await db.prepare(`UPDATE mail_sync_messages SET is_read=1,updated_at=? WHERE id=?`).bind(stamp,id).run();
 else if(action==='unread')result=await db.prepare(`UPDATE mail_sync_messages SET is_read=0,updated_at=? WHERE id=?`).bind(stamp,id).run();
 else if(action==='archive')result=await db.prepare(`UPDATE mail_sync_messages SET folder='archive',is_archived=1,updated_at=? WHERE id=?`).bind(stamp,id).run();
 else if(action==='restore')result=await db.prepare(`UPDATE mail_sync_messages SET folder='',is_archived=0,deleted_at=NULL,spam_reason=NULL,updated_at=? WHERE id=?`).bind(stamp,id).run();
 else if(action==='spam')result=await db.prepare(`UPDATE mail_sync_messages SET folder='spam',spam_reason=?,updated_at=? WHERE id=?`).bind(clean(body.reason)||'marked_by_operator',stamp,id).run();
 else if(action==='trash')result=await db.prepare(`UPDATE mail_sync_messages SET folder='trash',deleted_at=?,updated_at=? WHERE id=?`).bind(stamp,stamp,id).run();
 else if(action==='star')result=await db.prepare(`UPDATE mail_sync_messages SET is_starred=1,updated_at=? WHERE id=?`).bind(stamp,id).run();
 else result=await db.prepare(`UPDATE mail_sync_messages SET is_starred=0,updated_at=? WHERE id=?`).bind(stamp,id).run();
 return json({ok:true,changed:Number(result.meta?.changes||0),id,action,folders:await folderStats(db)});
}

function draftRow(row){return{id:row.id,direction:'DRAFT',folder:'drafts',profileId:row.profile_id,fromEmail:row.from_email,fromName:row.from_name,to:parseJson(row.to_json),cc:parseJson(row.cc_json),bcc:parseJson(row.bcc_json),subject:row.subject,textBody:row.text_body||'',htmlBody:row.html_body||'',textPreview:clean(row.text_body).slice(0,280),attachments:parseJson(row.attachment_json),createdAt:row.created_at,updatedAt:row.updated_at,displayTime:row.updated_at};}

async function drafts(request,env){
 const db=await ensureMailSyncSchema(env),url=new URL(request.url);
 if(request.method==='GET'){
  const id=clean(url.searchParams.get('id'));
  if(id){const row=await db.prepare(`SELECT * FROM mail_sync_drafts WHERE id=?`).bind(id).first();return row?json({ok:true,draft:draftRow(row)}):json({ok:false,error:'draft_not_found'},404);}
  const search=clean(url.searchParams.get('search')).toLowerCase().slice(0,150),limit=clamp(url.searchParams.get('limit'),10,200,50),offset=clamp(url.searchParams.get('offset'),0,100000,0),where=search?`WHERE LOWER(COALESCE(subject,'')||' '||COALESCE(to_json,'')||' '||COALESCE(text_body,'')) LIKE ?`:'',binds=search?[`%${search}%`]:[];
  const [rows,total,folders]=await Promise.all([db.prepare(`SELECT * FROM mail_sync_drafts ${where} ORDER BY datetime(updated_at) DESC LIMIT ? OFFSET ?`).bind(...binds,limit,offset).all(),db.prepare(`SELECT COUNT(*) count FROM mail_sync_drafts ${where}`).bind(...binds).first(),folderStats(db)]);
  return json({ok:true,total:Number(total?.count||0),limit,offset,items:(rows.results||[]).map(draftRow),folders});
 }
 if(request.method==='POST'){
  let body={};try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
  const id=clean(body.id)||`draft:${crypto.randomUUID()}`,stamp=now(),profileId=clean(body.profileId||body.profile),fromEmail=clean(body.fromEmail||body.from).toLowerCase(),fromName=clean(body.fromName),to=addressList(body.to),cc=addressList(body.cc),bcc=addressList(body.bcc),subject=clean(body.subject).slice(0,1000),textBody=String(body.textBody||body.text||'').slice(0,120000),htmlBody=String(body.htmlBody||body.html||'').slice(0,220000),attachments=Array.isArray(body.attachments)?body.attachments.slice(0,8).map(item=>({filename:clean(item.filename||item.name),sizeBytes:Number(item.sizeBytes||0),type:clean(item.type||'application/pdf')})):[];
  await db.prepare(`INSERT INTO mail_sync_drafts(id,profile_id,from_email,from_name,to_json,cc_json,bcc_json,subject,text_body,html_body,attachment_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET profile_id=excluded.profile_id,from_email=excluded.from_email,from_name=excluded.from_name,to_json=excluded.to_json,cc_json=excluded.cc_json,bcc_json=excluded.bcc_json,subject=excluded.subject,text_body=excluded.text_body,html_body=excluded.html_body,attachment_json=excluded.attachment_json,updated_at=excluded.updated_at`).bind(id,profileId,fromEmail,fromName,JSON.stringify(to),JSON.stringify(cc),JSON.stringify(bcc),subject,textBody,htmlBody,JSON.stringify(attachments),stamp,stamp).run();
  const row=await db.prepare(`SELECT * FROM mail_sync_drafts WHERE id=?`).bind(id).first();return json({ok:true,draft:draftRow(row),folders:await folderStats(db)});
 }
 if(request.method==='DELETE'){
  const id=clean(url.searchParams.get('id'));if(!id)return json({ok:false,error:'draft_id_required'},400);const result=await db.prepare(`DELETE FROM mail_sync_drafts WHERE id=?`).bind(id).run();return json({ok:true,deleted:Number(result.meta?.changes||0),id,folders:await folderStats(db)});
 }
 return json({ok:false,error:'method_not_allowed'},405);
}

async function health(env){const db=await ensureMailSyncSchema(env),[state,counts,folders]=await Promise.all([db.prepare(`SELECT * FROM mail_sync_state WHERE id=1`).first(),db.prepare(`SELECT direction,processing_status,COUNT(*) count FROM mail_sync_messages GROUP BY direction,processing_status`).all(),folderStats(db)]);return json({ok:true,version:VERSION,mode:'worker-native',futureMail:'automatic',historicalMail:'metadata-backfill-plus-optional-external-connector',fullMailboxMirror:false,retention:RETENTION_POLICY,state,counts:counts.results||[],folders,bindings:{d1:Boolean(env?.GNK_ASG_D1),r2:Boolean(env?.GNK_ASG_MEDIA_ASSETS)}});}

export async function backfillMailSync(env){return base.backfillMailSync(env);}
export async function handleMailSyncCenter(request,env){
 const path=pathOf(request);
 if(path===`${API_PREFIX}/messages`&&request.method==='GET')return listMessages(request,env);
 if(path===`${API_PREFIX}/message`&&request.method==='GET')return messageDetail(request,env);
 if(path===`${API_PREFIX}/state`&&request.method==='POST')return updateState(request,env);
 if(path===`${API_PREFIX}/drafts`)return drafts(request,env);
 if(path===`${API_PREFIX}/folders`&&request.method==='GET'){const db=await ensureMailSyncSchema(env);return json({ok:true,folders:await folderStats(db)});}
 if(path===`${API_PREFIX}/backfill`&&request.method==='POST')return json(await backfillMailSync(env));
 if(path===`${API_PREFIX}/health`&&request.method==='GET')return health(env);
 return null;
}
