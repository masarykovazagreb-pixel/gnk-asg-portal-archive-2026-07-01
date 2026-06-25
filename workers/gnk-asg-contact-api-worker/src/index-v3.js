const VERSION = "gnk-asg-mail-unified-v3-20260626";
const INTERNAL_TO = "rht@gmx.com";
const CONTACT_REPLY_MAILBOX = "info";
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const MAX_RECIPIENTS = 50;
const INBOUND_TEXT_LIMIT = 12000;

const COMPANY = {
  name: "GNK ASG d.o.o.",
  address: "Zagrebačka cesta 130, 10090 Zagreb",
  oib: "75227917632",
  mbs: "081512375",
  phone: "+385 91 535 8365",
  web: "https://gnk-asg.hr",
  logo: "https://gnk-asg.hr/assets/gnk-asg-email-logo-final.png"
};

const MAILBOXES = {
  info: { address:"info@gnk-asg.hr", label:"Info Desk", title:"GNK ASG Info Desk" },
  contact: { address:"contact@gnk-asg.hr", label:"Kontakt", title:"GNK ASG Contact Desk" },
  office: { address:"office@gnk-asg.hr", label:"Office", title:"GNK ASG Office" },
  it: { address:"it@gnk-asg.hr", label:"IT podrška", title:"IT – Osobni digitalni asistent", subtitle:"Automatizirana komunikacijska podrška" },
  assistant: { address:"assistant@gnk-asg.hr", label:"AI asistent", title:"IT – Osobni digitalni asistent", subtitle:"Automatizirana komunikacijska podrška" },
  legal: { address:"legal@gnk-asg.hr", label:"Legal & Compliance", title:"GNK ASG Legal & Compliance" },
  privacy: { address:"privacy@gnk-asg.hr", label:"Privatnost / GDPR", title:"GNK ASG Privacy Desk" },
  media: { address:"media@gnk-asg.hr", label:"Media", title:"GNK ASG Media Desk" },
  press: { address:"press@gnk-asg.hr", label:"Press", title:"GNK ASG Press Desk" },
  ubo: { address:"ubo@gnk-asg.hr", label:"UBO / korporativni podaci", title:"GNK ASG UBO Desk" },
  sefic: { address:"sefic@gnk-asg.hr", label:"Office of Nermin Sefić", title:"Office of Nermin Sefić" },
  director: { address:"nermin.sefic@gnk-asg.hr", label:"Nermin Sefić / Direktor", title:"Nermin Sefić", subtitle:"Direktor · GNK ASG d.o.o." }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") return new Response(null,{status:204,headers:corsHeaders()});

    if (path === "/api/contact-mailboxes") {
      return json({ok:true,version:VERSION,mailboxes:publicMailboxes(),updatedAt:new Date().toISOString()});
    }

    if (path === "/api/operator-auth-check") {
      const ok = await authorized(request,env);
      return json({ok,authenticated:ok,worker:"gnk-asg-contact-api",version:VERSION},ok?200:401);
    }

    if (path === "/api/operator-mailbox-config") {
      if (!(await authorized(request,env))) return json({ok:false,error:"unauthorized"},401);
      return json({ok:true,version:VERSION,mailboxes:await operatorMailboxes(env),updatedAt:new Date().toISOString()});
    }

    if (path === "/api/operator-signature-load") {
      if (!(await authorized(request,env))) return json({ok:false,error:"unauthorized"},401);
      const key = safeMailbox(url.searchParams.get("mailbox"));
      const mailbox = MAILBOXES[key];
      const signature = await getSignature(env,key);
      return json({ok:true,mailboxKey:key,address:mailbox.address,label:mailbox.label,signature,signatureHtml:signatureHtml(mailbox,signature)});
    }

    if (path === "/api/operator-signature-save") {
      if (!(await authorized(request,env))) return json({ok:false,error:"unauthorized"},401);
      if (request.method !== "POST") return json({ok:false,error:"method_not_allowed"},405);
      const data = await readJson(request);
      const key = safeMailbox(data.mailbox);
      const signature = clean(data.signature).slice(0,5000);
      if (!signature) return json({ok:false,error:"signature_required"},400);
      if (!env.GNK_ASG_KV?.put) return json({ok:false,error:"kv_binding_missing"},503);
      await env.GNK_ASG_KV.put(`operator:signature:${key}`,signature);
      return json({ok:true,saved:true,mailboxKey:key,signature});
    }

    if (path === "/api/operator-send-mail" || path === "/api/admin-mail-send") {
      if (!(await authorized(request,env))) return json({ok:false,error:"unauthorized",message:"Unesite valjani operatorski token."},401);
      if (request.method !== "POST") return json({ok:false,error:"method_not_allowed"},405);
      return handleOperatorMail(request,env);
    }

    if (path === "/api/operator-mail-log") {
      if (!(await authorized(request,env))) return json({ok:false,error:"unauthorized"},401);
      return listMailLog(env);
    }

    if (path.startsWith("/api/mail-center/")) {
      if (!(await authorized(request,env))) return json({ok:false,error:"unauthorized"},401);
      return mailCenter(path,env);
    }

    if (path === "/api/contact-submit") {
      if (request.method === "GET") {
        return json({
          ok:true,worker:"gnk-asg-contact-api",version:VERSION,status:"READY",
          endpoint:"/api/contact-submit",mailboxes:publicMailboxes(),
          contactReplyFrom:MAILBOXES[CONTACT_REPLY_MAILBOX].address,
          contactReplySignatureSource:"Mail Studio / KV info profile",
          contactReplyPdf:true,
          bindings:{kv:Boolean(env.GNK_ASG_KV),r2:Boolean(env.GNK_ASG_MEDIA_ASSETS),email:Boolean(env.EMAIL),ai:Boolean(env.AI)},
          updatedAt:new Date().toISOString()
        });
      }
      if (request.method !== "POST") return json({ok:false,error:"method_not_allowed"},405);
      return handleContact(request,env);
    }

    return json({ok:false,error:"not_found",worker:"gnk-asg-contact-api",version:VERSION,path},404);
  },

  async email(message,env,ctx) {
    const task = handleInboundEmail(message,env);
    if (ctx?.waitUntil) ctx.waitUntil(task);
    else await task;
  }
};

