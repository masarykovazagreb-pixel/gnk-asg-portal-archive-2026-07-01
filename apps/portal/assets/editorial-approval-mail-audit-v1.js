(()=>{
'use strict';
const URL='/data/mail-audit-20260713.json?v=20260714';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function yesNo(value){return value?'DA':'NE'}
async function render(){
  const host=document.getElementById('policyPanel');
  if(!host)return;
  try{
    const response=await fetch(URL,{cache:'no-store',headers:{accept:'application/json'}});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    const card=document.createElement('article');
    card.className='policy-card';
    card.dataset.mailAudit='controlled-live-20260713';
    card.innerHTML=`<h2>Kontrolirani live mail test</h2>
      <p><strong>Adresa:</strong> ${esc(data.recipient)}<br>
      <strong>Ulaz prihvaćen:</strong> ${yesNo(data.delivery.incomingAccepted)}<br>
      <strong>Automatski odgovor:</strong> ${yesNo(data.delivery.autoReplyReceived)} · ${esc(data.delivery.elapsedSeconds)} s<br>
      <strong>Evidencijski broj:</strong> ${yesNo(data.delivery.referenceGenerated)}<br>
      <strong>HR/EN sadržaj:</strong> ${esc(data.reply.language)}</p>
      <p><strong>AI personalizacija:</strong> nije opažena. Live odgovor koristi profil adrese, jezik i predmet, ali ne odgovara semantički na sadržaj poruke.</p>
      <p><strong>Logo:</strong> Gmail je prijavio ${esc(data.branding.gmailReportedInlineImages)} inline slika i ${esc(data.branding.gmailReportedAttachments)} privitaka. Ugrađeni logo ovim testom nije potvrđen; potrebno je dokazati ga nakon deploya najnovijeg MIME ugovora.</p>
      <p><strong>Zaključak:</strong> ${esc(data.releaseComparison.conclusion)}</p>`;
    host.prepend(card);
    document.documentElement.dataset.mailAudit='loaded';
  }catch(error){
    const card=document.createElement('article');
    card.className='policy-card';
    card.innerHTML=`<h2>Kontrolirani live mail test</h2><p>Izvještaj nije učitan: ${esc(error.message)}</p>`;
    host.prepend(card);
    document.documentElement.dataset.mailAudit='error';
  }
}
function boot(){
  let attempts=0;
  const wait=()=>{
    if(document.getElementById('policyPanel'))return render();
    if(++attempts<40)setTimeout(wait,100);
  };
  wait();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
