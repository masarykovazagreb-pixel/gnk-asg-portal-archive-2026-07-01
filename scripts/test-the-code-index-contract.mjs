import fs from 'node:fs';
import assert from 'node:assert/strict';

const release=fs.readFileSync('apps/portal/assets/release-completion-v1.js','utf8');
const experience=fs.readFileSync('apps/portal/assets/the-code-experience-loop-v1.html','utf8');

assert.match(release,/the-code-experience-loop-v1\.html/);
assert.match(release,/corrected-final/);
assert.match(release,/loading="eager"/);
assert.match(release,/logo-gnk-asg-canonical\.svg/);
assert.match(release,/countdown/i);
assert.doesNotMatch(release,/logo-gnk-dinamo-gold\.svg/);

assert.match(experience,/<section class="scene active" id="s6">/);
assert.match(experience,/<section class="scene" id="s1"/);
assert.match(experience,/show\(scenes\.length-1\)/);
assert.match(experience,/function start\(\).*show\(0\)/s);
assert.match(experience,/function finish\(\).*show\(scenes\.length-1\)/s);
assert.match(experience,/replay\.addEventListener\('click',start\)/);
assert.match(experience,/play\.addEventListener\('click',toggle\)/);
assert.match(experience,/logo-gnk-asg-canonical\.svg/);
assert.match(experience,/2026-10-07T11:30:00-04:00/);
assert.match(experience,/NOTHING<br>WILL EVER<br>BE THE SAME/);
assert.match(experience,/Group net profit/);

console.log(JSON.stringify({ok:true,embeddedOn:['/','/en/'],initialScene:'final-countdown',playFlow:'scene-1-through-scene-6',finalState:'countdown',audio:'user-initiated'},null,2));