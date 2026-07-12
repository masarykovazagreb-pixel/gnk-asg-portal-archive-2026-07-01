(()=>{
  if(document.getElementById('gnk-floating-menu'))return;

  const sections=[
    {
      label:'ADMIN / ADMIN CENTER',
      protected:true,
      featured:true,
      items:[
        {text:'ADMIN — ulaz u sve module',textEn:'ADMIN — access all modules',href:'/admin-center/'},
        {text:'Mail Studio',textEn:'Mail Studio',href:'/mail-studio/'},
        {text:'Statusi mailova',textEn:'Email status',href:'/email-status/'},
        {text:'Pretraga mailova',textEn:'Mail search',href:'/admin-center/mail-search/'},
        {text:'Kontaktni slučajevi',textEn:'Contact cases',href:'/admin-center/contacts/'},
        {text:'PDF centar',textEn:'PDF center',href:'/admin-center/pdf/'},
        {text:'Media Registration Admin',textEn:'Media Registration Admin',href:'/media-registration-admin/'},
        {text:'Worker Operations',textEn:'Worker Operations',href:'/worker-ops/'},
        {text:'Operator Dashboard',textEn:'Operator Dashboard',href:'/operator-dashboard/'},
        {text:'Digital Headquarters',textEn:'Digital Headquarters',href:'/digital-headquarters/'}
      ]
    },
    {
      label:'Javni portal / Public portal',
      items:[
        {text:'Početna',textEn:'Home',href:'/',hrefEn:'/en/'},
        {text:'O nama',textEn:'About',href:'/about/'},
        {text:'Nermin Sefić',textEn:'Nermin Sefić',href:'/nermin-sefic/'},
        {text:'Projekti',textEn:'Projects',href:'/projects/'},
        {text:'Strateški roadmap',textEn:'Strategic roadmap',href:'/projects/roadmap/'},
        {text:'Grupna mreža',textEn:'Group network',href:'/group-network/'},
        {text:'Financije',textEn:'Finance',href:'/finance/'},
        {text:'Newsroom',textEn:'Newsroom',href:'/newsroom/',hrefEn:'/en/newsroom/'},
        {text:'Izvješća',textEn:'Reports',href:'/reports/',hrefEn:'/en/reports/'},
        {text:'Knowledge Center',textEn:'Knowledge Center',href:'/knowledge-center/',hrefEn:'/en/knowledge-center/'},
        {text:'Tržišta',textEn:'Markets',href:'/trzista/'},
        {text:'Tehnologija',textEn:'Technology',href:'/tehnologija/'},
        {text:'Intelligence Desk',textEn:'Intelligence Desk',href:'/intelligence-desk/'},
        {text:'Registri',textEn:'Registers',href:'/registri/'},
        {text:'Sadržaj',textEn:'Content',href:'/sadrzaj/'},
        {text:'Teme',textEn:'Topics',href:'/teme/'},
        {text:'THE CODE',textEn:'THE CODE',href:'/the-code/'},
        {text:'Workeri',textEn:'Workers',href:'/workers/'},
        {text:'Medijske prijave',textEn:'Media applications',href:'/media-application/'},
        {text:'Kontakt',textEn:'Contact',href:'/contact/'},
        {text:'English portal',textEn:'Croatian portal',href:'/en/',hrefEn:'/'}
      ]
    },
    {
      label:'Mediji i objava / Media & publishing',
      items:[
        {text:'News Auto Publication',textEn:'News Auto Publication',href:'/admin-center/news-publication/',protected:true},
        {text:'Campaign Mailer',textEn:'Campaign Mailer',href:'/campaign-mailer/',protected:true,status:'zaključano / locked'}
      ]
    }
  ];

  const normalize=value=>{const path=String(value||'/').split('?')[0].split('#')[0].replace(/\/+$/,'');return path||'/';};
  const isEnglish=()=>document.documentElement.lang?.toLowerCase().startsWith('en')||location.pathname==='/en'||location.pathname.startsWith('/en/');
  const language=()=>isEnglish()?'en':'hr';
  const labelOf=item=>language()==='en'?(item.textEn||item.text):item.text;
  const hrefOf=item=>language()==='en'&&item.hrefEn?item.hrefEn:item.href;

  function harmonizeStaticHeader(){
    const staticNav=document.querySelector('.site-header .nav-links');
    if(staticNav){
      const canonical=[
        {text:'Početna',textEn:'Home',href:'/',hrefEn:'/en/'},
        {text:'O nama',textEn:'About',href:'/about/'},
        {text:'Projekti',textEn:'Projects',href:'/projects/'},
        {text:'Financije',textEn:'Finance',href:'/finance/'},
        {text:'Newsroom',textEn:'Newsroom',href:'/newsroom/',hrefEn:'/en/newsroom/'},
        {text:'Izvješća',textEn:'Reports',href:'/reports/',hrefEn:'/en/reports/'},
        {text:'Knowledge Center',textEn:'Knowledge Center',href:'/knowledge-center/',hrefEn:'/en/knowledge-center/'},
        {text:'Media',textEn:'Media',href:'/media-application/'},
        {text:'Kontakt',textEn:'Contact',href:'/contact/'},
        {text:'ADMIN',textEn:'ADMIN',href:'/admin-center/'}
      ];
      staticNav.replaceChildren(...canonical.map(item=>{
        const link=document.createElement('a');link.href=hrefOf(item);link.textContent=labelOf(item);if(item.href==='/admin-center/'){link.rel='nofollow';link.dataset.protected='true';}return link;
      }));
      staticNav.dataset.gnkCanonicalRoutes='v4';
    }
    const headerNav=document.querySelector('.site-header .container.nav');
    if(headerNav&&!headerNav.querySelector('.gnk-language-switch')){
      const lang=document.createElement('div');lang.className='gnk-language-switch';lang.setAttribute('aria-label','Odabir jezika / Language selection');
      const hr=document.createElement('a');hr.href='/';hr.textContent='HR';
      const en=document.createElement('a');en.href='/en/';en.textContent='EN';
      if(language()==='hr')hr.setAttribute('aria-current','page');else en.setAttribute('aria-current','page');
      lang.append(hr,document.createTextNode(' / '),en);headerNav.appendChild(lang);
    }
  }

  const style=document.createElement('style');
  style.textContent=`
    :root{--gnk-event-bar-height:78px}
    body.gnk-menu-open{overflow:hidden;touch-action:none}
    #gnk-event-bar{position:fixed;inset:0 0 auto 0;height:var(--gnk-event-bar-height);z-index:99998;overflow:hidden;background:linear-gradient(90deg,#2a170b 0%,#4b2a12 28%,#6a3f1c 52%,#4b2a12 74%,#2a170b 100%);border-bottom:2px solid #d8b66a;box-shadow:0 10px 35px rgba(0,0,0,.35);color:#f4d37a}
    #gnk-event-bar .gnk-event-track{position:absolute;inset:0;display:flex;align-items:center;white-space:nowrap;overflow:hidden;pointer-events:none}
    #gnk-event-bar .gnk-event-message{display:inline-block;min-width:100%;padding-left:100%;font:900 15px/1.2 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;animation:gnk-event-marquee 24s linear infinite;text-shadow:0 1px 8px rgba(0,0,0,.7);color:#f4d37a}
    @keyframes gnk-event-marquee{from{transform:translateX(0)}to{transform:translateX(-200%)}}
    #gnk-floating-menu{position:fixed;left:50%;top:max(16px,env(safe-area-inset-top));transform:translateX(-50%);z-index:99999;font-family:Arial,sans-serif}
    #gnk-floating-menu *{box-sizing:border-box}
    #gnk-floating-menu .gnk-floating-actions{display:flex;gap:10px;justify-content:center;align-items:center}
    #gnk-floating-menu .gnk-home-button,#gnk-floating-menu>.gnk-floating-actions>button{height:46px;padding:0 21px;border-radius:999px;border:1px solid #d8b66a;background:#3a2110;color:#f4d37a;font-weight:900;letter-spacing:.08em;box-shadow:0 10px 30px rgba(0,0,0,.4);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
    #gnk-floating-menu .gnk-home-button:hover,#gnk-floating-menu>.gnk-floating-actions>button:hover{border-color:#f4d37a;background:#5a3518;color:#fff0b5}
    #gnk-floating-menu .gnk-home-button:focus-visible,#gnk-floating-menu button:focus-visible,#gnk-floating-menu nav a:focus-visible,#gnk-floating-menu .gnk-top-language a:focus-visible{outline:3px solid #fff0b5;outline-offset:3px}
    #gnk-floating-menu .gnk-top-language{height:46px;display:inline-flex;align-items:center;gap:5px;padding:0 14px;border:1px solid #d8b66a;border-radius:999px;background:#17100b;box-shadow:0 10px 30px rgba(0,0,0,.32);white-space:nowrap}
    #gnk-floating-menu .gnk-top-language a{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:30px;padding:0 6px;border-radius:999px;color:#d8b66a;text-decoration:none;font-size:12px;font-weight:900;letter-spacing:.08em}
    #gnk-floating-menu .gnk-top-language a[aria-current="page"]{background:#d8b66a;color:#211308}
    #gnk-floating-menu .gnk-top-language-separator{color:#8f7040;font-weight:900}
    #gnk-floating-menu nav{display:none;position:absolute;left:50%;transform:translateX(-50%);top:56px;width:min(460px,calc(100vw - 28px));max-height:calc(100vh - 100px);max-height:calc(100dvh - 100px - env(safe-area-inset-bottom));overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:14px 14px calc(14px + env(safe-area-inset-bottom));background:#0b0b0b;border:1px solid #d8b66a;border-radius:18px;box-shadow:0 18px 55px rgba(0,0,0,.55)}
    #gnk-floating-menu.open nav{display:block}
    #gnk-floating-menu .gnk-menu-group+.gnk-menu-group{margin-top:13px;padding-top:13px;border-top:1px solid #2d271d}
    #gnk-floating-menu .gnk-menu-group.featured{padding:12px;border:1px solid #d8b66a;border-radius:14px;background:linear-gradient(145deg,#1a160e,#0d0d0d)}
    #gnk-floating-menu .gnk-menu-label{display:block;padding:0 10px 7px;color:#d8b66a;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
    #gnk-floating-menu .gnk-menu-links{display:grid;gap:6px}
    #gnk-floating-menu nav a{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;padding:11px 13px;border-radius:11px;color:#f5f2ea;text-decoration:none;background:#12100c;border:1px solid transparent}
    #gnk-floating-menu nav a:hover,#gnk-floating-menu nav a:focus,#gnk-floating-menu nav a[aria-current="page"]{border-color:#d8b66a;color:#d8b66a}
    #gnk-floating-menu .gnk-menu-group.featured a:first-child{background:linear-gradient(135deg,#b98b2d,#f4d37a);color:#07101f;font-weight:900}
    #gnk-floating-menu .gnk-menu-meta{color:#9c927f;font-size:9px;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
    #gnk-floating-menu nav a[data-protected="true"] .gnk-menu-meta::before{content:'ZAŠTIĆENO / PROTECTED';}
    #gnk-floating-menu nav a[data-status] .gnk-menu-meta::after{content:attr(data-status);margin-left:8px;color:#d8b66a}
    .site-header{position:relative;z-index:1;margin-top:var(--gnk-event-bar-height)}
    .site-header .gnk-language-switch{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-weight:900}
    .site-header .gnk-language-switch a{text-decoration:none;color:inherit;opacity:.65}
    .site-header .gnk-language-switch a[aria-current="page"]{opacity:1;text-decoration:underline;text-underline-offset:4px}
    @media(max-width:700px){:root{--gnk-event-bar-height:70px}#gnk-event-bar .gnk-event-message{font-size:12px;animation-duration:19s}#gnk-floating-menu{top:max(13px,env(safe-area-inset-top))}#gnk-floating-menu .gnk-home-button,#gnk-floating-menu>.gnk-floating-actions>button{height:44px;padding:0 16px}#gnk-floating-menu .gnk-top-language{height:42px;padding:0 8px;gap:2px}#gnk-floating-menu .gnk-top-language a{min-width:25px;height:28px;padding:0 4px;font-size:11px}#gnk-floating-menu nav{top:50px;width:min(390px,calc(100vw - 20px));max-height:calc(100vh - 86px);max-height:calc(100dvh - 86px - env(safe-area-inset-bottom))}.site-header .gnk-language-switch{margin-left:auto}}
    @media(prefers-reduced-motion:reduce){#gnk-event-bar .gnk-event-message{animation:none;padding-left:18px;white-space:normal;text-align:center;width:100%}}
  `;
  document.head.appendChild(style);
  harmonizeStaticHeader();

  const eventBar=document.createElement('div');eventBar.id='gnk-event-bar';eventBar.setAttribute('role','banner');
  const eventTrack=document.createElement('div');eventTrack.className='gnk-event-track';
  const eventMessage=document.createElement('div');eventMessage.className='gnk-event-message';
  eventMessage.textContent='THE CODE · NEW YORK · 7 OCTOBER 2026 · CODE ACTIVATION AT 11:30 AM ET · GNK ASG / GNK DINAMO LTD. GROUP';
  eventTrack.appendChild(eventMessage);eventBar.appendChild(eventTrack);document.body.appendChild(eventBar);

  const wrap=document.createElement('div');wrap.id='gnk-floating-menu';
  const actions=document.createElement('div');actions.className='gnk-floating-actions';
  const home=document.createElement('a');home.href=language()==='en'?'/en/':'/';home.className='gnk-home-button';home.textContent='HOME';
  const languageSwitch=document.createElement('div');languageSwitch.className='gnk-top-language';languageSwitch.setAttribute('aria-label','Odabir jezika / Language selection');
  const hr=document.createElement('a');hr.href='/';hr.textContent='HR';hr.lang='hr';hr.hreflang='hr';hr.setAttribute('aria-label','Hrvatski');
  const en=document.createElement('a');en.href='/en/';en.textContent='EN';en.lang='en';en.hreflang='en';en.setAttribute('aria-label','English');
  if(language()==='hr')hr.setAttribute('aria-current','page');else en.setAttribute('aria-current','page');
  const languageSeparator=document.createElement('span');languageSeparator.className='gnk-top-language-separator';languageSeparator.textContent='/';languageSeparator.setAttribute('aria-hidden','true');
  languageSwitch.append(hr,languageSeparator,en);
  const button=document.createElement('button');button.type='button';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','gnk-floating-nav');button.setAttribute('aria-label',language()==='en'?'Open main menu':'Otvori glavni izbornik');button.textContent='MENU';
  actions.append(home,languageSwitch,button);

  const nav=document.createElement('nav');nav.id='gnk-floating-nav';nav.tabIndex=-1;nav.setAttribute('aria-label','Glavni padajući menu / Main dropdown menu');
  const current=normalize(location.pathname);
  for(const section of sections){
    const group=document.createElement('section');group.className='gnk-menu-group'+(section.featured?' featured':'');
    const label=document.createElement('span');label.className='gnk-menu-label';label.textContent=section.label;
    const links=document.createElement('div');links.className='gnk-menu-links';
    for(const item of section.items){
      const targetHref=hrefOf(item);
      const a=document.createElement('a');a.href=targetHref;
      const text=document.createElement('span');text.textContent=labelOf(item);
      const meta=document.createElement('span');meta.className='gnk-menu-meta';a.append(text,meta);
      if(normalize(targetHref)===current)a.setAttribute('aria-current','page');
      if(section.protected||item.protected){a.rel='nofollow';a.dataset.protected='true';}
      if(item.status)a.dataset.status=item.status;
      links.appendChild(a);
    }
    group.append(label,links);nav.appendChild(group);
  }

  let restoreFocus=null;
  const focusables=()=>[...nav.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')];
  const close=({restore=true}={})=>{
    if(!wrap.classList.contains('open'))return;
    wrap.classList.remove('open');
    document.body.classList.remove('gnk-menu-open');
    button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-label',language()==='en'?'Open main menu':'Otvori glavni izbornik');
    button.textContent='MENU';
    if(restore&&restoreFocus&&document.contains(restoreFocus))restoreFocus.focus();
    restoreFocus=null;
  };
  const open=()=>{
    restoreFocus=document.activeElement;
    wrap.classList.add('open');
    document.body.classList.add('gnk-menu-open');
    button.setAttribute('aria-expanded','true');
    button.setAttribute('aria-label',language()==='en'?'Close main menu':'Zatvori glavni izbornik');
    button.textContent='CLOSE / ZATVORI';
    const first=focusables()[0];
    if(first)first.focus();else nav.focus();
  };
  button.addEventListener('click',()=>wrap.classList.contains('open')?close():open());
  nav.addEventListener('click',event=>{if(event.target.closest('a'))close({restore:false});});
  document.addEventListener('keydown',event=>{
    if(!wrap.classList.contains('open'))return;
    if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key!=='Tab')return;
    const items=focusables();
    if(!items.length){event.preventDefault();nav.focus();return;}
    const first=items[0],last=items[items.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  document.addEventListener('click',event=>{if(wrap.classList.contains('open')&&!wrap.contains(event.target))close();});
  window.addEventListener('pagehide',()=>document.body.classList.remove('gnk-menu-open'));
  wrap.append(actions,nav);document.body.appendChild(wrap);
})();