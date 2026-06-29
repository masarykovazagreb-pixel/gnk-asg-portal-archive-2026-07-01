export const VERSION='GNK_ASG_RHT_CODE_TEST_ONCE_V1_20260629';

const PATH='/api/rht-code-test-once';
const ACCESS_KEY='rht-code-test-20260629-8f5a2c71d3494e40';
const STATE_KEY='controlled-media-test:20260629:rht-code-subject-v1';
const RECIPIENT='rht@gmx.com';
const FROM='media@gnk-asg.hr';
const INVITATION_CODE='GNK-MEDIA-20260629-GB-TEST-002';
const PERSONAL_CODE='CODETEST29';
const PDF_ASSET='/data/GNK_DINAMO_THE_CODE_MEDIA_INVITATION_AND_ACCREDITATION_EN_FINAL.pdf';
const PDF_FILENAME='GNK_DINAMO_THE_CODE_MEDIA_INVITATION_AND_ACCREDITATION_EN_FINAL.pdf';
const PDF_SHA256='027226b6300c8638f6e2fcfd1774e8c818b14a0360500fadd1b28c64b7f89879';

const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-rht-code-test':VERSION}});
const clean=value=>String(value??'').trim();
const kvOf=env=>env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV||null;

async function sha256Hex(bytes){
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
}

async function loadPdf(request,env){
  if(!env.ASSETS?.fetch)return null;
  const response=await env.ASSETS.fetch(new Request(new URL(PDF_ASSET,request.url),{method:'GET'}));
  if(!response.ok)return null;
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return null;
  const sha256=await sha256Hex(bytes);
  if(sha256!==PDF_SHA256)return null;
  return{content:bytes,filename:PDF_FILENAME,type:'application/pdf',disposition:'attachment',sha256};
}

function html(){
  const applicationUrl=`https://gnk-asg.hr/media-application/?lang=en&code=${encodeURIComponent(INVITATION_CODE)}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CODE</title></head><body style="margin:0;background:#edf1f6;color:#152033;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden">THE CODE — official media invitation and accreditation test.</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#edf1f6"><tr><td align="center" style="padding:24px 10px"><table role="presentation" width="700" cellpadding="0" cellspacing="0" style="width:100%;max-width:700px;background:#fff;border:1px solid #d7b55b;border-radius:18px;overflow:hidden"><tr><td style="background:#07192d;border-bottom:4px solid #d7b55b;padding:24px 28px"><table role="presentation" width="100%"><tr><td width="160"><img src="https://gnk-asg.hr/assets/gnk-group-email-logo-final.png" width="145" alt="GNK DINAMO Ltd. Group" style="display:block;border:0;max-width:100%"></td><td align="center" style="color:#fff"><div style="font-family:Georgia,serif;font-size:40px;font-weight:700">THE CODE</div><div style="color:#efd580;font-size:12px;letter-spacing:.12em;margin-top:7px">OFFICIAL MEDIA INVITATION · NEW YORK</div><div style="color:#dbe6f2;font-size:12px;margin-top:5px">6–8 October 2026 · 7 October at 11:30 a.m. ET</div></td><td width="145" align="right"><img src="https://gnk-asg.hr/assets/gnk-asg-email-logo-final-v2.png" width="130" alt="GNK ASG" style="display:block;border:0;max-width:100%;margin-left:auto"></td></tr></table></td></tr><tr><td style="padding:30px"><div style="font-size:11px;font-weight:800;letter-spacing:.12em;color:#7b5b11">CONTROLLED TEST · RHT@GMX.COM</div><h1 style="font-family:Georgia,serif;color:#0b223d;font-size:30px;line-height:1.2;margin:10px 0 16px">Official Media Invitation &amp; Accreditation Access</h1><p style="font-size:16px;line-height:1.65;margin:0 0 16px">Dear Editorial Team,</p><p style="font-size:16px;line-height:1.65;margin:0 0 20px">GNK DINAMO Ltd. Group invites your newsroom to apply for accreditation and media coverage of <strong>THE CODE</strong> in New York from 6 to 8 October 2026.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07192d;border-radius:14px;margin:0 0 22px"><tr><td style="padding:22px;color:#fff"><div style="font-size:12px;font-weight:800;letter-spacing:.11em;color:#efd580;margin-bottom:12px">APPLICATION CODES — REQUIRED FOR REGISTRATION</div><div style="font-size:15px;line-height:1.9"><strong>Invitation reference:</strong> ${INVITATION_CODE}</div><div style="font-size:15px;line-height:1.9"><strong>Personal access code:</strong> <span style="font-size:22px;color:#efd580;font-weight:900;letter-spacing:.08em">${PERSONAL_CODE}</span></div><div style="font-size:15px;line-height:1.9"><strong>Application deadline:</strong> 10 July 2026 at 23:59 CEST</div><p style="margin:18px 0 0"><a href="${applicationUrl}" style="display:inline-block;background:#d7b55b;color:#07192d;text-decoration:none;font-weight:900;padding:14px 22px;border-radius:9px">OPEN SECURE APPLICATION</a></p></td></tr></table><div style="background:#edf9f1;border:1px solid #82c89a;border-radius:12px;padding:18px;margin-bottom:22px"><strong style="color:#174b2b">APPROVED PARTICIPATION IS FULLY COVERED</strong><p style="font-size:14px;line-height:1.65;margin:8px 0 0">There is no application or accreditation fee. Approved hotel accommodation, approved return flights, local transfers and the official programme are covered subject to the written procedures in the attached memorandum.</p></div><h2 style="font-family:Georgia,serif;color:#0b223d;font-size:23px">Complete memorandum attached</h2><p style="font-size:15px;line-height:1.67">The attached verified 12-page English PDF is the complete operational media invitation and accreditation memorandum. It must be read together with this email and the secure application instructions.</p><p style="font-size:14px;line-height:1.6;color:#475569;margin-top:24px">This is one controlled internal delivery test. No external newsroom campaign is being dispatched by this test.</p><table data-gnk-asg-signature="official-media-institutional" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #d9e0e8;margin-top:28px"><tr><td width="155" valign="top" style="padding:18px 18px 8px 0"><img src="https://gnk-asg.hr/assets/gnk-asg-email-logo-final-v2.png" width="140" alt="GNK ASG" style="display:block;border:0;max-width:100%"></td><td valign="top" style="padding:18px 0 8px;font-size:13px;line-height:1.55"><div style="font-size:18px;font-weight:800;color:#0b223d">GNK DINAMO Ltd. Group</div><div style="font-weight:700">Media Relations &amp; Accreditation Center</div><div>Media organiser and operational coordinator: GNK ASG d.o.o.</div><div>London, United Kingdom</div><div><a href="mailto:media@gnk-asg.hr" style="color:#0b223d">media@gnk-asg.hr</a> · <a href="https://gnk-asg.hr" style="color:#0b223d">gnk-asg.hr</a></div></td></tr></table></td></tr></table></td></tr></table></body></html>`;
}

