(()=>{
  'use strict';
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const news=path==='/vijesti'||path==='/news'||path.startsWith('/vijesti/')||path.startsWith('/news/');
  const publications=path==='/objave'||path.startsWith('/objave/');
  if(!news&&!publications)return;
  document.body.classList.add('gnk-editorial-v12',news?'gnk-route-news':'gnk-route-publications');
  document.querySelectorAll('body>header,.site-header,.floating-home,.floating-ai').forEach(node=>{node.setAttribute('aria-hidden','true');node.style.display='none'});
  const main=document.querySelector('main');
  if(main)main.setAttribute('data-editorial-release','V12');
  if(publications){
    const total=document.querySelectorAll('.card[data-language]').length;
    const hr=document.querySelectorAll('.card[data-language="HR"]').length;
    const en=document.querySelectorAll('.card[data-language="EN"]').length;
    const stats=document.querySelectorAll('.stat strong');
    if(stats[0])stats[0].textContent=String(total);
    if(stats[1])stats[1].textContent=String(hr);
    if(stats[2])stats[2].textContent=String(en);
    document.querySelectorAll('.card img').forEach(img=>{
      img.loading='lazy';img.decoding='async';
      if(!img.alt.trim())img.alt=img.closest('.card')?.querySelector('h2')?.textContent?.trim()||'GNK ASG objava';
    });
  }
  if(news){
    const grid=document.getElementById('newsGrid');
    const observer=new MutationObserver(()=>{
      grid?.querySelectorAll('.news-card img').forEach(img=>{img.loading='lazy';img.decoding='async';if(!img.alt.trim())img.alt=img.closest('.news-card')?.querySelector('h2')?.textContent?.trim()||'GNK ASG vijest'});
    });
    if(grid)observer.observe(grid,{childList:true,subtree:true});
  }
})();
