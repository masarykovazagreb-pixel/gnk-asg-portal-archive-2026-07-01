import assert from 'node:assert/strict';
import {serveMarketPulseAsset,MARKET_PULSE_PATH} from '../src/public-market-pulse-asset-v1.js';

const payload=JSON.stringify({generatedAt:'2026-09-22T00:00:00Z',items:[{symbol:'TEST',price:1}]});
const calls=[];
const env={ASSETS:{fetch:async request=>{calls.push(request);return new Response(payload,{status:200,headers:{etag:'stale-etag','content-type':'text/plain'}})}}};

const get=await serveMarketPulseAsset(new Request(`https://gnk-asg.hr${MARKET_PULSE_PATH}`),env);
assert.equal(get.status,200);
assert.equal(get.headers.get('content-type'),'application/json; charset=utf-8');
assert.equal(get.headers.get('cache-control'),'no-store, no-cache, must-revalidate, max-age=0');
assert.equal(get.headers.get('x-gnk-market-pulse-source'),'current-static-asset-20260922');
assert.equal(get.headers.get('etag'),null);
assert.equal(await get.text(),payload);
assert.equal(new URL(calls[0].url).pathname,MARKET_PULSE_PATH);

const head=await serveMarketPulseAsset(new Request(`https://gnk-asg.hr${MARKET_PULSE_PATH}`,{method:'HEAD'}),env);
assert.equal(head.status,200);
assert.equal(await head.text(),'');

assert.equal(await serveMarketPulseAsset(new Request('https://gnk-asg.hr/data/news.json'),env),null);
assert.equal(await serveMarketPulseAsset(new Request(`https://gnk-asg.hr${MARKET_PULSE_PATH}`,{method:'POST'}),env),null);
assert.equal(await serveMarketPulseAsset(new Request(`https://gnk-asg.hr${MARKET_PULSE_PATH}`),{ASSETS:{fetch:async()=>new Response('missing',{status:404})}}),null);

console.log('public market-pulse asset contract: PASS');
