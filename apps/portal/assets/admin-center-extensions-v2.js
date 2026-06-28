(()=>{
  'use strict';
  const RELEASE='GNK_ASG_ADMIN_CENTER_EXTENSIONS_V2_20260628';
  if(window.__GNK_ASG_ADMIN_CENTER_EXTENSIONS_V2__===RELEASE)return;
  window.__GNK_ASG_ADMIN_CENTER_EXTENSIONS_V2__=RELEASE;

  const MODULES=[
    {id:'memorandum',icon:'▧',key:'M',label:'Memorandum Studio',short:'PDF i službeni dopisi',desc:'Izrada, pregled i PDF izvoz službenih memoranduma.',route:'/memorandum-studio/'},
    {id:'social',icon:'↗',key:'S',label:'Social Share',short:'Dijeljenje objava',desc:'Priprema i kontrolirano dijeljenje odobrenog sadržaja.',route:'/social-share/'},
    {id:'whatsapp',icon:'◉',key:'W',label:'WhatsApp centar',short:'Poruke i predlošci',desc:'Operativni predlošci i ručno kontrolirane WhatsApp poruke.',route:'/wa-center/'},
    {id:'review',icon:'✓',key:'R',label:'Review Center',short:'Završne provjere',desc:'Kontrola sadržaja, ruta i spremnosti prije objave.',route:'/review/'}
  ];
  const $=id=>document.getElementById(id);
  let active='';
  let syncingCommands=false;
  let commandSignature='';

  function moduleById(id){return MODULES.find(item=>item.id===id)||null;}
  function navButton(item){
    const button=document.createElement('button');
    button.type='button';button.dataset.extensionModule=item.id;button.setAttribute('aria-label',`${item.label}: ${item.desc}`);
    button.innerHTML=`<i class="nav-icon" aria-hidden="true">${item.icon}</i><span class="nav-copy"><strong>${item.label}</strong><small>${item.short}</small></span><span class="nav-key">${item.key}</span>`;
    return button;
  }
  function commandButton(item){
    const button=document.createElement('button');
    button.type='button';button.dataset.extensionCommand=item.id;
    button.innerHTML=`<span class="nav-icon" aria-hidden="true">${item.icon}</span><span><strong>${item.label}</strong><small>${item.desc}</small></span><span class="nav-key">Otvori</span>`;
    return button;
  }
  function matches(item,needle){return !needle||`${item.label} ${item.short} ${item.desc}`.toLocaleLowerCase('hr').includes(needle);}
  function ensureCommands(){
    const list=$('commandList');if(!list||syncingCommands)return;
    const needle=($('commandSearch')?.value||'').trim().toLocaleLowerCase('hr');
    const items=MODULES.filter(item=>matches(item,needle));
    const signature=`${needle}|${items.map(item=>item.id).join(',')}|${list.querySelectorAll('[data-command]').length}`;
    if(signature===commandSignature&&list.querySelectorAll('[data-extension-command]').length===items.length)return;
    syncingCommands=true;commandSignature=signature;
    list.querySelectorAll('[data-extension-command]').forEach(node=>node.remove());
    items.forEach(item=>list.appendChild(commandButton(item)));
    syncingCommands=false;
  }
  function markActive(id){
    document.querySelectorAll('#moduleNav [data-module],#moduleNav [data-custom-module],#moduleNav [data-extension-module]').forEach(button=>button.classList.toggle('active',button.dataset.extensionModule===id));
  }
  function setWorkspaceState(mode,message=''){
    const loading=$('workspaceLoading'),error=$('workspaceError');
    if(loading)loading.hidden=mode!=='loading';
    if(error)error.hidden=mode!=='error';
    if(message&&$('workspaceErrorText'))$('workspaceErrorText').textContent=message;
  }
  function activate(id,{push=true,force=false}={}){
    const item=moduleById(id);if(!item)return;
    active=item.id;document.body.dataset.adminExtensionModule=item.id;markActive(item.id);
    if($('pageTitle'))$('pageTitle').textContent=item.label;
    if($('pageDescription'))$('pageDescription').textContent=item.desc;
    $('overviewPanel')?.classList.remove('active');$('workspacePanel')?.classList.add('active');
    if($('refreshButton'))$('refreshButton').textContent='Osvježi modul';
    const standalone=$('openStandalone');if(standalone){standalone.href=item.route;standalone.hidden=false;}
    const frame=$('moduleFrame');if(!frame)return;
    const target=`${item.route}?embedded=1&hubmodule=${encodeURIComponent(item.id)}`;
    frame.hidden=true;setWorkspaceState('loading');
    if(force||frame.dataset.route!==target){frame.dataset.route=target;frame.src=target;}else{try{frame.contentWindow.location.reload();}catch{frame.src=target;}}
    if(push){const url=new URL(location.href);url.searchParams.set('module',item.id);history.pushState({module:item.id},'',url);}
    document.body.classList.remove('sidebar-open');$('commandDialog')?.close();
  }
  function deactivate(){active='';delete document.body.dataset.adminExtensionModule;}
  function install(){
    const nav=$('moduleNav');
    if(nav&&!nav.querySelector('[data-extension-module]'))MODULES.forEach(item=>nav.appendChild(navButton(item)));
    const foot=document.querySelector('.command-foot');if(foot)foot.textContent='Klik ili Enter za otvaranje · Esc za zatvaranje · Alt + broj ili označeno slovo za brzi pristup';
    nav?.addEventListener('click',event=>{const button=event.target.closest('[data-extension-module]');if(button){event.preventDefault();event.stopImmediatePropagation();activate(button.dataset.extensionModule);return;}if(event.target.closest('[data-module],[data-custom-module]'))deactivate();},true);
    $('commandList')?.addEventListener('click',event=>{const button=event.target.closest('[data-extension-command]');if(button){event.preventDefault();event.stopImmediatePropagation();activate(button.dataset.extensionCommand);}},true);
    $('commandSearch')?.addEventListener('input',()=>queueMicrotask(ensureCommands));
    $('commandButton')?.addEventListener('click',()=>queueMicrotask(ensureCommands));
    if($('commandList'))new MutationObserver(()=>queueMicrotask(ensureCommands)).observe($('commandList'),{childList:true});
    $('refreshButton')?.addEventListener('click',event=>{if(!active)return;event.preventDefault();event.stopImmediatePropagation();activate(active,{push:false,force:true});},true);
    addEventListener('popstate',()=>{const id=new URL(location.href).searchParams.get('module');if(moduleById(id))setTimeout(()=>activate(id,{push:false}),0);else deactivate();});
    document.addEventListener('keydown',event=>{if(!event.altKey)return;const item=MODULES.find(entry=>entry.key.toLowerCase()===event.key.toLowerCase());if(item){event.preventDefault();activate(item.id);}},true);
    ensureCommands();
    const requested=new URL(location.href).searchParams.get('module');if(moduleById(requested))setTimeout(()=>activate(requested,{push:false}),0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
