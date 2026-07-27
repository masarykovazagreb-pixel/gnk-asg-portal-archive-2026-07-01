import assert from 'node:assert/strict';
import {handleAdminAhd,PAGE_PATH,API_PATH} from '../workers/gnk-asg-direct-operator/src/admin-ahd-v1.js';

const unauthApp={fetch:async()=>new Response(JSON.stringify({authenticated:false}),{status:401,headers:{'content-type':'application/json'}})};
const authApp={fetch:async()=>new Response(JSON.stringify({authenticated:true}),{status:200,headers:{'content-type':'application/json'}})};
const env={GITHUB_STATUS_TOKEN:'test-token'};
const pageRequest=new Request('https://gnk-asg.hr'+PAGE_PATH+'/',{method:'GET'});
const apiRequest=new Request('https://gnk-asg.hr'+API_PATH,{method:'GET'});

const pageWithoutSession=await handleAdminAhd(pageRequest,env,{},unauthApp);
assert.equal(pageWithoutSession.status,200);
const gateHtml=await pageWithoutSession.text();
assert.match(gateHtml,/Admin token/);
assert.match(gateHtml,/\/api\/operator-session-login/);
assert.match(gateHtml,/JSON\.stringify\(\{token\}\)/);
assert.doesNotMatch(gateHtml,/AHD_ADMIN_TOKEN|x-gnk-ahd-token|AHD token/);
assert.match(gateHtml,/noindex,nofollow,noarchive/);
assert.match(gateHtml,/\/assets\/public-unified-menu-v6\.js/);

const denied=await handleAdminAhd(apiRequest,env,{},unauthApp);
assert.equal(denied.status,401);
assert.equal((await denied.json()).error,'unauthorized');

const realFetch=globalThis.fetch;
globalThis.fetch=async url=>{
 const value=String(url);
 if(value.includes('/actions/workflows?'))return new Response(JSON.stringify({workflows:[{id:7,name:'Zakazane objave',path:'.github/workflows/editorial-scheduled-publish.yml',state:'active'}]}),{status:200,headers:{'content-type':'application/json'}});
 if(value.includes('/contents/')){const yaml="name: Zakazane objave\non:\n  schedule:\n    - cron: '20 * * * *'\n";return new Response(JSON.stringify({content:Buffer.from(yaml).toString('base64')}),{status:200,headers:{'content-type':'application/json'}})}
 if(value.includes('/actions/workflows/7/runs'))return new Response(JSON.stringify({workflow_runs:[{status:'completed',conclusion:'success',event:'schedule',created_at:'2026-07-27T15:20:00Z',updated_at:'2026-07-27T15:21:00Z',html_url:'https://github.com/example/run',head_sha:'1234567890abcdef'}]}),{status:200,headers:{'content-type':'application/json'}});
 return new Response('{}',{status:404});
};
try{
 const api=await handleAdminAhd(apiRequest,env,{},authApp);
 assert.equal(api.status,200);
 const data=await api.json();
 assert.equal(data.ok,true);
 const editorial=data.items.find(item=>item.name==='Zakazane objave');
 assert.ok(editorial);
 assert.deepEqual(editorial.crons,['20 * * * *']);
 assert.equal(editorial.health,'healthy');
 assert.ok(data.items.some(item=>item.id==='cf-direct-operator'));
 assert.ok(data.items.some(item=>item.id==='tech-radar'));
}finally{globalThis.fetch=realFetch}
console.log(JSON.stringify({ok:true,page:PAGE_PATH,api:API_PATH,cron:'20 * * * *',existingAdminTokenGate:true}));
