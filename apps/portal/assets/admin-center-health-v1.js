(()=>{
  'use strict';
  if(window.__GNK_ASG_ADMIN_HEALTH_V2__)return;
  window.__GNK_ASG_ADMIN_HEALTH_V2__=true;

  const checks=[
    {id:'auth',label:'Sigurna sesija',path:'/api/operator-auth-check',type:'json'},
    {id:'backend',label:'Operator backend',path:'/api/operator-backend-status',type:'json'},
    {id:'mail',label:'Mail Studio API',path:'/api/mail-center/status',type:'json'},
    {id:'media',label:'Media Command Center API',path:'/api/media-command-center/status',type:'json'},
    {id:'deliveryPlan',label:'E-mail delivery plan',path:'/api/media-command-center/delivery-plan',type:'json'},
    {id:'deliveryStatus',label:'E-mail delivery status',path:'/api/media-command-center/delivery-status',type:'json'},
    {id:'pdf',label:'Službeni PDF',path:'/api/media-command-center/campaign-pdf',type:'json'},
    {id:'sms',label:'SMS kanal',path:'/api/media-command-center/sms-status',type:'json'},
    {id:'health',label:'Platform health',path:'/data/platform-health.json',type:'json'},
    {id:'version',label:'Portal version',path:'/data/portal-version.json',type:'json'},
    {id:'mailUi',label:'Mail Studio modul',path:'/mail-studio/?embedded=1&hubmodule=mail',type:'html'},
    {id:'operatorUi',label:'Operator modul',path:'/operator-dashboard/?embedded=1&hubmodule=operator',type:'html'},
    {id:'mediaUi',label:'Medijski centar modul',path:'/media-command-center/?embedded=1&hubmodule=media',type:'html'},
    {id:'editorUi',label:'Auto Editor modul',path:'/auto-editor/?embedded=1&hubmodule=editor',type:'html'},
    {id:'newsUi',label:'News Admin modul',path:'/news-admin/?embedded=1&hubmodule=news',type:'html'},
    {id:'pdfUi',label:'PDF Publisher modul',path:'/pdf-publisher/?embedded=1&hubmodule=pdf',type:'html'},
    {id:'memoUi',label:'Memorandum Studio',path:'/memorandum-studio/?embedded=1&hubmodule=memorandum',type:'html'},
    {id:'socialUi',label:'Social Share modul',path:'/social-share/?embedded=1&hubmodule=social',type:'html'},
    {id:'whatsappUi',label:'WhatsApp modul',path:'/wa-center/?embedded=1&hubmodule=whatsapp',type:'html'}
  ];

  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function loadOperations(){
    if(!document.querySelector('link[data-gnk-operations="v1"]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='/assets/admin-operations-v1.css?v=20260627-v2';
      link.dataset.gnkOperations='v1';
      document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-gnk-operations="v1"]')){
      const script=document.createElement('script');
      script.src='/assets/admin-operations-v1.js?v=20260627-v2';
      script.defer=true;
      script.dataset.gnkOperations='v1';
      document.head.appendChild(script);
    }
  }

  function ensureUi(){
    const actions=document.querySelector('.actions');
    if(actions&&!$('adminTestAll')){
      const button=document.createElement('button');
      button.id='adminTestAll';
      button.type='button';
      button.textContent='Testiraj sve';
      actions.prepend(button);
    }
    const overview=$('overview');
    if(overview&&!$('adminHealthPanel')){
      const panel=document.createElement('section');
      panel.id='adminHealthPanel';
      panel.innerHTML='<div class="admin-health-head"><div><small>FUNKCIONALNI AUDIT</small><h3>Provjera API-ja i svih admin modula</h3><p>Provjera ne šalje e-mail, SMS niti mijenja podatke. Svaki poziv prekida se nakon 10 sekundi.</p></div><strong id="adminHealthSummary">Nije pokrenuto</strong></div><div id="adminHealthResults" class="admin-health-results"></div>';
      overview.appendChild(panel);
    }
    if(!$('adminHealthStyle')){
      const style=document.createElement('style');
      style.id='adminHealthStyle';
      style.textContent='#adminHealthPanel{margin-top:10px;padding:14px;border:1px solid var(--l,#d7dfeb);border-radius:14px;background:#fff}.admin-health-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.admin-health-head small{color:#8a6518;font-size:8px;font-weight:900;letter-spacing:.1em}.admin-health-head h3{margin:4px 0}.admin-health-head p{margin:0;color:var(--m,#66758a);font-size:10px}.admin-health-results{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:11px}.admin-health-item{padding:10px;border:1px solid var(--l,#d7dfeb);border-radius:11px}.admin-health-item small,.admin-health-item strong,.admin-health-item span{display:block}.admin-health-item small{color:var(--m,#66758a);font-size:8px}.admin-health-item strong{margin-top:4px;font-size:12px}.admin-health-item span{margin-top:3px;color:var(--m,#66758a);font-size:8px;line-height:1.35}.admin-health-item.ok{border-color:#9ed8bd;background:#f0fbf6}.admin-health-item.warn{border-color:#ead39f;background:#fff9eb}.admin-health-item.bad{border-color:#efb2ad;background:#fff2f1}@media(max-width:1050px){.admin-health-results{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:650px){.admin-health-head{flex-direction:column}.admin-health-results{grid-template-columns:1fr 1fr}}';
      document.head.appendChild(style);
    }
  }

  async function runOne(entry){
    const start=performance.now();
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),10000);
    try{
      const url=new URL(entry.path,location.origin);
      url.searchParams.set('cb',Date.now());
      const response=await fetch(url,{credentials:'same-origin',cache:'no-store',redirect:'follow',headers:{accept:entry.type==='html'?'text/html,application/xhtml+xml':'application/json','cache-control':'no-cache'},signal:controller.signal});
      const contentType=String(response.headers.get('content-type')||'').toLowerCase();
      const auth=[401,403].includes(response.status);
      let data=null;
      let contentOk=true;
      let routeOk=true;
      if(entry.type==='json'){
        try{data=await response.clone().json();}catch(_){contentOk=false;}
      }else{
        contentOk=contentType.includes('text/html');
        const finalPath=new URL(response.url).pathname.replace(/\/+$/,'')||'/';
        const requestedPath=url.pathname.replace(/\/+$/,'')||'/';
        routeOk=auth||finalPath===requestedPath;
      }
      const ok=response.ok&&contentOk&&routeOk;
      return{...entry,status:response.status,ms:Math.round(performance.now()-start),ok,warn:auth,data,contentType,routeOk,finalUrl:response.url};
    }catch(error){
      return{...entry,status:0,ms:Math.round(performance.now()-start),ok:false,warn:false,error:error?.name==='AbortError'?'Istek vremena nakon 10 sekundi':String(error?.message||error)};
    }finally{
      clearTimeout(timeout);
    }
  }

  function detail(result){
    if(result.ok){
      if(result.id==='sms')return result.data?.providerConfigured?'Provider spreman':'DRY-RUN · provider nije konfiguriran';
      if(result.id==='deliveryStatus')return result.data?.live?'Produkcija otključana':'Produkcija zaključana';
      if(result.id==='pdf')return result.data?.pdf?.ok?'PDF spreman':'PDF endpoint odgovara';
      if(result.type==='html')return'Modul i ruta odgovaraju';
      return'Odgovor je uredan';
    }
    if(result.warn)return'Potrebna prijava';
    if(result.routeOk===false)return'Ruta je preusmjerena na drugi modul';
    if(result.contentType&&result.type==='html'&&!result.contentType.includes('text/html'))return`Pogrešan sadržaj: ${result.contentType}`;
    if(result.contentType&&result.type==='json'&&!result.data)return`Neispravan JSON: ${result.contentType}`;
    return result.error||`HTTP ${result.status}`;
  }

  async function runAll(){
    ensureUi();
    const button=$('adminTestAll');
    const summary=$('adminHealthSummary');
    const container=$('adminHealthResults');
    if(!button||!summary||!container)return;
    button.disabled=true;
    summary.textContent='Provjera u tijeku…';
    container.innerHTML=checks.map(item=>`<div class="admin-health-item"><small>${esc(item.label)}</small><strong>Provjera…</strong></div>`).join('');
    try{
      const results=await Promise.all(checks.map(runOne));
      let ok=0,warn=0,bad=0;
      container.innerHTML=results.map(result=>{
        const cls=result.ok?'ok':result.warn?'warn':'bad';
        if(result.ok)ok++;else if(result.warn)warn++;else bad++;
        return`<div class="admin-health-item ${cls}"><small>${esc(result.label)}</small><strong>${result.ok?'SPREMNO':result.warn?'PRIJAVA':'GREŠKA'}</strong><span>${esc(detail(result))} · ${result.ms} ms</span></div>`;
      }).join('');
      summary.textContent=`${ok} spremno · ${warn} traži prijavu · ${bad} grešaka`;
    }finally{
      button.disabled=false;
    }
  }

  function boot(){
    loadOperations();
    ensureUi();
    $('adminTestAll')?.addEventListener('click',runAll);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();