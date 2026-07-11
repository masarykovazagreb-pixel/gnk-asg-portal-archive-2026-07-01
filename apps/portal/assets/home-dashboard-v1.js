(()=>{
  const ROOT_ID='gnk-home-dashboard';
  const DATA_URL='/data/home-dashboard.hr.json?v=20260711-v1';
  const CSS_URL='/assets/home-dashboard-v1.css?v=20260711-v1';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl=value=>{try{const url=new URL(String(value||'/'),location.origin);return url.origin===location.origin?url.pathname+url.search+url.hash:'/';}catch{return'/';}};
  const imageUrl=value=>{try{const url=new URL(String(value||'/assets/gnk-asg-social-card.png'),location.origin);return url.origin===location.origin?url.pathname+url.search:'/assets/gnk-asg-social-card.png';}catch{return'/assets/gnk-asg-social-card.png';}};
  const fmtDate=value=>{try{return new Intl.DateTimeFormat('hr-HR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value));}catch{return esc(value)}};
  function addCss(){if(document.querySelector(`link[href^="${CSS_URL.split('?')[0]}"]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=CSS_URL;document.head.appendChild(link);}
  function newsCards(items=[]){return items.slice(0,10).map(item=>`<a class="gnk-news-card" href="${safeUrl(item.url)}"><img src="${imageUrl(item.image)}" alt="${esc(item.title)}" loading="lazy" onerror="this.src='/assets/gnk-asg-social-card.png'"><div><div class="gnk-meta"><span>${esc(item.category)}</span><span>${fmtDate(item.date)}</span></div><h4>${esc(item.title)}</h4><p>${esc(item.summary)}</p></div></a>`).join('')||'<div class="gnk-placeholder">Trenutačno nema objavljenih vijesti.</div>';}
  function simpleCards(items=[]){return items.slice(0,10).map(item=>`<a class="gnk-simple-card" href="${safeUrl(item.url)}"><div class="gnk-meta"><span>${esc(item.type||item.status||'Objava')}</span><span>${fmtDate(item.date)}</span></div><h4>${esc(item.title)}</h4><p>${esc(item.summary)}</p></a>`).join('')||'<div class="gnk-placeholder">Trenutačno nema javnih zapisa.</div>';}
  function workerCards(items=[]){return items.map(item=>`<article class="gnk-worker-card"><strong>${esc(item.group)}</strong><div class="gnk-worker-status">${esc(item.status)}</div><div class="gnk-worker-numbers"><span>AKTIVNO ${Number(item.active)||0}</span><span>ZAVRŠENO ${Number(item.completed)||0}</span><span>BLOKIRANO ${Number(item.blocked)||0}</span></div></article>`).join('')||'<div class="gnk-placeholder">Nema dostupnog pregleda workera.</div>';}
  function financeBlock(finance={}){
    const records=Array.isArray(finance.records)?finance.records:[];
    if(!records.length)return`<div class="gnk-finance-empty"><strong>Dnevni financijski pregled čeka verificirane podatke.</strong><p>${esc(finance.message||'Podaci će biti prikazani nakon ovlaštene potvrde.')}</p></div>`;
    const values=records.map(r=>Number(r.result)||0),max=Math.max(...values.map(Math.abs),1),w=900,h=260,p=30,step=(w-p*2)/Math.max(values.length-1,1);
    const points=values.map((v,i)=>`${p+i*step},${h/2-(v/max)*(h/2-p)}`).join(' ');
    return`<svg class="gnk-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Graf dnevnih financijskih rezultata"><line x1="${p}" y1="${h/2}" x2="${w-p}" y2="${h/2}" stroke="#d8c9a8"/><polyline points="${points}" fill="none" stroke="#9f6f1d" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function render(data){
    if(document.getElementById(ROOT_ID))return;
    const root=document.createElement('section');root.id=ROOT_ID;root.setAttribute('aria-label','Dnevni pregled portala');
    root.innerHTML=`<div class="gnk-dashboard-shell"><div class="gnk-dashboard-head"><div><p class="gnk-dashboard-eyebrow">Dnevni pregled portala</p><h2>Vijesti, objave, financije i operacije.</h2></div><div class="gnk-updated">Ažurirano: ${fmtDate(data.updated_at)}</div></div><div class="gnk-dashboard-grid"><section class="gnk-window"><div class="gnk-window-head"><h3>Najnovije vijesti</h3><a href="/news/">Sve vijesti →</a></div><div class="gnk-card-list">${newsCards(data.news)}</div></section><section class="gnk-window"><div class="gnk-window-head"><h3>Objave društva</h3><a href="/objave/">Sve objave →</a></div><div class="gnk-simple-list">${simpleCards(data.publications)}</div></section><section class="gnk-window"><div class="gnk-window-head"><h3>Odluke društva</h3><a href="/odluke-drustva/">Registar →</a></div><div class="gnk-simple-list">${simpleCards(data.decisions)}</div></section><section class="gnk-window"><div class="gnk-window-head"><h3>Dnevni financijski pregled</h3><a href="/financije/dnevni-pregled/">Detalji →</a></div>${financeBlock(data.finance)}</section><section class="gnk-window wide"><div class="gnk-window-head"><h3>Grupe workera</h3><a href="/worker-ops/">Operativni pregled →</a></div><div class="gnk-worker-grid">${workerCards(data.workers)}</div></section></div></div>`;
    const footer=document.querySelector('footer');
    if(footer)footer.before(root);else document.body.appendChild(root);
  }
  async function boot(){
    try{addCss();const response=await fetch(DATA_URL,{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error(`dashboard_data_${response.status}`);const data=await response.json();render(data);}catch(error){console.warn('[GNK home dashboard] skipped safely:',error);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
