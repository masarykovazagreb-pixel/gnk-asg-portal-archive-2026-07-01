(()=>{
  'use strict';
  if(window.__GNK_ASG_PDF_PUBLISHER_V1__)return;
  window.__GNK_ASG_PDF_PUBLISHER_V1__=true;

  const byId=id=>document.getElementById(id);
  const checks=[
    {id:'campaign',label:'Kampanjski PDF',path:'/api/media-command-center/campaign-pdf'},
    {id:'readiness',label:'Mail send readiness',path:'/api/mail-center/send-readiness'},
    {id:'delivery',label:'Delivery status',path:'/api/media-command-center/delivery-status'},
    {id:'platform',label:'Platform health',path:'/data/platform-health.json'}
  ];

  async function request(entry){
    const started=performance.now();
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),9000);
    try{
      const url=new URL(entry.path,location.origin);url.searchParams.set('cb',Date.now());
      const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'},signal:controller.signal});
      let data=null;try{data=await response.json()}catch(_){data=null}
      return Object.assign({},entry,{ok:response.ok&&data!==null,warn:[401,403].includes(response.status),status:response.status,ms:Math.round(performance.now()-started),data});
    }catch(error){
      return Object.assign({},entry,{ok:false,warn:false,status:0,ms:Math.round(performance.now()-started),error:error&&error.name==='AbortError'?'Istek vremena':String(error&&error.message||error)});
    }finally{clearTimeout(timeout)}
  }

  function metric(label,value,detail){
    const article=document.createElement('article');article.className='metric';
    const small=document.createElement('small');small.textContent=label;
    const strong=document.createElement('strong');strong.textContent=String(value||'—');
    const span=document.createElement('span');span.textContent=detail;
    article.append(small,strong,span);return article;
  }

  function row(result){
    const item=document.createElement('div');item.className='result-row '+(result.ok?'ok':result.warn?'warn':'bad');
    const strong=document.createElement('strong');strong.textContent=result.label;
    const code=document.createElement('code');code.textContent=result.path;
    const status=document.createElement('em');
    status.textContent=result.ok?'SPREMNO · '+result.ms+' ms':result.warn?'PRIJAVA · HTTP '+result.status:'GREŠKA · '+(result.error||('HTTP '+result.status));
    item.append(strong,code,status);return item;
  }

  async function load(){
    const button=byId('refreshPdfPublisher');const chip=byId('pdfPublisherStatus');
    if(button)button.disabled=true;
    chip.className='status-chip warn';chip.textContent='Provjera u tijeku…';
    const results=await Promise.all(checks.map(request));
    byId('pdfPublisherResults').replaceChildren(...results.map(row));
    const map=Object.fromEntries(results.map(result=>[result.id,result]));
    const campaign=map.campaign&&map.campaign.data||{};
    const readiness=map.readiness&&map.readiness.data||{};
    const delivery=map.delivery&&map.delivery.data||{};
    const limits=readiness.limits||{};
    const pdfReady=Boolean(campaign.pdf&&campaign.pdf.ok)||Boolean(campaign.ok);
    const mailReady=Boolean(readiness.live&&readiness.emailBindingConfigured);
    const attachmentLimit=limits.attachments||limits.maxAttachments||readiness.maxAttachments||0;
    const deliveryState=delivery.live?'LIVE':'LOCKED';
    byId('pdfMetrics').replaceChildren(
      metric('Kampanjski PDF',pdfReady?'SPREMAN':'PROVJERA',pdfReady?'PDF endpoint potvrđen':'Provjerite prijavu ili dokument'),
      metric('Mail readiness',mailReady?'SPREMAN':'OGRANIČEN',readiness.emailBindingConfigured?'E-mail binding postoji':'Binding nije potvrđen'),
      metric('Privici',attachmentLimit||'—','Dopušteni broj privitaka prema readiness statusu'),
      metric('Delivery',deliveryState,delivery.live?'Produkcijska dostava uključena':'Produkcijska dostava zaključana')
    );
    byId('pdfPublisherRaw').textContent=JSON.stringify({campaign:campaign,readiness:readiness,delivery:delivery,platform:map.platform&&map.platform.data||null},null,2);
    const failed=results.filter(result=>!result.ok&&!result.warn).length;
    const warnings=results.filter(result=>result.warn).length;
    chip.className='status-chip '+(failed?'bad':warnings?'warn':'ok');
    chip.textContent=failed?failed+' provjera nije prošla':warnings?warnings+' provjera traži prijavu':'Svi read-only PDF statusi odgovaraju';
    if(button)button.disabled=false;
  }

  byId('refreshPdfPublisher')&&byId('refreshPdfPublisher').addEventListener('click',load);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();