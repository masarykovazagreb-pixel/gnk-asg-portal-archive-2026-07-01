(() => {
  'use strict';
  if (window.__GNK_ASG_PUBLIC_MENU_V18__) return;
  window.__GNK_ASG_PUBLIC_MENU_V18__ = true;

  const pathname = location.pathname.replace(/\/+/g, '/');
  const path = pathname.toLowerCase();
  const params = new URLSearchParams(location.search);
  const privatePrefixes = [
    '/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center',
    '/media-command-center','/news-admin','/pdf-publisher','/social-share','/wa-center',
    '/review','/auto-editor','/operator','/api'
  ];
  if (privatePrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`))) return;

  const sharedLanguagePage = path.startsWith('/visual-index') || path === '/app' || path.startsWith('/app/');
  const english = (sharedLanguagePage && params.get('lang') === 'en') || path === '/en' || path.startsWith('/en/') ||
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
    if (path.startsWith('/the-code')) return 'gnk-route-code';
    return 'gnk-route-public';
  })();

  const copy = english ? {
    portal:'Corporate portal', menu:'Main navigation', language:'HR', languageLabel:'Open Croatian version',
    admin:'Admin', open:'Open menu', close:'Close menu', ai:'AI Help', system:'System active'
  } : {
    portal:'Korporativni portal', menu:'Glavna navigacija', language:'EN', languageLabel:'Open English version',
    admin:'Admin', open:'Otvori izbornik', close:'Zatvori izbornik', ai:'AI pomoć', system:'Sustav aktivan'
  };

  const groups = english ? [
    {label:'Company', items:[
      {label:'Profile', detail:'Companies, governance and group structure', href:'/en/#profile'},
      {label:'Financials', detail:'Published indicators and reports', href:'/en/#financials'},
      {label:'THE CODE', detail:'Strategic programme and presentation', href:'/the-code/?lang=en'}
    ]},
    {label:'Intelligence', items:[
      {label:'Markets', detail:'Market data and international network', href:'/markets/'},
      {label:'News', detail:'Verified public news sources', href:'/news/'},
      {label:'Publications', detail:'GNK ASG editorial content', href:'/publications/'},
      {label:'Visual Index', detail:'Approved visual and media assets', href:'/visual-index/?lang=en'}
    ]},
    {label:'Resources', items:[
      {label:'PDF Centre', detail:'Reports, memoranda and downloads', href:'/en/downloads/'},
      {label:'Media Kit', detail:'Logos and corporate materials', href:'/media-kit/?lang=en'},
      {label:'AI Help', detail:'Public portal assistant', href:'/en/assistant/'},
      {label:'Automation status', detail:'Public system status', href:'/automation-status/'}
    ]},
    {label:'Contact', items:[
      {label:'Contact', detail:'Recorded corporate inquiries', href:'/en/contact/'},
      {label:'Legal', detail:'Privacy, terms and legal notices', href:'/en/legal/'},
      {label:'Mobile App', detail:'Standard and secure admin access', href:'/app/?lang=en'}
    ]}
  ] : [
    {label:'Kompanije', items:[
      {label:'Profil', detail:'Društva, upravljanje i struktura grupe', href:'/#profil'},
      {label:'Financije', detail:'Objavljeni pokazatelji i izvješća', href:'/#financije'},
      {label:'THE CODE', detail:'Strateški program i prezentacija', href:'/the-code/'}
    ]},
    {label:'Intelligence', items:[
      {label:'Tržišta', detail:'Tržišni podaci i međunarodna mreža', href:'/trzista/'},
      {label:'Vijesti', detail:'Provjereni javni izvori vijesti', href:'/vijesti/'},
      {label:'Objave', detail:'Vlastiti urednički sadržaj GNK ASG-a', href:'/objave/'},
      {label:'Visual Index', detail:'Odobreni vizualni i medijski materijali', href:'/visual-index/'}
    ]},
    {label:'Resursi', items:[
      {label:'PDF centar', detail:'Izvješća, memorandumi i preuzimanja', href:'/downloads/'},
      {label:'Media Kit', detail:'Logotipi i korporativni materijali', href:'/media-kit/'},
      {label:'AI pomoć', detail:'Javni asistent portala', href:'/assistant/'},
      {label:'Status automatizacije', detail:'Javni tehnički status sustava', href:'/status-automatizacije/'}
    ]},
    {label:'Kontakt', items:[
      {label:'Kontakt', detail:'Evidentirani korporativni upiti', href:'/contact/'},
      {label:'Legal', detail:'Privatnost, uvjeti i pravne obavijesti', href:'/legal/'},
      {label:'Mobilna aplikacija', detail:'Standardni i sigurni Admin pristup', href:'/app/'}
    ]}
  ];

  const pairedLanguageUrl = () => {
    if (sharedLanguagePage) {
      const target = new URL(location.href);
      target.searchParams.delete('cb');
      if (english) target.searchParams.delete('lang'); else target.searchParams.set('lang','en');
      return `${target.pathname}${target.search}${target.hash}`;
    }
    const query = new URLSearchParams(location.search);
    query.delete('cb');
    const suffix = query.toString() ? `?${query}` : '';
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

  const active = href => {
    try {
      const url = new URL(href, location.origin);
      if (url.hash) return location.pathname === url.pathname && location.hash === url.hash;
      if (url.pathname === '/' || url.pathname === '/en/') return location.pathname === url.pathname;
      return location.pathname === url.pathname || (url.pathname !== '/' && location.pathname.startsWith(url.pathname));
    } catch { return false; }
  };

  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const groupPanel = group => group.items.map(item => `<a href="${escapeHtml(item.href)}"${active(item.href)?' aria-current="page"':''}><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail)}</small></a>`).join('');
  const mobileGroups = groups.map(group => `<section class="gnk18-mobile-group"><strong>${escapeHtml(group.label)}</strong>${group.items.map(item=>`<a href="${escapeHtml(item.href)}"${active(item.href)?' aria-current="page"':''}><span>${escapeHtml(item.label)}</span><span aria-hidden="true">›</span></a>`).join('')}</section>`).join('');

  const closeMenus = except => {
    document.querySelectorAll('.gnk18-nav-item[data-open="1"]').forEach(item => {
      if (item !== except) {
        item.dataset.open = '0';
        item.querySelector('.gnk18-nav-trigger')?.setAttribute('aria-expanded','false');
      }
    });
  };

  const install = () => {
    if (!document.body) return;
    document.documentElement.classList.add('gnk-public-redesign-root');
    document.documentElement.lang = english ? 'en' : 'hr';
    document.body.classList.add('gnk-public-redesign-v1',routeClass);

    ['gnk-asg-premium-header','gnk-ai-badge-v13','gnk-asg-global-layer-root','gnk-public-header-v18','gnk18-floating-ai'].forEach(id => document.getElementById(id)?.remove());
    document.querySelectorAll('.gnk-v13-ai-badge,.gnk-asg-fixed-menu-spacer').forEach(node => node.remove());

    const header = document.createElement('header');
    header.id = 'gnk-public-header-v18';
    header.dataset.drawer = 'closed';
    header.innerHTML = `
      <div class="gnk18-header-inner">
        <a class="gnk18-brand" href="${english?'/en/':'/'}" aria-label="GNK ASG">
          <span class="gnk18-brand-mark" aria-hidden="true"></span>
          <span class="gnk18-brand-copy"><strong>GNK ASG d.o.o.</strong><small>${escapeHtml(copy.portal)}</small></span>
        </a>
        <nav class="gnk18-desktop-nav" aria-label="${escapeHtml(copy.menu)}">
          ${groups.map((group,index)=>`<div class="gnk18-nav-item" data-open="0"><button class="gnk18-nav-trigger" type="button" aria-expanded="false" aria-controls="gnk18-panel-${index}">${escapeHtml(group.label)}</button><div id="gnk18-panel-${index}" class="gnk18-menu-panel">${groupPanel(group)}</div></div>`).join('')}
        </nav>
        <div class="gnk18-actions">
          <a class="gnk18-language" href="${escapeHtml(pairedLanguageUrl())}" hreflang="${english?'hr':'en'}" aria-label="${escapeHtml(copy.languageLabel)}">${copy.language}</a>
          <a class="gnk18-admin" href="/admin-center/" rel="nofollow">${copy.admin}</a>
          <button class="gnk18-mobile-toggle" type="button" aria-expanded="false" aria-label="${escapeHtml(copy.open)}">☰</button>
        </div>
      </div>
      <div class="gnk18-mobile-drawer" aria-label="${escapeHtml(copy.menu)}">${mobileGroups}<section class="gnk18-mobile-group"><strong>${escapeHtml(copy.system)}</strong><a href="/admin-center/" rel="nofollow"><span>${copy.admin}</span><span aria-hidden="true">›</span></a></section></div>`;
    document.body.prepend(header);

    const floating = document.createElement('a');
    floating.id = 'gnk18-floating-ai';
    floating.className = 'gnk18-floating-ai';
    floating.href = english ? '/en/assistant/' : '/assistant/';
    floating.textContent = copy.ai;
    document.body.appendChild(floating);

    header.querySelectorAll('.gnk18-nav-trigger').forEach(trigger => {
      trigger.addEventListener('click', event => {
        event.stopPropagation();
        const item = trigger.closest('.gnk18-nav-item');
        const open = item.dataset.open === '1';
        closeMenus(item);
        item.dataset.open = open ? '0' : '1';
        trigger.setAttribute('aria-expanded',String(!open));
      });
      trigger.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          trigger.closest('.gnk18-nav-item').dataset.open = '0';
          trigger.setAttribute('aria-expanded','false');
          trigger.focus();
        }
      });
    });

    const toggle = header.querySelector('.gnk18-mobile-toggle');
    toggle.addEventListener('click', () => {
      const open = header.dataset.drawer === 'open';
      header.dataset.drawer = open ? 'closed' : 'open';
      toggle.setAttribute('aria-expanded',String(!open));
      toggle.setAttribute('aria-label',open ? copy.open : copy.close);
      document.body.style.overflow = open ? '' : 'hidden';
    });

    header.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      header.dataset.drawer = 'closed';
      toggle.setAttribute('aria-expanded','false');
      document.body.style.overflow = '';
      closeMenus();
    }));

    document.addEventListener('click', event => {
      if (!event.target.closest('.gnk18-nav-item')) closeMenus();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeMenus();
        header.dataset.drawer = 'closed';
        toggle.setAttribute('aria-expanded','false');
        document.body.style.overflow = '';
      }
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