async function handleOperatorMail(request,env){
  const parsed = await parsePayload(request);
  if (!parsed.ok) return json(parsed,parsed.status||400);
  const data = parsed.data;
  const mailboxKey = safeMailbox(data.mailbox || data.profile || profileToMailbox(data.signatureProfile));
  const mailbox = MAILBOXES[mailboxKey];
  const to = parseAddresses(data.to);
  const cc = parseAddresses(data.cc);
  const bcc = parseAddresses(data.bcc);
  const subject = clean(data.subject);
  const body = clean(data.body || data.text || data.plainText);

  if (!to.length || !subject || !body) {
    return json({ok:false,error:"missing_fields",message:"Nedostaju primatelj, predmet ili tekst poruke."},400);
  }
  if (to.length + cc.length + bcc.length > MAX_RECIPIENTS) {
    return json({ok:false,error:"too_many_recipients",message:`Najviše ${MAX_RECIPIENTS} primatelja ukupno.`},400);
  }

  const attachments = normalizeAttachments(data.attachments || data.pdfAttachments || []);
  if (parsed.pdf) attachments.push(parsed.pdf);
  if (!attachments.length) {
    return json({ok:false,error:"pdf_required",message:"Za slanje je obvezan najmanje jedan PDF prilog."},400);
  }
  const attachmentError = validateAttachments(attachments,true);
  if (attachmentError) return json({ok:false,...attachmentError},400);

  const addSignature = String(data.addSignature ?? "yes").toLowerCase() !== "no";
  const customSignature = clean(data.signature) || await getSignature(env,mailboxKey);
  const plain = addSignature ? appendTextSignature(body,customSignature) : body;
  const suppliedHtml = clean(data.bodyHtml || data.htmlBody || data.messageHtml || data.contentHtml || data.html);
  const htmlBody = suppliedHtml && !looksLikeEscapedHtml(body) ? suppliedHtml : paragraphsHtml(body);
  const html = addSignature ? appendHtmlSignature(htmlBody,mailbox,customSignature) : htmlBody;

  const result = await sendEmail(env,{
    to,cc,bcc,
    from:{email:mailbox.address,name:mailbox.title},
    replyTo:mailbox.address,
    subject,text:plain,html,attachments
  });

  const record = {
    type:"operator-mail",sentAt:new Date().toISOString(),mailboxKey,from:mailbox.address,
    to,cc,bcc,subject,addSignature,attachmentCount:attachments.length,
    attachments:attachments.map(item=>({filename:item.filename,size:item.size||0,type:item.type})),result
  };
  await saveMailLog(env,record);

  return json({
    ok:result.sent,worker:"gnk-asg-contact-api",version:VERSION,
    mailboxKey,from:mailbox.address,fromLabel:mailbox.label,to,cc,bcc,subject,
    signatureUsed:addSignature,attachmentCount:attachments.length,result
  },result.sent?200:502);
}

