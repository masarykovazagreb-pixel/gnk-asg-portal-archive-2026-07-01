(()=>{
'use strict';
const VERSION='GNK_RELEASE_COMPLETION_V4_20260713_INDEX_MENU_GOLD_BRANDS';
if(window.__GNK_RELEASE_COMPLETION_V4__)return;window.__GNK_RELEASE_COMPLETION_V4__=true;
const path=location.pathname.replace(/\/+$/,'')||'/';
const english=document.documentElement.lang?.toLowerCase().startsWith('en')||path==='/en'||path.startsWith('/en/');
const isIndex=path==='/'||path==='/en';
const style=document.createElement('style');style.textContent=`
.site-header,.menu-toggle,.nav-links,#gnk-floating-menu,#gnk-floating-menu-v2,#gnk-event-bar,.public-floating-menu,.floating-menu{display:none!important}
.gnk-finance-brand{width:min(1180px,calc(100% - 32px));margin:0 auto 26px;display:flex;align-items:center;gap:24px;padding:20px 24px;border:1px solid rgba(184,138,47,.38);border-radius:20px;background:linear-gradient(145deg,#fffdf7,#f7f0df);box-shadow:0 16px 42px rgba(15,23,42,.08)}
.gnk-finance-brand img{display:block;width:min(280px,42vw);max-height:150px;object-fit:contain}.gnk-finance-brand strong{font:700 clamp(22px,3vw,38px)/1.15 Georgia,serif;color:#5c3a00}
.gnk-doc-logo{display:block;width:100%;height:92px;object-fit:contain;object-position:left center;margin:0 0 16px}
@media(max-width:700px){.gnk-finance-brand{flex-direction:column;align-items:flex-start}.gnk-finance-brand img{width:min(260px,72vw)}}`;
document.head.appendChild(style);
function purgeDuplicateMenus(){
  document.querySelectorAll('#gnk-floating-menu,#gnk-floating-menu-v2,#gnk-event-bar,.public-floating-menu,.floating-menu,.site-header,.menu-toggle,.nav-links').forEach(el=>{if(!el.closest('#gnk-compact-menu'))el.remove();});
  document.querySelectorAll('script[src*="public-floating-menu"],script[data-gnk-floating-menu]').forEach(el=>el.remove());
  const menus=[...document.querySelectorAll('#gnk-compact-menu')];menus.slice(1).forEach(el=>el.remove());
  const strips=[...document.querySelectorAll('#gnk-compact-strip')];strips.slice(1).forEach(el=>el.remove());
}
function addFinanceBrand(){
  if(!isIndex)return;
  const section=document.getElementById('financials');if(!section)return;
  section.querySelectorAll('.gnk-finance-brand').forEach(el=>el.remove());
  const brand=document.createElement('div');brand.className='gnk-finance-brand';
  brand.innerHTML=`<img src="/assets/logo-gnk-asg-gold.svg" alt="GNK ASG"><strong>${english?'GNK ASG d.o.o. financial profile':'Financijski profil GNK ASG d.o.o.'}</strong>`;
  const container=section.querySelector('.container');if(container)container.prepend(brand);else section.prepend(brand);
}
function addDocumentLogos(){
  if(!isIndex)return;
  document.querySelectorAll('#dokumenti .doc').forEach((card,index)=>{
    card.querySelectorAll('.gnk-doc-logo,.gnk-finance-logo').forEach(el=>el.remove());
    const img=document.createElement('img');img.className='gnk-doc-logo';
    if(index===0){img.src='/assets/logo-gnk-asg-gold.svg';img.alt='GNK ASG';}
    else{img.src='/assets/logo-gnk-dinamo-ltd.svg';img.alt='GNK DINAMO Ltd. Group';}
    card.prepend(img);
  });
}
function run(){purgeDuplicateMenus();addFinanceBrand();addDocumentLogos();document.documentElement.dataset.gnkReleaseCompletion=VERSION;}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
const observer=new MutationObserver(purgeDuplicateMenus);observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),30000);
})();