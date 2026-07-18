(()=>{
  'use strict';
  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(path!=='/'&&path!=='/en')return;

  function removeIndexStatusNotes(){
    document.querySelectorAll('.live-row').forEach(node=>node.remove());
  }

  function init(){
    removeIndexStatusNotes();
    new MutationObserver(removeIndexStatusNotes).observe(document.documentElement,{childList:true,subtree:true});
    return;
  }

  document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded',init,{once:true})
    : init();
})();
