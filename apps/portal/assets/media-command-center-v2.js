(() => {
  'use strict';
  const API='/api/media-command-center';
  const state={status:null,contacts:[],applications:[],campaign:null,importContacts:null,importPreview:null,pendingDecision:null};
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const tag=(value,kind='')=>`<span class="tag ${kind}">${esc(value)}</span>`;

  async function api(path,options={}){
    const response=await fetch(`${API}${path}`,{credentials:'same-origin',headers:{'content-type':'application/json',...(options.headers||{})},...options});
    const data=await response.json().catch(()=>({ok:false,error:`HTTP_${response.status}`}));
    if(!response.ok||data.ok===false)throw new Error(data.message||data.error||`HTTP_${response.status}`);
    return data;
  }

  function notice(text,error=false){const element=$('systemNotice');element.textContent=text;element.classList.toggle('error',error);}
  function tabs(){document.querySelectorAll('.mcc-tabs button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.mcc-tabs button').forEach(item=>item.classList.remove('active'));document.querySelectorAll('.mcc-panel').forEach(item=>item.classList.remove('active'));button.classList.add('active');$(button.dataset.tab)?.classList.add('active');}));}
  function statusKind(value){return value==='READY'?'ok':['AWAITING_APPROVAL','NEEDS_VERIFICATION','EXPIRED_APPROVAL'].includes(value)?'warn':['BLOCKED','SUPPRESSED'].includes(value)?'bad':'';}
  function dateTime(value){if(!value)return'—';try{return new Intl.DateTimeFormat('hr-HR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));}catch{return String(value);}}
  function accessKind(access){if(!access)return'warn';if(access.sendStatus==='FAILED'||access.expired)return'bad';if(access.sendStatus==='SENT')return'ok';return'warn';}
  function accessLabel(access){if(!access)return'KOD NIJE IZDAN';if(access.expired)return'KOD ISTEKAO';if(access.sendStatus==='SENT')return'KOD POSLAN';if(access.sendStatus==='FAILED')return'SLANJE KODA NIJE USPJELO';return access.sendStatus||'KOD U OBRADI';}

  function renderKpis(){
    const status=state.status||{},contacts=status.contacts||{},applications=status.applications||{},readiness=status.readiness||{},access=status.accessCodes||{};
    const items=[['Kontakti',contacts.total||0],['Operativno spremni',readiness.ready||0],['Čekaju odobrenje',readiness.awaitingApproval||0],['Za provjeru',readiness.needsVerification||0],['Blokirani',readiness.blocked||0],['Prijave',applications.total||0],['Odobrene prijave',applications.approved||0],['Kodovi poslani',access.sent||0]];
    $('kpis').innerHTML=items.map(([label,value])=>`<article class="mcc-kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join('');
    const issues=(readiness.needsVerification||0)+(readiness.blocked||0)+(applications.incomplete||0)+(access.failed||0);
    const attention=$('attentionQueue');
    if(issues){attention.hidden=false;attention.innerHTML=`<strong>Zahtijeva pažnju:</strong> ${esc(readiness.needsVerification||0)} kontakata za provjeru, ${esc(readiness.blocked||0)} blokiranih, ${esc(applications.incomplete||0)} nepotpunih prijava i ${esc(access.failed||0)} neuspjelih slanja pristupnog koda.`;}else attention.hidden=true;
  }

  function renderSystem(){
    const status=state.status||{},bindings=status.bindings||{},rate=status.rate||{},readiness=status.readiness||{},access=status.accessCodes||{};
    $('environmentBadge').textContent=status.live?'LIVE':'DRY-RUN · MASOVNO SLANJE ZAKLJUČANO';
    $('environmentBadge').classList.toggle('live',Boolean(status.live));
    $('systemCards').innerHTML=[
      ['Način slanja',status.live?'LIVE':'DRY-RUN'],['D1 baza',bindings.d1?'AKTIVNA':'NEDOSTAJE'],['R2 dokumenti',bindings.r2?'AKTIVNI':'NEDOSTAJE'],
      ['Email binding',bindings.email?'AKTIVAN':'NEDOSTAJE'],['Auto potvrda',status.autoAcknowledgement?'UKLJUČENA':'ISKLJUČENA'],
      ['Satna kvota',`${rate.hour?.used||0}/${rate.hour?.limit||0}`],['Dnevna kvota',`${rate.day?.used||0}/${rate.day?.limit||0}`],
      ['Kontakti READY',readiness.ready||0],['Kodovi poslani',access.sent||0],['Neuspjeli kodovi',access.failed||0],['Rok prijave','20. 7. 2026.'],['Konačna odluka','LJUDSKA']
    ].map(([label,value])=>`<article class="mcc-system-card"><strong>${esc(value)}</strong><span>${esc(label)}</span></article>`).join('');
    renderReadiness(readiness);
  }

  function renderReadiness(readiness={}){
    const counts=readiness.counts||{};
    $('readinessCards').innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([status,count])=>`<article class="mcc-system-card"><strong>${esc(count)}</strong><span>${esc(status)}</span></article>`).join('')||'<p>Nema podataka o spremnosti.</p>';
  }

  function fillCampaign(){const campaign=state.campaign||{};$('titleHr').value=campaign.titleHr||'';$('titleEn').value=campaign.titleEn||'';$('bodyHr').value=campaign.bodyHr||'';$('bodyEn').value=campaign.bodyEn||'';$('deadlineText').value=campaign.deadline||'';$('pdfR2Key').value=campaign.pdfR2Key||'';}
  async function loadStatus(){try{state.status=await api('/status');state.campaign=state.status.campaign;renderKpis();renderSystem();fillCampaign();notice(`Sustav ${state.status.live?'LIVE':'DRY-RUN'} · D1 ${state.status.bindings.d1?'OK':'NEDOSTAJE'} · R2 ${state.status.bindings.r2?'OK':'NEDOSTAJE'} · Email ${state.status.bindings.email?'OK':'NEDOSTAJE'}`);}catch(error){notice(error.message,true);}}

  async function loadContacts(){try{const query=encodeURIComponent($('contactSearch').value.trim()),ready=$('contactReady').value;const data=await api(`/contacts?limit=200&q=${query}&ready=${ready}`);state.contacts=data.items||[];renderContacts();}catch(error){notice(error.message,true);}}
  function contactDetail(contact){return `<button class="mcc-detail-close" type="button">×</button><h3>${esc(contact.outlet)}</h3><dl><dt>Šifra</dt><dd><code>${esc(contact.mailCode)}</code></dd><dt>Primatelj</dt><dd>${esc(contact.recipientName||contact.recipientTitle||'Nije potvrđen')}</dd><dt>Funkcija</dt><dd>${esc(contact.role||'—')}</dd><dt>Desk</dt><dd>${esc(contact.secondaryDesk||'—')}</dd><dt>TO</dt><dd>${esc(contact.toEmail||contact.email||'—')}</dd><dt>CC</dt><dd>${esc(contact.ccEmail||'—')}</dd><dt>Status osobe</dt><dd>${esc(contact.personStatus||'—')}</dd><dt>Status kanala</dt><dd>${esc(contact.channelStatus||'—')}</dd><dt>Operativni status</dt><dd>${tag(contact.operationalStatus||'UNASSESSED',statusKind(contact.operationalStatus))}</dd><dt>Razlog</dt><dd>${esc(contact.blockedReason||'Nema blokade')}</dd><dt>Napomena</dt><dd>${esc(contact.note||'—')}</dd><dt>Izvor</dt><dd>${contact.source?`<a href="${esc(contact.source)}" target="_blank" rel="noopener">Otvori službeni izvor</a>`:'—'}</dd></dl>`;}
  function openContactDetail(code){const contact=state.contacts.find(item=>item.mailCode===code);if(!contact)return;const detail=$('contactDetail');detail.innerHTML=contactDetail(contact);detail.hidden=false;detail.querySelector('.mcc-detail-close')?.addEventListener('click',()=>{detail.hidden=true;});}
  function renderContacts(){
    $('contactsBody').innerHTML=state.contacts.map(contact=>{const operational=contact.operationalStatus||((contact.automationAllowed&&contact.email)?'AWAITING_APPROVAL':'MANUAL_ONLY');return `<tr><td><code>${esc(contact.mailCode)}</code><br>${tag(contact.priority||'—')}</td><td><strong>${esc(contact.outlet)}</strong><br>${esc(contact.country||'')}<br><small>${esc(contact.secondaryDesk||'')}</small></td><td>${esc(contact.recipientName||contact.recipientTitle||'Nije potvrđeno')}<br><small>${esc(contact.role||'')}</small></td><td>${contact.email?`<b>${esc(contact.email)}</b>`:esc(contact.channel||'Nema potvrđenog e-maila')}<br><small>${esc(contact.channelStatus||'')}</small></td><td>${tag(operational,statusKind(operational))}<br><small>${esc(contact.blockedReason||'')}</small></td><td>${tag(contact.approved?'ODOBRENO':'NIJE ODOBRENO',contact.approved?'ok':'warn')}</td><td><div class="row-actions"><button data-detail-contact="${esc(contact.mailCode)}">Detalji</button><button data-preview="${esc(contact.mailCode)}">Preview</button><button data-approve="${esc(contact.mailCode)}" data-value="${contact.approved?'0':'1'}">${contact.approved?'Poništi':'Odobri'}</button></div></td></tr>`;}).join('')||'<tr><td colspan="7">Nema rezultata.</td></tr>';
    $('contactsBody').querySelectorAll('[data-detail-contact]').forEach(button=>button.addEventListener('click',()=>openContactDetail(button.dataset.detailContact)));
    $('contactsBody').querySelectorAll('[data-preview]').forEach(button=>button.addEventListener('click',()=>{$('previewCode').value=button.dataset.preview;document.querySelector('[data-tab="campaign"]').click();previewMessage();}));
    $('contactsBody').querySelectorAll('[data-approve]').forEach(button=>button.addEventListener('click',async()=>{try{await api('/contact-approval',{method:'POST',body:JSON.stringify({mailCode:button.dataset.approve,approved:button.dataset.value==='1'})});await Promise.all([loadContacts(),loadStatus()]);}catch(error){notice(error.message,true);}}));
  }

  function campaignPayload(){return{titleHr:$('titleHr').value.trim(),titleEn:$('titleEn').value.trim(),bodyHr:$('bodyHr').value.trim(),bodyEn:$('bodyEn').value.trim(),deadline:$('deadlineText').value.trim(),pdfR2Key:$('pdfR2Key').value.trim()};}
  async function saveCampaign(){try{const data=await api('/campaign',{method:'POST',body:JSON.stringify(campaignPayload())});state.campaign=data.campaign;notice('Kampanja je spremljena. Produkcijsko slanje ostaje zaključano.');}catch(error){notice(error.message,true);}}
  async function previewMessage(){try{const data=await api('/preview',{method:'POST',body:JSON.stringify({mailCode:$('previewCode').value.trim(),campaign:campaignPayload()})});$('messagePreview').textContent=`TO: ${data.contact.email||'[ručni kanal]'}\nSUBJECT: ${data.message.subject}\n\n${data.message.text}`;}catch(error){$('messagePreview').textContent=error.message;}}

  async function loadApplications(){try{const status=encodeURIComponent($('applicationStatus').value);const data=await api(`/applications?limit=200&status=${status}`);state.applications=data.applications||[];renderApplications();}catch(error){notice(error.message,true);}}
  function applicationAccessHtml(application){const access=application.access;if(!access)return `${tag('KOD NIJE IZDAN','warn')}<br><small>Kod se automatski izdaje nakon odobrenja.</small>`;return `${tag(accessLabel(access),accessKind(access))}<br><small>${access.last4?`Završava: ${esc(access.last4)} · `:''}Poslano: ${esc(dateTime(access.sentAt))}<br>Vrijedi do: ${esc(dateTime(access.expiresAt))}${access.lastError?`<br>${esc(access.lastError)}`:''}</small>`;}
  function openApplicationDetail(id){const application=state.applications.find(item=>item.applicationId===id);if(!application)return;$('applicationDetail').innerHTML=`<h3>${esc(application.applicationId)}</h3><p>${applicationAccessHtml(application)}</p><pre>${esc(JSON.stringify(application,null,2))}</pre>`;}
  function openDecision(id,decision){state.pendingDecision={id,decision};$('decisionApplicationId').value=id;$('decisionValue').value=decision;$('decisionReason').value='';$('decisionDialog').showModal();}
  async function submitDecision(){const pending=state.pendingDecision;if(!pending)return;const reason=$('decisionReason').value.trim(),decidedBy=$('decisionBy').value.trim()||'Admin';if(!reason){$('decisionReason').focus();return;}try{const data=await api('/application-decision',{method:'POST',body:JSON.stringify({applicationId:pending.id,decision:pending.decision,reason,decidedBy})});$('decisionDialog').close();state.pendingDecision=null;if(pending.decision==='APPROVED'){const sent=data.accessCode?.sendStatus==='SENT';notice(sent?'Prijava je odobrena i pristupni kod je poslan.':'Prijava je odobrena, ali slanje pristupnog koda treba provjeriti.',!sent);}await Promise.all([loadApplications(),loadStatus()]);}catch(error){notice(error.message,true);}}
  async function resendAccessCode(id){try{const data=await api('/resend-access-code',{method:'POST',body:JSON.stringify({applicationId:id})});notice(data.sendStatus==='SENT'?'Novi pristupni kod je poslan.':'Novi kod je izrađen, ali slanje nije uspjelo.',data.sendStatus!=='SENT');await Promise.all([loadApplications(),loadStatus()]);}catch(error){notice(error.message,true);}}
  function renderApplications(){
    $('applicationsBody').innerHTML=state.applications.map(application=>{const kind=application.status==='READY_FOR_HUMAN_REVIEW'?'ok':application.status==='INCOMPLETE'?'warn':'bad',documents=application.documents||[],summary=['assignment_letter','press_credential','flight_document'].map(type=>`${type}: ${documents.some(document=>document.category===type&&!document.rejected)?'DA':'NE'}`).join('<br>');const approved=application.humanDecision==='APPROVED';return `<tr><td><code>${esc(application.applicationId)}</code><br><small>${esc(application.invitationCode||'NEMA ŠIFRE')}</small><br>${esc(application.receivedAt||'')}</td><td><strong>${esc(application.outletName||'Nepoznato')}</strong><br>${esc(application.applicantName||'')}<br><small>${esc(application.applicantRole||'')}</small></td><td>${esc(application.applicantEmail||'')}<br>${esc(application.applicantMobile||'')}<br><small>Urednik: ${esc(application.editorName||'')} · ${esc(application.editorEmail||'')}</small></td><td>${esc(application.departureCity||'')} · ${esc(application.preferredAirport||'')}<br>${esc(application.travelDates||'')}<br><small>${summary}</small></td><td>${tag(application.status,kind)}<br>Score ${esc(application.score)}/100</td><td>${tag(application.humanDecision||'PENDING',approved?'ok':application.humanDecision==='REJECTED'?'bad':'warn')}<br><small>${esc(application.decisionReason||'')}</small><br>${applicationAccessHtml(application)}</td><td><div class="row-actions"><button data-app-detail="${esc(application.applicationId)}">Detalji</button><button data-decision="VERIFIED" data-id="${esc(application.applicationId)}">Provjereno</button><button data-decision="REQUEST_MORE_INFORMATION" data-id="${esc(application.applicationId)}">Dopuna</button><button data-decision="APPROVED" data-id="${esc(application.applicationId)}">Odobri + pošalji kod</button><button data-decision="REJECTED" data-id="${esc(application.applicationId)}">Odbij</button>${approved?`<button data-resend-code="${esc(application.applicationId)}">Ponovno pošalji kod</button>`:''}</div></td></tr>`;}).join('')||'<tr><td colspan="7">Nema zaprimljenih prijava.</td></tr>';
    $('applicationsBody').querySelectorAll('[data-app-detail]').forEach(button=>button.addEventListener('click',()=>openApplicationDetail(button.dataset.appDetail)));
    $('applicationsBody').querySelectorAll('[data-decision]').forEach(button=>button.addEventListener('click',()=>openDecision(button.dataset.id,button.dataset.decision)));
    $('applicationsBody').querySelectorAll('[data-resend-code]').forEach(button=>button.addEventListener('click',()=>resendAccessCode(button.dataset.resendCode)));
  }

  async function readImportFile(){const file=$('contactImportFile').files?.[0];if(!file)throw new Error('Odaberite media_contacts_112_full.json iz ZIP paketa.');const text=await file.text();let contacts;try{contacts=JSON.parse(text);}catch{throw new Error('Odabrana datoteka nije valjani JSON.');}if(!Array.isArray(contacts))throw new Error('JSON mora sadržavati polje kontakata.');state.importContacts=contacts;$('contactImportFileInfo').textContent=`${file.name} · ${contacts.length} kontakata · ${(file.size/1024).toFixed(1)} KB`;return contacts;}
  async function previewImport(){try{const contacts=await readImportFile();const data=await api('/import-preview',{method:'POST',body:JSON.stringify({contacts})});state.importPreview=data;$('contactImportPreview').textContent=JSON.stringify(data,null,2);$('applyContactImport').disabled=false;notice('Dataset je provjeren. Pregledajte razlike prije uvoza.');}catch(error){state.importPreview=null;$('applyContactImport').disabled=true;$('contactImportPreview').textContent=error.message;notice(error.message,true);}}
  async function applyImport(){try{if(!state.importContacts||!state.importPreview)throw new Error('Prvo pokrenite pregled razlika.');const confirm=$('contactImportConfirmation').value.trim();if(confirm!=='IMPORT_112_CONTACTS')throw new Error('Potvrda nije točna.');const data=await api('/import-contacts',{method:'POST',body:JSON.stringify({contacts:state.importContacts,confirm,importedBy:'ADMIN'})});$('contactImportPreview').textContent=JSON.stringify(data,null,2);notice('Dataset je kontrolirano uvezen. Slanje je i dalje zaključano.');await Promise.all([loadStatus(),loadContacts()]);}catch(error){notice(error.message,true);}}

  function bind(){
    tabs();$('reloadContacts').addEventListener('click',loadContacts);$('contactSearch').addEventListener('input',()=>{clearTimeout(window.__mccSearch);window.__mccSearch=setTimeout(loadContacts,300);});$('contactReady').addEventListener('change',loadContacts);
    $('saveCampaign').addEventListener('click',saveCampaign);$('previewMessage').addEventListener('click',previewMessage);$('reloadApplications').addEventListener('click',loadApplications);$('applicationStatus').addEventListener('change',loadApplications);
    $('confirmDecision').addEventListener('click',event=>{event.preventDefault();submitDecision();});$('contactImportFile').addEventListener('change',()=>{state.importContacts=null;state.importPreview=null;$('applyContactImport').disabled=true;});$('previewContactImport').addEventListener('click',previewImport);$('applyContactImport').addEventListener('click',applyImport);
  }
  async function start(){bind();await loadStatus();await Promise.all([loadContacts(),loadApplications()]);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
