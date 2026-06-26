(() => {
  'use strict';
  if (window.__GNK_ASG_ADMIN_CENTER_V2__) return;
  window.__GNK_ASG_ADMIN_CENTER_V2__ = true;

  const MODULES = [
    {id:'overview', icon:'⌂', label:'Admin pregled', short:'Kontrolna ploča', desc:'Status sustava, prioriteti i jedinstveni pristup alatima.', route:'/admin-center/'},
    {id:'mail', icon:'✉', label:'Mail Studio', short:'Pošta i potpisi', desc:'Pošiljatelji, pretinci, potpisi, privici i sigurne provjere.', route:'/mail-studio/'},
    {id:'operator', icon:'▣', label:'Operator', short:'Operativni nadzor', desc:'Status, evidencije i operatorske postavke.', route:'/operator-dashboard/'},
    {id:'media', icon:'◎', label:'Medijski centar', short:'Kampanje i mediji', desc:'Medijska baza, kampanje, odobrenja i zaključani kanali.', route:'/media-command-center/'},
    {id:'editor', icon:'✎', label:'Auto Editor', short:'Urednički procesi', desc:'Objave, priprema sadržaja i uredničke kontrole.', route:'/auto-editor/'},
    {id:'news', icon:'◫', label:'News Admin', short:'Vijesti i izvori', desc:'Izvori, vijesti, raspored i urednička kontrola.', route:'/news-admin/'},
    {id:'pdf', icon:'▤', label:'PDF Publisher', short:'Dokumenti', desc:'Službeni dokumenti, PDF objava i evidencija.', route:'/pdf-publisher/'}
  ];
  const STATUS_CHECKS = [
    {id:'session', label:'Sigurna sesija', detail:'Administratorski pristup', path:'/api/operator-auth-check'},
    {id:'backend', label:'Operator backend', detail:'Operativne funkcije', path:'/api/operator-backend-status'},
    {id:'mail', label:'Mail sustav', detail:'Inbox, Sent i Outbox', path:'/api/mail-center/status'},
    {id:'media', label:'Medijski sustav', detail:'Komandni centar', path:'/api/media-command-center/status'},
    {id:'platform', label:'Platforma', detail:'KV, D1 i javni asseti', path:'/data/platform-health.json'}
  ];
  const PRIORITIES = ['mail','operator','media'];
  const $ = id => document.getElementById(id);
  const state = {current:'overview', frameTimer:null, cleanObserver:null, statusTimer:null, toastTimer:null};

  function moduleById(id) { return MODULES.find(item => item.id === id) || MODULES[0]; }
  function closeSidebar() { document.body.classList.remove('sidebar-open'); }
  function openSidebar() { document.body.classList.add('sidebar-open'); }
  function setText(id, value) { const node=$(id); if(node) node.textContent=value; }
  function showToast(message) {
    const toast=$('toast');
    if(!toast) return;
    toast.textContent=message;
    toast.hidden=false;
    clearTimeout(state.toastTimer);
    state.toastTimer=setTimeout(()=>{ toast.hidden=true; },3200);
  }

  function renderNavigation() {
    const nav=$('moduleNav');
    nav.replaceChildren(...MODULES.map((item,index)=>{
      const button=document.createElement('button');
      button.type='button';
      button.dataset.module=item.id;
      button.setAttribute('aria-label',`${item.label}: ${item.desc}`);
      const icon=document.createElement('i');
      icon.className='nav-icon';
      icon.textContent=item.icon;
      const copy=document.createElement('span');
      copy.className='nav-copy';
      const strong=document.createElement('strong');
      strong.textContent=item.label;
      const small=document.createElement('small');
      small.textContent=item.short;
      copy.append(strong,small);
      const key=document.createElement('span');
      key.className='nav-key';
      key.textContent=String(index+1);
      button.append(icon,copy,key);
      return button;
    }));
  }

  function renderPriorities() {
    const grid=$('priorityGrid');
    grid.replaceChildren(...PRIORITIES.map(id=>{
      const item=moduleById(id);
      const button=document.createElement('button');
      button.type='button';
      button.className='priority-card';
      button.dataset.open=item.id;
      const icon=document.createElement('span');
      icon.className='priority-icon';
      icon.textContent=item.icon;
      const copy=document.createElement('span');
      const strong=document.createElement('strong');
      strong.textContent=item.label;
      const small=document.createElement('small');
      small.textContent=item.desc;
      copy.append(strong,small);
      const arrow=document.createElement('span');
      arrow.className='priority-arrow';
      arrow.setAttribute('aria-hidden','true');
      arrow.textContent='›';
      button.append(icon,copy,arrow);
      return button;
    }));
  }

  function renderCommandList(filter='') {
    const list=$('commandList');
    const needle=filter.trim().toLocaleLowerCase('hr');
    const matches=MODULES.filter(item=>`${item.label} ${item.short} ${item.desc}`.toLocaleLowerCase('hr').includes(needle));
    list.replaceChildren(...matches.map(item=>{
      const button=document.createElement('button');
      button.type='button';
      button.dataset.command=item.id;
      const icon=document.createElement('span');
      icon.className='nav-icon';
      icon.textContent=item.icon;
      const copy=document.createElement('span');
      const strong=document.createElement('strong');
      strong.textContent=item.label;
      const small=document.createElement('small');
      small.textContent=item.desc;
      copy.append(strong,small);
      const key=document.createElement('span');
      key.className='nav-key';
      key.textContent='Otvori';
      button.append(icon,copy,key);
      return button;
    }));
  }

  function openCommandPalette() {
    const dialog=$('commandDialog');
    renderCommandList('');
    if(typeof dialog.showModal==='function' && !dialog.open) dialog.showModal();
    requestAnimationFrame(()=>{ $('commandSearch')?.focus(); });
  }
  function closeCommandPalette() {
    const dialog=$('commandDialog');
    if(dialog?.open) dialog.close();
  }

  function updateConnection() {
    const chip=$('connectionChip');
    const online=navigator.onLine;
    chip.classList.toggle('online',online);
    chip.classList.toggle('offline',!online);
    chip.textContent=online?'Mreža dostupna':'Izvan mreže';
  }

  async function requestStatus(item) {
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8000);
    const started=performance.now();
    try {
      const url=new URL(item.path,location.origin);
      url.searchParams.set('cb',Date.now());
      const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json','cache-control':'no-cache'},signal:controller.signal});
      let data=null;
      try { data=await response.json(); } catch (_) {}
      return {...item,ok:response.ok,warn:[401,403].includes(response.status),status:response.status,ms:Math.round(performance.now()-started),data};
    } catch (error) {
      return {...item,ok:false,warn:false,status:0,ms:Math.round(performance.now()-started),error:error?.name==='AbortError'?'Istek vremena':String(error?.message||error)};
    } finally {
      clearTimeout(timeout);
    }
  }

  function statusCard(result) {
    const article=document.createElement('article');
    article.className=`status-card ${result.ok?'ok':result.warn?'warn':'bad'}`;
    const label=document.createElement('small');
    label.textContent=result.label;
    const status=document.createElement('strong');
    status.textContent=result.ok?'Spremno':result.warn?'Prijava':'Nedostupno';
    const detail=document.createElement('span');
    const reason=result.ok?result.detail:result.warn?'Potrebna je sigurna prijava':result.error||`HTTP ${result.status}`;
    detail.textContent=`${reason} · ${result.ms} ms`;
    article.append(label,status,detail);
    return article;
  }

  async function loadStatus({announce=false}={}) {
    const grid=$('statusGrid');
    if(!grid) return;
    grid.setAttribute('aria-busy','true');
    grid.replaceChildren(...STATUS_CHECKS.map(item=>{
      const article=document.createElement('article');
      article.className='status-card';
      const label=document.createElement('small');
      label.textContent=item.label;
      const strong=document.createElement('strong');
      strong.textContent='Provjera…';
      const span=document.createElement('span');
      span.textContent=item.detail;
      article.append(label,strong,span);
      return article;
    }));
    const results=await Promise.all(STATUS_CHECKS.map(requestStatus));
    grid.replaceChildren(...results.map(statusCard));
    grid.setAttribute('aria-busy','false');
    const auth=results.find(item=>item.id==='session');
    const session=$('sessionCard');
    session.classList.toggle('ok',Boolean(auth?.ok));
    session.classList.toggle('bad',Boolean(auth && !auth.ok && !auth.warn));
    setText('sessionText',auth?.ok?'Sigurna sesija aktivna':auth?.warn?'Prijava je potrebna':'Sesija nije dostupna');
    setText('sessionHint',auth?.ok?'Privatni moduli su dostupni':auth?.warn?'Otvorite modul i prijavite se':'Provjerite backend vezu');
    const now=new Intl.DateTimeFormat('hr-HR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date());
    setText('lastCheck',now);
    const ok=results.filter(item=>item.ok).length;
    const warnings=results.filter(item=>item.warn).length;
    const bad=results.length-ok-warnings;
    setText('systemSummary',bad?`${bad} greška${bad===1?'':'e'}`:warnings?`${warnings} traži prijavu`:'Svi ključni servisi spremni');
    if(announce) showToast(`${ok} spremno · ${warnings} traži prijavu · ${bad} grešaka`);
  }

  function stopEmbeddedCleaner() {
    state.cleanObserver?.disconnect();
    state.cleanObserver=null;
  }

  function cleanEmbeddedModule() {
    stopEmbeddedCleaner();
    try {
      const doc=$('moduleFrame').contentDocument;
      if(!doc?.head) return;
      let style=doc.getElementById('gnkAdminCenterEmbeddedV2');
      if(!style) {
        style=doc.createElement('style');
        style.id='gnkAdminCenterEmbeddedV2';
        style.textContent='#gnk-backend-shell,#gnk-admin-module-launcher-v7,#gnk-admin-lock-notice-v7,[data-global-admin-shell],[data-admin-launcher]{display:none!important}html,body{padding-top:0!important;margin-top:0!important}';
        doc.head.appendChild(style);
      }
      const hide=()=>doc.querySelectorAll('#gnk-backend-shell,#gnk-admin-module-launcher-v7,#gnk-admin-lock-notice-v7,[data-global-admin-shell],[data-admin-launcher]').forEach(node=>{node.style.setProperty('display','none','important');});
      hide();
      state.cleanObserver=new MutationObserver(hide);
      state.cleanObserver.observe(doc.documentElement,{childList:true,subtree:true});
      setTimeout(stopEmbeddedCleaner,5000);
    } catch (_) {}
  }

  function setWorkspaceState(mode,message='') {
    const loading=$('workspaceLoading');
    const error=$('workspaceError');
    loading.hidden=mode!=='loading';
    error.hidden=mode!=='error';
    if(message) setText('workspaceErrorText',message);
  }

  function loadFrame(item,force=false) {
    const frame=$('moduleFrame');
    const url=new URL(item.route,location.origin);
    url.searchParams.set('embedded','1');
    url.searchParams.set('hubmodule',item.id);
    const target=url.pathname+url.search;
    setWorkspaceState('loading');
    frame.hidden=true;
    clearTimeout(state.frameTimer);
    state.frameTimer=setTimeout(()=>{
      if(frame.hidden) setWorkspaceState('error','Modul nije završio učitavanje u predviđenom vremenu. Provjerite sesiju ili pokušajte ponovno.');
    },15000);
    if(force || frame.dataset.route!==target) {
      frame.dataset.route=target;
      frame.src=target;
    } else {
      try { frame.contentWindow.location.reload(); }
      catch (_) { frame.src=target; }
    }
  }

  function updateHistory(id,replace=false) {
    const url=new URL(location.href);
    if(id==='overview') url.searchParams.delete('module');
    else url.searchParams.set('module',id);
    history[replace?'replaceState':'pushState']({module:id},'',url);
  }

  function openModule(id,{push=true,force=false}={}) {
    const item=moduleById(id);
    state.current=item.id;
    document.querySelectorAll('#moduleNav [data-module]').forEach(button=>button.classList.toggle('active',button.dataset.module===item.id));
    setText('pageTitle',item.label);
    setText('pageDescription',item.desc);
    const standalone=$('openStandalone');
    standalone.href=item.route;
    standalone.hidden=item.id==='overview';
    $('overviewPanel').classList.toggle('active',item.id==='overview');
    $('workspacePanel').classList.toggle('active',item.id!=='overview');
    if(item.id==='overview') {
      clearTimeout(state.frameTimer);
      stopEmbeddedCleaner();
      $('moduleFrame').hidden=true;
      $('refreshButton').textContent='Provjeri status';
      loadStatus();
    } else {
      $('refreshButton').textContent='Osvježi modul';
      loadFrame(item,force);
    }
    if(push) updateHistory(item.id);
    closeSidebar();
    closeCommandPalette();
  }

  async function logout() {
    try { await fetch('/operator/session/logout',{method:'POST',credentials:'same-origin'}); }
    catch (_) {}
    location.assign('/admin-center/');
  }

  function runFullAudit() {
    const external=$('adminTestAll');
    if(external) external.click();
    else loadStatus({announce:true});
    requestAnimationFrame(()=>document.getElementById('adminHealthPanel')?.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  function bindEvents() {
    $('moduleNav').addEventListener('click',event=>{
      const button=event.target.closest('[data-module]');
      if(button) openModule(button.dataset.module);
    });
    $('priorityGrid').addEventListener('click',event=>{
      const button=event.target.closest('[data-open]');
      if(button) openModule(button.dataset.open);
    });
    $('menuButton').addEventListener('click',openSidebar);
    $('sidebarClose').addEventListener('click',closeSidebar);
    $('backdrop').addEventListener('click',closeSidebar);
    $('commandButton').addEventListener('click',openCommandPalette);
    $('commandSearch').addEventListener('input',event=>renderCommandList(event.target.value));
    $('commandList').addEventListener('click',event=>{
      const button=event.target.closest('[data-command]');
      if(button) openModule(button.dataset.command);
    });
    $('refreshButton').addEventListener('click',()=>{
      if(state.current==='overview') loadStatus({announce:true});
      else openModule(state.current,{push:false,force:true});
    });
    $('heroMail').addEventListener('click',()=>openModule('mail'));
    $('heroAudit').addEventListener('click',runFullAudit);
    $('showAllModules').addEventListener('click',openCommandPalette);
    $('retryModule').addEventListener('click',()=>openModule(state.current,{push:false,force:true}));
    $('logoutButton').addEventListener('click',logout);
    $('logoutSide').addEventListener('click',logout);
    $('moduleFrame').addEventListener('load',()=>{
      clearTimeout(state.frameTimer);
      cleanEmbeddedModule();
      setWorkspaceState('ready');
      $('moduleFrame').hidden=false;
    });
    addEventListener('popstate',()=>{
      const id=new URL(location.href).searchParams.get('module')||'overview';
      openModule(id,{push:false});
    });
    addEventListener('online',()=>{updateConnection();showToast('Mrežna veza je ponovno dostupna.');});
    addEventListener('offline',()=>{updateConnection();showToast('Mrežna veza je prekinuta.');});
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible' && state.current==='overview') loadStatus();
    });
    document.addEventListener('keydown',event=>{
      if((event.ctrlKey||event.metaKey) && event.key.toLowerCase()==='k') { event.preventDefault(); openCommandPalette(); return; }
      if(event.key==='Escape') { closeSidebar(); closeCommandPalette(); return; }
      if(event.altKey && /^[1-7]$/.test(event.key)) { event.preventDefault(); openModule(MODULES[Number(event.key)-1].id); }
    });
  }

  function boot() {
    renderNavigation();
    renderPriorities();
    renderCommandList('');
    bindEvents();
    updateConnection();
    const requested=new URL(location.href).searchParams.get('module')||'overview';
    openModule(requested,{push:false});
    updateHistory(state.current,true);
    state.statusTimer=setInterval(()=>{
      if(document.visibilityState==='visible' && state.current==='overview') loadStatus();
    },60000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();