(()=>{
 const C=window.GNKCampaignMailer,base='/campaign/';
 const deliveryMessage=(key,result)=>{
  const d=result?.delivery||result||{};
  if(d.paused&&d.reason==='daily_quota_exceeded')return{type:'error',text:`Kampanja je automatski pauzirana: ${d.error||'Cloudflare dnevna kvota je potrošena.'} Preostalo: ${Number(d.remaining||0)}.`};
  if(d.paused&&d.rateLimited)return{type:'error',text:'Kampanja je automatski pauzirana zbog internog sigurnosnog limita. Nije zakazano novo slanje.'};
  if(d.skipped==='runner_locked')return{type:'info',text:'Aktivni red već obrađuje slanje; nije pokrenut dvostruki proces.'};
  if(d.skipped==='not_due')return{type:'info',text:`Sljedeći pokušaj je zakazan za ${d.nextSendAt||'kasnije'}.`};
  if(d.completed)return{type:'info',text:'Kampanja je dovršena; nema više kontakata na čekanju.'};
  if(d.ok===false)return{type:'error',text:d.error||'Slanje nije uspjelo.'};
  if(key==='start')return{type:'info',text:`Kampanja je pokrenuta. Preostalo u redu: ${Number(d.remaining||0)}.`};
  if(key==='resume')return{type:'info',text:`Kampanja je nastavljena. Preostalo u redu: ${Number(d.remaining||0)}.`};
  if(key==='pause')return{type:'info',text:'Kampanja je pauzirana i nema zakazanog sljedećeg slanja.'};
  if(key==='stop')return{type:'info',text:'Kampanja i sve nove isporuke su zaustavljene.'};
  if(key==='reset')return{type:'info',text:'Kampanja je resetirana i kontakti su vraćeni na početni status.'};
  return{type:'info',text:'Status je ažuriran.'};
 };
 C.control=async key=>{
  try{
   const result=await C.request(base+key,{method:'POST',body:'{}'});
   await C.loadCore(true);
   const notice=deliveryMessage(key,result);
   C.notice(notice.text,notice.type==='error'?'error':undefined);
  }catch(error){C.notice(error.message,'error')}
 };
})();