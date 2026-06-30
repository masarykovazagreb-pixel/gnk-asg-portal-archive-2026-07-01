export const VERSION='GNK_ASG_MEDIA_OUTREACH_HTML_ONLY_GATE_V1_20260630';

const TEST_GATE_KEY='media-command-center:delivery-test:v1';
const clean=value=>String(value??'').trim();

function normalizeRead(value){
  if(typeof value!=='string'||!value)return value;
  try{
    const data=JSON.parse(value);
    if(data?.passed===true&&clean(data.deliveryMode)!=='HTML_ONLY'){
      return JSON.stringify({...data,passed:false,valid:false,reason:'html_only_control_test_required',requiredDeliveryMode:'HTML_ONLY',gateVersion:VERSION});
    }
    return value;
  }catch{return value;}
}

function normalizeWrite(value){
  if(typeof value!=='string'||!value)return value;
  try{
    const data=JSON.parse(value);
    if(data?.passed===true){
      return JSON.stringify({...data,deliveryMode:'HTML_ONLY',attachments:0,gateVersion:VERSION},null,2);
    }
    return value;
  }catch{return value;}
}

function wrapKv(binding){
  if(!binding||typeof binding.get!=='function')return binding;
  return new Proxy(binding,{
    get(target,property,receiver){
      if(property==='get')return async(key,...args)=>normalizeRead(await target.get(key,...args));
      if(property==='put')return async(key,value,...args)=>target.put(key===TEST_GATE_KEY?key:key,key===TEST_GATE_KEY?normalizeWrite(value):value,...args);
      const member=Reflect.get(target,property,receiver);
      return typeof member==='function'?member.bind(target):member;
    }
  });
}

export function withHtmlOnlyTestGate(env){
  const wrapped=Object.create(env||null);
  const cache=new Map();
  for(const name of ['GNK_ASG_KV','GNK_ASG_CONFIG_KV']){
    Object.defineProperty(wrapped,name,{
      enumerable:true,
      configurable:true,
      get(){
        const binding=env?.[name];
        if(!cache.has(name))cache.set(name,wrapKv(binding));
        return cache.get(name);
      }
    });
  }
  return wrapped;
}
