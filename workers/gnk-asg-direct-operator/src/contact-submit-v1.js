export const VERSION='GNK_ASG_CONTACT_SUBMIT_V1_20260628';
export const PATH='/api/contact-submit';
const MAX_PDF=3200000;
const MAILBOXES={info:'info@gnk-asg.hr',contact:'contact@gnk-asg.hr',media:'media@gnk-asg.hr',press:'press@gnk-asg.hr',legal:'legal@gnk-asg.hr',privacy:'privacy@gnk-asg.hr',it:'it@gnk-asg.hr',ubo:'ubo@gnk-asg.hr',sefic:'sefic@gnk-asg.hr',assistant:'assistant@gnk-asg.hr'};
const clean=value=>String(value??'').trim();
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value));
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-gnk-asg-contact-submit':VERSION}});
async function readIndex(kv){try{const raw=await kv.get('contact:index');return raw?JSON.parse(raw):[];}catch{return[];}}
export async function handleContactSubmit(request,env){
  const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
  if(path!==PATH)return null;
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  let form;try{form=await request.formData();}catch{return json({ok:false,error:'invalid_form'},400);}
  const mailboxKey=clean(form.get('mailbox')).toLowerCase(),mailboxAddress=MAILBOXES[mailboxKey];
  const name=clean(form.get('name')).slice(0,160),email=clean(form.get('email')).toLowerCase();
  const phone=clean(form.get('phone')).slice(0,80),subject=clean(form.get('subject')).replace(/[\r\n]+/g,' ').slice(0,240);
  const message=clean(form.get('message')).slice(0,20000),consent=clean(form.get('consent'));
  if(!mailboxAddress||!name||!validEmail(email)||!subject||message.length<5||consent!=='yes')return json({ok:false,error:'invalid_submission'},400);
  const file=form.get('pdf');let bytes=null,attachmentName='',attachmentSize=0,attachmentKey='',r2Saved=false;
  if(file&&typeof file==='object'&&Number(file.size||0)>0){
    attachmentName=clean(file.name||'document.pdf').replace(/[^A-Za-z0-9._ -]+/g,'_').slice(0,120)||'document.pdf';
    attachmentSize=Number(file.size||0);
    if(attachmentSize>MAX_PDF)return json({ok:false,error:'pdf_too_large',maxBytes:MAX_PDF},413);
    if(clean(file.type).toLowerCase()!=='application/pdf'&&!attachmentName.toLowerCase().endsWith('.pdf'))return json({ok:false,error:'pdf_required'},415);
    bytes=new Uint8Array(await file.arrayBuffer());
    if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return json({ok:false,error:'invalid_pdf'},415);
  }
  const caseId=`GNK-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
  const receivedAt=new Date().toISOString();
  if(bytes&&env.GNK_ASG_MEDIA_ASSETS?.put){
    attachmentKey=`contact/${caseId}/${attachmentName}`;
    await env.GNK_ASG_MEDIA_ASSETS.put(attachmentKey,bytes,{httpMetadata:{contentType:'application/pdf'},customMetadata:{caseId,filename:attachmentName,uploadedAt:receivedAt}});
    r2Saved=true;
  }
  const record={caseId,receivedAt,mailboxKey,mailboxAddress,mailboxLabel:mailboxKey.toUpperCase(),name,email,phone,subject,message,status:'received',attachmentName,attachmentSize,r2Saved,attachmentKey,source:'public-contact-form'};
  const kv=env.GNK_ASG_KV||env.GNK_ASG_CONFIG_KV;
  if(!kv?.put)return json({ok:false,error:'contact_storage_unavailable'},503);
  const index=await readIndex(kv),summary={caseId,receivedAt,name,email,subject,status:'received'};
  await Promise.all([kv.put(`contact:${caseId}`,JSON.stringify(record,null,2)),kv.put('contact:index',JSON.stringify([summary,...(Array.isArray(index)?index:[]).filter(item=>item?.caseId!==caseId)].slice(0,500),null,2))]);
  let delivery={sent:false,error:''};
  if(env.EMAIL?.send){
    const payload={to:mailboxAddress,from:{email:'contact@gnk-asg.hr',name:'GNK ASG Contact'},replyTo:email,subject:`[${caseId}] ${subject}`,text:[`Evidencijski broj: ${caseId}`,`Odjel: ${mailboxKey}`,`Ime / naziv: ${name}`,`E-mail: ${email}`,`Telefon: ${phone||'—'}`,'',message].join('\n'),headers:{'X-GNK-Contact-Case':caseId}};
    if(bytes)payload.attachments=[{content:bytes,filename:attachmentName,type:'application/pdf',disposition:'attachment'}];
    try{const result=await env.EMAIL.send(payload);delivery={sent:true,messageId:clean(result?.messageId)};}catch(error){delivery={sent:false,error:String(error?.message||error).slice(0,300)};}
  }
  record.internalMail=delivery;await kv.put(`contact:${caseId}`,JSON.stringify(record,null,2));
  return json({ok:true,reference:caseId,receivedAt,mailbox:mailboxAddress,delivery},201);
}
