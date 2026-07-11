(()=>{
'use strict';
if(window.__GNK_ASG_WEBMAIL_V27__)return;
window.__GNK_ASG_WEBMAIL_V27__=true;

const VERSION='GNK_ASG_WEBMAIL_V27_20260709_BCC_SOURCE_CLEANUP';
const BCC='beckuphome@gmail.com';
const SEND_ENDPOINT='/api/studio-message/send';
const API='/api/mail-sync';
const MAX_ATTACHMENTS=8;
const MAX_ATTACHMENT_BYTES=3200000;
const EXT=['pdf','doc','docx','xls','xlsx','ppt','pptx','zip','csv','txt','png','jpg','jpeg','webp'];
const MIME={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',zip:'application/zip',csv:'text/csv',txt:'text/plain',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
const DEFAULT_PROFILES={
  office:{email:'office@gnk-asg.hr',name:'GNK ASG Office',role:'General office'},
  legal:{email:'legal@gnk-asg.hr',name:'GNK ASG Legal & Compliance',role:'Legal / compliance'},
  media:{email:'media@gnk-asg.hr',name:'GNK ASG Media Desk',role:'Media relations'},
  it:{email:'it@gnk-asg.hr',name:'IT – Osobni digitalni asistent',role:'IT / worker alerts'},
  director:{email:'nermin.sefic@gnk-asg.hr',name:'Nermin Sefić / Direktor',role:'Director'}
};
const TEMPLATES={
  hr:{short:'Poštovani,\n\nzahvaljujemo na poruci. Potvrđujemo primitak i odgovorit ćemo u razumnom roku.\n\nSrdačan pozdrav,',reply:'Poštovani,\n\nzahvaljujemo na poruci. Potvrđujemo da je uredno zaprimljena.\n\nSrdačan pozdrav,',legal:'Poštovani,\n\npotvrđujemo primitak Vaše poruke. Navodi će biti razmotreni prema dostupnoj dokumentaciji i u okviru ovlasti društva GNK ASG d.o.o.\n\nSva prava i pravni interesi društva GNK ASG d.o.o. ostaju pridržani.\n\nSrdačan pozdrav,',media:'Poštovani,\n\nzahvaljujemo na medijskom upitu. Molimo da dodatna pitanja i rokove dostavite pisanim putem kako bismo pripremili cjelovit odgovor.\n\nSrdačan pozdrav,',forward:'Poštovani,\n\nprosljeđujemo poruku u nastavku.\n\nSrdačan pozdrav,'},
  en:{short:'Dear Sir or Madam,\n\nThank you for your message. We confirm receipt and will respond as soon as reasonably possible.\n\nKind regards,',reply:'Dear Sir or Madam,\n\nThank you for your message. We confirm that it has been duly received.\n\nKind regards,',legal:'Dear Sir or Madam,\n\nWe acknowledge receipt of your message. The matters raised will be reviewed against the available documentation and within the authority of GNK ASG d.o.o.\n\nAll rights and legal interests of GNK ASG d.o.o. are reserved.\n\nKind regards,',media:'Dear Sir or Madam,\n\nThank you for your media inquiry. Please send any additional questions and deadlines in writing so that we can prepare a complete response.\n\nKind regards,',forward:'Dear Sir or Madam,\n\nPlease see the forwarded message below.\n\nKind regards,'},
  de:{short:'Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihre Nachricht. Wir bestätigen den Eingang und werden so bald wie angemessen antworten.\n\nMit freundlichen Grüßen,',reply:'Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihre Nachricht. Wir bestätigen den ordnungsgemäßen Eingang.\n\nMit freundlichen Grüßen,',legal:'Sehr geehrte Damen und Herren,\n\nwir bestätigen den Eingang Ihrer Nachricht. Die angesprochenen Punkte werden anhand der verfügbaren Unterlagen und im Rahmen der Zuständigkeit von GNK ASG d.o.o. geprüft.\n\nAlle Rechte und rechtlichen Interessen bleiben vorbehalten.\n\nMit freundlichen Grüßen,',media:'Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihre Medienanfrage. Bitte senden Sie weitere Fragen und Fristen schriftlich, damit wir eine vollständige Antwort vorbereiten können.\n\nMit freundlichen Grüßen,',forward:'Sehr geehrte Damen und Herren,\n\nbitte beachten Sie die weitergeleitete Nachricht unten.\n\nMit freundlichen Grüßen,'},
  zh:{short:'尊敬的先生/女士：\n\n感谢您的来信。我们确认已收到，并将在合理时间内回复。\n\n此致，',reply:'尊敬的先生/女士：\n\n感谢您的来信。我们确认已正式收到。\n\n此致，',legal:'尊敬的先生/女士：\n\n我们确认收到您的来信。相关事项将根据现有文件并在 GNK ASG d.o.o. 权限范围内进行审查。\n\n保留所有权利。\n\n此致，',media:'尊敬的先生/女士：\n\n感谢您的媒体询问。请以书面形式发送任何补充问题和截止时间，以便我们准备完整回复。\n\n此致，',forward:'尊敬的先生/女士：\n\n请查看下方转发的信息。\n\n此致，'}
};
const state={folder:'inbox',profile:'office',language:'hr',search:'',selected:null,draftId:null,attachments:[],profiles:{...DEFAULT_PROFILES}};
const $=id=>document.getElementById(id);
const clean=value=>String(value??'').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const value=id=>String($(id)?.value||'');
const set=(id,next)=>{const node=$(id);if(node)node.value=next||'';};
const status=text=>{const node=$('status');if(node)node.textContent=text;};
const raw=data=>{const node=$('list');if(node)node.textContent=typeof data==='string'?data:JSON.stringify(data,null,2);};
const extOf=name=>(String(name||'').toLowerCase().match(/\.([a-z0-9]+)$/)||[])[1]||'';
const authHeaders=()=>{try{return window.GNK_ASG_ADMIN_AUTH?.headers?.()||{};}catch{return{};}};
function request(url,options={}){const headers=new Headers(options.headers||{});Object.entries(authHeaders()).forEach(([key,val])=>{if(val)headers.set(key,val);});return fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers});}
async function jsonFetch(url,options={}){const response=await request(url,{headers:{accept:'application/json',...(options.headers||{})},...options});const text=await response.text();let data;try{data=JSON.parse(text);}catch{data={raw:text};}raw({httpStatus:response.status,url,...data});if(response.status===401)throw new Error('Unauthorized session. Open /admin-login/ and log in, then return to Mail Studio.');if(!response.ok)throw new Error(data.error||data.message||`HTTP ${response.status}`);return data;}
function parseEmails(input){const text=clean(input);if(!text)return[];const found=text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[];const list=found.length?found:text.split(/[;,\n]+/).map(item=>clean(item)).filter(Boolean);return[...new Set(list.map(item=>String(item).replace(/^.*<([^>]+)>.*$/,'$1').replace(/[<>"'()]/g,'').trim().toLowerCase()).filter(Boolean))];}
const mandatoryBcc=input=>[...new Set([...parseEmails(input).filter(email=>email!==BCC),BCC])].join(', ');
function profileEntries(){return Object.entries(state.profiles).filter(([,p])=>p&&p.email);}
const currentProfile=()=>state.profiles[value('profile')||state.profile]||state.profiles.office||Object.values(state.profiles)[0]||DEFAULT_PROFILES.office;
function normalizeProfiles(data){const profiles=data?.profiles||data?.readiness?.profiles||[];if(!Array.isArray(profiles)||!profiles.length)return;const next={};profiles.forEach(item=>{const id=clean(item.id||item.profile||'').toLowerCase();const email=clean(item.email);if(id&&email)next[id]={email,name:clean(item.name)||id,role:clean(item.role)||'Allowed sender'};});if(Object.keys(next).length)state.profiles=next;if(!state.profiles[state.profile])state.profile=Object.keys(state.profiles)[0]||'office';}
function populateProfiles(){const select=$('profile'),list=$('profileList'),entries=profileEntries();if(select){select.innerHTML=entries.map(([key,p])=>`<option value="${esc(key)}">${esc(p.name)}</option>`).join('');select.value=state.profile;}if(list){list.innerHTML=entries.map(([key,p])=>`<button type="button" class="profile${key===state.profile?' active':''}" data-profile="${esc(key)}"><b>${esc(p.name)}</b><small>${esc(p.email)} · ${esc(p.role||'Allowed sender')}</small></button>`).join('');}}
function applyProfile(){state.profile=value('profile')||state.profile;const profile=currentProfile();set('from',profile.email);set('fromName',profile.name);document.querySelectorAll('.profile').forEach(node=>node.classList.toggle('active',node.dataset.profile===state.profile));}
function looksLikeHtml(text){return /^\s*(?:<!doctype|<html|<body|<table|<div|<section|<article|<p|<h[1-6])/i.test(String(text||''));}
function messageHtml(){const body=value('bodyText');return looksLikeHtml(body)?body:`<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:15px;line-height:1.6">${esc(body).replace(/\r?\n/g,'<br>')}</div>`;}
function messageText(){try{return String(new DOMParser().parseFromString(messageHtml(),'text/html').body?.innerText||'').trim();}catch{return value('bodyText').trim();}}
function validEmailList(text,required=false){const list=parseEmails(text);if(required&&!list.length)return false;return list.every(email=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email));}
function validation(){const issues=[];if(!validEmailList(value('to'),true))issues.push('Add at least one valid To recipient.');if(!validEmailList(value('cc')))issues.push('CC contains an invalid address.');if(!validEmailList(mandatoryBcc(value('bcc'))))issues.push('BCC contains an invalid address.');if(!clean(value('subject')))issues.push('Subject is required.');if(!messageText())issues.push('Message body is required.');if(state.attachments.length>MAX_ATTACHMENTS)issues.push(`A maximum of ${MAX_ATTACHMENTS} attachments is allowed.`);const node=$('validationSummary');if(node){node.className=`small ${issues.length?'warning':'ok'}`;node.innerHTML=issues.length?issues.map(item=>`• ${esc(item)}`).join('<br>'):'Ready. Mandatory BCC is clean and enforced.';}return issues;}
function preview(){const frame=$('previewFrame'),subject=clean(value('subject'))||'No subject';const subjectNode=$('previewSubject');if(subjectNode)subjectNode.textContent=subject;if(frame)frame.srcdoc=messageHtml();validation();}
function renderAttachments(){const node=$('attachmentList');if(!node)return;if(!state.attachments.length){node.textContent=`No attachments selected. Allowed: ${EXT.join(', ')}.`;return;}node.innerHTML=state.attachments.map((item,index)=>`<div>${index+1}. ${esc(item.filename)} · ${esc(item.ext.toUpperCase())} · ${(item.sizeBytes/1024).toFixed(1)} KB</div>`).join('');}
function payload(){const profile=currentProfile();return{confirm:'SEND_MAIL',profile:value('profile')||state.profile,signatureProfile:value('profile')||state.profile,language:value('language')||state.language,from:profile.email,fromName:profile.name,to:value('to'),cc:value('cc'),bcc:mandatoryBcc(value('bcc')),subject:clean(value('subject')),body:messageHtml(),html:messageHtml(),bodyHtml:messageHtml(),text:messageText(),plainText:messageText(),attachments:state.attachments.map(item=>({filename:item.filename,type:item.type,base64:item.base64,sizeBytes:item.sizeBytes}))};}
function updateCounts(folders={}){Object.entries(folders||{}).forEach(([key,val])=>document.querySelectorAll(`[data-count="${CSS.escape(key)}"]`).forEach(node=>node.textContent=String(val||0)));}
function recipients(list){return (Array.isArray(list)?list:[]).map(item=>item.name?`${item.name} <${item.email}>`:item.email).join(', ');}
function itemStatus(item){const s=String(item.status||item.processingStatus||item.folder||'ready').toUpperCase();const cls=/FAIL|BOUNCE|REJECT|TRASH|SPAM/.test(s)?'bad':/PENDING|QUEUE|DRAFT|RETRY|LOCKED/.test(s)?'warn':'';return `<span class="pill ${cls}">${esc(s||'READY')}</span>`;}
function displayTime(item){return item.displayTime||item.receivedAt||item.sentAt||item.updatedAt||item.createdAt||'';}
function renderMessages(items=[],message=''){const node=$('messageList');if(!node)return;if(!items.length){node.innerHTML=`<div class="message"><b>No records</b><p>${esc(message||'No messages matched this folder/search in the current runtime.')}</p></div>`;return;}node.innerHTML=items.map(item=>`<article class="message ${state.selected===item.id?'active':''}" data-id="${esc(item.id)}" data-kind="${esc(item.direction||'MESSAGE')}"><div class="meta"><span>${esc(item.folder||item.direction||'mail')}</span>${itemStatus(item)}</div><b>${esc(item.subject||'(no subject)')}</b><div class="meta"><span>${esc(item.fromName||item.fromEmail||recipients(item.to)||'unknown')}</span><time>${esc(displayTime(item))}</time></div><p>${esc(item.textPreview||item.textBody||'No preview available.')}</p></article>`).join('');}
async function loadFolder(folder=state.folder){state.folder=folder||'inbox';document.querySelectorAll('[data-folder]').forEach(node=>{const active=node.dataset.folder===state.folder;if(node.classList.contains('folder'))node.setAttribute('aria-current',active?'true':'false');if(node.classList.contains('tab'))node.classList.toggle('active',active);});status(`Loading ${state.folder}…`);try{const url=state.folder==='drafts'?`${API}/drafts?limit=80&search=${encodeURIComponent(state.search)}`:`${API}/messages?folder=${encodeURIComponent(state.folder)}&limit=80&profile=${encodeURIComponent(state.profile)}&search=${encodeURIComponent(state.search)}`;const data=await jsonFetch(url);updateCounts(data.folders);renderMessages(data.items||[],data.message||data.warning||'');status(`${state.folder.toUpperCase()} loaded: ${Number(data.total||0)} record(s).`);}catch(error){renderMessages([],error.message);status(`Unable to load ${state.folder}: ${error.message}`);}}
async function loadBox(kind){try{const data=await jsonFetch(kind==='health'?`${API}/health`:`${API}/folders`);normalizeProfiles(data.readiness||data);populateProfiles();applyProfile();updateCounts(data.folders);status(`${kind.toUpperCase()} loaded.`);}catch(error){status(`${kind} error: ${error.message}`);}}
function renderDetail(data){const m=data.message||{};const attachments=(data.attachments||[]).map(a=>`<div>${esc(a.filename)} · ${Number(a.size_bytes||a.sizeBytes||0)} bytes · ${a.downloadable?'stored':'metadata only'}</div>`).join('')||'No attachments.';const node=$('threadDetail');if(node)node.innerHTML=`<div class="thread"><div class="thread-item"><b>${esc(m.subject||'(no subject)')}</b><div class="meta">From ${esc(m.fromName||m.fromEmail||'')} · ${esc(displayTime(m))}</div><div class="thread-body">${esc(m.textBody||m.textPreview||'')}</div><div class="attachments">${attachments}</div></div></div>`;}
async function openMessage(id,kind){if(!id)return;state.selected=id;document.querySelectorAll('.message').forEach(node=>node.classList.toggle('active',node.dataset.id===id));try{if(state.folder==='drafts'||kind==='DRAFT'){const data=await jsonFetch(`${API}/drafts?id=${encodeURIComponent(id)}`);const draft=data.draft||{};set('to',recipients(draft.to));set('cc',recipients(draft.cc));set('bcc',mandatoryBcc(recipients(draft.bcc)));set('subject',draft.subject||'');set('bodyText',draft.htmlBody||draft.textBody||'');preview();status('Draft loaded into compose.');return;}renderDetail(await jsonFetch(`${API}/message?id=${encodeURIComponent(id)}`));status('Message detail loaded.');}catch(error){const node=$('threadDetail');if(node)node.textContent=`Unable to load detail: ${error.message}`;}}
function fillReply(prefix='Re'){const text=$('threadDetail')?.innerText||'';set('to','');set('subject',`${prefix}: ${clean(value('subject')).replace(/^(re|fw|fwd):\s*/i,'')||'Message'}`);if(prefix==='Fw')set('bodyText',(TEMPLATES[value('language')]?.forward||TEMPLATES.en.forward)+'\n\n--- Forwarded message ---\n'+text);else set('bodyText',TEMPLATES[value('language')]?.reply||TEMPLATES.en.reply);preview();status(`${prefix==='Fw'?'Forward':'Reply'} prepared.`);}
async function updateMessage(action){if(!state.selected){status('Select a message first.');return;}try{const data=await jsonFetch(`${API}/state`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:state.selected,action})});updateCounts(data.folders);status(`${action} completed.`);loadFolder(state.folder);}catch(error){status(`${action} failed: ${error.message}`);}}
async function send(button){applyProfile();set('to',parseEmails(value('to')).join(', '));set('cc',parseEmails(value('cc')).join(', '));set('bcc',mandatoryBcc(value('bcc')));const issues=validation();if(issues.length){status(issues[0]);return;}button.disabled=true;button.textContent='SENDING…';status('Sending individual message…');try{const response=await request(SEND_ENDPOINT,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify(payload())});const text=await response.text();let result={};try{result=JSON.parse(text);}catch{result={raw:text};}raw({httpStatus:response.status,...result});const delivered=response.ok&&(result.status==='SENT'||result.delivered===true||Number(result.sent)>0);if(!delivered)throw new Error(result.message||result.error||`HTTP ${response.status}`);status('Message sent successfully.');button.textContent='SENT';setTimeout(()=>loadFolder('sent'),300);}catch(error){status(`Message was not sent: ${error.message}`);button.textContent='NOT SENT';}finally{button.disabled=false;setTimeout(()=>{button.textContent='SEND';},1800);}}
async function save(){const draft={...payload(),id:state.draftId,profileId:value('profile')||state.profile,textBody:messageText(),htmlBody:messageHtml(),attachments:state.attachments.map(item=>({filename:item.filename,sizeBytes:item.sizeBytes,type:item.type}))};localStorage.setItem('gnk_asg_mail_studio_draft_v27',JSON.stringify({...draft,bodyText:value('bodyText'),attachments:[]}));try{const data=await jsonFetch(`${API}/drafts`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(draft)});state.draftId=data.draft?.id||state.draftId;updateCounts(data.folders);status('Draft saved to Worker runtime.');}catch(error){status(`Local draft saved; Worker draft failed: ${error.message}`);}}
function load(){try{const draft=JSON.parse(localStorage.getItem('gnk_asg_mail_studio_draft_v27')||'{}');if(!draft.subject&&!draft.to&&!draft.bodyText){status('No saved local draft.');return;}set('profile',draft.profile||draft.profileId||state.profile);set('language',draft.language||state.language);set('to',draft.to);set('cc',draft.cc);set('bcc',mandatoryBcc(draft.bcc));set('subject',draft.subject);set('bodyText',draft.bodyText||draft.text||'');state.attachments=[];renderAttachments();applyProfile();preview();status('Local draft loaded.');}catch(error){status(`Draft error: ${error.message}`);}}
function helper(){const mode=value('mode')||'reply',lang=value('language')||state.language,current=value('bodyText').trim(),base=(TEMPLATES[lang]||TEMPLATES.en)[mode]||(TEMPLATES[lang]||TEMPLATES.en).reply;set('bodyText',current?`${base}\n\n${current}`:base);preview();status(`${lang.toUpperCase()} template applied.`);}
async function autoReply(){
  const lang=value('language')||state.language;
  const fallbackText=(TEMPLATES[lang]||TEMPLATES.en).reply;
  const button=$('autoReply');
  const incomingText=($('threadDetail')?.innerText||'').trim();
  const subject=value('subject')||'';
  set('bodyText',fallbackText);preview();
  status('Preparing AI-assisted reply…');
  if(button){button.disabled=true;}
  try{
    const response=await fetch('/api/ai-assist',{
      method:'POST',
      headers:{'content-type':'application/json','accept':'application/json'},
      body:JSON.stringify({task:'auto_reply',style:'corporate',lang,subject,text:incomingText,context:'GNK ASG Mail Studio'})
    });
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const result=await response.json();
    if(result&&result.text){
      set('bodyText',result.text);
      preview();
      status(result.ai?`${lang.toUpperCase()} AI-assisted reply prepared. Review before sending.`:`${lang.toUpperCase()} template reply prepared (AI unavailable). Review before sending.`);
    }else{
      throw new Error('empty_ai_response');
    }
  }catch(error){
    set('bodyText',fallbackText);preview();
    status(`${lang.toUpperCase()} automatic reply prepared (AI unavailable: ${error.message}). Review before sending.`);
  }finally{
    if(button){button.disabled=false;}
  }
}
function clearAll(){['to','cc','subject','bodyText'].forEach(id=>set(id,''));set('bcc',BCC);state.attachments=[];state.draftId=null;renderAttachments();const importNode=$('importStatus');if(importNode)importNode.textContent='No HTML file imported.';preview();status('Fields cleared.');}
function fileToBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||'').split(',').pop()||'');reader.onerror=()=>reject(reader.error||new Error('Unable to read file'));reader.readAsDataURL(file);});}
async function importHtml(file){if(!file)return;if(file.size>5*1024*1024){status('HTML file exceeds 5 MB.');return;}const text=await file.text();if(!text.trim()){status('HTML file is empty.');return;}set('bodyText',text);const node=$('importStatus');if(node)node.textContent=`Imported: ${file.name}`;preview();status('HTML file imported and previewed.');}
async function addFiles(files){const selected=[...(files||[])];if(!selected.length)return;if(state.attachments.length+selected.length>MAX_ATTACHMENTS){status(`A maximum of ${MAX_ATTACHMENTS} attachments is allowed.`);return;}for(const file of selected){const ext=extOf(file.name);if(!EXT.includes(ext)){status(`${file.name} is not an allowed attachment type.`);continue;}if(file.size>MAX_ATTACHMENT_BYTES){status(`${file.name} exceeds the 3.2 MB attachment limit.`);continue;}const base64=await fileToBase64(file);state.attachments.push({filename:file.name,ext,type:file.type||MIME[ext]||'application/octet-stream',sizeBytes:file.size,base64});}renderAttachments();validation();status(`${state.attachments.length} attachment(s) ready.`);}
async function scheduleSend(){
  const sendAtLocal=value('scheduleAt');
  if(!sendAtLocal){status('Odaberite datum i vrijeme za zakazano slanje.');return;}
  const sendAtIso=new Date(sendAtLocal).toISOString();
  applyProfile();
  set('to',parseEmails(value('to')).join(', '));
  set('cc',parseEmails(value('cc')).join(', '));
  set('bcc',mandatoryBcc(value('bcc')));
  const issues=validation();
  if(issues.length){status(issues[0]);return;}
  const button=$('scheduleSend');
  if(button){button.disabled=true;}
  try{
    const response=await fetch('/api/mail-schedule',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({...payload(),sendAt:sendAtIso})});
    const result=await response.json();
    if(!response.ok||!result.ok)throw new Error(result.error||`HTTP ${response.status}`);
    status(`Zakazano za ${new Date(result.scheduled.sendAt).toLocaleString('hr-HR')}.`);
    set('scheduleAt','');
    loadScheduleList();
  }catch(error){
    status(`Zakazivanje nije uspjelo: ${error.message}`);
  }finally{
    if(button){button.disabled=false;}
  }
}
async function loadScheduleList(){
  const node=$('scheduleList');
  if(!node)return;
  try{
    const response=await fetch('/api/mail-schedule/list',{headers:{accept:'application/json'}});
    const data=await response.json();
    const items=(data.items||[]).filter(i=>i.status==='scheduled');
    if(!items.length){node.textContent='Nema zakazanih poruka.';return;}
    node.innerHTML=items.map(i=>`<div style="padding:6px 0;border-top:1px solid rgba(255,255,255,.08);">${esc(new Date(i.sendAt).toLocaleString('hr-HR'))} — ${esc(i.subject||'(bez predmeta)')} <button data-cancel-schedule="${esc(i.id)}" style="margin-left:8px;font-size:11px;">Otkaži</button></div>`).join('');
  }catch(error){
    node.textContent=`Greška pri učitavanju: ${error.message}`;
  }
}
async function cancelSchedule(id){
  try{
    await fetch('/api/mail-schedule/cancel',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id})});
    loadScheduleList();
  }catch(error){status(`Otkazivanje nije uspjelo: ${error.message}`);}
}
function bind(){document.addEventListener('click',event=>{const folder=event.target.closest('[data-folder]')?.dataset.folder;if(folder){event.preventDefault();loadFolder(folder);}const profile=event.target.closest('[data-profile]')?.dataset.profile;if(profile){state.profile=profile;set('profile',profile);applyProfile();loadFolder(state.folder);}});$('messageList')?.addEventListener('click',event=>{const item=event.target.closest('.message');if(item)openMessage(item.dataset.id,item.dataset.kind);});$('send')?.addEventListener('click',event=>{event.preventDefault();send(event.currentTarget);});$('save')?.addEventListener('click',save);$('load')?.addEventListener('click',load);$('helper')?.addEventListener('click',helper);$('autoReply')?.addEventListener('click',autoReply);$('clear')?.addEventListener('click',clearAll);$('scheduleSend')?.addEventListener('click',scheduleSend);$('scheduleList')?.addEventListener('click',event=>{const id=event.target.closest('[data-cancel-schedule]')?.dataset.cancelSchedule;if(id)cancelSchedule(id);});$('refresh')?.addEventListener('click',()=>loadFolder(state.folder));$('mobileRefresh')?.addEventListener('click',()=>loadFolder(state.folder));$('newMail')?.addEventListener('click',()=>{$('composePanel')?.scrollIntoView({behavior:'smooth'});});$('mobileCompose')?.addEventListener('click',()=>{$('composePanel')?.scrollIntoView({behavior:'smooth'});});$('reply')?.addEventListener('click',()=>fillReply('Re'));$('forward')?.addEventListener('click',()=>fillReply('Fw'));$('archive')?.addEventListener('click',()=>updateMessage('archive'));$('star')?.addEventListener('click',()=>updateMessage('star'));$('trash')?.addEventListener('click',()=>updateMessage('trash'));document.querySelectorAll('.tab[data-box]').forEach(button=>button.addEventListener('click',()=>loadBox(button.dataset.box)));$('profile')?.addEventListener('change',()=>{state.profile=value('profile');applyProfile();loadFolder(state.folder);preview();});$('language')?.addEventListener('change',()=>{state.language=value('language');document.documentElement.lang=state.language;preview();});$('search')?.addEventListener('input',()=>{state.search=value('search');clearTimeout(window.__gnkWebmailSearchTimer);window.__gnkWebmailSearchTimer=setTimeout(()=>loadFolder(state.folder),250);});['to','cc','bcc','subject','bodyText'].forEach(id=>$(id)?.addEventListener('input',preview));$('htmlFileButton')?.addEventListener('click',()=>$('htmlFile')?.click());$('pdfFileButton')?.addEventListener('click',()=>$('pdfFiles')?.click());$('clearAttachments')?.addEventListener('click',()=>{state.attachments=[];renderAttachments();validation();status('Attachments removed.');});$('htmlFile')?.addEventListener('change',async event=>{try{await importHtml(event.target.files?.[0]);}catch(error){status(`HTML import error: ${error.message}`);}finally{event.target.value='';}});$('pdfFiles')?.addEventListener('change',async event=>{try{await addFiles(event.target.files);}catch(error){status(`Attachment error: ${error.message}`);}finally{event.target.value='';}});}
function boot(){document.documentElement.lang=state.language;populateProfiles();set('language',state.language);applyProfile();set('bcc',BCC);renderAttachments();bind();preview();document.documentElement.dataset.gnkWebmail=VERSION;const params=new URLSearchParams(location.search);if(params.get('folder'))state.folder=params.get('folder');if(params.get('mode')==='compose')setTimeout(()=>$('composePanel')?.scrollIntoView({behavior:'smooth'}),100);status(`Ready. ${VERSION}`);loadBox('health').finally(()=>loadFolder(state.folder));loadScheduleList();}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
