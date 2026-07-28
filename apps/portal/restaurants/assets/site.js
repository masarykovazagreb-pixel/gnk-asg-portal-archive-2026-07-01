(()=>{
'use strict';
const body=document.body;
const path=location.pathname.replace(/\/+$/,'')||'/';
const city=path.split('/')[2]||'';
const key='gnkRoyalLang:'+(city||'hub');
const setLanguage=lang=>{
  body.classList.toggle('lang-en',lang==='en');
  body.classList.toggle('lang-local',lang!=='en');
  body.dir=lang==='ar'?'rtl':'ltr';
  document.documentElement.lang=lang;
  localStorage.setItem(key,lang);
};
const ensurePublicMenu=()=>{
  if(document.querySelector('script[src*="public-unified-menu-v6.js"]'))return;
  const script=document.createElement('script');
  script.defer=true;
  script.src='/assets/public-unified-menu-v6.js?v=20260728-restaurants-runtime';
  document.head.appendChild(script);
};
const labels={
  'hong-kong':{city:'Hong Kong',local:'香港',localCode:'zh-Hant'},
  cairo:{city:'Cairo',local:'القاهرة',localCode:'ar'},
  singapore:{city:'Singapore',local:'新加坡',localCode:'zh-Hans'}
};
const internalNav=document.createElement('nav');
internalNav.className='restaurant-internal-nav';
internalNav.setAttribute('aria-label','GNK Royal restaurant navigation');
const root='/restaurants/';
const current=labels[city];
internalNav.innerHTML=`<div class="restaurant-nav-inner"><a class="restaurant-home" href="${root}">GNK Royal</a><div class="restaurant-city-links"><a href="${root}hong-kong/"${city==='hong-kong'?' aria-current="page"':''}>Hong Kong</a><a href="${root}cairo/"${city==='cairo'?' aria-current="page"':''}>Cairo</a><a href="${root}singapore/"${city==='singapore'?' aria-current="page"':''}>Singapore</a></div>${current?`<div class="restaurant-section-links"><a href="#experience">Experience</a><a href="#food">Food</a><a href="#drinks">Drinks</a><a href="#gallery">Gallery</a><a href="#reserve">Reserve</a></div><div class="restaurant-lang"><button type="button" data-set-lang="en">EN</button><button type="button" data-set-lang="${current.localCode}">${current.local}</button></div>`:''}</div>`;
const anchor=document.querySelector('main')||body.firstChild;
body.insertBefore(internalNav,anchor);
document.querySelectorAll('[data-set-lang]').forEach(button=>button.addEventListener('click',()=>setLanguage(button.dataset.setLang)));
setLanguage(localStorage.getItem(key)||'en');
const date=document.querySelector('input[type=date]');
if(date)date.min=new Date().toISOString().slice(0,10);
document.querySelector('form')?.addEventListener('submit',event=>{
  event.preventDefault();
  if(!event.currentTarget.reportValidity())return;
  const data=new FormData(event.currentTarget);
  const subject=encodeURIComponent(`GNK Royal ${current?.city||'Restaurant'} reservation enquiry`);
  const message=encodeURIComponent([...data].map(([name,value])=>`${name}: ${value}`).join('\n'));
  location.href=`mailto:it@gnk-asg.hr?subject=${subject}&body=${message}`;
});
ensurePublicMenu();
})();
