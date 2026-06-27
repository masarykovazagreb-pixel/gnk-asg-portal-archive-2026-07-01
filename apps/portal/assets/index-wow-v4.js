(()=>{
  'use strict';
  const en=document.documentElement.lang==='en';
  const body=document.body;
  body.classList.add('wow-index');

  const hero=document.querySelector('.hero');
  if(hero&&!hero.querySelector('.hero-content')){
    const titleBlock=hero.firstElementChild;
    const copy=hero.querySelector('.hero-copy');
    const actions=hero.querySelector('.hero-actions');
    const content=document.createElement('div');
    content.className='hero-content';
    const side=document.createElement('div');
    side.className='hero-side';
    titleBlock?.classList.add('hero-title-block');
    hero.insertBefore(content,titleBlock||hero.firstChild);
    if(titleBlock)content.appendChild(titleBlock);
    if(copy)side.appendChild(copy);
    if(actions)side.appendChild(actions);
    content.appendChild(side);

    const meta=document.createElement('div');
    meta.className='hero-meta';
    meta.innerHTML=`
      <div class="hero-meta__item"><strong>45</strong><span>${en?'global locations':'globalnih lokacija'}</span></div>
      <div class="hero-meta__item"><strong>6</strong><span>${en?'continents':'kontinenata'}</span></div>
      <div class="hero-meta__item"><strong>2025</strong><span>${en?'financial reporting':'financijsko izvještavanje'}</span></div>`;
    content.appendChild(meta);

    const sculpture=document.createElement('div');
    sculpture.className='hero-sculpture';
    sculpture.setAttribute('aria-hidden','true');
    sculpture.innerHTML=`
      <i class="hero-orbit hero-orbit--a"></i>
      <i class="hero-orbit hero-orbit--b"></i>
      <i class="hero-orbit hero-orbit--c"></i>
      <span class="hero-node hero-node--1"></span>
      <span class="hero-node hero-node--2"></span>
      <span class="hero-node hero-node--3"></span>
      <span class="hero-node hero-node--4"></span>
      <div class="hero-core"><div><span>GNK</span><strong>ASG</strong><small>${en?'Global group':'Globalna grupa'}</small></div></div>
      <div class="hero-sculpture__caption"><small>${en?'Private corporate network':'Privatna korporativna mreža'}</small><strong>33 + 12</strong></div>`;
    hero.appendChild(sculpture);
  }

  const signature=(selector,index,label)=>{
    const section=document.querySelector(selector);
    if(!section||section.querySelector('.section-signature'))return;
    const node=document.createElement('div');
    node.className='section-signature';
    node.innerHTML=`<span>${index} / ${label}</span><b>GNK ASG · GNK DINAMO Ltd.</b>`;
    section.insertBefore(node,section.firstChild);
  };
  signature('.code-stage','02',en?'THE CODE':'THE CODE');
  signature('.panel','03',en?'FINANCIAL REPORTING':'FINANCIJSKI IZVJEŠTAJI');
  signature('.network','04',en?'GLOBAL NETWORK':'GLOBALNA MREŽA');

  const toolbar=document.querySelector('.code-toolbar');
  if(toolbar&&!toolbar.querySelector('.code-status')){
    const heading=toolbar.firstElementChild;
    const status=document.createElement('div');
    status.className='code-status';
    status.innerHTML=`<i></i>${en?'Live HTML presentation · full size':'HTML prezentacija uživo · puna veličina'}`;
    heading?.appendChild(status);
  }

  document.querySelectorAll('.finance-card').forEach((card,index)=>{
    if(!card.querySelector('.finance-card__index')){
      const marker=document.createElement('span');
      marker.className='finance-card__index';
      marker.textContent=String(index+1).padStart(2,'0');
      card.appendChild(marker);
    }
  });

  const revealTargets=[
    ...document.querySelectorAll('.code-stage,.panel,.network,.finance-card,.location-item')
  ];
  revealTargets.forEach(node=>node.classList.add('wow-reveal'));
  if('IntersectionObserver'in window){
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },{threshold:.08,rootMargin:'0px 0px -6% 0px'});
    revealTargets.forEach(node=>observer.observe(node));
  }else revealTargets.forEach(node=>node.classList.add('is-visible'));

  const nav=document.querySelector('.index-nav');
  const navLinks=[...document.querySelectorAll('.menu a[href^="#"]')];
  const sections=navLinks.map(link=>document.querySelector(link.getAttribute('href'))).filter(Boolean);
  const updateProgress=()=>{
    const doc=document.documentElement;
    const max=Math.max(1,doc.scrollHeight-innerHeight);
    nav?.style.setProperty('--scroll-progress',`${Math.min(100,(scrollY/max)*100)}%`);
    let active=null;
    sections.forEach(section=>{
      if(section.getBoundingClientRect().top<=innerHeight*.34)active=section.id;
    });
    navLinks.forEach(link=>link.classList.toggle('is-active',link.getAttribute('href')===`#${active}`));
  };
  addEventListener('scroll',updateProgress,{passive:true});
  addEventListener('resize',updateProgress,{passive:true});
  updateProgress();

  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sculpture=document.querySelector('.hero-sculpture');
  if(!reduced&&sculpture){
    hero?.addEventListener('pointermove',event=>{
      const rect=hero.getBoundingClientRect();
      const x=(event.clientX-rect.left)/rect.width-.5;
      const y=(event.clientY-rect.top)/rect.height-.5;
      sculpture.style.setProperty('--sculpture-x',`${x*14}px`);
      sculpture.style.setProperty('--sculpture-y',`${y*10}px`);
      body.style.setProperty('--wow-x',`${event.clientX}px`);
      body.style.setProperty('--wow-y',`${event.clientY}px`);
    });
    hero?.addEventListener('pointerleave',()=>{
      sculpture.style.setProperty('--sculpture-x','0px');
      sculpture.style.setProperty('--sculpture-y','0px');
    });
  }
})();
