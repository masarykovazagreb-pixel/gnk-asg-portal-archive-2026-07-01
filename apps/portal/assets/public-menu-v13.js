(() => {
  'use strict';
  if (window.__GNK_ASG_PUBLIC_MENU_V16__) return;
  window.__GNK_ASG_PUBLIC_MENU_V16__ = true;
  window.__GNK_ASG_PUBLIC_MENU_V15__ = true;
  window.__GNK_ASG_PUBLIC_MENU_V13__ = true;

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

  const pairedLanguageUrl = () => {
    if (sharedLanguagePage) {
      const target = new URL(location.href);
      target.searchParams.delete('cb');
      if (english) target.searchParams.delete('lang'); else target.searchParams.set('lang','en');
      return `${target.pathname}${target.search}${target.hash}`;
    }
    const cleanQuery = new URLSearchParams(location.search);
    cleanQuery.delete('cb');
    const suffix = cleanQuery.toString() ? `?${cleanQuery}` : '';
    const hash = location.hash || '';
    const pairs = [
      [/^\/publications(\/.*)?$/i,m=>`/objave${m[1]||'/'}`],[/^\/objave(\/.*)?$/i,m=>`/publications${m[1]||'/'}`],
      [/^\/news(\/.*)?$/i,m=>`/vijesti${m[1]||'/'}`],[/^\/vijesti(\/.*)?$/i,m=>`/news${m[1]||'/'}`],
      [/^\/markets(\/.*)?$/i,m=>`/trzista${m[1]||'/'}`],[/^\/trzista(\/.*)?$/i,m=>`/markets${m[1]||'/'}`],
      [/^\/automation-status(\/.*)?$/i,m=>`/status-automatizacije${m[1]||'/'}`],[/^\/status-automatizacije(\/.*)?$/i,m=>`/automation-status${m[1]||'/'}`],
      [/^\/en\/downloads(\/.*)?$/i,m=>`/downloads${m[1]||'/'}`],[/^\/downloads(\/.*)?$/i,m=>`/en/downloads${m[1]||'/'}`],
      [/^\/en\/assistant(\/.*)?$/i,m=>`/assistant${m[1]||'/'}`],[/^\/assistant(\/.*)?$/i,m=>`/en/assistant${m[1]||'/'}`],
      [/^\/en\/contact(\/.*)?$/i,m=>`/contact${m[1]||'/'}`],[/^\/contact(\/.*)?$/i,m=>`/en/contact${m[1]||'/'}`],
      [/^\/en\/legal(\/.*)?$/i,m=>`/legal${m[1]||'/'}`],[/^\/legal(\/.*)?$/i,m=>`/en/legal${m[1]||'/'}`],
      [/^\/en\/?$/i,()=>'/'],[/^\/$/,()=>'/en/']
    ];
    for (const [pattern,build] of pairs) {
      const match = pathname.match(pattern);
      if (match) return `${build(match)}${suffix}${hash}`;
    }
    return english ? '/' : '/en/';
  };

  const hrItems = [
    ['Profil','/#profil'],['Financije','/#financije'],['Tržišta','/trzista/'],['Objave','/objave/'],['Vijesti','/vijesti/'],
    ['Auto Editor','/status-automatizacije/'],['Visual Index','/visual-index/'],['PDF centar','/downloads/'],['AI pomoć','/assistant/'],
    ['Kontakt','/contact/'],['Legal','/legal/'],['Admin','/operator-dashboard/','nofollow'],['App','/app/']
  ];
  const enItems = [
    ['Profile','/en/#profile'],['Financials','/en/#financials'],['Markets','/markets/'],['Publications','/publications/'],['News','/news/'],
    ['Auto Editor','/automation-status/'],['Visual Index','/visual-index/?lang=en'],['PDF Centre','/en/downloads/'],['AI Help','/en/assistant/'],
    ['Contact','/en/contact/'],['Legal','/en/legal/'],['Admin','/operator-dashboard/','nofollow'],['App','/app/?lang=en']
  ];

  const active = href => {
    try {
      const url = new URL(href, location.origin);
      if (url.hash) return location.pathname === url.pathname && location.hash === url.hash;
      if (url.pathname === '/' || url.pathname === '/en/') return location.pathname === url.pathname;
      if (url.pathname === '/visual-index/' || url.pathname === '/app/') {
        return location.pathname === url.pathname && (url.searchParams.get('lang') === 'en') === english;
      }
      return location.pathname === url.pathname || location.pathname.startsWith(url.pathname);
    } catch { return false; }
  };

  const renderLinks = items => items.map(([label,href,mode]) => `<a href="${href}"${active(href)?' aria-current="page"':''}${mode==='nofollow'?' rel="nofollow"':''}>${label}</a>`).join('');
  const brandMark = type => `<span class="gnk-v13-brand-mark gnk-v13-brand-mark-${type}" aria-hidden="true"><i></i><i></i><i></i></span>`;

  const removeOldPatches = () => {
    [
      'gnk-asg-fixed-menu-patch-style','gnk-asg-fixed-menu-patch-script','gnk-public-v13-reset',
      'gnk-asg-global-layer-root','gnk-asg-drawer','gnk-asg-overlay','gnk-asg-menu-toggle','gnk-asg-theme-toggle'
    ].forEach(id => document.getElementById(id)?.remove());
    document.querySelectorAll('.gnk-asg-fixed-menu-spacer').forEach(element => element.remove());
  };

  const installForceStyle = () => {
    let style = document.getElementById('gnk-public-v15-force-layout');
    if (!style) {
      style = document.createElement('style');
      style.id = 'gnk-public-v15-force-layout';
      document.head.appendChild(style);
    }
    style.textContent = `
      #gnk-asg-premium-header.gnk-v13-header{display:block!important;position:sticky!important;top:6px!important;left:auto!important;right:auto!important;bottom:auto!important;transform:none!important;height:auto!important;min-height:0!important;max-height:none!important;margin:8px auto 14px!important;overflow:visible!important}
      #gnk-asg-premium-header .gnk-v13-brand-row{display:grid!important;position:relative!important;inset:auto!important;transform:none!important;width:100%!important;margin:0!important}
      #gnk-asg-premium-header #gnk-asg-premium-menu.gnk-v13-menu{display:flex!important;position:relative!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important;inset:auto!important;transform:none!important;clear:both!important;float:none!important;width:100%!important;max-width:none!important;height:auto!important;min-height:31px!important;max-height:none!important;margin:6px auto 0!important;padding:6px 0 0!important}
      body>.site-header,body>header.site-header,body>.header-inner,body>.main-nav,.site-header,.header-inner>.main-nav,.menu-toggle,.gnk-asg-fixed-menu-spacer{display:none!important}
    `;
  };

  const installHeader = () => {
    if (!document.body) return false;
    removeOldPatches();
    installForceStyle();
    document.body.classList.add('gnk-public-v13',routeClass);
    document.documentElement.classList.add('gnk-public-v13-root');
    document.documentElement.lang = english ? 'en' : 'hr';

    const headers = Array.from(document.querySelectorAll('#gnk-asg-premium-header'));
    let header = headers.shift() || null;
    headers.forEach(element => element.remove());
    if (!header) {
      header = document.createElement('header');
      header.id = 'gnk-asg-premium-header';
      document.body.prepend(header);
    }
    header.className = 'gnk-v13-header';
    header.dataset.publicMenuVersion = '15';
    header.dataset.language = english ? 'en' : 'hr';
    header.innerHTML = `
      <div class="gnk-v13-brand-row">
        <a class="gnk-v13-brand gnk-v13-brand-left" href="${english?'/en/':'/'}" aria-label="GNK ASG">
          ${brandMark('asg')}<span><strong>GNK ASG d.o.o.</strong><small>${english?'Corporate portal':'Korporativni portal'}</small></span>
        </a>
        <div class="gnk-v13-system"><span><i></i>${english?'System active':'Sustav aktivan'}</span><b>V3.1</b></div>
        <a class="gnk-v13-brand gnk-v13-brand-right" href="${english?'/en/':'/'}" aria-label="GNK DINAMO Ltd.">
          ${brandMark('dinamo')}<span><strong>GNK DINAMO Ltd.</strong><small>Parent Company · Boulder, Colorado</small></span>
        </a>
        <a id="gnk-public-language" class="gnk-v13-language" href="${pairedLanguageUrl()}" hreflang="${english?'hr':'en'}" aria-label="${english?'Prikaži hrvatsku verziju':'Open English version'}">${english?'HR':'EN'}</a>
      </div>
      <nav id="gnk-asg-premium-menu" class="gnk-v13-menu" aria-label="${english?'Main navigation':'Glavna navigacija'}">${renderLinks(english?enItems:hrItems)}</nav>`;

    header.style.setProperty('display','block','important');
    header.style.setProperty('position','sticky','important');
    header.style.setProperty('left','auto','important');
    header.style.setProperty('right','auto','important');
    header.style.setProperty('transform','none','important');
    header.style.setProperty('height','auto','important');
    header.style.setProperty('max-height','none','important');

    const menu = header.querySelector('#gnk-asg-premium-menu');
    if (menu) {
      ['top','left','right','bottom'].forEach(property => menu.style.setProperty(property,'auto','important'));
      menu.style.setProperty('position','relative','important');
      menu.style.setProperty('transform','none','important');
      menu.style.setProperty('width','100%','important');
      menu.style.setProperty('max-width','none','important');
      menu.style.setProperty('height','auto','important');
      menu.style.setProperty('max-height','none','important');
      menu.style.setProperty('margin','6px auto 0','important');
    }
    return true;
  };

  const suppressLegacyNavigation = () => {
    const selectors = [
      'body > header:not(#gnk-asg-premium-header)','body > .site-header','.site-header','.shell > .brand-head','.shell > .top-nav',
      '.header-inner > .main-nav','.menu-toggle','.gnk-asg-full-menu-v2','.gnk-asg-rescue-menu','.gnk-asg-final-menu-wrap',
      '.gnk-asg-inner-nav','.gnk-asg-floating-actions','.floating-home','.floating-ai','.gnk-global-float-home','.gnk-global-float-ai',
      'main > nav:first-child','.news-actions','#gnk-asg-global-layer-root','#gnk-asg-drawer','#gnk-asg-overlay',
      '#gnk-asg-menu-toggle','#gnk-asg-theme-toggle','#gnk-asg-float-home','#gnk-asg-float-ai','#gnk-asg-ai-panel',
      '#gnk-asg-review-modal','#gnk-asg-single-ai-button-anchor'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(element => element.classList.add('gnk-v13-legacy-hidden'));
    document.querySelectorAll('#gnk-asg-premium-menu').forEach((menu,index) => { if (index > 0) menu.remove(); });
  };

  const installAiBadge = () => {
    let badge = document.getElementById('gnk-ai-badge-v13');
    if (!badge) {
      badge = document.createElement('a');
      badge.id = 'gnk-ai-badge-v13';
      badge.className = 'gnk-v13-ai-badge';
      document.body.appendChild(badge);
    }
    badge.href = english ? '/en/assistant/' : '/assistant/';
    badge.innerHTML = `<i aria-hidden="true"></i><span>${english?'AI Help':'AI pomoć'}</span>`;
    badge.setAttribute('aria-label',english?'Open GNK ASG AI Help':'Otvori GNK ASG AI pomoć');
    badge.classList.remove('gnk-v13-legacy-hidden');
  };

  let running = false;
  const run = () => {
    if (running) return;
    running = true;
    try { installHeader(); suppressLegacyNavigation(); installAiBadge(); }
    finally { running = false; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  window.addEventListener('load',run,{once:true});
  [80,250,650,1400,3000,6000,10000].forEach(delay=>setTimeout(run,delay));

  let queued = false;
  new MutationObserver(() => {
    if (queued || running) return;
    const header = document.getElementById('gnk-asg-premium-header');
    const badge = document.getElementById('gnk-ai-badge-v13');
    const needsRepair = !header || header.dataset.publicMenuVersion !== '15' || !badge || badge.classList.contains('gnk-v13-legacy-hidden');
    if (!needsRepair) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      run();
    });
  }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
