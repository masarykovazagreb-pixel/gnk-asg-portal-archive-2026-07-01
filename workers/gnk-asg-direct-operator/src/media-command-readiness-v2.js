export const VERSION='GNK_ASG_MEDIA_READINESS_V2_20260626';
const clean=value=>String(value??'').trim();
const lower=value=>clean(value).toLocaleLowerCase('hr');
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));
const dbOf=env=>env.GNK_ASG_D1||null;

export async function ensureReadinessSchema(env){
  const db=dbOf(env);if(!db)throw new Error('GNK_ASG_D1 binding is not configured');
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS media_outreach_contact_controls(mail_code TEXT PRIMARY KEY,source_version TEXT,verification_checked_at TEXT,approval_expires_at TEXT,to_email TEXT,cc_email TEXT,requires_personalization INTEGER NOT NULL DEFAULT 0,blocked_reason TEXT,operational_status TEXT NOT NULL DEFAULT 'UNASSESSED',updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_contact_imports(id TEXT PRIMARY KEY,source_version TEXT NOT NULL,source_sha256 TEXT,contact_count INTEGER NOT NULL,created_count INTEGER NOT NULL DEFAULT 0,updated_count INTEGER NOT NULL DEFAULT 0,unchanged_count INTEGER NOT NULL DEFAULT 0,imported_by TEXT,detail_json TEXT,created_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_delivery_attempts(id TEXT PRIMARY KEY,idempotency_key TEXT UNIQUE NOT NULL,mail_code TEXT NOT NULL,campaign_version TEXT,mode TEXT NOT NULL,status TEXT NOT NULL,provider_message_id TEXT,error_code TEXT,detail_json TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`)
  ]);
  return db;
}

async function maps(env){
  const db=await ensureReadinessSchema(env);
  const controls=(await db.prepare(`SELECT * FROM media_outreach_contact_controls`).all()).results||[];
  const suppressions=(await db.prepare(`SELECT email FROM media_suppressions`).all()).results||[];
  return{db,controls:new Map(controls.map(row=>[row.mail_code,row])),suppressed:new Set(suppressions.map(row=>lower(row.email)))};
}

function addresses(value){return clean(value).split(/[;,]/).map(item=>item.trim()).filter(validEmail);}

export function assessContact(contact,control={},suppressed=false){
  const note=lower(contact.note),channelStatus=lower(contact.channelStatus||contact.channel_status),personStatus=lower(contact.personStatus||contact.person_status);
  const approved=Boolean(contact.approved),allowed=Boolean(contact.automationAllowed??contact.automation_allowed);
  const parsed=addresses(contact.channel||''),toEmail=clean(control.to_email)||parsed[0]||clean(contact.email),ccEmail=clean(control.cc_email)||parsed.slice(1).join(', ');
  const expires=Date.parse(control.approval_expires_at||'');const expired=Number.isFinite(expires)&&expires<=Date.now();
  const explicitBlock=/ne slati|do not send|zabran|blocked/.test(`${note} ${channelStatus}`);
  const verificationPending=/provjera u tijeku|nije još provjereno|nije jos provjereno|za verifikaciju/.test(`${channelStatus} ${personStatus} ${note}`);
  const manual=/ručno|rucno|kontakt-obrazac|support|letters inbox|nije urednički pitch|nije urednicki pitch/.test(`${channelStatus} ${note}`);
  const requiresPersonalization=Boolean(control.requires_personalization)||/strogu personalizaciju|ne slati generički|ne slati genericki|individualno|ciljano/.test(note);
  let operationalStatus='READY',blockedReason='';
  if(suppressed){operationalStatus='SUPPRESSED';blockedReason='Kontakt je na suppression listi.';}
  else if(explicitBlock){operationalStatus='BLOCKED';blockedReason='Napomena ili status izričito zabranjuje slanje.';}
  else if(!validEmail(toEmail)){operationalStatus='MANUAL_ONLY';blockedReason='Nema valjanog primarnog e-maila.';}
  else if(verificationPending){operationalStatus='NEEDS_VERIFICATION';blockedReason='Osoba ili urednički kanal nisu završno potvrđeni.';}
  else if(!allowed){operationalStatus=manual?'MANUAL_ONLY':'NOT_AUTOMATION_ALLOWED';blockedReason='Kontakt nije dopušten za automatizirano slanje.';}
  else if(expired){operationalStatus='EXPIRED_APPROVAL';blockedReason='Ručno odobrenje je isteklo.';}
  else if(!approved){operationalStatus='AWAITING_APPROVAL';blockedReason='Potreban je završni ručni pristanak.';}
  return{operationalStatus,blockedReason,toEmail,ccEmail,requiresPersonalization,ready:operationalStatus==='READY'};
}

export async function enrichContactItems(env,items){
  const {controls,suppressed}=await maps(env);
  return (Array.isArray(items)?items:[]).map(item=>({...item,...assessContact(item,controls.get(item.mailCode)||{},suppressed.has(lower(item.email)))}));
}

export async function getReadinessSummary(env){
  const {db,controls,suppressed}=await maps(env);
  const rows=(await db.prepare(`SELECT * FROM media_outreach_contacts ORDER BY id`).all()).results||[];
  const counts={};for(const row of rows){const result=assessContact(row,controls.get(row.mail_code)||{},suppressed.has(lower(row.email)));counts[result.operationalStatus]=(counts[result.operationalStatus]||0)+1;}
  return{version:VERSION,total:rows.length,counts,ready:counts.READY||0,blocked:(counts.BLOCKED||0)+(counts.SUPPRESSED||0),needsVerification:counts.NEEDS_VERIFICATION||0,awaitingApproval:counts.AWAITING_APPROVAL||0};
}
