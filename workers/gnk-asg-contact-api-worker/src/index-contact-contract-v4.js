import app from './index-signature-v3.js';

export const VERSION='GNK_ASG_CONTACT_CONTRACT_V4_20260716';

const clean=value=>String(value??'').trim();

async function jsonToMultipartRequest(request){
  let data;
  try{
    data=await request.json();
  }catch{
    return{
      error:new Response(JSON.stringify({
        ok:false,
        accepted:false,
        stored:false,
        mailAttempted:false,
        deliveryOk:false,
        error:'invalid_json',
        message:'Forma nije pravilno poslana.'
      },null,2),{
        status:400,
        headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
      })
    };
  }

  if(!data||typeof data!=='object'||Array.isArray(data)){
    return{
      error:new Response(JSON.stringify({
        ok:false,
        accepted:false,
        stored:false,
        mailAttempted:false,
        deliveryOk:false,
        error:'invalid_json',
        message:'Forma nije pravilno poslana.'
      },null,2),{
        status:400,
        headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
      })
    };
  }

  const form=new FormData();
  for(const [key,value] of Object.entries(data)){
    if(value===undefined||value===null)continue;
    if(typeof value==='boolean')form.set(key,value?'true':'false');
    else if(typeof value==='string'||typeof value==='number')form.set(key,String(value));
  }

  const headers=new Headers(request.headers);
  headers.delete('content-type');
  headers.delete('content-length');

  return{
    request:new Request(request.url,{
      method:'POST',
      headers,
      body:form,
      redirect:request.redirect,
      credentials:request.credentials
    })
  };
}

async function normalizeContactResponse(response){
  const type=clean(response.headers.get('content-type')).toLowerCase();
  if(!type.includes('application/json'))return response;

  let data;
  try{data=await response.json();}catch{return response;}

  const hasCase=Boolean(clean(data?.caseId));
  const stored=Boolean(data?.stored??data?.accepted??hasCase);
  const internalAttempted=Boolean(data?.internalMail?.attempted);
  const replyAttempted=Boolean(data?.autoReply?.attempted);
  const mailAttempted=Boolean(data?.mailAttempted??internalAttempted||replyAttempted);
  const deliveryOk=Boolean(data?.deliveryOk??(data?.internalMail?.sent&&data?.autoReply?.sent));
  const accepted=Boolean(data?.accepted??stored);

  const normalized={
    ...data,
    accepted,
    stored,
    mailAttempted,
    deliveryOk
  };

  if(stored&&!deliveryOk){
    normalized.ok=true;
    normalized.message=data?.message||'Upit je spremljen, ali dostava e-pošte nije u cijelosti uspjela.';
  }

  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type','application/json; charset=utf-8');
  headers.set('x-gnk-asg-contact-contract',VERSION);

  const status=stored?(deliveryOk?200:202):response.status;
  return new Response(JSON.stringify(normalized,null,2),{
    status,
    statusText:response.statusText,
    headers
  });
}

export default{
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
    let forwarded=request;

    if(path==='/api/contact-submit'&&request.method==='POST'){
      const type=clean(request.headers.get('content-type')).toLowerCase();
      if(type.includes('application/json')){
        const converted=await jsonToMultipartRequest(request);
        if(converted.error)return converted.error;
        forwarded=converted.request;
      }
      const response=await app.fetch(forwarded,env,ctx);
      return normalizeContactResponse(response);
    }

    return app.fetch(request,env,ctx);
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,env,ctx);},
  async email(message,env,ctx){if(typeof app.email==='function')return app.email(message,env,ctx);}
};
