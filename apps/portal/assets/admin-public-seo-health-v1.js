(()=>{
  'use strict';
  if(window.__GNK_ASG_ADMIN_PUBLIC_SEO_HEALTH_V1__)return;
  window.__GNK_ASG_ADMIN_PUBLIC_SEO_HEALTH_V1__=true;

  const checks=[
    {label:'Medijske prijave',path:'/api/media-command-center/applications?limit=1',kind:'json'},
    {label:'Pristupni kodovi',path:'/api/media-access/admin/list',kind:'json'},
    {label:'Objave HR',path:'/objave/',kind:'hr'},
    {label:'Publications EN',path:'/publications/',kind:'en'},
    {label:'Sitemap objava',path:'/sitemap-objave.xml',kind:'xml'},
    {label:'Image sitemap',path:'/image-sitemap-objave.xml',kind:'xml'},
    {label:'Vijesti HR',path:'/vijesti/',kind:'hr'},
    {label:'News EN',path:'/news/',kind:'en'}
  ];
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function ensurePanel(){
    const host=document.getElementById('overview');
    if(!host||document.getElementById('publicSeoHealth'))return;
    const section=document.createElement('section');
    section.id='publicSeoHealth';
    section.className='dashboard-section';
    section.innerHTML='<div class="section-head"><div><p class="eyebrow">READ-ONLY PROVJERA</p><h3>Medijski pristup i javni SEO</h3><p>Provjera samo čita status i ne šalje poruke niti mijenja podatke.</p></div><button id="runPublicSeoHealth" type="button">Provjeri</button></div><div id="publicSeoHealthGrid" class="priority-grid"></div>';
    host.appendChild(section);
  }

  async function runOne(item){
    const started=performance.now();
    try{
      const response=await fetch(item.path+(item.path.includes('?')?'&':'?')+'cb='+Date.now(),{credentials:'same-origin',cache:'no-store',headers:{accept:item.kind==='json'?'application/json':item.kind==='xml'?'application/xml,text/xml':'text/html'}});
      const auth=[401,403].includes(response.status);
      if(item.kind==='json'){
        const data=await response.json().catch(()=>null);
        return{...item,ok:response.ok&&Boolean(data),warn:auth,status:response.status,detail:auth?'Potrebna prijava':data?'JSON uredan':'Neispravan JSON',ms:Math.round(performance.now()-started)};
      }
      const text=await response.text();
      if(item.kind==='xml'){
        const ok=response.ok&&text.includes('<urlset');
        return{...item,ok,warn:false,status:response.status,detail:ok?'XML uredan':'XML nije valjan',ms:Math.round(performance.now()-started)};
      }
      const expected=item.kind==='en'?'lang="en"':'lang="hr"';
      const ok=response.ok&&text.includes(expected)&&/rel=["']canonical["']/i.test(text);
      return{...item,ok,warn:false,status:response.status,detail:ok?'Jezik i canonical uredni':'Nedostaje jezik ili canonical',ms:Math.round(performance.now()-started)};
    }catch(error){return{...item,ok:false,warn:false,status:0,detail:String(error?.message||error),ms:Math.round(performance.now()-started)}}
  }

  async function run(){
    ensurePanel();
    const button=document.getElementById('runPublicSeoHealth');
    const grid=document.getElementById('publicSeoHealthGrid');
    if(!button||!grid)return;
    button.disabled=true;
    grid.innerHTML=checks.map(item=>`<article class="status-card"><small>${esc(item.label)}</small><strong>Provjera…</strong></article>`).join('');
    const results=await Promise.all(checks.map(runOne));
    grid.innerHTML=results.map(result=>`<article class="status-card"><small>${esc(result.label)}</small><strong>${result.ok?'SPREMNO':result.warn?'PRIJAVA':'GREŠKA'}</strong><span>${esc(result.detail)} · ${result.ms} ms</span></article>`).join('');
    button.disabled=false;
  }

  function boot(){ensurePanel();document.getElementById('runPublicSeoHealth')?.addEventListener('click',run)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();