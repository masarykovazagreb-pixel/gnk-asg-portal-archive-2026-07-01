(()=>{
  'use strict';
  if(!/\/visual-index\/?$/.test(location.pathname))return;
  if(window.__GNK_ASG_VISUAL_INDEX_V7_LOADER__)return;
  window.__GNK_ASG_VISUAL_INDEX_V7_LOADER__=true;

  const invalidSrc=value=>{
    const src=String(value||'').trim().toLowerCase();
    return !src||/news-fallback\.svg|placeholder|favicon|logo|crest|badge|emblem/.test(src);
  };

  function cleanVisualCards(){
    const grid=document.getElementById('visualGrid');
    if(!grid)return;
    grid.querySelectorAll('.item').forEach(card=>{
      const img=card.querySelector('img');
      const link=card.querySelector('a[href]');
      const src=String(img?.src||img?.getAttribute('src')||'').trim();
      const href=String(link?.href||'').trim();
      if(!img||invalidSrc(src)||src===href||(img.complete&&img.naturalWidth===0)){
        card.remove();
        return;
      }
      if(img.dataset.visualCleanupBound!=='1'){
        img.dataset.visualCleanupBound='1';
        img.addEventListener('error',()=>card.remove(),{once:true});
      }
    });
  }

  function installCleanup(){
    cleanVisualCards();
    const root=document.getElementById('visualGrid')||document.body;
    const observer=new MutationObserver(cleanVisualCards);
    observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
    window.addEventListener('load',cleanVisualCards,{once:true});
    setTimeout(cleanVisualCards,500);
    setTimeout(cleanVisualCards,2000);
  }

  const script=document.createElement('script');
  script.src='/assets/visual-index-central-v7.js?v=20260626-v7';
  script.defer=true;
  script.onload=installCleanup;
  script.onerror=()=>{
    const grid=document.getElementById('visualGrid');
    if(grid&&!grid.children.length)grid.innerHTML='<p>Visual Index se trenutačno nije mogao učitati.</p>';
  };
  document.head.appendChild(script);
})();
