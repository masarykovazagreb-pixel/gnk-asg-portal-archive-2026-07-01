(()=>{
  'use strict';
  const RELEASE='GNK_ASG_PUBLIC_MENU_V16_UNIFIED_NAVIGATION_20260628';
  if(document.documentElement.dataset.gnkPublicMenuV16===RELEASE)return;
  document.documentElement.dataset.gnkPublicMenuV16=RELEASE;

  const path=location.pathname.replace(/\/+$/,'')||'/';
  const english=document.documentElement.lang==='en'||path==='/en'||path.startsWith('/en/')||path.startsWith('/markets')||path.startsWith('/news')||path.startsWith('/publications');
  const labels=english?{
    finance:'Financials',network:'Network',news:'News',publications:'Publications',markets:'Markets',gallery:'Gallery',contact:'Contact',language:'HR',home:'Home',help:'AI Help',open:'Open menu',close:'Close menu'
  }:{
    finance:'Financije',network:'Mreža',news:'Vijesti',publications:'Objave',markets:'Tržišta',gallery:'Galerija',contact:'Kontakt',language:'EN',home:'Početna',help:'AI pomoć',open:'Otvori izbornik',close:'Zatvori izbornik'
  };
  const swap=(from,to)=>path===from?to:(path.startsWith(from+'/')?to+path.slice(from.length):'');
  function languagePath(){
    const pairs=english?[
      ['/news','/vijesti'],['/publications','/objave'],['/markets','/trzista'],['/en/assistant','/assistant'],['/en/contact','/contact'],['/en/downloads','/downloads'],['/en/legal','/legal']
    ]:[
      ['/vijesti','/news'],['/objave','/publications'],['/trzista','/markets'],['/assistant','/en/assistant'],['/contact','/en/contact'],['/downloads','/en/downloads'],['/legal','/en/legal']
    ];
    for(const [from,to] of pairs){const target=swap(from,to);if(target)return `${target}/`.replace(/\/+/g,'/');}
    return english?'/':'/en/';
  }
  const hash=location.hash.toLowerCase();
  const active=path.startsWith('/assistant')||path.startsWith('/en/assistant')?'ai':
    path.startsWith('/trzista')||path.startsWith('/markets')?'markets':
    path.startsWith('/objave')||path.startsWith('/publications')?'publications':
    path.startsWith('/vijesti')||path.startsWith('/news')?'news':
    path.startsWith('/visual-index')?'gallery':
    path.startsWith('/admin-center')||path.startsWith('/operator-dashboard')?'admin':
    path.startsWith('/contact')||path.startsWith('/en/contact')?'contact':
    (path==='/'||path==='/en')&&hash==='#the-code'?'code':
    (path==='/'&&hash==='#financije')||(path==='/en'&&hash==='#financials')?'finance':
    (path==='/'&&hash==='#mreza')||(path==='/en'&&hash==='#network')?'network':'';
  const links=[
    ['THE CODE',english?'/en/#the-code':'/#the-code','code'],
    [labels.finance,english?'/en/#financials':'/#financije','finance'],
    [labels.network,english?'/en/#network':'/#mreza','network'],
    [labels.news,english?'/news/':'/vijesti/','news'],
    [labels.publications,english?'/publications/':'/objave/','publications'],
    [labels.markets,english?'/markets/':'/trzista/','markets'],
    [labels.gallery,'/visual-index/','gallery'],
    ['AI',english?'/en/assistant/':'/assistant/','ai'],
    ['Admin','/admin-center/','admin'],
    [labels.contact,english?'/en/contact/':'/contact/','contact'],
    [labels.language,languagePath(),'language']
  ];
  const header=document.createElement('header');
  header.className='gnk-public-menu-v10 gnk-public-menu-v15';
  header.dataset.release=RELEASE;
  header.setAttribute('aria-label',english?'GNK ASG public navigation':'GNK ASG javna navigacija');
  header.innerHTML=`<div class="gnk-public-menu-v10__inner"><a class="gnk-public-menu-v10__brand" href="${english?'/en/':'/'}" aria-label="GNK ASG"><span class="gnk-index-brand-name"><strong>GNK ASG d.o.o.</strong></span><i class="gnk-index-brand-divider" aria-hidden="true"></i><span class="gnk-index-brand-name"><strong>GNK DINAMO Ltd.</strong></span></a><button class="gnk-public-menu-v10__toggle" type="button" aria-expanded="false" aria-controls="gnkPublicNav" aria-label="${labels.open}">☰</button><nav id="gnkPublicNav" class="gnk-public-menu-v10__nav">${links.map(([label,url,key])=>`<a href="${url}" data-key="${key}"${key==='ai'?' data-ai':''}${key==='language'?' data-lang':''}${key==='admin'?' rel="nofollow"':''}${key===active?' class="is-active" aria-current="page"':''}>${label}</a>`).join('')}</nav></div>`;
  document.body.prepend(header);
  document.body.classList.add('gnk-public-shell-active');

  const legacySelectors=['body > header:not(.gnk-public-menu-v10):not(.gnk-public-menu-v15)','.index-nav','.site-header','#gnk-asg-premium-header','.shell > .brand-head','.shell > .top-nav','.top-nav','body > main > nav','.gnk-asg-full-menu-v2','.gnk-asg-rescue-menu','.gnk-asg-final-menu-wrap','.gnk-asg-inner-nav','.floating-home','.floating-ai','.gnk-global-float-home','.gnk-global-float-ai','#gnk-ai-badge-v13','#gnk-asg-float-home','#gnk-asg-float-ai','.gnk-asg-floating-actions'];
  const suppressLegacy=()=>legacySelectors.forEach(selector=>document.querySelectorAll(selector).forEach(node=>{if(node!==header&&!header.contains(node)){node.setAttribute('aria-hidden','true');node.style.setProperty('display','none','important');}}));
  suppressLegacy();
  window.addEventListener('load',suppressLegacy,{once:true});
  [80,250,650,1400,3000].forEach(delay=>setTimeout(suppressLegacy,delay));

  const toggle=header.querySelector('.gnk-public-menu-v10__toggle');
  const open=value=>{header.classList.toggle('is-open',value);toggle?.setAttribute('aria-expanded',String(value));toggle?.setAttribute('aria-label',value?labels.close:labels.open);if(toggle)toggle.textContent=value?'×':'☰';};
  toggle?.addEventListener('click',()=>open(!header.classList.contains('is-open')));
  header.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>open(false)));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')open(false);});

  if(!document.querySelector('.public-float--home,.gnk-public-float-v10--home')){const home=document.createElement('a');home.className='gnk-public-float-v10 gnk-public-float-v15 gnk-public-float-v10--home';home.href=english?'/en/':'/';home.setAttribute('aria-label',labels.home);home.innerHTML=`<i aria-hidden="true">⌂</i><span>${labels.home}</span>`;document.body.appendChild(home);}
  if(!document.querySelector('.public-float--ai,.gnk-public-float-v10--ai')){const ai=document.createElement('a');ai.className='gnk-public-float-v10 gnk-public-float-v15 gnk-public-float-v10--ai';ai.href=english?'/en/assistant/':'/assistant/';ai.setAttribute('aria-label',labels.help);ai.innerHTML=`<i aria-hidden="true">AI</i><span>${labels.help}</span>`;document.body.appendChild(ai);}
})();
