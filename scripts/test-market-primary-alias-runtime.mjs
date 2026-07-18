import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('workers/gnk-asg-direct-operator/src/public-market-data-v1.js','utf8');
const client=fs.readFileSync('apps/portal/assets/market.js','utf8');

for(const marker of [
  "PRIMARY_API_PATH='/api/market'",
  "PUBLIC_API_PATH='/api/public-market'",
  'API_PATHS=new Set([PRIMARY_API_PATH,PUBLIC_API_PATH])',
  "['GET','HEAD'].includes(request.method)",
  "'x-gnk-market-route':path",
  "source==='live'?'public, max-age=60, stale-while-revalidate=240':'no-store, max-age=0'",
  "status:'fallback'",
  "stale:age==null||age>86400",
  "status:'unavailable'"
]) assert.ok(source.includes(marker),`missing market runtime contract: ${marker}`);

assert.ok(client.includes("fetch('/api/market"),'frontend must call primary /api/market first');
assert.ok(client.includes("fetch('/api/public-market"),'frontend must retain /api/public-market fallback');
assert.ok(source.includes("CoinGecko public market data"),'live source metadata missing');
assert.ok(source.includes("fallback_reason"),'fallback reason missing');

console.log(JSON.stringify({ok:true,endpoints:['/api/market','/api/public-market'],methods:['GET','HEAD'],liveCacheSeconds:60,fallbackCache:'no-store',deployPerformed:false},null,2));
