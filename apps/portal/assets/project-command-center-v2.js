(()=>{
'use strict';
const VERSION='2026-07-05.project-command-center.02';
const q=(selector,root=document)=>root.querySelector(selector);
const fmt=value=>new Intl.NumberFormat('hr-HR').format(Number(value||0));
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const state={status:null,projects:[],reports:[]};

async function getJson(path){
  const response=await fetch(path,{credentials:'same-origin',headers:{accept:'application/json'}});
  if(response.status===401||response.status===403)throw new Error('Zaštićena sesija nije aktivna.');
  if(!response.ok)throw new Error(`Runtime ${path} vratio je HTTP ${response.status}.`);
  return response.json();
}
function setText(id,value){
  const node=document.getElementById(id);
  if(node)node.textContent=value;
}
function workSummary(){
  return state.status?.workSummary||state.reports?.[0]?.workSummary||{};
}
function renderMetrics(){
  const summary=workSummary();
  setText('metric-projects',fmt(state.status?.projectCount||state.projects.length));
  setText('metric-workers',fmt(state.status?.assignedWorkerCount||summary.total));
  setText('metric-tasks',fmt(state.status?.assignedTaskCount||((summary.total||0)*2)));
  setText('metric-working',fmt(summary.inProgress));
  setText('metric-review',fmt(summary.reviewRequired));
  setText('hero-worker-count',fmt(state.status?.assignedWorkerCount||summary.total));
  setText('hero-working-count',fmt(summary.inProgress));
  setText('hero-review-count',fmt(summary.reviewRequired));
  setText('runtime-last-cycle',state.status?.lastCycle?new Date(state.status.lastCycle).toLocaleString('hr-HR'):'nije još zabilježen');
}
function reportMap(){
  const items=state.reports?.[0]?.projects||state.status?.latestReport?.projects||[];
  return new Map(items.map(item=>[item.projectId,item]));
}
function renderProjects(){
  const host=document.getElementById('runtime-project-grid');
  if(!host)return;
  const reports=reportMap();
  if(!state.projects.length){
    host.innerHTML='<div class="empty">Projektni registry trenutačno nema dostupne zapise.</div>';
    return;
  }
  host.innerHTML=state.projects.map(project=>{
    const report=reports.get(project.id)||{};
    const maturity=Math.max(0,Math.min(100,Number(project.maturity||0)*12+18));
    const label=esc(project.publicLabel||project.stage||'REVIEW');
    const workstreams=Array.isArray(project.workstreams)?project.workstreams.length:0;
    return `<article class="project" tabindex="0" data-project-id="${esc(project.id)}">
      <div class="project-top"><h3>${esc(project.name)}</h3><span class="status ${label}">${label}</span></div>
      <div class="project-meta">
        <span>${fmt(report.assignedWorkers)} dodijeljenih profila</span>
        <span>${fmt(report.inProgress)} u radu</span>
        <span>${fmt(report.reviewRequired)} review</span>
        <span>${fmt(workstreams)} workstreama</span>
      </div>
      <div class="bar" aria-label="Maturity ${maturity}%"><i style="width:${maturity}%"></i></div>
      <div class="project-foot"><span>${esc(project.stage||'intake')}</span><span>${esc(project.territory||'international')}</span></div>
    </article>`;
  }).join('');
}
function renderReports(){
  const host=document.getElementById('runtime-report-list');
  if(!host)return;
  const reports=Array.isArray(state.reports)?state.reports.slice(0,6):[];
  if(!reports.length){
    host.innerHTML='<div class="empty">Prvo runtime izvješće još nije generirano.</div>';
    return;
  }
  host.innerHTML=reports.map(report=>{
    const summary=report.workSummary||{};
    const generated=report.generatedAt?new Date(report.generatedAt).toLocaleString('hr-HR'):'';
    return `<article class="report">
      <b>${esc(report.slot||report.id||'Runtime report')}</b>
      <span>${generated} · ${fmt(summary.inProgress)} u radu · ${fmt(summary.reviewRequired)} na review gateu · ${fmt(report.projectCount)} projekata</span>
    </article>`;
  }).join('');
}
function setRuntimeState(kind,message){
  const node=document.getElementById('runtime-state');
  if(!node)return;
  node.dataset.state=kind;
  node.textContent=message;
}
async function load(){
  const button=document.getElementById('runtime-refresh');
  if(button)button.disabled=true;
  setRuntimeState('loading','Učitavanje zaštićenog operativnog runtimea…');
  try{
    const [status,projects,reports]=await Promise.all([
      getJson('/api/enterprise-projects/status'),
      getJson('/api/enterprise-projects/projects'),
      getJson('/api/enterprise-projects/reports')
    ]);
    state.status=status;
    state.projects=Array.isArray(projects.items)?projects.items:[];
    state.reports=Array.isArray(reports.items)?reports.items:[];
    renderMetrics();
    renderProjects();
    renderReports();
    setRuntimeState('ok',`Runtime aktivan · ${fmt(status.assignedWorkerCount)} profila · ${fmt(status.assignedTaskCount)} zadatka · verzija ${status.version||VERSION}`);
  }catch(error){
    console.error('[Project Center]',error);
    setRuntimeState('error',error?.message||'Operativni runtime nije dostupan.');
  }finally{
    if(button)button.disabled=false;
  }
}
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('runtime-refresh')?.addEventListener('click',load);
  load();
  window.setInterval(load,60000);
});
})();