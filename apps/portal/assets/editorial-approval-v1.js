(()=>{
'use strict';
const DATA_URL='/api/editorial-approval/queue';
const STORAGE_KEY='gnk-editorial-approval-decisions-v1';
const COMMENT_KEY='gnk-editorial-approval-comments-v1';
const state={data:null,decisions:{},comments:{},view:'editorial',filter:'all'};

const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));
function loadLocal(key){
  try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}
  catch{return {}}
}
function saveLocal(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state.decisions));
  localStorage.setItem(COMMENT_KEY,JSON.stringify(state.comments));
}
function approvalBlockers(item){return item?.sourceQueue?GNKEditorialSourceQueue.blockers(item):[]}
function statusOf(id){
  const item=state.data?.items?.find(x=>x.id===id);
  const status=state.decisions[id]?.status||'pending';
  return status==='approved'&&item?.sourceQueue&&(approvalBlockers(item).length||state.decisions[id].reviewSnapshot!==JSON.stringify(item))?'pending':status;
}
function statusLabel(status){
  return {pending:'Čeka odluku',approved:'Odobreno',revision:'Vratiti na doradu',rejected:'Odbijeno'}[status]||status;
}
function setDecision(id,status){
  const item=state.data?.items?.find(x=>x.id===id);
  if(!item||(status==='approved'&&approvalBlockers(item).length)){renderEditorial();return;}
  state.decisions[id]={status,updatedAt:new Date().toISOString(),actor:'Nermin Sefić / ovlašteni administrator',...(item.sourceQueue?{reviewSnapshot:JSON.stringify(item)}:{})};
  saveLocal();renderEditorial();renderStats();
}
function selectedIds(){
  return [...document.querySelectorAll('.item-select:checked')].map(input=>input.value);
}
function applyBatch(status){
  const ids=selectedIds();
  ids.forEach(id=>{
    const item=state.data?.items?.find(x=>x.id===id);
    if(!item||(status==='approved'&&approvalBlockers(item).length))return;
    state.decisions[id]={status,updatedAt:new Date().toISOString(),actor:'Nermin Sefić / ovlašteni administrator',...(item.sourceQueue?{reviewSnapshot:JSON.stringify(item)}:{})};
  });
  saveLocal();renderEditorial();renderStats();
}
function renderStats(){
  const items=state.data?.items||[];
  const counts={approved:0,revision:0,rejected:0};
  items.forEach(item=>{const s=statusOf(item.id);if(counts[s]!==undefined)counts[s]+=1});
  $('#statTotal').textContent=String(items.length);
  $('#statApproved').textContent=String(counts.approved);
  $('#statRevision').textContent=String(counts.revision);
  $('#statRejected').textContent=String(counts.rejected);
}
function itemHtml(item){
  const status=statusOf(item.id);
  const blockers=approvalBlockers(item);
  const sourceReview=item.sourceQueue?`<p><strong>Plan:</strong> ${esc(item.sourceQueue)} · ${esc(item.queueStatus)}</p><h3>Izvor i uvjeti odobrenja</h3><pre>${esc(JSON.stringify(item.sourceGate,null,2))}</pre>${item.scenario?`<h3>Scenarij</h3><pre>${esc(JSON.stringify(item.scenario,null,2))}</pre>`:''}${blockers.length?`<ul>${blockers.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p>Uvjeti pripreme ispunjeni; potrebna je izričita ljudska odluka.</p>'}`:'';
  const body=(item.body||[]).map(p=>`<p>${esc(p)}</p>`).join('');
  const links=(item.internalLinks||[]).map(link=>`<span class="chip">${esc(link)}</span>`).join('');
  const keywords=(item.keywords||[]).map(keyword=>`<span class="chip">${esc(keyword)}</span>`).join('');
  return `<article class="editorial-item" data-status="${esc(status)}" data-id="${esc(item.id)}">
    <div><input class="item-select" type="checkbox" value="${esc(item.id)}" aria-label="Označi ${esc(item.title)}"></div>
    <div>
      <div class="item-meta"><span>${esc(item.id)}</span><span>${esc(item.type)}</span><span>${esc(item.topic)}</span></div>
      <h2>${esc(item.title)}</h2>
      <p class="item-summary">${esc(item.summary)}</p>
      <details class="item-details">
        <summary>Otvori nacrt, SEO i linkove</summary>
        ${sourceReview}
        <h3>SEO naslov</h3><p>${esc(item.seoTitle)}</p>
        <h3>Meta opis</h3><p>${esc(item.metaDescription)}</p>
        <h3>Ključne riječi</h3><div class="chips">${keywords}</div>
        <h3>Interna link-mapa</h3><div class="chips">${links}</div>
        <h3>Tekst nacrta</h3>${body}
        <p><strong>Predložena urednička oznaka:</strong> ${esc(state.data.editor.approvalLineTemplate)}</p>
      </details>
    </div>
    <div class="item-side">
      <span class="status-label">${esc(statusLabel(status))}</span>
      <select class="item-status" data-id="${esc(item.id)}" aria-label="Odluka za ${esc(item.title)}">
        <option value="pending"${status==='pending'?' selected':''}>Čeka odluku</option>
        <option value="approved"${blockers.length?' disabled':''}${status==='approved'?' selected':''}>Odobri</option>
        <option value="revision"${status==='revision'?' selected':''}>Vrati na doradu</option>
        <option value="rejected"${status==='rejected'?' selected':''}>Odbij</option>
      </select>
      <textarea class="item-comment" data-id="${esc(item.id)}" placeholder="Komentar ili uputa za doradu">${esc(state.comments[item.id]||'')}</textarea>
    </div>
  </article>`;
}
function renderEditorial(){
  const all=state.data?.items||[];
  const items=state.filter==='all'?all:all.filter(item=>statusOf(item.id)===state.filter);
  $('#editorialList').innerHTML=items.length?items.map(itemHtml).join(''):'<div class="empty">Nema stavki u odabranom filtru.</div>';
  document.querySelectorAll('.item-status').forEach(select=>select.addEventListener('change',()=>setDecision(select.dataset.id,select.value)));
  document.querySelectorAll('.item-comment').forEach(area=>area.addEventListener('input',()=>{
    state.comments[area.dataset.id]=area.value;
    saveLocal();
  }));
  $('#selectAll').checked=false;
}
function renderProjects(){
  const projects=state.data?.projects||[];
  $('#projectList').innerHTML=projects.map(project=>`<article class="project-card">
    <div class="item-meta"><span>${esc(project.id)}</span><span>${esc(project.lead)}</span></div>
    <h2>${esc(project.name)}</h2>
    <p>${esc(project.objective)}</p>
    <h3>Workeri</h3><p>${(project.workers||[]).map(esc).join(' · ')}</p>
    <h3>Sastanci</h3><p>${esc(project.meeting)}</p>
    <h3>Isporuke</h3><ul>${(project.deliverables||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
    <h3>Format izvještaja</h3><p>${esc(project.report)}</p>
  </article>`).join('');
}
function renderPolicy(){
  const d=state.data;
  $('#policyPanel').innerHTML=`
    <article class="policy-card"><h2>Pravila objave</h2>
      <p>${esc(d.publicationPolicy.thirdPartyContent)}</p>
      <p>${esc(d.publicationPolicy.seo)}</p>
    </article>
    <article class="policy-card"><h2>AI i personalizacija</h2>
      <p>${esc(d.publicationPolicy.ai)}</p>
      <p><strong>Stvarno stanje:</strong> portal može koristiti AI za nacrt i klasifikaciju samo kada je AI servis dostupan. Automatski mailovi moraju imati deterministički fallback, zaštitu od petlji i ljudsku kontrolu za sadržajne odgovore.</p>
    </article>
    <article class="policy-card"><h2>Urednička odgovornost</h2>
      <p>Konačna oznaka odobrenja dodaje se tek nakon stvarne odluke glavnog urednika. Nacrt ne smije unaprijed tvrditi da je odobren.</p>
      <p><strong>Predložak:</strong> ${esc(d.editor.approvalLineTemplate)}</p>
    </article>
    <article class="policy-card"><h2>SEO pravilo</h2>
      <p>Imena Nermin Sefić, GNK ASG d.o.o. i GNK DINAMO Ltd. koriste se samo ondje gdje su semantički relevantna. Prekomjerno ponavljanje može smanjiti kvalitetu i vjerodostojnost stranice.</p>
    </article>`;
}
function exportDecisions(){
  const payload={
    exportedAt:new Date().toISOString(),
    source:DATA_URL,
    decisions:Object.fromEntries((state.data.items||[]).filter(item=>state.decisions[item.id]).map(item=>[item.id,{...state.decisions[item.id],status:statusOf(item.id)}])),
    sourceQueues:state.data.sourceQueues||[],
    publicationAuthorized:false,
    sourceQueueReview:(state.data.items||[]).filter(item=>item.sourceQueue).map(item=>({id:item.id,file:item.sourceQueue,queueStatus:item.queueStatus,decision:statusOf(item.id),blockers:approvalBlockers(item)})),
    comments:state.comments,
    approvedItems:(state.data.items||[]).filter(item=>statusOf(item.id)==='approved').map(item=>item.id)
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`gnk-editorial-decisions-${new Date().toISOString().slice(0,10)}.json`;
  a.click();URL.revokeObjectURL(url);
}
function updateTimer(){
  if(!state.data)return;
  const start=new Date(state.data.approvalWindow.start).getTime();
  const end=new Date(state.data.approvalWindow.end).getTime();
  const now=Date.now();
  let label='';
  if(now<start)label=`Otvara se za ${formatDuration(start-now)}`;
  else if(now<end)label=`Preostalo ${formatDuration(end-now)}`;
  else label='Prozor odluke završen';
  $('#approvalTimer').textContent=label;
}
function formatDuration(ms){
  const total=Math.max(0,Math.floor(ms/1000));
  const h=String(Math.floor(total/3600)).padStart(2,'0');
  const m=String(Math.floor((total%3600)/60)).padStart(2,'0');
  const s=String(total%60).padStart(2,'0');
  return `${h}:${m}:${s}`;
}
function bind(){
  document.querySelectorAll('.tabs button').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x===button));
    document.querySelectorAll('.view').forEach(view=>view.classList.remove('active'));
    $(`#${button.dataset.view}View`)?.classList.add('active');
  }));
  $('#statusFilter').addEventListener('change',event=>{state.filter=event.target.value;renderEditorial()});
  $('#selectAll').addEventListener('change',event=>{
    document.querySelectorAll('.item-select').forEach(input=>{input.checked=event.target.checked});
  });
  document.querySelectorAll('[data-batch]').forEach(button=>button.addEventListener('click',()=>applyBatch(button.dataset.batch)));
  $('#exportDecisions').addEventListener('click',exportDecisions);
}
async function boot(){
  state.decisions=loadLocal(STORAGE_KEY);
  state.comments=loadLocal(COMMENT_KEY);
  bind();
  try{
    const response=await fetch(DATA_URL,{cache:'no-store',credentials:'same-origin',headers:{accept:'application/json'}});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    state.data=await response.json();
    // Load only after the protected API succeeded; never bypass authentication.
    try{
      const read=async url=>{const r=await fetch(url,{cache:'no-store',credentials:'same-origin',headers:{accept:'application/json'}});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()};
      const manifest=await read('/data/editorial-plan/manifest.json');
      const queues=manifest.reviewQueues||[];
      if(!Array.isArray(queues))throw new Error('Nevaljan popis uredničkih redova.');
      const ids=new Set((state.data.items||[]).map(item=>item.id));
      const additions=[];
      for(const entry of queues){
        if(entry.schema!==GNKEditorialSourceQueue.schema||entry.publicationMode!=='review-only'||!/^[a-zA-Z0-9-]+\.json$/.test(entry.file))throw new Error('Nevaljana evidencija uredničkog reda.');
        const rows=GNKEditorialSourceQueue.adapt(await read(`/data/editorial-plan/${entry.file}`),entry.file);
        for(const item of rows){if(ids.has(item.id))throw new Error('Duplicirani ID uredničke stavke.');ids.add(item.id);additions.push(item);}
      }
      state.data.items=[...(state.data.items||[]),...additions];
      state.data.sourceQueues=queues.map(entry=>entry.file);
    }catch(error){
      const notice=document.createElement('p');notice.setAttribute('role','alert');notice.textContent=`Izvorni urednički red nije učitan: ${error.message}`;
      $('#editorialList').before(notice);
      document.documentElement.dataset.editorialSourceQueue='error';
    }
    renderStats();renderEditorial();renderProjects();renderPolicy();updateTimer();
    setInterval(updateTimer,1000);
    document.documentElement.dataset.editorialApproval='ready-v1';
  }catch(error){
    $('#editorialList').innerHTML=`<div class="empty">Podaci nisu učitani: ${esc(error.message)}</div>`;
    document.documentElement.dataset.editorialApproval='error';
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();

