(() => {
  'use strict';
  if (window.__GNK_ASG_GALLERY_BOOTSTRAP__) return;
  window.__GNK_ASG_GALLERY_BOOTSTRAP__ = true;
  const route = location.pathname.replace(/\/+$/, '') || '/';

  const loadEncodedImage = async (image,placeholder,source,mime) => {
    try {
      const response=await fetch(source,{cache:'force-cache'});
      if(!response.ok)throw new Error(`HTTP_${response.status}`);
      const encoded=(await response.text()).replace(/\s+/g,'');
      if(!encoded || !/^[A-Za-z0-9+/=]+$/.test(encoded))throw new Error('INVALID_BASE64');
      const binary=atob(encoded);
      const bytes=new Uint8Array(binary.length);
      for(let index=0;index<binary.length;index+=1)bytes[index]=binary.charCodeAt(index);
      const objectUrl=URL.createObjectURL(new Blob([bytes],{type:mime}));
      image.addEventListener('load',()=>{
        placeholder?.remove();
        URL.revokeObjectURL(objectUrl);
      },{once:true});
      image.addEventListener('error',()=>URL.revokeObjectURL(objectUrl),{once:true});
      image.src=objectUrl;
    } catch (_) {
      if(placeholder)placeholder.textContent=document.documentElement.lang==='en'?'Visual currently unavailable':'Vizual trenutačno nije dostupan';
    }
  };

  const initActivation = root => {
    if(!root || root.dataset.runtimeReady==='1')return;
    root.dataset.runtimeReady='1';
    root.querySelectorAll('img[data-encoded-source]').forEach(image=>{
      const slide=image.closest('.gnk-activation__slide');
      loadEncodedImage(image,slide?.querySelector('.gnk-activation__placeholder'),image.dataset.encodedSource,'image/webp');
    });

    const target=new Date('2026-10-07T11:30:00-04:00').getTime();
    const english=document.documentElement.lang==='en';
    const field=name=>root.querySelector(`[data-countdown="${name}"]`);
    const daysField=field('days');
    const hoursField=field('hours');
    const minutesField=field('minutes');
    const secondsField=field('seconds');
    const nyClock=root.querySelector('[data-ny-clock]');
    const nyDate=root.querySelector('[data-ny-date]');
    const status=root.querySelector('[data-activation-status]');
    const pad=value=>String(Math.max(0,Math.floor(value))).padStart(2,'0');

    const update=()=>{
      const remaining=Math.max(0,target-Date.now());
      const days=Math.floor(remaining/86400000);
      const hours=Math.floor((remaining%86400000)/3600000);
      const minutes=Math.floor((remaining%3600000)/60000);
      const seconds=Math.floor((remaining%60000)/1000);
      if(daysField)daysField.textContent=String(days).padStart(2,'0');
      if(hoursField)hoursField.textContent=pad(hours);
      if(minutesField)minutesField.textContent=pad(minutes);
      if(secondsField)secondsField.textContent=pad(seconds);
      try{
        const now=new Date();
        if(nyClock)nyClock.textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);
        if(nyDate)nyDate.textContent=new Intl.DateTimeFormat(english?'en-US':'hr-HR',{timeZone:'America/New_York',weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(now);
      }catch(_){ }
      if(remaining===0&&status)status.textContent=english?'THE CODE IS ACTIVE · NEW YORK':'THE CODE JE AKTIVIRAN · NEW YORK';
    };

    update();
    const timer=setInterval(update,1000);
    window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  };

  if(route==='/' || route==='/en'){
    const start=()=>initActivation(document.querySelector('[data-gnk-activation]'));
    document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
    return;
  }

  const run = async () => {
    if (!window.GNK_ASG_GALLERY) {
      await new Promise((resolve,reject) => {
        const script=document.createElement('script');
        script.src='/assets/gallery-engine.js?v=20260626-v2';
        script.onload=resolve;
        script.onerror=reject;
        document.head.appendChild(script);
      }).catch(() => {});
    }
    if (window.GNK_ASG_GALLERY && !/\/visual-index\/?$/.test(location.pathname)) {
      window.GNK_ASG_GALLERY.apply(document).catch(() => {});
    }
  };
  document.readyState==='loading' ? document.addEventListener('DOMContentLoaded',run,{once:true}) : run();
})();