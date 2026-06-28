// GNK ASG Command Center primary action · validated release 2026-06-28 · diagnostic run 2
(() => {
  'use strict';
  function bind(){
    const button=document.getElementById('heroMail');
    if(!button||button.dataset.commandCenterPrimary==='1')return;
    button.dataset.commandCenterPrimary='1';
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      const target=document.querySelector('#priorityGrid [data-open="media"],#moduleNav [data-module="media"]');
      if(target)target.click();
      else location.assign('/admin-center/?module=media');
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
