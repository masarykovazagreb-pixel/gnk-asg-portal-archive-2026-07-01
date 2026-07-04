export const VERSION='GNK_ASG_GLOBAL_SERVICE_CENTRES_V1_20260704';

export const GLOBAL_SERVICE_CENTRES=Object.freeze([
  Object.freeze({id:'new-york',name:'New York',country:'United States'}),
  Object.freeze({id:'london',name:'London',country:'United Kingdom'}),
  Object.freeze({id:'paris',name:'Paris',country:'France'}),
  Object.freeze({id:'frankfurt',name:'Frankfurt',country:'Germany'}),
  Object.freeze({id:'dubai',name:'Dubai',country:'United Arab Emirates'}),
  Object.freeze({id:'singapore',name:'Singapore',country:'Singapore'}),
  Object.freeze({id:'tokyo',name:'Tokyo',country:'Japan'}),
  Object.freeze({id:'sydney',name:'Sydney',country:'Australia'}),
  Object.freeze({id:'toronto',name:'Toronto',country:'Canada'}),
  Object.freeze({id:'zurich',name:'Zurich',country:'Switzerland'})
]);

const memoryLast=new Map();
const clean=value=>String(value??'').trim();
const kvOf=env=>env?.GNK_ASG_KV||env?.GNK_ASG_CONFIG_KV||null;

export function centreLocation(centre){
  return centre?.name&&centre?.country?`${centre.name}, ${centre.country}`:'';
}

export function centreRoleLabel(direction='outbound'){
  return String(direction).toLowerCase()==='inbound'?'Receiving Global Service Centre':'Sending Global Service Centre';
}

export function randomCentreIndex(randomValue){
  const count=GLOBAL_SERVICE_CENTRES.length;
  if(!count)throw new Error('global_service_centres_missing');
  let value=randomValue;
  if(!Number.isInteger(value)){
    const bytes=new Uint32Array(1);
    crypto.getRandomValues(bytes);
    value=bytes[0];
  }
  return((value%count)+count)%count;
}

export function differentRandomCentreIndex(previousIndex=-1,randomValue){
  const count=GLOBAL_SERVICE_CENTRES.length;
  if(count<2)return 0;
  const previous=Number.isInteger(previousIndex)&&previousIndex>=0&&previousIndex<count?previousIndex:-1;
  if(previous<0)return randomCentreIndex(randomValue);
  let value=randomValue;
  if(!Number.isInteger(value)){
    const bytes=new Uint32Array(1);
    crypto.getRandomValues(bytes);
    value=bytes[0];
  }
  const candidate=((value%(count-1))+(count-1))%(count-1);
  return candidate>=previous?candidate+1:candidate;
}

export async function chooseRandomServiceCentre(env,scope='global'){
  const normalizedScope=clean(scope).toLowerCase().replace(/[^a-z0-9_-]+/g,'-')||'global';
  const key=`mail:service-centre:last:${normalizedScope}:v1`;
  const kv=kvOf(env);
  let lastId=memoryLast.get(key)||'';
  if(kv?.get){try{lastId=clean(await kv.get(key))||lastId;}catch{}}
  const previousIndex=GLOBAL_SERVICE_CENTRES.findIndex(item=>item.id===lastId);
  const selected=GLOBAL_SERVICE_CENTRES[differentRandomCentreIndex(previousIndex)]||GLOBAL_SERVICE_CENTRES[0];
  memoryLast.set(key,selected.id);
  if(kv?.put){try{await kv.put(key,selected.id);}catch{}}
  return selected;
}

export const __test={memoryLast};
