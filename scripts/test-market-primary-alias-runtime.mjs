import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('workers/gnk-asg-direct-operator/src/public-market-data-v1.js','utf8');
const client=fs.readFileSync('apps/portal/assets/market.js','utf8');

for(const marker of [
  "GNK_ASG_PUBLIC_MARKET_DATA_V4_20260718_INDEPENDENT_PROVIDER",
  "PRIMARY_API_PATH='/api/market'",
  "PUBLIC_API_PATH='/api/public-market'",
  'API_PATHS=new Set([PRIMARY_API_PATH,PUBLIC_API_PATH])',
  "['GET','HEAD'].includes(request.method)",
  "'x-gnk-market-route':path",
  "'x-gnk-market-upstream'",
  "source==='live'?'public, max-age=60, stale-while-revalidate=240':'no-store, max-age=0'",
  'simplePriceLive',
  'marketsLive',
  'coinPaprikaLive',
  'coinPaprikaTicker',
  'PAPRIKA_IDS',
  'api.coinpaprika.com/v1/tickers/${paprikaId}',
  'coinpaprika-tickers',
  "stale:age==null||age>3600",
  "status:'unavailable'"
]) assert.ok(source.includes(marker),`missing market runtime contract: ${marker}`);

assert.ok(client.includes("fetch('/api/market"),'frontend must call primary /api/market first');
assert.ok(client.includes("fetch('/api/public-market"),'frontend must retain /api/public-market fallback');
assert.ok(source.includes('All live market providers are temporarily unavailable.'),'all-provider fallback reason missing');
assert.doesNotMatch(source,/api\.coinpaprika\.com\/v1\/tickers\?quotes=/,'unbounded CoinPaprika catalog must not be used');
assert.match(source,/Promise\.allSettled/,'bounded provider must tolerate individual ticker failures');
assert.match(source,/ordered\.length<8/,'bounded provider must retain the eight-coin live minimum');

console.log(JSON.stringify({ok:true,endpoints:['/api/market','/api/public-market'],liveUpstreams:['coingecko-simple-price','coingecko-coins-markets','coinpaprika-tickers'],fallbackStaleSeconds:3600,deployPerformed:false},null,2));
