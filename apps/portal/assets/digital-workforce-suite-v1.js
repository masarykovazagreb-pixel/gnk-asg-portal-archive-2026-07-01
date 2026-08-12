(()=>{
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const isEn=location.pathname.startsWith('/en/');
  const base='/api/public/digital-workforce/';
  const langParam=isEn?'lang=en':'';
  const state={filters:{q:'',project:''},projects:null};
  let requestId=0,controller=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>new Intl.NumberFormat(isEn?'en-US':'hr-HR').format(Number(v)||0);
  const date=v=>v?new Date(v).toLocaleDateString(isEn?'en-US':'hr-HR'):'—';
  const dateTime=v=>v?new Date(v).toLocaleString(isEn?'en-US':'hr-HR'):'—';
  const T=isEn?{
    days:'Days',noRecords:'No records for this view.',noBulletins:'No bulletins published yet.',
    workers:'workers',progress:'Progress',gate:'Gate',owner:'Owner',dependency:'Dependency',
    todo:'To do',inProgress:'In progress',done:'Done',noTasks:'No tasks.',due:'Due: day',
    simulation:'SIMULATION',transactionsShown:'transactions shown',editor:'Editor',
    search:'Search',nameFunctionProject:'Name, function, or project',allProjects:'All projects',
    workersLabel:'Workers',noWorkers:'No workers match the selected criteria.',
    colId:'ID',colName:'Full name',colProject:'Project',colFunction:'Function',colStatus:'Status',
    logEmpty:'The activity log is empty.',loading:'Loading operational data…',
    dataUnavailable:'Data is currently unavailable.',retry:'Try again',
    statusUnavailable:'Status unavailable',
  }:{
    days:'Dani',noRecords:'Nema zapisa za odabrani prikaz.',noBulletins:'Nema objavljenih biltena.',
    workers:'workera',progress:'Napredak',gate:'Gate',owner:'Vlasnik',dependency:'Ovisnost',
    todo:'Za napraviti',inProgress:'U tijeku',done:'Završeno',noTasks:'Nema zadataka.',due:'Rok: dan',
    simulation:'SIMULACIJA',transactionsShown:'prikazanih transakcija',editor:'Urednik',
    search:'Pretraga',nameFunctionProject:'Ime, funkcija ili projekt',allProjects:'Svi projekti',
    workersLabel:'Workeri',noWorkers:'Nema workera za odabrane kriterije.',
    colId:'ID',colName:'Ime i prezime',colProject:'Projekt',colFunction:'Funkcija',colStatus:'Status',
    logEmpty:'Zapisnik je prazan.',loading:'Učitavanje operativnih podataka…',
    dataUnavailable:'Podaci trenutačno nisu dostupni.',retry:'Pokušaj ponovno',
    statusUnavailable:'Status nije dostupan',
  };
  const routeMap={plan:'plan',bulletins:'bulletins',projects:'projects',risks:'risks',opinions:'opinions',dependencies:'dependencies',tasks:'tasks',credits:'credits',newsroom:'newsroom',workers:'workers','activity-log':'log'};
  async function get(key,signal){const sep=key.includes('?')?'&':'?';const url=langParam?`${base}${key}${sep}${langParam}`:`${base}${key}`;const r=await fetch(url,{cache:'no-store',headers:{accept:'application/json'},signal});if(!r.ok)throw new Error(`${key}:${r.status}`);return r.json()}
  const badge=v=>{const t=String(v||'').toLowerCase();const c=/done|complete|active|green|low|ok|resolved|approved/.test(t)?'is-success':/progress|review|medium|pending|watch|amber/.test(t)?'is-warning':/blocked|critical|high|failed|red|overdue|rejected/.test(t)?'is-danger':'is-neutral';return `<span class="dw-badge ${c}" style="margin-left:8px">${esc(v||'N/A')}</span>`};
  const cards=(items,render)=>items?.length?`<div class="dw-grid">${items.map(render).join('')}</div>`:`<div class="dw-empty">${T.noRecords}</div>`;
  const views={
    plan:d=>cards(d.items,x=>`<article class="dw-card"><span class="dw-kicker">${esc(T.days)} ${esc(x.block)}</span><h3>${esc(x.focus)}</h3></article>`),
    bulletins:d=>d.items?.length?d.items.slice(0,18).map(x=>`<details class="dw-row"><summary><span>${isEn?'Issue':'Izdanje'} #${esc(x.issue)}</span><span style="margin:0 8px;opacity:.5">·</span><time>${date(x.publishedAt)}</time></summary><p>${esc(x.summary)}</p></details>`).join(''):`<div class="dw-empty">${T.noBulletins}</div>`,
    projects:d=>cards(d.items,x=>`<article class="dw-card"><div class="dw-card-head"><span class="dw-kicker">${esc(x.id)} · ${fmt(x.team)} ${esc(T.workers)}</span>${badge(x.phase)}</div><h3>${esc(x.name)}</h3><p><b>${esc(x.lead)}</b></p><p>${esc(T.gate)}: ${esc(x.gate)}</p><div class="dw-progress-meta"><span>${esc(T.progress)}</span><strong>${fmt(x.progress)}%</strong></div><progress max="100" value="${Number(x.progress)||0}"></progress></article>`),
    risks:d=>cards(d.items,x=>`<article class="dw-card"><div class="dw-card-head"><span class="dw-kicker">${esc(x.projectId)}</span>${badge(x.status)}</div><h3>${esc(x.title)}</h3><p>${esc(T.owner)}: <b>${esc(x.owner)}</b></p></article>`),
    opinions:d=>cards(d.items,x=>`<article class="dw-card"><span class="dw-kicker">${esc(x.projectId)}</span><h3>${esc(x.lead)}</h3><p>${esc(x.text)}</p></article>`),
    dependencies:d=>cards(d.items,x=>`<article class="dw-card"><div class="dw-card-head"><span class="dw-kicker">${esc(T.dependency)}</span>${badge(x.status)}</div><h3>${esc(x.from)} → ${esc(x.to)}</h3><p>${esc(x.note)}</p></article>`),
    tasks:d=>`<div class="dw-kanban">${[['todo',T.todo],['progress',T.inProgress],['done',T.done]].map(([k,l])=>{const a=(d.items||[]).filter(x=>x.status===k).slice(0,12);return `<section><div class="dw-column-head"><h3>${l}</h3><span>${fmt(a.length)}</span></div>${a.length?a.map(x=>`<article class="dw-task"><div class="dw-card-head"><b>${esc(x.title)}</b>${badge(x.priority)}</div><span>${esc(x.projectId)} · ${esc(x.worker)}</span><small>${esc(T.due)} ${esc(x.dueDay)}</small></article>`).join(''):`<div class="dw-empty compact">${T.noTasks}</div>`}</section>`}).join('')}</div>`,
    credits:d=>cards(d.items,x=>`<article class="dw-card"><span class="dw-kicker">${esc(x.projectId)}</span><h3>${fmt(x.balance)} GNKC</h3><p>${fmt(x.transactions?.length)} ${esc(T.transactionsShown)}</p><small>${esc(T.simulation)}</small></article>`),
    newsroom:d=>cards((d.items||[]).slice(0,18),x=>`<a class="dw-card" href="${esc(x.seo?.canonical||'#')}" style="display:block;text-decoration:none;color:inherit"><span class="dw-kicker">${date(x.publishedAt)}</span><h3>${esc(x.title)}</h3><p>${esc(x.excerpt)}</p><small>${esc(T.editor)}: ${esc(x.editor)}</small></a>`),
    workers:d=>{const items=d.items||[],total=Number.isFinite(Number(d.total))?Number(d.total):items.length;return `<div class="dw-toolbar"><label><span>${esc(T.search)}</span><input id="dwWorkerSearch" type="search" value="${esc(state.filters.q)}" placeholder="${esc(T.nameFunctionProject)}" autocomplete="off"></label><label><span>${isEn?'Project':'Projekt'}</span><select id="dwWorkerProject"><option value="">${esc(T.allProjects)}</option>${(state.projects?.items||[]).map(p=>`<option value="${esc(p.id)}"${state.filters.project===String(p.id)?' selected':''}>${esc(p.id)} · ${esc(p.name)}</option>`).join('')}</select></label><div class="dw-count" role="status" aria-live="polite"><span>${esc(T.workersLabel)}</span><strong>${fmt(items.length)} / ${fmt(total)}</strong></div></div>${items.length?`<div class="dw-table"><table><thead><tr><th scope="col">${esc(T.colId)}</th><th scope="col">${esc(T.colName)}</th><th scope="col">${esc(T.colProject)}</th><th scope="col">${esc(T.colFunction)}</th><th scope="col">${esc(T.colStatus)}</th></tr></thead><tbody>${items.map(x=>`<tr><td>${esc(x.id)}</td><td><strong>${esc(x.name)}</strong></td><td>${esc(x.projectId)}</td><td>${esc(x.function)}</td><td>${x.status==='active'?'<span class="dw-work-pulse" aria-hidden="true"></span>':''}${badge(x.status)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="dw-empty" role="status">${T.noWorkers}</div>`}`},
    log:d=>d.items?.length?d.items.slice(0,50).map(x=>`<div class="dw-log"><time>${dateTime(x.at)}</time><b>${esc(x.type)}</b><span>${esc(x.message)}</span></div>`).join(''):`<div class="dw-empty">${T.logEmpty}</div>`
  };
  function bindFilters(){const q=$('#dwWorkerSearch'),p=$('#dwWorkerProject');let timer;const run=()=>{clearTimeout(timer);state.filters={q:q?.value||'',project:p?.value||''};timer=setTimeout(()=>load('workers',`?q=${encodeURIComponent(state.filters.q)}&project=${encodeURIComponent(state.filters.project)}`),250)};q?.addEventListener('input',run);p?.addEventListener('change',run)}
  async function load(name,params=''){const host=$('#dwContent');if(!host||!views[name])return;const id=++requestId;controller?.abort();controller=new AbortController();host.setAttribute('aria-busy','true');host.innerHTML=`<div class="dw-loading"><span class="dw-spinner" aria-hidden="true"></span><p>${T.loading}</p></div>`;try{if(name==='workers'&&!state.projects)state.projects=await get('projects',controller.signal);const d=await get(name+params,controller.signal);if(id!==requestId)return;state[name]=d;host.innerHTML=views[name](d);if(name==='workers')bindFilters()}catch(e){if(e?.name==='AbortError'||id!==requestId)return;host.innerHTML=`<div class="dw-error" role="alert"><strong>${T.dataUnavailable}</strong><button type="button" id="dwRetry">${T.retry}</button></div>`;$('#dwRetry')?.addEventListener('click',()=>load(name,params))}finally{if(id===requestId)host.setAttribute('aria-busy','false')}}
  function activate(name){let active=null;$$('[data-dw-tab]').forEach(t=>{const on=t.dataset.dwTab===name;t.classList.toggle('active',on);t.setAttribute('aria-selected',on?'true':'false');t.tabIndex=on?0:-1;if(on)active=t});const host=$('#dwContent');if(host&&active?.id)host.setAttribute('aria-labelledby',active.id);load(name)}
  $$('[data-dw-tab]').forEach(t=>t.addEventListener('click',()=>activate(t.dataset.dwTab)));
  $('.dw-tabs')?.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tabs=$$('[data-dw-tab]'),current=tabs.findIndex(t=>t.classList.contains('active'));let next=current;if(e.key==='ArrowRight')next=(current+1)%tabs.length;if(e.key==='ArrowLeft')next=(current-1+tabs.length)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;e.preventDefault();tabs[next].focus();activate(tabs[next].dataset.dwTab)});
  const segment=location.pathname.replace(/\/+$/,'').split('/').pop();activate(document.body.dataset.dwView||routeMap[segment]||'plan');
  get('state').then(d=>{const status=$('#dwState');if(status)status.textContent=`${isEn?'Engine':'Motor'} ${String(d.status||'unknown').toUpperCase()} · ${isEn?'day':'dan'} ${fmt(d.simDay)} · ${fmt(d.workers)} ${T.workers}`;if($('#dwMetricDay'))$('#dwMetricDay').textContent=fmt(d.simDay);if($('#dwMetricWorkers'))$('#dwMetricWorkers').textContent=fmt(d.workers);if($('#dwMetricProjects'))$('#dwMetricProjects').textContent=fmt(d.projects||0);if($('#dwMetricGnkc'))fetch('/data/gnkc-index.json?v='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(g=>{const el=$('#dwMetricGnkc');if(el)el.textContent=typeof g.valueUsd==='number'?`${g.valueUsd.toFixed(4)} USD`:'n/d';}).catch(()=>{const el=$('#dwMetricGnkc');if(el)el.textContent='n/d'})}).catch(()=>{if($('#dwState'))$('#dwState').textContent=T.statusUnavailable});
})();