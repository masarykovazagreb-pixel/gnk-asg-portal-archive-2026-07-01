export const VERSION='GNK_ASG_AUTO_REPLY_CASE_CENTER_V1_20260709_PERSONALIZED_AI_SIGNATURES';

export const CENTERS=[
  {code:'ZAG',city:'Zagreb',country:'Croatia',timezone:'Europe/Zagreb'},
  {code:'TOR',city:'Toronto',country:'Canada',timezone:'America/Toronto'},
  {code:'MEX',city:'Mexico City',country:'Mexico',timezone:'America/Mexico_City'},
  {code:'BOG',city:'Bogotá',country:'Colombia',timezone:'America/Bogota'},
  {code:'SAO',city:'São Paulo',country:'Brazil',timezone:'America/Sao_Paulo'},
  {code:'DXB',city:'Dubai',country:'UAE',timezone:'Asia/Dubai'},
  {code:'SIN',city:'Singapore',country:'Singapore',timezone:'Asia/Singapore'},
  {code:'TYO',city:'Tokyo',country:'Japan',timezone:'Asia/Tokyo'},
  {code:'CAS',city:'Casablanca',country:'Morocco',timezone:'Africa/Casablanca'},
  {code:'BLD',city:'Boulder / Colorado',country:'USA',timezone:'America/Denver'}
];

const clean=value=>String(value??'').trim();
const lower=value=>clean(value).toLowerCase();
const now=()=>new Date().toISOString();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const dbOf=env=>env?.GNK_ASG_D1||null;

export function normalizeEmail(value){
  const match=clean(value).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?match[0].toLowerCase():'';
}

