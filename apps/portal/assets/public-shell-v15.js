(()=>{
  'use strict';
  const RELEASE='GNK_ASG_PUBLIC_SHELL_V16_UNIFIED_NAVIGATION_20260628';
  const query=new URLSearchParams(location.search);
  if(query.get('embedded')==='1'||query.get('mode')==='admin'||document.documentElement.dataset.gnkPublicShell===RELEASE)return;
  document.documentElement.dataset.gnkPublicShell=RELEASE;

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

  const active=path.startsWith('/assistant')||path.startsWith('/en/assistant')?'ai':
    path.startsWith('/trzista')||path.startsWith('/markets')?'markets':
    path.startsWith('/objave')||path.startsWith('/publications')?'publications':
    path.startsWith('/vijesti')||path.startsWith('/news')?'news':
    path.startsWith('/visual-index')?'gallery':
    path.startsWith('/admin-center')||path.startsWith('/operator-dashboard')?'admin':
    path.startsWith('/contact')||path.startsWith('/en/contact')?'contact':'';

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

  const legacy=['.gnk-public-menu-v10','.gnk-public-menu-v15','.gnk-public-float-v10','.gnk-public-float-v15','body > header','.site-header','#gnk-asg-premium-header','.shell > .brand-head','.shell > .top-nav','.top-nav','body > main > nav','.gnk-v13-menu','.gnk-asg-full-menu-v2','.gnk-asg-rescue-menu','.gnk-asg-final-menu-wrap','.gnk-asg-inner-nav','.floating-home','.floating-ai','.gnk-global-float-home','.gnk-global-float-ai','#gnk-ai-badge-v13','#gnk-asg-float-home','#gnk-asg-float-ai','.gnk-asg-floating-actions','.public-float--home','.public-float--ai'];
  const clear=keep=>legacy.forEach(selector=>document.querySelectorAll(selector).forEach(node=>{if(node!==keep&&!keep?.contains(node))node.remove();}));
  clear();
  document.body.classList.add('gnk-public-shell-active',`gnk-public-route-${(active||path.split('/').filter(Boolean).pop()||'home').replace(/[^a-z0-9-]/gi,'-')}`);

  const header=document.createElement('header');
  header.className='gnk-public-menu-v10 gnk-public-menu-v15';
  header.dataset.release=RELEASE;
  header.setAttribute('aria-label',english?'GNK ASG public navigation':'GNK ASG javna navigacija');
  header.innerHTML=`<div class="gnk-public-menu-v10__inner"><a class="gnk-public-menu-v10__brand" href="${english?'/en/':'/'}" aria-label="GNK ASG"><span class="gnk-index-brand-name"><strong>GNK ASG d.o.o.</strong></span><i class="gnk-index-brand-divider" aria-hidden="true"></i><span class="gnk-index-brand-name"><strong>GNK DINAMO Ltd.</strong></span></a><button class="gnk-public-menu-v10__toggle" type="button" aria-expanded="false" aria-controls="gnkPublicNav" aria-label="${labels.open}">☰</button><nav id="gnkPublicNav" class="gnk-public-menu-v10__nav">${links.map(([label,url,key])=>`<a href="${url}" data-key="${key}"${key==='ai'?' data-ai':''}${key==='language'?' data-lang':''}${key==='admin'?' rel="nofollow"':''}${key===active?' class="is-active" aria-current="page"':''}>${label}</a>`).join('')}</nav></div>`;
  document.body.prepend(header);

  const float=(kind,href,label,icon)=>{const link=document.createElement('a');link.className=`gnk-public-float-v10 gnk-public-float-v15 gnk-public-float-v10--${kind}`;link.href=href;link.setAttribute('aria-label',label);link.innerHTML=`<i aria-hidden="true">${icon}</i><span>${label}</span>`;document.body.appendChild(link);return link;};
  const home=float('home',english?'/en/':'/',labels.home,'⌂');
  const ai=float('ai',english?'/en/assistant/':'/assistant/',labels.help,'AI');
  const toggle=header.querySelector('.gnk-public-menu-v10__toggle');
  const open=value=>{header.classList.toggle('is-open',value);toggle?.setAttribute('aria-expanded',String(value));toggle?.setAttribute('aria-label',value?labels.close:labels.open);if(toggle)toggle.textContent=value?'×':'☰';};
  toggle?.addEventListener('click',()=>open(!header.classList.contains('is-open')));
  header.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>open(false)));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')open(false);});

  const normalize=()=>{clear(header);if(!document.body.contains(header))document.body.prepend(header);if(!document.body.contains(home))document.body.appendChild(home);if(!document.body.contains(ai))document.body.appendChild(ai);};
  window.addEventListener('load',normalize,{once:true});
  [100,400,1200,3000].forEach(delay=>setTimeout(normalize,delay));
})();
