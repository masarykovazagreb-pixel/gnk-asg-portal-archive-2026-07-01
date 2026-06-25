(()=>{
function load(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('Ne mogu učitati '+src));document.head.appendChild(script);});}
(async()=>{
  try{
    await window.GNKTripModulesReady;
    await load('/assets/media-trip-public-core.js?v=20260626-1');
    await load('/assets/media-trip-public-payload.js?v=20260626-1');
    await load('/assets/media-trip-public-submit.js?v=20260626-1');
    await window.GNKMediaTripPublic.start();
  }catch(error){const box=document.getElementById('formSections');if(box)box.innerHTML='<section class="trip-card"><div class="trip-status bad">Obrazac se nije učitao: '+String(error.message||error)+'</div></section>';}
})();
})();
