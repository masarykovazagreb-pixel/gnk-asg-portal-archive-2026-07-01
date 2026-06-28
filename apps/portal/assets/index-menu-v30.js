(()=>{
  'use strict';
  if(window.__GNK_INDEX_MENU_V30__)return;
  window.__GNK_INDEX_MENU_V30__=true;
  document.body.dataset.gnkIndexPolish='v30';

  const removeMarkets=()=>{
    document.querySelectorAll('nav a, .menu a, .index-nav a').forEach(link=>{
      const href=(link.getAttribute('href')||'').trim().toLowerCase();
      const label=(link.textContent||'').trim().toLowerCase();
      const isMarketHref=/\/(trzista|markets)\/?(?:[?#].*)?$/.test(href);
      const isMarketLabel=label==='tržišta'||label==='trzista'||label==='markets';
      if(isMarketHref||isMarketLabel)link.remove();
    });
  };

  removeMarkets();
  const observer=new MutationObserver(removeMarkets);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('load',removeMarkets,{once:true});
  setTimeout(()=>observer.disconnect(),20000);
})();
