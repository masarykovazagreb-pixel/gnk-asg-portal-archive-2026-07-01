(()=>{
  'use strict';
  const RELEASE='GNK_ASG_MAIL_STUDIO_INBOX_UI_V3_PARSED_20260628';
  if(window.__GNK_ASG_MAIL_STUDIO_INBOX_UI__===RELEASE)return;
  window.__GNK_ASG_MAIL_STUDIO_INBOX_UI__=RELEASE;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const formatDate=value=>{try{return new Intl.DateTimeFormat('hr-HR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch{return String(value||'')}};
  const profileFor=key=>({media:'media',press:'media',legal:'legal',privacy:'legal',ubo:'legal',it:'it',assistant:'it',sefic:'director',director:'director'})[key]||'office';
  const inboxRecords=new Map();

  function installStyle(){
    if($('gnkMailInboxUiStyle'))return;
    const style=document.createElement('style');
    style.id='gnkMailInboxUiStyle';
    style.textContent='.gnk-inbox-summary{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:9px;color:#d1d5db}.gnk-inbox-items{display:grid;gap:9px}.gnk-inbox-card{border:1px solid rgba(214,173,79,.24);border-radius:14px;background:rgba(255,255,255,.055);padding:12px;color:#e5e7eb}.gnk-inbox-card__top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.gnk-inbox-card strong{color:#f4d37a}.gnk-inbox-card small{color:#9ca3af}.gnk-inbox-card p{margin:8px 0;color:#d1d5db;line-height:1.45;white-space:pre-wrap}.gnk-inbox-center{margin-top:8px;padding:8px 10px;border-left:3px solid #f4d37a;border-radius:9px;background:rgba(214,173,79,.08);color:#f6e5b2;font-size:11px;line-height:1.4}.gnk-inbox-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.gnk-inbox-meta span{border:1px solid rgba(214,173,79,.2);border-radius:999px;padding:5px 7px;font-size:10px}.gnk-inbox-meta .ok{border-color:rgba(49,212,124,.45);color:#bdf5d3}.gnk-inbox-meta .warn{border-color:rgba(245,158,11,.5);color:#fde68a}.gnk-inbox-reply{margin-top:9px;padding:7px 10px!important}.gnk-inbox-empty{padding:18px;text-align:center;color:#d1d5db}';
    document.head.appendChild(style);
  }

  function sourceLabel(item){
    return item.source==='direct-email-routing'?'Izravni e-mail':'Kontakt forma';
  }

  function render(payload){
    const list=$('list');if(!list)return;
    const items=Array.isArray(payload?.items)?payload.items:[];
    inboxRecords.clear();
    items.forEach(item=>inboxRecords.set(String(item.caseId||item.id||''),item));
    list.style.whiteSpace='normal';
    const contactCount=Number(payload?.sources?.contactForm||0);
    const directCount=Number(payload?.sources?.directEmail||0);
    list.innerHTML=`<div class="gnk-inbox-summary"><strong>Inbox · ${items.length}</strong><small>Kontakt ${contactCount} · E-mail ${directCount} · 10 centara</small></div>`+(items.length?`<div class="gnk-inbox-items">${items.map(item=>{
      const from=item.from||{},center=item.receivingCenter||{};
      const centerLabel=center.labelHr||[center.cityHr,center.countryHr,center.code].filter(Boolean).join(' · ');
      const sender=[from.name,from.email].filter(Boolean).join(' · ')||'Nepoznat pošiljatelj';
      const attachmentCount=Number(item.attachmentCount||0);
      const storedCount=Number(item.storedAttachmentCount||0);
      const parseClass=item.contentParsed?'ok':'warn';
      const parseLabel=item.contentParsed?'Sadržaj obrađen':'Samo metapodaci';
      return `<article class="gnk-inbox-card"><div class="gnk-inbox-card__top"><div><strong>${esc(item.subject||'(bez predmeta)')}</strong><br><small>${esc(sender)}</small></div><small>${esc(formatDate(item.receivedAt))}</small></div><p>${esc(item.snippet||item.message||'Poruka nema tekstualni sadržaj.')}</p>${centerLabel?`<div class="gnk-inbox-center">Zaprimljeno putem: ${esc(centerLabel)}</div>`:''}<div class="gnk-inbox-meta"><span>${esc(sourceLabel(item))}</span><span>${esc(item.caseId||'bez evidencijskog broja')}</span><span>${esc(item.mailboxLabel||item.mailboxKey||'odjel')}</span><span>${esc(item.status||'received')}</span><span class="${parseClass}">${parseLabel}</span>${attachmentCount?`<span>PDF ${storedCount}/${attachmentCount}</span>`:''}</div><button type="button" class="gnk-inbox-reply" data-inbox-reply="${esc(item.caseId||item.id||'')}">Pripremi odgovor</button></article>`;
    }).join('')}</div>`:'<div class="gnk-inbox-empty">Nema zaprimljenih poruka.</div>');
  }

  async function loadInbox(){
    const list=$('list');if(list){list.style.whiteSpace='normal';list.textContent='Učitavanje Inboxa…';}
    const status=$('status');if(status)status.textContent='Učitavanje Inboxa…';
    try{
      const response=await fetch(`/api/mail-center/inbox?limit=50&cb=${Date.now()}`,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json','cache-control':'no-cache'}});
      const payload=await response.json().catch(()=>({items:[]}));
      if(!response.ok)throw new Error(payload.error||`HTTP ${response.status}`);
      render(payload);
      if(status)status.textContent=`Inbox učitan · ${payload.count||0} poruka.`;
    }catch(error){
      if(list)list.textContent=`Inbox nije učitan: ${error.message}`;
      if(status)status.textContent='Greška učitavanja Inboxa.';
    }
  }

  function prepareReply(button){
    const item=inboxRecords.get(String(button.dataset.inboxReply||''));
    if(!item)return;
    const from=item.from||{},email=from.email||'',name=from.name||'',subject=item.subject||'',message=item.message||item.snippet||'',mailbox=item.mailboxKey||'',center=item.receivingCenter?.labelHr||'';
    if($('profile')){$('profile').value=profileFor(mailbox);$('profile').dispatchEvent(new Event('change',{bubbles:true}));}
    if($('to'))$('to').value=email;
    if($('subject')){$('subject').value=`Re: ${subject}`;$('subject').dispatchEvent(new Event('input',{bubbles:true}));}
    if($('bodyText')){$('bodyText').value='';$('bodyText').dispatchEvent(new Event('input',{bubbles:true}));$('bodyText').focus();}
    if($('aiRecipientName'))$('aiRecipientName').value=name||email;
    if($('aiRelation'))$('aiRelation').value=mailbox==='media'||mailbox==='press'?'novinar / medijski upit':'kontaktni upit';
    if($('aiContext'))$('aiContext').value=[message,center?`Digitalni centar zaprimanja: ${center}`:'',`Evidencijski broj: ${item.caseId||''}`].filter(Boolean).join('\n\n');
    if($('aiGoal'))$('aiGoal').value='Pripremiti točan i profesionalan odgovor na zaprimljeni upit, uz korektno navođenje centra zaprimanja.';
    const status=$('status');if(status)status.textContent='Odgovor je pripremljen za uređivanje. Ništa nije poslano.';
    document.querySelector('.compose')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function boot(){
    installStyle();
    document.addEventListener('click',event=>{
      const inboxTab=event.target.closest?.('.tab[data-box="inbox"]');
      if(inboxTab){event.preventDefault();event.stopImmediatePropagation();loadInbox();return;}
      const reply=event.target.closest?.('[data-inbox-reply]');
      if(reply){event.preventDefault();prepareReply(reply);}
    },true);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();
