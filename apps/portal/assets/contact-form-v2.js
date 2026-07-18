(()=>{
'use strict';
if(window.__GNK_CONTACT_FORM_V2__)return;window.__GNK_CONTACT_FORM_V2__=true;
const form=document.getElementById('contactForm'),status=document.getElementById('contactStatus');if(!form||!status)return;
const en=document.documentElement.lang?.toLowerCase().startsWith('en');
const text=en?{idle:'Not sent.',sending:'Sending…',stored:'Your message was recorded.',sent:'Your message was recorded and the confirmation was sent.',partial:'Your message was recorded. Email delivery is pending.',filtered:'Your submission was received.',failed:'Submission failed: ',required:'Please complete all required fields and accept the privacy notice.',timeout:'The contact service did not confirm completion in time. Your message may already have been recorded; please do not submit it again immediately.',offline:'The contact service is currently unreachable. Please check your connection and try again.',rate:'Too many attempts. Please wait before trying again.'}:{idle:'Nije poslano.',sending:'Slanje…',stored:'Upit je evidentiran.',sent:'Upit je evidentiran i potvrda je poslana.',partial:'Upit je evidentiran. Dostava e-pošte je u obradi.',filtered:'Vaš je zahtjev zaprimljen.',failed:'Slanje nije uspjelo: ',required:'Ispunite sva obvezna polja i prihvatite obavijest o privatnosti.',timeout:'Kontakt usluga nije na vrijeme potvrdila završetak. Upit je možda već evidentiran; nemojte ga odmah ponovno slati.',offline:'Kontakt usluga trenutačno nije dostupna. Provjerite vezu i pokušajte ponovno.',rate:'Previše pokušaja. Pričekajte prije ponovnog slanja.'};
function set(message,state=''){status.textContent=message;status.className=`contact-status ${state}`.trim();status.setAttribute('role',state==='error'?'alert':'status')}
function failureMessage(error,out,statusCode){if(error?.name==='AbortError')return text.timeout;if(statusCode===429)return text.rate;if(!navigator.onLine||error instanceof TypeError)return text.offline;return text.failed+String(out?.message||out?.error||error?.message||error)}
function idempotencyKey(){if(form.dataset.idempotencyKey)return form.dataset.idempotencyKey;const key=crypto.randomUUID();form.dataset.idempotencyKey=key;return key}
set(text.idle);
form.addEventListener('submit',async event=>{
 event.preventDefault();if(!form.reportValidity()){set(text.required,'error');return}
 const submit=form.querySelector('[type=submit]');submit.disabled=true;form.setAttribute('aria-busy','true');set(text.sending,'pending');
 const requestKey=idempotencyKey(),data=Object.fromEntries(new FormData(form).entries());data.consent=Boolean(form.elements.consent?.checked);data.language=en?'en':'hr';data.idempotencyKey=requestKey;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);let out={},response;
 try{
  response=await fetch('/api/contact-submit',{method:'POST',headers:{'content-type':'application/json','accept':'application/json','x-idempotency-key':requestKey},credentials:'same-origin',cache:'no-store',signal:controller.signal,body:JSON.stringify(data)});
  const raw=await response.text();try{out=JSON.parse(raw)}catch{out={message:raw}}
  if(!response.ok)throw new Error(out.message||out.error||`HTTP ${response.status}`);
  const ref=out.caseId||out.reference||out.id||'';const suffix=ref?` ${en?'Reference':'Referenca'}: ${ref}`:'';
  if(out.spamFiltered){set(text.filtered,'success');form.reset();delete form.dataset.idempotencyKey;return}
  if(!out.stored)throw new Error(out.message||out.error||'Contact record was not created.');
  if(out.deliveryOk)set(text.sent+suffix,'success');else set((out.mailAttempted?text.partial:text.stored)+suffix,'success');
  if(out.accepted&&out.stored){form.reset();form.dataset.lastCaseId=ref;delete form.dataset.idempotencyKey}
 }catch(error){set(failureMessage(error,out,response?.status),'error')}
 finally{clearTimeout(timer);submit.disabled=false;form.removeAttribute('aria-busy')}
});
})();