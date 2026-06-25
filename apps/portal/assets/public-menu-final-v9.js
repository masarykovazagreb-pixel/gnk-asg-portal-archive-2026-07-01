(() => {
  'use strict';

  if (window.__GNK_ASG_PUBLIC_MENU_FINAL_V11__) return;
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

  const ensureHeader = () => {
    let header = document.getElementById('gnk-asg-premium-header');
    if (header) return header;
    if (!document.body) return null;
    header = document.createElement('header');
    header.id = 'gnk-asg-premium-header';
    header.className = 'gnk-asg-premium-header gnk-public-injected-header';
    header.innerHTML = `
      <a class="gnk-asg-brand" href="${isEn ? '/en/' : '/'}" aria-label="GNK ASG">
        <span class="gnk-asg-brand-mark" aria-hidden="true">G</span>
        <span class="gnk-asg-brand-copy"><strong>GNK ASG</strong><small>${isEn ? 'Corporate Portal' : 'Korporativni portal'}</small></span>
      </a>
      <nav id="gnk-asg-premium-menu" aria-label="${isEn ? 'Main navigation' : 'Glavna navigacija'}"></nav>
      <div class="gnk-asg-shell-actions"></div>`;
    document.body.prepend(header);
    return header;
  };

  const install = () => {
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
    document.body.classList.add('gnk-public-v11');

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

    header.dataset.publicMenuVersion = '11';
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
  [120, 450, 1100, 2400].forEach(delay => setTimeout(run, delay));

  const observer = new MutationObserver(() => {
    const header = document.getElementById('gnk-asg-premium-header');
    if (!header || header.dataset.publicMenuVersion !== '11' || !document.getElementById('gnk-public-language')) run();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
