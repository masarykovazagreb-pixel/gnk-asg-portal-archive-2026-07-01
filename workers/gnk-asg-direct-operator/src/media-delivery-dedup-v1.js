export const VERSION='GNK_ASG_MEDIA_DELIVERY_DEDUP_V1_20260630';

const dbOf=env=>env.GNK_ASG_D1||null;
const now=()=>new Date().toISOString();

export async function lockPreviouslyDeliveredRecipients(env){
  const db=dbOf(env);
  if(!db?.prepare)return{ok:false,skipped:'d1_binding_missing',version:VERSION};
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
