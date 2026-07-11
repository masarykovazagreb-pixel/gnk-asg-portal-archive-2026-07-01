(()=>{
  'use strict';
  const button=document.querySelector('[data-dhq-menu-button]');
  const links=document.querySelector('[data-dhq-links]');
  if(button&&links){button.addEventListener('click',()=>{const open=links.classList.toggle('is-open');button.setAttribute('aria-expanded',String(open));});}

  document.querySelectorAll('.dhq-status,.dhq-note').forEach(node=>node.remove());
  document.querySelectorAll('.dhq-disclosure').forEach(node=>{
    const heading=(node.querySelector('strong')?.textContent||'').trim().toLowerCase();
    if(['važno','important','javni prikaz.','public display.'].includes(heading))node.remove();
  });

  document.querySelectorAll('[data-countdown]').forEach(node=>{
    const target=new Date(node.getAttribute('data-countdown'));
    const active=node.getAttribute('data-active-text')||'THE CODE activated';
    const tick=()=>{const diff=target-Date.now();if(diff<=0){node.textContent=active;return;}const d=Math.floor(diff/86400000),h=Math.floor(diff%86400000/3600000),m=Math.floor(diff%3600000/60000);node.textContent=`${d}d ${h}h ${m}m · New York 11:30 ET`;};
    tick();setInterval(tick,60000);
  });

  const counterpart={
    '/':'/en',
    '/about':'/en/about/',
    '/projects':'/en/projects/',
    '/projects/roadmap':'/en/projects/roadmap/',
    '/finance':'/en/finance/',
    '/reports':'/en/reports/',
    '/en':'/',
    '/en/about':'/about/',
    '/en/projects':'/projects/',
    '/en/projects/roadmap':'/projects/roadmap/',
    '/en/finance':'/finance/',
    '/en/reports':'/reports/'
  };
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const target=counterpart[path];
  if(target){document.querySelectorAll('a').forEach(anchor=>{const label=anchor.textContent.trim().toUpperCase();if(label==='EN'||label==='HR')anchor.href=target;});}

  const authLinks=[...document.querySelectorAll('[data-auth-only]')];
  authLinks.forEach(el=>{
    if(el.getAttribute('href')==='/admin-center/'){
      el.hidden=false;
      el.textContent='ADMIN LOGIN';
      el.classList.add('is-primary');
    }
  });
  const protectedLinks=authLinks.filter(el=>el.getAttribute('href')!=='/admin-center/');
  if(protectedLinks.length){fetch('/api/operator-auth-check',{credentials:'same-origin',cache:'no-store'}).then(r=>{if(r.ok)protectedLinks.forEach(el=>el.hidden=false);}).catch(()=>{});}

  const isHome=path==='/'||path==='/en';
  if(isHome){
    if(!document.querySelector('link[data-dhq-home-style]')){
      const homeCss=document.createElement('link');
      homeCss.rel='stylesheet';
      homeCss.href='/assets/digital-headquarters-home-v2.css?v=20260710-v2';
      homeCss.dataset.dhqHomeStyle='1';
      document.head.appendChild(homeCss);
    }
    if(!window.__GNK_ASG_DHQ_HOME_V2__&&!document.querySelector('script[data-dhq-home-script]')){
      const homeScript=document.createElement('script');
      homeScript.src='/assets/digital-headquarters-home-v2.js?v=20260710-v2';
      homeScript.defer=true;
      homeScript.dataset.dhqHomeScript='1';
      document.body.appendChild(homeScript);
    }
  }

  if(isHome&&!document.querySelector('[data-gnk-network-mount]')){
    const anchor=document.querySelector('#finance')||document.querySelector('footer');
    const section=document.createElement('section');
    section.className='dhq-section';
    section.id='network';
    section.innerHTML='<div data-gnk-network-mount></div>';
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(section,anchor);else document.querySelector('main')?.appendChild(section);
    const css=document.createElement('link');css.rel='stylesheet';css.href='/assets/group-network-v1.css?v=20260710-v1';document.head.appendChild(css);
    const script=document.createElement('script');script.src='/assets/group-network-v1.js?v=20260710-v1';script.defer=true;document.body.appendChild(script);
  }
  // Scroll-to-top gumb - pojavljuje se nakon skrola, radi na svim stranicama
  if(!document.querySelector('[data-scroll-top]')){
    const btn=document.createElement('button');
    btn.type='button';
    btn.dataset.scrollTop='1';
    btn.setAttribute('aria-label','Vrh stranice');
    btn.innerHTML='&#8593;';
    btn.style.cssText='position:fixed;bottom:22px;right:22px;z-index:40;width:44px;height:44px;border-radius:50%;border:1px solid rgba(214,173,79,.4);background:rgba(10,9,7,.92);color:#d6ad4f;font-size:18px;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .25s ease;box-shadow:0 8px 24px rgba(0,0,0,.4);backdrop-filter:blur(6px);';
    document.body.appendChild(btn);
    const toggle=()=>{const show=window.scrollY>500;btn.style.opacity=show?'1':'0';btn.style.pointerEvents=show?'auto':'none';};
    window.addEventListener('scroll',toggle,{passive:true});
    btn.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
    toggle();
  }
  // Site assistant widget - pretraga stranice + AI odgovori
  if(!document.querySelector('script[data-site-assistant]')){
    const s=document.createElement('script');
    s.src='/assets/site-assistant-widget-v1.js?v=20260711-v1';
    s.defer=true;
    s.dataset.siteAssistant='1';
    document.body.appendChild(s);
  }
})();