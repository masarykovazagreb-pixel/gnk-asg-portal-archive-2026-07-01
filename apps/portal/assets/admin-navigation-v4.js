(()=>{
  'use strict';
  if(window.__GNK_ASG_ADMIN_NAVIGATION_V4__)return;
  window.__GNK_ASG_ADMIN_NAVIGATION_V4__=true;

  const EXTRAS=[
    {id:'memorandum',icon:'▧',label:'Memorandum Studio',short:'Memorandumi i PDF',desc:'Službeni memorandumi, višestranični PDF, nacrti i sigurno slanje.',route:'/memorandum-studio/'},
    {id:'mail-pro',icon:'✦',label:'Mail Studio Pro',short:'Napredna pošta',desc:'Napredni profili, predlošci, privici i operativna evidencija slanja.',route:'/mail-studio-pro/'},
    {id:'mobile',icon:'▥',label:'Mobile Admin',short:'Mobilni rad',desc:'Zaštićeni mobilni pristup ključnim administratorskim modulima.',route:'/app/?mode=admin'},
    {id:'social',icon:'↗',label:'Social Share',short:'Dijeljenje sadržaja',desc:'Priprema i distribucija odobrenih javnih objava prema društvenim kanalima.',route:'/social-share/'},
    {id:'whatsapp',icon:'◉',label:'WhatsApp Center',short:'WhatsApp operacije',desc:'Kontrolirana priprema poruka i evidencija WhatsApp komunikacije.',route:'/wa-center/'},
    {id:'review',icon:'✓',label:'Review',short:'Kontrola i odobrenje',desc:'Završna provjera sadržaja, dokumenata i operativnih stavki prije objave.',route:'/review/'}
  ];
  const byId=id=>EXTRAS.find(item=>item.id===id);
  const $=id=>document.getElementById(id);
  let timer=null;

  function navButton(item,index){
    const button=document.createElement('button');
    button.type='button';button.dataset.extraModule=item.id;button.setAttribute('aria-label',`${item.label}: ${item.desc}`);
    const icon=document.createElement('i');icon.className='nav-icon';icon.textContent=item.icon;
    const copy=document.createElement('span');copy.className='nav-copy';
    const strong=document.createElement('strong');strong.textContent=item.label;
    const small=document.createElement('small');small.textContent=item.short;
    copy.append(strong,small);
    const key=document.createElement('span');key.className='nav-key';key.textContent=String(index+8);
    button.append(icon,copy,key);return button;
  }

  function commandButton(item){
    const button=document.createElement('button');button.type='button';button.dataset.extraCommand=item.id;
    const icon=document.createElement('span');icon.className='nav-icon';icon.textContent=item.icon;
    const copy=document.createElement('span');
    const strong=document.createElement('strong');strong.textContent=item.label;
    const small=document.createElement('small');small.textContent=item.desc;
    copy.append(strong,small);
    const action=document.createElement('span');action.className='nav-key';action.textContent='Otvori';
    button.append(icon,copy,action);return button;
  }

  function addNavigation(){
    const nav=$('moduleNav');if(!nav)return;
    EXTRAS.forEach((item,index)=>{if(!nav.querySelector(`[data-extra-module="${item.id}"]`))nav.appendChild(navButton(item,index));});
  }

  function addPriority(){
    const grid=$('priorityGrid');if(!grid||grid.querySelector('[data-extra-open="memorandum"]'))return;
    const item=byId('memorandum');
    const button=document.createElement('button');button.type='button';button.className='priority-card';button.dataset.extraOpen=item.id;
    const icon=document.createElement('span');icon.className='priority-icon';icon.textContent=item.icon;
    const copy=document.createElement('span');const strong=document.createElement('strong');strong.textContent=item.label;const small=document.createElement('small');small.textContent=item.desc;copy.append(strong,small);
    const arrow=document.createElement('span');arrow.className='priority-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='›';
    button.append(icon,copy,arrow);grid.appendChild(button);
  }

  function appendCommands(){
    const list=$('commandList');const input=$('commandSearch');if(!list)return;
    const needle=(input?.value||'').trim().toLocaleLowerCase('hr');
    list.querySelectorAll('[data-extra-command]').forEach(node=>node.remove());
    EXTRAS.filter(item=>`${item.label} ${item.short} ${item.desc}`.toLocaleLowerCase('hr').includes(needle)).forEach(item=>list.appendChild(commandButton(item)));
  }

  function setWorkspace(mode,message=''){
    const loading=$('workspaceLoading'),error=$('workspaceError');
    if(loading)loading.hidden=mode!=='loading';if(error)error.hidden=mode!=='error';
    if(message&&$('workspaceErrorText'))$('workspaceErrorText').textContent=message;
  }

  function openExtra(id,{push=true}={}){
    const item=byId(id);if(!item)return;
    document.querySelectorAll('#moduleNav [data-module],#moduleNav [data-extra-module]').forEach(button=>button.classList.toggle('active',button.dataset.extraModule===id));
    if($('pageTitle'))$('pageTitle').textContent=item.label;
    if($('pageDescription'))$('pageDescription').textContent=item.desc;
    const standalone=$('openStandalone');if(standalone){standalone.href=item.route;standalone.hidden=false;}
    $('overviewPanel')?.classList.remove('active');$('workspacePanel')?.classList.add('active');
    const frame=$('moduleFrame');if(frame){const url=new URL(item.route,location.origin);url.searchParams.set('embedded','1');url.searchParams.set('hubmodule',item.id);setWorkspace('loading');frame.hidden=false;frame.dataset.route=url.pathname+url.search;frame.src=url.pathname+url.search;}
    if($('refreshButton'))$('refreshButton').textContent='Osvježi modul';
    document.body.classList.remove('sidebar-open');
    const dialog=$('commandDialog');if(dialog?.open)dialog.close();
    if(push){const url=new URL(location.href);url.searchParams.set('module',item.id);history.pushState({module:item.id},'',url);}
  }

  function bind(){
    document.addEventListener('click',event=>{
      const target=event.target.closest('[data-extra-module],[data-extra-command],[data-extra-open]');
      if(!target)return;
      event.preventDefault();event.stopImmediatePropagation();
      openExtra(target.dataset.extraModule||target.dataset.extraCommand||target.dataset.extraOpen);
    },true);
    $('commandButton')?.addEventListener('click',()=>setTimeout(appendCommands,0));
    $('commandSearch')?.addEventListener('input',()=>setTimeout(appendCommands,0));
    window.addEventListener('popstate',()=>{const id=new URL(location.href).searchParams.get('module');if(byId(id))setTimeout(()=>openExtra(id,{push:false}),0);});
  }

  function apply(){addNavigation();addPriority();const id=new URL(location.href).searchParams.get('module');if(byId(id))openExtra(id,{push:false});}
  function boot(){bind();[0,80,240,800].forEach(delay=>setTimeout(apply,delay));timer=setTimeout(()=>{clearTimeout(timer);apply();},1800);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
