import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync('apps/portal/assets/gnkc-stable-index-v1.js','utf8');
const ui=fs.readFileSync('apps/portal/assets/digital-workforce-suite-v1.js','utf8');
const html=fs.readFileSync('apps/portal/digital-workforce/index.html','utf8');

assert.match(index,/MARKET_URL='\/data\/market-pulse\.json'/);
assert.match(index,/USDC:\.5,USDT:\.3,DAI:\.2/);
assert.match(index,/effectiveWeight:x\.weight\/weightSum/);
assert.match(index,/priceEur:eurUsdPrice\?round\(priceUsd\/eurUsdPrice\):null/);
assert.match(index,/deviationPct:round\(\(priceUsd-1\)\*100,4\)/);
assert.match(ui,/GNKC Stable Index/);
assert.match(ui,/Referentni P&amp;L/);
assert.match(ui,/SIMULACIJA/);
assert.match(html,/<p class="dw-disclaimer">SIMULACIJA<\/p>/);
assert.match(html,/gnkc-stable-index-v1\.js/);
assert.match(html,/gnkc-stable-index-v1\.css/);

console.log(JSON.stringify({ok:true,contract:'GNKC stable index uses shared market-pulse source and simulation-only valuation'},null,2));
