(()=>{
'use strict';
if(window.__GNK_MEDIA_DECISION_GUARD_V1__)return;
window.__GNK_MEDIA_DECISION_GUARD_V1__=true;
const DECISION='/api/media-registration-admin/decision';
const requiredReason=new Set(['NEEDS_INFORMATION','NEEDS_TRAVEL_DOCUMENTS','REJECTED']);
const originalFetch=window.fetch.bind(window);
const currentRevision=()=>{const text=document.getElementById('mediaReviewDrawerMeta')?.textContent||'';const match=text.match(/(?:^|·)\s*v(\d+)\s*$/i)||text.match(/\bv(\d+)\b/i);return match?Number(match[1]):0;};
window.fetch=(input,init={})=>{
 try{
  const url=new URL(typeof input==='string'?input:input.url,location.origin);
  const method=String(init.method||(typeof input!=='string'&&input.method)||'GET').toUpperCase();
  if(url.pathname===DECISION&&method==='POST'&&typeof init.body==='string'){
   const payload=JSON.parse(init.body);
   if(!payload.expectedRevision)payload.expectedRevision=currentRevision();
   init={...init,body:JSON.stringify(payload)};
  }
 }catch{}
 return originalFetch(input,init);
};
document.addEventListener('click',event=>{
 const button=event.target.closest?.('#mediaReviewSaveDecision');
 if(!button)return;
 const status=document.getElementById('mediaReviewDecision')?.value||'';
 const reason=(document.getElementById('mediaReviewReason')?.value||'').trim();
 if(requiredReason.has(status)&&reason.length<3){
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  alert('Za ovaj status obavezno je kratko obrazloženje.');
 }
},true);
})();
