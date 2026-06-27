(()=>{
  'use strict';
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const news=path==='/vijesti'||path==='/news'||path.startsWith('/vijesti/')||path.startsWith('/news/');
  const publications=path==='/objave'||path==='/publications'||path.startsWith('/objave/')||path.startsWith('/publications/');
  if(!news&&!publications)return;
  document.body.classList.add('gnk-editorial-v12',news?'gnk-route-news':'gnk-route-publications');
  document.querySelectorAll('body>header:not(.gnk-public-menu-v15),.site-header,.floating-home,.floating-ai').forEach(node=>node.remove());
  const main=document.querySelector('main');
  if(main)main.setAttribute('data-editorial-release','V12.1');
  const normalizeImages=()=>document.querySelectorAll(news?'.news-card img':'.card img').forEach(img=>{
    img.loading='lazy';img.decoding='async';
    if(!img.alt.trim())img.alt=img.closest(news?'.news-card':'.card')?.querySelector('h2')?.textContent?.trim()||(news?'GNK ASG news':'GNK ASG publication');
  });
  if(publications){
    const cards=[...document.querySelectorAll('.card[data-language]')];
    const stats=document.querySelectorAll('.stat strong');
    if(stats[0])stats[0].textContent=String(cards.length);
    if(stats[1])stats[1].textContent=String(cards.filter(card=>card.dataset.language==='HR').length);
    if(stats[2])stats[2].textContent=String(cards.filter(card=>card.dataset.language==='EN').length);
  }
  normalizeImages();
  window.addEventListener('load',normalizeImages,{once:true});
  [250,900,2200].forEach(delay=>setTimeout(normalizeImages,delay));
})();
