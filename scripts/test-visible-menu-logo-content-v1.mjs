import fs from 'node:fs';
import assert from 'node:assert/strict';

const menu=fs.readFileSync('apps/portal/assets/public-unified-menu-v6.js','utf8');
const design=fs.readFileSync('apps/portal/assets/public-unified-design-v3.js','utf8');
const adminCenter=fs.readFileSync('apps/portal/admin-center/index.html','utf8');
const headquarters=fs.readFileSync('apps/portal/digital-headquarters/index.html','utf8');
const digitalWorkforce=fs.readFileSync('apps/portal/digital-workforce/index.html','utf8');
const workforceAdmin=fs.readFileSync('apps/portal/admin-center/workers/index.html','utf8');
const workforceDirectory=fs.readFileSync('apps/portal/assets/workers-directory-v1.js','utf8');
const workforceUi=fs.readFileSync('apps/portal/assets/digital-workforce-suite-v1.js','utf8');
const workforceApi=fs.readFileSync('workers/gnk-asg-direct-operator/src/digital-workforce-suite-v1.js','utf8');
const editorial=fs.readFileSync('apps/portal/assets/index-editorial-order-v6.js','utf8');
const contrast=fs.readFileSync('apps/portal/assets/public-contrast-hardening-v1.js','utf8');
const worker=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v21.js','utf8');
const wrapper=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v22.js','utf8');
const editorialWrapper=fs.readFileSync('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js','utf8');
const editorialRouter=fs.readFileSync('workers/gnk-asg-direct-operator/src/public-editorial-asset-router-v1.js','utf8');
const config=fs.readFileSync('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml','utf8');
const signature=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-brand-signature-v1.js','utf8');
const contract=fs.readFileSync('workers/gnk-asg-direct-operator/src/email-signature-contract-v1.js','utf8');

