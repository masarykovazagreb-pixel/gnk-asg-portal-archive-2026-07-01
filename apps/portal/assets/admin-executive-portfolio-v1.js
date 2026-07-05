(()=>{
'use strict';
if(window.__GNK_ADMIN_EXECUTIVE_PORTFOLIO_V1__)return;
window.__GNK_ADMIN_EXECUTIVE_PORTFOLIO_V1__=true;
const VERSION='2026-07-05.admin-executive-portfolio.01';
const API='/api/enterprise-projects';
const DEPARTMENTS={MCO:'Mission Control',MED:'Media Operations',PUB:'Publishing',SEO:'SEO and Discoverability',REG:'Registry',LEG:'Legal and Compliance',CMP:'Campaign Operations',FIN:'Finance',TRE:'Treasury',ACC:'Accounting',INV:'Investment Analysis',AIR:'AI Research',DAT:'Data Operations',ANA:'Analytics',TRN:'Translation',CRM:'Relationship Management',CUS:'Customer Operations',SEC:'Security',INF:'Infrastructure',CLD:'Cloud Operations',DEV:'Development',DPL:'Deployment',RCV:'Recovery',QAA:'Quality Assurance',COD:'Content Operations',REGN:'Regional Operations',ADM:'Administration'};
const state={governance:null,status:null,projects:[],assignments:[],reports:[],events:[],filter:'',workerFilter:''};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fmt=value=>new Intl.NumberFormat('hr-HR').format(Number(value||0));
const clone=value=>JSON.parse(JSON.stringify(value));
const arr=value=>Array.isArray(value)?value:[];
async function readJson(url){const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});if(!response.ok)throw new Error(`${url} · HTTP ${response.status}`);return response.json();}
function department(workerId){const code=String(workerId||'').split('-')[0];return{code,name:DEPARTMENTS[code]||'Enterprise Operations'};}
function profile(item){const dept=department(item.workerId);const number=String(item.workerId||'').split('-').at(-1)||'';return{...item,departmentCode:dept.code,functionName:dept.name,profileName:`${dept.name} · profil ${number}`};}
function install(){
  const overview=document.getElementById('overview');
  if(!overview||document.getElementById('executivePortfolio'))return;
  const section=document.createElement('section');
  section.id='executivePortfolio';section.className='executive-portfolio';
  section.innerHTML=`<div class="ep-head"><div><div class="ep-eyebrow">Executive portfolio · 99% automation / 1% decision</div><h3>Projekti, timovi i radni zadaci</h3><p>Odmah se vidi tko radi, na kojem projektu, koji je sljedeći zadatak i gdje nedostaju owner, rok, dokument, budžet ili odluka.</p></div><div class="ep-actions"><input id="epProjectFilter" class="ep-filter" type="search" placeholder="Pretraži projekt, ownera ili status"><button id="epRefresh" class="ep-button" type="button">Osvježi</button></div></div><div id="epSummary" class="ep-summary"></div><div id="epNotice" class="ep-warning">Učitavanje portfelja i operativnih profila…</div><div id="epProjects" class="ep-projects"></div><div class="ep-workers"><div class="ep-workers-head"><div><div class="ep-eyebrow">Operational profiles</div><h4>Imena funkcija i zadaci workera</h4></div><input id="epWorkerFilter" class="ep-filter" type="search" placeholder="Worker, funkcija, projekt ili zadatak"></div><div id="epWorkers" class="ep-table-wrap"></div></div>`;
  const statusGrid=document.getElementById('statusGrid');
  (statusGrid?.parentElement||overview).appendChild(section);
  document.getElementById('epRefresh')?.addEventListener('click',load);
  document.getElementById('epProjectFilter')?.addEventListener('input',event=>{state.filter=event.target.value.toLowerCase();renderProjects();});
  document.getElementById('epWorkerFilter')?.addEventListener('input',event=>{state.workerFilter=event.target.value.toLowerCase();renderWorkers();});
}
async function loadAssignments(){
  const first=await readJson(`${API}/assignments?offset=0&limit=200`);
  const total=Number(first.total||0),items=arr(first.items);
  const requests=[];
  for(let offset=200;offset<total;offset+=200)requests.push(readJson(`${API}/assignments?offset=${offset}&limit=200`));
  const rest=await Promise.all(requests);
  return[...items,...rest.flatMap(payload=>arr(payload.items))].map(profile);
}
function defaultsFor(project){
  const base=clone(state.governance?.defaultGovernance||{});
  const functionOwner=state.governance?.functionOwners?.[project.id];
  if(functionOwner){base.owner=base.owner||{};base.owner.function=functionOwner;}
  return base;
}
function projectAssignments(projectId){return state.assignments.filter(item=>item.primaryProjectId===projectId||item.supportProjectId===projectId);}
function enrich(project){
  const governance=defaultsFor(project),workers=projectAssignments(project.id),primary=workers.filter(item=>item.primaryProjectId===project.id),support=workers.filter(item=>item.supportProjectId===project.id);
  const ownerWorker=primary.find(item=>item.workState==='in-progress')||primary[0]||null;
  const teamCounts={};workers.forEach(item=>{teamCounts[item.functionName]=(teamCounts[item.functionName]||0)+1;});
  const owner={...governance.owner,name:ownerWorker?.profileName||governance.owner?.name||'Accountable Project Owner',workerId:ownerWorker?.workerId||null,status:ownerWorker?.workState||governance.owner?.status||'not-set'};
  return{...project,...governance,owner,workers,primaryCount:primary.length,supportCount:support.length,teamCounts,registryStatus:project.registryStatus||'runtime-connected',backlog:arr(project.firstBacklog),workstreams:arr(project.workstreams)};
}
function portfolio(){
  const runtime=state.projects.map(project=>({...project,registryStatus:'runtime-connected'}));
  const existing=new Set(runtime.map(item=>item.id));
  const extras=arr(state.governance?.additionalProjects).filter(item=>!existing.has(item.id));
  return[...runtime,...extras].map(enrich);
}
function summary(){
  const projects=portfolio(),work=state.status?.workSummary||{};
  const missingBudget=projects.filter(item=>item.budget?.approved==null).length;
  const pending=projects.filter(item=>item.registryStatus!=='runtime-connected').length;
  return[
    [projects.length,'ukupno projektnih programa'],
    [projects.length-pending,'runtime povezanih projekata'],
    [pending,'projekata za integraciju'],
    [work.inProgress||0,'profila trenutačno u radu'],
    [work.reviewRequired||0,'paketa na review gateu'],
    [missingBudget,'projekata bez odobrenog budžeta']
  ];
}
function renderSummary(){document.getElementById('epSummary').innerHTML=summary().map(item=>`<article class="ep-metric"><b>${fmt(item[0])}</b><span>${esc(item[1])}</span></article>`).join('');}
function list(items,mapper){const values=arr(items);return values.length?`<ul class="ep-list">${values.map(mapper).join('')}</ul>`:'<div class="ep-empty">NIJE POSTAVLJENO</div>';}
function money(project){const budget=project.budget||{},model=project.financialModel||{};const value=number=>number==null?'NIJE POSTAVLJENO':`${fmt(number)} ${budget.currency||'EUR'}`;return`<div class="ep-money"><div><b>${value(budget.approved)}</b><span>odobreni budžet</span></div><div><b>${value(budget.forecast)}</b><span>forecast</span></div><div><b>${esc(model.fundingSource||'NIJE POSTAVLJENO')}</b><span>izvor financiranja</span></div><div><b>${esc(model.status||'not-approved')}</b><span>financijski model</span></div></div>`;}
function projectCard(project){
  const team=Object.entries(project.teamCounts).sort((a,b)=>b[1]-a[1]);
  const active=project.workers.filter(item=>item.workState==='in-progress').length;
  const review=project.workers.filter(item=>item.workState==='review-required').length;
  const deadline=project.milestones?.find(item=>item.deadline)?.deadline||'NIJE POSTAVLJENO';
  return`<details class="ep-project"><summary><div class="ep-title"><strong>${esc(project.name)}</strong><small>${esc(project.id)} · ${esc(project.registryStatus)}</small></div><span class="ep-pill ${esc(project.publicLabel||'PLANNED')}">${esc(project.publicLabel||'PLANNED')}</span><div class="ep-cell"><small>Owner</small><b>${esc(project.owner?.name||'NIJE POSTAVLJENO')}</b></div><div class="ep-cell"><small>U radu</small><b>${fmt(active)}</b></div><div class="ep-cell"><small>Review</small><b>${fmt(review)}</b></div><div class="ep-cell"><small>Rok</small><b>${esc(deadline)}</b></div></summary><div class="ep-body"><div class="ep-grid">
  <section class="ep-block wide"><h4>Projektni owner i timovi</h4><p><b>${esc(project.owner?.name||'NIJE POSTAVLJENO')}</b><br><small>${esc(project.owner?.function||'NIJE POSTAVLJENO')} · ${esc(project.owner?.workerId||project.owner?.status||'bez potvrđenog imenovanog ownera')}</small></p>${list(team,entry=>`<li>${esc(entry[0])}<small>${fmt(entry[1])} profila</small></li>`)}</section>
  <section class="ep-block wide"><h4>Backlog i aktivni zadaci</h4>${list(project.backlog,item=>`<li>${esc(item)}</li>`)}${list(project.workers.filter(item=>item.workState==='in-progress').slice(0,8),item=>`<li><b>${esc(item.profileName)}</b><small>${esc(item.currentAction||item.primaryTask?.title)} · ${fmt(item.progressPct)}%</small></li>`)}</section>
  <section class="ep-block"><h4>Milestonei i rokovi</h4>${list(project.milestones,item=>`<li>${esc(item.name)}<small>${esc(item.status)} · ${esc(item.deadline||'rok nije postavljen')}</small></li>`)}</section>
  <section class="ep-block"><h4>Dokumenti</h4>${list(project.documents,item=>`<li>${esc(item.name)}<small>${esc(item.status)}</small></li>`)}</section>
  <section class="ep-block"><h4>Ovisnosti</h4>${list(project.dependencies,item=>`<li>${esc(item)}</li>`)}</section>
  <section class="ep-block"><h4>Rizici</h4>${list(project.risks,item=>`<li>${esc(item.name)}<small>${esc(item.level)} · ${esc(item.status)}</small></li>`)}</section>
  <section class="ep-block"><h4>Review gate i audit</h4><p><span class="ep-pill">${esc(project.reviewGate?.state||'review-required')}</span></p><p><small>Dokaz: ${project.reviewGate?.evidenceRequired?'obvezan':'nije definiran'}<br>Peer review: ${project.reviewGate?.peerReviewRequired?'obvezan':'nije definiran'}<br>Audit zapisa: ${fmt(project.workers.reduce((n,item)=>n+arr(item.auditTrail).length,0))}</small></p></section>
  <section class="ep-block"><h4>Budžet i financijski model</h4>${money(project)}</section>
  <section class="ep-block wide"><h4>Workstreamovi</h4>${list(project.workstreams,item=>`<li>${esc(item)}</li>`)}</section>
  <section class="ep-block wide"><h4>Status radnika</h4><div class="ep-money"><div><b>${fmt(project.workers.length)}</b><span>ukupno dodijeljeno</span></div><div><b>${fmt(active)}</b><span>u radu</span></div><div><b>${fmt(review)}</b><span>review-required</span></div><div><b>${fmt(project.supportCount)}</b><span>support dodjela</span></div></div></section>
  </div></div></details>`;
}
function renderProjects(){
  const host=document.getElementById('epProjects');if(!host)return;
  const filtered=portfolio().filter(project=>!state.filter||`${project.id} ${project.name} ${project.stage} ${project.publicLabel} ${project.registryStatus} ${project.owner?.name} ${project.owner?.function}`.toLowerCase().includes(state.filter));
  host.innerHTML=filtered.length?filtered.map(projectCard).join(''):'<div class="ep-empty">Nema projekata za odabrani filter.</div>';
}
function renderWorkers(){
  const host=document.getElementById('epWorkers');if(!host)return;
  const projectNames=new Map(portfolio().map(item=>[item.id,item.name]));
  const rows=state.assignments.filter(item=>!state.workerFilter||`${item.workerId} ${item.profileName} ${item.functionName} ${projectNames.get(item.primaryProjectId)||''} ${item.currentAction||''} ${item.workState}`.toLowerCase().includes(state.workerFilter)).slice(0,250);
  host.innerHTML=rows.length?`<table class="ep-table"><thead><tr><th>Operativni profil</th><th>Funkcija</th><th>Primarni projekt</th><th>Aktivni zadatak</th><th>Status</th><th>Napredak</th><th>Heartbeat / checkpoint</th><th>Audit</th></tr></thead><tbody>${rows.map(item=>`<tr><td><b>${esc(item.profileName)}</b><small>${esc(item.workerId)}</small></td><td>${esc(item.functionName)}</td><td>${esc(projectNames.get(item.primaryProjectId)||item.primaryProjectId)}</td><td>${esc(item.currentAction||item.primaryTask?.title||'NIJE POSTAVLJENO')}<small>${esc(item.supportTask?.title||'')}</small></td><td><span class="ep-state">${esc(item.workState)}</span></td><td>${fmt(item.progressPct)}%</td><td>${esc(item.lastHeartbeatAt||'—')}<small>${esc(item.nextCheckpointAt||'—')}</small></td><td>${esc(item.auditRef||'—')}<small>${fmt(arr(item.auditTrail).length)} zapisa</small></td></tr>`).join('')}</tbody></table>`:'<div class="ep-empty">Nema profila za odabrani filter.</div>';
}
async function load(){
  const notice=document.getElementById('epNotice');if(notice)notice.textContent='Učitavanje svih projekata, assignmenta i audit statusa…';
  try{
    const [governance,status,projects,reports,events,assignments]=await Promise.all([
      readJson('/data/project-portfolio-governance-v1.json'),readJson(`${API}/status`),readJson(`${API}/projects`),readJson(`${API}/reports`),readJson(`${API}/events`),loadAssignments()
    ]);
    state.governance=governance;state.status=status;state.projects=arr(projects.items);state.reports=arr(reports.items);state.events=arr(events.items);state.assignments=assignments;
    renderSummary();renderProjects();renderWorkers();
    if(notice)notice.innerHTML=`<b>${fmt(portfolio().length)} projekata</b> · ${fmt(assignments.length)} operativnih profila · ${fmt(status.assignedTaskCount)} zadatka · zadnji ciklus ${esc(status.lastCycle||'nije zabilježen')}. Polja bez stvarno odobrenog roka ili budžeta prikazana su kao NIJE POSTAVLJENO.`;
  }catch(error){console.error('[Executive Portfolio]',error);if(notice){notice.classList.add('ep-error');notice.textContent=`Portfolio nije potpuno učitan: ${error?.message||error}`;}}
}
function start(){install();load();window.setInterval(load,60000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();