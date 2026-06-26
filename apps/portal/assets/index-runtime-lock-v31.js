(()=>{
  'use strict';
  const VERSION='2026-06-26-v31-stable2';
  if(window.__GNK_ASG_INDEX_RUNTIME_LOCK_V31__===VERSION)return;
  window.__GNK_ASG_INDEX_RUNTIME_LOCK_V31__=VERSION;

  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(!['/','/en'].includes(path))return;

  const CORE='/assets/index-redesign-production.css?v=20260626-stable-v31';
  const CRITICAL='/assets/index-critical-v31.css?v=20260626-v31';
  const status=window.GNK_ASG_INDEX_RUNTIME_STATUS={version:VERSION,runs:0,mutationRuns:0,lastRun:0};
  let running=false;
  let queued=false;

  const setImportant=(element,property,value)=>{
    if(element.style.getPropertyValue(property)===value&&element.style.getPropertyPriority(property)==='important')return;
    element.style.setProperty(property,value,'important');
  };

  const ensureCss=()=>{
    const coreLinks=[...document.querySelectorAll('link[href*="index-redesign-production.css"]')];
    const core=coreLinks.shift()||document.createElement('link');
    coreLinks.forEach(link=>link.remove());
    if(!core.isConnected){core.rel='stylesheet';document.head.prepend(core);}
    if(core.id!=='gnk-index-core-v31')core.id='gnk-index-core-v31';
    if(core.getAttribute('href')!==CORE)core.setAttribute('href',CORE);

    let critical=document.getElementById('gnk-index-critical-v31');
    if(!critical){critical=document.createElement('link');critical.id='gnk-index-critical-v31';critical.rel='stylesheet';document.head.appendChild(critical);}
    if(critical.getAttribute('href')!==CRITICAL)critical.setAttribute('href',CRITICAL);
  };

  const removeLegacy=()=>{
    const body=document.body;
    if(!body)return;
    ['gnk-public-v7','gnk-public-home-v7','gnk-asg-premium-shell'].forEach(name=>body.classList.contains(name)&&body.classList.remove(name));
    ['gnk-index-v31','gnk-public-v13','gnk-route-home'].forEach(name=>!body.classList.contains(name)&&body.classList.add(name));
    if(!document.documentElement.classList.contains('gnk-public-v13-root'))document.documentElement.classList.add('gnk-public-v13-root');

    document.querySelectorAll('.shell>.brand-head,.shell>.top-nav,.brand-head,.top-nav').forEach(element=>{
      if(element.getAttribute('aria-hidden')!=='true')element.setAttribute('aria-hidden','true');
      if(!element.hidden)element.hidden=true;
      setImportant(element,'display','none');
      setImportant(element,'visibility','hidden');
      setImportant(element,'height','0px');
      setImportant(element,'margin','0px');
      setImportant(element,'padding','0px');
    });

    document.querySelectorAll('.gnk-gallery-auto-image').forEach(element=>element.remove());
    document.querySelectorAll('.featured').forEach(element=>{
      if(!element.classList.contains('gnk-media-ready')&&element.style.getPropertyValue('background-image'))element.style.removeProperty('background-image');
    });
  };

  const restoreContent=()=>{
    const main=document.querySelector('main');
    if(!main)return;
    main.querySelectorAll(':scope>.hero,:scope>.trust-strip,:scope>.section').forEach(element=>{
      if(element.hidden)element.hidden=false;
      if(element.hasAttribute('aria-hidden'))element.removeAttribute('aria-hidden');
      setImportant(element,'visibility','visible');
      setImportant(element,'opacity','1');
      setImportant(element,'height','auto');
      setImportant(element,'max-height','none');
      setImportant(element,'transform','none');
      if(element.style.getPropertyValue('filter'))element.style.removeProperty('filter');
    });
    main.querySelectorAll('.profile-grid,.finance-grid,.group-layout,.pdf-grid,.live-grid,.profile-card,.company-card,.map-card,.locations,.expansion,.live-card').forEach(element=>{
      if(element.hidden)element.hidden=false;
      if(element.hasAttribute('aria-hidden'))element.removeAttribute('aria-hidden');
      setImportant(element,'visibility','visible');
      setImportant(element,'opacity','1');
      setImportant(element,'height','auto');
      setImportant(element,'min-height','0px');
      setImportant(element,'max-height','none');
      setImportant(element,'transform','none');
    });
  };

  const lock=(source='scheduled')=>{
    if(running||!document.body)return;
    running=true;
    try{
      ensureCss();
      removeLegacy();
      restoreContent();
      status.runs+=1;
      if(source==='mutation')status.mutationRuns+=1;
      status.lastRun=Date.now();
    }finally{running=false;}
  };

  const queueLock=(source='mutation')=>{
    if(queued||running)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;lock(source);});
  };

  const addedObserver=new MutationObserver(records=>{
    const relevant=records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&(
      node.matches?.('.brand-head,.top-nav,.gnk-gallery-auto-image,#gnk-asg-premium-header,main')||
      node.querySelector?.('.brand-head,.top-nav,.gnk-gallery-auto-image,#gnk-asg-premium-header,main')
    )));
    if(relevant)queueLock('mutation');
  });
  addedObserver.observe(document.documentElement,{subtree:true,childList:true});

  const start=()=>{
    lock('startup');
    const body=document.body;
    if(body){
      new MutationObserver(()=>{
        if(/\b(?:gnk-public-v7|gnk-public-home-v7|gnk-asg-premium-shell)\b/.test(body.className)||!body.classList.contains('gnk-index-v31'))queueLock('mutation');
      }).observe(body,{attributes:true,attributeFilter:['class']});
    }
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('load',()=>lock('load'),{once:true});
  [250,1000,3000].forEach(delay=>setTimeout(()=>lock('scheduled'),delay));
})();
