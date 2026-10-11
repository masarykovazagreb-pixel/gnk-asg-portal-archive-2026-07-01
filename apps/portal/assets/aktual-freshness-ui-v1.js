(()=>{
'use strict';
const node=document.getElementById('akFeedFreshness');
if(!node)return;
const en=(document.documentElement.lang||'').toLowerCase().startsWith('en');
const fmt=iso=>{try{return new Date(iso).toLocaleString(en?'en-GB':'hr-HR',{timeZone:'Europe/Zagreb'});}catch{return iso||'';}};
function currentState(resource){
  if(!resource||!resource.observedAt||!Number.isFinite(Number(resource.maxAgeMinutes)))return 'error';
  const age=(Date.now()-Date.parse(resource.observedAt))/60000;
  if(!Number.isFinite(age)||age < -5)return 'error';
  if(resource.state==='error')return 'error';
  return age<=Number(resource.maxAgeMinutes)?'fresh':'stale';
}
async function refresh(){
  try{
    const response=await fetch('/data/freshness-status.json?v='+Date.now(),{cache:'no-store',credentials:'same-origin'});
    if(!response.ok)throw new Error('freshness-http-'+response.status);
    const data=await response.json();
    const resource=data?.resources?.aktual;
    const state=currentState(resource);
    if(state==='fresh'){
      node.textContent=(en?'Last verified refresh: ':'Zadnje potvrđeno osvježavanje: ')+fmt(resource.observedAt);
      node.dataset.freshness='fresh';
    }else if(state==='stale'){
      node.textContent=en?'Archive view — news freshness is not verified.':'Prikaz arhive — svježina vijesti nije potvrđena.';
      node.dataset.freshness='stale';
    }else{
      node.textContent=en?'Archive view — refresh status is unavailable.':'Prikaz arhive — status osvježavanja nije dostupan.';
      node.dataset.freshness='error';
    }
  }catch{
    node.textContent=en?'Archive view — refresh status is unavailable.':'Prikaz arhive — status osvježavanja nije dostupan.';
    node.dataset.freshness='error';
  }
}
refresh();
setInterval(refresh,60000);
})();
