import app from './index-final-admin-gateway-v1.js';
import {withRequiredEmailSignature,VERSION as SIGNATURE_VERSION} from './email-signature-contract-v2.js';
import {brandSimpleRawEmail,wrapInboundReply,VERSION as RAW_LOGO_VERSION} from './email-raw-logo-v1.js';

export const VERSION='GNK_ASG_FINAL_GATEWAY_LOGO_V2_20260629_R2_RAW_BYPASS';

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

function stamp(response){
  const headers=new Headers(response.headers);
  headers.set('x-gnk-asg-email-logo-gateway',VERSION);
  headers.set('x-gnk-asg-email-signature-contract',SIGNATURE_VERSION);
  headers.set('x-gnk-asg-email-raw-logo',RAW_LOGO_VERSION);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

export default{
  async fetch(request,env,ctx){return stamp(await app.fetch(request,envWithLogo(env),ctx));},
  async scheduled(event,env,ctx){if(typeof app.scheduled==='function')return app.scheduled(event,envWithLogo(env),ctx);},
  async email(message,env,ctx){
    const brandedMessage=wrapInboundReply(message,env);
    if(typeof app.email==='function')return app.email(brandedMessage,envWithLogo(env),ctx);
  }
};
