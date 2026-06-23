(() => {
  'use strict';

  if (window.__GNK_ASG_PUBLIC_SITE_UNIFIED_V6__) return;
  window.__GNK_ASG_PUBLIC_SITE_UNIFIED_V6__ = true;

  const path = location.pathname.toLowerCase();

  const excludedPrefixes = [
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
    '/review'
  ];

  if (excludedPrefixes.some(prefix => path === prefix || path.startsWith(prefix + '/'))) return;

  const isEn =
    path === '/en' ||
    path.startsWith('/en/') ||
    path.startsWith('/markets/') ||
    path.startsWith('/news/') ||
    path.startsWith('/publications/');

  const isHome =
    path === '/' ||
    path === '/index.html' ||
    path === '/en/' ||
    path === '/en/index.html';

  const hrCore = [
    ['Početna','/'],
    ['Profil','/#profil'],
    ['Financije','/#financije'],
    ['Grupa','/#mreza-grupe'],
    ['Tržišta','/trzista/'],
    ['Objave','/objave/'],
    ['Vijesti','/vijesti/'],
    ['Kontakt','/contact/']
  ];

  const enCore = [
    ['Home','/en/'],
    ['Profile','/en/#profil'],
    ['Financials','/en/#financije'],
    ['Group','/en/#mreza-grupe'],
    ['Markets','/markets/'],
    ['Publications','/publications/'],
    ['News','/news/'],
    ['Contact','/en/contact/']
  ];

  const hrFull = [
    ...hrCore,
    ['Media Kit','/media-kit/'],
    ['PDF centar','/downloads/'],
    ['Galerija','/visual-index/'],
    ['AI pomoć','/assistant/'],
    ['Legal','/legal/'],
    ['Mobilna aplikacija','/app/'],
    ['Mail Center','/mail-studio/','nofollow'],
    ['Mobilni Admin','/operator-mobile/','nofollow'],
    ['Admin','/admin-center/','nofollow']
  ];

  const enFull = [
    ...enCore,
    ['Media Kit','/media-kit/'],
    ['PDF centre','/en/downloads/'],
    ['Gallery','/visual-index/'],
    ['AI Help','/assistant/'],
    ['Legal','/en/legal/'],
    ['Mobile App','/app/'],
    ['Mail Center','/mail-studio/','nofollow'],
    ['Mobile Admin','/operator-mobile/','nofollow'],
    ['Admin','/admin-center/','nofollow']
  ];

  const active = href => {
    try {
      const url = new URL(href, location.origin);

      if (url.hash) {
        if (location.pathname !== url.pathname) return false;
        return location.hash === url.hash;
      }

      if (url.pathname === '/' || url.pathname === '/en/') {
        return location.pathname === url.pathname;
      }

      return location.pathname === url.pathname ||
        location.pathname.startsWith(url.pathname);
    } catch {
      return false;
    }
  };

  const makeLinks = items => items.map(([label,href,rel]) => {
    const current = active(href) ? ' aria-current="page"' : '';
    const relation = rel ? ` rel="${rel}"` : '';
    return `<a href="${href}"${current}${relation}>${label}</a>`;
  }).join('');

  const removeLegacy = () => {
    document.querySelectorAll(
      '.gnk-global-float-home,.gnk-global-float-ai,.gnk-asg-full-menu-v2,.gnk-asg-rescue-menu,.gnk-asg-final-menu-wrap'
    ).forEach(node => node.remove());
  };

  const install = () => {
    document.documentElement.dataset.gnkTheme = 'dark';
    localStorage.setItem('gnk-asg-theme','dark');

    document.body.classList.add('gnk-public-v6');

    if (isHome) {
      document.body.classList.add('gnk-public-home-v6');
    }

    removeLegacy();

    const header = document.getElementById('gnk-asg-premium-header');
    const menu = document.getElementById('gnk-asg-premium-menu');
    const drawerMenu = document.getElementById('gnk-asg-drawer-menu');
    const actions = header?.querySelector('.gnk-asg-shell-actions');

    if (!header || !menu || !actions) return false;

    menu.innerHTML = makeLinks(isEn ? enCore : hrCore);

    if (drawerMenu) {
      drawerMenu.innerHTML = makeLinks(isEn ? enFull : hrFull);
    }

    document.getElementById('gnk-asg-theme-toggle')?.remove();

    let language = document.getElementById('gnk-public-language');

    if (!language) {
      language = document.createElement('a');
      language.id = 'gnk-public-language';
      actions.insertBefore(language,document.getElementById('gnk-asg-menu-toggle'));
    }

    language.href = isEn ? '/' : '/en/';
    language.textContent = isEn ? 'HR' : 'EN';
    language.setAttribute('hreflang',isEn ? 'hr' : 'en');

    const menuButton = document.getElementById('gnk-asg-menu-toggle');
    if (menuButton) {
      menuButton.textContent = isEn ? 'Full menu' : 'Puni meni';
    }

    header.dataset.publicUnifiedV6 = '1';
    return true;
  };

  let attempts = 0;

  const timer = setInterval(() => {
    attempts += 1;

    if (install() || attempts >= 100) {
      clearInterval(timer);
    }
  },60);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',install,{once:true});
  } else {
    install();
  }

  window.addEventListener('load',install,{once:true});

  [250,700,1500,3000].forEach(delay => {
    setTimeout(() => {
      install();
      removeLegacy();
    },delay);
  });
})();