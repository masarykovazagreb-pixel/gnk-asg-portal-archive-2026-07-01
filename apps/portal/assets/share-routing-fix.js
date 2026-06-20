(() => {
  'use strict';
  if (window.GNK_SHARE_ROUTING_READY) return;
  window.GNK_SHARE_ROUTING_READY = true;
  const SECTIONS = {
    financials: '/podijeli/financije/',
    grupa: '/podijeli/grupa-kartica/',
    technology: '/podijeli/tehnologija/',
    'digital-assets': '/podijeli/trzista-kartica/',
    news: '/podijeli/vijesti/',
    dokumenti: '/podijeli/dokumenti/'
  };
  const absolute = path => new URL(path, location.origin).href;
  function apply(control, title, destination) {
    if (!control || !destination) return;
    const url = absolute(destination);
    const text = encodeURIComponent((title || document.title || 'GNK ASG d.o.o.') + ' — ' + url);
    const linkedIn = control.querySelector('a[href*="linkedin.com/sharing/share-offsite"]');
    const whatsApp = control.querySelector('a[href*="wa.me"]');
    const email = control.querySelector('a[href^="mailto:"]');
    if (linkedIn) linkedIn.href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url);
    if (whatsApp) whatsApp.href = 'https://wa.me/?text=' + text;
    if (email) email.href = 'mailto:?subject=' + encodeURIComponent(title || document.title) + '&body=' + text;
    control.dataset.previewUrl = url;
  }
  function repair() {
    Object.keys(SECTIONS).forEach(id => {
      const section = document.getElementById(id);
      if (!section) return;
      const head = section.querySelector('.section-head, .live-head');
      const title = section.querySelector('h1,h2,h3');
      apply(head && head.querySelector('.gnk-content-share'), title && title.textContent.trim(), SECTIONS[id]);
    });
    const overview = document.querySelector('#networkOverviewVisual .network-overview-share');
    const overviewTitle = document.querySelector('#networkOverviewVisual h3');
    apply(overview, overviewTitle && overviewTitle.textContent.trim(), '/podijeli/grupa-kartica/');
    document.querySelectorAll('article.news-card[data-share-url],article.topic-news[data-share-url],article.news-item[data-share-url]').forEach(card => {
      const heading = card.querySelector('h1,h2,h3,h4');
      apply(card.querySelector('.gnk-content-share'), heading && heading.textContent.trim(), card.dataset.shareUrl);
    });
  }
  function init() {
    repair();
    new MutationObserver(repair).observe(document.body, { childList:true, subtree:true });
    document.addEventListener('gnk-overview-mounted', repair);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();