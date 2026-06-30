export const VERSION='GNK_ASG_MEDIA_DELIVERY_DEDUP_V2_20260630';

const dbOf=env=>env.GNK_ASG_D1||null;
const now=()=>new Date().toISOString();

async function ensureSchema(db){
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS media_outreach_contacts(id INTEGER PRIMARY KEY AUTOINCREMENT,mail_code TEXT UNIQUE NOT NULL,priority TEXT,country TEXT,outlet TEXT NOT NULL,recipient_title TEXT,recipient_name TEXT,role TEXT,secondary_desk TEXT,attention_line TEXT,email TEXT,channel TEXT,language TEXT,salutation TEXT,person_status TEXT,channel_status TEXT,automation_allowed INTEGER NOT NULL DEFAULT 0,approved INTEGER NOT NULL DEFAULT 0,sent_status TEXT NOT NULL DEFAULT 'NOT SENT',response_status TEXT NOT NULL DEFAULT 'NO RESPONSE',source TEXT,note TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_delivery_queue(id TEXT PRIMARY KEY,idempotency_key TEXT UNIQUE NOT NULL,mail_code TEXT NOT NULL,email TEXT NOT NULL,outlet TEXT,subject TEXT NOT NULL,body_text TEXT NOT NULL,html_key TEXT,html_sha256 TEXT,pdf_key TEXT,pdf_sha256 TEXT,status TEXT NOT NULL DEFAULT 'QUEUED',attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT,queued_at TEXT NOT NULL,updated_at TEXT NOT NULL,sent_at TEXT,provider_message_id TEXT,last_error_code TEXT)`)
  ]);
}

export async function lockPreviouslyDeliveredRecipients(env){
  const db=dbOf(env);
  if(!db?.prepare)return{ok:false,skipped:'d1_binding_missing',version:VERSION};
  await ensureSchema(db);
  const stamp=now();
  const delivered="status='SENT' AND COALESCE(provider_message_id,'')<>''";

  const contacts=await db.prepare(`UPDATE media_outreach_contacts
    SET automation_allowed=0,approved=0,sent_status='SENT',updated_at=?
    WHERE mail_code IN (SELECT mail_code FROM media_delivery_queue WHERE ${delivered})
       OR LOWER(COALESCE(email,'')) IN (SELECT LOWER(email) FROM media_delivery_queue WHERE ${delivered})`).bind(stamp).run();

  const pending=await db.prepare(`DELETE FROM media_delivery_queue
    WHERE status<>'SENT'
      AND (mail_code IN (SELECT mail_code FROM media_delivery_queue WHERE ${delivered})
        OR LOWER(email) IN (SELECT LOWER(email) FROM media_delivery_queue WHERE ${delivered}))`).run();

  return{
    ok:true,
    version:VERSION,
    lockedContacts:Number(contacts.meta?.changes||0),
    removedPendingDuplicates:Number(pending.meta?.changes||0),
    enforcedAt:stamp
  };
}
