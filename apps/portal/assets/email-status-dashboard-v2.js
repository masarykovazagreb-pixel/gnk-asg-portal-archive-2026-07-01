(()=>{
'use strict';
if(window.__GNK_ASG_EMAIL_STATUS_DASHBOARD_V2__)return;
window.__GNK_ASG_EMAIL_STATUS_DASHBOARD_V2__=true;
const params=new URLSearchParams(location.search);
const allowed=new Set(['all','mail-studio','campaign-mailer','media-center','auto-reply']);
const requested=params.get('source')||'all';
const source=allowed.has(requested)?requested:'all';
const query=(params.get('search')||'').slice(0,150);
const candidate=params.get('from')||'';
const from=candidate.startsWith('/')&&!candidate.startsWith('//')?candidate:'';
const labels={'mail-studio':'Mail Studio','campaign-mailer':'Campaign Mailer','media-center':'Media Center','auto-reply':'Automatski odgovori',all:'svi sustavi'};
const statusLabels={SUBMITTING:'Priprema',ACCEPTED:'Prihvaćeno',DEFERRED:'Odgođeno',DELIVERED:'Dostavljeno',OPENED:'Otvoreno',BOUNCED:'Vraćeno',REJECTED:'Odbijeno',FAILED:'Neuspjelo',UNKNOWN:'Nepoznato'};
const css=document.createElement('style');css.textContent=`
.gnk-status-help{margin:14px 0;padding:14px 16px;border:1px solid #cbd5e1;border-radius:14px;background:#f8fafc;color:#334155;font:500 13px/1.55 Arial,sans-serif}.gnk-status-help strong{color:#0f172a}.gnk-status-actions{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}.gnk-status-action{padding:10px 13px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f172a;font-weight:800;cursor:pointer;text-decoration:none}.gnk-status-action.primary{background:#0f172a;color:#fff;border-color:#0f172a}.gnk-status-note{margin-top:8px;color:#475569;font-size:12px}`;document.head.append(css);
const translate=()=>{
 document.querySelectorAll('td,th,option,button,span,strong,div').forEach(node=>{if(node.children.length)return;const text=(node.textContent||'').trim();if(statusLabels[text])node.textContent=statusLabels[text];});
};
const boot=()=>{
 document.documentElement.lang='hr';
 const select=document.querySelector('#source'),search=document.querySelector('#search'),load=document.querySelector('#load'),title=document.querySelector('h1'),top=document.querySelector('.top')||title?.parentElement;
 if(select)select.value=source;if(search&&query)search.value=query;
 if(title)title.textContent=source==='all'?'Status svih email poruka':`Status poruka — ${labels[source]}`;
 document.title=`${title?.textContent||'Status email poruka'} | GNK ASG`;
 if(top&&!document.querySelector('.gnk-status-help')){
  const help=document.createElement('div');help.className='gnk-status-help';help.innerHTML='<strong>Kako čitati statuse:</strong> Prihvaćeno znači da je pružatelj preuzeo poruku za slanje. Dostavljeno znači da ju je prihvatio poslužitelj primatelja. Otvoreno je signal učitavanja tracking slike i nije apsolutni dokaz da je osoba pročitala poruku.';
  const actions=document.createElement('div');actions.className='gnk-status-actions';
  const refresh=document.createElement('button');refresh.type='button';refresh.className='gnk-status-action primary';refresh.textContent='Osvježi podatke';refresh.onclick=()=>load?.click();actions.append(refresh);
  const sync=document.createElement('button');sync.type='button';sync.className='gnk-status-action';sync.textContent='Uskladi s Cloudflareom';
  const note=document.createElement('div');note.className='gnk-status-note';
  sync.onclick=async()=>{sync.disabled=true;note.textContent='Usklađivanje je u tijeku…';try{const response=await fetch('/api/email-status/sync',{method:'POST',credentials:'same-origin',cache:'no-store'}),data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||data.error||`HTTP ${response.status}`);note.textContent=`Usklađivanje završeno. Obrađeno događaja: ${data.events??data.eventCount??0}.`;load?.click();}catch(error){note.textContent=`Usklađivanje nije završeno: ${error.message}`;}finally{sync.disabled=false;}};actions.append(sync);
  if(from){const back=document.createElement('a');back.className='gnk-status-action';back.href=from;back.textContent='← Natrag u aplikaciju';actions.append(back);}
  top.append(help,actions,note);
 }
 load?.click();translate();
 new MutationObserver(translate).observe(document.body,{subtree:true,childList:true});
};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
