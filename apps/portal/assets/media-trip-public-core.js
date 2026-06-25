(()=>{
function load(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Ne mogu učitati '+src));document.head.appendChild(s);});}
window.GNKMediaTripCoreReady=Promise.all([
  load('/assets/media-trip-public-delegates.js?v=20260626-1'),
  load('/assets/media-trip-public-documents.js?v=20260626-1')
]);
})();
