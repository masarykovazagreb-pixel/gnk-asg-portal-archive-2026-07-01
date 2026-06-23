(() => {
  'use strict';

  if (window.__GNK_ASG_PUBLIC_MENU_FINAL_V9__) return;
  window.__GNK_ASG_PUBLIC_MENU_FINAL_V9__ = true;

  const path = location.pathname.toLowerCase();
  const excluded = [
    '/operator-dashboard',
    '/operator-mobile',
    '/mail-studio',
    '/mail-studio-pro',
    '/admin-center',
    '/news-admin',
    '/pdf-publisher',
    '/social-share',
    '/wa-center',
    '/app',
    '/review',
    '/auto-editor'
  ];

  if (excluded.some(prefix => path === prefix || path.startsWith(prefix + '/'))) return;

  const isEn =
    path === '/en' ||
    path.startsWith('/en/') ||
    path.startsWith('/markets/') ||
    path.startsWith('/news/') ||
    path.startsWith('/publications/');

  const hrLinks = [
    ['Početna','/'],
    ['Profil','/#profil'],
    ['Financije','/#financije'],
    ['Grupa','/#mreza-grupe'],
    ['Tržišta','/trzista/'],
    ['Objave','/objave/'],
    ['Vijesti','/vijesti/'],
    ['PDF / Media','/downloads/'],
    ['Galerija','/visual-index/'],
    ['AI pomoć','/assistant/'],
    ['Kontakt','/contact/'],
    ['Legal','/legal/'],
    ['App','/app/'],
    ['Mobilni Admin','/operator-mobile/','nofollow'],
    ['Admin','/operator-dashboard/','nofollow'],
    ['Mail Center','/mail-studio/','nofollow']
  ];

  const enLinks = [
    ['Home','/en/'],
    ['Profile','/en/#profil'],
    ['Financials','/en/#financije'],
    ['Group','/en/#mreza-grupe'],
    ['Markets','/markets/'],
    ['Publications','/publications/'],
    ['News','/news/'],
    ['PDF / Media','/en/downloads/'],
    ['Gallery','/visual-index/'],
    ['AI Help','/assistant/'],
    ['Contact','/en/contact/'],
    ['Legal','/en/legal/'],
    ['App','/app/'],
    ['Mobile Admin','/operator-mobile/','nofollow'],
    ['Admin','/operator-dashboard/','nofollow'],
    ['Mail Center','/mail-studio/','nofollow']
  ];

  const isActive = href => {
    try {
      const url = new URL(href,location.origin);
      if (url.hash) return location.pathname === url.pathname && location.hash === url.hash;
      if (url.pathname === '/' || url.pathname === '/en/') return location.pathname === url.pathname;
      return location.pathname === url.pathname || location.pathname.startsWith(url.pathname);
    } catch {
      return false;
    }
  };

  const renderLinks = links => links.map(([label,href,rel]) => {
    const current = isActive(href) ? ' aria-current="page"' : '';
    const relation = rel ? ` rel="${rel}"` : '';
    return `<a href="${href}"${current}${relation}>${label}</a>`;
  }).join('');

  const install = () => {
    const header = document.getElementById('gnk-asg-premium-header');
    const menu = document.getElementById('gnk-asg-premium-menu');
    if (!header || !menu) return false;

    menu.innerHTML = renderLinks(isEn ? enLinks : hrLinks);
    menu.setAttribute('aria-label',isEn ? 'Main navigation' : 'Glavna navigacija');

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
      language.setAttribute('hreflang',isEn ? 'hr' : 'en');
      [...actions.children].forEach(child => {
        if (child.id !== 'gnk-public-language') child.remove();
      });
    }

    header.dataset.publicMenuCentered = '9';
    header.dataset.fullMenuVisible = 'true';
    return true;
  };

  const run = () => requestAnimationFrame(install);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',run,{once:true});
  } else {
    run();
  }

  window.addEventListener('load',run,{once:true});
  [60,180,350,800,1600,3200,5000].forEach(delay => setTimeout(run,delay));

  const observer = new MutationObserver(() => {
    const header = document.getElementById('gnk-asg-premium-header');
    if (header && (header.dataset.publicMenuCentered !== '9' || document.getElementById('gnk-asg-menu-toggle'))) {
      run();
    }
  });

  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
