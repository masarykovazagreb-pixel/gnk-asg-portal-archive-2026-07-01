(() => {
  'use strict';
  if (window.__GNK_ASG_GALLERY_BOOTSTRAP__) return;
  window.__GNK_ASG_GALLERY_BOOTSTRAP__ = true;

  const route = location.pathname.replace(/\/+$/, '') || '/';

  // The public index uses only its pre-existing layout fields.
  // Never create an additional THE CODE or visual section on the index.
  if (route === '/' || route === '/en') {
    document.querySelectorAll('main > #the-code-index, main > .gnk-code-slot').forEach(element => element.remove());
    return;
  }

  const run = async () => {
    if (!window.GNK_ASG_GALLERY) {
      await new Promise((resolve,reject) => {
        const script=document.createElement('script');
        script.src='/assets/gallery-engine.js?v=20260626-v2';
        script.onload=resolve;
        script.onerror=reject;
        document.head.appendChild(script);
      }).catch(() => {});
    }
    if (window.GNK_ASG_GALLERY && !/\/visual-index\/?$/.test(location.pathname)) {
      window.GNK_ASG_GALLERY.apply(document).catch(() => {});
    }
  };

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded',run,{once:true})
    : run();
})();
