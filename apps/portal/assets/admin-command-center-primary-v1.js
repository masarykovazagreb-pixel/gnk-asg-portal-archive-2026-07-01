// GNK ASG Admin minimum priority · Mail Studio first · 2026-06-28
(() => {
  'use strict';

  function loadPriorityLayer(){
    if(document.querySelector('script[data-gnk-admin-priority="v1"]'))return;
    const script=document.createElement('script');
    script.src='/assets/admin-minimum-priority-v1.js?v=20260628-v1';
    script.defer=true;
    script.dataset.gnkAdminPriority='v1';
    document.head.appendChild(script);
  }

  function bind(){
    loadPriorityLayer();
    const button=document.getElementById('heroMail');
    if(!button||button.dataset.mailStudioPrimary==='1')return;
    button.dataset.mailStudioPrimary='1';
    button.textContent='Otvori Mail Studio';
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      const target=document.querySelector('#priorityGrid [data-open="mail"],#moduleNav [data-module="mail"]');
      if(target)target.click();
      else location.assign('/admin-center/?module=mail');
    },true);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();