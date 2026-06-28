(() => {
  'use strict';
  const form=document.getElementById('accessForm');
  const notice=document.getElementById('notice');
  const button=document.getElementById('submitButton');
  const result=document.getElementById('result');
  const setNotice=(message,kind='')=>{notice.textContent=message;notice.className=`notice${kind?` ${kind}`:''}`;};
  const setText=(id,value)=>{const node=document.getElementById(id);if(node)node.textContent=value||'—';};
  function prefill(){
    const params=new URLSearchParams(location.search);
    const application=String(params.get('application')||params.get('id')||'').trim().toUpperCase();
    if(/^GNK-APP-2026-[A-Z0-9]{8}$/.test(application))document.getElementById('applicationId').value=application;
  }
  async function session(){
    try{
      const response=await fetch('/api/media-access/session',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
      const data=await response.json();
      if(!response.ok||!data.ok)return;
      show(data.application);
    }catch{}
  }
  function show(application){
    form.hidden=true;
    result.hidden=false;
    setText('outletName',application.outletName);
    setText('applicantName',application.applicantName);
    setText('confirmedApplicationId',application.applicationId);
    setText('applicationStatus',application.humanDecision||application.status);
    setNotice('Sigurna sesija je aktivna. / Secure session is active.','success');
  }
  async function submit(event){
    event.preventDefault();
    const applicationId=document.getElementById('applicationId').value.trim().toUpperCase();
    const code=document.getElementById('accessCode').value.trim().toUpperCase().replace(/\s+/g,'');
    if(!applicationId||!code){setNotice('Unesite šifru prijave i pristupni kod. / Enter both fields.','error');return;}
    button.disabled=true;
    button.textContent='Provjera… / Checking…';
    try{
      const response=await fetch('/api/media-access/login',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json',accept:'application/json'},body:JSON.stringify({applicationId,code})});
      const data=await response.json().catch(()=>({ok:false,error:`HTTP_${response.status}`}));
      if(!response.ok||!data.ok){
        const messages={invalid_credentials:'Šifra prijave ili pristupni kod nisu valjani.',code_expired:'Pristupni kod je istekao. Zatražite novi kod.',rate_limit:'Previše pokušaja. Pokušajte ponovno kasnije.',application_not_approved:'Prijava još nije odobrena.'};
        throw new Error(messages[data.error]||data.message||data.error||'Prijava nije uspjela.');
      }
      show(data.application);
    }catch(error){setNotice(error.message||'Prijava nije uspjela.','error');}
    finally{button.disabled=false;button.textContent='Prijava / Sign in';}
  }
  form?.addEventListener('submit',submit);
  prefill();
  session();
})();
