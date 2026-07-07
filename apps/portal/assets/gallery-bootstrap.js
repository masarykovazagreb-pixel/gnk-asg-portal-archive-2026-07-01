(() => {
  'use strict';
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (path !== '/' && path !== '/en') return;
  if (window.__GNK_ASG_INDEX_FINAL_LOADER_V1__) return;
  window.__GNK_ASG_INDEX_FINAL_LOADER_V1__ = true;

  const load = src => new Promise(resolve => {
    try {
      if ([...document.scripts].some(script => script.src && script.src.includes(src))) return resolve(false);
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    } catch (_) {
      resolve(false);
    }
  });

  load('/assets/index-final-runtime-v1.js?v=20260708-final-front-backend-token');
})();
