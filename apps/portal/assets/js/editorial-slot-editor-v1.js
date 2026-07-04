(()=>{
  'use strict';
  if(window.__GNK_EDITORIAL_SLOT_EDITOR_V1__)return;
  window.__GNK_EDITORIAL_SLOT_EDITOR_V1__=true;

  const API='/api/editorial-operations';
  const $=id=>document.getElementById(id);
  const today=()=>new Date().toISOString().slice(0,10);
  let plan=null;
  let current=null;

  function setStatus(message,mode=''){
    const node=$('status');
    node.className=`status ${mode}`.trim();
    node.textContent=message;
  }

  function facts(slot){
    const rows=[
      ['Slot ID',slot?.id||'—'],
      ['State',slot?.state||'—'],
      ['Prepared by',slot?.preparedByProfile||slot?.proposedAuthor||'—'],
      ['Desk',slot?.desk||'—'],
      ['Project',slot?.project||'—'],
      ['Connected entity',slot?.connectedEntity||'—'],
      ['Editor',slot?.editor||'—'],
      ['Automatic publication',String(slot?.automaticPublication===true)]
    ];
    const root=$('facts');
    root.replaceChildren(...rows.map(([label,value])=>{
      const div=document.createElement('div'),b=document.createElement('b'),span=document.createElement('span');
      b.textContent=label;span.textContent=value;div.append(b,span);return div;
    }));
  }

  function showErrors(readiness){
    const list=$('errors');
    list.replaceChildren();
    const items=readiness?.errors?.length?readiness.errors:['No blocking errors.'];
    for(const item of items){const li=document.createElement('li');li.textContent=item;list.appendChild(li);}
  }

  function setValue(id,value){const node=$(id);if(node)node.value=value??'';}
  function setChecked(id,value){const node=$(id);if(node)node.checked=value===true;}

  function loadSlot(slot){
    current=slot;
    setValue('publicationType',slot.publicationType||'desk-article');
    setValue('language',slot.language||'en');
    setValue('title',slot.title);
    setValue('slug',slot.slug);
    setValue('category',slot.category);
    setValue('summary',slot.summary);
    setValue('body',slot.body);
    setValue('canonical',slot.canonical);
    setValue('image',slot.image);
    setValue('imageAlt',slot.imageAlt);
    setValue('primarySource',slot.primarySource);
    setValue('supportingSources',(slot.supportingSources||[]).join('\n'));
    setValue('processDisclosure',slot.processDisclosure);
    setChecked('authorshipConfirmed',slot.authorshipConfirmed);
    setChecked('commentApprovedByNermin',slot.commentApprovedByNermin);
    setChecked('factCheckComplete',slot.factCheckComplete);
    setChecked('sourceReviewComplete',slot.sourceReviewComplete);
    setChecked('finalApproval',slot.finalApproval);
    setChecked('automationAssisted',slot.automationAssisted!==false);
    const type=$('publicationType');
    const desk=slot.slotType==='desk-article';
    [...type.options].forEach(option=>{option.disabled=desk&&option.value!=='desk-article';});
    if(desk)type.value='desk-article';
    facts(slot);
    showErrors(slot.readiness||null);
  }

  function collectPatch(){
    return{
      publicationType:$('publicationType').value,
      language:$('language').value,
      title:$('title').value,
      slug:$('slug').value,
      category:$('category').value,
      summary:$('summary').value,
      body:$('body').value,
      canonical:$('canonical').value,
      image:$('image').value,
      imageAlt:$('imageAlt').value,
      primarySource:$('primarySource').value,
      supportingSources:$('supportingSources').value.split(/\r?\n/u).map(value=>value.trim()).filter(Boolean),
      processDisclosure:$('processDisclosure').value,
      authorshipConfirmed:$('authorshipConfirmed').checked,
      commentApprovedByNermin:$('commentApprovedByNermin').checked,
      factCheckComplete:$('factCheckComplete').checked,
      sourceReviewComplete:$('sourceReviewComplete').checked,
      finalApproval:$('finalApproval').checked,
      automationAssisted:$('automationAssisted').checked,
      dateReviewed:new Date().toISOString(),
      datePublished:$('finalApproval').checked?new Date().toISOString():''
    };
  }

  async function request(path,options={}){
    const response=await fetch(`${API}${path}`,{credentials:'same-origin',cache:'no-store',...options});
    if(response.status===401||response.status===403){
      const next=encodeURIComponent(location.pathname);
      setStatus('Admin session required. Sign in to continue.','bad');
      location.href=`/admin-login/?next=${next}`;
      throw new Error('unauthorized');
    }
    return response;
  }

  async function loadPlan(){
    setStatus('Loading authenticated daily plan…');
    const response=await request(`/plan?date=${today()}`);
    if(response.status===404){
      setStatus('No persisted plan exists for today. Generate it from Editorial Operations.','bad');
      return;
    }
    if(!response.ok)throw new Error(`plan_http_${response.status}`);
    const payload=await response.json();
    plan=payload.plan;
    const select=$('slot');
    select.replaceChildren(...plan.slots.map(slot=>{
      const option=document.createElement('option');
      option.value=slot.id;
      option.textContent=`${slot.id} · ${slot.state}`;
      return option;
    }));
    select.addEventListener('change',()=>loadSlot(plan.slots.find(item=>item.id===select.value)));
    if(plan.slots[0]){select.value=plan.slots[0].id;loadSlot(plan.slots[0]);}
    setStatus(`Loaded ${plan.slots.length} persisted slots for ${plan.date}.`,'ok');
  }

  async function save(){
    if(!current)return null;
    setStatus('Saving and validating…');
    const response=await request('/slot/save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({date:plan.date,id:current.id,patch:collectPatch()})});
    const payload=await response.json();
    if(!response.ok)throw new Error(payload.error||`save_http_${response.status}`);
    const index=plan.slots.findIndex(item=>item.id===payload.slot.id);
    if(index>=0)plan.slots[index]=payload.slot;
    current=payload.slot;
    loadSlot(current);
    $('slot').selectedOptions[0].textContent=`${current.id} · ${current.state}`;
    showErrors(payload.readiness);
    setStatus(payload.readiness.ok?'Saved. Slot is ready for controlled publication.':'Saved. Slot remains blocked by readiness checks.',payload.readiness.ok?'ok':'bad');
    return payload;
  }

  async function preview(){
    const saved=await save();
    if(!saved?.readiness?.ok)return;
    const response=await request('/slot/preview',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({date:plan.date,id:current.id})});
    if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||`preview_http_${response.status}`);}
    const blob=await response.blob(),url=URL.createObjectURL(blob);
    window.open(url,'_blank','noopener');
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }

  async function queue(){
    const saved=await save();
    if(!saved?.readiness?.ok)return;
    const response=await request('/slot/queue',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({date:plan.date,id:current.id})});
    const payload=await response.json();
    if(!response.ok)throw new Error(payload.error||`queue_http_${response.status}`);
    setStatus(payload.created?'Queued for Executive Office release. No public publication occurred.':'This slot was already in the release queue.','ok');
  }

  function bind(id,handler){$(id).addEventListener('click',async()=>{try{await handler();}catch(error){if(error.message!=='unauthorized')setStatus(String(error.message||error),'bad');}});}
  bind('save',save);bind('preview',preview);bind('queue',queue);
  loadPlan().catch(error=>setStatus(String(error.message||error),'bad'));
})();
