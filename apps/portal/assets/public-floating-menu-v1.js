(()=>{
  if(document.getElementById('gnk-floating-menu'))return;

  const sections=[
    {
      label:'Javno',
      items:[
        ['Početna','/'],
        ['O nama','/about/'],
        ['Projekti','/projects/'],
        ['Workeri','/workers/'],
        ['THE CODE','/the-code/'],
        ['Vijesti','/news/'],
        ['Objave','/objave/'],
        ['Medijske prijave','/media-application/'],
        ['Kontakt','/contact/']
      ]
    },
    {
      label:'Zaštićeno',
      items:[
        ['Admin centar','/admin-center/'],
        ['Mail Studio','/mail-studio/'],
        ['Worker Operations','/worker-ops/']
      ]
    }
  ];

  const normalize=value=>{
    const path=String(value||'/').split('?')[0].split('#')[0].replace(/\/+$/,'');
    return path||'/';
  };

  const style=document.createElement('style');
  style.textContent=`
    #gnk-floating-menu{position:fixed;right:18px;bottom:18px;z-index:99999;font-family:Arial,sans-serif}
    #gnk-floating-menu *{box-sizing:border-box}
    #gnk-floating-menu>button{width:60px;height:60px;border-radius:50%;border:1px solid #d8b66a;background:#111;color:#d8b66a;font-weight:900;box-shadow:0 12px 38px rgba(0,0,0,.45);cursor:pointer}
    #gnk-floating-menu nav{display:none;position:absolute;right:0;bottom:70px;width:min(330px,calc(100vw - 28px));max-height:min(72vh,650px);overflow:auto;padding:12px;background:#0b0b0b;border:1px solid #3b3120;border-radius:18px;box-shadow:0 16px 50px rgba(0,0,0,.5)}
    #gnk-floating-menu.open nav{display:block}
    #gnk-floating-menu .gnk-menu-group+ .gnk-menu-group{margin-top:12px;padding-top:12px;border-top:1px solid #2d271d}
    #gnk-floating-menu .gnk-menu-label{display:block;padding:0 10px 7px;color:#d8b66a;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
    #gnk-floating-menu .gnk-menu-links{display:grid;gap:6px}
    #gnk-floating-menu a{display:block;padding:11px 13px;border-radius:11px;color:#f5f2ea;text-decoration:none;background:#12100c;border:1px solid transparent}
    #gnk-floating-menu a:hover,#gnk-floating-menu a:focus{border-color:#d8b66a;color:#d8b66a;outline:none}
    #gnk-floating-menu a[aria-current="page"]{border-color:#d8b66a;color:#d8b66a;background:#1a160e}
    #gnk-floating-menu a[data-protected="true"]::after{content:'ZAŠTIĆENO';float:right;color:#9c927f;font-size:9px;letter-spacing:.08em;margin-left:10px}
    @media(max-width:700px){#gnk-floating-menu{right:12px;bottom:12px}#gnk-floating-menu>button{width:54px;height:54px}#gnk-floating-menu nav{bottom:64px}}
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

    for(const [text,href] of section.items){
      const a=document.createElement('a');
      a.href=href;
      a.textContent=text;
      if(normalize(href)===current)a.setAttribute('aria-current','page');
      if(section.label==='Zaštićeno'){
        a.rel='nofollow';
        a.dataset.protected='true';
      }
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

  nav.addEventListener('click',event=>{
    if(event.target.closest('a'))close();
  });

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')close();
  });

  document.addEventListener('click',event=>{
    if(!wrap.contains(event.target))close();
  });

  wrap.append(button,nav);
  document.body.appendChild(wrap);
})();
