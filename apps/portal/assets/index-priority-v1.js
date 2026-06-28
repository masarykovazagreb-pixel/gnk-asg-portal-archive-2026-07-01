(()=>{
  'use strict';
  if(window.__GNK_INDEX_PRIORITY_V4__)return;
  window.__GNK_INDEX_PRIORITY_V4__=true;
  const en=document.documentElement.lang==='en';

  const enforceMenu=()=>{
    const menu=document.querySelector('.index-nav .menu, nav.menu');
    if(!menu)return;
    menu.querySelectorAll('a').forEach(link=>{
      const href=(link.getAttribute('href')||'').trim().toLowerCase();
      const label=(link.textContent||'').trim().toLowerCase();
      if(href==='/trzista/'||href==='/trzista'||href==='/markets/'||href==='/markets'||label==='tržišta'||label==='trzista'||label==='markets'){
        link.remove();
        return;
      }
      if(label==='admin'){
        link.setAttribute('href','/mail-studio/');
        link.setAttribute('rel','nofollow');
      }
    });
    document.body.dataset.gnkIndexMenu='mail-studio-no-markets';
  };
  enforceMenu();
  const menuObserver=new MutationObserver(enforceMenu);
  menuObserver.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>menuObserver.disconnect(),15000);

  const stage=document.querySelector('.code-stage');
  if(!stage)return;
  document.body.dataset.gnkIndexPriority='v4';

  const loadStyle=(selector,href,dataKey)=>{
    if(document.querySelector(selector))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.dataset[dataKey]='';
    document.head.appendChild(link);
  };
  loadStyle('link[data-code-layout-fix-v1]','/assets/index-code-layout-fix-v1.css?v=20260628-v2','codeLayoutFixV1');
  loadStyle('link[data-index-city-white-v1]','/assets/index-city-white-v1.css?v=20260628-v3','indexCityWhiteV1');

  const inlineHost=stage.querySelector('.code-inline-host');
  if(inlineHost){
    stage.querySelector('.gnk-code-priority-controls')?.remove();
    const exposeNativeControls=()=>{
      const play=stage.querySelector('.ci-control--play');
      const controls=stage.querySelector('.ci-controls');
      if(controls){controls.style.display='flex';controls.style.visibility='visible';controls.style.opacity='1';}
      if(play){play.style.display='inline-flex';play.style.visibility='visible';play.style.opacity='1';return true;}
      return false;
    };
    if(!exposeNativeControls()){
      const observer=new MutationObserver(()=>{if(exposeNativeControls())observer.disconnect();});
      observer.observe(inlineHost,{childList:true,subtree:true});
      setTimeout(()=>observer.disconnect(),10000);
    }
    return;
  }

  const frame=stage.querySelector('iframe');
  const AUTO_CYCLE_MS=50000;
  let cycleTimer=null,readyState=false;
  const controls=document.createElement('div');
  controls.className='gnk-code-priority-controls';
  controls.innerHTML=`<button type="button" data-code-action="play" disabled>▶ ${en?'Play full cycle':'Pokreni cijeli ciklus'}</button><button type="button" data-code-action="live">◉ ${en?'Countdown':'Odbrojavanje'}</button><button type="button" data-code-action="fullscreen">⛶ ${en?'Full screen':'Cijeli zaslon'}</button><div class="gnk-code-priority-status" aria-live="polite">${en?'Preparing THE CODE…':'Priprema THE CODE prezentacije…'}</div>`;
  const toolbar=stage.querySelector('.code-toolbar');
  (toolbar||stage).insertAdjacentElement('afterend',controls);
  const play=controls.querySelector('[data-code-action="play"]'),status=controls.querySelector('.gnk-code-priority-status');
  const setStatus=text=>{status.textContent=text;};
  const post=type=>{try{frame?.contentWindow?.postMessage({type},location.origin);return true;}catch{return false;}};
  const schedule=()=>{clearTimeout(cycleTimer);cycleTimer=setTimeout(()=>start(true),AUTO_CYCLE_MS);};
  function start(automatic=false){
    if(!readyState||!post('gnk-code-start'))return;
    play.disabled=false;play.textContent=`❚❚ ${en?'Full cycle running':'Cijeli ciklus traje'}`;
    setStatus(automatic?(en?'Automatic full cycle running · countdown remains active in the final scene':'Automatski cijeli ciklus traje · odbrojavanje ostaje aktivno u završnoj sceni'):(en?'Full THE CODE cycle started':'Pokrenut je cijeli THE CODE ciklus'));
    schedule();
  }
  function ready(){if(readyState)return;readyState=true;play.disabled=false;setStatus(en?'Automatic full cycle ready':'Automatski cijeli ciklus je spreman');setTimeout(()=>start(true),350);}
  controls.addEventListener('click',event=>{
    const button=event.target.closest('button[data-code-action]');if(!button)return;
    if(button.dataset.codeAction==='play')start(false);
    if(button.dataset.codeAction==='live'){
      clearTimeout(cycleTimer);
      try{if(typeof frame?.contentWindow?.showLiveState==='function')frame.contentWindow.showLiveState();else post('gnk-code-ping');}catch{post('gnk-code-ping');}
      play.disabled=false;play.textContent=`▶ ${en?'Play full cycle':'Pokreni cijeli ciklus'}`;
      setStatus(en?'Live New York countdown displayed · automatic cycle resumes shortly':'Prikazano je odbrojavanje za New York · automatski ciklus uskoro se nastavlja');
      cycleTimer=setTimeout(()=>start(true),12000);
    }
    if(button.dataset.codeAction==='fullscreen'){
      const target=stage.querySelector('.code-frame,.code-inline-host')||frame||stage;
      if(target.requestFullscreen)target.requestFullscreen().catch(()=>{});
    }
  });
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin)return;
    if(event.data?.type==='gnk-code-ready')ready();
    if(event.data?.type==='gnk-code-playback'&&event.data?.state==='complete'){
      play.disabled=false;play.textContent=`↺ ${en?'Replay full cycle':'Ponovi cijeli ciklus'}`;
      setStatus(en?'Final countdown scene active · cycle will restart automatically':'Aktivna je završna scena s odbrojavanjem · ciklus će se automatski ponoviti');
    }
  });
  frame?.addEventListener('load',()=>{setTimeout(()=>post('gnk-code-ping'),150);setTimeout(ready,1200);},{once:true});
  setTimeout(()=>post('gnk-code-ping'),350);setTimeout(ready,1600);
  window.addEventListener('beforeunload',()=>clearTimeout(cycleTimer),{once:true});
})();
