(()=>{
  'use strict';
  if(window.__GNK_ADMIN_MEDIA_APPLICATIONS_V1__)return;
  window.__GNK_ADMIN_MEDIA_APPLICATIONS_V1__=true;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clean=value=>String(value??'').trim();
  let lastAccessByCode=new Map();
  function addStyles(){
    if(document.getElementById('adminMediaApplicationsStyle'))return;
    const style=document.createElement('style');
    style.id='adminMediaApplicationsStyle';
    style.textContent='.admin-media-applications{margin-top:24px}.admin-media-applications-body{margin-top:16px}.admin-media-table-wrap{overflow:auto;border:1px solid rgba(190,151,62,.28);border-radius:14px;background:#fff}.admin-media-table-wrap table{width:100%;min-width:1540px;border-collapse:collapse}.admin-media-table-wrap th,.admin-media-table-wrap td{padding:12px 14px;text-align:left;vertical-align:top;border-bottom:1px solid rgba(26,22,16,.09);font-size:12px}.admin-media-table-wrap th{background:#f4ead0;color:#332916;font-size:9px;letter-spacing:.1em;text-transform:uppercase}.admin-media-table-wrap td small{display:inline-block;margin-top:4px;color:#746a57;line-height:1.45}.admin-media-table-wrap tbody tr:hover{background:#fffaf0}.admin-media-pill{display:inline-flex;align-items:center;margin:2px 0;padding:4px 7px;border-radius:999px;background:#f4ead0;color:#332916;font-size:10px;font-weight:800}.admin-media-pill.ok{background:#e8f3df;color:#244018}.admin-media-pill.warn{background:#fff1d4;color:#654007}.admin-media-pill.bad{background:#f8dedb;color:#741f16}.admin-media-actions{display:flex;flex-direction:column;gap:6px;margin-top:8px}.admin-media-actions button{border:1px solid rgba(190,151,62,.35);border-radius:9px;background:#fffaf0;color:#332916;font-size:10px;font-weight:800;padding:7px 8px;cursor:pointer}.admin-media-actions button[data-danger]{background:#fff3f1;color:#741f16;border-color:#e2aaa3}.admin-media-output{margin-top:10px;padding:10px;border-radius:12px;background:#fffaf0;border:1px solid rgba(190,151,62,.22);font-size:12px;line-height:1.5;white-space:pre-wrap}.admin-media-output:empty{display:none}';
    document.head.appendChild(style);
  }
  function docs(item){
    const list=item.documents||[];
    if(!list.length)return '<small>Nema dokumenata</small>';
    return list.map(doc=>'<span class="admin-media-pill">'+esc(doc.category||'document')+'</span><br><small>'+esc(doc.filename||'')+(doc.rejected?' · odbijeno':'')+'</small>').join('');
  }
  function accessMap(items){const map=new Map();for(const item of items||[])map.set(String(item.mail_code||'').toUpperCase(),item);return map;}
  function accessCell(access){
    if(!access)return '<span class="admin-media-pill warn">NEMA KODA</span><br><small>Pristup nije izdan.</small>';
    const status=access.access_status||'NEMA KODA';
    const cls=/ACTIVE|USED/i.test(status)?'ok':/REVOK|LOCK|EXPIRED/i.test(status)?'bad':'warn';
    return '<span class="admin-media-pill '+cls+'">'+esc(status)+'</span><br><small>Poslano '+esc(access.access_sent_at||'—')+'</small><br><small>Vrijedi do '+esc(access.access_expires_at||'—')+'</small><br><small>Pokušaji '+esc(access.access_attempts??0)+'</small><br><small>Opozvano '+esc(access.access_revoked_at||'—')+'</small>';
  }
  async function fetchJson(url,options={}){
    const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json','content-type':'application/json',...(options.headers||{})},...options});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);
    return data;
  }
  function output(message){
    let node=document.getElementById('adminMediaAccessOutput');
    if(!node){node=document.createElement('div');node.id='adminMediaAccessOutput';node.className='admin-media-output';document.getElementById('adminMediaApplicationsBody')?.prepend(node);}
    node.textContent=message;
  }
  async function issueDryRun(mailCode,email){
    const data=await fetchJson('/api/media-access/admin/issue',{method:'POST',body:JSON.stringify({mailCode,email,live:false})});
    output(['Testni pristupni kod pripremljen bez slanja poziva.',`Šifra: ${data.mailCode}`,`E-mail: ${data.email}`,`Vrijedi do: ${data.expiresAt}`,`Preview kod: ${data.codePreview||'skriven'}`].join('\n'));
    await load(true);
  }
  async function revoke(mailCode){
    const data=await fetchJson('/api/media-access/admin/revoke',{method:'POST',body:JSON.stringify({mailCode,reason:'admin_center_manual_revoke'})});
    output(`Opoziv završen za ${data.mailCode}. Kodovi: ${data.codes}. Sesije: ${data.sessions}.`);
    await load(true);
  }
  async function audit(mailCode){
    const data=await fetchJson('/api/media-access/admin/audit?mailCode='+encodeURIComponent(mailCode));
    output((data.items||[]).slice(0,8).map(item=>`${item.created_at} · ${item.event_type} · ${item.mail_code} · ${item.email||''}`).join('\n')||'Nema audit zapisa.');
  }
  function controls(item,access){
    const code=esc(String(item.invitationCode||'').toUpperCase());
    const email=esc(item.applicantEmail||access?.email||'');
    return '<div class="admin-media-actions" data-code="'+code+'" data-email="'+email+'"><button type="button" data-action="dry-run">Pripremi test kod</button><button type="button" data-action="audit">Audit</button><button type="button" data-danger data-action="revoke">Opozovi pristup</button></div><small>Stvarno slanje nije dostupno iz ovog pregleda.</small>';
  }
  async function load(force=false){
    addStyles();
    const overview=document.getElementById('overview');
    if(!overview)return;
    if(!force&&document.getElementById('adminMediaApplications'))return;
    let section=document.getElementById('adminMediaApplications');
    if(!section){
      section=document.createElement('section');
      section.id='adminMediaApplications';
      section.className='dashboard-section admin-media-applications';
      section.innerHTML='<div class="section-head"><div><p class="eyebrow">Medijske agencije i redakcije</p><h3>Prijave pozvanih medija</h3><p>Pregled redakcija, predstavnika, urednika, kontakata, putnih podataka, dokumenata, ljudske odluke i pristupnih kodova. Slanje poziva nije omogućeno iz ovog pregleda.</p></div><div><a class="action-link" href="/media-command-center/?tab=applications">Otvori sve prijave</a></div></div><div id="adminMediaApplicationsBody" class="admin-media-applications-body"><p>Učitavanje prijava…</p></div>';
      overview.appendChild(section);
    }
    const body=document.getElementById('adminMediaApplicationsBody');
    try{
      const applications=await fetchJson('/api/media-command-center/applications?limit=12');
      try{lastAccessByCode=accessMap((await fetchJson('/api/media-access/admin/list')).items||[]);}catch{lastAccessByCode=new Map();}
      const items=applications.applications||[];
      body.innerHTML=items.length?'<div id="adminMediaAccessOutput" class="admin-media-output"></div><div class="admin-media-table-wrap"><table><thead><tr><th>Redakcija</th><th>Predstavnik</th><th>Odgovorni urednik</th><th>Put</th><th>Dokumenti</th><th>Status</th><th>Odluka</th><th>Pristupni kod</th><th>Kontrole</th></tr></thead><tbody>'+items.map(item=>{const code=String(item.invitationCode||'').toUpperCase();const access=lastAccessByCode.get(code);return '<tr><td><strong>'+esc(item.outletName||'—')+'</strong><br><small>'+esc(item.outletCountry||'')+' · '+esc(item.invitationCode||'Bez šifre')+'</small><br><small>'+esc(item.outletWebsite||'')+'</small></td><td>'+esc(item.applicantName||'—')+'<br><small>'+esc(item.applicantRole||'')+'</small><br><small>'+esc(item.applicantEmail||'—')+' · '+esc(item.applicantMobile||'')+'</small></td><td>'+esc(item.editorName||'—')+'<br><small>'+esc(item.editorRole||'')+'</small><br><small>'+esc(item.editorEmail||'')+' · '+esc(item.editorMobile||'')+'</small></td><td>'+esc(item.departureCity||'—')+'<br><small>'+esc(item.preferredAirport||'')+'</small><br><small>'+esc(item.travelDates||'')+'</small><br><small>'+esc(item.otherCosts||'')+'</small></td><td>'+docs(item)+'</td><td><span class="admin-media-pill">'+esc(item.status||'—')+'</span><br><small>Score '+esc(item.score??'—')+'</small><br><small>Ažurirano '+esc(item.updatedAt||'')+'</small></td><td><span class="admin-media-pill">'+esc(item.humanDecision||'PENDING')+'</span><br><small>'+esc(item.decisionReason||'')+'</small><br><small>'+esc(item.decidedBy||'')+' '+esc(item.decidedAt||'')+'</small></td><td>'+accessCell(access)+'</td><td>'+controls(item,access)+'</td></tr>'}).join('')+'</tbody></table></div>':'<p>Nema zaprimljenih prijava.</p>';
    }catch(error){body.innerHTML='<p>Prijave se prikazuju nakon sigurne administratorske prijave. '+esc(error.message||error)+'</p>';}
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('.admin-media-actions button');
    if(!button)return;
    const box=button.closest('.admin-media-actions'),code=clean(box?.dataset.code),email=clean(box?.dataset.email),action=button.dataset.action;
    if(!code){output('Nedostaje invitation code.');return;}
    button.disabled=true;
    Promise.resolve(action==='dry-run'?issueDryRun(code,email):action==='revoke'?revoke(code):audit(code)).catch(error=>output(String(error.message||error))).finally(()=>{button.disabled=false;});
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>load(),{once:true});else load();
})();
