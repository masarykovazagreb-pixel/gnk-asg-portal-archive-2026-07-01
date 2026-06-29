(()=>{
'use strict';
const APIS=['/api/media-portal-admin','/api/media-registration-admin'];
const $=id=>document.getElementById(id);

async function call(path,opt={}){
  let last={status:0,data:{ok:false,error:'request_failed'}};
  for(const base of APIS){
    let response;
    try{
      const isForm=typeof FormData!=='undefined'&&opt.body instanceof FormData;
      const headers={accept:'application/json','cache-control':'no-cache',...(isForm?{}:{'content-type':'application/json'}),...(opt.headers||{})};
      response=await fetch(base+path,{credentials:'same-origin',cache:'no-store',...opt,headers});
    }catch(error){
      last={status:0,data:{ok:false,error:String(error?.message||error)}};
      continue;
    }
    const data=await response.json().catch(()=>({ok:false,error:`HTTP_${response.status}`}));
    last={status:response.status,data,base};
    if(response.status===404||data?.error==='not_found'||data?.error==='HTTP_404')continue;
    if($('output'))$('output').textContent=JSON.stringify({...data,apiEndpoint:base},null,2);
    if(!response.ok||!data.ok)throw new Error(data.message||data.error||`HTTP ${response.status}`);
    return data;
  }
  if($('output'))$('output').textContent=JSON.stringify({...last.data,apiEndpoint:last.base||APIS[0]},null,2);
  throw new Error(last.data?.message||last.data?.error||`HTTP ${last.status}`);
}

function localValue(iso){if(!iso)return'';const d=new Date(iso),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function setPdfInfo(message,ok=false){const el=$('pdfInfo');if(!el)return;el.textContent=message;el.className=ok?'note success':'note';}
function render(d){
  const c=d.config||{},q=d.queue||{},r=d.registrationsSummary||{};
  $('paused').checked=Boolean(c.paused);
  $('startAt').value=localValue(c.startAt);
  $('requirePdf').checked=c.requirePdf!==false;
  $('applicationUrl').value=c.applicationUrl||'';
  $('applicationEmail').value=c.applicationEmail||'';
  $('kQueued').textContent=q.QUEUED||0;
  $('kSent').textContent=q.SENT||0;
  $('kRetry').textContent=(q.RETRY||0)+(q.FAILED||0);
  $('kSubmitted').textContent=r.SUBMITTED||0;
  $('kApproved').textContent=(r.APPROVED||0)+(r.TRAVEL_CONFIRMED||0);
  $('kPdf').textContent=d.pdfAvailable?'READY':'MISSING';
  setPdfInfo(d.pdfAvailable?'Konačni PDF je učitan i status je READY.':'Konačni PDF još nije učitan.',Boolean(d.pdfAvailable));
  const st=$('liveState');
  st.textContent=c.paused?'PAUSED':c.startAt?`ACTIVE FROM ${new Date(c.startAt).toLocaleString()}`:'ACTIVE · START NOT SET';
  st.className='state '+(c.paused?'paused':'live');
  $('updatedAt').textContent=d.time||'';
  $('queueBody').innerHTML=(d.recent||[]).map(x=>`<tr><td>${esc(x.mail_code)}</td><td>${esc(x.outlet)}</td><td>${esc(x.country)}</td><td>${esc(x.email)}</td><td>${esc(x.language)}</td><td class="status ${esc(x.mail_status)}">${esc(x.mail_status)}</td><td>${esc(x.start_after||'')}</td><td>${esc(x.sent_at||'')}</td><td>${esc(x.last_error||'')}</td></tr>`).join('')||'<tr><td colspan="9">Nema zapisa.</td></tr>';
  $('registrationBody').innerHTML=(d.registrations||[]).map(x=>`<tr><td>${esc(x.application_id||'DRAFT')}</td><td>${esc(x.mail_code)}</td><td>${esc(x.outlet)}</td><td>${esc(x.country)}</td><td class="status ${esc(x.status)}">${esc(x.status)}</td><td>${esc(x.revision)}</td><td>${esc(x.submitted_at||'')}</td><td>${esc(x.updated_at||'')}</td><td><select data-decision="${esc(x.mail_code)}"><option value="">—</option><option>NEEDS_INFORMATION</option><option>APPROVED</option><option>NEEDS_TRAVEL_DOCUMENTS</option><option>TRAVEL_CONFIRMED</option><option>REJECTED</option></select></td></tr>`).join('')||'<tr><td colspan="9">Nema prijava.</td></tr>';
  document.querySelectorAll('[data-decision]').forEach(s=>s.addEventListener('change',async()=>{
    if(!s.value)return;
    if(!confirm(`Postaviti ${s.dataset.decision} na ${s.value}?`)){s.value='';return;}
    try{await call('/decision',{method:'POST',body:JSON.stringify({mailCode:s.dataset.decision,status:s.value})});await refresh()}catch(e){alert(e.message)}
  }));
}
async function refresh(){try{render(await call('/status'))}catch(e){$('liveState').textContent=e.message;$('liveState').className='state'}}
async function save(){const start=$('startAt').value;await call('/config',{method:'POST',body:JSON.stringify({paused:$('paused').checked,startAt:start?new Date(start).toISOString():'',requirePdf:$('requirePdf').checked,applicationUrl:$('applicationUrl').value,applicationEmail:$('applicationEmail').value,hotelStandard:'5-star',hotelPackage:'all-inclusive'})});await refresh()}
async function applyFinal(){
  $('paused').checked=true;
  $('requirePdf').checked=true;
  $('applicationUrl').value='https://gnk-asg.hr/media-application/';
  $('applicationEmail').value='media@gnk-asg.hr';
  await call('/config',{method:'POST',body:JSON.stringify({paused:true,startAt:$('startAt').value?new Date($('startAt').value).toISOString():'',requirePdf:true,deadline:'2026-07-10T21:59:59.000Z',applicationUrl:'https://gnk-asg.hr/media-application/',applicationEmail:'media@gnk-asg.hr',fromEmail:'media@gnk-asg.hr',fromName:'GNK ASG Media Relations | London, UK',fromLocation:'London, United Kingdom',hotelStandard:'5-star',hotelPackage:'all-inclusive'})});
  await refresh();
  alert('Konačne postavke su primijenjene. Slanje ostaje pauzirano.');
}
async function uploadPdf(){
  const input=$('pdfFile'),file=input?.files?.[0];
  if(!file){alert('Prvo odaberite PDF datoteku.');return;}
  if(file.size>3200000){alert('PDF je veći od dopuštenih 3,2 MB. Potrebno ga je smanjiti ili povećati limit na serveru.');return;}
  const button=$('uploadPdf');
  button.disabled=true;
  setPdfInfo(`Učitavanje: ${file.name} (${Math.ceil(file.size/1024)} KB)…`);
  try{
    const form=new FormData();form.append('file',file,file.name);
    const result=await call('/upload-pdf',{method:'POST',body:form});
    setPdfInfo(`PDF je uspješno učitan: ${result.pdf?.filename||file.name}. Status READY.`,true);
    await refresh();
    alert('Konačni PDF je uspješno učitan.');
  }catch(e){
    setPdfInfo(`Učitavanje nije uspjelo: ${e.message}`);
    alert(`Učitavanje nije uspjelo: ${e.message}`);
  }finally{button.disabled=false;}
}
async function prepare(){const mailCodes=$('mailCodes').value.split(/\s+/).map(x=>x.trim()).filter(Boolean);if(!confirm(mailCodes.length?`Pripremiti ${mailCodes.length} zapisa?`:'Pripremiti sve odobrene kontakte?'))return;await call('/queue',{method:'POST',body:JSON.stringify({confirm:'QUEUE_PERSONALIZED_INVITATIONS',mailCodes,startAt:$('startAt').value?new Date($('startAt').value).toISOString():'',force:$('forceQueue').checked})});await refresh()}
async function verify(){await call('/send-test',{method:'POST',body:JSON.stringify({confirm:'SEND_PERSONALIZED_TEST',email:$('testEmail').value,language:$('testLanguage').value,outlet:$('testOutlet')?.value||'GNK ASG TEST NEWSROOM',recipientName:$('testRecipient')?.value||'Uredništvo'})});alert('Jedan kontrolirani test je poslan.');}
async function next(){if(!confirm('Obraditi samo sljedeći zapis?'))return;await call('/dispatch-one',{method:'POST',body:JSON.stringify({confirm:'DISPATCH_ONE_PERSONALIZED_INVITATION'})});await refresh()}
$('refresh').onclick=refresh;
$('saveConfig').onclick=save;
$('applyFinal').onclick=applyFinal;
$('uploadPdf').onclick=uploadPdf;
$('queueAll').onclick=prepare;
$('sendTest').onclick=verify;
$('dispatchOne').onclick=next;
refresh();
setInterval(refresh,60000);
})();