function text(){
  return `CONTROLLED DELIVERY TEST — NOT FOR EXTERNAL DISTRIBUTION\n\nDear Editorial Team,\n\nGNK DINAMO Ltd. Group invites your newsroom to apply for accreditation and media coverage of THE CODE in New York, 6–8 October 2026. The central activation is scheduled for 7 October 2026 at 11:30 a.m. Eastern Time.\n\nAPPLICATION CODES — REQUIRED FOR REGISTRATION\nInvitation reference: ${INVITATION_CODE}\nPersonal access code: ${PERSONAL_CODE}\nApplication deadline: 10 July 2026 at 23:59 CEST\nSecure application: https://gnk-asg.hr/media-application/?lang=en&code=${INVITATION_CODE}\nTHE CODE: https://gnk-asg.hr/the-code/\n\nThe attached verified 12-page English PDF is the complete media invitation and accreditation memorandum.\n\nThis is one controlled internal delivery test. No external newsroom campaign is being dispatched.\n\nGNK DINAMO Ltd. Group\nMedia Relations & Accreditation Center\nMedia organiser and operational coordinator: GNK ASG d.o.o.\nLondon, United Kingdom\nmedia@gnk-asg.hr\nwww.gnk-asg.hr`;
}

export async function handleRhtCodeTestOnce(request,env){
  const url=new URL(request.url);
  if(request.method!=='GET'||url.pathname!==PATH)return null;
  if(url.searchParams.get('key')!==ACCESS_KEY)return new Response('Not found',{status:404,headers:{'cache-control':'no-store'}});
  if(!env.EMAIL?.send)return json({ok:false,error:'EMAIL_binding_missing'},503);
  const kv=kvOf(env);
  const previous=kv?await kv.get(STATE_KEY):null;
  if(previous){try{const parsed=JSON.parse(previous);if(parsed.status==='sent')return json({ok:true,alreadySent:true,result:parsed});}catch{}}
  const pdf=await loadPdf(request,env);
  if(!pdf)return json({ok:false,error:'verified_12_page_pdf_missing_or_mismatch',requiredFilename:PDF_FILENAME,requiredSha256:PDF_SHA256},409);
  const started={status:'sending',to:RECIPIENT,subject:'CODE',startedAt:new Date().toISOString(),version:VERSION,pdfFilename:pdf.filename,pdfSha256:pdf.sha256,invitationCode:INVITATION_CODE,personalAccessCode:PERSONAL_CODE};
  if(kv)await kv.put(STATE_KEY,JSON.stringify(started));
  try{
    const result=await env.EMAIL.send({
      to:RECIPIENT,
      from:{email:FROM,name:'GNK DINAMO Ltd. Group | Media Relations & Accreditation Center'},
      replyTo:FROM,
      subject:'CODE',
      text:text(),
      html:html(),
      attachments:[pdf],
      headers:{'X-GNK-RHT-Code-Test':VERSION,'X-GNK-Invitation-Code':INVITATION_CODE,'X-GNK-PDF-SHA256':PDF_SHA256}
    });
    const sent={...started,status:'sent',sentAt:new Date().toISOString(),messageId:clean(result?.messageId),pdfAttached:true};
    if(kv)await kv.put(STATE_KEY,JSON.stringify(sent));
    return json({ok:true,alreadySent:false,result:sent});
  }catch(error){
    const failed={...started,status:'failed',failedAt:new Date().toISOString(),error:String(error?.message||error)};
    if(kv)await kv.put(STATE_KEY,JSON.stringify(failed));
    return json({ok:false,error:failed.error,result:failed},502);
  }
}
