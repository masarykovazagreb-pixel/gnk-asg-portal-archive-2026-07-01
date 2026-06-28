(()=>{
  'use strict';
  const RELEASE='GNK_ASG_MAIL_STUDIO_AI_MEDIA_V1_20260628';
  if(window.__GNK_ASG_MAIL_STUDIO_AI_MEDIA__===RELEASE)return;
  window.__GNK_ASG_MAIL_STUDIO_AI_MEDIA__=RELEASE;
  const $=id=>document.getElementById(id);
  const value=id=>$(id)?.value||'';
  const status=text=>{if($('status'))$('status').textContent=text;};

  function ensureButton(){
    if($('aiMediaReply'))return;
    const actions=$('gnkPersonalAiPanel')?.querySelector('.actions');
    if(!actions)return;
    const button=document.createElement('button');
    button.type='button';
    button.id='aiMediaReply';
    button.className='gold';
    button.textContent='AI medijski odgovor';
    actions.prepend(button);
  }

  async function prepareMediaReply(){
    if($('aiTone'))$('aiTone').value='medijski i neutralno';
    if($('aiRelation')&&!value('aiRelation').trim())$('aiRelation').value='novinar / medijski upit';
    status('AI priprema medijski odgovor…');
    const payload={
      task:'media_reply',
      style:'media',
      lang:'hr',
      subject:value('subject'),
      text:value('bodyText'),
      context:value('aiContext'),
      recipientName:value('aiRecipientName'),
      relation:value('aiRelation')||'novinar / medijski upit',
      goal:value('aiGoal')||'Pripremiti točan, objavljiv i pravno oprezan odgovor na medijski upit.',
      tone:'medijski i neutralno'
    };
    try{
      const response=await fetch('/api/ai-assist',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','cache-control':'no-cache'},body:JSON.stringify(payload)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||`HTTP ${response.status}`);
      if(!result.text)throw new Error('AI nije vratio tekst.');
      if($('bodyText')){
        $('bodyText').value=result.text;
        $('bodyText').dispatchEvent(new Event('input',{bubbles:true}));
        $('bodyText').focus();
      }
      status(result.ai?`Medijski AI odgovor pripremljen · ${result.model}`:'Medijski sigurni fallback pripremljen.');
    }catch(error){
      status(`AI medijski odgovor nije pripremljen: ${error.message}`);
    }
  }

  function boot(){
    ensureButton();
    new MutationObserver(ensureButton).observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',event=>{
      const button=event.target.closest?.('#aiMediaReply');
      if(!button)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      prepareMediaReply();
    },true);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
