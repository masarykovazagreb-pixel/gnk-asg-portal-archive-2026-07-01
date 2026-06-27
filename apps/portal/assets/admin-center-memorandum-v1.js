(()=>{
  'use strict';
  if(window.__GNK_ADMIN_MEMORANDUM_V1__)return;
  window.__GNK_ADMIN_MEMORANDUM_V1__=true;
  const requested=new URL(location.href).searchParams.get('module');
  const MODULE={id:'memorandum',icon:'▧',label:'Memorandum Studio',short:'PDF i službeni dopisi',desc:'Izrada, pregled, PDF izvoz i sigurno slanje memoranduma.',route:'/memorandum-studio/'};
  let active=false;
  const $=id=>document.getElementById(id);
  function navButton(){
    const button=document.createElement('button');button.type='button';button.dataset.customModule=MODULE.id;button.setAttribute('aria-label',`${MODULE.label}: ${MODULE.desc}`);button.innerHTML=`<i class="nav-icon">${MODULE.icon}</i><span class="nav-copy"><strong>${MODULE.label}</strong><small>${MODULE.short}</small></span><span class="nav-key">8</span>`;return button;
  }
  function priorityButton(){
    const button=document.createElement('button');button.type='button';button.className='priority-card';button.dataset.customOpen=MODULE.id;button.innerHTML=`<span class="priority-icon">${MODULE.icon}</span><span><strong>${MODULE.label}</strong><small>${MODULE.desc}</small></span><span class="priority-arrow" aria-hidden="true">›</span>`;return button;
  }
  function commandButton(){
    const button=document.createElement('button');button.type='button';button.dataset.customCommand=MODULE.id;button.innerHTML=`<span class="nav-icon">${MODULE.icon}</span><span><strong>${MODULE.label}</strong><small>${MODULE.desc}</small></span><span class="nav-key">Otvori</span>`;return button;
  }
  function ensureCommand(){
    const list=$('commandList'),search=$('commandSearch');if(!list||list.querySelector('[data-custom-command]'))return;
    const needle=(search?.value||'').trim().toLocaleLowerCase('hr'),haystack=`${MODULE.label} ${MODULE.short} ${MODULE.desc}`.toLocaleLowerCase('hr');if(!needle||haystack.includes(needle))list.appendChild(commandButton());
  }
  function activate({push=true,force=false}={}){
    active=true;document.body.dataset.adminCustomModule=MODULE.id;
    document.querySelectorAll('#moduleNav [data-module],#moduleNav [data-custom-module]').forEach(button=>button.classList.toggle('active',button.dataset.customModule===MODULE.id));
    $('pageTitle').textContent=MODULE.label;$('pageDescription').textContent=MODULE.desc;$('overviewPanel').classList.remove('active');$('workspacePanel').classList.add('active');$('refreshButton').textContent='Osvježi modul';
    const standalone=$('openStandalone');standalone.href=MODULE.route;standalone.hidden=false;
    const frame=$('moduleFrame'),target=`${MODULE.route}?embedded=1&hubmodule=${MODULE.id}`;frame.hidden=true;$('workspaceLoading').hidden=false;$('workspaceError').hidden=true;
    if(force||frame.dataset.route!==target){frame.dataset.route=target;frame.src=target}else{try{frame.contentWindow.location.reload()}catch(_){frame.src=target}}
    if(push){const url=new URL(location.href);url.searchParams.set('module',MODULE.id);history.pushState({module:MODULE.id},'',url)}
    document.body.classList.remove('sidebar-open');$('commandDialog')?.close();
  }
  function deactivate(){active=false;delete document.body.dataset.adminCustomModule}
  function install(){
    const nav=$('moduleNav');if(nav&&!nav.querySelector('[data-custom-module]'))nav.appendChild(navButton());
    const priorities=$('priorityGrid');if(priorities&&!priorities.querySelector('[data-custom-open]'))priorities.appendChild(priorityButton());
    const foot=document.querySelector('.command-foot');if(foot)foot.textContent='Enter ili klik za otvaranje · Esc za zatvaranje · Alt + 1–8 za brzi pristup';
    nav?.addEventListener('click',event=>{const custom=event.target.closest('[data-custom-module]');if(custom){event.preventDefault();event.stopImmediatePropagation();activate();return}if(event.target.closest('[data-module]'))deactivate()},true);
    priorities?.addEventListener('click',event=>{const custom=event.target.closest('[data-custom-open]');if(custom){event.preventDefault();event.stopImmediatePropagation();activate()}},true);
    $('commandList')?.addEventListener('click',event=>{const custom=event.target.closest('[data-custom-command]');if(custom){event.preventDefault();event.stopImmediatePropagation();activate()}},true);
    $('commandSearch')?.addEventListener('input',()=>setTimeout(ensureCommand,0));
    $('commandButton')?.addEventListener('click',()=>setTimeout(ensureCommand,0));
    const observer=new MutationObserver(()=>ensureCommand());if($('commandList'))observer.observe($('commandList'),{childList:true});
    $('refreshButton')?.addEventListener('click',event=>{if(!active)return;event.preventDefault();event.stopImmediatePropagation();activate({push:false,force:true})},true);
    addEventListener('popstate',()=>{const id=new URL(location.href).searchParams.get('module');if(id===MODULE.id)setTimeout(()=>activate({push:false}),0);else deactivate()});
    document.addEventListener('keydown',event=>{if(event.altKey&&event.key==='8'){event.preventDefault();activate()}},true);
    ensureCommand();if(requested===MODULE.id)setTimeout(()=>activate({push:false}),0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
