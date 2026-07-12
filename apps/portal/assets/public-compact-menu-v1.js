(()=>{
  const path=(location.pathname.replace(/\/+$/,'')||'/');
  if(path==='/'||path==='/en'||document.getElementById('gnk-compact-menu'))return;
  if(path.startsWith('/admin')||path.startsWith('/mail-studio')||path.startsWith('/campaign-mailer')||path.startsWith('/email-status')||path.startsWith('/operator-dashboard')||path.startsWith('/worker-ops')||path.startsWith('/digital-headquarters')||path.startsWith('/media-registration-admin')||path.startsWith('/webmail'))return;

  const english=document.documentElement.lang?.toLowerCase().startsWith('en')||path.startsWith('/en/');
  const routes=[
    ['HOME',english?'/en/':'/'],
    [english?'About':'O nama',english?'/en/about/':'/about/'],
    [english?'Projects':'Projekti',english?'/en/projects/':'/projects/'],
    [english?'Markets':'Tržišta',english?'/en/trzista/':'/trzista/'],
    ['Newsroom',english?'/en/newsroom/':'/newsroom/'],
    [english?'Reports':'Izvješća',english?'/en/reports/':'/reports/'],
    ['THE CODE',english?'/en/the-code/':'/the-code/'],
    [english?'Contact':'Kontakt',english?'/en/contact/':'/contact/']
  ];

  const style=document.createElement('style');
  style.textContent=`
    #gnk-compact-menu{position:fixed;right:14px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:99999;font-family:Arial,sans-serif}
    #gnk-compact-menu *{box-sizing:border-box}
    #gnk-compact-menu .gnk-compact-actions{display:flex;gap:7px;align-items:center;justify-content:flex-end}
    #gnk-compact-menu a,#gnk-compact-menu button{height:36px;min-width:44px;padding:0 11px;border:1px solid #8f6b2f;border-radius:999px;background:#17100b;color:#d8b66a;text-decoration:none;font:800 11px/1 Arial,sans-serif;letter-spacing:.06em;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 7px 22px rgba(0,0,0,.42)}
    #gnk-compact-menu a:hover,#gnk-compact-menu button:hover,#gnk-compact-menu a:focus-visible,#gnk-compact-menu button:focus-visible{background:#2a180e;border-color:#d8b66a;color:#f3dc9c;outline:none}
    #gnk-compact-menu .gnk-lang{display:flex;align-items:center;gap:2px;height:36px;padding:0 5px;border:1px solid #8f6b2f;border-radius:999px;background:#120b07;box-shadow:0 7px 22px rgba(0,0,0,.42)}
    #gnk-compact-menu .gnk-lang a{height:26px;min-width:27px;padding:0 5px;border:0;box-shadow:none;background:transparent;font-size:10px}
    #gnk-compact-menu .gnk-lang a[aria-current="page"]{background:#d8b66a;color:#211308}
    #gnk-compact-menu nav{display:none;position:absolute;right:0;bottom:46px;width:min(310px,calc(100vw - 28px));max-height:min(68vh,520px);overflow:auto;padding:10px;background:#0d0b09;border:1px solid #8f6b2f;border-radius:14px;box-shadow:0 16px 44px rgba(0,0,0,.58)}
    #gnk-compact-menu.open nav{display:grid;gap:6px}
    #gnk-compact-menu nav a{justify-content:flex-start;width:100%;height:38px;border-radius:9px;background:#15110d;box-shadow:none}
    @media(max-width:700px){#gnk-compact-menu{right:10px;bottom:calc(12px + env(safe-area-inset-bottom,0px))}#gnk-compact-menu .gnk-home{display:none}#gnk-compact-menu a,#gnk-compact-menu button{height:34px;padding:0 10px}#gnk-compact-menu .gnk-lang{height:34px}#gnk-compact-menu nav{bottom:43px}}
  `;
  document.head.appendChild(style);

  const wrap=document.createElement('div');wrap.id='gnk-compact-menu';
  const actions=document.createElement('div');actions.className='gnk-compact-actions';
  const home=document.createElement('a');home.className='gnk-home';home.href=english?'/en/':'/';home.textContent='HOME';
  const lang=document.createElement('div');lang.className='gnk-lang';lang.setAttribute('aria-label','Odabir jezika / Language selection');
  const hr=document.createElement('a');hr.href='/';hr.textContent='HR';
  const en=document.createElement('a');en.href='/en/';en.textContent='EN';
  (english?en:hr).setAttribute('aria-current','page');lang.append(hr,en);
  const button=document.createElement('button');button.type='button';button.textContent='MENU';button.setAttribute('aria-expanded','false');
  const nav=document.createElement('nav');nav.setAttribute('aria-label','Glavna navigacija / Main navigation');
  routes.forEach(([label,href])=>{const a=document.createElement('a');a.href=href;a.textContent=label;nav.appendChild(a);});
  button.addEventListener('click',()=>{const open=wrap.classList.toggle('open');button.setAttribute('aria-expanded',String(open));button.textContent=open?'CLOSE':'MENU';});
  document.addEventListener('click',event=>{if(wrap.classList.contains('open')&&!wrap.contains(event.target)){wrap.classList.remove('open');button.setAttribute('aria-expanded','false');button.textContent='MENU';}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){wrap.classList.remove('open');button.setAttribute('aria-expanded','false');button.textContent='MENU';}});
  actions.append(home,lang,button);wrap.append(actions,nav);document.body.appendChild(wrap);
})();