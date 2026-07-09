(()=>{
'use strict';
if(window.__GNK_ASG_AUTO_REPLY_PANEL_V1__)return;
window.__GNK_ASG_AUTO_REPLY_PANEL_V1__=true;
const VERSION='GNK_ASG_MAIL_STUDIO_AUTO_REPLY_PANEL_V1_20260709';
const PREVIEW_ENDPOINT='/api/mail-center/auto-reply-preview';
const LOOKUP_ENDPOINT='/api/mail-center/case-lookup';
const $=id=>document.getElementById(id);
const clean=value=>String(value??'').trim();
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const authHeaders=()=>{try{return window.GNK_ASG_ADMIN_AUTH?.headers?.()||{};}catch{return{};}};
function status(text){const node=$('status');if(node)node.textContent=text;}
function raw(data){const node=$('list');if(node)node.textContent=typeof data==='string'?data:JSON.stringify(data,null,2);}
async function jsonFetch(url,options={}){
  const headers=new Headers(options.headers||{});
  headers.set('accept','application/json');
  Object.entries(authHeaders()).forEach(([key,val])=>{if(val)headers.set(key,val);});
  const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options,headers});
  const text=await response.text();
  let data;try{data=JSON.parse(text);}catch{data={raw:text};}
  raw({httpStatus:response.status,url,...data});
  if(response.status===401)throw new Error('Unauthorized session. Open /admin-login/ and log in, then return to Mail Studio.');
  if(!response.ok)throw new Error(data.error||data.message||`HTTP ${response.status}`);
  return data;
}
function setValue(id,value){const node=$(id);if(!node)return;node.value=value||'';node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));}
function renderPanel(){
  if($('autoReplyPanel'))return;
  const compose=$('composePanel');
  if(!compose)return;
  const panel=document.createElement('section');
  panel.className='panel';
  panel.id='autoReplyPanel';
  panel.innerHTML=`
    <h3>AI auto-reply / predmetni broj</h3>
    <p class="small">Priprema personalizirani odgovor na jeziku upita, dodjeljuje predmetni broj i stabilni globalni centar. Ne šalje bez ručnog SEND.</p>
    <div class="grid"><div class="field"><label for="autoSenderName">Sender name / ime</label><input id="autoSenderName" placeholder="Neno"></div><div class="field"><label for="autoSenderEmail">Sender email</label><input id="autoSenderEmail" placeholder="sender@example.com"></div></div>
    <div class="field"><label for="autoSubject">Inquiry subject / predmet upita</label><input id="autoSubject" placeholder="Upit / inquiry"></div>
    <div class="field"><label for="autoInquiry">Question / pitanje</label><textarea id="autoInquiry" placeholder="Zalijepi pitanje ili poruku. Sustav će pripremiti odgovor, broj predmeta i centar."></textarea></div>
    <div class="actions"><button class="gold" id="autoPreview" type="button">AI preview</button><button id="autoPersist" type="button">Save case</button><button id="autoLoadCompose" type="button">Load into compose</button></div>
    <div class="grid"><div class="field"><label for="caseLookupInput">Case lookup / pretraga po broju</label><input id="caseLookupInput" placeholder="GNK-YYYYMMDD-ZAG-XXXXXXXX"></div><div class="field"><label>&nbsp;</label><button id="caseLookupButton" type="button">Lookup</button></div></div>
    <div id="autoReplyResult" class="raw">${VERSION} ready.</div>`;
  compose.parentNode.insertBefore(panel,compose.nextSibling);
}
async function preview(persist=false){
  const payload={
    name:clean($('autoSenderName')?.value),
    email:clean($('autoSenderEmail')?.value),
    subject:clean($('autoSubject')?.value||$('subject')?.value),
    message:clean($('autoInquiry')?.value||$('bodyText')?.value),
    persist
  };
  if(!payload.subject&&!payload.message){status('Auto-reply needs subject or question.');return null;}
  status(persist?'Saving auto-reply case…':'Preparing auto-reply preview…');
  const data=await jsonFetch(PREVIEW_ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  const result=$('autoReplyResult');
  if(result)result.innerHTML=`Case: ${esc(data.entry?.caseNumber)}\nCenter: ${esc(data.entry?.center?.city)}, ${esc(data.entry?.center?.country)}\nLanguage: ${esc(data.entry?.language)}\nSaved: ${esc(String(data.saved?.saved||false))}\n\n${esc(data.entry?.text||'')}`;
  status(persist?'Auto-reply case saved.':'Auto-reply preview ready.');
  window.__gnkLastAutoReply=data;
  return data;
}
function loadCompose(){
  const data=window.__gnkLastAutoReply;
  if(!data?.entry){status('Create auto-reply preview first.');return;}
  setValue('to',data.entry.senderEmail||clean($('autoSenderEmail')?.value));
  setValue('subject',`Re: ${data.entry.subject||data.entry.caseNumber}`);
  setValue('bodyText',data.entry.html||data.entry.text||'');
  setValue('bcc','beckuphome@gmail.com');
  status(`Loaded auto-reply ${data.entry.caseNumber} into compose. Review before SEND.`);
  $('composePanel')?.scrollIntoView({behavior:'smooth'});
}
async function lookup(){
  const caseNumber=clean($('caseLookupInput')?.value);
  if(!caseNumber){status('Enter case number.');return;}
  status(`Looking up ${caseNumber}…`);
  const data=await jsonFetch(`${LOOKUP_ENDPOINT}?case=${encodeURIComponent(caseNumber)}`);
  const result=$('autoReplyResult');
  if(result)result.textContent=JSON.stringify(data,null,2);
  status(data.ok?`Case found: ${caseNumber}`:`Case not found: ${caseNumber}`);
}
function bind(){
  $('autoPreview')?.addEventListener('click',event=>{event.preventDefault();preview(false).catch(error=>status(`Auto-reply preview failed: ${error.message}`));});
  $('autoPersist')?.addEventListener('click',event=>{event.preventDefault();preview(true).catch(error=>status(`Auto-reply save failed: ${error.message}`));});
  $('autoLoadCompose')?.addEventListener('click',event=>{event.preventDefault();loadCompose();});
  $('caseLookupButton')?.addEventListener('click',event=>{event.preventDefault();lookup().catch(error=>status(`Case lookup failed: ${error.message}`));});
}
function boot(){renderPanel();bind();document.documentElement.dataset.gnkAutoReplyPanel=VERSION;}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
