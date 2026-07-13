(()=>{
  'use strict';
  if(window.__GNK_COMPACT_MENU_V3__)return;
  window.__GNK_COMPACT_MENU_V3__=true;
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const protectedPrefixes=['/admin','/admin-center','/mail-studio','/campaign-mailer','/email-status','/operator-dashboard','/worker-ops','/digital-headquarters','/media-registration-admin','/webmail'];
  if(protectedPrefixes.some(prefix=>path===prefix||path.startsWith(prefix+'/')))return;
  const english=document.documentElement.lang?.toLowerCase().startsWith('en')||path==='/en'||path.startsWith('/en/');
  const route=(hr,en)=>english?(en||hr):hr;
  const sections=[
    {label:english?'PUBLIC PORTAL':'JAVNI PORTAL',items:[
      ['Početna','Home','/','/en/'],['O nama','About','/about/','/en/about/'],['Nermin Sefić','Nermin Sefić','/nermin-sefic/','/en/nermin-sefic/'],['Grupna mreža','Group network','/group-network/','/en/group-network/'],['Financije','Finance','/financije/','/en/finance/'],['Newsroom','Newsroom','/newsroom/','/en/newsroom/'],['Objave','Publications','/objave/','/en/publications/'],['Analize','Analyses','/analize/','/en/analyses/'],['Komentari','Commentary','/komentari/','/en/commentary/'],['Tržišta','Markets','/trzista/','/en/markets/'],['Projekti','Projects','/projects/','/en/projects/'],['Strateški roadmap','Strategic roadmap','/projects/roadmap/','/en/projects/roadmap/'],['Izvješća','Reports','/reports/','/en/reports/'],['Knowledge Center','Knowledge Center','/knowledge-center/','/en/knowledge-center/'],['Tehnologija','Technology','/tehnologija/','/en/technology/'],['THE CODE','THE CODE','/the-code/','/en/the-code/'],['Medijske prijave','Media applications','/media-application/','/media-application/?lang=en'],['Kontakt','Contact','/contact/','/en/contact/']
    ]},
    {label:'ADMIN / ADMIN CENTER',protected:true,items:[
      ['ADMIN — svi moduli','ADMIN — all modules','/admin-center/'],['Mail Studio','Mail Studio','/mail-studio/'],['Statusi mailova','Email status','/email-status/'],['Pretraga mailova','Mail search','/admin-center/mail-search/'],['Kontaktni slučajevi','Contact cases','/admin-center/contacts/'],['PDF centar','PDF center','/admin-center/pdf/'],['Media Registration Admin','Media Registration Admin','/media-registration-admin/'],['Worker Operations','Worker Operations','/worker-ops/'],['Operator Dashboard','Operator Dashboard','/operator-dashboard/']
    ]}
  ];
  const purge=()=>{
    document.querySelectorAll('#gnk-event-bar,#gnk-floating-menu,#gnk-floating-menu-v2,#gnk-public-ai-button,.public-floating-menu,.floating-menu,.site-header,.menu-toggle,.nav-links,body>header,main>.top,body>.top').forEach(el=>{if(!el.closest('#gnk-compact-menu')&&!el.closest('#gnk-compact-strip'))el.remove();});
    document.querySelectorAll('script[src*="public-floating-menu"],script[data-gnk-floating-menu]').forEach(el=>el.remove());
    [...document.querySelectorAll('#gnk-compact-menu')].slice(1).forEach(el=>el.remove());
    [...document.querySelectorAll('#gnk-compact-strip')].slice(1).forEach(el=>el.remove());
  };
  purge();
  if(document.getElementById('gnk-compact-menu'))return;
  document.documentElement.classList.add('gnk-compact-shell');
  const style=document.createElement('style');
  style.textContent=`:root{--gnk-top:58px}html.gnk-compact-shell body{padding-top:var(--gnk-top)!important}.site-header,.menu-toggle,.nav-links,body>header,main>.top,body>.top{display:none!important}
#gnk-compact-strip{position:fixed;inset:0 0 auto;height:58px;z-index:99997;background:rgba(255,255,255,.97);border-bottom:1px solid rgba(184,138,47,.48);box-shadow:0 8px 24px rgba(15,23,42,.10);backdrop-filter:blur(14px);font-family:Arial,Helvetica,sans-serif}
#gnk-compact-strip .inner{width:min(1180px,100%);height:100%;margin:0 auto;padding:0 18px;display:flex;align-items:center;justify-content:space-between;gap:18px}
#gnk-compact-strip .brand{display:flex;align-items:center;min-width:0;text-decoration:none}
#gnk-compact-strip .brand img{display:block;width:176px;max-width:42vw;height:42px;object-fit:contain;object-position:left center;border:0}
#gnk-compact-menu{position:relative;z-index:99999;font-family:Arial,Helvetica,sans-serif}
#gnk-compact-menu *{box-sizing:border-box}
#gnk-compact-menu .actions{display:flex;align-items:center;gap:8px}
#gnk-compact-menu .lang{display:flex;align-items:center;padding:3px;border:1px solid #d7c492;border-radius:11px;background:#f7f4ec}
#gnk-compact-menu .lang a{width:38px;height:32px;border-radius:8px;color:#31415c;text-decoration:none;font:800 11px/1 Arial,Helvetica,sans-serif;display:inline-flex;align-items:center;justify-content:center}
#gnk-compact-menu .lang a:hover,#gnk-compact-menu .lang a:focus-visible{background:#fff;color:#0b2345;outline:2px solid #d1aa58;outline-offset:1px}
#gnk-compact-menu .lang a[aria-current=page]{background:#b88a2f;color:#fff}
#gnk-compact-menu .toggle{height:40px;min-width:104px;padding:0 15px;border:1px solid #0b2345;border-radius:11px;background:#0b2345;color:#fff;font:800 11px/1 Arial,Helvetica,sans-serif;letter-spacing:.06em;display:inline-flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;box-shadow:0 5px 14px rgba(11,35,69,.18)}
#gnk-compact-menu .toggle:before{content:"";width:15px;height:10px;border-top:2px solid currentColor;border-bottom:2px solid currentColor;box-shadow:0 -4px 0 -2px currentColor inset}
#gnk-compact-menu .toggle:hover,#gnk-compact-menu .toggle:focus-visible{background:#12345f;border-color:#12345f;outline:2px solid #d1aa58;outline-offset:2px}
#gnk-compact-menu nav{display:none;position:absolute;right:0;top:50px;width:min(760px,calc(100vw - 24px));max-height:calc(100vh - 78px);overflow:auto;background:#fff;border:1px solid #d9c99f;border-top:4px solid #b88a2f;border-radius:18px;box-shadow:0 28px 80px rgba(15,23,42,.24);color:#111}
#gnk-compact-menu.open nav{display:block}
#gnk-compact-menu .nav-head{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 20px 14px;border-bottom:1px solid #eee7d7}
#gnk-compact-menu .nav-title{font-size:18px;font-weight:800;color:#0b2345}
#gnk-compact-menu .nav-note{font-size:10px;font-weight:900;color:#8b6a2c;letter-spacing:.12em;text-transform:uppercase}
#gnk-compact-menu .nav-body{padding:17px}
#gnk-compact-menu .section+.section{margin-top:18px;padding-top:18px;border-top:1px solid #e7dfcf}
#gnk-compact-menu .label{display:block;padding:0 3px 10px;color:#7a5a20;font-size:11px;font-weight:900;letter-spacing:.12em}
#gnk-compact-menu .links{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
#gnk-compact-menu .section:last-child .links{grid-template-columns:repeat(2,minmax(0,1fr))}
#gnk-compact-menu .links a{justify-content:space-between;width:100%;min-height:44px;height:auto;padding:10px 12px;background:#f7f8fa;color:#172033;border:1px solid #e6e8ec;border-radius:10px;font-size:13px;font-weight:700;line-height:1.25;text-decoration:none;text-align:left;display:flex;align-items:center;gap:8px}
#gnk-compact-menu .links a:hover,#gnk-compact-menu .links a:focus-visible{background:#fffaf0;border-color:#c99d42;color:#0b2345;outline:none}
#gnk-compact-menu .links a[aria-current=page]{background:#0b2345;color:#fff;border-color:#0b2345}
#gnk-compact-menu .protected{font-size:9px;font-weight:900;color:#8b6a2c;letter-spacing:.05em}
#gnk-compact-menu .links a[aria-current=page] .protected{color:#e8ca7c}
@media(max-width:820px){#gnk-compact-menu .links{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:620px){:root{--gnk-top:54px}#gnk-compact-strip{height:54px}#gnk-compact-strip .inner{padding:0 10px;gap:10px}#gnk-compact-strip .brand img{width:132px;max-width:36vw;height:38px}#gnk-compact-menu .actions{gap:5px}#gnk-compact-menu .lang a{width:34px;height:30px}#gnk-compact-menu .toggle{height:38px;min-width:84px;padding:0 11px;font-size:10px}#gnk-compact-menu nav{top:47px;width:calc(100vw - 16px);max-height:calc(100vh - 66px)}#gnk-compact-menu .links,#gnk-compact-menu .section:last-child .links{grid-template-columns:1fr}#gnk-compact-menu .nav-head{padding:16px}#gnk-compact-menu .nav-body{padding:14px}}
@media(max-width:390px){#gnk-compact-strip .brand img{width:112px}.lang{display:none!important}#gnk-compact-menu .toggle{min-width:78px}}
@media(prefers-reduced-motion:reduce){#gnk-compact-menu *{scroll-behavior:auto!important}}`;
  document.head.appendChild(style);

  const strip=document.createElement('div');
  strip.id='gnk-compact-strip';
  const inner=document.createElement('div');inner.className='inner';
  const brand=document.createElement('a');brand.className='brand';brand.href=english?'/en/':'/';brand.setAttribute('aria-label','GNK ASG');
  const logo=document.createElement('img');logo.src='/assets/logo-gnk-asg.svg';logo.alt='GNK ASG';logo.width=176;logo.height=42;brand.appendChild(logo);

  const wrap=document.createElement('div');wrap.id='gnk-compact-menu';
  const actions=document.createElement('div');actions.className='actions';
  const lang=document.createElement('div');lang.className='lang';
  const hr=document.createElement('a');hr.href='/';hr.textContent='HR';hr.setAttribute('aria-label','Hrvatski');
  const en=document.createElement('a');en.href='/en/';en.textContent='EN';en.setAttribute('aria-label','English');(english?en:hr).setAttribute('aria-current','page');lang.append(hr,en);
  const button=document.createElement('button');button.className='toggle';button.type='button';button.textContent=english?'MENU':'IZBORNIK';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','gnk-compact-nav');

  const nav=document.createElement('nav');nav.id='gnk-compact-nav';nav.setAttribute('aria-label',english?'Main navigation':'Glavna navigacija');
  const head=document.createElement('div');head.className='nav-head';
  const title=document.createElement('span');title.className='nav-title';title.textContent=english?'Navigation':'Navigacija';
  const note=document.createElement('span');note.className='nav-note';note.textContent='GNK ASG';
  head.append(title,note);
  const body=document.createElement('div');body.className='nav-body';

  sections.forEach(section=>{
    const group=document.createElement('section');group.className='section';
    const label=document.createElement('span');label.className='label';label.textContent=section.label;
    const links=document.createElement('div');links.className='links';
    section.items.forEach(([hrLabel,enLabel,hrHref,enHref])=>{
      const a=document.createElement('a');a.href=route(hrHref,enHref);
      const targetPath=new URL(a.href,location.origin).pathname.replace(/\/+$/,'')||'/';
      if(targetPath===path)a.setAttribute('aria-current','page');
      const text=document.createElement('span');text.textContent=english?enLabel:hrLabel;a.appendChild(text);
      if(section.protected){a.rel='nofollow';const meta=document.createElement('span');meta.className='protected';meta.textContent=english?'PROTECTED':'ZAŠTIĆENO';a.appendChild(meta);}
      links.appendChild(a);
    });
    group.append(label,links);body.appendChild(group);
  });
  nav.append(head,body);

  const close=()=>{
    wrap.classList.remove('open');
    button.setAttribute('aria-expanded','false');
    button.textContent=english?'MENU':'IZBORNIK';
  };
  button.addEventListener('click',()=>{
    const open=wrap.classList.toggle('open');
    button.setAttribute('aria-expanded',String(open));
    button.textContent=open?(english?'CLOSE':'ZATVORI'):(english?'MENU':'IZBORNIK');
  });
  document.addEventListener('click',event=>{if(wrap.classList.contains('open')&&!wrap.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
  actions.append(lang,button);wrap.append(actions,nav);inner.append(brand,wrap);strip.appendChild(inner);document.body.appendChild(strip);
  const observer=new MutationObserver(purge);observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),30000);purge();
})();
