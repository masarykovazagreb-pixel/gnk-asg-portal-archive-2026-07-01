import fs from 'node:fs';
import assert from 'node:assert/strict';

const runtime=fs.readFileSync('apps/portal/assets/public-design-runtime-v1.js','utf8');
const tokens=fs.readFileSync('apps/portal/assets/public-design-tokens-v1.css','utf8');
const menu=fs.readFileSync('apps/portal/assets/public-compact-menu-v1.js','utf8');
const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js','utf8');

assert.match(runtime,/__GNK_PUBLIC_DESIGN_RUNTIME_V1__/);
assert.match(runtime,/public-design-tokens-v1\.css/);
assert.match(runtime,/gnk-public-shell-v1/);
assert.match(runtime,/gnk-public-main/);
assert.match(runtime,/noopener/);
assert.match(runtime,/noreferrer/);
for(const prefix of ['/admin','/mail-studio','/campaign-mailer','/operator-dashboard','/webmail'])assert.match(runtime,new RegExp(prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));

for(const token of ['--gnk-navy-900','--gnk-gold-600','--gnk-content','--gnk-radius-lg','--gnk-shadow-md'])assert.ok(tokens.includes(token),`missing ${token}`);
assert.match(tokens,/:focus-visible/);
assert.match(tokens,/prefers-reduced-motion:reduce/);

assert.match(menu,/__GNK_COMPACT_MENU_V3__/);
assert.match(menu,/\/assets\/logo-gnk-asg\.svg/);
assert.match(menu,/className='inner'/);
assert.match(menu,/IZBORNIK/);
assert.match(menu,/aria-controls/);
assert.match(menu,/repeat\(3,minmax\(0,1fr\)\)/);
assert.match(menu,/background:rgba\(255,255,255,\.97\)/);
assert.match(menu,/background:#0b2345/);
assert.doesNotMatch(menu,/gnkMarquee|animation:gnkMarquee/);
assert.doesNotMatch(menu,/THE CODE · NEW YORK/);
assert.doesNotMatch(menu,/brand-mark/);

assert.match(worker,/public-design-runtime-v1\.js/);
assert.match(worker,/x-gnk-public-design/);
assert.match(worker,/isProtected\(pathOf\(request\)\)/);
assert.match(worker,/replace\(\/<script\[\^>\]\+public-design-runtime-v1/);

console.log(JSON.stringify({ok:true,designRuntime:'v1',tokens:'v1',menu:'v3-light-header',protectedRoutesExcluded:true},null,2));
