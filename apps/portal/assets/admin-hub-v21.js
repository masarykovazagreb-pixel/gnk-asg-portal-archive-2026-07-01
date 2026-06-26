(() => {
  'use strict';
  const modules=[
    {id:'overview',label:'Admin',icon:'⚙',title:'Admin pregled',description:'Status privatnog sustava i pristup svim operativnim modulima.',route:'/admin-center/'},
    {id:'media',label:'Mediji · Komandni centar',icon:'◎',title:'Medijski komandni centar',description:'Globalna baza medija, kampanje, prijave, dokumenti i ljudsko odobrenje.',route:'/media-command-center/'},
    {id:'operator',label:'Operator',icon:'▣',title:'Operator centar',description:'Status, konfiguracija, inbox, potpisi, evidencije i operativne postavke.',route:'/operator-dashboard/',tab:'status'},
    {id:'mail',label:'Mail Studio',icon:'✉',title:'Mail Studio',description:'Funkcionalni Mail centar + PDF iz Operatorskog modula.',route:'/operator-dashboard/',standalone:'/mail-studio/',tab:'mail'},
    {id:'editor',label:'Auto Editor',icon:'✎',title:'Auto Editor',description:'Upravljanje objavama i automatiziranim uredničkim procesima.',route:'/auto-editor/'},
    {id:'news',label:'News Admin',icon:'◫',title:'News Admin',description:'Izvori, vijesti i urednička kontrola.',route:'/news-admin/'},
    {id:'pdf',label:'PDF Publisher',icon:'▤',title:'PDF Publisher',description:'Dokumenti, PDF objava i evidencija.',route:'/pdf-publisher/'},
    {id:'social',label:'Social Share',icon:'↗',title:'Social Share',description:'Priprema sadržaja za komunikacijske kanale.',route:'/social-share/'},
    {id:'whatsapp',label:'WhatsApp',icon:'◉',title:'WhatsApp centar',description:'Privatni WhatsApp operativni modul.',route:'/wa-center/'},
    {id:'mobile',label:'Mobilni Admin',icon:'▯',title:'Mobilni Admin',description:'Administratorski prikaz za mobilne uređaje.',route:'/operator-mobile/'}
  ];
  const q=id=>document.getElementById(id);
  const byId=id=>modules.find(item=>item.id===id)||modules[0];
  const nav=q('gnkHubNav'),frame=q('gnkHubFrame'),loading=q('gnkHubLoading');
  let current='overview';

  nav.innerHTML=modules.map(item=>`<button type="button" data-module="${item.id}"><i>${item.icon}</i><span>${item.label}</span></button>`).join('');
  q('gnkHubCards').innerHTML=modules.filter(item=>item.id!=='overview').map(item=>`<article class="gnk-hub-card"><small>${item.label}</small><strong>${item.title}</strong><p>${item.description}</p><button type="button" data-open="${item.id}">Otvori modul →</button></article>`).join('');

  function embedded(item){const url=new URL(item.route,location.origin);url.searchParams.set('embedded','1');url.searchParams.set('hubmodule',item.id);return url.pathname+url.search;}
  function activateFrameTab(){
    const item=byId(current);if(!item.tab)return;
    try{
      const doc=frame.contentDocument;if(!doc)return;
      const buttons=[...doc.querySelectorAll('button')];
      const target=buttons.find(button=>(button.getAttribute('onclick')||'').includes(`tab('${item.tab}'`))||((button.textContent||'').toLowerCase().includes(item.tab==='mail'?'mail centar':'status')));
      target?.click();
    }catch(_){}
  }
  function select(id,push=true){
    const item=byId(id);current=item.id;
    nav.querySelectorAll('button').forEach(button=>button.classList.toggle('active',button.dataset.module===item.id));
    q('gnkHubTitle').textContent=item.title;q('gnkHubDescription').textContent=item.description;q('gnkHubStandalone').href=item.standalone||item.route;
    if(item.id==='overview'){
      q('gnkHubOverview').classList.add('active');q('gnkHubModule').classList.remove('active');frame.hidden=true;loading.hidden=false;
    }else{
      q('gnkHubOverview').classList.remove('active');q('gnkHubModule').classList.add('active');q('gnkHubModuleTitle').textContent=item.title;q('gnkHubModuleHint').textContent=item.description;
      const target=embedded(item);loading.hidden=false;frame.hidden=true;
      if(frame.dataset.route!==target){frame.dataset.route=target;frame.src=target;}else{loading.hidden=true;frame.hidden=false;activateFrameTab();}
    }
    if(push){const url=new URL(location.href);item.id==='overview'?url.searchParams.delete('module'):url.searchParams.set('module',item.id);history.pushState({module:item.id},'',url);}
  }
  nav.addEventListener('click',event=>{const button=event.target.closest('[data-module]');if(button)select(button.dataset.module);});
  document.addEventListener('click',event=>{const button=event.target.closest('[data-open]');if(button)select(button.dataset.open);});
  frame.addEventListener('load',()=>{loading.hidden=true;frame.hidden=false;setTimeout(activateFrameTab,100);setTimeout(activateFrameTab,500);});
  q('gnkHubReload').addEventListener('click',()=>{if(current==='overview')return;loading.hidden=false;frame.hidden=true;const url=new URL(frame.dataset.route||frame.src,location.origin);url.searchParams.set('cb',Date.now());frame.src=url.pathname+url.search;});
  addEventListener('popstate',()=>select(new URL(location.href).searchParams.get('module')||'overview',false));

  async function check(path){
    try{
      const url=new URL(path,location.origin);url.searchParams.set('cb',Date.now());
      const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
      let data=null;try{data=await response.json();}catch{}
      return{ok:response.ok,status:response.status,data};
    }catch(error){return{ok:false,status:0,error:error.message};}
  }
  async function loadStatus(){
    const [auth,backend,media,version]=await Promise.all([
      check('/api/operator-auth-check'),check('/api/operator-backend-status'),check('/api/media-command-center/status'),check('/data/portal-version.json')
    ]);
    q('gnkHubStatus').innerHTML=[['Sesija',auth.ok],['Backend',backend.ok],['Medijski centar',media.ok],['Portal',version.ok]].map(([label,ok])=>`<span class="${ok?'ok':'warn'}">${label}: ${ok?'OK':'PROVJERI'}</span>`).join('');
    const system=[
      ['Prijava',auth.ok?'Aktivna':'Nije potvrđena',auth.data?.mode||'HttpOnly / token'],
      ['Backend',backend.ok?'Spreman':'Nedostupan',backend.data?.authLayer||String(backend.status)],
      ['Medijski centar',media.ok?'Spreman':'Provjeri',media.data?.version||String(media.status)],
      ['Slanje kampanje','Zaključano','423 production_sending_locked']
    ];
    q('gnkHubCards').insertAdjacentHTML('afterbegin',system.map(([a,b,c])=>`<article class="gnk-hub-card"><small>${a}</small><strong>${b}</strong><p>${c}</p></article>`).join(''));
  }
  select(new URL(location.href).searchParams.get('module')||'overview',false);
  loadStatus();
})();