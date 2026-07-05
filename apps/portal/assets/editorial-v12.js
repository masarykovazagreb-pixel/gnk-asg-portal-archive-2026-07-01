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
  if(main)main.setAttribute('data-editorial-release','V12.3');

  const normalizeImages=()=>document.querySelectorAll(news?'.news-card img':'.card img').forEach(img=>{
    img.loading='lazy';
    img.decoding='async';
    if(!img.alt.trim())img.alt=img.closest(news?'.news-card':'.card')?.querySelector('h2')?.textContent?.trim()||(news?'GNK ASG news':'GNK ASG publication');
  });

  if(publications){
    const cards=[...document.querySelectorAll('.card[data-language]')];
    const expected=en?'EN':'HR';
    const stats=[...document.querySelectorAll('.stat')];
    const updateStats=()=>{
      const visible=cards.filter(card=>!card.hidden);
      if(stats[0])stats[0].innerHTML=`${en?'Published':'Objavljeno'}: <strong>${visible.length}</strong>`;
      if(stats[1])stats[1].innerHTML=`${en?'Language':'Jezik'}: <strong>${expected}</strong>`;
      if(stats[2])stats[2].innerHTML=`${en?'Status':'Status'}: <strong>${en?'Verified':'Provjereno'}</strong>`;
    };
    cards.forEach(card=>{
      const link=card.querySelector('h2 a')?.getAttribute('href')||'';
      const title=card.querySelector('h2')?.textContent?.replace(/\s+/g,' ').trim()||'';
      const summary=card.querySelector('p')?.textContent?.replace(/\s+/g,' ').trim()||'';
      const wrongLanguage=String(card.dataset.language||'').toUpperCase()!==expected;
      const legacyAktual=/\/objave\/aktual\//i.test(link);
      const malformed=title.length<12||summary.length<45||/\b(uspeh|veštine|preduzet|vesti)\b/i.test(title+' '+summary);
      card.hidden=wrongLanguage||legacyAktual||malformed;
      if(card.hidden)card.dataset.qualityHidden='1';
    });

    const hero=document.querySelector('.hero');
    const heading=hero?.querySelector('h1');
    const lead=hero?.querySelector('.lead');
    if(heading)heading.textContent=en?'Publications and analysis':'Objave i analize';
    if(lead)lead.textContent=en
      ? 'A curated register of verified English-language corporate publications, market analysis and GNK ASG Intelligence Desk content.'
      : 'Odabrani registar provjerenih hrvatskih korporativnih objava, poslovnih analiza i sadržaja GNK ASG Intelligence Deska.';
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
      updateStats();
    };
    search?.addEventListener('input',applySearch);

    const normalizeRoute=value=>{
      try{
        const url=new URL(value,location.origin);
        return url.pathname.replace(/\/+$/,'')+'/';
      }catch{return'';}
    };
    const validateRoutes=async()=>{
      try{
        const response=await fetch('/data/objave-unified.json',{cache:'no-store',headers:{accept:'application/json'}});
        if(!response.ok)throw new Error(`route registry ${response.status}`);
        const payload=await response.json();
        const rows=Array.isArray(payload)?payload:Array.isArray(payload?.items)?payload.items:[];
        const allowed=new Set(rows.map(item=>normalizeRoute(item?.url||item?.slug||'')).filter(Boolean));
        cards.forEach(card=>{
          if(card.dataset.qualityHidden==='1')return;
          const route=normalizeRoute(card.querySelector('h2 a')?.getAttribute('href')||'');
          if(route&&!allowed.has(route)){
            card.hidden=true;
            card.dataset.qualityHidden='1';
            card.dataset.routeIntegrity='missing';
          }
        });
        document.documentElement.dataset.publicationRouteIntegrity='verified';
      }catch{
        document.documentElement.dataset.publicationRouteIntegrity='registry-unavailable';
      }
      updateStats();
    };

    updateStats();
    validateRoutes();
  }

  normalizeImages();
  window.addEventListener('load',normalizeImages,{once:true});
  [250,900,2200].forEach(delay=>setTimeout(normalizeImages,delay));
})();