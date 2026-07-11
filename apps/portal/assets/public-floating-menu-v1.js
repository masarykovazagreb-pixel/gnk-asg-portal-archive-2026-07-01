(()=>{
  if(document.getElementById('gnk-floating-menu'))return;

  const sections=[
    {
      label:'Portal',
      items:[
        {text:'Početna',href:'/'},
        {text:'O nama',href:'/about/'},
        {text:'Projekti',href:'/projects/'},
        {text:'Strateški roadmap',href:'/projects/roadmap/'},
        {text:'Grupna mreža',href:'/group-network/'},
        {text:'Financije',href:'/financije/'},
        {text:'THE CODE',href:'/the-code/'},
        {text:'Workeri',href:'/workers/'},
        {text:'Vijesti',href:'/news/'},
        {text:'Objave',href:'/objave/'},
        {text:'Kontakt',href:'/contact/'}
      ]
    },
    {
      label:'Admin i komunikacije',
      protected:true,
      items:[
        {text:'Admin centar',href:'/admin-center/'},
        {text:'Mail Studio',href:'/mail-studio/'},
        {text:'Campaign Mailer',href:'/campaign-mailer/',status:'zaključano'},
        {text:'Pretraga mailova',href:'/admin-center/mail-search/'},
        {text:'Kontaktni slučajevi',href:'/admin-center/contacts/'},
        {text:'PDF centar',href:'/admin-center/pdf/'},
        {text:'Statusi mailova',href:'/email-status/'}
      ]
    },
    {
      label:'Mediji i sadržaj',
      items:[
        {text:'Medijske prijave',href:'/media-application/'},
        {text:'Media Registration Admin',href:'/media-registration-admin/',protected:true},
        {text:'News Auto Publication',href:'/admin-center/news-publication/',protected:true},
        {text:'THE CODE OS',href:'/the-code-os/',status:'uskoro'},
        {text:'Interni THE CODE OS',href:'/admin-center/the-code-os/',protected:true,status:'uskoro'}
      ]
    },
    {
      label:'Operacije i sustav',
      protected:true,
      items:[
        {text:'Worker Operations',href:'/worker-ops/'},
        {text:'Operator Dashboard',href:'/operator-dashboard/'},
        {text:'Digital Headquarters',href:'/digital-headquarters/'},
        {text:'Morning Review',href:'/admin-center/morning-review/',status:'uskoro'},
        {text:'Publish Queue',href:'/admin-center/publish-queue/',status:'uskoro'},
        {text:'Izvještaji',href:'/admin-center/reports/',status:'uskoro'},
        {text:'Postavke',href:'/admin-center/settings/',status:'uskoro'}
      ]
    }
  ];

  const normalize=value=>{
    const path=String(value||'/').split('?')[0].split('#')[0].replace(/\/+$/,'');
    return path||'/';
  };

  const style=document.createElement('style');
  style.textContent=`
    #gnk-floating-menu{position:fixed;right:18px;top:50%;transform:translateY(-50%);z-index:99999;font-family:Arial,sans-serif}
    #gnk-floating-menu *{box-sizing:border-box}
    #gnk-floating-menu>button{width:62px;height:62px;border-radius:50%;border:1px solid #d8b66a;background:#111;color:#d8b66a;font-weight:900;box-shadow:0 12px 38px rgba(0,0,0,.45);cursor:pointer}
    #gnk-floating-menu nav{display:none;position:absolute;right:74px;top:50%;transform:translateY(-50%);width:min(370px,calc(100vw - 110px));max-height:min(82vh,760px);overflow:auto;padding:14px;background:#0b0b0b;border:1px solid #3b3120;border-radius:18px;box-shadow:0 16px 50px rgba(0,0,0,.5)}
    #gnk-floating-menu.open nav{display:block}
    #gnk-floating-menu .gnk-menu-group+.gnk-menu-group{margin-top:13px;padding-top:13px;border-top:1px solid #2d271d}
    #gnk-floating-menu .gnk-menu-label{display:block;padding:0 10px 7px;color:#d8b66a;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
    #gnk-floating-menu .gnk-menu-links{display:grid;gap:6px}
    #gnk-floating-menu a{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 13px;border-radius:11px;color:#f5f2ea;text-decoration:none;background:#12100c;border:1px solid transparent}
    #gnk-floating-menu a:hover,#gnk-floating-menu a:focus{border-color:#d8b66a;color:#d8b66a;outline:none}
    #gnk-floating-menu a[aria-current="page"]{border-color:#d8b66a;color:#d8b66a;background:#1a160e}
    #gnk-floating-menu .gnk-menu-meta{color:#9c927f;font-size:9px;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
    #gnk-floating-menu a[data-protected="true"] .gnk-menu-meta::before{content:'ZAŠTIĆENO';}
    #gnk-floating-menu a[data-status] .gnk-menu-meta::after{content:attr(data-status);margin-left:8px;color:#d8b66a}
    @media(max-width:700px){#gnk-floating-menu{right:12px;top:auto;bottom:12px;transform:none}#gnk-floating-menu>button{width:56px;height:56px}#gnk-floating-menu nav{right:0;top:auto;bottom:66px;transform:none;width:min(350px,calc(100vw - 24px));max-height:74vh}}
  `;
  document.head.appendChild(style);

  const wrap=document.createElement('div');
  wrap.id='gnk-floating-menu';

  const button=document.createElement('button');
  button.type='button';
  button.setAttribute('aria-expanded','false');
  button.setAttribute('aria-controls','gnk-floating-nav');
  button.setAttribute('aria-label','Otvori izbornik');
  button.textContent='MENI';

  const nav=document.createElement('nav');
  nav.id='gnk-floating-nav';
  nav.setAttribute('aria-label','Glavni brzi izbornik');

  const current=normalize(location.pathname);

  for(const section of sections){
    const group=document.createElement('section');
    group.className='gnk-menu-group';

    const label=document.createElement('span');
    label.className='gnk-menu-label';
    label.textContent=section.label;

    const links=document.createElement('div');
    links.className='gnk-menu-links';

    for(const item of section.items){
      const a=document.createElement('a');
      a.href=item.href;
      const text=document.createElement('span');
      text.textContent=item.text;
      const meta=document.createElement('span');
      meta.className='gnk-menu-meta';
      a.append(text,meta);
      if(normalize(item.href)===current)a.setAttribute('aria-current','page');
      if(section.protected||item.protected){a.rel='nofollow';a.dataset.protected='true';}
      if(item.status)a.dataset.status=item.status;
      links.appendChild(a);
    }

    group.append(label,links);
    nav.appendChild(group);
  }

  const close=()=>{
    wrap.classList.remove('open');
    button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-label','Otvori izbornik');
    button.textContent='MENI';
  };

  button.addEventListener('click',()=>{
    const open=wrap.classList.toggle('open');
    button.setAttribute('aria-expanded',String(open));
    button.setAttribute('aria-label',open?'Zatvori izbornik':'Otvori izbornik');
    button.textContent=open?'ZATVORI':'MENI';
  });

  nav.addEventListener('click',event=>{if(event.target.closest('a'))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
  document.addEventListener('click',event=>{if(!wrap.contains(event.target))close();});

  wrap.append(button,nav);
  document.body.appendChild(wrap);
})();
