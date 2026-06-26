(()=>{
  'use strict';
  if(window.__GNK_ASG_INDEX_RUNTIME_LOCK_V31__)return;
  window.__GNK_ASG_INDEX_RUNTIME_LOCK_V31__=true;
  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(!['/','/en'].includes(path))return;

  const ensureCss=()=>{
    document.querySelectorAll('link[href*="index-redesign-production.css"]').forEach((link,index)=>{if(index>0)link.remove();});
    let core=[...document.querySelectorAll('link[rel="stylesheet"]')].find(link=>String(link.href).includes('/assets/index-redesign-production.css'));
    if(!core){core=document.createElement('link');core.rel='stylesheet';document.head.prepend(core);}
    core.id='gnk-index-core-v31';
    core.href='/assets/index-redesign-production.css?v=20260626-stable-v31';
    let critical=document.getElementById('gnk-index-critical-v31');
    if(!critical){critical=document.createElement('link');critical.id='gnk-index-critical-v31';critical.rel='stylesheet';document.head.appendChild(critical);}
    critical.href='/assets/index-critical-v31.css?v=20260626-v31';
  };

  const removeLegacy=()=>{
    document.body?.classList.remove('gnk-public-v7','gnk-public-home-v7','gnk-asg-premium-shell');
    document.body?.classList.add('gnk-index-v31','gnk-public-v13','gnk-route-home');
    document.documentElement.classList.add('gnk-public-v13-root');
    document.querySelectorAll('.shell>.brand-head,.shell>.top-nav,.brand-head,.top-nav').forEach(element=>{
      element.setAttribute('aria-hidden','true');
      element.hidden=true;
      element.style.setProperty('display','none','important');
      element.style.setProperty('visibility','hidden','important');
      element.style.setProperty('height','0','important');
      element.style.setProperty('margin','0','important');
      element.style.setProperty('padding','0','important');
    });
    document.querySelectorAll('.gnk-gallery-auto-image').forEach(element=>element.remove());
    document.querySelectorAll('.featured').forEach(element=>{
      if(!element.classList.contains('gnk-media-ready'))element.style.removeProperty('background-image');
    });
  };

  const restoreContent=()=>{
    const main=document.querySelector('main');
    if(!main)return;
    main.querySelectorAll(':scope>.hero,:scope>.trust-strip,:scope>.section').forEach(element=>{
      element.hidden=false;
      element.removeAttribute('aria-hidden');
      element.style.setProperty('visibility','visible','important');
      element.style.setProperty('opacity','1','important');
      element.style.setProperty('height','auto','important');
      element.style.setProperty('max-height','none','important');
      element.style.setProperty('transform','none','important');
      element.style.removeProperty('filter');
    });
    main.querySelectorAll('.profile-grid,.finance-grid,.group-layout,.pdf-grid,.live-grid,.profile-card,.company-card,.map-card,.locations,.expansion,.live-card').forEach(element=>{
      element.hidden=false;
      element.removeAttribute('aria-hidden');
      element.style.setProperty('visibility','visible','important');
      element.style.setProperty('opacity','1','important');
      element.style.setProperty('height','auto','important');
      element.style.setProperty('min-height','0','important');
      element.style.setProperty('max-height','none','important');
      element.style.setProperty('transform','none','important');
    });
  };

  let running=false;
  const lock=()=>{
    if(running||!document.body)return;
    running=true;
    try{ensureCss();removeLegacy();restoreContent();}
    finally{running=false;}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',lock,{once:true});else lock();
  window.addEventListener('load',lock,{once:true});
  [50,150,400,900,1800,3500,7000,12000].forEach(delay=>setTimeout(lock,delay));
  let queued=false;
  new MutationObserver(()=>{
    if(queued||running)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;lock();});
  }).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});
})();
