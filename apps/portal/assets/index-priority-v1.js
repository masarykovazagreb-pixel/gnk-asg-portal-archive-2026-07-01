(()=>{
  'use strict';
  if(window.__GNK_INDEX_PRIORITY_V3__)return;
  window.__GNK_INDEX_PRIORITY_V3__=true;

  const en=document.documentElement.lang==='en';
  const stage=document.querySelector('.code-stage');
  if(!stage)return;
  document.body.dataset.gnkIndexPriority='v3';

  const frame=stage.querySelector('iframe');
  const AUTO_CYCLE_MS=50000;
  let cycleTimer=null;
  let readyState=false;

  const controls=document.createElement('div');
  controls.className='gnk-code-priority-controls';
  controls.innerHTML=`<button type="button" data-code-action="play" disabled>▶ ${en?'Play full cycle':'Pokreni cijeli ciklus'}</button><button type="button" data-code-action="live">◉ ${en?'Countdown':'Odbrojavanje'}</button><button type="button" data-code-action="fullscreen">⛶ ${en?'Full screen':'Cijeli zaslon'}</button><div class="gnk-code-priority-status" aria-live="polite">${en?'Preparing THE CODE…':'Priprema THE CODE prezentacije…'}</div>`;
  const toolbar=stage.querySelector('.code-toolbar');
  (toolbar||stage).insertAdjacentElement('afterend',controls);

  const play=controls.querySelector('[data-code-action="play"]');
  const status=controls.querySelector('.gnk-code-priority-status');
  const setStatus=text=>{status.textContent=text;};
  const post=type=>{try{frame?.contentWindow?.postMessage({type},location.origin);return true;}catch{return false;}};

  function scheduleNextCycle(){
    clearTimeout(cycleTimer);
    cycleTimer=setTimeout(()=>startCycle(true),AUTO_CYCLE_MS);
  }
  function startCycle(automatic=false){
    if(!readyState||!post('gnk-code-start'))return;
    play.disabled=false;
    play.textContent=`❚❚ ${en?'Full cycle running':'Cijeli ciklus traje'}`;
    setStatus(automatic
      ? (en?'Automatic full cycle running · countdown remains active in the final scene':'Automatski cijeli ciklus traje · odbrojavanje ostaje aktivno u završnoj sceni')
      : (en?'Full THE CODE cycle started':'Pokrenut je cijeli THE CODE ciklus'));
    scheduleNextCycle();
  }
  function markReady(){
    if(readyState)return;
    readyState=true;
    play.disabled=false;
    setStatus(en?'Automatic full cycle ready':'Automatski cijeli ciklus je spreman');
    setTimeout(()=>startCycle(true),350);
  }

  controls.addEventListener('click',event=>{
    const button=event.target.closest('button[data-code-action]');
    if(!button)return;
    const action=button.dataset.codeAction;
    if(action==='play'){
      startCycle(false);
    }else if(action==='live'){
      clearTimeout(cycleTimer);
      try{
        if(typeof frame?.contentWindow?.showLiveState==='function')frame.contentWindow.showLiveState();
        else post('gnk-code-ping');
      }catch{post('gnk-code-ping');}
      play.disabled=false;
      play.textContent=`▶ ${en?'Play full cycle':'Pokreni cijeli ciklus'}`;
      setStatus(en?'Live New York countdown displayed · automatic cycle resumes shortly':'Prikazano je odbrojavanje za New York · automatski ciklus uskoro se nastavlja');
      cycleTimer=setTimeout(()=>startCycle(true),12000);
    }else if(action==='fullscreen'){
      const target=stage.querySelector('.code-frame,.code-inline-host')||frame||stage;
      if(target.requestFullscreen)target.requestFullscreen().catch(()=>{});
    }
  });

  window.addEventListener('message',event=>{
    if(event.origin!==location.origin)return;
    if(event.data?.type==='gnk-code-ready')markReady();
    if(event.data?.type==='gnk-code-playback'&&event.data?.state==='playing'){
      setStatus(en?'Full THE CODE cycle running':'Cijeli THE CODE ciklus traje');
    }
    if(event.data?.type==='gnk-code-playback'&&event.data?.state==='complete'){
      play.disabled=false;
      play.textContent=`↺ ${en?'Replay full cycle':'Ponovi cijeli ciklus'}`;
      setStatus(en?'Final countdown scene active · cycle will restart automatically':'Aktivna je završna scena s odbrojavanjem · ciklus će se automatski ponoviti');
    }
  });

  frame?.addEventListener('load',()=>{
    setTimeout(()=>post('gnk-code-ping'),150);
    setTimeout(markReady,1200);
  },{once:true});
  setTimeout(()=>post('gnk-code-ping'),350);
  setTimeout(markReady,1600);

  window.addEventListener('beforeunload',()=>clearTimeout(cycleTimer),{once:true});
})();
