import assert from 'node:assert/strict';
import fs from 'node:fs';
import operatorCenter from '../workers/gnk-asg-operator-center/src/index.js';

const source=fs.readFileSync('workers/gnk-asg-operator-center/src/index.js','utf8');
for(const forbidden of ['sessionStorage','localStorage','GNK_ASG_OPERATOR_TOKEN','x-operator-token',"'authorization':'Bearer '"]){
  assert.equal(source.includes(forbidden),false,`manual token marker remains: ${forbidden}`);
}
for(const marker of [
  '/api/operator-auth-check',
  "credentials:'same-origin'",
  "data?.authenticated !== true",
  '/admin-login/?next=',
  'gnk-operator-session-pending',
  'cache-control',
  'x-robots-tag',
  'http-only-session-v1'
])assert.equal(source.includes(marker),true,`missing session marker: ${marker}`);

const html='<!doctype html><html><head><title>Operator</title></head><body><main>Dashboard</main><script id="gnk-asg-force-token-sync">bad()</script></body></html>';
const env={ASSETS:{fetch:async()=>new Response(html,{status:200,headers:{'content-type':'text/html'}})}};

{
  const response=await operatorCenter.fetch(new Request('https://gnk-asg.hr/operator-dashboard'),env);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store, no-cache, must-revalidate, max-age=0');
  assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow, noarchive');
  assert.equal(response.headers.get('x-gnk-asg-operator-center'),'http-only-session-v1');
  const body=await response.text();
  assert.match(body,/gnk-operator-http-only-session-v1/);
  assert.match(body,/authenticated !== true/);
  assert.doesNotMatch(body,/gnk-asg-force-token-sync/);
}
{
  const response=await operatorCenter.fetch(new Request('https://gnk-asg.hr/operator-dashboard',{method:'POST'}),env);
  assert.equal(response.status,405);
  assert.equal(response.headers.get('allow'),'GET, HEAD');
}
{
  const response=await operatorCenter.fetch(new Request('https://gnk-asg.hr/not-owned'),env);
  assert.equal(response.status,404);
}
{
  const response=await operatorCenter.fetch(new Request('https://gnk-asg.hr/operator-dashboard'),{});
  assert.equal(response.status,503);
}

console.log(JSON.stringify({ok:true,worker:'gnk-asg-operator-center',auth:'HttpOnly session probe',manualBrowserToken:false,route:'/operator-dashboard',methods:['GET','HEAD'],cache:'no-store',robots:'noindex'},null,2));
