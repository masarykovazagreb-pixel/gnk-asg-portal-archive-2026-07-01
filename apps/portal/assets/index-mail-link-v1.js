(()=>{
  'use strict';

  const MARKET_SELECTOR=[
    '.index-nav .menu a[href="/trzista/"]',
    '.index-nav .menu a[href="/markets/"]',
    '.index-nav .menu a[href^="/trzista/?"]',
    '.index-nav .menu a[href^="/markets/?"]'
  ].join(',');

  const removeMarkets=()=>{
    document.querySelectorAll(MARKET_SELECTOR).forEach(link=>link.remove());
  };

  const apply=()=>{
    removeMarkets();
    const admin=[...document.querySelectorAll('.index-nav .menu a')].find(link=>
      link.getAttribute('href')==='/mail-studio/' ||
      link.getAttribute('href')==='/admin-center/' ||
      link.textContent.trim().toLowerCase()==='admin'
    );
    if(admin){
      admin.href='/mail-studio/';
      admin.rel='nofollow';
    }
  };

  apply();
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  [50,100,250,600].forEach(delay=>setTimeout(apply,delay));

  const nav=document.querySelector('.index-nav .menu');
  if(nav){
    const observer=new MutationObserver(apply);
    observer.observe(nav,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),4000);
  }
})();
