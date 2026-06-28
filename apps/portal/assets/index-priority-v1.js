(()=>{
  'use strict';
  if(window.__GNK_INDEX_PRIORITY_V1__)return;
  window.__GNK_INDEX_PRIORITY_V1__=true;
  const en=document.documentElement.lang==='en';
  const stage=document.querySelector('.code-stage');
  if(!stage)return;
  document.body.dataset.gnkIndexPriority='v1';

  const frame=stage.querySelector('iframe');
  const controls=document.createElement('div');
  controls.className='gnk-code-priority-controls';
  controls.innerHTML=`<button type="button" data-code-action="play" disabled>▶ ${en?'Play':'Pokreni'}</button><button type="button" data-code-action="live">◉ ${en?'Live state':'Prikaži završno stanje'}</button><button type="button" data-code-action="fullscreen">⛶ ${en?'Full screen':'Cijeli zaslon'}</button><div class="gnk-code-priority-status" aria-live="polite">${en?'Preparing THE CODE…':'Priprema THE CODE prezentacije…'}</div>`;
  const toolbar=stage.querySelector('.code-toolbar');
  (toolbar||stage).insertAdjacentElement('afterend',controls);

  const play=controls.querySelector('[data-code-action="play"]');
  const status=controls.querySelector('.gnk-code-priority-status');
  const setStatus=text=>{status.textContent=text;};
  const post=type=>{
    try{frame?.contentWindow?.postMessage({type},location.origin);return true;}catch{return false;}
  };
  const ready=()=>{play.disabled=false;setStatus(en?'Ready. Press Play.':'Spremno. Pritisnite Pokreni.');};

  controls.addEventListener('click',event=>{
    const button=event.target.closest('button[data-code-action]');
    if(!button)return;
    const action=button.dataset.codeAction;
    if(action==='play'){
      if(!post('gnk-code-start'))return;
      button.textContent=`❚❚ ${en?'Playing':'Pokrenuto'}`;
      setStatus(en?'THE CODE presentation is running.':'THE CODE prezentacija je pokrenuta.');
    }else if(action==='live'){
      frame?.contentWindow?.postMessage({type:'gnk-code-live'},location.origin);
      try{frame?.contentWindow?.postMessage({type:'gnk-code-ping'},location.origin);}catch{}
      setStatus(en?'Final live state displayed.':'Prikazano je završno stanje.');
    }else if(action==='fullscreen'){
      const target=stage.querySelector('.code-frame,.code-inline-host')||frame||stage;
      if(target.requestFullscreen)target.requestFullscreen().catch(()=>{});
    }
  });

  window.addEventListener('message',event=>{
    if(event.origin!==location.origin)return;
    if(event.data?.type==='gnk-code-ready')ready();
    if(event.data?.type==='gnk-code-playback'&&event.data?.state==='complete'){
      play.disabled=false;
      play.textContent=`↺ ${en?'Replay':'Ponovno'}`;
      setStatus(en?'Presentation complete.':'Prezentacija je završena.');
    }
  });
  frame?.addEventListener('load',()=>{setTimeout(()=>post('gnk-code-ping'),150);setTimeout(ready,1200);},{once:true});
  setTimeout(()=>post('gnk-code-ping'),350);
  setTimeout(ready,1600);
})();
