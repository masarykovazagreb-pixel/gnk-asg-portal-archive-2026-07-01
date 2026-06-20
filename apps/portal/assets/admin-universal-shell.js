(() => {
  if (window.__GNK_ASG_PREVIEW_BOOTSTRAP__) return;
  window.__GNK_ASG_PREVIEW_BOOTSTRAP__ = true;
  function style(href,id){if(document.getElementById(id))return;const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=href;document.head.appendChild(link)}
  function script(src,id){if(document.getElementById(id))return;const node=document.createElement('script');node.id=id;node.defer=true;node.src=src;document.head.appendChild(node)}
  style('/assets/preview-contrast.css?v=20260620-9','gnk-preview-contrast-css');
  style('/assets/preview-floats.css?v=20260620-9','gnk-preview-floats-css');
  style('/assets/preview-discovery.css?v=20260620-9','gnk-preview-discovery-css');
  script('/assets/admin-universal-menu-core.js?v=20260620-9','gnk-admin-menu-core-js');
  script('/assets/preview-navigation-fixes.js?v=20260620-9','gnk-preview-navigation-js');
  script('/assets/preview-content-fixes.js?v=20260620-9','gnk-preview-content-js');
  script('/assets/preview-dedupe-floats.js?v=20260620-9','gnk-preview-dedupe-js');
  script('/assets/preview-group-contrast.js?v=20260620-9','gnk-preview-group-contrast-js');
  script('/assets/preview-asset-contrast.js?v=20260620-9','gnk-preview-asset-contrast-js');
  script('/assets/preview-bpp-integration.js?v=20260620-9','gnk-preview-bpp-js');
  const p=location.pathname.toLowerCase();
  if(p.startsWith('/mail-studio-pro/'))script('/assets/mail-studio-hash-router.js?v=20260620-9','gnk-mail-hash-router-js');
  if(p.startsWith('/legal'))script('/assets/policy-links.js?v=20260620-9','gnk-policy-links-js');
  if(p.startsWith('/operator-dashboard/')||p.startsWith('/operator-mobile/')){
    script('/assets/document-studio-core.js?v=20260620-9','gnk-document-core-js');
    script('/assets/document-studio-panel.js?v=20260620-9','gnk-document-panel-js');
  }
})();
