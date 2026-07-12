(()=>{
  const path=(location.pathname.replace(/\/+$/,'')||'/');
  if(path==='/'||path==='/en'||document.getElementById('gnk-compact-menu'))return;
  if(path.startsWith('/admin')||path.startsWith('/mail-studio')||path.startsWith('/campaign-mailer')||path.startsWith('/email-status')||path.startsWith('/operator-dashboard')||path.startsWith('/worker-ops')||path.startsWith('/digital-headquarters')||path.startsWith('/media-registration-admin')||path.startsWith('/webmail'))return;

  const english=document.documentElement.lang?.toLowerCase().startsWith('en')||path.startsWith('/en/');
  const routes=[
    ['HOME',english?'/en/':'/'],
    [english?'About':'O nama',english?'/en/about/':'/about/'],
    [english?'Projects':'Projekti',english?'/en/projects/':'/projects/'],
    [english?'Markets':'Tržišta',english?'/en/markets/':'/trzista/'],
    ['Newsroom',english?'/en/newsroom/':'/newsroom/'],
    [english?'Reports':'Izvješća',english?'/en/reports/':'/reports/'],
    ['THE CODE',english?'/en/the-code/':'/the-code/'],
    [english?'Contact':'Kontakt',english?'/en/contact/':'/contact/']
  ];

  document.documentElement.classList.add('gnk-compact-shell');
  const style=document.createElement('style');
  style.textContent=`
    .gnk-compact-shell .site-header,.gnk-compact-shell body>.top,.gnk-compact-shell main>.top{display:none!important}
    #gnk-compact-menu{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:99999;font-family:Arial,sans-serif}
    #gnk-compact-menu *{box-sizing:border-box}
    #gnk-compact-menu .gnk-compact-actions{display:flex;gap:7px;align-items:center;padding:7px;border:1px solid #8f6b2f;border-radius:999px;background:rgba(13,10,8,.94);backdrop-filter:blur(14px);box-shadow:0 14px 38px rgba(0,0,0,.52)}
    #gnk-compact-menu a,#gnk-compact-menu button{height:36px;min-width:44px;padding:0 12px;border:1px solid #8f6b2f;border-radius:999px;background:#17100b;color:#e7c878;text-decoration:none;font:800 11px/1 Arial,sans-serif;letter-spacing:.06em;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
    #gnk-compact-menu a:hover,#gnk-compact-menu button:hover,#gnk-compact-menu a:focus-visible,#gnk-compact-menu button:focus-visible{background:#2a180e;border-color:#d8b66a;color:#fff0b5;outline:none}
    #gnk-compact-menu .gnk-lang{display:flex;align-items:center;gap:2px;height:36px;padding:0 5px;border:1px solid #8f6b2f;border-radius:999px;background:#100a07}
    #gnk-compact-menu .gnk-lang a{height:26px;min-width:28px;padding:0 6px;border:0;background:transparent;font-size:10px}
    #gnk-compact-menu .gnk-lang a[aria-current="page"]{background:#d8b66a;color:#211308}
    #gnk-compact-menu nav{display:none;position:absolute;right:0;bottom:58px;width:min(320px,calc(100vw - 24px));max-height:min(72vh,540px);overflow:auto;padding:10px;background:rgba(13,11,9,.98);border:1px solid #8f6b2f;border-radius:16px;box-shadow:0 18px 48px rgba(0,0,0,.62)}
    #gnk-compact-menu.open nav{display:grid;gap:7px}
    #gnk-compact-menu nav a{justify-content:flex-start;width:100%;height:40px;border-radius:10px;background:#17130f;color:#f5f2ea;box-shadow:none}
    #gnk-compact-menu nav a:hover,#gnk-compact-menu nav a:focus-visible{color:#f0d28c;border-color:#d8b66a}
    @media(max-width:700px){#gnk-compact-menu{right:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px))}#gnk-compact-menu .gnk-compact-actions{gap:5px;padding:5px}#gnk-compact-menu a,#gnk-compact-menu button{height:34px;padding:0 10px;font-size:10px}#gnk-compact-menu .gnk-lang{height:34px}#gnk-compact-menu nav{bottom:52px}}
  `;
  document.head.appendChild(style);

  const wrap=document.createElement('div');wrap.id='gnk-compact-menu';
  const actions=document.createElement('div');actions.className='gnk-compact-actions';
  const home=document.createElement('a');home.className='gnk-home';home.href=english?'/en/':'/';home.textContent='HOME';
  const lang=document.createElement('div');lang.className='gnk-lang';lang.setAttribute('aria-label','Odabir jezika / Language selection');
  const hr=document.createElement('a');hr.href='/';hr.textContent='HR';hr.lang='hr';
  const en=document.createElement('a');en.href='/en/';en.textContent='EN';en.lang='en';
  (english?en:hr).setAttribute('aria-current','page');lang.append(hr,en);
  const button=document.createElement('button');button.type='button';button.textContent='MENU';button.setAttribute('aria-expanded','false');button.setAttribute('aria-label',english?'Open menu':'Otvori izbornik');
  const nav=document.createElement('nav');nav.setAttribute('aria-label','Glavna navigacija / Main navigation');
  routes.forEach(([label,href])=>{const a=document.createElement('a');a.href=href;a.textContent=label;nav.appendChild(a);});
  const close=()=>{wrap.classList.remove('open');button.setAttribute('aria-expanded','false');button.textContent='MENU';};
  button.addEventListener('click',()=>{const open=wrap.classList.toggle('open');button.setAttribute('aria-expanded',String(open));button.textContent=open?(english?'CLOSE':'ZATVORI'):'MENU';});
  document.addEventListener('click',event=>{if(wrap.classList.contains('open')&&!wrap.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
  actions.append(home,lang,button);wrap.append(actions,nav);document.body.appendChild(wrap);
})();