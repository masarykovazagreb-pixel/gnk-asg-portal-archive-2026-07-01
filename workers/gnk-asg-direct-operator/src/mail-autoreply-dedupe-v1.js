const VERSION='GNK_ASG_MAIL_AUTOREPLY_DEDUPE_V1_20260718';
const localLocks=new Map();

async function withLocalKeyLock(key,task){
  const previous=localLocks.get(key)||Promise.resolve();
  let release;
  const current=new Promise(resolve=>{release=resolve});
  localLocks.set(key,previous.then(()=>current));
  await previous;
  try{return await task()}finally{release();if(localLocks.get(key)===current)localLocks.delete(key)}
}

async function reserveMessageId(kv,key,value,ttl){
  if(!key)return{ok:false,reason:'missing_message_id'};
  if(!kv||typeof kv.get!=='function'||typeof kv.put!=='function')return{ok:false,reason:'dedupe_store_unavailable'};
  return withLocalKeyLock(key,async()=>{
    try{
      if(await kv.get(key))return{ok:false,reason:'duplicate_message_id'};
      await kv.put(key,value,{expirationTtl:ttl});
      return{ok:true,reason:null};
    }catch{return{ok:false,reason:'dedupe_store_error'}}
  });
}

async function releaseMessageId(kv,key){
  if(!key||!kv||typeof kv.delete!=='function')return false;
  try{await kv.delete(key);return true}catch{return false}
}

export{VERSION,reserveMessageId,releaseMessageId};