async function handleContact(request,env){
  let form;
  try{form=await request.formData();}catch{return json({ok:false,error:"invalid_form",message:"Forma nije pravilno poslana."},400);}

  const honeypot = clean(form.get("website") || form.get("company_website"));
  if (honeypot) return json({ok:true,message:"Upit je zaprimljen."});

  const mailboxKey = safeMailbox(form.get("mailbox") || form.get("departmentKey"));
  const mailbox = MAILBOXES[mailboxKey];
  const name = clean(form.get("name"));
  const email = clean(form.get("email"));
  const phone = clean(form.get("phone"));
  const subject = clean(form.get("subject") || "Upit putem GNK ASG portala");
  const message = clean(form.get("message"));
  const consent = clean(form.get("consent"));

  if (!name || !validEmail(email) || !subject || !message || !["yes","on","true","1"].includes(consent.toLowerCase())) {
    return json({ok:false,error:"missing_or_invalid_fields",message:"Provjerite obvezna polja, e-mail adresu i privolu."},400);
  }

  const now = new Date();
  const caseId = `GNK-ASG-${now.toISOString().slice(0,10).replace(/-/g,"")}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
  const pdf = await readPdf(form.get("pdf"));
  if (pdf.error) return json({ok:false,error:pdf.error,message:pdf.message},400);
  const savedPdf = pdf.attachment ? await savePdf(env,pdf.attachment,caseId) : {saved:false,key:null,error:null};

  const record = {
    caseId,receivedAt:now.toISOString(),mailboxKey,mailboxAddress:mailbox.address,mailboxLabel:mailbox.label,
    internalForward:INTERNAL_TO,name,email,phone,subject,message,consent:true,
    attachmentName:pdf.attachment?.filename||null,attachmentSize:pdf.attachment?.size||0,
    attachmentKey:savedPdf.key,r2Saved:savedPdf.saved,r2Error:savedPdf.error,
    source:"public-contact-form",worker:"gnk-asg-contact-api",status:"received"
  };
  await saveContact(env,record);

  const receiptPdf = buildContactReceiptPdf(record);
  const internalText = contactInternalText(record);
  const internalHtml = contactInternalHtml(record);
  const internalAttachments = pdf.attachment ? [stripSize(pdf.attachment)] : [stripSize(receiptPdf)];
  const internalMail = await sendEmail(env,{
    to:[INTERNAL_TO],from:{email:mailbox.address,name:mailbox.title},replyTo:email,
    subject:`[${caseId}] ${subject}`,text:internalText,html:internalHtml,attachments:internalAttachments
  });

  const replyMailbox = MAILBOXES[CONTACT_REPLY_MAILBOX];
  const replySignature = await getSignature(env,CONTACT_REPLY_MAILBOX);
  const autoText = contactReplyText(record,replyMailbox,replySignature);
  const autoHtml = contactReplyHtml(record,replyMailbox,replySignature);
  const autoReply = await sendEmail(env,{
    to:[email],from:{email:replyMailbox.address,name:replyMailbox.title},replyTo:replyMailbox.address,
    subject:`[${caseId}] Potvrda zaprimanja upita`,text:autoText,html:autoHtml,attachments:[stripSize(receiptPdf)]
  });

  record.status = internalMail.sent ? "delivered-internal" : "delivery-failed";
  record.replyMailboxKey = CONTACT_REPLY_MAILBOX;
  record.replyMailboxAddress = replyMailbox.address;
  record.replySignatureSource = "operator:signature:info";
  record.receiptPdf = {filename:receiptPdf.filename,size:receiptPdf.size};
  record.internalMail = internalMail;
  record.autoReply = autoReply;
  await saveContact(env,record);
  await saveMailLog(env,{
    type:"contact",sentAt:new Date().toISOString(),caseId,from:replyMailbox.address,
    to:[INTERNAL_TO,email],subject,attachmentCount:1,result:{internalMail,autoReply}
  });

  return json({
    ok:internalMail.sent,deliveryOk:internalMail.sent&&autoReply.sent,worker:"gnk-asg-contact-api",version:VERSION,
    caseId,receivedAt:record.receivedAt,selectedMailbox:mailbox.address,selectedMailboxLabel:mailbox.label,
    replyFrom:replyMailbox.address,replySignatureSource:"Mail Studio info profile",receiptPdf:receiptPdf.filename,
    message:internalMail.sent?"Upit je zaprimljen i proslijeđen.":"Upit je spremljen, ali e-mail prosljeđivanje nije uspjelo.",
    r2Saved:savedPdf.saved,internalMail,autoReply
  },internalMail.sent?200:502);
}

async function handleInboundEmail(message,env){
  const receivedAt = new Date().toISOString();
  const caseId = `GNK-MAIL-${receivedAt.slice(0,10).replace(/-/g,"")}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
  const toAddress = clean(message.to).toLowerCase();
  const fromAddress = clean(message.from).toLowerCase();
  const mailboxKey = mailboxFromAddress(toAddress);
  const mailbox = MAILBOXES[mailboxKey];
  const subject = clean(message.headers?.get?.("subject") || "Dolazna poruka");
  let raw = "";
  try{raw = await new Response(message.raw).text();}catch{}
  const text = raw.slice(0,INBOUND_TEXT_LIMIT);

  let forwarded = false;
  let forwardError = null;
  try{
    if (typeof message.forward === "function") {
      await message.forward(INTERNAL_TO);
      forwarded = true;
    }
  }catch(error){forwardError=String(error?.message||error);}

  const aiDraft = await prepareAiDraft(env,{fromAddress,toAddress,subject,text,mailboxKey});
  const record = {
    type:"inbound-mail",caseId,receivedAt,from:fromAddress,to:toAddress,subject,mailboxKey,
    forwarded,forwardError,aiMode:"draft_only",aiDraft,status:"received"
  };
  await saveInbox(env,record);

  let acknowledgement = {attempted:false,sent:false,skipped:true,error:null};
  if (validEmail(fromAddress) && !fromAddress.endsWith("@gnk-asg.hr") && !/no-?reply/i.test(fromAddress)) {
    const signature = await getSignature(env,mailboxKey);
    const receipt = buildInboundReceiptPdf(record);
    const body = `Poštovani/Poštovana,\n\nVaša poruka je zaprimljena u sustavu GNK ASG.\n\nEvidencijski broj: ${caseId}\nPrimatelj: ${mailbox.address}\nVrijeme zaprimanja: ${receivedAt}\n\nSadržaj poruke bit će pregledan prije slanja sadržajnog odgovora.`;
    acknowledgement = await sendEmail(env,{
      to:[fromAddress],from:{email:mailbox.address,name:mailbox.title},replyTo:mailbox.address,
      subject:`[${caseId}] Potvrda zaprimanja poruke`,
      text:appendTextSignature(body,signature),
      html:appendHtmlSignature(paragraphsHtml(body),mailbox,signature),
      attachments:[stripSize(receipt)]
    });
  }

  record.acknowledgement = acknowledgement;
  await saveInbox(env,record);
  await saveMailLog(env,{type:"inbound-acknowledgement",sentAt:new Date().toISOString(),caseId,from:mailbox.address,to:[fromAddress],subject,attachmentCount:1,result:acknowledgement});
  return record;
}

