import app from './index-final-admin-gateway-core-v2.js';
import {withRequiredEmailSignature,VERSION as SIGNATURE_VERSION} from './email-signature-contract-v2.js';
import {brandSimpleRawEmail,wrapInboundReply,VERSION as RAW_LOGO_VERSION} from './email-raw-logo-v1.js';
import {EMAIL_LOGO_PATH,VERSION as MIME_VERSION} from './email-brand-mime-v1.js';

export const VERSION='GNK_ASG_FINAL_GATEWAY_LOGO_V2_20260629_R4_CANONICAL';
const STATUS_PATH='/api/email-logo-status';

function envWithLogo(env){
  const signed=withRequiredEmailSignature(env);
  const structuredBinding=signed?.EMAIL;
  const rawBinding=env?.EMAIL;
  if(!structuredBinding||typeof structuredBinding.send!=='function')return signed;
  const wrapped=Object.create(signed||null);
  Object.defineProperty(wrapped,'EMAIL',{
    enumerable:true,
    configurable:true,
    value:{async send(payload){
      if(payload?.raw&&rawBinding&&typeof rawBinding.send==='function'){
        return rawBinding.send(await brandSimpleRawEmail(payload,env));
      }
      return structuredBinding.send(payload);
    }}
  });
  return wrapped;
}

function status(env){
  return new Response(JSON.stringify({
    ok:true,
    gateway:VERSION,
    signatureContract:SIGNATURE_VERSION,
    rawLogo:RAW_LOGO_VERSION,
    mimeBrand:MIME_VERSION,
    logoAsset:EMAIL_LOGO_PATH,
    structuredSend:true,
    rawSend:true,
    automaticReply:true,
    emailBinding:Boolean(env?.EMAIL?.send),
    assetsBinding:Boolean(env?.ASSETS?.fetch)
  },null,2),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-gnk-asg-email-logo-gateway':VERSION}});
}

function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-email-logo-gateway',VERSION);
  headers.set('x-gnk-asg-email-signature-contract',SIGNATURE_VERSION);
  headers.set('x-gnk-asg-email-raw-logo',RAW_LOGO_VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){
    const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
    if(request.method==='GET'&&path===STATUS_PATH)return status(env);
    return stamp(await app.fetch(request,envWithLogo(env),ctx));
  },
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,envWithLogo(env),ctx);},
  async email(message,env,ctx){
    const brandedMessage=wrapInboundReply(message,env);
    if(typeof app.email==='function')return app.email(brandedMessage,envWithLogo(env),ctx);
  }
};
