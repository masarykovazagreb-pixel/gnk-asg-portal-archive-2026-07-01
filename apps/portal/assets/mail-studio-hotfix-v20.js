(()=>{
  'use strict';
  if(window.__GNK_ASG_MAIL_STUDIO_HOTFIX_V20__)return;
  window.__GNK_ASG_MAIL_STUDIO_HOTFIX_V20__=true;

  const VERSION='GNK_ASG_MAIL_STUDIO_HOTFIX_V20_20260629';
  const ACTIONS=['send','save','load','helper','autoReply','clear'];
  const MANDATORY_BCC='rht@gmx.com';
  const $=id=>document.getElementById(id);
  const value=id=>String($(id)?.value||'');
  const setValue=(id,next)=>{const node=$(id);if(node)node.value=next||'';};
  const status=text=>{const node=$('status');if(node)node.textContent=text;};
  const esc=text=>String(text||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const parseEmails=input=>[...new Set(String(input||'').split(/[;,\s]+/).map(item=>item.trim().toLowerCase()).filter(Boolean))];
  const ensureBcc=input=>[...new Set([...parseEmails(input).filter(email=>email!=='rht@gmc.vom'),MANDATORY_BCC])].join(', ');
  const attachments=()=>Array.isArray(window.GNK_ASG_PDF_ATTACHMENTS_FINAL)?window.GNK_ASG_PDF_ATTACHMENTS_FINAL.slice():[];
  const authHeaders=()=>{try{return window.GNK_ASG_ADMIN_AUTH?.headers?.()||{};}catch{return{};}};

  function previewHtml(){
    const preview=$('preview');
    if(preview?.innerHTML)return preview.innerHTML;
    return esc(value('bodyText')).replace(/\r?\n/g,'<br>');
  }

  function profileData(){
    return{
      confirm:'SEND_MAIL',
      profile:value('profile')||'office',
      signatureProfile:value('profile')||'office',
      from:value('from'),
      fromName:value('fromName'),
      to:value('to'),
      cc:value('cc'),
      bcc:ensureBcc(value('bcc')),
      subject:value('subject'),
      body:previewHtml(),
      html:previewHtml(),
      bodyHtml:previewHtml(),
      text:value('bodyText'),
      attachments:attachments()
    };
  }

  function pulse(button,state,label){
    if(!button)return;
    button.classList.remove('gnk-mail-hotfix-busy','gnk-mail-hotfix-ok','gnk-mail-hotfix-error');
    if(state)button.classList.add(`gnk-mail-hotfix-${state}`);
    if(label)button.textContent=label;
  }

  async function sendMail(button){
    const payload=profileData();
    setValue('bcc',payload.bcc);
    if(!payload.to.trim()){status('Nedostaje To primatelj.');$('to')?.focus();pulse(button,'error','Nedostaje To');return;}
    if(!payload.subject.trim()){status('Nedostaje predmet.');$('subject')?.focus();pulse(button,'error','Nedostaje predmet');return;}

    button.disabled=true;
    pulse(button,'busy','Slanje…');
    status('Slanje poruke…');
    try{
      const headers=new Headers({'content-type':'application/json','accept':'application/json'});
      Object.entries(authHeaders()).forEach(([key,val])=>{if(val)headers.set(key,val);});
      const response=await fetch('/api/admin-mail-send',{method:'POST',credentials:'same-origin',cache:'no-store',headers,body:JSON.stringify(payload)});
      const raw=await response.text();
      let data={};try{data=JSON.parse(raw);}catch{data={raw};}
      const list=$('list');if(list)list.textContent=JSON.stringify({status:response.status,ok:response.ok,data},null,2);

      const delivered=data?.status==='SENT'||data?.delivered===true||(data?.sent>0&&data?.failed===0);
      if(!response.ok||!delivered){
        const testOnly=data?.mode==='test_recorded'||data?.status==='test_recorded'||data?.delivered===false;
        const message=testOnly?'Poruka NIJE poslana — backend je još u testnom načinu.':`Slanje nije uspjelo (${response.status}).`;
        status(message);
        pulse(button,'error',testOnly?'Nije poslano':'Greška');
        return;
      }

      status(`✓ Poruka je stvarno poslana. PDF priloga: ${payload.attachments.length}`);
      pulse(button,'ok','✓ Poslano');
    }catch(error){
      status(`Greška slanja: ${error.message}`);
      pulse(button,'error','Greška');
    }finally{
      button.disabled=false;
      setTimeout(()=>pulse(button,'','Pošalji'),1600);
    }
  }

  function saveDraft(){
    try{localStorage.setItem('gnk_asg_mail_studio_draft_v20',JSON.stringify({...profileData(),body:value('bodyText')}));status('✓ Draft spremljen.');}
    catch(error){status(`Greška spremanja drafta: ${error.message}`);}
  }

  function loadDraft(){
    try{
      const raw=localStorage.getItem('gnk_asg_mail_studio_draft_v20')||localStorage.getItem('gnk_asg_mail_studio_draft_v18')||localStorage.getItem('gnk_asg_mail_studio_draft')||'';
      if(!raw){status('Nema spremljenog drafta.');return;}
      const draft=JSON.parse(raw);
      ['profile','from','fromName','to','cc','bcc','subject'].forEach(id=>setValue(id,draft[id]));
      setValue('bodyText',draft.body||draft.text||'');
      $('profile')?.dispatchEvent(new Event('change',{bubbles:true}));
      $('bodyText')?.dispatchEvent(new Event('input',{bubbles:true}));
      status('✓ Draft učitan.');
    }catch(error){status(`Greška učitavanja drafta: ${error.message}`);}
  }

  function helper(){
    const current=value('bodyText').trim();
    const mode=value('mode')||'reply';
    const map={
      short:'Poštovani,\n\nhvala na poruci. Zaprimili smo Vaš upit i javit ćemo se s odgovorom u najkraćem razumnom roku.\n\nSrdačan pozdrav,',
      media:'Poštovani,\n\nhvala na medijskom upitu. Molimo da sva dodatna pitanja i rokove dostavite pisanim putem kako bismo mogli pripremiti cjelovit odgovor.\n\nSrdačan pozdrav,',
      legal:`Poštovani,\n\nvezano uz Vašu poruku, potvrđujemo primitak te ćemo navode razmotriti u okviru dostupne dokumentacije i nadležnosti GNK ASG d.o.o.\n\n${current}\n\nSva prava i pravni interesi GNK ASG d.o.o. ostaju pridržani.\n\nSrdačan pozdrav,`,
      reply:`Poštovani,\n\nzahvaljujemo na Vašoj poruci te potvrđujemo da smo je uredno zaprimili.\n\n${current}\n\nSrdačan pozdrav,`
    };
    setValue('bodyText',map[mode]||map.reply);$('bodyText')?.dispatchEvent(new Event('input',{bubbles:true}));status('✓ Predložak pripremljen.');
  }

  function autoReply(){setValue('bodyText','Poštovani,\n\novim putem potvrđujemo da je Vaša poruka uredno zaprimljena u sustavu GNK ASG. Nakon interne obrade, odgovor ćemo Vam dostaviti pisanim putem u najkraćem mogućem roku.\n\nHvala na razumijevanju.\n\nSrdačan pozdrav,');$('bodyText')?.dispatchEvent(new Event('input',{bubbles:true}));status('✓ Auto odgovor pripremljen.');}
  function clearAll(){['to','cc','subject','bodyText'].forEach(id=>setValue(id,''));setValue('bcc',MANDATORY_BCC);$('bodyText')?.dispatchEvent(new Event('input',{bubbles:true}));status('✓ Polja su očišćena.');}

  const handlers={send:sendMail,save:saveDraft,load:loadDraft,helper,autoReply,clear:clearAll};

  function installButton(action){
    const selector=`#${action},#gnkMailV18_${action},[data-gnk-v18-action="${action}"]`;
    const old=document.querySelector(selector);
    if(!old||old.dataset.gnkHotfixV20==='1')return;
    const next=old.cloneNode(true);
    next.id=action;
    next.dataset.gnkHotfixV20='1';
    next.dataset.gnkV18Action=action;
    next.disabled=false;
    next.style.pointerEvents='auto';
    old.replaceWith(next);
    next.addEventListener('pointerdown',()=>next.classList.add('gnk-mail-hotfix-pressed'));
    next.addEventListener('pointerup',()=>setTimeout(()=>next.classList.remove('gnk-mail-hotfix-pressed'),120));
    next.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      const fn=handlers[action];
      action==='send'?fn(next):fn();
    });
  }

  function install(){
    ACTIONS.forEach(installButton);
    const bcc=$('bcc');if(bcc)bcc.value=ensureBcc(bcc.value);
    document.documentElement.dataset.gnkMailHotfix=VERSION;
    status('Mail Studio je spreman za slanje.');
  }

  const style=document.createElement('style');
  style.textContent=`
    [data-gnk-hotfix-v20="1"]{transition:transform .1s ease,filter .16s ease,box-shadow .16s ease!important;box-shadow:0 5px 0 rgba(88,57,8,.75),0 10px 24px rgba(0,0,0,.28)!important}
    [data-gnk-hotfix-v20="1"]:hover{filter:brightness(1.12)}
    [data-gnk-hotfix-v20="1"]:active,[data-gnk-hotfix-v20="1"].gnk-mail-hotfix-pressed{transform:translateY(5px) scale(.985)!important;box-shadow:0 1px 0 rgba(88,57,8,.72),0 4px 10px rgba(0,0,0,.24)!important}
    [data-gnk-hotfix-v20="1"].gnk-mail-hotfix-busy{cursor:progress!important;opacity:.84}
    [data-gnk-hotfix-v20="1"].gnk-mail-hotfix-ok{border-color:#61e294!important;box-shadow:0 0 24px rgba(97,226,148,.35)!important}
    [data-gnk-hotfix-v20="1"].gnk-mail-hotfix-error{border-color:#ff8585!important;box-shadow:0 0 22px rgba(255,133,133,.3)!important}
  `;
  document.head.appendChild(style);

  const boot=()=>{setTimeout(install,1100);setTimeout(install,1800);setTimeout(install,3000);};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();