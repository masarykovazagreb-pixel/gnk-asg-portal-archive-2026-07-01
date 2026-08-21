(()=>{
  'use strict';
  if(window.__GNK_THE_CODE_NY_COUNTDOWN_V1__)return;
  window.__GNK_THE_CODE_NY_COUNTDOWN_V1__=true;

  const TARGET=Date.parse('2026-10-07T11:30:00-04:00');
  const PROGRAM_START=Date.parse('2026-10-06T00:00:00-04:00');
  const PROGRAM_END=Date.parse('2026-10-08T23:59:59-04:00');
  const locale=(document.documentElement.lang||'hr').toLowerCase().startsWith('en')?'en':'hr';
  const text=locale==='en'?{
    eyebrow:'THE CODE · NEW YORK 2026',
    title:'Countdown to the international press conference in New York.',
    lead:'Central presentation and activation of THE CODE on 7 October 2026 at 11:30 ET. The international executive media programme runs from 6 to 8 October 2026.',
    meta:['New York','7 October 2026 · 11:30 ET','Programme · 6–8 October 2026'],
    action:'Open THE CODE',
    labels:['Days','Hours','Minutes','Seconds'],
    status:'Time remaining until the central presentation',
    live:'THE CODE IS UNLOCKED · NEW YORK 2026'
  }:{
    eyebrow:'THE CODE · NEW YORK 2026',
    title:'Odbrojavanje do međunarodne press konferencije u New Yorku.',
    lead:'Središnja prezentacija i aktivacija projekta THE CODE održava se 7. listopada 2026. u 11:30 ET. Međunarodni izvršni medijski program traje od 6. do 8. listopada 2026.',
    meta:['New York','7. listopada 2026. · 11:30 ET','Program · 6.–8. listopada 2026.'],
    action:'Otvori THE CODE',
    labels:['Dana','Sati','Minuta','Sekundi'],
    status:'Vrijeme do središnje prezentacije',
    live:'THE CODE IS UNLOCKED · NEW YORK 2026'
  };

  const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const pad=value=>String(Math.max(0,value)).padStart(2,'0');

  function build(){
    if(document.getElementById('gnk-ny-countdown'))return null;
    const hero=document.querySelector('main .hero,.shell .hero,.hero');
    if(!hero)return null;
    const section=document.createElement('section');
    section.id='gnk-ny-countdown';
    section.className='gnk-ny-countdown';
    section.setAttribute('aria-labelledby','gnk-ny-countdown-title');
    section.dataset.target='2026-10-07T11:30:00-04:00';
    section.innerHTML=`<div class="gnk-ny-countdown__inner"><div class="gnk-ny-countdown__copy"><p class="gnk-ny-countdown__eyebrow">${esc(text.eyebrow)}</p><h2 id="gnk-ny-countdown-title">${esc(text.title)}</h2><p class="gnk-ny-countdown__lead">${esc(text.lead)}</p><div class="gnk-ny-countdown__meta">${text.meta.map(item=>`<span>${esc(item)}</span>`).join('')}</div><a class="gnk-ny-countdown__action" href="/the-code/">${esc(text.action)} <span aria-hidden="true">→</span></a></div><div class="gnk-ny-countdown__clock" role="timer" aria-label="${esc(text.status)}"><div class="gnk-ny-countdown__unit"><span class="gnk-ny-countdown__value" data-unit="days">00</span><span class="gnk-ny-countdown__label">${esc(text.labels[0])}</span></div><div class="gnk-ny-countdown__unit"><span class="gnk-ny-countdown__value" data-unit="hours">00</span><span class="gnk-ny-countdown__label">${esc(text.labels[1])}</span></div><div class="gnk-ny-countdown__unit"><span class="gnk-ny-countdown__value" data-unit="minutes">00</span><span class="gnk-ny-countdown__label">${esc(text.labels[2])}</span></div><div class="gnk-ny-countdown__unit"><span class="gnk-ny-countdown__value" data-unit="seconds">00</span><span class="gnk-ny-countdown__label">${esc(text.labels[3])}</span></div><p class="gnk-ny-countdown__status">${esc(text.status)}</p></div></div>`;
    hero.insertAdjacentElement('afterend',section);
    return section;
  }

  function run(section){
    const values={
      days:section.querySelector('[data-unit="days"]'),
      hours:section.querySelector('[data-unit="hours"]'),
      minutes:section.querySelector('[data-unit="minutes"]'),
      seconds:section.querySelector('[data-unit="seconds"]')
    };
    const status=section.querySelector('.gnk-ny-countdown__status');
    let interval=0;
    const update=()=>{
      const now=Date.now();
      const remaining=Math.max(0,TARGET-now);
      if(remaining<=0){
        section.dataset.complete='true';
        status.textContent=text.live;
        if(interval)clearInterval(interval);
        return;
      }
      const totalSeconds=Math.floor(remaining/1000);
      values.days.textContent=String(Math.floor(totalSeconds/86400));
      values.hours.textContent=pad(Math.floor((totalSeconds%86400)/3600));
      values.minutes.textContent=pad(Math.floor((totalSeconds%3600)/60));
      values.seconds.textContent=pad(totalSeconds%60);
      section.dataset.programWindow=now>=PROGRAM_START&&now<=PROGRAM_END?'active':'upcoming';
    };
    update();
    interval=window.setInterval(update,1000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
  }

  function install(){
    const section=build();
    if(section)run(section);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
