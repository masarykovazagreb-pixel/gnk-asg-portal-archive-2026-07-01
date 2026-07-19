import fs from 'node:fs';
import assert from 'node:assert/strict';
import {servePublicMarketData,VERSION,PRIMARY_API_PATH,PUBLIC_API_PATH,API_PATHS,OFFICIAL_SOURCE_POLICY} from '../workers/gnk-asg-direct-operator/src/public-market-data-v1.js';

const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js','utf8');
const client=fs.readFileSync('apps/portal/assets/market.js','utf8');
const institutionalClient=fs.readFileSync('apps/portal/assets/public-market-live-v1.js','utf8');
const fallback=JSON.parse(fs.readFileSync('apps/portal/data/market.json','utf8'));
assert.equal(PRIMARY_API_PATH,'/api/market');
assert.equal(PUBLIC_API_PATH,'/api/public-market');
assert.deepEqual([...API_PATHS],[PRIMARY_API_PATH,PUBLIC_API_PATH]);
assert.match(VERSION,/GNK_ASG_PUBLIC_MARKET_DATA_V6_20260719_OFFICIAL_INSTITUTIONAL_SERVER_SIDE/);
assert.equal(OFFICIAL_SOURCE_POLICY.browser_direct_external_requests,false);
assert.equal(OFFICIAL_SOURCE_POLICY.providers.length,2);
assert.match(worker,/servePublicMarketData/);
assert.match(worker,/MARKET_ORIGIN/);
assert.match(client,/fetch\('\/api\/market/);
assert.match(client,/fetch\('\/api\/public-market/);
assert.match(client,/zastarjeli rezervni presjek/);
assert.match(institutionalClient,/\/api\/public-market/);
assert.match(institutionalClient,/\/api\/market/);
assert.doesNotMatch(institutionalClient,/https:\/\/(?:www\.ecb\.europa\.eu|api\.worldbank\.org)/);
assert.doesNotMatch(institutionalClient,/DOMParser/);
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


 globalThis.fetch=async input=>{
  const url=String(input);
  if(url.includes('api.coingecko.com'))return new Response(JSON.stringify(simplePayload),{status:200,headers:{'content-type':'application/json'}});
  if(url.includes('ecb.europa.eu'))return new Response(`<gesmes:Envelope><Cube><Cube time='2026-07-18'><Cube currency='USD' rate='1.16'/><Cube currency='GBP' rate='0.87'/><Cube currency='CHF' rate='0.93'/></Cube></Cube></gesmes:Envelope>`,{status:200,headers:{'content-type':'application/xml'}});
  if(url.includes('api.worldbank.org')){const value=url.includes('NY.GDP.MKTP.KD.ZG')?3.2:2.4;const rows=['HRV','EUU','USA'].map((countryiso3code,index)=>({countryiso3code,date:'2025',value:value+index/10}));return new Response(JSON.stringify([{},rows]),{status:200,headers:{'content-type':'application/json'}});}
  return new Response('not found',{status:404});
 };
 const official=await servePublicMarketData(new Request(`https://gnk-asg.hr${PUBLIC_API_PATH}`),{});
 assert.equal(official.status,200);
 const officialData=await official.json();
 assert.equal(officialData.institutional.status,'ok');
 assert.equal(officialData.institutional.fx.base,'EUR');
 assert.equal(officialData.institutional.fx.rates.USD,1.16);
 assert.equal(officialData.institutional.indicators.gdp_growth.values.HRV.value,3.2);
 assert.equal(officialData.source_policy.browser_direct_external_requests,false);
 assert.ok(officialData.source_policy.providers.every(provider=>provider.kind==='official-public-data'&&provider.cache_ttl_seconds>=3600&&provider.max_upstream_requests_per_refresh>=1));


 const paprikaSymbols={
  'btc-bitcoin':'BTC','eth-ethereum':'ETH','sol-solana':'SOL','xrp-xrp':'XRP',
  'bnb-binance-coin':'BNB','ada-cardano':'ADA','link-chainlink':'LINK','avax-avalanche':'AVAX',
  'usdt-tether':'USDT','usdc-usd-coin':'USDC','dai-dai':'DAI','eurc-euro-coin':'EURC'
 };
 globalThis.fetch=async input=>{
  const url=String(input);
  if(url.includes('api.coingecko.com'))return new Response('rate limited',{status:429});
  const match=url.match(/\/v1\/tickers\/([^?]+)/);
  assert.ok(match,'expected bounded CoinPaprika ticker URL');
  const paprikaId=decodeURIComponent(match[1]),symbol=paprikaSymbols[paprikaId];
  if(!symbol)return new Response('missing',{status:404});
  const requested=(new URL(url)).searchParams.get('quotes').split(',');
  const quotes=Object.fromEntries(requested.map((code,index)=>[code,{price:index+10,percent_change_24h:index+1}]));
  return new Response(JSON.stringify({id:paprikaId,symbol,rank:1,last_updated:'2026-07-19T00:00:00Z',quotes}),{status:200,headers:{'content-type':'application/json'}});
 };
 const paprika=await servePublicMarketData(new Request(`https://gnk-asg.hr${PUBLIC_API_PATH}`),{});
 assert.equal(paprika.status,200);
 assert.equal(paprika.headers.get('x-gnk-market-source'),'live');
 assert.equal(paprika.headers.get('x-gnk-market-upstream'),'coinpaprika-tickers');
 const paprikaData=await paprika.json();
 assert.equal(paprikaData.status,'ok');
 assert.equal(paprikaData.stale,false);
 assert.ok(paprikaData.coins.length>=8);
 assert.ok(paprikaData.coins.every(item=>['eur','usd','gbp','chf','jpy'].every(code=>Number.isFinite(Number(item.prices[code])))));

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

console.log(JSON.stringify({ok:true,version:VERSION,paths:[PRIMARY_API_PATH,PUBLIC_API_PATH],independentLiveProvider:true,officialInstitutionalServerSide:true,browserDirectExternalRequests:false,staleFallbackExplicit:true},null,2));
