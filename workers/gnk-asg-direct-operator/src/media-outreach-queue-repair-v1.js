export const VERSION='GNK_ASG_MEDIA_OUTREACH_QUEUE_REPAIR_V2_HTML_ONLY_20260630';

const CAMPAIGN_KEY='media-command-center:campaign:v1';
const dbOf=env=>env.GNK_ASG_D1||null;
const kvOf=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;
const clean=value=>String(value??'').trim();
const now=()=>new Date().toISOString();

async function campaign(env){
  const kv=kvOf(env);
  if(!kv?.get)return{};
  try{
    const raw=await kv.get(CAMPAIGN_KEY);
    return raw?JSON.parse(raw):{};
  }catch{return{};}
}

export async function repairPendingMediaQueue(env){
  const db=dbOf(env);
  if(!db?.prepare)return{ok:false,skipped:'d1_binding_missing',version:VERSION};
  const cfg=await campaign(env);
  const htmlKey=clean(cfg.htmlR2Key||env.MEDIA_OUTREACH_HTML_KEY);
  const htmlSha256=clean(cfg.htmlSha256||env.MEDIA_OUTREACH_HTML_SHA256);
  const pdfKey=clean(cfg.pdfR2Key||env.MEDIA_OUTREACH_PDF_KEY);
  const pdfSha256=clean(cfg.pdfSha256||env.MEDIA_OUTREACH_PDF_SHA256);
  if(!htmlKey||!htmlSha256||!pdfKey||!pdfSha256)return{ok:false,skipped:'campaign_assets_incomplete',version:VERSION};

  const stamp=now();
  const recovered=await db.prepare(`UPDATE media_delivery_queue
    SET html_key=?,html_sha256=?,pdf_key=?,pdf_sha256=?,status='QUEUED',attempts=0,last_error=NULL,last_error_code=NULL,queued_at=?,updated_at=?
    WHERE status IN ('REVIEW','FAILED')
      AND last_error_code IN ('PDF_MISMATCH','HTML_MISMATCH')`).bind(
      htmlKey,htmlSha256,pdfKey,pdfSha256,stamp,stamp
    ).run();

  const rebound=await db.prepare(`UPDATE media_delivery_queue
    SET html_key=?,html_sha256=?,pdf_key=?,pdf_sha256=?,updated_at=?
    WHERE status IN ('QUEUED','RETRY')
      AND (COALESCE(html_sha256,'')<>? OR COALESCE(pdf_sha256,'')<>?)`).bind(
      htmlKey,htmlSha256,pdfKey,pdfSha256,stamp,htmlSha256,pdfSha256
    ).run();

  const duplicates=await db.prepare(`UPDATE media_delivery_queue AS q
    SET status='REVIEW',last_error='Duplicate pending recipient suppressed; the earliest eligible row remains active',last_error_code='DUPLICATE_PENDING',updated_at=?
    WHERE q.status IN ('QUEUED','RETRY')
      AND EXISTS (
        SELECT 1 FROM media_delivery_queue AS q2
        WHERE q2.status IN ('QUEUED','RETRY')
          AND LOWER(q2.email)=LOWER(q.email)
          AND (q2.queued_at<q.queued_at OR (q2.queued_at=q.queued_at AND q2.id<q.id))
      )`).bind(stamp).run();

  return{
    ok:true,
    version:VERSION,
    recoveredMismatches:Number(recovered.meta?.changes||0),
    reboundPending:Number(rebound.meta?.changes||0),
    suppressedPendingDuplicates:Number(duplicates.meta?.changes||0),
    htmlSha256,
    internalPdfSha256:pdfSha256,
    deliveryMode:'HTML_ONLY',
    repairedAt:stamp
  };
}
