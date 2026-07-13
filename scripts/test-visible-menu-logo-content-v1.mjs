import fs from 'node:fs';
import assert from 'node:assert/strict';

const menu=fs.readFileSync('apps/portal/assets/public-unified-menu-v5.js','utf8');
const design=fs.readFileSync('apps/portal/assets/public-unified-design-v3.js','utf8');
const editorial=fs.readFileSync('apps/portal/assets/index-editorial-order-v5.js','utf8');
const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v20.js','utf8');
const config=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml','utf8');
const signature=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js','utf8');
const contract=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-signature-contract-v1.js','utf8');

assert.match(menu,/__GNK_UNIFIED_MENU_V5__/);
assert.match(menu,/body>header:not\(#gnk-unified-header\)/);
assert.match(menu,/#gnk-unified-header\{display:block!important;visibility:visible!important/);
assert.match(menu,/document\.body\.prepend\(header\)/);
assert.match(menu,/width:64px!important;height:66px!important/);
assert.match(menu,/ADMIN \/ ADMIN CENTER/);
assert.match(menu,/Objave/);
assert.match(menu,/Newsroom/);
assert.doesNotMatch(menu,/body>header,\.site-header/);

assert.match(design,/__GNK_UNIFIED_DESIGN_V3__/);
assert.match(design,/--gnk-logo-standard-w:64px/);
assert.match(design,/--gnk-logo-standard-h:66px/);
assert.match(design,/public-unified-menu-v5\.js/);
assert.match(design,/img\.width=64;img\.height=66/);

assert.match(editorial,/__GNK_INDEX_EDITORIAL_ORDER_V5__/);
assert.match(editorial,/Objave i poslovne vijesti/);
assert.match(editorial,/Publications and business news/);
assert.match(editorial,/fallbackNews/);
assert.match(editorial,/\/api\/public-news\?limit=12/);
assert.match(editorial,/\/data\/news\.json/);
assert.match(editorial,/tehnologija-kapital-i-odgovorno-upravljanje/);
assert.match(editorial,/gnk-index-editorial-fallback/);

assert.match(worker,/GNK_ASG_UNIFIED_AUTH_V30_VISIBLE_MENU_STANDARD_LOGO/);
assert.match(worker,/public-unified-design-v3\.js/);
assert.match(worker,/public-unified-menu-v5\.js/);
assert.match(worker,/index-editorial-order-v5\.js/);
assert.match(worker,/x-gnk-public-design-current','v3-logo-standard/);
assert.match(worker,/x-gnk-unified-menu-current','visible-v5/);
assert.match(worker,/x-gnk-logo-standard','64x66/);
assert.match(worker,/x-gnk-explicit-html-route/);
assert.match(config,/main = "src\/index-unified-auth-v20\.js"/);

for(const source of [signature,contract]){
 assert.match(source,/width="64" height="66"/);
 assert.doesNotMatch(source,/width="108"|height="111"/);
}

console.log(JSON.stringify({ok:true,menu:'visible-v5',logo:'64x66-everywhere',editorial:'publications-and-news-guaranteed',worker:'v30',deployPerformed:false},null,2));