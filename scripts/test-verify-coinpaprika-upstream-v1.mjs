import fs from 'node:fs';
import assert from 'node:assert/strict';

const verifier=fs.readFileSync('scripts/verify-production-release-v38.sh','utf8');
assert.ok(verifier.includes("coinpaprika-tickers"),'production verifier must accept CoinPaprika live upstream');
assert.match(verifier,/coingecko-\(simple-price\|coins-markets\).*coinpaprika-tickers|coinpaprika-tickers.*coingecko-/s,'all approved live upstreams must remain accepted');
console.log(JSON.stringify({ok:true,acceptedUpstreams:['coingecko-simple-price','coingecko-coins-markets','coinpaprika-tickers']},null,2));
