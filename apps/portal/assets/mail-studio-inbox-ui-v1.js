(()=>{
  'use strict';
  const RELEASE='GNK_ASG_MAIL_STUDIO_INBOX_UI_V1_20260628';
  if(window.__GNK_ASG_MAIL_STUDIO_INBOX_UI__===RELEASE)return;
  window.__GNK_ASG_MAIL_STUDIO_INBOX_UI__=RELEASE;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const formatDate=value=>{try{return new Intl.DateTimeFormat('hr-HR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch{return String(value||'')}};
  const profileFor=key=>({media:'media',press:'media',legal:'legal',privacy:'legal',ubo:'legal',it:'it',assistant:'it',sefic:'director',director:'director'})[key]||'office';

  function installStyle(){
    if($('gnkMailInboxUiStyle'))return;
    const style=document.createElement('style');
    style.id='gnkMailInboxUiStyle';
    style.textContent='.gnk-inbox-summary{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:9px;color:#d1d5db}.gnk-inbox-items{display:grid;gap:9px}.gnk-inbox-card{border:1px solid rgba(214,173,79,.24);border-radius:14px;background:rgba(255,255,255,.055);padding:12px;color:#e5e7eb}.gnk-inbox-card__top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.gnk-inbox-card strong{color:#f4d37a}.gnk-inbox-card small{color:#9ca3af}.gnk-inbox-card p{margin:8px 0;color:#d1d5db;line-height:1.45}.gnk-inbox-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.gnk-inbox-meta span{border:1px solid rgba(214,173,79,.2);border-radius:999px;padding:5px 7px;font-size:10px}.gnk-inbox-reply{margin-top:9px;padding:7px 10px!important}.gnk-inbox-empty{padding:18px;text-align:center;color:#d1d5db}';
    document.head.appendChild(style);
  }

  function render(payload){
    const list=$('list');if(!list)return;
    const items=Array.isArray(payload?.items)?payload.items:[];
    list.style.whiteSpace='normal';
    list.innerHTML=`<div class="gnk-inbox-summary"><strong>Inbox · ${items.length}</strong><small>Kontakt forma</small></div>`+(items.length?`<div class="gnk-inbox-items">${items.map(item=>{
      const from=item.from||{},attachment=item.attachment||{};
      return `<article class="gnk-inbox-card"><div class="gnk-inbox-card__top"><div><strong>${esc(item.subject||'(bez predmeta)')}</strong><br><small>${esc(from.name||'')} · ${esc(from.email||'')}</small></div><small>${esc(formatDate(item.receivedAt))}</small></div><p>${esc(item.snippet||item.message||'')}</p><div class="gnk-inbox-meta"><span>${esc(item.caseId||'bez evidencijskog broja')}</span><span>${esc(item.mailboxLabel||item.mailboxKey||'odjel')}</span><span>${esc(item.status||'received')}</span>${attachment.filename?`<span>PDF · ${esc(attachment.filename)}</span>`:''}</div><button type="button" class="gnk-inbox-reply" data-inbox-reply="${esc(item.caseId||'')}" data-email="${esc(from.email||'')}" data-name="${esc(from.name||'')}" data-subject="${esc(item.subject||'')}" data-message="${esc(item.message||'')}" data-mailbox="${esc(item.mailboxKey||'')}">Pripremi odgovor</button></article>`;
    }).join('')}</div>`:'<div class="gnk-inbox-empty">Nema zaprimljenih upita.</div>');
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
    const email=button.dataset.email||'',name=button.dataset.name||'',subject=button.dataset.subject||'',message=button.dataset.message||'',mailbox=button.dataset.mailbox||'';
    if($('profile')){$('profile').value=profileFor(mailbox);$('profile').dispatchEvent(new Event('change',{bubbles:true}));}
    if($('to'))$('to').value=email;
    if($('subject')){$('subject').value=`Re: ${subject}`;$('subject').dispatchEvent(new Event('input',{bubbles:true}));}
    if($('bodyText')){$('bodyText').value='';$('bodyText').dispatchEvent(new Event('input',{bubbles:true}));$('bodyText').focus();}
    if($('aiRecipientName'))$('aiRecipientName').value=name;
    if($('aiRelation'))$('aiRelation').value=mailbox==='media'||mailbox==='press'?'medijski upit':'kontaktni upit';
    if($('aiContext'))$('aiContext').value=message;
    if($('aiGoal'))$('aiGoal').value='Pripremiti točan i profesionalan odgovor na zaprimljeni upit.';
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
