(() => {
  'use strict';

  if (window.__GNK_ASG_PUBLIC_MENU_FINAL_V10__) return;
  window.__GNK_ASG_PUBLIC_MENU_FINAL_V9__ = true;
  window.__GNK_ASG_PUBLIC_MENU_FINAL_V10__ = true;

  const path = location.pathname.toLowerCase();
  const excluded = [
    '/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center',
    '/news-admin','/pdf-publisher','/social-share','/wa-center','/app','/review','/auto-editor'
  ];
  if (excluded.some(prefix => path === prefix || path.startsWith(prefix + '/'))) return;

  const isEn = path === '/en' || path.startsWith('/en/') || path.startsWith('/markets/') ||
    path.startsWith('/news/') || path.startsWith('/publications/') || path.startsWith('/automation-status/');

  const hrLinks = [
    ['Početna','/'],['Profil','/#profil'],['Financije','/#financije'],['Grupa','/#mreza-grupe'],
    ['Tržišta','/trzista/'],['Objave','/objave/'],['Vijesti','/vijesti/'],['PDF / Media','/downloads/'],
    ['Galerija','/visual-index/'],['AI pomoć','/assistant/'],['Kontakt','/contact/'],['Legal','/legal/'],
    ['Status','/status-automatizacije/'],['App','/app/'],['Admin','/operator-dashboard/','protected']
  ];

  const enLinks = [
    ['Home','/en/'],['Profile','/en/#profile'],['Financials','/en/#financials'],['Group','/en/#group-network'],
    ['Markets','/markets/'],['Publications','/publications/'],['News','/news/'],['PDF / Media','/en/downloads/'],
    ['Gallery','/visual-index/'],['AI Help','/en/assistant/'],['Contact','/en/contact/'],['Legal','/en/legal/'],
    ['Status','/automation-status/'],['App','/app/'],['Admin','/operator-dashboard/','protected']
  ];

  const isActive = href => {
    try {
      const url = new URL(href, location.origin);
      if (url.hash) return location.pathname === url.pathname && location.hash === url.hash;
      if (url.pathname === '/' || url.pathname === '/en/') return location.pathname === url.pathname;
      return location.pathname === url.pathname || location.pathname.startsWith(url.pathname);
    } catch { return false; }
  };

  const renderLinks = links => links.map(([label, href, mode]) => {
    if (mode === 'protected') {
      return `<form action="${href}" method="get" class="gnk-protected-nav"><button type="submit" aria-label="${label}">${label}</button></form>`;
    }
    const current = isActive(href) ? ' aria-current="page"' : '';
    return `<a href="${href}"${current}>${label}</a>`;
  }).join('');

  const install = () => {
    const header = document.getElementById('gnk-asg-premium-header');
    const menu = document.getElementById('gnk-asg-premium-menu');
    if (!header || !menu) return false;

    menu.innerHTML = renderLinks(isEn ? enLinks : hrLinks);
    menu.setAttribute('aria-label', isEn ? 'Main navigation' : 'Glavna navigacija');
    menu.querySelectorAll('.gnk-protected-nav').forEach(form => {
      form.style.display = 'inline-flex';
      form.style.margin = '0';
      const button = form.querySelector('button');
      if (button) {
        button.style.cssText = 'display:inline-flex;align-items:center;min-height:34px;padding:8px 10px;border:1px solid transparent;border-radius:10px;background:transparent;color:#eaf0f8;font:800 12px/1 Arial,sans-serif;cursor:pointer';
      }
    });

    document.getElementById('gnk-asg-menu-toggle')?.remove();
    document.getElementById('gnk-asg-theme-toggle')?.remove();
    document.getElementById('gnk-asg-drawer')?.remove();
    document.getElementById('gnk-asg-overlay')?.remove();
    document.body.classList.remove('gnk-asg-menu-open');

    const actions = header.querySelector('.gnk-asg-shell-actions');
    if (actions) {
      let language = document.getElementById('gnk-public-language');
      if (!language) {
        language = document.createElement('a');
        language.id = 'gnk-public-language';
        actions.appendChild(language);
      }
      language.href = isEn ? '/' : '/en/';
      language.textContent = isEn ? 'HR' : 'EN';
      language.setAttribute('hreflang', isEn ? 'hr' : 'en');
      [...actions.children].forEach(child => { if (child.id !== 'gnk-public-language') child.remove(); });
    }

    header.dataset.publicMenuCentered = '10';
    header.dataset.fullMenuVisible = 'true';
    return true;
  };

  const run = () => requestAnimationFrame(install);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  window.addEventListener('load', run, { once: true });
  [60,180,350,800,1600,3200,5000].forEach(delay => setTimeout(run, delay));

  const observer = new MutationObserver(() => {
    const header = document.getElementById('gnk-asg-premium-header');
    if (header && (header.dataset.publicMenuCentered !== '10' || document.getElementById('gnk-asg-menu-toggle'))) run();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
