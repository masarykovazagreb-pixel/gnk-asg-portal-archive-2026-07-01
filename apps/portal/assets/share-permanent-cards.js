(() => {
  'use strict';
  if (window.GNK_PERMANENT_SHARE_CARDS_READY) return;
  window.GNK_PERMANENT_SHARE_CARDS_READY = true;
  const ROUTES = {
    financials: '/podijeli/financije-kartica/',
    grupa: '/podijeli/grupa-kartica/',
    'digital-assets': '/podijeli/trzista-kartica/'
  };
  const full = path => new URL(path, location.origin).href;
  function redirect(control, title, path) {
    if (!control || !path) return;
    const url = full(path);
    const text = encodeURIComponent((title || document.title || 'GNK ASG d.o.o.') + ' — ' + url);
    const linkedIn = control.querySelector('a[href*="linkedin.com/sharing/share-offsite"]');
    const whatsApp = control.querySelector('a[href*="wa.me"]');
    const email = control.querySelector('a[href^="mailto:"]');
    if (linkedIn) linkedIn.href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url);
    if (whatsApp) whatsApp.href = 'https://wa.me/?text=' + text;
    if (email) email.href = 'mailto:?subject=' + encodeURIComponent(title || document.title) + '&body=' + text;
    control.dataset.previewUrl = url;
  }
  function apply() {
    Object.keys(ROUTES).forEach(id => {
      const section = document.getElementById(id);
      if (!section) return;
      const title = section.querySelector('h1,h2,h3');
      const control = section.querySelector('.section-head .gnk-content-share, .live-head .gnk-content-share');
      redirect(control, title && title.textContent.trim(), ROUTES[id]);
    });
    const network = document.querySelector('#networkOverviewVisual .network-overview-share');
    const title = document.querySelector('#networkOverviewVisual h3');
    redirect(network, title && title.textContent.trim(), ROUTES.grupa);
  }
  function init() {
    apply();
    new MutationObserver(apply).observe(document.body, { childList:true, subtree:true });
    document.addEventListener('gnk-overview-mounted', apply);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();