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

    const pdfHref=en?'/en/downloads/':'/downloads/';
    const pdfLabel=en?'PDF CENTRE':'PDF CENTAR';
    let pdf=[...menu.querySelectorAll('a')].find(link=>
      link.getAttribute('href')===pdfHref || /pdf\s+(centar|centre)/i.test(link.textContent)
    );
    if(!pdf){
      pdf=document.createElement('a');
      pdf.href=pdfHref;
      pdf.textContent=pdfLabel;
      const contact=[...menu.querySelectorAll('a')].find(link=>/contact|kontakt/i.test(link.textContent));
      menu.insertBefore(pdf,contact||null);
    }else{
      pdf.href=pdfHref;
      pdf.textContent=pdfLabel;
    }

    const admin=[...menu.querySelectorAll('a')].find(link=>
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
  [50,100,250,600,1200].forEach(delay=>setTimeout(apply,delay));

  if(menu){
    const observer=new MutationObserver(apply);
    observer.observe(menu,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),5000);
  }
})();
