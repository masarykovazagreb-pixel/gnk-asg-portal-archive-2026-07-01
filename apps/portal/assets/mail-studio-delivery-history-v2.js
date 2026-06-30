(()=>{
  'use strict';
  if(window.__GNK_ASG_MAIL_STUDIO_DELIVERY_HISTORY_V2__)return;
  window.__GNK_ASG_MAIL_STUDIO_DELIVERY_HISTORY_V2__=true;

  const VERSION='GNK_ASG_MAIL_STUDIO_DELIVERY_HISTORY_V2_20260630';
  const API='/api/media-command-center';
  const state={items:[],summary:{},mode:'all',search:'',loading:false};
  const clean=value=>String(value??'').trim();
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const authHeaders=()=>{try{return window.GNK_ASG_ADMIN_AUTH?.headers?.()||{};}catch{return{};}};

  function label(status){
    const value=clean(status).toUpperCase();
    return({SENT:'POSLANO',QUEUED:'U REDU',SENDING:'ŠALJE SE',RETRY:'PONOVNI POKUŠAJ',FAILED:'NEUSPJELO',REVIEW:'PROVJERA'})[value]||value||'NEPOZNATO';
  }

  function cssClass(status){return clean(status).toLowerCase();}

  function dateTime(value){
    const text=clean(value);if(!text)return'—';
    const date=new Date(text);if(Number.isNaN(date.getTime()))return text;
    return new Intl.DateTimeFormat('hr-HR',{dateStyle:'short',timeStyle:'medium'}).format(date);
  }

  function build(){
    if(document.getElementById('mailStudioDeliveryHistory'))return;
    const host=document.querySelector('.wrap')||document.body;
    const section=document.createElement('section');
    section.id='mailStudioDeliveryHistory';
    section.className='ms-history';
    section.innerHTML=`
      <div class="ms-history-head">
        <div><span>GNK ASG MEDIA OUTREACH</span><h2>Povijest slanja i red čekanja</h2><p>Read-only prikaz svih kampanjskih poruka. Ovaj modul ne šalje i ne mijenja red.</p></div>
        <div class="ms-history-actions">
          <button type="button" data-ms-mode="all">SVE</button>
          <button type="button" data-ms-mode="sent">POSLANO</button>
          <button type="button" data-ms-mode="outbox">OUTBOX</button>
          <button type="button" data-ms-mode="errors">GREŠKE</button>
          <button type="button" id="msHistoryRefresh">OSVJEŽI</button>
          <a id="msHistoryCsv" href="${API}/delivery-history.csv" download>IZVEZI CSV</a>
        </div>
      </div>
      <div class="ms-history-tools"><label>Pretraži<input id="msHistorySearch" type="search" placeholder="Medij, e-mail, predmet, šifra ili Message ID"></label><div id="msHistoryMeta">Učitavanje…</div></div>
      <div id="msHistorySummary" class="ms-history-summary"></div>
      <div class="ms-history-table-wrap"><table><thead><tr><th>Status</th><th>Vrijeme</th><th>Medij</th><th>Primatelj</th><th>E-mail</th><th>Predmet</th><th>Pokušaji</th><th>Message ID</th><th>Greška</th><th>Šifra</th></tr></thead><tbody id="msHistoryBody"><tr><td colspan="10">Učitavanje povijesti…</td></tr></tbody></table></div>`;
    host.appendChild(section);

    section.querySelectorAll('[data-ms-mode]').forEach(button=>button.addEventListener('click',()=>{state.mode=button.dataset.msMode;render();}));
    document.getElementById('msHistoryRefresh')?.addEventListener('click',()=>load());
    document.getElementById('msHistorySearch')?.addEventListener('input',event=>{state.search=clean(event.target.value).toLowerCase();render();});
    document.querySelectorAll('[data-box]').forEach(button=>button.addEventListener('click',()=>{
      const box=clean(button.dataset.box).toLowerCase();
      if(box==='sent')state.mode='sent';
      else if(box==='outbox')state.mode='outbox';
      else if(box==='status')state.mode='all';
      render();
    }));
  }

  function filtered(){
    let rows=state.items.slice();
    if(state.mode==='sent')rows=rows.filter(row=>clean(row.status).toUpperCase()==='SENT');
    if(state.mode==='outbox')rows=rows.filter(row=>['QUEUED','SENDING','RETRY','REVIEW'].includes(clean(row.status).toUpperCase()));
    if(state.mode==='errors')rows=rows.filter(row=>['FAILED','RETRY','REVIEW'].includes(clean(row.status).toUpperCase()));
    if(state.search)rows=rows.filter(row=>[row.outlet,row.recipient,row.email,row.subject,row.mailCode,row.providerMessageId,row.lastErrorCode,row.lastError].some(value=>clean(value).toLowerCase().includes(state.search)));
    return rows;
  }

  function render(){
    const body=document.getElementById('msHistoryBody');if(!body)return;
    const rows=filtered();
    document.querySelectorAll('[data-ms-mode]').forEach(button=>button.classList.toggle('active',button.dataset.msMode===state.mode));
    const summary=state.summary||{};
    document.getElementById('msHistorySummary').innerHTML=[['Ukupno',Object.values(summary).reduce((sum,value)=>sum+Number(value||0),0)],['Poslano',summary.SENT||0],['U redu',summary.QUEUED||0],['Šalje se',summary.SENDING||0],['Retry',summary.RETRY||0],['Neuspjelo',summary.FAILED||0],['Provjera',summary.REVIEW||0]].map(([name,value])=>`<div><small>${esc(name)}</small><strong>${esc(value)}</strong></div>`).join('');
    document.getElementById('msHistoryMeta').textContent=`Prikazano ${rows.length} od ${state.items.length} · način: ${state.mode.toUpperCase()} · ${VERSION}`;
    if(!rows.length){body.innerHTML='<tr><td colspan="10">Nema zapisa za odabrani prikaz.</td></tr>';return;}
    body.innerHTML=rows.map(row=>{const error=[clean(row.lastErrorCode),clean(row.lastError)].filter(Boolean).join(' — ');return`<tr><td><span class="ms-status ${cssClass(row.status)}">${esc(label(row.status))}</span></td><td>${esc(dateTime(row.sentAt||row.updatedAt||row.queuedAt))}</td><td><strong>${esc(row.outlet||'—')}</strong><br><small>${esc(row.country||'')}</small></td><td>${esc(row.recipient||'Editorial Team')}</td><td>${esc(row.email||'—')}</td><td>${esc(row.subject||'—')}</td><td>${esc(row.attempts||0)}</td><td><code>${esc(row.providerMessageId||'—')}</code></td><td class="ms-error">${esc(error||'—')}</td><td><code>${esc(row.mailCode||'—')}</code></td></tr>`;}).join('');
  }

  async function load(){
    if(state.loading)return;state.loading=true;
    const meta=document.getElementById('msHistoryMeta');if(meta)meta.textContent='Učitavanje potpune povijesti…';
    try{
      const headers=new Headers({'accept':'application/json','cache-control':'no-cache'});
      Object.entries(authHeaders()).forEach(([key,value])=>{if(value)headers.set(key,value);});
      const response=await fetch(`${API}/delivery-history?limit=1000&offset=0&cb=${Date.now()}`,{method:'GET',credentials:'same-origin',cache:'no-store',headers});
      const data=await response.json().catch(()=>({ok:false,error:`HTTP_${response.status}`}));
      if(!response.ok||data.ok===false)throw new Error(data.message||data.error||`HTTP_${response.status}`);
      state.items=Array.isArray(data.items)?data.items:[];state.summary=data.summary||{};render();
      const csv=document.getElementById('msHistoryCsv');if(csv)csv.href=`${API}/delivery-history.csv?cb=${Date.now()}`;
    }catch(error){
      if(meta)meta.textContent=`Povijest nije učitana: ${error.message}`;
      const body=document.getElementById('msHistoryBody');if(body)body.innerHTML=`<tr><td colspan="10">Greška: ${esc(error.message)}</td></tr>`;
    }finally{state.loading=false;}
  }

  function boot(){build();load();setInterval(()=>{if(!document.hidden)load();},10000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
