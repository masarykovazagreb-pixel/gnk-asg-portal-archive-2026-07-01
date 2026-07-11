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
        {text:'Početna',textEn:'Home',href:'/'},{text:'O nama',textEn:'About',href:'/about/'},{text:'Nermin Sefić',textEn:'Nermin Sefić',href:'/nermin-sefic/'},{text:'Projekti',textEn:'Projects',href:'/projects/'},{text:'Strateški roadmap',textEn:'Strategic roadmap',href:'/projects/roadmap/'},{text:'Tržišta',textEn:'Markets',href:'/trzista/'},{text:'Grupna mreža',textEn:'Group network',href:'/group-network/'},{text:'Financije',textEn:'Finance',href:'/financije/'},{text:'Tehnologija',textEn:'Technology',href:'/tehnologija/'},{text:'Intelligence Desk',textEn:'Intelligence Desk',href:'/intelligence-desk/'},{text:'Registri',textEn:'Registers',href:'/registri/'},{text:'Sadržaj',textEn:'Content',href:'/sadrzaj/'},{text:'Teme',textEn:'Topics',href:'/teme/'},{text:'THE CODE',textEn:'THE CODE',href:'/the-code/'},{text:'Workeri',textEn:'Workers',href:'/workers/'},{text:'Vijesti',textEn:'News',href:'/news/'},{text:'Objave',textEn:'Publications',href:'/objave/'},{text:'Medijske prijave',textEn:'Media applications',href:'/media-application/'},{text:'Kontakt',textEn:'Contact',href:'/contact/'},{text:'English portal',textEn:'English portal',href:'/en/'}
      ]
    },
    {
      label:'Mediji i objava / Media & publishing',
      items:[
        {text:'News Auto Publication',textEn:'News Auto Publication',href:'/admin-center/news-publication/',protected:true},{text:'Campaign Mailer',textEn:'Campaign Mailer',href:'/campaign-mailer/',protected:true,status:'zaključano / locked'}
      ]
    }
  ];

  const normalize=value=>{const path=String(value||'/').split('?')[0].split('#')[0].replace(/\/+$/,'');return path||'/';};
  const isEnglish=()=>document.documentElement.lang?.toLowerCase().startsWith('en')||location.pathname==='/en'||location.pathname.startsWith('/en/');
  const language=()=>isEnglish()?'en':'hr';
  const labelOf=item=>language()==='en'?(item.textEn||item.text):item.text;

  const style=document.createElement('style');
  style.textContent=`
    #gnk-floating-menu{position:fixed;right:18px;top:18px;z-index:99999;font-family:Arial,sans-serif}
    #gnk-floating-menu *{box-sizing:border-box}
    #gnk-floating-menu .gnk-floating-actions{display:flex;gap:8px;justify-content:flex-end}
    #gnk-floating-menu .gnk-home-button,#gnk-floating-menu>.gnk-floating-actions>button{height:46px;padding:0 18px;border-radius:999px;border:1px solid #d8b66a;background:#111;color:#d8b66a;font-weight:900;letter-spacing:.08em;box-shadow:0 12px 38px rgba(0,0,0,.45);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
    #gnk-floating-menu nav{display:none;position:absolute;right:0;top:56px;width:min(430px,calc(100vw - 28px));max-height:calc(100vh - 86px);overflow:auto;padding:14px;background:#0b0b0b;border:1px solid #3b3120;border-radius:18px;box-shadow:0 16px 50px rgba(0,0,0,.5)}
    #gnk-floating-menu.open nav{display:block}
    #gnk-floating-menu .gnk-menu-group+.gnk-menu-group{margin-top:13px;padding-top:13px;border-top:1px solid #2d271d}
    #gnk-floating-menu .gnk-menu-group.featured{padding:12px;border:1px solid #d8b66a;border-radius:14px;background:linear-gradient(145deg,#1a160e,#0d0d0d)}
    #gnk-floating-menu .gnk-menu-label{display:block;padding:0 10px 7px;color:#d8b66a;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
    #gnk-floating-menu .gnk-menu-links{display:grid;gap:6px}
    #gnk-floating-menu nav a{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 13px;border-radius:11px;color:#f5f2ea;text-decoration:none;background:#12100c;border:1px solid transparent}
    #gnk-floating-menu nav a:hover,#gnk-floating-menu nav a:focus,#gnk-floating-menu nav a[aria-current="page"]{border-color:#d8b66a;color:#d8b66a;outline:none}
    #gnk-floating-menu .gnk-menu-group.featured a:first-child{background:linear-gradient(135deg,#b98b2d,#f4d37a);color:#07101f;font-weight:900}
    #gnk-floating-menu .gnk-menu-meta{color:#9c927f;font-size:9px;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
    #gnk-floating-menu nav a[data-protected="true"] .gnk-menu-meta::before{content:'ZAŠTIĆENO / PROTECTED';}
    #gnk-floating-menu nav a[data-status] .gnk-menu-meta::after{content:attr(data-status);margin-left:8px;color:#d8b66a}
    @media(max-width:700px){#gnk-floating-menu{right:12px;top:12px}#gnk-floating-menu nav{top:52px;width:min(390px,calc(100vw - 24px));max-height:calc(100vh - 76px)}}
  `;
  document.head.appendChild(style);

  const wrap=document.createElement('div');wrap.id='gnk-floating-menu';
  const actions=document.createElement('div');actions.className='gnk-floating-actions';
  const home=document.createElement('a');home.href='/';home.className='gnk-home-button';home.textContent='HOME';
  const button=document.createElement('button');button.type='button';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','gnk-floating-nav');button.textContent='MENU';
  actions.append(home,button);

  const nav=document.createElement('nav');nav.id='gnk-floating-nav';nav.setAttribute('aria-label','Glavni padajući menu / Main dropdown menu');
  const current=normalize(location.pathname);
  for(const section of sections){
    const group=document.createElement('section');group.className='gnk-menu-group'+(section.featured?' featured':'');
    const label=document.createElement('span');label.className='gnk-menu-label';label.textContent=section.label;
    const links=document.createElement('div');links.className='gnk-menu-links';
    for(const item of section.items){
      const a=document.createElement('a');a.href=item.href;
      const text=document.createElement('span');text.textContent=labelOf(item);
      const meta=document.createElement('span');meta.className='gnk-menu-meta';a.append(text,meta);
      if(normalize(item.href)===current)a.setAttribute('aria-current','page');
      if(section.protected||item.protected){a.rel='nofollow';a.dataset.protected='true';}
      if(item.status)a.dataset.status=item.status;
      links.appendChild(a);
    }
    group.append(label,links);nav.appendChild(group);
  }

  const close=()=>{wrap.classList.remove('open');button.setAttribute('aria-expanded','false');button.textContent='MENU';};
  button.addEventListener('click',()=>{const open=wrap.classList.toggle('open');button.setAttribute('aria-expanded',String(open));button.textContent=open?'CLOSE / ZATVORI':'MENU';});
  nav.addEventListener('click',event=>{if(event.target.closest('a'))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
  document.addEventListener('click',event=>{if(!wrap.contains(event.target))close();});
  wrap.append(actions,nav);document.body.appendChild(wrap);
})();