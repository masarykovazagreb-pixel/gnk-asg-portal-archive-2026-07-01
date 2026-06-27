(()=>{
  'use strict';
  const iframe=document.getElementById('codePreview');
  const button=document.querySelector('.code-launch-button');
  if(!iframe||!button)return;
  const en=document.documentElement.lang==='en';
  let ready=false;
  const ping=()=>iframe.contentWindow?.postMessage({type:'gnk-code-ping'},'*');
  const label=state=>state==='complete'?(en?'Replay presentation':'Ponovno pokreni'):(en?'Start presentation':'Pokreni prezentaciju');
  const setReady=state=>{
    ready=true;
    button.disabled=false;
    button.dataset.state=state||'ready';
    button.classList.toggle('is-complete',state==='complete');
    button.textContent=label(state);
  };
  button.disabled=true;
  button.textContent=en?'Loading presentation':'Učitavanje prezentacije';
  iframe.addEventListener('load',()=>{
    setTimeout(ping,40);
    setTimeout(ping,220);
    setTimeout(ping,600);
  });
  addEventListener('message',event=>{
    if(event.source!==iframe.contentWindow)return;
    if(event.data?.type==='gnk-code-ready')setReady('ready');
    if(event.data?.type==='gnk-code-playback'){
      if(event.data.state==='playing'){
        ready=true;
        button.disabled=true;
        button.dataset.state='playing';
        button.classList.remove('is-complete');
        button.textContent=en?'Presentation running':'Prezentacija traje';
      }else setReady(event.data.state);
    }
  });
  button.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if(!ready){ping();return;}
    button.disabled=true;
    button.dataset.state='playing';
    button.classList.remove('is-complete');
    button.textContent=en?'Presentation running':'Prezentacija traje';
    iframe.contentWindow?.postMessage({type:'gnk-code-start'},'*');
  },true);
  setTimeout(ping,300);
  setTimeout(ping,900);
})();
