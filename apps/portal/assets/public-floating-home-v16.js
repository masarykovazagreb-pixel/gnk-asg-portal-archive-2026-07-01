(() => {
  'use strict';
  if (window.__GNK_ASG_FLOATING_HOME_V17__) return;
  window.__GNK_ASG_FLOATING_HOME_V17__ = true;

  const path = location.pathname.toLowerCase().replace(/\/+/g, '/');
  const privatePage = ['/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center','/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/auto-editor','/operator','/api'].some(prefix => path === prefix || path.startsWith(prefix + '/'));
  if (privatePage) return;

  const isIndex = path === '/' || path === '/en' || path === '/en/';
  const params = new URLSearchParams(location.search);
  const english = path === '/en' || path.startsWith('/en/') || path.startsWith('/markets') || path.startsWith('/news') || path.startsWith('/publications') || path.startsWith('/automation-status') || ((path.startsWith('/visual-index') || path.startsWith('/app')) && params.get('lang') === 'en');

  const ensureIndexMediaAssets = () => {
    if (!isIndex) return;
    let stylesheet = document.querySelector('link[data-gnk-existing-media="v1"]');
    if (!stylesheet) {
      stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = '/assets/index-existing-media-slots-v1.css?v=20260627-existing-v1';
      stylesheet.dataset.gnkExistingMedia = 'v1';
      document.head.appendChild(stylesheet);
    }
    let script = document.querySelector('script[data-gnk-existing-media="v1"]');
    if (!script) {
      script = document.createElement('script');
      script.src = '/assets/index-existing-media-slots-v1.js?v=20260627-existing-v1';
      script.defer = true;
      script.dataset.gnkExistingMedia = 'v1';
      document.head.appendChild(script);
    }
  };

  const ensureStyle = () => {
    let style = document.getElementById('gnk-floating-home-v16-style');
    if (style) return style;
    style = document.createElement('style');
    style.id = 'gnk-floating-home-v16-style';
    style.textContent = '#gnk-floating-home-v16{position:fixed!important;left:14px!important;right:auto!important;bottom:14px!important;z-index:2147482500!important;display:inline-flex!important;visibility:visible!important;opacity:1!important;align-items:center!important;gap:8px!important;min-height:42px!important;padding:8px 13px!important;border:1px solid #d7aa3c!important;border-radius:999px!important;background:linear-gradient(145deg,#e4ba50,#9b6715)!important;color:#06101d!important;text-decoration:none!important;font:950 10px/1 Arial,sans-serif!important;letter-spacing:.055em!important;text-transform:uppercase!important;box-shadow:0 16px 44px rgba(0,0,0,.42)!important}#gnk-floating-home-v16:hover,#gnk-floating-home-v16:focus-visible{background:linear-gradient(145deg,#ffe397,#c88c24)!important;transform:translateY(-2px)!important;outline:2px solid rgba(255,224,138,.45)!important;outline-offset:2px!important}@media(max-width:620px){#gnk-floating-home-v16{left:9px!important;bottom:9px!important;min-height:38px!important;padding:7px 11px!important;font-size:8.5px!important}}';
    document.head.appendChild(style);
    return style;
  };

  let running = false;
  const install = () => {
    if (running || !document.body) return;
    running = true;
    try {
      let button = document.getElementById('gnk-floating-home-v16');
      if (isIndex) {
        button?.remove();
        ensureIndexMediaAssets();
        return;
      }
      ensureStyle();
      if (!button) {
        button = document.createElement('a');
        button.id = 'gnk-floating-home-v16';
        document.body.appendChild(button);
      }
      button.href = english ? '/en/' : '/';
      button.setAttribute('aria-label', english ? 'Return to Home' : 'Povratak na početnu stranicu');
      button.innerHTML = '<span aria-hidden="true">⌂</span><strong>' + (english ? 'Home' : 'Početna') + '</strong>';
      button.classList.remove('gnk-v13-legacy-hidden');
    } finally {
      running = false;
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
  window.addEventListener('load', install, { once:true });
  [80,250,650,1400,3000,6000,10000].forEach(delay => setTimeout(install, delay));

  let queued = false;
  new MutationObserver(() => {
    if (queued || running) return;
    const button = document.getElementById('gnk-floating-home-v16');
    const style = document.getElementById('gnk-floating-home-v16-style');
    const indexAssetsMissing = isIndex && (!document.querySelector('link[data-gnk-existing-media="v1"]') || !document.querySelector('script[data-gnk-existing-media="v1"]'));
    const needsRepair = isIndex ? Boolean(button) || indexAssetsMissing : (!button || !style || button.classList.contains('gnk-v13-legacy-hidden'));
    if (!needsRepair) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      install();
    });
  }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
