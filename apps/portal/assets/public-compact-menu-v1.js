(()=>{
  const path=(location.pathname.replace(/\/+$/,'')||'/');
  if(document.getElementById('gnk-compact-menu'))return;
  if(path.startsWith('/admin')||path.startsWith('/mail-studio')||path.startsWith('/campaign-mailer')||path.startsWith('/email-status')||path.startsWith('/operator-dashboard')||path.startsWith('/worker-ops')||path.startsWith('/digital-headquarters')||path.startsWith('/media-registration-admin')||path.startsWith('/webmail'))return;

  const english=document.documentElement.lang?.toLowerCase().startsWith('en')||path.startsWith('/en/');
  const sections=[
    {label:'ADMIN / ADMIN CENTER',protected:true,items:[
      ['ADMIN — ulaz u sve module','ADMIN — access all modules','/admin-center/'],
      ['Mail Studio','Mail Studio','/mail-studio/'],
      ['Statusi mailova','Email status','/email-status/'],
      ['Pretraga mailova','Mail search','/admin-center/mail-search/'],
      ['Kontaktni slučajevi','Contact cases','/admin-center/contacts/'],
      ['PDF centar','PDF center','/admin-center/pdf/'],
      ['Media Registration Admin','Media Registration Admin','/media-registration-admin/'],
      ['Worker Operations','Worker Operations','/worker-ops/'],
      ['Operator Dashboard','Operator Dashboard','/operator-dashboard/'],
      ['Digital Headquarters','Digital Headquarters','/digital-headquarters/']
    ]},
    {label:english?'PUBLIC PORTAL':'JAVNI PORTAL',items:[
      ['Početna','Home','/'],['O nama','About','/about/'],['Nermin Sefić','Nermin Sefić','/nermin-sefic/'],['Projekti','Projects','/projects/'],['Strateški roadmap','Strategic roadmap','/projects/roadmap/'],['Grupna mreža','Group network','/group-network/'],['Financije','Finance','/finance/'],['Newsroom','Newsroom','/newsroom/'],['Izvješća','Reports','/reports/'],['Knowledge Center','Knowledge Center','/knowledge-center/'],['Tržišta','Markets','/trzista/'],['Tehnologija','Technology','/tehnologija/'],['Intelligence Desk','Intelligence Desk','/intelligence-desk/'],['Registri','Registers','/registri/'],['Sadržaj','Content','/sadrzaj/'],['Teme','Topics','/teme/'],['THE CODE','THE CODE','/the-code/'],['Workeri','Workers','/workers/'],['Medijske prijave','Media applications','/media-application/'],['Kontakt','Contact','/contact/']
    ]},
    {label:english?'MEDIA & PUBLISHING':'MEDIJI I OBJAVA',protected:true,items:[['News Auto Publication','News Auto Publication','/admin-center/news-publication/'],['Campaign Mailer','Campaign Mailer','/campaign-mailer/']]}
  ];
  const hrefFor=href=>english?(href==='/'?'/en/':href==='/newsroom/'?'/en/newsroom/':href==='/reports/'?'/en/reports/':href==='/knowledge-center/'?'/en/knowledge-center/':href):href;

  document.documentElement.classList.add('gnk-compact-shell');
  const style=document.createElement('style');
  style.textContent=`
    :root{--gnk-compact-strip-height:46px}
    html.gnk-compact-shell body{padding-top:var(--gnk-compact-strip-height)!important}
    .gnk-compact-shell .site-header,.gnk-compact-shell body>.top,.gnk-compact-shell main>.top,#gnk-event-bar,#gnk-floating-menu{display:none!important}
    #gnk-compact-strip{position:fixed;inset:0 0 auto 0;height:var(--gnk-compact-strip-height);z-index:99997;overflow:hidden;background:#0d0a08;border-bottom:1px solid #8f6b2f;box-shadow:0 8px 22px rgba(0,0,0,.35);color:#d8b66a}
    #gnk-compact-strip .gnk-strip-track{position:absolute;inset:0 300px 0 0;display:flex;align-items:center;overflow:hidden;white-space:nowrap;pointer-events:none}
    #gnk-compact-strip .gnk-strip-message{display:inline-block;min-width:100%;padding-left:100%;font:800 11px/1.2 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#d8b66a;animation:gnk-strip-marquee 48s linear infinite;text-shadow:0 1px 6px rgba(0,0,0,.65)}
    @keyframes gnk-strip-marquee{from{transform:translateX(0)}to{transform:translateX(-200%)}}
    #gnk-compact-menu{position:fixed;right:8px;top:4px;z-index:99999;font-family:Arial,sans-serif}
    #gnk-compact-menu *{box-sizing:border-box}
    #gnk-compact-menu .gnk-compact-actions{display:flex;gap:4px;align-items:center;padding:3px;border:1px solid #8f6b2f;border-radius:999px;background:#0d0a08;box-shadow:0 6px 18px rgba(0,0,0,.38)}
    #gnk-compact-menu a,#gnk-compact-menu button{height:30px;min-width:38px;padding:0 9px;border:1px solid #8f6b2f;border-radius:999px;background:#17100b;color:#e7c878;text-decoration:none;font:800 9px/1 Arial,sans-serif;letter-spacing:.05em;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
    #gnk-compact-menu a:hover,#gnk-compact-menu button:hover,#gnk-compact-menu a:focus-visible,#gnk-compact-menu button:focus-visible{background:#2a180e;border-color:#d8b66a;color:#fff0b5;outline:none}
    #gnk-compact-menu .gnk-lang{display:flex;align-items:center;gap:1px;height:30px;padding:0 3px;border:1px solid #8f6b2f;border-radius:999px;background:#100a07}
    #gnk-compact-menu .gnk-lang a{height:22px;min-width:24px;padding:0 4px;border:0;background:transparent;font-size:9px}
    #gnk-compact-menu .gnk-lang a[aria-current="page"]{background:#d8b66a;color:#211308}
    #gnk-compact-menu nav{display:none;position:absolute;right:0;top:40px;width:min(420px,calc(100vw - 16px));max-height:calc(100vh - 58px);overflow:auto;padding:12px;background:#0d0a08;border:1px solid #8f6b2f;border-radius:16px;box-shadow:0 18px 48px rgba(0,0,0,.62)}
    #gnk-compact-menu.open nav{display:block}
    #gnk-compact-menu .gnk-section+.gnk-section{margin-top:12px;padding-top:12px;border-top:1px solid #34291d}
    #gnk-compact-menu .gnk-section-label{display:block;padding:0 8px 7px;color:#d8b66a;font-size:10px;font-weight:900;letter-spacing:.12em}
    #gnk-compact-menu .gnk-links{display:grid;gap:6px}
    #gnk-compact-menu nav a{justify-content:space-between;width:100%;min-height:40px;height:auto;border-radius:10px;background:#17130f;color:#f5f2ea;box-shadow:none;font-size:10px}
    #gnk-compact-menu nav a:hover,#gnk-compact-menu nav a:focus-visible{color:#f0d28c;border-color:#d8b66a}
    #gnk-compact-menu .gnk-protected{font-size:8px;color:#a99d88;letter-spacing:.06em}
    @media(max-width:700px){:root{--gnk-compact-strip-height:44px}#gnk-compact-strip .gnk-strip-track{right:255px}#gnk-compact-strip .gnk-strip-message{font-size:9px;animation-duration:54s}#gnk-compact-menu{right:5px;top:4px}#gnk-compact-menu nav{top:38px;width:min(380px,calc(100vw - 10px));max-height:calc(100dvh - 54px)}#gnk-compact-menu a,#gnk-compact-menu button{height:28px;min-width:34px;padding:0 7px;font-size:8px}#gnk-compact-menu .gnk-lang{height:28px}#gnk-compact-menu .gnk-lang a{height:20px;min-width:22px;font-size:8px}}
    @media(prefers-reduced-motion:reduce){#gnk-compact-strip .gnk-strip-message{animation:none;padding-left:14px}}
  `;
  document.head.appendChild(style);

  const removeLegacy=()=>document.querySelectorAll('#gnk-event-bar,#gnk-floating-menu,#gnk-public-ai-button').forEach(el=>el.remove());
  removeLegacy();
  const observer=new MutationObserver(removeLegacy);observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),12000);

  const strip=document.createElement('div');strip.id='gnk-compact-strip';strip.setAttribute('role','banner');
  const track=document.createElement('div');track.className='gnk-strip-track';
  const message=document.createElement('div');message.className='gnk-strip-message';
  message.textContent='THE CODE · NEW YORK · 7 OCTOBER 2026 · CODE ACTIVATION AT 11:30 AM ET · GNK ASG / GNK DINAMO LTD. GROUP';
  track.appendChild(message);strip.appendChild(track);document.body.appendChild(strip);

  const wrap=document.createElement('div');wrap.id='gnk-compact-menu';
  const actions=document.createElement('div');actions.className='gnk-compact-actions';
  const home=document.createElement('a');home.href=english?'/en/':'/';home.textContent='HOME';
  const lang=document.createElement('div');lang.className='gnk-lang';
  const hr=document.createElement('a');hr.href='/';hr.textContent='HR';
  const en=document.createElement('a');en.href='/en/';en.textContent='EN';
  (english?en:hr).setAttribute('aria-current','page');lang.append(hr,en);
  const button=document.createElement('button');button.type='button';button.textContent='MENU';button.setAttribute('aria-expanded','false');
  const nav=document.createElement('nav');nav.setAttribute('aria-label','Glavna navigacija / Main navigation');
  sections.forEach(section=>{const group=document.createElement('section');group.className='gnk-section';const label=document.createElement('span');label.className='gnk-section-label';label.textContent=section.label;const links=document.createElement('div');links.className='gnk-links';section.items.forEach(([hrLabel,enLabel,href])=>{const a=document.createElement('a');a.href=hrefFor(href);const text=document.createElement('span');text.textContent=english?enLabel:hrLabel;a.appendChild(text);if(section.protected){a.rel='nofollow';const meta=document.createElement('span');meta.className='gnk-protected';meta.textContent=english?'PROTECTED':'ZAŠTIĆENO';a.appendChild(meta);}links.appendChild(a);});group.append(label,links);nav.appendChild(group);});
  const close=()=>{wrap.classList.remove('open');button.setAttribute('aria-expanded','false');button.textContent='MENU';};
  button.addEventListener('click',()=>{const open=wrap.classList.toggle('open');button.setAttribute('aria-expanded',String(open));button.textContent=open?(english?'CLOSE':'ZATVORI'):'MENU';});
  document.addEventListener('click',event=>{if(wrap.classList.contains('open')&&!wrap.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
  actions.append(home,lang,button);wrap.append(actions,nav);document.body.appendChild(wrap);

  const aiButtons=[...document.querySelectorAll('.ai-fab')];aiButtons.slice(1).forEach(el=>el.remove());
})();