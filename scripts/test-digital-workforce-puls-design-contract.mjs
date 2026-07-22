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
assert.match(html,/\.dw-shell\{background:#000!important\}/);
assert.match(html,/\.dw-tabs button\.active\{background:rgba\(215,181,91,\.13\)!important;color:#f2d27d!important\}/);
assert.doesNotMatch(html,/radial-gradient\([^)]*(?:06b6d4|22d3ee|0891b2|0ea5e9)/i);

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

console.log(JSON.stringify({
  ok:true,
  contract:'digital-workforce-puls-trzista-public-redesign',
  tabs:11,
  palette:'pure-black-glass-gold-white',
  accessibility:'linked-tabs-focus-visible-keyboard-navigation',
  files:[
    'apps/portal/digital-workforce/index.html',
    'apps/portal/assets/digital-workforce-suite-v1.css',
    'apps/portal/assets/digital-workforce-suite-v1.js'
  ]
},null,2));
