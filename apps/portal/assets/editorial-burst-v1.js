(()=>{
  'use strict';
  if(window.__GNK_ASG_EDITORIAL_BURST_V1__)return;
  window.__GNK_ASG_EDITORIAL_BURST_V1__=true;
  const END='2026-06-29T21:59:59.000Z';
  const active=Date.now()<=Date.parse(END);
  const apply=()=>{
    const hero=document.querySelector('.hero');
    if(hero&&!document.getElementById('editorialBurstNotice')){
      const notice=document.createElement('div');
      notice.id='editorialBurstNotice';
      notice.className='notice';
      notice.style.marginTop='16px';
      notice.textContent=active
        ?'Privremeno popunjavanje je aktivno: najmanje 10 dvojezičnih objava i provjerena objava svaka 2 sata do 29. lipnja 2026. Nakon toga sustav se vraća na nadzor i ručno odobravanje.'
        :'Privremeno popunjavanje je završeno. Auto Editor priprema nacrte i prati objave, a javna objava ponovno zahtijeva ručno odobrenje.';
      hero.appendChild(notice);
    }
    const automation=[...document.querySelectorAll('.panel.full .lead')].find(node=>/Izvori se povlače|svaka dva sata/i.test(node.textContent||''));
    if(automation){
      automation.textContent=active
        ?'Izvori se osvježavaju prema rasporedu. Do 29. lipnja 2026. sustav svaka dva sata priprema i objavljuje samo dvojezičan sadržaj koji prođe provjeru izvora, minimalne duljine i odobrenog GNK ASG vizuala.'
        :'Izvori se osvježavaju prema rasporedu. Sustav svaka dva sata provjerava stanje objava; novi sadržaj ostaje nacrt do ručne potvrde.';
    }
    const run=document.getElementById('runMonitor');
    if(run)run.textContent=active?'Pokreni dvosatnu provjeru':'Provjeri objave';
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  window.addEventListener('load',apply,{once:true});
})();
