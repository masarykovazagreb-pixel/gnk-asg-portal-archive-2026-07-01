(() => {
  'use strict';
  if (window.__GNK_ASG_MEDIA_KIT_V1__) return;
  window.__GNK_ASG_MEDIA_KIT_V1__ = true;

  const MANIFEST='/data/media-kit-manifest-v1.json';
  const app=document.getElementById('app');
  const toast=document.getElementById('toast');
  const state={language:'hr',manifest:null,selected:'corporate',objectUrls:[]};
  const text={
    hr:{heroKicker:'SLUŽBENI PRESS RESURSI',heroTitle:'Tri profesionalna media kita. Jedan službeni izvor.',heroLead:'Korporativni profil, tehnološki portfelj i New York 2026 press paket objedinjeni su u verificiranom, dvojezičnom centru za urednike, novinare i produkcijske timove.',heroBrowse:'Otvori media kitove',heroPrint:'Ispis / PDF',heroCopy:'Kopiraj službeni opis',verified:'Verificirani sadržaj',localTime:'lokalno vrijeme',eventRule:'Pristup je isključivo po pozivu i nakon ljudske provjere prijave.',eventApply:'Otvori prijavno sučelje',proofKits:'specijalizirana kita',proofLanguages:'jezika',proofSource:'službeni izvor',proofHuman:'ljudska kontrola',kitsKicker:'ODABERITE PAKET',kitsTitle:'Media kit prema vrsti redakcije i priče',kitsLead:'Svaki paket sadrži odobrene poruke, ključne činjenice, resurse i pravila uporabe.',printKit:'Ispis / PDF kita',downloadData:'Preuzmi podatke',contactTeam:'Kontaktiraj Media Relations',profileTitle:'Profil grupe',messagesTitle:'Odobrene ključne poruke',eventTitle:'New York 2026',travelTitle:'Put i smještaj',assetsTitle:'Službeni vizuali i resursi',documentsTitle:'Verificirani dokumenti',contactKicker:'SLUŽBENI KONTAKT',contactText:'Za potvrdu činjenica, intervjue, prava uporabe i produkcijske zahtjeve.',rulesKicker:'PRAVILA UPORABE',visualCaption:'Službeni urednički vizual. Izvor: GNK ASG.',checklistKicker:'PRIJE OBJAVE',checkFacts:'Provjerene ključne činjenice',checkCredit:'Naveden izvor GNK ASG',checkVisual:'Vizual nije mijenjan',checkSensitive:'Osjetljivi navodi potvrđeni s Media Relations',travelPaidTitle:'Odobreni putni troškovi',travelPaidText:'GNK ASG snosi unaprijed odobrene troškove puta za odobrenog predstavnika redakcije.',hotelTitle:'Smještaj',hotelText:'Smještaj u New Yorku organizira i plaća organizator.',ticketTitle:'Ne kupujte kartu unaprijed',ticketText:'Karta se kupuje tek nakon pisanog odobrenja GNK ASG-a.',passportTitle:'Zaštita podataka',passportText:'Preslika putovnice ne šalje se običnim e-mailom niti kroz početnu prijavu.',copyText:'Kopiraj tekst',openResource:'Otvori',downloadAsset:'Preuzmi',officialContact:'Službeni kontakt',audience:'Namijenjeno',copied:'Tekst je kopiran.',downloaded:'Podaci su pripremljeni za preuzimanje.',loadError:'Media kit trenutačno nije moguće učitati.'},
    en:{heroKicker:'OFFICIAL PRESS RESOURCES',heroTitle:'Three professional media kits. One official source.',heroLead:'The corporate profile, technology portfolio and New York 2026 press package are unified in a verified bilingual center for editors, journalists and production teams.',heroBrowse:'Browse media kits',heroPrint:'Print / PDF',heroCopy:'Copy official boilerplate',verified:'Verified content',localTime:'local time',eventRule:'Access is invitation-only and subject to human application verification.',eventApply:'Open application portal',proofKits:'specialized kits',proofLanguages:'languages',proofSource:'official source',proofHuman:'human approval control',kitsKicker:'CHOOSE A PACKAGE',kitsTitle:'A media kit for each newsroom and story type',kitsLead:'Each package includes approved messages, key facts, resources and usage rules.',printKit:'Print / PDF kit',downloadData:'Download data',contactTeam:'Contact Media Relations',profileTitle:'Group profile',messagesTitle:'Approved key messages',eventTitle:'New York 2026',travelTitle:'Travel and accommodation',assetsTitle:'Official visuals and resources',documentsTitle:'Verified documents',contactKicker:'OFFICIAL CONTACT',contactText:'For fact verification, interviews, usage rights and production requests.',rulesKicker:'USAGE RULES',visualCaption:'Official editorial visual. Source: GNK ASG.',checklistKicker:'BEFORE PUBLISHING',checkFacts:'Key facts verified',checkCredit:'GNK ASG credited as source',checkVisual:'Visual has not been altered',checkSensitive:'Sensitive statements confirmed with Media Relations',travelPaidTitle:'Approved travel costs',travelPaidText:'GNK ASG covers pre-approved travel costs for the approved newsroom representative.',hotelTitle:'Accommodation',hotelText:'Accommodation in New York is arranged and paid by the organizer.',ticketTitle:'Do not purchase a ticket in advance',ticketText:'A ticket may be purchased only after written GNK ASG approval.',passportTitle:'Data protection',passportText:'A passport copy must not be sent by ordinary email or through the initial application.',copyText:'Copy text',openResource:'Open',downloadAsset:'Download',officialContact:'Official contact',audience:'Audience',copied:'Text copied.',downloaded:'Data prepared for download.',loadError:'The media kit cannot be loaded at this time.'}
  };

  const t=key=>text[state.language][key]||text.hr[key]||key;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function showToast(message){if(!toast)return;toast.textContent=message;toast.hidden=false;clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>{toast.hidden=true;},2800);}
  function setLanguage(language){state.language=language;document.documentElement.lang=language;document.getElementById('languageToggle').textContent=language==='hr'?'EN':'HR';document.querySelectorAll('[data-i18n]').forEach(node=>{const key=node.dataset.i18n;if(text[language][key])node.textContent=text[language][key];});render();}

  async function decodeAsset(path){
    const response=await fetch(path,{cache:'force-cache'});
    if(!response.ok)throw new Error(`HTTP_${response.status}`);
    const encoded=(await response.text()).replace(/\s+/g,'');
    const binary=atob(encoded);
    const bytes=new Uint8Array(binary.length);
    for(let index=0;index<binary.length;index+=1)bytes[index]=binary.charCodeAt(index);
    const url=URL.createObjectURL(new Blob([bytes],{type:'image/webp'}));
    state.objectUrls.push(url);
    return url;
  }

  function shell(){
    app.innerHTML=`
      <section class="media-hero"><div><p class="eyebrow" data-i18n="heroKicker">${t('heroKicker')}</p><h1 data-i18n="heroTitle">${t('heroTitle')}</h1><p class="hero-lead" data-i18n="heroLead">${t('heroLead')}</p><div class="hero-actions"><a class="button primary" href="#kits" data-i18n="heroBrowse">${t('heroBrowse')}</a><button id="printOverview" class="button" type="button" data-i18n="heroPrint">${t('heroPrint')}</button><button id="copyBoilerplate" class="button" type="button" data-i18n="heroCopy">${t('heroCopy')}</button></div><div class="hero-verification"><span></span><div><strong data-i18n="verified">${t('verified')}</strong><small id="manifestVersion"></small></div></div></div><aside><div class="event-date"><span>NEW YORK</span><strong>07.10.2026</strong></div><div class="event-time"><strong>11:30</strong><span data-i18n="localTime">${t('localTime')}</span></div><p data-i18n="eventRule">${t('eventRule')}</p><a href="/media-application/" data-i18n="eventApply">${t('eventApply')}</a></aside></section>
      <section class="media-proof"><article><strong>3</strong><span data-i18n="proofKits">${t('proofKits')}</span></article><article><strong>2</strong><span data-i18n="proofLanguages">${t('proofLanguages')}</span></article><article><strong>1</strong><span data-i18n="proofSource">${t('proofSource')}</span></article><article><strong>100%</strong><span data-i18n="proofHuman">${t('proofHuman')}</span></article></section>
      <section id="kits" class="kit-selector"><div class="section-heading"><p class="eyebrow" data-i18n="kitsKicker">${t('kitsKicker')}</p><h2 data-i18n="kitsTitle">${t('kitsTitle')}</h2><p data-i18n="kitsLead">${t('kitsLead')}</p></div><div id="kitCards" class="kit-cards"></div></section>
      <section id="kitWorkspace" class="kit-workspace"><div class="workspace-head"><div><p class="eyebrow">MEDIA KIT</p><h2 id="workspaceTitle"></h2><p id="workspaceSubtitle"></p></div><div class="workspace-actions"><button id="printSelectedKit" type="button">${t('printKit')}</button><button id="downloadManifest" type="button">${t('downloadData')}</button><a href="mailto:media@gnk-asg.hr">${t('contactTeam')}</a></div></div><div id="workspaceBody" class="workspace-grid"></div></section>
      <section class="verified-docs"><div class="section-heading"><p class="eyebrow">VERIFIED DOCUMENTS</p><h2>${t('documentsTitle')}</h2></div><div class="document-grid"><a href="/documents/GNK_ASG_doo_Audited_Financial_Statements_2025_HR.pdf" download><strong>GNK ASG d.o.o.</strong><span>Audited Financial Statements 2025</span></a><a href="/documents/GNK_DINAMO_Ltd_Consolidated_Financial_Report_2025_USA.pdf" download><strong>GNK DINAMO Ltd.</strong><span>Consolidated Financial Report FY 2025</span></a><a href="/documents/GNK_DINAMO_Ltd_Certificate_of_Good_Standing_2026.pdf" download><strong>Colorado</strong><span>Certificate of Good Standing 2026</span></a></div></section>`;
  }

  function kitCards(){
    const cards=document.getElementById('kitCards');
    cards.replaceChildren(...state.manifest.kits.sort((a,b)=>a.order-b.order).map((kit,index)=>{
      const button=document.createElement('button');
      button.type='button';button.className=`kit-card ${kit.accent}${kit.id===state.selected?' active':''}`;button.dataset.kit=kit.id;
      button.innerHTML=`<span class="kit-index">0${index+1}</span><h3>${esc(state.language==='hr'?kit.titleHr:kit.titleEn)}</h3><p>${esc(state.language==='hr'?kit.subtitleHr:kit.subtitleEn)}</p><small>${esc(t('audience'))}: ${esc(state.language==='hr'?kit.audienceHr:kit.audienceEn)}</small>`;
      button.addEventListener('click',()=>{state.selected=kit.id;render();document.getElementById('kitWorkspace').scrollIntoView({behavior:'smooth',block:'start'});});
      return button;
    }));
  }

  function assetCard(asset){
    const article=document.createElement('article');article.className='asset-card';
    const label=state.language==='hr'?asset.labelHr:asset.labelEn;
    article.innerHTML=`<strong>${esc(label)}</strong><small>${esc(asset.format)} · ${esc(asset.usage)}</small><div class="asset-actions"></div>`;
    const actions=article.querySelector('.asset-actions');
    const open=document.createElement('a');open.href=asset.path;open.target='_blank';open.rel='noopener';open.textContent=t('openResource');actions.appendChild(open);
    if(asset.format==='WEBP_BASE64'){
      const download=document.createElement('button');download.type='button';download.textContent=t('downloadAsset');download.addEventListener('click',async()=>{try{const url=await decodeAsset(asset.path);const link=document.createElement('a');link.href=url;link.download=`GNK_ASG_${asset.id}_2026.webp`;link.click();}catch{showToast(t('loadError'));}});actions.appendChild(download);
    }
    return article;
  }

  async function featuredVisual(){
    const image=document.getElementById('featuredVisual');
    if(!image)return;
    try{image.src=await decodeAsset(state.selected==='new-york'?'/assets/the-code-visual-02.b64':'/assets/the-code-visual-01.b64');}catch{image.remove();}
  }

  function workspace(){
    const kit=state.manifest.kits.find(item=>item.id===state.selected)||state.manifest.kits[0];
    document.getElementById('workspaceTitle').textContent=state.language==='hr'?kit.titleHr:kit.titleEn;
    document.getElementById('workspaceSubtitle').textContent=state.language==='hr'?kit.subtitleHr:kit.subtitleEn;
    const messages=state.manifest.approvedMessages[state.language];
    const rules=state.manifest.usageRules[state.language];
    const boilerplate=state.manifest.boilerplate[state.language];
    const body=document.getElementById('workspaceBody');
    body.innerHTML=`<article class="workspace-main"><section class="kit-block"><div class="block-heading"><span>01</span><h3>${t('profileTitle')}</h3></div><p class="boilerplate" id="boilerplateText">${esc(boilerplate)}</p><button class="inline-action" id="copyBoilerplateInline" type="button">${t('copyText')}</button></section><section class="kit-block"><div class="block-heading"><span>02</span><h3>${t('messagesTitle')}</h3></div><ol class="message-list">${messages.map(message=>`<li>${esc(message)}</li>`).join('')}</ol></section><section class="kit-block"><div class="block-heading"><span>03</span><h3>${t('eventTitle')}</h3></div><div class="event-grid"><div><small>Date</small><strong>07.10.2026</strong></div><div><small>Time</small><strong>11:30</strong></div><div><small>City</small><strong>New York</strong></div><div><small>Access</small><strong>Invitation only</strong></div></div></section><section class="kit-block"><div class="block-heading"><span>04</span><h3>${t('travelTitle')}</h3></div><div class="policy-list"><article><strong>${t('travelPaidTitle')}</strong><p>${t('travelPaidText')}</p></article><article><strong>${t('hotelTitle')}</strong><p>${t('hotelText')}</p></article><article class="warning"><strong>${t('ticketTitle')}</strong><p>${t('ticketText')}</p></article><article><strong>${t('passportTitle')}</strong><p>${t('passportText')}</p></article></div></section><section class="kit-block"><div class="block-heading"><span>05</span><h3>${t('assetsTitle')}</h3></div><div id="assetGrid" class="asset-grid"></div></section></article><aside class="workspace-side"><section class="side-card"><p class="eyebrow">${t('contactKicker')}</p><h3>GNK ASG Media Relations</h3><a href="mailto:media@gnk-asg.hr">media@gnk-asg.hr</a><p>${t('contactText')}</p></section><section class="side-card"><p class="eyebrow">${t('rulesKicker')}</p><ul class="rule-list">${rules.map(rule=>`<li>${esc(rule)}</li>`).join('')}</ul></section><section class="side-card visual-card"><div class="visual-frame"><img id="featuredVisual" alt="GNK ASG official media visual"></div><p>${t('visualCaption')}</p></section><section class="side-card checklist-card"><p class="eyebrow">${t('checklistKicker')}</p><label><input type="checkbox"><span>${t('checkFacts')}</span></label><label><input type="checkbox"><span>${t('checkCredit')}</span></label><label><input type="checkbox"><span>${t('checkVisual')}</span></label><label><input type="checkbox"><span>${t('checkSensitive')}</span></label></section></aside>`;
    const grid=document.getElementById('assetGrid');grid.replaceChildren(...state.manifest.assets.map(assetCard));
    document.getElementById('copyBoilerplateInline').addEventListener('click',()=>copyText(boilerplate));
    featuredVisual();
  }

  function copyText(value){navigator.clipboard?.writeText(value).then(()=>showToast(t('copied'))).catch(()=>showToast(t('loadError')));}
  function downloadManifest(){const blob=new Blob([JSON.stringify(state.manifest,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`GNK_ASG_Media_Kit_2026_${state.language.toUpperCase()}.json`;link.click();URL.revokeObjectURL(url);showToast(t('downloaded'));}
  function bind(){
    document.getElementById('languageToggle').onclick=()=>setLanguage(state.language==='hr'?'en':'hr');
    document.getElementById('printOverview').onclick=()=>window.print();
    document.getElementById('printSelectedKit').onclick=()=>window.print();
    document.getElementById('copyBoilerplate').onclick=()=>copyText(state.manifest.boilerplate[state.language]);
    document.getElementById('downloadManifest').onclick=downloadManifest;
  }
  function render(){if(!state.manifest)return;shell();document.getElementById('manifestVersion').textContent=`${state.manifest.version} · ${new Date(state.manifest.updatedAt).toLocaleDateString(state.language==='hr'?'hr-HR':'en-US')}`;kitCards();workspace();bind();document.querySelectorAll('[data-i18n]').forEach(node=>{const key=node.dataset.i18n;if(text[state.language][key])node.textContent=text[state.language][key];});}
  async function boot(){try{const response=await fetch(MANIFEST,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP_${response.status}`);state.manifest=await response.json();render();}catch(error){app.innerHTML=`<section class="loading-state"><h1>GNK ASG Media Kit Center</h1><p>${esc(t('loadError'))}</p><a class="button primary" href="mailto:media@gnk-asg.hr">media@gnk-asg.hr</a></section>`;console.error(error);}}
  window.addEventListener('beforeunload',()=>state.objectUrls.forEach(URL.revokeObjectURL));
  boot();
})();
