import {ensureEmailStatusSchema} from './email-status-tracking-v1.js';

export const VERSION='GNK_ASG_EMAIL_STATUS_OPERATIONS_V1_20260714_AUTOREPLY_AI_CENTRE_LOGO';

const clean=(value,max=1000)=>String(value??'').trim().slice(0,max);
const number=value=>Number(value)||0;
const now=()=>new Date().toISOString();
const COLUMNS=[
  'auto_reply_mode TEXT',
  'auto_reply_center TEXT',
  'auto_reply_center_country TEXT',
  'auto_reply_profile TEXT',
  'auto_reply_reference TEXT',
  'auto_reply_model TEXT',
  'auto_reply_logo_mode TEXT'
];

export async function ensureEmailStatusOperationalSchema(env){
  const db=await ensureEmailStatusSchema(env);
  for(const column of COLUMNS){
    try{await db.prepare(`ALTER TABLE email_status_records ADD COLUMN ${column}`).run();}catch{}
  }
  await db.prepare(`CREATE TABLE IF NOT EXISTS email_autoreply_audit(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    sender TEXT,
    recipient TEXT,
    subject TEXT,
    profile TEXT,
    reference TEXT,
    center TEXT,
    center_country TEXT,
    mode TEXT,
    model TEXT,
    logo_mode TEXT,
    skipped INTEGER NOT NULL DEFAULT 0,
    skip_reason TEXT,
    tracking_id TEXT,
    outcome TEXT,
    detail TEXT
  )`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_autoreply_created ON email_autoreply_audit(created_at DESC)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_autoreply_center ON email_autoreply_audit(center,created_at DESC)`).run();
  return db;
}

export async function annotateEmailStatusRecord(env,trackingId,metadata={}){
  if(!trackingId)return false;
  const db=await ensureEmailStatusOperationalSchema(env);
  await db.prepare(`UPDATE email_status_records SET
    auto_reply_mode=?,auto_reply_center=?,auto_reply_center_country=?,auto_reply_profile=?,
    auto_reply_reference=?,auto_reply_model=?,auto_reply_logo_mode=?,updated_at=?
    WHERE tracking_id=?`).bind(
      clean(metadata.mode,40),clean(metadata.center,100),clean(metadata.centerCountry,100),clean(metadata.profile,100),
      clean(metadata.reference,180),clean(metadata.model,180),clean(metadata.logoMode,40),now(),trackingId
    ).run();
  return true;
}

export async function recordAutoReplyAudit(env,item={}){
  const db=await ensureEmailStatusOperationalSchema(env);
  const stamp=clean(item.createdAt,60)||now();
  await db.prepare(`INSERT INTO email_autoreply_audit(
    created_at,sender,recipient,subject,profile,reference,center,center_country,mode,model,logo_mode,
    skipped,skip_reason,tracking_id,outcome,detail
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    stamp,clean(item.sender,320),clean(item.recipient,320),clean(item.subject,500),clean(item.profile,100),
    clean(item.reference,180),clean(item.center,100),clean(item.centerCountry,100),clean(item.mode,40),
    clean(item.model,180),clean(item.logoMode,40),item.skipped?1:0,clean(item.skipReason,200),
    clean(item.trackingId,100),clean(item.outcome,80),clean(item.detail,1200)
  ).run();
  return true;
}

export async function listAutoReplyAudit(request,env){
  const db=await ensureEmailStatusOperationalSchema(env),url=new URL(request.url);
  const limit=Math.min(300,Math.max(1,Math.trunc(number(url.searchParams.get('limit'))||100)));
  const offset=Math.min(100000,Math.max(0,Math.trunc(number(url.searchParams.get('offset')))));
  const search=clean(url.searchParams.get('search'),150).toLowerCase();
  const center=clean(url.searchParams.get('center'),100).toLowerCase();
  const mode=clean(url.searchParams.get('mode'),40).toLowerCase();
  const outcome=clean(url.searchParams.get('outcome'),80).toLowerCase();
  const skipped=clean(url.searchParams.get('skipped'),20).toLowerCase();
  const clauses=[],binds=[];
  if(search){const term=`%${search}%`;clauses.push(`(LOWER(COALESCE(sender,'')) LIKE ? OR LOWER(COALESCE(recipient,'')) LIKE ? OR LOWER(COALESCE(subject,'')) LIKE ? OR LOWER(COALESCE(reference,'')) LIKE ?)`);binds.push(term,term,term,term);}
  if(center){clauses.push(`LOWER(COALESCE(center,'')) LIKE ?`);binds.push(`%${center}%`);}
  if(mode&&mode!=='all'){clauses.push(`LOWER(COALESCE(mode,''))=?`);binds.push(mode);}
  if(outcome&&outcome!=='all'){clauses.push(`LOWER(COALESCE(outcome,''))=?`);binds.push(outcome);}
  if(skipped==='yes')clauses.push('skipped=1');
  if(skipped==='no')clauses.push('skipped=0');
  const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:'';
  const [rows,total,summary]=await Promise.all([
    db.prepare(`SELECT * FROM email_autoreply_audit ${where} ORDER BY datetime(created_at) DESC,id DESC LIMIT ? OFFSET ?`).bind(...binds,limit,offset).all(),
    db.prepare(`SELECT COUNT(*) count FROM email_autoreply_audit ${where}`).bind(...binds).first(),
    db.prepare(`SELECT LOWER(COALESCE(mode,'unknown')) mode,LOWER(COALESCE(outcome,'unknown')) outcome,skipped,COUNT(*) count FROM email_autoreply_audit ${where} GROUP BY mode,outcome,skipped`).bind(...binds).all()
  ]);
  return{ok:true,version:VERSION,total:number(total?.count),limit,offset,items:rows.results||[],summary:summary.results||[]};
}

export async function autoReplyHealth(env){
  const db=await ensureEmailStatusOperationalSchema(env);
  const [latest,counts]=await Promise.all([
    db.prepare(`SELECT created_at,center,mode,logo_mode,outcome,skip_reason FROM email_autoreply_audit ORDER BY datetime(created_at) DESC,id DESC LIMIT 1`).first(),
    db.prepare(`SELECT COUNT(*) total,SUM(CASE WHEN mode='ai' THEN 1 ELSE 0 END) ai,SUM(CASE WHEN mode='fallback' THEN 1 ELSE 0 END) fallback,SUM(CASE WHEN skipped=1 THEN 1 ELSE 0 END) skipped,SUM(CASE WHEN logo_mode='cid-inline' THEN 1 ELSE 0 END) cid_inline FROM email_autoreply_audit`).first()
  ]);
  return{latest,counts:{total:number(counts?.total),ai:number(counts?.ai),fallback:number(counts?.fallback),skipped:number(counts?.skipped),cidInline:number(counts?.cid_inline)}};
}
