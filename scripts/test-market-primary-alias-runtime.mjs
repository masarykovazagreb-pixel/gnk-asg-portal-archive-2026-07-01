import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('workers/gnk-asg-direct-operator/src/public-market-data-v1.js','utf8');
const client=fs.readFileSync('apps/portal/assets/market.js','utf8');

for(const marker of [
  "GNK_ASG_PUBLIC_MARKET_DATA_V3_20260718_SECONDARY_LIVE",
  "PRIMARY_API_PATH='/api/market'",
  "PUBLIC_API_PATH='/api/public-market'",
  'API_PATHS=new Set([PRIMARY_API_PATH,PUBLIC_API_PATH])',
  "['GET','HEAD'].includes(request.method)",
  "'x-gnk-market-route':path",
  "'x-gnk-market-upstream'",
  "source==='live'?'public, max-age=60, stale-while-revalidate=240':'no-store, max-age=0'",
  'simplePriceLive',
  'marketsLive',
  '/api/v3/coins/markets?',
  "stale:age==null||age>3600",
  "status:'unavailable'"
]) assert.ok(source.includes(marker),`missing market runtime contract: ${marker}`);

assert.ok(client.includes("fetch('/api/market"),'frontend must call primary /api/market first');
assert.ok(client.includes("fetch('/api/public-market"),'frontend must retain /api/public-market fallback');
assert.ok(source.includes("Both live market requests are temporarily unavailable."),'dual-live fallback reason missing');

console.log(JSON.stringify({ok:true,endpoints:['/api/market','/api/public-market'],liveUpstreams:['coingecko-simple-price','coingecko-coins-markets'],fallbackStaleSeconds:3600,deployPerformed:false},null,2));
