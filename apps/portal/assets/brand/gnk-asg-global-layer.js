(() => {
  if (window.__GNK_ASG_PREMIUM_V3__) return;
  window.__GNK_ASG_PREMIUM_V3__ = true;

  const path = location.pathname.toLowerCase();
  const isEn = path.startsWith('/en/') || path.startsWith('/news/') || path.startsWith('/markets/') || path.startsWith('/publications/');
  const isHome = ['/', '/index.html', '/en/', '/en/index.html'].includes(path);
  const isAdmin = /\/(operator-dashboard|operator-mobile|mail-studio|admin)\//.test(path);

  const labels = isEn ? {
    menu:'Full menu', close:'Close', theme:'Theme', ai:'AI Assistant', ask:'Ask AI',
    open:'Open full assistant', online:'Online', fallback:'Fallback', error:'Unavailable',
    placeholder:'Ask about this page, GNK ASG, publications, markets or documents...',
    note:'Public assistant. It cannot perform administrative actions and is not legal, financial or investment advice.',
    brandSub:'Corporate portal', reviewTitle:'New GNK ASG version is ready for review',
    reviewText:'The premium desktop, mobile and admin preview can be reviewed before any production deployment.',
    later:'Later', desktop:'Desktop review', mobile:'Mobile review', admin:'Admin review'
  } : {
    menu:'Puni meni', close:'Zatvori', theme:'Tema', ai:'AI Pomoć', ask:'Pitaj AI',
    open:'Otvori puni asistent', online:'Online', fallback:'Fallback', error:'Nedostupno',
    placeholder:'Pitaj o ovoj stranici, GNK ASG-u, objavama, tržištima ili dokumentima...',
    note:'Javni asistent. Ne provodi administrativne radnje i nije pravni, financijski ni investicijski savjet.',
    brandSub:'Korporativni portal', reviewTitle:'Nova GNK ASG verzija spremna je za pregled',
    reviewText:'Premium desktop, mobilna i admin verzija mogu se pregledati prije bilo kakve objave na produkciju.',
    later:'Kasnije', desktop:'Desktop pregled', mobile:'Mobilni pregled', admin:'Admin pregled'
  };

  const fallbackNavigation = {
    brand:{name:'GNK ASG',logo:'/assets/logo-gnk-asg.svg',signatureLogo:'/assets/gnk-asg-email-logo-final.png',homeHr:'/',homeEn:'/en/'},
    hr:[
      {key:'home',label:'Početna',href:'/'},{key:'profile',label:'Profil',href:'/#o-nama'},
      {key:'financials',label:'Financije',href:'/#financials'},{key:'network',label:'Grupa',href:'/#grupa'},
      {key:'markets',label:'Tržišta',href:'/trzista/'},{key:'publications',label:'Objave',href:'/objave/'},
      {key:'news',label:'Vijesti',href:'/vijesti/'},{key:'media',label:'Media Kit',href:'/media-kit/'},
      {key:'gallery',label:'Galerija',href:'/visual-index/'},{key:'assistant',label:'AI Pomoć',href:'/assistant/'},
      {key:'contact',label:'Kontakt',href:'/contact/'},{key:'legal',label:'Legal',href:'/legal/'},
      {key:'app',label:'Mobilna aplikacija',href:'/app/'},{key:'mail',label:'Mail Center',href:'/mail-studio/',public:false},
      {key:'adminMobile',label:'Mobilni Admin',href:'/operator-mobile/',public:false},{key:'admin',label:'Admin',href:'/operator-dashboard/',public:false},
      {key:'language',label:'EN',href:'/en/'}
    ],
    en:[
      {key:'home',label:'Home',href:'/en/'},{key:'profile',label:'Profile',href:'/en/#o-nama'},
      {key:'financials',label:'Financials',href:'/en/#financials'},{key:'network',label:'Group',href:'/en/#grupa'},
      {key:'markets',label:'Markets',href:'/markets/'},{key:'publications',label:'Publications',href:'/publications/'},
      {key:'news',label:'News',href:'/news/'},{key:'media',label:'Media Kit',href:'/media-kit/'},
      {key:'gallery',label:'Gallery',href:'/visual-index/'},{key:'assistant',label:'AI Help',href:'/assistant/'},
      {key:'contact',label:'Contact',href:'/contact/'},{key:'legal',label:'Legal',href:'/legal/'},
      {key:'app',label:'Mobile App',href:'/app/'},{key:'mail',label:'Mail Center',href:'/mail-studio/',public:false},
      {key:'adminMobile',label:'Mobile Admin',href:'/operator-mobile/',public:false},{key:'admin',label:'Admin',href:'/operator-dashboard/',public:false},
      {key:'language',label:'HR',href:'/'}
    ]
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[ch]);

  const current = href => {
    try {
      const url = new URL(href, location.origin);
      if (url.hash && url.pathname === location.pathname) return false;
      if (url.pathname === '/') return location.pathname === '/';
      return location.pathname === url.pathname || location.pathname.startsWith(url.pathname);
    } catch { return false; }
  };

  const linksHtml = items => items.map(item => {
    const active = current(item.href) ? ' aria-current="page"' : '';
    const rel = item.public === false ? ' rel="nofollow"' : '';
    return `<a href="${esc(item.href)}"${active}${rel}>${esc(item.label)}</a>`;
  }).join('');

  const removeLegacy = () => {
    [
      '.gnk-asg-final-menu-wrap','#gnk-asg-global-layer-root','#gnk-asg-ai-help-float',
      '.gnk-global-float-home','.gnk-global-float-ai','#gnk-asg-single-ai-button-anchor',
      '.gnk-asg-full-menu-v2','.gnk-asg-rescue-menu'
    ].forEach(selector => document.querySelectorAll(selector).forEach(node => node.remove()));
  };

  const localAnswer = question => {
    const terms = question.toLowerCase().split(/\s+/).filter(Boolean);
    const sentences = String(document.body.innerText || '').replace(/\s+/g,' ').split(/(?<=[.!?])\s+/);
    const matches = sentences.filter(sentence => terms.some(term => sentence.toLowerCase().includes(term))).slice(0,7);
    return matches.length ? matches.map((item,index) => `${index+1}. ${item.slice(0,360)}`).join('\n') : labels.note;
  };

  const askAi = async () => {
    const question = document.getElementById('gnk-asg-ai-question')?.value.trim();
    const output = document.getElementById('gnk-asg-ai-output');
    if (!question || !output) return;
    output.textContent = '...';

    try {
      const response = await fetch('/api/ai-assist', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({question,message:question,prompt:question,pageUrl:location.href,pageTitle:document.title,publicOnly:true})
      });
      const raw = await response.text();
      let data;
      try { data = JSON.parse(raw); } catch { data = {answer:raw}; }
      const answer = data.answer || data.response || data.message || data.text || data.result;
      if (!response.ok || !answer) throw new Error('fallback');
      output.textContent = String(answer) + '\n\n' + labels.note;
    } catch {
      output.textContent = localAnswer(question) + '\n\n' + labels.note;
    }
  };

  const addHomeEnhancements = nav => {
    if (!isHome || document.getElementById('gnk-asg-premium-spotlight')) return;
    const main = document.querySelector('main') || document.body;
    const brand = nav.brand || fallbackNavigation.brand;
    const spotlight = document.createElement('section');
    spotlight.id = 'gnk-asg-premium-spotlight';
    spotlight.className = 'gnk-asg-premium-spotlight';
    spotlight.innerHTML = isEn
      ? `<img src="${esc(brand.signatureLogo || brand.logo)}" alt="GNK ASG"><div><h2>GNK ASG</h2><p>Global Network Kapital – Advanced Sports & Governance. A corporate platform connecting business, finance, sport, technology, artificial intelligence, publications and communication in one functional ecosystem.</p></div>`
      : `<img src="${esc(brand.signatureLogo || brand.logo)}" alt="GNK ASG"><div><h2>GNK ASG</h2><p>Global Network Kapital – Advanced Sports & Governance. Korporativna platforma koja povezuje poslovanje, financije, sport, tehnologiju, umjetnu inteligenciju, objave i komunikaciju u jedinstven funkcionalni sustav.</p></div>`;

    const hub = document.createElement('section');
    hub.id = 'gnk-asg-portal-hub';
    hub.className = 'gnk-asg-portal-hub';
    const cards = isEn ? [
      ['/en/#o-nama','01 · Profile','GNK ASG d.o.o.','Corporate and financial profile.'],
      ['/markets/','02 · Markets','Market Intelligence','Markets and digital assets.'],
      ['/publications/','03 · Publications','Analysis and publications','Sources, images, SEO and conclusions.'],
      ['/news/','04 · News','Business news','Current topics from public sources.'],
      ['/assistant/','05 · AI','Public AI assistant','Help with understanding the portal.'],
      ['/contact/','06 · Contact','Contact and departments','Secure contact form.'],
      ['/app/','07 · Mobile','Mobile application','Fast public access to portal functions.'],
      ['/operator-mobile/','08 · Admin','Mobile Admin','Mail, Inbox, Sent, photos and publishing.'],
      ['/mail-studio/','09 · Mail','Mail Center','Compose, Inbox, Sent and professional signatures.']
    ] : [
      ['/#o-nama','01 · Profil','GNK ASG d.o.o.','Korporativni i financijski profil.'],
      ['/trzista/','02 · Tržišta','Market Intelligence','Tržišta i digitalna imovina.'],
      ['/objave/','03 · Objave','Analize i publikacije','Izvori, slike, SEO i zaključci.'],
      ['/vijesti/','04 · Vijesti','Poslovne vijesti','Aktualne teme iz javnih izvora.'],
      ['/assistant/','05 · AI','Javni AI asistent','Pomoć u razumijevanju portala.'],
      ['/contact/','06 · Kontakt','Kontakt i odjeli','Sigurna kontakt forma.'],
      ['/app/','07 · Mobilno','Mobilna aplikacija','Brzi javni pristup svim funkcijama.'],
      ['/operator-mobile/','08 · Admin','Mobilni Admin','Mail, Inbox, Sent, fotografije i objave.'],
      ['/mail-studio/','09 · Mail','Mail Center','Compose, Inbox, Sent i profesionalni potpisi.']
    ];

    hub.innerHTML = `<div class="gnk-asg-hub-head"><div><p class="eyebrow">${isEn ? 'GNK ASG corporate portal' : 'GNK ASG korporativni portal'}</p><h2>${isEn ? 'One portal. Every function.' : 'Jedan portal. Sve funkcije.'}</h2></div><p>${isEn ? 'The existing homepage content remains, while every dynamic module receives a clear functional destination.' : 'Postojeći sadržaj početne stranice ostaje, dok svaki dinamički modul dobiva jasno funkcionalno odredište.'}</p></div><div class="gnk-asg-hub-grid">${cards.map(card => `<a class="gnk-asg-hub-card" href="${card[0]}"><span>${card[1]}</span><strong>${card[2]}</strong><p>${card[3]}</p></a>`).join('')}</div>`;

    const firstSection = main.querySelector(':scope > section');
    if (firstSection) main.insertBefore(spotlight, firstSection);
    else main.prepend(spotlight);
    main.appendChild(hub);
  };

  const enhanceMailStudio = () => {
    if (!path.startsWith('/mail-studio/') || document.getElementById('gnk-asg-mailbox-suite')) return;
    const studio = document.querySelector('.studio') || document.querySelector('main') || document.body;
    const suite = document.createElement('section');
    suite.id = 'gnk-asg-mailbox-suite';
    suite.style.cssText = 'padding:16px;border-bottom:1px solid var(--asg-line);background:rgba(255,255,255,.025)';
    suite.innerHTML = `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px"><img src="/assets/gnk-asg-email-logo-final.png" alt="GNK ASG" style="width:135px;height:auto"><strong style="color:var(--asg-gold);font-size:20px">GNK ASG Mail Center</strong><input id="gnk-asg-mail-token" type="password" placeholder="Operator token" style="margin-left:auto;min-width:240px;padding:10px;border-radius:12px;border:1px solid var(--asg-line)"><button class="gnk-asg-shell-button" id="gnk-asg-mail-login" type="button">Login</button></div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px"><div class="gnk-asg-mail-pane" data-box="inbox"><strong>Inbox</strong><div>Not loaded.</div></div><div class="gnk-asg-mail-pane" data-box="sent"><strong>Sent</strong><div>Not loaded.</div></div><div class="gnk-asg-mail-pane" data-box="outbox"><strong>Outbox</strong><div>Not loaded.</div></div></div>`;
    studio.prepend(suite);
    document.querySelectorAll('.gnk-asg-mail-pane').forEach(pane => pane.style.cssText = 'min-height:190px;padding:14px;border:1px solid var(--asg-line);border-radius:18px;background:rgba(0,0,0,.14);overflow:auto');

    const tokenInput = document.getElementById('gnk-asg-mail-token');
    tokenInput.value = localStorage.getItem('GNK_ASG_OPERATOR_TOKEN') || '';
    document.getElementById('gnk-asg-mail-login')?.addEventListener('click',() => {
      if (tokenInput.value.trim()) localStorage.setItem('GNK_ASG_OPERATOR_TOKEN',tokenInput.value.trim());
      loadMailBoxes();
    });
    loadMailBoxes();
  };

  const loadMailBoxes = async () => {
    const token = localStorage.getItem('GNK_ASG_OPERATOR_TOKEN') || '';
    const headers = token ? {authorization:`Bearer ${token}`,'x-operator-token':token} : {};
    const endpoints = {
      inbox:['/api/mail-center/inbox','/operator/contact-inbox'],
      sent:['/api/mail-center/sent','/operator/mail-log-list'],
      outbox:['/api/mail-center/outbox']
    };
    for (const [type,list] of Object.entries(endpoints)) {
      const pane = document.querySelector(`.gnk-asg-mail-pane[data-box="${type}"] div`);
      if (!pane) continue;
      pane.textContent = 'Loading...';
      let done = false;
      for (const endpoint of list) {
        try {
          const url = token ? `${endpoint}?token=${encodeURIComponent(token)}&cb=${Date.now()}` : `${endpoint}?cb=${Date.now()}`;
          const response = await fetch(url,{headers,cache:'no-store'});
          const raw = await response.text();
          if (!response.ok) continue;
          let data;
          try { data = JSON.parse(raw); } catch { data = {raw}; }
          const items = Array.isArray(data) ? data : (data.items || data.messages || data.logs || data.data || []);
          pane.innerHTML = items.length ? items.slice(0,40).map(item => `<article style="padding:9px 0;border-bottom:1px solid var(--asg-line-soft)"><strong style="display:block;color:var(--asg-text)">${esc(item.subject || item.title || item.event || '(bez predmeta)')}</strong><small style="color:var(--asg-muted)">${esc(item.from || item.to || item.email || item.createdAt || item.sentAt || '')}</small><p style="margin:5px 0 0;color:var(--asg-muted);font-size:12px">${esc(String(item.snippet || item.message || item.body || '').slice(0,260))}</p></article>`).join('') : `<p style="color:var(--asg-muted)">${esc(raw.slice(0,900) || 'Nema zapisa.')}</p>`;
          done = true;
          break;
        } catch {}
      }
      if (!done) pane.textContent = 'Backend nije dostupan ili operator token nije potvrđen.';
    }
  };

  const enhanceAdmin = () => {
    if (!path.startsWith('/operator-dashboard/') || document.getElementById('gnk-asg-admin-launcher')) return;
    const launcher = document.createElement('section');
    launcher.id = 'gnk-asg-admin-launcher';
    launcher.style.cssText = 'max-width:1380px;margin:18px auto;padding:16px 18px;border:1px solid var(--asg-line);border-radius:22px;background:var(--asg-panel);color:var(--asg-text);display:flex;align-items:center;gap:14px;flex-wrap:wrap';
    launcher.innerHTML = `<img src="/assets/gnk-asg-email-logo-final.png" alt="GNK ASG" style="width:135px;height:auto"><div style="flex:1;min-width:240px"><strong style="display:block;color:var(--asg-gold);font-size:21px">GNK ASG Communication & Admin Center</strong><span style="color:var(--asg-muted)">Mail Studio, Inbox, Sent, mobile admin, photos, drafts and publications.</span></div><a class="gnk-asg-shell-button" href="/mail-studio/">Mail Studio</a><a class="gnk-asg-shell-button" href="/mail-studio/#inbox">Inbox</a><a class="gnk-asg-shell-button" href="/mail-studio/#sent">Sent</a><a class="gnk-asg-shell-button" href="/operator-mobile/">Mobilni Admin</a>`;
    document.body.prepend(launcher);
  };

  const maybeShowReviewModal = async () => {
    try {
      const response = await fetch(`/data/review-status.json?cb=${Date.now()}`,{cache:'no-store'});
      if (!response.ok) return;
      const status = await response.json();
      if (!status.readyForReview) return;
      const key = `gnk-asg-review-dismissed-${status.version}`;
      if (localStorage.getItem(key) === '1') return;

      const modal = document.createElement('div');
      modal.id = 'gnk-asg-review-modal';
      modal.className = 'open';
      modal.innerHTML = `<div class="gnk-asg-review-card"><img src="/assets/gnk-asg-email-logo-final.png" alt="GNK ASG"><h2>${esc(labels.reviewTitle)}</h2><p>${esc(labels.reviewText)}</p><div class="gnk-asg-review-actions"><a class="primary" href="${esc(status.desktopUrl || '/review/')}">${esc(labels.desktop)}</a><a href="${esc(status.mobileUrl || '/app/')}">${esc(labels.mobile)}</a><a href="${esc(status.adminUrl || '/operator-mobile/')}">${esc(labels.admin)}</a><button type="button" id="gnk-asg-review-later">${esc(labels.later)}</button></div></div>`;
      document.body.appendChild(modal);
      document.getElementById('gnk-asg-review-later')?.addEventListener('click',() => {
        localStorage.setItem(key,'1');
        modal.remove();
      });
    } catch {}
  };

  const install = nav => {
    removeLegacy();
    document.body.classList.add('gnk-asg-premium-shell');
    if (isAdmin) document.body.classList.add('gnk-asg-admin-page');

    ['gnk-asg-premium-header','gnk-asg-overlay','gnk-asg-drawer','gnk-asg-float-home','gnk-asg-float-ai','gnk-asg-ai-panel'].forEach(id => document.getElementById(id)?.remove());

    const items = isEn ? nav.en : nav.hr;
    const brand = nav.brand || fallbackNavigation.brand;
    const home = isEn ? brand.homeEn : brand.homeHr;
    const assistant = items.find(item => item.key === 'assistant')?.href || '/assistant/';

    const header = document.createElement('header');
    header.id = 'gnk-asg-premium-header';
    header.innerHTML = `<a class="gnk-asg-brand" href="${esc(home)}"><img src="${esc(brand.logo || '/assets/logo-gnk-asg.svg')}" alt="${esc(brand.name || 'GNK ASG')}"><span><strong>${esc(brand.name || 'GNK ASG')}</strong><small>${esc(labels.brandSub)}</small></span></a><nav id="gnk-asg-premium-menu" aria-label="${esc(labels.menu)}">${linksHtml(items)}</nav><div class="gnk-asg-shell-actions"><button class="gnk-asg-shell-button" id="gnk-asg-theme-toggle" type="button">${esc(labels.theme)}</button><button class="gnk-asg-shell-button" id="gnk-asg-menu-toggle" type="button">${esc(labels.menu)}</button></div>`;

    const overlay = document.createElement('div');
    overlay.id = 'gnk-asg-overlay';

    const drawer = document.createElement('aside');
    drawer.id = 'gnk-asg-drawer';
    drawer.innerHTML = `<div class="gnk-asg-drawer-head"><strong>${esc(labels.menu)}</strong><button class="gnk-asg-shell-button" id="gnk-asg-drawer-close" type="button">${esc(labels.close)}</button></div><nav id="gnk-asg-drawer-menu">${linksHtml(items)}</nav>`;

    const homeButton = document.createElement('a');
    homeButton.id = 'gnk-asg-float-home';
    homeButton.href = home;
    homeButton.setAttribute('aria-label', isEn ? 'Home' : 'Početna');
    homeButton.textContent = '⌂';

    const aiButton = document.createElement('button');
    aiButton.id = 'gnk-asg-float-ai';
    aiButton.type = 'button';
    aiButton.dataset.status = 'fallback';
    aiButton.innerHTML = `<span class="dot"></span><span><strong>${esc(labels.ai)}</strong><small>${esc(labels.fallback)}</small></span>`;

    const aiPanel = document.createElement('aside');
    aiPanel.id = 'gnk-asg-ai-panel';
    aiPanel.innerHTML = `<h3>${esc(labels.ai)}</h3><p>${esc(labels.note)}</p><textarea id="gnk-asg-ai-question" placeholder="${esc(labels.placeholder)}"></textarea><div id="gnk-asg-ai-actions"><button id="gnk-asg-ai-ask" type="button">${esc(labels.ask)}</button><a href="${esc(assistant)}">${esc(labels.open)}</a><button id="gnk-asg-ai-close" type="button">${esc(labels.close)}</button></div><div id="gnk-asg-ai-output">${esc(labels.note)}</div>`;

    document.body.prepend(header);
    document.body.append(overlay,drawer,homeButton,aiButton,aiPanel);

    const closeMenu = () => document.body.classList.remove('gnk-asg-menu-open');
    document.getElementById('gnk-asg-menu-toggle')?.addEventListener('click',() => document.body.classList.add('gnk-asg-menu-open'));
    document.getElementById('gnk-asg-drawer-close')?.addEventListener('click',closeMenu);
    overlay.addEventListener('click',closeMenu);

    document.getElementById('gnk-asg-theme-toggle')?.addEventListener('click',() => {
      const next = document.documentElement.dataset.gnkTheme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.gnkTheme = next;
      localStorage.setItem('gnk-asg-theme',next);
    });

    aiButton.addEventListener('click',() => document.body.classList.toggle('gnk-asg-ai-open'));
    document.getElementById('gnk-asg-ai-close')?.addEventListener('click',() => document.body.classList.remove('gnk-asg-ai-open'));
    document.getElementById('gnk-asg-ai-ask')?.addEventListener('click',askAi);
    document.getElementById('gnk-asg-ai-question')?.addEventListener('keydown',event => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) askAi();
    });

    document.addEventListener('keydown',event => {
      if (event.key === 'Escape') {
        closeMenu();
        document.body.classList.remove('gnk-asg-ai-open');
      }
    });

    addHomeEnhancements(nav);
    enhanceMailStudio();
    enhanceAdmin();
    checkStatus(aiButton);
    maybeShowReviewModal();
  };

  const checkStatus = async button => {
    const label = button.querySelector('small');
    for (const url of ['/data/status.json','/data/publications.json']) {
      try {
        const response = await fetch(`${url}?cb=${Date.now()}`,{cache:'no-store'});
        if (!response.ok) continue;
        const data = await response.json();
        if (data && (data.ok !== false || Array.isArray(data.items))) {
          button.dataset.status = 'online';
          if (label) label.textContent = labels.online;
          return;
        }
      } catch {}
    }
    button.dataset.status = 'error';
    if (label) label.textContent = labels.error;
  };

  const loadNavigation = async () => {
    try {
      const response = await fetch(`/data/navigation.json?cb=${Date.now()}`,{cache:'no-store'});
      if (!response.ok) throw new Error('navigation');
      return await response.json();
    } catch { return fallbackNavigation; }
  };

  const init = async () => {
    removeLegacy();
    const theme = localStorage.getItem('gnk-asg-theme') || 'dark';
    document.documentElement.dataset.gnkTheme = theme;
    install(await loadNavigation());
    [250,900,2200].forEach(delay => setTimeout(removeLegacy,delay));
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
