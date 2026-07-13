(()=>{
  'use strict';
  if(window.__GNK_COMPACT_MENU_V4__)return;
  window.__GNK_COMPACT_MENU_V4__=true;
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const protectedPrefixes=['/admin','/admin-center','/mail-studio','/campaign-mailer','/email-status','/operator-dashboard','/worker-ops','/digital-headquarters','/media-registration-admin','/webmail'];
  const protectedPage=protectedPrefixes.some(prefix=>path===prefix||path.startsWith(prefix+'/'));
  const english=document.documentElement.lang?.toLowerCase().startsWith('en')||path==='/en'||path.startsWith('/en/');
  const route=(hr,en)=>english?(en||hr):hr;
  const GOLD_LOGO='/assets/logo-gnk-asg-gold.svg?v=20260713-canonical-gold';
  const EVENT_TEXT='THE CODE · NEW YORK · 7 OCTOBER 2026 · 11:30 AM ET';
  const sections=[
    {label:english?'PUBLIC PORTAL':'JAVNI PORTAL',items:[
      ['Početna','Home','/','/en/'],['O nama','About','/about/','/en/about/'],['Nermin Sefić','Nermin Sefić','/nermin-sefic/','/en/nermin-sefic/'],['Grupna mreža','Group network','/group-network/','/en/group-network/'],['Financije','Finance','/financije/','/en/finance/'],['Newsroom','Newsroom','/newsroom/','/en/newsroom/'],['Objave','Publications','/objave/','/en/publications/'],['Analize','Analyses','/analize/','/en/analyses/'],['Komentari','Commentary','/komentari/','/en/commentary/'],['Tržišta','Markets','/trzista/','/en/markets/'],['Projekti','Projects','/projects/','/en/projects/'],['Strateški roadmap','Strategic roadmap','/projects/roadmap/','/en/projects/roadmap/'],['Izvješća','Reports','/reports/','/en/reports/'],['Knowledge Center','Knowledge Center','/knowledge-center/','/en/knowledge-center/'],['Tehnologija','Technology','/tehnologija/','/en/technology/'],['THE CODE','THE CODE','/the-code/','/en/the-code/'],['Medijske prijave','Media applications','/media-application/','/media-application/?lang=en'],['Kontakt','Contact','/contact/','/en/contact/']
    ]},
    {label:'ADMIN / ADMIN CENTER',protected:true,items:[
      ['ADMIN — svi moduli','ADMIN — all modules','/admin-center/'],['Mail Studio','Mail Studio','/mail-studio/'],['Statusi mailova','Email status','/email-status/'],['Pretraga mailova','Mail search','/admin-center/mail-search/'],['Kontaktni slučajevi','Contact cases','/admin-center/contacts/'],['PDF centar','PDF center','/admin-center/pdf/'],['Media Registration Admin','Media Registration Admin','/media-registration-admin/'],['Worker Operations','Worker Operations','/worker-ops/'],['Operator Dashboard','Operator Dashboard','/operator-dashboard/']
    ]}
  ];
  const normalizeLogos=()=>{
    document.querySelectorAll('img[src*="logo-gnk-asg"],img[data-gnk-asg-logo]').forEach(img=>{
      if(img.closest('#gnk-compact-strip'))return;
      if(img.src!==new URL(GOLD_LOGO,location.origin).href)img.src=GOLD_LOGO;
      img.alt='GNK ASG';img.dataset.gnkAsgLogo='canonical-gold';
    });
  };
  const purge=()=>{
    const selector=protectedPage?'#gnk-event-bar,#gnk-floating-menu,#gnk-floating-menu-v2,#gnk-public-ai-button,.public-floating-menu,.floating-menu,.menu-toggle,.nav-links':'#gnk-event-bar,#gnk-floating-menu,#gnk-floating-menu-v2,#gnk-public-ai-button,.public-floating-menu,.floating-menu,.site-header,.menu-toggle,.nav-links,body>header,main>.top,body>.top';
    document.querySelectorAll(selector).forEach(el=>{if(!el.closest('#gnk-compact-menu')&&!el.closest('#gnk-compact-strip'))el.remove();});
    document.querySelectorAll('script[src*="public-floating-menu"],script[data-gnk-floating-menu]').forEach(el=>el.remove());
    [...document.querySelectorAll('#gnk-compact-menu')].slice(1).forEach(el=>el.remove());
    [...document.querySelectorAll('#gnk-compact-strip')].slice(1).forEach(el=>el.remove());
    normalizeLogos();
  };
  purge();
  if(document.getElementById('gnk-compact-menu'))return;
  document.documentElement.classList.add('gnk-compact-shell');
  if(protectedPage)document.documentElement.classList.add('gnk-shared-menu-admin');
  const style=document.createElement('style');
  style.textContent=`:root{--gnk-top:62px}html.gnk-compact-shell body{padding-top:var(--gnk-top)!important}html.gnk-compact-shell:not(.gnk-shared-menu-admin) .site-header,html.gnk-compact-shell:not(.gnk-shared-menu-admin) .menu-toggle,html.gnk-compact-shell:not(.gnk-shared-menu-admin) .nav-links,html.gnk-compact-shell:not(.gnk-shared-menu-admin) body>header,html.gnk-compact-shell:not(.gnk-shared-menu-admin) main>.top,html.gnk-compact-shell:not(.gnk-shared-menu-admin) body>.top{display:none!important}
#gnk-compact-strip{position:fixed;inset:0 0 auto;height:62px;z-index:2147483000;background:#0c0a08;border-bottom:2px solid #b88a2f;box-shadow:0 8px 28px rgba(0,0,0,.30);color:#fff;font-family:Arial,Helvetica,sans-serif}
#gnk-compact-strip .inner{width:100%;height:100%;padding:0 12px;display:grid;grid-template-columns:150px minmax(80px,1fr) auto;align-items:center;gap:14px;overflow:hidden}
#gnk-compact-strip .brand{display:flex;align-items:center;height:56px;text-decoration:none;overflow:hidden}
#gnk-compact-strip .brand img{display:block;width:136px;height:54px;object-fit:contain;object-position:left center;border:0;background:transparent}
#gnk-compact-strip .event-window{position:relative;min-width:0;height:30px;overflow:hidden;mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
#gnk-compact-strip .event-track{position:absolute;top:0;left:0;display:flex;align-items:center;height:30px;min-width:max-content;color:#ead59d;font:800 11px/30px Arial,Helvetica,sans-serif;letter-spacing:.15em;text-transform:uppercase;white-space:nowrap;animation:gnkEventTicker 20s linear infinite;will-change:transform}
#gnk-compact-strip .event-track span{padding-right:100px}
@keyframes gnkEventTicker{from{transform:translateX(100vw)}to{transform:translateX(-100%)}}
#gnk-compact-menu{position:relative;z-index:2147483001;font-family:Arial,Helvetica,sans-serif}
#gnk-compact-menu *{box-sizing:border-box}
#gnk-compact-menu .actions{display:flex;align-items:center;gap:5px;height:44px;padding:4px;border:1px solid rgba(201,157,66,.72);border-radius:12px;background:#17130f;box-shadow:0 5px 18px rgba(0,0,0,.35)}
#gnk-compact-menu .action,#gnk-compact-menu .lang a,#gnk-compact-menu .toggle{height:34px;border:0;border-radius:8px;background:transparent;color:#f8edd2;text-decoration:none;font:900 10px/1 Arial,Helvetica,sans-serif;letter-spacing:.05em;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
#gnk-compact-menu .home{min-width:52px;padding:0 9px}
#gnk-compact-menu .lang{display:flex;align-items:center;gap:1px;border-left:1px solid #59462d;border-right:1px solid #59462d;padding:0 3px}
#gnk-compact-menu .lang a{width:34px}
#gnk-compact-menu .lang a[aria-current=page]{background:#c99d42;color:#17100a}
#gnk-compact-menu .toggle{min-width:88px;padding:0 12px;background:#b88a2f;color:#160f08}
#gnk-compact-menu .action:hover,#gnk-compact-menu .lang a:hover,#gnk-compact-menu .toggle:hover,#gnk-compact-menu .action:focus-visible,#gnk-compact-menu .lang a:focus-visible,#gnk-compact-menu .toggle:focus-visible{background:#2a2117;color:#fff;outline:2px solid #d1aa58;outline-offset:1px}
#gnk-compact-menu .toggle:hover,#gnk-compact-menu .toggle:focus-visible{background:#d6b567;color:#111}
#gnk-compact-menu nav{display:none;position:absolute;right:0;top:51px;width:min(760px,calc(100vw - 18px));max-height:calc(100vh - 78px);overflow:auto;background:#fff;border:1px solid #d9c99f;border-top:4px solid #b88a2f;border-radius:18px;box-shadow:0 28px 80px rgba(0,0,0,.42);color:#111}
#gnk-compact-menu.open nav{display:block}
#gnk-compact-menu .nav-head{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 20px 14px;border-bottom:1px solid #eee7d7}
#gnk-compact-menu .nav-title{font-size:18px;font-weight:900;color:#0b2345}
#gnk-compact-menu .nav-note{font-size:10px;font-weight:900;color:#8b6a2c;letter-spacing:.12em;text-transform:uppercase}
#gnk-compact-menu .nav-body{padding:17px}
#gnk-compact-menu .section+.section{margin-top:18px;padding-top:18px;border-top:1px solid #e7dfcf}
#gnk-compact-menu .label{display:block;padding:0 3px 10px;color:#7a5a20;font-size:11px;font-weight:900;letter-spacing:.12em}
#gnk-compact-menu .links{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
#gnk-compact-menu .section:last-child .links{grid-template-columns:repeat(2,minmax(0,1fr))}
#gnk-compact-menu .links a{justify-content:space-between;width:100%;min-height:44px;padding:10px 12px;background:#f7f8fa;color:#172033;border:1px solid #e6e8ec;border-radius:10px;font-size:13px;font-weight:700;line-height:1.25;text-decoration:none;text-align:left;display:flex;align-items:center;gap:8px}
#gnk-compact-menu .links a:hover,#gnk-compact-menu .links a:focus-visible{background:#fffaf0;border-color:#c99d42;color:#0b2345;outline:none}
#gnk-compact-menu .links a[aria-current=page]{background:#0b2345;color:#fff;border-color:#0b2345}
#gnk-compact-menu .protected{font-size:9px;font-weight:900;color:#8b6a2c;letter-spacing:.05em}
#gnk-compact-menu .links a[aria-current=page] .protected{color:#e8ca7c}
@media(max-width:820px){#gnk-compact-strip .inner{grid-template-columns:112px minmax(40px,1fr) auto;gap:8px;padding:0 7px}#gnk-compact-strip .brand img{width:106px}.gnk-compact-menu .links{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:620px){:root{--gnk-top:82px}#gnk-compact-strip{height:82px}#gnk-compact-strip .inner{height:54px;grid-template-columns:92px 1fr auto;padding:0 5px;gap:4px}#gnk-compact-strip .brand{height:52px}#gnk-compact-strip .brand img{width:88px;height:50px}#gnk-compact-strip .event-window{position:absolute;left:0;right:0;top:54px;height:28px;border-top:1px solid #3a2b18;background:#120f0b;mask-image:none;-webkit-mask-image:none}#gnk-compact-strip .event-track{height:28px;font-size:9px;line-height:28px}#gnk-compact-menu .actions{gap:2px;height:42px;padding:3px}#gnk-compact-menu .home{min-width:43px;padding:0 5px}#gnk-compact-menu .lang{padding:0 1px}#gnk-compact-menu .lang a{width:30px}#gnk-compact-menu .toggle{min-width:70px;padding:0 7px;font-size:9px}#gnk-compact-menu nav{top:48px;width:calc(100vw - 10px);max-height:calc(100vh - 92px)}#gnk-compact-menu .links,#gnk-compact-menu .section:last-child .links{grid-template-columns:1fr}#gnk-compact-menu .nav-head{padding:16px}#gnk-compact-menu .nav-body{padding:14px}}
@media(max-width:370px){#gnk-compact-strip .inner{grid-template-columns:72px 1fr auto}#gnk-compact-strip .brand img{width:70px}#gnk-compact-menu .home{min-width:39px;font-size:9px}#gnk-compact-menu .lang a{width:27px}#gnk-compact-menu .toggle{min-width:62px;padding:0 5px}}
@media(prefers-reduced-motion:reduce){#gnk-compact-strip .event-track{animation-duration:45s}#gnk-compact-menu *{scroll-behavior:auto!important}}`;
  document.head.appendChild(style);

  const strip=document.createElement('div');strip.id='gnk-compact-strip';
  const inner=document.createElement('div');inner.className='inner';
  const brand=document.createElement('a');brand.className='brand';brand.href=english?'/en/':'/';brand.setAttribute('aria-label','GNK ASG');
  const logo=document.createElement('img');logo.src=GOLD_LOGO;logo.alt='GNK ASG';logo.width=136;logo.height=54;logo.dataset.gnkAsgLogo='canonical-gold';brand.appendChild(logo);
  const eventWindow=document.createElement('div');eventWindow.className='event-window';eventWindow.setAttribute('aria-label',EVENT_TEXT);
  const eventTrack=document.createElement('div');eventTrack.className='event-track';eventTrack.innerHTML=`<span>${EVENT_TEXT}</span><span aria-hidden="true">${EVENT_TEXT}</span>`;eventWindow.appendChild(eventTrack);

  const wrap=document.createElement('div');wrap.id='gnk-compact-menu';
  const actions=document.createElement('div');actions.className='actions';
  const home=document.createElement('a');home.className='action home';home.href=english?'/en/':'/';home.textContent='HOME';home.setAttribute('aria-label',english?'Home':'Početna');
  const lang=document.createElement('div');lang.className='lang';
  const hr=document.createElement('a');hr.href='/';hr.textContent='HR';hr.setAttribute('aria-label','Hrvatski');
  const en=document.createElement('a');en.href='/en/';en.textContent='EN';en.setAttribute('aria-label','English');(english?en:hr).setAttribute('aria-current','page');lang.append(hr,en);
  const button=document.createElement('button');button.className='toggle';button.type='button';button.textContent=english?'MENU':'IZBORNIK';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','gnk-compact-nav');
  const nav=document.createElement('nav');nav.id='gnk-compact-nav';nav.setAttribute('aria-label',english?'Main navigation':'Glavna navigacija');
  const head=document.createElement('div');head.className='nav-head';
  const title=document.createElement('span');title.className='nav-title';title.textContent=english?'Navigation':'Navigacija';
  const note=document.createElement('span');note.className='nav-note';note.textContent='GNK ASG';head.append(title,note);
  const body=document.createElement('div');body.className='nav-body';
  sections.forEach(section=>{
    const group=document.createElement('section');group.className='section';
    const label=document.createElement('span');label.className='label';label.textContent=section.label;
    const links=document.createElement('div');links.className='links';
    section.items.forEach(([hrLabel,enLabel,hrHref,enHref])=>{
      const a=document.createElement('a');a.href=route(hrHref,enHref);
      const targetPath=new URL(a.href,location.origin).pathname.replace(/\/+$/,'')||'/';if(targetPath===path)a.setAttribute('aria-current','page');
      const text=document.createElement('span');text.textContent=english?enLabel:hrLabel;a.appendChild(text);
      if(section.protected){a.rel='nofollow';const meta=document.createElement('span');meta.className='protected';meta.textContent=english?'PROTECTED':'ZAŠTIĆENO';a.appendChild(meta);}links.appendChild(a);
    });
    group.append(label,links);body.appendChild(group);
  });
  nav.append(head,body);
  const close=()=>{wrap.classList.remove('open');button.setAttribute('aria-expanded','false');button.textContent=english?'MENU':'IZBORNIK';};
  button.addEventListener('click',()=>{const open=wrap.classList.toggle('open');button.setAttribute('aria-expanded',String(open));button.textContent=open?(english?'CLOSE':'ZATVORI'):(english?'MENU':'IZBORNIK');});
  document.addEventListener('click',event=>{if(wrap.classList.contains('open')&&!wrap.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
  actions.append(home,lang,button);wrap.append(actions,nav);inner.append(brand,eventWindow,wrap);strip.appendChild(inner);document.body.appendChild(strip);
  const observer=new MutationObserver(purge);observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),30000);purge();
})();