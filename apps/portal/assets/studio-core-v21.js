(()=>{
  'use strict';
  if(window.__GNK_ASG_STUDIO_CORE_V22__)return;
  window.__GNK_ASG_STUDIO_CORE_V22__=true;

  const VERSION='GNK_ASG_STUDIO_CORE_V22_20260629_R1_HTML_IMPORT';
  const MANDATORY_BCC='rht@gmx.com';
  const SEND_ENDPOINT='/api/studio-message/send';
  const BOX_ENDPOINTS={
    inbox:'/api/studio-message/inbox',
    sent:'/api/studio-message/sent',
    outbox:'/api/studio-message/outbox',
    status:'/api/studio-message/status'
  };
  const ACTIONS=['send','save','load','helper','autoReply','clear'];
  const ACTION_LABELS={
    send:['pošalji','posalji','send'],
    save:['spremi draft','save draft'],
    load:['učitaj draft','ucitaj draft','load draft'],
    helper:['predložak','predlozak','template'],
    autoReply:['auto odgovor','auto reply'],
    clear:['očisti','ocisti','clear']
  };
  const ACTION_SELECTORS={
    send:'#send,#gnkMailV18_send,#gnkMailV20_send,#gnkStudioV21_send,#gnkStudioV22_send,[data-gnk-v18-action="send"],[data-studio-action="send"]',
    save:'#save,#gnkMailV18_save,#gnkMailV20_save,#gnkStudioV21_save,#gnkStudioV22_save,[data-gnk-v18-action="save"],[data-studio-action="save"]',
    load:'#load,#gnkMailV18_load,#gnkMailV20_load,#gnkStudioV21_load,#gnkStudioV22_load,[data-gnk-v18-action="load"],[data-studio-action="load"]',
    helper:'#helper,#gnkMailV18_helper,#gnkMailV20_helper,#gnkStudioV21_helper,#gnkStudioV22_helper,[data-gnk-v18-action="helper"],[data-studio-action="helper"]',
    autoReply:'#autoReply,#gnkMailV18_autoReply,#gnkMailV20_autoReply,#gnkStudioV21_autoReply,#gnkStudioV22_autoReply,[data-gnk-v18-action="autoReply"],[data-studio-action="autoReply"]',
    clear:'#clear,#gnkMailV18_clear,#gnkMailV20_clear,#gnkStudioV21_clear,#gnkStudioV22_clear,[data-gnk-v18-action="clear"],[data-studio-action="clear"]'
  };

  let importedHtml='';
  let importedFileName='';
  let announced=false;
  let installing=false;
  let clickGuard=false;

  const $=id=>document.getElementById(id);
  const value=id=>String($(id)?.value||'');
  const setValue=(id,next)=>{const node=$(id);if(node)node.value=next||'';};
  const status=text=>{const node=$('status');if(node&&node.textContent!==text)node.textContent=text;};
  const esc=text=>String(text||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const normalize=text=>String(text||'').toLocaleLowerCase('hr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  const parseEmails=input=>[...new Set(String(input||'').split(/[;,\s]+/).map(item=>item.trim().toLowerCase()).filter(Boolean))];
  const ensureBcc=input=>[...new Set([...parseEmails(input).filter(email=>email!=='rht@gmc.vom'),MANDATORY_BCC])].join(', ');
  const attachments=()=>Array.isArray(window.GNK_ASG_PDF_ATTACHMENTS_FINAL)?window.GNK_ASG_PDF_ATTACHMENTS_FINAL.slice():[];
  const authHeaders=()=>{try{return window.GNK_ASG_ADMIN_AUTH?.headers?.()||{};}catch{return{};}};

  function looksLikeHtml(text){
    const sample=String(text||'').trim().slice(0,500).toLowerCase();
    return sample.startsWith('<!doctype')||sample.startsWith('<html')||sample.startsWith('<?xml')||/<(?:table|div|body|head|p|section|article|h[1-6])(?:\s|>)/i.test(sample);
  }

  function activeHtml(){
    const body=value('bodyText');
    if(importedHtml.trim())return importedHtml;
    if(looksLikeHtml(body))return body;
    return `<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:15px;line-height:1.5">${esc(body).replace(/\r?\n/g,'<br>')}</div>`;
  }

  function plainTextFromHtml(html){
    try{
      const doc=new DOMParser().parseFromString(String(html||''),'text/html');
      return String(doc.body?.innerText||doc.body?.textContent||'').trim();
    }catch{return value('bodyText');}
  }

  function refreshPreview(){
    const preview=$('preview');
    const html=activeHtml();
    if(preview){
      preview.innerHTML='';
      const subject=document.createElement('div');
      subject.style.cssText='font-family:Arial,sans-serif;margin:0 0 10px;color:#111827';
      subject.innerHTML=`<strong>Predmet:</strong> ${esc(value('subject'))}`;
      const frame=document.createElement('iframe');
      frame.id='gnkHtmlPreviewFrame';
      frame.title='HTML email preview';
      frame.style.cssText='display:block;width:100%;min-height:620px;border:1px solid #d5dae2;border-radius:10px;background:#fff';
      frame.setAttribute('sandbox','allow-popups allow-popups-to-escape-sandbox');
      preview.append(subject,frame);
      frame.srcdoc=html;
    }
    const area=$('bodyText');
    if(area)area.dispatchEvent(new CustomEvent('gnk-html-updated',{bubbles:true,detail:{fileName:importedFileName,hasImportedHtml:Boolean(importedHtml)}}));
  }

  function payload(){
    const profile=value('profile')||'office';
    const html=activeHtml();
    const text=looksLikeHtml(value('bodyText'))||importedHtml?plainTextFromHtml(html):value('bodyText');
    return{
      confirm:'SEND_MAIL',
      profile,
      signatureProfile:profile,
      from:value('from'),
      fromName:value('fromName'),
      to:value('to'),
      cc:value('cc'),
      bcc:ensureBcc(value('bcc')),
      subject:value('subject'),
      body:html,
      html,
      bodyHtml:html,
      text,
      plainText:text,
      htmlSourceFile:importedFileName,
      attachments:attachments()
    };
  }

  function setButtonState(button,state,label){
    if(!button)return;
    if(!button.dataset.studioIdleLabel)button.dataset.studioIdleLabel=button.textContent.trim();
    button.classList.remove('studio-core-busy','studio-core-ok','studio-core-error');
    if(state)button.classList.add(`studio-core-${state}`);
    button.textContent=label||button.dataset.studioIdleLabel;
  }

  async function send(button){
    const data=payload();
    setValue('bcc',data.bcc);
    if(!data.to.trim()){status('Nedostaje To primatelj.');$('to')?.focus();setButtonState(button,'error','Nedostaje To');return;}
    if(!data.subject.trim()){status('Nedostaje predmet.');$('subject')?.focus();setButtonState(button,'error','Nedostaje predmet');return;}
    if(!data.text.trim()&&!data.html.trim()){status('Nedostaje sadržaj poruke.');$('bodyText')?.focus();setButtonState(button,'error','Nedostaje sadržaj');return;}

    button.disabled=true;
    setButtonState(button,'busy','Slanje…');
    status(`Slanje poruke${importedFileName?` iz ${importedFileName}`:''}…`);
    try{
      const headers=new Headers({'content-type':'application/json','accept':'application/json','cache-control':'no-cache'});
      Object.entries(authHeaders()).forEach(([key,val])=>{if(val)headers.set(key,val);});
      const response=await fetch(SEND_ENDPOINT,{method:'POST',credentials:'same-origin',cache:'no-store',headers,body:JSON.stringify(data)});
      const raw=await response.text();
      let result={};try{result=JSON.parse(raw);}catch{result={raw};}
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
      status(`✓ Poruka je poslana. HTML: ${importedFileName||'sadržaj iz editora'}. PDF priloga: ${data.attachments.length}.`);
      setButtonState(button,'ok','✓ Poslano');
      setTimeout(()=>loadBox('sent',false),300);
    }catch(error){status(`Greška slanja: ${error.message}`);setButtonState(button,'error','Greška');}
    finally{button.disabled=false;setTimeout(()=>setButtonState(button,''),1800);}
  }

  function save(){
    try{
      localStorage.setItem('gnk_asg_studio_draft_v22',JSON.stringify({...payload(),body:value('bodyText'),importedHtml,importedFileName}));
      status('✓ Draft spremljen, uključujući HTML/XHTML sadržaj.');
    }catch(error){status(`Greška spremanja drafta: ${error.message}`);}
  }

  function load(){
    try{
      const raw=localStorage.getItem('gnk_asg_studio_draft_v22')||localStorage.getItem('gnk_asg_studio_draft_v21')||localStorage.getItem('gnk_asg_mail_studio_draft_v20')||localStorage.getItem('gnk_asg_mail_studio_draft')||'';
      if(!raw){status('Nema spremljenog drafta.');return;}
      const draft=JSON.parse(raw);
      ['profile','from','fromName','to','cc','bcc','subject'].forEach(id=>setValue(id,draft[id]));
      importedHtml=String(draft.importedHtml||'');
      importedFileName=String(draft.importedFileName||draft.htmlSourceFile||'');
      setValue('bodyText',draft.body||draft.text||importedHtml||'');
      $('profile')?.dispatchEvent(new Event('change',{bubbles:true}));
      updateImporterLabel();refreshPreview();status('✓ Draft učitan.');
    }catch(error){status(`Greška učitavanja drafta: ${error.message}`);}
  }

  function resetImportedHtml(){
    importedHtml='';importedFileName='';updateImporterLabel();
  }

  function helper(){
    resetImportedHtml();
    const current=value('bodyText').trim(),mode=value('mode')||'reply';
    const map={
      short:'Poštovani,\n\nhvala na poruci. Zaprimili smo Vaš upit i javit ćemo se s odgovorom u najkraćem razumnom roku.\n\nSrdačan pozdrav,',
      media:'Poštovani,\n\nhvala na medijskom upitu. Molimo da sva dodatna pitanja i rokove dostavite pisanim putem kako bismo mogli pripremiti cjelovit odgovor.\n\nSrdačan pozdrav,',
      legal:`Poštovani,\n\nvezano uz Vašu poruku, potvrđujemo primitak te ćemo navode razmotriti u okviru dostupne dokumentacije i nadležnosti GNK ASG d.o.o.\n\n${current}\n\nSva prava i pravni interesi GNK ASG d.o.o. ostaju pridržani.\n\nSrdačan pozdrav,`,
      reply:`Poštovani,\n\nzahvaljujemo na Vašoj poruci te potvrđujemo da smo je uredno zaprimili.\n\n${current}\n\nSrdačan pozdrav,`
    };
    setValue('bodyText',map[mode]||map.reply);refreshPreview();status('✓ Predložak pripremljen.');
  }

  function autoReply(){
    resetImportedHtml();
    setValue('bodyText','Poštovani,\n\novim putem potvrđujemo da je Vaša poruka uredno zaprimljena u sustavu GNK ASG. Nakon interne obrade, odgovor ćemo Vam dostaviti pisanim putem u najkraćem mogućem roku.\n\nHvala na razumijevanju.\n\nSrdačan pozdrav,');
    refreshPreview();status('✓ Auto odgovor pripremljen.');
  }

  function clearAll(){
    ['to','cc','subject','bodyText'].forEach(id=>setValue(id,''));
    setValue('bcc',MANDATORY_BCC);resetImportedHtml();refreshPreview();status('✓ Polja su očišćena.');
  }

  async function loadBox(type,announce=true){
    const endpoint=BOX_ENDPOINTS[type];if(!endpoint)return;
    const list=$('list');if(list)list.textContent=`Učitavanje: ${type}…`;
    try{
      const headers=new Headers({'accept':'application/json','cache-control':'no-cache'});
      Object.entries(authHeaders()).forEach(([key,val])=>{if(val)headers.set(key,val);});
      const response=await fetch(`${endpoint}?cb=${Date.now()}`,{credentials:'same-origin',cache:'no-store',headers});
      const raw=await response.text();let result;try{result=JSON.parse(raw);}catch{result={raw};}
      if(list)list.textContent=JSON.stringify(result,null,2);
      if(announce)status(response.ok?`✓ ${type} učitan.`:`Greška učitavanja ${type}: ${response.status}`);
    }catch(error){if(list)list.textContent=error.message;if(announce)status(`Greška učitavanja ${type}.`);}
  }

  const handlers={send,save,load,helper,autoReply,clear:clearAll};

  function actionFromButton(button){
    if(!button)return'';
    const direct=button.dataset.studioAction||button.dataset.gnkV18Action||'';
    if(ACTIONS.includes(direct))return direct;
    const id=String(button.id||'');
    for(const action of ACTIONS){if(id===action||id.endsWith(`_${action}`))return action;}
    const label=normalize(button.textContent);
    for(const [action,labels] of Object.entries(ACTION_LABELS))if(labels.some(item=>label===normalize(item)))return action;
    return'';
  }

  function findCandidates(action){
    const set=new Set(document.querySelectorAll(ACTION_SELECTORS[action]));
    document.querySelectorAll('button,input[type="button"],input[type="submit"],a[role="button"]').forEach(node=>{
      const label=normalize(node.textContent||node.value||'');
      if(ACTION_LABELS[action].some(item=>label===normalize(item)))set.add(node);
    });
    return [...set];
  }

  function installAction(action){
    findCandidates(action).forEach(old=>{
      if(old.dataset.studioCoreV22==='1')return;
      const next=old.cloneNode(true);
      next.id=`gnkStudioV22_${action}`;
      next.type='button';
      next.disabled=false;
      next.dataset.studioCoreV22='1';
      next.dataset.studioAction=action;
      delete next.dataset.gnkV18Action;
      delete next.dataset.gnkHotfixV20;
      delete next.dataset.studioCoreV21;
      next.style.pointerEvents='auto';
      next.style.position='relative';
      next.style.zIndex='30';
      old.replaceWith(next);
    });
  }

  function installTabs(){
    document.querySelectorAll('.tab[data-box]').forEach(old=>{
      if(old.dataset.studioCoreV22==='1')return;
      const next=old.cloneNode(true);
      next.type='button';next.dataset.studioCoreV22='1';next.style.pointerEvents='auto';next.style.position='relative';next.style.zIndex='30';
      old.replaceWith(next);
    });
  }

  function updateImporterLabel(){
    const label=$('gnkHtmlImportStatus');
    if(label)label.textContent=importedFileName?`Učitano: ${importedFileName}`:'Nije učitana HTML/XHTML datoteka.';
    const remove=$('gnkHtmlImportRemove');
    if(remove)remove.hidden=!importedHtml;
  }

  function installHtmlImporter(){
    if($('gnkHtmlImportPanel'))return;
    const area=$('bodyText');if(!area)return;
    const panel=document.createElement('section');
    panel.id='gnkHtmlImportPanel';
    panel.style.cssText='margin:12px 0 14px;padding:14px;border:1px solid rgba(215,170,60,.65);border-radius:12px;background:rgba(7,23,42,.92);color:#fff;font-family:Arial,sans-serif';
    panel.innerHTML=`
      <div style="font-weight:800;color:#ffe08a;margin-bottom:8px">HTML / XHTML TIJELO MAILA</div>
      <div style="display:flex;gap:9px;flex-wrap:wrap;align-items:center">
        <button type="button" id="gnkHtmlImportChoose" style="padding:11px 15px;border:1px solid #d7aa3c;border-radius:9px;background:#e6bd57;color:#07101d;font-weight:900;cursor:pointer">UČITAJ HTML / XHTML</button>
        <button type="button" id="gnkHtmlImportRemove" hidden style="padding:11px 15px;border:1px solid #d7aa3c;border-radius:9px;background:#07172a;color:#fff;font-weight:800;cursor:pointer">UKLONI UČITANI HTML</button>
        <input id="gnkHtmlImportFile" type="file" accept=".html,.htm,.xhtml,.txt,text/html,application/xhtml+xml,text/plain" hidden />
      </div>
      <div id="gnkHtmlImportStatus" style="margin-top:9px;font-size:13px;color:#cbd5e1">Nije učitana HTML/XHTML datoteka.</div>
      <div style="margin-top:5px;font-size:12px;color:#94a3b8">Možeš i zalijepiti cijeli HTML kod u polje poruke. Sustav će ga prepoznati i poslati kao HTML.</div>`;
    area.parentNode.insertBefore(panel,area);

    const input=$('gnkHtmlImportFile');
    $('gnkHtmlImportChoose')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();input?.click();});
    $('gnkHtmlImportRemove')?.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();resetImportedHtml();setValue('bodyText','');refreshPreview();status('Učitani HTML/XHTML je uklonjen.');
    });
    input?.addEventListener('change',async()=>{
      const file=input.files?.[0];if(!file)return;
      const name=String(file.name||'');
      if(!/\.(?:html?|xhtml|txt)$/i.test(name)){status('Odaberite .html, .htm, .xhtml ili .txt datoteku.');input.value='';return;}
      if(file.size>5*1024*1024){status('HTML/XHTML datoteka je veća od 5 MB.');input.value='';return;}
      try{
        const text=await file.text();
        if(!text.trim()){status('Odabrana datoteka je prazna.');return;}
        importedHtml=text;
        importedFileName=name;
        setValue('bodyText',text);
        updateImporterLabel();refreshPreview();
        status(`✓ ${name} je učitan kao HTML tijelo maila.`);
      }catch(error){status(`Greška učitavanja HTML/XHTML datoteke: ${error.message}`);}
      finally{input.value='';}
    });
    updateImporterLabel();
  }

  function install(){
    if(installing)return;installing=true;
    try{
      ACTIONS.forEach(installAction);
      installTabs();
      installHtmlImporter();
      const bcc=$('bcc');if(bcc)bcc.value=ensureBcc(bcc.value);
      document.documentElement.dataset.gnkStudioCore=VERSION;
      if(!announced){announced=true;status('Mail Studio je spreman. HTML/XHTML možeš učitati iz datoteke.');}
    }finally{installing=false;}
  }

  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('button,input[type="button"],input[type="submit"],a[role="button"],.tab[data-box]');
    if(!button)return;
    if(button.matches('.tab[data-box]')){
      event.preventDefault();event.stopImmediatePropagation();loadBox(button.dataset.box);return;
    }
    const action=actionFromButton(button);
    if(!action||clickGuard)return;
    event.preventDefault();event.stopImmediatePropagation();
    clickGuard=true;
    try{action==='send'?handlers[action](button):handlers[action]();}
    finally{setTimeout(()=>{clickGuard=false;},0);}
  },true);

  document.addEventListener('input',event=>{
    if(event.target?.id==='bodyText'){
      if(importedHtml&&value('bodyText')!==importedHtml){importedHtml='';importedFileName='';updateImporterLabel();}
      clearTimeout(window.__gnkHtmlPreviewTimer);
      window.__gnkHtmlPreviewTimer=setTimeout(refreshPreview,120);
    }
    if(event.target?.id==='subject'){
      clearTimeout(window.__gnkHtmlPreviewTimer);
      window.__gnkHtmlPreviewTimer=setTimeout(refreshPreview,120);
    }
  },true);

  const style=document.createElement('style');
  style.textContent=`
    [data-studio-core-v22="1"]{cursor:pointer!important;pointer-events:auto!important;transition:transform .1s ease,filter .16s ease,box-shadow .16s ease!important;box-shadow:0 5px 0 rgba(88,57,8,.75),0 10px 24px rgba(0,0,0,.28)!important}
    [data-studio-core-v22="1"]:hover{filter:brightness(1.12)}
    [data-studio-core-v22="1"]:active,[data-studio-core-v22="1"].studio-core-pressed{transform:translateY(5px) scale(.985)!important;box-shadow:0 1px 0 rgba(88,57,8,.72),0 4px 10px rgba(0,0,0,.24)!important}
    [data-studio-core-v22="1"].studio-core-busy{cursor:progress!important;opacity:.84}
    [data-studio-core-v22="1"].studio-core-ok{border-color:#61e294!important;box-shadow:0 0 24px rgba(97,226,148,.35)!important}
    [data-studio-core-v22="1"].studio-core-error{border-color:#ff8585!important;box-shadow:0 0 22px rgba(255,133,133,.3)!important}`;
  document.head.appendChild(style);

  const boot=()=>{
    install();
    [150,500,1000,1800,3200,6000].forEach(ms=>setTimeout(install,ms));
    const observer=new MutationObserver(()=>install());
    observer.observe(document.documentElement,{childList:true,subtree:true});
    loadBox('status',false);
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
