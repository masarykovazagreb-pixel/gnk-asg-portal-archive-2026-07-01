import fs from 'node:fs';
import assert from 'node:assert/strict';
import {servePublicMarketData,VERSION,API_PATH} from '../workers/gnk-asg-direct-operator/src/public-market-data-v1.js';

const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js','utf8');
const client=fs.readFileSync('apps/portal/assets/market.js','utf8');
const fallback=JSON.parse(fs.readFileSync('apps/portal/data/market.json','utf8'));
assert.equal(API_PATH,'/api/public-market');
assert.match(VERSION,/GNK_ASG_PUBLIC_MARKET_DATA_V1_20260715/);
assert.match(worker,/servePublicMarketData/);
assert.match(worker,/MARKET_ORIGIN/);
assert.match(client,/fetch\('\/api\/public-market/);
assert.match(client,/zastarjeli rezervni presjek/);
assert.match(client,/stale:age > 86400000/);
assert.ok(Date.parse(fallback.updated_at),'fallback timestamp required');

const originalFetch=globalThis.fetch;
try{
 globalThis.fetch=async()=>new Response(JSON.stringify({bitcoin:{eur:1,usd:2,gbp:3,chf:4,jpy:5,eur_24h_change:1,usd_24h_change:2,gbp_24h_change:3,chf_24h_change:4,jpy_24h_change:5,last_updated_at:123}}),{status:200,headers:{'content-type':'application/json'}});
 const live=await servePublicMarketData(new Request('https://gnk-asg.hr/api/public-market'),{});
 assert.equal(live.status,200);
 assert.equal(live.headers.get('x-gnk-market-source'),'live');
 const liveData=await live.json();
 assert.equal(liveData.status,'ok');
 assert.equal(liveData.stale,false);
 assert.equal(liveData.coins[0].symbol,'BTC');

 globalThis.fetch=async()=>new Response('rate limited',{status:429});
 const env={ASSETS:{fetch:async()=>new Response(JSON.stringify(fallback),{status:200,headers:{'content-type':'application/json'}})}};
 const stored=await servePublicMarketData(new Request('https://gnk-asg.hr/api/public-market'),env);
 assert.equal(stored.status,200);
 assert.equal(stored.headers.get('x-gnk-market-source'),'fallback');
 const storedData=await stored.json();
 assert.equal(storedData.status,'fallback');
 assert.equal(typeof storedData.stale,'boolean');
 assert.ok(Number.isFinite(storedData.age_seconds) && storedData.age_seconds>=0);
 assert.equal(storedData.coins[0].symbol,'BTC');

 const ignored=await servePublicMarketData(new Request('https://gnk-asg.hr/data/market.json'),env);
 assert.equal(ignored,null);
}finally{globalThis.fetch=originalFetch;}

console.log(JSON.stringify({ok:true,version:VERSION,path:API_PATH,sameOrigin:true,staleFallbackExplicit:true},null,2));
