(() => {
  'use strict';
  const route = location.pathname.replace(/\/+$/, '') || '/';
  if (route !== '/' && route !== '/en') return;
  if (window.__GNK_ASG_INDEX_BOOTSTRAP_LOADER_V3__) return;
  window.__GNK_ASG_INDEX_BOOTSTRAP_LOADER_V3__ = true;

  const load = src => {
    if ([...document.scripts].some(script => script.src && script.src.includes(src))) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset.gnkIndexFinancialDesk = 'v1';
    document.head.appendChild(script);
  };

  load('/assets/index-financial-desk-v1.js?v=20260707-financial-desk-v1');
})();
