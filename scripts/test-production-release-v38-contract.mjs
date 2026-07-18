import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const requiredFiles=[
 'workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js',
 'workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js',
 'workers/gnk-asg-direct-operator/src/index-unified-auth-v21.js',
 'workers/gnk-asg-direct-operator/src/email-brand-mime-v1.js',
 'workers/gnk-asg-direct-operator/src/email-autoreply-mime-v1.js',
 'apps/portal/assets/index-editorial-order-v6.js',
 'apps/portal/assets/index-editorial-order-v1.js',
 'apps/portal/assets/editorial-latest-index-v1.js',
 'apps/portal/assets/contact-form-v2.js',
 'apps/portal/assets/mail-studio-ui-v28.js',
 'apps/portal/data/news.json',
 'apps/portal/objave/index.html',
 'apps/portal/komentari/index.html',
 'scripts/test-news-share-routing-v1.mjs',
 'scripts/verify-production-release-v38.sh',
 'workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml'
];
for(const file of requiredFiles)assert.ok(existsSync(file),`Missing V38 release file: ${file}`);

const read=path=>readFileSync(path,'utf8');
const directConfig=read('workers/gnk-asg-direct-operator/wrangler.mail-proxy-no-routes.toml');
const auth23=read('workers/gnk-asg-direct-operator/src/index-unified-auth-v23.js');
const auth21=read('workers/gnk-asg-direct-operator/src/index-unified-auth-v21.js');
const auth19=read('workers/gnk-asg-direct-operator/src/index-unified-auth-v19.js');
const editorial=read('apps/portal/assets/index-editorial-order-v6.js');
const objave=read('apps/portal/objave/index.html');
const komentari=read('apps/portal/komentari/index.html');
const autoreply=read('workers/gnk-asg-direct-operator/src/mail-identity-autoreply-v2.js');
const autoreplyMime=read('workers/gnk-asg-direct-operator/src/email-autoreply-mime-v1.js');
const studio=read('apps/portal/assets/mail-studio-ui-v28.js');

assert.match(directConfig,/^main\s*=\s*"src\/index-unified-auth-v23\.js"\s*$/m);
assert.match(auth23,/GNK_ASG_UNIFIED_AUTH_V38_RELEASE_PROOF_NEWS_SOURCE_LINKS/);
assert.match(auth23,/export const ENTRYPOINT='src\/index-unified-auth-v23\.js'/);
assert.match(auth23,/headers\.set\('x-gnk-deploy-revision',revision\)/);
assert.match(auth23,/current-static-asset-20260715/);
assert.match(auth23,/source-redirect/);
assert.match(auth21,/20260715-source-links-v2/);
assert.match(editorial,/item\.sourceUrl\|\|item\.url\|\|item\.href\|\|item\.share_url/);
assert.match(auth19,/index-editorial-order-v1\.js\?v=20260715-editorial-v6-latest-first/);
assert.match(objave,/Kapitalna disciplina u razdoblju geopolitičkih i energetskih šokova/);
assert.match(komentari,/AI ne smije pisati konačnu odluku/);
assert.match(autoreply,/GNK_ASG_MAIL_IDENTITY_AUTOREPLY_V9_20260717_UNTRUSTED_SUBJECT_DATA/);
assert.match(autoreply,/aiMessageText/);
assert.match(autoreply,/import \{EMAIL_LOGO_CID,VERSION as BRAND_MIME_VERSION\} from '\.\/email-brand-mime-v1\.js'/);
assert.match(autoreply,/signatureData\(profile,`cid:\$\{EMAIL_LOGO_CID\}`\)/);
assert.match(autoreply,/buildAutoreplyRawEmail\(/);
assert.match(autoreply,/signature\.html/);
assert.match(autoreplyMime,/multipart\/related/i);
assert.match(autoreplyMime,/Content-ID:\s*<\$\{EMAIL_LOGO_CID\}>/);
assert.match(studio,/min-height:520px/);

console.log(JSON.stringify({ok:true,contract:'v38-release-package-canonical-source-contract',files:requiredFiles.length},null,2));
