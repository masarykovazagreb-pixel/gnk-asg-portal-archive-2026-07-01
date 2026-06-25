(() => {
  'use strict';
  if (window.__GNK_ASG_PUBLIC_MENU_RESTORE_V25__) return;
  window.__GNK_ASG_PUBLIC_MENU_RESTORE_V25__ = true;

  const pathname = location.pathname.replace(/\/+/g, '/');
  const path = pathname.toLowerCase();
  const query = new URLSearchParams(location.search);
  const privatePrefixes = [
    '/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center',
    '/news-admin','/pdf-publisher','/social-share','/wa-center','/review','/auto-editor','/operator','/api'
  ];
  if (privatePrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`))) return;

  const sharedLanguagePage = path.startsWith('/visual-index') || path === '/app' || path.startsWith('/app/');
  const english = (sharedLanguagePage && query.get('lang') === 'en') || path === '/en' || path.startsWith('/en/') ||
    path.startsWith('/markets') || path.startsWith('/news') || path.startsWith('/publications') || path.startsWith('/automation-status');

  const routeClass = (() => {
    if (path === '/' || path === '/en' || path === '/en/') return 'gnk-route-home';
    if (path === '/app' || path.startsWith('/app/')) return 'gnk-route-app';
    if (path.startsWith('/visual-index')) return 'gnk-route-gallery';
    if (path.startsWith('/objave') || path.startsWith('/publications')) return 'gnk-route-publications';
    if (path.startsWith('/vijesti') || path.startsWith('/news')) return 'gnk-route-news';
    if (path.startsWith('/trzista') || path.startsWith('/markets')) return 'gnk-route-markets';
    if (path.startsWith('/contact') || path.startsWith('/en/contact')) return 'gnk-route-contact';
    if (path.startsWith('/legal') || path.startsWith('/en/legal')) return 'gnk-route-legal';
    if (path.startsWith('/assistant') || path.startsWith('/en/assistant')) return 'gnk-route-assistant';
    if (path.startsWith('/downloads') || path.startsWith('/en/downloads')) return 'gnk-route-downloads';
    if (path.startsWith('/status-automatizacije') || path.startsWith('/automation-status')) return 'gnk-route-status';
    return 'gnk-route-public';
  })();

  const restoreOriginalHeader = () => {
    document.querySelectorAll('#gnk-asg-premium-header, .gnk-public-injected-header').forEach(element => element.remove());
    document.getElementById('gnk-public-v15-force-layout')?.remove();

    document.querySelectorAll('.gnk-v13-legacy-hidden').forEach(element => element.classList.remove('gnk-v13-legacy-hidden'));
    document.querySelectorAll('[data-gnk-legacy-navigation="true"]').forEach(element => {
      element.removeAttribute('data-gnk-legacy-navigation');
      if (element.getAttribute('aria-hidden') === 'true') element.removeAttribute('aria-hidden');
    });

    if (document.body) {
      document.body.classList.remove('gnk-public-v11', 'gnk-public-v12');
      document.body.classList.add('gnk-public-v13', routeClass);
      document.body.style.removeProperty('padding-top');
    }
    document.documentElement.classList.add('gnk-public-v13-root');
    document.documentElement.lang = english ? 'en' : 'hr';
  };

  const ensureAiBadge = () => {
    if (!document.body) return;
    let badge = document.getElementById('gnk-ai-badge-v13');
    if (!badge) {
      badge = document.createElement('a');
      badge.id = 'gnk-ai-badge-v13';
      badge.className = 'gnk-v13-ai-badge';
      document.body.appendChild(badge);
    }
    badge.href = english ? '/en/assistant/' : '/assistant/';
    badge.innerHTML = `<i aria-hidden="true"></i><span>${english ? 'AI Help' : 'AI pomoć'}</span>`;
    badge.setAttribute('aria-label', english ? 'Open GNK ASG AI Help' : 'Otvori GNK ASG AI pomoć');
    badge.classList.remove('gnk-v13-legacy-hidden', 'gnk-asg-ai-hidden-duplicate');
  };

  const run = () => {
    restoreOriginalHeader();
    ensureAiBadge();
    requestAnimationFrame(restoreOriginalHeader);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  window.addEventListener('load', run, { once: true });
  [80, 250, 650, 1400, 3000].forEach(delay => setTimeout(run, delay));

  const observer = new MutationObserver(() => {
    if (document.querySelector('#gnk-asg-premium-header, .gnk-public-injected-header, .gnk-v13-legacy-hidden')) run();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-hidden'] });
  setTimeout(() => observer.disconnect(), 12000);
})();
