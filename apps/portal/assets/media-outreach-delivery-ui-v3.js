(() => {
  'use strict';
  if(window.__GNK_ASG_MEDIA_DELIVERY_UI_V3__)return;
  window.__GNK_ASG_MEDIA_DELIVERY_UI_V3__=true;
  const API='/api/media-command-center';
  const state={status:null,plan:null,pdfFile:null};
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[char]));
  async function api(path,options={}){
    const response=await fetch(`${API}${path}`,{credentials:'same-origin',cache:'no-store',...options,headers:{accept:'application/json',...(options.headers||{})}});
    const data=await response.json().catch(()=>({ok:false,error:`HTTP_${response.status}`}));
    if(!response.ok||data.ok===false){const error=new Error(data.error||data.message||`HTTP_${response.status}`);error.payload=data;throw error;}
    return data;
  }
  function notice(text,error=false){const node=$('systemNotice');if(node){node.textContent=text;node.classList.toggle('error',error);}}
  function ensureUi(){
    const panel=$('campaign');if(!panel||$('deliveryControl'))return;
    const box=document.createElement('section');box.id='deliveryControl';box.className='delivery-control';
    box.innerHTML=`
      <div class="delivery-head"><div><span>GNK ASG DELIVERY GATE</span><h3>PDF, test i kontrolirano slanje</h3><p>Vanjsko slanje traži valjan PDF, uspješan interni test i zasebno eksplicitno release odobrenje.</p></div><button id="deliveryReload" type="button">Osvježi status</button></div>
      <div id="deliveryKpis" class="delivery-kpis"></div>
      <div class="delivery-grid">
        <article><h4>1. Službeni PDF</h4><input id="deliveryPdfFile" type="file" accept="application/pdf,.pdf"><button id="deliveryPdfUpload" type="button" disabled>Učitaj i potvrdi PDF</button><pre id="deliveryPdfState">PDF nije provjeren.</pre></article>
        <article><h4>2. Interni test</h4><label>Testna adresa iz Cloudflare allowliste<input id="deliveryTestRecipient" type="email" autocomplete="off" placeholder="test@example.com"></label><label class="delivery-confirm"><input id="deliveryTestConfirm" type="checkbox"> Potvrđujem slanje jedne interne testne poruke</label><button id="deliveryTestSend" type="button" disabled>Pošalji test s PDF-om</button><pre id="deliveryTestState">Test nije pokrenut.</pre></article>
        <article><h4>3. Plan primatelja</h4><button id="deliveryPlanLoad" type="button">Izračunaj odobreni skup</button><pre id="deliveryPlanState">Plan još nije učitan.</pre></article>
        <article><h4>4. Red čekanja</h4><label>Potvrda za red čekanja<input id="deliveryQueueConfirm" autocomplete="off" placeholder="QUEUE_APPROVED_MEDIA"></label><button id="deliveryQueueApproved" type="button" disabled>Stavi odobrene kontakte u red</button><button id="deliveryDispatchOne" type="button" disabled>Pošalji sljedeću poruku iz reda</button><pre id="deliveryQueueState">Red čekanja nije aktivan.</pre></article>
      </div>`;
    panel.appendChild(box);
  }
  function formatPdf(pdf){if(!pdf?.ok)return JSON.stringify(pdf||{ok:false,error:'campaign_pdf_missing'},null,2);return JSON.stringify({ok:true,filename:pdf.filename,key:pdf.key,sha256:pdf.sha256,sizeBytes:pdf.sizeBytes,uploadedAt:pdf.uploadedAt},null,2);}
  function render(){
    const data=state.status||{},pdf=data.pdf||{},gate=data.testGate||{},rate=data.rate||{},queue=data.queue||{};
    const kpis=$('deliveryKpis');if(kpis)kpis.innerHTML=[
      ['PDF',pdf.ok?'SPREMAN':'NEDOSTAJE',pdf.ok?'ok':'bad'],
      ['Interni test',gate?.passed?'PROŠAO':'NIJE POTVRĐEN',gate?.passed?'ok':'warn'],
      ['Test mode',data.testLive?'OTKLJUČAN':'ZAKLJUČAN',data.testLive?'ok':'warn'],
      ['Produkcija',data.live?'OTKLJUČANA':'ZAKLJUČANA',data.live?'warn':'ok'],
      ['Release',data.releaseApproved?'ODOBREN':'NIJE ODOBREN',data.releaseApproved?'warn':'ok'],
      ['Kvote',`${rate.hour?.used||0}/${rate.hour?.limit||10} h · ${rate.day?.used||0}/${rate.day?.limit||50} dan`,'neutral'],
      ['Red',Object.entries(queue).map(([key,value])=>`${key}:${value}`).join(' · ')||'prazan','neutral']
    ].map(([a,b,c])=>`<div class="${c}"><small>${esc(a)}</small><strong>${esc(b)}</strong></div>`).join('');
    if($('deliveryPdfState'))$('deliveryPdfState').textContent=formatPdf(pdf);
    if($('deliveryTestState'))$('deliveryTestState').textContent=JSON.stringify(gate||{},null,2);
    if($('deliveryQueueState'))$('deliveryQueueState').textContent=JSON.stringify({live:data.live,releaseApproved:data.releaseApproved,releaseGate:data.releaseGate,accessDispatch:data.accessDispatch,rate,queue},null,2);
    const validGate=Boolean(gate?.passed&&pdf?.ok&&gate.pdfSha256===pdf.sha256);
    if($('deliveryQueueApproved'))$('deliveryQueueApproved').disabled=!validGate||!(state.plan?.summary?.ready>0);
    if($('deliveryDispatchOne'))$('deliveryDispatchOne').disabled=!data.live||!data.releaseApproved||!validGate||!((queue.QUEUED||0)+(queue.RETRY||0));
    updateTestButton();
  }
  function updateTestButton(){const button=$('deliveryTestSend'),recipient=$('deliveryTestRecipient'),confirm=$('deliveryTestConfirm');if(button)button.disabled=!(state.status?.pdf?.ok&&state.status?.testLive&&recipient?.value.trim()&&confirm?.checked);}
  async function loadStatus(){try{state.status=await api('/delivery-status');render();return state.status;}catch(error){notice(`Delivery status: ${error.message}`,true);throw error;}}
  async function uploadPdf(){
    const file=state.pdfFile;if(!file)return;
    try{
      notice('Učitavanje i provjera PDF-a…');
      const result=await api('/campaign-pdf',{method:'POST',headers:{'content-type':'application/pdf','x-file-name':file.name},body:file});
      $('deliveryPdfState').textContent=JSON.stringify(result,null,2);notice('PDF je spremljen u R2 i SHA-256 je potvrđen.');await loadStatus();
    }catch(error){$('deliveryPdfState').textContent=JSON.stringify(error.payload||{ok:false,error:error.message},null,2);notice(error.message,true);}
  }
  async function sendTest(){
    try{
      const recipient=$('deliveryTestRecipient').value.trim();
      notice('Slanje interne testne poruke s PDF-om…');
      const result=await api('/test-email',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({recipient,confirm:'SEND_TEST_EMAIL'})});
      $('deliveryTestState').textContent=JSON.stringify(result,null,2);notice('Interni test je poslan. Provjeri Inbox, PDF i zaglavlja.');await loadStatus();
    }catch(error){$('deliveryTestState').textContent=JSON.stringify(error.payload||{ok:false,error:error.message},null,2);notice(error.message,true);}
  }
  async function loadPlan(){
    try{state.plan=await api('/delivery-plan');$('deliveryPlanState').textContent=JSON.stringify({summary:state.plan.summary,pdf:state.plan.pdf,testGate:state.plan.testGate,rate:state.plan.rate,releaseApproved:state.plan.releaseApproved,accessDispatch:state.plan.accessDispatch,ready:state.plan.items.filter(item=>item.ready)},null,2);render();notice('Delivery plan je izračunat bez slanja.');}
    catch(error){$('deliveryPlanState').textContent=JSON.stringify(error.payload||{ok:false,error:error.message},null,2);notice(error.message,true);}
  }
  async function queueApproved(){
    try{
      if($('deliveryQueueConfirm').value.trim()!=='QUEUE_APPROVED_MEDIA')throw new Error('Upišite točnu potvrdu QUEUE_APPROVED_MEDIA.');
      const result=await api('/queue-approved',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({confirm:'QUEUE_APPROVED_MEDIA'})});
      $('deliveryQueueState').textContent=JSON.stringify(result,null,2);notice('Odobreni kontakti su dodani u kontrolirani red čekanja.');await loadStatus();
    }catch(error){$('deliveryQueueState').textContent=JSON.stringify(error.payload||{ok:false,error:error.message},null,2);notice(error.message,true);}
  }
  async function dispatchOne(){
    try{
      const result=await api('/dispatch-queue',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({confirm:'DISPATCH_ONE_QUEUED_EMAIL'})});
      $('deliveryQueueState').textContent=JSON.stringify(result,null,2);notice(result.sent?'Jedna poruka je poslana iz reda.':'Red nije poslao poruku; provjeri status.');await loadStatus();
    }catch(error){$('deliveryQueueState').textContent=JSON.stringify(error.payload||{ok:false,error:error.message},null,2);notice(error.message,true);}
  }
  function bind(){
    $('deliveryPdfFile')?.addEventListener('change',event=>{state.pdfFile=event.target.files?.[0]||null;$('deliveryPdfUpload').disabled=!state.pdfFile;if(state.pdfFile)$('deliveryPdfState').textContent=`${state.pdfFile.name}\n${state.pdfFile.size} bytes\nČeka upload i serverski SHA-256.`;});
    $('deliveryPdfUpload')?.addEventListener('click',uploadPdf);
    $('deliveryTestRecipient')?.addEventListener('input',updateTestButton);
    $('deliveryTestConfirm')?.addEventListener('change',updateTestButton);
    $('deliveryTestSend')?.addEventListener('click',sendTest);
    $('deliveryPlanLoad')?.addEventListener('click',loadPlan);
    $('deliveryQueueApproved')?.addEventListener('click',queueApproved);
    $('deliveryDispatchOne')?.addEventListener('click',dispatchOne);
    $('deliveryReload')?.addEventListener('click',loadStatus);
  }
  async function boot(){ensureUi();bind();await loadStatus().catch(()=>{});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();