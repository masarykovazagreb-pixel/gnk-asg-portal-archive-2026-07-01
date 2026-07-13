import fs from 'node:fs';
import assert from 'node:assert/strict';

const release=fs.readFileSync('apps/portal/assets/release-completion-v1.js','utf8');
const resilience=fs.readFileSync('apps/portal/assets/index-data-resilience-v1.js','utf8');
const editorial=fs.readFileSync('apps/portal/assets/index-editorial-order-v1.js','utf8');

assert.match(release,/GNK_RELEASE_COMPLETION_V8/);
assert.match(release,/release-completion-scaffold/);
assert.match(release,/data-runtime-owner="index-editorial-order"/);
assert.match(release,/data-runtime-owner="index-data-resilience"/);
assert.match(release,/logo-gnk-asg-canonical\.svg/);
assert.match(release,/the-code-experience-loop-v1\.html/);
assert.doesNotMatch(release,/logo-gnk-dinamo-gold\.svg/);
assert.doesNotMatch(release,/renderNews|renderMarkets/);
assert.doesNotMatch(release,/www\.ecb\.europa\.eu|api\.worldbank\.org/);

assert.match(resilience,/__GNK_INDEX_DATA_RESILIENCE_V2__/);
assert.doesNotMatch(resilience,/gnk-editorial-grid|newsFallback/);
assert.match(resilience,/marketFallback/);
assert.match(resilience,/AbortController/);
assert.match(resilience,/marketState='offline'/);

assert.match(editorial,/__GNK_INDEX_EDITORIAL_ORDER_V4__/);
assert.match(editorial,/findHost\(maxAttempts=30,delay=150\)/);
assert.match(editorial,/Promise\.allSettled/);
assert.match(editorial,/AbortController/);
assert.match(editorial,/gnk-source/);
assert.match(editorial,/Source/);
assert.match(editorial,/Izvor/);
assert.match(editorial,/sourceFor/);
assert.match(editorial,/dateFor/);
assert.match(editorial,/limit=18/);
assert.match(editorial,/cards\.length>=6/);
assert.match(editorial,/editorialState=newsCards\.length\?'ready':'empty'/);
assert.match(editorial,/newsSourceVisibility='enabled'/);
for(const marker of ['tehnologija-kapital-i-odgovorno-upravljanje','kapitalna-struktura-i-operativna-otpornost','inovacija-bez-povjerenja-nije-napredak'])assert.match(editorial,new RegExp(marker));

console.log(JSON.stringify({ok:true,owners:{scaffold:'release-completion-v1.js',editorial:'index-editorial-order-v1.js',marketFallback:'index-data-resilience-v1.js'},indexRuntime:'V8',editorialRuntime:'V4',visibleNewsSources:true,minimumStaticEditorialPerSection:3,fetchTimeoutMs:7000},null,2));