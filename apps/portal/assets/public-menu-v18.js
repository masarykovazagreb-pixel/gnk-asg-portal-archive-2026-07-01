(()=>{
  'use strict';
  if(window.__GNK_ASG_PUBLIC_MENU_V18__)return;
  window.__GNK_ASG_PUBLIC_MENU_V18__=true;

  const path=location.pathname.toLowerCase().replace(/\/+/g,'/');
  const privatePrefixes=[
    '/operator-dashboard','/operator-mobile','/mail-studio','/mail-studio-pro','/admin-center','/admin-center/',
    '/media-command-center','/news-admin','/pdf-publisher','/social-share','/wa-center',
    '/review','/auto-editor','/operator','/api','/editorial-operations','/mission-control',
    '/registry-center','/deployment','/mobile-admin','/seo','/design-review','/enterprise',
    '/entities','/strategy-performance','/language-review'
  ];
  if(privatePrefixes.some(prefix=>path===prefix.replace(/\/$/,'')||path.startsWith(`${prefix.replace(/\/$/,'')}/`)))return;

  const localeRoots={hr:'/',en:'/en/',de:'/de/',it:'/it/',hu:'/hu/'};
  const localeLabels={hr:'Hrvatski',en:'English',de:'Deutsch',it:'Italiano',hu:'Magyar'};
  const explicit=path.match(/^\/(en|de|it|hu)(?:\/|$)/)?.[1];
  const englishShared=path.startsWith('/markets')||path.startsWith('/news')||path.startsWith('/publications')||
    path.startsWith('/automation-status')||path.startsWith('/the-code/intelligence')||path.startsWith('/about-the-group')||
    path.startsWith('/digital-workforce');
  const locale=explicit||((englishShared)?'en':'hr');

  const copy={
    hr:{portal:'Korporativni portal',menu:'Glavna navigacija',open:'Otvori izbornik',close:'Zatvori izbornik',language:'Jezik',ai:'AI pomoć',groups:['Kompanije','Intelligence','Resursi','Kontakt'],items:{profile:'Profil',about:'O grupi',workforce:'Digital Workforce',directory:'Worker Directory',protocols:'Operating Protocols',financials:'Financije',code:'THE CODE',markets:'Tržišta',news:'Vijesti',publications:'Objave',visual:'Visual Index',pdf:'PDF centar',media:'Media Kit',assistant:'AI pomoć',status:'Status automatizacije',contact:'Kontakt',legal:'Legal',app:'Mobilna aplikacija'}},
    en:{portal:'Corporate portal',menu:'Main navigation',open:'Open menu',close:'Close menu',language:'Language',ai:'AI Help',groups:['Company','Intelligence','Resources','Contact'],items:{profile:'Profile',about:'About the Group',workforce:'Digital Workforce',directory:'Worker Directory',protocols:'Operating Protocols',financials:'Financials',code:'THE CODE',markets:'Markets',news:'News',publications:'Publications',visual:'Visual Index',pdf:'PDF Centre',media:'Media Kit',assistant:'AI Help',status:'Automation status',contact:'Contact',legal:'Legal',app:'Mobile App'}},
    de:{portal:'Unternehmensportal',menu:'Hauptnavigation',open:'Menü öffnen',close:'Menü schließen',language:'Sprache',ai:'KI-Hilfe',groups:['Unternehmen','Intelligence','Ressourcen','Kontakt'],items:{profile:'Unternehmensprofil',about:'Über die Gruppe',workforce:'Digital Workforce',directory:'Mitarbeiterverzeichnis',protocols:'Betriebsprotokolle',financials:'Finanzkennzahlen',code:'THE CODE',markets:'Märkte',news:'Nachrichten',publications:'Publikationen',visual:'Visual Index',pdf:'PDF-Zentrum',media:'Media Kit',assistant:'KI-Hilfe',status:'Automatisierungsstatus',contact:'Kontakt',legal:'Rechtliches',app:'Mobile App'}},
    it:{portal:'Portale aziendale',menu:'Navigazione principale',open:'Apri menu',close:'Chiudi menu',language:'Lingua',ai:'Assistenza AI',groups:['Società','Intelligence','Risorse','Contatti'],items:{profile:'Profilo aziendale',about:'Il Gruppo',workforce:'Digital Workforce',directory:'Elenco profili',protocols:'Protocolli operativi',financials:'Dati finanziari',code:'THE CODE',markets:'Mercati',news:'Notizie',publications:'Pubblicazioni',visual:'Visual Index',pdf:'Centro PDF',media:'Media Kit',assistant:'Assistenza AI',status:'Stato automazione',contact:'Contatti',legal:'Note legali',app:'App mobile'}},
    hu:{portal:'Vállalati portál',menu:'Fő navigáció',open:'Menü megnyitása',close:'Menü bezárása',language:'Nyelv',ai:'AI segítség',groups:['Vállalat','Intelligence','Források','Kapcsolat'],items:{profile:'Vállalati profil',about:'A csoportról',workforce:'Digital Workforce',directory:'Munkaprofilok',protocols:'Működési protokollok',financials:'Pénzügyi adatok',code:'THE CODE',markets:'Piacok',news:'Hírek',publications:'Publikációk',visual:'Visual Index',pdf:'PDF központ',media:'Media Kit',assistant:'AI segítség',status:'Automatizálási állapot',contact:'Kapcsolat',legal:'Jogi információk',app:'Mobilalkalmazás'}}[locale];

  const hr=locale==='hr';
  const home=localeRoots[locale];
  const fallbackSuffix=locale==='en'?'':`?lang=${encodeURIComponent(locale)}`;
  const companyItems=[
    [copy.items.profile,locale==='hr'?'Društva, upravljanje i struktura grupe':'Companies, governance and group structure',`${home}${locale==='hr'?'#profil':'#profile'}`],
    [copy.items.about,locale==='hr'?'Kontrolirani profil grupe i upravljački slojevi':'Controlled group profile and governance layers',locale==='hr'?'/o-grupi/':'/about-the-group/'],
    [copy.items.workforce,locale==='hr'?'Model digitalnih operacija i disclosure':'Digital operations model and disclosure','/digital-workforce/'],
    [copy.items.directory,locale==='hr'?'Pretraga 1.500 digitalnih operativnih profila':'Search 1,500 digital operations profiles','/digital-workforce/directory/'],
    [copy.items.protocols,locale==='hr'?'Pravila revizije, odobrenja, rollbacka i audita':'Review, approval, rollback and audit rules','/digital-workforce/protocols/'],
    [copy.items.financials,locale==='hr'?'Objavljeni pokazatelji i izvješća':'Published indicators and reports',`${home}${locale==='hr'?'#financije':'#financials'}`],
    [copy.items.code,locale==='hr'?'Strateški program i prezentacija':'Strategic programme and presentation',`/the-code/${fallbackSuffix}`]
  ];
  const groups=[
    [copy.groups[0],companyItems],
    [copy.groups[1],[
      [copy.items.code,'GNK DINAMO Ltd. news, analysis and commentary','/the-code/intelligence/'],
      [copy.items.markets,'Market data and international network','/markets/'],
      [copy.items.news,'Verified public news sources','/news/'],
      [copy.items.publications,'Controlled editorial content','/publications/'],
      [copy.items.visual,'Approved visual and media assets',`/visual-index/${fallbackSuffix}`]
    ]],
    [copy.groups[2],[
      [copy.items.pdf,'Reports, memoranda and downloads',locale==='hr'?'/downloads/':'/en/downloads/'],
      [copy.items.media,'Logos and corporate materials',`/media-kit/${fallbackSuffix}`],
      [copy.items.assistant,'Public portal assistant',locale==='hr'?'/assistant/':'/en/assistant/'],
      [copy.items.status,'Public system status',locale==='hr'?'/status-automatizacije/':'/automation-status/']
    ]],
    [copy.groups[3],[
      [copy.items.contact,'Recorded corporate inquiries',locale==='hr'?'/contact/':'/en/contact/'],
      [copy.items.legal,'Privacy, terms and legal notices',locale==='hr'?'/legal/':'/en/legal/'],
      [copy.items.app,'Public mobile access',`/app/${fallbackSuffix}`]
    ]]
  ];

  const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const active=href=>{try{const url=new URL(href,location.origin);return location.pathname===url.pathname||(url.pathname!=='/'&&location.pathname.startsWith(url.pathname));}catch{return false;}};
  const groupPanel=items=>items.map(([label,detail,href])=>`<a href="${esc(href)}"${active(href)?' aria-current="page"':''}><strong>${esc(label)}</strong><small>${esc(detail)}</small></a>`).join('');
  const mobileGroups=groups.map(([label,items])=>`<section class="gnk18-mobile-group"><strong>${esc(label)}</strong>${items.map(([itemLabel,,href])=>`<a href="${esc(href)}"${active(href)?' aria-current="page"':''}><span>${esc(itemLabel)}</span><span aria-hidden="true">›</span></a>`).join('')}</section>`).join('');
  const languageLinks=Object.entries(localeRoots).map(([code,href])=>`<a href="${href}" hreflang="${code}" lang="${code}"${code===locale?' aria-current="true"':''}><span>${esc(localeLabels[code])}</span><small>${code.toUpperCase()}</small></a>`).join('');

  function install(){
    if(!document.body)return;
    document.documentElement.classList.add('gnk-public-redesign-root');
    document.documentElement.lang=locale;
    ['gnk-public-header-v18','gnk18-floating-ai','gnk18-language-style'].forEach(id=>document.getElementById(id)?.remove());
    const style=document.createElement('style');
    style.id='gnk18-language-style';
    style.textContent='.gnk18-language-wrap{position:relative}.gnk18-language-trigger{display:flex;align-items:center;gap:7px;border:1px solid rgba(212,175,55,.32);background:rgba(255,255,255,.05);color:#fff;border-radius:999px;padding:9px 12px;font:inherit;font-weight:900;cursor:pointer}.gnk18-language-panel{display:none;position:absolute;right:0;top:calc(100% + 9px);min-width:190px;padding:8px;background:#07101f;border:1px solid rgba(212,175,55,.35);border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.42);z-index:1003}.gnk18-language-wrap[data-open="1"] .gnk18-language-panel{display:grid}.gnk18-language-panel a{display:flex;justify-content:space-between;gap:15px;padding:10px 11px;border-radius:10px;color:#fff;text-decoration:none}.gnk18-language-panel a:hover,.gnk18-language-panel a[aria-current="true"]{background:rgba(212,175,55,.12);color:#f4d77c}.gnk18-language-panel small{color:#aab4c7}@media(max-width:800px){.gnk18-language-panel{position:fixed;right:14px;left:14px;top:76px}}';
    document.head.appendChild(style);
    const header=document.createElement('header');
    header.id='gnk-public-header-v18';
    header.dataset.drawer='closed';
    header.innerHTML=`<div class="gnk18-header-inner">
      <a class="gnk18-brand" href="${home}" aria-label="GNK ASG"><span class="gnk18-brand-mark" aria-hidden="true"></span><span class="gnk18-brand-copy"><strong>GNK ASG d.o.o.</strong><small>${esc(copy.portal)}</small></span></a>
      <nav class="gnk18-desktop-nav" aria-label="${esc(copy.menu)}">${groups.map(([label,items],index)=>`<div class="gnk18-nav-item" data-open="0"><button class="gnk18-nav-trigger" type="button" aria-expanded="false" aria-controls="gnk18-panel-${index}">${esc(label)}</button><div id="gnk18-panel-${index}" class="gnk18-menu-panel">${groupPanel(items)}</div></div>`).join('')}</nav>
      <div class="gnk18-actions"><div class="gnk18-language-wrap" data-open="0"><button class="gnk18-language-trigger" type="button" aria-expanded="false" aria-label="${esc(copy.language)}">${locale.toUpperCase()} ▾</button><div class="gnk18-language-panel" aria-label="${esc(copy.language)}">${languageLinks}</div></div><button class="gnk18-mobile-toggle" type="button" aria-expanded="false" aria-label="${esc(copy.open)}">☰</button></div>
      </div><div class="gnk18-mobile-drawer" aria-label="${esc(copy.menu)}">${mobileGroups}</div>`;
    document.body.prepend(header);

    const closeMenus=except=>header.querySelectorAll('.gnk18-nav-item[data-open="1"]').forEach(item=>{if(item!==except){item.dataset.open='0';item.querySelector('button')?.setAttribute('aria-expanded','false');}});
    header.querySelectorAll('.gnk18-nav-trigger').forEach(trigger=>trigger.addEventListener('click',event=>{event.stopPropagation();const item=trigger.closest('.gnk18-nav-item'),open=item.dataset.open==='1';closeMenus(item);item.dataset.open=open?'0':'1';trigger.setAttribute('aria-expanded',String(!open));}));
    const languageWrap=header.querySelector('.gnk18-language-wrap'),languageTrigger=header.querySelector('.gnk18-language-trigger');
    languageTrigger.addEventListener('click',event=>{event.stopPropagation();const open=languageWrap.dataset.open==='1';languageWrap.dataset.open=open?'0':'1';languageTrigger.setAttribute('aria-expanded',String(!open));closeMenus();});
    const toggle=header.querySelector('.gnk18-mobile-toggle');
    toggle.addEventListener('click',()=>{const open=header.dataset.drawer==='open';header.dataset.drawer=open?'closed':'open';toggle.setAttribute('aria-expanded',String(!open));toggle.setAttribute('aria-label',open?copy.open:copy.close);document.body.style.overflow=open?'':'hidden';languageWrap.dataset.open='0';});
    header.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{header.dataset.drawer='closed';toggle.setAttribute('aria-expanded','false');document.body.style.overflow='';closeMenus();languageWrap.dataset.open='0';}));
    document.addEventListener('click',event=>{if(!event.target.closest('.gnk18-nav-item'))closeMenus();if(!event.target.closest('.gnk18-language-wrap')){languageWrap.dataset.open='0';languageTrigger.setAttribute('aria-expanded','false');}});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenus();languageWrap.dataset.open='0';languageTrigger.setAttribute('aria-expanded','false');header.dataset.drawer='closed';toggle.setAttribute('aria-expanded','false');document.body.style.overflow='';}});

    const floating=document.createElement('a');
    floating.id='gnk18-floating-ai';floating.className='gnk18-floating-ai';floating.href=hr?'/assistant/':'/en/assistant/';floating.textContent=copy.ai;document.body.appendChild(floating);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
