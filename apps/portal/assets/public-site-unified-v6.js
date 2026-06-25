(() => {
  'use strict';

  if (window.__GNK_ASG_PUBLIC_SITE_UNIFIED_V7__) return;
  window.__GNK_ASG_PUBLIC_SITE_UNIFIED_V7__ = true;

  const path = location.pathname.toLowerCase();
  const excludedPrefixes = [
    '/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center',
    '/news-admin','/pdf-publisher','/social-share','/wa-center','/app','/review','/auto-editor'
  ];
  if (excludedPrefixes.some(prefix => path === prefix || path.startsWith(prefix + '/'))) return;

  const isEn =
    path === '/en' || path.startsWith('/en/') || path.startsWith('/markets/') ||
    path.startsWith('/news/') || path.startsWith('/publications/') || path.startsWith('/automation-status/');

  const isHome = path === '/' || path === '/index.html' || path === '/en/' || path === '/en/index.html';

  const addStyle = (id, href) => {
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  };

  const addScript = (id, src) => {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  };

  const installSupportAssets = () => {
    addStyle('gnk-public-menu-centered-v7','/assets/public-menu-centered-v7.css?v=20260624-menu-center-8');
    addScript('gnk-public-data-stability-v1','/assets/public-data-stability-v1.js?v=20260625-v1');
    if (!isHome) {
      addStyle('gnk-public-content-shell-v1','/assets/public-content-shell-v1.css?v=20260625-v1');
      addScript('gnk-public-content-shell-v1-js','/assets/public-content-shell-v1.js?v=20260625-v1');
    }
  };

  installSupportAssets();

  const hrCore = [
    ['Početna','/'],['Profil','/#profil'],['Financije','/#financije'],['Grupa','/#mreza-grupe'],
    ['Tržišta','/trzista/'],['Objave','/objave/'],['Vijesti','/vijesti/'],['Kontakt','/contact/'],
    ['App','/app/'],['Admin','/operator-dashboard/','protected']
  ];

  const enCore = [
    ['Home','/en/'],['Profile','/en/#profil'],['Financials','/en/#financije'],['Group','/en/#mreza-grupe'],
    ['Markets','/markets/'],['Publications','/publications/'],['News','/news/'],['Contact','/en/contact/'],
    ['App','/app/'],['Admin','/operator-dashboard/','protected']
  ];

  const hrFull = [
    ...hrCore,['Media Kit','/media-kit/'],['PDF centar','/downloads/'],['Galerija','/visual-index/'],
    ['AI pomoć','/assistant/'],['Legal','/legal/'],['Status','/status-automatizacije/'],
    ['Mobilni Admin','/operator-mobile/','protected'],['Admin pregled','/operator-dashboard/','protected'],
    ['Mail Center','/mail-studio/','protected']
  ];

  const enFull = [
    ...enCore,['Media Kit','/media-kit/'],['PDF centre','/en/downloads/'],['Gallery','/visual-index/'],
    ['AI Help','/en/assistant/'],['Legal','/en/legal/'],['Status','/automation-status/'],
    ['Mobile Admin','/operator-mobile/','protected'],['Admin Overview','/operator-dashboard/','protected'],
    ['Mail Center','/mail-studio/','protected']
  ];

  const active = href => {
    try {
      const url = new URL(href, location.origin);
      if (url.hash) return location.pathname === url.pathname && location.hash === url.hash;
      if (url.pathname === '/' || url.pathname === '/en/') return location.pathname === url.pathname;
      return location.pathname === url.pathname || location.pathname.startsWith(url.pathname);
    } catch {
      return false;
    }
  };

  const makeLinks = items => items.map(([label,href,mode]) => {
    if (mode === 'protected') {
      return `<a role="link" tabindex="0" data-protected-route="${href}" aria-label="${label}">${label}</a>`;
    }
    const current = active(href) ? ' aria-current="page"' : '';
    return `<a href="${href}"${current}>${label}</a>`;
  }).join('');

  const removeLegacy = () => {
    document.querySelectorAll('.gnk-global-float-home,.gnk-global-float-ai,.gnk-asg-full-menu-v2,.gnk-asg-rescue-menu,.gnk-asg-final-menu-wrap').forEach(node => node.remove());
  };

  const openProtected = event => {
    const control = event.target.closest('[data-protected-route]');
    if (!control) return;
    if (event.type === 'keydown' && !['Enter',' '].includes(event.key)) return;
    event.preventDefault();
    location.assign(control.getAttribute('data-protected-route'));
  };

  document.addEventListener('click',openProtected);
  document.addEventListener('keydown',openProtected);

  const bindDrawer = () => {
    const menuButton = document.getElementById('gnk-asg-menu-toggle');
    const closeButton = document.getElementById('gnk-asg-drawer-close');
    const overlay = document.getElementById('gnk-asg-overlay');

    if (menuButton) {
      menuButton.textContent = isEn ? 'Full menu' : 'Puni meni';
      menuButton.setAttribute('aria-controls','gnk-asg-drawer');
      menuButton.setAttribute('aria-expanded',document.body.classList.contains('gnk-asg-menu-open') ? 'true' : 'false');
      menuButton.onclick = () => {
        document.body.classList.add('gnk-asg-menu-open');
        menuButton.setAttribute('aria-expanded','true');
      };
    }

    const closeMenu = () => {
      document.body.classList.remove('gnk-asg-menu-open');
      menuButton?.setAttribute('aria-expanded','false');
    };
    if (closeButton) closeButton.onclick = closeMenu;
    if (overlay) overlay.onclick = closeMenu;
  };

  const install = () => {
    installSupportAssets();
    document.documentElement.dataset.gnkTheme = 'dark';
    localStorage.setItem('gnk-asg-theme','dark');
    document.body.classList.add('gnk-public-v7');
    if (isHome) document.body.classList.add('gnk-public-home-v7');
    else document.body.classList.add('gnk-content-page');

    removeLegacy();

    const header = document.getElementById('gnk-asg-premium-header');
    const menu = document.getElementById('gnk-asg-premium-menu');
    const drawerMenu = document.getElementById('gnk-asg-drawer-menu');
    const actions = header?.querySelector('.gnk-asg-shell-actions');
    if (!header || !menu || !actions) return false;

    menu.innerHTML = makeLinks(isEn ? enCore : hrCore);
    if (drawerMenu) drawerMenu.innerHTML = makeLinks(isEn ? enFull : hrFull);
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

    bindDrawer();
    header.dataset.publicUnifiedV7 = '1';
    header.dataset.publicMenuCentered = '8';
    return true;
  };

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (install() || attempts >= 100) clearInterval(timer);
  },60);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  window.addEventListener('load',install,{once:true});
  [250,700,1500,3000].forEach(delay => setTimeout(() => { install(); removeLegacy(); },delay));
})();
