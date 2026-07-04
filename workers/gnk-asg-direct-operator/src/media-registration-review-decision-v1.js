export const VERSION='GNK_ASG_MEDIA_REVIEW_DECISION_V1_20260704';
export const DECISION_PATH='/api/media-registration-admin/decision';

const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();
const dbOf=env=>env?.GNK_ASG_D1||null;
const validCode=value=>/^GNK-MEDIA-\d{8}-[A-Z]{2}-[A-Z0-9]{1,12}-\d{3}$/i.test(clean(value));
const allowed=new Set(['DRAFT','SUBMITTED','NEEDS_INFORMATION','APPROVED','NEEDS_TRAVEL_DOCUMENTS','TRAVEL_CONFIRMED','REJECTED']);
const reasonRequired=new Set(['NEEDS_INFORMATION','NEEDS_TRAVEL_DOCUMENTS','REJECTED']);
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, no-cache, must-revalidate, max-age=0','x-content-type-options':'nosniff','x-gnk-asg-media-decision':VERSION}});
const sameOrigin=request=>{const origin=request.headers.get('origin');if(!origin)return true;try{return new URL(origin).origin===new URL(request.url).origin;}catch{return false;}};

async function schema(env){
 const db=dbOf(env);
 if(!db?.prepare)throw new Error('GNK_ASG_D1 binding missing');
 await db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS media_registration_drafts(mail_code TEXT PRIMARY KEY,application_id TEXT,status TEXT NOT NULL DEFAULT 'DRAFT',revision INTEGER NOT NULL DEFAULT 1,data_json TEXT NOT NULL DEFAULT '{}',submitted_at TEXT,approved_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`),
  db.prepare(`CREATE TABLE IF NOT EXISTS media_registration_audit(id TEXT PRIMARY KEY,event_type TEXT NOT NULL,mail_code TEXT,detail_json TEXT,created_at TEXT NOT NULL)`)
 ]);
 return db;
}

export async function handleMediaRegistrationReviewDecision(request,env){
 const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
 if(path!==DECISION_PATH||request.method!=='POST')return null;
 if(!sameOrigin(request))return json({ok:false,error:'origin_not_allowed'},403);
 let body={};
 try{body=await request.json();}catch{return json({ok:false,error:'invalid_json'},400);}
 const mailCode=clean(body.mailCode).toUpperCase();
 const status=clean(body.status).toUpperCase();
 const reason=clean(body.reason).slice(0,2000);
 const expectedRevision=Number.parseInt(body.expectedRevision,10);
 if(!validCode(mailCode)||!allowed.has(status))return json({ok:false,error:'invalid_decision'},400);
 if(!Number.isInteger(expectedRevision)||expectedRevision<1)return json({ok:false,error:'expected_revision_required'},409);
 if(reasonRequired.has(status)&&reason.length<3)return json({ok:false,error:'decision_reason_required',status},400);
 const db=await schema(env);
 const current=await db.prepare(`SELECT mail_code,application_id,status,revision,approved_at,updated_at FROM media_registration_drafts WHERE mail_code=?`).bind(mailCode).first();
 if(!current)return json({ok:false,error:'application_not_found'},404);
 const currentRevision=Number(current.revision||1);
 if(currentRevision!==expectedRevision)return json({ok:false,error:'stale_review',message:'Prijava je promijenjena nakon otvaranja. Osvježite detalj prije odluke.',expectedRevision,currentRevision,currentStatus:current.status},409);
 if(current.status===status)return json({ok:true,changed:0,unchanged:true,status,currentRevision,noNotification:true});
 const timestamp=now(),nextRevision=currentRevision+1;
 const result=await db.prepare(`UPDATE media_registration_drafts SET status=?,revision=?,approved_at=CASE WHEN ? IN ('APPROVED','TRAVEL_CONFIRMED') THEN COALESCE(approved_at,?) ELSE approved_at END,updated_at=? WHERE mail_code=? AND revision=?`).bind(status,nextRevision,status,timestamp,timestamp,mailCode,currentRevision).run();
 if(Number(result.meta?.changes||0)!==1){
  const latest=await db.prepare(`SELECT status,revision FROM media_registration_drafts WHERE mail_code=?`).bind(mailCode).first();
  return json({ok:false,error:'stale_review',message:'Prijava je istodobno promijenjena. Osvježite detalj prije odluke.',expectedRevision,currentRevision:Number(latest?.revision||0),currentStatus:latest?.status||''},409);
 }
 await db.prepare(`INSERT INTO media_registration_audit(id,event_type,mail_code,detail_json,created_at) VALUES(?,?,?,?,?)`).bind(crypto.randomUUID(),'human_review_status_changed',mailCode,JSON.stringify({source:'PROTECTED_ADMIN_REVIEW',applicationId:current.application_id||'',previousStatus:current.status,nextStatus:status,previousRevision:currentRevision,nextRevision,reason,noNotification:true}),timestamp).run();
 return json({ok:true,changed:1,mailCode,applicationId:current.application_id||'',previousStatus:current.status,status,previousRevision:currentRevision,revision:nextRevision,updatedAt:timestamp,noNotification:true});
}
