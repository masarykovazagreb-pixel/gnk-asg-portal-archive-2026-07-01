(()=>{
  'use strict';
  if(window.__GNK_ASG_MAIL_STUDIO_STABILITY_V23__)return;
  window.__GNK_ASG_MAIL_STUDIO_STABILITY_V23__=true;

  const VERSION='GNK_ASG_MAIL_STUDIO_STABILITY_V23_20260629';
  const FIELD_SELECTOR='.compose input,.compose textarea,.compose select,.compose button,.side button.tab';
  const $=id=>document.getElementById(id);

  function unlock(){
    document.querySelectorAll(FIELD_SELECTOR).forEach(node=>{
      if(node.id==='mailDeliverySend')return;
      node.disabled=false;
      node.readOnly=false;
      node.removeAttribute('disabled');
      node.removeAttribute('readonly');
      node.removeAttribute('aria-disabled');
      node.removeAttribute('inert');
      node.style.pointerEvents='auto';
      node.style.userSelect='auto';
      node.style.webkitUserSelect='auto';
      node.style.position=node.style.position||'relative';
      node.style.zIndex=node.style.zIndex||'2';
      if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(node.tagName))node.tabIndex=0;
    });
    const compose=document.querySelector('.compose');
    if(compose){
      compose.removeAttribute('inert');
      compose.style.pointerEvents='auto';
      compose.style.position='relative';
      compose.style.zIndex='1';
    }
    const status=$('status');
    if(status&&!/slanje|greška|poslana|poslano/i.test(status.textContent||''))status.textContent='Mail Studio je otključan i spreman za unos.';
    document.documentElement.dataset.gnkMailStability=VERSION;
  }

  function focusField(event){
    const field=event.target?.closest?.('input,textarea,select');
    if(!field||!field.closest('.compose'))return;
    field.disabled=false;
    field.readOnly=false;
    field.removeAttribute('disabled');
    field.removeAttribute('readonly');
  }

  function boot(){
    unlock();
    [100,300,700,1500,3000].forEach(ms=>setTimeout(unlock,ms));
    document.addEventListener('pointerdown',focusField,true);
    document.addEventListener('focusin',focusField,true);
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
