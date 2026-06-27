(()=>{
  'use strict';
  const en=document.documentElement.lang==='en';
  const iframe=document.getElementById('codePreview');
  const button=document.querySelector('.code-launch-button');
  if(!iframe||!button)return;

  let pending=false;
  let playing=false;
  let retries=0;
  let retryTimer=0;

  const setButton=(state)=>{
    if(state==='playing'){
      playing=true;
      pending=false;
      clearTimeout(retryTimer);
      button.disabled=true;
      button.classList.remove('is-complete');
      button.textContent=en?'Presentation running':'Prezentacija traje';
      return;
    }
    playing=false;
    button.disabled=false;
    button.classList.toggle('is-complete',state==='complete');
    button.textContent=state==='complete'
      ?(en?'Replay presentation':'Ponovno pokreni')
      :(en?'Start presentation':'Pokreni prezentaciju');
  };

  const sendStart=()=>{
    if(!pending||playing)return;
    iframe.contentWindow?.postMessage({type:'gnk-code-start',source:'index-player-bridge-v6'},'*');
    retries+=1;
    if(retries<20)retryTimer=window.setTimeout(sendStart,250);
    else{
      pending=false;
      button.disabled=false;
      button.textContent=en?'Try again':'Pokušaj ponovno';
    }
  };

  const requestStart=(event)=>{
    event?.preventDefault();
    event?.stopImmediatePropagation();
    playing=false;
    pending=true;
    retries=0;
    button.disabled=true;
    button.classList.remove('is-complete');
    button.textContent=en?'Starting presentation':'Pokretanje prezentacije';
    clearTimeout(retryTimer);
    sendStart();
  };

  button.addEventListener('click',requestStart,true);
  iframe.addEventListener('load',()=>{
    if(pending){retries=0;sendStart();}
  });
  window.addEventListener('message',event=>{
    if(event.source!==iframe.contentWindow)return;
    if(event.data?.type==='gnk-code-ready'){
      if(pending){retries=0;sendStart();}
      return;
    }
    if(event.data?.type==='gnk-code-playback')setButton(event.data.state);
  });
})();
