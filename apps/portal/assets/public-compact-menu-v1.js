(()=>{
  'use strict';
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
  style.textContent=`:root{--gnk-top:48px}html.gnk-compact-shell body{padding-top:var(--gnk-top)!important}.site-header,.menu-toggle,.nav-links,body>header,main>.top,body>.top{display:none!important}#gnk-compact-strip{position:fixed;inset:0 0 auto;height:48px;z-index:99997;overflow:hidden;background:#0d0a08;border-bottom:1px solid #b88a2f;box-shadow:0 5px 16px #0006;color:#f2d27c}#gnk-compact-strip .track{height:100%;display:flex;align-items:center;overflow:hidden;white-space:nowrap;pointer-events:none}#gnk-compact-strip .message{display:inline-block;min-width:100%;padding-left:100%;font:800 11px/1.2 Arial,sans-serif;letter-spacing:.11em;text-transform:uppercase;animation:gnkMarquee 52s linear infinite}@keyframes gnkMarquee{to{transform:translateX(-200%)}}#gnk-compact-menu{position:fixed;right:8px;top:4px;z-index:99999;font-family:Arial,sans-serif}#gnk-compact-menu *{box-sizing:border-box}.actions{display:flex;gap:5px;align-items:center;height:40px;padding:3px;border:1px solid #b88a2f;border-radius:13px;background:#0d0a08;box-shadow:0 4px 14px #0007}#gnk-compact-menu a,#gnk-compact-menu button{height:34px;min-width:48px;padding:0 11px;border:1px solid #b88a2f;border-radius:9px;background:#17100b;color:#f2d27c;text-decoration:none;font:800 12px/1 Arial,sans-serif;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.lang{display:flex;gap:2px;height:34px;padding:2px;border:1px solid #b88a2f;border-radius:9px}.lang a{height:28px;min-width:34px;padding:0 7px;border:0;background:transparent}.lang a[aria-current=page]{background:#d8b66a;color:#211308}#gnk-compact-menu nav{display:none;position:absolute;right:0;top:46px;width:min(440px,calc(100vw - 16px));max-height:calc(100vh - 62px);overflow:auto;padding:16px;background:#0d0a08;border:1px solid #b88a2f;border-radius:16px;box-shadow:0 22px 60px #000b}#gnk-compact-menu.open nav{display:block}.section+.section{margin-top:16px;padding-top:16px;border-top:1px solid #3d3021}.label{display:block;padding:0 6px 9px;color:#f2d27c;font-size:12px;font-weight:900;letter-spacing:.11em}.links{display:grid;gap:8px}.links a{justify-content:space-between;width:100%;min-height:46px;height:auto;padding:11px 13px;background:#17130f;color:#f8f5ed;font-size:15px;line-height:1.35;text-align:left}.protected{font-size:11px;color:#c9bfae;margin-left:12px}@media(max-width:700px){#gnk-compact-menu{right:5px}#gnk-compact-menu nav{width:min(420px,calc(100vw - 10px))}}@media(prefers-reduced-motion:reduce){#gnk-compact-strip .message{animation:none;padding-left:12px}}`;
  document.head.appendChild(style);
  const strip=document.createElement('div');strip.id='gnk-compact-strip';strip.innerHTML='<div class="track"><div class="message">THE CODE · NEW YORK · 7 OCTOBER 2026 · CODE ACTIVATION AT 11:30 AM ET · GNK ASG / GNK DINAMO LTD. GROUP</div></div>';document.body.appendChild(strip);
  const wrap=document.createElement('div');wrap.id='gnk-compact-menu';
  const actions=document.createElement('div');actions.className='actions';
  const home=document.createElement('a');home.href=english?'/en/':'/';home.textContent='HOME';
  const lang=document.createElement('div');lang.className='lang';
  const hr=document.createElement('a');hr.href='/';hr.textContent='HR';
  const en=document.createElement('a');en.href='/en/';en.textContent='EN';(english?en:hr).setAttribute('aria-current','page');lang.append(hr,en);
  const button=document.createElement('button');button.type='button';button.textContent='MENU';button.setAttribute('aria-expanded','false');
  const nav=document.createElement('nav');nav.setAttribute('aria-label',english?'Main navigation':'Glavna navigacija');
  sections.forEach(section=>{const group=document.createElement('section');group.className='section';const label=document.createElement('span');label.className='label';label.textContent=section.label;const links=document.createElement('div');links.className='links';section.items.forEach(([hrLabel,enLabel,hrHref,enHref])=>{const a=document.createElement('a');a.href=route(hrHref,enHref);const text=document.createElement('span');text.textContent=english?enLabel:hrLabel;a.appendChild(text);if(section.protected){a.rel='nofollow';const meta=document.createElement('span');meta.className='protected';meta.textContent=english?'PROTECTED':'ZAŠTIĆENO';a.appendChild(meta);}links.appendChild(a);});group.append(label,links);nav.appendChild(group);});
  const close=()=>{wrap.classList.remove('open');button.setAttribute('aria-expanded','false');button.textContent='MENU';};
  button.addEventListener('click',()=>{const open=wrap.classList.toggle('open');button.setAttribute('aria-expanded',String(open));button.textContent=open?(english?'CLOSE':'ZATVORI'):'MENU';});
  document.addEventListener('click',event=>{if(wrap.classList.contains('open')&&!wrap.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
  actions.append(home,lang,button);wrap.append(actions,nav);document.body.appendChild(wrap);
  const observer=new MutationObserver(purge);observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),30000);purge();
})();