async function prepareAiDraft(env,input){
  const fallback = {
    ai:false,
    model:null,
    text:`Poštovani/Poštovana,\n\nzahvaljujemo na poruci vezanoj uz predmet „${input.subject}”. Poruka je zaprimljena i bit će pregledana prije dostave sadržajnog odgovora.\n\nSrdačan pozdrav,`
  };
  if (!env.AI?.run) return fallback;
  try{
    const prompt = [
      "Pripremi samo nacrt profesionalnog odgovora na hrvatskom jeziku.",
      "Nacrt se ne smije automatski poslati. Ne izmišljaj činjenice ni obveze.",
      `Pošiljatelj: ${input.fromAddress}`,
      `Primatelj: ${input.toAddress}`,
      `Predmet: ${input.subject}`,
      "Sadržaj poruke:",
      input.text.slice(0,8000)
    ].join("\n");
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast",{messages:[{role:"system",content:"Ti si interni GNK ASG pomoćnik za pripremu nacrta e-mail odgovora. Ne šalješ poruke."},{role:"user",content:prompt}]});
    const text = clean(result?.response || result?.result?.response || result?.text);
    return text ? {ai:true,model:"@cf/meta/llama-3.1-8b-instruct-fast",text} : fallback;
  }catch(error){return {...fallback,error:String(error?.message||error)};}
}

async function sendEmail(env,payload){
  const result = {attempted:false,sent:false,messageId:null,error:null,code:null};
  if (!env.EMAIL?.send){result.error="EMAIL binding nije dostupan.";result.code="EMAIL_BINDING_MISSING";return result;}
  try{
    result.attempted=true;
    const message = {
      to:payload.to,
      from:payload.from,
      subject:payload.subject,
      text:payload.text,
      html:payload.html,
      replyTo:payload.replyTo
    };
    if (payload.cc?.length) message.cc=payload.cc;
    if (payload.bcc?.length) message.bcc=payload.bcc;
    if (payload.attachments?.length) message.attachments=payload.attachments.map(stripSize);
    const response = await env.EMAIL.send(message);
    result.sent=true;
    result.messageId=response?.messageId||null;
  }catch(error){
    result.error=String(error?.message||error);
    result.code=String(error?.code||"EMAIL_SEND_FAILED");
  }
  return result;
}

