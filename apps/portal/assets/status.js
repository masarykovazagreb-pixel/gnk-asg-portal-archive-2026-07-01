(()=>{
  'use strict';
  const path=location.pathname.replace(/\/+$/,'')||'/';
  if(path!=='/'&&path!=='/en')return;

  function staleCroatianTimestamp(text){
    const match=String(text||'').match(/\b(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\.?(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(!match)return false;
    const timestamp=Date.UTC(Number(match[3]),Number(match[2])-1,Number(match[1]),Number(match[4]||0),Number(match[5]||0),Number(match[6]||0));
    return Number.isFinite(timestamp)&&(Date.now()-timestamp)>86400000;
  }

  function removeStaleCrossAssetMonitor(){
    document.querySelectorAll('.macro-dashboard').forEach(panel=>{
      const updated=panel.querySelector('#macroUpdated,.macro-period');
      if(updated&&staleCroatianTimestamp(updated.textContent))panel.remove();
    });
  }

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
    removeStaleCrossAssetMonitor();
  }

  function init(){
    cleanIndexNotes();
    new MutationObserver(cleanIndexNotes).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  }

  document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded',init,{once:true})
    : init();
})();
