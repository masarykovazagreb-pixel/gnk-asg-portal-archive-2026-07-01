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
    status.innerHTML=`<i></i>${en?'Live HTML presentation · six scenes':'HTML prezentacija uživo · šest scena'}`;
    heading?.appendChild(status);
  }

  const frame=document.querySelector('.code-frame');
  const iframe=document.getElementById('codePreview');
  const codeStage=document.querySelector('.code-stage');
  if(codeStage&&frame&&iframe&&!codeStage.querySelector('.code-launch-bar')){
    const launch=document.createElement('div');
    launch.className='code-launch-bar';
    launch.innerHTML=`
      <div class="code-launch-copy">
        <small>${en?'THE CODE · 390 × 844 · six scenes':'THE CODE · 390 × 844 · šest scena'}</small>
        <strong>${en?'Start the presentation from scene one':'Pokreni prezentaciju od prve scene'}</strong>
        <span>${en?'The live countdown remains the permanent default and final screen.':'LIVE odbrojavanje ostaje stalni početni i završni prikaz.'}</span>
      </div>
      <button class="code-launch-button" type="button">${en?'Start presentation':'Pokreni prezentaciju'}</button>`;
    frame.before(launch);

    frame.classList.add('code-frame--editorial');
    const left=document.createElement('aside');
    left.className='code-company code-company--asg';
    left.setAttribute('aria-label','GNK ASG d.o.o.');
    left.innerHTML=`
      <div>
        <span class="code-company__eyebrow">01 · Zagreb · ${en?'Croatia':'Hrvatska'}</span>
        <h3>GNK ASG<br>d.o.o.</h3>
        <p class="code-company__intro">${en?'Standalone audited financial indicators for fiscal year 2025.':'Samostalni revidirani financijski pokazatelji za poslovnu 2025. godinu.'}</p>
        <div class="code-company__metrics">
          <div class="code-company__metric"><small>${en?'Total revenue':'Ukupni prihodi'}</small><strong>€504.00M</strong><span>FY 2025</span></div>
          <div class="code-company__metric"><small>${en?'Total assets':'Ukupna aktiva'}</small><strong>€46.40M</strong><span>${en?'Audited':'Revidirano'}</span></div>
          <div class="code-company__metric"><small>${en?'Equity and reserves':'Kapital i rezerve'}</small><strong>€46.21M</strong><span>${en?'Standalone':'Samostalno'}</span></div>
        </div>
      </div>
      <div class="code-company__footer">GNK ASG d.o.o. · Zagreb · FY 2025</div>`;

    const right=document.createElement('aside');
    right.className='code-company code-company--dinamo';
    right.setAttribute('aria-label','GNK DINAMO Ltd.');
    right.innerHTML=`
      <div>
        <span class="code-company__eyebrow">02 · Boulder · Colorado</span>
        <h3>GNK DINAMO<br>Ltd. Group</h3>
        <p class="code-company__intro">${en?'Consolidated group strength, global network and New York activation.':'Konsolidirana snaga grupe, globalna mreža i aktivacija u New Yorku.'}</p>
        <div class="code-company__metrics">
          <div class="code-company__metric"><small>${en?'Group revenue':'Prihod grupe'}</small><strong>€4.7046B</strong><span>FY 2025</span></div>
          <div class="code-company__metric"><small>${en?'Net income':'Neto dobit'}</small><strong>€982.48M</strong><span>${en?'Consolidated':'Konsolidirano'}</span></div>
          <div class="code-company__metric"><small>${en?'Equity ratio':'Udio kapitala'}</small><strong>98.02%</strong><span>45 ${en?'locations':'lokacija'}</span></div>
        </div>
        <div class="code-company__event"><small>${en?'Code activation':'Aktivacija koda'}</small><strong>07 OCT 2026</strong><span>11:30 AM · New York ET</span></div>
      </div>
      <div class="code-company__footer">GNK DINAMO Ltd. · Entity ID 20238180649</div>`;

    frame.insertBefore(left,iframe);
    frame.appendChild(right);

    const button=launch.querySelector('.code-launch-button');
    button?.addEventListener('click',()=>{
      iframe.contentWindow?.postMessage({type:'gnk-code-start'},'*');
      button.disabled=true;
      button.classList.remove('is-complete');
      button.textContent=en?'Presentation running':'Prezentacija traje';
    });
    window.addEventListener('message',event=>{
      if(event.source!==iframe.contentWindow||event.data?.type!=='gnk-code-playback')return;
      if(event.data.state==='playing'){
        button.disabled=true;
        button.classList.remove('is-complete');
        button.textContent=en?'Presentation running':'Prezentacija traje';
      }else{
        button.disabled=false;
        button.classList.toggle('is-complete',event.data.state==='complete');
        button.textContent=event.data.state==='complete'?(en?'Replay presentation':'Ponovno pokreni'):(en?'Start presentation':'Pokreni prezentaciju');
      }
    });
  }

  document.querySelectorAll('.finance-card').forEach((card,index)=>{
    if(!card.querySelector('.finance-card__index')){
      const marker=document.createElement('span');
      marker.className='finance-card__index';
      marker.textContent=String(index+1).padStart(2,'0');
      card.appendChild(marker);
    }
  });

  const revealTargets=[...document.querySelectorAll('.code-stage,.panel,.network,.finance-card,.location-item')];
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
    sections.forEach(section=>{if(section.getBoundingClientRect().top<=innerHeight*.34)active=section.id;});
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

(()=>{
  'use strict';
  const style=document.createElement('link');
  style.rel='stylesheet';
  style.href='/assets/index-readability-v6.css?v=20260627-v6';
  style.dataset.indexReadability='v6';
  if(!document.querySelector('[data-index-readability="v6"]'))document.head.appendChild(style);

  const iframe=document.getElementById('codePreview');
  const button=document.querySelector('.code-launch-button');
  if(!iframe||!button)return;

  const en=document.documentElement.lang==='en';
  let pending=false;
  let playing=false;
  let retries=0;
  let timer=0;

  const setButton=state=>{
    if(state==='playing'){
      playing=true;
      pending=false;
      clearTimeout(timer);
      button.disabled=true;
      button.classList.remove('is-complete');
      button.textContent=en?'Presentation running':'Prezentacija traje';
      return;
    }
    playing=false;
    button.disabled=false;
    button.classList.toggle('is-complete',state==='complete');
    button.textContent=state==='complete'?(en?'Replay presentation':'Ponovno pokreni'):(en?'Start presentation':'Pokreni prezentaciju');
  };

  const sendStart=()=>{
    if(!pending||playing)return;
    iframe.contentWindow?.postMessage({type:'gnk-code-start',source:'index-v6'},'*');
    retries+=1;
    if(retries<20)timer=window.setTimeout(sendStart,250);
    else{
      pending=false;
      button.disabled=false;
      button.textContent=en?'Try again':'Pokušaj ponovno';
    }
  };

  button.addEventListener('click',event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    pending=true;
    playing=false;
    retries=0;
    clearTimeout(timer);
    button.disabled=true;
    button.classList.remove('is-complete');
    button.textContent=en?'Starting presentation':'Pokretanje prezentacije';
    sendStart();
  },true);

  iframe.addEventListener('load',()=>{
    if(pending){retries=0;sendStart();}
  });

  window.addEventListener('message',event=>{
    if(event.source!==iframe.contentWindow||event.data?.type!=='gnk-code-playback')return;
    setButton(event.data.state);
  });
})();
