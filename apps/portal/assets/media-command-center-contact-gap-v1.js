(() => {
  'use strict';
  async function showContactStatus(){
    try{
      const response=await fetch('/api/media-command-center/status',{credentials:'same-origin',cache:'no-store'});
      if(!response.ok)return;
      const data=await response.json();
      const info=data.contactDatasetContract||{};
      const recorded=Number(info.seedRecordedEmailAddresses||0);
      const expected=Number(info.handoffExpectedEmailAddresses||recorded);
      const missing=Number(info.missingManualEmailAddresses||0);
      const cards=document.getElementById('systemCards');
      if(cards&&!document.getElementById('mccContactSeedCard')){
        const card=document.createElement('article');
        card.id='mccContactSeedCard';
        card.className='mcc-system-card';
        const strong=document.createElement('strong');
        strong.textContent=`${recorded} / ${expected}`;
        const label=document.createElement('span');
        label.textContent='Evidentirane e-mail adrese';
        card.append(strong,label);
        cards.prepend(card);
      }
      if(missing>0){
        const queue=document.getElementById('attentionQueue');
        if(queue){
          queue.hidden=false;
          const line=document.createElement('div');
          line.id='mccContactGapNotice';
          line.textContent=`Kontaktna baza: ${recorded} od ${expected} adresa; ${missing} ručnih adresa čeka kontrolirani uvoz. Slanje ostaje zaključano.`;
          if(!document.getElementById(line.id))queue.appendChild(line);
        }
      }
    }catch{}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showContactStatus,{once:true});
  else showContactStatus();
})();
