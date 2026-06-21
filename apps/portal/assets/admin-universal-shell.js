(() => {
  if (window.__GNK_ASG_PREVIEW_BOOTSTRAP__) return;
  window.__GNK_ASG_PREVIEW_BOOTSTRAP__ = true;
  function style(href,id){if(document.getElementById(id))return;const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=href;document.head.appendChild(link)}
  function script(src,id){if(document.getElementById(id))return;const node=document.createElement('script');node.id=id;node.defer=true;node.src=src;document.head.appendChild(node)}
  style('/assets/preview-contrast.css?v=20260621-2','gnk-preview-contrast-css');
  style('/assets/preview-floats.css?v=20260621-1','gnk-preview-floats-css');
  style('/assets/preview-discovery.css?v=20260621-1','gnk-preview-discovery-css');
  style('/assets/portal-language-preference.css?v=20260621-1','gnk-language-preference-css');
  style('/assets/portal-image-lightbox.css?v=20260621-1','gnk-image-lightbox-css');
  style('/assets/portal-video.css?v=20260621-1','gnk-video-css');
  script('/assets/admin-universal-menu-core.js?v=20260621-1','gnk-admin-menu-core-js');
  script('/assets/preview-navigation-fixes.js?v=20260621-1','gnk-preview-navigation-js');
  script('/assets/preview-content-fixes.js?v=20260621-1','gnk-preview-content-js');
  script('/assets/preview-dedupe-floats.js?v=20260621-1','gnk-preview-dedupe-js');
  script('/assets/preview-group-contrast.js?v=20260621-1','gnk-preview-group-contrast-js');
  script('/assets/preview-asset-contrast.js?v=20260621-1','gnk-preview-asset-contrast-js');
  script('/assets/preview-bpp-integration.js?v=20260621-1','gnk-preview-bpp-js');
  script('/assets/portal-language-preference.js?v=20260621-1','gnk-language-preference-js');
  script('/assets/portal-image-lightbox.js?v=20260621-1','gnk-image-lightbox-js');
  script('/assets/video-modal-shell.js?v=20260621-1','gnk-video-modal-js');
  script('/assets/video-player-controls.js?v=20260621-1','gnk-video-controls-js');
  const p=location.pathname.toLowerCase();
  if(['/','/index.html','/en/','/en/index.html'].includes(p))script('/assets/homepage-featured-video.js?v=20260621-1','gnk-homepage-video-js');
  if(p.startsWith('/mail-studio-pro/'))script('/assets/mail-studio-hash-router.js?v=20260621-1','gnk-mail-hash-router-js');
  if(p.startsWith('/legal'))script('/assets/policy-links.js?v=20260621-1','gnk-policy-links-js');
  if(p.startsWith('/trzista/')||p.startsWith('/markets/')){
    style('/assets/market-page.css?v=20260621-1','gnk-market-page-css');
    script('/assets/market-page.js?v=20260621-1','gnk-market-page-js');
  }
  if(p.startsWith('/operator-dashboard/')||p.startsWith('/operator-mobile/')){
    script('/assets/document-studio-core.js?v=20260621-1','gnk-document-core-js');
    script('/assets/document-studio-panel.js?v=20260621-1','gnk-document-panel-js');
  }
  if(p.startsWith('/operator-mobile/')){
    style('/assets/mobile-admin-publisher.css?v=20260621-1','gnk-mobile-publisher-css');
    script('/assets/mobile-admin-publisher.js?v=20260621-1','gnk-mobile-publisher-js');
  }
  style('/assets/final-contrast-contract.css?v=20260621-2','gnk-final-contrast-contract-css');
  script('/assets/final-contrast-enforcer.js?v=20260621-1','gnk-final-contrast-enforcer-js');
})();
