(()=>{
  'use strict';
  if(window.__GNK_PUBLIC_HOME_V3__)return;
  window.__GNK_PUBLIC_HOME_V3__=true;

  const menuButton=document.querySelector('[data-ph-menu-button]');
  const menu=document.querySelector('[data-ph-menu]');
  if(menuButton&&menu){
    menuButton.addEventListener('click',()=>{
      const open=menu.classList.toggle('is-open');
      menuButton.setAttribute('aria-expanded',String(open));
    });
    menu.addEventListener('click',event=>{
      if(event.target.closest('a')&&innerWidth<=1180){
        menu.classList.remove('is-open');
        menuButton.setAttribute('aria-expanded','false');
      }
    });
  }

  const countdownTarget=Date.parse('2026-10-07T11:30:00-04:00');
  const countdownNodes={
    days:document.querySelector('[data-countdown-days]'),
    hours:document.querySelector('[data-countdown-hours]'),
    minutes:document.querySelector('[data-countdown-minutes]'),
    seconds:document.querySelector('[data-countdown-seconds]')
  };
  const renderCountdown=()=>{
    const diff=Math.max(0,countdownTarget-Date.now());
    const days=Math.floor(diff/86400000);
    const hours=Math.floor((diff%86400000)/3600000);
    const minutes=Math.floor((diff%3600000)/60000);
    const seconds=Math.floor((diff%60000)/1000);
    if(countdownNodes.days)countdownNodes.days.textContent=String(days).padStart(2,'0');
    if(countdownNodes.hours)countdownNodes.hours.textContent=String(hours).padStart(2,'0');
    if(countdownNodes.minutes)countdownNodes.minutes.textContent=String(minutes).padStart(2,'0');
    if(countdownNodes.seconds)countdownNodes.seconds.textContent=String(seconds).padStart(2,'0');
  };
  renderCountdown();
  setInterval(renderCountdown,1000);

  document.querySelectorAll('a[href^="#"]').forEach(anchor=>{
    anchor.addEventListener('click',event=>{
      const target=document.querySelector(anchor.getAttribute('href'));
      if(!target)return;
      event.preventDefault();
      target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    });
  });

  document.querySelectorAll('[data-public-auth-link]').forEach(node=>node.remove());
})();
