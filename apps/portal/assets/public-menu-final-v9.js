(() => {
  'use strict';

  window.__GNK_ASG_PUBLIC_MENU_DISABLED_V13__ = true;

  const restoreOriginalNavigation = () => {
    document.querySelectorAll('#gnk-asg-premium-header, .gnk-public-injected-header').forEach(element => element.remove());

    if (document.body) {
      document.body.classList.remove('gnk-public-v11', 'gnk-public-v12');
      document.body.style.removeProperty('padding-top');
    }

    document.querySelectorAll('[data-gnk-legacy-navigation="true"]').forEach(element => {
      element.removeAttribute('data-gnk-legacy-navigation');
      if (element.getAttribute('aria-hidden') === 'true') element.removeAttribute('aria-hidden');
    });
  };

  const run = () => {
    restoreOriginalNavigation();
    requestAnimationFrame(restoreOriginalNavigation);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  window.addEventListener('load', run, { once: true });
  [80, 250, 650, 1400, 2800].forEach(delay => setTimeout(run, delay));

  const observer = new MutationObserver(() => {
    if (document.querySelector('#gnk-asg-premium-header, .gnk-public-injected-header')) run();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 10000);
})();
