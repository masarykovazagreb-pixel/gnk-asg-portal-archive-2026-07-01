(() => {
  'use strict';
  if(window.__GNK_ASG_MAIL_PROFILE_TEST_V2__)return;
  window.__GNK_ASG_MAIL_PROFILE_TEST_V2__=true;
  window.__GNK_ASG_MAIL_PROFILE_TEST_V1__=true;

  const expected={office:'office@gnk-asg.hr',legal:'legal@gnk-asg.hr',media:'media@gnk-asg.hr',it:'it@gnk-asg.hr',director:'nermin.sefic@gnk-asg.hr'};
  const phone='+385 (0) 916104398';
  const waUrl='https://wa.me/385916104398';
  const waIcon='<svg aria-label="WhatsApp" viewBox="0 0 24 24" width="1em" height="1em" style="display:inline-block;vertical-align:-0.15em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z"/><path d="M9.1 8.2c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.6.8c-.1.2-.1.4 0 .6.5.9 1.2 1.6 2.1 2.1.2.1.4.1.6 0l.8-.6c.2-.2.5-.2.7-.1l1.8.8c.3.1.4.3.4.5v.5c0 .3 0 .5-.4.7-.5.3-1.2.6-2 .5-1.3-.1-3.3-.8-5.2-2.7-1.9-1.9-2.6-3.9-2.7-5.2 0-.8.2-1.5.5-2Z"/></svg>';
  const contactHtml=`<span class="gnk-signature-contact" style="display:inline-flex;align-items:center;gap:.28em;font-size:1em;line-height:1.35">☎ ${phone} <a href="${waUrl}" target="_blank" rel="noopener" aria-label="WhatsApp" style="display:inline-flex;align-items:center;color:inherit;text-decoration:none;font-size:1em">${waIcon}</a></span>`;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const nativeFetch=window.fetch.bind(window);
  let deliveryStatus=null;

  function normalizeSignatureHtml(value){
    let html=String(value||'')
      .replace(/(?:Telefon|Kontakt):\s*(?:\+385\s*91\s*535\s*8365|091\s*535\s*8365)/gi,contactHtml)
      .replace(/\+385\s*91\s*535\s*8365|091\s*535\s*8365/g,phone);
    if(/class=["'][^"']*signature/i.test(html)&&!html.includes(phone))html=html.replace(/<\/div>\s*$/i,`<br>${contactHtml}</div>`);
    return html;
  }
  function patchSignatures(){
    document.querySelectorAll('.signature').forEach(node=>{
      let html=normalizeSignatureHtml(node.outerHTML);
      if(!html.includes(phone))html=html.replace(/<\/div>\s*$/i,`<br>${contactHtml}</div>`);
      if(html===node.outerHTML)return;
      const holder=document.createElement('div');holder.innerHTML=html;
      const replacement=holder.firstElementChild;if(replacement)node.replaceWith(replacement);
    });
  }

  window.fetch=(input,init={})=>{
    try{
      const url=new URL(typeof input==='string'?input:input.url,location.origin);
      if(url.origin===location.origin&&url.pathname==='/api/admin-mail-send'&&typeof init.body==='string'){
        const payload=JSON.parse(init.body);
        for(const key of ['html','bodyHtml','htmlBody','messageHtml','contentHtml','body']){
          if(typeof payload[key]==='string')payload[key]=normalizeSignatureHtml(payload[key]);
        }
        init={...init,body:JSON.stringify(payload)};
      }
    }catch(_){ }
    return nativeFetch(input,init);
  };

  function ensureUi(){
    if($('mailProfileTest'))return;
    const side=document.querySelector('.side');if(!side)return;
    const panel=document.createElement('div');panel.className='panel';panel.id='mailProfileTest';
    panel.innerHTML=`
      <h3>Provjera Mail Studija</h3>
      <p class="small">Prvo provjerite profile i kontrole bez slanja. Zatim, samo kada je testni kanal otključan, možete poslati točno pet internih poruka na jednu allowlistanu adresu.</p>
      <div class="mail-test-section">
        <strong>1. Provjera bez slanja</strong>
        <button id="mailProfileTestRun" type="button">Testiraj svih 5 profila</button>
        <div id="mailProfileTestSummary" class="mail-test-summary">Test još nije pokrenut.</div>
        <div id="mailProfileTestResults" class="mail-test-results"></div>
      </div>
      <div class="mail-test-section">
        <strong>2. Interna provjera isporuke</strong>
        <div id="mailDeliveryGate" class="mail-test-summary">Učitavanje statusa testnog kanala…</div>
        <label class="mail-test-label">Interna adresa primatelja
          <input id="mailDeliveryRecipient" type="email" autocomplete="email" placeholder="ime@domena.hr">
        </label>
        <label class="mail-test-confirm"><input id="mailDeliveryConfirm" type="checkbox"> Potvrđujem slanje pet zasebnih internih testnih poruka: Office, Legal, Media, IT i Direktor.</label>
        <button id="mailDeliverySend" type="button" disabled>Pošalji 5 internih testova</button>
        <div id="mailDeliverySummary" class="mail-test-summary">Nijedna testna poruka nije poslana.</div>
        <div id="mailDeliveryResults" class="mail-test-results"></div>
      </div>
      <div class="mail-test-section">
        <strong>Nedavne evidencije</strong>
        <div id="mailDeliveryRecent" class="mail-test-results"><div class="mail-test-item warn"><span>Nema učitanih zapisa.</span></div></div>
      </div>`;
    side.appendChild(panel);
    const style=document.createElement('style');style.id='mailProfileTestStyle';style.textContent=`
      .mail-test-section{margin-top:11px;padding-top:10px;border-top:1px solid rgba(214,173,79,.2)}
      .mail-test-section>strong{display:block;margin-bottom:7px;color:#f4d37a;font-size:11px}
      .mail-test-summary{margin-top:8px;padding:9px;border-radius:10px;background:rgba(0,0,0,.18);font-size:10px;line-height:1.45}
      .mail-test-summary.ok{border:1px solid rgba(101,228,156,.45);color:#b9f5d1}.mail-test-summary.warn{border:1px solid rgba(244,211,122,.45);color:#f4d37a}.mail-test-summary.bad{border:1px solid rgba(255,133,133,.45);color:#ffb0b0}
      .mail-test-results{display:grid;gap:7px;margin-top:8px}.mail-test-item{padding:8px;border:1px solid rgba(214,173,79,.22);border-radius:10px;background:rgba(255,255,255,.04);font-size:10px}.mail-test-item strong,.mail-test-item span{display:block}.mail-test-item span{margin-top:3px;color:#d1d5db;overflow-wrap:anywhere}.mail-test-item.ok strong{color:#65e49c}.mail-test-item.warn strong{color:#f4d37a}.mail-test-item.bad strong{color:#ff8585}
      .mail-test-label{display:block;margin:9px 0;color:#e5e7eb;font-size:10px;font-weight:800}.mail-test-label input{display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:8px;border:1px solid rgba(214,173,79,.35);border-radius:8px;background:#fff;color:#111827}
      .mail-test-confirm{display:flex;align-items:flex-start;gap:7px;margin:9px 0;color:#e5e7eb;font-size:10px;line-height:1.45}.mail-test-confirm input{margin-top:2px}
      #mailDeliverySend:disabled{opacity:.45;cursor:not-allowed}`;
    document.head.appendChild(style);
  }

  async function requestJson(path,options={}){
    const response=await nativeFetch(path,{credentials:'same-origin',cache:'no-store',...options,headers:{accept:'application/json',...(options.headers||{})}});
    const data=await response.json().catch(()=>({ok:false,error:`HTTP_${response.status}`}));
    if(!response.ok&&response.status!==207){const error=new Error(data.error||`HTTP_${response.status}`);error.payload=data;error.status=response.status;throw error;}
    return{response,data};
  }
  async function endpoint(path){
    try{const {response}=await requestJson(`${path}${path.includes('?')?'&':'?'}cb=${Date.now()}`);return{ok:response.ok,status:response.status};}
    catch(error){return{ok:false,status:error.status||0,error:error.message};}
  }
  function item(label,ok,detail,warn=false){return`<div class="mail-test-item ${ok?'ok':warn?'warn':'bad'}"><strong>${ok?'✓':'!'} ${esc(label)}</strong><span>${esc(detail)}</span></div>`;}

  async function runLocalTest(){
    const button=$('mailProfileTestRun'),results=$('mailProfileTestResults'),summary=$('mailProfileTestSummary');
    button.disabled=true;summary.className='mail-test-summary';summary.textContent='Provjera u tijeku…';results.innerHTML='';
    const original={profile:$('profile')?.value,from:$('from')?.value,fromName:$('fromName')?.value,subject:$('subject')?.value,body:$('bodyText')?.value};
    const rows=[];let passed=0,total=0;
    for(const [profile,address] of Object.entries(expected)){
      total+=1;const option=$('profile')?.querySelector(`option[value="${profile}"]`);
      if(!option){rows.push(item(profile,false,'Profil ne postoji.'));continue;}
      $('profile').value=profile;$('profile').dispatchEvent(new Event('change',{bubbles:true}));
      await new Promise(resolve=>setTimeout(resolve,60));patchSignatures();
      const from=String($('from')?.value||'').toLowerCase();const signature=String($('preview')?.innerHTML||'');
      const fromOk=from===address;const signatureOk=/GNK ASG|Nermin Sefić|Osobni digitalni asistent/i.test(signature)&&signature.includes(phone)&&signature.includes('wa.me/385916104398');
      const ok=fromOk&&signatureOk;if(ok)passed+=1;
      rows.push(item(option.textContent.trim(),ok,`From: ${from||'nedostaje'} · potpis ${signatureOk?'ispravan':'nije potpun'}`));
    }
    $('profile').value=original.profile||'office';$('profile').dispatchEvent(new Event('change',{bubbles:true}));
    if($('from'))$('from').value=original.from||$('from').value;if($('fromName'))$('fromName').value=original.fromName||$('fromName').value;
    if($('subject'))$('subject').value=original.subject||'';if($('bodyText'))$('bodyText').value=original.body||'';
    $('bodyText')?.dispatchEvent(new Event('input',{bubbles:true}));patchSignatures();
    const [auth,status]=await Promise.all([endpoint('/api/operator-auth-check'),endpoint('/api/mail-center/status')]);
    total+=4;const authOk=auth.ok,statusOk=status.ok,tabsOk=document.querySelectorAll('.tab[data-box]').length>=4,controlsOk=['send','save','load','helper','autoReply','clear'].every(id=>Boolean($(id)&&!$(id).disabled));
    if(authOk)passed+=1;if(statusOk)passed+=1;if(tabsOk)passed+=1;if(controlsOk)passed+=1;
    rows.push(item('Sigurna sesija',authOk,`HTTP ${auth.status}`,auth.status===401||auth.status===403));
    rows.push(item('Mail status API',statusOk,`HTTP ${status.status}`,status.status===401||status.status===403));
    rows.push(item('Inbox / Sent / Outbox / Status',tabsOk,`${document.querySelectorAll('.tab[data-box]').length} pretinca`));
    rows.push(item('Kontrole poruke',controlsOk,controlsOk?'Sve kontrole su aktivne.':'Jedna ili više kontrola nije dostupna.'));
    results.innerHTML=rows.join('');summary.textContent=`Rezultat: ${passed}/${total} provjera prošlo. Nijedna poruka nije poslana.`;
    summary.classList.add(passed===total?'ok':'warn');button.disabled=false;
  }

  function updateSendButton(){
    const email=String($('mailDeliveryRecipient')?.value||'').trim();
    const confirmed=Boolean($('mailDeliveryConfirm')?.checked);
    const ready=Boolean(deliveryStatus?.testLive&&deliveryStatus?.emailBindingConfigured&&deliveryStatus?.allowlistedRecipients>0);
    if($('mailDeliverySend'))$('mailDeliverySend').disabled=!(ready&&confirmed&&email);
  }
  function renderRecent(items){
    const node=$('mailDeliveryRecent');if(!node)return;
    if(!Array.isArray(items)||!items.length){node.innerHTML='<div class="mail-test-item warn"><span>Nema ranijih profilnih testova.</span></div>';return;}
    node.innerHTML=items.slice(0,15).map(row=>item(row.profile_id,row.status==='SENT',`${row.sender_email} → ${row.recipient} · ${row.status} · ${row.created_at}`,row.status!=='SENT')).join('');
  }
  async function loadDeliveryStatus(){
    const gate=$('mailDeliveryGate');
    try{
      const {data}=await requestJson(`/api/mail-center/profile-test-status?cb=${Date.now()}`);deliveryStatus=data;
      const ready=data.testLive&&data.emailBindingConfigured&&data.allowlistedRecipients>0;
      gate.className=`mail-test-summary ${ready?'ok':'warn'}`;
      gate.textContent=ready?`Testni kanal je spreman · ${data.allowlistedRecipients} allowlistana adresa · 5 profila.`:`Testni kanal je zaključan ili nema allowliste. Test live: ${data.testLive?'DA':'NE'} · EMAIL binding: ${data.emailBindingConfigured?'DA':'NE'} · allowlista: ${data.allowlistedRecipients||0}.`;
      renderRecent(data.recent);updateSendButton();
    }catch(error){
      deliveryStatus=null;gate.className='mail-test-summary bad';gate.textContent=error.status===401||error.status===403?'Za profilni delivery test potrebna je aktivna sigurna sesija.':`Status nije dostupan: ${error.message}`;updateSendButton();
    }
  }
  async function sendDeliveryTests(){
    const button=$('mailDeliverySend'),summary=$('mailDeliverySummary'),results=$('mailDeliveryResults');
    const recipient=String($('mailDeliveryRecipient')?.value||'').trim();
    button.disabled=true;summary.className='mail-test-summary';summary.textContent='Slanje pet internih testova…';results.innerHTML='';
    try{
      const {data}=await requestJson('/api/mail-center/profile-test',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({recipient,confirm:'SEND_PROFILE_TESTS'})});
      results.innerHTML=(data.results||[]).map(row=>item(row.profile,row.status==='SENT',`${row.from} · ${row.status}${row.messageId?` · ${row.messageId}`:''}${row.audit?.logged===false?' · upozorenje: evidencija nije spremljena':''}`,row.status!=='SENT')).join('');
      summary.className=`mail-test-summary ${data.sent===5?'ok':'warn'}`;summary.textContent=`Batch ${data.batchId}: poslano ${data.sent}/5, neuspjelo ${data.failed}, upozorenja evidencije ${data.auditWarnings||0}.`;
      $('mailDeliveryConfirm').checked=false;await loadDeliveryStatus();
    }catch(error){
      const payload=error.payload||{};summary.className='mail-test-summary bad';summary.textContent=`Test nije poslan: ${payload.error||error.message}.`;results.innerHTML=payload.required?item('Potvrda',false,`Potrebno: ${payload.required}`):'';
    }finally{updateSendButton();}
  }

  function boot(){
    ensureUi();patchSignatures();
    $('mailProfileTestRun')?.addEventListener('click',runLocalTest);
    $('mailDeliveryRecipient')?.addEventListener('input',updateSendButton);
    $('mailDeliveryConfirm')?.addEventListener('change',updateSendButton);
    $('mailDeliverySend')?.addEventListener('click',sendDeliveryTests);
    new MutationObserver(patchSignatures).observe(document.documentElement,{childList:true,subtree:true});
    loadDeliveryStatus();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
