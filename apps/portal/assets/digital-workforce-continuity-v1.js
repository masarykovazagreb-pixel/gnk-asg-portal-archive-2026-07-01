(()=>{
  const CONTRACT=Object.freeze({
    version:'GNK_ASG_DIGITAL_WORKFORCE_CONTINUITY_V1_20260722',
    publishedBaselineWorkers:1536,
    currentCatalogueWorkers:1573,
    catalogueExpansion:37,
    publishedProjectAreas:9,
    mode:'append-only',
    simulationLabel:'SIMULACIJA',
    rules:Object.freeze({
      preservePublishedWorkerIds:true,
      preservePublishedProjectIds:true,
      continueBulletinIssueNumbers:true,
      continueNewsroomChronology:true,
      deduplicateByStableId:true,
      neverRewritePublishedHistory:true,
      newItemsDefaultStatus:'planned'
    })
  });

  const fmt=value=>new Intl.NumberFormat('hr-HR').format(Number(value)||0);

  function render(){
    const anchor=document.querySelector('.dw-disclaimer');
    if(!anchor||document.querySelector('[data-dw-continuity]'))return;
    const section=document.createElement('section');
    section.className='dw-continuity';
    section.dataset.dwContinuity=CONTRACT.version;
    section.innerHTML=`<div><span>Objavljena početna baza</span><strong>${fmt(CONTRACT.publishedBaselineWorkers)}</strong><small>digitalnih funkcija</small></div><div><span>Proširenje kataloga</span><strong>+${fmt(CONTRACT.catalogueExpansion)}</strong><small>novih funkcija</small></div><div><span>Aktualni katalog</span><strong>${fmt(CONTRACT.currentCatalogueWorkers)}</strong><small>workera</small></div><div><span>Projektna područja</span><strong>${fmt(CONTRACT.publishedProjectAreas)}</strong><small>kontinuitet objavljenog modela</small></div>`;
    anchor.insertAdjacentElement('afterend',section);
  }

  function annotatePanel(){
    const panel=document.querySelector('#dwContent');
    if(!panel)return;
    const active=document.querySelector('[data-dw-tab].active')?.dataset.dwTab;
    if(!['workers','bulletins','newsroom','log'].includes(active))return;
    if(panel.querySelector('[data-dw-continuity-note]'))return;
    const note=document.createElement('p');
    note.className='dw-continuity-note';
    note.dataset.dwContinuityNote='1';
    note.textContent=active==='workers'
      ?`Katalog nastavlja objavljenu bazu od ${fmt(CONTRACT.publishedBaselineWorkers)} funkcija; novi zapisi proširuju katalog bez promjene postojećih ID-jeva.`
      :'Novi zapisi nastavljaju postojeću kronologiju i ne prepisuju ranije objavljene stavke.';
    panel.prepend(note);
  }

  window.DigitalWorkforceContinuity=CONTRACT;
  document.addEventListener('DOMContentLoaded',()=>{
    render();
    annotatePanel();
    document.querySelector('.dw-tabs')?.addEventListener('click',()=>queueMicrotask(annotatePanel));
    const panel=document.querySelector('#dwContent');
    if(panel)new MutationObserver(annotatePanel).observe(panel,{childList:true});
  });
})();
