(()=>{
  'use strict';
  if(window.__GNK_ASG_ADMIN_MODULE_LOADER_V3__)return;
  window.__GNK_ASG_ADMIN_MODULE_LOADER_V3__=true;

  const frame=document.getElementById('moduleFrame');
  const loading=document.getElementById('workspaceLoading');
  const error=document.getElementById('workspaceError');
  const errorText=document.getElementById('workspaceErrorText');
  const retry=document.getElementById('retryModule');
  const standalone=document.getElementById('openStandalone');
  if(!frame||!loading||!error)return;

  let watchdog=null;
  let probeController=null;
  let currentSrc='';
  let loaded=false;
  let failed=false;

  const setState=(mode,message='')=>{
    loading.hidden=mode!=='loading';
    error.hidden=mode!=='error';
    if(message&&errorText)errorText.textContent=message;
  };

  const moduleLabel=()=>document.getElementById('pageTitle')?.textContent?.trim()||'Modul';
  const cleanPath=value=>new URL(value,location.origin).pathname.replace(/\/+$/,'')||'/';

  const ensureStandaloneAction=()=>{
    if(error.querySelector('[data-admin-open-standalone]'))return;
    const button=document.createElement('button');
    button.type='button';
    button.dataset.adminOpenStandalone='1';
    button.textContent='Otvori modul zasebno';
    button.addEventListener('click',()=>{
      const href=standalone?.href||currentSrc;
      if(href)window.open(href,'_blank','noopener');
    });
    error.appendChild(button);
  };

  const stopWatchdog=()=>{
    clearTimeout(watchdog);
    watchdog=null;
    probeController?.abort();
    probeController=null;
  };

  const showReady=()=>{
    if(failed)return;
    loaded=true;
    stopWatchdog();
    frame.hidden=false;
    setState('ready');
  };

  const showFailure=message=>{
    failed=true;
    loaded=false;
    stopWatchdog();
    frame.hidden=false;
    setState('error',message||'Modul nije završio učitavanje. Pokušajte ponovno ili ga otvorite zasebno.');
    ensureStandaloneAction();
  };

  const probe=async src=>{
    probeController?.abort();
    const controller=new AbortController();
    probeController=controller;
    const timeout=setTimeout(()=>controller.abort(),9000);
    try{
      const response=await fetch(src,{credentials:'same-origin',cache:'no-store',redirect:'follow',headers:{accept:'text/html,application/xhtml+xml','cache-control':'no-cache'},signal:controller.signal});
      const type=String(response.headers.get('content-type')||'').toLowerCase();
      if([401,403].includes(response.status)){
        if(!loaded){frame.hidden=false;setState('ready');}
        return;
      }
      if(!response.ok){
        showFailure(`${moduleLabel()} nije dostupan: HTTP ${response.status}.`);
        return;
      }
      if(cleanPath(response.url)!==cleanPath(src)){
        showFailure(`${moduleLabel()} je preusmjeren na drugu stranicu (${cleanPath(response.url)}).`);
        return;
      }
      if(!type.includes('text/html')){
        showFailure(`${moduleLabel()} nije vratio HTML sadržaj.`);
      }
    }catch(errorValue){
      if(errorValue?.name!=='AbortError')showFailure(`${moduleLabel()} nije dostupan: ${errorValue?.message||'mrežna pogreška'}.`);
    }finally{
      clearTimeout(timeout);
    }
  };

  const begin=()=>{
    const src=frame.getAttribute('src');
    if(!src||src==='about:blank')return;
    currentSrc=new URL(src,location.origin).toString();
    loaded=false;
    failed=false;
    stopWatchdog();
    frame.hidden=false;
    setState('loading');
    watchdog=setTimeout(()=>{
      if(!loaded&&!failed)showFailure(`${moduleLabel()} se nije učitao u 12 sekundi. Provjerite sesiju ili otvorite modul zasebno.`);
    },12000);
    probe(currentSrc);
  };

  frame.addEventListener('load',()=>{
    try{
      const doc=frame.contentDocument;
      if(doc?.documentElement||frame.contentWindow)showReady();
      else showFailure(`${moduleLabel()} je otvoren, ali sadržaj nije dostupan.`);
    }catch(_){
      showReady();
    }
  },true);

  frame.addEventListener('error',()=>showFailure(`${moduleLabel()} nije moguće učitati.`),true);

  new MutationObserver(mutations=>{
    if(mutations.some(item=>item.type==='attributes'&&item.attributeName==='src'))begin();
  }).observe(frame,{attributes:true,attributeFilter:['src']});

  retry?.addEventListener('click',()=>setTimeout(begin,0),true);
  window.addEventListener('online',()=>{if(currentSrc&&!loaded)begin();});
  window.addEventListener('beforeunload',stopWatchdog,{once:true});

  if(frame.getAttribute('src'))begin();
})();