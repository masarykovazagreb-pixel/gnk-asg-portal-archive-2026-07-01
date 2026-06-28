(()=>{
  'use strict';

  const en=document.documentElement.lang==='en';
  const menu=document.querySelector('.index-nav .menu');

  const MARKET_SELECTOR=[
    '.index-nav .menu a[href="/trzista/"]',
    '.index-nav .menu a[href="/markets/"]',
    '.index-nav .menu a[href^="/trzista/?"]',
    '.index-nav .menu a[href^="/markets/?"]'
  ].join(',');

  const apply=()=>{
    document.querySelectorAll(MARKET_SELECTOR).forEach(link=>link.remove());
    if(!menu)return;

    const downloadHref=en?'/en/downloads/':'/downloads/';
    const downloadLabel=en?'PDF CENTRE':'PDF CENTAR';
    let download=[...menu.querySelectorAll('a')].find(link=>
      link.getAttribute('href')==='/downloads/' ||
      link.getAttribute('href')==='/en/downloads/' ||
      /^(pdf\s+(centar|centre)|download\s+(centar|centre))$/i.test(link.textContent.trim())
    );
    if(!download){
      download=document.createElement('a');
      const contact=[...menu.querySelectorAll('a')].find(link=>/contact|kontakt/i.test(link.textContent));
      menu.insertBefore(download,contact||null);
    }
    download.href=downloadHref;
    download.textContent=downloadLabel;

    const admin=[...menu.querySelectorAll('a')].find(link=>
      link.getAttribute('href')==='/mail-studio/' ||
      link.getAttribute('href')==='/admin-center/' ||
      link.getAttribute('href')==='/operator-dashboard/' ||
      /^(admin|mail studio)$/i.test(link.textContent.trim())
    );
    if(admin){
      admin.href='/admin-center/';
      admin.rel='nofollow';
      admin.textContent='ADMIN';
    }
  };

  apply();
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  [50,100,250,600,1200].forEach(delay=>setTimeout(apply,delay));

  if(menu){
    const observer=new MutationObserver(apply);
    observer.observe(menu,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),5000);
  }
})();
