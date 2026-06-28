// GNK ASG Admin minimum priority · Mail Studio first · 2026-06-28
(() => {
  'use strict';

  const MARKET_SELECTORS=[
    'a[href="/trzista/"]',
    'a[href="/markets/"]',
    'a[href^="/trzista/?"]',
    'a[href^="/markets/?"]',
    '[data-module="trzista"]',
    '[data-module="markets"]',
    '[data-open="trzista"]',
    '[data-open="markets"]',
    '[data-command="trzista"]',
    '[data-command="markets"]'
  ].join(',');

  function removeMarkets(root=document){
    root.querySelectorAll(MARKET_SELECTORS).forEach(node=>node.remove());
  }

  function loadPriorityLayer(){
    if(document.querySelector('script[data-gnk-admin-priority="v1"]'))return;
    const script=document.createElement('script');
    script.src='/assets/admin-minimum-priority-v1.js?v=20260628-v1';
    script.defer=true;
    script.dataset.gnkAdminPriority='v1';
    document.head.appendChild(script);
  }

  function bind(){
    removeMarkets();
    loadPriorityLayer();
    const button=document.getElementById('heroMail');
    if(!button||button.dataset.mailStudioPrimary==='1')return;
    button.dataset.mailStudioPrimary='1';
    button.textContent='Otvori Mail Studio';
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      const target=document.querySelector('#priorityGrid [data-open="mail"],#moduleNav [data-module="mail"]');
      if(target)target.click();
      else location.assign('/admin-center/?module=mail');
    },true);
  }

  const observer=new MutationObserver(()=>removeMarkets());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),5000);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
  [100,400,1000].forEach(delay=>setTimeout(removeMarkets,delay));
})();
