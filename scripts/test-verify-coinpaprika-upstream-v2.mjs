import fs from 'node:fs';
import assert from 'node:assert/strict';

const verifier=fs.readFileSync('scripts/verify-production-release-v38.sh','utf8');
assert.ok(verifier.includes("x-gnk-market-source: live"),'static fallback must remain rejected');
assert.ok(verifier.includes("coinpaprika-tickers"),'CoinPaprika live upstream must be accepted');
assert.ok(verifier.includes("coingecko-(simple-price|coins-markets)"),'CoinGecko live upstreams must remain accepted');
console.log(JSON.stringify({ok:true,staticFallbackRejected:true,coinPaprikaAccepted:true},null,2));
