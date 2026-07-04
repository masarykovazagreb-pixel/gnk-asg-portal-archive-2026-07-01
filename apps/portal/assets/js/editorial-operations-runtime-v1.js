(()=>{
  'use strict';
  if(window.__GNK_EDITORIAL_OPERATIONS_RUNTIME_V1__)return;
  window.__GNK_EDITORIAL_OPERATIONS_RUNTIME_V1__=true;

  const PLAN_ENDPOINT='/api/editorial-operations/plan';
  const today=()=>new Date().toISOString().slice(0,10);
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function addToolbarLink(toolbar,id,label,href){
    if(!toolbar||document.getElementById(id))return;
    const link=document.createElement('a');
    link.id=id;
    link.className='btn secondary';
    link.href=href;
    link.textContent=label;
    toolbar.appendChild(link);
  }

  function installStatus(){
    const main=document.querySelector('main');
    if(!main||document.getElementById('editorial-runtime-status'))return;
    const status=document.createElement('section');
    status.id='editorial-runtime-status';
    status.className='card';
    status.style.margin='0 0 14px';
    status.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><strong id="editorial-runtime-title">Checking persisted daily plan…</strong><div id="editorial-runtime-detail" class="hint" style="margin-top:5px">The local deterministic review plan remains visible until an authenticated KV plan is available.</div></div><span id="editorial-runtime-badge" style="padding:6px 9px;border:1px solid rgba(245,158,11,.45);border-radius:999px;color:#fde68a;font-size:10px;font-weight:900;text-transform:uppercase">checking</span></div>';
    main.prepend(status);

    const toolbar=document.querySelector('header .toolbar');
    addToolbarLink(toolbar,'open-editorial-slot-editor','Draft Editor','/editorial-operations/editor/');
    addToolbarLink(toolbar,'open-editorial-release-queue','Release Queue','/editorial-operations/release-queue/');
    if(toolbar&&!document.getElementById('generate-editorial-plan')){
      const button=document.createElement('button');
      button.id='generate-editorial-plan';
      button.type='button';
      button.className='btn secondary';
      button.textContent="Generate today's plan";
      toolbar.appendChild(button);
      button.addEventListener('click',generatePlan);
    }
  }

  function setStatus(mode,title,detail){
    const badge=document.getElementById('editorial-runtime-badge');
    const heading=document.getElementById('editorial-runtime-title');
    const copy=document.getElementById('editorial-runtime-detail');
    if(heading)heading.textContent=title;
    if(copy)copy.textContent=detail;
    if(!badge)return;
    badge.textContent=mode;
    const styles={
      persisted:['rgba(34,197,94,.45)','#86efac'],
      fallback:['rgba(245,158,11,.45)','#fde68a'],
      blocked:['rgba(239,68,68,.45)','#fca5a5']
    }[mode]||['rgba(255,255,255,.2)','#fff'];
    badge.style.borderColor=styles[0];
    badge.style.color=styles[1];
  }

  async function getModel(){
    const response=await fetch('/assets/data/editorial-operations-review.json?cb='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error('editorial_model_unavailable');
    return response.json();
  }

  async function getPlan(){
    const response=await fetch(`${PLAN_ENDPOINT}?date=${today()}`,{cache:'no-store',credentials:'same-origin'});
    if(response.status===401||response.status===403)return{mode:'blocked',plan:null};
    if(response.status===404||response.status===503)return{mode:'fallback',plan:null};
    if(!response.ok)throw new Error(`editorial_plan_http_${response.status}`);
    const payload=await response.json();
    return{mode:'persisted',plan:payload.plan||null};
  }

  function renderPersisted(model,plan){
    if(!plan||!Array.isArray(plan.slots))return;
    const profiles=model.editorialProfiles||[];
    const profileMap=new Map(profiles.map(item=>[item.workerId,item]));
    const deskSlots=plan.slots.filter(item=>item.slotType==='desk-article');
    const nerminSlots=plan.slots.filter(item=>item.slotType==='nermin-original-or-commentary');
    const summary=document.getElementById('summary');
    if(summary){
      summary.innerHTML=[
        ['International profiles',profiles.length],
        ['Persisted desk slots',deskSlots.length],
        ['Nermin article/comment slots',nerminSlots.length],
        ['Publication','APPROVAL GATED']
      ].map(item=>`<article class="card"><div class="metric">${escapeHtml(item[1])}</div><div class="label">${escapeHtml(item[0])}</div></article>`).join('');
    }
    const queue=document.getElementById('queue');
    if(queue){
      queue.innerHTML=plan.slots.map(item=>{
        if(item.slotType==='desk-article'){
          const profile=profileMap.get(item.preparedByProfile)||{};
          return `<div class="slot"><b>${escapeHtml(profile.name||item.preparedByProfile)}</b><span>${escapeHtml(item.desk||profile.desk||'Editorial desk')} — source brief required</span><span class="state">${escapeHtml(item.state)}</span></div>`;
        }
        return `<div class="slot"><b>Nermin Sefić</b><span>Original article or commentary — authorship or approval confirmation required</span><span class="state">${escapeHtml(item.state)}</span></div>`;
      }).join('');
    }
  }

  async function refresh(){
    try{
      const [model,result]=await Promise.all([getModel(),getPlan()]);
      if(result.mode==='persisted'&&result.plan){
        renderPersisted(model,result.plan);
        setStatus('persisted',`Persisted daily plan · ${result.plan.date}`,`${result.plan.summary?.totalSlots||result.plan.slots.length} KV slots loaded. Automatic public publication remains disabled.`);
      }else if(result.mode==='blocked'){
        setStatus('blocked','Authenticated session required','The review fallback remains visible. Sign in through Admin to read or generate the persisted KV plan.');
      }else{
        setStatus('fallback',`Review fallback · ${today()}`,'No persisted daily plan exists yet. The existing deterministic local plan remains visible.');
      }
    }catch(error){
      setStatus('fallback','Review fallback active',String(error?.message||error));
    }
  }

  async function generatePlan(){
    const button=document.getElementById('generate-editorial-plan');
    if(button){button.disabled=true;button.textContent='Generating…';}
    try{
      const response=await fetch(`${PLAN_ENDPOINT}/generate`,{
        method:'POST',
        credentials:'same-origin',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({date:today(),force:false})
      });
      if(response.status===401||response.status===403){
        setStatus('blocked','Authenticated session required','No plan was generated and no content was published.');
        return;
      }
      if(!response.ok)throw new Error(`editorial_generate_http_${response.status}`);
      await refresh();
    }catch(error){
      setStatus('blocked','Plan generation failed',String(error?.message||error));
    }finally{
      if(button){button.disabled=false;button.textContent="Generate today's plan";}
    }
  }

  function install(){installStatus();refresh();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
