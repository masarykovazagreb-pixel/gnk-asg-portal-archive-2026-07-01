import fs from 'node:fs';
import assert from 'node:assert/strict';

const resilience=fs.readFileSync('apps/portal/assets/index-data-resilience-v1.js','utf8');
const editorial=fs.readFileSync('apps/portal/assets/index-editorial-order-v1.js','utf8');

assert.match(resilience,/__GNK_INDEX_DATA_RESILIENCE_V2__/);
assert.doesNotMatch(resilience,/gnk-editorial-grid/);
assert.doesNotMatch(resilience,/newsFallback/);
assert.match(resilience,/marketFallback/);
assert.match(resilience,/AbortController/);
assert.match(resilience,/marketState='offline'/);

assert.match(editorial,/__GNK_INDEX_EDITORIAL_ORDER_V3__/);
assert.match(editorial,/findHost\(maxAttempts=20,delay=150\)/);
assert.doesNotMatch(editorial,/setTimeout\(build,150\)/);
assert.match(editorial,/Promise\.allSettled/);
assert.match(editorial,/AbortController/);
assert.match(editorial,/gnk-index-empty/);
assert.match(editorial,/noopener noreferrer nofollow/);
assert.match(editorial,/editorialState=newsCards\.length\?'ready':'empty'/);

console.log(JSON.stringify({ok:true,owners:{editorial:'index-editorial-order-v1.js',marketFallback:'index-data-resilience-v1.js'},boundedHostWaitMs:3000,fetchTimeoutMs:7000},null,2));
