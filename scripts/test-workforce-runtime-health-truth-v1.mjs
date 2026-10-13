import assert from 'node:assert/strict';
import fs from 'node:fs';

const file='workers/gnk-asg-direct-operator/src/index-digital-workforce-v1.js';
const src=fs.readFileSync(file,'utf8');
const api=fs.readFileSync('workers/gnk-asg-direct-operator/src/digital-workforce-api-v1.js','utf8');
const client=fs.readFileSync('apps/portal/assets/digital-workforce-suite-v1.js','utf8');
const publicPage=fs.readFileSync('apps/portal/digital-workforce/index.html','utf8');

assert.match(src,/STATE_PATH='\/api\/public\/digital-workforce\/state'/);
assert.match(src,/HEALTH_PATH='\/api\/public\/digital-workforce\/health'/);
assert.match(src,/telemetryMode:'hybrid-model-plus-runtime-health'/);
assert.match(src,/status:'simulated-model-state'/);
assert.match(src,/lastRun:'generated-at-request-time-not-runtime-evidence'/);
assert.match(src,/runtimeHealth:\{/);
assert.match(src,/verified:Boolean\(healthResponse\?\.ok&&health\?\.ok===true\)/);
assert.match(src,/x-gnk-workforce-telemetry-mode/);
assert.doesNotMatch(src,/runtimeHealth:\{verified:true/);
assert.match(api,/SELECT 1 AS ok/,'health must execute a read-only D1 connectivity probe');
assert.match(api,/editorDeskStore/,'health must distinguish the D1 binding from the required store query');
assert.match(client,/updateRuntimeStatus\(d\.runtimeHealth\)/,'the public UI must render runtime evidence from the Worker state response');
assert.match(client,/runtime\?\.verified===true/,'only positive runtime evidence may select the healthy indicator');
assert.match(client,/T\.modelStatusLabel/,'simulated model status must not be mislabeled as runtime health');
assert.doesNotMatch(publicPage,/Sustav uživo/,'the Croatian page must not claim that the system is live before health verification');
assert.doesNotMatch(fs.readFileSync('apps/portal/en/digital-workforce/index.html','utf8'),/System live/,'the English page must not claim that the system is live before health verification');

console.log(JSON.stringify({ok:true,contract:'worker-health-probe-and-ui-status-truth',runtimeHealthEndpoint:'/api/public/digital-workforce/health'},null,2));