assert.match(menu,/__GNK_UNIFIED_MENU_V6__/);
assert.match(menu,/ADMIN CENTER/);
assert.match(menu,/WORKERI I OPERACIJE/);
assert.match(menu,/Worker Operations/);
assert.match(menu,/Digitalna radna snaga','Digital workforce','\/digital-workforce\/'/);
assert.match(menu,/Workeri','Workers','\/workers\/'/);
assert.match(menu,/Upravljanje radnom snagom','Workforce management','\/admin-center\/workers\/'/);
assert.doesNotMatch(menu,/Worker Directory Admin','Worker Directory Admin','\/admin-center\/workers\/'/);
assert.doesNotMatch(menu,/Direct Operator','Direct Operator','\/admin-center\/workers\/'/);

for(const source of [adminCenter,headquarters]){
 assert.match(source,/href="\/admin-center\/workers\/"/);
 assert.match(source,/href="\/digital-workforce\/"/);
}
assert.match(adminCenter,/href="\/workers\/"/);
assert.match(adminCenter,/Upravljanje radnom snagom/);
assert.match(headquarters,/Javni portal odluka, rada, rezultata, objava, novinara i statusa projekata bez internih podataka/);
for(const tab of ['plan','bulletins','projects','risks','opinions','dependencies','tasks','credits','newsroom','workers','log'])assert.match(digitalWorkforce,new RegExp(`data-dw-tab="${tab}"`));
assert.match(digitalWorkforce,/1\.573 workera/);
assert.match(digitalWorkforce,/digital-workforce-suite-v1\.css/);
assert.match(digitalWorkforce,/digital-workforce-suite-v1\.js/);
assert.doesNotMatch(digitalWorkforce,/sintetički su operativni podaci/i);
for(const route of ['plan','bulletins','projects','risks','opinions','dependencies','tasks','credits','newsroom','workers','activity-log']){
 assert.ok(fs.existsSync(`apps/portal/digital-workforce/${route}/index.html`),`missing workforce subpage ${route}`);
}
assert.match(workforceUi,/\/api\/public\/digital-workforce\//);
assert.match(workforceUi,/data-dw-tab/);
assert.match(workforceApi,/GNK_ASG_DIGITAL_WORKFORCE_SUITE_V3_20260719_FIRST_PARTY_PROVENANCE/);
assert.match(workforceApi,/1573/);
assert.match(workforceApi,/SIM_START_UTC/);
assert.match(workforceApi,/publishedNewsroom/);
assert.match(workforceApi,/publishedLog/);
assert.doesNotMatch(workforceApi,/2026,0,1/);
assert.doesNotMatch(workforceApi,/1969|1970/);
assert.match(workforceApi,/2026,6,18/);
assert.match(workforceApi,/digital_workforce_identity_collision/);
assert.match(workforceDirectory,/GNK_ASG_WORKERS_DIRECTORY_V3_20260717_ALIGNED_IDENTITIES/);
assert.match(workforceDirectory,/worker_directory_integrity_failed/);
assert.match(workforceDirectory,/firstNames\.size!==EXPECTED_TOTAL/);
assert.match(workforceDirectory,/lastNames\.size!==EXPECTED_TOTAL/);
assert.match(workforceApi,/bulletins/);
assert.match(workforceApi,/activity-log/);
assert.match(editorialWrapper,/handleDigitalWorkforceSuite/);
assert.match(workforceAdmin,/Dodatni zadaci i kontrole/);
assert.match(workforceAdmin,/Pokretanje funkcija/);
assert.match(workforceAdmin,/Zaustavljanje funkcija/);
assert.match(workforceAdmin,/stranica sama ne pokreće ni zaustavlja funkcije/i);
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
assert.match(contrast,/__GNK_CONTRAST_HARDENING_V4__/);
assert.match(contrast,/GNK_CONTRAST_HARDENING_V4_20260731_FULL_DOCUMENT_RECHECK/);
assert.match(contrast,/GNK_CONTRAST_HARDENING_V3_20260714_GRADIENT_AND_PROTECTED_UI/);
assert.match(contrast,/GNK_CONTRAST_HARDENING_V2_20260714_DYNAMIC_RECHECK/);
assert.match(contrast,/targetRatio\(el\)/);
assert.match(contrast,/current\+(?:0)?\.05<target/);
assert.match(contrast,/\.group-section \.group-card/);
assert.match(contrast,/gradientColor/);
assert.match(contrast,/effectiveBackgroundCandidates/);
assert.match(contrast,/bestColor/);
assert.match(contrast,/MutationObserver/);

assert.match(editorial,/__GNK_INDEX_EDITORIAL_ORDER_V6__/);
assert.match(editorial,/Objave, vijesti, analize i komentari/);
assert.match(editorial,/Publications, news, analyses and commentary/);
assert.match(editorial,/\/api\/public-news\?limit=100/);
assert.match(editorial,/\/api\/public-news-feed/);
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
assert.match(editorialWrapper,/GNK_ASG_UNIFIED_AUTH_V38_RELEASE_PROOF_NEWS_SOURCE_LINKS/);
assert.match(editorialWrapper,/index-unified-auth-v22\.js/);
assert.match(editorialWrapper,/servePublicEditorialAsset/);
assert.match(editorialWrapper,/serveCurrentNewsAsset/);
assert.match(editorialWrapper,/serveCanonicalNewsFeed/);
assert.match(editorialWrapper,/serveDynamicEditorialImage/);
assert.match(editorialWrapper,/serveNewsShareRedirect/);
assert.match(editorialRouter,/GNK_PUBLIC_EDITORIAL_ASSETS_V2_20260715/);
assert.match(editorialRouter,/x-gnk-editorial-request-path/);
assert.match(editorialRouter,/x-gnk-editorial-assets/);
assert.match(editorialRouter,/redirect:'follow'/);
assert.match(config,/main = "src\/index-unified-auth-v23\.js"/);
assert.match(config,/html_handling = "auto-trailing-slash"/);

for(const source of [signature,contract]){
 assert.match(source,/width="64" height="66"/);
 assert.doesNotMatch(source,/width="108"|height="111"/);
}

console.log(JSON.stringify({ok:true,menu:'visible-v6-complete-digital-workforce-suite',workforce:'aligned-1573-unique-first-last-full-identities-2026-dates',logo:'64x66-everywhere',editorial:'100-news-publications-analyses-commentary-canonical-assets-v2',contrast:'hardened-v4-full-document-recheck',worker:'v38-over-v32-over-v31',deployPerformed:false},null,2));