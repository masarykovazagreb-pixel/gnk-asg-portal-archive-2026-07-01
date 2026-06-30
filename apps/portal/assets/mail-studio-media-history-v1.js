(()=>{
  'use strict';
  if(window.__GNK_ASG_MAIL_STUDIO_MEDIA_HISTORY_V1__)return;
  window.__GNK_ASG_MAIL_STUDIO_MEDIA_HISTORY_V1__=true;

  const VERSION='GNK_ASG_MAIL_STUDIO_MEDIA_HISTORY_V1_20260630';
  const SENT_PATH='/api/studio-message/sent';
  const FRESH_PATH='/api/media-command-center/fresh-status';
  const DELIVERY_PATH='/api/media-command-center/delivery-status';
  const originalFetch=window.fetch.bind(window);

  const clean=value=>String(value??'').trim();
  const statusLabel=value=>{
    const status=clean(value).toUpperCase();
    if(status==='SENT'||status==='POSLANO')return'POSLANO';
    if(status==='SENDING')return'ŠALJE SE';
    if(status==='QUEUED'||status==='U REDU')return'U REDU';
    if(status==='RETRY')return'PONOVNI POKUŠAJ';
    if(status==='FAILED')return'NEUSPJELO';
    if(status==='REVIEW')return'PROVJERA';
    return status||'NIJE POSLANO';
  };
  const readJson=async response=>{
    try{return await response.clone().json();}
    catch{return{ok:false,error:`HTTP_${response.status}`};}
  };
  const requestUrl=input=>{
    try{return new URL(typeof input==='string'?input:input.url,location.href);}
    catch{return null;}
  };
  const forwardedHeaders=init=>{
    const headers=new Headers(init?.headers||{});
    if(!headers.has('accept'))headers.set('accept','application/json');
    headers.set('cache-control','no-cache');
    return headers;
  };
  const detailMap=delivery=>new Map((delivery?.recent||[]).map(row=>[
    clean(row.mail_code||row.mailCode),
    row
  ]));

  function campaignView(fresh,delivery){
    const details=detailMap(delivery);
    const rows=(fresh?.contacts?.items||[]).map(row=>{
      const detail=details.get(clean(row.mailCode))||{};
      const status=statusLabel(detail.status||row.sentStatus);
      return{
        mailCode:clean(row.mailCode),
        outlet:clean(row.outlet),
        recipient:clean(row.recipient),
        email:clean(row.email),
        status,
        sentAt:clean(detail.sent_at||detail.sentAt),
        providerMessageId:clean(detail.provider_message_id||detail.providerMessageId),
        lastErrorCode:clean(detail.last_error_code||detail.lastErrorCode)
      };
    });
    const sent=rows.filter(row=>row.status==='POSLANO');
    const attention=rows.filter(row=>['PONOVNI POKUŠAJ','NEUSPJELO','PROVJERA','ŠALJE SE'].includes(row.status));
    return{
      version:VERSION,
      live:Boolean(delivery?.live),
      testValid:Boolean(delivery?.testGate?.valid),
      rate:delivery?.rate||{},
      queue:delivery?.queue||fresh?.queue||{},
      summary:{
        total:rows.length,
        sent:sent.length,
        queued:Number(delivery?.queue?.QUEUED||fresh?.queue?.QUEUED||0),
        retry:Number(delivery?.queue?.RETRY||fresh?.queue?.RETRY||0),
        failed:Number(delivery?.queue?.FAILED||fresh?.queue?.FAILED||0),
        review:Number(delivery?.queue?.REVIEW||fresh?.queue?.REVIEW||0)
      },
      sent,
      attention,
      note:'Vrijeme slanja i provider Message ID prikazuju se za zapise koje delivery-status trenutno vraća u detaljnom pregledu; popis POSLANO obuhvaća sve kontakte iz kampanje.'
    };
  }

  window.fetch=async function(input,init){
    const url=requestUrl(input);
    if(!url||url.pathname!==SENT_PATH)return originalFetch(input,init);

    const primaryPromise=originalFetch(input,init);
    const headers=forwardedHeaders(init);
    const options={
      method:'GET',
      credentials:init?.credentials||'same-origin',
      cache:'no-store',
      headers
    };
    const stamp=Date.now();
    const freshPromise=originalFetch(`${FRESH_PATH}?cb=${stamp}`,options);
    const deliveryPromise=originalFetch(`${DELIVERY_PATH}?cb=${stamp}`,options);

    const [primaryResult,freshResult,deliveryResult]=await Promise.allSettled([
      primaryPromise,
      freshPromise,
      deliveryPromise
    ]);

    if(primaryResult.status!=='fulfilled')throw primaryResult.reason;

    const primaryResponse=primaryResult.value;
    const manualSent=await readJson(primaryResponse);
    const fresh=freshResult.status==='fulfilled'?await readJson(freshResult.value):{ok:false,error:clean(freshResult.reason?.message||freshResult.reason)};
    const delivery=deliveryResult.status==='fulfilled'?await readJson(deliveryResult.value):{ok:false,error:clean(deliveryResult.reason?.message||deliveryResult.reason)};
    const mediaAvailable=Boolean(fresh?.contacts?.items);
    const payload={
      ok:primaryResponse.ok||mediaAvailable,
      view:'MAIL_STUDIO_SENT_WITH_MEDIA_CAMPAIGN',
      generatedAt:new Date().toISOString(),
      mailStudioSent:manualSent,
      mediaCampaign:mediaAvailable?campaignView(fresh,delivery):{
        available:false,
        freshError:fresh?.error||'',
        deliveryError:delivery?.error||''
      }
    };

    const responseHeaders=new Headers(primaryResponse.headers);
    responseHeaders.set('content-type','application/json; charset=utf-8');
    responseHeaders.set('cache-control','no-store, no-cache, must-revalidate, max-age=0');
    responseHeaders.set('x-gnk-asg-mail-studio-media-history',VERSION);
    responseHeaders.delete('content-length');
    responseHeaders.delete('content-encoding');

    return new Response(JSON.stringify(payload,null,2),{
      status:payload.ok?200:primaryResponse.status,
      statusText:payload.ok?'OK':primaryResponse.statusText,
      headers:responseHeaders
    });
  };
})();
