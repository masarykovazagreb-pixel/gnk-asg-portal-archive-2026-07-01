(() => {
  'use strict';
  const modules=[
    {id:'overview',label:'Admin pregled',icon:'⌂',title:'Admin pregled',description:'Status sustava i jedinstveni pristup administrativnim alatima.',route:'/admin-center/'},
    {id:'mail',label:'Mail Studio',icon:'✉',title:'GNK ASG Mail Studio',description:'Pošiljatelji, To / CC / BCC, potpisi, PDF prilozi, Inbox, Sent i Outbox.',route:'/mail-studio/'},
    {id:'operator',label:'Operator',icon:'▣',title:'Operator centar',description:'Status, konfiguracija, inbox, evidencije i operativne postavke.',route:'/operator-dashboard/'},
    {id:'media',label:'Medijski centar',icon:'◎',title:'Medijski komandni centar',description:'Medijska baza, kampanje, prijave, dokumenti i odobrenja.',route:'/media-command-center/'},
    {id:'editor',label:'Auto Editor',icon:'✎',title:'Auto Editor',description:'Objave i automatizirani urednički procesi.',route:'/auto-editor/'},
    {id:'news',label:'News Admin',icon:'◫',title:'News Admin',description:'Izvori, vijesti i urednička kontrola.',route:'/news-admin/'},
    {id:'pdf',label:'PDF Publisher',icon:'▤',title:'PDF Publisher',description:'Dokumenti, PDF objava i evidencija.',route:'/pdf-publisher/'},
    {id:'social',label:'Social Share',icon:'↗',title:'Social Share',description:'Priprema sadržaja za komunikacijske kanale.',route:'/social-share/'},
    {id:'wa',label:'WhatsApp',icon:'◉',title:'WhatsApp centar',description:'Privatni WhatsApp operativni modul.',route:'/wa-center/'},
    {id:'mobile',label:'Mobilni Admin',icon:'▯',title:'Mobilni Admin',description:'Administratorski prikaz za mobilne uređaje.',route:'/operator-mobile/'}
  ];

  const q=id=>document.getElementById(id);
  const nav=q('acNav');
  const frame=q('acFrame');
  const loading=q('acLoading');
  const overview=q('acOverview');
  const workspace=q('acWorkspace');
  let current='overview';

  const getModule=id=>modules.find(item=>item.id===id)||modules[0];
  const closeMenu=()=>document.body.classList.remove('ac-open');

  nav.innerHTML=modules.map(item=>`<button type="button" data-module="${item.id}"><i aria-hidden="true">${item.icon}</i><span>${item.label}</span></button>`).join('');

  function embeddedUrl(item){
    const url=new URL(item.route,location.origin);
    url.searchParams.set('embedded','1');
    url.searchParams.set('hubmodule',item.id);
    return url.pathname+url.search;
  }

  function cleanFrame(){
    try{
      const doc=frame.contentDocument;
      if(!doc)return;
      let style=doc.getElementById('acEmbeddedCleanup');
      if(!style){
        style=doc.createElement('style');
        style.id='acEmbeddedCleanup';
        style.textContent='#gnk-backend-shell,#gnk-admin-module-launcher-v7,#gnk-admin-lock-notice-v7{display:none!important}body{padding-top:0!important}';
        doc.head.appendChild(style);
      }
    }catch(_){ }
  }

  function select(id,push=true){
    const item=getModule(id);
    current=item.id;
    nav.querySelectorAll('button').forEach(button=>button.classList.toggle('active',button.dataset.module===item.id));
    q('acTitle').textContent=item.title;
    q('acDescription').textContent=item.description;
    q('acCurrent').textContent=item.title;
    q('acStandalone').href=item.route;
    q('acStandalone').hidden=item.id==='overview';

    if(item.id==='overview'){
      overview.classList.add('active');
      workspace.classList.remove('active');
      frame.hidden=true;
      loading.hidden=false;
      q('acReload').textContent='Provjeri status';
      loadStatus();
    }else{
      overview.classList.remove('active');
      workspace.classList.add('active');
      q('acReload').textContent='Osvježi modul';
      loading.hidden=false;
      frame.hidden=true;
      const target=embeddedUrl(item);
      if(frame.dataset.route!==target){
        frame.dataset.route=target;
        frame.src=target;
      }else{
        loading.hidden=true;
        frame.hidden=false;
        cleanFrame();
      }
    }

    closeMenu();
    if(push){
      const url=new URL(location.href);
      item.id==='overview'?url.searchParams.delete('module'):url.searchParams.set('module',item.id);
      history.pushState({module:item.id},'',url);
    }
  }

  async function check(path){
    try{
      const url=new URL(path,location.origin);
      url.searchParams.set('cb',Date.now());
      const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
      let data=null;
      try{data=await response.json();}catch(_){ }
      return{ok:response.ok,status:response.status,data};
    }catch(error){return{ok:false,status:0,error:error.message};}
  }

  function statusCard(label,result,detail){
    const auth=[401,403].includes(result.status);
    const state=result.ok?'ok':auth?'warn':'bad';
    const title=result.ok?'Spremno':auth?'Prijava potrebna':'Nedostupno';
    return`<article class="ac-card ${state}"><small>${label}</small><strong>${title}</strong><p>${detail}</p></article>`;
  }

  async function loadStatus(){
    const [auth,backend,mail,media,health]=await Promise.all([
      check('/api/operator-auth-check'),
      check('/api/operator-backend-status'),
      check('/api/mail-center/status'),
      check('/api/media-command-center/status'),
      check('/data/platform-health.json')
    ]);
    q('acStatus').innerHTML=[
      statusCard('Sesija',auth,'Sigurni pristup'),
      statusCard('Backend',backend,'Operatorske funkcije'),
      statusCard('Mail',mail,'Inbox, Sent i Outbox'),
      statusCard('Mediji',media,'Komandni centar'),
      statusCard('Platforma',health,'KV, D1 i assets')
    ].join('');
    const session=q('acSession');
    session.classList.toggle('ok',auth.ok);
    session.classList.toggle('bad',!auth.ok&&!([401,403].includes(auth.status)));
    q('acSessionText').textContent=auth.ok?'Sigurna sesija aktivna':'Prijava nije potvrđena';
    q('acSessionHint').textContent=auth.ok?'Privatni moduli su dostupni':'Otvorite modul i prijavite se';
  }

  async function logout(){
    try{await fetch('/operator/session/logout',{method:'POST',credentials:'same-origin',cache:'no-store'});}catch(_){ }
    location.href='/admin-center/';
  }

  nav.addEventListener('click',event=>{
    const button=event.target.closest('[data-module]');
    if(button)select(button.dataset.module);
  });
  frame.addEventListener('load',()=>{
    cleanFrame();
    setTimeout(cleanFrame,200);
    loading.hidden=true;
    frame.hidden=false;
  });
  q('acReload').addEventListener('click',()=>{
    if(current==='overview'){loadStatus();return;}
    loading.hidden=false;
    frame.hidden=true;
    const url=new URL(frame.dataset.route||frame.src,location.origin);
    url.searchParams.set('cb',Date.now());
    frame.src=url.pathname+url.search;
  });
  q('acMenu').addEventListener('click',()=>document.body.classList.add('ac-open'));
  q('acClose').addEventListener('click',closeMenu);
  q('acBackdrop').addEventListener('click',closeMenu);
  q('acLogout').addEventListener('click',logout);
  q('acLogoutSide').addEventListener('click',logout);
  addEventListener('popstate',()=>select(new URL(location.href).searchParams.get('module')||'overview',false));
  addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});

  select(new URL(location.href).searchParams.get('module')||'overview',false);
})();
