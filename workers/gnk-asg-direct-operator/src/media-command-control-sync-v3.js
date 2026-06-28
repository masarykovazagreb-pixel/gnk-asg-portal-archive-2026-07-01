import {handleMediaCommandCenter as handleV2,handleMediaCommandCenterEmail,VERSION as BASE_VERSION} from './media-command-center-v2.js';

export const VERSION='GNK_ASG_MEDIA_CONTROL_SYNC_V3_1_SUPPRESSION_SCHEMA_20260628';
const API='/api/media-command-center';
const clean=value=>String(value??'').trim();
const lower=value=>clean(value).toLocaleLowerCase('hr');
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));
const splitAddresses=value=>clean(value).split(/[;,]/).map(item=>item.trim()).filter(validEmail);
const dbOf=env=>env.GNK_ASG_D1||null;

async function ensureSchema(env){
  const db=dbOf(env);if(!db)throw new Error('GNK_ASG_D1 binding is not configured');
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS media_outreach_contact_controls(
      mail_code TEXT PRIMARY KEY,source_version TEXT,verification_checked_at TEXT,approval_expires_at TEXT,
      to_email TEXT,cc_email TEXT,requires_personalization INTEGER NOT NULL DEFAULT 0,
      blocked_reason TEXT,operational_status TEXT NOT NULL DEFAULT 'UNASSESSED',updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS media_suppressions(
      email TEXT PRIMARY KEY,reason TEXT,created_at TEXT NOT NULL)`)
  ]);
  return db;
}

function routeAddresses(contact,control={}){
  const addresses=splitAddresses(contact.channel||'');
  if(clean(contact.mailCode)==='GNK-MEDIA-20260626-XX-TWP-096'){
    return{
      toEmail:clean(control.to_email)||addresses[1]||addresses[0]||clean(contact.email),
      ccEmail:clean(control.cc_email)||addresses[0]||''
    };
  }
  return{
    toEmail:clean(control.to_email)||addresses[0]||clean(contact.email),
    ccEmail:clean(control.cc_email)||addresses.slice(1).join(', ')
  };
}

function assess(contact,control={},suppressed=false){
  const note=lower(contact.note),channel=lower(contact.channelStatus||contact.channel_status),person=lower(contact.personStatus||contact.person_status);
  const approved=Boolean(contact.approved),allowed=Boolean(contact.automationAllowed??contact.automation_allowed);
  const expires=Date.parse(control.approval_expires_at||contact.approvalExpiresAt||contact.approval_expires_at||'');
  const expired=Number.isFinite(expires)&&expires<=Date.now();
  const explicitBlock=/ne slati|do not send|zabran|blocked/.test(`${note} ${channel}`);
  const verificationPending=/provjera u tijeku|nije još provjereno|nije jos provjereno|za verifikaciju/.test(`${channel} ${person} ${note}`);
  const manual=/ručno|rucno|kontakt-obrazac|support|letters inbox|nije urednički pitch|nije urednicki pitch/.test(`${channel} ${note}`);
  const requiresPersonalization=Boolean(control.requires_personalization)||/strogu personalizaciju|ne slati generički|ne slati genericki|individualno|ciljano/.test(note);
  const routed=routeAddresses(contact,control);
  let operationalStatus='READY',blockedReason='';
  if(suppressed){operationalStatus='SUPPRESSED';blockedReason='Kontakt je na suppression listi.';}
  else if(explicitBlock){operationalStatus='BLOCKED';blockedReason='Napomena ili status izričito zabranjuje slanje.';}
  else if(!validEmail(routed.toEmail)){operationalStatus='MANUAL_ONLY';blockedReason='Nema valjanog primarnog e-maila.';}
  else if(verificationPending){operationalStatus='NEEDS_VERIFICATION';blockedReason='Osoba ili urednički kanal nisu završno potvrđeni.';}
  else if(!allowed){operationalStatus=manual?'MANUAL_ONLY':'NOT_AUTOMATION_ALLOWED';blockedReason='Kontakt nije dopušten za automatizirano slanje.';}
  else if(expired){operationalStatus='EXPIRED_APPROVAL';blockedReason='Ručno odobrenje je isteklo.';}
  else if(!approved){operationalStatus='AWAITING_APPROVAL';blockedReason='Potreban je završni ručni pristanak.';}
  return{operationalStatus,blockedReason,toEmail:routed.toEmail,ccEmail:routed.ccEmail,requiresPersonalization};
}

export async function ensureMediaControlRows(env,mailCode=''){
  const db=await ensureSchema(env),code=clean(mailCode);
  const controls=(await db.prepare(`SELECT * FROM media_outreach_contact_controls`).all()).results||[];
  const controlMap=new Map(controls.map(row=>[row.mail_code,row]));
  const suppressions=(await db.prepare(`SELECT email FROM media_suppressions`).all()).results||[];
  const suppressed=new Set(suppressions.map(row=>lower(row.email)));
  const result=code
    ? await db.prepare(`SELECT * FROM media_outreach_contacts WHERE mail_code=?`).bind(code).all()
    : await db.prepare(`SELECT * FROM media_outreach_contacts ORDER BY id`).all();
  const rows=result.results||[];
  let created=0,updated=0;
  for(const row of rows){
    const current=controlMap.get(row.mail_code)||{};
    if(clean(current.source_version)==='MANUAL_OVERRIDE')continue;
    const contact={...row,mailCode:row.mail_code,automationAllowed:Boolean(row.automation_allowed),approved:Boolean(row.approved),channelStatus:row.channel_status,personStatus:row.person_status};
    const state=assess(contact,current,suppressed.has(lower(row.email)));
    const sourceVersion=clean(current.source_version)||'STATIC_SEED_CONTROL_V3';
    const response=await db.prepare(`INSERT INTO media_outreach_contact_controls(mail_code,source_version,verification_checked_at,approval_expires_at,to_email,cc_email,requires_personalization,blocked_reason,operational_status,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(mail_code) DO UPDATE SET to_email=excluded.to_email,cc_email=excluded.cc_email,requires_personalization=excluded.requires_personalization,blocked_reason=excluded.blocked_reason,operational_status=excluded.operational_status,updated_at=excluded.updated_at`)
      .bind(row.mail_code,sourceVersion,current.verification_checked_at||null,current.approval_expires_at||null,state.toEmail,state.ccEmail,state.requiresPersonalization?1:0,state.blockedReason,state.operationalStatus,new Date().toISOString()).run();
    if(current.mail_code)updated+=Number(response.meta?.changes||0)>0?1:0;else created+=Number(response.meta?.changes||0)>0?1:0;
  }
  return{ok:true,version:VERSION,processed:rows.length,created,updated};
}

export async function handleMediaCommandCenter(request,env,ctx){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path===`${API}/readiness-summary`&&request.method==='GET')await ensureMediaControlRows(env);
  if(path===`${API}/contact-approval`&&request.method==='POST'){
    const copy=request.clone();let body={};try{body=await copy.json();}catch{}
    const response=await handleV2(request,env,ctx);
    if(response?.ok&&clean(body.mailCode)){
      const sync=await ensureMediaControlRows(env,body.mailCode);
      try{
        const payload=await response.clone().json();
        return new Response(JSON.stringify({...payload,controlSync:sync},null,2),{status:response.status,headers:response.headers});
      }catch{return response;}
    }
    return response;
  }
  return handleV2(request,env,ctx);
}

export{handleMediaCommandCenterEmail,BASE_VERSION};