async function parsePayload(request){
  const type=request.headers.get("content-type")||"";
  if (type.includes("multipart/form-data")){
    let form;
    try{form=await request.formData();}catch{return{ok:false,status:400,error:"invalid_form",message:"Mail forma nije pravilno poslana."};}
    const data={};
    for (const key of ["mailbox","profile","signatureProfile","to","cc","bcc","subject","body","text","html","bodyHtml","signature","addSignature"]){
      const value=form.get(key); if(typeof value==="string") data[key]=value;
    }
    const pdf=await readPdf(form.get("pdf"));
    if(pdf.error)return{ok:false,status:400,error:pdf.error,message:pdf.message};
    return{ok:true,data,pdf:pdf.attachment};
  }
  const data=await readJson(request);
  return{ok:true,data};
}

async function readPdf(file){
  if (!(file && typeof file==="object" && "arrayBuffer" in file && Number(file.size||0)>0)) return{attachment:null};
  const filename=clean(file.name||"attachment.pdf").replace(/[^a-zA-Z0-9._-]+/g,"_").slice(0,140);
  const size=Number(file.size||0);
  const type=clean(file.type||"application/pdf").toLowerCase();
  if (!filename.toLowerCase().endsWith(".pdf") && type!=="application/pdf") return{error:"invalid_pdf",message:"Dopušten je samo PDF prilog."};
  if (size>MAX_ATTACHMENT_BYTES) return{error:"pdf_too_large",message:"PDF prilog smije imati najviše 4 MB."};
  return{attachment:{content:arrayBufferToBase64(await file.arrayBuffer()),filename,type:"application/pdf",disposition:"attachment",size}};
}

function normalizeAttachments(value){
  if(!Array.isArray(value))return[];
  return value.slice(0,32).map(item=>({
    content:clean(item?.content||item?.base64),
    filename:clean(item?.filename||item?.name||"attachment.pdf").replace(/[^a-zA-Z0-9._-]+/g,"_").slice(0,140),
    type:clean(item?.type||item?.contentType||item?.mimeType||"application/pdf").toLowerCase(),
    disposition:"attachment",
    size:Number(item?.size||Math.ceil(clean(item?.content||item?.base64).length*0.75))
  })).filter(item=>item.content&&item.filename);
}

function validateAttachments(items,pdfOnly=false){
  if(items.length>32)return{error:"too_many_attachments",message:"Najviše 32 priloga."};
  if(pdfOnly&&items.some(item=>item.type!=="application/pdf"&&!item.filename.toLowerCase().endsWith(".pdf")))return{error:"invalid_attachment",message:"Dopušteni su samo PDF prilozi."};
  const total=items.reduce((sum,item)=>sum+Number(item.size||0),0);
  if(total>MAX_ATTACHMENT_BYTES)return{error:"attachments_too_large",message:"Ukupna veličina priloga smije biti najviše 4 MB."};
  return null;
}

function buildContactReceiptPdf(record){
  return buildSimplePdf([
    "GNK ASG - POTVRDA ZAPRIMANJA UPITA",
    `Evidencijski broj: ${record.caseId}`,
    `Vrijeme zaprimanja: ${record.receivedAt}`,
    `Podnositelj: ${record.name}`,
    `E-mail: ${record.email}`,
    `Odabrani odjel: ${record.mailboxLabel} (${record.mailboxAddress})`,
    `Predmet: ${record.subject}`,
    "Ovaj PDF je automatska potvrda zaprimanja."
  ],`GNK_ASG_Potvrda_${record.caseId}.pdf`);
}

function buildInboundReceiptPdf(record){
  return buildSimplePdf([
    "GNK ASG - POTVRDA ZAPRIMANJA E-MAILA",
    `Evidencijski broj: ${record.caseId}`,
    `Vrijeme zaprimanja: ${record.receivedAt}`,
    `Pošiljatelj: ${record.from}`,
    `Primatelj: ${record.to}`,
    `Predmet: ${record.subject}`,
    "Sadržajni odgovor bit će pregledan prije slanja."
  ],`GNK_ASG_Potvrda_${record.caseId}.pdf`);
}

