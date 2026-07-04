(()=>{
  'use strict';

  const VERSION='GNK_ASG_PUBLIC_OPERATIONS_DASHBOARD_V1_20260704';
  const DEFAULT_TARGET='[data-public-operations-dashboard]';
  const ENDPOINTS={
    catalog:'/api/public-operations/catalog',
    latestReport:'/api/public-operations/report/latest'
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

  function render(target,{catalog,report}){
    const workforce=report?.workforce||{};
    const editorial=report?.editorial||{};
    const outputs=report?.publicOutputs||{};
    const approval=report?.approval||{};
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
          <div class="mega-col"><h3>Sigurnosna granica</h3><p>${escapeHtml(workforce.disclosure||'Digital operations profiles are functional workflow identities, not a confirmed employment registry.')}</p><p>Mail podaci: ${escapeHtml(report?.systems?.privateMailData||'not_public')}</p><p>Secrets: ${escapeHtml(report?.systems?.tokensAndSecrets||'never_public')}</p></div>
          <div class="mega-col"><h3>Javni izlazi</h3><a href="${escapeHtml(outputs.publicationsRoute||'/objave/')}">Objave</a><a href="${escapeHtml(outputs.newsRoute||'/vijesti/')}">Vijesti</a><a href="${escapeHtml(workforce.publicDirectory||'/digital-workforce/directory/')}">Digital workforce directory</a></div>
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
      const [catalog,report]=await Promise.all([readJson(ENDPOINTS.catalog),readJson(ENDPOINTS.latestReport)]);
      render(target,{catalog,report});
      return {ok:true,version:VERSION,catalogVersion:catalog?.version||null,reportVersion:report?.version||null};
    }catch(error){
      renderError(target,error);
      return {ok:false,version:VERSION,error:String(error?.message||error)};
    }
  }

  window.GNKPublicOperationsDashboard={VERSION,ENDPOINTS,mount};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mount(),{once:true});
  else mount();
})();
