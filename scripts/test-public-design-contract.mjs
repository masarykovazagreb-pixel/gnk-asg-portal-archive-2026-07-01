import fs from 'node:fs';
import assert from 'node:assert/strict';

const runtime=fs.readFileSync('apps/portal/assets/public-design-runtime-v1.js','utf8');
const tokens=fs.readFileSync('apps/portal/assets/public-design-tokens-v1.css','utf8');
const menu=fs.readFileSync('apps/portal/assets/public-compact-menu-v1.js','utf8');
const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js','utf8');
const logo=fs.readFileSync('apps/portal/assets/logo-gnk-asg-canonical.svg','utf8');

assert.match(runtime,/__GNK_UNIFIED_DESIGN_V2__/);
assert.match(runtime,/public-design-tokens-v1\.css/);
assert.match(runtime,/gnk-public-main/);
assert.match(runtime,/logo-gnk-asg-canonical\.svg/);
assert.match(runtime,/repairContrast/);
assert.match(runtime,/gnk-contrast-dark/);
assert.match(runtime,/gnk-contrast-light/);
assert.match(runtime,/removeLegacyTicker/);
assert.match(runtime,/if\(!isIndex\)/);
assert.doesNotMatch(runtime,/protectedPrefixes|isProtected/);

for(const token of ['--gnk-navy-900','--gnk-gold-600','--gnk-content','--gnk-radius-lg','--gnk-shadow-md'])assert.ok(tokens.includes(token),`missing ${token}`);
assert.match(tokens,/:focus-visible/);
assert.match(tokens,/prefers-reduced-motion:reduce/);
assert.match(tokens,/\.gnk-contrast-dark/);
assert.match(tokens,/\.gnk-contrast-light/);
assert.match(tokens,/input:not\(\[type=checkbox\]/);

assert.match(menu,/__GNK_UNIFIED_MENU_V4__/);
assert.match(menu,/logo-gnk-asg-canonical\.svg/);
assert.match(menu,/data-gnk-unified-shell/);
assert.match(menu,/ADMIN \/ ADMIN CENTER/);
assert.match(menu,/Contact cases/);
assert.match(menu,/IZBORNIK/);
assert.match(menu,/aria-controls/);
assert.match(menu,/repeat\(3,minmax\(0,1fr\)\)/);
assert.match(menu,/if\(!isIndex\).*ticker/s);
assert.doesNotMatch(menu,/gnkMarquee|animation:gnkMarquee|brand-mark/);
assert.doesNotMatch(menu,/logo-gnk-asg\.svg/);

assert.match(logo,/Official gold GNK ASG corporate logo/);
assert.match(logo,/data:image\/png;base64/);

assert.match(worker,/public-design-runtime-v1\.js/);
assert.match(worker,/x-gnk-public-design/);
assert.match(worker,/x-gnk-unified-menu/);
assert.match(worker,/public-and-protected/);
assert.match(worker,/\[200,401,403,503\]/);
assert.doesNotMatch(worker,/isProtected\(pathOf\(request\)\)/);

console.log(JSON.stringify({ok:true,designRuntime:'v2-unified',tokens:'v2-contrast',menu:'v4-public-and-protected',canonicalLogo:true,ticker:'index-only',protectedRoutesIncluded:true},null,2));