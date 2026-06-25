(() => {
  'use strict';

  if (window.__GNK_ASG_PUBLIC_MENU_V13__) return;
  window.__GNK_ASG_PUBLIC_MENU_V13__ = true;

  const pathname = location.pathname.replace(/\/+/g, '/');
  const path = pathname.toLowerCase();
  const query = new URLSearchParams(location.search);
  const privatePrefixes = [
    '/operator-dashboard', '/operator-mobile', '/mail-studio', '/mail-studio-pro', '/admin-center',
    '/news-admin', '/pdf-publisher', '/social-share', '/wa-center', '/review', '/auto-editor',
    '/operator', '/api'
  ];
  if (privatePrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`))) return;

  const sharedLanguagePage = path.startsWith('/visual-index') || path === '/app' || path.startsWith('/app/');
  const english = (sharedLanguagePage && query.get('lang') === 'en') || path === '/en' || path.startsWith('/en/') ||
    path.startsWith('/markets') || path.startsWith('/news') || path.startsWith('/publications') ||
    path.startsWith('/automation-status');

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

  const pairedLanguageUrl = () => {
    if (sharedLanguagePage) {
      const target = new URL(location.href);
      if (english) target.searchParams.delete('lang');
      else target.searchParams.set('lang', 'en');
      return `${target.pathname}${target.search}${target.hash}`;
    }

    const rawQuery = location.search || '';
    const hash = location.hash || '';
    const pairs = [
      [/^\/publications(\/.*)?$/i, m => `/objave${m[1] || '/'}`],
      [/^\/objave(\/.*)?$/i, m => `/publications${m[1] || '/'}`],
      [/^\/news(\/.*)?$/i, m => `/vijesti${m[1] || '/'}`],
      [/^\/vijesti(\/.*)?$/i, m => `/news${m[1] || '/'}`],
      [/^\/markets(\/.*)?$/i, m => `/trzista${m[1] || '/'}`],
      [/^\/trzista(\/.*)?$/i, m => `/markets${m[1] || '/'}`],
      [/^\/automation-status(\/.*)?$/i, m => `/status-automatizacije${m[1] || '/'}`],
      [/^\/status-automatizacije(\/.*)?$/i, m => `/automation-status${m[1] || '/'}`],
      [/^\/en\/downloads(\/.*)?$/i, m => `/downloads${m[1] || '/'}`],
      [/^\/downloads(\/.*)?$/i, m => `/en/downloads${m[1] || '/'}`],
      [/^\/en\/assistant(\/.*)?$/i, m => `/assistant${m[1] || '/'}`],
      [/^\/assistant(\/.*)?$/i, m => `/en/assistant${m[1] || '/'}`],
      [/^\/en\/contact(\/.*)?$/i, m => `/contact${m[1] || '/'}`],
      [/^\/contact(\/.*)?$/i, m => `/en/contact${m[1] || '/'}`],
      [/^\/en\/legal(\/.*)?$/i, m => `/legal${m[1] || '/'}`],
      [/^\/legal(\/.*)?$/i, m => `/en/legal${m[1] || '/'}`],
      [/^\/en\/?$/i, () => '/'],
      [/^\/$/, () => '/en/']
    ];
    for (const [pattern, build] of pairs) {
      const match = pathname.match(pattern);
      if (match) return `${build(match)}${rawQuery}${hash}`;
    }
    return english ? '/' : '/en/';
  };

  const hrItems = [
    ['Profil', '/#profil'], ['Financije', '/#financije'], ['Tržišta', '/trzista/'], ['Objave', '/objave/'],
    ['Vijesti', '/vijesti/'], ['Auto Editor', '/status-automatizacije/'], ['Visual Index', '/visual-index/'],
    ['PDF centar', '/downloads/'], ['AI pomoć', '/assistant/'], ['Kontakt', '/contact/'], ['Legal', '/legal/'],
    ['Admin', '/operator-dashboard/', 'nofollow'], ['App', '/app/']
  ];
  const enItems = [
    ['Profile', '/en/#profile'], ['Financials', '/en/#financials'], ['Markets', '/markets/'], ['Publications', '/publications/'],
    ['News', '/news/'], ['Auto Editor', '/automation-status/'], ['Visual Index', '/visual-index/?lang=en'],
    ['PDF Centre', '/en/downloads/'], ['AI Help', '/en/assistant/'], ['Contact', '/en/contact/'], ['Legal', '/en/legal/'],
    ['Admin', '/operator-dashboard/', 'nofollow'], ['App', '/app/?lang=en']
  ];

  const active = href => {
    try {
      const url = new URL(href, location.origin);
      if (url.hash) return location.pathname === url.pathname && location.hash === url.hash;
      if (url.pathname === '/' || url.pathname === '/en/') return location.pathname === url.pathname;
      if (url.pathname === '/visual-index/' || url.pathname === '/app/') {
        const hrefEnglish = url.searchParams.get('lang') === 'en';
        return location.pathname === url.pathname && hrefEnglish === english;
      }
      return location.pathname === url.pathname || location.pathname.startsWith(url.pathname);
    } catch {
      return false;
    }
  };

  const renderLinks = items => items.map(([label, href, mode]) => {
    const current = active(href) ? ' aria-current="page"' : '';
    const rel = mode === 'nofollow' ? ' rel="nofollow"' : '';
    return `<a href="${href}"${current}${rel}>${label}</a>`;
  }).join('');

  const brandMark = type => `<span class="gnk-v13-brand-mark gnk-v13-brand-mark-${type}" aria-hidden="true"><i></i><i></i><i></i></span>`;

  const installHeader = () => {
    if (!document.body) return false;
    document.body.classList.add('gnk-public-v13', routeClass);
    document.documentElement.classList.add('gnk-public-v13-root');
    document.documentElement.lang = english ? 'en' : 'hr';

    let header = document.getElementById('gnk-asg-premium-header');
    if (!header) {
      header = document.createElement('header');
      header.id = 'gnk-asg-premium-header';
      document.body.prepend(header);
    }

    header.className = 'gnk-v13-header';
    header.dataset.publicMenuVersion = '13';
    header.dataset.language = english ? 'en' : 'hr';
    header.innerHTML = `
      <div class="gnk-v13-brand-row">
        <a class="gnk-v13-brand gnk-v13-brand-left" href="${english ? '/en/' : '/'}" aria-label="GNK ASG">
          ${brandMark('asg')}
          <span><strong>GNK ASG d.o.o.</strong><small>${english ? 'Corporate portal' : 'Korporativni portal'}</small></span>
        </a>
        <div class="gnk-v13-system"><span><i></i>${english ? 'System active' : 'Sustav aktivan'}</span><b>V3.1</b></div>
        <a class="gnk-v13-brand gnk-v13-brand-right" href="${english ? '/en/' : '/'}" aria-label="GNK DINAMO Ltd.">
          ${brandMark('dinamo')}
          <span><strong>GNK DINAMO Ltd.</strong><small>Parent Company · Boulder, Colorado</small></span>
        </a>
        <a id="gnk-public-language" class="gnk-v13-language" href="${pairedLanguageUrl()}" hreflang="${english ? 'hr' : 'en'}" aria-label="${english ? 'Prikaži hrvatsku verziju' : 'Open English version'}">${english ? 'HR' : 'EN'}</a>
      </div>
      <nav id="gnk-asg-premium-menu" class="gnk-v13-menu" aria-label="${english ? 'Main navigation' : 'Glavna navigacija'}">
        ${renderLinks(english ? enItems : hrItems)}
      </nav>`;

    return true;
  };

  const suppressLegacyNavigation = () => {
    document.querySelectorAll([
      'body > header:not(#gnk-asg-premium-header)',
      'body > .site-header',
      '.shell > .brand-head',
      '.shell > .top-nav',
      '.gnk-asg-full-menu-v2',
      '.gnk-asg-rescue-menu',
      '.gnk-asg-final-menu-wrap',
      '#gnk-asg-drawer',
      '#gnk-asg-overlay',
      '#gnk-asg-menu-toggle',
      '#gnk-asg-theme-toggle'
    ].join(',')).forEach(element => element.classList.add('gnk-v13-legacy-hidden'));
  };

  const installAiBadge = () => {
    document.querySelectorAll('.floating-home,.floating-ai,.ai-fab,.assistant-fab,.gnk-asg-ai-fab,#gnk-asg-single-ai-button-anchor').forEach(element => {
      if (element.id !== 'gnk-ai-badge-v13') element.classList.add('gnk-v13-legacy-hidden');
    });
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
  };

  let running = false;
  const run = () => {
    if (running) return;
    running = true;
    try {
      installHeader();
      suppressLegacyNavigation();
      installAiBadge();
    } finally {
      running = false;
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  window.addEventListener('load', run, { once: true });
  [120, 500, 1400, 3000].forEach(delay => setTimeout(run, delay));

  let queued = false;
  new MutationObserver(() => {
    if (queued || running) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const header = document.getElementById('gnk-asg-premium-header');
      if (!header || header.dataset.publicMenuVersion !== '13') run();
      else suppressLegacyNavigation();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
