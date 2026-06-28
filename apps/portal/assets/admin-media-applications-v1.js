(()=>{
  'use strict';
  if(window.__GNK_ADMIN_MEDIA_APPLICATIONS_V1__)return;
  window.__GNK_ADMIN_MEDIA_APPLICATIONS_V1__=true;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  async function load(){
    const overview=document.getElementById('overview');
    if(!overview||document.getElementById('adminMediaApplications'))return;
    const section=document.createElement('section');
    section.id='adminMediaApplications';
    section.className='dashboard-section admin-media-applications';
    section.innerHTML='<div class="section-head"><div><p class="eyebrow">Medijske agencije i redakcije</p><h3>Prijave pozvanih medija</h3><p>Imena, redakcije, kontakti, putni podaci, dokumenti i status ljudske odluke.</p></div><div><a class="action-link" href="/media-command-center/?tab=applications">Otvori sve prijave</a></div></div><div id="adminMediaApplicationsBody" class="admin-media-applications-body"><p>Učitavanje prijava…</p></div>';
    overview.appendChild(section);
    const body=document.getElementById('adminMediaApplicationsBody');
    try{
      const response=await fetch('/api/media-command-center/applications?limit=12',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);
      const items=data.applications||[];
      body.innerHTML=items.length?'<div class="admin-media-table-wrap"><table><thead><tr><th>Redakcija</th><th>Predstavnik</th><th>Kontakt</th><th>Put</th><th>Status</th><th>Odluka</th></tr></thead><tbody>'+items.map(item=>'<tr><td><strong>'+esc(item.outletName||'—')+'</strong><br><small>'+esc(item.invitationCode||'Bez šifre')+'</small></td><td>'+esc(item.applicantName||'—')+'<br><small>'+esc(item.applicantRole||'')+'</small></td><td>'+esc(item.applicantEmail||'—')+'<br><small>'+esc(item.applicantMobile||'')+'</small></td><td>'+esc(item.departureCity||'—')+'<br><small>'+esc(item.preferredAirport||'')+' · '+esc(item.travelDates||'')+'</small></td><td>'+esc(item.status||'—')+'<br><small>Score '+esc(item.score??'—')+'</small></td><td>'+esc(item.humanDecision||'PENDING')+'<br><small>'+esc(item.decisionReason||'')+'</small></td></tr>').join('')+'</tbody></table></div>':'<p>Nema zaprimljenih prijava.</p>';
    }catch(error){body.innerHTML='<p>Prijave se prikazuju nakon sigurne administratorske prijave. '+esc(error.message||error)+'</p>';}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
