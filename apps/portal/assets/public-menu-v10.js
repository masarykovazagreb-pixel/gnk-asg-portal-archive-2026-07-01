(()=>{
  'use strict';
  if(document.documentElement.dataset.gnkPublicMenuV10==='1')return;
  document.documentElement.dataset.gnkPublicMenuV10='1';

  const path=location.pathname.replace(/\/+$/,'')||'/';
  const en=document.documentElement.lang==='en'||path==='/en'||path.startsWith('/en/')||path.startsWith('/markets')||path.startsWith('/news')||path.startsWith('/publications');
  const labels=en?{
    code:'THE CODE',finance:'Financials',network:'Network',news:'News',publications:'Publications',markets:'Markets',gallery:'Gallery',ai:'AI',admin:'Admin',contact:'Contact',lang:'HR',home:'Home',aiHelp:'AI Help'
  }:{
    code:'THE CODE',finance:'Financije',network:'Mreža',news:'Vijesti',publications:'Objave',markets:'Tržišta',gallery:'Galerija',ai:'AI',admin:'Admin',contact:'Kontakt',lang:'EN',home:'Početna',aiHelp:'AI pomoć'
  };
  const links=[
    [labels.code,en?'/en/#the-code':'/#the-code','code'],
    [labels.finance,en?'/en/#financials':'/#financije','finance'],
    [labels.network,en?'/en/#network':'/#mreza','network'],
    [labels.news,en?'/news/':'/vijesti/','news'],
    [labels.publications,en?'/publications/':'/objave/','publications'],
    [labels.markets,en?'/markets/':'/trzista/','markets'],
    [labels.gallery,'/visual-index/','gallery'],
    [labels.ai,en?'/en/assistant/':'/assistant/','ai'],
    [labels.admin,'/operator-dashboard/','admin'],
    [labels.contact,'/contact/','contact'],
    [labels.lang,en?'/':'/en/','lang']
  ];

  const hash=location.hash.toLowerCase();
  const activeKey=path.startsWith('/assistant')||path.startsWith('/en/assistant')?'ai':
    path.startsWith('/trzista')||path.startsWith('/markets')?'markets':
    path.startsWith('/objave')||path.startsWith('/publications')?'publications':
    path.startsWith('/vijesti')||path.startsWith('/news')?'news':
    path.startsWith('/visual-index')?'gallery':
    path.startsWith('/operator-dashboard')||path.startsWith('/admin-center')?'admin':
    path.startsWith('/contact')||path.startsWith('/en/contact')?'contact':
    (path==='/'||path==='/en')&&hash==='#the-code'?'code':
    (path==='/'&&hash==='#financije')||(path==='/en'&&hash==='#financials')?'finance':
    (path==='/'&&hash==='#mreza')||(path==='/en'&&hash==='#network')?'network':'';

  const header=document.createElement('header');
  header.className='gnk-public-menu-v10';
  header.setAttribute('aria-label',en?'GNK ASG public navigation':'GNK ASG javna navigacija');
  header.innerHTML=`<div class="gnk-public-menu-v10__inner"><a class="gnk-public-menu-v10__brand" href="${en?'/en/':'/'}"><img src="/favicon.svg" alt="GNK ASG"><span><strong>GNK ASG</strong><small>GNK DINAMO Ltd. Group</small></span></a><button class="gnk-public-menu-v10__toggle" type="button" aria-expanded="false" aria-label="${en?'Open menu':'Otvori izbornik'}">☰</button><nav class="gnk-public-menu-v10__nav">${links.map(([label,url,key])=>`<a href="${url}" data-key="${key}"${key==='ai'?' data-ai':''}${key==='lang'?' data-lang':''}${key==='admin'?' rel="nofollow"':''} class="${key===activeKey?'is-active':''}">${label}</a>`).join('')}</nav></div>`;
  document.body.prepend(header);
  document.body.classList.add('gnk-public-shell-active');

  const legacySelectors=[
    'body > header:not(.gnk-public-menu-v10)',
    '.index-nav','.site-header','#gnk-asg-premium-header','.shell > .brand-head','.shell > .top-nav','.top-nav',
    'body > main > nav','.gnk-asg-full-menu-v2','.gnk-asg-rescue-menu','.gnk-asg-final-menu-wrap','.gnk-asg-inner-nav',
    '.floating-home','.floating-ai','.gnk-global-float-home','.gnk-global-float-ai','#gnk-ai-badge-v13',
    '#gnk-asg-float-home','#gnk-asg-float-ai','.gnk-asg-floating-actions'
  ];
  let syncing=false;
  const suppressLegacy=()=>{
    if(syncing)return;
    syncing=true;
    header.classList.remove('gnk-v13-legacy-hidden');
    if(header.style.getPropertyValue('display')==='none')header.style.removeProperty('display');
    legacySelectors.forEach(selector=>document.querySelectorAll(selector).forEach(node=>{
      if(node===header||header.contains(node))return;
      if(node.getAttribute('aria-hidden')!=='true')node.setAttribute('aria-hidden','true');
      if(node.style.getPropertyValue('display')!=='none'||node.style.getPropertyPriority('display')!=='important')node.style.setProperty('display','none','important');
    }));
    syncing=false;
  };
  suppressLegacy();
  window.addEventListener('load',suppressLegacy,{once:true});
  [80,250,650,1400,3000,6000,10000].forEach(delay=>setTimeout(suppressLegacy,delay));

  const toggle=header.querySelector('.gnk-public-menu-v10__toggle');
  toggle?.addEventListener('click',()=>{const open=header.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'×':'☰'});
  header.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{header.classList.remove('is-open');toggle?.setAttribute('aria-expanded','false')}));

  if(!document.querySelector('.public-float--home,.gnk-public-float-v10--home')){
    const home=document.createElement('a');home.className='gnk-public-float-v10 gnk-public-float-v10--home';home.href=en?'/en/':'/';home.innerHTML=`<i>⌂</i><span>${labels.home}</span>`;document.body.appendChild(home);
  }
  if(!document.querySelector('.public-float--ai,.gnk-public-float-v10--ai')){
    const ai=document.createElement('a');ai.className='gnk-public-float-v10 gnk-public-float-v10--ai';ai.href=en?'/en/assistant/':'/assistant/';ai.innerHTML=`<i>AI</i><span>${labels.aiHelp}</span>`;document.body.appendChild(ai);
  }
})();
