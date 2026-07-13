import fs from 'node:fs';
import assert from 'node:assert/strict';

const runtime=fs.readFileSync('apps/portal/assets/public-design-runtime-v1.js','utf8');
const tokens=fs.readFileSync('apps/portal/assets/public-design-tokens-v1.css','utf8');
const menu=fs.readFileSync('apps/portal/assets/public-compact-menu-v1.js','utf8');
const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js','utf8');
const sharedEntry=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v17.js','utf8');
const operatorCenter=fs.readFileSync('workers/gnk-asg-operator-center/src/index.js','utf8');

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

assert.match(menu,/__GNK_COMPACT_MENU_V4__/);
assert.match(menu,/\/assets\/logo-gnk-asg-gold\.svg/);
assert.match(menu,/canonical-gold/);
assert.match(menu,/THE CODE · NEW YORK · 7 OCTOBER 2026 · 11:30 AM ET/);
assert.match(menu,/@keyframes gnkEventTicker/);
assert.match(menu,/translateX\(100vw\)/);
assert.match(menu,/translateX\(-100%\)/);
assert.match(menu,/home\.textContent='HOME'/);
assert.match(menu,/hr\.textContent='HR'/);
assert.match(menu,/en\.textContent='EN'/);
assert.match(menu,/english\?'MENU':'IZBORNIK'/);
assert.match(menu,/protectedPage/);
assert.match(menu,/gnk-shared-menu-admin/);
assert.match(menu,/normalizeLogos/);
assert.match(menu,/img\[src\*="logo-gnk-asg"\]/);
assert.match(menu,/background:#0c0a08/);
assert.match(menu,/className='event-track'/);
assert.match(menu,/className='inner'/);
assert.match(menu,/repeat\(3,minmax\(0,1fr\)\)/);
assert.doesNotMatch(menu,/brand-mark/);
assert.doesNotMatch(menu,/if\(protectedPrefixes\.some\([^\n]+\)\)return/);

assert.match(sharedEntry,/GNK_ASG_UNIFIED_AUTH_V63_20260713_SHARED_MENU_ALL_HTML/);
assert.match(sharedEntry,/single-compact-menu-v4-all-html/);
assert.match(sharedEntry,/const isHtmlPage=path=>!path\.startsWith\('\/api\/'\)&&!path\.startsWith\('\/assets\/'\)/);
assert.match(sharedEntry,/if\(menuPage\)scripts\.push/);
assert.match(operatorCenter,/public-compact-menu-v1\.js\?v=20260713-shared-v4/);
assert.match(operatorCenter,/secure-manual-token-v3-shared-menu-v4/);

assert.match(worker,/public-design-runtime-v1\.js/);
assert.match(worker,/x-gnk-public-design/);
assert.match(worker,/isProtected\(pathOf\(request\)\)/);
assert.match(worker,/replace\(\/<script\[\^>\]\+public-design-runtime-v1/);

console.log(JSON.stringify({ok:true,designRuntime:'v1',tokens:'v1',menu:'v4-shared-gold-ticker',controls:['HOME','HR','EN','MENU'],tickerDirection:'right-to-left',publicAndAdmin:true,protectedRoutesExcludedFromPublicRestyle:true},null,2));