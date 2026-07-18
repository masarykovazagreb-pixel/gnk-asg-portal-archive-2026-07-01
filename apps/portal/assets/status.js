(()=>{
  'use strict';
  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(path!=='/'&&path!=='/en')return;

  function cleanIndexNotes(){
    document.querySelectorAll('.live-row').forEach(node=>node.remove());
    document.querySelectorAll('p,span,small').forEach(node=>{
      const original=node.textContent||'';
      const cleaned=original
        .replace(/\s*Zadnji osvježeni prikaz:\s*0?1\.\s*0?6\.\s*2026\.?/gi,'')
        .replace(/\s*Last refreshed view:\s*(?:0?1[.\/]0?6[.\/]2026|June\s+1,?\s+2026)\.?/gi,'')
        .replace(/\s{2,}/g,' ')
        .trim();
      if(cleaned!==original.trim())node.textContent=cleaned;
    });
  }

  function init(){
    cleanIndexNotes();
    new MutationObserver(cleanIndexNotes).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  }

  document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded',init,{once:true})
    : init();
})();
