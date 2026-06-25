(() => {
  'use strict';
  if (window.__GNK_ASG_INDEX_CLOCK_V2__) return;
  window.__GNK_ASG_INDEX_CLOCK_V2__ = true;
  const lang = document.documentElement.lang === 'en' ? 'en' : 'hr';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  async function getConfig(){const response=await fetch(`/data/index-media-config.json?cb=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()}
  function install(clock){
    document.getElementById('gnk-index-live-clock')?.remove();
    if(!clock?.enabled)return;
    const anchor=document.querySelector('.trust-strip')||document.querySelector('.hero');
    if(!anchor)return;
    const timeZone='Europe/Zagreb',hour12=clock.format==='12h';
    const label=lang==='en'?(clock.labelEn||'Time in Zagreb'):(clock.labelHr||'Vrijeme u Zagrebu');
    const block=document.createElement('section');
    block.id='gnk-index-live-clock';block.className='gnk-index-live-clock';block.setAttribute('aria-label',label);
    block.innerHTML=`<div class="gnk-live-clock-copy"><span>${esc(label)}</span><small>Europe/Zagreb</small></div><time class="gnk-live-clock-time" aria-live="off">--:--:--</time><time class="gnk-live-clock-date"></time>`;
    anchor.after(block);
    const timeNode=block.querySelector('.gnk-live-clock-time'),dateNode=block.querySelector('.gnk-live-clock-date');
    const timeFormat=new Intl.DateTimeFormat(lang==='en'?'en-GB':'hr-HR',{timeZone,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12});
    const dateFormat=new Intl.DateTimeFormat(lang==='en'?'en-GB':'hr-HR',{timeZone,weekday:'long',year:'numeric',month:'long',day:'numeric'});
    const render=()=>{const current=new Date();timeNode.textContent=timeFormat.format(current);timeNode.dateTime=current.toISOString();if(clock.showDate!==false){dateNode.hidden=false;dateNode.textContent=dateFormat.format(current);dateNode.dateTime=current.toISOString().slice(0,10)}else dateNode.hidden=true};
    render();const timer=setInterval(render,1000);addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  }
  getConfig().then(config=>install(config.clock||{})).catch(()=>{});
})();
