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
      const headers=new Headers(opt.headers||{});
      headers.set('accept','application/json');
      headers.set('cache-control','no-cache');
      if(!isForm&&!headers.has('content-type'))headers.set('content-type','application/json');
      response=await fetch(base+path,{credentials:'same-origin',cache:'no-store',...opt,headers});
    }catch(error){
      last={status:0,data:{ok:false,error:String(error?.message||error)}};
      continue;
    }
    const data=await response.json().catch(()=>({ok:false,error:`HTTP_${response.status}`}));
    last={status:response.status,data,base};
    if(response.status===404||data?.error==='not_found'||data?.error==='HTTP_404')continue;
    $('output').textContent=JSON.stringify({...data,apiEndpoint:base},null,2);
    if(!response.ok||!data.ok)throw new Error(data.message||data.error||`HTTP ${response.status}`);
    return data;
  }
  $('output').textContent=JSON.stringify({...last.data,apiEndpoint:last.base||APIS[0]},null,2);
  throw new Error(last.data?.message||last.data?.error||`HTTP ${last.status}`);
}

function localValue(iso){if(!iso)return'';const d=new Date(iso),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function setBusy(button,busy,label='RADIM…'){if(!button)return;button.disabled=busy;if(busy){button.dataset.oldText=button.textContent;button.textContent=label}else if(button.dataset.oldText){button.textContent=button.dataset.oldText;delete button.dataset.oldText}}
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
  $('pdfInfo').textContent=d.pdfAvailable?'PDF je učitan i spreman za kontrolirani test.':'PDF još nije učitan.';
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
async function applyFinal(){const button=$('applyFinal');setBusy(button,true,'PRIMJENJUJEM…');try{await call('/final-config',{method:'POST',body:JSON.stringify({confirm:'APPLY_FINAL_MEDIA_CONFIG'})});await refresh();alert('Konačne postavke su primijenjene.')}finally{setBusy(button,false)}}
async function uploadPdf(){const button=$('uploadPdf'),file=$('pdfFile').files?.[0];if(!file){alert('Prvo odaberite PDF datoteku.');return}if(file.type&&file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf')){alert('Odabrana datoteka nije PDF.');return}const form=new FormData();form.append('file',file,file.name);setBusy(button,true,'UČITAVAM PDF…');$('pdfInfo').textContent='Učitavanje PDF-a je u tijeku…';try{const result=await call('/upload-pdf',{method:'POST',body:form});$('pdfInfo').textContent=`PDF READY: ${result.pdf?.filename||file.name} (${result.pdf?.sizeBytes||file.size} bytes)`;await refresh();alert('Konačni PDF je uspješno učitan.')}catch(error){$('pdfInfo').textContent=`PDF upload nije uspio: ${error.message}`;throw error}finally{setBusy(button,false)}}
async function prepare(){const mailCodes=$('mailCodes').value.split(/\s+/).map(x=>x.trim()).filter(Boolean);if(!confirm(mailCodes.length?`Pripremiti ${mailCodes.length} zapisa?`:'Pripremiti sve odobrene kontakte?'))return;await call('/queue',{method:'POST',body:JSON.stringify({confirm:'QUEUE_PERSONALIZED_INVITATIONS',mailCodes,startAt:$('startAt').value?new Date($('startAt').value).toISOString():'',force:$('forceQueue').checked})});await refresh()}
async function verify(){const button=$('sendTest');setBusy(button,true,'ŠALJEM TEST…');try{await call('/send-test',{method:'POST',body:JSON.stringify({confirm:'SEND_PERSONALIZED_TEST',email:$('testEmail').value,outlet:$('testOutlet').value,recipientName:$('testRecipient').value,language:$('testLanguage').value})});await refresh();alert('Kontrolirani test je poslan.')}finally{setBusy(button,false)}}
async function next(){if(!confirm('Obraditi samo sljedeći zapis?'))return;await call('/dispatch-one',{method:'POST',body:JSON.stringify({confirm:'DISPATCH_ONE_PERSONALIZED_INVITATION'})});await refresh()}

$('refresh').onclick=()=>refresh().catch(e=>alert(e.message));
$('saveConfig').onclick=()=>save().catch(e=>alert(e.message));
$('applyFinal').onclick=()=>applyFinal().catch(e=>alert(e.message));
$('uploadPdf').onclick=()=>uploadPdf().catch(e=>alert(e.message));
$('queueAll').onclick=()=>prepare().catch(e=>alert(e.message));
$('sendTest').onclick=()=>verify().catch(e=>alert(e.message));
$('dispatchOne').onclick=()=>next().catch(e=>alert(e.message));
refresh();
setInterval(refresh,60000);
})();
