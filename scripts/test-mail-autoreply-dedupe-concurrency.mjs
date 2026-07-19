import assert from 'node:assert/strict';
import {reserveMessageId,releaseMessageId} from '../workers/gnk-asg-direct-operator/src/mail-autoreply-dedupe-v1.js';

const values=new Map();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const kv={
  async get(key){await delay(5);return values.get(key)||null},
  async put(key,value){await delay(5);values.set(key,value)},
  async delete(key){values.delete(key)}
};

const key='mail:autoreply:message-id:test';
const attempts=await Promise.all(Array.from({length:12},(_,index)=>reserveMessageId(kv,key,`attempt-${index}`,3600)));
assert.equal(attempts.filter(result=>result.ok).length,1);
assert.equal(attempts.filter(result=>result.reason==='duplicate_message_id').length,11);
assert.equal(await releaseMessageId(kv,key),true);
assert.equal((await reserveMessageId(kv,key,'retry',3600)).ok,true);
assert.deepEqual(await reserveMessageId(null,key,'x',3600),{ok:false,reason:'dedupe_store_unavailable'});
assert.deepEqual(await reserveMessageId(kv,'','x',3600),{ok:false,reason:'missing_message_id'});

console.log(JSON.stringify({ok:true,contract:'single-winner-pre-send-message-id-reservation',attempts:attempts.length},null,2));
