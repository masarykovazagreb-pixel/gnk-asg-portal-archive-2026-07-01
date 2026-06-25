(()=>{
'use strict';
async function start(){
  await window.GNKMediaTripCoreReady;
  const target=document.getElementById('formSections');
  target.innerHTML=window.GNKTripEditorial.render()+window.GNKTripTravel.render()+window.GNKTripAccreditation.render()+window.GNKTripBilling.render()+window.GNKTripDocuments.render();
  window.GNKMediaTripDelegates.bind();
  window.GNKMediaTripDocuments.bind();
  window.GNKMediaTripSubmission.bind();
  await window.GNKMediaTripStatus.load();
}
window.GNKMediaTripPublic={start};
})();
