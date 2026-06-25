(()=>{
function load(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('Ne mogu učitati '+src));document.head.appendChild(script);});}
window.GNKTripModulesReady=Promise.all([
  load('/assets/media-trip-section-editorial.js?v=20260626-1'),
  load('/assets/media-trip-section-travel.js?v=20260626-1')
]);
})();
