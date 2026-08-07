import assert from 'node:assert/strict';
import fs from 'node:fs';

const file='workers/gnk-asg-direct-operator/src/index-digital-workforce-v1.js';
const src=fs.readFileSync(file,'utf8');

assert.match(src,/STATE_PATH='\/api\/public\/digital-workforce\/state'/);
assert.match(src,/HEALTH_PATH='\/api\/public\/digital-workforce\/health'/);
assert.match(src,/telemetryMode:'hybrid-model-plus-runtime-health'/);
assert.match(src,/status:'simulated-model-state'/);
assert.match(src,/lastRun:'generated-at-request-time-not-runtime-evidence'/);
assert.match(src,/runtimeHealth:\{/);
assert.match(src,/verified:Boolean\(healthResponse\?\.ok&&health\?\.ok===true\)/);
assert.match(src,/x-gnk-workforce-telemetry-mode/);
assert.doesNotMatch(src,/runtimeHealth:\{verified:true/);

console.log(JSON.stringify({ok:true,contract:'workforce-state-must-distinguish-simulated-model-from-runtime-health',runtimeHealthEndpoint:'/api/public/digital-workforce/health'},null,2));
