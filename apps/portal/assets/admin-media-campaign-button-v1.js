(() => {
  'use strict';
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (path !== '/admin-center') return;

  const href = 'https://gnk-asg.hr/campaign-mailer/#dashboard';

  const install = () => {
    const grid = document.querySelector('#gnk-admin-module-launcher-v7 .gnk-admin-launcher-grid');
    if (!grid) return false;
    if (grid.querySelector('[data-gnk-media-campaign-button]')) return true;

    const link = document.createElement('a');
    link.href = href;
    link.dataset.gnkMediaCampaignButton = '1';
    link.innerHTML = '<i aria-hidden="true">◈</i><span><strong>Media kampanja</strong><small>Kampanje, primatelji i slanje medijima</small></span>';
    grid.prepend(link);
    return true;
  };

  if (!install()) {
    const observer = new MutationObserver(() => {
      if (install()) observer.disconnect();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    document.addEventListener('DOMContentLoaded',install,{once:true});
    setTimeout(() => observer.disconnect(),10000);
  }
})();
