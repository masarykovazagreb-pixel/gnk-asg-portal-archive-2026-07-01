(()=>{
'use strict';
function load(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('Ne mogu učitati '+src));document.head.appendChild(script);});}
async function start(){
  await window.GNKMediaTripCoreReady;
  await Promise.all([
    load('/assets/media-trip-submission.js?v=20260626-1'),
    load('/assets/media-trip-public-status.js?v=20260626-1')
  ]);
  const target=document.getElementById('formSections');
  target.innerHTML=window.GNKTripEditorial.render()+window.GNKTripTravel.render()+window.GNKTripAccreditation.render()+window.GNKTripBilling.render()+window.GNKTripDocuments.render();
  window.GNKMediaTripDelegates.bind();
  window.GNKMediaTripDocuments.bind();
  window.GNKMediaTripSubmission.bind();
  await window.GNKMediaTripStatus.load();
}
window.GNKMediaTripPublic={start};
})();
