(()=>{
'use strict';
if(window.__GNK_ASG_MAIL_STUDIO_ENGLISH_V24__)return;
window.__GNK_ASG_MAIL_STUDIO_ENGLISH_V24__=true;

const VERSION='GNK_ASG_MAIL_STUDIO_ENGLISH_V24_20260630_PREVIEW_ATTACHMENTS';
const BCC='rht@gmx.com';
const SEND_ENDPOINT='/api/studio-message/send';
const BOX={inbox:'/api/studio-message/inbox',sent:'/api/studio-message/sent',outbox:'/api/studio-message/outbox',status:'/api/studio-message/status'};
const PROFILES={
  office:{email:'office@gnk-asg.hr',name:'GNK ASG Office'},
  legal:{email:'legal@gnk-asg.hr',name:'GNK ASG Legal & Compliance'},
  media:{email:'media@gnk-asg.hr',name:'GNK DINAMO Ltd. Group | Media Relations & Accreditation Center'},
  it:{email:'it@gnk-asg.hr',name:'GNK ASG IT | Digital Assistant'},
  director:{email:'nermin.sefic@gnk-asg.hr',name:'Nermin Sefić | Managing Director'}
};
const CROATIAN=/\b(poštovani|postovani|poštovana|postovana|predmet|prijava|redakcija|mediji|akreditacija|poziv|odgovor|potvrda|upit|poruka|poruke|slanje|vijesti|direktor|osobni|urednički|urednicki|hvala|molimo|zaprimili|zaprimljena|primitak|vezano|vašu|vasu|vaš|vas|najkraćem|najkracem|srdačan|srdacan|pozdrav|poštovanjem|postovanjem|obavijestite|pošiljatelja|posiljatelja)\b/i;
const MAX_ATTACHMENTS=8;
const MAX_ATTACHMENT_BYTES=3200000;
const $=id=>document.getElementById(id);
const value=id=>String($(id)?.value||'');
const set=(id,next)=>{const node=$(id);if(node)node.value=next||'';};
const status=text=>{const node=$('status');if(node)node.textContent=text;};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const authHeaders=()=>{try{return window.GNK_ASG_ADMIN_AUTH?.headers?.()||{};}catch{return{};}};
const parseEmails=input=>[...new Set(String(input||'').split(/[;,\s]+/).map(item=>item.trim().toLowerCase()).filter(Boolean))];
const mandatoryBcc=input=>[...new Set([...parseEmails(input).filter(email=>email!==BCC),BCC])].join(', ');
let attachments=[];
let importedHtmlName='';

function currentProfile(){return PROFILES[value('profile')]||PROFILES.office;}
function applyProfile(){
  const profile=currentProfile();
  set('from',profile.email);set('fromName',profile.name);
  $('from')?.setAttribute('readonly','readonly');$('fromName')?.setAttribute('readonly','readonly');
}
function looksLikeHtml(text){return /^\s*(?:<!doctype|<html|<body|<table|<div|<section|<article|<p|<h[1-6])/i.test(String(text||''));}
function messageHtml(){
  const body=value('bodyText');
  if(looksLikeHtml(body))return body;
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:15px;line-height:1.6">${esc(body).replace(/\r?\n/g,'<br>')}</div>`;
}
function messageText(){
  try{return String(new DOMParser().parseFromString(messageHtml(),'text/html').body?.innerText||'').trim();}
  catch{return value('bodyText').trim();}
}
function hasCroatian(text){return CROATIAN.test(String(text||''));}
function validEmailList(text,required=false){
  const list=parseEmails(text);
  if(required&&!list.length)return false;
  return list.every(email=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email));
}
function validation(){
  const issues=[];
  if(!validEmailList(value('to'),true))issues.push('Add at least one valid To recipient.');
  if(!validEmailList(value('cc')))issues.push('CC contains an invalid address.');
  if(!validEmailList(mandatoryBcc(value('bcc'))))issues.push('BCC contains an invalid address.');
  if(!value('subject').trim())issues.push('Subject is required.');
  else if(hasCroatian(value('subject')))issues.push('Subject must be written in English.');
  if(!messageText())issues.push('Message body is required.');
  else if(hasCroatian(messageText()))issues.push('Message body must be written in English.');
  if(attachments.length>MAX_ATTACHMENTS)issues.push(`A maximum of ${MAX_ATTACHMENTS} PDF attachments is allowed.`);
  const node=$('validationSummary');
  if(node){node.className=`small ${issues.length?'warning':'ok'}`;node.innerHTML=issues.length?issues.map(item=>`• ${esc(item)}`).join('<br>'):'All required fields and English-language checks passed.';}
  return issues;
}
function preview(){
  const subject=value('subject').trim()||'No subject';
  const subjectNode=$('previewSubject');if(subjectNode)subjectNode.textContent=subject;
  const frame=$('previewFrame');if(frame)frame.srcdoc=messageHtml();
  validation();
}
function attachmentList(){
  const node=$('attachmentList');if(!node)return;
  if(!attachments.length){node.textContent='No PDF attachments selected.';return;}
  node.innerHTML=attachments.map((item,index)=>`<div>${index+1}. ${esc(item.filename)} · ${(item.sizeBytes/1024).toFixed(1)} KB</div>`).join('');
}
function payload(){
  const profile=currentProfile();
  return{
    confirm:'SEND_MAIL',profile:value('profile')||'office',signatureProfile:value('profile')||'office',
    from:profile.email,fromName:profile.name,to:value('to'),cc:value('cc'),bcc:mandatoryBcc(value('bcc')),
    subject:value('subject').trim(),body:messageHtml(),html:messageHtml(),bodyHtml:messageHtml(),
    text:messageText(),plainText:messageText(),attachments:attachments.map(item=>({filename:item.filename,type:'application/pdf',base64:item.base64}))
  };
}
async function request(url,options={}){
  const headers=new Headers(options.headers||{});
  Object.entries(authHeaders()).forEach(([key,val])=>{if(val)headers.set(key,val);});
  return fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers});
}
async function send(button){
  applyProfile();set('bcc',mandatoryBcc(value('bcc')));
  const issues=validation();
  if(issues.length){status(issues[0]);return;}
  button.disabled=true;button.textContent='SENDING…';status('Sending message…');
  try{
    const response=await request(SEND_ENDPOINT,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify(payload())});
    const raw=await response.text();let result={};try{result=JSON.parse(raw);}catch{result={raw};}
    const delivered=response.ok&&(result.status==='SENT'||result.delivered===true||Number(result.sent)>0);
    const list=$('list');if(list)list.textContent=JSON.stringify({httpStatus:response.status,...result},null,2);
    if(!delivered)throw new Error(result.message||result.error||`HTTP ${response.status}`);
    status('Message sent successfully.');button.textContent='SENT';setTimeout(()=>loadBox('sent',false),250);
  }catch(error){status(`Message was not sent: ${error.message}`);button.textContent='NOT SENT';}
  finally{button.disabled=false;setTimeout(()=>{button.textContent='SEND';},1800);}
}
async function loadBox(type,announce=true){
  const endpoint=BOX[type];if(!endpoint)return;
  const list=$('list');if(list)list.textContent=`Loading ${type}…`;
  try{
    const response=await request(`${endpoint}?cb=${Date.now()}`,{headers:{accept:'application/json'}});
    const raw=await response.text();let result;try{result=JSON.parse(raw);}catch{result={raw};}
    if(list)list.textContent=JSON.stringify(result,null,2);
    if(announce)status(response.ok?`${type.toUpperCase()} loaded.`:`Unable to load ${type}: HTTP ${response.status}`);
  }catch(error){if(list)list.textContent=error.message;if(announce)status(`Unable to load ${type}: ${error.message}`);}
}
function save(){
  const draft={...payload(),bodyText:value('bodyText'),attachments:[],importedHtmlName};
  localStorage.setItem('gnk_asg_mail_studio_english_v24',JSON.stringify(draft));
  status('Draft saved. PDF attachments are not stored in the browser.');
}
function load(){
  try{
    const draft=JSON.parse(localStorage.getItem('gnk_asg_mail_studio_english_v24')||'{}');
    if(!draft.subject&&!draft.to&&!draft.bodyText){status('No saved draft.');return;}
    set('profile',draft.profile||'office');set('to',draft.to);set('cc',draft.cc);set('bcc',mandatoryBcc(draft.bcc));
    set('subject',draft.subject);set('bodyText',draft.bodyText||draft.text||'');importedHtmlName=draft.importedHtmlName||'';
    attachments=[];attachmentList();applyProfile();preview();status('Draft loaded.');
  }catch(error){status(`Draft error: ${error.message}`);}
}
function helper(){
  const mode=value('mode')||'reply',current=value('bodyText').trim();
  const templates={
    short:'Dear Sir or Madam,\n\nThank you for your message. We confirm receipt and will respond as soon as reasonably possible.\n\nKind regards,',
    media:'Dear Sir or Madam,\n\nThank you for your media inquiry. Please send any additional questions and deadlines in writing so that we can prepare a complete response.\n\nKind regards,',
    legal:`Dear Sir or Madam,\n\nWe acknowledge receipt of your message. The matters raised will be reviewed against the available documentation and within the authority of GNK ASG d.o.o.\n\n${current}\n\nAll rights and legal interests of GNK ASG d.o.o. are reserved.\n\nKind regards,`,
    reply:`Dear Sir or Madam,\n\nThank you for your message. We confirm that it has been duly received.\n\n${current}\n\nKind regards,`
  };
  set('bodyText',templates[mode]||templates.reply);importedHtmlName='';preview();status('English template applied.');
}
function autoReply(){
  set('bodyText','Dear Sir or Madam,\n\nThis confirms that your message has been received by GNK ASG. Following internal review, a written response will be provided as soon as reasonably possible.\n\nThank you for your understanding.\n\nKind regards,');
  importedHtmlName='';preview();status('English automatic reply prepared.');
}
function clearAll(){
  ['to','cc','subject','bodyText'].forEach(id=>set(id,''));set('bcc',BCC);attachments=[];importedHtmlName='';
  attachmentList();const importNode=$('importStatus');if(importNode)importNode.textContent='No HTML file imported.';preview();status('Fields cleared.');
}
function fileToBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||'').split(',').pop()||'');reader.onerror=()=>reject(reader.error||new Error('Unable to read file'));reader.readAsDataURL(file);});}
async function importHtml(file){
  if(!file)return;
  if(file.size>5*1024*1024){status('HTML file exceeds 5 MB.');return;}
  const text=await file.text();if(!text.trim()){status('HTML file is empty.');return;}
  set('bodyText',text);importedHtmlName=file.name;const node=$('importStatus');if(node)node.textContent=`Imported: ${file.name}`;preview();status('HTML file imported and previewed.');
}
async function addPdfFiles(files){
  const selected=[...(files||[])];
  if(attachments.length+selected.length>MAX_ATTACHMENTS){status(`A maximum of ${MAX_ATTACHMENTS} PDF attachments is allowed.`);return;}
  for(const file of selected){
    if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf')){status(`${file.name} is not a PDF file.`);continue;}
    if(file.size>MAX_ATTACHMENT_BYTES){status(`${file.name} exceeds the 3.2 MB attachment limit.`);continue;}
    const base64=await fileToBase64(file);attachments.push({filename:file.name,sizeBytes:file.size,base64});
  }
  attachmentList();validation();status(`${attachments.length} PDF attachment(s) ready.`);
}
function bind(){
  $('send')?.addEventListener('click',event=>{event.preventDefault();send(event.currentTarget);});
  $('save')?.addEventListener('click',save);$('load')?.addEventListener('click',load);$('helper')?.addEventListener('click',helper);
  $('autoReply')?.addEventListener('click',autoReply);$('clear')?.addEventListener('click',clearAll);
  document.querySelectorAll('.tab[data-box]').forEach(button=>button.addEventListener('click',()=>loadBox(button.dataset.box)));
  $('profile')?.addEventListener('change',()=>{applyProfile();preview();});
  ['to','cc','bcc','subject','bodyText'].forEach(id=>$(id)?.addEventListener('input',preview));
  $('htmlFileButton')?.addEventListener('click',()=>$('htmlFile')?.click());
  $('pdfFileButton')?.addEventListener('click',()=>$('pdfFiles')?.click());
  $('clearAttachments')?.addEventListener('click',()=>{attachments=[];attachmentList();validation();status('Attachments removed.');});
  $('htmlFile')?.addEventListener('change',async event=>{try{await importHtml(event.target.files?.[0]);}catch(error){status(`HTML import error: ${error.message}`);}finally{event.target.value='';}});
  $('pdfFiles')?.addEventListener('change',async event=>{try{await addPdfFiles(event.target.files);}catch(error){status(`Attachment error: ${error.message}`);}finally{event.target.value='';}});
}
function boot(){
  document.documentElement.lang='en';applyProfile();set('bcc',mandatoryBcc(value('bcc')));attachmentList();bind();preview();
  document.documentElement.dataset.gnkMailStudio=VERSION;status(`Ready. ${VERSION}`);loadBox('status',false);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
