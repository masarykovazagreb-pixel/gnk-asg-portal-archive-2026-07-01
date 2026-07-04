(()=>{
  'use strict';
  if(window.__GNK_ASG_PUBLIC_MENU_V19__)return;
  window.__GNK_ASG_PUBLIC_MENU_V19__=true;

  const path=location.pathname.toLowerCase().replace(/\/+/g,'/');
  const privatePrefixes=[
    '/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center',
    '/media-command-center','/news-admin','/pdf-publisher','/social-share','/wa-center',
    '/review','/auto-editor','/operator','/api','/editorial-operations','/mission-control',
    '/registry-center','/deployment','/mobile-admin','/seo','/design-review','/enterprise',
    '/entities','/strategy-performance'
  ];
  if(privatePrefixes.some(prefix=>path===prefix||path.startsWith(`${prefix}/`)))return;

  const english=path.startsWith('/en')||path.startsWith('/markets')||path.startsWith('/news')||
    path.startsWith('/publications')||path.startsWith('/automation-status')||path.startsWith('/the-code/intelligence')||
    path.startsWith('/about-the-group')||path.startsWith('/digital-workforce');

  const copy=english?{
    portal:'Corporate portal',menu:'Main navigation',language:'HR',open:'Open menu',close:'Close menu',ai:'AI Help'
  }:{
    portal:'Korporativni portal',menu:'Glavna navigacija',language:'EN',open:'Otvori izbornik',close:'Zatvori izbornik',ai:'AI pomoć'
  };

  const companyItems=english?[
    ['Profile','Companies, governance and group structure','/en/#profile'],
    ['About the Group','Controlled group profile and governance layers','/about-the-group/'],
    ['Digital Workforce','Digital operations model and disclosure','/digital-workforce/'],
    ['Worker Directory','Search 1,500 digital operations profiles','/digital-workforce/directory/'],
    ['Operating Protocols','Review, approval, rollback and audit rules','/digital-workforce/protocols/'],
    ['Financials','Published indicators and reports','/en/#financials'],
    ['THE CODE','Strategic programme and presentation','/the-code/?lang=en']
  ]:[
    ['Profil','Društva, upravljanje i struktura grupe','/#profil'],
    ['O grupi','Kontrolirani profil grupe i upravljački slojevi','/o-grupi/'],
    ['Digital Workforce','Model digitalnih operacija i disclosure','/digital-workforce/'],
    ['Worker Directory','Pretraga 1.500 digitalnih operativnih profila','/digital-workforce/directory/'],
    ['Operating Protocols','Pravila revizije, odobrenja, rollbacka i audita','/digital-workforce/protocols/'],
    ['Financije','Objavljeni pokazatelji i izvješća','/#financije'],
    ['THE CODE','Strateški program i prezentacija','/the-code/']
  ];

  const groups=english?[
    ['Company',companyItems],
    ['Intelligence',[
      ['THE CODE Intelligence','GNK DINAMO Ltd. news, analysis and commentary','/the-code/intelligence/'],
      ['Markets','Market data and international network','/markets/'],
      ['News','Verified public news sources','/news/'],
      ['Publications','Controlled editorial content','/publications/'],
      ['Visual Index','Approved visual and media assets','/visual-index/?lang=en']
    ]],
    ['Resources',[
      ['PDF Centre','Reports, memoranda and downloads','/en/downloads/'],
      ['Media Kit','Logos and corporate materials','/media-kit/?lang=en'],
      ['AI Help','Public portal assistant','/en/assistant/'],
      ['Automation status','Public system status','/automation-status/']
    ]],
    ['Contact',[
      ['Contact','Recorded corporate inquiries','/en/contact/'],
      ['Legal','Privacy, terms and legal notices','/en/legal/'],
      ['Mobile App','Public mobile access','/app/?lang=en']
    ]]
  ]:[
    ['Kompanije',companyItems],
    ['Intelligence',[
      ['THE CODE Intelligence','Vijesti, analize i komentari projekta GNK DINAMO Ltd.','/the-code/intelligence/'],
      ['Tržišta','Tržišni podaci i međunarodna mreža','/trzista/'],
      ['Vijesti','Provjereni javni izvori vijesti','/vijesti/'],
      ['Objave','Kontrolirani urednički sadržaj','/objave/'],
      ['Visual Index','Odobreni vizualni i medijski materijali','/visual-index/']
    ]],
    ['Resursi',[
      ['PDF centar','Izvješća, memorandumi i preuzimanja','/downloads/'],
      ['Media Kit','Logotipi i korporativni materijali','/media-kit/'],
      ['AI pomoć','Javni asistent portala','/assistant/'],
      ['Status automatizacije','Javni tehnički status sustava','/status-automatizacije/']
    ]],
    ['Kontakt',[
      ['Kontakt','Evidentirani korporativni upiti','/contact/'],
      ['Legal','Privatnost, uvjeti i pravne obavijesti','/legal/'],
      ['Mobilna aplikacija','Javni mobilni pristup','/app/']
    ]]
  ];

  const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const active=href=>{try{const url=new URL(href,location.origin);return location.pathname===url.pathname||(url.pathname!=='/'&&location.pathname.startsWith(url.pathname));}catch{return false;}};
  const languageHref=path.startsWith('/about-the-group')?'/o-grupi/':path.startsWith('/o-grupi')?'/about-the-group/':english?'/':'/en/';
  const groupPanel=items=>items.map(([label,detail,href])=>`<a href="${esc(href)}"${active(href)?' aria-current="page"':''}><strong>${esc(label)}</strong><small>${esc(detail)}</small></a>`).join('');
  const mobileGroups=groups.map(([label,items])=>`<section class="gnk18-mobile-group"><strong>${esc(label)}</strong>${items.map(([itemLabel,,href])=>`<a href="${esc(href)}"${active(href)?' aria-current="page"':''}><span>${esc(itemLabel)}</span><span aria-hidden="true">›</span></a>`).join('')}</section>`).join('');

  function install(){
    if(!document.body)return;
    document.documentElement.classList.add('gnk-public-redesign-root');
    document.documentElement.lang=english?'en':'hr';
    ['gnk-public-header-v18','gnk18-floating-ai'].forEach(id=>document.getElementById(id)?.remove());
    const header=document.createElement('header');
    header.id='gnk-public-header-v18';
    header.dataset.drawer='closed';
    header.innerHTML=`<div class="gnk18-header-inner">
      <a class="gnk18-brand" href="${english?'/en/':'/'}" aria-label="GNK ASG"><span class="gnk18-brand-mark" aria-hidden="true"></span><span class="gnk18-brand-copy"><strong>GNK ASG d.o.o.</strong><small>${esc(copy.portal)}</small></span></a>
      <nav class="gnk18-desktop-nav" aria-label="${esc(copy.menu)}">${groups.map(([label,items],index)=>`<div class="gnk18-nav-item" data-open="0"><button class="gnk18-nav-trigger" type="button" aria-expanded="false" aria-controls="gnk19-panel-${index}">${esc(label)}</button><div id="gnk19-panel-${index}" class="gnk18-menu-panel">${groupPanel(items)}</div></div>`).join('')}</nav>
      <div class="gnk18-actions"><a class="gnk18-language" href="${esc(languageHref)}" hreflang="${english?'hr':'en'}">${copy.language}</a><button class="gnk18-mobile-toggle" type="button" aria-expanded="false" aria-label="${esc(copy.open)}">☰</button></div>
      </div><div class="gnk18-mobile-drawer" aria-label="${esc(copy.menu)}">${mobileGroups}</div>`;
    document.body.prepend(header);

    const closeMenus=except=>header.querySelectorAll('.gnk18-nav-item[data-open="1"]').forEach(item=>{if(item!==except){item.dataset.open='0';item.querySelector('button')?.setAttribute('aria-expanded','false');}});
    header.querySelectorAll('.gnk18-nav-trigger').forEach(trigger=>trigger.addEventListener('click',event=>{event.stopPropagation();const item=trigger.closest('.gnk18-nav-item'),open=item.dataset.open==='1';closeMenus(item);item.dataset.open=open?'0':'1';trigger.setAttribute('aria-expanded',String(!open));}));
    const toggle=header.querySelector('.gnk18-mobile-toggle');
    toggle.addEventListener('click',()=>{const open=header.dataset.drawer==='open';header.dataset.drawer=open?'closed':'open';toggle.setAttribute('aria-expanded',String(!open));toggle.setAttribute('aria-label',open?copy.open:copy.close);document.body.style.overflow=open?'':'hidden';});
    header.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{header.dataset.drawer='closed';toggle.setAttribute('aria-expanded','false');document.body.style.overflow='';closeMenus();}));
    document.addEventListener('click',event=>{if(!event.target.closest('.gnk18-nav-item'))closeMenus();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenus();header.dataset.drawer='closed';toggle.setAttribute('aria-expanded','false');document.body.style.overflow='';}});

    const floating=document.createElement('a');
    floating.id='gnk18-floating-ai';floating.className='gnk18-floating-ai';floating.href=english?'/en/assistant/':'/assistant/';floating.textContent=copy.ai;document.body.appendChild(floating);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
