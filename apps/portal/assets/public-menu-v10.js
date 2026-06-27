(()=>{
  'use strict';
  if(document.documentElement.dataset.gnkPublicMenuV10==='1')return;
  document.documentElement.dataset.gnkPublicMenuV10='1';
  const en=document.documentElement.lang==='en'||location.pathname.startsWith('/en/');
  const labels=en?{
    home:'Home',profile:'Profile',finance:'Financials',markets:'Markets',publications:'Publications',news:'News',media:'Media Kit',contact:'Contact',ai:'AI Help',lang:'HR'
  }:{home:'Početna',profile:'Profil',finance:'Financije',markets:'Tržišta',publications:'Objave',news:'Vijesti',media:'Media Kit',contact:'Kontakt',ai:'AI pomoć',lang:'EN'};
  const links=[
    [labels.home,en?'/en/':'/','home'],
    [labels.profile,en?'/en/#top':'/#top','profile'],
    [labels.finance,en?'/en/#financials':'/#financije','finance'],
    [labels.markets,en?'/markets/':'/trzista/','markets'],
    [labels.publications,'/objave/','publications'],
    [labels.news,'/vijesti/','news'],
    [labels.media,'/media-kit/','media'],
    [labels.contact,'/contact/','contact'],
    [labels.ai,en?'/en/assistant/':'/assistant/','ai'],
    [labels.lang,en?'/':'/en/','lang']
  ];
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const activeKey=path==='/assistant'||path==='/en/assistant'?'ai':path==='/trzista'||path==='/markets'?'markets':path.startsWith('/objave')?'publications':path.startsWith('/vijesti')||path.startsWith('/news')?'news':path.startsWith('/media-kit')?'media':path.startsWith('/contact')?'contact':path==='/'||path==='/en'?'home':'';
  const header=document.createElement('header');
  header.className='gnk-public-menu-v10';
  header.setAttribute('aria-label',en?'GNK ASG public navigation':'GNK ASG javna navigacija');
  header.innerHTML=`<div class="gnk-public-menu-v10__inner"><a class="gnk-public-menu-v10__brand" href="${en?'/en/':'/'}"><img src="/favicon.svg" alt="GNK ASG"><span><strong>GNK ASG</strong><small>GNK DINAMO Ltd. Group</small></span></a><button class="gnk-public-menu-v10__toggle" type="button" aria-expanded="false" aria-label="${en?'Open menu':'Otvori izbornik'}">☰</button><nav class="gnk-public-menu-v10__nav">${links.map(([label,url,key])=>`<a href="${url}" data-key="${key}"${key==='ai'?' data-ai':''}${key==='lang'?' data-lang':''} class="${key===activeKey?'is-active':''}">${label}</a>`).join('')}</nav></div>`;
  document.body.prepend(header);
  document.body.classList.add('gnk-public-shell-active');
  document.querySelectorAll('body>.index-nav,body>main>nav,.gnk-asg-full-menu-v2,.gnk-asg-rescue-menu').forEach(node=>node.setAttribute('aria-hidden','true'));
  const toggle=header.querySelector('.gnk-public-menu-v10__toggle');
  toggle?.addEventListener('click',()=>{const open=header.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'×':'☰'});
  header.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{header.classList.remove('is-open');toggle?.setAttribute('aria-expanded','false')}));
  if(!document.querySelector('.public-float,.gnk-public-float-v10--home')){
    const home=document.createElement('a');home.className='gnk-public-float-v10 gnk-public-float-v10--home';home.href=en?'/en/':'/';home.innerHTML=`<i>⌂</i><span>${labels.home}</span>`;document.body.appendChild(home);
  }
  if(!document.querySelector('.public-float--ai,.gnk-public-float-v10--ai')){
    const ai=document.createElement('a');ai.className='gnk-public-float-v10 gnk-public-float-v10--ai';ai.href=en?'/en/assistant/':'/assistant/';ai.innerHTML=`<i>AI</i><span>${labels.ai}</span>`;document.body.appendChild(ai);
  }
})();