function buildSimplePdf(lines,filename){
  const safeLines=lines.map(line=>pdfAscii(line).slice(0,110));
  const commands=["BT","/F1 16 Tf","72 770 Td"];
  safeLines.forEach((line,index)=>{
    if(index===1)commands.push("/F1 11 Tf");
    if(index>0)commands.push("0 -28 Td");
    commands.push(`(${pdfEscape(line)}) Tj`);
  });
  commands.push("ET");
  const stream=commands.join("\n");
  const objects=[
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`
  ];
  let pdf="%PDF-1.4\n";
  const offsets=[0];
  objects.forEach((object,index)=>{offsets.push(new TextEncoder().encode(pdf).length);pdf+=`${index+1} 0 obj\n${object}\nendobj\n`;});
  const xref=new TextEncoder().encode(pdf).length;
  pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset=>{pdf+=`${String(offset).padStart(10,"0")} 00000 n \n`;});
  pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes=new TextEncoder().encode(pdf);
  return{content:uint8ToBase64(bytes),filename,type:"application/pdf",disposition:"attachment",size:bytes.length};
}

function pdfAscii(value){return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,match=>match==="Đ"?"D":"d").replace(/[^\x20-\x7E]/g," ");}
function pdfEscape(value){return String(value||"").replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");}
function stripSize(item){const {size,...out}=item;return out;}

async function savePdf(env,attachment,caseId){
  if(!env.GNK_ASG_MEDIA_ASSETS?.put)return{saved:false,key:null,error:"R2 binding nije dostupan."};
  const key=`contact-pdf/${caseId}/${attachment.filename}`;
  try{
    await env.GNK_ASG_MEDIA_ASSETS.put(key,base64ToArrayBuffer(attachment.content),{
      httpMetadata:{contentType:attachment.type},customMetadata:{uploadedAt:new Date().toISOString()}
    });
    return{saved:true,key,error:null};
  }catch(error){return{saved:false,key,error:String(error?.message||error)};}
}

async function saveContact(env,record){
  if(!env.GNK_ASG_KV?.put)return false;
  try{
    await env.GNK_ASG_KV.put(`contact:${record.caseId}`,JSON.stringify(record));
    await env.GNK_ASG_KV.put("contact:last",JSON.stringify(record));
    const raw=await env.GNK_ASG_KV.get("contact:index");
    let index=[];try{index=raw?JSON.parse(raw):[];}catch{}
    index=[{caseId:record.caseId,receivedAt:record.receivedAt,name:record.name,email:record.email,subject:record.subject,status:record.status},...index.filter(x=>x.caseId!==record.caseId)].slice(0,500);
    await env.GNK_ASG_KV.put("contact:index",JSON.stringify(index));
    return true;
  }catch{return false;}
}

async function saveInbox(env,record){
  if(!env.GNK_ASG_KV?.put)return false;
  try{
    await env.GNK_ASG_KV.put(`mail:inbox:${record.caseId}`,JSON.stringify(record));
    await env.GNK_ASG_KV.put("mail:inbox:last",JSON.stringify(record));
    const raw=await env.GNK_ASG_KV.get("mail:inbox:index");
    let index=[];try{index=raw?JSON.parse(raw):[];}catch{}
    const item={caseId:record.caseId,receivedAt:record.receivedAt,from:record.from,to:record.to,subject:record.subject,mailboxKey:record.mailboxKey,forwarded:record.forwarded,aiMode:record.aiMode,aiDraft:record.aiDraft};
    index=[item,...index.filter(x=>x.caseId!==record.caseId)].slice(0,500);
    await env.GNK_ASG_KV.put("mail:inbox:index",JSON.stringify(index));
    return true;
  }catch{return false;}
}

async function saveMailLog(env,record){
  if(!env.GNK_ASG_KV?.put)return false;
  try{
    const key=`operator:mail-log:${Date.now()}:${crypto.randomUUID()}`;
    await env.GNK_ASG_KV.put(key,JSON.stringify(record));
    const raw=await env.GNK_ASG_KV.get("operator:mail-log:index");
    let index=[];try{index=raw?JSON.parse(raw):[];}catch{}
    index=[{key,type:record.type,sentAt:record.sentAt,from:record.from,to:record.to,subject:record.subject,attachmentCount:record.attachmentCount||0,sent:Boolean(record.result?.sent||record.result?.internalMail?.sent)},...index].slice(0,500);
    await env.GNK_ASG_KV.put("operator:mail-log:index",JSON.stringify(index));
    return true;
  }catch{return false;}
}

async function listMailLog(env){
  if(!env.GNK_ASG_KV?.get)return json({ok:false,error:"kv_binding_missing"},503);
  let items=[];try{items=JSON.parse(await env.GNK_ASG_KV.get("operator:mail-log:index")||"[]");}catch{}
  return json({ok:true,version:VERSION,items});
}

async function mailCenter(path,env){
  if(!env.GNK_ASG_KV?.get)return json({ok:false,error:"kv_binding_missing"},503);
  if(path==="/api/mail-center/status"){
    let lastInbound=null,lastSent=null;
    try{lastInbound=JSON.parse(await env.GNK_ASG_KV.get("mail:inbox:last")||"null");}catch{}
    try{lastSent=JSON.parse(await env.GNK_ASG_KV.get("operator:mail-last")||"null");}catch{}
    return json({ok:true,version:VERSION,inboundMode:"save_forward_acknowledge_ai_draft",aiSendMode:"draft_only",lastInbound,lastSent});
  }
  if(path==="/api/mail-center/inbox"){
    let items=[];try{items=JSON.parse(await env.GNK_ASG_KV.get("mail:inbox:index")||"[]");}catch{}
    return json({ok:true,version:VERSION,items});
  }
  if(path==="/api/mail-center/sent"||path==="/api/mail-center/outbox"){
    let items=[];try{items=JSON.parse(await env.GNK_ASG_KV.get("operator:mail-log:index")||"[]");}catch{}
    return json({ok:true,version:VERSION,box:path.endsWith("sent")?"sent":"outbox",items});
  }
  return json({ok:false,error:"not_found"},404);
}

async function operatorMailboxes(env){
  const list=[];
  for(const [key,mailbox] of Object.entries(MAILBOXES)){
    list.push({key,address:mailbox.address,label:mailbox.label,title:mailbox.title,signature:await getSignature(env,key)});
  }
  return list;
}

function publicMailboxes(){return Object.entries(MAILBOXES).filter(([key])=>key!=="director"&&key!=="sefic").map(([key,m])=>({key,address:m.address,label:m.label}));}

async function getSignature(env,key){
  try{const stored=await env.GNK_ASG_KV?.get(`operator:signature:${key}`);if(stored)return stored;}catch{}
  return defaultSignature(MAILBOXES[key]);
}

function defaultSignature(mailbox){return `${mailbox.title}\n${mailbox.subtitle?mailbox.subtitle+"\n":""}${COMPANY.name}\n${COMPANY.address}\nOIB: ${COMPANY.oib} · MBS: ${COMPANY.mbs}\nTelefon: ${COMPANY.phone}\nWeb: ${COMPANY.web}\nE-mail: ${mailbox.address}`;}
function appendTextSignature(body,signature){const trimmed=body.trim();const hasClosing=/(srdačan pozdrav|s poštovanjem|kind regards|best regards)[,!]?\s*$/i.test(trimmed);return `${trimmed}${hasClosing?"\n\n":"\n\nSrdačan pozdrav,\n\n"}${signature}`;}
function appendHtmlSignature(bodyHtml,mailbox,signature){return `${bodyHtml}${signatureHtml(mailbox,signature)}`;}
function signatureHtml(mailbox,signature){const lines=signature.split(/\r?\n/).filter(Boolean);const title=escapeHtml(lines.shift()||mailbox.title);const rest=lines.map(line=>`<div>${escapeHtml(line)}</div>`).join("");return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;border-collapse:collapse;margin-top:24px;max-width:720px;width:100%;border-top:1px solid #d9d9d9"><tr><td width="170" valign="top" style="width:170px;padding:16px 22px 8px 0"><img src="${COMPANY.logo}" width="150" alt="GNK ASG" style="display:block;width:150px;max-width:150px;height:auto;border:0"></td><td valign="top" style="padding:18px 0 8px;color:#111827;font-size:14px;line-height:1.48"><div style="font-size:20px;font-weight:700;color:#111827;margin-bottom:6px">${title}</div>${rest}</td></tr></table>`;}
function paragraphsHtml(value){return clean(value).split(/\n{2,}/).map(p=>`<p style="margin:0 0 14px;line-height:1.6">${escapeHtml(p).replace(/\n/g,"<br>")}</p>`).join("");}
function looksLikeEscapedHtml(value){return /<\/?[a-z][\s\S]*>/i.test(value);}
function contactInternalText(r){return `GNK ASG – novi upit putem kontakt forme\n\nEvidencijski broj: ${r.caseId}\nOdjel: ${r.mailboxLabel} (${r.mailboxAddress})\nVrijeme: ${r.receivedAt}\n\nPodnositelj: ${r.name}\nE-mail: ${r.email}\nTelefon: ${r.phone||"-"}\nPredmet: ${r.subject}\nPDF: ${r.attachmentName||"nije priložen"}\n\nPoruka:\n${r.message}`;}
function contactInternalHtml(r){return `<div style="font-family:Arial,sans-serif;color:#111827"><h2>GNK ASG – novi kontaktni upit</h2><p><b>Evidencijski broj:</b> ${escapeHtml(r.caseId)}<br><b>Odjel:</b> ${escapeHtml(r.mailboxLabel)} (${escapeHtml(r.mailboxAddress)})<br><b>Vrijeme:</b> ${escapeHtml(r.receivedAt)}</p><p><b>Podnositelj:</b> ${escapeHtml(r.name)}<br><b>E-mail:</b> ${escapeHtml(r.email)}<br><b>Telefon:</b> ${escapeHtml(r.phone||"-")}<br><b>Predmet:</b> ${escapeHtml(r.subject)}<br><b>PDF:</b> ${escapeHtml(r.attachmentName||"nije priložen")}</p><h3>Poruka</h3>${paragraphsHtml(r.message)}</div>`;}
function contactReplyText(r,m,signature){return `Poštovani/Poštovana ${r.name},\n\nzaprimili smo Vaš upit „${r.subject}”.\n\nEvidencijski broj: ${r.caseId}\nOdjel: ${r.mailboxLabel}\nVrijeme zaprimanja: ${r.receivedAt}\n\nSačuvajte evidencijski broj radi buduće komunikacije.\n\nSrdačan pozdrav,\n\n${signature}\n\nOvo je automatska potvrda zaprimanja.`;}
function contactReplyHtml(r,m,signature){return `<div style="font-family:Arial,sans-serif;color:#111827;font-size:15px"><p>Poštovani/Poštovana ${escapeHtml(r.name)},</p><p>zaprimili smo Vaš upit „${escapeHtml(r.subject)}”.</p><p><b>Evidencijski broj:</b> ${escapeHtml(r.caseId)}<br><b>Odjel:</b> ${escapeHtml(r.mailboxLabel)}<br><b>Vrijeme zaprimanja:</b> ${escapeHtml(r.receivedAt)}</p><p>Sačuvajte evidencijski broj radi buduće komunikacije.</p>${signatureHtml(m,signature)}<p style="color:#6b7280;font-size:12px">Ovo je automatska potvrda zaprimanja.</p></div>`;}

function mailboxFromAddress(value){const address=clean(value).toLowerCase();for(const [key,mailbox] of Object.entries(MAILBOXES)){if(mailbox.address.toLowerCase()===address)return key;}return"info";}
function profileToMailbox(value){return({office:"office",legal:"legal",media:"media",it:"it",director:"director",info:"info"})[clean(value).toLowerCase()]||"info";}
function safeMailbox(value){const key=clean(value||"info").toLowerCase().replace(/[^a-z0-9_-]/g,"");return MAILBOXES[key]?key:"info";}
function parseAddresses(value){return clean(value).split(/[;,\n]+/).map(x=>x.trim()).filter(validEmail).slice(0,MAX_RECIPIENTS);}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(value));}
function clean(value){return String(value??"").trim();}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[ch]);}
async function readJson(request){try{return await request.json();}catch{return{};}}

