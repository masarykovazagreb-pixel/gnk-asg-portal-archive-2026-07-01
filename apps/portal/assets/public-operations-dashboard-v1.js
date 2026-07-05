(()=>{
  'use strict';

  const VERSION='GNK_ASG_PUBLIC_OPERATIONS_DASHBOARD_V1_20260705_GOVERNANCE';
  const DEFAULT_TARGET='[data-public-operations-dashboard]';
  const ENDPOINTS={
    catalog:'/api/public-operations/catalog',
    latestReport:'/api/public-operations/report/latest',
    governanceBoard:'/api/public-operations/governance-board'
  };

  const text=value=>String(value??'').trim();
  const number=value=>Number.isFinite(Number(value))?Number(value):0;
  const escapeHtml=value=>text(value).replace(/[&<>'"]/g,character=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[character]));

  async function readJson(url){
    const response=await fetch(url,{headers:{accept:'application/json'},cache:'no-store'});
    if(!response.ok)throw new Error(`${url} returned ${response.status}`);
    return response.json();
  }

  function metric(label,value,note){
    return `<article class="pod-card public-ops-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${note?`<small>${escapeHtml(note)}</small>`:''}</article>`;
  }

  function fileLink(item){
    const href=escapeHtml(item?.url||item?.href||'#');
    const label=escapeHtml(item?.title||item?.label||'Javni dokument');
    const note=escapeHtml(item?.description||item?.note||'');
    const kind=escapeHtml(item?.type||item?.category||'document');
    return `<a class="pod-card public-ops-file" href="${href}"><span>${kind}</span><strong>${label}</strong>${note?`<small>${note}</small>`:''}</a>`;
  }

  function catalogueFiles(catalog){
    const raw=[
      ...(Array.isArray(catalog?.publicDocuments)?catalog.publicDocuments:[]),
      ...(Array.isArray(catalog?.pdfDocuments)?catalog.pdfDocuments:[]),
      ...(Array.isArray(catalog?.documents)?catalog.documents:[]),
      ...(Array.isArray(catalog?.files)?catalog.files:[])
    ];
    const seen=new Set();
    return raw.filter(item=>{
      const key=text(item?.url||item?.href||item?.title||item?.label);
      if(!key||seen.has(key))return false;
      seen.add(key);
      return true;
    }).slice(0,6);
  }

  function statusPill(value){
    const state=text(value)||'controlled-review';
    return `<span class="state-pill public-ops-state">${escapeHtml(state)}</span>`;
  }

  function listCards(items,emptyLabel){
    const records=Array.isArray(items)?items:[];
    if(!records.length)return `<p>${escapeHtml(emptyLabel||'Nema javnih zapisa.')}</p>`;
    return records.slice(0,8).map(item=>`<article class="pod-card public-ops-file"><span>${escapeHtml(item.state||item.status||item.owner||item.id||'record')}</span><strong>${escapeHtml(item.title||item.label||item.summary||item.id||'Javni zapis')}</strong>${item.route?`<small>${escapeHtml(item.route)}</small>`:''}${item.minimumEvidence?`<small>${escapeHtml(item.minimumEvidence.join(' · '))}</small>`:''}</article>`).join('');
  }

  function render(target,{catalog,report,governance}){
    const workforce=report?.workforce||{};
    const editorial=report?.editorial||{};
    const outputs=report?.publicOutputs||{};
    const approval=report?.approval||governance?.approval||{};
    const files=catalogueFiles(catalog);
    target.innerHTML=`
      <section class="section public-ops-panel" id="dnevna-izvjesca" aria-labelledby="public-ops-title">
        <div class="section-head">
          <div>
            <p class="eyebrow">Public Operations</p>
            <h2 id="public-ops-title">Dnevna izvješća, javni katalog i digitalna operativa</h2>
          </div>
          <p>Panel čita isključivo javne API podatke. Privatni mailovi, tokeni, auditi, privitci i upravljačke odluke nisu izloženi javnosti.</p>
        </div>
        <div class="trust-strip public-ops-status">
          <div class="trust"><span class="icon">◎</span><div><b>Status izvješća</b><span>${statusPill(approval.state)}</span></div></div>
          <div class="trust"><span class="icon">◷</span><div><b>Pravilo pregleda</b><span>${escapeHtml(approval.deadline||'08:00 Europe/Zagreb')}</span></div></div>
          <div class="trust"><span class="icon">▣</span><div><b>Katalog</b><span>${escapeHtml(catalog?.version||'public catalogue')}</span></div></div>
          <div class="trust"><span class="icon">⚑</span><div><b>Governance</b><span>${statusPill(governance?.approval?.state||approval.state)}</span></div></div>
        </div>
        <div class="quick-grid public-ops-grid">
          ${metric('Digitalni operativni profili',number(workforce.configuredProfiles).toLocaleString('hr-HR'),'transparentni workflow identiteti')}
          ${metric('Odjeli',number(workforce.departments).toLocaleString('hr-HR'),'javni operativni raspored')}
          ${metric('Entity slots',number(workforce.entitySlots).toLocaleString('hr-HR'),'grupna organizacijska mjesta')}
          ${metric('Planirani dnevni slotovi',number(editorial.totalPlannedSlots).toLocaleString('hr-HR'),editorial.brand||'THE CODE Intelligence')}
          ${metric('Javne objave',number(outputs.publishedOrApprovedTexts).toLocaleString('hr-HR'),outputs.publicationsRoute||'/objave/')}
          ${metric('Javne vijesti',number(outputs.publicNewsEntries).toLocaleString('hr-HR'),outputs.newsRoute||'/vijesti/')}
        </div>
        <div class="mega-grid public-ops-documents">
          <div class="mega-col"><h3>Javni PDF i izvori</h3>${files.length?files.map(fileLink).join(''):'<p>Nema javnih PDF zapisa u katalogu.</p>'}</div>
          <div class="mega-col"><h3>Sigurnosna granica</h3><p>${escapeHtml(workforce.disclosure||'Digital operations profiles are functional workflow identities, not a confirmed employment registry.')}</p><p>Mail podaci: ${escapeHtml(report?.systems?.privateMailData||'not_public')}</p><p>Secrets: ${escapeHtml(report?.systems?.tokensAndSecrets||'never_public')}</p><p>Admin endpointi: ${escapeHtml(report?.systems?.adminEndpoints||'token_required')}</p></div>
          <div class="mega-col"><h3>Javni izlazi</h3><a href="${escapeHtml(outputs.publicationsRoute||'/objave/')}">Objave</a><a href="${escapeHtml(outputs.newsRoute||'/vijesti/')}">Vijesti</a><a href="${escapeHtml(workforce.publicDirectory||'/digital-workforce/directory/')}">Digital workforce directory</a><a href="${escapeHtml(outputs.governanceRoute||ENDPOINTS.governanceBoard)}">Governance JSON</a></div>
        </div>
      </section>
      <section class="section public-governance-panel" id="javna-tabla">
        <div class="section-head"><div><p class="eyebrow">Governance board</p><h2>Javna tabla zadataka, odluka, sastanaka i zaključaka</h2></div><p>Ova tabla je javni sažetak. Admin status, audit i promjena odluka zaključani su tokenom.</p></div>
        <div class="mega-grid">
          <div class="mega-col"><h3>Kontrole</h3>${listCards(governance?.controls,'Nema javnih kontrola.')}</div>
          <div class="mega-col"><h3>Zadaci</h3>${listCards(governance?.tasks,'Nema javnih zadataka.')}</div>
          <div class="mega-col"><h3>Odluke</h3>${listCards(governance?.decisions,'Nema javnih odluka.')}</div>
        </div>
        <div class="mega-grid">
          <div class="mega-col"><h3>Sastanci</h3>${listCards(governance?.meetings,'Nema javnih sastanaka.')}</div>
          <div class="mega-col"><h3>Zapisnici i zaključci</h3>${listCards(governance?.minutes,'Nema javnih zapisnika.')}</div>
          <div class="mega-col"><h3>Worker endpointi</h3><a href="${ENDPOINTS.catalog}">Katalog</a><a href="${ENDPOINTS.latestReport}">Zadnje izvješće</a><a href="${ENDPOINTS.governanceBoard}">Governance board</a><a href="/api/public-operations/health">Health</a></div>
        </div>
      </section>`;
  }

  function renderError(target,error){
    target.innerHTML=`<section class="section public-ops-panel public-ops-error"><div class="section-head"><div><p class="eyebrow">Public Operations</p><h2>Panel nije učitan</h2></div><p>${escapeHtml(error?.message||error||'Javni operativni API trenutačno nije dostupan.')}</p></div></section>`;
  }

  async function mount(target=document.querySelector(DEFAULT_TARGET)){
    if(!target)return {ok:false,reason:'target_not_found',version:VERSION};
    target.setAttribute('data-public-operations-dashboard-version',VERSION);
    try{
      const [catalog,report,governance]=await Promise.all([readJson(ENDPOINTS.catalog),readJson(ENDPOINTS.latestReport),readJson(ENDPOINTS.governanceBoard)]);
      render(target,{catalog,report,governance});
      return {ok:true,version:VERSION,catalogVersion:catalog?.version||null,reportVersion:report?.version||null,governanceVersion:governance?.version||null};
    }catch(error){
      renderError(target,error);
      return {ok:false,version:VERSION,error:String(error?.message||error)};
    }
  }

  window.GNKPublicOperationsDashboard={VERSION,ENDPOINTS,mount};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount(),{once:true});
  else mount();
})();
