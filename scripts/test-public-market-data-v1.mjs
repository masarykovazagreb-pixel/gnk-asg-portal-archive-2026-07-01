import fs from 'node:fs';
import assert from 'node:assert/strict';
import {servePublicMarketData,VERSION,PRIMARY_API_PATH,PUBLIC_API_PATH,API_PATHS} from '../workers/gnk-asg-direct-operator/src/public-market-data-v1.js';

const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js','utf8');
const client=fs.readFileSync('apps/portal/assets/market.js','utf8');
const fallback=JSON.parse(fs.readFileSync('apps/portal/data/market.json','utf8'));
assert.equal(PRIMARY_API_PATH,'/api/market');
assert.equal(PUBLIC_API_PATH,'/api/public-market');
assert.deepEqual([...API_PATHS],[PRIMARY_API_PATH,PUBLIC_API_PATH]);
assert.match(VERSION,/GNK_ASG_PUBLIC_MARKET_DATA_V4_20260718_INDEPENDENT_PROVIDER/);
assert.match(worker,/servePublicMarketData/);
assert.match(worker,/MARKET_ORIGIN/);
assert.match(client,/fetch\('\/api\/market/);
assert.match(client,/fetch\('\/api\/public-market/);
assert.match(client,/zastarjeli rezervni presjek/);
assert.ok(Date.parse(fallback.updated_at),'fallback timestamp required');

const ids=['bitcoin','ethereum','solana','ripple','binancecoin','cardano','chainlink','avalanche-2','tether','usd-coin','dai','euro-coin'];
const simplePayload=Object.fromEntries(ids.map((id,index)=>[id,{eur:index+1,usd:index+2,gbp:index+3,chf:index+4,jpy:index+5,eur_24h_change:1,usd_24h_change:2,gbp_24h_change:3,chf_24h_change:4,jpy_24h_change:5,last_updated_at:123}]));
const originalFetch=globalThis.fetch;
try{
 globalThis.fetch=async()=>new Response(JSON.stringify(simplePayload),{status:200,headers:{'content-type':'application/json'}});
 for(const path of [PRIMARY_API_PATH,PUBLIC_API_PATH]){
  const live=await servePublicMarketData(new Request(`https://gnk-asg.hr${path}`),{});
  assert.equal(live.status,200);
  assert.equal(live.headers.get('x-gnk-market-source'),'live');
  assert.equal(live.headers.get('x-gnk-market-route'),path);
  assert.equal(live.headers.get('x-gnk-market-upstream'),'coingecko-simple-price');
  assert.match(live.headers.get('cache-control')||'',/max-age=60/);
  const liveData=await live.json();
  assert.equal(liveData.status,'ok');
  assert.equal(liveData.stale,false);
  assert.ok(liveData.coins.length>=8);
 }

 globalThis.fetch=async()=>new Response('rate limited',{status:429});
 const env={ASSETS:{fetch:async()=>new Response(JSON.stringify(fallback),{status:200,headers:{'content-type':'application/json'}})}};
 for(const path of [PRIMARY_API_PATH,PUBLIC_API_PATH]){
  const stored=await servePublicMarketData(new Request(`https://gnk-asg.hr${path}`),env);
  assert.equal(stored.status,200);
  assert.equal(stored.headers.get('x-gnk-market-source'),'fallback');
  assert.equal(stored.headers.get('x-gnk-market-route'),path);
  assert.equal(stored.headers.get('x-gnk-market-upstream'),'static-market-json');
  assert.equal(stored.headers.get('cache-control'),'no-store, max-age=0');
  const storedData=await stored.json();
  assert.equal(storedData.status,'fallback');
  assert.equal(typeof storedData.stale,'boolean');
  assert.ok(Number.isFinite(storedData.age_seconds) && storedData.age_seconds>=0);
 }

 const head=await servePublicMarketData(new Request(`https://gnk-asg.hr${PRIMARY_API_PATH}`,{method:'HEAD'}),env);
 assert.equal(head.status,200);
 assert.equal(head.body,null);
 assert.equal(head.headers.get('x-gnk-market-route'),PRIMARY_API_PATH);

 const ignored=await servePublicMarketData(new Request('https://gnk-asg.hr/data/market.json'),env);
 assert.equal(ignored,null);
}finally{globalThis.fetch=originalFetch;}

console.log(JSON.stringify({ok:true,version:VERSION,paths:[PRIMARY_API_PATH,PUBLIC_API_PATH],independentLiveProvider:true,staleFallbackExplicit:true},null,2));
