import fs from 'node:fs';
import assert from 'node:assert/strict';

const menu=fs.readFileSync('apps/portal/assets/public-unified-menu-v6.js','utf8');
const design=fs.readFileSync('apps/portal/assets/public-unified-design-v3.js','utf8');
const editorial=fs.readFileSync('apps/portal/assets/index-editorial-order-v6.js','utf8');
const contrast=fs.readFileSync('apps/portal/assets/public-contrast-hardening-v1.js','utf8');
const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v21.js','utf8');
const wrapper=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v22.js','utf8');
const config=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml','utf8');
const signature=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js','utf8');
const contract=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-signature-contract-v1.js','utf8');

assert.match(menu,/__GNK_UNIFIED_MENU_V6__/);
assert.match(menu,/body>header:not\(#gnk-unified-header\)/);
assert.match(menu,/#gnk-unified-header\{display:block!important;visibility:visible!important/);
assert.match(menu,/document\.body\.prepend\(header\)/);
assert.match(menu,/width:64px!important;height:66px!important/);
assert.match(menu,/ADMIN CENTER/);
assert.match(menu,/WORKERI I OPERACIJE/);
assert.match(menu,/Worker Operations/);
assert.match(menu,/Objave/);
assert.match(menu,/Newsroom/);
assert.doesNotMatch(menu,/body>header,\.site-header/);

assert.match(design,/__GNK_UNIFIED_DESIGN_V3__/);
assert.match(design,/--gnk-logo-standard-w:64px/);
assert.match(design,/--gnk-logo-standard-h:66px/);
assert.match(design,/img\.width=64;img\.height=66/);
assert.match(contrast,/__GNK_CONTRAST_HARDENING_V1__/);
assert.match(contrast,/__GNK_CONTRAST_HARDENING_V2__/);
assert.match(contrast,/__GNK_CONTRAST_HARDENING_V3__/);
assert.match(contrast,/GNK_CONTRAST_HARDENING_V3_20260714_GRADIENT_AND_PROTECTED_UI/);
assert.match(contrast,/GNK_CONTRAST_HARDENING_V2_20260714_DYNAMIC_RECHECK/);
assert.match(contrast,/targetRatio\(el\)/);
assert.match(contrast,/current\+0\.05<target/);
assert.match(contrast,/\.group-section \.group-card/);
assert.match(contrast,/gradientColor/);
assert.match(contrast,/MutationObserver/);

assert.match(editorial,/__GNK_INDEX_EDITORIAL_ORDER_V6__/);
assert.match(editorial,/Objave, vijesti, analize i komentari/);
assert.match(editorial,/Publications, news, analyses and commentary/);
assert.match(editorial,/\/api\/public-news\?limit=100/);
assert.match(editorial,/\/data\/news\.json/);
assert.match(editorial,/gnk-news-100/);
assert.match(editorial,/transparentno-upravljanje-kao-operativni-standard/);

assert.match(worker,/GNK_ASG_UNIFIED_AUTH_V31_MAIL_NEWS_CONTRAST/);
assert.match(worker,/public-unified-menu-v6\.js/);
assert.match(worker,/public-contrast-hardening-v1\.js/);
assert.match(worker,/index-editorial-order-v6\.js/);
assert.match(worker,/mail-studio-ui-v28\.js/);
assert.match(worker,/handleContactStudio/);
assert.match(wrapper,/GNK_ASG_UNIFIED_AUTH_V32_DETAILED_EMAIL_STATUS_RECEIPT/);
assert.match(wrapper,/index-unified-auth-v21\.js/);
assert.match(wrapper,/handleEmailStatusRequest/);
assert.match(config,/main = "src\/index-unified-auth-v22\.js"/);

for(const source of [signature,contract]){
 assert.match(source,/width="64" height="66"/);
 assert.doesNotMatch(source,/width="108"|height="111"/);
}

console.log(JSON.stringify({ok:true,menu:'visible-v6-full-workers',logo:'64x66-everywhere',editorial:'100-news-publications-analyses-commentary',contrast:'hardened-v3-gradient-protected-ui',worker:'v32-over-v31',deployPerformed:false},null,2));
