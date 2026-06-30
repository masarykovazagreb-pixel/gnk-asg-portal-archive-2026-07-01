(()=>{
  'use strict';
  if(window.__GNK_ASG_MEDIA_CENTER_HISTORY_V2__)return;
  window.__GNK_ASG_MEDIA_CENTER_HISTORY_V2__=true;

  const VERSION='GNK_ASG_MEDIA_CENTER_HISTORY_V2_20260630';
  const API='/api/media-command-center';
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clean=value=>String(value??'').trim();
  let timer=null;
  let loading=false;

  function label(status){
    const value=clean(status).toUpperCase();
    if(value==='SENT')return'POSLANO';
    if(value==='QUEUED')return'U REDU';
    if(value==='SENDING')return'ŠALJE SE';
    if(value==='RETRY')return'PONOVNI POKUŠAJ';
    if(value==='FAILED')return'NEUSPJELO';
    if(value==='REVIEW')return'PROVJERA';
    return value||'NEPOZNATO';
  }

  function statusClass(status){
    const value=clean(status).toLowerCase();
    if(value==='sent')return'sent';
    if(value==='queued')return'queued';
    if(value==='sending')return'sending';
    if(value==='retry')return'retry';
    if(value==='failed')return'failed';
    if(value==='review')return'review';
    return'';
  }

  function dateTime(value){
    const text=clean(value);
    if(!text)return'—';
    const date=new Date(text);
    if(Number.isNaN(date.getTime()))return text;
    return new Intl.DateTimeFormat('hr-HR',{dateStyle:'short',timeStyle:'medium'}).format(date);
  }

  function queryString(){
    const params=new URLSearchParams({limit:'1000',offset:'0',cb:String(Date.now())});
    const status=clean($('historyStatusFilter')?.value).toUpperCase();
    const search=clean($('historySearch')?.value);
    if(status&&status!=='ALL')params.set('status',status);
    if(search)params.set('search',search);
    return params.toString();
  }

  function updateExportLink(){
    const link=$('exportHistory');
    if(!link)return;
    const params=new URLSearchParams();
    const status=clean($('historyStatusFilter')?.value).toUpperCase();
    const search=clean($('historySearch')?.value);
    if(status&&status!=='ALL')params.set('status',status);
    if(search)params.set('search',search);
    params.set('cb',String(Date.now()));
    link.href=`${API}/delivery-history.csv?${params.toString()}`;
  }

  function renderSummary(data){
    const summary=data.summary||{};
    const values=[
      ['Ukupno',Object.values(summary).reduce((sum,value)=>sum+Number(value||0),0)],
      ['Poslano',Number(summary.SENT||0)],
      ['U redu',Number(summary.QUEUED||0)],
      ['Šalje se',Number(summary.SENDING||0)],
      ['Ponovni pokušaj',Number(summary.RETRY||0)],
      ['Neuspjelo',Number(summary.FAILED||0)],
      ['Provjera',Number(summary.REVIEW||0)]
    ];
    const node=$('historySummary');
    if(node)node.innerHTML=values.map(([name,value])=>`<div><small>${esc(name)}</small><strong>${esc(value)}</strong></div>`).join('');
  }

  function renderRows(items){
    const body=$('deliveryHistoryBody');
    if(!body)return;
    if(!items.length){
      body.innerHTML='<tr><td colspan="10" class="history-empty">Nema zapisa za odabrani filter.</td></tr>';
      return;
    }
    body.innerHTML=items.map(item=>{
      const error=[clean(item.lastErrorCode),clean(item.lastError)].filter(Boolean).join(' — ');
      return`<tr>
        <td><span class="history-status ${statusClass(item.status)}">${esc(label(item.status))}</span></td>
        <td>${esc(dateTime(item.sentAt||item.updatedAt||item.queuedAt))}</td>
        <td><strong>${esc(item.outlet||'—')}</strong><br><small>${esc(item.country||'')}</small></td>
        <td>${esc(item.recipient||'Editorial Team')}</td>
        <td>${esc(item.email||'—')}</td>
        <td>${esc(item.subject||'—')}</td>
        <td>${esc(item.attempts||0)}</td>
        <td><code>${esc(item.providerMessageId||'—')}</code></td>
        <td class="history-error">${esc(error||'—')}</td>
        <td><code>${esc(item.mailCode||'—')}</code></td>
      </tr>`;
    }).join('');
  }

  async function loadHistory({silent=false}={}){
    if(loading)return;
    loading=true;
    const button=$('refreshHistory');
    if(button)button.disabled=true;
    const meta=$('historyMeta');
    if(meta&&!silent)meta.textContent='Učitavanje potpune povijesti slanja…';
    try{
      const response=await fetch(`${API}/delivery-history?${queryString()}`,{
        method:'GET',
        credentials:'same-origin',
        cache:'no-store',
        headers:{accept:'application/json','cache-control':'no-cache'}
      });
      const data=await response.json().catch(()=>({ok:false,error:`HTTP_${response.status}`}));
      if(!response.ok||data.ok===false)throw new Error(data.message||data.error||`HTTP_${response.status}`);
      renderSummary(data);
      renderRows(data.items||[]);
      updateExportLink();
      if(meta)meta.textContent=`Prikazano ${data.items?.length||0} od ${data.total||0} zapisa · osvježeno ${dateTime(data.generatedAt)} · read-only ${data.readOnly?'DA':'NE'}`;
      document.documentElement.dataset.mediaHistoryVersion=VERSION;
    }catch(error){
      if(meta)meta.textContent=`Povijest slanja nije učitana: ${error.message}`;
      const body=$('deliveryHistoryBody');
      if(body)body.innerHTML=`<tr><td colspan="10" class="history-empty">Greška: ${esc(error.message)}</td></tr>`;
    }finally{
      loading=false;
      if(button)button.disabled=false;
    }
  }

  function scheduleSearch(){
    clearTimeout(timer);
    timer=setTimeout(()=>loadHistory(),350);
  }

  function boot(){
    if(!$('deliveryHistoryBody'))return;
    $('refreshHistory')?.addEventListener('click',()=>loadHistory());
    $('historyStatusFilter')?.addEventListener('change',()=>loadHistory());
    $('historySearch')?.addEventListener('input',scheduleSearch);
    updateExportLink();
    loadHistory();
    setInterval(()=>{if(!document.hidden)loadHistory({silent:true});},10000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadHistory({silent:true});});
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
