import fs from 'node:fs';
import assert from 'node:assert/strict';

const menu=fs.readFileSync('apps/portal/assets/public-compact-menu-v1.js','utf8');
const runtime=fs.readFileSync('apps/portal/assets/public-design-runtime-v1.js','utf8');
const release=fs.readFileSync('apps/portal/assets/release-completion-v1.js','utf8');
const signature=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js','utf8');
const mime=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-brand-mime-v1.js','utf8');
const endpoint=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-logo-endpoint-v1.js','utf8');

for(const source of [menu,runtime,release])assert.match(source,/logo-gnk-asg-canonical\.svg/);
assert.match(menu,/ADMIN \/ ADMIN CENTER/);
assert.match(menu,/public-and-protected|data-gnk-unified-shell|gnk-unified-header/);
assert.match(menu,/if\(!isIndex\)/);
assert.match(menu,/\.ticker,#ticker/);
assert.match(runtime,/removeLegacyTicker/);
assert.match(runtime,/if\(!isIndex\)/);
assert.doesNotMatch(menu,/logo-gnk-asg\.svg|logo-gnk-asg-gold\.svg|logo-gnk-dinamo-gold\.svg/);
assert.doesNotMatch(runtime,/logo-gnk-asg\.svg|logo-gnk-asg-gold\.svg|logo-gnk-dinamo-gold\.svg/);
assert.doesNotMatch(release,/logo-gnk-asg-gold\.svg|logo-gnk-dinamo-gold\.svg/);

assert.match(signature,/logo-gnk-asg-email\.png/);
assert.match(mime,/logo-gnk-asg-email\.png/);
assert.match(endpoint,/CANONICAL_PNG/);
assert.match(endpoint,/content-type':'image\/png/);
assert.match(endpoint,/same-as-portal/);
assert.doesNotMatch(signature,/logo-gnk-asg-email\.jpg/);
assert.doesNotMatch(mime,/logo-gnk-asg-email\.jpg/);

console.log(JSON.stringify({ok:true,canonicalPortalLogo:'logo-gnk-asg-canonical.svg',canonicalEmailLogo:'logo-gnk-asg-email.png',menu:'shared-public-admin',ticker:'index-only'},null,2));