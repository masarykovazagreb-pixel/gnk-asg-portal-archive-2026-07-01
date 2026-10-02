(() => {
  'use strict';
  const isEn = () => (document.documentElement.lang || '').toLowerCase().startsWith('en') || /\/en\//.test(location.pathname);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function getJson(url){ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }
  function render(container, health, state){
    const en=isEn();
    const workers=Number(state?.workers || 0);
    const agent=state?.supervisorAgent || {};
    container.innerHTML=`
      <article class="tabloid-wire-card workforce-truth-card">
        <div class="wire-card-top">
          <span class="wire-badge"><span class="pulse-dot"></span> ${en?'CONTROL PLANE':'CONTROL PLANE'}</span>
          <span class="wire-project">${esc(agent.id || 'AGENT-PORTAL-SUPERVISOR-001')}</span>
          <span class="wire-time">${esc(health?.status || 'unknown')}</span>
        </div>
        <p class="wire-content"><strong>${workers.toLocaleString(en?'en-US':'hr-HR')}</strong> ${en?'modeled Workforce profiles/assignments':'modeliranih profila/assignmenta digitalne radne snage'}. ${en?'This number does not represent independent runtime processes.':'Taj broj ne predstavlja neovisne runtime procese.'}</p>
        <p class="wire-content">${en?'Runtime evidence':'Runtime dokaz'}: <strong>${esc(agent.runtimeEvidence || 'workflow-runs-and-production-health-only')}</strong>. ${en?'Supervisor status':'Status supervisora'}: <strong>${esc(agent.status || state?.status || 'unknown')}</strong>.</p>
      </article>`;
  }
  async function load(){
    const c=document.getElementById('workerWireStream'); if(!c) return;
    try { const [health,state]=await Promise.all([getJson('/api/public/digital-workforce/health'),getJson('/api/public/digital-workforce/state')]); render(c,health,state); }
    catch(e){ c.innerHTML=`<article class="tabloid-wire-card"><p class="wire-content">${isEn()?'Workforce runtime evidence is temporarily unavailable.':'Runtime dokaz digitalne radne snage trenutačno nije dostupan.'}</p></article>`; }
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>{load();setInterval(load,60000)}):(load(),setInterval(load,60000));
})();
