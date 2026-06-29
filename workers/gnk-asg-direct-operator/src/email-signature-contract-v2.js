import {enforceRequiredSignature as enforceV1,MANDATORY_BCC,VERSION as V1_VERSION} from './email-signature-contract-v1.js';
import {attachInlineEmailLogo,VERSION as INLINE_LOGO_VERSION} from './email-inline-logo-v1.js';

export const VERSION=`GNK_ASG_EMAIL_SIGNATURE_CONTRACT_V2_INLINE_LOGO_TO_${V1_VERSION}`;
export{MANDATORY_BCC};

export function enforceRequiredSignature(payload={}){
  return enforceV1(payload);
}

export async function prepareRequiredEmail(payload={},env){
  const signed=enforceV1(payload);
  return attachInlineEmailLogo(signed,env);
}

export function withRequiredEmailSignature(env){
  const binding=env?.EMAIL;
  if(!binding||typeof binding.send!=='function')return env;
  const wrapped=Object.create(env||null);
  Object.defineProperty(wrapped,'EMAIL',{
    enumerable:true,
    configurable:true,
    value:{
      async send(payload){
        const branded=await prepareRequiredEmail(payload,env);
        if(branded&&typeof branded==='object'&&!branded.raw&&branded.constructor?.name!=='EmailMessage'){
          branded.headers={...(branded.headers||{}),'X-GNK-ASG-Signature-Contract-V2':VERSION,'X-GNK-ASG-Inline-Logo':INLINE_LOGO_VERSION};
        }
        return binding.send.call(binding,branded);
      }
    }
  });
  return wrapped;
}
