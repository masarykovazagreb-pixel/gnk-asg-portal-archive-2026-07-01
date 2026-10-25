import assert from 'node:assert/strict';
import fs from 'node:fs';
import {handleCurrentNewsStatus} from '../workers/gnk-asg-direct-operator/src/news-status-static-v1.js';
const url='https://gnk-asg.hr/data/news-automation-status.json';
const payload={ok:false,status:'degraded',updated_at:'2026-10-25T17:10:00+01:00',feed_results:[{status:'error'}]};
let calls=0;
const env={ASSETS:{fetch:async req=>{calls++;assert.equal(req.method,'GET');return new Response(JSON.stringify(payload));}}};
const r=await handleCurrentNewsStatus(new Request(url),env);
assert.deepEqual(await r.json(),payload); // Preserve degraded evidence, never rewrite it to green.
assert.equal(r.headers.get('x-gnk-news-status-source'),'github-single-writer-asset');
assert.equal(r.headers.get('cache-control'),'no-store');
const head=await handleCurrentNewsStatus(new Request(url,{method:'HEAD'}),env);assert.equal(await head.text(),'');
assert.equal((await handleCurrentNewsStatus(new Request(url,{method:'POST'}),env)).status,405);
assert.equal(calls,2);
assert.equal(await handleCurrentNewsStatus(new Request('https://gnk-asg.hr/operator/news-automation/status'),env),null);
for(const bad of [{},{ASSETS:{fetch:async()=>new Response('{}')}},{ASSETS:{fetch:async()=>{throw new Error('offline')}}}]){
  const unavailable=await handleCurrentNewsStatus(new Request(url),bad);assert.equal(unavailable.status,503);assert.equal((await unavailable.json()).ok,false);
}
const wrapper=fs.readFileSync(new URL('../workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js',import.meta.url),'utf8');
assert.ok(wrapper.includes('const status=await handleCurrentNewsStatus(request,env);if(status)return status;'));
assert.ok(wrapper.includes('if(currentNews)return stampRelease(currentNews,env)'));
console.log('NEWS_STATUS_STATIC_OK: canonical asset, degraded status preserved, HEAD, unavailable, read-only');
