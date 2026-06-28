(()=>{
  'use strict';
  if(window.__GNK_ASG_STUDIO_CORE_V21__)return;
  window.__GNK_ASG_STUDIO_CORE_V21__=true;

  const VERSION='GNK_ASG_STUDIO_CORE_V21_20260629_R2';
  const MANDATORY_BCC='rht@gmx.com';
  const SEND_ENDPOINT='/api/studio-message/send';
  const BOX_ENDPOINTS={inbox:'/api/studio-message/inbox',sent:'/api/studio-message/sent',outbox:'/api/studio-message/outbox',status:'/api/studio-message/status'};
  const ACTIONS=['send','save','load','helper','autoReply','clear'];
  let announced=false;
  let installing=false;
  const $=id=>document.getElementById(id);
  const value=id=>String($(id)?.value||'');
  const setValue=(id,next)=>{const node=$(id);if(node)node.value=next||'';};
  const status=text=>{const node=$('status');if(node&&node.textContent!==text)node.textContent=text;};
  const esc=text=>String(text||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const parseEmails=input=>[...new Set(String(input||'').split(/[;,\s]+/).map(item=>item.trim().toLowerCase()).filter(Boolean))];
  const ensureBcc=input=>[...new Set([...parseEmails(input).filter(email=>email!=='rht@gmc.vom'),MANDATORY_BCC])].join(', ');
  const attachments=()=>Array.isArray(window.GNK_ASG_PDF_ATTACHMENTS_FINAL)?window.GNK_ASG_PDF_ATTACHMENTS_FINAL.slice():[];
  const authHeaders=()=>{try{return window.GNK_ASG_ADMIN_AUTH?.headers?.()||{};}catch{return{};}};

  function refreshPreview(){const area=$('bodyText');if(area)area.dispatchEvent(new Event('input',{bubbles:true}));}
  function messageHtml(){return `<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:15px;line-height:1.5">${esc(value('bodyText')).replace(/\r?\n/g,'<br>')}</div>`;}
  function payload(){
    const profile=value('profile')||'office';
    return{confirm:'SEND_MAIL',profile,signatureProfile:profile,from:value('from'),fromName:value('fromName'),to:value('to'),cc:value('cc'),bcc:ensureBcc(value('bcc')),subject:value('subject'),body:messageHtml(),html:messageHtml(),bodyHtml:messageHtml(),text:value('bodyText'),plainText:value('bodyText'),attachments:attachments()};
  }

  function setButtonState(button,state,label){
    if(!button)return;
    if(!button.dataset.studioIdleLabel)button.dataset.studioIdleLabel=button.textContent.trim();
    button.classList.remove('studio-core-busy','studio-core-ok','studio-core-error');
    if(state)button.classList.add(`studio-core-${state}`);
    button.textContent=label||button.dataset.studioIdleLabel;
  }

  async function send(button){
    const data=payload();setValue('bcc',data.bcc);
    if(!data.to.trim()){status('Nedostaje To primatelj.');$('to')?.focus();setButtonState(button,'error','Nedostaje To');return;}
    if(!data.subject.trim()){status('Nedostaje predmet.');$('subject')?.focus();setButtonState(button,'error','Nedostaje predmet');return;}
    if(!data.text.trim()){status('Nedostaje tekst poruke.');$('bodyText')?.focus();setButtonState(button,'error','Nedostaje tekst');return;}
    button.disabled=true;setButtonState(button,'busy','Slanje…');status('Slanje poruke kroz aktivni GNK ASG servis…');
    try{
      const headers=new Headers({'content-type':'application/json','accept':'application/json','cache-control':'no-cache'});
      Object.entries(authHeaders()).forEach(([key,val])=>{if(val)headers.set(key,val);});
      const response=await fetch(SEND_ENDPOINT,{method:'POST',credentials:'same-origin',cache:'no-store',headers,body:JSON.stringify(data)});
      const raw=await response.text();let result={};try{result=JSON.parse(raw);}catch{result={raw};}
      const list=$('list');if(list)list.textContent=JSON.stringify({httpStatus:response.status,...result},null,2);
      const delivered=result?.status==='SENT'||result?.delivered===true||(Number(result?.sent)>0&&Number(result?.failed)===0);
      if(!response.ok||!delivered){
        let message=`Slanje nije uspjelo (${response.status}).`;
        if(response.status===401||response.status===403)message='Admin sesija je istekla. Ponovno se prijavite kroz ADMIN.';
        else if(response.status===423)message='Slanje je zaključano na serveru.';
        else if(result?.error==='duplicate_recent_send')message='Ista poruka je već poslana unutar posljednjih 90 sekundi.';
        else if(result?.error)message=`Slanje nije uspjelo: ${result.error}`;
        status(message);setButtonState(button,'error','Nije poslano');return;
      }
      status(`✓ Poruka je stvarno poslana. Primatelja: ${result.sent||1}. PDF priloga: ${data.attachments.length}.`);
      setButtonState(button,'ok','✓ Poslano');
      setTimeout(()=>loadBox('sent',false),300);
    }catch(error){status(`Greška slanja: ${error.message}`);setButtonState(button,'error','Greška');}
    finally{button.disabled=false;setTimeout(()=>setButtonState(button,''),1800);}
  }

  function save(){try{localStorage.setItem('gnk_asg_studio_draft_v21',JSON.stringify({...payload(),body:value('bodyText')}));status('✓ Draft spremljen.');}catch(error){status(`Greška spremanja drafta: ${error.message}`);}}
  function load(){
    try{
      const raw=localStorage.getItem('gnk_asg_studio_draft_v21')||localStorage.getItem('gnk_asg_mail_studio_draft_v20')||localStorage.getItem('gnk_asg_mail_studio_draft')||'';
      if(!raw){status('Nema spremljenog drafta.');return;}
      const draft=JSON.parse(raw);['profile','from','fromName','to','cc','bcc','subject'].forEach(id=>setValue(id,draft[id]));setValue('bodyText',draft.body||draft.text||'');$('profile')?.dispatchEvent(new Event('change',{bubbles:true}));refreshPreview();status('✓ Draft učitan.');
    }catch(error){status(`Greška učitavanja drafta: ${error.message}`);}
  }
  function helper(){
    const current=value('bodyText').trim(),mode=value('mode')||'reply';
    const map={short:'Poštovani,\n\nhvala na poruci. Zaprimili smo Vaš upit i javit ćemo se s odgovorom u najkraćem razumnom roku.\n\nSrdačan pozdrav,',media:'Poštovani,\n\nhvala na medijskom upitu. Molimo da sva dodatna pitanja i rokove dostavite pisanim putem kako bismo mogli pripremiti cjelovit odgovor.\n\nSrdačan pozdrav,',legal:`Poštovani,\n\nvezano uz Vašu poruku, potvrđujemo primitak te ćemo navode razmotriti u okviru dostupne dokumentacije i nadležnosti GNK ASG d.o.o.\n\n${current}\n\nSva prava i pravni interesi GNK ASG d.o.o. ostaju pridržani.\n\nSrdačan pozdrav,`,reply:`Poštovani,\n\nzahvaljujemo na Vašoj poruci te potvrđujemo da smo je uredno zaprimili.\n\n${current}\n\nSrdačan pozdrav,`};
    setValue('bodyText',map[mode]||map.reply);refreshPreview();status('✓ Predložak pripremljen.');
  }
  function autoReply(){setValue('bodyText','Poštovani,\n\novim putem potvrđujemo da je Vaša poruka uredno zaprimljena u sustavu GNK ASG. Nakon interne obrade, odgovor ćemo Vam dostaviti pisanim putem u najkraćem mogućem roku.\n\nHvala na razumijevanju.\n\nSrdačan pozdrav,');refreshPreview();status('✓ Auto odgovor pripremljen.');}
  function clearAll(){['to','cc','subject','bodyText'].forEach(id=>setValue(id,''));setValue('bcc',MANDATORY_BCC);refreshPreview();status('✓ Polja su očišćena.');}

  async function loadBox(type,announce=true){
    const endpoint=BOX_ENDPOINTS[type];if(!endpoint)return;
    const list=$('list');if(list)list.textContent=`Učitavanje: ${type}…`;
    try{
      const headers=new Headers({'accept':'application/json','cache-control':'no-cache'});Object.entries(authHeaders()).forEach(([key,val])=>{if(val)headers.set(key,val);});
      const response=await fetch(`${endpoint}?cb=${Date.now()}`,{credentials:'same-origin',cache:'no-store',headers});
      const raw=await response.text();let result;try{result=JSON.parse(raw);}catch{result={raw};}if(list)list.textContent=JSON.stringify(result,null,2);
      if(announce)status(response.ok?`✓ ${type} učitan.`:`Greška učitavanja ${type}: ${response.status}`);
    }catch(error){if(list)list.textContent=error.message;if(announce)status(`Greška učitavanja ${type}.`);}
  }

  const handlers={send,save,load,helper,autoReply,clear:clearAll};
  function candidates(action){return [...document.querySelectorAll(`#${action},#gnkMailV18_${action},#gnkMailV20_${action},#gnkStudioV21_${action},[data-gnk-v18-action="${action}"],[data-studio-action="${action}"]`)];}
  function installAction(action){
    const old=candidates(action)[0];if(!old||old.dataset.studioCoreV21==='1')return;
    const next=old.cloneNode(true);next.id=`gnkStudioV21_${action}`;next.type='button';next.disabled=false;next.dataset.studioCoreV21='1';next.dataset.studioAction=action;delete next.dataset.gnkV18Action;delete next.dataset.gnkHotfixV20;next.style.pointerEvents='auto';next.style.position='relative';next.style.zIndex='3';old.replaceWith(next);
    next.addEventListener('pointerdown',()=>next.classList.add('studio-core-pressed'));const release=()=>setTimeout(()=>next.classList.remove('studio-core-pressed'),100);next.addEventListener('pointerup',release);next.addEventListener('pointercancel',release);next.addEventListener('pointerleave',release);
    next.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const fn=handlers[action];action==='send'?fn(next):fn();});
  }
  function installTabs(){document.querySelectorAll('.tab[data-box]').forEach(old=>{if(old.dataset.studioCoreV21==='1')return;const next=old.cloneNode(true);next.type='button';next.dataset.studioCoreV21='1';next.style.pointerEvents='auto';next.style.position='relative';next.style.zIndex='3';old.replaceWith(next);next.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();loadBox(next.dataset.box);});});}
  function install(){
    if(installing)return;installing=true;
    try{ACTIONS.forEach(installAction);installTabs();const bcc=$('bcc');if(bcc)bcc.value=ensureBcc(bcc.value);document.documentElement.dataset.gnkStudioCore=VERSION;if(!announced){announced=true;status('Mail Studio je spreman za stvarno slanje.');}}
    finally{installing=false;}
  }

  const style=document.createElement('style');
  style.textContent=`[data-studio-core-v21="1"]{cursor:pointer!important;pointer-events:auto!important;transition:transform .1s ease,filter .16s ease,box-shadow .16s ease!important;box-shadow:0 5px 0 rgba(88,57,8,.75),0 10px 24px rgba(0,0,0,.28)!important}[data-studio-core-v21="1"]:hover{filter:brightness(1.12)}[data-studio-core-v21="1"]:active,[data-studio-core-v21="1"].studio-core-pressed{transform:translateY(5px) scale(.985)!important;box-shadow:0 1px 0 rgba(88,57,8,.72),0 4px 10px rgba(0,0,0,.24)!important}[data-studio-core-v21="1"].studio-core-busy{cursor:progress!important;opacity:.84}[data-studio-core-v21="1"].studio-core-ok{border-color:#61e294!important;box-shadow:0 0 24px rgba(97,226,148,.35)!important}[data-studio-core-v21="1"].studio-core-error{border-color:#ff8585!important;box-shadow:0 0 22px rgba(255,133,133,.3)!important}`;
  document.head.appendChild(style);

  const boot=()=>{install();setTimeout(install,250);setTimeout(install,900);setTimeout(install,1800);setTimeout(install,3200);const observer=new MutationObserver(()=>install());observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),12000);loadBox('status',false);};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
