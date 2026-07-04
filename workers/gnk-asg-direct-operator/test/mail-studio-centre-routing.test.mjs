import assert from 'node:assert/strict';
import {handleMailStudioExtension,handleMailStudioInbound,GLOBAL_CENTRES} from '../src/mail-studio-extension-v2.js';

const knownNames=new Set(GLOBAL_CENTRES.map(item=>item.name));
assert.equal(knownNames.size,10);

const store=new Map();
const kv={async get(key){return store.get(key)||null;},async put(key,value){store.set(key,String(value));}};
const outboundPayloads=[];
const env={
  MAIL_MANUAL_LIVE:'true',
  GNK_ASG_KV:kv,
  EMAIL:{async send(payload){outboundPayloads.push(payload);return{messageId:`centre-out-${outboundPayloads.length}`};}}
};
const app={fetch:async()=>new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json'}})};

let previousOutbound='';
const outboundObserved=new Set();
for(let index=0;index<50;index+=1){
  const request=new Request('https://gnk-asg.hr/api/admin-mail-send',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({profile:'office',to:`recipient-${index}@example.test`,subject:`Centre outbound ${index}`,text:`Controlled outbound centre test ${index}.`})});
  const response=await handleMailStudioExtension(request,env,{},app);
  assert.equal(response.status,200);
  const result=await response.json();
  const payload=outboundPayloads.at(-1);
  const centre=payload.headers['X-GNK-ASG-Global-Centre'];
  assert.ok(knownNames.has(centre));
  assert.equal(result.globalCentre.name,centre);
  assert.equal(result.city,centre);
  assert.notEqual(centre,previousOutbound,'Outbound centre must not repeat immediately');
  assert.match(payload.text,new RegExp(`Global Service Centre: ${centre.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`));
  assert.match(payload.html,new RegExp(`Global Service Centre:\\s*<strong>${centre.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}</strong>`));
  previousOutbound=centre;
  outboundObserved.add(centre);
}
assert.ok(outboundObserved.size>=7,`Expected broad outbound distribution, observed ${outboundObserved.size}`);
assert.ok(store.has('mail-studio:last-random-city:outbound:v2'));

const inboundReplies=[];
const inboundForwards=[];
const inboundEnv={
  GNK_ASG_KV:kv,
  EMAIL:{async send(payload){inboundReplies.push(payload);return{messageId:`centre-in-${inboundReplies.length}`};}}
};
let previousInbound='';
const inboundObserved=new Set();
for(let index=0;index<40;index+=1){
  const message={
    from:`Sender ${index} <sender-${index}@example.test>`,
    to:'office@gnk-asg.hr',
    canBeForwarded:true,
    headers:new Headers({from:`Sender ${index} <sender-${index}@example.test>`,to:'office@gnk-asg.hr',subject:`Centre inbound ${index}`,'message-id':`<centre-in-${index}@example.test>`}),
    async forward(destination,headers){inboundForwards.push({destination,headers:new Headers(headers)});return{ok:true};}
  };
  const result=await handleMailStudioInbound(message,inboundEnv,{});
  assert.equal(result.handled,true);
  const centre=result.globalCentre.name;
  const reply=inboundReplies.at(-1);
  const forwarded=inboundForwards.at(-1);
  assert.ok(knownNames.has(centre));
  assert.equal(reply.headers['X-GNK-ASG-Global-Centre'],centre);
  assert.equal(forwarded.headers.get('X-GNK-ASG-Global-Centre'),centre);
  assert.notEqual(centre,previousInbound,'Inbound centre must not repeat immediately');
  assert.match(reply.text,new RegExp(`Global Service Centre: ${centre.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`));
  assert.match(reply.html,new RegExp(`Global Service Centre:\\s*<strong>${centre.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}</strong>`));
  previousInbound=centre;
  inboundObserved.add(centre);
}
assert.ok(inboundObserved.size>=7,`Expected broad inbound distribution, observed ${inboundObserved.size}`);
assert.ok(store.has('mail-studio:last-random-city:inbound:v2'));
assert.notEqual('mail-studio:last-random-city:outbound:v2','mail-studio:last-random-city:inbound:v2');

console.log(`MAIL_STUDIO_CENTRE_ROUTING_OK outbound=${outboundObserved.size} inbound=${inboundObserved.size}`);
