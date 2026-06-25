(()=>{
'use strict';
async function load(){
  const params=new URLSearchParams(location.search);
  const id=params.get('application');
  const access=params.get('access');
  if(!id||!access)return;
  const section=document.getElementById('statusLookup');
  const result=document.getElementById('statusResult');
  section.hidden=false;
  const link='/api/media-trip/public/applications/'+encodeURIComponent(id)+'?access='+encodeURIComponent(access);
  result.className='trip-status ok';
  result.innerHTML='<b>Evidencijski broj:</b> '+String(id).replace(/[<>]/g,'')+'<br><a class="trip-button" href="'+link+'" target="_blank" rel="noopener">Otvori privatni status prijave</a>';
}
window.GNKMediaTripStatus={load};
})();
