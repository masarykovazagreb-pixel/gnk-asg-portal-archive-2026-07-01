import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('apps/portal/digital-workforce/index.html','utf8');
const css=fs.readFileSync('apps/portal/assets/digital-workforce-suite-v1.css','utf8');
const js=fs.readFileSync('apps/portal/assets/digital-workforce-suite-v1.js','utf8');

for(const tab of ['plan','bulletins','projects','risks','opinions','dependencies','tasks','credits','newsroom','workers','log']){
  assert.match(html,new RegExp(`data-dw-tab="${tab}"`));
  assert.match(html,new RegExp(`id="dw-tab-${tab}"`));
}

assert.match(html,/dwMetricDay/);
assert.match(html,/dwMetricWorkers/);
assert.match(html,/dwMetricProjects/);
assert.match(html,/GNK DINAMO Ltd grupa/);
assert.match(html,/GNK ASG/);
assert.match(html,/SIMULACIJA/);
assert.match(html,/role="tablist"/);
assert.match(html,/role="tabpanel"/);
assert.match(html,/aria-controls="dwContent"/);
assert.match(html,/aria-labelledby="dw-tab-plan"/);
assert.match(html,/tabindex="-1"/);
assert.match(html,/\.dw-tabs button:focus-visible\{outline:3px solid #f2d27d!important/);

// Visual contract: the private preview must remain pure black, glass-black and gold/white.
assert.match(html,/html,body,\.dw-private-preview\{background:#000!important;background-image:none!important/);
assert.match(html,/#gnk-unified-header\{background:rgba\(0,0,0,\.86\)!important/);
assert.match(html,/\.dw-shell\{background:#000!important;min-width:0!important\}/);
assert.match(html,/\.dw-tabs button\.active\{background:rgba\(215,181,91,\.13\)!important;color:#f2d27d!important\}/);
assert.doesNotMatch(html,/radial-gradient\([^)]*(?:06b6d4|22d3ee|0891b2|0ea5e9)/i);

// Responsive contract: wide components scroll internally and do not widen the page.
assert.match(html,/\.dw-tabs\{display:flex!important;max-width:100%!important;overflow-x:auto!important/);
assert.match(html,/\.dw-tabs button\{flex:0 0 auto!important;min-height:44px!important;white-space:nowrap!important/);
assert.match(html,/\.dw-table\{max-width:100%!important;overflow-x:auto!important/);
assert.match(html,/\.dw-table table\{min-width:760px!important\}/);
assert.match(html,/@media \(max-width:900px\).*\.dw-metrics\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important\}.*\.dw-toolbar\{grid-template-columns:1fr!important\}/s);
assert.match(html,/@media \(max-width:560px\).*\.dw-metrics\{grid-template-columns:1fr!important\}.*\.dw-tabs\{margin-inline:-12px!important/s);

assert.match(css,/--dw-bg:#030303/);
assert.match(css,/--dw-gold:#d7b55b/);
assert.match(css,/backdrop-filter:blur/);
assert.match(css,/\.dw-badge\.is-success/);
assert.match(css,/\.dw-badge\.is-warning/);
assert.match(css,/\.dw-badge\.is-danger/);
assert.match(css,/prefers-reduced-motion/);

assert.match(js,/with.*statusClass|const statusClass/);
assert.match(js,/dwWorkerSearch/);
assert.match(js,/aria-selected/);
assert.match(js,/ArrowLeft/);
assert.match(js,/Pokušaj ponovno/);
assert.match(js,/Motor .*dan/);
assert.match(js,/let activeTab=null/);
assert.match(js,/if\(active\)activeTab=tab/);
assert.match(js,/host\.setAttribute\('aria-labelledby',activeTab\.id\)/);

// Resilience contract: unrelated tabs must not depend on the projects endpoint.
assert.match(js,/if\(name==='workers'&&!state\.projects\)state\.projects=await get\('projects',controller\.signal\)/);
assert.doesNotMatch(js,/if\(!state\.projects\)state\.projects=await get\('projects'/);
assert.match(js,/if\(!host\|\|!views\[name\]\)return/);
assert.match(js,/class="dw-error" role="alert"/);
assert.match(js,/requestAnimationFrame\(\(\)=>retry\?\.focus\(\)\)/);

// Concurrency contract: stale tab and worker-filter responses must never overwrite the latest view.
assert.match(js,/let activeRequestId=0/);
assert.match(js,/let activeController=null/);
assert.match(js,/const requestId=\+\+activeRequestId/);
assert.match(js,/activeController\?\.abort\(\)/);
assert.match(js,/const controller=new AbortController\(\)/);
assert.match(js,/signal:controller\.signal|controller\.signal/);
assert.match(js,/if\(requestId!==activeRequestId\)return/);
assert.match(js,/if\(error\?\.name==='AbortError'\|\|requestId!==activeRequestId\)return/);
assert.match(js,/if\(requestId===activeRequestId\)\{/);
assert.match(js,/if\(activeController===controller\)activeController=null/);

console.log(JSON.stringify({
  ok:true,
  contract:'digital-workforce-puls-trzista-public-redesign',
  tabs:11,
  palette:'pure-black-glass-gold-white',
  accessibility:'linked-tabs-dynamic-panel-label-focus-visible-keyboard-navigation-retry-focus',
  responsive:'contained-tabs-worker-table-touch-targets',
  resilience:'isolated-tab-api-failures-worker-project-dependency-only',
  concurrency:'abort-previous-request-ignore-stale-response',
  files:[
    'apps/portal/digital-workforce/index.html',
    'apps/portal/assets/digital-workforce-suite-v1.css',
    'apps/portal/assets/digital-workforce-suite-v1.js'
  ]
},null,2));
