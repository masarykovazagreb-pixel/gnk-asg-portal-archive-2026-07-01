(()=>{
  'use strict';
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const news=path==='/vijesti'||path==='/news'||path.startsWith('/vijesti/')||path.startsWith('/news/');
  const publications=path==='/objave'||path==='/publications'||path.startsWith('/objave/')||path.startsWith('/publications/');
  if(!news&&!publications)return;

  const en=document.documentElement.lang==='en'||path.startsWith('/publications')||path.startsWith('/news');
  document.body.classList.add('gnk-editorial-v12',news?'gnk-route-news':'gnk-route-publications');
  document.querySelectorAll('body>header:not(.gnk-public-menu-v15):not(.gnk-public-menu-v20),.site-header,.floating-home,.floating-ai').forEach(node=>{
    node.setAttribute('aria-hidden','true');
    node.style.setProperty('display','none','important');
  });

  const main=document.querySelector('main');
  if(main)main.setAttribute('data-editorial-release','V12.2');

  const normalizeImages=()=>document.querySelectorAll(news?'.news-card img':'.card img').forEach(img=>{
    img.loading='lazy';
    img.decoding='async';
    if(!img.alt.trim())img.alt=img.closest(news?'.news-card':'.card')?.querySelector('h2')?.textContent?.trim()||(news?'GNK ASG news':'GNK ASG publication');
  });

  if(publications){
    const cards=[...document.querySelectorAll('.card[data-language]')];
    const expected=en?'EN':'HR';
    cards.forEach(card=>{
      const link=card.querySelector('h2 a')?.getAttribute('href')||'';
      const title=card.querySelector('h2')?.textContent?.replace(/\s+/g,' ').trim()||'';
      const summary=card.querySelector('p')?.textContent?.replace(/\s+/g,' ').trim()||'';
      const wrongLanguage=String(card.dataset.language||'').toUpperCase()!==expected;
      const legacyAktual=/\/objave\/aktual\//i.test(link);
      const malformed=title.length<12||summary.length<45||/\b(uspeh|veštine|preduzet|vesti)\b/i.test(title+' '+summary);
      card.hidden=wrongLanguage||legacyAktual||malformed;
    });

    const visible=cards.filter(card=>!card.hidden);
    const hero=document.querySelector('.hero');
    const heading=hero?.querySelector('h1');
    const lead=hero?.querySelector('.lead');
    if(heading)heading.textContent=en?'Publications and analysis':'Objave i analize';
    if(lead)lead.textContent=en
      ? 'A curated register of verified English-language corporate publications, market analysis and GNK ASG Intelligence Desk content.'
      : 'Odabrani registar provjerenih hrvatskih korporativnih objava, poslovnih analiza i sadržaja GNK ASG Intelligence Deska.';

    const stats=[...document.querySelectorAll('.stat')];
    if(stats[0])stats[0].innerHTML=`${en?'Published':'Objavljeno'}: <strong>${visible.length}</strong>`;
    if(stats[1])stats[1].innerHTML=`${en?'Language':'Jezik'}: <strong>${expected}</strong>`;
    if(stats[2])stats[2].innerHTML=`${en?'Status':'Status'}: <strong>${en?'Verified':'Provjereno'}</strong>`;
    document.querySelector('.filters')?.setAttribute('hidden','');

    const search=document.getElementById('search');
    const applySearch=()=>{
      const query=(search?.value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
      cards.forEach(card=>{
        if(card.dataset.qualityHidden==='1')return;
        const baseHidden=String(card.dataset.language||'').toUpperCase()!==expected||/\/objave\/aktual\//i.test(card.querySelector('h2 a')?.getAttribute('href')||'');
        const hay=(card.dataset.search||card.textContent||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        card.hidden=baseHidden||Boolean(query&&!hay.includes(query));
      });
    };
    cards.forEach(card=>{if(card.hidden)card.dataset.qualityHidden='1'});
    search?.addEventListener('input',applySearch);
  }

  normalizeImages();
  window.addEventListener('load',normalizeImages,{once:true});
  [250,900,2200].forEach(delay=>setTimeout(normalizeImages,delay));
})();
