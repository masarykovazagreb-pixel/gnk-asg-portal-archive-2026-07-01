import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('apps/portal/digital-workforce/index.html','utf8');
const css=fs.readFileSync('apps/portal/assets/digital-workforce-suite-v1.css','utf8');
const js=fs.readFileSync('apps/portal/assets/digital-workforce-suite-v1.js','utf8');

for(const tab of ['plan','bulletins','projects','risks','opinions','dependencies','tasks','credits','newsroom','workers','log']){
  assert.match(html,new RegExp(`data-dw-tab="${tab}"`));
}

assert.match(html,/dwMetricDay/);
assert.match(html,/dwMetricWorkers/);
assert.match(html,/dwMetricProjects/);
assert.match(html,/Ilustrativni, algoritamski generirani operativni prikaz/);
assert.match(html,/role="tablist"/);
assert.match(html,/role="tabpanel"/);

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
  files:[
    'apps/portal/digital-workforce/index.html',
    'apps/portal/assets/digital-workforce-suite-v1.css',
    'apps/portal/assets/digital-workforce-suite-v1.js'
  ]
},null,2));