async function sha256(value){
  const bytes=new TextEncoder().encode(String(value));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

export function detectLanguage(input=''){
  const text=lower(input);
  if(/[\u4e00-\u9fff]/.test(text))return 'zh';
  if(/\b(sehr|danke|bitte|anfrage|mit freundlichen grüßen)\b/i.test(text))return 'de';
  if(/\b(please|thank you|dear|kind regards|inquiry|question|received)\b/i.test(text))return 'en';
  if(/\b(spoštovani|pozdrav|upit|predmet|zaprimljeno|molim|hvala|odgovor)\b/i.test(text))return 'hr';
  if(/\b(poštovani|hvala|odgovorićemo|prosleđujemo|upit)\b/i.test(text))return 'sr';
  if(/\b(spoštovani|hvala|vprašanje|odgovorili)\b/i.test(text))return 'sl';
  if(/\b(tisztelt|köszönjük|üzenet|válasz)\b/i.test(text))return 'hu';
  if(/\b(madame|monsieur|merci|demande|cordialement)\b/i.test(text))return 'fr';
  if(/\b(estimados|gracias|consulta|atentamente)\b/i.test(text))return 'es';
  if(/\b(gentili|grazie|richiesta|cordiali saluti)\b/i.test(text))return 'it';
  return 'hr';
}

export function extractPreferredName(input={}){
  const explicit=clean(input.name||input.senderName||input.fromName);
  if(explicit&&!explicit.includes('@'))return explicit.split(/\s+/).slice(0,2).join(' ');
  const text=clean(input.message||input.text||input.body||'');
  const closing=text.match(/(?:srdačan pozdrav|lijep pozdrav|lp|pozdrav|kind regards|best regards|regards|mit freundlichen grüßen|cordialement|cordiali saluti|atentamente)[,\s\r\n]+([\p{L}][\p{L}' -]{1,38})\s*$/iu);
  if(closing)return clean(closing[1]).split(/\s+/).slice(0,2).join(' ');
  const lastLine=text.split(/\r?\n/).map(clean).filter(Boolean).slice(-1)[0]||'';
  if(/^[\p{L}][\p{L}'-]{1,28}$/u.test(lastLine))return lastLine;
  return '';
}

export async function centerForIdentity(identity){
  const seed=lower(identity)||'anonymous';
  const hash=await sha256(seed);
  const index=parseInt(hash.slice(0,8),16)%CENTERS.length;
  return CENTERS[index];
}

export async function caseNumberFor(input={},center){
  const date=clean(input.createdAt||now()).slice(0,10).replace(/-/g,'');
  const identity=normalizeEmail(input.email||input.from||input.sender)||extractPreferredName(input)||'anonymous';
  const seed=[identity,clean(input.subject),clean(input.message||input.text||input.body),date].join('|');
  const hash=await sha256(seed);
  return `GNK-${date}-${center.code}-${hash.slice(0,8).toUpperCase()}`;
}

export function salutation(language,name){
  const n=clean(name);
  if(language==='en')return n?`Dear ${n},`:'Dear Sir or Madam,';
  if(language==='de')return n?`Sehr geehrte/r ${n},`:'Sehr geehrte Damen und Herren,';
  if(language==='fr')return n?`Madame/Monsieur ${n},`:'Madame, Monsieur,';
  if(language==='it')return n?`Gentile ${n},`:'Gentili Signore e Signori,';
  if(language==='es')return n?`Estimado/a ${n},`:'Estimados señores:';
  if(language==='sl')return n?`Spoštovani ${n},`:'Spoštovani,';
  if(language==='hu')return n?`Tisztelt ${n}!`:'Tisztelt Hölgyem/Uram!';
  if(language==='zh')return n?`尊敬的${n}：`:'尊敬的先生/女士：';
  return n?`Poštovani ${n},`:'Poštovani,';
}

export function knownAnswer(input='',language='hr'){
  const text=lower(input);
  if(/the code|new york|aktivacija|activation/.test(text)){
    if(language==='en')return 'THE CODE is available as the public GNK ASG / GNK DINAMO presentation layer. The inquiry will be routed for a more precise response if additional details are required.';
    return 'THE CODE je dostupan kao javni prezentacijski sloj GNK ASG / GNK DINAMO. Ako su potrebni dodatni detalji, upit će biti proslijeđen na daljnju obradu.';
  }
  if(/finance|financial|report|izvješ|izvje[sš]t|pdf|ebitda|revenue|prihod/.test(text)){
    if(language==='en')return 'Public finance materials and report downloads are handled through the finance/report section of the portal. The assigned center will review whether a specific document or clarification is required.';
    return 'Javni financijski materijali i preuzimanja izvješća vode se kroz finance/report dio portala. Dodijeljeni centar provjerit će je li potreban konkretan dokument ili dodatno pojašnjenje.';
  }
  if(/media|press|novinar|akredit|accreditation|interview/.test(text)){
    if(language==='en')return 'Media and accreditation questions are routed to the Media Relations & Accreditation Center.';
    return 'Medijski i akreditacijski upiti usmjeravaju se prema Media Relations & Accreditation Center.';
  }
  if(language==='en')return 'The system has received the inquiry and can answer general questions based on available public portal information. Specific legal, financial, contractual or operational requests are routed for human review.';
  return 'Sustav je zaprimio upit i može odgovoriti na opća pitanja prema dostupnim javnim podacima portala. Specifični pravni, financijski, ugovorni ili operativni zahtjevi usmjeravaju se na ljudsku provjeru.';
}

export function replyTextFor(entry){
  const {language,name,caseNumber,center,answer}=entry;
  if(language==='en')return `${salutation(language,name)}\n\nYour inquiry has been received and is being handled under reference number: ${caseNumber}.\nAssigned processing center: ${center.city}, ${center.country}.\n\n${answer}\n\nPlease keep this number in the subject line for any further communication: ${caseNumber}.`;
  if(language==='de')return `${salutation(language,name)}\n\nIhre Anfrage wurde registriert und wird unter folgender Nummer geführt: ${caseNumber}.\nZugeordnetes Bearbeitungszentrum: ${center.city}, ${center.country}.\n\n${answer}\n\nBitte führen Sie diese Nummer in weiterer Korrespondenz im Betreff an: ${caseNumber}.`;
  if(language==='zh')return `${salutation(language,name)}\n\n您的询问已收到，并按以下编号处理：${caseNumber}。\n指定处理中心：${center.city}, ${center.country}。\n\n${answer}\n\n请在后续通信的主题中保留此编号：${caseNumber}。`;
  return `${salutation(language,name)}\n\nVaš upit je zaprimljen i vodi se pod brojem: ${caseNumber}.\nDodijeljeni centar obrade: ${center.city}, ${center.country}.\n\n${answer}\n\nMolimo da u svakoj daljnjoj komunikaciji u predmetu zadržite ovaj broj: ${caseNumber}.`;
}

export function replyHtmlFor(entry){
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:15px;line-height:1.6"><p>${escapeHtml(salutation(entry.language,entry.name))}</p><p>${escapeHtml(entry.language==='en'?'Your inquiry has been received and is being handled under reference number:':'Vaš upit je zaprimljen i vodi se pod brojem:')} <strong>${escapeHtml(entry.caseNumber)}</strong><br>${escapeHtml(entry.language==='en'?'Assigned processing center:':'Dodijeljeni centar obrade:')} <strong>${escapeHtml(entry.center.city)}, ${escapeHtml(entry.center.country)}</strong></p><p>${escapeHtml(entry.answer)}</p><p>${escapeHtml(entry.language==='en'?'Please keep this number in the subject line for any further communication:':'Molimo da u svakoj daljnjoj komunikaciji u predmetu zadržite ovaj broj:')} <strong>${escapeHtml(entry.caseNumber)}</strong></p></div>`;
}

export async function buildAutoReplyCase(input={},env=null){
  const senderEmail=normalizeEmail(input.email||input.from||input.sender||input.fromEmail);
  const name=extractPreferredName(input);
  const identity=senderEmail||name||clean(input.subject)||'anonymous';
  const language=detectLanguage([input.subject,input.message,input.text,input.body].map(clean).join('\n'));
  const center=await centerForIdentity(identity);
  const caseNumber=clean(input.caseNumber||input.caseId)||await caseNumberFor(input,center);
  const answer=knownAnswer([input.subject,input.message,input.text,input.body].map(clean).join('\n'),language);
  const entry={version:VERSION,caseNumber,senderEmail,name,language,center,subject:clean(input.subject),answer,createdAt:clean(input.createdAt)||now(),status:'AUTO_REPLY_PREPARED'};
  return{...entry,text:replyTextFor(entry),html:replyHtmlFor(entry)};
}

async function ensureCaseSchema(env){
  const db=dbOf(env);if(!db)return null;
  await db.prepare(`CREATE TABLE IF NOT EXISTS auto_reply_cases(case_number TEXT PRIMARY KEY,sender_email TEXT,sender_name TEXT,language TEXT,center_code TEXT,center_city TEXT,center_country TEXT,subject TEXT,status TEXT,reply_text TEXT,created_at TEXT,updated_at TEXT)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_auto_reply_cases_sender ON auto_reply_cases(sender_email,created_at)`).run();
  return db;
}

export async function saveAutoReplyCase(env,entry){
  const db=await ensureCaseSchema(env);if(!db)return{saved:false,error:'D1_BINDING_MISSING'};
  await db.prepare(`INSERT OR REPLACE INTO auto_reply_cases(case_number,sender_email,sender_name,language,center_code,center_city,center_country,subject,status,reply_text,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(entry.caseNumber,entry.senderEmail,entry.name,entry.language,entry.center.code,entry.center.city,entry.center.country,entry.subject,entry.status,entry.text,entry.createdAt,now()).run();
  return{saved:true,caseNumber:entry.caseNumber};
}

export async function lookupAutoReplyCase(env,caseNumber){
  const db=await ensureCaseSchema(env);if(!db)return{ok:false,error:'D1_BINDING_MISSING'};
  const row=await db.prepare(`SELECT case_number,sender_email,sender_name,language,center_code,center_city,center_country,subject,status,reply_text,created_at,updated_at FROM auto_reply_cases WHERE case_number=? LIMIT 1`).bind(clean(caseNumber)).first();
  if(!row)return{ok:false,error:'case_not_found',caseNumber:clean(caseNumber)};
  return{ok:true,case:row};
}
