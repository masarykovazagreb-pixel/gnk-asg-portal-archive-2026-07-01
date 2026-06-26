(()=>{
  'use strict';
  if(!/\/visual-index\/?$/.test(location.pathname))return;
  if(window.__GNK_ASG_VISUAL_INDEX_V7_LOADER__)return;
  window.__GNK_ASG_VISUAL_INDEX_V7_LOADER__=true;
  const script=document.createElement('script');
  script.src='/assets/visual-index-central-v7.js?v=20260626-v7';
  script.defer=true;
  script.onerror=()=>{
    const grid=document.getElementById('visualGrid');
    if(grid&&!grid.children.length)grid.innerHTML='<p>Visual Index se trenutačno nije mogao učitati.</p>';
  };
  document.head.appendChild(script);
})();
