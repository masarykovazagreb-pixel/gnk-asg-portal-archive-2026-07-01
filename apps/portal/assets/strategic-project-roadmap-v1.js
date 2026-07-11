(()=>{
  'use strict';
  const DATA_URL='/data/strategic-project-roadmap.json';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const langOf=target=>target.closest('[lang]')?.getAttribute('lang')?.toLowerCase().startsWith('en')?'en':'hr';
  const copy={
    hr:{all:'Svi projekti',phase:'Faza',track:'Područje',next:'Sljedeći gateovi',risks:'Rizici',empty:'Nema projekata za odabrani filtar.',loading:'Učitavanje strateškog roadmapa…',error:'Roadmap trenutačno nije dostupan.'},
    en:{all:'All projects',phase:'Phase',track:'Track',next:'Next gates',risks:'Risks',empty:'No projects match the selected filter.',loading:'Loading strategic roadmap…',error:'The roadmap is currently unavailable.'}
  };
  const normalise=data=>({
    tracks:Array.isArray(data?.tracks)?data.tracks:[],
    projects:Array.isArray(data?.projects)?data.projects.filter(p=>p&&p.id&&p.publicStatus):[]
  });
  const label=(item,lang,stem)=>item?.[`${stem}${lang==='en'?'En':'Hr'}`]||item?.[stem]||'';
  const renderCard=(project,lang,t)=>{
    const gates=(project.nextGates||[]).map(g=>`<li>${esc(g.replaceAll('-',' '))}</li>`).join('');
    const risks=(project.riskClasses||[]).map(r=>`<li>${esc(r.replaceAll('-',' '))}</li>`).join('');
    return `<article class="spr-card" data-project-card data-track="${esc(project.track)}" data-phase="${esc(project.phase)}">
      <div class="spr-card__top"><span class="spr-number">${String(project.number).padStart(2,'0')}</span><span class="spr-status">${esc(label(project,lang,'phaseLabel'))}</span></div>
      <h3>${esc(label(project,lang,'title'))}</h3>
      <p>${esc(label(project,lang,'objective'))}</p>
      <div class="spr-card__details"><div><strong>${t.next}</strong><ul>${gates}</ul></div><div><strong>${t.risks}</strong><ul>${risks}</ul></div></div>
    </article>`;
  };
  const build=(data,lang)=>{
    const t=copy[lang];
    const trackOptions=data.tracks.map(track=>`<button type="button" class="spr-filter" data-track-filter="${esc(track.id)}">${esc(label(track,lang,'label'))}</button>`).join('');
    const cards=data.projects.map(project=>renderCard(project,lang,t)).join('');
    return `<section class="spr" data-spr-root>
      <div class="spr-toolbar" role="toolbar" aria-label="${esc(t.track)}">
        <button type="button" class="spr-filter is-active" data-track-filter="all" aria-pressed="true">${t.all}</button>${trackOptions}
      </div>
      <div class="spr-grid" data-spr-grid>${cards}</div>
      <p class="spr-empty" data-spr-empty hidden>${t.empty}</p>
    </section>`;
  };
  const bind=root=>{
    const buttons=[...root.querySelectorAll('[data-track-filter]')];
    const cards=[...root.querySelectorAll('[data-project-card]')];
    const empty=root.querySelector('[data-spr-empty]');
    const apply=filter=>{
      let visible=0;
      cards.forEach(card=>{const show=filter==='all'||card.dataset.track===filter;card.hidden=!show;if(show)visible++;});
      buttons.forEach(button=>{const active=button.dataset.trackFilter===filter;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
      if(empty)empty.hidden=visible!==0;
    };
    buttons.forEach(button=>button.addEventListener('click',()=>apply(button.dataset.trackFilter)));
  };
  const mount=async target=>{
    const lang=langOf(target),t=copy[lang];
    target.innerHTML=`<p class="spr-loading" role="status">${t.loading}</p>`;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8000);
    try{
      const response=await fetch(DATA_URL,{cache:'no-store',signal:controller.signal,headers:{accept:'application/json'}});
      if(!response.ok)throw new Error(`roadmap unavailable: ${response.status}`);
      const data=normalise(await response.json());
      target.innerHTML=build(data,lang);
      bind(target.firstElementChild);
    }catch(error){target.innerHTML=`<p class="spr-loading" role="status">${t.error}</p>`;}
    finally{clearTimeout(timeout);}
  };
  window.GNKStrategicRoadmap={mount};
  document.querySelectorAll('[data-strategic-roadmap-mount]').forEach(mount);
})();
