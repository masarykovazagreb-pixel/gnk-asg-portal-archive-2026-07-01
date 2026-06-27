(()=>{
  'use strict';
  const embedded=document.documentElement.classList.contains('is-embedded');
  const notify=state=>window.parent?.postMessage({type:'gnk-code-ready',state},'*');
  if(embedded){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>notify('ready'),{once:true});
    else notify('ready');
    window.addEventListener('load',()=>notify('ready'),{once:true});
    window.addEventListener('message',event=>{
      if(event.data?.type==='gnk-code-ping')notify('ready');
    });
  }
})();
