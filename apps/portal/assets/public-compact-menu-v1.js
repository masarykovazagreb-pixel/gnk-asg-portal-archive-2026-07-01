(()=>{
  'use strict';
  if(window.__GNK_COMPACT_MENU_V2__)return;
  window.__GNK_COMPACT_MENU_V2__=true;
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
  style.textContent=`:root{--gnk-top:60px}html.gnk-compact-shell body{padding-top:var(--gnk-top)!important}.site-header,.menu-toggle,.nav-links,body>header,main>.top,body>.top{display:none!important}
#gnk-compact-strip{position:fixed;inset:0 0 auto;height:60px;z-index:99997;display:grid;grid-template-columns:auto minmax(0,1fr) 286px;align-items:center;gap:22px;padding:0 14px 0 18px;background:rgba(12,10,8,.97);border-bottom:2px solid #b88a2f;box-shadow:0 8px 28px rgba(0,0,0,.28);color:#fff;font-family:Arial,Helvetica,sans-serif}
#gnk-compact-strip .brand{display:flex;align-items:center;gap:11px;min-width:176px;text-decoration:none;color:#fff}
#gnk-compact-strip .brand-mark{position:relative;width:34px;height:34px;border:2px solid #c99d42;border-radius:50%;box-shadow:inset 0 0 0 3px rgba(201,157,66,.12)}
#gnk-compact-strip .brand-mark:before,#gnk-compact-strip .brand-mark:after{content:"";position:absolute;left:7px;right:7px;border-top:2px solid #c99d42;transform:rotate(-28deg)}
#gnk-compact-strip .brand-mark:before{top:12px}#gnk-compact-strip .brand-mark:after{top:20px}
#gnk-compact-strip .brand-copy{display:flex;flex-direction:column;line-height:1}
#gnk-compact-strip .brand-name{font:800 16px/1 Arial,Helvetica,sans-serif;letter-spacing:.14em}
#gnk-compact-strip .brand-sub{margin-top:5px;color:#d6bd83;font:700 9px/1 Arial,Helvetica,sans-serif;letter-spacing:.14em;text-transform:uppercase}
#gnk-compact-strip .event{min-width:0;text-align:center;color:#e5d7b8;font:700 10px/1.35 Arial,Helvetica,sans-serif;letter-spacing:.13em;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#gnk-compact-menu{position:fixed;right:12px;top:9px;z-index:99999;font-family:Arial,Helvetica,sans-serif}
#gnk-compact-menu *{box-sizing:border-box}
#gnk-compact-menu .actions{display:flex;gap:4px;align-items:center;height:42px;padding:4px;border:1px solid rgba(201,157,66,.72);border-radius:12px;background:#17130f;box-shadow:0 5px 18px rgba(0,0,0,.35)}
#gnk-compact-menu a,#gnk-compact-menu button{height:32px;padding:0 11px;border:0;border-radius:8px;background:transparent;color:#f8edd2;text-decoration:none;font:800 11px/1 Arial,Helvetica,sans-serif;letter-spacing:.04em;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background .16s ease,color .16s ease}
#gnk-compact-menu a:hover,#gnk-compact-menu button:hover,#gnk-compact-menu a:focus-visible,#gnk-compact-menu button:focus-visible{background:#2a2117;color:#fff;outline:2px solid #d1aa58;outline-offset:1px}
#gnk-compact-menu .home{min-width:58px}
#gnk-compact-menu .lang{display:flex;gap:1px;height:32px;padding:2px;border-left:1px solid #59462d;border-right:1px solid #59462d}
#gnk-compact-menu .lang a{height:28px;min-width:33px;padding:0 7px}
#gnk-compact-menu .lang a[aria-current=page]{background:#c99d42;color:#17100a}
#gnk-compact-menu .toggle{min-width:74px;background:#b88a2f;color:#160f08}
#gnk-compact-menu .toggle:hover,#gnk-compact-menu .toggle:focus-visible{background:#d6b567;color:#111}
#gnk-compact-menu nav{display:none;position:absolute;right:0;top:48px;width:min(500px,calc(100vw - 24px));max-height:calc(100vh - 76px);overflow:auto;padding:0;background:#fff;border:1px solid #d6c18f;border-top:4px solid #b88a2f;border-radius:16px;box-shadow:0 28px 80px rgba(0,0,0,.38);color:#111}
#gnk-compact-menu.open nav{display:block}
#gnk-compact-menu .nav-head{display:flex;align-items:center;justify-content:space-between;padding:17px 18px 13px;border-bottom:1px solid #eee7d7}
#gnk-compact-menu .nav-title{font-size:17px;font-weight:800;color:#111;letter-spacing:.02em}
#gnk-compact-menu .nav-note{font-size:10px;font-weight:800;color:#8b6a2c;letter-spacing:.1em;text-transform:uppercase}
#gnk-compact-menu .nav-body{padding:15px}
#gnk-compact-menu .section+.section{margin-top:18px;padding-top:17px;border-top:1px solid #e7dfcf}
#gnk-compact-menu .label{display:block;padding:0 3px 9px;color:#7a5a20;font-size:11px;font-weight:900;letter-spacing:.12em}
#gnk-compact-menu .links{display:grid;grid-template-columns:1fr 1fr;gap:7px}
#gnk-compact-menu .section:last-child .links{grid-template-columns:1fr}
#gnk-compact-menu .links a{justify-content:space-between;width:100%;min-height:42px;height:auto;padding:10px 12px;background:#f6f3ed;color:#171717;border:1px solid transparent;border-radius:10px;font-size:13px;line-height:1.25;text-align:left;letter-spacing:0}
#gnk-compact-menu .links a:hover,#gnk-compact-menu .links a:focus-visible{background:#fffaf0;border-color:#c99d42;color:#111;outline:none}
#gnk-compact-menu .links a[aria-current=page]{background:#17130f;color:#fff;border-color:#b88a2f}
#gnk-compact-menu .protected{font-size:9px;font-weight:800;color:#8b6a2c;margin-left:10px;letter-spacing:.06em}
#gnk-compact-menu .links a[aria-current=page] .protected{color:#e3c67f}
@media(max-width:760px){:root{--gnk-top:56px}#gnk-compact-strip{height:56px;grid-template-columns:auto 1fr 206px;gap:8px;padding-left:10px}.brand-sub,.event{display:none!important}#gnk-compact-strip .brand{min-width:104px;gap:8px}.brand-mark{width:29px!important;height:29px!important}.brand-name{font-size:13px!important}#gnk-compact-menu{right:6px;top:7px}#gnk-compact-menu .actions{height:42px}.home{display:none!important}#gnk-compact-menu nav{top:47px;width:calc(100vw - 12px);max-height:calc(100vh - 68px)}#gnk-compact-menu .links{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){#gnk-compact-menu a,#gnk-compact-menu button{transition:none}}`;
  document.head.appendChild(style);

  const strip=document.createElement('div');
  strip.id='gnk-compact-strip';
  strip.innerHTML=`<a class="brand" href="${english?'/en/':'/'}" aria-label="GNK ASG"><span class="brand-mark" aria-hidden="true"></span><span class="brand-copy"><span class="brand-name">GNK ASG</span><span class="brand-sub">Sport · Technology · Finance</span></span></a><div class="event">THE CODE · NEW YORK · 7 OCTOBER 2026 · 11:30 AM ET</div><span aria-hidden="true"></span>`;
  document.body.appendChild(strip);

  const wrap=document.createElement('div');wrap.id='gnk-compact-menu';
  const actions=document.createElement('div');actions.className='actions';
  const home=document.createElement('a');home.className='home';home.href=english?'/en/':'/';home.textContent='HOME';
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
  actions.append(home,lang,button);wrap.append(actions,nav);document.body.appendChild(wrap);
  const observer=new MutationObserver(purge);observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),30000);purge();
})();
