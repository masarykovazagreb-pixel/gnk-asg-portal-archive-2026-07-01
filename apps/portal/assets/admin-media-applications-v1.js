(()=>{
  'use strict';
  if(window.__GNK_ADMIN_MEDIA_APPLICATIONS_V1__)return;
  window.__GNK_ADMIN_MEDIA_APPLICATIONS_V1__=true;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function addStyles(){
    if(document.getElementById('adminMediaApplicationsStyle'))return;
    const style=document.createElement('style');
    style.id='adminMediaApplicationsStyle';
    style.textContent='.admin-media-applications{margin-top:24px}.admin-media-applications-body{margin-top:16px}.admin-media-table-wrap{overflow:auto;border:1px solid rgba(190,151,62,.28);border-radius:14px;background:#fff}.admin-media-table-wrap table{width:100%;min-width:1200px;border-collapse:collapse}.admin-media-table-wrap th,.admin-media-table-wrap td{padding:12px 14px;text-align:left;vertical-align:top;border-bottom:1px solid rgba(26,22,16,.09);font-size:12px}.admin-media-table-wrap th{background:#f4ead0;color:#332916;font-size:9px;letter-spacing:.1em;text-transform:uppercase}.admin-media-table-wrap td small{display:inline-block;margin-top:4px;color:#746a57;line-height:1.45}.admin-media-table-wrap tbody tr:hover{background:#fffaf0}.admin-media-pill{display:inline-flex;align-items:center;margin:2px 0;padding:4px 7px;border-radius:999px;background:#f4ead0;color:#332916;font-size:10px;font-weight:800}';
    document.head.appendChild(style);
  }
  function docs(item){
    const list=item.documents||[];
    if(!list.length)return '<small>Nema dokumenata</small>';
    return list.map(doc=>'<span class="admin-media-pill">'+esc(doc.category||'document')+'</span><br><small>'+esc(doc.filename||'')+(doc.rejected?' · odbijeno':'')+'</small>').join('');
  }
  async function load(){
    addStyles();
    const overview=document.getElementById('overview');
    if(!overview||document.getElementById('adminMediaApplications'))return;
    const section=document.createElement('section');
    section.id='adminMediaApplications';
    section.className='dashboard-section admin-media-applications';
    section.innerHTML='<div class="section-head"><div><p class="eyebrow">Medijske agencije i redakcije</p><h3>Prijave pozvanih medija</h3><p>Pregled redakcija, predstavnika, urednika, kontakata, putnih podataka, dokumenata i ljudske odluke. Slanje poziva nije omogućeno iz ovog pregleda.</p></div><div><a class="action-link" href="/media-command-center/?tab=applications">Otvori sve prijave</a></div></div><div id="adminMediaApplicationsBody" class="admin-media-applications-body"><p>Učitavanje prijava…</p></div>';
    overview.appendChild(section);
    const body=document.getElementById('adminMediaApplicationsBody');
    try{
      const response=await fetch('/api/media-command-center/applications?limit=12',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);
      const items=data.applications||[];
      body.innerHTML=items.length?'<div class="admin-media-table-wrap"><table><thead><tr><th>Redakcija</th><th>Predstavnik</th><th>Odgovorni urednik</th><th>Put</th><th>Dokumenti</th><th>Status</th><th>Odluka</th></tr></thead><tbody>'+items.map(item=>'<tr><td><strong>'+esc(item.outletName||'—')+'</strong><br><small>'+esc(item.outletCountry||'')+' · '+esc(item.invitationCode||'Bez šifre')+'</small><br><small>'+esc(item.outletWebsite||'')+'</small></td><td>'+esc(item.applicantName||'—')+'<br><small>'+esc(item.applicantRole||'')+'</small><br><small>'+esc(item.applicantEmail||'—')+' · '+esc(item.applicantMobile||'')+'</small></td><td>'+esc(item.editorName||'—')+'<br><small>'+esc(item.editorRole||'')+'</small><br><small>'+esc(item.editorEmail||'')+' · '+esc(item.editorMobile||'')+'</small></td><td>'+esc(item.departureCity||'—')+'<br><small>'+esc(item.preferredAirport||'')+'</small><br><small>'+esc(item.travelDates||'')+'</small><br><small>'+esc(item.otherCosts||'')+'</small></td><td>'+docs(item)+'</td><td><span class="admin-media-pill">'+esc(item.status||'—')+'</span><br><small>Score '+esc(item.score??'—')+'</small><br><small>Ažurirano '+esc(item.updatedAt||'')+'</small></td><td><span class="admin-media-pill">'+esc(item.humanDecision||'PENDING')+'</span><br><small>'+esc(item.decisionReason||'')+'</small><br><small>'+esc(item.decidedBy||'')+' '+esc(item.decidedAt||'')+'</small></td></tr>').join('')+'</tbody></table></div>':'<p>Nema zaprimljenih prijava.</p>';
    }catch(error){body.innerHTML='<p>Prijave se prikazuju nakon sigurne administratorske prijave. '+esc(error.message||error)+'</p>';}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
