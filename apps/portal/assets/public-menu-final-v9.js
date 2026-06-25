(() => {
  'use strict';

  if (window.__GNK_ASG_PUBLIC_MENU_FINAL_V12__) return;
  window.__GNK_ASG_PUBLIC_MENU_FINAL_V12__ = true;
  window.__GNK_ASG_PUBLIC_MENU_FINAL_V11__ = true;

  const path = location.pathname.replace(/\/+/g, '/').toLowerCase();
  const excluded = [
    '/operator-dashboard', '/operator-mobile', '/mail-studio', '/mail-studio-pro', '/admin-center',
    '/news-admin', '/pdf-publisher', '/social-share', '/wa-center', '/review', '/auto-editor',
    '/operator', '/api'
  ];
  if (excluded.some(prefix => path === prefix || path.startsWith(`${prefix}/`))) return;

  const isEn = path === '/en' || path.startsWith('/en/') || path.startsWith('/markets') ||
    path.startsWith('/news') || path.startsWith('/publications') || path.startsWith('/automation-status');

  const pairedLanguageUrl = () => {
    const raw = location.pathname;
    const query = location.search || '';
    const hash = location.hash || '';
    const pairs = [
      [/^\/publications(\/.*)?$/i, match => `/objave${match[1] || '/'}`],
      [/^\/objave(\/.*)?$/i, match => `/publications${match[1] || '/'}`],
      [/^\/news(\/.*)?$/i, match => `/vijesti${match[1] || '/'}`],
      [/^\/vijesti(\/.*)?$/i, match => `/news${match[1] || '/'}`],
      [/^\/markets(\/.*)?$/i, match => `/trzista${match[1] || '/'}`],
      [/^\/trzista(\/.*)?$/i, match => `/markets${match[1] || '/'}`],
      [/^\/automation-status(\/.*)?$/i, match => `/status-automatizacije${match[1] || '/'}`],
      [/^\/status-automatizacije(\/.*)?$/i, match => `/automation-status${match[1] || '/'}`],
      [/^\/en\/downloads(\/.*)?$/i, match => `/downloads${match[1] || '/'}`],
      [/^\/downloads(\/.*)?$/i, match => `/en/downloads${match[1] || '/'}`],
      [/^\/en\/assistant(\/.*)?$/i, match => `/assistant${match[1] || '/'}`],
      [/^\/assistant(\/.*)?$/i, match => `/en/assistant${match[1] || '/'}`],
      [/^\/en\/contact(\/.*)?$/i, match => `/contact${match[1] || '/'}`],
      [/^\/contact(\/.*)?$/i, match => `/en/contact${match[1] || '/'}`],
      [/^\/en\/legal(\/.*)?$/i, match => `/legal${match[1] || '/'}`],
      [/^\/legal(\/.*)?$/i, match => `/en/legal${match[1] || '/'}`],
      [/^\/en\/?$/i, () => '/'],
      [/^\/$/, () => '/en/']
    ];
    for (const [pattern, build] of pairs) {
      const match = raw.match(pattern);
      if (match) return `${build(match)}${query}${hash}`;
    }
    return isEn ? '/' : '/en/';
  };

  const primaryHr = [
    ['Početna', '/'], ['Profil', '/#profil'], ['Financije', '/#financije'], ['Tržišta', '/trzista/'],
    ['Objave', '/objave/'], ['Vijesti', '/vijesti/'], ['AI pomoć', '/assistant/'], ['Kontakt', '/contact/']
  ];
  const secondaryHr = [
    ['Grupa', '/#mreza-grupe'], ['PDF / Media', '/downloads/'], ['Galerija', '/visual-index/'],
    ['Legal', '/legal/'], ['Status', '/status-automatizacije/'], ['Aplikacija', '/app/'],
    ['Admin', '/operator-dashboard/', 'nofollow']
  ];
  const primaryEn = [
    ['Home', '/en/'], ['Profile', '/en/#profile'], ['Financials', '/en/#financials'], ['Markets', '/markets/'],
    ['Publications', '/publications/'], ['News', '/news/'], ['AI Help', '/en/assistant/'], ['Contact', '/en/contact/']
  ];
  const secondaryEn = [
    ['Group', '/en/#group-network'], ['PDF / Media', '/en/downloads/'], ['Gallery', '/visual-index/'],
    ['Legal', '/en/legal/'], ['Status', '/automation-status/'], ['App', '/app/'],
    ['Admin', '/operator-dashboard/', 'nofollow']
  ];

  const isActive = href => {
    try {
      const url = new URL(href, location.origin);
      if (url.hash) return location.pathname === url.pathname && location.hash === url.hash;
      if (url.pathname === '/' || url.pathname === '/en/') return location.pathname === url.pathname;
      return location.pathname === url.pathname || location.pathname.startsWith(url.pathname);
    } catch {
      return false;
    }
  };

  const renderLink = ([label, href, mode]) => {
    const current = isActive(href) ? ' aria-current="page"' : '';
    const rel = mode === 'nofollow' ? ' rel="nofollow"' : '';
    return `<a href="${href}"${current}${rel}>${label}</a>`;
  };

  function ensureFavicon() {
    const head = document.head;
    if (!head) return;
    document.querySelectorAll('link[rel~="icon"],link[rel="shortcut icon"]').forEach(link => {
      if (!String(link.href || '').includes('gnk-asg-favicon.svg') && !String(link.href || '').includes('/favicon.ico')) link.remove();
    });
    if (!head.querySelector('link[href*="gnk-asg-favicon.svg"]')) {
      const icon = document.createElement('link');
      icon.rel = 'icon';
      icon.type = 'image/svg+xml';
      icon.href = '/assets/gnk-asg-favicon.svg?v=20260625-v1';
      head.appendChild(icon);
    }
    if (!head.querySelector('link[rel="shortcut icon"]')) {
      const shortcut = document.createElement('link');
      shortcut.rel = 'shortcut icon';
      shortcut.href = '/favicon.ico?v=20260625-v1';
      head.appendChild(shortcut);
    }
  }

  function hideLegacyNavigation() {
    if (!document.body) return;
    document.body.classList.remove('gnk-public-v11');
    document.body.classList.add('gnk-public-v12');

    const candidates = document.querySelectorAll([
      'body > header', 'body > nav', '.brand-head', '.top-nav',
      'header.site-header', 'header.main-header', 'header.portal-header', 'header.public-header',
      'nav.site-nav', 'nav.main-nav', 'nav.navbar', '.legacy-navigation', '.legacy-public-menu'
    ].join(','));

    candidates.forEach(element => {
      if (element.id === 'gnk-asg-premium-header' || element.closest('#gnk-asg-premium-header')) return;
      const isHeader = element.tagName === 'HEADER';
      const isKnown = element.matches('.brand-head,.top-nav,.site-header,.main-header,.portal-header,.public-header,.site-nav,.main-nav,.navbar,.legacy-navigation,.legacy-public-menu');
      if (isHeader && !isKnown && !element.querySelector('nav')) return;
      element.dataset.gnkLegacyNavigation = 'true';
      element.setAttribute('aria-hidden', 'true');
    });

    document.querySelectorAll('#gnk-asg-premium-header').forEach((header, index) => {
      if (index > 0) header.remove();
    });
  }

  const ensureHeader = () => {
    let header = document.getElementById('gnk-asg-premium-header');
    if (header) return header;
    if (!document.body) return null;
    header = document.createElement('header');
    header.id = 'gnk-asg-premium-header';
    header.className = 'gnk-asg-premium-header gnk-public-injected-header';
    header.innerHTML = `
      <a class="gnk-asg-brand" href="${isEn ? '/en/' : '/'}" aria-label="GNK ASG">
        <img src="/assets/gnk-asg-favicon.svg?v=20260625-v1" alt="" width="38" height="38">
        <span class="gnk-asg-brand-copy"><strong>GNK ASG</strong><small>${isEn ? 'Corporate Portal' : 'Korporativni portal'}</small></span>
      </a>
      <nav id="gnk-asg-premium-menu" aria-label="${isEn ? 'Main navigation' : 'Glavna navigacija'}"></nav>
      <div class="gnk-asg-shell-actions"></div>`;
    document.body.prepend(header);
    return header;
  };

  const install = () => {
    ensureFavicon();
    hideLegacyNavigation();
    const header = ensureHeader();
    if (!header) return false;
    let menu = document.getElementById('gnk-asg-premium-menu');
    if (!menu) {
      menu = document.createElement('nav');
      menu.id = 'gnk-asg-premium-menu';
      header.appendChild(menu);
    }

    const primary = isEn ? primaryEn : primaryHr;
    const secondary = isEn ? secondaryEn : secondaryHr;
    menu.innerHTML = `${primary.map(renderLink).join('')}
      <details class="gnk-more-menu">
        <summary>${isEn ? 'More' : 'Više'}<span aria-hidden="true">⌄</span></summary>
        <div class="gnk-more-panel">${secondary.map(renderLink).join('')}</div>
      </details>`;
    menu.setAttribute('aria-label', isEn ? 'Main navigation' : 'Glavna navigacija');

    document.getElementById('gnk-asg-menu-toggle')?.remove();
    document.getElementById('gnk-asg-theme-toggle')?.remove();
    document.getElementById('gnk-asg-drawer')?.remove();
    document.getElementById('gnk-asg-overlay')?.remove();
    document.body.classList.remove('gnk-asg-menu-open');

    let actions = header.querySelector('.gnk-asg-shell-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'gnk-asg-shell-actions';
      header.appendChild(actions);
    }
    actions.innerHTML = '';
    const language = document.createElement('a');
    language.id = 'gnk-public-language';
    language.className = 'gnk-language-pill';
    language.href = pairedLanguageUrl();
    language.textContent = isEn ? 'HR' : 'EN';
    language.setAttribute('hreflang', isEn ? 'hr' : 'en');
    language.setAttribute('aria-label', isEn ? 'Prikaži hrvatsku verziju' : 'Open English version');
    actions.appendChild(language);

    header.dataset.publicMenuVersion = '12';
    header.dataset.fullMenuVisible = 'true';
    return true;
  };

  let queued = false;
  const run = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      install();
    });
  };

  document.addEventListener('click', event => {
    document.querySelectorAll('.gnk-more-menu[open]').forEach(details => {
      if (!details.contains(event.target)) details.removeAttribute('open');
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelectorAll('.gnk-more-menu[open]').forEach(details => details.removeAttribute('open'));
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  window.addEventListener('load', run, { once: true });
  [80, 250, 650, 1400, 2800].forEach(delay => setTimeout(run, delay));

  const observer = new MutationObserver(() => {
    const header = document.getElementById('gnk-asg-premium-header');
    if (!header || header.dataset.publicMenuVersion !== '12' || !document.getElementById('gnk-public-language')) run();
    else hideLegacyNavigation();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