async function authorized(request,env){
  const token=suppliedToken(request);
  if(!token)return false;
  const expectedHash=clean(env.OPERATOR_TOKEN_SHA256).toLowerCase();
  if(expectedHash&&expectedHash.length===64)return constantTimeEqual(await sha256(token),expectedHash);
  const secrets=[env.GNK_ASG_OPERATOR_TOKEN,env.OPERATOR_TOKEN,env.GNK_ASG_ADMIN_TOKEN,env.ADMIN_TOKEN,env.PORTAL_OPERATOR_TOKEN].map(clean).filter(Boolean);
  return secrets.some(secret=>constantTimeEqual(token,secret));
}
function suppliedToken(request){const auth=request.headers.get("authorization")||"";const match=auth.match(/^Bearer\s+(.+)$/i);const url=new URL(request.url);return clean(match?.[1]||request.headers.get("x-operator-token")||request.headers.get("x-admin-token")||url.searchParams.get("token"));}
async function sha256(value){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");}
function constantTimeEqual(a,b){a=String(a||"");b=String(b||"");let mismatch=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)mismatch|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return mismatch===0;}
function arrayBufferToBase64(buffer){return uint8ToBase64(new Uint8Array(buffer));}
function uint8ToBase64(bytes){let binary="";for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary);}
function base64ToArrayBuffer(value){const binary=atob(value);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes.buffer;}
function corsHeaders(){return{"access-control-allow-origin":"*","access-control-allow-methods":"GET, POST, OPTIONS","access-control-allow-headers":"content-type, authorization, x-operator-token, x-admin-token"};}
function json(data,status=200){return new Response(JSON.stringify(data,null,2),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store, no-cache, must-revalidate, max-age=0",...corsHeaders()}});}
