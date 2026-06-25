(()=>{
function load(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('Ne mogu učitati '+src));document.head.appendChild(script);});}
window.GNKTripModulesReady=Promise.all([
  window.GNKTripModulesReady,
  load('/assets/media-trip-section-accreditation.js?v=20260626-1'),
  load('/assets/media-trip-section-billing.js?v=20260626-1'),
  load('/assets/media-trip-section-documents.js?v=20260626-1')
]);
})();
