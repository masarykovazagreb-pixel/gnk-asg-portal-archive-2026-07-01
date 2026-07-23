(()=>{
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const base='/api/public/digital-workforce/';
  const state={workerFilters:{q:'',project:''},workerFilterFocus:''};
  let activeRequestId=0;
  let activeController=null;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));
  const fmt=value=>new Intl.NumberFormat('hr-HR').format(Number(value)||0);
  const money=(value,currency)=>new Intl.NumberFormat('hr-HR',{style:'currency',currency,maximumFractionDigits:2}).format(Number(value)||0);
  const decimal=(value,digits=4)=>new Intl.NumberFormat('hr-HR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(value)||0);
  const signed=value=>`${Number(value)>=0?'+':''}${decimal(value,2)}%`;
  const date=value=>value?new Date(value).toLocaleDateString('hr-HR'):'—';
  const dateTime=value=>value?new Date(value).toLocaleString('hr-HR'):'—';
  const routeMap={plan:'plan',bulletins:'bulletins',projects:'projects',risks:'risks',opinions:'opinions',dependencies:'dependencies',tasks:'tasks',credits:'credits',newsroom:'newsroom',workers:'workers','activity-log':'log'};

  async function get(key,signal){
    const response=await fetch(base+key,{cache:'no-store',headers:{accept:'application/json'},signal});
    if(!response.ok)throw new Error(`${key}:${response.status}`);
    return response.json();
  }

  async function getGnkcIndex(){
    if(state.gnkcIndex)return state.gnkcIndex;
    if(!window.GNKCStableIndex?.load)throw new Error('GNKC stable index nije dostupan');
    state.gnkcIndex=await window.GNKCStableIndex.load();
    const metric=$('#dwMetricGnkc');
    if(metric)metric.textContent=decimal(state.gnkcIndex.priceUsd,4);
    return state.gnkcIndex;
  }

  const statusClass=value=>{
    const text=String(value||'').toLowerCase();
    if(/done|complete|active|green|low|ok|resolved|approved/.test(text))return 'is-success';
    if(/progress|review|medium|pending|watch|amber/.test(text))return 'is-warning';
    if(/blocked|critical|high|failed|red|overdue|rejected/.test(text))return 'is-danger';
    return 'is-neutral';
  };
  const badge=value=>`<span class="dw-badge ${statusClass(value)}">${esc(value||'N/A')}</span>`;
  const cards=(items,render)=>items?.length?`<div class="dw-grid">${items.map(render).join('')}</div>`:'<div class="dw-empty">Nema zapisa za odabrani prikaz.</div>';

  function gnkcSummary(index){
    const direction=index.deviationPct>0?'is-success':index.deviationPct<0?'is-danger':'is-neutral';
    const components=index.components.map(item=>`<span>${esc(item.symbol)} ${(item.effectiveWeight*100).toFixed(0)}%</span>`).join('');
    return `<section class="dw-gnkc-index"><div><span class="dw-kicker">GNKC Stable Index</span><h2>1 GNKC = ${decimal(index.priceUsd,6)} USD</h2><p>${index.priceEur?`${decimal(index.priceEur,6)} EUR · `:''}Referenca iz istog market-pulse izvora kao Index stranica.</p></div><div class="dw-gnkc-stats"><article><span>Od pariteta</span><strong class="${direction}">${signed(index.deviationPct)}</strong></article><article><span>24 sata</span><strong>${signed(index.changePct24h)}</strong></article><article><span>7 dana</span><strong>${signed(index.changePct7d)}</strong></article></div><div class="dw-gnkc-components">${components}</div><small>SIMULACIJA · ažurirano ${dateTime(index.generatedAt)}</small></section>`;
  }

  const views={
    plan:data=>cards(data.items,item=>`<article class="dw-card"><span class="dw-kicker">Dani ${esc(item.block)}</span><h3>${esc(item.focus)}</h3></article>`),
    bulletins:data=>data.items?.length?data.items.slice(0,18).map(item=>`<details class="dw-row"><summary><span>Izdanje #${esc(item.issue)}</span><time>${date(item.publishedAt)}</time></summary><p>${esc(item.summary)}</p></details>`).join(''):'<div class="dw-empty">Nema objavljenih biltena.</div>',
    projects:data=>cards(data.items,item=>`<article class="dw-card"><div class="dw-card-head"><span class="dw-kicker">${esc(item.id)} · ${fmt(item.team)} workera</span>${badge(item.phase)}</div><h3>${esc(item.name)}</h3><p><b>${esc(item.lead)}</b></p><p>Gate: ${esc(item.gate)}</p><div class="dw-progress-meta"><span>Napredak</span><strong>${fmt(item.progress)}%</strong></div><progress max="100" value="${Number(item.progress)||0}"></progress></article>`),
    risks:data=>cards(data.items,item=>`<article class="dw-card"><div class="dw-card-head"><span class="dw-kicker">${esc(item.projectId)}</span>${badge(item.status)}</div><h3>${esc(item.title)}</h3><p>Vlasnik: <b>${esc(item.owner)}</b></p></article>`),
    opinions:data=>cards(data.items,item=>`<article class="dw-card"><span class="dw-kicker">${esc(item.projectId)}</span><h3>${esc(item.lead)}</h3><p>${esc(item.text)}</p></article>`),
    dependencies:data=>cards(data.items,item=>`<article class="dw-card"><div class="dw-card-head"><span class="dw-kicker">Ovisnost</span>${badge(item.status)}</div><h3>${esc(item.from)} → ${esc(item.to)}</h3><p>${esc(item.note)}</p></article>`),
    tasks:data=>{
      const columns=[['todo','Za napraviti'],['progress','U tijeku'],['done','Završeno']];
      return `<div class="dw-kanban">${columns.map(([key,label])=>{
        const items=(data.items||[]).filter(item=>item.status===key).slice(0,12);
        return `<section><div class="dw-column-head"><h3>${label}</h3><span>${fmt(items.length)}</span></div>${items.length?items.map(item=>`<article class="dw-task"><div class="dw-card-head"><b>${esc(item.title)}</b>${badge(item.priority)}</div><span>${esc(item.projectId)} · ${esc(item.worker)}</span><small>Rok: dan ${esc(item.dueDay)}</small></article>`).join(''):'<div class="dw-empty compact">Nema zadataka.</div>'}</section>`;
      }).join('')}</div>`;
    },
    credits:data=>{
      const index=state.gnkcIndex;
      const body=cards(data.items,item=>{
        const balance=Number(item.balance)||0;
        const usd=balance*(index?.priceUsd||1);
        const eur=index?.priceEur==null?null:balance*index.priceEur;
        const nominalPnl=usd-balance;
        return `<article class="dw-card dw-credit-card"><span class="dw-kicker">${esc(item.projectId)}</span><h3>${fmt(balance)} GNKC</h3><p><strong>${money(usd,'USD')}</strong>${eur==null?'':` · ${money(eur,'EUR')}`}</p><div class="dw-credit-meta"><span>Referentni P&amp;L</span><b class="${nominalPnl>=0?'is-success':'is-danger'}">${money(nominalPnl,'USD')}</b></div><small>${fmt(item.transactions?.length)} prikazanih transakcija · SIMULACIJA</small></article>`;
      });
      return `${index?gnkcSummary(index):''}${body}`;
    },
    newsroom:data=>cards((data.items||[]).slice(0,18),item=>`<article class="dw-card"><span class="dw-kicker">${date(item.publishedAt)}</span><h3>${esc(item.title)}</h3><p>${esc(item.excerpt)}</p><small>Urednik: ${esc(item.editor)}</small></article>`),
    workers:data=>{
      const filters=state.workerFilters||{q:'',project:''};
      const items=data.items||[];
      const total=Number.isFinite(Number(data.total))?Number(data.total):items.length;
      const hasFilters=Boolean(filters.q||filters.project);
      const countLabel=items.length===total?`${fmt(total)} ukupno`:`${fmt(items.length)} prikazano od ${fmt(total)}`;
      const rows=items.map(item=>`<tr><td>${esc(item.id)}</td><td><strong>${esc(item.name)}</strong></td><td>${esc(item.projectId)}</td><td>${esc(item.function)}</td><td>${badge(item.status)}</td></tr>`).join('');
      const resetButton=hasFilters?'<button type="button" id="dwWorkerReset">Poništi filtre</button>':'';
      const result=items.length?`<div class="dw-table"><table><thead><tr><th scope="col">ID</th><th scope="col">Ime i prezime</th><th scope="col">Projekt</th><th scope="col">Funkcija</th><th scope="col">Status</th></tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="dw-empty dw-worker-empty" role="status"><strong>${hasFilters?'Nema workera koji odgovaraju odabranim kriterijima.':'Katalog workera je trenutačno prazan.'}</strong>${hasFilters?'<p>Promijenite kriterije ili vratite prikaz cijelog kataloga.</p><button type="button" id="dwWorkerResetEmpty">Prikaži sve workere</button>':''}</div>`;
      return `<div class="dw-toolbar"><label><span>Pretraga</span><input id="dwWorkerSearch" type="search" value="${esc(filters.q)}" placeholder="Ime, funkcija ili projekt" autocomplete="off"></label><label><span>Projekt</span><select id="dwWorkerProject"><option value="">Svi projekti</option>${(state.projects?.items||[]).map(project=>`<option value="${esc(project.id)}"${filters.project===String(project.id)?' selected':''}>${esc(project.id)} · ${esc(project.name)}</option>`).join('')}</select></label><div class="dw-count" role="status" aria-live="polite"><span>Workeri</span><strong>${countLabel}</strong></div>${resetButton}</div>${result}`;
    },
    log:data=>data.items?.length?data.items.slice(0,50).map(item=>`<div class="dw-log"><time>${dateTime(item.at)}</time><b>${esc(item.type)}</b><span>${esc(item.message)}</span></div>`).join(''):'<div class="dw-empty">Zapisnik je prazan.</div>'
  };

  function setBusy(active){
    const host=$('#dwContent');
    if(host)host.setAttribute('aria-busy',active?'true':'false');
  }

  function restoreWorkerFilterFocus(){
    const id=state.workerFilterFocus;
    state.workerFilterFocus='';
    if(!id)return;
    requestAnimationFrame(()=>{
      const control=document.getElementById(id);
      control?.focus();
      if(id==='dwWorkerSearch'&&typeof control?.setSelectionRange==='function'){
        const end=control.value.length;
        control.setSelectionRange(end,end);
      }
    });
  }

  async function load(name,params=''){
    const host=$('#dwContent');
    if(!host||!views[name])return;
    const requestId=++activeRequestId;
    activeController?.abort();
    const controller=new AbortController();
    activeController=controller;
    setBusy(true);
    host.innerHTML='<div class="dw-loading"><span class="dw-spinner" aria-hidden="true"></span><p>Učitavanje operativnih podataka…</p></div>';
    try{
      if(name==='workers'&&!state.projects)state.projects=await get('projects',controller.signal);
      if(name==='credits')await getGnkcIndex();
      if(requestId!==activeRequestId)return;
      const data=await get(name+params,controller.signal);
      if(requestId!==activeRequestId)return;
      state[name]=data;
      host.innerHTML=views[name](data);
      if(name==='workers'){
        bindWorkerFilters();
        restoreWorkerFilterFocus();
      }
    }catch(error){
      if(error?.name==='AbortError'||requestId!==activeRequestId)return;
      host.innerHTML=`<div class="dw-error" role="alert"><strong>Podaci trenutačno nisu dostupni.</strong><span>${esc(error.message)}</span><button type="button" id="dwRetry">Pokušaj ponovno</button></div>`;
      const retry=$('#dwRetry');
      retry?.addEventListener('click',()=>load(name,params));
      requestAnimationFrame(()=>retry?.focus());
    }finally{
      if(requestId===activeRequestId){
        setBusy(false);
        if(activeController===controller)activeController=null;
      }
    }
  }

  function resetWorkerFilters(){
    state.workerFilters={q:'',project:''};
    state.workerFilterFocus='dwWorkerSearch';
    load('workers');
  }

  function bindWorkerFilters(){
    const search=$('#dwWorkerSearch');
    const project=$('#dwWorkerProject');
    const reset=$('#dwWorkerReset');
    const resetEmpty=$('#dwWorkerResetEmpty');
    let timer;
    const run=event=>{
      clearTimeout(timer);
      state.workerFilters={q:search?.value||'',project:project?.value||''};
      state.workerFilterFocus=event?.currentTarget?.id||'';
      timer=setTimeout(()=>load('workers',`?q=${encodeURIComponent(state.workerFilters.q)}&project=${encodeURIComponent(state.workerFilters.project)}`),250);
    };
    search?.addEventListener('input',run);
    project?.addEventListener('change',run);
    reset?.addEventListener('click',resetWorkerFilters);
    resetEmpty?.addEventListener('click',resetWorkerFilters);
  }

  function activate(name){
    let activeTab=null;
    $$('[data-dw-tab]').forEach(tab=>{
      const active=tab.dataset.dwTab===name;
      tab.classList.toggle('active',active);
      tab.setAttribute('aria-selected',active?'true':'false');
      tab.tabIndex=active?0:-1;
      if(active)activeTab=tab;
    });
    const host=$('#dwContent');
    if(host&&activeTab?.id)host.setAttribute('aria-labelledby',activeTab.id);
    load(name);
  }

  $$('[data-dw-tab]').forEach(tab=>tab.addEventListener('click',()=>activate(tab.dataset.dwTab)));
  $('.dw-tabs')?.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const tabs=$$('[data-dw-tab]');
    const current=tabs.findIndex(tab=>tab.classList.contains('active'));
    let next=current;
    if(event.key==='ArrowRight')next=(current+1)%tabs.length;
    if(event.key==='ArrowLeft')next=(current-1+tabs.length)%tabs.length;
    if(event.key==='Home')next=0;
    if(event.key==='End')next=tabs.length-1;
    event.preventDefault();
    tabs[next].focus();
    activate(tabs[next].dataset.dwTab);
  });

  const segment=location.pathname.replace(/\/+$/,'').split('/').pop();
  const initial=document.body.dataset.dwView||routeMap[segment]||'plan';
  activate(initial);
  getGnkcIndex().catch(()=>{});
  get('state').then(data=>{
    state.system=data;
    const status=$('#dwState');
    if(status)status.textContent=`Motor ${String(data.status||'unknown').toUpperCase()} · dan ${fmt(data.simDay)} · ${fmt(data.workers)} workera`;
    const simDay=$('#dwMetricDay');
    const workers=$('#dwMetricWorkers');
    const projects=$('#dwMetricProjects');
    if(simDay)simDay.textContent=fmt(data.simDay);
    if(workers)workers.textContent=fmt(data.workers);
    if(projects)projects.textContent=fmt(data.projects||state.projects?.items?.length||0);
  }).catch(()=>{
    const status=$('#dwState');
    if(status)status.textContent='Status nije dostupan';
  });
})();
