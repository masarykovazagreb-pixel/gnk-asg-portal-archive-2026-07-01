(()=>{
'use strict';
if(window.__GNK_CONTACT_FORM_V2__)return;window.__GNK_CONTACT_FORM_V2__=true;
const form=document.getElementById('contactForm'),status=document.getElementById('contactStatus');if(!form||!status)return;
const en=document.documentElement.lang?.toLowerCase().startsWith('en');
const text=en?{idle:'Not sent.',sending:'Sending…',stored:'Your message was recorded.',sent:'Your message was recorded and the confirmation was sent.',partial:'Your message was recorded. Email delivery is pending.',failed:'Submission failed: ',required:'Please complete all required fields and accept the privacy notice.'}:{idle:'Nije poslano.',sending:'Slanje…',stored:'Upit je evidentiran.',sent:'Upit je evidentiran i potvrda je poslana.',partial:'Upit je evidentiran. Dostava e-pošte je u obradi.',failed:'Slanje nije uspjelo: ',required:'Ispunite sva obvezna polja i prihvatite obavijest o privatnosti.'};
function set(message,state=''){status.textContent=message;status.className=`contact-status ${state}`.trim();status.setAttribute('role',state==='error'?'alert':'status')}
set(text.idle);
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!form.reportValidity()){set(text.required,'error');return}
 const submit=form.querySelector('[type=submit]');submit.disabled=true;set(text.sending,'pending');
 const data=Object.fromEntries(new FormData(form).entries());data.consent=Boolean(form.elements.consent?.checked);data.language=en?'en':'hr';
 try{
  const response=await fetch('/api/contact-submit',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},credentials:'same-origin',body:JSON.stringify(data)});
  const raw=await response.text();let out={};try{out=JSON.parse(raw)}catch{out={message:raw}}
  if(!response.ok&&!out.accepted)throw new Error(out.message||out.error||`HTTP ${response.status}`);
  const ref=out.caseId||out.reference||out.id||'';const suffix=ref?` ${en?'Reference':'Referenca'}: ${ref}`:'';
  if(out.deliveryOk)set(text.sent+suffix,'success');else if(out.stored||out.accepted)set((out.mailAttempted?text.partial:text.stored)+suffix,'success');else set((out.message||text.stored)+suffix,'success');
  if(out.accepted||out.ok){form.reset();form.dataset.lastCaseId=ref}
 }catch(error){set(text.failed+String(error?.message||error),'error')}
 finally{submit.disabled=false}
});
})();