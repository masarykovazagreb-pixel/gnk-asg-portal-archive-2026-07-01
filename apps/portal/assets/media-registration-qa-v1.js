(()=>{
  'use strict';

  const DEADLINE='2026-07-20T23:59:00+02:00';
  const $=id=>document.getElementById(id);
  const isEnglish=()=>document.body.classList.contains('lang-en');

  function setDocumentLanguage(){
    document.documentElement.lang=isEnglish()?'en':'hr';
    document.title=isEnglish()
      ?'Media Application and Accreditation | GNK DINAMO Ltd. Group'
      :'Media prijava i akreditacija | GNK DINAMO Ltd. Group';
  }

  function deadlinePassed(){
    return Date.now()>=Date.parse(DEADLINE);
  }

  function applyDeadlineState(){
    const passed=deadlinePassed();
    const registerButton=$('registerButton');
    const submitButton=$('submitButton');
    const countdown=$('countdown');
    const deadlineText=$('deadlineText');

    if(deadlineText){
      deadlineText.textContent=isEnglish()
        ?'20 July 2026 · 23:59 CEST'
        :'20. srpnja 2026. · 23:59 CEST';
    }

    if(!passed)return;

    if(registerButton){
      registerButton.disabled=true;
      registerButton.setAttribute('aria-disabled','true');
      registerButton.title=isEnglish()?'The application deadline has passed.':'Rok za prijavu je istekao.';
    }
    if(submitButton){
      submitButton.disabled=true;
      submitButton.setAttribute('aria-disabled','true');
      submitButton.title=isEnglish()?'The application deadline has passed.':'Rok za prijavu je istekao.';
    }
    if(countdown){
      countdown.setAttribute('role','status');
      countdown.setAttribute('aria-live','polite');
      countdown.textContent=isEnglish()?'Application deadline passed':'Rok za prijavu je istekao';
    }
  }

  function observeLanguage(){
    document.querySelectorAll('[data-lang]').forEach(button=>{
      button.addEventListener('click',()=>{
        queueMicrotask(()=>{
          setDocumentLanguage();
          applyDeadlineState();
        });
      });
    });
  }

  function improveStatusRegions(){
    ['loginNotice','registerNotice','formNotice','saveState','countdown'].forEach(id=>{
      const node=$(id);
      if(!node)return;
      node.setAttribute('role','status');
      node.setAttribute('aria-live','polite');
    });
  }

  function boot(){
    setDocumentLanguage();
    improveStatusRegions();
    observeLanguage();
    applyDeadlineState();
    window.setInterval(applyDeadlineState,60000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();